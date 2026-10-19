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
 *    opens the subtype step (DL-02, the backend's real vocabulary)
 *    plus the minor flag below the choices, with the sheet's one
 *    Save. A super user finds the depth without hunting; nobody
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
  FAMILY_SUBTYPE_OPTIONS,
  RELATIONSHIP_TYPE_OPTIONS,
  isCloseCircleType,
} from "../../opalUi/relationshipTypes";

export type RelationshipSave = (input: {
  type: string;
  familySubtype: string | null;
  familyMinor: boolean;
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
  suggestion,
  onSave,
  onClose,
}: {
  personName: string;
  currentType: string | null;
  currentFamilySubtype?: string | null;
  currentFamilyMinor?: boolean;
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
      });
      onClose();
    } catch {
      setBusy(false);
      setSaveOffered(true);
      setError("That did not save. Check your connection and try again.");
    }
  };

  /** One tap finishes — except Family, which opens its depth. */
  const choose = (value: string) => {
    setType(value);
    if (value === "family") {
      setSaveOffered(false);
      setError(null);
      return;
    }
    void persist(value, null, false);
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
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={type === opt.value}
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
            ))}
          </div>

          {type === "family" ? (
            <div data-testid="r19-family-subtype-step">
              <p className="c2s-card-line">Family — who are they to you?</p>
              <div role="radiogroup" aria-label="Family subtype">
                {FAMILY_SUBTYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={subtype === opt.value}
                    className="c2s-sheet-row"
                    data-testid={`r19-family-subtype-${opt.value}`}
                    data-selected={subtype === opt.value ? "true" : undefined}
                    onClick={() => setSubtype(opt.value)}
                  >
                    <span>{opt.label}</span>
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
            </div>
          ) : null}

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
