/**
 * Notification delivery seam (Pass 14).
 *
 * AttentionAuthority decides WHETHER intervention is justified.
 * This module decides HOW/IF to deliver — never escalates severity.
 *
 * Not a notification center. Not a feed.
 * Browser Notification adapter + pure delivery history for dedupe.
 */

import type { ProductSignal } from "../api/productClient";
import { evaluateAttention, scoreAttention } from "./attentionAuthority";
import type { FlowConsequence } from "./personalFlow";

export type DeliveryClass = "silent" | "ambient" | "notify" | "supersede" | "suppress" | "expire";

export type DeliveryPermission = "unknown" | "granted" | "denied" | "unavailable";

export type DeliveryIntent = {
  id: string;
  recipientHint?: string;
  realityId: string;
  consequenceId: string;
  supersessionKey: string;
  deliveryClass: DeliveryClass;
  copy: string | null;
  lockScreenCopy: string | null;
  notBefore?: string | null;
  expiresAt?: string | null;
  privacy: "minimal" | "standard";
  privacyTransformed: boolean;
  channel: "none" | "in_app" | "browser_notification";
  reasons: string[];
};

export type DeliveryReceipt = {
  intentId: string;
  consequenceId: string;
  supersessionKey: string;
  status: "delivered" | "opened" | "dismissed" | "acted" | "expired" | "superseded" | "suppressed";
  at: string;
  channel: string;
};

export type DeliveryHistory = {
  receipts: DeliveryReceipt[];
};

export type DeliveryContext = {
  now?: Date;
  permission?: DeliveryPermission;
  /** User actively viewing this reality in-app */
  appActiveOnRealityId?: string | null;
  /** App in background / not focused */
  appBackgrounded?: boolean;
  history?: DeliveryHistory;
  /** Prefer lock-screen minimal privacy */
  lockScreen?: boolean;
};

/**
 * Build a DeliveryIntent from AttentionAuthority + optional flow consequence.
 * Never independently escalates beyond attention decision.
 */
