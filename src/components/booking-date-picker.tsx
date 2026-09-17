'use client';

// calendar for picking a booking date. booked, past and too far ahead dates are disabled.

import * as React from 'react';
import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// local YYYY-MM-DD, so the day doesn't shift near midnight
function dateKey(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// "2026-07-12" → "Jul 12, 2026"
export function fmtLabel(iso: string) {
  const [y, m, d] = iso.split('-');
  const short = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${short[+m - 1]} ${+d}, ${y}`;
}

type CalendarProps = {
  /** Selected date as `"YYYY-MM-DD"`, or `''` if none. */
  value: string;
  onChange: (v: string) => void;
  /** Booked dates to grey out. */
  disabledDates: Set<string>;
  /** Latest bookable date. Omitted means no ceiling. */
  maxDate?: string;
  /** Fired after a successful pick, to close the popover. */
  onPick?: () => void;
};

export function BookingCalendar({
  value,
  onChange,
  disabledDates,
  maxDate,
  onPick,
}: CalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = dateKey(today);

  // month being shown, starts at the selected date's month
  const [viewDate, setViewDate] = useState(() => {
    const base = value ? new Date(value + 'T00:00:00') : today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  // 6 week grid starting on a Sunday
  const start = new Date(viewDate);
  start.setDate(1 - viewDate.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  // limit paging to the bookable months
  const atCurrentMonth =
    viewDate.getFullYear() === today.getFullYear() &&
    viewDate.getMonth() === today.getMonth();

  const max = maxDate ? new Date(maxDate + 'T00:00:00') : null;
  const atMaxMonth =
    !!max &&
    viewDate.getFullYear() === max.getFullYear() &&
    viewDate.getMonth() === max.getMonth();

  function isDisabled(d: Date) {
    if (d < today) return true;
    if (max && d > max) return true;
    return disabledDates.has(dateKey(d));
  }

  return (
    <>
      {/* month header and arrows */}
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
          disabled={atMaxMonth}
          onClick={() => setViewDate(p => new Date(p.getFullYear(), p.getMonth() + 1, 1))}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map(w => (
          <div key={w} className="py-1 text-center text-[11px] font-medium text-muted-foreground">{w}</div>
        ))}

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
              onClick={() => { onChange(key); onPick?.(); }}
              title={
                disabledDates.has(key)
                  ? 'Already booked'
                  : max && d > max
                    ? 'Bookings open two months ahead'
                    : undefined
              }
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
    </>
  );
}

export default function BookingDatePicker({
  value,
  onChange,
  disabledDates,
  maxDate,
  className,
  style,
  id,
}: CalendarProps & {
  className?: string;
  /** Styles for the date button in the admin panel. */
  style?: React.CSSProperties;
  id?: string;
}) {
  const [open, setOpen] = useState(false);

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
          <BookingCalendar
            value={value}
            onChange={onChange}
            disabledDates={disabledDates}
            maxDate={maxDate}
            onPick={() => setOpen(false)}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
