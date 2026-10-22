/**
 * Repair #21 - Cluster Flows Wave 2 (W-12..W-15 + I-1..I-3) pure
 * builders. Everything in this module is a pure function over
 * finished projection facts: the seed-door composition (I-1
 * refined - the four doors), the counts-free light warmth tiers
 * (W-13 / I-2), and the happening-first split for the braided
 * stream (W-15). The surfaces render what these builders return
 * and derive nothing themselves.
 */

import type { FeedCardProjection } from "./projections";

/* ------------------------------------------------------------------ */
/* I-1 refined - THE FOUR DOORS                                        */
/*                                                                     */
/* A person seeing a friend's moment may want any of:                  */
/*   join       "I want in on the next one" - me + the original        */
/*              party, next occurrence.                                */
/*   solo       "I want that for myself" - the place/activity          */
/*              becomes MY plan, solo shape, PRIVATE by default.       */
/*   my-people  the same seed, a different party entirely - my         */
/*              chosen people; the original party NOT involved.        */
/*   again      the same party repeats (the settled plan pattern,      */
/*              wired here from its existing home in graph detail).    */
/*                                                                     */
/* All four land in the real graph-create path with the seed's         */
/* place/activity pre-filled and the party set per branch. The seed    */
/* carries PROVENANCE, consent-scoped: a plan seed rides the           */
/* graph-create source_plan_id lineage (repeated_from_plan_id); a      */
/* moment seed rides inspired_by_moment_id, which the server stamps    */
/* only when the creator may lawfully view the moment. Solo and        */
/* my-people branches inherit the place/activity and the lineage -     */
/* never the original party's private data: their party composition    */
/* contains no original-party id by construction (see the builders).  */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Repair #21 (W-17) - the creation walkthrough's graph tenses.       */
/* A graph post is told by WHEN it sits: present (happening now),     */
/* future (a plan that hasn't happened - the Opal-native post),       */
/* past (settled). The tense is carried into the ONE real graph-      */
/* create flow; the create contract's time is a label, so the         */
/* present tense carries its word ("Now") and the others open         */
/* the form bare. The tense-true birth states are declared in         */
/* the wave report - this module carries only what is true.           */
/*                                                                     */
/* Repair #22 (R22-E) - the founder's tense names: Now stays Now       */
/* (the live moment), future is FORECAST (the graph ahead), past is    */
/* MEMORIES (the settled past). These labels are the ONLY user-        */
/* facing tense names; no surface may revive "Ahead" / "Settled"       */
/* as a tense name.                                                    */
/* ------------------------------------------------------------------ */

export type CreationTense = "present" | "future" | "past";

export const CREATION_TENSE_LABELS: Record<CreationTense, string> = {
  present: "Now",
  future: "Forecast",
  past: "Memories",
};

/** The When words a tense carries into the create form. Only the
 *  present tense has honest words today ("Now"); a future plan's
 *  time is the user's to write, and a settled graph's past time
 *  is theirs to name - the form never invents either. */
export function whenLabelForTense(tense: CreationTense): string | undefined {
  return tense === "present" ? "Now" : undefined;
}

export type SeedBranch = "join" | "solo" | "my-people" | "again";

export type MomentSeed = {
  kind: "moment";
  momentId: string;
  authorUserId: string | null;
  authorName: string;
  caption: string;
  placeLabel: string | null;
  mine: boolean;
};

export type PlanSeed = {
  kind: "plan";
  planId: string;
  title: string;
  location: string | null;
  placeLat: number | null;
  placeLon: number | null;
  planType: string | null;
  viewerState: string | null;
  organizerUserId: string | null;
};

export type SeedSource = MomentSeed | PlanSeed;

/** The create-flow prefill one branch produces. `participantUserIds`
 *  is the branch's STARTING party in the create form: locked for
 *  join/again (the party is the branch's meaning), open for
 *  my-people (the user chooses), empty for solo. */
export type SeedCreate = {
  branch: SeedBranch;
  title: string;
  location?: string;
  placeLat?: number;
  placeLon?: number;
  participantUserIds: string[];
  audience: "private" | "close_circle";
  sourcePlanId?: string;
  inspiredByMomentId?: string;
  entry: string;
  /** True when the create form's Who selection IS the party
   *  (join / again): the form renders it as the branch's fact. */
  lockParty: boolean;
  /** True when the party must be read at door time from the source
   *  plan's history projection before the create form opens (plan
   *  seeds): a card never carries a roster, so no branch composes
   *  a party from the card. Filled by the shell into
   *  participantUserIds before the form opens. */
  needsPartyRead: boolean;
};

const BRANCH_ENTRY: Record<SeedBranch, string> = {
  join: "flows-seed-join",
  solo: "flows-seed-solo",
  "my-people": "flows-seed-my-people",
  again: "flows-seed-again",
};

/** Which doors a source honestly offers.
 *  - A friend's moment: join (with its author), solo, my-people.
 *    "Again" is NOT offered on a moment: the moment record carries
 *    no party roster to repeat (its party lives on a source plan,
 *    where the existing repeat flow already serves it) - designed
 *    and declared in the wave report, never faked with a door
 *    that would compose a party from nothing.
 *  - My own moment: only my-people (take it out with chosen
 *    people). Join/solo against my own moment are spent shapes.
 *  - A plan: join only when the viewer is not already in (their
 *    state is neither going nor host), plus solo, my-people, and
 *    again (the same party repeats, through the repeat lineage). */
