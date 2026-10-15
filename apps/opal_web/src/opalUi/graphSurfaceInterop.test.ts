import { describe, expect, it } from "vitest";
import {
  applyTravelToChatRows,
  createdPlanGraphOverlay,
  createdPlanToChatRow,
  createdPlanToFeedCard,
  findCreatedPlanForCard,
  localPlanSurfaceId,
  mergeChatRowsWithCreated,
  mergeFeedWithCreated,
  planFromLocalConfirm,
  planFromOpalMetadata,
  travelLabelFor,
} from "./graphSurfaceInterop";
import { FOUNDER_CHATS_PLAN_PILL_ROWS } from "./founderChatsPlanPills";

describe("graphSurfaceInterop", () => {
  it("builds local plan id and feed/chat surfaces", () => {
    const id = localPlanSurfaceId("Maya", "dinner-Friday");
    expect(id).toMatch(/^local-plan-maya-dinner-friday$/);
    const plan = {
      id,
      title: "Dinner with Maya",
      who: "Maya",
      when: "Friday",
      what: "dinner",
      place: "dinner",
      createdAt: new Date().toISOString(),
    };
    const card = createdPlanToFeedCard(plan);
    expect(card.kind).toBe("graph");
    expect(card.ctaAction).toBe("open_graph");
    expect(card.person).toBe("Maya");
    expect(card.detail).toBe("Friday · dinner");
    expect(card.startsAt).toBeUndefined();
    expect(card.meta).toMatch(/Forming|pending/i);
    // Owner-private Center plan (no conversationId) must NOT invent a Direct row.
    expect(createdPlanToChatRow(plan)).toBeNull();
    const shared = createdPlanToChatRow({
      ...plan,
      conversationId: "conv-maya-real-uuid",
    });
    expect(shared?.planConsequence?.planId).toBe(id);
    expect(shared?.planConsequence?.state).toBe("forming");
    expect(shared?.name).toBe("Maya");
    expect(shared?.id).toBe("conv-maya-real-uuid");
  });

  it("Repair #5: plan_create metadata with bare plan_id does not surface", () => {
    expect(
      planFromOpalMetadata({
        intent: {
          intent: "plan_create",
          entities: { plan_id: "stale-plan", who: ["Maya"], what: "omething" },
        },
      }),
    ).toBeNull();
  });

  it("Repair #5: sanitizes Omething labels and skips private plan chat projection", () => {
    const fromMeta = planFromOpalMetadata({
      intent: {
        intent: "plan_confirm",
        entities: {
          confirmed: true,
          plan_id: "plan-omething",
          title: "Omething",
          who: ["Maya"],
          when: "Friday",
          what: "omething",
        },
      },
    });
    expect(fromMeta?.title).not.toMatch(/omething/i);
    expect(fromMeta?.conversationId).toBeNull();
    expect(createdPlanToChatRow(fromMeta!)).toBeNull();
  });

  it("Paste W5 — overlays idea cards as forming with people+when", () => {
    const plan = {
      id: "seed-near-rooftop",
      title: "Rooftop Jazz",
      who: "Chanelle, Maya",
      when: "Tomorrow",
      place: "Rooftop nearby",
      sourceIdeaId: "seed-near-rooftop",
      createdAt: new Date().toISOString(),
    };
    const overlay = createdPlanGraphOverlay(plan);
    expect(overlay.status).toBe("forming");
    expect(overlay.signalLine).toMatch(/Forming|pending/i);
    expect(overlay.whenLine).toMatch(/Tomorrow/);
    expect(overlay.whenLine).toMatch(/Chanelle/);
    expect(overlay.whenLine).not.toMatch(/no one asked/i);
    expect(findCreatedPlanForCard("seed-near-rooftop", [plan])?.id).toBe(plan.id);
  });

  it("parses plan_confirm metadata and local Yes confirm", () => {
    const fromMeta = planFromOpalMetadata({
      intent: {
        intent: "plan_confirm",
        entities: {
          confirmed: true,
          plan_id: "plan-abc",
          title: "Dinner with Maya",
          who: ["Maya"],
          when: "Friday",
          what: "dinner",
        },
      },
    });
    expect(fromMeta?.id).toBe("plan-abc");
    expect(fromMeta?.who).toBe("Maya");

    const local = planFromLocalConfirm({
      priorUserText: "Plan dinner with Maya Friday",
      affirmText: "Yes",
    });
    expect(local?.who).toBe("Maya");
    expect(local?.when).toBe("Friday");
    expect(local?.title).toMatch(/Dinner with Maya/i);
  });

  it("applies On the way to matching chat pills", () => {
    const rows = applyTravelToChatRows(FOUNDER_CHATS_PLAN_PILL_ROWS, {
      "seed-chanelle-juniper": {
        graphId: "seed-chanelle-juniper",
        travelState: "on_the_way",
        label: "On the way",
        updatedAt: new Date().toISOString(),
      },
    });
    const chanelle = rows.find((r) => r.planConsequence?.planId === "seed-chanelle-juniper");
    expect(chanelle?.planConsequence?.label).toBe("On the way");
    expect(travelLabelFor("on_the_way")).toBe("On the way");
  });

  it("merges created plans into chats and feed", () => {
    const privatePlan = {
      id: "local-plan-maya-dinner-friday",
      title: "Dinner with Maya",
      who: "Maya",
      when: "Friday",
      createdAt: new Date().toISOString(),
    };
    // Private Center plan: chats unchanged (no invented Maya Direct).
    const chatsPrivate = mergeChatRowsWithCreated(FOUNDER_CHATS_PLAN_PILL_ROWS, [
      privatePlan,
    ]);
    expect(chatsPrivate.filter((r) => r.name === "Maya").length).toBeLessThanOrEqual(
      FOUNDER_CHATS_PLAN_PILL_ROWS.filter((r) => r.name === "Maya").length,
    );
    expect(chatsPrivate.some((r) => r.id === `seed-chat-${privatePlan.id}`)).toBe(
      false,
    );

    const sharedPlan = {
      ...privatePlan,
      conversationId: "conv-shared-maya",
    };
    const chats = mergeChatRowsWithCreated(FOUNDER_CHATS_PLAN_PILL_ROWS, [sharedPlan]);
    expect(chats.some((r) => r.id === "conv-shared-maya")).toBe(true);
    // Two private plans with same who must not invent extra Maya Directs.
    const baseSeedCount = FOUNDER_CHATS_PLAN_PILL_ROWS.filter((r) =>
      /^seed-chat-/i.test(r.id),
    ).length;
    const dup = mergeChatRowsWithCreated(FOUNDER_CHATS_PLAN_PILL_ROWS, [
      privatePlan,
      { ...privatePlan, id: "local-plan-maya-omething", title: "Omething" },
    ]);
    const seedAfter = dup.filter((r) => /^seed-chat-/i.test(r.id)).length;
    expect(seedAfter).toBe(baseSeedCount);
    expect(dup.filter((r) => r.preview === "Opal set this up").length).toBe(0);

    const feed = mergeFeedWithCreated([], [privatePlan]);
    expect(feed[0]?.id).toBe(privatePlan.id);
    expect(feed[0]?.kind).toBe("graph");
  });
});
