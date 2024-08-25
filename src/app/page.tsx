"use client";

import { IBM_Plex_Mono, Kalam } from "next/font/google";

import Testimonials from "@/components/testimonials";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import MainGrid from "@/components/main-grid";
import { ChevronRight } from "lucide-react";

const kalam = Kalam({ weight: "700", subsets: ["latin"] });
const ibmPlexMono = IBM_Plex_Mono({ weight: "700", subsets: ["latin"] });

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center px-4 lg:px-24 gap-20">
      <div className="container pt-10 sm:pt-24">
        <div className="grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center lg:px-16 min-h-96">
          <div className="my-auto">
            <h2
              className={cn(
                "text-4xl font-extrabold scroll-m-20 tracking-tight text-center sm:text-start lg:text-5xl",
                kalam.className
              )}
            >
              Instilling curiosity and wonder in scientists of the future ✨
            </h2>
            <div className="flex flex-wrap gap-2 mt-6 justify-center sm:justify-start">
              <Link href="/about">
                <Button
                  className={cn(
                    ibmPlexMono.className,
                    "text-lg h-12 [word-spacing:-0.5ch]"
                  )}
                >
                  <ChevronRight className="-ml-2" strokeWidth={3} />
                  ABOUT US
                </Button>
              </Link>
              <Link href="/workshops">
                <Button
                  variant="secondary"
                  className={cn(
                    ibmPlexMono.className,
                    "text-lg h-12 [word-spacing:-0.5ch]"
                  )}
                >
                  <ChevronRight className="-ml-2" strokeWidth={3} />
                  BOOK A WORKSHOP
                </Button>
              </Link>
            </div>
          </div>
          <Image
            src="/images/microscope.png"
            alt="Cartoon Microscope"
            width={500}
            height={500}
            priority
          />
        </div>
      </div>
      <div className="flex justify-center items-center relative py-24">
        <MainGrid />
        <div className="w-screen bg-primary absolute h-full z-0"></div>
      </div>
      <Testimonials />
    </main>
  );
}
