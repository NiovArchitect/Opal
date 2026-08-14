import { describe, expect, it } from "vitest";
import type { ProductSignal } from "./api/productClient";
import {
  formatHumanTime,
  isConsequentialNeed,
  isDurableForPlans,
  presenceLines,
  strongestPerConversation,
  strongestPerHomePresence,
  surfaceLabel,
} from "./sharedReality";

function sig(partial: Partial<ProductSignal> & { kind: string; label: string }): ProductSignal {
  return {
    status: "possibility",
    ...partial,
  };
}

describe("sharedReality presentation", () => {
  it("group presence compresses to who/when/place without constraint dump", () => {
    const lines = presenceLines({
      kind: "open_loop",
      label: "Saturday dinner",
      status: "possibility",
      composition: "group",
      member_count: 6,
      lifecycle_stage: "still_open",
      group_composition: {
        composition: "group",
        member_count: 6,
        human_surface: {
          headline: "Saturday dinner · 6 people",
          who_line: "6 people",
          when_line: "around 7:30",
          place_line: "Choosing the place",
          place_gap: true,
        },
        who: { member_count: 6 },
        when: { day: "Saturday", strongest_common_start: "7:30" },
        where: {},
      },
      shared_reality: { what: "Dinner", when: "Saturday · around 7:30", gaps: ["where"] },
    } as ProductSignal);
    expect(lines.title.toLowerCase()).toMatch(/saturday|dinner/);
    expect(lines.detail).toMatch(/6 people/);
    expect(lines.detail + (lines.gap || "")).not.toMatch(/constraint|required_participant|sushi_conflict/i);
    expect(lines.composition).toBe("group");
  });

  it("presenceLines never surfaces Set / Still open / Needs you", () => {
    const lines = presenceLines({
      lifecycle_stage: "still_open",
      label: "Still open",
      shared_reality: {
        what: "Dinner",
        when: "Thursday after 6:30",
        gaps: ["place"],
        headline: "Dinner · Thursday after 6:30",
        usable: false,
      },
      conversation_id: "c1",
    } as ProductSignal);
    expect(lines.title.toLowerCase()).not.toMatch(/\bset\b|needs you/);
    // "Place still open" is human place-gap language, not lifecycle "Still open"
    expect(lines.gap || lines.detail).toMatch(/place|Dinner|open/i);
    expect(lines.title).not.toBe("Still open");
  });

  it("never surfaces internal Set/Still open tokens when headline exists", () => {
    const s = sig({
      kind: "set",
      label: "Dinner · Thursday · Harbor Table",
      lifecycle_stage: "set",
      shared_reality: {
        headline: "Dinner · Thursday · Harbor Table",
        sufficiency: "usable",
        ui_job: "reveal",
      },
    });
    expect(surfaceLabel(s)).toBe("Dinner · Thursday · Harbor Table");
    expect(surfaceLabel(s)).not.toMatch(/^Set$/i);
  });

  it("guards against stage-token labels", () => {
    const s = sig({
      kind: "set",
      label: "Set",
      lifecycle_stage: "set",
      detail: "Thursday · 7:00",
    });
    expect(surfaceLabel(s)).not.toMatch(/^Set$/i);
  });

  it("plans exclude weak intention and proposal rows", () => {
    const intention = sig({
      kind: "plan_forming",
      label: "Coffee · forming",
      lifecycle_stage: "plan_forming",
      shared_reality: { sufficiency: "intention", what: "Coffee" },
    });
    const proposal = sig({
      kind: "proposal",
      label: "Coffee",
      lifecycle_stage: "still_open",
    });
    const firm = sig({
      kind: "set",
      label: "Coffee · Tuesday · 10:30 · Communal",
      lifecycle_stage: "set",
      conversation_id: "c1",
      shared_reality: { sufficiency: "usable", what: "Coffee", when: "Tuesday" },
    });
    expect(isDurableForPlans(intention)).toBe(false);
    expect(isDurableForPlans(proposal)).toBe(false);
    expect(isDurableForPlans(firm)).toBe(true);
  });

  it("dedupes to one strongest signal per conversation", () => {
    const list = [
      sig({
        kind: "proposal",
        label: "Dinner",
        conversation_id: "c1",
        lifecycle_stage: "still_open",
      }),
      sig({
        kind: "open_loop",
        label: "Dinner · Thursday",
        conversation_id: "c1",
        lifecycle_stage: "still_open",
      }),
      sig({
        kind: "set",
        label: "Dinner · Thursday · Harbor",
        conversation_id: "c2",
        lifecycle_stage: "set",
      }),
    ];
    const strong = strongestPerConversation(list);
    expect(strong).toHaveLength(2);
    expect(strong.find((s) => s.conversation_id === "c1")?.kind).toBe("open_loop");
  });

  it("needs you only for consequential resolve/execute", () => {
    const resolve = sig({
      kind: "open_loop",
      label: "Dinner · need a place",
      lifecycle_stage: "still_open",
      requires_user_action: true,
      ui_job: "resolve",
    });
    const quietSet = sig({
      kind: "set",
      label: "Dinner · Thursday · Harbor",
      lifecycle_stage: "set",
      requires_user_action: false,
      ui_job: "reveal",
      shared_reality: { sufficiency: "usable", ui_job: "reveal" },
    });
    expect(isConsequentialNeed(resolve)).toBe(true);
    expect(isConsequentialNeed(quietSet)).toBe(false);
  });

  it("place-open on set stage is still a consequential need (Pass 13)", () => {
    const placeOpenSet = sig({
      kind: "set",
      label: "Dinner · 6:30",
      lifecycle_stage: "set",
      requires_user_action: true,
      conversation_id: "j1",
      shared_reality: {
        what: "Dinner",
        when: "6:30",
        next_gap: "place",
        gaps: ["place"],
        sufficiency: "converging",
      },
    });
    expect(isConsequentialNeed(placeOpenSet)).toBe(true);
  });

  it("peer collapse prefers actionable place-open over settled set (Pass 13)", () => {
    const settled = sig({
      kind: "set",
      label: "Dinner · Thursday · Juniper",
      conversation_id: "jordan-old",
      lifecycle_stage: "set",
      requires_user_action: false,
      shared_reality: {
        what: "Dinner",
        when: "Thursday · 6:30",
        where: "Juniper & Ivy",
        sufficiency: "usable",
        next_gap: "none",
      },
    });
    const openTonight = sig({
      kind: "set",
      label: "Dinner · 6:30",
      conversation_id: "jordan-new",
      lifecycle_stage: "set",
      requires_user_action: true,
      shared_reality: {
        what: "Dinner",
        when: "6:30",
        next_gap: "place",
        gaps: ["place"],
        sufficiency: "converging",
      },
    });
    const peerMap = new Map([
      ["jordan-old", "peer-jordan"],
      ["jordan-new", "peer-jordan"],
    ]);
    const home = strongestPerHomePresence([settled, openTonight], peerMap);
    expect(home).toHaveLength(1);
    expect(home[0].conversation_id).toBe("jordan-new");
  });

  it("home_single_presence_per_canonical_reality (peer key)", () => {
    const list = [
      sig({
        kind: "open_loop",
        label: "Dinner A",
        conversation_id: "jordan-old",
        lifecycle_stage: "still_open",
        shared_reality: { what: "Dinner", when: "Thursday · 6:30 PM", gaps: ["where"] },
      }),
      sig({
        kind: "open_loop",
        label: "Dinner B",
        conversation_id: "jordan-new",
        lifecycle_stage: "still_open",
        shared_reality: {
          what: "Dinner",
          when: "Thursday · 6:30 PM",
          gaps: ["where"],
          place_gap_label: "Place still open",
        },
      }),
      sig({
        kind: "set",
        label: "Coffee",
        conversation_id: "maya-1",
        lifecycle_stage: "set",
        shared_reality: { what: "Coffee", when: "Tue 10:30", where: "Harbor", sufficiency: "usable" },
      }),
    ];
    // Both Jordan convos map to same peer id; Maya separate
    const peerMap = new Map([
      ["jordan-old", "peer-jordan"],
      ["jordan-new", "peer-jordan"],
      ["maya-1", "peer-maya"],
    ]);
    const home = strongestPerHomePresence(list, peerMap);
    expect(home).toHaveLength(2);
    expect(home.filter((s) => s.conversation_id?.startsWith("jordan")).length).toBe(1);
  });

  it("presenceLines compresses when without Thu+Thursday stack", () => {
    const lines = presenceLines({
      kind: "open_loop",
      label: "Dinner",
      lifecycle_stage: "still_open",
      shared_reality: {
        what: "Dinner",
        when: "Thursday · 6:30",
        where: "Juniper & Ivy",
        gaps: [],
      },
      conversation_id: "c1",
    } as ProductSignal);
    expect(lines.detail).not.toMatch(/Thu\s*[·,]\s*Thursday/i);
    expect(lines.detail).toMatch(/6:30/);
    expect(lines.detail).toMatch(/PM/i);
  });

  it("formats ISO timestamps for humans", () => {
    const today = new Date();
    today.setHours(14, 30, 0, 0);
    expect(formatHumanTime(today.toISOString())).toMatch(/\d/);
    expect(formatHumanTime("2:14 PM")).toBe("2:14 PM");
  });
});
