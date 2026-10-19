/**
 * @vitest-environment jsdom
 *
 * Repair #19 W14 + Additions (A person orbits, Orbits supersession,
 * chrome, frosted glass) — the wave's web proof set:
 * - separation invariants (an Opal message can never render in a
 *   person thread; a system line can never render in the Opal chat);
 * - doorway presence rules + cross-plan leakage impossibility;
 * - the orbit log (pinned Continuing, pin zone, collapsed groups,
 *   dormant sink, unanchored recency, archived section, privacy);
 * - the orbit sheet operations (open / start-new / archive / remove
 *   behind its plain confirmation);
 * - chrome (glass overflow, rename, pin, delete confirm, share,
 *   navigator rail == log), anchor proposals / redirect / split /
 *   one-tap undo;
 * - two-tap navigation proofs (thread -> Opal -> back; Center rail).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { NextPlanFact, RevealItem } from "../../api/productClient";
import {
  CenterChat,
  CenterSessionList,
  ConversationRail,
  ThreadShell,
} from "./C1Surfaces";
import { OrbitSheet } from "./OrbitSheet";
import {
  buildOrbitLog,
  messagesForSurface,
  opalDoorwayContext,
  planIsDiscussable,
  sessionsForAnchor,
  sessionsForPerson,
  type OpalAnchor,
  type OpalConversationContext,
  type PersonOpalSessionRow,
} from "./opalChatScope";
import {
  anchorProposalFromMessages,
  doorwayTargetSessionId,
  dyadPersonOf,
  summaryToRow,
  threadMsgFromOpalMessage,
  threadMsgFromProductMessage,
} from "../../c2/shell/C1ShellHosts";
import type { OpalChatMessage, OpalChatSessionSummary, ProductMessage } from "../../api/productClient";

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
const qa = (s: string) => [...host!.querySelectorAll(s)];
async function click(el: Element) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}
async function typeInto(el: HTMLInputElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

const FACT = (over: Partial<NextPlanFact> = {}): NextPlanFact => ({
  plan_id: "plan-a",
  title: "Dinner at Juniper",
  when_label: "Saturday 7:30 PM",
  starts_at: null,
  where_label: "Juniper and Ivy",
  where_kind: "physical",
  status: "tentative",
  state: "forming",
  conversation_id: "conv-ab",
  ...over,
});
const REVEAL = (over: Partial<RevealItem> = {}): RevealItem => ({
  reveal_key: "rk-1",
  category: "P1",
  kicker: "Your move",
  title: "Dinner",
  plan_id: "plan-a",
  conversation_id: "conv-ab",
  lit: false,
  ...over,
});
const CTX: OpalConversationContext = {
  personId: "user-b",
  personName: "Bea",
  conversationId: "conv-ab",
  planId: "plan-a",
  planTitle: "Dinner at Juniper",
};
const ROW = (over: Partial<PersonOpalSessionRow> = {}): PersonOpalSessionRow => ({
  id: "s1",
  title: "Chat",
  preview: "preview",
  timeLabel: "1:00 PM",
  isActive: false,
  context: null,
  updatedAt: "2026-10-18T10:00:00Z",
  ...over,
});

/* ---------------- Separation ---------------- */

