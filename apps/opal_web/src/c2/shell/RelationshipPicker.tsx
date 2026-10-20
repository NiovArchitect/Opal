/**
 * Repair #19 W24 (DL-01) — THE identification sheet: "How do you
 * know {name}?"
 *
 * One picker, one write path. Every moment of need in the served
 * shell — the person profile's "Who they are to you" row, the
 * thread's profile path (the same profile sheet), and a completed
 * person-add — opens THIS sheet, and choosing runs the host's one
 * relationship write (PUT /api/v1/product/relationships/:id through
 * setRelationshipType). There is no second implementation.
 *
 * Persona-spectrum staging (founder steer, 2026-10-19): the
 * journey spans brand-new, confused, smart, and super users, and
 * the rule is PROGRESSIVE DEPTH — simple on the surface, power
 * underneath.
 *  - FIRST FACE: the plain question and the seven choices in human
 *    words. Nothing else competes — no save button, no notes.
 *  - ONE TAP FINISHES: tapping a type (other than Family) saves it
 *    through the one write and closes. A new user is never
 *    examined, never asked to confirm what they just said.
 *  - DEPTH OPENS ONLY ON CHOICE: Family does not save on tap — it
 *    expands INLINE, accordion-style, directly under the Family
 *    row (Founder Screen Notes N3: expand/collapse in place, never
 *    a separate step or screen): the subtype choices (DL-02, the
 *    backend's real vocabulary), the minor flag, and the age-band
 *    establishment (N4), with the sheet's one Save. Tapping Family
 *    again collapses the expansion in place; the selection is
 *    kept. A super user finds the depth without hunting; nobody
 *    else ever sees it.
 *  - CLOSE CIRCLE SITS QUIETLY BELOW, explained in one plain line.
 *    DL-09 truth: membership is DERIVED from the type on the
 *    backend (spouse / partner / family / close friend) — there is
 *    no per-person audience write, so the toggle's real semantics
 *    run through the type itself: switching it ON for a friend /
 *    business / acquaintance (or untyped) person chooses Close
 *    friend through the one write; switching it OFF from Close
 *    friend steps them back to Friend. For spouse / partner /
 *    family the switch reads ON and does not move — those ties are
 *    in the circle by who they are, and the line says the toggle
 *    follows the relationship, never the reverse. It is a cue
 *    there, not a dead control pretending to a write.
 *
 * DL-11: Opal's inference ("I think of {name} as a close friend —
 * right?") has NO served data source — the prompt exists only in
 * the backend domain (Relationships.Inference.pending_prompt/1 via
 * Intelligence.ProductSurface.memory_transparency/1) and no HTTP
 * route or client contract carries it to this shell. So the picker
 * takes an optional `suggestion` prop that hosts may pass ONLY from
 * a real served read; no host passes one today, and nothing here
 * invents one. When present, the suggested choice is pre-picked
 * and labelled inside its own row — it never auto-saves.
 */
import React, { useState } from "react";
import { TopLayer } from "../../opalUi/TopLayer";
import {
  AGE_BAND_OPTIONS,
  FAMILY_SUBTYPE_OPTIONS,
  RELATIONSHIP_TYPE_OPTIONS,
  isCloseCircleType,
  type AgeBandValue,
} from "../../opalUi/relationshipTypes";

export type RelationshipSave = (input: {
  type: string;
  familySubtype: string | null;
  familyMinor: boolean;
  /** Founder Screen Notes N4 — the age-band statement, present
   *  ONLY when the picker is making one (a band was chosen or an
   *  established band was cleared); undefined = no statement, the
   *  stored band is left untouched. null = clear the band. */
  ageBand?: AgeBandValue | null;
}) => Promise<void>;

/** Types that are in the close circle by who they are — the toggle
 *  cannot move them out, because the backend derives membership
 *  from the type itself. */
const INHERENT_CLOSE_TYPES: ReadonlySet<string> = new Set([
  "spouse",
  "partner",
  "family",
]);

