import { MemorySqlDriver } from "../storage/sqlDriver";
import { SocialFlowRepository } from "../socialFlow/socialFlowRepository";

describe("SocialFlowRepository", () => {
  const alex = "a1111111-1111-4111-8111-111111111111";
  const jordan = "a2222222-2222-4222-8222-222222222222";
  const conv = "b1111111-1111-4111-8111-111111111111";

  function repo() {
    const db = new MemorySqlDriver();
    const r = new SocialFlowRepository(db);
    r.migrate();
    return r;
  }

  test("stores shared signal and private reminder isolation", () => {
    const r = repo();
    r.upsertSignal({
      id: "sig-1",
      conversationId: conv,
      kind: "possible_plan",
      status: "visible",
      copy: "Dinner next Thursday may be a plan.",
      visibility: "shared",
      actions: [{ id: "coordinate", label: "Coordinate this" }],
      createdAt: new Date().toISOString(),
    });

    r.upsertReminder(
      {
        id: "rem-1",
        planId: "plan-1",
        ownerUserId: alex,
        visibility: "private",
        contentSummary: "Book the restaurant",
        status: "active",
      },
      alex,
    );

    // Jordan device must not accept Alex private reminder
    r.upsertReminder(
      {
        id: "rem-1",
        planId: "plan-1",
        ownerUserId: alex,
        visibility: "private",
        contentSummary: "Book the restaurant",
        status: "active",
      },
      jordan,
    );

    expect(r.listSignals(conv, alex).length).toBe(1);
    expect(r.listReminders(alex).map((x) => x.id)).toContain("rem-1");
    expect(r.listReminders(jordan).map((x) => x.id)).not.toContain("rem-1");
  });

  test("plan projection survives upsert", () => {
    const r = repo();
    r.upsertPlan({
      id: "plan-1",
      conversationId: conv,
      title: "Dinner",
      status: "changed",
      timeLabel: "7:30 PM",
      createdAt: new Date().toISOString(),
    });
    const plans = r.listPlans(conv);
    expect(plans[0].timeLabel).toBe("7:30 PM");
  });
});