describe("R19 separation: one conversation type per surface", () => {
  it("messagesForSurface drops blended kinds, keeps belonging kinds", () => {
    const msgs = [
      { id: "1", authorKind: "person" as const, body: "hi" },
      { id: "2", authorKind: "opal" as const, body: "opal here" },
      { id: "3", authorKind: "system" as const, body: "Time updated" },
    ];
    expect(messagesForSurface("person-thread", msgs).map((m) => m.id)).toEqual(["1", "3"]);
    expect(messagesForSurface("opal-chat", msgs).map((m) => m.id)).toEqual(["1", "2"]);
  });

  it("a person thread NEVER renders an Opal-authored message (or its plan card)", async () => {
    await render(
      <ThreadShell
        name="Bea"
        initials="B"
        messages={[
          { id: "m1", authorKind: "person", body: "Dinner Thursday?" },
          { id: "m2", authorKind: "opal", body: "OPAL LEAK BODY", planId: "plan-a" },
          { id: "m3", authorKind: "system", body: "Time updated to 7:30 PM." },
        ]}
        plansById={new Map()}
        composerPlaceholder="Message Bea"
      />,
    );
    expect(host!.textContent).not.toContain("OPAL LEAK BODY");
    expect(host!.textContent).toContain("Dinner Thursday?");
    expect(host!.textContent).toContain("Time updated to 7:30 PM.");
  });

  it("the Opal conversation NEVER renders a system line", async () => {
    await render(
      <CenterChat
        title="Opal"
        messages={[
          { id: "m1", authorKind: "person", own: true, body: "Plan dinner" },
          { id: "m2", authorKind: "opal", body: "Here is what is set." },
          { id: "m3", authorKind: "system", body: "SYSTEM LEAK" },
        ]}
        plansById={new Map()}
      />,
    );
    expect(host!.textContent).not.toContain("SYSTEM LEAK");
    expect(host!.textContent).toContain("Here is what is set.");
  });

  it("host adapters are the only producers and stay in their lanes", () => {
    const pm = {
      id: "p1",
      conversation_id: "conv-ab",
      sender_user_id: "user-b",
      body: "hello",
      inserted_at: "2026-10-18T10:00:00Z",
    } as unknown as ProductMessage;
    const personMsg = threadMsgFromProductMessage(pm, {
      viewerUserId: "user-a",
      names: new Map([["user-b", "Bea"]]),
      callLineById: new Map(),
    });
    expect(personMsg.authorKind).toBe("person");
    const om = { id: "o1", conversation_id: "oc1", role: "opal", body: "reply" } as OpalChatMessage;
    expect(threadMsgFromOpalMessage(om).authorKind).toBe("opal");
    const um = { id: "o2", conversation_id: "oc1", role: "user", body: "hi" } as OpalChatMessage;
    expect(threadMsgFromOpalMessage(um).authorKind).toBe("person");
  });
});

/* ---------------- Doorway presence ---------------- */

describe("R19 doorway presence rules (DIR-1 fact + DIR-4 reveals only)", () => {
  it("action pending earns it; forming with an open slot earns it", () => {
    expect(planIsDiscussable(FACT({ state: "action" }))).toBe(true);
    expect(planIsDiscussable(FACT({ state: "forming", when_label: null }))).toBe(true);
    expect(planIsDiscussable(FACT({ state: "forming", where_label: null }))).toBe(true);
  });

  it("forming complete, ready, and happening with nothing pending earn nothing", () => {
    expect(planIsDiscussable(FACT({ state: "forming" }))).toBe(false);
    expect(planIsDiscussable(FACT({ state: "ready" }))).toBe(false);
    expect(planIsDiscussable(FACT({ state: "happening" }))).toBe(false);
    expect(planIsDiscussable(null)).toBe(false);
  });

  it("a reveal lit FOR THIS plan earns it; lit for another plan never does", () => {
    expect(planIsDiscussable(FACT({ state: "ready" }), [REVEAL({ lit: true })])).toBe(true);
    expect(
      planIsDiscussable(FACT({ state: "ready" }), [REVEAL({ lit: true, plan_id: "plan-b" })]),
    ).toBe(false);
  });

  it("a P3 missing-slot reveal for this plan earns it (forming, named open question)", () => {
    expect(
      planIsDiscussable(FACT({ state: "forming" }), [
        REVEAL({ category: "P3", missing_slot: "when" }),
      ]),
    ).toBe(true);
    expect(
      planIsDiscussable(FACT({ state: "forming" }), [
        REVEAL({ category: "P3", missing_slot: "when", plan_id: "plan-b" }),
      ]),
    ).toBe(false);
  });

  it("the doorway context takes its plan ONLY from the thread's own fact", () => {
    const ctx = opalDoorwayContext({
      fact: FACT({ state: "action" }),
      reveals: [REVEAL({ lit: true, plan_id: "plan-b" })],
      personId: "user-b",
      personName: "Bea",
      conversationId: "conv-ab",
    });
    expect(ctx).toEqual(CTX);
    // No person to scope to -> no doorway, however discussable.
    expect(
      opalDoorwayContext({ fact: FACT({ state: "action" }), personId: null, personName: null }),
    ).toBeNull();
  });

  it("renders in the strip when earned and is absent otherwise; one tap lands the exact context", async () => {
    const onTalk = vi.fn();
    await render(
      <ThreadShell
        name="Bea"
        initials="B"
        nextPlanFact={FACT({ state: "action" })}
        messages={[]}
        plansById={new Map()}
        composerPlaceholder="Message Bea"
        opalDoorway={CTX}
        onTalkToOpal={onTalk}
      />,
    );
    const strip = q('[data-testid="next-together-strip"]')!;
    const btn = q('[data-testid="opal-doorway"]')!;
    expect(strip.contains(btn)).toBe(true);
    expect(btn.textContent).toContain("Talk to Opal about this plan");
    await click(btn);
    expect(onTalk).toHaveBeenCalledWith(CTX);
  });

  it("no doorway element at all when the host derivation is null", async () => {
    await render(
      <ThreadShell
        name="Bea"
        initials="B"
        nextPlanFact={FACT({ state: "ready" })}
        messages={[]}
        plansById={new Map()}
        composerPlaceholder="Message Bea"
        opalDoorway={null}
        onTalkToOpal={vi.fn()}
      />,
    );
    expect(q('[data-testid="opal-doorway"]')).toBeNull();
  });
});

