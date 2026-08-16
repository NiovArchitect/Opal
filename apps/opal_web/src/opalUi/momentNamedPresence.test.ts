import { describe, expect, it } from "vitest";
import {
  assertDirectInviteDestination,
  buildWhoFastPath,
  earnedNamedPresence,
  isDirectDyadConversation,
  isMultiPartyConversation,
  listDirectPeopleFromChats,
  listExplicitGroupsFromChats,
  resolveDirectConversationForPerson,
  shouldShowWhoSheet,
  WHO_FAST_PATH_CAP,
} from "./momentNamedPresence";

const mayaDyad = {
  id: "dyad-maya",
  name: "Maya Chen",
  composition: "dyad" as const,
  memberCount: 2,
  peers: [{ id: "u-maya", display_name: "Maya Chen" }],
};

const jordanDyad = {
  id: "dyad-jordan",
  name: "Jordan Lee",
  composition: "dyad" as const,
  memberCount: 2,
  peers: [{ id: "u-jordan", display_name: "Jordan Lee" }],
};

const samDyad = {
  id: "dyad-sam",
  name: "Sam",
  composition: "dyad" as const,
  memberCount: 2,
  peers: [{ id: "u-sam", display_name: "Sam" }],
};

const groupMayaChrisJordan = {
  id: "group-maya-chris-jordan",
  name: "Maya Chen, Chris, Jordan",
  composition: "group" as const,
  memberCount: 4,
  peers: [
    { id: "u-maya", display_name: "Maya Chen" },
    { id: "u-chris", display_name: "Chris" },
    { id: "u-jordan", display_name: "Jordan" },
  ],
};

describe("earnedNamedPresence P30R2 / P31-PATCH-01", () => {
  it("returns null without grounded chats", () => {
    expect(earnedNamedPresence([])).toBeNull();
  });

  it("does NOT Jordan-monopolize when Maya is also a dyad", () => {
    // List order: Maya first, then Jordan — both must be first-class via buildWhoFastPath
    const path = buildWhoFastPath([mayaDyad, jordanDyad, groupMayaChrisJordan]);
    const names = path.fastPath.map((p) => p.displayName);
    expect(names).toContain("Maya");
    expect(names).toContain("Jordan");
    expect(path.fastPath.length).toBeGreaterThanOrEqual(2);
  });

  it("falls back to first dyad chat when no Jordan", () => {
    const p = earnedNamedPresence([mayaDyad]);
    expect(p?.displayName).toBe("Maya");
    expect(p?.peerUserId).toBe("u-maya");
  });

  it("skips group-like names for people list", () => {
    const p = earnedNamedPresence([
      { id: "g", name: "Weekend group", composition: "group", memberCount: 4 },
      samDyad,
    ]);
    expect(p?.displayName).toBe("Sam");
    expect(p?.conversationId).toBe("dyad-sam");
  });
});

describe("WHO-FAST-PATH-01 multi-person + no monopoly", () => {
  it("puts Maya and Jordan on first sheet when both are direct", () => {
    const path = buildWhoFastPath([groupMayaChrisJordan, mayaDyad, jordanDyad]);
    const ids = path.fastPath.map((p) => p.peerUserId);
    expect(ids).toContain("u-maya");
    expect(ids).toContain("u-jordan");
    expect(path.groups.some((g) => g.conversationId === "group-maya-chris-jordan")).toBe(
      true,
    );
    // Group not in person rows
    expect(path.fastPath.every((p) => p.kind === "person")).toBe(true);
    expect(
      path.fastPath.some((p) => p.conversationId === "group-maya-chris-jordan"),
    ).toBe(false);
  });

  it("cap limits visibility not reachability", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      id: `dyad-${i}`,
      name: `Person${i}`,
      composition: "dyad" as const,
      memberCount: 2,
      peers: [{ id: `u-${i}`, display_name: `Person${i}` }],
    }));
    const path = buildWhoFastPath(many, WHO_FAST_PATH_CAP);
    expect(path.fastPath.length).toBe(WHO_FAST_PATH_CAP);
    expect(path.remainingPeople.length).toBe(8 - WHO_FAST_PATH_CAP);
    expect(path.hasMorePeople).toBe(true);
    // All 8 still reachable as people
    const all = listDirectPeopleFromChats(many);
    expect(all).toHaveLength(8);
  });

  it("HARD: group title never becomes Maya person row", () => {
    const onlyGroup = buildWhoFastPath([groupMayaChrisJordan]);
    expect(onlyGroup.fastPath).toHaveLength(0);
    expect(onlyGroup.hasGroups).toBe(true);
    expect(listDirectPeopleFromChats([groupMayaChrisJordan])).toHaveLength(0);
  });

  it("preserves list order as deterministic ranking (no Jordan hardcode)", () => {
    const mayaFirst = buildWhoFastPath([mayaDyad, jordanDyad]);
    expect(mayaFirst.fastPath[0]?.peerUserId).toBe("u-maya");
    const jordanFirst = buildWhoFastPath([jordanDyad, mayaDyad]);
    expect(jordanFirst.fastPath[0]?.peerUserId).toBe("u-jordan");
  });
});

describe("P31-PATCH-01 direct dyad audience — never silent group widen", () => {
  it("treats multi-name group title as multi-party", () => {
    expect(isMultiPartyConversation(groupMayaChrisJordan)).toBe(true);
    expect(isDirectDyadConversation(groupMayaChrisJordan)).toBe(false);
  });

  it("when dyad and group both exist, Maya resolves to dyad only", () => {
    const chats = [groupMayaChrisJordan, mayaDyad];
    const resolved = resolveDirectConversationForPerson(chats, "u-maya");
    expect(resolved?.conversationId).toBe("dyad-maya");
    expect(resolved?.conversationId).not.toBe("group-maya-chris-jordan");
    const gate = assertDirectInviteDestination(chats, resolved!.conversationId);
    expect(gate.ok).toBe(true);
    const groupGate = assertDirectInviteDestination(chats, "group-maya-chris-jordan");
    expect(groupGate.ok).toBe(false);
  });

  it("explicit group selection remains available separately", () => {
    const groups = listExplicitGroupsFromChats([groupMayaChrisJordan, mayaDyad]);
    expect(groups.map((g) => g.conversationId)).toContain("group-maya-chris-jordan");
  });
});

describe("context should delete steps (contract for T1-A)", () => {
  it("generic moment shows WHO; person-grounded skips WHO", () => {
    expect(shouldShowWhoSheet({ kind: "open" })).toBe(true);
    expect(shouldShowWhoSheet({ kind: "solo" })).toBe(false);
    expect(
      shouldShowWhoSheet({
        kind: "person",
        peerUserId: "u-maya",
        displayName: "Maya",
        conversationId: "dyad-maya",
      }),
    ).toBe(false);
    expect(
      shouldShowWhoSheet({
        kind: "group",
        conversationId: "g1",
        displayName: "Saturday Circle",
      }),
    ).toBe(false);
  });
});
