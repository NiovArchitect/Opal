/**
 * Repair #18 - Division C2 - reference plan card (C1 section 4 grammar,
 * C2 section 2.4 treatments). This is the foundation proof the C1/C2
 * surface phases consume: ONE card grammar rendered purely from tokens.
 *
 * CONTRACT (founder engineering law): every input is an explicit,
 * finished projection field. The card NEVER derives plan state from
 * raw fields, label text, or counts: the caller passes the derived
 * state family (from the single derivation) and finished strings.
 * An unknown state family renders the forming treatment with the pill
 * label "Needs a look" and logs the value (section 2.4 unknown-state
 * law) - it never defaults silently to ready.
 */
import React, { useEffect, useState } from "react";
import { StateRule, StateStone } from "../brand/orb/FireLine";
import { AuthedImage } from "../media/AuthedImage";

/** One person face: the record photo through the authenticated
 *  image path (W21 F1), initials on any failure. */
function PlanPersonFace({ person }: { person: PlanCardPersonC2 }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [person.photoUrl]);
  if (person.photoUrl && !failed) {
    return <AuthedImage src={person.photoUrl} alt="" draggable={false} onError={() => setFailed(true)} />;
  }
  return <>{person.initials}</>;
}

export type PlanStateFamilyC2 = "forming" | "action" | "ready" | "happening" | "past";

export const PLAN_STATE_FAMILIES_C2: readonly PlanStateFamilyC2[] = [
  "forming",
  "action",
  "ready",
  "happening",
  "past",
] as const;

export function isPlanStateFamilyC2(v: unknown): v is PlanStateFamilyC2 {
  return typeof v === "string" && (PLAN_STATE_FAMILIES_C2 as readonly string[]).includes(v);
}

/** Non-color cue per state (section 2.4): glyph + border style + label. */
export const PLAN_STATE_GLYPH_C2: Record<PlanStateFamilyC2, string> = {
  forming: "○",
  action: "▲",
  ready: "✓",
  happening: "◎",
  past: "■",
};

/**
 * Repair #19 (W9) - the record's own imagery for a plan card. Set
 * ONLY from a URL-shaped image field on the plan record itself (see
 * shellData.planImageFromRecord for the field precedence and its
 * provenance stamp). Absent = the card renders no media well at
 * all; there is no placeholder image and no text-in-a-hole.
 */
export type PlanCardMediaC2 = {
  photoUrl: string;
  /** Which record field supplied the image (build vocabulary,
   *  rendered only as a data attribute, never on screen). */
  provenance: string;
};

/** One real person on the plan, from the record (organizer today;
 *  the list contract carries no roster - see the W9 report gap). */
export type PlanCardPersonC2 = {
  name: string;
  initials: string;
  /** Person tint token suffix 1-6, or null. */
  tint: number | null;
  photoUrl?: string | null;
};

export type PlanCardC2Input = {
  /** Derived state family from the one projection/derivation. Required. */
  stateFamily: PlanStateFamilyC2 | string;
  /** Finished pill label from the projection (for example "Idea" for a
   *  forming idea, "Live" for a live happening plan). */
  stateLabel: string;
  /** Human title. Always rendered in surface ink, never state color. */
  title: string;
  /** Finished when line from the projection (already formatted). */
  whenLine: string;
  /** Finished where line, or null when unset on compact cards. */
  whereLine?: string | null;
  /** Finished attendance string (for example "3 of 4 going"), or null
   *  when attendance is null in the projection - then no row renders. */
  attendanceLine?: string | null;
  /** The one primary action label for the state, or null. */
  primaryActionLabel?: string | null;
  /** Repair #19 (W9) - the record's own image, or absent. */
  media?: PlanCardMediaC2 | null;
  /** R19 W27 (AT-10 / AR-F4): the surface's lit verdict for this
   *  card. Undefined = the surface does not run the lit cap (the
   *  card renders its full state register). On a capped surface
   *  exactly one card is lit:true; every other lit candidate is
   *  lit:false and rests at border-only. Set by the surface from
   *  litWinnerId - the card never decides this itself. */
  lit?: boolean;
  /** Repair #19 (W9) - real people on the plan, from the record. */
  people?: PlanCardPersonC2[];
  /** Repair #19 (W9) - finished people line from the record
   *  (the plan contract's who_label), or null. */
  peopleLine?: string | null;
};

/**
 * AT-10 / AR-F4 burst coalescence: among lit candidates (non-past
 * cards), the ONE lit winner - strongest state by reveal priority
 * (action > happening > ready > forming); ties go to the earliest
 * card in projection order (the feed's most-recent-first order).
 * Past is never a candidate. Returns null when nothing can be lit.
 */
export const LIT_STATE_PRIORITY: Record<PlanStateFamilyC2, number> = {
  action: 0,
  happening: 1,
  ready: 2,
  forming: 3,
  past: 4,
};

