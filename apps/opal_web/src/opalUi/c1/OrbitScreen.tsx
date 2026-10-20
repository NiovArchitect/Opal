/**
 * Repair #20 (F-19) — THE ORBIT SCREEN. The room behind the thread's
 * Opal doorway: the founder's ring language made personal.
 *
 * Composition (brief, point by point):
 * (1) THE RING OF PEOPLE — the thread's people as points of light
 *     on a ring (one light for a 1:1 anchor; EVERY party member for
 *     a group), the viewer at the center stone. The thread's plans
 *     ride the same ring as stones in their state color (canon:
 *     action #FF4D5E, ready #FFC86B, forming #8B5CF6, happening
 *     #00E5FF, past white). A person whose answer is pending wears
 *     the dashed pending pattern; a person in etiquette limbo wears
 *     the cooling amber (never red). Every light names its person
 *     in text beside it — the ring is legible before a word of the
 *     conversation is read, and no light is decoration: each one is
 *     a party member or a plan from the orbit projection.
 * (2) THE CONVERSATION INSIDE THE FIELD — the scoped Opal
 *     conversation (the host's CenterChat, reused as-is) lives
 *     beneath the ring inside the orbit field, under the purpose
 *     line "Ask about this conversation." Opal's read of the
 *     thread appears as ONE quiet insight above the field — the
 *     thread's one lit reveal, never a feed.
 * (3) THE LONG ARC — under the ring: what's next (the next
 *     together fact, open windows, limbo states — all finished
 *     projection lines) and the index of past Opal conversations
 *     in this orbit. The doorway back to the thread is one tap in
 *     the header. Thread = the moment; orbit = the arc.
 * (4) MOTION + QUIET — the ring ASSEMBLES on entry (lights settle
 *     onto the ring, one-shot, staggered) and is then still; the
 *     only other motion is the limbo cooling arc's fraction, which
 *     is a static fraction read, not an animation. Reduced motion:
 *     the identical static ring — same positions, same patterns,
 *     same words (AR-00.6 parity).
 * (5) FUTURE TENANTS — the composition leaves headroom below the
 *     arc; nothing is rendered for them. No placeholder doorways.
 *
 * This component renders the orbit projection it is handed. It
 * derives no state: party pending/limbo, plan states, and the
 * next-together line all arrive finished from the backend orbit
 * projection (OrbitProjectionContract) via the host.
 */
import React, { useState } from "react";
import type { OrbitProjectionContract } from "../../api/productClient";
import type { OrbitScope, PersonOpalSessionRow } from "./opalChatScope";
import "./OrbitScreen.css";

const STATE_WORD: Record<string, string> = {
  action: "Action needed",
  ready: "Ready",
  forming: "Forming",
  happening: "Happening now",
  past: "Past",
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
}

/** Ring geometry: pure presentation placement (evenly spaced
 *  starting at the top). Carries no state meaning. */
