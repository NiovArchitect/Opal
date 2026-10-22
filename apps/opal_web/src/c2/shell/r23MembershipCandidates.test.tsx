/**
 * @vitest-environment jsdom
 *
 * Repair #23 (F-1 / W-5b seam) - membership candidate keying pins.
 *
 * The rig defect (audit F-1; frames membership-manage-dark/light):
 * the manage panel offered a CURRENT MEMBER as an add candidate,
 * and the add produced a duplicate member listing ("Maya Torres,
 * Maya Torres") in the panel and the group orbit header.
 *
 * The shape these fixtures mirror is the one the backend code
 * proves possible: the people projection's row key is an ASSEMBLED
 * identity (`People.to_contract` emits id == person_id ==
 * identity_id, assembled in `People.for_viewer` from conversation
 * user ids, contact `contact_user_id`s, and establishment
 * participant ids), while membership speaks the ACCOUNT user id
 * (`ConversationMember.user_id` -> `User.id`, rendered as the
 * membership projection's `user_id`). A current member whose
 * people row is keyed by an identity from a different source than
 * her membership user_id passed the old filter, which compared
 * membership user_ids against the identity key `p.id`.
 *
 * The fix keys candidates on the contract's distinct
 * `account_user_id` field: candidates exclude current members by
 * that key, dedupe by that key, rows with no account behind them
 * are not addable at all, and the add call sends that key. The
 * members list and the orbit header parties line dedupe by user
 * id at composition, so a duplicated row can never print a name
 * twice.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConversationMembership } from "../../api/productClient";

const fetchMembershipMock = vi.fn();
const addMembersMock = vi.fn();
const removeMemberMock = vi.fn();
const listPeopleMock = vi.fn();
vi.mock("../../api/productClient", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    fetchConversationMembership: (...args: unknown[]) => fetchMembershipMock(...args),
    addConversationMembers: (...args: unknown[]) => addMembersMock(...args),
    removeConversationMember: (...args: unknown[]) => removeMemberMock(...args),
    listPeopleProjection: (...args: unknown[]) => listPeopleMock(...args),
  };
});

import { GroupMembershipPanel } from "./GroupMembership";
import { OrbitScreen } from "../../opalUi/c1/OrbitScreen";
import type { OrbitScope } from "../../opalUi/c1/opalChatScope";
import type { OrbitProjectionContract } from "../../api/productClient";

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
});

const member = (
  user_id: string,
  display_name: string,
  flags: Partial<{ is_creator: boolean; is_viewer: boolean; can_remove: boolean }> = {},
) => ({
  user_id,
  display_name,
  handle: null,
  is_creator: false,
  is_viewer: false,
  can_remove: false,
  ...flags,
});

/** Ana (viewer, creator), Maya, Ben are in the conversation.
 *  Maya's membership user_id is her ACCOUNT id, "u-maya-account". */
const membership: ConversationMembership = {
  conversation_id: "conv-1",
  creator_user_id: "u-ana",
  viewer_is_creator: true,
  composition: "group",
  members: [
    member("u-ana", "Ana", { is_creator: true, is_viewer: true, can_remove: true }),
    member("u-maya-account", "Maya Torres", { can_remove: true }),
    member("u-ben", "Ben", { can_remove: true }),
  ],
  membership_events: [],
};

const personRow = (
  id: string,
  account_user_id: string | null,
  display_name: string,
) => ({
  id,
  person_id: id,
  account_user_id,
  display_name,
  name: display_name,
  account_backed: account_user_id !== null,
  conversation_id: null,
  last_talked_at: null,
  talk_count: 0,
  relationship_type: null,
});

beforeEach(() => {
  fetchMembershipMock.mockReset();
  addMembersMock.mockReset();
  removeMemberMock.mockReset();
  listPeopleMock.mockReset();
  fetchMembershipMock.mockResolvedValue({ membership });
  addMembersMock.mockResolvedValue({
    conversation_id: "conv-1",
    member_ids: [],
    member_count: 4,
    added_ids: ["u-dan"],
    already_member_ids: [],
    composition: "group",
  });
  removeMemberMock.mockResolvedValue({});
  // The rig's identity shapes: Maya (a current member) keyed by a
  // contact-source identity whose account is her membership
  // account; Dan present under TWO identity keys for ONE account;
  // Wren keyed by an identity with no account behind it at all.
  listPeopleMock.mockResolvedValue({
    people: [
      personRow("src-contact-maya", "u-maya-account", "Maya Torres"),
      personRow("u-dan", "u-dan", "Dan"),
      personRow("src-establishment-dan", "u-dan", "Dan"),
      personRow("src-contact-wren", null, "Wren"),
    ],
    count: 4,
  });
});

