import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SquarePen } from "lucide-react";
import { IBM_Plex_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import DesignTeamGraphic from "public/images/design-team-graphic.svg";
import CommunicationsTeamGraphic from "public/images/communications-team-graphic.svg";
import OutreachTeamGraphic from "public/images/outreach-team-graphic.svg";

const ibmPlexMono = IBM_Plex_Mono({ weight: "700", subsets: ["latin"] });

export default function Volunteers() {
  return (
    <main className="flex min-h-screen flex-col items-center px-4 lg:px-32 gap-20">
      <div className="container pt-10 sm:pt-16 space-y-24">
        <div className="space-y-4">
          <h2 className="text-4xl font-extrabold scroll-m-20 tracking-tight lg:text-6xl">
            Volunteers
          </h2>
          <p className="text-xl text-muted-foreground">
            Join us and help foster the next generation of scientists! All
            volunteers get the opportunity to join the teaching team at our
            workshops, as well as perform specific tasks under the following
            teams.
          </p>
          <div>
            <Link href="https://forms.gle/Qc821h1itrYqp5RG6">
              <Button
                className={cn(ibmPlexMono.className, "text-lg h-12 gap-2")}
              >
                <SquarePen className="-ml-1" strokeWidth={3} />
                APPLY
              </Button>
            </Link>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="space-y-4">
            <h3 className="text-3xl font-bold">DESIGN TEAM</h3>
            <p className="text-lg">
              The design team is responsible for designing the structure of
              science workshops, including activities, slideshows, videos, and
              more!
            </p>
            <div className="border-2 rounded-md p-4 bg-gray-50 lg:px-6">
              <h4 className="font-semibold text-gray-800">Responsibilities</h4>
              <ul className="list-disc ml-4 text-gray-500">
                <li>
                  Research cool, interesting science subjects for workshops
                </li>
                <li>Create slide decks for upcoming workshops</li>
              </ul>
            </div>
          </div>
          <Image
            src={DesignTeamGraphic}
            alt="Design Team Graphic"
            className="md:w-1/2 lg:w-1/3"
          />
        </div>
        <div className="flex flex-col-reverse md:flex-row gap-8">
          <Image
            src={CommunicationsTeamGraphic}
            alt="Communications Team Graphic"
            className="md:w-1/2 lg:w-1/3"
          />
          <div className="space-y-4">
            <h3 className="text-3xl font-bold">COMMUNICATIONS TEAM</h3>
            <p className="text-lg">
              The communications team&apos;s role is to enhance the presence of
              Jit Jots across various social media platforms as well as market
              upcoming events and notices of importance.
            </p>

            <div className="border-2 rounded-md p-4 bg-gray-50 lg:px-6">
              <h4 className="font-semibold text-gray-800">Responsibilities</h4>
              <ul className="list-disc ml-4 text-gray-500">
                <li>
                  Use graphic design tools such as Canva to create graphics for
                  Jit Jots&apos; social media
                </li>
                <li>Edit newsletters and videos</li>
                <li>Log volunteer hours</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="space-y-4">
            <h3 className="text-3xl font-bold">OUTREACH TEAM</h3>
            <p className="text-lg">
              The community outreach team is responsible for developing and
              maintaining Jit Jots relationships with other organizations,
              daycares, recreational centers, community programs, and sponsors.
            </p>
            <div className="border-2 rounded-md p-4 bg-gray-50 lg:px-6">
              <h4 className="font-semibold text-gray-800">Responsibilities</h4>
              <ul className="list-disc ml-4 text-gray-500">
                <li>
                  Reach out to various programs to introduce our workshops
                </li>
                <li>Continue scheduling with previous partners</li>
                <li>Find new sponsors and host fundraisers</li>
              </ul>
            </div>
          </div>
          <Image
            src={OutreachTeamGraphic}
            alt="Outreach Team Graphic"
            className="md:w-1/2 lg:w-1/3"
          />
        </div>
      </div>
    </main>
  );
}
