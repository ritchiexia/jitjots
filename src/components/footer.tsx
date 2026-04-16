'use client';

import { Facebook, Instagram, Mailbox, Music2, Youtube } from 'lucide-react';
import Link from 'next/link';
import { useGoogleForm } from '@/hooks/use-google-form';
import { toast } from 'sonner';

const NEWSLETTER_SIGNUP_GOOGLE_FORM_CONFIG = {
  formId: '1gnom2BmmLB0dWQAmV80kQJ_DrqIj3zKKj_S5kMzzO68',
  entryIds: {
    email: 'entry.2133646784',
  },
};

export default function Footer() {
  const { isSubmitting, submitForm, resetForm } = useGoogleForm(
    NEWSLETTER_SIGNUP_GOOGLE_FORM_CONFIG,
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;

    try {
      await submitForm({ email });
      toast.success('Subscribed to newsletter!');
      (e.target as HTMLFormElement).reset();
      resetForm();
    } catch (error) {
      toast.error('Failed to subscribe to newsletter.');
    }
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
