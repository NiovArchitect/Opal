import { describe, expect, it } from "vitest";
import {
  buildSpeakerDirectory,
  planThreadSpeakerRows,
  resolveSpeaker,
  shouldShowSpeakerHeader,
} from "./messageSpeaker";

const dir = buildSpeakerDirectory({
  selfUserId: "founder",
  selfDisplayName: "Founder",
  peers: [
    { id: "jordan", display_name: "Jordan" },
    { id: "maya", display_name: "Maya" },
    { id: "sam", display_name: "Sam" },
  ],
});

describe("P0-31-04 message speaker identity", () => {
  it("resolves peers by sender id — not bubble side", () => {
    const m = resolveSpeaker("maya", "founder", dir);
    expect(m?.displayName).toBe("Maya");
    expect(m?.isSelf).toBe(false);
    expect(m?.humanSpeaker).toBe(true);
  });

  it("does not invent identity for unknown sender", () => {
    const m = resolveSpeaker("ghost", "founder", dir);
    expect(m?.displayName).toBe("Unknown member");
  });

  it("groups consecutive Maya without repeating header mid-run logic", () => {
    const plan = planThreadSpeakerRows(
      [
        { id: "1", senderUserId: "maya", humanSpeaker: true },
        { id: "2", senderUserId: "maya", humanSpeaker: true },
        { id: "3", senderUserId: "jordan", humanSpeaker: true },
        { id: "4", senderUserId: "founder", humanSpeaker: true, from: "me" },
        {
          id: "5",
          opalSystemConsequence: true,
          humanSpeaker: false,
        },
        { id: "6", senderUserId: "sam", humanSpeaker: true },
        { id: "7", senderUserId: "maya", humanSpeaker: true },
      ],
      { selfUserId: "founder", directory: dir, isGroup: true },
    );
    expect(plan[0].meta.showSpeakerHeader).toBe(true);
    expect(plan[0].meta.speaker?.displayName).toBe("Maya");
    expect(plan[1].meta.showSpeakerHeader).toBe(false);
    expect(plan[1].meta.continuesGroup).toBe(true);
    expect(plan[2].meta.showSpeakerHeader).toBe(true);
    expect(plan[2].meta.speaker?.displayName).toBe("Jordan");
    expect(plan[3].meta.speaker?.isSelf).toBe(true);
    expect(plan[4].meta.kind).toBe("system");
    expect(plan[4].meta.speaker).toBeNull();
    expect(plan[5].meta.speaker?.displayName).toBe("Sam");
    expect(plan[6].meta.showSpeakerHeader).toBe(true);
    expect(plan[6].meta.speaker?.displayName).toBe("Maya");
  });

  it("system row breaks human group", () => {
    expect(
      shouldShowSpeakerHeader(
        { senderUserId: "maya", humanSpeaker: true },
        { senderUserId: "maya", humanSpeaker: true },
        { isGroup: true, isSelf: false },
      ),
    ).toBe(false);
    expect(
      shouldShowSpeakerHeader(
        { opalSystemConsequence: true, humanSpeaker: false },
        { senderUserId: "maya", humanSpeaker: true },
        { isGroup: true, isSelf: false },
      ),
    ).toBe(true);
  });

  it("directory self entry present", () => {
    expect(dir.founder.displayName).toBe("Founder");
  });
});
