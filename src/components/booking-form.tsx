'use client';

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChevronRight, CircleCheck, X } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BookingCalendar, fmtLabel } from '@/components/booking-date-picker';
// shared time slots, also used by the admin bookings page
import {
  MAX_MINUTES,
  MAX_MONTHS_AHEAD,
  endSlotsFor,
  hhmm,
  label12,
  toMinutes,
} from '@/lib/booking-times';
import { eachDate } from '@/lib/availability';
import {
  MAX_KIDS,
  type StaffBlock,
  blocksByDay,
  coverage,
  isStaffed,
  openStarts,
  staffNeeded,
} from '@/lib/staffing';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// shared input style
const fieldClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

// workshop topics. "Other" shows a text box.
const TOPICS = ['Forensics', '3D Printing', 'Space', 'Reactions', 'Inventors and Engineers', 'Other'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// date as YYYY-MM-DD in local time
function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// last bookable day as YYYY-MM-DD, kept inside the target month
function maxBookableDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + MAX_MONTHS_AHEAD;
  const lastDay = new Date(y, m + 1, 0).getDate();
  return dayKey(new Date(y, m, Math.min(now.getDate(), lastDay)));
}

function ContactLink() {
  return (
    <a href="/contact" className="underline underline-offset-2 hover:text-foreground">
      get in touch
    </a>
  );
}

