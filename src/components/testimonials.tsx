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
      "The Jit Jots team came well-prepared, full of enthusiasm and excitement. They had lots to show and share with the audience, and we loved how the content was both educational and fun. The audience had fun interacting with the team. The finale was the best!",
    name: "False Creek Community Center - [Summer Kick-Off]",
  },
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
  {
    quote:
      "I have jitjots come in our Preschool in February. Children truly enjoyed the workshop. The content was age appropriate (3 to 5 years old children). Children remain engaged throughout the presentation. Dry ice activity was everyone's favourite including teachers. I will definitely recommend Jitjots to other centers in our organization. Keep inspiring children and adults!",
    name: "Reunka Bhardwaj from Collingwood Neighbourhood House",
  },
  {
    quote:
      "The team is so energetic and truly engaging!😀 They know how to effectively relate to very young children. Their activities really spark curiosity and wonder!😀 We can’t wait to have them at our centre again!😀",
    name: "Duke Street Early Learning & Care Centre (Collingwood Neighbourhood House)",
  }
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
