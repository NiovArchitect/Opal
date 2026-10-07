/**
 * GRAPHS OVERVIEW  -  exact current authority 618:674
 * Filters All · Action · Ready · Past. Vertical timeline + text nodes.
 * No Enter Journey. No auto-Journey. No media-card reinterpretation.
 * Past preserves the same Reality lineage after scheduled time.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FOUNDER_HOME_FEED } from "./founderGraphSeed";
import { GRAPH_AUTHORITY_CHROME } from "./graphAuthorityChrome";
import { GraphsTripsSection } from "./GraphsTripsSection";
import { GraphsTemporalTimeline } from "./GraphsTemporalTimeline";

type Lens = "all" | "action" | "ready" | "past";
type GraphMode = "people" | "timeline";

export type LiveGraph = {
  id: string;
  title: string;
  whenLine: string;
  signalLine: string;
  status: "ready" | "action" | "forming" | "aligned" | "past";
};

type Props = {
  onOpenGraph: (cardId: string) => void;
  onCreateGraph?: () => void;
  /** Real SharedPlan rows. Seeds stay for design comparison and follow these. */
  liveGraphs?: LiveGraph[];
};

type GraphStatus = "ready" | "action" | "aligned" | "forming" | "idea" | "past";

/** Chrome titles + lines matching 618:674; ids remain domain/seed owners. */
const AUTHORITY_CARDS: {
  id: string;
  title: string;
  whenLine: string;
  signalLine: string;
  status: GraphStatus;
}[] = (
  [
    ["seed-chanelle-juniper", "ready"],
    ["seed-maya-graph-coast", "forming"],
    ["seed-alex-graph-gallery", "aligned"],
    ["seed-near-rooftop", "idea"],
  ] as const
).map(([id, status]) => ({
  id,
  title: GRAPH_AUTHORITY_CHROME[id].title,
  whenLine: GRAPH_AUTHORITY_CHROME[id].whenLine,
  signalLine: GRAPH_AUTHORITY_CHROME[id].signalLine,
  status: status as GraphStatus,
}));

const STATUS_LABEL: Record<GraphStatus, string> = {
  ready: "Ready",
  action: "Action",
  aligned: "Aligned",
  forming: "Forming",
  idea: "Idea",
  past: "Past",
};

const STATUS_RANK: Record<GraphStatus, number> = {
  action: 0,
  ready: 1,
  aligned: 2,
  forming: 3,
  idea: 4,
  past: 5,
};

const GRAPH_SCROLL_KEY = "opal.graphs.scroll.v1";

export function GraphsHome({ onOpenGraph, onCreateGraph, liveGraphs = [] }: Props) {
  const [lens, setLens] = useState<Lens>("all");
  const [mode, setMode] = useState<GraphMode>("people");
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const saved = window.sessionStorage.getItem(GRAPH_SCROLL_KEY);
    if (saved) node.scrollTop = Number(saved) || 0;
    const remember = () => {
      window.sessionStorage.setItem(GRAPH_SCROLL_KEY, String(node.scrollTop));
    };
    node.addEventListener("scroll", remember, { passive: true });
    return () => node.removeEventListener("scroll", remember);
  }, []);
  const graphs = useMemo(() => {
    const all = FOUNDER_HOME_FEED.filter((c) => c.kind === "graph" || c.kind === "live");
    const byId = new Map(all.map((g) => [g.id, g]));
    const seeds = AUTHORITY_CARDS.map((card) => {
      const src = byId.get(card.id);
      return {
        id: card.id,
        title: card.title,
        whenLine: card.whenLine,
        signalLine: card.signalLine,
        status: card.status,
        person: src?.person || "",
        real: false,
      };
    });
    const live = liveGraphs.map((card) => ({ ...card, person: "", real: true }));
    // Combined All list: past ranks last so a lone live Past Graph does not sit first.
    return [...live, ...seeds].sort(
      (a, b) => (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99),
    );
  }, [liveGraphs]);

  const visible =
    lens === "ready"
      ? graphs.filter((g) => g.status === "ready" || g.status === "aligned")
      : lens === "action"
        ? graphs.filter((g) => g.status === "action" || g.status === "forming" || g.status === "idea")
        : lens === "past"
          ? graphs.filter((g) => g.status === "past")
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

      {/* 1114:2 — ONE sticky Graph chrome owner (identity + lenses; same plane) */}
      <div
        className="graphs-sticky-chrome"
        data-testid="graphs-sticky-chrome"
        data-figma-chrome="1114:124"
      >
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

        <div className="graphs-mode-toggle" role="tablist" aria-label="Graphs mode" data-testid="graphs-mode-toggle">
          {(
            [
              ["people", "People"],
              ["timeline", "Timeline"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              className={`graphs-mode-chip ${mode === id ? "is-active" : ""}`}
              data-testid={`graphs-mode-${id}`}
              aria-selected={mode === id}
              onClick={() => setMode(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "people" ? (
          <div className="graphs-lenses" role="toolbar" aria-label="Graph lenses">
            {(
              [
                ["all", "All"],
                ["action", "Action"],
                ["ready", "Ready"],
                ["past", "Past"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`graphs-lens-chip ${lens === id ? "is-active" : ""}`}
                data-testid={`graphs-lens-${id}`}
                data-lens={id}
                data-semantic={
                  id === "all" ? "cyan" : id === "action" ? "coral" : id === "ready" ? "gold" : "neutral"
                }
                data-figma-pill={id === "action" ? "618:686" : undefined}
                aria-pressed={lens === id}
                onClick={() => setLens(id)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="graphs-scroll" data-testid="graphs-scroll" ref={scrollRef}>
      {mode === "timeline" ? (
        <GraphsTemporalTimeline onOpenItem={onOpenGraph} />
      ) : (
        <>
      {/* Trips inside scroll owner so vertical pan works (not trapped in sticky chrome) */}
      <GraphsTripsSection />
      <div className="graphs-timeline" data-testid="graphs-trajectory" aria-label="Graph timeline">
        <div className="graphs-timeline-rail" aria-hidden />
        <div className="graphs-home-list" data-testid="graphs-home-list">
          {visible.map((g) => (
            <article
              key={g.id}
              className="graphs-home-card"
              data-testid={`graphs-card-${g.id}`}
              data-graph-status={g.status}
              data-real={g.real ? "true" : "false"}
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
        </>
      )}
      </div>
    </div>
  );
}
