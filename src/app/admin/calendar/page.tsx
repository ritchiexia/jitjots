'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Status = 'Pending' | 'Confirmed' | 'Declined';

type Booking = {
  id: string;
  org: string;
  contact_name: string;
  email: string;
  requested_date: string; // ISO date string (YYYY-MM-DD)
  age_group: string;
  kids_count: number;
  topic: string;
  status: Status;
  created_at: string;
};

const ACCENT = 'hsl(270, 8%, 49%)';
const ACCENT_DARK = '#4a4153';

const BADGE: Record<Status, { bg: string; fg: string; dot: string }> = {
  Pending: { bg: '#FEF4E0', fg: '#9A6A00', dot: '#E0A33A' },
  Confirmed: { bg: '#E6F6EC', fg: '#1E7A44', dot: '#2BA55F' },
  Declined: { bg: '#FCEAEA', fg: '#C2403F', dot: '#D85C5C' },
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Confirmed', label: 'Confirmed' },
  { key: 'Declined', label: 'Declined' },
];

// Date Helpers

// Local YYYY-MM-DD key
function dateKey(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// Formats "2026-07-12" → "Jul 12, 2026"
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

export default function CalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // First day of the month currently being viewed.
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [statusFilter, setStatusFilter] = useState('all');

  // Day whose bookings are open in the slide-over (null = closed).
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setBookings(data ?? []);
        setLoading(false);
      });
  }, []);

  const visible = useMemo(
    () =>
      bookings.filter(
        (b) => statusFilter === 'all' || b.status === statusFilter,
      ),
    [bookings, statusFilter],
  );

  // Group visible bookings by their requested date for quick per-cell lookup.
  const byDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of visible) {
      const list = map.get(b.requested_date) ?? [];
      list.push(b);
      map.set(b.requested_date, list);
    }
    return map;
  }, [visible]);

  // 42-cell grid (6 weeks) starting on the Sunday on/before the 1st.
  const cells = useMemo(() => {
    const start = new Date(viewDate);
    start.setDate(1 - viewDate.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [viewDate]);

  const todayKey = dateKey(new Date());
  const monthLabel = `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

  function shiftMonth(delta: number) {
    setViewDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1),
    );
  }
  function goToday() {
    const now = new Date();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  const selectedBookings = selectedDay ? (byDate.get(selectedDay) ?? []) : [];

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
  const navBtn: React.CSSProperties = {
    border: '1px solid #d8dde3',
    borderRadius: 9,
    padding: '8px 10px',
    background: '#fff',
    cursor: 'pointer',
    color: '#4b5563',
    display: 'flex',
    alignItems: 'center',
  };

  return (
    <>
      {/* Page header */}
      <div
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
          Calendar
        </div>
        <div style={{ fontSize: 13.5, color: '#8a93a0', marginTop: 2 }}>
          Bookings shown on their requested dates
        </div>
      </div>

      {/* month navigation + status filter */}
      <div
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => shiftMonth(-1)}
            title="Previous month"
            style={navBtn}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={() => shiftMonth(1)}
            title="Next month"
            style={navBtn}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
          <div
            style={{
              fontFamily: 'var(--font-nunito)',
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: '-0.2px',
              marginLeft: 4,
              minWidth: 168,
            }}
          >
            {monthLabel}
          </div>
          <button
            onClick={goToday}
            style={{
              ...segBase,
              border: '1px solid #d8dde3',
              color: ACCENT_DARK,
              background: '#fff',
            }}
          >
            Today
          </button>
        </div>

        {/* Status filter */}
        <div
          style={{
            marginLeft: 'auto',
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
              </button>
            );
          })}
        </div>
      </div>

      {/* Month grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
        {loading ? null : (
          <div
            style={{
              background: '#fff',
              border: '1px solid #e6e9ee',
              borderRadius: 13,
              overflow: 'hidden',
            }}
          >
            {/* Weekday header row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                borderBottom: '1px solid #e6e9ee',
                background: '#fafbfc',
              }}
            >
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  style={{
                    padding: '10px 12px',
                    fontSize: 11.5,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#8a93a0',
                    textAlign: 'left',
                  }}
                >
                  {w}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}
            >
              {cells.map((d, i) => {
                const key = dateKey(d);
                const inMonth = d.getMonth() === viewDate.getMonth();
                const isToday = key === todayKey;
                const dayBookings = byDate.get(key) ?? [];
                const shown = dayBookings.slice(0, 3);
                const extra = dayBookings.length - shown.length;

                return (
                  <div
                    key={key}
                    onClick={() => dayBookings.length && setSelectedDay(key)}
                    style={{
                      minHeight: 104,
                      padding: 8,
                      borderRight: i % 7 !== 6 ? '1px solid #eef1f3' : 'none',
                      borderBottom: i < 35 ? '1px solid #eef1f3' : 'none',
                      background: inMonth ? '#fff' : '#fafbfc',
                      cursor: dayBookings.length ? 'pointer' : 'default',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    {/* Date number — today gets a filled pill */}
                    <div
                      style={{ display: 'flex', justifyContent: 'flex-end' }}
                    >
                      <span
                        style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: isToday
                            ? '#fff'
                            : inMonth
                              ? '#4b5563'
                              : '#c3c9d0',
                          background: isToday ? ACCENT : 'transparent',
                          width: 22,
                          height: 22,
                          borderRadius: 999,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {d.getDate()}
                      </span>
                    </div>

                    {/* Booking chips */}
                    {shown.map((b) => {
                      const c = BADGE[b.status];
                      return (
                        <div
                          key={b.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            background: c.bg,
                            color: c.fg,
                            borderRadius: 6,
                            padding: '2px 6px',
                            fontSize: 11.5,
                            fontWeight: 600,
                            overflow: 'hidden',
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 999,
                              background: c.dot,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {b.org}
                          </span>
                        </div>
                      );
                    })}
                    {extra > 0 && (
                      <div
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: '#8a93a0',
                          paddingLeft: 2,
                        }}
                      >
                        +{extra} more
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Day detail slide-over ── */}
      {selectedDay && (
        <div
          onClick={() => setSelectedDay(null)}
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
                  Requested for
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
                  {fmt(selectedDay)}
                </div>
                <div style={{ fontSize: 13, color: '#8a93a0', marginTop: 4 }}>
                  {selectedBookings.length} booking
                  {selectedBookings.length === 1 ? '' : 's'}
                </div>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
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
              style={{
                flex: 1,
                overflow: 'auto',
                padding: '16px 26px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {selectedBookings.map((b) => (
                <div
                  key={b.id}
                  style={{
                    border: '1px solid #eef1f3',
                    borderRadius: 12,
                    padding: '14px 16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        fontFamily: 'var(--font-nunito)',
                        fontWeight: 700,
                        fontSize: 16,
                        letterSpacing: '-0.2px',
                      }}
                    >
                      {b.org}
                    </div>
                    <Badge status={b.status} />
                  </div>
                  <div
                    style={{
                      fontSize: 13.5,
                      color: '#4b5563',
                      lineHeight: 1.7,
                    }}
                  >
                    <div>
                      {b.contact_name} · {b.email}
                    </div>
                    <div>
                      {b.topic} · {b.age_group} · {b.kids_count} kids
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
    </>
  );
}
