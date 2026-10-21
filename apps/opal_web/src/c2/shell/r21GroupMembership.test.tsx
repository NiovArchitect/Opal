/**
 * @vitest-environment jsdom
 *
 * Repair #21 (W-5b) - group membership UI pins.
 *
 * The panel renders ONLY the backend's membership projection:
 *  - members with their server-decided flags (creator mark, the
 *    per-viewer `can_remove` verdict of the admin rule);
 *  - a multi-select add that sends everyone selected in ONE call
 *    to the real endpoint;
 *  - remove/leave buttons exactly where `can_remove` says so - a
 *    non-creator sees a Leave for themselves and nothing on anyone
 *    else;
 *  - the recorded who-came-and-went lines, verbatim;
 *  - a server refusal surfaces as its own plain line.
 * Plus the two surfaces around it: the thread header's People
 * affordance (present only when the host wires it) and the orbit
 * screen's membership-events card.
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
import { ThreadShell } from "../../opalUi/c1/C1Surfaces";
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

beforeEach(() => {
  fetchMembershipMock.mockReset();
  addMembersMock.mockReset();
  removeMemberMock.mockReset();
  listPeopleMock.mockReset();
  listPeopleMock.mockResolvedValue({
    people: [
      { id: "u-dan", person_id: "u-dan", display_name: "Dan", name: "Dan" },
      { id: "u-eve", person_id: "u-eve", display_name: "Eve", name: "Eve" },
    ],
    count: 2,
  });
  addMembersMock.mockResolvedValue({ conversation_id: "conv-1", member_ids: [], member_count: 5, added_ids: ["u-dan", "u-eve"], already_member_ids: [], composition: "group" });
  removeMemberMock.mockResolvedValue({ conversation_id: "conv-1", removed_user_id: "u-ben", left: false, member_ids: [], member_count: 3, composition: "group" });
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

/** The creator's view: Ana (viewer, creator), Ben, Cleo. */
const creatorView: ConversationMembership = {
  conversation_id: "conv-1",
  creator_user_id: "u-ana",
  viewer_is_creator: true,
  composition: "group",
  members: [
    member("u-ana", "Ana", { is_creator: true, is_viewer: true, can_remove: true }),
    member("u-ben", "Ben", { can_remove: true }),
    member("u-cleo", "Cleo", { can_remove: true }),
  ],
  membership_events: [
    {
      kind: "member_added",
      label: "Cleo joined the conversation",
      detail: "3 people",
      actor_user_id: "u-ana",
      target_user_id: "u-cleo",
      at: "2026-10-19T10:00:00Z",
    },
  ],
};

/** Ben's view: only his own row carries can_remove (leave). */
const memberView: ConversationMembership = {
  ...creatorView,
  viewer_is_creator: false,
  members: [
    member("u-ana", "Ana", { is_creator: true }),
    member("u-ben", "Ben", { is_viewer: true, can_remove: true }),
    member("u-cleo", "Cleo"),
  ],
};

function rowFor(container: HTMLElement, userId: string) {
  return container.querySelector(
    `[data-testid='group-membership-member'][data-user-id='${userId}']`,
  );
}

describe("R21 GroupMembershipPanel - the projection, rendered", () => {
  it("creator view: creator marked, remove offered on others, leave on self, events read back", async () => {
    fetchMembershipMock.mockResolvedValue({ membership: creatorView });
    const container = await render(
      <GroupMembershipPanel conversationId="conv-1" bearer="tok" />,
    );
    expect(rowFor(container, "u-ana")?.textContent).toContain("started this conversation");
    expect(rowFor(container, "u-ben")?.querySelector("[data-testid='group-membership-remove']")).not.toBeNull();
    expect(rowFor(container, "u-ana")?.querySelector("[data-testid='group-membership-leave']")).not.toBeNull();
    expect(container.querySelector("[data-testid='group-membership-event']")?.textContent).toBe(
      "Cleo joined the conversation",
    );
  });

  it("non-creator view: no remove on anyone else, leave only on self", async () => {
    fetchMembershipMock.mockResolvedValue({ membership: memberView });
    const container = await render(
      <GroupMembershipPanel conversationId="conv-1" bearer="tok" />,
    );
    expect(container.querySelectorAll("[data-testid='group-membership-remove']")).toHaveLength(0);
    expect(rowFor(container, "u-ben")?.querySelector("[data-testid='group-membership-leave']")).not.toBeNull();
    expect(rowFor(container, "u-ana")?.textContent).toContain("started this conversation");
  });
});

