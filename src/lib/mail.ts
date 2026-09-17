/** Sending email: the Gmail connection and all email templates. Server only. */
import 'server-only';
import nodemailer from 'nodemailer';

/** Gmail SMTP settings from `.env`. */
const HOST = process.env.SMTP_HOST ?? 'smtp.gmail.com';
const PORT = Number(process.env.SMTP_PORT ?? 465);

/** Sender name and address. */
export const FROM = `Jit Jots <${process.env.SMTP_USER}>`;

let cached: nodemailer.Transporter | null = null;

/** Shared email connection, created on first use. */
function transporter() {
  if (cached) return cached;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) throw new Error('SMTP_USER / SMTP_PASS are not set');

  cached = nodemailer.createTransport({
    host: HOST,
    port: PORT,
    secure: PORT === 465, // 465 uses TLS, 587 uses STARTTLS
    auth: { user, pass },

    // reuse connections for the newsletter
    pool: true,
    maxConnections: 1,
    // reconnect regularly
    maxMessages: 100,

    // send at most one email per second to avoid gmail limits
    rateDelta: 1000,
    rateLimit: 1,
  });
  return cached;
}

/** A file attached to an email. */
export type Attachment = {
  /** File name. */
  filename: string;
  /** File contents. */
  content: Buffer;
  /** File type, if known. */
  contentType?: string;
};

/** One email to send. */
export type Mail = {
  /** Recipient, always one person. */
  to: string;
  subject: string;
  /** HTML body with inline styles. */
  html: string;
  /** Plain text body. */
  text: string;
  /** Reply address. Defaults to {@link FROM}. */
  replyTo?: string;
  /** Id of the email this replies to. */
  inReplyTo?: string;
  /** Earlier email ids in the conversation, oldest first. */
  references?: string[];
  attachments?: Attachment[];
};

/** Sends one email. Returns its message id, or null. */
export async function sendMail({ to, subject, html, text, replyTo, inReplyTo, references, attachments }: Mail): Promise<string | null> {
  const angle = (id: string) => `<${id.trim().replace(/^<|>$/g, '')}>`;
  const parent = inReplyTo?.trim() ? angle(inReplyTo) : null;
  // add the parent id once
  const chain = Array.from(new Set([
    ...(references ?? []).filter(Boolean).map(angle),
    ...(parent ? [parent] : []),
  ]));

  const info = await transporter().sendMail({
    from: FROM, to, subject, html, text, replyTo,
    ...(parent ? { inReplyTo: parent } : {}),
    ...(chain.length ? { references: chain.join(' ') } : {}),
    // only add attachments if there are any
    ...(attachments?.length ? { attachments } : {}),
  });
  return info.messageId ?? null;
}

// TEMPLATES
// simple emails with inline styles and a plain signature

/** Escapes text for HTML. */
function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Escapes text and keeps line breaks. */
function nl2br(s: string) {
  return esc(s).replace(/\r?\n/g, '<br/>');
}

/** Formats `"YYYY-MM-DD"` like `"Friday, August 14, 2026"`. */
function longDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-CA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

/** Formats a stored time like `"2:30 PM"`, or null. */
function time12(t?: string | null) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  const ap = h < 12 ? 'AM' : 'PM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ap}`;
}

/** Booking fields used in emails. */
export type BookingEmailInput = {
  contact_name: string;
  org: string;
  topic: string;
  /** `"YYYY-MM-DD"`. */
  requested_date: string;
  /** Empty on older bookings. */
  start_time?: string | null;
  end_time?: string | null;
};

/** Date plus times, if the booking has them. */
function whenLine(b: BookingEmailInput) {
  const start = time12(b.start_time);
  const end = time12(b.end_time);
  return start && end
    ? `${longDate(b.requested_date)}, ${start} to ${end}`
    : longDate(b.requested_date);
}

