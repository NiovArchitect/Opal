/**
 * @vitest-environment jsdom
 *
 * Repair #19 W2 - the Calls place inside the C2 shell's Chats host:
 *  - the Chats list's Calls segment is a working tab: it loads the
 *    real GET /calls contract (listCalls) and renders the C2 call
 *    log - the orb-pad shell's own surface, not the legacy log;
 *  - a row carries its server call_state fact as its border
 *    (data + the canon color from the one token source);
 *  - Call back places the real conversation call
 *    (createConversationCall) and reports the server's returned
 *    status; the log re-reads afterwards;
 *  - a row tap opens the real thread for its conversation;
 *  - an empty contract renders the honest empty, never seed rows.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listCalls = vi.fn();
const createConversationCall = vi.fn();
const listMessages = vi.fn();
const listReveals = vi.fn();
const listRelationships = vi.fn();
const listPeople = vi.fn();
const getCheckinForSource = vi.fn();
const getCheckin = vi.fn();

vi.mock("../../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../../api/productClient")>(
    "../../api/productClient",
  );
  return {
    ...actual,
    listCalls: (...a: unknown[]) => listCalls(...a),
    createConversationCall: (...a: unknown[]) => createConversationCall(...a),
    listMessages: (...a: unknown[]) => listMessages(...a),
    listReveals: (...a: unknown[]) => listReveals(...a),
    listRelationships: (...a: unknown[]) => listRelationships(...a),
    listPeople: (...a: unknown[]) => listPeople(...a),
    getCheckinForSource: (...a: unknown[]) => getCheckinForSource(...a),
    getCheckin: (...a: unknown[]) => getCheckin(...a),
  };
});

import { ChatsHost } from "./C1ShellHosts";
import { PLAN_STATE_HEX } from "../../theme/planStateColors";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;

async function render(node: React.ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(node);
  });
  return host;
}

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  host = null;
  root = null;
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

function q(sel: string) {
  return document.querySelector(sel);
}
function click(el: Element) {
  act(() => {
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
}
async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

const CONVERSATIONS = [
  {
    id: "c1",
    title: "Maya Chen",
    preview: "See you",
    updated_at: "2026-10-18T19:00:00Z",
    peers: [{ id: "u2", display_name: "Maya Chen", handle: "maya" }],
    unread_count: 0,
  },
];

const MISSED_CALL = {
  id: "call-1",
  conversation_id: "c1",
  direction: "incoming",
  peer_user_id: "u2",
  peer_name: "Maya Chen",
  status: "missed",
  ended_reason: "missed",
  history_label: "Missed call",
  missed: true,
  created_at: "2026-10-18T19:00:00Z",
  next_plan: null,
  peer_tint: 3,
  call_state: { state: "action", reason: "missed_unresolved", label: "Call back" },
};

beforeEach(() => {
  listReveals.mockResolvedValue({ items: [] });
  listRelationships.mockResolvedValue({ relationships: [], contacts: [], allowed_types: [] });
  listPeople.mockResolvedValue({ connected: [], outgoing: [], incoming: [] });
  getCheckinForSource.mockResolvedValue({ checkin: null, suggestion: null, next_sweep_allowed_at: null });
  getCheckin.mockResolvedValue({ checkin: null });
  listMessages.mockResolvedValue({ messages: [], signals: [], next_plan: null });
});

describe("R19 ChatsHost - the C2 call log", () => {
  it("the Calls tab loads the real log; the row wears its call_state border; call back and open work", async () => {
    listCalls.mockResolvedValue({ calls: [MISSED_CALL] });
    createConversationCall.mockResolvedValue({
      call: { id: "call-2", status: "ringing", caller_user_id: "me", callee_user_id: "u2" },
    });
    await render(
      <ChatsHost
        bearer="tok"
        viewerUserId="me"
        conversations={CONVERSATIONS as never}
        onConversationsChanged={vi.fn()}
      />,
    );
    await flush();
    expect(q('[data-testid="people-chats-list"]')).toBeTruthy();
    expect(q('[data-testid="chats-segment-calls"]')).toBeTruthy();

    click(q('[data-testid="chats-segment-calls"]')!);
    await flush();
    await flush();
    expect(listCalls).toHaveBeenCalledWith("tok");
    expect(q('[data-testid="people-calls-list"]')).toBeTruthy();

    const rowEl = q('[data-testid="calls-row"]')!;
    expect(rowEl.getAttribute("data-call-state")).toBe("action");
    expect(rowEl.getAttribute("data-call-state-reason")).toBe("missed_unresolved");
    expect(rowEl.getAttribute("style")).toContain(PLAN_STATE_HEX.action);
    expect(document.body.textContent).toContain("Missed call");
    expect(document.body.textContent).toContain("Call back");

    // Call back places the real call and reports the server's status.
    click(q('[data-testid="calls-call-back-call-1"]')!);
    await flush();
    expect(createConversationCall).toHaveBeenCalledWith("c1", "tok");
    expect(q('[data-testid="c2-calls-note"]')?.textContent).toContain("ringing");

    // The row opens the real thread for its conversation.
    click(q('[data-testid="calls-open-conversation-call-1"]')!);
    await flush();
    expect(listMessages).toHaveBeenCalledWith("c1", "tok");
    expect(q('[data-testid="thread-shell"]')).toBeTruthy();
  });

  it("an empty contract is an honest empty - no rows are painted", async () => {
    listCalls.mockResolvedValue({ calls: [] });
    await render(
      <ChatsHost
        bearer="tok"
        viewerUserId="me"
        conversations={CONVERSATIONS as never}
        onConversationsChanged={vi.fn()}
      />,
    );
    await flush();
    click(q('[data-testid="chats-segment-calls"]')!);
    await flush();
    await flush();
    expect(q('[data-testid="calls-empty"]')).toBeTruthy();
    expect(q('[data-testid="calls-row"]')).toBeNull();
  });

  it("a failed load is an honest error, not an empty log", async () => {
    listCalls.mockRejectedValue(new Error("down"));
    await render(
      <ChatsHost
        bearer="tok"
        viewerUserId="me"
        conversations={CONVERSATIONS as never}
        onConversationsChanged={vi.fn()}
      />,
    );
    await flush();
    click(q('[data-testid="chats-segment-calls"]')!);
    await flush();
    await flush();
    expect(q('[data-testid="calls-empty-error"]')).toBeTruthy();
    expect(q('[data-testid="calls-row"]')).toBeNull();
  });
});
