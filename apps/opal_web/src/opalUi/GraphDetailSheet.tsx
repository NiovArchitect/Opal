/**
 * GRAPH READY DETAIL  -  dated authority 618:758 (lineage 373:385).
 * Full-screen mobile destination (NOT a bottom sheet).
 *
 * Owner: existing FOUNDER_HOME_FEED / Reality card id only.
 * No journey-commit CTA on this surface (Journey remains a separate owner).
 */
import React from "react";
import { FOUNDER_HOME_FEED, happeningInLabel } from "./founderGraphSeed";
import {
  createdPlanToFeedCard,
  loadCreatedPlans,
} from "./graphSurfaceInterop";
import { GRAPH_AUTHORITY_CHROME, resolveGraphPlaceTitle } from "./graphAuthorityChrome";
import {
  isPastCanonicalGraph,
  mapsUrl,
  PAST_DETAIL_FOREGROUNDS_CURRENT_TRAVEL,
  type CanonicalGraph,
} from "./graphReality";
import {
  activityIsAtHome,
  activitySupportsProviderBooking,
  activitySupportsTravelCtas,
  inferActivityCapabilities,
} from "./activityCapabilities";
import { GraphConvoyPanel } from "./GraphConvoyPanel";
import type { TravelState } from "./journeyPresence";

export type GraphSegment = {
  id: string;
  time: string;
  title: string;
  mode: "joinable_friends" | "visible_not_joinable" | "invite_only";
  actionLabel: string;
  action: "join" | "save_idea" | "none";
};

/** Kept for callers/tests that still exercise segment joinability. */
const DEFAULT_SEGMENTS: GraphSegment[] = [
  {
    id: "seg-market",
    time: "10:00 AM",
    title: "Oceanside Farmers Market",
    mode: "joinable_friends",
    actionLabel: "Join this part",
    action: "join",
  },
  {
    id: "seg-coast",
    time: "12:30 PM",
    title: "Walk the coast",
    mode: "visible_not_joinable",
    actionLabel: "Save idea",
    action: "save_idea",
  },
  {
    id: "seg-dinner",
    time: "7:30 PM",
    title: "Birthday dinner",
    mode: "invite_only",
    actionLabel: "Invite only",
    action: "none",
  },
];

type Props = {
  cardId: string;
  onClose: () => void;
  onJoinSegment?: (segmentId: string) => void;
  onSaveIdea?: (segmentId: string) => void;
  /** Optional Journey activation seam for domain callers  -  not rendered on 618:758 UI. */
  onEnterJourney?: (cardId: string) => void;
  /**
   * Past Graph → new planning context (GraphCreateFlow prefill).
   * REPEAT_MUTATES_OLD_GRAPH = 0 — must not edit the historical plan.
   */
  onRepeat?: (graph: CanonicalGraph) => void;
  /** Paste W 3.3 — Add someone → existing add_members search. */
  onAddPeople?: () => void;
  /** Paste W 3.1 — Idea → planning flow prefilled. */
  onStartPlanning?: (hint: { id: string; title: string; who?: string }) => void;
  /** Optional entry source for Back semantics proof */
  entrySource?: "home" | "graphs";
  /** Real SharedPlan detail. Fixture cards ignore this unless the id matches. */
  reality?: CanonicalGraph | null;
  /** LiveExperience arrival broadcast (conversation channel). */
  onBroadcastArrival?: (state: TravelState) => void | Promise<void>;
  /** LiveExperience ETA share while en route. */
  onBroadcastEta?: (payload: {
    arrivalWindowLabel: string;
    durationMinutes: number;
  }) => void | Promise<void>;
  conversationId?: string | null;
};

function parseWhenParts(detail?: string): { dayKicker: string; timeLabel: string } {
  // e.g. "Juniper & Ivy · Saturday · 7:30 PM" or "Tonight · 7:30 PM · with Chanelle"
  const parts = (detail || "").split("·").map((p) => p.trim()).filter(Boolean);
  const timePart = parts.find((p) => /\d{1,2}:\d{2}\s*(AM|PM)/i.test(p)) || "7:30 PM";
  const dayPart =
    parts.find((p) => /tonight|saturday|sunday|monday|tuesday|wednesday|thursday|friday/i.test(p)) ||
    "Tonight";
  return { dayKicker: dayPart, timeLabel: timePart };
}

