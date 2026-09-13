'use client';

/** Messages page. Contact messages, email replies and unfiled emails. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/components/admin/AdminShell';
import { can } from '@/lib/roles';

type Status = 'Pending' | 'Addressed';

type Message = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: Status;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
  // 'form' from the contact form, 'email' from the unfiled list
  source: 'form' | 'email' | 'booking';
  email_message_id: string | null;
  booking_id: string | null;
};

// emails sent and received in the thread
type Reply = {
  id: string;
  message_id: string;
  body: string;
  sent_by: string;
  sent_at: string;
  direction: 'outbound' | 'inbound';
};

// emails that didn't match a thread, waiting to be accepted or ignored
type Unfiled = {
  id: string;
  email_message_id: string;
  from_email: string;
  from_name: string;
  subject: string;
  body: string;
  received_at: string;
};

const ACCENT = 'hsl(270, 8%, 49%)';
const ACCENT_DARK = '#4a4153';

const BADGE: Record<Status, { bg: string; fg: string; dot: string }> = {
  Pending: { bg: '#FEF4E0', fg: '#9A6A00', dot: '#E0A33A' },
  Addressed: { bg: '#E6F6EC', fg: '#1E7A44', dot: '#2BA55F' },
};

function Badge({ status }: { status: Status }) {
  const c = BADGE[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, background: c.bg, color: c.fg, whiteSpace: 'nowrap' }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: c.dot }} />
      {status}
    </span>
  );
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Addressed', label: 'Addressed' },
];

export default function MessagesPage() {
  const { profile, role } = useAdmin();

  const [messages, setMessages] = useState<Message[]>([]);
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
  const [inboundCounts, setInboundCounts] = useState<Record<string, number>>({});
  const [unfiled, setUnfiled] = useState<Unfiled[]>([]);
  const [openUnfiled, setOpenUnfiled] = useState<string | null>(null);
  const [triaging, setTriaging] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Message | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [threadNonce, setThreadNonce] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const [{ data, error }, { data: counts }, { data: pendingMail }] = await Promise.all([
      supabase.from('messages').select('*').order('created_at', { ascending: false }),
      // just the ids and direction
      supabase.from('message_replies').select('message_id, direction'),
      // only emails still waiting
      supabase.from('inbound_emails').select('*')
        .eq('status', 'pending').order('received_at', { ascending: false }),
    ]);

    if (error) toast.error(error.message);
    setMessages((data ?? []) as Message[]);
    setUnfiled((pendingMail ?? []) as Unfiled[]);

    const out: Record<string, number> = {};
    const inb: Record<string, number> = {};
    for (const r of counts ?? []) {
      const bucket = r.direction === 'inbound' ? inb : out;
      bucket[r.message_id] = (bucket[r.message_id] ?? 0) + 1;
    }
    setReplyCounts(out);
    setInboundCounts(inb);
    setLoading(false);
  }, []);

  // check the inbox for new emails. `silent` hides the "no new replies" message.
  const checkForReplies = useCallback(async (silent = false) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      if (!silent) toast.error('Session expired - sign in again.');
      return;
    }

    setSyncing(true);
    const pending = silent ? undefined : toast.loading('Checking the inbox…');
    const res = await fetch('/api/mail/sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json().catch(() => ({}));
    setSyncing(false);

    if (!res.ok) {
      if (!silent) toast.error(`Couldn't check: ${json.error ?? res.statusText}`, { id: pending });
      return;
    }

    if (json.added > 0 || json.unfiled > 0) {
      const parts = [];
      if (json.added > 0) parts.push(`${json.added} new ${json.added === 1 ? 'message' : 'messages'}`);
      if (json.unfiled > 0) parts.push(`${json.unfiled} to review`);
      toast.success(parts.join(' · '), { id: pending });
      await load();
      // refresh the open thread too
      setThreadNonce(n => n + 1);
    } else if (!silent) {
      // explain why sent emails were skipped
      toast.success(
        json.ignored > 0
          ? `Nothing new (${json.ignored} of our own send${json.ignored === 1 ? '' : 's'} skipped)`
          : 'Nothing new',
        { id: pending },
      );
    }
  }, [load]);

  // turn an unfiled email into a thread
  async function acceptUnfiled(u: Unfiled) {
    setTriaging(u.id);

    const { data: created, error } = await supabase
      .from('messages')
      .insert({
        // their name, or the part of the email before the @
        name: u.from_name.trim() || u.from_email.split('@')[0],
        email: u.from_email,
        subject: u.subject,
        message: u.body,
        status: 'Pending',
        source: 'email',
        // used to match later replies
        email_message_id: u.email_message_id,
        // use the date they sent it
        created_at: u.received_at,
      })
      .select()
      .single();

    if (error || !created) {
      setTriaging(null);
      toast.error(error?.message ?? 'Could not create the thread.');
      return;
    }

    // done as a second step so a failure doesn't lose the thread
    const { error: linkError } = await supabase
      .from('inbound_emails')
      .update({
        status: 'accepted',
        message_id: created.id,
        handled_by: profile?.email ?? null,
        handled_at: new Date().toISOString(),
      })
      .eq('id', u.id);

    setTriaging(null);
    if (linkError) { toast.error(linkError.message); return; }

    setUnfiled(prev => prev.filter(x => x.id !== u.id));
    setMessages(prev => [created as Message, ...prev]);
    setSelected(created as Message);
    setOpenUnfiled(null);
    toast.success(`Thread opened for ${u.from_email}`);
  }

  // ignore everything from this sender
  async function ignoreUnfiled(u: Unfiled) {
    setTriaging(u.id);
    const { error } = await supabase
      .from('inbound_emails')
      .update({
        status: 'ignored',
        handled_by: profile?.email ?? null,
        handled_at: new Date().toISOString(),
      })
      .eq('from_email', u.from_email)
      .eq('status', 'pending');
    setTriaging(null);

    if (error) { toast.error(error.message); return; }
    setUnfiled(prev => prev.filter(x => x.from_email !== u.from_email));
    if (openUnfiled === u.id) setOpenUnfiled(null);
    toast.success(`Ignored mail from ${u.from_email}`);
  }

  // check for new mail once per visit
  const autoSynced = useRef(false);
  useEffect(() => {
    if (autoSynced.current) return;
    autoSynced.current = true;
    checkForReplies(true);
  }, [checkForReplies]);

  useEffect(() => { load(); }, [load]);

  const selectedId = selected?.id ?? null;
  // the open thread, for code that runs after an await
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  // reset the draft only when a different thread opens
  useEffect(() => {
    setReplyText('');
    setConfirmDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // separate so a sync doesn't clear the draft
  useEffect(() => {
    if (!selectedId) { setReplies([]); return; }

    let cancelled = false;
    supabase
      .from('message_replies')
      .select('*')
      .eq('message_id', selectedId)
      .order('sent_at', { ascending: true })
      .then(({ data }) => { if (!cancelled) setReplies((data ?? []) as Reply[]); });

    return () => { cancelled = true; };
  }, [selectedId, threadNonce]);

  async function setStatus(m: Message, status: Status) {
    const patch = {
      status,
      handled_by: status === 'Addressed' ? (profile?.email ?? null) : null,
      handled_at: status === 'Addressed' ? new Date().toISOString() : null,
    };
    const { error } = await supabase.from('messages').update(patch).eq('id', m.id);
    if (error) { toast.error(error.message); return; }

    setMessages(prev => prev.map(x => (x.id === m.id ? { ...x, ...patch } : x)));
    setSelected(prev => (prev?.id === m.id ? { ...prev, ...patch } : prev));
  }

  // send the reply
  async function sendReply() {
    if (!selected) return;
    const body = replyText.trim();
    if (!body) return;

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      toast.error('Session expired - sign in again to send email.');
      return;
    }

    setSending(true);
    const pending = toast.loading(`Sending to ${selected.email}…`);
    const res = await fetch('/api/email/message-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: selected.id, body }),
    });
    const json = await res.json().catch(() => ({}));
    setSending(false);

    if (!res.ok) {
      toast.error(`Couldn't send: ${json.error ?? res.statusText}`, { id: pending });
      return;
    }
    toast.success(`Reply sent to ${selected.email}`, { id: pending });

    // another thread may be open now
    const id = selected.id;
    const stillOpen = selectedIdRef.current === id;
    if (stillOpen) setReplyText('');

    // mark it addressed without reloading the list
    const patch = {
      status: 'Addressed' as Status,
      handled_by: profile?.email ?? null,
      handled_at: new Date().toISOString(),
    };
    if (json.reply && stillOpen) setReplies(prev => [...prev, json.reply as Reply]);
    setReplyCounts(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
    setMessages(prev => prev.map(x => (x.id === id ? { ...x, ...patch } : x)));
    setSelected(prev => (prev?.id === id ? { ...prev, ...patch } : prev));
  }

  // permanently delete the message and its replies
  async function deleteMessage() {
    if (!selected) return;
    setDeleting(true);
    const { error } = await supabase.from('messages').delete().eq('id', selected.id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }

    toast.success('Message deleted');
    setMessages(prev => prev.filter(m => m.id !== selected.id));
    setSelected(null);
  }

  // open your own email app with the reply filled in
  function mailtoLink(m: Message) {
    const subject = m.subject ? `Re: ${m.subject}` : 'Re: your message to Jit Jots';
    const quoted = m.message.split('\n').map(l => `> ${l}`).join('\n');
    const body =
      `Hi ${m.name.split(/\s+/)[0]},\n\n\n\n` +
      `- The Jit Jots team\n\n` +
      `On ${fmtDateTime(m.created_at)} you wrote:\n${quoted}\n`;
    return `mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  const counts = useMemo(() => ({
    all: messages.length,
    Pending: messages.filter(m => m.status === 'Pending').length,
    Addressed: messages.filter(m => m.status === 'Addressed').length,
  } as Record<string, number>), [messages]);

  const filtered = messages
    .filter(m => filter === 'all' || m.status === filter)
    .filter(m => {
      if (!search) return true;
      const q = search.toLowerCase();
      return m.name.toLowerCase().includes(q)
        || m.email.toLowerCase().includes(q)
        || m.subject.toLowerCase().includes(q)
        || m.message.toLowerCase().includes(q);
    });

  const segBase: React.CSSProperties = {
    border: 'none', padding: '7px 13px', borderRadius: 8, fontSize: 13,
    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', gap: 7,
  };

  if (!can(role, 'view:messages')) return null;

  return (
    <>
      <div className="portal-head" style={{ padding: '20px 28px 16px', borderBottom: '1px solid #e6e9ee', background: '#fff' }}>
        <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: 700, fontSize: 23, letterSpacing: '-0.2px' }}>
          Messages
        </div>
        <div style={{ fontSize: 13.5, color: '#8a93a0', marginTop: 2 }}>
          {messages.length} total · {counts['Pending']} pending
          {unfiled.length > 0 && (
            <span style={{ color: '#9A6A00', fontWeight: 600 }}>
              {' · '}{unfiled.length} to review
            </span>
          )}
        </div>
      </div>

      <div className="portal-toolbar" style={{ padding: '14px 28px', borderBottom: '1px solid #e6e9ee', background: '#fff', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: 262 }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9aa3ad', display: 'flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-3.6-3.6" /></svg>
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, message…"
            style={{ width: '100%', border: '1px solid #d8dde3', borderRadius: 9, padding: '9px 12px 9px 34px', fontSize: 13.5, fontFamily: 'inherit', color: '#1d2733', outline: 'none' }}
          />
        </div>

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

        {/* check for new mail */}
        {/* wrapped so the click event isn't passed as `silent` */}
        <button
          onClick={() => checkForReplies()}
          disabled={syncing}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, border: '1px solid #d8dde3', background: '#fff', borderRadius: 9, padding: '8px 13px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', color: syncing ? '#a7aeb8' : '#4b5563', cursor: syncing ? 'default' : 'pointer' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" />
          </svg>
          {syncing ? 'Checking…' : 'Check for replies'}
        </button>
      </div>

      <div className="portal-body" style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
        {/* unfiled emails */}
        {unfiled.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid #F3DDB0', borderRadius: 13, overflow: 'hidden', marginBottom: 18 }}>
            <div style={{ background: '#FEF9F0', padding: '13px 18px', borderBottom: '1px solid #F6E7C6', display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9A6A00" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M12 9v4" /><path d="M12 17h.01" />
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
              </svg>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#7a5400' }}>
                  {unfiled.length} email{unfiled.length === 1 ? '' : 's'} we can&apos;t place
                </div>
                <div style={{ fontSize: 12.5, color: '#9A6A00', marginTop: 2, lineHeight: 1.5 }}>
                  Sent straight to our address rather than through Contact Us.
                  Accept one to start a thread you can reply to; ignore it and it
                  won&apos;t come back.
                </div>
              </div>
            </div>

            {unfiled.map(u => {
              const open = openUnfiled === u.id;
              const busy = triaging === u.id;
              return (
                <div key={u.id} style={{ borderBottom: '1px solid #f6f2e8' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px' }}>
                    <button
                      onClick={() => setOpenUnfiled(open ? null : u.id)}
                      style={{ flex: 1, minWidth: 0, textAlign: 'left', border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1d2733' }}>
                        {u.from_name || u.from_email}
                        {u.from_name && <span style={{ fontWeight: 400, color: '#8a93a0' }}> · {u.from_email}</span>}
                      </div>
                      <div style={{ fontSize: 13, color: '#4b5563', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.subject && <span style={{ fontWeight: 600 }}>{u.subject} · </span>}
                        {u.body.replace(/\s+/g, ' ')}
                      </div>
                    </button>

                    <span style={{ fontSize: 12.5, color: '#9aa3ad', whiteSpace: 'nowrap' }}>
                      {fmtDateTime(u.received_at)}
                    </span>

                    <button
                      onClick={() => acceptUnfiled(u)}
                      disabled={busy}
                      style={{ border: 'none', background: busy ? '#eef1f3' : '#2BA55F', color: busy ? '#a7aeb8' : '#fff', borderRadius: 8, padding: '7px 13px', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: busy ? 'default' : 'pointer', whiteSpace: 'nowrap' }}
                    >
                      {busy ? 'Working…' : 'Accept'}
                    </button>
                    <button
                      onClick={() => ignoreUnfiled(u)}
                      disabled={busy}
                      title="Hide this sender. Later mail from them will stay hidden."
                      style={{ border: '1px solid #d8dde3', background: '#fff', color: '#6b7585', borderRadius: 8, padding: '7px 13px', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: busy ? 'default' : 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Ignore sender
                    </button>
                  </div>

                  {open && (
                    <div style={{ padding: '0 18px 16px' }}>
                      <div style={{ fontSize: 14, color: '#1d2733', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: '#fafbfc', border: '1px solid #eef1f3', borderRadius: 10, padding: '13px 15px' }}>
                        {u.body}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {loading ? null : filtered.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e6e9ee', borderRadius: 13, padding: '64px 24px', textAlign: 'center', color: '#9aa3ad' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#5a6573', marginBottom: 4 }}>No messages</div>
            <div style={{ fontSize: 13.5 }}>Contact form notes and booking email threads appear here.</div>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e6e9ee', borderRadius: 13, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafbfc' }}>
                  {['From', 'Message', 'Status', 'Received'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a93a0', padding: '12px 14px', borderBottom: '1px solid #e6e9ee' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr
                    key={m.id}
                    onClick={() => setSelected(m)}
                    style={{ cursor: 'pointer', borderBottom: '1px solid #eef1f3' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f7fafb')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '13px 14px', fontSize: 14, minWidth: 180 }}>
                      <div style={{ fontWeight: 600, color: '#1d2733' }}>{m.name}</div>
                      <div style={{ fontSize: 12.5, color: '#8a93a0' }}>{m.email}</div>
                      {m.source === 'booking' && (
                        <div style={{ marginTop: 5, display: 'inline-flex', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: ACCENT_DARK, background: '#f0edf5', borderRadius: 5, padding: '2px 6px' }}>
                          Booking
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '13px 14px', fontSize: 14, color: '#4b5563', maxWidth: 460 }}>
                      {m.subject && (
                        <span style={{ fontWeight: 600, color: '#1d2733' }}>{m.subject} · </span>
                      )}
                      {/* short preview */}
                      <span style={{ display: 'inline-block', maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'bottom' }}>
                        {m.message.replace(/\s+/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '13px 14px' }}>
                      <Badge status={m.status} />
                      {/* shows that an email was sent from the portal */}
                      {(replyCounts[m.id] ?? 0) > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#8a93a0', marginTop: 6 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 17 4 12l5-5" /><path d="M4 12h11a5 5 0 0 1 5 5v2" />
                          </svg>
                          {replyCounts[m.id] > 1 ? `${replyCounts[m.id]} replies` : 'Replied'}
                        </div>
                      )}
                      {(inboundCounts[m.id] ?? 0) > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: '#1E7A44', marginTop: 5 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 17l5-5-5-5" /><path d="M20 12H9a5 5 0 0 0-5 5v2" />
                          </svg>
                          {inboundCounts[m.id] > 1 ? `${inboundCounts[m.id]} from them` : 'They replied'}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '13px 14px', fontSize: 13.5, color: '#8a93a0', whiteSpace: 'nowrap' }}>
                      {fmtDateTime(m.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* full message */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,30,.34)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="portal-drawer"
            style={{ width: 500, maxWidth: '92vw', height: '100%', background: '#fff', boxShadow: '-12px 0 40px -16px rgba(15,23,30,.3)', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ padding: '20px 26px', borderBottom: '1px solid #eef1f3', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9aa3ad', marginBottom: 6 }}>
                  {selected.source === 'booking' ? 'Booking thread' : 'Message'}
                </div>
                <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: 800, fontSize: 19, lineHeight: 1.25 }}>
                  {selected.subject || '(no subject)'}
                </div>
                <div style={{ marginTop: 9, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Badge status={selected.status} />
                  {selected.source === 'booking' && selected.booking_id && (
                    <Link
                      href={`/admin/bookings?open=${selected.booking_id}`}
                      style={{ fontSize: 12.5, fontWeight: 700, color: ACCENT_DARK }}
                    >
                      View booking
                    </Link>
                  )}
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9aa3ad', padding: 6, display: 'flex' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '8px 26px 24px' }}>
              {[
                ['From', selected.name],
                ['Email', selected.email],
                ['Received', fmtDateTime(selected.created_at)],
                ...(selected.source === 'booking' ? [['Kind', 'Workshop booking']] : []),
                ...(selected.handled_by ? [['Handled by', selected.handled_by]] : []),
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid #f2f4f6' }}>
                  <div style={{ width: 108, minWidth: 108, fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9aa3ad', paddingTop: 1 }}>{label}</div>
                  <div style={{ flex: 1, fontSize: 14.5, color: '#1d2733', wordBreak: 'break-word' }}>{value}</div>
                </div>
              ))}

              <div style={{ padding: '18px 0 4px' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9aa3ad', marginBottom: 9 }}>
                  {/* email threads have no form message */}
                  {selected.source === 'email' ? 'Their email' : selected.source === 'booking' ? 'Booking' : 'Full message'}
                </div>
                <div style={{ fontSize: 14.5, color: '#1d2733', lineHeight: 1.65, whiteSpace: 'pre-wrap', background: '#fafbfc', border: '1px solid #eef1f3', borderRadius: 11, padding: '14px 16px' }}>
                  {selected.message}
                </div>
              </div>

              {replies.length > 0 && (
                <div style={{ padding: '20px 0 0' }}>
                  {/* toolbar is hidden behind the panel */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9aa3ad' }}>
                      Conversation
                    </div>
                    <button
                      onClick={() => checkForReplies()}
                      disabled={syncing}
                      style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', background: 'none', padding: 0, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', color: syncing ? '#a7aeb8' : ACCENT, cursor: syncing ? 'default' : 'pointer' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" />
                      </svg>
                      {syncing ? 'Checking…' : 'Check for replies'}
                    </button>
                  </div>
                  {replies.map(r => {
                    // color shows who sent it
                    const inbound = r.direction === 'inbound';
                    return (
                      <div
                        key={r.id}
                        style={{ marginBottom: 10, borderRadius: 9, padding: '12px 14px',
                          background: inbound ? '#fff' : '#f7f6f9',
                          border: `1px solid ${inbound ? '#e6e9ee' : '#ece9f0'}`,
                          borderLeft: `3px solid ${inbound ? '#2BA55F' : ACCENT}` }}
                      >
                        <div style={{ fontSize: 12, color: '#8a93a0', marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, color: inbound ? '#1E7A44' : ACCENT_DARK }}>
                            {inbound ? selected.name : r.sent_by}
                          </span>
                          {' · '}{fmtDateTime(r.sent_at)}
                        </div>
                        <div style={{ fontSize: 14.5, color: '#1d2733', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                          {r.body}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ padding: '20px 0 4px' }}>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9aa3ad', marginBottom: 7 }}>
                  {replies.some(r => r.direction === 'outbound') ? 'Send another reply' : 'Reply'}
                </label>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder={`Hi ${selected.name.split(/\s+/)[0]},\n\nThanks for getting in touch…`}
                  rows={6}
                  disabled={sending}
                  style={{ width: '100%', border: '1px solid #d8dde3', borderRadius: 9, padding: '11px 13px', fontSize: 14.5, fontFamily: 'inherit', color: '#1d2733', outline: 'none', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: 12.5, color: '#9aa3ad', margin: '8px 0 11px', lineHeight: 1.5 }}>
                  Sent verbatim from the Jit Jots address, signed with your name
                  and title, with their message quoted underneath. Marks this
                  Addressed; their response comes back into this thread.
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <button
                    onClick={sendReply}
                    disabled={sending || !replyText.trim()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 10, padding: '10px 16px', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', border: 'none',
                      cursor: sending || !replyText.trim() ? 'default' : 'pointer',
                      background: sending || !replyText.trim() ? '#eef1f3' : ACCENT,
                      color: sending || !replyText.trim() ? '#a7aeb8' : '#fff' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4Z" />
                    </svg>
                    {sending ? 'Sending…' : 'Send reply'}
                  </button>

                  {/* for attachments or adding someone */}
                  <a href={mailtoLink(selected)} style={{ fontSize: 12.5, color: '#8a93a0', textDecoration: 'underline' }}>
                    or use your own mail app
                  </a>
                </div>
              </div>

              {/* delete, with a confirm */}
              <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid #f2f4f6' }}>
                {confirmDelete ? (
                  <>
                    <div style={{ fontSize: 13.5, color: '#9b2c2c', lineHeight: 1.5, marginBottom: 11 }}>
                      Delete this message
                      {replies.length > 0 && ` and the ${replies.length === 1 ? 'reply' : `${replies.length} messages`} in the conversation`}
                      ? This can&apos;t be undone.
                    </div>
                    <div style={{ display: 'flex', gap: 9 }}>
                      <button
                        onClick={deleteMessage}
                        disabled={deleting}
                        style={{ padding: '9px 15px', borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', border: 'none', background: deleting ? '#e8b4b4' : '#c53030', color: '#fff', cursor: deleting ? 'default' : 'pointer' }}
                      >
                        {deleting ? 'Deleting…' : 'Delete permanently'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        disabled={deleting}
                        style={{ padding: '9px 15px', borderRadius: 9, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', border: '1px solid #d8dde3', background: '#fff', color: '#4b5563', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 13px', borderRadius: 9, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', border: '1px solid #f0dcdc', background: '#fff', color: '#9b2c2c', cursor: 'pointer' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" />
                    </svg>
                    Delete message
                  </button>
                )}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #eef1f3', padding: '16px 26px', display: 'flex', gap: 9 }}>
              <button
                onClick={() => setStatus(selected, 'Pending')}
                style={{ flex: 1, padding: 11, borderRadius: 10, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  background: selected.status === 'Pending' ? '#E0A33A' : '#fff',
                  color: selected.status === 'Pending' ? '#fff' : '#9A6A00',
                  border: selected.status === 'Pending' ? '1px solid #E0A33A' : '1px solid #F3DDB0' }}
              >
                Pending
              </button>
              <button
                onClick={() => setStatus(selected, 'Addressed')}
                style={{ flex: 1, padding: 11, borderRadius: 10, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  background: selected.status === 'Addressed' ? '#2BA55F' : '#fff',
                  color: selected.status === 'Addressed' ? '#fff' : '#1E7A44',
                  border: selected.status === 'Addressed' ? '1px solid #2BA55F' : '1px solid #BFE6CC' }}
              >
                Addressed
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
