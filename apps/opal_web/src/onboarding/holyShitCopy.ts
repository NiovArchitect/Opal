/**
 * Holy Shit first-run Moments 1-5 - founder copy + fixture spots.
 * One person · type name or Select from contacts · when → vibe → curate → trust.
 */

export const HOLY_SHIT_COPY = {
 landingHook: "Tell Opal who you want to stay close with.",
 greeting:
 "Hey. I'm Opal. Real people. Brighter together. Birthdays, plans, staying close. I got you.",
 /** Paste W4 Phase 0 — user's own name before permissions. */
 askSelfName: "What's your name?",
 selfNamePlaceholder: "Your name",
 /** @deprecated Paste W4 — username is derived; no separate input. */
 selfUsernamePlaceholder: "Username (optional)",
 /** Quiet handle preview after name typed (Paste W4). */
 selfUsernameQuiet: (handle: string) =>
  `You'll be @${handle}. Change it anytime in You.`,
 /** @deprecated alias for quiet preview */
 selfUsernameHint: "You'll be @{handle}. Change it anytime in You.",
 selfNameContinue: "Continue",
 /** Permissions ONE screen (Paste W4): contacts, calendar, notifications, location. */
 askPermissions: "A few permissions help me take care of you.",
 permContactsTitle: "Contacts",
 permContactsWhy: "Find your people.",
 permCalendarTitle: "Calendar",
 permCalendarWhy: "Never double-book you.",
 permNotificationsTitle: "Notifications",
 permNotificationsWhy: "Nudges at the right time.",
 permLocationTitle: "Location",
 permLocationWhy: "Spots near you.",
 permAllow: "Allow",
 permSkip: "Skip",
 /** @deprecated Paste W4 uses permSkip */
 permNotNow: "Skip",
 permContinue: "Continue",
 /** Paste W5 — Assist preference as one Meet Opal row (not a screen). */
 assistRow: "Let Opal place calls and make reservations for you.",
 assistEnable: "Enable",
 assistNotNow: "Not now",
 meetContinue: "Continue",
 askPeople: "Who's someone you've been meaning to catch up with?",
 /** @deprecated alias - one-person ask */
 askName: "Who's someone you've been meaning to catch up with?",
 peoplePlaceholder: "Type a name",
 namePlaceholder: "Type a name",
 peopleContinue: "Continue",
 peopleOr: "or",
 peopleSkip: "Skip",
 resolveSelect: "Choose from contacts",
 phonePlaceholder: "Add their phone number",
 phoneContinue: "Continue",
 phoneSkipInvite: "Continue without inviting",
 contactsDeniedOnce:
 "You can enable contacts later in Settings to pick people directly.",
 /** When Contact Picker / bridge is unavailable — hide Choose from contacts. */
 contactsUnavailableTyping: "Contacts aren't available. Typing works great.",
 contactsNoPhone: (name: string) =>
 `${name} has no phone number. Add one to invite, or continue without sending.`,
 pullingUp: (name: string) => `Looking up ${name} in your contacts.`,
 /** Talk TO the user ABOUT the friend. Never greet the friend mid-flow. */
 confirmContact: (name: string, _phone?: string) => `Got ${name}.`,
 askMore: (name: string) =>
 `Got ${name}. Add anyone else, or plan something with them?`,
 addAnother: "Add another",
 letsPlan: "Let's plan",
 letsPlanWith: (name: string) => `Let's plan with ${name}`,
 askWhen: (name: string) => `When do you want to see ${name} this week?`,
 askVibe: "What kind of vibe?",
 askVibeFor: (name: string) => `What kind of vibe for ${name}?`,
 /** Location ask at moment of need (beach / outdoor vibes). */
 askLocationForVibe: (vibe: string) =>
  /beach|ocean|coast|surf/i.test(vibe)
   ? "Mind if I use your location to find beaches?"
   : "Mind if I use your location to find spots nearby?",
 locationAllow: "Use my location",
 locationNotNow: "Not now",
 vibeAck: (vibe: string) => {
  const v = vibe.trim();
  if (!v) return "Noted.";
  const short = v.split(/\s+/)[0] || v;
  return `${short.charAt(0).toUpperCase()}${short.slice(1)} it is. Noted.`;
 },
 whenPills: ["This week", "This weekend", "Pick a day"] as const,
 vibePills: ["Dinner", "Drinks", "Coffee", "Something active", "Church"] as const,
 vibeCustom: "Something else",
 vibeCustomPlaceholder: "What kind of vibe?",
 workingTitle: "Watch Opal work",
 stepCalendar: "Checking your calendar.",
 /** Only when a real calendar API returns free slots. */
 stepCalendarDone: "You're free Friday and Saturday evening",
 /** Honest default - never fake calendar knowledge. */
 stepCalendarGrace: "I'll figure out when works for you.",
 stepCalendarAsk: "When are you free? I don't have your calendar yet.",
 /** Only after a real connected calendar status - never after a fake connect. */
 calendarConnectedDays: (name: string, vibe: string, days: string) =>
 `Calendar's connected. How about ${days} for ${vibe.toLowerCase()} with ${name}?`,
 /** Connect tapped but OAuth / connector unavailable - stay in thread with day proposals. */
 calendarConnectUnavailableDays: (name: string, vibe: string, days: string) =>
 `Calendar connect isn't set up yet. How about ${days} for ${vibe.toLowerCase()} with ${name}?`,
 /** After calendar dismiss - same concrete proposals, no home dump. */
 calendarDismissedDays: (name: string, vibe: string, days: string) =>
 `No problem. How about ${days} for ${vibe.toLowerCase()} with ${name}?`,
 dayLocked: (day: string) => `${day} it is. Locked in.`,
 dayProposalPills: [
 "Thursday evening",
 "Friday evening",
 "Saturday afternoon",
 ] as const,
 connectCalendar: "Connect calendar",
 tellMeWhatWorks: "Just tell me what works",
 stepTaste: (names: string) => `Thinking about ${names}.`,
 stepTasteDone: "She mentioned loving Italian last month",
 stepTasteEmpty: "No preferences yet. I'll learn.",
 stepSpots: "Finding spots.",
 stepSpotsMulti: "Finding a spot for each of you.",
 stepSpotsEmpty: (vibe: string) =>
 `I don't have ${vibe.toLowerCase()} recommendations yet, but I can learn your preferences.`,
 plansReadyNamed: (n: number, names: string) =>
 n <= 0 ? "No plans yet" : `${n} plan${n === 1 ? "" : "s"} ready: ${names}`,
 noneOfThese: "None of these. Let me choose",
 orTypeAPlace: "Or type a place",
 customPlacePlaceholder: "Type a place",
 customPlaceConfirm: "Use this place",
 contactsUnavailable:
 "I couldn't access your contacts. You can type a name instead.",
 contactsCancelled: "Contact picker cancelled. Type a name instead.",
 /** Preview lead before a real send attempt - does not promise delivery. */
 trustPreviewLead: (name: string) => `Message for ${name}:`,
 /** Only after invite/SMS create succeeds. */
 trustSentLead: (name: string) => `Sent to ${name}:`,
 trustSendFailed: (reason: string) =>
 `I couldn't send that invite yet. ${reason}. You can invite from You › Invite friends.`,
 trustSendNoPhone: (name: string) =>
 `I couldn't send that invite yet. ${name} has no phone number. Add a number below, or continue without sending.`,
 trustPhonePlaceholder: "Phone number to invite",
 trustContinueWithoutSend: "Continue without sending",
 willLabel: "I will:",
 willSend: "Send this one message",
 wontLabel: "I won't:",
 wontCalendar: "Share your calendar",
 wontAnyoneElse: "Message anyone else",
 wontBook: "Book anything yet",
 sendIt: "Send it",
 notYet: "Not yet",
 contactPersistFailed:
 "Couldn't save this contact yet. You can invite from You › Invite friends.",
 contactPersistNoPhone: (name: string) =>
 `${name} saved by name. Add a number from contacts to invite.`,
 messageBody: (name: string, vibe: string, when: string, spot: string) => {
 const v = vibe.trim().toLowerCase();
 const whenBit = when.toLowerCase();
 if (/church|chapel|worship|faith|spiritual|prayer/.test(v)) {
 return `Hey ${name}, want to go to ${spot} ${whenBit}? Thought of you.`;
 }
 if (/drink|bar|cocktail|wine/.test(v)) {
 return `Hey ${name}, drinks at ${spot} ${whenBit}? Thought of you.`;
 }
 if (/coffee|cafe|café|tea/.test(v)) {
 return `Hey ${name}, coffee at ${spot} ${whenBit}? Thought of you.`;
 }
 if (/active|hike|walk|run|beach/.test(v)) {
 return `Hey ${name}, ${spot} ${whenBit}? Thought of you.`;
 }
 return `Hey ${name}, want to grab ${v || "something"} ${whenBit}? I found ${spot} and thought of you.`;
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
 why: "Cozy, quiet. Good for catching up.",
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

/** Beach / ocean vibes — names must keep the user word "beach". */
const FIXTURE_BEACH: HolyShitSpot[] = [
 {
 id: "nearby-beach",
 name: "Nearby beach",
 why: "Open air, easy to linger.",
 price: "Free",
 photo: "/demo/moments/food.jpg",
 },
 {
 id: "sunset-beach-walk",
 name: "Sunset beach walk",
 why: "Soft light, room to talk.",
 price: "Free",
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
 if (/beach|ocean|coast|surf/.test(v)) {
 return FIXTURE_BEACH.map((s) => ({ ...s }));
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

/** Paste W4 Phase 0 diet first-run phases only. */
/** Paste W5 — greeting reveal then single scrolling form (no multi-screen phase gates). */
export type MeetOpalPhase = "greeting" | "form";

/**
 * Derive username from display name: lowercase, strip non-alphanumeric
 * (no spaces, prefer no underscores). "Sadeil" → "sadeil", "Sadeil Mae" → "sadeilmae".
 */
export function suggestUsernameFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
}

/** Permission rows on the ONE ask_permissions screen (Paste W4). */
export type MeetOpalPermissionKind =
  | "contacts"
  | "calendar"
  | "notifications"
  | "location";

export const MEET_OPAL_PERMISSION_ORDER: readonly MeetOpalPermissionKind[] = [
  "contacts",
  "calendar",
  "notifications",
  "location",
] as const;

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
