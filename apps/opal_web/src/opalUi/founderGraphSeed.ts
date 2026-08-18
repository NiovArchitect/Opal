/**
 * LOCAL DEVELOPMENT / FOUNDER SEED for Opal Graph Home (201:5).
 *
 * HOME IS SOCIAL FIRST, NOT GRAPH FIRST.
 * Memory-heavy familiarity → Graph possibility → rarer high-salience Live.
 * People universe: Maya, Jordan, Chanelle, Sam, Alex, Sabrina, Nina, Taylor, Riley.
 * Not a directory — content emerges through cards.
 *
 * Internal tag only. No customer-facing DEMO label.
 */
export const FOUNDER_GRAPH_SEED_ID = "founder-graph-seed-v2-memory-heavy";

export type GraphFeedKind = "graph" | "live" | "memory" | "near";

export type FounderFeedCard = {
  id: string;
  kind: GraphFeedKind;
  person: string;
  personInitial: string;
  avatarSrc?: string;
  mediaSrc?: string;
  thumbSrc?: string;
  when: string;
  title: string;
  detail: string;
  meta?: string;
  cta?: string;
  ctaAction: "id_go" | "check_out" | "open_memory" | "none";
};

const ASSET = "/figma-v2/home-201";
const DEMO = "/demo/moments";

/** Approved WHO people (201:6) — used for seed + picker coherence. */
export const FOUNDER_PEOPLE = [
  "Maya",
  "Jordan",
  "Chanelle",
  "Sam",
  "Alex",
  "Sabrina",
  "Nina",
  "Taylor",
  "Riley",
] as const;

/**
 * Ranked founder feed: Memory-heavy social familiarity first,
 * Graph possibility interleaved, Live rarer and high-salience, Near You local.
 * Continuous scroll — not nine equal identity rows.
 */
export const FOUNDER_HOME_FEED: FounderFeedCard[] = [
  // --- Memory (familiarity) ---
  {
    id: "seed-maya-fletcher",
    kind: "memory",
    person: "Maya",
    personInitial: "M",
    avatarSrc: `${ASSET}/avatar-maya.png`,
    thumbSrc: `${ASSET}/media-maya.png`,
    mediaSrc: `${ASSET}/media-maya.png`,
    when: "15m",
    title: "Sunset walk at Fletcher Cove",
    detail: "Last night",
    ctaAction: "open_memory",
  },
  {
    id: "seed-taylor-kitchen",
    kind: "memory",
    person: "Taylor",
    personInitial: "T",
    mediaSrc: `${DEMO}/food.jpg`,
    thumbSrc: `${DEMO}/food.jpg`,
    when: "1h",
    title: "Late dinner that turned into a story",
    detail: "Yesterday",
    ctaAction: "open_memory",
  },
  {
    id: "seed-riley-portrait",
    kind: "memory",
    person: "Riley",
    personInitial: "R",
    mediaSrc: `${DEMO}/portrait.jpg`,
    thumbSrc: `${DEMO}/portrait.jpg`,
    when: "Yesterday",
    title: "Golden hour on the pier",
    detail: "Shared with the crew",
    ctaAction: "open_memory",
  },
  // --- Graph (possibility) ---
  {
    id: "seed-chanelle-juniper",
    kind: "graph",
    person: "Chanelle",
    personInitial: "C",
    avatarSrc: `${ASSET}/avatar-chanelle.png`,
    mediaSrc: `${ASSET}/media-juniper.png`,
    when: "2m",
    title: "Juniper & Ivy tonight",
    detail: "7:30 PM · San Diego",
    meta: "Sadeil and Sabrina are interested",
    cta: "I'd go",
    ctaAction: "id_go",
  },
  {
    id: "seed-alex-hike",
    kind: "memory",
    person: "Alex",
    personInitial: "A",
    mediaSrc: `${DEMO}/restaurant.jpg`,
    thumbSrc: `${DEMO}/restaurant.jpg`,
    when: "3h",
    title: "Travel note from Big Sur",
    detail: "Worth the drive",
    ctaAction: "open_memory",
  },
  {
    id: "seed-jordan-skate",
    kind: "graph",
    person: "Jordan",
    personInitial: "J",
    mediaSrc: `${DEMO}/portrait.jpg`,
    when: "4h",
    title: "New skate spot this weekend",
    detail: "Saturday morning",
    meta: "Sam is interested",
    cta: "I'd go",
    ctaAction: "id_go",
  },
  {
    id: "seed-nina-jazz",
    kind: "graph",
    person: "Nina",
    personInitial: "N",
    mediaSrc: `${DEMO}/food.jpg`,
    when: "5h",
    title: "Rooftop set if the weather holds",
    detail: "Tonight · after 9",
    cta: "I'd go",
    ctaAction: "id_go",
  },
  // --- Near you (local, not friendship) ---
  {
    id: "seed-near-rooftop",
    kind: "near",
    person: "Near you",
    personInitial: "◎",
    when: "9 min away",
    title: "Rooftop jazz",
    detail: "9 min away",
    cta: "Check it out",
    ctaAction: "check_out",
  },
  {
    id: "seed-sam-market",
    kind: "memory",
    person: "Sam",
    personInitial: "S",
    mediaSrc: `${DEMO}/food.jpg`,
    thumbSrc: `${DEMO}/food.jpg`,
    when: "Yesterday",
    title: "Farmers market haul",
    detail: "Sunday morning",
    ctaAction: "open_memory",
  },
];

/** High-salience Live objects (rarer). Soft interest must not fake attendance. */
export const FOUNDER_LIVE_FEED: FounderFeedCard[] = [
  {
    id: "seed-live-sabrina",
    kind: "live",
    person: "Sabrina",
    personInitial: "S",
    avatarSrc: `${ASSET}/avatar-chanelle.png`,
    mediaSrc: `${ASSET}/media-juniper.png`,
    when: "Happening now",
    title: "Juniper & Ivy",
    detail: "Downtown San Diego · Led by Chanelle",
    meta: "Sadeil locked in · Sabrina on the way · Table ready",
    cta: "I'm on my way",
    ctaAction: "id_go",
  },
];

export const HOME_ICONS = {
  vista: `${ASSET}/icon-vista.svg`,
  graph: `${ASSET}/icon-graph.svg`,
  live: `${ASSET}/icon-live.svg`,
  memory: `${ASSET}/icon-memory.svg`,
  near: `${ASSET}/icon-near.svg`,
} as const;

export function isFounderSeedEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = (import.meta as { env?: Record<string, string> }).env?.VITE_OPAL_FOUNDER_SEED;
    if (v === "false") return false;
  } catch {
    /* ignore */
  }
  return true;
}

/** Default WHO picker people for founder seed (201:6 exact names). */
export function founderWhoPeople() {
  return FOUNDER_PEOPLE.map((name) => ({
    id: name.toLowerCase(),
    name,
    initial: name.slice(0, 1),
    avatarSrc:
      name === "Chanelle"
        ? `${ASSET}/avatar-chanelle.png`
        : name === "Maya"
          ? `${ASSET}/avatar-maya.png`
          : undefined,
  }));
}
