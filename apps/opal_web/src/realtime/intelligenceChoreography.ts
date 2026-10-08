/**
 * Intelligence broadcast choreography — CHANNEL_CONTRACT event names:
 *
 *   intelligence:conflict_alert
 *   intelligence:plan_update_suggestion
 *   intelligence:nudge
 *   intelligence:presence_nudge
 *   intelligence:commitment_reminder
 *
 * First-class (Phase 6) — prefer when BE emits them:
 *   intelligence:group_blocked
 *   intelligence:group_consensus
 *   intelligence:weekly_briefing
 *   intelligence:temporal_anchor
 *
 * ONE-RELEASE FALLBACK (keep until BE cuts over): mediation / briefing /
 * temporal may still arrive as intelligence:nudge + inbox:attention. Handlers
 * accept both; first-class events win when present. Do not remove interim
 * mapping until founder validates real choreography_events.
 *
 * Handler contract: update store first → audience check account_id →
 * dedupe last 500 event_ids → timestamp LWW.
 *
 * Degraded reconnect refresh scope: Center + thread list + open thread only
 * (not full app remount). Out-of-order events lose via LWW; rapid-fire batches
 * coalesce by event_id dedupe window.
 */
import type { Channel } from "phoenix";

export const INTELLIGENCE_EVENTS = [
  "intelligence:conflict_alert",
  "intelligence:plan_update_suggestion",
  "intelligence:nudge",
  "intelligence:presence_nudge",
  "intelligence:commitment_reminder",
  "intelligence:group_blocked",
  "intelligence:group_consensus",
  "intelligence:weekly_briefing",
  "intelligence:temporal_anchor",
] as const;

/** Original five CHANNEL_CONTRACT names (pre–Phase 6). */
export const INTELLIGENCE_EVENTS_CORE = [
  "intelligence:conflict_alert",
  "intelligence:plan_update_suggestion",
  "intelligence:nudge",
  "intelligence:presence_nudge",
  "intelligence:commitment_reminder",
] as const;

/** Phase 6 first-class events (prefer over nudge interim). */
export const INTELLIGENCE_EVENTS_FIRST_CLASS = [
  "intelligence:group_blocked",
  "intelligence:group_consensus",
  "intelligence:weekly_briefing",
  "intelligence:temporal_anchor",
] as const;

export type IntelligenceEventName = (typeof INTELLIGENCE_EVENTS)[number];

export type IntelligencePayload = {
  schema_version?: number;
  event_id: string;
  intent_type?: string;
  account_id?: string | null;
  ref_ids?: string[];
  reason?: string | null;
  priority?: number;
  summary?: string | null;
  conversation_id?: string | null;
  plan_id?: string | null;
  person_id?: string | null;
  /** Optional enrichment for reminder/mediation interim mapping */
  anchor_date?: string | null;
  timestamp?: string | number | null;
  [key: string]: unknown;
};

export type IntelligenceStoreEntry = {
  event_id: string;
  event: IntelligenceEventName;
  payload: IntelligencePayload;
  receivedAt: number;
  ts: number;
};

export type IntelligenceStoreSnapshot = {
  byEventId: Map<string, IntelligenceStoreEntry>;
  /** Ordered recent event ids (newest last), capped at 500 for dedupe. */
  recentEventIds: string[];
  /** Latest entry per logical key (intent + refs) for LWW. */
  byLogicalKey: Map<string, IntelligenceStoreEntry>;
  attentionRefreshNeeded: boolean;
  lastConflictAlert: IntelligenceStoreEntry | null;
  lastPlanSuggestion: IntelligenceStoreEntry | null;
  lastNudge: IntelligenceStoreEntry | null;
  lastPresenceNudge: IntelligenceStoreEntry | null;
  lastCommitmentReminder: IntelligenceStoreEntry | null;
  lastGroupBlocked: IntelligenceStoreEntry | null;
  lastGroupConsensus: IntelligenceStoreEntry | null;
  lastWeeklyBriefing: IntelligenceStoreEntry | null;
  lastTemporalAnchor: IntelligenceStoreEntry | null;
};

const DEDUPE_CAP = 500;

export type IntelligenceChoreographyOptions = {
  /** Current signed-in account — private events must match. */
  accountId: string | null;
  /** Called after store mutation (UI may refresh attention / Center). */
  onStoreChange?: (snap: IntelligenceStoreSnapshot) => void;
  /** Privacy: strip foreign private fields if seen. */
  onPrivacyStrip?: (accountId: string, payload: IntelligencePayload) => void;
  now?: () => number;
};

