'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import BookingDatePicker from '@/components/booking-date-picker';

// Data model — mirrors the Supabase `bookings` table.
type Status = 'Pending' | 'Confirmed' | 'Declined';

type Booking = {
  id: string;
  org: string;
  contact_name: string;
  email: string;
  requested_date: string;
  age_group: string;
  kids_count: number;
  topic: string;
  status: Status;
  created_at: string;
  notes: string | null;
  logs: LogEntry[] | null;
};

type LogEntry = {
  at: string;
  by: string;
  action: string;
};

// Brand palette + per-status pill colors.
const ACCENT = 'hsl(270, 8%, 49%)';
const ACCENT_DARK = '#4a4153';

const BADGE: Record<Status, { bg: string; fg: string; dot: string }> = {
  Pending:   { bg: '#FEF4E0', fg: '#9A6A00', dot: '#E0A33A' },
  Confirmed: { bg: '#E6F6EC', fg: '#1E7A44', dot: '#2BA55F' },
  Declined:  { bg: '#FCEAEA', fg: '#C2403F', dot: '#D85C5C' },
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

function fmt(iso: string) {
  const [y, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[+m - 1]} ${+d}, ${y}`;
}

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'Pending',   label: 'Pending' },
  { key: 'Confirmed', label: 'Confirmed' },
  { key: 'Declined',  label: 'Declined' },
];

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Toolbar controls (search / status filter / sort).
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState<'submitted' | 'requested'>('submitted');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Detail slide-over: the open booking + draft edits (saved on "Save changes").
  const [selected, setSelected] = useState<Booking | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [adminEmail, setAdminEmail] = useState('');
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAdminEmail(data.session?.user.email ?? ''));
  }, []);

  useEffect(() => {
    setEditDate(selected?.requested_date ?? '');
    setEditNotes(selected?.notes ?? '');
  }, [selected]);

  const dirty =
    !!selected &&
    (editDate !== selected.requested_date || editNotes !== (selected.notes ?? ''));

  useEffect(() => {
    fetchBookings();
  }, []);

  // Load + mutations (all writes hit Supabase, then sync local state).
  async function fetchBookings() {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    setBookings(data ?? []);
    setLoading(false);
  }

  function makeLog(action: string): LogEntry {
    return { at: new Date().toISOString(), by: adminEmail || 'admin', action };
  }

  async function setStatus(status: Status) {
    if (!selected || selected.status === status) return;
    const logs = [makeLog(`Status changed to ${status}`), ...(selected.logs ?? [])];
    await supabase.from('bookings').update({ status, logs }).eq('id', selected.id);
    setBookings(prev => prev.map(b => b.id === selected.id ? { ...b, status, logs } : b));
    setSelected(prev => prev ? { ...prev, status, logs } : prev);
  }

  async function saveDetails() {
    if (!selected) return;
    setSaving(true);

    const newLogs = [...(selected.logs ?? [])];
    if (editDate !== selected.requested_date) {
      newLogs.unshift(makeLog(`Requested date changed from ${fmt(selected.requested_date)} to ${fmt(editDate)}`));
    }

    const patch = { requested_date: editDate, notes: editNotes.trim() || null, logs: newLogs };
    await supabase.from('bookings').update(patch).eq('id', selected.id);
    setBookings(prev => prev.map(b => b.id === selected.id ? { ...b, ...patch } : b));
    setSelected(prev => prev ? { ...prev, ...patch } : prev);
    setSaving(false);
  }

  // Derived view: per-tab counts, then search + filter + sort applied to rows.
  const counts = {
    all:       bookings.length,
    Pending:   bookings.filter(b => b.status === 'Pending').length,
    Confirmed: bookings.filter(b => b.status === 'Confirmed').length,
    Declined:  bookings.filter(b => b.status === 'Declined').length,
  } as Record<string, number>;

  const filtered = bookings
    .filter(b => !search || b.org.toLowerCase().includes(search.toLowerCase()))
    .filter(b => statusFilter === 'all' || b.status === statusFilter)
    .sort((a, b) => {
      const cmp = sortKey === 'submitted'
        ? a.created_at.localeCompare(b.created_at)
        : a.requested_date.localeCompare(b.requested_date);
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const segBase: React.CSSProperties = {
    border: 'none', padding: '7px 13px', borderRadius: 8, fontSize: 13,
    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', gap: 7,
  };

  return (
    <>
      {/* Header */}
      <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid #e6e9ee', background: '#fff' }}>
        <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: 700, fontSize: 23, letterSpacing: '-0.2px' }}>Bookings</div>
        <div style={{ fontSize: 13.5, color: '#8a93a0', marginTop: 2 }}>
          {bookings.length} total · {counts['Pending']} pending
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ padding: '14px 28px', borderBottom: '1px solid #e6e9ee', background: '#fff', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: 262 }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9aa3ad', display: 'flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-3.6-3.6"/></svg>
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search organization…"
            style={{ width: '100%', border: '1px solid #d8dde3', borderRadius: 9, padding: '9px 12px 9px 34px', fontSize: 13.5, fontFamily: 'inherit', color: '#1d2733', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 3, background: '#f1f4f6', borderRadius: 10, padding: 3 }}>
          {STATUS_FILTERS.map(f => {
            const active = statusFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                style={active
                  ? { ...segBase, background: '#fff', color: ACCENT_DARK, boxShadow: '0 1px 2px rgba(0,0,0,.08)' }
                  : { ...segBase, background: 'transparent', color: '#6b7585' }
                }
              >
                {f.label}
                <span style={{ fontSize: 11.5, fontWeight: 700, color: active ? ACCENT : '#aab2ba' }}>
                  {counts[f.key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#8a93a0' }}>Sort by</span>
          <div style={{ position: 'relative' }}>
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as 'submitted' | 'requested')}
              style={{ border: '1px solid #d8dde3', borderRadius: 9, padding: '9px 30px 9px 12px', fontSize: 13.5, fontFamily: 'inherit', color: '#1d2733', background: '#fff', cursor: 'pointer', appearance: 'none', outline: 'none' }}
            >
              <option value="submitted">Date submitted</option>
              <option value="requested">Requested date</option>
            </select>
            <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9aa3ad', display: 'flex' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
            </span>
          </div>

          <button
            onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
            title={sortDir === 'asc' ? 'Ascending (oldest first)' : 'Descending (newest first)'}
            style={{ border: '1px solid #d8dde3', borderRadius: 9, padding: '8px 10px', background: '#fff', cursor: 'pointer', color: '#4b5563', display: 'flex', alignItems: 'center' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {sortDir === 'asc'
                ? <><path d="M7 4v16M7 4l-4 4M7 4l4 4"/><path d="M13 8h8M13 12h5M13 16h3"/></>
                : <><path d="M7 20V4M7 20l-4-4M7 20l4-4"/><path d="M13 8h3M13 12h5M13 16h8"/></>}
            </svg>
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
        {loading ? null : filtered.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e6e9ee', borderRadius: 13, padding: '64px 24px', textAlign: 'center', color: '#9aa3ad' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#5a6573', marginBottom: 4 }}>No bookings found</div>
            <div style={{ fontSize: 13.5 }}>Try a different search or status filter.</div>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e6e9ee', borderRadius: 13, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafbfc' }}>
                  {['Organization', 'Contact', 'Requested', 'Age', 'Kids', 'Topic', 'Status', 'Submitted'].map(h => (
                    <th key={h} style={{ textAlign: h === 'Kids' ? 'center' : 'left', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a93a0', padding: '12px 14px', borderBottom: '1px solid #e6e9ee', position: 'sticky', top: 0, background: '#fafbfc', zIndex: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr
                    key={b.id}
                    onClick={() => setSelected(b)}
                    style={{ cursor: 'pointer', borderBottom: '1px solid #eef1f3' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f7fafb')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '13px 14px', fontSize: 14, fontWeight: 600, color: '#1d2733' }}>{b.org}</td>
                    <td style={{ padding: '13px 14px', fontSize: 14 }}>
                      <div style={{ fontWeight: 500, color: '#1d2733' }}>{b.contact_name}</div>
                      <div style={{ fontSize: 12.5, color: '#8a93a0' }}>{b.email}</div>
                    </td>
                    <td style={{ padding: '13px 14px', fontSize: 14, color: '#4b5563', whiteSpace: 'nowrap' }}>{fmt(b.requested_date)}</td>
                    <td style={{ padding: '13px 14px', fontSize: 14 }}>
                      <span style={{ background: '#f1f4f6', color: '#5a6573', fontSize: 12.5, fontWeight: 600, padding: '3px 9px', borderRadius: 7, whiteSpace: 'nowrap' }}>{b.age_group}</span>
                    </td>
                    <td style={{ padding: '13px 14px', fontSize: 14, color: '#4b5563', textAlign: 'center' }}>{b.kids_count}</td>
                    <td style={{ padding: '13px 14px', fontSize: 14, color: '#4b5563' }}>{b.topic}</td>
                    <td style={{ padding: '13px 14px' }}><Badge status={b.status} /></td>
                    <td style={{ padding: '13px 14px', fontSize: 13.5, color: '#8a93a0', whiteSpace: 'nowrap' }}>{fmt(b.created_at.slice(0, 10))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail slide-over */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,30,.34)', zIndex: 50, display: 'flex', justifyContent: 'flex-end', animation: 'fadeIn .15s ease' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: 472, maxWidth: '92vw', height: '100%', background: '#fff', boxShadow: '-12px 0 40px -16px rgba(15,23,30,.3)', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ padding: '20px 26px', borderBottom: '1px solid #eef1f3', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9aa3ad', marginBottom: 6 }}>Booking request</div>
                <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: 800, fontSize: 20, lineHeight: 1.2, letterSpacing: '-0.2px' }}>{selected.org}</div>
                <div style={{ marginTop: 9 }}><Badge status={selected.status} /></div>
              </div>
              <button onClick={() => setSelected(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9aa3ad', padding: 6, borderRadius: 8, display: 'flex' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '8px 26px 24px' }}>
              {[
                ['Contact name', selected.contact_name],
                ['Email',        selected.email],
                ['Age group',    selected.age_group],
                ['# of kids',    String(selected.kids_count)],
                ['Topic',        selected.topic],
                ['Submitted',    fmt(selected.created_at.slice(0, 10))],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid #f2f4f6' }}>
                  <div style={{ width: 128, minWidth: 128, fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9aa3ad', paddingTop: 1 }}>{label}</div>
                  <div style={{ flex: 1, fontSize: 14.5, color: label === 'Submitted' ? '#8a93a0' : '#1d2733' }}>{value}</div>
                </div>
              ))}

              {/* Requested date */}
              <div style={{ padding: '14px 0 4px' }}>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9aa3ad', marginBottom: 7 }}>Requested date</label>
                <BookingDatePicker
                  key={selected.id}
                  value={editDate}
                  onChange={setEditDate}
                  disabledDates={new Set(
                    bookings
                      .filter(b => b.id !== selected.id && (b.status === 'Pending' || b.status === 'Confirmed'))
                      .map(b => b.requested_date),
                  )}
                  style={{ width: '100%', border: '1px solid #d8dde3', borderRadius: 9, padding: '9px 12px', fontSize: 14, fontFamily: 'inherit', color: '#1d2733', outline: 'none', background: '#fff', cursor: 'pointer' }}
                />
              </div>

              {/* Notes */}
              <div style={{ padding: '14px 0 4px' }}>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9aa3ad', marginBottom: 7 }}>Notes</label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Internal notes — not shown to the requester"
                  rows={4}
                  style={{ width: '100%', border: '1px solid #d8dde3', borderRadius: 9, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: '#1d2733', outline: 'none', resize: 'vertical', lineHeight: 1.5 }}
                />
              </div>

              {/* Save (date + notes) */}
              <button
                onClick={saveDetails}
                disabled={!dirty || saving}
                style={{ width: '100%', marginTop: 6, padding: 10, borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: dirty && !saving ? 'pointer' : 'default', background: dirty && !saving ? ACCENT : '#eef1f3', color: dirty && !saving ? '#fff' : '#a7aeb8', border: 'none' }}
              >
                {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
              </button>

              {/* Activity log */}
              {selected.logs && selected.logs.length > 0 && (
                <div style={{ padding: '22px 0 4px' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9aa3ad', marginBottom: 12 }}>Activity</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                    {selected.logs.map((l, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10 }}>
                        <div style={{ width: 7, height: 7, borderRadius: 999, background: '#cbd2da', marginTop: 6, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13.5, color: '#1d2733', lineHeight: 1.45 }}>{l.action}</div>
                          <div style={{ fontSize: 12, color: '#9aa3ad', marginTop: 2 }}>
                            {new Date(l.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            {l.by ? ` · ${l.by}` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Status controls */}
            <div style={{ borderTop: '1px solid #eef1f3', padding: '16px 26px', display: 'flex', gap: 9 }}>
              <button
                onClick={() => setStatus('Pending')}
                style={{ flex: 1, padding: 11, borderRadius: 10, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: selected.status === 'Pending' ? '#E0A33A' : '#fff', color: selected.status === 'Pending' ? '#fff' : '#9A6A00', border: selected.status === 'Pending' ? '1px solid #E0A33A' : '1px solid #F3DDB0' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                Pending
              </button>
              <button
                onClick={() => setStatus('Confirmed')}
                style={{ flex: 1, padding: 11, borderRadius: 10, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: selected.status === 'Confirmed' ? '#2BA55F' : '#fff', color: selected.status === 'Confirmed' ? '#fff' : '#1E7A44', border: selected.status === 'Confirmed' ? '1px solid #2BA55F' : '1px solid #BFE6CC' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6"/></svg>
                Confirm
              </button>
              <button
                onClick={() => setStatus('Declined')}
                style={{ flex: 1, padding: 11, borderRadius: 10, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: selected.status === 'Declined' ? '#D85C5C' : '#fff', color: selected.status === 'Declined' ? '#fff' : '#C2403F', border: selected.status === 'Declined' ? '1px solid #D85C5C' : '1px solid #F2C9C9' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
    </>
  );
}
