import Autoplay from "embla-carousel-autoplay";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const testimonials = [
  {
    quote:
      "The families LOVE the workshops with Jit Jots! The young children are engaged and learning whilst having so much fun. The activities were well planned for the early years age group and the team was so great interacting with the children and adapting to the group. The parents and caregivers are so appreciative of the workshops for their kids and are already asking if they can come again! Big thank you to the Jit Jots team and looking forward to booking another session.",
    name: "South Vancouver Neighbourhood House",
  },
  {
    quote:
      "Jit Jots is a talented group of young people that has the potential to inspire many young kiddos to pursue this field of science! It is wonderful to see their growth and am excited to see how they will continue to build communities through their fantastic workshops and programs.",
    name: "False Creek Community Centre",
  },
  {
    quote:
      "Great job engaging our kids! We look forward to seeing you again this summer for our summer camps.",
    name: "False Creek Community Centre - [Preteen Program]",
  },
];

export default function Testimonials() {
  return (
    <Carousel
      plugins={[Autoplay({ delay: 5000 })]}
      className="w-full md:max-w-screen-lg"
    >
      <CarouselContent>
        {testimonials.map((testimonial) => (
          <CarouselItem key={testimonial.quote}>
            <Card>
              <CardHeader>
                <blockquote className="text-lg leading-snug pl-3 border-l-4 border-l-gray-300">
                  &quot;{testimonial.quote}&quot;
                </blockquote>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-muted-foreground font-light">
                    {testimonial.name}
                  </div>
                </div>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="hidden lg:flex" />
      <CarouselNext className="hidden lg:flex" />
    </Carousel>
  );
}
