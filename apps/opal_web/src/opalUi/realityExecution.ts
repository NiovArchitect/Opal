/**
 * Pass 31 P0-31-03 — ReservationExecution attaches to the same Moment-seeded Reality.
 *
 * Law: EXECUTION MAY CHANGE REALITY STATE. IT MUST NOT CREATE A SECOND REALITY.
 * nextGap none ≠ reserved. Only provider/execution truth authorizes reserved language.
 */

import type { MomentSeededContext } from "./liveSocialMomentLoop";
import { presentationReopensGrounded } from "./liveSocialMomentLoop";

export type RealityExecutionStatus =
  | "none"
  | "pending"
  | "held"
  | "confirmed"
  | "failed"
  | "cancelled"
  | "reconciling"
  | "payment_required";

export type MomentSeedWithExecution = MomentSeededContext & {
  executionStatus: RealityExecutionStatus;
  executionId: string | null;
  /** Last executionId+status that already produced a human consequence (idempotency) */
  lastConsequenceKey: string | null;
  /** Provider truth honesty */
  executionLiveClaimed: boolean;
};

export function withExecutionDefaults(seed: MomentSeededContext): MomentSeedWithExecution {
  const s = seed as MomentSeedWithExecution;
  return {
    ...seed,
    executionStatus: s.executionStatus || "none",
    executionId: s.executionId ?? null,
    lastConsequenceKey: s.lastConsequenceKey ?? null,
    executionLiveClaimed: s.executionLiveClaimed === true,
  };
}

export function mapServerStatusToExecution(status: string | null | undefined): RealityExecutionStatus {
  switch (status) {
    case "confirmed":
      return "confirmed";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    case "held":
      return "held";
    case "reconciling":
      return "reconciling";
    case "requested":
    case "pending":
      return "pending";
    case "payment_authorization_required":
      return "payment_required";
    default:
      return "none";
  }
}

/** Human consequence only when it deserves communication. Intermediate = silent. */
export function humanExecutionConsequence(input: {
  status: RealityExecutionStatus;
  placeName: string | null;
  whenLabel: string | null;
}): string | null {
  const place = (input.placeName || "").trim() || "this place";
  const when = (input.whenLabel || "").trim();
  const whenBit = when && when !== "open" ? when : null;
  switch (input.status) {
    case "confirmed":
      return whenBit
        ? `${place} is reserved for ${whenBit}.`
        : `${place} is reserved.`;
    case "failed":
      return "Reservation couldn't be completed. Your plan is still intact.";
    case "cancelled":
      return "Reservation cancelled.";
    case "held":
      return whenBit ? `Held for a few minutes · ${whenBit}.` : "Held for a few minutes.";
    case "pending":
    case "reconciling":
    case "payment_required":
    case "none":
      return null;
    default:
      return null;
  }
}

export type ApplyExecutionInput = {
  status: string;
  executionId: string | null;
  placeDisplayName?: string | null;
  slotLabel?: string | null;
  providerPlaceId?: string | null;
  liveClaimed?: boolean;
};

/**
 * Attach execution to the same Reality seed.
 * Does not mutate WHAT/WHERE/WHO/WHEN unless provider contradicts place/time
 * (silent auto-substitution is rejected — conflict flagged, dimensions kept).
 */
export function applyExecutionToSeed(
  seed: MomentSeededContext,
  input: ApplyExecutionInput,
): {
  seed: MomentSeedWithExecution;
  humanConsequence: string | null;
  emitConsequence: boolean;
  lineage: {
    momentId: string;
    realitySeedId: string;
    executionId: string | null;
    providerPlaceId: string | null;
  };
  compositionIntact: boolean;
  duplicateReality: false;
  error?: string;
} {
  const base = withExecutionDefaults(seed);
  const execStatus = mapServerStatusToExecution(input.status);
  const executionId = input.executionId || base.executionId;
  const consequenceKey =
    executionId && execStatus !== "none" ? `${executionId}:${execStatus}` : null;

  // Idempotent: same execution+status already emitted
  if (
    consequenceKey &&
    base.lastConsequenceKey === consequenceKey &&
    base.executionStatus === execStatus
  ) {
    return {
      seed: base,
      humanConsequence: null,
      emitConsequence: false,
      lineage: {
        momentId: base.momentId,
        realitySeedId: base.realitySeedId,
        executionId,
        providerPlaceId: base.providerPlaceId,
      },
      compositionIntact: true,
      duplicateReality: false,
    };
  }

  // Reject silent place/time mutation from provider response
  const placeIn = (input.placeDisplayName || "").trim();
  const whenIn = (input.slotLabel || "").trim();
  if (
    placeIn &&
    base.exactPlaceGrounded &&
    base.placeCandidateName &&
    placeIn.toLowerCase() !== base.placeCandidateName.toLowerCase()
  ) {
    // Keep human truth; mark failed drift rather than rewrite WHERE
    const drifted: MomentSeedWithExecution = {
      ...base,
      executionStatus: execStatus === "confirmed" ? "failed" : execStatus,
      executionId,
      executionLiveClaimed: input.liveClaimed === true,
    };
    return {
      seed: drifted,
      humanConsequence:
        "Reservation doesn't match your plan. Your place and time are unchanged.",
      emitConsequence: true,
      lineage: {
        momentId: base.momentId,
        realitySeedId: base.realitySeedId,
        executionId,
        providerPlaceId: base.providerPlaceId,
      },
      compositionIntact: true,
      duplicateReality: false,
      error: "provider_place_conflict",
    };
  }

  const next: MomentSeedWithExecution = {
    ...base,
    // Keep WHAT/WHERE/WHO/WHEN — execution is additive state
    what: base.what,
    placeCandidateName: base.placeCandidateName,
    providerPlaceId: base.providerPlaceId,
    participantNames: base.participantNames,
    when: base.when,
    exactPlaceGrounded: base.exactPlaceGrounded,
    nextGap: base.nextGap,
    executionStatus: execStatus,
    executionId,
    executionLiveClaimed: input.liveClaimed === true,
    lastConsequenceKey:
      humanExecutionConsequence({
        status: execStatus,
        placeName: base.placeCandidateName,
        whenLabel: whenIn || base.when,
      }) && consequenceKey
        ? consequenceKey
        : base.lastConsequenceKey,
  };

  const humanConsequence = humanExecutionConsequence({
    status: execStatus,
    placeName: next.placeCandidateName,
    whenLabel: whenIn || next.when,
  });

  // Only advance lastConsequenceKey when we actually emit
  if (humanConsequence && consequenceKey) {
    next.lastConsequenceKey = consequenceKey;
  }

  // Confirmed never reopens composition dimensions
  const compositionIntact =
    !presentationReopensGrounded(next, "place") || next.exactPlaceGrounded
      ? next.exactPlaceGrounded === base.exactPlaceGrounded &&
        next.placeCandidateName === base.placeCandidateName &&
        next.when === base.when &&
        JSON.stringify(next.participantNames) === JSON.stringify(base.participantNames)
      : true;

  return {
    seed: next,
    humanConsequence,
    emitConsequence: Boolean(humanConsequence),
    lineage: {
      momentId: next.momentId,
      realitySeedId: next.realitySeedId,
      executionId: next.executionId,
      providerPlaceId: next.providerPlaceId,
    },
    compositionIntact,
    duplicateReality: false,
  };
}

/** nextGap none must not authorize reserved language without execution confirmed. */
export function compositionSettledIsNotReserved(seed: MomentSeededContext): boolean {
  const s = withExecutionDefaults(seed);
  return s.nextGap === "none" && s.executionStatus !== "confirmed";
}
