import { describe, expect, it, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import {
  interpretSeedThreadReply,
  isSeedDemoChatTarget,
  seedChatIdForPersonName,
  seedChatKeyFrom,
  seedPeerAttribution,
  SeedSimulatedBanner,
} from "./seedThreadIntelligence";
import { ALEX_MEXICO_TRIP_MEMORIES, isAlexTripGraphTarget } from "./alexTripMemories";

describe("seedThreadIntelligence", () => {
  it("matches ONLY seed-chat-* conversation ids (Repair #11 - no name hijack)", () => {
    expect(seedChatKeyFrom({ conversationId: "seed-chat-alex" })).toBe("seed-chat-alex");
    expect(seedChatKeyFrom({ conversationId: "SEED-CHAT-MAYA" })).toBe("SEED-CHAT-MAYA");
    expect(seedChatKeyFrom({ conversationId: "  seed-chat-juniper-crew " })).toBe(
      "seed-chat-juniper-crew",
    );
  });

  it("never matches display names - real conversations are never hijacked", () => {
    // Pre-Repair #11 behavior: these returned seed keys and painted fabricated
    // messages as real people. Now they must all be null.
    for (const name of [
      "Maya",
      "Maya Chen",
      "Alex Rivera",
      "Chanelle",
      "chanelle",
      "Sabrina",
      "Juniper Crew",
      "Saturday Crew",
    ]) {
      expect(seedChatKeyFrom({ displayName: name })).toBeNull();
      expect(
        seedChatKeyFrom({ conversationId: "a1b2c3d4-real-uuid", displayName: name }),
      ).toBeNull();
    }
    expect(seedChatKeyFrom({ conversationId: "a1b2c3d4-real-uuid" })).toBeNull();
    expect(seedChatKeyFrom({})).toBeNull();
    expect(seedChatKeyFrom({ conversationId: null, displayName: null })).toBeNull();
  });

  it("locks Maya plan on yes after Opal proposal", () => {
    const result = interpretSeedThreadReply({
      chatKey: "seed-chat-maya",
      displayName: "Maya",
      userBody: "yes",
      recent: [
        {
          from: "them",
          body: "Got it - 10:30 market, 12 coast drive?",
          opalFilament: true,
          opalSystemConsequence: true,
        },
        { from: "me", body: "yes" },
      ],
    });
    expect(result?.opal?.body).toMatch(/Locked in/i);
    expect(result?.opal?.body).toMatch(/10:30/);
    expect(result?.opal?.body).toMatch(/coast/i);
    expect(result?.confirmTime).toMatch(/10:30/);
  });

  it("Alex responds to rooftop memory talk", () => {
    const result = interpretSeedThreadReply({
      chatKey: "seed-chat-alex",
      displayName: "Alex",
      userBody: "that rooftop shot though",
      recent: [
        {
          from: "them",
          body: "Trip Graph · Mexico City - 14 memories",
          opalFilament: true,
        },
        { from: "me", body: "that rooftop shot though" },
      ],
    });
    expect(result?.peer?.senderDisplayName).toBe("Alex");
    expect(result?.peer?.body).toMatch(/rooftop|Trip Graph|light/i);
    expect(result?.opal?.body).toMatch(/14 memor/i);
  });

  it("exposes exactly 14 Alex Mexico memories", () => {
    expect(ALEX_MEXICO_TRIP_MEMORIES).toHaveLength(14);
    expect(ALEX_MEXICO_TRIP_MEMORIES.every((m) => m.person === "Alex")).toBe(true);
    expect(isAlexTripGraphTarget("seed-alex-graph-gallery")).toBe(true);
    expect(isAlexTripGraphTarget("Trip Graph · Mexico City - 14 memories")).toBe(true);
  });
});

/**
 * PHASE 3 ATTACK LIST — seed-confusion adversarial tests (Repair #11).
 * Prove seed content can NEVER leak into or be mistaken for production
 * behavior. These assertions must stay strong: a future fix-test-fix-test
 * loop must not weaken them.
 *
 * NOTE: this repo runs vitest, not jest (package.json: "test": "vitest run").
 */
describe("seed quarantine - adversarial", () => {
  describe("seedChatKeyFrom never matches real conversations", () => {
    const realIds = [
      "a1b2c3d4-e5f6-7890-abcd-ef1234567890", // UUID
      "12345",
      "chat-123",
      "conversation_abc",
      "xseed-chat-a", // prefix not at start
      "seed-chatx", // no dash after prefix
      "my-seed-chat-maya", // prefix buried
      "SEEDCHAT-maya",
      "",
      "   ",
    ];
    it.each(realIds)("returns null for real id pattern %p", (id) => {
      expect(seedChatKeyFrom({ conversationId: id })).toBeNull();
    });

    const realNames = [
      "Chanelle",
      "chanelle",
      "CHANELLE",
      "Chanelle Smith",
      "Maya",
      "Maya Chen",
      "Alex",
      "Alex Rivera",
      "Sabrina",
      "Juniper Crew",
      "juniper crew",
      "Saturday Crew",
      "Saturday crew",
      "Sam",
      "Founder",
      "Conversation",
    ];
    it.each(realNames)(
      "returns null for display name %p even paired with a real id",
      (name) => {
        expect(seedChatKeyFrom({ displayName: name })).toBeNull();
        expect(
          seedChatKeyFrom({
            conversationId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            displayName: name,
          }),
        ).toBeNull();
      },
    );

    it("matches only the ^seed-chat- id shape (case-insensitive, trimmed)", () => {
      expect(seedChatKeyFrom({ conversationId: "seed-chat-maya" })).toBe("seed-chat-maya");
      expect(seedChatKeyFrom({ conversationId: "SEED-CHAT-ALEX" })).toBe("SEED-CHAT-ALEX");
      expect(seedChatKeyFrom({ conversationId: "  seed-chat-x  " })).toBe("seed-chat-x");
    });
  });

  describe("seedChatIdForPersonName - intentional, documented exception", () => {
    // This helper exists ONLY for seed-mode-only person routing (openPersonChat,
    // gated on founderSeedEnabled). It must never be used in render/send paths.
    it("maps the five seed fixtures", () => {
      expect(seedChatIdForPersonName("Maya")).toBe("seed-chat-maya");
      expect(seedChatIdForPersonName("Chanelle")).toBe("seed-chat-chanelle");
      expect(seedChatIdForPersonName("Alex Rivera")).toBe("seed-chat-alex");
      expect(seedChatIdForPersonName("Sabrina")).toBe("seed-chat-sabrina");
      expect(seedChatIdForPersonName("Juniper Crew")).toBe("seed-chat-juniper-crew");
    });
    it("returns null for unknown names", () => {
      expect(seedChatIdForPersonName("Sam")).toBeNull();
      expect(seedChatIdForPersonName(null)).toBeNull();
      expect(seedChatIdForPersonName("")).toBeNull();
    });
  });

  describe("isSeedDemoChatTarget - production send path can never enter the seed branch", () => {
    const realIds = [
      "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "12345",
      "xseed-chat-a",
      null,
      undefined,
      "",
    ];
    it.each(realIds)(
      "real id %p never enters the seed branch, even with seed mode ON",
      (id) => {
        expect(isSeedDemoChatTarget(id, true)).toBe(false);
        expect(isSeedDemoChatTarget(id, false)).toBe(false);
      },
    );
    it("seed-chat-* ids enter ONLY when seed mode is on", () => {
      expect(isSeedDemoChatTarget("seed-chat-maya", true)).toBe(true);
      expect(isSeedDemoChatTarget("seed-chat-maya", false)).toBe(false);
      expect(isSeedDemoChatTarget("SEED-CHAT-ALEX", true)).toBe(true);
    });
  });

  describe("seedPeerAttribution - no generated text attributable to a real person", () => {
    it("marks peer messages non-human with the simulated suffix", () => {
      expect(
        seedPeerAttribution({ from: "them", senderDisplayName: "Chanelle" }),
      ).toEqual({ humanSpeaker: false, senderDisplayName: "Chanelle · simulated" });
      expect(
        seedPeerAttribution({ from: "them", senderDisplayName: "Maya" }),
      ).toEqual({ humanSpeaker: false, senderDisplayName: "Maya · simulated" });
    });
    it("never double-suffixes", () => {
      expect(
        seedPeerAttribution({ from: "them", senderDisplayName: "Chanelle · simulated" }),
      ).toEqual({ humanSpeaker: false, senderDisplayName: "Chanelle · simulated" });
    });
    it("nameless peer turns stay non-human with null name", () => {
      expect(seedPeerAttribution({ from: "them", senderDisplayName: null })).toEqual({
        humanSpeaker: false,
        senderDisplayName: null,
      });
    });
    it("returns null for Opal/system/own turns - those are not peers", () => {
      expect(
        seedPeerAttribution({ from: "them", opalFilament: true, senderDisplayName: "X" }),
      ).toBeNull();
      expect(
        seedPeerAttribution({
          from: "them",
          opalSystemConsequence: true,
          senderDisplayName: "X",
        }),
      ).toBeNull();
      expect(
        seedPeerAttribution({ from: "me", senderDisplayName: "You" }),
      ).toBeNull();
    });
  });

  describe("SeedSimulatedBanner - unmistakable while seed mode is active", () => {
    afterEach(() => {
      window.history.pushState({}, "", "/");
      window.sessionStorage.clear();
      window.localStorage.clear();
    });

    it("renders the SIMULATED banner when seed mode is on", () => {
      window.history.pushState({}, "", "/?opal_founder_seed=1");
      const html = renderToString(SeedSimulatedBanner());
      expect(html).toContain("opal-seed-simulated-banner");
      expect(html).toMatch(/SIMULATED/i);
      expect(html).toMatch(/not real/i);
    });

    it("renders nothing when seed mode is off", () => {
      const html = renderToString(SeedSimulatedBanner());
      expect(html).toBe("");
    });
  });
});
