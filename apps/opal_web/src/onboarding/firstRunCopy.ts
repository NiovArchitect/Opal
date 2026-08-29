/**
 * S1 Final First Run copy (Figma 217:2 authority).
 * Hard law: no em dash, no en dash, no ellipsis, no dot-dot-dot.
 */
export const FR_COPY = {
  splashTap: "Tap to begin",
  worldTitle: "See what your people are up to.",
  worldBody: "Plans, live things, and memories all in one place.",
  graph: "Graph",
  live: "Live",
  memory: "Memory",
  vista: "Vista",
  idGo: "I'd go",
  nearYou: "Near you",
  checkItOut: "Check it out",
  whoTitle: "Who with?",
  whoBody: "Keep it private or bring people together.",
  sendSeparately: "Send separately",
  together: "Together",
  continue: "Continue",
  ambientOpal: "Opal lined this up",
  tableReady: "Table ready",
  leaveTime: "Leave 6:55 PM",
  driveTime: "18 min drive",
  chanelleFree: "Chanelle is free",
  nothingElse: "Nothing else to do right now.",
  messageChanelle: "Message Chanelle",
  liveTitle: "Then it actually happens.",
  liveBody: "People lock in. Opal keeps everyone synced.",
  liveBadge: "LIVE",
  happeningNow: "HAPPENING NOW",
  ledBy: "Led by Chanelle",
  sadeilLocked: "Sadeil locked in",
  justNow: "Just now",
  sabrinaOnWay: "Sabrina is on the way",
  eta8: "ETA 8 min",
  tableReadyNews: "Table ready · Great news",
  etaSeeYou: "ETA 8 min · See you soon",
  onMyWay: "I'm on my way",
  bestPart: "The best part is off screen.",
  startTitle: "Start with your people.",
  startBody:
    "See what they are doing. Share what you are up to. Let Opal handle the rest.",
  circleStays: "Your circle stays your circle.",
  continuePhone: "Continue with phone number",
  alreadyAccount: "I already have an account",
  phoneTitle: "Your number is your key.",
  phoneBody: "Your phone number is how you sign in. No password to remember.",
  phoneHint: "We will text you a one-time code.",
  verifyTitle: "Enter the code we sent.",
  verifySent: (pretty: string) => `Sent to ${pretty}.`,
  resend: "Resend code",
  verify: "Verify",
  changeNumber: "Change number",
  profileTitle: "This is you.",
  profileBody: "A name and photo help your people recognize you.",
  photoDeferred: "Add photo",
  photoDeferredNote: "Initials work until a photo is chosen.",
  skipForNow: "Skip for now",
  nameLabel: "Name",
  usernameLabel: "Username",
  usernameOptional: "Optional. Must be unique if you pick one.",
  findTitle: "Find your people.",
  findBody: "See who is already on Opal Graph. Invite only the people you want.",
  connectContacts: "Connect contacts",
  optional: "Optional",
  notNow: "Not now",
  consentLabel:
    "Text me a one-time security code at this number. This is only for signing in. Not for marketing.",
  rates: "Message and data rates may apply.",
  busy: "Working",
  sending: "Sending your code",
  checking: "Checking code",
  preparing: "Preparing your account",
  otpRequired: "Confirm we can text you a one-time code to continue.",
  invalidPhone: "Enter a valid phone number.",
  invalidCode: "Enter the 6-digit code.",
  nameRequired: "Enter your name.",
  previewOnly:
    "This preview only accepts approved test numbers. No text will be sent.",
  contactsUnavailable:
    "Contact access is not available here. Invite with a number instead.",
  contactsPrivacy: "Only the people you select are invited. Nothing is uploaded silently.",
} as const;

export const FR_FIXTURE_PEOPLE = [
  { id: "chanelle", name: "Chanelle", initial: "C", tone: "#6EE7F5" },
  { id: "maya", name: "Maya", initial: "M", tone: "#8B7CFF" },
  { id: "jordan", name: "Jordan", initial: "J", tone: "#3DDF9A" },
  { id: "sam", name: "Sam", initial: "S", tone: "#D4B483" },
  { id: "alex", name: "Alex", initial: "A", tone: "#6EE7F5" },
  { id: "sabrina", name: "Sabrina", initial: "S", tone: "#E8D5C4" },
  { id: "nina", name: "Nina", initial: "N", tone: "#8B7CFF" },
  { id: "taylor", name: "Taylor", initial: "T", tone: "#3DDF9A" },
  { id: "riley", name: "Riley", initial: "R", tone: "#D4B483" },
  { id: "sadeil", name: "Sadeil", initial: "S", tone: "#6EE7F5" },
] as const;

export type FirstRunStepId =
  | "fr00"
  | "frPromise"
  | "fr01"
  | "fr02"
  | "fr03"
  | "fr04"
  | "fr05"
  | "fr06"
  | "fr07"
  | "fr08"
  | "fr09";

/** Production walkthrough: splash + single promise (founder override 2026-08-20). */
export const WALKTHROUGH_STEPS: FirstRunStepId[] = ["fr00", "frPromise"];

export const AUTH_STEPS: FirstRunStepId[] = ["fr06", "fr07", "fr08", "fr09"];

/** @deprecated Legacy export for tests that still inspect step narrative. Prefer FR_COPY. */
export const FIRST_RUN_STEPS = [
  {
    id: "fr00",
    kicker: "Opal Graph",
    title: "Opal Graph",
    body: FR_COPY.splashTap,
    scene: "splash" as const,
  },
  {
    id: "fr01",
    kicker: "Your world",
    title: FR_COPY.worldTitle,
    body: FR_COPY.worldBody,
    scene: "world" as const,
  },
  {
    id: "fr02",
    kicker: "Who",
    title: FR_COPY.whoTitle,
    body: FR_COPY.whoBody,
    scene: "who" as const,
  },
  {
    id: "fr03",
    kicker: "Ambient",
    title: FR_COPY.ambientOpal,
    body: "We talk. Opal handles the coordination.",
    scene: "ambient" as const,
  },
  {
    id: "fr04",
    kicker: "Live",
    title: FR_COPY.liveTitle,
    body: FR_COPY.liveBody,
    scene: "live" as const,
  },
  {
    id: "fr05",
    kicker: "People",
    title: FR_COPY.startTitle,
    body: FR_COPY.circleStays,
    scene: "start" as const,
  },
];
