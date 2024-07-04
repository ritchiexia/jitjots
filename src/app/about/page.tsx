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
      "Hey everyone! I’m Sean and I am in my 4th year of studying Microbiology and Immunology at UBC! I’m fascinated by how our immune systems work to fight off sickness and disease. During my studies, I work at the hospital to answer interesting research questions about patient treatment. My hobbies include playing sports, video games, and reading!",
  },
  {
    name: "Dean Yoo",
    position: "Co-President",
    img: "/images/headshots/Dean.png",
    fallback: "DY",
    description:
      "Hi! My name is Dean and I graduated with a degree in Biology from UBC! I love anything biology related, from learning about the complexities of organisms to studying the environment around us. I am excited to spread my passion for science to a new generation of bright scientists. When I’m not doing science, I like to listen to music, draw, and practice magic.",
  },
  {
    name: "Trinity Truong",
    position: "Administrative Director",
    img: "/images/headshots/Trinity.png",
    fallback: "TT",
    description:
      "Hi! I'm Trinity, and I am currently finishing up my undergraduate degree in Cell and Developmental Biology at UBC. As the Administrative Director I have the pleasure of meeting all our volunteers and being a person that they can turn to regarding conflict, or requests needed for school. Besides volunteering with Jit Jots, I am currently a Clinical Research Assistant in different studies at UBC's Department of Emergency Medicine, and am a huge foodie that loves trying food around our city.",
  },
  {
    name: "Hannah Dalagan",
    position: "Outreach Team Lead",
    img: "/images/headshots/Hannah.png",
    fallback: "HD",
    description:
      "Hello there! I’m a recent B.Sc. Biochemistry graduate from UBC. As Outreach Lead, I schedule our Jit Jot workshops with youth programs and day camps in several community centers around Metro Vancouver. I’m also in charge of finding sponsors to keep Jit Jots going. Besides volunteering for Jit Jots, I also volunteer as a first aid responder and crisis responder and work as a lab technician in Richmond. During my down time, I love playing video games with my friends and crocheting stuffed toys.",
  },
  {
    name: "Brian Tang",
    position: "Design Team Lead",
    img: "/images/headshots/Brian.png",
    fallback: "BT",
    description:
      "Hello everyone! My name is Brian and I am a 5th year student studying biology at UBC and I am the design lead for Jit Jots. My job involves designing the workshops for Jit Jots which involves finding interesting science experiments to present, creating lesson plans and designing powerpoints for our learners! Outside of Jit Jots, I am a researcher for two clinical studies at VGH and I also volunteer for other organisations in the lower mainland.",
  },
  {
    name: "Breanna Harada",
    position: "Design Team Lead",
    img: "/images/headshots/Breanna.png",
    fallback: "BH",
    description:
      "Hi! My name is Breanna and I am one of the Design Lead’s at Jit Jots. As a Design Lead, I get the chance to create interesting and informative material for young scientists! I am currently studying Biology at UBC, and my scientific interests include cell biology and developmental biology. In my free time, I like to play guitar, watch sitcoms, and go hiking with friends.",
  },
  {
    name: "Kyara Salanga",
    position: "Communications Team Lead",
    img: "/images/headshots/Kyara.png",
    fallback: "KS",
    description:
      "Kyara is a third year student at Simon Fraser University and is the current president of the Canadian Cancer Society at school. She is an optometric intern, but she also has a variety of hobbies as well. She likes to play musical instruments, bake, cook, paint, read, and sing. She also likes video editing, as well as photography.",
  },
  {
    name: "Reina Yoo",
    position: "Outreach Team Lead",
    img: "/images/headshots/Reina.png",
    fallback: "RY",
    description:
      "Hello! My name is Reina and I am the Outreach Team Lead for Jit Jots. My role includes reaching out to sponsors, recruiting volunteers, and planning fundraising events! I am currently a 3rd year student studying Immunology and Public Health at UBC. I am particularly interested in how public health systems worldwide take different approaches to the spread of infectious diseases. In my spare time, I love going on hikes, playing tennis, and bullet journaling!",
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
    <main className="flex min-h-screen flex-col items-center px-4 lg:px-32 gap-20">
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
