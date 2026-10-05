/**
 * Promise presentation — flex immersion over frozen canonical asset.
 * SHA of PNG bytes stays frozen; layout is live flex (no absolute content).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CANONICAL_PROMISE_SHA,
  PROMISE_HEADLINE,
  PROMISE_SUB,
} from "./FirstRunPromisePage";

const css = readFileSync(resolve(__dirname, "../styles.css"), "utf8");
const promise = readFileSync(resolve(__dirname, "FirstRunPromisePage.tsx"), "utf8");
const app = readFileSync(resolve(__dirname, "../OpalApp.tsx"), "utf8");

describe("Promise flex immersion over canonical asset", () => {
  it("PROMISE_CANONICAL_SHA_UNCHANGED", () => {
    expect(CANONICAL_PROMISE_SHA).toBe(
      "20c5210ff89e911368479463780eed37dce6fe2e994c61cda13982eaa2ddcf10",
    );
    expect(promise).toMatch(/data-promise-fit="background-flex"/);
    expect(promise).toMatch(/data-figma-canonical="646:2"/);
    expect(promise).toMatch(/data-figma-presentation="710:8"/);
    expect(promise).toMatch(/opal-promise-atmosphere/);
    expect(css).toMatch(/\.first-run-promise-atmosphere/);
  });

  it("PROMISE_FLEX_NO_ABSOLUTE_CONTENT", () => {
    expect(css).toMatch(
      /\.first-run-promise-content\s*\{[^}]*justify-content:\s*space-between/s,
    );
    expect(css).toMatch(
      /\.first-run-promise-content\s*\{[^}]*display:\s*flex/s,
    );
    expect(css).toMatch(/\.first-run-promise-page\s*\{[^}]*display:\s*flex/s);
    // Content CTA is flex child — not absolute top:590px geometry
    const ctaBlock = css.slice(css.indexOf(".first-run-promise-cta {"));
    const ctaRule = ctaBlock.slice(0, ctaBlock.indexOf("}", 1) + 1);
    expect(ctaRule).not.toMatch(/position:\s*absolute/);
    expect(ctaRule).not.toMatch(/top:\s*590px/);
  });

  it("PROMISE_LIVE_COPY_AND_SPECTRAL_ENTER", () => {
    expect(promise).toContain(PROMISE_HEADLINE);
    expect(promise).toContain(PROMISE_SUB);
    expect(css).toMatch(/\.first-run-promise-enter[\s\S]{0,400}color:\s*#f8faff/i);
    expect(css).toMatch(/\.first-run-promise-enter::before/);
    expect(css).toMatch(/#00e5ff 0%, #ffc86b 50%, #d946ff 100%/i);
    expect(css).toMatch(/\.first-run-promise-signin[\s\S]*?#1a2338/i);
    expect(css).toMatch(/\.first-run-promise-enter[\s\S]*?height:\s*52px/);
    expect(css).toMatch(/\.first-run-promise-signin[\s\S]*?height:\s*46px/);
    expect(promise).toMatch(/data-testid="opal-promise-enter"/);
    expect(promise).toMatch(/Enter Opal/);
    expect(promise).toMatch(/I already have an account/);
  });

  it("PROMISE_TAGLINE_AND_HERO_TESTIDS", () => {
    expect(promise).toMatch(/opal-promise-headline/);
    expect(promise).toMatch(/opal-promise-sub/);
    expect(promise).toMatch(/opal-promise-holy-hook|opal-promise-tagline/);
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
