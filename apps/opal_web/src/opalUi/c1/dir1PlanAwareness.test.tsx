/**
 * Repair #18 DIR-1 - EVENT IN CONVERSATION, web acceptance:
 *  - the plan-awareness element renders ONLY from the backend fact;
 *  - state -> color is consumed from the ONE token source
 *    (theme/planStateColors PLAN_STATE_HEX) - these tests compare
 *    against that source, never a copied hex;
 *  - the entity color lives on the person element (a --person-tint-*
 *    token), the state color/pattern on the plan element, unblended;
 *  - all three surfaces render the SAME fact: chats row (C1 list and
 *    legacy ChatsHome), thread Next Together strip, call-log row;
 *  - no fact -> no element on any surface (L8 absence), and exactly
 *    one plan element per row (the awareness element replaces the
 *    row pill / plan pill, never stacks beside it);
 *  - the C2 shell host feeds the row and the thread from the
 *    contract fields (next_plan on the conversation, next_plan on
 *    the thread read) - static audit, the wiring test's own style.
 */
import React from "react";
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextPlanFact } from "../../api/productClient";
import { PLAN_STATE_HEX, planStateFamily } from "../../theme/planStateColors";
import { PlanAwareness, entityTintVar } from "./PlanAwareness";
import { PeopleChatsList, ThreadShell } from "./C1Surfaces";
import { ChatsHome } from "../ChatsHome";

const FACT: NextPlanFact = {
  plan_id: "plan-dir1-1",
  title: "Dinner at Juniper",
  when_label: "Saturday 7:30 PM",
  starts_at: null,
  where_label: "Juniper and Ivy",
  where_kind: "physical",
  status: "tentative",
  state: "forming",
  conversation_id: "conv-1",
};

describe("DIR-1 PlanAwareness element", () => {
  it("renders the fact verbatim: title, finished when, where", () => {
    const html = renderToString(<PlanAwareness fact={FACT} entityTint={3} />);
    expect(html).toContain('data-testid="plan-awareness"');
    expect(html).toContain('data-plan-id="plan-dir1-1"');
    expect(html).toContain("Dinner at Juniper");
    expect(html).toContain("Saturday 7:30 PM");
    expect(html).toContain("Juniper and Ivy");
    expect(html).toContain("Forming");
  });

  it("absent fact renders nothing (L8)", () => {
    expect(renderToString(<PlanAwareness fact={null} />)).toBe("");
    expect(renderToString(<PlanAwareness fact={undefined} />)).toBe("");
  });

  it("every state family takes its color from the one token source", () => {
    for (const state of ["forming", "action", "ready", "happening"] as const) {
      const html = renderToString(
        <PlanAwareness fact={{ ...FACT, state }} entityTint={1} />,
      );
      const family = planStateFamily(state);
      expect(html).toContain(`data-plan-state="${family}"`);
      expect(html).toContain(PLAN_STATE_HEX[family]);
    }
  });

  it("patterns are the secondary cue: forming dashed, action heavy edge, happening live dot", () => {
    expect(renderToString(<PlanAwareness fact={FACT} />)).toContain(
      'data-pattern="dashed"',
    );
    expect(
      renderToString(<PlanAwareness fact={{ ...FACT, state: "action" }} />),
    ).toContain('data-pattern="solid-bold"');
    const live = renderToString(
      <PlanAwareness fact={{ ...FACT, state: "happening" }} />,
    );
    expect(live).toContain('data-pattern="live"');
    expect(live).toContain("plan-awareness-live-dot");
  });

  it("entity color is a person-tint token on the person element only", () => {
    expect(entityTintVar(3)).toBe("var(--person-tint-3)");
    expect(entityTintVar(null)).toBeNull();
    expect(entityTintVar(9)).toBeNull();
    const html = renderToString(<PlanAwareness fact={FACT} entityTint={3} />);
    expect(html).toContain("var(--person-tint-3)");
    // The state color and the entity tint are separate elements:
    // the pill carries the state, the dot carries the tint.
    expect(html).toContain('data-testid="plan-awareness-entity"');
    expect(html).toContain('data-testid="plan-awareness-pill"');
  });
});

