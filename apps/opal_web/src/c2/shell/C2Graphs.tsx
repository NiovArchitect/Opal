/**
 * Repair #18 - Division C2 - Graphs (track-c2 section 8).
 *
 * A calm, grouped list and a detail that answers. Groups render
 * exactly as projected - the list never regroups, recounts, or
 * re-derives. Cards size to content BY CONSTRUCTION: no fixed heights,
 * no clipped lines anywhere in this surface (the Walk #4 clipping
 * failure cannot recur here; c2shell.css forces wrap on card text).
 *
 * Every control performs its operation or does not render: New opens
 * the create sheet (real create intents), a forming card's completion
 * action opens detail on the missing slot, Drop it asks once in a
 * sheet and then emits the cancel intent.
 */
import React, { useMemo, useState } from "react";
import { TopLayer } from "../../opalUi/TopLayer";
import { PlanCardC2 } from "../PlanCardC2";
import { completionStep, FoodStepPanel } from "../../opalUi/FoodStepPanel";
import { CheckinCircleRow } from "../../opalUi/CheckinCircleRow";
import type { GraphDetailProjection, GraphListProjection } from "./projections";
import { Avatar, EmptyBlock, IconBack } from "./bits";

type Lens = "all" | "action" | "ready" | "past";

export type C2GraphsEvents = {
  openGraph: (cardId: string, origin: "graphs") => void;
  createPlan: () => void;
  createTrip: () => void;
  createIdea: () => void;
  completeSlot: (cardId: string, slotKind: string) => void;
  dropPlan: (cardId: string) => void;
  runNextAction: (detail: GraphDetailProjection) => void;
  addPeople: (cardId: string) => void;
  openChatForPlan: (cardId: string) => void;
  back: () => void;
};

const LENSES: Array<{ key: Lens; label: string }> = [
  { key: "all", label: "All" },
  { key: "action", label: "Action" },
  { key: "ready", label: "Ready" },
  { key: "past", label: "Past" },
];

