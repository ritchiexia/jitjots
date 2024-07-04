import { Facebook, Instagram, Mailbox, Music2, Youtube } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <div className="bg-primary text-gray-50 py-8 mt-8">
      <div className="container mx-auto px-4 md:px-6 flex flex-col gap-4 md:flex-row items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="https://www.youtube.com/@JitJotsEducation">
            <Youtube />
          </Link>
          <Link href="https://www.tiktok.com/@jitjotsofficial">
            <Music2 />
          </Link>
          <Link href="https://www.instagram.com/jitjotsofficial/">
            <Instagram />
          </Link>
          <Link href="mailto:mailto:jitjotsactivities@gmail.com">
            <Mailbox />
          </Link>
          <Link href="https://www.facebook.com/jitjotsactivities/">
            <Facebook />
          </Link>
        </div>
        <p className="text-sm">Jit Jots 2024</p>
      </div>
    </div>
  );
}
