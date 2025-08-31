import jotyourpathHeroPic from "public/images/jotyourpath.png";
import Image from "next/image";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, MapPin, Book, User, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IBM_Plex_Mono } from "next/font/google";
import { cn } from "@/lib/utils";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const ibmPlexMono = IBM_Plex_Mono({ weight: "700", subsets: ["latin"] });

type InfoCard = {
  icon: React.ElementType;
  label: string;
  value: string;
};

function InfoCard({ icon: Icon, label, value }: InfoCard) {
  return (
    <div className="relative h-full rounded-md border-2 bg-gray-50 px-6 pt-12 pb-5 text-center">
      <div className="absolute -top-6 left-1/2 -translate-x-1/2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-300 ring-4 ring-gray-50 shadow">
          <Icon className="h-6 w-6 text-black" aria-hidden="true" />
        </div>
      </div>

      <div className="font-semibold text-gray-800">{label}</div>
      <div className="text-sm text-muted-foreground">
        {value}
      </div>
    </div>
  );
}

type PanelGuest = {
  name: string;
  role: string;
  img: string;
  fallback: string;
};

const panelGuests: PanelGuest[] = [
  {
    name: "Wesley Huang",
    role: "Senior Project Embedded Engineer",
    img: "/images/headshots/Wesley.png",
    fallback: "WH",
  },
  {
    name: "Daniel Yu",
    role: "UofT PhD Student Sick Kids",
    img: "/images/headshots/Daniel.png",
    fallback: "DY",
  },
  {
    name: "Ritchie Xia",
    role: "FrontEnd Software Developer",
    img: "/images/headshots/Ritchie.png",
    fallback: "RX",
  },
  {
    name: "Alyssa Kong",
    role: "UBC Medical Student",
    img: "/images/headshots/Alyssa.png",
    fallback: "AK",
  },
  {
    name: "Chris Fang",
    role: "UBC Geology Undergraduate",
    img: "/images/headshots/Chris.png",
    fallback: "CF",
  }
];

export default function JotYourPath() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-20">
      <div className="container pt-10 sm:pt-16 space-y-24 lg:px-32">
        <div className="space-y-16">
          <div className="grid md:grid-cols-2 md:items-center gap-8">
            <div className="space-y-10">
              <h2 className="text-4xl font-extrabold scroll-m-20 tracking-tight lg:text-6xl">
                Jot Your Path
              </h2>
              <p className="text-xl text-muted-foreground">
                Jot Your Path is a <b className="font-medium">panel discussion</b> that facilitates conversation
                and future planning between young adults in various careers and high school
                students.
              </p>

              <div>
                <div className="grid gap-4 md:grid-cols-3 md:items-stretch">
                  <InfoCard icon={Calendar} label="Date" value="April 3, 2025" />
                  <InfoCard icon={Clock} label="Time" value="6:30 PM – 8:30 PM" />
                  <InfoCard icon={MapPin} label="Location" value="Zoom (Virtual)" />
                </div>
              </div>

              <Button
                className={cn(
                  ibmPlexMono.className,
                  "mt-4 h-12 w-full text-lg bg-yellow-400 hover:bg-yellow-500 text-black [word-spacing:-0.5ch]"
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
      <div className="bg-gray-200 py-16 w-full">
        <div className="container mx-auto px-4 lg:px-32">
          <h3 className="text-4xl font-bold text-center mb-12">
            Takeaways
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="border-2 rounded-md p-6 bg-white text-center">
              <div className="flex justify-center items-center gap-3 mb-4">
                <Book className="h-8 w-8 text-gray-600" />
                <h4 className="text-xl font-semibold">Learn</h4>
              </div>
              <p className="text-gray-600">Young professionals share their post-high school journeys, career pivots, and key insights.</p>
            </div>
            <div className="border-2 rounded-md p-6 bg-white text-center">
              <div className="flex justify-center items-center gap-3 mb-4">
                <User className="h-8 w-8 text-gray-600" />
                <h4 className="text-xl font-semibold">Ask</h4>
              </div>
              <p className="text-gray-600">Interactive Q&A session where you can get specific advice about careers that interest you.</p>
            </div>
            <div className="border-2 rounded-md p-6 bg-white text-center">
              <div className="flex justify-center items-center gap-3 mb-4">
                <Pencil className="h-8 w-8 text-gray-600" />
                <h4 className="text-xl font-semibold">Jot</h4>
              </div>
              <p className="text-gray-600">Take notes and strategically plan your future path based on real experiences.</p>
            </div>
          </div>
        </div>
      </div>
      <div className="py-16 w-full">
        <div className="container mx-auto px-4 lg:px-32">
          <h3 className="text-4xl font-bold text-center mb-12">
            Meet Our Panel Guests
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {panelGuests.map((guest) => (
              <div key={guest.name} className="text-center">
                <Avatar className="w-32 h-32 mx-auto mb-4">
                  <AvatarImage src={guest.img} />
                  <AvatarFallback>{guest.fallback}</AvatarFallback>
                </Avatar>
                <h4 className="font-semibold">{guest.name}</h4>
                <p className="text-sm text-muted-foreground">{guest.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="py-16 w-full">
        <div className="container mx-auto px-4">
          <h3 className="text-4xl font-bold text-center mb-12">
            FAQ
          </h3>
          <div className="space-y-4">
            <Accordion type="single" collapsible>
              <AccordionItem value="question-1">
                <AccordionTrigger className="no-underline font-bold text-base hover:no-underline">
                  PlaceHolder Question?
                </AccordionTrigger>
                <AccordionContent className="text-gray-500">
                  PlaceHolder Answer.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <Accordion type="single" collapsible>
              <AccordionItem value="question-2">
                <AccordionTrigger className="no-underline font-bold text-base hover:no-underline">
                  PlaceHolder Question 2?
                </AccordionTrigger>
                <AccordionContent>
                  PlaceHolder Answer 2.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>
    </main>
  );
}