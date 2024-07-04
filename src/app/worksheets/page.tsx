import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import { IBM_Plex_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";

import Nutrition from "public/images/worksheets/Nutrition.png";
import Exercise from "public/images/worksheets/Exercise.png";
import Sleep from "public/images/worksheets/Sleep.png";
import Planets from "public/images/worksheets/Planets.png";
import Moons from "public/images/worksheets/Moons.png";
import Aliens from "public/images/worksheets/Aliens.png";
import VirusesAndGerms from "public/images/worksheets/VirusesGerms.png";
import OceanConservation from "public/images/worksheets/OceanConservation.png";
import DeepSeaAnimals from "public/images/worksheets/DeepSeaAnimals.png";
import ReefAndShoreLife from "public/images/worksheets/ReefAndShoreLife.png";
import FiveOceans from "public/images/worksheets/FiveOceans.png";

const worksheets = [
  {
    name: "Nutrition",
    description: "Stay healthy with what we eat!",
    preview: Nutrition,
    downloadLink:
      "https://drive.google.com/open?id=1G1sf8kRVviMe7R0QiC7Oef43t00Sp9Da&edoph=true",
  },
  {
    name: "Exercise",
    description: "An important part of healthy living!",
    preview: Exercise,
    downloadLink:
      "https://drive.google.com/file/d/19D6NWKPGumq_iyaILhAXEDl3xKzIrX5e/view",
  },
  {
    name: "Sleep",
    description: "What we do for a third of our lives!",
    preview: Sleep,
    downloadLink:
      "https://drive.google.com/file/d/15N9DebQydpL-Oy7Hae0_LB5Z8fzSTOZ3/view",
  },
  {
    name: "Planets",
    description: "Explore our solar system!",
    preview: Planets,
    downloadLink:
      "https://drive.google.com/file/d/19_rSb6M4O72evCRv6qSRYjsdtagPDaO9/view",
  },
  {
    name: "Moons",
    description: "Giant floating rocks circling planets!",
    preview: Moons,
    downloadLink:
      "https://drive.google.com/open?id=1zItv9tN2u6lXPrVhvF97glBu7-y8ohnT&edoph=true",
  },
  {
    name: "Aliens",
    description: "Extraterrestial beings and flying objects!",
    preview: Aliens,
    downloadLink:
      "https://drive.google.com/file/d/1OfCn3MTdzBtFDVEfTAoaa5MoebB_lR7T/view",
  },
  {
    name: "Viruses & Germs",
    description: "",
    preview: VirusesAndGerms,
    downloadLink:
      "https://drive.google.com/file/d/1VG68LJGiRHarEybgDfVNnwhrdd701ljO/view",
  },
  {
    name: "Ocean Conservation",
    description: "Keeping our oceans clean for future generations!",
    preview: OceanConservation,
    downloadLink:
      "https://drive.google.com/open?id=1oM_KWvUDgpGveBAQYnpUuXNO5_ftfTll&edoph=true",
  },
  {
    name: "Deep Sea Animals",
    description: "Creatures of the deep!",
    preview: DeepSeaAnimals,
    downloadLink:
      "https://drive.google.com/file/d/1IZQZCxmg0YzrexHIzOZZhQpXEHQF6R68/view",
  },
  {
    name: "Reef and Shore Life",
    description: "All about life under the ocean surface!",
    preview: ReefAndShoreLife,
    downloadLink:
      "https://drive.google.com/file/d/1nQ1XtpsZ-CQvDwwH9EUf7rwKyLEBhPxK/view",
  },
  {
    name: "The 5 Oceans",
    description: "A lesson on the great big oceans of the world!",
    preview: FiveOceans,
    downloadLink:
      "https://drive.google.com/file/d/1aNxxWMUaysj3HAAa7TuJVkfKHBDIR63E/view",
  },
];

const ibmPlexMono = IBM_Plex_Mono({ weight: "700", subsets: ["latin"] });

function PreviewGrid() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
      {worksheets.map((worksheet) => (
        <Dialog key={worksheet.name}>
          <DialogTrigger>
            <div className="text-left space-y-2 hover:brightness-75 hover:bg-primary hover:text-secondary transition p-2">
              <Image src={worksheet.preview} alt={worksheet.name} />
              <h4 className="text-lg">{worksheet.name}</h4>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-6xl">
            <DialogHeader>
              <h3 className="text-2xl font-semibold">{worksheet.name}</h3>
            </DialogHeader>
            <div className="flex flex-col xl:flex-row gap-4">
              <Image
                src={worksheet.preview}
                alt={worksheet.name}
                className="xl:w-3/4"
              />
              <div>
                <p>{worksheet.description}</p>
                <div className="mt-6">
                  <Link href={worksheet.downloadLink}>
                    <Button
                      className={cn(
                        ibmPlexMono.className,
                        "text-lg h-12 gap-1"
                      )}
                    >
                      <ExternalLink className="-ml-1" strokeWidth={3} />
                      DOWNLOAD
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ))}
      <Link href="https://drive.google.com/drive/u/2/folders/17I-6Cn3AJUNF-XNPCJ8fOAn2ek-WDO7X">
        <div className="flex flex-col text-left space-y-2 h-full hover:brightness-75 hover:bg-primary hover:text-secondary transition p-2">
          <div className="grow bg-gradient-to-r from-gray-200 to-gray-50"></div>
          <h4 className="text-lg">See more... and answer keys!</h4>
        </div>
      </Link>
    </div>
  );
}

export default function Worksheets() {
  return (
    <main className="flex min-h-screen flex-col items-center px-4 lg:px-32 gap-20">
      <div className="container pt-10 sm:pt-16 space-y-8">
        <div className="space-y-4">
          <h2 className="text-4xl font-extrabold scroll-m-20 tracking-tight lg:text-6xl">
            Worksheets
          </h2>
          <p className="text-xl text-muted-foreground">
            Jit Jots activity sheets contain fun, educational activities that
            teach elementary school students various topics. Take a look at our
            selection and feel free to make copies! We&apos;re always cooking up
            new worksheets, so be sure to come back and check!
          </p>
          <p className="text-xl text-muted-foreground">
            Find the full collection and answer keys{" "}
            <Link href="https://drive.google.com/drive/u/2/folders/17I-6Cn3AJUNF-XNPCJ8fOAn2ek-WDO7X">
              <span className="inline-block underline font-semibold">here</span>
            </Link>
            !
          </p>
        </div>
        <PreviewGrid />
      </div>
    </main>
  );
}
