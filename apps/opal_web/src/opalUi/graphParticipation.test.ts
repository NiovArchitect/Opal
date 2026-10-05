import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  formatGraphParticipationCounts,
  participationFigmaNode,
  resolveGraphParticipation,
} from "./graphParticipation";

const root = resolve(__dirname, "../../../..");
const webSrc = resolve(__dirname, "..");

function read(rel: string) {
  return readFileSync(resolve(webSrc, rel), "utf8");
}

describe("P0-05.7 Graph participation state machine", () => {
  it("INTERESTED_NOT_GOING — soft interest phase without SharedPlan", () => {
    expect(resolveGraphParticipation(null)).toBe("soft_interest");
    expect(resolveGraphParticipation({})).toBe("soft_interest");
    expect(participationFigmaNode("soft_interest")).toBe("618:149");
  });

  it("lock-in requires existing SharedPlan + commitment phase", () => {
    expect(
      resolveGraphParticipation({
        sharedPlanId: "plan-1",
        commitmentPhase: true,
        grounded: true,
        viewerResponseState: "tentative",
      }),
    ).toBe("lock_in");
    expect(participationFigmaNode("lock_in")).toBe("738:2");
  });

  it("GOING_STATE_RENDERS — accepted without Journey stays Open Graph", () => {
    expect(
      resolveGraphParticipation({
        sharedPlanId: "plan-1",
        viewerResponseState: "accepted",
        journeyAvailable: false,
      }),
    ).toBe("going");
  });

  it("GOING_DOES_NOT_FAKE_JOURNEY — Open Journey only if available", () => {
    expect(
      resolveGraphParticipation({
        sharedPlanId: "plan-1",
        viewerResponseState: "accepted",
        journeyAvailable: true,
      }),
    ).toBe("going_journey");
    expect(participationFigmaNode("going_journey")).toBe("738:35");
  });

  it("OPEN_JOURNEY_ONLY_IF_AVAILABLE — counts format matches Figma order", () => {
    expect(formatGraphParticipationCounts(2, 4)).toBe("2 going · 4 interested");
    expect(formatGraphParticipationCounts(3, 3)).toBe("3 going · 3 interested");
  });

  it("INTERESTED_DOES_NOT_ACCEPT_PARTICIPANT — soft interest stays local", () => {
    const app = read("OpalApp.tsx");
    const home = read("opalUi/GraphSocialHome.tsx");
    expect(home).toMatch(/data-participation-action="im_interested"/);
    expect(app).toMatch(/Soft interest only/);
    expect(app).not.toMatch(/onIdGoSoftInterest[\s\S]{0,300}acceptGoing/);
  });

  it("IM_GOING_DOES_NOT_FORCE_NAV — acceptGoing updates phase only", () => {
    const app = read("OpalApp.tsx");
    expect(app).toMatch(/onImGoing/);
    expect(app).toMatch(/GOING_COMMIT_FORCES_NAVIGATION = false/);
    expect(app).toMatch(/acceptGoing\(/);
    const imGoingBlock = app.slice(app.indexOf("onImGoing="), app.indexOf("onOpenJourney="));
    expect(imGoingBlock).not.toMatch(/setActiveJourney/);
    expect(imGoingBlock).not.toMatch(/activateJourney/);
  });

  it("IM_GOING_DOES_NOT_ACCEPT_ALL — uses acceptGoing not respond_option", () => {
    const app = read("OpalApp.tsx");
    const client = read("api/productClient.ts");
    expect(client).toMatch(/accept-going/);
    expect(app).toMatch(/acceptGoing\(/);
    expect(app).not.toMatch(/respond_option/);
  });

  it("OPEN_GRAPH_STILL_GRAPH_DETAIL + OPEN_JOURNEY_IS_NAV_ONLY", () => {
    const home = read("opalUi/GraphSocialHome.tsx");
    const app = read("OpalApp.tsx");
    expect(home).toMatch(/data-participation-action="open_graph"/);
    expect(home).toMatch(/data-participation-action="open_journey"/);
    expect(app).toMatch(/onOpenGraphDetail/);
    const start = app.indexOf("onOpenJourney={(card) => {");
    const end = app.indexOf("followedPeople={followedPeople}", start);
    const openJourney = app.slice(start, end);
    expect(openJourney).toMatch(/getJourney\(/);
    expect(openJourney).not.toMatch(/acceptGoing\(/);
    expect(openJourney).not.toMatch(/activateJourney\(/);
    expect(openJourney).toMatch(/Navigation only/);
  });

  it("GRAPH_OPEN_DOES_NOT_COMMIT + GRAPH_DETAIL_ENTER_JOURNEY_CTA false", () => {
    const detail = read("opalUi/GraphDetailSheet.tsx");
    const app = read("OpalApp.tsx");
    expect(detail).not.toMatch(/Enter Journey/);
    expect(detail).not.toMatch(/graph-enter-journey/);
    expect(app).not.toMatch(/Graph → SharedPlan → Journey \(618:3288\)/);
  });

  it("DIRECT_LEAVE_NOT_NAVIGATION", () => {
    const dated = read("opalUi/DatedConversationContent.tsx");
    expect(dated).not.toMatch(/onOpenJourney/);
  });

  it("brand semantics — violet interested / gold going / green Open Graph outline", () => {
    const css = readFileSync(resolve(webSrc, "styles.css"), "utf8");
    expect(css).toMatch(/\.gsh-gr-interested[\s\S]{0,120}#8b5cf6/);
    expect(css).toMatch(/#FFC86B|#ffc86b/);
    // Founder screenshot B — Open Graph green outline
    expect(css).toMatch(/\.gsh-gr-open\s*\{[\s\S]*?#7eecc0/);
  });

  it("authority YAML promotes 738:2 / 738:35", () => {
    const auth = readFileSync(resolve(root, "docs/authority/OPAL_CURRENT_AUTHORITY.yaml"), "utf8");
    const ledger = readFileSync(resolve(root, "docs/authority/FIGMA_RUNTIME_LEDGER.yaml"), "utf8");
    expect(auth).toMatch(/lock_in_commitment:\s*"738:2"/);
    expect(auth).toMatch(/committed_journey_available:\s*"738:35"/);
    expect(auth).toMatch(/FOUNDER_APPROVED_CURRENT/);
    expect(ledger).toMatch(/"738:2"[\s\S]*is_current_authority:\s*true/);
    expect(ledger).toMatch(/"738:35"[\s\S]*is_current_authority:\s*true/);
    expect(ledger).not.toMatch(/"738:2"[\s\S]{0,120}FOUNDER_REVIEW_REQUIRED/);
  });
});
