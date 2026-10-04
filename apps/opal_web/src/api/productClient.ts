/**
 * Product API client (SF17 browser-first activation).
 *
 * Hosted pages (opal.niovlabs.com) cannot rely on third-party cookies to Render.
 * After verify we keep a short-lived access token in memory only (not localStorage)
 * and send Authorization on API calls. Cookies remain for same-site future hosts.
 */

export type ProductSession = {
  user_id: string;
  display_name: string;
  handle?: string;
  session_id?: string;
  /** Never written to localStorage. Tab sessionStorage + memory after verify. */
  access_token?: string;
  /** This boot was confirmed by the HttpOnly session cookie, without a bearer. */
  cookie_session?: boolean;
};

export type ConversationSummary = {
  id: string;
  title: string;
  preview: string;
  updated_at: string;
  peers: { id: string; display_name: string; handle: string }[];
  member_count?: number;
  composition?: "group" | "dyad" | string;
  /** Slice #1 — durable unread from conversation_members.last_read_server_seq */
  unread_count?: number;
  last_read_server_seq?: number;
  latest_server_seq?: number;
  notifications_muted?: boolean;
  plan_projection?: {
    lineage_id?: string | null;
    conversation_id: string;
    visibility: "participants" | string;
    participant_mode: "solo" | "dyad" | "group" | string;
    kicker: string;
    when_label?: string | null;
    place?: string | null;
    activity?: string | null;
    timezone?: string | null;
    place_identity?: {
      name?: string | null;
      area?: string | null;
      place_id?: string | null;
      address?: string | null;
      coordinates?: { lat?: number; lng?: number } | null;
      provenance?: string | null;
    } | null;
    execution_label?: string | null;
    execution_detail?: string | null;
    pending_change?: boolean;
    public?: boolean;
  } | null;
};

export type MessagingPreferences = {
  read_receipts_enabled: boolean;
  message_notifications_enabled: boolean;
};

export type ProductMessage = {
  id: string;
  body: string;
  sender_user_id: string;
  server_seq: number;
  created_at: string;
  client_message_id: string;
  conversation_id?: string;
  message_type?: string;
};

export type ChronologicalMoment = {
  lifecycle_stage?: string;
  kind?: string;
  label?: string;
  evidence_message_id?: string;
  source_message_ids?: string[];
  after_server_seq?: number;
  created_from?: string;
  not_staged?: boolean;
};

export type ProductSignal = {
  kind: string;
  /** Human-facing shared-reality headline (not internal stage name). */
  label: string;
  status: string;
  authority?: string;
  conversation_id?: string;
  evidence_preview?: string;
  evidence_message_id?: string;
  evidence_message_ids?: string[];
  source_message_ids?: string[];
  evidence_server_seq?: number;
  chronological_moments?: ChronologicalMoment[];
  member_count?: number;
  speaker_count?: number;
  affirmative_count?: number;
  composition?: "group" | "dyad" | string;
  partial_group?: boolean;
  "partial_group?"?: boolean;
  group_composition?: {
    composition?: string;
    member_count?: number;
    human_surface?: {
      headline?: string;
      who_line?: string | null;
      when_line?: string | null;
      place_line?: string | null;
      place_gap?: boolean;
      food_consequence?: string | null;
      area_consequence?: string | null;
    };
    who?: {
      member_count?: number;
      projected_count?: number;
      pending_invites?: string[];
    };
    when?: { strongest_common_start?: string; day?: string; window_note?: string };
    where?: { known_place?: string; downtown_incompatible?: boolean };
  };
  /** Authority stage: quiet | plan_forming | still_open | set | … */
  lifecycle_stage?: string;
  visibility?: string;
  privacy_class?: string;
  not_identity_label?: boolean;
  detail?: string;
  proposal_id?: string;
  set_version?: number;
  requires_user_action?: boolean;
  ui_job?: string;
  sufficiency?: string;
  /** Shared-safe collective fit from server CollectiveComposition (not private reasons) */
  collective_fit?: {
    authority?: string;
    authorizes_set?: boolean;
    party_size?: number;
    abstain?: boolean;
    one_question?: { text?: string; dimension?: string; privacy?: string } | null;
    shared_safe_summary?: string | null;
    human_surface?: {
      label?: string;
      detail?: string;
      options?: Array<{ id?: string; name?: string; area?: string; tag?: string }>;
    };
    options?: Array<{
      id?: string;
      name?: string;
      area?: string;
      tag?: string;
      cuisine?: string;
      quiet?: boolean;
    }>;
    group_intent?: string | null;
    episode_category?: string | null;
    privacy?: string;
  };
  shared_reality?: {
    what?: string | null;
    when?: string | null;
    where?: string | null;
    place_gap_label?: string | null;
    place_level?: string;
    gaps?: string[];
    /** Whole-picture next gap: time | place | activity | none | … */
    next_gap?: string;
    next_actions?: Array<{
      dimension?: string;
      verb?: string;
      label?: string;
      opens?: string;
      share_kind?: string | null;
    }>;
    primary_action?: {
      dimension?: string;
      verb?: string;
      label?: string;
      opens?: string;
      share_kind?: string | null;
    };
    primary_action_label?: string | null;
    speaker_count?: number;
    composition?: string;
    sufficiency?: string;
    ui_job?: string;
    headline?: string | null;
    detail?: string | null;
    usable?: boolean;
    "usable?"?: boolean;
    plans_durable?: boolean;
    "plans_durable?"?: boolean;
    /** Travel truth only when permissioned + computed */
    distance?: string | null;
    travel_estimate?: string | null;
    leave_around?: string | null;
    leave_by?: string | null;
    area?: string | null;
  };
};

export type RuntimeConfig = {
  apiBase: string;
  socketBase: string;
  environment: string;
  synthetic: boolean;
};

/** Approved synthetic fixtures for hosted preview (no SMS). */
export const APPROVED_PREVIEW_FIXTURES = [
  { e164: "+12025550101", label: "Test line A", codeHint: "111111" },
  { e164: "+12025550102", label: "Test line B", codeHint: "222222" },
  { e164: "+12025550103", label: "Test line C", codeHint: "333333" },
  { e164: "+12025550104", label: "Test line D", codeHint: "444444" },
  { e164: "+12025550105", label: "Test line E", codeHint: "555555" },
  { e164: "+12025550106", label: "Test line F", codeHint: "666666" },
  { e164: "+12025550107", label: "Test line G", codeHint: "777777" },
  { e164: "+12025550108", label: "Test line H", codeHint: "888888" },
] as const;

/**
 * Durable founder-review auth fixture (local/dev only).
 * Historical: mobile ActivationScreen + APPROVED_PREVIEW_FIXTURES[0].
 * Never leak into production product UI as visible chrome.
 */
export const FOUNDER_AUTH_FIXTURE = {
  e164: "+12025550101",
  dial: "+1",
  national: "2025550101",
  otp: "111111",
  label: "Test line A",
} as const;

export function codeHintForE164(e164: string): string | null {
  const hit = APPROVED_PREVIEW_FIXTURES.find((f) => f.e164 === e164);
  return hit?.codeHint ?? null;
}
const PROFILE_KEY = "opal.product.profile.v17";
const CSRF_KEY = "opal.product.csrf.v17";
/**
 * Tab-scoped bearer. Survives reload of this tab. Not localStorage, so a
 * second tab or browser profile does not inherit it. HttpOnly cookie
 * `opal_session` is the cross-reload fallback when this tab key is empty.
 */
export const BROWSER_SESSION_KEY = "opal.product.browser_session.v1";

/** Memory-only bearer for the current tab (hosted cross-origin). */
let memoryAccessToken: string | null = null;

export function setMemoryAccessToken(token: string | null | undefined): void {
  memoryAccessToken = token && token.length > 0 ? token : null;
}

export function getMemoryAccessToken(): string | null {
  return memoryAccessToken;
}

function env(name: string): string | undefined {
  return (import.meta as { env?: Record<string, string> }).env?.[name];
}

function isNativeHostPage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      new URLSearchParams(window.location.search).get("opal_native_host") === "1" ||
      window.sessionStorage?.getItem("opal_native_host") === "1"
    );
  } catch {
    return false;
  }
}

function isLoopbackHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

function isProductionWebHost(host: string): boolean {
  return host === "opal.niovlabs.com" || host.endsWith(".github.io");
}

/** RFC1918 / link-local hosts — common for founder LAN Vite/API env. */
function isPrivateLanHostname(host: string): boolean {
  if (!host) return false;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  return false;
}

function configuredApiHostname(base: string): string | null {
  if (!base) return null;
  try {
    return new URL(base).hostname;
  } catch {
    return null;
  }
}

