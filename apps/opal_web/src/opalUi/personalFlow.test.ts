import { describe, expect, it } from "vitest";
import type { ProductSignal } from "../api/productClient";
import { composePersonalFlow, personalDayTimeline } from "./personalFlow";
import {
  activeDeliveriesForConsequence,
  buildDeliveryIntent,
  notificationScenarioMatrix,
  permissionPromptCopy,
  privacySafeLockScreen,
  recordReceipt,
  type DeliveryHistory,
} from "./notificationDelivery";
import { composeHumanReality, formatDayLabel, shortWeekday } from "./composeHumanReality";

function jordanDinner(partial: Partial<ProductSignal> = {}): ProductSignal {
  return {
    kind: "signal",
    label: "Jordan Lee",
    conversation_id: "jordan-1",
    lifecycle_stage: "set",
    requires_user_action: false,
    shared_reality: {
      what: "Dinner",
      when: "Tonight · 7:00 PM",
      where: "Juniper & Ivy",
      sufficiency: "usable",
      next_gap: "none",
    },
    ...partial,
  } as ProductSignal;
}

describe("personalFlow Pass 14", () => {
  it("3 PM work — silence", () => {
    const flow = composePersonalFlow([jordanDinner({ minutes_until: 240 } as ProductSignal & { minutes_until: number })], {
      workEndsInMinutes: 120,
      travelMinutes: 25,
      now: new Date("2026-08-14T15:00:00"),
    });
    expect(flow.kind).toBe("silence");
    expect(flow.humanConsequence).toBeNull();
  });

  it("5 PM work end — optional errand when slack exists", () => {
    const flow = composePersonalFlow(
      [jordanDinner({ minutes_until: 120 } as ProductSignal & { minutes_until: number })],
      {
        workEndsInMinutes: 0,
        travelMinutes: 25,
        optionalErrand: { id: "store", label: "that stop", durationMinutes: 25, feasible: true },
        now: new Date("2026-08-14T17:00:00"),
      },
    );
    expect(flow.kind).toBe("optional_transition");
    expect(flow.humanConsequence).toMatch(/time for that stop/i);
    expect(flow.deliveryEligible).toBe(false);
    expect(flow.privacyClass).toBe("actor_private");
  });

  it("optional does not become obligation", () => {
    const flow = composePersonalFlow(
      [jordanDinner({ minutes_until: 120 } as ProductSignal & { minutes_until: number })],
      {
        workEndsInMinutes: 0,
        travelMinutes: 25,
        optionalErrand: { label: "the store", durationMinutes: 25 },
        now: new Date("2026-08-14T17:00:00"),
      },
    );
    expect(flow.humanConsequence).not.toMatch(/Go to the store at/i);
  });

  it("pre-leave — actionable leave consequence", () => {
    const flow = composePersonalFlow(
      [
        jordanDinner({
          minutes_until: 40,
          leave_by_relevant: false,
        } as ProductSignal & { minutes_until: number }),
      ],
      {
        workEndsInMinutes: -80,
        travelMinutes: 25,
        now: new Date("2026-08-14T18:20:00"),
        travelProvenance: {
          origin: "work",
          destination: "Juniper",
          mode: "driving",
          duration: 25,
          source: "synthetic_authoritative",
        },
      },
    );
    expect(flow.kind).toBe("leave_window");
    expect(flow.humanConsequence).toMatch(/Leave/i);
    expect(flow.deliveryEligible).toBe(true);
    expect(flow.sourceProvenance.join(" ")).toMatch(/travel|synthetic/i);
  });

  it("on track — silence", () => {
    const flow = composePersonalFlow(
      [jordanDinner({ minutes_until: 30 } as ProductSignal & { minutes_until: number })],
      {
        alreadyTravelling: true,
        travelMinutes: 25,
        now: new Date("2026-08-14T18:25:00"),
      },
    );
    expect(flow.kind).toBe("silence");
    expect(flow.reasons.join(" ")).toMatch(/already_travelling/i);
  });

  it("timeline EP-010 shape", () => {
    const steps = personalDayTimeline([
      jordanDinner({
        minutes_until: 240,
        shared_reality: {
          what: "Dinner",
          when: "Tonight · 7:00 PM",
          sufficiency: "usable",
          next_gap: "none",
        },
      } as ProductSignal & { minutes_until: number }),
    ]);
    expect(steps.map((s) => s.label)).toEqual([
      "3pm_work",
      "5pm_work_end",
      "6_20_leave",
      "on_track",
    ]);
    expect(steps[0].flow.kind).toBe("silence");
    expect(steps[3].flow.kind).toBe("silence");
  });
});

