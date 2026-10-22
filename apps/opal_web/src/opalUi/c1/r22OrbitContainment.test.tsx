/**
 * Repair #22 (WS-9) — ORBIT SELECT PANEL CONTAINMENT, pinned.
 *
 * The founder's charge from the integrated select frame: the
 * selected suggestion's text hung OUTSIDE its pill, the
 * unsent-truth line hung outside on the left, and the action rows
 * sat flush-left on the container's edge line.
 *
 * Root cause (CSS): the card treatment (border + shadow + radius
 * + background) lived on a UNIVERSAL DESCENDANT rule,
 * `.orbit-recommendation *`, which stamped a bordered pill onto
 * every child — the draft text <p>, the place note, the actions
 * container and each button — while those children carried no
 * horizontal padding of their own. Text therefore rode/crossed
 * its pill's edge, and the rows' labels sat on their pill borders
 * instead of the panel's inner grid.
 *
 * The law pinned here: ONE container carries the card chrome;
 * descendants carry none; every text element lives inside the
 * card on the card's padding; action-row labels align to the
 * panel's inner grid with the press box inset on both sides; the
 * one legitimate bordered control (the edit textarea) is styled
 * BY NAME with its own padding.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(__dirname, "OrbitScreen.css"), "utf8");

function rule(selector: string): string {
  const start = css.indexOf(selector + " {");
  expect(start, `rule ${selector} exists`).toBeGreaterThanOrEqual(0);
  const end = css.indexOf("}", start);
  // Strip comments: the assertions pin PROPERTIES, and the rules'
  // own law comments legitimately name the forbidden properties.
  return css.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, "");
}

describe("WS-9 orbit select panel containment", () => {
  it("the card chrome lives on the recommendation card itself", () => {
    const card = rule('[data-design="r18"] .orbit-recommendation');
    expect(card).toContain("border: 1px solid");
    expect(card).toContain("box-shadow:");
    expect(card).toContain("border-radius: var(--radius-card, 16px)");
    expect(card).toContain("background: var(--surface-1)");
    expect(card).toContain("padding: 12px 14px");
    expect(card).toContain("box-sizing: border-box");
  });

  it("no descendant of the panel is stamped with card chrome (the defect rule is gone)", () => {
    const star = rule('[data-design="r18"] .orbit-recommendation *');
    expect(star).not.toContain("border");
    expect(star).not.toContain("box-shadow");
    expect(star).not.toContain("background");
    expect(star).not.toContain("border-radius");
  });

  it("the draft text wraps inside the panel, never across an edge", () => {
    const text = rule('[data-design="r18"] .orbit-recommendation-text');
    expect(text).toContain("overflow-wrap: break-word");
    expect(text).not.toContain("border");
  });

  it("the unsent-truth note is panel text on the grid — no pill of its own", () => {
    const note = rule('[data-design="r18"] .orbit-recommendation-place-note');
    expect(note).not.toContain("border");
    expect(note).not.toContain("background");
    expect(note).toContain("overflow-wrap: break-word");
  });

  it("action rows align to the inner grid: label inset matches the card grid, press box inside", () => {
    const btn = rule('[data-design="r18"] .orbit-recommendation-actions > button');
    // Own horizontal padding + the offsetting negative margin is
    // what places the LABEL on the panel grid (card 14px padding)
    // while the row box itself stays inset from the card edge.
    expect(btn).toContain("padding: 7px 10px");
    expect(btn).toContain("margin: 0 -10px");
    expect(btn).not.toContain("border: 1px");
  });

  it("the primary place pill is a real pill whose label lives inside it, aligned to the grid", () => {
    const place = rule(
      '[data-design="r18"] .orbit-recommendation-actions > button.orbit-recommendation-place',
    );
    expect(place).toContain("border-radius: 999px");
    expect(place).toContain("padding: 9px 18px");
    expect(place).toContain("margin: 0");
    expect(place).toContain("max-width: 100%");
  });

  it("the edit input is the one named exception: a bordered control with its own padding", () => {
    const input = rule('[data-design="r18"] .orbit-recommendation-input');
    expect(input).toContain("border: 1px solid");
    expect(input).toContain("padding: 8px 10px");
    expect(input).toContain("box-sizing: border-box");
  });
});
