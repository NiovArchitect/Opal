import { describe, expect, it } from "vitest";
import {
  interpretSeedThreadReply,
  seedChatKeyFrom,
} from "./seedThreadIntelligence";
import { ALEX_MEXICO_TRIP_MEMORIES, isAlexTripGraphTarget } from "./alexTripMemories";

describe("seedThreadIntelligence", () => {
  it("maps display names to seed keys", () => {
    expect(seedChatKeyFrom({ displayName: "Maya" })).toBe("seed-chat-maya");
    expect(seedChatKeyFrom({ displayName: "Maya Chen" })).toBe("seed-chat-maya");
    expect(seedChatKeyFrom({ displayName: "Alex Rivera" })).toBe("seed-chat-alex");
    expect(seedChatKeyFrom({ conversationId: "seed-chat-alex" })).toBe("seed-chat-alex");
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
