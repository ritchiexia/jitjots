import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type Profile = {
  name: string;
  position: string;
  img: string;
  fallback: string;
  description: string;
};

const profiles = [
  {
    name: "Sean Dang",
    position: "Co-President",
    img: "/images/headshots/Sean.png",
    fallback: "SD",
    description:
      "Sean is a recent graduate of science in Microbiology and Immunology at UBC. He is interested in the immune system and cancer research. During his studies, he volunteers at the hospital and plays sports.",
  },
  {
    name: "Dean Yoo",
    position: "Co-President",
    img: "/images/headshots/Dean.png",
    fallback: "DY",
    description:
      "Dean recently graduated with a degree in Biology from UBC. He loves anything biology related, from learning about the complexities of organisms to studying the environment. When Dean is not doing science, he enjoys listening to music, drawing, and watching movies.",
  },
  {
    name: "Trinity Truong",
    position: "Administrative Director",
    img: "/images/headshots/Trinity.png",
    fallback: "TT",
    description:
      "Trinity is a recent graduate from UBC with a B.Sc in Cell and Developmental Biology. As the Administrative Director, she oversees volunteer intake and management. Outside of Jit Jots, she enjoys getting involved with the community and is learning how to golf.",
  },
  {
    name: "Brian Tang",
    position: "Design Team Lead",
    img: "/images/headshots/Brian.png",
    fallback: "BT",
    description:
      "Brian is a design lead for Jit Jots and recently graduated from UBC with a degree in biology. Brian’s job involves designing workshops for Jit Jots, which involves researching science topics to present to learners and drafting lesson plans and planning activities that fit the topic. Outside of Jit Jots, Brian is a researcher for different clinical studies at VGH and UBCH involving emergency medicine and anaesthesia.",
  },
  {
    name: "James Gao",
    position: "Design Team Lead",
    img: "/images/headshots/James.png",
    fallback: "JG",
    description:
      "James is currently studying Kinesiology at UBC. He’s interested in understanding how the body moves and why it sometimes feels like it has a mind of its own. When he’s not buried in Anki flashcards, he enjoys swimming, playing video games, and spending time with friends.",
  },
  {
    name: "Dain Choi",
    position: "Communications Team Lead",
    img: "/images/headshots/Dain.png",
    fallback: "DC",
    description:
      "Dain is studying neuroscience and immunology at UBC. She finds it fascinating to learn about how different systems in our body work together to keep us alive. In her spare time, she enjoys listening to music, and is currently learning to play tennis.",
  },
  {
    name: "Sheridan Dang",
    position: "Marketing Team Lead",
    img: "/images/headshots/Sheridan.jpg",
    fallback: "SD",
    description:
      "Sheridan is currently studying psychology at UBC. She is curious about how the human mind is unified with the body. Studying human behaviours, thought processes, and biological responses are all up Sheridan’s alley! In her free time, she loves to play badminton with her friends, learn how to knit, and dabbles with video editing!",
  },
  {
    name: "Ritchie Xia",
    position: "Tech Guy",
    img: "/images/headshots/Ritchie.png",
    fallback: "RX",
    description:
      "Ritchie is a recent computer engineering graduate from UBC. The website you are on right now was designed and coded up by him!",
  },
];

function ProfileCard({ name, position, img, fallback, description }: Profile) {
  return (
    <Card>
      <CardHeader className="flex flex-row gap-4">
        <Avatar className="h-24 w-24">
          <AvatarImage src={img} className="object-cover" />
          <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
        <div className="m-0">
          <h3 className="font-semibold text-2xl md:text-3xl">{name}</h3>
          <p className="text-muted-foreground">{position}</p>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-justify md:text-start">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function About() {
  return (
    <main className="flex min-h-screen flex-col items-center lg:px-32 gap-20">
      <div className="container pt-10 sm:pt-16 space-y-24">
        <div className="space-y-4">
          <h2 className="text-4xl font-extrabold scroll-m-20 tracking-tight lg:text-6xl">
            About Us
          </h2>
          <div className="text-xl text-muted-foreground space-y-2">
            <p>
              Jit Jots is a{" "}
              <b className="font-medium">non-profit organization</b> founded by
              a group of UBC students in the faculty of science.
            </p>
            <p>
              Our mission is to share our passion for the subject, and hope to
              inspire a positive learning environment for the youth in our
              community.
            </p>
            <p>
              We strive to make learning fun through weekly activity sheets and
              online workshops where we will guide kids through exciting
              experiments they can do at home!
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-extrabold scroll-m-20 tracking-tight lg:text-6xl">
            Meet the Team
          </h2>
          <div className="grid sm:grid-cols-2 2xl:grid-cols-3 gap-6 w-full">
            {profiles.map((profile) => (
              <ProfileCard
                key={profile.name}
                name={profile.name}
                img={profile.img}
                fallback={profile.fallback}
                position={profile.position}
                description={profile.description}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