/* ---------------- Context chip / quick-draw ---------------- */

describe("R19 scoped Opal conversation: visible context, two-way door", () => {
  it("the chip names plan + person and navigates BACK to the person thread", async () => {
    const onBack = vi.fn();
    const onIndex = vi.fn();
    await render(
      <CenterChat
        title="Dinner chat"
        messages={[]}
        plansById={new Map()}
        context={CTX}
        onOpenPersonThread={onBack}
        onOpenOpalChats={onIndex}
      />,
    );
    const chip = q('[data-testid="opal-context-chip"]')!;
    expect(chip.textContent).toContain("Dinner at Juniper");
    expect(chip.textContent).toContain("Bea");
    await click(q('[data-testid="opal-context-open-thread"]')!);
    expect(onBack).toHaveBeenCalledWith(CTX);
    await click(q('[data-testid="opal-context-open-index"]')!);
    expect(onIndex).toHaveBeenCalledWith(CTX);
  });

  it("an unscoped Opal chat renders no chip (honest absence)", async () => {
    await render(<CenterChat title="Opal" messages={[]} plansById={new Map()} />);
    expect(q('[data-testid="opal-context-chip"]')).toBeNull();
  });

  it("round trip in two taps: thread doorway -> Opal chip -> back to thread", async () => {
    const landed: OpalConversationContext[] = [];
    const back: OpalConversationContext[] = [];
    await render(
      <ThreadShell
        name="Bea"
        initials="B"
        nextPlanFact={FACT({ state: "action" })}
        messages={[]}
        plansById={new Map()}
        composerPlaceholder="Message Bea"
        opalDoorway={CTX}
        onTalkToOpal={(c) => landed.push(c)}
      />,
    );
    await click(q('[data-testid="opal-doorway"]')!); // tap 1: thread -> Opal
    expect(landed).toEqual([CTX]);
    await render(
      <CenterChat
        title="Dinner chat"
        messages={[]}
        plansById={new Map()}
        context={landed[0]}
        onOpenPersonThread={(c) => back.push(c)}
      />,
    );
    await click(q('[data-testid="opal-context-open-thread"]')!); // tap 1 back
    expect(back).toEqual([CTX]);
  });
});

/* ---------------- Orbit log ---------------- */

