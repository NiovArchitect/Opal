/**
 * @vitest-environment jsdom
 *
 * Repair #18 (Division A web) - layering + fixtures + state colors:
 * 1. Tier A static audit: migrated surfaces carry NO z-index literal -
 *    every z-index on them is a var(--layer-*) registry reference, and
 *    no selector receives two different z-index values.
 * 2. Fixture kill: no seed literal pills, no invented GraphDetailSheet
 *    times, no TimelineAdjustSheet fake save.
 * 3. Structure: the story chooser renders through TopLayer (never inside
 *    the clipped stories rail or inside a <button>), and the story flow,
 *    contact sheet and graph detail all mount through TopLayer.
 * 4. Attendance: planAttendanceLabel renders the contract or nothing.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GraphSocialHome } from "./GraphSocialHome";
import { ContactProfileSheet } from "./ContactProfileSheet";
import { planAttendanceLabel } from "./nextPlan";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, "src", rel), "utf8");

const CSS_FILES = [
  "styles.css",
  "theme/spectralTokens.css",
  "theme/technicolorProduction.css",
  "theme/opalComposerTokens.css",
  "theme/layerTokens.css",
];

/** Classes migrated to the layer registry in Repair #18. */
const MIGRATED = [
  "story-create-flow",
  "gsh-compose-chooser",
  "ogsn-graph-detail",
  "contact-profile-sheet",
  "contact-profile-card",
  "next-plan-strip",
];

type CssBlock = { selector: string; body: string };

function parseBlocks(css: string): CssBlock[] {
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blocks: CssBlock[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(noComments)) !== null) {
    blocks.push({ selector: m[1].trim(), body: m[2] });
  }
  return blocks;
}

function zValues(body: string): string[] {
  const out: string[] = [];
  const re = /z-index\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) out.push(m[1].trim());
  return out;
}

