/**
 * Cross-surface interop: Center plan → chat pill → feed Graph → on_the_way.
 * Keeps Chats, Home feed, and Graph detail on the same plan id.
 */

import {
  planTitleFromUserWords,
  planTitleWithFriend,
} from "../onboarding/identityVoice";
import type { ChatsHomeRow } from "./ChatsHome";
import type { FounderFeedCard } from "./founderGraphSeed";
import { inferPlanPillTone } from "./founderChatsPlanPills";
import type { TravelState } from "./journeyPresence";

export type CreatedPlanSurface = {
  id: string;
  title: string;
  who: string;
  when?: string | null;
  what?: string | null;
  place?: string | null;
  conversationId?: string | null;
  sharedPlanId?: string | null;
  /** Idea card id this plan grew from (e.g. seed-near-rooftop) — GraphsHome overlays that card. */
  sourceIdeaId?: string | null;
  createdAt: string;
};

export type TravelOverride = {
  graphId: string;
  travelState: TravelState;
  label: string;
  updatedAt: string;
};

const STORAGE_PLANS = "opal.graph_surface.created_plans.v1";
const STORAGE_TRAVEL = "opal.graph_surface.travel.v1";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private / quota */
  }
}

export function loadCreatedPlans(): CreatedPlanSurface[] {
  const list = readJson<CreatedPlanSurface[]>(STORAGE_PLANS, []);
  return Array.isArray(list) ? list : [];
}

export function persistCreatedPlans(plans: CreatedPlanSurface[]) {
  writeJson(STORAGE_PLANS, plans.slice(0, 24));
}

export function loadTravelOverrides(): Record<string, TravelOverride> {
  const map = readJson<Record<string, TravelOverride>>(STORAGE_TRAVEL, {});
  return map && typeof map === "object" ? map : {};
}

export function persistTravelOverrides(map: Record<string, TravelOverride>) {
  writeJson(STORAGE_TRAVEL, map);
}

/** Build a stable local surface id when backend plan_id is absent (founder seed). */
export function localPlanSurfaceId(who: string, title: string): string {
  const slug = `${who}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `local-plan-${slug || "dinner"}`;
}

export function createdPlanToFeedCard(plan: CreatedPlanSurface): FounderFeedCard {
  const who = plan.who || "Friend";
  const title = plan.title || `Plans with ${who}`;
  // Echo composer/state only — never invent clock times or meal nouns.
  const when = (plan.when || "").trim();
  const place = (plan.place || plan.what || "").trim();
  const detail = [when, place].filter(Boolean).join(" · ") || "Forming";
  const initial = who.slice(0, 1).toUpperCase();
  return {
    id: plan.id,
    kind: "graph",
    person: who,
    personInitial: initial,
    avatarSrc: `https://picsum.photos/seed/${encodeURIComponent(who)}/96/96`,
    mediaSrc: `https://picsum.photos/seed/${encodeURIComponent(plan.id)}/600/400`,
    thumbSrc: `https://picsum.photos/seed/${encodeURIComponent(plan.id)}/600/400`,
    when: "just now",
    relationshipLabel: "Graph · forming",
    title,
    detail,
    placeLine: detail,
    caption: title,
    meta: "Forming · pending",
    interestedCount: 1,
    goingCount: 0,
    // No invented startsAt — forming plans must not show happening countdowns.
    joinability: "joinable_friends",
    likeCount: 0,
    commentCount: 0,
    sharedPlanId: plan.sharedPlanId || plan.id,
    conversationId: plan.conversationId || undefined,
    cta: "Open Graph",
    ctaAction: "open_graph",
  };
}

/** GraphsHome / detail overlay lines from a created (still-forming) plan. */
export function createdPlanGraphOverlay(plan: CreatedPlanSurface): {
  id: string;
  title: string;
  whenLine: string;
  signalLine: string;
  status: "forming";
  person: string;
  who: string[];
} {
  const people = plan.who
    ? plan.who.split(/,|&/).map((p) => p.trim()).filter(Boolean)
    : [];
  const whenLine = [plan.when, people.length ? people.join(", ") : null]
    .filter(Boolean)
    .join(" · ");
  return {
    id: plan.sourceIdeaId || plan.id,
    title: plan.title || "Plan",
    whenLine: whenLine || "Forming",
    signalLine: "Forming · pending",
    status: "forming",
    person: people[0] || plan.who || "",
    who: people,
  };
}

/** Prefer created plan for an idea/graph id (id or sourceIdeaId match). */
export function findCreatedPlanForCard(
  cardId: string,
  created: CreatedPlanSurface[],
): CreatedPlanSurface | undefined {
  return (
    created.find((p) => p.id === cardId) ||
    created.find((p) => p.sourceIdeaId === cardId)
  );
}

