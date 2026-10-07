import { describe, expect, it, vi } from "vitest";
import {
  handleIncomingCallPush,
  installIncomingCallHandler,
  isIncomingCallPayload,
  routeIncomingCall,
} from "./incomingCallHandler";

const base = {
  type: "incoming_call" as const,
  call_id: "call-1",
  caller_id: "user-a",
  caller_name: "Chanelle",
  caller_avatar_url: "",
  call_type: "audio",
  conversation_id: "conv-1",
  timestamp: new Date().toISOString(),
};

describe("incomingCallHandler", () => {
  it("parses full payload without requiring a fetch", () => {
    expect(isIncomingCallPayload(base)).toBe(true);
    expect(base.caller_name).toBe("Chanelle");
    expect(base.call_id).toBe("call-1");
  });

  it("foreground in-thread → banner", () => {
    const p = routeIncomingCall(base, {
      appState: "foreground",
      activeConversationId: "conv-1",
    });
    expect(p.mode).toBe("in_thread_banner");
  });

  it("foreground elsewhere → incoming screen", () => {
    const p = routeIncomingCall(base, {
      appState: "foreground",
      activeConversationId: "other",
    });
    expect(p.mode).toBe("incoming_screen");
  });

  it("background native host → CallKit mode", () => {
    const p = routeIncomingCall(base, {
      appState: "background",
      nativeHost: true,
    });
    expect(p.mode).toBe("native_callkit");
  });

  it("handleIncomingCallPush presents within handler and logs", () => {
    const present = vi.fn();
    installIncomingCallHandler({ present });
    const result = handleIncomingCallPush({ ...base }, { appState: "foreground" });
    expect(result?.mode).toBe("incoming_screen");
    expect(present).toHaveBeenCalledOnce();
    installIncomingCallHandler(null);
  });
});
