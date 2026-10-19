/**
 * Repair #18 - Division C2 - shell REVIEW harness (dev evidence only,
 * reached at ?review=c2shell&surface=<name>&mode=<light|dark>).
 *
 * This follows the codebase's established review pattern (the C2
 * foundation gallery, the availability review): it renders the REAL
 * shell surface components fed by review projections so rendered
 * evidence (screenshots, hit-tests, no-truncation checks) can be
 * captured at phone size in both modes without a live backend. The
 * projections below are review data, labeled data-review="1" on the
 * root; they are never used by the member shell path, which builds
 * projections from the product API only (shellData.ts).
 */
import React, { useEffect } from "react";
import { applyC2Mode } from "../../theme/c2Mode";
import type { PlanCardC2Input } from "../PlanCardC2";
import { C2Home } from "./C2Home";
import { C2Graphs, C2GraphDetail } from "./C2Graphs";
import { C2YouHub, C2SettingsSection } from "./C2You";
import { C2CenterOpening } from "./C2CenterOpening";
import { C2Onboarding } from "./C2Onboarding";
import { avatarOf } from "./shellData";
import type {
  GraphDetailProjection,
  GraphListProjection,
  HomeProjection,
} from "./projections";
import "./c2shell.css";

const LONG_TITLE =
  "Dinner at Juniper and Ivy with everyone from the old neighborhood crew plus two visiting cousins";
const LONG_WHERE = "Juniper and Ivy, North Park, the long table by the window near the kitchen pass";

function card(partial: Partial<PlanCardC2Input> & { id: string }): PlanCardC2Input & { id: string } {
  return {
    stateFamily: "ready",
    stateLabel: "Ready",
    title: "Dinner at Juniper and Ivy",
    whenLine: "Thu, Oct 22 at 7:30 PM",
    whereLine: "Juniper and Ivy, North Park",
    attendanceLine: "3 of 4 going",
    primaryActionLabel: null,
    ...partial,
  };
}

const REVIEW_CARDS = {
  action: card({
    id: "review-action",
    stateFamily: "action",
    stateLabel: "Action needed",
    title: LONG_TITLE,
    whenLine: "Fri, Oct 23 at 8:00 PM",
    whereLine: LONG_WHERE,
    attendanceLine: "2 of 5 going",
    primaryActionLabel: "Review and respond",
  }),
  formingTime: card({
    id: "review-forming-time",
    stateFamily: "forming",
    stateLabel: "Forming",
    title: "Beach walk and coffee after",
    whenLine: "Time not set yet.",
    whereLine: "Oceanside Pier",
    attendanceLine: null,
    primaryActionLabel: "Pick a day",
  }),
  formingPlace: card({
    id: "review-forming-place",
    stateFamily: "forming",
    stateLabel: "Forming",
    title: "Sunday reset brunch",
    whenLine: "Sun, Oct 25 at 11:00 AM",
    whereLine: null,
    attendanceLine: "1 of 3 going",
    primaryActionLabel: "Add a place",
  }),
  ready: card({ id: "review-ready" }),
  happening: card({
    id: "review-happening",
    stateFamily: "happening",
    stateLabel: "Live",
    title: "Rooftop Jazz",
    whenLine: "Tonight at 8 PM",
    whereLine: "Zilker Park Rooftop",
    attendanceLine: "12 going",
  }),
  past: card({
    id: "review-past",
    stateFamily: "past",
    stateLabel: "Past",
    title: "Morning hike at Torrey Pines",
    whenLine: "Sat, Oct 10 at 7:00 AM",
    whereLine: "Torrey Pines",
    attendanceLine: "4 of 4 going",
  }),
};