export function doorsForSource(source: SeedSource): SeedBranch[] {
  if (source.kind === "moment") {
    return source.mine ? ["my-people"] : ["join", "solo", "my-people"];
  }
  const alreadyIn = source.viewerState === "going" || source.viewerState === "host";
  return alreadyIn
    ? ["solo", "my-people", "again"]
    : ["join", "solo", "my-people", "again"];
}

export const SEED_DOOR_LABELS: Record<SeedBranch, string> = {
  join: "I want in",
  solo: "Take it solo",
  "my-people": "Take it with my people",
  again: "Do that again",
};

function momentTitle(source: MomentSeed): string {
  const caption = source.caption.trim();
  if (caption) return caption;
  if (source.placeLabel) return source.placeLabel;
  return `${source.authorName}'s moment`;
}

/** Compose one branch's create prefill from a seed. Pure: the
 *  branch's party law lives here and nowhere else.
 *  - join on a moment: the party is the moment's author - the one
 *    original-party member the moment record itself names. The
 *    moment carries no wider roster, so none is composed.
 *  - join/again on a plan: needsPartyRead - the shell reads the
 *    roster from the plan's history projection (the repeat flow's
 *    own source) and fills participantUserIds before opening.
 *  - solo: no participants, audience private - by construction no
 *    original-party id can appear here.
 *  - my-people: no participants pre-filled and the form's Who
 *    picker starts empty, so the original party is not involved
 *    unless the user deliberately picks a person themselves. */
export function seedCreateFor(source: SeedSource, branch: SeedBranch): SeedCreate | null {
  if (!doorsForSource(source).includes(branch)) return null;
  const entry = BRANCH_ENTRY[branch];
  if (source.kind === "moment") {
    const base = {
      branch,
      title: momentTitle(source),
      location: source.placeLabel ?? undefined,
      inspiredByMomentId: source.momentId,
      entry,
    };
    if (branch === "join") {
      return {
        ...base,
        participantUserIds: source.authorUserId ? [source.authorUserId] : [],
        audience: "close_circle",
        lockParty: true,
        needsPartyRead: false,
      };
    }
    if (branch === "solo") {
      return {
        ...base,
        participantUserIds: [],
        audience: "private",
        lockParty: true,
        needsPartyRead: false,
      };
    }
    // my-people
    return {
      ...base,
      participantUserIds: [],
      audience: "close_circle",
      lockParty: false,
      needsPartyRead: false,
    };
  }
  // Plan seed.
  const base = {
    branch,
    title: source.title,
    location: source.location ?? undefined,
    placeLat: source.placeLat ?? undefined,
    placeLon: source.placeLon ?? undefined,
    sourcePlanId: source.planId,
    entry,
  };
  if (branch === "join" || branch === "again") {
    return {
      ...base,
      participantUserIds: [],
      audience: "close_circle",
      lockParty: true,
      needsPartyRead: true,
    };
  }
  if (branch === "solo") {
    return {
      ...base,
      participantUserIds: [],
      audience: "private",
      lockParty: true,
      needsPartyRead: false,
    };
  }
  return {
    ...base,
    participantUserIds: [],
    audience: "close_circle",
    lockParty: false,
    needsPartyRead: false,
  };
}

/* ------------------------------------------------------------------ */
/* W-13 / I-2 - LIGHT, COUNTS-FREE                                     */
/*                                                                     */
/* A moment collects light from its people; the glow is the count      */
/* made visible. Presentation never carries a numeral: the warmth      */
/* the server reports maps to one of four glow tiers, and the tier     */
/* is all the surface renders. Giving light is one touch; a long       */
/* press holds the glow deeper WHILE HELD (a held glow, not a          */
/* bigger number) and commits the same single light on release -       */
/* the engagement store holds one light per person, and no depth       */
/* field exists in it (declared in the wave report).                   */
/* ------------------------------------------------------------------ */

export type LightTier = "cold" | "warm" | "warmer" | "glow";

export function lightTierFor(warmth: number): LightTier {
  if (warmth <= 0) return "cold";
  if (warmth <= 2) return "warm";
  if (warmth <= 5) return "warmer";
  return "glow";
}

/* ------------------------------------------------------------------ */
/* W-15 - HAPPENING FIRST                                              */
/*                                                                     */
/* The page's felt content leads with what is HAPPENING: Lives and     */
/* happening plans lift out of the braid to directly under the         */
/* stones, ahead of occasions and the game, inside the eye-path law    */
/* (people first - the stones - then happening, then the stream).      */
/* The split reads only finished projection facts (kind + the          */
/* card's own state family); relative order inside each part is        */
/* the feed's own order, untouched.                                    */
/* ------------------------------------------------------------------ */

export function happeningFirst(feed: FeedCardProjection[]): {
  happening: FeedCardProjection[];
  rest: FeedCardProjection[];
} {
  const happening: FeedCardProjection[] = [];
  const rest: FeedCardProjection[] = [];
  for (const item of feed) {
    if (item.kind === "live") happening.push(item);
    else if (item.kind === "plan" && item.card.stateFamily === "happening") happening.push(item);
    else rest.push(item);
  }
  return { happening, rest };
}
