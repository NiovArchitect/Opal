/**
 * Product API client for SF15 real-user activation.
 * Non-authoritative: all domain truth lives on Elixir.
 */

const STORAGE_KEY = "opal.product.session.v15";

export type ProductSession = {
  access_token: string;
  user_id: string;
  display_name: string;
  handle?: string;
  session_id?: string;
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

function apiBase(): string {
  const env = (import.meta as { env?: Record<string, string> }).env;
  return env?.VITE_OPAL_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:4000";
}

export function loadSession(): ProductSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ProductSession;
  } catch {
    return null;
  }
}

export function saveSession(session: ProductSession | null): void {
  try {
    if (!session) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

async function request<T>(
  path: string,
  opts: RequestInit & { token?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(opts.headers as Record<string, string>),
  };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;

  const res = await fetch(`${apiBase()}${path}`, {
    ...opts,
    headers,
  });

  const data = await res.json().catch(() => ({}));
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
    session: { access_token: string; session_id: string };
    user: { id: string; display_name: string; handle: string };
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
    }),
  });

  const session: ProductSession = {
    access_token: data.session.access_token,
    user_id: data.user.id,
    display_name: data.user.display_name,
    handle: data.user.handle,
    session_id: data.session.session_id,
  };
  saveSession(session);
  return session;
}

export async function fetchSession(token: string) {
  return request<{ user: { id: string; display_name: string } }>(
    "/api/v1/product/session",
    { token },
  );
}

export async function signOut(token: string) {
  await request("/api/v1/product/session", { method: "DELETE", token });
  saveSession(null);
}

export async function createInvitation(
  token: string,
  phone: string,
  label: string,
  message: string,
) {
  return request<{ invitation: { id: string; status: string } }>(
    "/api/v1/product/invitations",
    {
      method: "POST",
      token,
      body: JSON.stringify({
        phone,
        label,
        message,
        idempotency_key: `inv-${Date.now()}`,
      }),
    },
  );
}

export async function listIncoming(token: string) {
  return request<{ invitations: { id: string; status: string }[] }>(
    "/api/v1/product/invitations/incoming",
    { token },
  );
}

export async function acceptInvitation(token: string, id: string) {
  return request<{
    establishment: { conversation_id: string; relationship_id: string };
  }>(`/api/v1/product/invitations/${id}/accept`, {
    method: "POST",
    token,
    body: "{}",
  });
}

export async function listConversations(token: string) {
  return request<{ conversations: ConversationSummary[]; signals: ProductSignal[] }>(
    "/api/v1/product/conversations",
    { token },
  );
}

export async function listMessages(token: string, conversationId: string) {
  return request<{ messages: ProductMessage[]; signals: ProductSignal[] }>(
    `/api/v1/product/conversations/${conversationId}/messages`,
    { token },
  );
}

export async function sendMessage(
  token: string,
  conversationId: string,
  body: string,
) {
  return request<{ message: ProductMessage; signals: ProductSignal[] }>(
    `/api/v1/product/conversations/${conversationId}/messages`,
    {
      method: "POST",
      token,
      body: JSON.stringify({
        body,
        client_message_id: `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      }),
    },
  );
}