function reviewGraphList(): GraphListProjection {
  return {
    groups: [
      {
        id: "g-action",
        kind: "needs-detail",
        title: "Needs your answer",
        cards: [REVIEW_CARDS.action],
      },
      {
        id: "g-needs",
        kind: "needs-detail",
        title: "Needs a day or a detail",
        cards: [
          { ...REVIEW_CARDS.formingTime, completionAction: { label: "Pick a day", slotKind: "time" } },
          { ...REVIEW_CARDS.formingPlace, completionAction: { label: "Add a place", slotKind: "place" } },
        ],
      },
      {
        id: "g-coming",
        kind: "coming-up",
        title: "Coming up",
        cards: [REVIEW_CARDS.happening, REVIEW_CARDS.ready],
      },
      { id: "g-past", kind: "past", title: "Past", cards: [REVIEW_CARDS.past] },
    ],
    lensCounts: { all: 6, action: 3, ready: 2, past: 1 },
    timelineAvailable: true,
  };
}

function reviewDetail(): GraphDetailProjection {
  return {
    id: REVIEW_CARDS.action.id,
    title: REVIEW_CARDS.action.title,
    card: REVIEW_CARDS.action,
    attendanceLine: "2 of 5 going",
    whenLine: "Fri, Oct 23 at 8:00 PM",
    where: { label: LONG_WHERE, kind: "place", handoffLabel: null },
    who: [
      { name: "Maya Chen", avatar: avatarOf("Maya Chen", 1), responseLabel: "Going" },
      { name: "Jordan Lee", avatar: avatarOf("Jordan Lee", 2), responseLabel: "Going" },
      { name: "Sam Rivera", avatar: avatarOf("Sam Rivera", 3), responseLabel: "Invited" },
      { name: "Alex Park", avatar: avatarOf("Alex Park", 4), responseLabel: "Interested" },
      { name: "Nina Brooks", avatar: avatarOf("Nina Brooks", 5), responseLabel: "Not going" },
    ],
    nextAction: { id: "review", label: "Review and respond" },
    activity: [
      { line: "Maya suggested 8:00 PM. It is 7:30 PM now.", timeLabel: "2h ago" },
      { line: "Jordan joined.", timeLabel: "3h ago" },
    ],
    history: [{ line: "Earlier version: dinner on Thursday at 7 PM." }],
    origin: "graphs",
  };
}

function reviewHome(): HomeProjection {
  return {
    header: { ownAvatar: avatarOf("Sadeil Lewis"), activityUnseenCount: 3 },
    rail: {
      self: { avatar: avatarOf("Sadeil Lewis"), hasLiveStory: false, liveStoryLabel: null },
      stories: [
        { id: "s1", personName: "Maya Chen", avatar: avatarOf("Maya Chen", 1), seen: false, ringKind: "unseen", storyCount: 2 },
        { id: "s2", personName: "Jordan Lee", avatar: avatarOf("Jordan Lee", 2), seen: false, ringKind: "happening", storyCount: 1 },
        { id: "s3", personName: "Sam Rivera", avatar: avatarOf("Sam Rivera", 3), seen: true, ringKind: "seen", storyCount: 1 },
        { id: "s4", personName: "Alex Park", avatar: avatarOf("Alex Park", 4), seen: true, ringKind: "seen", storyCount: 3 },
      ],
      capabilities: { canPost: true, canStory: true },
    },
    feed: [
      { kind: "plan", id: REVIEW_CARDS.happening.id, card: REVIEW_CARDS.happening },
      {
        kind: "memory",
        id: "m1",
        contextLine: "Golden hour at the pier, last Sunday",
        authorLine: "Maya Chen - with you and Jordan",
      },
      { kind: "plan", id: REVIEW_CARDS.ready.id, card: REVIEW_CARDS.ready },
      {
        kind: "live",
        id: "l1",
        title: "Live now: rooftop session",
        contextLine: "Jordan is live from Zilker Park Rooftop",
        actionLabel: "Watch",
        actionId: "watch",
      },
    ],
  };
}

const noop = () => undefined;
const noopAsync = async () => undefined;
/** Review fixtures never cancel; the dropPlan contract resolves null
 *  (success) so a fixture confirm simply closes its sheet. */