describe("Repair #18 Tier A - layer registry audit", () => {
  it("the registry defines every layer token exactly once", () => {
    const tokens = read("theme/layerTokens.css");
    for (const name of [
      "--layer-content",
      "--layer-raised",
      "--layer-chrome",
      "--layer-thread-strip",
      "--layer-sheet-low",
      "--layer-sheet",
      "--layer-sheet-high",
      "--layer-flow",
      "--layer-modal",
      "--layer-system",
    ]) {
      const count = tokens.split(`${name}:`).length - 1;
      expect(count, name).toBe(1);
    }
    // main.tsx loads the registry before every other stylesheet.
    const main = read("main.tsx");
    expect(main.indexOf("layerTokens.css")).toBeGreaterThan(-1);
    expect(main.indexOf("layerTokens.css")).toBeLessThan(main.indexOf("styles.css"));
  });

  it("no z-index literal on any migrated surface, in any stylesheet", () => {
    for (const file of CSS_FILES) {
      const blocks = parseBlocks(read(file));
      for (const block of blocks) {
        const migrated = MIGRATED.some((cls) => block.selector.includes(cls));
        if (!migrated) continue;
        for (const value of zValues(block.body)) {
          expect(
            value.replace(/\s*!important$/, "").startsWith("var(--layer-"),
            `${file} :: ${block.selector} :: z-index: ${value}`,
          ).toBe(true);
        }
      }
    }
  });

  it("no migrated selector receives two different z-index values", () => {
    const seen = new Map<string, Set<string>>();
    for (const file of CSS_FILES) {
      for (const block of parseBlocks(read(file))) {
        if (!MIGRATED.some((cls) => block.selector.includes(cls))) continue;
        for (const value of zValues(block.body)) {
          const key = block.selector.replace(/\s+/g, " ");
          const set = seen.get(key) || new Set<string>();
          set.add(value);
          seen.set(key, set);
        }
      }
    }
    for (const [selector, values] of seen) {
      expect(values.size, selector).toBeLessThanOrEqual(1);
    }
  });

  it("migrated surfaces are out of the .app > * hammer exclusion list", () => {
    const css = read("styles.css");
    const hammer = css.match(/\.app > \*:not\([\s\S]*?\) \{/)?.[0] || "";
    expect(hammer).not.toContain("ogsn-graph-detail");
    expect(hammer).not.toContain("story-create-flow");
    expect(hammer).not.toContain("contact-profile-sheet");
  });

  it("the retired signal palette no longer carries plan semantics", () => {
    const spectral = read("theme/spectralTokens.css");
    expect(spectral).toMatch(/--signal-needs-attention: #FF4D5E/);
    expect(spectral).toMatch(/--signal-settled: #FFFFFF/);
    const css = read("styles.css");
    expect(css).toMatch(/\.chats-plan-consequence\.is-action \{ color: var\(--plan-state-action\)/);
    expect(css).toMatch(/\.chats-plan-consequence\.is-past \{[^}]*color: var\(--plan-state-past\)/);
    const composer = read("theme/opalComposerTokens.css");
    expect(composer).toMatch(/--plan-state-pending: var\(--plan-state-action\)/);
    expect(composer).not.toMatch(/--plan-state-pending: var\(--plan-state-ready\)/);
  });
});

describe("Repair #18 - fixture kill", () => {
  it("no seed literal pills or invented times remain in migrated sources", () => {
    const pills = read("opalUi/founderChatsPlanPills.ts");
    expect(pills).not.toMatch(/3 of 4 going/);
    expect(pills).not.toMatch(/Juniper & Ivy · 7:30 PM/);
    expect(pills).not.toMatch(/planConsequence: \{/);
    const hydration = read("opalUi/chatsHydration.ts");
    expect(hydration).not.toMatch(/remapFounderChatRowsToLive\(/);
    const detail = read("opalUi/GraphDetailSheet.tsx");
    expect(detail).not.toMatch(/inventDefaults/);
    expect(detail).not.toMatch(/"6:55 PM"/);
    expect(detail).not.toMatch(/"9 min away"/);
    expect(detail).not.toMatch(/Tonight · 7:30 PM/);
  });

  it("TimelineAdjustSheet is cut - no fake save survives", () => {
    const app = read("OpalApp.tsx");
    expect(app).not.toMatch(/<TimelineAdjustSheet/);
    expect(app).not.toMatch(/timelineAdjustItem/);
    expect(() => read("opalUi/TimelineAdjustSheet.tsx")).toThrow();
  });

  it("exactly one Next Together strip remains", () => {
    const app = read("OpalApp.tsx");
    expect(app).not.toMatch(/next-together-strip/);
    expect(app).not.toMatch(/data-testid="next-together"/);
    expect(app.match(/data-testid="next-plan-strip"/g)?.length).toBe(1);
    const css = read("styles.css");
    expect(css).not.toMatch(/\.next-together-strip \{\s*display: none/);
  });

  it("the thread filament never derives state by regex on label text", () => {
    const app = read("OpalApp.tsx");
    expect(app).not.toMatch(/\/locked\|confirmed/);
    expect(app).not.toMatch(/\/waiting\|pending\/i\.test\(filamentLabel\)/);
    expect(app).toMatch(/filamentPlanState/);
    expect(app).toMatch(/stripPlanState/);
  });

  it("attendance label renders the contract or nothing", () => {
    expect(planAttendanceLabel({ goingCount: 3, totalCount: 4 })).toBe(
      "3 of 4 going",
    );
    expect(
      planAttendanceLabel({
        goingCount: 3,
        totalCount: 4,
        timeLabel: "Thursday - 7:30 PM",
        // Coordinator merge (R18): the backend conflict is an OBJECT;
        // the label formats it via conflictLineFromContract like every
        // other card - never a pre-formatted string.
        conflict: { title: "Movie night", time_label: "7:30 PM" },
      }),
    ).toBe(
      "3 of 4 going - Thursday - 7:30 PM - This overlaps with Movie night at 7:30 PM.",
    );
    expect(planAttendanceLabel({})).toBeNull();
    expect(planAttendanceLabel({ goingCount: 3 })).toBeNull();
    expect(planAttendanceLabel({ totalCount: 4 })).toBeNull();
  });
});

describe("Repair #18 - story entry structure", () => {
  it("the chooser renders through TopLayer, unclipped and outside any button", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const reactRoot = createRoot(host);
    await act(async () => {
      reactRoot.render(
        <GraphSocialHome
          onCreateStory={() => {}}
          onCreatePost={() => {}}
        />,
      );
    });
    const cell = host.querySelector('[data-testid="gsh-story-create"]');
    expect(cell).not.toBeNull();
    expect(cell?.tagName).toBe("BUTTON");
    // No interactive descendants inside the cell button.
    expect(cell?.querySelector("button")).toBeNull();
    expect(cell?.querySelector('[data-testid="gsh-compose-chooser"]')).toBeNull();

    await act(async () => {
      cell?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });
    const chooser = document.querySelector('[data-testid="gsh-compose-chooser"]');
    expect(chooser).not.toBeNull();
    // The chooser lives in the TopLayer portal (direct body descendant
    // host), NOT inside the overflow:hidden stories rail.
    const topLayer = chooser?.closest('[data-top-layer="portal-body"]');
    expect(topLayer).not.toBeNull();
    expect(topLayer?.parentElement).toBe(document.body);
    expect(chooser?.closest(".gsh-stories-rail")).toBeNull();
    expect(chooser?.closest("button")).toBeNull();
    expect(
      document.querySelector('[data-testid="gsh-compose-story"]'),
    ).not.toBeNull();
    await act(async () => reactRoot.unmount());
    host.remove();
  });

  it("every story entry point opens the same flow: home, profile, graphs", () => {
    const app = read("OpalApp.tsx");
    // Home/social chain (existing) plus the two new entry points.
    expect(app).toMatch(/onCreateStory=\{\(\) => setStoryCreateOpen\(true\)\}/);
    expect(app).toMatch(/data-testid="you-create-story"/);
    const graphs = read("opalUi/GraphsHome.tsx");
    expect(graphs).toMatch(/data-testid="graphs-create-story"/);
    expect(graphs).toMatch(/onCreateStory/);
    // One mount, through TopLayer band flow (StoryCreateFlow itself).
    const flow = read("opalUi/StoryCreateFlow.tsx");
    expect(flow).toMatch(/<TopLayer band="flow">/);
    expect(app.match(/<StoryCreateFlow/g)?.length).toBe(1);
  });

  it("contact sheet and graph detail mount through TopLayer", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const reactRoot = createRoot(host);
    await act(async () => {
      reactRoot.render(
        <ContactProfileSheet name="Chanelle" onClose={() => {}} />,
      );
    });
    const sheet = document.querySelector('[data-testid="contact-profile-sheet"]');
    expect(sheet).not.toBeNull();
    const topLayer = sheet?.closest('[data-top-layer="portal-body"]');
    expect(topLayer).not.toBeNull();
    expect(topLayer?.parentElement).toBe(document.body);
    expect(topLayer?.getAttribute("data-top-layer-band")).toBe("sheet");
    await act(async () => reactRoot.unmount());
    host.remove();

    const app = read("OpalApp.tsx");
    expect(app).toMatch(/<TopLayer band="sheet">\s*<GraphDetailSheet/);
  });
});
