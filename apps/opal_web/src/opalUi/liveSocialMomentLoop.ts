/**
 * Pass 16 — Live Social Moment → Reality → Curate product continuity.
 *
 * Pure helpers only. No second ranking brain. No payouts.
 * Provider candidates labeled honestly (recorded_fixture vs live).
 */

import { doWithPeople, newSocialMoment, type SocialMomentModel } from "./socialExperience";
import {
  candidatesFromProviderProjection,
  type PlaceCandidate,
} from "./placeComposition";

/** Development-owned Moment for product proof — not a production CDN post. */
export const DEMO_SOCIAL_MOMENT: SocialMomentModel = newSocialMoment({
  id: "moment-chanelle-juniper-demo",
  authorUserId: "chanelle-demo",
  caption: "little italy nights hit different",
  socialContext: "date night · intimate",
  relationship: "following",
  cta: "I want to do this",
  placeRef: {
    display_name: "Juniper & Ivy",
    name: "Juniper & Ivy",
    area_label: "Little Italy",
    provider_place_id: "places/ChIJ_recorded_juniper",
    provider: "recorded_fixture",
    bookability: "unknown",
    execution: "none",
  },
});

export type MomentSeededContext = {
  momentId: string;
  realitySeedId: string;
  inspiredByMoment: true;
  placeCandidateName: string | null;
  providerPlaceId: string | null;
  providerSource: "recorded_fixture" | "live" | "fixture_catalog" | "unknown";
  liveProviderClaimed: false;
  bookability: "unknown";
  execution: "none";
  what: string;
  when: "open";
  participantNames: string[];
  /** Causal lineage edge for attribution debug (not product UI money) */
  lineageEdge: {
    kind: "inspired_by";
    fromMomentId: string;
    toRealityId: string;
  };
};

/**
 * Provider-backed candidate list for existing Curate / place sheet.
 * Juniper (Moment identity) is included as a meaningful candidate — not auto-winner.
 * Source honesty: recorded_fixture when live key absent.
 */
export function providerCandidatesForMomentSeed(
  moment: SocialMomentModel,
  opts?: { liveKeyPresent?: boolean },
): {
  candidates: PlaceCandidate[];
  source: "recorded_fixture" | "fixture_catalog";
  liveClaimed: false;
  bookability: "unknown";
  execution: "none";
  momentPlacePreferredId: string | null;
} {
  const live = !!opts?.liveKeyPresent;
  // Even if key present, Pass 16 SPA does not call network — still not live product claim
  void live;

  const recordedish = [
    {
      provider_place_id: moment.placeRef?.provider_place_id || "places/ChIJ_recorded_juniper",
      name: moment.placeRef?.display_name || moment.placeRef?.name || "Juniper & Ivy",
      area: moment.placeRef?.area_label || "Little Italy",
      cuisine: "italian",
      quiet: true,
      social_score: 4.6,
    },
    {
      provider_place_id: "places/ChIJ_recorded_born",
      name: "Born & Raised",
      area: "Little Italy",
      cuisine: "steak",
      quiet: true,
      social_score: 4.5,
    },
    {
      provider_place_id: "places/ChIJ_recorded_trattoria",
      name: "Quiet Trattoria",
      area: "Little Italy",
      cuisine: "italian",
      quiet: true,
      social_score: 4.4,
    },
    {
      provider_place_id: "harbor",
      name: "Harbor Table",
      area: "Waterfront",
      cuisine: "american",
      quiet: true,
      social_score: 4.7,
    },
  ];

  return {
    candidates: candidatesFromProviderProjection(recordedish),
    source: "recorded_fixture",
    liveClaimed: false,
    bookability: "unknown",
    execution: "none",
    momentPlacePreferredId: moment.placeRef?.provider_place_id || null,
  };
}

/** Build Reality seed after person selection (or solo). WHEN is open — not original Moment time. */
export function seedRealityFromMoment(
  moment: SocialMomentModel,
  people: Array<{ id: string; name: string }>,
  actorUserId: string,
  opts?: { solo?: boolean },
): { seed: MomentSeededContext; error?: string } {
  const ids = opts?.solo ? [] : people.map((p) => p.id);
  const result = doWithPeople(moment, ids, actorUserId);
  if ("error" in result) return { seed: null as unknown as MomentSeededContext, error: result.error };

  const realityId = `reality-from-${moment.id}-${(ids.length ? ids : [actorUserId]).join("-").slice(0, 24)}`;
  return {
    seed: {
      momentId: moment.id,
      realitySeedId: realityId,
      inspiredByMoment: true,
      placeCandidateName: result.whereCandidate ?? null,
      providerPlaceId: moment.placeRef?.provider_place_id || null,
      providerSource: (moment.placeRef?.provider as MomentSeededContext["providerSource"]) || "recorded_fixture",
      liveProviderClaimed: false,
      bookability: "unknown",
      execution: "none",
      what: result.what,
      when: "open",
      participantNames: opts?.solo
        ? ["Just me"]
        : people.map((p) => p.name),
      lineageEdge: {
        kind: "inspired_by",
        fromMomentId: moment.id,
        toRealityId: realityId,
      },
    },
  };
}

/** Private Opal filament after seed — human, not economic. Creator is inspiration only. */
export function privateSeedFilamentBody(seed: MomentSeededContext): string {
  const solo =
    seed.participantNames.length === 1 && seed.participantNames[0] === "Just me";
  const place = seed.placeCandidateName;
  if (solo) {
    if (place) {
      return `Just you · inspired by this Moment. ${place} is a starting point — when is still open.`;
    }
    return `Just you · inspired by this Moment. When and place are still open.`;
  }
  const who = seed.participantNames[0] || "them";
  if (place) {
    return `Inspired by a Moment · with ${who}. ${place} is a starting point — when is still open.`;
  }
  return `Inspired by a Moment · with ${who}. When and place are still open.`;
}

/** Attribution strength after Reality create — structural only, no payout. */
export function lineageAfterRealityCreate(seed: MomentSeededContext): {
  edge: MomentSeededContext["lineageEdge"];
  strength: "strong_assist";
  isPayout: false;
  liveEconomic: false;
} {
  return {
    edge: seed.lineageEdge,
    strength: "strong_assist",
    isPayout: false,
    liveEconomic: false,
  };
}
