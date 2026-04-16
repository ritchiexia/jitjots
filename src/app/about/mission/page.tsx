import { IBM_Plex_Mono } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronRight, Handshake, Globe, Telescope } from 'lucide-react';

const ibmPlexMono = IBM_Plex_Mono({ weight: '700', subsets: ['latin'] });

export default function Mission() {
  return (
    <main className="flex min-h-screen flex-col items-center lg:px-32 gap-20">
      <div className="container pt-10 sm:pt-16 space-y-24 pb-24">
        {/* About Us */}
        <div className="grid md:grid-cols-2 md:items-center gap-12">
          <div className="space-y-8">
            <h2 className="text-4xl font-extrabold scroll-m-20 tracking-tight lg:text-6xl">
              About Us
            </h2>
            <div className="text-xl text-muted-foreground space-y-5">
              <p>
                Jit Jots Science Education Society is a{' '}
                <span className="font-semibold text-foreground">
                  non-profit organization
                </span>{' '}
                founded by a group of University of British Columbia Science
                graduates. What started as a passion project between peers
                became a team of individuals working to share their love of
                science with the youth in local communities. For us, learning
                science in our childhood was sometimes mundane, or even
                daunting. So in{' '}
                <span className="font-semibold text-foreground">2019</span>, we
                set out to make science a fun and digestible subject for all.
              </p>
              <p>
                Since our founding, Jit Jots has successfully delivered science
                workshops in various communities across the{' '}
                <span className="font-semibold text-foreground">
                  Lower Mainland
                </span>
                . Our growing roster of partners and sponsors includes community
                centres, elementary schools, and neighborhood houses. A
                cornerstone of our philosophy is to provide{' '}
                <span className="font-semibold text-foreground">
                  culturally inclusive
                </span>{' '}
                science education and community engagement that uplifts those
                who struggle to access these recreational supports.
              </p>
              <p>
                Through interactive workshops, hands-on activity sheets, and
                mentorship from passionate volunteers, we aim to spark curiosity
                and confidence in young learners. By bringing science directly
                into community spaces, we strive to create welcoming
                environments where children feel encouraged to ask questions,
                explore new ideas, and see themselves as capable participants in
                the world of science.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/about/team">
                <Button
                  className={cn(
                    ibmPlexMono.className,
                    'text-lg h-12 [word-spacing:-0.5ch]',
                  )}
                >
                  <ChevronRight className="-ml-2" strokeWidth={3} />
                  MEET THE TEAM
                </Button>
              </Link>
              <Link href="/volunteers">
                <Button
                  variant="secondary"
                  className={cn(
                    ibmPlexMono.className,
                    'text-lg h-12 [word-spacing:-0.5ch]',
                  )}
                >
                  <ChevronRight className="-ml-2" strokeWidth={3} />
                  VOLUNTEER
                </Button>
              </Link>
            </div>
          </div>

          {/* Placeholder image */}
          <div className="hidden md:flex w-full aspect-square rounded-3xl bg-muted items-center justify-center">
            <span className="text-sm text-muted-foreground">Image</span>
          </div>
        </div>
        {/* end grid */}

        {/* Our Mission */}
        <div className="space-y-8">
          <div>
            <h3 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
              Our Purpose
            </h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: Handshake,
                title: 'How We Started',
                description:
                  'Jit Jots was founded to serve as a bridge between science education and community access.',
              },
              {
                icon: Globe,
                title: 'Our Mission',
                description:
                  'Our mission is to make science engaging, accessible, and culturally inclusive by delivering hands-on learning experiences to youth who may not otherwise have opportunities to explore STEM.',
              },
              {
                icon: Telescope,
                title: 'Our Vision',
                description:
                  'We aim to empower curiosity, support diverse learners, and foster meaningful connections with community partners to inspire the next generation of forward-thinking and inquisitive scientists!',
              },
            ].map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-muted/30 px-5 py-6 space-y-3"
              >
                <div className="rounded-xl bg-primary/10 w-10 h-10 flex items-center justify-center">
                  <Icon size={18} className="text-primary" strokeWidth={2} />
                </div>
                <p className="font-bold text-base">{title}</p>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
