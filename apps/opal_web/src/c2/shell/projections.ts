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

/** R22 (WS-3): one playable story inside a rail cell — the
 *  unit the story viewer dwells on and advances through. */
export type StoryPlayItemProjection = {
  id: string;
  mediaUrl: string;
  caption: string | null;
  /** The server record's own expires_at (posting + lifetime). */
  expiresAt: string | null;
};

/** Section 7.2 - story rail. */
export type StoryRailProjection = {
  self: {
    avatar: AvatarRef;
    hasLiveStory: boolean;
    /** Finished label, for example "2h" - never computed here.
     *  Repair #22 (R22-A): the story rail no longer renders this
     *  free-text label - the self stone's caption is the shared
     *  state word "Live", so one state wears one form rail-wide. */
    liveStoryLabel?: string | null;
    /** JA-11: the viewer's own story record, carried so the self
     *  cell can open the viewer on it (the same media the rail
     *  would have shown in the duplicate named cell). Null = the
     *  viewer has no live story; "Add" is the empty case. */
    story?: {
      storyCount: number;
      mediaUrl: string | null;
      caption: string | null;
      /** R22 (WS-3): every playable own story, in rail order —
       *  the viewer's queue source. Expired records never
       *  reach the projection (server list + compose filter). */
      items?: StoryPlayItemProjection[];
    } | null;
  };
  stories: Array<{
    id: string;
    personName: string;
    /** Repair #21 (W-12): the author's real user id - the stone's
     *  anchor name is the door to the pair's bond. */
    personId?: string | null;
    avatar: AvatarRef;
    seen: boolean;
    ringKind: "unseen" | "seen" | "happening";
    /** Repair #21 (W-9 identity addendum): the Moment Stone state,
     *  assigned by the one adapter from the living graph - a live
     *  host's stone is "happening" (cyan fire), a loved tie's is
     *  "loved", then "new", then "seen". The rail orders by it:
     *  happening > loved > new > seen. Repair #23 (WS-23-5)
     *  admits "nearby" between happening and loved, fed ONLY by
     *  the server place signal's nearby_user_ids - itself
     *  derived from fresh per-plan location shares near a shared
     *  plan's place. No author location is read on the client;
     *  the tier arrives as a finished server fact or not at
     *  all. */
    stoneState?: "happening" | "nearby" | "loved" | "new" | "seen";
    storyCount: number;
    /** The story's real media (hunt-fix B-10). Absent = the cell
     *  never opens a viewer; there is no empty stage. */
    mediaUrl?: string | null;
    caption?: string | null;
    /** R22 (WS-3): this person's playable stories in rail order
     *  (records with renderable media only) — the viewer plays
     *  them in sequence, then jumps to the next person's. */
    items?: StoryPlayItemProjection[];
  }>;
  capabilities: { canPost: boolean; canStory: boolean };
};