// "BOOK NOW" dialog. saves a Pending booking.
export default function BookingForm({
  buttonClassName,
}: {
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // confirmation shown after submitting
  const [confirmed, setConfirmed] = useState(false);

  const [org, setOrg] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [ages, setAges] = useState('');
  const [kidsCount, setKidsCount] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [topic, setTopic] = useState('');
  const [topicOther, setTopicOther] = useState('');
  const [attempted, setAttempted] = useState(false);

  // booked dates, disabled in the picker
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());
  // staff free hours, with no names
  const [staffBlocks, setStaffBlocks] = useState<StaffBlock[]>([]);

  // worked out on each open so it stays current
  const maxDate = useMemo(maxBookableDate, []);

  // load booked dates and staff hours when the dialog opens
  useEffect(() => {
    if (!open) return;
    setOrg('');
    setContactName('');
    setEmail('');
    setAges('');
    setKidsCount('');
    setNotes('');
    setDate('');
    setStartTime('');
    setEndTime('');
    setTopic('');
    setTopicOther('');
    setAttempted(false);
    supabase.rpc('get_booked_dates').then(({ data }) => {
      setBookedDates(new Set((data ?? []).map((r: { requested_date: string }) => r.requested_date)));
    });
    supabase.rpc('get_staff_blocks', { from_date: dayKey(new Date()), to_date: maxDate }).then(({ data }) => {
      setStaffBlocks((data ?? []) as StaffBlock[]);
    });
  }, [open, maxDate]);

  const staffByDay = useMemo(() => blocksByDay(staffBlocks), [staffBlocks]);

  // booked days and days without enough staff
  const disabledDates = useMemo(() => {
    const out = new Set(bookedDates);
    for (const d of eachDate(dayKey(new Date()), maxDate)) {
      if (!openStarts(staffByDay.get(d) ?? []).length) out.add(d);
    }
    return out;
  }, [bookedDates, staffByDay, maxDate]);

  const dayBlocks = useMemo(() => staffByDay.get(date) ?? [], [staffByDay, date]);

  // start times with enough staff for at least a short session
  const startSlots = useMemo(() => (date ? openStarts(dayBlocks) : []), [date, dayBlocks]);

  // end times up to 2 hours, where staff cover the whole session
  const endSlots = useMemo(
    () => endSlotsFor(startTime).filter(t => isStaffed(dayBlocks, toMinutes(startTime), t)),
    [startTime, dayBlocks],
  );

  const topicValue = topic === 'Other' ? topicOther.trim() : topic;
  const kids = Number(kidsCount);
  const missing = {
    org: !org.trim(),
    contactName: !contactName.trim(),
    email: !email.trim() || !EMAIL_RE.test(email.trim()),
    ages: !ages.trim(),
    kids: !kidsCount || !Number.isFinite(kids) || kids < 1,
    date: !date,
    topic: !topicValue,
    startTime: !startTime,
    endTime: !endTime,
  };
  const formComplete = !Object.values(missing).some(Boolean);

  // group too big to book online
  const tooBig = !missing.kids && kids > MAX_KIDS;

  // not enough staff for this group size at the chosen time
  const shortage = useMemo(() => {
    if (tooBig || missing.kids || !date || !startTime || !endTime) return null;
    const need = staffNeeded(kids);
    const have = coverage(dayBlocks, toMinutes(startTime), toMinutes(endTime));
    return have.staff >= need.staff && have.leaders >= need.leaders ? null : { need, have };
  }, [tooBig, missing.kids, kids, date, startTime, endTime, dayBlocks]);

  function boxClass(bad: boolean) {
    return cn(fieldClass, attempted && bad && 'border-red-500 ring-2 ring-red-200');
  }

  function Star() {
    return <span className="text-red-500" aria-hidden> *</span>;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAttempted(true);

    if (!formComplete) {
      toast.error('Please fill in every required field.', { position: 'top-center' });
      return;
    }
    const emailValue = email.trim();
    if (!EMAIL_RE.test(emailValue)) {
      toast.error('Please enter a valid email address.', { position: 'top-center' });
      return;
    }
    // double check the 2 hour limit
    if (toMinutes(endTime) - toMinutes(startTime) > MAX_MINUTES) {
      toast.error('Workshops are booked in blocks of up to two hours.', { position: 'top-center' });
      return;
    }
    if (tooBig) {
      toast.error(`Groups over ${MAX_KIDS} can't be booked online. Please get in touch.`, { position: 'top-center' });
      return;
    }
    if (shortage) {
      toast.error('Not enough volunteers are free for a group this size. Please choose another time.', { position: 'top-center' });
      return;
    }
    // check the date wasn't booked while the form was open
    if (bookedDates.has(date)) {
      toast.error('That date was just booked - please choose another.', { position: 'top-center' });
      return;
    }
    if (date > maxDate) {
      toast.error('Please choose a date within the next two months.', { position: 'top-center' });
      return;
    }

    setSubmitting(true);

    // make the id here, since the public can't read bookings back
    const id = crypto.randomUUID();

    const { error } = await supabase.from('bookings').insert({
      id,
      org: org.trim(),
      contact_name: contactName.trim(),
      email: emailValue,
      age_group: ages.trim(),
      ages: ages.trim(),
      kids_count: kids,
      topic: topicValue,
      requested_date: date,
      start_time: startTime,
      end_time: endTime,
      requester_notes: notes.trim() || null,
      status: 'Pending',
    });

    setSubmitting(false);

    if (error) {
      // 42501 means the database refused it, usually because the time is no longer free
      const message = error.code === '42501'
        ? 'That time is no longer available. Please choose another.'
        : 'Something went wrong - please try again.';
      toast.error(message, { position: 'top-center' });
      return;
    }

    // send the confirmation email without waiting on it
    fetch('/api/email/booking-received', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {});

    setOpen(false);
    setConfirmed(true);
  }

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className={cn(
            'font-mono',
            'mt-4 text-lg h-12 tracking-wide',
            buttonClassName,
          )}
        >
          <ChevronRight className="-ml-2" strokeWidth={3} />
          BOOK NOW
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book a workshop</DialogTitle>
          <DialogDescription>
            Tell us a bit about your group and we’ll get back to you to confirm a
            date.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 pt-2" noValidate>
          <div className="grid gap-1.5">
            <label htmlFor="org" className="text-sm font-medium">
              Organization<Star />
            </label>
            <input
              id="org"
              value={org}
              onChange={e => setOrg(e.target.value)}
              placeholder="School / community group name"
              className={boxClass(missing.org)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="contact_name" className="text-sm font-medium">
                Your name<Star />
              </label>
              <input
                id="contact_name"
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                className={boxClass(missing.contactName)}
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email<Star />
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={boxClass(missing.email)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="ages" className="text-sm font-medium">
                Age<Star />
              </label>
              <input
                id="ages"
                type="text"
                value={ages}
                onChange={e => setAges(e.target.value)}
                placeholder="e.g. 8, 7-11, 13+"
                className={boxClass(missing.ages)}
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="kids_count" className="text-sm font-medium">
                Number of kids<Star />
              </label>
              <input
                id="kids_count"
                type="number"
                min={1}
                max={MAX_KIDS}
                value={kidsCount}
                onChange={e => setKidsCount(e.target.value)}
                className={boxClass(missing.kids || tooBig)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="requester_notes" className="text-sm font-medium">
              Notes
              <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
            </label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Share any extra details that would help us prepare for your booking.
            </p>
            <textarea
              id="requester_notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Anything else we should know"
              className={cn(fieldClass, 'min-h-[72px] resize-y')}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-[1fr_268px]">
            <div className="grid content-start gap-4">
              <div className="grid gap-1.5">
                <span className="text-sm font-medium">Date<Star /></span>
                <p className={cn('text-sm', date ? 'font-medium' : 'text-muted-foreground')}>
                  {date ? fmtLabel(date) : 'Pick a date from the calendar'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Up to two months ahead. Greyed-out days are already booked or have no volunteers free.
                </p>
              </div>
            </div>

            <div className={cn('rounded-lg border p-3', attempted && missing.date ? 'border-red-500 ring-2 ring-red-200' : 'border-border')}>
              <BookingCalendar
                value={date}
                onChange={d => { setDate(d); setStartTime(''); setEndTime(''); }}
                disabledDates={disabledDates}
                maxDate={maxDate}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="topic" className="text-sm font-medium">
              Workshop topic<Star />
            </label>
            <select
              id="topic"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className={boxClass(missing.topic)}
            >
              <option value="" disabled>
                Select a topic
              </option>
              {TOPICS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {topic === 'Other' && (
              <input
                value={topicOther}
                onChange={e => setTopicOther(e.target.value)}
                placeholder="Tell us what you’d like"
                className={cn(boxClass(missing.topic), 'mt-1.5')}
              />
            )}
          </div>

          <div className="grid gap-1.5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label htmlFor="start_time" className="text-sm font-medium">
                  Start time<Star />
                </label>
                <select
                  id="start_time"
                  value={startTime}
                  onChange={e => { setStartTime(e.target.value); setEndTime(''); }}
                  disabled={!date}
                  className={boxClass(missing.startTime)}
                >
                  <option value="" disabled>{date ? 'Select' : 'Pick a date first'}</option>
                  {startSlots.map(t => (
                    <option key={t} value={hhmm(t)}>{label12(t)}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="end_time" className="text-sm font-medium">
                  End time<Star />
                </label>
                <select
                  id="end_time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  disabled={!startTime}
                  className={boxClass(missing.endTime)}
                >
                  <option value="" disabled>Select</option>
                  {endSlots.map(t => (
                    <option key={t} value={hhmm(t)}>{label12(t)}</option>
                  ))}
                </select>
              </div>
            </div>

            {tooBig && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Groups over {MAX_KIDS} can’t be booked online. Please <ContactLink /> and
                we’ll plan it with you.
              </p>
            )}
            {shortage && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                A group of {kids} needs {shortage.need.staff} volunteers, including{' '}
                {shortage.need.leaders} who can lead. Only {shortage.have.staff} are free
                then, and {shortage.have.leaders} can lead. Try another time, or{' '}
                <ContactLink />.
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              Workshops run between 8 AM and 9 PM, with the latest session starting at
              7 PM, and are booked in blocks of up to two hours. Only times with
              volunteers free are shown. Need longer?{' '}
              <a href="/contact" className="underline underline-offset-2 hover:text-foreground">
                Get in touch
              </a>{' '}
              and we’ll arrange it with you directly.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              disabled={submitting || tooBig || !!shortage}
              className={cn('font-mono', 'tracking-wide')}
            >
              {submitting ? 'Sending…' : 'Send request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* confirmation shown after submitting, until closed */}
    {confirmed && (
      <div
        onClick={() => setConfirmed(false)}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      >
        <div
          onClick={e => e.stopPropagation()}
          className="relative flex max-w-md flex-col items-center gap-4 rounded-2xl bg-background px-10 py-9 text-center shadow-2xl"
        >
          <button
            type="button"
            onClick={() => setConfirmed(false)}
            aria-label="Close"
            className={cn(
              'absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground',
              'transition-colors hover:bg-accent hover:text-foreground',
            )}
          >
            <X className="h-5 w-5" />
          </button>
          <CircleCheck className="h-16 w-16 text-primary" strokeWidth={1.75} />
          <p className="text-3xl font-semibold">Booking request sent!</p>
          <p className="text-xl text-muted-foreground">We’ll be in touch soon.</p>
        </div>
      </div>
    )}
    </>
  );
}
