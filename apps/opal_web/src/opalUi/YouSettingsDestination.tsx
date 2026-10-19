/**
 * Nested You settings destinations — navigable from You hub 618:1344.
 * Dock remains owned by parent OpalApp (do not duplicate).
 * Paste W Phase 5 / L8: file loose hub sections into settings homes (do not delete):
 *   WhatOpalCanDoSection → Calls & Opal Assist
 *   WhatOpalRemembersSection (+ Celebrations) → Privacy
 *   InviteFriendsSection → Feed & discovery
 * Phase 10A / D-2: CelebrationsSection stays with What Opal remembers.
 * D-2 adds curation ("What would Maya love?") + Plan this → Opal Center.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  COMFORT_LEVEL_OPTIONS,
  createCelebration,
  createProductInvite,
  curateCelebration,
  deleteCelebration,
  deleteFinancialProfile,
  forgetMemoryFact,
  getFinancialProfile,
  getGoogleCalendarStatus,
  getGraphingPolicy,
  grantConsent,
  listCelebrations,
  listConsents,
  listProductInvites,
  listRelationshipAccessGrants,
  localProductInviteShareUrl,
  getTrustTier,
  grantInnerCircleTrust,
  revokeInnerCircleTrust,
  listMemoryFacts,
  listRelationships,
  postOpalMessage,
  revokeConsent,
  revokeGoogleCalendarConnection,
  revokeRelationshipAccessGrant,
  setFinancialProfile,
  setRelationshipType,
  startGoogleCalendarConnect,
  updateGraphingPolicy,
  upsertRelationshipAccessGrant,
  type Celebration,
  type CelebrationCuration,
  type ComfortLevel,
  type ConsentCapability,
  type ConsentProof,
  type FinancialProfile,
  type GoogleCalendarConnectionStatus,
  type GraphingMode,
  type GraphingPolicy,
  type MemoryFact,
  type ProductInvite,
  type ProductSession,
  type RelationshipAccessGrant,
  type RelationshipContact,
  type RelationshipTypeValue,
  type TrustTierInfo,
} from "../api/productClient";
import {
  RELATIONSHIP_TYPE_OPTIONS,
  relationshipTypeLabel,
} from "./relationshipTypes";
import { PersonMemoryView } from "./intelligence/PersonMemoryView";
import {
  APPEARANCE_OPTIONS,
  readAppearancePreference,
  setAppearancePreference,
  type AppearancePreference,
} from "../theme/appearanceTheme";
import {
  FIT_ACTIVITY_OPTIONS,
  WELLNESS_GOAL_OPTIONS,
  loadFitPreferences,
  saveFitPreferences,
  type FitActivityId,
  type FitPreferences,
  type WellnessGoal,
} from "./fitPreferences";

export type YouSettingKey =
  | "edit-profile"
  | "privacy"
  | "feed-discovery"
  | "location-travel"
  | "calls-assist"
  | "notifications"
  | "linked-devices"
  | "spending"
  | "fit"
  | "appearance"
  | "account-security"
  | "delete-account";

function normalizeTimezoneLabel(tz: string | null | undefined): string {
  return (tz || "").trim().toLowerCase();
}

/** Backend active wins; else device TZ ≠ home projects Adapting (not hardcoded Off). */
export function projectTravelModeLabel(
  active: boolean,
  deviceTz: string,
  homeTz: string,
): string {
  if (active) return "On";
  const device = normalizeTimezoneLabel(deviceTz);
  const home = normalizeTimezoneLabel(homeTz);
  if (device && home && device !== home) return "Adapting";
  return "Off";
}

/**
 * Repair #15 (DF) - Connected sources projection.
 * Pure projection of the real ProviderConnections status payload
 * (ConnectorController.google_status). Never invents a state: an absent
 * or failed status read stays "unknown" and the UI says it could not
 * check instead of guessing Connected / Not connected.
 */
export type GoogleConnectionProjection = {
  state: "connected" | "not_connected" | "simulated" | "unknown";
  label: string;
  detail: string;
};

/** "Oct 17, 8:02 AM" for a real ISO sync stamp; null when absent/invalid. */
export function formatConnectionSyncTime(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  } catch {
    return null;
  }
}

export function projectGoogleConnection(
  status: GoogleCalendarConnectionStatus | null | undefined,
  loadFailed = false,
): GoogleConnectionProjection {
  if (loadFailed) {
    return {
      state: "unknown",
      label: "Could not check",
      detail: "Opal could not check this connection. Try again.",
    };
  }
  if (!status) {
    return { state: "unknown", label: "Checking", detail: "Checking this connection." };
  }
  // HA-01 at the glass (Repair #18 DIR-2, FR-18-09): the backend has
  // carried the `simulated` provenance flag since 7726a678, and this
  // projection ignored it — a simulated Google row painted plain
  // "Connected". Provenance is checked FIRST, before `connected`:
  // a simulated connection can never render as connected, anywhere.
  if (status.simulated === true || status.status === "connected_simulated") {
    return {
      state: "simulated",
      label: "Simulated - not a real connection",
      detail:
        "This is a test stand-in, not a real Google sign-in. Disconnect it, then connect Google for real when you are ready.",
    };
  }
  if (status.connected) {
    // Repair #17 W5 — status refinement: when the backend reports a real
    // last sync, say when. Absent or unparseable stays unpainted (never
    // a guessed freshness claim).
    const synced = formatConnectionSyncTime(status.last_synced_at);
    return {
      state: "connected",
      label: "Connected",
      detail:
        "Opal can check busy times when a plan needs a time. Disconnecting stops that right away." +
        (synced ? ` Last checked ${synced}.` : ""),
    };
  }
  if (status.status === "revoked") {
    return {
      state: "not_connected",
      label: "Not connected",
      detail: "You disconnected this. Sharing your availability by hand still works.",
    };
  }
  return {
    state: "not_connected",
    label: "Not connected",
    detail: "Connect so Opal can check busy times when a plan needs a time.",
  };
}

export const YOU_SETTING_FIGMA: Record<YouSettingKey, string> = {
  "edit-profile": "618:2123",
  privacy: "618:1524",
  "feed-discovery": "618:1801",
  "location-travel": "618:1591",
  "calls-assist": "618:1733",
  notifications: "618:1935",
  "linked-devices": "618:2003",
  spending: "618:1662",
  fit: "618:1662",
  appearance: "618:1344",
  "account-security": "618:2180",
  "delete-account": "618:2243",
};

type Row =
  | {
      kind: "toggle";
      id: string;
      title: string;
      subtitle: string;
      defaultOn?: boolean;
      /** Honest external/product blocker — never a vague coming-soon label. */
      blockedReason?: string;
    }
  | {
      kind: "nav";
      id: string;
      title: string;
      subtitle: string;
      value?: string;
      /** Nested dated setting opened from this row */
      opens?: YouSettingKey;
      /** Honest blocker when the nested surface is not buildable yet. */
      blockedReason?: string;
    }
  | {
      kind: "action";
      id: string;
      title: string;
      destructive?: boolean;
      opens?: YouSettingKey;
      /** Honest blocker when the action cannot run yet. */
      blockedReason?: string;
    }
  | { kind: "note"; id: string; text: string }
  | {
      kind: "field";
      id: string;
      label: string;
      value: string;
      placeholder?: string;
      blockedReason?: string;
    };

type ScreenDef = {
  title: string;
  lede: string;
  rows: Row[];
};

