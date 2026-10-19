/**
 * Repair #18 C1 - local visual review harness (review-only route,
 * ?review=c1&surface=<name>&mode=<light|dark>).
 *
 * Renders the NEW C1 surfaces from hand-built PlanProjection fixtures
 * so the redesign can be screenshot-verified through the real served
 * path (Vite build -> browser) in both modes. These fixtures are
 * review data only: they are never on the member user path, carry
 * data-review-fixture, and no surface here reads them as live truth.
 */
import React, { useState } from "react";
import {
  CenterChat,
  CenterRest,
  CenterSessionList,
  PeopleChatsList,
  ThreadShell,
  greetingForHour,
  type ThreadMsg,
} from "./C1Surfaces";
import { PlanCard, PlanDetailSheet } from "./PlanCard";
import type { PlanProjection } from "./planProjection";

const F = (name: string) => ({
  name,
  initials: name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
});

export const REVIEW_PLANS: Record<string, PlanProjection> = {
  dinner: {
    id: "plan-dinner",
    title: "Dinner at Juniper and Ivy",
    state: "ready",
    stateLabel: "Ready",
    primaryAction: { kind: "view", label: "View plan" },
    when: { kind: "canonical", label: "Thu, Oct 22 at 7:30 PM" },
    where: { kind: "place", name: "Juniper and Ivy", area: "North Park" },
    attendance: {
      going: 3, interested: 1, total: 4, viewerState: "going",
      faces: [F("Maya Chen"), F("Jordan Lee"), F("Sam Ortiz")],
    },
    participants: [
      { name: "Maya Chen", face: F("Maya Chen"), response: "Going" },
      { name: "Jordan Lee", face: F("Jordan Lee"), response: "Going" },
      { name: "Sam Ortiz", face: F("Sam Ortiz"), response: "Going" },
      { name: "Alex Ray", face: F("Alex Ray"), response: "Interested" },
    ],
  },
  rooftop: {
    id: "plan-rooftop",
    title: "Rooftop Jazz",
    state: "happening",
    stateLabel: "Happening",
    primaryAction: { kind: "view", label: "View plan" },
    when: { kind: "canonical", label: "Today at 8:00 PM" },
    where: { kind: "place", name: "Zilker Park Rooftop" },
    attendance: {
      going: 4, interested: 0, total: 5, viewerState: "going",
      faces: [F("Maya Chen"), F("Jordan Lee"), F("Sam Ortiz"), F("Alex Ray")],
    },
  },
  hike: {
    id: "plan-hike",
    title: "Morning hike at Torrey Pines",
    state: "forming",
    stateLabel: "Forming",
    primaryAction: { kind: "pickTime", label: "Pick a time" },
    when: { kind: "labelOnly", label: "Saturday" },
    where: { kind: "unset" },
    attendance: null,
  },
  call: {
    id: "plan-call",
    title: "Catch-up call with Jordan",
    state: "action",
    stateLabel: "Action needed",
    primaryAction: { kind: "respond", label: "Review and respond" },
    when: { kind: "canonical", label: "Fri, Oct 23 at 6:00 PM" },
    where: { kind: "virtual", label: "Video call" },
    attendance: {
      going: 1, interested: 0, total: 2, viewerState: "invited",
      faces: [F("Jordan Lee")],
    },
    proposal: { proposerName: "Jordan", newLabel: "6:00 PM", currentLabel: "5:30 PM" },
    conflict: { title: "Dinner at Juniper and Ivy", timeLabel: "7:30 PM" },
  },
  brunch: {
    id: "plan-brunch",
    title: "Brunch at Morning Glory",
    state: "past",
    stateLabel: "Past",
    primaryAction: { kind: "view", label: "View plan" },
    when: { kind: "canonical", label: "Sun, Oct 11 at 10:00 AM" },
    where: { kind: "place", name: "Morning Glory", area: "Little Italy" },
    attendance: {
      going: 2, interested: 0, total: 2, viewerState: "going",
      faces: [F("Maya Chen")],
    },
  },
};

const THREAD_MESSAGES: ThreadMsg[] = [
  { id: "m1", authorKind: "person", body: "Dinner Thursday still good for everyone?" },
  { id: "m2", authorKind: "person", own: true, body: "Yes - Juniper and Ivy at 7:30 works for me." },
  // Repair #19 W14 — separation: a person thread never carries an
  // Opal-authored message. The thread's plan card rides a PERSON
  // message (the graph record belongs to the thread's people); the
  // Opal-authored form lives only in CENTER_MESSAGES below.
  { id: "m3", authorKind: "person", body: "", planId: "plan-dinner" },
  { id: "m4", authorKind: "system", body: "Time updated to 7:30 PM." },
  { id: "m5", authorKind: "person", body: "Perfect, see you there." },
];

