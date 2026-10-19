/**
 * R19 W27 (AT-12) - pulse/breath signatures carry INTENT KEYS.
 *
 * The rulebook's discipline: a signature's name, period, and element
 * are part of its identity; one name may never carry two meanings.
 * Before this wave "c1-pulse" named BOTH the live dot (liveness)
 * and the read-aloud orb (speaking) at two different periods, the
 * legacy "opal-action-pulse" marked a WORKING dot (borrowing the
 * action state's name), and the C1 live dot ran 2s against the
 * shell's 2.4s live key. These pins hold the aligned map:
 *
 *   LIVE      2.4s opacity .55-1   c2s-live-pulse, c1-live-pulse,
 *                                  unify-happening-pulse (AT-15)
 *   SPEAKING  1.2s opacity+scale   c1-speaking-pulse
 *   MIC       1s                   opal-center-chat-mic-pulse,
 *                                  opal-living-mic-pulse
 *   TYPING    1.1s staggered       opal-center-chat-typing-pulse
 *   WORKING   1.2s opacity+scale   opal-working-pulse
 *   FORMING   5s opacity .62-1     unify-forming-breath
 *   PRESENCE  5s breath / 3s sway  c1-presence-breath / -sway
 *   HERO      --motion-breath(4s)  c2-hero-breath
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = resolve(__dirname, "..");
const c1 = readFileSync(resolve(src, "opalUi/c1/c1.css"), "utf8");
const c2 = readFileSync(resolve(src, "c2/c2.css"), "utf8");
const c2shell = readFileSync(resolve(src, "c2/shell/c2shell.css"), "utf8");
const unify = readFileSync(resolve(src, "theme/unifyChats.css"), "utf8");
const legacy = readFileSync(resolve(src, "styles.css"), "utf8");

describe("AT-12 signature -> intent key map", () => {
  it("LIVE is one signature everywhere: 2.4s, opacity .55-1", () => {
    expect(c2shell).toContain("animation: c2s-live-pulse 2.4s ease-in-out infinite");
    expect(c1).toContain("animation: c1-live-pulse 2.4s ease-in-out infinite");
    expect(unify).toContain("animation: unify-happening-pulse 2.4s ease-in-out infinite");
  });

  it("SPEAKING never borrows the live pulse: c1-pulse is dead", () => {
    expect(c1).not.toContain("animation: c1-pulse");
    expect(c1).not.toContain("@keyframes c1-pulse ");
    expect(c1).toContain("animation: c1-speaking-pulse 1.2s ease-in-out infinite");
    expect(c1).toContain("@keyframes c1-speaking-pulse");
  });

  it("PRESENCE and HERO breaths carry their keys in their names", () => {
    expect(c1).toContain("animation: c1-presence-breath 5s ease-in-out infinite");
    expect(c1).toContain("animation: c1-presence-sway 3s ease-in-out infinite");
    expect(c1).not.toContain("@keyframes c1-breath");
    expect(c1).not.toContain("@keyframes c1-sway");
    expect(c2).toContain("animation: c2-hero-breath var(--motion-breath)");
    expect(c2).not.toContain("@keyframes c2-breath");
    expect(unify).toContain("animation: unify-forming-breath 5s ease-in-out infinite");
  });

  it("legacy collisions renamed: WORKING is not 'action', TYPING is named, MIC periods agree", () => {
    expect(legacy).not.toContain("opal-action-pulse");
    expect(legacy).toContain("animation: opal-working-pulse 1.2s ease-in-out infinite");
    expect(legacy).not.toContain("@keyframes opal-center-chat-pulse");
    expect(legacy).toContain("animation: opal-center-chat-typing-pulse 1.1s ease-in-out infinite");
    expect(legacy).toContain("animation: opal-center-chat-mic-pulse 1s ease-in-out infinite");
    expect(legacy).toContain("animation: opal-living-mic-pulse 1s ease-in-out infinite");
  });
});
