'use client';

/** Week view. Purple slots can run a workshop, grey slots have people free but can't. */

import { useState } from 'react';
import {
  ALL_SLOTS,
  MIN_PEOPLE,
  SLOT_COUNT,
  SLOT_MIN,
  label12,
  shortName,
  slotStartMin,
  slotsByUser,
  usersBySlot,
  type AvailabilityBlock,
} from '@/lib/availability';

const ACCENT = 'hsl(270, 8%, 49%)';
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export type WeekDay = {
  key: string;
  date: Date;
  blocks: AvailabilityBlock[];
  bookings: number;
};

type SlotInfo = {
  users: string[];
  /** part of an hour that can run a workshop */
  staffable: boolean;
};

// only people free for the whole hour count
function analyse(blocks: AvailabilityBlock[], leadIds: Set<string>): SlotInfo[] {
  const people = usersBySlot(blocks);
  const byUser = Array.from(slotsByUser(blocks).entries());

  const hourStarts = ALL_SLOTS.map(i => {
    if (i + 1 >= SLOT_COUNT) return false;
    const whole = byUser.filter(([, slots]) => slots.has(i) && slots.has(i + 1));
    return whole.length >= MIN_PEOPLE && whole.some(([id]) => leadIds.has(id));
  });

  return people.map((users, i) => ({
    users,
    staffable: Boolean(hourStarts[i] || (i > 0 && hourStarts[i - 1])),
  }));
}

function shade(count: number, peak: number, staffable: boolean) {
  if (count === 0) return '#f7f8fa';
  const ratio = peak > 0 ? count / peak : 0;
  const strength = Math.round(18 + ratio * 72);
  return staffable
    ? `color-mix(in srgb, ${ACCENT} ${strength}%, white)`
    // people are free, but not enough to run a workshop
    : `color-mix(in srgb, #94a3b8 ${Math.round(strength * 0.55)}%, white)`;
}

export default function WeekHeatmap({
  days,
  leadIds,
  nameOf,
  onSelectDay,
}: {
  days: WeekDay[];
  leadIds: Set<string>;
  nameOf: (userId: string) => string;
  onSelectDay: (key: string) => void;
}) {
  const [hover, setHover] = useState<{ day: number; slot: number } | null>(null);

  const analysed = days.map(d => analyse(d.blocks, leadIds));
  // shade compared to the busiest slot of the whole week
  const peak = Math.max(
    0,
    ...analysed.flatMap(day => day.map(s => s.users.length)),
  );

  const todayKey = new Date().toLocaleDateString('en-CA');
  const hovered = hover ? analysed[hover.day][hover.slot] : null;

  return (
    <div style={{ background: '#fff', border: '1px solid #e6e9ee', borderRadius: 13, overflow: 'hidden' }}>
      {/* day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '62px repeat(7, 1fr)', borderBottom: '1px solid #e6e9ee', background: '#fafbfc' }}>
        <div />
        {days.map(d => {
          const isToday = d.key === todayKey;
          return (
            <button
              key={d.key}
              onClick={() => onSelectDay(d.key)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '9px 4px', textAlign: 'center' }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a93a0' }}>
                {WEEKDAYS[d.date.getDay()]}
              </div>
              <div style={{ marginTop: 3, fontSize: 14, fontWeight: 700, color: isToday ? '#fff' : '#1d2733', background: isToday ? ACCENT : 'transparent', width: 25, height: 25, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {d.date.getDate()}
              </div>
              {d.bookings > 0 && (
                <div style={{ marginTop: 2, fontSize: 10.5, fontWeight: 700, color: '#1E7A44' }}>
                  {d.bookings} booked
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* slot grid */}
      <div style={{ padding: '6px 0' }}>
        {ALL_SLOTS.map(i => {
          const onHour = slotStartMin(i) % 60 === 0;
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '62px repeat(7, 1fr)', alignItems: 'stretch' }}>
              <div style={{ fontSize: 10.5, color: '#9aa3ad', textAlign: 'right', paddingRight: 8, lineHeight: '15px', fontVariantNumeric: 'tabular-nums' }}>
                {onHour ? label12(slotStartMin(i)) : ''}
              </div>

              {days.map((d, dayIndex) => {
                const info = analysed[dayIndex][i];
                const count = info.users.length;
                const isHovered = hover?.day === dayIndex && hover?.slot === i;

                return (
                  <div
                    key={d.key}
                    onMouseEnter={() => setHover({ day: dayIndex, slot: i })}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => onSelectDay(d.key)}
                    title={count === 0
                      ? 'Nobody free'
                      : `${label12(slotStartMin(i))} - ${label12(slotStartMin(i) + SLOT_MIN)} · ${info.users.map(nameOf).map(shortName).join(', ')}${info.staffable ? '' : ' - no full hour with a lead'}`}
                    style={{
                      height: 15,
                      margin: '0 2px',
                      marginTop: onHour ? 2 : 0,
                      borderRadius: 3,
                      cursor: 'pointer',
                      background: shade(count, peak, info.staffable),
                      outline: isHovered ? `2px solid ${ACCENT}` : 'none',
                      outlineOffset: -1,
                    }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      {/* hover details */}
      <div style={{ borderTop: '1px solid #eef1f3', padding: '10px 14px', minHeight: 42, background: '#fafbfc', fontSize: 12.5, color: '#6b7585' }}>
        {hover && hovered ? (
          hovered.users.length === 0 ? (
            <span style={{ color: '#9aa3ad' }}>
              {WEEKDAYS[days[hover.day].date.getDay()]} {label12(slotStartMin(hover.slot))} - nobody free
            </span>
          ) : (
            <>
              <strong style={{ color: '#1d2733' }}>
                {WEEKDAYS[days[hover.day].date.getDay()]} {label12(slotStartMin(hover.slot))}
              </strong>
              {' · '}
              {hovered.users.map(nameOf).map(shortName).join(', ')}
              {!hovered.staffable && (
                <span style={{ color: '#9A6A00', fontWeight: 600 }}>
                  {' - '}
                  {hovered.users.some(id => leadIds.has(id))
                    ? `never ${MIN_PEOPLE} for a full hour`
                    : 'nobody who can lead'}
                </span>
              )}
            </>
          )
        ) : (
          <span style={{ color: '#aab2ba' }}>
            Hover a slot for names. Purple means a workshop could run then;
            grey means people are free but it isn’t staffable.
          </span>
        )}
      </div>
    </div>
  );
}