const personAnchor = (id: string, label: string): OpalAnchor => ({ type: "person", id, label });
const LOG_ROWS: PersonOpalSessionRow[] = [
  ROW({ id: "live", title: "Live chat", isActive: true, updatedAt: "2026-10-18T12:00:00Z" }),
  ROW({
    id: "pin1", title: "Pinned old", pinned: true, pinnedAt: "2026-10-17T09:00:00Z",
    updatedAt: "2026-10-10T09:00:00Z",
    context: { personId: "user-b", personName: "Bea" }, anchor: personAnchor("user-b", "Bea"),
  }),
  ROW({
    id: "bx1", title: "Bea one", preview: "bx1 latest", updatedAt: "2026-10-18T11:00:00Z",
    context: { personId: "user-b", personName: "Bea" }, anchor: personAnchor("user-b", "Bea"),
  }),
  ROW({
    id: "bx2", title: "Bea two", preview: "older", updatedAt: "2026-10-17T11:00:00Z",
    context: { personId: "user-b", personName: "Bea" }, anchor: personAnchor("user-b", "Bea"),
  }),
  ROW({
    id: "cy1", title: "Cy one", preview: "cy latest", updatedAt: "2026-10-16T11:00:00Z",
    context: { personId: "user-c", personName: "Cy" }, anchor: personAnchor("user-c", "Cy"),
  }),
  ROW({ id: "free1", title: "Free chat", updatedAt: "2026-10-15T11:00:00Z" }),
  ROW({
    id: "arch1", title: "Archived chat", userArchived: true, updatedAt: "2026-10-14T11:00:00Z",
    context: { personId: "user-b", personName: "Bea" }, anchor: personAnchor("user-b", "Bea"),
  }),
];

describe("R19 Orbits: the Center conversation log", () => {
  it("groups by anchor; continuing pinned; pin zone beats recency; archived held out", () => {
    const log = buildOrbitLog(LOG_ROWS);
    expect(log.continuing?.id).toBe("live");
    expect(log.pinned.map((r) => r.id)).toEqual(["pin1"]);
    expect(log.groups.map((g) => g.anchor.id)).toEqual(["user-b", "user-c"]);
    expect(log.groups[0].sessions.map((r) => r.id)).toEqual(["bx1", "bx2"]);
    expect(log.groups[0].latestPreview).toBe("bx1 latest");
    expect(log.unanchored.map((r) => r.id)).toEqual(["free1"]);
    expect(log.archived.map((r) => r.id)).toEqual(["arch1"]);
  });

  it("cross-anchor leakage is impossible in the index and orbit filters", () => {
    expect(sessionsForPerson(LOG_ROWS, "user-b").map((r) => r.id)).toEqual(["pin1", "bx1", "bx2", "arch1"]);
    expect(sessionsForPerson(LOG_ROWS, "user-c").map((r) => r.id)).toEqual(["cy1"]);
    expect(sessionsForAnchor(LOG_ROWS, personAnchor("user-c", "Cy")).map((r) => r.id)).toEqual(["cy1"]);
  });

  it("groups render COLLAPSED by default; a header tap expands only that orbit", async () => {
    await render(<CenterSessionList sessions={LOG_ROWS} onOpen={vi.fn()} />);
    expect(q('[data-testid="center-log-continuing"]')!.textContent).toContain("Live chat");
    expect(q('[data-testid="center-log-pinned"]')!.textContent).toContain("Pinned old");
    expect(host!.textContent).not.toContain("Bea one");
    const beaHeader = qa('[data-testid="orbit-group-header"]').find((h) =>
      h.textContent?.includes("Bea"),
    )!;
    expect(beaHeader.textContent).toContain("2");
    expect(beaHeader.textContent).toContain("bx1 latest");
    await click(beaHeader);
    expect(host!.textContent).toContain("Bea one");
    expect(host!.textContent).not.toContain("Cy one");
  });

  it("search crosses orbits + facets and opens the matching group", () => {
    const log = buildOrbitLog(LOG_ROWS, "cy");
    expect(log.groups.map((g) => g.anchor.id)).toEqual(["user-c"]);
  });

  it("a locked private orbit shows header only — no line, no count, no contents", async () => {
    const rows = LOG_ROWS.map((r) =>
      r.id === "cy1" ? { ...r, anchor: { ...personAnchor("user-c", "Cy"), private: true } } : r,
    );
    const requestUnlock = vi.fn();
    await render(
      <CenterSessionList
        sessions={rows}
        onOpen={vi.fn()}
        orbitGate={{ isUnlocked: () => false, requestUnlock }}
      />,
    );
    const cyHeader = qa('[data-testid="orbit-group-header"]').find((h) =>
      h.textContent?.includes("Cy"),
    )!;
    expect(cyHeader.textContent).toContain("Private");
    expect(cyHeader.textContent).not.toContain("cy latest");
    await click(cyHeader);
    expect(requestUnlock).toHaveBeenCalledWith("person:user-c");
    expect(host!.textContent).not.toContain("Cy one");
  });

  it("the rail is the SAME log: identical grouping from both presentations", async () => {
    const keys = (rootEl: HTMLElement) =>
      [...rootEl.querySelectorAll('[data-testid="orbit-group"]')].map((g) =>
        g.getAttribute("data-anchor-key"),
      );
    await render(<CenterSessionList sessions={LOG_ROWS} onOpen={vi.fn()} />);
    const logKeys = keys(host!);
    const logContinuing = q('[data-testid="center-log-continuing"] [data-testid="center-session-row"]')?.getAttribute("data-session-id");
    await render(
      <ConversationRail sessions={LOG_ROWS} onOpen={vi.fn()} onClose={vi.fn()} />,
    );
    expect(keys(host!)).toEqual(logKeys);
    expect(q('[data-testid="center-log-continuing"] [data-testid="center-session-row"]')?.getAttribute("data-session-id")).toBe(logContinuing);
  });

  it("from Center, a conversation about X is at most 2 taps away (rail -> row)", async () => {
    const onOpen = vi.fn();
    await render(
      <ConversationRail sessions={LOG_ROWS} onOpen={onOpen} onClose={vi.fn()} />,
    );
    // Rail is already open (tap 1 was the navigator). Expand + tap = tap 2 total from the chat.
    const cyHeader = qa('[data-testid="orbit-group-header"]').find((h) =>
      h.textContent?.includes("Cy"),
    )!;
    await click(cyHeader);
    const rowBtn = qa('[data-testid="center-session-row"]').find((b) =>
      b.textContent?.includes("Cy one"),
    )!;
    await click(rowBtn);
    expect(onOpen).toHaveBeenCalledWith("cy1");
  });
});