describe("R21 GroupMembershipPanel - the writes", () => {
  it("multi-select add: two people, ONE call, then a re-read", async () => {
    const grown: ConversationMembership = {
      ...creatorView,
      members: [
        ...creatorView.members,
        member("u-dan", "Dan", { can_remove: true }),
        member("u-eve", "Eve", { can_remove: true }),
      ],
    };
    fetchMembershipMock
      .mockResolvedValueOnce({ membership: creatorView })
      .mockResolvedValue({ membership: grown });
    const onChanged = vi.fn();
    const container = await render(
      <GroupMembershipPanel conversationId="conv-1" bearer="tok" onChanged={onChanged} />,
    );
    const boxes = container.querySelectorAll(
      "[data-testid='group-membership-candidate'] input[type='checkbox']",
    );
    expect(boxes).toHaveLength(2);
    await act(async () => {
      (boxes[0] as HTMLInputElement).click();
      (boxes[1] as HTMLInputElement).click();
    });
    const addBtn = container.querySelector(
      "[data-testid='group-membership-add-selected']",
    ) as HTMLButtonElement;
    expect(addBtn.textContent).toBe("Add 2 people");
    await act(async () => {
      addBtn.click();
    });
    expect(addMembersMock).toHaveBeenCalledTimes(1);
    const [cid, ids, bearer] = addMembersMock.mock.calls[0];
    expect(cid).toBe("conv-1");
    expect([...ids].sort()).toEqual(["u-dan", "u-eve"]);
    expect(bearer).toBe("tok");
    expect(onChanged).toHaveBeenCalled();
    // The re-read is what renders: Dan's row is there because the
    // server said so.
    expect(rowFor(container, "u-dan")).not.toBeNull();
  });

  it("remove: the creator's tap calls the real DELETE shape and re-reads", async () => {
    const shrunk: ConversationMembership = {
      ...creatorView,
      members: creatorView.members.filter((m) => m.user_id !== "u-ben"),
    };
    fetchMembershipMock
      .mockResolvedValueOnce({ membership: creatorView })
      .mockResolvedValue({ membership: shrunk });
    const container = await render(
      <GroupMembershipPanel conversationId="conv-1" bearer="tok" />,
    );
    const btn = rowFor(container, "u-ben")?.querySelector(
      "[data-testid='group-membership-remove']",
    ) as HTMLButtonElement;
    await act(async () => {
      btn.click();
    });
    expect(removeMemberMock).toHaveBeenCalledWith("conv-1", "u-ben", "tok");
    expect(rowFor(container, "u-ben")).toBeNull();
  });

  it("leave: the viewer's own tap calls remove for themselves and tells the host", async () => {
    fetchMembershipMock.mockResolvedValue({ membership: memberView });
    const onLeft = vi.fn();
    const container = await render(
      <GroupMembershipPanel conversationId="conv-1" bearer="tok" onLeft={onLeft} />,
    );
    const btn = rowFor(container, "u-ben")?.querySelector(
      "[data-testid='group-membership-leave']",
    ) as HTMLButtonElement;
    await act(async () => {
      btn.click();
    });
    expect(removeMemberMock).toHaveBeenCalledWith("conv-1", "u-ben", "tok");
    expect(onLeft).toHaveBeenCalled();
  });

  it("a server refusal surfaces as its own plain line", async () => {
    fetchMembershipMock.mockResolvedValue({ membership: creatorView });
    const refusal = new Error("Request failed") as Error & { serverMessage?: string };
    refusal.serverMessage =
      "Only the person who started this conversation can remove someone else. You can leave any time.";
    removeMemberMock.mockRejectedValue(refusal);
    const container = await render(
      <GroupMembershipPanel conversationId="conv-1" bearer="tok" />,
    );
    const btn = rowFor(container, "u-ben")?.querySelector(
      "[data-testid='group-membership-remove']",
    ) as HTMLButtonElement;
    await act(async () => {
      btn.click();
    });
    expect(container.querySelector("[data-testid='group-membership-error']")?.textContent).toBe(
      "Only the person who started this conversation can remove someone else. You can leave any time.",
    );
    // Ben's row stands - the refusal changed nothing.
    expect(rowFor(container, "u-ben")).not.toBeNull();
  });
});

describe("R21 thread header + orbit record", () => {
  it("the People affordance renders only when the host wires it", async () => {
    const withButton = await render(
      <ThreadShell
        name="Weekend crew"
        initials="W"
        messages={[]}
        plansById={new Map()}
        composerPlaceholder="Message Weekend crew"
        onManageMembers={() => {}}
      />,
    );
    expect(withButton.querySelector("[data-testid='thread-manage-members']")).not.toBeNull();

    const without = await render(
      <ThreadShell
        name="Ana"
        initials="A"
        messages={[]}
        plansById={new Map()}
        composerPlaceholder="Message Ana"
      />,
    );
    expect(without.querySelector("[data-testid='thread-manage-members']")).toBeNull();
  });

  it("the orbit screen reads back who came and went from the projection", async () => {
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
      ],
      plans: [],
      next_plan: null,
      membership_events: [
        { kind: "member_added", label: "Dan joined the conversation", at: "2026-10-19T10:00:00Z" },
        { kind: "member_removed", label: "Ben left the conversation", at: "2026-10-19T11:00:00Z" },
      ],
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
    // V4.2 (F-4): membership lines are full-card content - one tap from slim home.
    (container.querySelector("[data-testid='orbit-where-toggle']") as HTMLButtonElement).click();
    await Promise.resolve();
    const lines = [...container.querySelectorAll("[data-testid='orbit-membership-line']")].map(
      (el) => el.textContent,
    );
    expect(lines).toEqual(["Dan joined the conversation", "Ben left the conversation"]);
  });
});
