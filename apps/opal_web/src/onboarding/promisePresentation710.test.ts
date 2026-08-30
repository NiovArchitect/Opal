/**
 * P0-05.11 Wave A — Promise presentation 710:8 over frozen 646:2.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CANONICAL_PROMISE_SHA } from "./FirstRunPromisePage";

const css = readFileSync(resolve(__dirname, "../styles.css"), "utf8");
const promise = readFileSync(resolve(__dirname, "FirstRunPromisePage.tsx"), "utf8");
const app = readFileSync(resolve(__dirname, "../OpalApp.tsx"), "utf8");

describe("P0-05.11 Promise 710:8 presentation", () => {
  it("PROMISE_CANONICAL_SHA_UNCHANGED", () => {
    expect(CANONICAL_PROMISE_SHA).toBe(
      "20c5210ff89e911368479463780eed37dce6fe2e994c61cda13982eaa2ddcf10",
    );
    expect(promise).toMatch(/object-fit:\s*contain|data-promise-fit="contain"/);
    expect(promise).toMatch(/data-figma-canonical="646:2"/);
    expect(promise).toMatch(/data-figma-presentation="710:8"/);
  });

  it("PROMISE_CTA_NOT_TRANSPARENT", () => {
    expect(css).toMatch(/\.first-run-promise-enter[\s\S]{0,400}color:\s*#f8faff/i);
    expect(css).toMatch(/\.first-run-promise-enter,\n\.first-run-promise-signin[\s\S]*?width:\s*304px/);
    expect(css).toMatch(/\/\* 813:6 Enter Opal[\s\S]*?height:\s*52px/);
    expect(css).toMatch(/\.first-run-promise-enter::before/);
    expect(css).toMatch(/\.first-run-promise-signin[\s\S]*?#1a2338/i);
    // Critical path must not use transparent CTA text (legacy hotspots)
    const block = css.slice(
      css.indexOf("FirstRunPromisePage — presentation 710:8"),
      css.indexOf("Legacy nested Promise styles"),
    );
    expect(block).not.toMatch(/color:\s*transparent/);
  });

  it("PROMISE_VISIBLE_ENTER_EQUALS_HIT structural sizes", () => {
    expect(css).toMatch(/\.first-run-promise-enter[\s\S]*?width:\s*304px/);
    expect(css).toMatch(/\.first-run-promise-enter[\s\S]*?height:\s*52px/);
    expect(css).toMatch(/\.first-run-promise-signin[\s\S]*?width:\s*304px/);
    expect(css).toMatch(/\.first-run-promise-signin[\s\S]*?height:\s*46px/);
    expect(promise).toMatch(/data-testid="opal-promise-enter"/);
    expect(promise).toMatch(/Enter Opal/);
    expect(promise).toMatch(/I already have an account/);
  });

  it("status mask is presentation-only", () => {
    expect(promise).toMatch(/opal-promise-status-mask/);
    expect(css).toMatch(/\.first-run-promise-status-mask[\s\S]*?pointer-events:\s*none/);
  });
});

describe("P0-05.11 Splash wordmark spectral + Global Opal mount", () => {
  it("SPLASH_WORDMARK_HAS_SPECTRAL_STOPS", () => {
    const wm = css.slice(css.indexOf(".fr-splash-wordmark {"));
    expect(wm).toMatch(/#15bae5/i);
    expect(wm).toMatch(/#74d9ed/i);
    expect(wm).toMatch(/#f3c36b/i);
    expect(wm).toMatch(/#e27a67/i);
    expect(wm).toMatch(/#d85acd/i);
    expect(wm).toMatch(/#7b45e5/i);
    expect(wm).toMatch(/background-clip:\s*text/);
  });

  it("GLOBAL_OPAL_NOT_OVERLAY_OVER_GRAPHS", () => {
    expect(app).toMatch(/data-opal-mount="full-screen"/);
    expect(app).toMatch(/opal-ambient-destination/);
    expect(app).toMatch(/opalAmbientOpen \? null : tab === "graphs"/);
    expect(css).toMatch(/data-opal-mount="full-screen"/);
  });
});
