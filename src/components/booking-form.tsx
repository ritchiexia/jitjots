'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChevronRight } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import BookingDatePicker from '@/components/booking-date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// Shared field styling.
const fieldClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

// "BOOK NOW" dialog — inserts a Pending row into the `bookings` table.
export default function BookingForm({
  buttonClassName,
}: {
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState('');
  // Taken dates (Pending/Confirmed) — greyed out in the picker.
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());

  // Refresh booked dates whenever the dialog opens. The RPC returns dates only
  // (no booking details) so the public site can't read submitters' info.
  useEffect(() => {
    if (!open) return;
    setDate('');
    supabase.rpc('get_booked_dates').then(({ data }) => {
      setBookedDates(new Set((data ?? []).map((r: { requested_date: string }) => r.requested_date)));
    });
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!date) {
      toast.error('Please pick a date for your workshop.');
      return;
    }
    // Guard against a race where the date got booked while the form was open.
    if (bookedDates.has(date)) {
      toast.error('That date was just booked — please choose another.');
      return;
    }

    setSubmitting(true);

    // Uncontrolled fields — read straight off the form via FormData.
    const data = new FormData(e.currentTarget);
    const { error } = await supabase.from('bookings').insert({
      org: String(data.get('org')).trim(),
      contact_name: String(data.get('contact_name')).trim(),
      email: String(data.get('email')).trim(),
      requested_date: date,
      age_group: String(data.get('age_group')),
      kids_count: Number(data.get('kids_count')),
      topic: String(data.get('topic')).trim(),
      status: 'Pending', // required by the anon insert policy; admins move it from there.
    });

    setSubmitting(false);

    if (error) {
      toast.error('Something went wrong — please try again.');
      return;
    }

    toast.success('Booking request sent! We’ll be in touch soon.');
    setOpen(false);
  }

  return (
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

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Book a workshop</DialogTitle>
          <DialogDescription>
            Tell us a bit about your group and we’ll get back to you to confirm a
            date.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 pt-2">
          <div className="grid gap-1.5">
            <label htmlFor="org" className="text-sm font-medium">
              Organization
            </label>
            <input
              id="org"
              name="org"
              required
              placeholder="School / community group name"
              className={fieldClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="contact_name" className="text-sm font-medium">
                Your name
              </label>
              <input
                id="contact_name"
                name="contact_name"
                required
                className={fieldClass}
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className={fieldClass}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="requested_date" className="text-sm font-medium">
                Preferred date
              </label>
              <BookingDatePicker
                id="requested_date"
                value={date}
                onChange={setDate}
                disabledDates={bookedDates}
                className={fieldClass}
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="kids_count" className="text-sm font-medium">
                Number of kids
              </label>
              <input
                id="kids_count"
                name="kids_count"
                type="number"
                min={1}
                required
                className={fieldClass}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="age_group" className="text-sm font-medium">
              Age group
            </label>
            <select
              id="age_group"
              name="age_group"
              required
              defaultValue=""
              className={fieldClass}
            >
              <option value="" disabled>
                Select an age group
              </option>
              <option value="Ages 5–7">Ages 5–7</option>
              <option value="Ages 8–10">Ages 8–10</option>
              <option value="Ages 11–13">Ages 11–13</option>
              <option value="Mixed">Mixed</option>
            </select>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="topic" className="text-sm font-medium">
              Workshop topic
            </label>
            <input
              id="topic"
              name="topic"
              required
              placeholder="e.g. Chemistry, Biology, Physics, Open to suggestions"
              className={fieldClass}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              disabled={submitting}
              className={cn('font-mono', 'tracking-wide')}
            >
              {submitting ? 'Sending…' : 'Send request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
