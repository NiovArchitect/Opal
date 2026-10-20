/**
 * @vitest-environment jsdom
 *
 * Repair #19 FIX-B — the blind-spot fix proofs:
 * - BS-02: a locked private orbit reveals NOTHING before passcode
 *   verification; a failed verification keeps it locked with an
 *   honest message; a successful one unlocks. With no passcode set,
 *   the gate offers to set one instead of unlocking against nothing.
 * - BS-08: the conversation rail, the orbit sheet, and the
 *   conversation overflow menu each close on Escape, take focus on
 *   open, and return focus to the invoking control on close; the
 *   menu also closes on an outside pointer-down.
 * - BS-11: conversation Share opens the share sheet (W13 card law);
 *   Copy places the card's honest detail lines — never the old
 *   unresolvable "Opal chat: <title> (<anchor>)" reference, never a
 *   fabricated URL, never via navigator.share.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listOpalChatSessions = vi.fn();
const getOpalChatSession = vi.fn();
const createOpalChatSession = vi.fn();
const listReveals = vi.fn();
const listRelationships = vi.fn();
const getGraphLock = vi.fn();
const setGraphLock = vi.fn();
const verifyOrbitLock = vi.fn();

vi.mock("../../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../../api/productClient")>(
    "../../api/productClient",
  );
  return {
    ...actual,
    listOpalChatSessions: (...a: unknown[]) => listOpalChatSessions(...a),
    getOpalChatSession: (...a: unknown[]) => getOpalChatSession(...a),
    createOpalChatSession: (...a: unknown[]) => createOpalChatSession(...a),
    listReveals: (...a: unknown[]) => listReveals(...a),
    listRelationships: (...a: unknown[]) => listRelationships(...a),
    getGraphLock: (...a: unknown[]) => getGraphLock(...a),
    setGraphLock: (...a: unknown[]) => setGraphLock(...a),
    verifyOrbitLock: (...a: unknown[]) => verifyOrbitLock(...a),
  };
});

import { CenterHost, conversationShareCard } from "./C1ShellHosts";
import { CenterChat, ConversationRail } from "../../opalUi/c1/C1Surfaces";
import { OrbitSheet } from "../../opalUi/c1/OrbitSheet";
import type { OpalPlanContract } from "../../api/productClient";
import type { PersonOpalSessionRow } from "../../opalUi/c1/opalChatScope";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;

async function render(node: React.ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(node);
  });
  return host;
}

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  host?.remove();
  host = null;
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

const q = (s: string) => document.querySelector(s);
async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}
async function click(el: Element) {
  await act(async () => {
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
}
function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
}
async function escapeKey() {
  await act(async () => {
    document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
}

const OPENING = {
  greeting: "Good evening.",
  nudgeLine: null,
  presence: "idle" as const,
  celebrateOnce: false,
  needsYou: [],
  next: null,
  comingUp: [],
  forming: [],
};
const OPENING_EVENTS = {
  openGraph: vi.fn(),
  makeSomethingHappen: vi.fn(),
  completeSlot: vi.fn(),
};

const PRIVATE_SESSIONS = {
  conversations: [
    {
      id: "o1",
      title: "Cy secret one",
      last_message_preview: "cy latest secret",
      updated_at: "2026-10-18T19:00:00Z",
      anchor: { type: "person", id: "user-c", label: "Cy", private: true },
    },
  ],
};

function mockHostWorld() {
  listReveals.mockResolvedValue({ items: [] });
  listRelationships.mockResolvedValue({ contacts: [] });
  listOpalChatSessions.mockResolvedValue(PRIVATE_SESSIONS);
  getOpalChatSession.mockResolvedValue({
    conversation: {
      id: "o1",
      title: "Cy secret one",
      messages: [],
      anchor: { type: "person", id: "user-c", label: "Cy", private: true },
    },
  });
  getGraphLock.mockResolvedValue({ passcode_set: true });
  setGraphLock.mockResolvedValue({ ok: true, passcode_set: true });
  verifyOrbitLock.mockImplementation(
    async (anchorType: string, anchorId: string, code: string) => {
      // The JA-01 contract: the host must thread the prompt's
      // anchor (person user-c) with the code.
      if (anchorType === "person" && anchorId === "user-c" && code === "2468")
        return { unlocked: true };
      throw new Error("403 wrong_code");
    },
  );
}

async function renderCenterToList() {
  await render(
    <CenterHost
      bearer="tok"
      opening={OPENING}
      openingEvents={OPENING_EVENTS}
      plans={[]}
      onOpenGraph={vi.fn()}
    />,
  );
  await click(q('[data-testid="c2-opening-talk"]')!);
  await flush();
  await click(q('[aria-label="Back to chats"]')!);
  await flush();
  expect(q('[data-testid="center-session-list"]')).toBeTruthy();
}

describe("BS-02 — the orbit gate verifies before it reveals", () => {
  beforeEach(mockHostWorld);

  it("locked orbit reveals nothing pre-verification; wrong code stays locked; right code unlocks", async () => {
    await renderCenterToList();
    const header = q('[data-testid="orbit-group-header"]')!;
    expect(header.textContent).toContain("Opal chats hidden");
    expect(document.body.textContent).not.toContain("Cy secret one");
    expect(document.body.textContent).not.toContain("cy latest secret");

    // Tapping the locked header opens the passcode prompt — and
    // reveals nothing yet.
    await click(header);
    await flush();
    expect(q('[data-testid="orbit-unlock-prompt"]')).toBeTruthy();
    expect(document.body.textContent).not.toContain("cy latest secret");
    expect(verifyOrbitLock).not.toHaveBeenCalled();

    // Wrong code: honest failure line, prompt stays, orbit stays shut.
    typeInto(q('[data-testid="orbit-unlock-code"]') as HTMLInputElement, "1111");
    await click(q('[data-testid="orbit-unlock-submit"]')!);
    await flush();
    expect(verifyOrbitLock).toHaveBeenCalledWith("person", "user-c", "1111", "tok");
    expect(q('[data-testid="orbit-unlock-error"]')?.textContent).toContain(
      "That code did not open it.",
    );
    expect(q('[data-testid="orbit-unlock-prompt"]')).toBeTruthy();
    expect(document.body.textContent).not.toContain("cy latest secret");

    // Right code: the prompt closes and the orbit's own lines appear.
    typeInto(q('[data-testid="orbit-unlock-code"]') as HTMLInputElement, "2468");
    await click(q('[data-testid="orbit-unlock-submit"]')!);
    await flush();
    expect(q('[data-testid="orbit-unlock-prompt"]')).toBeNull();
    expect(document.body.textContent).toContain("cy latest secret");
    await click(q('[data-testid="orbit-group-header"]')!);
    await flush();
    expect(document.body.textContent).toContain("Cy secret one");
  });

  it("no passcode set: the prompt offers to set one instead of unlocking against nothing", async () => {
    getGraphLock.mockResolvedValue({ passcode_set: false });
    await renderCenterToList();
    await click(q('[data-testid="orbit-group-header"]')!);
    await flush();
    expect(q('[data-testid="orbit-unlock-prompt"]')?.textContent).toContain(
      "No passcode is set yet",
    );
    expect(verifyOrbitLock).not.toHaveBeenCalled();
    typeInto(q('[data-testid="orbit-unlock-code"]') as HTMLInputElement, "4321");
    await click(q('[data-testid="orbit-unlock-submit"]')!);
    await flush();
    expect(setGraphLock).toHaveBeenCalledWith("4321", "tok");
    expect(verifyOrbitLock).not.toHaveBeenCalled();
    expect(q('[data-testid="orbit-unlock-prompt"]')).toBeNull();
    expect(document.body.textContent).toContain("cy latest secret");
  });
});

describe("BS-08 — chrome dismissal and focus", () => {
  const row = (id: string, title: string): PersonOpalSessionRow => ({
    id,
    title,
    preview: "p",
    timeLabel: "1h",
    isActive: false,
    context: null,
    anchor: null,
    updatedAt: null,
    pinned: false,
    pinnedAt: null,
    userArchived: false,
  });

  it("overflow menu: Escape closes it and focus returns to the overflow button; outside pointer-down closes it too", async () => {
    const chrome = {
      pinned: false,
      onRename: vi.fn(),
      onTogglePin: vi.fn(),
      onToggleArchive: vi.fn(),
      onShare: vi.fn(),
      onDelete: vi.fn(),
    };
    await render(
      <CenterChat title="Chat" messages={[]} plansById={new Map()} chrome={chrome} />,
    );
    const overflow = q('[data-testid="center-chat-overflow"]') as HTMLButtonElement;
    overflow.focus();
    await click(overflow);
    expect(q('[data-testid="center-chat-overflow-menu"]')).toBeTruthy();
    // Focus moved into the menu on open.
    expect(document.activeElement?.getAttribute("data-testid")).toBe("center-chat-menu-rename");

    await escapeKey();
    expect(q('[data-testid="center-chat-overflow-menu"]')).toBeNull();
    expect(document.activeElement).toBe(overflow);

    // Reopen, then dismiss with an outside pointer-down.
    await click(overflow);
    expect(q('[data-testid="center-chat-overflow-menu"]')).toBeTruthy();
    await act(async () => {
      document.body.dispatchEvent(new window.MouseEvent("pointerdown", { bubbles: true }));
    });
    expect(q('[data-testid="center-chat-overflow-menu"]')).toBeNull();
    expect(document.activeElement).toBe(overflow);
  });

  it("conversation rail: Escape closes it and focus returns to the invoking control", async () => {
    function Harness() {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button type="button" data-testid="rail-trigger" onClick={() => setOpen(true)}>
            All conversations
          </button>
          {open ? (
            <ConversationRail sessions={[row("s1", "One")]} onClose={() => setOpen(false)} />
          ) : null}
        </>
      );
    }
    await render(<Harness />);
    const trigger = q('[data-testid="rail-trigger"]') as HTMLButtonElement;
    trigger.focus();
    await click(trigger);
    expect(q('[data-testid="conversation-rail"]')).toBeTruthy();
    expect(document.activeElement?.getAttribute("data-testid")).toBe("conversation-rail-close");
    await escapeKey();
    expect(q('[data-testid="conversation-rail"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("orbit sheet: Escape closes it and focus returns to the invoking control", async () => {
    function Harness() {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button type="button" data-testid="sheet-trigger" onClick={() => setOpen(true)}>
            Open orbit
          </button>
          {open ? (
            <OrbitSheet
              anchor={{ type: "person", id: "user-c", label: "Cy" }}
              sessions={[row("s1", "One")]}
              onOpen={vi.fn()}
              onStartNew={vi.fn()}
              onRemove={vi.fn()}
              onClose={() => setOpen(false)}
            />
          ) : null}
        </>
      );
    }
    await render(<Harness />);
    const trigger = q('[data-testid="sheet-trigger"]') as HTMLButtonElement;
    trigger.focus();
    await click(trigger);
    expect(q('[data-testid="orbit-sheet"]')).toBeTruthy();
    expect((document.activeElement as HTMLElement)?.dataset?.testid).toBe(
      "orbit-sheet-open-row",
    );
    await escapeKey();
    expect(q('[data-testid="orbit-sheet"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});

describe("BS-11 — conversation Share is honest", () => {
  const plan: OpalPlanContract = {
    id: "plan-1",
    title: "Dinner at Juniper & Ivy",
    status: "agreed",
    location: "Juniper & Ivy",
    time_label: "Saturday · 7:30 PM",
  };

  beforeEach(() => {
    mockHostWorld();
    listOpalChatSessions.mockResolvedValue({
      conversations: [
        {
          id: "c1",
          title: "Dinner plans",
          active: true,
          updated_at: "2026-10-18T19:00:00Z",
          anchor: { type: "plan", id: "plan-1", label: "Dinner at Juniper & Ivy" },
        },
      ],
    });
    getOpalChatSession.mockResolvedValue({
      conversation: {
        id: "c1",
        title: "Dinner plans",
        messages: [],
        anchor: { type: "plan", id: "plan-1", label: "Dinner at Juniper & Ivy" },
      },
    });
  });

  it("Share opens the share sheet; Copy places honest card lines — no dead reference, no URL, no navigator.share", async () => {
    const shareSpy = vi.fn(async () => {});
    const writeText = vi.fn(async () => {});
    (window.navigator as unknown as { share?: unknown }).share = shareSpy;
    (window.navigator as unknown as { clipboard?: unknown }).clipboard = { writeText };

    await render(
      <CenterHost
        bearer="tok"
        opening={OPENING}
        openingEvents={OPENING_EVENTS}
        plans={[plan]}
        onOpenGraph={vi.fn()}
      />,
    );
    await click(q('[data-testid="c2-opening-talk"]')!);
    await flush();
    expect(q('[data-testid="center-chat"]')).toBeTruthy();

    await click(q('[data-testid="center-chat-overflow"]')!);
    await click(q('[data-testid="center-chat-menu-share"]')!);
    await flush();

    expect(q('[data-testid="conversation-share-sheet"]')).toBeTruthy();
    expect(q('[data-testid="conversation-share-card"]')?.textContent).toContain("Dinner plans");
    expect(q('[data-testid="conversation-share-card"]')?.textContent).toContain(
      "Dinner at Juniper & Ivy",
    );
    expect(shareSpy).not.toHaveBeenCalled();

    await click(q('[data-testid="conversation-share-copy"]')!);
    await flush();
    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toContain("Opal chat: Dinner plans");
    expect(copied).toContain("Filed under Dinner at Juniper & Ivy");
    expect(copied).toContain("Saturday · 7:30 PM");
    expect(copied).toContain("stays private to its account");
    expect(copied).not.toContain("http");
    expect(copied).not.toMatch(/^Opal chat: .+\(.+\)$/);
    expect(q('[data-testid="conversation-share-note"]')?.textContent).toContain("Copied.");
  });

  it("the adapter's text lines carry no URL and no bare reference form", () => {
    const card = conversationShareCard({ title: "Loose chat", anchor: null, anchorPlan: null });
    expect(card.textLines.join("\n")).not.toContain("http");
    expect(card.textLines[0]).toBe("Opal chat: Loose chat");
    expect(card.anchorLine).toBeNull();
    expect(card.plan).toBeNull();
  });
});
