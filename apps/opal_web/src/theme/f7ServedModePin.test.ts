/**
 * @vitest-environment jsdom
 *
 * Repair #19 W21 (F7) — THE SERVED-BUILD PIN the battery
 * recommended: data-mode is stamped on the PLAIN entry path, with
 * no shell flag anywhere.
 *
 * The hazard (pack F7): App.tsx renders the C2 shell
 * unconditionally, but both pre-paint mode stamps — public/
 * c2-boot.js and main.tsx's runtime setup — were gated on
 * VITE_OPAL_SHELL=c2 / the shell marker, so a flagless build
 * served always-light first paint regardless of the stored or
 * system preference.
 *
 * Pin, two legs:
 *  1. functional: the actual public/c2-boot.js, evaluated in a
 *     fresh document with NO shell marker/flag anywhere, stamps
 *     data-mode from the stored preference (dark and light);
 *  2. source: main.tsx runs the mode setup unconditionally (the
 *     shell-flag gate is gone from the entry file), and the boot
 *     script contains no shell gate.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

const WEB_ROOT = resolve(__dirname, "../..");
const BOOT = readFileSync(resolve(WEB_ROOT, "public/c2-boot.js"), "utf8");
const MAIN = readFileSync(resolve(WEB_ROOT, "src/main.tsx"), "utf8");

function runBoot() {
  // Evaluate the served boot script exactly as <head> would.
  window.eval(BOOT);
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-mode");
  document.documentElement.removeAttribute("data-shell");
});

describe("F7 — data-mode is stamped on the plain entry path (no flag)", () => {
  it("boot stamps dark from the stored preference, no shell marker anywhere", () => {
    localStorage.setItem("opal.c2.mode.v1", "dark");
    expect(localStorage.getItem("opal.c2.shell.v1")).toBeNull();
    runBoot();
    expect(document.documentElement.getAttribute("data-mode")).toBe("dark");
    expect(document.documentElement.getAttribute("data-shell")).toBe("c2");
  });

  it("boot stamps light from the stored preference, no shell marker anywhere", () => {
    localStorage.setItem("opal.c2.mode.v1", "light");
    runBoot();
    expect(document.documentElement.getAttribute("data-mode")).toBe("light");
  });

  it("boot contains no shell gate", () => {
    expect(BOOT).not.toMatch(/shell\s*!==\s*"c2"/);
    expect(BOOT).not.toMatch(/opal\.c2\.shell/);
    expect(BOOT).toMatch(/setAttribute\("data-mode", mode\)/);
  });

  it("main.tsx runs mode setup unconditionally (no isC2ShellEnabled gate in the entry)", () => {
    expect(MAIN).not.toMatch(/if\s*\(\s*isC2ShellEnabled\(\)\s*\)/);
    expect(MAIN).toMatch(/applyStoredC2Mode\(\)/);
    expect(MAIN).toMatch(/installC2ModeSystemListener\(\)/);
    expect(MAIN).toMatch(/setAttribute\("data-shell", "c2"\)/);
  });
});
