/**
 * Pass 16/31 — Live Social Moment → Reality continuity.
 *
 * Pass 31 law: every human action may reduce uncertainty;
 * it must not silently reopen already-resolved truth.
 *
 * Pure helpers only. No second ranking brain. No payouts.
 */

import {
  doWithPeople,
  momentHasExactPlace,
  newSocialMoment,
  whatFromMoment,
  type SocialMomentModel,
} from "./socialExperience";
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

/** Representative demo media for product/media judgment (not production CDN). */
export const DEMO_SOCIAL_MOMENT_MEDIA = "/demo/moments/food.jpg";

export type MomentIntentMode = "exact" | "like_this";

export type MomentNextGap = "when" | "place" | "who" | "none";

export type MomentSeededContext = {
  momentId: string;
  realitySeedId: string;
  inspiredByMoment: true;
  /** Display name of place when known */
  placeCandidateName: string | null;
  providerPlaceId: string | null;
  providerSource: "recorded_fixture" | "live" | "fixture_catalog" | "unknown";
  liveProviderClaimed: false;
  bookability: "unknown";
  execution: "none";
  what: string;
  /**
   * WHEN — "open" until human selects a time.
   * Pass 31 P0-31-02: selecting a time must replace this with an authoritative label.
   */
  when: string;
  participantNames: string[];
  /** Pass 31: THIS exact place vs LIKE THIS translation */
  intentMode: MomentIntentMode;
  /** Exact place identity grounded — WHERE must not reopen */
  exactPlaceGrounded: boolean;
  /** Authoritative next human gap after this seed */
  nextGap: MomentNextGap;
  /** Source creator (inspiration only — not logistics participant) */
  sourceAuthorUserId: string;
  experienceIntent: string;
  /** Causal lineage edge for attribution debug (not product UI money) */
  lineageEdge: {
    kind: "inspired_by";
    fromMomentId: string;
    toRealityId: string;
  };
};

/**
 * Provider-backed candidate list for existing Curate / place sheet.
 * When exact place is grounded, candidates are not required for WHERE.
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

/**
 * Build Reality seed after person selection (or solo).
 *
 * Pass 31:
 * - Solo / With person only changes WHO.
 * - Exact place from Moment grounds WHERE (intent exact).
 * - WHEN remains open until human selects time.
 * - WHAT does not invent unsupported Dinner.
 */
export function seedRealityFromMoment(
  moment: SocialMomentModel,
  people: Array<{ id: string; name: string }>,
  actorUserId: string,
  opts?: { solo?: boolean; intentMode?: MomentIntentMode },
): { seed: MomentSeededContext; error?: string } {
  const ids = opts?.solo ? [] : people.map((p) => p.id);
  const result = doWithPeople(moment, ids, actorUserId);
  if ("error" in result) return { seed: null as unknown as MomentSeededContext, error: result.error };

  const intentMode: MomentIntentMode =
    opts?.intentMode || (momentHasExactPlace(moment) ? "exact" : "like_this");
  const exactPlaceGrounded = intentMode === "exact" && momentHasExactPlace(moment);
  const placeName =
    moment.placeRef?.display_name || moment.placeRef?.name || result.whereCandidate || null;
  const what = exactPlaceGrounded
    ? placeName || whatFromMoment(moment)
    : result.what;

  // WHO settled by solo/people; WHERE settled if exact; WHEN open
  const nextGap: MomentNextGap = exactPlaceGrounded ? "when" : "place";

  const realityId = `reality-from-${moment.id}-${(ids.length ? ids : [actorUserId]).join("-").slice(0, 24)}`;
  return {
    seed: {
      momentId: moment.id,
      realitySeedId: realityId,
      inspiredByMoment: true,
      placeCandidateName: placeName,
      providerPlaceId: moment.placeRef?.provider_place_id || null,
      providerSource:
        (moment.placeRef?.provider as MomentSeededContext["providerSource"]) || "recorded_fixture",
      liveProviderClaimed: false,
      bookability: "unknown",
      execution: "none",
      what,
      when: "open",
      participantNames: opts?.solo ? ["Solo"] : people.map((p) => p.name),
      intentMode,
      exactPlaceGrounded,
      nextGap,
      sourceAuthorUserId: moment.authorUserId,
      experienceIntent: result.experienceIntent || whatFromMoment(moment),
      lineageEdge: {
        kind: "inspired_by",
        fromMomentId: moment.id,
        toRealityId: realityId,
      },
    },
  };
}

/** True if presentation would illegally reopen a grounded dimension. */
export function presentationReopensGrounded(
  seed: MomentSeededContext,
  asking: MomentNextGap | "what",
): boolean {
  if (asking === "place" && seed.exactPlaceGrounded) return true;
  if (asking === "what" && seed.what && seed.exactPlaceGrounded) return true;
  // WHO already chosen (solo or named people list non-empty)
  if (asking === "who" && seed.participantNames.length > 0) return true;
  // WHEN settled — must not silently reopen without contradiction
  if (asking === "when" && seed.when && seed.when !== "open") return true;
  return false;
}

