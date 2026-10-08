/**
 * Broadcast choreography — sequences 1–5 + degraded / audience / batching.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  IntelligenceChoreography,
  INTELLIGENCE_EVENTS,
  reminderDedupeKey,
  type IntelligenceEventName,
  type IntelligencePayload,
} from "./intelligenceChoreography";

function payload(
  overrides: Partial<IntelligencePayload> & { event_id: string },
): IntelligencePayload {
  return {
    schema_version: 1,
    account_id: "acct-owner",
    intent_type: "nudge",
    ref_ids: [],
    reason: "test",
    priority: 50,
    summary: "hello",
    conversation_id: null,
    plan_id: null,
    person_id: null,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("CHANNEL_CONTRACT event names", () => {
  it("lists core + first-class Phase 6 names", () => {
    expect([...INTELLIGENCE_EVENTS]).toEqual([
      "intelligence:conflict_alert",
      "intelligence:plan_update_suggestion",
      "intelligence:nudge",
      "intelligence:presence_nudge",
      "intelligence:commitment_reminder",
      "intelligence:group_blocked",
      "intelligence:group_consensus",
      "intelligence:weekly_briefing",
      "intelligence:temporal_anchor",
    ]);
  });
});

describe("IntelligenceChoreography sequences", () => {
  let chrono: IntelligenceChoreography;
  let changes: number;

  beforeEach(() => {
    changes = 0;
    chrono = new IntelligenceChoreography({
      accountId: "acct-owner",
      onStoreChange: () => {
        changes += 1;
      },
    });
  });

  it("sequence 1: conflict_alert updates store for conversation members", () => {
    const r = chrono.handle(
      "intelligence:conflict_alert",
      payload({
        event_id: "e-conflict-1",
        intent_type: "conflict_alert",
        conversation_id: "conv-1",
        summary: "Time conflict on Saturday",
        account_id: null,
      }),
    );
    expect(r.accepted).toBe(true);
    expect(chrono.getSnapshot().lastConflictAlert?.payload.summary).toMatch(
      /Time conflict/,
    );
    expect(changes).toBe(1);
  });

  it("sequence 2: plan_update_suggestion lands in store", () => {
    const r = chrono.handle(
      "intelligence:plan_update_suggestion",
      payload({
        event_id: "e-plan-1",
        intent_type: "plan_update_suggestion",
        plan_id: "plan-1",
        conversation_id: "conv-1",
        summary: "Move dinner to 7:30?",
      }),
    );
    expect(r.accepted).toBe(true);
    expect(chrono.getSnapshot().lastPlanSuggestion?.payload.plan_id).toBe(
      "plan-1",
    );
  });

  it("sequence 3: private nudge refreshes attention flag", () => {
    const r = chrono.handle(
      "intelligence:nudge",
      payload({
        event_id: "e-nudge-1",
        intent_type: "nudge",
        person_id: "person-maya",
        reason: "celebration_reminder",
        summary: "Maya's birthday is Saturday",
        account_id: "acct-owner",
      }),
    );
    expect(r.accepted).toBe(true);
    expect(chrono.getSnapshot().attentionRefreshNeeded).toBe(true);
    expect(chrono.getSnapshot().lastNudge?.payload.person_id).toBe(
      "person-maya",
    );
  });

  it("sequence 4: presence_nudge is private + audience checked", () => {
    const ok = chrono.handle(
      "intelligence:presence_nudge",
      payload({
        event_id: "e-pres-1",
        intent_type: "presence_nudge",
        account_id: "acct-owner",
        summary: "Maya is nearby",
      }),
    );
    expect(ok.accepted).toBe(true);

    const drop = chrono.handle(
      "intelligence:presence_nudge",
      payload({
        event_id: "e-pres-2",
        intent_type: "presence_nudge",
        account_id: "acct-other",
        summary: "leak",
      }),
    );
    expect(drop.accepted).toBe(false);
    expect(drop.reason).toBe("audience_mismatch");
  });

  it("sequence 5: commitment_reminder → attention refresh", () => {
    const r = chrono.handle(
      "intelligence:commitment_reminder",
      payload({
        event_id: "e-commit-1",
        intent_type: "commitment_reminder",
        person_id: "person-sam",
        anchor_date: "2026-10-08",
        account_id: "acct-owner",
        summary: "Confirm Saturday dinner",
      }),
    );
    expect(r.accepted).toBe(true);
    expect(chrono.getSnapshot().lastCommitmentReminder?.payload.summary).toMatch(
      /Confirm/,
    );
    expect(chrono.getSnapshot().attentionRefreshNeeded).toBe(true);
  });
});

describe("degraded + dedupe + LWW + batching", () => {
  it("dedupes duplicate event_id within last 500", () => {
    const chrono = new IntelligenceChoreography({ accountId: "acct-owner" });
    const p = payload({ event_id: "dup-1", account_id: "acct-owner" });
    expect(chrono.handle("intelligence:nudge", p).accepted).toBe(true);
    expect(chrono.handle("intelligence:nudge", p).reason).toBe(
      "duplicate_event_id",
    );
  });

  it("out-of-order LWW keeps newer timestamp", () => {
    const chrono = new IntelligenceChoreography({ accountId: "acct-owner" });
    const base = {
      intent_type: "nudge",
      person_id: "p1",
      account_id: "acct-owner",
      anchor_date: "2026-06-14",
    };
    expect(
      chrono.handle(
        "intelligence:nudge",
        payload({ ...base, event_id: "newer", timestamp: 2000, summary: "new" }),
      ).accepted,
    ).toBe(true);
    expect(
      chrono.handle(
        "intelligence:nudge",
        payload({ ...base, event_id: "older", timestamp: 1000, summary: "old" }),
      ).reason,
    ).toBe("stale_lww");
    expect(chrono.getSnapshot().lastNudge?.payload.summary).toBe("new");
  });

  it("audience isolation drops foreign private nudge", () => {
    const stripped: string[] = [];
    const chrono = new IntelligenceChoreography({
      accountId: "acct-owner",
      onPrivacyStrip: (id) => stripped.push(id),
    });
    const r = chrono.handle(
      "intelligence:nudge",
      payload({
        event_id: "foreign",
        account_id: "acct-foreign",
        summary: "secret",
      }),
    );
    expect(r.accepted).toBe(false);
    expect(stripped).toEqual(["acct-foreign"]);
  });

  it("rapid-fire batching processes queued events", async () => {
    vi.useFakeTimers();
    const chrono = new IntelligenceChoreography({ accountId: "acct-owner" });
    for (let i = 0; i < 5; i++) {
      chrono.enqueueBatched(
        "intelligence:nudge",
        payload({
          event_id: `batch-${i}`,
          account_id: "acct-owner",
          person_id: `p-${i}`,
          timestamp: 1000 + i,
        }),
      );
    }
    expect(chrono.getSnapshot().recentEventIds).toHaveLength(0);
    vi.advanceTimersByTime(20);
    expect(chrono.getSnapshot().recentEventIds).toHaveLength(5);
    vi.useRealTimers();
  });

  it("reconnect refresh marks attention scope (Center + threads)", () => {
    const chrono = new IntelligenceChoreography({ accountId: "acct-owner" });
    chrono.markReconnectRefresh();
    expect(chrono.getSnapshot().attentionRefreshNeeded).toBe(true);
  });

  it("interim nudge reason maps mediation/briefing to attention refresh (one-release fallback)", () => {
    const chrono = new IntelligenceChoreography({ accountId: "acct-owner" });
    chrono.handle(
      "intelligence:nudge",
      payload({
        event_id: "med-1",
        account_id: "acct-owner",
        reason: "group_mediation_blocked",
      }),
    );
    expect(chrono.getSnapshot().attentionRefreshNeeded).toBe(true);
  });

  it("first-class group_blocked / weekly_briefing / temporal_anchor refresh attention", () => {
    const chrono = new IntelligenceChoreography({ accountId: "acct-owner" });
    expect(
      chrono.handle(
        "intelligence:group_blocked",
        payload({
          event_id: "gb-1",
          account_id: "acct-owner",
          conversation_id: "conv-1",
          summary: "Split on Saturday",
        }),
      ).accepted,
    ).toBe(true);
    expect(chrono.getSnapshot().lastGroupBlocked?.payload.summary).toMatch(
      /Split/,
    );

    expect(
      chrono.handle(
        "intelligence:group_consensus",
        payload({
          event_id: "gc-1",
          account_id: "acct-owner",
          conversation_id: "conv-1",
          summary: "Juniper locked",
        }),
      ).accepted,
    ).toBe(true);
    expect(chrono.getSnapshot().lastGroupConsensus?.payload.summary).toMatch(
      /Juniper/,
    );

    expect(
      chrono.handle(
        "intelligence:weekly_briefing",
        payload({
          event_id: "wb-1",
          account_id: "acct-owner",
          summary: "Your week ahead",
        }),
      ).accepted,
    ).toBe(true);
    expect(chrono.getSnapshot().lastWeeklyBriefing?.payload.summary).toMatch(
      /week ahead/,
    );

    expect(
      chrono.handle(
        "intelligence:temporal_anchor",
        payload({
          event_id: "ta-1",
          account_id: "acct-owner",
          person_id: "person-maya",
          anchor_date: "2026-06-14",
          summary: "Maya's birthday",
        }),
      ).accepted,
    ).toBe(true);
    expect(chrono.getSnapshot().lastTemporalAnchor?.payload.person_id).toBe(
      "person-maya",
    );
    expect(chrono.getSnapshot().attentionRefreshNeeded).toBe(true);
  });

  it("reminderDedupeKey for FE polish", () => {
    expect(reminderDedupeKey("p1", "2026-06-14")).toBe("p1|2026-06-14");
    expect(reminderDedupeKey(null, "2026-06-14")).toBeNull();
  });
});

describe("bindChannel", () => {
  it("registers core + first-class event names on channel.on", () => {
    const registered: string[] = [];
    const fakeChannel = {
      on: (name: string, _cb: (p: unknown) => void) => {
        registered.push(name);
        return registered.length;
      },
      off: vi.fn(),
    };
    const chrono = new IntelligenceChoreography({ accountId: "acct-owner" });
    const unsub = chrono.bindChannel(fakeChannel as never);
    expect(registered).toEqual([...INTELLIGENCE_EVENTS]);
    unsub();
    expect(fakeChannel.off).toHaveBeenCalledTimes(INTELLIGENCE_EVENTS.length);
  });
});

// silence unused type import in some bundlers
void (0 as unknown as IntelligenceEventName);
