/** `POST /api/mail/sync` imports new emails from the shared inbox and sent folder into Messages. */
import { createClient } from '@supabase/supabase-js';
import { fetchMail, type MailboxCursor } from '@/lib/imap';
import { can, type Role } from '@/lib/roles';

// imapflow needs the node runtime
export const runtime = 'nodejs';

// this route can take longer than normal
export const maxDuration = 60;

/** No body. Returns counts of what was imported. */
export async function POST(req: Request) {
  // uses the caller's login, so database rules apply
  const token = req.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token) return Response.json({ error: 'Missing bearer token' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 });

  // check permission before logging in to the mailbox
  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!can(me?.role as Role | undefined, 'view:messages')) {
    return Response.json({ error: 'You do not have permission to sync mail' }, { status: 403 });
  }

  const [
    { data: cursorRows, error: cursorError },
    { error: seenError },
  ] = await Promise.all([
    supabase.from('mail_sync_state').select('mailbox, uidvalidity, last_uid'),
    supabase.from('mail_seen').select('email_message_id').limit(1),
  ]);

  if (cursorError || seenError) {
    return Response.json({
      error: 'Mail sync tables are missing. Run the latest supabase/schema.sql (mail_sync_state and mail_seen).',
    }, { status: 500 });
  }

  async function saveCursors(cursors: MailboxCursor[]) {
    if (!cursors.length) return null;
    const { error } = await supabase.from('mail_sync_state').upsert(
      cursors.map(c => ({
        mailbox: c.mailbox,
        uidvalidity: c.uidValidity,
        last_uid: c.lastUid,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'mailbox' },
    );
    if (!error) return null;
    console.error('[mail sync] cursor failed', error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  const priorCursors: MailboxCursor[] = (cursorRows ?? []).map(r => ({
    mailbox: r.mailbox,
    uidValidity: Number(r.uidvalidity),
    lastUid: Number(r.last_uid),
  }));

  let mail;
  let nextCursors: MailboxCursor[] = priorCursors;
  try {
    const fetched = await fetchMail(priorCursors);
    mail = fetched.mail;
    nextCursors = fetched.cursors;
  } catch (e) {
    console.error('[mail sync]', e);
    const reason = e instanceof Error ? e.message : 'Unknown IMAP error';
    return Response.json({ error: reason }, { status: 502 });
  }

  // nothing new, so stop here
  if (!mail.length) {
    const cursorFailure = await saveCursors(nextCursors);
    if (cursorFailure) return cursorFailure;
    return Response.json({ checked: 0, added: 0, reopened: [], unfiled: 0, ignored: 0 });
  }

  const [
    { data: messages, error: msgError },
    { data: existing },
    { data: queued },
    { data: seenRows },
  ] = await Promise.all([
    supabase.from('messages').select('id, email, created_at, email_message_id').order('created_at', { ascending: false }),
    supabase.from('message_replies').select('message_id, email_message_id'),
    supabase.from('inbound_emails').select('email_message_id, from_email, status'),
    supabase.from('mail_seen').select('email_message_id'),
  ]);

  if (msgError) return Response.json({ error: msgError.message }, { status: 500 });

  function normId(id: string | null | undefined) {
    return (id ?? '').trim().replace(/^<|>$/g, '').toLowerCase();
  }

  // email ids already imported
  const seen = new Set<string>([
    ...(existing ?? []).map(r => normId(r.email_message_id)),
    ...(queued ?? []).map(r => normId(r.email_message_id)),
    ...(messages ?? []).map(m => normId(m.email_message_id)),
    ...(seenRows ?? []).map(r => normId(r.email_message_id)),
  ].filter(Boolean));

  // ignored senders, so their new emails stay ignored
  const ignoredSenders = new Set(
    (queued ?? [])
      .filter(r => r.status === 'ignored' && r.from_email)
      .map(r => r.from_email.toLowerCase()),
  );
  const ignoredIds = new Set(
    (queued ?? [])
      .filter(r => r.status === 'ignored')
      .map(r => normId(r.email_message_id))
      .filter(Boolean),
  );

  // email id to thread, used to match replies
  const byMessageId = new Map<string, string>();
  for (const r of existing ?? []) {
    if (r.email_message_id) {
      byMessageId.set(r.email_message_id, r.message_id);
      byMessageId.set(normId(r.email_message_id), r.message_id);
    }
  }
  for (const m of messages ?? []) {
    if (m.email_message_id) {
      byMessageId.set(m.email_message_id, m.id);
      byMessageId.set(normId(m.email_message_id), m.id);
    }
  }

  // fallback when an email has no reply headers, newest first
  const byEmail = new Map<string, { id: string; created_at: string }[]>();
  for (const m of messages ?? []) {
    const key = m.email.toLowerCase();
    if (!byEmail.has(key)) byEmail.set(key, []);
    byEmail.get(key)!.push({ id: m.id, created_at: m.created_at });
  }

  const rows: Record<string, unknown>[] = [];
  const unfiled: Record<string, unknown>[] = [];

  // the newest email per thread decides if it opens or closes
  const latest = new Map<string, { at: number; direction: 'inbound' | 'outbound' }>();

  let ignored = 0;

  for (const email of mail) {
    const id = normId(email.messageId);
    if (!id || seen.has(id) || seen.has(email.messageId)) continue;
    seen.add(id);

    // 1. match by reply headers
    let messageId = email.inReplyTo
      .flatMap(raw => [byMessageId.get(raw), byMessageId.get(normId(raw))])
      .find(Boolean);

    // 2. otherwise match an older thread from the same sender. incoming emails only.
    if (!messageId && email.direction === 'inbound') {
      // compare as dates, not strings
      const arrived = Date.parse(email.date);
      messageId = byEmail
        .get(email.from)
        ?.find(m => Date.parse(m.created_at) <= arrived)?.id;
    }

    if (!messageId) {
      // emails we sent with no thread are skipped
      if (email.direction === 'outbound') { ignored++; continue; }

      const from = email.from.toLowerCase();
      const repliesToIgnored = email.inReplyTo.some(raw => ignoredIds.has(normId(raw)));
      const hide = ignoredSenders.has(from) || repliesToIgnored;

      // new sender with no thread goes to the unfiled list
      unfiled.push({
        email_message_id: email.messageId,
        from_email: email.from,
        from_name: email.fromName,
        subject: email.subject,
        body: email.body,
        received_at: email.date,
        status: hide ? 'ignored' : 'pending',
      });
      if (hide) ignoredSenders.add(from);
      continue;
    }

    rows.push({
      message_id: messageId,
      body: email.body,
      sent_by: email.from,
      sent_at: email.date,
      direction: email.direction,
      email_message_id: email.messageId,
    });

    const at = Date.parse(email.date);
    const prev = latest.get(messageId);
    if (!prev || at >= prev.at) latest.set(messageId, { at, direction: email.direction });
  }

  if (rows.length) {
    const { error } = await supabase.from('message_replies').insert(rows);
    if (error) {
      console.error('[mail sync] insert failed', error);
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

  const reopen = Array.from(latest.entries()).filter(([, v]) => v.direction === 'inbound').map(([id]) => id);
  const close = Array.from(latest.entries()).filter(([, v]) => v.direction === 'outbound').map(([id]) => id);

  if (reopen.length) {
    // a new reply reopens the thread
    const { error } = await supabase
      .from('messages')
      .update({ status: 'Pending', handled_by: null, handled_at: null })
      .in('id', reopen);
    if (error) console.error('[mail sync] reopen failed', error);
  }

  if (close.length) {
    // replied from someone's own email app
    const { error } = await supabase
      .from('messages')
      .update({
        status: 'Addressed',
        handled_by: process.env.SMTP_USER ?? null,
        handled_at: new Date().toISOString(),
      })
      .in('id', close);
    if (error) console.error('[mail sync] close failed', error);
  }

  let queuedCount = 0;
  if (unfiled.length) {
    // skip duplicates if two syncs overlap
    const { data, error } = await supabase
      .from('inbound_emails')
      .upsert(unfiled, { onConflict: 'email_message_id', ignoreDuplicates: true })
      .select('id, status');
    if (error) {
      console.error('[mail sync] unfiled insert failed', error);
      return Response.json({ error: error.message }, { status: 500 });
    }
    queuedCount = (data ?? []).filter(r => r.status === 'pending').length;
  }

  // remember every email we checked so it isn't imported again
  const newlySeen = mail.map(m => normId(m.messageId)).filter(Boolean);
  if (newlySeen.length) {
    const { error } = await supabase.from('mail_seen').upsert(
      newlySeen.map(email_message_id => ({ email_message_id })),
      { onConflict: 'email_message_id', ignoreDuplicates: true },
    );
    if (error) console.error('[mail sync] mail_seen failed', error);
  }

  const cursorFailure = await saveCursors(nextCursors);
  if (cursorFailure) return cursorFailure;

  return Response.json({
    checked: mail.length,
    added: rows.length,
    reopened: reopen,
    unfiled: queuedCount,
    ignored,
  });
}
