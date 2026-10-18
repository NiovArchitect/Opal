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
  getAssistPreference,
  getGoogleCalendarStatus,
  getHomeTimezone,
  getMessagingPreferences,
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

export function graphListFromPlans(plans: OpalPlanContract[]): GraphListProjection {
  const cards = plans.map((plan) => {
    const card = cardFromPlan(plan);
    const family = familyOfStatus(plan.status);
    const completion = family === "forming" ? missingSlot(plan) : null;
    // Drop it is NOT rendered in this base: no plan-cancel path exists
    // anywhere in the web client or its API surface (verified by
    // search), and a control that cannot perform its operation is a
    // defect. It returns when Division A ships the cancel intent.
    return { plan, card: { ...card, completionAction: completion, droppable: false } };
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
    where: plan.location?.trim()
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

export async function loadPlans(bearer?: string): Promise<OpalPlanContract[]> {
  try {
    const res = await listOpalPlans(bearer);
    return res.plans ?? [];
  } catch {
    return [];
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
        return {
          id: r.id,
          personName,
          avatar: avatarOf(personName, i + 1),
          seen: Boolean(r.seen),
          ringKind: r.seen ? ("seen" as const) : ("unseen" as const),
          storyCount: 1,
        };
      })
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
  } catch {
    stories = [];
  }
  const plans = await loadPlans(bearer);
  return {
    header: { ownAvatar: self },
    rail: {
      self: { avatar: self, hasLiveStory: false, liveStoryLabel: null },
      stories,
      capabilities: { canPost: true, canStory: true },
    },
    feed: plans.slice(0, 10).map((plan) => ({
      kind: "plan" as const,
      id: plan.id,
      card: cardFromPlan(plan),
    })),
  };
}

export function youHubFromSession(
  session: ProductSession | null,
  googleConnected: boolean | null,
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
        : googleConnected
          ? "Google Calendar connected."
          : "Google Calendar not connected.",
    index: [
      { key: "edit-profile", title: "Edit profile", subtitle: "Name and username", keywords: "name username handle photo profile" },
      { key: "appearance", title: "Appearance", subtitle: "Pick your light", keywords: "mode light dark theme appearance" },
      { key: "privacy", title: "Privacy", subtitle: "You choose who sees what", keywords: "privacy visibility blocked muted" },
      { key: "calls-assist", title: "Opal Assist and calls", subtitle: "Help on calls, only when you say so", keywords: "assist calls phone" },
      { key: "what-opal-remembers", title: "What Opal remembers", subtitle: "Facts Opal keeps, and forgetting them", keywords: "memory remembers forget facts" },
      { key: "care", title: "Care and household", subtitle: "Check-in rotations and your household pod", keywords: "care rotation household pod family check in" },
      { key: "connected-sources", title: "Connected sources", subtitle: googleConnected ? "Google Calendar connected" : "Google Calendar", keywords: "connected sources google calendar email" },
      { key: "notifications", title: "Notifications", subtitle: "Loud for people. Quiet for noise.", keywords: "notifications messages calls receipts" },
      { key: "linked-devices", title: "Linked devices", subtitle: "Where you are signed in", keywords: "devices sessions phone desktop" },
      { key: "location-travel", title: "Location and travel", subtitle: "Timing that follows you", keywords: "location travel timezone home" },
      { key: "account-security", title: "Account and security", subtitle: "Your account, your call", keywords: "account security delete sign in" },
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
          title: "Notifications",
          lede: "Loud for people. Quiet for noise.",
          rows: [
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
          ],
        };
      } catch {
        return {
          key,
          title: "Notifications",
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
    case "linked-devices":
      return {
        key,
        title: "Linked devices",
        lede: "Where you are signed in.",
        rows: [
          {
            kind: "value",
            id: "this-phone",
            title: "This device",
            subtitle: "Primary device for this account - this session",
            value: "Active",
          },
          {
            kind: "note",
            id: "roster-note",
            text: "Other sessions are not listed yet - there is no device roster to read them from, so nothing here pretends to revoke one.",
          },
        ],
      };
    case "connected-sources": {
      try {
        const status = await getGoogleCalendarStatus(bearer);
        return {
          key,
          title: "Connected sources",
          lede: "Real connections, with their real status.",
          rows: [
            {
              kind: "value",
              id: "google-status",
              title: "Google Calendar",
              subtitle: status.last_synced_at
                ? `Last checked ${status.last_synced_at}`
                : "Calendar and email, read only",
              value: status.connected ? "Connected" : "Not connected",
            },
            {
              kind: "action",
              id: status.connected ? "google-disconnect" : "google-connect",
              title: status.connected ? "Disconnect Google" : "Connect Google",
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
                  subtitle: `${fact.value} - tap to forget`,
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
    case "privacy":
      return {
        key,
        title: "Privacy",
        lede: "You choose who sees what. Opal follows it.",
        rows: [
          { kind: "nav", id: "remembers", title: "What Opal remembers", target: "what-opal-remembers" },
          { kind: "nav", id: "sources", title: "Connected sources", target: "connected-sources" },
          {
            kind: "note",
            id: "privacy-note",
            text: "Per-Graph visibility, join requests, and blocked lists do not have a settings API yet, so they live on each Graph and in Safety - not as switches here that would flip nothing.",
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
          {
            kind: "note",
            id: "delete-note",
            text: "Deleting your account goes through Opal support today. There is no delete button here, because a button that does not delete would be a lie.",
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
