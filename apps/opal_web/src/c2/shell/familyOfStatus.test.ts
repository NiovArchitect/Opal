/**
 * R19 W18-FIX - familyOfStatus GOVERNED STATUSES (W13 sweep finding).
 *
 * The backend's governed plan statuses (SharedPlan @statuses:
 * tentative / agreed / changed / cancelled / completed / expired)
 * reach familyOfStatus raw: the plans contract carries the row's own
 * status and list_plans_for_user excludes only cancelled/expired by
 * default. Before this fix, tentative/agreed/changed were unmapped
 * and fell through to "forming" - an AGREED plan wore forming violet
 * instead of ready gold (a live mis-coloring, not a dead code path).
 *
 * The mapping pinned here mirrors the backend's ONE indicator
 * derivation (OpalCore.SocialFlow.NextPlan.indicator_state):
 *   live window open      -> happening (a time fact, not a status)
 *   viewer's response due -> action    (a viewer fact, not a status)
 *   status agreed         -> ready
 *   everything else active (tentative / changed) -> forming
 * familyOfStatus receives ONLY the status string, so it owns exactly
 * the status legs: agreed -> ready; tentative -> forming; changed ->
 * forming. changed is not action: its reconfirm need lives in
 * per-participant response state (JourneyAuthority.reconfirm), which
 * is NextPlan's viewer leg - a changed plan whose viewer already
 * reconfirmed must not wear action.
 */
import { describe, expect, it } from "vitest";
import { cardFromPlan, familyOfStatus } from "./shellData";

describe("familyOfStatus: governed SharedPlan statuses (W18-FIX)", () => {
  it("agreed -> ready (the live defect: agreed wore forming)", () => {
    expect(familyOfStatus("agreed")).toBe("ready");
  });

  it("tentative -> forming, explicitly", () => {
    expect(familyOfStatus("tentative")).toBe("forming");
  });

  it("changed -> forming (NextPlan's fall-through leg; reconfirm is a viewer fact)", () => {
    expect(familyOfStatus("changed")).toBe("forming");
  });

  it("completed / expired -> past (W7 rows, regression)", () => {
    expect(familyOfStatus("completed")).toBe("past");
    expect(familyOfStatus("expired")).toBe("past");
  });

  it("the governed mapping is case-insensitive (contract case never matters)", () => {
    expect(familyOfStatus("Agreed")).toBe("ready");
    expect(familyOfStatus("TENTATIVE")).toBe("forming");
    expect(familyOfStatus("Changed")).toBe("forming");
  });

  it("an agreed plan's card is labeled Ready, a tentative plan's Forming", () => {
    const agreed = cardFromPlan({ status: "agreed", title: "Dinner" } as never);
    expect(agreed.stateFamily).toBe("ready");
    expect(agreed.stateLabel).toBe("Ready");
    const tentative = cardFromPlan({ status: "tentative", title: "Dinner" } as never);
    expect(tentative.stateFamily).toBe("forming");
    expect(tentative.stateLabel).toBe("Forming");
    const changed = cardFromPlan({ status: "changed", title: "Dinner" } as never);
    expect(changed.stateFamily).toBe("forming");
    expect(changed.stateLabel).toBe("Forming");
  });
});

describe("familyOfStatus: pre-existing vocabulary stays pinned", () => {
  it("maps the rest of the status vocabulary as before", () => {
    expect(familyOfStatus("idea")).toBe("forming");
    expect(familyOfStatus("forming")).toBe("forming");
    expect(familyOfStatus("action")).toBe("action");
    expect(familyOfStatus("pending")).toBe("action");
    expect(familyOfStatus("needs-action")).toBe("action");
    expect(familyOfStatus("ready")).toBe("ready");
    expect(familyOfStatus("aligned")).toBe("ready");
    expect(familyOfStatus("locked")).toBe("ready");
    expect(familyOfStatus("live")).toBe("happening");
    expect(familyOfStatus("now")).toBe("happening");
    expect(familyOfStatus("happening")).toBe("happening");
    expect(familyOfStatus("past")).toBe("past");
    expect(familyOfStatus("settled")).toBe("past");
    expect(familyOfStatus("ended")).toBe("past");
  });

  it("unknown / absent statuses still fall through to forming", () => {
    expect(familyOfStatus("something-else")).toBe("forming");
    expect(familyOfStatus(null)).toBe("forming");
    expect(familyOfStatus(undefined)).toBe("forming");
    expect(familyOfStatus("")).toBe("forming");
  });
});
