/**
 * Holy Shit first-run Moments 1-5 - founder copy + fixture spots.
 * One person · type name or Select from contacts · when → vibe → curate → trust.
 */

export const HOLY_SHIT_COPY = {
 landingHook: "Tell Opal who you want to stay close with.",
 greeting:
 "Hey, I'm Opal. I keep up with your people so you don't have to - birthdays, making plans, staying in touch. Who's someone you've been meaning to catch up with?",
 askPeople: "Who's someone you've been meaning to catch up with?",
 /** @deprecated alias - one-person ask */
 askName: "Who's someone you've been meaning to catch up with?",
 peoplePlaceholder: "Type a name…",
 namePlaceholder: "Type a name…",
 peopleContinue: "Continue",
 resolveSelect: "Choose from contacts",
 contactsDeniedOnce:
 "You can enable contacts later in Settings to pick people directly.",
 contactsNoPhone: (name: string) =>
 `${name} has no phone number - add one to invite.`,
 pullingUp: (name: string) => `Looking up ${name} in your contacts…`,
 confirmContact: (name: string, phone: string) =>
 phone ? `Got it - ${name} · ${phone}` : `Got it - ${name}`,
 askMore: (name: string) =>
 `Got it - ${name}. Want to add anyone else, or shall we plan something with ${name}?`,
 addAnother: "Add another",
 letsPlan: "Let's plan",
 letsPlanWith: (name: string) => `Let's plan with ${name}`,
 askWhen: (name: string) => `When do you want to see ${name} this week?`,
 askVibe: "What kind of vibe?",
 askVibeFor: (name: string) => `What kind of vibe with ${name}?`,
 whenPills: ["This week", "This weekend", "Pick a day"] as const,
 vibePills: ["Dinner", "Drinks", "Coffee", "Something active", "Church"] as const,
 vibeCustom: "Something else…",
 vibeCustomPlaceholder: "What kind of vibe?",
 workingTitle: "Watch Opal work",
 stepCalendar: "Checking your calendar...",
 /** Only when a real calendar API returns free slots. */
 stepCalendarDone: "You're free Friday and Saturday evening",
 /** Honest default - never fake calendar knowledge. */
 stepCalendarGrace: "I'll figure out when works for you.",
 stepCalendarAsk: "When are you free? I don't have your calendar yet.",
 /** After calendar connect - stay in planning with concrete days. */
 calendarConnectedDays: (name: string, vibe: string, days: string) =>
 `Calendar's connected - I'll check your availability. How about ${days} for ${vibe.toLowerCase()} with ${name}?`,
 /** After calendar dismiss - same concrete proposals, no home dump. */
 calendarDismissedDays: (name: string, vibe: string, days: string) =>
 `No problem - I'll work around it. How about ${days} for ${vibe.toLowerCase()} with ${name}?`,
 dayProposalPills: [
 "Thursday evening",
 "Friday evening",
 "Saturday afternoon",
 ] as const,
 connectCalendar: "Connect calendar",
 tellMeWhatWorks: "Just tell me what works",
 stepTaste: (names: string) => `Thinking about ${names}...`,
 stepTasteDone: "She mentioned loving Italian last month",
 stepTasteEmpty: "No preferences yet - I'll learn.",
 stepSpots: "Finding spots...",
 stepSpotsMulti: "Finding a spot for each of you...",
 stepSpotsEmpty: (vibe: string) =>
 `I don't have ${vibe.toLowerCase()} recommendations yet, but I can learn your preferences.`,
 plansReadyNamed: (n: number, names: string) =>
 n <= 0 ? "No plans yet" : `${n} plan${n === 1 ? "" : "s"} ready - ${names}`,
 noneOfThese: "None of these - let me choose",
 orTypeAPlace: "Or type a place",
 customPlacePlaceholder: "Type a place…",
 customPlaceConfirm: "Use this place",
 contactsUnavailable:
 "I couldn't access your contacts. You can type a name instead.",
 contactsCancelled: "Contact picker cancelled. Type a name instead.",
 trustPreviewLead: (name: string) => `I'll message ${name}:`,
 willLabel: "I will:",
 willSend: "Send this one message",
 wontLabel: "I won't:",
 wontCalendar: "Share your calendar",
 wontAnyoneElse: "Message anyone else",
 wontBook: "Book anything yet",
 sendIt: "Send it",
 notYet: "Not yet",
 messageBody: (name: string, vibe: string, when: string, spot: string) => {
 const v = vibe.trim().toLowerCase();
 const whenBit = when.toLowerCase();
 if (/church|chapel|worship|faith|spiritual|prayer/.test(v)) {
 return `Hey ${name} - want to go to ${spot} ${whenBit}? Thought of you.`;
 }
 if (/drink|bar|cocktail|wine/.test(v)) {
 return `Hey ${name} - drinks at ${spot} ${whenBit}? Thought of you.`;
 }
 if (/coffee|cafe|café|tea/.test(v)) {
 return `Hey ${name} - coffee at ${spot} ${whenBit}? Thought of you.`;
 }
 if (/active|hike|walk|run/.test(v)) {
 return `Hey ${name} - ${spot} ${whenBit}? Thought of you.`;
 }
 return `Hey ${name} - want to grab ${v || "something"} ${whenBit}? I found ${spot} and thought of you.`;
 },
 /** Soft cap - choreography allows Add another; plan uses the first name. */
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

/** Coarse when-pills or a refined day proposal (e.g. "Thursday evening"). */
export type HolyShitWhen = string;
/** Built-in vibe pill or a custom typed string (e.g. "church"). */
export type HolyShitVibe = string;
export type HolyShitVibeMode = "group" | "per_person";

const DAY_NAMES = [
 "Sunday",
 "Monday",
 "Tuesday",
 "Wednesday",
 "Thursday",
 "Friday",
 "Saturday",
] as const;

/**
 * Concrete day options for the rest of this week (evenings preferred).
 * Always returns 2-3 labels so calendar connect/dismiss never stalls on vague copy.
 */
export function proposePlanningDays(now: Date = new Date()): string[] {
 const out: string[] = [];
 for (let offset = 1; offset <= 7 && out.length < 3; offset++) {
 const d = new Date(now);
 d.setDate(now.getDate() + offset);
 const name = DAY_NAMES[d.getDay()]!;
 if (d.getDay() === 0) {
 out.push("Sunday afternoon");
 continue;
 }
 if (d.getDay() === 6) {
 out.push("Saturday");
 continue;
 }
 out.push(`${name} evening`);
 }
 return out.length ? out : ["Thursday evening", "Friday evening", "Saturday"];
}

/** "Thursday evening or Friday evening" / "A, B, or C" for resume copy. */
export function formatDayOptions(days: readonly string[]): string {
 const list = days.filter(Boolean).slice(0, 3);
 if (list.length === 0) return "a night this week";
 if (list.length === 1) return list[0]!;
 if (list.length === 2) return `${list[0]} or ${list[1]}`;
 return `${list[0]}, ${list[1]}, or ${list[2]}`;
}

/**
 * Selected person for first-run / invite.
 * Snapshot name+phone at select time so SMS invite works even if the
 * address-book entry changes later; keep contact_id as an optional link
 * for re-resolve. Never upload the full address book - only this row.
 */
export type HolyShitPerson = {
 name: string;
 phone?: string;
 /** Device contact id when chosen from the phone address book. */
 contact_id?: string;
 email?: string;
 organization?: string;
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

/** Dinner / default restaurant fixtures - only when vibe maps to dining. */
export const HOLY_SHIT_FIXTURE_SPOTS: HolyShitSpot[] = [
 {
 id: "juniper-ivy",
 name: "Juniper & Ivy",
 why: "Cozy, quiet - good for catching up.",
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

const FIXTURE_DRINKS: HolyShitSpot[] = [
 {
 id: "amber-room",
 name: "The Amber Room",
 why: "Low light, easy conversation.",
 price: "$$",
 photo: "/demo/moments/restaurant.jpg",
 },
 {
 id: "harbor-pour",
 name: "Harbor Pour",
 why: "Quiet bar with a view.",
 price: "$$",
 photo: "/demo/moments/food.jpg",
 },
];

const FIXTURE_COFFEE: HolyShitSpot[] = [
 {
 id: "morning-bird",
 name: "Morning Bird Coffee",
 why: "Calm tables, good for a catch-up.",
 price: "$",
 photo: "/demo/moments/food.jpg",
 },
 {
 id: "lattice-roast",
 name: "Lattice Roast",
 why: "Neighborhood cafe with outdoor seats.",
 price: "$",
 photo: "/figma-v2/home-201/media-juniper.png",
 },
];

const FIXTURE_ACTIVE: HolyShitSpot[] = [
 {
 id: "coast-walk",
 name: "Coastal Loop Walk",
 why: "Easy pace, room to talk.",
 price: "Free",
 photo: "/demo/moments/food.jpg",
 },
 {
 id: "gallery-steps",
 name: "Gallery Steps",
 why: "Short visit, then coffee nearby.",
 price: "$",
 photo: "/figma-v2/home-201/media-juniper.png",
 },
];

const FIXTURE_CHURCH: HolyShitSpot[] = [
 {
 id: "st-marks-chapel",
 name: "St. Mark's Chapel",
 why: "Quiet service, welcoming community.",
 price: "Free",
 photo: "/figma-v2/home-201/media-juniper.png",
 },
 {
 id: "harbor-light-fellowship",
 name: "Harbor Light Fellowship",
 why: "Sunday gathering with room to reflect.",
 price: "Free",
 photo: "/demo/moments/food.jpg",
 },
 {
 id: "quiet-garden-bench",
 name: "Quiet Garden Bench",
 why: "A reflective spot if you want stillness first.",
 price: "Free",
 photo: "/demo/moments/restaurant.jpg",
 },
];

function normVibe(vibe: string): string {
 return vibe.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Vibe → fixture spots. Church never returns restaurants.
 * Unknown custom vibes return [] so the UI can speak honestly.
 */
export function fixtureSpotsForVibe(vibe: string): HolyShitSpot[] {
 const v = normVibe(vibe);
 if (!v) return [];
 if (/church|chapel|worship|faith|spiritual|prayer|temple|mosque|synagogue/.test(v)) {
 return FIXTURE_CHURCH.map((s) => ({ ...s }));
 }
 if (/drink|bar|cocktail|wine|happy hour/.test(v)) {
 return FIXTURE_DRINKS.map((s) => ({ ...s }));
 }
 if (/coffee|cafe|café|tea/.test(v)) {
 return FIXTURE_COFFEE.map((s) => ({ ...s }));
 }
 if (/active|hike|walk|run|gym|sport|outdoor/.test(v)) {
 return FIXTURE_ACTIVE.map((s) => ({ ...s }));
 }
 if (/dinner|lunch|brunch|food|restaurant|eat|italian|meal/.test(v)) {
 return HOLY_SHIT_FIXTURE_SPOTS.map((s) => ({ ...s }));
 }
 // Custom / unknown - no fake restaurants.
 return [];
}

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
