/**
 * OPAL-00 — Global ambient action (Option A lock)
 * Figma 392:2 — floating Opal destination. Listening only while explicit.
 */
import React, { useState } from "react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";

type Props = {
  onClose?: () => void;
  onSeedGraph?: (hint: string) => void;
};

export function OpalAmbient({ onClose, onSeedGraph }: Props) {
  const [listening, setListening] = useState(false);
  const [query, setQuery] = useState("");
  const [note, setNote] = useState<string | null>(null);

  return (
    <div
      className="opal-ambient scroll"
      data-testid="opal-ambient"
      data-figma="392:2"
      data-listening={listening ? "true" : "false"}
    >
      <header className="opal-ambient-top">
        <div className="gsh-brand">
          <OpalMark size="sm" title="" />
          <OpalWordmark height={18} title="" compact />
        </div>
        {onClose ? (
          <button type="button" className="btn ghost" data-testid="opal-ambient-close" onClick={onClose}>
            Done
          </button>
        ) : null}
      </header>

      <h1 className="chats-home-title">Opal</h1>
      <p className="gsh-meta">Ambient help — you stay in control of the destination.</p>

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
          setNote("Listening — only while you keep this on. Not permanent.");
        }}
      >
        {listening ? "Listening… tap to stop" : "Hold to talk (tap to start)"}
      </button>

      <div className="opal-refine" role="group" aria-label="Refine">
        {["Timing", "Budget", "Vibe", "More ideas"].map((chip) => (
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

      <label className="opal-query-label" htmlFor="opal-query">
        What should Opal help with?
      </label>
      <textarea
        id="opal-query"
        className="opal-query"
        data-testid="opal-query"
        rows={3}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="e.g. easy dinner near us Saturday"
      />

      <button
        type="button"
        className="btn primary"
        data-testid="opal-suggest"
        disabled={!query.trim()}
        onClick={() => {
          setListening(false);
          onSeedGraph?.(query.trim());
          setNote("Suggestion seeded into Graph path — human confirm still required before commit.");
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
