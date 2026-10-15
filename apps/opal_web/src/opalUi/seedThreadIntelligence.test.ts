import { describe, expect, it } from "vitest";
import {
  interpretSeedThreadReply,
  seedChatKeyFrom,
} from "./seedThreadIntelligence";
import { ALEX_MEXICO_TRIP_MEMORIES, isAlexTripGraphTarget } from "./alexTripMemories";

describe("seedThreadIntelligence", () => {
  it("matches ONLY seed-chat-* conversation ids (Repair #11 — no name hijack)", () => {
    expect(seedChatKeyFrom({ conversationId: "seed-chat-alex" })).toBe("seed-chat-alex");
    expect(seedChatKeyFrom({ conversationId: "SEED-CHAT-MAYA" })).toBe("SEED-CHAT-MAYA");
    expect(seedChatKeyFrom({ conversationId: "  seed-chat-juniper-crew " })).toBe(
      "seed-chat-juniper-crew",
    );
  });

  it("never matches display names — real conversations are never hijacked", () => {
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
          body: "Got it — 10:30 market, 12 coast drive?",
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
          body: "Trip Graph · Mexico City — 14 memories",
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
    expect(isAlexTripGraphTarget("Trip Graph · Mexico City — 14 memories")).toBe(true);
  });
});
