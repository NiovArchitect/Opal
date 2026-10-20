/**
 * Repair #18 - Division C2 - shell projection contracts (track-c2
 * sections 3.3, 7, 8, 9, 10).
 *
 * Every C2 shell surface renders ONE named projection and nothing else.
 * Fields are finished strings and enum values built server side (or by
 * the single client derivation where Division A already owns one). A
 * surface never counts, never derives plan state, never reads a second
 * source for a fact its projection already carries. A card without a
 * state family or title is a projection defect and routes to the named
 * error treatment, never to a guessed card.
 *
 * Where the Division A/B projection builders do not exist yet in this
 * base, the shell adapter (shellData.ts) builds these shapes from the
 * existing product API session only; absent data renders the spec
 * empty states, never fixtures.
 */
import type { PlanCardC2Input, PlanStateFamilyC2 } from "../PlanCardC2";
import type {
  IntentionContract,
  OpalPlanContract,
  ShelfContract,
  WorkingGoalContract,
} from "../../api/productClient";

/**
 * Repair #18 adoption wave 1 - the graph/people cluster rides the
 * Graphs list projection as finished server contracts (ST-A
 * intentions, 4.C10 goals, ST-B shelf). The surface renders them
 * verbatim; it never re-derives progress, status, or a starter's
 * basis. `people` is the shell's own conversation peers, offered as
 * the intention form's person choices.
 */
export type Adopt1Projection = {
  people: Array<{ id: string; name: string }>;
  intentions: IntentionContract[];
  goals: WorkingGoalContract[];
  shelf: ShelfContract;
};

export type C2Route = "home" | "chats" | "center" | "graphs" | "you";

export type AvatarRef = {
  photoUrl?: string | null;
  initials: string;
  /** Person tint token suffix 1-6 (section 2.2 rotation), or null. */
  tint: number | null;
};

/** Section 9 - the dock and headers render only this. */
export type ShellProjection = {
  route: C2Route;
  /** Finished unread count for the Chats dock slot. 0 renders no badge. */
  dockUnread: number;
  ownAvatar: AvatarRef;
  ownName: string;
  centerPresence: "idle" | "listening" | "thinking" | "responding";
};

/** Section 7.1 - Home header. */
export type ShellHeaderProjection = {
  ownAvatar: AvatarRef;
  /** Unseen Activity count; 0 or absent renders no badge. */
  activityUnseenCount?: number;
};

/** Section 7.2 - story rail. */
export type StoryRailProjection = {
  self: {
    avatar: AvatarRef;
    hasLiveStory: boolean;
    /** Finished label, for example "2h" - never computed here. */
    liveStoryLabel?: string | null;
    /** JA-11: the viewer's own story record, carried so the self
     *  cell can open the viewer on it (the same media the rail
     *  would have shown in the duplicate named cell). Null = the
     *  viewer has no live story; "Add" is the empty case. */
    story?: { storyCount: number; mediaUrl: string | null; caption: string | null } | null;
  };
  stories: Array<{
    id: string;
    personName: string;
    avatar: AvatarRef;
    seen: boolean;
    ringKind: "unseen" | "seen" | "happening";
    storyCount: number;
    /** The story's real media (hunt-fix B-10). Absent = the cell
     *  never opens a viewer; there is no empty stage. */
    mediaUrl?: string | null;
    caption?: string | null;
  }>;
  capabilities: { canPost: boolean; canStory: boolean };
};

export type FeedCardProjection =
  | { kind: "plan"; id: string; card: PlanCardC2Input }
  | {
      kind: "memory";
      id: string;
      /** The moment record's own media (its media_ref - see the
       *  adapter's provenance note). Absent = the designed
       *  monogram treatment, never text in the image well. */
      photoUrl?: string | null;
      /** Build vocabulary: which record field supplied photoUrl. */
      photoProvenance?: string | null;
      contextLine: string;
      authorLine: string;
      /** Repair #19 (W9) - the author as a person (avatar + name),
       *  from the feed record's actor. */
      authorName?: string | null;
      authorAvatar?: AvatarRef | null;
    }
  | {
      kind: "live";
      id: string;
      title: string;
      contextLine: string;
      actionLabel: string;
      actionId: string;
      /** Repair #19 (W9) - Opal Live truth, from the live room
       *  record itself (GET /lives/visible). A live card exists
       *  ONLY when a room with status "live" was read back; the
       *  adapter never composes one from anything else. */
      hostName?: string | null;
      hostAvatar?: AvatarRef | null;
      /** The place the live is anchored to (the room's place_label
       *  / venue name, honouring the host's location precision),
       *  or null when the record carries no place - then no place
       *  line renders; a place is never invented. */
      placeLabel?: string | null;
      /** True when the room is the viewer's own live. */
      mine?: boolean;
    }
  | {
      kind: "discovery";
      id: string;
      title: string;
      contextLine: string;
      actionLabel: string;
      actionId: string;
    };

