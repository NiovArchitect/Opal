/**
 * GRAPHS OVERVIEW — exact current authority 618:674
 * Filters All · Action · Ready. No Enter Journey. No auto-Journey.
 */
import React, { useMemo, useState } from "react";
import { FOUNDER_HOME_FEED, happeningInLabel } from "./founderGraphSeed";

type Lens = "all" | "action" | "ready";

type Props = {
  onOpenGraph: (cardId: string) => void;
  onCreateGraph?: () => void;
};

const TRAJECTORY = [
  { id: "signal", label: "Signal" },
  { id: "alignment", label: "Alignment" },
  { id: "commitment", label: "Commitment" },
  { id: "journey", label: "Journey" },
] as const;

/** Founder-facing card titles matching 618:674 chrome (dynamic domain may replace). */
/** Chrome titles matching 618:674 fixture copy; ids remain domain/seed owners. */
const AUTHORITY_CARDS: { id: string; title: string; place: string }[] = [
  { id: "seed-chanelle-juniper", title: "Juniper & Ivy", place: "Tonight · table looks open" },
  { id: "seed-maya-graph-coast", title: "Mexico City", place: "Weekend · travel shape" },
  { id: "seed-alex-graph-gallery", title: "Family Saturday", place: "Morning · local" },
  { id: "seed-near-rooftop", title: "Rooftop Jazz", place: "Tonight · downtown" },
];

export function GraphsHome({ onOpenGraph, onCreateGraph }: Props) {
  const [lens, setLens] = useState<Lens>("all");
  const graphs = useMemo(() => {
    const all = FOUNDER_HOME_FEED.filter((c) => c.kind === "graph" || c.kind === "live");
    const byId = new Map(all.map((g) => [g.id, g]));
    return AUTHORITY_CARDS.map((card) => {
      const src = byId.get(card.id);
      return {
        id: card.id,
        title: card.title,
        placeLine: card.place,
        detail: card.place,
        person: src?.person || "",
        goingCount: src?.goingCount ?? (card.id.includes("juniper") ? 2 : 1),
        interestedCount: src?.interestedCount ?? 2,
        startsAt: src?.startsAt,
        kind: "graph" as const,
      };
    });
  }, []);

  const visible =
    lens === "ready"
      ? graphs.filter((g) => (g.goingCount ?? 0) > 0 || /ready/i.test(g.title || ""))
      : lens === "action"
        ? graphs.filter((g) => (g.interestedCount ?? 0) > 0 || (g.goingCount ?? 0) === 0)
        : graphs;

  return (
    <div
      className="graphs-home scroll"
      data-testid="graphs-home"
      data-screen="graphs-overview"
      data-figma="618:674"
      data-figma-graphs="618:674"
      data-figma-authority="618:674"
      data-legacy-figma-graphs="368:23"
    >
      <div className="graphs-ambient" aria-hidden />

      <header className="graphs-home-top">
        <div className="graphs-home-title-row">
          <h1 className="chats-home-title">Your Graphs</h1>
          <button
            type="button"
            className="graphs-create-plus"
            data-testid="graphs-create"
            aria-label="Create Graph"
            onClick={onCreateGraph}
          >
            +
          </button>
        </div>
        <p className="graphs-home-lede">What is taking shape</p>
      </header>

      <div className="gsh-filters graphs-lenses" role="toolbar" aria-label="Graph lenses">
        {(
          [
            ["all", "All"],
            ["action", "Action"],
            ["ready", "Ready"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`gsh-chip ${lens === id ? "is-active" : ""}`}
            data-testid={`graphs-lens-${id}`}
            data-figma-pill={id === "action" ? "618:686" : undefined}
            aria-pressed={lens === id}
            onClick={() => setLens(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="graphs-trajectory" aria-label="Graph trajectory" data-testid="graphs-trajectory">
        <div className="graphs-trajectory-rail" aria-hidden />
        <ul className="graphs-trajectory-nodes">
          {TRAJECTORY.map((n) => (
            <li key={n.id} className="graphs-trajectory-node">
              <span className="graphs-trajectory-dot" aria-hidden />
              <span className="graphs-trajectory-label">{n.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="graphs-home-list" data-testid="graphs-home-list">
        {visible.map((g) => (
          <article
            key={g.id}
            className="graphs-home-card"
            data-testid={`graphs-card-${g.id}`}
          >
            <button
              type="button"
              className="graphs-home-card-btn"
              data-testid={`graphs-open-${g.id}`}
              onClick={() => onOpenGraph(g.id)}
            >
              <div className="graphs-card-top">
                <strong className="graphs-card-title">{g.title}</strong>
                {happeningInLabel(g.startsAt) ? (
                  <span className="gsh-countdown">{happeningInLabel(g.startsAt)}</span>
                ) : null}
              </div>
              <p className="graphs-card-place">{g.placeLine || g.detail}</p>
              <p className="graphs-card-meta">
                {(g.goingCount ?? 0) > 0
                  ? `${g.goingCount} going`
                  : `${g.interestedCount ?? 0} interested`}
                {g.person ? ` · ${g.person}` : ""}
              </p>
            </button>
          </article>
        ))}
        {!visible.length ? <p className="gsh-empty">No Graphs in this lens yet.</p> : null}
      </div>

      <p className="graphs-home-foot" data-testid="graphs-open-hint">
        Tap a Graph to open it.
      </p>
    </div>
  );
}
