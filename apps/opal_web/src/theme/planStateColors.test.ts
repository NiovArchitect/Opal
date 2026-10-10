import { describe, expect, it } from "vitest";
import {
  PLAN_STATE_HEX,
  PLAN_STATE_PILL_TEXT,
  planStateAttr,
  planStateColor,
  planStateFamily,
  planStateLabel,
  planStatePillText,
} from "./planStateColors";

describe("planStateColors (Paste W6 canonical law)", () => {
  it("maps happening/now/live/confirmed/locked to cyan", () => {
    expect(planStateColor("locked")).toBe(PLAN_STATE_HEX.happening);
    expect(planStateColor("confirmed")).toBe(PLAN_STATE_HEX.happening);
    expect(planStateColor("happening")).toBe(PLAN_STATE_HEX.happening);
    expect(planStateColor("live")).toBe(PLAN_STATE_HEX.happening);
    expect(planStateColor("now")).toBe(PLAN_STATE_HEX.happening);
    expect(PLAN_STATE_HEX.happening.toLowerCase()).toBe("#00e5ff");
    expect(planStatePillText("happening")).toBe("#FFFFFF");
  });

  it("maps ready/upcoming to amber (not cyan)", () => {
    expect(planStateColor("ready")).toBe(PLAN_STATE_HEX.ready);
    expect(planStateColor("upcoming")).toBe(PLAN_STATE_HEX.ready);
    expect(planStateColor("aligned")).toBe(PLAN_STATE_HEX.ready);
    expect(PLAN_STATE_HEX.ready.toLowerCase()).toBe("#ffc86b");
    expect(planStatePillText("ready")).toBe("#0A0F1E");
    expect(planStateFamily("ready")).toBe("ready");
  });

  it("maps action/pending/waiting to red", () => {
    expect(planStateColor("action")).toBe(PLAN_STATE_HEX.action);
    expect(planStateColor("pending")).toBe(PLAN_STATE_HEX.action);
    expect(planStateColor("waiting")).toBe(PLAN_STATE_HEX.action);
    expect(PLAN_STATE_HEX.action.toLowerCase()).toBe("#ff4d5e");
    expect(planStatePillText("action")).toBe("#FFFFFF");
  });

  it("maps idea/forming to purple", () => {
    expect(planStateColor("idea")).toBe(PLAN_STATE_HEX.forming);
    expect(planStateColor("forming")).toBe(PLAN_STATE_HEX.forming);
    expect(planStateColor("unconfirmed")).toBe(PLAN_STATE_HEX.forming);
    expect(PLAN_STATE_HEX.forming.toLowerCase()).toBe("#8b5cf6");
    expect(planStatePillText("forming")).toBe("#FFFFFF");
  });

  it("maps past to white fill + dark pill text", () => {
    expect(planStateColor("past")).toBe(PLAN_STATE_HEX.past);
    expect(PLAN_STATE_HEX.past.toLowerCase()).toBe("#ffffff");
    expect(planStatePillText("past")).toBe("#0A0F1E");
    expect(PLAN_STATE_PILL_TEXT.past).toBe("#0A0F1E");
  });

  it("attrs stay in legal lifecycle; ready is ready not locked", () => {
    expect(planStateAttr("happening")).toBe("happening");
    expect(planStateAttr("forming")).toBe("forming");
    expect(planStateAttr("ready")).toBe("ready");
    expect(planStateAttr("action")).toBe("action");
    expect(planStateAttr("pending")).toBe("action");
    expect(planStateLabel("locked")).toBe("Locked");
    expect(planStateLabel("ready")).toBe("Ready");
  });
});
