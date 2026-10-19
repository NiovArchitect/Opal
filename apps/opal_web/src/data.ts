/** Conversation data for the public product shell: socially fluent, high-signal. */
import type { NextPlanFact } from "./api/productClient";

export type SignalKind =
  | "open_loop"
  | "plan_forming"
  | "ready"
  | "follow_through"
  | "moment"
  /** Shared-safe availability overlap — recognition, never completion/Set. */
  | "availability_overlap"
  /** Option surfaced alias for multi-range recognition (same color family). */
  | "option_surfaced"
  /** Authoritative Set only — completion emerald reserved for this kind. */
  | "set";

export type ChatPreview = {
  id: string;
  name: string;
  preview: string;
  /** Contextual social line under name in thread header. */
  contextLine?: string;
  time: string;
  unread?: number;
  muted?: boolean;
  /** ISO timestamp used to order the inbox. Display copy lives in `time`. */
  updatedAt?: string;
  latestServerSeq?: number;
  /** DIR-1: the backend's shared upcoming plan fact for this
   *  conversation (NextPlan), or null - rendered as the row's one
   *  plan-awareness element in Chats and fed to the thread strip. */
  nextPlan?: NextPlanFact | null;
  /** DIR-1: the conversation entity's stable tint. */
  entityTint?: number | null;
  planProjection?: {
    lineage_id?: string | null;
    conversation_id: string;
    visibility: "participants";
    participant_mode: "solo" | "dyad" | "group" | string;
    kicker: string;
    /** Repair #18 (W4-04): the plan row's current title, carried on
     *  the projection so chats list / thread read an edit back from
     *  the same source as every other surface. */
    title?: string | null;
    when_label?: string | null;
    place?: string | null;
    activity?: string | null;
    timezone?: string | null;
    plan_type?: "in_person" | "virtual" | string | null;
    meeting_link?: string | null;
    online?: boolean;
    /** B1: the backend's ONE explicit place projection
     * (SharedPlan.place_projection). Clients render this object;
     * they never re-derive place type from the location string. */
    place_projection?: {
      kind?: "physical" | "virtual" | string | null;
      label?: string | null;
      meeting_provider?: string | null;
      meeting_link?: string | null;
      join_available?: boolean;
      directions_available?: boolean;
    } | null;
    meeting_provider?: string | null;
    join_available?: boolean;
    directions_available?: boolean;
    /** Repair #18 (B2) — the plan completion record, rendered verbatim
     * from the backend's one projection. Surfaces never re-derive join
     * or food state from anything else. Food recipient entries arrive
     * privacy-sanitized from the server (no household keys, no private
     * alternate restaurant, and no address field exists at all). */
    completion?: {
      driven_at?: string | null;
      steps: Array<{
        id: string;
        status: string;
        copy?: string;
        host?: string | null;
        restaurant_name?: string | null;
        target_offset_minutes?: number;
        rollup?: {
          households_total: number;
          households_confirmed: number;
          confirmed_by: string[];
          label: string;
        };
        recipients?: Array<{
          user_id: string;
          items: string[];
          items_state: string;
          handoff_state: string;
          provider_choice?: string | null;
          handed_off_at?: string | null;
          self_confirmed_at?: string | null;
        }>;
      }>;
    } | null;
    execution_label?: string | null;
    execution_detail?: string | null;
    pending_change?: boolean;
    pending_proposal_value?: string | null;
    pending_proposal_field?: string | null;
    /** Repair #17: who proposed the pending change — lets every surface derive
     * "action needed" for THIS viewer from the same projection the thread uses. */
    pending_proposal_by_user_id?: string | null;
    placeIdentity?: {
      name: string | null;
      area: string | null;
      placeId: string | null;
      address: string | null;
      coordinates: { lat: number; lng: number } | null;
      provenance: string | null;
    } | null;
    public?: boolean;
    temporal_state?: string | null;
    canonical_start_at?: string | null;
    /** Plan revision id — keys the NEXT TOGETHER strip to one render per generation (F12-32). */
    revision_id?: string | null;
    next_together_eligible?: boolean;
    upcoming_ready?: boolean;
    future_execution_actionable?: boolean;
    /** Past Shared Reality — not Durable/Published Memory */
    past_shared_reality?: boolean;
    occurrence_state?: string | null;
    /** Repair #18 - attendance contract, carried from the backend's one
     * counter (null/absent when the plan has no participant rows).
     * Coordinator merge note: the backend conflict is an OBJECT
     * ({with_plan_id, title, time_label} | null) - surfaces format the
     * line from it (planCardContract.conflictLineFromContract) and never
     * treat it as a pre-formatted string. */
    going_count?: number | null;
    interested_count?: number | null;
    total_count?: number | null;
    viewer_state?: string | null;
    /** Repair #18 - F18-03 conflict object, or null when no overlap. */
    conflict?: {
      with_plan_id?: string | null;
      title?: string | null;
      time_label?: string | null;
    } | null;
  } | null;
  signal?: SignalKind;
  /** Human shared-reality line — never internal "Set" / "Still open". */
  signalLabel?: string;
  /**
   * Stable home-field grouping key (peer user id or group:conversation_id).
   * Not display-name alone — prevents seed pollution without collapsing real peers.
   */
  homePeerKey?: string;
  /** Multi-party composition — drives group speaker chrome (P0-31-04) */
  composition?: "group" | "dyad" | string;
  memberCount?: number;
  /** Member directory for speaker resolution (id → display_name) */
  peers?: { id: string; display_name: string; handle?: string }[];
};

