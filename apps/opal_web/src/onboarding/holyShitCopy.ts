/**
 * Holy Shit first-run Moments 1–5 — founder copy + fixture spots.
 * Timing choreography lives in components (400 / 800 / 900 / 200 / 50ms).
 */

export const HOLY_SHIT_COPY = {
  landingHook: "Tell Opal who matters. Watch what happens.",
  greeting: "Hey. I'm Opal. I help you actually see the people you care about.",
  askName: "Who's someone you've been meaning to catch up with?",
  namePlaceholder: "Type a name...",
  askWhen: (name: string) => `Nice. When do you want to see ${name}?`,
  askVibe: "What kind of vibe?",
  whenPills: ["This week", "This weekend", "Pick a day"] as const,
  vibePills: ["Dinner", "Drinks", "Something active", "Coffee"] as const,
  workingTitle: "Watch Opal work",
  stepCalendar: "Checking your calendar...",
  stepCalendarDone: "Free slots this week",
  stepCalendarGrace: "I'll work around your schedule.",
  stepTaste: (name: string) => `Thinking about ${name}...`,
  stepTasteDone: "Taste memory ready",
  stepTasteEmpty: "No preferences yet — I'll learn.",
  stepSpots: "Finding spots...",
  trustPreviewLead: (name: string) => `I'll message ${name}:`,
  willLabel: "I will:",
  willSend: "Send this one message",
  wontLabel: "I won't:",
  wontCalendar: "Share your calendar",
  wontAnyoneElse: "Message anyone else",
  wontBook: "Book anything yet",
  sendIt: "Send it",
  notYet: "Not yet",
  messageBody: (name: string, vibe: string, when: string, spot: string) =>
    `Hey ${name} — want to grab ${vibe.toLowerCase()} ${when.toLowerCase()}? I found ${spot} and thought of you.`,
} as const;

export type HolyShitWhen = (typeof HOLY_SHIT_COPY.whenPills)[number];
export type HolyShitVibe = (typeof HOLY_SHIT_COPY.vibePills)[number];

export type HolyShitSpot = {
  id: string;
  name: string;
  why: string;
  price: string;
  photo: string;
};

/** Fixture cards when places/curate is unavailable (no /api/places/curate in product). */
export const HOLY_SHIT_FIXTURE_SPOTS: HolyShitSpot[] = [
  {
    id: "juniper-ivy",
    name: "Juniper & Ivy",
    why: "Quiet dinner energy · easy to talk",
    price: "$$",
    photo: "/figma-v2/home-201/media-juniper.png",
  },
  {
    id: "osteria-bruno",
    name: "Osteria Bruno",
    why: "Warm pasta room · shared plates",
    price: "$$",
    photo: "/demo/moments/restaurant.jpg",
  },
  {
    id: "copper-hen",
    name: "The Copper Hen",
    why: "Lively but not loud · walkable",
    price: "$$$",
    photo: "/demo/moments/food.jpg",
  },
];

export type MeetOpalPhase =
  | "greeting"
  | "ask_name"
  | "ask_when"
  | "ask_vibe"
  | "working"
  | "trust";

export type HolyShitOnboardingState = {
  contactName: string;
  when: HolyShitWhen | null;
  vibe: HolyShitVibe | null;
  spot: HolyShitSpot | null;
  contactPersisted: boolean;
};