describe("notificationDelivery Pass 14", () => {
  const base = jordanDinner();

  it("N1–N9 matrix classes", () => {
    const matrix = notificationScenarioMatrix(base);
    for (const row of matrix) {
      const allowed = Array.isArray(row.expectClass) ? row.expectClass : [row.expectClass];
      expect(allowed, row.id).toContain(row.intent.deliveryClass);
    }
  });

  it("N9 private copy lock-screen safe", () => {
    const bad =
      "Leave around 6:20 because of private calendar medical preference with Jordan.";
    expect(privacySafeLockScreen(bad, true)).toBe("Your timing changed.");
    expect(privacySafeLockScreen("Leave around 6:20 for dinner with Jordan.", true)).toMatch(
      /Leave around/i,
    );
  });

  it("reconnect does not re-notify same supersession", () => {
    const flow = {
      realityId: "jordan-1",
      kind: "leave_window" as const,
      humanConsequence: "Leave around 6:20 for dinner with Jordan.",
      actionability: "time_sensitive" as const,
      attention: {
        class: "time_sensitive" as const,
        shouldSurfaceHome: true,
        shouldSurfaceChatFilament: true,
        shouldInterrupt: true,
        priority: 80,
        reason: "leave_window",
        band: "now" as const,
      },
      deliveryEligible: true,
      supersessionKey: "leave:jordan-1:20",
      privacyClass: "actor_private" as const,
      sourceProvenance: ["travel"],
      minutesUntil: 20,
      reasons: ["leave"],
    };
    let hist: DeliveryHistory = { receipts: [] };
    const first = buildDeliveryIntent(
      { ...base, leave_by_relevant: true, minutes_until: 20 } as ProductSignal & {
        leave_by_relevant: boolean;
        minutes_until: number;
      },
      flow,
      { permission: "granted", appBackgrounded: true, history: hist },
    );
    expect(first.deliveryClass).toMatch(/notify|supersede/);
    hist = recordReceipt(hist, first, "delivered");
    const again = buildDeliveryIntent(
      { ...base, leave_by_relevant: true, minutes_until: 20 } as ProductSignal & {
        leave_by_relevant: boolean;
        minutes_until: number;
      },
      flow,
      { permission: "granted", appBackgrounded: true, history: hist },
    );
    expect(again.deliveryClass).toBe("suppress");
    expect(again.reasons.join(" ")).toMatch(/dedupe|reconnect/i);
  });

  it("one active delivery property after supersede", () => {
    let hist: DeliveryHistory = { receipts: [] };
    const a = buildDeliveryIntent(base, {
      realityId: "jordan-1",
      kind: "leave_window",
      humanConsequence: "Leave around 6:20 for dinner with Jordan.",
      actionability: "time_sensitive",
      attention: {
        class: "time_sensitive",
        shouldSurfaceHome: true,
        shouldSurfaceChatFilament: true,
        shouldInterrupt: true,
        priority: 80,
        reason: "leave",
        band: "now",
      },
      deliveryEligible: true,
      supersessionKey: "leave:jordan-1:20",
      privacyClass: "actor_private",
      sourceProvenance: [],
      minutesUntil: 20,
      reasons: [],
    }, { permission: "granted", appBackgrounded: true });
    hist = recordReceipt(hist, a, "delivered");
    const b = buildDeliveryIntent(base, {
      realityId: "jordan-1",
      kind: "leave_window",
      humanConsequence: "Leave around 6:05 for dinner with Jordan.",
      actionability: "time_sensitive",
      attention: {
        class: "time_sensitive",
        shouldSurfaceHome: true,
        shouldSurfaceChatFilament: true,
        shouldInterrupt: true,
        priority: 90,
        reason: "leave",
        band: "now",
      },
      deliveryEligible: true,
      supersessionKey: "leave:jordan-1:5",
      privacyClass: "actor_private",
      sourceProvenance: [],
      minutesUntil: 5,
      reasons: [],
    }, { permission: "granted", appBackgrounded: true, history: hist });
    expect(b.deliveryClass).toBe("supersede");
    hist = recordReceipt(hist, b, "delivered");
    const active = activeDeliveriesForConsequence(hist, "jordan-1");
    // Prior marked superseded — only newest delivered remains active
    expect(active.filter((r) => r.status === "delivered").length).toBe(1);
    expect(active[0].supersessionKey).toBe("leave:jordan-1:5");
  });

  it("permission prompt is contextual not first-launch spam", () => {
    expect(permissionPromptCopy()).toMatch(/head out|let you know/i);
    expect(permissionPromptCopy()).not.toMatch(/enable all notifications/i);
  });
});

describe("meta copy polish Pass 14", () => {
  it("bare 6:30 is not day-sliced to 6:3", () => {
    expect(formatDayLabel("6:30")).toBe("");
    expect(shortWeekday("6:30")).toBe("6:30");
    const c = composeHumanReality({ what: "Dinner", when: "6:30", gap: "Choosing the place" });
    expect(c.presenceDetail).not.toMatch(/6:3(?!\d)/);
    expect(c.presenceDetail + c.presenceTitle).toMatch(/6:30/);
  });
});
