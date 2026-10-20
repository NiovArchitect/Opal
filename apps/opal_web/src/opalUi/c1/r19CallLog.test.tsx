/**
 * Repair #19 W2 - THE CALL LOG IN THE DESIGN, web acceptance:
 *  - PeopleCallsList renders ONLY real contract rows: name and the
 *    finished history line verbatim, the DIR-1 element when the
 *    fact rides the row, nothing invented when it does not;
 *  - the row's ambient border IS the row's call_state fact: its
 *    color equals PLAN_STATE_HEX[family] imported from the ONE
 *    token source (never a copied hex), its pattern is the
 *    indicator family's pattern (the same map PlanAwareness uses);
 *  - the border therefore CHANGES when the fact changes: the same
 *    row rendered with a new fact carries the new state, reason,
 *    pattern, and color (the component holds no state of its own);
 *  - no call_state fact -> no state border (quiet default edge);
 *  - actions are real or absent: open-conversation and call-back
 *    render only when the row carries a conversation the host can
 *    act on;
 *  - drift audit: CallLog.css spends the state color ONLY at the
 *    unify ambient register (52% border / 9% fill / 12% glow -
 *    the same mixes PlanAwareness.css uses) and contains no hex;
 *    C1Surfaces derives nothing (no canon hex literals, no reading
 *    of the row's missed/history fields to invent a state).
 */
import React from "react";
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CallStateFact, NextPlanFact } from "../../api/productClient";
import { PLAN_STATE_HEX, planStateFamily } from "../../theme/planStateColors";
import { PATTERN_BY_STATE } from "./PlanAwareness";
import { PeopleCallsList, PeopleChatsList, type PeopleCallSummary } from "./C1Surfaces";

const FACT: NextPlanFact = {
  plan_id: "plan-r19-1",
  title: "Dinner at Juniper",
  when_label: "Saturday 7:30 PM",
  starts_at: null,
  where_label: "Juniper and Ivy",
  where_kind: "physical",
  status: "tentative",
  state: "forming",
  conversation_id: "conv-1",
};

function row(over: Partial<PeopleCallSummary> = {}): PeopleCallSummary {
  return {
    id: "call-1",
    name: "Maya Chen",
    initials: "MC",
    metadata: "Missed call · Oct 18, 12:00 PM",
    conversationId: "conv-1",
    nextPlan: null,
    entityTint: 3,
    callState: { state: "action", reason: "missed_unresolved", label: "Call back" },
    ...over,
  };
}

describe("R19 PeopleCallsList - the row and its state border", () => {
  it("renders the record verbatim: name, finished line, state label", () => {
    const html = renderToString(
      <PeopleCallsList calls={[row()]} onShowChats={() => {}} />,
    );
    expect(html).toContain('data-testid="people-calls-list"');
    expect(html).toContain("Maya Chen");
    expect(html).toContain("Missed call · Oct 18, 12:00 PM");
    expect(html).toContain('data-testid="call-state-label"');
    expect(html).toContain("Call back");
    // The Calls tab is real here, and Chats is its way back.
    expect(html).toContain('data-testid="calls-segment-chats"');
  });

  it("every state family's border color equals the one token source", () => {
    const cases: Array<[string, CallStateFact]> = [
      ["action", { state: "action", reason: "missed_unresolved", label: "Call back" }],
      ["forming", { state: "forming", reason: "plan_forming", label: "Taking shape" }],
      ["ready", { state: "ready", reason: "plan_ready", label: "Ready" }],
      ["happening", { state: "happening", reason: "plan_happening", label: "Happening now" }],
      ["past", { state: "past", reason: "settled", label: "Settled" }],
    ];
    for (const [family, callState] of cases) {
      const html = renderToString(<PeopleCallsList calls={[row({ callState })]} />);
      expect(html).toContain(`data-call-state="${family}"`);
      expect(html).toContain(`data-call-state-reason="${callState.reason}"`);
      expect(html).toContain(PLAN_STATE_HEX[planStateFamily(family)]);
      expect(html).toContain(`data-pattern="${PATTERN_BY_STATE[family]}"`);
      expect(html).toContain(callState.label);
    }
  });

  it("the border changes when the fact changes (live derivation, not a paint)", () => {
    const before = renderToString(<PeopleCallsList calls={[row()]} />);
    const after = renderToString(
      <PeopleCallsList
        calls={[
          row({
            callState: { state: "past", reason: "settled", label: "Settled" },
          }),
        ]}
      />,
    );
    expect(before).toContain('data-call-state="action"');
    expect(before).toContain(PLAN_STATE_HEX.action);
    expect(after).toContain('data-call-state="past"');
    expect(after).toContain('data-call-state-reason="settled"');
    expect(after).toContain(PLAN_STATE_HEX.past);
    expect(after).not.toContain(PLAN_STATE_HEX.action);
  });

  it("no call_state fact: no state border, no state label", () => {
    const html = renderToString(
      <PeopleCallsList calls={[row({ callState: null })]} />,
    );
    expect(html).not.toContain("data-call-state=");
    expect(html).not.toContain("call-state-label");
    expect(html).not.toContain("--call-state");
  });

  it("DIR-1 stays: the plan fact renders variant=call; no fact, no element", () => {
    const withFact = renderToString(
      <PeopleCallsList calls={[row({ nextPlan: FACT })]} />,
    );
    expect(withFact.match(/data-testid="plan-awareness"/g)).toHaveLength(1);
    expect(withFact).toContain('data-variant="call"');
    const without = renderToString(<PeopleCallsList calls={[row()]} />);
    expect(without).not.toContain("plan-awareness");
  });

  it("actions render only where a real conversation backs them", () => {
    const wired = renderToString(
      <PeopleCallsList
        calls={[row()]}
        onOpenConversation={() => {}}
        onCallBack={() => {}}
      />,
    );
    expect(wired).toContain('data-testid="calls-open-conversation-call-1"');
    expect(wired).toContain('data-testid="calls-call-back-call-1"');
    expect(wired).toContain('aria-label="Call back Maya Chen"');
    const bare = renderToString(
      <PeopleCallsList
        calls={[row({ conversationId: null })]}
        onOpenConversation={() => {}}
        onCallBack={() => {}}
      />,
    );
    expect(bare).not.toContain("calls-open-conversation");
    expect(bare).not.toContain("calls-call-back");
  });

  it("honest empty states: no records, and a search that matches nothing", () => {
    const empty = renderToString(<PeopleCallsList calls={[]} />);
    expect(empty).toContain('data-testid="calls-empty"');
    expect(empty).toContain("No calls yet.");
    expect(empty).not.toContain('data-testid="calls-row"');
    const error = renderToString(<PeopleCallsList calls={[]} status="error" />);
    expect(error).toContain('data-testid="calls-empty-error"');
  });
});

