/**
 * Production Home hydration vs founder fixture.
 *
 * FOUNDER_FIXTURE and PRODUCTION_HYDRATION are explicit modes.
 * Never mix fixture cards into production accounts accidentally.
 */

import {
  FOUNDER_HOME_FEED,
  FOUNDER_LIVE_FEED,
  isFounderSeedEnabled,
  type FounderFeedCard,
} from "./founderGraphSeed";
import { rankEligibleFeed, type RankContext, type RankedFeedItem } from "./homeFeedRanking";

export type HomeHydrationMode = "FOUNDER_FIXTURE" | "PRODUCTION_HYDRATION" | "EMPTY";

export type HomeHydrationSource =
  | "founder_fixture"
  | "production_owners"
  | "empty";

export type ProductionHomeOwners = {
  followGraph?: { followingNames?: string[]; followingUserIds?: string[] } | null;
  relationshipGraph?: { connectionNames?: string[] } | null;
  experienceLineage?: FounderFeedCard[] | null;
  profiles?: unknown;
  memories?: FounderFeedCard[] | null;
  graphs?: FounderFeedCard[] | null;
  liveEligibility?: FounderFeedCard[] | null;
  localDiscovery?: FounderFeedCard[] | null;
  conversationConsequences?: FounderFeedCard[] | null;
  ranking?: RankContext | null;
};

export type ComposeHomeFeedResult = {
  mode: HomeHydrationMode;
  source: HomeHydrationSource;
  cards: RankedFeedItem[];
  ownerKeysPresent: string[];
};

/** Resolve which content owner drives Home for this session. */
export function resolveHomeHydrationSource(opts: {
  founderSeedEnabled: boolean;
  production?: ProductionHomeOwners | null;
}): HomeHydrationSource {
  const prod = opts.production;
  const hasProd = productionOwnersPresent(prod);
  if (hasProd) return "production_owners";
  if (opts.founderSeedEnabled) return "founder_fixture";
  return "empty";
}

export function productionOwnersPresent(prod?: ProductionHomeOwners | null): boolean {
  if (!prod) return false;
  return Object.values(prod).some((v) => {
    if (v == null) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") return Object.keys(v as object).length > 0;
    return true;
  });
}

export const HOME_PRODUCTION_OWNER_KEYS = [
  "FollowGraph",
  "RelationshipGraph",
  "ExperienceLineage",
  "Profiles",
  "Memories",
  "Graphs",
  "LiveEligibility",
  "LocalDiscovery",
  "ConversationConsequences",
  "RankingService",
] as const;

function collectProductionCards(prod: ProductionHomeOwners): FounderFeedCard[] {
  const buckets: FounderFeedCard[][] = [
    prod.memories || [],
    prod.graphs || [],
    prod.liveEligibility || [],
    prod.localDiscovery || [],
    prod.conversationConsequences || [],
    prod.experienceLineage || [],
  ];
  const seen = new Set<string>();
  const out: FounderFeedCard[] = [];
  for (const bucket of buckets) {
    for (const c of bucket) {
      if (!c?.id || seen.has(c.id)) continue;
      seen.add(c.id);
      out.push(c);
    }
  }
  return out;
}

/**
 * Compose Home stream.
 * PRODUCTION_HYDRATION never includes FOUNDER_HOME_FEED cards.
 * FOUNDER_FIXTURE uses seed only (plus optional live overlay from seed).
 */