export type FeedCardProjection =
  | {
      kind: "plan";
      id: string;
      card: PlanCardC2Input;
      /** Repair #21 (I-1 refined - the four doors): the seed facts a
       *  door branch may lawfully carry, finished by the one adapter
       *  from the plan's own record. Party ids are NOT here - they
       *  are read at door time from the plan's history projection
       *  (the same read the repeat flow's parties come from), so a
       *  branch never composes a party from a stale card. */
      seed?: {
        title: string;
        location: string | null;
        placeLat: number | null;
        placeLon: number | null;
        planType: string | null;
        /** The plan contract's viewer_state ("going", "host", ...). */
        viewerState: string | null;
        organizerUserId: string | null;
      };
    }
  | {
      kind: "memory";
      id: string;
      /** Repair #21 (W-13 / I-1): the moment author's real user id,
       *  from the feed record's actor - the reply door and the seed
       *  doors address the author by id, never by display name. */
      authorUserId?: string | null;
      /** True when the moment is the viewer's own. */
      mine?: boolean;
      /** The moment record's own place (its place_ref display name,
       *  projected by the backend feed card). Null = the record
       *  carries no place, and seed doors carry none either. */
      placeLabel?: string | null;
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
      /** Repair #21 (W-9 rebuild): the moment's real engagement,
       *  from the feed record itself (HomeFeed card carries
       *  like_count / viewer_liked). The like action writes
       *  through the real like endpoint and re-renders from its
       *  response - never a local-only count. */
      likeCount?: number;
      viewerLiked?: boolean;
      /** Repair #23 (WS-23-1): the moment's repost / save truth,
       *  from the feed record's own engagement_summary (the
       *  backend HomeFeed card carries viewer_reposted,
       *  repost_count and viewer_saved - verified in
       *  home_feed.ex). The card's repost / save controls render
       *  their state from these fields at rest and re-render
       *  from the action responses after a tap - never from a
       *  local-only guess a re-read would contradict. The
       *  repost count is an internal input only, like the like
       *  warmth: no numeral renders on the card. */
      viewerReposted?: boolean;
      repostCount?: number;
      viewerSaved?: boolean;
      commentCount?: number;
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
      hostUserId?: string | null;
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
/** Repair #21 (W-9 rebuild) - an occasion arriving AHEAD of time,
 *  from the viewer's own celebrations record (GET /celebrations).
 *  daysUntil is computed by the one adapter from month/day - the
 *  surface never does date math. */
export type HomeOccasion = {
  id: string;
  personName: string;
  kindLabel: "Birthday" | "Anniversary" | "Occasion";
  dateLabel: string;
  daysUntil: number;
  /** The record's own curated idea line, when one was read back. */
  wouldLove?: string | null;
  /** The doorway's own words, produced by the derivation (never
   *  assembled in the card): carries the PERSON, not a pronoun -
   *  "Start a plan for Maya". */
  actionLabel: string;
};

/** Repair #21 (W-9 rebuild) - Know Me? Trivia, projected. Questions
 *  are built ONLY from records the viewer legitimately holds
 *  (their celebrations, their wallet's relationship capsules);
 *  answers are verified by the subjects themselves - never by a
 *  model. See shellData.buildTriviaQuestions. */
export type TriviaQuestionView = {
  id: string;
  subjectUserId: string;
  subjectName: string;
  question: string;
  factSummary: string;
  /** Which held record proposed this question (build vocabulary). */
  source: "celebration" | "capsule";
};

export type TriviaGuessView = {
  id: string;
  subjectUserId: string;
  subjectName: string | null;
  guesserUserId: string | null;
  guesserName: string | null;
  anonymous: boolean;
  question: string;
  guess: string;
  status: "pending" | "validated" | "rejected" | "corrected" | string;
  multiplier: number;
  /** Repair #22 (WS-7) - the correction, when the subject fixed
   *  this record: what the answer was corrected to. The original
   *  `guess` above always stays what was claimed. */
  correctedGuess?: string | null;
  correctedAt?: string | null;
};

export type HomeTrivia = {
  questions: TriviaQuestionView[];
  aboutMe: TriviaGuessView[];
  mine: TriviaGuessView[];
  /** The inert score ledger - derived server-side from validated
   *  guesses. No rewards read it; it is the ledger, whole. */
  score: { validatedCount: number; points: number };
  /** About You: a fact Opal holds about the viewer, from the
   *  viewer's own memory facts - theirs to confirm or correct. */
  aboutYouFact: { id: string; label: string; value: string } | null;
};

/**
 * Repair #21 (W-14) - PRESENCE, as one felt thing: who of your
 * people is live right now, as lights. Built by the one adapter
 * from the visible-lives read alone - the only presence signal
 * with a lawful global read today. "Free" (an open availability
 * window) is conversation-scoped in the machinery and has no
 * Flows-level read; it is declared in the wave report, never
 * approximated here.
 */
export type PresenceLight = {
  userId: string;
  name: string;
  avatar: AvatarRef;
  liveId: string;
  mine: boolean;
};

/**
 * Repair #21 (W-12) - THE BOND (the shared stone): the pair's own
 * place, projected ONLY from shared truth - plans both parties
 * are on, and the pair's own Know Me? Trivia records. No private
 * capsule, wallet fact, or one-sided record is an input to this
 * projection's builder (see bondFromPair in shellData.ts): a bond
 * element fed by a private capsule is an isolation violation, so
 * the builder's input type carries no capsule at all.
 */
export type BondProjection = {
  personId: string;
  name: string;
  avatar: AvatarRef;
  /** The viewer's finished tie to this person, or null. */
  relationshipLabel: string | null;
  /** Done-and-loved: shared plans that have settled into the past. */
  chapters: Array<{ planId: string; title: string; whenLine: string; placeLabel: string | null }>;
  /** The pair's next shared plan, or null. */
  nextTogether: {
    planId: string;
    title: string;
    whenLine: string;
    stateLabel: string;
    stateFamily: string;
  } | null;
  /** The pair's Know Me? score from their own validated guesses:
   *  the inert ledger formula (10 x multiplier) over the pair
   *  subset of the trivia read. Null when the pair has never
   *  played a validated round. */
  pairScore: { confirmed: number; points: number } | null;
  /** The shape of the overlap, as felt objects: distinct places
   *  the pair's shared plans happened at, in record order. */
  sharedPlaces: string[];
  sharedPlanCount: number;
};

/**
 * Repair #22 (WS-5) - PLACE ENERGY: one place in Flows, projected.
 * Built ONLY by placeStonesFromGraph (shellData.ts) from records
 * the viewer already lawfully holds - their plans list (shared
 * plans, never vaulted-private, never settled by them), their
 * visibility-gated home feed moments, and the visible-lives read.
 * The energy is computed, never stored and never assigned per
 * place: score, level and family all derive from the place's own
 * qualifying records (design record:
 * coordination/repair19/r22-place-energy-design.md, section 4).
 * A place with no qualifying record produces no stone at all.
 * Only finished strings and counts ride here; the surface renders
 * them verbatim and derives nothing.
 */
export type PlaceStoneProjection = {
  /** Grouping key: the normalized place name (the records carry
   *  no stable place id to these reads - declared D-P1). */
  key: string;
  /** The place name verbatim from the first record that carried it. */
  name: string;
  /** The summed signal weight (memory contribution capped - see
   *  the builder). Internal ordering/warmth input; like moment
   *  light, the numeral itself never renders as a score. */
  energyScore: number;
  energyLevel: "ember" | "lit" | "radiant";
  /** The state family of the place's strongest current signal, in
   *  the state-color canon: the stone's fire color. */
  energyFamily: "happening" | "action" | "ready" | "forming" | "past";
  /** Finished energy line, composed by the builder from the
   *  counts themselves - a sentence the counts can prove. */
  energyLine: string;
  /** Finished signal lines, strongest first, at most 3. Each
   *  exists only when its signal exists. */
  signalLines: string[];
  /** Live rooms at the place right now (S1). The host is the one
   *  presence fact a record states outright. */
  livesHere: Array<{ liveId: string; title: string; hostName: string | null }>;
  /** Plans in their live window at the place (S2). */
  happeningPlans: Array<{ planId: string; title: string; whenLine: string }>;
  /** The place's action / ready / forming plans, indicator
   *  precedence order (S3 / S4 / S5). stateFamily is the plan's
   *  place-energy family (the NextPlan mirror in the builder). */
  comingPlans: Array<{
    planId: string;
    title: string;
    whenLine: string;
    stateLabel: string;
    stateFamily: "action" | "ready" | "forming";
    /** The plan's own attendance line ("3 of 4 going") when its
     *  contract carries counts - attendance in the plan's words,
     *  never restated as physical presence. */
    attendanceLine: string | null;
  }>;
  /** Settled plans at the place (S7) - its memory as plans. */
  memoryPlans: Array<{ planId: string; title: string; whenLine: string }>;
  /** Moments posted from the place that the viewer may see (S6),
  newest first as the feed ranked them. No door: no moment detail
   *  surface exists today. */
  momentsHere: Array<{ momentId: string; caption: string; authorName: string }>;
  /** The door out: "Start a plan here", pre-composed by the
   *  builder through the flows2 seed machinery from the place's
   *  strongest lawful seed source (one of its plans, else one of
   *  its moments). Null when the place's only signal is a live
   *  room - a live room is not a seed source (declared D-P4). */
  startSeed: import("./flows2").SeedCreate | null;
  /** Repair #23 (WS-23-5): the SERVER place signal for this
   *  place, from the tier-only read path (POST /places/signals).
   *  tier is the qualitative Heat tier for THIS viewer
   *  (quiet / stirring / warm / alive) - the stone's warmth
   *  input; it is light only on the glass, never a numeral and
   *  never a "trending" label. Absent when the read has not
   *  landed or failed: the stone then rests on its R22 energy
   *  level alone, honestly. */
  signalTier?: import("../../api/productClient").PlaceSignalTier;
  /** Repair #23 (WS-23-5): coarse nearby for this place, from
   *  the same read - true only when a person on one of the
   *  viewer's own plans at this place holds a fresh per-plan
   *  location share near the place. Near / not-near only. */
  signalNearby?: boolean;
};

export type HomeProjection = {
  header: ShellHeaderProjection;
  rail: StoryRailProjection;
  feed: FeedCardProjection[];
  /** Repair #22 (WS-5): place stones for the stream, energy order
   *  (strongest first). Absent/empty when no place in the viewer's
   *  graph carries a qualifying signal - never staged. */
  places?: PlaceStoneProjection[];
  /** Repair #21 (W-14): the presence lights for first paint.
   *  Absent/empty when nobody is live - presence discipline. */
  presence?: PresenceLight[];
  /** Hunt-fix B-12: a failed feed/plans load, in plain words. The
   *  surface renders this with a retry — never an empty feed. */
  feedError?: string | null;
  /** Repair #21 (W-9 rebuild): occasions ahead of time. Absent
   *  (undefined) when the celebrations read failed or none are
   *  near - the section simply does not render. */
  occasions?: HomeOccasion[];
  /** Repair #21 (W-9 rebuild): the Trivia game projection, or
   *  null when its reads failed - the card is then honestly
   *  absent, never staged. */
  trivia?: HomeTrivia | null;
  /** Repair #21 (W-9 identity addendum): discovery - people the
   *  viewer talks with who are not yet in their circle and not
   *  yet followed, from the real conversations + follows reads.
   *  The follow action is the real follows endpoint. Places and
   *  interests discovery has no wiring today and is DECLARED in
   *  the rebuild report - it is not painted. */
  discovery?: Array<{ userId: string; name: string; avatar: AvatarRef }>;
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
   * Repair #18 DIR-2 / R20 F-9 v2 — one Connectors tool row, built
   * VERBATIM from the server's settings/connections projection
   * (SP-3: the surface renders the output; it never re-derives a
   * status). `status` and `statusLabel` are the payload's own
   * values, so DOM status equals payload status by construction.
   * The row's face is icon + name + one action; `subtitle`,
   * `detail`, `gateReason`, and `lastVerifiedLabel` are the short
   * lines behind a View action, and the builder drops a gateReason
   * that merely restates `detail`.
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
