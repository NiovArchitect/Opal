/**
 * Social Experience Graph + Attribution (client mirror, Pass 15 add-on).
 *
 * Attribution != payout. No recruiting. No infinite downline.
 * Social ranking must ignore commission value.
 * Live economic attribution is NOT claimed.
 */

export type PlaceRef = {
  display_name?: string;
  name?: string;
  provider_place_id?: string;
  provider?: string;
  area_label?: string;
  lat?: number;
  lng?: number;
  bookability?: "unknown";
  execution?: "none";
};

export type MomentCtaKind =
  | "Do this with your people"
  | "I want to do this"
  | "Do this too"
  | "I'm in"
  | "Join";

export type SocialMomentModel = {
  id: string;
  authorUserId: string;
  caption: string;
  placeRef?: PlaceRef | null;
  socialContext?: string | null;
  commerceLed: false;
  /** Default product CTA string — presentation may specialize by relationship */
  cta: MomentCtaKind;
  /** Semantic relationship to viewer when known */
  relationship?: "friend" | "following" | "open_event";
};

export type RealitySeed = {
  socialMomentId: string;
  participantUserIds: string[];
  what: string;
  when: string;
  whereCandidate?: string | null;
  placeIdentity?: PlaceRef | null;
  authorizesSet: false;
  authorizesBooking: false;
  bookability: "unknown";
  execution: "none";
  independentCircle: true;
  /** Pass 28: solo fork allowed */
  solo?: boolean;
  /** Provenance — creator is inspiration, not logistics participant */
  inspiredByAuthorUserId?: string;
  experienceIntent?: string;
};

export type AttributionStrength =
  | "direct_causal"
  | "strong_assist"
  | "weak_assist"
  | "non_causal_exposure";

export function newSocialMoment(input: {
  id?: string;
  authorUserId: string;
  caption: string;
  placeRef?: PlaceRef | null;
  socialContext?: string | null;
  relationship?: SocialMomentModel["relationship"];
  cta?: MomentCtaKind;
}): SocialMomentModel {
  const relationship = input.relationship || "friend";
  const cta =
    input.cta ||
    (relationship === "following"
      ? "I want to do this"
      : relationship === "open_event"
        ? "I'm in"
        : "Do this with your people");
  return {
    id: input.id || `moment-${Math.random().toString(36).slice(2, 8)}`,
    authorUserId: input.authorUserId,
    caption: input.caption,
    placeRef: input.placeRef
      ? {
          ...input.placeRef,
          bookability: "unknown",
          execution: "none",
        }
      : null,
    socialContext: input.socialContext ?? null,
    commerceLed: false,
    cta,
    relationship,
  };
}

/** Infer portable experience intent from caption/context — not necessarily the venue. */
export function experienceIntentFromMoment(moment: SocialMomentModel): string {
  const blob = `${moment.caption} ${moment.socialContext || ""}`.toLowerCase();
  if (/ramen|jazz|night/.test(blob)) return "late-night food + music";
  if (/coffee|morning|rain/.test(blob)) return "coffee morning";
  if (/sunset/.test(blob)) return "sunset evening";
  if (/date|intimate|night/.test(blob)) return "intimate dinner night";
  if (/museum/.test(blob)) return "museum afternoon";
  return moment.caption.slice(0, 48) || "experience";
}

/**
 * Seed independent Reality — never Set/book.
 * Pass 28: allow solo (just actor) without forced friend picker.
 */
export function doWithPeople(
  moment: SocialMomentModel,
  people: string[],
  actorUserId: string,
): RealitySeed | { error: string } {
  const solo = people.length === 0 || (people.length === 1 && people[0] === actorUserId);
  const participants = solo
    ? [actorUserId]
    : Array.from(new Set([actorUserId, ...people.filter(Boolean)]));

  if (!participants.length) return { error: "people_required" };

  const what = /coffee/i.test(moment.caption + (moment.socialContext || ""))
    ? "Coffee"
    : /jazz|ramen|concert/i.test(moment.caption + (moment.socialContext || ""))
      ? "Night out"
      : "Dinner";

  return {
    socialMomentId: moment.id,
    participantUserIds: participants,
    what,
    when: "open",
    whereCandidate: moment.placeRef?.display_name || moment.placeRef?.name || null,
    placeIdentity: moment.placeRef || null,
    authorizesSet: false,
    authorizesBooking: false,
    bookability: "unknown",
    execution: "none",
    independentCircle: true,
    solo,
    inspiredByAuthorUserId: moment.authorUserId,
    experienceIntent: experienceIntentFromMoment(moment),
  };
}

/**
 * Semantic fork kinds — never conflate.
 * inspired_by = make this mine / do this too
 * with_people = people join my Reality
 * join_their = open event participation
 */
