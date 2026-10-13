/**
 * GRAPHS OVERVIEW  -  exact current authority 618:674
 * Filters All · Action · Ready · Past. Vertical timeline + text nodes.
 * No Enter Journey. No auto-Journey. No media-card reinterpretation.
 * Past preserves the same Reality lineage after scheduled time.
 * Paste J Phase 5: person-node temporal context + live/seed timeline wiring.
 * Pass 1: seed-off prefer-real via composeGraphsList (never paint seed as current).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { PRODUCT_COPY } from "../designTokens";
import { isFounderSeedEnabled, FOUNDER_GRAPH_SEED_ID } from "./founderGraphSeed";
import { personNodeTemporal } from "./graphCalendaring";
import { type CreatedPlanSurface } from "./graphSurfaceInterop";
import {
  composeGraphsList,
  type GraphStatus,
  type LiveGraphCard,
} from "./graphsHydration";
import { GraphsTripsSection } from "./GraphsTripsSection";
import {
  GraphsTemporalTimeline,
  type TimelineItem,
} from "./GraphsTemporalTimeline";

type Lens = "all" | "action" | "ready" | "past";
type GraphMode = "people" | "timeline";

export type LiveGraph = LiveGraphCard;

type Props = {
  onOpenGraph: (cardId: string) => void;
  onCreateGraph?: () => void;
  /** Paste W4 5.3 — New menu: plan / trip / idea. */
  onCreatePlan?: () => void;
  onCreateTrip?: () => void;
  onCreateIdea?: () => void;
  /** Paste W 3.1 — Idea card CTA opens planning flow prefilled. */
  onStartPlanning?: (graph: {
    id: string;
    title: string;
    whenLine?: string;
    person?: string;
  }) => void;
  /** Real SharedPlan rows. Seeds stay for design comparison and follow these. */
  liveGraphs?: LiveGraph[];
  /** Paste W5 Phase 4 — composer-created plans overlay idea cards (forming/pending). */
  createdPlans?: CreatedPlanSurface[];
  onMessageTimelineItem?: (item: TimelineItem) => void;
  onAdjustTimelineItem?: (item: TimelineItem) => void;
  /** Bump to open trip create inside GraphsTripsSection. */
  tripCreateSignal?: number;
};

const STATUS_LABEL: Record<GraphStatus, string> = {
  ready: "Ready",
  action: "Action",
  aligned: "Aligned",
  forming: "Forming",
  idea: "Idea",
  past: "Past",
};

const GRAPH_SCROLL_KEY = "opal.graphs.scroll.v1";

