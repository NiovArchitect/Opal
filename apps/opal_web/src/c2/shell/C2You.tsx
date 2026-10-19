/**
 * Repair #18 - Division C2 - YOU hub and settings (track-c2 section
 * 10). A hub worth opening; REAL settings only.
 *
 * The real-only rule is structural here: this component renders rows
 * only from a SettingsSectionProjection, and the adapter that builds
 * those projections (shellData.ts) includes a row ONLY when a real
 * persisted preference or real action exists behind it in this base.
 * Blocked and coming-soon rows are not greyed out - they are absent.
 *
 * Toggle truth: a toggle renders the projected value. Tapping emits
 * setPreference and the toggle HOLDS its projected value until the
 * refreshed projection returns; failure restores the projected value
 * with one error line. It never flips locally and hopes.
 */
import React, { useMemo, useState } from "react";
import type {
  SettingsSectionProjection,
  YouHubProjection,
} from "./projections";
import { Avatar, IconBack, IconChevron } from "./bits";
import { OrbMark, OrbMarkMono } from "../../brand/orb/OrbMark";
import { PlanCardC2 } from "../PlanCardC2";

/**
 * Audit A9 — the served build identity, read from the same build
 * stamp the Home badge renders (data-git-head, set from the Vite
 * build define in main.tsx). One injected value, two surfaces, so
 * they can never disagree. Absent stamp renders no footer at all —
 * never typed copy wearing a build's name.
 */
export function readServedBuild(): string | null {
  if (typeof document === "undefined") return null;
  return document.documentElement.getAttribute("data-git-head");
}

const SUPPORT_CATEGORIES = [
  { id: "something_broke", label: "Something is broken" },
  { id: "wrong_information", label: "Opal got something wrong" },
  { id: "hard_to_use", label: "Hard to use" },
  { id: "account", label: "My account" },
  { id: "payments", label: "Payments" },
  { id: "something_else", label: "Something else" },
] as const;

export type C2YouEvents = {
  editProfile: () => void;
  openSection: (key: string) => void;
  backToHub: () => void;
  setPreference: (sectionKey: string, rowId: string, value: boolean) => Promise<void>;
  runAction: (sectionKey: string, rowId: string) => void;
  saveProfileFields: (name: string, handle: string) => Promise<void>;
  submitSupportReport: (
    kind: "problem" | "feedback",
    category: string,
    body: string,
  ) => Promise<{ reference: string }>;
  /** Adoption wave 2 — optional so review/test hosts that do not
   * wire the new actions keep compiling; the forms render an honest
   * error line when an event is not wired. */
  /** Repair #18 SM scoped build - saves the Soul form to the real
   * assistance-preference truth (PATCH /memory-wallet/soul). */
  saveSoulPreferences?: (attrs: Record<string, string>) => Promise<void>;
  addSavedLogin?: (host: string, secret: string) => Promise<void>;
  redeemInviteCode?: (code: string) => Promise<{ credit_line: string }>;
  executeDeletion?: (
    mode: "data" | "account",
  ) => Promise<{ reference: string }>;
  setModePreference: (preference: "system" | "light" | "dark") => void;
  modePreference: "system" | "light" | "dark";
};

/**
 * Repair #18 DIR-2 — the Settings architecture (surface map entry 12,
 * sections 12.1-12.9), grouped by life concern. Every key here is a
 * destination in the hub index (shellData.youHubFromSession), so every
 * Settings destination is at most 2 taps from the dock: dock -> You ->
 * its row (or the settings search above). Sections whose substance is
 * not built yet still appear — as honest gated destinations in plain
 * words, never as painted controls (see shellData.buildSettingsSection).
 */
export const HUB_GROUPS: Array<{ label: string; keys: string[] }> = [
  { label: "You", keys: ["edit-profile", "appearance", "your-moments", "your-library"] },
  { label: "Soul and memory", keys: ["soul-memory", "what-opal-remembers"] },
  { label: "How Opal helps", keys: ["how-opal-helps", "calls-assist", "approvals-activity"] },
  { label: "What Opal hears", keys: ["what-opal-hears", "connections", "connected-sources"] },
  { label: "Quiet and privacy", keys: ["notifications", "privacy", "linked-devices", "location-travel"] },
  { label: "Care and account", keys: ["care", "account-security", "saved-logins", "invite-code", "delete-account", "help-support"] },
];