const SCREENS: Record<YouSettingKey, ScreenDef> = {
  "edit-profile": {
    title: "Edit profile",
    lede: "Your name and handle.",
    rows: [
      { kind: "field", id: "name", label: "Name", value: "", placeholder: "Your name" },
      { kind: "field", id: "username", label: "Username", value: "", placeholder: "@handle" },
      {
        kind: "field",
        id: "bio",
        label: "Bio",
        value: "Keep it short. Let your Graph speak.",
        placeholder: "Keep it short. Let your Graph speak.",
        blockedReason: "Bio is not on the user profile API yet - name and username save.",
      },
      {
        kind: "note",
        id: "identity-note",
        text: "Phone number changes under Account & security.",
      },
      { kind: "action", id: "save", title: "Save profile" },
    ],
  },
  privacy: {
    title: "Privacy",
    lede: "Choose what Opal can understand and use.",
    rows: [
      {
        kind: "toggle",
        blockedReason: "Needs per-Graph audience API - not wired yet.",
        id: "graph-visibility",
        title: "Graph visibility",
        subtitle: "Choose who can see each Graph. Per-Graph choice wins.",
        defaultOn: true,
      },
      {
        kind: "toggle",
        blockedReason: "Needs live location share session API.",
        id: "exact-location",
        title: "Exact location after join",
        subtitle: "Share the exact spot only with approved participants.",
        defaultOn: true,
      },
      {
        kind: "toggle",
        blockedReason: "Needs engagement-count preference on SocialMoments.",
        id: "public-counts",
        title: "Public engagement counts",
        subtitle: "Show likes, comments and repost counts on public content.",
        defaultOn: true,
      },
      {
        kind: "nav",
        id: "join-requests",
        title: "Join requests",
        subtitle: "Friends, connections, followers or nobody",
        blockedReason: "Join-request policy API not shipped.",
      },
      {
        kind: "nav",
        id: "blocked-muted",
        title: "Blocked & muted",
        subtitle: "People and content you have limited",
        blockedReason: "Use Safety → Blocked / Muted once those lists ship.",
      },
      {
        kind: "note",
        id: "privacy-law",
        text: "Opal's location use is separate from what others can see.",
      },
    ],
  },
  "feed-discovery": {
    title: "Feed & discovery",
    lede: "Invite people into your world.",
    rows: [
      {
        kind: "toggle",
        blockedReason: "Feed ranking prefs need a product preferences API.",
        id: "people-first",
        title: "People you know first",
        subtitle: "Weight connections and real conversation history before strangers.",
        defaultOn: true,
      },
      {
        kind: "toggle",
        blockedReason: "Needs location permission + discovery index.",
        id: "local-discovery",
        title: "Local discovery",
        subtitle: "Show relevant people, places and experiences near where you are.",
        defaultOn: true,
      },
      {
        kind: "nav",
        id: "nearby-range",
        title: "Nearby range",
        subtitle: "Default discovery distance. Per-search intent can expand it.",
        blockedReason: "Needs discovery-distance preference API - not wired yet.",
      },
      {
        kind: "toggle",
        blockedReason: "Suggested-people ranking not exposed as a preference yet.",
        id: "suggested-people",
        title: "Suggested people",
        subtitle: "Allow relevant people you do not follow to appear occasionally.",
        defaultOn: false,
      },
      {
        kind: "toggle",
        blockedReason: "Suggested-experiences preference API not shipped.",
        id: "suggested-experiences",
        title: "Suggested experiences",
        subtitle: "Use interests, Graph history and local context for discovery.",
        defaultOn: true,
      },
      {
        kind: "note",
        id: "feed-law",
        text: "Exact location is never shared from here.",
      },
    ],
  },
  "location-travel": {
    title: "Location & travel",
    lede: "Opal adjusts timing when you travel. Home timezone stays editable.",
    rows: [
      {
        kind: "field",
        id: "home-timezone",
        label: "Home timezone",
        value: "",
        placeholder: "America/Los_Angeles",
      },
      {
        kind: "action",
        id: "save-home-timezone",
        title: "Save home timezone",
      },
      {
        kind: "toggle",
        blockedReason: "Needs device location permission + ETA service.",
        id: "timing",
        title: "Use location for timing",
        subtitle: "ETA, leave time, nearby relevance and buffers.",
        defaultOn: true,
      },
      {
        kind: "toggle",
        blockedReason: "Live share needs a time-bounded location session API.",
        id: "live-share",
        title: "Share live location",
        subtitle: "Off by default. Share only when you explicitly choose.",
        defaultOn: false,
      },
      {
        kind: "nav",
        id: "travel-mode",
        title: "Travel mode",
        subtitle: "Quiet hours and plan times shift when this phone’s timezone differs from home.",
        value: "Off",
      },
      {
        kind: "nav",
        id: "home-area",
        title: "Home area",
        subtitle: "Where timing and local fit start from",
        blockedReason: "Home-area editor needs places storage.",
      },
      {
        kind: "nav",
        id: "map-handoff",
        title: "Map handoff",
        subtitle: "Preferred maps app for Leave / Arrive",
        blockedReason: "Map deep-link preference not persisted yet.",
      },
      {
        kind: "note",
        id: "location-law",
        text: "Opal knows your timezone, never your precise location.",
      },
    ],
  },
  "calls-assist": {
    title: "Calls & Opal Assist",
    lede: "Choose how Opal can help during calls.",
    rows: [
      {
        kind: "toggle",
        id: "assist",
        title: "Opal Assist on calls",
        subtitle: "Allow Assist on future calls. You can still pause it on any private call.",
        defaultOn: false,
      },
      {
        kind: "toggle",
        blockedReason: "Per-call confirm needs Assist prompt UI on call start.",
        id: "ask-every",
        title: "Ask on every call",
        subtitle: "Require confirmation each time instead of remembering.",
        defaultOn: false,
      },
      {
        kind: "toggle",
        blockedReason: "Post-call Graph suggestions need call→Graph bridge.",
        id: "suggest-graphs",
        title: "Suggest Graph ideas after calls",
        subtitle: "Surface possibilities privately after the call.",
        defaultOn: true,
      },
      {
        kind: "toggle",
        blockedReason: "Call-signal memory needs Assist retention policy API.",
        id: "remember-signals",
        title: "Remember useful call signals",
        subtitle: "Use permitted context to improve future fit.",
        defaultOn: true,
      },
      {
        kind: "nav",
        id: "call-privacy",
        title: "Call privacy",
        subtitle: "What is kept, what expires, what never leaves the call",
        blockedReason: "Call retention policy screen not built.",
      },
      {
        kind: "note",
        id: "assist-law",
        text: "Opal never speaks as you or posts a Memory from a call. Assist transcribes a call only when you say so.",
      },
    ],
  },
  notifications: {
    title: "Notifications",
    lede: "Choose what deserves your attention.",
    rows: [
      {
        kind: "toggle",
        id: "messages-calls",
        title: "Messages & calls",
        subtitle: "Direct contact that needs a reply.",
        defaultOn: true,
      },
      {
        kind: "toggle",
        id: "read-receipts",
        title: "Read receipts",
        subtitle: "Show when you have seen a message. Unread counts still work when off.",
        defaultOn: true,
      },
      {
        kind: "toggle",
        blockedReason: "Push category needs Expo rebuild + APNs project credentials.",
        id: "graph-changes",
        title: "Graph changes",
        subtitle: "Time, place, or membership shifts that matter.",
        defaultOn: true,
      },
      {
        kind: "toggle",
        blockedReason: "Push category needs Expo rebuild + live-location session.",
        id: "live-movement",
        title: "Live movement",
        subtitle: "Leave-by and arrival updates you opted into.",
        defaultOn: true,
      },
      {
        kind: "toggle",
        blockedReason: "Social push categories need Expo rebuild + preference API.",
        id: "social-activity",
        title: "Social activity",
        subtitle: "Likes, comments, and follows - quieter by default.",
        defaultOn: false,
      },
      {
        kind: "toggle",
        blockedReason: "Critical timing push needs reservation hold → APNs path.",
        id: "critical-timing",
        title: "Critical timing",
        subtitle: "Reservation holds and reconfirm windows.",
        defaultOn: true,
      },
      {
        kind: "note",
        id: "notif-law",
        text: "These save for this account.",
      },
    ],
  },
  "linked-devices": {
    title: "Linked devices",
    lede: "Use Opal on another device safely.",
    rows: [
      {
        kind: "nav",
        id: "this-phone",
        title: "This phone",
        subtitle: "Primary device for this account - this session",
        value: "Active",
      },
      {
        kind: "nav",
        id: "desktop",
        title: "Desktop session",
        subtitle: "Browser or desktop access via QR",
        blockedReason: "QR desktop linking needs signed session mint API.",
      },
      {
        kind: "note",
        id: "device-note",
        text: "This phone is your active session. Sign in on web with the same phone number to add a device.",
      },
      {
        kind: "nav",
        id: "revoke",
        title: "Revoke a device",
        subtitle: "End sessions you no longer trust",
        blockedReason: "Session revoke UI needs device roster API.",
      },
    ],
  },
  appearance: {
    title: "Appearance",
    lede: "Dark is Opal’s strongest look. Light keeps the same accents on pearl surfaces.",
    rows: [
      {
        kind: "note",
        id: "appearance-theme",
        text: "System follows this device. Your choice saves here and applies immediately.",
      },
    ],
  },
  spending: {
    title: "Spending",
    lede: "Comfort level for place suggestions.",
    rows: [
      {
        kind: "toggle",
        blockedReason: "Preference learning toggle needs recommend feedback store.",
        id: "learn-choices",
        title: "Learn from my choices",
        subtitle: "Use accepted and rejected fits to improve suggestions.",
        defaultOn: true,
      },
      {
        kind: "toggle",
        blockedReason: "Already private by financial profile policy - no separate flag.",
        id: "budget-private",
        title: "Keep my budget private",
        subtitle: "Exact amounts stay private unless I explicitly share them.",
        defaultOn: true,
      },
      {
        kind: "toggle",
        blockedReason: "Cost-interrupt policy not separate from comfort level yet.",
        id: "ask-when-cost",
        title: "Ask only when cost matters",
        subtitle: "Do not interrupt when the experience already fits.",
        defaultOn: true,
      },
      {
        kind: "nav",
        id: "trip-goals",
        title: "Trip goals",
        subtitle: "Per-trip spend targets",
        blockedReason: "Trip goal objects not in Trips domain yet.",
      },
      {
        kind: "nav",
        id: "per-graph-spend",
        title: "Per-Graph spend",
        subtitle: "Every Graph can override these defaults",
        blockedReason: "Per-Graph spend override needs Graph settings API.",
      },
    ],
  },
  fit: {
    title: "Fit",
    lede: "Activity and self-care rhythm.",
    rows: [
      {
        kind: "note",
        id: "fit-prefs-note",
        text: "Activity and wellness picks. Sharing stays off until you turn it on.",
      },
    ],
  },
  "account-security": {
    title: "Account & security",
    lede: "How you sign in, stay signed in, and leave when you choose.",
    rows: [
      {
        kind: "nav",
        id: "phone",
        title: "Phone number",
        subtitle: "Your sign-in identity",
        blockedReason: "Change-phone requires re-verify OTP flow - not exposed yet.",
      },
      {
        kind: "nav",
        id: "linked-from-account",
        title: "Linked devices",
        subtitle: "QR and desktop access",
        opens: "linked-devices",
      },
      {
        kind: "nav",
        id: "two-step",
        title: "Two-step security",
        subtitle: "Extra check when something looks unusual",
        blockedReason: "Phone OTP is the second factor today - no extra step UI.",
      },
      {
        kind: "nav",
        id: "session-alerts",
        title: "Session alerts",
        subtitle: "Know when a new device signs in",
        blockedReason: "Needs push + session event feed.",
      },
      {
        kind: "action",
        id: "delete-account",
        title: "Delete account",
        destructive: true,
        opens: "delete-account",
      },
      {
        kind: "note",
        id: "account-law",
        text: "Delete is nested and confirmed - never one tap.",
      },
    ],
  },
  "delete-account": {
    title: "Delete account",
    lede: "Take your time. This is permanent.",
    rows: [
      {
        kind: "note",
        id: "delete-warning",
        text: "This permanently removes your account. Content and relationships are handled under the deletion policy. Active provider obligations must be resolved first.",
      },
      {
        kind: "note",
        id: "confirm-delete-note",
        text: "To close your account, contact support. Self-serve delete is not available yet.",
      },
      {
        kind: "action",
        id: "keep-account",
        title: "Keep my account",
      },
    ],
  },
};

type Props = {
  setting: YouSettingKey;
  onBack: () => void;
  /** Nested setting navigation (e.g. Account & Security → Delete Account). */
  onOpenSetting?: (key: YouSettingKey) => void;
  session?: ProductSession | null;
  readReceipts?: boolean;
  messageNotifications?: boolean;
  onMessagingPreference?: (
    key: "read_receipts_enabled" | "message_notifications_enabled",
    value: boolean,
  ) => void;
  assistCallsEnabled?: boolean | null;
  onAssistPreference?: (enabled: boolean) => void;
  /** After profile PATCH — parent must update session + local identity so every surface agrees. */
  onProfileSaved?: (user: { display_name: string; handle: string }) => void;
};

