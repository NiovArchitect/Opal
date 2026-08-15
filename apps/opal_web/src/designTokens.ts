/**
 * Opal product tokens  -  V2.0 Living Void (founder-approved Figma baseline).
 * Calm → Awakening → Transform → Calm.
 * Not cyberpunk, not WhatsApp green, not calendar chrome, not #112 shell.
 */
export const tokens = {
  color: {
    bg: "#030508",
    bgElevated: "#070A10",
    surface: "#0A0E16",
    surfaceRaised: "#10161F",
    glass: "rgba(10, 14, 22, 0.82)",
    chatPane: "#05080E",
    bubbleOut: "#1A3540",
    bubbleOutGlow: "rgba(110, 231, 245, 0.14)",
    bubbleIn: "#121820",
    border: "rgba(138, 150, 168, 0.14)",
    borderBright: "rgba(110, 231, 245, 0.22)",
    text: "#F4F7FA",
    muted: "#8A96A8",
    accent: "#6EE7F5",
    accentDeep: "#2A8FA3",
    accentSoft: "#9AE8F2",
    pearl: "#E8D5C4",
    iris: "#8B7CFF",
    signal: "#D4B483",
    online: "#3DDF9A",
    danger: "#E85A5A",
    resolve: "#3DDF9A",
    private: "#8B7CFF",
    meshA: "rgba(110, 231, 245, 0.07)",
    meshB: "rgba(139, 124, 255, 0.06)",
    meshC: "rgba(232, 213, 196, 0.03)",
  },
  font: {
    sans: '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  radius: {
    md: 14,
    lg: 22,
    bubble: 22,
    pill: 999,
  },
  motion: {
    durationMs: 240,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
  },
} as const;

export const PRODUCT_COPY = {
  appName: "Opal",
  /** Canon: Figma 57:2 / OPAL_PRODUCT_BRAND_CANON.md */
  tagline: "Opal turns social possibility into shared reality.",
  /** Figma 2:2 editorial fallback; live Home uses homeEditorialLines(daypart). */
  homeEditorial: "Tonight is happening.",
  emptyNeedsYou: "Nothing needs a decision right now.",
  emptyChats: "Your conversations will live here.",
  emptyPlans: "Plans appear when chats become real.",
  composerPlaceholder: "Message",
  homeGreetingFallback: "Welcome back",
  // Fallback stage copy; prefer Shared Reality headlines from ProductSignals.
  // Never show internal Set / Still open / This could work.
  signalOpenLoop: "Still taking shape",
  signalPlanForming: "Something is forming",
  signalReady: "You're both in",
  signalFollowThrough: "Follow-through",
  onboardingSkip: "Skip",
  onboardingContinue: "Continue",
  /** Final walkthrough CTA: visible text Join; accessible name Join Opal. Opens activation. */
  onboardingEnter: "Join",
  onboardingEnterAria: "Join Opal",
  activationTrust:
    "Your relationships and conversations stay private. You choose what Opal may use or share.",
  contactTrust: "Only the people you select are invited.",
  replayIntro: "Replay intro",
  /** Human-facing: unresolved dimensions, not homework inventory. */
  needsYouLabel: "Decide",
  chooseKicker: "CHOOSE",
  comingUpLabel: "Coming up",
  movingLabel: "With your people",
  nextTogether: "Next together",
  lastTogether: "Last together",
  needPlace: "Need a place",
  /** Busy-people CTAs - one verb, no scheduler homework */

  choosePlace: "Choose a place",
  findTime: "Find a time",
  curateCta: "Curate this",
  extendCta: "Extend the night",
  looksGood: "Looks good",
  changeVibe: "Change vibe",
  /** Pass 20 — execution CTAs (human, not provider state language) */
  checkAvailability: "Check availability",
  reserve: "Reserve",
  confirmReservation: "Confirm",
  notYet: "Not yet",
  reserving: "Reserving…",
  reservationConfirmed: "Reservation confirmed",
  couldNotReserve: "Couldn't reserve that time",
  checkingReservation: "Checking that reservation…",
  heldMinutes: "Held for a few minutes.",
  paymentRequiredContinue: "Payment required to continue.",
  cancelReservation: "Cancel reservation",
  keepReservation: "Keep it",
  yesCancelReservation: "Yes, cancel",
  freshCheck: "That time needs a fresh check.",
  go: "Go",
  notTonight: "Not tonight",
  onlyYou: "ONLY YOU",
  keepPrivate: "Keep private",
  shareWhenReady: "Share when you are ready",
  extendPrivateLead: "You lead. Nothing is sent until you choose to share.",
  placeSheetLead: "Pick one. Share only if you want.",
  placeStillOpen: "Place still open",
  timeStillOpen: "When still open",
  bothIn: "You're both in",
} as const;

/** Phrases that must not appear in user-visible product copy. */
export const FORBIDDEN_COPY = [
  "private conversation",
  "demo",
  "synthetic",
  "daily engagement",
  "don't miss out",
  "ai-powered",
] as const;