/** Section 7 - HomeProjection v2 (surface shape; distinct from the
 *  back end HomeProjection module, coordinated in spec section 12 D5). */
export type HomeProjection = {
  header: ShellHeaderProjection;
  rail: StoryRailProjection;
  feed: FeedCardProjection[];
  /** Hunt-fix B-12: a failed feed/plans load, in plain words. The
   *  surface renders this with a retry — never an empty feed. */
  feedError?: string | null;
};

/** Section 8.1 - Graphs list. Groups arrive ordered and titled; the
 *  list renders them exactly as projected and never regroups locally. */
export type GraphListProjection = {
  groups: Array<{
    id: string;
    kind: "needs-detail" | "coming-up" | "with" | "someday" | "past" | "horizon";
    title: string;
    cards: Array<
      PlanCardC2Input & {
        id: string;
        /** Finished completion action for a forming plan missing one
         *  slot, or null. Label names the slot in plain words. */
        completionAction?: { label: string; slotKind: string } | null;
        droppable?: boolean;
        /** R19 W7: true only on cards in privateCards below. */
        isPrivate?: boolean;
        /** Polish density/horizon: the time-band presence stamp
         *  from density.ts, or null when the record has no real
         *  start. The surface renders the weight class; it never
         *  computes a band itself. */
        presence?: import("./density").PresenceStamp | null;
        /** Polish cooling (S2 x P14 limbo): the invitation
         *  temperature for an open invitation to the viewer, from
         *  density.ts. Null on cards that are not open invitations. */
        temperature?: import("./density").InvitationTemperature | null;
      }
    >;
  }>;
  /** Polish P11 - past, collapsed: period pills (month within the
   *  last year, year before that), built by density.ts in the one
   *  adapter. Past plans live ONLY here, never as a rows group.
   *  Optional for projections built by other clusters' fixtures;
   *  C2Graphs falls back to the same derivation over a past group. */
  pastPills?: import("./density").PastPill[];
  /** Polish P11 - invitations the viewer declined or that expired.
   *  R20 F-12: list surfaces render ONE settled summary line for the
   *  whole set (density.settledSummaryLine); each entry's card shows
   *  only on intent expansion, and its `line` renders only in the
   *  plan's own detail. Viewer-private: past area only. */
  settledInvitations?: import("./density").SettledInvitation[];
  /** R19 W7 — private graphs, separated by the adapter from the
   *  plan contract's is_private flag. They NEVER appear in groups
   *  or lensCounts; the surface renders them only inside the
   *  unlocked Private area. */
  privateCards: Array<
    PlanCardC2Input & {
      id: string;
      completionAction?: { label: string; slotKind: string } | null;
      droppable?: boolean;
      isPrivate: true;
    }
  >;
  lensCounts: { all: number; action: number; ready: number; past: number };
  timelineAvailable: boolean;
  listError?: string | null;
  /** Adoption wave 1 sections (intentions / goals / shelf). Absent
   *  when the cluster did not load - the sections render nothing. */
  adopt1?: Adopt1Projection | null;
};

