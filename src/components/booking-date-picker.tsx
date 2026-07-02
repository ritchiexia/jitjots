'use client';

// Calendar picker where `disabledDates` (booked days) and past dates render
// greyed-out and unclickable. Plain Date math + Radix popover, no date library.

import * as React from 'react';
import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Local YYYY-MM-DD key — avoids UTC shifting the day near midnight.
function dateKey(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// "2026-07-12" → "Jul 12, 2026"
function fmtLabel(iso: string) {
  const [y, m, d] = iso.split('-');
  const short = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${short[+m - 1]} ${+d}, ${y}`;
}

export default function BookingDatePicker({
  value,
  onChange,
  disabledDates,
  className,
  style,
  id,
}: {
  value: string;                 // selected date as YYYY-MM-DD, or '' if none
  onChange: (v: string) => void;
  disabledDates: Set<string>;    // booked dates to grey out
  className?: string;
  style?: React.CSSProperties;   // inline styles for the trigger (admin panel)
  id?: string;
}) {
  const [open, setOpen] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = dateKey(today);

  // Month currently shown in the popover — defaults to the selected date's month.
  const [viewDate, setViewDate] = useState(() => {
    const base = value ? new Date(value + 'T00:00:00') : today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  // 42-cell grid (6 weeks) starting on the Sunday on/before the 1st.
  const start = new Date(viewDate);
  start.setDate(1 - viewDate.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  // Can't page earlier than the current month (nothing bookable back there).
  const atCurrentMonth =
    viewDate.getFullYear() === today.getFullYear() &&
    viewDate.getMonth() === today.getMonth();

  function isDisabled(d: Date) {
    return d < today || disabledDates.has(dateKey(d));
  }

  function pick(d: Date) {
    onChange(dateKey(d));
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button id={id} type="button" style={style} className={cn('flex items-center justify-between text-left', className)}>
          <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
            {value ? fmtLabel(value) : 'Select a date'}
          </span>
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-[60] w-[268px] rounded-lg border border-border bg-background p-3 shadow-lg"
        >
          {/* Month header + nav */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              disabled={atCurrentMonth}
              onClick={() => setViewDate(p => new Date(p.getFullYear(), p.getMonth() - 1, 1))}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-sm font-semibold">
              {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </div>
            <button
              type="button"
              onClick={() => setViewDate(p => new Date(p.getFullYear(), p.getMonth() + 1, 1))}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map(w => (
              <div key={w} className="py-1 text-center text-[11px] font-medium text-muted-foreground">{w}</div>
            ))}

            {/* Day cells */}
            {cells.map(d => {
              const key = dateKey(d);
              const inMonth = d.getMonth() === viewDate.getMonth();
              const disabled = isDisabled(d);
              const selected = key === value;
              const isToday = key === todayKey;

              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(d)}
                  title={disabledDates.has(key) ? 'Already booked' : undefined}
                  className={cn(
                    'flex h-9 items-center justify-center rounded-md text-sm transition-colors',
                    !inMonth && 'text-muted-foreground/40',
                    disabled && 'cursor-not-allowed text-muted-foreground/40 line-through',
                    !disabled && !selected && 'hover:bg-accent',
                    selected && 'bg-primary font-semibold text-primary-foreground hover:bg-primary',
                    isToday && !selected && 'font-semibold text-primary',
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
