import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function src(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("founder-locked 201 spine surfaces", () => {
  it("ships presentation owners for 201:6 through 201:10", () => {
    expect(src("opalUi/GraphWhoPicker.tsx")).toMatch(/data-figma-who="201:6"/);
    expect(src("opalUi/GraphPeopleThread.tsx")).toMatch(/data-figma-people="201:7"/);
    expect(src("opalUi/GraphLivePanel.tsx")).toMatch(/data-figma-live="201:8"/);
    expect(src("opalUi/GraphJourneyCard.tsx")).toMatch(/data-figma-journey="201:9"/);
    expect(src("opalUi/GraphProfilePage.tsx")).toMatch(/data-figma-profile="201:10"/);
  });

  it("wires WHO picker and People header into OpalApp", () => {
    const app = src("OpalApp.tsx");
    expect(app).toMatch(/GraphWhoPicker/);
    expect(app).toMatch(/GraphPeopleThreadHeader/);
    expect(app).toMatch(/GraphJourneyCard/);
    expect(app).toMatch(/GraphProfilePage/);
    expect(app).toMatch(/GraphLivePanel/);
  });

  it("first-run FR01-FR04 mark staged motion", () => {
    const fr = src("onboarding/FirstRunExperience.tsx");
    expect(fr).toMatch(/data-fr-motion="staged"/);
    expect(fr).toMatch(/fr01-world/);
    expect(fr).toMatch(/fr02-who/);
    expect(fr).toMatch(/fr03-ambient/);
    expect(fr).toMatch(/fr04-live/);
  });

  it("forbids em dashes in new spine customer files", () => {
    for (const f of [
      "opalUi/GraphWhoPicker.tsx",
      "opalUi/GraphPeopleThread.tsx",
      "opalUi/GraphJourneyCard.tsx",
      "opalUi/GraphProfilePage.tsx",
      "opalUi/GraphLivePanel.tsx",
    ]) {
      expect(src(f), f).not.toMatch(/—/);
    }
  });
});