/**
 * Canonical Opal API origin for the current runtime.
 *
 * Physical iPhone WebView loads Vite from a LAN host (not loopback). Direct
 * calls to 127.0.0.1 fail on-device; calls to LAN:4000 are blocked by CSP
 * connect-src (only loopback listed) and Phoenix CORS (only localhost Vite).
 *
 * Local native-host solution: same-origin API via Vite proxy (/api, /socket)
 * — no hardcoded LAN IPs, no production CORS wildcard.
 *
 * Loopback pages (Playwright / desktop) must never keep a private-LAN API
 * base: CSP connect-src allows 127.0.0.1/localhost only. Native-host on
 * loopback uses same-origin proxy; non-native loopback rewrites LAN →
 * http://127.0.0.1:4000.
 */
export function getOpalApiBaseUrl(configured = env("VITE_OPAL_API_URL") || ""): string {
  const base = (configured || "").replace(/\/$/, "");

  if (typeof window === "undefined") return base;
  // An https page must use itself. A configured http LAN address would be
  // mixed content, and the Vite proxy is what reaches Phoenix.
  if (window.location.protocol === "https:" && !isProductionWebHost(window.location.hostname)) {
    return window.location.origin;
  }

  const pageHost = window.location.hostname;
  const configuredHost = configuredApiHostname(base);

  if (!isNativeHostPage()) {
    // Desktop/automation on loopback with LAN VITE_OPAL_API_URL: CSP blocks LAN.
    if (
      isLoopbackHost(pageHost) &&
      configuredHost &&
      isPrivateLanHostname(configuredHost)
    ) {
      return "http://127.0.0.1:4000";
    }
    return base;
  }

  if (!pageHost || isProductionWebHost(pageHost)) {
    return base;
  }

  // Native-host on loopback (Playwright proofs): same-origin Vite proxy.
  // Keeping a LAN-configured API here violates CSP connect-src.
  if (isLoopbackHost(pageHost)) {
    return window.location.origin;
  }

  // Dev LAN page → same origin (Vite proxies to Phoenix). Never rewrite HTTPS prod.
  if (base && /^https:/i.test(base) && !isLocalhost(base)) return base;
  return window.location.origin;
}

export function getOpalSocketBaseUrl(
  configuredApi = env("VITE_OPAL_API_URL") || "",
  configuredSocket = env("VITE_OPAL_SOCKET_URL") || "",
): string {
  const socketConfigured = (configuredSocket || configuredApi || "").replace(/\/$/, "");
  const apiBase = getOpalApiBaseUrl(configuredApi);
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    !isProductionWebHost(window.location.hostname)
  ) {
    return window.location.origin;
  }
  if (!socketConfigured) return apiBase;
  // Keep socket on same resolved origin as API for native-host same-origin proxy.
  if (isNativeHostPage() && apiBase === (typeof window !== "undefined" ? window.location.origin : "")) {
    return apiBase;
  }
  if (isNativeHostPage() && isLocalhost(socketConfigured) && apiBase && !isLocalhost(apiBase)) {
    return apiBase;
  }
  return socketConfigured;
}

/** @deprecated use getOpalApiBaseUrl — kept for call-site clarity during migration */
function deviceReachableBase(configured: string): string {
  return getOpalApiBaseUrl(configured);
}

export function runtimeConfig(): RuntimeConfig {
  const configuredApi = (env("VITE_OPAL_API_URL") || "").replace(/\/$/, "");
  const configuredSocket = (env("VITE_OPAL_SOCKET_URL") || "").replace(/\/$/, "");
  const apiBase = getOpalApiBaseUrl(configuredApi);
  const socketBase = getOpalSocketBaseUrl(configuredApi, configuredSocket);
  const environment = env("VITE_OPAL_ENV") || (apiBase ? "hosted" : "local");
  const synthetic = env("VITE_OPAL_SYNTHETIC") !== "false";
  return { apiBase, socketBase, environment, synthetic };
}

/** Dev-only marker so physical reload can prove resolver version without secrets. */
export const AUTH_API_RESOLVER_VERSION = "native-same-origin-proxy-v2";

export function apiConfigured(): boolean {
  const { apiBase } = runtimeConfig();
  if (!apiBase) return false;
  if (environmentIsHostedPage() && isLocalhost(apiBase)) return false;
  return true;
}

export function environmentIsHostedPage(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "opal.niovlabs.com" || h.endsWith(".github.io");
}

function isLocalhost(url: string): boolean {
  return /localhost|127\.0\.0\.1/.test(url);
}

/**
 * Normalize to E.164. Optional dialCode (e.g. "+52") applies when raw has no +.
 * +1 is never forced when a different dial is selected or raw already includes +.
 */
export function normalizePhoneInput(raw: string, dialCode = "+1"): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) {
    const digits = trimmed.replace(/[^\d+]/g, "");
    if (digits.startsWith("+") && digits.length >= 8) return digits;
  }
  const national = trimmed.replace(/\D/g, "");
  const dial = dialCode.startsWith("+") ? dialCode : `+${dialCode.replace(/\D/g, "")}`;
  if (!national) return dial;
  // Avoid double-prefix if national already includes country digits matching dial
  const dialDigits = dial.replace(/\D/g, "");
  if (national.startsWith(dialDigits) && national.length > dialDigits.length) {
    return `+${national}`;
  }
  return `${dial}${national}`;
}

export function isApprovedPreviewFixture(raw: string): boolean {
  const n = normalizePhoneInput(raw);
  return APPROVED_PREVIEW_FIXTURES.some((f) => f.e164 === n);
}

export function saveBrowserAccessToken(token: string | null | undefined): void {
  setMemoryAccessToken(token);
  try {
    if (!token) sessionStorage.removeItem(BROWSER_SESSION_KEY);
    else sessionStorage.setItem(BROWSER_SESSION_KEY, token);
  } catch {
    /* private mode */
  }
}

export function loadBrowserAccessToken(): string | null {
  const memory = getMemoryAccessToken();
  if (memory) return memory;
  try {
    const stored = sessionStorage.getItem(BROWSER_SESSION_KEY);
    if (stored) {
      setMemoryAccessToken(stored);
      return stored;
    }
  } catch {
    /* private mode */
  }
  return null;
}

export function saveProfile(session: ProductSession | null): void {
  try {
    if (!session) {
      localStorage.removeItem(PROFILE_KEY);
      saveBrowserAccessToken(null);
      return;
    }
    // Identity only. The bearer stays in tab sessionStorage, never localStorage.
    localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({
        user_id: session.user_id,
        display_name: session.display_name,
        handle: session.handle,
        session_id: session.session_id,
      }),
    );
    if (session.access_token) saveBrowserAccessToken(session.access_token);
  } catch {
    /* ignore */
  }
}

export function loadProfile(): ProductSession | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as ProductSession;
    const token = loadBrowserAccessToken();
    return token ? { ...p, access_token: token } : p;
  } catch {
    return null;
  }
}

export function saveCsrf(token: string | null | undefined): void {
  try {
    if (!token) localStorage.removeItem(CSRF_KEY);
    else localStorage.setItem(CSRF_KEY, token);
  } catch {
    /* ignore */
  }
}

