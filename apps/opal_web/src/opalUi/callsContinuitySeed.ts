/**
 * Founder-seed Calls Continuity rows for CURRENT additive authority 928:3.
 * Relationship-first; at most ONE earned signal per row (zero valid).
 * Extends existing Calls/Chats owners only — never invent a parallel call domain.
 *
 * Graphing-enabled rows may carry a private derived signal where
 * USE_PERMISSION != DISCLOSURE_PERMISSION (use privately; do not disclose).
 */

export type CallsContinuitySignal =
  | { kind: "ready"; label: "Sat 7:30 · Ready"; graphCardId: string }
  | { kind: "callback"; label: "Call back" }
  | { kind: "graph_updated"; label: "Graph updated"; graphCardId?: string }
  | { kind: "needs_you"; label: "Needs your answer" };

/**
 * Permitted Graphing derived insight — private use only when disclosure is false.
 * Never dump raw transcript; only allowed derived labels.
 */
export type CallsGraphingDerived = {
  enabled: true;
  /** Standing Graphing permitted this call. */
  usePermission: true;
  /** Counterpart disclosure of the underlying signal — must stay false for private use. */
  disclosurePermission: false;
  /** Short derived label Opal may use privately (not a disclosure string to peers). */
  derivedLabel: string;
  graphCardId?: string;
};

import type { NextPlanFact } from "../api/productClient";

export type CallsContinuityRow = {
  id: string;
  name: string;
  kind: "person" | "group";
  /** DIR-1: the backend's shared upcoming plan fact for this peer
   *  (real call rows only - seed rows never carry one). */
  nextPlan?: NextPlanFact | null;
  /** DIR-1: the peer's stable entity tint. */
  entityTint?: number | null;
  /** Call metadata only — always shown */
  metadata: string;
  /** Missed inbound / missed group — for Missed filter */
  missed: boolean;
  /** Cancelled outbound / cancelled group */
  cancelled?: boolean;
  /** At most one earned consequence; omit when nothing meaningful changed */
  signal?: CallsContinuitySignal;
  /** Graphing-enabled private derived signal (USE ≠ DISCLOSE). */
  graphing?: CallsGraphingDerived;
  avatarSrc?: string;
  avatarTone?: string;
  /** Peer for callback / place-call */
  peerName?: string;
  callMedia?: "audio" | "video" | "group";
  /** Only true when a real Story exists — no false Story-ring affordance */
  hasStory?: boolean;
  /** When exact Figma avatar already includes the active Story ring — do not double-paint CSS ring */
  storyRingInAsset?: boolean;
  /** Group mosaic member faces (CURRENT 928:9 Juniper crew) */
  groupAvatarSrcs?: string[];
  conversationId?: string;
  real?: boolean;
};

/** Matches Figma 928:9 / 928:363 relationship-first grammar. */
export const FOUNDER_CALLS_CONTINUITY_ROWS: CallsContinuityRow[] = [
  {
    id: "call-cont-chanelle",
    name: "Chanelle",
    kind: "person",
    metadata: "12m ago · Audio · 14m",
    missed: false,
    signal: {
      kind: "ready",
      label: "Sat 7:30 · Ready",
      graphCardId: "seed-chanelle-juniper",
    },
    // Graphing: Dinner Saturday — use privately; do not disclose underlying capture.
    graphing: {
      enabled: true,
      usePermission: true,
      disclosurePermission: false,
      derivedLabel: "Dinner Saturday",
      graphCardId: "seed-chanelle-juniper",
    },
    // Exact CURRENT 928:9 authority avatar (ring baked into asset)
    avatarSrc: "/figma-v2/calls/avatar-chanelle-928.png",
    // Purple border tint (founder 10:31 reference)
    avatarTone: "#8B5CF6",
    peerName: "Chanelle",
    callMedia: "audio",
    conversationId: "seed-chat-chanelle",
    hasStory: true,
    storyRingInAsset: true,
  },
  {
    id: "call-cont-juniper-crew",
    name: "Juniper crew",
    kind: "group",
    metadata: "Missed group call · 28m ago",
    missed: true,
    signal: { kind: "callback", label: "Call back" },
    // Missed = coral/red border (is-missed CSS + tone)
    avatarTone: "#FF6B9D",
    peerName: "Juniper crew",
    callMedia: "group",
    conversationId: "seed-chat-juniper-crew",
    groupAvatarSrcs: [
      "/figma-v2/calls/group-chanelle.png",
      "/figma-v2/calls/group-maya.png",
      "/figma-v2/calls/group-jordan.png",
    ],
  },
  {
    id: "call-cont-maya",
    name: "Maya",
    kind: "person",
    metadata: "Yesterday · Video · 36m",
    missed: false,
    // ZERO continuity signal — metadata only (restraint is success)
    // Graphing: morning markets preference — use privately; never disclose.
    graphing: {
      enabled: true,
      usePermission: true,
      disclosurePermission: false,
      derivedLabel: "Prefers morning markets",
      graphCardId: "seed-maya-graph-coast",
    },
    avatarSrc: "/figma-v2/calls/avatar-maya-928.png",
    // Cyan/blue border tint (founder 10:31 reference)
    avatarTone: "#00E5FF",
    peerName: "Maya",
    callMedia: "video",
    conversationId: "seed-chat-maya",
  },
  {
    id: "call-cont-jordan",
    name: "Jordan",
    kind: "person",
    metadata: "2d ago · Audio · 8m",
    missed: false,
    signal: {
      kind: "graph_updated",
      label: "Graph updated",
      graphCardId: "seed-jordan-market",
    },
    avatarSrc: "/figma-v2/calls/avatar-jordan-928.png",
    avatarTone: "#FFC86B",
    peerName: "Jordan",
    callMedia: "audio",
  },
  {
    id: "call-cont-sabrina",
    name: "Sabrina",
    kind: "person",
    metadata: "Cancelled · Video · 3h ago",
    missed: false,
    cancelled: true,
    // ZERO earned signal — cancelled is metadata enough
    avatarSrc: "/figma-v2/stories/sabrina.png",
    avatarTone: "#FF6B9D",
    peerName: "Sabrina",
    callMedia: "video",
    conversationId: "seed-chat-sabrina",
  },
  {
    id: "call-cont-alex",
    name: "Alex",
    kind: "person",
    metadata: "Completed · Audio · 1d ago · 22m",
    missed: false,
    avatarSrc: "/figma-v2/stories/alex.png",
    avatarTone: "#8B5CF6",
    peerName: "Alex",
    callMedia: "audio",
    conversationId: "seed-chat-alex",
  },
];

/** Provider/Opal-handled outcomes must NOT appear as user Calls rows. */
export const FORBIDDEN_PROVIDER_CALL_ROW_IDS = [
  "opal-provider-reservation",
  "handled-by-opal-call",
] as const;

/** Founder walk: Graphing-enabled rows where use ≠ disclose. */
export function founderGraphingEnabledCallRows(): CallsContinuityRow[] {
  return FOUNDER_CALLS_CONTINUITY_ROWS.filter(
    (r) =>
      r.graphing?.enabled === true &&
      r.graphing.usePermission === true &&
      r.graphing.disclosurePermission === false,
  );
}
