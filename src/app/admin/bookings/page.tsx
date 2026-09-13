'use client';

/** Bookings page. Review, edit, add and confirm workshop bookings. */

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/components/admin/AdminShell';
import { can } from '@/lib/roles';
import BookingDatePicker from '@/components/booking-date-picker';
import {
  MAX_MINUTES,
  START_SLOTS,
  endSlotsFor,
  fmtRange,
  hhmm,
  label12,
  toMinutes,
} from '@/lib/booking-times';


// matches the `bookings` table
type Status = 'Pending' | 'Confirmed' | 'Declined';

type Booking = {
  id: string;
  org: string;
  contact_name: string;
  email: string;
  requested_date: string;
  // empty on older bookings
  start_time: string | null;
  end_time: string | null;
  age_group: string;
  ages: string | null;
  kids_count: number;
  topic: string;
  status: Status;
  created_at: string;
  notes: string | null;
  requester_notes: string | null;
  logs: LogEntry[] | null;
  // 'website' from the public form, 'manual' when added here
  source: 'website' | 'manual';
};

const TOPICS = [
  'Forensics',
  '3D Printing',
  'Space',
  'Reactions',
  'Inventors and Engineers',
];

// new manual bookings start as Confirmed
const NEW_BOOKING = {
  org: '',
  contact_name: '',
  email: '',
  requested_date: '',
  start_time: '',
  end_time: '',
  age_group: '',
  ages: '',
  kids_count: '',
  topic: TOPICS[0],
  notes: '',
  status: 'Confirmed' as Status,
};

type LogEntry = {
  at: string;
  by: string;
  action: string;
};

// colors for each status
const ACCENT = 'hsl(270, 8%, 49%)';
const ACCENT_DARK = '#4a4153';

const BADGE: Record<Status, { bg: string; fg: string; dot: string }> = {
  Pending: { bg: '#FEF4E0', fg: '#9A6A00', dot: '#E0A33A' },
  Confirmed: { bg: '#E6F6EC', fg: '#1E7A44', dot: '#2BA55F' },
  Declined: { bg: '#FCEAEA', fg: '#C2403F', dot: '#D85C5C' },
};

function Badge({ status }: { status: Status }) {
  const c = BADGE[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 700,
        background: c.bg,
        color: c.fg,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{ width: 8, height: 8, borderRadius: 999, background: c.dot }}
      />
      {status}
    </span>
  );
}