/**
 * Repair #5 — SUBJECT≠RECIPIENT.
 * Owner-private Center plans must NOT invent a human Direct row.
 * Only project into Chats when a real conversation_id was shared.
 */
export function createdPlanToChatRow(plan: CreatedPlanSurface): ChatsHomeRow | null {
  const cid = (plan.conversationId || "").trim();
  // Reject synthetic seed-chat-* and empty — those caused duplicate Maya Directs + "Chat"/"C".
  if (!cid || /^seed-chat-/i.test(cid) || /^local-plan-/i.test(cid)) {
    return null;
  }
  const who = sanitizeConsumerLabel(plan.who) || "Friend";
  const title = sanitizeConsumerLabel(plan.title) || `Plans with ${who}`;
  const when = plan.when || "";
  const label = [title.replace(/\s+with\s+.+$/i, "").trim() || title, when]
    .filter(Boolean)
    .join(" · ");
  return {
    id: cid,
    name: who,
    kind: "direct",
    preview: "Opal set this up",
    when: "now",
    relationshipLabel: "Direct connection",
    planConsequence: {
      // Paste W5 — unconfirmed composer plans are forming/pending, never ready/locked.
      state: "forming",
      label: sanitizeConsumerLabel(label) || title,
      planId: plan.id,
      tone: inferPlanPillTone(label || title),
    },
    avatarTone: "#00E5FF",
  };
}

/** Drop byte-slice damage / vague nouns from consumer-visible plan chips. */
export function sanitizeConsumerLabel(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = String(raw).trim();
  if (!t) return null;
  const down = t.toLowerCase();
  if (
    /^(omething|thing|ome|something|anything|everything|nothing|stuff|things)$/i.test(
      down,
    )
  ) {
    return null;
  }
  // "Omething · Friday" / "Got it: thing soon…" chips
  if (/^omething\b/i.test(t) || /^thing\b/i.test(t)) {
    return t.replace(/^(omething|thing)\b/i, "Plans").replace(/\s+/g, " ").trim();
  }
  return t;
}

export function travelLabelFor(state: TravelState, etaLabel?: string | null): string {
  if (state === "arrived") return "Arrived";
  if (state === "on_the_way") return etaLabel?.trim() || "On the way";
  return "";
}

/** Apply travel overrides onto chat plan pills (same planId). */
export function applyTravelToChatRows(
  rows: ChatsHomeRow[],
  travel: Record<string, TravelOverride>,
): ChatsHomeRow[] {
  return rows.map((row) => {
    const pill = row.planConsequence;
    if (!pill?.planId) return row;
    const ov = travel[pill.planId];
    if (!ov || !ov.label) return row;
    return {
      ...row,
      planConsequence: {
        ...pill,
        state: ov.travelState === "on_the_way" || ov.travelState === "arrived" ? "action" : pill.state,
        label: ov.label,
        tone: ov.travelState === "on_the_way" ? "live" : pill.tone,
      },
    };
  });
}

/** Merge base founder/production rows with Center-created plans (created first). */
export function mergeChatRowsWithCreated(
  base: ChatsHomeRow[],
  created: CreatedPlanSurface[],
): ChatsHomeRow[] {
  if (!created.length) return base;
  // Private Center plans (no real conversationId) stay Graph-only — no invented Directs.
  const createdRows = created
    .map(createdPlanToChatRow)
    .filter((r): r is ChatsHomeRow => r != null);
  if (!createdRows.length) return base;
  // Dedupe by conversation id (never two Maya Directs from two private plans).
  const byId = new Map<string, ChatsHomeRow>();
  for (const r of createdRows) {
    if (!byId.has(r.id)) byId.set(r.id, r);
  }
  const uniqueCreated = [...byId.values()];
  const createdIds = new Set(uniqueCreated.map((r) => r.id));
  const rest = base.filter((r) => !createdIds.has(r.id));
  // Overlay plan pill onto existing same-id row instead of inventing a second person row.
  const overlaid = rest.map((r) => {
    const fromCreated = uniqueCreated.find((c) => c.id === r.id);
    if (!fromCreated?.planConsequence) return r;
    return {
      ...r,
      planConsequence: fromCreated.planConsequence,
      preview: r.preview || fromCreated.preview,
    };
  });
  const restIds = new Set(overlaid.map((r) => r.id));
  const novel = uniqueCreated.filter((c) => !restIds.has(c.id));
  return [...novel, ...overlaid];
}

export function mergeFeedWithCreated(
  extras: FounderFeedCard[] | undefined,
  created: CreatedPlanSurface[],
): FounderFeedCard[] {
  const fromCreated = created.map(createdPlanToFeedCard);
  const extrasSafe = extras || [];
  const ids = new Set(fromCreated.map((c) => c.id));
  return [...fromCreated, ...extrasSafe.filter((c) => !ids.has(c.id))];
}

