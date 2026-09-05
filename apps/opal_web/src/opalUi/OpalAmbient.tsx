/**
 * GLOBAL OPAL — exact current authority 618:902
 * P3.1: geometry no-overlap, ambient life, honest control contracts.
 * Structured semantic UI + decorative neural field.
 * 902:* additive decision states remain OUT_OF_SCOPE / P4.
 * Activity icon 1046:2 not implemented here.
 */
import React, { useEffect, useMemo, useState } from "react";
import { OpalWordmark } from "../brand/OpalLogo";

type Props = {
  onClose?: () => void;
  onSeedGraph?: (hint: string) => void;
  onOpenSettings?: () => void;
  onOpenHistory?: () => void;
};

const CONTEXT: { id: string; label: string; value: string; icon: string; w?: number; hint: string }[] = [
  { id: "people", label: "People", value: "18", icon: "/figma-v2/opal-ambient/icon-ctx-people.png", hint: "Who Opal is considering for this decision." },
  { id: "budget", label: "Budget", value: "$", icon: "/figma-v2/opal-ambient/icon-ctx-budget.png", hint: "Spend fit currently in play." },
  { id: "places", label: "Places", value: "96", icon: "/figma-v2/opal-ambient/icon-ctx-places.png", hint: "Place pool Opal can draw from." },
  { id: "past", label: "Past moments", value: "24", icon: "/figma-v2/opal-ambient/icon-ctx-past.png", w: 102, hint: "Past moments shaping taste — private until you share." },
  { id: "vibe", label: "Vibe", value: "calm, fun", icon: "/figma-v2/opal-ambient/icon-ctx-vibe.png", w: 106, hint: "Current vibe constraint for this answer." },
  {
    id: "availability",
    label: "Availability",
    value: "3",
    icon: "/figma-v2/opal-ambient/icon-ctx-availability.png",
    w: 96,
    hint: "Overlapping windows Opal believes are usable.",
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
const REFINE: { label: string; icon: string; mutate: string; ownership: "P3_LOCAL" | "P4_REQUIRED" }[] = [
  { label: "Refine", icon: "/figma-v2/opal-ambient/icon-chip-refine.png", mutate: "refine", ownership: "P4_REQUIRED" },
  { label: "Timing", icon: "/figma-v2/opal-ambient/icon-chip-timing.png", mutate: "later", ownership: "P4_REQUIRED" },
  { label: "Budget", icon: "/figma-v2/opal-ambient/icon-chip-budget.png", mutate: "cheaper", ownership: "P4_REQUIRED" },
  { label: "Vibe", icon: "/figma-v2/opal-ambient/icon-chip-vibe.png", mutate: "quieter", ownership: "P4_REQUIRED" },
  { label: "More ideas", icon: "/figma-v2/opal-ambient/icon-chip-more.png", mutate: "explore", ownership: "P3_LOCAL" },
];

function motionDemoEnabled() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("opal_motion_demo") === "1";
}

export function OpalAmbient({ onClose, onSeedGraph, onOpenSettings, onOpenHistory }: Props) {
  const [listening, setListening] = useState(false);
  const [query, setQuery] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [sheet, setSheet] = useState<null | { kind: "context" | "history" | "correction"; id?: string; title: string; body: string }>(null);
  const [orbResonate, setOrbResonate] = useState(false);
  const [signalBreath, setSignalBreath] = useState(false);
  const [exploreMode, setExploreMode] = useState(false);
  const [contextOn, setContextOn] = useState<Set<string>>(
    () => new Set(["people", "places", "vibe"]),
  );
  const demo = useMemo(() => motionDemoEnabled(), []);

  useEffect(() => {
    if (!demo) return;
    // Deterministic founder motion demo — non-production proof path only
    setSignalBreath(true);
    const t1 = window.setTimeout(() => setSignalBreath(false), 900);
    const t2 = window.setTimeout(() => {
      setOrbResonate(true);
      window.setTimeout(() => setOrbResonate(false), 900);
    }, 1100);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [demo]);

  function applyIntent(chip: string) {
    setQuery(chip);
    setExploreMode(false);
    setNote(`Intent “${chip}” applied with current context. Full Decision Intelligence recompose is P4.`);
    // One-tap intent: seed without requiring a second Send when architecture allows
    onSeedGraph?.(chip);
  }

  function applyCorrection(chip: (typeof REFINE)[number]) {
    if (chip.label === "More ideas") {
      setExploreMode(true);
      setNote("Exploration open — multiple alternatives are intentional here. Default decision remains one-answer in P4.");
      return;
    }
    setQuery((q) => (q ? `${q} · ${chip.mutate}` : chip.mutate));
    setSheet({
      kind: "correction",
      title: chip.label,
      body: `Correction “${chip.label}” recorded locally. Immediate Decision Intelligence recompose (same context, one mutated dimension) is P4_REQUIRED — not faked in P3.1.`,
    });
    setNote(`Correction operator “${chip.label}” — P4 Decision Intelligence owns full recompose.`);
  }

  function openContext(chip: (typeof CONTEXT)[number]) {
    setSheet({
      kind: "context",
      id: chip.id,
      title: chip.label,
      body: `${chip.hint}\n\nCurrent value: ${chip.value}\n\nInline correct/remove of this dimension without leaving Opal Center is the intended UX. Full intelligent recompose after correction is P4_REQUIRED.`,
    });
  }

  const visibleIdeas = exploreMode ? IDEAS : IDEAS.slice(0, 3);

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
      data-motion-demo={demo ? "true" : "false"}
      data-signal-breath={signalBreath ? "true" : "false"}
      data-explore-mode={exploreMode ? "true" : "false"}
    >
      <div className="opal-ambient-spectra" aria-hidden data-decorative-only="true" data-motion="brand-ambient" />

      <div
        className="opal-ambient-field"
        aria-hidden
        data-testid="opal-neural-field"
        data-decorative-only="true"
        data-figma-node="618:923"
        data-motion="brand-ambient"
      >
        <img
          className="opal-field-export"
          src="/figma-v2/opal-ambient/neural-field-618-902.png"
          alt=""
          width={354}
          height={246}
          data-figma-node="618:923"
        />
        <span className="opal-field-orbit" data-testid="opal-ambient-orbit" />
        <span className="opal-field-particle p1" />
        <span className="opal-field-particle p2" />
        <span className="opal-field-particle p3" />
      </div>

      <header className="opal-ambient-top" data-figma-node="618:906">
        <button
          type="button"
          className="opal-top-icon"
          aria-label="Settings"
          data-testid="opal-settings"
          data-control-status="REAL_ACTIVE"
          onClick={() => {
            onOpenSettings?.();
            onClose?.();
          }}
        >
          <img src="/figma-v2/opal-ambient/icon-settings.svg" alt="" width={24} height={24} />
        </button>
        <div className="opal-top-brand" aria-label="Opal Graph">
          <OpalWordmark height={22} title="" compact />
        </div>
        <button
          type="button"
          className="opal-top-icon"
          aria-label="History"
          data-testid="opal-history"
          data-control-status="REAL_ACTIVE"
          onClick={() => {
            // Session-local history is REAL_ACTIVE here. Persistent multi-device archive = DEPENDENCY.
            onOpenHistory?.();
            setSheet({
              kind: "history",
              title: "Recent with Opal",
              body: "Session history: current Center thread only.\n\nPersistent multi-device Opal conversation history is a production dependency — not invented as a fake archive.",
            });
          }}
        >
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

      <div className="opal-context-grid" role="group" aria-label="Context Opal is using">
        {CONTEXT.map((chip) => {
          const on = contextOn.has(chip.id);
          return (
            <button
              key={chip.id}
              type="button"
              className={`opal-context-card ${on ? "is-on" : ""}`}
              data-testid={`opal-context-${chip.id}`}
              data-control-status="REAL_ACTIVE"
              aria-pressed={on}
              aria-label={`${chip.label}: ${chip.value}. Inspect context.`}
              style={chip.w ? { width: chip.w } : undefined}
              onClick={() => openContext(chip)}
              onContextMenu={(e) => {
                e.preventDefault();
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

      <section
        className={`opal-response ${signalBreath ? "is-signal-breath" : ""}`}
        aria-label="Opal response"
        data-figma-node="618:1153"
        data-testid="opal-response"
      >
        <div className="opal-response-head">
          <img
            className={`opal-response-orb ${orbResonate ? "is-resonating" : ""}`}
            src="/figma-v2/opal-ambient/opal-response-orb-618-1244.png"
            alt=""
            width={36}
            height={36}
            aria-hidden
            data-decorative-only="true"
            data-figma-node="618:1244"
            data-testid="opal-response-orb"
          />
          <div className="opal-response-copy">
            <p className="opal-response-body">
              Absolutely. A few options match your vibe, timing, and budget.
            </p>
            <p className="opal-response-picks">
              {exploreMode ? "Exploration — multiple alternatives on purpose." : "Suggestions to review — confirm before real."}
            </p>
          </div>
        </div>

        <div className="opal-ideas" aria-label="Recommendations" data-testid="opal-ideas-lane">
          <div className="opal-ideas-track">
            {visibleIdeas.map((idea) => (
              <button
                key={idea.id}
                type="button"
                className="opal-idea-card"
                data-testid={`opal-idea-${idea.id}`}
                data-control-status="REAL_ACTIVE"
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
            data-control-status="REAL_ACTIVE"
            onClick={() => {
              setExploreMode(true);
              setNote("More ideas — explicit exploration escape hatch.");
            }}
          >
            View more ideas  ›
          </button>
        </div>
      </section>

      <div className="opal-intent" role="group" aria-label="Intent starters">
        {INTENT.map((chip) => (
          <button
            key={chip}
            type="button"
            className="opal-intent-chip"
            data-testid={`opal-intent-${chip.toLowerCase().replace(/\s/g, "-")}`}
            data-control-status="REAL_ACTIVE"
            onClick={() => applyIntent(chip)}
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="opal-refine" role="group" aria-label="Correction operators">
        {REFINE.map((chip) => (
          <button
            key={chip.label}
            type="button"
            className="opal-refine-chip"
            data-testid={`opal-chip-${chip.label.toLowerCase().replace(/\s/g, "-")}`}
            data-control-status={chip.ownership === "P4_REQUIRED" ? "P4_REQUIRED" : "REAL_ACTIVE"}
            data-ownership={chip.ownership}
            onClick={() => applyCorrection(chip)}
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
          data-control-status="DEPENDENCY"
          onClick={() =>
            setNote("Attachment / context add requires system file/media dependency — not faked.")
          }
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
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim()) {
              onSeedGraph?.(query.trim());
              setNote("Message sent into Graph path. Human confirm still required before commit.");
            }
          }}
        />
        <button
          type="button"
          className={`opal-voice ${listening ? "is-listening" : ""}`}
          data-testid="opal-listen"
          data-control-status="DEPENDENCY"
          aria-label={listening ? "Stop listening" : "Voice input"}
          aria-pressed={listening}
          onClick={() => {
            if (listening) {
              setListening(false);
              setNote("Listening ended. Speech recognition is a system dependency when unavailable.");
              return;
            }
            setListening(true);
            setNote("Listening UI on. Real ASR is a system dependency — not pretended transcription.");
          }}
        >
          <span className="opal-voice-wave" aria-hidden />
        </button>
        <button
          type="button"
          className="opal-suggest-sr"
          data-testid="opal-suggest"
          data-control-status="REAL_ACTIVE"
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

      {sheet ? (
        <div className="opal-inline-sheet" role="dialog" aria-modal="true" data-testid="opal-inline-sheet">
          <div className="opal-inline-sheet-card">
            <header className="opal-inline-sheet-top">
              <h2>{sheet.title}</h2>
              <button type="button" data-testid="opal-sheet-close" onClick={() => setSheet(null)} aria-label="Close">
                Done
              </button>
            </header>
            <p className="opal-inline-sheet-body">{sheet.body}</p>
            {sheet.kind === "context" && sheet.id ? (
              <button
                type="button"
                className="opal-inline-sheet-action"
                data-testid="opal-context-toggle"
                onClick={() => {
                  setContextOn((prev) => {
                    const next = new Set(prev);
                    if (next.has(sheet.id!)) next.delete(sheet.id!);
                    else next.add(sheet.id!);
                    return next;
                  });
                  setNote(`Context “${sheet.title}” ${contextOn.has(sheet.id!) ? "removed from" : "added to"} current decision inputs.`);
                  setSheet(null);
                }}
              >
                {contextOn.has(sheet.id) ? "Remove from current decision" : "Keep in current decision"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {note ? (
        <p className="gsh-gate-note opal-ambient-note" role="status" data-testid="opal-ambient-note">
          {note}
        </p>
      ) : null}
    </div>
  );
}
