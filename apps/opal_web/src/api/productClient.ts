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
  /** In-memory only on hosted web; never written to localStorage */
  access_token?: string;
};

export type ConversationSummary = {
  id: string;
  title: string;
  preview: string;
  updated_at: string;
  peers: { id: string; display_name: string; handle: string }[];
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

export type ProductSignal = {
  kind: string;
  /** Human-facing shared-reality headline (not internal stage name). */
  label: string;
  status: string;
  authority?: string;
  conversation_id?: string;
  evidence_preview?: string;
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
  shared_reality?: {
    what?: string | null;
    when?: string | null;
    where?: string | null;
    gaps?: string[];
    sufficiency?: string;
    ui_job?: string;
    headline?: string | null;
    detail?: string | null;
    usable?: boolean;
    "usable?"?: boolean;
    plans_durable?: boolean;
    "plans_durable?"?: boolean;
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

const PROFILE_KEY = "opal.product.profile.v17";
const CSRF_KEY = "opal.product.csrf.v17";

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

export function runtimeConfig(): RuntimeConfig {
  const apiBase = (env("VITE_OPAL_API_URL") || "").replace(/\/$/, "");
  const socketBase = (env("VITE_OPAL_SOCKET_URL") || apiBase || "").replace(/\/$/, "");
  const environment = env("VITE_OPAL_ENV") || (apiBase ? "hosted" : "local");
  const synthetic = env("VITE_OPAL_SYNTHETIC") !== "false";
  return { apiBase, socketBase, environment, synthetic };
}

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

export function normalizePhoneInput(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+") && digits.length >= 11) return digits;
  if (/^1\d{10}$/.test(digits)) return `+${digits}`;
  if (/^\d{10}$/.test(digits)) return `+1${digits}`;
  return digits;
}

export function isApprovedPreviewFixture(raw: string): boolean {
  const n = normalizePhoneInput(raw);
  return APPROVED_PREVIEW_FIXTURES.some((f) => f.e164 === n);
}

export function saveProfile(session: ProductSession | null): void {
  try {
    if (!session) {
      localStorage.removeItem(PROFILE_KEY);
      setMemoryAccessToken(null);
      return;
    }
    // Never persist access_token to disk.
    localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({
        user_id: session.user_id,
        display_name: session.display_name,
        handle: session.handle,
        session_id: session.session_id,
      }),
    );
    if (session.access_token) setMemoryAccessToken(session.access_token);
  } catch {
    /* ignore */
  }
}

export function loadProfile(): ProductSession | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as ProductSession;
    const token = getMemoryAccessToken();
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

  return request<{
    challenge: { id: string };
    development_code?: string;
    provider: string;
    not_production_sms: boolean;
  }>("/api/v1/product/activation/challenges", {
    method: "POST",
    body: JSON.stringify({
      phone: normalizePhoneInput(phone),
      device_label: deviceLabel,
      idempotency_key: `ch-${Date.now()}`,
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
  return request<{ user: { id: string; display_name: string; handle: string } }>(
    "/api/v1/product/session",
    { bearer: resolveBearer(bearer), method: "GET" },
  );
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

export async function listConversations(bearer?: string) {
  return request<{ conversations: ConversationSummary[]; signals: ProductSignal[] }>(
    "/api/v1/product/conversations",
    { bearer: resolveBearer(bearer) },
  );
}

export async function listMessages(conversationId: string, bearer?: string) {
  return request<{ messages: ProductMessage[]; signals: ProductSignal[] }>(
    `/api/v1/product/conversations/${conversationId}/messages`,
    { bearer: resolveBearer(bearer) },
  );
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

export async function fetchSocketTicket(bearer?: string) {
  return request<{ ticket: string; expires_in: number }>(
    "/api/v1/product/socket-ticket",
    { method: "POST", bearer: resolveBearer(bearer), body: "{}" },
  );
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

export const loadSession = loadProfile;
export const saveSession = saveProfile;