export function RelationshipPickerSheet({
  personName,
  currentType,
  currentFamilySubtype,
  currentFamilyMinor,
  currentAgeBand,
  suggestion,
  onSave,
  onClose,
}: {
  personName: string;
  currentType: string | null;
  currentFamilySubtype?: string | null;
  currentFamilyMinor?: boolean;
  /** N4 — the established age band on the relationship record,
   *  or null when none has been established. */
  currentAgeBand?: AgeBandValue | null;
  /** DL-11: a real inferred suggestion, when a served source exists. */
  suggestion?: { type: string; familySubtype?: string | null } | null;
  onSave: RelationshipSave;
  onClose: () => void;
}) {
  const firstName = personName.trim().split(/\s+/)[0] || personName;
  const suggested = Boolean(
    suggestion && suggestion.type && suggestion.type !== currentType,
  );
  const [type, setType] = useState<string | null>(
    currentType ?? (suggested ? suggestion!.type : null),
  );
  const [subtype, setSubtype] = useState<string | null>(
    currentFamilySubtype ??
      (suggested ? (suggestion!.familySubtype ?? null) : null),
  );
  const [minor, setMinor] = useState<boolean>(currentFamilyMinor === true);
  // N4: the band being established in this sheet (null = not set).
  const [ageBand, setAgeBand] = useState<AgeBandValue | null>(currentAgeBand ?? null);
  // N3: the Family accordion - expanded in place under the Family
  // row. Opens expanded when Family is the current type.
  const [familyOpen, setFamilyOpen] = useState<boolean>(
    (currentType ?? (suggested ? suggestion!.type : null)) === "family",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** A failed one-tap save earns the sheet's explicit Save (retry)
   *  — the first face never carries one. */
  const [saveOffered, setSaveOffered] = useState(false);

  const persist = async (
    nextType: string,
    nextSubtype: string | null,
    nextMinor: boolean,
  ) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSave({
        type: nextType,
        familySubtype: nextType === "family" ? nextSubtype : null,
        familyMinor: nextType === "family" ? nextMinor : false,
        // N4: a family save carries the band statement exactly as
        // shown (the selected band, or null when none is set). A
        // non-family one-tap save makes NO band statement - the
        // stored band is a fact about the person and survives the
        // tie change untouched.
        ageBand: nextType === "family" ? ageBand : undefined,
      });
      onClose();
    } catch {
      setBusy(false);
      setSaveOffered(true);
      setError("That did not save. Check your connection and try again.");
    }
  };

  /** One tap finishes — except Family, which expands in place. */
  const choose = (value: string) => {
    if (value === "family") {
      if (type === "family") {
        // N3: tapping Family again collapses the accordion in
        // place; the selection (and the Save below) stays.
        setFamilyOpen((v) => !v);
      } else {
        setType("family");
        setFamilyOpen(true);
      }
      setSaveOffered(false);
      setError(null);
      return;
    }
    setType(value);
    setFamilyOpen(false);
    void persist(value, null, false);
  };

  /** N4: choosing a band is a truthful statement about the person -
   *  the two minor bands turn the minor flag on, Adult turns it
   *  off (minor is 17 and under); clearing the band leaves the
   *  manual minor flag as it stands. */
  const chooseAgeBand = (band: AgeBandValue | null) => {
    setAgeBand(band);
    if (band === "under_13" || band === "age_13_17") setMinor(true);
    else if (band === "adult") setMinor(false);
  };

  const inCircle = isCloseCircleType(type);
  const circleLocked = type !== null && INHERENT_CLOSE_TYPES.has(type);

  const toggleCircle = () => {
    if (busy || circleLocked) return;
    if (type === "close_friend") {
      // The one real step out of the circle: close friend → friend.
      setType("friend");
      void persist("friend", null, false);
    } else {
      // The one real step in, for anyone not already in by type.
      setType("close_friend");
      void persist("close_friend", null, false);
    }
  };

  return (
    <TopLayer band="sheet">
      <div className="c2s-scrim" onClick={onClose}>
        <div
          className="c2s-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={`How do you know ${personName}?`}
          data-testid="r19-relationship-picker"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="c2s-sheet-title">How do you know {firstName}?</p>
          <div role="radiogroup" aria-label="Relationship type">
            {RELATIONSHIP_TYPE_OPTIONS.map((opt) => (
              <React.Fragment key={opt.value}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={type === opt.value}
                  aria-expanded={opt.value === "family" ? familyOpen : undefined}
                  className="c2s-sheet-row"
                  data-testid={`r19-relationship-option-${opt.value}`}
                  data-selected={type === opt.value ? "true" : undefined}
                  disabled={busy}
                  onClick={() => choose(opt.value)}
                >
                  <span>
                    {opt.label}
                    {suggested && suggestion!.type === opt.value ? (
                      <small>Opal's suggestion</small>
                    ) : null}
                  </span>
                </button>
                {opt.value === "family" && type === "family" && familyOpen ? (
                  <div
                    data-testid="r19-family-subtype-step"
                    data-accordion="inline"
                  >
                    <p className="c2s-card-line">Family — who are they to you?</p>
                    <div role="radiogroup" aria-label="Family subtype">
                      {FAMILY_SUBTYPE_OPTIONS.map((sub) => (
                        <button
                          key={sub.value}
                          type="button"
                          role="radio"
                          aria-checked={subtype === sub.value}
                          className="c2s-sheet-row"
                          data-testid={`r19-family-subtype-${sub.value}`}
                          data-selected={subtype === sub.value ? "true" : undefined}
                          onClick={() => setSubtype(sub.value)}
                        >
                          <span>{sub.label}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="c2s-sheet-row"
                      data-testid="r19-family-minor"
                      aria-pressed={minor}
                      onClick={() => setMinor((v) => !v)}
                    >
                      <span>
                        {firstName} is a minor
                        <small>
                          {minor
                            ? "On — Opal keeps nudges about them to essentials."
                            : "Off"}
                        </small>
                      </span>
                    </button>
                    {/* N4 — age-band establishment, next to the minor
                        flag. A fact about the person, stored on the
                        relationship record; no policy reads it yet. */}
                    <p className="c2s-card-line">
                      {firstName}'s age band
                      <small>
                        {ageBand
                          ? "Recorded on this relationship. It changes nothing about what Opal does today."
                          : "Not set. Recording it changes nothing about what Opal does today."}
                      </small>
                    </p>
                    <div role="radiogroup" aria-label="Age band" data-testid="r19-age-band">
                      {AGE_BAND_OPTIONS.map((band) => (
                        <button
                          key={band.value}
                          type="button"
                          role="radio"
                          aria-checked={ageBand === band.value}
                          className="c2s-sheet-row"
                          data-testid={`r19-age-band-${band.value}`}
                          data-selected={ageBand === band.value ? "true" : undefined}
                          onClick={() => chooseAgeBand(band.value)}
                        >
                          <span>{band.label}</span>
                        </button>
                      ))}
                      {ageBand ? (
                        <button
                          type="button"
                          className="c2s-sheet-row"
                          data-testid="r19-age-band-clear"
                          onClick={() => chooseAgeBand(null)}
                        >
                          <span>Not set</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </React.Fragment>
            ))}
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={inCircle}
            aria-disabled={circleLocked || undefined}
            className="c2s-sheet-row"
            data-testid="r19-close-circle-toggle"
            disabled={busy}
            onClick={toggleCircle}
          >
            <span>
              Close circle
              <small>
                {circleLocked
                  ? "Always on for family and partners — it follows who they are to you."
                  : "The people your closest moments are shared with."}
              </small>
            </span>
            <span aria-hidden>{inCircle ? "On" : "Off"}</span>
          </button>

          {error ? (
            <p className="c2s-card-line" role="alert" data-testid="r19-relationship-error">
              {error}
            </p>
          ) : null}
          {type === "family" || saveOffered ? (
            <button
              type="button"
              className="c2s-btn-primary"
              data-testid="r19-relationship-save"
              disabled={!type || busy}
              onClick={() => {
                if (type) void persist(type, subtype, minor);
              }}
            >
              {busy ? "Saving…" : "Save"}
            </button>
          ) : null}
          <button type="button" className="c2s-btn-text" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </TopLayer>
  );
}
