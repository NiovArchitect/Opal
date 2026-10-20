/**
 * @vitest-environment jsdom
 *
 * Repair #20 pins (web seam):
 *  - F-6: the people universe resolves identity by person id —
 *    one identity across several conversations is one row (on its
 *    most recent conversation); two distinct people sharing a name
 *    stay two rows, unmixed.
 *  - F-7: CreateFlow asks WHO with the same weight as What/When/
 *    Where, and the selection rides the real create contract
 *    (participant_user_ids for plans, user_ids for trips); the
 *    primary action carries the ruled ambient press class.
 *  - F-8a: the picker universe orders most-talked-to first.
 *  - F-8b: start-a-chat carries a phone-number path that runs the
 *    real by-phone conversation create and opens the thread; the
 *    server's not-on-Opal truth renders as a plain line.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listRelationships = vi.fn();
const listPeople = vi.fn();
const listReveals = vi.fn();
const listCalls = vi.fn();
const listMessages = vi.fn();
const getCheckinForSource = vi.fn();
const getCheckin = vi.fn();
const createGraphPlan = vi.fn();
const createTrip = vi.fn();
const startConversationByPhone = vi.fn();

vi.mock("../../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../../api/productClient")>(
    "../../api/productClient",
  );
  return {
    ...actual,
    listRelationships: (...a: unknown[]) => listRelationships(...a),
    listPeople: (...a: unknown[]) => listPeople(...a),
    listReveals: (...a: unknown[]) => listReveals(...a),
    listCalls: (...a: unknown[]) => listCalls(...a),
    listMessages: (...a: unknown[]) => listMessages(...a),
    getCheckinForSource: (...a: unknown[]) => getCheckinForSource(...a),
    getCheckin: (...a: unknown[]) => getCheckin(...a),
    createGraphPlan: (...a: unknown[]) => createGraphPlan(...a),
    createTrip: (...a: unknown[]) => createTrip(...a),
    startConversationByPhone: (...a: unknown[]) => startConversationByPhone(...a),
  };
});

import { ChatsHost, peopleUniverse } from "./C1ShellHosts";
import { CreateFlow, SearchDestination } from "./C2Shell";

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
function qa(sel: string) {
  return [...document.querySelectorAll(sel)];
}
function click(el: Element | null) {
  act(() => {
    el!.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
}
function typeInto(el: Element | null, value: string) {
  const input = el as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
}
async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

const CONVERSATIONS = [
  {
    id: "c-zoe",
    title: "Zoe Zephyr",
    preview: "later",
    updated_at: "2026-10-19T19:00:00Z",
    latest_server_seq: 3,
    peers: [{ id: "u-zoe", display_name: "Zoe Zephyr", handle: "zoe" }],
    unread_count: 0,
    next_plan: null,
  },
  {
    id: "c-aaron",
    title: "Aaron Aardvark",
    preview: "morning",
    updated_at: "2026-10-18T19:00:00Z",
    latest_server_seq: 40,
    peers: [{ id: "u-aaron", display_name: "Aaron Aardvark", handle: "aaron" }],
    unread_count: 0,
    next_plan: null,
  },
] as never;

beforeEach(() => {
  listReveals.mockResolvedValue({ items: [] });
  listCalls.mockResolvedValue({ calls: [] });
  listMessages.mockResolvedValue({ messages: [], signals: [], next_plan: null });
  listPeople.mockResolvedValue({ connected: [], outgoing: [], incoming: [] });
  listRelationships.mockResolvedValue({
    relationships: [],
    contacts: [],
    allowed_types: [],
    family_subtypes: [],
  });
  getCheckinForSource.mockResolvedValue({
    checkin: null,
    suggestion: null,
    next_sweep_allowed_at: null,
  });
  getCheckin.mockResolvedValue({ checkin: null });
  createGraphPlan.mockResolvedValue({ plan: { id: "p-new" }, participants: [] });
  createTrip.mockResolvedValue({ trip: { id: "t-new" } });
});

describe("F-6/F-8a peopleUniverse", () => {
  it("orders most-talked-to first (recency beats name and volume)", () => {
    const people = peopleUniverse({
      conversations: CONVERSATIONS as never,
      contacts: [],
      relRows: [],
    });
    expect(people.map((p) => p.name)).toEqual(["Zoe Zephyr", "Aaron Aardvark"]);
  });

  it("one identity across two conversations is one row on the most recent conversation", () => {
    const people = peopleUniverse({
      conversations: [
        {
          id: "c-old",
          updated_at: "2026-10-10T10:00:00Z",
          latest_server_seq: 5,
          peers: [{ id: "u-maya", display_name: "Maya Torres" }],
        },
        {
          id: "c-new",
          updated_at: "2026-10-19T10:00:00Z",
          latest_server_seq: 2,
          peers: [{ id: "u-maya", display_name: "Maya Torres" }],
        },
      ] as never,
      contacts: [{ contact_user_id: "u-maya", display_name: "Maya Torres" }],
      relRows: [],
    });
    expect(people).toHaveLength(1);
    expect(people[0].conversationId).toBe("c-new");
    expect(people[0].talkCount).toBe(7);
  });

  it("two distinct identities sharing a name stay two rows, unmixed", () => {
    const people = peopleUniverse({
      conversations: [
        {
          id: "c-seed",
          updated_at: "2026-10-19T10:00:00Z",
          latest_server_seq: 9,
          peers: [{ id: "u-maya-seed", display_name: "Maya Torres" }],
        },
        {
          id: "c-real",
          updated_at: "2026-10-18T10:00:00Z",
          latest_server_seq: 1,
          peers: [{ id: "u-maya-real", display_name: "Maya Torres" }],
        },
      ] as never,
      contacts: [],
      relRows: [],
    });
    expect(people).toHaveLength(2);
    const byId = new Map(people.map((p) => [p.personId, p]));
    expect(byId.get("u-maya-seed")!.conversationId).toBe("c-seed");
    expect(byId.get("u-maya-seed")!.talkCount).toBe(9);
    expect(byId.get("u-maya-real")!.conversationId).toBe("c-real");
    expect(byId.get("u-maya-real")!.talkCount).toBe(1);
  });

  it("search people: the same identity in two conversations renders once; two same-name identities render twice", async () => {
    const conversations = [
      {
        id: "c-1",
        title: "Maya Torres",
        preview: "hi",
        updated_at: "2026-10-19T10:00:00Z",
        peers: [{ id: "u-maya-a", display_name: "Maya Torres", handle: "maya-a" }],
      },
      {
        id: "c-2",
        title: "Weekend Crew",
        preview: "yo",
        updated_at: "2026-10-18T10:00:00Z",
        peers: [
          { id: "u-maya-a", display_name: "Maya Torres", handle: "maya-a" },
          { id: "u-maya-b", display_name: "Maya Torres", handle: "maya-b" },
        ],
      },
    ] as never;
    await render(
      <SearchDestination
        plans={[]}
        conversations={conversations}
        onClose={() => {}}
        onOpenGraph={() => {}}
        onOpenChat={() => {}}
      />,
    );
    typeInto(q('[data-testid="c2-search-input"]'), "Maya");
    await flush();
    const rows = qa('[data-testid="c2-search-person"]');
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining("Maya Torres"),
      expect.stringContaining("Maya Torres"),
    ]);
  });
});

describe("F-7 CreateFlow Who", () => {
  it("renders Who beside What/When/Where and carries the selection into participant_user_ids", async () => {
    const onCreated = vi.fn();
    await render(
      <CreateFlow
        kind="plan"
        bearer="tok"
        conversations={CONVERSATIONS}
        onClose={() => {}}
        onCreated={onCreated}
      />,
    );
    await flush();
    const who = q('[data-testid="c2-create-who"]');
    expect(who).not.toBeNull();
    const rows = qa('[data-testid="c2-create-who-row"]');
    // Most-talked-to first in the Who field too.
    expect(rows.map((r) => r.getAttribute("data-person-id"))).toEqual(["u-zoe", "u-aaron"]);
    expect(q('[data-testid="c2-create-who-line"]')!.textContent).toContain("Just you for now.");
    click(rows[0]);
    expect(rows[0].getAttribute("aria-pressed")).toBe("true");
    expect(q('[data-testid="c2-create-who-line"]')!.textContent).toContain("With Zoe Zephyr.");
    typeInto(q('[data-testid="c2-create-title"]'), "Farmers market run");
    click(q('[data-testid="c2-create-submit"]'));
    await flush();
    expect(createGraphPlan).toHaveBeenCalledTimes(1);
    const attrs = createGraphPlan.mock.calls[0][0] as Record<string, unknown>;
    expect(attrs.participant_user_ids).toEqual(["u-zoe"]);
    expect(onCreated).toHaveBeenCalled();
  });

  it("a trip carries the Who selection as real memberships (user_ids)", async () => {
    await render(
      <CreateFlow
        kind="trip"
        bearer="tok"
        conversations={CONVERSATIONS}
        onClose={() => {}}
        onCreated={() => {}}
      />,
    );
    await flush();
    const rows = qa('[data-testid="c2-create-who-row"]');
    click(rows[1]);
    typeInto(q('[data-testid="c2-create-title"]'), "Coast weekend");
    click(q('[data-testid="c2-create-submit"]'));
    await flush();
    expect(createTrip).toHaveBeenCalledTimes(1);
    const attrs = createTrip.mock.calls[0][0] as Record<string, unknown>;
    expect(attrs.user_ids).toEqual(["u-aaron"]);
  });

  it("the Who field carries the orbit mark and ring selection (design compass)", async () => {
    await render(
      <CreateFlow
        kind="plan"
        bearer="tok"
        conversations={CONVERSATIONS}
        onClose={() => {}}
        onCreated={() => {}}
      />,
    );
    await flush();
    // The orbit/ring brand anchor sits beside the Who label.
    expect(q(".c2s-create-orbit-mark")).not.toBeNull();
    expect(q(".c2s-create-orbit-ring")).not.toBeNull();
    expect(q(".c2s-create-orbit-dot")).not.toBeNull();
    // Selection reads as a ring: present on every row, filled only
    // once the person is in the plan's orbit (aria-pressed carries
    // the state off color alone).
    const rows = qa('[data-testid="c2-create-who-row"]');
    expect(rows[0].querySelector(".c2s-create-who-check")).not.toBeNull();
    click(rows[0]);
    expect(rows[0].getAttribute("aria-pressed")).toBe("true");
    expect(rows[0].querySelector(".c2s-create-who-check")!.textContent).toBe("✓");
  });

  it("the primary Create action carries the ruled ambient press treatment", async () => {
    await render(
      <CreateFlow
        kind="plan"
        bearer="tok"
        conversations={CONVERSATIONS}
        onClose={() => {}}
        onCreated={() => {}}
      />,
    );
    const submit = q('[data-testid="c2-create-submit"]');
    expect(submit!.className).toContain("c2s-btn-create");
    expect(q('[data-testid="c2-create-flow"]')!.className).toContain("c2s-create-flow");
  });
});

describe("F-8b start-a-chat by phone", () => {
  it("a typed number runs the real by-phone create and opens the thread", async () => {
    startConversationByPhone.mockResolvedValue({
      conversation_id: "c-zoe",
      origin: "created",
      peer: { id: "u-zoe", display_name: "Zoe Zephyr" },
    });
    const onChanged = vi.fn();
    await render(
      <ChatsHost
        bearer="tok"
        viewerUserId="me"
        conversations={CONVERSATIONS}
        onConversationsChanged={onChanged}
      />,
    );
    await flush();
    click(q('[data-testid="chats-new-chat"]'));
    await flush();
    expect(q('[data-testid="c2-c1-phone-entry"]')).not.toBeNull();
    typeInto(q('[data-testid="c2-c1-phone-input"]'), "+1 202 555 0102");
    click(q('[data-testid="c2-c1-phone-start"]'));
    await flush();
    expect(startConversationByPhone).toHaveBeenCalledTimes(1);
    expect(startConversationByPhone.mock.calls[0][0]).toBe("+1 202 555 0102");
    expect(onChanged).toHaveBeenCalled();
    // The picker closed and the thread opened on the returned id.
    expect(q('[data-testid="c2-c1-people-picker"]')).toBeNull();
    expect(listMessages).toHaveBeenCalledWith("c-zoe", "tok");
  });

  it("the server's not-on-Opal truth renders as a plain line, and no thread opens", async () => {
    const err = new Error("That number isn't on Opal yet.") as Error & { code?: string };
    err.code = "not_on_opal";
    startConversationByPhone.mockRejectedValue(err);
    await render(
      <ChatsHost
        bearer="tok"
        viewerUserId="me"
        conversations={CONVERSATIONS}
        onConversationsChanged={() => {}}
      />,
    );
    await flush();
    click(q('[data-testid="chats-new-chat"]'));
    await flush();
    typeInto(q('[data-testid="c2-c1-phone-input"]'), "+1 202 555 9999");
    click(q('[data-testid="c2-c1-phone-start"]'));
    await flush();
    expect(q('[data-testid="c2-c1-phone-note"]')!.textContent).toContain(
      "That number isn't on Opal yet.",
    );
    expect(q('[data-testid="c2-c1-people-picker"]')).not.toBeNull();
  });

  it("the people rows in the picker are ordered most-talked-to first, ties shown", async () => {
    listRelationships.mockResolvedValue({
      relationships: [
        { contact_user_id: "u-zoe", type: "close_friend", family_subtype: null },
      ],
      contacts: [],
      allowed_types: [],
      family_subtypes: [],
    });
    await render(
      <ChatsHost
        bearer="tok"
        viewerUserId="me"
        conversations={CONVERSATIONS}
        onConversationsChanged={() => {}}
      />,
    );
    await flush();
    click(q('[data-testid="chats-new-chat"]'));
    await flush();
    const rows = qa('[data-testid="c2-c1-people-row"]');
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining("Zoe Zephyr"),
      expect.stringContaining("Aaron Aardvark"),
    ]);
    expect(rows[0].textContent).toContain("Close friend");
  });
});
