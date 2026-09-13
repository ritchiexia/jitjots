/** `POST /api/email/booking-status` sends the confirm or decline email for a booking. */
import { createClient } from '@supabase/supabase-js';
import { confirmedEmail, declinedEmail, sendMail, type BookingDetails, type BookingEmailInput } from '@/lib/mail';
import { ROLE_LABEL, type Role } from '@/lib/roles';
import { recordBookingMail } from '@/lib/booking-thread';

// nodemailer needs the node runtime
export const runtime = 'nodejs';

/** Body: `{ id, status }`. Status is "Confirmed" or "Declined". */
export async function POST(req: Request) {
  let body: { id?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { id, status } = body;
  if (!id || (status !== 'Confirmed' && status !== 'Declined')) {
    return Response.json({ error: 'Expected { id, status: "Confirmed" | "Declined" }' }, { status: 400 });
  }

  // require a signed in user
  const token = req.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token) return Response.json({ error: 'Missing bearer token' }, { status: 401 });

  // uses the caller's login, so database rules apply
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 });

  const [{ data: booking, error }, { data: signerProfile }] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, contact_name, org, email, topic, requested_date, start_time, end_time, ages, age_group, kids_count, requester_notes, source')
      .eq('id', id)
      .single(),
    // the email is signed by the admin who sent it
    supabase.from('profiles').select('full_name, title, role').eq('id', user.id).maybeSingle(),
  ]);

  if (error || !booking) {
    return Response.json({ error: 'Booking not found' }, { status: 404 });
  }

  // no email address, nothing to send
  if (!booking.email?.trim()) {
    return Response.json({ error: 'This booking has no email address on it' }, { status: 400 });
  }

  const signer = {
    // use the email if they have no name
    name: signerProfile?.full_name || (user.email ?? 'The Jit Jots team'),
    // use their title if set, otherwise the role name
    title: signerProfile?.title
      || (signerProfile?.role ? ROLE_LABEL[signerProfile.role as Role] : ''),
  };

  const template = status === 'Confirmed' ? confirmedEmail : declinedEmail;
  const mail = template(booking as BookingEmailInput, signer);

  const { data: existingThread } = await supabase
    .from('messages')
    .select('email_message_id')
    .eq('booking_id', id)
    .maybeSingle();

  let messageId: string | null = null;
  try {
    messageId = await sendMail({
      to: booking.email,
      ...mail,
      inReplyTo: existingThread?.email_message_id ?? undefined,
    });
  } catch (e) {
    // show the email error to the admin
    console.error('[booking-status email]', e);
    const reason = e instanceof Error ? e.message : 'Unknown SMTP error';
    return Response.json({ error: reason }, { status: 502 });
  }

  try {
    await recordBookingMail(supabase, {
      bookingId: id,
      contactName: booking.contact_name,
      org: booking.org,
      email: booking.email,
      topic: booking.topic,
      requestedDate: booking.requested_date,
      kind: status === 'Confirmed' ? 'confirmed' : 'declined',
      body: mail.text,
      emailSubject: mail.subject,
      booking: booking as BookingDetails,
      messageId,
      sentBy: user.email ?? signer.name,
      markAddressed: true,
    });
  } catch (e) {
    console.error('[booking-status thread]', e);
  }

  return Response.json({ sent: true, to: booking.email });
}