const CENTER_MESSAGES: ThreadMsg[] = [
  { id: "c1", authorKind: "person", own: true, body: "Plan dinner with Maya and Jordan this week." },
  { id: "c2", authorKind: "opal", body: "Here is what is set so far. One piece still needs you." },
  { id: "c3", authorKind: "opal", body: "", planId: "plan-call" },
];

export function C1Review() {
  const params = new URLSearchParams(window.location.search);
  const surface = params.get("surface") || "center";
  const mode = (params.get("mode") === "light" ? "light" : "dark") as "light" | "dark";
  const [sheet, setSheet] = useState<PlanProjection | null>(
    surface === "sheet" ? REVIEW_PLANS.call : null,
  );
  const plansById = new Map(Object.values(REVIEW_PLANS).map((p) => [p.id, p]));
  const wrap = (node: React.ReactNode) => (
    <div data-design="r18" data-mode={mode} data-review-fixture="c1" style={{ background: "var(--canvas)" }}>
      {node}
      {sheet ? (
        <PlanDetailSheet plan={sheet} mode={mode} onClose={() => setSheet(null)} />
      ) : null}
    </div>
  );

  switch (surface) {
    case "centerlist":
      return wrap(
        <CenterSessionList
          sessions={[
            { id: "s1", title: "Dinner with Maya and Jordan", preview: "Here is what is set so far.", timeLabel: "4:12 PM", isActive: true, context: null },
            { id: "s2", title: "Weekend hike ideas", preview: "Torrey Pines on Saturday morning?", timeLabel: "11:02 AM", isActive: false, context: { personId: "u-maya", personName: "Maya Chen" }, anchor: { type: "person", id: "u-maya", label: "Maya Chen" } },
            { id: "s3", title: "Chat on Wed, Oct 14", preview: "Flights for the Dallas trip.", timeLabel: "Wed", isActive: false, context: { personId: "u-maya", personName: "Maya Chen" }, anchor: { type: "person", id: "u-maya", label: "Maya Chen" } },
          ]}
        />,
      );
    case "centerchat":
      return wrap(
        <CenterChat
          title="Dinner with Maya and Jordan"
          messages={CENTER_MESSAGES}
          plansById={plansById}
          onOpenPlan={setSheet}
        />,
      );
    case "chats":
      return wrap(
        <PeopleChatsList
          chats={[
            { id: "p1", name: "Maya Chen", initials: "MC", preview: "Perfect, see you there.", timeLabel: "4:12 PM", unread: true, plan: REVIEW_PLANS.dinner },
            { id: "p2", name: "Jordan Lee", initials: "JL", preview: "Rooftop tonight?", timeLabel: "2:40 PM", unread: false, plan: REVIEW_PLANS.rooftop },
            { id: "p3", name: "Hike crew", initials: "HC", preview: "Saturday could work.", timeLabel: "Yesterday", unread: false, plan: REVIEW_PLANS.hike },
            { id: "p4", name: "Sam Ortiz", initials: "SO", preview: "Thanks for brunch!", timeLabel: "Sun", unread: false, plan: null },
          ]}
        />,
      );
    case "thread":
      return wrap(
        <ThreadShell
          name="Maya Chen"
          initials="MC"
          sharedLine="Dinner - Thu 7:30 PM"
          nextPlan={REVIEW_PLANS.dinner}
          messages={THREAD_MESSAGES}
          plansById={plansById}
          contextualChip="Find a time"
          composerPlaceholder="Message Maya"
        />,
      );
    case "states":
      return wrap(
        <div className="c1-surface" data-testid="c1-states-board">
          <h1 className="c1-display">One plan, every state</h1>
          {Object.values(REVIEW_PLANS).map((p) => (
            <PlanCard key={p.id} plan={p} size="thread" />
          ))}
          <PlanCard plan={{ id: "broken" }} size="thread" />
        </div>,
      );
    case "sheet":
      return wrap(
        <ThreadShell
          name="Jordan Lee"
          initials="JL"
          nextPlan={REVIEW_PLANS.call}
          messages={[{ id: "j1", authorKind: "person", body: "Can we move the call to 6?" }]}
          plansById={plansById}
          composerPlaceholder="Message Jordan"
        />,
      );
    default:
      return wrap(
        <CenterRest
          greeting={greetingForHour(19)}
          nowNodes={[
            { id: "n1", timeLabel: "Now", title: "Rooftop Jazz", detail: "with Maya Chen, Jordan Lee - Zilker Park Rooftop", live: true, plan: REVIEW_PLANS.rooftop },
            { id: "n2", timeLabel: "7:30 PM", title: "Dinner at Juniper and Ivy", detail: "with Maya Chen - North Park", plan: REVIEW_PLANS.dinner },
          ]}
          suggestions={["Plan a hike this weekend", "Call Jordan back"]}
          onOpenPlan={setSheet}
        />,
      );
  }
}
