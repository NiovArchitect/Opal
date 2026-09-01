/**
 * GLOBAL OPAL — exact current authority 618:902
 * Structured semantic UI + decorative neural field only.
 * No full-screen raster + hotspots. 902:* additive states OUT_OF_SCOPE.
 */
import React, { useState } from "react";
import { OpalWordmark } from "../brand/OpalLogo";

type Props = {
  onClose?: () => void;
  onSeedGraph?: (hint: string) => void;
};

const CONTEXT: { id: string; label: string; value: string; icon: string; w?: number }[] = [
  { id: "people", label: "People", value: "18", icon: "/figma-v2/opal-ambient/icon-ctx-people.png" },
  { id: "budget", label: "Budget", value: "$", icon: "/figma-v2/opal-ambient/icon-ctx-budget.png" },
  { id: "places", label: "Places", value: "96", icon: "/figma-v2/opal-ambient/icon-ctx-places.png" },
  { id: "past", label: "Past moments", value: "24", icon: "/figma-v2/opal-ambient/icon-ctx-past.png", w: 102 },
  { id: "vibe", label: "Vibe", value: "calm, fun", icon: "/figma-v2/opal-ambient/icon-ctx-vibe.png", w: 106 },
  {
    id: "availability",
    label: "Availability",
    value: "3",
    icon: "/figma-v2/opal-ambient/icon-ctx-availability.png",
    w: 96,
  },
];

const IDEAS = [
  {
    id: "juniper",
    rank: 1,
    title: "Juniper & Ivy",
    time: "Sat · May 17 · 7:30 PM",
    descriptor: "Quiet dinner",
    status: "Within budget",
    fit: "Great fit",
    media: "/figma-v2/opal-ambient/media-juniper.png",
  },
  {
    id: "rooftop",
    rank: 2,
    title: "Rooftop Jazz",
    time: "Sat · May 17 · 9:00 PM",
    descriptor: "Live music",
    status: "Nearby",
    fit: "Great fit",
    media: "/figma-v2/opal-ambient/media-rooftop.png",
  },
  {
    id: "coast",
    rank: 3,
    title: "Sunset Coast Walk",
    time: "Sun · May 18 · 6:15 PM",
    descriptor: "Low key",
    status: "Easy timing",
    fit: "Great fit",
    media: "/figma-v2/opal-ambient/media-coast.png",
  },
  {
    id: "escape",
    rank: 4,
    title: "Coast escape",
    time: "Sun · May 18 · 7:00 PM",
    descriptor: "Slow evening",
    status: "35 mi away",
    fit: "Great fit",
    media: "/figma-v2/opal-ambient/media-coast.png",
  },
] as const;

