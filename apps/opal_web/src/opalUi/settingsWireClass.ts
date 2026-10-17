/**
 * Pass B — Settings consumer wire classification.
 * GREEN = UI → API → DB → behavior (or honest local-only).
 * HIDDEN = not shown to consumers (no working behavior / technical leak).
 * HONEST_GATE deprecated for consumer paint under CONSUMER_TECHNICAL_LEAK=0 —
 * blocked inventory stays in YouSettingsDestination SCREENS data but is not rendered.
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
 * Canonical classification for rows that users can reach after Pass B hide.
 * Re-audit when a preference API ships and a row is un-hidden.
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
    wire: "Local session projection (Active) - this device only",
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
    wire: "Nav opens delete-account; self-serve delete CTA hidden until API ships",
  },
  {
    id: "keep-account",
    title: "Keep my account",
    screen: "delete-account",
    class: "GREEN",
    wire: "Local dismiss back to Account - no fake delete",
  },
  {
    id: "appearance-theme",
    title: "Appearance",
    screen: "appearance",
    class: "GREEN",
    wire: "UI → setAppearancePreference → localStorage (opal.appearance.theme.v1) → data-theme on documentElement",
  },
  {
    id: "nearby-range",
    title: "Nearby range",
    screen: "feed-discovery",
    class: "HIDDEN",
    wire: "Pass B hide - discovery-distance preference API not shipped",
  },
  // Repair #13 (W3) — proven end-to-end by repair13_settings_audit_test.exs.
  {
    id: "what-opal-can-do",
    title: "Place calls for you / Make reservations for you",
    screen: "calls-assist",
    class: "GREEN",
    wire: "UI → grantConsent/revokeConsent → Consent.grant/revoke → Consent.require_for_action execution gate (calls.ex, plan_execution.ex)",
  },
  {
    id: "opal-graphing-standing",
    title: "Pause Graphing + call modes",
    screen: "calls-assist",
    class: "GREEN",
    wire: "UI → updateGraphingPolicy → RelationshipAccess → graphing_decision (:global_paused/:never/:ask/:auto/:selected)",
  },
  {
    id: "spending-comfort",
    title: "Spending comfort save/remove",
    screen: "spending",
    class: "GREEN",
    wire: "UI → setFinancialProfile/deleteFinancialProfile → FinancialProfiles (trusted+ gate) → GroupTastes + CelebrationCuration budget_note",
  },
  {
    id: "fit-prefs-section",
    title: "Fit preferences save + share gate",
    screen: "fit",
    class: "GREEN",
    wire: "UI → saveFitPreferences (per-user localStorage) → readFitSliceForOpal → OpalCenterChat :fit context (null when share off)",
  },
  {
    id: "what-opal-remembers",
    title: "Memory forget / relationship types / trust grant-revoke",
    screen: "privacy",
    class: "GREEN",
    wire: "UI → forgetMemoryFact/setRelationshipType/grantInnerCircleTrust → DurablePreferenceMemory/Relationships/TrustTiers → list read-back",
  },
  {
    id: "celebrations-section",
    title: "Celebrations add/remove + curation",
    screen: "privacy",
    class: "GREEN",
    wire: "UI → createCelebration/deleteCelebration/curateCelebration → Celebrations/CelebrationCuration → list + curation read-back",
  },
  {
    id: "invite-friends",
    title: "Invite link / SMS / status list",
    screen: "feed-discovery",
    class: "GREEN",
    wire: "UI → createProductInvite → Invites.create_invite (rate-limited; honest SMS note) → get_by_code resolves",
  },
  // Repair #15 (DF) - proven by connectedSources.test.tsx (status projection
  // unit tests + render against a mocked status endpoint).
  {
    id: "connected-sources-google",
    title: "Google Calendar and email connection status / connect / disconnect",
    screen: "privacy",
    class: "GREEN",
    wire: "UI -> getGoogleCalendarStatus/startGoogleCalendarConnect/revokeGoogleCalendarConnection -> ConnectorController -> ProviderConnections.public_status/revoke -> Calendar.connected? gates free/busy checks; OAuth consent is calendar.readonly + gmail.readonly",
  },
  {
    id: "appearance-theme-picker",
    title: "Appearance theme picker",
    screen: "appearance",
    class: "GREEN",
    wire: "UI → setAppearancePreference → localStorage (opal.appearance.theme.v1) → data-theme on documentElement",
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
