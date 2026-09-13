/** Creates or reuses the Messages thread for a booking, so email replies show up in the portal. */
import type { SupabaseClient } from '@supabase/supabase-js';
import { bookingSummary, type BookingDetails } from '@/lib/mail';

export function bareMessageId(id: string | null | undefined): string | null {
  if (!id) return null;
  const trimmed = id.trim().replace(/^<|>$/g, '');
  return trimmed || null;
}

function kindLabel(kind: 'received' | 'confirmed' | 'declined') {
  if (kind === 'confirmed') return 'Booking confirmation';
  if (kind === 'declined') return 'Booking decline';
  return 'Booking request';
}

export async function recordBookingMail(
  db: SupabaseClient,
  input: {
    bookingId: string;
    contactName: string;
    org: string;
    email: string;
    topic: string;
    requestedDate: string;
    kind: 'received' | 'confirmed' | 'declined';
    body: string;
    /** The booking this thread is about. */
    booking?: BookingDetails;
    /** Subject line of the sent email, used to match replies. */
    emailSubject?: string | null;
    messageId: string | null;
    sentBy: string;
    markAddressed?: boolean;
  },
): Promise<{ threadId: string; priorMessageId: string | null }> {
  const emailId = bareMessageId(input.messageId);
  const email = input.email.trim().toLowerCase();

  const { data: existing, error: findError } = await db
    .from('messages')
    .select('id, email_message_id, email_subject')
    .eq('booking_id', input.bookingId)
    .maybeSingle();
  if (findError) throw new Error(findError.message);

  let threadId = existing?.id as string | undefined;
  const priorMessageId = existing?.email_message_id ?? null;

  // the full booking details, shown in the Messages panel
  const summary = input.booking
    ? bookingSummary(input.booking)
    : [
        `Organisation: ${input.org}`,
        `Contact: ${input.contactName}`,
        `Email: ${input.email}`,
        `Topic: ${input.topic}`,
        `Date: ${input.requestedDate}`,
      ].join('\n');

  if (!threadId) {
    const { data: created, error } = await db
      .from('messages')
      .insert({
        name: input.contactName,
        email,
        subject: `${kindLabel(input.kind)} · ${input.org} · ${input.requestedDate}`,
        message: summary,
        status: input.markAddressed ? 'Addressed' : 'Pending',
        source: 'booking',
        booking_id: input.bookingId,
        email_message_id: emailId,
        // the subject the recipient sees
        email_subject: input.emailSubject ?? null,
        handled_by: input.markAddressed ? input.sentBy : null,
        handled_at: input.markAddressed ? new Date().toISOString() : null,
      })
      .select('id')
      .single();
    if (error || !created) throw new Error(error?.message ?? 'Could not open the booking thread');
    threadId = created.id;
  } else {
    const patch: Record<string, unknown> = {};
    if (emailId && !priorMessageId) patch.email_message_id = emailId;
    // keep the first subject so the thread isn't renamed later
    if (input.emailSubject && !existing?.email_subject) patch.email_subject = input.emailSubject;
    if (input.markAddressed) {
      patch.status = 'Addressed';
      patch.handled_by = input.sentBy;
      patch.handled_at = new Date().toISOString();
    }
    if (Object.keys(patch).length) {
      const { error } = await db.from('messages').update(patch).eq('id', threadId);
      if (error) throw new Error(error.message);
    }
  }

  if (!threadId) throw new Error('Could not open the booking thread');

  if (emailId || input.body.trim()) {
    const { error } = await db.from('message_replies').insert({
      message_id: threadId,
      body: input.body.trim() || `(${kindLabel(input.kind)} sent)`,
      sent_by: input.sentBy,
      direction: 'outbound',
      email_message_id: emailId,
    });
    if (error) throw new Error(error.message);
  }

  return { threadId, priorMessageId };
}
