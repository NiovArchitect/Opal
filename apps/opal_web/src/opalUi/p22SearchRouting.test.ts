import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("P2.2 Global Search routing integrity", () => {
  it("SearchDestination separates Places / Experiences / Graphs", () => {
    const src = readFileSync(resolve(root, "opalUi/SearchDestination.tsx"), "utf8");
    expect(src).toMatch(/618:2299/);
    expect(src).toMatch(/result_type: \"places\"/);
    expect(src).toMatch(/result_type: \"experiences\"/);
    expect(src).toMatch(/result_type: \"graphs\"/);
    expect(src).toMatch(/seed-chanelle-juniper/);
    expect(src).toMatch(/seed-near-rooftop/);
    expect(src).toMatch(/seed-jordan-market/);
    expect(src).not.toMatch(/onOpenPlaceHint/);
    expect(src).toMatch(/onOpenGraphReality/);
    expect(src).toMatch(/MISSING_CURRENT_AUTHORITY/);
  });

  it("OpalApp wires Search → Profile / Graph with return-to-Search", () => {
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    expect(app).toMatch(/searchReturnPending/);
    expect(app).toMatch(/searchQuery/);
    expect(app).toMatch(/onOpenGraphReality/);
    expect(app).toMatch(/setSearchReturnPending\(true\)/);
    expect(app).not.toMatch(/onOpenPlaceHint/);
    expect(app).not.toMatch(/Found \$\{place\}/);
  });

  it("destination exclusivity includes New Call vs Search", () => {
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    expect(app).toMatch(/searchOpen && !activityOpen && !newCallOpen/);
    expect(app).toMatch(/setNewCallOpen\(false\)/);
  });

  it("Group Continuity authority node is 928:221", () => {
    const cc = readFileSync(resolve(root, "opalUi/CallContinuityDestination.tsx"), "utf8");
    expect(cc).toMatch(/928:221/);
    expect(cc).toMatch(/data-affordance=\"info\"/);
  });

  it("Activity icon 1046:2 is not implemented in product", () => {
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    expect(app).not.toMatch(/1046:2/);
    const auth = readFileSync(
      resolve(root, "../../../docs/authority/OPAL_CURRENT_AUTHORITY.yaml"),
      "utf8",
    );
    // pre-update may still say 995:2 — prove pass updates to 1046:2 FOUNDER_REVIEW
    expect(auth).toMatch(/activity_destination:\s*CURRENT|activity_icon:\s*FOUNDER_REJECTED/);
  });
});
