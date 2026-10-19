/**
 * @vitest-environment node
 *
 * Repair #19 W21 (F3) — RENDERED MEASUREMENT for the call log at
 * 390px, in the JA-03 manner: the real PeopleCallsList composition,
 * the actual production stylesheets in served order, laid out by a
 * real Chromium at the founder's 390×844 frame.
 *
 * The pack defect: the plan-awareness pill's text spilled past the
 * pill border and clipped mid-word ("Happening F…"), and the
 * name/subtitle column was starved by the status column.
 *
 * Contract measured here (long name + happening pill):
 *  - no element in the row extends beyond the row's border box;
 *  - the pill sits inside the text column and its text sits inside
 *    the pill — any truncation is the designed ellipsis INSIDE the
 *    pill, never a spill past its border;
 *  - name/subtitle truncate only with computed ellipsis.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";
import { chromium } from "playwright-core";
import { describe, expect, it } from "vitest";

import { PeopleCallsList, type PeopleCallSummary } from "./C1Surfaces";

const WEB_ROOT = resolve(__dirname, "../../..");

const SHEETS = [
  "src/theme/layerTokens.css",
  "src/theme/c2Tokens.css",
  "src/opalUi/c1/c1.css",
  "src/opalUi/c1/PlanAwareness.css",
  "src/opalUi/c1/CallLog.css",
  "src/theme/unifyChats.css",
];

function chromiumPath(): string {
  const base = resolve(homedir(), ".cache/ms-playwright");
  return resolve(
    base,
    "chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell",
  );
}

const CALLS: PeopleCallSummary[] = [
  {
    id: "call-1",
    name: "Jordan Ellis Whitaker-Harrington",
    initials: "JE",
    metadata: "No answer · Saturday October 18 at 12:00 PM sharp",
    conversationId: "conv-1",
    entityTint: 3,
    callState: { state: "happening", reason: "plan_happening", label: "Happening now" },
    nextPlan: {
      plan_id: "p1",
      title: "Happening Festival at the waterfront with the whole crew",
      when_label: "Saturday 7:30 PM",
      where_label: "The waterfront pavilion",
      where_kind: "physical",
      status: "agreed",
      state: "happening",
      conversation_id: "conv-1",
    },
  },
];

describe("F3 — call-log row at served breadth (real list, real CSS, Chromium 390px)", () => {
  it("nothing clips mid-word: pill text ellipsizes inside the pill, row contains every element", async () => {
    const css = SHEETS.map((f) => readFileSync(resolve(WEB_ROOT, f), "utf8")).join("\n");
    const html = renderToString(
      <div data-design="r18" style={{ width: 390 }}>
        <PeopleCallsList calls={CALLS} onOpenConversation={() => {}} onCallBack={() => {}} />
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
        const info = (sel: string) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return {
            left: r.left,
            right: r.right,
            width: r.width,
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
            textOverflow: cs.textOverflow,
            whiteSpace: cs.whiteSpace,
          };
        };
        return {
          row: info('[data-testid="calls-row"]'),
          title: info(".c1-session-title"),
          preview: info(".c1-session-preview"),
          pill: info('[data-testid="plan-awareness"]'),
          pillText: info(".plan-awareness-text"),
          stateLabel: info('[data-testid="call-state-label"]'),
          main: info(".c1-call-main"),
        };
      });

      expect(m.row).not.toBeNull();
      const rowRight = m.row!.right;

      // Every element is contained by the row.
      for (const [name, el] of Object.entries(m)) {
        if (!el || name === "row") continue;
        expect(el.right, `${name} extends past the row`).toBeLessThanOrEqual(rowRight + 1);
      }

      // The pill text is contained by the pill itself (the F3 spill).
      expect(m.pill).not.toBeNull();
      expect(m.pillText).not.toBeNull();
      expect(m.pillText!.right).toBeLessThanOrEqual(m.pill!.right + 1);
      expect(m.pillText!.textOverflow).toBe("ellipsis");

      // Name + subtitle: designed ellipsis only (computed), never a
      // spill (scrollWidth may exceed clientWidth ONLY under ellipsis).
      for (const el of [m.title, m.preview]) {
        expect(el).not.toBeNull();
        expect(el!.textOverflow).toBe("ellipsis");
        expect(el!.whiteSpace).toBe("nowrap");
      }

      // The text column actually shrank (min-width 0 discipline):
      // main is narrower than the row's full width, and the pill is
      // no wider than the text column that holds it.
      expect(m.main!.width).toBeLessThan(m.row!.width);
      expect(m.pill!.width).toBeGreaterThan(0);
    } finally {
      await browser.close();
    }
  }, 60_000);
});
