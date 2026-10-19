/**
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://app.example.test/" }
 *
 * Repair #18 - cancelOpalPlan client contract:
 *  - POSTs the real cancel route (/api/v1/product/opal/plans/:id/cancel)
 *    with the plan id in the path and the session bearer, following the
 *    product client's one authenticated-request path;
 *  - the success body is the route's { ok, plan } with the cancelled row;
 *  - rejections keep the route's error_code so the shell can map them
 *    to ONE plain-language line (opalPlanCancelError) - no internal
 *    state names or codes are ever shown on screen.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cancelOpalPlan, opalPlanCancelError } from "./productClient";

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

// The https test origin makes the client resolve its API base to the
// page origin (the same same-origin rule a hosted https page uses),
// so request() runs its real path against the stubbed fetch.
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("cancelOpalPlan", () => {
  it("POSTs the cancel route with the plan id and the bearer", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        ok: true,
        plan: { id: "plan-42", title: "Dinner", status: "cancelled" },
      }),
    );
    const res = await cancelOpalPlan("plan-42", "tok-abc");
    expect(res.ok).toBe(true);
    expect(res.plan.status).toBe("cancelled");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { headers: Record<string, string> },
    ];
    expect(url).toBe(
      "https://app.example.test/api/v1/product/opal/plans/plan-42/cancel",
    );
    expect(init.method).toBe("POST");
    expect(init.headers.authorization).toBe("Bearer tok-abc");
    expect(init.body).toBe("{}");
  });

  it("url-encodes the plan id in the path", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { ok: true, plan: { id: "a b/c", title: "X", status: "cancelled" } }),
    );
    await cancelOpalPlan("a b/c", "tok-abc");
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/opal/plans/a%20b%2Fc/cancel");
  });

  it("a 403 keeps the route's error_code for the plain-language mapper", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(403, {
        error_code: "not_authorized",
        message: "Only the plan's lead can cancel it.",
      }),
    );
    const err = (await cancelOpalPlan("plan-42", "tok-abc").catch(
      (e: unknown) => e,
    )) as { code?: string };
    expect(err.code).toBe("not_authorized");
    expect(opalPlanCancelError(err)).toBe(
      "Only the plan's lead can drop this plan. Ask them to drop it, or keep it for now.",
    );
  });
});

describe("opalPlanCancelError - one plain line per route outcome", () => {
  const withCode = (code: string) =>
    Object.assign(new Error("x"), { code, serverMessage: "server copy" });

  it("maps each contract error_code", () => {
    expect(opalPlanCancelError(withCode("already_cancelled"))).toBe(
      "This plan is already dropped. Close this and reopen Graphs to see your list up to date.",
    );
    expect(opalPlanCancelError(withCode("illegal_transition"))).toBe(
      "This plan has finished, so it can't be dropped. It stays with your past plans.",
    );
    expect(opalPlanCancelError(withCode("not_found"))).toBe(
      "We couldn't find that plan anymore. Close this and reopen Graphs to refresh your list.",
    );
  });

  it("falls back to the server's message, then to a connection line", () => {
    expect(opalPlanCancelError(new Error("boom"))).toBe(
      "That didn't go through. Check your connection and try again.",
    );
    expect(
      opalPlanCancelError(
        Object.assign(new Error("humanized"), { serverMessage: "Server said no." }),
      ),
    ).toBe("Server said no. Try again in a moment.");
  });
});
