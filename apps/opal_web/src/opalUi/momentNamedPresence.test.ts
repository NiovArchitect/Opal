import { describe, expect, it } from "vitest";
import { earnedNamedPresence } from "./momentNamedPresence";

describe("earnedNamedPresence P30R2", () => {
  it("returns null without grounded chats", () => {
    expect(earnedNamedPresence([])).toBeNull();
  });

  it("prefers Jordan when present in active chats", () => {
    const p = earnedNamedPresence([
      { id: "1", name: "Alex" },
      { id: "2", name: "Jordan Lee" },
    ]);
    expect(p?.displayName).toBe("Jordan");
    expect(p?.conversationId).toBe("2");
  });

  it("falls back to first dyad chat when no Jordan", () => {
    const p = earnedNamedPresence([{ id: "c1", name: "Maya Chen" }]);
    expect(p?.displayName).toBe("Maya");
  });

  it("skips group-like names", () => {
    const p = earnedNamedPresence([
      { id: "g", name: "Weekend group" },
      { id: "p", name: "Sam" },
    ]);
    expect(p?.displayName).toBe("Sam");
  });
});