export function loadCsrf(): string | null {
  try {
    return localStorage.getItem(CSRF_KEY);
  } catch {
    return null;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function csrfHeader(): Record<string, string> {
  const fromCookie = readCookie("opal_csrf");
  const token = fromCookie || loadCsrf();
  return token ? { "x-csrf-token": token } : {};
}

function resolveBearer(explicit?: string): string | undefined {
  return explicit || getMemoryAccessToken() || undefined;
}

async function request<T>(
  path: string,
  opts: RequestInit & { bearer?: string; csrf?: boolean } = {},
): Promise<T> {
  if (!apiConfigured()) {
    const err = new Error("Could not connect to Opal right now.") as Error & {
      code?: string;
    };
    err.code = "api_not_configured";
    throw err;
  }

  const { apiBase } = runtimeConfig();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(opts.headers as Record<string, string>),
  };
  const bearer = resolveBearer(opts.bearer);
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  if (opts.csrf !== false && opts.method && opts.method !== "GET") {
    Object.assign(headers, csrfHeader());
  }

  let res: Response;
  try {
    res = await fetch(`${apiBase}${path}`, {
      ...opts,
      headers,
      credentials: "include",
    });
  } catch {
    const err = new Error("Could not connect to Opal services. Try again.") as Error & {
      code?: string;
    };
    err.code = "network_error";
    throw err;
  }

  const data = await res.json().catch(() => ({}));
  if (data.csrf_token) saveCsrf(data.csrf_token);
  const csrfHeaderVal = res.headers.get("x-csrf-token");
  if (csrfHeaderVal) saveCsrf(csrfHeaderVal);

  if (!res.ok) {
    const err = new Error(
      humanError(data.error_code, data.message || res.statusText),
    ) as Error & { code?: string; status?: number };
    err.code = data.error_code;
    err.status = res.status;
    throw err;
  }
  return data as T;
}

function humanError(code: string | undefined, fallback: string): string {
  switch (code) {
    case "invalid_code":
      return "That code did not match. Try again.";
    case "expired":
      return "That code expired. Request a new one.";
    case "locked":
      return "Too many attempts. Wait a moment, then try again.";
    case "replay":
      return "That code was already used. Request a new one.";
    case "rate_limited":
      return "Too many tries. Wait a moment, then try again.";
    case "invalid_identifier":
      return "Enter a valid phone number.";
    case "unsupported_region":
      return "This region is not available in the preview yet.";
    case "number_not_enabled":
      return "This number is not enabled for the preview. Use an approved test line.";
    case "auth_required":
    case "session_revoked":
    case "invalid_token":
    case "token_expired":
      return "Your session ended. Sign in again.";
    case "csrf_invalid":
      return "Could not complete that step. Refresh and try again.";
    default:
      return fallback || "Something went wrong. Try again.";
  }
}

export async function startChallenge(
  phone: string,
  deviceLabel: string,
  consent?: {
    otpConsentAccepted: boolean;
    otpConsentPolicyVersion: string;
  },
) {
  if (environmentIsHostedPage() && !isApprovedPreviewFixture(phone)) {
    const err = new Error(
      "This preview only accepts approved test numbers. No text will be sent.",
    ) as Error & { code?: string };
    err.code = "number_not_enabled";
    throw err;
  }

  const e164 = phone.trim().startsWith("+")
    ? phone.trim()
    : normalizePhoneInput(phone);
  if (isNativeHostPage()) {
    const { apiBase } = runtimeConfig();
    // Sanitized: no phone/OTP/secrets — proves physical bundle hit the resolver.
    console.info("[OPAL_AUTH_API]", {
      resolver: AUTH_API_RESOLVER_VERSION,
      apiBase,
      path: "/api/v1/product/activation/challenges",
    });
  }
  return request<{
    challenge: { id: string; status?: string };
    development_code?: string | null;
    provider: string;
    not_production_sms: boolean;
    origin?: string;
  }>("/api/v1/product/activation/challenges", {
    method: "POST",
    body: JSON.stringify({
      phone: e164,
      device_label: deviceLabel,
      // Unique per attempt so a prior "used" challenge is not stuck-idempotent.
      idempotency_key: `ch-${e164}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      otp_consent_accepted: consent?.otpConsentAccepted ?? false,
      otp_consent_policy_version: consent?.otpConsentPolicyVersion ?? "otp-sms-v1",
      otp_consent_at: new Date().toISOString(),
    }),
    csrf: false,
  });
}

export async function verifyChallenge(input: {
  challengeId: string;
  code: string;
  phone?: string;
  displayName: string;
  deviceLabel: string;
  handleHint?: string;
}) {
  // Always request bearer for browser bootstrap. Cookies alone fail across GitHub Pages → Render.
  // Re-submit phone so production Verify can check without reversing digests; server binds to challenge.
  const data = await request<{
    session: {
      access_token?: string;
      session_id: string;
      user_id: string;
    };
    user: { id: string; display_name: string; handle: string };
    csrf_token?: string;
    provider: string;
  }>("/api/v1/product/activation/verify", {
    method: "POST",
    body: JSON.stringify({
      challenge_id: input.challengeId,
      code: input.code.trim(),
      phone: input.phone ? normalizePhoneInput(input.phone) : undefined,
      display_name: input.displayName,
      device_label: input.deviceLabel,
      handle_hint: input.handleHint,
      platform: "web",
      include_bearer: true,
    }),
    csrf: false,
  });

  if (data.csrf_token) saveCsrf(data.csrf_token);

  if (!data.user?.id) {
    const err = new Error("Could not prepare your account. Try again.") as Error & {
      code?: string;
    };
    err.code = "account_ready_failed";
    throw err;
  }

  const session: ProductSession = {
    access_token: data.session.access_token,
    user_id: data.user.id,
    display_name: data.user.display_name,
    handle: data.user.handle,
    session_id: data.session.session_id,
  };
  setMemoryAccessToken(session.access_token);
  saveProfile(session);

  // Confirm session works before returning (bearer or cookie).
  try {
    await fetchSession(session.access_token);
  } catch {
    // If session probe fails, still return if we have user + token so UI can advance.
    if (!session.access_token) {
      const err = new Error(
        "Session could not be established. Refresh and try again.",
      ) as Error & { code?: string };
      err.code = "session_establish_failed";
      throw err;
    }
  }

  return session;
}

export async function fetchSession(bearer?: string) {
  return request<{
    user: { id: string; display_name: string; handle: string };
    session?: { id?: string };
    auth_mode?: string;
  }>("/api/v1/product/session", { bearer: resolveBearer(bearer), method: "GET" });
}

/** S1 FR08 — persist name / optional username to user authority. */
export async function updateProfile(
  input: { displayName: string; handle?: string },
  bearer?: string,
) {
  const data = await request<{
    user: { id: string; display_name: string; handle: string };
    profile_updated?: boolean;
  }>("/api/v1/product/session/profile", {
    method: "PATCH",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({
      display_name: input.displayName.trim(),
      handle: input.handle?.trim() || undefined,
    }),
  });
  return data;
}

export async function signOut(bearer?: string) {
  try {
    await request("/api/v1/product/session", {
      method: "DELETE",
      bearer: resolveBearer(bearer),
    });
  } finally {
    saveProfile(null);
    saveCsrf(null);
    setMemoryAccessToken(null);
  }
}

export async function createInvitation(
  phone: string,
  label: string,
  message: string,
  bearer?: string,
  inviteSource: "manual" | "selected_contact" | "contacts" | "share_link" = "manual",
) {
  return request<{
    invitation: { id: string; status: string; product_status?: string };
    share?: { token?: string; path?: string };
    product_status?: string;
    delivery?: {
      sms_sent?: boolean;
      share_link_ready?: boolean;
      honest_no_production_sms?: boolean;
      labels?: Record<string, boolean>;
    };
    product_delivery_label?: string;
  }>("/api/v1/product/invitations", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({
      phone: normalizePhoneInput(phone),
      label,
      message,
      invite_source: inviteSource,
      idempotency_key: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }),
  });
}

export async function listPeople(bearer?: string) {
  return request<{
    connected: { relationship_id: string; conversation_id: string; display_name?: string }[];
    outgoing: { id: string; product_status?: string; label?: string }[];
    incoming: { id: string; product_status?: string }[];
    no_follower_counts: boolean;
  }>("/api/v1/product/people", { bearer: resolveBearer(bearer) });
}

export async function listOutgoing(bearer?: string) {
  return request<{ invitations: { id: string; status: string; product_status?: string }[] }>(
    "/api/v1/product/invitations/outgoing",
    { bearer: resolveBearer(bearer) },
  );
}

export async function previewInviteShare(token: string) {
  return request<{
    continuation_id?: string;
    invitation_id?: string;
    inviter_display_name?: string;
    message?: string;
    requires_acceptance?: boolean;
  }>(`/api/v1/product/invitations/share/${encodeURIComponent(token)}`, {
    method: "GET",
  });
}

/** After sign-in: exchange short-lived continuation for invitation_id (server authoritative). */
export async function resumeInviteContinuation(continuationId: string, bearer?: string) {
  return request<{
    invitation_id: string;
    continuation_id?: string;
    inviter_display_name?: string;
    message?: string;
    requires_acceptance?: boolean;
  }>("/api/v1/product/invitations/continue", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({ continuation_id: continuationId }),
  });
}

export async function listIncoming(bearer?: string) {
  return request<{ invitations: { id: string; status: string }[] }>(
    "/api/v1/product/invitations/incoming",
    { bearer: resolveBearer(bearer) },
  );
}

export async function acceptInvitation(
  id: string,
  bearer?: string,
  continuationId?: string | null,
) {
  return request<{
    establishment: { conversation_id: string; relationship_id: string };
  }>(`/api/v1/product/invitations/${id}/accept`, {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(
      continuationId ? { continuation_id: continuationId } : {},
    ),
  });
}

export async function getMessagingPreferences(bearer?: string) {
  return request<MessagingPreferences>("/api/v1/product/preferences/messaging", {
    bearer: resolveBearer(bearer),
  });
}

export async function updateMessagingPreferences(
  patch: Partial<MessagingPreferences>,
  bearer?: string,
) {
  return request<MessagingPreferences>("/api/v1/product/preferences/messaging", {
    method: "PATCH",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(patch),
  });
}

export async function setConversationMuted(
  conversationId: string,
  muted: boolean,
  bearer?: string,
) {
  return request<{ conversation_id: string; notifications_muted: boolean }>(
    `/api/v1/product/conversations/${conversationId}/notifications`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({ muted }),
    },
  );
}

export async function listConversations(bearer?: string) {
  return request<{ conversations: ConversationSummary[]; signals: ProductSignal[] }>(
    "/api/v1/product/conversations",
    { bearer: resolveBearer(bearer) },
  );
}

/**
 * P0-05.1 — Founder-review opt-in only.
 * Provisions Direct + Group through the EXISTING Messages owner (server).
 * Never call unless isFounderSeedEnabled() — production must stay empty of fixtures.
 */
export async function ensureFounderCommunicationSeed(bearer?: string) {
  return request<{
    ok: boolean;
    viewer_user_id: string;
    direct: {
      conversation_id: string;
      peer_user_id: string;
      peer_display_name: string;
      origin: string;
    };
    group: {
      conversation_id: string;
      label: string;
      member_ids: string[];
      origin: string;
    };
    peers: Record<string, { id: string; display_name: string; handle: string }>;
    parallel_chat_owner: boolean;
  }>("/api/v1/product/dev/founder-communication-seed", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({ explicit_opt_in: true }),
  });
}

/**
 * P0-05.7 — Founder-review opt-in only.
 * Provisions SharedPlan + PlanParticipant for Home Graph commitment states.
 * Never call unless isFounderSeedEnabled() — PRODUCTION_FIXTURE_LEAK = 0.
 */
export async function ensureFounderGraphCommitmentSeed(bearer?: string) {
  return request<{
    ok: boolean;
    viewer_user_id: string;
    card_id: string;
    conversation_id: string;
    shared_plan_id: string;
    title: string;
    location: string;
    time_label: string;
    lock_in_label: string;
    status: string;
    viewer_response_state: string;
    going_count: number;
    interested_count: number;
    commitment_phase: boolean;
    journey_available: boolean;
    participation_phase: string;
    shared_plan_duplicated: boolean;
    reality_duplicated: boolean;
    parallel_graph_owner: boolean;
    production_fixture_leak: boolean;
  }>("/api/v1/product/dev/founder-graph-commitment-seed", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({ explicit_opt_in: true }),
  });
}

export type DurableChronologyMoment = ChronologicalMoment & {
  id?: string;
  detail?: string;
  durable?: boolean;
  privacy_class?: string;
  visibility?: string;
  inserted_at?: string;
  composition_snapshot?: Record<string, unknown>;
};

export async function listMessages(conversationId: string, bearer?: string) {
  return request<{
    messages: ProductMessage[];
    signals: ProductSignal[];
    chronology?: DurableChronologyMoment[];
    durable_chronology?: boolean;
  }>(`/api/v1/product/conversations/${conversationId}/messages`, {
    bearer: resolveBearer(bearer),
  });
}

export async function sendMessage(conversationId: string, body: string, bearer?: string) {
  return request<{ message: ProductMessage; signals: ProductSignal[] }>(
    `/api/v1/product/conversations/${conversationId}/messages`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({
        body,
        client_message_id: `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      }),
    },
  );
}

/** Slice #1 — durable read cursor for unread badges. */
export async function fetchConversationAlignment(conversationId: string, bearer?: string) {
  return request<{ alignment: Record<string, unknown> }>(
    `/api/v1/product/conversations/${encodeURIComponent(conversationId)}/alignment`,
    { bearer: resolveBearer(bearer), method: "GET" },
  );
}

export async function setConversationActivity(
  conversationId: string,
  activity: string,
  bearer?: string,
) {
  return request<{ alignment: Record<string, unknown> }>(
    `/api/v1/product/conversations/${encodeURIComponent(conversationId)}/alignment/activity`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({ activity }),
    },
  );
}

