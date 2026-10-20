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
  /** Refresh token — sessionStorage only; used for transparent access rotation. */
  refresh_token?: string;
  /** This boot was confirmed by the HttpOnly session cookie, without a bearer. */
  cookie_session?: boolean;
};

/**
 * Repair #18 DIR-1 - the ONE shared upcoming plan fact. Derived in
 * the service layer (NextPlan) from real plan records only: the
 * soonest upcoming plan the viewer shares with this conversation's
 * people (or, on a call row, with that peer). Surfaces render it
 * verbatim; they never re-derive shared / upcoming / next / state.
 * Absent (null) = no shared upcoming plan - no element renders.
 */
/**
 * Founder Polish, Cluster G (P10c) - the ONE leave-by derivation
 * (backend SocialFlow.LeaveBy), carried on the plan detail
 * projection and, when the thread path asks for it, on the
 * NextPlanFact. Every field is finished server side; surfaces
 * render verbatim and never recompute a time, a distance, or the
 * urgency. Absent states are named states ("needs_location_share",
 * "no_place_coordinates", "unavailable", ...) whose `label` is the
 * honest plain line to show; their number fields are null - a
 * fabricated time would be a defect. traffic_class is "estimate"
 * for a real route (the wired provider has no live traffic),
 * "unavailable" when routing failed, never invented "live".
 */
export type LeaveByProjection = {
  state: string;
  label: string;
  urgency?: "on_track" | "leave_now" | "started" | null;
  leave_by_at?: string | null;
  leave_by_label?: string | null;
  travel_duration_seconds?: number | null;
  travel_duration_label?: string | null;
  travel_distance_m?: number | null;
  travel_distance_label?: string | null;
  traffic_class?: "live" | "estimate" | "unavailable" | null;
  traffic_label?: string | null;
  buffer_seconds?: number | null;
  provider?: string | null;
  computed_at?: string | null;
};

export type NextPlanFact = {
  plan_id: string;
  title: string;
  /** Cluster G: present only on the thread fact (the backend opts
   *  the thread paths in); chats-list and call-log facts omit it. */
  leave_by?: LeaveByProjection | null;
  /** Finished when string from the service layer (never formatted here). */
  when_label?: string | null;
  starts_at?: string | null;
  where_label?: string | null;
  /** "physical" | "virtual" from the plan's one place projection. */
  where_kind?: string | null;
  /** Governed plan status (tentative / agreed / changed). */
  status: string;
  /** Indicator state family: forming | action | ready | happening. */
  state: string;
  conversation_id?: string | null;
};

/**
 * Repair #18 DIR-4 - one proactive reveal item, from the ONE backend
 * derivation (SocialFlow.Reveal). Category, kicker, state, timing,
 * and the lit flag are all decided server side; surfaces render
 * this verbatim and never re-derive any of it.
 */
/**
 * Polish Cluster A (P1) - the request-a-change lane on a P1 reveal
 * item, from the ONE backend derivation (SocialFlow.Reveal). Present
 * only when the viewer can propose a change to the plan through the
 * existing conversation change machinery AND a real alternative
 * time exists (another party's still-open shared availability
 * window). Absent (null) everywhere else - sender-fixed plans
 * (no conversation change path), no alternatives, a change already
 * on the table. Surfaces render it verbatim; they never re-derive
 * permission or alternatives.
 */
export type RevealChangeRequest = {
  label: string;
  conversation_id: string;
  alternatives: Array<{
    share_id?: string;
    owner_user_id?: string;
    display_start?: string | null;
    display_end?: string | null;
    open_ended?: boolean;
    timezone?: string;
  }>;
  scope_person_id: string;
  scope_person_name: string;
};

export type RevealItem = {
  reveal_key: string;
  category: "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7" | string;
  kicker: string;
  title: string;
  substance?: string | null;
  plan_id?: string | null;
  conversation_id?: string | null;
  source_ref_id?: string | null;
  /** Indicator state family for plan items, or null (P5/P6/P7). */
  plan_state?: string | null;
  /** DIR-1 entity tint (1-6) for the plan's other person, or null. */
  entity_tint?: number | null;
  action_label?: string | null;
  missing_slot?: string | null;
  /** Polish Cluster A (P1): the request-a-change lane, or null. */
  change_request?: RevealChangeRequest | null;
  /** Exactly one item per feed carries the fire (QUIET ceiling). */
  lit: boolean;
};

export type RevealFeed = {
  items: RevealItem[];
  deck: {
    needs_you: RevealItem[];
    next_together: RevealItem[];
    coming_up: RevealItem[];
    taking_shape: RevealItem[];
    report_line: RevealItem | null;
  };
};

export async function listReveals(bearer?: string, conversationId?: string) {
  const qs = conversationId ? `?conversation_id=${encodeURIComponent(conversationId)}` : "";
  return request<RevealFeed>(`/api/v1/product/reveals${qs}`, {
    bearer: resolveBearer(bearer),
  });
}

export async function dismissReveal(revealKey: string, bearer?: string) {
  return request<RevealFeed>("/api/v1/product/reveals/dismiss", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({ reveal_key: revealKey }),
  });
}

export type ConversationSummary = {
  id: string;
  title: string;
  preview: string;
  updated_at: string;
  peers: { id: string; display_name: string; handle: string; entity_tint?: number | null }[];
  /** DIR-1: this conversation entity's stable tint (the peer's tint
   *  for a dyad; a stable conversation tint for a group). */
  entity_tint?: number | null;
  /** DIR-1: the shared upcoming plan fact, or null. */
  next_plan?: NextPlanFact | null;
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
    /** Repair #18 - attendance contract fields (present only when the
     * backend counter has participant rows; absence is honest). */
    going_count?: number | null;
    interested_count?: number | null;
    total_count?: number | null;
    viewer_state?: string | null;
    /** Repair #18 - F18-03 conflict object, or null when no overlap. */
    conflict?: PlanConflictContract;
  } | null;
};

export type MessagingPreferences = {
  read_receipts_enabled: boolean;
  message_notifications_enabled: boolean;
  /** Repair #18 / audit A2 — Quiet master switch. */
  notifications_paused?: boolean;
};

/** Audit spec 4.A5 — one support intake submission, as the reporter sees it. */
export type SupportReportContract = {
  reference: string;
  kind: string;
  category: string;
  entry_point?: string;
  status: string;
  submitted_at?: string;
};

export async function submitSupportReport(
  input: {
    kind: "problem" | "feedback";
    category: string;
    body: string;
    build_ref?: string | null;
    /** Spec 4.C7 — which surface the report started from. The intake
     * and payload are identical from every entry point. */
    entry_point?: string;
    /** Repair #18 hardening — the client's retry key. A repeat
     * submit under the same key returns the original report
     * instead of filing a duplicate. */
    idempotency_key?: string;
  },
  bearer?: string,
): Promise<SupportReportContract> {
  const response = await request<{ report: SupportReportContract }>(
    "/api/v1/product/support/reports",
    {
      bearer: resolveBearer(bearer),
      method: "POST",
      body: JSON.stringify({
        kind: input.kind,
        category: input.category,
        body: input.body,
        build_ref: input.build_ref ?? undefined,
        entry_point: input.entry_point ?? "you_help",
        idempotency_key: input.idempotency_key ?? undefined,
      }),
    },
  );
  return response.report;
}

/* ------------------------------------------------------------------ */
/* Adoption wave 2 — account/settings cluster (4.C2/4.C3/4.C4/4.C6,   */
/* SF-A). Every payload below is the server's own contract; saved     */
/* logins carry hosts only — no value ever crosses this client.        */
/* ------------------------------------------------------------------ */

export type DeviceContract = {
  id: string;
  device_label: string;
  status: string;
  platform: string;
  last_seen_at: string | null;
  is_current?: boolean;
};

export async function getDeviceRoster(bearer?: string): Promise<DeviceContract[]> {
  const response = await request<{ devices: DeviceContract[] }>(
    "/api/v1/product/settings/devices",
    { bearer: resolveBearer(bearer), method: "GET" },
  );
  return response.devices;
}

export async function revokeDevice(sessionId: string, bearer?: string): Promise<void> {
  await request(
    `/api/v1/product/settings/devices/${encodeURIComponent(sessionId)}/revoke`,
    { bearer: resolveBearer(bearer), method: "POST", body: JSON.stringify({}) },
  );
}

export type SavedLoginContract = { id: string; host: string; saved_at?: string };

export async function getSavedLogins(bearer?: string): Promise<SavedLoginContract[]> {
  const response = await request<{ saved_logins: SavedLoginContract[] }>(
    "/api/v1/product/settings/saved-logins",
    { bearer: resolveBearer(bearer), method: "GET" },
  );
  return response.saved_logins;
}

export async function addSavedLogin(
  host: string,
  secret: string,
  bearer?: string,
): Promise<SavedLoginContract> {
  const response = await request<{ saved_login: SavedLoginContract }>(
    "/api/v1/product/settings/saved-logins",
    {
      bearer: resolveBearer(bearer),
      method: "POST",
      body: JSON.stringify({ host, secret }),
    },
  );
  return response.saved_login;
}

export async function removeSavedLogin(id: string, bearer?: string): Promise<void> {
  await request(`/api/v1/product/settings/saved-logins/${encodeURIComponent(id)}`, {
    bearer: resolveBearer(bearer),
    method: "DELETE",
  });
}

export type PersonalInviteCodeContract = {
  personal_code: { code: string; share_url: string; joined_count: number; promise: string };
  joined_through: { credit_line: string; inviter_display_name?: string } | null;
  joined_through_you: Array<{ credit_line: string; redeemer_display_name?: string }>;
};

export async function getPersonalInviteCode(
  bearer?: string,
): Promise<PersonalInviteCodeContract> {
  return request<PersonalInviteCodeContract>("/api/v1/product/invites/personal-code", {
    bearer: resolveBearer(bearer),
    method: "GET",
  });
}

export async function redeemPersonalInviteCode(
  code: string,
  bearer?: string,
): Promise<{ credit_line: string }> {
  const response = await request<{ credit: { credit_line: string } }>(
    "/api/v1/product/invites/redeem",
    {
      bearer: resolveBearer(bearer),
      method: "POST",
      body: JSON.stringify({ code }),
    },
  );
  return response.credit;
}

export type IngestionSourceLine = {
  source: string;
  title: string;
  state: string;
  state_label: string;
  progress: string;
  error: string | null;
  retryable: boolean;
};

export async function getIngestionStatus(bearer?: string): Promise<IngestionSourceLine[]> {
  const response = await request<{ sources: IngestionSourceLine[] }>(
    "/api/v1/product/settings/hears",
    { bearer: resolveBearer(bearer), method: "GET" },
  );
  return response.sources;
}

export async function retryIngestionSource(
  source: string,
  bearer?: string,
): Promise<IngestionSourceLine> {
  const response = await request<{ source_line: IngestionSourceLine }>(
    "/api/v1/product/settings/hears/retry",
    {
      bearer: resolveBearer(bearer),
      method: "POST",
      body: JSON.stringify({ source }),
    },
  );
  return response.source_line;
}

export type DeletionReceiptContract = {
  reference: string;
  mode: string;
  source: string;
  summary: Record<string, number | boolean>;
  completed_at?: string;
};

export async function executeDeletion(
  mode: "data" | "account",
  via: "self_serve" | "support",
  bearer?: string,
): Promise<DeletionReceiptContract> {
  const path =
    via === "support"
      ? "/api/v1/product/support/account-deletion"
      : "/api/v1/product/settings/delete";
  const response = await request<{ receipt: DeletionReceiptContract }>(path, {
    bearer: resolveBearer(bearer),
    method: "POST",
    body: JSON.stringify({ mode, confirm: true }),
  });
  return response.receipt;
}

export async function getSupportReport(
  reference: string,
  bearer?: string,
): Promise<SupportReportContract> {
  const response = await request<{ report: SupportReportContract }>(
    `/api/v1/product/support/reports/${encodeURIComponent(reference)}`,
    { bearer: resolveBearer(bearer), method: "GET" },
  );
  return response.report;
}

