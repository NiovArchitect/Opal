/**
 * @vitest-environment jsdom
 *
 * Repair #18 integration wiring - acceptance for the C1/B2/B3/B45
 * mounts inside the C2 shell:
 *  - the plan contract -> C1 projection adapter (one mapping, honest
 *    attendance: absent contract fields render no count);
 *  - Center: the deck's Talk to Opal lands on the real C1 chat
 *    (active session), back lands on the C1 session list, New chat
 *    creates a real session; the C1 subtree carries data-design="r18"
 *    and no data-mode of its own (mode comes from :root[data-mode]);
 *  - Chats: the C1 people list opens the C1 thread over real
 *    messages, the composer sends through the real send path, and
 *    the relationship-set circle rows mount on the people surface;
 *  - Graph Detail: the B2 food panel mounts only when the completion
 *    record carries a food step; the B3 plan circle row mounts;
 *  - Care destination: renders real careClient data and its actions
 *    call the real endpoints;
 *  - DOCK TRAP: in the merged shell the dock is a later sibling of
 *    <main> at --layer-dock, the legacy Center life-graph layer never
 *    mounts, and the C1 CSS carries no layer redefinition, no literal
 *    z-index, and no 28px sheet radius (sheet radius is the token).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const listOpalChatSessions = vi.fn();
const getOpalChatSession = vi.fn();
const createOpalChatSession = vi.fn();
const postOpalSessionMessage = vi.fn();
const listMessages = vi.fn();
const sendMessage = vi.fn();
const listPeople = vi.fn();
const listRelationships = vi.fn();
const getCheckinForSource = vi.fn();
const getCheckin = vi.fn();
// Hunt-fix B-12: plan-load failures now surface as an error state
// instead of an empty deck, so this suite mocks a successful (empty)
// plans read — the deck it exercises is the loaded one.
const listOpalPlans = vi.fn(async () => ({ plans: [] }));

vi.mock("../../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../../api/productClient")>(
    "../../api/productClient",
  );
  return {
    ...actual,
    listOpalChatSessions: (...a: unknown[]) => listOpalChatSessions(...a),
    getOpalChatSession: (...a: unknown[]) => getOpalChatSession(...a),
    createOpalChatSession: (...a: unknown[]) => createOpalChatSession(...a),
    postOpalSessionMessage: (...a: unknown[]) => postOpalSessionMessage(...a),
    listMessages: (...a: unknown[]) => listMessages(...a),
    sendMessage: (...a: unknown[]) => sendMessage(...a),
    listPeople: (...a: unknown[]) => listPeople(...a),
    listRelationships: (...a: unknown[]) => listRelationships(...a),
    getCheckinForSource: (...a: unknown[]) => getCheckinForSource(...a),
    getCheckin: (...a: unknown[]) => getCheckin(...a),
    listOpalPlans: (...a: unknown[]) => listOpalPlans(...a),
  };
});

const listCareRotations = vi.fn();
const listHouseholds = vi.fn();
const completeCheckIn = vi.fn();
const acceptSupplyPlan = vi.fn();

vi.mock("../../care/careClient", async () => {
  const actual = await vi.importActual<typeof import("../../care/careClient")>(
    "../../care/careClient",
  );
  return {
    ...actual,
    listCareRotations: (...a: unknown[]) => listCareRotations(...a),
    listHouseholds: (...a: unknown[]) => listHouseholds(...a),
    completeCheckIn: (...a: unknown[]) => completeCheckIn(...a),
    passCheckIn: vi.fn(async () => ({})),
    acceptHousehold: vi.fn(async () => ({})),
    setPrimaryHousehold: vi.fn(async () => ({})),
    acceptSupplyPlan: (...a: unknown[]) => acceptSupplyPlan(...a),
  };
});

import { C2Shell } from "./C2Shell";
import { CenterHost, ChatsHost, conversationPreviewLabel, planProjectionFromContract } from "./C1ShellHosts";
import { CareDestination } from "./CareDestination";
import { C2GraphDetail } from "./C2Graphs";
import { saveProfile, type OpalPlanContract } from "../../api/productClient";

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
  document.documentElement.removeAttribute("data-mode");
  localStorage.clear();
  sessionStorage.clear();
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
function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
}
function pressEnter(input: HTMLInputElement) {
  act(() => {
    input.dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
  });
}

const OPENING = {
  greeting: "Good evening.",
  nudgeLine: null,
  presence: "idle" as const,
  celebrateOnce: false,
  needsYou: [],
  next: null,
  comingUp: [],
  forming: [],
};

const OPENING_EVENTS = {
  openGraph: vi.fn(),
  makeSomethingHappen: vi.fn(),
  completeSlot: vi.fn(),
};

beforeEach(() => {
  getCheckinForSource.mockResolvedValue({
    checkin: null,
    suggestion: null,
    next_sweep_allowed_at: null,
  });
  getCheckin.mockResolvedValue({ checkin: null });
  listRelationships.mockResolvedValue({ relationships: [], contacts: [], allowed_types: [] });
  listPeople.mockResolvedValue({ connected: [], outgoing: [], incoming: [] });
});

describe("conversationPreviewLabel (harmony-0 finding ii: no raw call:<id> preview)", () => {
  it("resolves a call preview from the conversation's own peer name", () => {
    expect(
      conversationPreviewLabel({
        title: "Maya",
        preview: "call:07391047-6835-432f-9ab7-2feb9de5ec69",
        peers: [{ display_name: "Maya" }],
      }),
    ).toBe("Call with Maya");
  });
  it("falls back to the conversation title, then to plain Call", () => {
    expect(conversationPreviewLabel({ title: "Jordan", preview: "call:abc", peers: [] })).toBe(
      "Call with Jordan",
    );
    expect(conversationPreviewLabel({ title: "", preview: "call:abc", peers: [] })).toBe("Call");
  });
  it("passes every non-call preview through untouched", () => {
    expect(conversationPreviewLabel({ title: "Maya", preview: "Perfect, see you there.", peers: [] })).toBe(
      "Perfect, see you there.",
    );
  });
});

describe("plan contract -> C1 projection adapter", () => {
  const base: OpalPlanContract = {
    id: "p1",
    title: "Dinner at Juniper and Ivy",
    status: "ready",
    location: "Juniper and Ivy",
    time_label: "Thu, Oct 22 at 7:30 PM",
  };

  it("maps state, when and where from the contract fields only", () => {
    const p = planProjectionFromContract(base);
    expect(p.state).toBe("ready");
    expect(p.when).toEqual({ kind: "canonical", label: "Thu, Oct 22 at 7:30 PM" });
    expect(p.where).toEqual({ kind: "place", name: "Juniper and Ivy" });
  });

  it("attendance exists only when the backend counter fields are present", () => {
    expect(planProjectionFromContract(base).attendance).toBeNull();
    const withCounts = planProjectionFromContract({
      ...base,
      going_count: 3,
      interested_count: 1,
      total_count: 4,
      viewer_state: "going",
    });
    expect(withCounts.attendance).toEqual({
      going: 3,
      interested: 1,
      total: 4,
      viewerState: "going",
      faces: [],
    });
  });

  it("virtual plans render the virtual where form; unknown status falls to forming", () => {
    const virtual = planProjectionFromContract({
      ...base,
      status: "weird-status",
      plan_type: "virtual",
      location: "Online",
    });
    expect(virtual.state).toBe("forming");
    expect(virtual.where.kind).toBe("virtual");
  });
});

describe("Center host - deck, session list, chat", () => {
  it("Talk to Opal opens the active C1 session; back lands on the session list; New chat creates", async () => {
    listOpalChatSessions.mockResolvedValue({
      conversations: [
        {
          id: "s1",
          title: "Dinner chat",
          active: true,
          last_message_preview: "See you at 7",
          updated_at: "2026-10-17T19:00:00Z",
        },
      ],
    });
    getOpalChatSession.mockResolvedValue({
      conversation: {
        id: "s1",
        title: "Dinner chat",
        messages: [
          { id: "m1", conversation_id: "s1", role: "opal", body: "Hello from Opal" },
          { id: "m2", conversation_id: "s1", role: "user", body: "Hi Opal" },
        ],
      },
    });
    createOpalChatSession.mockResolvedValue({
      conversation: { id: "s2", title: null, messages: [] },
    });

    await render(
      <CenterHost
        bearer="tok"
        opening={OPENING}
        openingEvents={OPENING_EVENTS}
        plans={[]}
        onOpenGraph={vi.fn()}
      />,
    );
    const talk = q('[data-testid="c2-opening-talk"]');
    expect(talk, "Talk to Opal renders because the host supplies the handler").toBeTruthy();
    click(talk!);
    await flush();
    expect(q('[data-testid="center-chat"]')).toBeTruthy();
    expect(document.body.textContent).toContain("Hello from Opal");
    expect(q('[data-testid="c2-c1-center-host"]')?.getAttribute("data-design")).toBe("r18");

    click(q('[aria-label="Back to chats"]')!);
    await flush();
    expect(q('[data-testid="center-session-list"]')).toBeTruthy();
    expect(document.body.textContent).toContain("Dinner chat");

    click(q('[data-testid="center-new-chat"]')!);
    await flush();
    expect(createOpalChatSession).toHaveBeenCalled();
    expect(q('[data-testid="center-chat"]')).toBeTruthy();
  });

  it("sending in the C1 chat posts to the session and renders the returned messages", async () => {
    listOpalChatSessions.mockResolvedValue({
      conversations: [{ id: "s1", title: "Chat", active: true, updated_at: null }],
    });
    getOpalChatSession.mockResolvedValue({
      conversation: { id: "s1", title: "Chat", messages: [] },
    });
    postOpalSessionMessage.mockResolvedValue({
      messages: [
        { id: "m9", conversation_id: "s1", role: "user", body: "Plan dinner Friday" },
        { id: "m10", conversation_id: "s1", role: "opal", body: "On it." },
      ],
    });
    await render(
      <CenterHost
        bearer="tok"
        opening={OPENING}
        openingEvents={OPENING_EVENTS}
        plans={[]}
        onOpenGraph={vi.fn()}
      />,
    );
    click(q('[data-testid="c2-opening-talk"]')!);
    await flush();
    const input = q('[data-testid="center-chat"] input') as HTMLInputElement;
    typeInto(input, "Plan dinner Friday");
    pressEnter(input);
    await flush();
    expect(postOpalSessionMessage).toHaveBeenCalledWith("s1", "Plan dinner Friday", "tok");
    expect(document.body.textContent).toContain("On it.");
  });
});

describe("Chats host - C1 list, thread, circle rows", () => {
  const CONVERSATIONS = [
    {
      id: "c1",
      title: "Maya Chen",
      preview: "See you",
      updated_at: "2026-10-17T19:00:00Z",
      peers: [{ id: "u2", display_name: "Maya Chen", handle: "maya" }],
      unread_count: 2,
    },
  ];

  it("opens the C1 thread over real messages, sends for real, and mounts relationship circle rows", async () => {
    listMessages.mockResolvedValue({
      messages: [
        {
          id: "mm1",
          body: "hey there",
          sender_user_id: "u2",
          server_seq: 1,
          created_at: "2026-10-17T19:00:00Z",
          client_message_id: "x1",
        },
      ],
      signals: [],
    });
    sendMessage.mockResolvedValue({ message: { id: "mm2" } });
    listRelationships.mockResolvedValue({
      relationships: [{ id: "r1", user_id: "me", contact_user_id: "u2", type: "family" }],
      contacts: [],
      allowed_types: ["family"],
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
    // People/relationship surface: one circle row for the family set.
    expect(q('[data-testid="c2-c1-circles"]')).toBeTruthy();
    expect(q('[data-testid="checkin-circle-row"]')).toBeTruthy();
    expect(getCheckinForSource).toHaveBeenCalledWith(
      expect.objectContaining({
        source_kind: "relationship_set",
        source_filter: { types: ["family"] },
      }),
      "tok",
    );

    click(q('[data-testid="chats-row"]')!);
    await flush();
    expect(q('[data-testid="thread-shell"]')).toBeTruthy();
    expect(document.body.textContent).toContain("hey there");

    const input = q('input[placeholder="Message Maya Chen"]') as HTMLInputElement;
    typeInto(input, "on my way");
    pressEnter(input);
    await flush();
    expect(sendMessage).toHaveBeenCalledWith("c1", "on my way", "tok");
  });
});

describe("Graph Detail mounts - B2 food panel and B3 plan circle row", () => {
  const events = {
    openGraph: vi.fn(),
    createPlan: vi.fn(),
    createTrip: vi.fn(),
    createIdea: vi.fn(),
    completeSlot: vi.fn(),
    dropPlan: vi.fn(),
    runNextAction: vi.fn(),
    addPeople: vi.fn(),
    openChatForPlan: vi.fn(),
    back: vi.fn(),
  };
  const card = {
    id: "p1",
    stateFamily: "happening",
    stateLabel: "Happening",
    title: "Virtual dinner",
    whenLine: "Tonight at 7 PM",
    whereLine: "Online",
    attendanceLine: null,
    primaryActionLabel: null,
  };

  it("mounts the food panel only when the completion record carries a food step", async () => {
    await render(
      <C2GraphDetail
        detail={{
          id: "p1",
          title: "Virtual dinner",
          card,
          whenLine: "Tonight at 7 PM",
          where: null,
          who: [],
          activity: [],
          history: [],
          origin: "graphs",
          viewerUserId: "me",
          meetingLink: null,
          completion: {
            steps: [
              {
                id: "food",
                status: "composing",
                restaurant_name: "Poke House",
                recipients: [
                  { user_id: "me", items: ["poke bowl"], items_state: "set", handoff_state: "not_started" },
                ],
              },
            ],
          } as never,
        }}
        events={events}
        bearer="tok"
      />,
    );
    await flush();
    expect(q('[data-testid="food-step-panel"]')).toBeTruthy();
    expect(q('[data-testid="c2-detail-checkin"]')).toBeTruthy();
  });

  it("no completion record, no food panel - the circle row still mounts", async () => {
    await render(
      <C2GraphDetail
        detail={{
          id: "p1",
          title: "Virtual dinner",
          card,
          whenLine: "Tonight at 7 PM",
          where: null,
          who: [],
          activity: [],
          history: [],
          origin: "graphs",
          completion: null,
        }}
        events={events}
        bearer="tok"
      />,
    );
    await flush();
    expect(q('[data-testid="food-step-panel"]')).toBeNull();
    expect(q('[data-testid="c2-detail-checkin"]')).toBeTruthy();
    expect(getCheckinForSource).toHaveBeenCalledWith(
      expect.objectContaining({ source_kind: "plan", source_ref_id: "p1" }),
      "tok",
    );
  });
});

describe("Care destination - B45 views on real client data", () => {
  it("renders rotations and pods from careClient and wires its actions", async () => {
    listCareRotations.mockResolvedValue([
      {
        id: "rot1",
        subject_label: "Mom",
        subject_user_id: null,
        subject_visible: false,
        created_by_user_id: "me",
        admin_user_id: "me",
        member_user_ids: ["me"],
        pending_member_user_ids: [],
        next_assignee_index: 0,
        cadence: { frequency: "daily", local_time: "09:00", window_hours: 2 },
        timezone: "America/Los_Angeles",
        conversation_id: null,
        status: "active",
        viewer_is_member: true,
        viewer_is_admin: true,
        check_ins: [
          {
            id: "ci1",
            rotation_id: "rot1",
            occurrence_key: "care:rot1:2026-10-18",
            assignee_user_id: "me",
            slot_user_id: "me",
            window_start_at: "2026-10-18T16:00:00Z",
            window_end_at: "2026-10-18T18:00:00Z",
            status: "open",
            done_by_user_id: null,
            done_at: null,
            note: null,
            handoff_from_user_id: null,
            handoff_to_user_id: null,
            handoff_at: null,
            handoff_reason: null,
            missed_surfaced_at: null,
          },
        ],
      },
    ]);
    listHouseholds.mockResolvedValue([
      {
        id: "h1",
        label: "Home base",
        home_label: "Vista house",
        created_by_user_id: "me",
        timezone: "America/Los_Angeles",
        status: "active",
        active_member_user_ids: ["me", "u2"],
        pending_member_user_ids: [],
        viewer_status: "active",
        viewer_is_primary: true,
        plan_defaults: { participant_user_ids: ["me", "u2"], location: "Vista house", timezone: "America/Los_Angeles" },
      },
    ]);
    completeCheckIn.mockResolvedValue({});
    acceptSupplyPlan.mockResolvedValue({});
    await render(<CareDestination onBack={vi.fn()} />);
    await flush();
    expect(document.body.textContent).toContain("Checking in on Mom");
    expect(document.body.textContent).toContain("Home base");
    const complete = [...document.querySelectorAll("button")].find(
      (b) => b.textContent === "Mark checked in",
    );
    click(complete!);
    await flush();
    expect(completeCheckIn).toHaveBeenCalledWith("rot1", "care:rot1:2026-10-18");
    const supply = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Start a supply run"),
    );
    click(supply!);
    await flush();
    expect(acceptSupplyPlan).toHaveBeenCalledWith("h1");
  });
});

describe("dock trap + mode scoping in the merged shell", () => {
  it("the dock stays a later sibling of main; the legacy Center layer never mounts; C1 inherits :root mode", async () => {
    document.documentElement.setAttribute("data-mode", "dark");
    saveProfile({
      access_token: "test-token",
      user_id: "user-1",
      display_name: "Sadeil Lewis",
      handle: "sadeil",
      session_id: "sess-1",
    });
    listOpalChatSessions.mockResolvedValue({
      conversations: [{ id: "s1", title: "Chat", active: true, updated_at: null }],
    });
    getOpalChatSession.mockResolvedValue({
      conversation: { id: "s1", title: "Chat", messages: [] },
    });
    await render(<C2Shell />);
    await flush();
    const main = document.querySelector("main")!;
    const dock = q('[data-testid="c2-dock"]')!;
    expect(main).toBeTruthy();
    // Mount order: the dock comes AFTER main in the shell column, so
    // route content (in-flow, bands below --layer-dock) cannot paint
    // or hit-test over it.
    expect(main.compareDocumentPosition(dock) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    click(q('[data-testid="c2-opening-talk"]')!);
    await flush();
    expect(q('[data-testid="center-chat"]')).toBeTruthy();
    // The base-build trap layer is not part of the merged composition.
    expect(q('[data-testid="opal-center-life-graph"]')).toBeNull();
    // Mode scoping: the C1 subtree carries the design scope and NO
    // mode of its own - it inherits the shell's :root[data-mode].
    const hostEl = q('[data-testid="c2-c1-center-host"]')!;
    expect(hostEl.getAttribute("data-design")).toBe("r18");
    expect(hostEl.hasAttribute("data-mode")).toBe(false);
    const tokens = readFileSync(
      join(process.cwd(), "src/theme/c2Tokens.css"),
      "utf8",
    );
    expect(tokens).toContain(':root[data-mode="dark"] [data-design="r18"]');
    expect(tokens).toContain(':root[data-mode="light"] [data-design="r18"]');
  });

  it("L-1 audit: C1 CSS redefines no layer token, uses no literal z-index, and the sheet radius is the C2 token", () => {
    const c1css = readFileSync(
      join(process.cwd(), "src/opalUi/c1/c1.css"),
      "utf8",
    );
    expect(c1css).not.toMatch(/--layer-[a-z-]+:/);
    expect(c1css).not.toMatch(/z-index:\s*\d/);
    expect(c1css).toContain("border-radius: var(--radius-sheet) var(--radius-sheet) 0 0");
    expect(c1css).not.toMatch(/border-radius:\s*28px/);
    const shellCss = readFileSync(
      join(process.cwd(), "src/c2/shell/c2shell.css"),
      "utf8",
    );
    expect(shellCss).toMatch(/\.c2s-dock \{[^}]*z-index: var\(--layer-dock\)/);
    const layerTokens = readFileSync(
      join(process.cwd(), "src/theme/layerTokens.css"),
      "utf8",
    );
    expect(layerTokens).toContain("--layer-sheet: 65;");
    expect(layerTokens).toContain("--layer-sheet-high: 70;");
  });
});
