import { Mailbox } from "lucide-react";
import Link from "next/link";

function YoutubeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}

function TiktokIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="bg-primary text-gray-50 w-full">
      <div className="w-full py-10 px-8 md:px-16 lg:px-32">

        {/* Top row: nav links */}
        <div className="flex flex-wrap gap-8 mb-8">
          <Link href="/about/team" className="text-sm font-medium hover:text-white/70 transition-colors">
            Team
          </Link>
          <Link href="/events/workshops" className="text-sm font-medium hover:text-white/70 transition-colors">
            Workshops
          </Link>
          <Link href="mailto:jitjotsactivities@gmail.com" className="text-sm font-medium hover:text-white/70 transition-colors">
            Contact Us
          </Link>
        </div>

        <hr className="border-white/20 mb-8" />

        {/* Bottom row: social + business info + copyright */}
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="https://www.youtube.com/@JitJotsEducation">
              <YoutubeIcon />
            </Link>
            <Link href="https://www.tiktok.com/@jitjotsofficial">
              <TiktokIcon />
            </Link>
            <Link href="https://www.instagram.com/jitjotsofficial/">
              <InstagramIcon />
            </Link>
            <Link href="mailto:jitjotsactivities@gmail.com">
              <Mailbox />
            </Link>
            <Link href="https://www.facebook.com/jitjotsactivities/">
              <FacebookIcon />
            </Link>
          </div>
          <div className="text-center text-sm text-white/70">
            <p>Business Number: 78523 8037 BC0001</p>
            <p>Registered under SOCIETIES ACT [SBC 2015] C.18</p>
          </div>
          <p className="text-sm text-center">© Jit Jots Science Education Society {new Date().getFullYear()}</p>
        </div>

      </div>
    </footer>
  );
}
