/**
 * Phase 3 — CallKit via react-native-callkeep (Expo config plugin).
 *
 * Compatibility (documented for commit):
 * - Expo SDK 53 / RN 0.79.6
 * - react-native-callkeep requires a custom Dev Client rebuild (not Expo Go)
 * - If the native module is absent, we degrade to full-screen in-app UI
 *   (IncomingCallFallbackSurface) — never crash the host.
 *
 * VoIP push entitlement is ideal for locked-screen wake; until APNs VoIP is
 * configured, Expo high-priority notification + CallKeep displayIncomingCall
 * is the best path available without a separate PushKit certificate.
 */

export type IncomingCallKitPayload = {
  call_id: string;
  caller_id: string;
  caller_name: string;
  caller_avatar_url?: string;
  call_type: "audio" | "video" | string;
  conversation_id?: string | null;
  timestamp?: string;
};

type CallKeepModule = {
  setup: (options: Record<string, unknown>) => Promise<void> | void;
  displayIncomingCall: (
    uuid: string,
    handle: string,
    localizedCallerName: string,
    handleType: string,
    hasVideo: boolean,
  ) => void;
  answerEndCall: (uuid: string) => void;
  endCall: (uuid: string) => void;
  setMutedCall?: (uuid: string, muted: boolean) => void;
  addEventListener: (event: string, handler: (data: { callUUID?: string }) => void) => void;
  removeEventListener: (event: string) => void;
};

let callKeep: CallKeepModule | null = null;
let setupDone = false;
const uuidByCallId = new Map<string, string>();
const callIdByUuid = new Map<string, string>();

function loadCallKeep(): CallKeepModule | null {
  if (callKeep) return callKeep;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-callkeep");
    callKeep = (mod.default || mod) as CallKeepModule;
    return callKeep;
  } catch {
    return null;
  }
}

export function isCallKeepAvailable(): boolean {
  return loadCallKeep() != null;
}

export async function setupCallKeep(): Promise<boolean> {
  const ck = loadCallKeep();
  if (!ck || setupDone) return !!ck;
  try {
    await ck.setup({
      ios: {
        appName: "Opal",
        supportsVideo: true,
        maximumCallGroups: "1",
        maximumCallsPerCallGroup: "1",
      },
      android: {
        alertTitle: "Permissions required",
        alertDescription: "Opal needs phone account permission for calls",
        cancelButton: "Cancel",
        okButton: "OK",
        additionalPermissions: [],
      },
    });
    setupDone = true;
    return true;
  } catch (e) {
    console.warn("[opal-call] CallKeep setup failed — using in-app fallback", e);
    return false;
  }
}

function ensureUuid(callId: string): string {
  const existing = uuidByCallId.get(callId);
  if (existing) return existing;
  // call_sessions use binary_id UUIDs — reuse when valid, else map.
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    callId,
  )
    ? callId
    : `${callId.replace(/-/g, "").slice(0, 8).padEnd(8, "0")}-0000-4000-8000-${callId
        .replace(/-/g, "")
        .slice(0, 12)
        .padEnd(12, "0")}`;
  uuidByCallId.set(callId, uuid);
  callIdByUuid.set(uuid, callId);
  return uuid;
}

export async function displayIncomingCall(payload: IncomingCallKitPayload): Promise<boolean> {
  const ck = loadCallKeep();
  if (!ck) return false;
  await setupCallKeep();
  const uuid = ensureUuid(payload.call_id);
  try {
    ck.displayIncomingCall(
      uuid,
      payload.caller_id || payload.caller_name,
      payload.caller_name,
      "generic",
      payload.call_type === "video",
    );
    return true;
  } catch (e) {
    console.warn("[opal-call] displayIncomingCall failed", e);
    return false;
  }
}

export async function endCallKeep(callId: string): Promise<void> {
  const ck = loadCallKeep();
  if (!ck) return;
  const uuid = uuidByCallId.get(callId) || callId;
  try {
    ck.endCall(uuid);
  } catch {
    /* ignore */
  }
}

export function reportAnsweredElsewhere(callId: string): void {
  const ck = loadCallKeep();
  if (!ck) return;
  const uuid = uuidByCallId.get(callId) || callId;
  try {
    // Dismiss system UI when answered in-app.
    ck.answerEndCall?.(uuid);
  } catch {
    try {
      ck.endCall(uuid);
    } catch {
      /* ignore */
    }
  }
}

export type CallKeepHandlers = {
  onAnswer?: (callId: string) => void;
  onEnd?: (callId: string) => void;
  onMute?: (callId: string, muted: boolean) => void;
};

export function wireCallKeepEvents(handlers: CallKeepHandlers): () => void {
  const ck = loadCallKeep();
  if (!ck) return () => undefined;

  const answer = (data: { callUUID?: string }) => {
    const id = (data.callUUID && callIdByUuid.get(data.callUUID)) || data.callUUID;
    if (id) handlers.onAnswer?.(id);
  };
  const end = (data: { callUUID?: string }) => {
    const id = (data.callUUID && callIdByUuid.get(data.callUUID)) || data.callUUID;
    if (id) handlers.onEnd?.(id);
  };
  const mute = (data: { callUUID?: string; muted?: boolean }) => {
    const id = (data.callUUID && callIdByUuid.get(data.callUUID)) || data.callUUID;
    if (id) handlers.onMute?.(id, !!data.muted);
  };

  ck.addEventListener("answerCall", answer);
  ck.addEventListener("endCall", end);
  ck.addEventListener("didPerformSetMutedCallAction", mute as (data: { callUUID?: string }) => void);

  return () => {
    try {
      ck.removeEventListener("answerCall");
      ck.removeEventListener("endCall");
      ck.removeEventListener("didPerformSetMutedCallAction");
    } catch {
      /* ignore */
    }
  };
}
