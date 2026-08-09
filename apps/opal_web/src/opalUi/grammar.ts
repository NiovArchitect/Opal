/**
 * Opal UI Grammar — presentation helpers over existing signals.
 * Extends .opal-moment / semanticStateForSignal — not a parallel system.
 *
 * PRODUCT LAW:
 *   Opal earns screen space moment by moment.
 *   ONE meaningful Opal surface at a time.
 *   The most common answer is: nothing.
 *
 * Relationship Pulse is EXPERIMENT ONLY (topic-scoped, non-numeric).
 * Internal primitive names must never appear as product copy.
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
 * The single surface that may speak for Opal right now.
 * Capabilities compete internally; only one wins the screen.
 */
export type PrimaryOpalSurface =
  | { kind: "none" }
  | { kind: "set" }
  | { kind: "sheet" }
  | {
      kind: "overlap";
      label: string;
      detail?: string | null;
      expand: boolean;
      groupLine?: string | null;
      overlaps: AvailabilityOverlap["overlaps"];
    }
  | { kind: "chip"; label: string; withEdge: boolean }
  | { kind: "private"; id: string; text: string }
  | { kind: "edge" };

/**
 * Contextual vibe copy for shared surfaces.
 * Never names a person or implies "waiting on X".
 * Never exposes internal state-machine names.
 */
export function contextualSharedCopy(
  canonical: CanonicalJourneyState,
  opts?: { overlapCount?: number },
): string {
  switch (canonical) {
    case "plan_forming":
      // Not shown as a permanent status pill under one-surface rule.
      return "";
    case "still_open": {
      const n = opts?.overlapCount ?? 0;
      if (n >= 2) return "A couple times could work";
      if (n === 1) return "This could work";
      return "";
    }
    case "availability_overlap": {
      const n = opts?.overlapCount ?? 0;
      if (n >= 2) return "A couple times could work";
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

/**
 * Soft group-safe detail from real backend participant_count only.
 * Never a roster, never "waiting on X".
 */
export function groupShareCountLine(
  overlap: AvailabilityOverlap | null | undefined,
): string | null {
  const n = overlap?.participant_count;
  if (typeof n !== "number" || n < 3) return null;
  if (overlap?.overlap_status !== "overlap_found") return null;
  return `From ${n} people who shared a time`;
}

/**
 * Resolve the ONE primary Opal surface for this render.
 *
 * Priority (first match wins):
 * 1. private sheet open → only the sheet
 * 2. authoritative Set → only Set
 * 3. shared overlap → only the insight moment
 * 4. plan forming / still open → only "Find a time" chip (edge is ambient on it)
 * 5. private-only useful nudge → only private strip
 * 6. nothing
 *
 * Never stack edge + chip + moment + private + status.
 */
export function resolvePrimaryOpalSurface(input: {
  signalKind?: SignalKind | string;
  overlap?: AvailabilityOverlap | null;
  findTimeOpen?: boolean;
  hasPrivateWindows?: boolean;
  privateDismissed?: Set<string> | ReadonlySet<string>;
  overlapExpanded?: boolean;
}): PrimaryOpalSurface {
  if (input.findTimeOpen) {
    return { kind: "sheet" };
  }

  const kind = input.signalKind;
  if (kind === "set" || kind === "ready") {
    return { kind: "set" };
  }

  const o = input.overlap;
  if (o?.overlap_status === "overlap_found") {
    const n = o.overlaps?.length ?? 0;
    const label =
      contextualSharedCopy("availability_overlap", { overlapCount: n }) ||
      o.label ||
      "This could work";
    return {
      kind: "overlap",
      label,
      detail: null, // detail lives in expand / single-line choice
      expand: Boolean(input.overlapExpanded) && n >= 2,
      groupLine: groupShareCountLine(o),
      overlaps: o.overlaps ?? [],
    };
  }

  if (kind === "plan_forming" || kind === "open_loop") {
    return { kind: "chip", label: "Find a time", withEdge: true };
  }

  // Private-only: useful when user has windows and no louder shared action.
  if (input.hasPrivateWindows) {
    const id = "private-share-prompt";
    if (!input.privateDismissed?.has(id)) {
      return {
        kind: "private",
        id,
        // Age-12 short; not product-instruction prose
        text: "Share when you're ready",
      };
    }
  }

  return { kind: "none" };
}

/** @deprecated Use resolvePrimaryOpalSurface — Edge is not a separate stacked surface. */
export function shouldShowOpalEdge(input: {
  signalKind?: SignalKind | string;
  overlap?: AvailabilityOverlap | null;
  findTimeOpen?: boolean;
}): boolean {
  const p = resolvePrimaryOpalSurface(input);
  return p.kind === "chip" && p.withEdge;
}

/**
 * Context Chip label — only when chip is the primary surface.
 */
export function contextChipLabel(input: {
  signalKind?: SignalKind | string;
  overlap?: AvailabilityOverlap | null;
  findTimeOpen?: boolean;
  hasPrivateWindows?: boolean;
}): string | null {
  const p = resolvePrimaryOpalSurface(input);
  return p.kind === "chip" ? p.label : null;
}

/**
 * Private guidance — only when private is the primary surface.
 * (Sheet content is separate; this is the composer-adjacent strip.)
 */
export function privateGuidanceCopy(input: {
  overlap?: AvailabilityOverlap | null;
  hasPrivateWindows?: boolean;
  findTimeOpen?: boolean;
  signalKind?: SignalKind | string;
  quiet?: boolean;
}): { id: string; text: string; quiet?: boolean } | null {
  const p = resolvePrimaryOpalSurface({
    signalKind: input.signalKind,
    overlap: input.overlap,
    findTimeOpen: input.findTimeOpen,
    hasPrivateWindows: input.hasPrivateWindows,
  });
  if (p.kind !== "private") return null;
  return { id: p.id, text: p.text, quiet: false };
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
  "count only",
  "never a roster",
] as const;

/** Internal design/primitive names that must never appear in product UI. */
export const FORBIDDEN_INTERNAL_PRIMITIVE_NAMES = [
  "opal edge",
  "context chip",
  "expanded moment",
  "private guidance",
  "relationship pulse",
  "alignment gap",
  "minimum question",
  "collective fit",
  "opal journey review",
  "reward only when",
  "uncertainty drops",
  "plan forming",
  "overlap found",
  "shared-safe",
] as const;

export function violatesPressureCopy(text: string): boolean {
  const t = text.toLowerCase();
  return FORBIDDEN_PRESSURE_PHRASES.some((p) => t.includes(p));
}

/** Strings that must never appear as product-facing copy. */
export function isInternalDesignCopy(text: string): boolean {
  const t = text.toLowerCase();
  if (
    t.includes("count only") ||
    t.includes("never a roster") ||
    t.includes("not yet wired") ||
    t.includes("harness") ||
    t.includes("debug")
  ) {
    return true;
  }
  return FORBIDDEN_INTERNAL_PRIMITIVE_NAMES.some((p) => t.includes(p));
}