export type ProductMessage = {
  id: string;
  body: string;
  sender_user_id: string;
  server_seq: number;
  created_at: string;
  client_message_id: string;
  conversation_id?: string;
  message_type?: string;
  audio_url?: string | null;
  duration_ms?: number | null;
  transcription_confidence?: number | null;
  transcription_stub?: boolean;
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
export const BROWSER_REFRESH_KEY = "opal.product.browser_refresh.v1";

/** Memory-only bearer for the current tab (hosted cross-origin). */
let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export function setMemoryAccessToken(token: string | null | undefined): void {
  memoryAccessToken = token && token.length > 0 ? token : null;
}

export function getMemoryAccessToken(): string | null {
  return memoryAccessToken;
}

export function setMemoryRefreshToken(token: string | null | undefined): void {
  memoryRefreshToken = token && token.length > 0 ? token : null;
}

export function getMemoryRefreshToken(): string | null {
  return memoryRefreshToken;
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

export function saveBrowserRefreshToken(token: string | null | undefined): void {
  setMemoryRefreshToken(token);
  try {
    if (!token) sessionStorage.removeItem(BROWSER_REFRESH_KEY);
    else sessionStorage.setItem(BROWSER_REFRESH_KEY, token);
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

export function loadBrowserRefreshToken(): string | null {
  const memory = getMemoryRefreshToken();
  if (memory) return memory;
  try {
    const stored = sessionStorage.getItem(BROWSER_REFRESH_KEY);
    if (stored) {
      setMemoryRefreshToken(stored);
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
      saveBrowserRefreshToken(null);
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
    if (session.refresh_token) saveBrowserRefreshToken(session.refresh_token);
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

async function tryRefreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refresh = loadBrowserRefreshToken();
    if (!refresh) return false;
    try {
      const { apiBase } = runtimeConfig();
      const res = await fetch(`${apiBase}/api/v1/product/session/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ refresh_token: refresh }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.access_token) return false;
      saveBrowserAccessToken(data.access_token);
      if (data.refresh_token) saveBrowserRefreshToken(data.refresh_token);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function request<T>(
  path: string,
  opts: RequestInit & { bearer?: string; csrf?: boolean; _retried?: boolean } = {},
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

  if (
    !res.ok &&
    res.status === 401 &&
    !opts._retried &&
    path !== "/api/v1/product/session/refresh" &&
    (data.error_code === "token_expired" || data.error_code === "session_mismatch")
  ) {
    const refreshed = await tryRefreshAccessToken();
    if (refreshed) {
      return request<T>(path, { ...opts, bearer: undefined, _retried: true });
    }
  }

  if (!res.ok) {
    const err = new Error(
      humanError(data.error_code, data.message || res.statusText),
    ) as Error & {
      code?: string;
      status?: number;
      sent?: boolean;
      retryable?: boolean;
      clientAction?: string;
      serverMessage?: string;
      errors?: Record<string, string[]>;
    };
    err.code = data.error_code;
    err.status = res.status;
    // Repair #18 - carry the backend's per-field validation errors
    // (the 422 shape: errors: { title: ["can't be blank"] }) so callers
    // can show the server's own message inline instead of inventing one.
    if (data.errors && typeof data.errors === "object" && !Array.isArray(data.errors)) {
      err.errors = data.errors as Record<string, string[]>;
    }
    // Repair #18 (A-web) - carry the backend's explicit send outcome
    // (the throttle shape: sent:false, retryable:true,
    // client_action:"retry_send") so callers can distinguish a
    // not-sent send from a generic failure instead of guessing.
    if (typeof data.sent === "boolean") err.sent = data.sent;
    if (typeof data.retryable === "boolean") err.retryable = data.retryable;
    if (typeof data.client_action === "string") err.clientAction = data.client_action;
    if (typeof data.message === "string") err.serverMessage = data.message;
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
    case "not_found":
      return "Nothing yet. When your people move, you'll see it here.";
    default: {
      // Never paint HTTP "Not Found" / raw not-found into product UI.
      if (/not\s*found/i.test(fallback || "")) {
        return "Nothing yet. When your people move, you'll see it here.";
      }
      return fallback || "Something went wrong. Try again.";
    }
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
  /** Phase NE-1 product invite code from `?invite=CODE` join funnel. */
  invite?: string;
  inviteCode?: string;
}) {
  // Always request bearer for browser bootstrap. Cookies alone fail across GitHub Pages → Render.
  // Re-submit phone so production Verify can check without reversing digests; server binds to challenge.
  const inviteCode =
    (input.invite || input.inviteCode || readStoredProductInviteCode() || "").trim() ||
    undefined;

  const data = await request<{
    session: {
      access_token?: string;
      refresh_token?: string;
      session_id: string;
      user_id: string;
    };
    user: { id: string; display_name: string; handle: string };
    csrf_token?: string;
    provider: string;
    invite_joined?: boolean;
    welcome_message?: string;
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
      ...(inviteCode
        ? { invite: inviteCode, invite_code: inviteCode }
        : {}),
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

  if (data.invite_joined) {
    clearStoredProductInviteCode();
  }

  const session: ProductSession = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user_id: data.user.id,
    display_name: data.user.display_name,
    handle: data.user.handle,
    session_id: data.session.session_id,
  };
  setMemoryAccessToken(session.access_token);
  setMemoryRefreshToken(session.refresh_token);
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
    setMemoryRefreshToken(null);
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
    /** All founder directs (Chanelle/Maya/Sabrina/Alex) for physical remap. */
    directs?: Record<
      string,
      {
        conversation_id: string;
        peer_user_id: string;
        peer_display_name: string;
        origin: string;
      }
    >;
    group: {
      conversation_id: string;
      label: string;
      member_ids: string[];
      origin: string;
    };
    peers: Record<string, { id: string; display_name: string; handle: string }>;
    parallel_chat_owner: boolean;
    founder_phone_chat_rows?: number;
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
    /** DIR-1: the thread's shared upcoming plan fact, or null. */
    next_plan?: NextPlanFact | null;
  }>(`/api/v1/product/conversations/${conversationId}/messages`, {
    bearer: resolveBearer(bearer),
  });
}

/**
 * Repair #18 (W4-01) — idempotency keys for human-thread sends.
 *
 * Walk #4: the founder pressed send repeatedly and every press
 * became a new stored message (5 sends, 4+ identical bubbles), because
 * the client minted a FRESH random client_message_id per HTTP call,
 * so the server's (conversation, key) dedupe could never fire.
 *
 * The key is now minted ONCE per composed message — one slot per
 * (conversation, body) — and reused by every delivery attempt of
 * that same composed message: double-taps while the first attempt
 * is still in flight, and tap-to-retry after a failure, all carry
 * the same key, so the server stores the message exactly once. The
 * slot is released when a delivery SUCCEEDS (a later, genuinely new
 * send of the same words is a new message with a new key) and kept
 * when a delivery FAILS, so the honest retry reuses it.
 */
const pendingSendKeys = new Map<string, string>();

function sendKeySlot(conversationId: string, body: string) {
  return `${conversationId}\n${body}`;
}

export function pendingSendKey(conversationId: string, body: string): string {
  const slot = sendKeySlot(conversationId, body);
  let key = pendingSendKeys.get(slot);
  if (!key) {
    key =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? `web-${crypto.randomUUID()}`
        : `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    pendingSendKeys.set(slot, key);
  }
  return key;
}

export function settleSendKey(conversationId: string, body: string, delivered: boolean) {
  if (delivered) {
    pendingSendKeys.delete(sendKeySlot(conversationId, body));
  }
}

export async function sendMessage(conversationId: string, body: string, bearer?: string) {
  const clientMessageId = pendingSendKey(conversationId, body);
  try {
    const res = await request<{ message: ProductMessage; signals: ProductSignal[] }>(
      `/api/v1/product/conversations/${conversationId}/messages`,
      {
        method: "POST",
        bearer: resolveBearer(bearer),
        body: JSON.stringify({
          body,
          client_message_id: clientMessageId,
        }),
      },
    );
    settleSendKey(conversationId, body, true);
    return res;
  } catch (e) {
    // Keep the slot: a retry of this same composed message must
    // reuse the same key so the server can dedupe it.
    settleSendKey(conversationId, body, false);
    throw e;
  }
}

/** Slice #1 — durable read cursor for unread badges. */

export async function sendVoiceMessage(
  conversationId: string,
  attrs: {
    audio_base64: string;
    content_type?: string;
    duration_ms?: number;
    client_message_id?: string;
    audio_url?: string;
  },
  bearer?: string,
) {
  return request<{
    message: ProductMessage;
    transcript: string;
    transcription_confidence: number;
    transcription_uncertain: boolean;
    stub: boolean;
    origin: string;
  }>(`/api/v1/product/conversations/${encodeURIComponent(conversationId)}/voice_messages`, {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(attrs),
  });
}


/** ST-C (wave 3): the owner's own moments archive - the same records
 *  the Home feed composes, scoped to the owner by the server. */
export async function fetchMomentsArchive(bearer?: string) {
  return request<{
    posts: Array<Record<string, unknown>>;
    stories: Array<Record<string, unknown>>;
    count: number;
  }>("/api/v1/product/social-moments/mine", { bearer: resolveBearer(bearer) });
}

/** ST-H (wave 3): send a voice note. Audio is stored server-side and
 *  the note plays back for every participant; transcript present only
 *  when the real transcription path produced one. */
export async function sendVoiceNote(
  conversationId: string,
  attrs: { audio_base64: string; content_type?: string; duration_ms?: number; client_message_id?: string },
  bearer?: string,
) {
  return request<{
    message: ProductMessage;
    transcript: string | null;
    transcription_state: string;
    origin: string;
  }>(`/api/v1/product/conversations/${encodeURIComponent(conversationId)}/voice_notes`, {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(attrs),
  });
}

/** ST-H: sender-only transcript correction. */
export async function correctVoiceNoteTranscript(
  conversationId: string,
  messageId: string,
  transcript: string,
  bearer?: string,
) {
  return request<{ message: ProductMessage; transcript: string }>(
    `/api/v1/product/conversations/${encodeURIComponent(conversationId)}/voice_notes/${encodeURIComponent(messageId)}/transcript`,
    { method: "PATCH", bearer: resolveBearer(bearer), body: JSON.stringify({ transcript }) },
  );
}

/** ST-I/ST-H provider truth: TTS + transcription configuration. */
export async function fetchVoiceStatus(bearer?: string) {
  return request<{ tts_configured: boolean; transcription_configured: boolean }>(
    "/api/v1/product/voice/status",
    { bearer: resolveBearer(bearer) },
  );
}

/** 4.C11 (wave 3): the owner's Made-by-Opal shelf. */
export type MyArtifact = {
  artifact_id: string;
  kind: string;
  title: string;
  subtitle?: string;
  share_url: string;
  expires_at?: string;
  outdated?: boolean;
};

export async function listMyArtifacts(bearer?: string) {
  return request<{ artifacts: MyArtifact[] }>("/api/v1/product/artifacts", {
    bearer: resolveBearer(bearer),
  });
}

export async function deleteMyArtifact(artifactId: string, bearer?: string) {
  return request<{ deleted: boolean }>(
    `/api/v1/product/artifacts/${encodeURIComponent(artifactId)}`,
    { method: "DELETE", bearer: resolveBearer(bearer) },
  );
}

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
  /** Reminder / temporal enrichment (Phase 6) — ReminderCard prefers these. */
  lifecycle?: "upcoming" | "day_of" | "passed_unplanned" | "planned" | string | null;
  person_id?: string | null;
  person_name?: string | null;
  anchor_type?: string | null;
  anchor_date?: string | null;
  days_until?: number | null;
  plan_status?: "none" | "planned" | string | null;
  plan_summary?: string | null;
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
  /** Cluster F (P10a): the live call's plan-in-context - the ONE
   *  DIR-1 NextPlan fact from the call projection, or null. */
  next_plan?: NextPlanFact | null;
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

/**
 * Repair #19 - the ONE call-state fact. Derived in the service layer
 * (Calls.CallState) from the call's own governed record, the row's
 * DIR-1 next_plan fact, and whether a later call with the same peer
 * connected. Surfaces render it as the row's ambient border and
 * never re-derive it from the raw row fields (MP-3). Present on
 * every real call row: "past" (settled) is a real state, not an
 * absence.
 */
export type CallStateFact = {
  /** Indicator family: forming | action | ready | happening | past. */
  state: string;
  /** missed_unresolved | call_live | plan_action | plan_forming |
   *  plan_ready | plan_happening | settled. */
  reason: string;
  /** Finished label from the service layer ("Call back", "Ready",
   *  "Settled", ...). */
  label: string;
};

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
  /** DIR-1: the shared upcoming plan fact for this peer, or null. */
  next_plan?: NextPlanFact | null;
  /** DIR-1: the peer's stable entity tint. */
  peer_tint?: number | null;
  /** Repair #19: the row's call-state fact (ambient border). */
  call_state?: CallStateFact | null;
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

/**
 * Repair #19 W12: the call's graphing state, derived once on the server
 * (OpalCore.Calls.Graphing) and carried verbatim in this projection and
 * in the call-channel "graphing" broadcast. Surfaces render it; they
 * never re-derive it.
 */
export type CallGraphingState = "graphing" | "paused" | "waiting_for_other" | "off";

export type CallAssistView = {
  assist: CallAssistState;
  graphing: CallGraphingState;
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


/** Phase X — home timezone (AssistancePreference). Timezone only; never GPS. */
export async function getHomeTimezone(bearer?: string) {
  return request<{
    home_timezone: string;
    effective_timezone: string;
    active: boolean;
    privacy: string;
  }>("/api/v1/product/travel/home_timezone", {
    bearer: resolveBearer(bearer),
  });
}

export async function updateHomeTimezone(timezone: string, bearer?: string) {
  return request<{
    home_timezone: string;
    effective_timezone: string;
    active: boolean;
    privacy: string;
  }>("/api/v1/product/travel/home_timezone", {
    method: "PATCH",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({ timezone }),
  });
}

/**
 * Phase X — timezone-only travel ingest.
 * City is optional and should be omitted unless location was granted.
 * Never send lat/lng — server rejects GPS with gps_forbidden.
 */
export async function ingestTravelTimezone(
  input: { timezone: string; city?: string; at?: string },
  bearer?: string,
) {
  const body: Record<string, string> = { timezone: input.timezone };
  if (input.city) body.city = input.city;
  if (input.at) body.at = input.at;
  return request<{
    ok: boolean;
    status: string;
    active: boolean;
    effective_timezone: string;
    home_timezone: string;
    privacy: string;
  }>("/api/v1/product/travel/ingest", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(body),
  });
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

export type TurnCredentialsResponse = {
  ice_servers: Array<{
    urls: string | string[];
    username?: string;
    credential?: string;
  }>;
  ttl?: number;
  source?: string;
  disabled?: boolean;
  error_code?: string;
  message?: string;
};

/**
 * Mint (or reuse cached) Twilio NTS ICE servers for this call.
 * On turn_disabled (503), returns { ice_servers: [], disabled: true } without throwing
 * so CallClient can fall back to STUN-only.
 */
export async function fetchTurnCredentials(callId: string, bearer?: string) {
  const path = `/api/v1/product/calls/${encodeURIComponent(callId)}/turn-credentials`;
  try {
    return await request<TurnCredentialsResponse>(path, {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: "{}",
    });
  } catch (err) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e?.status === 503 || e?.code === "turn_disabled") {
      return {
        ice_servers: [] as TurnCredentialsResponse["ice_servers"],
        disabled: true,
        ttl: 0,
        source: "disabled",
        message: e?.message || "TURN not configured",
      } satisfies TurnCredentialsResponse;
    }
    throw err;
  }
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

export async function listSaved(bearer?: string) {
  return request<{ saves: Record<string, unknown>[]; count: number }>(
    "/api/v1/product/saved",
    { method: "GET", bearer: resolveBearer(bearer) },
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

/**
 * N2 (founder polish wave) - manage your own moments. The backend
 * edit is owner-only (edit_own: caption + visibility, edited_at
 * stamped server-side); deletes are owner-only too, posts through
 * the moment record and stories through the story record. Nothing
 * here can touch another person's moment.
 */
export async function updateSocialMoment(
  momentId: string,
  attrs: { caption?: string; visibility?: string },
  bearer?: string,
) {
  return request<{ moment: Record<string, unknown> }>(
    `/api/v1/product/social-moments/${encodeURIComponent(momentId)}`,
    {
      method: "PATCH",
      bearer: resolveBearer(bearer),
      body: JSON.stringify(attrs),
    },
  );
}

export async function deleteSocialMoment(momentId: string, bearer?: string) {
  return request<Record<string, unknown>>(
    `/api/v1/product/social-moments/${encodeURIComponent(momentId)}`,
    { method: "DELETE", bearer: resolveBearer(bearer) },
  );
}

export async function deleteTemporaryStory(storyId: string, bearer?: string) {
  return request<{ deleted: boolean; story_id: string }>(
    `/api/v1/product/stories/${encodeURIComponent(storyId)}`,
    { method: "DELETE", bearer: resolveBearer(bearer) },
  );
}

/** Repair #15: media upload for posts — backend LOCAL_DEV store (Pass 17). */
export async function uploadSocialMomentMedia(
  attrs: { base64: string; mime_type: string },
  bearer?: string,
) {
  return request<{ media: Record<string, unknown> }>("/api/v1/product/social-moments/media", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(attrs),
  });
}

export async function createTemporaryStory(
  attrs: { media_ref?: string; media_id?: string; visibility?: string; caption?: string },
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

/** W8 Phase 2 — approved TTS (ElevenLabs Matilda when key present). */
export async function speakApprovedText(
  body: { text: string; approved: boolean; provider?: string },
  bearer?: string,
) {
  return request<{
    audio_url?: string;
    text?: string;
    provider?: string;
    content_type?: string;
    storage_key?: string;
  }>("/api/v1/product/voice/speak", {
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

/** Soft itinerary canvas — TripDay → TimeBlock → Activity + RSVP. */
export type TripActivityResponse = {
  id?: string;
  trip_activity_id?: string;
  user_id: string;
  state: "in" | "interested" | "passed" | string;
};

export type TripActivity = {
  id: string;
  trip_time_block_id?: string;
  position?: number;
  venue_name: string;
  venue_area?: string | null;
  activity_kind?: string;
  vibe_tags?: string[];
  notes?: string | null;
  trip_leg_id?: string | null;
  responses?: TripActivityResponse[];
  whos_in?: string[];
  interested?: string[];
  passed?: string[];
};

export type TripTimeBlock = {
  id: string;
  trip_day_id?: string;
  position: number;
  slot: string;
  time_label: string;
  block_kind: "activity" | "free" | "transit" | "meal" | string;
  title?: string | null;
  notes?: string | null;
  activities?: TripActivity[];
};

export type TripDay = {
  id: string;
  trip_id?: string;
  day_index: number;
  on_date?: string | null;
  label: string;
  notes?: string | null;
  time_blocks?: TripTimeBlock[];
};

export type Trip = {
  id: string;
  title: string;
  destination_label?: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
  created_by_user_id: string;
  legs: TripLeg[];
  days?: TripDay[];
  participants: TripParticipant[];
  inserted_at?: string;
  updated_at?: string;
};

export type TripVibeProfile = {
  user_id: string;
  sleep_bias?: string | null;
  energy_windows?: string[];
  interest_tags?: string[];
  evidence?: unknown;
};

export type TripConvoyMember = {
  user_id: string;
  sharing: boolean;
  place_label?: string | null;
  has_coords?: boolean;
  eta_note?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type TripConvoyRoster = {
  sharing: boolean;
  members: TripConvoyMember[];
  note?: string;
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
    /** Pack suggestion identity — cuisine/vibe/price only when present (9B). */
    place_ref?: Record<string, unknown> | null;
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

/** Phase 11A — tentative SharedPlan from a curated conversation place option. */
export async function createConversationPlan(
  conversationId: string,
  attrs: {
    title?: string;
    place?: string;
    option_label?: string;
    location?: string;
    area?: string;
    time_label?: string;
    /** Founder Polish G2 — a chosen candidate's own coordinates,
     *  when the caller holds them (gateway candidates carry lat/lon
     *  server-side; the web's place-sheet candidates hold only
     *  id/name/area, so current callers omit these and the server
     *  writer in ProviderAction.attach_selected_venue stamps the
     *  pair). Sent as a pair or not at all; the backend rejects a
     *  lone or out-of-range pair with 422 invalid_place_coordinates. */
    place_lat?: number;
    place_lon?: number;
  },
  bearer?: string,
) {
  return request<{
    plan: {
      id: string;
      conversation_id: string;
      title: string;
      status: string;
      location?: string | null;
      source?: string;
      created_by_user_id?: string;
    };
    participants: Array<{
      id: string;
      user_id: string;
      role: string;
      response_state: string;
    }>;
    message?: string;
  }>(`/api/v1/product/conversations/${encodeURIComponent(conversationId)}/plans`, {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(attrs),
  });
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

/** Phase 4G — destination pack suggestions for a trip (commits nothing until addTripLeg). */
export type TripCurateSuggestion = {
  id: string;
  name: string;
  leg_type: string;
  description?: string;
  area_label?: string;
  price_band?: string;
  cuisine?: string | null;
  shared_reasons?: string[];
  private_reasons?: string[];
};

export async function curateTripStops(tripId: string, bearer?: string) {
  return request<{
    destination: string;
    suggestions: TripCurateSuggestion[];
    authority?: string;
    commits_legs?: boolean;
    error_code?: string;
    error?: string;
  }>(`/api/v1/product/trips/${encodeURIComponent(tripId)}/curate`, {
    method: "POST",
    bearer: resolveBearer(bearer),
  });
}

/** Soft canvas RSVP — in | interested | passed. */
export async function setTripActivityResponse(
  tripId: string,
  activityId: string,
  state: "in" | "interested" | "passed",
  bearer?: string,
) {
  return request<{ response: TripActivityResponse }>(
    `/api/v1/product/trips/${encodeURIComponent(tripId)}/activities/${encodeURIComponent(activityId)}/response`,
    {
      method: "PUT",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({ state }),
    },
  );
}

/* Repair #18 FALSE-fix F-12: the seedMexicoCityCanvas client helper was
   removed - a fixture seed endpoint must not be wired into the shipping
   client as a product action. The backend route is founder-seed gated. */

export async function getTripVibeProfiles(tripId: string, bearer?: string) {
  return request<{ profiles: TripVibeProfile[] }>(
    `/api/v1/product/trips/${encodeURIComponent(tripId)}/vibe_profiles`,
    { bearer: resolveBearer(bearer) },
  );
}

/** Group experience curation — together / splits / free / proposals. */
export async function curateTripExperience(tripId: string, bearer?: string) {
  return request<{
    destination?: string;
    together?: unknown[];
    splits?: unknown[];
    free_blocks?: unknown[];
    proposals?: Array<{ venue_name?: string; reason?: string; [k: string]: unknown }>;
    commits_canvas?: boolean;
  }>(`/api/v1/product/trips/${encodeURIComponent(tripId)}/curate_experience`, {
    method: "POST",
    bearer: resolveBearer(bearer),
  });
}

export async function tripConvoyOptIn(tripId: string, bearer?: string) {
  return request<{ member: TripConvoyMember }>(
    `/api/v1/product/trips/${encodeURIComponent(tripId)}/convoy/opt_in`,
    { method: "POST", bearer: resolveBearer(bearer) },
  );
}

export async function tripConvoyOptOut(tripId: string, bearer?: string) {
  return request<{ member: TripConvoyMember }>(
    `/api/v1/product/trips/${encodeURIComponent(tripId)}/convoy/opt_out`,
    { method: "POST", bearer: resolveBearer(bearer) },
  );
}

export async function tripConvoyPing(
  tripId: string,
  attrs: { place_label?: string; lat?: number; lng?: number },
  bearer?: string,
) {
  return request<{ member: TripConvoyMember }>(
    `/api/v1/product/trips/${encodeURIComponent(tripId)}/convoy/ping`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify(attrs),
    },
  );
}

export async function getTripConvoy(tripId: string, bearer?: string) {
  return request<TripConvoyRoster>(
    `/api/v1/product/trips/${encodeURIComponent(tripId)}/convoy`,
    { bearer: resolveBearer(bearer) },
  );
}

/** Phase 2C / 2A — register Expo or native device push token (owner-scoped upsert). */
export type DevicePushToken = {
  id: string;
  user_id?: string;
  platform: string;
  token: string;
  env: string;
  disabled_at?: string | null;
  active?: boolean;
};

export async function registerDevicePushToken(
  input: { platform: "ios" | "android"; token: string; env?: "sandbox" | "production" },
  bearer?: string,
) {
  return request<{ token: DevicePushToken }>("/api/v1/product/devices/tokens", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({
      platform: input.platform,
      token: input.token,
      env: input.env ?? "production",
    }),
  });
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

/** Relationship Access Model — standing Graphing + multi-dim grants (Pass 2 locked). */
export type GraphingMode = "never" | "ask_each" | "auto_eligible" | "selected_only";

export type GraphingPolicy = {
  owner_user_id?: string;
  call_mode: GraphingMode | string;
  chat_mode: GraphingMode | string;
  global_paused: boolean;
  paused_at?: string | null;
  other_party_disclosure_required?: boolean;
  indicator?: { label?: string; when_active_show?: string[] };
};

export type RelationshipAccessGrant = {
  id: string;
  owner_user_id?: string;
  scope_kind: "contact" | "group" | "global" | string;
  contact_user_id?: string | null;
  group_id?: string | null;
  data_category: string;
  access_level: "none" | "observe" | "use" | "disclose" | string;
  action_ceiling: "none" | "suggest" | "prepare" | "execute" | string;
  visibility: string;
  source?: string;
  template_key?: string | null;
  granted_at?: string | null;
  expires_at?: string | null;
  revoked_at?: string | null;
  active?: boolean;
};

export async function getGraphingPolicy(bearer?: string) {
  return request<{ graphing: GraphingPolicy }>("/api/v1/product/relationship-access/graphing", {
    bearer: resolveBearer(bearer),
  });
}

export async function updateGraphingPolicy(
  attrs: Partial<{
    call_mode: GraphingMode | string;
    chat_mode: GraphingMode | string;
    global_paused: boolean;
    other_party_disclosure_required: boolean;
  }>,
  bearer?: string,
) {
  return request<{ graphing: GraphingPolicy }>("/api/v1/product/relationship-access/graphing", {
    method: "PATCH",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(attrs),
  });
}

export async function decideGraphing(
  attrs: { channel: "call" | "chat" | string; contact_user_id?: string | null },
  bearer?: string,
) {
  return request<{
    allowed: boolean;
    mode?: string;
    reason?: string;
    indicator?: string;
    other_party_disclosure_required?: boolean;
    understanding_candidates_active?: boolean;
  }>("/api/v1/product/relationship-access/graphing/decide", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(attrs),
  });
}

export async function listRelationshipAccessGrants(
  opts?: { contact_user_id?: string },
  bearer?: string,
) {
  const q = opts?.contact_user_id
    ? `?contact_user_id=${encodeURIComponent(opts.contact_user_id)}`
    : "";
  return request<{ grants: RelationshipAccessGrant[]; templates: string[] }>(
    `/api/v1/product/relationship-access/grants${q}`,
    { bearer: resolveBearer(bearer) },
  );
}

export async function upsertRelationshipAccessGrant(
  attrs: Partial<RelationshipAccessGrant> & {
    scope_kind: string;
    data_category: string;
  },
  bearer?: string,
) {
  return request<{ grant: RelationshipAccessGrant }>("/api/v1/product/relationship-access/grants", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(attrs),
  });
}

export async function revokeRelationshipAccessGrant(grantId: string, bearer?: string) {
  return request<{ grant: RelationshipAccessGrant }>(
    `/api/v1/product/relationship-access/grants/${encodeURIComponent(grantId)}`,
    { method: "DELETE", bearer: resolveBearer(bearer) },
  );
}

export async function authorizeRelationshipAction(
  attrs: {
    data_category: string;
    action_ceiling?: string;
    contact_user_id?: string | null;
    disclose?: boolean;
  },
  bearer?: string,
) {
  return request<{
    allowed: boolean;
    action: string;
    may_use: boolean;
    may_disclose: boolean;
    effective_ceiling: string;
    understanding_candidates_active?: boolean;
  }>("/api/v1/product/relationship-access/authorize", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(attrs),
  });
}

/** Phase RU-2 — progressive trust tiers. */
export type TrustTierValue = "new" | "known" | "trusted" | "inner_circle";

export type TrustTierInfo = {
  tier: TrustTierValue | string;
  friendly_name: string;
  can_access: string[];
  can_access_labels?: string[];
  next_tier?: TrustTierValue | string | null;
  next_friendly_name?: string | null;
  next_requirements?: string | null;
};

export async function getTrustTier(bearer?: string) {
  return request<TrustTierInfo>("/api/v1/product/trust/tier", {
    bearer: resolveBearer(bearer),
  });
}

export async function grantInnerCircleTrust(bearer?: string) {
  return request<{
    tier: string;
    info: TrustTierInfo;
  }>("/api/v1/product/trust/tier/grant", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({ tier: "inner_circle" }),
  });
}

/** Step complete trust back to trusted (user-initiated). */
export async function revokeInnerCircleTrust(bearer?: string) {
  return request<{
    tier: string;
    info: TrustTierInfo;
  }>("/api/v1/product/trust/tier/revoke", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({}),
  });
}

/** Phase RU-3 — financial comfort (trusted+). */
export type ComfortLevel = "budget" | "moderate" | "comfortable" | "luxury";

export type MoneyRange = { min: number; max: number };

export type FinancialProfile = {
  id: string;
  user_id: string;
  comfort_level: ComfortLevel | string;
  dining_range?: MoneyRange | null;
  activity_range?: MoneyRange | null;
  notes?: string | null;
  inserted_at?: string;
  updated_at?: string;
};

export const COMFORT_LEVEL_OPTIONS: {
  value: ComfortLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "budget",
    label: "Budget",
    description: "Under $25/person dining. Free or low-cost activities.",
  },
  {
    value: "moderate",
    label: "Moderate",
    description: "$25–60/person dining. Mid-range activities.",
  },
  {
    value: "comfortable",
    label: "Comfortable",
    description: "$60–150/person dining. Premium activities OK.",
  },
  {
    value: "luxury",
    label: "Luxury",
    description: "$150+/person dining. High-end experiences welcome.",
  },
];

export async function getFinancialProfile(bearer?: string): Promise<FinancialProfile | null> {
  try {
    const res = await request<{ profile: FinancialProfile }>("/api/v1/product/financial/profile", {
      bearer: resolveBearer(bearer),
    });
    return res.profile || null;
  } catch (err) {
    const e = err as Error & { status?: number; code?: string };
    if (e.status === 404 || e.code === "not_found") return null;
    throw err;
  }
}

export async function setFinancialProfile(
  attrs: {
    comfort_level: ComfortLevel | string;
    dining_range?: MoneyRange | null;
    activity_range?: MoneyRange | null;
    notes?: string | null;
  },
  bearer?: string,
) {
  return request<{ profile: FinancialProfile }>("/api/v1/product/financial/profile", {
    method: "PUT",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(attrs),
  });
}

export async function deleteFinancialProfile(bearer?: string) {
  return request<{ deleted: boolean; status?: string }>("/api/v1/product/financial/profile", {
    method: "DELETE",
    bearer: resolveBearer(bearer),
  });
}

/** Phase 5 — Opal stored-value wallet (separate from bank money). */
export type OpalWallet = {
  account_id: string;
  balance_cents: number;
  currency: string;
  auto_approve_threshold_cents: number;
};

export type OpalWalletTransaction = {
  id: string;
  amount_cents: number;
  type: "load" | "spend" | "refund" | "adjustment" | string;
  ref_type?: string | null;
  ref_id?: string | null;
  balance_after_cents: number;
  inserted_at?: string;
};

export async function getOpalWallet(bearer?: string): Promise<OpalWallet | null> {
  try {
    const res = await request<{ wallet: OpalWallet }>("/api/v1/product/wallet", {
      bearer: resolveBearer(bearer),
    });
    return res.wallet || null;
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 401 || e.status === 404) return null;
    throw err;
  }
}

export async function listOpalWalletTransactions(
  bearer?: string,
  limit = 20,
): Promise<OpalWalletTransaction[]> {
  try {
    const res = await request<{ transactions: OpalWalletTransaction[] }>(
      `/api/v1/product/wallet/transactions?limit=${encodeURIComponent(String(limit))}`,
      { bearer: resolveBearer(bearer) },
    );
    return res.transactions || [];
  } catch {
    return [];
  }
}

export async function requestOpalWalletLoad(
  attrs: { amount_cents: number; idempotency_key: string; stripe_payment_id?: string | null },
  bearer?: string,
): Promise<{ kind: string; message?: string; loadable?: boolean; wallet?: OpalWallet }> {
  return request("/api/v1/product/wallet/load", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(attrs),
  });
}

/** Paste G Phase 7 — Stripe Checkout when STRIPE_SECRET_KEY present. */
export async function createOpalWalletCheckout(
  attrs: { amount_cents: number; success_url?: string; cancel_url?: string },
  bearer?: string,
): Promise<{
  kind: string;
  message?: string;
  loadable?: boolean;
  session?: { id?: string; url?: string };
}> {
  return request("/api/v1/product/wallet/checkout", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(attrs),
  });
}

/** Paste G Phase 7 — runtime-tunable auto-approve threshold. */
export async function patchOpalWalletThreshold(
  auto_approve_threshold_cents: number,
  bearer?: string,
): Promise<OpalWallet | null> {
  const res = await request<{ wallet: OpalWallet }>("/api/v1/product/wallet", {
    method: "PATCH",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({ auto_approve_threshold_cents }),
  });
  return res.wallet || null;
}

/** Paste G Phase 5 — sync birthday/anniversary from a user-selected contact. */
export async function syncContactCelebration(
  attrs: {
    name: string;
    birthday?: { month: number; day: number; year?: number | null } | null;
    anniversary?: { month: number; day: number; year?: number | null } | null;
    person_id?: string | null;
  },
  bearer?: string,
): Promise<{ kind: string; celebrations?: unknown[] }> {
  return request("/api/v1/product/contacts/celebration-sync", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(attrs),
  });
}

/** Phase NE-1 — invite friends to join Opal. */
export type InviteStatus = "sent" | "opened" | "joined" | "expired";

export type ProductInvite = {
  id: string;
  code: string;
  status: InviteStatus | string;
  invitee_phone?: string | null;
  invitee_email?: string | null;
  joined_user_id?: string | null;
  share_url: string;
  expires_at?: string;
  inserted_at?: string;
};

export type InviteListResponse = {
  invites: ProductInvite[];
  pending_count: number;
  rewards?: { successful_invites: number };
};

export async function listProductInvites(bearer?: string) {
  return request<InviteListResponse>("/api/v1/product/invites", {
    bearer: resolveBearer(bearer),
  });
}

export async function createProductInvite(
  attrs: { invitee_phone?: string; invitee_email?: string } = {},
  bearer?: string,
) {
  return request<{
    invite: ProductInvite;
    code: string;
    share_url: string;
    delivery?: Record<string, unknown>;
  }>("/api/v1/product/invites", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(attrs),
  });
}

export async function validateProductInvite(code: string) {
  return request<{
    valid: boolean;
    code?: string;
    status?: string;
    inviter_display_name?: string | null;
    expires_at?: string;
  }>(`/api/v1/product/invites/${encodeURIComponent(code)}/validate`, {
    csrf: false,
  });
}

/** Authenticated join for product invite codes (already signed-in guest). */
export async function joinProductInvite(code: string, bearer?: string) {
  return request<{
    invite_joined: boolean;
    welcome_message?: string;
    invite?: ProductInvite;
  }>(`/api/v1/product/invites/${encodeURIComponent(code)}/join`, {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({}),
  });
}

/** Product invite codes look like MAYA-X7K2 (prefix-suffix). Social share tokens do not. */
export function isProductInviteCode(token: string): boolean {
  // PREFIX-SUFFIX; suffix lengthened to 8+ for 12+ char codes (Phase 3.1).
  return /^[A-Za-z0-9]{2,4}-[A-Za-z0-9]{4,12}$/.test(String(token || "").trim());
}

const PRODUCT_INVITE_STORAGE_KEY = "opal_product_invite_code";

export function storeProductInviteCode(code: string): void {
  try {
    sessionStorage.setItem(PRODUCT_INVITE_STORAGE_KEY, code.trim().toUpperCase());
  } catch {
    /* private mode */
  }
}

export function readStoredProductInviteCode(): string | null {
  try {
    const v = sessionStorage.getItem(PRODUCT_INVITE_STORAGE_KEY);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

export function clearStoredProductInviteCode(): void {
  try {
    sessionStorage.removeItem(PRODUCT_INVITE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Prefer current origin so LAN/founder-walk links actually open this app. */
export function localProductInviteShareUrl(code: string): string {
  if (typeof window === "undefined" || !window.location?.origin) {
    return `https://opal.app/join?invite=${encodeURIComponent(code)}`;
  }
  return `${window.location.origin}/?invite=${encodeURIComponent(code)}`;
}

/** Phase RU-1 — relationship types (how you know each person). */
export type RelationshipTypeValue =
  | "spouse"
  | "partner"
  | "family"
  | "close_friend"
  | "friend"
  | "business"
  | "acquaintance";

export type RelationshipBounds = {
  frequency?: "daily" | "weekly" | "occasional" | string;
  style?: "casual" | "formal" | "warm" | string;
  planning?: "spontaneous" | "planned" | string;
};

export type RelationshipContact = {
  id?: string | null;
  contact_user_id: string;
  display_name?: string | null;
  type?: RelationshipTypeValue | string | null;
  /** Repair #19 W24 (DL-02) — the family subtype dimension, carried
   *  by the backend contract; absent/null when not family or unset. */
  family_subtype?: string | null;
  family_minor?: boolean;
  /** Founder Screen Notes N4 - the established age band
   *  ("under_13" | "age_13_17" | "adult"), or null when none has
   *  been established. Affordance only: no policy reads it yet. */
  age_band?: string | null;
  communication_bounds?: RelationshipBounds | null;
};

export type RelationshipRow = {
  id: string;
  user_id: string;
  contact_user_id: string;
  type: RelationshipTypeValue | string;
  /** Repair #19 W24 (DL-02) — round-trips through the PUT write. */
  family_subtype?: string | null;
  family_minor?: boolean;
  /** N4 — round-trips through the PUT write when stated. */
  age_band?: string | null;
  communication_bounds?: RelationshipBounds | null;
  inserted_at?: string;
  updated_at?: string;
};

export async function listRelationships(bearer?: string) {
  return request<{
    relationships: RelationshipRow[];
    contacts: RelationshipContact[];
    allowed_types: RelationshipTypeValue[];
    /** Repair #19 W24 (DL-02) — the backend's family subtype
     *  vocabulary ([{slug, label}]) for the identification picker. */
    family_subtypes?: Array<{ slug: string; label: string }>;
  }>("/api/v1/product/relationships", {
    bearer: resolveBearer(bearer),
  });
}

export async function setRelationshipType(
  contactUserId: string,
  type: RelationshipTypeValue | string,
  bounds?: RelationshipBounds,
  bearer?: string,
  family?: {
    familySubtype?: string | null;
    familyMinor?: boolean;
    /** N4 — the age-band statement: a band value, null to clear,
     *  or undefined for no statement (stored band untouched). */
    ageBand?: string | null;
  },
) {
  return request<{ relationship: RelationshipRow }>(
    `/api/v1/product/relationships/${encodeURIComponent(contactUserId)}`,
    {
      method: "PUT",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({
        type,
        bounds: bounds || {},
        // DL-02: the subtype keys are sent ONLY when the caller is
        // making a subtype statement — an absent key leaves the
        // stored subtype under the type write's own rules.
        ...(family
          ? {
              family_subtype: family.familySubtype ?? null,
              ...(typeof family.familyMinor === "boolean"
                ? { family_minor: family.familyMinor }
                : {}),
              ...(family.ageBand !== undefined ? { age_band: family.ageBand } : {}),
            }
          : {}),
      }),
    },
  );
}

/** Phase 7A — durable preference transparency ("What Opal remembers"). */
export type MemoryFact = {
  id: string;
  label: string;
  value: string;
  mapped?: boolean;
};

export async function listMemoryFacts(bearer?: string) {
  return request<{ facts: MemoryFact[] }>("/api/v1/product/memory/facts", {
    bearer: resolveBearer(bearer),
  });
}

/** Repair #18 SM scoped build - Soul + Memory wallet (W-GAP-01/02/31). */
export type SoulContract = {
  user_id: string;
  assistance_level: string;
  assistance_level_label: string;
  quiet_hours_start: string;
  quiet_hours_end: string;
  quiet_hours_label: string;
  timezone: string;
  max_proactive_signals_per_day: number;
  completion_feedback: string;
  motion_preference: string;
};

export type MemoryCapsuleContract = {
  id: string;
  source: string;
  summary: string | null;
  provenance_label: string | null;
  provenance: Record<string, unknown>;
  scope_policy: Record<string, unknown>;
  /** The backend capsule contract's own scope kind (user, personal,
   *  relationship, conversation, group, plan, ...). */
  scope_kind?: string | null;
  purpose: string | null;
  because: string | null;
  created_at: string | null;
};

export type SoulMemoryPayload = {
  wallet: { id: string; owner_user_id: string; created_at: string | null };
  soul: SoulContract;
  capsules: MemoryCapsuleContract[];
  capsule_count: number;
};

export async function getSoulMemory(bearer?: string) {
  return request<SoulMemoryPayload>("/api/v1/product/memory-wallet", {
    bearer: resolveBearer(bearer),
  });
}

export async function updateSoul(attrs: Record<string, unknown>, bearer?: string) {
  return request<{ soul: SoulContract }>("/api/v1/product/memory-wallet/soul", {
    method: "PATCH",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(attrs),
  });
}

export async function forgetCapsule(capsuleId: string, bearer?: string) {
  return request<{ forgotten: boolean; source: string }>(
    `/api/v1/product/memory-wallet/capsules/${encodeURIComponent(capsuleId)}`,
    { method: "DELETE", bearer: resolveBearer(bearer) },
  );
}

/**
 * N7 (founder polish wave) - manual memory add: the user tells Opal
 * something to remember. The wallet stores it as a capsule whose
 * provenance defaults to "You told Opal" with a stored-at timestamp
 * (CapsuleRead.remember), and whose contract carries created_at -
 * so the read-back shows what was added, when, and where it came
 * from. Owner is always the session's user; there is no parameter
 * that names another account.
 */
export async function createMemoryCapsule(summary: string, bearer?: string) {
  return request<{ capsule: MemoryCapsuleContract }>(
    "/api/v1/product/memory-wallet/capsules",
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({ summary }),
    },
  );
}

/** Adoption wave 2 account activity trail (GET /settings/activity) -
 *  entries written at execution time by the actions they record. */
export type AccountActivityEntry = {
  id: string;
  kind: string;
  subject: string | null;
  detail: Record<string, unknown>;
  at: string | null;
};

export async function getAccountActivity(bearer?: string) {
  return request<{ activity: AccountActivityEntry[] }>("/api/v1/product/settings/activity", {
    bearer: resolveBearer(bearer),
  });
}

export async function forgetMemoryFact(factId: string, bearer?: string) {
  return request<{
    fact: MemoryFact;
    forgotten: boolean;
    candidates_removed?: number;
    candidate_cleanup?: string;
  }>(`/api/v1/product/memory/facts/${encodeURIComponent(factId)}`, {
    method: "DELETE",
    bearer: resolveBearer(bearer),
  });
}

/** Phase 10A / D-2 — birthdays / anniversaries ("Celebrations" on You hub). */
export type Celebration = {
  id: string;
  user_id: string;
  person_name: string;
  kind: "birthday" | "anniversary" | string;
  month: number;
  day: number;
  year?: number | null;
  notes?: string | null;
  date_label?: string | null;
  /** Phase D-2 — top curated plan idea when available */
  would_love?: string | null;
};

export type CelebrationCuration = {
  mode: "full" | "basic" | string;
  celebration?: {
    name?: string;
    date?: string;
    days_until?: number;
    person_name?: string;
    kind?: string;
    id?: string;
  };
  recipient_taste?: { vibes?: string[]; cuisines?: string[] } | null;
  shared_history?: Array<{
    plan_title?: string;
    vibe?: string | null;
    cuisine?: string | null;
    date?: string | null;
  }>;
  group_suggestion?: {
    vibes?: string[];
    cuisines?: string[];
    best_day?: string | null;
  } | null;
  gift_ideas?: string[];
  plan_ideas?: string[];
  budget_note?: string | null;
  reminder?: string | null;
};

export async function listCelebrations(bearer?: string) {
  return request<{ celebrations: Celebration[] }>("/api/v1/product/celebrations", {
    bearer: resolveBearer(bearer),
  });
}

/**
 * Repair #18 (A-web) - true when an error is the backend's explicit
 * throttled-send rejection (429, error_code "rate_limited", sent:false,
 * retryable:true, client_action "retry_send"). The send did NOT store
 * anything; the caller must surface "not sent, tap to retry" and keep
 * the user's words, never treat it as a generic failure.
 */
export function isRateLimitedSendError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as {
    code?: unknown;
    status?: unknown;
    sent?: unknown;
    retryable?: unknown;
    clientAction?: unknown;
  };
  return (
    e.code === "rate_limited" ||
    (e.sent === false && e.retryable === true && e.clientAction === "retry_send")
  );
}

/** Repair #18 - the backend plan conflict object (plan payloads). */
export type PlanConflictContract = {
  with_plan_id?: string | null;
  title?: string | null;
  time_label?: string | null;
} | null;

/** Repair #18 - the ONE attendance counter, as carried by plan payloads. */
export type PlanAttendanceContract = {
  going_count?: number | null;
  interested_count?: number | null;
  total_count?: number | null;
  viewer_state?: string | null;
};

/** Paste W6 Phase 5 — Center now-strip day window (linked calendar only). */
export type CalendarTodayEvent = {
  id?: string | null;
  title?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  /** Repair #18 (F18-09) - plan events carry who/where end to end. */
  who?: string[] | null;
  where?: string | null;
  plan_id?: string | null;
  source?: string | null;
};

export async function fetchCalendarToday(bearer?: string) {
  return request<{
    connected: boolean;
    source: "calendar" | "none" | string;
    events: CalendarTodayEvent[];
    error_code?: string;
  }>("/api/v1/product/calendar/today", {
    bearer: resolveBearer(bearer),
    method: "GET",
  });
}

/**
 * Repair #15 (DF) - Connected sources: Google connector status / connect /
 * disconnect. Backend: ConnectorController + ProviderConnections
 * (GET /connectors/google_calendar, POST .../start, POST .../revoke).
 * Tokens are never returned by the API; status is the only truth painted.
 */
export type GoogleCalendarConnectionStatus = {
  provider: string;
  connected: boolean;
  status: string;
  /** HA-01 provenance: true when this row is a simulated (dev/test)
   * stand-in. A simulated connection is NEVER "Connected". */
  simulated?: boolean;
  scopes: string[];
  token_present: boolean;
  last_synced_at?: string | null;
  last_error_class?: string | null;
};

/**
 * Repair #18 DIR-2 — Settings > Connections status contract
 * (connections-verification-report.md Part 4). The server computes
 * every status; this client renders the payload verbatim and
 * derives NOTHING. `status` is the 7-value enum:
 * working | working_test | gated | not_connected | unverified |
 * simulated | unknown.
 */
export type SettingsConnection = {
  id: string;
  display_name: string;
  category: string;
  powers: string;
  status: string;
  status_label: string;
  status_detail: string;
  credential_status: string;
  provider_status: string;
  function_status: string;
  provenance: string;
  mode: string;
  verification_basis: string;
  last_verified_at: string | null;
  gate: { code: string; reason_plain: string; founder_step: string } | null;
  actions: Array<{
    kind: string;
    label: string;
    route: string;
    enabled: boolean;
    disabled_reason: string | null;
  }>;
  risk_note?: string | null;
};

export type SettingsConnectionsPayload = {
  connections: SettingsConnection[];
  generated_at: string;
  build_ref: string;
  environment: string;
};

export async function getSettingsConnections(bearer?: string) {
  return request<SettingsConnectionsPayload>(
    "/api/v1/product/settings/connections",
    { bearer: resolveBearer(bearer), method: "GET" },
  );
}

export async function getGoogleCalendarStatus(bearer?: string) {
  return request<GoogleCalendarConnectionStatus>(
    "/api/v1/product/connectors/google_calendar",
    { bearer: resolveBearer(bearer), method: "GET" },
  );
}

export async function startGoogleCalendarConnect(bearer?: string) {
  return request<{
    authorize_url: string;
    state: string;
    scopes: string[];
    consent_includes_gmail_readonly: boolean;
  }>("/api/v1/product/connectors/google_calendar/start", {
    bearer: resolveBearer(bearer),
    method: "POST",
    body: "{}",
  });
}

export async function revokeGoogleCalendarConnection(bearer?: string) {
  return request<{ connected: boolean; revoked: boolean }>(
    "/api/v1/product/connectors/google_calendar/revoke",
    { bearer: resolveBearer(bearer), method: "POST", body: "{}" },
  );
}

export async function createCelebration(
  attrs: {
    person_name: string;
    kind: string;
    month: number;
    day: number;
    year?: number | null;
    notes?: string | null;
  },
  bearer?: string,
) {
  return request<{ celebration: Celebration }>("/api/v1/product/celebrations", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(attrs),
  });
}

/**
 * Repair #16 W3 — progressive profile ask surface (Repair #15 B6).
 * Backend: ProfileGapController (owner-scoped; the owner is always the
 * session user, never a param). `assess` records the ask in the durable
 * ledger the first time it fires; `known` / `proceed_without` carry
 * `ask: null` and the surface must render nothing for them.
 */
export type ProfileGapAskPayload = {
  fact_key: string;
  prompt: string;
  flow: string;
  blocking: boolean;
  dismissible: boolean;
  skip_label: string;
  asked_once: boolean;
};

export type ProfileGapAssessment = {
  status: "known" | "ask" | "proceed_without" | string;
  value?: string | null;
  ask?: ProfileGapAskPayload | null;
  reason?: string;
  plan_proceeds?: boolean;
};

export async function assessProfileGap(
  personId: string,
  personName?: string | null,
  bearer?: string,
) {
  return request<{ profile_gap: ProfileGapAssessment }>(
    "/api/v1/product/profile-gaps/assess",
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({
        person_id: personId,
        ...(personName ? { person_name: personName } : {}),
      }),
    },
  );
}

export async function answerProfileGap(
  personId: string,
  value: string,
  personName?: string | null,
  bearer?: string,
) {
  return request<{ answered: boolean; fact_key: string; value: string }>(
    "/api/v1/product/profile-gaps/answer",
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({
        person_id: personId,
        value,
        ...(personName ? { person_name: personName } : {}),
      }),
    },
  );
}

export async function skipProfileGap(personId: string, bearer?: string) {
  return request<{ skipped: boolean; fact_key: string; status: string }>(
    "/api/v1/product/profile-gaps/skip",
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({ person_id: personId }),
    },
  );
}

/**
 * Repair #18 B3 — circle check-in sweep.
 * Backend: CheckinController + SocialFlow.Checkin. Division C
 * interface law: every surface renders the ONE server projection
 * below and never re-derives the rollup. The organizer summary and
 * the member view are distinct explicit outputs of the same GET.
 */
export type CheckinSourceKind =
  | "conversation"
  | "plan"
  | "family_context"
  | "relationship_set";

export type CheckinSweepView = {
  id: string;
  source_kind: CheckinSourceKind;
  source_ref_id: string | null;
  source_fallback: string | null;
  circle_label: string;
  status: "open" | "complete" | "closed" | string;
  prompt_theme: string | null;
  created_at: string | null;
  expires_at: string | null;
  closed_at: string | null;
  close_reason: string | null;
  next_sweep_allowed_at: string | null;
};

export type CheckinCounts = {
  asked_total: number;
  answered: number;
  declined_or_passed: number;
  withdrawn: number;
  not_ok: number;
  still_waiting: number;
  not_askable: number;
};

export type CheckinMemberRow = {
  user_id: string;
  display_name: string | null;
  response_status: "asked" | "answered" | "declined" | "passed" | "withdrawn" | string;
  okay: "ok" | "not_ok" | "unstated" | null;
  where_text: string | null;
  needs_text: string | null;
  free_text: string | null;
  shared_area: { label: string | null; lat: number | null; lon: number | null; shared_at: string | null } | null;
  responded_at: string | null;
  updated_at: string | null;
  answer_source: "card" | "center_text" | null;
  delivery_state: string;
};

export type CheckinOrganizerSummary = {
  view: "organizer";
  sweep: CheckinSweepView;
  counts: CheckinCounts;
  members: CheckinMemberRow[];
  not_askable_names: string[];
  not_askable_note: string | null;
  minor_note: string | null;
  copy: { headline: string; still_waiting_line: string };
};

export type CheckinAskCopy = {
  title: string;
  body: string;
  theme_line: string | null;
  organizer_name: string | null;
  circle_label: string;
  fields: {
    okay_label: string;
    where_label: string;
    needs_label: string;
    share_area_label: string;
    share_area_subcopy: string;
    decline_label: string;
  };
};

export type CheckinMemberView = {
  view: "member";
  sweep: CheckinSweepView;
  organizer_name: string | null;
  ask: CheckinAskCopy;
  my_response: {
    status: string;
    okay: string | null;
    where_text: string | null;
    needs_text: string | null;
    free_text: string | null;
    shared_area: CheckinMemberRow["shared_area"];
    responded_at: string | null;
    updated_at: string | null;
  } | null;
  closed_copy: string | null;
};

export type CheckinProjection = CheckinOrganizerSummary | CheckinMemberView;

export type CheckinSource = {
  source_kind: CheckinSourceKind;
  source_ref_id?: string | null;
  source_filter?: Record<string, unknown> | null;
};

function checkinSourceBody(source: CheckinSource) {
  return {
    source_kind: source.source_kind,
    ...(source.source_ref_id ? { source_ref_id: source.source_ref_id } : {}),
    ...(source.source_filter ? { source_filter: source.source_filter } : {}),
  };
}

export async function createCheckin(
  source: CheckinSource,
  opts: { promptTheme?: string | null; expiresInHours?: number; idempotencyKey: string },
  bearer?: string,
) {
  return request<{ checkin: CheckinOrganizerSummary; created?: boolean; already_open?: boolean }>(
    "/api/v1/product/checkins",
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({
        ...checkinSourceBody(source),
        idempotency_key: opts.idempotencyKey,
        ...(opts.promptTheme ? { prompt_theme: opts.promptTheme } : {}),
        ...(opts.expiresInHours ? { expires_in_hours: opts.expiresInHours } : {}),
      }),
    },
  );
}

export async function getCheckin(sweepId: string, bearer?: string) {
  return request<{ checkin: CheckinProjection; view: string }>(
    `/api/v1/product/checkins/${encodeURIComponent(sweepId)}`,
    { bearer: resolveBearer(bearer) },
  );
}

export type CheckinRespondAttrs = {
  okay?: "ok" | "not_ok";
  where_text?: string;
  needs_text?: string;
  decline?: boolean;
  pass?: boolean;
  share_area?: boolean;
  lat?: number;
  lon?: number;
  area_label?: string;
};

export async function respondCheckin(sweepId: string, attrs: CheckinRespondAttrs, bearer?: string) {
  return request<{ responded: boolean; checkin?: CheckinProjection }>(
    `/api/v1/product/checkins/${encodeURIComponent(sweepId)}/respond`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify(attrs),
    },
  );
}

