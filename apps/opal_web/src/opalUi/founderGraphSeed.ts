/**
 * LOCAL DEVELOPMENT / FOUNDER SEED for Opal Graph Home (201:5).
 *
 * Not customer-facing "demo" chrome. Internally tagged for evidence.
 * Same card components and action hooks production will hydrate from real
 * relationship / follow / local worlds (145:46 endless refill).
 */
export const FOUNDER_GRAPH_SEED_ID = "founder-graph-seed-v1";

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

/** Deterministic founder seed cards matching Figma 201:5 grammar. */
export const FOUNDER_HOME_FEED: FounderFeedCard[] = [
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
    id: "seed-maya-fletcher",
    kind: "memory",
    person: "Maya",
    personInitial: "M",
    avatarSrc: `${ASSET}/avatar-maya.png`,
    thumbSrc: `${ASSET}/media-maya.png`,
    when: "15m",
    title: "Sunset walk at Fletcher Cove",
    detail: "Last night",
    ctaAction: "open_memory",
  },
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
];

export const FOUNDER_LIVE_FEED: FounderFeedCard[] = [
  {
    id: "seed-live-juniper",
    kind: "live",
    person: "Chanelle",
    personInitial: "C",
    avatarSrc: `${ASSET}/avatar-chanelle.png`,
    mediaSrc: `${ASSET}/media-juniper.png`,
    when: "Happening now",
    title: "Juniper & Ivy",
    detail: "Downtown San Diego · Led by Chanelle",
    meta: "Sadeil locked in · Sabrina ETA 8 min · Table ready",
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
  // Default on for local/dev validation until production graph hydrates.
  return true;
}
