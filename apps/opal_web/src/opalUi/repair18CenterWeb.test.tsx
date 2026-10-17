/**
 * Repair #18 (Division A, web) - Center IA + client discipline.
 *
 * Covers, through the real OpalCenterChat component with the API
 * mocked at the productClient boundary:
 * - the provider poll: arms only on the LATEST Opal message, backs
 *   off, caps out, uses the read-only GET (never the switch POST),
 *   drops stale fetches instead of painting a previous chat, and
 *   stops while the view is hidden
 * - switch discipline: exactly one switch call per deliberate action,
 *   zero calls when re-opening the active chat
 * - Center IA: first-class labeled Chats list + one-tap New chat, the
 *   open chat's title in the header, distinct fallback labels for
 *   untitled chats, and the composer destination pill
 * - per-chat draft + scroll restoration across switches
 * - rest-composer seeds land as a DRAFT in a NEW chat (never auto-sent)
 * - the backend throttle shape renders as "Not sent - tap to retry"
 *   with the user's words preserved in the composer
 * - granted location is posted through the existing /opal/location
 *   ingest on send; no grant, nothing is posted
 * - plan card + NowStrip contract helpers render only carried fields
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpalCenterChat, POLL_MAX_ATTEMPTS } from "./OpalCenterChat";
import { clientPlanFields } from "./graphReality";
import {
  attendanceLineFromContract,
  conflictLineFromContract,
} from "./planCardContract";
import {
  composeNowStrip,
  dayStripDetail,
  normalizeDayStripEvents,
} from "./centerNowStrip";
import { isRateLimitedSendError, opalConversationTitleError } from "../api/productClient";
import type {
  OpalChatConversation,
  OpalChatMessage,
  OpalChatSessionSummary,
} from "../api/productClient";

const getOpalConversation = vi.fn();
const postOpalMessage = vi.fn();
const startOpalNewChat = vi.fn();
const clearOpalConversation = vi.fn();
const listOpalChatSessions = vi.fn();
const createOpalChatSession = vi.fn();
const getOpalChatSession = vi.fn();
const postOpalSessionMessage = vi.fn();
const clearOpalChatSession = vi.fn();
const listRelationships = vi.fn();
const postOpalLocation = vi.fn();
const patchOpalConversationTitle = vi.fn();

vi.mock("../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../api/productClient")>(
    "../api/productClient",
  );
  return {
    ...actual,
    getOpalConversation: (...a: unknown[]) => getOpalConversation(...a),
    postOpalMessage: (...a: unknown[]) => postOpalMessage(...a),
    startOpalNewChat: (...a: unknown[]) => startOpalNewChat(...a),
    clearOpalConversation: (...a: unknown[]) => clearOpalConversation(...a),
    listOpalChatSessions: (...a: unknown[]) => listOpalChatSessions(...a),
    createOpalChatSession: (...a: unknown[]) => createOpalChatSession(...a),
    getOpalChatSession: (...a: unknown[]) => getOpalChatSession(...a),
    postOpalSessionMessage: (...a: unknown[]) => postOpalSessionMessage(...a),
    clearOpalChatSession: (...a: unknown[]) => clearOpalChatSession(...a),
    listRelationships: (...a: unknown[]) => listRelationships(...a),
    postOpalLocation: (...a: unknown[]) => postOpalLocation(...a),
    patchOpalConversationTitle: (...a: unknown[]) => patchOpalConversationTitle(...a),
  };
});

vi.mock("./opalCenterVoice", async () => {
  const actual = await vi.importActual<typeof import("./opalCenterVoice")>(
    "./opalCenterVoice",
  );
  return {
    ...actual,
    speakText: vi.fn(async () => undefined),
    listenOnce: vi.fn(async () => ({ status: "unavailable" as const, message: "no" })),
    probeMicPermission: vi.fn(async () => "prompt" as const),
    stopSpeaking: vi.fn(),
    stopListening: vi.fn(),
    isSttAvailable: () => false,
    isOnline: () => true,
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function msg(
  partial: Partial<OpalChatMessage> & Pick<OpalChatMessage, "id" | "role" | "body">,
  conv = "s1",
): OpalChatMessage {
  return {
    conversation_id: conv,
    inserted_at: new Date().toISOString(),
    metadata: null,
    ...partial,
  };
}

function conv(
  id: string,
  messages: OpalChatMessage[],
  title: string | null = null,
): OpalChatConversation {
  return { id, user_id: "u-a", title, messages };
}

function summary(
  partial: Partial<OpalChatSessionSummary> & { id: string },
): OpalChatSessionSummary {
  return {
    title: null,
    message_count: 1,
    last_message_preview: null,
    inserted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...partial,
  };
}

const queuedOpal = (id: string, convId = "s1") =>
  msg(
    {
      id,
      role: "opal",
      body: "Looking into it",
      metadata: { action_state: "queued", search_geography: "places" },
    },
    convId,
  );

let container: HTMLDivElement;
let root: Root;

async function flush(times = 6) {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

function q(testid: string): HTMLElement | null {
  return container.querySelector(`[data-testid="${testid}"]`);
}

async function click(el: HTMLElement | null) {
  expect(el).not.toBeNull();
  await act(async () => {
    el!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flush();
}

function setTextarea(el: HTMLTextAreaElement, value: string) {
  const proto = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  proto?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

async function typeDraft(text: string) {
  const input = q("opal-center-chat-input") as HTMLTextAreaElement;
  expect(input).toBeTruthy();
  await act(async () => {
    setTextarea(input, text);
  });
  await flush(2);
}

function setRenameInput(el: HTMLInputElement, value: string) {
  const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  proto?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

async function typeRename(text: string) {
  const input = q("center-chat-rename-input") as HTMLInputElement;
  expect(input).toBeTruthy();
  await act(async () => {
    setRenameInput(input, text);
  });
  await flush(2);
}

async function renderChat(props: Record<string, unknown> = {}) {
  await act(async () => {
    root.render(<OpalCenterChat onBack={() => undefined} bearer="tok" {...props} />);
  });
  await flush();
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  getOpalConversation.mockReset().mockResolvedValue({
    conversation: conv("s1", [msg({ id: "a1", role: "user", body: "first chat hello" })], "Weekend plans"),
  });
  postOpalMessage.mockReset().mockResolvedValue({ messages: [] });
  startOpalNewChat.mockReset().mockResolvedValue({ ok: true, cleared: true, conversation: conv("s1", []) });
  clearOpalConversation.mockReset().mockResolvedValue({ ok: true, cleared: true, conversation: conv("s1", []) });
  listOpalChatSessions.mockReset().mockResolvedValue({
    conversations: [
      summary({ id: "s1", title: "Weekend plans" }),
      summary({ id: "s2", title: "Gift ideas" }),
    ],
  });
  createOpalChatSession.mockReset().mockResolvedValue({ conversation: conv("s3", []) });
  getOpalChatSession.mockReset().mockImplementation(async (id: string) => ({
    conversation: conv(
      id,
      [msg({ id: `${id}-m1`, role: "user", body: `inside ${id}` }, id)],
      id === "s2" ? "Gift ideas" : "Weekend plans",
    ),
  }));
  postOpalSessionMessage.mockReset().mockResolvedValue({
    messages: [msg({ id: "r1", role: "opal", body: "session reply" })],
  });
  clearOpalChatSession.mockReset().mockResolvedValue({
    ok: true,
    cleared: true,
    deleted_messages: 1,
    conversation: conv("s1", []),
  });
  listRelationships.mockReset().mockResolvedValue({ contacts: [] });
  postOpalLocation.mockReset().mockResolvedValue({ ok: true });
  patchOpalConversationTitle.mockReset().mockImplementation(
    async (id: string, title: string) => ({
      ok: true,
      conversation: summary({ id, title }),
    }),
  );
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  localStorage.clear();
  sessionStorage.clear();
  vi.useRealTimers();
  Object.defineProperty(document, "hidden", { value: false, configurable: true });
});

describe("Repair #18 - provider poll discipline", () => {
  it("a stale queued message buried in history never arms the poll", async () => {
    vi.useFakeTimers();
    getOpalConversation.mockResolvedValue({
      conversation: conv("s1", [
        queuedOpal("old-queued"),
        msg({ id: "u2", role: "user", body: "later question" }),
        msg({ id: "o3", role: "opal", body: "plain answer" }),
      ]),
    });
    await renderChat();
    const afterLoad = getOpalConversation.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200_000);
    });
    expect(getOpalConversation.mock.calls.length).toBe(afterLoad);
    expect(getOpalChatSession).not.toHaveBeenCalled();
  });

  it("latest queued message: backoff, hard cap, reads only - never a switch call", async () => {
    vi.useFakeTimers();
    getOpalConversation.mockResolvedValue({
      conversation: conv("s1", [queuedOpal("q1")]),
    });
    await renderChat();
    const afterLoad = getOpalConversation.mock.calls.length;

    // First poll is not immediate: nothing before 1.8s.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1799);
    });
    expect(getOpalConversation.mock.calls.length).toBe(afterLoad);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(getOpalConversation.mock.calls.length).toBe(afterLoad + 1);

    // Backoff: the next poll waits 3.6s, not another 1.8s.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3599);
    });
    expect(getOpalConversation.mock.calls.length).toBe(afterLoad + 1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(getOpalConversation.mock.calls.length).toBe(afterLoad + 2);

    // Long horizon: the poll caps out and goes quiet for good.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600_000);
    });
    const capped = getOpalConversation.mock.calls.length - afterLoad;
    expect(capped).toBeGreaterThan(2);
    expect(capped).toBeLessThanOrEqual(POLL_MAX_ATTEMPTS);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600_000);
    });
    expect(getOpalConversation.mock.calls.length).toBe(afterLoad + capped);
    // The poll NEVER touches the switch endpoint.
    expect(getOpalChatSession).not.toHaveBeenCalled();
  });

  it("polling stops while the view is hidden and resumes on return", async () => {
    vi.useFakeTimers();
    getOpalConversation.mockResolvedValue({
      conversation: conv("s1", [queuedOpal("q1")]),
    });
    await renderChat();
    const afterLoad = getOpalConversation.mock.calls.length;

    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(getOpalConversation.mock.calls.length).toBe(afterLoad);

    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1800);
    });
    expect(getOpalConversation.mock.calls.length).toBe(afterLoad + 1);
  });

  it("a poll fetch that resolves after a switch never paints the old chat", async () => {
    vi.useFakeTimers();
    let resolvePoll!: (v: unknown) => void;
    const pollPromise = new Promise((r) => {
      resolvePoll = r;
    });
    getOpalConversation
      .mockReset()
      .mockResolvedValueOnce({ conversation: conv("s1", [queuedOpal("q1")]) })
      .mockReturnValueOnce(pollPromise);
    await renderChat();
    // Arm and fire the poll; its fetch stays in flight.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1800);
    });
    expect(getOpalConversation.mock.calls.length).toBe(2);

    // The user deliberately switches to s2 while the poll is in flight.
    vi.useRealTimers();
    await click(q("center-chats-button"));
    await click(q("opal-center-session-s2"));
    expect(container.textContent).toContain("inside s2");

    // The stale s1 fetch finally resolves - it must be dropped.
    await act(async () => {
      resolvePoll({
        conversation: conv("s1", [msg({ id: "stale", role: "opal", body: "STALE PAINT" })]),
      });
      await Promise.resolve();
    });
    await flush();
    expect(container.textContent).not.toContain("STALE PAINT");
    expect(container.textContent).toContain("inside s2");
  });
});

describe("Repair #18 - switch discipline and Center IA", () => {
  it("first-class Chats list: one switch call per tap, zero on re-opening the active chat", async () => {
    await renderChat();
    // The list is one tap from a labeled button - no icon menu first.
    expect(q("center-chats-button")?.textContent).toContain("Chats");
    expect(q("center-new-chat")).not.toBeNull();
    await click(q("center-chats-button"));
    expect(q("opal-center-sessions")).not.toBeNull();
    expect(q("opal-center-sessions-keep-note")?.textContent).toContain(
      "Your current chat stays in the list",
    );

    await click(q("opal-center-session-s2"));
    expect(getOpalChatSession).toHaveBeenCalledTimes(1);
    expect(getOpalChatSession).toHaveBeenCalledWith("s2", "tok");
    expect(container.textContent).toContain("inside s2");
    // The open chat shows its title, and the composer names its target.
    expect(q("center-chat-title")?.textContent).toContain("Gift ideas");
    expect(q("center-destination-pill")?.textContent).toContain("In: Gift ideas");

    // Re-opening the active chat is zero additional calls.
    await click(q("center-chats-button"));
    await click(q("opal-center-session-s2"));
    expect(getOpalChatSession).toHaveBeenCalledTimes(1);
  });

  it("untitled sessions get distinct fallback labels, never a stack of identical rows", async () => {
    listOpalChatSessions.mockResolvedValue({
      conversations: [
        summary({
          id: "s1",
          title: null,
          last_message_preview: null,
          inserted_at: "2026-10-15T09:00:00.000Z",
          updated_at: "2026-10-15T09:00:00.000Z",
        }),
        summary({
          id: "s2",
          title: null,
          last_message_preview: null,
          inserted_at: "2026-10-15T17:30:00.000Z",
          updated_at: "2026-10-15T17:30:00.000Z",
        }),
      ],
    });
    getOpalConversation.mockResolvedValue({ conversation: conv("s1", [], null) });
    await renderChat();
    await click(q("center-chats-button"));
    const l1 = q("opal-center-session-s1")?.textContent || "";
    const l2 = q("opal-center-session-s2")?.textContent || "";
    expect(l1).toContain("Chat on");
    expect(l2).toContain("Chat on");
    expect(l1).not.toBe(l2);
    expect(l1).not.toContain("New chat");
    expect(l2).not.toContain("New chat");
  });

  it("switching chats preserves each chat's own draft", async () => {
    await renderChat();
    await typeDraft("draft for one");
    await click(q("center-chats-button"));
    await click(q("opal-center-session-s2"));
    const input = q("opal-center-chat-input") as HTMLTextAreaElement;
    expect(input.value).toBe("");
    await typeDraft("draft for two");
    await click(q("center-chats-button"));
    await click(q("opal-center-session-s1"));
    expect((q("opal-center-chat-input") as HTMLTextAreaElement).value).toBe("draft for one");
    await click(q("center-chats-button"));
    await click(q("opal-center-session-s2"));
    expect((q("opal-center-chat-input") as HTMLTextAreaElement).value).toBe("draft for two");
  });

  it("switching chats restores the scroll position the user left", async () => {
    await renderChat();
    // Let the initial programmatic bottom-pin window close so the
    // scroll below registers as the user's own position.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });
    const thread = q("opal-center-chat-thread") as HTMLDivElement;
    Object.defineProperty(thread, "scrollHeight", { value: 2000, configurable: true });
    Object.defineProperty(thread, "clientHeight", { value: 200, configurable: true });
    thread.scrollTop = 300;
    await act(async () => {
      thread.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    await flush(2);
    await click(q("center-chats-button"));
    await click(q("opal-center-session-s2"));
    await click(q("center-chats-button"));
    await click(q("opal-center-session-s1"));
    // Restoration lands after paint (rAF + settle timer).
    await act(async () => {
      await new Promise((r) => setTimeout(r, 160));
    });
    const back = q("opal-center-chat-thread") as HTMLDivElement;
    expect(back.scrollTop).toBe(300);
  });
});

describe("Repair #18 - chat rename", () => {
  it("happy path: PATCH once with the trimmed title; header and list show the returned title", async () => {
    await renderChat();
    const listCallsAfterLoad = listOpalChatSessions.mock.calls.length;
    const convCallsAfterLoad = getOpalConversation.mock.calls.length;

    await click(q("center-chat-rename-button"));
    const input = q("center-chat-rename-input") as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe("Weekend plans");

    await typeRename("  Beach day plans  ");
    await click(q("center-chat-rename-save"));

    expect(patchOpalConversationTitle).toHaveBeenCalledTimes(1);
    expect(patchOpalConversationTitle).toHaveBeenCalledWith("s1", "Beach day plans", "tok");
    // Re-render came from the returned summary: no second fetch of
    // either the sessions list or the conversation.
    expect(listOpalChatSessions.mock.calls.length).toBe(listCallsAfterLoad);
    expect(getOpalConversation.mock.calls.length).toBe(convCallsAfterLoad);
    expect(q("center-chat-rename")).toBeNull();
    expect(q("center-chat-title")?.textContent).toContain("Beach day plans");
    expect(q("center-destination-pill")?.textContent).toContain("Beach day plans");

    // The chats list row for this chat reflects the same returned title.
    await click(q("center-chats-button"));
    expect(q("opal-center-session-s1")?.textContent).toContain("Beach day plans");
    expect(q("opal-center-session-s2")?.textContent).toContain("Gift ideas");
  });

  it("blank title is blocked client-side: no PATCH, editor stays open with the text intact", async () => {
    await renderChat();
    await click(q("center-chat-rename-button"));
    await typeRename("   ");
    await click(q("center-chat-rename-save"));

    expect(patchOpalConversationTitle).not.toHaveBeenCalled();
    expect(q("center-chat-rename-error")?.textContent).toContain("can't be blank");
    const input = q("center-chat-rename-input") as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe("   ");
  });

  it("a 422 shows the server's message inline, keeps the editor open, and the old title stands", async () => {
    expect(
      opalConversationTitleError({ errors: { title: ["can't be blank"] } }),
    ).toBe("can't be blank");
    expect(opalConversationTitleError(new Error("boom"))).toBeNull();
    patchOpalConversationTitle.mockReset().mockRejectedValueOnce(
      Object.assign(new Error("invalid"), {
        code: "invalid",
        status: 422,
        errors: { title: ["should be at most 120 character(s)"] },
      }),
    );
    await renderChat();
    await click(q("center-chat-rename-button"));
    await typeRename("A fine new title");
    await click(q("center-chat-rename-save"));

    expect(patchOpalConversationTitle).toHaveBeenCalledTimes(1);
    expect(q("center-chat-rename-error")?.textContent).toContain(
      "should be at most 120 character(s)",
    );
    const input = q("center-chat-rename-input") as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe("A fine new title");

    // The unaccepted title is displayed nowhere: cancel back to the
    // old title in the header and in the list row.
    await click(q("center-chat-rename-cancel"));
    expect(q("center-chat-title")?.textContent).toContain("Weekend plans");
    expect(q("center-chat-title")?.textContent).not.toContain("A fine new title");
    await click(q("center-chats-button"));
    expect(q("opal-center-session-s1")?.textContent).toContain("Weekend plans");
  });

  it("a server failure keeps the old title in the header and the list", async () => {
    patchOpalConversationTitle.mockReset().mockRejectedValueOnce(new Error("boom"));
    await renderChat();
    // Tapping the title itself also opens the editor.
    await click(q("center-chat-title"));
    expect(q("center-chat-rename-input")).toBeTruthy();
    await typeRename("Doomed rename");
    await click(q("center-chat-rename-save"));

    expect(patchOpalConversationTitle).toHaveBeenCalledTimes(1);
    expect(q("center-chat-rename-error")?.textContent).toContain(
      "Could not rename this chat",
    );
    await click(q("center-chat-rename-cancel"));
    expect(q("center-chat-title")?.textContent).toContain("Weekend plans");
    expect(q("center-chat-title")?.textContent).not.toContain("Doomed rename");
    await click(q("center-chats-button"));
    expect(q("opal-center-session-s1")?.textContent).toContain("Weekend plans");
    expect(q("opal-center-session-s1")?.textContent).not.toContain("Doomed rename");
  });

  it("cancel restores: no PATCH, the old title is back, and reopening prefills it", async () => {
    await renderChat();
    await click(q("center-chat-rename-button"));
    await typeRename("Typed but abandoned");
    await click(q("center-chat-rename-cancel"));

    expect(patchOpalConversationTitle).not.toHaveBeenCalled();
    expect(q("center-chat-rename")).toBeNull();
    expect(q("center-chat-title")?.textContent).toContain("Weekend plans");

    await click(q("center-chat-rename-button"));
    expect((q("center-chat-rename-input") as HTMLInputElement).value).toBe(
      "Weekend plans",
    );
  });
});

describe("Repair #18 - rest seeds are drafts in a new chat", () => {
  it("a seed creates a new chat and sits in its composer - nothing is sent", async () => {
    await renderChat({
      initialMessage: "Ideas for tonight nearby",
      seedAsDraft: true,
      initialChatIntent: "new",
    });
    expect(createOpalChatSession).toHaveBeenCalledTimes(1);
    expect(createOpalChatSession).toHaveBeenCalledWith("tok");
    expect(postOpalMessage).not.toHaveBeenCalled();
    expect(postOpalSessionMessage).not.toHaveBeenCalled();
    const input = q("opal-center-chat-input") as HTMLTextAreaElement;
    expect(input.value).toBe("Ideas for tonight nearby");
    // The previous chat's messages are not blended into the new one.
    expect(container.textContent).not.toContain("first chat hello");
    expect(q("center-destination-pill")?.textContent).toContain("In:");
  });

  it("rest surface wiring: chips and composer hand seeds to the chat as new-chat drafts (source)", async () => {
    const { readFileSync } = await import("fs");
    const { resolve } = await import("path");
    const src = readFileSync(resolve(__dirname, "OpalCenterLifeGraph.tsx"), "utf8");
    expect(src).toMatch(/seedAsDraft/);
    expect(src).toMatch(/initialChatIntent="new"/);
    expect(src).toMatch(/data-testid="center-destination-pill"/);
    expect(src).toMatch(/New chat/);
  });
});

describe("Repair #18 - honest send failures", () => {
  it("the throttle shape renders 'Not sent - tap to retry' and preserves the words", async () => {
    const throttleError = Object.assign(new Error("Too many tries"), {
      code: "rate_limited",
      status: 429,
      sent: false,
      retryable: true,
      clientAction: "retry_send",
    });
    expect(isRateLimitedSendError(throttleError)).toBe(true);
    expect(isRateLimitedSendError(new Error("boom"))).toBe(false);
    postOpalSessionMessage.mockReset().mockRejectedValueOnce(throttleError);
    await renderChat();
    await typeDraft("change dinner to 8pm");
    await click(q("opal-center-chat-send"));
    await flush();

    const errBtn = q("opal-center-chat-send-error");
    expect(errBtn?.textContent).toContain("Not sent - tap to retry");
    expect(errBtn?.getAttribute("data-failure")).toBe("throttled");
    // The user's words are back in the composer, not silently eaten.
    expect((q("opal-center-chat-input") as HTMLTextAreaElement).value).toBe(
      "change dinner to 8pm",
    );

    // Retry succeeds: the error clears and the restored draft copy goes.
    postOpalSessionMessage.mockResolvedValue({
      messages: [
        msg({ id: "u9", role: "user", body: "change dinner to 8pm" }),
        msg({ id: "o9", role: "opal", body: "Done - 8 PM." }),
      ],
    });
    await click(errBtn);
    await flush();
    expect(q("opal-center-chat-send-error")).toBeNull();
    expect((q("opal-center-chat-input") as HTMLTextAreaElement).value).toBe("");
    expect(container.textContent).toContain("Done - 8 PM.");
  });
});

describe("Repair #18 - location wiring", () => {
  // Order matters in this block: deviceLocation keeps an in-memory
  // cache of the last granted fix for the life of the module, so the
  // no-grant case runs before any grant is cached.
  it("no granted location cached: nothing is posted, the send still works", async () => {
    await renderChat();
    await typeDraft("hello opal");
    await click(q("opal-center-chat-send"));
    await flush();
    expect(postOpalLocation).not.toHaveBeenCalled();
    expect(postOpalSessionMessage).toHaveBeenCalled();
  });

  it("granted location is posted through the existing ingest on send", async () => {
    sessionStorage.setItem(
      "opal.device.coords.v1",
      JSON.stringify({ lat: 32.9, lng: -117.1, accuracy: 20, at: Date.now() }),
    );
    await renderChat();
    await typeDraft("what is nearby?");
    await click(q("opal-center-chat-send"));
    await flush();
    expect(postOpalLocation).toHaveBeenCalledTimes(1);
    expect(postOpalLocation).toHaveBeenCalledWith(
      { lat: 32.9, lon: -117.1, accuracy_m: 20 },
      "tok",
    );
    expect(postOpalSessionMessage).toHaveBeenCalled();
  });
});

describe("Repair #18 - plan card and NowStrip contracts", () => {
  it("attendance renders only from carried counts", () => {
    expect(
      attendanceLineFromContract({ going_count: 3, total_count: 4, interested_count: 1 }),
    ).toBe("3 of 4 going - 1 interested");
    expect(attendanceLineFromContract({ going_count: 4, total_count: 4 })).toBe(
      "4 of 4 going",
    );
    // No participant rows on the backend means NO count fields - and
    // the client must not invent one from anything else.
    expect(attendanceLineFromContract({})).toBeNull();
    expect(attendanceLineFromContract({ going_count: 0, total_count: 0 })).toBeNull();
    expect(attendanceLineFromContract(null)).toBeNull();
  });

  it("conflict renders only from the carried conflict object", () => {
    expect(
      conflictLineFromContract({
        conflict: { with_plan_id: "p2", title: "Juniper crew", time_label: "7:30 PM" },
      }),
    ).toBe("This overlaps with Juniper crew at 7:30 PM.");
    expect(conflictLineFromContract({ conflict: { title: "Crew night" } })).toBe(
      "This overlaps with Crew night.",
    );
    expect(conflictLineFromContract({ conflict: null })).toBeNull();
    expect(conflictLineFromContract({})).toBeNull();
  });

  it("clientPlanFields carries attendance and conflict untouched", () => {
    const fields = clientPlanFields(
      {
        lineage_id: "plan-1",
        place: "Juniper and Ivy",
        when_label: "Thu - 7:30 PM",
        going_count: 3,
        interested_count: 1,
        total_count: 4,
        viewer_state: "accepted",
        conflict: { with_plan_id: "plan-2", title: "Crew night", time_label: "7:30 PM" },
      },
      "conv-1",
    );
    expect(fields?.going_count).toBe(3);
    expect(fields?.total_count).toBe(4);
    expect(fields?.viewer_state).toBe("accepted");
    expect(fields?.conflict?.title).toBe("Crew night");
    expect(attendanceLineFromContract(fields)).toBe("3 of 4 going - 1 interested");
    expect(conflictLineFromContract(fields)).toBe(
      "This overlaps with Crew night at 7:30 PM.",
    );
  });

  it("NowStrip nodes render who/where from the contract fixtures", () => {
    const events = normalizeDayStripEvents([
      {
        id: "plan-1",
        title: "Dinner at Nighthawk",
        start_at: "2026-10-17T19:30:00.000Z",
        end_at: "2026-10-17T21:00:00.000Z",
        who: ["Maya", "Jordan"],
        where: "Nighthawk, North Park",
      },
      {
        id: "plan-2",
        title: "Solo focus",
        start_at: "2026-10-17T22:00:00.000Z",
        end_at: "2026-10-17T23:00:00.000Z",
        who: [],
        where: null,
      },
    ]);
    expect(events[0].who).toEqual(["Maya", "Jordan"]);
    expect(events[0].where).toBe("Nighthawk, North Park");
    expect(dayStripDetail(events[0])).toBe("with Maya, Jordan - Nighthawk, North Park");
    // A solo plan renders its title alone - no companion is invented.
    expect(dayStripDetail(events[1])).toBeNull();

    const strip = composeNowStrip({
      nowMs: Date.parse("2026-10-17T18:00:00.000Z"),
      events,
      source: "plans",
    });
    const dinner = strip.nodes.find((n) => n.label === "Dinner at Nighthawk");
    expect(dinner?.detail).toBe("with Maya, Jordan - Nighthawk, North Park");
    const solo = strip.nodes.find((n) => n.label === "Solo focus");
    expect(solo?.detail).toBeUndefined();
  });
});
