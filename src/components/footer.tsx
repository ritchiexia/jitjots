'use client';

import { Facebook, Instagram, Mailbox, Music2, Youtube } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function Footer() {
  // newsletter signup form. saves to supabase so it shows in the portal's newsletter tab.
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = String(new FormData(form).get('email')).trim();

    setIsSubmitting(true);
    const { error } = await supabase.from('newsletter_subscribers').insert({
      email,
      // must match the public insert policy
      status: 'subscribed',
      source: 'website',
    });
    setIsSubmitting(false);

    // 23505 means the email is already on the list. the message doesn't say
    // whether they are subscribed or unsubscribed.
    if (error?.code === '23505') {
      toast.success('That address is already on our list.', {
        description: 'If you unsubscribed before and want back in, email us and we’ll re-add you.',
      });
      form.reset();
      return;
    }

    if (error) {
      toast.error('Could not subscribe. Please try again later.');
      return;
    }

    toast.success('Subscribed to newsletter!');
    form.reset();
  };

  return (
    <footer className="bg-primary text-gray-50 w-full">
      <div className="w-full py-12 px-8 md:px-16 lg:px-32">
        <div className="flex flex-col gap-6 md:flex-row md:items-start justify-between">
          <nav className="flex gap-10 my-auto">
            <Link href="/about/team" className="hover:underline">
              Team
            </Link>
            <Link href="/events/workshops" className="hover:underline">
              Workshops
            </Link>
            <Link href="/contact" className="hover:underline">
              Contact Us
            </Link>
          </nav>

          <div>
            <p className="text-base font-semibold mb-3">
              Subscribe to our newsletter
            </p>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <label htmlFor="email" className="sr-only">
                Your Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Your Email"
                className="bg-white text-black px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-slate-300 hover:text-black transition-colors whitespace-nowrap"
                disabled={isSubmitting}
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
        <hr className="border-white/20 border-t my-8" />
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap items-center justify-between">
          <div className="flex items-center space-x-5">
            <Link
              href="https://www.youtube.com/@JitJotsEducation"
              className="hover:opacity-70 transition-opacity"
            >
              <Youtube size={22} />
            </Link>
            <Link
              href="https://www.tiktok.com/@jitjotsofficial"
              className="hover:opacity-70 transition-opacity"
            >
              <Music2 size={22} />
            </Link>
            <Link
              href="https://www.instagram.com/jitjotsofficial/"
              className="hover:opacity-70 transition-opacity"
            >
              <Instagram size={22} />
            </Link>
            <Link
              href="mailto:jitjotsactivities@gmail.com"
              className="hover:opacity-70 transition-opacity"
            >
              <Mailbox size={22} />
            </Link>
            <Link
              href="https://www.facebook.com/jitjotsactivities/"
              className="hover:opacity-70 transition-opacity"
            >
              <Facebook size={22} />
            </Link>
          </div>
          <div className="text-center text-white text-sm">
            <p>Business Number: 78523 8037 BC0001</p>
            <p>Registered under SOCIETIES ACT [SBC 2015] C.18</p>
          </div>
          <p className="text-sm text-center">
            © Jit Jots Science Education Society {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
}
