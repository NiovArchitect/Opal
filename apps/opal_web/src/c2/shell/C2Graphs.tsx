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
 * action opens detail on the missing slot, Let it go asks once in a
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
import { pastPillsFromCards, settledSummaryLine, type PastPill, type SpineItem } from "./density";
import { PreparationSpine } from "./PreparationSpine";
import { CardContextMenu, LongPressRegion, type CardMenuItem } from "../CardContextMenu";
import { OrbMarkMono } from "../../brand/orb/OrbMark";

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
  /** Repair #20 (F-13) - a spine task whose real surface is the
   *  plan-scoped Opal chat: the shell scopes the doorway from the
   *  detail (scope person = another participant on the plan) and
   *  lands in Center. Absent = plan-chat spine items render static
   *  (fail-closed: no dead taps). In-detail surfaces (food panel,
   *  check-in row, Where) are handled by the detail itself. */
  openSpineTask?: (detail: GraphDetailProjection, item: SpineItem) => void;
  /** Repair #20 (F-15) - "Do that again" on a settled/past plan:
   *  the shell opens the repeat flow (carried parties + place, new
   *  time chosen in the flow) through the durable graph-create
   *  path. Absent = the menu item does not render. */
  repeatPlan?: (detail: GraphDetailProjection) => void;
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
   *  the surface re-reads; the lock handler verifies the PIN
   *  SERVER-side (this surface never checks a code itself). Absent
   *  handlers = the Private area does not render.
   *  R20 F-4: the gate no longer sets a passcode — PIN set/change
   *  lives in Settings (the Private graphs credential home). The
   *  gate only unlocks: biometrics where the host offers them
   *  (WebAuthn platform authenticator, account preference on AND a
   *  credential registered on this device), PIN pad as fallback. */
  setPlanPrivate?: (cardId: string, isPrivate: boolean) => Promise<void>;
  graphLockPasscodeSet?: boolean | null;
  unlockPrivate?: (code: string) => Promise<boolean>;
  /** R20 F-4: host-computed — true only when biometric unlock is
   *  genuinely offerable here (see vaultBiometric.ts). Absent/false
   *  = no biometric button renders, ever. */
  biometricUnlockAvailable?: boolean;
  unlockWithBiometric?: () => Promise<boolean>;
  /** R20 F-4: with no passcode set, the gate's one quiet way
   *  forward — into the Settings credential home. Absent = the
   *  gate renders its title alone (no dead button). */
  openVaultSettings?: () => void;
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
  const [expandedPill, setExpandedPill] = useState<string | null>(null);
  // R20 F-12: the settled summary expands by intent only.
  const [settledOpen, setSettledOpen] = useState(false);
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
  // Amendment A1: privacy actions live ONLY in the long-press card
  // context menu (and the detail overflow that opens the same menu).
  // No always-visible make-private / make-public control renders on
  // any card or in the vault.
  const [cardMenu, setCardMenu] = useState<{
    id: string;
    title: string;
    isPrivate: boolean;
    droppable: boolean;
    /** R20 F-3: the card's finished state (from the ONE card
     *  projection) - the menu carries it as its accent. */
    stateFamily: string;
    stateLabel: string;
  } | null>(null);

  const cardMenuItems = (menu: NonNullable<typeof cardMenu>): CardMenuItem[] => {
    const items: CardMenuItem[] = [
      {
        id: "open",
        label: "Open graph",
        testId: "c2-graph-menu-open",
        onSelect: () => events.openGraph(menu.id, "graphs"),
      },
    ];
    if (events.setPlanPrivate) {
      items.push({
        id: "privacy",
        label: menu.isPrivate ? "Make public" : "Make private",
        testId: menu.isPrivate ? "c2-graph-make-visible" : "c2-graph-make-private",
        onSelect: () => void events.setPlanPrivate!(menu.id, !menu.isPrivate),
      });
    }
    if (menu.droppable) {
      items.push({
        id: "drop",
        label: "Let it go",
        testId: "c2-graph-menu-drop",
        onSelect: () => setDropTarget(menu.id),
      });
    }
    return items;
  };

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

  // R20 F-4: the gate only VERIFIES — it never sets. A wrong PIN is
  // the server's answer, rendered as one quiet line; the pad clears.
  const tryUnlockPrivate = async () => {
    if (privateGateBusy || privateCode.length < 4) return;
    setPrivateGateBusy(true);
    setPrivateGateError(null);
    const ok = await events.unlockPrivate!(privateCode);
    setPrivateGateBusy(false);
    setPrivateCode("");
    if (ok) {
      setPrivateUnlocked(true);
    } else {
      setPrivateGateError("That PIN did not open it.");
    }
  };

  const tryBiometricUnlock = async () => {
    if (privateGateBusy || !events.unlockWithBiometric) return;
    setPrivateGateBusy(true);
    setPrivateGateError(null);
    const ok = await events.unlockWithBiometric();
    setPrivateGateBusy(false);
    if (ok) {
      setPrivateUnlocked(true);
    } else {
      setPrivateGateError("Biometrics did not open it. Use your PIN.");
    }
  };

  const pressPinKey = (key: string) => {
    if (privateGateBusy) return;
    setPrivateGateError(null);
    if (key === "back") {
      setPrivateCode((code) => code.slice(0, -1));
    } else if (key === "clear") {
      setPrivateCode("");
    } else if (/^\d$/.test(key)) {
      setPrivateCode((code) => (code.length >= 32 ? code : code + key));
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

  // Polish P11: past is pills, never a rows group. The projection
  // carries them (pastPills); a projection built elsewhere that
  // still carries a past GROUP is collapsed by the same derivation
  // (density.ts) - undated, so it lands in one honest "Earlier" pill.
  const pastGroup = projection.groups.find((g) => g.kind === "past");
  const pastPills: PastPill[] =
    projection.pastPills ?? (pastGroup ? pastPillsFromCards(pastGroup.cards, new Date()) : []);
  const settledInvitations = projection.settledInvitations ?? [];
  const renderGroups = visibleGroups.filter((g) => g.kind !== "past");
  const totalCards =
    projection.groups.reduce((n, g) => n + g.cards.length, 0) +
    pastPills.reduce((n, p) => n + p.count, 0) +
    // R20 F-12: settled outcomes are real past content - a graph
    // whose only past is settled must not paint as empty.
    settledInvitations.length;

  const renderPastPills = () => (
    <div data-testid="c2-graphs-past-pills">
      {pastPills.map((pill) => (
        <div key={pill.id}>
          <button
            type="button"
            className="c2s-btn-text"
            data-testid="c2-past-pill"
            data-pill-period={pill.periodLabel}
            aria-expanded={expandedPill === pill.id}
            onClick={() => setExpandedPill(expandedPill === pill.id ? null : pill.id)}
            style={{ width: "100%", textAlign: "left" }}
          >
            {pill.periodLabel} - {pill.count} {pill.count === 1 ? "plan" : "plans"}
            {pill.highlights.length > 0 ? ` - ${pill.highlights.join(", ")}` : ""}
          </button>
          {expandedPill === pill.id ? (
            // R20 F-11: expansion by intent reveals individual plan
            // CARDS - each with its state color and its own reason to
            // exist - never one-line ledger text rows.
            <div data-testid="c2-past-pill-expanded" className="c2s-group-cards">
              {pill.cards.map((card) => (
                <div key={card.id} data-testid="c2-past-card">
                  <PlanCardC2
                    input={card}
                    onOpen={() => events.openGraph(card.id, "graphs")}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ))}
      {settledInvitations.length > 0 ? (
        // R20 F-12: settled outcomes converge into ONE quiet summary
        // line for the whole set - never a repeated standalone row
        // per plan. Expanding by intent reveals the plans' own cards;
        // each plan's settled line lives in its detail.
        <div data-testid="c2-settled-summary-wrap">
          <button
            type="button"
            className="c2s-btn-text"
            data-testid="c2-settled-summary"
            aria-expanded={settledOpen}
            onClick={() => setSettledOpen((v) => !v)}
            style={{ width: "100%", textAlign: "left" }}
          >
            {settledSummaryLine(settledInvitations)}
          </button>
          {settledOpen ? (
            <div data-testid="c2-settled-expanded" className="c2s-group-cards">
              {settledInvitations.map((item) =>
                item.card ? (
                  <div key={item.id} data-testid="c2-settled-card">
                    <PlanCardC2
                      input={item.card}
                      onOpen={() => events.openGraph(item.id, "graphs")}
                    />
                  </div>
                ) : (
                  <div key={item.id} data-testid="c2-settled-card">
                    <PlanCardC2
                      input={{
                        stateFamily: "past",
                        stateLabel: "Settled",
                        title: item.title,
                        whenLine: "",
                      }}
                      onOpen={() => events.openGraph(item.id, "graphs")}
                    />
                  </div>
                ),
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );

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
        ) : renderGroups.length === 0 &&
          lens !== "past" &&
          pastPills.length === 0 &&
          settledInvitations.length === 0 ? (
          <EmptyBlock
            testId="c2-graphs-lens-empty"
            headline="Nothing coming up."
            line="Past plans are below when you want them."
          />
        ) : (
          <>
            {lens === "past" ? (
              <div data-testid="c2-graphs-past-view">
                <h2 className="c2s-group-title">
                  <span className="c2s-orbit-ring" aria-hidden />
                  Completed and past plans
                </h2>
                <p className="c2s-card-line">
                  Everything that already happened, in the order it settled.
                </p>
                {pastPills.length === 0 && settledInvitations.length === 0 ? (
                  <p className="c2s-card-line" data-testid="c2-graphs-past-empty">
                    Nothing completed yet.
                  </p>
                ) : (
                  renderPastPills()
                )}
              </div>
            ) : null}
            {lens !== "past"
              ? renderGroups.map((group) => {
            if (group.kind === "horizon") {
              // P12 far field, R20 F-11: the founder ordered the
              // horizon out of text-row form - each far plan is now
              // an individual purposeful CARD with its state color,
              // still at distant presence (it never competes with
              // tonight: the presence weight rides the wrapper).
              return (
                <section key={group.id} data-testid="c2-graphs-horizon">
                  <h2 className="c2s-group-title">
                    <span className="c2s-orbit-ring" aria-hidden />
                    {group.title}
                  </h2>
                  <div className="c2s-group-cards">
                    {group.cards.map((card) => (
                      <div
                        key={card.id}
                        data-testid="c2-horizon-card"
                        data-presence-weight={card.presence?.weightClass ?? "distant"}
                        style={{ opacity: 0.85 }}
                      >
                        <PlanCardC2
                          input={card}
                          onOpen={() => events.openGraph(card.id, "graphs")}
                        />
                      </div>
                    ))}
                  </div>
                </section>
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
                    <div key={card.id} className="c2s-thread-row" data-presence-weight={card.presence?.weightClass ?? undefined}>
                      <span
                        className="c2s-thread-node"
                        data-plan-state={card.stateFamily}
                        aria-hidden
                      />
                      <LongPressRegion
                        className="c2s-thread-card"
                        enabled={Boolean(events.setPlanPrivate)}
                        onLongPress={() =>
                          setCardMenu({
                            id: card.id,
                            title: card.title,
                            isPrivate: false,
                            droppable: Boolean(card.droppable),
                            stateFamily: card.stateFamily,
                            stateLabel: card.stateLabel,
                          })
                        }
                      >
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
                            Let it go
                          </button>
                        </div>
                      ) : null}
                      </LongPressRegion>
                    </div>
                  ))}
                </div>
              </section>
            );
              })
              : null}
            {lens === "all" && (pastPills.length > 0 || settledInvitations.length > 0) ? (
              <section data-testid="c2-graphs-past-section">
                <h2 className="c2s-group-title">
                  <span className="c2s-orbit-ring" aria-hidden />
                  Past
                </h2>
                {renderPastPills()}
              </section>
            ) : null}
          </>
        )}

        {events.unlockPrivate ? (
          <section
            data-testid="c2-graphs-private"
            className="c2s-vault"
            data-vault-state={privateUnlocked ? "open" : "gated"}
          >
            {/* R20 F-4 + orbit/ring design compass: the vault's one
                brand glyph - the orb mark, one quiet ringed stone
                beside the plain title. Glyph only, never copy; the
                gate stays near-silent. */}
            <h2 className="c2s-group-title">
              <span className="c2s-vault-mark" data-testid="c2-vault-mark" aria-hidden>
                <OrbMarkMono size={15} />
              </span>
              Private graphs
            </h2>
            {!privateUnlocked ? (
              <div className="c2s-vault-gate" data-testid="c2-vault-gate">
                {events.graphLockPasscodeSet === false ? (
                  events.openVaultSettings ? (
                    <button
                      type="button"
                      className="c2s-btn-text"
                      data-testid="c2-private-set-passcode"
                      onClick={events.openVaultSettings}
                    >
                      Set a passcode in Settings
                    </button>
                  ) : null
                ) : (
                  <>
                    {events.biometricUnlockAvailable && events.unlockWithBiometric ? (
                      <button
                        type="button"
                        className="c2s-btn-primary c2s-vault-biometric"
                        data-testid="c2-private-biometric"
                        disabled={privateGateBusy}
                        onClick={() => void tryBiometricUnlock()}
                      >
                        Unlock with biometrics
                      </button>
                    ) : null}
                    <div
                      className="c2s-pinpad"
                      role="group"
                      aria-label="Private graphs PIN"
                      data-testid="c2-private-pinpad"
                    >
                      <div
                        className="c2s-pin-dots"
                        data-testid="c2-private-code"
                        data-pin-length={privateCode.length}
                        aria-label={
                          privateCode.length === 0
                            ? "No PIN entered"
                            : `${privateCode.length} PIN digits entered`
                        }
                      >
                        {Array.from({ length: Math.max(privateCode.length, 4) }, (_, i) => (
                          <span
                            key={i}
                            className="c2s-pin-dot"
                            data-filled={i < privateCode.length ? "1" : undefined}
                          />
                        ))}
                      </div>
                      <div className="c2s-pin-keys">
                        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"].map(
                          (key) => (
                            <button
                              key={key}
                              type="button"
                              className="c2s-pin-key"
                              data-testid={`c2-pin-key-${key}`}
                              aria-label={
                                key === "back"
                                  ? "Delete last digit"
                                  : key === "clear"
                                    ? "Clear PIN"
                                    : `PIN digit ${key}`
                              }
                              disabled={privateGateBusy}
                              onClick={() => pressPinKey(key)}
                            >
                              {key === "back" ? "⌫" : key === "clear" ? "C" : key}
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                    {privateGateError ? (
                      <p className="c2s-card-line" role="alert" data-testid="c2-private-error">
                        {privateGateError}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      className="c2s-btn-primary"
                      data-testid="c2-private-unlock"
                      disabled={privateGateBusy || privateCode.length < 4}
                      onClick={() => void tryUnlockPrivate()}
                    >
                      Open Private graphs
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="c2s-group-cards c2s-vault-open" data-testid="c2-vault-open">
                {projection.privateCards.length === 0 ? (
                  <p className="c2s-card-line" data-testid="c2-private-empty">
                    No private graphs yet.
                  </p>
                ) : (
                  projection.privateCards.map((card) => (
                    <LongPressRegion
                      key={card.id}
                      enabled={Boolean(events.setPlanPrivate)}
                      onLongPress={() =>
                        setCardMenu({
                          id: card.id,
                          title: card.title,
                          isPrivate: true,
                          droppable: Boolean(card.droppable),
                          stateFamily: card.stateFamily,
                          stateLabel: card.stateLabel,
                        })
                      }
                    >
                      <PlanCardC2
                        input={card}
                        onOpen={() => events.openGraph(card.id, "graphs")}
                      />
                    </LongPressRegion>
                  ))
                )}
                <button
                  type="button"
                  className="c2s-btn-text"
                  data-testid="c2-private-lock"
                  onClick={() => setPrivateUnlocked(false)}
                >
                  Close Private graphs
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
                const planOptions = [
                  ...projection.groups.flatMap((g) => g.cards),
                  ...(projection.pastPills ?? []).flatMap((p) => p.cards),
                ];
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

      {cardMenu ? (
        <CardContextMenu
          title={cardMenu.title}
          items={cardMenuItems(cardMenu)}
          onClose={() => setCardMenu(null)}
          stateFamily={cardMenu.stateFamily}
          stateLabel={cardMenu.stateLabel}
        />
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
                Let it go
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
  // Amendment A1: the detail's privacy action lives in the overflow
  // menu (opened by this section's More actions button, or by
  // long-pressing the detail's plan card) - never an always-visible row.
  const [detailMenuOpen, setDetailMenuOpen] = useState(false);
  const [convertNote, setConvertNote] = useState<string | null>(null);
  const [convertBusy, setConvertBusy] = useState(false);
  const foodStep = completionStep(
    detail.completion as Parameters<typeof completionStep>[0],
    "food",
  );
  // Repair #20 (F-13): a spine item opens its stamped surface.
  // In-detail surfaces scroll to the section that already renders
  // them on this detail; the plan-chat surface is the shell's
  // doorway. When the shell wires no doorway, plan-chat items lose
  // their action HERE (fail-closed) rather than rendering a tap
  // that opens nothing.
  const spineForView = events.openSpineTask
    ? detail.spine
    : detail.spine?.map((item) =>
        item.action?.kind === "plan-chat" ? { ...item, action: null } : item,
      );
  const scrollToDetailSection = (testId: string) => {
    document
      .querySelector(`[data-testid="${testId}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const onSpineAction = (item: SpineItem) => {
    switch (item.action?.kind) {
      case "food-panel":
        scrollToDetailSection("c2-detail-food");
        break;
      case "checkin":
        scrollToDetailSection("c2-detail-checkin");
        break;
      case "where":
        scrollToDetailSection("c2-detail-where");
        break;
      case "plan-chat":
        events.openSpineTask?.(detail, item);
        break;
      default:
        break;
    }
  };
  // Repair #20 (F-15): the repeat affordance lives in this same
  // overflow menu (Amendment A1: intent actions live in the menu,
  // never as standing buttons) and renders only for a settled/past
  // plan with the shell's repeat flow wired.
  const canRepeat = Boolean(detail.repeatable && events.repeatPlan);
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
            <LongPressRegion
              enabled={Boolean(events.setPlanPrivate)}
              onLongPress={() => setDetailMenuOpen(true)}
            >
              <PlanCardC2 input={detail.card} />
            </LongPressRegion>
            {detail.attendanceLine ? (
              <p className="c2s-card-line" data-testid="c2-detail-attendance" style={{ marginTop: 8 }}>
                {detail.attendanceLine}
              </p>
            ) : null}
          </div>

          {/* R20 F-12: the settled line lives HERE - in the settled
              plan's own detail, reached by intent - and nowhere in
              any list surface. */}
          {detail.settledLine ? (
            <div className="c2s-detail-section">
              <p className="c2s-detail-kicker">Settled</p>
              <p className="c2s-card-line" data-testid="c2-detail-settled-line">
                {detail.settledLine}
              </p>
            </div>
          ) : null}

          {spineForView && spineForView.length > 0 ? (
            <div className="c2s-detail-section">
              <PreparationSpine spine={spineForView} onAction={onSpineAction} />
            </div>
          ) : null}

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
            <div className="c2s-detail-section" data-testid="c2-detail-where">
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

          {events.setPlanPrivate || canRepeat ? (
            <div className="c2s-detail-section">
              <button
                type="button"
                className="c2s-btn-text"
                data-testid="c2-detail-overflow"
                aria-haspopup="menu"
                onClick={() => setDetailMenuOpen(true)}
              >
                More actions
              </button>
              {detail.isPrivate ? (
                <p className="c2s-card-line">
                  This graph is in your Private graphs. On your surfaces it
                  shows only inside that space - everyone else on the plan
                  keeps their own view of it.
                </p>
              ) : null}
              {detailMenuOpen ? (
                <CardContextMenu
                  title={detail.title}
                  items={[
                    ...(events.setPlanPrivate
                      ? [
                          {
                            id: "privacy",
                            label: detail.isPrivate ? "Make public" : "Make private",
                            testId: "c2-detail-private-toggle",
                            onSelect: () =>
                              void events.setPlanPrivate!(detail.id, !detail.isPrivate),
                          },
                        ]
                      : []),
                    ...(canRepeat
                      ? [
                          {
                            id: "repeat",
                            label: "Do that again",
                            testId: "c2-detail-repeat",
                            onSelect: () => events.repeatPlan!(detail),
                          },
                        ]
                      : []),
                  ]}
                  onClose={() => setDetailMenuOpen(false)}
                  stateFamily={detail.card.stateFamily}
                  stateLabel={detail.card.stateLabel}
                />
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
