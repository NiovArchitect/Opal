import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const createGraphPlanMock = vi.fn();
const uploadMock = vi.fn();
const listPlansMock = vi.fn();

vi.mock("../api/productClient", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    createGraphPlan: (...args: unknown[]) => createGraphPlanMock(...args),
    uploadSocialMomentMedia: (...args: unknown[]) => uploadMock(...args),
    listOpalPlans: (...args: unknown[]) => listPlansMock(...args),
  };
});

import {
  authoritativeCreateGraphPlan,
  loadDurablePlans,
  mergeDurablePlanCards,
  productionPlanToGraphCard,
} from "./socialAuthority";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

const PNG_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ";
const PLAN_ID = "11111111-2222-4333-8444-555555555555";
const SOURCE_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

describe("Repair #16 — durable graph create (authoritativeCreateGraphPlan)", () => {
  beforeEach(() => {
    createGraphPlanMock.mockReset();
    uploadMock.mockReset();
    listPlansMock.mockReset();
    uploadMock.mockResolvedValue({ media: { id: "media-uuid-1" } });
    createGraphPlanMock.mockResolvedValue({
      plan: { id: PLAN_ID, title: "Moonlight paddle", status: "tentative" },
      participants: [],
      deduplicated: false,
    });
  });

  it("uploads photo media then creates the plan with every mapped field", async () => {
    const plan = await authoritativeCreateGraphPlan({
      mediaSrc: PNG_DATA_URL,
      mediaKind: "photo",
      title: "  Moonlight paddle ",
      whenLabel: "Saturday - around 6:00 PM",
      where: "Moonlight Beach",
      caption: "Golden hour, for real.",
      audience: "close_circle",
      joinRequestsOn: true,
      exactSpotAfterJoin: false,
      participantUserIds: ["user-b"],
      whoLabel: "Chanelle",
      entry: "chat_plan",
      idempotencyKey: "gc-key-1",
      bearer: "tok",
    });
    expect(plan.id).toBe(PLAN_ID);
    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(uploadMock.mock.calls[0][0]).toMatchObject({ mime_type: "image/png" });
    expect(createGraphPlanMock).toHaveBeenCalledTimes(1);
    expect(createGraphPlanMock.mock.calls[0][0]).toMatchObject({
      title: "Moonlight paddle",
      location: "Moonlight Beach",
      time_label: "Saturday - around 6:00 PM",
      caption: "Golden hour, for real.",
      media_id: "media-uuid-1",
      audience: "close_circle",
      join_requests_on: true,
      exact_spot_after_join: false,
      participant_user_ids: ["user-b"],
      who_label: "Chanelle",
      entry: "chat_plan",
      idempotency_key: "gc-key-1",
    });
    expect(createGraphPlanMock.mock.calls[0][1]).toBe("tok");
  });

  it("no-media draft creates directly (caption-only plan)", async () => {
    await authoritativeCreateGraphPlan({
      title: "Coffee and a walk",
      caption: "Simple one.",
      bearer: "tok",
    });
    expect(uploadMock).not.toHaveBeenCalled();
    expect(createGraphPlanMock).toHaveBeenCalledTimes(1);
    expect(createGraphPlanMock.mock.calls[0][0]).toMatchObject({
      title: "Coffee and a walk",
      audience: "close_circle",
    });
    expect(createGraphPlanMock.mock.calls[0][0].media_id).toBeUndefined();
  });

  it("signed-out refuses before any backend call", async () => {
    await expect(
      authoritativeCreateGraphPlan({ title: "Nope", mediaSrc: PNG_DATA_URL }),
    ).rejects.toThrow(/Sign in required/);
    expect(uploadMock).not.toHaveBeenCalled();
    expect(createGraphPlanMock).not.toHaveBeenCalled();
  });

  it("blank title refuses before any backend call", async () => {
    await expect(
      authoritativeCreateGraphPlan({ title: "   ", bearer: "tok" }),
    ).rejects.toThrow(/title/);
    expect(createGraphPlanMock).not.toHaveBeenCalled();
  });

  it("video is refused honestly (out of scope) and never creates", async () => {
    await expect(
      authoritativeCreateGraphPlan({
        title: "Clip plan",
        mediaSrc: "data:video/mp4;base64,AAAA",
        mediaKind: "video",
        bearer: "tok",
      }),
    ).rejects.toThrow(/Video isn't supported yet/);
    expect(uploadMock).not.toHaveBeenCalled();
    expect(createGraphPlanMock).not.toHaveBeenCalled();
  });

  it("non-uploadable media (fixture path / blob) refuses instead of faking persistence", async () => {
    for (const mediaSrc of ["/figma-v2/create/add-to-graph-media-863-338.jpg", "blob:http://x/1"]) {
      await expect(
        authoritativeCreateGraphPlan({
          title: "Fixture media",
          mediaSrc,
          mediaKind: "photo",
          bearer: "tok",
        }),
      ).rejects.toThrow(/can't be added from here/);
    }
    expect(createGraphPlanMock).not.toHaveBeenCalled();
  });

  it("backend rejection (unsupported audience / forbidden repeat) propagates — flow stays open", async () => {
    createGraphPlanMock.mockRejectedValueOnce(new Error("unsupported_audience"));
    await expect(
      authoritativeCreateGraphPlan({
        title: "Wide audience",
        audience: "friends",
        bearer: "tok",
      }),
    ).rejects.toThrow(/unsupported_audience/);

    createGraphPlanMock.mockRejectedValueOnce(new Error("forbidden"));
    await expect(
      authoritativeCreateGraphPlan({
        title: "Repeat theirs",
        sourcePlanId: SOURCE_ID,
        bearer: "tok",
      }),
    ).rejects.toThrow(/forbidden/);
  });

  it("repeat provenance: durable source id is sent; seed/fixture ids are never sent as lineage", async () => {
    await authoritativeCreateGraphPlan({
      title: "Again",
      sourcePlanId: SOURCE_ID,
      entry: "repeat",
      bearer: "tok",
    });
    expect(createGraphPlanMock.mock.calls[0][0].source_plan_id).toBe(SOURCE_ID);

    createGraphPlanMock.mockClear();
    await authoritativeCreateGraphPlan({
      title: "Again (seed)",
      sourcePlanId: "seed-chanelle-juniper",
      entry: "repeat",
      bearer: "tok",
    });
    expect(createGraphPlanMock.mock.calls[0][0].source_plan_id).toBeUndefined();
  });

  it("a create response without a durable plan id is a failure, not a success", async () => {
    createGraphPlanMock.mockResolvedValueOnce({ plan: {}, participants: [] });
    await expect(
      authoritativeCreateGraphPlan({ title: "Ghost", bearer: "tok" }),
    ).rejects.toThrow(/durable plan id/);
  });

  it("loadDurablePlans reads back through the owner-scoped list endpoint", async () => {
    listPlansMock.mockResolvedValue({
      plans: [{ id: PLAN_ID, title: "Moonlight paddle", status: "tentative" }],
    });
    const plans = await loadDurablePlans("tok");
    expect(plans).toHaveLength(1);
    expect(plans[0].id).toBe(PLAN_ID);
    expect(await loadDurablePlans(undefined)).toEqual([]);
    expect(listPlansMock).toHaveBeenCalledTimes(1);
  });
});

describe("Repair #16 — Graphs read-back mapping (no optimistic local copy)", () => {
  it("productionPlanToGraphCard maps contract fields to a Graphs card", () => {
    const card = productionPlanToGraphCard({
      id: PLAN_ID,
      title: "Moonlight paddle",
      status: "tentative",
      time_label: "Saturday - around 6:00 PM",
      who_label: "Chanelle, Maya",
      organizer_name: "Sadeil",
    });
    expect(card).toMatchObject({
      id: PLAN_ID,
      title: "Moonlight paddle",
      whenLine: "Saturday - around 6:00 PM",
      signalLine: "Chanelle, Maya",
      status: "forming",
      who: ["Chanelle", "Maya"],
    });
  });

  it("mergeDurablePlanCards adds backend plans, dedupes chat projections, drops cancelled", () => {
    const live = [{ id: PLAN_ID, title: "From chat projection" }];
    const merged = mergeDurablePlanCards(live, [
      { id: PLAN_ID, title: "Same plan via list", status: "tentative" },
      { id: SOURCE_ID, title: "Solo graph plan", status: "agreed", time_label: "Fri - 7 PM" },
      {
        id: "99999999-8888-4777-8666-555555555555",
        title: "Cancelled",
        status: "cancelled",
      },
    ]);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toBe(live[0]);
    expect(merged[1]).toMatchObject({ id: SOURCE_ID, title: "Solo graph plan", status: "ready" });
  });
});

describe("Repair #16 — wiring contracts", () => {
  it("OpalApp routes graph completions to the durable path and keeps no write-only state", () => {
    const app = read("OpalApp.tsx");
    expect(app).toMatch(/authoritativeCreateGraphPlan/);
    expect(app).not.toMatch(/setCreatedGraphs/);
    expect(app).not.toMatch(/useState<GraphCreateDraft\[\]>/);
    // Success refreshes from the backend before landing on Graphs.
    expect(app).toMatch(/refreshDurableGraphPlans/);
    expect(app).toMatch(/loadDurablePlans/);
    // Graphs tab receives backend plans merged into its live cards.
    expect(app).toMatch(/mergeDurablePlanCards\(/);
    expect(app).toMatch(/durableGraphPlans/);
  });

  it("productClient carries the graph-create + list endpoints", () => {
    const client = read("api/productClient.ts");
    expect(client).toMatch(/createGraphPlan/);
    expect(client).toMatch(/\/api\/v1\/product\/opal\/plans\/graph-create/);
    expect(client).toMatch(/listOpalPlans/);
  });

  it("GraphCreateFlow graph mode no longer prefills fiction and reports graph errors honestly", () => {
    const flow = read("opalUi/GraphCreateFlow.tsx");
    expect(flow).not.toMatch(/Golden hour at Moonlight\. Needed this\./);
    expect(flow).not.toMatch(/Untitled Graph/);
    expect(flow).toMatch(/Couldn't add to your graph/);
  });

  it("chat/contact entries capture real participant ids + entry surface", () => {
    const app = read("OpalApp.tsx");
    expect(app).toMatch(/entry: "chat_plan"/);
    expect(app).toMatch(/entry: "contact_plan"/);
    expect(app).toMatch(/entry: "repeat"/);
    expect(app).toMatch(/participantUserIds: \(activeChat\.peers \|\| \[\]\)\.map\(\(p\) => p\.id\)/);
  });
});