function logicalKey(
  event: IntelligenceEventName,
  payload: IntelligencePayload,
): string {
  const refs = (payload.ref_ids || []).join(",");
  return [
    event,
    payload.intent_type || "",
    payload.person_id || "",
    payload.plan_id || "",
    payload.conversation_id || "",
    payload.anchor_date || "",
    refs,
  ].join("|");
}

function payloadTs(payload: IntelligencePayload, fallback: number): number {
  if (typeof payload.timestamp === "number" && Number.isFinite(payload.timestamp)) {
    return payload.timestamp;
  }
  if (typeof payload.timestamp === "string") {
    const n = Date.parse(payload.timestamp);
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}

export function createIntelligenceStore(): IntelligenceStoreSnapshot {
  return {
    byEventId: new Map(),
    recentEventIds: [],
    byLogicalKey: new Map(),
    attentionRefreshNeeded: false,
    lastConflictAlert: null,
    lastPlanSuggestion: null,
    lastNudge: null,
    lastPresenceNudge: null,
    lastCommitmentReminder: null,
    lastGroupBlocked: null,
    lastGroupConsensus: null,
    lastWeeklyBriefing: null,
    lastTemporalAnchor: null,
  };
}

export class IntelligenceChoreography {
  private store: IntelligenceStoreSnapshot;
  private opts: IntelligenceChoreographyOptions;
  private batchQueue: Array<{
    event: IntelligenceEventName;
    payload: IntelligencePayload;
  }> = [];
  private batchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: IntelligenceChoreographyOptions) {
    this.opts = opts;
    this.store = createIntelligenceStore();
  }

  getSnapshot(): IntelligenceStoreSnapshot {
    return this.store;
  }

  setAccountId(accountId: string | null): void {
    this.opts.accountId = accountId;
  }

  /**
   * Primary handler — store first, then audience, dedupe, LWW.
   * Returns false when dropped (audience / duplicate / stale LWW).
   */
  handle(
    event: IntelligenceEventName,
    raw: unknown,
  ): { accepted: boolean; reason?: string; entry?: IntelligenceStoreEntry } {
    const payload = normalizePayload(raw);
    if (!payload?.event_id) {
      return { accepted: false, reason: "missing_event_id" };
    }

    // 1) Store-first bookkeeping attempt key
    const receivedAt = (this.opts.now || Date.now)();
    const ts = payloadTs(payload, receivedAt);

    // 2) Audience check — private user events must match account_id
    if (isPrivateEvent(event)) {
      const owner = this.opts.accountId;
      if (
        owner &&
        payload.account_id &&
        payload.account_id !== owner
      ) {
        this.opts.onPrivacyStrip?.(payload.account_id, payload);
        console.warn(
          "[intelligenceChoreography] audience isolation drop",
          event,
          payload.account_id,
        );
        return { accepted: false, reason: "audience_mismatch" };
      }
    }

    // 3) Dedupe last 500 event_ids
    if (this.store.byEventId.has(payload.event_id)) {
      return { accepted: false, reason: "duplicate_event_id" };
    }

    // 4) Timestamp LWW on logical key
    const key = logicalKey(event, payload);
    const prior = this.store.byLogicalKey.get(key);
    if (prior && prior.ts > ts) {
      return { accepted: false, reason: "stale_lww" };
    }

    const entry: IntelligenceStoreEntry = {
      event_id: payload.event_id,
      event,
      payload,
      receivedAt,
      ts,
    };

    this.store.byEventId.set(payload.event_id, entry);
    this.store.recentEventIds.push(payload.event_id);
    while (this.store.recentEventIds.length > DEDUPE_CAP) {
      const evicted = this.store.recentEventIds.shift();
      if (evicted) this.store.byEventId.delete(evicted);
    }
    this.store.byLogicalKey.set(key, entry);

    switch (event) {
      case "intelligence:conflict_alert":
        this.store.lastConflictAlert = entry;
        break;
      case "intelligence:plan_update_suggestion":
        this.store.lastPlanSuggestion = entry;
        break;
      case "intelligence:nudge":
        this.store.lastNudge = entry;
        this.store.attentionRefreshNeeded = true;
        break;
      case "intelligence:presence_nudge":
        this.store.lastPresenceNudge = entry;
        break;
      case "intelligence:commitment_reminder":
        this.store.lastCommitmentReminder = entry;
        this.store.attentionRefreshNeeded = true;
        break;
      case "intelligence:group_blocked":
        this.store.lastGroupBlocked = entry;
        this.store.attentionRefreshNeeded = true;
        break;
      case "intelligence:group_consensus":
        this.store.lastGroupConsensus = entry;
        this.store.attentionRefreshNeeded = true;
        break;
      case "intelligence:weekly_briefing":
        this.store.lastWeeklyBriefing = entry;
        this.store.attentionRefreshNeeded = true;
        break;
      case "intelligence:temporal_anchor":
        this.store.lastTemporalAnchor = entry;
        this.store.attentionRefreshNeeded = true;
        break;
    }

    // ONE-RELEASE FALLBACK: nudge reason codes that map to mediation/briefing/temporal
    // until BE emits first-class events above.
    if (event === "intelligence:nudge") {
      const reason = String(payload.reason || "").toLowerCase();
      if (
        reason.includes("mediat") ||
        reason.includes("briefing") ||
        reason.includes("temporal") ||
        reason.includes("celebration") ||
        reason.includes("reminder") ||
        reason.includes("group_blocked") ||
        reason.includes("group_consensus")
      ) {
        this.store.attentionRefreshNeeded = true;
      }
    }

    this.opts.onStoreChange?.(this.store);
    return { accepted: true, entry };
  }

  /** Rapid-fire batching — coalesce microtask/timeout window. */
  enqueueBatched(
    event: IntelligenceEventName,
    payload: IntelligencePayload,
  ): void {
    this.batchQueue.push({ event, payload });
    if (this.batchTimer) return;
    this.batchTimer = setTimeout(() => {
      this.batchTimer = null;
      const batch = this.batchQueue.splice(0, this.batchQueue.length);
      for (const item of batch) {
        this.handle(item.event, item.payload);
      }
    }, 16);
  }

  /**
   * Degraded reconnect: mark attention refresh; caller refreshes
   * Center + thread list + open thread only.
   * Also covers inbox:attention invalidation when choreography is offline.
   */
  markReconnectRefresh(): void {
    this.store.attentionRefreshNeeded = true;
    this.opts.onStoreChange?.(this.store);
  }

  clearAttentionRefreshFlag(): void {
    this.store.attentionRefreshNeeded = false;
  }

  /** Wire Phoenix channel handlers for all contract + first-class events. */
  bindChannel(channel: Channel): () => void {
    const handlers = INTELLIGENCE_EVENTS.map((eventName) => {
      const ref = channel.on(eventName, (payload: unknown) => {
        this.handle(eventName, payload);
      });
      return { eventName, ref };
    });
    return () => {
      for (const h of handlers) {
        try {
          channel.off(h.eventName, h.ref);
        } catch {
          /* ignore */
        }
      }
    };
  }
}

