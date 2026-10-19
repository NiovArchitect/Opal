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

/** Deck slot reconciliation (deckfix F1). The derivation's section
 *  caps are Needs you 3 / Coming up 3 / Taking shape 3 (reveal.ex);
 *  the deck honors the same caps for the COMBINED section, reveals
 *  first: a plan reveal takes its section slot by right of the
 *  reveal - it replaces its plan card when that card is in the deck,
 *  and it renders in its section even when the plan is NOT among the
 *  deck's capped card set. The pre-fix deck only ever rendered a
 *  reveal as a replacement for a card already in the set, so a lit
 *  P1 whose plan sat outside the capped cards was silently dropped
 *  (the full pack's F1). A plan claimed by any section's reveal
 *  never also renders as a plain card in another section. */
export const DECK_SECTION_CAP = 3;

type DeckSlot<T> = { kind: "reveal"; item: RevealItem } | { kind: "card"; card: T };

export function deckSlots<T extends { id: string }>(
  cards: T[],
  sectionReveals: RevealItem[],
  claimedPlanIds: ReadonlySet<string>,
  cap: number = DECK_SECTION_CAP,
): DeckSlot<T>[] {
  const slots: DeckSlot<T>[] = sectionReveals.map((item) => ({
    kind: "reveal" as const,
    item,
  }));
  for (const card of cards) {
    if (!claimedPlanIds.has(card.id)) slots.push({ kind: "card", card });
  }
  return slots.slice(0, cap);
}

