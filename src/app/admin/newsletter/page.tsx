'use client';

/** Newsletter page. Manage subscribers and send newsletters. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/components/admin/AdminShell';
import { can } from '@/lib/roles';

// max total attachment size, same as /api/email/newsletter
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

type Status = 'subscribed' | 'unsubscribed';

/** A sent newsletter. Attachment files are not stored. */
type Campaign = {
  id: string;
  subject: string;
  body: string;
  sent_by: string;
  recipient_count: number;
  failed_count: number;
  sent_at: string;
  attachments: { name: string; size: number; type: string }[];
};

type Subscriber = {
  id: string;
  email: string;
  name: string;
  consented_at: string;
  source: string;
  status: Status;
  unsubscribed_at: string | null;
  created_at: string;
};

const ACCENT = 'hsl(270, 8%, 49%)';
const ACCENT_DARK = '#4a4153';

const BADGE: Record<Status, { bg: string; fg: string; dot: string; label: string }> = {
  subscribed: { bg: '#E6F6EC', fg: '#1E7A44', dot: '#2BA55F', label: 'Subscribed' },
  unsubscribed: { bg: '#f1f4f6', fg: '#6b7585', dot: '#aab2ba', label: 'Unsubscribed' },
};

function Badge({ status }: { status: Status }) {
  const c = BADGE[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, background: c.bg, color: c.fg, whiteSpace: 'nowrap' }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: c.dot }} />
      {c.label}
    </span>
  );
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// find email addresses in pasted text and skip anything else
function extractEmails(text: string): string[] {
  const found = text.match(/[^\s,;<>"']+@[^\s,;<>"']+\.[^\s,;<>"']+/g) ?? [];
  return Array.from(new Set(found.map(e => e.trim().toLowerCase())));
}

const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'subscribed', label: 'Subscribed' },
  { key: 'unsubscribed', label: 'Unsubscribed' },
];