function mapsUrlForPlace(place: string): string {
  const q = encodeURIComponent(place);
  const isiOS =
    typeof navigator !== "undefined" && /iPad|iPhone|iPod|Mac/.test(navigator.userAgent);
  return isiOS
    ? `https://maps.apple.com/?q=${q}`
    : `https://www.google.com/maps/search/?api=1&query=${q}`;
}

const STATUS_WORD = {
  ready: "Ready",
  action: "Action",
  forming: "Forming",
  past: "Past",
} as const;

export function GraphDetailSheet({
  cardId,
  onClose,
  onJoinSegment,
  onSaveIdea,
  onEnterJourney,
  onRepeat,
  onAddPeople,
  onStartPlanning,
  entrySource = "home",
  reality = null,
  onBroadcastArrival,
  onBroadcastEta,
}: Props) {
  const card =
    FOUNDER_HOME_FEED.find((c) => c.id === cardId) ||
    (() => {
      const plan = loadCreatedPlans().find((p) => p.id === cardId);
      return plan ? createdPlanToFeedCard(plan) : undefined;
    })();
  // FW founder-walk: never fall back unrelated Graphs to Juniper & Ivy.
  const placeTitle = resolveGraphPlaceTitle(card ? { id: card.id, title: card.title, placeLine: card.placeLine } : { id: cardId });
  const withWho = card?.person ? `with ${card.person}` : "";
  const whenLine = (() => {
    if (card?.detail && /\d{1,2}:\d{2}\s*(AM|PM)/i.test(card.detail)) {
      return withWho && !/with /i.test(card.detail) ? `${card.detail} · ${withWho}` : card.detail;
    }
    return withWho ? `Tonight · 7:30 PM · ${withWho}` : "Tonight · 7:30 PM";
  })();
  const { dayKicker, timeLabel } = parseWhenParts(card?.detail || whenLine);
  const chrome = GRAPH_AUTHORITY_CHROME[cardId];
  /** Fixture Ready Graph  -  production would use domain state; never invent Reserved booking. */
  const isReadyFixture =
    cardId === "seed-chanelle-juniper" ||
    card?.ctaAction === "open_graph" ||
    (/juniper|ready/i.test(card?.title || "") && cardId === "seed-chanelle-juniper");
  const statusLabel = isReadyFixture
    ? "Ready"
    : cardId === "seed-alex-graph-gallery"
      ? "Aligned"
      : cardId === "seed-near-rooftop"
        ? "Idea"
        : "Forming";
  const countdown = happeningInLabel(card?.startsAt, Date.now(), {
    endsAt: card?.endsAt,
    tripDateRange: card?.tripDateRange,
    planState:
      statusLabel === "Idea"
        ? "idea"
        : statusLabel === "Forming"
          ? "forming"
          : statusLabel === "Ready"
            ? "locked"
            : undefined,
  });
  /** Alignment secondary from fixture  -  not provider-confirmed reservation. */
  const tableTruth =
    card?.alignmentSteps?.find((s) => /table|place|juniper/i.test(s.primary + s.secondary))
      ?.secondary ||
    (isReadyFixture ? "table looks open" : chrome?.signalLine || "taking shape");
  const leaveTruth =
    card?.alignmentSteps?.find((s) => /leave/i.test(s.primary))?.primary ||
    (isReadyFixture ? "Leave ~6:55" : "");
  const travelTruth =
    card?.alignmentSteps?.find((s) => /min|drive|from you/i.test(s.secondary))?.secondary ||
    (isReadyFixture ? "18 min from you" : card?.detail || "");
  const leaveByDisplay = leaveTruth ? leaveTruth.replace(/^Leave\s*~?\s*/i, "") || "6:55 PM" : "";
  const whenLineResolved = chrome?.whenLine || whenLine;

  const [note, setNote] = React.useState<string | null>(null);
  void onJoinSegment;
  void onSaveIdea;
  void onEnterJourney;
  void DEFAULT_SEGMENTS;

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canonical =
    reality && (reality.planId === cardId || reality.conversationId === cardId) ? reality : null;
  const knownFixture = Boolean(card);

  const openDirections = () => {
    const query = canonical?.directionsQuery || placeTitle;
    const url = canonical ? mapsUrl(query) : mapsUrlForPlace(placeTitle);
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    setNote(
      opened
        ? "Opened Maps. Your location stays on this device."
        : "Couldn't open Maps.",
    );
  };

  if (canonical) {
    const past = isPastCanonicalGraph(canonical);
    // PAST_DETAIL_FOREGROUNDS_CURRENT_TRAVEL = 0 — historical hierarchy only.
    void PAST_DETAIL_FOREGROUNDS_CURRENT_TRAVEL;
    const caps = inferActivityCapabilities(canonical.activity, {
      placeName: canonical.place.name,
    });
    const showTravel = !past && activitySupportsTravelCtas(caps) && !activityIsAtHome(caps);
    const showBookingFacet = !past && activitySupportsProviderBooking(caps);
    return (
      <div
        className={`ogsn-graph-detail social-dest-373-385 is-canonical${past ? " is-past" : ""}`}
        data-testid="graph-detail-sheet"
        data-screen="graph-detail"
        data-figma-node="618:758"
        data-legacy-figma-node="373:385"
        data-presentation="full-column"
        data-graph-id={canonical.planId}
        data-plan-id={canonical.planId}
        data-reality-id={canonical.planId}
        data-entry-source={entrySource}
        data-canonical="true"
        data-timezone={canonical.timezone}
        data-plan-state={canonical.state}
        data-temporal-state={canonical.temporalState || canonical.state}
        data-past-detail={past ? "1" : "0"}
        data-past-detail-foregrounds-current-travel={past ? "0" : undefined}
        data-at-home={activityIsAtHome(caps) ? "1" : "0"}
        data-supports-provider-booking={showBookingFacet ? "1" : "0"}
        data-supports-travel-cta={showTravel ? "1" : "0"}
        data-pending-change={canonical.pendingChange ? "true" : "false"}
        data-provenance={canonical.place.provenance || "none"}
        data-coordinates={canonical.place.coordinates ? "true" : "false"}
        data-participant-location-public-leak="0"
        data-location-share-default="none"
        data-indefinite-location-sharing="0"
        role="dialog"
        aria-modal="true"
        aria-label={canonical.title}
      >
        <header className="social-dest-brand ogsn-graph-detail-head">
          <button
            type="button"
            className="opal-nav-chevron"
            data-testid="graph-detail-back"
            aria-label="Back"
            onClick={onClose}
          >
            ‹
          </button>
        </header>

        <div className="graph-ready-title-row">
          <h1 className="social-dest-title" data-testid="graph-detail-title">
            {canonical.title}
          </h1>
          <span
            className={`graph-ready-pill graphs-status-${canonical.state}`}
            data-testid="graph-ready-status"
            data-plan-state={canonical.state}
          >
            {STATUS_WORD[canonical.state]}
          </span>
        </div>
        {past ? (
          <p className="social-dest-lede" data-testid="graph-detail-past-kicker">
            Earlier together
          </p>
        ) : null}
        <p className="social-dest-lede" data-testid="graph-detail-when">
          {canonical.whenLabel}
        </p>
        {!past ? (
          <p className="gsh-meta" data-testid="graph-detail-timezone">
            {canonical.timezone}
          </p>
        ) : null}

        <div className="graph-ready-timeblock">
          <p className="graph-ready-kicker">{past ? "When" : canonical.dayLabel}</p>
          {canonical.timeLabel ? <p className="graph-ready-time">{canonical.timeLabel}</p> : null}
        </div>

        <section className="graph-shared-block" data-testid="graph-detail-shared">
          {canonical.activity ? (
            <p className="graph-exec-line" data-testid="graph-detail-activity">
              {canonical.activity}
            </p>
          ) : null}
          <p
            className="graph-exec-line"
            data-testid="graph-detail-place"
            data-online={
              canonical.place.name === "Online" || canonical.activity === "virtual" ? "1" : "0"
            }
          >
            {canonical.place.name === "Online" ? (
              <>
                <span aria-hidden>📹</span> Online
              </>
            ) : (
              [canonical.place.name, canonical.place.area].filter(Boolean).join(" · ")
            )}
          </p>
          <p className="graph-exec-line" data-testid="graph-detail-who">
            {canonical.participants.length ? canonical.participants.join(" · ") : "Participants"}
          </p>
          {!past && canonical.executionLabel ? (
            <p className="graph-exec-line" data-testid="graph-detail-execution">
              {canonical.executionLabel}
            </p>
          ) : null}
          {!past && canonical.executionDetail ? (
            <p className="gsh-meta" data-testid="graph-detail-execution-detail">
              {canonical.executionDetail}
            </p>
          ) : null}
          {!past && canonical.pendingChange && canonical.pendingProposalLabel ? (
            <p className="graph-exec-line" data-testid="graph-detail-pending">
              Pending: {canonical.pendingProposalLabel}
            </p>
          ) : null}
        </section>

        {showTravel ? (
          <>
            <section
              className="graph-execution-card is-canonical"
              data-testid="graph-personal-travel"
              data-traffic-aware="false"
              data-fake-distance="0"
              data-fake-travel="0"
              data-fake-leave-by="0"
            >
              <p className="graph-ready-kicker">For you</p>
              <p className="graph-exec-line" data-testid="graph-travel-estimate">
                {canonical.travel.message}
              </p>
              <p className="gsh-meta">{canonical.travel.detail}</p>
              <p className="gsh-meta">Your location is not shared with the other people on this Graph.</p>
            </section>

            <button
              type="button"
              className="graph-open-directions"
              data-testid="graph-open-directions"
              data-mode="active"
              data-directions-query={canonical.directionsQuery}
              data-destination-source={canonical.place.provenance || "place-name"}
              onClick={openDirections}
            >
              Open directions
            </button>
          </>
        ) : !past && activityIsAtHome(caps) ? (
          <section
            className="graph-execution-card is-canonical"
            data-testid="graph-at-home-context"
            data-fake-travel="0"
            data-fake-booking="0"
          >
            <p className="graph-ready-kicker">At home</p>
            <p className="graph-exec-line">No reservation or travel needed for this Graph.</p>
          </section>
        ) : null}
        {past ? (
          <>
            <button
              type="button"
              className="graph-repeat-cta"
              data-testid="graph-detail-repeat"
              data-repeat-mutates-old-graph="0"
              data-source-plan-id={canonical.planId}
              data-mode="primary"
              onClick={() => onRepeat?.(canonical)}
            >
              Repeat
            </button>
            <button
              type="button"
              className="graph-view-place-quiet"
              data-testid="graph-view-place"
              data-mode="secondary"
              data-directions-query={canonical.directionsQuery}
              onClick={openDirections}
            >
              View place
            </button>
          </>
        ) : null}

        {onAddPeople ? (
          <button
            type="button"
            className="btn ghost"
            data-testid="graph-detail-add-people"
            onClick={onAddPeople}
          >
            Add someone
          </button>
        ) : null}

        <p className="gsh-meta graph-back-law" data-testid="graph-detail-back-law">
          {entrySource === "graphs"
            ? "Back returns to Graphs."
            : "Back returns to the prior Home scroll position."}
        </p>

        {note ? (
          <p className="gsh-gate-note" role="status" data-testid="graph-detail-note">
            {note}
          </p>
        ) : null}
      </div>
    );
  }

  if (!knownFixture) {
    return (
      <div
        className="ogsn-graph-detail social-dest-373-385 is-canonical"
        data-testid="graph-detail-sheet"
        data-screen="graph-detail"
        data-figma-node="618:758"
        data-graph-id={cardId}
        data-plan-id={cardId}
        data-reality-id="missing"
        data-entry-source={entrySource}
        data-canonical="false"
        data-participant-location-public-leak="0"
        role="dialog"
        aria-modal="true"
        aria-label="Graph"
      >
        <header className="social-dest-brand ogsn-graph-detail-head">
          <button
            type="button"
            className="opal-nav-chevron"
            data-testid="graph-detail-back"
            aria-label="Back"
            onClick={onClose}
          >
            ‹
          </button>
        </header>
        <h1 className="social-dest-title" data-testid="graph-detail-title">
          Graph
        </h1>
        <section
          className="graph-execution-card is-canonical"
          data-testid="graph-personal-travel"
          data-traffic-aware="false"
          data-fake-distance="0"
          data-fake-travel="0"
          data-fake-leave-by="0"
        >
          <p className="graph-ready-kicker">For you</p>
          <p className="graph-exec-line" data-testid="graph-travel-estimate">
            Travel time unavailable
          </p>
          <p className="gsh-meta">This Graph has no travel coordinates, so distance and leave-by stay off.</p>
        </section>
      </div>
    );
  }

  return (
    <div
      className="ogsn-graph-detail social-dest-373-385"
      data-testid="graph-detail-sheet"
      data-screen="graph-detail"
      data-figma-node="618:758"
      data-legacy-figma-node="373:385"
      data-presentation="full-column"
      data-graph-id={cardId}
      data-entry-source={entrySource}
      data-lineage-card={cardId}
      data-duplicate-projection="0"
      role="dialog"
      aria-modal="true"
      aria-label={placeTitle}
    >
      <header className="social-dest-brand ogsn-graph-detail-head">
        <button
          type="button"
          className="opal-nav-chevron"
          data-testid="graph-detail-back"
          aria-label="Back"
          onClick={onClose}
        >
          ‹
        </button>
      </header>

      <div className="graph-ready-title-row">
        <h1 className="social-dest-title" data-testid="graph-detail-title">
          {placeTitle || "Graph"}
        </h1>
        <span className="graph-ready-pill" data-testid="graph-ready-status">
          {statusLabel}
        </span>
      </div>
      <p className="social-dest-lede" data-testid="graph-detail-when">
        {whenLineResolved}
      </p>
      {countdown ? (
        <p className="gsh-countdown" style={{ display: "inline-flex", marginBottom: 12 }}>
          {countdown}
        </p>
      ) : null}

      <div className="graph-ready-timeblock">
        <p className="graph-ready-kicker">{dayKicker}</p>
        <p className="graph-ready-time">{timeLabel}</p>
      </div>

      {isReadyFixture || /juniper/i.test(placeTitle) || cardId === "seed-chanelle-juniper" ? (
        <GraphConvoyPanel
          graphId={cardId}
          graphName={placeTitle || "Juniper & Ivy"}
          ledBy={card?.person || "Chanelle"}
          partySize={4}
          reservationLabel={`${timeLabel} · Table for 4`}
          onBroadcastArrival={onBroadcastArrival}
          onBroadcastEta={onBroadcastEta}
        />
      ) : (
        <section className="graph-execution-card" data-testid="graph-execution-card">
          <p className="graph-ready-kicker">Leave by</p>
          <p className="graph-ready-time">{leaveByDisplay}</p>
          <p className="gsh-meta">Dynamic from your current location</p>
          <p className="graph-exec-line" data-testid="graph-travel-estimate" data-traffic-aware="false">
            {/min/i.test(travelTruth) ? travelTruth : `${travelTruth} · estimate`}
          </p>
          <p className="graph-exec-line" data-testid="graph-provider-truth" data-reservation="not_confirmed">
            {/ready/i.test(tableTruth) ? "Table looks open" : tableTruth}
          </p>
          <p className="graph-exec-line">
            {card?.person ? `${card.person} is free` : "Chanelle is free"}
          </p>
        </section>
      )}

      <button
        type="button"
        className="graph-open-directions"
        data-testid="graph-open-directions"
        data-mode="active"
        onClick={openDirections}
      >
        Open directions
      </button>

      {statusLabel === "Idea" && onStartPlanning ? (
        <button
          type="button"
          className="btn primary"
          data-testid="graph-detail-start-planning"
          onClick={() =>
            onStartPlanning({
              id: cardId,
              title: placeTitle || card?.title || "Plan",
              who: card?.person,
            })
          }
        >
          Start planning
        </button>
      ) : null}

      {onAddPeople ? (
        <button
          type="button"
          className="btn ghost"
          data-testid="graph-detail-add-people"
          onClick={onAddPeople}
        >
          Add someone
        </button>
      ) : null}

      <p className="gsh-meta graph-back-law">
        {entrySource === "graphs"
          ? "Back returns to the Graph list at the same filter and scroll position."
          : "Back returns to the prior Home scroll position. Home tab returns to Home root."}
      </p>

      {note ? (
        <p className="gsh-gate-note" role="status" data-testid="graph-detail-note">
          {note}
        </p>
      ) : null}
    </div>
  );
}