const INTENT = ["Date ideas", "Family plans", "Nearby now", "Weekend getaway"] as const;
const REFINE: { label: string; icon: string }[] = [
  { label: "Refine", icon: "/figma-v2/opal-ambient/icon-chip-refine.png" },
  { label: "Timing", icon: "/figma-v2/opal-ambient/icon-chip-timing.png" },
  { label: "Budget", icon: "/figma-v2/opal-ambient/icon-chip-budget.png" },
  { label: "Vibe", icon: "/figma-v2/opal-ambient/icon-chip-vibe.png" },
  { label: "More ideas", icon: "/figma-v2/opal-ambient/icon-chip-more.png" },
];

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
      data-opal-impl="structured-semantic"
      data-visual-authority="structured-ui-decorative-field"
    >
      {/* Decorative ambient spectral washes — nonsemantic */}
      <div className="opal-ambient-spectra" aria-hidden data-decorative-only="true" />

      {/* 618:923 Living Opal neural field — exact decorative export only (nonsemantic) */}
      <div
        className="opal-ambient-field"
        aria-hidden
        data-testid="opal-neural-field"
        data-decorative-only="true"
        data-figma-node="618:923"
      >
        <img
          className="opal-field-export"
          src="/figma-v2/opal-ambient/neural-field-618-902.png"
          alt=""
          width={354}
          height={246}
          data-figma-node="618:923"
        />
      </div>

      <header className="opal-ambient-top" data-figma-node="618:906">
        <button type="button" className="opal-top-icon" aria-label="Settings" data-testid="opal-settings">
          <img src="/figma-v2/opal-ambient/icon-settings.svg" alt="" width={24} height={24} />
        </button>
        <div className="opal-top-brand" aria-label="Opal Graph">
          <OpalWordmark height={22} title="" compact />
        </div>
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
              style={chip.w ? { width: chip.w } : undefined}
              onClick={() => {
                setContextOn((prev) => {
                  const next = new Set(prev);
                  if (next.has(chip.id)) next.delete(chip.id);
                  else next.add(chip.id);
                  return next;
                });
              }}
            >
              <img className="opal-context-icon" src={chip.icon} alt="" width={22} height={22} aria-hidden />
              <span className="opal-context-copy">
                <span className="opal-context-label">{chip.label}</span>
                <span className="opal-context-value">{chip.value}</span>
              </span>
            </button>
          );
        })}
      </div>

      <section className="opal-user-msg" aria-label="Your message" data-figma-node="618:1075">
        <p className="opal-bubble is-user">
          Can you line up something for me
          <br />
          and Chanelle this weekend?
        </p>
      </section>

      <section className="opal-response" aria-label="Opal response" data-figma-node="618:1153">
        <div className="opal-response-head">
          <img
            className="opal-response-orb"
            src="/figma-v2/opal-ambient/opal-response-orb-618-1244.png"
            alt=""
            width={36}
            height={36}
            aria-hidden
            data-decorative-only="true"
            data-figma-node="618:1244"
          />
          <div className="opal-response-copy">
            <p className="opal-response-body">
              Absolutely. I found a few great options that match your vibe, timing, and budget.
            </p>
            <p className="opal-response-picks">Here are my top picks.</p>
          </div>
        </div>

        <div className="opal-ideas" aria-label="Recommendations">
          <div className="opal-ideas-track">
            {IDEAS.map((idea) => (
              <button
                key={idea.id}
                type="button"
                className="opal-idea-card"
                data-testid={`opal-idea-${idea.id}`}
                onClick={() => {
                  setQuery(idea.title);
                  onSeedGraph?.(idea.title);
                  setNote("Suggestion seeded into Graph path. Human confirm still required.");
                }}
              >
                <span className="opal-idea-media-wrap">
                  <img className="opal-idea-media" src={idea.media} alt="" />
                  <span className="opal-idea-rank">{idea.rank}</span>
                </span>
                <span className="opal-idea-copy">
                  <span className="opal-idea-title">{idea.title}</span>
                  <span className="opal-idea-line">
                    <img className="opal-idea-ico" src="/figma-v2/opal-ambient/icon-idea-clock.png" alt="" width={10} height={10} />
                    {idea.time}
                  </span>
                  <span className="opal-idea-line">
                    <img className="opal-idea-ico" src="/figma-v2/opal-ambient/icon-chip-vibe.png" alt="" width={10} height={10} />
                    {idea.descriptor}
                  </span>
                  <span className="opal-idea-line">
                    <img className="opal-idea-ico" src="/figma-v2/opal-ambient/icon-chip-budget.png" alt="" width={10} height={10} />
                    {idea.status}
                  </span>
                  <span className="opal-idea-fit">
                    <img className="opal-idea-ico" src="/figma-v2/opal-ambient/icon-idea-fit.png" alt="" width={10} height={10} />
                    {idea.fit}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="opal-more-ideas"
            data-testid="opal-view-more"
            onClick={() => setQuery((q) => (q ? `${q} · more` : "More ideas"))}
          >
            View more ideas  ›
          </button>
        </div>
      </section>

      <div className="opal-intent" role="group" aria-label="Intent">
        {INTENT.map((chip) => (
          <button
            key={chip}
            type="button"
            className="opal-intent-chip"
            data-testid={`opal-intent-${chip.toLowerCase().replace(/\s/g, "-")}`}
            onClick={() => {
              setQuery(chip);
              onSeedGraph?.(chip);
              setNote("Intent seeded into Graph path. Human confirm still required.");
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="opal-refine" role="group" aria-label="Refine">
        {REFINE.map((chip) => (
          <button
            key={chip.label}
            type="button"
            className="opal-refine-chip"
            data-testid={`opal-chip-${chip.label.toLowerCase().replace(/\s/g, "-")}`}
            onClick={() => setQuery((q) => (q ? `${q} · ${chip.label}` : chip.label))}
          >
            <img className="opal-refine-icon" src={chip.icon} alt="" width={16} height={16} aria-hidden />
            {chip.label}
          </button>
        ))}
      </div>

      <div className="opal-composer" data-figma-node="618:1110">
        <button
          type="button"
          className="opal-attach"
          aria-label="Add context"
          data-testid="opal-attach"
          onClick={() => setNote("Attachment / context add is available when you choose it.")}
        >
          +
        </button>
        <label className="opal-query-label sr-only" htmlFor="opal-query">
          Message or talk to Opal
        </label>
        <input
          id="opal-query"
          className="opal-query"
          data-testid="opal-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Message or talk to Opal"
          autoComplete="off"
        />
        <button
          type="button"
          className={`opal-voice ${listening ? "is-listening" : ""}`}
          data-testid="opal-listen"
          aria-label={listening ? "Stop listening" : "Voice input"}
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
          <span className="opal-voice-wave" aria-hidden />
        </button>
        <button
          type="button"
          className="opal-suggest-sr"
          data-testid="opal-suggest"
          disabled={!query.trim()}
          aria-label="Show possibilities"
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
