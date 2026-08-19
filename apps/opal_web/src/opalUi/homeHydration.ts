/**
 * Production Home hydration seam vs founder fixture.
 *
 * FOUNDER FIXTURE CONTENT (founderGraphSeed) demonstrates the OGX stream.
 * PRODUCTION HYDRATION must eventually compose from:
 *   FollowGraph · RelationshipGraph · Experience/Reality lineage ·
 *   real profiles · Memories · Graphs · Live eligibility · local discovery · ranking
 *
 * Do not hardcode the entire application around Maya/Chanelle.
 */

export type HomeHydrationSource =
  | "founder_fixture"
  | "production_owners"
  | "empty";

export type ProductionHomeOwners = {
  followGraph?: unknown;
  relationshipGraph?: unknown;
  experienceLineage?: unknown;
  profiles?: unknown;
  memories?: unknown;
  graphs?: unknown;
  liveEligibility?: unknown;
  localDiscovery?: unknown;
  ranking?: unknown;
};

/** Resolve which content owner drives Home for this session. */
export function resolveHomeHydrationSource(opts: {
  founderSeedEnabled: boolean;
  production?: ProductionHomeOwners | null;
}): HomeHydrationSource {
  const prod = opts.production;
  const hasProd =
    !!prod &&
    Object.values(prod).some((v) => v != null && !(Array.isArray(v) && v.length === 0));
  if (hasProd) return "production_owners";
  if (opts.founderSeedEnabled) return "founder_fixture";
  return "empty";
}

export const HOME_PRODUCTION_OWNER_KEYS = [
  "FollowGraph",
  "RelationshipGraph",
  "ExperienceLineage",
  "Profiles",
  "Memories",
  "Graphs",
  "LiveEligibility",
  "LocalDiscovery",
  "RankingService",
] as const;
