/** `POST /api/email/booking-received` sends the "we got your request" email. Public, but only sends once per new booking. */
import { createClient } from '@supabase/supabase-js';
import { receivedEmail, sendMail, type BookingDetails, type BookingEmailInput } from '@/lib/mail';
import { recordBookingMail } from '@/lib/booking-thread';

export const runtime = 'nodejs';

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.id) return Response.json({ error: 'Missing booking id' }, { status: 400 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    // the booking is already saved, so this isn't an error for the user
    return Response.json({ error: 'Email is not configured on the server' }, { status: 500 });
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: booking } = await db
    .from('bookings')
    .select('id, contact_name, org, email, topic, requested_date, start_time, end_time, ages, age_group, kids_count, requester_notes, source, created_at, ack_sent_at')
    .eq('id', body.id)
    .maybeSingle();

  if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

  if (booking.ack_sent_at) {
    return Response.json({ sent: false, reason: 'already acknowledged' });
  }
  if (Date.now() - new Date(booking.created_at).getTime() > MAX_AGE_MS) {
    return Response.json({ sent: false, reason: 'booking too old' });
  }

  // mark it as sent first so it can't send twice
  const { data: claimed, error: claimError } = await db
    .from('bookings')
    .update({ ack_sent_at: new Date().toISOString() })
    .eq('id', body.id)
    .is('ack_sent_at', null)
    .select('id');

  if (claimError) {
    return Response.json({ error: claimError.message }, { status: 500 });
  }
  // another request already claimed it
  if (!claimed?.length) {
    return Response.json({ sent: false, reason: 'already acknowledged' });
  }

  const mail = receivedEmail(booking as BookingEmailInput);
  let messageId: string | null = null;
  try {
    messageId = await sendMail({ to: booking.email, ...mail });
  } catch (e) {
    // undo the claim so it can be retried
    await db.from('bookings').update({ ack_sent_at: null }).eq('id', body.id);
    console.error('[booking-received email]', e);
    return Response.json(
      { error: e instanceof Error ? e.message : 'SMTP error' },
      { status: 502 },
    );
  }

  // start a Messages thread so replies show up in the portal
  try {
    await recordBookingMail(db, {
      bookingId: booking.id,
      contactName: booking.contact_name,
      org: booking.org,
      email: booking.email,
      topic: booking.topic,
      requestedDate: booking.requested_date,
      kind: 'received',
      body: mail.text,
      emailSubject: mail.subject,
      booking: booking as BookingDetails,
      messageId,
      sentBy: process.env.SMTP_USER ?? 'team',
    });
  } catch (e) {
    console.error('[booking-received thread]', e);
  }

  return Response.json({ sent: true });
}
