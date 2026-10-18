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

export type C2YouEvents = {
  editProfile: () => void;
  openSection: (key: string) => void;
  backToHub: () => void;
  setPreference: (sectionKey: string, rowId: string, value: boolean) => Promise<void>;
  runAction: (sectionKey: string, rowId: string) => void;
  saveProfileFields: (name: string, handle: string) => Promise<void>;
  setModePreference: (preference: "system" | "light" | "dark") => void;
  modePreference: "system" | "light" | "dark";
};

const HUB_GROUPS: Array<{ label: string; keys: string[] }> = [
  { label: "You", keys: ["edit-profile", "appearance"] },
  { label: "Privacy and safety", keys: ["privacy"] },
  { label: "How Opal helps", keys: ["calls-assist", "what-opal-remembers", "connected-sources", "care"] },
  { label: "Alerts and devices", keys: ["notifications", "linked-devices", "location-travel"] },
  { label: "Account", keys: ["account-security"] },
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
            if (row.kind === "value") {
              // Edit-profile name/handle values are edited in the form
              // above; do not render them twice.
              if (section.key === "edit-profile" && (row.id === "name" || row.id === "handle")) {
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
