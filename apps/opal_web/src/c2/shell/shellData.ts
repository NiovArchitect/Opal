/**
 * Repair #18 - Division C2 - shell data adapter.
 *
 * This is the ONE place C2 shell surfaces get their projections. It
 * builds the spec shapes (projections.ts) from the existing product
 * API and the existing single derivations - it invents no new state
 * logic:
 *  - plan state family comes from the plan status vocabulary the
 *    existing GraphsHome filters already use (idea/forming, action,
 *    ready/aligned, live/now, past), which is the vocabulary the
 *    backend plans serializer emits;
 *  - attendance text is built only from the Repair #18 attendance
 *    contract fields (going_count / total_count) and renders nothing
 *    when the contract is absent;
 *  - settings rows are included ONLY when settingsWireClass.ts
 *    classifies the wire GREEN in this base (real persisted effect).
 *    Everything else is absent, per section 10.2 - not greyed out.
 *
 * NAMED GAPS for the coordinator (spec section 12, D5): the grouped
 * GraphListProjection builder, GraphDetailProjection participant
 * rosters and next-action builder, and the StoryRailProjection
 * builder are Division A deliverables that do not exist in this base.
 * Until they land, this adapter groups finished cards by their state
 * family and missing-slot facts (presentation grouping of finished
 * fields, never a state derivation), omits detail sections the
 * contract cannot answer, and maps story records defensively,
 * skipping any record whose author cannot be named from the record.
 */
import {
  fetchHomeFeed,
  getPlaceSignals,
  getAccountActivity,
  getAssistPreference,
  getLivesVisible,
  getDeviceRoster,
  getGraphingPolicy,
  getSoulMemory,
  getHomeTimezone,
  listCelebrations,
  listConversations,
  listFollowing,
  listRelationships,
  listTriviaGuesses,
  type Celebration,
  getGraphLock,
  getMessagingPreferences,
  getPersonalInviteCode,
  getSavedLogins,
  getSettingsConnections,
  listMemoryFacts,
  listOpalPlans,
  getPlanHistory,
  listTemporaryStories,
  loadProfile,
  type OpalPlanContract,
  type ProductSession,
} from "../../api/productClient";
import {
  foldSpineAnswers,
  foldSpineChatActions,
  invitationTemperature,
  pastDateForPlan,
  pastPillsFromEntries,
  planWhenLine,
  presenceForPlan,
  settledInvitationForPlan,
  settledKindForPlan,
  spineFromPlan,
} from "./density";
import { isStoryExpired } from "../../opalUi/storyPlayback";
import type { PlanCardC2Input, PlanCardLimboC2, PlanStateFamilyC2 } from "../PlanCardC2";
import { tieLabel } from "../../opalUi/relationshipTypes";
import type {
  AvatarRef,
  BondProjection,
  GraphDetailProjection,
  GraphListProjection,
  HomeOccasion,
  HomeProjection,
  PlaceStoneProjection,
  TriviaGuessView,
  SettingsSectionProjection,
  ShellProjection,
  YouHubProjection,
} from "./projections";
import { seedCreateFor, type SeedSource } from "./flows2";
import type { CenterOpeningProjection } from "./C2CenterOpening";

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function avatarOf(name: string, seed = 0): AvatarRef {
  return { initials: initialsOf(name), tint: (seed % 6) + 1 };
}

/**
 * Repair #19 W8 (W5-11) - plain-language formatters for the Soul and
 * Memory rooms. The founder's review of the combined page was that it
 * rendered RAW VALUES as unlabeled boxes ("22:00", "08:00",
 * "America/Los_Angeles", "3", "standard"). These are the ONE place
 * those raw truths become finished human sentences; the rooms render
 * only what these return, never the raw string beside a label.
 */

/** "22:00" -> "10:00 PM"; "08:00" -> "8:00 AM". Unparseable input is
 *  returned as-is (it is the server's value, never invented). */
