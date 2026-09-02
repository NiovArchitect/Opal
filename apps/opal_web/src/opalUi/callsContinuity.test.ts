import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FOUNDER_CALLS_CONTINUITY_ROWS,
  FORBIDDEN_PROVIDER_CALL_ROW_IDS,
} from "./callsContinuitySeed";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("P2 Calls Continuity 928:3", () => {
  it("calls_chats_mode_switch — Chats|Calls mode exists without Messages tab", () => {
    const chats = readFileSync(resolve(root, "opalUi/ChatsHome.tsx"), "utf8");
    expect(chats).toMatch(/comm-mode-chats/);
    expect(chats).toMatch(/comm-mode-calls/);
    expect(chats).toMatch(/data-comm-surface/);
    expect(chats).not.toMatch(/>\s*Messages\s*</);
  });

  it("calls_row_metadata_without_fake_consequence — Maya has zero signal", () => {
    const maya = FOUNDER_CALLS_CONTINUITY_ROWS.find((r) => r.id === "call-cont-maya");
    expect(maya).toBeTruthy();
    expect(maya?.signal).toBeUndefined();
    expect(maya?.metadata).toMatch(/Video · 36m/);
  });

  it("calls_row_earned_consequence_open_graph — Chanelle Ready → same Graph id", () => {
    const chanelle = FOUNDER_CALLS_CONTINUITY_ROWS.find((r) => r.id === "call-cont-chanelle");
    expect(chanelle?.signal?.kind).toBe("ready");
    expect(chanelle?.signal && "graphCardId" in chanelle.signal && chanelle.signal.graphCardId).toBe(
      "seed-chanelle-juniper",
    );
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    expect(app).toMatch(/onOpenCallGraph/);
    expect(app).toMatch(/setGraphDetailCardId\(graphCardId\)/);
  });

  it("one signal slot max per relationship row", () => {
    for (const row of FOUNDER_CALLS_CONTINUITY_ROWS) {
      // Type system enforces optional singular signal; assert seed shape
      expect(row.signal === undefined || typeof row.signal.kind === "string").toBe(true);
    }
    const withSignal = FOUNDER_CALLS_CONTINUITY_ROWS.filter((r) => r.signal);
    const without = FOUNDER_CALLS_CONTINUITY_ROWS.filter((r) => !r.signal);
    expect(withSignal.length).toBeGreaterThan(0);
    expect(without.length).toBeGreaterThan(0);
  });

  it("calls_provider_opal_not_user_call_row — no Handled-by-Opal fake call rows", () => {
    const ids = new Set(FOUNDER_CALLS_CONTINUITY_ROWS.map((r) => r.id));
    for (const bad of FORBIDDEN_PROVIDER_CALL_ROW_IDS) {
      expect(ids.has(bad)).toBe(false);
    }
    const blob = FOUNDER_CALLS_CONTINUITY_ROWS.map((r) => `${r.name} ${r.metadata} ${r.signal?.label || ""}`).join(
      " ",
    );
    expect(blob).not.toMatch(/Handled by Opal/i);
    expect(blob).not.toMatch(/Reservation confirmed/i);
  });

  it("subtitle law — All uses founder-safe Calls copy", () => {
    const chats = readFileSync(resolve(root, "opalUi/ChatsHome.tsx"), "utf8");
    expect(chats).toMatch(/The people you've been calling\./);
    expect(chats).not.toMatch(/The people you actually spoke with/);
  });

  it("missed filter present", () => {
    const chats = readFileSync(resolve(root, "opalUi/ChatsHome.tsx"), "utf8");
    expect(chats).toMatch(/calls-filter-missed/);
    expect(chats).toMatch(/Missed calls, without the clutter/);
  });

  it("no parallel call domain invented", () => {
    const chats = readFileSync(resolve(root, "opalUi/ChatsHome.tsx"), "utf8");
    const seed = readFileSync(resolve(root, "opalUi/callsContinuitySeed.ts"), "utf8");
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    expect(chats).not.toMatch(/createCallGraph|CallGraphDomain|new CallGraph/);
    expect(seed).not.toMatch(/createCallGraph|CallGraphDomain/);
    expect(app).not.toMatch(/createCallGraph|CallGraphDomain/);
  });
});