/** Resolve a feed/detail card from seed + dynamic created plans. */
export function resolveGraphSurfaceCard(
  cardId: string,
  seedCards: FounderFeedCard[],
  created: CreatedPlanSurface[],
): FounderFeedCard | undefined {
  const fromSeed = seedCards.find((c) => c.id === cardId);
  if (fromSeed) return fromSeed;
  const plan = created.find((p) => p.id === cardId);
  return plan ? createdPlanToFeedCard(plan) : undefined;
}

/**
 * Parse Center reply metadata for a confirmed plan.
 * Backend shape: metadata.intent = { intent: "plan_confirm", entities: { plan_id, title, who, when, what, confirmed } }
 *
 * Repair #5: require real plan_confirm. Bare plan_id on plan_create / planning_context
 * must NOT surface as CreatedPlan → Chats nav / Maya Direct row.
 */
export function planFromOpalMetadata(
  metadata: Record<string, unknown> | null | undefined,
): CreatedPlanSurface | null {
  if (!metadata || typeof metadata !== "object") return null;
  const intent = (metadata.intent || metadata) as Record<string, unknown>;
  const intentName = String(intent.intent || intent["intent"] || "");
  const entities = (intent.entities || intent) as Record<string, unknown>;
  const confirmed =
    entities.confirmed === true || intentName === "plan_confirm";
  const planId = (entities.plan_id || entities.planId || entities.id) as string | undefined;
  // Only emit after explicit confirm — ignore durable planning plan_id on asks.
  if (intentName !== "plan_confirm" || !confirmed) return null;
  if (!planId || typeof planId !== "string") return null;

  const whoRaw = entities.who;
  const who = Array.isArray(whoRaw)
    ? String(whoRaw[0] || "Friend")
    : String(whoRaw || entities.person || "Friend");
  const whatRaw = entities.what ? String(entities.what) : "";
  // Paste W4 Phase 1 — echo user words; never invent "Dinner" / Movie titles.
  // Repair #5 — never durable-paint "Omething" / "thing" from byte-slice damage.
  const whatClean = sanitizeConsumerLabel(whatRaw.trim()) || "plans";
  const titleFromEntity = sanitizeConsumerLabel(String(entities.title || "").trim()) || "";
  const title =
    titleFromEntity ||
    `${planTitleWithFriend(whatClean, who)}${entities.when ? ` ${entities.when}` : ""}`.trim();
  const id =
    (typeof planId === "string" && planId) ||
    localPlanSurfaceId(who, title);
  const conversationId = entities.conversation_id
    ? String(entities.conversation_id)
    : null;

  return {
    id,
    title,
    who,
    when: entities.when ? String(entities.when) : null,
    what: whatClean.toLowerCase(),
    place: planTitleFromUserWords(whatClean),
    // Null conversationId = owner-private Center plan (no human Direct projection).
    conversationId,
    sharedPlanId: typeof planId === "string" ? planId : id,
    createdAt: new Date().toISOString(),
  };
}

/** Founder-seed local confirm: synthesize a surface when Yes follows a plan ask. */
export function planFromLocalConfirm(opts: {
  priorUserText?: string;
  affirmText?: string;
}): CreatedPlanSurface | null {
  const affirm = (opts.affirmText || "").trim().toLowerCase();
  if (!/^(yes|yeah|yep|sure|ok|okay|do it|set it up|please)\b/.test(affirm)) {
    return null;
  }
  const prior = opts.priorUserText || "";
  const withWho = prior.match(/\b(?:with|for)\s+([A-Z][a-z]+)\b/);
  const possessiveWho = prior.match(
    /\b([A-Z][a-z]+)(?:'s)\s+(?:birthday|dinner|plans?)\b/,
  );
  // Person-agnostic: never hardcode Maya. Unresolved who stays Friend.
  const who = withWho?.[1] || possessiveWho?.[1] || "Friend";
  const whenMatch = prior.match(
    /\b(Friday|Saturday|Sunday|Monday|Tuesday|Wednesday|Thursday|tonight|tomorrow|this weekend)\b/i,
  );
  const when = whenMatch?.[1] || "soon";
  // Paste W4 Phase 1 — include beach + echo user words; never default to dinner.
  const whatMatch = prior.match(
    /\b(dinner|brunch|lunch|hike|coffee|drinks|beach|walk|church|movie|birthday)\b/i,
  );
  const activity = (whatMatch?.[1] || "plans").toLowerCase();
  const title = planTitleWithFriend(activity, who);
  const id = localPlanSurfaceId(who, `${activity}-${when}`);
  return {
    id,
    title,
    who,
    when,
    what: activity,
    place: planTitleFromUserWords(activity),
    // Local founder confirm is Center-private until explicit share.
    conversationId: null,
    sharedPlanId: id,
    createdAt: new Date().toISOString(),
  };
}
