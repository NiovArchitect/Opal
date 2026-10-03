import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ChatPreview } from "../data";
import {
  canonicalGraphFromChat,
  directionsQuery,
  isPastCanonicalGraph,
  PAST_DETAIL_FOREGROUNDS_CURRENT_TRAVEL,
  travelContext,
} from "./graphReality";
import {
  interestedIsGoing,
  participationFromMovement,
  visibleToOthers,
  type JourneyPresence,
} from "./journeyPresence";

const PLAN = "70804c05-779f-4991-ab9c-c75c319ebf2f";

function fortOakChat(): ChatPreview {
  return {
    id: "ace99adc-db67-4258-9d95-f612246c6c84",
    name: "Walk B",
    preview: "Call couldn't connect",
    time: "9:22 PM",
    peers: [{ id: "b599fcd7-7a97-4736-8221-86e0a6d8dc7a", display_name: "Walk B" }],
    planProjection: {
      lineage_id: PLAN,
      conversation_id: "ace99adc-db67-4258-9d95-f612246c6c84",
      visibility: "participants",
      participant_mode: "dyad",
      kicker: "Plan set ✓",
      when_label: "Tuesday · Sep 29 · 7:30 PM",
      place: "Fort Oak",
      activity: "Dinner",
      timezone: "America/Los_Angeles",
      execution_label: "Reservation approved",
      execution_detail: "Booking hasn't been placed yet.",
      pending_change: false,
      placeIdentity: {
        name: "Fort Oak",
        area: "Mission Hills",
        placeId: "ChIJ_recorded_fort_oak",
        address: "1011 Fort Stockton Drive, San Diego, CA 92103",
        coordinates: { lat: 32.7496, lng: -117.1778 },
        provenance: "recorded_fixture",
      },
      public: false,
    },
  };
}

describe("canonical graph detail", () => {
  it("uses one plan id and refuses fake travel", () => {
    const graph = canonicalGraphFromChat(fortOakChat(), "Walk A");
    expect(graph?.planId).toBe(PLAN);
    expect(graph?.title).toBe("Fort Oak");
    expect(graph?.whenLabel).toBe("Tuesday · Sep 29 · 7:30 PM");
    expect(graph?.timeLabel).toBe("7:30 PM");
    expect(graph?.timezone).toBe("America/Los_Angeles");
    expect(graph?.state).toBe("ready");
    expect(graph?.participants).toEqual(["Walk A", "Walk B"]);
    expect(graph?.executionLabel).toBe("Reservation approved");
    expect(graph?.executionDetail).toBe("Booking hasn't been placed yet.");
    expect(graph?.place.area).toBe("Mission Hills");
    expect(graph?.place.coordinates).toEqual({ lat: 32.7496, lng: -117.1778 });
    expect(graph?.directionsQuery).toBe(
      "Fort Oak, Mission Hills, 1011 Fort Stockton Drive, San Diego, CA 92103",
    );
    expect(graph?.travel.distance).toBeNull();
    expect(graph?.travel.travelMinutes).toBeNull();
    expect(graph?.travel.leaveBy).toBeNull();
    expect(graph?.travel.trafficAware).toBe(false);
    // Destination coords exist → ask for location; still no invented travel numbers.
    expect(graph?.travel.message).toBe("Location needed for travel time");
    expect(JSON.stringify(graph)).not.toMatch(/\d+(\.\d+)?\s*mi|min away|Leave by/i);
  });

  it("asks for location only after a destination point exists", () => {
    expect(
      travelContext({ coordinates: null, locationPermitted: true }).message,
    ).toBe("Travel time unavailable");
    expect(
      travelContext({
        coordinates: { lat: 32.75, lng: -117.13 },
        locationPermitted: false,
      }).message,
    ).toBe("Location needed for travel time");
    expect(
      travelContext({
        coordinates: { lat: 32.75, lng: -117.13 },
        locationPermitted: true,
      }).travelMinutes,
    ).toBeNull();
  });

  it("prefers resolved Mission Hills / address over bare catalog name", () => {
    expect(
      directionsQuery({
        name: "Fort Oak",
        area: "Mission Hills",
        placeId: "ChIJ_recorded_fort_oak",
        address: "1011 Fort Stockton Drive, San Diego, CA 92103",
        coordinates: { lat: 32.7496, lng: -117.1778 },
        provenance: "recorded_fixture",
      }),
    ).toBe("Fort Oak, Mission Hills, 1011 Fort Stockton Drive, San Diego, CA 92103");
  });
});