export function formatClockTime(raw: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec((raw ?? "").trim());
  if (!m) return raw;
  const hour24 = Number(m[1]);
  if (Number.isNaN(hour24) || hour24 < 0 || hour24 > 23) return raw;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${m[2]} ${suffix}`;
}

/** The quiet-hours sentence the Soul room carries as its reason. */
export function quietHoursSentence(start: string, end: string): string {
  // JA-07: start == end is the backend resolver's DISABLED state
  // (SocialFlow.QuietHours edge rule) — the sentence says so
  // honestly instead of describing a zero-length window.
  if (start && start === end) return "Quiet hours are off";
  return `Opal holds non-urgent things from ${formatClockTime(start)} to ${formatClockTime(end)}`;
}

/** "America/Los_Angeles" -> "Los Angeles (America/Los_Angeles)".
 *  The human city name leads; the exact zone stays visible in
 *  parentheses because it is the value Opal actually saves. */
export function humanTimezoneLabel(tz: string): string {
  const raw = (tz ?? "").trim();
  if (!raw) return "Not set";
  if (raw === "UTC") return "UTC (Coordinated Universal Time)";
  const city = raw.split("/").pop()!.replace(/_/g, " ");
  return city && city !== raw ? `${city} (${raw})` : raw;
}

/** completion_feedback enum -> the words a person would choose. */
export function feedbackStyleLabel(value: string): string {
  return value === "reduced"
    ? "Keep it brief - a short note when something is done"
    : "Tell me when things are done";
}

export function feedbackStyleForLabel(value: string): string {
  return value === "reduced" ? "reduced" : "standard";
}

/** assistance_level enum -> plain label (mirrors the backend's own
 *  assistance_level_label, kept here for the selected-state reason). */
export const SOUL_LEVEL_COPY: Record<
  string,
  { label: string; reason: string }
> = {
  minimal: {
    label: "Only when I ask",
    reason: "Opal only helps when you ask. It does not offer or start things on its own.",
  },
  balanced: {
    label: "Balanced",
    reason:
      "Opal offers help as things come up, and waits for your say-so before it acts.",
  },
  proactive: {
    label: "More forward",
    reason:
      "Opal steps forward more often with ideas and follow-ups, always inside your quiet hours and your daily cap below.",
  },
};

/** ISO timestamp -> "Saved Oct 18, 2026". Absent/unparseable -> null
 *  (the row simply carries no date, never a guessed one). */
export function capsuleSavedLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return `Saved ${month} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** A capsule's scope kind, from the contract's own fields only. */
export function capsuleScopeKind(capsule: {
  scope_kind?: string | null;
  scope_policy?: Record<string, unknown>;
}): string {
  const direct = capsule.scope_kind;
  if (typeof direct === "string" && direct) return direct;
  const policy = capsule.scope_policy ?? {};
  const scope = policy["scope"] as Record<string, unknown> | undefined;
  const kind = scope?.["kind"] ?? policy["scope_kind"];
  return typeof kind === "string" && kind ? kind : "user";
}

export type CapsuleGroup = "about-you" | "with-people" | "from-plans";

export function capsuleGroupOf(kind: string): CapsuleGroup {
  if (kind === "relationship" || kind === "conversation" || kind === "group")
    return "with-people";
  if (kind === "user" || kind === "personal") return "about-you";
  return "from-plans";
}

export const CAPSULE_GROUP_HEADINGS: Record<CapsuleGroup, string> = {
  "about-you": "About you",
  "with-people": "Tied to a person",
  "from-plans": "From your plans and activities",
};

/**
 * Repair #19 W8 (item 16) - CALL GRAPHING standing permission copy.
 * The truth is the existing GraphingPolicy record (call_mode +
 * global_paused, GET/PATCH /relationship-access/graphing) - the same
 * record the legacy standing-permission section writes and
 * graphing_decision consults on every call. W12 owns the in-call
 * pause; this is its standing counterpart in Settings.
 */
export const CALL_GRAPHING_MODES: Array<{
  value: string;
  label: string;
  reason: string;
}> = [
  {
    value: "never",
    label: "Never",
    reason: "Opal never graphs your calls.",
  },
  {
    value: "ask_each",
    label: "Ask me each time",
    reason: "Opal asks before graphing a call, every time.",
  },
  {
    value: "auto_eligible",
    label: "On, when a call can be graphed",
    reason:
      "Opal may graph a call without asking first, when the call and the people on it allow it.",
  },
  {
    value: "selected_only",
    label: "Only people I choose",
    reason:
      "Opal graphs calls only with people you have allowed. If no one is allowed, nothing is graphed.",
  },
];

export const CALL_GRAPHING_REASON =
  "Graphing a call means the call becomes part of your graph - who was on it, what was decided, and what to follow up - so your plans and memories stay connected. It is not a recording kept for listening back, and the other people on a call are always told.";

/** Account-activity kinds -> plain titles. Unknown kinds fall back to
 *  their words with underscores spaced - never a raw machine string
 *  with underscores on the glass. */
export function activityKindLabel(kind: string): string {
  switch (kind) {
    case "credential_used":
      return "Opal used a saved login";
    case "device_revoked":
      return "A device was signed out";
    case "account_deleted":
      return "Account deletion completed";
    case "data_deleted":
      return "Data deletion completed";
    case "invite_redeemed":
      return "An invite code was redeemed";
    default: {
      const words = kind.replace(/_/g, " ").trim();
      return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Account activity";
    }
  }
}

const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** An activity subject is shown only when it reads as something a
 *  person would recognize (a site host, a name). A session id or any
 *  UUID-shaped subject is machine-speak and never reaches the glass. */
export function activitySubjectLabel(
  kind: string,
  subject: string | null | undefined,
): string | null {
  if (!subject) return null;
  if (UUID_LIKE.test(subject.trim())) return null;
  if (kind === "credential_used") return `For ${subject}`;
  if (kind === "device_revoked") return null;
  return subject;
}

/** ISO timestamp -> "Oct 18, 2026 at 3:49 PM" (UTC, as stored). */
export function activityWhenLabel(iso: string | null | undefined): string {
  const saved = capsuleSavedLabel(iso)?.replace(/^Saved /, "");
  if (!saved || !iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return saved;
  let h = d.getUTCHours();
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12 === 0 ? 12 : h % 12;
  const mins = String(d.getUTCMinutes()).padStart(2, "0");
  return `${saved} at ${h}:${mins} ${suffix}`;
}

const FAMILY_BY_STATUS: Record<string, PlanStateFamilyC2> = {
  idea: "forming",
  forming: "forming",
  action: "action",
  pending: "action",
  ready: "ready",
  aligned: "ready",
  locked: "ready",
  live: "happening",
  now: "happening",
  happening: "happening",
  past: "past",
  settled: "past",
  ended: "past",
  // R19 W7: the backend's own terminal statuses (SharedPlan
  // @statuses) - a completed plan IS past; without these rows a
  // finished plan rendered as "forming" and the Past view missed it.
  completed: "past",
  expired: "past",
  // R19 W18-FIX (W13 sweep finding): the GOVERNED statuses (SharedPlan
  // @statuses = tentative/agreed/changed/cancelled/completed/expired)
  // reach this function raw from the plans list (list_plans_for_user
  // excludes only cancelled/expired), and tentative/agreed/changed
  // were unmapped - an AGREED plan fell through to "forming" and wore
  // forming violet instead of ready gold. Canon, mirroring the
  // backend's ONE indicator derivation (NextPlan.indicator_state):
  // agreed -> ready (its explicit leg); tentative -> forming and
  // changed -> forming (its fall-through leg: "everything else
  // active (tentative / changed)"). changed is NOT action here:
  // NextPlan's action leg is the VIEWER's pending participant
  // response and its happening leg is the live window - viewer/time
  // facts a status-only derivation never receives. JourneyAuthority's
  // reconfirm-after-change is likewise per-participant response
  // state, not plan status; a changed plan whose viewer already
  // reconfirmed must not wear action. Pinned in familyOfStatus.test.ts.
  tentative: "forming",
  agreed: "ready",
  changed: "forming",
  // Canon vocabulary alias: a needs-action status IS the action family.
  "needs-action": "action",
  needs_action: "action",
};

const LABEL_BY_FAMILY: Record<PlanStateFamilyC2, string> = {
  forming: "Forming",
  action: "Action needed",
  ready: "Ready",
  happening: "Happening",
  past: "Past",
};

export function familyOfStatus(status: string | null | undefined): PlanStateFamilyC2 {
  return FAMILY_BY_STATUS[(status ?? "").toLowerCase()] ?? "forming";
}

/**
 * Repair #19 (W9) - REAL IMAGERY, the plan path. A plan card's image
 * comes from the plan RECORD's own fields, in this precedence:
 *   1. plan.image_url            (record-level image, W1 seed world)
 *   2. plan.place.photo_url      (the place projection's photo)
 *   3. plan.place_image_url      (flat venue photo on the record)
 *   4. plan.place.image_url      (place projection, alternate key)
 *   5. plan.media_url            (record media URL)
 * A value counts only when it is URL-shaped (/, data:, http) - the
 * same renderability rule the story rail and the feed already use.
 * `media_id` is deliberately NOT in this list: it is an opaque id
 * and this client has no resolver that turns a plan's media_id
 * into a URL, so promoting it would paint a broken or guessed
 * image. When no field qualifies, the result is null and the card
 * renders NO media well (the designed no-image state) - never a
 * stock photo keyed by title, never text in an image-shaped hole.
 * The returned provenance names the exact field that supplied the
 * image; it is build vocabulary (a data attribute in tests), never
 * screen copy.
 */
export function planImageFromRecord(
  plan: OpalPlanContract,
): { photoUrl: string; provenance: string } | null {
  const candidates: Array<[string, string | null | undefined]> = [
    ["plan.image_url", plan.image_url],
    ["plan.place.photo_url", plan.place?.photo_url],
    ["plan.place_image_url", plan.place_image_url],
    ["plan.place.image_url", plan.place?.image_url],
    ["plan.media_url", plan.media_url],
  ];
  for (const [provenance, value] of candidates) {
    if (
      typeof value === "string" &&
      value &&
      (value.startsWith("/") || value.startsWith("data:") || value.startsWith("http"))
    ) {
      return { photoUrl: value, provenance };
    }
  }
  return null;
}

/**
 * Repair #19 (W9) - the Home form of a plan card: the shared card
 * plus the record's own imagery and people. Only Home sets these
 * fields today, so Graphs/Center cards are byte-identical to
 * before; the fields are additive on the one card grammar.
 * People: the list contract carries the organizer's name and a
 * finished who_label, NOT a participant roster (the roster lives
 * on the plan-history projection the detail reads). So the faces
 * row carries exactly the people the record names - the organizer
 * - and the who_label renders verbatim beside them. No face is
 * ever invented to fill the row.
 */
export function homeCardFromPlan(
  plan: OpalPlanContract,
): PlanCardC2Input & { id: string } {
  const card = cardFromPlan(plan);
  const media = planImageFromRecord(plan);
  const organizer = plan.organizer_name?.trim() ? plan.organizer_name.trim() : null;
  return {
    ...card,
    media,
    people: organizer ? [avatarPerson(organizer, 0)] : [],
    peopleLine: plan.who_label?.trim() ? plan.who_label.trim() : null,
  };
}

function avatarPerson(name: string, seed: number): { name: string; initials: string; tint: number | null } {
  const avatar = avatarOf(name, seed);
  return { name, initials: avatar.initials, tint: avatar.tint };
}

/**
 * Repair #19 (W9) - LIVE surfacing truth. Maps the visible-lives
 * read (GET /api/v1/product/lives/visible - the same Paste K /
 * W4-05 Go-live machinery the legacy Home hydrates from) into Home
 * feed cards. Gating is strict presence discipline (L8):
 *  - a room renders ONLY when its record carries an id AND its
 *    status is exactly "live" (an ended/flagged/absent-status room
 *    never renders - the server already filters to live, and this
 *    adapter re-checks rather than trusting the envelope);
 *  - the place line comes from the room's own place_label, else
 *    its venue's display_name / name - honouring the host's
 *    location precision exactly as the server projected it. When
 *    the record carries no place, placeLabel is null and NO place
 *    line renders (the legacy mapper's "Somewhere nearby" filler
 *    is not carried into C2: an invented place is a FALSE);
 *  - the host line comes from host_display_name / host_handle on
 *    the record; absent both, the card still renders (anchored by
 *    its place/title) without naming a person it cannot name.
 * Pure and exported for tests; homeFromSession is its only caller.
 */
export function liveFeedFromRooms(
  rows: Array<{ live_room?: Record<string, unknown> } | Record<string, unknown>> | null | undefined,
): Extract<import("./projections").FeedCardProjection, { kind: "live" }>[] {
  const out: Extract<import("./projections").FeedCardProjection, { kind: "live" }>[] = [];
  for (const row of rows ?? []) {
    const room = (
      row && typeof row === "object" && "live_room" in row
        ? (row as { live_room: Record<string, unknown> }).live_room
        : row
    ) as Record<string, unknown> | undefined;
    if (!room || typeof room.id !== "string" || !room.id) continue;
    if (room.status !== "live") continue;
    const venue = (room.venue ?? {}) as Record<string, unknown>;
    const placeLabel =
      (typeof room.place_label === "string" && room.place_label) ||
      (typeof venue.display_name === "string" && venue.display_name) ||
      (typeof venue.name === "string" && venue.name) ||
      null;
    const hostName =
      (typeof room.host_display_name === "string" && room.host_display_name) ||
      (typeof room.host_handle === "string" && room.host_handle) ||
      null;
    const title =
      (typeof room.title === "string" && room.title) ||
      (placeLabel ? `Live at ${placeLabel}` : "Live now");
    // Repair #21 charges (CF2-3) - the place is stated ONCE, in
    // the strongest position the card has: inside the title when
    // the title is the default "Live at ..." (or already names
    // it); otherwise the place drops to the card's place line and
    // the context line carries only the host. The old derivation
    // said the place three times (title, "...is live from X",
    // "At X").
    const titleCarriesPlace = Boolean(placeLabel) && title.includes(placeLabel!);
    // With a place in play the host line drops its "now" tail
    // (the pill + title already carry the liveness, and the
    // place is stated once); with no place, the pinned W9 line
    // stands as-is.
    const contextLine = hostName
      ? placeLabel
        ? `${hostName} is live`
        : `${hostName} is live now`
      : "Live now";
    out.push({
      kind: "live",
      id: `live-${room.id}`,
      title,
      contextLine,
      actionLabel: "Watch",
      actionId: `watch:${room.id}`,
      hostName,
      hostUserId: typeof room.host_account_id === "string" ? room.host_account_id : null,
      hostAvatar: hostName ? avatarOf(hostName, out.length + 1) : null,
      placeLabel: titleCarriesPlace ? null : placeLabel,
      mine: room.mine === true,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Repair #22 (WS-5) - PLACE ENERGY                                    */
/*                                                                     */
/* One pure builder: placeStonesFromGraph. Design record:              */
/* coordination/repair19/r22-place-energy-design.md (sections 4-5).    */
/* NO FAKE HEAT: every unit of energy is a real record the viewer      */
/* already lawfully holds, and a place with no qualifying record       */
/* produces no stone. The builder's inputs are exactly the three       */
/* reads homeFromSession makes - the plans list contract, the home     */
/* feed's moment cards, and the visible-lives rooms - pre-filtered     */
/* by the adapter's existing gates (private and viewer-settled         */
/* plans are removed before the builder ever sees them).               */
/* ------------------------------------------------------------------ */

/** The live-window leg of NextPlan.indicator_state, in seconds
 *  (the backend's @live_window_seconds: a plan with no end_at is
 *  live for 180 minutes after its start). */
const PLACE_LIVE_WINDOW_SECONDS = 180 * 60;

function parseRecordDate(value?: string | null): Date | null {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * A plan's place-energy family, mirroring the backend's ONE
 * indicator derivation (OpalCore.SocialFlow.NextPlan
 * .indicator_state) over the plan contract's own fields:
 *   live window open -> happening (a time fact: an active status,
 *     start_at at or before now, and end_at at or after now - or,
 *     with no end_at, started within the live window);
 *   the viewer's response is canonically pending -> action;
 *   status agreed -> ready;
 *   any other active status -> forming.
 * The past leg is familyOfStatus's (completed / expired). Statuses
 * outside the governed set fall back to their familyOfStatus
 * family, so the canon vocabulary (live / now / pending / aligned)
 * keeps its meaning here too. A stale active plan outside its
 * window keeps its status legs - the window is the only time leg,
 * exactly as in the derivation mirrored.
 */
export function placePlanFamily(
  plan: OpalPlanContract,
  now: Date,
): "happening" | "action" | "ready" | "forming" | "past" {
  const status = (plan.status ?? "").toLowerCase();
  if (familyOfStatus(status) === "past") return "past";
  if (status === "tentative" || status === "agreed" || status === "changed") {
    const start = parseRecordDate(plan.start_at);
    if (start && start.getTime() <= now.getTime()) {
      const end = parseRecordDate(plan.end_at);
      if (end) {
        if (end.getTime() >= now.getTime()) return "happening";
      } else if (now.getTime() - start.getTime() <= PLACE_LIVE_WINDOW_SECONDS * 1000) {
        return "happening";
      }
    }
    if (plan.viewer_state === "pending") return "action";
    if (status === "agreed") return "ready";
    return "forming";
  }
  const family = familyOfStatus(status);
  if (family === "happening" || family === "action" || family === "ready") return family;
  return "forming";
}

/** The place inputs of the visible-lives read, extracted from the
 *  raw room records with the SAME gate liveFeedFromRooms applies
 *  (an id, status exactly "live") and the same place precedence
 *  (the room's place_label, else its venue's display_name, else
 *  its venue's name). A room whose record carries no place
 *  contributes no place input - a place is never invented. */
export function livePlaceInputsFromRooms(
  rows: Array<{ live_room?: Record<string, unknown> } | Record<string, unknown>> | null | undefined,
): Array<{ liveId: string; placeLabel: string; title: string; hostName: string | null }> {
  const out: Array<{ liveId: string; placeLabel: string; title: string; hostName: string | null }> =
    [];
  for (const row of rows ?? []) {
    const room = (
      row && typeof row === "object" && "live_room" in row
        ? (row as { live_room: Record<string, unknown> }).live_room
        : row
    ) as Record<string, unknown> | undefined;
    if (!room || typeof room.id !== "string" || !room.id) continue;
    if (room.status !== "live") continue;
    const venue = (room.venue ?? {}) as Record<string, unknown>;
    const placeLabel =
      (typeof room.place_label === "string" && room.place_label) ||
      (typeof venue.display_name === "string" && venue.display_name) ||
      (typeof venue.name === "string" && venue.name) ||
      null;
    if (!placeLabel) continue;
    const hostName =
      (typeof room.host_display_name === "string" && room.host_display_name) ||
      (typeof room.host_handle === "string" && room.host_handle) ||
      null;
    const title =
      (typeof room.title === "string" && room.title) || `Live at ${placeLabel}`;
    out.push({ liveId: room.id, placeLabel, title, hostName });
  }
  return out;
}

export type PlaceMomentInput = {
  id: string;
  placeLabel: string | null;
  caption: string;
  authorName: string;
  authorUserId: string | null;
  mine: boolean;
};

export type PlaceLiveInput = {
  liveId: string;
  placeLabel: string;
  title: string;
  hostName: string | null;
};

type PlaceAccumulator = {
  key: string;
  name: string;
  order: number;
  livesHere: PlaceStoneProjection["livesHere"];
  happening: Array<{ plan: OpalPlanContract }>;
  coming: Array<{ plan: OpalPlanContract; family: "action" | "ready" | "forming" }>;
  memoryPlans: Array<{ plan: OpalPlanContract }>;
  momentsHere: PlaceStoneProjection["momentsHere"];
  momentInputs: PlaceMomentInput[];
};

function normalizePlaceKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

const PLACE_COMING_RANK: Record<"action" | "ready" | "forming", number> = {
  action: 0,
  ready: 1,
  forming: 2,
};

/**
 * THE place-energy computation (design record section 4). Pure:
 * same records in, same stones out, at any now the caller names.
 *
 * Signals and weights:
 *   S1 a live room at the place            weight 3
 *   S2 a plan in its live window there     weight 2
 *   S3 a plan awaiting the viewer there    weight 1
 *   S4 a ready (agreed) plan there         weight 1
 *   S5 a forming plan there                weight 1
 *   S6 a moment posted from there          weight 1 (memory)
 *   S7 a settled plan there                weight 1 (memory)
 * MEMORY CANNOT IGNITE: the combined S6 + S7 contribution caps
 * at 3, so a place carried only by its past can reach lit at
 * most. Levels: 1-2 ember, 3-5 lit, 6+ radiant. Family: the
 * strongest current signal in indicator precedence (happening,
 * then action, ready, forming; past only when nothing current
 * exists). Stones order by score, stable by first-seen order.
 */
export function placeStonesFromGraph(input: {
  plans: OpalPlanContract[];
  moments: PlaceMomentInput[];
  lives: PlaceLiveInput[];
  now: Date;
}): PlaceStoneProjection[] {
  const byKey = new Map<string, PlaceAccumulator>();
  let order = 0;
  const accFor = (rawName: string): PlaceAccumulator | null => {
    const name = rawName.trim().replace(/\s+/g, " ");
    if (!name) return null;
    const key = normalizePlaceKey(name);
    let acc = byKey.get(key);
    if (!acc) {
      acc = {
        key,
        name,
        order: order++,
        livesHere: [],
        happening: [],
        coming: [],
        memoryPlans: [],
        momentsHere: [],
        momentInputs: [],
      };
      byKey.set(key, acc);
    }
    return acc;
  };

  for (const live of input.lives) {
    const acc = accFor(live.placeLabel);
    if (!acc) continue;
    acc.livesHere.push({ liveId: live.liveId, title: live.title, hostName: live.hostName });
  }

  for (const plan of input.plans) {
    // A virtual plan's place is a room online, not a place: its
    // location string never groups, exactly as the seed law rules.
    if (plan.plan_type === "virtual" || plan.online === true) continue;
    const location = typeof plan.location === "string" ? plan.location : null;
    if (!location) continue;
    const acc = accFor(location);
    if (!acc) continue;
    const family = placePlanFamily(plan, input.now);
    if (family === "happening") acc.happening.push({ plan });
    else if (family === "past") acc.memoryPlans.push({ plan });
    else acc.coming.push({ plan, family });
  }

  for (const moment of input.moments) {
    if (!moment.placeLabel) continue;
    const acc = accFor(moment.placeLabel);
    if (!acc) continue;
    acc.momentsHere.push({
      momentId: moment.id,
      caption: moment.caption,
      authorName: moment.authorName,
    });
    acc.momentInputs.push(moment);
  }

  const stones: PlaceStoneProjection[] = [];
  for (const acc of byKey.values()) {
    const memoryRaw = acc.momentsHere.length + acc.memoryPlans.length;
    if (
      acc.livesHere.length === 0 &&
      acc.happening.length === 0 &&
      acc.coming.length === 0 &&
      memoryRaw === 0
    ) {
      continue;
    }
    const memoryWeight = Math.min(memoryRaw, 3);
    const score =
      acc.livesHere.length * 3 +
      acc.happening.length * 2 +
      acc.coming.length * 1 +
      memoryWeight;
    const energyLevel: PlaceStoneProjection["energyLevel"] =
      score >= 6 ? "radiant" : score >= 3 ? "lit" : "ember";
    const comingSorted = [...acc.coming].sort(
      (a, b) => PLACE_COMING_RANK[a.family] - PLACE_COMING_RANK[b.family],
    );
    const energyFamily: PlaceStoneProjection["energyFamily"] =
      acc.livesHere.length > 0 || acc.happening.length > 0
        ? "happening"
        : comingSorted.length > 0
          ? comingSorted[0].family
          : "past";

    const firstLive = acc.livesHere[0];
    const firstHappening = acc.happening[0];
    const firstComing = comingSorted[0];
    const energyLine =
      acc.livesHere.length > 0 && acc.happening.length > 0
        ? "Live now, and a plan is happening here."
        : acc.livesHere.length > 0
          ? "Live here now."
          : acc.happening.length > 0
            ? "Happening here now."
            : firstComing?.family === "action"
              ? "A plan here is waiting on you."
              : firstComing?.family === "ready"
                ? "A plan is ready to happen here."
                : firstComing
                  ? "A plan is forming here."
                  : acc.momentsHere.length > 0 && acc.memoryPlans.length > 0
                    ? "Your people have moments and plans here."
                    : acc.momentsHere.length > 0
                      ? "Your people have posted from here."
                      : "Your people have been here.";

    const signalLines: string[] = [];
    if (firstHappening) signalLines.push(`${firstHappening.plan.title} is happening now.`);
    if (firstLive) {
      signalLines.push(
        firstLive.hostName ? `${firstLive.hostName} is live here.` : "A live is on here.",
      );
    }
    if (firstComing) {
      signalLines.push(
        `${firstComing.plan.title} - ${LABEL_BY_FAMILY[firstComing.family]}.`,
      );
    }
    if (signalLines.length < 3) {
      if (acc.memoryPlans.length > 0) {
        signalLines.push(`${acc.memoryPlans[0].plan.title} happened here.`);
      } else if (acc.momentsHere.length > 0) {
        signalLines.push(`${acc.momentsHere[0].authorName} posted from here.`);
      }
    }

    // The door out: the place's strongest lawful seed source -
    // a current plan, else a settled plan (its "again"), else a
    // moment. A live-only place carries none (declared D-P4).
    let startSeed: PlaceStoneProjection["startSeed"] = null;
    const seedPlan =
      acc.happening.length > 0
        ? { plan: acc.happening[0].plan, family: "happening" as const }
        : comingSorted.length > 0
          ? comingSorted[0]
          : acc.memoryPlans.length > 0
            ? { plan: acc.memoryPlans[0].plan, family: "past" as const }
            : null;
    if (seedPlan) {
      const plan = seedPlan.plan;
      const source: SeedSource = {
        kind: "plan",
        planId: plan.id,
        title: plan.title,
        location: plan.location?.trim() ? plan.location.trim() : null,
        placeLat: typeof plan.place_lat === "number" ? plan.place_lat : null,
        placeLon: typeof plan.place_lon === "number" ? plan.place_lon : null,
        planType: plan.plan_type ?? null,
        viewerState: plan.viewer_state ?? null,
        organizerUserId: plan.created_by_user_id ?? null,
      };
      startSeed = seedCreateFor(source, seedPlan.family === "past" ? "again" : "my-people");
    } else if (acc.momentInputs.length > 0) {
      const moment = acc.momentInputs[0];
      const source: SeedSource = {
        kind: "moment",
        momentId: moment.id,
        authorUserId: moment.authorUserId,
        authorName: moment.authorName,
        caption: moment.caption === "Memory" ? "" : moment.caption,
        placeLabel: acc.name,
        mine: moment.mine,
      };
      startSeed = seedCreateFor(source, "my-people");
    }

    stones.push({
      key: acc.key,
      name: acc.name,
      energyScore: score,
      energyLevel,
      energyFamily,
      energyLine,
      signalLines: signalLines.slice(0, 3),
      livesHere: acc.livesHere,
      happeningPlans: acc.happening.map(({ plan }) => ({
        planId: plan.id,
        title: plan.title,
        whenLine: planWhenLine(plan),
      })),
      comingPlans: comingSorted.map(({ plan, family }) => ({
        planId: plan.id,
        title: plan.title,
        whenLine: planWhenLine(plan),
        stateLabel: LABEL_BY_FAMILY[family],
        stateFamily: family,
        attendanceLine:
          typeof plan.going_count === "number" && typeof plan.total_count === "number"
            ? `${plan.going_count} of ${plan.total_count} going`
            : null,
      })),
      memoryPlans: acc.memoryPlans.map(({ plan }) => ({
        planId: plan.id,
        title: plan.title,
        whenLine: planWhenLine(plan),
      })),
      momentsHere: acc.momentsHere,
      startSeed,
    });
  }

  return stones
    .map((stone, index) => ({ stone, index }))
    .sort((a, b) => b.stone.energyScore - a.stone.energyScore || a.index - b.index)
    .map(({ stone }) => stone);
}

/* ------------------------------------------------------------------ */
/* Repair #23 (WS-23-5) - PLACE SIGNAL, FELT                           */
/*                                                                     */
/* The server tier (POST /places/signals) is the place stone's         */
/* warmth input. The reconciliation with the R22 slice is exact:       */
/* the tier sets the stone's warmth FLOOR in light, the R22 plan-      */
/* state fire keeps its color and its own level, and the stone         */
/* renders the warmer of the two as glow intensity - so a server       */
/* tier can only add felt warmth the viewer's graph earned, and a      */
/* quiet tier never dims a plan state that is really happening.        */
/* Zero numerals, zero "trending" labels, zero leaderboard: the        */
/* tier is light only, here and on the glass.                          */
/* ------------------------------------------------------------------ */

export type PlaceWarmthLevel = "cold" | "ember" | "lit" | "radiant";

const PLACE_WARMTH_RANK: Record<PlaceWarmthLevel, number> = {
  cold: 0,
  ember: 1,
  lit: 2,
  radiant: 3,
};

const TIER_WARMTH: Record<
  import("../../api/productClient").PlaceSignalTier,
  PlaceWarmthLevel
> = {
  quiet: "cold",
  stirring: "ember",
  warm: "lit",
  alive: "radiant",
};

const R22_LEVEL_WARMTH: Record<PlaceStoneProjection["energyLevel"], PlaceWarmthLevel> = {
  ember: "ember",
  lit: "lit",
  radiant: "radiant",
};

/** The stone's rendered warmth: the warmer of the server tier's
 *  warmth and the R22 energy level, as ONE light level. A stone
 *  with no server tier yet rests on its R22 level alone. */
export function placeWarmthLevel(place: PlaceStoneProjection): PlaceWarmthLevel {
  const fromR22 = R22_LEVEL_WARMTH[place.energyLevel];
  if (!place.signalTier) return fromR22;
  const fromTier = TIER_WARMTH[place.signalTier];
  return PLACE_WARMTH_RANK[fromTier] >= PLACE_WARMTH_RANK[fromR22] ? fromTier : fromR22;
}

/** Fold the server place signals onto the R22 stones, matched
 *  by the builder's own normalized key. A signal for a place
 *  with no stone changes nothing (the stone set is the R22
 *  builder's truth); a stone with no signal keeps its R22
 *  reading untouched. Pure - the adapter's one merge point. */
export function withPlaceSignals(
  stones: PlaceStoneProjection[],
  signals: Array<{ place: string; tier: import("../../api/productClient").PlaceSignalTier; nearby: boolean }>,
): PlaceStoneProjection[] {
  const byKey = new Map(signals.map((s) => [normalizePlaceKey(s.place), s]));
  return stones.map((stone) => {
    const signal = byKey.get(stone.key);
    if (!signal) return stone;
    return { ...stone, signalTier: signal.tier, signalNearby: signal.nearby === true };
  });
}

/** State rank for Home composition (W9): what is happening now and
 *  what needs the user lead; past settles last. This ORDERS finished
 *  cards only - it never changes a card's state family or label. */
const HOME_FAMILY_RANK: Record<PlanStateFamilyC2, number> = {
  happening: 0,
  action: 1,
  ready: 2,
  forming: 3,
  past: 4,
};

/**
 * I2 etiquette wiring - the card's limbo input, mapped from the plan
 * contract's etiquette projection (the backend's one projection,
 * carried per-viewer on plan_payload). This adapter translates the
 * wire shape (snake_case) into the card shape (camelCase) and
 * nothing else: state, treatment, pattern channel, the remaining
 * fraction and the viewer's own finished copy all arrive finished.
 * No etiquette fact, or a limbo that is not in the limbo state, maps
 * to null and the card renders no limbo treatment.
 */
export function limboFromPlan(plan: OpalPlanContract): PlanCardLimboC2 | null {
  const etiquette = plan.etiquette;
  const limbo = etiquette?.limbo;
  if (!etiquette || !limbo || limbo.state !== "limbo") return null;
  return {
    state: limbo.state,
    treatment: limbo.treatment,
    patternChannel: limbo.pattern_channel,
    windowFractionRemaining: limbo.window_fraction_remaining,
    // R20 F-16: the machinery's finished remaining-window line rides
    // the card verbatim - the card renders words, never a countdown
    // it computed from the fraction. Absent on older payloads: the
    // key is omitted rather than nulled, keeping the card shape the
    // I2 pins established.
    ...(limbo.remaining_window_text
      ? { remainingWindowText: limbo.remaining_window_text }
      : {}),
    copy: limbo.copy,
    viewerRole: etiquette.viewer_role,
  };
}

export function cardFromPlan(plan: OpalPlanContract): PlanCardC2Input & { id: string } {
  const family = familyOfStatus(plan.status);
  const attendanceLine =
    typeof plan.going_count === "number" && typeof plan.total_count === "number"
      ? `${plan.going_count} of ${plan.total_count} going`
      : null;
  return {
    id: plan.id,
    stateFamily: family,
    stateLabel:
      family === "forming" && (plan.status ?? "").toLowerCase() === "idea"
        ? "Idea"
        : LABEL_BY_FAMILY[family],
    title: plan.title,
    // R20 F-14: the ONE shared time-range rendering (density.ts) -
    // a multi-day plan shows start AND end on every card built here
    // (Graphs, Home, deck, detail header all read this card).
    whenLine: planWhenLine(plan),
    whereLine: plan.location?.trim() ? plan.location : null,
    attendanceLine,
    primaryActionLabel: null,
    // I2: real cards now carry the limbo treatment from the contract.
    limbo: limboFromPlan(plan),
    // Repair #21 (W-5a): the etiquette projection rides the card
    // verbatim, so the fork-answer control can mount where the fork
    // presentation (the limbo block above) already lives - on the
    // Graphs card and in the plan detail alike.
    etiquette: plan.etiquette ?? null,
  };
}

function missingSlot(plan: OpalPlanContract): { label: string; slotKind: string } | null {
  if (!plan.time_label?.trim()) return { label: "Pick a day", slotKind: "time" };
  if (!plan.location?.trim()) return { label: "Add a place", slotKind: "place" };
  return null;
}

/**
 * The PlanTransition :cancel gate's legal source statuses (backend
 * plan_transition.ex): cancel is legal only from tentative / agreed /
 * changed. Cancelled is already terminal; completed / expired are
 * refused as illegal transitions.
 */
const CANCELLABLE_PLAN_STATUSES: ReadonlySet<string> = new Set([
  "tentative",
  "agreed",
  "changed",
]);

/**
 * Repair #18 - "Drop it" derivation. A card is droppable only when
 * BOTH facts the cancel route will check are already knowable from
 * the plans contract:
 *  - authority: the list payload stamps `can_edit` from the backend's
 *    plan_lead?/2 - the exact function SocialFlow.cancel_plan/1
 *    enforces (lead / co_lead, creator fallback where no lead row
 *    exists). `can_edit === true` IS the viewer's cancel authority,
 *    not a proxy for it.
 *  - state: the plan's status is one the :cancel gate accepts.
 * When either fact is absent from the contract (a payload without the
 * can_edit stamp, an unknown status), the control stays absent rather
 * than rendering a guess the server would refuse.
 */
export function planDroppable(plan: OpalPlanContract): boolean {
  return (
    plan.can_edit === true &&
    CANCELLABLE_PLAN_STATUSES.has((plan.status ?? "").toLowerCase())
  );
}

export function graphListFromPlans(
  plans: OpalPlanContract[],
  now: Date = new Date(),
): GraphListProjection {
  // R19 W7: private graphs are separated HERE, at the one adapter -
  // they never enter a group or a lens count, so no lens (including
  // Past) can surface them outside the gated Private area.
  const privateCards = plans
    .filter((plan) => plan.is_private === true)
    .map((plan) => {
      const card = cardFromPlan(plan);
      const family = familyOfStatus(plan.status);
      return {
        ...card,
        completionAction: family === "forming" ? missingSlot(plan) : null,
        droppable: planDroppable(plan),
        isPrivate: true as const,
      };
    });
  const visiblePlans = plans.filter((plan) => plan.is_private !== true);
  // Polish P11 invitation hygiene: declined / expired invitations
  // SETTLE here, at the projection - they leave every actionable
  // group below and ride only as summarized lines in the viewer's
  // own past area (settledInvitations). Nothing else consumes them,
  // so no decline is announced on anyone else's surface.
  // R20 F-12: each settled entry now also carries the plan's own
  // CARD (past family, "Settled") - list surfaces render ONE settled
  // summary line for all of them (density.settledSummaryLine), and
  // the cards appear only when the viewer expands that summary by
  // intent. The per-plan settled line itself lives on the detail
  // projection (detailFromPlan.settledLine), never as a list row.
  const settledInvitations = visiblePlans
    .map((plan) => {
      const settled = settledInvitationForPlan(plan);
      if (!settled) return null;
      return {
        ...settled,
        card: {
          ...cardFromPlan(plan),
          stateFamily: "past" as const,
          stateLabel: "Settled",
        },
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const livePlans = visiblePlans.filter((plan) => settledKindForPlan(plan) === null);
  const cards = livePlans.map((plan) => {
    const base = cardFromPlan(plan);
    const card = {
      ...base,
      peopleLine: plan.who_label?.trim() ? plan.who_label.trim() : null,
    };
    const family = familyOfStatus(plan.status);
    const completion = family === "forming" ? missingSlot(plan) : null;
    // Drop it is wired: confirming calls POST /opal/plans/:id/cancel
    // through cancelOpalPlan (see C2Shell's dropPlan handler) and the
    // list re-reads from the server, whose list excludes cancelled
    // plans. droppable is derived per plan by planDroppable above -
    // a card the route would refuse never renders the control.
    return {
      plan,
      card: {
        ...card,
        completionAction: completion,
        droppable: planDroppable(plan),
        presence: presenceForPlan(plan, now),
        temperature: invitationTemperature(plan, now),
      },
    };
  });
  const isFar = (c: (typeof cards)[number]) =>
    c.card.presence?.band === "far" && c.card.stateFamily !== "action";
  const groups: GraphListProjection["groups"] = [];
  const push = (
    id: string,
    kind: GraphListProjection["groups"][number]["kind"],
    title: string,
    rows: typeof cards,
  ) => {
    if (rows.length > 0) groups.push({ id, kind, title, cards: rows.map((r) => r.card) });
  };
  // Dense-list constitution ordering (P11-3): happening and
  // needs-you first, then what is taking shape, then later, then
  // the quiet horizon. Past is not a group at all - it is pills.
  push(
    "action-group",
    "needs-detail",
    "Needs your answer",
    cards.filter((c) => c.card.stateFamily === "action"),
  );
  push(
    "coming-up",
    "coming-up",
    "Coming up",
    cards.filter(
      (c) =>
        (c.card.stateFamily === "ready" || c.card.stateFamily === "happening") && !isFar(c),
    ),
  );
  push(
    "needs-detail",
    "needs-detail",
    "Needs a day or a detail",
    cards.filter((c) => c.card.completionAction && !isFar(c)),
  );
  push(
    "someday",
    "someday",
    "Someday",
    cards.filter(
      (c) => c.card.stateFamily === "forming" && !c.card.completionAction && !isFar(c),
    ),
  );
  // P12 far field: far plans summarize into the horizon band - they
  // never compete with tonight. Action-family far plans stay in
  // Needs your answer above (a decision is a milestone, P12-4).
  push(
    "horizon",
    "horizon",
    "On the horizon",
    cards.filter((c) => isFar(c)),
  );
  const pastEntries = cards
    .filter((c) => c.card.stateFamily === "past")
    .map((c) => ({ card: c.card, date: pastDateForPlan(c.plan) }));
  const pastPills = pastPillsFromEntries(pastEntries, now);
  const count = (f: (c: (typeof cards)[number]) => boolean) => cards.filter(f).length;
  return {
    privateCards,
    groups,
    pastPills,
    settledInvitations,
    lensCounts: {
      all: cards.length,
      action: count((c) => c.card.stateFamily === "action" || c.card.stateFamily === "forming"),
      ready: count((c) => c.card.stateFamily === "ready" || c.card.stateFamily === "happening"),
      past: pastEntries.length + settledInvitations.length,
    },
    timelineAvailable: cards.some((c) => Boolean(c.plan.time_label?.trim())),
  };
}

export function detailFromPlan(
  plan: OpalPlanContract,
  origin: GraphDetailProjection["origin"],
  viewerUserId?: string | null,
): GraphDetailProjection {
  const card = cardFromPlan(plan);
  return {
    id: plan.id,
    title: plan.title,
    card,
    // R20 F-12: a plan this viewer settled (declined / expired)
    // carries its settled line HERE, in its own detail - the one
    // surface where the line belongs. List surfaces never render it.
    settledLine: settledInvitationForPlan(plan)?.line ?? null,
    attendanceLine: card.attendanceLine ?? null,
    // B2 wiring: the completion record rides the detail projection
    // verbatim from the plan contract; the detail surface renders
    // the food panel only when a food step is present in it.
    completion: plan.completion ?? null,
    meetingLink: plan.meeting_link ?? null,
    viewerUserId: viewerUserId ?? null,
    whenLine: card.whenLine,
    // Hunt-fix B-16: a virtual plan renders as virtual — never as a
    // physical place. The C1 adapter already carries this contract;
    // the join handoff renders in the detail from meetingLink below.
    where:
      plan.plan_type === "virtual" || plan.online === true
        ? { label: plan.location?.trim() || "Online", kind: "virtual", handoffLabel: null }
        : plan.location?.trim()
          ? { label: plan.location, kind: "place", handoffLabel: null }
          : null,
    // The plans contract carries counts, not participant rosters; the
    // Who section is omitted cleanly until the Division A detail
    // projection lands (named gap, spec section 8.2 omission rule).
    who: [],
    isPrivate: plan.is_private === true,
    nextAction: null,
    activity: [],
    history: [],
    // P12 spine: from the plan's real completion record + its
    // missing-slot fact. detailWithHistory re-projects it with the
    // Who rows when the history read lands.
    spine: spineFromPlan({
      plan,
      missingSlotLabel:
        familyOfStatus(plan.status) === "forming" ? (missingSlot(plan)?.label ?? null) : null,
    }),
    conversationId: plan.conversation_id ?? null,
    // Repair #20 (F-15): a settled/past plan can be repeated. The
    // carried facts come from the plan's own record; the parties are
    // folded in by detailWithHistory from the Who rows, and the new
    // time is never carried (chosen in the repeat flow).
    repeatable: familyOfStatus(plan.status) === "past",
    repeat: {
      participantUserIds: [],
      location:
        plan.plan_type === "virtual" || plan.online === true
          ? null
          : (plan.location?.trim() ?? null),
      placeLat: typeof plan.place_lat === "number" ? plan.place_lat : null,
      placeLon: typeof plan.place_lon === "number" ? plan.place_lon : null,
      planType: plan.plan_type ?? null,
    },
    origin,
  };
}

/**
 * Repair #18 adoption wave 1 (ST-G) - fold the plan-history
 * projection (the ONE server derivation: history lines + Who list +
 * counts) into a detail built from the plan contract. The detail's
 * Who and History sections render only what this projection carries;
 * the counts the history endpoint serves are the same
 * JourneyAuthority counts the card renders, so they cannot disagree.
 */
export function detailWithHistory(
  detail: GraphDetailProjection,
  history: import("../../api/productClient").PlanHistoryContract,
  tieByUserId?: ReadonlyMap<string, string | null>,
): GraphDetailProjection {
  return {
    ...detail,
    who: history.who.map((person, i) => ({
      userId: person.user_id,
      name: person.name,
      avatar: avatarOf(person.name, i + 1),
      responseLabel: person.response_label,
      // W24 (DL-06): the viewer's tie to this person, from the
      // viewer's relationship rows — null when unset, and the
      // roster renders nothing for it.
      relationshipLabel: tieByUserId?.get(person.user_id) ?? null,
      // R19 W7: the finished location line rides verbatim - the
      // surface never derives a position or distance itself.
      locationLabel: person.location_label ?? null,
      locationState: person.location_state ?? null,
    })),
    history: history.history.map((row) => ({ line: row.line })),
    // P12: the spine's answers item needs the real Who rows - it is
    // re-projected here, from the same history contract, never from
    // a second source. The plan record itself is not re-read; the
    // completion steps ride the base detail's spine, so only the
    // answers item is folded in when someone is still waiting.
    // Repair #20 (F-13): the same Who rows prove whether the
    // plan-scoped Opal chat can be scoped (another participant
    // exists), so the plan-chat spine actions fold in here too.
    spine: foldSpineChatActions(
      foldSpineAnswers(
        detail.spine,
        history.who.map((w) => ({ name: w.name, responseLabel: w.response_label })),
      ),
      {
        chatAvailable: history.who.some(
          (w) => w.user_id && w.user_id !== detail.viewerUserId,
        ),
      },
    ),
    // Repair #20 (F-15): the repeat's parties are the plan's real
    // Who rows (everyone but the viewer - the graph-create path
    // makes the repeater the new plan's creator and filters a
    // self-entry server-side as well).
    repeat: detail.repeat
      ? {
          ...detail.repeat,
          participantUserIds: history.who
            .map((w) => w.user_id)
            .filter((id): id is string => Boolean(id) && id !== detail.viewerUserId),
        }
      : detail.repeat,
    // Cluster G (P10c): the leave-by projection rides verbatim -
    // the detail renders the backend's finished line and urgency
    // and derives no time or distance itself.
    leaveBy: history.leave_by ?? null,
    attendanceLine:
      typeof history.counts.going_count === "number" &&
      typeof history.counts.total_count === "number"
        ? `${history.counts.going_count} of ${history.counts.total_count} going`
        : detail.attendanceLine,
  };
}

/**
 * R21 L-1 - THE GREETING IS TRUE (founder law, 2026-10-20).
 * The hour that picks the greeting word is the VIEWER's own hour:
 * the instant is read in the viewer's timezone, never in UTC and
 * never in a server or seed timezone. With no explicit timezone the
 * Intl default is the browser's local timezone - the viewer's.
 * An invalid timezone falls back to that same browser-local hour.
 * `now` / `timeZone` are the pinned-clock seam the L-1 tests drive:
 * the SAME instant must render the morning word under one viewer
 * timezone and the evening word under another.
 */
export function hourInViewerTimeZone(now: Date, timeZone?: string): number {
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "numeric",
        hourCycle: "h23",
      }).formatToParts(now);
      const hour = Number(parts.find((p) => p.type === "hour")?.value);
      if (Number.isFinite(hour)) return hour % 24;
    } catch {
      // fall through to the browser-local hour
    }
  }
  return now.getHours();
}

export function greetingWordForViewer(now: Date, timeZone?: string): string {
  const hour = hourInViewerTimeZone(now, timeZone);
  return hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";
}

export function openingFromPlans(
  plans: OpalPlanContract[],
  ownName: string,
  opts?: { now?: Date; timeZone?: string },
): CenterOpeningProjection {
  // L-1: ownName is the signed-in viewer's own name - the only
  // caller (C2Shell) passes session.display_name for the viewer's
  // session, never a plan counterparty or payload name.
  const greeting = greetingWordForViewer(opts?.now ?? new Date(), opts?.timeZone);
  // P11 settle: a plan this viewer declined (or that expired) never
  // asks for attention on the deck - it has settled into history.
  const cards = plans
    .filter((plan) => settledKindForPlan(plan) === null)
    .map((plan) => ({ plan, card: cardFromPlan(plan) }));
  const needsYou = cards
    .filter((c) => c.card.stateFamily === "action")
    .map((c) => c.card);
  const nextRow =
    cards.find((c) => c.card.stateFamily === "happening") ??
    cards.find((c) => c.card.stateFamily === "ready");
  const forming = cards
    .filter((c) => c.card.stateFamily === "forming")
    .map((c) => ({ ...c.card, completionAction: missingSlot(c.plan) }));
  return {
    greeting: ownName ? `${greeting.replace(/\.$/, "")}, ${ownName.split(" ")[0]}.` : greeting,
    nudgeLine: null,
    presence: "idle",
    celebrateOnce: false,
    needsYou,
    next: nextRow
      ? {
          id: nextRow.card.id,
          timeLabel: nextRow.card.whenLine,
          title: nextRow.card.title,
          line: [nextRow.card.whereLine, nextRow.card.attendanceLine]
            .filter(Boolean)
            .join(" - "),
          card: nextRow.card,
        }
      : null,
    comingUp: cards
      .filter((c) => c.card.stateFamily === "ready" && c.card.id !== nextRow?.card.id)
      .map((c) => c.card),
    forming,
  };
}

/**
 * Hunt-fix B-12: plan loading returns its failure as a leg of the
 * result. The previous loadPlans swallowed every failure into [],
 * so an outage painted as a brand-new empty account on Center,
 * Graphs, Home, and Chats — pixel-identical. Callers render the
 * error state with a working retry; empty only ever means empty.
 */
export async function loadPlansResult(
  bearer?: string,
): Promise<{ plans: OpalPlanContract[]; error: string | null }> {
  try {
    const res = await listOpalPlans(bearer);
    return { plans: res.plans ?? [], error: null };
  } catch {
    return {
      plans: [],
      error: "Your plans did not load. Check your connection and try again.",
    };
  }
}

export function shellFromSession(
  session: ProductSession | null,
  route: ShellProjection["route"],
): ShellProjection {
  const name = session?.display_name ?? "You";
  return {
    route,
    dockUnread: 0,
    ownAvatar: avatarOf(name),
    ownName: name,
    centerPresence: "idle",
  };
}

export async function homeFromSession(
  session: ProductSession | null,
  bearer?: string,
  /** R22 (WS-3): expiry is judged at this instant — a story
   *  whose server expires_at has passed leaves the rail at
   *  compose time, not just at the server's next list. Tests
   *  pass an explicit instant; the app omits it (now). */
  now: Date = new Date(),
): Promise<HomeProjection> {
  const name = session?.display_name ?? "You";
  const self = avatarOf(name);
  let stories: HomeProjection["rail"]["stories"] = [];
  // Repair #19 W20 (JA-11): the viewer's OWN story record feeds
  // the self cell — it never ALSO renders as a named rail cell
  // (the rail showed "Your story · Add" AND the viewer's own
  // seeded story as a separate named circle). One entry per
  // person: multiple records by one author collapse into one
  // cell carrying their count.
  let ownStory: {
    storyCount: number;
    mediaUrl: string | null;
    caption: string | null;
    items: import("./projections").StoryPlayItemProjection[];
  } | null = null;
  try {
    const res = await listTemporaryStories(bearer);
    const records = (res.stories ?? [])
      .map((record, i) => {
        const r = record as Record<string, unknown>;
        const personName =
          (typeof r.author_name === "string" && r.author_name) ||
          (typeof r.user_name === "string" && r.user_name) ||
          (typeof r.display_name === "string" && r.display_name) ||
          null;
        if (!personName || typeof r.id !== "string") return null;
        // R22 (WS-3): expiry is server truth carried on the
        // record itself — a story past its expires_at leaves
        // the rail here even if a stale list still carried it.
        const expiresAt = typeof r.expires_at === "string" ? r.expires_at : null;
        if (isStoryExpired(expiresAt, now)) return null;
        // Hunt-fix B-10: the rail carries the story's real media, so
        // the viewer has something true to play. A record with no
        // renderable media carries none — and its cell never opens
        // the empty stage the old viewer painted.
        const rawMedia = typeof r.media_ref === "string" ? r.media_ref : null;
        const mediaUrl =
          rawMedia &&
          (rawMedia.startsWith("/") || rawMedia.startsWith("data:") || rawMedia.startsWith("http"))
            ? rawMedia
            : null;
        const caption = typeof r.caption === "string" ? r.caption : null;
        return {
          id: r.id,
          authorId: typeof r.author_user_id === "string" ? r.author_user_id : null,
          personName,
          avatar: avatarOf(personName, i + 1),
          seen: Boolean(r.seen),
          ringKind: r.seen ? ("seen" as const) : ("unseen" as const),
          storyCount: 1,
          mediaUrl,
          caption,
          expiresAt,
          // R22 (WS-3): the playable unit the viewer dwells on.
          // Only records with renderable media can be played.
          items: mediaUrl
            ? [{ id: r.id, mediaUrl, caption, expiresAt }]
            : ([] as import("./projections").StoryPlayItemProjection[]),
        };
      })
      .filter((s): s is NonNullable<typeof s> => Boolean(s));

    const mine = records.filter(
      (s) => session?.user_id && s.authorId === session.user_id,
    );
    if (mine.length > 0) {
      const ownItems = mine.flatMap((s) => s.items);
      ownStory = {
        storyCount: mine.length,
        mediaUrl: ownItems[0]?.mediaUrl ?? mine[0].mediaUrl,
        caption: ownItems[0]?.caption ?? mine[0].caption,
        items: ownItems,
      };
    }

    const byPerson = new Map<string, (typeof records)[number]>();
    for (const s of records) {
      if (session?.user_id && s.authorId === session.user_id) continue;
      const key = s.authorId ?? s.personName;
      const existing = byPerson.get(key);
      if (existing) {
        existing.storyCount += 1;
        existing.seen = existing.seen && s.seen;
        existing.ringKind = existing.seen ? "seen" : "unseen";
        existing.items.push(...s.items);
        // The cell's face is the first PLAYABLE story, so a
        // media-less first record never blanks a playable cell.
        if (!existing.mediaUrl && s.mediaUrl) {
          existing.mediaUrl = s.mediaUrl;
          existing.caption = s.caption;
        }
      } else {
        byPerson.set(key, { ...s, items: [...s.items] });
      }
    }
    stories = [...byPerson.values()].map((s) => ({ ...s, personId: s.authorId }));
  } catch {
    stories = [];
    ownStory = null;
  }
  const plansResult = await loadPlansResult(bearer);
  // R19 W7: private graphs never enter the Home feed either.
  const plans = plansResult.plans.filter(
    (p) => p.is_private !== true && settledKindForPlan(p) === null,
  );
  // Hunt-fix B-11: the feed reads back what the user and their people
  // actually posted (fetchHomeFeed moments), with plan cards as their
  // own kind. The previous build composed the feed from the user's
  // own plans only, so a just-published post could never appear —
  // success with no read-back, under "your people move" copy.
  let moments: HomeProjection["feed"] = [];
  let feedError: string | null = plansResult.error;
  try {
    const feedRes = await fetchHomeFeed({ limit: 20, bearer });
    moments = (feedRes.objects ?? [])
      .filter((o) => o.object_type === "memory" || !o.object_type)
      .map((o, i) => {
        const actor = (o.actor ?? {}) as Record<string, unknown>;
        const authorName =
          typeof actor.display_name === "string" && actor.display_name
            ? actor.display_name
            : "Someone";
        // W9 imagery path (moments): the feed record's own
        // media_ref IS the moment's image - the backend feed card
        // builds it from the moment's media_urls, else its media
        // endpoint URL (HomeFeed.to_feed_card). Provenance:
        // "moment.media_ref". Absent/not URL-shaped = no photo,
        // and the card renders its designed monogram treatment.
        const rawMedia = typeof o.media_ref === "string" ? o.media_ref : null;
        const photoUrl =
          rawMedia &&
          (rawMedia.startsWith("/") || rawMedia.startsWith("data:") || rawMedia.startsWith("http"))
            ? rawMedia
            : null;
        return {
          kind: "memory" as const,
          id: String(o.id),
          photoUrl,
          photoProvenance: photoUrl ? "moment.media_ref" : null,
          contextLine:
            typeof o.caption === "string" && o.caption ? o.caption : "Memory",
          authorLine: authorName,
          authorName,
          // Repair #21 (W-13 / I-1): the author's id rides the feed
          // record's actor - the reply door and the seed doors
          // address the author by id, never by display name. The
          // like count stays an internal warmth input for the
          // counts-free light presentation (I-2): it is never
          // rendered as a numeral again.
          authorUserId: typeof actor.user_id === "string" ? actor.user_id : null,
          mine: Boolean(
            session?.user_id && typeof actor.user_id === "string" && actor.user_id === session.user_id,
          ),
          placeLabel: typeof o.place_label === "string" && o.place_label ? o.place_label : null,
          authorAvatar: avatarOf(authorName, i + 1),
          // The backend feed card carries engagement inside its
          // engagement_summary object (HomeFeed.to_feed_card); the
          // flat fields are read as a fallback for older payloads.
          // (The pre-R21 adapter read only the flat fields, so a
          // served moment's warmth always arrived as 0/unlit -
          // found by the W-13 journey read-back, fixed here.)
          likeCount:
            typeof (o.engagement_summary as { like_count?: unknown } | undefined)?.like_count ===
            "number"
              ? ((o.engagement_summary as { like_count: number }).like_count as number)
              : typeof o.like_count === "number"
                ? o.like_count
                : 0,
          viewerLiked:
            (o.engagement_summary as { viewer_liked?: unknown } | undefined)?.viewer_liked ===
              true || o.viewer_liked === true,
          // Repair #23 (WS-23-1): the same engagement_summary
          // carries the repost / save / comment truth (backend
          // HomeFeed.to_feed_card); the flat fields stay the
          // fallback for older payloads, exactly as for light.
          viewerReposted:
            (o.engagement_summary as { viewer_reposted?: unknown } | undefined)
              ?.viewer_reposted === true || o.viewer_reposted === true,
          repostCount:
            typeof (o.engagement_summary as { repost_count?: unknown } | undefined)
              ?.repost_count === "number"
              ? ((o.engagement_summary as { repost_count: number }).repost_count as number)
              : typeof o.repost_count === "number"
                ? o.repost_count
                : 0,
          viewerSaved:
            (o.engagement_summary as { viewer_saved?: unknown } | undefined)?.viewer_saved ===
              true || o.viewer_saved === true,
          commentCount:
            typeof (o.engagement_summary as { comment_count?: unknown } | undefined)
              ?.comment_count === "number"
              ? ((o.engagement_summary as { comment_count: number }).comment_count as number)
              : typeof o.comment_count === "number"
                ? o.comment_count
                : 0,
        };
      })
      .filter((m) => m.id && m.id !== "undefined");
  } catch {
    feedError = feedError ?? "Your feed did not load. Check your connection and try again.";
  }
  // W9 LIVE: the visible-lives read is its own leg. A failed read
  // means no live cards (honestly absent) - it never fails the feed
  // and never paints a live that was not read back.
  let lives: HomeProjection["feed"] = [];
  let livePlaceInputs: PlaceLiveInput[] = [];
  try {
    const livesRes = await getLivesVisible(bearer);
    lives = liveFeedFromRooms(livesRes.lives ?? []);
    // Repair #22 (WS-5): the same rooms feed place energy - the
    // place inputs are extracted from the raw records with the
    // same gate, never from the composed card's title.
    livePlaceInputs = livePlaceInputsFromRooms(livesRes.lives ?? []);
  } catch {
    lives = [];
    livePlaceInputs = [];
  }
  // W9 composition (state variety): the old composition put every
  // moment first and sliced plans off the end, so a moment-heavy
  // feed filtered Home into ONE bucket and plans - with all their
  // states - could vanish entirely. Now: live first (it is true
  // only inside its window), then plans ordered by state rank
  // (stable within a family; states are never relabeled), then
  // moments fill the remaining room. The cap is unchanged (14).
  const planCards: HomeProjection["feed"] = plans
    .map((plan, index) => ({ plan, index }))
    .sort(
      (a, b) =>
        HOME_FAMILY_RANK[familyOfStatus(a.plan.status)] -
          HOME_FAMILY_RANK[familyOfStatus(b.plan.status)] ||
        a.index - b.index,
    )
    .slice(0, 10)
    .map(({ plan }) => ({
      kind: "plan" as const,
      id: plan.id,
      card: homeCardFromPlan(plan),
      // Repair #21 (I-1): the seed facts the four doors may carry,
      // from the plan's own record. A virtual plan's location is
      // not a place, so its seed carries none (the repeat flow's
      // own guard, applied at the seed).
      seed: {
        title: plan.title,
        location:
          plan.plan_type === "virtual" || plan.online === true
            ? null
            : (plan.location?.trim() ?? null),
        placeLat: typeof plan.place_lat === "number" ? plan.place_lat : null,
        placeLon: typeof plan.place_lon === "number" ? plan.place_lon : null,
        planType: plan.plan_type ?? null,
        viewerState: plan.viewer_state ?? null,
        organizerUserId: plan.created_by_user_id ?? null,
      },
    }));
  // Repair #21 (W-9 rebuild) - OCCASIONS + TRIVIA legs. Each read
  // is its own leg with honest absence: a failed celebrations read
  // means no occasions section and no celebration questions; a
  // failed trivia read means the game card does not render. The
  // legs share the celebrations + relationships reads - one gate
  // per concept, no shadow derivations.
  let celebrations: Celebration[] = [];
  try {
    const res = await listCelebrations(bearer);
    celebrations = res.celebrations ?? [];
  } catch {
    celebrations = [];
  }
  const occasions = occasionsFromCelebrations(celebrations, new Date());
  let trivia: HomeProjection["trivia"] = null;
  const relTypeById = new Map<string, string>();
  const relTypeByName = new Map<string, string>();
  try {
    const [relRes, triviaRes, factsRes, walletRes] = await Promise.all([
      listRelationships(bearer).catch(() => null),
      listTriviaGuesses(bearer).catch(() => null),
      listMemoryFacts(bearer).catch(() => null),
      getSoulMemory(bearer).catch(() => null),
    ]);
    if (triviaRes) {
      for (const r of relRes?.relationships ?? []) {
        if (r.contact_user_id && typeof r.type === "string") {
          relTypeById.set(r.contact_user_id, r.type);
        }
      }
      const contacts = (relRes?.contacts ?? [])
        .filter(
          (c): c is { contact_user_id: string; display_name: string } =>
            Boolean(c) &&
            typeof (c as { contact_user_id?: unknown }).contact_user_id === "string" &&
            typeof (c as { display_name?: unknown }).display_name === "string",
        )
        .map((c) => ({ id: c.contact_user_id, name: c.display_name }));
      const nameById = new Map(contacts.map((c) => [c.id, c.name]));
      for (const c of contacts) {
        const t = relTypeById.get(c.id);
        if (t) relTypeByName.set(c.name.trim().toLowerCase(), t);
      }
      const capsules = (walletRes?.capsules ?? []).map((cap) => ({
        summary: cap.summary ?? null,
        counterpartUserId:
          (cap.scope_policy as { relationships?: { counterpart_user_id?: string } } | undefined)
            ?.relationships?.counterpart_user_id ??
          (cap.scope_policy as { scope?: { id?: string } } | undefined)?.scope?.id ??
          null,
      }));
      const questions = buildTriviaQuestions({ celebrations, contacts, capsules });
      const toView = (g: {
        id: string;
        subject_user_id: string;
        guesser_user_id: string | null;
        question: string;
        guess: string;
        status: string;
        multiplier: number;
        anonymous: boolean;
        corrected_guess?: string | null;
        corrected_at?: string | null;
      }): TriviaGuessView => ({
        id: g.id,
        subjectUserId: g.subject_user_id,
        subjectName: nameById.get(g.subject_user_id) ?? null,
        guesserUserId: g.guesser_user_id ?? null,
        guesserName: g.guesser_user_id
          ? (nameById.get(g.guesser_user_id) ?? null)
          : null,
        anonymous: g.anonymous,
        question: g.question,
        guess: g.guess,
        status: g.status,
        multiplier: g.multiplier ?? 1,
        // Repair #22 (WS-7): the correction rides the same read,
        // so both parties render the corrected truth from the one
        // record - the guesser sees what their answer became.
        correctedGuess: g.corrected_guess ?? null,
        correctedAt: g.corrected_at ?? null,
      });
      const facts = factsRes?.facts ?? [];
      trivia = {
        questions,
        aboutMe: (triviaRes.about_me ?? []).map(toView),
        mine: (triviaRes.mine ?? []).map(toView),
        score: {
          validatedCount: triviaRes.score?.validated_count ?? 0,
          points: triviaRes.score?.points ?? 0,
        },
        aboutYouFact: facts.length > 0 ? facts[0] : null,
      };
    }
  } catch {
    trivia = null;
  }

  // Repair #21 (W-9 identity addendum) - MOMENT STONE ORDERING:
  // the living graph orders the stones, never raw recency.
  // happening (a live host, from the lives leg's own records) >
  // loved (spouse / partner / family / close friend on the
  // viewer's relationship rows) > new > seen. Stable within a
  // tier. "Nearby" is not a tier: no author location is read
  // anywhere in this adapter, so the tier is declared absent in
  // the rebuild report rather than simulated.
  //
  // Repair #23 (R23-rail) - TRACE of the "loved" signal, for
  // the record: stoneState "loved" is computed HERE, from
  // relTypeByName - the author's relationship type on the
  // viewer's own relationship rows (listRelationships:
  // relationships[].type joined via contacts by display
  // name), against lovedTypes below. It is NOT computed from
  // any light/like the viewer gave the story and NOT from
  // viewing history (that is "seen", from the story record's
  // own seen flag). Since the R23 caption-taxonomy amendment
  // this signal no longer prints a caption word; in C2Home
  // it drives the ring's warmth treatment (data-warmth) and,
  // as the viewer's-close-people trigger, the attention tier
  // of the two-tier ring glow (data-glow).
  {
    const liveHostNames = new Set(
      lives
        .filter((l) => l.kind === "live")
        .map((l) => (l.kind === "live" ? l.hostName : null))
        .filter((n): n is string => Boolean(n)),
    );
    const lovedTypes = new Set(["spouse", "partner", "family", "close_friend"]);
    const tierOf = (story: (typeof stories)[number]): number => {
      if (liveHostNames.has(story.personName)) return 0;
      const relType = relTypeByName.get(story.personName.trim().toLowerCase());
      if (relType && lovedTypes.has(relType)) return 1;
      return story.seen ? 3 : 2;
    };
    stories = stories
      .map((story, index) => ({ story, index }))
      .sort((a, b) => tierOf(a.story) - tierOf(b.story) || a.index - b.index)
      .map(({ story }) => ({
        ...story,
        stoneState:
          tierOf(story) === 0
            ? ("happening" as const)
            : tierOf(story) === 1
              ? ("loved" as const)
              : story.seen
                ? ("seen" as const)
                : ("new" as const),
        ringKind:
          tierOf(story) === 0 ? ("happening" as const) : story.ringKind,
      }));
  }

  // Repair #21 (W-9 identity addendum) - DISCOVERY leg: people
  // the viewer actually talks with (conversation peers) who are
  // neither in their circle (relationship contacts) nor already
  // followed. One gate each: listConversations + listFollowing.
  // A failed read means no discovery row - never a staged one.
  let discovery: HomeProjection["discovery"];
  try {
    const [convRes, followRes] = await Promise.all([
      listConversations(bearer),
      listFollowing(bearer),
    ]);
    const followed = new Set(followRes.following_user_ids ?? []);
    const inCircle = new Set(relTypeById.keys());
    const seenPeer = new Set<string>();
    discovery = [];
    for (const conv of convRes.conversations ?? []) {
      for (const peer of conv.peers ?? []) {
        if (!peer.id || !peer.display_name) continue;
        if (peer.id === session?.user_id) continue;
        if (inCircle.has(peer.id) || followed.has(peer.id) || seenPeer.has(peer.id)) continue;
        seenPeer.add(peer.id);
        discovery.push({
          userId: peer.id,
          name: peer.display_name,
          avatar: avatarOf(peer.display_name, discovery.length + 1),
        });
        if (discovery.length >= 5) break;
      }
      if (discovery.length >= 5) break;
    }
  } catch {
    discovery = undefined;
  }

  // Repair #21 (W-14) - PRESENCE as one felt thing: the lights of
  // who is live right now, from the lives leg alone (the only
  // presence signal with a lawful Flows-level read today - see
  // the PresenceLight contract for the declared "free" gap).
  const presence: HomeProjection["presence"] = [];
  for (const item of lives) {
    if (item.kind !== "live" || !item.hostUserId || !item.hostName) continue;
    presence.push({
      userId: item.hostUserId,
      name: item.hostName,
      avatar: item.hostAvatar ?? avatarOf(item.hostName, presence.length + 1),
      liveId: item.id.replace(/^live-/, ""),
      mine: item.mine === true,
    });
  }

  // Repair #22 (WS-5) - PLACE ENERGY: the stones for the stream,
  // computed by the one builder from this adapter's own reads:
  // the plans above (already stripped of the viewer's private and
  // settled plans - those exclusions are the builder's input law),
  // the feed moments (visibility-gated by the backend feed itself),
  // and the visible lives. No new read is made for places.
  let places = placeStonesFromGraph({
    plans,
    moments: moments
      .filter((m): m is Extract<(typeof moments)[number], { kind: "memory" }> => m.kind === "memory")
      .map((m) => ({
        id: m.id,
        placeLabel: m.placeLabel ?? null,
        caption: m.contextLine,
        authorName: m.authorName ?? m.authorLine,
        authorUserId: m.authorUserId ?? null,
        mine: m.mine === true,
      })),
    lives: livePlaceInputs,
    now: new Date(),
  });

  // Repair #23 (WS-23-5) - PLACE SIGNAL: the one new read. The
  // names sent are exactly the places the stones above already
  // named from this viewer's own reads; the server answers a
  // qualitative tier + coarse nearby per place, computed from
  // the viewer's permitted facts on its side, plus the
  // per-person nearby set for the story rail. A failed read is
  // honest absence: stones keep their R22 reading, no stone
  // gains a tier, no story gains "nearby".
  try {
    {
      const signalRes = await getPlaceSignals(
        places.map((p) => p.name),
        bearer,
      );
      places = withPlaceSignals(places, signalRes.signals ?? []);
      const nearbyIds = new Set(signalRes.nearby_user_ids ?? []);
      if (nearbyIds.size > 0) {
        const rankOf = (s: (typeof stories)[number]): number =>
          s.stoneState === "happening"
            ? 0
            : nearbyIds.has(s.personId ?? "")
              ? 1
              : s.stoneState === "loved"
                ? 2
                : s.stoneState === "seen"
                  ? 4
                  : 3;
        stories = stories
          .map((story, index) => ({ story, index }))
          .sort((a, b) => rankOf(a.story) - rankOf(b.story) || a.index - b.index)
          .map(({ story }) => ({
            ...story,
            stoneState:
              story.stoneState === "happening"
                ? story.stoneState
                : nearbyIds.has(story.personId ?? "")
                  ? ("nearby" as const)
                  : story.stoneState,
          }));
      }
    }
  } catch {
    // The signal read failed: places and stones stay exactly as
    // the R22 builder and the W-9 ordering left them.
  }

  return {
    header: { ownAvatar: self },
    presence,
    places,
    rail: {
      self: {
        avatar: self,
        // JA-11: fed from the viewer's own story record (above) —
        // "Add" remains only the truly-empty case.
        hasLiveStory: ownStory !== null,
        liveStoryLabel: null,
        story: ownStory,
      },
      stories,
      capabilities: { canPost: true, canStory: true },
    },
    // R20 F-18 (D-5): Home is the social/life surface, so people's
    // moments interleave with plan cards from the top (moment, plan,
    // moment, plan) instead of every plan leading - the Center deck
    // is where plans lead, as the Needs-you deck. Lives still lead
    // (true only inside their window), plan cards keep their W9
    // state-rank relative order and are never relabeled, and the
    // cap is unchanged (14).
    occasions,
    trivia,
    discovery,
    feed: (() => {
      const interleaved: HomeProjection["feed"] = [...lives.slice(0, 3)];
      const maxLen = Math.max(moments.length, planCards.length);
      for (let i = 0; i < maxLen; i++) {
        if (moments[i]) interleaved.push(moments[i]);
        if (planCards[i]) interleaved.push(planCards[i]);
      }
      return interleaved.slice(0, 14);
    })(),
    feedError,
  };
}

/** Repair #21 (W-9 rebuild) - occasions ahead of time: the next
 *  occurrence of each celebration, kept only when it lands within
 *  60 days, soonest first, capped at 3. A celebration whose date
 *  cannot be computed contributes nothing - never a guessed date. */
export function occasionsFromCelebrations(
  celebrations: Celebration[],
  now: Date,
): HomeOccasion[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const out: HomeOccasion[] = [];
  for (const c of celebrations) {
    if (!c.person_name || !c.month || !c.day) continue;
    let next = new Date(today.getFullYear(), c.month - 1, c.day);
    if (next.getTime() < today.getTime()) {
      next = new Date(today.getFullYear() + 1, c.month - 1, c.day);
    }
    const daysUntil = Math.round((next.getTime() - today.getTime()) / 86400000);
    if (daysUntil > 60) continue;
    out.push({
      id: c.id,
      personName: c.person_name,
      kindLabel:
        c.kind === "birthday"
          ? "Birthday"
          : c.kind === "anniversary"
            ? "Anniversary"
            : "Occasion",
      dateLabel:
        c.date_label ??
        next.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      daysUntil,
      wouldLove: c.would_love ?? null,
      actionLabel: `Start a plan for ${c.person_name.trim().split(" ")[0]}`,
    });
  }
  return out.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 3);
}

/** Repair #21 (W-9 rebuild) - Know Me? Trivia question building.
 *  THE SCOPE LAW IS THE MECHANIC: a question is proposed ONLY
 *  from a record the viewer legitimately holds - their own
 *  celebrations record for that person (identity-resolved to a
 *  relationship contact by exact name), or a relationship
 *  capsule in the viewer's OWN wallet whose counterpart is that
 *  person. Questions are templates over held records (AI proposes
 *  questions only, in the founder's law - here, plain templates);
 *  verification is ALWAYS the subject's, never a model's. A
 *  celebration whose person cannot be identity-resolved to a
 *  contact proposes nothing: an unnamed subject cannot validate,
 *  so the question could never complete its journey. */
export function buildTriviaQuestions(input: {
  celebrations: Celebration[];
  contacts: Array<{ id: string; name: string }>;
  capsules: Array<{ summary: string | null; counterpartUserId: string | null }>;
}): import("./projections").TriviaQuestionView[] {
  const byName = new Map(
    input.contacts.map((c) => [c.name.trim().toLowerCase(), c]),
  );
  const questions: import("./projections").TriviaQuestionView[] = [];
  for (const c of input.celebrations) {
    if (!c.person_name) continue;
    const contact = byName.get(c.person_name.trim().toLowerCase());
    if (!contact) continue;
    const first = contact.name.split(" ")[0];
    const dateLabel =
      c.date_label ??
      new Date(2000, (c.month ?? 1) - 1, c.day ?? 1).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
      });
    if (c.kind === "birthday") {
      questions.push({
        id: `trivia-q-celebration-${c.id}`,
        subjectUserId: contact.id,
        subjectName: contact.name,
        question: `When is ${first}'s birthday?`,
        factSummary: `${contact.name}'s birthday is ${dateLabel}`,
        source: "celebration",
      });
    } else if (c.kind === "anniversary") {
      questions.push({
        id: `trivia-q-celebration-${c.id}`,
        subjectUserId: contact.id,
        subjectName: contact.name,
        question: `When is ${first}'s anniversary?`,
        factSummary: `${contact.name}'s anniversary is ${dateLabel}`,
        source: "celebration",
      });
    }
  }
  for (const cap of input.capsules) {
    if (!cap.summary || !cap.counterpartUserId) continue;
    const contact = input.contacts.find((c) => c.id === cap.counterpartUserId);
    if (!contact) continue;
    questions.push({
      id: `trivia-q-capsule-${contact.id}-${questions.length}`,
      subjectUserId: contact.id,
      subjectName: contact.name,
      question: `What do you know about ${contact.name.split(" ")[0]}? Opal holds this from your side - say it in your own words if it is right: ${cap.summary}`,
      factSummary: cap.summary,
      source: "capsule",
    });
  }
  return questions.slice(0, 12);
}

/**
 * Repair #21 (W-12; T-5 gyroscope) - THE pair score: ONE
 * derivation for every surface that renders a pair's Know Me?
 * standing - the bond stone and the trivia poster read the
 * same number because both call this. A pair's score is its
 * validated guesses in either direction, ten points times
 * each guess's multiplier. Null when the pair has never
 * confirmed a guess - surfaces render the pairing without a
 * score rather than a fabricated zero-history number.
 */
export function pairScoreFromRecords(
  records: Array<{
    guesserUserId: string | null;
    subjectUserId: string;
    status: string;
    multiplier: number;
  }>,
  viewerId: string,
  otherId: string,
): { confirmed: number; points: number } | null {
  const pairGuesses = records.filter(
    (g) =>
      g.status === "validated" &&
      ((g.guesserUserId === viewerId && g.subjectUserId === otherId) ||
        (g.guesserUserId === otherId && g.subjectUserId === viewerId)),
  );
  if (pairGuesses.length === 0) return null;
  return {
    confirmed: pairGuesses.length,
    points: pairGuesses.reduce((sum, g) => sum + 10 * (g.multiplier || 1), 0),
  };
}

/**
 * Repair #21 (W-12) - THE BOND builder. Pure, and MUTUAL BY
 * CONSTRUCTION: its inputs are only (a) plans whose history roster
 * carries BOTH parties, and (b) the pair's own Trivia guess
 * records. There is deliberately NO capsule, wallet, or
 * memory-fact parameter - a bond element fed by a private capsule
 * is an isolation violation, and this signature makes it
 * unrepresentable. Both parties' clients build the same stone
 * from the same shared records, so both see the same shared truth;
 * each person's private side stays in their own Orbit.
 */
export function bondFromPair(input: {
  pair: { id: string; name: string };
  viewerId: string;
  relationshipLabel: string | null;
  shared: Array<{ plan: OpalPlanContract }>;
  guesses: Array<{
    guesserUserId: string | null;
    subjectUserId: string;
    status: string;
    multiplier: number;
  }>;
}): BondProjection {
  const chapters: BondProjection["chapters"] = [];
  let nextTogether: BondProjection["nextTogether"] = null;
  const places: string[] = [];
  for (const { plan } of input.shared) {
    const family = familyOfStatus(plan.status);
    const card = cardFromPlan(plan);
    if (plan.plan_type !== "virtual" && plan.online !== true) {
      const place = plan.location?.trim();
      if (place && place !== "Online" && !places.includes(place)) places.push(place);
    }
    if (family === "past") {
      chapters.push({
        planId: plan.id,
        title: plan.title,
        whenLine: card.whenLine,
        placeLabel:
          plan.plan_type === "virtual" || plan.online === true
            ? null
            : (plan.location?.trim() ?? null),
      });
    } else if (!nextTogether) {
      nextTogether = {
        planId: plan.id,
        title: plan.title,
        whenLine: card.whenLine,
        stateLabel: card.stateLabel,
        stateFamily: family,
      };
    }
  }
  const pairScore = pairScoreFromRecords(input.guesses, input.viewerId, input.pair.id);
  return {
    personId: input.pair.id,
    name: input.pair.name,
    avatar: avatarOf(input.pair.name, 1),
    relationshipLabel: input.relationshipLabel,
    chapters,
    nextTogether,
    pairScore,
    sharedPlaces: places,
    sharedPlanCount: input.shared.length,
  };
}

/**
 * Repair #21 (W-12) - load one pair's bond through the real reads:
 * the relationships index (who this person is), the viewer's plans
 * plus each plan's history roster (the ONLY roster read - a plan
 * is shared truth for the pair exactly when its roster carries
 * both parties), and the Trivia guesses read. Any failed leg
 * degrades that leg to absent; a person the viewer has no
 * relationship contact for has no bond to load (null).
 */
export async function loadBond(
  personId: string,
  bearer?: string,
  session?: ProductSession | null,
): Promise<BondProjection | null> {
  const viewerId = session?.user_id;
  if (!viewerId || !personId || personId === viewerId) return null;
  let name: string | null = null;
  let relationshipLabel: string | null = null;
  try {
    const relRes = await listRelationships(bearer);
    const contact = (relRes?.contacts ?? []).find((c) => c.contact_user_id === personId);
    if (!contact?.display_name) return null;
    name = contact.display_name;
    const row = (relRes?.relationships ?? []).find((r) => r.contact_user_id === personId);
    relationshipLabel = row ? tieLabel(row.type, row.family_subtype) : null;
  } catch {
    return null;
  }
  const plansResult = await loadPlansResult(bearer);
  const candidates = plansResult.plans
    .filter((p) => p.is_private !== true)
    .slice(0, 24);
  const shared: Array<{ plan: OpalPlanContract }> = [];
  for (const plan of candidates) {
    try {
      const history = await getPlanHistory(plan.id, bearer);
      const whoIds = (history.who ?? []).map((w) => w.user_id);
      if (whoIds.includes(personId) && whoIds.includes(viewerId)) shared.push({ plan });
    } catch {
      /* a plan whose roster cannot be read is not shared truth */
    }
  }
  let guesses: Array<{
    guesserUserId: string | null;
    subjectUserId: string;
    status: string;
    multiplier: number;
  }> = [];
  try {
    const triviaRes = await listTriviaGuesses(bearer);
    const all = [...(triviaRes?.mine ?? []), ...(triviaRes?.about_me ?? [])];
    guesses = all.map((g) => ({
      guesserUserId: g.guesser_user_id ?? null,
      subjectUserId: g.subject_user_id,
      status: g.status,
      multiplier: g.multiplier ?? 1,
    }));
  } catch {
    guesses = [];
  }
  return bondFromPair({
    pair: { id: personId, name },
    viewerId,
    relationshipLabel,
    shared,
    guesses,
  });
}

export function youHubFromSession(
  session: ProductSession | null,
  googleConnected: boolean | "simulated" | null,
): YouHubProjection {
  const name = session?.display_name ?? "You";
  return {
    profile: {
      name,
      handle: session?.handle ?? null,
      avatar: avatarOf(name),
    },
    accountNote: null,
    connectedSummary:
      googleConnected === null
        ? "Your connectors are checked when you open them."
        : googleConnected === "simulated"
          ? "Google Calendar is a simulated stand-in, not a real connection."
          : googleConnected
            ? "Google Calendar connected."
            : "Google Calendar not connected.",
    index: [
      { key: "edit-profile", title: "Edit profile", subtitle: "Name and username", keywords: "name username handle photo profile you" },
      { key: "your-moments", title: "Your moments", subtitle: "Your posts and stories, kept", keywords: "moments archive posts stories shared media photos" },
      { key: "your-library", title: "Your library", subtitle: "Made by Opal, and your media", keywords: "library artifacts made by opal drafts lists exports media photos videos stories" },
      { key: "appearance", title: "Appearance", subtitle: "Pick your light", keywords: "mode light dark theme appearance" },
      { key: "soul", title: "Soul", subtitle: "How Opal is with you", keywords: "soul how opal is with you forward quiet hours timezone feedback persona tone how opal speaks" },
      { key: "memory", title: "Memory", subtitle: "What Opal holds for you", keywords: "memory what opal holds remembers capsules forget provenance" },
      { key: "what-opal-remembers", title: "What Opal remembers", subtitle: "Facts Opal keeps, and forgetting them", keywords: "memory remembers forget facts permissions" },
      { key: "how-opal-helps", title: "How Opal helps", subtitle: "How forward Opal may be", keywords: "helps proactive forward assist offers suggestions" },
      { key: "calls-assist", title: "Opal Assist and calls", subtitle: "Help on calls, only when you say so", keywords: "assist calls phone" },
      { key: "approvals-activity", title: "Activity", subtitle: "What Opal did for you, written down", keywords: "approvals activity trail history export what opal did" },
      { key: "connections", title: "Connectors", subtitle: "Tools you connect yourself", keywords: "connectors connections tools apps integrations google gmail calendar saved logins" },
      { key: "connector-permissions", title: "Permissions", subtitle: "When Opal asks before it acts", keywords: "permissions ask before acting always ask forward proactive assistance" },
      { key: "privacy", title: "Privacy", subtitle: "You choose who sees what", keywords: "privacy visibility blocked muted account data rights" },
      { key: "private-graphs", title: "Private graphs", subtitle: "Passcode and biometrics for your private graphs", keywords: "private graphs passcode pin biometric vault unlock face id fingerprint" },
      { key: "notifications", title: "Quiet", subtitle: "Notifications, and your peace", keywords: "quiet notifications messages calls receipts alerts hours" },
      { key: "linked-devices", title: "Linked devices", subtitle: "Where you are signed in", keywords: "devices sessions phone desktop" },
      { key: "saved-logins", title: "Saved logins", subtitle: "Logins Opal keeps for you, by site only", keywords: "saved logins passwords credentials vault sites hosts" },
      { key: "invite-code", title: "Your invite code", subtitle: "Share it - anyone who joins is connected with you", keywords: "invite code share friends referral join" },
      { key: "delete-account", title: "Delete my data or account", subtitle: "Your call, with exactly what goes named", keywords: "delete remove account data erase close" },
      { key: "location-travel", title: "Location and travel", subtitle: "Timing that follows you", keywords: "location travel timezone home" },
      { key: "account-security", title: "Account and security", subtitle: "Your account, your call", keywords: "account security delete sign in" },
      { key: "help-support", title: "Help & support", subtitle: "Report a problem, send feedback", keywords: "help support report problem feedback contact broken" },
      { key: "report-problem", title: "Report a problem", subtitle: "Tell Opal what went wrong", keywords: "report problem broken bug wrong went wrong" },
      { key: "submit-feedback", title: "Submit feedback", subtitle: "Ideas and wishes, read by a person", keywords: "feedback idea suggestion wish" },
    ],
  };
}

export type SettingsContext = {
  session: ProductSession | null;
  bearer?: string;
};

/** Builds ONE section projection with real rows only (audit in the
 *  phase-2 C2 report). Async because most rows read their real value
 *  from the product API; a failed read yields the honest note row,
 *  never a guessed value. */
export async function buildSettingsSection(
  key: string,
  ctx: SettingsContext,
): Promise<SettingsSectionProjection> {
  const bearer = ctx.bearer;
  // Founder naming fix (2026-10-19) + R20 F-9 rename: "Connected
  // sources" is retired and the room itself is now "Connectors".
  // There is exactly ONE Connectors room; any stored or deep-linked
  // use of the old keys lands there.
  if (key === "connected-sources") key = "connections";
  // R20 F-9(e) + v2: "Where Opal reads from" is retired as a room
  // and, per the founder's v2 ruling, its content does NOT live in
  // Connectors either - it is removed from this room permanently.
  // A stored or deep-linked use of the old key still lands on the
  // Connectors room itself (never on the retired source list).
  if (key === "what-opal-hears") key = "connections";
  switch (key) {
    case "edit-profile":
      return {
        key,
        title: "Edit profile",
        lede: "How your people see you.",
        rows: [
          { kind: "value", id: "name", title: "Name", value: ctx.session?.display_name ?? "" },
          {
            kind: "value",
            id: "handle",
            title: "Username",
            value: ctx.session?.handle ? `@${ctx.session.handle}` : "Not set",
          },
          {
            kind: "note",
            id: "bio-note",
            text: "Bio is not on the profile yet, so there is no bio field here pretending to save one.",
          },
        ],
      };
    case "appearance":
      return {
        key,
        title: "Appearance",
        lede: "Pick your light. Opal keeps it everywhere.",
        rows: [
          {
            kind: "value",
            id: "reduce-motion",
            title: "Reduce motion",
            value:
              typeof window !== "undefined" &&
              typeof window.matchMedia === "function" &&
              window.matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "On (from your device)"
                : "Off (from your device)",
          },
          {
            kind: "note",
            id: "mode-note",
            text: "Mode applies the moment you pick it. Nothing reloads.",
          },
        ],
      };
    case "notifications": {
      try {
        const prefs = await getMessagingPreferences(bearer);
        return {
          key,
          title: "Quiet",
          lede: "Loud for people. Quiet for noise.",
          rows: [
            {
              // Audit A2 — the master switch. It writes its own real
              // flag (notifications_paused); the per-kind switches
              // below keep their stored values untouched, so turning
              // pause off restores them exactly.
              kind: "toggle",
              id: "pause-everything",
              title: "Pause everything",
              subtitle: "While this is on, nothing alerts you. Messages from people still arrive in Chats - they just land silently.",
              value: prefs.notifications_paused === true,
            },
            {
              kind: "toggle",
              id: "messages-calls",
              title: "Messages and calls",
              subtitle: "Direct contact that needs a reply.",
              value: prefs.message_notifications_enabled,
            },
            {
              kind: "toggle",
              id: "read-receipts",
              title: "Read receipts",
              subtitle: "Show when you have seen a message.",
              value: prefs.read_receipts_enabled,
            },
            {
              kind: "note",
              id: "push-note",
              text: "Push categories for Graph changes and live movement are not wired on this device yet, so they are not listed here.",
            },
            {
              kind: "note",
              id: "quiet-hours-note",
              text: "Opal keeps quiet hours for anything it brings you. Your own hours live in Soul, where you set when they start and end.",
            },
            {
              kind: "nav",
              id: "soul-quiet",
              title: "Your quiet hours",
              subtitle: "In Soul - how Opal is with you",
              target: "soul",
            },
          ],
        };
      } catch {
        return {
          key,
          title: "Quiet",
          lede: "Loud for people. Quiet for noise.",
          rows: [{ kind: "note", id: "load-failed", text: "Your notification settings could not load. Head back and try again." }],
        };
      }
    }
    case "calls-assist": {
      try {
        const pref = await getAssistPreference(bearer);
        return {
          key,
          title: "Opal Assist and calls",
          lede: "Help on calls, only when you say so.",
          rows: [
            {
              kind: "toggle",
              id: "assist",
              title: "Opal Assist on calls",
              subtitle: "Allow Assist on future calls. You can still pause it on any private call.",
              value: pref.assist_calls_enabled === true,
            },
          ],
        };
      } catch {
        return {
          key,
          title: "Opal Assist and calls",
          lede: "Help on calls, only when you say so.",
          rows: [{ kind: "note", id: "load-failed", text: "Your call settings could not load. Head back and try again." }],
        };
      }
    }
    case "location-travel": {
      try {
        const tz = await getHomeTimezone(bearer);
        return {
          key,
          title: "Location and travel",
          lede: "Timing that follows you, set by timezone - never GPS.",
          rows: [
            { kind: "value", id: "home-timezone", title: "Home timezone", value: tz.home_timezone },
            {
              kind: "value",
              id: "travel-mode",
              title: "Travel mode",
              value: tz.active ? "On - times shift to where you are" : "Off",
            },
            {
              kind: "action",
              id: "use-device-timezone",
              title: "Use this device timezone as home",
              subtitle: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
          ],
        };
      } catch {
        return {
          key,
          title: "Location and travel",
          lede: "Timing that follows you, set by timezone - never GPS.",
          rows: [{ kind: "note", id: "load-failed", text: "Your travel settings could not load. Head back and try again." }],
        };
      }
    }
    case "linked-devices": {
      // Spec 4.C2 — the roster is the real session store, read from
      // the API; revoke kills the session server-side. Pairing a new
      // device has no mechanism at source (no signed session mint),
      // so no pairing control is painted: signing in on the other
      // device with the same phone number is the real add path, and
      // the note says exactly that.
      try {
        const devices = await getDeviceRoster(bearer);
        return {
          key,
          title: "Linked devices",
          lede: "Where you are signed in.",
          rows: [
            ...devices.map((device) => ({
              kind: "value" as const,
              id: `device-${device.id}`,
              title: device.is_current ? `${device.device_label} - this device` : device.device_label,
              subtitle: device.last_seen_at
                ? `Last seen ${device.last_seen_at}`
                : device.platform,
              value: device.status === "active" ? "Active" : "Signed out",
            })),
            ...devices
              .filter((device) => device.status === "active" && !device.is_current)
              .map((device) => ({
                kind: "action" as const,
                id: `revoke-device-${device.id}`,
                title: `Sign out ${device.device_label}`,
                subtitle: "Ends that session on its next request",
              })),
            {
              kind: "note" as const,
              id: "pairing-note",
              text: "To add a device, sign in on it with the same phone number - it will appear here. There is no pairing code or QR flow in Opal today, so none is offered here.",
            },
          ],
        };
      } catch {
        return {
          key,
          title: "Linked devices",
          lede: "Where you are signed in.",
          rows: [{ kind: "note", id: "load-failed", text: "Your devices could not load. Head back and try again." }],
        };
      }
    }
    case "saved-logins": {
      // Spec 4.C3 — hosts only. The payload this renders from cannot
      // contain a value: the API contract is id + host + saved_at.
      try {
        const logins = await getSavedLogins(bearer);
        return {
          key,
          title: "Saved logins",
          lede: "Logins Opal keeps for you. Only the site is ever shown - the login itself stays in the vault and is used only for its own site.",
          rows: [
            ...(logins.length === 0
              ? [{ kind: "note" as const, id: "none", text: "No saved logins yet. Add one below and Opal will keep it for that site only." }]
              : logins.map((login) => ({
                  kind: "action" as const,
                  id: `remove-login-${login.id}`,
                  title: login.host,
                  subtitle: "Saved login - tap to remove it",
                }))),
            {
              kind: "note" as const,
              id: "use-note",
              text: "Every time Opal uses a saved login, it is written into your activity. Removing a login means the next thing that needs it will ask you again.",
            },
          ],
        };
      } catch {
        return {
          key,
          title: "Saved logins",
          lede: "Logins Opal keeps for you.",
          rows: [{ kind: "note", id: "load-failed", text: "Your saved logins could not load. Head back and try again." }],
        };
      }
    }
    case "invite-code": {
      // Spec 4.C4 — your personal code and the credit, both sides.
      // The copy promises the connection only, never a reward.
      try {
        const payload = await getPersonalInviteCode(bearer);
        return {
          key,
          title: "Your invite code",
          lede: payload.personal_code.promise,
          rows: [
            {
              kind: "value",
              id: "code",
              title: "Your code",
              subtitle: payload.personal_code.share_url,
              value: payload.personal_code.code,
            },
            ...(payload.joined_through
              ? [{
                  kind: "note" as const,
                  id: "joined-through",
                  text: payload.joined_through.credit_line,
                }]
              : []),
            ...payload.joined_through_you.map((credit, i) => ({
              kind: "note" as const,
              id: `joined-through-you-${i}`,
              text: credit.credit_line,
            })),
            {
              kind: "note" as const,
              id: "redeem-note",
              text: "Have a code from someone else? Enter it below - you will be connected with them.",
            },
          ],
        };
      } catch {
        return {
          key,
          title: "Your invite code",
          lede: "",
          rows: [{ kind: "note", id: "load-failed", text: "Your invite code could not load. Head back and try again." }],
        };
      }
    }
    case "delete-account":
      // Spec 4.C6 — the confirm names exactly what goes, including
      // the shared-truth rule; the form itself renders in C2You.
      return {
        key,
        title: "Delete my data or account",
        lede: "Take your time. This is permanent, and it is really done when you confirm.",
        rows: [
          {
            kind: "note",
            id: "data-scope",
            text: "Delete my data removes what Opal holds for you: your memories, how Opal is set up for you, your chats with Opal, your saved logins, and your connectors. Your account stays, and you can keep using Opal.",
          },
          {
            kind: "note",
            id: "account-scope",
            text: "Delete my account does all of that and closes your account: every device is signed out and your name is removed.",
          },
          {
            kind: "note",
            id: "shared-scope",
            text: "Plans and memories you share with other people are not yours to erase for them. Your side is removed and your seat is shown as a deleted member; their side stands.",
          },
          {
            kind: "note",
            id: "receipt-note",
            text: "When it is done you get a receipt with a reference you can quote. Asking through Help and support does exactly the same deletion.",
          },
        ],
      };
    case "what-opal-remembers": {
      try {
        const res = await listMemoryFacts(bearer);
        return {
          key,
          title: "What Opal remembers",
          lede: "Facts Opal keeps from your chats and plans. You control them - forget any of them, for real.",
          rows: [
            ...(res.facts.length === 0
              ? [{ kind: "note" as const, id: "none", text: "Opal is not keeping any facts yet." }]
              : res.facts.map((fact) => ({
                  kind: "action" as const,
                  id: `forget-${fact.id}`,
                  title: fact.label,
                  subtitle: `${fact.value} - tap, then confirm to forget`,
                }))),
            // N7: these facts are Opal-derived and delete-only - the
            // transparency contract carries no date or source for a
            // fact, so none is shown. Manual additions live in
            // Memory, where every entry carries both.
            {
              kind: "note" as const,
              id: "facts-form-note",
              text: "These facts are the short form - Opal picked them up from your chats and plans, and you can only forget them here, not add to them. The fuller form lives in Memory: one entry per thing remembered, with its source and the date it was saved, including anything you add yourself. As the memory wallet is built, these facts move into that fuller form.",
            },
            {
              kind: "nav" as const,
              id: "to-memory",
              title: "Memory - add what Opal should remember",
              target: "memory",
            },
          ],
        };
      } catch {
        return {
          key,
          title: "What Opal remembers",
          lede: "Facts Opal keeps from your chats and plans. You control them - forget any of them, for real.",
          rows: [{ kind: "note", id: "load-failed", text: "What Opal remembers could not load. Head back and try again." }],
        };
      }
    }
    case "soul":
    case "soul-memory": {
      // 12.2 - Repair #19 W8 (W5-11): SOUL is its own room - "how Opal
      // is with you". It edits the REAL assistance-preference truth
      // (the same record Opal's help already follows - no parallel
      // store, Repair #18 SM contracts unchanged). The legacy
      // "soul-memory" key is an alias that lands here, in the Soul
      // room only; Memory is the separate room below. Value rows
      // carry the raw fields ONLY as the form's seed (the
      // edit-profile pattern) - C2You renders the form instead of
      // these rows, so a raw value ("22:00", "3", "standard") never
      // reaches the glass as an unlabeled box.
      try {
        const res = await getSoulMemory(bearer);
        const soul = res.soul;
        return {
          key,
          title: "Soul",
          lede: "How Opal is with you. Every setting here is one Opal already follows - change it and the saved setting is what Opal uses.",
          rows: [
            {
              kind: "value",
              id: "assistance_level",
              title: "How forward may Opal be?",
              value: soul.assistance_level,
            },
            {
              kind: "value",
              id: "quiet_hours_start",
              title: "Quiet hours start",
              value: soul.quiet_hours_start,
            },
            {
              kind: "value",
              id: "quiet_hours_end",
              title: "Quiet hours end",
              value: soul.quiet_hours_end,
            },
            {
              // JA-07: the on/off truth, carried in the section
              // inventory itself (the W8-era claim of a toggle is
              // now REAL — the Soul form renders this switch; the
              // resolver's disabled state is start == end).
              kind: "value",
              id: "quiet_hours_on_off",
              title: "Quiet hours on/off",
              value:
                soul.quiet_hours_start && soul.quiet_hours_start === soul.quiet_hours_end
                  ? "off"
                  : "on",
            },
            { kind: "value", id: "timezone", title: "Home time zone", value: soul.timezone },
            {
              kind: "value",
              id: "max_proactive_signals_per_day",
              title: "Proactive notes per day, at most",
              value: String(soul.max_proactive_signals_per_day),
            },
            {
              kind: "value",
              id: "completion_feedback",
              title: "When something is done",
              value: soul.completion_feedback,
            },
            {
              kind: "nav",
              id: "to-memory",
              title: "Memory - what Opal holds for you",
              subtitle: "The separate room for everything Opal remembers",
              target: "memory",
            },
          ],
        };
      } catch {
        return {
          key,
          title: "Soul",
          lede: "How Opal is with you.",
          rows: [
            {
              kind: "note",
              id: "load-failed",
              text: "Your Soul settings could not load. Head back and try again.",
            },
          ],
        };
      }
    }
    case "memory": {
      // 12.2 - Repair #19 W8 (W5-11): MEMORY is its own room - "what
      // Opal holds". Capsules are grouped by what they are about,
      // each row naming what it is, where it came from (provenance
      // in plain words), and when it was saved. Forget is the
      // existing owner path: the first tap only arms the shell's
      // two-step confirm; confirming hard-deletes through the
      // wallet API. Per-person memories (relationship-scoped
      // capsules) get their own group - the SM design provides no
      // separate per-person toggle truth, so none is painted; the
      // per-item forget IS the per-person control that exists.
      // Item 16: the standing call-graphing permission lives in
      // this room (what Opal may add to your graph is a memory
      // decision). Its read is its OWN leg (ER-2): if it fails, the
      // room still renders and the control is honestly absent -
      // never a toggle seeded from a guess.
      // N7 (founder polish wave): how memory changes are protected,
      // stated in the room itself. There is NO password check -
      // Opal accounts sign in with a phone code and have no account
      // password, and no step-up re-auth exists to check against -
      // so none is painted. What is true today: changes ride the
      // signed-in session only, and forgetting is two-step.
      const memoryProtectionNote: SettingsSectionProjection["rows"][number] = {
        kind: "note",
        id: "memory-protection-note",
        text: "Adding and forgetting here happen only while you are signed in, and forgetting always asks you to confirm first. There is no separate password check for memory yet: Opal signs you in with a code sent to your phone, and your account has no password to check against.",
      };
      let graphingRows: SettingsSectionProjection["rows"] = [];
      try {
        const g = await getGraphingPolicy(bearer);
        graphingRows = [
          {
            kind: "value",
            id: "graphing_call_mode",
            title: "Call graphing",
            value: g.graphing.call_mode ?? "ask_each",
          },
          {
            kind: "value",
            id: "graphing_global_paused",
            title: "Pause all graphing",
            value: g.graphing.global_paused ? "true" : "false",
          },
        ];
      } catch {
        graphingRows = [];
      }
      try {
        const res = await getSoulMemory(bearer);
        if (res.capsules.length === 0) {
          return {
            key,
            title: "Memory",
            lede: "What Opal holds for you.",
            rows: [
              ...graphingRows,
              {
                kind: "note",
                id: "memory-empty",
                text: "Opal is not holding any memories for you yet. When you tell Opal something to remember, or Opal saves a preference for you, it will appear here - with where it came from and when - and you can forget it here, for good.",
              },
              memoryProtectionNote,
              {
                kind: "nav",
                id: "remembers",
                title: "What Opal remembers",
                subtitle: "Facts Opal keeps, and forgetting them",
                target: "what-opal-remembers",
              },
              {
                kind: "nav",
                id: "to-soul",
                title: "Soul - how Opal is with you",
                target: "soul",
              },
            ],
          };
        }
        const groups: CapsuleGroup[] = ["about-you", "with-people", "from-plans"];
        const rows: SettingsSectionProjection["rows"] = [
          ...graphingRows,
          {
            kind: "note",
            id: "memory-heading",
            text: `${res.capsule_count} ${res.capsule_count === 1 ? "memory" : "memories"}. Each one says where it came from. Tap one, then confirm, to forget it for good - forgetting deletes it, it is not just hidden.`,
          },
          memoryProtectionNote,
        ];
        for (const group of groups) {
          const inGroup = res.capsules.filter(
            (c) => capsuleGroupOf(capsuleScopeKind(c)) === group,
          );
          if (inGroup.length === 0) continue;
          rows.push({
            kind: "note",
            id: `memory-group-${group}`,
            text: CAPSULE_GROUP_HEADINGS[group],
          });
          for (const capsule of inGroup) {
            const saved = capsuleSavedLabel(capsule.created_at);
            const provenance = capsule.provenance_label ?? "Saved with Opal";
            rows.push({
              kind: "action" as const,
              id: `forget-capsule-${capsule.id}`,
              title: capsule.summary ?? "A memory",
              subtitle: [
                `${provenance}${saved ? ` - ${saved}` : ""}.`,
                capsule.because ? `${capsule.because}.` : null,
                "Tap, then confirm, to forget it for good.",
              ]
                .filter(Boolean)
                .join(" "),
            });
          }
        }
        rows.push({
          kind: "nav",
          id: "remembers",
          title: "What Opal remembers",
          subtitle: "Facts Opal keeps, and forgetting them",
          target: "what-opal-remembers",
        });
        rows.push({
          kind: "nav",
          id: "to-soul",
          title: "Soul - how Opal is with you",
          target: "soul",
        });
        return {
          key,
          title: "Memory",
          lede: "What Opal holds for you - yours to read and to forget.",
          rows,
        };
      } catch {
        return {
          key,
          title: "Memory",
          lede: "What Opal holds for you.",
          rows: [
            {
              kind: "note",
              id: "load-failed",
              text: "What Opal holds could not load. Head back and try again.",
            },
          ],
        };
      }
    }
    case "how-opal-helps": {
      // 12.4 — today's TRUE proactivity controls only. HARD BLOCKER
      // (proactive-presentation-system.md section 8, D-8): the
      // operational-modes picker MUST NOT SHIP — the mode object
      // does not exist, so there is no picker here, in any words.
      try {
        const pref = await getAssistPreference(bearer);
        return {
          key,
          title: "How Opal helps",
          lede: "How forward Opal may be, with the controls that are real today.",
          rows: [
            {
              kind: "toggle",
              id: "assist",
              title: "Opal Assist on calls",
              subtitle: "Allow Assist on future calls. You can still pause it on any private call.",
              value: pref.assist_calls_enabled === true,
            },
            { kind: "nav", id: "calls", title: "Opal Assist and calls", target: "calls-assist" },
            { kind: "nav", id: "quiet", title: "Quiet", target: "notifications" },
            {
              kind: "nav",
              id: "soul",
              title: "Soul - how forward Opal may be",
              subtitle: "How forward, quiet hours, and your daily cap, in one room",
              target: "soul",
            },
            {
              kind: "note",
              id: "modes-gate",
              text: "How forward Opal may be lives in Soul. Opal's offers stay off unless you turn them on, Opal asks once and never nags, and a no is final.",
            },
          ],
        };
      } catch {
        return {
          key,
          title: "How Opal helps",
          lede: "How forward Opal may be, with the controls that are real today.",
          rows: [{ kind: "note", id: "load-failed", text: "Your help settings could not load. Head back and try again." }],
        };
      }
    }
    case "approvals-activity": {
      // 12.5 - Repair #19 W8 (settings sharpening, audit rows
      // 40/41): the ACTIVITY window is a settings room and is built
      // here against the real account-activity trail (adoption
      // wave 2: entries written at execution time - saved-login
      // use, device sign-out - read from GET /settings/activity).
      // It is NOT the DIR-4 P6 report (a one-line visit-scoped
      // reveal on the deck) and not Opal's Home's trail lens
      // (4.B10, MT-01) - this room renders the account entries
      // themselves. The APPROVALS window is ADOPTED-DEFERRED:
      // approvals live where the work happens (plan page, check-in)
      // and their Home lens belongs to the Opal's Home build
      // (MT-01); no approvals queue store exists to list here, so
      // none is painted - the gate note below stands.
      const approvalsGate: SettingsSectionProjection["rows"] = [
        {
          kind: "note",
          id: "approvals-gate",
          text: "Approvals - what Opal is waiting on you for - appear where the work happens: on a plan's page or in a check-in. A single approvals queue in Settings is not built yet, so nothing here is listed as if it were.",
        },
        {
          kind: "note",
          id: "export-gate",
          text: "Getting your data out will live under Privacy + account. It is not built yet either - there is no export button here, because a button that does not export would be a lie.",
        },
      ];
      if (!bearer) {
        return {
          key,
          title: "Activity",
          lede: "What Opal did for you, written down when it happened.",
          rows: [
            {
              kind: "note",
              id: "activity-signin",
              text: "Your activity loads with your account. When Opal uses a saved login for you or signs a device out, it will be listed here with when it happened.",
            },
            ...approvalsGate,
          ],
        };
      }
      try {
        const res = await getAccountActivity(bearer);
        const entries = res.activity ?? [];
        return {
          key,
          title: "Activity",
          lede: "What Opal did for you, written down when it happened.",
          rows: [
            ...(entries.length === 0
              ? [
                  {
                    kind: "note" as const,
                    id: "activity-empty",
                    text: "Nothing here yet. When Opal uses a saved login for you, signs a device out, or does other account work for you, it will be listed here with when it happened.",
                  },
                ]
              : entries.map((entry) => {
                  const subject = activitySubjectLabel(entry.kind, entry.subject);
                  return {
                    kind: "value" as const,
                    id: `activity-${entry.id}`,
                    title: activityKindLabel(entry.kind),
                    ...(subject ? { subtitle: subject } : {}),
                    value: activityWhenLabel(entry.at),
                  };
                })),
            ...approvalsGate,
          ],
        };
      } catch {
        return {
          key,
          title: "Activity",
          lede: "What Opal did for you, written down when it happened.",
          rows: [
            {
              kind: "note",
              id: "load-failed",
              text: "Your activity could not load. Head back and try again.",
            },
            ...approvalsGate,
          ],
        };
      }
    }
    case "connections": {
      // R20 F-9 v2 - CONNECTORS (founder rebuild, 2026-10-20). The
      // v1 room MISSED AGAIN in the founder's interim review: it
      // carried backend-derived content (device location, meetings,
      // linked devices, phone calls, "Where Opal reads from" source
      // rows) that has nothing to do with this room. All of that is
      // REMOVED permanently - this room never reads the ingestion
      // payload and never renders a device, source, call, meeting,
      // or linked-device row.
      //
      // The v2 form is a near-textless list of user-facing tools,
      // grouped in the founder's categories (Your Device, Social,
      // Business, Custom - a category with no real member does not
      // render). Each tool row is icon + name + one action. Today
      // the only tools with a real connect flow are the Google rows
      // (one Google grant: Google Calendar + Gmail, readonly
      // scopes), so Business is the only tool category that renders;
      // Saved logins is a real read surface, so Custom renders with
      // its View row. Tools without a real flow are honestly ABSENT
      // - never greyed Connect buttons, never "coming soon".
      //
      // HONESTY LAW (unchanged): the server's settings/connections
      // payload also carries Opal's internal providers (its
      // thinking, voice, places, phone and travel services) - those
      // are infrastructure, filtered out by the allowlist below and
      // never rendered in any form. A Connect/Disconnect action is
      // attached to a row ONLY when the payload itself carries an
      // enabled action for that row (the payload builds one only
      // behind the real Google OAuth flow:
      // POST .../connectors/google_calendar/start + revoke, with
      // status read back from ProviderConnections). A row with no
      // payload action renders View only: tapping it shows the
      // row's own status, detail, and gate lines - with status and
      // detail never duplicating one sentence (the v1 Gmail nit:
      // for a gated row the payload's status_detail IS the gate
      // reason, so the detail panel must not print both).
      const USER_FACING_CONNECTOR_IDS = ["google_calendar", "gmail"] as const;
      let payload: Awaited<ReturnType<typeof getSettingsConnections>> | null = null;
      try {
        payload = await getSettingsConnections(bearer);
      } catch {
        payload = null;
      }
      const userFacing = (payload?.connections ?? []).filter((c) =>
        (USER_FACING_CONNECTOR_IDS as readonly string[]).includes(c.id),
      );
      const rows: SettingsSectionProjection["rows"] = [];
      if (userFacing.length > 0) {
        rows.push({ kind: "note", id: "cat-business", text: "Business" });
        for (const c of userFacing) {
          const backed = c.actions.find(
            (a) => a.enabled && (a.kind === "connect" || a.kind === "disconnect"),
          );
          rows.push({
            kind: "connection" as const,
            id: c.id,
            title: c.display_name.replace(/^Your /, ""),
            subtitle: c.powers,
            status: c.status,
            statusLabel: c.status_label,
            detail: c.status_detail,
            gateReason:
              c.gate && c.gate.reason_plain !== c.status_detail
                ? c.gate.reason_plain
                : null,
            lastVerifiedLabel: c.last_verified_at
              ? `Last checked ${c.last_verified_at.slice(0, 10)}`
              : "Never checked",
            action: backed
              ? {
                  id: backed.kind === "connect" ? "google-connect" : "google-disconnect",
                  label: backed.kind === "connect" ? "Connect" : "Disconnect",
                }
              : null,
            hasRealFlow: Boolean(backed),
          });
        }
      } else if (!payload) {
        rows.push({
          kind: "note",
          id: "load-failed",
          text: "Could not check your connectors. Try again.",
        });
      } else {
        rows.push({ kind: "note", id: "cat-business", text: "Business" });
        rows.push({
          kind: "note",
          id: "no-user-tools",
          text: "No tools to connect yet.",
        });
      }
      rows.push(
        { kind: "note", id: "cat-custom", text: "Custom" },
        {
          kind: "nav",
          id: "saved-logins",
          title: "Saved logins",
          target: "saved-logins",
        },
      );
      return {
        key,
        title: "Connectors",
        lede: "Tools you connect yourself.",
        rows,
      };
    }
    case "connector-permissions": {
      // R20 F-9(f), v2 - PERMISSIONS. It binds to a real setting:
      // the Soul assistance level (the one assistance-preference
      // record Opal's proactivity machinery already obeys;
      // PATCH /memory-wallet/soul accepts the level on its own and
      // reads it back). There is no per-tool permission store in
      // Opal today, so no per-tool switches are painted. V2 sheds
      // the essay: plain-word rows only - the level control above
      // the rows, one short line naming that this is Soul's same
      // setting, and two doorways. No paragraphs.
      try {
        const res = await getSoulMemory(bearer);
        return {
          key,
          title: "Permissions",
          lede: "When Opal asks before it acts.",
          rows: [
            {
              kind: "value",
              id: "assistance_level",
              title: "How forward may Opal be?",
              value: res.soul.assistance_level,
            },
            {
              kind: "note",
              id: "permissions-same-setting",
              text: "Same setting as Soul.",
            },
            {
              kind: "nav",
              id: "to-connectors",
              title: "Connectors",
              target: "connections",
            },
            {
              kind: "nav",
              id: "to-soul",
              title: "Soul",
              target: "soul",
            },
          ],
        };
      } catch {
        return {
          key,
          title: "Permissions",
          lede: "When Opal asks before it acts.",
          rows: [{ kind: "note", id: "load-failed", text: "Your permissions could not load. Try again." }],
        };
      }
    }
    case "private-graphs": {
      // R20 F-4 — the vault's credential home. Both rows are the
      // server's ONE graph-lock projection (getGraphLock); the form
      // in C2SettingsSection writes through the same endpoints the
      // gate verifies against. A failed read yields the honest note,
      // never a guessed state.
      try {
        const lock = await getGraphLock(bearer);
        return {
          key,
          title: "Private graphs",
          lede: "The passcode and biometrics that open your Private graphs.",
          rows: [
            {
              kind: "value",
              id: "vault_passcode_set",
              title: "Passcode",
              value: lock.passcode_set ? "Set" : "Not set",
            },
            {
              kind: "value",
              id: "vault_biometric_enabled",
              title: "Biometric unlock",
              value: lock.biometric_enabled ? "On" : "Off",
            },
          ],
        };
      } catch {
        return {
          key,
          title: "Private graphs",
          lede: "The passcode and biometrics that open your Private graphs.",
          rows: [
            {
              kind: "note",
              id: "vault-load-failed",
              text: "Could not read your Private graphs settings. Head back and try again - Opal will not guess them.",
            },
          ],
        };
      }
    }
    case "privacy":
      return {
        key,
        title: "Privacy",
        lede: "You choose who sees what. Opal follows it.",
        rows: [
          {
            // Audit A4 — plain-language card. Every claim names a
            // control that exists on the pages below it: the memory
            // facts you can read and forget, the sources with their
            // real status and disconnect, and the policy document.
            kind: "note",
            id: "privacy-card",
            text: "In plain words: what Opal holds for you lives in What Opal remembers, where you can read every fact and forget any of them. The tools you connect yourself live in Connectors, each with its real status - and disconnecting stops it right away. Opal's full Privacy Policy is one tap below.",
          },
          { kind: "nav", id: "remembers", title: "What Opal remembers", target: "what-opal-remembers" },
          { kind: "nav", id: "sources", title: "Connectors", target: "connections" },
          { kind: "nav", id: "connections", title: "Connectors", target: "connections" },
          {
            // Audit A7 — about Opal's messages. The claims match the
            // enforced honesty rules: provenance labels on what Opal
            // makes, and uncertainty is always said out loud.
            kind: "note",
            id: "about-messages",
            text: "About Opal's messages: Opal's messages are generated. The plans and facts Opal states come from your plans and the sources you connected - and anything Opal is unsure of, it has to say so, never state it as fact.",
          },
          {
            // Audit A8 — rows open Opal's own published documents,
            // shipped in the app bundle (/privacy.html, /terms.html).
            kind: "action",
            id: "privacy-policy",
            title: "Privacy Policy",
            subtitle: "Opal's published privacy document",
          },
          {
            kind: "action",
            id: "terms-of-service",
            title: "Terms of Service",
            subtitle: "Opal's published terms",
          },
          {
            kind: "note",
            id: "privacy-note",
            text: "Per-Graph visibility, join requests, and blocked lists do not have a settings API yet, so they live on each Graph and in Safety - not as switches here that would flip nothing.",
          },
        ],
      };
    case "help-support":
      // Audit A6 — a doorway where every row opens something real.
      // Written help articles are not published yet, so there is no
      // Help row pretending to be one; the two real doors are here.
      return {
        key,
        title: "Help & support",
        lede: "A person reads everything sent from here.",
        rows: [
          { kind: "nav", id: "report", title: "Report a problem", target: "report-problem" },
          { kind: "nav", id: "feedback", title: "Submit feedback", target: "submit-feedback" },
          {
            kind: "note",
            id: "help-articles-note",
            text: "Written help articles are not published yet, so there is no help library to open. For now, report a problem or send feedback and a person will read it.",
          },
        ],
      };
    case "report-problem":
      // Audit A5 — the form itself renders in C2SettingsSection
      // (keyed by this section key); these rows are the disclosure,
      // and they list exactly what a submission includes.
      return {
        key,
        title: "Report a problem",
        lede: "What went wrong? A person reads every report.",
        rows: [
          {
            kind: "note",
            id: "disclosure",
            text: "What is included: your words, the kind of problem, the build of Opal you are using, where you started the report, and your account - so support can find it and reply. Nothing else is sent. Attachments are not part of reports yet - there is no capture Opal can attach honestly on the web today, so none is offered.",
          },
        ],
      };
    case "submit-feedback":
      return {
        key,
        title: "Submit feedback",
        lede: "Ideas and wishes go to the same reader as problem reports.",
        rows: [
          {
            kind: "note",
            id: "disclosure",
            text: "What is included: your words, marked as feedback, the build of Opal you are using, and your account. Nothing else is sent.",
          },
        ],
      };
    case "account-security":
      return {
        key,
        title: "Account and security",
        lede: "Your account, your call.",
        rows: [
          { kind: "nav", id: "devices", title: "Linked devices", target: "linked-devices" },
          { kind: "nav", id: "saved-logins", title: "Saved logins", target: "saved-logins" },
          { kind: "nav", id: "help", title: "Help & support", target: "help-support" },
          { kind: "nav", id: "delete", title: "Delete my data or account", target: "delete-account" },
          {
            kind: "note",
            id: "delete-note",
            text: "Deleting is self-serve and permanent. The delete page names exactly what goes - including what happens to plans you share - before anything happens.",
          },
        ],
      };
    default:
      return {
        key,
        title: "Settings",
        lede: "",
        rows: [{ kind: "note", id: "missing", text: "That section is not part of this build." }],
      };
  }
}

export { loadProfile };
export type { ProductSession };

/**
 * Repair #19 W13 - the ONE share-card adapter. Input is the plan's
 * real GraphDetailProjection (itself built from the plan contract +
 * the history projection's real roster). Output is finished strings
 * only. Rules: people line names at most the first three roster
 * names, then "+ N more"; no roster -> null (the card renders no
 * people row, never a guessed guest list); the text artifact is the
 * same lines the card shows, plus the state label - what you see is
 * exactly what Copy shares.
 */
export function shareCardFromDetail(
  detail: GraphDetailProjection,
): import("./projections").EventShareCardProjection {
  const names = detail.who.map((p) => p.name).filter(Boolean);
  const peopleLine =
    names.length === 0
      ? null
      : names.length <= 3
        ? names.join(", ")
        : `${names.slice(0, 3).join(", ")} + ${names.length - 3} more`;
  const whereLine = detail.where?.label?.trim() ? detail.where.label : null;
  const textLines = [
    detail.title,
    detail.card.stateLabel,
    detail.whenLine,
    ...(whereLine ? [whereLine] : []),
    ...(detail.attendanceLine ? [detail.attendanceLine] : []),
    ...(peopleLine ? [`With ${peopleLine}`] : []),
  ];
  return {
    planId: detail.id,
    stateFamily: detail.card.stateFamily,
    stateLabel: detail.card.stateLabel,
    title: detail.title,
    whenLine: detail.whenLine,
    whereLine,
    attendanceLine: detail.attendanceLine ?? null,
    peopleLine,
    textLines,
  };
}