export default function NewsletterPage() {
  const { role } = useAdmin();
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  // which tab is showing
  const [tab, setTab] = useState<'subscribers' | 'sent'>('subscribers');
  // the newsletter that is expanded
  const [openCampaign, setOpenCampaign] = useState<string | null>(null);
  // newsletter waiting for delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('subscribed');
  const [search, setSearch] = useState('');

  const [paste, setPaste] = useState('');
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const [showCompose, setShowCompose] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);

  const attachedBytes = files.reduce((n, f) => n + f.size, 0);
  const tooHeavy = attachedBytes > MAX_ATTACHMENT_BYTES;

  // add files instead of replacing them, skipping duplicates
  function addFiles(picked: FileList | null) {
    if (!picked?.length) return;
    // copy the files before the input is cleared
    const chosen = Array.from(picked);
    setFiles(prev => {
      const seen = new Set(prev.map(f => `${f.name}:${f.size}`));
      return [...prev, ...chosen.filter(f => !seen.has(`${f.name}:${f.size}`))];
    });
    // allow picking the same file again
    if (fileInput.current) fileInput.current.value = '';
  }

  const load = useCallback(async () => {
    const [{ data, error }, { data: sent }] = await Promise.all([
      supabase
        .from('newsletter_subscribers')
        .select('*')
        .order('created_at', { ascending: false }),
      // sent newsletters, newest first
      supabase
        .from('newsletter_campaigns')
        .select('*')
        .order('sent_at', { ascending: false }),
    ]);
    if (error) toast.error(error.message);
    setSubs((data ?? []) as Subscriber[]);
    setCampaigns((sent ?? []) as Campaign[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => ({
    all: subs.length,
    subscribed: subs.filter(s => s.status === 'subscribed').length,
    unsubscribed: subs.filter(s => s.status === 'unsubscribed').length,
  } as Record<string, number>), [subs]);

  const filtered = subs
    .filter(s => filter === 'all' || s.status === filter)
    .filter(s => {
      if (!search) return true;
      const q = search.toLowerCase();
      return s.email.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
    });

  // unsubscribe keeps the row so they can't be re-added by accident
  async function setStatus(s: Subscriber, status: Status) {
    const patch = {
      status,
      unsubscribed_at: status === 'unsubscribed' ? new Date().toISOString() : null,
    };
    const { error } = await supabase
      .from('newsletter_subscribers').update(patch).eq('id', s.id);
    if (error) { toast.error(error.message); return; }
    setSubs(prev => prev.map(x => (x.id === s.id ? { ...x, ...patch } : x)));
  }

  async function addPasted() {
    const emails = extractEmails(paste);
    if (!emails.length) {
      toast.error('No email addresses found in that text.');
      return;
    }

    setAdding(true);
    // added by an exec, not the website
    const rows = emails.map(email => ({ email, status: 'subscribed', source: 'manual' }));
    const { error } = await supabase
      .from('newsletter_subscribers')
      .upsert(rows, { onConflict: 'email', ignoreDuplicates: true });
    setAdding(false);

    if (error) { toast.error(error.message); return; }

    toast.success(`Added ${emails.length} address${emails.length === 1 ? '' : 'es'}`, {
      description: 'Any already on the list were skipped.',
    });
    setPaste('');
    setShowAdd(false);
    load();
  }

  async function send() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) { toast.error('Session expired - sign in again.'); return; }

    setSending(true);
    const pending = toast.loading(`Sending to ${counts.subscribed} subscribers…`);

    // form data upload. the browser sets the content type.
    const form = new FormData();
    form.set('subject', subject.trim());
    form.set('body', body.trim());
    for (const f of files) form.append('attachments', f);

    const res = await fetch('/api/email/newsletter', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const json = await res.json().catch(() => ({}));
    setSending(false);
    setConfirmSend(false);

    if (!res.ok) {
      toast.error(json.error ?? 'Could not send.', { id: pending, duration: 10000 });
      return;
    }

    // use the server's attachment count
    const attached = typeof json.attachments === 'number' ? json.attachments : files.length;
    toast.success(
      `Sent to ${json.sent} subscriber${json.sent === 1 ? '' : 's'}` +
      (attached > 0 ? ` with ${attached} attachment${attached === 1 ? '' : 's'}` : ''),
      {
        id: pending,
        description: json.failed > 0
          ? `${json.failed} address${json.failed === 1 ? '' : 'es'} bounced - check the server log.`
          : files.length > 0 && attached === 0
            ? 'The attachments did not reach the server - nothing was attached.'
            : undefined,
      },
    );
    setSubject('');
    setBody('');
    setFiles([]);
    setShowCompose(false);
    // reload so it shows under Sent
    load();
  }

  /** Deletes the record of a sent newsletter. The emails are already sent. */
  async function deleteCampaign(c: Campaign) {
    const { error } = await supabase.from('newsletter_campaigns').delete().eq('id', c.id);
    if (error) { toast.error(error.message); return; }
    setCampaigns(prev => prev.filter(x => x.id !== c.id));
    setConfirmDelete(null);
    setOpenCampaign(null);
    toast.success('Removed from the send log');
  }

  // for importing into another email service
  function copySubscribed() {
    const list = subs.filter(s => s.status === 'subscribed').map(s => s.email);
    if (!list.length) { toast.error('No subscribed addresses to copy.'); return; }
    navigator.clipboard.writeText(list.join(', '));
    toast.success(`Copied ${list.length} address${list.length === 1 ? '' : 'es'}`);
  }

  function downloadCsv() {
    const list = subs.filter(s => s.status === 'subscribed');
    if (!list.length) { toast.error('No subscribed addresses to export.'); return; }

    // quote fields since names can have commas
    const rows = [
      ['email', 'name', 'consented_at', 'source'],
      ...list.map(s => [s.email, s.name, s.consented_at, s.source]),
    ];
    const csv = rows
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `jitjots-newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const segBase: React.CSSProperties = {
    border: 'none', padding: '7px 13px', borderRadius: 8, fontSize: 13,
    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', gap: 7,
  };

  const btn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 7, border: '1px solid #d8dde3',
    background: '#fff', borderRadius: 9, padding: '8px 13px', fontSize: 13,
    fontWeight: 600, fontFamily: 'inherit', color: '#4b5563', cursor: 'pointer',
  };

  if (!can(role, 'view:newsletter')) return null;

  return (
    <>
      <div className="portal-head" style={{ padding: '20px 28px 16px', borderBottom: '1px solid #e6e9ee', background: '#fff' }}>
        <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: 700, fontSize: 23, letterSpacing: '-0.2px' }}>
          Newsletter
        </div>
        <div style={{ fontSize: 13.5, color: '#8a93a0', marginTop: 2 }}>
          {counts.subscribed} subscribed · {counts.unsubscribed} unsubscribed
        </div>
      </div>

      <div className="portal-toolbar" style={{ padding: '14px 28px', borderBottom: '1px solid #e6e9ee', background: '#fff', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 3, background: '#f1f4f6', borderRadius: 10, padding: 3 }}>
          {([
            { key: 'subscribers', label: 'Subscribers', count: counts.subscribed },
            { key: 'sent', label: 'Sent', count: campaigns.length },
          ] as const).map(t => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                // close the compose box here
                onClick={() => { setTab(t.key); setShowCompose(false); setShowAdd(false); setConfirmSend(false); }}
                style={active
                  ? { ...segBase, background: '#fff', color: ACCENT_DARK, boxShadow: '0 1px 2px rgba(0,0,0,.08)' }
                  : { ...segBase, background: 'transparent', color: '#6b7585' }}
              >
                {t.label}
                <span style={{ fontSize: 11.5, fontWeight: 700, color: active ? ACCENT : '#aab2ba' }}>
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {tab === 'subscribers' && (
        <div style={{ position: 'relative', width: 240 }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9aa3ad', display: 'flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-3.6-3.6" /></svg>
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search email or name…"
            style={{ width: '100%', border: '1px solid #d8dde3', borderRadius: 9, padding: '9px 12px 9px 34px', fontSize: 13.5, fontFamily: 'inherit', color: '#1d2733', outline: 'none' }}
          />
        </div>
        )}

        {tab === 'subscribers' && (
        <div style={{ display: 'flex', gap: 3, background: '#f1f4f6', borderRadius: 10, padding: 3 }}>
          {FILTERS.map(f => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={active
                  ? { ...segBase, background: '#fff', color: ACCENT_DARK, boxShadow: '0 1px 2px rgba(0,0,0,.08)' }
                  : { ...segBase, background: 'transparent', color: '#6b7585' }}
              >
                {f.label}
                <span style={{ fontSize: 11.5, fontWeight: 700, color: active ? ACCENT : '#aab2ba' }}>
                  {counts[f.key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 9 }}>
          <button
            onClick={() => { setShowCompose(v => !v); setShowAdd(false); }}
            style={{ ...btn, border: 'none', background: ACCENT, color: '#fff', fontWeight: 700 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4Z" />
            </svg>
            Write newsletter
          </button>
          {tab === 'subscribers' && (<>
          <button onClick={() => { setShowAdd(v => !v); setShowCompose(false); }} style={btn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Add addresses
          </button>
          <button onClick={copySubscribed} style={btn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" />
            </svg>
            Copy emails
          </button>
          <button onClick={downloadCsv} style={btn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
            </svg>
            Export CSV
          </button>
          </>)}
        </div>
      </div>

      {showCompose && (
        <div style={{ padding: '18px 28px', borderBottom: '1px solid #e6e9ee', background: '#fafbfc' }}>
          <div style={{ maxWidth: 720 }}>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9aa3ad', marginBottom: 7 }}>
              Subject
            </label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="What’s new at Jit Jots"
              style={{ width: '100%', border: '1px solid #d8dde3', borderRadius: 9, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: '#1d2733', outline: 'none', boxSizing: 'border-box' }}
            />

            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9aa3ad', margin: '14px 0 7px' }}>
              Message
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={10}
              placeholder={'Written as plain text - blank lines become paragraphs.\n\nYour name, title and the unsubscribe footer are added automatically.'}
              style={{ width: '100%', border: '1px solid #d8dde3', borderRadius: 9, padding: '11px 13px', fontSize: 14.5, fontFamily: 'inherit', color: '#1d2733', outline: 'none', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }}
            />

            {/* attachments */}
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9aa3ad', margin: '14px 0 7px' }}>
              Attachments
            </label>

            {/* hidden input. not `display: none` because some browsers won't open it. */}
            <input
              ref={fileInput}
              id="newsletter-attachments"
              type="file"
              multiple
              onChange={e => addFiles(e.target.files)}
              style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap' }}>
              {/* label opens the file picker */}
              <label
                htmlFor="newsletter-attachments"
                style={{ ...btn, padding: '8px 13px', cursor: 'pointer' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.4 11.05 12.25 20.2a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.67 3.67 0 1 1 5.18 5.18l-9.2 9.2a1.83 1.83 0 1 1-2.59-2.6l8.5-8.49" />
                </svg>
                Attach files
              </label>
              {files.length > 0 && (
                <span style={{ fontSize: 12.5, color: tooHeavy ? '#C2403F' : '#8a93a0', fontWeight: tooHeavy ? 700 : 400 }}>
                  {files.length} file{files.length === 1 ? '' : 's'} · {fmtBytes(attachedBytes)}
                  {tooHeavy && ` · over the ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB limit`}
                </span>
              )}
            </div>

            {files.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {files.map(f => (
                  <div
                    key={`${f.name}:${f.size}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #e6e9ee', borderRadius: 9, padding: '8px 11px' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9aa3ad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
                    </svg>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: '#1d2733', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {f.name}
                    </span>
                    <span style={{ fontSize: 12, color: '#9aa3ad', whiteSpace: 'nowrap' }}>{fmtBytes(f.size)}</span>
                    <button
                      onClick={() => setFiles(prev => prev.filter(x => !(x.name === f.name && x.size === f.size)))}
                      title="Remove"
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9aa3ad', padding: 3, display: 'flex' }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ fontSize: 12.5, color: '#9aa3ad', margin: '9px 0 12px', lineHeight: 1.55 }}>
              Sent as a <strong style={{ color: '#6b7585' }}>separate email to each person</strong>.
            </div>

            {confirmSend ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13.5, color: '#9b2c2c', fontWeight: 600 }}>
                  Send to {counts.subscribed} subscriber{counts.subscribed === 1 ? '' : 's'}
                  {files.length > 0 && ` with ${files.length} attachment${files.length === 1 ? '' : 's'}`} now?
                </span>
                <button
                  onClick={send}
                  disabled={sending}
                  style={{ padding: '9px 15px', borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', border: 'none', background: sending ? '#eef1f3' : ACCENT, color: sending ? '#a7aeb8' : '#fff', cursor: sending ? 'default' : 'pointer' }}
                >
                  {sending ? 'Sending…' : 'Yes, send it'}
                </button>
                <button
                  onClick={() => setConfirmSend(false)}
                  disabled={sending}
                  style={{ padding: '9px 15px', borderRadius: 9, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', border: '1px solid #d8dde3', background: '#fff', color: '#4b5563', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              (() => {
                const blocked = !subject.trim() || !body.trim() || counts.subscribed === 0 || tooHeavy;
                return (
                  <button
                    onClick={() => setConfirmSend(true)}
                    disabled={blocked}
                    title={
                      counts.subscribed === 0 ? 'Nobody is subscribed yet'
                        : tooHeavy ? 'Remove some attachments first'
                        : undefined
                    }
                    style={{ padding: '10px 16px', borderRadius: 9, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', border: 'none',
                      background: blocked ? '#eef1f3' : ACCENT,
                      color: blocked ? '#a7aeb8' : '#fff',
                      cursor: blocked ? 'default' : 'pointer' }}
                  >
                    Send to {counts.subscribed} subscriber{counts.subscribed === 1 ? '' : 's'}
                  </button>
                );
              })()
            )}
          </div>
        </div>
      )}

      {showAdd && (
        <div style={{ padding: '18px 28px', borderBottom: '1px solid #e6e9ee', background: '#fafbfc' }}>
          <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9aa3ad', marginBottom: 7 }}>
            Paste addresses
          </label>
          <textarea
            value={paste}
            onChange={e => setPaste(e.target.value)}
            rows={4}
            placeholder={'sam@example.com, alex@example.com\nor a spreadsheet column, or "Name <a@b.com>" - anything that isn\'t an address is ignored'}
            style={{ width: '100%', maxWidth: 720, border: '1px solid #d8dde3', borderRadius: 9, padding: '10px 12px', fontSize: 13.5, fontFamily: 'inherit', color: '#1d2733', outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }}
          />
          <div style={{ fontSize: 12.5, color: '#9aa3ad', margin: '8px 0 11px', lineHeight: 1.5, maxWidth: 720 }}>
            Only add people who have actually opted in somewhere - CASL requires
            being able to show when and how. These are recorded as{' '}
            <strong style={{ color: '#6b7585' }}>manual</strong>, so they can be
            told apart from website signups later. Duplicates are skipped.
          </div>
          <button
            onClick={addPasted}
            disabled={adding || !paste.trim()}
            style={{ padding: '9px 15px', borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', border: 'none',
              cursor: adding || !paste.trim() ? 'default' : 'pointer',
              background: adding || !paste.trim() ? '#eef1f3' : ACCENT,
              color: adding || !paste.trim() ? '#a7aeb8' : '#fff' }}
          >
            {adding ? 'Adding…' : `Add ${extractEmails(paste).length || ''} address${extractEmails(paste).length === 1 ? '' : 'es'}`.trim()}
          </button>
        </div>
      )}

      <div className="portal-body" style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
        {tab === 'sent' ? (
          loading ? null : campaigns.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #e6e9ee', borderRadius: 13, padding: '64px 24px', textAlign: 'center', color: '#9aa3ad' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#5a6573', marginBottom: 4 }}>
                Nothing sent yet
              </div>
              <div style={{ fontSize: 13.5 }}>
                Campaigns you send are logged here with what went out and who got it.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {campaigns.map(c => {
                const open = openCampaign === c.id;
                return (
                  <div key={c.id} style={{ background: '#fff', border: '1px solid #e6e9ee', borderRadius: 13, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px' }}>
                      {/* separate button so the delete icon can sit beside it */}
                      <button
                        onClick={() => setOpenCampaign(open ? null : c.id)}
                        style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, padding: 0, border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1d2733', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.subject}
                          </div>
                          <div style={{ fontSize: 12.5, color: '#8a93a0', marginTop: 3 }}>
                            {fmtDateTime(c.sent_at)} · {c.sent_by} · {c.recipient_count} recipient{c.recipient_count === 1 ? '' : 's'}
                            {c.failed_count > 0 && (
                              <span style={{ color: '#C2403F', fontWeight: 700 }}>
                                {' '}· {c.failed_count} failed
                              </span>
                            )}
                            {c.attachments?.length > 0 && ` · ${c.attachments.length} attachment${c.attachments.length === 1 ? '' : 's'}`}
                          </div>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9aa3ad" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }}>
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>

                      {/* asks to confirm first */}
                      {confirmDelete === c.id ? (
                        <>
                          <button
                            onClick={() => { void deleteCampaign(c); }}
                            title="Delete this record"
                            style={{ display: 'flex', border: 'none', background: '#C2403F', color: '#fff', borderRadius: 8, padding: 7, cursor: 'pointer', flexShrink: 0 }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            title="Keep it"
                            style={{ display: 'flex', border: '1px solid #d8dde3', background: '#fff', color: '#6b7585', borderRadius: 8, padding: 6, cursor: 'pointer', flexShrink: 0 }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                              <path d="M6 6l12 12M18 6L6 18" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(c.id)}
                          title="Delete this record. The email has already gone out - this only removes the log of it."
                          style={{ display: 'flex', border: 'none', background: 'none', color: '#aab2ba', borderRadius: 8, padding: 6, cursor: 'pointer', flexShrink: 0 }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {open && (
                      <div style={{ borderTop: '1px solid #eef1f3', padding: '14px 16px', background: '#fafbfc' }}>
                        {/* as typed. signature and footer are added when sending. */}
                        <div style={{ fontSize: 13.5, color: '#1d2733', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                          {c.body}
                        </div>
                        {c.attachments?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
                            {c.attachments.map(a => (
                              <span
                                key={`${a.name}:${a.size}`}
                                title="The file itself isn't kept - this is the record of what went out"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#fff', border: '1px solid #e6e9ee', borderRadius: 9, padding: '6px 10px', fontSize: 12.5, color: '#4b5563' }}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9aa3ad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
                                </svg>
                                {a.name}
                                <span style={{ color: '#9aa3ad' }}>{fmtBytes(a.size)}</span>
                              </span>
                            ))}
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : loading ? null : filtered.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e6e9ee', borderRadius: 13, padding: '64px 24px', textAlign: 'center', color: '#9aa3ad' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#5a6573', marginBottom: 4 }}>
              {subs.length === 0 ? 'No subscribers yet' : 'Nothing matches'}
            </div>
            <div style={{ fontSize: 13.5 }}>
              {subs.length === 0
                ? 'Signups from the footer form on the public site appear here.'
                : 'Try a different search or filter.'}
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e6e9ee', borderRadius: 13, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafbfc' }}>
                  {['Email', 'Signed up', 'Source', 'Status', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a93a0', padding: '12px 14px', borderBottom: '1px solid #e6e9ee' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #eef1f3' }}>
                    <td style={{ padding: '13px 14px', fontSize: 14 }}>
                      <div style={{ fontWeight: 600, color: '#1d2733' }}>{s.email}</div>
                      {s.name && <div style={{ fontSize: 12.5, color: '#8a93a0' }}>{s.name}</div>}
                    </td>
                    <td style={{ padding: '13px 14px', fontSize: 13.5, color: '#6b7585', whiteSpace: 'nowrap' }}>
                      {fmtDate(s.consented_at)}
                    </td>
                    <td style={{ padding: '13px 14px', fontSize: 13, color: '#8a93a0' }}>{s.source}</td>
                    <td style={{ padding: '13px 14px' }}><Badge status={s.status} /></td>
                    <td style={{ padding: '13px 14px', textAlign: 'right' }}>
                      <button
                        onClick={() => setStatus(s, s.status === 'subscribed' ? 'unsubscribed' : 'subscribed')}
                        style={{ border: '1px solid #d8dde3', background: '#fff', color: '#6b7585', borderRadius: 8, padding: '6px 11px', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        {s.status === 'subscribed' ? 'Unsubscribe' : 'Resubscribe'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