export type C2CenterOpeningEvents = {
  openGraph: (cardId: string) => void;
  makeSomethingHappen: () => void;
  completeSlot: (cardId: string, slotKind: string) => void;
  /** Optional at integration (C1 chat). Absent = no control renders. */
  openCenterChat?: () => void;
  /** Repair #18 SM / Repair #19 W8 - the Opal's Home doorway: the
   * center character opens Settings at the Soul room ("How Opal
   * works for you" - the first-time-clear doorway copy; Soul and
   * Memory keep their names inside Settings). Absent = no doorway.
   * The event name is internal and stays. */
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
  // DECKFIX F1: reconcile the reveal feed with the deck's slots.
  // Plan reveals are assigned to sections by category, exactly as
  // the derivation caps them (P1 -> Needs you, P4/P2 -> Coming up,
  // P3 -> Taking shape). Every plan reveal claims its plan: the
  // reveal renders in its section whether or not the plan's card
  // was in the deck's capped card set, and a claimed plan never
  // also renders as a plain card in any section.
  const allReveals = projection.reveals ?? [];
  const planReveals = allReveals.filter(
    (r) => r.plan_id && (r.category === "P1" || r.category === "P2" || r.category === "P3" || r.category === "P4"),
  );
  const claimedPlanIds: ReadonlySet<string> = new Set(
    planReveals.map((r) => r.plan_id as string),
  );
  const needsSlots = deckSlots(
    projection.needsYou,
    planReveals.filter((r) => r.category === "P1"),
    claimedPlanIds,
  );
  const comingSlots = deckSlots(
    projection.comingUp,
    planReveals.filter((r) => r.category === "P4" || r.category === "P2"),
    claimedPlanIds,
  );
  const formingSlots = deckSlots(
    projection.forming,
    planReveals.filter((r) => r.category === "P3"),
    claimedPlanIds,
  );
  const hasNamedRevealSection = allReveals.some(
    (r) => r.category === "P7" || r.category === "P5" || r.category === "P6",
  );

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
      {/* Deckfix F3: the deck's rest fold must land in a text-free
          window. At 390x844 the fold is the viewport bottom (844).
          Measured on the served deckfix build (geometry probe, pack
          data, dark): hero 362, Needs-you cards 419-555 (lit),
          575-696, 716-837, Coming-up section top 865 - the fold
          sits in the section gap (card 3 bottom 837, next heading
          865) and the pack's clipped-text probe reads 0 at rest.
          Pre-F1 the deck's different content put a card title at
          833-855 across the fold. The min-height floor pins the
          hero's contribution to that rhythm; an inset scrollport
          was tried and rejected (the probe adjudicates against the
          viewport bottom, so below-port content counted as clipped
          even when nothing was cut). */}
      <section className="c2s-center-rest" style={{ minHeight: 356 }}>
        <OrbGemPattern />
        {events.openSoulMemory ? (
          <button
            type="button"
            data-testid="c2-center-orb-doorway"
            aria-label="How Opal works for you - open your Soul and Memory settings"
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
              How Opal works for you
            </button>
          ) : null}
        </div>
      </section>

      {/* Deck fold (harmony2, residue 2c): the deck's bottom pad is
       * the dock clearance PLUS a breathing step, and the scroll
       * container carries matching scroll-padding (c2shell.css), so
       * the last deck card can always come to rest fully above the
       * floating dock instead of straddling the fold behind it. */}
      {/* Deckfix F3 (scrolled leg): the bottom clearance is the
          dock clearance plus TWO breathing steps. The second step
          also lands the max-scroll top edge past the Taking-shape
          heading (measured: heading bottom 1217 vs top edge 1213
          at one step - the heading probed clipped at full scroll;
          at two steps the edge is 1233 and the scrolled deck
          probes 0, matching the pack's scrolled record). */}
      <div style={{ padding: "0 var(--gutter) calc(var(--dock-clearance) + var(--space-5) + var(--space-5))" }}>
        {needsSlots.length > 0 ? (
          <section data-testid="c2-opening-needs-you">
            <h2 className="c2s-group-title">Needs you</h2>
            <div className="c2s-group-cards">
              {needsSlots.map((slot) =>
                slot.kind === "reveal" ? (
                  <RevealCard
                    key={slot.item.reveal_key}
                    item={slot.item}
                    surface="deck"
                    onDismiss={events.dismissReveal}
                    onAction={events.revealAction}
                  />
                ) : (
                  <PlanCardC2
                    key={slot.card.id}
                    input={slot.card}
                    onOpen={() => events.openGraph(slot.card.id)}
                  />
                ),
              )}
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

        {comingSlots.length > 0 ? (
          <section data-testid="c2-opening-coming-up">
            <h2 className="c2s-group-title">Coming up</h2>
            <div className="c2s-group-cards">
              {comingSlots.map((slot) =>
                slot.kind === "reveal" ? (
                  <RevealCard key={slot.item.reveal_key} item={slot.item} surface="deck" onDismiss={events.dismissReveal} onAction={events.revealAction} />
                ) : (
                  <PlanCardC2 key={slot.card.id} input={slot.card} onOpen={() => events.openGraph(slot.card.id)} />
                ),
              )}
            </div>
          </section>
        ) : null}

        {formingSlots.length > 0 ? (
          <section data-testid="c2-opening-forming">
            <h2 className="c2s-group-title">Taking shape</h2>
            <div className="c2s-group-cards">
              {formingSlots.map((slot) =>
                slot.kind === "reveal" ? (
                  <RevealCard key={slot.item.reveal_key} item={slot.item} surface="deck" onDismiss={events.dismissReveal} onAction={events.revealAction} />
                ) : (
                  <PlanCardC2
                    key={slot.card.id}
                    input={slot.card}
                    onOpen={() => events.openGraph(slot.card.id)}
                    onPrimaryAction={
                      slot.card.completionAction
                        ? () => events.completeSlot(slot.card.id, slot.card.completionAction!.slotKind)
                        : undefined
                    }
                  />
                ),
              )}
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

        {needsSlots.length === 0 &&
        !projection.next &&
        comingSlots.length === 0 &&
        formingSlots.length === 0 &&
        !hasNamedRevealSection ? (
          <p className="c2s-lede" style={{ textAlign: "center", marginTop: "var(--space-5)" }} data-testid="c2-opening-calm">
            Nothing needs you right now. It is all yours.
          </p>
        ) : null}
      </div>
    </div>
  );
}
