/**
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://app.example.test/" }
 *
 * Repair #18 hunt-fix B-15 — convertPlanPlaceType client contract:
 * the glass caller for the B1 conversion endpoint that previously
 * had NO client function at all.
 *  - POSTs /api/v1/product/journeys/:id/convert-place-type with
 *    { to_plan_type } and the session bearer;
 *  - planConversionLine says what actually happened: applied now,
 *    proposed to the group, or the failure with a next step.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convertPlanPlaceType, planConversionLine } from "./productClient";

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    json: async () => body,
    headers: { get: () => null },
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("convertPlanPlaceType", () => {
  it("POSTs the B1 conversion route with the target type and bearer", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        plan: { id: "plan-7", title: "Dinner", status: "agreed", plan_type: "virtual" },
        revision: null,
        applied: true,
      }),
    );
    const res = await convertPlanPlaceType("plan-7", "virtual", { bearer: "tok-xyz" });
    expect(res.applied).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { headers: Record<string, string> },
    ];
    expect(url).toBe(
      "https://app.example.test/api/v1/product/journeys/plan-7/convert-place-type",
    );
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ to_plan_type: "virtual" });
  });

  it("planConversionLine distinguishes applied, proposed, and failure", () => {
    expect(planConversionLine({ applied: true })).toContain("online now");
    expect(planConversionLine({ applied: false })).toContain("Asked the group");
    expect(planConversionLine(null, new Error("down"))).toContain("try again");
  });
});