/* ---------------- Orbit sheet ---------------- */

describe("R19 Orbits: the orbit sheet operations", () => {
  const sheetSessions = [
    ROW({ id: "os1", title: "Older chat", updatedAt: "2026-10-17T10:00:00Z" }),
    ROW({ id: "os2", title: "Pinned chat", pinned: true, updatedAt: "2026-10-16T10:00:00Z" }),
  ];

  it("lists plans + conversations (pinned first), opens, starts new", async () => {
    const onOpen = vi.fn();
    const onStart = vi.fn();
    await render(
      <OrbitSheet
        anchor={personAnchor("user-b", "Bea")}
        context={CTX}
        plans={[{ id: "plan-a", title: "Dinner at Juniper", line: "Saturday 7:30 PM" }]}
        sessions={sheetSessions}
        onOpen={onOpen}
        onStartNew={onStart}
        onRemove={vi.fn()}
        onOpenPlan={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(q('[data-testid="orbit-sheet-plans"]')!.textContent).toContain("Dinner at Juniper");
    const rows = qa('[data-testid="orbit-sheet-row"]');
    expect(rows[0].getAttribute("data-session-id")).toBe("os2"); // pinned first
    await click(qa('[data-testid="orbit-sheet-open-row"]')[1]);
    expect(onOpen).toHaveBeenCalledWith("os1");
    await click(q('[data-testid="orbit-sheet-new"]')!);
    expect(onStart).toHaveBeenCalled();
  });

  it("archive is the one archive: the sheet's archive calls the shared handler", async () => {
    const onArchive = vi.fn();
    await render(
      <OrbitSheet
        anchor={personAnchor("user-b", "Bea")}
        sessions={sheetSessions}
        onOpen={vi.fn()}
        onStartNew={vi.fn()}
        onRemove={vi.fn()}
        onArchive={onArchive}
        onClose={vi.fn()}
      />,
    );
    await click(qa('[data-testid="orbit-sheet-archive"]')[0]);
    // Rows render pinned-first, so the first archive button is os2's.
    expect(onArchive).toHaveBeenCalledWith("os2", true);
  });

  it("remove requires the plain confirmation, which states the thread/plan safety", async () => {
    const onRemove = vi.fn();
    await render(
      <OrbitSheet
        anchor={personAnchor("user-b", "Bea")}
        sessions={sheetSessions}
        onOpen={vi.fn()}
        onStartNew={vi.fn()}
        onRemove={onRemove}
        onClose={vi.fn()}
      />,
    );
    const os1Row = qa('[data-testid="orbit-sheet-row"]').find(
      (r) => r.getAttribute("data-session-id") === "os1",
    )!;
    await click(os1Row.querySelector('[data-testid="orbit-sheet-remove"]')!);
    expect(onRemove).not.toHaveBeenCalled();
    const confirm = q('[data-testid="orbit-sheet-confirm"]')!;
    expect(confirm.textContent).toContain("person thread and any plans stay exactly as they are");
    await click(q('[data-testid="orbit-sheet-confirm-remove"]')!);
    expect(onRemove).toHaveBeenCalledWith("os1");
  });

  it("the privacy toggle flips the orbit flag through its handler", async () => {
    const onToggle = vi.fn();
    await render(
      <OrbitSheet
        anchor={personAnchor("user-b", "Bea")}
        sessions={sheetSessions}
        onOpen={vi.fn()}
        onStartNew={vi.fn()}
        onRemove={vi.fn()}
        onTogglePrivate={onToggle}
        onClose={vi.fn()}
      />,
    );
    await click(q('[data-testid="orbit-sheet-private-toggle"]')!);
    expect(onToggle).toHaveBeenCalledWith(true);
  });
});

/* ---------------- Chrome ---------------- */

describe("R19 chrome: glass overflow, navigator, rename/pin/share/delete", () => {
  const chromeProps = (over: Record<string, unknown> = {}) => ({
    onOpenRail: vi.fn(),
    onRename: vi.fn(),
    onTogglePin: vi.fn(),
    onToggleArchive: vi.fn(),
    onShare: vi.fn(),
    onDelete: vi.fn(),
    ...over,
  });

  it("the overflow is a glass circle; its menu holds only real actions", async () => {
    await render(
      <CenterChat title="Dinner chat" messages={[]} plansById={new Map()} chrome={chromeProps()} />,
    );
    const btn = q('[data-testid="center-chat-overflow"]')!;
    expect(btn.className).toContain("c1-glass");
    expect(q('[data-testid="center-chat-navigator"]')).not.toBeNull();
    await click(btn);
    for (const id of ["rename", "pin", "archive", "share", "delete"]) {
      expect(q(`[data-testid="center-chat-menu-${id}"]`)).not.toBeNull();
    }
  });

  it("rename in the menu calls the one rename write with the typed title", async () => {
    const chrome = chromeProps();
    await render(<CenterChat title="Old title" messages={[]} plansById={new Map()} chrome={chrome} />);
    await click(q('[data-testid="center-chat-overflow"]')!);
    await click(q('[data-testid="center-chat-menu-rename"]')!);
    const input = q('[data-testid="center-chat-rename-input"]') as HTMLInputElement;
    await typeInto(input, "Weekend plans");
    await click(q('[data-testid="center-chat-rename-save"]')!);
    expect(chrome.onRename).toHaveBeenCalledWith("Weekend plans");
  });

  it("rename propagation: one renamed summary re-renders the new title in log AND sheet", async () => {
    const v1 = summaryToRow({ id: "s1", title: "Old title", active: false } as OpalChatSessionSummary);
    const v2 = summaryToRow({ id: "s1", title: "Weekend plans", active: false } as OpalChatSessionSummary);
    await render(<CenterSessionList sessions={[v1]} onOpen={vi.fn()} />);
    expect(host!.textContent).toContain("Old title");
    await render(
      <OrbitSheet
        anchor={personAnchor("user-b", "Bea")}
        sessions={[v2]}
        onOpen={vi.fn()}
        onStartNew={vi.fn()}
        onRemove={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(host!.textContent).toContain("Weekend plans");
    expect(host!.textContent).not.toContain("Old title");
  });

  it("pin toggles from the menu; delete needs its confirmation first", async () => {
    const chrome = chromeProps();
    await render(<CenterChat title="Dinner chat" messages={[]} plansById={new Map()} chrome={chrome} />);
    await click(q('[data-testid="center-chat-overflow"]')!);
    await click(q('[data-testid="center-chat-menu-pin"]')!);
    expect(chrome.onTogglePin).toHaveBeenCalled();
    await click(q('[data-testid="center-chat-overflow"]')!);
    await click(q('[data-testid="center-chat-menu-delete"]')!);
    expect(chrome.onDelete).not.toHaveBeenCalled();
    expect(q('[data-testid="center-chat-delete-confirm"]')!.textContent).toContain(
      "person thread and any plans stay exactly as they are",
    );
    await click(q('[data-testid="center-chat-delete-confirm-btn"]')!);
    expect(chrome.onDelete).toHaveBeenCalled();
    await click(q('[data-testid="center-chat-overflow"]')!);
    await click(q('[data-testid="center-chat-menu-share"]')!);
    expect(chrome.onShare).toHaveBeenCalled();
  });

  it("navigator tap opens the rail (host callback)", async () => {
    const chrome = chromeProps();
    await render(<CenterChat title="Dinner chat" messages={[]} plansById={new Map()} chrome={chrome} />);
    await click(q('[data-testid="center-chat-navigator"]')!);
    expect(chrome.onOpenRail).toHaveBeenCalled();
  });

  it("with no chrome handlers there is no overflow and no navigator (no dead chrome)", async () => {
    await render(<CenterChat title="Plain" messages={[]} plansById={new Map()} />);
    expect(q('[data-testid="center-chat-overflow"]')).toBeNull();
    expect(q('[data-testid="center-chat-navigator"]')).toBeNull();
  });
});

/* ---------------- Anchor proposals / split / undo ---------------- */

describe("R19 Orbits: anchoring is proposed, never silently filed", () => {
  const proposal = {
    anchor: personAnchor("user-b", "Bea"),
    reason: "snapshot",
  };

  it("detection reads the latest snapshot name and resolves it uniquely; ambiguity proposes nothing", () => {
    const raw = [
      { id: "1", conversation_id: "oc", role: "user", body: "plan dinner with Bea" },
      {
        id: "2", conversation_id: "oc", role: "opal", body: "ok",
        metadata: { context_snapshot: { who: "Bea" } },
      },
    ] as unknown as OpalChatMessage[];
    expect(anchorProposalFromMessages(raw, [
      { contact_user_id: "user-b", display_name: "Bea" },
    ])?.anchor.id).toBe("user-b");
    expect(
      anchorProposalFromMessages(raw, [
        { contact_user_id: "user-b", display_name: "Bea" },
        { contact_user_id: "user-b2", display_name: "Bea" },
      ]),
    ).toBeNull();
    expect(anchorProposalFromMessages(raw, [])).toBeNull();
  });

  it("the proposal chip offers accept + redirect; undo rides the notice", async () => {
    const onAccept = vi.fn();
    const onPick = vi.fn();
    const onUndo = vi.fn();
    await render(
      <CenterChat
        title="Chat"
        messages={[]}
        plansById={new Map()}
        chrome={{
          anchorProposal: proposal,
          onAcceptAnchor: onAccept,
          anchorCandidates: [personAnchor("user-c", "Cy")],
          onPickAnchor: onPick,
          anchorNotice: "Filed under Bea.",
          onUndoAnchor: onUndo,
          onDismissAnchorNotice: vi.fn(),
        }}
      />,
    );
    expect(q('[data-testid="anchor-proposal"]')!.textContent).toContain("About Bea?");
    await click(q('[data-testid="anchor-proposal-accept"]')!);
    expect(onAccept).toHaveBeenCalledWith(proposal);
    await click(q('[data-testid="anchor-proposal-redirect"]')!);
    await click(q('[data-testid="anchor-picker-unanchored"]')!);
    expect(onPick).toHaveBeenCalledWith(null);
    await click(q('[data-testid="anchor-undo"]')!);
    expect(onUndo).toHaveBeenCalled();
  });

  it("a split offer appears on drift and never moves the chat itself", async () => {
    const onSplit = vi.fn();
    await render(
      <CenterChat
        title="Chat"
        messages={[]}
        plansById={new Map()}
        chrome={{ splitProposal: proposal, onSplit, onDismissSplit: vi.fn() }}
      />,
    );
    const el = q('[data-testid="split-proposal"]')!;
    expect(el.textContent).toContain("This chat stays where it is");
    await click(q('[data-testid="split-proposal-accept"]')!);
    expect(onSplit).toHaveBeenCalledWith(proposal);
  });
});

/* ---------------- Host adapters: scoping ---------------- */

describe("R19 host adapters: doorway target + dyad person", () => {
  const summary = (over: Partial<OpalChatSessionSummary> = {}): OpalChatSessionSummary => ({
    id: "sx",
    title: "t",
    active: false,
    context: { person_id: "user-b", plan_id: "plan-a" },
    ...over,
  });

  it("the doorway target matches person AND plan exactly", () => {
    expect(doorwayTargetSessionId([summary()], CTX)).toBe("sx");
    expect(doorwayTargetSessionId([summary({ context: { person_id: "user-b", plan_id: "plan-b" } })], CTX)).toBeNull();
    expect(doorwayTargetSessionId([summary({ context: { person_id: "user-c", plan_id: "plan-a" } })], CTX)).toBeNull();
    expect(doorwayTargetSessionId([summary({ context: { person_id: "user-b" } })], CTX)).toBeNull();
  });

  it("a dyad has exactly one person to scope to; a group has none", () => {
    expect(dyadPersonOf({ peers: [{ id: "user-b", display_name: "Bea" }] })).toEqual({
      personId: "user-b",
      personName: "Bea",
    });
    expect(
      dyadPersonOf({ peers: [{ id: "user-b", display_name: "Bea" }, { id: "user-c", display_name: "Cy" }] }),
    ).toBeNull();
    expect(dyadPersonOf({ peers: [] })).toBeNull();
  });

  it("summaryToRow carries anchor, pin, and archive truth verbatim", () => {
    const row = summaryToRow(
      summary({
        anchor: { type: "plan", id: "plan-a", label: "Dinner", private: true },
        pinned: true,
        user_archived: true,
      }),
    );
    expect(row.anchor).toEqual({ type: "plan", id: "plan-a", label: "Dinner", private: true });
    expect(row.pinned).toBe(true);
    expect(row.userArchived).toBe(true);
    expect(row.context?.personId).toBe("user-b");
  });
});

/* ---------------- Glass discipline ---------------- */

describe("R19 frosted glass: chrome gets frost, readability stays solid", () => {
  const css = readFileSync(
    resolve(__dirname, "../../opalUi/c1/c1.css"),
    "utf8",
  );

  it("one glass token pair exists and the glass class consumes it", () => {
    expect(css).toContain("--opal-glass-tint");
    expect(css).toContain("--opal-glass-blur");
    expect(css).toContain("backdrop-filter: blur(var(--opal-glass-blur))");
  });

  it("the Next Together strip and plan-awareness carry NO backdrop blur", () => {
    const stripRule = css.slice(css.indexOf(".c1-next-strip"), css.indexOf(".c1-next-strip") + 220);
    expect(stripRule).not.toContain("backdrop-filter");
    const awareness = readFileSync(resolve(__dirname, "./PlanAwareness.css"), "utf8");
    expect(awareness).not.toContain("backdrop-filter");
  });
});
