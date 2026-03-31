"use client";

import workshopsHeroPic from "public/images/workshops-hero.png";
import Image from "next/image";
import { useState } from "react";
import dynamic from "next/dynamic";

const WorkshopsMap = dynamic(() => import("@/components/workshops-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full rounded-3xl bg-muted animate-pulse" />
  ),
});
import {
  ChevronRight,
  ChevronDown,
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

const ibmPlexMono = IBM_Plex_Mono({ weight: "700", subsets: ["latin"] });

type Activity = {
  name: string;
  ageGroup: string;
  description: string;
  agenda: string[];
  status: "present" | "past";
};

type Theme = {
  id: string;
  label: string;
  subtitle: string;
  activities: Activity[];
};

const themes: Theme[] = [
  {
    id: "chemistry",
    label: "Chemistry",
    subtitle: "Reactions, color changes & explosive experiments",
    activities: [
      {
        name: "Activity 1",
        ageGroup: "Ages 5+",
        status: "present",
        description:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim.",
        agenda: ["5 min — Introduction", "10 min — Safety overview", "30 min — Experiment", "15 min — Discussion"],
      },
      {
        name: "Activity 2",
        ageGroup: "Ages 5+",
        status: "present",
        description:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim.",
        agenda: ["5 min — Introduction", "10 min — Safety overview", "30 min — Experiment", "15 min — Discussion"],
      },
      {
        name: "Activity 3",
        ageGroup: "Ages 5+",
        status: "past",
        description:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim.",
        agenda: ["5 min — Introduction", "10 min — Safety overview", "30 min — Experiment", "15 min — Discussion"],
      },
    ],
  },
  {
    id: "biology",
    label: "Biology",
    subtitle: "Life science, cells & living organisms",
    activities: [
      {
        name: "Activity 1",
        ageGroup: "Ages 5+",
        status: "present",
        description:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim.",
        agenda: ["5 min — Introduction", "10 min — Safety overview", "30 min — Experiment", "15 min — Discussion"],
      },
      {
        name: "Activity 2",
        ageGroup: "Ages 5+",
        status: "past",
        description:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim.",
        agenda: ["5 min — Introduction", "10 min — Safety overview", "30 min — Experiment", "15 min — Discussion"],
      },
    ],
  },
  {
    id: "physics",
    label: "Physics",
    subtitle: "Forces, motion & energy experiments",
    activities: [
      {
        name: "Activity 1",
        ageGroup: "Ages 5+",
        status: "present",
        description:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim.",
        agenda: ["5 min — Introduction", "10 min — Safety overview", "30 min — Experiment", "15 min — Discussion"],
      },
    ],
  },
  {
    id: "space",
    label: "Space",
    subtitle: "Astronomy, planets & the solar system",
    activities: [
      {
        name: "Activity 1",
        ageGroup: "Ages 5+",
        status: "past",
        description:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim.",
        agenda: ["5 min — Introduction", "10 min — Safety overview", "30 min — Experiment", "15 min — Discussion"],
      },
    ],
  },
  {
    id: "environment",
    label: "Environment",
    subtitle: "Ecology, sustainability & earth science",
    activities: [
      {
        name: "Activity 1",
        ageGroup: "Ages 5+",
        status: "present",
        description:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim.",
        agenda: ["5 min — Introduction", "10 min — Safety overview", "30 min — Experiment", "15 min — Discussion"],
      },
    ],
  },
  {
    id: "engineering",
    label: "Engineering",
    subtitle: "Design, build & problem-solving challenges",
    activities: [
      {
        name: "Activity 1",
        ageGroup: "Ages 5+",
        status: "past",
        description:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim.",
        agenda: ["5 min — Introduction", "10 min — Safety overview", "30 min — Experiment", "15 min — Discussion"],
      },
    ],
  },
  {
    id: "human-body",
    label: "Human Body",
    subtitle: "Anatomy, senses & how we work",
    activities: [
      {
        name: "Activity 1",
        ageGroup: "Ages 5+",
        status: "present",
        description:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim.",
        agenda: ["5 min — Introduction", "10 min — Safety overview", "30 min — Experiment", "15 min — Discussion"],
      },
    ],
  },
];

function ActivitiesPanel({ activities }: { activities: Activity[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const present = activities.filter((a) => a.status === "present");
  const past = activities.filter((a) => a.status === "past");

  const renderList = (list: Activity[], label: string) =>
    list.length > 0 && (
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-widest uppercase px-1 text-muted-foreground">
          {label}
        </p>
        {list.map((activity, i) => {
          const key = `${activity.name}-${i}`;
          const isOpen = expanded.has(key);
          return (
            <div
              key={key}
              className="rounded-2xl border border-border bg-background overflow-hidden"
            >
              <button
                onClick={() => toggle(key)}
                className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-sm">{activity.name}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full border border-border text-muted-foreground font-medium shrink-0">
                    {activity.ageGroup}
                  </span>
                </div>
                <ChevronDown
                  size={14}
                  className={cn(
                    "shrink-0 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-180"
                  )}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-border/60">
                  <p className="text-sm text-muted-foreground leading-relaxed pt-3">
                    {activity.description}
                  </p>
                  <div className="space-y-1.5">
                    {activity.agenda.map((item, j) => {
                      const [time, label] = item.split("—").map((s) => s.trim());
                      return (
                        <div key={j} className="flex items-center gap-2 text-xs">
                          <span className="font-mono font-semibold bg-muted px-2 py-0.5 rounded text-foreground whitespace-nowrap">
                            {time}
                          </span>
                          <span className="text-muted-foreground">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );

  return (
    <div className="space-y-4">
      {renderList(present, "Upcoming")}
      {renderList(past, "Past")}
    </div>
  );
}

export default function Workshops() {
  const [activeThemeId, setActiveThemeId] = useState(themes[0].id);
  const activeTheme = themes.find((t) => t.id === activeThemeId)!;

  return (
    <main className="flex min-h-screen flex-col items-center lg:px-32 gap-20">
      <div className="container pt-10 sm:pt-16 space-y-24">

        {/* Hero */}
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
              <p className="text-xl text-muted-foreground">
                We recommend booking <b>at least one month ahead</b> to secure your date
                and allow time for workshop preparation. We may not be able to accommodate
                workshops booked on short notice.
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

          {/* Stats */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
            {[
              { icon: Timer, label: "1 hour of educational fun" },
              { icon: Settings2, label: "Customized to specific age groups" },
              { icon: CircleDollarSign, label: "Budget-friendly" },
              { icon: FlaskConical, label: "Hands on experiments" },
              { icon: Palette, label: "Broad range of science themes" },
              { icon: Lightbulb, label: "Encourages critical thinking" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl bg-muted px-5 py-4">
                <Icon strokeWidth={1.5} className="shrink-0 w-6 h-6 text-muted-foreground" />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Workshop Themes */}
        <div className="space-y-6 pb-24">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
              Workshop Themes
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Select a theme to explore activities, agenda, and age groups.
            </p>
          </div>

          <div className="grid grid-cols-[180px_1fr] gap-6 items-start">

            {/* Theme nav — left side vertical column */}
            <div className="flex flex-col gap-1 sticky top-24">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setActiveThemeId(theme.id)}
                  className={cn(
                    "text-left px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-150",
                    activeThemeId === theme.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {theme.label}
                </button>
              ))}
            </div>

            {/* Theme content — right side */}
            <div className="border border-border rounded-3xl p-6 space-y-5 bg-muted/10 min-h-[300px]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">{activeTheme.label}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {activeTheme.subtitle}
                  </p>
                </div>
                <span className="text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground font-medium shrink-0">
                  {activeTheme.activities.length}{" "}
                  {activeTheme.activities.length === 1 ? "activity" : "activities"}
                </span>
              </div>
              <ActivitiesPanel activities={activeTheme.activities} />
            </div>

          </div>
        </div>

        {/* Where We Run */}
        <div className="space-y-6 pb-24">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
              Where We Run
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Schools, community centres, and neighbourhood houses across Vancouver.
            </p>
          </div>
          <div className="w-full rounded-3xl overflow-hidden aspect-[16/7]">
            <WorkshopsMap />
          </div>
        </div>

      </div>
    </main>
  );
}
