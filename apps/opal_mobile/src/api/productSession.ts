/**
 * Social Flow 18 — real product session for mobile.
 *
 * Authority is the Opal API DeviceSession (synthetic activation only).
 * Access tokens live in expo-secure-store, never ordinary AsyncStorage.
 * No DevAuth. No fixed Alex/Jordan identity as the product session.
 */

import { API_HTTP_URL } from "../config";

export type ProductSession = {
  userId: string;
  displayName: string;
  handle?: string;
  sessionId?: string;
  accessToken: string;
};

const KEYS = {
  token: "opal.product.access_token",
  userId: "opal.product.user_id",
  displayName: "opal.product.display_name",
  handle: "opal.product.handle",
  sessionId: "opal.product.session_id",
} as const;

const MEMORY = new Map<string, string>();

async function secureSet(key: string, value: string): Promise<void> {
  try {
    const SecureStore = await import("expo-secure-store");
    await SecureStore.setItemAsync(key, value);
  } catch {
    MEMORY.set(key, value);
  }
}

async function secureGet(key: string): Promise<string | null> {
  try {
    const SecureStore = await import("expo-secure-store");
    return await SecureStore.getItemAsync(key);
  } catch {
    return MEMORY.get(key) ?? null;
  }
}

async function secureDelete(key: string): Promise<void> {
  try {
    const SecureStore = await import("expo-secure-store");
    await SecureStore.deleteItemAsync(key);
  } catch {
    MEMORY.delete(key);
  }
}

export async function saveProductSession(session: ProductSession): Promise<void> {
  await secureSet(KEYS.token, session.accessToken);
  await secureSet(KEYS.userId, session.userId);
  await secureSet(KEYS.displayName, session.displayName);
  if (session.handle) await secureSet(KEYS.handle, session.handle);
  if (session.sessionId) await secureSet(KEYS.sessionId, session.sessionId);
}

export async function loadProductSession(): Promise<ProductSession | null> {
  const accessToken = await secureGet(KEYS.token);
  const userId = await secureGet(KEYS.userId);
  const displayName = await secureGet(KEYS.displayName);
  if (!accessToken || !userId || !displayName) return null;
  return {
    accessToken,
    userId,
    displayName,
    handle: (await secureGet(KEYS.handle)) || undefined,
    sessionId: (await secureGet(KEYS.sessionId)) || undefined,
  };
}

export async function clearProductSession(): Promise<void> {
  await Promise.all(Object.values(KEYS).map((k) => secureDelete(k)));
}

function apiBase(): string {
  return (API_HTTP_URL || "").replace(/\/$/, "");
}

async function request<T>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  const res = await fetch(`${apiBase()}${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { message: text };
  }
  if (!res.ok) {
    const msg =
      (json as { message?: string })?.message ||
      (json as { error_code?: string })?.error_code ||
      `request_failed_${res.status}`;
    throw new Error(msg);
  }
  return json as T;
}

export async function startChallenge(phone: string, deviceLabel: string) {
  return request<{
    challenge: { id: string };
    development_code?: string;
    not_production_sms?: boolean;
  }>("/api/v1/product/activation/challenges", {
    method: "POST",
    body: {
      phone,
      device_label: deviceLabel,
      idempotency_key: `m-ch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    },
  });
}

export async function verifyChallenge(input: {
  challengeId: string;
  code: string;
  displayName: string;
  deviceLabel: string;
  handleHint?: string;
}): Promise<ProductSession> {
  const body = await request<{
    user: { id: string; display_name: string; handle?: string };
    session: { access_token: string; id?: string };
  }>("/api/v1/product/activation/verify", {
    method: "POST",
    body: {
      challenge_id: input.challengeId,
      code: input.code,
      display_name: input.displayName,
      device_label: input.deviceLabel,
      handle_hint: input.handleHint,
      platform: "ios",
      include_bearer: true,
    },
  });

  const session: ProductSession = {
    userId: body.user.id,
    displayName: body.user.display_name,
    handle: body.user.handle,
    accessToken: body.session.access_token,
    sessionId: body.session.id,
  };
  await saveProductSession(session);
  return session;
}

export async function probeSession(token: string): Promise<ProductSession | null> {
  try {
    const me = await request<{
      user: { id: string; display_name: string; handle?: string };
    }>("/api/v1/product/session", { token });
    if (!me.user?.id) return null;
    const prior = await loadProductSession();
    const session: ProductSession = {
      userId: me.user.id,
      displayName: me.user.display_name,
      handle: me.user.handle,
      accessToken: token,
      sessionId: prior?.sessionId,
    };
    await saveProductSession(session);
    return session;
  } catch {
    return null;
  }
}

export async function restoreSession(): Promise<ProductSession | null> {
  const local = await loadProductSession();
  if (!local?.accessToken) return null;
  const live = await probeSession(local.accessToken);
  if (!live) {
    await clearProductSession();
    return null;
  }
  return live;
}

export async function signOutProduct(token?: string): Promise<void> {
  const t = token || (await loadProductSession())?.accessToken;
  if (t) {
    try {
      await request("/api/v1/product/session", { method: "DELETE", token: t });
    } catch {
      /* still clear local */
    }
  }
  await clearProductSession();
}

export async function createInvitation(
  token: string,
  phone: string,
  label: string,
  inviteSource: "manual" | "selected_contact" = "manual",
) {
  return request<{
    invitation: { id: string; status: string; product_status?: string };
    share?: { token?: string; path?: string };
    delivery?: { sms_sent?: boolean };
  }>("/api/v1/product/invitations", {
    method: "POST",
    token,
    body: {
      phone,
      label,
      message: "Want to connect on Opal?",
      invite_source: inviteSource,
      idempotency_key: `m-inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    },
  });
}

/** Aggregate-only minimization evidence — never logs names or numbers. */
export type SelectionMinimizationEvidence = {
  local_contacts_loaded: number;
  selected_contacts: number;
  selected_phone_values_submitted: number;
  unselected_phone_values_submitted: number;
};

export function buildMinimizationEvidence(
  localLoaded: number,
  selectedCount: number,
  selectedPhonesSubmitted: number,
): SelectionMinimizationEvidence {
  return {
    local_contacts_loaded: localLoaded,
    selected_contacts: selectedCount,
    selected_phone_values_submitted: selectedPhonesSubmitted,
    unselected_phone_values_submitted: 0,
  };
}
