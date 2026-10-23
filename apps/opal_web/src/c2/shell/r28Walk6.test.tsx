/**
 * @vitest-environment jsdom
 *
 * Repair #28 - founder walk #6 pins (web side).
 *
 * W28-1: the Graphs list root carries the containment surface
 * (the You-room pattern) so its scroller can actually scroll.
 * W28-4: spine copy is one clear sentence per row - the answers
 * row belongs to THEM (owner "them"), the marker says only the
 * state, and no owner fragment is jammed onto a sentence.
 * W28-7/9: the thread keeps ONE scroller (host override no longer
 * scrolls the surface itself) and the orbit screen stops paying
 * the dock clearance twice.
 * W28-8: the thread header's shared line never falls back to the
 * person's own name ("Maya" over "Maya").
 * W28-3: the check-in family has real styles (name and status are
 * structurally separated - the "MayaStill waiting" run-together).
 * W28-6: the web mode report re-fires on load/visible/focus -
 * event-driven, still no polling.
 * W28-12: the Create form's who summary never duplicates the
 * empty-state line.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { PreparationSpine } from "./PreparationSpine";
import { foldSpineAnswers, spineFromPlan, type SpineItem } from "./density";
import type { OpalPlanContract } from "../../api/productClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf8");

let host: HTMLDivElement | null = null;
let root: Root | null = null;
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  host = null;
  root = null;
  document.body.innerHTML = "";
});

describe("W28-1 - graphs list containment", () => {
  it("the list root is the containment surface and the CSS carries the scroller contract", () => {
    const graphs = read("./C2Graphs.tsx");
    expect(graphs).toContain('className="c2s-graphs-surface"');
    const css = read("./c2shell.css");
    expect(css).toContain(".c2s-graphs-surface");
    expect(css).toMatch(/\.c2s-graphs-surface > \.c2s-scroll \{[^}]*min-height: 0/);
    expect(css).toMatch(/\.c2s-graphs-surface > \.c2s-scroll \{[^}]*scroll-padding-bottom/);
  });
});

describe("W28-4 - spine copy: one sentence, honest owner, state-only marker", () => {
  const plan = (p: Partial<OpalPlanContract> & { id: string }): OpalPlanContract =>
    ({ title: p.id, status: "tentative", ...p }) as OpalPlanContract;

  it("the answers row belongs to them, in one sentence", () => {
    const spine = spineFromPlan({
      plan: plan({ id: "x", status: "agreed" }),
      who: [{ name: "Maya", responseLabel: "Waiting to answer" }],
    });
    const answers = spine.find((i) => i.id === "answers")!;
    expect(answers.stateLine).toBe("Their answer is theirs to give.");
    expect(answers.owner).toBe("them");
    expect(answers.ownerLine).toBe("Theirs to answer");
  });

  it("foldSpineAnswers writes the same honest row", () => {
    const base = spineFromPlan({ plan: plan({ id: "y", status: "agreed" }) });
    const folded = foldSpineAnswers(base, [{ name: "Maya", responseLabel: "Waiting to answer" }])!;
    const answers = folded.find((i) => i.id === "answers")!;
    expect(answers.stateLine).toBe("Their answer is theirs to give.");
    expect(answers.owner).toBe("them");
  });

  it("the event and settling rows are complete sentences", () => {
    const spine = spineFromPlan({
      plan: plan({ id: "z", status: "agreed", start_at: new Date(Date.now() + 86_400_000).toISOString() }),
    });
    const event = spine.find((i) => i.id === "event")!;
    expect(event.stateLine).toBe("The event itself, still ahead.");
    const settling = spine.find((i) => i.id === "settling")!;
    expect(settling.stateLine).toBe("Afterwards it settles into your past, quietly.");
  });

  it("PreparationSpine renders the state alone - no phase word, no owner fragment", async () => {
    const items: SpineItem[] = [
      {
        id: "answers",
        phase: "preparation",
        label: "Answers from Maya",
        state: "waiting",
        stateLine: "Their answer is theirs to give.",
        owner: "them",
        ownerLine: "Theirs to answer",
        arcPosition: 0.65,
      },
    ];
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root!.render(<PreparationSpine spine={items} />);
    });
    const marker = host.querySelector('[data-testid="c2-spine-marker"]');
    expect(marker?.textContent?.trim()).toBe("Waiting");
    const line = host.querySelector(".c2s-card-line");
    expect(line?.textContent).toBe("Their answer is theirs to give.");
  });
});

describe("W28-7/8/9 - thread and orbit shell contracts (source pins)", () => {
  it("the C1 thread scroll region can shrink (min-height: 0)", () => {
    const css = read("../../opalUi/c1/c1.css");
    expect(css).toMatch(/\.c1-scroll \{[^}]*min-height: 0/);
  });

  it("the r18 host keeps ONE scroller for the thread and stops double-paying orbit clearance", () => {
    const css = read("./c2shell.css");
    expect(css).toMatch(/\.c2s-c1-host \.c1-surface\.c1-thread \{\s*overflow: hidden/);
    expect(css).toMatch(/\.c2s-c1-host \.c1-thread \.c1-scroll \{\s*padding-bottom: var\(--space-3\)/);
    expect(css).toMatch(/\.c2s-c1-host \.orbit-screen \{\s*padding-bottom: var\(--space-3\)/);
  });

  it("the dyad shared line never falls back to the person's name", () => {
    const hosts = read("./C1ShellHosts.tsx");
    // The dyad branch (peers.length === 1) resolves to tieLabel
    // ALONE; the peers-name join survives only in the group branch.
    expect(hosts).toMatch(/selected\.peers\.length === 1\s*\?\s*tieLabel\(/);
    expect(hosts).toContain("no tie, no subtitle");
  });
});

describe("W28-3 - check-in styles exist (name/status separation is structural)", () => {
  it("the check-in family is styled in c2shell.css", () => {
    const css = read("./c2shell.css");
    expect(css).toContain(".checkin-circle-summary");
    expect(css).toContain(".checkin-summary-member");
    expect(css).toContain(".checkin-summary-title");
  });
});

describe("W28-6 - mode report hardening is event-driven", () => {
  it("main.tsx re-reports on load, visibility, and focus - and still never polls", () => {
    const main = read("../../main.tsx");
    expect(main).toContain('window.addEventListener("load", report)');
    expect(main).toContain("visibilitychange");
    expect(main).toContain('window.addEventListener("focus", report)');
    expect(main).not.toMatch(/setInterval\([^)]*report/);
  });
});

describe("W28-14 - the self stone is never a dead tap", () => {
  it("openSelf has no silent return for a live story without media", () => {
    const home = read("./C2Home.tsx");
    expect(home).not.toContain("if (rail.self.hasLiveStory) return;");
    expect(home).toContain("W28-14");
  });
});

describe("W28-12 - create who summary never duplicates the empty state", () => {
  it("the whoLine paragraph is gated on people existing", () => {
    const shell = read("./C2Shell.tsx");
    expect(shell).toContain("whoPeople.length === 0 ? null");
  });
});

describe("W28-16 - the comments composer button sizes to its label", () => {
  it("c2s-comments-post overrides the full-width form-button width", () => {
    const css = read("./c2shell.css");
    const block = css.slice(css.indexOf(".c2s-comments-post {"));
    const rule = block.slice(0, block.indexOf("}"));
    expect(rule).toContain("width: auto");
    expect(rule).toContain("W28-16");
  });
});
