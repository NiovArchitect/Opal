import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SIGNAL_HEX,
  goldAllowedFor,
  signalForCallsKind,
  signalForProductKind,
} from "./signalGrammar";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("P3 Signal Grammar", () => {
  it("maps Calls kinds to correct channels (P2 reference)", () => {
    expect(signalForCallsKind("ready")?.state).toBe("confirmed");
    expect(signalForCallsKind("ready")?.hex).toBe(SIGNAL_HEX.confirmed);
    expect(signalForCallsKind("graph_updated")?.state).toBe("changed");
    expect(signalForCallsKind("callback")?.state).toBe("needs_attention");
    expect(signalForCallsKind(undefined)).toBeNull();
  });

  it("goldAllowedFor requires earned reality — not confidence", () => {
    expect(goldAllowedFor({})).toBe(false);
    expect(goldAllowedFor({ providerConfirmed: true })).toBe(true);
    expect(goldAllowedFor({ participantConfirmed: true })).toBe(true);
  });

  it("product ready uses confirmed gold; set is settled not gold", () => {
    expect(signalForProductKind("ready")?.hex).toBe(SIGNAL_HEX.confirmed);
    expect(signalForProductKind("set")?.state).toBe("settled");
    expect(signalForProductKind("plan_forming")?.state).toBe("provisional");
  });

  it("CSS exposes --signal-* tokens", () => {
    const css = readFileSync(resolve(root, "theme/spectralTokens.css"), "utf8");
    expect(css).toMatch(/--signal-active/);
    expect(css).toMatch(/--signal-confirmed/);
    expect(css).toMatch(/--signal-needs-attention/);
    expect(css).toMatch(/--signal-provisional/);
    expect(css).toMatch(/--signal-settled/);
  });

  it("Activity destination stays CURRENT; icon source not shipped as runtime art", () => {
    const act = readFileSync(resolve(root, "opalUi/ActivityDestination.tsx"), "utf8");
    expect(act).toMatch(/618:2384/);
    expect(act).toMatch(/data-signal-state/);
    expect(act).not.toMatch(/node-id=1046/);
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    expect(app).not.toMatch(/1046:2/);
  });

  it("Chats passive context is not cyan-by-kind", () => {
    const css = readFileSync(resolve(root, "styles.css"), "utf8");
    expect(css).toMatch(/\.chats-home-context[\s\S]*?var\(--signal-settled\)/);
    expect(css).not.toMatch(
      /\.chats-home-row\[data-kind="direct"\] \.chats-home-context \{ color: #00E5FF/,
    );
  });

  it("amber breath is not infinite", () => {
    const css = readFileSync(resolve(root, "theme/technicolorProduction.css"), "utf8");
    expect(css).toMatch(/tc-chip-amber-breath 5\.8s ease-in-out 1/);
    expect(css).not.toMatch(/tc-chip-amber-breath 5\.8s ease-in-out infinite/);
  });
});