/** Should Curate / place sheet open after forming? Only if WHERE not grounded. */
export function shouldOpenPlaceAfterForming(seed: MomentSeededContext): boolean {
  return !seed.exactPlaceGrounded && seed.nextGap === "place";
}

/** Default human time options for moment-seeded path (presentation labels only). */
export const MOMENT_TIME_OPTIONS = [
  { id: "sat-1900", label: "Saturday · 7:00 PM" },
  { id: "sat-1930", label: "Saturday · 7:30 PM" },
  { id: "sat-2000", label: "Saturday · 8:00 PM" },
  { id: "sat-2030", label: "Saturday · 8:30 PM" },
] as const;

/**
 * P0-31-02: apply human WHEN selection to the same Reality seed.
 * - Rejects empty labels (dead tap impossible by construction)
 * - Preserves exact place / WHAT / WHO
 * - Advances nextGap away from "when"
 */
export function applyWhenToSeed(
  seed: MomentSeededContext,
  whenLabel: string,
  opts?: { slotId?: string },
): { seed: MomentSeededContext; error?: string; changed: boolean } {
  const label = (whenLabel || "").trim();
  if (!label) {
    return { seed, error: "empty_when_label", changed: false };
  }
  // No-op if identical (still "changed: false" so UI can treat as already settled)
  if (seed.when === label && seed.nextGap !== "when") {
    return { seed, changed: false };
  }
  void opts?.slotId;
  const next: MomentSeededContext = {
    ...seed,
    when: label,
    // Place remains grounded; when settled → no gap or residual execution gap as "none"
    nextGap: seed.exactPlaceGrounded ? "none" : seed.nextGap === "place" ? "place" : "none",
  };
  return { seed: next, changed: true };
}

/** Domain consequence of a WHEN tap — must be observable. */
export function whenSelectionConsequence(
  before: MomentSeededContext,
  after: MomentSeededContext,
): {
  whenPersisted: boolean;
  placeIntact: boolean;
  whoIntact: boolean;
  whatIntact: boolean;
  nextGapAdvanced: boolean;
  deadTap: boolean;
} {
  const whenPersisted = Boolean(after.when && after.when !== "open");
  const placeIntact =
    before.placeCandidateName === after.placeCandidateName &&
    before.providerPlaceId === after.providerPlaceId &&
    before.exactPlaceGrounded === after.exactPlaceGrounded;
  const whoIntact =
    JSON.stringify(before.participantNames) === JSON.stringify(after.participantNames);
  const whatIntact = before.what === after.what;
  const nextGapAdvanced =
    before.nextGap === "when" ? after.nextGap !== "when" : after.when !== "open";
  const deadTap = before.when === after.when && before.nextGap === after.nextGap && after.when === "open";
  return {
    whenPersisted,
    placeIntact,
    whoIntact,
    whatIntact,
    nextGapAdvanced,
    deadTap,
  };
}

/** Private Opal filament — consequence, not provenance lecture. No false Dinner. */
export function privateSeedFilamentBody(seed: MomentSeededContext): string {
  const solo =
    seed.participantNames.length === 1 &&
    (seed.participantNames[0] === "Just me" || seed.participantNames[0] === "Solo");
  const place = seed.placeCandidateName;
  const who = solo ? "Solo" : seed.participantNames[0] || "them";
  const whenPart = seed.when && seed.when !== "open" ? seed.when : "when still open";
  if (seed.exactPlaceGrounded && place) {
    return solo ? `${place} · Solo · ${whenPart}` : `${place} · with ${who} · ${whenPart}`;
  }
  if (solo) return `${seed.what} · Solo · ${whenPart}`;
  return `${seed.what} · with ${who} · ${whenPart}`;
}

/**
 * Reality-forming title — preserves experience/place, not generic meal.
 * Solo does not collapse exact place into "Dinner".
 */
export function realityFormingTitle(seed: MomentSeededContext): string {
  const solo =
    seed.participantNames.length === 1 &&
    (seed.participantNames[0] === "Just me" || seed.participantNames[0] === "Solo");
  if (seed.exactPlaceGrounded && seed.placeCandidateName) {
    return solo ? seed.placeCandidateName : `${seed.placeCandidateName} · with ${seed.participantNames[0]}`;
  }
  if (solo) return seed.what;
  return `${seed.what} with ${seed.participantNames[0] || "them"}`;
}

/** Forming primary action copy — never ask WHERE when place grounded. */
export function realityFormingPrimaryAction(seed: MomentSeededContext): {
  question: string;
  opensPlace: boolean;
  gap: MomentNextGap;
} {
  if (seed.exactPlaceGrounded) {
    if (seed.when && seed.when !== "open") {
      return {
        question: "Continue",
        opensPlace: false,
        gap: "none",
      };
    }
    return {
      question: "When works?",
      opensPlace: false,
      gap: "when",
    };
  }
  if (seed.nextGap === "place") {
    return {
      question: "Where should this be?",
      opensPlace: true,
      gap: "place",
    };
  }
  return {
    question: "Continue",
    opensPlace: false,
    gap: seed.nextGap,
  };
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
