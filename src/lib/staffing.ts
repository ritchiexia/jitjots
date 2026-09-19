/** Staffing rules for the public booking form. Matches `booking_is_staffed` in `supabase/schema.sql`. */

import {
  type AvailabilityBlock,
  SLOT_COUNT,
  SLOT_MIN,
  slotStartMin,
  slotsByUser,
} from '@/lib/availability';
import { START_SLOTS } from '@/lib/booking-times';

/** Kids per group. Each group needs 2 staff, 1 of them able to lead. */
export const KIDS_PER_GROUP = 30;

/** Largest group that can book online. */
export const MAX_KIDS = 100;

/** A free block from `get_staff_blocks`. `person` is a number, not a name. */
export type StaffBlock = {
  day: string;
  person: number;
  can_lead: boolean;
  start_time: string;
  end_time: string;
};

/** Staff and leaders needed for a group size. */
export function staffNeeded(kids: number): { staff: number; leaders: number } {
  const groups = Math.max(1, Math.ceil(kids / KIDS_PER_GROUP));
  return { staff: groups * 2, leaders: groups };
}

/** Staff and leaders free for the whole time from `start` to `end`, in minutes. Pass one day's blocks. */
export function coverage(blocks: StaffBlock[], start: number, end: number): { staff: number; leaders: number } {
  const slots: number[] = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    const s = slotStartMin(i);
    if (s >= start && s + SLOT_MIN <= end) slots.push(i);
  }
  if (!slots.length) return { staff: 0, leaders: 0 };

  const asBlocks: AvailabilityBlock[] = blocks.map(b => ({
    id: '',
    user_id: String(b.person),
    date: b.day,
    start_time: b.start_time,
    end_time: b.end_time,
  }));
  const leads = new Set(blocks.filter(b => b.can_lead).map(b => String(b.person)));

  let staff = 0;
  let leaders = 0;
  for (const [person, free] of Array.from(slotsByUser(asBlocks).entries())) {
    if (slots.every(i => free.has(i))) {
      staff++;
      if (leads.has(person)) leaders++;
    }
  }
  return { staff, leaders };
}

/** True if enough staff are free for a group of this size. */
export function isStaffed(blocks: StaffBlock[], start: number, end: number, kids = 1): boolean {
  const need = staffNeeded(kids);
  const have = coverage(blocks, start, end);
  return have.staff >= need.staff && have.leaders >= need.leaders;
}

/** Start times with at least the minimum staff for a 30 minute session. */
export function openStarts(blocks: StaffBlock[]): number[] {
  return START_SLOTS.filter(t => isStaffed(blocks, t, t + SLOT_MIN));
}

/** Groups blocks by date. */
export function blocksByDay(blocks: StaffBlock[]): Map<string, StaffBlock[]> {
  const map = new Map<string, StaffBlock[]>();
  for (const b of blocks) {
    const list = map.get(b.day) ?? [];
    list.push(b);
    map.set(b.day, list);
  }
  return map;
}
