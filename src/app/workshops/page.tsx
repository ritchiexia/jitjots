import workshopsHeroPic from "public/images/workshops-hero.png";
import Image from "next/image";
import {
  ChevronRight,
  CircleDollarSign,
  FlaskConical,
  Lightbulb,
  Palette,
  Settings2,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import PhotoGallery from "@/components/photo-gallery";

const ibmPlexMono = IBM_Plex_Mono({ weight: "700", subsets: ["latin"] });

export default function Workshops() {
  return (
    <main className="flex min-h-screen flex-col items-center lg:px-32 gap-20">
      <div className="container pt-10 sm:pt-16 space-y-24">
        <div className="space-y-16">
          <div className="grid md:grid-cols-2 md:items-center gap-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-extrabold scroll-m-20 tracking-tight lg:text-6xl">
                Workshops
              </h2>
              <p className="text-xl text-muted-foreground">
                Jit Jots workshops aim to present various science topics through
                fun activities and engaging demonstrations. From dry ice bubbles
                to extracting DNA from strawberries, children can expect to
                participate in a variety of experiments!
              </p>
              <Link href="https://forms.gle/aJbnMDKzNFnuWeDB6">
                <Button
                  className={cn(
                    ibmPlexMono.className,
                    "mt-4 text-lg h-12 [word-spacing:-0.5ch]"
                  )}
                >
                  <ChevronRight className="-ml-2" strokeWidth={3} />
                  BOOK NOW
                </Button>
              </Link>
            </div>
            <Image
              src={workshopsHeroPic}
              alt="Jit Jots workshop at False Creek"
              placeholder="blur"
            />
          </div>
          <div className="grid gap-8 md:grid-cols-2 p-6 text-secondary rounded-3xl bg-primary">
            <span className="flex gap-3 items-center">
              <Timer strokeWidth={2} className="shrink-0 w-10 h-10" />
              <h4 className="text-xl">1 hour of educational fun</h4>
            </span>
            <span className="flex gap-3 items-center">
              <Settings2 strokeWidth={2} className="shrink-0 w-10 h-10" />
              <h4 className="text-xl">Customized to specific age groups</h4>
            </span>
            <span className="flex gap-3 items-center">
              <CircleDollarSign
                strokeWidth={2}
                className="shrink-0 w-10 h-10"
              />
              <h4 className="text-xl">Budget-friendly</h4>
            </span>
            <span className="flex gap-3 items-center">
              <FlaskConical strokeWidth={2} className="shrink-0 w-10 h-10" />
              <h4 className="text-xl">Hands on experiments</h4>
            </span>
            <span className="flex gap-3 items-center">
              <Palette strokeWidth={2} className="shrink-0 w-10 h-10" />
              <h4 className="text-xl">Broad range of science themes</h4>
            </span>
            <span className="flex gap-3 items-center">
              <Lightbulb strokeWidth={2} className="shrink-0 w-10 h-10" />
              <h4 className="text-xl">Encourages critical thinking</h4>
            </span>
          </div>
        </div>
        {/* <div className="space-y-4">
          <h3 className="text-4xl font-bold">PHOTO GALLERY</h3>
          <PhotoGallery />
        </div> */}
      </div>
    </main>
  );
}
