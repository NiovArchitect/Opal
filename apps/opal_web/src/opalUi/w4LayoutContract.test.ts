/**
 * Repair #18 / Walk #4 - Layout Contract enforcement (Tier A, static).
 *
 * The contract lives in src/theme/layoutContract.css (L1-L7). These tests
 * make the Walk #4 error class (overlap, clipping, hidden assets, tapped
 * assets not coming forward) test-detectable at the source level. They
 * are structure/static audits ONLY - a layout item closes on the rendered
 * Playwright proof (shots/repair18/walk4/), never on this file alone.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, "src", rel), "utf8");

function blockFor(css: string, selector: string): string {
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  const bodies: string[] = [];
  while ((m = re.exec(noComments)) !== null) {
    if (m[1].trim() === selector) bodies.push(m[2]);
  }
  return bodies.join("\n");
}

describe("W4 Layout Contract", () => {
  const contract = read("theme/layoutContract.css");
  const styles = read("styles.css");
  const app = read("OpalApp.tsx");

  it("the contract is named and complete (L1-L11)", () => {
    for (const id of ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10", "L11"]) {
      expect(contract).toContain(id);
    }
    const main = read("main.tsx");
    expect(main).toContain('import "./theme/layoutContract.css"');
  });

  it("L3: graphs plan cards size to content - no fixed height truncation", () => {
    const card = blockFor(styles, ".graphs-home-card");
    expect(card).not.toMatch(/(?<!min-)(?<!max-)height:\s*\d+px/);
    expect(card).toMatch(/min-height:\s*92px/);
    const btn = blockFor(styles, ".graphs-home-card-btn");
    expect(btn).not.toMatch(/height:\s*100%/);
  });

  it("L1: W4-migrated overlays carry registry z-index tokens, never literals", () => {
    for (const sel of [".find-people-overlay", ".lives-go-live-overlay", ".story-viewer.story-viewer-357-418"]) {
      const body = blockFor(styles, sel);
      const z = body.match(/z-index:\s*([^;]+);/);
      expect(z, sel).not.toBeNull();
      expect(z![1].trim()).toMatch(/^var\(--layer-/);
    }
  });

  it("L2: screen-owning surfaces mount through TopLayer", () => {
    expect(read("people/FindPeopleFlow.tsx")).toMatch(/<TopLayer band="sheet">/);
    expect(read("opalUi/StoryViewer.tsx")).toMatch(/<TopLayer band="flow">/);
    // The go-live overlay in the member shell is TopLayer-wrapped.
    const idx = app.indexOf('data-testid="lives-go-live-overlay"');
    expect(idx).toBeGreaterThan(0);
    expect(app.slice(Math.max(0, idx - 400), idx)).toContain('<TopLayer band="sheet">');
  });

  it("L4: thread composition - banner, strip, reservation render inside .thread, in flow order", () => {
    const threadOpen = app.indexOf('className="thread"');
    const hint = app.indexOf("<ConnectionHint");
    const strip = app.indexOf('data-testid="next-plan-strip"');
    const reservation = app.indexOf("<ReservationExperience");
    const items = app.indexOf("{threadItems.map");
    expect(threadOpen).toBeGreaterThan(0);
    // Exactly one ConnectionHint mount, inside the thread.
    expect(app.split("<ConnectionHint").length - 1).toBe(1);
    expect(hint).toBeGreaterThan(threadOpen);
    expect(strip).toBeGreaterThan(threadOpen);
    // Strip precedes the journey CTA row; reservation sits in the thread
    // (before the message items), never as a bare conversation-root child.
    const journey = app.indexOf('data-testid="journey-cta-row"');
    expect(strip).toBeLessThan(journey);
    expect(reservation).toBeGreaterThan(threadOpen);
    expect(reservation).toBeLessThan(items);
  });

  it("L4/L5: contract sheet removes sticky overlay positioning from the thread and makes the header opaque", () => {
    expect(contract).toMatch(/\.next-plan-strip \{\s*position: relative/);
    expect(contract).toMatch(/\.alignment-card\.is-sheet \{\s*position: relative/);
    expect(contract).toMatch(/gpt-header-618 \{\s*background: rgb\(5, 8, 22\)/);
    expect(contract).toMatch(/\.thread > \.reservation-experience/);
  });

  it("L6: the story chooser anchor is viewport-clamped at the call site", () => {
    const home = read("opalUi/GraphSocialHome.tsx");
    expect(home).toContain("Math.min(Math.max(center, halfMenu + 8)");
    expect(contract).toMatch(/\.gsh-compose-chooser \{\s*max-width: calc\(100vw - 16px\)/);
  });

  it("W4-05 honesty: FindPeople never claims an invitation that was not created", () => {
    const fp = read("people/FindPeopleFlow.tsx");
    expect(fp).toContain("Nothing was sent.");
    expect(fp).toMatch(/if \(created === 0\)/);
  });
});
