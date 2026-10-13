import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  SETTINGS_WIRE_CLASSIFICATION,
  settingsWireSummary,
} from "./settingsWireClass";

const root = resolve(dirname(fileURLToPath(import.meta.url)));
const youSrc = readFileSync(resolve(root, "YouSettingsDestination.tsx"), "utf8");
const appSrc = readFileSync(resolve(root, "../OpalApp.tsx"), "utf8");
const clientSrc = readFileSync(resolve(root, "../api/productClient.ts"), "utf8");

describe("Pass 1C settings live-wire classification", () => {
  it("summary counts are stable", () => {
    const s = settingsWireSummary();
    expect(s.green).toBeGreaterThanOrEqual(9);
    expect(s.honest_gate).toBeGreaterThanOrEqual(1);
    expect(s.hidden).toBe(0);
  });

  it("nearby-range is an honest gate (no static pretend range)", () => {
    const row = SETTINGS_WIRE_CLASSIFICATION.find((r) => r.id === "nearby-range");
    expect(row?.class).toBe("HONEST_GATE");
    expect(youSrc).toMatch(
      /id:\s*"nearby-range"[\s\S]{0,280}?blockedReason:\s*"Needs discovery-distance preference API/,
    );
    expect(youSrc).not.toMatch(/id:\s*"nearby-range"[\s\S]{0,120}?value:\s*"25 mi"/);
  });

  it("GREEN toggles wire to product preference APIs", () => {
    expect(youSrc).toMatch(/updateAssistPreference/);
    expect(youSrc).toMatch(/getAssistPreference/);
    expect(youSrc).toMatch(/updateHomeTimezone/);
    expect(youSrc).toMatch(/updateProfile/);
    expect(appSrc).toMatch(/updateMessagingPreferences/);
    expect(clientSrc).toMatch(/updateAssistPreference|assist_calls/);
    expect(clientSrc).toMatch(/updateMessagingPreferences|read_receipts_enabled/);
  });

  it("every classified GREEN row exists in YouSettingsDestination", () => {
    for (const row of SETTINGS_WIRE_CLASSIFICATION.filter((r) => r.class === "GREEN")) {
      expect(youSrc, row.id).toContain(`id: "${row.id}"`);
    }
  });

  it("honest gates never claim Coming soon", () => {
    expect(youSrc).not.toMatch(/Coming soon/i);
  });
});
