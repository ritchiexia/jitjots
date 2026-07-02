import type { Metadata } from 'next';
import { Rubik, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/sonner';

const rubik = Rubik({ subsets: ['latin'] });
const ibmPlexMono = IBM_Plex_Mono({
  weight: '700',
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
});

export const metadata: Metadata = {
  title: 'Jit Jots',
  description: 'Instilling curiosity and wonder in scientists of the future',
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
      <body className={cn(rubik.className, ibmPlexMono.variable, 'overflow-x-hidden min-h-screen flex flex-col')}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
