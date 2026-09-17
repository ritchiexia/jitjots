/** `POST /api/email/newsletter` sends a newsletter to every subscriber, one email each. */
import { createClient } from '@supabase/supabase-js';
import { ORG_MAILING_ADDRESS, newsletterEmail, sendMail, type Attachment } from '@/lib/mail';
import { ROLE_LABEL, can, type Role } from '@/lib/roles';

export const runtime = 'nodejs';
export const maxDuration = 300;

// max recipients per send, to stay within gmail limits and the time limit
const MAX_RECIPIENTS = 200;

const MAX_BODY = 20000;

// max total attachment size, since attachments are sent to every recipient
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENT_COUNT = 10;

/** Form data: `subject`, `body` and `attachments`. Needs the `view:newsletter` permission. */
export async function POST(req: Request) {
  // check the caller before reading the form
  const token = req.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token) return Response.json({ error: 'Missing bearer token' }, { status: 401 });

  const asCaller = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: { user } } = await asCaller.auth.getUser(token);
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 });

  // get the permission from the database
  const { data: me } = await asCaller
    .from('profiles')
    .select('full_name, title, role')
    .eq('id', user.id)
    .maybeSingle();

  if (!can(me?.role as Role | undefined, 'view:newsletter')) {
    return Response.json({ error: 'You do not have permission to send the newsletter' }, { status: 403 });
  }

  // form data so attachments don't need base64
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: 'Expected multipart form data' }, { status: 400 });
  }

  const subject = String(form.get('subject') ?? '').trim();
  const body = String(form.get('body') ?? '').trim();

  if (!subject || !body) {
    return Response.json({ error: 'Both a subject and a body are required' }, { status: 400 });
  }
  if (body.length > MAX_BODY) {
    return Response.json({ error: `Body is too long (limit ${MAX_BODY} characters)` }, { status: 400 });
  }

  // check for file-like objects instead of `instanceof File`, which isn't reliable here
  const files = form.getAll('attachments').filter(
    (f): f is File =>
      typeof f !== 'string' && typeof (f as File)?.arrayBuffer === 'function' && (f as File).size > 0,
  );

  if (files.length > MAX_ATTACHMENT_COUNT) {
    return Response.json(
      { error: `Too many attachments (${files.length}, limit ${MAX_ATTACHMENT_COUNT})` },
      { status: 400 },
    );
  }

  const totalBytes = files.reduce((n, f) => n + f.size, 0);
  if (totalBytes > MAX_ATTACHMENT_BYTES) {
    return Response.json(
      { error: `Attachments total ${(totalBytes / 1024 / 1024).toFixed(1)} MB, over the ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB limit. Link to a file instead of attaching it.` },
      { status: 400 },
    );
  }

  // read files once and reuse them for every email
  const attachments: Attachment[] = await Promise.all(
    files.map(async f => ({
      filename: f.name || 'attachment',
      content: Buffer.from(await f.arrayBuffer()),
      contentType: f.type || undefined,
    })),
  );

  // a real mailing address is required by law
  if (!ORG_MAILING_ADDRESS) {
    return Response.json(
      { error: 'ORG_MAILING_ADDRESS is not set. CASL requires a physical mailing address in every newsletter - set it in .env.local before sending.' },
      { status: 500 },
    );
  }

  const { data: recipients, error: listError } = await asCaller
    .from('newsletter_subscribers')
    .select('id, email, unsubscribe_token')
    .eq('status', 'subscribed');

  if (listError) return Response.json({ error: listError.message }, { status: 500 });
  if (!recipients?.length) {
    return Response.json({ error: 'Nobody is subscribed' }, { status: 400 });
  }
  if (recipients.length > MAX_RECIPIENTS) {
    return Response.json(
      { error: `${recipients.length} subscribers is past what Gmail can send reliably (limit ${MAX_RECIPIENTS}). Export the list and send from a provider instead.` },
      { status: 400 },
    );
  }

  const signer = {
    name: me?.full_name || (user.email ?? ORG_MAILING_ADDRESS),
    title: me?.title || (me?.role ? ROLE_LABEL[me.role as Role] : ''),
  };

  const origin = new URL(req.url).origin;

  let sent = 0;
  const failed: string[] = [];

  for (const r of recipients) {
    try {
      await sendMail({
        to: r.email,
        ...newsletterEmail({
          subject,
          body,
          signer,
          // each person gets their own unsubscribe link
          unsubscribeUrl: `${origin}/newsletter/unsubscribe?token=${r.unsubscribe_token}`,
        }),
        attachments,
      });
      sent++;
    } catch (e) {
      // one failed address doesn't stop the rest
      console.error('[newsletter]', r.email, e);
      failed.push(r.email);
    }
  }

  // save a record of the send. files are not stored.
  await asCaller.from('newsletter_campaigns').insert({
    subject,
    body,
    sent_by: user.email ?? 'unknown',
    recipient_count: sent,
    failed_count: failed.length,
    attachments: files.map(f => ({ name: f.name, size: f.size, type: f.type })),
  });

  // return attachment names so the sender can confirm them
  return Response.json({
    sent,
    failed: failed.length,
    failedAddresses: failed,
    attachments: attachments.length,
  });
}
