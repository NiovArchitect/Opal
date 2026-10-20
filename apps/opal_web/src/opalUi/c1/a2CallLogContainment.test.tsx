/**
 * @vitest-environment node
 *
 * Repair #19 polish A2 (founder, 2026-10-19) — CALL-LOG PILL
 * CONTAINMENT, in the F3 breadth lineage: the real PeopleCallsList
 * composition, the production stylesheets in served order, laid
 * out by a real Chromium at the founder's 390x844 frame, both
 * modes.
 *
 * The defect: the call row's state pills/badges (the plan-
 * awareness pill - "Happening" - and the row's own state
 * treatment) PAINTED outside the row's geometry. Border boxes
 * were already contained (F3); the escape was painted: the 12%
 * state glow was an OUTSET box-shadow on both the row (CallLog
 * .css) and the pill (the unify wave's shared rule), so state
 * light hung past the pill's border and outside the row's
 * border box into the inter-row gap - the layout contract's
 * strict-containment failure (no element escapes its card/row
 * bounds, painted effects included).
 *
 * The fix spends the identical glow (same hue source, same 12%
 * mix, same 10px blur) INSET, scoped to the call row. This pin
 * measures, per row:
 *  - every descendant's border box stays inside the row's
 *    border box (all rows, all elements - not just F3's picks);
 *  - the pill's own contents (head badge, state label, text)
 *    stay inside the pill's border box;
 *  - PAINTED containment: in the computed box-shadow of the row
 *    and of the pill, every shadow whose color is the element's
 *    state hue is inset - no state-colored shadow may paint
 *    outside its element's geometry. (The row's neutral
 *    --shadow-card elevation shadow is not state treatment and
 *    is not matched by the hue check.)
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";
import { chromium } from "playwright-core";
import { describe, expect, it } from "vitest";

import { PeopleCallsList, type PeopleCallSummary } from "./C1Surfaces";
import { PLAN_STATE_HEX } from "../../theme/planStateColors";

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

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

const CALLS: PeopleCallSummary[] = [
  {
    id: "a2-happening",
    name: "Chanelle Brooks",
    initials: "CB",
    metadata: "Outgoing · Today at 2:41 PM · 12 min",
    conversationId: "conv-1",
    entityTint: 2,
    callState: { state: "happening", reason: "plan_happening", label: "Happening now" },
    nextPlan: {
      plan_id: "p1",
      title: "Dinner at Juniper and Ivy",
      when_label: "Tonight 7:30 PM",
      where_label: "Juniper and Ivy",
      where_kind: "physical",
      status: "agreed",
      state: "happening",
      conversation_id: "conv-1",
    },
  },
  {
    id: "a2-action",
    name: "Jordan Ellis Whitaker-Harrington",
    initials: "JE",
    metadata: "No answer · Saturday October 18 at 12:00 PM sharp",
    conversationId: "conv-2",
    entityTint: 3,
    callState: { state: "action", reason: "missed_unresolved", label: "Call back" },
    nextPlan: {
      plan_id: "p2",
      title: "Happening Festival at the waterfront with the whole crew",
      when_label: "Saturday 7:30 PM",
      where_label: "The waterfront pavilion",
      where_kind: "physical",
      status: "tentative",
      state: "forming",
      conversation_id: "conv-2",
    },
  },
  {
    id: "a2-past",
    name: "Maya Chen",
    initials: "MC",
    metadata: "Missed call · Oct 18, 12:00 PM",
    conversationId: "conv-3",
    entityTint: 5,
    callState: { state: "past", reason: "settled", label: "Settled" },
    nextPlan: null,
  },
];

type RowMeasure = {
  callId: string;
  family: string | null;
  /** The pill's OWN state family (the plan's - it can differ from
   *  the call's: an action call row can carry a forming plan). */
  pillFamily: string | null;
  escapes: Array<{ who: string; by: Record<string, number> }>;
  pillEscapes: Array<{ who: string; by: Record<string, number> }>;
  rowShadow: string;
  pillShadow: string | null;
};

/** Split a computed box-shadow into its shadows (top-level commas
 *  only - rgba()/color values carry commas of their own). */
function shadowItems(shadow: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of shadow) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      items.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) items.push(cur.trim());
  return items;
}

/**
 * The shadow's color, as [r, g, b] in 0-255, across Chromium's
 * serializations: rgb()/rgba() integer form, and the color()
 * float form color-mix resolves to (color(srgb R G B / A) with
 * 0-1 components). Null when the item carries no parseable color.
 */
function shadowColor(item: string): [number, number, number] | null {
  const rgbForm = item.match(/rgba?\(([^)]+)\)/);
  if (rgbForm) {
    const parts = rgbForm[1].split(",").map((p) => parseFloat(p));
    return [parts[0], parts[1], parts[2]];
  }
  const colorForm = item.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (colorForm) {
    return [
      Math.round(parseFloat(colorForm[1]) * 255),
      Math.round(parseFloat(colorForm[2]) * 255),
      Math.round(parseFloat(colorForm[3]) * 255),
    ];
  }
  return null;
}

function shadowUsesHue(item: string, rgb: [number, number, number]): boolean {
  const c = shadowColor(item);
  return c !== null && c[0] === rgb[0] && c[1] === rgb[1] && c[2] === rgb[2];
}

