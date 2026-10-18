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
import type { PlanCardC2Input } from "../PlanCardC2";
import type { OpalPlanContract } from "../../api/productClient";

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
  };
  stories: Array<{
    id: string;
    personName: string;
    avatar: AvatarRef;
    seen: boolean;
    ringKind: "unseen" | "seen" | "happening";
    storyCount: number;
  }>;
  capabilities: { canPost: boolean; canStory: boolean };
};

export type FeedCardProjection =
  | { kind: "plan"; id: string; card: PlanCardC2Input }
  | {
      kind: "memory";
      id: string;
      photoUrl?: string | null;
      contextLine: string;
      authorLine: string;
    }
  | {
      kind: "live";
      id: string;
      title: string;
      contextLine: string;
      actionLabel: string;
      actionId: string;
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
};

/** Section 8.1 - Graphs list. Groups arrive ordered and titled; the
 *  list renders them exactly as projected and never regroups locally. */
export type GraphListProjection = {
  groups: Array<{
    id: string;
    kind: "needs-detail" | "coming-up" | "with" | "someday" | "past";
    title: string;
    cards: Array<
      PlanCardC2Input & {
        id: string;
        /** Finished completion action for a forming plan missing one
         *  slot, or null. Label names the slot in plain words. */
        completionAction?: { label: string; slotKind: string } | null;
        droppable?: boolean;
      }
    >;
  }>;
  lensCounts: { all: number; action: number; ready: number; past: number };
  timelineAvailable: boolean;
  listError?: string | null;
};

/** Section 8.2 - Graph Detail. */
export type GraphDetailProjection = {
  id: string;
  title: string;
  card: PlanCardC2Input;
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
  who: Array<{ name: string; avatar: AvatarRef; responseLabel: string }>;
  nextAction?: { id: string; label: string } | null;
  activity: Array<{ line: string; timeLabel: string }>;
  history: Array<{ line: string }>;
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
  | { kind: "note"; id: string; text: string };

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
