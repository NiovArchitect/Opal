/**
 * Repair #18 hunt-fix (web) — C2 shell adapter tests for Hunt B.
 *
 * B-07 seed extras are labeled whenever they render; B-11 the Home
 * feed reads back real moments; B-12 plan-load failures are a result
 * leg, never an empty list; B-16 virtual plans project as virtual;
 * B-17 relationship headers are finished words; B-18 the check-in
 * cooldown is a human time, never raw ISO.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const listOpalPlans = vi.fn();
const listTemporaryStories = vi.fn();
const fetchHomeFeed = vi.fn();

vi.mock("../../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../../api/productClient")>(
    "../../api/productClient",
  );
  return {
    ...actual,
    listOpalPlans: (...a: unknown[]) => listOpalPlans(...a),
    listTemporaryStories: (...a: unknown[]) => listTemporaryStories(...a),
    fetchHomeFeed: (...a: unknown[]) => fetchHomeFeed(...a),
  };
});

import {
  detailFromPlan,
  homeFromSession,
  loadPlansResult,
} from "./shellData";
import { relationshipTypeLabel } from "./C1ShellHosts";
import { composeGraphsList } from "../../opalUi/graphsHydration";
import { cooldownLabel } from "../../opalUi/CheckinCircleRow";
import type { OpalPlanContract } from "../../api/productClient";

const PLAN: OpalPlanContract = {
  id: "plan-1",
  title: "Dinner",
  status: "agreed",
  location: "Juniper & Ivy",
  time_label: "Sat 7pm",
};

beforeEach(() => {
  listOpalPlans.mockReset();
  listTemporaryStories.mockReset();
  fetchHomeFeed.mockReset();
  listTemporaryStories.mockResolvedValue({ stories: [] });
});

describe("B-12 loadPlansResult — failure is a leg, not an empty account", () => {
  it("returns the plain-language error and no plans when the read fails", async () => {
    listOpalPlans.mockRejectedValue(new Error("down"));
    const res = await loadPlansResult("tok");
    expect(res.plans).toEqual([]);
    expect(res.error).toContain("did not load");
  });

  it("returns plans and no error when the read succeeds", async () => {
    listOpalPlans.mockResolvedValue({ plans: [PLAN] });
    const res = await loadPlansResult("tok");
    expect(res.plans).toHaveLength(1);
    expect(res.error).toBeNull();
  });
});

describe("B-16 detailFromPlan — virtual truth", () => {
  it("a virtual plan projects kind virtual, never a physical place", () => {
    const detail = detailFromPlan(
      { ...PLAN, plan_type: "virtual", online: true, location: null, meeting_link: "https://meet.example/x" },
      "graphs",
    );
    expect(detail.where?.kind).toBe("virtual");
    expect(detail.meetingLink).toBe("https://meet.example/x");
  });

  it("a physical plan still projects kind place", () => {
    const detail = detailFromPlan({ ...PLAN, plan_type: "in_person" }, "graphs");
    expect(detail.where?.kind).toBe("place");
    expect(detail.where?.label).toBe("Juniper & Ivy");
  });
});

describe("B-11 homeFromSession — the feed reads back real posts", () => {
  it("includes moments from fetchHomeFeed alongside plan cards", async () => {
    listOpalPlans.mockResolvedValue({ plans: [PLAN] });
    fetchHomeFeed.mockResolvedValue({
      mode: "live",
      objects: [
        {
          id: "post-9",
          object_type: "memory",
          caption: "Just posted this",
          actor: { display_name: "Riley" },
          media_ref: "/media/post-9.jpg",
        },
      ],
      stories: [],
    });
    const home = await homeFromSession(null, "tok");
    const memory = home.feed.find((f) => f.kind === "memory");
    expect(memory).toBeTruthy();
    expect(memory && memory.kind === "memory" ? memory.contextLine : "").toBe(
      "Just posted this",
    );
    expect(home.feed.some((f) => f.kind === "plan")).toBe(true);
    expect(home.feedError).toBeNull();
  });

  it("a failed moments read surfaces feedError instead of painting empty", async () => {
    listOpalPlans.mockResolvedValue({ plans: [] });
    fetchHomeFeed.mockRejectedValue(new Error("down"));
    const home = await homeFromSession(null, "tok");
    expect(home.feedError).toContain("did not load");
  });
});

describe("B-07 composeGraphsList — seed labeled whenever it renders", () => {
  it("mixed mode (live + seed extras) is seedLabeled", () => {
    const res = composeGraphsList({
      founderSeedEnabled: true,
      liveGraphs: [
        {
          id: "ace99adc-db67-4258-9d95-f612246c6c84",
          title: "Fort Oak",
          whenLine: "Tonight · 8:00 PM",
          signalLine: "Ready",
          status: "ready",
          person: "Riley",
        },
      ],
      createdPlans: [],
    });
    const hasSeedTimeline = res.timelineItems.some((t) => t.source === "seed");
    expect(hasSeedTimeline).toBe(true);
    expect(res.seedLabeled).toBe(true);
  });
});

describe("B-17 relationshipTypeLabel — finished words, never slugs", () => {
  it("maps the lawful type set", () => {
    expect(relationshipTypeLabel("close_friend")).toBe("Close friends");
    expect(relationshipTypeLabel("family")).toBe("Family");
    expect(relationshipTypeLabel("acquaintance")).toBe("Acquaintances");
  });

  it("unknown types fall back to no header", () => {
    expect(relationshipTypeLabel("close_friend_v2")).toBeNull();
    expect(relationshipTypeLabel("")).toBeNull();
  });
});

describe("B-18 cooldownLabel — human time, never raw ISO", () => {
  it("formats an ISO instant into words without the raw string", () => {
    const label = cooldownLabel("2026-10-19T14:32:00Z");
    expect(label).toBeTruthy();
    expect(label).not.toContain("2026-10-19T14:32:00Z");
    expect(label).not.toContain("T14:32");
    expect(label).toContain("Next check-in available");
  });

  it("unparseable values render no line", () => {
    expect(cooldownLabel("not-a-date")).toBeNull();
    expect(cooldownLabel(null)).toBeNull();
  });
});
