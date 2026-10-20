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
import React, { useEffect, useMemo, useState } from "react";
import { TopLayer } from "../../opalUi/TopLayer";
import { PlanCardC2 } from "../PlanCardC2";
import { completionStep, FoodStepPanel } from "../../opalUi/FoodStepPanel";
import { CheckinCircleRow } from "../../opalUi/CheckinCircleRow";
import type { GraphDetailProjection, GraphListProjection } from "./projections";
import { PLAN_STATE_HEX } from "../../theme/planStateColors";
import { SharePlanSheet } from "./EventShareCard";
import { shareCardFromDetail } from "./shellData";
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
  /** R19 W7 — private graphs. setPlanPrivate runs the real API and
   *  the surface re-reads; the lock handlers verify/set the passcode
   *  SERVER-side (this surface never checks a code itself). Absent
   *  handlers = the Private area does not render. */
  setPlanPrivate?: (cardId: string, isPrivate: boolean) => Promise<void>;
  graphLockPasscodeSet?: boolean | null;
  unlockPrivate?: (code: string) => Promise<boolean>;
  setPrivatePasscode?: (code: string) => Promise<boolean>;
  /** R19 W7 — living detail: share/stop MY location for this plan.
   *  Each resolves the plain-language status line to show. */
  shareMyLocation?: (cardId: string) => Promise<string>;
  stopMyLocation?: (cardId: string) => Promise<string>;
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
  // R19 W7 - Private area gate state. `unlocked` lives only in this
  // surface's memory: leaving the surface (unmount) or the app going
  // to the background relocks it. The code itself is never kept -
  // it is handed to the server verify call and dropped.
  const [privateUnlocked, setPrivateUnlocked] = useState(false);
  const [privateCode, setPrivateCode] = useState("");
  const [privateGateError, setPrivateGateError] = useState<string | null>(null);
  const [privateGateBusy, setPrivateGateBusy] = useState(false);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) setPrivateUnlocked(false);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      setPrivateUnlocked(false);
    };
  }, []);

  const tryUnlockPrivate = async () => {
    if (privateGateBusy || !privateCode.trim()) return;
    setPrivateGateBusy(true);
    setPrivateGateError(null);
    const setting = events.graphLockPasscodeSet === false;
    const ok = setting
      ? await events.setPrivatePasscode!(privateCode.trim())
      : await events.unlockPrivate!(privateCode.trim());
    setPrivateGateBusy(false);
    setPrivateCode("");
    if (ok) {
      setPrivateUnlocked(true);
    } else {
      setPrivateGateError(
        setting
          ? "That passcode could not be set. Use at least 4 characters."
          : "That code did not open it.",
      );
    }
  };

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
        ) : totalCards === 0 && projection.privateCards.length === 0 ? (
          <EmptyBlock
            testId="c2-graphs-empty"
            headline="Nothing here yet."
            line="Your plans will live here."
            actionLabel="New plan"
            onAction={() => setCreateOpen(true)}
          />
        ) : visibleGroups.length === 0 && lens !== "past" ? (
          <EmptyBlock
            testId="c2-graphs-lens-empty"
            headline="Nothing coming up."
            line="Past plans are below when you want them."
          />
        ) : (
          <>
            {lens === "past" ? (
              <div data-testid="c2-graphs-past-view">
                <h2 className="c2s-group-title">Completed and past plans</h2>
                <p className="c2s-card-line">
                  Everything that already happened, in the order it settled.
                </p>
                {visibleGroups.length === 0 ? (
                  <p className="c2s-card-line" data-testid="c2-graphs-past-empty">
                    Nothing completed yet.
                  </p>
                ) : null}
              </div>
            ) : null}
            {visibleGroups.map((group) => {
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
                {/* R19 W7 - the future thread: one line running
                    forward through the group, a node per plan in
                    its state color. The thread is the graph: nodes
                    carry state (the color IS the plan's state), the
                    line carries sequence. */}
                <div className="c2s-thread" data-testid="c2-graphs-thread">
                  {group.cards.map((card) => (
                    <div key={card.id} className="c2s-thread-row">
                      <span
                        className="c2s-thread-node"
                        data-plan-state={card.stateFamily}
                        aria-hidden
                      />
                      <div className="c2s-thread-card">
                      <PlanCardC2
                        input={card}
                        onOpen={() => events.openGraph(card.id, "graphs")}
                        onPrimaryAction={
                          card.completionAction
                            ? () => events.completeSlot(card.id, card.completionAction!.slotKind)
                            : undefined
                        }
                      />
                      {card.droppable || events.setPlanPrivate ? (
                        <div className="c2s-completion-row">
                          {card.droppable ? (
                            <button
                              type="button"
                              className="c2s-btn-text"
                              data-testid="c2-graph-drop"
                              onClick={() => setDropTarget(card.id)}
                            >
                              Drop it
                            </button>
                          ) : null}
                          {events.setPlanPrivate ? (
                            <button
                              type="button"
                              className="c2s-btn-text"
                              data-testid="c2-graph-make-private"
                              onClick={() => void events.setPlanPrivate!(card.id, true)}
                            >
                              Make private
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
            })}
          </>
        )}

        {events.unlockPrivate && events.setPrivatePasscode ? (
          <section data-testid="c2-graphs-private">
            <h2 className="c2s-group-title">Private graphs</h2>
            {!privateUnlocked ? (
              <div className="c2s-group-cards">
                <p className="c2s-card-line">
                  {projection.privateCards.length > 0
                    ? `${projection.privateCards.length} ${projection.privateCards.length === 1 ? "graph is" : "graphs are"} kept here, out of your other lists.`
                    : "Graphs you make private live here, out of your other lists."}
                </p>
                <p className="c2s-card-line">
                  {events.graphLockPasscodeSet === false
                    ? "Set a passcode to open this area. It is checked by Opal's server - the code itself is never stored."
                    : "Enter your passcode to open this area."}
                </p>
                <input
                  className="c2s-field"
                  type="password"
                  data-testid="c2-private-code"
                  aria-label="Private graphs passcode"
                  autoComplete="off"
                  value={privateCode}
                  onChange={(e) => setPrivateCode(e.target.value)}
                />
                {privateGateError ? (
                  <p className="c2s-card-line" role="alert" data-testid="c2-private-error">
                    {privateGateError}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="c2s-btn-primary"
                  data-testid="c2-private-unlock"
                  disabled={privateGateBusy || !privateCode.trim()}
                  onClick={() => void tryUnlockPrivate()}
                >
                  {events.graphLockPasscodeSet === false ? "Set passcode and open" : "Open private graphs"}
                </button>
              </div>
            ) : (
              <div className="c2s-group-cards">
                {projection.privateCards.length === 0 ? (
                  <p className="c2s-card-line" data-testid="c2-private-empty">
                    No private graphs yet. Make any graph private and it moves here.
                  </p>
                ) : (
                  projection.privateCards.map((card) => (
                    <div key={card.id}>
                      <PlanCardC2
                        input={card}
                        onOpen={() => events.openGraph(card.id, "graphs")}
                      />
                      <div className="c2s-completion-row">
                        <button
                          type="button"
                          className="c2s-btn-text"
                          data-testid="c2-graph-make-visible"
                          onClick={() => void events.setPlanPrivate!(card.id, false)}
                        >
                          Make visible
                        </button>
                      </div>
                    </div>
                  ))
                )}
                <button
                  type="button"
                  className="c2s-btn-text"
                  data-testid="c2-private-lock"
                  onClick={() => setPrivateUnlocked(false)}
                >
                  Lock private graphs
                </button>
              </div>
            )}
          </section>
        ) : null}

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
  const [shareNote, setShareNote] = useState<string | null>(null);
  const shareMine = async () => {
    if (!events.shareMyLocation) return;
    setShareNote(await events.shareMyLocation(detail.id));
  };
  const stopMine = async () => {
    if (!events.stopMyLocation) return;
    setShareNote(await events.stopMyLocation(detail.id));
  };
  const [shareOpen, setShareOpen] = useState(false);
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
          <button
            type="button"
            className="c2s-btn-text"
            data-testid="r19-detail-share"
            onClick={() => setShareOpen(true)}
            style={{ marginLeft: "auto" }}
          >
            Share
          </button>
        </header>
        <div style={{ paddingBottom: "var(--space-7)" }}>
          {shareOpen ? (
            <SharePlanSheet card={shareCardFromDetail(detail)} onClose={() => setShareOpen(false)} />
          ) : null}
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

          {/* Cluster G (P10c) - leave-by: the backend's ONE
              derivation, rendered verbatim. The spoken-style line
              is the pattern (see the wave report for the novelty
              comparison): it says the time in words, and at the
              leave-now threshold the backend's urgency flips the
              line to "Leave now..." AND this treatment escalates
              to the existing action color - words and color move
              together, never color alone. Absent states render
              their finished honest line (e.g. "Share your location
              to see when to leave") with no numbers, ever. Virtual
              plans carry "not_applicable" and render nothing. */}
          {detail.leaveBy && detail.leaveBy.state !== "not_applicable" ? (
            <div
              className="c2s-detail-section"
              data-testid="c2-detail-leaveby"
              data-leave-by-state={detail.leaveBy.state}
              data-urgency={detail.leaveBy.urgency ?? undefined}
            >
              <p className="c2s-detail-kicker">When to leave</p>
              <p
                className="c2s-card-title"
                style={{
                  fontSize: 17,
                  ...(detail.leaveBy.urgency === "leave_now"
                    ? { color: PLAN_STATE_HEX.action }
                    : {}),
                }}
                data-testid="c2-detail-leaveby-line"
              >
                {detail.leaveBy.label}
              </p>
              {detail.leaveBy.state === "ok" ? (
                <p className="c2s-card-line" data-testid="c2-detail-leaveby-meta">
                  {detail.leaveBy.travel_duration_label} drive
                  {detail.leaveBy.travel_distance_label
                    ? ` - ${detail.leaveBy.travel_distance_label}`
                    : ""}
                  {detail.leaveBy.traffic_label ? ` - ${detail.leaveBy.traffic_label}` : ""}
                </p>
              ) : null}
            </div>
          ) : null}

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
              <p className="c2s-detail-kicker">Who is coming, and where they are</p>
              {detail.who.map((person) => (
                <div className="c2s-who-row" key={person.name}>
                  <Avatar avatar={person.avatar} size={36} />
                  <span className="c2s-who-name">
                    {person.name}
                    {person.relationshipLabel ? (
                      <span className="c2s-who-tie" data-testid="c2-detail-who-tie">
                        {` · ${person.relationshipLabel}`}
                      </span>
                    ) : null}
                  </span>
                  <span className="c2s-who-resp">
                    {person.responseLabel}
                    {person.locationLabel ? (
                      <span className="c2s-who-loc" data-testid="c2-detail-who-location">
                        {" · "}
                        {person.locationLabel}
                      </span>
                    ) : null}
                  </span>
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
              {events.shareMyLocation ? (
                <div data-testid="c2-detail-share-location">
                  <p className="c2s-card-line">
                    Sharing your location is per plan and shares where you are right
                    now, once — a snapshot, not live tracking. Only people on this
                    plan see it, until you stop sharing or 4 hours pass.
                  </p>
                  <button
                    type="button"
                    className="c2s-btn-text"
                    data-testid="c2-detail-share-location-btn"
                    onClick={() => void shareMine()}
                  >
                    Share my location for this plan
                  </button>
                  {events.stopMyLocation ? (
                    <button
                      type="button"
                      className="c2s-btn-text"
                      data-testid="c2-detail-stop-location-btn"
                      onClick={() => void stopMine()}
                    >
                      Stop sharing
                    </button>
                  ) : null}
                  {shareNote ? (
                    <p className="c2s-card-line" role="status" data-testid="c2-detail-share-note">
                      {shareNote}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {events.setPlanPrivate ? (
            <div className="c2s-detail-section">
              <button
                type="button"
                className="c2s-btn-text"
                data-testid="c2-detail-private-toggle"
                onClick={() => void events.setPlanPrivate!(detail.id, !detail.isPrivate)}
              >
                {detail.isPrivate ? "Make this graph visible" : "Make this graph private"}
              </button>
              {detail.isPrivate ? (
                <p className="c2s-card-line">
                  Private: this graph lives in your Private area and is not in anyone
                  else's plan list.
                </p>
              ) : null}
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
