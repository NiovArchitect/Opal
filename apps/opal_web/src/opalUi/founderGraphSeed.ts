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
export const FOUNDER_GRAPH_SEED_ID = "founder-graph-seed-v3-ogsn-memory-heavy";

export type GraphFeedKind =
  | "graph"
  | "live"
  | "memory"
  | "near"
  | "consequence"
  | "discovery";

export type PulseState = "MEMORY" | "GRAPH" | "LIVE";

/** People Pulse doorway (OGSN-01) — not a directory. */
export type FounderPulseItem = {
  id: string;
  person: string;
  personInitial: string;
  avatarSrc?: string;
  mediaSrc?: string;
  state: PulseState;
  targetCardId: string;
};

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
  caption?: string;
  likesLabel?: string;
  likeCount?: number;
  commentCount?: number;
  repostCount?: number;
  shareCount?: number;
  /** Soft social signal count (not attendance). */
  interestedCount?: number;
  /** Committed participation count. */
  goingCount?: number;
  /** ISO or relative start for countdown. */
  startsAt?: string;
  placeLine?: string;
  joinability?: "joinable_friends" | "visible_not_joinable" | "invite_only" | "public";
  /** Live attribution */
  broadcaster?: string;
  host?: string;
  videoLive?: boolean;
  happeningNow?: boolean;
  /** Suggested discovery — FollowGraph only, not Connection. */
  suggested?: boolean;
  cta?: string;
  ctaAction: "id_go" | "check_out" | "open_memory" | "open_graph" | "open_live" | "none";
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
  // --- Memory (familiarity) — OGSN-01 ---
  {
    id: "seed-nina-hike",
    kind: "memory",
    person: "Nina",
    personInitial: "N",
    avatarSrc: `${DEMO}/portrait.jpg`,
    mediaSrc: `${DEMO}/portrait.jpg`,
    thumbSrc: `${DEMO}/portrait.jpg`,
    when: "15m ago",
    title: "Golden hour hike with the crew.",
    detail: "Memory",
    caption: "Golden hour hike with the crew.",
    likesLabel: "Liked by Maya and others",
    likeCount: 1200,
    commentCount: 42,
    repostCount: 18,
    shareCount: 61,
    suggested: true,
    ctaAction: "open_memory",
  },
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
    caption: "Sunset walk at Fletcher Cove",
    likeCount: 86,
    commentCount: 12,
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
    caption: "Late dinner that turned into a story",
    likeCount: 54,
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
    caption: "Golden hour on the pier",
    likeCount: 120,
    ctaAction: "open_memory",
  },
  // --- Conversation → Graph consequence (OGX stream object) ---
  {
    id: "seed-consequence-chanelle",
    kind: "consequence",
    person: "Chanelle",
    personInitial: "C",
    avatarSrc: `${ASSET}/avatar-chanelle.png`,
    when: "4m",
    title: "Conversation became a Graph",
    detail: "Juniper & Ivy · Saturday · 7:30 PM",
    meta: "Opal lined this up · table looks open · leave ~6:55",
    placeLine: "Juniper & Ivy",
    startsAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    cta: "Open Graph",
    ctaAction: "open_graph",
  },
  // --- Graph (possibility) — OGSN-02 ---
  {
    id: "seed-jordan-market",
    kind: "graph",
    person: "Jordan",
    personInitial: "J",
    avatarSrc: `${DEMO}/portrait.jpg`,
    mediaSrc: `${DEMO}/food.jpg`,
    when: "4m",
    title: "Farmers market + coast",
    detail: "Saturday · 10:00 AM · Oceanside",
    placeLine: "Saturday · 10:00 AM · Oceanside",
    meta: "4 interested · 2 going",
    interestedCount: 4,
    goingCount: 2,
    startsAt: new Date(Date.now() + 52 * 3600 * 1000).toISOString(),
    joinability: "joinable_friends",
    likeCount: 28,
    commentCount: 6,
    repostCount: 4,
    shareCount: 12,
    cta: "Open Graph",
    ctaAction: "open_graph",
  },
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
    placeLine: "Saturday · 7:30 PM · San Diego",
    meta: "Sadeil and Sabrina are interested",
    interestedCount: 2,
    goingCount: 0,
    startsAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    joinability: "joinable_friends",
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
    caption: "Travel note from Big Sur",
    likeCount: 41,
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
    placeLine: "Saturday morning · local",
    meta: "Sam is interested",
    interestedCount: 1,
    goingCount: 0,
    startsAt: new Date(Date.now() + 60 * 3600 * 1000).toISOString(),
    joinability: "joinable_friends",
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
    caption: "Farmers market haul",
    likeCount: 33,
    ctaAction: "open_memory",
  },
  // --- More memory variety (no 5-card repeat loop) ---
  {
    id: "seed-sabrina-night",
    kind: "memory",
    person: "Sabrina",
    personInitial: "S",
    avatarSrc: `${ASSET}/avatar-chanelle.png`,
    mediaSrc: `${ASSET}/media-juniper.png`,
    thumbSrc: `${ASSET}/media-juniper.png`,
    when: "2d",
    title: "Night walk after the set",
    detail: "Downtown",
    caption: "Night walk after the set",
    likeCount: 77,
    commentCount: 9,
    ctaAction: "open_memory",
  },
  {
    id: "seed-chanelle-memory-brunch",
    kind: "memory",
    person: "Chanelle",
    personInitial: "C",
    avatarSrc: `${ASSET}/avatar-chanelle.png`,
    mediaSrc: `${DEMO}/restaurant.jpg`,
    thumbSrc: `${DEMO}/restaurant.jpg`,
    when: "3d",
    title: "Brunch that ran long",
    detail: "La Jolla",
    caption: "Brunch that ran long",
    likeCount: 64,
    ctaAction: "open_memory",
  },
  {
    id: "seed-maya-graph-coast",
    kind: "graph",
    person: "Maya",
    personInitial: "M",
    avatarSrc: `${ASSET}/avatar-maya.png`,
    mediaSrc: `${ASSET}/media-maya.png`,
    when: "12m",
    title: "Coast run Saturday",
    detail: "8:00 AM · Del Mar",
    placeLine: "Saturday · 8:00 AM · Del Mar",
    meta: "Nina is interested",
    interestedCount: 1,
    goingCount: 0,
    startsAt: new Date(Date.now() + 40 * 3600 * 1000).toISOString(),
    joinability: "joinable_friends",
    cta: "I'd go",
    ctaAction: "id_go",
  },
  // --- Local discovery (Follow ≠ Connection) ---
  {
    id: "seed-discovery-local-pottery",
    kind: "discovery",
    person: "Coast Clay Studio",
    personInitial: "◎",
    when: "Near you",
    title: "Open studio tonight",
    detail: "Local discovery · not a follow yet",
    suggested: true,
    cta: "Follow",
    ctaAction: "check_out",
  },
  {
    id: "seed-taylor-graph-sunset",
    kind: "graph",
    person: "Taylor",
    personInitial: "T",
    mediaSrc: `${DEMO}/portrait.jpg`,
    when: "6h",
    title: "Sunset picnic this weekend",
    detail: "Sunday · late afternoon",
    placeLine: "Sunday · late afternoon · local park",
    interestedCount: 3,
    goingCount: 1,
    startsAt: new Date(Date.now() + 70 * 3600 * 1000).toISOString(),
    joinability: "joinable_friends",
    cta: "Open Graph",
    ctaAction: "open_graph",
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
    title: "Rooftop jazz · Downtown",
    detail: "Jordan just arrived · Maya 8 min away",
    meta: "Sadeil + 3 are here",
    broadcaster: "Sabrina",
    host: "Jordan",
    videoLive: true,
    happeningNow: true,
    likeCount: 184,
    commentCount: 23,
    repostCount: 41,
    cta: "Open Live",
    ctaAction: "open_live",
  },
];