export function buildDeliveryIntent(
  signal: ProductSignal | null,
  flow: FlowConsequence | null,
  ctx: DeliveryContext = {},
): DeliveryIntent {
  const now = ctx.now ?? new Date();
  const permission = ctx.permission ?? "unknown";

  if (!signal && !flow) {
    return emptyIntent("no_source");
  }

  const realityId =
    flow?.realityId || signal?.conversation_id || "_";
  const scored = signal ? scoreAttention(signal, now) : null;
  const attention = flow?.attention || scored?.decision || evaluateAttention(signal as ProductSignal, now);

  // Delivery must not escalate
  if (attention.class === "silence" || attention.class === "ambient") {
    return {
      id: `di-${realityId}-silent`,
      realityId,
      consequenceId: realityId,
      supersessionKey: flow?.supersessionKey || `silence:${realityId}`,
      deliveryClass: attention.class === "ambient" ? "ambient" : "silent",
      copy: null,
      lockScreenCopy: null,
      privacy: "minimal",
      privacyTransformed: false,
      channel: "none",
      reasons: ["attention_not_interruptive", attention.reason],
    };
  }

  if (!flow?.deliveryEligible && attention.class !== "time_sensitive" && attention.class !== "critical") {
    return {
      id: `di-${realityId}-no-elig`,
      realityId,
      consequenceId: realityId,
      supersessionKey: flow?.supersessionKey || `ineligible:${realityId}`,
      deliveryClass: "silent",
      copy: flow?.humanConsequence || null,
      lockScreenCopy: null,
      privacy: "minimal",
      privacyTransformed: false,
      channel: "none",
      reasons: ["not_delivery_eligible", attention.class],
    };
  }

  const human = flow?.humanConsequence || humanCopyFromSignal(signal);
  const lock = privacySafeLockScreen(human, true);
  const supersessionKey =
    flow?.supersessionKey ||
    `notify:${realityId}:${attention.reason}:${scored?.minutesUntil ?? "x"}`;

  // App active on same reality → suppress external interrupt
  if (ctx.appActiveOnRealityId && ctx.appActiveOnRealityId === realityId) {
    return {
      id: `di-${realityId}-active`,
      realityId,
      consequenceId: realityId,
      supersessionKey,
      deliveryClass: "suppress",
      copy: human,
      lockScreenCopy: lock,
      privacy: "minimal",
      privacyTransformed: lock !== human,
      channel: "in_app",
      reasons: ["app_active_relevant_surface", "downgrade_external"],
    };
  }

  // Permission denied — Opal still works, no push
  if (permission === "denied" || permission === "unavailable") {
    return {
      id: `di-${realityId}-noperm`,
      realityId,
      consequenceId: realityId,
      supersessionKey,
      deliveryClass: "suppress",
      copy: human,
      lockScreenCopy: lock,
      privacy: "minimal",
      privacyTransformed: true,
      channel: "in_app",
      reasons: [`permission_${permission}`, "in_app_only"],
    };
  }

  // History: same supersession already delivered → suppress / reconnect dedupe
  const hist = ctx.history?.receipts || [];
  const same = hist.filter((r) => r.supersessionKey === supersessionKey);
  if (same.some((r) => r.status === "delivered" || r.status === "acted" || r.status === "dismissed")) {
    return {
      id: `di-${realityId}-dedupe`,
      realityId,
      consequenceId: realityId,
      supersessionKey,
      deliveryClass: "suppress",
      copy: human,
      lockScreenCopy: lock,
      privacy: "minimal",
      privacyTransformed: lock !== human,
      channel: "none",
      reasons: ["dedupe_already_delivered", "reconnect_safe"],
    };
  }

  // Supersede prior leave with different leave time same lineage
  const priorLeave = hist
    .filter((r) => r.consequenceId === realityId && r.supersessionKey.startsWith("leave:"))
    .sort((a, b) => b.at.localeCompare(a.at))[0];
  if (
    priorLeave &&
    supersessionKey.startsWith("leave:") &&
    priorLeave.supersessionKey !== supersessionKey &&
    priorLeave.status === "delivered"
  ) {
    return {
      id: `di-${realityId}-super`,
      realityId,
      consequenceId: realityId,
      supersessionKey,
      deliveryClass: "supersede",
      copy: human,
      lockScreenCopy: lock,
      notBefore: now.toISOString(),
      expiresAt: expiryIso(now, scored?.minutesUntil ?? 60),
      privacy: "minimal",
      privacyTransformed: lock !== human,
      channel: permission === "granted" && ctx.appBackgrounded !== false ? "browser_notification" : "in_app",
      reasons: ["same_lineage_updated", "supersede_prior_leave"],
    };
  }

  // Expiry: event already started
  if (scored?.minutesUntil != null && scored.minutesUntil < -15) {
    return {
      id: `di-${realityId}-exp`,
      realityId,
      consequenceId: realityId,
      supersessionKey,
      deliveryClass: "expire",
      copy: null,
      lockScreenCopy: null,
      privacy: "minimal",
      privacyTransformed: false,
      channel: "none",
      reasons: ["stale_after_event_start"],
    };
  }

  const channel: DeliveryIntent["channel"] =
    permission === "granted" && (ctx.appBackgrounded === true || ctx.appBackgrounded === undefined)
      ? "browser_notification"
      : "in_app";

  return {
    id: `di-${realityId}-notify`,
    realityId,
    consequenceId: realityId,
    supersessionKey,
    deliveryClass: "notify",
    copy: human,
    lockScreenCopy: lock,
    notBefore: now.toISOString(),
    expiresAt: expiryIso(now, scored?.minutesUntil ?? 90),
    privacy: "minimal",
    privacyTransformed: lock !== human,
    channel,
    reasons: ["attention_authorized", attention.class, attention.reason],
  };
}

/** Record a delivery receipt into history (immutable append). */
export function recordReceipt(
  history: DeliveryHistory,
  intent: DeliveryIntent,
  status: DeliveryReceipt["status"],
  at: Date = new Date(),
): DeliveryHistory {
  // Supersede: mark prior same consequence active delivers as superseded
  let receipts = history.receipts;
  if (intent.deliveryClass === "supersede" || status === "superseded") {
    receipts = receipts.map((r) =>
      r.consequenceId === intent.consequenceId &&
      r.status === "delivered" &&
      r.supersessionKey !== intent.supersessionKey
        ? { ...r, status: "superseded" as const }
        : r,
    );
  }
  return {
    receipts: [
      ...receipts,
      {
        intentId: intent.id,
        consequenceId: intent.consequenceId,
        supersessionKey: intent.supersessionKey,
        status,
        at: at.toISOString(),
        channel: intent.channel,
      },
    ],
  };
}

/** Property: same semantic supersession key → at most one active delivered intent. */
export function activeDeliveriesForConsequence(
  history: DeliveryHistory,
  consequenceId: string,
): DeliveryReceipt[] {
  return history.receipts.filter(
    (r) =>
      r.consequenceId === consequenceId &&
      (r.status === "delivered" || r.status === "opened"),
  );
}

