/**
 * @vitest-environment jsdom
 *
 * Repair #18 - Division C2 foundation: splashes (exactly-once law),
 * reference plan card (five states, unknown-state law), Loop honesty.
 * Rendered through react-dom on jsdom, per the repo harness pattern.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { C2Splash1 } from "../onboarding/C2Splash1";
import { C2Splash2 } from "../onboarding/C2Splash2";
import { PlanCardC2, PlanStatePillC2 } from "./PlanCardC2";
import { LoopCharacter } from "./LoopCharacter";
import { loopExpressionForPresence } from "../brand/c2Identity";

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
  host?.remove();
  host = null;
  root = null;
  document.body.innerHTML = "";
});

function q(sel: string) {
  return document.querySelector(sel);
}
function click(el: Element) {
  act(() => {
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
}

describe("C2 Splash 1 (track-c2 section 4)", () => {
  it("carries the new identity, exact copy, and zero Enter Opal", async () => {
    const el = await render(<C2Splash1 onContinue={() => {}} onAlreadyAccount={() => {}} />);
    expect(q('[data-testid="c2-splash1-wordmark"]')?.getAttribute("src")).toContain("/brand/c2/");
    expect(el.textContent).toContain("REAL PEOPLE. REAL PLANS.");
    expect(el.textContent).toContain("Your people. Your plans. One place.");
    expect(el.textContent).not.toContain("Enter Opal");
    expect(q('[data-testid="c2-splash1-continue"]')?.textContent).toBe("Continue");
    expect(q('[data-testid="c2-splash1-already"]')?.textContent).toBe("I already have an account");
  });

  it("double-tap guard: first tap wins", async () => {
    const onContinue = vi.fn();
    await render(<C2Splash1 onContinue={onContinue} onAlreadyAccount={() => {}} />);
    const btn = q('[data-testid="c2-splash1-continue"]')!;
    click(btn);
    click(btn);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});

describe("C2 Splash 2 (track-c2 section 5)", () => {
  it("Enter Opal appears exactly once, as the live primary button", async () => {
    const el = await render(<C2Splash2 onEnter={() => {}} onAlreadyAccount={() => {}} />);
    const occurrences = (el.textContent ?? "").split("Enter Opal").length - 1;
    expect(occurrences).toBe(1);
    expect(q('[data-testid="c2-splash2-enter"]')?.textContent).toBe("Enter Opal");
  });

  it("every string is live text; the plan card is a declared illustration", async () => {
    await render(<C2Splash2 onEnter={() => {}} onAlreadyAccount={() => {}} />);
    expect(q('[data-testid="c2-splash2-illustration-card"]')?.getAttribute("data-illustration")).toBe("1");
    expect(document.body.textContent).toContain("Rooftop Jazz");
    expect(document.body.textContent).toContain("TALK. ALIGN. GO.");
    // No text inside images: every image on the screen is the faceless
    // mark with empty alt - all copy is live text.
    for (const img of document.querySelectorAll("img")) {
      expect(img.getAttribute("alt") ?? "").toBe("");
      expect(img.getAttribute("src") ?? "").not.toContain("promise-exact");
    }
  });
});

describe("C2 reference plan card (C1 section 4 grammar, C2 section 2.4)", () => {
  const base = {
    title: "Dinner at Juniper and Ivy",
    whenLine: "Thu, Oct 22 at 7:30 PM",
    whereLine: "Juniper and Ivy, North Park",
    attendanceLine: "3 of 4 going",
  };
  it.each([
    ["forming", "Forming", "○"],
    ["action", "Action needed", "▲"],
    ["ready", "Ready", "✓"],
    ["happening", "Happening", "◎"],
    ["past", "Past", "■"],
  ])("state %s renders label + glyph + data-plan-state", async (family, label, glyph) => {
    await render(<PlanCardC2 input={{ ...base, stateFamily: family, stateLabel: label }} />);
    const pill = q('[data-testid="c2-plan-state-pill"]');
    expect(pill?.getAttribute("data-plan-state")).toBe(family);
    expect(pill?.textContent).toContain(label);
    expect(pill?.textContent).toContain(glyph);
    expect(q('[data-testid="c2-plan-card"]')?.getAttribute("data-plan-state")).toBe(family);
  });

  it("attendance null renders no count row", async () => {
    await render(
      <PlanCardC2 input={{ ...base, stateFamily: "ready", stateLabel: "Ready", attendanceLine: null }} />,
    );
    expect(document.body.textContent).toContain("Dinner at Juniper and Ivy");
    expect(document.body.textContent).not.toContain("of 4 going");
  });

  it("unknown state family renders forming treatment + Needs a look, never ready", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await render(<PlanStatePillC2 stateFamily="mystery" stateLabel="Mystery" />);
    const pill = q('[data-testid="c2-plan-state-pill"]');
    expect(pill?.getAttribute("data-plan-state")).toBe("forming");
    expect(pill?.textContent).toContain("Needs a look");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("Loop character (track-c2 sections 1.3 and 1.4)", () => {
  it("below 64px renders the faceless mark, never a face", async () => {
    await render(<LoopCharacter expression="glad" size={28} title="" />);
    const mark = document.querySelector('[data-c2-asset="mark"]');
    expect(mark).not.toBeNull();
    expect(mark?.getAttribute("data-c2-faceless")).toBe("1");
    expect(document.querySelector("img")).toBeNull();
  });

  it("at hero size renders the requested real-signal expression asset", async () => {
    await render(<LoopCharacter expression="thinking" size={88} title="" />);
    const img = document.querySelector("img");
    expect(img?.getAttribute("src")).toContain("opal-c2-character-thinking.svg");
    expect(img?.getAttribute("data-c2-expression")).toBe("thinking");
  });

  it("presence mapping: no signal is Rest; expressions need a real signal", () => {
    expect(loopExpressionForPresence(null)).toBe("rest");
    expect(loopExpressionForPresence("idle")).toBe("rest");
    expect(loopExpressionForPresence("listening")).toBe("listening");
    expect(loopExpressionForPresence("thinking")).toBe("thinking");
    expect(loopExpressionForPresence("completed")).toBe("glad");
    expect(loopExpressionForPresence("empty")).toBe("sleep");
  });
});