export function YouSettingsDestination({
  setting,
  onBack,
  onOpenSetting,
  session,
  readReceipts,
  messageNotifications,
  onMessagingPreference,
  assistCallsEnabled = null,
  onAssistPreference,
  onProfileSaved,
}: Props) {
  const screen = SCREENS[setting];
  const figma = YOU_SETTING_FIGMA[setting];
  const name = session?.display_name?.trim() || "";
  const handle = (session as { handle?: string } | null)?.handle || "";
  const initials = (name || "Y").slice(0, 1).toUpperCase();

  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const row of screen.rows) {
      if (row.kind === "toggle") init[row.id] = row.defaultOn ?? false;
    }
    return init;
  });

  const deviceTz =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles"
      : "America/Los_Angeles";

  const [fields, setFields] = useState<Record<string, string>>(() => ({
    name,
    username: handle ? `@${handle.replace(/^@/, "")}` : "",
    bio: "Keep it short. Let your Graph speak.",
    confirm: "",
    "home-timezone": deviceTz,
    "travel-mode": "Off",
  }));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  useEffect(() => {
    const init: Record<string, boolean> = {};
    for (const row of SCREENS[setting].rows) {
      if (row.kind === "toggle") init[row.id] = row.defaultOn ?? false;
    }
    if (setting === "notifications") {
      if (typeof messageNotifications === "boolean") init["messages-calls"] = messageNotifications;
      if (typeof readReceipts === "boolean") init["read-receipts"] = readReceipts;
    }
    if (setting === "calls-assist" && typeof assistCallsEnabled === "boolean") {
      init.assist = assistCallsEnabled;
    }
    setToggles(init);
    if (setting === "calls-assist" && session?.user_id) {
      void import("../api/productClient").then(({ getAssistPreference }) =>
        getAssistPreference(session.access_token)
          .then((pref) => {
            if (typeof pref.assist_calls_enabled === "boolean") {
              setToggles((current) => ({ ...current, assist: pref.assist_calls_enabled === true }));
            }
          })
          .catch(() => undefined),
      );
    }
    if (setting === "location-travel" && session?.access_token) {
      const fallbackTz =
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles"
          : "America/Los_Angeles";
      void import("../runtime/travelTimezoneIngest").then(({ ingestDeviceTimezone }) =>
        ingestDeviceTimezone(session.access_token),
      );
      void import("../api/productClient").then(({ getHomeTimezone }) =>
        getHomeTimezone(session.access_token)
          .then((body) => {
            const tz =
              (typeof body.home_timezone === "string" && body.home_timezone) || fallbackTz;
            setFields((f) => ({
              ...f,
              "home-timezone": tz,
              "travel-mode": projectTravelModeLabel(body.active === true, fallbackTz, tz),
            }));
          })
          .catch(() => {
            setFields((f) => ({
              ...f,
              "home-timezone": fallbackTz,
              "travel-mode": projectTravelModeLabel(false, fallbackTz, fallbackTz),
            }));
          }),
      );
    }
  }, [setting, messageNotifications, readReceipts, assistCallsEnabled, session?.user_id, session?.access_token]);

  /* Nested settings stage is fixed 390×844 — kill inherited .scroll dock padding scroll offset */
  useEffect(() => {
    const pane = document.querySelector<HTMLElement>('[data-testid="you-settings-pane"]');
    if (pane) pane.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [setting]);

  const semantic =
    setting === "privacy" || setting === "feed-discovery" || setting === "account-security"
      ? "violet"
      : setting === "location-travel" || setting === "linked-devices"
        ? "aqua"
        : setting === "spending"
          ? "gold"
          : setting === "fit" || setting === "delete-account"
            ? "coral"
            : setting === "notifications"
              ? "magenta"
              : "cyan";

  return (
    <div
      className="you-settings-dest"
      data-testid={`you-setting-${setting}`}
      data-figma-node={figma}
      data-screen={`you-setting-${setting}`}
      data-nav-active="you"
      data-brand-v4="true"
      data-semantic={semantic}
      role="region"
      aria-label={screen.title}
    >
      <header className="you-settings-top">
        <button
          type="button"
          className="opal-nav-chevron"
          data-testid="you-setting-back"
          aria-label={
            setting === "delete-account" ? "Back to Account & security" : "Back to You"
          }
          onClick={onBack}
        >
          ‹
        </button>
        <span className="you-settings-back-label">
          {setting === "delete-account" ? "Account" : "You"}
        </span>
      </header>

      <h1 className="you-settings-title">{screen.title}</h1>
      <p className="you-settings-lede">{screen.lede}</p>

      {setting === "edit-profile" ? (
        <div className="you-settings-edit-avatar" aria-hidden>
          <div className="you-settings-edit-circle">{initials}</div>
        </div>
      ) : null}

      <div className="you-settings-body">
        {screen.rows.map((row) => {
          // Pass B / CONSUMER_TECHNICAL_LEAK=0: do not paint blocked rows to consumers.
          if ("blockedReason" in row && row.blockedReason) return null;
          if (row.kind === "toggle") {
            const on = toggles[row.id] ?? false;
            return (
              <div key={row.id} className="you-settings-row" data-testid={`you-setting-row-${row.id}`}>
                <div className="you-settings-row-copy">
                  <strong>{row.title}</strong>
                  <span>{row.subtitle}</span>
                </div>
                <button
                  type="button"
                  className={`you-settings-toggle${on ? " on" : ""}`}
                  role="switch"
                  aria-checked={on}
                  aria-label={row.title}
                  onClick={() => {
                    const next = !on;
                    setToggles((t) => ({ ...t, [row.id]: next }));
                    if (row.id === "messages-calls") {
                      onMessagingPreference?.("message_notifications_enabled", next);
                    }
                    if (row.id === "read-receipts") {
                      onMessagingPreference?.("read_receipts_enabled", next);
                    }
                    if (row.id === "assist") {
                      onAssistPreference?.(next);
                      setSaveError(null);
                      void import("../api/productClient").then(({ updateAssistPreference }) =>
                        updateAssistPreference(next, session?.access_token)
                          .then(() => undefined)
                          .catch(() => {
                            setToggles((t) => ({ ...t, assist: on }));
                            setSaveError("Could not save Assist preference. Try again.");
                          }),
                      );
                    }
                  }}
                >
                  <span className="you-settings-toggle-knob" />
                </button>
              </div>
            );
          }
          if (row.kind === "nav") {
            // Informational value row (no opens, no blocker) — e.g. This phone · Active.
            const infoValue = fields[row.id] ?? row.value;
            if (!row.opens && !row.blockedReason && infoValue) {
              return (
                <div
                  key={row.id}
                  className="you-settings-row"
                  data-testid={`you-setting-row-${row.id}`}
                >
                  <div className="you-settings-row-copy">
                    <strong>{row.title}</strong>
                    <span>{row.subtitle}</span>
                  </div>
                  <span className="you-settings-row-value">{infoValue}</span>
                </div>
              );
            }
            if (!row.opens) return null;
            return (
              <button
                key={row.id}
                type="button"
                className="you-settings-row you-settings-row-nav"
                data-testid={`you-setting-row-${row.id}`}
                onClick={() => {
                  if (row.opens) onOpenSetting?.(row.opens);
                }}
              >
                <div className="you-settings-row-copy">
                  <strong>{row.title}</strong>
                  <span>{row.subtitle}</span>
                </div>
                <span className="you-settings-row-trail">
                  {row.value ? <span className="you-settings-row-value">{row.value}</span> : null}
                  {!row.value || row.opens ? (
                    <span className="you-settings-chevron" aria-hidden>
                      ›
                    </span>
                  ) : null}
                </span>
              </button>
            );
          }
          if (row.kind === "action") {
            return (
              <button
                key={row.id}
                type="button"
                className={`you-settings-action${row.destructive ? " is-destructive" : ""}`}
                data-testid={`you-setting-row-${row.id}`}
                disabled={row.id === "save" && saving}
                onClick={() => {
                  if (row.opens) {
                    onOpenSetting?.(row.opens);
                    return;
                  }
                  if (row.id === "keep-account") {
                    onBack();
                    return;
                  }
                  if (row.id === "save-home-timezone") {
                    const tz = (fields["home-timezone"] ?? "").trim();
                    if (!tz) {
                      setSaveError("Enter a timezone like America/Los_Angeles.");
                      return;
                    }
                    setSaving(true);
                    setSaveError(null);
                    void import("../api/productClient").then(({ updateHomeTimezone, getHomeTimezone }) =>
                      updateHomeTimezone(tz, session?.access_token)
                        .then(() => getHomeTimezone(session?.access_token))
                        .then((body) => {
                          const homeTz =
                            (typeof body.home_timezone === "string" && body.home_timezone) || tz;
                          const deviceNow =
                            typeof Intl !== "undefined"
                              ? Intl.DateTimeFormat().resolvedOptions().timeZone || homeTz
                              : homeTz;
                          setFields((f) => ({
                            ...f,
                            "home-timezone": homeTz,
                            "travel-mode": projectTravelModeLabel(
                              body.active === true,
                              deviceNow,
                              homeTz,
                            ),
                          }));
                          setSaving(false);
                        })
                        .catch((e: unknown) => {
                          setSaving(false);
                          const msg =
                            e instanceof Error ? e.message : "Could not save timezone.";
                          setSaveError(msg);
                        }),
                    );
                    return;
                  }
                  if (row.id === "save") {
                    // Wire to real profile API — no longer a fake save.
                    const displayName = (fields.name ?? "").trim();
                    const handleValue = (fields.username ?? "").trim();
                    if (!displayName) {
                      setSaveError("Enter a name so your people know it is you.");
                      return;
                    }
                    setSaving(true);
                    setSaveError(null);
                    void import("../api/productClient").then(({ updateProfile }) =>
                      updateProfile(
                        { displayName, handle: handleValue || undefined },
                        session?.access_token,
                      )
                        .then((data) => {
                          const savedName = data.user?.display_name?.trim() || displayName;
                          const savedHandle = (data.user?.handle || handleValue || "")
                            .replace(/^@/, "")
                            .trim();
                          onProfileSaved?.({
                            display_name: savedName,
                            handle: savedHandle,
                          });
                          setSaving(false);
                          onBack();
                        })
                        .catch((e: unknown) => {
                          setSaving(false);
                          const msg =
                            e instanceof Error ? e.message : "Could not save. Try again.";
                          setSaveError(msg);
                        }),
                    );
                    return;
                  }
                }}
              >
                {(row.id === "save" || row.id === "save-home-timezone") && saving
                  ? "Saving…"
                  : row.title}
              </button>
            );
          }
          if (row.kind === "field") {
            const key = row.id;
            return (
              <label key={row.id} className="you-settings-field" data-testid={`you-setting-row-${row.id}`}>
                <span>{row.label}</span>
                <input
                  value={fields[key] ?? ""}
                  placeholder={row.placeholder}
                  onChange={(e) =>
                    setFields((f) => ({ ...f, [key]: e.target.value }))
                  }
                />
              </label>
            );
          }
          return (
            <p key={row.id} className="you-settings-note" data-testid={`you-setting-row-${row.id}`}>
              {row.text}
            </p>
          );
        })}
        {setting === "appearance" ? <AppearanceThemeSection /> : null}
        {setting === "spending" ? (
          <SpendingComfortSection session={session ?? null} />
        ) : null}
        {setting === "fit" ? (
          <FitPreferencesSection session={session ?? null} />
        ) : null}
        {/* Paste W Phase 5 / L8 — filed from You hub, not deleted */}
        {setting === "calls-assist" && session ? (
          <div className="you-settings-filed" data-testid="you-settings-filed-calls-assist">
            <GraphingStandingPermissionSection session={session} />
            <WhatOpalCanDoSection session={session} />
          </div>
        ) : null}
        {setting === "privacy" && session ? (
          <div className="you-settings-filed" data-testid="you-settings-filed-privacy">
            <YouAccessControlSection />
            <ConnectedSourcesSection session={session} />
            <WhatOpalRemembersSection session={session} />
            <CelebrationsSection session={session} />
          </div>
        ) : null}
        {setting === "feed-discovery" && session ? (
          <div className="you-settings-filed" data-testid="you-settings-filed-feed-discovery">
            <InviteFriendsSection session={session} />
          </div>
        ) : null}
        {saveError ? (
          <p className="you-settings-error" role="alert" data-testid="you-settings-save-error">
            {saveError}
          </p>
        ) : null}
      </div>
    </div>
  );
}

const GRAPHING_MODE_OPTIONS: { id: GraphingMode; label: string; hint: string }[] = [
  { id: "never", label: "Never", hint: "Do not Graph calls." },
  { id: "ask_each", label: "Ask each time", hint: "Ask before Graphing an eligible call." },
  {
    id: "auto_eligible",
    label: "Automatically Graph allowed calls",
    hint: "Standing permission - no repeated interruption when already granted.",
  },
  {
    id: "selected_only",
    label: "Only selected people",
    hint: "Graph only relationships you opt in below.",
  },
];

/**
 * Continuous Permission — standing Graphing modes (not Pass 2 memory).
 * Person-agnostic: works for any relationship the user configures.
 */
