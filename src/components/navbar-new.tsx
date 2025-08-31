"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { Kalam, IBM_Plex_Mono } from "next/font/google"
import { CircleCheckIcon, CircleHelpIcon, CircleIcon } from "lucide-react"

import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"

const ibmPlexMono = IBM_Plex_Mono({ weight: "700", subsets: ["latin"] });
const kalam = Kalam({ weight: "700", subsets: ["latin"] })

export default function NewNavBar() {
    return (
        <header className="flex h-16 w-full shrink-0 items-center px-4 md:px-6 sticky top-0 z-50 bg-primary border-b">
            <div className="flex items-center justify-between w-full p-4">
                <Link href="/" className="flex items-center">
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

                <NavigationMenu>
                    <NavigationMenuList>
                        <NavigationMenuItem>
                            <NavigationMenuLink asChild className={cn(navigationMenuTriggerStyle())}>
                                <Link href="/" className={cn(ibmPlexMono.className, "text-lg font-extrabold")}>HOME</Link>
                            </NavigationMenuLink>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <NavigationMenuTrigger className={cn(
                                                  ibmPlexMono.className,
                                                  "flex w-full items-center py-2 text-lg font-bold"
                                                )}>ABOUT</NavigationMenuTrigger>
                            <NavigationMenuContent>
                                <ul className="grid w-[400px] gap-3 p-6">
                                    <li>
                                        <NavigationMenuLink asChild>
                                            <Link href="/about" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                                                <div className="text-sm font-medium leading-none">About Us</div>
                                                <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                                                    Meet Our Team.
                                                </p>
                                            </Link>
                                        </NavigationMenuLink>
                                    </li>
                                    <li>
                                        <NavigationMenuLink asChild>
                                            <Link href="/volunteers" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                                                <div className="text-sm font-medium leading-none">Volunteer</div>
                                                <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                                                    Join our team and make a difference.
                                                </p>
                                            </Link>
                                        </NavigationMenuLink>
                                    </li>
                                </ul>
                            </NavigationMenuContent>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <NavigationMenuTrigger className={cn(
                                                  ibmPlexMono.className,
                                                  "flex w-full items-center py-2 text-lg font-bold"
                                                )}>EVENTS</NavigationMenuTrigger>
                            <NavigationMenuContent>
                                <ul className="grid w-[400px] gap-3 p-6">
                                    <li>
                                        <NavigationMenuLink asChild>
                                            <Link href="/workshops" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                                                <div className="text-sm font-medium leading-none">Workshops</div>
                                                <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                                                    Book a workshop.
                                                </p>
                                            </Link>
                                        </NavigationMenuLink>
                                    </li>
                                    <li>
                                        <NavigationMenuLink asChild>
                                            <Link href="/jot-your-path" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                                                <div className="text-sm font-medium leading-none">Jot Your Path</div>
                                                <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                                                    Join our career panel event.
                                                </p>
                                            </Link>
                                        </NavigationMenuLink>
                                    </li>
                                </ul>
                            </NavigationMenuContent>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <NavigationMenuLink asChild className={cn(navigationMenuTriggerStyle())}>
                                <Link href="/worksheets" className={cn(ibmPlexMono.className, "text-lg font-bold")}>WORKSHEETS</Link>
                            </NavigationMenuLink>
                        </NavigationMenuItem>
                    </NavigationMenuList>
                </NavigationMenu>
            </div>
        </header>
    )
}

const ListItem = React.forwardRef<
    React.ElementRef<"a">,
    React.ComponentPropsWithoutRef<"a"> & { title: string }
>(({ className, title, children, href, ...props }, ref) => {
    return (
        <li>
            <NavigationMenuLink asChild>
                <Link
                    ref={ref}
                    href={href!}
                    className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    {...props}
                >
                    <div className="text-sm font-medium leading-none">{title}</div>
                    <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                        {children}
                    </p>
                </Link>
            </NavigationMenuLink>
        </li>
    )
})