/** All booking fields, for the Messages thread and reply quotes. */
export type BookingDetails = BookingEmailInput & {
  email?: string | null;
  /** Ages as typed, like `"7 to 11"`. */
  ages?: string | null;
  /** Older ages field, used if `ages` is empty. */
  age_group?: string | null;
  kids_count?: number | null;
  /** Notes they wrote, if any. */
  requester_notes?: string | null;
  /** `"website"` or `"manual"`. */
  source?: string | null;
};

/** The booking as plain text lines, skipping empty fields. */
export function bookingSummary(b: BookingDetails): string {
  const start = time12(b.start_time);
  const end = time12(b.end_time);
  const age = (b.ages ?? '').trim() || (b.age_group ?? '').trim();
  const notes = (b.requester_notes ?? '').trim();

  return [
    `Organisation: ${b.org}`,
    `Contact: ${b.contact_name}`,
    b.email ? `Email: ${b.email}` : null,
    `Topic: ${b.topic}`,
    `Date: ${longDate(b.requested_date)}`,
    start && end ? `Time: ${start} to ${end}` : null,
    age ? `Age: ${age}` : null,
    b.kids_count ? `Number of kids: ${b.kids_count}` : null,
    b.source === 'manual' ? 'Taken by: a team member (phone, email or in person)' : null,
    notes ? `Their notes: ${notes}` : null,
  ].filter(Boolean).join('\n');
}

/** Signature for automatic emails. */
const TEAM: Signer = { name: 'The Jit Jots team', title: '' };

/** "We got your request" email. */
export function receivedEmail(b: BookingEmailInput): Omit<Mail, 'to'> {
  const when = whenLine(b);
  return {
    subject: `We’ve got your workshop request - ${longDate(b.requested_date)}`,
    html: plain([
      `Hi ${esc(firstName(b.contact_name))},`,
      `Thanks for asking us to run a <strong>${esc(b.topic)}</strong> workshop for ${esc(b.org)}. We've got it down for <strong>${esc(when)}</strong>.`,
      `Nothing is confirmed yet - we will review it and get back to you shortly to lock in the details. If anything above looks wrong, just reply to this email.`,
      `Talk soon.`,
    ], TEAM),
    text:
      `Hi ${firstName(b.contact_name)},\n\n` +
      `Thanks for asking us to run a ${b.topic} workshop for ${b.org}. We've got it down for ${when}.\n\n` +
      `Nothing is confirmed yet - we will review it and get back to you shortly to lock in the details. If anything above looks wrong, just reply to this email.\n\n` +
      `Talk soon.\n\n` +
      signatureText(TEAM) + '\n',
  };
}

/** First name only. */
function firstName(full: string) {
  return full.trim().split(/\s+/)[0] || full.trim();
}

/** Shared email layout: paragraphs and a signature. */
function plain(paragraphs: string[], signer: Signer) {
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14.5px;line-height:1.6;color:#202124;">
  ${paragraphs.map(t => `<div style="margin:0 0 14px;">${t}</div>`).join('')}
  ${signature(signer)}
</div>`.trim();
}

/** "Your workshop is confirmed" email. */
export function confirmedEmail(b: BookingEmailInput, signer: Signer): Omit<Mail, 'to'> {
  const when = whenLine(b);
  return {
    subject: `Your Jit Jots workshop is confirmed - ${longDate(b.requested_date)}`,
    html: plain([
      `Hi ${esc(firstName(b.contact_name))},`,
      `Good news - we can run the <strong>${esc(b.topic)}</strong> workshop for ${esc(b.org)}. You're booked in for <strong>${esc(when)}</strong>.`,
      `We'll be in touch closer to the date with what we need on the day. If anything changes on your end, just reply to this email and we'll sort it out.`,
      `Looking forward to it.`,
    ], signer),
    text:
      `Hi ${firstName(b.contact_name)},\n\n` +
      `Good news - we can run the ${b.topic} workshop for ${b.org}. You're booked in for ${when}.\n\n` +
      `We'll be in touch closer to the date with what we need on the day. If anything changes on your end, just reply to this email and we'll sort it out.\n\n` +
      `Looking forward to it.\n\n` +
      signatureText(signer) + '\n',
  };
}

