/**
 * Repair #15-A - OTP AutoFill lock.
 *
 * Founder bug: the verification code had to be typed by hand; iOS never
 * offered the one-tap code from Messages. Root cause: the fr07 input that
 * carried autoComplete="one-time-code" was an invisible overlay
 * (.fr-code-input-bridge { opacity: 0 }) painting digits into aria-hidden
 * decorative span cells. iOS/WebKit only offers Security Code AutoFill for
 * a visible, rendered input, so the suggestion never appeared - on the exact
 * surface the founder uses (web first-run inside the mobile WebView shell,
 * NativeFirstRunSurface -> FirstRunExperience fr07).
 *
 * These assertions lock the fix: one visible single input per surface with
 * the autofill attributes, and no invisible-bridge pattern ever again.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const css = readFileSync(resolve(root, "styles.css"), "utf8");
const fre = readFileSync(resolve(__dirname, "FirstRunExperience.tsx"), "utf8");

function block(source: string, from: string, to: string): string {
  return source.slice(source.indexOf(from), source.indexOf(to));
}

describe("Repair #15-A - OTP autofill (first-run fr07)", () => {
  const verifyBlock = block(fre, 'step === "fr07"', '</AnimatePresence>');

  it("has exactly one code input and it is a single field, not per-digit splits", () => {
    expect(verifyBlock.match(/<input/g)).toHaveLength(1);
    expect(verifyBlock).not.toMatch(/fr07-code-cell/);
    expect(verifyBlock).not.toMatch(/fr-code-cells/);
  });

  it("code input carries the iOS/WebKit autofill contract", () => {
    expect(verifyBlock).toMatch(/autoComplete="one-time-code"/);
    expect(verifyBlock).toMatch(/inputMode="numeric"/);
    expect(verifyBlock).toMatch(/type="text"/);
    expect(verifyBlock).toMatch(/data-testid="fr07-code-input"/);
  });

  it("code input is not the invisible bridge overlay", () => {
    expect(verifyBlock).not.toMatch(/fr-code-input-bridge/);
    expect(fre).not.toMatch(/fr-code-input-bridge/);
  });

  it("phone input is a real tel field (autofill + correct keyboard)", () => {
    const phoneBlock = block(fre, 'step === "fr06"', 'step === "fr07"');
    expect(phoneBlock).toMatch(/id="fr-phone"[\s\S]{0,200}?type="tel"/);
  });
});

describe("Repair #15-A - OTP autofill (CSS visibility law)", () => {
  it("no bridge rule exists in the stylesheet", () => {
    expect(css).not.toMatch(/fr-code-input-bridge/);
  });

  it("the verify code input is styled as a visible field", () => {
    const rule = css.match(/\.fr-auth-v4\.fr-verify \.fr-code-input \{([\s\S]*?)\}/);
    expect(rule).not.toBeNull();
    expect(rule![1]).toMatch(/opacity:\s*1/);
    expect(rule![1]).not.toMatch(/opacity:\s*0/);
    expect(rule![1]).toMatch(/background:/);
    expect(rule![1]).toMatch(/border:/);
  });

  it("no opacity:0 is applied to any fr-code input rule", () => {
    const codeRules = css.match(/[^{}]*fr-code[^{}]*\{[^}]*\}/g) || [];
    for (const rule of codeRules) {
      expect(rule).not.toMatch(/opacity:\s*0\s*;/);
    }
  });
});

