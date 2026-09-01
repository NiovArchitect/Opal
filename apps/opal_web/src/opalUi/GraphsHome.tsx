/**
 * GRAPHS OVERVIEW  -  exact current authority 618:674
 * Filters All · Action · Ready. Vertical timeline + text nodes.
 * No Enter Journey. No auto-Journey. No media-card reinterpretation.
 */
import React, { useMemo, useState } from "react";
import { FOUNDER_HOME_FEED } from "./founderGraphSeed";

type Lens = "all" | "action" | "ready";

type Props = {
  onOpenGraph: (cardId: string) => void;
  onCreateGraph?: () => void;
};

type GraphStatus = "ready" | "aligned" | "forming" | "idea";

/** Chrome titles + lines matching 618:674; ids remain domain/seed owners. */
const AUTHORITY_CARDS: {
  id: string;
  title: string;
  whenLine: string;
  signalLine: string;
  status: GraphStatus;
}[] = [
  {
    id: "seed-chanelle-juniper",
    title: "Juniper & Ivy",
    whenLine: "Tonight · 7:30 PM · Chanelle",
    signalLine: "Ready · leave 6:55",
    status: "ready",
  },
  {
    id: "seed-maya-graph-coast",
    title: "Mexico City",
    whenLine: "Fri → Sun · Chanelle",
    signalLine: "Both free · stay taking shape",
    status: "forming",
  },
  {
    id: "seed-alex-graph-gallery",
    title: "Family Saturday",
    whenLine: "Kids + family · Saturday",
    signalLine: "3 in · beach → tacos → sunset",
    status: "aligned",
  },
  {
    id: "seed-near-rooftop",
    title: "Rooftop Jazz",
    whenLine: "Saved idea · nearby",
    signalLine: "Open · no one asked yet",
    status: "idea",
  },
];

const STATUS_LABEL: Record<GraphStatus, string> = {
  ready: "Ready",
  aligned: "Aligned",
  forming: "Forming",
  idea: "Idea",
};

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
        whenLine: card.whenLine,
        signalLine: card.signalLine,
        status: card.status,
        person: src?.person || "",
      };
    });
  }, []);

  const visible =
    lens === "ready"
      ? graphs.filter((g) => g.status === "ready" || g.status === "aligned")
      : lens === "action"
        ? graphs.filter((g) => g.status === "forming" || g.status === "idea")
        : graphs;

  return (
    <div
      className="graphs-home"
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
            <span className="graphs-create-plus-h" aria-hidden />
            <span className="graphs-create-plus-v" aria-hidden />
          </button>
        </div>
        <p className="graphs-home-lede">What is taking shape</p>
      </header>

      <div className="graphs-lenses" role="toolbar" aria-label="Graph lenses">
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
            className={`graphs-lens-chip ${lens === id ? "is-active" : ""}`}
            data-testid={`graphs-lens-${id}`}
            data-lens={id}
            data-figma-pill={id === "action" ? "618:686" : undefined}
            aria-pressed={lens === id}
            onClick={() => setLens(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="graphs-timeline" data-testid="graphs-trajectory" aria-label="Graph timeline">
        <div className="graphs-timeline-rail" aria-hidden />
        <div className="graphs-home-list" data-testid="graphs-home-list">
          {visible.map((g) => (
            <article
              key={g.id}
              className="graphs-home-card"
              data-testid={`graphs-card-${g.id}`}
              data-graph-status={g.status}
            >
              <span className="graphs-timeline-dot" aria-hidden />
              <button
                type="button"
                className="graphs-home-card-btn"
                data-testid={`graphs-open-${g.id}`}
                onClick={() => onOpenGraph(g.id)}
              >
                <div className="graphs-card-top">
                  <strong className="graphs-card-title">{g.title}</strong>
                  <span
                    className={`graphs-card-status graphs-status-${g.status}`}
                    data-testid={`graphs-status-${g.id}`}
                  >
                    {STATUS_LABEL[g.status]}
                  </span>
                </div>
                <p className="graphs-card-place">{g.whenLine}</p>
                <p className="graphs-card-meta">{g.signalLine}</p>
              </button>
            </article>
          ))}
          {!visible.length ? <p className="gsh-empty">No Graphs in this lens yet.</p> : null}
        </div>
      </div>

      <p className="graphs-home-foot" data-testid="graphs-open-hint">
        Tap a Graph to open it.
      </p>
    </div>
  );
}