const noopDrop = async (): Promise<string | null> => null;

export function C2ShellReview({ surface }: { surface: string }) {
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const mode = q.get("mode");
    if (mode === "light" || mode === "dark") applyC2Mode(mode);
    document.documentElement.setAttribute("data-shell", "c2");
  }, []);

  let body: React.ReactNode = null;
  if (surface === "home") {
    body = (
      <C2Home
        projection={reviewHome()}
        events={{
          openYou: noop,
          openSearch: noop,
          openActivity: noop,
          openGraph: noop,
          feedAction: noop,
          onShared: noop,
        }}
      />
    );
  } else if (surface === "graphs") {
    body = (
      <C2Graphs
        projection={reviewGraphList()}
        events={{
          openGraph: noop,
          createPlan: noop,
          createTrip: noop,
          createIdea: noop,
          completeSlot: noop,
          dropPlan: noopDrop,
          runNextAction: noop,
          addPeople: noop,
          openChatForPlan: noop,
          back: noop,
        }}
      />
    );
  } else if (surface === "detail") {
    body = (
      <C2GraphDetail
        detail={reviewDetail()}
        events={{
          openGraph: noop,
          createPlan: noop,
          createTrip: noop,
          createIdea: noop,
          completeSlot: noop,
          dropPlan: noopDrop,
          runNextAction: noop,
          addPeople: noop,
          openChatForPlan: noop,
          back: noop,
        }}
      />
    );
  } else if (surface === "center") {
    body = (
      <C2CenterOpening
        projection={{
          greeting: "Good evening, Sadeil.",
          nudgeLine: "Maya is waiting on your answer for Friday.",
          presence: "idle",
          celebrateOnce: false,
          needsYou: [REVIEW_CARDS.action],
          next: {
            id: REVIEW_CARDS.happening.id,
            timeLabel: "Tonight at 8 PM",
            title: "Rooftop Jazz",
            line: "Zilker Park Rooftop - 12 going",
            card: REVIEW_CARDS.happening,
          },
          comingUp: [REVIEW_CARDS.ready],
          forming: [
            { ...REVIEW_CARDS.formingTime, completionAction: { label: "Pick a day", slotKind: "time" } },
          ],
        }}
        events={{ openGraph: noop, makeSomethingHappen: noop, completeSlot: noop }}
      />
    );
  } else if (surface === "you") {
    body = (
      <C2YouHub
        projection={{
          profile: { name: "Sadeil Lewis", handle: "sadeil", avatar: avatarOf("Sadeil Lewis") },
          accountNote: null,
          connectedSummary: "Google Calendar connected.",
          index: [
            { key: "edit-profile", title: "Edit profile", subtitle: "Name and username", keywords: "name" },
            { key: "appearance", title: "Appearance", subtitle: "Pick your light", keywords: "mode" },
            { key: "privacy", title: "Privacy", subtitle: "You choose who sees what", keywords: "privacy" },
            { key: "calls-assist", title: "Opal Assist and calls", subtitle: "Help on calls, only when you say so", keywords: "assist" },
            { key: "what-opal-remembers", title: "What Opal remembers", subtitle: "Facts Opal keeps, and forgetting them", keywords: "memory" },
            { key: "connected-sources", title: "Connected sources", subtitle: "Google Calendar connected", keywords: "google" },
            { key: "notifications", title: "Notifications", subtitle: "Loud for people. Quiet for noise.", keywords: "notifications" },
            { key: "linked-devices", title: "Linked devices", subtitle: "Where you are signed in", keywords: "devices" },
            { key: "location-travel", title: "Location and travel", subtitle: "Timing that follows you", keywords: "travel" },
            { key: "account-security", title: "Account and security", subtitle: "Your account, your call", keywords: "account" },
          ],
        }}
        events={{
          editProfile: noop,
          openSection: noop,
          backToHub: noop,
          setPreference: noopAsync,
          runAction: noop,
          saveProfileFields: noopAsync,
          submitSupportReport: async () => ({ reference: "OPAL-TEST" }),
          setModePreference: noop,
          modePreference: "system",
        }}
      />
    );
  } else if (surface === "settings-notifications") {
    body = (
      <C2SettingsSection
        section={{
          key: "notifications",
          title: "Notifications",
          lede: "Loud for people. Quiet for noise.",
          rows: [
            { kind: "toggle", id: "messages-calls", title: "Messages and calls", subtitle: "Direct contact that needs a reply.", value: true },
            { kind: "toggle", id: "read-receipts", title: "Read receipts", subtitle: "Show when you have seen a message.", value: false },
            { kind: "note", id: "push-note", text: "Push categories for Graph changes and live movement are not wired on this device yet, so they are not listed here." },
          ],
        }}
        events={{
          editProfile: noop,
          openSection: noop,
          backToHub: noop,
          setPreference: noopAsync,
          runAction: noop,
          saveProfileFields: noopAsync,
          submitSupportReport: async () => ({ reference: "OPAL-TEST" }),
          setModePreference: noop,
          modePreference: "system",
        }}
      />
    );
  } else if (surface === "settings-appearance") {
    body = (
      <C2SettingsSection
        section={{
          key: "appearance",
          title: "Appearance",
          lede: "Pick your light. Opal keeps it everywhere.",
          rows: [
            { kind: "value", id: "reduce-motion", title: "Reduce motion", value: "Off (from your device)" },
            { kind: "note", id: "mode-note", text: "Mode applies the moment you pick it. Nothing reloads." },
          ],
        }}
        events={{
          editProfile: noop,
          openSection: noop,
          backToHub: noop,
          setPreference: noopAsync,
          runAction: noop,
          saveProfileFields: noopAsync,
          submitSupportReport: async () => ({ reference: "OPAL-TEST" }),
          setModePreference: noop,
          modePreference: "dark",
        }}
      />
    );
  } else if (surface === "onboarding") {
    body = <C2Onboarding events={{ complete: noop, backToSplash: noop }} />;
  } else {
    body = <p style={{ padding: 24 }}>Unknown review surface.</p>;
  }

  const dockSurfaces: Record<string, string> = {
    home: "home",
    chats: "home",
    center: "center",
    graphs: "graphs",
    you: "you",
  };
  const showDock = surface in dockSurfaces || ["graphs", "home", "center", "you"].includes(surface);
  const goSurface = (next: string) => {
    const q = new URLSearchParams(window.location.search);
    q.set("review", "c2shell");
    q.set("surface", next);
    window.location.search = q.toString();
  };
  return (
    <div className="c2s-root" data-shell="c2" data-review="1" data-review-surface={surface}>
      <div className="c2s-column">
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>{body}</div>
        {showDock ? (
          <nav className="c2s-dock" aria-label="Main (review)">
            {(
              [
                { key: "home", label: "Home" },
                { key: "chats", label: "Chats" },
                { key: "center", label: "Center" },
                { key: "graphs", label: "Graphs" },
                { key: "you", label: "You" },
              ] as const
            ).map((slot) =>
              slot.key === "center" ? (
                <button
                  key={slot.key}
                  type="button"
                  className="c2s-dock-center"
                  aria-label="Opal Center"
                  onClick={() => goSurface("center")}
                >
                  <span className="c2s-dock-center-disc">
                    <span style={{ fontWeight: 700 }}>O</span>
                  </span>
                </button>
              ) : (
                <button
                  key={slot.key}
                  type="button"
                  className="c2s-dock-slot"
                  data-active={surface === slot.key ? "1" : undefined}
                  onClick={() => goSurface(slot.key === "chats" ? "home" : slot.key)}
                >
                  <span className="c2s-dock-glyph">{slot.label.slice(0, 1)}</span>
                  <span>{slot.label}</span>
                </button>
              ),
            )}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
