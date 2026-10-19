/**
 * @vitest-environment node
 *
 * Repair #19 W20 (JA-03) — SERVED-BREADTH measurement for the
 * chats-list in-row plan cards.
 *
 * W5-06 was "proven" twice at component breadth (the isolated card
 * is width:100% — of whatever column the host gives it) while the
 * real list starved the column: avatar 48px + a ~102px long-form
 * timestamp column left the card ~142px inside a 350px row. This
 * test therefore measures the REAL list composition — the actual
 * PeopleChatsList component (avatar + timestamp present), the
 * actual production stylesheets in served order, laid out by a
 * real Chromium at the founder's 390×844 frame.
 *
 * Contract (W5-06 grammar): the in-row card spans the row's full
 * CONTENT width, and its title line measures ≥ 200px.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";
import { chromium } from "playwright-core";
import { describe, expect, it } from "vitest";

import { PeopleChatsList, type PeopleChatSummary } from "./C1Surfaces";
import type { RevealItem } from "../../api/productClient";

const WEB_ROOT = resolve(__dirname, "../../..");

/** The production sheets that govern this surface, in served order. */
const SHEETS = [
  "src/theme/layerTokens.css",
  "src/theme/c2Tokens.css",
  "src/opalUi/c1/c1.css",
  "src/opalUi/c1/RevealCard.css",
  "src/opalUi/c1/PlanAwareness.css",
  "src/theme/unifyChats.css",
];

function chromiumPath(): string {
  const base = resolve(homedir(), ".cache/ms-playwright");
  return resolve(
    base,
    "chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell",
  );
}

const REVEAL: RevealItem = {
  reveal_key: "plan:p1:needs-answer",
  category: "P1",
  kicker: "YOUR MOVE",
  title: "Plan with Ethan Walker",
  substance: "Saturday · 7:30 PM · Juniper & Ivy",
  plan_id: "p1",
  conversation_id: "c1",
  plan_state: "action",
  entity_tint: 2,
  action_label: "Confirm",
  lit: true,
};

const CHATS: PeopleChatSummary[] = [
  {
    id: "c1",
    name: "Ethan Walker",
    initials: "EW",
    preview: "Deal. I'll bring the blanket.",
    timeLabel: "Saturday 7:30 PM",
    unread: true,
    plan: null,
    reveal: REVEAL,
    entityTint: 2,
  },
  {
    id: "c2",
    name: "Maya Torres",
    initials: "MT",
    preview: "See you there!",
    timeLabel: "Yesterday 6:12 PM",
    unread: false,
    plan: null,
    nextPlan: {
      plan_id: "p2",
      title: "Brunch at Herb & Wood",
      when_label: "Sunday · 11:00 AM",
      where_label: "Herb & Wood",
      where_kind: "physical",
      status: "agreed",
      state: "ready",
      conversation_id: "c2",
    },
    entityTint: 4,
  },
];

describe("JA-03 — in-row cards at served breadth (real list, real CSS, Chromium 390px)", () => {
  it("the reveal card and plan-awareness card span the row's content width; titles ≥ 200px", async () => {
    const css = SHEETS.map((f) => readFileSync(resolve(WEB_ROOT, f), "utf8")).join("\n");
    const html = renderToString(
      <div data-design="r18">
        <PeopleChatsList chats={CHATS} onOpen={() => undefined} />
      </div>,
    );

    const browser = await chromium.launch({ executablePath: chromiumPath() });
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.setContent(
        `<!doctype html><html data-mode="dark"><head><meta charset="utf-8"><style>
          html, body { margin: 0; padding: 0; }
          ${css}
        </style></head><body>${html}</body></html>`,
      );

      const m = await page.evaluate(() => {
        const rect = (sel: string) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { width: r.width, height: r.height };
        };
        const rows = document.querySelectorAll('[data-testid="chats-row"]');
        const row = rows[0];
        const cs = getComputedStyle(row);
        const contentWidth =
          row.getBoundingClientRect().width -
          parseFloat(cs.paddingLeft) -
          parseFloat(cs.paddingRight);
        return {
          rowWidth: row.getBoundingClientRect().width,
          rowContentWidth: contentWidth,
          revealCard: rect('[data-testid="reveal-list-line"]'),
          revealTitle: rect(".reveal-row-title"),
          awarenessCard: rect('[data-testid="plan-awareness"]'),
          awarenessTitle: rect('[data-testid="plan-awareness-title"]'),
          avatar: rect(".c1-avatar"),
          time: rect(".c1-session-time"),
        };
      });

      // The composition really is the served one: avatar + a real
      // timestamp column are present beside the title line.
      expect(m.avatar?.width).toBe(48);
      expect(m.time?.width ?? 0).toBeGreaterThan(50);
      expect(m.rowWidth).toBeGreaterThan(330);

      // The defect measured 142px for the card / 114px for its
      // title. The fix: the card spans the row's content width.
      expect(m.revealCard).not.toBeNull();
      expect(m.revealCard!.width).toBeGreaterThanOrEqual(m.rowContentWidth - 1);
      expect(m.revealTitle!.width).toBeGreaterThanOrEqual(200);

      // The PlanAwareness row variant is covered by the same fix.
      expect(m.awarenessCard).not.toBeNull();
      expect(m.awarenessCard!.width).toBeGreaterThanOrEqual(m.rowContentWidth - 1);
      expect(m.awarenessTitle!.width).toBeGreaterThanOrEqual(200);
    } finally {
      await browser.close();
    }
  }, 60_000);
});