/** "We can't take that date" email. */
export function declinedEmail(b: BookingEmailInput, signer: Signer): Omit<Mail, 'to'> {
  return {
    subject: `About your Jit Jots workshop request - ${longDate(b.requested_date)}`,
    html: plain([
      `Hi ${esc(firstName(b.contact_name))},`,
      `Thanks for asking us to run a <strong>${esc(b.topic)}</strong> workshop for ${esc(b.org)} on ${longDate(b.requested_date)}.`,
      `Unfortunately we can't take that date on. We're entirely volunteer-run, so our availability is limited - this is about our calendar, not about your group.`,
      `We'd genuinely like to work with you another time. Reply to this email with a few dates that suit you and we'll do our best to make one of them work.`,
      `Thanks for thinking of us.`,
    ], signer),
    text:
      `Hi ${firstName(b.contact_name)},\n\n` +
      `Thanks for asking us to run a ${b.topic} workshop for ${b.org} on ${longDate(b.requested_date)}.\n\n` +
      `Unfortunately we can't take that date on. We're entirely volunteer-run, so our availability is limited - this is about our calendar, not about your group.\n\n` +
      `We'd genuinely like to work with you another time. Reply to this email with a few dates that suit you and we'll do our best to make one of them work.\n\n` +
      `Thanks for thinking of us.\n\n` +
      signatureText(signer) + '\n',
  };
}

// NEWSLETTER

/** Mailing address for the newsletter footer. Required by law. */
export const ORG_MAILING_ADDRESS = process.env.ORG_MAILING_ADDRESS ?? '';

/** One newsletter for one subscriber. */
export type NewsletterInput = {
  subject: string;
  /** Text as typed. Blank lines become paragraphs. */
  body: string;
  /** Who sent it, for the signature. */
  signer: Signer;
  /** This subscriber's unsubscribe link. */
  unsubscribeUrl: string;
};

/** Builds one subscriber's newsletter email. */
export function newsletterEmail(n: NewsletterInput): Omit<Mail, 'to'> {
  const paragraphs = n.body
    .split(/\n\s*\n/)
    .map(chunk => `<div style="margin:0 0 14px;">${nl2br(chunk.trim())}</div>`)
    .join('');

  return {
    subject: n.subject,
    html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14.5px;line-height:1.6;color:#202124;">
  ${paragraphs}
  ${signature(n.signer)}
  <div style="margin-top:26px;padding-top:14px;border-top:1px solid #dadce0;font-size:12px;line-height:1.5;color:#5f6368;">
    <div>You’re receiving this because you subscribed to updates from ${ORG_LEGAL_NAME}.</div>
    <div style="margin-top:6px;">${esc(ORG_MAILING_ADDRESS)}</div>
    ${process.env.SMTP_USER ? `<div style="margin-top:4px;">
      <a href="mailto:${esc(process.env.SMTP_USER)}" style="color:#5f6368;">${esc(process.env.SMTP_USER)}</a>
    </div>` : ''}
    <div style="margin-top:6px;">
      <a href="${esc(n.unsubscribeUrl)}" style="color:#5f6368;">Unsubscribe</a>
    </div>
  </div>
</div>`.trim(),
    text:
      `${n.body}\n\n` +
      `${signatureText(n.signer)}\n\n` +
      `-\n` +
      `You're receiving this because you subscribed to updates from ${ORG_LEGAL_NAME}.\n` +
      `${ORG_MAILING_ADDRESS}\n` +
      (process.env.SMTP_USER ? `${process.env.SMTP_USER}\n` : '') +
      `Unsubscribe: ${n.unsubscribeUrl}\n`,
  };
}

// CONTACT REPLIES

/** A reply to a contact message. */
export type MessageReplyInput = {
  /** Original subject. `Re:` is added. */
  subject: string;
  /** Reply text as typed. */
  body: string;
  signer: Signer;
  /** The message being replied to, quoted below. */
  quote?: ReplyQuote | null;
};