export function GraphingStandingPermissionSection({ session }: WhatOpalCanDoProps) {
  const token = session?.access_token;
  const [policy, setPolicy] = useState<GraphingPolicy | null>(null);
  const [grants, setGrants] = useState<RelationshipAccessGrant[]>([]);
  const [people, setPeople] = useState<RelationshipContact[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session?.user_id) return;
    try {
      const [g, list, rel] = await Promise.all([
        getGraphingPolicy(token),
        listRelationshipAccessGrants(undefined, token),
        listRelationships(token).catch(() => ({
          contacts: [] as RelationshipContact[],
          relationships: [],
        })),
      ]);
      setPolicy(g.graphing);
      setGrants(Array.isArray(list.grants) ? list.grants : []);
      const fromContacts = Array.isArray(rel.contacts) ? rel.contacts : [];
      const fromRows = Array.isArray(rel.relationships)
        ? rel.relationships.map((r) => ({
            contact_user_id: r.contact_user_id,
            type: r.type,
            display_name: null,
          }))
        : [];
      setPeople(fromContacts.length ? fromContacts : fromRows);
      setError(null);
    } catch {
      setError("Couldn't load Graphing permissions.");
    }
  }, [session?.user_id, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onMode = async (call_mode: GraphingMode) => {
    if (!session?.user_id || busy) return;
    setBusy(true);
    try {
      const res = await updateGraphingPolicy({ call_mode }, token);
      setPolicy(res.graphing);
    } catch {
      setError("Couldn't update Graphing mode.");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const onPause = async (paused: boolean) => {
    if (!session?.user_id || busy) return;
    setBusy(true);
    try {
      const res = await updateGraphingPolicy({ global_paused: paused }, token);
      setPolicy(res.graphing);
    } catch {
      setError("Couldn't update pause.");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const callSignalOn = (contactId: string) =>
    grants.some(
      (g) =>
        g.contact_user_id === contactId &&
        g.data_category === "call_signals" &&
        g.active !== false &&
        !g.revoked_at &&
        g.access_level !== "none",
    );

  const onToggleSelected = async (contact: RelationshipContact, nextOn: boolean) => {
    if (!session?.user_id || busy || !contact.contact_user_id) return;
    setBusy(true);
    try {
      if (nextOn) {
        const { grant } = await upsertRelationshipAccessGrant(
          {
            scope_kind: "contact",
            contact_user_id: contact.contact_user_id,
            data_category: "call_signals",
            access_level: "observe",
            action_ceiling: "suggest",
            visibility: "self_only",
            source: "explicit",
          },
          token,
        );
        setGrants((prev) => [...prev.filter((g) => g.id !== grant.id), grant]);
      } else {
        const existing = grants.find(
          (g) =>
            g.contact_user_id === contact.contact_user_id &&
            g.data_category === "call_signals" &&
            !g.revoked_at,
        );
        if (existing?.id) {
          const { grant } = await revokeRelationshipAccessGrant(existing.id, token);
          setGrants((prev) => prev.map((g) => (g.id === grant.id ? grant : g)));
        }
      }
    } catch {
      setError("Couldn't update relationship Graphing.");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  if (!session) return null;

  const mode = (policy?.call_mode as GraphingMode) || "ask_each";
  const paused = Boolean(policy?.global_paused);

  return (
    <section
      className="section you-hub-graphing"
      aria-label="Opal Graphing"
      data-testid="opal-graphing-standing"
    >
      <h3 className="section-label">Opal Graphing</h3>
      <p className="you-settings-note" data-testid="opal-graphing-standing-note">
        How Opal may use call moments you allow. This never unlocks deeper memory.
      </p>

      <div className="you-settings-row" data-testid="opal-graphing-global-pause">
        <div className="you-settings-row-copy">
          <strong>Pause Graphing</strong>
          <span>Overrides every relationship grant until you resume.</span>
        </div>
        <button
          type="button"
          className={`you-settings-toggle${paused ? " on" : ""}`}
          role="switch"
          aria-checked={paused}
          aria-label="Pause Graphing"
          disabled={busy}
          data-testid="opal-graphing-pause-toggle"
          onClick={() => void onPause(!paused)}
        >
          <span className="you-settings-toggle-knob" />
        </button>
      </div>

      <div className="you-consent-rows" role="radiogroup" aria-label="Call Graphing mode">
        {GRAPHING_MODE_OPTIONS.map((opt) => {
          const on = mode === opt.id;
          return (
            <div
              key={opt.id}
              className="you-settings-row"
              data-testid={`opal-graphing-mode-${opt.id}`}
              data-selected={on ? "true" : "false"}
            >
              <div className="you-settings-row-copy">
                <strong>{opt.label}</strong>
                <span>{opt.hint}</span>
              </div>
              <button
                type="button"
                className={`you-settings-toggle${on ? " on" : ""}`}
                role="radio"
                aria-checked={on}
                aria-label={opt.label}
                disabled={busy || paused}
                data-testid={`opal-graphing-mode-toggle-${opt.id}`}
                onClick={() => void onMode(opt.id)}
              >
                <span className="you-settings-toggle-knob" />
              </button>
            </div>
          );
        })}
      </div>

      {mode === "selected_only" ? (
        <div className="you-consent-rows" data-testid="opal-graphing-selected-people">
          <p className="you-settings-note">People you allow Graphing with (call signals).</p>
          {people.length === 0 ? (
            <p className="you-settings-note" data-testid="opal-graphing-no-people">
              No relationships yet. Add people, then opt them in here.
            </p>
          ) : (
            people.map((p) => {
              const id = p.contact_user_id;
              if (!id) return null;
              const on = callSignalOn(id);
              const label = p.display_name || p.handle || "Person";
              return (
                <div
                  key={id}
                  className="you-settings-row"
                  data-testid={`opal-graphing-person-${id}`}
                >
                  <div className="you-settings-row-copy">
                    <strong>{label}</strong>
                    <span>{relationshipTypeLabel(p.type) || "Relationship"}</span>
                  </div>
                  <button
                    type="button"
                    className={`you-settings-toggle${on ? " on" : ""}`}
                    role="switch"
                    aria-checked={on}
                    aria-label={`Graph calls with ${label}`}
                    disabled={busy || paused}
                    data-testid={`opal-graphing-person-toggle-${id}`}
                    onClick={() => void onToggleSelected(p, !on)}
                  >
                    <span className="you-settings-toggle-knob" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      ) : null}

      {error ? (
        <p className="you-settings-error" role="alert" data-testid="opal-graphing-error">
          {error}
        </p>
      ) : null}
    </section>
  );
}

/**
 * Repair #15 (DF) - Connected sources, filed into Privacy (what Opal may
 * access from outside accounts). Only sources with a real backend status
 * are painted: Google today (ConnectorController / ProviderConnections).
 * Contacts, health, and other categories have no persistent connection or
 * status API, so they are NOT painted - see shots/repair15/SETTINGS_MAP.md.
 *
 * Connect runs the real OAuth start endpoint and leaves for Google's own
 * consent screen (calendar.readonly + gmail.readonly, one sign-in). When
 * the server has no Google OAuth configured, the start endpoint refuses
 * (503 oauth_not_configured) and this section says so in plain language -
 * the raw server message names server env vars and is never painted.
 * Disconnect revokes the provider connection server-side; manual
 * availability keeps working either way (backend contract).
 */
export function ConnectedSourcesSection({ session }: WhatOpalCanDoProps) {
  const token = session?.access_token;
  const [status, setStatus] = useState<GoogleCalendarConnectionStatus | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session?.user_id) return;
    try {
      const res = await getGoogleCalendarStatus(token);
      setStatus(res);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, [session?.user_id, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!session) return null;

  const projection = projectGoogleConnection(status, loadFailed);

  const onConnect = async () => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await startGoogleCalendarConnect(token);
      if (res?.authorize_url) {
        window.location.href = res.authorize_url;
        return;
      }
      setNote("Could not start Google connect. Try again.");
    } catch {
      setNote(
        "Google connect is not set up on this server yet. You can still share your availability by hand.",
      );
    } finally {
      setBusy(false);
    }
  };

  const onDisconnect = async () => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      await revokeGoogleCalendarConnection(token);
      await refresh();
      setNote("Google disconnected. Sharing your availability by hand still works.");
    } catch {
      setNote("Could not disconnect Google. Try again.");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="section you-connected-sources"
      aria-label="Connected sources"
      data-testid="connected-sources"
    >
      <h3 className="section-label">Connected sources</h3>
      <p className="you-settings-note" data-testid="connected-sources-law">
        Accounts Opal can check for you. Connecting is your choice, and you can disconnect
        anytime.
      </p>
      <div className="you-consent-rows">
        <div
          className="you-settings-row"
          data-testid="connected-sources-google"
          data-connection-state={projection.state}
        >
          <div className="you-settings-row-copy">
            <strong>Google Calendar and email</strong>
            <span>
              One Google sign-in, read-only. Opal checks busy times for planning and can
              read email with the same sign-in. It cannot send, change, or delete anything.
            </span>
            <span data-testid="connected-sources-google-detail">{projection.detail}</span>
          </div>
          <span className="you-settings-row-value" data-testid="connected-sources-google-status">
            {projection.label}
          </span>
        </div>
      </div>
      {projection.state === "not_connected" ? (
        <button
          type="button"
          className="you-trust-grant"
          data-testid="connected-sources-google-connect"
          disabled={busy}
          onClick={() => void onConnect()}
        >
          {busy ? "Opening Google..." : "Connect Google"}
        </button>
      ) : null}
      {projection.state === "connected" || projection.state === "simulated" ? (
        <button
          type="button"
          className="you-trust-grant"
          data-testid="connected-sources-google-disconnect"
          disabled={busy}
          onClick={() => void onDisconnect()}
        >
          {busy ? "Disconnecting..." : "Disconnect Google"}
        </button>
      ) : null}
      {projection.state === "unknown" && loadFailed ? (
        <button
          type="button"
          className="you-trust-grant"
          data-testid="connected-sources-retry"
          disabled={busy}
          onClick={() => void refresh()}
        >
          Try again
        </button>
      ) : null}
      {note ? (
        <p className="you-settings-note" role="status" data-testid="connected-sources-note">
          {note}
        </p>
      ) : null}
    </section>
  );
}

/**
 * Privacy Access layer — what Opal may observe today.
 * Pass 2 understanding depth / Candidates stay hidden (LOCKED).
 * Access ≠ knowledge. Access ≠ Action. No algorithm knobs.
 */
export function YouAccessControlSection() {
  return (
    <section
      className="section you-access-control"
      aria-label="What Opal may access"
      data-testid="you-access-control"
    >
      <h3 className="section-label">What Opal may access</h3>
      <p className="you-settings-note" data-testid="you-access-law">
        What Opal may notice. Acting for you is under Calls & Opal Assist.
      </p>
      <div className="you-consent-rows">
        <div className="you-settings-row" data-testid="you-access-row-remembers">
          <div className="you-settings-row-copy">
            <strong>Things already stored</strong>
            <span>Facts Opal holds. Forget anytime.</span>
          </div>
          <span className="you-settings-row-value">On</span>
        </div>
        <div className="you-settings-row" data-testid="you-access-row-celebrations">
          <div className="you-settings-row-copy">
            <strong>Celebrations you save</strong>
            <span>Dates you store. Deleting revokes access.</span>
          </div>
          <span className="you-settings-row-value">On</span>
        </div>
        <div className="you-settings-row" data-testid="you-access-row-relationship-types">
          <div className="you-settings-row-copy">
            <strong>Relationship types you set</strong>
            <span>Your labels for people. Change or clear anytime.</span>
          </div>
          <span className="you-settings-row-value">On</span>
        </div>
        <div className="you-settings-row" data-testid="you-access-row-trust">
          <div className="you-settings-row-copy">
            <strong>Trust tier with Opal</strong>
            <span>Gates sensitive settings. Revoke anytime.</span>
          </div>
          <span className="you-settings-row-value">On</span>
        </div>
      </div>
      <p className="you-settings-note" data-testid="you-access-pass2-hold">
        Deeper understanding stays off until you allow it.
      </p>
    </section>
  );
}

/** Default grant window — expires_at is required by 1B law (no immortal grants). */
export const CONSENT_DEFAULT_GRANT_DAYS = 365;

export type ActOnBehalfCapability = {
  id: ConsentCapability;
  title: string;
  description: string;
  /** Honest blocker when the execution path is missing — toggle stays off and disabled. */
  blockedReason?: string;
};

export const ACT_ON_BEHALF_CAPABILITIES: ActOnBehalfCapability[] = [
  {
    id: "calls_outbound",
    title: "Place calls for you",
    description:
      "Opal may suggest a call, help you prepare, and place it only with your OK. Revoke anytime.",
  },
  {
    id: "bookings_reserve",
    title: "Make reservations for you",
    description:
      "Opal may suggest a booking, hold a table, and confirm only with your OK. Revoke anytime.",
  },
  // messaging_business hidden from consumer until channel connector ships (Pass B).
];

function isActiveGrant(proof: ConsentProof, now = Date.now()): boolean {
  if (proof.status !== "granted") return false;
  if (proof.revoked_at) return false;
  if (!proof.expires_at) return false;
  const exp = Date.parse(proof.expires_at);
  return Number.isFinite(exp) && exp > now;
}

/** Pick the freshest active grant for a capability. */
export function activeConsentFor(
  consents: ConsentProof[],
  capability: string,
): ConsentProof | null {
  const matches = consents
    .filter((c) => c.capability === capability && isActiveGrant(c))
    .sort((a, b) => Date.parse(b.granted_at || "") - Date.parse(a.granted_at || ""));
  return matches[0] || null;
}

export function formatConsentExpiry(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function defaultConsentExpiresAt(from = new Date()): string {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() + CONSENT_DEFAULT_GRANT_DAYS);
  return d.toISOString();
}

type WhatOpalCanDoProps = {
  session: ProductSession | null;
};

/**
 * "What Opal can do for you" — filed into Calls & Opal Assist (Paste W Phase 5 / L8).
 * Reuses you-settings-row / you-settings-toggle only.
 */
export function WhatOpalCanDoSection({ session }: WhatOpalCanDoProps) {
  const [consents, setConsents] = useState<ConsentProof[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const token = session?.access_token;

  const refresh = useCallback(async () => {
    if (!session?.user_id) {
      setConsents([]);
      return;
    }
    try {
      const res = await listConsents(token);
      setConsents(Array.isArray(res.consents) ? res.consents : []);
    } catch {
      /* keep prior; hub still usable */
    }
  }, [session?.user_id, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const byCap = useMemo(() => {
    const map: Record<string, ConsentProof | null> = {};
    for (const cap of ACT_ON_BEHALF_CAPABILITIES) {
      map[cap.id] = activeConsentFor(consents, cap.id);
    }
    return map;
  }, [consents]);

  const onToggle = async (cap: ActOnBehalfCapability, nextOn: boolean) => {
    if (cap.blockedReason || !session?.user_id || busy) return;
    const current = byCap[cap.id];
    setBusy(cap.id);
    try {
      if (nextOn) {
        const { consent } = await grantConsent(
          { capability: cap.id, expires_at: defaultConsentExpiresAt() },
          token,
        );
        setConsents((prev) => [...prev.filter((c) => c.id !== consent.id), consent]);
      } else if (current?.id) {
        const { consent } = await revokeConsent(current.id, token);
        setConsents((prev) => prev.map((c) => (c.id === consent.id ? consent : c)));
      }
    } catch {
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  if (!session) return null;

  return (
    <section
      className="section you-hub-consent"
      aria-label="What Opal can do for you"
      data-testid="what-opal-can-do"
    >
      <h3 className="section-label">What Opal can do for you</h3>
      <p className="you-settings-note" data-testid="action-authority-ladder">
        What Opal may do for you. You grant and revoke.
      </p>
      <div className="you-consent-rows">
        {ACT_ON_BEHALF_CAPABILITIES.map((cap) => {
          const proof = byCap[cap.id];
          const blocked = Boolean(cap.blockedReason);
          const on = Boolean(proof) && !blocked;
          const disabled = blocked || busy === cap.id;
          const expiryLabel = proof ? formatConsentExpiry(proof.expires_at) : "";

          return (
            <div
              key={cap.id}
              className="you-settings-row"
              data-testid={`consent-row-${cap.id}`}
              data-capability={cap.id}
              data-granted={on ? "true" : "false"}
            >
              <div className="you-settings-row-copy">
                <strong>{cap.title}</strong>
                {on && expiryLabel ? (
                  <span data-testid={`consent-expiry-${cap.id}`}>On · expires {expiryLabel}</span>
                ) : blocked ? (
                  <details className="you-settings-why">
                    <summary>Why this is waiting</summary>
                    <p>{cap.description}</p>
                  </details>
                ) : (
                  <span>{cap.description}</span>
                )}
              </div>
              {blocked ? (
                <span className="you-settings-blocked" data-testid="consent-blocked">
                  {cap.blockedReason}
                </span>
              ) : null}
              <button
                type="button"
                className={`you-settings-toggle${on ? " on" : ""}`}
                role="switch"
                aria-checked={on}
                aria-disabled={blocked ? "true" : undefined}
                aria-label={blocked ? `${cap.title} (blocked)` : cap.title}
                disabled={disabled}
                data-testid={`consent-toggle-${cap.id}`}
                onClick={() => void onToggle(cap, !on)}
              >
                <span className="you-settings-toggle-knob" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Appearance — System / Dark / Light. Local-only GREEN wire. */
export function AppearanceThemeSection() {
  const [preference, setPreference] = useState<AppearancePreference>(() =>
    readAppearancePreference(),
  );

  const onSelect = (next: AppearancePreference) => {
    const applied = setAppearancePreference(next);
    setPreference(applied.preference);
  };

  return (
    <section
      className="you-appearance-section"
      aria-label="Theme"
      data-testid="appearance-theme-picker"
    >
      <div className="you-appearance-options" role="radiogroup" aria-label="Appearance">
        {APPEARANCE_OPTIONS.map((opt) => {
          const selected = preference === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`you-appearance-option${selected ? " is-selected" : ""}`}
              data-testid={`appearance-theme-${opt.value}`}
              onClick={() => onSelect(opt.value)}
            >
              <strong>{opt.label}</strong>
              <span>{opt.description}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

type FitPreferencesSectionProps = {
  session: ProductSession | null;
};

/**
 * Fit preferences live under You → Fit (separate from Spending).
 * Local substrate today; share gate controls Center/context summary later.
 */
export function FitPreferencesSection({ session }: FitPreferencesSectionProps) {
  const userId = session?.user_id ?? null;
  const [share, setShare] = useState(false);
  const [activities, setActivities] = useState<FitActivityId[]>([]);
  const [wellnessGoal, setWellnessGoal] = useState<WellnessGoal>("none");
  const [saving, setSaving] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  useEffect(() => {
    const prefs = loadFitPreferences(userId);
    setShare(prefs.shareActivityPrefs);
    setActivities([...prefs.activities]);
    setWellnessGoal(prefs.wellnessGoal);
    setStatusNote(null);
  }, [userId]);

  const toggleActivity = (id: FitActivityId) => {
    setActivities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
    setStatusNote(null);
  };

  const onSave = () => {
    if (saving) return;
    setSaving(true);
    setStatusNote(null);
    try {
      const next: FitPreferences = {
        activities: [...activities],
        wellnessGoal,
        shareActivityPrefs: share,
      };
      saveFitPreferences(userId, next);
      setStatusNote("Fit preferences saved.");
    } catch {
      setStatusNote("Could not save Fit preferences. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="you-hub-spending you-settings-spending" data-testid="fit-prefs-section">
      <h5 className="you-spending-label">Activity preferences</h5>
      <p className="you-trust-copy">
        What Opal may use for activity suggestions. Nothing is shared until you turn sharing on
        and save.
      </p>
      <div className="you-settings-row" data-testid="fit-share-row">
        <div className="you-settings-row-copy">
          <strong>Share activity preferences</strong>
          <span>Let Opal use these for suggestions</span>
        </div>
        <button
          type="button"
          role="switch"
          className={`you-settings-toggle${share ? " on" : ""}`}
          aria-checked={share}
          aria-label="Share activity preferences"
          data-testid="fit-share-toggle"
          disabled={saving}
          onClick={() => {
            setShare((v) => !v);
            setStatusNote(null);
          }}
        >
          <span className="you-settings-toggle-knob" />
        </button>
      </div>
      <div className="you-spending-options" data-testid="fit-activity-picker">
        {FIT_ACTIVITY_OPTIONS.map((opt) => {
          const selected = activities.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              className={`you-spending-option${selected ? " is-selected" : ""}`}
              data-testid={`fit-activity-${opt.id}`}
              aria-pressed={selected}
              disabled={saving}
              onClick={() => toggleActivity(opt.id)}
            >
              <strong>{opt.label}</strong>
            </button>
          );
        })}
      </div>
      <label className="you-spending-field">
        Wellness goal
        <select
          value={wellnessGoal}
          data-testid="fit-wellness-goal"
          disabled={saving}
          onChange={(e) => {
            setWellnessGoal(e.target.value as WellnessGoal);
            setStatusNote(null);
          }}
        >
          {WELLNESS_GOAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="you-trust-grant"
        data-testid="fit-save"
        disabled={saving}
        onClick={onSave}
      >
        Save Fit preferences
      </button>
      {statusNote ? (
        <p className="you-trust-copy" data-testid="fit-status-note">
          {statusNote}
        </p>
      ) : null}
    </div>
  );
}

type SpendingComfortProps = {
  session: ProductSession | null;
};

/**
 * Spending comfort lives under You → Spending (separate from Fit).
 * Trust-gated at trusted+. Wallet/load UI stays hidden until loads are
 * genuinely executable (legal gate) — no financial theater.
 */
export function SpendingComfortSection({ session }: SpendingComfortProps) {
  const [trust, setTrust] = useState<TrustTierInfo | null>(null);
  const [financial, setFinancial] = useState<FinancialProfile | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [comfortDraft, setComfortDraft] = useState<ComfortLevel | "">("");
  const [diningMin, setDiningMin] = useState("");
  const [diningMax, setDiningMax] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [savingFinancial, setSavingFinancial] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletingFinancial, setDeletingFinancial] = useState(false);
  const token = session?.access_token;

  const trustedPlus =
    trust?.tier === "trusted" || trust?.tier === "inner_circle";

  const refresh = useCallback(async () => {
    if (!session?.user_id) {
      setTrust(null);
      setFinancial(null);
      setLoaded(true);
      return;
    }
    try {
      const trustRes = await getTrustTier(token);
      const nextTrust = trustRes || null;
      setTrust(nextTrust);
      const canFinancial =
        nextTrust?.tier === "trusted" || nextTrust?.tier === "inner_circle";
      if (canFinancial) {
        try {
          const profile = await getFinancialProfile(token);
          setFinancial(profile);
          if (profile) {
            setComfortDraft((profile.comfort_level as ComfortLevel) || "");
            setDiningMin(
              profile.dining_range?.min != null ? String(profile.dining_range.min) : "",
            );
            setDiningMax(
              profile.dining_range?.max != null ? String(profile.dining_range.max) : "",
            );
            setNotesDraft(profile.notes || "");
          } else {
            setComfortDraft("");
            setDiningMin("");
            setDiningMax("");
            setNotesDraft("");
          }
        } catch {
          setFinancial(null);
        }
      } else {
        setFinancial(null);
        setComfortDraft("");
        setDiningMin("");
        setDiningMax("");
        setNotesDraft("");
      }
    } catch {
      /* keep prior */
    } finally {
      setLoaded(true);
    }
  }, [session?.user_id, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onSaveFinancial = async () => {
    if (!session?.user_id || !comfortDraft || savingFinancial) return;
    setSavingFinancial(true);
    setStatusNote(null);
    try {
      const minN = diningMin.trim() === "" ? null : Number(diningMin);
      const maxN = diningMax.trim() === "" ? null : Number(diningMax);
      const dining_range =
        minN != null && maxN != null && !Number.isNaN(minN) && !Number.isNaN(maxN)
          ? { min: minN, max: maxN }
          : null;
      const res = await setFinancialProfile(
        {
          comfort_level: comfortDraft,
          dining_range,
          notes: notesDraft.trim() || null,
        },
        token,
      );
      setFinancial(res.profile);
      setDeleteConfirm(false);
      setStatusNote("Spending comfort saved.");
    } catch {
      setStatusNote("Could not save spending comfort. Try again.");
    } finally {
      setSavingFinancial(false);
    }
  };

  const onDeleteFinancial = async () => {
    if (!session?.user_id || deletingFinancial) return;
    setDeletingFinancial(true);
    setStatusNote(null);
    try {
      await deleteFinancialProfile(token);
      setFinancial(null);
      setComfortDraft("");
      setDiningMin("");
      setDiningMax("");
      setNotesDraft("");
      setDeleteConfirm(false);
      setStatusNote("Spending comfort removed.");
    } catch {
      setStatusNote("Could not remove spending comfort. Try again.");
    } finally {
      setDeletingFinancial(false);
    }
  };

  if (!session) return null;

  return (
    <div className="you-hub-spending you-settings-spending" data-testid="spending-comfort">
      <h5 className="you-spending-label">Spending comfort</h5>
      {!loaded ? null : !trustedPlus ? (
        <p className="you-trust-copy" data-testid="spending-trust-gate">
          Reach Deep understanding (trusted+) to set Budget, Moderate, Comfortable, or Luxury.
        </p>
      ) : (
        <>
          <p className="you-trust-copy">Suggests places that fit your life.</p>
          <div className="you-spending-options" data-testid="spending-level-picker">
            {COMFORT_LEVEL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`you-spending-option${
                  comfortDraft === opt.value ? " is-selected" : ""
                }`}
                data-testid={`spending-level-${opt.value}`}
                disabled={savingFinancial}
                onClick={() => setComfortDraft(opt.value)}
              >
                <strong>{opt.label}</strong>
                <span>{opt.description}</span>
              </button>
            ))}
          </div>
          <label className="you-spending-field">
            Dining range (per person, optional)
            <span className="you-spending-range">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="Min"
                value={diningMin}
                data-testid="spending-dining-min"
                onChange={(e) => setDiningMin(e.target.value)}
                disabled={savingFinancial}
              />
              <span aria-hidden="true">–</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="Max"
                value={diningMax}
                data-testid="spending-dining-max"
                onChange={(e) => setDiningMax(e.target.value)}
                disabled={savingFinancial}
              />
            </span>
          </label>
          <label className="you-spending-field">
            Anything I should know?
            <textarea
              rows={2}
              placeholder="e.g. splurge on anniversaries"
              value={notesDraft}
              data-testid="spending-notes"
              onChange={(e) => setNotesDraft(e.target.value)}
              disabled={savingFinancial}
            />
          </label>
          <button
            type="button"
            className="you-trust-grant"
            data-testid="spending-save"
            disabled={!comfortDraft || savingFinancial}
            onClick={() => void onSaveFinancial()}
          >
            {financial ? "Update spending comfort" : "Save spending comfort"}
          </button>
          {statusNote ? (
            <p className="you-trust-copy" data-testid="spending-status-note">
              {statusNote}
            </p>
          ) : null}
          {financial ? (
            <>
              <button
                type="button"
                className="you-spending-remove"
                data-testid="spending-remove"
                disabled={deletingFinancial}
                onClick={() => setDeleteConfirm(true)}
              >
                Remove spending data
              </button>
              {deleteConfirm ? (
                <div
                  className="you-trust-confirm"
                  role="dialog"
                  aria-label="Confirm remove spending data"
                  data-testid="spending-remove-confirm"
                >
                  <p>Remove your spending comfort data? You can set it again anytime.</p>
                  <div className="you-trust-confirm-actions">
                    <button
                      type="button"
                      className="you-spending-remove"
                      data-testid="spending-remove-yes"
                      disabled={deletingFinancial}
                      onClick={() => void onDeleteFinancial()}
                    >
                      Remove
                    </button>
                    <button
                      type="button"
                      className="you-people-picker-cancel"
                      data-testid="spending-remove-no"
                      disabled={deletingFinancial}
                      onClick={() => setDeleteConfirm(false)}
                    >
                      Keep it
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

type WhatOpalRemembersProps = {
  session: ProductSession | null;
  onOpenConversation?: (conversationId: string) => void;
};

/**
 * You hub section — "What Opal remembers".
 * Directly below WhatOpalCanDoSection. Reuses you-settings-row styles.
 * RU-1: People subsection for relationship types.
 * F2: People row → PersonMemoryView (per-person social memory).
 */
export function WhatOpalRemembersSection({
  session,
  onOpenConversation,
}: WhatOpalRemembersProps) {
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [contacts, setContacts] = useState<RelationshipContact[]>([]);
  const [trust, setTrust] = useState<TrustTierInfo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [forgetting, setForgetting] = useState<string | null>(null);
  const [fading, setFading] = useState<Record<string, boolean>>({});
  const [pickingFor, setPickingFor] = useState<string | null>(null);
  const [savingType, setSavingType] = useState(false);
  const [grantConfirm, setGrantConfirm] = useState(false);
  const [granting, setGranting] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [trustError, setTrustError] = useState<string | null>(null);
  const [memoryPerson, setMemoryPerson] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const token = session?.access_token;


  const refresh = useCallback(async () => {
    if (!session?.user_id) {
      setFacts([]);
      setContacts([]);
      setTrust(null);
      setLoaded(true);
      return;
    }
    try {
      const [factsRes, relRes, trustRes] = await Promise.all([
        listMemoryFacts(token),
        listRelationships(token),
        getTrustTier(token),
      ]);
      setFacts(Array.isArray(factsRes.facts) ? factsRes.facts : []);
      setContacts(Array.isArray(relRes.contacts) ? relRes.contacts : []);
      setTrust(trustRes || null);
    } catch {
      /* keep prior */
    } finally {
      setLoaded(true);
    }
  }, [session?.user_id, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onForget = async (fact: MemoryFact) => {
    if (!session?.user_id || forgetting) return;
    setForgetting(fact.id);
    setFading((f) => ({ ...f, [fact.id]: true }));
    try {
      await forgetMemoryFact(fact.id, token);
      // Brief fade then remove from list (no invented motion library).
      window.setTimeout(() => {
        setFacts((prev) => prev.filter((x) => x.id !== fact.id));
        setFading((f) => {
          const next = { ...f };
          delete next[fact.id];
          return next;
        });
        setForgetting(null);
      }, 160);
    } catch {
      setFading((f) => {
        const next = { ...f };
        delete next[fact.id];
        return next;
      });
      setForgetting(null);
      await refresh();
    }
  };

  const onPickType = async (contact: RelationshipContact, type: RelationshipTypeValue) => {
    if (!session?.user_id || savingType) return;
    setSavingType(true);
    setTrustError(null);
    try {
      await setRelationshipType(contact.contact_user_id, type, undefined, token);
      setContacts((prev) =>
        prev.map((c) =>
          c.contact_user_id === contact.contact_user_id ? { ...c, type } : c,
        ),
      );
      setPickingFor(null);
    } catch {
      setTrustError("Couldn't update that relationship type. Try again.");
    } finally {
      setSavingType(false);
    }
  };

  const onGrantInnerCircle = async () => {
    if (!session?.user_id || granting) return;
    setGranting(true);
    setTrustError(null);
    try {
      const res = await grantInnerCircleTrust(token);
      setTrust(res.info || { ...trust!, tier: "inner_circle", friendly_name: "Complete trust" });
      setGrantConfirm(false);
    } catch (e) {
      const err = e as Error & { code?: string };
      setTrustError(
        err.code === "cannot_skip"
          ? "Reach Deep understanding first - as we get to know each other better."
          : "Couldn't update trust right now.",
      );
    } finally {
      setGranting(false);
    }
  };

  const onRevokeInnerCircle = async () => {
    if (!session?.user_id || revoking) return;
    setRevoking(true);
    setTrustError(null);
    try {
      const res = await revokeInnerCircleTrust(token);
      setTrust(
        res.info || {
          ...trust!,
          tier: "trusted",
          friendly_name: "Deep understanding",
        },
      );
      setRevokeConfirm(false);
    } catch {
      setTrustError("Couldn't revoke complete trust right now.");
    } finally {
      setRevoking(false);
    }
  };



  if (!session) return null;

  if (memoryPerson) {
    return (
      <PersonMemoryView
        personId={memoryPerson.id}
        displayName={memoryPerson.name}
        bearer={token}
        onBack={() => setMemoryPerson(null)}
        onOpenConversation={onOpenConversation}
      />
    );
  }

  const pickingContact = contacts.find((c) => c.contact_user_id === pickingFor) || null;

  return (
    <section
      className="section you-hub-memory"
      aria-label="What Opal remembers"
      data-testid="what-opal-remembers"
    >
      <h3 className="section-label">What Opal remembers</h3>
      {!loaded ? null : facts.length === 0 ? (
        <p className="you-memory-empty" data-testid="memory-empty">
          Nothing stored yet. Preferences land here as you plan.
        </p>
      ) : (
        <div className="you-consent-rows you-memory-rows">
          {facts.map((fact) => (
            <div
              key={fact.id}
              className={`you-settings-row${fading[fact.id] ? " is-fading" : ""}`}
              data-testid={`memory-fact-row-${fact.id}`}
              data-fact-id={fact.id}
            >
              <div className="you-settings-row-copy">
                <strong data-testid={`memory-fact-label-${fact.id}`}>{fact.label}</strong>
              </div>
              <button
                type="button"
                className="you-memory-forget"
                data-testid={`memory-forget-${fact.id}`}
                aria-label={`Forget ${fact.label}`}
                disabled={forgetting === fact.id}
                onClick={() => void onForget(fact)}
              >
                Forget
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="you-hub-people" data-testid="what-opal-remembers-people">
        <h4 className="section-sublabel">People</h4>
        {!loaded ? null : contacts.length === 0 ? (
          <p className="you-memory-empty" data-testid="people-empty">
            People you connect with show up here.
          </p>
        ) : (
          <div className="you-consent-rows you-people-rows">
            {contacts.map((contact) => (
              <div
                key={contact.contact_user_id}
                className="you-settings-row you-people-row"
                data-testid={`people-row-${contact.contact_user_id}`}
              >
                <button
                  type="button"
                  className="you-settings-row-copy"
                  data-testid={`people-type-open-${contact.contact_user_id}`}
                  aria-label={`How do you know ${contact.display_name || "this person"}?`}
                  onClick={() => setPickingFor(contact.contact_user_id)}
                  style={{
                    flex: 1,
                    textAlign: "left",
                    border: 0,
                    background: "transparent",
                    color: "inherit",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <strong data-testid={`people-name-${contact.contact_user_id}`}>
                    {contact.display_name || "Someone"}
                  </strong>
                  <span
                    className="you-people-type"
                    data-testid={`people-type-${contact.contact_user_id}`}
                  >
                    {relationshipTypeLabel(contact.type)}
                  </span>
                </button>
                <button
                  type="button"
                  className="you-settings-row-trail"
                  data-testid={`people-memory-${contact.contact_user_id}`}
                  aria-label={`What Opal remembers about ${contact.display_name || "this person"}`}
                  onClick={() =>
                    setMemoryPerson({
                      id: contact.contact_user_id,
                      name: contact.display_name || "Someone",
                    })
                  }
                >
                  Memory ›
                </button>
              </div>
            ))}
          </div>
        )}

        {pickingContact ? (
          <div
            className="you-people-picker"
            role="dialog"
            aria-label={`How do you know ${pickingContact.display_name || "this person"}?`}
            data-testid="people-type-picker"
          >
            <p className="you-people-picker-prompt" data-testid="people-picker-prompt">
              How do you know {pickingContact.display_name || "them"}?
            </p>
            <div className="you-people-picker-options">
              {RELATIONSHIP_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className="you-people-picker-option"
                  data-testid={`people-type-option-${opt.value}`}
                  disabled={savingType}
                  onClick={() => void onPickType(pickingContact, opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="you-people-picker-cancel"
              data-testid="people-picker-cancel"
              disabled={savingType}
              onClick={() => setPickingFor(null)}
            >
              Cancel
            </button>
          </div>
        ) : null}
      </div>

      <div className="you-hub-trust" data-testid="what-opal-remembers-trust">
        <h4 className="section-sublabel">Trust &amp; Privacy</h4>
        {!loaded || !trust ? null : (
          <>
            <p className="you-trust-tier" data-testid="trust-tier-name">
              {trust.friendly_name}
            </p>
            <p className="you-trust-copy">What Opal can use right now:</p>
            <ul className="you-trust-access" data-testid="trust-access-list">
              {(trust.can_access_labels || []).map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
            {trust.next_tier ? (
              <p className="you-trust-next" data-testid="trust-next">
                Next: {trust.next_friendly_name}
                {trust.next_requirements ? ` - ${trust.next_requirements}` : ""}
              </p>
            ) : (
              <p className="you-trust-next" data-testid="trust-complete">
                You&apos;ve shared complete trust. You can change this anytime.
              </p>
            )}
            {trust.tier === "trusted" ? (
              <button
                type="button"
                className="you-trust-grant"
                data-testid="trust-grant-button"
                onClick={() => {
                  setTrustError(null);
                  setGrantConfirm(true);
                }}
              >
                Grant complete trust
              </button>
            ) : null}
            {trust.tier === "inner_circle" ? (
              <button
                type="button"
                className="you-spending-remove"
                data-testid="trust-revoke-button"
                onClick={() => {
                  setTrustError(null);
                  setRevokeConfirm(true);
                }}
              >
                Revoke complete trust
              </button>
            ) : null}
            {grantConfirm ? (
              <div
                className="you-trust-confirm"
                role="dialog"
                aria-label="Confirm complete trust"
                data-testid="trust-grant-confirm"
              >
                <p>
                  This lets Opal access everything you share. You can revoke anytime.
                </p>
                <div className="you-trust-confirm-actions">
                  <button
                    type="button"
                    className="you-trust-grant"
                    data-testid="trust-grant-confirm-yes"
                    disabled={granting}
                    onClick={() => void onGrantInnerCircle()}
                  >
                    Grant complete trust
                  </button>
                  <button
                    type="button"
                    className="you-people-picker-cancel"
                    data-testid="trust-grant-confirm-no"
                    disabled={granting}
                    onClick={() => setGrantConfirm(false)}
                  >
                    Not now
                  </button>
                </div>
              </div>
            ) : null}
            {revokeConfirm ? (
              <div
                className="you-trust-confirm"
                role="dialog"
                aria-label="Confirm revoke complete trust"
                data-testid="trust-revoke-confirm"
              >
                <p>
                  Opal will step back to Deep understanding.
                  intimate details stay gated until you grant again.
                </p>
                <div className="you-trust-confirm-actions">
                  <button
                    type="button"
                    className="you-spending-remove"
                    data-testid="trust-revoke-confirm-yes"
                    disabled={revoking}
                    onClick={() => void onRevokeInnerCircle()}
                  >
                    Revoke complete trust
                  </button>
                  <button
                    type="button"
                    className="you-people-picker-cancel"
                    data-testid="trust-revoke-confirm-no"
                    disabled={revoking}
                    onClick={() => setRevokeConfirm(false)}
                  >
                    Keep it
                  </button>
                </div>
              </div>
            ) : null}
            {trustError ? (
              <p className="you-invite-error" data-testid="trust-error">
                {trustError}
              </p>
            ) : null}

          </>
        )}
      </div>
    </section>
  );
}

type CelebrationsProps = {
  session: ProductSession | null;
};

const MONTHS = [
  { v: 1, label: "Jan" },
  { v: 2, label: "Feb" },
  { v: 3, label: "Mar" },
  { v: 4, label: "Apr" },
  { v: 5, label: "May" },
  { v: 6, label: "Jun" },
  { v: 7, label: "Jul" },
  { v: 8, label: "Aug" },
  { v: 9, label: "Sep" },
  { v: 10, label: "Oct" },
  { v: 11, label: "Nov" },
  { v: 12, label: "Dec" },
];

/**
 * You hub section — Celebrations (birthdays / anniversaries).
 * Directly below WhatOpalRemembersSection. Reuses you-settings-row styles.
 */
export function CelebrationsSection({ session }: CelebrationsProps) {
  const [items, setItems] = useState<Celebration[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"birthday" | "anniversary">("birthday");
  const [month, setMonth] = useState(6);
  const [day, setDay] = useState(15);
  const [year, setYear] = useState("");
  const [notes, setNotes] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [curation, setCuration] = useState<CelebrationCuration | null>(null);
  const [curationBusy, setCurationBusy] = useState(false);
  const [planBusy, setPlanBusy] = useState(false);
  const [planNote, setPlanNote] = useState<string | null>(null);
  const token = session?.access_token;

  const refresh = useCallback(async () => {
    if (!session?.user_id) {
      setItems([]);
      setLoaded(true);
      return;
    }
    try {
      const res = await listCelebrations(token);
      setItems(Array.isArray(res.celebrations) ? res.celebrations : []);
    } catch {
      /* keep prior */
    } finally {
      setLoaded(true);
    }
  }, [session?.user_id, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const daysInMonth = useMemo(() => {
    // Leap-year reference so Feb 29 is selectable; server rejects invalid combos.
    return new Date(2024, month, 0).getDate();
  }, [month]);

  useEffect(() => {
    if (day > daysInMonth) setDay(daysInMonth);
  }, [day, daysInMonth]);

  const onAdd = async () => {
    if (!session?.user_id || busy) return;
    const person_name = name.trim();
    if (!person_name) {
      setError("Name is required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const yearNum = year.trim() ? Number(year.trim()) : null;
      const res = await createCelebration(
        {
          person_name,
          kind,
          month,
          day,
          year: Number.isFinite(yearNum as number) ? (yearNum as number) : null,
          notes: notes.trim() || null,
        },
        token,
      );
      setItems((prev) => [...prev, res.celebration]);
      setAdding(false);
      setName("");
      setKind("birthday");
      setMonth(6);
      setDay(15);
      setYear("");
      setNotes("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (c: Celebration) => {
    if (!session?.user_id || deleting) return;
    setDeleting(c.id);
    try {
      await deleteCelebration(c.id, token);
      setItems((prev) => prev.filter((x) => x.id !== c.id));
      if (openId === c.id) {
        setOpenId(null);
        setCuration(null);
      }
    } catch {
      await refresh();
    } finally {
      setDeleting(null);
    }
  };

  const onOpenDetail = async (c: Celebration) => {
    if (openId === c.id) {
      setOpenId(null);
      setCuration(null);
      setPlanNote(null);
      return;
    }
    setOpenId(c.id);
    setCuration(null);
    setPlanNote(null);
    setCurationBusy(true);
    try {
      const res = await curateCelebration(c.id, token);
      setCuration(res.curation || null);
    } catch {
      setCuration(null);
    } finally {
      setCurationBusy(false);
    }
  };

  const onPlanThis = async (c: Celebration, idea: string) => {
    if (!session?.user_id || planBusy || !idea.trim()) return;
    setPlanBusy(true);
    setPlanNote(null);
    const msg = `Plan ${idea} for ${c.person_name}'s ${c.kind}`;
    try {
      await postOpalMessage(msg, token);
      setPlanNote("Asked Opal to set it up - check Center.");
      try {
        window.dispatchEvent(
          new CustomEvent("opal-open-center", { detail: { source: "celebration-plan" } }),
        );
      } catch {
        /* ignore */
      }
    } catch (err) {
      setPlanNote(err instanceof Error ? err.message : "Could not ask Opal");
    } finally {
      setPlanBusy(false);
    }
  };

  if (!session) return null;

  return (
    <section
      className="section you-hub-celebrations"
      aria-label="Celebrations"
      data-testid="celebrations-section"
    >
      <div className="you-celebrations-header">
        <h3 className="section-label">Celebrations</h3>
        <button
          type="button"
          className="you-celebrations-add"
          data-testid="celebrations-add"
          aria-label="Add celebration"
          onClick={() => {
            setAdding((v) => !v);
            setError(null);
          }}
        >
          {adding ? "Cancel" : "+ Add"}
        </button>
      </div>

      {adding ? (
        <div className="you-celebrations-form" data-testid="celebrations-form">
          <label className="you-settings-field">
            <span>Name</span>
            <input
              data-testid="celebrations-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Maya"
              autoComplete="off"
            />
          </label>
          <div className="you-celebrations-kind" role="group" aria-label="Kind">
            <button
              type="button"
              className={`you-celebrations-kind-btn${kind === "birthday" ? " on" : ""}`}
              data-testid="celebrations-kind-birthday"
              aria-pressed={kind === "birthday"}
              onClick={() => setKind("birthday")}
            >
              Birthday
            </button>
            <button
              type="button"
              className={`you-celebrations-kind-btn${kind === "anniversary" ? " on" : ""}`}
              data-testid="celebrations-kind-anniversary"
              aria-pressed={kind === "anniversary"}
              onClick={() => setKind("anniversary")}
            >
              Anniversary
            </button>
          </div>
          <div className="you-celebrations-date-row">
            <label className="you-settings-field">
              <span>Month</span>
              <select
                data-testid="celebrations-month"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {MONTHS.map((m) => (
                  <option key={m.v} value={m.v}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="you-settings-field">
              <span>Day</span>
              <select
                data-testid="celebrations-day"
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
              >
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="you-settings-field">
            <span>Year (optional)</span>
            <input
              data-testid="celebrations-year"
              inputMode="numeric"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="-"
              autoComplete="off"
            />
          </label>
          <label className="you-settings-field">
            <span>Notes (optional)</span>
            <input
              data-testid="celebrations-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder=""
              autoComplete="off"
            />
          </label>
          {error ? (
            <p className="you-celebrations-error" data-testid="celebrations-error">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            className="you-celebrations-save"
            data-testid="celebrations-save"
            disabled={busy}
            onClick={() => void onAdd()}
          >
            Save
          </button>
        </div>
      ) : null}

      {!loaded ? null : items.length === 0 && !adding ? (
        <p className="you-memory-empty" data-testid="celebrations-empty">
          Add birthdays and anniversaries - Opal will remind you in time to plan something good.
        </p>
      ) : items.length > 0 ? (
        <div className="you-consent-rows you-celebrations-rows">
          {items.map((c) => {
            const topIdea =
              (openId === c.id && curation?.plan_ideas?.[0]) || c.would_love || null;
            const open = openId === c.id;
            return (
              <div
                key={c.id}
                className={`you-celebrations-card${open ? " is-open" : ""}`}
                data-testid={`celebration-row-${c.id}`}
                data-celebration-id={c.id}
              >
                <div className="you-settings-row you-celebrations-row">
                  <button
                    type="button"
                    className="you-celebrations-row-main"
                    data-testid={`celebration-open-${c.id}`}
                    aria-expanded={open}
                    onClick={() => void onOpenDetail(c)}
                  >
                    <span className="you-celebrations-row-copy">
                      <span className="you-celebrations-icon" aria-hidden>
                        {c.kind === "anniversary" ? (
                          <img
                            src="/figma-v2/social/social-heart.svg"
                            alt=""
                            width={16}
                            height={16}
                          />
                        ) : (
                          <span className="you-celebrations-cake" title="birthday">
                            🎂
                          </span>
                        )}
                      </span>
                      <strong data-testid={`celebration-name-${c.id}`}>
                        {c.person_name}
                      </strong>
                      <span
                        className="you-celebrations-date"
                        data-testid={`celebration-date-${c.id}`}
                      >
                        {c.date_label || `${c.month}/${c.day}`}
                      </span>
                    </span>
                    {topIdea ? (
                      <span
                        className="you-celebrations-would-love"
                        data-testid={`celebration-would-love-${c.id}`}
                      >
                        {c.person_name} would love: {topIdea}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    className="you-memory-forget you-celebrations-delete"
                    data-testid={`celebration-delete-${c.id}`}
                    aria-label={`Remove ${c.person_name}`}
                    disabled={deleting === c.id}
                    onClick={() => void onDelete(c)}
                  >
                    ×
                  </button>
                </div>

                {open ? (
                  <div
                    className="you-celebrations-detail"
                    data-testid={`celebration-detail-${c.id}`}
                  >
                    {curationBusy ? (
                      <p className="you-celebrations-detail-loading">Finding ideas…</p>
                    ) : curation && curation.mode === "full" ? (
                      <>
                        <p className="you-celebrations-detail-label">
                          What would make {c.person_name}&apos;s day:
                        </p>
                        <ul
                          className="you-celebrations-idea-list"
                          data-testid={`celebration-gifts-${c.id}`}
                        >
                          {(curation.gift_ideas || []).map((idea) => (
                            <li key={`g-${idea}`}>{idea}</li>
                          ))}
                        </ul>
                        <p className="you-celebrations-detail-label">Plan ideas</p>
                        <ul
                          className="you-celebrations-idea-list"
                          data-testid={`celebration-plans-${c.id}`}
                        >
                          {(curation.plan_ideas || []).map((idea) => (
                            <li key={`p-${idea}`}>{idea}</li>
                          ))}
                        </ul>
                        {(curation.shared_history || []).length > 0 ? (
                          <>
                            <p className="you-celebrations-detail-label">
                              Your history together
                            </p>
                            <ul className="you-celebrations-idea-list you-celebrations-history">
                              {(curation.shared_history || []).map((h, i) => (
                                <li key={`h-${i}`}>
                                  {h.plan_title || "A plan"}
                                  {h.vibe || h.cuisine
                                    ? ` - ${[h.vibe, h.cuisine].filter(Boolean).join(", ")}`
                                    : ""}
                                </li>
                              ))}
                            </ul>
                          </>
                        ) : null}
                        {curation.budget_note ? (
                          <p className="you-celebrations-budget">{curation.budget_note}</p>
                        ) : null}
                        {curation.plan_ideas?.[0] ? (
                          <button
                            type="button"
                            className="you-celebrations-plan-btn"
                            data-testid={`celebration-plan-${c.id}`}
                            disabled={planBusy}
                            onClick={() =>
                              void onPlanThis(c, curation.plan_ideas?.[0] || "")
                            }
                          >
                            {planBusy ? "Asking Opal…" : "Plan this"}
                          </button>
                        ) : null}
                        {planNote ? (
                          <p
                            className="you-celebrations-plan-note"
                            data-testid={`celebration-plan-note-${c.id}`}
                          >
                            {planNote}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="you-celebrations-detail-loading">
                        Keep planning together - Opal will learn what {c.person_name} loves.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

type InviteFriendsProps = {
  session: ProductSession | null;
};

function inviteStatusLabel(status: string): string {
  switch (status) {
    case "joined":
      return "Joined";
    case "opened":
      return "Opened";
    case "expired":
      return "Expired";
    default:
      return "Sent";
  }
}

function inviteRowLabel(inv: ProductInvite): string {
  if (inv.invitee_phone) return inv.invitee_phone;
  if (inv.invitee_email) return inv.invitee_email;
  return inv.code;
}

/**
 * You hub — Invite friends (NE-1). Below Trust & Privacy / What Opal remembers.
 * Create link and/or SMS; honest delivery when Twilio is not configured.
 */
export function InviteFriendsSection({ session }: InviteFriendsProps) {
  const [invites, setInvites] = useState<ProductInvite[]>([]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [deliveryNote, setDeliveryNote] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = session?.access_token;

  const applyCreated = useCallback(
    (res: {
      code: string;
      share_url: string;
      invite: ProductInvite;
      delivery?: Record<string, unknown>;
    }) => {
      setCode(res.code);
      setShareUrl(localProductInviteShareUrl(res.code));
      setInvites((prev) => [res.invite, ...prev.filter((i) => i.id !== res.invite.id)]);
      const delivery = res.delivery || {};
      const smsQueued = delivery.sms_queued === true;
      const honest =
        typeof delivery.sms_honest === "string" ? delivery.sms_honest : null;
      if (phone.trim()) {
        setDeliveryNote(
          smsQueued
            ? "SMS queued - they'll get a text with your invite link."
            : honest || "SMS invites need setup - share the link instead.",
        );
      } else {
        setDeliveryNote(null);
      }
    },
    [phone],
  );

  const refresh = useCallback(async () => {
    if (!session?.user_id) {
      setInvites([]);
      setLoaded(true);
      return;
    }
    try {
      const res = await listProductInvites(token);
      const list = Array.isArray(res.invites) ? res.invites : [];
      setInvites(list);
      const latest = list[0];
      if (latest) {
        setCode(latest.code);
        setShareUrl(localProductInviteShareUrl(latest.code));
      }
    } catch {
      /* keep prior */
    } finally {
      setLoaded(true);
    }
  }, [session?.user_id, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onCreate = async () => {
    if (!session?.user_id || creating) return;
    setCreating(true);
    setError(null);
    setDeliveryNote(null);
    try {
      const trimmed = phone.trim();
      const attrs = trimmed ? { invitee_phone: trimmed } : {};
      const res = await createProductInvite(attrs, token);
      applyCreated(res);
      if (trimmed) setPhone("");
    } catch (e) {
      const err = e as Error & { code?: string };
      setError(
        err.code === "rate_limited"
          ? "You've sent quite a few invites today - try again tomorrow."
          : "Couldn't create an invite right now.",
      );
    } finally {
      setCreating(false);
    }
  };

  const onCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Couldn't copy - try selecting the link.");
    }
  };

  const onShare = async () => {
    if (!shareUrl) return;
    const payload = {
      title: "Join me on Opal",
      text: "I'd love to plan with you on Opal.",
      url: shareUrl,
    };
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await (navigator as Navigator & { share: (d: unknown) => Promise<void> }).share(payload);
      } else {
        await onCopy();
      }
    } catch {
      /* user cancelled share */
    }
  };

  if (!session) return null;

  return (
    <section
      className="section you-hub-invites"
      aria-label="Invite friends"
      data-testid="invite-friends"
    >
      <h3 className="section-label">Invite friends</h3>
      <p className="you-trust-copy you-invite-copy">
        Opal is better with friends. Invite someone you&apos;d love to plan with.
      </p>

      {!loaded ? null : (
        <>
          {code && shareUrl ? (
            <div className="you-invite-share" data-testid="invite-share-card">
              <p className="you-invite-code" data-testid="invite-code">
                Your code: <strong>{code}</strong>
              </p>
              <p className="you-invite-url" data-testid="invite-share-url">
                {shareUrl}
              </p>
              <div className="you-invite-actions">
                <button
                  type="button"
                  className="you-trust-grant"
                  data-testid="invite-share-button"
                  onClick={() => void onShare()}
                >
                  Share
                </button>
                <button
                  type="button"
                  className="you-invite-copy-btn"
                  data-testid="invite-copy-button"
                  onClick={() => void onCopy()}
                >
                  {copied ? "Copied" : "Copy link"}
                </button>
              </div>
            </div>
          ) : (
            <p className="you-memory-empty" data-testid="invite-empty">
              Opal is better with friends. Invite someone you&apos;d love to plan with.
            </p>
          )}

          <label className="you-invite-phone-field" data-testid="invite-phone-field">
            <span>Phone (optional - for SMS)</span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+1 202 555 0100"
              value={phone}
              data-testid="invite-phone-input"
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>

          <button
            type="button"
            className="you-trust-grant"
            data-testid="invite-create-button"
            disabled={creating}
            onClick={() => void onCreate()}
          >
            {phone.trim()
              ? "Send invite"
              : code
                ? "Create another invite"
                : "Create invite link"}
          </button>

          {deliveryNote ? (
            <p className="you-invite-delivery" data-testid="invite-delivery-note">
              {deliveryNote}
            </p>
          ) : null}

          {error ? (
            <p className="you-invite-error" data-testid="invite-error">
              {error}
            </p>
          ) : null}

          {invites.length > 0 ? (
            <ul className="you-invite-list" data-testid="invite-status-list">
              {invites.map((inv) => (
                <li key={inv.id} data-testid={`invite-row-${inv.id}`}>
                  <span data-testid={`invite-label-${inv.id}`}>{inviteRowLabel(inv)}</span>
                  <span
                    className="you-invite-status"
                    data-testid={`invite-status-${inv.id}`}
                  >
                    {inviteStatusLabel(inv.status)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </section>
  );
}