/** Section 8.2 - Graph Detail. */
export type GraphDetailProjection = {
  id: string;
  title: string;
  card: PlanCardC2Input;
  /** R20 F-12: the plan's settled line when THIS viewer settled it
   *  (declined / expired) - rendered only in this detail, never as a
   *  row in any list surface. Null for live plans. */
  settledLine?: string | null;
  attendanceLine?: string | null;
  /** Repair #18 wiring (B2): the plan contract's completion record,
   *  carried verbatim. The food panel renders only when it carries a
   *  food step; absent record = no panel, ever. */
  completion?: OpalPlanContract["completion"];
  /** The plan's own meeting link (join handoff for the food panel). */
  meetingLink?: string | null;
  /** The viewer's account id, for the food panel's own-recipient row. */
  viewerUserId?: string | null;
  whenLine: string;
  where?: { label: string; kind: "place" | "virtual"; handoffLabel?: string | null } | null;
  who: Array<{
    /** The person's user id (from the plan-history contract), for
     *  the Add-people sheet's already-on-this-plan filtering. */
    userId?: string;
    name: string;
    avatar: AvatarRef;
    responseLabel: string;
    /** Repair #19 W24 (DL-06) — the viewer's finished tie to this
     *  person ("Close friend", "Family - Sister") from the viewer's
     *  relationship rows, or null when unset. Counts stay for
     *  attendance; the roster names the tie beside the person. */
    relationshipLabel?: string | null;
    /** R19 W7 — the finished location line from the plan-history
     *  projection (per-plan sharing backbone). Absent until the
     *  history read lands; "Not sharing location" is a real state,
     *  never accompanied by a distance. */
    locationLabel?: string | null;
    locationState?: string | null;
  }>;
  /** R19 W7 — the viewer's own location-sharing state for this plan
   *  is not carried here; the detail's share control renders only
   *  when the shell wires the share events. */
  isPrivate?: boolean;
  /** Cluster G (P10c) — the backend's ONE leave-by projection for
   *  this viewer, folded from the plan-history contract verbatim.
   *  Absent until the history read lands; the detail renders its
   *  finished label (or its honest absent-state line) and never
   *  derives a time or distance. */
  leaveBy?: import("../../api/productClient").LeaveByProjection | null;
  nextAction?: { id: string; label: string } | null;
  activity: Array<{ line: string; timeLabel: string }>;
  history: Array<{ line: string }>;
  /** Polish P12 - the preparation spine (intent -> preparation ->
   *  event -> settling), projected by density.ts spineFromPlan from
   *  the plan's real completion record. Absent = no spine renders. */
  spine?: import("./density").SpineItem[];
  /** Repair #20 (F-13) - the plan's own conversation id from its
   *  contract, when it has one; scopes the plan-chat doorway. */
  conversationId?: string | null;
  /** Repair #20 (F-15) - true when this plan has settled into the
   *  past (its status family is "past"), so the detail may offer
   *  "Do that again". Live plans never carry it. */
  repeatable?: boolean;
  /** Repair #20 (F-15) - what a repeat carries from this plan,
   *  finished by the adapters from the plan's own record (place +
   *  coordinates + type) and its Who rows (the parties). The new
   *  time is NEVER carried - it is chosen in the repeat flow. */
  repeat?: {
    participantUserIds: string[];
    location: string | null;
    placeLat: number | null;
    placeLon: number | null;
    planType: string | null;
  } | null;
  origin: C2Route;
};

/** Section 10.1 - YOU hub. */
export type YouHubProjection = {
  profile: { name: string; handle?: string | null; avatar: AvatarRef };
  accountNote?: string | null;
  connectedSummary: string;
  index: Array<{ key: string; title: string; subtitle?: string; keywords: string }>;
};

/** Section 10.2 - one settings section, rows finished by the builder. */
export type SettingsRowProjection =
  | { kind: "toggle"; id: string; title: string; subtitle?: string; value: boolean }
  | { kind: "value"; id: string; title: string; subtitle?: string; value: string }
  | { kind: "nav"; id: string; title: string; subtitle?: string; target: string }
  | { kind: "action"; id: string; title: string; subtitle?: string }
  | { kind: "note"; id: string; text: string }
  /**
   * Repair #18 DIR-2 / R20 F-9 — one Connectors row, rendered VERBATIM from
   * the server's settings/connections projection (SP-3: the surface
   * renders the output; it never re-derives a status). `status` and
   * `statusLabel` are the payload's own values, so DOM status equals
   * payload status by construction.
   */
  | {
      kind: "connection";
      id: string;
      title: string;
      subtitle?: string;
      status: string;
      statusLabel: string;
      detail: string;
      gateReason?: string | null;
      lastVerifiedLabel: string;
      /** R20 F-9 honesty law: the row's Connect/Disconnect action,
       *  present ONLY when the server payload carried an enabled
       *  action for this row (a real connect flow behind it).
       *  `hasRealFlow` mirrors that exactly - a row with no backed
       *  action carries action: null and renders status only. */
      action?: { id: string; label: string } | null;
      hasRealFlow?: boolean;
    };

