/**
 * Wave B B3 — Graphs 618:674 / Detail 618:758 / Journey destinations 863:*
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, "src", rel), "utf8");

describe("Wave B Graphs exact authority", () => {
  it("GRAPHS_CURRENT_AUTHORITY_618_674", () => {
    const graphs = read("opalUi/GraphsHome.tsx");
    expect(graphs).toMatch(/data-figma="618:674"|data-figma-authority="618:674"/);
    expect(graphs).toMatch(/Your Graphs/);
    expect(graphs).toMatch(/What is taking shape/);
    expect(graphs).toMatch(/graphs-create/);
    expect(graphs).toMatch(/All/);
    expect(graphs).toMatch(/Action/);
    expect(graphs).toMatch(/Ready/);
    expect(graphs).toMatch(/\["past", "Past"\]/);
    expect(graphs).not.toMatch(/Needs you/);
  });

  it("GRAPHS_FILTER_COLORS_PRESERVED", () => {
    const css = read("styles.css");
    expect(css).toMatch(/\.graphs-lens-chip\[data-lens="all"\]\.is-active[\s\S]*?#00E5FF/);
    expect(css).toMatch(/\.graphs-lens-chip\[data-lens="all"\]\.is-active[\s\S]*?#0A2429/);
    expect(css).toMatch(/\.graphs-lens-chip\[data-lens="action"\][\s\S]*?#FF6B9D/);
    expect(css).toMatch(/\.graphs-lens-chip\[data-lens="ready"\][\s\S]*?#FFC86B/);
  });

  it("GRAPH_STATUS_COLORS_PRESERVED", () => {
    const css = read("styles.css");
    expect(css).toMatch(/\.graphs-status-ready[\s\S]*?#FFC86B/);
    expect(css).toMatch(/\.graphs-status-aligned[\s\S]*?#FFC86B/);
    expect(css).toMatch(/\.graphs-status-forming[\s\S]*?#8B5CF6/);
    expect(css).toMatch(/\.graphs-status-idea[\s\S]*?#8B5CF6/);
    const graphs = read("opalUi/GraphsHome.tsx");
    expect(graphs).toMatch(/graphs-status-/);
    expect(graphs).toMatch(/data-graph-status/);
  });

  it("GRAPH_CREATE_ROUTES_863_284_863_338", () => {
    const create = read("opalUi/GraphCreateFlow.tsx");
    const app = read("OpalApp.tsx");
    expect(create).toMatch(/863:284/);
    expect(create).toMatch(/863:338/);
    expect(create).toMatch(/data-figma-create=\{step === "choose_media" \? "863:284" : "863:338"\}/);
    expect(app).toMatch(/GraphCreateFlow/);
    expect(app).toMatch(/setGraphCreateOpen\(true\)/);
    const graphs = read("opalUi/GraphsHome.tsx");
    expect(graphs).toMatch(/onCreateGraph/);
  });

  it("GRAPH_OPEN_STAYS_GRAPH_DETAIL", () => {
    const detail = read("opalUi/GraphDetailSheet.tsx");
    const app = read("OpalApp.tsx");
    expect(detail).toMatch(/618:758/);
    expect(detail).toMatch(/data-testid=["']graph-detail-sheet["']/);
    expect(detail).not.toMatch(/Enter Journey/);
    expect(detail).not.toMatch(/graph-enter-journey/);
    expect(app).not.toMatch(/onEnterJourney=\{/);
    expect(app).toMatch(/onOpenGraphDetail|setGraphDetailCardId|graphDetailCardId/);
  });

  it("JOURNEY_ADD_PEOPLE_ROUTES_863_394", () => {
    const add = read("opalUi/JourneyAddPeople.tsx");
    const app = read("OpalApp.tsx");
    expect(add).toMatch(/863:394/);
    expect(add).toMatch(/data-figma-add-people="863:394"/);
    expect(add).toMatch(/gwho-grid/);
    expect(add).not.toMatch(/Send separately/);
    expect(add).not.toMatch(/Together/);
    expect(app).toMatch(/JourneyAddPeople/);
    expect(app).toMatch(/setJourneyAddPeopleOpen\(true\)/);
    const journeyAddBlock = app.slice(
      app.indexOf("journeyAddPeopleOpen && activeJourney"),
      app.indexOf("journeyAddPeopleOpen && activeJourney") + 900,
    );
    expect(journeyAddBlock).toMatch(/JourneyAddPeople/);
    expect(journeyAddBlock).not.toMatch(/NewChatPicker/);
  });

  it("JOURNEY_MANAGE_ROUTES_863_88", () => {
    const manage = read("opalUi/JourneyManageSheet.tsx");
    const app = read("OpalApp.tsx");
    expect(manage).toMatch(/863:88/);
    expect(manage).toMatch(/data-figma-manage="863:88"/);
    expect(manage).toMatch(/Manage this plan/);
    expect(app).toMatch(/JourneyManageSheet/);
    expect(app).toMatch(/setJourneyManageOpen\(true\)/);
  });

  it("JOURNEY_CANT_MAKE_IT_ROUTES_863_195", () => {
    const cant = read("opalUi/CantMakeItSheet.tsx");
    const app = read("OpalApp.tsx");
    expect(cant).toMatch(/863:195/);
    expect(cant).toMatch(/data-figma-cant="863:195"/);
    expect(cant).toMatch(/Only you leave/);
    expect(app).toMatch(/CantMakeItSheet/);
    expect(app).toMatch(/setCantMakeItOpen\(true\)/);
  });
});
