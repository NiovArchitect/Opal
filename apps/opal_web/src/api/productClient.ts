/**
 * Product API client — SF16 hosted cookie session preferred.
 * Credentials: include for HttpOnly cookies. CSRF header on mutations.
 * Never silently fall back to seeded social graph when authenticated.
 */

export type ProductSession = {
  user_id: string;
  display_name: string;
  handle?: string;
  session_id?: string;
  /** Present only in local bearer mode / tests */
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
};

export type ProductSignal = {
  kind: string;
  label: string;
  status: string;
  authority?: string;
  conversation_id?: string;
  evidence_preview?: string;
};

export type RuntimeConfig = {
  apiBase: string;
  socketBase: string;
  environment: string;
  synthetic: boolean;
};

const PROFILE_KEY = "opal.product.profile.v16";
const CSRF_KEY = "opal.product.csrf.v16";

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

function environmentIsHostedPage(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "opal.niovlabs.com" || h.endsWith(".github.io");
}

function isLocalhost(url: string): boolean {
  return /localhost|127\.0\.0\.1/.test(url);
}

export function saveProfile(session: ProductSession | null): void {
  try {
    if (!session) localStorage.removeItem(PROFILE_KEY);
    else
      localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({
          user_id: session.user_id,
          display_name: session.display_name,
          handle: session.handle,
          session_id: session.session_id,
        }),
      );
  } catch {
    /* ignore */
  }
}

export function loadProfile(): ProductSession | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ProductSession;
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

async function request<T>(
  path: string,
  opts: RequestInit & { bearer?: string; csrf?: boolean } = {},
): Promise<T> {
  if (!apiConfigured()) {
    const err = new Error("API is not configured for this environment") as Error & {
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
  if (opts.bearer) headers.authorization = `Bearer ${opts.bearer}`;
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
    const err = new Error("Could not connect to Opal services") as Error & { code?: string };
    err.code = "network_error";
    throw err;
  }

  const data = await res.json().catch(() => ({}));
  if (data.csrf_token) saveCsrf(data.csrf_token);
  const csrfHeaderVal = res.headers.get("x-csrf-token");
  if (csrfHeaderVal) saveCsrf(csrfHeaderVal);

  if (!res.ok) {
    const err = new Error(data.message || res.statusText) as Error & {
      code?: string;
      status?: number;
    };
    err.code = data.error_code;
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export async function startChallenge(phone: string, deviceLabel: string) {
  return request<{
    challenge: { id: string };
    development_code?: string;
    provider: string;
    not_production_sms: boolean;
  }>("/api/v1/product/activation/challenges", {
    method: "POST",
    body: JSON.stringify({
      phone,
      device_label: deviceLabel,
      idempotency_key: `ch-${Date.now()}`,
    }),
    csrf: false,
  });
}

export async function verifyChallenge(input: {
  challengeId: string;
  code: string;
  displayName: string;
  deviceLabel: string;
  handleHint?: string;
}) {
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
      code: input.code,
      display_name: input.displayName,
      device_label: input.deviceLabel,
      handle_hint: input.handleHint,
      platform: "web",
      // Hosted path: cookie only. Local tests may still request bearer via query if needed.
      include_bearer: !environmentIsHostedPage(),
    }),
    csrf: false,
  });

  if (data.csrf_token) saveCsrf(data.csrf_token);

  const session: ProductSession = {
    access_token: data.session.access_token,
    user_id: data.user.id,
    display_name: data.user.display_name,
    handle: data.user.handle,
    session_id: data.session.session_id,
  };
  saveProfile(session);
  return session;
}

export async function fetchSession(bearer?: string) {
  return request<{ user: { id: string; display_name: string; handle: string } }>(
    "/api/v1/product/session",
    { bearer, method: "GET" },
  );
}

export async function signOut(bearer?: string) {
  await request("/api/v1/product/session", { method: "DELETE", bearer });
  saveProfile(null);
  saveCsrf(null);
}

export async function createInvitation(
  phone: string,
  label: string,
  message: string,
  bearer?: string,
) {
  return request<{ invitation: { id: string; status: string } }>(
    "/api/v1/product/invitations",
    {
      method: "POST",
      bearer,
      body: JSON.stringify({
        phone,
        label,
        message,
        idempotency_key: `inv-${Date.now()}`,
      }),
    },
  );
}

export async function listIncoming(bearer?: string) {
  return request<{ invitations: { id: string; status: string }[] }>(
    "/api/v1/product/invitations/incoming",
    { bearer },
  );
}

export async function acceptInvitation(id: string, bearer?: string) {
  return request<{
    establishment: { conversation_id: string; relationship_id: string };
  }>(`/api/v1/product/invitations/${id}/accept`, {
    method: "POST",
    bearer,
    body: "{}",
  });
}

export async function listConversations(bearer?: string) {
  return request<{ conversations: ConversationSummary[]; signals: ProductSignal[] }>(
    "/api/v1/product/conversations",
    { bearer },
  );
}

export async function listMessages(conversationId: string, bearer?: string) {
  return request<{ messages: ProductMessage[]; signals: ProductSignal[] }>(
    `/api/v1/product/conversations/${conversationId}/messages`,
    { bearer },
  );
}

export async function sendMessage(conversationId: string, body: string, bearer?: string) {
  return request<{ message: ProductMessage; signals: ProductSignal[] }>(
    `/api/v1/product/conversations/${conversationId}/messages`,
    {
      method: "POST",
      bearer,
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
    { method: "POST", bearer, body: "{}" },
  );
}

// Back-compat wrappers used by older SF15 call sites
export const loadSession = loadProfile;
export const saveSession = saveProfile;