export function forkKindFromCta(cta: MomentCtaKind | string): "inspired_by" | "with_people" | "join_their" {
  if (/join|i'm in|im in/i.test(cta)) return "join_their";
  if (/people/i.test(cta)) return "with_people";
  return "inspired_by";
}

export function classifyAttributionStrength(evidence: {
  seededRealityFromMoment?: boolean;
  sharedIntoConversation?: boolean;
  placeRemainedToTransaction?: boolean;
  viewedOnly?: boolean;
  likedOnly?: boolean;
  recruitmentOnly?: boolean;
  independentSearch?: boolean;
}): AttributionStrength {
  if (evidence.recruitmentOnly) return "non_causal_exposure";
  if (evidence.viewedOnly || evidence.likedOnly) {
    if (evidence.seededRealityFromMoment || evidence.sharedIntoConversation) return "strong_assist";
    return "non_causal_exposure";
  }
  if (evidence.seededRealityFromMoment && evidence.placeRemainedToTransaction) return "direct_causal";
  if (evidence.seededRealityFromMoment) return "strong_assist";
  if (evidence.sharedIntoConversation && evidence.placeRemainedToTransaction) return "strong_assist";
  if (evidence.independentSearch) return "non_causal_exposure";
  if (evidence.sharedIntoConversation) return "weak_assist";
  return "non_causal_exposure";
}

/** No transaction → no economic attribution. */
export function attributeTransaction(input: {
  status: string;
  simulation?: boolean;
  causalChain: Array<{
    momentId: string;
    authorUserId: string;
    hop: number;
    evidence: Parameters<typeof classifyAttributionStrength>[0];
  }>;
  maxHops?: number;
  recruitmentEvent?: boolean;
}): {
  status: "attributed" | "abstain";
  contributors: Array<{ momentId: string; authorUserId: string; hop: number; strength: AttributionStrength }>;
  isPayout: false;
  liveEconomic: false;
  reason?: string;
} {
  if (input.recruitmentEvent) {
    return {
      status: "abstain",
      contributors: [],
      isPayout: false,
      liveEconomic: false,
      reason: "recruitment_not_attributable",
    };
  }
  if (["none", "unverified", "failed", "cancelled", "canceled"].includes(input.status)) {
    return {
      status: "abstain",
      contributors: [],
      isPayout: false,
      liveEconomic: false,
      reason: "no_completed_transaction",
    };
  }
  const maxHops = input.maxHops ?? 3;
  const contributors = input.causalChain
    .filter((c) => c.hop < maxHops)
    .map((c) => ({
      momentId: c.momentId,
      authorUserId: c.authorUserId,
      hop: c.hop,
      strength: classifyAttributionStrength(c.evidence),
    }))
    .filter((c) => c.strength !== "non_causal_exposure");

  return {
    status: contributors.length ? "attributed" : "abstain",
    contributors,
    isPayout: false,
    liveEconomic: false,
    reason: contributors.length ? undefined : "no_causal_creator_evidence",
  };
}

/** Social ranking must ignore commission value — always. */
export function socialRankUsesCommission(): false {
  return false;
}

export function recruitmentAttributable(): false {
  return false;
}

/**
 * Simulated pool split only — label SIMULATION, not live payout.
 * Lineage length must not increase the pool size.
 */
export function simulatePoolSplit(
  contributors: Array<{ authorUserId: string; hop: number; strength: AttributionStrength }>,
  pool: number,
): {
  simulation: true;
  livePayout: false;
  label: "SIMULATION";
  pool: number;
  shares: Array<{ party: string; weight: number; amount: number }>;
  exceedsPool: boolean;
} {
  if (!contributors.length) {
    return {
      simulation: true,
      livePayout: false,
      label: "SIMULATION",
      pool,
      shares: [{ party: "opal", weight: 1, amount: pool }],
      exceedsPool: false,
    };
  }
  const raw = contributors.map((c) => {
    const w =
      c.hop === 0 && c.strength === "direct_causal"
        ? 0.5
        : c.hop === 0
          ? 0.4
          : c.hop === 1
            ? 0.2
            : c.hop === 2
              ? 0.1
              : 0.05;
    return { id: c.authorUserId, w };
  });
  const sumC = raw.reduce((s, r) => s + r.w, 0);
  const opalW = Math.max(0.15, 1 - sumC);
  const creatorBudget = 1 - opalW;
  const shares = raw.map((r) => {
    const weight = (r.w / sumC) * creatorBudget;
    return { party: r.id, weight: Number(weight.toFixed(4)), amount: Number((pool * weight).toFixed(2)) };
  });
  shares.push({
    party: "opal",
    weight: Number(opalW.toFixed(4)),
    amount: Number((pool * opalW).toFixed(2)),
  });
  const total = shares.reduce((s, x) => s + x.amount, 0);
  return {
    simulation: true,
    livePayout: false,
    label: "SIMULATION",
    pool,
    shares,
    exceedsPool: total > pool + 0.05,
  };
}