export function C2YouHub({
  projection,
  events,
}: {
  projection: YouHubProjection;
  events: C2YouEvents;
}) {
  const [query, setQuery] = useState("");
  const byKey = useMemo(() => {
    const map = new Map<string, YouHubProjection["index"][number]>();
    for (const row of projection.index) map.set(row.key, row);
    return map;
  }, [projection.index]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return projection.index.filter(
      (row) =>
        row.title.toLowerCase().includes(q) ||
        (row.subtitle ?? "").toLowerCase().includes(q) ||
        row.keywords.toLowerCase().includes(q),
    );
  }, [projection.index, query]);

  return (
    <div data-testid="c2-you">
      <div className="c2s-scroll">
        <div className="c2s-profile-head">
          <Avatar avatar={projection.profile.avatar} size={72} />
          <div style={{ flex: 1 }}>
            <h1>{projection.profile.name}</h1>
            {projection.profile.handle ? <p>@{projection.profile.handle}</p> : null}
          </div>
          <button
            type="button"
            className="c2s-btn-text"
            data-testid="c2-you-edit"
            onClick={events.editProfile}
          >
            Edit profile
          </button>
        </div>

        {projection.accountNote ? (
          <p className="c2s-lede" data-testid="c2-you-note">
            {projection.accountNote}
          </p>
        ) : null}

        <input
          className="c2s-search"
          data-testid="c2-you-search"
          placeholder="Search settings"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search settings"
        />

        {results ? (
          <div style={{ marginTop: "var(--space-4)" }}>
            {results.length === 0 ? (
              <p className="c2s-lede">No match. Try Privacy or Notifications.</p>
            ) : (
              <div className="c2s-row-block">
                {results.map((row) => (
                  <button
                    key={row.key}
                    type="button"
                    className="c2s-row"
                    data-testid="c2-you-search-result"
                    onClick={() => events.openSection(row.key)}
                  >
                    <span className="c2s-row-main">
                      <span className="c2s-row-title">{row.title}</span>
                      {row.subtitle ? <span className="c2s-row-sub">{row.subtitle}</span> : null}
                    </span>
                    <IconChevron />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          HUB_GROUPS.map((group) => {
            const rows = group.keys
              .map((key) => byKey.get(key))
              .filter((r): r is NonNullable<typeof r> => Boolean(r));
            if (rows.length === 0) return null;
            return (
              <div key={group.label}>
                <p className="c2s-group-label">{group.label}</p>
                <div className="c2s-row-block">
                  {rows.map((row) => (
                    <button
                      key={row.key}
                      type="button"
                      className="c2s-row"
                      data-testid={`c2-you-row-${row.key}`}
                      onClick={() => events.openSection(row.key)}
                    >
                      <span className="c2s-row-main">
                        <span className="c2s-row-title">{row.title}</span>
                        {row.subtitle ? <span className="c2s-row-sub">{row.subtitle}</span> : null}
                      </span>
                      <IconChevron />
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
        <p className="c2s-caption" style={{ marginTop: "var(--space-5)" }}>
          {projection.connectedSummary}
        </p>
        {readServedBuild() ? (
          <p className="c2s-caption" data-testid="c2-you-build">
            Build · {readServedBuild()}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function C2SettingsSection({
  section,
  events,
}: {
  section: SettingsSectionProjection;
  events: C2YouEvents;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rowValue = (id: string) => {
    const row = section.rows.find((r) => r.id === id);
    return row && row.kind === "value" ? row.value : "";
  };
  const [name, setName] = useState<string>(() => rowValue("name"));
  const [handle, setHandle] = useState<string>(() => rowValue("handle").replace(/^@/, ""));
  // Audit A5 — support form state (report-problem / submit-feedback).
  const supportKind: "problem" | "feedback" | null =
    section.key === "report-problem"
      ? "problem"
      : section.key === "submit-feedback"
        ? "feedback"
        : null;
  const [supportCategory, setSupportCategory] = useState<string>("something_broke");
  const [supportBody, setSupportBody] = useState("");
  const [supportReference, setSupportReference] = useState<string | null>(null);
  // Adoption wave 2 form state.
  const [loginHost, setLoginHost] = useState("");
  const [loginSecret, setLoginSecret] = useState("");
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemLine, setRedeemLine] = useState<string | null>(null);
  // Repair #18 SM - Soul form state, seeded from the section's own
  // value rows (the server's read of the real preference truth).
  const [soulLevel, setSoulLevel] = useState<string>(() => rowValue("assistance_level") || "balanced");
  const [soulQuietStart, setSoulQuietStart] = useState<string>(() => rowValue("quiet_hours_start"));
  const [soulQuietEnd, setSoulQuietEnd] = useState<string>(() => rowValue("quiet_hours_end"));
  const [soulTimezone, setSoulTimezone] = useState<string>(() => rowValue("timezone"));
  const [soulMaxPerDay, setSoulMaxPerDay] = useState<string>(() =>
    rowValue("max_proactive_signals_per_day"),
  );
  const [soulFeedback, setSoulFeedback] = useState<string>(() => rowValue("completion_feedback"));
  const [soulSaved, setSoulSaved] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"data" | "account">("data");
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [deleteReceipt, setDeleteReceipt] = useState<string | null>(null);

  const toggle = async (rowId: string, current: boolean) => {
    setSaving(rowId);
    setError(null);
    try {
      await events.setPreference(section.key, rowId, !current);
    } catch {
      setError("That did not save. Try again.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div data-testid={`c2-settings-${section.key}`}>
      <header className="c2s-header">
        <button
          type="button"
          className="c2s-icon-btn"
          aria-label="Back to You"
          data-testid="c2-settings-back"
          onClick={events.backToHub}
        >
          <IconBack />
        </button>
        <h1 className="c2s-header-title" style={{ fontSize: 20 }}>
          {section.title}
        </h1>
        <span
          style={{ marginLeft: "auto", color: "var(--ink-3)", display: "inline-flex" }}
          data-orb="settings-header-mark"
          aria-hidden
        >
          <OrbMarkMono size={20} />
        </span>
      </header>
      <div className="c2s-scroll">
        <p className="c2s-lede" style={{ marginTop: "var(--space-4)" }}>
          {section.lede}
        </p>

        {section.key === "appearance" ? (
          <div style={{ marginBottom: "var(--space-4)" }}>
            <div className="c2s-segmented" role="radiogroup" aria-label="Mode" data-testid="c2-mode-segmented">
              {(["system", "light", "dark"] as const).map((pref) => (
                <button
                  key={pref}
                  type="button"
                  role="radio"
                  aria-checked={events.modePreference === pref}
                  data-active={events.modePreference === pref ? "1" : undefined}
                  data-testid={`c2-mode-${pref}`}
                  onClick={() => events.setModePreference(pref)}
                >
                  {pref === "system" ? "System" : pref === "light" ? "Light" : "Dark"}
                </button>
              ))}
            </div>
            {/* Audit A3 — the preview is drawn by the SAME components
                and tokens as the real surfaces (OrbMark, PlanCardC2),
                so it changes with the mode in the same commit and what
                you preview is what you get. It is a labeled preview of
                appearance only - the sample card is not a real plan. */}
            <div
              data-testid="c2-appearance-preview"
              data-mode-preference={events.modePreference}
              style={{
                marginTop: "var(--space-4)",
                padding: "var(--space-4)",
                borderRadius: "var(--radius-card, 16px)",
                background: "var(--canvas)",
                color: "var(--ink-1)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
                <OrbMark size={28} />
                <span>
                  <span style={{ display: "block", fontWeight: 600 }}>Opal</span>
                  <span className="c2s-caption">Preview - how Opal looks in this mode</span>
                </span>
              </div>
              <PlanCardC2
                input={{
                  stateFamily: "forming",
                  stateLabel: "Idea",
                  title: "Coffee with Maya",
                  whenLine: "Saturday, 10:00 AM",
                  whereLine: "Blue Bottle",
                  attendanceLine: null,
                  primaryActionLabel: null,
                }}
              />
            </div>
          </div>
        ) : null}

        {section.key === "edit-profile" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
            <input
              className="c2s-field"
              data-testid="c2-profile-name"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Name"
            />
            <input
              className="c2s-field"
              data-testid="c2-profile-handle"
              placeholder="Username (optional)"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              aria-label="Username"
            />
            <button
              type="button"
              className="c2s-btn-primary"
              data-testid="c2-profile-save"
              disabled={saving === "profile"}
              onClick={async () => {
                setSaving("profile");
                setError(null);
                try {
                  await events.saveProfileFields(name, handle);
                } catch {
                  setError("That did not save. Try again.");
                } finally {
                  setSaving(null);
                }
              }}
            >
              Save profile
            </button>
          </div>
        ) : null}

        {section.key === "soul-memory" &&
        section.rows.some((r) => r.kind === "value" && r.id === "assistance_level") ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}
            data-testid="c2-soul-form"
          >
            <p className="c2s-group-label">Your Soul - how Opal is with you</p>
            <div className="c2s-segmented" role="radiogroup" aria-label="How forward Opal may be" data-testid="c2-soul-level">
              {(
                [
                  ["minimal", "Only when I ask"],
                  ["balanced", "Balanced"],
                  ["proactive", "More forward"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={soulLevel === value}
                  data-active={soulLevel === value ? "1" : undefined}
                  data-testid={`c2-soul-level-${value}`}
                  onClick={() => setSoulLevel(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              className="c2s-field"
              data-testid="c2-soul-quiet-start"
              placeholder="Quiet hours start, like 22:00"
              value={soulQuietStart}
              onChange={(e) => setSoulQuietStart(e.target.value)}
              aria-label="Quiet hours start"
            />
            <input
              className="c2s-field"
              data-testid="c2-soul-quiet-end"
              placeholder="Quiet hours end, like 08:00"
              value={soulQuietEnd}
              onChange={(e) => setSoulQuietEnd(e.target.value)}
              aria-label="Quiet hours end"
            />
            <input
              className="c2s-field"
              data-testid="c2-soul-timezone"
              placeholder="Home time zone, like America/Los_Angeles"
              value={soulTimezone}
              onChange={(e) => setSoulTimezone(e.target.value)}
              aria-label="Home time zone"
            />
            <input
              className="c2s-field"
              data-testid="c2-soul-max-per-day"
              placeholder="Proactive notes per day, at most"
              value={soulMaxPerDay}
              onChange={(e) => setSoulMaxPerDay(e.target.value)}
              aria-label="Proactive notes per day, at most"
            />
            <input
              className="c2s-field"
              data-testid="c2-soul-feedback"
              placeholder="Completion feedback - standard or reduced"
              value={soulFeedback}
              onChange={(e) => setSoulFeedback(e.target.value)}
              aria-label="Completion feedback"
            />
            <button
              type="button"
              className="c2s-btn-primary"
              data-testid="c2-soul-save"
              disabled={saving === "soul"}
              onClick={async () => {
                if (!events.saveSoulPreferences) {
                  setError("That did not save. Try again.");
                  return;
                }
                setSaving("soul");
                setError(null);
                try {
                  await events.saveSoulPreferences({
                    assistance_level: soulLevel,
                    quiet_hours_start: soulQuietStart,
                    quiet_hours_end: soulQuietEnd,
                    timezone: soulTimezone,
                    max_proactive_signals_per_day: soulMaxPerDay,
                    completion_feedback: soulFeedback,
                  });
                  setSoulSaved(true);
                } catch {
                  setError("That did not save. Try again.");
                } finally {
                  setSaving(null);
                }
              }}
            >
              Save your Soul
            </button>
            {soulSaved ? (
              <p className="c2s-note" data-testid="c2-soul-saved">
                Saved. This is how Opal will be with you now.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="c2s-row-block">
          {section.rows.map((row) => {
            if (row.kind === "note") {
              return (
                <p key={row.id} className="c2s-note">
                  {row.text}
                </p>
              );
            }
            if (row.kind === "toggle") {
              return (
                <div key={row.id} className="c2s-row" data-testid={`c2-setting-row-${row.id}`}>
                  <span className="c2s-row-main">
                    <span className="c2s-row-title">{row.title}</span>
                    {row.subtitle ? <span className="c2s-row-sub">{row.subtitle}</span> : null}
                  </span>
                  <button
                    type="button"
                    className="c2s-toggle"
                    data-on={row.value ? "1" : undefined}
                    role="switch"
                    aria-checked={row.value}
                    aria-label={row.title}
                    data-testid={`c2-setting-toggle-${row.id}`}
                    onClick={() => void toggle(row.id, row.value)}
                  />
                </div>
              );
            }
            if (row.kind === "connection") {
              // DIR-2 Connections: status text is the payload's own
              // status_label, rendered verbatim (DOM == payload).
              return (
                <div
                  key={row.id}
                  className="c2s-row"
                  data-testid={`connection-row-${row.id}`}
                  data-connection-status={row.status}
                >
                  <span className="c2s-row-main">
                    <span className="c2s-row-title">{row.title}</span>
                    {row.subtitle ? <span className="c2s-row-sub">{row.subtitle}</span> : null}
                    <span className="c2s-row-sub">{row.detail}</span>
                    {row.gateReason ? <span className="c2s-row-sub">{row.gateReason}</span> : null}
                    <span className="c2s-row-sub">{row.lastVerifiedLabel}</span>
                  </span>
                  <span
                    className="c2s-row-value"
                    data-testid={`connection-status-${row.id}`}
                  >
                    {row.statusLabel}
                  </span>
                </div>
              );
            }
            if (row.kind === "value") {
              // Edit-profile name/handle values are edited in the form
              // above; do not render them twice.
              if (section.key === "edit-profile" && (row.id === "name" || row.id === "handle")) {
                return null;
              }
              // SM: the Soul fields are edited in the Soul form above;
              // do not render them twice either.
              if (
                section.key === "soul-memory" &&
                [
                  "assistance_level",
                  "quiet_hours_start",
                  "quiet_hours_end",
                  "timezone",
                  "max_proactive_signals_per_day",
                  "completion_feedback",
                ].includes(row.id)
              ) {
                return null;
              }
              return (
                <div key={row.id} className="c2s-row" data-testid={`c2-setting-row-${row.id}`}>
                  <span className="c2s-row-main">
                    <span className="c2s-row-title">{row.title}</span>
                    {row.subtitle ? <span className="c2s-row-sub">{row.subtitle}</span> : null}
                  </span>
                  <span className="c2s-row-value">{row.value}</span>
                </div>
              );
            }
            if (row.kind === "nav") {
              return (
                <button
                  key={row.id}
                  type="button"
                  className="c2s-row"
                  data-testid={`c2-setting-row-${row.id}`}
                  onClick={() => events.openSection(row.target)}
                >
                  <span className="c2s-row-main">
                    <span className="c2s-row-title">{row.title}</span>
                    {row.subtitle ? <span className="c2s-row-sub">{row.subtitle}</span> : null}
                  </span>
                  <IconChevron />
                </button>
              );
            }
            return (
              <button
                key={row.id}
                type="button"
                className="c2s-row"
                data-testid={`c2-setting-row-${row.id}`}
                onClick={() => events.runAction(section.key, row.id)}
              >
                <span className="c2s-row-main">
                  <span className="c2s-row-title">{row.title}</span>
                  {row.subtitle ? <span className="c2s-row-sub">{row.subtitle}</span> : null}
                </span>
                <IconChevron />
              </button>
            );
          })}
        </div>
        {supportKind ? (
          supportReference ? (
            <div data-testid="c2-support-sent" style={{ marginTop: "var(--space-4)" }}>
              <p className="c2s-note">
                Sent. Your reference is {supportReference} - quote it if you
                write to support, and it is saved with your account.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                {SUPPORT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className="c2s-chip"
                    data-testid={`c2-support-category-${cat.id}`}
                    data-active={supportCategory === cat.id ? "1" : undefined}
                    aria-pressed={supportCategory === cat.id}
                    onClick={() => setSupportCategory(cat.id)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <textarea
                className="c2s-field"
                data-testid="c2-support-body"
                placeholder={
                  supportKind === "problem"
                    ? "What went wrong?"
                    : "What would you love Opal to do?"
                }
                value={supportBody}
                maxLength={4000}
                rows={5}
                onChange={(e) => setSupportBody(e.target.value)}
                aria-label={supportKind === "problem" ? "What went wrong" : "Your feedback"}
              />
              <button
                type="button"
                className="c2s-btn-primary"
                data-testid="c2-support-submit"
                disabled={saving === "support" || supportBody.trim().length === 0}
                onClick={async () => {
                  setSaving("support");
                  setError(null);
                  try {
                    const result = await events.submitSupportReport(
                      supportKind,
                      supportCategory,
                      supportBody.trim(),
                    );
                    setSupportReference(result.reference);
                  } catch {
                    setError("That did not send. Try again.");
                  } finally {
                    setSaving(null);
                  }
                }}
              >
                {supportKind === "problem" ? "Send report" : "Send feedback"}
              </button>
            </div>
          )
        ) : null}
        {section.key === "saved-logins" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-4)" }} data-testid="c2-saved-login-form">
            <input
              className="c2s-field"
              data-testid="c2-saved-login-host"
              placeholder="Site, like api.example.com"
              value={loginHost}
              onChange={(e) => setLoginHost(e.target.value)}
              aria-label="Site"
            />
            <input
              className="c2s-field"
              data-testid="c2-saved-login-secret"
              type="password"
              placeholder="Login or key for that site"
              value={loginSecret}
              onChange={(e) => setLoginSecret(e.target.value)}
              aria-label="Login or key"
            />
            <button
              type="button"
              className="c2s-btn-primary"
              data-testid="c2-saved-login-add"
              disabled={saving === "login" || loginHost.trim() === "" || loginSecret === ""}
              onClick={async () => {
                if (!events.addSavedLogin) { setError("Saving a login is not wired in this build."); return; }
                setSaving("login");
                setError(null);
                try {
                  await events.addSavedLogin(loginHost.trim(), loginSecret);
                  setLoginHost("");
                  setLoginSecret("");
                } catch {
                  setError("That login did not save. Try again.");
                } finally {
                  setSaving(null);
                }
              }}
            >
              Save login
            </button>
            <p className="c2s-caption">The login itself is never shown back - only the site is listed.</p>
          </div>
        ) : null}
        {section.key === "invite-code" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-4)" }} data-testid="c2-redeem-form">
            {redeemLine ? (
              <p className="c2s-note" data-testid="c2-redeem-done">{redeemLine}</p>
            ) : (
              <>
                <input
                  className="c2s-field"
                  data-testid="c2-redeem-code"
                  placeholder="Someone else's code"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  aria-label="Invite code"
                />
                <button
                  type="button"
                  className="c2s-btn-primary"
                  data-testid="c2-redeem-submit"
                  disabled={saving === "redeem" || redeemCode.trim() === ""}
                  onClick={async () => {
                    if (!events.redeemInviteCode) { setError("Redeeming a code is not wired in this build."); return; }
                    setSaving("redeem");
                    setError(null);
                    try {
                      const credit = await events.redeemInviteCode(redeemCode.trim());
                      setRedeemLine(credit.credit_line);
                    } catch {
                      setError("That code did not redeem. Check it and try again.");
                    } finally {
                      setSaving(null);
                    }
                  }}
                >
                  Redeem code
                </button>
              </>
            )}
          </div>
        ) : null}
        {section.key === "delete-account" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-4)" }} data-testid="c2-delete-form">
            {deleteReceipt ? (
              <p className="c2s-note" data-testid="c2-delete-receipt">
                Done. Your receipt reference is {deleteReceipt} - quote it if you write to support.
              </p>
            ) : (
              <>
                <div className="c2s-segmented" role="radiogroup" aria-label="What to delete">
                  {(["data", "account"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      role="radio"
                      aria-checked={deleteMode === mode}
                      data-active={deleteMode === mode ? "1" : undefined}
                      data-testid={`c2-delete-mode-${mode}`}
                      onClick={() => { setDeleteMode(mode); setDeleteArmed(false); }}
                    >
                      {mode === "data" ? "Delete my data" : "Delete my account"}
                    </button>
                  ))}
                </div>
                {!deleteArmed ? (
                  <button
                    type="button"
                    className="c2s-btn-primary"
                    data-testid="c2-delete-arm"
                    onClick={() => setDeleteArmed(true)}
                  >
                    {deleteMode === "data" ? "Delete my data" : "Delete my account"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="c2s-btn-primary"
                    data-testid="c2-delete-confirm"
                    disabled={saving === "delete"}
                    onClick={async () => {
                      if (!events.executeDeletion) { setError("Deletion is not wired in this build."); return; }
                      setSaving("delete");
                      setError(null);
                      try {
                        const receipt = await events.executeDeletion(deleteMode);
                        setDeleteReceipt(receipt.reference);
                      } catch {
                        setError("That did not go through. Nothing was deleted - try again.");
                      } finally {
                        setSaving(null);
                      }
                    }}
                  >
                    Confirm - {deleteMode === "data" ? "delete my data" : "delete my account"} for good
                  </button>
                )}
                <p className="c2s-caption">The first tap only arms the confirmation. Nothing is deleted until you confirm.</p>
              </>
            )}
          </div>
        ) : null}
        {saving ? <p className="c2s-saving-line">Saving</p> : null}
        {error ? (
          <p className="c2s-error-line" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
