/**
 * Journey Add People — CURRENT 863:394
 * Circular avatar grid (lineage grid geometry from 201:6).
 * Journey participation only — not GraphWho / Forward planning modes.
 */
import React, { useMemo, useState } from "react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";
import { founderWhoPeople } from "./founderGraphSeed";

export type JourneyAddPerson = {
  id: string;
  name: string;
  initial?: string;
  avatarSrc?: string;
};

type Props = {
  open: boolean;
  people?: JourneyAddPerson[];
  busy?: boolean;
  onClose: () => void;
  onConfirm: (people: JourneyAddPerson[]) => void | Promise<void>;
};

export function JourneyAddPeople({ open, people, busy, onClose, onConfirm }: Props) {
  const roster = useMemo(() => people && people.length ? people : founderWhoPeople(), [people]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (!open) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const chosen = roster.filter((p) => selected.has(p.id));

  return (
    <div
      className="journey-add-people gwho"
      data-testid="journey-add-people"
      data-figma-add-people="863:394"
      data-figma-node="863:394"
      data-figma-lineage="201:6"
      role="dialog"
      aria-modal="true"
      aria-label="Add people"
    >
      <header className="gwho-top">
        <div className="gwho-brand">
          <OpalMark size="sm" title="" />
          <OpalWordmark height={18} title="" compact />
        </div>
        <button
          type="button"
          className="btn ghost"
          data-testid="journey-add-people-back"
          aria-label="Back"
          onClick={() => {
            setSelected(new Set());
            onClose();
          }}
        >
          Back
        </button>
      </header>

      <h1 className="gwho-title" data-testid="journey-add-people-title">
        Add people
      </h1>
      <p className="gwho-body">
        Invite people into this Journey. Going is not automatic - they choose.
      </p>

      <div className="gwho-grid" role="group" aria-label="People" data-testid="journey-add-people-grid">
        {roster.map((p) => {
          const isOn = selected.has(p.id);
          const initial = p.initial || p.name.slice(0, 1).toUpperCase();
          return (
            <button
              key={p.id}
              type="button"
              className={`gwho-cell ${isOn ? "is-selected" : ""}`}
              aria-pressed={isOn}
              data-testid={`journey-add-person-${p.id}`}
              onClick={() => toggle(p.id)}
            >
              <span className="gwho-avatar-wrap">
                {p.avatarSrc ? (
                  <img className="gwho-avatar" src={p.avatarSrc} alt="" width={78} height={78} />
                ) : (
                  <span className="gwho-avatar gwho-avatar-fallback">{initial}</span>
                )}
                {isOn ? (
                  <span className="gwho-check" aria-hidden>
                    ✓
                  </span>
                ) : null}
              </span>
              <span className="gwho-name">{p.name}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="btn primary gwho-continue"
        data-testid="journey-add-people-continue"
        disabled={!chosen.length || !!busy}
        onClick={() => {
          if (!chosen.length || busy) return;
          void onConfirm(chosen);
        }}
      >
        {busy ? "Adding…" : "Continue"}
      </button>
    </div>
  );
}