export function composeHomeFeed(opts: {
  production?: ProductionHomeOwners | null;
  founderSeedEnabled?: boolean;
  /** Authorized live consequences may enrich fixture without flipping production mode. */
  fixtureExtras?: FounderFeedCard[];
  rankContext?: RankContext;
}): ComposeHomeFeedResult {
  const seedOn = opts.founderSeedEnabled ?? isFounderSeedEnabled();
  const prod = opts.production;
  const hasProd = productionOwnersPresent(prod);

  // Explicit boundary: production accounts never receive founder fixture cards.
  // When founder seed is on, remain in FOUNDER_FIXTURE even if production owners exist.
  if (hasProd && prod && !seedOn) {
    const raw = collectProductionCards(prod);
    const ctx: RankContext = {
      ...(opts.rankContext || {}),
      ...(prod.ranking || {}),
      followingNames:
        opts.rankContext?.followingNames ||
        prod.followGraph?.followingNames ||
        prod.ranking?.followingNames,
      relationshipNames:
        opts.rankContext?.relationshipNames ||
        prod.relationshipGraph?.connectionNames ||
        prod.ranking?.relationshipNames,
    };
    const ranked = rankEligibleFeed(raw, ctx, "production_owners");
    const ownerKeysPresent = HOME_PRODUCTION_OWNER_KEYS.filter((k) => {
      const map: Record<string, unknown> = {
        FollowGraph: prod.followGraph,
        RelationshipGraph: prod.relationshipGraph,
        ExperienceLineage: prod.experienceLineage,
        Profiles: prod.profiles,
        Memories: prod.memories,
        Graphs: prod.graphs,
        LiveEligibility: prod.liveEligibility,
        LocalDiscovery: prod.localDiscovery,
        ConversationConsequences: prod.conversationConsequences,
        RankingService: prod.ranking || true,
      };
      const v = map[k];
      if (v == null) return false;
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === "object") return Object.keys(v as object).length > 0;
      return !!v;
    });
    return {
      mode: "PRODUCTION_HYDRATION",
      source: "production_owners",
      cards: ranked,
      ownerKeysPresent,
    };
  }

  if (seedOn) {
    const extras = opts.fixtureExtras || [];
    const raw = [...FOUNDER_HOME_FEED, ...FOUNDER_LIVE_FEED, ...extras];
    const ranked = rankEligibleFeed(raw, opts.rankContext || {}, "founder_fixture");
    // Mark conversation extras honestly in sourceOwner via re-rank tag on matching ids
    const extraIds = new Set(extras.map((e) => e.id));
    const tagged = ranked.map((c) =>
      extraIds.has(c.id)
        ? { ...c, sourceOwner: "conversation_consequence" as const }
        : c,
    );
    return {
      mode: "FOUNDER_FIXTURE",
      source: "founder_fixture",
      cards: tagged,
      ownerKeysPresent: ["FounderFixture", ...(extras.length ? ["ConversationConsequences"] : [])],
    };
  }

  return { mode: "EMPTY", source: "empty", cards: [], ownerKeysPresent: [] };
}

/** Map conversation signals → Home consequence cards (authorized projection). */
export function consequenceCardsFromSignals(
  signals: Array<Record<string, unknown>>,
  nameByConv: Map<string, string>,
): FounderFeedCard[] {
  const out: FounderFeedCard[] = [];
  for (const s of signals || []) {
    const id = typeof s.conversation_id === "string" ? s.conversation_id : null;
    if (!id) continue;
    const sr = (s.shared_reality || {}) as Record<string, unknown>;
    const hs = (sr.human_surface || {}) as Record<string, unknown>;
    const place =
      (typeof hs.place_line === "string" && hs.place_line) ||
      (typeof sr.where === "string" && sr.where) ||
      null;
    const when =
      (typeof hs.when_line === "string" && hs.when_line) ||
      (typeof sr.when === "string" && sr.when) ||
      null;
    const headline =
      (typeof hs.headline === "string" && hs.headline) ||
      (typeof sr.headline === "string" && sr.headline) ||
      (typeof s.label === "string" && s.label) ||
      null;
    if (!place && !when && !headline) continue;
    const whoLine = typeof hs.who_line === "string" ? hs.who_line : null;
    const who = nameByConv.get(id) || whoLine || "Friends";
    const person = String(who).split(",")[0]?.trim() || "Friends";
    out.push({
      id: `consequence-${id}`,
      kind: "consequence",
      person,
      personInitial: person.slice(0, 1).toUpperCase(),
      when: "Just now",
      title: "Conversation became a Graph",
      detail: [place, when].filter(Boolean).join(" · ") || headline || "",
      meta: typeof s.label === "string" ? s.label : undefined,
      placeLine: place || undefined,
      cta: "Open Graph",
      ctaAction: "open_graph",
    });
  }
  return out;
}
