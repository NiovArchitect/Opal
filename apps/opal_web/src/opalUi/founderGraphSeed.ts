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
export const FOUNDER_GRAPH_SEED_ID = "founder-graph-seed-v4-ogx-home-closure";

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

export type ConversationTurn = {
  speaker: string;
  body: string;
  role: "self" | "peer";
};

export type AlignmentStep = {
  primary: string;
  secondary: string;
  /** Optional mode/visibility line (Graph 289:39). */
  tertiary?: string;
  /** Wave B: Figma 618:162–175 timeline accent (dot + time). */
  accent?: string;
};

/** Home Graph timeline accents — actual Figma 618:162–175 paints. */
export const HOME_GRAPH_TIMELINE_COLORS = [
  "#00E5FF",
  "#E8D6C4",
  "#8B5CF6",
  "#FFC86B",
] as const;

export type SharedHistoryMetrics = {
  messages?: number;
  graphs?: number;
  people?: number;
};

export type FounderFeedCard = {
  id: string;
  kind: GraphFeedKind;
  person: string;
  personInitial: string;
  avatarSrc?: string;
  mediaSrc?: string;
  thumbSrc?: string;
  /** Optional carousel media for Memory carousel (289:84). */
  mediaSrcs?: string[];
  when: string;
  /** ISO post time — live relative labels tick from this. */
  createdAt?: string;
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
  /** Multi-day trip end — when set with startsAt spanning ≥1 day, UI shows date range. */
  endsAt?: string;
  /** Explicit trip date-range label (e.g. "Oct 14–17") preferred over countdown. */
  tripDateRange?: string;
  placeLine?: string;
  joinability?: "joinable_friends" | "visible_not_joinable" | "invite_only" | "public";
  /** Live attribution */
  broadcaster?: string;
  host?: string;
  videoLive?: boolean;
  happeningNow?: boolean;
  /** Suggested discovery — FollowGraph only, not Connection. */
  suggested?: boolean;
  relationshipLabel?: string;
  /** Conversation → Graph (289:2) turns + alignment trajectory. */
  conversationTurns?: ConversationTurn[];
  alignmentSteps?: AlignmentStep[];
  sharedHistory?: SharedHistoryMetrics;
  /** Graph timeline nodes (289:39). */
  graphNodes?: AlignmentStep[];
  /** Domain backing for commitment states (P0-05.7) — never local-only Going truth. */
  sharedPlanId?: string;
  conversationId?: string;
  viewerResponseState?: "proposed" | "accepted" | "declined" | "tentative" | "withdrawn";
  commitmentPhase?: boolean;
  journeyAvailable?: boolean;
  lockInLabel?: string;
  cta?: string;
  ctaAction:
    | "id_go"
    | "im_going"
    | "open_journey"
    | "check_out"
    | "open_memory"
    | "open_graph"
    | "open_live"
    | "none";
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
  // --- Alive feed block (founder §4) — Maya / Jordan / Sabrina / Chanelle / Alex / Nina ---
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
    id: "seed-maya-alive-memory",
    kind: "memory",
    person: "Maya",
    personInitial: "M",
    avatarSrc: `${ASSET}/avatar-maya.png`,
    mediaSrc: `${ASSET}/media-maya.png`,
    thumbSrc: `${ASSET}/media-maya.png`,
    when: "32m ago",
    relationshipLabel: "Connection · 32m",
    title: "Coast light after the long drive.",
    detail: "Memory",
    caption: "Coast light after the long drive.",
    likesLabel: "Liked by Nina and others",
    likeCount: 86,
    commentCount: 11,
    repostCount: 4,
    shareCount: 9,
    ctaAction: "open_memory",
  },
  {
    id: "seed-sabrina-alive-memory",
    kind: "memory",
    person: "Sabrina",
    personInitial: "S",
    avatarSrc: "/figma-v2/stories/sabrina.png",
    mediaSrc: `${ASSET}/media-live-city-1728.png`,
    thumbSrc: `${ASSET}/media-live-city-1728.png`,
    when: "1h ago",
    title: "Night walk after the set.",
    detail: "Memory",
    caption: "Night walk after the set.",
    likeCount: 214,
    commentCount: 28,
    repostCount: 12,
    shareCount: 19,
    ctaAction: "open_memory",
  },
  {
    id: "seed-chanelle-alive-memory",
    kind: "memory",
    person: "Chanelle",
    personInitial: "C",
    avatarSrc: `${ASSET}/avatar-chanelle.png`,
    mediaSrc: "/figma-v2/person/mem-1.png",
    thumbSrc: "/figma-v2/person/mem-1.png",
    when: "2h ago",
    title: "Brunch that ran long. worth it.",
    detail: "Memory",
    caption: "Brunch that ran long. worth it.",
    likeCount: 64,
    commentCount: 8,
    repostCount: 2,
    shareCount: 5,
    ctaAction: "open_memory",
  },
  {
    id: "seed-alex-alive-memory",
    kind: "memory",
    person: "Alex",
    personInitial: "A",
    avatarSrc: `${DEMO}/portrait.jpg`,
    mediaSrc: `${DEMO}/restaurant.jpg`,
    thumbSrc: `${DEMO}/restaurant.jpg`,
    when: "3h ago",
    title: "Mexico City after midnight.",
    detail: "Memory",
    caption: "Mexico City after midnight.",
    likeCount: 312,
    commentCount: 41,
    repostCount: 22,
    shareCount: 37,
    ctaAction: "open_memory",
  },
  // --- Conversation → Graph consequence — Figma 289:2 ---
  {
    id: "seed-consequence-chanelle",
    kind: "consequence",
    person: "Chanelle",
    personInitial: "C",
    avatarSrc: "/figma-v2/feed/chanelle-avatar.png",
    when: "4m",
    relationshipLabel: "Connection · 4m",
    title: "Conversation became a Graph",
    detail: "Juniper & Ivy · Saturday · 7:30 PM",
    meta: "table looks open · leave ~6:55",
    placeLine: "Juniper & Ivy",
    startsAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    conversationTurns: [
      { speaker: "Sadeil", body: "Juniper tonight?", role: "self" },
      { speaker: "Chanelle", body: "I can do 7:30.", role: "peer" },
    ],
    alignmentSteps: [
      { primary: "7:30 PM", secondary: "time aligned" },
      { primary: "Juniper & Ivy", secondary: "table looks open" },
      { primary: "Leave ~6:55", secondary: "18 min from you" },
    ],
    sharedHistory: { messages: 528, graphs: 6, people: 9 },
    cta: "Open Graph →",
    ctaAction: "open_graph",
  },
  // --- Memory — Figma 618:124 Maya ---
  {
    id: "seed-maya-fletcher",
    kind: "memory",
    person: "Maya",
    personInitial: "M",
    avatarSrc: `${ASSET}/avatar-maya.png`,
    thumbSrc: `${ASSET}/media-maya-618-130-v2.png`,
    mediaSrc: `${ASSET}/media-maya-618-130-v2.png`,
    when: "48m",
    relationshipLabel: "Connection · 48m",
    title: "we missed the turn and found this view instead.",
    detail: "Last Saturday · persists on Maya's profile",
    caption: "we missed the turn and found this view instead.",
    likeCount: 24,
    commentCount: 6,
    repostCount: 2,
    shareCount: 4,
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
  // --- Graph (possibility) — Figma 289:39 ---
  {
    id: "seed-jordan-market",
    kind: "graph",
    person: "Jordan",
    personInitial: "J",
    avatarSrc: `${DEMO}/portrait.jpg`,
    mediaSrc: `${DEMO}/food.jpg`,
    thumbSrc: `${DEMO}/food.jpg`,
    when: "4m",
    relationshipLabel: "Graph",
    title: "Farmers market + coast",
    detail: "Saturday · 10:00 AM · Oceanside",
    placeLine: "Saturday · 10:00 AM · Oceanside",
    caption: "Farmers market + coast",
    meta: "4 interested · 2 going",
    interestedCount: 4,
    goingCount: 2,
    lockInLabel: "Posted 4m ago",
    graphNodes: [
      { primary: "10:00 AM", secondary: "Oceanside Farmers Market", tertiary: "joinable · friends", accent: HOME_GRAPH_TIMELINE_COLORS[0] },
      { primary: "12:30 PM", secondary: "Walk the coast", tertiary: "visible · easy add-on", accent: HOME_GRAPH_TIMELINE_COLORS[1] },
      { primary: "7:30 PM", secondary: "Birthday dinner", tertiary: "invite only", accent: HOME_GRAPH_TIMELINE_COLORS[2] },
      { primary: "OPEN", secondary: "The rest of Saturday", tertiary: "Graph keeps possibility visible", accent: HOME_GRAPH_TIMELINE_COLORS[3] },
    ],
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
    mediaSrc: "/figma-v2/person/graph-juniper.png",
    when: "2m ago",
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
    id: "seed-alex-carousel",
    kind: "memory",
    person: "Alex",
    personInitial: "A",
    mediaSrc: `${ASSET}/media-travel-carousel-1728.png`,
    thumbSrc: `${ASSET}/media-travel-carousel-1728.png`,
    mediaSrcs: [
      `${ASSET}/media-travel-carousel-1728.png`,
      `${DEMO}/restaurant.jpg`,
      `${DEMO}/food.jpg`,
    ],
    when: "2h",
    relationshipLabel: "Following · 2h",
    title: "Mexico City after midnight.",
    detail: "photo carousel · yesterday's trip",
    caption: "Mexico City after midnight.",
    likeCount: 81,
    commentCount: 9,
    repostCount: 3,
    shareCount: 7,
    ctaAction: "open_memory",
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
    mediaSrc: "/figma-v2/person/mem-1.png",
    thumbSrc: "/figma-v2/person/mem-1.png",
    when: "15m",
    title: "Brunch that ran long",
    detail: "La Jolla",
    caption: "Brunch that ran long",
    likeCount: 64,
    ctaAction: "open_memory",
  },
  {
    id: "seed-chanelle-memory-hour",
    kind: "memory",
    person: "Chanelle",
    personInitial: "C",
    avatarSrc: `${ASSET}/avatar-chanelle.png`,
    mediaSrc: "/figma-v2/person/mem-2.png",
    thumbSrc: "/figma-v2/person/mem-2.png",
    when: "1h",
    title: "Shared hour",
    detail: "What became real",
    caption: "Shared hour",
    likeCount: 22,
    ctaAction: "open_memory",
  },
  {
    id: "seed-chanelle-memory-yesterday",
    kind: "memory",
    person: "Chanelle",
    personInitial: "C",
    avatarSrc: `${ASSET}/avatar-chanelle.png`,
    mediaSrc: "/figma-v2/person/graph-juniper.png",
    thumbSrc: "/figma-v2/person/graph-juniper.png",
    when: "Yesterday",
    title: "Yesterday",
    detail: "What became real",
    caption: "Yesterday",
    likeCount: 18,
    ctaAction: "open_memory",
  },
  {
    id: "seed-chanelle-memory-earlier-a",
    kind: "memory",
    person: "Chanelle",
    personInitial: "C",
    avatarSrc: `${ASSET}/avatar-chanelle.png`,
    mediaSrc: "/figma-v2/person/mem-3.png",
    thumbSrc: "/figma-v2/person/mem-3.png",
    when: "",
    title: "Earlier",
    detail: "What became real",
    caption: "Earlier",
    likeCount: 11,
    ctaAction: "open_memory",
  },
  {
    id: "seed-chanelle-memory-earlier-b",
    kind: "memory",
    person: "Chanelle",
    personInitial: "C",
    avatarSrc: `${ASSET}/avatar-chanelle.png`,
    mediaSrc: "/figma-v2/person/mem-4.png",
    thumbSrc: "/figma-v2/person/mem-4.png",
    when: "",
    title: "Earlier",
    detail: "What became real",
    caption: "Earlier",
    likeCount: 9,
    ctaAction: "open_memory",
  },
  {
    id: "seed-chanelle-memory-earlier-c",
    kind: "memory",
    person: "Chanelle",
    personInitial: "C",
    avatarSrc: `${ASSET}/avatar-chanelle.png`,
    mediaSrc: "/figma-v2/person/mem-1.png",
    thumbSrc: "/figma-v2/person/mem-1.png",
    when: "",
    title: "Earlier",
    detail: "What became real",
    caption: "Earlier",
    likeCount: 7,
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
    title: "Farmers market + coast",
    detail: "Saturday · after 10 · Del Mar",
    placeLine: "Saturday · after 10 · Del Mar",
    meta: "Jordan is interested",
    interestedCount: 1,
    goingCount: 0,
    startsAt: new Date(Date.now() + 40 * 3600 * 1000).toISOString(),
    joinability: "joinable_friends",
    cta: "I'd go",
    ctaAction: "id_go",
  },
  // --- Discovery FEED 04 — Figma 618:182 Nina ---
  {
    id: "seed-discovery-nina-ceramics",
    kind: "discovery",
    person: "Nina",
    personInitial: "N",
    avatarSrc: `${DEMO}/portrait.jpg`,
    mediaSrc: `${ASSET}/media-live-city-1728.png`,
    thumbSrc: `${ASSET}/media-live-city-1728.png`,
    when: "nearby",
    relationshipLabel: "Not followed · nearby relevance",
    title: "Coastline ceramics pop-up",
    detail: "Oceanside · today 5:30 PM · 8 mi",
    caption:
      "Outside your follows, but unusually relevant to the coastal + creative experiences you keep choosing.",
    suggested: true,
    cta: "See experience →",
    ctaAction: "check_out",
  },
  // --- Local discovery (Follow ≠ Connection) ---
  {
    id: "seed-discovery-local-pottery",
    kind: "discovery",
    person: "Coast Clay Studio",
    personInitial: "◎",
    mediaSrc: `${ASSET}/media-maya.png`,
    thumbSrc: `${ASSET}/media-maya.png`,
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
  // --- Diversity block (≥20 stream objects with seed+live) ---
  {
    id: "seed-nina-memory-coffee",
    kind: "memory",
    person: "Nina",
    personInitial: "N",
    mediaSrc: `${DEMO}/restaurant.jpg`,
    thumbSrc: `${DEMO}/restaurant.jpg`,
    when: "5h",
    title: "Quiet coffee before the week",
    detail: "Memory",
    caption: "Quiet coffee before the week",
    likeCount: 19,
    commentCount: 2,
    ctaAction: "open_memory",
  },
  {
    id: "seed-alex-graph-gallery",
    kind: "graph",
    person: "Alex",
    personInitial: "A",
    mediaSrc: `${DEMO}/restaurant.jpg`,
    when: "20m",
    title: "Mexico City",
    detail: "Trip Graph · Fri → Sun",
    placeLine: "Trip Graph · Mexico City",
    interestedCount: 2,
    goingCount: 1,
    /** Multi-day trip — show Oct 14–17, never a single-moment countdown. */
    startsAt: "2026-10-14T12:00:00.000Z",
    endsAt: "2026-10-17T12:00:00.000Z",
    tripDateRange: "Oct 14-17",
    joinability: "joinable_friends",
    cta: "Open Graph",
    ctaAction: "open_graph",
  },
  {
    id: "seed-riley-memory-voice",
    kind: "memory",
    person: "Chanelle",
    personInitial: "C",
    avatarSrc: `${ASSET}/avatar-chanelle.png`,
    when: "yesterday",
    relationshipLabel: "Connection · yesterday",
    title: '"I want to remember this exact part."',
    detail: "0:38 audio · persistent Memory",
    caption: '"I want to remember this exact part."',
    likeCount: 11,
    ctaAction: "open_memory",
  },
  {
    id: "seed-discovery-farmers",
    kind: "discovery",
    person: "Oceanside Market",
    personInitial: "◎",
    mediaSrc: `${ASSET}/media-travel-carousel-1728.png`,
    thumbSrc: `${ASSET}/media-travel-carousel-1728.png`,
    when: "Near you",
    title: "Saturday market stalls",
    detail: "Local discovery · public experience",
    suggested: true,
    cta: "Follow",
    ctaAction: "check_out",
  },
  {
    id: "seed-jordan-memory-skate",
    kind: "memory",
    person: "Jordan",
    personInitial: "J",
    mediaSrc: `${DEMO}/food.jpg`,
    when: "Yesterday",
    title: "Skate clips from the new spot",
    detail: "Memory",
    caption: "Skate clips from the new spot",
    likeCount: 48,
    commentCount: 7,
    ctaAction: "open_memory",
  },
];

/** Stamp ISO createdAt from seed when-labels so Home relative times can tick live. */
function stampFeedCreatedAt(cards: FounderFeedCard[]): void {
  const now = Date.now();
  for (const card of cards) {
    if (card.createdAt) continue;
    const raw = String(card.when || "").trim();
    if (/^yesterday$/i.test(raw)) {
      card.createdAt = new Date(now - 24 * 60 * 60 * 1000).toISOString();
      continue;
    }
    const m = raw.match(/^(\d+)\s*m(?:\s*ago)?$/i);
    if (m) {
      card.createdAt = new Date(now - Number(m[1]) * 60 * 1000).toISOString();
      continue;
    }
    const h = raw.match(/^(\d+)\s*h(?:\s*ago)?$/i);
    if (h) {
      card.createdAt = new Date(now - Number(h[1]) * 60 * 60 * 1000).toISOString();
      continue;
    }
    const d = raw.match(/^(\d+)\s*d(?:\s*ago)?$/i);
    if (d) {
      card.createdAt = new Date(now - Number(d[1]) * 24 * 60 * 60 * 1000).toISOString();
    }
  }
}

stampFeedCreatedAt(FOUNDER_HOME_FEED);

/** High-salience Live objects (rarer). Soft interest must not fake attendance. */
export const FOUNDER_LIVE_FEED: FounderFeedCard[] = [
  {
    id: "seed-live-sabrina",
    kind: "live",
    person: "Sabrina",
    personInitial: "S",
    avatarSrc: "/figma-v2/stories/sabrina.png",
    mediaSrc: `${ASSET}/media-live-city-1728.png`,
    thumbSrc: `${ASSET}/media-live-city-1728.png`,
    when: "now",
    relationshipLabel: "Connection · now",
    title: "Rooftop jazz · Downtown",
    detail: "Live by Sabrina · hosted by Jordan",
    caption: "Rooftop jazz · Downtown",
    meta: "Jordan just arrived · Maya 8 min away",
    broadcaster: "Sabrina",
    host: "Jordan",
    videoLive: true,
    happeningNow: true,
    goingCount: 3,
    likeCount: 184,
    commentCount: 23,
    repostCount: 41,
    cta: "Open Live",
    ctaAction: "open_live",
  },
];

stampFeedCreatedAt(FOUNDER_LIVE_FEED);

/** Temporary Stories rail — Story ≠ Memory (OGX Home). */
export type FounderStoryItem = {
  id: string;
  person: string;
  personInitial: string;
  /** Ring / chrome avatar (may be portrait). */
  avatarSrc?: string;
  /** Full-bleed temporary Story media — must NOT be a profile photo alone. */
  mediaSrc?: string;
  /** Presentation kind — playback timing only; server expiry stays separate. */
  mediaKind?: "image" | "video";
  caption?: string;
  when: string;
  /** ISO post time for live relative labels. */
  createdAt?: string;
  /** Founder screenshot B — status under name on the Stories doorway. */
  pulseState?: PulseState;
};

/**
 * Figma 287:20 Stories rail.
 * Founder walk: viewer must open real temporary content, not a 96px profile crop.
 * Avatars keep the rail identity; mediaSrc is a lived moment.
 * Order + pulseState match founder screenshot B.
 */
export const FOUNDER_STORIES: FounderStoryItem[] = [
  {
    id: "story-maya",
    person: "Maya",
    personInitial: "M",
    avatarSrc: "/figma-v2/stories/maya.png",
    mediaSrc: `${ASSET}/media-maya.png`,
    caption: "Golden hour walk before we meet up",
    when: "3h",
    pulseState: "MEMORY",
  },
  {
    id: "story-jordan",
    person: "Jordan",
    personInitial: "J",
    avatarSrc: "/figma-v2/stories/jordan.png",
    mediaSrc: `${DEMO}/restaurant.jpg`,
    caption: "Who's actually free tonight?",
    when: "6h",
    pulseState: "GRAPH",
  },
  {
    id: "story-sabrina",
    person: "Sabrina",
    personInitial: "S",
    avatarSrc: "/figma-v2/stories/sabrina.png",
    mediaSrc: `${DEMO}/food.jpg`,
    caption: "Late dessert run. join?",
    when: "11h",
    pulseState: "LIVE",
  },
  {
    id: "story-chanelle",
    person: "Chanelle",
    personInitial: "C",
    avatarSrc: "/figma-v2/stories/chanelle.png",
    mediaSrc: `${ASSET}/media-juniper.png`,
    caption: "Table's almost ours ✨",
    when: "1h",
    pulseState: "MEMORY",
  },
  {
    id: "story-alex",
    person: "Alex",
    personInitial: "A",
    avatarSrc: "/figma-v2/stories/alex.png",
    mediaSrc: `${DEMO}/portrait.jpg`,
    caption: "Temporary share. disappears.",
    when: "18h",
    pulseState: "GRAPH",
  },
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

/**
 * Happening-in countdown from startsAt (Graph lifecycle — does not delete Graph).
 * Multi-day trips (endsAt ≥ 24h after startsAt, or explicit tripDateRange) show a
 * date range like "Oct 14–17" instead of "Happening in 1d 3h".
 */
export function happeningInLabel(
  startsAt?: string,
  nowMs = Date.now(),
  opts?: { endsAt?: string; tripDateRange?: string },
): string | null {
  if (opts?.tripDateRange?.trim()) return opts.tripDateRange.trim();
  if (startsAt && opts?.endsAt) {
    const s = Date.parse(startsAt);
    const e = Date.parse(opts.endsAt);
    if (Number.isFinite(s) && Number.isFinite(e) && e - s >= 24 * 3600000) {
      const fmt = (ms: number) =>
        new Date(ms).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        });
      return `${fmt(s)}-${fmt(e)}`;
    }
  }
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

/**
 * Founder visual fixture for Home.
 *
 * DEFAULT FALSE for authenticated production.
 * Enable only with explicit opt-in:
 *   VITE_OPAL_FOUNDER_SEED=true
 *   or ?opal_founder_seed=1
 *
 * Never silently render FOUNDER_HOME_FEED on production accounts.
 */
const FOUNDER_SEED_SESSION_KEY = "opal.founder_seed.opt_in.v1";
/** H-01: persistent opt-in so the Home social feed survives tab closes.
 *  Session-only stickiness caused the fixture feed to "disappear" between
 *  walks. localStorage keeps the founder's opt-in; ?opal_founder_seed=0
 *  clears both stores. */
const FOUNDER_SEED_LOCAL_KEY = "opal.founder_seed.opt_in.persist.v1";

export function persistFounderSeedOptIn() {
  try {
    window.sessionStorage?.setItem(FOUNDER_SEED_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
  try {
    window.localStorage?.setItem(FOUNDER_SEED_LOCAL_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Call as early as possible (main.tsx) so reset/reload cannot race the opt-in away. */
export function persistFounderSeedFromUrl(href = typeof window !== "undefined" ? window.location.href : ""): boolean {
  if (typeof window === "undefined") return false;
  try {
    const u = new URL(href || window.location.href);
    if (u.searchParams.get("opal_founder_seed") === "0") return false;
    if (
      u.searchParams.get("opal_founder_seed") === "1" ||
      u.searchParams.get("opal_holy_shit") === "1"
    ) {
      persistFounderSeedOptIn();
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function logFounderSeedGate(enabled: boolean, reason: string) {
  if (typeof window === "undefined") return;
  try {
    const w = window as Window & {
      __opalSeedPipeline?: Record<string, unknown>;
    };
    w.__opalSeedPipeline = {
      ...(w.__opalSeedPipeline || {}),
      enabled,
      reason,
      href: window.location.href,
      ls: window.localStorage?.getItem(FOUNDER_SEED_LOCAL_KEY) || null,
      ss: window.sessionStorage?.getItem(FOUNDER_SEED_SESSION_KEY) || null,
      at: Date.now(),
    };
    // Throttle identical spam from re-renders; always log on reason change.
    const key = `${enabled}:${reason}`;
    const prev = (w.__opalSeedPipeline as { _logKey?: string })._logKey;
    if (prev === key) return;
    (w.__opalSeedPipeline as { _logKey?: string })._logKey = key;
    console.info("[opal-seed]", {
      step: "isFounderSeedEnabled",
      enabled,
      reason,
      ls: w.__opalSeedPipeline.ls,
      ss: w.__opalSeedPipeline.ss,
    });
  } catch {
    /* ignore */
  }
}

/** Private LAN / loopback — Expo native host against local Vite is founder/dev only. */
function isPrivateLanHost(hostname: string): boolean {
  const h = (hostname || "").toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0" || h === "::1") return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  return false;
}

function isNativeHostOptIn(): boolean {
  try {
    const u = new URL(window.location.href);
    if (u.searchParams.get("opal_native_host") === "1") return true;
  } catch {
    /* ignore */
  }
  try {
    if (window.sessionStorage?.getItem("opal_native_host") === "1") return true;
  } catch {
    /* ignore */
  }
  try {
    if (document.documentElement.classList.contains("opal-native-host")) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function isFounderSeedEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const u = new URL(window.location.href);
    if (u.searchParams.get("opal_founder_seed") === "1") {
      // Always persist — survives reset_first_run, replaceState, and tab close.
      persistFounderSeedOptIn();
      logFounderSeedGate(true, "url:opal_founder_seed=1");
      return true;
    }
    // Holy Shit walks continue into the member shell with the same seed chrome.
    if (u.searchParams.get("opal_holy_shit") === "1") {
      persistFounderSeedOptIn();
      logFounderSeedGate(true, "url:opal_holy_shit=1");
      return true;
    }
    if (u.searchParams.get("opal_founder_seed") === "0") {
      try {
        window.sessionStorage?.removeItem(FOUNDER_SEED_SESSION_KEY);
      } catch {
        /* ignore */
      }
      try {
        window.localStorage?.removeItem(FOUNDER_SEED_LOCAL_KEY);
      } catch {
        /* ignore */
      }
      logFounderSeedGate(false, "url:opal_founder_seed=0");
      return false;
    }
  } catch {
    /* ignore */
  }
  try {
    if (window.sessionStorage?.getItem(FOUNDER_SEED_SESSION_KEY) === "1") {
      logFounderSeedGate(true, "sessionStorage");
      return true;
    }
  } catch {
    /* ignore */
  }
  try {
    // Survives ?opal_reset_first_run=1 (reset must NOT clear this key).
    if (window.localStorage?.getItem(FOUNDER_SEED_LOCAL_KEY) === "1") {
      logFounderSeedGate(true, "localStorage");
      return true;
    }
  } catch {
    /* ignore */
  }
  // Expo ProductWebSurface historically loaded bare ?opal_native_host=1 (no seed
  // query). Founder phone walks against LAN Vite must still get seed chrome —
  // otherwise chats fall through to Italian/backend residue. Public hosts never
  // hit this branch. Explicit ?opal_founder_seed=0 still wins above.
  try {
    if (isNativeHostOptIn() && isPrivateLanHost(window.location.hostname)) {
      persistFounderSeedOptIn();
      logFounderSeedGate(true, "native_host+lan");
      return true;
    }
  } catch {
    /* ignore */
  }
  try {
    const v = (import.meta as { env?: Record<string, string> }).env?.VITE_OPAL_FOUNDER_SEED;
    if (v === "true" || v === "1") {
      logFounderSeedGate(true, "env:VITE_OPAL_FOUNDER_SEED");
      return true;
    }
    if (v === "false" || v === "0") {
      logFounderSeedGate(false, "env:VITE_OPAL_FOUNDER_SEED=0");
      return false;
    }
  } catch {
    /* ignore */
  }
  logFounderSeedGate(false, "default");
  return false;
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
