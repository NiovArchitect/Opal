import { describe, expect, it } from "vitest";
import {
  PLAN_STATE_HEX,
  planStateAttr,
  planStateColor,
  planStateLabel,
} from "./planStateColors";

describe("planStateColors (Paste W L2/L6)", () => {
  it("maps confirmed/locked/happening to electric teal", () => {
    expect(planStateColor("locked")).toBe(PLAN_STATE_HEX.confirmed);
    expect(planStateColor("confirmed")).toBe(PLAN_STATE_HEX.confirmed);
    expect(planStateColor("happening")).toBe(PLAN_STATE_HEX.confirmed);
    expect(PLAN_STATE_HEX.confirmed.toLowerCase()).toBe("#00e5ff");
  });

  it("maps pending to bright amber gold", () => {
    expect(planStateColor("pending")).toBe(PLAN_STATE_HEX.pending);
    expect(planStateColor("waiting")).toBe(PLAN_STATE_HEX.pending);
    expect(PLAN_STATE_HEX.pending.toLowerCase()).toBe("#ffc86b");
  });

  it("maps idea/forming to violet", () => {
    expect(planStateColor("idea")).toBe(PLAN_STATE_HEX.idea);
    expect(planStateColor("forming")).toBe(PLAN_STATE_HEX.idea);
    expect(planStateColor("unconfirmed")).toBe(PLAN_STATE_HEX.idea);
    expect(PLAN_STATE_HEX.idea.toLowerCase()).toBe("#8b5cf6");
  });

  it("attrs stay in legal lifecycle", () => {
    expect(planStateAttr("happening")).toBe("happening");
    expect(planStateAttr("forming")).toBe("forming");
    expect(planStateLabel("locked")).toBe("Locked");
  });
});
