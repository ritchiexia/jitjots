import { Facebook, Instagram, Mailbox, Music2, Youtube } from "lucide-react";
import Link from "next/link";

export default function Footer() {
    return (
        <div className="bg-primary text-gray-50 py-8 mt-8">
            <div className="container mx-auto px-4 md:px-6">
                <div className="flex flex-col gap-4 md:flex-row items-center justify-between">
                    <nav className="flex gap-10">
                        <Link href="/" className="hover:underline">
                            About Us
                        </Link>
                        <Link href="/" className="hover:underline">
                            Events
                        </Link>
                        <Link href="/" className="hover:underline">
                            Contact Us
                        </Link>
                    </nav>
                    <div>
                        <form className="flex gap-2">
                            <label htmlFor="email" className="sr-only">
                                Your Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                placeholder="Your Email"
                                className="bg-white text-black px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="submit"
                                className="bg-secondary text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                            >
                                Subscribe
                            </button>
                        </form>
                    </div>
                </div>
                <hr className="border-white-400 border-t-2 my-8" />
                <div className="flex flex-col gap-4 md:flex-row items-center justify-between">
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
                        <Link href="mailto:jitjotsactivities@gmail.com">
                            <Mailbox />
                        </Link>
                        <Link href="https://www.facebook.com/jitjotsactivities/">
                            <Facebook />
                        </Link>
                    </div>
                    <div className="text-center text-white text-sm">
                        <p>Business Number: 78523 8037 BC0001</p>
                        <p>Registered under SOCIETIES ACT [SBC 2015] C.18</p>
                    </div>
                    <p className="text-sm">© Jit Jots Science Education Society {new Date().getFullYear()}</p>
                </div>
            </div>
        </div>
    );
}
