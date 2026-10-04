/**
 * Call lifecycle is keyed by call id.
 * Assist does not accept, decline, cancel, or clear a call.
 * A late event for an older call cannot change the call now on screen.
 */

export type LiveCallSurface = {
  liveCallId?: string;
  liveCallStatus?: string;
  direction?: "incoming" | "outgoing";
  locallyAccepted?: boolean;
  liveCallerUserId?: string;
  liveCalleeUserId?: string;
  kind: "incoming" | "audio" | "video" | "group";
  peerName: string;
  isGroup?: boolean;
  peerAvatarSrc?: string;
  memberCount?: number;
  participants?: string[];
};

export type CallNote = { callId: string; text: string } | null;

export type CallInboxEvent = {
  event: string;
  call_id?: string;
  from_user_id?: string;
  reason?: string;
};

const terminalCopy: Record<string, string> = {
  declined: "Declined",
  canceled: "Canceled",
  missed: "Missed",
};

export function applyCallInbox(input: {
  surface: LiveCallSurface | null;
  note: CallNote;
  event: CallInboxEvent;
  me?: string;
  peerName?: string;
}): { surface: LiveCallSurface | null; note: CallNote } {
  const { surface, note, event, me, peerName } = input;
  const callId = event.call_id;
  if (!callId) return { surface, note };

  if (event.event === "ringing" && event.from_user_id) {
    if (event.from_user_id === me) return { surface, note };
    if (surface?.liveCallId === callId) return { surface, note: null };
    if (surface?.liveCallStatus === "answered" && surface.liveCallId !== callId) {
      return { surface, note };
    }
    return {
      note: null,
      surface: {
        kind: "incoming",
        direction: "incoming",
        peerName: peerName || "Incoming call",
        liveCallId: callId,
        liveCallStatus: "ringing",
        liveCallerUserId: event.from_user_id,
        liveCalleeUserId: me,
        locallyAccepted: false,
      },
    };
  }

  if (event.event === "answered") {
    if (!surface || surface.liveCallId !== callId) return { surface, note };
    return { note, surface: { ...surface, liveCallStatus: "answered" } };
  }

  if (event.event === "ended") {
    if (surface?.liveCallId && surface.liveCallId !== callId) return { surface, note };
    const text = event.reason ? terminalCopy[event.reason] : undefined;
    return {
      surface: surface?.liveCallId === callId ? null : surface,
      note: text ? { callId, text } : null,
    };
  }

  return { surface, note };
}

/** A terminal note belongs to one call. A different live call must not show it. */
export function noteForCall(note: CallNote, liveCallId?: string): string | null {
  if (!note) return null;
  if (liveCallId && note.callId !== liveCallId) return null;
  return note.text;
}
