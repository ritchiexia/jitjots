'use client';

/** Day view showing how many people are free in each 30 minute slot. */

import { useState } from 'react';
import {
  ALL_SLOTS,
  SLOT_MIN,
  concurrencyBySlot,
  label12,
  shortName,
  slotStartMin,
  usersBySlot,
  type AvailabilityBlock,
} from '@/lib/availability';

const ACCENT = 'hsl(270, 8%, 49%)';

// shade each slot compared to the busiest slot of the day
function shade(count: number, peak: number) {
  if (count === 0) return '#f7f8fa';
  const ratio = peak > 0 ? count / peak : 0;
  return `color-mix(in srgb, ${ACCENT} ${Math.round(18 + ratio * 72)}%, white)`;
}

export default function DayHeatmap({
  blocks,
  nameOf,
}: {
  blocks: AvailabilityBlock[];
  nameOf: (userId: string) => string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const counts = concurrencyBySlot(blocks);
  const people = usersBySlot(blocks);
  const peak = Math.max(0, ...counts);

  if (blocks.length === 0) {
    return (
      <div style={{ fontSize: 13.5, color: '#8a93a0', lineHeight: 1.6, padding: '8px 0' }}>
        Nobody has entered availability for this day.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {ALL_SLOTS.map(i => {
        const count = counts[i];
        const start = slotStartMin(i);
        const isHovered = hovered === i;

        return (
          <div
            key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ display: 'flex', alignItems: 'stretch', gap: 10, position: 'relative' }}
          >
            <div style={{ width: 62, minWidth: 62, fontSize: 11.5, color: '#9aa3ad', paddingTop: 5, textAlign: 'right' }}>
              {/* label on the hour only */}
              {start % 60 === 0 ? label12(start) : ''}
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 24,
                borderRadius: 5,
                background: shade(count, peak),
                border: isHovered ? `1px solid ${ACCENT}` : '1px solid transparent',
                display: 'flex',
                alignItems: 'center',
                padding: '0 9px',
                fontSize: 12,
                fontWeight: 600,
                color: count > 0 ? '#2c2634' : '#c3c9d0',
                cursor: count > 0 ? 'default' : undefined,
                transition: 'border-color .1s',
                gap: 6,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              {/* show names instead of just a count */}
              {count > 0 && (
                <>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {people[i].slice(0, 2).map(id => shortName(nameOf(id))).join(', ')}
                  </span>
                  {count > 2 && (
                    <span style={{ color: '#6b6478', fontWeight: 500 }}>
                      +{count - 2}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* who's free, on hover */}
            {isHovered && count > 0 && (
              <div
                // shown below the row so it stays on screen
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 'calc(100% + 4px)',
                  zIndex: 20,
                  background: '#221d28',
                  color: '#fff',
                  borderRadius: 8,
                  padding: '8px 11px',
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  boxShadow: '0 6px 20px -6px rgba(0,0,0,.4)',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ color: '#b9b2c4', marginBottom: 3 }}>
                  {label12(start)} - {label12(start + SLOT_MIN)}
                </div>
                {people[i].map(id => (
                  <div key={id}>{nameOf(id)}</div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
