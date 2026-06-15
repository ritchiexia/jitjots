'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Kalam, IBM_Plex_Mono } from 'next/font/google';
import { MenuIcon, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
const ibmPlexMono = IBM_Plex_Mono({ weight: '700', subsets: ['latin'] });
const kalam = Kalam({ weight: '700', subsets: ['latin'] });

export default function NewNavBar() {
  return (
    <header className="w-full sticky top-0 z-50 bg-white shadow-sm">
      {/* Main Navigation Bar - Background is Purple */}
      <div className="bg-[hsl(var(--primary))]">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          {/* MOBILE VIEW */}
          <div className="lg:hidden flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/jitjots.svg"
                height={50}
                width={50}
                alt="Jit Jots logo"
                priority
              />
              <h1 className={cn('text-white text-xl', kalam.className)}>
                JIT JOTS
              </h1>
            </Link>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MenuIcon className="h-6 w-6 text-white" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="grid gap-2 py-6">
                  <Accordion type="single" collapsible>
                    {/* HOME (Mobile) */}
                    <div className="border-b py-4">
                      <SheetClose asChild>
                        <Link
                          href="/"
                          className={cn(
                            ibmPlexMono.className,
                            'block text-base font-bold text-gray-900 hover:text-primary transition-colors',
                          )}
                        >
                          HOME
                        </Link>
                      </SheetClose>
                    </div>

                    {/* ABOUT (Mobile) */}
                    <AccordionItem value="item-2" className="border-b">
                      <AccordionTrigger
                        className={cn(
                          ibmPlexMono.className,
                          'text-base font-bold text-gray-900 hover:text-primary no-underline hover:no-underline',
                        )}
                      >
                        ABOUT
                      </AccordionTrigger>
                      <AccordionContent className="pl-4 flex flex-col gap-2">
                        {/* Mission (Mobile) */}
                        {/* <SheetClose asChild>
                                                    <Link href="/about/mission" className="block py-2 text-sm text-gray-700 hover:text-primary">
                                                        Mission / Purpose
                                                    </Link>
                                                </SheetClose> */}

                        {/* Meet the Team (Mobile) */}
                        <SheetClose asChild>
                          <Link
                            href="/about/team"
                            className="block py-2 text-sm text-gray-700 hover:text-primary"
                          >
                            Meet the Team
                          </Link>
                        </SheetClose>

                        {/* Partners (Mobile) */}
                        {/* <SheetClose asChild>
                                                    <Link href="/about/partners" className="block py-2 text-sm text-gray-700 hover:text-primary">
                                                        Our Partners
                                                    </Link>
                                                </SheetClose> */}
                      </AccordionContent>
                    </AccordionItem>

                    {/* EVENTS (Mobile) */}
                    <AccordionItem value="item-3" className="border-b">
                      <AccordionTrigger
                        className={cn(
                          ibmPlexMono.className,
                          'text-base font-bold text-gray-900 hover:text-primary no-underline hover:no-underline',
                        )}
                      >
                        EVENTS
                      </AccordionTrigger>
                      <AccordionContent className="pl-4 flex flex-col gap-2">
                        {/* Workshops (Mobile) */}
                        <SheetClose asChild>
                          <Link
                            href="/events/workshops"
                            className="block py-2 text-sm text-gray-700 hover:text-primary"
                          >
                            Workshops
                          </Link>
                        </SheetClose>

                        {/* Worksheets (Mobile) */}
                        <SheetClose asChild>
                          <Link
                            href="/events/worksheets"
                            className="block py-2 text-sm text-gray-700 hover:text-primary"
                          >
                            Worksheets
                          </Link>
                        </SheetClose>

                        {/* Jot your path (Mobile) */}
                        {/* <SheetClose asChild>
                                                    <Link href="/events/jotyourpath" className="block py-2 text-sm text-gray-700 hover:text-primary">
                                                        Jot Your Path
                                                    </Link>
                                                </SheetClose> */}
                      </AccordionContent>
                    </AccordionItem>

                    {/* GET INVOLVED (Mobile) */}
                    <AccordionItem value="item-4" className="border-b">
                      <AccordionTrigger
                        className={cn(
                          ibmPlexMono.className,
                          'text-base font-bold text-gray-900 hover:text-primary no-underline hover:no-underline',
                        )}
                      >
                        GET INVOLVED
                      </AccordionTrigger>
                      <AccordionContent className="pl-4 flex flex-col gap-2">
                        {/* Volunteers (Mobile) */}
                        <SheetClose asChild>
                          <Link
                            href="/get-involved/volunteers"
                            className="block py-2 text-sm text-gray-700 hover:text-primary"
                          >
                            Volunteers
                          </Link>
                        </SheetClose>

                        {/* Contact Us (Mobile) */}
                        {/* <SheetClose asChild>
                                                    <Link href="/get-involved/contact" className="block py-2 text-sm text-gray-700 hover:text-primary">
                                                        Contact Us
                                                    </Link>
                                                </SheetClose> */}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* DESKTOP VIEW */}
          <div className="hidden lg:flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/jitjots.svg"
                height={60}
                width={60}
                alt="Jit Jots logo"
                priority
              />
              <h1 className={cn('text-white text-3xl', kalam.className)}>
                JIT JOTS
              </h1>
            </Link>

            <nav className="flex items-center gap-1">
              {/* HOME */}
              <Link
                href="/"
                className="px-4 py-2 text-base font-semibold text-white hover:bg-white/20 transition-colors rounded-md"
              >
                Home
              </Link>

              {/* ABOUT */}
              <div className="relative group/about">
                <button className="flex items-center gap-1 px-4 py-2 text-base font-semibold text-white group-hover/about:bg-white/20 transition-colors rounded-md">
                  About{' '}
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 group-hover/about:rotate-180" />
                </button>
                <div className="absolute top-full left-0 pt-1 hidden group-hover/about:block z-50">
                  <div className="bg-white rounded-md border shadow-lg p-2 min-w-[200px]">
                    {/* <Link href="/about/mission" className="block px-3 py-2 text-sm text-gray-800 hover:bg-slate-100 rounded-md">Mission / Purpose</Link> */}
                    <Link
                      href="/about/team"
                      className="block px-3 py-2 text-sm text-gray-800 hover:bg-slate-100 rounded-md"
                    >
                      Meet the Team
                    </Link>
                  </div>
                </div>
              </div>

              {/* EVENTS */}
              <div className="relative group/events">
                <button className="flex items-center gap-1 px-4 py-2 text-base font-semibold text-white group-hover/events:bg-white/20 transition-colors rounded-md">
                  Events{' '}
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 group-hover/events:rotate-180" />
                </button>
                <div className="absolute top-full left-0 pt-1 hidden group-hover/events:block z-50">
                  <div className="bg-white rounded-md border shadow-lg p-2 min-w-[200px]">
                    <Link
                      href="/events/workshops"
                      className="block px-3 py-2 text-sm text-gray-800 hover:bg-slate-100 rounded-md"
                    >
                      Workshops
                    </Link>
                    <Link
                      href="/events/worksheets"
                      className="block px-3 py-2 text-sm text-gray-800 hover:bg-slate-100 rounded-md"
                    >
                      Worksheets
                    </Link>
                    {/* <Link href="/events/jotyourpath" className="block px-3 py-2 text-sm text-gray-800 hover:bg-slate-100 rounded-md">Jot Your Path</Link> */}
                  </div>
                </div>
              </div>

              {/* GET INVOLVED */}
              <div className="relative group/involved">
                <button className="flex items-center gap-1 px-4 py-2 text-base font-semibold text-white group-hover/involved:bg-white/20 transition-colors rounded-md">
                  Get Involved{' '}
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 group-hover/involved:rotate-180" />
                </button>
                <div className="absolute top-full left-0 pt-1 hidden group-hover/involved:block z-50">
                  <div className="bg-white rounded-md border shadow-lg p-2 min-w-[200px]">
                    <Link
                      href="/get-involved/volunteers"
                      className="block px-3 py-2 text-sm text-gray-800 hover:bg-slate-100 rounded-md"
                    >
                      Volunteers
                    </Link>
                    {/* <Link href="/get-involved/contact" className="block px-3 py-2 text-sm text-gray-800 hover:bg-slate-100 rounded-md">Contact Us</Link> */}
                  </div>
                </div>
              </div>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