/** Temporary Stories rail — Story ≠ Memory (OGX Home). */
export type FounderStoryItem = {
  id: string;
  person: string;
  personInitial: string;
  mediaSrc?: string;
  when: string;
};

export const FOUNDER_STORIES: FounderStoryItem[] = [
  { id: "story-chanelle", person: "Chanelle", personInitial: "C", mediaSrc: `${ASSET}/media-juniper.png`, when: "1h" },
  { id: "story-maya", person: "Maya", personInitial: "M", mediaSrc: `${ASSET}/media-maya.png`, when: "3h" },
  { id: "story-jordan", person: "Jordan", personInitial: "J", mediaSrc: `${DEMO}/food.jpg`, when: "6h" },
  { id: "story-sabrina", person: "Sabrina", personInitial: "S", mediaSrc: `${ASSET}/media-juniper.png`, when: "11h" },
  { id: "story-alex", person: "Alex", personInitial: "A", mediaSrc: `${DEMO}/restaurant.jpg`, when: "18h" },
];

/** People Pulse — OGSN-01 doorway (not a directory). */
export const FOUNDER_PEOPLE_PULSE: FounderPulseItem[] = [
  {
    id: "pulse-maya",
    person: "Maya",
    personInitial: "M",
    avatarSrc: `${ASSET}/avatar-maya.png`,
    mediaSrc: `${ASSET}/media-maya.png`,
    state: "MEMORY",
    targetCardId: "seed-maya-fletcher",
  },
  {
    id: "pulse-jordan",
    person: "Jordan",
    personInitial: "J",
    mediaSrc: `${DEMO}/food.jpg`,
    state: "GRAPH",
    targetCardId: "seed-jordan-market",
  },
  {
    id: "pulse-sabrina",
    person: "Sabrina",
    personInitial: "S",
    mediaSrc: `${ASSET}/media-juniper.png`,
    state: "LIVE",
    targetCardId: "seed-live-sabrina",
  },
  {
    id: "pulse-chanelle",
    person: "Chanelle",
    personInitial: "C",
    avatarSrc: `${ASSET}/avatar-chanelle.png`,
    mediaSrc: `${ASSET}/media-juniper.png`,
    state: "MEMORY",
    targetCardId: "seed-chanelle-juniper",
  },
  {
    id: "pulse-alex",
    person: "Alex",
    personInitial: "A",
    mediaSrc: `${DEMO}/restaurant.jpg`,
    state: "GRAPH",
    targetCardId: "seed-alex-hike",
  },
];

/** Happening-in countdown from startsAt (Graph lifecycle — does not delete Graph). */
export function happeningInLabel(startsAt?: string, nowMs = Date.now()): string | null {
  if (!startsAt) return null;
  const t = Date.parse(startsAt);
  if (!Number.isFinite(t)) return null;
  const delta = t - nowMs;
  if (delta <= 0) return "Happening now";
  const hours = Math.floor(delta / 3600000);
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
  if (days >= 1) return `Happening in ${days}d ${remH}h`;
  if (hours >= 1) return `Happening in ${hours}h`;
  const mins = Math.max(1, Math.floor(delta / 60000));
  return `Happening in ${mins}m`;
}

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
