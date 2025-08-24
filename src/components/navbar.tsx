"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Kalam } from "next/font/google";
import { IBM_Plex_Mono } from "next/font/google";

import { MenuIcon } from "lucide-react";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ibmPlexMono = IBM_Plex_Mono({ weight: "700", subsets: ["latin"] });
const kalam = Kalam({ weight: "700", subsets: ["latin"] });

const routes = [
  {
    title: "HOME",
    path: "/",
  },
  {
    title: "ABOUT",
    path: "/about",
  },
  {
    title: "WORKSHOPS",
    path: "/workshops",
  },
  {
    title: "WORKSHEETS",
    path: "/worksheets",
  },
  {
    title: "VOLUNTEERS",
    path: "/volunteers",
  },
  {
    title: "JOT YOUR PATH",
    path: "/jot-your-path",
  }
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="flex h-16 w-full shrink-0 items-center px-4 md:px-6 sticky top-0 z-50 bg-primary border-b">
      <div className="lg:hidden flex items-center justify-between grow">
        <Link href="/">
          <Image
            src="/jitjots.svg"
            height={70}
            width={70}
            alt="Jit Jots logo"
            priority
          />
        </Link>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <MenuIcon className="h-6 w-6" color="white" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <div className="grid gap-2 py-6">
              {routes.map((route) => (
                <SheetClose key={route.path} asChild>
                  <Link
                    href={route.path}
                    className={cn(
                      ibmPlexMono.className,
                      "flex w-full items-center py-2 text-lg font-bold"
                    )}
                  >
                    {route.title}
                  </Link>
                </SheetClose>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <Link href="/" className="mr-6 hidden lg:flex items-center">
        <Image
          src="/jitjots.svg"
          height={70}
          width={70}
          alt="Jit Jots logo"
          priority
        />
        <h1 className={cn("text-gray-50 text-3xl", kalam.className)}>
          JIT JOTS
        </h1>
      </Link>
      <nav className="ml-auto hidden lg:flex gap-2">
        {routes.map((route) => (
          <Link
            href={route.path}
            key={route.path}
            prefetch={false}
            className={cn(
              "group text-secondary inline-flex h-9 w-max items-center justify-center rounded-md px-4 py-2 text-xl transition-colors hover:bg-secondary hover:text-primary focus:outline-none disabled:pointer-events-none disabled:opacity-50",
              ibmPlexMono.className,
              pathname === route.path
                ? "underline underline-offset-2 decoration-wavy"
                : ""
            )}
          >
            {route.title}
          </Link>
        ))}
      </nav>
    </header>
  );
}