describe("graph detail navigation", () => {
  const app = readFileSync(resolve(__dirname, "../OpalApp.tsx"), "utf8");
  const detail = readFileSync(resolve(__dirname, "GraphDetailSheet.tsx"), "utf8");
  const strip = app.slice(
    app.indexOf('data-testid="next-plan-strip"'),
    app.indexOf("next-plan-kicker"),
  );

  it("sends Next Together and Your Graphs to the same Graph Detail", () => {
    expect(strip).toMatch(/data-destination="graph-detail"/);
    expect(strip).toMatch(/openGraphDetail\(planId, "graphs"\)/);
    expect(strip).not.toMatch(/setPlanDetailOpen/);
    expect(app).toMatch(/onOpenGraph=\{\(cardId\) => openGraphDetail\(cardId, "graphs"\)\}/);
    expect(app).toMatch(/setActiveChatId\(null\)/);
    expect(app).toMatch(/setTab\("graphs"\)/);
    expect(app).toMatch(/writeGraphAddress/);
    expect(detail).toMatch(/data-canonical="true"/);
    expect(detail).toMatch(/data-participant-location-public-leak="0"/);
    expect(detail).toMatch(/Open directions/);
    expect(detail).not.toMatch(/graph-enter-journey/);
  });

  it("keeps the graph list as the only scroll owner", () => {
    const css = readFileSync(resolve(__dirname, "../styles.css"), "utf8");
    const graphs = readFileSync(resolve(__dirname, "GraphsHome.tsx"), "utf8");
    expect(graphs).toMatch(/data-testid="graphs-scroll"/);
    expect(css).toMatch(/\.graphs-scroll[\s\S]*?overflow-y:\s*auto/);
  });

  it("PAST_DETAIL_FOREGROUNDS_CURRENT_TRAVEL = 0", () => {
    expect(PAST_DETAIL_FOREGROUNDS_CURRENT_TRAVEL).toBe(0);
    expect(detail).toMatch(/past:\s*"Past"/);
    expect(detail).toMatch(/isPastCanonicalGraph/);
    expect(detail).toMatch(/Earlier together/);
    expect(detail).toMatch(/View place/);
    expect(detail).toMatch(/data-past-detail-foregrounds-current-travel/);
    expect(detail).toMatch(/!past \? \([\s\S]*graph-personal-travel/);
    const pastChat = fortOakChat();
    pastChat.planProjection = {
      ...pastChat.planProjection!,
      temporal_state: "past",
      upcoming_ready: false,
      past_shared_reality: true,
    };
    const pastGraph = canonicalGraphFromChat(pastChat, "Walk A");
    expect(isPastCanonicalGraph(pastGraph)).toBe(true);
    expect(pastGraph?.state).toBe("past");
    expect(pastGraph?.travel.message).toBe("");
    expect(
      travelContext({
        coordinates: { lat: 32.75, lng: -117.13 },
        locationPermitted: true,
        temporalPast: true,
      }).message,
    ).toBe("");
  });
});

describe("past strand Find a time", () => {
  const app = readFileSync(resolve(__dirname, "../OpalApp.tsx"), "utf8");

  it("PAST_STRAND_FIND_A_TIME_DOMINANT = 0", () => {
    expect(app).toMatch(/PAST_STRAND_FIND_A_TIME_DOMINANT = 0/);
    expect(app).toMatch(/suppressFindATime/);
    expect(app).toMatch(/!suppressFindATime/);
    expect(app).toMatch(/data-past-strand-find-a-time-dominant/);
  });
});

describe("journey presence stays private", () => {
  const presence: JourneyPresence = {
    graphId: PLAN,
    userId: "walk-b",
    participationState: "going",
    travelState: "on_the_way",
    shareMode: "eta",
    eta: "7:31 PM",
    preciseLocation: { lat: 32.7, lng: -117.1 },
    sharingExpiresAt: "2026-09-30T03:30:00Z",
  };

  it("shares an ETA without coordinates, and precise share expires", () => {
    const eta = visibleToOthers(presence, new Date("2026-09-30T02:00:00Z"));
    expect(eta.location).toBe("eta");
    expect(eta.eta).toBe("7:31 PM");
    expect(eta.preciseLocation).toBeNull();
    const expired = visibleToOthers(presence, new Date("2026-09-30T04:00:00Z"));
    expect(expired.location).toBe("expired");
    expect(expired.preciseLocation).toBeNull();
    expect(expired.eta).toBeNull();
  });

  it("does not treat interest or movement as going, or silence as absence", () => {
    expect(interestedIsGoing("interested")).toBe(false);
    expect(interestedIsGoing("going")).toBe(true);
    expect(participationFromMovement("interested", true)).toBe("interested");
    const quiet = visibleToOthers({ ...presence, shareMode: "none" });
    expect(quiet.location).toBe("not_shared");
    expect(quiet.travelState).toBe("on_the_way");
  });
});
