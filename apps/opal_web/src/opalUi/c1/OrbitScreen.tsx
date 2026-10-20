/**
 * Repair #20 amendment (Orbit v2) - THE ORBIT SCREEN, rebuilt after
 * the founder rejected the v1 composition in the 2026-10-20 interim
 * preview. V1 (a ring of people around a center person) is gone.
 *
 * FOUNDER LAW FOR V2 (governs every choice in this file):
 * - CENTER LAW: the orbit's center is the TOPIC - the conversation,
 *   plan, or place under discussion - never a person. Nobody orbits
 *   anybody; all parties are equally centered. There is no ring of
 *   people, no center person, and no viewer-at-center here.
 * - CALM LAW: a quiet card room. One idea per card, generous
 *   negative space, minimal text, progressive disclosure - the room
 *   opens nearly empty and depth sits behind taps. Overwhelm is
 *   the failure (the founder names ADHD users explicitly).
 * - MISALIGNMENT HONESTY (Orbit Law 3): where a fork is presented
 *   or a window is cooling, the where-we-are card names the
 *   friction plainly - "waiting on an answer", "the window closed
 *   without an answer" - never smoothed, never prettied.
 * - LOVED HONESTY: the "loved" mark appears only where the
 *   conversation itself confirms enjoyment - repeat provenance (a
 *   plan done again) or an explicit positive signal in the data
 *   handed in. Never assumed. No past data = the card is honestly
 *   sparse or absent, never invented.
 * - EMPTY ORBIT = PROMISE: one plain teaching line about what this
 *   room becomes, plus the first-question invitation.
 * - THE VOICE LAW + PUSH TO CHAT: an explicit "Shape what to say"
 *   affordance asks Opal for a draft reply; the draft renders in
 *   its own RECOMMENDATION BOX (not a chat bubble); long-pressing
 *   the box raises a menu whose carry action is "Push to chat" -
 *   it carries the words into the thread's composer and lands the
 *   user there, unsent, with no marker that help was used. The
 *   clipboard is involved nowhere in this flow, and nothing in
 *   this flow sends a message.
 *
 * This component renders what it is handed: state lines, plans,
 * and past facts arrive finished from the backend orbit
 * projection (OrbitProjectionContract) via the host. Optional
 * sibling fields the backend cluster is adding (past_plans,
 * where_lines, per-plan loved/repeat signals) are read
 * defensively - the room works before and after they land, and
 * degrades honestly when they are absent.
 */
import React, { useEffect, useRef, useState } from "react";
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

/** Optional sibling fields on the orbit projection, read
 *  defensively until the backend contract carries them natively. */
type OrbitPastPlanLike = {
  plan_id: string;
  title: string;
  when_label?: string | null;
  where_label?: string | null;
  /** True only when the conversation itself confirms enjoyment. */
  loved?: boolean | null;
  loved_evidence?: string | null;
  /** True when this plan was done again (repeat provenance). */
  repeated?: boolean | null;
};

type OrbitProjectionExtended = OrbitProjectionContract & {
  past_plans?: OrbitPastPlanLike[] | null;
  where_lines?: string[] | null;
};

function pastPlansOf(orbit: OrbitProjectionContract | null): OrbitPastPlanLike[] {
  if (!orbit) return [];
  const ext = orbit as OrbitProjectionExtended;
  if (Array.isArray(ext.past_plans) && ext.past_plans.length > 0) {
    return ext.past_plans;
  }
  // Fallback: the projection's own plan list, past-state only.
  return (orbit.plans ?? [])
    .filter((p) => p.state === "past")
    .map((p) => {
      const raw = p as unknown as Record<string, unknown>;
      return {
        plan_id: p.plan_id,
        title: p.title,
        when_label: p.when_label ?? null,
        where_label: p.where_label ?? null,
        loved: raw.loved === true ? true : null,
        loved_evidence: typeof raw.loved_evidence === "string" ? raw.loved_evidence : null,
        repeated: raw.repeated === true ? true : null,
      };
    });
}

function whereLinesOf(
  orbit: OrbitProjectionContract | null,
  propLines?: string[] | null,
): string[] {
  if (propLines && propLines.length > 0) return propLines;
  const ext = orbit as OrbitProjectionExtended | null;
  if (ext && Array.isArray(ext.where_lines)) return ext.where_lines.filter(Boolean);
  return [];
}

/** Collapse the session index into period pills (density
 *  inheritance: history summarized; only the live conversation is
 *  open by default; a pill expands on intent only). Periods derive
 *  from each row's ISO updatedAt when present; rows without one
 *  land in "Earlier" - never a guessed date. */
