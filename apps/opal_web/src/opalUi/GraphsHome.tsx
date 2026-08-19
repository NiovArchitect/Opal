/**
 * GRAPHS-00 — Social trajectory overview + lenses
 * Figma 368:23 / 373:* — Create Graph → existing 149:31 → 145:216 path (no sixth dock).
 */
import React, { useState } from "react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";
import { FOUNDER_HOME_FEED, happeningInLabel } from "./founderGraphSeed";

type Lens = "all" | "needs_you" | "ready" | "nearby";

type Props = {
  onOpenGraph: (cardId: string) => void;
  onCreateGraph?: () => void;
};

export function GraphsHome({ onOpenGraph, onCreateGraph }: Props) {
  const [lens, setLens] = useState<Lens>("all");
  const graphs = FOUNDER_HOME_FEED.filter((c) => c.kind === "graph");

  const visible =
    lens === "nearby"
      ? graphs.slice(0, 1)
      : lens === "ready"
        ? graphs.filter((g) => (g.goingCount ?? 0) > 0 || (g.interestedCount ?? 0) > 0)
        : lens === "needs_you"
          ? graphs.filter((g) => (g.interestedCount ?? 0) > 0)
          : graphs;

  return (
    <div className="graphs-home scroll" data-testid="graphs-home" data-figma="368:23">
      <header className="graphs-home-top">
        <div className="gsh-brand">
          <OpalMark size="sm" title="" />
          <OpalWordmark height={18} title="" compact />
        </div>
        <div className="graphs-home-title-row">
          <h1 className="chats-home-title">Graphs</h1>
          <button
            type="button"
            className="btn primary"
            data-testid="graphs-create"
            onClick={onCreateGraph}
          >
            Create Graph
          </button>
        </div>
        <p className="gsh-meta">Trajectory · not a planner dump</p>
      </header>

      <div className="gsh-filters" role="toolbar" aria-label="Graph lenses">
        {(
          [
            ["all", "All"],
            ["needs_you", "Needs you"],
            ["ready", "Ready"],
            ["nearby", "Nearby"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`gsh-chip ${lens === id ? "is-active" : ""}`}
            data-testid={`graphs-lens-${id}`}
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
