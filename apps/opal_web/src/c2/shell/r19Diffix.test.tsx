/**
 * Repair #19 W24-DIFF — the relationship layer made legible.
 *
 * Pins:
 *  - DL-12/DL-03: ONE label truth — singular tieLabel for a person
 *    ("Partner", "Family - Sister"), plural group labels only for
 *    circle headers; unknown/unset renders nothing.
 *  - DL-04/DL-08: the new-chat picker reads the ONE union universe —
 *    a populated account (live conversations, establishment list
 *    EMPTY, exactly the audit's dead-end setup) lists its people.
 *  - DL-01/DL-02: the profile's "Who they are to you" row opens the
 *    one picker; choosing Family reveals the subtype step; Save
 *    runs the one write (setRelationshipType with the peer's id and
 *    the family leg), and the thread header sub-line then carries
 *    the tie instead of the repeated name (DL-14).
 *  - DL-09 + the persona-spectrum steer: the sheet is progressive
 *    depth — first face is the question + choices only (one tap on
 *    a plain type saves and closes), the subtype step opens only on
 *    Family, and the close-circle toggle sits quietly below with
 *    one plain line. The toggle is real through the one write (it
 *    moves friend <-> close friend); for spouse/partner/family it
 *    reads ON and locked — a cue, never a fake write.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listCalls = vi.fn();
const listMessages = vi.fn();
const listReveals = vi.fn();
const listRelationships = vi.fn();
const listPeople = vi.fn();
const setRelationshipType = vi.fn();
const ensureDirectConversation = vi.fn();
const getCheckinForSource = vi.fn();
const getCheckin = vi.fn();
const sendMessage = vi.fn();

vi.mock("../../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../../api/productClient")>(
    "../../api/productClient",
  );
  return {
    ...actual,
    listCalls: (...a: unknown[]) => listCalls(...a),
    listMessages: (...a: unknown[]) => listMessages(...a),
    listReveals: (...a: unknown[]) => listReveals(...a),
    listRelationships: (...a: unknown[]) => listRelationships(...a),
    listPeople: (...a: unknown[]) => listPeople(...a),
    setRelationshipType: (...a: unknown[]) => setRelationshipType(...a),
    ensureDirectConversation: (...a: unknown[]) => ensureDirectConversation(...a),
    getCheckinForSource: (...a: unknown[]) => getCheckinForSource(...a),
    getCheckin: (...a: unknown[]) => getCheckin(...a),
    sendMessage: (...a: unknown[]) => sendMessage(...a),
  };
});

import { ChatsHost, peopleUniverse, profileProjectionFor } from "./C1ShellHosts";
import { RelationshipPickerSheet } from "./RelationshipPicker";
import { C2GraphDetail } from "./C2Graphs";
import { detailFromPlan, detailWithHistory } from "./shellData";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  relationshipGroupLabel,
  tieLabel,
} from "../../opalUi/relationshipTypes";

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
function click(el: Element | null) {
  act(() => {
    el!.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
}
async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

const CONVERSATIONS = [
  {
    id: "c-chanelle",
    title: "Chanelle Brooks",
    preview: "Rooftop Friday?",
    updated_at: "2026-10-18T19:00:00Z",
    peers: [{ id: "u-chanelle", display_name: "Chanelle Brooks", handle: "chanelle" }],
    unread_count: 0,
    next_plan: null,
  },
  {
    id: "c-jordan",
    title: "Jordan Ellis",
    preview: "See you at brunch",
    updated_at: "2026-10-18T18:00:00Z",
    peers: [{ id: "u-jordan", display_name: "Jordan Ellis", handle: "jordan" }],
    unread_count: 0,
    next_plan: null,
  },
] as never;

beforeEach(() => {
  listReveals.mockResolvedValue({ items: [] });
  listCalls.mockResolvedValue({ calls: [] });
  listMessages.mockResolvedValue({ messages: [], signals: [], next_plan: null });
  // The audit's dead-end setup: the establishment list is EMPTY.
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
  setRelationshipType.mockResolvedValue({ relationship: { id: "r1" } });
});

describe("W24 label truth (DL-03 / DL-12)", () => {
  it("singular forms for a person, subtype composed, unknown renders nothing", () => {
    expect(tieLabel("partner")).toBe("Partner");
    expect(tieLabel("close_friend")).toBe("Close friend");
    expect(tieLabel("spouse")).toBe("Spouse");
    expect(tieLabel("business")).toBe("Business");
    expect(tieLabel("family", "sibling")).toBe("Family - Sibling");
    expect(tieLabel("family", null)).toBe("Family");
    expect(tieLabel("family", "not_a_subtype")).toBe("Family");
    expect(tieLabel(null)).toBeNull();
    expect(tieLabel("nemesis")).toBeNull();
  });

  it("the group map stays plural and separate (circle headers only)", () => {
    expect(relationshipGroupLabel("close_friend")).toBe("Close friends");
    expect(relationshipGroupLabel("partner")).toBe("Partners");
    expect(relationshipGroupLabel("nemesis")).toBeNull();
  });

  it("profile projection carries the singular tie + close circle + person id", () => {
    const profile = profileProjectionFor(
      CONVERSATIONS[0] as never,
      [{ contact_user_id: "u-chanelle", type: "family", family_subtype: "sibling" }],
      null,
    );
    expect(profile.relationshipLabel).toBe("Family - Sibling");
    expect(profile.closeCircle).toBe(true);
    expect(profile.personId).toBe("u-chanelle");
    const untyped = profileProjectionFor(CONVERSATIONS[0] as never, [], null);
    expect(untyped.relationshipLabel).toBeNull();
    expect(untyped.closeCircle).toBe(false);
  });
});

describe("W24 people universe (DL-04 / DL-08)", () => {
  it("conversations alone populate the universe; contacts union in; dedupe by person", () => {
    const people = peopleUniverse({
      conversations: CONVERSATIONS as never,
      contacts: [
        { contact_user_id: "u-jordan", display_name: "Jordan Ellis", type: "partner" },
        { contact_user_id: "u-nina", display_name: "Nina Patel", type: null },
      ],
      relRows: [{ contact_user_id: "u-jordan", type: "partner" }],
    });
    expect(people.map((p) => p.name)).toEqual([
      "Chanelle Brooks",
      "Jordan Ellis",
      "Nina Patel",
    ]);
    const jordan = people.find((p) => p.personId === "u-jordan")!;
    expect(jordan.conversationId).toBe("c-jordan");
    expect(jordan.tieLabel).toBe("Partner");
    const nina = people.find((p) => p.personId === "u-nina")!;
    expect(nina.conversationId).toBeNull();
  });

  it("picker-served: populated account, empty establishment list — the picker lists people", async () => {
    await render(
      <ChatsHost
        bearer="tok"
        viewerUserId="me"
        conversations={CONVERSATIONS}
        onConversationsChanged={() => {}}
      />,
    );
    click(q('[data-testid="chats-new-chat"]'));
    await flush();
    const rows = document.querySelectorAll('[data-testid="c2-c1-people-row"]');
    expect(rows.length).toBe(2);
    expect(document.body.textContent).toContain("Chanelle Brooks");
    expect(document.body.textContent).toContain("Jordan Ellis");
    expect(document.body.textContent).not.toContain("No one connected yet");
  });
});

describe("W24 graph roster ties + Add people (DL-06 / DL-07)", () => {
  const history = {
    plan_id: "plan-1",
    history: [],
    who: [
      {
        user_id: "u-jordan",
        name: "Jordan Ellis",
        role: "participant",
        response_state: "accepted",
        response_label: "Going",
      },
      {
        user_id: "u-nina",
        name: "Nina Patel",
        role: "participant",
        response_state: null,
        response_label: "Invited",
      },
    ],
    counts: { going_count: 1, total_count: 2 },
  } as never;

  it("detailWithHistory names the tie beside the person; untyped renders none", () => {
    const detail = detailWithHistory(
      detailFromPlan(
        { id: "plan-1", title: "Brunch", status: "agreed" } as never,
        "graphs",
      ),
      history,
      new Map([["u-jordan", "Partner"]]),
    );
    expect(detail.who[0].relationshipLabel).toBe("Partner");
    expect(detail.who[1].relationshipLabel).toBeNull();
    expect(detail.attendanceLine).toBe("1 of 2 going");
  });

  it("the detail renders the roster tie and Add people fires the wired event", async () => {
    const addPeople = vi.fn();
    const detail = detailWithHistory(
      detailFromPlan(
        { id: "plan-1", title: "Brunch", status: "agreed" } as never,
        "graphs",
      ),
      history,
      new Map([["u-jordan", "Partner"]]),
    );
    await render(
      <C2GraphDetail
        detail={detail}
        events={
          {
            openGraph: () => {},
            createPlan: () => {},
            createTrip: () => {},
            createIdea: () => {},
            completeSlot: () => {},
            dropPlan: async () => null,
            runNextAction: () => {},
            addPeople,
            openChatForPlan: () => {},
            back: () => {},
          } as never
        }
      />,
    );
    const ties = document.querySelectorAll('[data-testid="c2-detail-who-tie"]');
    expect(ties.length).toBe(1);
    expect(ties[0].textContent).toContain("Partner");
    click(q('[data-testid="c2-detail-add-people"]'));
    expect(addPeople).toHaveBeenCalledWith("plan-1");
  });

  it("the shell no longer wires Add people to a no-op — it runs journeyAddPeople", () => {
    const src = readFileSync(resolve(__dirname, "C2Shell.tsx"), "utf8");
    expect(src).not.toContain("addPeople: () => undefined");
    expect(src).toContain("journeyAddPeople");
    expect(src).toContain("c2-add-people-sheet");
  });
});

describe("W24 identification (DL-01 / DL-02 / DL-09 / DL-14)", () => {
  it("the picker is progressive depth: clean first face, one tap finishes, family opens depth", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    await render(
      <RelationshipPickerSheet
        personName="Chanelle Brooks"
        currentType={null}
        onSave={onSave}
        onClose={onClose}
      />,
    );
    // FIRST FACE (persona-spectrum steer): the question + choices,
    // nothing else competing — no subtype step, no Save button.
    expect(q('[data-testid="r19-family-subtype-step"]')).toBeNull();
    expect(q('[data-testid="r19-relationship-save"]')).toBeNull();
    // Family does NOT save on tap — it opens the depth.
    click(q('[data-testid="r19-relationship-option-family"]'));
    expect(onSave).not.toHaveBeenCalled();
    expect(q('[data-testid="r19-family-subtype-step"]')).not.toBeNull();
    click(q('[data-testid="r19-family-subtype-sibling"]'));
    click(q('[data-testid="r19-relationship-save"]'));
    await flush();
    expect(onSave).toHaveBeenCalledWith({
      type: "family",
      familySubtype: "sibling",
      familyMinor: false,
      // N4: a family save carries the band statement as shown
      // (none established here).
      ageBand: null,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("one tap on a plain type saves and closes — a new user is never examined", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    await render(
      <RelationshipPickerSheet
        personName="Jordan Ellis"
        currentType={null}
        onSave={onSave}
        onClose={onClose}
      />,
    );
    click(q('[data-testid="r19-relationship-option-partner"]'));
    await flush();
    expect(onSave).toHaveBeenCalledWith({
      type: "partner",
      familySubtype: null,
      familyMinor: false,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("close circle sits quietly below and is REAL: it moves the type through the one write", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    await render(
      <RelationshipPickerSheet
        personName="Sabrina Nguyen"
        currentType="friend"
        onSave={onSave}
        onClose={() => {}}
      />,
    );
    const toggle = q('[data-testid="r19-close-circle-toggle"]');
    expect(toggle).not.toBeNull();
    expect(toggle!.getAttribute("aria-checked")).toBe("false");
    // ON for a friend = choose Close friend (the backend's derived
    // membership follows the type — the toggle runs the same write).
    click(toggle);
    await flush();
    expect(onSave).toHaveBeenCalledWith({
      type: "close_friend",
      familySubtype: null,
      familyMinor: false,
    });
  });

  it("close circle reads ON and locked for a partner — a cue, never a fake write", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    await render(
      <RelationshipPickerSheet
        personName="Chanelle Brooks"
        currentType="partner"
        onSave={onSave}
        onClose={() => {}}
      />,
    );
    const toggle = q('[data-testid="r19-close-circle-toggle"]');
    expect(toggle!.getAttribute("aria-checked")).toBe("true");
    expect(toggle!.getAttribute("aria-disabled")).toBe("true");
    click(toggle);
    await flush();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("profile row opens the picker; saving Partner writes by person id; the thread header then shows the tie", async () => {
    let rows: Array<Record<string, unknown>> = [];
    listRelationships.mockImplementation(async () => ({
      relationships: rows,
      contacts: [],
      allowed_types: [],
      family_subtypes: [],
    }));
    setRelationshipType.mockImplementation(async () => {
      rows = [{ contact_user_id: "u-chanelle", type: "partner" }];
      return { relationship: { id: "r1" } };
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
    // Open Chanelle's thread, then her profile.
    click(q('[data-testid="chats-row"]'));
    await flush();
    click(q('[data-testid="thread-header-avatar"]'));
    await flush();
    expect(q('[data-testid="r19-profile-identify-row"]')).not.toBeNull();
    click(q('[data-testid="r19-profile-identify-row"]'));
    // One tap on Partner saves through the one write (no Save step).
    click(q('[data-testid="r19-relationship-option-partner"]'));
    await flush();
    expect(setRelationshipType).toHaveBeenCalledWith(
      "u-chanelle",
      "partner",
      undefined,
      "tok",
      { familySubtype: null, familyMinor: false, ageBand: undefined },
    );
    // The picker closed after the save.
    expect(q('[data-testid="r19-relationship-picker"]')).toBeNull();
    // Close the profile via Done, and read the thread header sub-line.
    const done = [...document.querySelectorAll("button")].find(
      (b) => b.textContent === "Done",
    );
    click(done ?? null);
    await flush();
    const sub = q(".c1-thread-sub");
    expect(sub?.textContent).toBe("Partner");
  });
});