function isPrivateEvent(event: IntelligenceEventName): boolean {
  return (
    event === "intelligence:nudge" ||
    event === "intelligence:presence_nudge" ||
    event === "intelligence:commitment_reminder" ||
    event === "intelligence:group_blocked" ||
    event === "intelligence:group_consensus" ||
    event === "intelligence:weekly_briefing" ||
    event === "intelligence:temporal_anchor"
  );
}

export function normalizePayload(raw: unknown): IntelligencePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const event_id =
    typeof o.event_id === "string"
      ? o.event_id
      : typeof o.id === "string"
        ? o.id
        : null;
  if (!event_id) return null;
  return {
    schema_version:
      typeof o.schema_version === "number" ? o.schema_version : 1,
    event_id,
    intent_type: typeof o.intent_type === "string" ? o.intent_type : undefined,
    account_id: typeof o.account_id === "string" ? o.account_id : null,
    ref_ids: Array.isArray(o.ref_ids)
      ? o.ref_ids.filter((x): x is string => typeof x === "string")
      : [],
    reason: typeof o.reason === "string" ? o.reason : null,
    priority: typeof o.priority === "number" ? o.priority : undefined,
    summary: typeof o.summary === "string" ? o.summary : null,
    conversation_id:
      typeof o.conversation_id === "string" ? o.conversation_id : null,
    plan_id: typeof o.plan_id === "string" ? o.plan_id : null,
    person_id: typeof o.person_id === "string" ? o.person_id : null,
    anchor_date: typeof o.anchor_date === "string" ? o.anchor_date : null,
    timestamp: (o.timestamp as string | number | null | undefined) ?? null,
  };
}

/** FE dedupe key for reminder vs nudge same (person_id, date) — used in F6 polish. */
export function reminderDedupeKey(
  personId: string | null | undefined,
  date: string | null | undefined,
): string | null {
  if (!personId || !date) return null;
  return `${personId}|${date}`;
}
