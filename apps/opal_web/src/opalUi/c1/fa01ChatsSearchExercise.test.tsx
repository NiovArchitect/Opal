/**
 * @vitest-environment jsdom
 *
 * Repair #19 W25 (FA-01) — SERVED-BREADTH INPUT EXERCISE for the
 * Chats list search.
 *
 * W22 J4 charged the served Chats search ("Search people or
 * conversations") as a DEAD CONTROL: rendered with no value, no
 * onChange, no filter — typing "Jordan" left the full list on
 * screen. W10 had recorded the field as "present"; W20's sweep
 * read the DOM but never exercised an input. This pin is the
 * recurrence guard for that class: it renders the REAL served
 * PeopleChatsList component and TYPES into its search field,
 * asserting the behavior a user gets —
 *   1. typing a person name filters the rows to that person;
 *   2. typing plan text filters to the row carrying that plan;
 *   3. a query with no match shows the honest quiet empty line
 *      (and zero rows — never a fake result);
 *   4. clearing the field restores the full list, with the rows'
 *      plan-awareness cards intact (the filter composes with the
 *      list's existing row grammar; W5/W20 measurements untouched).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { PeopleChatsList, type PeopleChatSummary } from "./C1Surfaces";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const CHATS: PeopleChatSummary[] = [
  {
    id: "c-maya",
    name: "Maya Torres",
    initials: "MT",
    preview: "See you there!",
    timeLabel: "Yesterday 6:12 PM",
    unread: false,
    plan: null,
    nextPlan: {
      plan_id: "p2",
      title: "Dinner at Juniper and Ivy",
      when_label: "Saturday · 7:30 PM",
      where_label: "Juniper and Ivy",
      where_kind: "physical",
      status: "tentative",
      state: "forming",
      conversation_id: "c-maya",
    },
    entityTint: 4,
  },
  {
    id: "c-jordan",
    name: "Jordan Ellis",
    initials: "JE",
    preview: "The trailhead at eight, then coffee.",
    timeLabel: "Tuesday 9:02 AM",
    unread: true,
    plan: null,
  },
  {
    id: "c-crew",
    name: "Weekend Crew",
    initials: "WC",
    preview: "Priya: booking the cabin tonight",
    timeLabel: "Monday 8:40 PM",
    unread: false,
    plan: null,
  },
];

let host: HTMLDivElement | null = null;
let root: Root | null = null;

async function renderList() {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(
      <div data-design="r18">
        <PeopleChatsList chats={CHATS} onOpen={() => undefined} />
      </div>,
    );
  });
}

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  host?.remove();
  host = null;
  document.body.innerHTML = "";
});

const rows = () => [...document.querySelectorAll('[data-testid="chats-row"]')];
const rowNames = () =>
  rows().map((r) => r.querySelector(".c1-session-title")?.textContent ?? "");
const searchInput = () =>
  document.querySelector('[data-testid="chats-search"]') as HTMLInputElement;

function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
}

describe("FA-01 — the served Chats search is exercised, not just present", () => {
  it("typing filters by person name; plan text filters too; no-match is honest; clear restores", async () => {
    await renderList();

    // Full list first, plan-awareness card riding its row.
    expect(rows()).toHaveLength(3);
    expect(document.querySelector('[data-testid="plan-awareness"]')).toBeTruthy();

    // 1. Person name filters the rows in place.
    typeInto(searchInput(), "Jordan");
    expect(rowNames()).toEqual(["Jordan Ellis"]);
    expect(document.querySelector('[data-testid="chats-search-empty"]')).toBeNull();

    // 2. Plan text (the row's own next-plan fact) filters too.
    typeInto(searchInput(), "Juniper");
    expect(rowNames()).toEqual(["Maya Torres"]);
    expect(document.querySelector('[data-testid="plan-awareness"]')).toBeTruthy();

    // 3. Preview text is conversation text and filters as well.
    typeInto(searchInput(), "cabin");
    expect(rowNames()).toEqual(["Weekend Crew"]);

    // 4. No match: zero rows and the quiet honest empty line —
    //    never a fabricated result row.
    typeInto(searchInput(), "zzzz-no-such-person");
    expect(rows()).toHaveLength(0);
    const empty = document.querySelector('[data-testid="chats-search-empty"]');
    expect(empty).toBeTruthy();
    expect(empty!.textContent).toContain("No chat matches that search.");

    // 5. Clearing restores the full list, cards intact.
    typeInto(searchInput(), "");
    expect(rows()).toHaveLength(3);
    expect(rowNames()).toEqual(["Maya Torres", "Jordan Ellis", "Weekend Crew"]);
    expect(document.querySelector('[data-testid="chats-search-empty"]')).toBeNull();
    expect(document.querySelector('[data-testid="plan-awareness"]')).toBeTruthy();
  });

  it("the search input is a controlled field (value follows state)", async () => {
    await renderList();
    typeInto(searchInput(), "Maya");
    expect(searchInput().value).toBe("Maya");
  });
});
