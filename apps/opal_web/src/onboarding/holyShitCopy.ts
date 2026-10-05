/**
 * Holy Shit first-run Moments 1–5 — founder copy + fixture spots.
 * v2: 3–5 people · contact-before-curate · network-effects choreography.
 */

export const HOLY_SHIT_COPY = {
  landingHook: "Tell Opal who matters. Watch what happens.",
  greeting: "Hey. I'm Opal. I help you actually see the people you care about.",
  askPeople: "Who are 3–5 people you've been meaning to see more of?",
  peoplePlaceholder: "Type a name…",
  peopleHint1: "Great start. Add a couple more?",
  peopleHint3: "Perfect. Let's make some magic.",
  peopleContinue: "Continue",
  peopleMax: 5,
  peopleMinSuggest: 3,
  askResolve:
    "Want me to find them in your contacts, or add them fresh?",
  resolveFind: "Find in contacts",
  resolveFresh: "Add them fresh",
  askPhone: (name: string) => `What's ${name}'s number?`,
  phonePlaceholder: "Phone number",
  phoneContinue: "Save",
  phoneSkip: "Skip for now",
  resolveDone: (n: number) =>
    n === 1 ? "Got it. One person locked in." : `Got it. ${n} people locked in.`,
  askWhen: (names: string) => `Nice. When do you want to see ${names}?`,
  askVibeMode: "Same vibe for everyone, or different for each?",
  vibeModeGroup: (n: number) => (n <= 1 ? "One plan" : `Same for all ${n}`),
  vibeModeEach: "Different for each",
  askVibe: "What kind of vibe?",
  askVibeFor: (name: string) => `What kind of vibe with ${name}?`,
  whenPills: ["This week", "This weekend", "Pick a day"] as const,
  vibePills: ["Dinner", "Drinks", "Something active", "Coffee"] as const,
  workingTitle: "Watch Opal work",
  stepCalendar: "Checking your calendar...",
  stepCalendarDone: "You're free Friday and Saturday evening",
  stepCalendarGrace: "You're free Friday and Saturday evening",
  stepTaste: (names: string) => `Thinking about ${names}...`,
  stepTasteDone: "She mentioned loving Italian last month",
  stepTasteEmpty: "No preferences yet — I'll learn.",
  stepSpots: "Finding spots...",
  stepSpotsMulti: "Finding a spot for each of you...",
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
  /** @deprecated use askPeople — kept for source-contract tests during transition */
  askName: "Who are 3–5 people you've been meaning to see more of?",
  namePlaceholder: "Type a name…",
} as const;

export type HolyShitWhen = (typeof HOLY_SHIT_COPY.whenPills)[number];
export type HolyShitVibe = (typeof HOLY_SHIT_COPY.vibePills)[number];
export type HolyShitVibeMode = "group" | "per_person";

export type HolyShitPerson = {
  name: string;
  phone?: string;
  source?: "contacts" | "fresh" | "skipped";
};

export type HolyShitSpot = {
  id: string;
  name: string;
  why: string;
  price: string;
  photo: string;
  /** Optional person this spot is curated for (per-person mode). */
  forName?: string;
};

/** Fixture cards when places/curate is unavailable (no /api/places/curate in product). */
export const HOLY_SHIT_FIXTURE_SPOTS: HolyShitSpot[] = [
  {
    id: "juniper-ivy",
    name: "Juniper & Ivy",
    why: "Cozy, quiet — good for catching up.",
    price: "$$",
    photo: "/figma-v2/home-201/media-juniper.png",
  },
  {
    id: "osteria-bruno",
    name: "Osteria Bruno",
    why: "Loved the pasta here last time.",
    price: "$$",
    photo: "/demo/moments/restaurant.jpg",
  },
  {
    id: "copper-hen",
    name: "The Copper Hen",
    why: "Lively, great for weekends.",
    price: "$",
    photo: "/demo/moments/food.jpg",
  },
];

export type MeetOpalPhase =
  | "greeting"
  | "ask_people"
  | "resolve_contacts"
  | "ask_when"
  | "ask_vibe_mode"
  | "ask_vibe"
  | "working"
  | "trust";

export type HolyShitOnboardingState = {
  /** Primary / first person — backward-compatible field for callers. */
  contactName: string;
  people: HolyShitPerson[];
  when: HolyShitWhen | null;
  vibeMode: HolyShitVibeMode | null;
  /** Shared vibe when vibeMode === "group". */
  vibe: HolyShitVibe | null;
  /** Per-person vibes when vibeMode === "per_person". */
  vibesByName: Record<string, HolyShitVibe>;
  spot: HolyShitSpot | null;
  contactPersisted: boolean;
};

export function formatPeopleList(names: string[]): string {
  if (names.length === 0) return "them";
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}
