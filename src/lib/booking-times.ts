/** Booking time slots, shared by the public form and the admin bookings page. */

/** Earliest start time, in minutes since midnight. */
export const OPEN_MIN = 8 * 60;

/** Latest start time. */
export const LAST_START_MIN = 19 * 60;

/** Latest end time. */
export const CLOSE_MIN = 21 * 60;

/** Slot length in minutes. */
export const SLOT_MIN = 30;

/** Longest booking in minutes. */
export const MAX_MINUTES = 120;

/** How many months ahead people can book. */
export const MAX_MONTHS_AHEAD = 2;

/** Converts "HH:MM" or "HH:MM:SS" to minutes since midnight. */
export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Converts minutes to "HH:MM". */
export function hhmm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

/** Converts minutes to a readable time like "2:30 PM". */
export function label12(min: number): string {
  const h = Math.floor(min / 60);
  const ap = h < 12 ? 'AM' : 'PM';
  return `${((h + 11) % 12) + 1}:${String(min % 60).padStart(2, '0')} ${ap}`;
}

/** Every allowed start time. */
export const START_SLOTS: number[] = (() => {
  const out: number[] = [];
  for (let t = OPEN_MIN; t <= LAST_START_MIN; t += SLOT_MIN) out.push(t);
  return out;
})();

/** Allowed end times for a start time. Empty if no start is chosen. */
export function endSlotsFor(startTime: string): number[] {
  if (!startTime) return [];
  const s = toMinutes(startTime);
  const out: number[] = [];
  for (let t = s + SLOT_MIN; t <= Math.min(s + MAX_MINUTES, CLOSE_MIN); t += SLOT_MIN) out.push(t);
  return out;
}

/** Formats a stored time for display, or null if there isn't one. */
export function fmtTime(t?: string | null): string | null {
  if (!t) return null;
  return label12(toMinutes(t));
}

/** Formats a booking's start and end for display, or null if it has no times. */
export function fmtRange(start?: string | null, end?: string | null): string | null {
  const s = fmtTime(start);
  const e = fmtTime(end);
  if (!s || !e) return s ?? null;
  return `${s} to ${e}`;
}