describe("DIR-1 chats list (C1)", () => {
  const chats = [
    {
      id: "conv-1",
      name: "Maya",
      initials: "M",
      preview: "See you then",
      timeLabel: "9:41 AM",
      unread: false,
      plan: null,
      nextPlan: FACT,
      entityTint: 3,
    },
    {
      id: "conv-2",
      name: "Alex",
      initials: "A",
      preview: "Ok",
      timeLabel: "8:00 AM",
      unread: false,
      plan: null,
      nextPlan: null,
      entityTint: 1,
    },
  ];

  it("the row with a fact carries exactly one plan-awareness element; the row without carries none", () => {
    const html = renderToString(<PeopleChatsList chats={chats} />);
    expect(html.match(/data-testid="plan-awareness"/g)).toHaveLength(1);
    expect(html).toContain('data-variant="row"');
    // No legacy row pill stacks beside it.
    expect(html).not.toContain('data-testid="plan-card"');
  });
});

describe("DIR-1 thread Next Together strip (C1)", () => {
  it("the strip renders at its designed place, fed by the same fact", () => {
    const html = renderToString(
      <ThreadShell
        name="Maya"
        initials="M"
        nextPlanFact={FACT}
        entityTint={3}
        messages={[]}
        plansById={new Map()}
        composerPlaceholder="Message Maya"
      />,
    );
    expect(html).toContain('data-testid="next-together-strip"');
    expect(html).toContain('data-testid="plan-awareness"');
    expect(html).toContain('data-variant="strip"');
    expect(html).toContain("NEXT TOGETHER");
    expect(html).toContain("Dinner at Juniper");
  });

  it("no fact, no strip", () => {
    const html = renderToString(
      <ThreadShell
        name="Maya"
        initials="M"
        messages={[]}
        plansById={new Map()}
        composerPlaceholder="Message Maya"
      />,
    );
    expect(html).not.toContain("next-together-strip");
    expect(html).not.toContain("plan-awareness");
  });
});

describe("DIR-1 legacy shell (ChatsHome chats + calls)", () => {
  it("chats row renders the awareness element instead of the plan pill", () => {
    const html = renderToString(
      <ChatsHome
        rows={[
          {
            id: "conv-1",
            name: "Maya",
            kind: "direct",
            preview: "See you then",
            when: "9:41 AM",
            nextPlan: FACT,
            entityTint: 3,
            planConsequence: {
              state: "forming",
              label: "Forming",
              planId: FACT.plan_id,
            },
          },
        ]}
        onOpenChat={() => {}}
      />,
    );
    expect(html).toContain('data-testid="plan-awareness"');
    expect(html).not.toContain('data-testid="chat-plan-pill"');
  });

  it("call-log row renders the same fact per peer", () => {
    const html = renderToString(
      <ChatsHome
        rows={[]}
        initialSurface="calls"
        callRows={[
          {
            id: "call-1",
            name: "Maya",
            kind: "person",
            metadata: "Yesterday - Audio - 8m",
            missed: false,
            nextPlan: FACT,
            entityTint: 3,
          },
        ]}
        onOpenChat={() => {}}
      />,
    );
    expect(html).toContain('data-testid="plan-awareness"');
    expect(html).toContain('data-variant="call"');
    expect(html).toContain("Dinner at Juniper");
  });

  it("call-log row without a fact renders no awareness element", () => {
    const html = renderToString(
      <ChatsHome
        rows={[]}
        initialSurface="calls"
        callRows={[
          {
            id: "call-2",
            name: "Alex",
            kind: "person",
            metadata: "Yesterday - Audio - 8m",
            missed: false,
          },
        ]}
        onOpenChat={() => {}}
      />,
    );
    expect(html).not.toContain("plan-awareness");
  });
});

describe("DIR-1 shell host wiring (static audit)", () => {
  const hosts = readFileSync(
    join(__dirname, "../../c2/shell/C1ShellHosts.tsx"),
    "utf8",
  );

  it("ChatsHost feeds rows and thread from the contract's next_plan fields", () => {
    expect(hosts).toContain("nextPlan: chat.next_plan ?? null");
    expect(hosts).toContain("setThreadNextPlan(res.next_plan ?? null)");
    expect(hosts).toContain("nextPlanFact={threadNextPlan ?? selected.next_plan ?? null}");
    expect(hosts).toContain("entityTint: chat.entity_tint ?? null");
  });

  it("no component in the DIR-1 path hardcodes a state hex", () => {
    for (const rel of ["./PlanAwareness.tsx", "../ChatsHome.tsx"]) {
      const src = readFileSync(join(__dirname, rel), "utf8");
      expect(src).not.toMatch(/#FF4D5E|#FFC86B|#8B5CF6|#00E5FF/i);
    }
  });
});
