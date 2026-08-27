/**
 * GRAPHS-00 - Social trajectory overview + lenses
 * Dated authority 618:674 (legacy 368:23). Create Graph -> existing path (no sixth dock).
 * Filters 618:685/686: All · Action · Ready (founder copy override 2026-08-26 — not "Needs you").
 */
import React, { useState } from "react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";
import { FOUNDER_HOME_FEED, happeningInLabel } from "./founderGraphSeed";

type Lens = "all" | "action" | "ready";

type Props = {
  onOpenGraph: (cardId: string) => void;
  onCreateGraph?: () => void;
};

export function GraphsHome({ onOpenGraph, onCreateGraph }: Props) {
  const [lens, setLens] = useState<Lens>("all");
  const graphs = FOUNDER_HOME_FEED.filter((c) => c.kind === "graph");

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
      data-legacy-figma-graphs="368:23"
    >
      <header className="graphs-home-top">
        <div className="gsh-brand">
          <OpalMark size="sm" title="" />
          <OpalWordmark height={18} title="" compact />
        </div>
        <div className="graphs-home-title-row">
          <h1 className="chats-home-title">Your Graphs</h1>
          <button
            type="button"
            className="btn primary"
            data-testid="graphs-create"
            onClick={onCreateGraph}
          >
            Create Graph
          </button>
        </div>
        <p className="gsh-meta">What is taking shape</p>
      </header>

      <div className="gsh-filters" role="toolbar" aria-label="Graph lenses">
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

      <div className="graphs-home-list" data-testid="graphs-home-list">
        {visible.map((g) => (
          <article key={g.id} className="graphs-home-card" data-testid={`graphs-card-${g.id}`}>
            <div className="gsh-card-row">
              <strong>{g.person}</strong>
              <span className="gsh-meta"> · Graph</span>
              {happeningInLabel(g.startsAt) ? (
                <span className="gsh-countdown">{happeningInLabel(g.startsAt)}</span>
              ) : null}
            </div>
            <p className="gsh-card-title">{g.title}</p>
            <p className="gsh-meta">{g.placeLine || g.detail}</p>
            <button
              type="button"
              className="gsh-open-graph"
              data-testid={`graphs-open-${g.id}`}
              onClick={() => onOpenGraph(g.id)}
            >
              Open Graph
            </button>
          </article>
        ))}
        {!visible.length ? <p className="gsh-empty">No Graphs in this lens yet.</p> : null}
      </div>
    </div>
  );
}
