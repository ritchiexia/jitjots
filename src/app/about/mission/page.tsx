import { IBM_Plex_Mono, Kalam } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, ArrowRight } from 'lucide-react';

const ibmPlexMono = IBM_Plex_Mono({ weight: '700', subsets: ['latin'] });
const kalam = Kalam({ weight: '700', subsets: ['latin'] });

const communityPhotos = [
  { label: 'Discovering', src: '/images/workshop.jpg' },
  { label: 'Experimenting', src: '/images/volunteering.jpeg' },
  { label: 'Exploring', src: '/images/experiment.jpg' },
];

export default function Mission() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero */}
      <div className="w-full max-w-6xl mx-auto px-6 md:px-14 pt-16 sm:pt-24 pb-16 sm:pb-24">
        <div className="grid md:grid-cols-[1fr_390px] gap-12 md:gap-16 items-center">
          <div className="space-y-8">
            <h1 className="text-4xl font-extrabold scroll-m-20 tracking-tight lg:text-6xl leading-[1.07]">
              Instilling curiosity and{' '}
              <span className="bg-[linear-gradient(transparent_66%,rgba(245,208,46,.6)_66%)]">
                wonder
              </span>{' '}
              in the scientists of the future.
            </h1>
            <p className="text-xl text-muted-foreground max-w-[31em]">
              A non-profit making science fun, hands-on, and accessible for kids
              across the Lower Mainland.
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <a href="#about">
                <Button
                  className={cn(
                    ibmPlexMono.className,
                    'text-lg h-12 [word-spacing:-0.5ch]',
                  )}
                >
                  <ChevronRight className="-ml-2" strokeWidth={3} />
                  OUR STORY
                </Button>
              </a>
              <a
                href="#mission"
                className="inline-flex items-center gap-1.5 text-base font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                What drives us
                <ArrowRight size={16} strokeWidth={2.5} />
              </a>
            </div>
          </div>

          <div className="relative hidden md:block">
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-[#f5d02e] rounded-xl" />
            <div className="relative aspect-[4/5] rounded-xl overflow-hidden shadow-2xl">
              <Image
                src="/images/home.jpeg"
                alt="Jit Jots volunteers running a science workshop"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* About Us */}
      <div id="about" className="w-full bg-background">
        <div className="max-w-3xl mx-auto px-6 md:px-14 py-20 md:py-24 space-y-7">
          <div className="text-xs font-bold tracking-widest uppercase text-primary">
            About us
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
            A passion project that became a team.
          </h2>
          <div className="text-lg text-muted-foreground space-y-5 leading-relaxed">
            <p>
              Jit Jots Science Education Society is a{' '}
              <span className="font-semibold text-foreground">
                non-profit organization
              </span>{' '}
              founded by a group of University of British Columbia Science
              graduates. What started as a passion project between peers became
              a team of individuals working to share their love of science with
              the youth in local communities. For us, learning science in our
              childhood was sometimes mundane, or even daunting. So in{' '}
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
              centres, elementary schools, and neighbourhood houses. A
              cornerstone of our philosophy is to provide{' '}
              <span className="font-semibold text-foreground">
                culturally inclusive
              </span>{' '}
              science education and community engagement that uplifts those who
              struggle to access these recreational supports.
            </p>
            <p>
              Through interactive workshops, hands-on activity sheets, and
              mentorship from passionate volunteers, we aim to spark curiosity
              and confidence in young learners. By bringing science directly
              into community spaces, we strive to create welcoming environments
              where children feel encouraged to ask questions, explore new
              ideas, and see themselves as capable participants in the world of
              science.
            </p>
          </div>
        </div>
      </div>

      {/* Our Mission */}
      <div id="mission" className="w-full bg-primary">
        <div className="max-w-6xl mx-auto px-6 md:px-14 py-20 md:py-24 grid md:grid-cols-[1fr_380px] gap-12 md:gap-16 items-center">
          <div>
            <div className="text-xs font-bold tracking-widest uppercase text-[#f5d02e] mb-4">
              Our mission
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight lg:text-5xl leading-[1.08] text-primary-foreground">
              Bridging science education and community{' '}
              <span className="bg-[linear-gradient(transparent_68%,rgba(245,208,46,.6)_68%)]">
                access.
              </span>
            </h2>
          </div>
          <div className="space-y-4">
            <p className="text-lg text-primary-foreground leading-relaxed">
              Our mission is to make science engaging, accessible, and
              culturally inclusive by delivering hands-on learning experiences
              to youth who may not otherwise have opportunities to explore STEM.
            </p>
            <p className="text-base text-primary-foreground/80 leading-relaxed">
              We empower curiosity, support diverse learners, and build
              meaningful connections with community partners to inspire the next
              generation of inquisitive scientists.
            </p>
          </div>
        </div>
      </div>

      {/* Meet our community */}
      <div className="w-full bg-background">
        <div className="max-w-6xl mx-auto px-6 md:px-14 py-20 md:py-24">
          <h2 className="text-3xl font-extrabold tracking-tight lg:text-4xl mb-10">
            Meet our community
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {communityPhotos.map(({ label, src }) => (
              <div key={label}>
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden shadow-sm">
                  <Image
                    src={src}
                    alt={`Children ${label.toLowerCase()}`}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="text-xs font-bold tracking-widest uppercase text-muted-foreground text-center mt-4">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="w-full bg-[#4a4153] py-20 px-6 text-center -mb-16">
        <p className={cn(kalam.className, 'text-4xl text-white mb-8')}>
          Come jot with us.
        </p>
        <div className="flex flex-wrap gap-4 justify-center items-center">
          <Link href="/get-involved/volunteers">
            <Button
              className={cn(
                ibmPlexMono.className,
                'text-lg h-12 [word-spacing:-0.5ch] bg-[#f5d02e] text-[#221d28] hover:bg-[#f5d02e]/90',
              )}
            >
              <ChevronRight className="-ml-2" strokeWidth={3} />
              VOLUNTEER
            </Button>
          </Link>
          <Link href="/about/team">
            <Button
              variant="outline"
              className={cn(
                ibmPlexMono.className,
                'text-lg h-12 [word-spacing:-0.5ch] bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white',
              )}
            >
              <ChevronRight className="-ml-2" strokeWidth={3} />
              MEET THE TEAM
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
