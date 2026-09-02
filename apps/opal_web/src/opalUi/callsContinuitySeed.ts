/**
 * Founder-seed Calls Continuity rows for CURRENT additive authority 928:3.
 * Relationship-first; at most ONE earned signal per row (zero valid).
 * Extends existing Calls/Chats owners only — never invent a parallel call domain.
 */

export type CallsContinuitySignal =
  | { kind: "ready"; label: "Sat 7:30 · Ready"; graphCardId: string }
  | { kind: "callback"; label: "Call back" }
  | { kind: "graph_updated"; label: "Graph updated"; graphCardId?: string }
  | { kind: "needs_you"; label: "Needs your answer" };

export type CallsContinuityRow = {
  id: string;
  name: string;
  kind: "person" | "group";
  /** Call metadata only — always shown */
  metadata: string;
  /** Missed inbound / missed group — for Missed filter */
  missed: boolean;
  /** At most one earned consequence; omit when nothing meaningful changed */
  signal?: CallsContinuitySignal;
  avatarSrc?: string;
  avatarTone?: string;
  /** Peer for callback / place-call */
  peerName?: string;
  callMedia?: "audio" | "video" | "group";
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
    avatarSrc: "/figma-v2/home-201/avatar-chanelle.png",
    peerName: "Chanelle",
    callMedia: "audio",
  },
  {
    id: "call-cont-juniper-crew",
    name: "Juniper crew",
    kind: "group",
    metadata: "Missed group call · 28m ago",
    missed: true,
    signal: { kind: "callback", label: "Call back" },
    avatarTone: "#1A2338",
    peerName: "Juniper crew",
    callMedia: "group",
  },
  {
    id: "call-cont-maya",
    name: "Maya",
    kind: "person",
    metadata: "Yesterday · Video · 36m",
    missed: false,
    // ZERO signal — metadata only (restraint is success)
    avatarSrc: "/figma-v2/home-201/avatar-maya.png",
    peerName: "Maya",
    callMedia: "video",
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
    avatarTone: "#0A2429",
    peerName: "Jordan",
    callMedia: "audio",
  },
];

/** Provider/Opal-handled outcomes must NOT appear as user Calls rows. */
export const FORBIDDEN_PROVIDER_CALL_ROW_IDS = [
  "opal-provider-reservation",
  "handled-by-opal-call",
] as const;