export function C2Graphs({
  projection,
  events,
}: {
  projection: GraphListProjection;
  events: C2GraphsEvents;
}) {
  const [lens, setLens] = useState<Lens>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [pastOpen, setPastOpen] = useState(false);

  const visibleGroups = useMemo(() => {
    if (lens === "all") return projection.groups;
    return projection.groups
      .map((group) => ({
        ...group,
        cards: group.cards.filter((card) =>
          lens === "past"
            ? card.stateFamily === "past"
            : lens === "action"
              ? card.stateFamily === "action" || card.stateFamily === "forming"
              : card.stateFamily === "ready" || card.stateFamily === "happening",
        ),
      }))
      .filter((group) => group.cards.length > 0);
  }, [projection.groups, lens]);

  const totalCards = projection.groups.reduce((n, g) => n + g.cards.length, 0);

  return (
    <div data-testid="c2-graphs">
      <header className="c2s-header">
        <h1 className="c2s-header-title" style={{ flex: 1 }}>
          Your Graphs
        </h1>
        <button
          type="button"
          className="c2s-btn-quiet"
          data-testid="c2-graphs-new"
          onClick={() => setCreateOpen(true)}
        >
          New
        </button>
      </header>
      <div className="c2s-scroll">
        <div className="c2s-lens-row" role="tablist" aria-label="Graph lenses">
          {LENSES.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={lens === item.key}
              className="c2s-lens-chip"
              data-active={lens === item.key ? "1" : undefined}
              data-testid={`c2-lens-${item.key}`}
              onClick={() => setLens(item.key)}
            >
              {item.label} {projection.lensCounts[item.key]}
            </button>
          ))}
        </div>

        {projection.listError ? (
          <EmptyBlock
            testId="c2-graphs-error"
            headline="Graphs did not load."
            line="Check your connection and try again."
            actionLabel="Try again"
            onAction={events.back}
          />
        ) : totalCards === 0 ? (
          <EmptyBlock
            testId="c2-graphs-empty"
            headline="Nothing here yet."
            line="Your plans will live here."
            actionLabel="New plan"
            onAction={() => setCreateOpen(true)}
          />
        ) : visibleGroups.length === 0 ? (
          <EmptyBlock
            testId="c2-graphs-lens-empty"
            headline="Nothing coming up."
            line="Past plans are below when you want them."
          />
        ) : (
          visibleGroups.map((group) => {
            const isPast = group.kind === "past";
            if (isPast && !pastOpen && lens === "all") {
              return (
                <div key={group.id}>
                  <button
                    type="button"
                    className="c2s-btn-text"
                    data-testid="c2-graphs-past-toggle"
                    onClick={() => setPastOpen(true)}
                    style={{ width: "100%", textAlign: "left" }}
                  >
                    Past - {group.cards.length} - show
                  </button>
                </div>
              );
            }
            return (
              <section key={group.id} data-testid="c2-graphs-group">
                <h2 className="c2s-group-title">{group.title}</h2>
                <div className="c2s-group-cards">
                  {group.cards.map((card) => (
                    <div key={card.id}>
                      <PlanCardC2
                        input={card}
                        onOpen={() => events.openGraph(card.id, "graphs")}
                        onPrimaryAction={
                          card.completionAction
                            ? () => events.completeSlot(card.id, card.completionAction!.slotKind)
                            : undefined
                        }
                      />
                      {card.droppable ? (
                        <div className="c2s-completion-row">
                          <button
                            type="button"
                            className="c2s-btn-text"
                            data-testid="c2-graph-drop"
                            onClick={() => setDropTarget(card.id)}
                          >
                            Drop it
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>

      {createOpen ? (
        <TopLayer band="sheet">
          <div className="c2s-scrim" data-testid="c2-graphs-create-sheet" onClick={() => setCreateOpen(false)}>
            <div className="c2s-sheet" role="dialog" aria-label="New" onClick={(e) => e.stopPropagation()}>
              <p className="c2s-sheet-title">New</p>
              {(
                [
                  { label: "Plan", line: "A time, a place, your people.", run: events.createPlan, id: "plan" },
                  { label: "Trip", line: "A few days, one Graph.", run: events.createTrip, id: "trip" },
                  { label: "Idea", line: "Just the spark. Plan it later.", run: events.createIdea, id: "idea" },
                ] as const
              ).map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="c2s-sheet-row"
                  data-testid={`c2-graphs-create-${row.id}`}
                  onClick={() => {
                    setCreateOpen(false);
                    row.run();
                  }}
                >
                  <span>
                    {row.label}
                    <small>{row.line}</small>
                  </span>
                </button>
              ))}
              <button type="button" className="c2s-btn-text" onClick={() => setCreateOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </TopLayer>
      ) : null}

      {dropTarget ? (
        <TopLayer band="sheet">
          <div className="c2s-scrim" data-testid="c2-graphs-drop-sheet" onClick={() => setDropTarget(null)}>
            <div className="c2s-sheet" role="dialog" aria-label="Drop this plan" onClick={(e) => e.stopPropagation()}>
              <p className="c2s-sheet-title">Drop this plan?</p>
              <button
                type="button"
                className="c2s-btn-danger-text"
                data-testid="c2-graph-drop-confirm"
                onClick={() => {
                  const id = dropTarget;
                  setDropTarget(null);
                  events.dropPlan(id);
                }}
              >
                Drop it
              </button>
              <button type="button" className="c2s-btn-text" onClick={() => setDropTarget(null)}>
                Keep it
              </button>
            </div>
          </div>
        </TopLayer>
      ) : null}
    </div>
  );
}

/** Section 8.2 - Graph Detail: one plan, fully answered, on a
 *  destination-band surface that owns its screen. The header is this
 *  surface's own - no conversation header can render over it. */
export function C2GraphDetail({
  detail,
  events,
  bearer,
  onFoodChanged,
  onOpenCheckinSummary,
}: {
  detail: GraphDetailProjection;
  events: C2GraphsEvents;
  /** Integration wiring: the session bearer for the B2/B3 mounts. */
  bearer?: string;
  /** Re-read after a food action so the detail renders the returned plan. */
  onFoodChanged?: () => void;
  onOpenCheckinSummary?: (sweepId: string) => void;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const foodStep = completionStep(
    detail.completion as Parameters<typeof completionStep>[0],
    "food",
  );
  return (
    <TopLayer band="modal">
      <div className="c2s-destination" data-testid="c2-graph-detail">
        <header className="c2s-header">
          <button
            type="button"
            className="c2s-icon-btn"
            aria-label="Back"
            data-testid="c2-detail-back"
            onClick={events.back}
          >
            <IconBack />
          </button>
          <span style={{ fontWeight: 650 }}>Graph</span>
        </header>
        <div style={{ paddingBottom: "var(--space-7)" }}>
          <div className="c2s-detail-section">
            <PlanCardC2 input={detail.card} />
            {detail.attendanceLine ? (
              <p className="c2s-card-line" data-testid="c2-detail-attendance" style={{ marginTop: 8 }}>
                {detail.attendanceLine}
              </p>
            ) : null}
          </div>

          <div className="c2s-detail-section">
            <p className="c2s-detail-kicker">When</p>
            <p className="c2s-card-title" style={{ fontSize: 17 }}>
              {detail.whenLine}
            </p>
          </div>

          {detail.where ? (
            <div className="c2s-detail-section">
              <p className="c2s-detail-kicker">Where</p>
              <p className="c2s-card-title" style={{ fontSize: 17 }}>
                {detail.where.label}
              </p>
              {detail.where.handoffLabel ? (
                <button
                  type="button"
                  className="c2s-card-action"
                  data-testid="c2-detail-handoff"
                  onClick={() => events.runNextAction(detail)}
                >
                  {detail.where.handoffLabel}
                </button>
              ) : null}
            </div>
          ) : null}

          {detail.who.length > 0 ? (
            <div className="c2s-detail-section">
              <p className="c2s-detail-kicker">Who</p>
              {detail.who.map((person) => (
                <div className="c2s-who-row" key={person.name}>
                  <Avatar avatar={person.avatar} size={36} />
                  <span className="c2s-who-name">{person.name}</span>
                  <span className="c2s-who-resp">{person.responseLabel}</span>
                </div>
              ))}
              <button
                type="button"
                className="c2s-btn-text"
                data-testid="c2-detail-add-people"
                onClick={() => events.addPeople(detail.id)}
              >
                Add people
              </button>
            </div>
          ) : null}

          {detail.nextAction ? (
            <div className="c2s-detail-section">
              <p className="c2s-detail-kicker">Next step</p>
              <button
                type="button"
                className="c2s-btn-primary"
                data-testid="c2-detail-next"
                onClick={() => events.runNextAction(detail)}
              >
                {detail.nextAction.label}
              </button>
              <button
                type="button"
                className="c2s-btn-text"
                data-testid="c2-detail-open-chat"
                onClick={() => events.openChatForPlan(detail.id)}
              >
                Open the chat for this plan
              </button>
            </div>
          ) : null}

          {detail.activity.length > 0 ? (
            <div className="c2s-detail-section">
              <p className="c2s-detail-kicker">Activity</p>
              {detail.activity.map((row, i) => (
                <p className="c2s-card-line" key={i} style={{ marginBottom: 6 }}>
                  {row.line} <span style={{ color: "var(--ink-3)" }}>{row.timeLabel}</span>
                </p>
              ))}
            </div>
          ) : null}

          {detail.history.length > 0 ? (
            <div className="c2s-detail-section">
              <button
                type="button"
                className="c2s-btn-text"
                data-testid="c2-detail-history-toggle"
                onClick={() => setHistoryOpen((v) => !v)}
              >
                History {historyOpen ? "- hide" : "- show"}
              </button>
              {historyOpen
                ? detail.history.map((row, i) => (
                    <p className="c2s-card-line" key={i}>
                      {row.line}
                    </p>
                  ))
                : null}
            </div>
          ) : null}

          {/* B2 wiring: the food panel mounts ONLY when the plan's
              completion record carries a food step; the panel renders
              that projection verbatim. */}
          {foodStep ? (
            <div className="c2s-detail-section" data-testid="c2-detail-food">
              <FoodStepPanel
                planId={detail.id}
                completion={
                  detail.completion as Parameters<typeof FoodStepPanel>[0]["completion"]
                }
                viewerUserId={detail.viewerUserId ?? ""}
                meetingLink={detail.meetingLink ?? null}
                onChanged={onFoodChanged}
              />
            </div>
          ) : null}

          {/* B3 wiring (design section 7): the circle row for plan
              sources lives on the plan's detail surface. */}
          <div className="c2s-detail-section" data-testid="c2-detail-checkin">
            <p className="c2s-detail-kicker">Check in</p>
            <CheckinCircleRow
              source={{ source_kind: "plan", source_ref_id: detail.id }}
              bearer={bearer}
              onOpenSummary={onOpenCheckinSummary}
            />
          </div>
        </div>
      </div>
    </TopLayer>
  );
}
