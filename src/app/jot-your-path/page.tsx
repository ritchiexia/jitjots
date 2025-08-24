import jotyourpathHeroPic from "public/images/jotyourpath.png";
import Image from "next/image";

import { Calendar, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IBM_Plex_Mono } from "next/font/google";
import { cn } from "@/lib/utils";

const ibmPlexMono = IBM_Plex_Mono({ weight: "700", subsets: ["latin"] });

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="relative h-full rounded-2xl border border-gray-300 bg-gray-50 px-6 pt-12 pb-5 text-center shadow-sm">
      <div className="absolute -top-6 left-1/2 -translate-x-1/2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-300 ring-4 ring-gray-50 shadow">
          <Icon className="h-6 w-6 text-black" aria-hidden="true" />
        </div>
      </div>

      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-extrabold tracking-tight text-black">
        {value}
      </div>
    </div>
  );
}

function DetailsRow() {
  return (
    // mt-10 issue
    <div className="mt-10"> 
      <div className="grid gap-4 md:grid-cols-3 md:items-stretch">
        <InfoCard icon={Calendar} label="Date" value="April 3, 2025" />
        <InfoCard icon={Clock} label="Time" value="6:30 PM – 8:30 PM" />
        <InfoCard icon={MapPin} label="Location" value="Zoom (Virtual)" />
      </div>
    </div>
  );
}

export default function JotYourPath() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-20 lg:px-32">
      <div className="container pt-10 sm:pt-16 space-y-24">
        <div className="space-y-16">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div className="space-y-4">
              <h2 className="text-4xl font-extrabold tracking-tight scroll-m-20 lg:text-6xl">
                Jot Your Path
              </h2>
              <p className="text-xl text-muted-foreground">
                Jot Your Path is a <b>panel discussion</b> that facilitates conversation
                and future planning between young adults in various careers and high school
                students.
              </p>
              <div className="mt-10">
                <DetailsRow />
              </div>

              <Button
                className={cn(
                  ibmPlexMono.className,
                  "h-12 text-lg bg-yellow-400 hover:bg-yellow-500 text-black"
                )}
              >
                RSVP
              </Button>
            </div>

            <Image
              src={jotyourpathHeroPic}
              alt="Jot Your Path Hero"
              placeholder="blur"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
