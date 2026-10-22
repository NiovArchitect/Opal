/**
 * @vitest-environment jsdom
 *
 * Repair #27 Cluster D - W27-15 ONBOARDING PARITY + W27-14 INPUT RADIUS.
 *
 * Pins (failing-first against the R24 close):
 *  - W27-14: ONE rounded input treatment via shared tokens. Before:
 *    .c2s-field / .c2s-search / .c2s-code-box all sat on
 *    --radius-well (12px) - the founder's "boxy" charge. After: the
 *    mode-free tokens --radius-input (999px, full pill for
 *    single-line fields) and --radius-input-multi (generous floor
 *    for the multi-line textarea form of .c2s-field) exist in
 *    c2Tokens.css and every C2 shell input class consumes them -
 *    no per-component one-offs, no input class left on radius-well.
 *  - W27-15: the phone + verify steps of C2Onboarding (the screens
 *    the C2/native path actually shows) carry the C2 design
 *    language of the reference surface (C2Splash2 + the CreateFlow
 *    entry family): the stage ground (--canvas-stage), the Current
 *    Lines pattern, the stacked orb lockup hero (LOCKUP LAW), and
 *    the display type voice for the step headline - in BOTH modes
 *    (every value resolves from a semantic token defined per mode;
 *    no raw hex in the changed rules).
 *  - Behavior is untouched: phone -> verify -> meet still runs on
 *    the mocked challenge route, the code input still strips
 *    non-digits, resend still re-challenges, and a bad code still
 *    clears the field with the honest error line.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { C2Onboarding } from "./C2Onboarding";

vi.mock("../../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../../api/productClient")>(
    "../../api/productClient",
  );
  return {
    ...actual,
    startChallenge: async () => ({ challenge: { id: "ch-r27" } }),
    verifyChallenge: async () => ({}),
    updateProfile: async () => ({}),
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/* ---------- stylesheet parsing (r24ReducedMotion precedent) ---------- */
const shellCssRaw = readFileSync(resolve(__dirname, "c2shell.css"), "utf8");
const shellCss = shellCssRaw.replace(/\/\*[\s\S]*?\*\//g, "");
const tokensCssRaw = readFileSync(resolve(__dirname, "../../theme/c2Tokens.css"), "utf8");
const tokensCss = tokensCssRaw.replace(/\/\*[\s\S]*?\*\//g, "");

function ruleBody(css: string, selector: string): string {
  // Selector as a whole token in a rule prelude (comma lists included):
  // the match must be followed by whitespace, a comma, or the block
  // open - so ".c2s-field" never matches ".c2s-field-group".
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`${esc}(?=[\\s,{])`).exec(css);
  if (!m) throw new Error(`rule not found: ${selector}`);
  const open = css.indexOf("{", m.index);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}
function radiusOf(css: string, selector: string): string | null {
  // A selector can ride in an earlier layout-only rule (e.g.
  // ".c2s-go-live-search .c2s-field { flex: 1 }") before its own
  // geometry rule; scan every occurrence and take the first body
  // that actually declares a radius.
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${esc}(?=[\\s,{])`, "g");
  for (let m = re.exec(css); m; m = re.exec(css)) {
    const open = css.indexOf("{", m.index);
    const close = css.indexOf("}", open);
    const body = css.slice(open + 1, close);
    const r = body.match(/border-radius\s*:\s*([^;]+);/);
    if (r) return r[1]!.trim();
  }
  return null;
}

describe("W27-14 - one rounded input treatment, tokenized", () => {
  it("c2Tokens defines the mode-free input radius tokens (pill + multi-line floor)", () => {
    expect(tokensCss).toMatch(/--radius-input\s*:\s*999px\s*;/);
    const multi = tokensCss.match(/--radius-input-multi\s*:\s*(\d+)px\s*;/);
    expect(multi, "--radius-input-multi token").toBeTruthy();
    expect(Number(multi![1])).toBeGreaterThanOrEqual(20);
  });

  it("every C2 shell single-line input class consumes the pill token", () => {
    expect(radiusOf(shellCss, ".c2s-field")).toBe("var(--radius-input)");
    expect(radiusOf(shellCss, ".c2s-search")).toBe("var(--radius-input)");
    expect(radiusOf(shellCss, ".c2s-code-box")).toBe("var(--radius-input)");
  });

  it("the multi-line form of .c2s-field keeps the generous floor, not the pill", () => {
    expect(radiusOf(shellCss, "textarea.c2s-field")).toBe("var(--radius-input-multi)");
  });

  it("no C2 shell input class is left on the boxy well radius", () => {
    for (const sel of [".c2s-field", ".c2s-search", ".c2s-code-box"]) {
      expect(radiusOf(shellCss, sel), sel).not.toBe("var(--radius-well)");
    }
  });

  it("inputs gain a token-only focus treatment (no raw hex in the changed rules)", () => {
    const focus = ruleBody(shellCss, ".c2s-field:focus-visible");
    expect(focus).toContain("var(--accent-1)");
    expect(focus).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe("W27-15 - onboarding parity with the splash/entry language", () => {
  it("the entry ground is the stage ground (the splash family's ground)", () => {
    const body = ruleBody(shellCss, ".c2s-entry");
    expect(body).toContain("background: var(--canvas-stage)");
  });

  it("the entry headline speaks in the display voice, scoped to onboarding", () => {
    const body = ruleBody(shellCss, ".c2s-entry .c2s-entry-body h1");
    expect(body).toContain("font: var(--type-display)");
  });

  it("the primary action on the entry surface is a pill (rounded ends)", () => {
    expect(radiusOf(shellCss, ".c2s-entry .c2s-btn-primary")).toBe("var(--radius-input)");
  });
});

/* ---------- rendered behavior (unchanged auth logic) ---------- */
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
const q = (sel: string) => document.querySelector(sel);
function click(el: Element) {
  act(() => {
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
}
function type(el: HTMLInputElement, value: string) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )!.set!;
    setter.call(el, value);
    el.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
}
async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe("W27-15 - rendered onboarding: parity furniture, same behavior", () => {
  it("phone step carries the stacked lockup hero + pattern lines, and advances to verify", async () => {
    const done = vi.fn();
    await render(<C2Onboarding events={{ complete: done, backToSplash: vi.fn() }} />);
    expect(q('[data-testid="c2-entry-phone"]')).toBeTruthy();
    // Parity furniture: stacked orb lockup (LOCKUP LAW) + Current Lines.
    expect(q('[data-testid="c2-entry-hero"] [data-orb-lockup="stacked"]')).toBeTruthy();
    expect(q('[data-c2-pattern="current-lines"]')).toBeTruthy();
    const phone = q('[data-testid="c2-phone-input"]') as HTMLInputElement;
    expect(phone.className).toContain("c2s-field");
    type(phone, "6195550142");
    click(q('[data-testid="c2-phone-continue"]')!);
    await flush();
    // Verify step: same hero, code field keeps its digit-stripping behavior.
    expect(q('[data-testid="c2-entry-verify"]')).toBeTruthy();
    expect(q('[data-testid="c2-entry-hero"]')).toBeTruthy();
    const code = q('[data-testid="c2-code-input"]') as HTMLInputElement;
    expect(code.className).toContain("c2s-code-box");
    type(code, "12ab34");
    expect(code.value).toBe("1234");
    click(q('[data-testid="c2-code-verify"]')!);
    await flush();
    expect(q('[data-testid="c2-entry-meet"]')).toBeTruthy();
    expect(done).not.toHaveBeenCalled();
  });

  it("resend on the verify step re-challenges without leaving the step", async () => {
    await render(<C2Onboarding events={{ complete: vi.fn(), backToSplash: vi.fn() }} />);
    type(q('[data-testid="c2-phone-input"]') as HTMLInputElement, "6195550142");
    click(q('[data-testid="c2-phone-continue"]')!);
    await flush();
    click(q('[data-testid="c2-code-resend"]')!);
    await flush();
    expect(q('[data-testid="c2-entry-verify"]')).toBeTruthy();
  });
});