export async function confirmConversationTime(conversationId: string, bearer?: string) {
  return request<{ alignment: Record<string, unknown> }>(
    `/api/v1/product/conversations/${encodeURIComponent(conversationId)}/alignment/confirm`,
    { method: "POST", bearer: resolveBearer(bearer), body: JSON.stringify({}) },
  );
}

export async function nominateConversationPlace(
  conversationId: string,
  name: string,
  bearer?: string,
) {
  return request<{ alignment: Record<string, unknown> }>(
    `/api/v1/product/conversations/${encodeURIComponent(conversationId)}/alignment/place`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({ name }),
    },
  );
}

export async function confirmConversationPlace(conversationId: string, bearer?: string) {
  return request<{ alignment: Record<string, unknown> }>(
    `/api/v1/product/conversations/${encodeURIComponent(conversationId)}/alignment/place/confirm`,
    { method: "POST", bearer: resolveBearer(bearer), body: JSON.stringify({}) },
  );
}

export async function declineConversationPlace(conversationId: string, bearer?: string) {
  return request<{ alignment: Record<string, unknown> }>(
    `/api/v1/product/conversations/${encodeURIComponent(conversationId)}/alignment/place/decline`,
    { method: "POST", bearer: resolveBearer(bearer), body: JSON.stringify({}) },
  );
}

export async function reopenConversationPlace(conversationId: string, bearer?: string) {
  return request<{ alignment: Record<string, unknown> }>(
    `/api/v1/product/conversations/${encodeURIComponent(conversationId)}/alignment/place/reopen`,
    { method: "POST", bearer: resolveBearer(bearer), body: JSON.stringify({}) },
  );
}

/** Phase 1C — pick people → ranked shortlist. Commits nothing. */
export type CurateRankedPlace = {
  id: string;
  display_name?: string;
  name?: string;
  cuisine?: string;
  quiet?: boolean;
  area_label?: string;
  shared_reasons?: string[];
  fit_hypothesis?: boolean;
  provenance?: string;
  score?: number;
};

export async function curateRecommendations(
  input: {
    user_ids: string[];
    activity?: string;
    what?: string;
    current_intent?: string;
    relationship_context?: string;
    hard_constraints?: Record<string, unknown>;
    limit?: number;
  },
  bearer?: string,
) {
  return request<{
    ranked: CurateRankedPlace[];
    limit: number;
    authority: string;
    commits_shared_plan: boolean;
    writes_durable_memory: boolean;
    privacy: string;
    group_fit_model: string;
    activity: string;
    candidate_source?: string;
  }>("/api/v1/product/recommendations/curate", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({
      user_ids: input.user_ids,
      activity: input.activity || input.what || "dinner",
      what: input.what || input.activity || "dinner",
      current_intent: input.current_intent,
      relationship_context: input.relationship_context || "friends",
      hard_constraints: input.hard_constraints || {},
      limit: input.limit ?? 3,
    }),
  });
}

export async function proposeDateTimeChange(
  conversationId: string,
  input: { text?: string; date?: string; time?: string; timezone?: string },
  bearer?: string,
) {
  return request<{ alignment: Record<string, unknown> }>(
    `/api/v1/product/conversations/${encodeURIComponent(conversationId)}/alignment/change/datetime`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({
        text: input.text || "",
        date: input.date || "",
        time: input.time || "",
        timezone: input.timezone || "America/Los_Angeles",
      }),
    },
  );
}

export async function proposeCommittedChange(
  conversationId: string,
  field: "exact_time" | "activity" | "place",
  value: string,
  bearer?: string,
) {
  return request<{ alignment: Record<string, unknown> }>(
    `/api/v1/product/conversations/${encodeURIComponent(conversationId)}/alignment/change`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({ field, value }),
    },
  );
}

export async function acceptCommittedChange(
  conversationId: string,
  proposalId?: string | null,
  bearer?: string,
) {
  return request<{ alignment: Record<string, unknown> }>(
    `/api/v1/product/conversations/${encodeURIComponent(conversationId)}/alignment/change/accept`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({ proposal_id: proposalId || null }),
    },
  );
}

export async function keepCommittedPlan(conversationId: string, bearer?: string) {
  return request<{ alignment: Record<string, unknown> }>(
    `/api/v1/product/conversations/${encodeURIComponent(conversationId)}/alignment/change/keep`,
    { method: "POST", bearer: resolveBearer(bearer), body: JSON.stringify({}) },
  );
}

