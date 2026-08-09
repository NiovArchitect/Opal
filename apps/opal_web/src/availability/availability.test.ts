import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { formatOverlapRange } from "./formatRange";
import { semanticStateForSignal } from "../theme/technicolorProduction";

const root = resolve(__dirname, "..");

describe("availability UI — age-12 + color truth", () => {
  it("formats real backend ranges without inventing times", () => {
    const s = formatOverlapRange(
      "2026-08-14T01:30:00.000Z",
      "2026-08-14T04:00:00.000Z",
    );
    expect(s.length).toBeGreaterThan(5);
    expect(s).not.toMatch(/intersection|constraint|temporal/i);
  });

  it("maps availability_overlap to recognition, not completion", () => {
    expect(semanticStateForSignal("availability_overlap")).toBe("recognition");
    expect(semanticStateForSignal("option_surfaced")).toBe("recognition");
    expect(semanticStateForSignal("set")).toBe("completion");
    expect(semanticStateForSignal("ready")).toBe("completion");
  });

  it("productClient has full availability surface", () => {
    const client = readFileSync(resolve(root, "api/productClient.ts"), "utf8");
    for (const name of [
      "listMyAvailabilityWindows",
      "createAvailabilityWindow",
      "updateAvailabilityWindow",
      "deleteAvailabilityWindow",
      "shareAvailabilityWindows",
      "revokeAvailabilityShare",
      "listSharedAvailability",
      "listMyAvailabilityInConversation",
      "getAvailabilityOverlap",
    ]) {
      expect(client).toContain(name);
    }
  });

  it("sheet and entry avoid calendar product chrome + private Opal field", () => {
    const sheet = readFileSync(resolve(root, "availability/AvailabilitySheet.tsx"), "utf8");
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    const css = readFileSync(resolve(root, "styles.css"), "utf8");
    expect(sheet).toMatch(/When could work\?/);
    expect(sheet).toMatch(/Only you can see this/);
    expect(sheet).toMatch(/Share only what you choose|Share these times/);
    expect(sheet).toMatch(/opal-private-field/);
    expect(sheet).not.toMatch(/calendar grid|month view|week view/i);
    expect(sheet).not.toMatch(/lumen-card|find-people-sheet/);
    expect(css).toMatch(/opal-private-field/);
    expect(css).toMatch(/opal-private-possibility/);
    expect(app).toMatch(/Find a time/);
    expect(app).toMatch(/availability-sheet|AvailabilitySheet/);
    expect(app).toMatch(/OpalInsightField|opal-moment-availability-overlap/);
    expect(app).toMatch(/OpalResolution/);
    expect(app).toMatch(/resolvePrimaryOpalSurface/);
  });

  it("Set uses OpalResolution material, not a green status pill alone", () => {
    const css = readFileSync(resolve(root, "styles.css"), "utf8");
    const res = readFileSync(resolve(root, "opalUi/OpalResolution.tsx"), "utf8");
    expect(css).toMatch(/\.opal-resolution\s*\{/);
    expect(css).toMatch(/opal-resolution-converge|opal-resolution-enter/);
    expect(res).toMatch(/Set/);
    expect(res).toMatch(/phase-\$\{phase\}|"enter"|"calm"|phase-calm/);
    // No confetti / gamification
    expect(res.toLowerCase()).not.toMatch(/confetti|streak|achievement modal/);
    expect(res).not.toMatch(/\bbadge\b/i);
  });

  it("CSS reserves emerald for set/ready, not availability_overlap", () => {
    const css = readFileSync(resolve(root, "styles.css"), "utf8");
    expect(css).toMatch(/signal-availability_overlap/);
    expect(css).toMatch(/signal-set/);
    // overlap must not use #7eecc0 block alone as only rule — set has emerald
    const overlapBlock = css.slice(
      css.indexOf("signal-availability_overlap"),
      css.indexOf("signal-availability_overlap") + 400,
    );
    expect(overlapBlock).not.toMatch(/#7eecc0/);
  });

  it("realtime listens for shared-safe availability events", () => {
    const rt = readFileSync(resolve(root, "realtime/RealtimeClient.ts"), "utf8");
    expect(rt).toMatch(/availability:shared/);
    expect(rt).toMatch(/availability:revoked/);
    expect(rt).toMatch(/onAvailability/);
  });

  it("reduced motion kills moment entrance animation but keeps Edge glow", () => {
    const css = readFileSync(resolve(root, "styles.css"), "utf8");
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
    expect(css).toMatch(/opal-moment-enter/);
    // P0: reduced-motion must not strip resting Edge box-shadow globally.
    const reduced = css.slice(css.indexOf("prefers-reduced-motion"));
    expect(reduced).not.toMatch(/\.opal-moment\s*\{\s*box-shadow:\s*none/);
    expect(css).toMatch(/\.opal-moment\.journey\.opal-edge\s*\{[^}]*box-shadow/s);
  });

  it("context chip touch target is at least 44px", () => {
    const css = readFileSync(resolve(root, "styles.css"), "utf8");
    expect(css).toMatch(/\.opal-context-chip\s*\{[^}]*min-height:\s*44px/s);
  });

  it("OpalApp uses one-primary-surface rule", () => {
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    const grammar = readFileSync(resolve(root, "opalUi/grammar.ts"), "utf8");
    expect(app).toMatch(/hasPrivateWindows/);
    expect(app).toMatch(/resolvePrimaryOpalSurface/);
    expect(grammar).toMatch(/ONE meaningful Opal surface/);
    expect(grammar).toMatch(/resolvePrimaryOpalSurface/);
  });

  it("review: continuous thread; never leave Jordan for a feature route", () => {
    const review = readFileSync(
      resolve(root, "availability/AvailabilityReview.tsx"),
      "utf8",
    );
    const code = review.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/count only, never a roster/);
    expect(code).not.toMatch(/Quiet → notice/);
    expect(review).toMatch(/review-chrome/);
    expect(review).toMatch(/review-phone/);
    expect(review).toMatch(/Jordan Lee/);
    expect(review).toMatch(/OpalThreadMoment/);
    expect(review).toMatch(/How was your week\?/);
    expect(review).toMatch(/opal-private-overlay/);
    const law = readFileSync(
      resolve(__dirname, "../../../../docs/design/ui-ux/conversation-timeline-law.md"),
      "utf8",
    );
    expect(law).toMatch(/CONVERSATION|social timeline|primary social timeline/i);
  });
});
