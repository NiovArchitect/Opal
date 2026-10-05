import { describe, expect, it } from "vitest";
import {
  applyTravelToChatRows,
  createdPlanToChatRow,
  createdPlanToFeedCard,
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
    const row = createdPlanToChatRow(plan);
    expect(row.planConsequence?.planId).toBe(id);
    expect(row.name).toBe("Maya");
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
    const plan = {
      id: "local-plan-maya-dinner-friday",
      title: "Dinner with Maya",
      who: "Maya",
      when: "Friday",
      createdAt: new Date().toISOString(),
    };
    const chats = mergeChatRowsWithCreated(FOUNDER_CHATS_PLAN_PILL_ROWS, [plan]);
    expect(chats[0]?.name).toBe("Maya");
    expect(chats[0]?.planConsequence?.planId).toBe(plan.id);
    const feed = mergeFeedWithCreated([], [plan]);
    expect(feed[0]?.id).toBe(plan.id);
    expect(feed[0]?.kind).toBe("graph");
  });
});
