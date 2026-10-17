/**
 * Repair #17 W5 — Opal chat sessions UI, live Center strip, settings
 * continuation. All API calls mocked at the productClient boundary; the
 * assumed session REST shapes live in productClient (see TRACK doc).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpalCenterChat } from "./OpalCenterChat";
import { sessionRowLabel, sessionRowTime } from "./OpalChatSessionsDrawer";
import {
  composeNowStrip,
  planEventsForToday,
  EMPTY_DAY_ATTRIBUTION,
  PLANS_DAY_ATTRIBUTION,
} from "./centerNowStrip";
import { filterYouHubSections } from "./youHubSearch";
import {
  formatConnectionSyncTime,
  projectGoogleConnection,
} from "./YouSettingsDestination";
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

function conv(id: string, messages: OpalChatMessage[]): OpalChatConversation {
  return { id, user_id: "u-a", title: null, messages };
}

function summary(partial: Partial<OpalChatSessionSummary> & { id: string }): OpalChatSessionSummary {
  return {
    title: null,
    message_count: 1,
    last_message_preview: null,
    inserted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...partial,
  };
}

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

beforeEach(() => {
  localStorage.clear();
  getOpalConversation.mockReset().mockResolvedValue({
    conversation: conv("s1", [msg({ id: "a1", role: "user", body: "first chat hello" })]),
  });
  postOpalMessage.mockReset().mockResolvedValue({ messages: [] });
  startOpalNewChat.mockReset().mockResolvedValue({ ok: true, cleared: true, conversation: conv("s1", []) });
  clearOpalConversation.mockReset().mockResolvedValue({ ok: true, cleared: true, conversation: conv("s1", []) });
  listOpalChatSessions.mockReset().mockResolvedValue({
    conversations: [
      summary({ id: "s1", title: "Weekend plans" }),
      summary({ id: "s2", title: null, last_message_preview: "gift ideas for mom" }),
    ],
  });
  createOpalChatSession.mockReset().mockResolvedValue({ conversation: conv("s3", []) });
  getOpalChatSession.mockReset().mockImplementation(async (id: string) => ({
    conversation: conv(id, [msg({ id: `${id}-m1`, role: "user", body: `inside ${id}` }, id)]),
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
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  localStorage.clear();
});

async function renderChat() {
  await act(async () => {
    root.render(<OpalCenterChat onBack={() => undefined} bearer="tok" />);
  });
  await flush();
}

describe("Repair #17 W5 — Opal chat sessions UI", () => {
  it("drawer lists real sessions, marks the loaded conversation current", async () => {
    await renderChat();
    await click(q("opal-center-chat-menu"));
    await click(q("opal-center-chat-sessions"));
    expect(q("opal-center-sessions")).not.toBeNull();
    const s1 = q("opal-center-session-s1");
    const s2 = q("opal-center-session-s2");
    expect(s1?.textContent).toContain("Weekend plans");
    expect(s1?.getAttribute("data-active")).toBe("true");
    // Untitled session falls back to its own last-message preview.
    expect(s2?.textContent).toContain("gift ideas for mom");
  });

  it("switching sessions loads that session's messages from the API", async () => {
    await renderChat();
    await click(q("opal-center-chat-menu"));
    await click(q("opal-center-chat-sessions"));
    await click(q("opal-center-session-s2"));
    expect(getOpalChatSession).toHaveBeenCalledWith("s2", "tok");
    expect(container.textContent).toContain("inside s2");
    expect(q("opal-center-sessions")).toBeNull();
  });

  it("sends route to the active session endpoint once sessions are live", async () => {
    await renderChat();
    const input = q("opal-center-chat-input") as HTMLTextAreaElement;
    const proto = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
    await act(async () => {
      proto?.set?.call(input, "hello session");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await click(q("opal-center-chat-send"));
    expect(postOpalSessionMessage).toHaveBeenCalled();
    expect(postOpalSessionMessage.mock.calls[0][0]).toBe("s1");
    expect(postOpalMessage).not.toHaveBeenCalled();
  });

  it("New chat creates a real session and switches to it empty", async () => {
    await renderChat();
    await click(q("opal-center-chat-menu"));
    await click(q("opal-center-chat-new"));
    expect(createOpalChatSession).toHaveBeenCalledWith("tok");
    expect(container.textContent).not.toContain("first chat hello");
    // The new session is now the send target.
    const input = q("opal-center-chat-input") as HTMLTextAreaElement;
    const proto = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
    await act(async () => {
      proto?.set?.call(input, "fresh start");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await click(q("opal-center-chat-send"));
    expect(postOpalSessionMessage.mock.calls[0][0]).toBe("s3");
  });

  it("Clear is a plain-language confirm, then a real server clear", async () => {
    await renderChat();
    await click(q("opal-center-chat-menu"));
    await click(q("opal-center-chat-clear"));
    const bar = q("opal-center-chat-clear-confirm");
    expect(bar?.textContent).toContain("Every message in this conversation will be deleted");
    expect(bar?.textContent).toContain("Plans you made stay");
    // Nothing deleted before the confirm tap.
    expect(clearOpalChatSession).not.toHaveBeenCalled();
    await click(q("opal-center-chat-clear-confirm-btn"));
    expect(clearOpalChatSession).toHaveBeenCalledWith("s1", "tok");
    expect(container.textContent).not.toContain("first chat hello");
  });

  it("Clear failure is honest: messages stay and the error says nothing was deleted", async () => {
    clearOpalChatSession.mockRejectedValueOnce(new Error("boom"));
    await renderChat();
    await click(q("opal-center-chat-menu"));
    await click(q("opal-center-chat-clear"));
    await click(q("opal-center-chat-clear-confirm-btn"));
    expect(q("opal-center-chat-clear-error")?.textContent).toContain("Nothing was deleted");
    expect(container.textContent).toContain("first chat hello");
    // Cancel path also exists and deletes nothing.
    await click(q("opal-center-chat-clear-cancel"));
    expect(q("opal-center-chat-clear-confirm")).toBeNull();
  });

  it("sessions list failure: drawer reports it with retry, chat keeps working on legacy path", async () => {
    listOpalChatSessions.mockReset().mockRejectedValue(new Error("404"));
    await renderChat();
    expect(container.textContent).toContain("first chat hello");
    await click(q("opal-center-chat-menu"));
    await click(q("opal-center-chat-sessions"));
    expect(q("opal-center-sessions-error")?.textContent).toContain("Couldn't load your chats");
    expect(q("opal-center-sessions-retry")).not.toBeNull();
  });

  it("session row helpers: label precedence and time honesty", () => {
    expect(sessionRowLabel(summary({ id: "x", title: "T", last_message_preview: "p" }))).toBe("T");
    expect(sessionRowLabel(summary({ id: "x", last_message_preview: "p" }))).toBe("p");
    expect(sessionRowLabel(summary({ id: "x" }))).toBe("New chat");
    expect(sessionRowTime(summary({ id: "x", updated_at: "not-a-date" }))).toBe("");
    expect(sessionRowTime(summary({ id: "x", updated_at: null, inserted_at: null }))).toBe("");
  });
});

describe("Repair #17 W5 — Center strip from live plans data", () => {
  // 2026-10-17 is a Saturday.
  const saturday = new Date(2026, 9, 17, 9, 0, 0);

  it("places only plans that prove they are today with an explicit time", () => {
    const events = planEventsForToday(
      [
        { id: "p1", title: "Dinner", status: "ready", time_label: "Sat 7:30 PM" },
        { id: "p2", title: "Brunch", status: "ready", time_label: "Sunday 11:00 AM" },
        { id: "p3", title: "Vague", status: "ready", time_label: "Saturday after 10" },
        { id: "p4", title: "Open", status: "ready", time_label: "Open window" },
        { id: "p5", title: "Gone", status: "cancelled", time_label: "Sat 5:00 PM" },
        { id: "p6", title: "Tonight thing", status: "forming", time_label: "Tonight 8 PM" },
      ],
      saturday,
    );
    expect(events.map((e) => e.title)).toEqual(["Dinner", "Tonight thing"]);
    expect(events[0].startMs).toBe(new Date(2026, 9, 17, 19, 30).getTime());
  });

  it("strip composition: plans source attribution and honest empty state", () => {
    const events = planEventsForToday(
      [{ id: "p1", title: "Dinner", status: "ready", time_label: "Sat 7:30 PM" }],
      saturday,
    );
    const withPlans = composeNowStrip({ nowMs: saturday.getTime(), events, source: "plans" });
    expect(withPlans.attribution).toBe(PLANS_DAY_ATTRIBUTION);
    expect(withPlans.nodes.map((n) => n.label)).toEqual(["Open", "Dinner"]);
    expect(withPlans.nodes[1].time).toContain("7:30");

    const empty = composeNowStrip({ nowMs: saturday.getTime(), events: [], source: "none" });
    expect(empty.attribution).toBe(EMPTY_DAY_ATTRIBUTION);
    expect(empty.nodes).toEqual([{ id: "now", time: "Now", label: "Open", kind: "now" }]);
  });

  it("source guard: the Center render path never paints the sample day", async () => {
    const { readFileSync } = await import("fs");
    const { resolve } = await import("path");
    const src = readFileSync(
      resolve(__dirname, "OpalCenterLifeGraph.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/sampleDayEventsFor/);
    expect(src).toMatch(/listOpalPlans/);
    expect(src).toMatch(/planEventsForToday/);
    expect(src).toMatch(/fetchCalendarToday/);
  });
});

describe("Repair #17 W5 — settings continuation", () => {
  const sections = [
    {
      id: "world",
      label: "Your World",
      rows: [
        { key: "feed-discovery", title: "Feed & discovery", subtitle: "Your world and what could enrich it" },
        { key: "location-travel", title: "Location & travel", subtitle: "How Opal handles travel timing" },
      ],
    },
    {
      id: "account",
      label: "Your Account",
      rows: [
        { key: "account-security", title: "Account & security", subtitle: "Sign-in, sessions, delete" },
      ],
    },
  ];

  it("hub search filters real destinations and drops empty sections", () => {
    const travel = filterYouHubSections(sections, "travel");
    expect(travel).toHaveLength(1);
    expect(travel[0].rows.map((r) => r.key)).toEqual(["location-travel"]);
    const none = filterYouHubSections(sections, "zzz-no-match");
    expect(none).toEqual([]);
    // Empty query is the identity: the full hub, unchanged.
    expect(filterYouHubSections(sections, "  ")).toEqual(sections);
    // Section label and subtitle are searchable too.
    expect(filterYouHubSections(sections, "sign-in")[0].rows[0].key).toBe("account-security");
  });

  it("hub search is wired into the You pane with an honest empty state", async () => {
    const { readFileSync } = await import("fs");
    const { resolve } = await import("path");
    const app = readFileSync(resolve(__dirname, "../OpalApp.tsx"), "utf8");
    expect(app).toMatch(/data-testid="you-hub-search"/);
    expect(app).toMatch(/filterYouHubSections\(YOU_HUB_SECTIONS, youSearch\)/);
    expect(app).toMatch(/data-testid="you-hub-search-empty"/);
    expect(app).toMatch(/No settings match/);
  });

  it("connected-source projection surfaces a real last-sync time only when reported", () => {
    const base = {
      provider: "google_calendar",
      connected: true,
      status: "connected",
      scopes: [],
      token_present: true,
    };
    const withSync = projectGoogleConnection({
      ...base,
      last_synced_at: "2026-10-17T15:02:00Z",
    });
    expect(withSync.detail).toContain("Last checked");
    const without = projectGoogleConnection({ ...base, last_synced_at: null });
    expect(without.detail).not.toContain("Last checked");
    expect(formatConnectionSyncTime("junk")).toBeNull();
    expect(formatConnectionSyncTime(null)).toBeNull();
  });
});
