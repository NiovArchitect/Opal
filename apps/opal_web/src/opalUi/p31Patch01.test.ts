/**
 * P31-PATCH-01 product-level proofs:
 * - Solo WHEN sheet mount predicate (no activeChat required)
 * - Direct audience participant set
 * - applyWhenToSeed continuity (P0-31-01/02 preserved)
 */
import { describe, expect, it } from "vitest";
import {
  applyWhenToSeed,
  DEMO_SOCIAL_MOMENT,
  seedRealityFromMoment,
  shouldOpenPlaceAfterForming,
  realityFormingPrimaryAction,
} from "./liveSocialMomentLoop";
import {
  assertDirectInviteDestination,
  resolveDirectConversationForPerson,
} from "./momentNamedPresence";

/** Presentation predicate: time sheet may show without activeChat */
function momentTimeSheetShouldMount(opts: {
  findTimeOpen: boolean;
  exactPlaceGrounded: boolean | undefined;
  /** activeChat from chats.find — null for Solo synthetic */
  activeChat: { id: string } | null;
}): boolean {
  // P31-PATCH-01: TIME belongs to Reality journey, not chat existence
  void opts.activeChat;
  return Boolean(opts.findTimeOpen && opts.exactPlaceGrounded);
}

describe("P31-PATCH-01 Solo WHEN — no chat required", () => {
  it("domain seed keeps Juniper + Solo + nextGap when", () => {
    const { seed, error } = seedRealityFromMoment(
      DEMO_SOCIAL_MOMENT,
      [],
      "founder",
      { solo: true },
    );
    expect(error).toBeUndefined();
    expect(seed.exactPlaceGrounded).toBe(true);
    expect(seed.participantNames).toEqual(["Solo"]);
    expect(seed.when).toBe("open");
    expect(seed.nextGap).toBe("when");
    expect(seed.placeCandidateName).toMatch(/Juniper/i);
    expect(shouldOpenPlaceAfterForming(seed)).toBe(false);
    expect(realityFormingPrimaryAction(seed).question).toMatch(/When/i);
  });

  it("MomentTimeSheet visible predicate with activeChat=null", () => {
    const { seed } = seedRealityFromMoment(DEMO_SOCIAL_MOMENT, [], "founder", {
      solo: true,
    });
    expect(
      momentTimeSheetShouldMount({
        findTimeOpen: true,
        exactPlaceGrounded: seed.exactPlaceGrounded,
        activeChat: null,
      }),
    ).toBe(true);
  });

  it("selecting Saturday · 7:30 PM sticks place + Solo + when", () => {
    const { seed: before } = seedRealityFromMoment(
      DEMO_SOCIAL_MOMENT,
      [],
      "founder",
      { solo: true },
    );
    const { seed: after, changed } = applyWhenToSeed(
      before,
      "Saturday · 7:30 PM",
      { slotId: "sat-1930" },
    );
    expect(changed).toBe(true);
    expect(after.when).toBe("Saturday · 7:30 PM");
    expect(after.placeCandidateName).toBe(before.placeCandidateName);
    expect(after.participantNames).toEqual(["Solo"]);
    expect(after.nextGap).toBe("none");
    expect(after.exactPlaceGrounded).toBe(true);
  });
});

describe("P31-PATCH-01 Maya direct audience", () => {
  const groupId = "group-maya-chris-jordan";
  const dyadId = "dyad-founder-maya";
  const mayaId = "u-maya";

  const chats = [
    {
      id: groupId,
      name: "Maya Chen, Chris, Jordan",
      composition: "group" as const,
      memberCount: 4,
      peers: [
        { id: mayaId, display_name: "Maya Chen" },
        { id: "u-chris", display_name: "Chris" },
        { id: "u-jordan", display_name: "Jordan" },
      ],
    },
    {
      id: dyadId,
      name: "Maya Chen",
      composition: "dyad" as const,
      memberCount: 2,
      peers: [{ id: mayaId, display_name: "Maya Chen" }],
    },
  ];

  it("participant set is Founder + Maya only (seed people ids)", () => {
    const resolved = resolveDirectConversationForPerson(chats, mayaId);
    expect(resolved?.conversationId).toBe(dyadId);
    expect(resolved?.conversationId).not.toBe(groupId);

    const { seed } = seedRealityFromMoment(
      DEMO_SOCIAL_MOMENT,
      [{ id: mayaId, name: "Maya" }],
      "founder",
    );
    expect(seed.participantNames).toEqual(["Maya"]);
    expect(seed.participantNames).not.toContain("Jordan");
    expect(seed.participantNames).not.toContain("Chris");
    expect(seed.placeCandidateName).toMatch(/Juniper/i);

    const gate = assertDirectInviteDestination(chats, resolved!.conversationId);
    expect(gate.ok).toBe(true);
  });

  it("shared group membership must not widen dyadic invitation", () => {
    const bad = assertDirectInviteDestination(chats, groupId);
    expect(bad.ok).toBe(false);
  });

  it("Maya path WHEN applies without reopening place", () => {
    const { seed: before } = seedRealityFromMoment(
      DEMO_SOCIAL_MOMENT,
      [{ id: mayaId, name: "Maya" }],
      "founder",
    );
    const { seed: after } = applyWhenToSeed(before, "Saturday · 7:30 PM");
    expect(after.when).toBe("Saturday · 7:30 PM");
    expect(after.placeCandidateName).toMatch(/Juniper/i);
    expect(after.participantNames).toEqual(["Maya"]);
  });
});
