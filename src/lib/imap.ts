/** Reads the shared mailbox so emails sent outside the portal show up in it. Server only. */
import 'server-only';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

const HOST = process.env.IMAP_HOST ?? 'imap.gmail.com';
const PORT = Number(process.env.IMAP_PORT ?? 993);

/** Mailbox names used for sync progress. */
export const MAILBOX_INBOX = 'INBOX';
export const MAILBOX_SENT = 'SENT';

export type MailboxCursor = {
  mailbox: string;
  uidValidity: number;
  lastUid: number;
};

/** One email from the shared mailbox. */
export type InboundEmail = {
  /** The email's id, without angle brackets. */
  messageId: string;
  /** Sender email, lowercase. */
  from: string;
  /** Sender name, or empty. */
  fromName: string;
  subject: string;
  /** Message text without the quoted history. */
  body: string;
  /** When it was sent, as an ISO string. */
  date: string;
  /** Ids of the emails this replies to, closest first. */
  inReplyTo: string[];
  /** `inbound` if received, `outbound` if sent from the shared account. */
  direction: 'inbound' | 'outbound';
};

/** Lines that start quoted history in common email apps. */
const QUOTE_MARKERS = [
  /^\s*On .* wrote:\s*$/, // gmail, apple mail
  /^\s*-+\s*Original Message\s*-+/i, // outlook
  /^\s*From:\s.*$/, // outlook, other style
  /^\s*_{10,}\s*$/, // outlook horizontal rule
];

/** Removes quoted history from a reply. Returns the full text if none is found. */
export function stripQuoted(text: string) {
  const lines = text.split(/\r?\n/);

  const cut = lines.findIndex((line, i) => {
    if (QUOTE_MARKERS.some(re => re.test(line))) return true;
    // a quote block at the end is removed. short quotes in the middle are kept.
    if (/^\s*>/.test(line)) return lines.slice(i).every(l => /^\s*>/.test(l) || !l.trim());
    return false;
  });

  const kept = (cut === -1 ? lines : lines.slice(0, cut)).join('\n').trim();
  return kept || text.trim();
}

/** Removes angle brackets from an email id. */
function bare(id: string) {
  return id.trim().replace(/^<|>$/g, '');
}

/** Finds the Sent folder, or null if there isn't one. */
async function sentMailbox(client: ImapFlow): Promise<string | null> {
  try {
    const boxes = await client.list();
    const sent = boxes.find(b => b.specialUse === '\\Sent');
    if (sent) return sent.path;
    return boxes.find(b => /sent/i.test(b.path))?.path ?? null;
  } catch {
    return null;
  }
}

/** Reads new emails from one mailbox. The first run only saves the starting point. */
async function readMailbox(
  client: ImapFlow,
  path: string,
  direction: 'inbound' | 'outbound',
  cursor: MailboxCursor | undefined,
): Promise<{ emails: InboundEmail[]; cursor: MailboxCursor }> {
  const out: InboundEmail[] = [];
  const lock = await client.getMailboxLock(path);

  try {
    const box = client.mailbox;
    if (!box) throw new Error(`Could not open ${path}`);
    const uidValidity = Number(box.uidValidity ?? 0);
    const uidNext = Number(box.uidNext ?? 1);
    const fresh = !cursor || cursor.uidValidity !== uidValidity;
    const lastUid = fresh ? Math.max(0, uidNext - 1) : cursor.lastUid;
    const scanned = !fresh && lastUid + 1 < uidNext;

    if (scanned) {
      for await (const msg of client.fetch(
        { uid: `${lastUid + 1}:*` },
        { uid: true, source: true, envelope: true },
      )) {
        if (!msg.source) continue;

        const parsed = await simpleParser(msg.source);

        const from = parsed.from?.value?.[0]?.address;
        const messageId = parsed.messageId ? bare(parsed.messageId) : null;
        if (!from || !messageId) continue;

        const text = parsed.text ?? (parsed.html ? htmlToText(parsed.html) : '');
        if (!text.trim()) continue;

        const references = Array.isArray(parsed.references)
          ? parsed.references
          : parsed.references ? [parsed.references] : [];

        out.push({
          messageId,
          from: from.toLowerCase(),
          fromName: parsed.from?.value?.[0]?.name ?? '',
          subject: parsed.subject ?? '',
          body: stripQuoted(text),
          date: (parsed.date ?? new Date()).toISOString(),
          inReplyTo: [
            ...(parsed.inReplyTo ? [bare(parsed.inReplyTo)] : []),
            ...references.map(bare).reverse(),
          ],
          direction,
        });
      }
    }

    return {
      emails: out,
      cursor: {
        mailbox: cursor?.mailbox ?? (direction === 'inbound' ? MAILBOX_INBOX : MAILBOX_SENT),
        uidValidity,
        lastUid: scanned ? Math.max(lastUid, uidNext - 1) : lastUid,
      },
    };
  } finally {
    lock.release();
  }
}

/** Reads new emails from the inbox and sent folder. */
export async function fetchMail(cursors: MailboxCursor[] = []): Promise<{
  mail: InboundEmail[];
  cursors: MailboxCursor[];
}> {
  const user = process.env.SMTP_USER;
  const pass = process.env.IMAP_PASS ?? process.env.SMTP_PASS;
  if (!user || !pass) throw new Error('SMTP_USER / SMTP_PASS are not set');

  const byBox = new Map(cursors.map(c => [c.mailbox, c]));

  const client = new ImapFlow({
    host: HOST,
    port: PORT,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  await client.connect();

  try {
    const inbox = await readMailbox(client, 'INBOX', 'inbound', byBox.get(MAILBOX_INBOX));

    const sentPath = await sentMailbox(client);
    const sent = sentPath
      ? await readMailbox(client, sentPath, 'outbound', byBox.get(MAILBOX_SENT))
      : null;

    return {
      mail: [
        ...inbox.emails.filter(m => m.from !== user.toLowerCase()),
        ...(sent ? sent.emails.filter(m => m.from === user.toLowerCase()) : []),
      ],
      cursors: sent ? [inbox.cursor, sent.cursor] : [inbox.cursor],
    };
  } finally {
    await client.logout();
  }
}

/** Basic HTML to text for emails with no plain text version. */
function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
