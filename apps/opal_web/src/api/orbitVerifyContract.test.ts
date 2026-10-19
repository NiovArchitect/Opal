/**
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://app.example.test/" }
 *
 * Repair #19 W20 JA-01 — the JOINT contract test for the orbit
 * unlock seam (NC-2 lesson: FIX-A's endpoint tests and FIX-B's
 * mocked-client tests each passed while the shipped client POSTed
 * {code} to a path that does not exist, so no user with a passcode
 * could ever unlock a private orbit).
 *
 * This test drives the REAL client function (verifyOrbitLock, no
 * mock of productClient) through the client's own call path —
 * request(), bearer, CSRF, fetch — against a stub that implements
 * the REAL router contract, taken verbatim from the server:
 *
 *   route (router.ex):  POST /api/v1/product/opal/conversations/orbit-verify
 *   controller:         requires anchor_type + anchor_id + code
 *                       (missing/invalid -> 422 invalid_anchor)
 *   OpalConversations.verify_orbit_unlock/4:
 *                       anchor not owned by caller -> 404 not_found
 *                       wrong code                 -> 403 wrong_code
 *                       right code                 -> 200 { unlocked: true }
 *
 * The server side of exactly this contract is proven over real
 * HTTP in repair19_opalchat_scope_test.exs (403/200/404). If the
 * client drifts from the route again — path, method, or any body
 * key — this test fails, because the stub answers precisely what
 * the real router would answer to the request it actually got.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyOrbitLock } from "./productClient";

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

const ROUTE_SUFFIX = "/api/v1/product/opal/conversations/orbit-verify";
// The world the real router would see: the caller owns exactly one
// orbit anchor, and their account passcode is "2468".
const OWNED = { anchor_type: "person", anchor_id: "user-c" };
const RIGHT_CODE = "2468";

/** The real router + controller + context, as a fetch stub. */
function routerStub(url: string, init: RequestInit) {
  if (!url.endsWith(ROUTE_SUFFIX) || init.method !== "POST") {
    return jsonResponse(404, { error: "not_found" });
  }
  const body = JSON.parse(String(init.body ?? "{}")) as Record<string, unknown>;
  const { anchor_type, anchor_id, code } = body;
  if (
    typeof anchor_type !== "string" ||
    typeof anchor_id !== "string" ||
    typeof code !== "string" ||
    !["person", "plan", "place"].includes(anchor_type)
  ) {
    return jsonResponse(422, { unlocked: false, error_code: "invalid_anchor" });
  }
  if (anchor_type !== OWNED.anchor_type || anchor_id !== OWNED.anchor_id) {
    return jsonResponse(404, {
      unlocked: false,
      error_code: "not_found",
      error: "not_found",
    });
  }
  if (code !== RIGHT_CODE) {
    return jsonResponse(403, { unlocked: false, error: "wrong_code" });
  }
  return jsonResponse(200, {
    unlocked: true,
    anchor_type,
    anchor_id,
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  localStorage.clear();
  sessionStorage.clear();
  fetchMock.mockImplementation(async (url: string, init: RequestInit) =>
    routerStub(url, init),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("JA-01 joint contract — verifyOrbitLock against the real router contract", () => {
  it("sends the route's exact path, method, bearer, and body keys", async () => {
    await verifyOrbitLock("person", "user-c", RIGHT_CODE, "tok");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { headers: Record<string, string> },
    ];
    expect(url).toBe(`https://app.example.test${ROUTE_SUFFIX}`);
    expect(init.method).toBe("POST");
    expect(init.headers.authorization).toBe("Bearer tok");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(["anchor_id", "anchor_type", "code"]);
    expect(body).toEqual({
      anchor_type: "person",
      anchor_id: "user-c",
      code: RIGHT_CODE,
    });
  });

  it("right code: 200 unlocks through the client's own call path", async () => {
    const res = await verifyOrbitLock("person", "user-c", RIGHT_CODE, "tok");
    expect(res.unlocked).toBe(true);
  });

  it("wrong code: 403 wrong_code, the call rejects (stays locked)", async () => {
    const err = (await verifyOrbitLock("person", "user-c", "1111", "tok").catch(
      (e: unknown) => e,
    )) as { code?: string; status?: number };
    expect(err).toBeInstanceOf(Error);
    // request() carries the router's status; the host maps any
    // throw to "stays locked".
    expect(err.status).toBe(403);
  });

  it("foreign anchor: 404 — another user's orbit cannot be unlocked", async () => {
    const err = (await verifyOrbitLock(
      "person",
      "user-someone-else",
      RIGHT_CODE,
      "tok",
    ).catch((e: unknown) => e)) as { status?: number };
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("the old broken shape ({code} only, dead path) is exactly what the router refuses", async () => {
    // Regression pin for the shipped JA-01 defect: the pre-fix
    // client POSTed {code} to /opal/orbit-verify. Driven through
    // the same stub, that request gets the router's 404 — the
    // exact production failure — so this suite cannot pass with
    // the old client restored.
    const res = routerStub(
      "https://app.example.test/api/v1/product/opal/orbit-verify",
      { method: "POST", body: JSON.stringify({ code: RIGHT_CODE }) },
    );
    expect(res.status).toBe(404);
    const missing = routerStub(
      `https://app.example.test${ROUTE_SUFFIX}`,
      { method: "POST", body: JSON.stringify({ code: RIGHT_CODE }) },
    );
    expect(missing.status).toBe(422);
  });
});
