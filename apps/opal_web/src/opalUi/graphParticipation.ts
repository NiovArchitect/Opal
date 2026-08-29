/**
 * Home Graph participation state machine — Figma 618:149 / 738:2 / 738:35.
 *
 * INTERESTED = possibility (soft)
 * I'M GOING = current user commitment mutation (existing SharedPlan only)
 * GOING ✓ = committed state
 * OPEN JOURNEY = navigation to existing Journey projection (never mutation)
 */

export type GraphParticipationPhase =
  | "soft_interest"
  | "lock_in"
  | "going"
  | "going_journey";

export type GraphParticipationBacking = {
  sharedPlanId?: string | null;
  conversationId?: string | null;
  viewerResponseState?: string | null;
  commitmentPhase?: boolean;
  journeyAvailable?: boolean;
  grounded?: boolean;
  goingCount?: number | null;
  interestedCount?: number | null;
  lockInLabel?: string | null;
};

export const GRAPH_PARTICIPATION_FIGMA: Record<GraphParticipationPhase, string> = {
  soft_interest: "618:149",
  lock_in: "738:2",
  going: "738:35",
  going_journey: "738:35",
};

/** Resolve presentation phase from domain/product truth — never from a timer alone. */
export function resolveGraphParticipation(
  backing?: GraphParticipationBacking | null,
): GraphParticipationPhase {
  const viewer = backing?.viewerResponseState || null;
  if (viewer === "accepted") {
    return backing?.journeyAvailable ? "going_journey" : "going";
  }

  const hasPlan = typeof backing?.sharedPlanId === "string" && backing.sharedPlanId.length > 0;
  const grounded =
    backing?.grounded === true ||
    (hasPlan && (backing?.commitmentPhase === true || backing?.journeyAvailable === true));
  const commitment =
    hasPlan && grounded && (backing?.commitmentPhase !== false);

  if (commitment) return "lock_in";
  return "soft_interest";
}

export function formatGraphParticipationCounts(
  going: number | null | undefined,
  interested: number | null | undefined,
): string | null {
  if (going == null && interested == null) return null;
  // Figma authority: "2 going · 4 interested"
  return `${going ?? 0} going · ${interested ?? 0} interested`;
}

export function participationFigmaNode(phase: GraphParticipationPhase): string {
  return GRAPH_PARTICIPATION_FIGMA[phase];
}
