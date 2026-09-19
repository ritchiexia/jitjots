/** Helpers for counting who is free, used by the calendar and heat maps. */

/** Start and end of the day grid, 8 AM to 9 PM. */
export const DAY_START_MIN = 8 * 60;
export const DAY_END_MIN = 21 * 60;
/** Slot length in minutes. */
export const SLOT_MIN = 30;

/** Number of slots in a day. */
export const SLOT_COUNT = (DAY_END_MIN - DAY_START_MIN) / SLOT_MIN;

/** A date range someone is away. */
export type AwayRange = {
  id: string;
  user_id: string;
  /** `"YYYY-MM-DD"`, included. */
  start_date: string;
  /** `"YYYY-MM-DD"`, included. */
  end_date: string;
  reason: string;
};

/** Every date from `from` to `to`, included. */
export function eachDate(from: string, to: string): string[] {
  if (!from || !to || from > to) return [];
  const out: string[] = [];
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const cursor = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  while (cursor <= end) {
    out.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`,
    );
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/** True if the date is inside an away range. */
export function coversDate(away: AwayRange, key: string): boolean {
  return away.start_date <= key && key <= away.end_date;
}

/** A block of time someone is free. */
export type AvailabilityBlock = {
  id: string;
  user_id: string;
  /** `"YYYY-MM-DD"`. */
  date: string;
  /** `"HH:MM"` or `"HH:MM:SS"`. */
  start_time: string;
  /** Not included: a block ending at 10:00 doesn't cover the 10:00 slot. */
  end_time: string;
};

/** Converts a time to minutes since midnight. */
export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Converts minutes to `"HH:MM"`. */
export function hhmm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

/** Converts minutes to a readable time like `"2:30 PM"`. */
export function label12(min: number): string {
  const h = Math.floor(min / 60);
  const ap = h < 12 ? 'AM' : 'PM';
  return `${((h + 11) % 12) + 1}:${String(min % 60).padStart(2, '0')} ${ap}`;
}

/** Start time of a slot, in minutes since midnight. */
export function slotStartMin(i: number): number {
  return DAY_START_MIN + i * SLOT_MIN;
}

/** Every slot index in a day. */
export const ALL_SLOTS = Array.from({ length: SLOT_COUNT }, (_, i) => i);

/** Slots covered by one block. */
function slotsForBlock(b: AvailabilityBlock): number[] {
  const start = toMinutes(b.start_time);
  const end = toMinutes(b.end_time);
  const out: number[] = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    const s = slotStartMin(i);
    if (s >= start && s + SLOT_MIN <= end) out.push(i);
  }
  return out;
}

/** Each person's free slots, so overlapping blocks aren't counted twice. */
export function slotsByUser(blocks: AvailabilityBlock[]): Map<string, Set<number>> {
  const map = new Map<string, Set<number>>();
  for (const b of blocks) {
    const set = map.get(b.user_id) ?? new Set<number>();
    for (const i of slotsForBlock(b)) set.add(i);
    map.set(b.user_id, set);
  }
  return map;
}

/** Number of people free in each slot. */
export function concurrencyBySlot(blocks: AvailabilityBlock[]): number[] {
  const counts = new Array(SLOT_COUNT).fill(0);
  for (const slots of Array.from(slotsByUser(blocks).values())) {
    for (const i of Array.from(slots)) counts[i]++;
  }
  return counts;
}

/** User ids free in each slot. */
export function usersBySlot(blocks: AvailabilityBlock[]): string[][] {
  const out: string[][] = Array.from({ length: SLOT_COUNT }, () => []);
  for (const [userId, slots] of Array.from(slotsByUser(blocks).entries())) {
    for (const i of Array.from(slots)) out[i].push(userId);
  }
  return out;
}

/** Most people free for a full hour that day. */
export function maxConcurrentHour(blocks: AvailabilityBlock[]): number {
  const byUser = Array.from(slotsByUser(blocks).values());
  let best = 0;
  for (let i = 0; i < SLOT_COUNT - 1; i++) {
    let n = 0;
    for (const slots of byUser) if (slots.has(i) && slots.has(i + 1)) n++;
    if (n > best) best = n;
  }
  return best;
}

/** Same as {@link maxConcurrentHour}, but only hours with someone who can lead. */
export function maxConcurrentHourWithLead(
  blocks: AvailabilityBlock[],
  leadIds: Set<string>,
): number {
  const byUser = Array.from(slotsByUser(blocks).entries());
  let best = 0;

  for (let i = 0; i < SLOT_COUNT - 1; i++) {
    let n = 0;
    let hasLead = false;
    for (const [userId, slots] of byUser) {
      if (slots.has(i) && slots.has(i + 1)) {
        n++;
        if (leadIds.has(userId)) hasLead = true;
      }
    }
    if (hasLead && n > best) best = n;
  }

  return best;
}

/** Minimum people for a workshop. Only used for display. */
export const MIN_PEOPLE = 2;

// MONTHS TO FILL IN

/** Months ahead people should fill in. Keep in line with `MAX_MONTHS_AHEAD` in `lib/booking-times.ts`. */
export const MONTHS_AHEAD = 2;

/** Status of one month. */
export type MonthStatus = {
  /** `"YYYY-MM-01"`. */
  key: string;
  /** Like `"October 2026"`. */
  label: string;
  /** Number of days with hours entered. */
  days: number;
  /** Marked away for the whole month. */
  declaredUnavailable: boolean;
  /** No hours and not marked away. */
  missing: boolean;
};

/** First day of the month as `"YYYY-MM-01"`. */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** This month and the next {@link MONTHS_AHEAD} months. */
export function coverageWindow(from = new Date()): Date[] {
  return Array.from({ length: MONTHS_AHEAD + 1 }, (_, i) =>
    new Date(from.getFullYear(), from.getMonth() + i, 1));
}

/** Status of each month, for the fill in your hours prompt. */
export function monthStatuses(
  datesWithHours: Set<string>,
  declaredMonths: Set<string>,
  from = new Date(),
): MonthStatus[] {
  return coverageWindow(from).map(d => {
    const key = monthKey(d);
    const prefix = key.slice(0, 7); // YYYY-MM
    const days = Array.from(datesWithHours).filter(x => x.startsWith(prefix)).length;
    const declaredUnavailable = declaredMonths.has(key);
    return {
      key,
      label: d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      days,
      declaredUnavailable,
      missing: days === 0 && !declaredUnavailable,
    };
  });
}

/** Converts selected slots into time ranges to save. */
export function slotsToRanges(slots: Set<number>): { start: number; end: number }[] {
  const sorted = Array.from(slots).sort((a, b) => a - b);
  const out: { start: number; end: number }[] = [];

  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && slotStartMin(i) === last.end) last.end = slotStartMin(i) + SLOT_MIN;
    else out.push({ start: slotStartMin(i), end: slotStartMin(i) + SLOT_MIN });
  }
  return out;
}

/** Converts saved blocks into selected slots. */
export function blocksToSlotSet(blocks: AvailabilityBlock[]): Set<number> {
  const set = new Set<number>();
  for (const b of blocks) {
    const start = toMinutes(b.start_time);
    const end = toMinutes(b.end_time);
    for (let i = 0; i < SLOT_COUNT; i++) {
      const s = slotStartMin(i);
      if (s >= start && s + SLOT_MIN <= end) set.add(i);
    }
  }
  return set;
}

/** Short name like `"Derek C."`, or the part of an email before the `@`. */
export function shortName(full: string): string {
  const name = full.includes('@') ? full.split('@')[0] : full;
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest[rest.length - 1];
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

/** Groups blocks by date. */
export function groupByDate(blocks: AvailabilityBlock[]): Map<string, AvailabilityBlock[]> {
  const map = new Map<string, AvailabilityBlock[]>();
  for (const b of blocks) {
    const list = map.get(b.date) ?? [];
    list.push(b);
    map.set(b.date, list);
  }
  return map;
}

/** Joins blocks that touch or overlap into one. */
export function mergeBlocks(blocks: AvailabilityBlock[]): { start: number; end: number }[] {
  const ranges = blocks
    .map(b => ({ start: toMinutes(b.start_time), end: toMinutes(b.end_time) }))
    .sort((a, b) => a.start - b.start);

  const out: { start: number; end: number }[] = [];
  for (const r of ranges) {
    const last = out[out.length - 1];
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end);
    else out.push({ ...r });
  }
  return out;
}