/** The quoted message. */
export type ReplyQuote = {
  /** Quoted text. */
  body: string;
  /** When it was written, or null. */
  at?: string | null;
  /** Replaces "you wrote" in the quote header. */
  heading?: string;
};

/** Sender name and title, for the signature. */
export type Signer = {
  name: string;
  title: string;
};

/** Organization name. */
export const ORG_LEGAL_NAME = 'Jit Jots Science Education Society';

/** Email signature. */
function signature({ name, title }: Signer) {
  return `
<div style="margin-top:22px;font-size:14px;line-height:1.5;color:#202124;">
  <div style="color:#5f6368;">--</div>
  <div><strong>${esc(name)}</strong>${title ? ` | ${esc(title)}` : ''}</div>
  <div>${ORG_LEGAL_NAME}</div>
</div>`;
}

/** Plain text version of {@link signature}. */
function signatureText({ name, title }: Signer) {
  return [
    '--',
    title ? `${name} | ${title}` : name,
    ORG_LEGAL_NAME,
  ].join('\n');
}

/** Date and time for a quote header, like `"Aug 11, 2026 at 2:30 PM"`. */
function stamp(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

/** Builds a reply email with the original message quoted. */
export function messageReplyEmail(r: MessageReplyInput): Omit<Mail, 'to'> {
  // don't add another `Re:`
  const base = (r.subject ?? '').trim();
  const subject = base
    ? (/^re:/i.test(base) ? base : `Re: ${base}`)
    : 'Re: your message to Jit Jots';

  // blank lines become paragraphs
  const paragraphs = r.body
    .split(/\n\s*\n/)
    .map(chunk => `<div style="margin:0 0 14px;">${nl2br(chunk.trim())}</div>`)
    .join('');

  const quote = r.quote?.body.trim() ? r.quote : null;
  const heading = quote
    ? quote.heading
      ?? (quote.at ? `On ${stamp(quote.at)}, you wrote:` : 'You wrote:')
    : null;

  return {
    subject,
    html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14.5px;line-height:1.6;color:#202124;">
  ${paragraphs}
  ${signature(r.signer)}
  ${quote ? `<div style="color:#5f6368;font-size:13px;margin:22px 0 6px;">
    ${esc(heading!)}
  </div>
  <blockquote style="margin:0;padding:0 0 0 12px;border-left:2px solid #dadce0;color:#5f6368;">
    ${nl2br(quote.body.trim())}
  </blockquote>` : ''}
</div>`.trim(),
    text:
      `${r.body}\n\n` +
      `${signatureText(r.signer)}\n` +
      (quote
        ? `\n${heading}\n` +
          quote.body.trim().split('\n').map(l => `> ${l}`).join('\n') + '\n'
        : ''),
  };
}

/** Tells a lead someone on their team is marked away. */
export function awayEmail(a: {
  name: string;
  recordedBy: string | null;
  start: string;
  end: string;
  reason: string;
}): Omit<Mail, 'to'> {
  const span = a.start === a.end
    ? longDate(a.start)
    : `${longDate(a.start)} to ${longDate(a.end)}`;
  // don't quote the default "Away" note
  const note = a.reason.trim().toLowerCase() === 'away' ? '' : a.reason.trim();
  const by = a.recordedBy ? ` by ${a.recordedBy}` : '';
  return {
    subject: `${a.name} is away: ${span}`,
    html: plain([
      `Hi,`,
      `<strong>${esc(a.name)}</strong> has been marked away${esc(by)} for <strong>${esc(span)}</strong>.`,
      ...(note ? [`Note:`, `<em>${nl2br(note)}</em>`] : []),
      `Their hours in that span have been cleared, and it shows on the team calendar.`,
    ], TEAM),
    text:
      `Hi,\n\n` +
      `${a.name} has been marked away${by} for ${span}.\n\n` +
      (note ? `Note:\n${note}\n\n` : '') +
      `Their hours in that span have been cleared, and it shows on the team calendar.\n\n` +
      signatureText(TEAM) + '\n',
  };
}