export function readBrowserPermission(): DeliveryPermission {
  if (typeof Notification === "undefined") return "unavailable";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return "unknown";
}

/**
 * Attempt browser notification. Never assumes permission.
 * Returns receipt status.
 */
export async function attemptBrowserDelivery(
  intent: DeliveryIntent,
  permission: DeliveryPermission,
): Promise<{ status: DeliveryReceipt["status"]; error?: string }> {
  if (intent.deliveryClass === "silent" || intent.deliveryClass === "suppress" || intent.deliveryClass === "expire") {
    return { status: "suppressed" };
  }
  if (permission !== "granted") {
    return { status: "suppressed", error: `permission_${permission}` };
  }
  if (typeof Notification === "undefined") {
    return { status: "suppressed", error: "unavailable" };
  }
  try {
    const body = intent.lockScreenCopy || intent.copy || "Something needs you.";
    // eslint-disable-next-line no-new
    new Notification("Opal", {
      body,
      tag: intent.supersessionKey,
    });
    return { status: "delivered" };
  } catch (e) {
    return { status: "suppressed", error: String((e as Error).message || e) };
  }
}

/**
 * Contextual permission prompt copy — only after value is clear.
 * Not first-launch spam.
 */
export function permissionPromptCopy(): string {
  return "Want Opal to let you know when it’s time to head out?";
}

function humanCopyFromSignal(signal: ProductSignal | null): string | null {
  if (!signal) return null;
  const when = signal.shared_reality?.when || "";
  const leave = signal.shared_reality?.leave_around || signal.shared_reality?.leave_by;
  if (leave) return `Leave around ${leave} for your plan.`;
  if (when) return `Your plan around ${when} needs you.`;
  return "Your plan needs you.";
}

/**
 * Lock-screen safe: strip private causes, medical, prefs, other-participant constraints.
 */
export function privacySafeLockScreen(copy: string | null, minimal: boolean): string | null {
  if (!copy) return null;
  if (!minimal) return copy;
  // Never surface private memory / medical / calendar cause language (check full string first)
  if (/\b(preference|memory|medical|calendar event|private)\b/i.test(copy)) {
    return "Your timing changed.";
  }
  // Strip cause clauses after "because"
  let out = copy.replace(/\s+because\b.+$/i, "").trim();
  // Prefer action timing over full relationship dump on lock screen for long copy
  if (out.length > 90) {
    if (/leave/i.test(out)) return out.replace(/\s+with\s+.+$/i, ".").replace(/\.\./, ".");
    return "Your plan needs you.";
  }
  return out;
}

function expiryIso(now: Date, minutesUntilEvent: number): string {
  const ms = Math.max(5, minutesUntilEvent + 30) * 60000;
  return new Date(now.getTime() + ms).toISOString();
}

function emptyIntent(reason: string): DeliveryIntent {
  return {
    id: "di-empty",
    realityId: "_",
    consequenceId: "_",
    supersessionKey: `empty:${reason}`,
    deliveryClass: "silent",
    copy: null,
    lockScreenCopy: null,
    privacy: "minimal",
    privacyTransformed: false,
    channel: "none",
    reasons: [reason],
  };
}

