/**
 * Nested You settings destinations — navigable from You hub 618:1344.
 * Dock remains owned by parent OpalApp (do not duplicate).
 */
import React, { useEffect, useState } from "react";
import type { ProductSession } from "../api/productClient";

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
  | { kind: "toggle"; id: string; title: string; subtitle: string; defaultOn?: boolean }
  | {
      kind: "nav";
      id: string;
      title: string;
      subtitle: string;
      value?: string;
      /** Nested dated setting opened from this row */
      opens?: YouSettingKey;
    }
  | { kind: "action"; id: string; title: string; destructive?: boolean; opens?: YouSettingKey }
  | { kind: "note"; id: string; text: string }
  | { kind: "field"; id: string; label: string; value: string; placeholder?: string };

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
        id: "graph-visibility",
        title: "Graph visibility",
        subtitle: "Choose who can see each Graph. Per-Graph choice wins.",
        defaultOn: true,
      },
      {
        kind: "toggle",
        id: "exact-location",
        title: "Exact location after join",
        subtitle: "Share the exact spot only with approved participants.",
        defaultOn: true,
      },
      {
        kind: "toggle",
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
      },
      {
        kind: "nav",
        id: "blocked-muted",
        title: "Blocked & muted",
        subtitle: "People and content you have limited",
      },
      {
        kind: "note",
        id: "privacy-law",
        text: "Private Opal location use is separate from what another person can see.",
      },
    ],
  },
  "feed-discovery": {
    title: "Feed & discovery",
    lede: "Keep your world relevant without turning it into noise.",
    rows: [
      {
        kind: "toggle",
        id: "people-first",
        title: "People you know first",
        subtitle: "Weight connections and real conversation history before strangers.",
        defaultOn: true,
      },
      {
        kind: "toggle",
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
      },
      {
        kind: "toggle",
        id: "suggested-people",
        title: "Suggested people",
        subtitle: "Allow relevant people you do not follow to appear occasionally.",
        defaultOn: false,
      },
      {
        kind: "toggle",
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
        id: "timing",
        title: "Use location for timing",
        subtitle: "ETA, leave time, nearby relevance and buffers.",
        defaultOn: true,
      },
      {
        kind: "toggle",
        id: "live-share",
        title: "Share live location",
        subtitle: "Off by default. Share only when you explicitly choose.",
        defaultOn: false,
      },
      {
        kind: "toggle",
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
      },
      {
        kind: "nav",
        id: "timezone",
        title: "Time zone",
        subtitle: "Automatic while traveling",
      },
      {
        kind: "nav",
        id: "map-handoff",
        title: "Map handoff",
        subtitle: "Preferred maps app for Leave / Arrive",
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
        id: "like-counts",
        title: "Public like counts",
        subtitle: "Show like counts on public eligible content.",
        defaultOn: true,
      },
      {
        kind: "toggle",
        id: "view-counts",
        title: "Public view counts",
        subtitle: "Show view counts where the creator allows them.",
        defaultOn: true,
      },
      {
        kind: "toggle",
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
      },
      {
        kind: "toggle",
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
        subtitle: "When on, Opal can surface useful alignment from the call.",
        defaultOn: true,
      },
      {
        kind: "toggle",
        id: "ask-every",
        title: "Ask on every call",
        subtitle: "Require confirmation each time instead of remembering.",
        defaultOn: false,
      },
      {
        kind: "toggle",
        id: "suggest-graphs",
        title: "Suggest Graph ideas after calls",
        subtitle: "Surface possibilities privately after the call.",
        defaultOn: true,
      },
      {
        kind: "toggle",
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
      },
      {
        kind: "note",
        id: "assist-law",
        text: "Opal never speaks as you, sends for you, or publishes a Memory from a call.",
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
        id: "graph-changes",
        title: "Graph changes",
        subtitle: "Time, place, or membership shifts that matter.",
        defaultOn: true,
      },
      {
        kind: "toggle",
        id: "live-movement",
        title: "Live movement",
        subtitle: "Leave-by and arrival updates you opted into.",
        defaultOn: true,
      },
      {
        kind: "toggle",
        id: "social-activity",
        title: "Social activity",
        subtitle: "Likes, comments, and follows — quieter by default.",
        defaultOn: false,
      },
      {
        kind: "toggle",
        id: "critical-timing",
        title: "Critical timing",
        subtitle: "Reservation holds and reconfirm windows.",
        defaultOn: true,
      },
      {
        kind: "note",
        id: "notif-law",
        text: "Critical Graph timing always outranks social noise.",
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
        subtitle: "Primary device for this account",
        value: "Active",
      },
      {
        kind: "nav",
        id: "desktop",
        title: "Desktop session",
        subtitle: "Browser or desktop access via QR",
      },
      { kind: "action", id: "link-qr", title: "Link with QR" },
      {
        kind: "note",
        id: "device-note",
        text: "Linking uses a short-lived QR — never your password. Revoke anytime.",
      },
      {
        kind: "nav",
        id: "revoke",
        title: "Revoke a device",
        subtitle: "End sessions you no longer trust",
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
      },
      {
        kind: "nav",
        id: "muted",
        title: "Muted people",
        subtitle: "Still connected — quieter in your feed",
      },
      {
        kind: "nav",
        id: "reported",
        title: "Reported content",
        subtitle: "Things you flagged for review",
      },
      {
        kind: "nav",
        id: "unknown",
        title: "Unknown contact requests",
        subtitle: "Who can reach you cold",
      },
      {
        kind: "nav",
        id: "location-safety",
        title: "Location safety",
        subtitle: "Exact share and live location limits",
      },
      {
        kind: "note",
        id: "safety-note",
        text: "Safety tools are yours to use quietly. Blocking is private to the other person.",
      },
    ],
  },
  "spending-fit": {
    title: "Spending & fit",
    lede: "Give Opal context without turning every experience into a budget form.",
    rows: [
      {
        kind: "toggle",
        id: "learn-choices",
        title: "Learn from my choices",
        subtitle: "Use accepted and rejected fits to improve suggestions.",
        defaultOn: true,
      },
      {
        kind: "toggle",
        id: "budget-private",
        title: "Keep my budget private",
        subtitle: "Exact amounts stay private unless I explicitly share them.",
        defaultOn: true,
      },
      {
        kind: "toggle",
        id: "ask-when-cost",
        title: "Ask only when cost matters",
        subtitle: "Do not interrupt when the experience already fits.",
        defaultOn: true,
      },
      {
        kind: "nav",
        id: "default-approach",
        title: "Default approach",
        subtitle: "Flexible. No fixed global number.",
      },
      {
        kind: "nav",
        id: "trip-goals",
        title: "Trip goals",
        subtitle: "1 active goal",
      },
      {
        kind: "nav",
        id: "per-graph-fit",
        title: "Per-Graph fit",
        subtitle: "Every Graph can override these defaults",
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
      },
      {
        kind: "nav",
        id: "session-alerts",
        title: "Session alerts",
        subtitle: "Know when a new device signs in",
      },
      {
        kind: "action",
        id: "sign-out-here",
        title: "Sign out",
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
        text: "Account changes stay private. Delete is nested and confirmed — never one tap.",
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
        kind: "field",
        id: "confirm",
        label: "Type DELETE to confirm",
        value: "",
        placeholder: "DELETE",
      },
      {
        kind: "action",
        id: "permanently-delete",
        title: "Permanently delete account",
        destructive: true,
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
};

export function YouSettingsDestination({
  setting,
  onBack,
  onOpenSetting,
  session,
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
    setToggles(init);
  }, [setting]);

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
          <button type="button" className="you-settings-change-photo">
            Change photo
          </button>
        </div>
      ) : null}

      <div className="you-settings-body">
        {screen.rows.map((row) => {
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
                  onClick={() => setToggles((t) => ({ ...t, [row.id]: !on }))}
                >
                  <span className="you-settings-toggle-knob" />
                </button>
              </div>
            );
          }
          if (row.kind === "nav") {
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
                onClick={() => {
                  if (row.opens) {
                    onOpenSetting?.(row.opens);
                    return;
                  }
                  if (row.id === "save" || row.id === "keep-account") onBack();
                }}
              >
                {row.title}
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
      </div>
    </div>
  );
}
