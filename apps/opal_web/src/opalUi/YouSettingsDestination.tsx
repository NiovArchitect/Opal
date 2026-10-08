/**
 * Nested You settings destinations — navigable from You hub 618:1344.
 * Dock remains owned by parent OpalApp (do not duplicate).
 * Phase 1D: WhatOpalCanDoSection lives here; rendered on the You hub (no new nav).
 * Phase 7A: WhatOpalRemembersSection — directly below consent section.
 * Phase 10A / D-2: CelebrationsSection — directly below What Opal remembers.
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
  getOpalWallet,
  grantConsent,
  listCelebrations,
  listConsents,
  listOpalWalletTransactions,
  listProductInvites,
  localProductInviteShareUrl,
  getTrustTier,
  grantInnerCircleTrust,
  revokeInnerCircleTrust,
  listMemoryFacts,
  listRelationships,
  postOpalMessage,
  requestOpalWalletLoad,
  revokeConsent,
  setFinancialProfile,
  setRelationshipType,
  type Celebration,
  type CelebrationCuration,
  type ComfortLevel,
  type ConsentCapability,
  type ConsentProof,
  type FinancialProfile,
  type MemoryFact,
  type OpalWallet,
  type OpalWalletTransaction,
  type ProductInvite,
  type ProductSession,
  type RelationshipContact,
  type RelationshipTypeValue,
  type TrustTierInfo,
} from "../api/productClient";
import {
  RELATIONSHIP_TYPE_OPTIONS,
  relationshipTypeLabel,
} from "./relationshipTypes";
import { PersonMemoryView } from "./intelligence/PersonMemoryView";

export type YouSettingKey =
  | "edit-profile"
  | "privacy"
  | "feed-discovery"
  | "location-travel"
  | "engagement"
  | "calls-assist"
  | "notifications"
  | "linked-devices"
  | "safety"
  | "spending-fit"
  | "account-security"
  | "delete-account";

export const YOU_SETTING_FIGMA: Record<YouSettingKey, string> = {
  "edit-profile": "618:2123",
  privacy: "618:1524",
  "feed-discovery": "618:1801",
  "location-travel": "618:1591",
  engagement: "618:1868",
  "calls-assist": "618:1733",
  notifications: "618:1935",
  "linked-devices": "618:2003",
  safety: "618:2060",
  "spending-fit": "618:1662",
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
  | { kind: "action"; id: string; title: string; destructive?: boolean; opens?: YouSettingKey }
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
    lede: "Your identity. Social preferences and permissions stay in their own settings.",
    rows: [
      { kind: "field", id: "name", label: "Name", value: "", placeholder: "Your name" },
      { kind: "field", id: "username", label: "Username", value: "", placeholder: "@handle" },
      {
        kind: "field",
        id: "bio",
        label: "Bio",
        value: "Keep it short. Let your Graph speak.",
        placeholder: "Keep it short. Let your Graph speak.",
        blockedReason: "Bio is not on the user profile API yet — name and username save.",
      },
      {
        kind: "note",
        id: "identity-note",
        text: "Phone number is verified identity and is changed through account security.",
      },
      { kind: "action", id: "save", title: "Save profile" },
    ],
  },
  privacy: {
    title: "Privacy & audience",
    lede: "Keep the social surface open without giving away what should stay private.",
    rows: [
      {
        kind: "toggle",
        blockedReason: "Needs per-Graph audience API — not wired yet.",
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
        text: "Private Opal location use is separate from what another person can see. Trust & Privacy under What Opal remembers is live today.",
      },
    ],
  },
  "feed-discovery": {
    title: "Feed & discovery",
    lede: "Keep your world relevant without turning it into noise.",
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
        value: "25 mi",
        blockedReason: "Range picker needs discovery API — fixed 25 mi for now.",
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
        text: "Exact location is never exposed by this setting. Location precision is governed separately.",
      },
    ],
  },
  "location-travel": {
    title: "Location & travel",
    lede: "Use location to remove friction, not to expose you.",
    rows: [
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
        kind: "toggle",
        blockedReason: "Travel mode needs home-area + presence detection.",
        id: "travel-mode",
        title: "Travel mode",
        subtitle: "Adjust feed and Graph fit when you are away from home.",
        defaultOn: false,
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
        id: "timezone",
        title: "Time zone",
        subtitle: "Automatic while traveling",
        blockedReason: "Uses device timezone today — no override UI yet.",
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
        text: "Someone can benefit from your ETA without receiving your precise live location.",
      },
    ],
  },
  engagement: {
    title: "Engagement",
    lede: "Keep social feedback useful without turning relationships into scores.",
    rows: [
      {
        kind: "toggle",
        blockedReason: "Needs SocialMoment engagement preference fields.",
        id: "like-counts",
        title: "Public like counts",
        subtitle: "Show like counts on public eligible content.",
        defaultOn: true,
      },
      {
        kind: "toggle",
        blockedReason: "Needs SocialMoment engagement preference fields.",
        id: "view-counts",
        title: "Public view counts",
        subtitle: "Show view counts where the creator allows them.",
        defaultOn: true,
      },
      {
        kind: "toggle",
        blockedReason: "Repost permission flag not on content schema yet.",
        id: "reposts",
        title: "Allow reposts",
        subtitle: "Let eligible content be reposted inside its original visibility rules.",
        defaultOn: true,
      },
      {
        kind: "nav",
        id: "comments",
        title: "Comments",
        subtitle: "Choose who may comment on content you publish.",
        blockedReason: "Comment audience picker needs content ACL API.",
      },
      {
        kind: "toggle",
        blockedReason: "Already private by product law — no toggle surface yet.",
        id: "private-history",
        title: "Private shared history",
        subtitle: "Connection counts stay private and never become a public score.",
        defaultOn: true,
      },
      {
        kind: "note",
        id: "engagement-law",
        text: "Likes, views and messages can shape ranking, but never create permission, Connection or Graph membership.",
      },
    ],
  },
  "calls-assist": {
    title: "Calls & Opal Assist",
    lede: "Make calls more useful without making them feel watched.",
    rows: [
      {
        kind: "toggle",
        id: "assist",
        title: "Opal Assist on calls",
        subtitle: "Default for future calls. Pause a private call without changing this.",
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
        text: "Opal never speaks as you, sends for you, or publishes a Memory from a call. Assist default above is live.",
      },
    ],
  },
  notifications: {
    title: "Notifications",
    lede: "Signal only. Opal should interrupt you only when it helps.",
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
        subtitle: "Let people know when you have seen a message. Unread still works if this is off.",
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
        subtitle: "Likes, comments, and follows — quieter by default.",
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
        text: "Messages & calls and Read receipts save today. Other push categories wait on Expo Dev Client rebuild with APNs.",
      },
    ],
  },
  "linked-devices": {
    title: "Linked devices",
    lede: "Use Opal Graph on another device without exposing private credentials.",
    rows: [
      {
        kind: "nav",
        id: "this-phone",
        title: "This phone",
        subtitle: "Primary device for this account — this session",
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
        id: "link-qr-soon",
        text: "QR linking needs a short-lived signed desktop session API — not in this build. Sign in on web with the same phone OTP for now.",
      },
      {
        kind: "note",
        id: "device-note",
        text: "Linking will use a short-lived QR — never your password. Revoke anytime once the device roster ships.",
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
  safety: {
    title: "Safety",
    lede: "Quiet controls for the rare moments when someone should not have access to you.",
    rows: [
      {
        kind: "nav",
        id: "blocked",
        title: "Blocked people",
        subtitle: "Cannot message, call, or join your Graphs",
        blockedReason: "Block list UI needs TrustSafety block list endpoint wired.",
      },
      {
        kind: "nav",
        id: "muted",
        title: "Muted people",
        subtitle: "Still connected — quieter in your feed",
        blockedReason: "Mute list UI needs conversation mute roster.",
      },
      {
        kind: "nav",
        id: "reported",
        title: "Reported content",
        subtitle: "Things you flagged for review",
        blockedReason: "Report history surface not built.",
      },
      {
        kind: "nav",
        id: "unknown",
        title: "Unknown contact requests",
        subtitle: "Who can reach you cold",
        blockedReason: "Cold-contact policy API not shipped.",
      },
      {
        kind: "nav",
        id: "location-safety",
        title: "Location safety",
        subtitle: "Exact share and live location limits",
        blockedReason: "Depends on live-location session API.",
      },
      {
        kind: "note",
        id: "safety-note",
        text: "Safety tools are yours to use quietly. Blocking is private to the other person. Backend TrustSafety exists — list UIs are the missing piece.",
      },
    ],
  },
  "spending-fit": {
    title: "Spending & fit",
    lede: "Give Opal context without turning every experience into a budget form.",
    rows: [
      {
        kind: "note",
        id: "spending-live",
        text: "Spending comfort (Budget / Moderate / Comfortable / Luxury) lives on this page. Trusted+ unlocks save.",
      },
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
        blockedReason: "Already private by financial profile policy — no separate flag.",
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
        id: "per-graph-fit",
        title: "Per-Graph fit",
        subtitle: "Every Graph can override these defaults",
        blockedReason: "Per-Graph spend override needs Graph settings API.",
      },
      {
        kind: "note",
        id: "spending-law",
        text: "This is background intelligence. A specific Graph always wins.",
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
        blockedReason: "Change-phone requires re-verify OTP flow — not exposed yet.",
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
        blockedReason: "Phone OTP is the second factor today — no extra step UI.",
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
        text: "Account changes stay private. Delete is nested and confirmed — never one tap. Name and username save from Edit profile.",
      },
    ],
  },
  "delete-account": {
    title: "Delete account",
    lede: "This cannot be hidden behind a generic button or accidental tap.",
    rows: [
      {
        kind: "note",
        id: "delete-warning",
        text: "This permanently removes your account.\nYour published content, relationship edges and account access will be handled according to the deletion policy. Active provider obligations must be resolved first.",
      },
      {
        kind: "note",
        id: "delete-unavailable",
        text: "Account deletion needs a server hard-delete + session revoke endpoint that is not exposed in this build. Contact support to delete — the app will not pretend it succeeded.",
      },
      {
        kind: "action",
        id: "keep-account",
        title: "Keep my account",
      },
      {
        kind: "note",
        id: "delete-law",
        text: "Server must revoke sessions and capabilities immediately after successful deletion. Do not pretend deletion succeeded before the authoritative result.",
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

  const [fields, setFields] = useState<Record<string, string>>(() => ({
    name,
    username: handle ? `@${handle.replace(/^@/, "")}` : "",
    bio: "Keep it short. Let your Graph speak.",
    confirm: "",
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
        : setting === "spending-fit"
          ? "gold"
          : setting === "engagement" || setting === "safety" || setting === "delete-account"
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
          <span
            className="you-settings-blocked"
            data-testid="you-setting-photo-blocked"
            aria-label="Photo upload needs media storage"
          >
            Photo upload needs media storage — next build
          </span>
        </div>
      ) : null}

      <div className="you-settings-body">
        {screen.rows.map((row) => {
          if (row.kind === "toggle") {
            const on = toggles[row.id] ?? false;
            // Blocked toggles: visible, not interactive, honest external/product reason.
            if (row.blockedReason) {
              return (
                <div
                  key={row.id}
                  className="you-settings-row you-settings-row-blocked"
                  data-testid={`you-setting-row-${row.id}`}
                >
                  <div className="you-settings-row-copy">
                    <strong>{row.title}</strong>
                    {row.subtitle ? (
                      <details className="you-settings-why">
                        <summary>Why this is waiting</summary>
                        <p>{row.subtitle}</p>
                      </details>
                    ) : null}
                  </div>
                  <span
                    className="you-settings-blocked"
                    data-testid={`you-setting-blocked-${row.id}`}
                    aria-label={`${row.title}: ${row.blockedReason}`}
                  >
                    {row.blockedReason}
                  </span>
                </div>
              );
            }
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
                      void import("../api/productClient").then(({ updateAssistPreference }) =>
                        updateAssistPreference(next, session?.access_token).catch(() => undefined),
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
            if (!row.opens && !row.blockedReason && row.value) {
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
                  <span className="you-settings-row-value">{row.value}</span>
                </div>
              );
            }
            // Dead / blocked nav rows must not look clickable.
            if (!row.opens || row.blockedReason) {
              return (
                <div
                  key={row.id}
                  className="you-settings-row you-settings-row-blocked"
                  data-testid={`you-setting-row-${row.id}`}
                >
                  <div className="you-settings-row-copy">
                    <strong>{row.title}</strong>
                    {row.subtitle ? (
                      <details className="you-settings-why">
                        <summary>Why this is waiting</summary>
                        <p>{row.subtitle}</p>
                      </details>
                    ) : null}
                  </div>
                  <span
                    className="you-settings-blocked"
                    data-testid={`you-setting-blocked-${row.id}`}
                    aria-label={`${row.title}: ${row.blockedReason || "Not available yet"}`}
                  >
                    {row.blockedReason || "Not available in this build"}
                  </span>
                </div>
              );
            }
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
                        .then(() => {
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
                {row.id === "save" && saving ? "Saving…" : row.title}
              </button>
            );
          }
          if (row.kind === "field") {
            const key = row.id;
            const blocked = Boolean(row.blockedReason);
            return (
              <label key={row.id} className="you-settings-field" data-testid={`you-setting-row-${row.id}`}>
                <span>
                  {row.label}
                  {blocked ? (
                    <span
                      className="you-settings-blocked"
                      data-testid={`you-setting-blocked-${row.id}`}
                    >
                      {row.blockedReason}
                    </span>
                  ) : null}
                </span>
                <input
                  value={fields[key] ?? ""}
                  placeholder={row.placeholder}
                  disabled={blocked}
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
        {setting === "spending-fit" ? (
          <SpendingComfortSection session={session ?? null} />
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
    title: "Let Opal place calls for you",
    description: "Opal can call on your behalf, with your approval each time.",
  },
  {
    id: "bookings_reserve",
    title: "Let Opal make reservations",
    description: "Opal can hold tables and book on your behalf.",
  },
  {
    id: "messaging_business",
    title: "Message businesses for you",
    description: "Opal can message businesses on your behalf.",
    blockedReason:
      "Business messaging needs a Twilio/business channel connector — not configured.",
  },
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
 * You hub section — "What Opal can do for you".
 * Reuses you-settings-row / you-settings-toggle only. No new nav destination.
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

type SpendingComfortProps = {
  session: ProductSession | null;
};

/**
 * P2 — Spending comfort lives only under You → Settings → Spending & fit.
 * Trust-gated at trusted+. Reuses you-hub-spending chrome.
 */
