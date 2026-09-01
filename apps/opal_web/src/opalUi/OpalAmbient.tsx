/**
 * GLOBAL OPAL  -  exact current authority 618:902
 * Full-screen ambient intelligence. Visual-authority convergence:
 * Brand V4 depth via exact Figma authority render + interactive hit targets.
 * No new intelligence engine. 902:* additive states OUT_OF_SCOPE.
 */
import React, { useState } from "react";

type Props = {
  onClose?: () => void;
  onSeedGraph?: (hint: string) => void;
};

const CONTEXT: { id: string; label: string; left: number; top: number; width: number; height: number }[] = [
  { id: "people", label: "People", left: 18, top: 132, width: 92, height: 48 },
  { id: "budget", label: "Budget", left: 280, top: 132, width: 92, height: 48 },
  { id: "places", label: "Places", left: 18, top: 190, width: 92, height: 48 },
  { id: "past", label: "Past moments", left: 270, top: 190, width: 102, height: 48 },
  { id: "vibe", label: "Vibe", left: 18, top: 248, width: 92, height: 48 },
  { id: "availability", label: "Availability", left: 270, top: 248, width: 102, height: 48 },
];

const IDEAS = [
  { id: "juniper", title: "Juniper & Ivy", left: 18, top: 448, width: 210, height: 118 },
  { id: "rooftop", title: "Rooftop Jazz", left: 240, top: 448, width: 210, height: 118 },
  { id: "coast", title: "Sunset coast walk", left: 462, top: 448, width: 210, height: 118 },
] as const;

const REFINE = [
  { id: "refine", label: "Refine", left: 18, top: 578, width: 72, height: 32 },
  { id: "timing", label: "Timing", left: 98, top: 578, width: 72, height: 32 },
  { id: "budget", label: "Budget", left: 178, top: 578, width: 72, height: 32 },
  { id: "vibe", label: "Vibe", left: 258, top: 578, width: 64, height: 32 },
  { id: "more", label: "More ideas", left: 330, top: 578, width: 88, height: 32 },
] as const;

export function OpalAmbient({ onClose, onSeedGraph }: Props) {
  const [listening, setListening] = useState(false);
  const [query, setQuery] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [contextOn, setContextOn] = useState<Set<string>>(
    () => new Set(["people", "places", "vibe", "availability"]),
  );

  return (
    <div
      className="opal-ambient opal-ambient-authority"
      data-testid="opal-ambient"
      data-figma="618:902"
      data-figma-authority="618:902"
      data-figma-legacy="392:2"
      data-feature-tranche="PAUSED"
      data-listening={listening ? "true" : "false"}
      data-nav-active="none"
      data-visual-authority="figma-618-902-exact"
    >
      <img
        className="opal-authority-underlay"
        src="/figma-v2/opal-ambient/authority-618-902-stage.png"
        alt=""
        width={390}
        height={844}
        draggable={false}
        data-testid="opal-neural-field"
        data-figma-node="618:902"
      />

      <button type="button" className="opal-hit opal-hit-settings" aria-label="Settings" data-testid="opal-settings" />
      <button type="button" className="opal-hit opal-hit-history" aria-label="History" data-testid="opal-history" />
      {onClose ? (
        <button
          type="button"
          className="opal-done-sr"
          data-testid="opal-ambient-close"
          onClick={onClose}
          aria-label="Close Opal"
        >
          Close
        </button>
      ) : null}

      {CONTEXT.map((chip) => {
        const on = contextOn.has(chip.id);
        return (
          <button
            key={chip.id}
            type="button"
            className={`opal-hit opal-hit-context ${on ? "is-on" : ""}`}
            data-testid={`opal-context-${chip.id}`}
            aria-label={chip.label}
            aria-pressed={on}
            style={{ left: chip.left, top: chip.top, width: chip.width, height: chip.height }}
            onClick={() => {
              setContextOn((prev) => {
                const next = new Set(prev);
                if (next.has(chip.id)) next.delete(chip.id);
                else next.add(chip.id);
                return next;
              });
            }}
          />
        );
      })}

      {IDEAS.map((idea) => (
        <button
          key={idea.id}
          type="button"
          className="opal-hit opal-hit-idea"
          data-testid={`opal-idea-${idea.id}`}
          aria-label={idea.title}
          style={{ left: idea.left, top: idea.top, width: idea.width, height: idea.height }}
          onClick={() => {
            setQuery(idea.title);
            onSeedGraph?.(idea.title);
            setNote("Suggestion seeded into Graph path. Human confirm still required.");
          }}
        />
      ))}

      {REFINE.map((chip) => (
        <button
          key={chip.id}
          type="button"
          className="opal-hit opal-hit-refine"
          data-testid={`opal-chip-${chip.id}`}
          aria-label={chip.label}
          style={{ left: chip.left, top: chip.top, width: chip.width, height: chip.height }}
          onClick={() => setQuery((q) => (q ? `${q} · ${chip.label}` : chip.label))}
        />
      ))}

      <button
        type="button"
        className={`opal-hit opal-hit-listen ${listening ? "is-listening" : ""}`}
        data-testid="opal-listen"
        aria-label={listening ? "Stop listening" : "Talk to Opal"}
        aria-pressed={listening}
        onClick={() => {
          if (listening) {
            setListening(false);
            setNote("Listening ended. Speech capability is a dependency when unavailable.");
            return;
          }
          setListening(true);
          setNote("Listening. Only while you keep this on. Not permanent.");
        }}
      />

      <label className="opal-sr-only" htmlFor="opal-query">
        Message or talk to Opal
      </label>
      <textarea
        id="opal-query"
        className="opal-query-hit"
        data-testid="opal-query"
        rows={2}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask Opal or refine timing, budget, vibe"
        aria-label="Ask Opal"
      />

      <button
        type="button"
        className="opal-hit opal-hit-suggest"
        data-testid="opal-suggest"
        disabled={!query.trim()}
        aria-label="Show possibilities"
        onClick={() => {
          setListening(false);
          onSeedGraph?.(query.trim());
          setNote("Suggestion seeded into Graph path. Human confirm still required before commit.");
        }}
      />

      {note ? (
        <p className="gsh-gate-note opal-note" role="status" data-testid="opal-ambient-note">
          {note}
        </p>
      ) : null}
    </div>
  );
}
