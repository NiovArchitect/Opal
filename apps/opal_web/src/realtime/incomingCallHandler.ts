/**
 * Phase 2 — route incoming_call pushes / channel events to the right UI.
 *
 * - Foreground + in the thread: in-app banner (accept/decline)
 * - Foreground elsewhere: full incoming call screen
 * - Background/locked: native host presents CallKit (Phase 3) from payload
 *
 * Payload already has caller name + avatar — no network fetch before ring UI.
 */

export type IncomingCallPayload = {
  type: "incoming_call";
  call_id: string;
  caller_id: string;
  caller_name: string;
  caller_avatar_url?: string;
  call_type: "audio" | "video" | string;
  conversation_id?: string | null;
  timestamp?: string;
};

export type IncomingCallPresentation =
  | { mode: "in_thread_banner"; payload: IncomingCallPayload; receivedAt: number }
  | { mode: "incoming_screen"; payload: IncomingCallPayload; receivedAt: number }
  | { mode: "native_callkit"; payload: IncomingCallPayload; receivedAt: number };

export type IncomingCallContext = {
  appState: "foreground" | "background" | "inactive";
  activeConversationId?: string | null;
  /** True when running inside Expo native host WebView. */
  nativeHost?: boolean;
};

export function isIncomingCallPayload(raw: unknown): raw is IncomingCallPayload {
  if (!raw || typeof raw !== "object") return false;
  const p = raw as Record<string, unknown>;
  return (
    p.type === "incoming_call" &&
    typeof p.call_id === "string" &&
    p.call_id.length > 0 &&
    typeof p.caller_name === "string"
  );
}

/**
 * Decide presentation mode. Logs timing from push receipt → present decision.
 */
export function routeIncomingCall(
  payload: IncomingCallPayload,
  ctx: IncomingCallContext,
  now = Date.now(),
): IncomingCallPresentation {
  const receivedAt = now;
  const pushTs = payload.timestamp ? Date.parse(payload.timestamp) : NaN;
  const lagMs = Number.isFinite(pushTs) ? receivedAt - pushTs : null;

  let presentation: IncomingCallPresentation;

  if (ctx.appState !== "foreground") {
    presentation = {
      mode: ctx.nativeHost ? "native_callkit" : "incoming_screen",
      payload,
      receivedAt,
    };
  } else if (
    ctx.activeConversationId &&
    payload.conversation_id &&
    ctx.activeConversationId === payload.conversation_id
  ) {
    presentation = { mode: "in_thread_banner", payload, receivedAt };
  } else {
    presentation = { mode: "incoming_screen", payload, receivedAt };
  }

  console.info("[opal-call] incoming_call routed", {
    call_id: payload.call_id,
    mode: presentation.mode,
    lag_ms: lagMs,
    appState: ctx.appState,
    present_within_2s: lagMs == null || lagMs < 2000,
  });

  return presentation;
}

/** Parse Expo / native push data bag (string values common). */
export function parseIncomingCallData(data: Record<string, unknown> | null | undefined): IncomingCallPayload | null {
  if (!data) return null;
  const normalized: Record<string, unknown> = { ...data };
  if (typeof normalized.type === "string" && normalized.type !== "incoming_call") return null;
  if (!normalized.type) normalized.type = "incoming_call";
  if (!isIncomingCallPayload(normalized)) return null;
  return normalized;
}

export type IncomingCallHandler = {
  present: (p: IncomingCallPresentation) => void;
};

let handler: IncomingCallHandler | null = null;

export function installIncomingCallHandler(next: IncomingCallHandler | null) {
  handler = next;
}

export function handleIncomingCallPush(
  data: Record<string, unknown>,
  ctx: IncomingCallContext,
  now = Date.now(),
): IncomingCallPresentation | null {
  const payload = parseIncomingCallData(data);
  if (!payload) return null;
  const presentation = routeIncomingCall(payload, ctx, now);
  const started = now;
  try {
    handler?.present(presentation);
  } finally {
    console.info("[opal-call] incoming_call present timing", {
      call_id: payload.call_id,
      present_ms: Date.now() - started,
      mode: presentation.mode,
    });
  }
  return presentation;
}
