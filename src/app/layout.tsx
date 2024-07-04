import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/navbar";
import Footer from "@/components/footer";

const rubik = Rubik({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Jit Jots",
  description: "Instilling curiosity and wonder in scientists of the future",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/jitjots.svg" sizes="any" />
      </head>
      <body className={rubik.className}>
        <NavBar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
