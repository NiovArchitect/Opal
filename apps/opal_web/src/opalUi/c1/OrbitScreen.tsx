/**
 * Repair #21 (Orbit v3) - THE ORBIT SCREEN, RADICAL CALM REBUILD.
 * Presentation rebuild on the v2 wiring: same props, same host,
 * same backend projection, no new semantics.
 *
 * FOUNDER LAW CARRIED FROM V2 (unchanged):
 * - CENTER LAW: the orbit's center is the TOPIC - the conversation,
 *   plan, or place under discussion - never a person. Nobody orbits
 *   anybody; all parties are equally centered.
 * - VOICE LAW + PLACE IN COMPOSER: an explicit "Shape what to
 *   say" affordance asks Opal for a draft reply; the draft
 *   renders in its own RECOMMENDATION BOX (not a chat bubble);
 *   long-pressing the box SELECTS it, and the selected state
 *   offers ONE place action naming the destination ("Place in
 *   Maya's composer"). Tapping it carries the words into the
 *   thread's composer and lands the user there - unsent, caret
 *   active - under a quiet provenance chip ("From your Orbit -
 *   unsent") with a one-tap return to this room. The clipboard
 *   is involved nowhere in this flow, and nothing in this flow
 *   sends a message. (Round 3 correction, founder 2026-10-20
 *   21:39 PDT: the earlier drag-and-flight mechanic and the
 *   long-press menu's "Push to chat" are DISPOSED - Orbit and
 *   the thread are separate screens, so the app crosses the
 *   screens for the user instead of pretending a card can fly
 *   between them.)
 * - MISALIGNMENT HONESTY (Orbit Law 3): where a fork is presented
 *   or a window is cooling, the where-we-are card names the
 *   friction plainly - "waiting on an answer", "the window closed
 *   without an answer" - never smoothed, never prettied.
 * - LOVED HONESTY: the "loved" mark appears only where the
 *   conversation itself confirms enjoyment - repeat provenance (a
 *   plan done again) or an explicit positive signal in the data
 *   handed in. Never assumed.
 * - Sameness, two-true-perspectives, ethics, invisibility and
 *   density inheritance stand exactly as in v2.
 *
 * V4 LAWS (Repair #21, Orbit v4):
 * - RING COMPOSITION: the header IS the doorway's ring, grown -
 *   the brand orb geometry (ORB_RING / ORB_HRING, measured master
 *   geometry) with the TOPIC at its center (Center Law: text,
 *   never a person) and the parties as points of light ON the
 *   ring, glowing in their state. The lights TRAVEL the ring
 *   slowly (the brand ambient lap; lights in motion = an orbit
 *   in motion) and a tracing light rides the ring; glow and
 *   shadow answer the room's strongest true state. Reduced
 *   motion stills the travel and the trace; the glow remains.
 * - COMPOSER DOCK: the composer docks at the bottom of the
 *   room, above the shell's navigation pad, in every state.
 * - COLOR/WEIGHT DISCIPLINE: headings carry bold + their state
 *   color; content under a heading is regular weight, neutral.
 * - ROWS ARE DOORS: every Where row navigates to its plan.
 * - THE (i) IS STATIC: one line, always the same.
 * - PLACE, DON'T DRAG (Round 3): long-press selects the draft;
 *   the place action crosses to the thread with the words in
 *   its composer, populated and unsent. No drag, no flight.
 * - RETROSPECTIVE (fold two): history is chapters by period -
 *   period pills are the chapter index, done-and-loved is the
 *   living edge of the latest chapter, settled plans render as
 *   stones. Only real history renders; a thin record is thin.
 *
 * V3 LAWS (Repair #21):
 * - CALM LAW: one quiet column, and nothing else on first paint:
 *   a minimal header (the topic + the parties, nothing more), the
 *   Where-we're-at card, the Opal conversation, the composer.
 *   Past chats collapse into ONE folded row; past plans stay
 *   behind their one folded row. Chrome is back only - the
 *   embedded conversation carries no header of its own here.
 * - DISCOVERY DOCTRINE: no explanations in the UI. Anything a
 *   first-time eye needs to be told lives behind the info bubble
 *   (OrbitInfoBubble), never plastered on the room. If a frame
 *   needs a caption to be understood, the frame fails.
 * - SEPARATION + EMPHASIS in the Where card: hairline separators
 *   between rows; key values (Next together, Your move, window
 *   state) bold and in their state color (the canon state tokens;
 *   text uses the per-mode state ink tokens so the color stays
 *   legible at 390px in light and dark); secondary text quieter
 *   but legible. Rows that can be tapped look tappable (chevron).
 *
 * This component renders what it is handed: state lines, plans,
 * and past facts arrive finished from the backend orbit
 * projection (OrbitProjection.for_conversation/3: subject,
 * where_lines, past_plans, loved evidence) via the host. Fields
 * the projection does not carry are never invented client-side;
 * gaps are recorded in the cluster report.
 */
