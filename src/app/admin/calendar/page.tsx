'use client';

// team calendar. month view shows people free and bookings per day, week view shows 30 minute slots.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { can, canLead, type Role } from '@/lib/roles';
import { fmtRange } from '@/lib/booking-times';
import { useAdmin } from '@/components/admin/AdminShell';
import DayHeatmap from '@/components/admin/DayHeatmap';
import WeekHeatmap, { type WeekDay } from '@/components/admin/WeekHeatmap';
import {
  MIN_PEOPLE,
  coversDate,
  groupByDate,
  maxConcurrentHour,
  maxConcurrentHourWithLead,
  type AvailabilityBlock,
  type AwayRange,
} from '@/lib/availability';

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
};

const ACCENT = 'hsl(270, 8%, 49%)';
const ACCENT_DARK = '#4a4153';

const BADGE: Record<Status, { bg: string; fg: string; dot: string }> = {
  Pending: { bg: '#FEF4E0', fg: '#9A6A00', dot: '#E0A33A' },
  Confirmed: { bg: '#E6F6EC', fg: '#1E7A44', dot: '#2BA55F' },
  Declined: { bg: '#FCEAEA', fg: '#C2403F', dot: '#D85C5C' },
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dateKey(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmt(iso: string) {
  const [y, m, d] = iso.split('-');
  const short = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${short[+m - 1]} ${+d}, ${y}`;
}

function Badge({ status }: { status: Status }) {
  const c = BADGE[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, background: c.bg, color: c.fg, whiteSpace: 'nowrap' }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: c.dot }} />
      {status}
    </span>
  );
}

export default function CalendarPage() {
  const { role } = useAdmin();
  const showBookings = can(role, 'view:bookings');
  const allowed = can(role, 'view:calendar');
  const showAwayReason = can(role, 'view:all-availability');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availability, setAvailability] = useState<AvailabilityBlock[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [leadIds, setLeadIds] = useState<Set<string>>(new Set());
  const [away, setAway] = useState<AwayRange[]>([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<'month' | 'week'>('month');
  // the day being viewed, kept when switching between month and week
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const weekDates = useMemo(() => {
    const start = new Date(viewDate);
    start.setDate(viewDate.getDate() - viewDate.getDay());
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [viewDate]);

  // only load the dates on screen
  const [rangeStart, rangeEnd] = useMemo(() => (
    mode === 'week'
      ? [dateKey(weekDates[0]), dateKey(weekDates[6])]
      : [
          dateKey(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)),
          dateKey(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0)),
        ]
  ), [mode, viewDate, weekDates]);

  // include bookings on the extra days shown from other months
  const [bookStart, bookEnd] = useMemo(() => {
    if (mode === 'week') return [rangeStart, rangeEnd];
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 41);
    return [dateKey(start), dateKey(end)];
  }, [mode, viewDate, rangeStart, rangeEnd]);

  const load = useCallback(async () => {
    setLoading(true);

    const [{ data: avail }, { data: awayRows }, bookingRes, { data: people }] = await Promise.all([
      supabase
        .from('availability')
        .select('id, user_id, date, start_time, end_time')
        .gte('date', rangeStart)
        .lte('date', rangeEnd),
      supabase
        .from('availability_away')
        .select('id, user_id, start_date, end_date, reason')
        .lte('start_date', rangeEnd)
        .gte('end_date', rangeStart),
      // only the dates on screen
      showBookings
        ? supabase
            .from('bookings')
            .select('id, org, contact_name, email, requested_date, start_time, end_time, age_group, ages, kids_count, topic, status, created_at')
            .gte('requested_date', bookStart)
            .lte('requested_date', bookEnd)
        : Promise.resolve({ data: null }),
      supabase
        .from('profiles')
        .select('id, full_name, email, role, graduated'),
    ]);
    setAvailability((avail ?? []) as AvailabilityBlock[]);
    setAway((awayRows ?? []) as AwayRange[]);
    if (showBookings) setBookings((bookingRes.data ?? []) as Booking[]);

    if (people) {
      type Person = { id: string; full_name: string; email: string; role: Role; graduated: boolean };
      setNames(new Map((people as Person[]).map(p => [p.id, p.full_name || p.email])));
      // people who can lead a workshop
      setLeadIds(new Set((people as Person[]).filter(canLead).map(p => p.id)));
    }

    setLoading(false);
  }, [rangeStart, rangeEnd, bookStart, bookEnd, showBookings]);

  useEffect(() => { if (role) load(); }, [role, load]);

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings.filter(b => b.status !== 'Declined')) {
      const list = map.get(b.requested_date) ?? [];
      list.push(b);
      map.set(b.requested_date, list);
    }
    return map;
  }, [bookings]);

  const availByDate = useMemo(() => groupByDate(availability), [availability]);

  const cells = useMemo(() => {
    // start from the 1st of the month
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [viewDate]);

  // days for the week view, with their bookings
  const weekDays: WeekDay[] = useMemo(() => weekDates.map(d => {
    const key = dateKey(d);
    return {
      key,
      date: d,
      blocks: availByDate.get(key) ?? [],
      bookings: (bookingsByDate.get(key) ?? []).length,
    };
  }), [weekDates, availByDate, bookingsByDate]);

  const todayKey = dateKey(new Date());

  function step(dir: -1 | 1) {
    setViewDate(prev => {
      const d = new Date(prev);
      if (mode === 'week') d.setDate(prev.getDate() + dir * 7);
      // use the 1st so changing months doesn't skip one
      else d.setMonth(prev.getMonth() + dir, 1);
      return d;
    });
  }

  const rangeLabel = mode === 'week'
    ? weekDates[0].getMonth() === weekDates[6].getMonth()
      ? `${MONTHS[weekDates[0].getMonth()]} ${weekDates[0].getDate()}-${weekDates[6].getDate()}, ${weekDates[6].getFullYear()}`
      : `${MONTHS[weekDates[0].getMonth()]} ${weekDates[0].getDate()} - ${MONTHS[weekDates[6].getMonth()]} ${weekDates[6].getDate()}, ${weekDates[6].getFullYear()}`
    : `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

  const selectedBlocks = selectedDay ? (availByDate.get(selectedDay) ?? []) : [];
  const selectedBookings = selectedDay ? (bookingsByDate.get(selectedDay) ?? []) : [];
  const selectedAway = selectedDay ? away.filter(a => coversDate(a, selectedDay)) : [];

  const nameOf = useCallback((id: string) => names.get(id) ?? 'Unknown', [names]);

  const navBtn: React.CSSProperties = {
    border: '1px solid #d8dde3', borderRadius: 9, padding: '8px 10px',
    background: '#fff', cursor: 'pointer', color: '#4b5563', display: 'flex',
    alignItems: 'center', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
  };

  if (!allowed) return null;

  return (
    <>
      <div className="portal-head" style={{ padding: '20px 28px 16px', borderBottom: '1px solid #e6e9ee', background: '#fff' }}>
        <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: 700, fontSize: 23, letterSpacing: '-0.2px' }}>
          Calendar
        </div>
        <div style={{ fontSize: 13.5, color: '#8a93a0', marginTop: 2 }}>
          View bookings and availability of others
        </div>
      </div>

      <div className="portal-toolbar" style={{ padding: '14px 28px', borderBottom: '1px solid #e6e9ee', background: '#fff', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => step(-1)} title={mode === 'week' ? 'Previous week' : 'Previous month'} style={navBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <button onClick={() => step(1)} title={mode === 'week' ? 'Next week' : 'Next month'} style={navBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
        </button>
        <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: 700, fontSize: 17, marginLeft: 4, minWidth: 210 }}>
          {rangeLabel}
        </div>
        <button onClick={() => setViewDate(new Date())} style={{ ...navBtn, color: ACCENT_DARK }}>
          Today
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 3, background: '#f1f4f6', borderRadius: 10, padding: 3 }}>
          {(['month', 'week'] as const).map(m => {
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  border: 'none', padding: '7px 15px', borderRadius: 8, fontSize: 13,
                  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  textTransform: 'capitalize',
                  background: active ? '#fff' : 'transparent',
                  color: active ? ACCENT_DARK : '#6b7585',
                  boxShadow: active ? '0 1px 2px rgba(0,0,0,.08)' : 'none',
                }}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      <div className="portal-body" style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
        {loading ? null : mode === 'week' ? (
          <div className="portal-cal-wrap">
          <div className="portal-cal">
          <WeekHeatmap
            days={weekDays}
            leadIds={leadIds}
            nameOf={nameOf}
            onSelectDay={setSelectedDay}
          />
          </div>
          </div>
        ) : (
          <div className="portal-cal-wrap">
          <div className="portal-cal" style={{ background: '#fff', border: '1px solid #e6e9ee', borderRadius: 13, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #e6e9ee', background: '#fafbfc' }}>
              {WEEKDAYS.map(w => (
                <div key={w} style={{ padding: '10px 12px', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a93a0' }}>
                  {w}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {cells.map((d, i) => {
                const key = dateKey(d);
                const inMonth = d.getMonth() === viewDate.getMonth();
                const isToday = key === todayKey;
                const dayBlocks = availByDate.get(key) ?? [];
                const dayBookings = bookingsByDate.get(key) ?? [];

                const peak = maxConcurrentHour(dayBlocks);
                // hours that also have someone who can lead
                const peakLed = maxConcurrentHourWithLead(dayBlocks, leadIds);

                const enoughPeople = peak >= MIN_PEOPLE;
                const canRun = peakLed >= MIN_PEOPLE;
                // why the day can't run: not enough people, or no leader
                const missingLead = enoughPeople && !canRun;

                // everyone with hours that day
                const peopleCount = new Set(dayBlocks.map(b => b.user_id)).size;
                const dayAway = away.filter(a => coversDate(a, key));

                return (
                  <div
                    key={key}
                    className="day-cell"
                    onClick={() => inMonth && setSelectedDay(key)}
                    style={{
                      minHeight: 108, padding: 8,
                      borderRight: i % 7 !== 6 ? '1px solid #eef1f3' : 'none',
                      borderBottom: i < 35 ? '1px solid #eef1f3' : 'none',
                      background: inMonth ? '#fff' : '#fafbfc',
                      cursor: inMonth ? 'pointer' : 'default',
                      display: 'flex', flexDirection: 'column', gap: 4,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: isToday ? '#fff' : inMonth ? '#4b5563' : '#c3c9d0', background: isToday ? ACCENT : 'transparent', width: 22, height: 22, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        {d.getDate()}
                      </span>
                    </div>

                    {/* people free, greyed out if no hour can run */}
                    {inMonth && peopleCount > 0 && (
                      <div
                        title={canRun
                          ? `${peopleCount} available · up to ${peakLed} free together for a full hour, including someone who can lead`
                          : missingLead
                            ? `${peopleCount} available and ${peak} free together, but nobody who can lead a workshop - needs an exec or a graduated volunteer`
                            : `${peopleCount} available, but never ${MIN_PEOPLE} at the same time for a full hour`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
                          background: canRun ? '#EDE9F2' : '#f1f4f6',
                          color: canRun ? ACCENT_DARK : '#a7aeb8',
                          borderRadius: 7, padding: '2px 8px', fontSize: 11.5, fontWeight: 700,
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        </svg>
                        {peopleCount} available
                      </div>
                    )}

                    {/* enough people but no leader */}
                    {inMonth && missingLead && (
                      <div
                        style={{
                          alignSelf: 'flex-start', background: '#FEF4E0', color: '#9A6A00',
                          borderRadius: 7, padding: '2px 8px', fontSize: 11, fontWeight: 700,
                        }}
                      >
                        no lead
                      </div>
                    )}

                    {inMonth && dayAway.slice(0, 2).map(a => (
                      <div key={a.id} title={showAwayReason ? a.reason : undefined} style={{ background: '#FCEAEA', color: '#C2403F', borderRadius: 6, padding: '2px 6px', fontSize: 11, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {nameOf(a.user_id)} is away
                      </div>
                    ))}
                    {inMonth && dayAway.length > 2 && (
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#C2403F' }}>
                        +{dayAway.length - 2} away
                      </div>
                    )}

                    {showBookings && dayBookings.slice(0, 2).map(b => {
                      const c = BADGE[b.status];
                      return (
                        <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 5, background: c.bg, color: c.fg, borderRadius: 6, padding: '2px 6px', fontSize: 11, fontWeight: 600, overflow: 'hidden' }}>
                          <span style={{ width: 5, height: 5, borderRadius: 999, background: c.dot, flexShrink: 0 }} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.org}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          </div>
        )}
      </div>

      {/* day details: heat map and bookings */}
      {selectedDay && (
        <div
          onClick={() => setSelectedDay(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,30,.34)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="portal-drawer"
            style={{ width: 480, maxWidth: '92vw', height: '100%', background: '#fff', boxShadow: '-12px 0 40px -16px rgba(15,23,30,.3)', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ padding: '20px 26px', borderBottom: '1px solid #eef1f3', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9aa3ad', marginBottom: 6 }}>
                  Availability
                </div>
                <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: 800, fontSize: 20, letterSpacing: '-0.2px' }}>
                  {fmt(selectedDay)}
                </div>
                <div style={{ fontSize: 13, color: '#8a93a0', marginTop: 4 }}>
                  Peak {maxConcurrentHour(selectedBlocks)} free for a full hour
                </div>
              </div>
              <button onClick={() => setSelectedDay(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9aa3ad', padding: 6, display: 'flex' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '18px 26px 24px' }}>
              {selectedAway.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9aa3ad', marginBottom: 10 }}>
                    Away
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedAway.map(a => (
                      <div key={a.id} style={{ background: '#FCEAEA', borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#9b2c2c' }}>
                          {nameOf(a.user_id)} is away
                        </div>
                        {showAwayReason && a.reason && (
                          <div style={{ fontSize: 13, color: '#6b7585', marginTop: 4, lineHeight: 1.5 }}>
                            {a.reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedBookings.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9aa3ad', marginBottom: 10 }}>
                    Bookings
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selectedBookings.map(b => (
                      <div key={b.id} style={{ border: '1px solid #eef1f3', borderRadius: 11, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                          <div style={{ flex: 1, fontFamily: 'var(--font-nunito)', fontWeight: 700, fontSize: 15 }}>{b.org}</div>
                          <Badge status={b.status} />
                        </div>
                        {/* booking time */}
                        {fmtRange(b.start_time, b.end_time) && (
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1d2733', marginBottom: 3 }}>
                            {fmtRange(b.start_time, b.end_time)}
                          </div>
                        )}
                        <div style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6 }}>
                          {b.topic} · {b.age_group}{b.ages ? ` (${b.ages})` : ''} · {b.kids_count} kids
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9aa3ad', marginBottom: 12 }}>
                Who’s free
              </div>
              <DayHeatmap blocks={selectedBlocks} nameOf={nameOf} />
            </div>
          </div>
        </div>
      )}

      <style>{`.day-cell:hover { background: #fcfbfd !important }`}</style>
    </>
  );
}
