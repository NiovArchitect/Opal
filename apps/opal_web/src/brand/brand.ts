/**
 * Opal brand — futuristic luminous social medium (SF14)
 */
export const BRAND = {
  name: "Opal",
  tagline: "Life starts in conversation.",
  markName: "Lumen Lens",
  feel: "Futuristic · calm · luminous · human",
  rationale: [
    "Deep void canvas + soft cyan iris light = near-future interface, not neon nightclub.",
    "Luminous lens mark = clarity and social signal without surveillance aesthetics.",
    "Iridescent sheen (pearl / sky / sea) suggests opal light without gemstone cliché.",
    "Open arcs = connection becoming something more — never a closed speech bubble.",
    "Glass surfaces + restrained glow = premium spatial UI, not crypto dashboards.",
  ],
  reject: [
    "Speech-bubble phone icons",
    "Neon cyberpunk overload / Orbitron",
    "WhatsApp green palette",
    "Telegram paper plane",
    "Discord game marks",
    "Calendar grid identity",
    "Matrix green tech-bro",
  ],
  assets: {
    mark: "/brand/opal-mark.svg",
    markMono: "/brand/opal-mark-mono.svg",
    markLight: "/brand/opal-mark-light.svg",
    lockup: "/brand/opal-lockup.svg",
    favicon: "/favicon.svg",
  },
} as const;

export const FIRST_RUN_STORAGE_KEY = "opal.firstRun.v14.completed";
