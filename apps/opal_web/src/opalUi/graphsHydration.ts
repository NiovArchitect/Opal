/**
 * Graphs list composition — prefer-real / seed-off law (Pass 1).
 *
 * Same ownership boundary as homeHydration:
 * - Seed on → fixture authority cards (lab / founder walk)
 * - Seed off → live SharedPlan projections + created overlays only
 * - Seed off + empty live → EMPTY (never paint seed-* as current reality)
 */
import { FOUNDER_HOME_FEED, isFounderSeedEnabled } from "./founderGraphSeed";
import { GRAPH_AUTHORITY_CHROME } from "./graphAuthorityChrome";
import {
  createdPlanGraphOverlay,
  type CreatedPlanSurface,
} from "./graphSurfaceInterop";
import {
  liveGraphsToTimelineItems,
  type TimelineItem,
} from "./graphCalendaring";
import { SEED_TIMELINE_ITEMS } from "./GraphsTemporalTimeline";

export type GraphStatus = "ready" | "action" | "aligned" | "forming" | "idea" | "past";

export type LiveGraphCard = {
  id: string;
  title: string;
  whenLine: string;
  signalLine: string;
  status: "ready" | "action" | "forming" | "aligned" | "past";
  person?: string;
  startsAt?: string | null;
  who?: string[];
};

export type ComposedGraphCard = {
  id: string;
  title: string;
  whenLine: string;
  signalLine: string;
  status: GraphStatus;
  person: string;
  who?: string[];
  real: boolean;
};

export type GraphsHydrationMode =
  | "FOUNDER_FIXTURE"
  | "PRODUCTION_HYDRATION"
  | "EMPTY";

export type ComposeGraphsResult = {
  mode: GraphsHydrationMode;
  graphs: ComposedGraphCard[];
  timelineItems: TimelineItem[];
  /** True when timeline is seed-labeled (fixture only). */
  seedLabeled: boolean;
};

/** Chrome titles + lines matching 618:674; ids remain domain/seed owners. */
export const GRAPH_AUTHORITY_CARDS: {
  id: string;
  title: string;
  whenLine: string;
  signalLine: string;
  status: GraphStatus;
}[] = (
  [
    ["seed-chanelle-juniper", "ready"],
    ["seed-maya-graph-coast", "forming"],
    ["seed-alex-graph-gallery", "aligned"],
    ["seed-near-rooftop", "idea"],
  ] as const
).map(([id, status]) => ({
  id,
  title: GRAPH_AUTHORITY_CHROME[id].title,
  whenLine: GRAPH_AUTHORITY_CHROME[id].whenLine,
  signalLine: GRAPH_AUTHORITY_CHROME[id].signalLine,
  status: status as GraphStatus,
}));

const STATUS_RANK: Record<GraphStatus, number> = {
  action: 0,
  ready: 1,
  aligned: 2,
  forming: 3,
  idea: 4,
  past: 5,
};

function buildSeedCards(
  createdPlans: CreatedPlanSurface[],
): ComposedGraphCard[] {
  const all = FOUNDER_HOME_FEED.filter((c) => c.kind === "graph" || c.kind === "live");
  const byId = new Map(all.map((g) => [g.id, g]));
  const overlayByCardId = new Map<string, ReturnType<typeof createdPlanGraphOverlay>>();
  for (const plan of createdPlans) {
    const overlay = createdPlanGraphOverlay(plan);
    overlayByCardId.set(plan.id, overlay);
    if (plan.sourceIdeaId) overlayByCardId.set(plan.sourceIdeaId, overlay);
  }
  return GRAPH_AUTHORITY_CARDS.map((card) => {
    const src = byId.get(card.id);
    const overlay = overlayByCardId.get(card.id);
    if (overlay) {
      return {
        id: card.id,
        title: overlay.title || card.title,
        whenLine: overlay.whenLine,
        signalLine: overlay.signalLine,
        status: "forming" as GraphStatus,
        person: overlay.person || src?.person || "",
        who: overlay.who,
        real: true,
      };
    }
    return {
      id: card.id,
      title: card.title,
      whenLine: card.whenLine,
      signalLine: card.signalLine,
      status: card.status,
      person: src?.person || "",
      real: false,
    };
  });
}

function buildCreatedExtras(
  createdPlans: CreatedPlanSurface[],
  seededIds: Set<string>,
): ComposedGraphCard[] {
  return createdPlans
    .filter((p) => !seededIds.has(p.id) && !(p.sourceIdeaId && seededIds.has(p.sourceIdeaId)))
    .map((p) => {
      const overlay = createdPlanGraphOverlay(p);
      return {
        id: overlay.id,
        title: overlay.title,
        whenLine: overlay.whenLine,
        signalLine: overlay.signalLine,
        status: "forming" as GraphStatus,
        person: overlay.person,
        who: overlay.who,
        real: true,
      };
    });
}

function sortGraphs(cards: ComposedGraphCard[]): ComposedGraphCard[] {
  return [...cards].sort(
    (a, b) => (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99),
  );
}

/**
 * Compose Graphs people-list + timeline.
 * PRODUCTION / EMPTY never include seed-* authority cards or SEED_TIMELINE_ITEMS.
 */
export function composeGraphsList(opts: {
  liveGraphs?: LiveGraphCard[];
  createdPlans?: CreatedPlanSurface[];
  founderSeedEnabled?: boolean;
}): ComposeGraphsResult {
  const seedOn = opts.founderSeedEnabled ?? isFounderSeedEnabled();
  const liveGraphs = opts.liveGraphs || [];
  const createdPlans = opts.createdPlans || [];

  const live = liveGraphs.map((card) => ({
    ...card,
    person: card.person || "",
    real: true as const,
  }));

  if (seedOn) {
    const seeds = buildSeedCards(createdPlans);
    const seededIds = new Set(seeds.map((s) => s.id));
    const createdExtras = buildCreatedExtras(createdPlans, seededIds);
    const graphs = sortGraphs([...live, ...createdExtras, ...seeds]);

    let timelineItems: TimelineItem[];
    let seedLabeled: boolean;
    if (!liveGraphs.length) {
      timelineItems = SEED_TIMELINE_ITEMS;
      seedLabeled = true;
    } else {
      const liveItems = liveGraphsToTimelineItems(liveGraphs);
      const liveIds = new Set(liveItems.map((i) => i.id));
      const seedExtras = SEED_TIMELINE_ITEMS.filter(
        (s) =>
          !liveIds.has(s.id) && (s.bucket === "someday" || s.bucket === "earlier"),
      );
      timelineItems = [...liveItems, ...seedExtras];
      seedLabeled = false;
    }

    return {
      mode: "FOUNDER_FIXTURE",
      graphs,
      timelineItems,
      seedLabeled,
    };
  }

  // Seed off: live + created only. Never seed-* cards or seed timeline fallback.
  const createdExtras = buildCreatedExtras(createdPlans, new Set());
  const graphs = sortGraphs([...live, ...createdExtras]);
  const timelineItems = liveGraphs.length
    ? liveGraphsToTimelineItems(liveGraphs)
    : [];

  if (!graphs.length) {
    return {
      mode: "EMPTY",
      graphs: [],
      timelineItems: [],
      seedLabeled: false,
    };
  }

  return {
    mode: "PRODUCTION_HYDRATION",
    graphs,
    timelineItems,
    seedLabeled: false,
  };
}

/** True when a Graphs card id is founder-seed fixture chrome. */
export function isSeedGraphCardId(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^seed-/i.test(id);
}
