/**
 * Opal product tokens (SF14 futuristic identity).
 * Direction: premium AI-native social medium; luminous, calm, spatial.
 * Not cyberpunk, not WhatsApp green, not calendar chrome.
 */
export const tokens = {
  color: {
    bg: "#05060A",
    bgElevated: "#0A0C12",
    surface: "#0E1118",
    surfaceRaised: "#141822",
    glass: "rgba(18, 24, 36, 0.72)",
    chatPane: "#07090E",
    bubbleOut: "#1A4A5C",
    bubbleOutGlow: "rgba(94, 214, 232, 0.22)",
    bubbleIn: "#141A24",
    border: "rgba(148, 200, 220, 0.12)",
    borderBright: "rgba(148, 220, 240, 0.22)",
    text: "#F2F6FA",
    muted: "#7E8FA3",
    accent: "#5ED6E8",
    accentDeep: "#2A8FA3",
    accentSoft: "#9AE8F2",
    pearl: "#E8D5C4",
    iris: "#8B9CFF",
    signal: "#D4B483",
    online: "#3ECF9A",
    danger: "#E06B6B",
    meshA: "rgba(94, 214, 232, 0.09)",
    meshB: "rgba(139, 156, 255, 0.07)",
    meshC: "rgba(232, 213, 196, 0.04)",
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
  tagline: "Life starts in conversation.",
  emptyNeedsYou: "Nothing needs you right now.",
  emptyChats: "Your conversations will live here.",
  emptyPlans: "Plans appear when chats become real.",
  composerPlaceholder: "Message",
  homeGreetingFallback: "Welcome back",
  signalOpenLoop: "Open loop",
  signalPlanForming: "Becoming a plan",
  signalReady: "Ready",
  signalFollowThrough: "Follow-through",
  onboardingSkip: "Skip",
  onboardingContinue: "Continue",
  onboardingEnter: "Enter Opal",
  replayIntro: "Replay intro",
  needsYouLabel: "Needs you",
  comingUpLabel: "Coming up",
  movingLabel: "What's moving",
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
