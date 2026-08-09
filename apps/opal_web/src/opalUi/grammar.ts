/**
 * Opal UI Grammar — presentation helpers over existing signals.
 * Extends .opal-moment / semanticStateForSignal — not a parallel system.
 *
 * Relationship Pulse is EXPERIMENT ONLY (topic-scoped, non-numeric).
 * Visual reward only when social uncertainty decreases.
 */

import type { AvailabilityOverlap } from "../api/productClient";
import type { SignalKind } from "../data";

/** Canonical journey states Elixir may own. */
export type CanonicalJourneyState =
  | "quiet"
  | "plan_forming"
  | "still_open"
  | "availability_overlap"
  | "set"
  | "ready";

/**
 * Contextual vibe copy for shared surfaces.
 * Never names a person or implies "waiting on X".
 */
export function contextualSharedCopy(
  canonical: CanonicalJourneyState,
  opts?: { overlapCount?: number; hasAction?: boolean },
): string {
  switch (canonical) {
    case "plan_forming":
      return "Becoming a plan";
    case "still_open": {
      const n = opts?.overlapCount ?? 0;
      if (n >= 2) return "A couple options fit";
      if (n === 1) return "This could work";
      return "Still figuring this one out";
    }
    case "availability_overlap": {
      const n = opts?.overlapCount ?? 0;
      if (n >= 2) return `${n} times could work`;
      if (n === 1) return "This could work";
      return "A couple times could work";
    }
    case "set":
    case "ready":
      return "Set";
    case "quiet":
    default:
      return "";
  }
}

/** Map product SignalKind → canonical for copy selection. */
export function canonicalFromSignal(
  kind: SignalKind | string | undefined,
): CanonicalJourneyState {
  switch (kind) {
    case "plan_forming":
      return "plan_forming";
    case "open_loop":
      return "still_open";
    case "availability_overlap":
    case "option_surfaced":
      return "availability_overlap";
    case "set":
    case "ready":
      return "set";
    default:
      return "quiet";
  }
}

/** Opal Edge: journey bar has something useful (actionable state). */
export function shouldShowOpalEdge(input: {
  signalKind?: SignalKind | string;
  overlap?: AvailabilityOverlap | null;
  findTimeOpen?: boolean;
}): boolean {
  if (input.findTimeOpen) return false;
  const kind = input.signalKind;
  if (kind === "plan_forming" || kind === "open_loop") return true;
  if (input.overlap?.overlap_status === "overlap_found") return true;
  return false;
}

/**
 * Context chip label near composer — forward-looking action only.
 * Reject: "Still waiting on one", "Maya hasn't answered", etc.
 */
export function contextChipLabel(input: {
  signalKind?: SignalKind | string;
  overlap?: AvailabilityOverlap | null;
}): string | null {
  const o = input.overlap;
  if (o?.overlap_status === "overlap_found") {
    const n = o.overlaps?.length ?? 0;
    if (n >= 2) return `${n} times could work`;
    if (n === 1) return "See that time";
    return "See options";
  }
  const kind = input.signalKind;
  if (kind === "plan_forming" || kind === "open_loop") {
    return "Find a time";
  }
  return null;
}

/** Private guidance lines — first-person only, no peer assertions. */
export function privateGuidanceCopy(input: {
  overlap?: AvailabilityOverlap | null;
  hasPrivateWindows?: boolean;
}): { id: string; text: string } | null {
  if (input.overlap?.overlap_status === "overlap_found") {
    const n = input.overlap.overlaps?.length ?? 0;
    if (n >= 1) {
      return {
        id: "private-ideas",
        text: "Want a couple ideas?",
      };
    }
  }
  if (
    (input.overlap?.overlap_status === "need_more_shares" ||
      input.overlap?.overlap_status === "no_overlap") &&
    input.hasPrivateWindows
  ) {
    return {
      id: "private-share-prompt",
      text: "Share a couple times that work when you're ready.",
    };
  }
  return null;
}

/**
 * Relationship Pulse — EXPERIMENT ONLY.
 * Topic-scoped ambient of current journey state. Never numeric/comparative.
 * Disabled in production UI unless explicitly enabled for review.
 */
export const RELATIONSHIP_PULSE_EXPERIMENT = false;

export function relationshipPulseState(
  enabled: boolean,
  signalKind?: SignalKind | string,
): CanonicalJourneyState | null {
  if (!enabled || !RELATIONSHIP_PULSE_EXPERIMENT) return null;
  const c = canonicalFromSignal(signalKind);
  if (c === "quiet" || c === "set") return null;
  return c;
}

/** Forbidden shared copy substrings (anti-pressure). */
export const FORBIDDEN_PRESSURE_PHRASES = [
  "waiting on one",
  "hasn't answered",
  "holding this up",
  "still waiting on",
  "needs a minute",
  "plans changed",
  "hasn't shared yet",
] as const;

export function violatesPressureCopy(text: string): boolean {
  const t = text.toLowerCase();
  return FORBIDDEN_PRESSURE_PHRASES.some((p) => t.includes(p));
}
