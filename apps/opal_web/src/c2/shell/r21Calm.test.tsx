/**
 * @vitest-environment jsdom
 *
 * Repair #21 - Clusters W-2/W-3 (calm surfaces):
 *  - W-3 NAMED PIN: the thread labels "Opal chats about <person>"
 *    (Maya Torres / Ethan Walker in the founder review) are GONE
 *    from the thread in both strip shapes; the header doorway orb
 *    remains as the route that carries the meaning.
 *  - W-3: the Center session list's explanatory sublabel is gone;
 *    empty states render the quiet state + (i) bubble, with the
 *    explanation revealed only on tap.
 *  - W-2: plan detail key values carry the shared calm-key
 *    treatment (bold, state color via data-state), the long who
 *    kicker is stripped, and the shared CSS exposes the
 *    separation/emphasis system (hairlines, calm-key state colors,
 *    calm-info) for every surface including Orbit.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextPlanFact } from "../../api/productClient";
import {
  CenterSessionList,
  PeopleCallsList,
  PeopleChatsList,
  ThreadShell,
} from "../../opalUi/c1/C1Surfaces";
import type { OpalConversationContext } from "../../opalUi/c1/opalChatScope";
import { PlanCardC2 } from "../PlanCardC2";
import { EmptyBlock } from "./bits";
import { C2GraphDetail } from "./C2Graphs";
import type { GraphDetailProjection } from "./projections";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;

async function render(node: React.ReactNode) {
  host = document.createElement("div");
  host.setAttribute("data-design", "r18");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(node);
  });
  return host;
}

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  host = null;
  root = null;
  document.body.innerHTML = "";
});

const q = (s: string) => host!.querySelector(s);
async function click(el: Element) {
  await act(async () => {
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
}

const FACT: NextPlanFact = {
  plan_id: "plan-a",
  title: "Brunch at Alma",
  when_label: "Sunday 11 AM",
  starts_at: null,
  where_label: "Alma",
  where_kind: "physical",
  status: "confirmed",
  state: "ready",
  conversation_id: "conv-maya",
};
const MAYA: OpalConversationContext = { personId: "user-maya", personName: "Maya Torres" };
const ETHAN: OpalConversationContext = { personId: "user-ethan", personName: "Ethan Walker" };

describe("R21 W-3 - the named thread labels are gone", () => {
  it("no 'Opal chats about Maya Torres' in a thread with a next plan; the header doorway remains", async () => {
    const onIndex = vi.fn();
    const onTalk = vi.fn();
    await render(
      <ThreadShell
        name="Maya Torres"
        initials="MT"
        nextPlanFact={FACT}
        messages={[]}
        plansById={new Map()}
        composerPlaceholder="Message Maya Torres"
        personContext={MAYA}
        onOpenOpalChats={onIndex}
        opalDoorway={MAYA}
        onTalkToOpal={onTalk}
      />,
    );
    expect(host!.textContent).not.toContain("Opal chats about");
    expect(q('[data-testid="opal-chats-index-open"]')).toBeNull();
    // The doorway that carries the meaning is still there.
    expect(q('[data-testid="thread-opal-doorway"]')).toBeTruthy();
    expect(q('[data-testid="next-together-strip"]')).toBeTruthy();
  });

  it("no 'Opal chats about Ethan Walker' and no slim zone when the thread has no next plan", async () => {
    await render(
      <ThreadShell
        name="Ethan Walker"
        initials="EW"
        messages={[]}
        plansById={new Map()}
        composerPlaceholder="Message Ethan Walker"
        personContext={ETHAN}
        onOpenOpalChats={vi.fn()}
      />,
    );
    expect(host!.textContent).not.toContain("Opal chats about");
    expect(q('[data-testid="opal-chats-index-open"]')).toBeNull();
    expect(q('[data-testid="thread-opal-zone"]')).toBeNull();
  });

  it("the source carries no thread rendering of the stripped label", () => {
    const src = readFileSync(
      resolve(__dirname, "../../opalUi/c1/C1Surfaces.tsx"),
      "utf8",
    );
    // The one remaining occurrence is the Opal chat's own context
    // chip action (a navigation button inside Opal's chat, kept -
    // see the report ledger), never a ThreadShell rendering.
    const threadSrc = src.slice(src.indexOf("export function ThreadShell"));
    expect(threadSrc).not.toContain("Opal chats about");
    expect(threadSrc).not.toContain("opal-chats-index-open");
  });
});

describe("R21 W-3 - explanatory copy stripped / behind (i)", () => {
  it("the Center session list carries no 'Filed by what they are about' sublabel", async () => {
    await render(<CenterSessionList sessions={[]} />);
    expect(host!.textContent).not.toContain("Filed by what they are about");
    expect(host!.textContent).not.toContain("Your current chat stays at the top");
    // The empty state is the quiet state + (i): the instruction is
    // absent until the bubble is tapped.
    expect(host!.textContent).toContain("No chats yet.");
    expect(host!.textContent).not.toContain("Start your first chat");
    await click(q('[data-testid="calm-info"]')!);
    expect(q('[data-testid="calm-info-pop"]')!.textContent).toContain("Start your first chat");
  });

  it("chats list empty state: quiet title + (i), no instruction on the surface", async () => {
    await render(<PeopleChatsList chats={[]} />);
    expect(host!.textContent).toContain("No chats yet.");
    expect(host!.textContent).not.toContain("Start a chat.");
    await click(q('[data-testid="calm-info"]')!);
    expect(q('[data-testid="calm-info-pop"]')!.textContent).toContain("Start a chat");
  });

  it("call log empty state: the 'will show up here' explanation is behind (i)", async () => {
    await render(<PeopleCallsList calls={[]} />);
    expect(host!.textContent).toContain("No calls yet.");
    expect(host!.textContent).not.toContain("will show up here");
    await click(q('[data-testid="calm-info"]')!);
    expect(q('[data-testid="calm-info-pop"]')!.textContent).toContain("will show up here");
  });

  it("EmptyBlock (the shell-wide empty state) puts its line behind (i) by default", async () => {
    await render(<EmptyBlock headline="Nothing here yet." line="Your plans will live here." />);
    expect(host!.textContent).toContain("Nothing here yet.");
    expect(host!.textContent).not.toContain("Your plans will live here.");
    await click(q('[data-testid="calm-info"]')!);
    expect(q('[data-testid="calm-info-pop"]')!.textContent).toContain("Your plans will live here.");
  });
});

const detail = (): GraphDetailProjection => ({
  id: "p-brunch",
  title: "Brunch at Alma",
  card: {
    stateFamily: "ready",
    stateLabel: "Ready",
    title: "Brunch at Alma",
    whenLine: "Sunday 11 AM",
    whereLine: "Alma",
    attendanceLine: "2 of 2 going",
    primaryActionLabel: null,
  } as GraphDetailProjection["card"],
  whenLine: "Sunday 11 AM",
  where: { label: "Alma", kind: "place", handoffLabel: null },
  who: [
    {
      name: "Maya Torres",
      avatar: { initials: "MT", tint: 1 },
      responseLabel: "Going",
      locationLabel: "1.9 mi away",
    },
    {
      name: "Ethan Walker",
      avatar: { initials: "EW", tint: 2 },
      responseLabel: "Going",
      locationLabel: "Not sharing location",
    },
  ],
  activity: [],
  history: [],
  origin: "graphs",
} as GraphDetailProjection);

const detailEvents = {
  openGraph: vi.fn(),
  createPlan: vi.fn(),
  createTrip: vi.fn(),
  createIdea: vi.fn(),
  completeSlot: vi.fn(),
  dropPlan: vi.fn(async () => null),
  runNextAction: vi.fn(),
  addPeople: vi.fn(),
  openChatForPlan: vi.fn(),
  back: vi.fn(),
  shareMyLocation: vi.fn(async () => ""),
  stopMyLocation: vi.fn(async () => ""),
};

describe("R21 W-2 - plan detail separation + emphasis", () => {
  it("when/where are calm-key values; the who kicker and Next step kicker are stripped", async () => {
    await render(<C2GraphDetail detail={detail()} events={detailEvents} />);
    // C2GraphDetail portals to document.body (TopLayer) - query there.
    expect(document.body.textContent).not.toContain("Who is coming, and where they are");
    const when = [...document.querySelectorAll(".calm-key")].find((el) =>
      el.textContent?.includes("Sunday 11 AM"),
    );
    expect(when).toBeTruthy();
    expect(when!.getAttribute("data-state")).toBe("ready");
    // Who rows still carry name + response + location as content.
    expect(document.body.textContent).toContain("Maya Torres");
    expect(document.body.textContent).toContain("1.9 mi away");
  });

  it("the location-share explainer is on glass in plain words - no (i) (W28-5)", async () => {
    await render(<C2GraphDetail detail={detail()} events={detailEvents} />);
    const block = document.querySelector('[data-testid="c2-detail-share-location"]')!;
    expect(block).toBeTruthy();
    // Repair #28 reverses R21 W-3's bubble for this block: what is
    // shared and who sees it stands beside the control, untapped.
    expect(block.querySelector('[data-testid="calm-info"]')).toBeNull();
    expect(block.textContent).toContain("a snapshot, not live tracking");
    expect(block.textContent).toContain("Only people on this plan see it");
    expect(block.textContent).toContain("until you stop sharing or 4 hours pass");
  });

  it("deck plan cards: the when line is calm-key in the plan's state", async () => {
    await render(
      <PlanCardC2
        input={{
          stateFamily: "ready",
          stateLabel: "Ready",
          title: "Brunch at Alma",
          whenLine: "Sunday 11 AM",
          whereLine: "Alma",
        }}
        onOpen={() => {}}
      />,
    );
    const when = q(".c2-plan-when")!;
    expect(when.classList.contains("calm-key")).toBe(true);
    expect(when.getAttribute("data-state")).toBe("ready");
    // Clickable affordance: the card is a button-role element.
    expect(q('[data-testid="c2-plan-card"]')!.getAttribute("role")).toBe("button");
  });
});

describe("R21 W-2 - the shared treatment is exposed for Orbit", () => {
  const css = readFileSync(resolve(__dirname, "./c2shell.css"), "utf8");

  it("c2shell.css defines the calm system: hairlines, calm-key states, calm-info", () => {
    expect(css).toContain(".calm-stack");
    expect(css).toContain(".calm-row");
    expect(css).toContain('.calm-key[data-state="action"]');
    expect(css).toContain('.calm-key[data-state="ready"]');
    expect(css).toContain('.calm-key[data-state="forming"]');
    expect(css).toContain('.calm-key[data-state="happening"]');
    expect(css).toContain('.calm-key[data-state="past"]');
    expect(css).toContain("var(--state-ready-ink)");
    expect(css).toContain(".calm-clickable");
    expect(css).toContain(".calm-info");
    // Plan detail hairlines: sections and who-rows.
    expect(css).toContain(".c2s-detail-section + .c2s-detail-section");
    expect(css).toContain(".c2s-who-row + .c2s-who-row");
    expect(css).toContain("border-top: 1px solid var(--line-1)");
  });
});
