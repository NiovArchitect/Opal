import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const core = resolve(root, "../../opal_core/lib");

describe("Graph → Journey authority wiring", () => {
  it("Journey surfaces and Figma authorities exist", () => {
    expect(existsSync(resolve(root, "opalUi/JourneySurface.tsx"))).toBe(true);
    expect(existsSync(resolve(root, "opalUi/JourneyManageSheet.tsx"))).toBe(true);
    expect(existsSync(resolve(root, "opalUi/CantMakeItSheet.tsx"))).toBe(true);
    expect(existsSync(resolve(root, "opalUi/LocationPermissionSheet.tsx"))).toBe(true);
    const journey = readFileSync(resolve(root, "opalUi/JourneySurface.tsx"), "utf8");
    expect(journey).toMatch(/254:280/);
    expect(journey).toMatch(/201:9/);
    expect(journey).toMatch(/journey-open-maps/);
    expect(readFileSync(resolve(root, "opalUi/JourneyManageSheet.tsx"), "utf8")).toMatch(/258:2/);
    expect(readFileSync(resolve(root, "opalUi/CantMakeItSheet.tsx"), "utf8")).toMatch(/258:49/);
    expect(readFileSync(resolve(root, "opalUi/LocationPermissionSheet.tsx"), "utf8")).toMatch(
      /473:348/,
    );
  });

  it("OpalApp wires Graph commit to Journey and Manage/Can't make it", () => {
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    expect(app).toMatch(/activateJourney/);
    expect(app).toMatch(/JourneySurface/);
    expect(app).toMatch(/JourneyManageSheet/);
    expect(app).toMatch(/CantMakeItSheet/);
    expect(app).toMatch(/onEnterJourney/);
    expect(app).toMatch(/journeyCantMakeIt/);
    expect(app).toMatch(/journeyMaterialChange/);
    expect(app).not.toMatch(/onManage=\{\(\) => onOpenChat/);
  });

  it("BEAM JourneyAuthority reuses SharedPlan not a second planner", () => {
    const auth = readFileSync(
      resolve(core, "opal_core/social_flow/journey_authority.ex"),
      "utf8",
    );
    expect(auth).toMatch(/SharedPlan/);
    expect(auth).toMatch(/PlanParticipant/);
    expect(auth).toMatch(/LeaveTime/);
    expect(auth).toMatch(/cancels_everyone/);
    expect(auth).toMatch(/require_lead/);
    expect(auth).toMatch(/widens_chat_automatically/);
  });

  it("GraphDetail offers Commit · Enter Journey", () => {
    const detail = readFileSync(resolve(root, "opalUi/GraphDetailSheet.tsx"), "utf8");
    expect(detail).toMatch(/graph-enter-journey/);
    expect(detail).toMatch(/onEnterJourney/);
  });
});