export async function closeCheckin(sweepId: string, bearer?: string) {
  return request<{ checkin: CheckinOrganizerSummary; closed: boolean }>(
    `/api/v1/product/checkins/${encodeURIComponent(sweepId)}/close`,
    { method: "POST", bearer: resolveBearer(bearer), body: JSON.stringify({}) },
  );
}

export async function withdrawCheckin(sweepId: string, bearer?: string) {
  return request<{ withdrawn: boolean }>(
    `/api/v1/product/checkins/${encodeURIComponent(sweepId)}/withdraw`,
    { method: "POST", bearer: resolveBearer(bearer), body: JSON.stringify({}) },
  );
}

export type CheckinSuggestion = {
  kind: "checkin_sweep";
  circle_key: string;
  copy: string;
  action_label: string;
  dismissible: boolean;
};

export async function getCheckinForSource(source: CheckinSource, bearer?: string) {
  const params = new URLSearchParams({ source_kind: source.source_kind });
  if (source.source_ref_id) params.set("source_ref_id", source.source_ref_id);
  // The relationship_set filter decides which circle this is; dropping
  // it would resolve the row against the wrong (latest) family sweep.
  if (source.source_filter) {
    for (const [k, v] of Object.entries(source.source_filter)) {
      if (typeof v === "string") params.set(`source_filter[${k}]`, v);
      else if (Array.isArray(v)) {
        v.forEach((item, i) => {
          if (typeof item === "string") params.set(`source_filter[${k}][${i}]`, item);
        });
      }
    }
  }
  return request<{
    checkin: CheckinOrganizerSummary | null;
    suggestion: CheckinSuggestion | null;
    next_sweep_allowed_at: string | null;
  }>(`/api/v1/product/checkins/for-source?${params.toString()}`, {
    bearer: resolveBearer(bearer),
  });
}