function formatCents(cents: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format((cents || 0) / 100);
  } catch {
    return `$${((cents || 0) / 100).toFixed(2)}`;
  }
}

export function SpendingComfortSection({ session }: SpendingComfortProps) {
  const [trust, setTrust] = useState<TrustTierInfo | null>(null);
  const [financial, setFinancial] = useState<FinancialProfile | null>(null);
  const [wallet, setWallet] = useState<OpalWallet | null>(null);
  const [walletTx, setWalletTx] = useState<OpalWalletTransaction[]>([]);
  const [walletLoadNote, setWalletLoadNote] = useState<string | null>(null);
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
      setWallet(null);
      setWalletTx([]);
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

      // Opal balance is account-scoped (separate from bank money / spending comfort).
      try {
        const [w, txs] = await Promise.all([
          getOpalWallet(token),
          listOpalWalletTransactions(token, 12),
        ]);
        setWallet(w);
        setWalletTx(txs);
      } catch {
        setWallet(null);
        setWalletTx([]);
      }
    } catch {
      /* keep prior */
    } finally {
      setLoaded(true);
    }
  }, [session?.user_id, token]);

  const onLoadWallet = async () => {
    if (!session?.user_id) return;
    try {
      const res = await requestOpalWalletLoad(
        {
          amount_cents: 2500,
          idempotency_key: `ui-load-${Date.now()}`,
        },
        token,
      );
      if (res.kind === "disabled" || res.loadable === false) {
        setWalletLoadNote(
          res.message ||
            "Wallet loading is not connected yet. Opal money stays at $0 until Stripe is enabled.",
        );
      } else if (res.wallet) {
        setWallet(res.wallet);
        setWalletLoadNote("Loaded.");
        void refresh();
      }
    } catch {
      setWalletLoadNote(
        "Wallet loading is not connected yet. See Settings after Stripe is enabled.",
      );
    }
  };

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onSaveFinancial = async () => {
    if (!session?.user_id || !comfortDraft || savingFinancial) return;
    setSavingFinancial(true);
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
    } catch {
      /* keep form */
    } finally {
      setSavingFinancial(false);
    }
  };

  const onDeleteFinancial = async () => {
    if (!session?.user_id || deletingFinancial) return;
    setDeletingFinancial(true);
    try {
      await deleteFinancialProfile(token);
      setFinancial(null);
      setComfortDraft("");
      setDiningMin("");
      setDiningMax("");
      setNotesDraft("");
      setDeleteConfirm(false);
    } catch {
      /* keep confirm */
    } finally {
      setDeletingFinancial(false);
    }
  };

  if (!session) return null;

  return (
    <div className="you-hub-spending you-settings-spending" data-testid="spending-comfort">
      <section className="you-opal-wallet" data-testid="opal-wallet">
        <h5 className="you-spending-label">Opal balance</h5>
        <p className="you-trust-copy">
          Opal money is separate from bank money. Used for bookings you confirm in chat.
        </p>
        <div className="you-opal-wallet-balance" data-testid="opal-wallet-balance">
          {formatCents(wallet?.balance_cents ?? 0, wallet?.currency || "USD")}
        </div>
        <p className="you-trust-copy" data-testid="opal-wallet-threshold">
          Auto-approve under{" "}
          {formatCents(wallet?.auto_approve_threshold_cents ?? 5000, wallet?.currency || "USD")}{" "}
          - larger spends ask first.
        </p>
        <button
          type="button"
          className="you-trust-grant"
          data-testid="opal-wallet-load"
          onClick={() => void onLoadWallet()}
        >
          Load
        </button>
        {walletLoadNote ? (
          <p className="you-trust-copy" data-testid="opal-wallet-load-note">
            {walletLoadNote}
          </p>
        ) : (
          <p className="you-trust-copy">
            Load stays disabled until Stripe is connected (honest - no fake money).
          </p>
        )}
        {walletTx.length > 0 ? (
          <ul className="you-opal-wallet-tx" data-testid="opal-wallet-transactions">
            {walletTx.map((tx) => (
              <li key={tx.id} data-testid={`opal-wallet-tx-${tx.type}`}>
                <span>{tx.type}</span>
                <span>
                  {tx.type === "spend" || tx.type === "adjustment" ? "-" : "+"}
                  {formatCents(Math.abs(tx.amount_cents), wallet?.currency || "USD")}
                </span>
                <span>bal {formatCents(tx.balance_after_cents, wallet?.currency || "USD")}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="you-trust-copy" data-testid="opal-wallet-tx-empty">
            No wallet activity yet.
          </p>
        )}
      </section>

      <h5 className="you-spending-label">Spending comfort</h5>
      {!loaded ? null : !trustedPlus ? (
        <p className="you-trust-copy" data-testid="spending-trust-gate">
          Reach Deep understanding (trusted+) to set Budget, Moderate, Comfortable, or Luxury.
          Trust lives under What Opal remembers.
        </p>
      ) : (
        <>
          <p className="you-trust-copy">This helps me suggest places that fit your life.</p>
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
    try {
      await setRelationshipType(contact.contact_user_id, type, undefined, token);
      setContacts((prev) =>
        prev.map((c) =>
          c.contact_user_id === contact.contact_user_id ? { ...c, type } : c,
        ),
      );
      setPickingFor(null);
    } catch {
      /* keep picker open */
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
          ? "Reach Deep understanding first — as we get to know each other better."
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
          Opal doesn&apos;t remember anything yet. As you make plans, Opal learns your preferences
          here.
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
            People you connect with will show up here so you can tell Opal how you know them.
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
                {trust.next_requirements ? ` — ${trust.next_requirements}` : ""}
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
      setPlanNote("Asked Opal to set it up — check Center.");
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
              placeholder="—"
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
          Add birthdays and anniversaries — Opal will remind you in time to plan something good.
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
                                    ? ` — ${[h.vibe, h.cuisine].filter(Boolean).join(", ")}`
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
                        Keep planning together — Opal will learn what {c.person_name} loves.
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
            ? "SMS queued — they'll get a text with your invite link."
            : honest || "SMS invites need setup — share the link instead.",
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
          ? "You've sent quite a few invites today — try again tomorrow."
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
      setError("Couldn't copy — try selecting the link.");
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
            <span>Phone (optional — for SMS)</span>
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
