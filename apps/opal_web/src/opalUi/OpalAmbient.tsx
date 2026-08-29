/**
 * GLOBAL OPAL — visual authority 618:902 (feature tranche PAUSED).
 * Visual-authority convergence only — no new intelligence engine / domain.
 */
import React, { useState } from "react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";

type Props = {
  onClose?: () => void;
  onSeedGraph?: (hint: string) => void;
};

const CONTEXT = ["People", "Places", "Vibe", "Budget", "Past moments", "Availability"] as const;
const IDEAS = [
  { id: "date", title: "Date ideas", meta: "Tonight · near you", tone: "#FF7AA2" },
  { id: "family", title: "Family plans", meta: "Weekend · low effort", tone: "#FFC86B" },
  { id: "nearby", title: "Nearby now", meta: "Open · joinable", tone: "#00E5FF" },
  { id: "getaway", title: "Weekend getaway", meta: "2 nights · coastal", tone: "#8B5CF6" },
] as const;
const REFINE = ["Refine", "Timing", "Budget", "Vibe", "More ideas"] as const;

export function OpalAmbient({ onClose, onSeedGraph }: Props) {
  const [listening, setListening] = useState(false);
  const [query, setQuery] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [contextOn, setContextOn] = useState<Set<string>>(() => new Set(["People", "Places"]));

  return (
    <div
      className="opal-ambient scroll"
      data-testid="opal-ambient"
      data-figma="618:902"
      data-figma-authority="618:902"
      data-figma-legacy="392:2"
      data-feature-tranche="PAUSED"
      data-listening={listening ? "true" : "false"}
      data-nav-active="none"
    >
      <div className="opal-ambient-field" aria-hidden data-testid="opal-neural-field" />

      <header className="opal-ambient-top">
        <button type="button" className="opal-top-icon" aria-label="Settings" data-testid="opal-settings">
          ⚙
        </button>
        <div className="gsh-brand opal-top-brand">
          <OpalMark size="sm" title="" />
          <OpalWordmark height={18} title="" compact />
        </div>
        <button type="button" className="opal-top-icon" aria-label="History" data-testid="opal-history">
          ◷
        </button>
        {onClose ? (
          <button type="button" className="btn ghost opal-done" data-testid="opal-ambient-close" onClick={onClose}>
            Done
          </button>
        ) : null}
      </header>

      <h1 className="opal-ambient-title">Opal Graph</h1>
      <p className="opal-ambient-lede">Living neural field. You stay in control of the destination.</p>

      <div className="opal-context-row" role="group" aria-label="Context">
        {CONTEXT.map((chip) => {
          const on = contextOn.has(chip);
          return (
            <button
              key={chip}
              type="button"
              className={`opal-context-chip ${on ? "is-on" : ""}`}
              data-testid={`opal-context-${chip.toLowerCase().replace(/\s/g, "-")}`}
              aria-pressed={on}
              onClick={() => {
                setContextOn((prev) => {
                  const next = new Set(prev);
                  if (next.has(chip)) next.delete(chip);
                  else next.add(chip);
                  return next;
                });
              }}
            >
              {chip}
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
              <span className="opal-idea-media" aria-hidden />
              <span className="opal-idea-title">{idea.title}</span>
              <span className="opal-idea-meta">{idea.meta}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="opal-refine" role="group" aria-label="Refine">
        {REFINE.map((chip) => (
          <button
            key={chip}
            type="button"
            className="gsh-chip"
            data-testid={`opal-chip-${chip.toLowerCase().replace(/\s/g, "-")}`}
            onClick={() => setQuery((q) => (q ? `${q} · ${chip}` : chip))}
          >
            {chip}
          </button>
        ))}
      </div>

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
        {listening ? "Listening. Tap to stop" : "Hold to talk (tap to start)"}
      </button>

      <label className="opal-query-label" htmlFor="opal-query">
        Message or talk to Opal
      </label>
      <textarea
        id="opal-query"
        className="opal-query"
        data-testid="opal-query"
        rows={3}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask Opal or refine timing, budget, vibe"
      />

      <button
        type="button"
        className="btn primary"
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

      {note ? (
        <p className="gsh-gate-note" role="status" data-testid="opal-ambient-note">
          {note}
        </p>
      ) : null}
    </div>
  );
}
