/** `POST /api/email/message-reply` sends a reply to a contact message from the shared address. */
import { createClient } from '@supabase/supabase-js';
import { messageReplyEmail, sendMail } from '@/lib/mail';
import { ROLE_LABEL, type Role } from '@/lib/roles';

// nodemailer needs the node runtime
export const runtime = 'nodejs';

// max reply length
const MAX_BODY = 5000;

/** Body: `{ id, body }`. Returns the saved reply. */
export async function POST(req: Request) {
  let payload: { id?: string; body?: string };
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const id = payload.id;
  const body = (payload.body ?? '').trim();

  if (!id || !body) {
    return Response.json({ error: 'Expected { id, body }' }, { status: 400 });
  }
  if (body.length > MAX_BODY) {
    return Response.json(
      { error: `Reply is too long (${body.length} characters, limit ${MAX_BODY})` },
      { status: 400 },
    );
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

  const [{ data: message, error }, { data: signerProfile }, { data: chain }] = await Promise.all([
    supabase
      .from('messages')
      .select('email, subject, email_subject, message, source, created_at, email_message_id')
      .eq('id', id)
      .single(),
    // for the signature
    supabase.from('profiles').select('full_name, title, role').eq('id', user.id).single(),
    // earlier email ids in this thread, so the reply stays in the same conversation
    supabase
      .from('message_replies')
      .select('email_message_id, sent_at, direction, body')
      .eq('message_id', id)
      .order('sent_at', { ascending: true }),
  ]);

  if (error || !message) {
    return Response.json({ error: 'Message not found' }, { status: 404 });
  }

  const replies = chain ?? [];
  const bare = (v: string | null | undefined) => (v ?? '').trim().replace(/^<|>$/g, '');
  // first message, then replies in order
  const references = [
    bare(message.email_message_id),
    ...replies.map(r => bare(r.email_message_id)),
  ].filter(Boolean);
  // reply to the newest message
  const inReplyTo = references[references.length - 1];

  // use the subject from the sent emails so gmail keeps one thread
  const threadSubject = message.email_subject || message.subject;

  // quote their latest message
  const lastInbound = [...replies].reverse().find(r => r.direction === 'inbound' && r.body?.trim());
  const quote = lastInbound
    ? { body: lastInbound.body, at: lastInbound.sent_at }
    : {
        body: message.message,
        at: message.created_at,
        // booking threads start with our own summary, so don't quote it as theirs
        heading: message.source === 'booking' ? 'Your booking request:' : undefined,
      };

  const signer = {
    // use the email if they have no name
    name: signerProfile?.full_name || (user.email ?? 'The Jit Jots team'),
    // use their title if set, otherwise the role name
    title: signerProfile?.title
      || (signerProfile?.role ? ROLE_LABEL[signerProfile.role as Role] : ''),
  };

  let messageId: string | null = null;
  try {
    messageId = await sendMail({
      to: message.email,
      ...messageReplyEmail({ subject: threadSubject, body, signer, quote }),
      ...(inReplyTo ? { inReplyTo, references } : {}),
    });
  } catch (e) {
    // show the email error to the admin
    console.error('[message-reply email]', e);
    const reason = e instanceof Error ? e.message : 'Unknown SMTP error';
    return Response.json({ error: reason }, { status: 502 });
  }

  // save the reply only after the email was sent
  const sentBy = user.email ?? 'unknown';
  const { data: reply, error: replyError } = await supabase
    .from('message_replies')
    .insert({
      message_id: id,
      body,
      sent_by: sentBy,
      direction: 'outbound',
      // used to match their reply to this thread
      email_message_id: messageId ? messageId.replace(/^<|>$/g, '') : null,
    })
    .select()
    .single();

  // the email was sent, so still report success
  if (replyError) console.error('[message-reply] could not record reply', replyError);

  // replying marks the message as addressed
  const { error: statusError } = await supabase
    .from('messages')
    .update({
      status: 'Addressed',
      handled_by: sentBy,
      handled_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (statusError) console.error('[message-reply] could not update status', statusError);

  return Response.json({ sent: true, to: message.email, reply: reply ?? null });
}
