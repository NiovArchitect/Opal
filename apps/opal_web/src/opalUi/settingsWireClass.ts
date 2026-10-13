/**
 * Pass 1C — Settings live-wire classification.
 * GREEN = UI → API → DB → behavior (or honest local-only).
 * HONEST_GATE = visible + blockedReason (no fake connected state).
 * HIDDEN = not shown (no user value yet) — reserved; prefer honest gate when listed.
 */
export type SettingsWireClass = "GREEN" | "HONEST_GATE" | "HIDDEN";

export type SettingsWireRow = {
  id: string;
  title: string;
  screen: string;
  class: SettingsWireClass;
  /** Short proof of the wire path or gate reason. */
  wire: string;
};

/**
 * Canonical Pass 1C classification for rows that users can reach.
 * Re-audit when a preference API ships.
 */
export const SETTINGS_WIRE_CLASSIFICATION: SettingsWireRow[] = [
  {
    id: "save",
    title: "Save profile",
    screen: "edit-profile",
    class: "GREEN",
    wire: "UI → updateProfile → product profile API → session name/handle",
  },
  {
    id: "save-home-timezone",
    title: "Save home timezone",
    screen: "location-travel",
    class: "GREEN",
    wire: "UI → updateHomeTimezone → home timezone store → travel display",
  },
  {
    id: "travel-mode",
    title: "Travel mode",
    screen: "location-travel",
    class: "GREEN",
    wire: "Read projection of getHomeTimezone.active (not a fake toggle)",
  },
  {
    id: "assist",
    title: "Opal Assist on calls",
    screen: "calls-assist",
    class: "GREEN",
    wire: "UI → updateAssistPreference / getAssistPreference → DB preference → call Assist",
  },
  {
    id: "messages-calls",
    title: "Messages & calls",
    screen: "notifications",
    class: "GREEN",
    wire: "UI → updateMessagingPreferences(message_notifications_enabled) → prefs API",
  },
  {
    id: "read-receipts",
    title: "Read receipts",
    screen: "notifications",
    class: "GREEN",
    wire: "UI → updateMessagingPreferences(read_receipts_enabled) → prefs API",
  },
  {
    id: "this-phone",
    title: "This phone",
    screen: "linked-devices",
    class: "GREEN",
    wire: "Local session projection (Active) — this device only",
  },
  {
    id: "linked-from-account",
    title: "Linked devices",
    screen: "account-security",
    class: "GREEN",
    wire: "Nav opens linked-devices screen (nested gates stay honest)",
  },
  {
    id: "delete-account",
    title: "Delete account",
    screen: "account-security",
    class: "GREEN",
    wire: "Nav opens delete-account; confirm-delete remains HONEST_GATE until API ships",
  },
  {
    id: "keep-account",
    title: "Keep my account",
    screen: "delete-account",
    class: "GREEN",
    wire: "Local dismiss back to Account — no fake delete",
  },
  {
    id: "nearby-range",
    title: "Nearby range",
    screen: "feed-discovery",
    class: "HONEST_GATE",
    wire: "Needs discovery-distance preference API — not wired yet.",
  },
];

export function settingsWireSummary(rows: SettingsWireRow[] = SETTINGS_WIRE_CLASSIFICATION) {
  const green = rows.filter((r) => r.class === "GREEN");
  const honest = rows.filter((r) => r.class === "HONEST_GATE");
  const hidden = rows.filter((r) => r.class === "HIDDEN");
  return {
    green: green.length,
    honest_gate: honest.length,
    hidden: hidden.length,
    total_classified: rows.length,
  };
}
