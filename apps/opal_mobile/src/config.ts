/** Endpoints and synthetic fixtures — profile-aware (Social Flow 12). */
import { resolveProfile } from "./release/profiles";

const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
  ?.env;

const profile = resolveProfile(env?.EXPO_PUBLIC_OPAL_PROFILE ?? "development");

export const RELEASE_PROFILE = profile;
export const API_HTTP_URL = env?.EXPO_PUBLIC_OPAL_HTTP_URL ?? profile.apiHttpUrl;
export const API_WS_URL = env?.EXPO_PUBLIC_OPAL_WS_URL ?? profile.apiWsUrl;

export const SYNTHETIC = {
  alexUserId: "a1111111-1111-4111-8111-111111111111",
  jordanUserId: "a2222222-2222-4222-8222-222222222222",
  alexJordanConversationId: "b1111111-1111-4111-8111-111111111111",
  alexGrantedConsentId: "c1111111-1111-4111-8111-111111111111",
} as const;