export type SettingsSectionProjection = {
  key: string;
  title: string;
  lede: string;
  rows: SettingsRowProjection[];
};

/** Section 6 - onboarding entry. */
export type AuthProjection = {
  phoneDisplay?: string | null;
  codeLength: number;
  resendAvailableAt?: string | null;
  profileDraft: { name: string; handle: string; photoState: "initials" | "photo" };
};

/**
 * Repair #19 W13 - EVENT SHARE CARD projection. Every field is a
 * finished string built by the ONE adapter (shareCardFromDetail in
 * shellData.ts) from the plan's real detail projection. The card
 * renders exactly what it is given: no people row when the roster is
 * absent, no place row when unset, and NO share URL - the plan
 * contract carries no share code, so none is ever fabricated.
 */
export type EventShareCardProjection = {
  planId: string;
  stateFamily: PlanStateFamilyC2 | string;
  stateLabel: string;
  title: string;
  whenLine: string;
  whereLine: string | null;
  attendanceLine: string | null;
  /** Finished people line from the real roster ("Maya, Jordan + 2 more"), or null. */
  peopleLine: string | null;
  /** The plain-text share artifact, lines joined - exactly what Copy places on the clipboard. */
  textLines: string[];
};

/**
 * Repair #19 BS-11 - CONVERSATION SHARE CARD projection, the
 * conversation leg of W13's share-card law. Built by the ONE
 * adapter (conversationShareCard in C1ShellHosts.ts) from the open
 * conversation's real record: its title, its anchor, and — when the
 * anchor is a plan the host holds — that plan's own card lines.
 * A conversation has no share code or URL, so none is fabricated;
 * the card's one action is Copy details, and its opening line
 * states in words what the recipient gets (the details, inside
 * Opal — not a link). Message content is never on the card: an
 * Opal conversation is private to its account.
 */
export type ConversationShareCardProjection = {
  title: string;
  /** "Filed under X" from the conversation's anchor, or null when unanchored. */
  anchorLine: string | null;
  /** The anchor plan's own card block, when the anchor resolves to a held plan. */
  plan: {
    title: string;
    stateLabel: string;
    whenLine: string | null;
    whereLine: string | null;
  } | null;
  /** The plain-text share artifact — exactly what Copy places on the clipboard. */
  textLines: string[];
};

/**
 * Repair #19 W13 - PERSON PROFILE projection. Built by the Chats
 * host adapter from the conversation record, the relationship rows,
 * and the thread's shared next-plan fact - real data only. Absent
 * facts are null and render nothing.
 */
export type PersonProfileProjection = {
  name: string;
  handle: string | null;
  avatar: AvatarRef;
  /** The finished SINGULAR tie ("Partner", "Family - Sister") from
   *  the one label map, or null when unset — renders nothing. */
  relationshipLabel: string | null;
  /** Repair #19 W24 (DL-01/DL-02/DL-09) — the identification leg:
   *  the peer's real user id (the write resolves the relationship
   *  from the person, never from a stored relationship id), the raw
   *  type + subtype the picker opens on, and the derived
   *  close-circle cue. personId null (a group thread's profile) =
   *  no identification row, honestly. */
  personId: string | null;
  relationshipType: string | null;
  familySubtype: string | null;
  familyMinor: boolean;
  /** N4 — the established age band for this person (the picker's
   *  vocabulary), or null when none has been established. */
  ageBand: "under_13" | "age_13_17" | "adult" | null;
  closeCircle: boolean;
  /** The shared upcoming plan fact for this conversation, or null. */
  nextTogether: { title: string; whenLine: string; stateFamily: string; stateLabel: string } | null;
  peerCount: number;
};