export async function dismissCheckinSuggestion(source: CheckinSource, bearer?: string) {
  return request<{ dismissed: boolean }>("/api/v1/product/checkins/suggest-dismiss", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(checkinSourceBody(source)),
  });
}

export async function deleteCelebration(id: string, bearer?: string) {
  return request<{ celebration: Celebration; deleted: boolean }>(
    `/api/v1/product/celebrations/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      bearer: resolveBearer(bearer),
    },
  );
}

/** Phase D-2 — curated gift/plan ideas for a celebration (known+). */
export async function curateCelebration(id: string, bearer?: string) {
  return request<{ curation: CelebrationCuration }>(
    `/api/v1/product/celebrations/${encodeURIComponent(id)}/curate`,
    { bearer: resolveBearer(bearer) },
  );
}

/**
 * Repair #19 W14 — the scoped context an Opal conversation carries:
 * the person it is about, optionally the one plan (from the thread's
 * own DIR-1 fact) and the person-thread conversation it came from.
 * Stored server-side on the Opal session (additive scope columns);
 * names/titles are re-derived live by the backend on every contract.
 */
export type OpalChatContextContract = {
  person_id: string;
  person_name?: string | null;
  plan_id?: string | null;
  plan_title?: string | null;
  conversation_id?: string | null;
};

/** Phase OC-1 — Opal Center conversational shell (one conversation per user). */
export type OpalChatMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "opal" | string;
  body: string;
  metadata?: Record<string, unknown> | null;
  inserted_at?: string | null;
};

export type OpalChatConversation = {
  id: string;
  user_id: string;
  title?: string | null;
  inserted_at?: string | null;
  updated_at?: string | null;
  /** Repair #19 W14 — the scope this Opal conversation carries, or null. */
  context?: OpalChatContextContract | null;
  /** Repair #19 Orbits + chrome, on the open conversation contract. */
  anchor?: OpalAnchorContract | null;
  pinned?: boolean | null;
  pinned_at?: string | null;
  user_archived?: boolean | null;
  messages: OpalChatMessage[];
};

export async function getOpalConversation(bearer?: string) {
  return request<{ conversation: OpalChatConversation }>(
    "/api/v1/product/opal/conversation",
    { bearer: resolveBearer(bearer) },
  );
}

/** Optional Center client_context — requesting-user Fit only (share-gated). */
export type OpalClientContext = {
  fit?: {
    activities?: string[];
    goal?: string | null;
  } | null;
};

export async function postOpalMessage(
  body: string,
  bearer?: string,
  opts?: { clientContext?: OpalClientContext | null },
) {
  const payload: { body: string; client_context?: OpalClientContext } = { body };
  if (opts?.clientContext && typeof opts.clientContext === "object") {
    payload.client_context = opts.clientContext;
  }
  return request<{ messages: OpalChatMessage[] }>(
    "/api/v1/product/opal/conversation/messages",
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify(payload),
    },
  );
}

/** New Chat — clear visible Center history + transient planning (plans preserved). */
export async function startOpalNewChat(bearer?: string) {
  return request<{
    ok: boolean;
    cleared: boolean;
    deleted_messages?: number;
    conversation: OpalChatConversation;
  }>("/api/v1/product/opal/conversation/new", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({}),
  });
}

/**
 * Repair #17 W5 + integration — Opal chat SESSIONS (multiple real backend
 * conversations). Reconciled at integration against the W4 backend API
 * (OpalConversationController); every session call lives in this block and
 * nowhere else in the web layer:
 *
 *   GET    /api/v1/product/opal/conversations
 *          -> { conversations: OpalChatSessionSummary[] }   (list, active first)
 *   POST   /api/v1/product/opal/conversation/new           (body {})
 *          -> { ok, cleared, deleted_messages, conversation }  (fresh session;
 *             the prior session is retained in the list)
 *   POST   /api/v1/product/opal/conversations/:id/switch   (body {})
 *          -> { ok, conversation }   (makes :id active, returns it with messages)
 *   PATCH  /api/v1/product/opal/conversations/:id   (body { title })
 *          -> { ok, conversation: OpalChatSessionSummary }   (rename; the
 *             returned summary is the sessions-list shape, so callers
 *             re-render header + list from it with no second fetch.
 *             404 not_found for foreign/unknown ids; 422 invalid with
 *             errors.title messages for blank or over-120-char titles)
 *   POST   /api/v1/product/opal/conversation/messages
 *          body { body, conversation_id, client_context? } -> { messages }
 *   POST   /api/v1/product/opal/conversation/clear
 *          body { conversation_id } -> { ok, cleared, deleted_messages, conversation }
 *
 * Until the list route answers successfully the Center chat stays on the
 * legacy single-conversation endpoints (getOpalConversation /
 * postOpalMessage / startOpalNewChat / clearOpalConversation) — the UI
 * never paints a session it could not load.
 */
export type OpalChatSessionSummary = {
  id: string;
  title?: string | null;
  message_count?: number | null;
  last_message_preview?: string | null;
  inserted_at?: string | null;
  updated_at?: string | null;
  /** Repair #17 backend list contract: true for the one active session. */
  active?: boolean | null;
  /** Repair #19 W14 — the scope this session carries, or null. The
   *  person index is a filter over this field, never a second store. */
  context?: OpalChatContextContract | null;
  /** Repair #19 Orbits — the ONE primary anchor (filing truth). */
  anchor?: OpalAnchorContract | null;
  /** Repair #19 chrome — the one pin + user-archive truth. */
  pinned?: boolean | null;
  pinned_at?: string | null;
  user_archived?: boolean | null;
  user_archived_at?: string | null;
};

/** Repair #19 Orbits — a conversation's primary anchor, from the contract. */
export type OpalAnchorContract = {
  type: "person" | "plan" | "place" | string;
  id: string;
  label?: string | null;
  private?: boolean;
};

/**
 * Repair #18 (A-web) - post coarse, user-granted device coords to the
 * EXISTING Center location ingest the backend reads
 * (POST /api/v1/product/opal/location, CenterLocationController ->
 * Center.DeviceLocation, stored as PlanningContext "device_coords").
 * OpalContext.assemble_location and Oracle's :current_location kind
 * read those stored rows; the Center message payload itself carries
 * no location fields. Callers must only call this with coords from a
 * granted fix (the cached deviceLocation values) - never on spec.
 */
export async function postOpalLocation(
  coords: { lat: number; lon: number; accuracy_m?: number },
  bearer?: string,
) {
  return request<{ ok: boolean; origin_source?: string; coarsened?: boolean }>(
    "/api/v1/product/opal/location",
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({
        lat: coords.lat,
        lon: coords.lon,
        origin_source: "device",
        ...(typeof coords.accuracy_m === "number" && coords.accuracy_m > 0
          ? { accuracy_m: coords.accuracy_m }
          : {}),
      }),
    },
  );
}

export async function listOpalChatSessions(bearer?: string, personId?: string) {
  const qs = personId ? `?person_id=${encodeURIComponent(personId)}` : "";
  return request<{ conversations: OpalChatSessionSummary[] }>(
    `/api/v1/product/opal/conversations${qs}`,
    { bearer: resolveBearer(bearer), method: "GET" },
  );
}

/**
 * Repair #19 W14 — start a NEW Opal conversation scoped to a person
 * (optionally to one plan + the person-thread conversation). The
 * backend validates the binding fail-closed: the plan must be one
 * the caller shares with that person, and the conversation, when
 * given, must be a thread of the caller's with that person in it.
 * The previous active session is archived and retained, exactly as
 * with a plain new chat.
 */
export async function createScopedOpalChatSession(
  scope: {
    personId: string;
    planId?: string | null;
    conversationId?: string | null;
  },
  bearer?: string,
) {
  return request<{ ok: boolean; conversation: OpalChatConversation }>(
    "/api/v1/product/opal/conversations/scoped",
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({
        person_id: scope.personId,
        ...(scope.planId ? { plan_id: scope.planId } : {}),
        ...(scope.conversationId ? { conversation_id: scope.conversationId } : {}),
      }),
    },
  );
}

/**
 * Repair #19 W14 (Addition A) — remove ONE of the caller's own Opal
 * sessions for real: its messages and the session row are deleted
 * server-side, so it leaves every listing (person index + sessions
 * list). Person threads, plans, and graph records are untouched.
 * Foreign/unknown ids → 404.
 */
export async function removeOpalChatSession(sessionId: string, bearer?: string) {
  return request<{ ok: boolean; removed: boolean; deleted_messages?: number }>(
    `/api/v1/product/opal/conversations/${encodeURIComponent(sessionId)}/remove`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({}),
    },
  );
}

export async function createOpalChatSession(bearer?: string) {
  return request<{ conversation: OpalChatConversation }>(
    "/api/v1/product/opal/conversation/new",
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({}),
    },
  );
}

/**
 * Repair #18 - rename ONE Opal session. The backend trims the title and
 * rejects blank or over-120-character titles with a 422 whose
 * errors.title messages ride on the thrown error (see request()).
 * On success the returned conversation is the sessions-list summary
 * for that chat - the caller renders from it directly.
 */
export async function patchOpalConversationTitle(
  sessionId: string,
  title: string,
  bearer?: string,
) {
  return request<{ ok: boolean; conversation: OpalChatSessionSummary }>(
    `/api/v1/product/opal/conversations/${encodeURIComponent(sessionId)}`,
    {
      method: "PATCH",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({ title }),
    },
  );
}

/**
 * Repair #18 - the server's own title validation message from a rename
 * rejection (422 errors.title), or null when the error carries none.
 * Callers show this verbatim inline; they never invent a substitute.
 */
export function opalConversationTitleError(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const errors = (error as { errors?: unknown }).errors;
  if (!errors || typeof errors !== "object") return null;
  const titleErrors = (errors as { title?: unknown }).title;
  if (!Array.isArray(titleErrors)) return null;
  const first = titleErrors.find((t): t is string => typeof t === "string" && t !== "");
  return first ?? null;
}

/** Switch the active Opal session to :id and load it (with its messages). */
export async function getOpalChatSession(sessionId: string, bearer?: string) {
  return request<{ conversation: OpalChatConversation }>(
    `/api/v1/product/opal/conversations/${encodeURIComponent(sessionId)}/switch`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({}),
    },
  );
}

export async function postOpalSessionMessage(
  sessionId: string,
  body: string,
  bearer?: string,
  opts?: { clientContext?: OpalClientContext | null },
) {
  const payload: {
    body: string;
    conversation_id: string;
    client_context?: OpalClientContext;
  } = { body, conversation_id: sessionId };
  if (opts?.clientContext && typeof opts.clientContext === "object") {
    payload.client_context = opts.clientContext;
  }
  return request<{ messages: OpalChatMessage[] }>(
    "/api/v1/product/opal/conversation/messages",
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify(payload),
    },
  );
}

/**
 * Repair #19 Orbits — set/clear ONE session's primary anchor (the
 * proposal accept / redirect / unanchor write path). `anchor: null`
 * unanchors. The response is the updated session summary.
 */
export async function setOpalChatAnchor(
  sessionId: string,
  anchor: { type: string; id: string; label?: string | null } | null,
  bearer?: string,
) {
  return request<{ ok: boolean; conversation: OpalChatSessionSummary }>(
    `/api/v1/product/opal/conversations/${encodeURIComponent(sessionId)}/anchor`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({ anchor }),
    },
  );
}

/** Repair #19 chrome — pin or unpin ONE session (one pin truth). */
export async function setOpalChatPinned(sessionId: string, pinned: boolean, bearer?: string) {
  return request<{ ok: boolean; conversation: OpalChatSessionSummary }>(
    `/api/v1/product/opal/conversations/${encodeURIComponent(sessionId)}/pin`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({ pinned }),
    },
  );
}

/** Repair #19 chrome — archive or unarchive ONE session (the ONE archive). */
export async function setOpalChatArchived(sessionId: string, archived: boolean, bearer?: string) {
  return request<{ ok: boolean; conversation: OpalChatSessionSummary }>(
    `/api/v1/product/opal/conversations/${encodeURIComponent(sessionId)}/archive`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({ archived }),
    },
  );
}

/**
 * Repair #19 Orbits — set the private flag for a WHOLE orbit. Stores
 * the flag only; the item-9 verification gate is wired at integration
 * (W7 seam).
 */
export async function setOrbitPrivate(
  anchor: { type: string; id: string },
  isPrivate: boolean,
  bearer?: string,
) {
  return request<{ ok: boolean; updated: number }>(
    "/api/v1/product/opal/conversations/orbit-private",
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({
        anchor_type: anchor.type,
        anchor_id: anchor.id,
        private: isPrivate,
      }),
    },
  );
}

/** Clear ONE session's messages server-side. Plans made in it are preserved. */
export async function clearOpalChatSession(sessionId: string, bearer?: string) {
  return request<{
    ok: boolean;
    cleared: boolean;
    deleted_messages?: number;
    conversation: OpalChatConversation;
  }>("/api/v1/product/opal/conversation/clear", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({ conversation_id: sessionId }),
  });
}

/** Clear Conversation — same retention rules as New Chat. */
export async function clearOpalConversation(bearer?: string) {
  return request<{
    ok: boolean;
    cleared: boolean;
    deleted_messages?: number;
    conversation: OpalChatConversation;
  }>("/api/v1/product/opal/conversation/clear", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({}),
  });
}

/** Paste J Phase 1 — durable solo SharedPlan from Center "Go with this". */
export async function createCenterPlan(
  attrs: {
    title: string;
    location?: string;
    area?: string;
    time_label?: string;
    decision_id?: string;
    timezone?: string;
    /** Founder Polish G2 — a chosen candidate's own coordinates when
     *  the caller holds them; see createConversationPlan. */
    place_lat?: number;
    place_lon?: number;
  },
  bearer?: string,
) {
  return request<{
    plan: {
      id: string;
      title: string;
      status: string;
      location?: string | null;
      time_label?: string | null;
      source?: string;
      created_by_user_id?: string;
    };
    participants: Array<{
      id?: string;
      user_id: string;
      role: string;
      response_state: string;
    }>;
    message?: string;
  }>("/api/v1/product/opal/plans", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(attrs),
  });
}

/**
 * I2 etiquette wiring - the per-viewer etiquette projection the plan
 * contract carries (SocialFlow.plan_payload/2 ->
 * NonResponseEtiquette.viewer_projection/3, the registered read
 * path). Snake_case verbatim from the backend: surfaces render these
 * finished facts and never re-derive window, limbo or fork state.
 * Absent/null when the viewer has no etiquette fact on the plan.
 */
export type PlanEtiquetteContract = {
  plan_id: string;
  plan_title?: string;
  viewer_role: "requester" | "recipient" | "group_member" | string;
  requester_user_id?: string | null;
  recipient_user_id?: string | null;
  lifecycle_open?: boolean;
  stage: string | null;
  fork?: { state: string; available: boolean } | null;
  limbo: {
    state: string;
    treatment: string;
    pattern_channel: string;
    window_fraction_remaining: number | null;
    copy: string;
  } | null;
  window: {
    set: boolean;
    closes_at: string | null;
    seconds: number | null;
    available: boolean;
    unavailable_reason: string | null;
  };
  decline_available?: boolean;
  fork_available?: boolean;
  generated_at?: string;
};

export type OpalPlanContract = {
  id: string;
  title: string;
  status: string;
  /** I2: the per-viewer etiquette projection (window / limbo / fork). */
  etiquette?: PlanEtiquetteContract | null;
  location?: string | null;
  plan_type?: string;
  online?: boolean;
  time_label?: string | null;
  /** Repair #19 polish (density/horizon): the record's own instants,
   *  already on the backend contract (SharedPlan.to_contract). The
   *  density derivation reads them for time buckets and past pills;
   *  absent = the plan carries no band, never a guessed one. */
  start_at?: string | null;
  completed_at?: string | null;
  source?: string;
  created_by_user_id?: string;
  organizer_name?: string | null;
  caption?: string;
  media_id?: string;
  audience?: string;
  who_label?: string;
  join_requests_on?: boolean;
  exact_spot_after_join?: boolean;
  repeated_from_plan_id?: string;
  created_at?: string;
  /** Repair #18 - attendance contract (absent when no participant rows). */
  going_count?: number | null;
  interested_count?: number | null;
  total_count?: number | null;
  viewer_state?: string | null;
  /** Repair #18 - F18-03 conflict object, or null when no overlap. */
  conflict?: PlanConflictContract;
  /**
   * Repair #18 (W4-04) - the viewer's edit authority on this plan, from
   * the backend's lead model (list payloads only). Surfaces render the
   * edit affordance only when this is true; never guessed locally.
   */
  can_edit?: boolean;
  plan_type?: string | null;
  meeting_link?: string | null;
  online?: boolean;
  /** Repair #18 (B2) — completion record from the one projection. */
  completion?: {
    driven_at?: string | null;
    steps: Array<Record<string, unknown> & { id: string; status: string }>;
  } | null;
  /** Repair #19 W7 — the owner's per-graph private flag. */
  is_private?: boolean;
  /** Repair #19 W7 — the place's coordinates when a real place
   *  record carries them; absent/null means no distance to the
   *  place can be computed for anyone. */
  place_lat?: number | null;
  place_lon?: number | null;
  /**
   * Repair #19 (W9) — additive venue imagery on the record itself.
   * These optional fields are the client side of that contract:
   * when a record carries one of them as a URL-shaped string, Home
   * renders THAT image for the plan. Absent = the designed no-image
   * treatment renders instead. Never derived from the title.
   * Repair #19 BS-05 — the backend contract now carries image_url
   * for plans that hold a real photo as a media record (seeded
   * venue plans): SharedPlan.to_contract projects it from the
   * plan's media_id, served by the product's own media endpoint.
   * `media_id` alone is still never promoted to an image client-side.
   */
  image_url?: string | null;
  place_image_url?: string | null;
  media_url?: string | null;
  place?: {
    kind?: string | null;
    label?: string | null;
    photo_url?: string | null;
    image_url?: string | null;
  } | null;
};

/** Repair #18 (B2) — food step client. Handoff only: these calls compose
 * the group's own order list and start the caller's OWN handoff. No call
 * places an order, charges anything, or returns a confirmation. */
export type FoodHandoffResult = {
  state?: string;
  handoff_url?: string | null;
  target_kind?: string;
  label?: string;
  no_rail_reason?: string;
  ordered: false;
  provider_confirmed: false;
  claim?: string;
  copy?: string;
};

const foodBase = (planId: string) =>
  `/api/v1/product/opal/plans/${encodeURIComponent(planId)}/food`;

export async function fetchFoodCapability(bearer?: string) {
  return request<Record<string, unknown>>("/api/v1/product/opal/food/capability", {
    method: "GET",
    bearer: resolveBearer(bearer),
  });
}

export async function foodAddItems(planId: string, items: string[], bearer?: string) {
  return request<{ food_step: Record<string, unknown> }>(`${foodBase(planId)}/items`, {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({ items }),
  });
}

export async function foodStartHandoff(
  planId: string,
  providerChoice?: string | null,
  bearer?: string,
) {
  return request<FoodHandoffResult>(`${foodBase(planId)}/handoff`, {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({ provider_choice: providerChoice ?? undefined }),
  });
}

export async function foodSelfConfirm(planId: string, bearer?: string) {
  return request<{ food_step: Record<string, unknown> }>(`${foodBase(planId)}/self-confirm`, {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({}),
  });
}

export async function foodNotOrdering(planId: string, bearer?: string) {
  return request<{ food_step: Record<string, unknown> }>(`${foodBase(planId)}/not-ordering`, {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({}),
  });
}

export async function foodCouldNotDeliver(
  planId: string,
  alternateRestaurant?: string | null,
  bearer?: string,
) {
  return request<{ food_step: Record<string, unknown> }>(`${foodBase(planId)}/could-not-deliver`, {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({ alternate_restaurant: alternateRestaurant ?? undefined }),
  });
}

/**
 * Repair #16 — durable GraphCreateFlow completion (non-post graph drafts).
 * Same SharedPlan authority as createCenterPlan (POST /opal/plans), via the
 * graph-create route that also carries caption/media/audience/participants,
 * Repeat provenance, and an idempotency key (double-submit replays to the
 * same plan instead of duplicating).
 */
export async function createGraphPlan(
  attrs: {
    title: string;
    location?: string;
    /** Founder Polish G2 — a chosen candidate's own coordinates when
     *  the caller holds them; see createConversationPlan. */
    place_lat?: number;
    place_lon?: number;
    time_label?: string;
    caption?: string;
    media_id?: string;
    audience?: string;
    join_requests_on?: boolean;
    exact_spot_after_join?: boolean;
    participant_user_ids?: string[];
    who_label?: string;
    source_plan_id?: string;
    entry?: string;
    idempotency_key?: string;
    timezone?: string;
  },
  bearer?: string,
) {
  return request<{
    plan: OpalPlanContract;
    participants: Array<{
      id?: string;
      user_id: string;
      role: string;
      response_state: string;
    }>;
    deduplicated?: boolean;
    message?: string;
  }>("/api/v1/product/opal/plans/graph-create", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(attrs),
  });
}

/** Repair #16 — owner-scoped SharedPlan read-back (backs Graphs/Timeline). */
export async function listOpalPlans(bearer?: string) {
  return request<{ plans: OpalPlanContract[] }>("/api/v1/product/opal/plans", {
    method: "GET",
    bearer: resolveBearer(bearer),
  });
}

/**
 * Repair #18 (W4-04) - edit ONE plan's title / core details.
 *
 *   PATCH /api/v1/product/opal/plans/:id
 *         body { title?, location?, caption?, place_lat?, place_lon? }
 *         -> { ok, plan: OpalPlanContract }   (the SAME plan_payload
 *             shape the listing renders, so callers re-render from the
 *             returned plan with no second fetch - the conversation
 *             rename precedent)
 *         404 not_found for unknown/foreign ids; 403 not_authorized
 *         for participants without lead rights; 422 with errors.<field>
 *         messages for blank / over-length values; 422
 *         schedule_field_requires_revision when a schedule field is
 *         sent (schedule changes are revisions, not edits).
 *
 * Only the fields the caller actually sends are included in the body:
 * an absent field is an untouched field.
 */
export async function patchOpalPlan(
  planId: string,
  changes: {
    title?: string;
    location?: string;
    caption?: string;
    /** Founder Polish G2 — the new place's coordinates, as a pair.
     *  A location change WITHOUT the pair clears the old place's
     *  coordinates server-side (the new place's are unknown). */
    place_lat?: number;
    place_lon?: number;
  },
  bearer?: string,
) {
  const body: Record<string, string | number> = {};
  if (typeof changes.title === "string") body.title = changes.title;
  if (typeof changes.location === "string") body.location = changes.location;
  if (typeof changes.caption === "string") body.caption = changes.caption;
  if (typeof changes.place_lat === "number") body.place_lat = changes.place_lat;
  if (typeof changes.place_lon === "number") body.place_lon = changes.place_lon;
  return request<{ ok: boolean; plan: OpalPlanContract }>(
    `/api/v1/product/opal/plans/${encodeURIComponent(planId)}`,
    {
      method: "PATCH",
      bearer: resolveBearer(bearer),
      body: JSON.stringify(body),
    },
  );
}

/**
 * Repair #18 (W4-04) - the server's own message from a plan-edit
 * rejection: the 422 field message for `field` when one was sent, else
 * the top-level message (403 authority / schedule-boundary copy), else
 * null. Callers show this verbatim inline; they never invent a
 * substitute.
 */
export function opalPlanEditError(
  error: unknown,
  field: "title" | "location" | "caption" | "place_lat" = "title",
): string | null {
  if (!error || typeof error !== "object") return null;
  const errors = (error as { errors?: unknown }).errors;
  if (errors && typeof errors === "object") {
    const fieldErrors = (errors as Record<string, unknown>)[field];
    if (Array.isArray(fieldErrors)) {
      const first = fieldErrors.find(
        (t): t is string => typeof t === "string" && t !== "",
      );
      if (first) return first;
    }
  }
  // request() carries the backend's own message on serverMessage; the
  // Error message itself is a humanized rewrite and is only a fallback.
  const serverMessage = (error as { serverMessage?: unknown }).serverMessage;
  if (typeof serverMessage === "string" && serverMessage !== "") return serverMessage;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message !== "" ? message : null;
}

/**
 * Repair #18 - cancel ONE plan (the C2 shell's "Drop it").
 *
 *   POST /api/v1/product/opal/plans/:id/cancel   (empty body)
 *         -> { ok, plan: OpalPlanContract }   (the cancelled row,
 *             status "cancelled")
 *         404 not_found for unknown/foreign ids; 403 not_authorized
 *         for a participant without lead rights; 409 already_cancelled;
 *         422 illegal_transition for a finished plan.
 *
 * Server authority is the lead model (lead / co_lead, creator fallback
 * where no lead row exists) through the PlanTransition :cancel gate -
 * legal only from tentative / agreed / changed. That is the SAME
 * plan_lead?/2 the plans list stamps as `can_edit`, so the shell
 * derives the affordance from can_edit + status and never guesses.
 * Callers re-read the plans list after a success: the list excludes
 * cancelled plans, so the dropped plan reads back as gone from the
 * projection because the server says so - never because a surface hid
 * it locally.
 */
/**
 * Repair #18 hunt-fix B-15 — B1 place-type conversion, the glass
 * caller that did not exist. The endpoint has been live server-side
 * (JourneyController.convert_place_type) with no client function
 * calling it, so a plan that could not be physical had no way to
 * become virtual from any surface.
 *
 *   POST /api/v1/product/journeys/:id/convert-place-type
 *        body { to_plan_type: "virtual" | "in_person", meeting_link? }
 *        -> { plan, revision, applied }
 * Solo plans apply directly (applied: true). Shared plans return
 * applied: false with the proposed revision — the plan does not move
 * until the other participants accept through the respond endpoint.
 * Callers must say exactly that, never claim the move happened.
 */
export async function convertPlanPlaceType(
  planId: string,
  toPlanType: "virtual" | "in_person",
  opts?: { meetingLink?: string | null; bearer?: string },
) {
  return request<{
    plan: OpalPlanContract;
    revision: Record<string, unknown> | null;
    applied: boolean;
  }>(`/api/v1/product/journeys/${encodeURIComponent(planId)}/convert-place-type`, {
    method: "POST",
    bearer: resolveBearer(opts?.bearer),
    body: JSON.stringify({
      to_plan_type: toPlanType,
      ...(opts?.meetingLink ? { meeting_link: opts.meetingLink } : {}),
    }),
  });
}

/**
 * The plain-language line for a conversion result or rejection
 * (L12: what happened, plus the one useful next step).
 */
export function planConversionLine(
  result: { applied: boolean } | null,
  error?: unknown,
): string {
  if (error) {
    const code =
      error && typeof error === "object" ? (error as { code?: unknown }).code : undefined;
    if (code === "not_found") {
      return "We couldn't find that plan anymore. Head back to Graphs and refresh your list.";
    }
    if (code === "forbidden" || code === "not_authorized" || code === "not_a_member") {
      return "Only people on this plan can move it online. Ask the plan's lead, or keep it as it is.";
    }
    return "That didn't go through. Check your connection and try again.";
  }
  if (result?.applied) {
    return "Done — this plan is online now. Join shows on the plan when its meeting link is set.";
  }
  return "Asked the group to move this online. It changes when they agree — the plan stays as it is until then.";
}

export async function cancelOpalPlan(planId: string, bearer?: string) {
  return request<{ ok: boolean; plan: OpalPlanContract }>(
    `/api/v1/product/opal/plans/${encodeURIComponent(planId)}/cancel`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({}),
    },
  );
}

/**
 * I2 etiquette wiring - set a creator-opt-in response window on one
 * pending invitation.
 *
 *   POST /api/v1/product/opal/plans/:id/response-window
 *        body { recipient_id, window_seconds }
 *        -> { ok, plan: OpalPlanContract }   (the SAME plan_payload
 *           the listing serves, its etiquette projection now carrying
 *           the set window - callers re-render from it, no second fetch)
 *        404 unknown/foreign plan; 403 non-creator with the
 *        machinery's plain line in `message`; 422 gate refusals
 *        (outside the creator's circles, consequential + check-first
 *        mode, outside the 1-hour to 14-day bounds) with the gate's
 *        own finished words in `message` - never a silent drop.
 */
export async function setPlanResponseWindow(
  planId: string,
  recipientId: string,
  windowSeconds: number,
  bearer?: string,
) {
  return request<{ ok: boolean; plan: OpalPlanContract }>(
    `/api/v1/product/opal/plans/${encodeURIComponent(planId)}/response-window`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({
        recipient_id: recipientId,
        window_seconds: windowSeconds,
      }),
    },
  );
}

/**
 * I2 etiquette wiring - answer an etiquette fork or escalation.
 *
 *   POST /api/v1/product/opal/plans/:id/etiquette/respond
 *        body { action } - "decline" / "ask_another_time" (the
 *        recipient's fork answers) or "nudge_again" / "extend" /
 *        "let_it_go" (the requester's escalation answers)
 *        -> { ok, plan: OpalPlanContract, outcome }
 * The machinery decides whose answer an action is; a caller who is
 * not the answer's owner gets the machinery's refusal, surfaced by
 * responseWindowError below.
 */
export async function respondPlanEtiquette(
  planId: string,
  action: "decline" | "ask_another_time" | "nudge_again" | "extend" | "let_it_go",
  bearer?: string,
) {
  return request<{ ok: boolean; plan: OpalPlanContract; outcome: string }>(
    `/api/v1/product/opal/plans/${encodeURIComponent(planId)}/etiquette/respond`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({ action }),
    },
  );
}

/**
 * I2 - the server's own plain line for an etiquette write refusal:
 * the backend's `message` verbatim (request() carries it on
 * serverMessage), never a locally invented substitute. Null when
 * the error carries no words at all.
 */
export function etiquetteWriteError(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const serverMessage = (error as { serverMessage?: unknown }).serverMessage;
  if (typeof serverMessage === "string" && serverMessage !== "") return serverMessage;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message !== "" ? message : null;
}

/**
 * Repair #18 - the plain-language line for a plan-cancel rejection:
 * what happened, plus the ONE useful next step. No internal state
 * names or error codes reach the screen. The backend's own message is
 * carried verbatim inside the composed line when one was sent.
 */
export function opalPlanCancelError(error: unknown): string {
  const code =
    error && typeof error === "object"
      ? (error as { code?: unknown }).code
      : undefined;
  const serverMessage =
    error && typeof error === "object"
      ? (error as { serverMessage?: unknown }).serverMessage
      : undefined;
  const detail =
    typeof serverMessage === "string" && serverMessage !== ""
      ? serverMessage
      : null;
  switch (code) {
    case "not_authorized":
      return "Only the plan's lead can drop this plan. Ask them to drop it, or keep it for now.";
    case "already_cancelled":
      return "This plan is already dropped. Close this and reopen Graphs to see your list up to date.";
    case "illegal_transition":
      return "This plan has finished, so it can't be dropped. It stays with your past plans.";
    case "not_found":
      return "We couldn't find that plan anymore. Close this and reopen Graphs to refresh your list.";
    default:
      return detail
        ? `${detail} Try again in a moment.`
        : "That didn't go through. Check your connection and try again.";
  }
}

/**
 * Repair #18 adoption wave 1 - graph/people cluster client.
 *
 * Every function reads or writes the ONE server projection
 * (GraphPeople / PlanHistory); surfaces render the finished strings
 * verbatim and derive nothing locally.
 */
export type IntentionContract = {
  id: string;
  title: string;
  subject_user_id: string;
  subject_name: string;
  cadence_days: number | null;
  kept_count: number;
  last_kept: { plan_id: string; title: string; when_label: string | null; at: string } | null;
  next_window_at: string | null;
  missed: boolean;
  missed_needs_surface: boolean;
  status_line: string;
  created_at: string;
};

export type WorkingGoalContract = {
  id: string;
  title: string;
  linked_plan_ids: string[];
  linked_count: number;
  completed_count: number;
  last_completed: { plan_id: string; title: string; at: string } | null;
  next_upcoming: { plan_id: string; title: string; when_label: string | null } | null;
  status_line: string;
  created_at: string;
};

export type ShelfSparkContract = {
  id: string;
  title: string;
  state: "spark" | "promoted";
  promoted_plan: { plan_id: string; title: string; status: string } | null;
  prefill: {
    title: string;
    location: string | null;
    time_label: string | null;
    participant_user_ids: string[];
  };
  created_at: string;
};

export type ShelfStarterContract = {
  id: string;
  kind: "celebration" | "person";
  title: string;
  basis_line: string;
  basis_ref: string;
  prefill: { title: string; participant_user_ids: string[] };
};

export type ShelfContract = { sparks: ShelfSparkContract[]; starters: ShelfStarterContract[] };

export type PlanHistoryContract = {
  plan_id: string;
  /** Cluster G (P10c): the viewer's leave-by projection (LeaveBy). */
  leave_by?: LeaveByProjection | null;
  history: Array<{ line: string; kind: string; at: string }>;
  who: Array<{
    user_id: string;
    name: string;
    role: string;
    response_state: string | null;
    response_label: string;
    /** R19 W7 — finished by the backend from the per-plan sharing
     *  backbone only. "not_sharing" always carries a null distance. */
    location_state?: "sharing" | "not_sharing" | string;
    location_label?: string;
    distance_label?: string | null;
    distance_basis?: "measured" | null;
  }>;
  counts: {
    going_count?: number;
    interested_count?: number;
    total_count?: number;
    viewer_state?: string | null;
  };
};

export type HoldingContract = {
  counters: {
    plans_in_motion: number;
    approvals_waiting: number;
    memories_held: number;
    sources_connected: number;
  };
  links: Record<string, string>;
  answer_text: string;
};

export async function listIntentions(bearer?: string) {
  return request<{ intentions: IntentionContract[] }>("/api/v1/product/graph/intentions", {
    method: "GET",
    bearer: resolveBearer(bearer),
  });
}

export async function createIntention(
  attrs: { subject_user_id: string; title: string; cadence_days?: number },
  bearer?: string,
) {
  return request<{ intention: IntentionContract }>("/api/v1/product/graph/intentions", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(attrs),
  });
}

export async function deleteIntention(intentionId: string, bearer?: string) {
  return request<{ ok: boolean }>(
    `/api/v1/product/graph/intentions/${encodeURIComponent(intentionId)}`,
    { method: "DELETE", bearer: resolveBearer(bearer) },
  );
}

export async function listWorkingGoals(bearer?: string) {
  return request<{ goals: WorkingGoalContract[] }>("/api/v1/product/graph/goals", {
    method: "GET",
    bearer: resolveBearer(bearer),
  });
}

export async function createWorkingGoal(title: string, bearer?: string) {
  return request<{ goal: WorkingGoalContract }>("/api/v1/product/graph/goals", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({ title }),
  });
}

export async function deleteWorkingGoal(goalId: string, bearer?: string) {
  return request<{ ok: boolean }>(`/api/v1/product/graph/goals/${encodeURIComponent(goalId)}`, {
    method: "DELETE",
    bearer: resolveBearer(bearer),
  });
}

export async function linkGoalPlan(goalId: string, planId: string, bearer?: string) {
  return request<{ goal: WorkingGoalContract }>(
    `/api/v1/product/graph/goals/${encodeURIComponent(goalId)}/link`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({ plan_id: planId }),
    },
  );
}

export async function unlinkGoalPlan(goalId: string, planId: string, bearer?: string) {
  return request<{ goal: WorkingGoalContract }>(
    `/api/v1/product/graph/goals/${encodeURIComponent(goalId)}/unlink`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({ plan_id: planId }),
    },
  );
}

export async function getShelf(bearer?: string) {
  return request<ShelfContract>("/api/v1/product/graph/shelf", {
    method: "GET",
    bearer: resolveBearer(bearer),
  });
}

export async function promoteSpark(
  sparkId: string,
  overrides: { title?: string; location?: string; time_label?: string } = {},
  bearer?: string,
) {
  return request<{ spark: ShelfSparkContract; plan: OpalPlanContract }>(
    `/api/v1/product/graph/shelf/${encodeURIComponent(sparkId)}/promote`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify(overrides),
    },
  );
}

export async function getPlanHistory(planId: string, bearer?: string) {
  return request<PlanHistoryContract>(
    `/api/v1/product/opal/plans/${encodeURIComponent(planId)}/history`,
    { method: "GET", bearer: resolveBearer(bearer) },
  );
}

export async function getHolding(bearer?: string) {
  return request<HoldingContract>("/api/v1/product/opal/holding", {
    method: "GET",
    bearer: resolveBearer(bearer),
  });
}

/** Repair #19 W7 — private graphs + living detail client. The lock
 *  endpoints verify server-side; verify returns only a boolean (the
 *  client never holds or checks a code itself). */
export async function setPlanPrivate(planId: string, isPrivate: boolean, bearer?: string) {
  return request<{ plan: OpalPlanContract }>(
    `/api/v1/product/opal/plans/${encodeURIComponent(planId)}/private`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({ is_private: isPrivate }),
    },
  );
}

export async function getGraphLock(bearer?: string) {
  return request<{ passcode_set: boolean }>("/api/v1/product/opal/graph-lock", {
    method: "GET",
    bearer: resolveBearer(bearer),
  });
}

export async function setGraphLock(code: string, bearer?: string) {
  return request<{ ok: boolean; passcode_set: boolean }>("/api/v1/product/opal/graph-lock", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({ code }),
  });
}

export async function verifyGraphLock(code: string, bearer?: string) {
  return request<{ unlocked: boolean }>("/api/v1/product/opal/graph-lock/verify", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify({ code }),
  });
}

/**
 * Repair #19 BS-02 / W20 JA-01 — orbit unlock verification, the
 * orbit leg of W7's ONE lock truth. The REAL route (router.ex) is
 * POST /api/v1/product/opal/conversations/orbit-verify and it
 * requires the anchor with the code — body
 * { anchor_type, anchor_id, code }: success 200 { unlocked: true },
 * wrong code 403 { unlocked: false }, an anchor the caller does
 * not own 404, a missing anchor 422. Verified server-side against
 * the same account passcode the Graphs Private area uses. The
 * client's request shape is pinned to this route contract by
 * orbitVerifyContract.test.ts (the JA-01 joint test).
 */
export async function verifyOrbitLock(
  anchorType: string,
  anchorId: string,
  code: string,
  bearer?: string,
) {
  return request<{ unlocked: boolean }>(
    "/api/v1/product/opal/conversations/orbit-verify",
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({
        anchor_type: anchorType,
        anchor_id: anchorId,
        code,
      }),
    },
  );
}

export async function sharePlanLocation(
  planId: string,
  coords: { lat: number; lon: number },
  bearer?: string,
) {
  return request<{ sharing: boolean; expires_at?: string }>(
    `/api/v1/product/opal/plans/${encodeURIComponent(planId)}/location-share`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
      body: JSON.stringify({ lat: coords.lat, lon: coords.lon }),
    },
  );
}

export async function stopPlanLocation(planId: string, bearer?: string) {
  return request<{ sharing: boolean }>(
    `/api/v1/product/opal/plans/${encodeURIComponent(planId)}/location-share`,
    { method: "DELETE", bearer: resolveBearer(bearer) },
  );
}

/** Paste K — Lives (placed-only), stickers, venue pay. */
export type LivesGoLiveCopy = {
  step: number;
  prompt: string;
  required: boolean;
  skip_allowed: boolean;
  default: null;
  trade: string;
  consequence_template: string;
  reject_free_text: string;
  residential_reject: string;
  manual_testing_label?: string;
  manual_testing_only_under?: string;
};

export async function getLivesGoLiveCopy(bearer?: string): Promise<LivesGoLiveCopy> {
  return request("/api/v1/product/lives/go-live-copy", {
    method: "GET",
    bearer: resolveBearer(bearer),
  });
}

export async function getLivesStickerCatalog(bearer?: string) {
  return request<{
    stickers: Array<{
      key: string;
      emoji: string;
      label: string;
      tier: number;
      amount_cents: number;
      test_mode: boolean;
      honesty: string;
    }>;
    honesty: string;
    split: { host_bps: number; venue_bps: number; opal_bps: number };
    anti_mercenary: string;
    test_mode_default: boolean;
    live_money_flag: string;
  }>("/api/v1/product/lives/stickers", {
    method: "GET",
    bearer: resolveBearer(bearer),
  });
}

export async function searchLivesVenues(query: string, bearer?: string) {
  const q = encodeURIComponent(query);
  return request<{
    candidates: Array<{
      place_id?: string;
      name?: string;
      formatted_address?: string;
      types?: string[];
    }>;
    empty?: boolean;
    places_unavailable?: boolean;
    message?: string;
    manual_testing_available?: boolean;
    manual_testing_label?: string;
  }>(`/api/v1/product/lives/venue-search?q=${q}`, {
    method: "GET",
    bearer: resolveBearer(bearer),
  });
}

export async function postLivesGoLive(
  attrs: {
    place_id?: string;
    title?: string;
    name?: string;
    venue_name?: string;
    city?: string;
    provisional?: boolean;
    allow_provisional?: boolean;
    audience?: "friends" | "close_circle";
    location_precision?: "venue" | "area";
  },
  bearer?: string,
) {
  return request<{
    live_room: Record<string, unknown>;
    venue?: Record<string, unknown>;
    consequence: string;
    trade: string;
    audience?: string;
    location_precision?: string;
    test_only?: boolean;
    test_venue_badge?: string | null;
    error?: string;
    message?: string;
  }>("/api/v1/product/lives/go-live", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(attrs),
  });
}

export async function getLivesVisible(bearer?: string) {
  return request<{
    lives: Array<{ live_room: Record<string, unknown> }>;
    count: number;
  }>("/api/v1/product/lives/visible", {
    method: "GET",
    bearer: resolveBearer(bearer),
  });
}

export async function getLivesMine(bearer?: string) {
  return request<{
    live_room: Record<string, unknown> | null;
    active: boolean;
  }>("/api/v1/product/lives/mine", {
    method: "GET",
    bearer: resolveBearer(bearer),
  });
}

export async function getLive(liveId: string, bearer?: string) {
  return request<{ live_room: Record<string, unknown> }>(
    `/api/v1/product/lives/${encodeURIComponent(liveId)}`,
    {
      method: "GET",
      bearer: resolveBearer(bearer),
    },
  );
}

export async function postLivesEnd(liveId: string, bearer?: string) {
  return request<{ live_room: Record<string, unknown>; error?: string }>(
    `/api/v1/product/lives/${encodeURIComponent(liveId)}/end`,
    {
      method: "POST",
      bearer: resolveBearer(bearer),
    },
  );
}

export async function postLiveSticker(
  liveId: string,
  attrs: { sticker_key: string; idempotency_key: string; sender_name?: string },
  bearer?: string,
) {
  return request<{
    sticker: Record<string, unknown>;
    display: Record<string, unknown>;
    honesty: string;
    test_mode: boolean;
    live_money_flag: string;
  }>(`/api/v1/product/lives/${encodeURIComponent(liveId)}/stickers`, {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(attrs),
  });
}

export async function postVenuePay(
  attrs: { token: string; amount_cents: number; idempotency_key: string },
  bearer?: string,
) {
  return request<{
    receipt: Record<string, unknown>;
    honesty: string | null;
    live_money_flag: string;
  }>("/api/v1/product/venues/pay", {
    method: "POST",
    bearer: resolveBearer(bearer),
    body: JSON.stringify(attrs),
  });
}

