/**
 * Pass 23 — Moment audience selector (390-friendly).
 * Human copy only. Server enforces authority.
 */
import React from "react";
import {
  AUDIENCE_OPTIONS,
  type MomentVisibility,
  whoCanSeeThis,
} from "./momentAudience";

type Person = { id: string; name: string };

type Props = {
  visibility: MomentVisibility;
  onVisibilityChange: (v: MomentVisibility) => void;
  selectedPeople?: Person[];
  onTogglePerson?: (person: Person) => void;
  peopleOptions?: Person[];
  groupLabel?: string | null;
  friendCount?: number | null;
  testId?: string;
};

export function MomentAudienceSelector({
  visibility,
  onVisibilityChange,
  selectedPeople = [],
  onTogglePerson,
  peopleOptions = [],
  groupLabel,
  friendCount,
  testId = "moment-audience-selector",
}: Props) {
  const preview = whoCanSeeThis({
    visibility,
    audienceLabels: selectedPeople.map((p) => p.name),
    audienceUserIds: selectedPeople.map((p) => p.id),
    groupLabel,
    friendCount,
  });

  return (
    <section
      className="moment-audience-selector"
      data-testid={testId}
      data-visibility={visibility}
      aria-label="Who can see this?"
    >
      <h2 className="moment-audience-question" data-testid="moment-audience-question">
        Who can see this?
      </h2>
      <p className="moment-audience-preview" data-testid="moment-audience-preview">
        {preview}
      </p>
      <ul className="moment-audience-options" role="listbox" aria-label="Audience">
        {AUDIENCE_OPTIONS.map((opt) => (
          <li key={opt.visibility}>
            <button
              type="button"
              role="option"
              aria-selected={visibility === opt.visibility}
              className={
                visibility === opt.visibility
                  ? "moment-audience-option is-selected"
                  : "moment-audience-option"
              }
              data-testid={`moment-audience-${opt.visibility}`}
              onClick={() => onVisibilityChange(opt.visibility)}
            >
              <span className="moment-audience-option-label">{opt.label}</span>
              <span className="moment-audience-option-desc">{opt.description}</span>
            </button>
          </li>
        ))}
      </ul>

      {visibility === "specific_people" && peopleOptions.length > 0 ? (
        <ul
          className="moment-audience-people"
          data-testid="moment-audience-people"
          aria-label="People"
        >
          {peopleOptions.map((p) => {
            const on = selectedPeople.some((s) => s.id === p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className={on ? "moment-people-chip is-selected" : "moment-people-chip"}
                  data-testid={`moment-audience-person-${p.id}`}
                  aria-pressed={on}
                  onClick={() => onTogglePerson?.(p)}
                >
                  {p.name}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