export function periodPillsForSessions(
  sessions: PersonOpalSessionRow[],
  now: Date = new Date(),
): Array<{ key: string; label: string; sessions: PersonOpalSessionRow[] }> {
  const buckets = new Map<string, { label: string; rows: PersonOpalSessionRow[] }>();
  const push = (key: string, label: string, s: PersonOpalSessionRow) => {
    const b = buckets.get(key) ?? { label, rows: [] };
    b.rows.push(s);
    buckets.set(key, b);
  };
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  for (const s of sessions) {
    const t = s.updatedAt ? Date.parse(s.updatedAt) : NaN;
    if (!Number.isNaN(t)) {
      const age = now.getTime() - t;
      if (age <= weekMs) {
        push("this-week", "This week", s);
        continue;
      }
      const d = new Date(t);
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
        push("this-month", "Earlier this month", s);
        continue;
      }
    }
    push("earlier", "Earlier", s);
  }
  const order = ["this-week", "this-month", "earlier"];
  return order
    .filter((k) => buckets.has(k))
    .map((k) => ({ key: k, label: buckets.get(k)!.label, sessions: buckets.get(k)!.rows }));
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
  whereLines,
  recommendation,
  onShapeRequest,
  onPushToChat,
  onDismissRecommendation,
  shapeBusy,
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
  /** Finished where-we-are lines the host already has (the
   *  viewer's etiquette lines), when it passes them directly. */
  whereLines?: string[] | null;
  /** Opal's draft reply for the viewer, when one has been shaped.
   *  Renders in the recommendation box - never as a chat bubble. */
  recommendation?: string | null;
  /** Ask Opal to shape a draft reply (the Voice Law affordance). */
  onShapeRequest?: () => void;
  /** Carry the draft into the thread's composer and land there.
   *  Never sends; the clipboard is never involved. */
  onPushToChat?: (text: string) => void;
  onDismissRecommendation?: () => void;
  shapeBusy?: boolean;
  /** The scoped Opal conversation, when one is open in this orbit. */
  children?: React.ReactNode;
}) {
  const [draft, setDraft] = useState("");
  const [openPeriod, setOpenPeriod] = useState<string | null>(null);
  const [pastOpen, setPastOpen] = useState(false);

  // --- Recommendation box state (long-press menu + in-Orbit edit)
  const [recText, setRecText] = useState<string | null>(null);
  const [recMenuOpen, setRecMenuOpen] = useState(false);
  const [recEditing, setRecEditing] = useState(false);
  const [recEditDraft, setRecEditDraft] = useState("");
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setRecText(recommendation ?? null);
    setRecMenuOpen(false);
    setRecEditing(false);
  }, [recommendation]);
  const clearPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };
  const startPress = () => {
    clearPress();
    pressTimer.current = setTimeout(() => setRecMenuOpen(true), 500);
  };

  // --- Subject (CENTER LAW): the topic names the room - the next
  // plan's title first, else the conversation's own title. For a
  // 1:1 with neither, the partner's name stands AS THE SUBJECT
  // LINE (a topic label, never a center person).
  const nextPlan = orbit?.next_plan ?? null;
  const subject = nextPlan?.title ?? scope.planTitle ?? scope.title;
  const parties = orbit
    ? orbit.parties.map((p) => ({ id: p.user_id, name: p.display_name, isViewer: p.is_viewer, pending: p.pending, limbo: p.limbo }))
    : scope.party.map((p) => ({ id: p.id, name: p.name, isViewer: p.isViewer, pending: p.pending, limbo: p.limbo }));
  const partyLine = parties.map((p) => (p.isViewer ? "You" : p.name)).join(", ");

  // --- Where we are: state lines finished by the projection and
  // the host, plus the plain friction lines (MISALIGNMENT HONESTY).
  const plans = orbit?.plans ?? [];
  const nextLine = nextPlan
    ? [nextPlan.title, nextPlan.when_label ?? "Time not set yet.", nextPlan.where_label]
        .filter(Boolean)
        .join(" - ")
    : null;
  const limboParties = parties.filter((p) => p.limbo && !p.isViewer);
  const closedWithoutAnswer = limboParties.filter((p) =>
    plans.some((pl) =>
      (pl.participants ?? []).some(
        (pp) => pp.user_id === p.id && (pp.limbo_stage === "closed" || pp.limbo_stage === "expired"),
      ),
    ),
  );
  const coolingParties = limboParties.filter((p) => !closedWithoutAnswer.includes(p));
  const pendingParties = parties.filter((p) => p.pending && !p.limbo && !p.isViewer);
  const viewerPending = parties.find((p) => p.isViewer)?.pending === true;
  const extraWhere = whereLinesOf(orbit, whereLines);
  const openWindows = plans.filter((p) => p.state !== "past" && (!p.when_label || !p.where_label));

  // --- What we have done - and loved (honest provenance only).
  const pastPlans = pastPlansOf(orbit);
  const lovedOf = (p: OrbitPastPlanLike): string | null => {
    if (p.loved_evidence === "repeated" || p.repeated) return "Done again";
    if (p.loved) return "Loved";
    return null;
  };

  const periods = periodPillsForSessions(sessions);
  const isEmptyOrbit =
    !children &&
    sessions.length === 0 &&
    pastPlans.length === 0 &&
    !nextPlan &&
    plans.length === 0;

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
          {subject}
        </p>
        <p className="orbit-screen-parties" data-testid="orbit-parties">
          {partyLine}
        </p>
      </header>

      <div className="orbit-top">
        {insight ? (
          <p className="orbit-insight" data-testid="orbit-insight">
            <span className="orbit-insight-kicker">OPAL'S READ</span>
            {insight}
          </p>
        ) : null}

        <section className="orbit-card" data-testid="orbit-where-card">
          <p className="orbit-card-kicker">WHERE WE'RE AT</p>
          {nextLine ? (
            <p className="orbit-card-line" data-testid="orbit-next-together">
              <span className="orbit-card-label">Next together</span>
              {nextLine}
            </p>
          ) : (
            <p className="orbit-card-line" data-testid="orbit-next-together">
              <span className="orbit-card-label">Next together</span>
              Nothing is planned together yet.
            </p>
          )}
          {extraWhere.map((line, i) => (
            <p key={i} className="orbit-card-line" data-testid="orbit-where-line">
              {line}
            </p>
          ))}
          {openWindows.map((p) => (
            <p key={p.plan_id} className="orbit-card-line" data-testid="orbit-open-window">
              <span className="orbit-card-label">Open window</span>
              {`${p.title} - ${!p.when_label ? "time not set yet" : "place not set yet"}`}
            </p>
          ))}
          {pendingParties.map((p) => (
            <p key={p.id} className="orbit-card-line" data-testid="orbit-pending-line">
              <span className="orbit-card-label">Waiting</span>
              {`Waiting on an answer from ${p.name}.`}
            </p>
          ))}
          {coolingParties.map((p) => (
            <p key={p.id} className="orbit-card-line" data-testid="orbit-limbo-line">
              <span className="orbit-card-label">Cooling</span>
              {`${p.name}'s window is closing - still waiting on an answer.`}
            </p>
          ))}
          {closedWithoutAnswer.map((p) => (
            <p key={p.id} className="orbit-card-line" data-testid="orbit-closed-line">
              <span className="orbit-card-label">Closed</span>
              {`The window closed without an answer from ${p.name}.`}
            </p>
          ))}
          {viewerPending ? (
            <p className="orbit-card-line" data-testid="orbit-viewer-pending">
              <span className="orbit-card-label">Your move</span>
              A plan here is waiting on your answer.
            </p>
          ) : null}
        </section>

        {pastPlans.length > 0 ? (
          <section className="orbit-card" data-testid="orbit-past-card">
            <button
              type="button"
              className="orbit-card-toggle"
              data-testid="orbit-past-toggle"
              aria-expanded={pastOpen}
              onClick={() => setPastOpen((v) => !v)}
            >
              {`What we've done - and loved (${pastPlans.length})`}
            </button>
            {pastOpen
              ? pastPlans.map((p) => {
                  const loved = lovedOf(p);
                  return (
                    <p key={p.plan_id} className="orbit-card-line" data-testid="orbit-past-row" data-plan-id={p.plan_id}>
                      <span className="orbit-past-title">{p.title}</span>
                      {[p.when_label, p.where_label].filter(Boolean).length > 0 ? (
                        <span className="orbit-past-meta">
                          {` - ${[p.when_label, p.where_label].filter(Boolean).join(" - ")}`}
                        </span>
                      ) : null}
                      {loved ? (
                        <span className="orbit-past-loved" data-testid="orbit-past-loved">
                          {` - ${loved}`}
                        </span>
                      ) : null}
                    </p>
                  );
                })
              : null}
          </section>
        ) : null}

        {periods.length > 0 ? (
          <div className="orbit-index" data-testid="orbit-index">
            <p className="orbit-card-kicker">PAST CHATS WITH OPAL HERE</p>
            <div className="orbit-period-pills">
              {periods.map((period) => (
                <span key={period.key} className="orbit-period-wrap">
                  <button
                    type="button"
                    className="orbit-period-pill"
                    data-testid="orbit-period-pill"
                    data-period={period.key}
                    aria-expanded={openPeriod === period.key}
                    onClick={() => setOpenPeriod((cur) => (cur === period.key ? null : period.key))}
                  >
                    {`${period.label} (${period.sessions.length})`}
                  </button>
                  {openPeriod === period.key
                    ? period.sessions.map((s) => (
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
                      ))
                    : null}
                </span>
              ))}
            </div>
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
      </div>

      <section className="orbit-field" data-testid="orbit-field">
        <p className="orbit-field-purpose">
          Ask Opal about this conversation - or tell Opal where you're coming from.
        </p>
        {onShapeRequest && children ? (
          <button
            type="button"
            className="orbit-shape-btn"
            data-testid="orbit-shape-request"
            disabled={shapeBusy}
            onClick={onShapeRequest}
          >
            {shapeBusy ? "Shaping..." : "Shape what to say"}
          </button>
        ) : null}
        {recText ? (
          <div
            className="orbit-recommendation"
            data-testid="orbit-recommendation"
            onPointerDown={startPress}
            onPointerUp={clearPress}
            onPointerLeave={clearPress}
            onContextMenu={(e) => {
              e.preventDefault();
              setRecMenuOpen(true);
            }}
          >
            <p className="orbit-recommendation-kicker">A DRAFT FOR YOU</p>
            {recEditing ? (
              <div className="orbit-recommendation-edit">
                <textarea
                  className="orbit-recommendation-input"
                  data-testid="orbit-recommendation-input"
                  value={recEditDraft}
                  onChange={(e) => setRecEditDraft(e.target.value)}
                  rows={3}
                />
                <button
                  type="button"
                  className="orbit-recommendation-save"
                  data-testid="orbit-recommendation-save"
                  onClick={() => {
                    if (recEditDraft.trim()) setRecText(recEditDraft.trim());
                    setRecEditing(false);
                  }}
                >
                  Use this version
                </button>
              </div>
            ) : (
              <p className="orbit-recommendation-text" data-testid="orbit-recommendation-text">
                {recText}
              </p>
            )}
            <p className="orbit-recommendation-hint">Hold for options</p>
            {recMenuOpen ? (
              <div className="orbit-recommendation-menu" data-testid="orbit-recommendation-menu" role="menu">
                {onPushToChat ? (
                  <button
                    type="button"
                    data-testid="orbit-recommendation-push"
                    onClick={() => {
                      setRecMenuOpen(false);
                      onPushToChat(recText);
                    }}
                  >
                    Push to chat
                  </button>
                ) : null}
                <button
                  type="button"
                  data-testid="orbit-recommendation-adjust"
                  onClick={() => {
                    setRecEditDraft(recText);
                    setRecEditing(true);
                    setRecMenuOpen(false);
                  }}
                >
                  Adjust in Orbit
                </button>
                {onShapeRequest ? (
                  <button
                    type="button"
                    data-testid="orbit-recommendation-another"
                    onClick={() => {
                      setRecMenuOpen(false);
                      onShapeRequest();
                    }}
                  >
                    Ask Opal for another take
                  </button>
                ) : null}
                <button
                  type="button"
                  data-testid="orbit-recommendation-dismiss"
                  onClick={() => {
                    setRecMenuOpen(false);
                    setRecText(null);
                    onDismissRecommendation?.();
                  }}
                >
                  Dismiss
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        {children ? (
          children
        ) : emptyInvite ? (
          <div className="orbit-empty" data-testid="orbit-empty">
            {isEmptyOrbit ? (
              <p className="orbit-empty-teaching" data-testid="orbit-empty-teaching">
                This room keeps what this conversation becomes - where you're at, what
                you've done together, and help finding your words. It fills as your
                life together does.
              </p>
            ) : null}
            <p className="orbit-empty-line">
              {scope.composition === "group"
                ? "No chats with Opal about this group yet. Ask the first question - or tell Opal where you're coming from."
                : `No chats with Opal about ${scope.personName ?? scope.title} yet. Ask the first question - or tell Opal where you're coming from.`}
            </p>
            <div className="orbit-empty-composer">
              <input
                className="orbit-empty-input"
                data-testid="orbit-empty-input"
                placeholder="Ask, or tell Opal where you're coming from..."
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
