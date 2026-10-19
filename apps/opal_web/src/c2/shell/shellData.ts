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
  getAssistPreference,
  getDeviceRoster,
  getSoulMemory,
  getGoogleCalendarStatus,
  getHomeTimezone,
  getIngestionStatus,
  getMessagingPreferences,
  getPersonalInviteCode,
  getSavedLogins,
  getSettingsConnections,
  listMemoryFacts,
  listOpalPlans,
  listTemporaryStories,
  loadProfile,
  type OpalPlanContract,
  type ProductSession,
} from "../../api/productClient";
import type { PlanCardC2Input, PlanStateFamilyC2 } from "../PlanCardC2";
import type {
  AvatarRef,
  GraphDetailProjection,
  GraphListProjection,
  HomeProjection,
  SettingsSectionProjection,
  ShellProjection,
  YouHubProjection,
} from "./projections";
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
    whenLine: plan.time_label?.trim() ? plan.time_label : "Time not set yet.",
    whereLine: plan.location?.trim() ? plan.location : null,
    attendanceLine,
    primaryActionLabel: null,
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

export function graphListFromPlans(plans: OpalPlanContract[]): GraphListProjection {
  const cards = plans.map((plan) => {
    const card = cardFromPlan(plan);
    const family = familyOfStatus(plan.status);
    const completion = family === "forming" ? missingSlot(plan) : null;
    // Drop it is wired: confirming calls POST /opal/plans/:id/cancel
    // through cancelOpalPlan (see C2Shell's dropPlan handler) and the
    // list re-reads from the server, whose list excludes cancelled
    // plans. droppable is derived per plan by planDroppable above -
    // a card the route would refuse never renders the control.
    return { plan, card: { ...card, completionAction: completion, droppable: planDroppable(plan) } };
  });
  const groups: GraphListProjection["groups"] = [];
  const push = (
    id: string,
    kind: GraphListProjection["groups"][number]["kind"],
    title: string,
    rows: typeof cards,
  ) => {
    if (rows.length > 0) groups.push({ id, kind, title, cards: rows.map((r) => r.card) });
  };
  push(
    "needs-detail",
    "needs-detail",
    "Needs a day or a detail",
    cards.filter((c) => c.card.completionAction),
  );
  push(
    "coming-up",
    "coming-up",
    "Coming up",
    cards.filter(
      (c) => c.card.stateFamily === "ready" || c.card.stateFamily === "happening",
    ),
  );
  push(
    "someday",
    "someday",
    "Someday",
    cards.filter((c) => c.card.stateFamily === "forming" && !c.card.completionAction),
  );
  push(
    "action-group",
    "needs-detail",
    "Needs your answer",
    cards.filter((c) => c.card.stateFamily === "action"),
  );
  push(
    "past",
    "past",
    "Past",
    cards.filter((c) => c.card.stateFamily === "past"),
  );
  const count = (f: (c: (typeof cards)[number]) => boolean) => cards.filter(f).length;
  return {
    groups,
    lensCounts: {
      all: cards.length,
      action: count((c) => c.card.stateFamily === "action" || c.card.stateFamily === "forming"),
      ready: count((c) => c.card.stateFamily === "ready" || c.card.stateFamily === "happening"),
      past: count((c) => c.card.stateFamily === "past"),
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
    nextAction: null,
    activity: [],
    history: [],
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
): GraphDetailProjection {
  return {
    ...detail,
    who: history.who.map((person, i) => ({
      name: person.name,
      avatar: avatarOf(person.name, i + 1),
      responseLabel: person.response_label,
    })),
    history: history.history.map((row) => ({ line: row.line })),
    attendanceLine:
      typeof history.counts.going_count === "number" &&
      typeof history.counts.total_count === "number"
        ? `${history.counts.going_count} of ${history.counts.total_count} going`
        : detail.attendanceLine,
  };
}

export function openingFromPlans(
  plans: OpalPlanContract[],
  ownName: string,
): CenterOpeningProjection {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";
  const cards = plans.map((plan) => ({ plan, card: cardFromPlan(plan) }));
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

export async function loadPlans(bearer?: string): Promise<OpalPlanContract[]> {
  const res = await loadPlansResult(bearer);
  return res.plans;
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
): Promise<HomeProjection> {
  const name = session?.display_name ?? "You";
  const self = avatarOf(name);
  let stories: HomeProjection["rail"]["stories"] = [];
  try {
    const res = await listTemporaryStories(bearer);
    stories = (res.stories ?? [])
      .map((record, i) => {
        const r = record as Record<string, unknown>;
        const personName =
          (typeof r.author_name === "string" && r.author_name) ||
          (typeof r.user_name === "string" && r.user_name) ||
          (typeof r.display_name === "string" && r.display_name) ||
          null;
        if (!personName || typeof r.id !== "string") return null;
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
        return {
          id: r.id,
          personName,
          avatar: avatarOf(personName, i + 1),
          seen: Boolean(r.seen),
          ringKind: r.seen ? ("seen" as const) : ("unseen" as const),
          storyCount: 1,
          mediaUrl,
          caption: typeof r.caption === "string" ? r.caption : null,
        };
      })
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
  } catch {
    stories = [];
  }
  const plansResult = await loadPlansResult(bearer);
  const plans = plansResult.plans;
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
      .map((o) => {
        const actor = (o.actor ?? {}) as Record<string, unknown>;
        const authorName =
          typeof actor.display_name === "string" && actor.display_name
            ? actor.display_name
            : "Someone";
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
          contextLine:
            typeof o.caption === "string" && o.caption ? o.caption : "Memory",
          authorLine: authorName,
        };
      })
      .filter((m) => m.id && m.id !== "undefined");
  } catch {
    feedError = feedError ?? "Your feed did not load. Check your connection and try again.";
  }
  return {
    header: { ownAvatar: self },
    rail: {
      self: { avatar: self, hasLiveStory: false, liveStoryLabel: null },
      stories,
      capabilities: { canPost: true, canStory: true },
    },
    feed: [
      ...moments,
      ...plans.slice(0, 10).map((plan) => ({
        kind: "plan" as const,
        id: plan.id,
        card: cardFromPlan(plan),
      })),
    ].slice(0, 14),
    feedError,
  };
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
        ? "Connected sources are checked when you open them."
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
      { key: "soul-memory", title: "Soul + Memory", subtitle: "How Opal is with you, and what it holds", keywords: "soul memory persona tone how opal speaks" },
      { key: "what-opal-remembers", title: "What Opal remembers", subtitle: "Facts Opal keeps, and forgetting them", keywords: "memory remembers forget facts permissions" },
      { key: "how-opal-helps", title: "How Opal helps", subtitle: "How forward Opal may be", keywords: "helps proactive forward assist offers suggestions" },
      { key: "calls-assist", title: "Opal Assist and calls", subtitle: "Help on calls, only when you say so", keywords: "assist calls phone" },
      { key: "approvals-activity", title: "Approvals + activity", subtitle: "What Opal did, and what awaits you", keywords: "approvals activity trail history export" },
      { key: "what-opal-hears", title: "What Opal hears", subtitle: "Where Opal's memory comes from", keywords: "hears listens chats calls texts room meetings sources" },
      { key: "connections", title: "Connections", subtitle: "Every connection, with its real status", keywords: "connections connected sources google deepseek twilio places flights status" },
      { key: "care", title: "Care and household", subtitle: "Check-in rotations and your household pod", keywords: "care rotation household pod family check in" },
      { key: "connected-sources", title: "Connected sources", subtitle: googleConnected === "simulated" ? "Google Calendar - simulated, not real" : googleConnected ? "Google Calendar connected" : "Google Calendar", keywords: "connected sources google calendar email" },
      { key: "privacy", title: "Privacy", subtitle: "You choose who sees what", keywords: "privacy visibility blocked muted account data rights" },
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
              text: "Opal already keeps quiet hours (10 PM to 8 AM) for anything it brings you. Setting your own hours here is not built yet, so there is no switch for it that would change nothing.",
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
            text: "Delete my data removes what Opal holds for you: your memories, how Opal is set up for you, your chats with Opal, your saved logins, and your connections. Your account stays, and you can keep using Opal.",
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
    case "connected-sources": {
      try {
        const status = await getGoogleCalendarStatus(bearer);
        // HA-01 at the glass (FR-18-09): simulated provenance is
        // checked BEFORE `connected` — a simulated row also carries
        // connected=true on the wire and must never paint "Connected".
        const simulated =
          status.simulated === true || status.status === "connected_simulated";
        return {
          key,
          title: "Connected sources",
          lede: "Real connections, with their real status.",
          rows: [
            {
              kind: "value",
              id: "google-status",
              title: "Google Calendar",
              subtitle: simulated
                ? "A test stand-in, not a real Google sign-in"
                : status.last_synced_at
                  ? `Last checked ${status.last_synced_at}`
                  : "Calendar and email, read only",
              value: simulated
                ? "Simulated - not a real connection"
                : status.connected
                  ? "Connected"
                  : "Not connected",
            },
            {
              kind: "action",
              id: simulated || status.connected ? "google-disconnect" : "google-connect",
              title: simulated || status.connected ? "Disconnect Google" : "Connect Google",
            },
          ],
        };
      } catch {
        return {
          key,
          title: "Connected sources",
          lede: "Real connections, with their real status.",
          rows: [{ kind: "note", id: "load-failed", text: "Connection status could not load. Head back and try again." }],
        };
      }
    }
    case "what-opal-remembers": {
      try {
        const res = await listMemoryFacts(bearer);
        return {
          key,
          title: "What Opal remembers",
          lede: "Facts Opal keeps for you. Forget any of them, for real.",
          rows:
            res.facts.length === 0
              ? [{ kind: "note", id: "none", text: "Opal is not keeping any facts yet." }]
              : res.facts.map((fact) => ({
                  kind: "action" as const,
                  id: `forget-${fact.id}`,
                  title: fact.label,
                  subtitle: `${fact.value} - tap, then confirm to forget`,
                })),
        };
      } catch {
        return {
          key,
          title: "What Opal remembers",
          lede: "Facts Opal keeps for you. Forget any of them, for real.",
          rows: [{ kind: "note", id: "load-failed", text: "What Opal remembers could not load. Head back and try again." }],
        };
      }
    }
    case "soul-memory": {
      // 12.2 - Repair #18 SM scoped build (W-GAP-31 first form): the
      // Soul card edits the REAL assistance-preference truth (the
      // same record Opal's help already follows - no parallel store),
      // and the Memory card lists this account's capsules with their
      // provenance, each forgettable for real through the wallet
      // API. Value rows below carry the soul fields the C2You form
      // edits (the edit-profile pattern); capsule rows are actions
      // whose first tap only arms the confirm in the shell.
      try {
        const res = await getSoulMemory(bearer);
        const soul = res.soul;
        return {
          key,
          title: "Soul + Memory",
          lede: "How Opal is with you, and what it holds - yours to read, change, and forget.",
          rows: [
            {
              kind: "value",
              id: "assistance_level",
              title: "How forward Opal may be",
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
              title: "Completion feedback",
              value: soul.completion_feedback,
            },
            {
              kind: "note",
              id: "memory-heading",
              text:
                res.capsules.length === 0
                  ? "What Opal remembers - Opal is not keeping any memories for you yet."
                  : `What Opal remembers - ${res.capsule_count} ${res.capsule_count === 1 ? "memory" : "memories"}, each with where it came from. Tap one, then confirm, to forget it for good.`,
            },
            ...res.capsules.map((capsule) => ({
              kind: "action" as const,
              id: `forget-capsule-${capsule.id}`,
              title: capsule.summary ?? "A memory",
              subtitle: `${capsule.provenance_label ?? "Saved with Opal"} - tap, then confirm to forget`,
            })),
            { kind: "nav", id: "remembers", title: "What Opal remembers", target: "what-opal-remembers" },
          ],
        };
      } catch {
        return {
          key,
          title: "Soul + Memory",
          lede: "How Opal is with you, and what it holds - yours to read, change, and forget.",
          rows: [
            {
              kind: "note",
              id: "load-failed",
              text: "Soul + Memory could not load. Head back and try again.",
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
              kind: "note",
              id: "modes-gate",
              text: "Choosing how forward Opal may be in one place is not built yet. Until it is, Opal's offers stay off unless you turn them on, Opal asks once and never nags, and a no is final.",
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
    case "approvals-activity":
      // 12.5 — no page holds approvals or the activity trail yet
      // (gap F-GAP-5). Honest gated destination, no painted queue.
      return {
        key,
        title: "Approvals + activity",
        lede: "What Opal did, and what awaits you.",
        rows: [
          {
            kind: "note",
            id: "approvals-gate",
            text: "Anything Opal needs your say-so for appears where the work happens - on a plan's page or in a check-in. One place for approvals, what you decided before, and a plain trail of what Opal has done is not built yet, so nothing here is listed as if it were.",
          },
          {
            kind: "note",
            id: "export-gate",
            text: "Getting your data out will live under Privacy + account. It is not built yet either - there is no export button here, because a button that does not export would be a lie.",
          },
        ],
      };
    case "what-opal-hears": {
      // 12.6 + spec SF-A — each source carries its OWN state line and
      // progress in words, rendered from that source's own read
      // (GET /settings/hears derives per source from the D-ING
      // register). One source in error shows its own error line and
      // a retry for that source only (ER-2); it never blanks the
      // page. Without a session there is no per-account read, so the
      // honest static form below names the sources without states
      // that pretend to be yours.
      if (bearer) {
        try {
          const sources = await getIngestionStatus(bearer);
          return {
            key,
            title: "What Opal hears",
            lede: "Where Opal's memory comes from - each source with its own state, read on its own.",
            rows: [
              ...sources.flatMap((line) => [
                {
                  kind: "value" as const,
                  id: line.source,
                  title: line.title,
                  subtitle: line.progress,
                  value: line.state_label,
                },
                ...(line.error && line.retryable
                  ? [{
                      kind: "action" as const,
                      id: `hears-retry-${line.source}`,
                      title: `Try ${line.title} again`,
                      subtitle: "Retries this source only",
                    }]
                  : []),
              ]),
              { kind: "nav" as const, id: "connections", title: "Connections", target: "connections" },
              { kind: "nav" as const, id: "assist", title: "Opal Assist and calls", target: "calls-assist" },
            ],
          };
        } catch {
          return {
            key,
            title: "What Opal hears",
            lede: "Where Opal's memory comes from - each source with its real state.",
            rows: [{ kind: "note", id: "load-failed", text: "What Opal hears could not load. Head back and try again." }],
          };
        }
      }
      return {
        key,
        title: "What Opal hears",
        lede: "Where Opal's memory comes from - each source with its real state.",
        rows: [
          { kind: "value", id: "chats", title: "Chats in the app", subtitle: "Your conversations here are Opal's working source today.", value: "Working now" },
          { kind: "value", id: "calls", title: "Phone calls", subtitle: "Opal cannot listen to or write down a live call yet. Nothing is recorded in secret.", value: "Not wired yet" },
          { kind: "value", id: "texts", title: "Texts", subtitle: "Texts do not reach Opal today, and are never faked.", value: "Waiting on a sending number" },
          { kind: "value", id: "room", title: "Listening in the room", subtitle: "There is no room listening in Opal, hidden or otherwise.", value: "Not in Opal today" },
          { kind: "value", id: "meetings", title: "Meetings", subtitle: "Zoom and other meetings are a future source, named here so the place exists.", value: "Coming later" },
          { kind: "nav", id: "connections", title: "Connections", target: "connections" },
          { kind: "nav", id: "assist", title: "Opal Assist and calls", target: "calls-assist" },
        ],
      };
    }
    case "connections": {
      // DIR-2 — renders the server's settings/connections projection
      // verbatim (SP-3). Status, label, detail, and gate all arrive
      // finished; this adapter maps fields, it derives nothing.
      try {
        const payload = await getSettingsConnections(bearer);
        // Audit A1 — the catalog form: rows grouped under their
        // plain category names, exactly the provider set the server
        // reports (nothing painted to fill a category). The slot
        // for custom connections is reserved in words only, at the
        // end — the capability itself is founder-gated and absent.
        const categoryNames: Record<string, string> = {
          intelligence: "Thinking and words",
          voice: "Voice",
          phone_and_messaging: "Phone and messaging",
          places_and_search: "Places and search",
          travel: "Travel",
          your_accounts: "Your accounts",
          payments: "Payments",
        };
        const rows: SettingsSectionProjection["rows"] = [];
        let lastCategory: string | null = null;
        for (const c of payload.connections) {
          const categoryName = categoryNames[c.category] ?? c.category;
          if (categoryName !== lastCategory) {
            rows.push({ kind: "note", id: `cat-${c.category}`, text: categoryName });
            lastCategory = categoryName;
          }
          rows.push({
            kind: "connection" as const,
            id: c.id,
            title: c.display_name,
            subtitle: c.powers,
            status: c.status,
            statusLabel: c.status_label,
            detail: c.status_detail,
            gateReason: c.gate ? c.gate.reason_plain : null,
            lastVerifiedLabel: c.last_verified_at
              ? `Last checked ${c.last_verified_at.slice(0, 10)}`
              : "Never checked",
          });
        }
        rows.push({
          kind: "note",
          id: "custom-slot",
          text: "Connecting a service of your own is not something Opal offers today. If it ever does, it will appear here, in this list.",
        });
        const google = payload.connections.find((c) => c.id === "google_calendar");
        const googleAction = google?.actions.find(
          (a) => a.enabled && (a.kind === "connect" || a.kind === "disconnect"),
        );
        if (google && googleAction) {
          rows.push({
            kind: "action",
            id: googleAction.kind === "connect" ? "google-connect" : "google-disconnect",
            title: googleAction.kind === "connect" ? "Connect Google" : "Disconnect Google",
          });
        }
        return {
          key,
          title: "Connections",
          lede: "Every connection Opal uses, with the status the server last checked - never a guess.",
          rows:
            payload.connections.length === 0
              ? [{ kind: "note", id: "none", text: "No connections are set up on this server yet." }]
              : rows,
        };
      } catch {
        return {
          key,
          title: "Connections",
          lede: "Every connection Opal uses, with the status the server last checked - never a guess.",
          rows: [
            {
              kind: "note",
              id: "load-failed",
              text: "Could not check connections. Head back and try again - Opal will not guess a status.",
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
            text: "In plain words: what Opal holds for you lives in What Opal remembers, where you can read every fact and forget any of them. What Opal can check outside the app lives in Connected sources and Connections, each with its real status - and disconnecting stops it right away. Opal's full Privacy Policy is one tap below.",
          },
          { kind: "nav", id: "remembers", title: "What Opal remembers", target: "what-opal-remembers" },
          { kind: "nav", id: "sources", title: "Connected sources", target: "connected-sources" },
          { kind: "nav", id: "connections", title: "Connections", target: "connections" },
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
