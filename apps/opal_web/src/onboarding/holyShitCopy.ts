/**
 * Holy Shit first-run Moments 1–5 — founder copy + fixture spots.
 * One person · type name or Select from contacts · when → vibe → curate → trust.
 */

export const HOLY_SHIT_COPY = {
  landingHook: "Tell Opal who matters. Watch what happens.",
  greeting: "Hey. I'm Opal. I help you actually see the people you care about.",
  askPeople: "Who's someone you've been meaning to catch up with?",
  /** @deprecated alias — one-person ask */
  askName: "Who's someone you've been meaning to catch up with?",
  peoplePlaceholder: "Type a name…",
  namePlaceholder: "Type a name…",
  peopleContinue: "Continue",
  resolveSelect: "Select from contacts",
  askMore: (name: string) =>
    `Got it. Want to add anyone else, or shall we plan something with ${name}?`,
  addAnother: "Add another",
  letsPlan: "Let's plan",
  askWhen: (name: string) => `Nice. When do you want to see ${name}?`,
  askVibe: "What kind of vibe?",
  askVibeFor: (name: string) => `What kind of vibe with ${name}?`,
  whenPills: ["This week", "This weekend", "Pick a day"] as const,
  vibePills: ["Dinner", "Drinks", "Coffee", "Something active", "Church"] as const,
  vibeCustom: "Something else…",
  vibeCustomPlaceholder: "What kind of vibe?",
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
  /** Soft cap — choreography allows Add another; plan uses the first name. */
  peopleMax: 5,
  peopleMinSuggest: 1,
  peopleHint1: "",
  peopleHint3: "",
  askResolve: "Select them from your contacts so Opal can reach them.",
  resolveSkip: "Continue without contacts",
  resolveDone: (_n: number) => "Got it.",
  askVibeMode: "Same vibe for everyone, or different for each?",
  vibeModeGroup: (_n: number) => "One plan",
  vibeModeEach: "Different for each",
} as const;

export type HolyShitWhen = (typeof HOLY_SHIT_COPY.whenPills)[number];
/** Built-in vibe pill or a custom typed string (e.g. "church"). */
export type HolyShitVibe = string;
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
  | "ask_more"
  | "ask_when"
  | "ask_vibe"
  | "working"
  | "trust";

export type HolyShitOnboardingState = {
  contactName: string;
  people: HolyShitPerson[];
  when: HolyShitWhen | null;
  vibeMode: HolyShitVibeMode | null;
  vibe: HolyShitVibe | null;
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