function ringPoint(index: number, total: number, radius: number, cx: number, cy: number) {
  const angle = (Math.PI * 2 * index) / Math.max(total, 1) - Math.PI / 2;
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

export function OrbitScreen({
  scope,
  orbit,
  insight,
  sessions,
  activeSessionId,
  onOpenSession,
  onStartNew,
  onOpenPlan,
  onBackToThread,
  emptyInvite,
  children,
}: {
  scope: OrbitScope;
  /** The live orbit projection (parties + plans); the scope's
   *  doorway-time party is the fallback when it has not landed. */
  orbit: OrbitProjectionContract | null;
  /** Opal's ONE read of this thread (the lit reveal's line). */
  insight?: string | null;
  /** Past Opal conversations in this orbit (the index). */
  sessions: PersonOpalSessionRow[];
  activeSessionId?: string | null;
  onOpenSession: (sessionId: string) => void;
  onStartNew: () => void;
  onOpenPlan?: (planId: string) => void;
  /** The one-tap doorway back to the thread itself. */
  onBackToThread: () => void;
  /** The empty orbit's first-question invite (no session yet). */
  emptyInvite?: { onAsk: (text: string) => void } | null;
  /** The scoped Opal conversation, when one is open in this orbit. */
  children?: React.ReactNode;
}) {
  const [draft, setDraft] = useState("");
  const parties = orbit
    ? orbit.parties.map((p) => ({
        id: p.user_id,
        name: p.display_name,
        tint: p.entity_tint ?? null,
        isViewer: p.is_viewer,
        pending: p.pending,
        limbo: p.limbo,
        limboFractionRemaining: p.limbo_fraction_remaining ?? null,
      }))
    : scope.party;
  const ringPeople = parties.filter((p) => !p.isViewer);
  const viewer = parties.find((p) => p.isViewer) ?? null;
  const plans = orbit?.plans ?? [];
  const nextPlan = orbit?.next_plan ?? null;
  // Ring order: people and plan stones alternate around the ring,
  // starting with a person at the top — presentation placement
  // only; the legend below names every light in words.
  const ringItems: Array<
    | { kind: "person"; person: (typeof ringPeople)[number] }
    | { kind: "plan"; plan: (typeof plans)[number] }
  > = [];
  {
    const max = Math.max(ringPeople.length, plans.length);
    for (let i = 0; i < max; i += 1) {
      if (ringPeople[i]) ringItems.push({ kind: "person", person: ringPeople[i] });
      if (plans[i]) ringItems.push({ kind: "plan", plan: plans[i] });
    }
  }
  const CX = 130;
  const CY = 130;
  const R = 102;

  const nextLine = nextPlan
    ? [nextPlan.title, nextPlan.when_label ?? "Time not set yet.", nextPlan.where_label]
        .filter(Boolean)
        .join(" - ")
    : null;
  const limboParties = parties.filter((p) => p.limbo && !p.isViewer);
  const pendingParties = parties.filter((p) => p.pending && !p.limbo && !p.isViewer);
  const viewerPending = viewer?.pending === true;

  return (
    <div className="orbit-screen" data-testid="orbit-screen" data-composition={scope.composition}>
      <header className="orbit-screen-head">
        <button
          type="button"
          className="orbit-screen-back"
          data-testid="orbit-back-to-thread"
          onClick={onBackToThread}
        >
          {scope.composition === "group"
            ? "Back to the group chat"
            : `Back to your chat with ${scope.personName ?? scope.title}`}
        </button>
        <p className="orbit-screen-title" data-testid="orbit-screen-title">
          {scope.title}
          <span className="orbit-screen-title-sub">
            {scope.composition === "group" ? " — everyone's orbit" : " — orbit"}
          </span>
        </p>
      </header>

      <div className="orbit-top">
      <div className="orbit-ring-wrap">
        <svg
          className="orbit-ring"
          data-testid="orbit-ring"
          viewBox="0 0 260 260"
          role="img"
          aria-label={`The ring for ${scope.title}: ${ringPeople.length} ${
            ringPeople.length === 1 ? "person" : "people"
          }, ${plans.length} ${plans.length === 1 ? "plan" : "plans"}`}
        >
          <circle className="orbit-ring-track" cx={CX} cy={CY} r={R} />
          {viewer ? (
            <g data-testid="orbit-center" data-pending={viewer.pending ? "true" : undefined}>
              <circle
                className="orbit-center-stone"
                cx={CX}
                cy={CY}
                r={17}
                data-state={viewer.pending ? "action" : undefined}
              />
              <text className="orbit-center-label" x={CX} y={CY + 4} textAnchor="middle">
                You
              </text>
            </g>
          ) : null}
          {ringItems.map((item, i) => {
            const pos = ringPoint(i, ringItems.length, R, CX, CY);
            if (item.kind === "person") {
              const person = item.person;
              const state = person.limbo ? "limbo" : person.pending ? "pending" : "settled";
              return (
                <g
                  key={`person-${person.id}`}
                  className="orbit-light"
                  data-testid="orbit-person-light"
                  data-person-id={person.id}
                  data-state={state}
                  style={{ animationDelay: `${i * 90}ms` }}
                >
                  <title>{`${person.name} — ${
                    person.limbo
                      ? "in limbo, window closing"
                      : person.pending
                        ? "hasn't answered yet"
                        : "answered"
                  }`}</title>
                  {person.limbo ? (
                    <circle
                      className="orbit-light-limbo-arc"
                      cx={pos.x}
                      cy={pos.y}
                      r={13}
                      pathLength={100}
                      strokeDasharray={`${Math.round(
                        Math.min(1, Math.max(0, person.limboFractionRemaining ?? 1)) * 100,
                      )} 100`}
                    />
                  ) : null}
                  <circle
                    className="orbit-light-dot"
                    cx={pos.x}
                    cy={pos.y}
                    r={8}
                    style={
                      person.tint
                        ? { fill: `var(--person-tint-${person.tint})` }
                        : undefined
                    }
                  />
                  <text className="orbit-light-label" x={pos.x} y={pos.y + 24} textAnchor="middle">
                    {initialsOf(person.name)}
                  </text>
                </g>
              );
            }
            const plan = item.plan;
            return (
              <g
                key={`plan-${plan.plan_id}`}
                className="orbit-stone"
                data-testid="orbit-plan-stone"
                data-plan-id={plan.plan_id}
                data-state={plan.state}
                style={{ animationDelay: `${i * 90}ms` }}
                onClick={onOpenPlan ? () => onOpenPlan(plan.plan_id) : undefined}
                role={onOpenPlan ? "button" : undefined}
              >
                <title>{`${plan.title} — ${STATE_WORD[plan.state] ?? plan.state}`}</title>
                <circle
                  className="orbit-stone-dot"
                  cx={pos.x}
                  cy={pos.y}
                  r={6.5}
                  style={{ fill: `var(--orb-indicator-${plan.state}, var(--ink-3))` }}
                />
              </g>
            );
          })}
        </svg>
        <ul className="orbit-ring-legend" data-testid="orbit-ring-legend">
          {ringPeople.map((person) => (
            <li key={person.id} data-testid="orbit-legend-person" data-person-id={person.id}>
              <span className="orbit-legend-name">{person.name}</span>
              <span className="orbit-legend-state">
                {person.limbo
                  ? " — in limbo: their window is closing"
                  : person.pending
                    ? " — hasn't answered yet"
                    : " — answered"}
              </span>
            </li>
          ))}
          {plans.map((plan) => (
            <li key={plan.plan_id} data-testid="orbit-legend-plan" data-plan-id={plan.plan_id}>
              <span className="orbit-legend-name">{plan.title}</span>
              <span className="orbit-legend-state">
                {` — ${STATE_WORD[plan.state] ?? plan.state}`}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {insight ? (
        <p className="orbit-insight" data-testid="orbit-insight">
          <span className="orbit-insight-kicker">OPAL'S READ</span>
          {insight}
        </p>
      ) : null}

      <section className="orbit-arc" data-testid="orbit-arc">
        <p className="orbit-arc-kicker">THE LONG ARC</p>
        {nextLine ? (
          <p className="orbit-arc-line" data-testid="orbit-next-together">
            <span className="orbit-arc-label">Next together</span>
            {nextLine}
          </p>
        ) : (
          <p className="orbit-arc-line" data-testid="orbit-next-together">
            <span className="orbit-arc-label">Next together</span>
            Nothing is planned together yet.
          </p>
        )}
        {plans
          .filter((p) => !p.when_label || !p.where_label)
          .map((p) => (
            <p key={p.plan_id} className="orbit-arc-line" data-testid="orbit-open-window">
              <span className="orbit-arc-label">Open window</span>
              {`${p.title} — ${!p.when_label ? "time not set yet" : "place not set yet"}`}
            </p>
          ))}
        {limboParties.map((p) => (
          <p key={p.id} className="orbit-arc-line orbit-arc-limbo" data-testid="orbit-limbo-line">
            <span className="orbit-arc-label">Limbo</span>
            {`${p.name}'s answer is in limbo — the window is closing.`}
          </p>
        ))}
        {pendingParties.map((p) => (
          <p key={p.id} className="orbit-arc-line" data-testid="orbit-pending-line">
            <span className="orbit-arc-label">Waiting</span>
            {`Still waiting on ${p.name}'s answer.`}
          </p>
        ))}
        {viewerPending ? (
          <p className="orbit-arc-line" data-testid="orbit-viewer-pending">
            <span className="orbit-arc-label">Your move</span>
            A plan here is waiting on your answer.
          </p>
        ) : null}
        {sessions.length > 0 ? (
          <div className="orbit-index" data-testid="orbit-index">
            <p className="orbit-arc-label">Past chats with Opal in this orbit</p>
            {sessions.map((s) => (
              <button
                key={s.id}
                type="button"
                className="orbit-index-row"
                data-testid="orbit-index-row"
                data-session-id={s.id}
                data-active={s.id === activeSessionId ? "true" : undefined}
                onClick={() => onOpenSession(s.id)}
              >
                <span className="orbit-index-title">{s.title}</span>
                <span className="orbit-index-time">{s.timeLabel}</span>
              </button>
            ))}
            <button
              type="button"
              className="orbit-index-new"
              data-testid="orbit-index-new"
              onClick={onStartNew}
            >
              Start a new chat in this orbit
            </button>
          </div>
        ) : null}
      </section>
      </div>

      <section className="orbit-field" data-testid="orbit-field">
        <p className="orbit-field-purpose">Ask about this conversation.</p>
        {children ? (
          children
        ) : emptyInvite ? (
          <div className="orbit-empty" data-testid="orbit-empty">
            <p className="orbit-empty-line">
              {scope.composition === "group"
                ? "No chats with Opal about this group yet. Ask the first question — Opal answers from this conversation, for your eyes only."
                : `No chats with Opal about ${scope.personName ?? scope.title} yet. Ask the first question.`}
            </p>
            <div className="orbit-empty-composer">
              <input
                className="orbit-empty-input"
                data-testid="orbit-empty-input"
                placeholder="Ask about this conversation..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && draft.trim()) {
                    emptyInvite.onAsk(draft.trim());
                    setDraft("");
                  }
                }}
              />
              {draft.trim() ? (
                <button
                  type="button"
                  className="orbit-empty-send"
                  data-testid="orbit-empty-send"
                  aria-label="Ask Opal"
                  onClick={() => {
                    emptyInvite.onAsk(draft.trim());
                    setDraft("");
                  }}
                >
                  ↑
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
