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
 * sheet and then runs the real plan cancel through the API.
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
  /** Real cancel through the API. Resolves null on success (the
   *  surface has already re-read the server's truth); resolves the
   *  plain-language error line to show when the cancel did not happen. */
  dropPlan: (cardId: string) => Promise<string | null>;
  runNextAction: (detail: GraphDetailProjection) => void;
  addPeople: (cardId: string) => void;
  openChatForPlan: (cardId: string) => void;
  back: () => void;
  /** Hunt-fix B-12: the list error state's real retry (re-reads the
   *  plans). Without it, "Try again" fell back to navigating away. */
  retryLoad?: () => void;
  /** Hunt-fix B-15: convert this plan physical -> virtual through the
   *  B1 conversion path. Resolves the plain-language status line to
   *  show (applied, proposed to the group, or the failure). */
  convertPlan?: (cardId: string) => Promise<string>;
  /** Adoption wave 1 - intentions / goals / shelf. Every handler runs
   *  the real API and the surface re-reads the server's projection;
   *  absent handlers mean the section's controls do not render. */
  createIntention?: (input: {
    subjectUserId: string;
    title: string;
    cadenceDays?: number;
  }) => Promise<void>;
  deleteIntention?: (intentionId: string) => Promise<void>;
  createGoal?: (title: string) => Promise<void>;
  deleteGoal?: (goalId: string) => Promise<void>;
  /** Harmony2 completion (adopt1 4.C10's named missing leg): the
   * goal rows' link/unlink plan picker. Each runs the real API and
   * the surface re-reads the goal projection; the goal's status line
   * is the read-back. Absent handlers = no picker renders. */
  linkGoalPlan?: (goalId: string, planId: string) => Promise<void>;
  unlinkGoalPlan?: (goalId: string, planId: string) => Promise<void>;
  promoteSpark?: (sparkId: string) => Promise<void>;
  startStarter?: (starterId: string) => void;
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
  const [dropError, setDropError] = useState<string | null>(null);
  const [dropBusy, setDropBusy] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  // Adoption wave 1 forms (intentions / goals).
  const [intentionFormOpen, setIntentionFormOpen] = useState(false);
  const [intentionPerson, setIntentionPerson] = useState("");
  const [intentionTitle, setIntentionTitle] = useState("");
  const [intentionCadence, setIntentionCadence] = useState("");
  const [goalTitle, setGoalTitle] = useState("");
  const [goalPickerOpen, setGoalPickerOpen] = useState<string | null>(null);

  const closeDropSheet = () => {
    setDropTarget(null);
    setDropError(null);
    setDropBusy(false);
  };

  /** One ask, once: the confirm fires the real cancel; the sheet
   *  closes only when the cancel happened (the list behind it has
   *  already re-read the server's truth). On failure the sheet stays
   *  open with the one plain error line - the card is untouched. */
  const confirmDrop = async () => {
    if (!dropTarget || dropBusy) return;
    const id = dropTarget;
    setDropBusy(true);
    const error = await events.dropPlan(id);
    if (error) {
      setDropBusy(false);
      setDropError(error);
    } else {
      closeDropSheet();
    }
  };

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
            // HA-B (harmony2): Try again exists only when it retries
            // the failed load itself. The old fallback wired it to
            // navigation (back) when no retry handler was supplied -
            // the HB-12 shape. No retry handler, no retry button.
            actionLabel={events.retryLoad ? "Try again" : undefined}
            onAction={events.retryLoad}
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

        {projection.adopt1 ? (
          <>
            <section data-testid="c2-graphs-intentions">
              <h2 className="c2s-group-title">Intentions</h2>
              <p className="c2s-card-line">
                The rhythm you are keeping with your people, in your words. It tracks your plans
                only - never anyone else.
              </p>
              {projection.adopt1.intentions.map((intention) => (
                <div key={intention.id} className="c2s-group-cards">
                  <p className="c2s-card-title" style={{ fontSize: 15 }}>
                    {intention.title}
                  </p>
                  <p className="c2s-card-line">With {intention.subject_name}</p>
                  <p className="c2s-card-line">{intention.status_line}</p>
                  {events.deleteIntention ? (
                    <button
                      type="button"
                      className="c2s-btn-text"
                      data-testid="c2-intention-delete"
                      onClick={() => void events.deleteIntention!(intention.id)}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
              {events.createIntention && projection.adopt1.people.length > 0 ? (
                intentionFormOpen ? (
                  <div className="c2s-group-cards">
                    <select
                      className="c2s-field"
                      data-testid="c2-intention-person"
                      aria-label="Person"
                      value={intentionPerson}
                      onChange={(e) => setIntentionPerson(e.target.value)}
                    >
                      <option value="">Choose a person</option>
                      {projection.adopt1.people.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name}
                        </option>
                      ))}
                    </select>
                    <input
                      className="c2s-field"
                      data-testid="c2-intention-title"
                      placeholder="Your intention, in your words"
                      aria-label="Intention"
                      value={intentionTitle}
                      onChange={(e) => setIntentionTitle(e.target.value)}
                    />
                    <input
                      className="c2s-field"
                      data-testid="c2-intention-cadence"
                      placeholder="Days between, if you keep a rhythm (optional)"
                      aria-label="Cadence in days"
                      inputMode="numeric"
                      value={intentionCadence}
                      onChange={(e) => setIntentionCadence(e.target.value)}
                    />
                    <button
                      type="button"
                      className="c2s-btn-primary"
                      data-testid="c2-intention-save"
                      disabled={!intentionPerson || !intentionTitle.trim()}
                      onClick={() => {
                        const cadence = Number.parseInt(intentionCadence, 10);
                        void events
                          .createIntention!({
                            subjectUserId: intentionPerson,
                            title: intentionTitle.trim(),
                            cadenceDays: Number.isFinite(cadence) ? cadence : undefined,
                          })
                          .then(() => {
                            setIntentionFormOpen(false);
                            setIntentionTitle("");
                            setIntentionCadence("");
                            setIntentionPerson("");
                          });
                      }}
                    >
                      Save intention
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="c2s-btn-text"
                    data-testid="c2-intention-new"
                    onClick={() => setIntentionFormOpen(true)}
                  >
                    New intention
                  </button>
                )
              ) : null}
            </section>

            <section data-testid="c2-graphs-goals">
              <h2 className="c2s-group-title">Working toward</h2>
              {projection.adopt1.goals.map((goal) => {
                // The picker lists the owner's real plans - the same
                // cards this surface renders from the plan store.
                const planOptions = projection.groups.flatMap((g) => g.cards);
                const titleFor = (planId: string) =>
                  planOptions.find((c) => c.id === planId)?.title ?? "A linked plan";
                return (
                <div key={goal.id} className="c2s-group-cards">
                  <p className="c2s-card-title" style={{ fontSize: 15 }}>
                    {goal.title}
                  </p>
                  <p className="c2s-card-line">{goal.status_line}</p>
                  {events.linkGoalPlan && events.unlinkGoalPlan ? (
                    <>
                      <button
                        type="button"
                        className="c2s-btn-text"
                        data-testid={`c2-goal-picker-${goal.id}`}
                        aria-expanded={goalPickerOpen === goal.id}
                        onClick={() =>
                          setGoalPickerOpen(goalPickerOpen === goal.id ? null : goal.id)
                        }
                      >
                        {goal.linked_count > 0
                          ? `${goal.linked_count} linked - change`
                          : "Link a plan"}
                      </button>
                      {goalPickerOpen === goal.id ? (
                        <div data-testid={`c2-goal-picker-list-${goal.id}`}>
                          {planOptions.length === 0 ? (
                            <p className="c2s-card-line">No plans yet to link.</p>
                          ) : (
                            planOptions.map((card) => {
                              const linked = goal.linked_plan_ids.includes(card.id);
                              return (
                                <p key={card.id} className="c2s-card-line">
                                  {card.title}{" "}
                                  {linked ? (
                                    <button
                                      type="button"
                                      className="c2s-btn-text"
                                      data-testid={`c2-goal-unlink-${card.id}`}
                                      onClick={() =>
                                        void events.unlinkGoalPlan!(goal.id, card.id)
                                      }
                                    >
                                      Unlink
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="c2s-btn-text"
                                      data-testid={`c2-goal-link-${card.id}`}
                                      onClick={() =>
                                        void events.linkGoalPlan!(goal.id, card.id)
                                      }
                                    >
                                      Link
                                    </button>
                                  )}
                                </p>
                              );
                            })
                          )}
                          {goal.linked_plan_ids
                            .filter((id) => !planOptions.some((c) => c.id === id))
                            .map((planId) => (
                              <p key={planId} className="c2s-card-line">
                                {titleFor(planId)}{" "}
                                <button
                                  type="button"
                                  className="c2s-btn-text"
                                  data-testid={`c2-goal-unlink-${planId}`}
                                  onClick={() =>
                                    void events.unlinkGoalPlan!(goal.id, planId)
                                  }
                                >
                                  Unlink
                                </button>
                              </p>
                            ))}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                  {events.deleteGoal ? (
                    <button
                      type="button"
                      className="c2s-btn-text"
                      data-testid="c2-goal-delete"
                      onClick={() => void events.deleteGoal!(goal.id)}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                );
              })}
              {events.createGoal ? (
                <div className="c2s-group-cards">
                  <input
                    className="c2s-field"
                    data-testid="c2-goal-title"
                    placeholder="Something you are working toward"
                    aria-label="Goal"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                  />
                  <button
                    type="button"
                    className="c2s-btn-primary"
                    data-testid="c2-goal-save"
                    disabled={!goalTitle.trim()}
                    onClick={() => {
                      void events.createGoal!(goalTitle.trim()).then(() => setGoalTitle(""));
                    }}
                  >
                    Add goal
                  </button>
                </div>
              ) : null}
            </section>

            <section data-testid="c2-graphs-shelf">
              <h2 className="c2s-group-title">Someday - the shelf</h2>
              {projection.adopt1.shelf.starters.map((starter) => (
                <div key={starter.id} className="c2s-group-cards">
                  <p className="c2s-card-title" style={{ fontSize: 15 }}>
                    {starter.title}
                  </p>
                  <p className="c2s-card-line">{starter.basis_line}</p>
                  {events.startStarter ? (
                    <button
                      type="button"
                      className="c2s-btn-text"
                      data-testid="c2-starter-start"
                      onClick={() => events.startStarter!(starter.id)}
                    >
                      Start a plan
                    </button>
                  ) : null}
                </div>
              ))}
              {projection.adopt1.shelf.sparks.map((spark) => (
                <div key={spark.id} className="c2s-group-cards">
                  <p className="c2s-card-title" style={{ fontSize: 15 }}>
                    {spark.title}
                  </p>
                  {spark.state === "promoted" && spark.promoted_plan ? (
                    <p className="c2s-card-line" data-testid="c2-spark-promoted">
                      Became a plan: {spark.promoted_plan.title}
                    </p>
                  ) : events.promoteSpark ? (
                    <button
                      type="button"
                      className="c2s-btn-text"
                      data-testid="c2-spark-promote"
                      onClick={() => void events.promoteSpark!(spark.id)}
                    >
                      Make it a plan
                    </button>
                  ) : null}
                </div>
              ))}
              {projection.adopt1.shelf.starters.length === 0 &&
              projection.adopt1.shelf.sparks.length === 0 ? (
                <p className="c2s-card-line">Nothing on the shelf yet. Ideas you save will live here.</p>
              ) : null}
            </section>
          </>
        ) : null}
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
          <div className="c2s-scrim" data-testid="c2-graphs-drop-sheet" onClick={closeDropSheet}>
            <div className="c2s-sheet" role="dialog" aria-label="Drop this plan" onClick={(e) => e.stopPropagation()}>
              <p className="c2s-sheet-title">Drop this plan?</p>
              {dropError ? (
                <p className="c2s-card-line" role="alert" data-testid="c2-graph-drop-error">
                  {dropError}
                </p>
              ) : null}
              <button
                type="button"
                className="c2s-btn-danger-text"
                data-testid="c2-graph-drop-confirm"
                disabled={dropBusy}
                onClick={() => void confirmDrop()}
              >
                Drop it
              </button>
              <button type="button" className="c2s-btn-text" onClick={closeDropSheet}>
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
  const [convertNote, setConvertNote] = useState<string | null>(null);
  const [convertBusy, setConvertBusy] = useState(false);
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
              {detail.where.kind === "virtual" ? (
                detail.meetingLink ? (
                  <button
                    type="button"
                    className="c2s-btn-primary"
                    data-testid="c2-detail-join"
                    onClick={() =>
                      window.open(detail.meetingLink!, "_blank", "noopener,noreferrer")
                    }
                  >
                    Join online
                  </button>
                ) : (
                  <p className="c2s-card-line" data-testid="c2-detail-join-missing">
                    This plan is online. The meeting link is not set yet — ask the host to
                    add it and Join will show up here.
                  </p>
                )
              ) : events.convertPlan ? (
                <button
                  type="button"
                  className="c2s-btn-text"
                  data-testid="c2-detail-convert"
                  disabled={convertBusy}
                  onClick={() => {
                    if (convertBusy) return;
                    setConvertBusy(true);
                    setConvertNote(null);
                    void events
                      .convertPlan!(detail.id)
                      .then((line) => setConvertNote(line))
                      .finally(() => setConvertBusy(false));
                  }}
                >
                  {convertBusy ? "Moving online…" : "Move this online"}
                </button>
              ) : null}
              {convertNote ? (
                <p className="c2s-card-line" data-testid="c2-detail-convert-note" role="status">
                  {convertNote}
                </p>
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
            </div>
          ) : null}

          {/* Hunt-fix B-13: the chat action renders on its own — it
              used to live inside the nextAction section, which the
              adapter always nulls, so no C2 plan could reach its chat. */}
          <div className="c2s-detail-section">
            <button
              type="button"
              className="c2s-btn-text"
              data-testid="c2-detail-open-chat"
              onClick={() => events.openChatForPlan(detail.id)}
            >
              Open the chat for this plan
            </button>
          </div>

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