export function GraphsHome({
  onOpenGraph,
  onCreateGraph,
  onCreatePlan,
  onCreateTrip,
  onCreateIdea,
  onStartPlanning,
  liveGraphs = [],
  createdPlans = [],
  onMessageTimelineItem,
  onAdjustTimelineItem,
  tripCreateSignal = 0,
}: Props) {
  const [lens, setLens] = useState<Lens>("all");
  const [mode, setMode] = useState<GraphMode>("people");
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seedOn = isFounderSeedEnabled();

  useEffect(() => {
    if (!createMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCreateMenuOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("[data-testid='graphs-create-menu'], [data-testid='graphs-create']")) {
        return;
      }
      setCreateMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [createMenuOpen]);
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

  const composed = useMemo(
    () =>
      composeGraphsList({
        liveGraphs,
        createdPlans,
        founderSeedEnabled: seedOn,
      }),
    [liveGraphs, createdPlans, seedOn],
  );
  const graphs = composed.graphs;
  const timelineItems = composed.timelineItems;

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
      data-founder-seed={seedOn ? FOUNDER_GRAPH_SEED_ID : "off"}
      data-graphs-mode={composed.mode}
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
              className="graphs-create-new"
              data-testid="graphs-create"
              aria-label="New"
              title="New"
              aria-expanded={createMenuOpen}
              onClick={() => setCreateMenuOpen((o) => !o)}
            >
              <span className="graphs-create-new-label">New</span>
            </button>
            {createMenuOpen ? (
              <div
                className="graphs-create-menu"
                role="menu"
                data-testid="graphs-create-menu"
                aria-label="Create"
              >
                <p className="graphs-create-menu-title">Create</p>
                <button
                  type="button"
                  role="menuitem"
                  data-testid="graphs-create-plan"
                  onClick={() => {
                    setCreateMenuOpen(false);
                    (onCreatePlan || onCreateGraph)?.();
                  }}
                >
                  New plan
                </button>
                <button
                  type="button"
                  role="menuitem"
                  data-testid="graphs-create-trip"
                  onClick={() => {
                    setCreateMenuOpen(false);
                    onCreateTrip?.();
                  }}
                >
                  New trip
                </button>
                <button
                  type="button"
                  role="menuitem"
                  data-testid="graphs-create-idea"
                  onClick={() => {
                    setCreateMenuOpen(false);
                    (onCreateIdea || onCreatePlan || onCreateGraph)?.();
                  }}
                >
                  New idea
                </button>
              </div>
            ) : null}
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
        <GraphsTemporalTimeline
          items={timelineItems}
          seedLabeled={composed.seedLabeled}
          onOpenItem={onOpenGraph}
          onMessageGroup={onMessageTimelineItem}
          onAdjust={onAdjustTimelineItem || ((item) => onOpenGraph(item.id))}
        />
      ) : (
        <>
      {/* Trips inside scroll owner so vertical pan works (not trapped in sticky chrome) */}
      <GraphsTripsSection createSignal={tripCreateSignal} />
      <div className="graphs-timeline" data-testid="graphs-trajectory" aria-label="Graph timeline">
        <div className="graphs-timeline-rail" aria-hidden />
        <div className="graphs-home-list" data-testid="graphs-home-list">
          {visible.map((g) => {
            const temporal = g.person ? personNodeTemporal(g.person) : null;
            const upcoming = temporal?.upcomingPlans || [];
            const openLoop = temporal?.nextOpenLoop || null;
            return (
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
                data-plan-state={
                  g.status === "ready" || g.status === "aligned"
                    ? "ready"
                    : g.status === "idea"
                      ? "idea"
                      : g.status === "forming"
                        ? "forming"
                        : g.status === "action"
                          ? "action"
                          : g.status === "past"
                            ? "past"
                            : undefined
                }
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
                {upcoming.length || openLoop ? (
                  <div
                    className="graphs-card-temporal"
                    data-testid={`graphs-card-temporal-${g.id}`}
                  >
                    {upcoming.slice(0, 3).map((p) => (
                      <p key={p.id} className="graphs-card-upcoming">
                        {p.title}
                        <span> · {p.whenLabel}</span>
                      </p>
                    ))}
                    {openLoop ? (
                      <p
                        className="graphs-card-open-loop"
                        data-testid={`graphs-card-open-loop-${g.id}`}
                      >
                        Open: {openLoop.label}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </button>
              {g.status === "idea" && onStartPlanning ? (
                <button
                  type="button"
                  className="btn graphs-start-planning"
                  data-testid={`graphs-start-planning-${g.id}`}
                  onClick={() =>
                    onStartPlanning({
                      id: g.id,
                      title: g.title,
                      whenLine: g.whenLine,
                      person: g.person,
                    })
                  }
                >
                  Start planning
                </button>
              ) : null}
            </article>
            );
          })}
          {!visible.length ? (
            <div
              className="gsh-empty"
              data-testid="graphs-home-empty"
              data-empty={composed.mode === "EMPTY" ? "ready-world" : "lens"}
            >
              <p className="gsh-empty-title">
                {composed.mode === "EMPTY"
                  ? PRODUCT_COPY.emptyGraphs
                  : PRODUCT_COPY.emptyGraphsLens}
              </p>
            </div>
          ) : null}
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