/** Records shared authorization only. Does not call the reservation provider. */
export async function authorizeAlignmentReservation(conversationId: string, bearer?: string) {
  return request<{ alignment: Record<string, unknown> }>(
    `/api/v1/product/conversations/${encodeURIComponent(conversationId)}/alignment/reservation/authorize`,
    { method: "POST", bearer: resolveBearer(bearer), body: JSON.stringify({}) },
  );
}

export async function markConversationRead(
  conversationId: string,
  opts?: { serverSeq?: number; bearer?: string },
) {
  return request<{
    conversation_id: string;
    last_read_server_seq: number;
    unread_count: number;
  }>(`/api/v1/product/conversations/${encodeURIComponent(conversationId)}/read`, {
    method: "POST",
    bearer: resolveBearer(opts?.bearer),
    body: JSON.stringify(
      opts?.serverSeq != null ? { server_seq: opts.serverSeq } : {},
    ),
  });
}

/**
 * Resolve a phone to an existing Opal user id when discoverable.
 * Returns matched_user_id when the number belongs to another account
 * (already_connected | invitation_pending | invite_ready with owner).
 */
export async function resolveContactPhone(
  phone: string,
  opts?: { label?: string; bearer?: string },
) {
  return request<{
    resolution: {
      outcome?: string;
      matched_user_id?: string | null;
      invite_prompt?: string;
    };
    origin?: string;
  }>("/api/v1/product/contacts/resolve", {
    method: "POST",
    bearer: resolveBearer(opts?.bearer),
    body: JSON.stringify({
      phone: normalizePhoneInput(phone),
      label: opts?.label,
      idempotency_key: `cr-web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }),
  });
}

/**
 * P31-PATCH-01 — find or create a direct 1:1 conversation with peer.
 * Never returns a multi-party group. Idempotent when dyad already exists.
 */
export async function ensureDirectConversation(peerUserId: string, bearer?: string) {
  return request<{
    conversation_id: string;
    member_ids: string[];
    member_count: number;
    composition: string;
    origin: string;
    direct: boolean;
    shared_group_must_not_widen_dyadic_invitation?: boolean;
  }>("/api/v1/product/conversations/direct", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({ peer_user_id: peerUserId }),
  });
}

/** Multi-member conversation (3–8). Uses ConversationMember — not a dyad proxy. */
export async function createGroupConversation(
  memberUserIds: string[],
  opts?: { label?: string; bearer?: string },
) {
  return request<{
    conversation_id: string;
    member_ids: string[];
    member_count: number;
    composition: string;
  }>("/api/v1/product/conversations/group", {
    method: "POST",
    bearer: resolveBearer(opts?.bearer),
    body: JSON.stringify({
      member_user_ids: memberUserIds,
      label: opts?.label,
    }),
  });
}

export async function addConversationMember(
  conversationId: string,
  userId: string,
  bearer?: string,
) {
  return request<{
    conversation_id: string;
    member_ids: string[];
    member_count: number;
    origin: string;
    composition: string;
  }>(`/api/v1/product/conversations/${conversationId}/members`, {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function fetchSocketTicket(bearer?: string) {
  return request<{ ticket: string; expires_in: number }>(
    "/api/v1/product/socket-ticket",
    { method: "POST", bearer: resolveBearer(bearer), body: "{}" },
  );
}

/** Track A6.1 — Attention Center projection (AttentionAuthority → bell). */
export type AttentionCenterItem = {
  id: string;
  dedupe_key: string;
  section: "needs_you" | "waiting" | "updated" | string;
  level?: string;
  reason?: string | null;
  title: string;
  detail?: string | null;
  copy?: string | null;
  action_required?: boolean;
  badge_eligible?: boolean;
  seen?: boolean;
  status?: string;
  conversation_id?: string | null;
  plan_id?: string | null;
  deep_link?: {
    kind?: string | null;
    id?: string | null;
    conversation_id?: string | null;
    plan_id?: string | null;
    proposal_id?: string | null;
    source_id?: string | null;
    focus?: string | null;
    target_surface?: string | null;
    reason?: string | null;
  };
  source_type?: string | null;
  source_id?: string | null;
  privacy_safe?: boolean;
  muted?: boolean;
};

export type AttentionCenterFeed = {
  actionable_count: number;
  needs_you: AttentionCenterItem[];
  waiting: AttentionCenterItem[];
  updated: AttentionCenterItem[];
  empty_needs_you_copy?: string | null;
  empty_copy?: string | null;
  evaluated_at?: string;
  bell_bypasses_attention_authority?: boolean;
  bell_badge_equals_actionable_count?: boolean;
  chat_unread_separate?: boolean;
};

export async function fetchAttention(bearer?: string) {
  return request<AttentionCenterFeed>("/api/v1/product/attention", {
    bearer: resolveBearer(bearer),
  });
}

export async function ingestAttentionEvent(
  event: Record<string, unknown>,
  bearer?: string,
) {
  return request<AttentionCenterFeed>("/api/v1/product/attention/ingest", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({ event }),
  });
}

export async function resolveAttentionItem(id: string, bearer?: string) {
  return request<AttentionCenterFeed>("/api/v1/product/attention/resolve", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({ id }),
  });
}

export async function markAttentionSeen(ids?: string[], bearer?: string) {
  return request<AttentionCenterFeed>("/api/v1/product/attention/seen", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(ids ? { ids } : {}),
  });
}

/** R3-early — 1:1 call signaling (media via CallClient + STUN). */
export type ProductCall = {
  id: string;
  caller_user_id: string;
  callee_user_id: string;
  conversation_id?: string | null;
  status: string;
  ended_reason?: string | null;
  correlation_id?: string | null;
  ringing_at?: string | null;
  answered_at?: string | null;
  ended_at?: string | null;
};

export async function createCall(calleeUserId: string, bearer?: string) {
  return request<{ call: ProductCall }>("/api/v1/product/calls", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({ callee_user_id: calleeUserId }),
  });
}

/** 1:1 call from an open conversation. The server chooses the other member. */
export async function createConversationCall(conversationId: string, bearer?: string) {
  return request<{ call: ProductCall }>("/api/v1/product/calls", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({
      conversation_id: conversationId,
      idempotency_key:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `call-${Date.now()}`,
    }),
  });
}

export type ProductCallHistory = {
  id: string;
  conversation_id?: string | null;
  direction: "incoming" | "outgoing" | string;
  peer_user_id?: string | null;
  peer_name: string;
  status: string;
  ended_reason?: string | null;
  history_label: string;
  missed?: boolean;
  created_at?: string | null;
  media_connected_at?: string | null;
  ended_at?: string | null;
};

export async function listCalls(bearer?: string) {
  return request<{ calls: ProductCallHistory[] }>("/api/v1/product/calls", {
    bearer: resolveBearer(bearer),
  });
}

export async function reportCallConnected(callId: string, bearer?: string) {
  return request<{ call: ProductCall }>(
    `/api/v1/product/calls/${encodeURIComponent(callId)}/connected`,
    { method: "POST", bearer: resolveBearer(bearer), body: "{}" },
  );
}

export async function getCall(callId: string, bearer?: string) {
  return request<{ call: ProductCall }>(`/api/v1/product/calls/${encodeURIComponent(callId)}`, {
    method: "GET",
    bearer: resolveBearer(bearer),
  });
}

export async function answerCall(callId: string, bearer?: string) {
  return request<{ call: ProductCall }>(
    `/api/v1/product/calls/${encodeURIComponent(callId)}/answer`,
    { method: "POST", bearer: resolveBearer(bearer), body: "{}" },
  );
}

export async function declineCall(callId: string, bearer?: string) {
  return request<{ call: ProductCall }>(
    `/api/v1/product/calls/${encodeURIComponent(callId)}/decline`,
    { method: "POST", bearer: resolveBearer(bearer), body: "{}" },
  );
}

export type CallAssistState = "off" | "waiting_for_other" | "active";

export type CallAssistView = {
  assist: CallAssistState;
  account_default: boolean | null;
  self_allowed: boolean;
  self_paused: boolean;
};

export async function getCallAssist(callId: string, bearer?: string) {
  return request<CallAssistView>(
    `/api/v1/product/calls/${encodeURIComponent(callId)}/assist`,
    { bearer: resolveBearer(bearer) },
  );
}

export async function setCallAssist(
  callId: string,
  allowed: boolean,
  bearer?: string,
  scope: "call" | "account" = "call",
) {
  return request<CallAssistView>(
    `/api/v1/product/calls/${encodeURIComponent(callId)}/assist`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({ allowed, scope }),
    },
  );
}

export async function getAssistPreference(bearer?: string) {
  return request<{ assist_calls_enabled: boolean | null }>("/api/v1/product/preferences/assist", {
    bearer: resolveBearer(bearer),
  });
}

export async function updateAssistPreference(enabled: boolean, bearer?: string) {
  return request<{ assist_calls_enabled: boolean | null }>(
    "/api/v1/product/preferences/assist",
    {
      method: "PATCH",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({ assist_calls_enabled: enabled }),
    },
  );
}

export async function grantCallTranscription(callId: string, bearer?: string) {
  return request<{ access_token: string; expires_in: number }>(
    `/api/v1/product/calls/${encodeURIComponent(callId)}/transcription/grant`,
    { method: "POST", bearer: resolveBearer(bearer), body: "{}" },
  );
}

export async function postCallTranscript(
  callId: string,
  body: {
    text: string;
    final: boolean;
    provider_segment_id: string;
    confidence?: number | null;
    language?: string | null;
  },
  bearer?: string,
) {
  return request<{ persisted: boolean; folded: boolean; segment_id?: string | null }>(
    `/api/v1/product/calls/${encodeURIComponent(callId)}/transcripts`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({ ...body, provider: "deepgram" }),
    },
  );
}

export async function hangupCall(callId: string, reason = "hangup", bearer?: string) {
  return request<{ call: ProductCall }>(
    `/api/v1/product/calls/${encodeURIComponent(callId)}/hangup`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({ reason }),
    },
  );
}

/** Pass 27 — thin durable FollowGraph (FOLLOW ≠ FRIEND). */
export async function followUser(creatorUserId: string, bearer?: string) {
  return request<{
    following: boolean;
    origin: string;
    creator_user_id: string;
    follower_user_id: string;
    grants_friend_visibility: boolean;
    follow_is_not_friend: boolean;
    permission_matrix: Record<string, boolean>;
  }>("/api/v1/product/follows", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({ creator_user_id: creatorUserId }),
  });
}

export async function unfollowUser(creatorUserId: string, bearer?: string) {
  return request<{ following: boolean; status: string }>(
    `/api/v1/product/follows/${encodeURIComponent(creatorUserId)}`,
    { method: "DELETE", bearer: resolveBearer(bearer) },
  );
}

export async function followStatus(creatorUserId: string, bearer?: string) {
  return request<{
    following: boolean;
    creator_user_id: string;
    grants_friend_visibility: boolean;
    is_friend_via_relationship_graph: boolean;
    follow_is_not_friend: boolean;
  }>(
    `/api/v1/product/follows/status?creator_user_id=${encodeURIComponent(creatorUserId)}`,
    { bearer: resolveBearer(bearer) },
  );
}

export async function listFollowing(bearer?: string) {
  return request<{
    following_user_ids: string[];
    count: number;
    no_synchronous_fanout: boolean;
  }>("/api/v1/product/follows", { bearer: resolveBearer(bearer) });
}

/** Phase 2: conversation-scoped experience opportunity (durable). */
export type ProductOpportunityPayload = Record<string, unknown> & {
  quiet?: boolean;
  kind?: string;
  conversation_id?: string;
  opportunity_id?: string;
  headline?: string;
  primary_option?: string;
  supporting_explanation?: string;
  see_why?: string;
  journey_state?: string;
  participation_summary?: string | null;
  not_a_chat_participant?: boolean;
  expires_at?: string | null;
  status?: string | null;
};

export async function getConversationOpportunity(
  conversationId: string,
  bearer?: string,
) {
  return request<{ opportunity: ProductOpportunityPayload }>(
    `/api/v1/product/conversations/${conversationId}/opportunity`,
    { bearer: resolveBearer(bearer) },
  );
}

export async function evaluateConversationOpportunity(
  conversationId: string,
  body: Record<string, unknown> = {},
  bearer?: string,
) {
  return request<{ opportunity: ProductOpportunityPayload; origin: string }>(
    `/api/v1/product/conversations/${conversationId}/opportunity/evaluate`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify(body),
    },
  );
}

export async function submitOpportunityParticipation(
  conversationId: string,
  action: string,
  privateReason?: string,
  bearer?: string,
) {
  return request<{ opportunity: ProductOpportunityPayload }>(
    `/api/v1/product/conversations/${conversationId}/opportunity/participation`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({
        action,
        private_reason: privateReason,
      }),
    },
  );
}

export async function submitOpportunityCorrection(
  conversationId: string,
  text: string,
  bearer?: string,
) {
  return request<{
    correction: Record<string, unknown>;
    opportunity: ProductOpportunityPayload;
  }>(`/api/v1/product/conversations/${conversationId}/opportunity/correction`, {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({ text }),
  });
}

export async function dismissConversationOpportunity(
  conversationId: string,
  reason = "not_this_time",
  bearer?: string,
) {
  return request<{ opportunity: ProductOpportunityPayload }>(
    `/api/v1/product/conversations/${conversationId}/opportunity/dismiss`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({ reason }),
    },
  );
}

/**
 * Additive availability alignment (Find a time).
 * Conversation-scoped share/overlap only — not a shell redesign or calendar app.
 */
export type AvailabilityWindowOwner = {
  id: string;
  start_at: string;
  end_at?: string | null;
  open_ended?: boolean;
  timezone: string;
  source: string;
  status: string;
  expires_at?: string | null;
};

export type AvailabilitySharedSafe = {
  schema_version?: string;
  share_id: string;
  conversation_id: string;
  owner_user_id?: string;
  display_start: string;
  display_end: string;
  timezone: string;
  shared_safe: true;
};

export type AvailabilityOverlap = {
  schema_version?: string;
  conversation_id?: string;
  overlaps: {
    display_start: string;
    display_end: string;
    timezone: string;
    shared_safe: true;
  }[];
  label: string;
  no_private_schedule: true;
  overlap_status: string;
  participant_count?: number;
};

export async function listMyAvailabilityWindows(bearer?: string) {
  return request<{ windows: AvailabilityWindowOwner[]; private: true }>(
    "/api/v1/product/availability/windows",
    { bearer: resolveBearer(bearer) },
  );
}

export async function createAvailabilityWindow(
  body: {
    start_at: string;
    end_at?: string | null;
    open_ended?: boolean;
    timezone?: string;
  },
  bearer?: string,
) {
  return request<{ window: AvailabilityWindowOwner; private: true }>(
    "/api/v1/product/availability/windows",
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify(body),
    },
  );
}

export async function shareAvailabilityWindows(
  conversationId: string,
  windowIds: string[],
  bearer?: string,
) {
  return request<{
    shared: AvailabilitySharedSafe[];
    overlap: AvailabilityOverlap | null;
    private_schedule_hidden: true;
  }>(`/api/v1/product/conversations/${conversationId}/availability/share`, {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({ window_ids: windowIds }),
  });
}

export async function getAvailabilityOverlap(
  conversationId: string,
  bearer?: string,
) {
  return request<AvailabilityOverlap>(
    `/api/v1/product/conversations/${conversationId}/availability/overlap`,
    { bearer: resolveBearer(bearer) },
  );
}

/** Backend sufficiency decision — owner-private; never auto-shares or Sets. */
export type AvailabilityIntervention = {
  schema_version?: string;
  decision:
    | "enough_to_compute"
    | "needs_permission"
    | "needs_confirmation"
    | "needs_input"
    | "no_useful_intervention"
    | string;
  private: true;
  authorizes_set: false;
  overlap: AvailabilityOverlap | null;
  private_copy: string | null;
  action_label: string | null;
  suggested_window_ids: string[];
  preview_overlaps: {
    display_start: string;
    display_end: string;
    timezone: string;
    shared_safe: true;
  }[];
};

export async function getAvailabilityIntervention(
  conversationId: string,
  bearer?: string,
) {
  return request<AvailabilityIntervention>(
    `/api/v1/product/conversations/${conversationId}/availability/intervention`,
    { bearer: resolveBearer(bearer) },
  );
}

export async function listSharedAvailability(
  conversationId: string,
  bearer?: string,
) {
  return request<{ shared: AvailabilitySharedSafe[]; private_schedule_hidden: true }>(
    `/api/v1/product/conversations/${conversationId}/availability/shared`,
    { bearer: resolveBearer(bearer) },
  );
}

export async function updateAvailabilityWindow(
  windowId: string,
  body: { start_at?: string; end_at?: string; timezone?: string },
  bearer?: string,
) {
  return request<{ window: AvailabilityWindowOwner; private: true }>(
    `/api/v1/product/availability/windows/${windowId}`,
    {
      method: "PATCH",
      bearer: resolveBearer(bearer),
      body: JSON.stringify(body),
    },
  );
}

export async function deleteAvailabilityWindow(windowId: string, bearer?: string) {
  return request<{ deleted: true }>(`/api/v1/product/availability/windows/${windowId}`, {
    method: "DELETE",
    bearer: resolveBearer(bearer),
  });
}

export async function revokeAvailabilityShare(
  conversationId: string,
  shareId: string,
  bearer?: string,
) {
  return request<{ revoked: true; share_id: string; origin?: string }>(
    `/api/v1/product/conversations/${conversationId}/availability/shares/${shareId}/revoke`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: "{}",
    },
  );
}

export async function listMyAvailabilityInConversation(
  conversationId: string,
  bearer?: string,
) {
  return request<{
    shares: { share_id: string; window: AvailabilityWindowOwner }[];
    private: true;
  }>(`/api/v1/product/conversations/${conversationId}/availability/mine`, {
    bearer: resolveBearer(bearer),
  });
}

// --- Pass 19–20 reservation execution (synthetic; LIVE NOT CLAIMED) ---

export type ReservationAvailabilityResponse = {
  available: boolean;
  status?: string;
  place_display_name?: string;
  party_size?: number;
  slots: Array<{ slot_id: string; label: string }>;
  shared_safe_summary?: string;
  live_claimed: false;
  mode?: string;
  development_proof?: true;
  expires_at?: string;
  availability_id?: string;
};

export type ReservationExecutionPayload = {
  execution_id: string;
  status: string;
  place_display_name?: string;
  slot_label?: string;
  party_size?: number;
  shared_safe_summary?: string;
  booked?: boolean;
  live_claimed?: boolean;
  payment_status?: string;
  failure_reason?: string;
};

export async function reservationCapabilityStatus(bearer?: string) {
  return request<Record<string, unknown>>("/api/v1/product/reservations/status", {
    bearer: resolveBearer(bearer),
  });
}

export async function checkReservationAvailability(
  body: {
    provider_place_id: string;
    party_size?: number;
    slot_label?: string;
    when_label?: string;
    place_display_name?: string;
    scenario?: string;
  },
  bearer?: string,
) {
  return request<ReservationAvailabilityResponse>("/api/v1/product/reservations/availability", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(body),
  });
}

export async function authorizeReservation(
  body: {
    provider_place_id: string;
    place_display_name?: string;
    party_size?: number;
    slot_label?: string;
    slot_id?: string;
    reality_id?: string;
    explicit_confirm?: boolean;
  },
  bearer?: string,
) {
  return request<{
    authorization: Record<string, unknown>;
    human_copy: string;
    live_claimed: false;
  }>("/api/v1/product/reservations/authorize", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({ ...body, explicit_confirm: body.explicit_confirm !== false }),
  });
}

export async function requestReservation(
  body: Record<string, unknown>,
  bearer?: string,
) {
  return request<{
    execution?: ReservationExecutionPayload;
    shared_reality?: Record<string, unknown>;
    notification?: Record<string, unknown>;
    attribution?: Record<string, unknown>;
    idempotent?: boolean;
    status?: string;
    payment_status?: string;
    booked?: boolean;
    live_claimed?: boolean;
  }>("/api/v1/product/reservations", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(body),
  });
}

export async function getReservation(executionId: string, bearer?: string) {
  return request<{ execution: ReservationExecutionPayload; live_claimed: false }>(
    `/api/v1/product/reservations/${executionId}`,
    { bearer: resolveBearer(bearer) },
  );
}

export async function reconcileReservation(
  executionId: string,
  opts?: { force_status?: string; bearer?: string },
) {
  return request<{ execution: ReservationExecutionPayload }>(
    `/api/v1/product/reservations/${executionId}/reconcile`,
    {
      method: "POST",
      bearer: resolveBearer(opts?.bearer),
      body: JSON.stringify(opts?.force_status ? { force_status: opts.force_status } : {}),
    },
  );
}

export async function cancelReservation(executionId: string, bearer?: string) {
  return request<{ execution: ReservationExecutionPayload; shared_reality?: Record<string, unknown> }>(
    `/api/v1/product/reservations/${executionId}/cancel`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: "{}",
    },
  );
}

export async function checkReservationDrift(
  executionId: string,
  reality: { when?: string; where?: string; when_label?: string; place_display_name?: string },
  bearer?: string,
) {
  return request<Record<string, unknown>>(`/api/v1/product/reservations/${executionId}/drift`, {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({ reality }),
  });
}

/** Home production feed — SocialMoment projections (Memory). */
export async function fetchHomeFeed(
  opts?: { limit?: number; cursor?: string | null; bearer?: string },
) {
  const q = new URLSearchParams();
  if (opts?.limit) q.set("limit", String(opts.limit));
  if (opts?.cursor) q.set("cursor", opts.cursor);
  const qs = q.toString();
  return request<{
    mode: string;
    objects: Array<Record<string, unknown>>;
    stories: Array<Record<string, unknown>>;
    next_cursor?: string | null;
    has_more?: boolean;
    fixture_injected?: boolean;
    media_status?: Record<string, unknown>;
  }>(`/api/v1/product/home/feed${qs ? `?${qs}` : ""}`, {
    bearer: resolveBearer(opts?.bearer),
  });
}

export async function likeSocialMoment(momentId: string, bearer?: string) {
  return request<{
    viewer_liked: boolean;
    like_count: number;
    idempotent?: boolean;
  }>(`/api/v1/product/social-moments/${encodeURIComponent(momentId)}/like`, {
    method: "PUT",
    bearer: resolveBearer(bearer),
    body: "{}",
  });
}

export async function unlikeSocialMoment(momentId: string, bearer?: string) {
  return request<{ viewer_liked: boolean; like_count: number }>(
    `/api/v1/product/social-moments/${encodeURIComponent(momentId)}/like`,
    { method: "DELETE", bearer: resolveBearer(bearer) },
  );
}

export async function listSocialMomentComments(momentId: string, bearer?: string) {
  return request<{
    comments: Array<{
      id: string;
      content_id: string;
      author_user_id: string;
      author_name: string;
      body: string;
      created_at: string;
    }>;
    comment_count: number;
  }>(`/api/v1/product/social-moments/${encodeURIComponent(momentId)}/comments`, {
    bearer: resolveBearer(bearer),
  });
}

export async function addSocialMomentComment(
  momentId: string,
  body: string,
  bearer?: string,
) {
  return request<{
    comment: Record<string, unknown>;
    comment_count: number;
  }>(`/api/v1/product/social-moments/${encodeURIComponent(momentId)}/comments`, {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({ body }),
  });
}

export async function repostSocialMoment(momentId: string, bearer?: string) {
  return request<{ viewer_reposted: boolean; repost_count: number }>(
    `/api/v1/product/social-moments/${encodeURIComponent(momentId)}/repost`,
    { method: "PUT", bearer: resolveBearer(bearer), body: "{}" },
  );
}

export async function unrepostSocialMoment(momentId: string, bearer?: string) {
  return request<{ viewer_reposted: boolean; repost_count: number }>(
    `/api/v1/product/social-moments/${encodeURIComponent(momentId)}/repost`,
    { method: "DELETE", bearer: resolveBearer(bearer) },
  );
}

export async function saveSocialMoment(momentId: string, bearer?: string) {
  return request<{ viewer_saved: boolean }>(
    `/api/v1/product/social-moments/${encodeURIComponent(momentId)}/save`,
    { method: "PUT", bearer: resolveBearer(bearer), body: "{}" },
  );
}

export async function unsaveSocialMoment(momentId: string, bearer?: string) {
  return request<{ viewer_saved: boolean }>(
    `/api/v1/product/social-moments/${encodeURIComponent(momentId)}/save`,
    { method: "DELETE", bearer: resolveBearer(bearer) },
  );
}

export async function publishSocialMoment(
  attrs: {
    caption?: string;
    visibility?: string;
    media_ids?: string[];
    audience_user_ids?: string[];
  },
  bearer?: string,
) {
  return request<{ moment: Record<string, unknown> }>("/api/v1/product/social-moments", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(attrs),
  });
}

export async function createTemporaryStory(
  attrs: { media_ref: string; visibility?: string; caption?: string },
  bearer?: string,
) {
  return request<{ story: Record<string, unknown> }>("/api/v1/product/stories", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(attrs),
  });
}

export async function listTemporaryStories(bearer?: string) {
  return request<{ stories: Array<Record<string, unknown>> }>("/api/v1/product/stories", {
    bearer: resolveBearer(bearer),
  });
}

/** UUID-shaped SocialMoment ids use BEAM authority; seed-* remain fixture cache. */
export function isDurableMomentId(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

/** Graph → Journey (SharedPlan lineage). */
export async function activateJourney(
  attrs: {
    conversation_id: string;
    title?: string;
    location?: string;
    time_label?: string;
    start_at?: string;
    travel_minutes?: number;
    origin?: Record<string, unknown>;
  },
  bearer?: string,
) {
  return request<{ journey: Record<string, unknown> }>("/api/v1/product/journeys/activate", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(attrs),
  });
}

/**
 * I'm going — accept ONLY current PlanParticipant on existing SharedPlan.
 * Never activates Journey navigation. Never accept-all. Never fabricates plan.
 */
export async function acceptGoing(planId: string, bearer?: string) {
  return request<{
    plan_id: string;
    conversation_id: string;
    user_id: string;
    response_state: string;
    current_user_accepted: boolean;
    other_participants_unchanged: boolean;
    shared_plan_duplicated: boolean;
    reality_duplicated: boolean;
    forced_navigation: boolean;
    journey_available: boolean;
    going_count: number;
    interested_count: number;
    participation_phase: string;
    journey: Record<string, unknown> | null;
  }>(`/api/v1/product/journeys/${encodeURIComponent(planId)}/accept-going`, {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: "{}",
  });
}

export async function getJourney(planId: string, bearer?: string) {
  return request<{ journey: Record<string, unknown> }>(
    `/api/v1/product/journeys/${encodeURIComponent(planId)}`,
    { bearer: resolveBearer(bearer) },
  );
}

export async function journeyCantMakeIt(
  planId: string,
  opts?: { note?: string; bearer?: string },
) {
  return request<Record<string, unknown>>(
    `/api/v1/product/journeys/${encodeURIComponent(planId)}/cant-make-it`,
    {
      method: "POST",
      bearer: resolveBearer(opts?.bearer),
      body: JSON.stringify({ note: opts?.note }),
    },
  );
}

export async function journeyMaterialChange(
  planId: string,
  changes: { time_label?: string; location?: string; start_at?: string },
  bearer?: string,
) {
  return request<Record<string, unknown>>(
    `/api/v1/product/journeys/${encodeURIComponent(planId)}/material-change`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify(changes),
    },
  );
}

export async function journeyReconfirm(planId: string, bearer?: string) {
  return request<{ journey: Record<string, unknown> }>(
    `/api/v1/product/journeys/${encodeURIComponent(planId)}/reconfirm`,
    { method: "POST", bearer: resolveBearer(bearer), body: "{}" },
  );
}

export async function journeyAddPeople(
  planId: string,
  peerUserIds: string[],
  bearer?: string,
) {
  return request<Record<string, unknown>>(
    `/api/v1/product/journeys/${encodeURIComponent(planId)}/add-people`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({ peer_user_ids: peerUserIds }),
    },
  );
}

// --- P4.6 Decision Intelligence cold-start (Nearby now → DI + OSM) ---

export type DecisionResolveAnswer = {
  entity_id?: string | null;
  name?: string | null;
  area?: string | null;
};

export type DecisionResolvePayload = {
  decision_id: string;
  revision?: number;
  outcome: string;
  mode?: string;
  confidence_class?: string;
  result_id?: string | null;
  answer?: DecisionResolveAnswer | null;
  question?: {
    question_id?: string;
    dimension?: string;
    prompt?: string;
    choices?: Array<{ id?: string; label?: string }>;
  };
  tradeoff?: {
    conflict_id?: string;
    axis?: string;
    prompt?: string;
    option_a?: { id?: string; label?: string };
    option_b?: { id?: string; label?: string };
  };
  candidate_source?: string | null;
  real?: boolean;
  provisional?: boolean;
  figma?: { authority?: string; hue?: string };
  note?: string;
  actions?: Array<{ id?: string; label?: string; means?: string }>;
};

export async function resolveDecision(
  body: {
    intent?: string;
    lat?: number;
    lng?: number;
    area_label?: string;
    scope_type?: string;
    place_provider_mode?: string;
    budget_context?: Record<string, unknown>;
    time_context?: Record<string, unknown>;
    preference_context?: Record<string, unknown>;
    idempotency_key?: string;
  },
  bearer?: string,
) {
  return request<DecisionResolvePayload>("/api/v1/product/decisions/resolve", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(body),
  });
}

export async function answerDecisionQuestion(
  resultId: string,
  choiceId: string,
  bearer?: string,
) {
  return request<DecisionResolvePayload>(
    `/api/v1/product/decisions/${encodeURIComponent(resultId)}/answer_question`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({ choice_id: choiceId }),
    },
  );
}

export async function resolveDecisionTradeoff(
  resultId: string,
  selectedId: string,
  bearer?: string,
) {
  return request<DecisionResolvePayload>(
    `/api/v1/product/decisions/${encodeURIComponent(resultId)}/resolve_tradeoff`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({ selected_id: selectedId }),
    },
  );
}

export const loadSession = loadProfile;
export const saveSession = saveProfile;

// --- Phase 4D — trips (shared social adventure; not outing Journey) ---

export type TripParticipant = {
  user_id: string;
  role: string;
};

export type TripLeg = {
  id: string;
  trip_id: string;
  position: number;
  leg_type: "lodging" | "activity" | "transit" | "meal" | string;
  place_label: string;
  place_ref?: Record<string, unknown> | null;
  starts_on?: string | null;
  ends_on?: string | null;
  shared_plan_id?: string | null;
  notes?: string | null;
};

export type Trip = {
  id: string;
  title: string;
  destination_label?: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
  created_by_user_id: string;
  legs: TripLeg[];
  participants: TripParticipant[];
  inserted_at?: string;
  updated_at?: string;
};

export async function listTrips(bearer?: string) {
  return request<{ trips: Trip[] }>("/api/v1/product/trips", {
    bearer: resolveBearer(bearer),
  });
}

export async function getTrip(tripId: string, bearer?: string) {
  return request<{ trip: Trip }>(`/api/v1/product/trips/${encodeURIComponent(tripId)}`, {
    bearer: resolveBearer(bearer),
  });
}

export async function createTrip(
  attrs: {
    title: string;
    destination_label?: string;
    starts_on?: string;
    ends_on?: string;
    user_ids?: string[];
  },
  bearer?: string,
) {
  return request<{ trip: Trip }>("/api/v1/product/trips", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(attrs),
  });
}

export async function addTripLeg(
  tripId: string,
  attrs: {
    leg_type: string;
    place_label: string;
    starts_on?: string;
    ends_on?: string;
    notes?: string;
  },
  bearer?: string,
) {
  return request<{ leg: TripLeg }>(
    `/api/v1/product/trips/${encodeURIComponent(tripId)}/legs`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify(attrs),
    },
  );
}

/** Phase 4E/4F — spawn a tentative SharedPlan from a trip leg (no conversation). */
export type TripLegPlan = {
  id: string;
  title: string;
  status: string;
  source?: string;
  trip_leg_id?: string | null;
  conversation_id?: string | null;
  location?: string | null;
  created_by_user_id?: string;
};

export async function createPlanFromLeg(tripId: string, legId: string, bearer?: string) {
  return request<{
    plan: TripLegPlan;
    participants: Array<{ user_id: string; role: string; response_state: string }>;
    leg: TripLeg;
  }>(
    `/api/v1/product/trips/${encodeURIComponent(tripId)}/legs/${encodeURIComponent(legId)}/create-plan`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
    },
  );
}

/** Phase 1D — act-on-behalf consent proofs (calls / bookings / messaging registry). */
export type ConsentCapability =
  | "calls_outbound"
  | "bookings_reserve"
  | "messaging_business";

export type ConsentProof = {
  id: string;
  user_id?: string;
  capability: string;
  status: string;
  granted_at?: string | null;
  expires_at?: string | null;
  revoked_at?: string | null;
  conversation_id?: string | null;
  policy_version?: string;
};

export async function listConsents(bearer?: string) {
  return request<{ consents: ConsentProof[] }>("/api/v1/product/consents", {
    bearer: resolveBearer(bearer),
  });
}

export async function grantConsent(
  attrs: { capability: ConsentCapability | string; expires_at: string },
  bearer?: string,
) {
  return request<{ consent: ConsentProof }>("/api/v1/product/consents", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(attrs),
  });
}

export async function revokeConsent(proofId: string, bearer?: string) {
  return request<{ consent: ConsentProof }>(
    `/api/v1/product/consents/${encodeURIComponent(proofId)}`,
    {
      method: "DELETE",
      bearer: resolveBearer(bearer),
    },
  );
}