import React, { useEffect, useRef, useState } from "react";
import type { OrbitProjectionContract } from "../../api/productClient";
import { planStateFamily } from "../../theme/planStateColors";
import { LONG_PRESS_MS } from "../../c2/CardContextMenu";
import { ORB_HRING, ORB_RING } from "../../brand/orb/orbGeometry";
import type { OrbitScope, PersonOpalSessionRow } from "./opalChatScope";
import { OrbitInfoBubble } from "./OrbitInfoBubble";
import "./OrbitScreen.css";

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
  subject?: string | null;
  past_plans?: OrbitPastPlanLike[] | null;
  where_lines?: string[] | null;
  /** Repair #21 (W-5b): recorded membership events (who came and
   *  went), finished lines from the conversation's own record. */
  membership_events?: Array<{ kind?: string; label?: string; at?: string | null }> | null;
};

function membershipEventsOf(
  orbit: OrbitProjectionContract | null,
): Array<{ kind?: string; label?: string; at?: string | null }> {
  const ext = orbit as OrbitProjectionExtended | null;
  if (ext && Array.isArray(ext.membership_events)) {
    return ext.membership_events.filter((e) => typeof e?.label === "string" && e.label !== "");
  }
  return [];
}

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

/** Collapse the session index into period buckets (density
 *  inheritance derivation, kept as the one tested bucketing).
 *  V3 renders the sessions themselves in ONE folded row; the
 *  buckets remain exported for callers that summarize history.
 *  Periods derive from each row's ISO updatedAt when present;
 *  rows without one land in "Earlier" - never a guessed date. */
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
  const [chatsOpen, setChatsOpen] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  // V4: the Where card's fold. Null = the default (expanded when
  // a live state exists, collapsed when the room is quiet); a tap
  // pins the choice for the life of this orbit session - it is
  // never reset by re-renders or session switches in the room.
  const [whereOpenChoice, setWhereOpenChoice] = useState<boolean | null>(null);
  // V4.2 (F-3): the ring enters BIG (the doorway morph landing),
  // breathes, then SETTLES SMALL - a compact header band that
  // keeps the identity and returns the room to the conversation.
  // Reduced motion starts compact (no settle travel).
  const [ringSettled, setRingSettled] = useState<boolean>(() => {
    try {
      return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    } catch { return false; }
  });
  useEffect(() => {
    if (ringSettled) return;
    const t = setTimeout(() => setRingSettled(true), 1600);
    return () => clearTimeout(t);
  }, [ringSettled]);
  // V4 retrospective: the opened chapter (period key). Null = the
  // latest chapter, the living edge.
  const [chapterKey, setChapterKey] = useState<string | null>(null);
  // Round 3 (O-3 rebuild): the recommendation press state. The
  // drag + flight mechanic is DISPOSED (founder correction
  // 2026-10-20 21:39 PDT): Orbit and the thread are separate
  // screens, so nothing flies across the room - a long-press
  // SELECTS the draft, and the selected state's one place
  // action crosses the screens for the user.
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  // V4 empty-composer voice furniture: recording lives inside the
  // bar; a captured transcript lands in the composer as a draft
  // (populated, unsent) - the same landing truth as push-to-chat.
  const [recording, setRecording] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  // --- Recommendation box state (selection + in-Orbit edit)
  const [recText, setRecText] = useState<string | null>(null);
  const [recSelected, setRecSelected] = useState(false);
  const [recEditing, setRecEditing] = useState(false);
  const [recEditDraft, setRecEditDraft] = useState("");
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setRecText(recommendation ?? null);
    setRecSelected(false);
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
    // Gesture grammar (v4.2 seating discipline, rule 2): ONE
    // long-press family across the app - same pressure, same
    // hold threshold (the shared LONG_PRESS_MS). What the hold
    // COMMITS changed in Round 3: it SELECTS the draft (the
    // copy-gesture users already own), and the selected state
    // offers the one place action. No lift, no drag, no flight.
    pressTimer.current = setTimeout(() => {
      setRecSelected(true);
    }, LONG_PRESS_MS);
  };
  // The place action's label names the DESTINATION - the
  // anchor's person, from the viewer's seat - and never reads
  // as sending: the words are PLACED in a composer, unsent.
  const placeName = scope.personName ? scope.personName.split(" ")[0] : null;
  const placeLabel = placeName
    ? `Place in ${placeName}'s composer`
    : "Place in the thread composer";
  // Tapping place crosses the screens for the user: the host
  // carries the words into the thread's composer (unsent, caret
  // active, provenance chip + one-tap return on that side).
  // Immediate - there is no on-screen flight to wait for.
  const placeInChat = (text: string) => {
    setRecSelected(false);
    if (!onPushToChat) return;
    onPushToChat(text);
  };

  // --- Subject (CENTER LAW): the topic names the room - the
  // projection's own subject first (the next plan's title, else
  // the conversation's title, finished server-side), then the
  // scope's carried titles. For a 1:1 with neither, the partner's
  // name stands AS THE SUBJECT LINE (a topic label, never a
  // center person).
  const nextPlan = orbit?.next_plan ?? null;
  const subject =
    (orbit as OrbitProjectionExtended | null)?.subject ??
    nextPlan?.title ??
    scope.planTitle ??
    scope.title;
  const parties = orbit
    ? orbit.parties.map((p) => ({ id: p.user_id, name: p.display_name, isViewer: p.is_viewer, pending: p.pending, limbo: p.limbo }))
    : scope.party.map((p) => ({ id: p.id, name: p.name, isViewer: p.isViewer, pending: p.pending, limbo: p.limbo }));
  // Round 3 (O-2): the party line is built from the VIEWER's
  // seat - "You" first, then the others by name (the founder's
  // form: "You - Maya Torres") - and it lives in the header zone
  // in BOTH header forms: under the ring at entry size, and as a
  // quiet line under the topic once the header settles compact
  // (it no longer yields at settle; the lights alone did not
  // name anybody). Groups name everybody up to four; past that,
  // the first three names plus the count of the rest - the count
  // is stated plainly, and the TOPIC is never the truncated text.
  const orderedParties = [...parties].sort(
    (a, b) => Number(b.isViewer) - Number(a.isViewer),
  );
  // The scope fallback lists the doorway-time peers only - the
  // viewer is not in it. The viewer is definitionally a party
  // of this conversation (this room is their own orbit of it),
  // so when no listed party is the viewer, their seat leads the
  // line unnamed-but-present: "You" - the line is viewer-
  // relative in BOTH derivations, never a peers-only roll.
  const partyNames = [
    ...(parties.some((p) => p.isViewer) ? [] : ["You"]),
    ...orderedParties.map((p) => (p.isViewer ? "You" : p.name)),
  ];
  const partyLine =
    partyNames.length > 4
      ? `${partyNames.slice(0, 3).join(" - ")} +${partyNames.length - 3} more`
      : partyNames.join(" - ");

  // --- Where we are: state lines finished by the projection and
  // the host, plus the plain friction lines (MISALIGNMENT HONESTY).
  const plans = orbit?.plans ?? [];
  const viewerParty = parties.find((p) => p.isViewer);
  const viewerPending = viewerParty?.pending === true;
  // V4.1 (C-2): rows compress to their DELTA. The topic at the
  // ring's center already names the plan; the Next together row
  // carries only what the heading does not: when, then where.
  const nextLine = nextPlan?.when_label
    ? [nextPlan.when_label, nextPlan.where_label].filter(Boolean).join(" - ")
    : null;
  const nextState = nextPlan ? planStateFamily(nextPlan.state) : null;
  // V4.2.1 (CF2-6) COPY COHERENCE - the gyroscope at the copy
  // layer: the Next together row and the Your move row derive
  // from ONE truth, so they can never contradict each other on
  // the same card. A plan can exist without being scheduled
  // (no when_label yet, or no next_plan pick while a plan in
  // this orbit is waiting on the viewer - the scope-fallback
  // parties carry that truth before the projection lands). In
  // that case the row SAYS so - "Not scheduled yet" - and when
  // the waiting plan is the viewer's own move, it says that
  // too. "Nothing is planned together yet" is reserved for the
  // one truth it names: no plan here at all, in any derivation.
  const waitingPlan =
    plans.find((p) =>
      (p.participants ?? []).some((pp) => pp.user_id === viewerParty?.id && pp.pending),
    ) ??
    plans.find((p) => p.state === "action") ??
    null;
  const unscheduledPlan = nextPlan ?? waitingPlan ?? plans[0] ?? null;
  const unscheduledLine =
    !nextLine && (nextPlan || plans.length > 0 || viewerPending)
      ? `${[
          "Not scheduled yet",
          viewerPending ? "one waiting on you" : (unscheduledPlan?.where_label ?? null),
        ]
          .filter(Boolean)
          .join(" - ")}.`
      : null;
  const unscheduledState = unscheduledPlan
    ? planStateFamily(unscheduledPlan.state)
    : "action";
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
  // Repair #21 integrator seam: the projection's where_lines open
  // with the next-together line (OrbitProjection composition), and
  // this card already renders that fact as the Next together key
  // row from next_plan. Rendering both says the same thing twice -
  // drop the restatement line when the key row carries it.
  const rawExtraWhere = whereLinesOf(orbit, whereLines).filter(
    // V4.1 (C-2): a "waiting on" restatement of the viewer's own
    // pending answer folds into the Your move row - the fact is
    // carried once, by the calmer row.
    (line) => !(viewerPending && /waiting on/i.test(line)),
  );
  // The key row above carries the next-together fact in EVERY
  // pairing (scheduled, unscheduled, or truly empty), so the
  // projection's own next-together line - in any of its forms -
  // is a restatement here and never renders a second time.
  const extraWhere =
    rawExtraWhere.length > 0 &&
    (rawExtraWhere[0].startsWith("Next together:") ||
      rawExtraWhere[0] === "No next plan is set yet.")
      ? rawExtraWhere.slice(1)
      : rawExtraWhere;
  const openWindows = plans.filter((p) => p.state !== "past" && (!p.when_label || !p.where_label));
  // V4 third tense (Boundary Law): the future glimpse - this
  // anchor's OTHER real plans (not next together, not an open
  // window, never past), as quiet stone rows that are doors into
  // Graphs. No real future = no glimpse; nothing is invented.
  // A plan already rowed as an open window never re-renders as
  // a glimpse stone - one plan, one row, its strongest form (C-2).
  const glimpsePlans = plans.filter(
    (p) => p.state !== "past" && p.plan_id !== nextPlan?.plan_id && !openWindows.some((w) => w.plan_id === p.plan_id),
  );

  // --- What we have done - and loved (honest provenance only).
  const pastPlans = pastPlansOf(orbit);
  const lovedOf = (p: OrbitPastPlanLike): string | null => {
    if (p.loved_evidence === "repeated" || p.repeated) return "Done again";
    if (p.loved) return "Loved";
    return null;
  };

  // V4.2 (F-4) SUPERSEDES the v4 requirement-5 default: SLIM is
  // home. The default form shows the live essentials only - next
  // together + a waiting move (two rows, the move's fire intact);
  // the full card is one tap away. The user's expansion choice
  // persists for the life of the room, as before.
  const whereExpanded = whereOpenChoice ?? false;
  const showFull = whereExpanded;
  // CF2-6: an unscheduled plan (a plan here, no next pick yet)
  // is a live essential too - the slim card shows its row.
  const showBody = showFull || Boolean(nextPlan) || viewerPending || plans.length > 0;
  const slimExtraWhere = showFull ? extraWhere : [];
  const slimOpenWindows = showFull ? openWindows : [];
  const slimGlimpse = showFull ? glimpsePlans : [];
  const slimPending = showFull ? pendingParties : [];
  const slimCooling = showFull ? coolingParties : [];
  const slimClosed = showFull ? closedWithoutAnswer : [];
  const slimMembership = showFull ? membershipEventsOf(orbit) : [];
  // The insight earns its row only when it SAYS something the
  // rows do not: a bare restatement of the next plan's time (or
  // of the Next together delta) is suppressed - it is the same
  // fact wearing a second costume.
  const insightText = insight?.trim() ?? "";
  const insightLine =
    insightText &&
    insightText !== (nextPlan?.when_label ?? "").trim() &&
    insightText !== (nextLine ?? "").trim()
      ? insight
      : null;
  const slimInsight = showFull ? insightLine : null;
  // The composition's strongest true state (ambient priority:
  // action > limbo > the next plan's family) - the ring's glow
  // and shadow answer this, and nothing else.
  const dominantState = viewerPending || pendingParties.length > 0
    ? "action"
    : limboParties.length > 0
      ? "limbo"
      : nextState;
  // Ring lights: every party, compressed past twelve into eleven
  // lights plus one overflow light carrying the count.
  const lightParties = parties.slice(0, parties.length > 12 ? 11 : 12);
  const overflowCount = parties.length - lightParties.length;
  const lightStateOf = (p: (typeof parties)[number]): string =>
    p.limbo ? "limbo" : p.pending ? "action" : "settled";
  const lightPos = (i: number, n: number) => {
    const a = ((i * 360) / Math.max(n, 1) - 90) * (Math.PI / 180);
    return { x: ORB_RING.cx + ORB_RING.r * Math.cos(a), y: ORB_RING.cy + ORB_RING.r * Math.sin(a) };
  };
  const planIdForParty = (partyId: string): string | null => {
    const plan = plans.find((pl) => (pl.participants ?? []).some((pp) => pp.user_id === partyId));
    return plan?.plan_id ?? nextPlan?.plan_id ?? null;
  };
  // Retrospective chapters: period buckets of the real session
  // record; with no dated sessions, one undated chapter (no date
  // is ever invented for it).
  const chapters = sessions.length > 0
    ? periodPillsForSessions(sessions)
    : pastPlans.length > 0
      ? [{ key: "done", label: "Done together", sessions: [] as PersonOpalSessionRow[] }]
      : [];
  const activeChapter = chapters.find((c) => c.key === chapterKey) ?? chapters[0] ?? null;
  const latestChapter = chapters[0] ?? null;
  const earliestSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;

  const isEmptyOrbit =
    !children &&
    sessions.length === 0 &&
    pastPlans.length === 0 &&
    !nextPlan &&
    plans.length === 0;

  // V4: the (i) content is STATIC - one line, never dynamic,
  // never per-anchor.
  const emptyExplanation = "Just you and Opal, about this conversation.";

  const startVoice = () => {
    setVoiceNote(null);
    setRecording(true);
    try {
      const w = window as unknown as { SpeechRecognition?: new () => never; webkitSpeechRecognition?: new () => never };
      const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
      if (Ctor) {
        const rec = new Ctor() as unknown as {
          continuous: boolean; interimResults: boolean;
          onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
          onend: (() => void) | null; start: () => void; stop: () => void;
        };
        rec.continuous = true;
        rec.interimResults = false;
        rec.onresult = (e) => {
          const text = Array.from(e.results).map((r) => r[0]?.transcript ?? "").join(" ").trim();
          if (text) setDraft(text);
        };
        rec.onend = () => setRecording(false);
        recognitionRef.current = rec;
        rec.start();
      }
    } catch { /* capture unavailable: the bar still shows the state; stop returns to idle */ }
  };
  const stopVoice = () => {
    try { recognitionRef.current?.stop(); } catch { /* already stopped */ }
    recognitionRef.current = null;
    setRecording(false);
    setVoiceNote("Voice notes are heard as words here - check the draft, then Send.");
  };

  return (
    <div className="orbit-screen" data-testid="orbit-screen" data-composition={scope.composition} data-state={dominantState ?? undefined}>
      <header className="orbit-screen-head">
        <button
          type="button"
          className="orbit-screen-back"
          data-testid="orbit-back-to-thread"
          aria-label={scope.personName ? `Back to your chat with ${scope.personName}` : "Back to your chat"}
          title={scope.personName ? `Back to your chat with ${scope.personName}` : "Back to your chat"}
          onClick={onBackToThread}
        >
          {"‹ Back"}
        </button>
        {/* V4 RING COMPOSITION: the doorway's ring, grown - the
            brand geometry (ORB_RING / ORB_HRING), the topic at
            its center, the parties as lights ON the ring. The
            rotor carries the lights slowly around the ring
            (transform-origin is the ring's own center, so a
            light cannot leave its ring); the trace rides its
            own rotor. Entry settle: the composition scales up
            from the doorway glyph's size - a fade/scale
            continuity, declared as such (no shared-element
            morph exists in this shell). */}
        <div
          className="orbit-composition"
          data-testid="orbit-composition"
          data-settled={ringSettled ? "true" : undefined}
          data-state={dominantState ?? undefined}
          data-party-count={parties.length}
        >
          <svg className="orbit-composition-svg" viewBox="0 0 200 200" aria-hidden="true">
            <circle className="orbit-composition-ring" cx={ORB_RING.cx} cy={ORB_RING.cy} r={ORB_RING.r} />
            <ellipse className="orbit-composition-hring" cx={ORB_HRING.cx} cy={ORB_HRING.cy} rx={ORB_HRING.rx} ry={ORB_HRING.ry} />
            <g className="orbit-composition-trace-rotor">
              <path className="orbit-composition-trace" d="M 101 29 A 71 71 0 0 1 171.7 92" />
            </g>
            <g className="orbit-composition-rotor">
              {lightParties.map((p, i) => {
                const pos = lightPos(i, lightParties.length + (overflowCount > 0 ? 1 : 0));
                return (
                  <g
                    key={p.id}
                    className="orbit-composition-light"
                    data-testid="orbit-composition-light"
                    data-user-id={p.id}
                    data-state={lightStateOf(p)}
                    transform={`translate(${pos.x} ${pos.y})`}
                  >
                    <circle className="orbit-light-halo" r="10" />
                    <circle className="orbit-light-core" r="3.6" />
                  </g>
                );
              })}
              {overflowCount > 0 ? (() => {
                const pos = lightPos(lightParties.length, lightParties.length + 1);
                return (
                  <g
                    className="orbit-composition-light"
                    data-testid="orbit-composition-overflow"
                    data-state="settled"
                    transform={`translate(${pos.x} ${pos.y})`}
                  >
                    <circle className="orbit-light-halo" r="10" />
                    <text className="orbit-light-overflow-text" textAnchor="middle" dy="3">{`+${overflowCount}`}</text>
                  </g>
                );
              })() : null}
            </g>
          </svg>
          <div className="orbit-composition-center">
            <span className="orbit-composition-orb" aria-hidden="true" />
            {/* V4.2.1 (CF2-5): the BIG entry form keeps the topic
                at the ring's center. Once settled, the small ring
                holds the glyph only - the topic moves OUTSIDE it
                (the compact topic line beside the ring, below),
                in full. No ellipsized hero text, ever. */}
            {!ringSettled ? (
              <p className="orbit-screen-title" data-testid="orbit-screen-title">
                {subject}
              </p>
            ) : null}
          </div>
        </div>
        {ringSettled ? (
          <p className="orbit-screen-title orbit-compact-topic" data-testid="orbit-screen-title">
            {subject}
          </p>
        ) : null}
        <p className="orbit-screen-parties" data-testid="orbit-parties">
          {partyLine}
        </p>
      </header>

      <div className="orbit-top">
        <section className="orbit-card" data-testid="orbit-where-card" data-expanded={whereExpanded ? "true" : "false"}>
          <button
            type="button"
            className="orbit-card-kicker orbit-heading"
            data-testid="orbit-where-toggle"
            aria-expanded={whereExpanded}
            onClick={() => setWhereOpenChoice(!whereExpanded)}
          >
            <span>Where we're at</span>
            <span className="orbit-row-chevron" aria-hidden="true">{whereExpanded ? "⌄" : "›"}</span>
          </button>
          {showBody ? (
          <>
          {nextLine ? (
            onOpenPlan && nextPlan ? (
              <button
                type="button"
                className="orbit-where-row orbit-where-row-btn"
                data-testid="orbit-next-together"
                data-state={nextState ?? undefined}
                onClick={() => onOpenPlan(nextPlan.plan_id)}
              >
                <span className="orbit-card-label orbit-heading">Next together</span>
                <span className="orbit-where-value orbit-content">{nextLine}</span>
                <span className="orbit-row-chevron" aria-hidden="true">{"›"}</span>
              </button>
            ) : (
              <p className="orbit-where-row" data-testid="orbit-next-together" data-state={nextState ?? undefined}>
                <span className="orbit-card-label orbit-heading">Next together</span>
                <span className="orbit-where-value orbit-content">{nextLine}</span>
              </p>
            )
          ) : unscheduledLine ? (
            onOpenPlan && unscheduledPlan ? (
              <button
                type="button"
                className="orbit-where-row orbit-where-row-btn"
                data-testid="orbit-next-together"
                data-state={unscheduledState ?? undefined}
                onClick={() => onOpenPlan(unscheduledPlan.plan_id)}
              >
                <span className="orbit-card-label orbit-heading">Next together</span>
                <span className="orbit-where-value orbit-content">{unscheduledLine}</span>
                <span className="orbit-row-chevron" aria-hidden="true">{"›"}</span>
              </button>
            ) : (
              <p className="orbit-where-row" data-testid="orbit-next-together" data-state={unscheduledState ?? undefined}>
                <span className="orbit-card-label orbit-heading">Next together</span>
                <span className="orbit-where-value orbit-content">{unscheduledLine}</span>
              </p>
            )
          ) : (
            <p className="orbit-where-row" data-testid="orbit-next-together">
              <span className="orbit-card-label">Next together</span>
              <span className="orbit-where-value orbit-where-value-quiet">
                Nothing is planned together yet.
              </span>
            </p>
          )}
          {slimExtraWhere.map((line, i) => (
            <p key={i} className="orbit-where-row" data-testid="orbit-where-line">
              <span className="orbit-where-value orbit-where-value-plain orbit-content">{line}</span>
            </p>
          ))}
          {slimOpenWindows.map((p) => {
            const inner = (
              <>
                <span className="orbit-card-label orbit-heading">Open window</span>
                <span className="orbit-where-value orbit-content">
                  {!p.when_label ? "Time not set yet" : "Place not set yet"}
                </span>
              </>
            );
            return onOpenPlan ? (
              <button
                key={p.plan_id}
                type="button"
                className="orbit-where-row orbit-where-row-btn"
                data-testid="orbit-open-window"
                data-state="forming"
                data-plan-id={p.plan_id}
                onClick={() => onOpenPlan(p.plan_id)}
              >
                {inner}
                <span className="orbit-row-chevron" aria-hidden="true">{"›"}</span>
              </button>
            ) : (
              <p key={p.plan_id} className="orbit-where-row" data-testid="orbit-open-window" data-state="forming">
                {inner}
              </p>
            );
          })}
{slimGlimpse.map((p) => {
            const inner = (
              <>
                <span className="orbit-stone-dot" data-state={planStateFamily(p.state)} aria-hidden="true" />
                <span className="orbit-where-value orbit-content">
                  {`${p.title}${p.when_label ? ` - ${p.when_label}` : ""}`}
                </span>
              </>
            );
            return onOpenPlan ? (
              <button key={p.plan_id} type="button" className="orbit-where-row orbit-where-row-btn orbit-glimpse-row" data-testid="orbit-glimpse-row" data-state={planStateFamily(p.state)} data-plan-id={p.plan_id} onClick={() => onOpenPlan(p.plan_id)}>
                {inner}
                <span className="orbit-row-chevron" aria-hidden="true">{"›"}</span>
              </button>
            ) : (
              <p key={p.plan_id} className="orbit-where-row orbit-glimpse-row" data-testid="orbit-glimpse-row" data-state={planStateFamily(p.state)} data-plan-id={p.plan_id}>
                {inner}
              </p>
            );
          })}
          {slimPending.map((p) => (() => {
              const pid = planIdForParty(p.id);
              const inner = (
                <span className="orbit-where-value orbit-content">
                  {`Waiting on an answer from ${p.name}.`}
                </span>
              );
              return onOpenPlan && pid ? (
                <button key={p.id} type="button" className="orbit-where-row orbit-where-row-btn" data-testid="orbit-pending-line" data-state="action" data-plan-id={pid} onClick={() => onOpenPlan(pid)}>
                  {inner}
                  <span className="orbit-row-chevron" aria-hidden="true">{"›"}</span>
                </button>
              ) : (
                <p key={p.id} className="orbit-where-row" data-testid="orbit-pending-line" data-state="action">
                  {inner}
                </p>
              );
            })())}
          {slimCooling.map((p) => (() => {
              const pid = planIdForParty(p.id);
              const inner = (
                <span className="orbit-where-value orbit-content">
                  {`${p.name}'s window is closing - still waiting on an answer.`}
                </span>
              );
              return onOpenPlan && pid ? (
                <button key={p.id} type="button" className="orbit-where-row orbit-where-row-btn" data-testid="orbit-limbo-line" data-state="limbo" data-plan-id={pid} onClick={() => onOpenPlan(pid)}>
                  {inner}
                  <span className="orbit-row-chevron" aria-hidden="true">{"›"}</span>
                </button>
              ) : (
                <p key={p.id} className="orbit-where-row" data-testid="orbit-limbo-line" data-state="limbo">
                  {inner}
                </p>
              );
            })())}
          {slimClosed.map((p) => (() => {
              const pid = planIdForParty(p.id);
              const inner = (
                <span className="orbit-where-value orbit-content">
                  {`The window closed without an answer from ${p.name}.`}
                </span>
              );
              return onOpenPlan && pid ? (
                <button key={p.id} type="button" className="orbit-where-row orbit-where-row-btn" data-testid="orbit-closed-line" data-state="limbo" data-plan-id={pid} onClick={() => onOpenPlan(pid)}>
                  {inner}
                  <span className="orbit-row-chevron" aria-hidden="true">{"›"}</span>
                </button>
              ) : (
                <p key={p.id} className="orbit-where-row" data-testid="orbit-closed-line" data-state="limbo">
                  {inner}
                </p>
              );
            })())}
          {viewerPending ? (
            <p className="orbit-where-row" data-testid="orbit-viewer-pending" data-state="action" data-plan-id={nextPlan?.plan_id ?? plans[0]?.plan_id ?? undefined}>
              <span className="orbit-card-label orbit-heading">Your move</span>
              <span className="orbit-where-value orbit-content">A plan here is waiting on your answer.</span>
            </p>
          ) : null}
          {/* Repair #21 integrator seam (W-5b x W-1): membership
              events are Where-we're-at facts, so their recorded
              lines live as rows in this card - no separate card,
              no kicker (Calm Law composition). Nothing recorded,
              nothing rendered. */}
          {slimMembership.map((event, i) => (
            <p
              key={`${event.kind ?? "membership"}-${event.at ?? i}`}
              className="orbit-where-row"
              data-testid="orbit-membership-line"
            >
              <span className="orbit-where-value orbit-where-value-plain orbit-content">{event.label}</span>
            </p>
          ))}
          {slimInsight ? (
            <p className="orbit-where-row orbit-insight" data-testid="orbit-insight">
              <span className="orbit-where-value orbit-where-value-plain orbit-content">{slimInsight}</span>
            </p>
          ) : null}
          </>
          ) : null}
        </section>

        {pastPlans.length > 0 ? (
          <section className="orbit-fold" data-testid="orbit-past-card">
            <button
              type="button"
              className="orbit-fold-toggle"
              data-testid="orbit-past-toggle"
              aria-expanded={pastOpen}
              onClick={() => setPastOpen((v) => !v)}
            >
              <span>{`What we've done - and loved (${pastPlans.length})`}</span>
              <span className="orbit-row-chevron" aria-hidden="true">{pastOpen ? "⌄" : "›"}</span>
            </button>
            {pastOpen
              ? pastPlans.map((p) => {
                  const loved = lovedOf(p);
                  const inner = (
                    <>
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
                    </>
                  );
                  return onOpenPlan ? (
                    <button
                      key={p.plan_id}
                      type="button"
                      className="orbit-fold-row orbit-fold-row-btn orbit-stone"
                      data-testid="orbit-past-row"
                      data-stone="true"
                      data-plan-id={p.plan_id}
                      onClick={() => onOpenPlan(p.plan_id)}
                    >
                      <span className="orbit-fold-row-main">{inner}</span>
                      <span className="orbit-row-chevron" aria-hidden="true">{"›"}</span>
                    </button>
                  ) : (
                    <p key={p.plan_id} className="orbit-fold-row orbit-stone" data-testid="orbit-past-row" data-stone="true" data-plan-id={p.plan_id}>
                      {inner}
                    </p>
                  );
                })
              : null}
          </section>
        ) : null}

        {pastPlans.length > 0 && pastOpen && chapters.length > 0 ? (
          <section className="orbit-fold orbit-chapters" data-testid="orbit-chapters">
            <div className="orbit-chapter-pills">
              {chapters.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className="orbit-chapter-pill"
                  data-testid="orbit-period-pill"
                  data-chapter-key={c.key}
                  data-active={activeChapter?.key === c.key ? "true" : undefined}
                  aria-selected={activeChapter?.key === c.key}
                  onClick={() => setChapterKey(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {activeChapter ? (
              <div className="orbit-chapter" data-testid="orbit-chapter" data-chapter-key={activeChapter.key}>
                {activeChapter.key === chapters[chapters.length - 1]?.key && earliestSession ? (
                  <p className="orbit-chapter-milestone" data-testid="orbit-chapter-milestone">
                    {`First chat here - ${earliestSession.title}`}
                  </p>
                ) : null}
                {activeChapter.sessions.map((cs) => (
                  <p key={cs.id} className="orbit-chapter-session" data-testid="orbit-chapter-session">
                    {cs.title}
                  </p>
                ))}
                {activeChapter.key === latestChapter?.key && pastPlans.length === 0 ? (
                  <p className="orbit-chapter-thin">Nothing settled here yet.</p>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {sessions.length > 0 ? (
          <section className="orbit-fold" data-testid="orbit-index">
            <button
              type="button"
              className="orbit-fold-toggle"
              data-testid="orbit-past-chats-toggle"
              aria-expanded={chatsOpen}
              onClick={() => setChatsOpen((v) => !v)}
            >
              <span>{`Past chats (${sessions.length})`}</span>
              <span className="orbit-row-chevron" aria-hidden="true">{chatsOpen ? "⌄" : "›"}</span>
            </button>
            {chatsOpen ? (
              <>
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
                  {"+ New chat"}
                </button>
              </>
            ) : null}
          </section>
        ) : null}
      </div>

      <section className="orbit-field" data-testid="orbit-field">
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
            data-selected={recSelected ? "true" : undefined}
            onPointerDown={(e) => {
              pressStart.current = { x: e.clientX, y: e.clientY };
              startPress();
            }}
            onPointerMove={(e) => {
              const st = pressStart.current;
              if (!st) return;
              // A moving press is a scroll, not a hold: it must
              // never ripen into a selection.
              if (Math.abs(e.clientX - st.x) + Math.abs(e.clientY - st.y) > 10) clearPress();
            }}
            onPointerUp={() => {
              clearPress();
              pressStart.current = null;
            }}
            onPointerLeave={() => { clearPress(); pressStart.current = null; }}
            onContextMenu={(e) => {
              e.preventDefault();
              setRecSelected(true);
            }}
          >
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
            {!recSelected ? (
              <p className="orbit-recommendation-hint">Hold to select</p>
            ) : null}
            {recSelected && !recEditing ? (
              <div className="orbit-recommendation-actions" data-testid="orbit-recommendation-actions">
                {onPushToChat ? (
                  <>
                    <button
                      type="button"
                      className="orbit-recommendation-place"
                      data-testid="orbit-recommendation-place"
                      onClick={() => placeInChat(recText)}
                    >
                      {placeLabel}
                    </button>
                    <p className="orbit-recommendation-place-note">
                      Lands in the composer, unsent - send or edit it there.
                    </p>
                  </>
                ) : null}
                <button
                  type="button"
                  data-testid="orbit-recommendation-adjust"
                  onClick={() => {
                    setRecEditDraft(recText);
                    setRecEditing(true);
                  }}
                >
                  Adjust in Orbit
                </button>
                {onShapeRequest ? (
                  <button
                    type="button"
                    data-testid="orbit-recommendation-another"
                    aria-label="Another take"
                    onClick={() => {
                      setRecSelected(false);
                      onShapeRequest();
                    }}
                  >
                    {"↻ Another take"}
                  </button>
                ) : null}
                <button
                  type="button"
                  data-testid="orbit-recommendation-dismiss"
                  onClick={() => {
                    setRecSelected(false);
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
              <div className="orbit-empty-info" data-testid="orbit-empty-info">
                <OrbitInfoBubble label="About this room">{emptyExplanation}</OrbitInfoBubble>
              </div>
            ) : null}
            <div className="c1-composer-bar orbit-composer-bar" data-testid="orbit-composer-bar">
              <div className="c1-composer orbit-composer" data-testid="orbit-composer">
                <input
                  className="c1-composer-input"
                  data-testid="orbit-empty-input"
                  placeholder="Message Opal"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && draft.trim()) {
                      emptyInvite.onAsk(draft.trim());
                      setDraft("");
                    }
                  }}
                />
                <div className="c1-composer-action-slot" data-testid="orbit-composer-action-slot">
                  {recording ? (
                    <span className="orbit-recording" data-testid="orbit-composer-recording">
                      <span className="orbit-recording-label">Recording</span>
                      <button type="button" className="orbit-composer-stop" data-testid="orbit-composer-stop" aria-label="Stop recording" onClick={stopVoice}>{"■"}</button>
                    </span>
                  ) : draft.trim() ? (
                    <button
                      type="button"
                      className="c1-send is-active orbit-send-primary"
                      data-testid="orbit-empty-send"
                      aria-label="Send"
                      onClick={() => {
                        emptyInvite.onAsk(draft.trim());
                        setDraft("");
                      }}
                    >
                      {"↑"}
                    </button>
                  ) : (
                    <button type="button" className="orbit-composer-mic" data-testid="orbit-composer-mic" aria-label="Record a voice note" onClick={startVoice}>
                      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" /></g></svg>
                    </button>
                  )}
                </div>
              </div>
              {voiceNote ? (
                <p className="orbit-voice-note" data-testid="orbit-voice-note">{voiceNote}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