export type Message = {
  id: string;
  from: "me" | "them";
  body: string;
  time: string;
  /** ISO time for placing the historical plan-set event. Display copy stays in `time`. */
  createdAt?: string;
  /** Authoritative server sequence for ordering and history:sync. */
  serverSeq?: number;
  clientMessageId?: string;
  /**
   * Delivery ladder: sending → sent → delivered → read (or failed).
   * Extends the existing receipt label — no new UI chrome.
   */
  deliveryState?: "sending" | "sent" | "delivered" | "read" | "failed";
  /**
   * Authoritative sender (server/realtime). Required for multi-human identity.
   * Never invent from bubble side alone.
   */
  senderUserId?: string | null;
  /** Resolved display name from member directory — not untrusted client spoof alone */
  senderDisplayName?: string | null;
  /** false for system consequence; default true for human messages */
  humanSpeaker?: boolean;
  /** Optional inline social signal attached to a message turn. */
  signal?: {
    kind: SignalKind;
    label: string;
  };
  /** Opal chronological filament (not a human bubble). */
  opalFilament?: boolean;
  /** Private-to-viewer Opal moment (violet treatment). */
  opalPrivate?: boolean;
  /**
   * Sparse system execution consequence (P0-31-03).
   * Must never render as a human peer message (not Jordan / not me).
   */
  opalSystemConsequence?: boolean;
  /** Same Reality lineage for reservation/execution consequence */
  realitySeedId?: string;
  executionId?: string;
  /** R3-early: call_invite continuity (IDs only — not SDP). */
  messageType?: string;
  liveCallId?: string;
  /** Voice note extras (Phase 2 Deepgram ears). */
  audioUrl?: string | null;
  durationMs?: number | null;
  transcriptionConfidence?: number | null;
};

export type NeedItem = {
  id: string;
  title: string;
  detail: string;
  chatId?: string;
};

export type PlanItem = {
  id: string;
  title: string;
  when: string;
  who: string;
  where?: string;
  status: "upcoming" | "today" | "needs_you";
  chatId?: string;
};

/**
 * Demo previews for unauthenticated shell only.
 * Labels describe shared reality (who/what/when/where), not stage inventory.
 */
export const CHATS: ChatPreview[] = [
  {
    id: "jordan",
    name: "Jordan Lee",
    preview: "I'm free after 6:30. Does Thursday work?",
    contextLine: undefined,
    time: "2:14 PM",
    unread: 1,
    signal: "open_loop",
    // Time known, place open — forming, not fully arranged.
    signalLabel: "Dinner · Thursday · after 6:30",
  },
  {
    id: "group",
    name: "Saturday dinner",
    preview: "Maya: I can do after 7 if that helps",
    contextLine: "Maya, Chris, Jordan · 4 people",
    time: "11:40 AM",
    signal: "open_loop",
    // Venue mentioned in thread — still confirmation path in demo.
    signalLabel: "Dinner · Saturday · Harbor Table",
  },
  {
    id: "marcus",
    name: "Marcus Carter",
    preview: "Pickup is confirmed for 5:00 PM",
    contextLine: undefined,
    time: "Yesterday",
    signal: "ready",
    signalLabel: "Pickup · Today · 5:00 PM",
  },
  {
    id: "evelyn",
    name: "Evelyn Carter",
    preview: "I'll grab the gift on the way",
    contextLine: undefined,
    time: "Yesterday",
    signal: "follow_through",
    signalLabel: "Gift on the way",
  },
  {
    id: "maya",
    name: "Maya Chen",
    preview: "See you at Harbor Table",
    contextLine: undefined,
    time: "Mon",
    signal: "moment",
    signalLabel: "Harbor Table · shared moment",
  },
  {
    id: "quiet",
    name: "Sam Rivera",
    preview: "Hope your morning is calm.",
    contextLine: undefined,
    time: "Sun",
    // No signal: ordinary conversation stays quiet.
  },
];