function fmt(iso: string) {
  const [y, m, d] = iso.split('-');
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${months[+m - 1]} ${+d}, ${y}`;
}

// local date of a timestamp
function fmtLocal(iso: string) {
  const d = new Date(iso);
  return fmt(
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
  );
}

// table columns and how each one sorts
type SortKey =
  | 'org'
  | 'contact_name'
  | 'requested_date'
  | 'start_time'
  | 'age_group'
  | 'kids_count'
  | 'topic'
  | 'status'
  | 'created_at';

const STATUS_ORDER: Record<Status, number> = {
  Pending: 0,
  Confirmed: 1,
  Declined: 2,
};

const COLUMNS: {
  key: SortKey | null;
  label: string;
  type?: 'text' | 'number' | 'date' | 'status';
  align?: 'center';
}[] = [
  { key: 'org', label: 'Organization', type: 'text' },
  { key: 'contact_name', label: 'Contact', type: 'text' },
  { key: 'requested_date', label: 'Requested', type: 'date' },
  { key: 'start_time', label: 'Time', type: 'date' },
  { key: 'age_group', label: 'Age', type: 'text' },
  { key: 'kids_count', label: 'Kids', type: 'number', align: 'center' },
  { key: 'topic', label: 'Topic', type: 'text' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'created_at', label: 'Submitted', type: 'date' },
];

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Confirmed', label: 'Confirmed' },
  { key: 'Declined', label: 'Declined' },
];

export default function BookingsPage() {
  const { role } = useAdmin();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // search and status filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // the open booking and its unsaved edits
  const [selected, setSelected] = useState<Booking | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // add a booking by hand
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(NEW_BOOKING);
  const [savingNew, setSavingNew] = useState(false);

  // delete is for mistakes. use Decline for real requests.
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [adminEmail, setAdminEmail] = useState('');
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setAdminEmail(data.session?.user.email ?? ''));
  }, []);

  useEffect(() => {
    setEditDate(selected?.requested_date ?? '');
    // trim seconds so the time matches the dropdown options
    setEditStart(
      selected?.start_time ? hhmm(toMinutes(selected.start_time)) : '',
    );
    setEditEnd(selected?.end_time ? hhmm(toMinutes(selected.end_time)) : '');
    setEditNotes(selected?.notes ?? '');
    // reset delete confirmation when another booking opens
    setConfirmDelete(false);
  }, [selected]);

  // null instead of '' for empty times
  const asTime = (v: string) => (v ? v : null);

  const dirty =
    !!selected &&
    (editDate !== selected.requested_date ||
      asTime(editStart) !==
        (selected.start_time ? hhmm(toMinutes(selected.start_time)) : null) ||
      asTime(editEnd) !==
        (selected.end_time ? hhmm(toMinutes(selected.end_time)) : null) ||
      editNotes !== (selected.notes ?? ''));

  useEffect(() => {
    fetchBookings();
  }, []);

  const openedFromQuery = useRef(false);
  useEffect(() => {
    if (openedFromQuery.current || loading || bookings.length === 0) return;
    const id = new URLSearchParams(window.location.search).get('open');
    if (!id) return;
    const found = bookings.find((b) => b.id === id);
    if (found) {
      setSelected(found);
      openedFromQuery.current = true;
    }
  }, [loading, bookings]);

  // loading and saving
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

  // email the confirm or decline notice when the admin clicks send
  async function emailRequester(
    booking: Booking,
    status: 'Confirmed' | 'Declined',
  ) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      toast.error('Session expired - sign in again to send email.');
      return;
    }

    const pending = toast.loading(`Emailing ${booking.email}…`);
    const res = await fetch('/api/email/booking-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: booking.id, status }),
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      toast.error(`Couldn't send: ${json.error ?? res.statusText}`, {
        id: pending,
      });
      return;
    }
    toast.success(`Email sent to ${booking.email}`, { id: pending });

    // add the send to the activity log, using the latest log
    const { data: current } = await supabase
      .from('bookings')
      .select('logs')
      .eq('id', booking.id)
      .maybeSingle();
    const logs = [
      makeLog(`${status} email sent to ${booking.email}`),
      ...((current?.logs as LogEntry[] | null) ?? booking.logs ?? []),
    ];
    await supabase.from('bookings').update({ logs }).eq('id', booking.id);
    setBookings((prev) =>
      prev.map((b) => (b.id === booking.id ? { ...b, logs } : b)),
    );
    setSelected((prev) => (prev?.id === booking.id ? { ...prev, logs } : prev));
  }

  async function setStatus(status: Status) {
    if (!selected || selected.status === status) return;
    const logs = [
      makeLog(`Status changed to ${status}`),
      ...(selected.logs ?? []),
    ];
    const { error } = await supabase
      .from('bookings')
      .update({ status, logs })
      .eq('id', selected.id);
    // stop if saving failed
    if (error) {
      toast.error(`Couldn't change the status: ${error.message}`);
      return;
    }
    setBookings((prev) =>
      prev.map((b) => (b.id === selected.id ? { ...b, status, logs } : b)),
    );
    // only if that booking is still open
    setSelected((prev) =>
      prev?.id === selected.id ? { ...prev, status, logs } : prev,
    );

    // offer to send an email, unless Pending or there's no email address
    if (
      (status === 'Confirmed' || status === 'Declined') &&
      selected.email.trim()
    ) {
      const updated = { ...selected, status, logs };
      toast(`Marked ${status}`, {
        description: `Let ${updated.contact_name} know?`,
        duration: 12000,
        action: {
          label: 'Send email',
          onClick: () => emailRequester(updated, status),
        },
      });
    }
  }

  async function saveDetails() {
    if (!selected) return;

    // start and end must both be set or both be empty
    if (!!editStart !== !!editEnd) {
      toast.error('Set both a start and an end time, or neither.');
      return;
    }
    if (editStart && editEnd && toMinutes(editEnd) <= toMinutes(editStart)) {
      toast.error('The end time has to be after the start time.');
      return;
    }

    setSaving(true);

    const newLogs = [...(selected.logs ?? [])];
    if (editDate !== selected.requested_date) {
      newLogs.unshift(
        makeLog(
          `Requested date changed from ${fmt(selected.requested_date)} to ${fmt(editDate)}`,
        ),
      );
    }

    // one log entry for a time change
    const wasTime = fmtRange(selected.start_time, selected.end_time);
    const nowTime = fmtRange(asTime(editStart), asTime(editEnd));
    if (wasTime !== nowTime) {
      newLogs.unshift(
        makeLog(
          wasTime && nowTime
            ? `Time changed from ${wasTime} to ${nowTime}`
            : nowTime
              ? `Time set to ${nowTime}`
              : 'Time cleared',
        ),
      );
    }

    const patch = {
      requested_date: editDate,
      start_time: asTime(editStart),
      end_time: asTime(editEnd),
      notes: editNotes.trim() || null,
      logs: newLogs,
    };

    const { error } = await supabase
      .from('bookings')
      .update(patch)
      .eq('id', selected.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    setBookings((prev) =>
      prev.map((b) => (b.id === selected.id ? { ...b, ...patch } : b)),
    );
    setSelected((prev) =>
      prev?.id === selected.id ? { ...prev, ...patch } : prev,
    );
    toast.success('Booking updated');
  }

  // permanently delete. use Decline for real requests.
  async function deleteBooking() {
    if (!selected) return;
    setDeleting(true);
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', selected.id);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    setBookings((prev) => prev.filter((b) => b.id !== selected.id));
    setSelected(null);
    setConfirmDelete(false);
    toast.success(`Deleted the booking for ${selected.org}`);
  }

  // a booking added by hand
  async function createBooking() {
    const org = draft.org.trim();
    const contact = draft.contact_name.trim();
    const email = draft.email.trim();

    if (!org || !contact) {
      toast.error('Organization and contact name are required.');
      return;
    }
    if (!draft.requested_date) {
      toast.error('Pick a date for the workshop.');
      return;
    }
    if (!!draft.start_time !== !!draft.end_time) {
      toast.error('Set both a start and an end time, or neither.');
      return;
    }
    if (draft.start_time && draft.end_time) {
      const length = toMinutes(draft.end_time) - toMinutes(draft.start_time);
      if (length <= 0) {
        toast.error('The end time has to be after the start time.');
        return;
      }
      // double check the 2 hour limit
      if (length > MAX_MINUTES) {
        toast.error('Workshops are booked in blocks of up to two hours.');
        return;
      }
    }
    // email is optional but must be valid if given
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('That email address doesn’t look right.');
      return;
    }

    setSavingNew(true);
    const { data: created, error } = await supabase
      .from('bookings')
      .insert({
        org,
        contact_name: contact,
        // '' when no email is given
        email,
        requested_date: draft.requested_date,
        start_time: draft.start_time || null,
        end_time: draft.end_time || null,
        age_group: draft.ages.trim() || draft.age_group,
        ages: draft.ages.trim() || null,
        kids_count: Number(draft.kids_count) || 0,
        topic: draft.topic.trim() || 'Workshop',
        status: draft.status,
        notes: draft.notes.trim() || null,
        source: 'manual',
        // note that it was added by hand
        logs: [makeLog(`Added manually as ${draft.status}`)],
      })
      .select()
      .single();

    setSavingNew(false);
    if (error || !created) {
      toast.error(error?.message ?? 'Could not create that booking.');
      return;
    }

    setBookings((prev) => [created as Booking, ...prev]);
    setCreating(false);
    setDraft(NEW_BOOKING);

    // offer to send an email if there's an address
    if (
      email &&
      (draft.status === 'Confirmed' || draft.status === 'Declined')
    ) {
      const status = draft.status;
      toast(`Booking added for ${org}`, {
        description: `Let ${contact} know it's ${status.toLowerCase()}?`,
        duration: 12000,
        action: {
          label: 'Send email',
          onClick: () => emailRequester(created as Booking, status),
        },
      });
    } else {
      toast.success(`Booking added for ${org}`);
    }
  }

  // tab counts, then search, filter and sort
  const counts = {
    all: bookings.length,
    Pending: bookings.filter((b) => b.status === 'Pending').length,
    Confirmed: bookings.filter((b) => b.status === 'Confirmed').length,
    Declined: bookings.filter((b) => b.status === 'Declined').length,
  } as Record<string, number>;

  // click a header to sort, click again to flip the order
  function sortBy(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    const type = COLUMNS.find((c) => c.key === key)?.type;
    setSortKey(key);
    setSortDir(type === 'date' || type === 'number' ? 'desc' : 'asc');
  }

  function compare(a: Booking, b: Booking, key: SortKey): number {
    const type = COLUMNS.find((c) => c.key === key)?.type ?? 'text';

    if (type === 'number') return (a[key] as number) - (b[key] as number);
    if (type === 'status')
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];

    const av = a[key];
    const bv = b[key];

    // bookings with no time go last
    if (!av && !bv) return 0;
    if (!av) return 1;
    if (!bv) return -1;

    // compare dates as text, and names with accents correctly
    return type === 'date'
      ? String(av).localeCompare(String(bv))
      : String(av).localeCompare(String(bv), undefined, {
          sensitivity: 'base',
        });
  }

  const filtered = bookings
    .filter(
      (b) => !search || b.org.toLowerCase().includes(search.toLowerCase()),
    )
    .filter((b) => statusFilter === 'all' || b.status === statusFilter)
    .sort((a, b) => {
      const cmp = compare(a, b, sortKey);
      // ties sort newest first
      if (cmp === 0) return -a.created_at.localeCompare(b.created_at);
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const segBase: React.CSSProperties = {
    border: 'none',
    padding: '7px 13px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
  };

  // time dropdown options
  const timeField: React.CSSProperties = {
    border: '1px solid #d8dde3',
    borderRadius: 9,
    padding: '9px 11px',
    fontSize: 14,
    fontFamily: 'inherit',
    color: '#1d2733',
    outline: 'none',
    background: '#fff',
    cursor: 'pointer',
    minWidth: 0,
  };

  const field: React.CSSProperties = {
    width: '100%',
    border: '1px solid #d8dde3',
    borderRadius: 9,
    padding: '9px 11px',
    fontSize: 14,
    fontFamily: 'inherit',
    color: '#1d2733',
    outline: 'none',
    background: '#fff',
    boxSizing: 'border-box',
  };

  const fieldLabel: React.CSSProperties = {
    display: 'block',
    fontSize: 11.5,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#9aa3ad',
    marginBottom: 6,
  };

  if (!can(role, 'view:bookings')) return null;

  return (
    <>
      {/* header */}
      <div
        className="portal-head"
        style={{
          padding: '20px 28px 16px',
          borderBottom: '1px solid #e6e9ee',
          background: '#fff',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-nunito)',
            fontWeight: 700,
            fontSize: 23,
            letterSpacing: '-0.2px',
          }}
        >
          Bookings
        </div>
        <div style={{ fontSize: 13.5, color: '#8a93a0', marginTop: 2 }}>
          {bookings.length} total · {counts['Pending']} pending
        </div>
      </div>

      {/* toolbar */}
      <div
        className="portal-toolbar"
        style={{
          padding: '14px 28px',
          borderBottom: '1px solid #e6e9ee',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
        }}
      >
        <div className="portal-search" style={{ position: 'relative', width: 262 }}>
          <span
            style={{
              position: 'absolute',
              left: 11,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9aa3ad',
              display: 'flex',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-3.6-3.6" />
            </svg>
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organization…"
            style={{
              width: '100%',
              border: '1px solid #d8dde3',
              borderRadius: 9,
              padding: '9px 12px 9px 34px',
              fontSize: 13.5,
              fontFamily: 'inherit',
              color: '#1d2733',
              outline: 'none',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            gap: 3,
            background: '#f1f4f6',
            borderRadius: 10,
            padding: 3,
          }}
        >
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                style={
                  active
                    ? {
                        ...segBase,
                        background: '#fff',
                        color: ACCENT_DARK,
                        boxShadow: '0 1px 2px rgba(0,0,0,.08)',
                      }
                    : {
                        ...segBase,
                        background: 'transparent',
                        color: '#6b7585',
                      }
                }
              >
                {f.label}
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: active ? ACCENT : '#aab2ba',
                  }}
                >
                  {counts[f.key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <button
            onClick={() => {
              setDraft(NEW_BOOKING);
              setCreating(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              border: 'none',
              background: ACCENT,
              color: '#fff',
              borderRadius: 9,
              padding: '9px 14px',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
              marginRight: 6,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            New booking
          </button>

        </div>
      </div>

      {/* table */}
      <div className="portal-body" style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
        {loading ? null : filtered.length === 0 ? (
          <div
            style={{
              background: '#fff',
              border: '1px solid #e6e9ee',
              borderRadius: 13,
              padding: '64px 24px',
              textAlign: 'center',
              color: '#9aa3ad',
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#5a6573',
                marginBottom: 4,
              }}
            >
              No bookings found
            </div>
            <div style={{ fontSize: 13.5 }}>
              Try a different search or status filter.
            </div>
          </div>
        ) : (
          <div
            style={{
              background: '#fff',
              border: '1px solid #e6e9ee',
              borderRadius: 13,
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafbfc' }}>
                  {COLUMNS.map((c) => {
                    const active = c.key === sortKey;
                    return (
                      <th
                        key={c.label}
                        style={{
                          textAlign: c.align ?? 'left',
                          fontSize: 11.5,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: active ? ACCENT_DARK : '#8a93a0',
                          padding: 0,
                          borderBottom: '1px solid #e6e9ee',
                          position: 'sticky',
                          top: 0,
                          background: '#fafbfc',
                          zIndex: 1,
                        }}
                      >
                        <button
                          onClick={() => c.key && sortBy(c.key)}
                          title={`Sort by ${c.label.toLowerCase()}`}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            border: 'none',
                            background: 'none',
                            font: 'inherit',
                            color: 'inherit',
                            letterSpacing: 'inherit',
                            textTransform: 'inherit',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            justifyContent:
                              c.align === 'center' ? 'center' : 'flex-start',
                          }}
                        >
                          {c.label}
                          {/* sort arrow on the sorted column */}
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ opacity: active ? 1 : 0, flexShrink: 0 }}
                          >
                            {sortDir === 'asc' ? (
                              <path d="M6 15l6-6 6 6" />
                            ) : (
                              <path d="M6 9l6 6 6-6" />
                            )}
                          </svg>
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => setSelected(b)}
                    style={{
                      cursor: 'pointer',
                      borderBottom: '1px solid #eef1f3',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = '#f7fafb')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = '')
                    }
                  >
                    <td
                      style={{
                        padding: '13px 14px',
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#1d2733',
                      }}
                    >
                      {b.org}
                      {/* added by hand */}
                      {b.source === 'manual' && (
                        <span
                          title="Added by hand, not through the website"
                          style={{
                            marginLeft: 7,
                            fontSize: 10.5,
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            color: '#6b7585',
                            background: '#f1f4f6',
                            borderRadius: 5,
                            padding: '2px 5px',
                            verticalAlign: 'middle',
                          }}
                        >
                          MANUAL
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '13px 14px', fontSize: 14 }}>
                      <div style={{ fontWeight: 500, color: '#1d2733' }}>
                        {b.contact_name}
                      </div>
                      <div style={{ fontSize: 12.5, color: '#8a93a0' }}>
                        {b.email}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '13px 14px',
                        fontSize: 14,
                        color: '#4b5563',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {fmt(b.requested_date)}
                    </td>
                    <td
                      style={{
                        padding: '13px 14px',
                        fontSize: 13.5,
                        color: '#4b5563',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {/* no time */}
                      {fmtRange(b.start_time, b.end_time) ?? (
                        <span style={{ color: '#c3c9d0' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '13px 14px', fontSize: 14 }}>
                      <span
                        style={{
                          background: '#f1f4f6',
                          color: '#5a6573',
                          fontSize: 12.5,
                          fontWeight: 600,
                          padding: '3px 9px',
                          borderRadius: 7,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {b.age_group}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '13px 14px',
                        fontSize: 14,
                        color: '#4b5563',
                        textAlign: 'center',
                      }}
                    >
                      {b.kids_count}
                    </td>
                    <td
                      style={{
                        padding: '13px 14px',
                        fontSize: 14,
                        color: '#4b5563',
                      }}
                    >
                      {b.topic}
                    </td>
                    <td style={{ padding: '13px 14px' }}>
                      <Badge status={b.status} />
                    </td>
                    <td
                      style={{
                        padding: '13px 14px',
                        fontSize: 13.5,
                        color: '#8a93a0',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {fmtLocal(b.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* detail panel */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,30,.34)',
            zIndex: 50,
            display: 'flex',
            justifyContent: 'flex-end',
            animation: 'fadeIn .15s ease',
          }}
        >
          <div
            className="portal-drawer"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 472,
              maxWidth: '92vw',
              height: '100%',
              background: '#fff',
              boxShadow: '-12px 0 40px -16px rgba(15,23,30,.3)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '20px 26px',
                borderBottom: '1px solid #eef1f3',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#9aa3ad',
                    marginBottom: 6,
                  }}
                >
                  Booking request
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-nunito)',
                    fontWeight: 800,
                    fontSize: 20,
                    lineHeight: 1.2,
                    letterSpacing: '-0.2px',
                  }}
                >
                  {selected.org}
                </div>
                <div style={{ marginTop: 9 }}>
                  <Badge status={selected.status} />
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: '#9aa3ad',
                  padding: 6,
                  borderRadius: 8,
                  display: 'flex',
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div
              style={{ flex: 1, overflow: 'auto', padding: '8px 26px 24px' }}
            >
              {[
                ['Contact name', selected.contact_name],
                ['Email', selected.email || 'None given'],
                ['Age', selected.ages || selected.age_group],
                ['# of kids', String(selected.kids_count)],
                ['Their notes', selected.requester_notes || 'None'],
                ['Topic', selected.topic],
                [
                  'Source',
                  selected.source === 'manual'
                    ? 'Added by hand'
                    : 'Website form',
                ],
                ['Submitted', fmtLocal(selected.created_at)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    gap: 16,
                    padding: '12px 0',
                    borderBottom: '1px solid #f2f4f6',
                  }}
                >
                  <div
                    style={{
                      width: 128,
                      minWidth: 128,
                      fontSize: 11.5,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#9aa3ad',
                      paddingTop: 1,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      fontSize: 14.5,
                      color: label === 'Submitted' ? '#8a93a0' : '#1d2733',
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}

              {/* requested date */}
              <div style={{ padding: '14px 0 4px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11.5,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#9aa3ad',
                    marginBottom: 7,
                  }}
                >
                  Requested date
                </label>
                <BookingDatePicker
                  key={selected.id}
                  value={editDate}
                  onChange={setEditDate}
                  disabledDates={
                    new Set(
                      bookings
                        .filter(
                          (b) =>
                            b.id !== selected.id &&
                            (b.status === 'Pending' ||
                              b.status === 'Confirmed'),
                        )
                        .map((b) => b.requested_date),
                    )
                  }
                  style={{
                    width: '100%',
                    border: '1px solid #d8dde3',
                    borderRadius: 9,
                    padding: '9px 12px',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    color: '#1d2733',
                    outline: 'none',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                />
              </div>

              {/* time, same options as the public form */}
              <div style={{ padding: '14px 0 4px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11.5,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#9aa3ad',
                    marginBottom: 7,
                  }}
                >
                  Time
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <select
                    value={editStart}
                    onChange={(e) => {
                      setEditStart(e.target.value);
                      // clear the end time if it's no longer valid
                      setEditEnd('');
                    }}
                    style={{ ...timeField, flex: 1 }}
                  >
                    <option value="">No time set</option>
                    {START_SLOTS.map((t) => (
                      <option key={t} value={hhmm(t)}>
                        {label12(t)}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: 13, color: '#9aa3ad' }}>to</span>
                  <select
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                    disabled={!editStart}
                    style={{
                      ...timeField,
                      flex: 1,
                      background: editStart ? '#fff' : '#f7f9fa',
                    }}
                  >
                    <option value="">{editStart ? 'Select' : '-'}</option>
                    {endSlotsFor(editStart).map((t) => (
                      <option key={t} value={hhmm(t)}>
                        {label12(t)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* notes */}
              <div style={{ padding: '14px 0 4px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11.5,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#9aa3ad',
                    marginBottom: 7,
                  }}
                >
                  Notes
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Internal notes - not shown to the requester"
                  rows={4}
                  style={{
                    width: '100%',
                    border: '1px solid #d8dde3',
                    borderRadius: 9,
                    padding: '10px 12px',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    color: '#1d2733',
                    outline: 'none',
                    resize: 'vertical',
                    lineHeight: 1.5,
                  }}
                />
              </div>

              {/* save */}
              <button
                onClick={saveDetails}
                disabled={!dirty || saving}
                style={{
                  width: '100%',
                  marginTop: 6,
                  padding: 10,
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  cursor: dirty && !saving ? 'pointer' : 'default',
                  background: dirty && !saving ? ACCENT : '#eef1f3',
                  color: dirty && !saving ? '#fff' : '#a7aeb8',
                  border: 'none',
                }}
              >
                {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
              </button>

              {/* delete, with a confirm */}
              <div
                style={{
                  marginTop: 22,
                  paddingTop: 18,
                  borderTop: '1px solid #f2f4f6',
                }}
              >
                {confirmDelete ? (
                  <>
                    <div
                      style={{
                        fontSize: 13.5,
                        color: '#9b2c2c',
                        lineHeight: 1.5,
                        marginBottom: 11,
                      }}
                    >
                      Delete the booking for <strong>{selected.org}</strong>?
                      This can&apos;t be undone, and the date opens up again on
                      the public form. To turn a request down and keep the
                      record, use Decline instead.
                    </div>
                    <div style={{ display: 'flex', gap: 9 }}>
                      <button
                        onClick={deleteBooking}
                        disabled={deleting}
                        style={{
                          padding: '9px 15px',
                          borderRadius: 9,
                          fontSize: 13,
                          fontWeight: 700,
                          fontFamily: 'inherit',
                          border: 'none',
                          background: deleting ? '#e8b4b4' : '#c53030',
                          color: '#fff',
                          cursor: deleting ? 'default' : 'pointer',
                        }}
                      >
                        {deleting ? 'Deleting…' : 'Delete permanently'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        disabled={deleting}
                        style={{
                          padding: '9px 15px',
                          borderRadius: 9,
                          fontSize: 13,
                          fontWeight: 600,
                          fontFamily: 'inherit',
                          border: '1px solid #d8dde3',
                          background: '#fff',
                          color: '#4b5563',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '8px 13px',
                      borderRadius: 9,
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      border: '1px solid #f0dcdc',
                      background: '#fff',
                      color: '#9b2c2c',
                      cursor: 'pointer',
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                    </svg>
                    Delete booking
                  </button>
                )}
              </div>

              {/* activity log */}
              {selected.logs && selected.logs.length > 0 && (
                <div style={{ padding: '22px 0 4px' }}>
                  <div
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#9aa3ad',
                      marginBottom: 12,
                    }}
                  >
                    Activity
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 13,
                    }}
                  >
                    {selected.logs.map((l, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10 }}>
                        <div
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: 999,
                            background: '#cbd2da',
                            marginTop: 6,
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 13.5,
                              color: '#1d2733',
                              lineHeight: 1.45,
                            }}
                          >
                            {l.action}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: '#9aa3ad',
                              marginTop: 2,
                            }}
                          >
                            {new Date(l.at).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                            {l.by ? ` · ${l.by}` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* status buttons */}
            <div
              style={{
                borderTop: '1px solid #eef1f3',
                padding: '16px 26px',
                display: 'flex',
                gap: 9,
              }}
            >
              <button
                onClick={() => setStatus('Pending')}
                style={{
                  flex: 1,
                  padding: 11,
                  borderRadius: 10,
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  background:
                    selected.status === 'Pending' ? '#E0A33A' : '#fff',
                  color: selected.status === 'Pending' ? '#fff' : '#9A6A00',
                  border:
                    selected.status === 'Pending'
                      ? '1px solid #E0A33A'
                      : '1px solid #F3DDB0',
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                Pending
              </button>
              <button
                onClick={() => setStatus('Confirmed')}
                style={{
                  flex: 1,
                  padding: 11,
                  borderRadius: 10,
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  background:
                    selected.status === 'Confirmed' ? '#2BA55F' : '#fff',
                  color: selected.status === 'Confirmed' ? '#fff' : '#1E7A44',
                  border:
                    selected.status === 'Confirmed'
                      ? '1px solid #2BA55F'
                      : '1px solid #BFE6CC',
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12l5 5L20 6" />
                </svg>
                Confirm
              </button>
              <button
                onClick={() => setStatus('Declined')}
                style={{
                  flex: 1,
                  padding: 11,
                  borderRadius: 10,
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  background:
                    selected.status === 'Declined' ? '#D85C5C' : '#fff',
                  color: selected.status === 'Declined' ? '#fff' : '#C2403F',
                  border:
                    selected.status === 'Declined'
                      ? '1px solid #D85C5C'
                      : '1px solid #F2C9C9',
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* new booking dialog */}
      {creating && (
        <div
          onClick={() => !savingNew && setCreating(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,30,.4)',
            zIndex: 60,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: 24,
            overflow: 'auto',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 560,
              maxWidth: '100%',
              background: '#fff',
              borderRadius: 14,
              margin: 'auto',
              boxShadow: '0 20px 60px -20px rgba(15,23,30,.4)',
            }}
          >
            <div
              style={{
                padding: '22px 26px 16px',
                borderBottom: '1px solid #eef1f3',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-nunito)',
                  fontWeight: 800,
                  fontSize: 19,
                }}
              >
                Add a booking
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: '#8a93a0',
                  marginTop: 3,
                  lineHeight: 1.5,
                }}
              >
                For one that came to us by phone, email or in person. It shows
                on the calendar and blocks its date on the public form exactly
                like a booking made through the site.
              </div>
            </div>

            <div style={{ padding: '18px 26px 4px' }}>
              <div style={{ marginBottom: 14 }}>
                <label style={fieldLabel}>Organization</label>
                <input
                  value={draft.org}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, org: e.target.value }))
                  }
                  placeholder="School / community group name"
                  autoFocus
                  style={field}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={fieldLabel}>Contact name</label>
                  <input
                    value={draft.contact_name}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, contact_name: e.target.value }))
                    }
                    style={field}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={fieldLabel}>
                    Email{' '}
                    <span
                      style={{
                        textTransform: 'none',
                        letterSpacing: 0,
                        fontWeight: 500,
                        color: '#c3c9d0',
                      }}
                    >
                      optional
                    </span>
                  </label>
                  <input
                    value={draft.email}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, email: e.target.value }))
                    }
                    placeholder="Leave blank if taken by phone"
                    style={field}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={fieldLabel}>Date</label>
                {/* dates booked by others are greyed out */}
                <BookingDatePicker
                  value={draft.requested_date}
                  onChange={(v) =>
                    setDraft((d) => ({ ...d, requested_date: v }))
                  }
                  disabledDates={
                    new Set(
                      bookings
                        .filter(
                          (b) =>
                            b.status === 'Pending' || b.status === 'Confirmed',
                        )
                        .map((b) => b.requested_date),
                    )
                  }
                  style={{ ...field, cursor: 'pointer' }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={fieldLabel}>
                  Time{' '}
                  <span
                    style={{
                      textTransform: 'none',
                      letterSpacing: 0,
                      fontWeight: 500,
                      color: '#c3c9d0',
                    }}
                  >
                    optional
                  </span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <select
                    value={draft.start_time}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        start_time: e.target.value,
                        end_time: '',
                      }))
                    }
                    style={{ ...timeField, flex: 1 }}
                  >
                    <option value="">No time set</option>
                    {START_SLOTS.map((t) => (
                      <option key={t} value={hhmm(t)}>
                        {label12(t)}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: 13, color: '#9aa3ad' }}>to</span>
                  <select
                    value={draft.end_time}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, end_time: e.target.value }))
                    }
                    disabled={!draft.start_time}
                    style={{
                      ...timeField,
                      flex: 1,
                      background: draft.start_time ? '#fff' : '#f7f9fa',
                    }}
                  >
                    <option value="">
                      {draft.start_time ? 'Select' : '-'}
                    </option>
                    {endSlotsFor(draft.start_time).map((t) => (
                      <option key={t} value={hhmm(t)}>
                        {label12(t)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={fieldLabel}>Age</label>
                  <input
                    type="text"
                    value={draft.ages}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, ages: e.target.value, age_group: e.target.value }))
                    }
                    placeholder="e.g. 8, 7-11, 13+"
                    style={field}
                  />
                </div>
                <div style={{ width: 120 }}>
                  <label style={fieldLabel}># of kids</label>
                  <input
                    type="number"
                    min={0}
                    value={draft.kids_count}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, kids_count: e.target.value }))
                    }
                    style={field}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={fieldLabel}>Topic</label>
                {/* topic, with common topics as suggestions */}
                <input
                  list="booking-topics"
                  value={draft.topic}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, topic: e.target.value }))
                  }
                  style={field}
                />
                <datalist id="booking-topics">
                  {TOPICS.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={fieldLabel}>Status</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['Pending', 'Confirmed', 'Declined'] as Status[]).map(
                    (s) => {
                      const on = draft.status === s;
                      const c = BADGE[s];
                      return (
                        <button
                          key={s}
                          onClick={() => setDraft((d) => ({ ...d, status: s }))}
                          style={{
                            flex: 1,
                            padding: '9px 10px',
                            borderRadius: 9,
                            fontSize: 13,
                            fontWeight: 700,
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                            background: on ? c.dot : '#fff',
                            color: on ? '#fff' : c.fg,
                            border: `1px solid ${on ? c.dot : c.bg}`,
                          }}
                        >
                          {s}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 4 }}>
                <label style={fieldLabel}>
                  Notes{' '}
                  <span
                    style={{
                      textTransform: 'none',
                      letterSpacing: 0,
                      fontWeight: 500,
                      color: '#c3c9d0',
                    }}
                  >
                    optional
                  </span>
                </label>
                <textarea
                  value={draft.notes}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, notes: e.target.value }))
                  }
                  placeholder="Internal - who called, what they asked for"
                  rows={3}
                  style={{ ...field, resize: 'vertical', lineHeight: 1.5 }}
                />
              </div>
            </div>

            <div
              style={{
                borderTop: '1px solid #eef1f3',
                padding: '16px 26px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontSize: 12.5,
                  color: '#9aa3ad',
                  lineHeight: 1.45,
                }}
              >
                {draft.email
                  ? 'You’ll be offered the confirmation email after saving.'
                  : 'No email address, so nothing will be sent.'}
              </span>
              <button
                onClick={() => setCreating(false)}
                disabled={savingNew}
                style={{
                  border: '1px solid #d8dde3',
                  background: '#fff',
                  borderRadius: 9,
                  padding: '9px 15px',
                  fontSize: 13.5,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  color: '#4b5563',
                }}
              >
                Cancel
              </button>
              <button
                onClick={createBooking}
                disabled={savingNew}
                style={{
                  border: 'none',
                  background: savingNew ? '#eef1f3' : ACCENT,
                  color: savingNew ? '#a7aeb8' : '#fff',
                  borderRadius: 9,
                  padding: '9px 18px',
                  fontSize: 13.5,
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  cursor: savingNew ? 'default' : 'pointer',
                }}
              >
                {savingNew ? 'Adding…' : 'Add booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
    </>
  );
}
