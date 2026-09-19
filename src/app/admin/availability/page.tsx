'use client';

/** My Availability page. Enter your own free hours in a month or week view. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/components/admin/AdminShell';
import { can } from '@/lib/roles';
import {
  ALL_SLOTS,
  MONTHS_AHEAD,
  SLOT_MIN,
  blocksToSlotSet,
  coversDate,
  eachDate,
  hhmm,
  label12,
  monthStatuses,
  slotStartMin,
  slotsToRanges,
  type AvailabilityBlock,
  type AwayRange,
} from '@/lib/availability';

const ACCENT = 'hsl(270, 8%, 49%)';
const ACCENT_DARK = '#4a4153';

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function dateKey(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${String(d.getDate()).padStart(2, '0')}`;
}

function weekStart(d: Date) {
  const s = new Date(d);
  s.setDate(d.getDate() - d.getDay());
  s.setHours(0, 0, 0, 0);
  return s;
}

// true if both have the same slots
function sameSlots(a?: Set<number>, b?: Set<number>) {
  const x = a ?? new Set<number>();
  const y = b ?? new Set<number>();
  return x.size === y.size && Array.from(x).every(s => y.has(s));
}

function longDay(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

export default function AvailabilityPage() {
  const { profile, role } = useAdmin();

  const [view, setView] = useState<'month' | 'week'>('month');
  const [anchor, setAnchor] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // selected slots for each date, including unsaved changes
  const [painted, setPainted] = useState<Map<string, Set<number>>>(new Map());
  // what is saved in the database, to find unsaved changes
  const saved = useRef<Map<string, Set<number>>>(new Map());
  // latest selected slots, for code that runs after an await
  const paintedRef = useRef(painted);
  paintedRef.current = painted;

  const [declaredMonths, setDeclaredMonths] = useState<Set<string>>(new Set());
  const [coverageDates, setCoverageDates] = useState<Set<string>>(new Set());

  // day open in the side panel
  const [openDay, setOpenDay] = useState<string | null>(null);

  const [awayRanges, setAwayRanges] = useState<AwayRange[]>([]);
  const [seriesFrom, setSeriesFrom] = useState('');
  const [seriesTo, setSeriesTo] = useState('');

  // dragging from a filled cell erases, from an empty cell fills
  const drag = useRef<{ mode: 'fill' | 'erase'; last?: string } | null>(null);

  useEffect(() => {
    const up = () => { drag.current = null; };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  // the date range being edited
  const { from, to, weekDays, monthCells } = useMemo(() => {
    if (view === 'week') {
      const start = weekStart(anchor);
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
      });
      return { from: dateKey(days[0]), to: dateKey(days[6]), weekDays: days, monthCells: [] as Date[] };
    }

    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    const gridStart = new Date(first);
    gridStart.setDate(1 - first.getDay());
    const cells = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
    return { from: dateKey(first), to: dateKey(last), weekDays: [] as Date[], monthCells: cells };
  }, [view, anchor]);

  /** Loads saved hours for a date range. Days with unsaved changes keep them. */
  const fetchDays = useCallback(async (fromKey: string, toKey: string) => {
    if (!profile) return paintedRef.current;

    const { data, error } = await supabase.from('availability')
      .select('id, user_id, date, start_time, end_time')
      .eq('user_id', profile.id).gte('date', fromKey).lte('date', toKey);
    if (error) { toast.error(error.message); return paintedRef.current; }

    const stored = new Map<string, Set<number>>();
    for (const b of (data ?? []) as AvailabilityBlock[]) {
      const set = stored.get(b.date) ?? new Set<number>();
      for (const s of Array.from(blocksToSlotSet([b]))) set.add(s);
      stored.set(b.date, set);
    }

    // read after loading so new changes aren't lost
    const next = new Map(paintedRef.current);
    for (const key of eachDate(fromKey, toKey)) {
      const db = stored.get(key) ?? new Set<number>();
      const edited = next.has(key) && !sameSlots(next.get(key), saved.current.get(key));
      saved.current.set(key, db);
      if (!edited) next.set(key, new Set(db));
    }
    paintedRef.current = next;
    setPainted(next);
    return next;
  }, [profile]);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const now = new Date();

    const [, { data: months }, { data: allDays }, { data: away }] = await Promise.all([
      fetchDays(from, to),
      supabase.from('availability_months')
        .select('month, unavailable').eq('user_id', profile.id),
      supabase.from('availability')
        .select('date').eq('user_id', profile.id)
        .gte('date', dateKey(new Date(now.getFullYear(), now.getMonth(), 1)))
        .lte('date', dateKey(new Date(now.getFullYear(), now.getMonth() + MONTHS_AHEAD + 1, 0))),
      supabase.from('availability_away')
        .select('id, user_id, start_date, end_date, reason')
        .eq('user_id', profile.id),
    ]);

    setDeclaredMonths(new Set((months ?? [])
      .filter((r: { unavailable: boolean }) => r.unavailable)
      .map((r: { month: string }) => r.month)));
    setCoverageDates(new Set((allDays ?? []).map((r: { date: string }) => r.date)));
    setAwayRanges((away ?? []) as AwayRange[]);
    setLoading(false);
  }, [profile, from, to, fetchDays]);

  useEffect(() => { load(); }, [load]);

  const coverage = useMemo(
    () => monthStatuses(coverageDates, declaredMonths),
    [coverageDates, declaredMonths],
  );

  const todayMidnight = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const todayKey = dateKey(new Date());

  const upcomingAway = useMemo(
    () => awayRanges.filter(a => a.end_date >= todayKey).sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [awayRanges, todayKey],
  );

  function fmtAway(start: string, end: string) {
    const a = longDay(start);
    const b = longDay(end);
    return start === end ? a : `${a} to ${b}`;
  }

  // a week can cover two months, so show a repeat button for each
  const repeatTargets = useMemo(() => {
    if (view !== 'week') return [];
    const seen = new Map<string, { year: number; month: number; label: string; short: string }>();
    for (const d of weekDays) {
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      if (!seen.has(k)) {
        seen.set(k, {
          year: d.getFullYear(),
          month: d.getMonth(),
          label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
          short: MONTHS[d.getMonth()].slice(0, 3),
        });
      }
    }
    return Array.from(seen.values());
  }, [view, weekDays]);

  function isAwayDay(key: string) {
    return awayRanges.some(a => coversDate(a, key));
  }

  function apply(key: string, slot: number, mode: 'fill' | 'erase') {
    if (isAwayDay(key)) return;
    setPainted(prev => {
      const next = new Map(prev);
      const set = new Set(next.get(key) ?? []);
      if (mode === 'fill') set.add(slot); else set.delete(slot);
      next.set(key, set);
      return next;
    });
  }

  const dirtyDays = useMemo(() => {
    const out: string[] = [];
    const keys = new Set([...Array.from(painted.keys()), ...Array.from(saved.current.keys())]);
    for (const key of Array.from(keys)) {
      if (!sameSlots(painted.get(key), saved.current.get(key))) out.push(key);
    }
    return out;
  }, [painted]);

  async function save() {
    if (!profile || dirtyDays.length === 0) return;
    setSaving(true);

    // save changed days with one delete and one insert. failed days stay unsaved.
    const { error: delError } = await supabase
      .from('availability').delete().eq('user_id', profile.id).in('date', dirtyDays);
    if (delError) { toast.error(delError.message); setSaving(false); return; }

    const rows = dirtyDays.flatMap(key =>
      slotsToRanges(painted.get(key) ?? new Set()).map(r => ({
        user_id: profile.id, date: key,
        start_time: hhmm(r.start), end_time: hhmm(r.end),
      })),
    );
    if (rows.length > 0) {
      const { error: insError } = await supabase.from('availability').insert(rows);
      if (insError) { toast.error(insError.message); setSaving(false); return; }
    }

    // update saved in place
    for (const key of dirtyDays) saved.current.set(key, new Set(painted.get(key) ?? []));
    // trigger a re-render
    setPainted(prev => new Map(prev));
    setCoverageDates(prev => {
      const next = new Set(prev);
      for (const key of dirtyDays) {
        if ((painted.get(key)?.size ?? 0) > 0) next.add(key); else next.delete(key);
      }
      return next;
    });

    setSaving(false);
    toast.success('Availability saved');
  }

  async function applySeries(sourceKey: string, fromKey: string, toKey: string) {
    const pattern = new Set(painted.get(sourceKey) ?? []);
    if (pattern.size === 0) {
      toast.error('Set some hours on this day first.');
      return;
    }
    if (!fromKey || !toKey || fromKey > toKey) {
      toast.error('Pick a start date and an end date.');
      return;
    }
    const targets = eachDate(fromKey, toKey).filter(k => {
      const d = new Date(k + 'T00:00:00');
      return d >= todayMidnight && !awayRanges.some(a => coversDate(a, k));
    });
    if (targets.length === 0) {
      toast.error('Nothing in that range can take these hours.');
      return;
    }
    // load the whole range first so the warning is correct
    const current = await fetchDays(targets[0], targets[targets.length - 1]);
    const clobbered = targets.filter(k => k !== sourceKey && (current.get(k)?.size ?? 0) > 0);
    if (clobbered.length > 0) {
      const ok = window.confirm(
        `${clobbered.length} ${clobbered.length === 1 ? 'day' : 'days'} already ${clobbered.length === 1 ? 'has' : 'have'} hours set. Replace them?`,
      );
      if (!ok) return;
    }
    setPainted(prev => {
      const next = new Map(prev);
      for (const key of targets) next.set(key, new Set(pattern));
      return next;
    });
    toast.success(`Copied to ${targets.length} ${targets.length === 1 ? 'day' : 'days'}. Remember to Save.`);
  }

  function shift(delta: number) {
    setAnchor(prev => {
      const d = new Date(prev);
      if (view === 'week') d.setDate(prev.getDate() + delta * 7);
      else d.setMonth(prev.getMonth() + delta);
      return d;
    });
    setOpenDay(null);
  }

  // copy this week's hours to the rest of the month
  async function repeatWeek(targetYear: number, targetMonth: number, monthLabel: string) {
    const pattern = new Map<number, Set<number>>();
    for (const d of weekDays) pattern.set(d.getDay(), new Set(painted.get(dateKey(d)) ?? []));

    if (Array.from(pattern.values()).every(s => s.size === 0)) {
      toast.error('Paint at least one block on this week first.');
      return;
    }

    const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
    const targets: string[] = [];
    for (let day = 1; day <= lastDay; day++) {
      const d = new Date(targetYear, targetMonth, day);
      if (d < todayMidnight) continue; // skip past days
      const key = dateKey(d);
      // skip away days
      if (isAwayDay(key)) continue;
      targets.push(key);
    }
    if (targets.length === 0) {
      toast.error(`No days left in ${monthLabel} can take these hours.`);
      return;
    }

    // warn before replacing hours on other days
    const current = await fetchDays(targets[0], targets[targets.length - 1]);
    const sourceKeys = new Set(weekDays.map(dateKey));
    const clobbered = targets.filter(k => !sourceKeys.has(k) && (current.get(k)?.size ?? 0) > 0);

    if (clobbered.length > 0) {
      const ok = window.confirm(
        `${clobbered.length} ${clobbered.length === 1 ? 'day' : 'days'} in ${monthLabel} already ` +
        `${clobbered.length === 1 ? 'has' : 'have'} hours set. Replace them with this week's pattern?`,
      );
      if (!ok) return;
    }

    setPainted(prev => {
      const next = new Map(prev);
      for (const key of targets) {
        const weekday = new Date(key + 'T00:00:00').getDay();
        next.set(key, new Set(pattern.get(weekday) ?? []));
      }
      return next;
    });

    toast.success(`Applied to ${monthLabel} - remember to Save`);
  }

  // copy this day's hours to the same weekday in later weeks
  // the later dates with the same weekday, used by repeat and clear
  function futureSameWeekdays(dayKey: string, monthsAhead: number): string[] {
    const src = new Date(dayKey + 'T00:00:00');
    const end = new Date(src.getFullYear(), src.getMonth() + monthsAhead + 1, 0);

    const out: string[] = [];
    const cursor = new Date(src);
    cursor.setDate(cursor.getDate() + 7); // after the selected day
    while (cursor <= end) {
      if (cursor >= todayMidnight) out.push(dateKey(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }
    return out;
  }

  async function repeatDayWeekly(dayKey: string, monthsAhead: number, label: string) {
    const pattern = new Set(painted.get(dayKey) ?? []);
    if (pattern.size === 0) {
      toast.error('Set some hours on this day first.');
      return;
    }

    const src = new Date(dayKey + 'T00:00:00');
    // skip away days
    const targets = futureSameWeekdays(dayKey, monthsAhead).filter(k => !isAwayDay(k));

    if (targets.length === 0) {
      toast.error(`No further ${src.toLocaleDateString(undefined, { weekday: 'long' })}s ${label}.`);
      return;
    }

    // load the full range first
    const current = await fetchDays(targets[0], targets[targets.length - 1]);
    const clobbered = targets.filter(k => (current.get(k)?.size ?? 0) > 0);
    if (clobbered.length > 0) {
      const ok = window.confirm(
        `${clobbered.length} of those ${targets.length} days already ${clobbered.length === 1 ? 'has' : 'have'} ` +
        `hours set. Replace them with this day's hours?`,
      );
      if (!ok) return;
    }

    setPainted(prev => {
      const next = new Map(prev);
      for (const key of targets) next.set(key, new Set(pattern));
      return next;
    });

    toast.success(`Copied to ${targets.length} more ${targets.length === 1 ? 'day' : 'days'} - remember to Save`);
  }

  // clear this weekday in later weeks, keeping this day and earlier ones
  async function clearFutureWeekly(dayKey: string, monthsAhead: number) {
    const src = new Date(dayKey + 'T00:00:00');
    const weekday = src.toLocaleDateString(undefined, { weekday: 'long' });

    // load the full range first
    const candidates = futureSameWeekdays(dayKey, monthsAhead);
    const current = candidates.length
      ? await fetchDays(candidates[0], candidates[candidates.length - 1])
      : painted;
    const targets = candidates.filter(k => (current.get(k)?.size ?? 0) > 0);

    if (targets.length === 0) {
      toast.error(`No later ${weekday}s have hours set.`);
      return;
    }

    const ok = window.confirm(
      `Clear hours from ${targets.length} later ${weekday}${targets.length === 1 ? '' : 's'}?\n\n` +
      `${longDay(dayKey)} keeps its hours - use "Clear day" for that one.`,
    );
    if (!ok) return;

    setPainted(prev => {
      const next = new Map(prev);
      for (const key of targets) next.set(key, new Set());
      return next;
    });

    toast.success(`Cleared ${targets.length} later ${weekday}${targets.length === 1 ? '' : 's'} - remember to Save`);
  }

  function goToMonth(key: string) {
    const [y, m] = key.split('-').map(Number);
    setView('month');
    setAnchor(new Date(y, m - 1, 1));
    setOpenDay(null);
  }

  const headerLabel = view === 'week'
    ? `${weekDays[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${weekDays[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
    : `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;

  const btn: React.CSSProperties = {
    border: '1px solid #d8dde3', borderRadius: 9, padding: '8px 10px',
    background: '#fff', cursor: 'pointer', color: '#4b5563', display: 'flex',
    alignItems: 'center', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
  };
  const seg: React.CSSProperties = {
    border: 'none', padding: '7px 13px', borderRadius: 8, fontSize: 13,
    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  };

  // drag painting on touch screens
  function touchPaint(e: React.TouchEvent) {
    const t = e.touches[0];
    if (!drag.current || !t) return;
    const el = document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null;
    const day = el?.dataset.day;
    const slot = el?.dataset.slot;
    if (!day || slot === undefined || el?.dataset.locked) return;
    const id = `${day}:${slot}`;
    // only repaint when moving to a new cell
    if (id === drag.current.last) return;
    drag.current.last = id;
    apply(day, Number(slot), drag.current.mode);
  }

  // painting grid: one column per day, one row per 30 minute slot
  function renderSlotGrid(days: Date[], labelWidth = 64) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `${labelWidth}px repeat(${days.length}, 1fr)`, gap: 3, userSelect: 'none' }}>
        <div />
        {days.map(d => {
          const key = dateKey(d);
          const past = d < todayMidnight;
          return (
            <div key={key} style={{ textAlign: 'center', paddingBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a93a0' }}>
                {WEEKDAYS_SHORT[d.getDay()]}
              </div>
              <div style={{
                fontSize: 15, fontWeight: 700,
                color: key === todayKey ? '#fff' : past ? '#c3c9d0' : '#1d2733',
                background: key === todayKey ? ACCENT : 'transparent',
                borderRadius: 999, width: 26, height: 26, margin: '3px auto 0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {d.getDate()}
              </div>
            </div>
          );
        })}

        {ALL_SLOTS.map(slot => {
          const start = slotStartMin(slot);
          const onHour = start % 60 === 0;
          return (
            <div key={slot} style={{ display: 'contents' }}>
              <div style={{ fontSize: 11, color: '#9aa3ad', textAlign: 'right', paddingRight: 8, lineHeight: '20px' }}>
                {onHour ? label12(start) : ''}
              </div>
              {days.map(d => {
                const key = dateKey(d);
                const past = d < todayMidnight;
                const away = isAwayDay(key);
                const locked = past || away;
                const filled = painted.get(key)?.has(slot) ?? false;
                return (
                  <div
                    key={key + slot}
                    data-day={key}
                    data-slot={slot}
                    data-locked={locked ? '1' : undefined}
                    onMouseDown={() => {
                      if (locked) return;
                      const mode: 'fill' | 'erase' = filled ? 'erase' : 'fill';
                      drag.current = { mode };
                      apply(key, slot, mode);
                    }}
                    onMouseEnter={() => { if (!locked && drag.current) apply(key, slot, drag.current.mode); }}
                    onTouchStart={() => {
                      if (locked) return;
                      const mode: 'fill' | 'erase' = filled ? 'erase' : 'fill';
                      drag.current = { mode, last: `${key}:${slot}` };
                      apply(key, slot, mode);
                    }}
                    onTouchMove={touchPaint}
                    onTouchEnd={e => {
                      // stop the browser from also sending a mouse click
                      if (drag.current) e.preventDefault();
                      drag.current = null;
                    }}
                    onTouchCancel={() => { drag.current = null; }}
                    title={locked ? (away ? 'Your lead marked you away' : undefined) : `${label12(start)} - ${label12(start + SLOT_MIN)}`}
                    style={{
                      height: 20, borderRadius: 3,
                      background: locked ? '#f7f8fa' : filled ? ACCENT : '#eef1f4',
                      borderTop: onHour ? '1px solid #dfe4ea' : 'none',
                      cursor: locked ? 'not-allowed' : 'pointer',
                      // dragging paints instead of scrolling
                      touchAction: locked ? 'auto' : 'none',
                      transition: 'background .06s',
                    }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  if (!can(role, 'edit:own-availability')) return null;

  return (
    <>
      <div className="portal-head" style={{ padding: '20px 28px 16px', borderBottom: '1px solid #e6e9ee', background: '#fff' }}>
        <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: 700, fontSize: 23, letterSpacing: '-0.2px' }}>
          My Availability
        </div>
        <div style={{ fontSize: 13.5, color: '#8a93a0', marginTop: 2 }}>
          Paint the hours you can work.
        </div>
      </div>

      <div className="portal-toolbar" style={{ padding: '14px 28px', borderBottom: '1px solid #e6e9ee', background: '#fff', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={() => shift(-1)} title="Previous" style={btn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <button onClick={() => shift(1)} title="Next" style={btn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
        </button>
        <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: 700, fontSize: 16, marginLeft: 4, minWidth: 190 }}>
          {headerLabel}
        </div>
        <button onClick={() => { setAnchor(new Date()); setOpenDay(null); }} style={{ ...btn, color: ACCENT_DARK }}>
          Today
        </button>

        <div style={{ display: 'flex', gap: 3, background: '#f1f4f6', borderRadius: 10, padding: 3, marginLeft: 8 }}>
          {(['month', 'week'] as const).map(v => (
            <button
              key={v}
              onClick={() => { setView(v); setOpenDay(null); }}
              style={view === v
                ? { ...seg, background: '#fff', color: ACCENT_DARK, boxShadow: '0 1px 2px rgba(0,0,0,.08)' }
                : { ...seg, background: 'transparent', color: '#6b7585' }}
            >
              {v === 'month' ? 'Month' : 'Week'}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* week view only */}
          {view === 'week' && (
            <div style={{ display: 'flex', gap: 6 }}>
              {repeatTargets.map(t => (
                <button
                  key={t.label}
                  onClick={() => repeatWeek(t.year, t.month, t.label)}
                  title={`Apply this week's pattern to every remaining day in ${t.label}`}
                  style={{ ...btn, gap: 6, color: ACCENT_DARK }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                    <path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                  </svg>
                  Repeat through {t.short}
                </button>
              ))}
            </div>
          )}

          {dirtyDays.length > 0 && (
            <span style={{ fontSize: 12.5, color: '#9A6A00' }}>Unsaved changes</span>
          )}
          <button
            onClick={save}
            disabled={dirtyDays.length === 0 || saving}
            style={{
              border: 'none', borderRadius: 9, padding: '9px 18px', fontSize: 13.5,
              fontWeight: 700, fontFamily: 'inherit',
              cursor: dirtyDays.length === 0 || saving ? 'default' : 'pointer',
              background: dirtyDays.length === 0 || saving ? '#eef1f3' : ACCENT,
              color: dirtyDays.length === 0 || saving ? '#a7aeb8' : '#fff',
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="portal-body" style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
        <div style={{ background: '#f7f5fa', border: '1px solid #e4dde9', borderRadius: 13, padding: '12px 16px', marginBottom: 16, fontSize: 13.5, color: '#4a4153', lineHeight: 1.55 }}>
          If you will be away for several weeks, please contact your lead.
        </div>
        {/* months to fill in */}
        {!loading && upcomingAway.length > 0 && (
          <div style={{ background: '#FCEAEA', border: '1px solid #F2C9C9', borderRadius: 13, padding: '12px 16px', marginBottom: 16, fontSize: 13.5, color: '#9b2c2c', lineHeight: 1.55 }}>
            Your lead marked you away{' '}
            {upcomingAway.map((a, i) => (
              <span key={a.id}>
                {i > 0 ? ', ' : ''}
                <strong>{fmtAway(a.start_date, a.end_date)}</strong>
              </span>
            ))}
            . Those days are locked. Ask them if that is wrong.
          </div>
        )}
        {!loading && (
          <div style={{ background: '#fff', border: `1px solid ${coverage.some(m => m.missing) ? '#F3DDB0' : '#e6e9ee'}`, borderRadius: 13, padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: 800, fontSize: 15.5 }}>
                Next {MONTHS_AHEAD + 1} months
              </div>
              {/* only shown when something is missing */}
              {coverage.some(m => m.missing) && (
                <div style={{ fontSize: 12.5, color: '#8a93a0' }}>
                  Hours still needed on the highlighted months
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {coverage.map(m => (
                <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 12, background: m.missing ? '#FEF9EF' : '#fafbfc', border: `1px solid ${m.missing ? '#F3DDB0' : '#eef1f3'}`, borderRadius: 10, padding: '9px 13px' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, minWidth: 128 }}>{m.label}</div>
                  <div style={{ flex: 1, fontSize: 13, color: m.missing ? '#9A6A00' : '#6b7585' }}>
                    {m.days > 0 ? `${m.days} ${m.days === 1 ? 'day' : 'days'} added`
                      : 'Nothing entered yet'}
                  </div>
                  <button onClick={() => goToMonth(m.key)} style={{ ...btn, padding: '6px 13px', fontSize: 12.5, background: m.missing ? ACCENT : '#fff', color: m.missing ? '#fff' : ACCENT_DARK, border: m.missing ? 'none' : '1px solid #d8dde3' }}>
                    Go to {m.label.split(' ')[0]}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? null : view === 'month' ? (
          /* MONTH VIEW */
          <div className="portal-cal-wrap">
          <div className="portal-cal" style={{ background: '#fff', border: '1px solid #e6e9ee', borderRadius: 13, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #e6e9ee', background: '#fafbfc' }}>
              {WEEKDAYS_SHORT.map(w => (
                <div key={w} style={{ padding: '10px 12px', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a93a0' }}>
                  {w}
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {monthCells.map((d, i) => {
                const key = dateKey(d);
                const inMonth = d.getMonth() === anchor.getMonth();
                const past = d < todayMidnight;
                const ranges = slotsToRanges(painted.get(key) ?? new Set());
                const isDirty = dirtyDays.includes(key);

                return (
                  <div
                    key={key}
                    className="av-cell"
                    onClick={() => inMonth && !past && !isAwayDay(key) && setOpenDay(key)}
                    style={{
                      minHeight: 104, padding: 8,
                      borderRight: i % 7 !== 6 ? '1px solid #eef1f3' : 'none',
                      borderBottom: i < 35 ? '1px solid #eef1f3' : 'none',
                      background: inMonth ? (past ? '#fafbfc' : '#fff') : '#fafbfc',
                      cursor: inMonth && !past ? 'pointer' : 'default',
                      display: 'flex', flexDirection: 'column', gap: 4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                      {isDirty && <span title="Unsaved" style={{ width: 6, height: 6, borderRadius: 999, background: '#E0A33A' }} />}
                      <span style={{
                        fontSize: 12.5, fontWeight: 600,
                        color: key === todayKey ? '#fff' : inMonth && !past ? '#4b5563' : '#c3c9d0',
                        background: key === todayKey ? ACCENT : 'transparent',
                        width: 22, height: 22, borderRadius: 999,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {d.getDate()}
                      </span>
                    </div>

                    {inMonth && awayRanges.some(a => coversDate(a, key)) && (
                      <div style={{ background: '#FCEAEA', color: '#C2403F', borderRadius: 6, padding: '2px 6px', fontSize: 11, fontWeight: 700 }}>
                        Away
                      </div>
                    )}

                    {inMonth && ranges.map((r, n) => (
                      <div key={n} style={{ background: '#EDE9F2', color: ACCENT_DARK, borderRadius: 6, padding: '2px 6px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {label12(r.start)} - {label12(r.end)}
                      </div>
                    ))}

                    {inMonth && !past && ranges.length === 0 && (
                      <div className="av-hint" style={{ display: 'flex', alignItems: 'center', gap: 4, color: ACCENT, fontSize: 11, fontWeight: 600, opacity: 0, transition: 'opacity .12s' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                        Set hours
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          </div>
        ) : (
          /* WEEK VIEW */
          <div className="portal-cal-wrap">
          <div className="portal-cal" style={{ background: '#fff', border: '1px solid #e6e9ee', borderRadius: 13, padding: 16 }}>
            {renderSlotGrid(weekDays)}
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 16, fontSize: 12.5, color: '#8a93a0' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 13, height: 13, borderRadius: 3, background: ACCENT }} /> Free
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 13, height: 13, borderRadius: 3, background: '#eef1f4' }} /> Not free
              </span>
              <span style={{ marginLeft: 'auto' }}>Drag from a filled cell to erase. Remember to Save.</span>
            </div>
          </div>
          </div>
        )}
      </div>

      {/* single day editor, opened from the month view */}
      {openDay && (
        <div
          onClick={() => setOpenDay(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,30,.34)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="portal-drawer"
            style={{ width: 340, maxWidth: '92vw', height: '100%', background: '#fff', boxShadow: '-12px 0 40px -16px rgba(15,23,30,.3)', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #eef1f3', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9aa3ad', marginBottom: 6 }}>
                  Your hours
                </div>
                <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: 800, fontSize: 18, lineHeight: 1.25 }}>
                  {longDay(openDay)}
                </div>
              </div>
              <button onClick={() => setOpenDay(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9aa3ad', padding: 6, display: 'flex' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px 20px' }}>
              <div style={{ fontSize: 12.5, color: '#8a93a0', marginBottom: 12, lineHeight: 1.5 }}>
                Drag down the column to mark when you’re free. Drag from a filled
                block to clear it.
              </div>
              {renderSlotGrid([new Date(openDay + 'T00:00:00')], 70)}

              {/* repeat weekly. copies the hours, later edits don't update the copies. */}
              <div style={{ marginTop: 20, borderTop: '1px solid #eef1f3', paddingTop: 16 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9aa3ad', marginBottom: 4 }}>
                  Series
                </div>
                <div style={{ fontSize: 12.5, color: '#8a93a0', marginBottom: 10, lineHeight: 1.5 }}>
                  Copy these hours onto every day from one date to another.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#6b7585' }}>
                    From
                    <input
                      type="date"
                      value={seriesFrom}
                      min={todayKey}
                      onChange={e => setSeriesFrom(e.target.value)}
                      style={{ ...btn, width: '100%', marginTop: 4, cursor: 'text' }}
                    />
                  </label>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#6b7585' }}>
                    To
                    <input
                      type="date"
                      value={seriesTo}
                      min={seriesFrom || todayKey}
                      onChange={e => setSeriesTo(e.target.value)}
                      style={{ ...btn, width: '100%', marginTop: 4, cursor: 'text' }}
                    />
                  </label>
                  <button
                    onClick={() => applySeries(openDay, seriesFrom, seriesTo)}
                    style={{ ...btn, justifyContent: 'center', color: ACCENT_DARK }}
                  >
                    Apply series
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 20, borderTop: '1px solid #eef1f3', paddingTop: 16 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9aa3ad', marginBottom: 4 }}>
                  Repeat weekly
                </div>
                <div style={{ fontSize: 12.5, color: '#8a93a0', marginBottom: 10, lineHeight: 1.5 }}>
                  Copy these hours to every{' '}
                  {new Date(openDay + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long' })}{' '}
                  after this one.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <button
                    onClick={() => repeatDayWeekly(openDay, 0, 'this month')}
                    style={{ ...btn, justifyContent: 'center', color: ACCENT_DARK }}
                  >
                    Rest of {MONTHS[new Date(openDay + 'T00:00:00').getMonth()]}
                  </button>
                  <button
                    onClick={() => repeatDayWeekly(openDay, MONTHS_AHEAD, 'in the next few months')}
                    style={{ ...btn, justifyContent: 'center', color: ACCENT_DARK }}
                  >
                    Next {MONTHS_AHEAD + 1} months
                  </button>
                </div>
              </div>

              {/* clear later weeks */}
              <div style={{ marginTop: 18, borderTop: '1px solid #eef1f3', paddingTop: 16 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9aa3ad', marginBottom: 4 }}>
                  Cancel later weeks
                </div>
                <div style={{ fontSize: 12.5, color: '#8a93a0', marginBottom: 10, lineHeight: 1.5 }}>
                  Clear every{' '}
                  {new Date(openDay + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long' })}{' '}
                  <em>after</em> this one. This day and earlier weeks keep their hours.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <button
                    onClick={() => clearFutureWeekly(openDay, 0)}
                    style={{ ...btn, justifyContent: 'center', color: '#C2403F', borderColor: '#F2C9C9' }}
                  >
                    Rest of {MONTHS[new Date(openDay + 'T00:00:00').getMonth()]}
                  </button>
                  <button
                    onClick={() => clearFutureWeekly(openDay, MONTHS_AHEAD)}
                    style={{ ...btn, justifyContent: 'center', color: '#C2403F', borderColor: '#F2C9C9' }}
                  >
                    Next {MONTHS_AHEAD + 1} months
                  </button>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #eef1f3', padding: '14px 24px', display: 'flex', gap: 9 }}>
              <button
                onClick={() => setPainted(prev => {
                  const next = new Map(prev);
                  next.set(openDay, new Set());
                  return next;
                })}
                style={{ ...btn, flex: 1, justifyContent: 'center', color: '#C2403F', borderColor: '#F2C9C9' }}
              >
                Clear day
              </button>
              <button
                onClick={() => { void save(); setOpenDay(null); }}
                disabled={dirtyDays.length === 0 || saving}
                style={{
                  flex: 1, border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13.5,
                  fontWeight: 700, fontFamily: 'inherit',
                  cursor: dirtyDays.length === 0 || saving ? 'default' : 'pointer',
                  background: dirtyDays.length === 0 || saving ? '#eef1f3' : ACCENT,
                  color: dirtyDays.length === 0 || saving ? '#a7aeb8' : '#fff',
                }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .av-cell:hover .av-hint { opacity: 1 }
        .av-cell:hover { background: #fcfbfd !important }
      `}</style>
    </>
  );
}
