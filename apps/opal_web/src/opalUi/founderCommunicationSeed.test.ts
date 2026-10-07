/**
 * P0-05.1 — Founder communication seed firewall + wiring.
 * Protects both sides: opt-in seed path exists; production default never injects.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isFounderSeedEnabled } from "./founderGraphSeed";

const root = resolve(__dirname, "..");
const read = (...p: string[]) => readFileSync(resolve(root, ...p), "utf8");

describe("P0-05.1 founder communication seed", () => {
  it("founder seed is off by default (production firewall)", () => {
    expect(isFounderSeedEnabled()).toBe(false);
  });

  it("LAN native-host opt-in enables seed without explicit query (Expo ProductWebSurface)", () => {
    sessionStorage.setItem("opal_native_host", "1");
    // jsdom hostname is localhost — private LAN law must fire.
    expect(isFounderSeedEnabled()).toBe(true);
    sessionStorage.removeItem("opal_native_host");
    localStorage.removeItem("opal.founder_seed.opt_in.persist.v1");
    sessionStorage.removeItem("opal.founder_seed.opt_in.v1");
    expect(isFounderSeedEnabled()).toBe(false);
  });

  it("product client exposes ensureFounderCommunicationSeed to existing Messages API", () => {
    const client = read("api/productClient.ts");
    expect(client).toMatch(/ensureFounderCommunicationSeed/);
    expect(client).toMatch(/\/dev\/founder-communication-seed/);
    expect(client).toMatch(/explicit_opt_in:\s*true/);
  });

  it("OpalApp only calls founder communication seed when founder seed enabled", () => {
    const app = read("OpalApp.tsx");
    expect(app).toMatch(/ensureFounderCommunicationSeed/);
    // Must gate seed before listConversations inside refreshLive
    const refreshIdx = app.indexOf("const refreshLive");
    expect(refreshIdx).toBeGreaterThan(-1);
    const listIdx = app.indexOf("listConversations(s.access_token)", refreshIdx);
    expect(listIdx).toBeGreaterThan(refreshIdx);
    const block = app.slice(refreshIdx, listIdx);
    expect(block).toMatch(/isFounderSeedEnabled\(\)/);
    expect(block).toMatch(/await ensureFounderCommunicationSeed/);
  });

  it("does not invent a parallel founder chats component", () => {
    const app = read("OpalApp.tsx");
    expect(app).not.toMatch(/FOUNDER_CHATS_COMPONENT|FounderChatsHome|FOUNDER_DIRECT_COMPONENT/);
    expect(app).toMatch(/listConversations/);
    expect(app).toMatch(/ChatsHome/);
  });
});
