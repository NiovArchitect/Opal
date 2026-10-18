/**
 * Repair #18 - Division C2 - the OPENING (Center rest), designed from
 * first principles under the founder escalation of 2026-10-17 23:27
 * PDT: no protected list, creative authority, Opal = relationships
 * and people, speed to alignment.
 *
 * THE IDEA - "the alignment deck". Muse's chat home answers "what
 * can the assistant do". Opal's opening answers three questions in
 * one glance, in this order:
 *   1. Who needs me?      - the Needs-you deck: only plans whose
 *      projection state is ACTION for this viewer. Nothing else is
 *      allowed to ask for attention here. QUIET law made spatial.
 *   2. What is next with my people? - the Next ribbon: the soonest
 *      ready or happening moment as ONE horizontal timeline strip
 *      (time, title, who, where - all finished projection strings).
 *   3. What can I start?  - one warm entry: Make something happen,
 *      opening the same create sheet Graphs uses. One door, everywhere.
 *
 * Below the fold, calm: Coming up (ready cards) and Forming (each
 * with its one completion action on the card). The opening never
 * shows a wall of everything; it shows what matters, in the order
 * it matters. That ordering IS the design - it is the product's
 * speed-to-alignment claim made visible in under two seconds.
 *
 * PRESENCE (new behavioral language, escalation point 2): Loop's
 * expression comes only from the presence signal in the projection
 * (derived from real signals by the one derivation - shellData maps
 * ShellProjection.centerPresence through the core's
 * loopExpressionForPresence). The greeting line is time-aware and
 * factual. When a plan becomes ready with everyone in, the shell -
 * not this surface - may pass the "completed" signal once; the
 * character never celebrates on a timer or on mount.
 *
 * SEAM (flagged for the coordinator): C1 owns Center chat internals.
 * This surface is the Center REST state the dock and onboarding land
 * on; its Talk to Opal entry emits openCenterChat, which at
 * integration mounts C1's chat in this same stage slot. In this
 * branch the entry is rendered only when the host supplies the
 * handler (no handler, no control - no dead controls).
 */
import React from "react";
import { C2PatternLines } from "../C2PatternLines";
import { LoopCharacter } from "../LoopCharacter";
import { loopExpressionForPresence } from "../../brand/c2Identity";
import { PlanCardC2, type PlanCardC2Input } from "../PlanCardC2";

export type CenterOpeningProjection = {
  greeting: string;
  /** One factual line from real data, or null (no line renders). */
  nudgeLine?: string | null;
  presence: "idle" | "listening" | "thinking" | "responding";
  celebrateOnce: boolean;
  /** Action-state cards for this viewer, projection order. */
  needsYou: Array<PlanCardC2Input & { id: string }>;
  /** The soonest ready/happening moment, or null. */
  next: {
    id: string;
    timeLabel: string;
    title: string;
    line: string;
    card: PlanCardC2Input;
  } | null;
  comingUp: Array<PlanCardC2Input & { id: string }>;
  forming: Array<
    PlanCardC2Input & { id: string; completionAction?: { label: string; slotKind: string } | null }
  >;
};

export type C2CenterOpeningEvents = {
  openGraph: (cardId: string) => void;
  makeSomethingHappen: () => void;
  completeSlot: (cardId: string, slotKind: string) => void;
  /** Optional at integration (C1 chat). Absent = no control renders. */
  openCenterChat?: () => void;
};

export function C2CenterOpening({
  projection,
  events,
}: {
  projection: CenterOpeningProjection;
  events: C2CenterOpeningEvents;
}) {
  const expression = loopExpressionForPresence(
    projection.celebrateOnce
      ? "completed"
      : projection.presence === "listening"
        ? "listening"
        : projection.presence === "thinking"
          ? "thinking"
          : "idle",
  );
  return (
    <div className="c2s-scroll" style={{ padding: 0 }} data-testid="c2-center-opening">
      <section className="c2s-center-rest" style={{ minHeight: 340 }}>
        <C2PatternLines convergenceY={70} heightPct={46} />
        <LoopCharacter expression={expression} size={96} hero title="" />
        <h1>{projection.greeting}</h1>
        {projection.nudgeLine ? <p>{projection.nudgeLine}</p> : null}
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            type="button"
            className="c2s-btn-quiet"
            data-testid="c2-opening-create"
            onClick={events.makeSomethingHappen}
            style={{ minHeight: 48, padding: "0 var(--space-5)" }}
          >
            Make something happen
          </button>
          {events.openCenterChat ? (
            <button
              type="button"
              className="c2s-btn-text"
              data-testid="c2-opening-talk"
              onClick={events.openCenterChat}
            >
              Talk to Opal
            </button>
          ) : null}
        </div>
      </section>

      <div style={{ padding: "0 var(--gutter) var(--dock-clearance)" }}>
        {projection.needsYou.length > 0 ? (
          <section data-testid="c2-opening-needs-you">
            <h2 className="c2s-group-title">Needs you</h2>
            <div className="c2s-group-cards">
              {projection.needsYou.map((card) => (
                <PlanCardC2
                  key={card.id}
                  input={card}
                  onOpen={() => events.openGraph(card.id)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {projection.next ? (
          <section data-testid="c2-opening-next">
            <h2 className="c2s-group-title">Next together</h2>
            <button
              type="button"
              className="c2s-card"
              data-testid="c2-opening-next-card"
              onClick={() => events.openGraph(projection.next!.id)}
              style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
            >
              <p className="c2s-card-line" style={{ color: "var(--state-happening-ink)", fontWeight: 650 }}>
                {projection.next.timeLabel}
              </p>
              <p className="c2s-card-title">{projection.next.title}</p>
              <p className="c2s-card-line">{projection.next.line}</p>
            </button>
          </section>
        ) : null}

        {projection.comingUp.length > 0 ? (
          <section data-testid="c2-opening-coming-up">
            <h2 className="c2s-group-title">Coming up</h2>
            <div className="c2s-group-cards">
              {projection.comingUp.slice(0, 3).map((card) => (
                <PlanCardC2 key={card.id} input={card} onOpen={() => events.openGraph(card.id)} />
              ))}
            </div>
          </section>
        ) : null}

        {projection.forming.length > 0 ? (
          <section data-testid="c2-opening-forming">
            <h2 className="c2s-group-title">Taking shape</h2>
            <div className="c2s-group-cards">
              {projection.forming.slice(0, 3).map((card) => (
                <PlanCardC2
                  key={card.id}
                  input={card}
                  onOpen={() => events.openGraph(card.id)}
                  onPrimaryAction={
                    card.completionAction
                      ? () => events.completeSlot(card.id, card.completionAction!.slotKind)
                      : undefined
                  }
                />
              ))}
            </div>
          </section>
        ) : null}

        {projection.needsYou.length === 0 &&
        !projection.next &&
        projection.comingUp.length === 0 &&
        projection.forming.length === 0 ? (
          <p className="c2s-lede" style={{ textAlign: "center", marginTop: "var(--space-5)" }} data-testid="c2-opening-calm">
            Nothing needs you right now. It is all yours.
          </p>
        ) : null}
      </div>
    </div>
  );
}
