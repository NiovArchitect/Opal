/**
 * Social Flow 12 — explicit release build profiles.
 * No production secrets. DevAuth disabled in internal RC.
 */

export type BuildProfile = "development" | "test" | "internal_rc" | "production_placeholder";

export type ReleaseProfile = {
  id: BuildProfile;
  version: string;
  buildNumber: string;
  apiHttpUrl: string;
  apiWsUrl: string;
  /** Current Brand V4 web product for R1B WebView host (override via EXPO_PUBLIC_OPAL_WEB_URL). */
  productWebUrl: string;
  aiMode: "synthetic" | "disabled" | "remote_placeholder";
  providerMode: "synthetic";
  loggingLevel: "debug" | "info" | "warn" | "error";
  debugMenu: boolean;
  devAuthEnabled: boolean;
  analyticsEnabled: boolean;
  crashReportingEnabled: boolean;
  featureFlags: Record<string, boolean>;
  environmentIdentity: string;
  allowsLocalhost: boolean;
};

const VERSION = "0.12.0";
const BUILD = "12";

export const PROFILES: Record<BuildProfile, ReleaseProfile> = {
  development: {
    id: "development",
    version: VERSION,
    buildNumber: BUILD,
    apiHttpUrl: "http://127.0.0.1:4000",
    apiWsUrl: "ws://127.0.0.1:4000/socket",
    productWebUrl: "http://127.0.0.1:5173",
    aiMode: "synthetic",
    providerMode: "synthetic",
    loggingLevel: "debug",
    debugMenu: true,
    devAuthEnabled: true,
    analyticsEnabled: false,
    crashReportingEnabled: false,
    featureFlags: { shell: true, onboarding: true },
    environmentIdentity: "dev-local",
    allowsLocalhost: true,
  },
  test: {
    id: "test",
    version: VERSION,
    buildNumber: BUILD,
    apiHttpUrl: "http://127.0.0.1:4000",
    apiWsUrl: "ws://127.0.0.1:4000/socket",
    productWebUrl: "http://127.0.0.1:5173",
    aiMode: "synthetic",
    providerMode: "synthetic",
    loggingLevel: "warn",
    debugMenu: false,
    devAuthEnabled: true,
    analyticsEnabled: false,
    crashReportingEnabled: false,
    featureFlags: { shell: true, onboarding: true },
    environmentIdentity: "ci-test",
    allowsLocalhost: true,
  },
  internal_rc: {
    id: "internal_rc",
    version: VERSION,
    buildNumber: BUILD,
    // Hosted product API/web. Place/AI providers remain synthetic until authorized.
    // Phone auth is independent: set OPAL_PHONE_VERIFY_MODE=production_sms on the API host.
    // DevAuth must stay false for RC (Tranche #2).
    apiHttpUrl: "https://api.opal.niovlabs.com",
    apiWsUrl: "wss://api.opal.niovlabs.com/socket",
    productWebUrl: "https://app.opal.niovlabs.com",
    aiMode: "synthetic",
    providerMode: "synthetic",
    loggingLevel: "info",
    debugMenu: false,
    devAuthEnabled: false,
    analyticsEnabled: false,
    crashReportingEnabled: true,
    featureFlags: { shell: true, onboarding: true },
    environmentIdentity: "internal-rc",
    allowsLocalhost: false,
  },
  production_placeholder: {
    id: "production_placeholder",
    version: VERSION,
    buildNumber: BUILD,
    apiHttpUrl: "https://api.opal.niovlabs.com",
    apiWsUrl: "wss://api.opal.niovlabs.com/socket",
    productWebUrl: "https://app.opal.niovlabs.com",
    aiMode: "remote_placeholder",
    providerMode: "synthetic",
    loggingLevel: "error",
    debugMenu: false,
    devAuthEnabled: false,
    analyticsEnabled: false,
    crashReportingEnabled: true,
    featureFlags: { shell: true, onboarding: true },
    environmentIdentity: "production-placeholder",
    allowsLocalhost: false,
  },
};

export function resolveProfile(name?: string | null): ReleaseProfile {
  const key = (name || "development") as BuildProfile;
  return PROFILES[key] ?? PROFILES.development;
}

export function assertProfileSafe(profile: ReleaseProfile): string[] {
  const issues: string[] = [];
  if (profile.id === "internal_rc" || profile.id === "production_placeholder") {
    if (profile.devAuthEnabled) issues.push("DEVAUTH_ENABLED_IN_RC");
    if (profile.debugMenu) issues.push("DEBUG_MENU_IN_RC");
    if (profile.allowsLocalhost) issues.push("LOCALHOST_ALLOWED_IN_RC");
    if (/localhost|127\.0\.0\.1/.test(profile.apiHttpUrl)) {
      issues.push("LOCALHOST_ENDPOINT_IN_RC");
    }
  }
  if (profile.providerMode !== "synthetic" && profile.id !== "production_placeholder") {
    issues.push("UNEXPECTED_PROVIDER_MODE");
  }
  return issues;
}
