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
import {
  isCardEligible,
  rankEligibleFeed,
  type RankContext,
  type RankedFeedItem,
} from "./homeFeedRanking";

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
 * Bound visually identical Conversation→Graph clones.
 * Distinct conversations may remain; indistinct mass clones must not.
 */
export function diversifyConsequenceCards(
  cards: FounderFeedCard[],
  opts?: { maxConsequences?: number },
): FounderFeedCard[] {
  const maxC = opts?.maxConsequences ?? 6;
  const out: FounderFeedCard[] = [];
  let consequenceCount = 0;
  const seenConv = new Set<string>();
  for (const c of cards) {
    if (c.kind !== "consequence") {
      out.push(c);
      continue;
    }
    if (consequenceCount >= maxC) continue;
    // Prefer rich signature consequences (turns + alignment) over bare signal shells.
    const rich =
      (c.conversationTurns && c.conversationTurns.length > 0) ||
      (c.alignmentSteps && c.alignmentSteps.length > 0);
    const convKey = c.id.replace(/^consequence-/, "") || c.id;
    if (seenConv.has(convKey)) continue;
    // When oversubscribed, keep rich ones first by skipping bare shells early.
    if (!rich && consequenceCount >= Math.min(2, maxC)) continue;
    seenConv.add(convKey);
    consequenceCount += 1;
    out.push(c);
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
  // Authenticated production (hasProd, seed off) always uses PRODUCTION_HYDRATION.
  // Explicit founder seed (?opal_founder_seed=1) keeps FOUNDER_FIXTURE for visual QA only.
  if (hasProd && prod && !seedOn) {
    const raw = diversifyConsequenceCards(collectProductionCards(prod));
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
    // Fixture path: authored 618:44 rhythm only. Do NOT append liveSignal mass clones.
    // Durable/production enrichments belong in PRODUCTION_HYDRATION, not here.
    const extras = (opts.fixtureExtras || []).filter((c) => {
      // Allow intentional rich extras; reject bare consequence shells from signal floods.
      if (c.kind !== "consequence") return true;
      return (
        (c.conversationTurns && c.conversationTurns.length > 0) ||
        (c.alignmentSteps && c.alignmentSteps.length > 0)
      );
    });
    // Dated 618:44 visual grammar order for founder-seed walk:
    // Conversation → Memory → Graph → Discovery → Carousel → (fill) → Live → Next Peek
    const authorityIds = [
      "seed-consequence-chanelle",
      "seed-maya-fletcher",
      "seed-jordan-market",
      "seed-discovery-nina-ceramics",
      "seed-alex-carousel",
    ];
    const byId = new Map(FOUNDER_HOME_FEED.map((c) => [c.id, c] as const));
    const prefix = authorityIds.map((id) => byId.get(id)).filter(Boolean) as typeof FOUNDER_HOME_FEED;
    const prefixSet = new Set(authorityIds);
    const mid = FOUNDER_HOME_FEED.filter(
      (c) => !prefixSet.has(c.id) && c.id !== "seed-riley-memory-voice",
    );
    const peek = FOUNDER_HOME_FEED.filter((c) => c.id === "seed-riley-memory-voice");
    const raw = diversifyConsequenceCards([
      ...prefix,
      ...mid,
      ...FOUNDER_LIVE_FEED,
      ...peek,
      ...extras,
    ]);
    const ctx = opts.rankContext || {};
    const extraIds = new Set(extras.map((e) => e.id));
    const ordered: RankedFeedItem[] = [];
    const seenIds = new Set<string>();
    let pos = 0;
    for (const card of raw) {
      if (!isCardEligible(card, ctx)) continue;
      if (seenIds.has(card.id)) continue;
      seenIds.add(card.id);
      ordered.push({
        ...card,
        eligible: true,
        rankScore: 1000 - pos,
        rankPosition: pos,
        sourceOwner: extraIds.has(card.id)
          ? "conversation_consequence"
          : "founder_fixture",
      });
      pos += 1;
    }
    return {
      mode: "FOUNDER_FIXTURE",
      source: "founder_fixture",
      cards: ordered,
      ownerKeysPresent: ["FounderFixture", ...(extras.length ? ["ConversationConsequences"] : [])],
    };
  }

  return { mode: "EMPTY", source: "empty", cards: [], ownerKeysPresent: [] };
}

/** Map conversation signals → Home consequence cards (authorized projection). */
/**
 * Project conversation signals into Conversation→Graph cards.
 * Requires place+when (or richer human_surface) — not every chat becomes a clone.
 * Dedupes by conversation_id. Caller should diversifyConsequenceCards before render.
 */
export function consequenceCardsFromSignals(
  signals: Array<Record<string, unknown>>,
  nameByConv: Map<string, string>,
): FounderFeedCard[] {
  const out: FounderFeedCard[] = [];
  const seen = new Set<string>();
  for (const s of signals || []) {
    const id = typeof s.conversation_id === "string" ? s.conversation_id : null;
    if (!id || seen.has(id)) continue;
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
    // Require alignment-quality signal: place AND when (or explicit aligned state).
    const aligned =
      sr.alignment_state === "aligned" ||
      hs.alignment_state === "aligned" ||
      (place && when);
    if (!aligned) continue;
    if (!place && !when && !headline) continue;
    seen.add(id);
    const whoLine = typeof hs.who_line === "string" ? hs.who_line : null;
    const who = nameByConv.get(id) || whoLine || "Friends";
    const person = String(who).split(",")[0]?.trim() || "Friends";
    const alignmentSteps: { primary: string; secondary: string }[] = [];
    if (when) alignmentSteps.push({ primary: String(when), secondary: "time aligned" });
    if (place) alignmentSteps.push({ primary: String(place), secondary: "place in view" });
    out.push({
      id: `consequence-${id}`,
      kind: "consequence",
      person,
      personInitial: person.slice(0, 1).toUpperCase(),
      when: "Just now",
      relationshipLabel: `Connection · now`,
      title: "Conversation became a Graph",
      detail: [place, when].filter(Boolean).join(" · ") || headline || "",
      meta: typeof s.label === "string" ? s.label : undefined,
      placeLine: place || undefined,
      alignmentSteps: alignmentSteps.length ? alignmentSteps : undefined,
      cta: "Open Graph →",
      ctaAction: "open_graph",
    });
  }
  return diversifyConsequenceCards(out, { maxConsequences: 6 });
}