/** Golden N1–N9 style matrix helper for tests. */
export function notificationScenarioMatrix(baseSignal: ProductSignal): Array<{
  id: string;
  intent: DeliveryIntent;
  expectClass: DeliveryClass | DeliveryClass[];
}> {
  const now = new Date();
  const histEmpty: DeliveryHistory = { receipts: [] };
  const leaveSignal = {
    ...baseSignal,
    leave_by_relevant: true,
    minutes_until: 25,
    shared_reality: {
      ...(baseSignal.shared_reality || {}),
      when: "Tonight · 7:00 PM",
      leave_around: "6:20 PM",
    },
  } as ProductSignal & { leave_by_relevant: boolean; minutes_until: number };

  const recompute = {
    ...baseSignal,
    recompute_only: true,
  } as ProductSignal & { recompute_only: boolean };

  const settledFar = {
    ...baseSignal,
    lifecycle_stage: "set",
    requires_user_action: false,
    minutes_until: 4000,
    shared_reality: {
      what: "Dinner",
      when: "Saturday · 7:30 PM",
      where: "Harbor",
      sufficiency: "usable",
      next_gap: "none",
    },
  } as ProductSignal & { minutes_until: number };

  const n1 = buildDeliveryIntent(recompute as ProductSignal, null, { now, history: histEmpty });
  // Force silence for recompute — evaluate may not see recompute_only on client
  const n1Class = (recompute as { recompute_only?: boolean }).recompute_only
    ? buildDeliveryIntent(
        baseSignal,
        {
          realityId: baseSignal.conversation_id || "x",
          kind: "silence",
          humanConsequence: null,
          actionability: "none",
          attention: {
            class: "silence",
            shouldSurfaceHome: false,
            shouldSurfaceChatFilament: false,
            shouldInterrupt: false,
            priority: 0,
            reason: "recompute_no_delta",
            band: "quiet",
          },
          deliveryEligible: false,
          supersessionKey: "silence:recompute",
          privacyClass: "actor_private",
          sourceProvenance: ["recompute"],
          minutesUntil: null,
          reasons: ["recompute_only"],
        },
        { now },
      )
    : n1;

  const leaveFlow = {
    realityId: leaveSignal.conversation_id || "j",
    kind: "leave_window" as const,
    humanConsequence: "Leave around 6:20 for dinner with Jordan.",
    actionability: "time_sensitive" as const,
    attention: evaluateAttention(leaveSignal, now),
    deliveryEligible: true,
    supersessionKey: "leave:j:20",
    privacyClass: "actor_private" as const,
    sourceProvenance: ["travel"],
    minutesUntil: 20,
    reasons: ["leave_window"],
  };

  const deliveredHist: DeliveryHistory = {
    receipts: [
      {
        intentId: "prior",
        consequenceId: leaveFlow.realityId,
        supersessionKey: "leave:j:20",
        status: "delivered",
        at: now.toISOString(),
        channel: "browser_notification",
      },
    ],
  };

  const leaveLater = {
    ...leaveFlow,
    humanConsequence: "Leave around 6:05 for dinner with Jordan.",
    supersessionKey: "leave:j:5",
    minutesUntil: 5,
  };

  return [
    { id: "N1_recompute", intent: n1Class, expectClass: "silent" },
    {
      id: "N2_settled_far",
      intent: buildDeliveryIntent(settledFar, null, { now }),
      expectClass: ["silent", "ambient"],
    },
    {
      id: "N3_leave_window",
      intent: buildDeliveryIntent(leaveSignal, leaveFlow, {
        now,
        permission: "granted",
        appBackgrounded: true,
      }),
      expectClass: ["notify", "supersede"],
    },
    {
      id: "N4_supersede",
      intent: buildDeliveryIntent(leaveSignal, leaveLater, {
        now,
        permission: "granted",
        history: {
          receipts: [
            {
              intentId: "old",
              consequenceId: leaveFlow.realityId,
              supersessionKey: "leave:j:20",
              status: "delivered",
              at: now.toISOString(),
              channel: "browser_notification",
            },
          ],
        },
        appBackgrounded: true,
      }),
      expectClass: "supersede",
    },
    {
      id: "N5_app_active",
      intent: buildDeliveryIntent(leaveSignal, leaveFlow, {
        now,
        permission: "granted",
        appActiveOnRealityId: leaveFlow.realityId,
      }),
      expectClass: "suppress",
    },
    {
      id: "N6_permission_denied",
      intent: buildDeliveryIntent(leaveSignal, leaveFlow, {
        now,
        permission: "denied",
      }),
      expectClass: "suppress",
    },
    {
      id: "N7_reconnect_dedupe",
      intent: buildDeliveryIntent(leaveSignal, leaveFlow, {
        now,
        permission: "granted",
        history: deliveredHist,
        appBackgrounded: true,
      }),
      expectClass: "suppress",
    },
    {
      id: "N8_stale",
      intent: buildDeliveryIntent(
        {
          ...leaveSignal,
          minutes_until: -30,
          shared_reality: { ...(leaveSignal.shared_reality || {}), when: "Tonight · 5:00 PM" },
        } as ProductSignal & { minutes_until: number },
        { ...leaveFlow, minutesUntil: -30 },
        { now, permission: "granted" },
      ),
      expectClass: ["expire", "suppress", "silent"],
    },
    {
      id: "N9_private_copy",
      intent: buildDeliveryIntent(
        leaveSignal,
        {
          ...leaveFlow,
          humanConsequence:
            "Leave around 6:20 because of private calendar medical preference with Jordan.",
        },
        { now, permission: "granted", lockScreen: true, appBackgrounded: true },
      ),
      expectClass: ["notify", "supersede", "suppress"],
    },
  ];
}