describe("A2 - call-log containment at served breadth (real list, real CSS, Chromium 390px)", () => {
  it("every badge lives inside its row's geometry - boxes and painted state glow, both modes", async () => {
    const css = SHEETS.map((f) => readFileSync(resolve(WEB_ROOT, f), "utf8")).join("\n");
    const html = renderToString(
      <div data-design="r18" style={{ width: 390 }}>
        <PeopleCallsList calls={CALLS} onOpenConversation={() => {}} onCallBack={() => {}} />
      </div>,
    );

    const browser = await chromium.launch({ executablePath: chromiumPath() });
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      for (const mode of ["dark", "light"]) {
        await page.setContent(
          `<!doctype html><html data-mode="${mode}"><head><meta charset="utf-8"><style>
            html, body { margin: 0; padding: 0; }
            ${css}
          </style></head><body>${html}</body></html>`,
        );

        const rows = (await page.evaluate(() => {
          const out: RowMeasure[] = [];
          const by = (inner: DOMRect, outer: DOMRect) => ({
            left: +(outer.left - inner.left).toFixed(1),
            right: +(inner.right - outer.right).toFixed(1),
            top: +(outer.top - inner.top).toFixed(1),
            bottom: +(inner.bottom - outer.bottom).toFixed(1),
          });
          const escapesOf = (root: Element, box: DOMRect) => {
            const found: RowMeasure["escapes"] = [];
            const walk = (el: Element) => {
              const r = el.getBoundingClientRect();
              const d = by(r, box);
              if (d.left > 1 || d.right > 1 || d.top > 1 || d.bottom > 1) {
                found.push({
                  who: `${el.tagName}.${(el as HTMLElement).className} [${el.getAttribute("data-testid") ?? ""}] "${(el.textContent ?? "").slice(0, 24)}"`,
                  by: d,
                });
              }
              [...el.children].forEach(walk);
            };
            [...root.children].forEach(walk);
            return found;
          };
          for (const row of document.querySelectorAll('[data-testid="calls-row"]')) {
            const rr = row.getBoundingClientRect();
            const pill = row.querySelector('[data-testid="plan-awareness"]');
            out.push({
              callId: row.getAttribute("data-call-id") ?? "",
              family: row.getAttribute("data-call-state"),
              pillFamily: pill ? pill.getAttribute("data-plan-state") : null,
              escapes: escapesOf(row, rr),
              pillEscapes: pill ? escapesOf(pill, pill.getBoundingClientRect()) : [],
              rowShadow: getComputedStyle(row).boxShadow,
              pillShadow: pill ? getComputedStyle(pill).boxShadow : null,
            });
          }
          return out;
        })) as RowMeasure[];

        expect(rows.map((r) => r.callId)).toEqual(["a2-happening", "a2-action", "a2-past"]);
        for (const r of rows) {
          // Border-box containment: nothing in the row escapes it.
          expect(r.escapes, `${mode}/${r.callId} border-box escapes`).toEqual([]);
          // The pill contains its own badge contents.
          expect(r.pillEscapes, `${mode}/${r.callId} pill-internal escapes`).toEqual([]);
          // Painted containment: no state-hued shadow paints outset.
          expect(r.family, `${mode}/${r.callId} carries its state family`).not.toBeNull();
          const rgb = hexToRgb(PLAN_STATE_HEX[r.family as keyof typeof PLAN_STATE_HEX]);
          for (const item of shadowItems(r.rowShadow)) {
            if (shadowUsesHue(item, rgb)) {
              expect(item, `${mode}/${r.callId} row state glow must be inset`).toContain("inset");
            }
          }
          if (r.pillShadow !== null) {
            expect(r.pillFamily, `${mode}/${r.callId} pill carries its plan family`).not.toBeNull();
            const pillRgb = hexToRgb(PLAN_STATE_HEX[r.pillFamily as keyof typeof PLAN_STATE_HEX]);
            const hued = shadowItems(r.pillShadow).filter((i) => shadowUsesHue(i, pillRgb));
            // The pill's state glow EXISTS (it is the badge's light,
            // not an absence) and every part of it is contained.
            expect(hued.length, `${mode}/${r.callId} pill carries its state glow`).toBeGreaterThan(0);
            for (const item of hued) {
              expect(item, `${mode}/${r.callId} pill state glow must be inset`).toContain("inset");
            }
          }
          // In light mode the row's own state glow also paints (in
          // dark mode the pre-existing --shadow-card: none token
          // invalidates the row's shadow list wholesale - observed,
          // out of A2's scope; the pill carries the glow there).
          if (mode === "light") {
            const huedRow = shadowItems(r.rowShadow).filter((i) => shadowUsesHue(i, rgb));
            expect(huedRow.length, `${mode}/${r.callId} row carries its state glow`).toBeGreaterThan(0);
            for (const item of huedRow) {
              expect(item, `${mode}/${r.callId} row state glow must be inset`).toContain("inset");
            }
          }
        }
      }
    } finally {
      await browser.close();
    }
  }, 60_000);

  it("the source carries the containment: both state glows are spent inset at the same mixes", () => {
    const callLogCss = readFileSync(resolve(WEB_ROOT, "src/opalUi/c1/CallLog.css"), "utf8");
    // The row's glow: inset, at the unchanged 12% mix of --call-state.
    expect(callLogCss).toContain(
      "inset 0 0 10px color-mix(in srgb, var(--call-state) 12%, transparent)",
    );
    // The pill inside a call row: inset, at the unchanged 12% mix of --pa-state.
    expect(callLogCss).toContain(
      "inset 0 0 10px color-mix(in srgb, var(--pa-state) 12%, transparent)",
    );
    // And the old outset row glow is gone (the neutral --shadow-card
    // elevation shadow is not matched by this pattern).
    expect(callLogCss).not.toMatch(/^\s+0 0 10px color-mix\(in srgb, var\(--call-state\)/m);
  });
});
