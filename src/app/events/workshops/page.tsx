'use client';

import workshopsHeroPic from 'public/images/workshops-hero.png';
import Image from 'next/image';
import { useState } from 'react';
import dynamic from 'next/dynamic';

const WorkshopsMap = dynamic(() => import('@/components/workshops-map'), {
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { IBM_Plex_Mono } from 'next/font/google';
import Link from 'next/link';

const ibmPlexMono = IBM_Plex_Mono({ weight: '700', subsets: ['latin'] });

type Station = {
  duration: string;
  label: string;
  description: string;
};

type Activity = {
  name: string;
  summary: string;
  preamble: { duration: string; label: string }[];
  stations: Station[];
  status: 'present' | 'past';
};

type Theme = {
  id: string;
  label: string;
  subtitle: string;
  outcomeHeadline: string;
  snapshot: { duration: string; format: string };
  steps: string[];
  activities: Activity[];
};

const AGE_COLORS = [
  {
    accordion: 'border-l-2 border-l-amber-400',
    header: 'hover:bg-amber-50/40 dark:hover:bg-amber-950/20',
    stationBg: 'bg-amber-50/50 dark:bg-amber-950/20',
  },
  {
    accordion: 'border-l-2 border-l-blue-400',
    header: 'hover:bg-blue-50/40 dark:hover:bg-blue-950/20',
    stationBg: 'bg-blue-50/50 dark:bg-blue-950/20',
  },
  {
    accordion: 'border-l-2 border-l-slate-400',
    header: 'hover:bg-slate-50/40 dark:hover:bg-slate-950/20',
    stationBg: 'bg-slate-50/50 dark:bg-slate-950/20',
  },
];

const themes: Theme[] = [
  {
    id: 'forensics',
    label: 'Forensics',
    subtitle: 'Clues, evidence & mystery-solving stations',
    outcomeHeadline: 'Solve a Mystery Using Real Forensic Techniques',
    snapshot: {
      duration: '1 hour',
      format: 'Rotating Stations',
    },
    steps: [
      'Split into small teams',
      'Complete the station activity',
      'Receive a clue',
      'Rotate to the next station',
      'Solve the mystery together',
    ],
    activities: [
      {
        name: 'Ages 3–6',
        summary: 'Sensory exploration & basic observation skills',
        status: 'present',
        preamble: [
          { duration: '1 min', label: 'Introduction' },
          { duration: '4 mins', label: 'Mission Briefing: What happened?' },
        ],
        stations: [
          {
            duration: '15 mins',
            label: 'Magnifying-glass observation',
            description:
              'Spot hidden traces the robber left at the crime scene',
          },
          {
            duration: '15 mins',
            label: 'Shoe-print matching',
            description:
              "Match the print pattern to identify the suspect's shoes",
          },
          {
            duration: '15 mins',
            label: 'Fingerprint stamping',
            description:
              'Stamp your fingerprint with washable ink and see what makes it unique',
          },
          {
            duration: '15 mins',
            label: "What's in the Mystery Box?",
            description: 'Reach in and identify the stolen tool by touch alone',
          },
        ],
      },
      {
        name: 'Ages 7–11',
        summary: 'Intro forensic science & hands-on experiments',
        status: 'present',
        preamble: [
          { duration: '1 min', label: 'Introduction' },
          { duration: '4 mins', label: 'Mission Briefing: What happened?' },
        ],
        stations: [
          {
            duration: '15 mins',
            label: 'Invisible Ink experiment',
            description:
              'Hide a secret message using lemon juice—then reveal it with heat or chemistry',
          },
          {
            duration: '15 mins',
            label: 'Fingerprint dusting',
            description:
              'Lift and identify prints at the scene using cocoa powder or graphite',
          },
          {
            duration: '15 mins',
            label: 'Blood typing',
            description:
              'Test mock blood samples with reagents to determine blood type and narrow suspects',
          },
          {
            duration: '15 mins',
            label: 'Suspect elimination',
            description:
              'Cross-reference clues from all stations to deduce who committed the crime',
          },
        ],
      },
      {
        name: 'Ages 12+',
        summary: 'Analytical thinking & real forensic techniques',
        status: 'present',
        preamble: [
          { duration: '1 min', label: 'Introduction' },
          { duration: '4 mins', label: 'Mission Briefing: What happened?' },
        ],
        stations: [
          {
            duration: '15 mins',
            label: 'Invisible Ink experiment',
            description:
              'Explore the chemistry of lemon juice as a heat-sensitive or reactive substance',
          },
          {
            duration: '15 mins',
            label: 'Fingerprint lifting with tape',
            description:
              'Lift latent prints and analyze ridge patterns to match a suspect',
          },
          {
            duration: '15 mins',
            label: 'Blood typing',
            description:
              'Use Anti-A, Anti-B, and Anti-Rh solutions to identify blood type and determine the culprit',
          },
          {
            duration: '10 mins',
            label: 'Blood splatter analysis',
            description:
              'Reconstruct what happened at the scene by analyzing splatter angles',
          },
          {
            duration: '5 mins',
            label: "Prisoner's Dilemma",
            description:
              'Roleplay a game-theory scenario—cooperate or betray to see who walks free',
          },
        ],
      },
    ],
  },
  {
    id: '3d-printing',
    label: '3D Printing',
    subtitle: 'Design, build & test layer-by-layer creations',
    outcomeHeadline: 'Design, Build & Test Your Own 3D-Printed Object',
    snapshot: {
      duration: '1 hour',
      format: 'Hands-On Build',
    },
    steps: [
      'Introduction to 3D printing',
      'Model how a 3D printer works',
      'Design your object on paper',
      'Build it layer by layer',
      'Test and iterate your creation',
      'Showcase and take it home',
    ],
    activities: [
      {
        name: 'Ages 7–11',
        summary: 'Creative design & hands-on construction',
        status: 'present',
        preamble: [
          { duration: '5 mins', label: 'Introduction' },
          { duration: '5 mins', label: 'How 3D Printers Work' },
        ],
        stations: [
          {
            duration: '15 mins',
            label: 'Paper Design Activity',
            description:
              'Draw the pieces needed to make a simple object — cube, sphere, or figure',
          },
          {
            duration: '25 mins',
            label: 'Become the 3D Printer',
            description:
              'Physically construct a 3D object using craft materials, building one layer at a time',
          },
          {
            duration: '5 mins',
            label: 'Testing & Iteration',
            description:
              'Test whether your creation carries out its intended function and make improvements',
          },
          {
            duration: '5 mins',
            label: 'Showcase & Reflection',
            description:
              'Present your creation to other learners — and take it home!',
          },
        ],
      },
      {
        name: 'Ages 12+',
        summary: 'CAD thinking & engineering iteration',
        status: 'present',
        preamble: [
          { duration: '5 mins', label: 'Introduction' },
          { duration: '5 mins', label: 'How 3D Printers Work' },
        ],
        stations: [
          {
            duration: '15 mins',
            label: 'Paper CAD Design Activity',
            description:
              'Use isometric grid paper and index cards to design a 3D object in layers — understanding how slicing works',
          },
          {
            duration: '25 mins',
            label: 'Become the 3D Printer',
            description:
              'Physically construct a 3D object using craft materials, building one layer at a time',
          },
          {
            duration: '5 mins',
            label: 'Testing & Iteration',
            description:
              'Test whether your creation carries out its intended function and make improvements',
          },
          {
            duration: '5 mins',
            label: 'Showcase & Reflection',
            description:
              'Present your creation to other learners — and take it home!',
          },
        ],
      },
    ],
  },
  {
    id: 'space',
    label: 'Space',
    subtitle: 'Gravity, rockets & the physics of the universe',
    outcomeHeadline: 'Explore the Physics of Space Through Live Experiments',
    snapshot: {
      duration: '1 hour',
      format: 'Guided Demonstration',
    },
    steps: [
      'Introduction by Jit Jots team member',
      'Watch live demonstrations',
      'Participate in hands-on activities',
      'Create a take-home project',
    ],
    activities: [
      {
        name: 'Ages 3–6',
        summary: 'Sensory science & creative space crafts',
        status: 'present',
        preamble: [{ duration: '5 mins', label: 'Introduction' }],
        stations: [
          {
            duration: '5 mins',
            label: 'Phone Book Drop',
            description:
              'See how gravity pulls different objects at the same constant force',
          },
          {
            duration: '10 mins',
            label: 'Dry Ice Demonstration',
            description:
              'Interact with dry ice and watch it make fog and bubbles',
          },
          {
            duration: '5–10 mins',
            label: 'Rocket Balloon Blast',
            description:
              "Watch balloons fly across the room and learn about Newton's Third Law of Motion",
          },
          {
            duration: '10 mins',
            label: 'Constellations with Pipe Cleaners',
            description:
              'Shape your own constellation with pipe cleaners — take it home after the workshop!',
          },
          {
            duration: '15 mins',
            label: 'Glow in the Dark Slime',
            description:
              'Make your own glow-in-the-dark slime to play with and keep',
          },
        ],
      },
      {
        name: 'Ages 7–11',
        summary: 'Reactions, optics & UV science',
        status: 'present',
        preamble: [{ duration: '5 mins', label: 'Introduction' }],
        stations: [
          {
            duration: '5 mins',
            label: 'Phone Book Drop',
            description:
              'See how gravity pulls different objects at the same constant force',
          },
          {
            duration: '10 mins',
            label: 'Dry Ice Demonstration',
            description:
              'Interact with dry ice and watch it make fog and bubbles',
          },
          {
            duration: '10 mins',
            label: 'Rocket Balloon Blast',
            description:
              "Use chemical reactions to launch a makeshift rocket and learn about Newton's Third Law",
          },
          {
            duration: '15 mins',
            label: 'Constellation Flashlight Viewer',
            description: 'Build your own mini constellation projector',
          },
          {
            duration: '15 mins',
            label: 'UV Bead Sun Detector',
            description:
              'Make a UV bead bracelet that changes colour when exposed to sunlight',
          },
        ],
      },
      {
        name: 'Ages 12+',
        summary: 'Engineering design & real-world space challenges',
        status: 'present',
        preamble: [{ duration: '5 mins', label: 'Introduction' }],
        stations: [
          {
            duration: '5 mins',
            label: 'Phone Book Drop',
            description:
              'See how gravity pulls different objects at the same constant force',
          },
          {
            duration: '10 mins',
            label: 'Dry Ice Demonstration',
            description:
              'Interact with dry ice and watch it make fog and bubbles',
          },
          {
            duration: '40 mins',
            label: 'Egg Drop — Mars Landing Challenge',
            description:
              'Design and build a lander that protects your astronaut (egg) touching down on Mars',
          },
        ],
      },
    ],
  },
  {
    id: 'reactions',
    label: 'Reactions',
    subtitle: 'Volcanoes, potions & explosive chemistry',
    outcomeHeadline: 'Witness & Participate in Real Chemical Reactions Live',
    snapshot: {
      duration: '1 hour',
      format: 'Live Demonstration',
    },
    steps: [
      'Introduction by Jit Jots team member',
      'Watch each experiment demonstrated live',
      'Participate alongside the team',
      'Observe and discuss what happened',
    ],
    activities: [
      {
        name: 'Ages 3–6',
        summary: 'Colourful, sensory chemistry experiments',
        status: 'present',
        preamble: [{ duration: '5 mins', label: 'Introduction' }],
        stations: [
          {
            duration: '10 mins',
            label: 'Dry Ice Demonstration',
            description:
              'Interact with dry ice and see how it can be used to make fog and bubbles',
          },
          {
            duration: '10 mins',
            label: 'Lemon Volcanoes',
            description:
              'Turn an ordinary lemon into a bubbling, fizzing, overflowing volcano',
          },
          {
            duration: '10 mins',
            label: 'Gaviscon Worms',
            description:
              'Watch colourful, jelly-like worms form right before your eyes through polymerization',
          },
          {
            duration: '10 mins',
            label: 'Apple Oxidation Experiment',
            description:
              'Watch apples change colour when exposed to air and learn how reactions can be slowed down',
          },
          {
            duration: '10 mins',
            label: 'pH Potion',
            description:
              'Pour in a mystery liquid and watch your potion instantly change colour',
          },
          {
            duration: '5 mins',
            label: 'Whoosh Bottle',
            description: 'Learn about combustion in this explosive experiment',
          },
        ],
      },
      {
        name: 'Ages 7–11',
        summary: 'Acid-base reactions & secret chemistry',
        status: 'present',
        preamble: [{ duration: '5 mins', label: 'Introduction' }],
        stations: [
          {
            duration: '10 mins',
            label: 'Dry Ice Demonstration',
            description:
              'Interact with dry ice and see how it can be used to make fog and bubbles',
          },
          {
            duration: '15 mins',
            label: 'Lemon Volcano',
            description:
              'Create a fizzy volcano with an acid-base reaction using a real fruit',
          },
          {
            duration: '15 mins',
            label: 'Invisible Ink',
            description:
              'Write secret messages and reveal them using different types of chemical reactions',
          },
          {
            duration: '10 mins',
            label: 'pH Potion',
            description:
              'Pour in a mystery liquid and watch your potion instantly change colour',
          },
          {
            duration: '5 mins',
            label: 'Whoosh Bottle',
            description: 'Learn about combustion in this explosive experiment',
          },
        ],
      },
      {
        name: 'Ages 12+',
        summary: 'Catalysts, carbon dioxide & combustion',
        status: 'present',
        preamble: [{ duration: '5 mins', label: 'Introduction' }],
        stations: [
          {
            duration: '10 mins',
            label: 'Dry Ice Demonstration',
            description:
              'Interact with dry ice and see how it can be used to make fog and bubbles',
          },
          {
            duration: '15 mins',
            label: 'Elephant Toothpaste',
            description:
              'Create a rapid foam eruption using a catalyst to speed up a chemical reaction',
          },
          {
            duration: '15 mins',
            label: 'Mentos & Soda',
            description:
              'Drop Mentos into soda to trigger a rapid CO₂ release and launch a geyser of spray',
          },
          {
            duration: '10 mins',
            label: 'pH Potion',
            description:
              'Pour in a mystery liquid and watch your potion instantly change colour',
          },
          {
            duration: '5 mins',
            label: 'Whoosh Bottle',
            description: 'Learn about combustion in this explosive experiment',
          },
        ],
      },
    ],
  },
  {
    id: 'inventors-engineers',
    label: 'Inventors & Engineers',
    subtitle: 'Design challenges & team build competitions',
    outcomeHeadline: 'Compete to Build the Best Objects!',
    snapshot: {
      duration: '1 hour',
      format: 'Team Competition',
    },
    steps: [
      'Introduction',
      'Form groups and receive briefing',
      'Design your approach',
      'Build and test your creation',
      'Present and compare results',
    ],
    activities: [
      {
        name: 'Ages 3–6',
        summary: 'Creative building & simple engineering challenges',
        status: 'present',
        preamble: [
          { duration: '1 min', label: 'Introduction' },
          { duration: '4 mins', label: 'Group formation & briefing' },
        ],
        stations: [
          {
            duration: '15 mins',
            label: 'Paper Airplane Design',
            description:
              'Design on paper then fold your own airplane — whose flies furthest?',
          },
          {
            duration: '15 mins',
            label: 'DIY Projector',
            description: 'Design and build your own simple projector',
          },
          {
            duration: '30 mins',
            label: 'Tallest Tower',
            description:
              'Build the tallest tower possible using only spaghetti and marshmallows',
          },
        ],
      },
      {
        name: 'Ages 7–12+',
        summary: 'Engineering design & competitive building',
        status: 'present',
        preamble: [
          { duration: '1 min', label: 'Introduction' },
          { duration: '4 mins', label: 'Group formation & briefing' },
        ],
        stations: [
          {
            duration: '30 mins',
            label: 'Egg Drop Contest',
            description:
              'Design and build a parachute that protects an egg from cracking when dropped from height',
          },
          {
            duration: '30 mins',
            label: 'Tallest Tower',
            description:
              'Build the tallest tower possible using only spaghetti and marshmallows',
          },
        ],
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

  const present = activities.filter((a) => a.status === 'present');
  const past = activities.filter((a) => a.status === 'past');

  const renderList = (
    list: Activity[],
    sectionLabel: string,
    indexOffset = 0,
  ) =>
    list.length > 0 && (
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-widest uppercase px-1 text-muted-foreground">
          {sectionLabel}
        </p>
        {list.map((activity, i) => {
          const key = `${activity.name}-${i}`;
          const isOpen = expanded.has(key);
          const colors = AGE_COLORS[(i + indexOffset) % AGE_COLORS.length];
          return (
            <div
              key={key}
              className={cn(
                'rounded-2xl border border-border bg-background overflow-hidden',
                colors.accordion,
              )}
            >
              <button
                onClick={() => toggle(key)}
                className={cn(
                  'w-full flex items-center justify-between gap-3 p-4 text-left transition-colors',
                  colors.header,
                )}
              >
                <div className="min-w-0">
                  <span className="font-semibold text-sm block">
                    {activity.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {activity.summary}
                  </span>
                </div>
                <ChevronDown
                  size={14}
                  className={cn(
                    'shrink-0 text-muted-foreground transition-transform duration-200',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 space-y-4 border-t border-border/60 pt-4">
                  {/* Preamble */}
                  <div className="space-y-1.5">
                    {activity.preamble.map((item, j) => (
                      <div key={j} className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-semibold bg-muted px-2 py-0.5 rounded text-foreground whitespace-nowrap">
                          {item.duration}
                        </span>
                        <span className="text-muted-foreground">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Station cards */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                      Stations
                    </p>
                    {activity.stations.map((station, j) => (
                      <div
                        key={j}
                        className={cn(
                          'rounded-xl px-3 py-3 flex items-start justify-between gap-3',
                          colors.stationBg,
                        )}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="text-xs font-bold text-muted-foreground shrink-0 w-4 text-right mt-0.5">
                            {j + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">
                              {station.label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {station.description}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5">
                          {station.duration}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );

  const presentOffset = 0;
  const pastOffset = present.length;

  return (
    <div className="space-y-4">
      {renderList(present, 'Upcoming', presentOffset)}
      {renderList(past, 'Past', pastOffset)}
    </div>
  );
}

type RequestForm = {
  ageGroups: string[];
  duration: string;
  theme: string;
  style: string;
  notes: string;
};

const AGE_GROUP_OPTIONS = ['3–6', '7–11', '12+'];
const DURATION_OPTIONS = ['30 mins', '1 hour', '1 hour 30 mins'];
const STYLE_OPTIONS = ['Presentation', 'Hands-on'];

function WorkshopRequestForm() {
  const [form, setForm] = useState<RequestForm>({
    ageGroups: [],
    duration: '',
    theme: '',
    style: '',
    notes: '',
  });
  const toggleAge = (age: string) =>
    setForm((f) => ({
      ...f,
      ageGroups: f.ageGroups.includes(age)
        ? f.ageGroups.filter((a) => a !== age)
        : [...f.ageGroups, age],
    }));

  return (
    <div className="rounded-3xl border border-border bg-muted/10 p-6 space-y-6">
      {/* Age group */}
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Audience age group
        </p>
        <div className="flex flex-wrap gap-2">
          {AGE_GROUP_OPTIONS.map((age) => {
            const selected = form.ageGroups.includes(age);
            return (
              <button
                key={age}
                type="button"
                onClick={() => toggleAge(age)}
                className={cn(
                  'px-4 py-2 rounded-2xl text-sm font-medium border transition-colors',
                  selected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                Ages {age}
              </button>
            );
          })}
        </div>
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Workshop duration
        </p>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setForm((f) => ({ ...f, duration: d }))}
              className={cn(
                'px-4 py-2 rounded-2xl text-sm font-medium border transition-colors',
                form.duration === d
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Science theme
        </p>
        <input
          type="text"
          placeholder="e.g. Biology, Robotics, Chemistry…"
          value={form.theme}
          onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))}
          className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Style */}
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Workshop style
        </p>
        <div className="flex flex-wrap gap-2">
          {STYLE_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setForm((f) => ({ ...f, style: s }))}
              className={cn(
                'px-4 py-2 rounded-2xl text-sm font-medium border transition-colors',
                form.style === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Special considerations */}
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Special considerations{' '}
          <span className="normal-case font-normal text-muted-foreground/60">
            (optional)
          </span>
        </p>
        <textarea
          rows={3}
          placeholder="Allergies, accessibility needs, preferred dates, group size…"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
      </div>

      <Button
        className={cn(
          ibmPlexMono.className,
          'text-base h-11 [word-spacing:-0.5ch]',
        )}
      >
        <ChevronRight className="-ml-2" strokeWidth={3} />
        SEND REQUEST
      </Button>
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
                We recommend booking <b>at least one month ahead</b> to secure
                your date and allow time for workshop preparation. We may not be
                able to accommodate workshops booked on short notice.
              </p>
              <Link href="https://forms.gle/aJbnMDKzNFnuWeDB6">
                <Button
                  className={cn(
                    ibmPlexMono.className,
                    'mt-4 text-lg h-12 [word-spacing:-0.5ch]',
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
              { icon: Timer, label: '1 hour of educational fun' },
              { icon: Settings2, label: 'Customized to specific age groups' },
              { icon: CircleDollarSign, label: 'Budget-friendly' },
              { icon: FlaskConical, label: 'Hands on experiments' },
              { icon: Palette, label: 'Broad range of science themes' },
              { icon: Lightbulb, label: 'Encourages critical thinking' },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-2xl bg-muted px-5 py-4"
              >
                <Icon
                  strokeWidth={1.5}
                  className="shrink-0 w-6 h-6 text-muted-foreground"
                />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Workshop Themes */}
        <div className="space-y-6">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
              Workshop Themes
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Select a theme to explore activities, agenda, and age groups.
            </p>
          </div>

          <div className="grid grid-cols-[180px_1fr] gap-6 items-start">
            {/* Theme nav */}
            <div className="flex flex-col gap-1 sticky top-24">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setActiveThemeId(theme.id)}
                  className={cn(
                    'text-left px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-150',
                    activeThemeId === theme.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {theme.label}
                </button>
              ))}
            </div>

            {/* Theme content */}
            <div className="border border-border rounded-3xl p-6 space-y-6 bg-muted/10 min-h-[300px]">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">{activeTheme.label}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {activeTheme.subtitle}
                  </p>
                </div>
                <span className="text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground font-medium shrink-0">
                  {activeTheme.activities.length}{' '}
                  {activeTheme.activities.length === 1
                    ? 'age group'
                    : 'age groups'}
                </span>
              </div>

              {/* Outcome headline + Snapshot */}
              <div className="flex items-stretch gap-3">
                <div className="rounded-2xl bg-primary/5 border border-primary/15 px-4 py-3 flex-1 flex items-center">
                  <p className="text-base font-bold">
                    {activeTheme.outcomeHeadline}
                  </p>
                </div>
                {[
                  { label: 'Duration', value: activeTheme.snapshot.duration },
                  { label: 'Format', value: activeTheme.snapshot.format },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-2xl bg-primary/5 border border-primary/15 px-3 py-2 shrink-0"
                  >
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-semibold">{value}</p>
                  </div>
                ))}
              </div>

              {/* How it works */}
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                  How it works
                </p>
                <ol className="space-y-1.5">
                  {activeTheme.steps.map((step, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm">
                      <span className="font-mono text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Age group accordions */}
              <ActivitiesPanel activities={activeTheme.activities} />
            </div>
          </div>
        </div>

        {/* Request a Workshop */}
        <div className="space-y-6">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
              Request a Workshop
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Tell us what you&apos;re looking for and we&apos;ll get back to
              you with a custom proposal.
            </p>
          </div>
          <WorkshopRequestForm />
        </div>

        {/* Where We Run */}
        <div className="space-y-6 pb-24">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
              Where We Run
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Schools, community centres, and neighbourhood houses across
              Vancouver.
            </p>
          </div>
          <div className="w-full rounded-3xl overflow-hidden aspect-[16/7] isolate">
            <WorkshopsMap />
          </div>
        </div>
      </div>
    </main>
  );
}
