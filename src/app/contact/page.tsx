import { Facebook, Instagram, Music2, Youtube, Send, Mail } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IBM_Plex_Mono } from "next/font/google";

const ibmPlexMono = IBM_Plex_Mono({ weight: "700", subsets: ["latin"] });

const inputClass =
  "w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const socialLinks = [
  { icon: Facebook,  label: "Facebook",  href: "https://www.facebook.com/jitjotsactivities/" },
  { icon: Instagram, label: "Instagram", href: "https://www.instagram.com/jitjotsofficial/" },
  { icon: Music2,    label: "TikTok",    href: "https://www.tiktok.com/@jitjotsofficial" },
  { icon: Youtube,   label: "YouTube",   href: "https://www.youtube.com/@JitJotsEducation" },
];

const contacts = [
  { name: "Sean Dang",     role: "Co-President",        note: "For general inquiries" },
  { name: "Dean Yoo",      role: "Co-President",        note: "For general inquiries" },
  { name: "Sheridan Dang", role: "Marketing Team Lead", note: "For workshop inquiries" },
];

export default function ContactPage() {
  return (
    <main className="flex-1 container mx-auto px-6 lg:px-32 py-12">
      <div className="mb-8">
        <h2 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Contact Us</h2>
        <p className="mt-2 text-lg text-muted-foreground">
          For any inquiries, fill out the form and we&apos;ll be in touch shortly.
        </p>
      </div>
      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="rounded-2xl border bg-card p-7 shadow-sm">
          <h3 className="text-xl font-extrabold tracking-tight mb-6">Contact Form</h3>
          <form className="space-y-4">

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Your Name <span className="text-destructive">*</span></label>
                <input type="text" placeholder="Jane Smith" className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Your Email <span className="text-destructive">*</span></label>
                <input type="email" placeholder="jane@example.com" className={inputClass} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Subject <span className="text-destructive">*</span></label>
              <input type="text" placeholder="Workshop inquiry" className={inputClass} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Message <span className="text-destructive">*</span></label>
              <textarea rows={6} placeholder="Tell us about your inquiry..." className={`${inputClass} resize-none`} />
            </div>

            <Button type="submit" className={`${ibmPlexMono.className} h-11 px-8 gap-2 w-fit`}>
              <Send className="w-4 h-4" strokeWidth={2.5} />
              SEND MESSAGE
            </Button>

          </form>
        </div>
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl bg-primary text-primary-foreground p-7">
            <div className="flex items-center gap-2 mb-5">
              <Mail className="w-4 h-4" />
              <h3 className="font-bold">Get in Touch</h3>
            </div>
            <div className="space-y-4">
              {contacts.map(({ name, role, note }, i) => (
                <div key={name} className={i > 0 ? "border-t border-primary-foreground/20 pt-4" : ""}>
                  <p className="font-bold text-sm">{name}</p>
                  <p className="text-xs text-primary-foreground/75 mt-0.5">{role}</p>
                  <p className="text-xs text-primary-foreground/55 mt-0.5">{note}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-7 shadow-sm">
            <h3 className="font-bold mb-4">Connect with Us</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {socialLinks.map(({ icon: Icon, label, href }) => (
                <Link
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-xl border border-input px-3 py-2.5 text-sm font-semibold hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}