import { describe, expect, it } from "vitest";
import {
  assertDirectInviteDestination,
  earnedNamedPresence,
  isDirectDyadConversation,
  isMultiPartyConversation,
  listDirectPeopleFromChats,
  listExplicitGroupsFromChats,
  resolveDirectConversationForPerson,
} from "./momentNamedPresence";

describe("earnedNamedPresence P30R2 / P31-PATCH-01", () => {
  it("returns null without grounded chats", () => {
    expect(earnedNamedPresence([])).toBeNull();
  });

  it("prefers Jordan when present in dyad chats", () => {
    const p = earnedNamedPresence([
      {
        id: "1",
        name: "Alex",
        composition: "dyad",
        memberCount: 2,
        peers: [{ id: "u-alex", display_name: "Alex" }],
      },
      {
        id: "2",
        name: "Jordan Lee",
        composition: "dyad",
        memberCount: 2,
        peers: [{ id: "u-jordan", display_name: "Jordan Lee" }],
      },
    ]);
    expect(p?.displayName).toBe("Jordan");
    expect(p?.conversationId).toBe("2");
    expect(p?.peerUserId).toBe("u-jordan");
  });

  it("falls back to first dyad chat when no Jordan", () => {
    const p = earnedNamedPresence([
      {
        id: "c1",
        name: "Maya Chen",
        composition: "dyad",
        memberCount: 2,
        peers: [{ id: "u-maya", display_name: "Maya Chen" }],
      },
    ]);
    expect(p?.displayName).toBe("Maya");
    expect(p?.peerUserId).toBe("u-maya");
  });

  it("skips group-like names", () => {
    const p = earnedNamedPresence([
      { id: "g", name: "Weekend group", composition: "group", memberCount: 4 },
      {
        id: "p",
        name: "Sam",
        composition: "dyad",
        memberCount: 2,
        peers: [{ id: "u-sam", display_name: "Sam" }],
      },
    ]);
    expect(p?.displayName).toBe("Sam");
    expect(p?.conversationId).toBe("p");
  });
});

describe("P31-PATCH-01 direct dyad audience — never silent group widen", () => {
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

  const mayaDyad = {
    id: "dyad-founder-maya",
    name: "Maya Chen",
    composition: "dyad" as const,
    memberCount: 2,
    peers: [{ id: "u-maya", display_name: "Maya Chen" }],
  };

  it("treats multi-name group title as multi-party", () => {
    expect(isMultiPartyConversation(groupMayaChrisJordan)).toBe(true);
    expect(isDirectDyadConversation(groupMayaChrisJordan)).toBe(false);
  });

  it("HARD: selecting Maya never returns shared group conversation id", () => {
    // Only group exists with Maya in title — must not invent person from group
    const onlyGroup = earnedNamedPresence([groupMayaChrisJordan]);
    expect(onlyGroup).toBeNull();

    const resolved = resolveDirectConversationForPerson(
      [groupMayaChrisJordan],
      "u-maya",
    );
    expect(resolved).toBeNull();

    const people = listDirectPeopleFromChats([groupMayaChrisJordan]);
    expect(people.find((p) => p.peerUserId === "u-maya")).toBeUndefined();

    const groups = listExplicitGroupsFromChats([groupMayaChrisJordan]);
    expect(groups).toHaveLength(1);
    expect(groups[0].conversationId).toBe("group-maya-chris-jordan");
  });

  it("when dyad and group both exist, Maya resolves to dyad only", () => {
    const chats = [groupMayaChrisJordan, mayaDyad];
    const resolved = resolveDirectConversationForPerson(chats, "u-maya");
    expect(resolved?.conversationId).toBe("dyad-founder-maya");
    expect(resolved?.conversationId).not.toBe("group-maya-chris-jordan");
    expect(resolved?.peerUserId).toBe("u-maya");

    const gate = assertDirectInviteDestination(chats, resolved!.conversationId);
    expect(gate.ok).toBe(true);

    const groupGate = assertDirectInviteDestination(
      chats,
      "group-maya-chris-jordan",
    );
    expect(groupGate.ok).toBe(false);
    if (!groupGate.ok) {
      expect(groupGate.reason).toBe(
        "shared_group_must_not_widen_dyadic_invitation",
      );
    }
  });

  it("reuses existing Founder↔Maya dyad (no group destination)", () => {
    const p = earnedNamedPresence([groupMayaChrisJordan, mayaDyad]);
    // Jordan not in dyad list; Maya dyad present — may prefer Jordan only if dyad
    // Here only Maya dyad + group; first dyad person is Maya
    expect(p?.conversationId).toBe("dyad-founder-maya");
    expect(p?.peerUserId).toBe("u-maya");
  });

  it("explicit group selection remains available separately", () => {
    const groups = listExplicitGroupsFromChats([
      groupMayaChrisJordan,
      mayaDyad,
    ]);
    expect(groups.map((g) => g.conversationId)).toContain(
      "group-maya-chris-jordan",
    );
  });

  it("assertDirectInviteDestination rejects multi-party", () => {
    const r = assertDirectInviteDestination(
      [groupMayaChrisJordan],
      "group-maya-chris-jordan",
    );
    expect(r.ok).toBe(false);
  });
});
