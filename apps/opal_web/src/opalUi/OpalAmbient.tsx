/**
 * GLOBAL OPAL — exact current authority 618:902
 * Full-screen ambient intelligence. Visual-authority convergence only.
 * No new intelligence engine / domain. 902:* additive states OUT_OF_SCOPE.
 */
import React, { useState } from "react";

type Props = {
  onClose?: () => void;
  onSeedGraph?: (hint: string) => void;
};

const CONTEXT: { id: string; label: string; value: string }[] = [
  { id: "people", label: "People", value: "18" },
  { id: "budget", label: "Budget", value: "$" },
  { id: "places", label: "Places", value: "96" },
  { id: "past", label: "Past moments", value: "24" },
  { id: "vibe", label: "Vibe", value: "Calm" },
  { id: "availability", label: "Availability", value: "Open" },
];

const IDEAS = [
  {
    id: "juniper",
    title: "Juniper & Ivy",
    meta: "Tonight · 7:30",
    status: "Ready",
    media: "/figma-v2/opal-ambient/media-juniper.png",
    tone: "#00E5FF",
  },
  {
    id: "rooftop",
    title: "Rooftop Jazz",
    meta: "Tonight · nearby",
    status: "Open",
    media: "/figma-v2/opal-ambient/media-rooftop.png",
    tone: "#FFC86B",
  },
  {
    id: "coast",
    title: "Sunset coast walk",
    meta: "Tomorrow · soft",
    status: "Idea",
    media: "/figma-v2/opal-ambient/media-coast.png",
    tone: "#8B5CF6",
  },
] as const;

const REFINE = ["Refine", "Timing", "Budget", "Vibe", "More ideas"] as const;

export function OpalAmbient({ onClose, onSeedGraph }: Props) {
  const [listening, setListening] = useState(false);
  const [query, setQuery] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [contextOn, setContextOn] = useState<Set<string>>(
    () => new Set(["people", "places", "vibe"]),
  );

  return (
    <div
      className="opal-ambient"
      data-testid="opal-ambient"
      data-figma="618:902"
      data-figma-authority="618:902"
      data-figma-legacy="392:2"
      data-feature-tranche="PAUSED"
      data-listening={listening ? "true" : "false"}
      data-nav-active="none"
    >
      <div className="opal-ambient-field" aria-hidden data-testid="opal-neural-field">
        <img className="opal-field-bloom" src="/figma-v2/opal-ambient/field-bloom.svg" alt="" />
        <img className="opal-field-sphere" src="/figma-v2/opal-ambient/living-sphere.svg" alt="" />
        <img className="opal-field-branches" src="/figma-v2/opal-ambient/neural-branches.svg" alt="" />
      </div>

      <header className="opal-ambient-top">
        <button type="button" className="opal-top-icon" aria-label="Settings" data-testid="opal-settings">
          <img src="/figma-v2/opal-ambient/icon-settings.svg" alt="" width={24} height={24} />
        </button>
        <button type="button" className="opal-top-icon" aria-label="History" data-testid="opal-history">
          <img src="/figma-v2/opal-ambient/icon-history.svg" alt="" width={24} height={24} />
        </button>
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
      </header>

      <div className="opal-context-grid" role="group" aria-label="Context">
        {CONTEXT.map((chip) => {
          const on = contextOn.has(chip.id);
          return (
            <button
              key={chip.id}
              type="button"
              className={`opal-context-card ${on ? "is-on" : ""}`}
              data-testid={`opal-context-${chip.id}`}
              aria-pressed={on}
              onClick={() => {
                setContextOn((prev) => {
                  const next = new Set(prev);
                  if (next.has(chip.id)) next.delete(chip.id);
                  else next.add(chip.id);
                  return next;
                });
              }}
            >
              <span className="opal-context-label">{chip.label}</span>
              <span className="opal-context-value">{chip.value}</span>
            </button>
          );
        })}
      </div>

      <section className="opal-convo" aria-label="Conversation">
        <p className="opal-bubble is-user">What feels easy this weekend?</p>
        <p className="opal-bubble is-opal">
          A few grounded options from your people, places, and past moments. Still yours to choose.
        </p>
      </section>

      <section className="opal-ideas" aria-label="Recommendations">
        <div className="opal-ideas-track">
          {IDEAS.map((idea) => (
            <button
              key={idea.id}
              type="button"
              className="opal-idea-card"
              data-testid={`opal-idea-${idea.id}`}
              style={{ ["--idea-tone" as string]: idea.tone }}
              onClick={() => {
                setQuery(idea.title);
                onSeedGraph?.(idea.title);
                setNote("Suggestion seeded into Graph path. Human confirm still required.");
              }}
            >
              <img className="opal-idea-media" src={idea.media} alt="" />
              <span className="opal-idea-copy">
                <span className="opal-idea-title">{idea.title}</span>
                <span className="opal-idea-meta">{idea.meta}</span>
                <span className="opal-idea-status">{idea.status}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="opal-refine" role="group" aria-label="Refine">
        {REFINE.map((chip) => (
          <button
            key={chip}
            type="button"
            className="opal-refine-chip"
            data-testid={`opal-chip-${chip.toLowerCase().replace(/\s/g, "-")}`}
            onClick={() => setQuery((q) => (q ? `${q} · ${chip}` : chip))}
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="opal-composer">
        <button
          type="button"
          className={`opal-listen-btn ${listening ? "is-listening" : ""}`}
          data-testid="opal-listen"
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
        >
          {listening ? "Listening" : "Talk"}
        </button>
        <label className="opal-query-label" htmlFor="opal-query">
          Message or talk to Opal
        </label>
        <textarea
          id="opal-query"
          className="opal-query"
          data-testid="opal-query"
          rows={2}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask Opal or refine timing, budget, vibe"
        />
        <button
          type="button"
          className="btn primary opal-suggest"
          data-testid="opal-suggest"
          disabled={!query.trim()}
          onClick={() => {
            setListening(false);
            onSeedGraph?.(query.trim());
            setNote("Suggestion seeded into Graph path. Human confirm still required before commit.");
          }}
        >
          Show possibilities
        </button>
      </div>

      {note ? (
        <p className="gsh-gate-note" role="status" data-testid="opal-ambient-note">
          {note}
        </p>
      ) : null}
    </div>
  );
}
