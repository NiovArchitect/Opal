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
import { OrbGemPattern, OrbHero } from "../../brand/orb/OrbMark";
import { FireFrame, FireLine } from "../../brand/orb/FireLine";
import { PlanCardC2, type PlanCardC2Input } from "../PlanCardC2";
import type { RevealItem } from "../../api/productClient";
import { RevealCard } from "../../opalUi/c1/RevealCard";

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
  /** DIR-4: reveal items from the ONE backend derivation. Plan
   *  items replace their plan card in the deck's existing slots;
   *  non-plan items (P5/P6/P7) render in their named sections. */
  reveals?: RevealItem[];
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
  /** Repair #18 SM - the Opal's Home doorway, first form: the center
   * character opens the Soul + Memory cards. Absent = no doorway. */
  openSoulMemory?: () => void;
  /** DIR-4: permanent dismissal through the reveals endpoint. */
  dismissReveal?: (item: RevealItem) => void;
  revealAction?: (item: RevealItem) => void;
};

export function C2CenterOpening({
  projection,
  events,
}: {
  projection: CenterOpeningProjection;
  events: C2CenterOpeningEvents;
}) {
  // ORB PRESENCE (Repair #18 Orb System): the Center rest is looking
  // INTO the stone - the master itself sits at the center of the
  // calm field (medallion variant in Light). The orb carries no
  // performed expression; the presence signal stays in the
  // projection for the surfaces that consume it, and the one real
  // celebratory signal (celebrateOnce, derived by the shell from a
  // plan actually becoming ready) lights a single fire line - one
  // lit thing, from a real signal only.
  return (
    <div className="c2s-scroll" style={{ padding: 0 }} data-testid="c2-center-opening">
      <section className="c2s-center-rest" style={{ minHeight: 340 }}>
        <OrbGemPattern />
        {events.openSoulMemory ? (
          <button
            type="button"
            data-testid="c2-center-orb-doorway"
            aria-label="Open Soul + Memory"
            onClick={events.openSoulMemory}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
          >
            <span data-testid="c2-center-orb">
              <OrbHero size={168} title="" />
            </span>
          </button>
        ) : (
          <span data-testid="c2-center-orb">
            <OrbHero size={168} title="" />
          </span>
        )}
        <h1>{projection.greeting}</h1>
        {projection.celebrateOnce ? <FireLine className="orb-fire-line--short" /> : null}
        {projection.nudgeLine ? (
          <FireFrame testId="c2-center-nudge">
            <p style={{ margin: 0, maxWidth: 320 }}>{projection.nudgeLine}</p>
          </FireFrame>
        ) : null}
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
          {events.openSoulMemory ? (
            <button
              type="button"
              className="c2s-btn-text"
              data-testid="c2-opening-soul-memory"
              onClick={events.openSoulMemory}
            >
              Soul + Memory
            </button>
          ) : null}
        </div>
      </section>

      {/* Deck fold (harmony2, residue 2c): the deck's bottom pad is
       * the dock clearance PLUS a breathing step, and the scroll
       * container carries matching scroll-padding (c2shell.css), so
       * the last deck card can always come to rest fully above the
       * floating dock instead of straddling the fold behind it. */}
      <div style={{ padding: "0 var(--gutter) calc(var(--dock-clearance) + var(--space-5))" }}>
        {projection.needsYou.length > 0 ? (
          <section data-testid="c2-opening-needs-you">
            <h2 className="c2s-group-title">Needs you</h2>
            <div className="c2s-group-cards">
              {projection.needsYou.map((card) => {
                const reveal = (projection.reveals ?? []).find((r) => r.plan_id === card.id);
                return reveal ? (
                  <RevealCard
                    key={card.id}
                    item={reveal}
                    surface="deck"
                    onDismiss={events.dismissReveal}
                    onAction={events.revealAction}
                  />
                ) : (
                  <PlanCardC2
                    key={card.id}
                    input={card}
                    onOpen={() => events.openGraph(card.id)}
                  />
                );
              })}
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
              {projection.comingUp.slice(0, 3).map((card) => {
                const reveal = (projection.reveals ?? []).find((r) => r.plan_id === card.id);
                return reveal ? (
                  <RevealCard key={card.id} item={reveal} surface="deck" onDismiss={events.dismissReveal} onAction={events.revealAction} />
                ) : (
                  <PlanCardC2 key={card.id} input={card} onOpen={() => events.openGraph(card.id)} />
                );
              })}
            </div>
          </section>
        ) : null}

        {projection.forming.length > 0 ? (
          <section data-testid="c2-opening-forming">
            <h2 className="c2s-group-title">Taking shape</h2>
            <div className="c2s-group-cards">
              {projection.forming.slice(0, 3).map((card) => {
                const reveal = (projection.reveals ?? []).find((r) => r.plan_id === card.id);
                return reveal ? (
                  <RevealCard key={card.id} item={reveal} surface="deck" onDismiss={events.dismissReveal} onAction={events.revealAction} />
                ) : (
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
                );
              })}
            </div>
          </section>
        ) : null}

        {(projection.reveals ?? []).some((r) => r.category === "P7") ? (
          <section data-testid="reveal-deck-needs-you">
            <h2 className="c2s-group-title">Needs you</h2>
            <div className="c2s-group-cards">
              {(projection.reveals ?? [])
                .filter((r) => r.category === "P7")
                .map((r) => (
                  <RevealCard key={r.reveal_key} item={r} surface="deck" onDismiss={events.dismissReveal} onAction={events.revealAction} />
                ))}
            </div>
          </section>
        ) : null}

        {(projection.reveals ?? []).some((r) => r.category === "P5") ? (
          <section data-testid="reveal-deck-coming-up">
            <h2 className="c2s-group-title">Coming up</h2>
            <div className="c2s-group-cards">
              {(projection.reveals ?? [])
                .filter((r) => r.category === "P5")
                .map((r) => (
                  <RevealCard key={r.reveal_key} item={r} surface="deck" onDismiss={events.dismissReveal} onAction={events.revealAction} />
                ))}
            </div>
          </section>
        ) : null}

        {(projection.reveals ?? []).some((r) => r.category === "P6") ? (
          <section data-testid="reveal-deck-report">
            {(projection.reveals ?? [])
              .filter((r) => r.category === "P6")
              .slice(0, 1)
              .map((r) => (
                <RevealCard key={r.reveal_key} item={r} surface="deck" onDismiss={events.dismissReveal} onAction={events.revealAction} />
              ))}
          </section>
        ) : null}

        {projection.needsYou.length === 0 &&
        !projection.next &&
        projection.comingUp.length === 0 &&
        projection.forming.length === 0 &&
        !(projection.reveals ?? []).some((r) => r.category === "P7" || r.category === "P5" || r.category === "P6") ? (
          <p className="c2s-lede" style={{ textAlign: "center", marginTop: "var(--space-5)" }} data-testid="c2-opening-calm">
            Nothing needs you right now. It is all yours.
          </p>
        ) : null}
      </div>
    </div>
  );
}
