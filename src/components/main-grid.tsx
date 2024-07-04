import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Handshake, Microscope, NotebookText } from "lucide-react";

import Image from "next/image";
import workshopsPic from "public/images/workshops.png";
import worksheetsPic from "public/images/worksheets.png";
import volunteeringPic from "public/images/volunteering.jpeg";
import Link from "next/link";

export default function MainGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 w-full z-30">
      <Card className="bg-transparent text-background border-4">
        <CardHeader>
          <Link className="flex gap-2 underline" href="/workshops">
            <Microscope className="h-9 shrink-0" strokeWidth={3} />
            <h3 className="text-3xl font-bold">WORKSHOPS</h3>
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          <Image
            src={workshopsPic}
            alt="Example of Jit Jots workshop"
            className="object-cover border-none h-64"
          />
          <div>
            Presenting various science topics through{" "}
            <b className="font-medium">hands-on experiments</b> and{" "}
            <b className="font-medium">engaging demonstrations</b>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-transparent text-background border-4">
        <CardHeader>
          <Link className="flex gap-2 underline" href="/worksheets">
            <NotebookText className="h-9 shrink-0" strokeWidth={3} />
            <h3 className="text-3xl font-bold">WORKSHEETS</h3>
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          <Image
            src={worksheetsPic}
            alt="Example of Jit Jots workshop"
            className="object-cover border-none h-64"
          />
          <div>
            Printable worksheets including fun activities and passages that
            discuss{" "}
            <b className="font-medium">
              current science trends, discoveries, and concerns
            </b>
            .
          </div>
        </CardContent>
      </Card>
      <Card className="bg-transparent text-background border-4">
        <CardHeader>
          <Link className="flex gap-2 underline" href="/volunteers">
            <Handshake className="h-9 shrink-0" strokeWidth={3} />
            <h3 className="text-3xl font-bold">VOLUNTEERING</h3>
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          <Image
            src={volunteeringPic}
            alt="Example of Jit Jots workshop"
            className="object-cover border-none h-64"
          />
          <div>
            Fun and fulfilling volunteer experience that helps grow the next
            generation of scientists!
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