describe("R23 GroupMembershipPanel - candidate keying (F-1)", () => {
  it("a current member keyed by a different-source identity is NOT offered; candidates dedupe by account id; account-less rows are not offered", async () => {
    const container = await render(
      <GroupMembershipPanel conversationId="conv-1" bearer="tok" />,
    );
    const candidates = container.querySelectorAll(
      "[data-testid='group-membership-candidate']",
    );
    // Only Dan, exactly once, keyed by his account user id.
    expect(candidates).toHaveLength(1);
    expect(candidates[0].getAttribute("data-user-id")).toBe("u-dan");
    expect(candidates[0].textContent).toContain("Dan");
    expect(container.textContent).not.toContain("Wren");
  });

  it("the add call sends the account user id, once", async () => {
    const container = await render(
      <GroupMembershipPanel conversationId="conv-1" bearer="tok" />,
    );
    const box = container.querySelector(
      "[data-testid='group-membership-candidate'] input[type='checkbox']",
    ) as HTMLInputElement;
    await act(async () => {
      box.click();
    });
    const addBtn = container.querySelector(
      "[data-testid='group-membership-add-selected']",
    ) as HTMLButtonElement;
    await act(async () => {
      addBtn.click();
    });
    expect(addMembersMock).toHaveBeenCalledTimes(1);
    const [cid, ids, bearer] = addMembersMock.mock.calls[0];
    expect(cid).toBe("conv-1");
    expect(ids).toEqual(["u-dan"]);
    expect(bearer).toBe("tok");
  });

  it("the members list dedupes by user id at render - a duplicated member row prints once", async () => {
    const duplicated: ConversationMembership = {
      ...membership,
      members: [
        ...membership.members,
        member("u-maya-account", "Maya Torres", { can_remove: true }),
      ],
    };
    fetchMembershipMock.mockResolvedValue({ membership: duplicated });
    const container = await render(
      <GroupMembershipPanel conversationId="conv-1" bearer="tok" />,
    );
    const rows = container.querySelectorAll("[data-testid='group-membership-member']");
    expect(rows).toHaveLength(3);
    expect(
      container.querySelectorAll(
        "[data-testid='group-membership-member'][data-user-id='u-maya-account']",
      ),
    ).toHaveLength(1);
  });
});

describe("R23 OrbitScreen - header parties composition (F-1)", () => {
  it("the parties line names each person once when the projection carries a duplicated party row", async () => {
    const scope: OrbitScope = {
      conversationId: "conv-1",
      title: "Weekend crew",
      composition: "group",
      party: [{ id: "u-ana", name: "Ana", isViewer: true, pending: false, limbo: false }],
      personId: null,
      personName: null,
      planId: null,
      planTitle: null,
    } as OrbitScope;
    const orbit: OrbitProjectionContract = {
      conversation_id: "conv-1",
      composition: "group",
      parties: [
        { user_id: "u-ana", display_name: "Ana", is_viewer: true, pending: false, limbo: false },
        { user_id: "u-maya-account", display_name: "Maya Torres", is_viewer: false, pending: false, limbo: false },
        { user_id: "u-maya-account", display_name: "Maya Torres", is_viewer: false, pending: false, limbo: false },
        { user_id: "u-ben", display_name: "Ben", is_viewer: false, pending: false, limbo: false },
      ],
      plans: [],
      next_plan: null,
      membership_events: [],
    };
    const container = await render(
      <OrbitScreen
        scope={scope}
        orbit={orbit}
        sessions={[]}
        onOpenSession={() => {}}
        onStartNew={() => {}}
        onBackToThread={() => {}}
      />,
    );
    expect(container.querySelector("[data-testid='orbit-parties']")?.textContent).toBe(
      "You - Maya Torres - Ben",
    );
    expect(
      container
        .querySelector("[data-testid='orbit-composition']")
        ?.getAttribute("data-party-count"),
    ).toBe("3");
  });
});
