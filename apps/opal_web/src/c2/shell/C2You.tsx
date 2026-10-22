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
import {
  CALL_GRAPHING_MODES,
  CALL_GRAPHING_REASON,
  SOUL_LEVEL_COPY,
  formatClockTime,
  humanTimezoneLabel,
  quietHoursSentence,
} from "./shellData";

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
  /** Repair #19 W8 (item 16) - the standing call-graphing
   * permission: saves call_mode to the real GraphingPolicy truth
   * (PATCH /relationship-access/graphing). Immediate-save, like the
   * legacy standing-permission section; failure restores the
   * projected value with one error line. */
  saveCallGraphingMode?: (callMode: string) => Promise<void>;
  setGraphingPaused?: (paused: boolean) => Promise<void>;
  addSavedLogin?: (host: string, secret: string) => Promise<void>;
  /** N7 - manual memory add (POST /memory-wallet/capsules). The
   *  shell wires it only with a live session; an unwired host gets
   *  the honest error line on submit, never a painted success. */
  addMemory?: (text: string) => Promise<void>;
  /** Repair #24 (WS-5) - the memory step-up: a fresh phone-code
   *  verification (the account's actual credential - there is no
   *  account password). start sends a code to the phone number on
   *  the account and returns the challenge id (plus, in synthetic
   *  development only, the development code the server itself
   *  exposes); confirm checks the code and holds the resulting
   *  elevation for the shell's memory mutations. Absent handlers
   *  mean the panel shows the honest unwired line. */
  startMemoryStepUp?: (phone: string) => Promise<{ challengeId: string; developmentCode?: string }>;
  confirmMemoryStepUp?: (challengeId: string, code: string, phone: string) => Promise<void>;
  memoryStepUpReady?: boolean;
  /** R20 F-4 — the Private graphs credential home writes. Each runs
   *  the real API (setGraphLock / setGraphLockBiometric + the
   *  device-local WebAuthn registration for the biometric leg) and
   *  the section re-reads the server's projection; absent handlers
   *  mean the form shows the honest error line, never a fake save. */
  setVaultPasscode?: (code: string) => Promise<void>;
  setVaultBiometric?: (enabled: boolean) => Promise<void>;
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
  { label: "How Opal works for you", keys: ["soul", "memory", "what-opal-remembers"] },
  { label: "How Opal helps", keys: ["how-opal-helps", "calls-assist", "approvals-activity"] },
  { label: "Your tools", keys: ["connections", "connector-permissions"] },
  { label: "Quiet and privacy", keys: ["notifications", "privacy", "private-graphs", "linked-devices", "location-travel"] },
  { label: "Account", keys: ["account-security", "saved-logins", "invite-code", "delete-account", "help-support"] },
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
    <div data-testid="c2-you" className="c2s-you-surface">
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
  // R20 F-9 v2 - Connectors: a View row's detail is open one at a
  // time, behind its row; the row itself carries only the tool's
  // icon, its name, and its one action (Connect / Disconnect /
  // View).
  const [openConnectionId, setOpenConnectionId] = useState<string | null>(null);
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
  const [inviteCopyNote, setInviteCopyNote] = useState<string | null>(null);
  const [memoryDraft, setMemoryDraft] = useState("");
  const [memoryAdded, setMemoryAdded] = useState(false);
  // Repair #24 (WS-5) - memory step-up form state: the phone number
  // on the account, the challenge the server issued, and the code.
  const [stepUpPhone, setStepUpPhone] = useState("");
  const [stepUpChallengeId, setStepUpChallengeId] = useState<string | null>(null);
  const [stepUpCode, setStepUpCode] = useState("");
  const [stepUpBusy, setStepUpBusy] = useState(false);
  const [stepUpNote, setStepUpNote] = useState<string | null>(null);
  // R20 F-4 — Private graphs credential home state, seeded from the
  // section's own value rows (the server's graph-lock projection).
  const [vaultPin, setVaultPin] = useState("");
  const [vaultPinSaved, setVaultPinSaved] = useState(false);
  const [vaultBiometric, setVaultBiometric] = useState<boolean>(
    () => rowValue("vault_biometric_enabled") === "On",
  );
  const [vaultBusy, setVaultBusy] = useState(false);
  // Repair #18 SM - Soul form state, seeded from the section's own
  // value rows (the server's read of the real preference truth).
  const [soulLevel, setSoulLevel] = useState<string>(() => rowValue("assistance_level") || "balanced");
  const [soulQuietStart, setSoulQuietStart] = useState<string>(() => rowValue("quiet_hours_start"));
  const [soulQuietEnd, setSoulQuietEnd] = useState<string>(() => rowValue("quiet_hours_end"));
  // Repair #19 W20 (JA-07) — the quiet-hours on/off the room never
  // had. The backend resolver's disabled state is start == end
  // (SocialFlow.QuietHours edge rule), so OFF is a real state of
  // the same record, not a new field: the form seeds ON unless the
  // saved window is already the disabled one, and Save writes
  // end == start when OFF. The last real window is remembered so
  // turning back ON restores it (or the product default window
  // when the saved state was off with nothing to restore).
  const [soulQuietOn, setSoulQuietOn] = useState<boolean>(() => {
    const s = rowValue("quiet_hours_start");
    const e = rowValue("quiet_hours_end");
    return !(s !== "" && s === e);
  });
  const [soulQuietWindow, setSoulQuietWindow] = useState<{ start: string; end: string }>(() => {
    const s = rowValue("quiet_hours_start");
    const e = rowValue("quiet_hours_end");
    return s && e && s !== e ? { start: s, end: e } : { start: "22:00", end: "08:00" };
  });
  const [soulTimezone, setSoulTimezone] = useState<string>(() => rowValue("timezone"));
  const [soulMaxPerDay, setSoulMaxPerDay] = useState<string>(() =>
    rowValue("max_proactive_signals_per_day"),
  );
  const [soulFeedback, setSoulFeedback] = useState<string>(() => rowValue("completion_feedback"));
  const [soulSaved, setSoulSaved] = useState(false);
  // Repair #19 W8 (item 16) - call-graphing standing permission
  // state, seeded from the Memory section's own value rows (the
  // server's read of the real GraphingPolicy record).
  const [graphingMode, setGraphingMode] = useState<string>(() => rowValue("graphing_call_mode"));
  const [graphingPaused, setGraphingPaused] = useState<boolean>(
    () => rowValue("graphing_global_paused") === "true",
  );
  const [graphingBusy, setGraphingBusy] = useState(false);
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
    <div data-testid={`c2-settings-${section.key}`} className="c2s-you-surface">
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

        {(section.key === "soul" || section.key === "soul-memory") &&
        section.rows.some((r) => r.kind === "value" && r.id === "assistance_level") ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", marginBottom: "var(--space-4)" }}
            data-testid="c2-soul-form"
          >
            {/* Repair #19 W8 (W5-11): every control carries a
                persistent visible label AND its reason. No control
                is a bare field whose only label was placeholder
                text, and no raw enum ("standard", "22:00") reaches
                the glass unlabeled - the white-pill fields of the
                combined page are gone. */}
            <div className="c2s-field-group">
              <p className="c2s-field-label" id="c2-soul-level-label">
                How forward may Opal be?
              </p>
              <p className="c2s-field-reason">
                This is the main dial for how Opal is with you. It changes how
                often Opal offers help on its own - it never changes what your
                people can send you.
              </p>
              <div className="c2s-segmented" role="radiogroup" aria-labelledby="c2-soul-level-label" data-testid="c2-soul-level">
                {(["minimal", "balanced", "proactive"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={soulLevel === value}
                    data-active={soulLevel === value ? "1" : undefined}
                    data-testid={`c2-soul-level-${value}`}
                    onClick={() => setSoulLevel(value)}
                  >
                    {SOUL_LEVEL_COPY[value].label}
                  </button>
                ))}
              </div>
              <p className="c2s-field-reason" data-testid="c2-soul-level-reason">
                {SOUL_LEVEL_COPY[soulLevel]?.reason ?? SOUL_LEVEL_COPY.balanced.reason}
              </p>
            </div>

            <div className="c2s-field-group">
              <p className="c2s-field-label">Quiet hours</p>
              <div className="c2s-row" style={{ padding: 0 }}>
                <span className="c2s-row-main">
                  <span className="c2s-row-title">Quiet hours: {soulQuietOn ? "On" : "Off"}</span>
                  <span className="c2s-row-sub">
                    {soulQuietOn
                      ? "Opal holds non-urgent things during your quiet hours."
                      : "Opal may bring you non-urgent things at any hour."}
                  </span>
                </span>
                <button
                  type="button"
                  className="c2s-toggle"
                  data-on={soulQuietOn ? "1" : undefined}
                  role="switch"
                  aria-checked={soulQuietOn}
                  aria-label="Quiet hours"
                  data-testid="c2-soul-quiet-toggle"
                  onClick={() => {
                    if (soulQuietOn) {
                      // Turning OFF: remember the real window so
                      // ON restores it; the saved state becomes
                      // start == end (the resolver's disabled state).
                      if (soulQuietStart && soulQuietEnd && soulQuietStart !== soulQuietEnd) {
                        setSoulQuietWindow({ start: soulQuietStart, end: soulQuietEnd });
                      }
                      setSoulQuietOn(false);
                    } else {
                      setSoulQuietStart(soulQuietWindow.start);
                      setSoulQuietEnd(soulQuietWindow.end);
                      setSoulQuietOn(true);
                    }
                    setSoulSaved(false);
                  }}
                />
              </div>
              <p className="c2s-field-reason" data-testid="c2-soul-quiet-sentence">
                {quietHoursSentence(
                  soulQuietStart,
                  soulQuietOn ? soulQuietEnd : soulQuietStart,
                )}
                . People can still reach you - this only holds what Opal itself
                brings you.
              </p>
              <label className="c2s-field-sublabel" htmlFor="c2-soul-quiet-start-input">
                Quiet hours start - Opal starts holding non-urgent things at{" "}
                {formatClockTime(soulQuietStart)}
              </label>
              <input
                id="c2-soul-quiet-start-input"
                className="c2s-field"
                type="time"
                data-testid="c2-soul-quiet-start"
                value={soulQuietStart}
                onChange={(e) => setSoulQuietStart(e.target.value)}
                aria-label="Quiet hours start"
                disabled={!soulQuietOn}
              />
              <label className="c2s-field-sublabel" htmlFor="c2-soul-quiet-end-input">
                Quiet hours end - Opal can bring things to you again at{" "}
                {formatClockTime(soulQuietEnd)}
              </label>
              <input
                id="c2-soul-quiet-end-input"
                className="c2s-field"
                type="time"
                data-testid="c2-soul-quiet-end"
                value={soulQuietEnd}
                onChange={(e) => setSoulQuietEnd(e.target.value)}
                aria-label="Quiet hours end"
                disabled={!soulQuietOn}
              />
            </div>

            <div className="c2s-field-group">
              <label className="c2s-field-label" htmlFor="c2-soul-timezone-input">
                Home time zone
              </label>
              <p className="c2s-field-reason">
                Opal judges your quiet hours and plan times in this time zone.
              </p>
              <input
                id="c2-soul-timezone-input"
                className="c2s-field"
                data-testid="c2-soul-timezone"
                value={soulTimezone}
                onChange={(e) => setSoulTimezone(e.target.value)}
                aria-label="Home time zone"
              />
              <p className="c2s-field-reason" data-testid="c2-soul-timezone-human">
                That is {humanTimezoneLabel(soulTimezone)} time.
              </p>
            </div>

            <div className="c2s-field-group">
              <label className="c2s-field-label" htmlFor="c2-soul-max-per-day-input">
                Proactive notes per day, at most
              </label>
              <p className="c2s-field-reason">
                The most times in one day Opal may bring you something you did
                not ask for. Things that need your answer from your people are
                not counted here.
              </p>
              <input
                id="c2-soul-max-per-day-input"
                className="c2s-field"
                type="number"
                min={1}
                max={10}
                data-testid="c2-soul-max-per-day"
                value={soulMaxPerDay}
                onChange={(e) => setSoulMaxPerDay(e.target.value)}
                aria-label="Proactive notes per day, at most"
              />
              <p className="c2s-field-reason" data-testid="c2-soul-max-human">
                At most {soulMaxPerDay || "0"}{" "}
                {soulMaxPerDay === "1" ? "note" : "notes"} a day from Opal on its
                own.
              </p>
            </div>

            <div className="c2s-field-group">
              <p className="c2s-field-label" id="c2-soul-feedback-label">
                When something is done
              </p>
              <p className="c2s-field-reason">
                How much Opal tells you when it finishes something for you.
              </p>
              <div
                className="c2s-segmented"
                role="radiogroup"
                aria-labelledby="c2-soul-feedback-label"
                data-testid="c2-soul-feedback"
              >
                {(
                  [
                    ["standard", "Tell me when things are done"],
                    ["reduced", "Keep it brief"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={soulFeedback === value}
                    data-active={soulFeedback === value ? "1" : undefined}
                    data-testid={`c2-soul-feedback-${value}`}
                    onClick={() => setSoulFeedback(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

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
                    // JA-07: OFF writes the disabled state the
                    // resolver honors — end == start.
                    quiet_hours_end: soulQuietOn ? soulQuietEnd : soulQuietStart,
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
              Save Soul settings
            </button>
            {soulSaved ? (
              <p className="c2s-note" data-testid="c2-soul-saved">
                Saved. This is how Opal will be with you now.
              </p>
            ) : null}
          </div>
        ) : null}

        {section.key === "memory" &&
        section.rows.some((r) => r.kind === "value" && r.id === "graphing_call_mode") ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", marginBottom: "var(--space-4)" }}
            data-testid="c2-graphing-form"
          >
            <div className="c2s-field-group">
              <p className="c2s-field-label" id="c2-graphing-label">
                Call graphing
              </p>
              <p className="c2s-field-reason">{CALL_GRAPHING_REASON}</p>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}
                role="radiogroup"
                aria-labelledby="c2-graphing-label"
                data-testid="c2-graphing-mode"
              >
                {CALL_GRAPHING_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    role="radio"
                    aria-checked={graphingMode === mode.value}
                    data-active={graphingMode === mode.value ? "1" : undefined}
                    data-testid={`c2-graphing-mode-${mode.value}`}
                    className="c2s-chip"
                    style={{ textAlign: "left", minHeight: 44 }}
                    disabled={graphingBusy}
                    onClick={async () => {
                      if (!events.saveCallGraphingMode) {
                        setError("That did not save. Try again.");
                        return;
                      }
                      const previous = graphingMode;
                      setGraphingMode(mode.value);
                      setGraphingBusy(true);
                      setError(null);
                      try {
                        await events.saveCallGraphingMode(mode.value);
                      } catch {
                        setGraphingMode(previous);
                        setError("That did not save. Try again.");
                      } finally {
                        setGraphingBusy(false);
                      }
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              <p className="c2s-field-reason" data-testid="c2-graphing-mode-reason">
                {CALL_GRAPHING_MODES.find((m) => m.value === graphingMode)?.reason ??
                  CALL_GRAPHING_MODES[1].reason}
              </p>
            </div>
            <div className="c2s-field-group">
              <p className="c2s-field-label">Pause all graphing</p>
              <p className="c2s-field-reason">
                Pauses graphing for every call until you turn this off. This wins
                over the choice above - and pausing during one call, for that call
                only, is on the call itself.
              </p>
              <div className="c2s-row" style={{ border: "1px solid var(--line-1)", borderRadius: "var(--radius-card)" }}>
                <span className="c2s-row-main">
                  <span className="c2s-row-title">
                    {graphingPaused ? "Graphing is paused" : "Graphing is not paused"}
                  </span>
                </span>
                <button
                  type="button"
                  className="c2s-toggle"
                  data-on={graphingPaused ? "1" : undefined}
                  role="switch"
                  aria-checked={graphingPaused}
                  aria-label="Pause all graphing"
                  data-testid="c2-graphing-pause-toggle"
                  disabled={graphingBusy}
                  onClick={async () => {
                    if (!events.setGraphingPaused) {
                      setError("That did not save. Try again.");
                      return;
                    }
                    const next = !graphingPaused;
                    setGraphingPaused(next);
                    setGraphingBusy(true);
                    setError(null);
                    try {
                      await events.setGraphingPaused(next);
                    } catch {
                      setGraphingPaused(!next);
                      setError("That did not save. Try again.");
                    } finally {
                      setGraphingBusy(false);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}

        {section.key === "connector-permissions" &&
        section.rows.some((r) => r.kind === "value" && r.id === "assistance_level") ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}
            data-testid="c2-permissions-form"
          >
            <p className="c2s-field-label" id="c2-permissions-level-label">
              How forward may Opal be?
            </p>
            <div className="c2s-segmented" role="radiogroup" aria-labelledby="c2-permissions-level-label" data-testid="c2-permissions-level">
              {(["minimal", "balanced", "proactive"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={soulLevel === value}
                  data-active={soulLevel === value ? "1" : undefined}
                  data-testid={`c2-permissions-level-${value}`}
                  onClick={async () => {
                    if (!events.saveSoulPreferences) {
                      setError("That did not save. Try again.");
                      return;
                    }
                    const previous = soulLevel;
                    setSoulLevel(value);
                    setSaving("permissions");
                    setError(null);
                    try {
                      // Partial write: Soul.update_soul takes only
                      // the fields given, so this changes the level
                      // and nothing else (quiet hours etc. untouched).
                      await events.saveSoulPreferences({ assistance_level: value });
                    } catch {
                      setSoulLevel(previous);
                      setError("That did not save. Try again.");
                    } finally {
                      setSaving(null);
                    }
                  }}
                >
                  {SOUL_LEVEL_COPY[value].label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {section.key === "private-graphs" &&
        section.rows.some((r) => r.kind === "value" && r.id === "vault_passcode_set") ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", marginBottom: "var(--space-4)" }}
            data-testid="c2-vault-settings-form"
          >
            <div className="c2s-field-group">
              <label className="c2s-field-label" htmlFor="c2-vault-pin-input">
                {rowValue("vault_passcode_set") === "Set" ? "Change your PIN" : "Set your PIN"}
              </label>
              <p className="c2s-field-reason">
                Four to eight digits. It is checked by Opal's server when you open
                Private graphs - the PIN itself is never stored.
              </p>
              <input
                id="c2-vault-pin-input"
                className="c2s-field"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                data-testid="c2-vault-pin"
                value={vaultPin}
                onChange={(e) => {
                  setVaultPin(e.target.value.replace(/\D/g, "").slice(0, 8));
                  setVaultPinSaved(false);
                }}
                aria-label={rowValue("vault_passcode_set") === "Set" ? "New PIN" : "PIN"}
              />
              <button
                type="button"
                className="c2s-btn-primary"
                data-testid="c2-vault-pin-save"
                disabled={vaultBusy || vaultPin.length < 4}
                onClick={async () => {
                  if (!events.setVaultPasscode) {
                    setError("Saving a PIN is not wired in this build.");
                    return;
                  }
                  setVaultBusy(true);
                  setError(null);
                  try {
                    await events.setVaultPasscode(vaultPin);
                    setVaultPin("");
                    setVaultPinSaved(true);
                  } catch {
                    setError("That PIN did not save. Use four to eight digits and try again.");
                  } finally {
                    setVaultBusy(false);
                  }
                }}
              >
                {rowValue("vault_passcode_set") === "Set" ? "Change PIN" : "Set PIN"}
              </button>
              {vaultPinSaved ? (
                <p className="c2s-note" data-testid="c2-vault-pin-saved" role="status">
                  Saved. This PIN opens your Private graphs now.
                </p>
              ) : null}
            </div>

            <div className="c2s-field-group">
              <p className="c2s-field-label">Biometric unlock</p>
              <p className="c2s-field-reason">
                Open Private graphs with this device's face, fingerprint, or device
                PIN instead of typing your PIN. It is registered on this device only,
                and your PIN always still works.
              </p>
              <div className="c2s-row" style={{ border: "1px solid var(--line-1)", borderRadius: "var(--radius-card)" }}>
                <span className="c2s-row-main">
                  <span className="c2s-row-title">
                    {vaultBiometric ? "Biometric unlock is on" : "Biometric unlock is off"}
                  </span>
                </span>
                <button
                  type="button"
                  className="c2s-toggle"
                  data-on={vaultBiometric ? "1" : undefined}
                  role="switch"
                  aria-checked={vaultBiometric}
                  aria-label="Biometric unlock"
                  data-testid="c2-vault-biometric-toggle"
                  disabled={vaultBusy}
                  onClick={async () => {
                    if (!events.setVaultBiometric) {
                      setError("Biometric unlock is not wired in this build.");
                      return;
                    }
                    const next = !vaultBiometric;
                    setVaultBusy(true);
                    setError(null);
                    try {
                      await events.setVaultBiometric(next);
                      setVaultBiometric(next);
                    } catch (err) {
                      setError(
                        err instanceof Error && err.message
                          ? err.message
                          : "That did not save. Try again.",
                      );
                    } finally {
                      setVaultBusy(false);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}

        <div className="c2s-row-block">
          {section.rows.map((row) => {
            if (row.kind === "note") {
              // A3: on Connections, a category note is a quiet group
              // label, not body text inside the card.
              if (section.key === "connections" && row.id.startsWith("cat-")) {
                return (
                  <p
                    key={row.id}
                    className="c2s-note c2s-connection-cat"
                    data-testid={`connection-category-${row.id.slice(4)}`}
                  >
                    {row.text}
                  </p>
                );
              }
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
              // R20 F-9 v2 - a tool row is icon + name + ONE action,
              // nothing else on its face (no status sentence, no
              // subtitle, no chevron). The action is Connect or
              // Disconnect when the payload backed this row with a
              // real flow (hasRealFlow), and View when it did not:
              // View opens the row's own short detail (what it
              // powers, its status, what is holding it back, when it
              // was last checked) - plain lines, no essay, and the
              // status and gate lines never repeat one sentence
              // (the builder already drops a gate reason that merely
              // restates the status detail).
              const open = openConnectionId === row.id;
              const detailId = `connection-detail-${row.id}`;
              return (
                <div key={row.id} className="c2s-connection">
                  <div
                    className="c2s-row c2s-connection-row"
                    data-testid={`connection-row-${row.id}`}
                    data-connection-status={row.status}
                    data-has-real-flow={row.hasRealFlow ? "1" : undefined}
                  >
                    <span className="c2s-connection-icon" aria-hidden>
                      {row.title.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="c2s-row-main">
                      <span className="c2s-row-title">{row.title}</span>
                    </span>
                    {/* The payload's own status label stays in the
                        DOM verbatim (hidden) so the rendered status
                        can never drift from the payload's. */}
                    <span
                      hidden
                      data-testid={`connection-status-${row.id}`}
                    >
                      {row.statusLabel}
                    </span>
                    {row.action ? (
                      <button
                        type="button"
                        className="c2s-btn-quiet c2s-connection-action"
                        data-testid={`connection-action-${row.id}`}
                        data-action-id={row.action.id}
                        onClick={() => events.runAction(section.key, row.action!.id)}
                      >
                        {row.action.label}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="c2s-btn-quiet c2s-connection-action"
                        data-testid={`connection-action-${row.id}`}
                        data-action-id="view"
                        aria-expanded={open}
                        aria-controls={detailId}
                        onClick={() =>
                          setOpenConnectionId(open ? null : row.id)
                        }
                      >
                        View
                      </button>
                    )}
                  </div>
                  {open && !row.action ? (
                    <div
                      className="c2s-connection-detail"
                      id={detailId}
                      data-testid={detailId}
                    >
                      {row.subtitle ? (
                        <div>
                          <p className="c2s-detail-kicker">What this powers</p>
                          <p className="c2s-connection-detail-text">{row.subtitle}</p>
                        </div>
                      ) : null}
                      <div>
                        <p className="c2s-detail-kicker">Status</p>
                        <p className="c2s-connection-detail-text">{row.detail}</p>
                      </div>
                      {row.gateReason ? (
                        <div>
                          <p className="c2s-detail-kicker">What is holding it back</p>
                          <p className="c2s-connection-detail-text">{row.gateReason}</p>
                        </div>
                      ) : null}
                      <p className="c2s-connection-checked">{row.lastVerifiedLabel}</p>
                    </div>
                  ) : null}
                </div>
              );
            }
            if (row.kind === "value") {
              // Edit-profile name/handle values are edited in the form
              // above; do not render them twice.
              if (section.key === "edit-profile" && (row.id === "name" || row.id === "handle")) {
                return null;
              }
              // W8 item 16: the graphing seeds are edited in the
              // graphing control above; never as raw rows either
              // ("ask_each" must never reach the glass).
              if (
                section.key === "memory" &&
                (row.id === "graphing_call_mode" || row.id === "graphing_global_paused")
              ) {
                return null;
              }
              if (section.key === "connector-permissions" && row.id === "assistance_level") {
                return null;
              }
              // R20 F-4: the vault seeds are edited in the Private
              // graphs form above; do not render them twice.
              if (
                section.key === "private-graphs" &&
                (row.id === "vault_passcode_set" || row.id === "vault_biometric_enabled")
              ) {
                return null;
              }
              // SM/W8: the Soul fields are edited in the Soul form
              // above; do not render them twice - and never as raw
              // value rows (that was the combined page's defect).
              if (
                (section.key === "soul" || section.key === "soul-memory") &&
                [
                  "assistance_level",
                  "quiet_hours_start",
                  "quiet_hours_end",
                  "quiet_hours_on_off",
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
        {section.key === "memory" || section.key === "what-opal-remembers" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-4)" }} data-testid="c2-memory-stepup-form">
            <p className="c2s-note">
              Confirm it is you before adding or forgetting a memory. Opal sends a
              fresh code to the phone number on your account - your account has
              no password, so the phone code is the check. The confirmation
              lasts a few minutes.
            </p>
            {events.memoryStepUpReady ? (
              <p className="c2s-note" data-testid="c2-memory-stepup-ready" role="status">
                Confirmed. You can add and forget memories for a few minutes.
              </p>
            ) : (
              <>
                <input
                  className="c2s-field"
                  data-testid="c2-memory-stepup-phone"
                  placeholder="Phone number on your account"
                  value={stepUpPhone}
                  onChange={(e) => setStepUpPhone(e.target.value)}
                  aria-label="Phone number on your account"
                />
                {stepUpChallengeId ? (
                  <>
                    <input
                      className="c2s-field"
                      data-testid="c2-memory-stepup-code"
                      placeholder="Code from your phone"
                      value={stepUpCode}
                      onChange={(e) => setStepUpCode(e.target.value)}
                      aria-label="Code from your phone"
                    />
                    <button
                      type="button"
                      className="c2s-btn-primary"
                      data-testid="c2-memory-stepup-confirm"
                      disabled={stepUpBusy || stepUpCode.trim() === ""}
                      onClick={async () => {
                        if (!events.confirmMemoryStepUp) { setError("Confirming it is you is not wired in this build."); return; }
                        setStepUpBusy(true);
                        setError(null);
                        try {
                          await events.confirmMemoryStepUp(stepUpChallengeId, stepUpCode.trim(), stepUpPhone.trim());
                          setStepUpNote("Confirmed.");
                        } catch {
                          setError("That code did not work. Check it and try again.");
                        } finally {
                          setStepUpBusy(false);
                        }
                      }}
                    >
                      Confirm code
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="c2s-btn-primary"
                    data-testid="c2-memory-stepup-send"
                    disabled={stepUpBusy || stepUpPhone.trim() === ""}
                    onClick={async () => {
                      if (!events.startMemoryStepUp) { setError("Confirming it is you is not wired in this build."); return; }
                      setStepUpBusy(true);
                      setError(null);
                      try {
                        const started = await events.startMemoryStepUp(stepUpPhone.trim());
                        setStepUpChallengeId(started.challengeId);
                        if (started.developmentCode) setStepUpCode(started.developmentCode);
                        setStepUpNote("Code sent. Enter it below.");
                      } catch {
                        setError("That number is not the verified number on this account, or the code could not be sent.");
                      } finally {
                        setStepUpBusy(false);
                      }
                    }}
                  >
                    Send me a code
                  </button>
                )}
                {stepUpNote ? (
                  <p className="c2s-note" data-testid="c2-memory-stepup-note" role="status">{stepUpNote}</p>
                ) : null}
              </>
            )}
          </div>
        ) : null}
        {section.key === "memory" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-4)" }} data-testid="c2-memory-add-form">
            <p className="c2s-note">
              Tell Opal something to remember. It is saved with today's
              date and "You told Opal" on it, in the list above.
            </p>
            <input
              className="c2s-field"
              data-testid="c2-memory-add-input"
              placeholder="Something Opal should remember"
              value={memoryDraft}
              onChange={(e) => {
                setMemoryDraft(e.target.value);
                setMemoryAdded(false);
              }}
              aria-label="Something Opal should remember"
            />
            <button
              type="button"
              className="c2s-btn-primary"
              data-testid="c2-memory-add-submit"
              disabled={saving === "memory" || memoryDraft.trim() === ""}
              onClick={async () => {
                if (!events.addMemory) { setError("Adding a memory is not wired in this build."); return; }
                setSaving("memory");
                setError(null);
                try {
                  await events.addMemory(memoryDraft.trim());
                  setMemoryDraft("");
                  setMemoryAdded(true);
                } catch (e) {
                  // Repair #24 (WS-5): the server's step-up refusal
                  // gets its own honest line, pointing at the form
                  // in this room - not a connection guess.
                  if ((e as { code?: string })?.code === "step_up_required") {
                    setError("Confirm it is you first - use the step-up form above, then try again.");
                  } else {
                    setError("That memory could not be saved. Check your connection and try again.");
                  }
                } finally {
                  setSaving(null);
                }
              }}
            >
              Remember this
            </button>
            {memoryAdded ? (
              <p className="c2s-note" data-testid="c2-memory-added" role="status">
                Saved. It is in the list above, with today's date on it.
              </p>
            ) : null}
          </div>
        ) : null}
        {section.key === "invite-code" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-4)" }} data-testid="c2-redeem-form">
            {/* P9: the one copy action for this section - it writes
             * the payload's own share_url (the value row's subtitle),
             * never a reconstructed link. Absent URL, no button. */}
            {(() => {
              const codeRow = section.rows.find(
                (r) => r.kind === "value" && r.id === "code",
              );
              const shareUrl =
                codeRow && codeRow.kind === "value" ? (codeRow.subtitle ?? "") : "";
              if (!shareUrl) return null;
              return (
                <>
                  <button
                    type="button"
                    className="c2s-btn-text"
                    data-testid="c2-invite-copy-link"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(shareUrl);
                        setInviteCopyNote("Copied. Paste it anywhere to invite someone.");
                      } catch {
                        setInviteCopyNote("Copy was not available here. The link above is the full invite link.");
                      }
                    }}
                  >
                    Copy invite link
                  </button>
                  {inviteCopyNote ? (
                    <p className="c2s-note" data-testid="c2-invite-copy-note" role="status">
                      {inviteCopyNote}
                    </p>
                  ) : null}
                </>
              );
            })()}
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