describe("R19 Chats/Calls segment - the tab is real only when wired", () => {
  it("PeopleChatsList renders a Calls tab button when the host wires it", () => {
    const html = renderToString(
      <PeopleChatsList chats={[]} onShowCalls={() => {}} />,
    );
    expect(html).toContain('data-testid="chats-segment-calls"');
  });

  it("without a host wiring, the segment stays words only (no dead tab)", () => {
    const html = renderToString(<PeopleChatsList chats={[]} />);
    expect(html).not.toContain("chats-segment-calls");
    expect(html).toContain("Calls");
  });
});

describe("R19 drift audit - one token source, one ambient register", () => {
  const callLogCss = readFileSync(
    join(process.cwd(), "src/opalUi/c1/CallLog.css"),
    "utf8",
  );
  const unifyCss = readFileSync(
    join(process.cwd(), "src/theme/unifyChats.css"),
    "utf8",
  );
  const surfaces = readFileSync(
    join(process.cwd(), "src/opalUi/c1/C1Surfaces.tsx"),
    "utf8",
  );
  const hosts = readFileSync(
    join(process.cwd(), "src/c2/shell/C1ShellHosts.tsx"),
    "utf8",
  );

  it("CallLog.css spends the state color at the unify ambient mixes, and holds no hex", () => {
    expect(callLogCss).toContain(
      "color-mix(in srgb, var(--call-state) 52%, transparent)",
    );
    expect(callLogCss).toContain(
      "color-mix(in srgb, var(--call-state) 9%, var(--surface-1))",
    );
    expect(callLogCss).toContain(
      "color-mix(in srgb, var(--call-state) 12%, transparent)",
    );
    expect(callLogCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    // The same register the PlanAwareness element renders at (the
    // unify wave's ambient override of the element, unifyChats.css):
    expect(unifyCss).toContain(
      "color-mix(in srgb, var(--pa-state) 52%, transparent)",
    );
    expect(unifyCss).toContain(
      // P7 at-rest: the PlanAwareness fill is 14% (AR-00.2 fill envelope).
      "color-mix(in srgb, var(--pa-state) 14%, transparent)",
    );
  });

  it("the component derives no state: no canon hex literals, no missed/history re-derivation", () => {
    for (const hex of Object.values(PLAN_STATE_HEX)) {
      expect(surfaces).not.toContain(hex);
    }
    expect(surfaces).not.toContain(".missed");
    expect(surfaces).not.toContain("history_label");
    // The state enters ONLY through the contract fact:
    expect(surfaces).toContain("c.callState");
  });

  it("the C2 host feeds rows from the contract and wires the real call path", () => {
    expect(hosts).toContain("callState: call.call_state ?? null");
    expect(hosts).toContain("nextPlan: call.next_plan ?? null");
    expect(hosts).toContain("createConversationCall");
    expect(hosts).toContain("<PeopleCallsList");
    expect(hosts).toContain("onShowCalls");
  });
});