export function litWinnerId(
  cards: readonly { id: string; stateFamily: PlanStateFamilyC2 | string }[],
): string | null {
  let winner: string | null = null;
  let winnerRank = Number.POSITIVE_INFINITY;
  for (const card of cards) {
    const family = isPlanStateFamilyC2(card.stateFamily) ? card.stateFamily : "forming";
    const rank = LIT_STATE_PRIORITY[family];
    if (rank < winnerRank) {
      winnerRank = rank;
      winner = card.id;
    }
  }
  return winnerRank <= LIT_STATE_PRIORITY.forming ? winner : null;
}

export function PlanStatePillC2({
  stateFamily,
  stateLabel,
}: {
  stateFamily: PlanStateFamilyC2 | string;
  stateLabel: string;
}) {
  const known = isPlanStateFamilyC2(stateFamily);
  const family: PlanStateFamilyC2 = known ? stateFamily : "forming";
  const label = known ? stateLabel : "Needs a look";
  if (!known && typeof console !== "undefined") {
    console.warn("[opal-c2] unknown plan state family in projection", { stateFamily });
  }
  return (
    <span
      className="c2-state-pill"
      data-plan-state={family}
      data-plan-state-known={known ? "1" : "0"}
      data-testid="c2-plan-state-pill"
    >
      <StateStone state={family} size={12} />
      <span className="c2-state-glyph" aria-hidden>
        {PLAN_STATE_GLYPH_C2[family]}
      </span>
      <span className="c2-state-label">{label}</span>
    </span>
  );
}

export function PlanCardC2({
  input,
  onOpen,
  onPrimaryAction,
}: {
  input: PlanCardC2Input;
  onOpen?: () => void;
  onPrimaryAction?: () => void;
}) {
  const family: PlanStateFamilyC2 = isPlanStateFamilyC2(input.stateFamily)
    ? input.stateFamily
    : "forming";
  // Repair #19 W20 (JA-12): a failed image must not collapse the
  // media well to 0 height or leave a broken-image hole — on
  // error the well keeps its designed height and takes the
  // designed no-image treatment (the plan's state stone + title
  // initial, the card-grammar analogue of the memory monogram).
  const [mediaFailed, setMediaFailed] = useState(false);
  // W21 (F1): a new record image gets a fresh authenticated attempt.
  useEffect(() => setMediaFailed(false), [input.media?.photoUrl]);
  return (
    <article
      className="c2-plan-card"
      data-plan-state={family}
      data-lit={
        input.lit === undefined ? undefined : input.lit ? "lit" : "capped"
      }
      data-testid="c2-plan-card"
      onClick={onOpen}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
    >
      <div className="c2-plan-card-top">
        <PlanStatePillC2 stateFamily={input.stateFamily} stateLabel={input.stateLabel} />
      </div>
      {/* AT-08 (R19 W27): iris fire is reserved for lit items -
       * an ordinary plan card carries its STATE rule (canon hue at
       * ambient strength), never the fire line. Past rests: no rule. */}
      {family !== "past" ? (
        <div style={{ marginTop: 10 }} aria-hidden>
          <StateRule state={family} />
        </div>
      ) : null}
      {input.media?.photoUrl ? (
        <div
          className="c2-plan-media"
          data-testid="c2-plan-media"
          data-media-provenance={input.media.provenance}
          data-media-state={mediaFailed ? "fallback" : "photo"}
        >
          {mediaFailed ? (
            <span
              className="c2-plan-media-fallback"
              data-testid="c2-plan-media-fallback"
              aria-hidden
            >
              <StateStone state={family} size={28} />
              <span className="c2-plan-media-fallback-initial">
                {input.title.slice(0, 1).toUpperCase()}
              </span>
            </span>
          ) : (
            <AuthedImage
              src={input.media.photoUrl}
              alt=""
              draggable={false}
              onError={() => setMediaFailed(true)}
            />
          )}
        </div>
      ) : null}
      <h3 className="c2-plan-title">{input.title}</h3>
      <p className="c2-plan-when">{input.whenLine}</p>
      {input.whereLine ? <p className="c2-plan-where">{input.whereLine}</p> : null}
      {input.attendanceLine ? (
        <p className="c2-plan-attendance">{input.attendanceLine}</p>
      ) : null}
      {input.people && input.people.length > 0 ? (
        <div className="c2-plan-people" data-testid="c2-plan-people">
          <span className="c2-plan-people-faces" aria-hidden>
            {input.people.slice(0, 4).map((person) => (
              <span
                key={person.name}
                className="c2-plan-person"
                data-tint={person.tint ?? undefined}
                title={person.name}
              >
                <PlanPersonFace person={person} />
              </span>
            ))}
          </span>
          <span className="c2-plan-people-line">
            {input.peopleLine ?? input.people.map((p) => p.name).join(", ")}
          </span>
        </div>
      ) : input.peopleLine ? (
        <p className="c2-plan-attendance" data-testid="c2-plan-people-line">
          {input.peopleLine}
        </p>
      ) : null}
      {input.primaryActionLabel ? (
        <button
          type="button"
          className="c2-plan-primary"
          data-testid="c2-plan-primary"
          onClick={(e) => {
            e.stopPropagation();
            onPrimaryAction?.();
          }}
        >
          {input.primaryActionLabel}
        </button>
      ) : null}
    </article>
  );
}
