"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { Kalam, IBM_Plex_Mono } from "next/font/google"
import { MenuIcon, ChevronDown } from "lucide-react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"

import { cn } from "@/lib/utils"
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

const ibmPlexMono = IBM_Plex_Mono({ weight: "700", subsets: ["latin"] })
const kalam = Kalam({ weight: "700", subsets: ["latin"] })

export default function NewNavBar() {
    const [activeMenu, setActiveMenu] = React.useState<
        "about" | "events" | "involved" | null
    >(null)

    const closeTimer = React.useRef<NodeJS.Timeout | null>(null)

    const cancelClose = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current)
        closeTimer.current = null
    }

    const scheduleClose = () => {
        cancelClose()
        closeTimer.current = setTimeout(() => setActiveMenu(null), 150)
    }

    const createHoverHandlers = (menu: "about" | "events" | "involved") => ({
        onPointerEnter: () => {
            cancelClose()
            setActiveMenu(menu)
        },
        onPointerLeave: (e: React.PointerEvent<HTMLDivElement>) => {
            const next = e.relatedTarget as Node | null
            if (e.currentTarget.contains(next)) return
            scheduleClose()
        },
    })
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
                            <h1 className={cn("text-white text-xl", kalam.className)}>
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
                                                <Link href="/" className={cn(
                                                    ibmPlexMono.className,
                                                    "block text-base font-bold text-gray-900 hover:text-primary transition-colors"
                                                )}>
                                                    HOME
                                                </Link>
                                            </SheetClose>
                                        </div>

                                        {/* ABOUT (Mobile) */}
                                        <AccordionItem value="item-2" className="border-b">
                                            <AccordionTrigger className={cn(
                                                ibmPlexMono.className,
                                                "text-base font-bold text-gray-900 hover:text-primary no-underline hover:no-underline"
                                            )}>ABOUT</AccordionTrigger>
                                            <AccordionContent className="pl-4 flex flex-col gap-2">

                                                {/* Mission (Mobile) */}
                                                {/* <SheetClose asChild>
                                                    <Link href="/about/mission" className="block py-2 text-sm text-gray-700 hover:text-primary">
                                                        Mission / Purpose
                                                    </Link>
                                                </SheetClose> */}

                                                {/* Meet the Team (Mobile) */}
                                                <SheetClose asChild>
                                                    <Link href="/about/team" className="block py-2 text-sm text-gray-700 hover:text-primary">
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
                                            <AccordionTrigger className={cn(
                                                ibmPlexMono.className,
                                                "text-base font-bold text-gray-900 hover:text-primary no-underline hover:no-underline"
                                            )}>EVENTS</AccordionTrigger>
                                            <AccordionContent className="pl-4 flex flex-col gap-2">

                                                {/* Workshops (Mobile) */}
                                                <SheetClose asChild>
                                                    <Link href="/events/workshops" className="block py-2 text-sm text-gray-700 hover:text-primary">
                                                        Workshops
                                                    </Link>
                                                </SheetClose>

                                                {/* Worksheets (Mobile) */}
                                                <SheetClose asChild>
                                                    <Link href="/events/worksheets" className="block py-2 text-sm text-gray-700 hover:text-primary">
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
                                            <AccordionTrigger className={cn(
                                                ibmPlexMono.className,
                                                "text-base font-bold text-gray-900 hover:text-primary no-underline hover:no-underline"
                                            )}>GET INVOLVED</AccordionTrigger>
                                            <AccordionContent className="pl-4 flex flex-col gap-2">

                                                {/* Volunteers (Mobile) */}
                                                <SheetClose asChild>
                                                    <Link href="/get-involved/volunteers" className="block py-2 text-sm text-gray-700 hover:text-primary">
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
                            <Image src="/jitjots.svg" height={60} width={60} alt="Jit Jots logo" priority />
                            <h1 className={cn("text-white text-3xl", kalam.className)}>
                                JIT JOTS
                            </h1>
                        </Link>

                        <nav className="flex items-center gap-2">

                            {/* HOME */}
                            <Link
                                href="/"
                                className="px-4 py-2 text-base font-semibold text-white hover:bg-white hover:text-primary transition-colors rounded-md"
                            >
                                Home
                            </Link>

                            {/* ABOUT */}
                            <div {...createHoverHandlers("about")}>
                                <DropdownMenu.Root
                                    open={activeMenu === "about"}
                                    modal={false}
                                >
                                    <DropdownMenu.Trigger asChild>
                                        <button className="flex items-center gap-1 px-4 py-2 text-base font-semibold text-white hover:bg-white hover:text-primary transition-colors rounded-md">
                                            About <ChevronDown className="h-4 w-4" />
                                        </button>
                                    </DropdownMenu.Trigger>

                                    <DropdownMenu.Portal>
                                        <DropdownMenu.Content
                                            forceMount
                                            side="bottom"
                                            align="start"
                                            sideOffset={4}
                                            className="min-w-[220px] bg-white rounded-md border shadow-lg p-2 z-[100]"
                                        >
                                            {/* Mission */}
                                            {/* <DropdownMenu.Item asChild>
                                                <Link href="/about/mission" className="block px-3 py-2 text-sm hover:bg-slate-100 rounded-md">
                                                    Mission / Purpose
                                                </Link>
                                            </DropdownMenu.Item> */}

                                            {/* Meet the Team */}
                                            <DropdownMenu.Item asChild>
                                                <Link href="/about/team" className="block px-3 py-2 text-sm hover:bg-slate-100 rounded-md">
                                                    Meet the Team
                                                </Link>
                                            </DropdownMenu.Item>

                                            {/* Partners */}
                                            {/* <DropdownMenu.Item asChild>
                                                <Link href="/about/partners" className="block px-3 py-2 text-sm hover:bg-slate-100 rounded-md">
                                                    Our Partners
                                                </Link>
                                            </DropdownMenu.Item> */}
                                        </DropdownMenu.Content>
                                    </DropdownMenu.Portal>
                                </DropdownMenu.Root>
                            </div>

                            {/* EVENTS */}
                            <div {...createHoverHandlers("events")}>
                                <DropdownMenu.Root
                                    open={activeMenu === "events"}
                                    modal={false}
                                >
                                    <DropdownMenu.Trigger asChild>
                                        <button className="flex items-center gap-1 px-4 py-2 text-base font-semibold text-white hover:bg-white hover:text-primary transition-colors rounded-md">
                                            Events <ChevronDown className="h-4 w-4" />
                                        </button>
                                    </DropdownMenu.Trigger>

                                    <DropdownMenu.Portal>
                                        <DropdownMenu.Content
                                            forceMount
                                            side="bottom"
                                            align="start"
                                            sideOffset={4}
                                            className="min-w-[220px] bg-white rounded-md border shadow-lg p-2 z-[100]"
                                        >
                                            {/* Workshops */}
                                            <DropdownMenu.Item asChild>
                                                <Link href="/events/workshops" className="block px-3 py-2 text-sm hover:bg-slate-100 rounded-md">
                                                    Workshops
                                                </Link>
                                            </DropdownMenu.Item>

                                            {/* Worksheets */}
                                            <DropdownMenu.Item asChild>
                                                <Link href="/events/worksheets" className="block px-3 py-2 text-sm hover:bg-slate-100 rounded-md">
                                                    Worksheets
                                                </Link>
                                            </DropdownMenu.Item>

                                            {/* Jot your path */}
                                            {/* <DropdownMenu.Item asChild>
                                                <Link href="/events/jotyourpath" className="block px-3 py-2 text-sm hover:bg-slate-100 rounded-md">
                                                    Jot Your Path
                                                </Link>
                                            </DropdownMenu.Item> */}
                                        </DropdownMenu.Content>
                                    </DropdownMenu.Portal>
                                </DropdownMenu.Root>
                            </div>

                            {/* GET INVOLVED */}
                            <div {...createHoverHandlers("involved")}>
                                <DropdownMenu.Root
                                    open={activeMenu === "involved"}
                                    modal={false}
                                >
                                    <DropdownMenu.Trigger asChild>
                                        <button className="flex items-center gap-1 px-4 py-2 text-base font-semibold text-white hover:bg-white hover:text-primary transition-colors rounded-md">
                                            Get Involved <ChevronDown className="h-4 w-4" />
                                        </button>
                                    </DropdownMenu.Trigger>

                                    <DropdownMenu.Portal>
                                        <DropdownMenu.Content
                                            forceMount
                                            side="bottom"
                                            align="start"
                                            sideOffset={4}
                                            className="min-w-[220px] bg-white rounded-md border shadow-lg p-2 z-[100]"
                                        >
                                            {/* Volunteers */}
                                            <DropdownMenu.Item asChild>
                                                <Link href="/get-involved/volunteers" className="block px-3 py-2 text-sm hover:bg-slate-100 rounded-md">
                                                    Volunteers
                                                </Link>
                                            </DropdownMenu.Item>

                                            {/* Contact Us */}
                                            {/* <DropdownMenu.Item asChild>
                                                <Link href="/get-involved/contact" className="block px-3 py-2 text-sm hover:bg-slate-100 rounded-md">
                                                    Contact Us
                                                </Link>
                                            </DropdownMenu.Item> */}
                                        </DropdownMenu.Content>
                                    </DropdownMenu.Portal>
                                </DropdownMenu.Root>
                            </div>

                        </nav>
                    </div>

                </div>
            </div>
        </header>
    )
}