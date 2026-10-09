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
  const when = plan.when || "Soon";
  const place = plan.place || plan.what || "Dinner";
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
    relationshipLabel: "Graph · just now",
    title,
    detail: `${when} · ${place}`,
    placeLine: `${when} · ${place}`,
    caption: title,
    meta: "Created with Opal",
    interestedCount: 1,
    goingCount: 0,
    startsAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    joinability: "joinable_friends",
    likeCount: 0,
    commentCount: 0,
    sharedPlanId: plan.sharedPlanId || plan.id,
    conversationId: plan.conversationId || undefined,
    cta: "Open Graph",
    ctaAction: "open_graph",
  };
}

export function createdPlanToChatRow(plan: CreatedPlanSurface): ChatsHomeRow {
  const who = plan.who || "Friend";
  const title = plan.title || `Plans with ${who}`;
  const when = plan.when || "";
  const label = [title.replace(/\s+with\s+.+$/i, "").trim() || title, when]
    .filter(Boolean)
    .join(" · ");
  return {
    id: plan.conversationId || `seed-chat-${plan.id}`,
    name: who,
    kind: "direct",
    preview: "Opal set this up",
    when: "now",
    relationshipLabel: "Direct connection",
    planConsequence: {
      state: "ready",
      label: label || title,
      planId: plan.id,
      tone: inferPlanPillTone(label || title),
    },
    avatarTone: "#00E5FF",
  };
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
  const createdRows = created.map(createdPlanToChatRow);
  const byName = new Set(createdRows.map((r) => r.name.toLowerCase()));
  const rest = base.filter((r) => !byName.has(r.name.toLowerCase()));
  return [...createdRows, ...rest];
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
 */
export function planFromOpalMetadata(
  metadata: Record<string, unknown> | null | undefined,
): CreatedPlanSurface | null {
  if (!metadata || typeof metadata !== "object") return null;
  const intent = (metadata.intent || metadata) as Record<string, unknown>;
  const intentName = String(intent.intent || intent["intent"] || "");
  const entities = (intent.entities || intent) as Record<string, unknown>;
  const confirmed = entities.confirmed === true || intentName === "plan_confirm";
  const planId = (entities.plan_id || entities.planId || entities.id) as string | undefined;
  if (!confirmed && !planId) return null;
  if (intentName && intentName !== "plan_confirm" && !planId) return null;

  const whoRaw = entities.who;
  const who = Array.isArray(whoRaw)
    ? String(whoRaw[0] || "Friend")
    : String(whoRaw || entities.person || "Friend");
  const whatRaw = entities.what ? String(entities.what) : "";
  // Paste W4 Phase 1 — echo user words; never invent "Dinner" / Movie titles.
  const what = whatRaw.trim() || "plans";
  const titleFromEntity = String(entities.title || "").trim();
  const title =
    titleFromEntity ||
    `${planTitleWithFriend(what, who)}${entities.when ? ` ${entities.when}` : ""}`.trim();
  const id =
    (typeof planId === "string" && planId) ||
    localPlanSurfaceId(who, title);

  return {
    id,
    title,
    who,
    when: entities.when ? String(entities.when) : null,
    what: what.toLowerCase(),
    place: planTitleFromUserWords(what),
    conversationId: entities.conversation_id
      ? String(entities.conversation_id)
      : null,
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
  const who = withWho?.[1] || possessiveWho?.[1] || "Maya";
  const whenMatch = prior.match(
    /\b(Friday|Saturday|Sunday|Monday|Tuesday|Wednesday|Thursday|tonight|tomorrow|this weekend)\b/i,
  );
  const when = whenMatch?.[1] || "Friday";
  // Paste W4 Phase 1 — include beach + echo user words; never default to dinner.
  const whatMatch = prior.match(
    /\b(dinner|brunch|lunch|hike|coffee|drinks|beach|walk|church|movie)\b/i,
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
    sharedPlanId: id,
    createdAt: new Date().toISOString(),
  };
}
