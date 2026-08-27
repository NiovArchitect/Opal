/**
 * Home feed ranking seam — eligibility first, ranking second.
 * Ranking may reorder eligible content. Ranking must never make private content eligible.
 */

import type { FounderFeedCard, GraphFeedKind } from "./founderGraphSeed";

export type RankContext = {
  viewerUserId?: string | null;
  followingNames?: Set<string> | string[];
  relationshipNames?: Set<string> | string[];
  cityLabel?: string | null;
  nowMs?: number;
};

export type RankedFeedItem = FounderFeedCard & {
  rankScore: number;
  rankPosition: number;
  eligible: true;
  sourceOwner: "founder_fixture" | "production_owners" | "conversation_consequence";
};

function asSet(v?: Set<string> | string[]) {
  if (!v) return new Set<string>();
  return v instanceof Set ? v : new Set(v);
}

/** Privacy / audience gate — private cards require relationship eligibility. */
export function isCardEligible(
  card: FounderFeedCard,
  ctx: RankContext = {},
): boolean {
  const visibility = (card as { visibility?: string }).visibility || "eligible";
  if (visibility === "public" || visibility === "eligible") return true;
  if (visibility === "private" || visibility === "invite_only") {
    const rel = asSet(ctx.relationshipNames);
    const follow = asSet(ctx.followingNames);
    // Private content is never eligible via follow alone.
    return rel.has(card.person);
  }
  return true;
}

function typeBalancePenalty(kind: GraphFeedKind, recentKinds: GraphFeedKind[]): number {
  const last3 = recentKinds.slice(-3);
  const same = last3.filter((k) => k === kind).length;
  // Harder penalty for Conversation→Graph walls (dated rhythm forbids consequence spam).
  const weight = kind === "consequence" ? 22 : 8;
  return same * weight;
}

function personRepeatPenalty(person: string, recentPeople: string[]): number {
  const last5 = recentPeople.slice(-5);
  return last5.filter((p) => p === person).length * 6;
}

export function scoreCard(
  card: FounderFeedCard,
  ctx: RankContext,
  recentKinds: GraphFeedKind[],
  recentPeople: string[],
): number {
  const follow = asSet(ctx.followingNames);
  const rel = asSet(ctx.relationshipNames);
  let score = 50;

  // Relationship / follow strength
  if (rel.has(card.person)) score += 28;
  else if (follow.has(card.person)) score += 14;

  // Recency heuristic from when string
  const when = (card.when || "").toLowerCase();
  if (/^\d+m/.test(when) || when.includes("now")) score += 22;
  else if (/^\d+h/.test(when)) score += 16;
  else if (when.includes("yesterday")) score += 8;
  else if (when.includes("day")) score += 4;

  // Type salience — Live rarer/higher when present; Memory familiar
  if (card.kind === "live" && card.happeningNow) score += 30;
  else if (card.kind === "consequence") score += 24;
  else if (card.kind === "graph") score += 12;
  else if (card.kind === "memory") score += 10;
  else if (card.kind === "discovery" || card.kind === "near") score += 6;

  // Engagement
  score += Math.min(12, Math.floor((card.likeCount || 0) / 50));
  score += Math.min(8, card.commentCount || 0);

  // Diversity / repetition suppression
  score -= typeBalancePenalty(card.kind, recentKinds);
  score -= personRepeatPenalty(card.person, recentPeople);

  // Local discovery slight boost when city known
  if ((card.kind === "near" || card.kind === "discovery") && ctx.cityLabel) score += 5;

  return score;
}

/**
 * Filter to eligible, then rank. Never reintroduces ineligible cards.
 */
export function rankEligibleFeed(
  cards: FounderFeedCard[],
  ctx: RankContext = {},
  sourceOwner: RankedFeedItem["sourceOwner"] = "founder_fixture",
): RankedFeedItem[] {
  const eligible = cards.filter((c) => isCardEligible(c, ctx));
  // Score with iterative diversity: greedy by score with running penalties
  const remaining = [...eligible];
  const out: RankedFeedItem[] = [];
  const recentKinds: GraphFeedKind[] = [];
  const recentPeople: string[] = [];

  while (remaining.length) {
    let bestIdx = 0;
    let bestScore = -Infinity;
    const lastKind = recentKinds[recentKinds.length - 1];
    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i]!;
      // Soft hard-cap: never pick a 3rd consecutive identical kind when alternatives exist.
      if (
        lastKind &&
        cand.kind === lastKind &&
        recentKinds.slice(-2).every((k) => k === lastKind) &&
        remaining.some((r) => r.kind !== lastKind)
      ) {
        continue;
      }
      const s = scoreCard(cand, ctx, recentKinds, recentPeople);
      if (s > bestScore) {
        bestScore = s;
        bestIdx = i;
      }
    }
    // If all skipped by consecutive rule, fall back to best absolute.
    if (bestScore === -Infinity) {
      for (let i = 0; i < remaining.length; i++) {
        const s = scoreCard(remaining[i]!, ctx, recentKinds, recentPeople);
        if (s > bestScore) {
          bestScore = s;
          bestIdx = i;
        }
      }
    }
    const [picked] = remaining.splice(bestIdx, 1);
    if (!picked) break;
    recentKinds.push(picked.kind);
    recentPeople.push(picked.person);
    out.push({
      ...picked,
      rankScore: bestScore,
      rankPosition: out.length + 1,
      eligible: true,
      sourceOwner,
    });
  }
  return out;
}

/** Proof dump for founder: type/owner/when/relationship/source/rank */
export function feedProofRows(
  ranked: RankedFeedItem[],
  ctx: RankContext = {},
): Array<{
  position: number;
  id: string;
  kind: string;
  owner: string;
  when: string;
  relationship: string;
  source: string;
  score: number;
}> {
  const rel = asSet(ctx.relationshipNames);
  const follow = asSet(ctx.followingNames);
  return ranked.map((c) => ({
    position: c.rankPosition,
    id: c.id,
    kind: c.kind,
    owner: c.person,
    when: c.when,
    relationship: rel.has(c.person)
      ? "connection"
      : follow.has(c.person)
        ? "follow"
        : "none",
    source: c.sourceOwner,
    score: c.rankScore,
  }));
}