export const THREADS: Record<string, Message[]> = {
  jordan: [
    {
      id: "j1",
      from: "me",
      body: "We should get dinner next Thursday.",
      time: "2:08 PM",
      signal: { kind: "plan_forming", label: "Dinner · Thursday · forming" },
    },
    {
      id: "j2",
      from: "them",
      body: "I'm free after 6:30. Does Thursday work?",
      time: "2:14 PM",
      signal: { kind: "open_loop", label: "Dinner · Thursday · after 6:30" },
    },
  ],
  group: [
    {
      id: "g1",
      from: "them",
      body: "Saturday after 7 might work for everyone.",
      time: "11:22 AM",
    },
    {
      id: "g2",
      from: "me",
      body: "Harbor Table still open if we want a table.",
      time: "11:31 AM",
      signal: { kind: "open_loop", label: "Dinner · Saturday · Harbor Table" },
    },
    {
      id: "g3",
      from: "them",
      body: "I can do after 7 if that helps",
      time: "11:40 AM",
    },
  ],
  quiet: [
    {
      id: "q1",
      from: "them",
      body: "Hope your morning is calm.",
      time: "Sun",
    },
    {
      id: "q2",
      from: "me",
      body: "Thank you. Quiet day here too.",
      time: "Sun",
    },
  ],
  marcus: [
    {
      id: "m1",
      from: "them",
      body: "Practice ends closer to 5 today.",
      time: "Yesterday",
    },
    {
      id: "m2",
      from: "me",
      body: "I'll be there. Pickup at 5:00 PM.",
      time: "Yesterday",
    },
    {
      id: "m3",
      from: "them",
      body: "Pickup is confirmed for 5:00 PM",
      time: "Yesterday",
      signal: { kind: "ready", label: "Pickup · 5:00 PM" },
    },
  ],
  evelyn: [
    {
      id: "e1",
      from: "them",
      body: "I'll grab the gift on the way",
      time: "Yesterday",
      signal: { kind: "follow_through", label: "Gift on the way" },
    },
  ],
  maya: [
    {
      id: "y1",
      from: "me",
      body: "See you at Harbor Table",
      time: "Mon",
    },
    {
      id: "y2",
      from: "them",
      body: "See you at Harbor Table",
      time: "Mon",
      signal: { kind: "moment", label: "Harbor Table · shared moment" },
    },
  ],
};

/** Needs you: consequential human decisions only — not every signal. */
export const INITIAL_NEEDS: NeedItem[] = [
  {
    id: "n1",
    title: "Dinner with Jordan",
    detail: "Thursday after 6:30 works · need a place",
    chatId: "jordan",
  },
];

/** Plans: usable / strongly converging shared realities only. */
export const PLANS: PlanItem[] = [
  {
    id: "p1",
    title: "Dinner with Jordan",
    when: "Thursday · after 6:30",
    who: "Jordan Lee",
    where: undefined,
    status: "needs_you",
    chatId: "jordan",
  },
  {
    id: "p2",
    title: "Dinner with friends",
    when: "Saturday · after 7",
    who: "Maya, Chris, Jordan · 4 people",
    where: "Harbor Table",
    status: "upcoming",
    chatId: "group",
  },
  {
    id: "p3",
    title: "School pickup",
    when: "Today · 5:00 PM",
    who: "Marcus · Olivia",
    status: "today",
    chatId: "marcus",
  },
  {
    id: "p4",
    title: "Coffee with Maya",
    when: "Tuesday · 10:30 AM",
    who: "Maya Chen",
    where: "Harbor Table",
    status: "upcoming",
    chatId: "maya",
  },
];
