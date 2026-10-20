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
  createdPlanGraphOverlay,
  createdPlanToFeedCard,
  findCreatedPlanForCard,
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
import { PlanEditControls } from "./PlanEditControls";
import { completionStep, FoodStepPanel } from "./FoodStepPanel";
import { CheckinCircleRow } from "./CheckinCircleRow";
import { CheckinSummaryCard } from "./CheckinSummary";
import { TopLayer } from "./TopLayer";
import type { OpalPlanContract } from "../api/productClient";
import type { TravelState } from "./journeyPresence";
import { planStateAttr } from "../theme/planStateColors";
import { conflictLineFromContract } from "./planCardContract";

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
  entrySource?: "home" | "graphs" | "chats" | "opal";
  /** Real SharedPlan detail. Fixture cards ignore this unless the id matches. */
  reality?: CanonicalGraph | null;
  /**
   * Repair #11 (B3-web) — plan organizer/lead display name. Rendered only when
   * a real value is provided; never invented. Null today — the plan projection
   * carries no organizer field (see repair report, NEEDED FROM SOCIALFLOW AGENT).
   */
  leadName?: string | null;
  /** LiveExperience arrival broadcast (conversation channel). */
  onBroadcastArrival?: (state: TravelState) => void | Promise<void>;
  /** LiveExperience ETA share while en route. */
  onBroadcastEta?: (payload: {
    arrivalWindowLabel: string;
    durationMinutes: number;
  }) => void | Promise<void>;
  conversationId?: string | null;
  /**
   * Repair #18 (W4-04) - end-to-end plan editing on this detail
   * surface. The descriptor is built from the durable plan payload
   * (GET /opal/plans): the real plan id, its current title/location/
   * caption, and the backend's own can_edit authority for this
   * viewer. Absent for fixture cards - a fixture has no plan row to
   * edit, so no affordance is rendered for it.
   */
  planEdit?: {
    planId: string;
    title: string;
    location?: string | null;
    caption?: string | null;
    online?: boolean;
    canEdit: boolean;
    /** I2: the plan contract's etiquette projection, for the
     *  response-window control inside the edit controls. */
    etiquette?: import("../api/productClient").PlanEtiquetteContract | null;
  } | null;
  editBearer?: string;
  /** Called with the RETURNED plan payload after a successful edit. */
  onPlanEdited?: (plan: OpalPlanContract) => void;
  /**
   * Repair #18 wiring (B2/B3) - the durable plan payload for THIS
   * card, from the same list payload the edit descriptor comes from.
   * The food panel mounts only when its completion record carries a
   * food step; the check-in circle row mounts for the plan source.
   * Absent for fixture cards - a fixture has no plan row, so neither
   * mount renders for it.
   */
  foodPlan?: OpalPlanContract | null;
  foodViewerUserId?: string | null;
  /** Re-read after a food action; the detail re-renders from the
   *  returned plan payload. */
  onFoodChanged?: () => void;
};

function parseWhenParts(detail?: string): { dayKicker: string; timeLabel: string } {
  // e.g. a place, day and time joined by middle dots in one detail string.
  // Repair #18: NEVER invent a day or time. A part that is not in the
  // contract string renders as honest absence, not a fabricated fallback.
  const parts = (detail || "").split("·").map((p) => p.trim()).filter(Boolean);
  const timePart = parts.find((p) => /\d{1,2}:\d{2}\s*(AM|PM)/i.test(p)) || "";
  const dayPart =
    parts.find((p) =>
      /tonight|tomorrow|this weekend|next week|saturday|sunday|monday|tuesday|wednesday|thursday|friday/i.test(
        p,
      ),
    ) ||
    parts[0] ||
    "Forming";
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
  leadName = null,
  onBroadcastArrival,
  onBroadcastEta,
  planEdit = null,
  editBearer,
  onPlanEdited,
  foodPlan = null,
  foodViewerUserId = null,
  onFoodChanged,
}: Props) {
  // Paste W5 Phase 4 — created/composer plans win over stale seed idea chrome.
  const createdPlan = findCreatedPlanForCard(cardId, loadCreatedPlans());
  const createdOverlay = createdPlan ? createdPlanGraphOverlay(createdPlan) : null;
  const card =
    (createdPlan ? createdPlanToFeedCard(createdPlan) : undefined) ||
    FOUNDER_HOME_FEED.find((c) => c.id === cardId);
  // FW founder-walk: never fall back unrelated Graphs to Juniper & Ivy.
  const placeTitle = resolveGraphPlaceTitle(
    card
      ? { id: createdPlan?.sourceIdeaId || card.id, title: card.title, placeLine: card.placeLine }
      : { id: cardId },
  );
  // F12-46: a cardId with no backing card is a missing graph, not a hollow sheet.
  const missingCard = !card && !createdPlan;
  const withWho = card?.person ? `with ${card.person}` : "";
  const whenLine = (() => {
    if (createdOverlay?.whenLine) return createdOverlay.whenLine;
    if (card?.detail) {
      return withWho && !/with /i.test(card.detail) ? `${card.detail} · ${withWho}` : card.detail;
    }
    // Repair #18: no invented when-line for any card, fixture included.
    // A card without a contract detail renders the honest absence below.
    // F12-01/F12-45: a when-line is a time — never a person's name, never blank.
    // createdPlan.when is the user-entered time; without it the honest label applies.
    if (createdPlan?.when) return createdPlan.when;
    return "Time to be set";
  })();
  const { dayKicker, timeLabel } = parseWhenParts(card?.detail || whenLine);
  const chrome = GRAPH_AUTHORITY_CHROME[cardId];
  /** Fixture Ready Graph  -  production would use domain state; never invent Reserved booking. */
  const isReadyFixture =
    !createdPlan &&
    (cardId === "seed-chanelle-juniper" ||
      (/juniper|ready/i.test(card?.title || "") && cardId === "seed-chanelle-juniper"));
  const statusLabel = createdPlan
    ? "Forming"
    : isReadyFixture
      ? "Ready"
      : cardId === "seed-alex-graph-gallery"
        ? "Aligned"
        : cardId === "seed-near-rooftop"
          ? "Idea"
          : "Forming";
  // Repair #18: the fixture pill carries the SAME data-plan-state the
  // canonical branch renders, derived through the one state-color module -
  // never a bare span with no state color.
  const fixturePlanState = planStateAttr(
    statusLabel === "Aligned" ? "ready" : statusLabel,
  );
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
    (isReadyFixture
      ? "table looks open"
      : createdOverlay?.signalLine || chrome?.signalLine || "Forming · pending");
  // F12-12: never invent leave/travel times — honest fallbacks render below.
  const leaveTruth =
    card?.alignmentSteps?.find((s) => /leave/i.test(s.primary))?.primary || "";
  const travelTruth =
    card?.alignmentSteps?.find((s) => /min|drive|from you/i.test(s.secondary))?.secondary || "";
  const leaveByDisplay = leaveTruth ? leaveTruth.replace(/^Leave\s*~?\s*/i, "") : "";
  const whenLineResolved = createdOverlay?.whenLine || (!createdPlan ? chrome?.whenLine : null) || whenLine;
  const stateLine = createdOverlay?.signalLine || (!createdPlan ? chrome?.signalLine : null);

  const [note, setNote] = React.useState<string | null>(null);
  const [checkinSummaryId, setCheckinSummaryId] = React.useState<string | null>(null);
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
        {planEdit && planEdit.planId === canonical.planId ? (
          <PlanEditControls
            planId={planEdit.planId}
            title={planEdit.title}
            location={planEdit.location}
            caption={planEdit.caption}
            online={planEdit.online}
            canEdit={planEdit.canEdit}
            bearer={editBearer}
            onEdited={onPlanEdited}
            etiquette={planEdit.etiquette ?? null}
          />
        ) : null}
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
            data-online={canonical.online ? "1" : "0"}
          >
            {canonical.online ? (
              <>
                <span aria-hidden>📹</span> Online
              </>
            ) : (
              [canonical.place.name, canonical.place.area].filter(Boolean).join(" · ")
            )}
          </p>
          {/* B1: the virtual affordance comes from the place
              projection kind (canonical.online / joinAvailable),
              never from comparing the place name to "Online". Join is
              an honest handoff to the plan's own stored link - never
              a fake in-app call. */}
          {!past && canonical.online && canonical.joinAvailable && canonical.meetingLink ? (
            <p className="graph-exec-line" data-testid="graph-detail-join">
              <span
                role="link"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(canonical.meetingLink!, "_blank", "noopener,noreferrer");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(canonical.meetingLink!, "_blank", "noopener,noreferrer");
                  }
                }}
              >
                Join
              </span>
            </p>
          ) : !past && canonical.online ? (
            <p className="graph-exec-line" data-testid="graph-detail-add-link">
              Add a meeting link when you have one
            </p>
          ) : null}
          <p className="graph-exec-line" data-testid="graph-detail-who">
            {canonical.participants.length ? canonical.participants.join(" · ") : "Participants"}
          </p>
          {/* Repair #18: attendance renders ONLY from the backend contract
              fields on the projection - absent contract, no count. */}
          {typeof canonical.goingCount === "number" &&
          typeof canonical.totalCount === "number" ? (
            <p
              className="graph-exec-line"
              data-testid="graph-detail-attendance"
              data-viewer-state={canonical.viewerState || undefined}
            >
              {canonical.goingCount} of {canonical.totalCount} going
              {conflictLineFromContract({ conflict: canonical.conflict })
                ? ` - ${conflictLineFromContract({ conflict: canonical.conflict })}`
                : ""}
            </p>
          ) : null}
          {leadName ? (
            <p
              className="graph-exec-line graph-detail-lead"
              data-testid="graph-detail-lead"
              data-lead={leadName}
            >
              Organized by {leadName}
            </p>
          ) : null}
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

        {/* Repair #18 wiring (B2): the food panel mounts ONLY when
            this plan's completion record carries a food step; the
            panel renders that projection verbatim. */}
        {foodPlan && foodPlan.id === canonical.planId && completionStep(foodPlan.completion as Parameters<typeof completionStep>[0], "food") ? (
          <section className="graph-shared-block" data-testid="graph-detail-food">
            <FoodStepPanel
              planId={foodPlan.id}
              completion={foodPlan.completion as Parameters<typeof FoodStepPanel>[0]["completion"]}
              viewerUserId={foodViewerUserId ?? ""}
              meetingLink={foodPlan.meeting_link ?? null}
              onChanged={onFoodChanged}
            />
          </section>
        ) : null}

        {/* Repair #18 wiring (B3, design section 7): the circle row
            for plan sources lives on the plan's detail surface. */}
        {foodPlan && foodPlan.id === canonical.planId ? (
          <section className="graph-shared-block" data-testid="graph-detail-checkin">
            <p className="graph-ready-kicker">Check in</p>
            <CheckinCircleRow
              source={{ source_kind: "plan", source_ref_id: canonical.planId }}
              bearer={editBearer}
              onOpenSummary={(id) => setCheckinSummaryId(id)}
            />
          </section>
        ) : null}

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

        {note ? (
          <p className="gsh-gate-note" role="status" data-testid="graph-detail-note">
            {note}
          </p>
        ) : null}

        {checkinSummaryId ? (
          <TopLayer band="sheet">
            <div
              className="checkin-summary-sheet"
              data-testid="graph-detail-checkin-summary"
              role="dialog"
              aria-label="Check-in summary"
            >
              <CheckinSummaryCard sweepId={checkinSummaryId} bearer={editBearer} />
              <button type="button" onClick={() => setCheckinSummaryId(null)}>
                Close
              </button>
            </div>
          </TopLayer>
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
      data-plan-state={fixturePlanState}
      data-duplicate-projection="0"
      role="dialog"
      aria-modal="true"
      aria-label={missingCard ? "Graph not found" : placeTitle}
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

      {missingCard ? (
        <div className="gsh-empty" data-testid="graph-detail-missing" data-empty="error" role="alert">
          <p className="gsh-empty-title">This graph isn't available</p>
          <p className="gsh-empty-body">
            It may have been removed or the link is stale. Nothing was invented to fill it.
          </p>
        </div>
      ) : (
        <>
      <div className="graph-ready-title-row">
        <h1 className="social-dest-title" data-testid="graph-detail-title">
          {placeTitle || "Graph"}
        </h1>
        <span
          className={`graph-ready-pill graphs-status-${fixturePlanState}`}
          data-testid="graph-ready-status"
          data-plan-state={fixturePlanState}
        >
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

      {dayKicker || timeLabel ? (
        <div className="graph-ready-timeblock" data-testid="graph-detail-timeblock">
          <p className="graph-ready-kicker">{dayKicker || "Forming"}</p>
          {timeLabel ? <p className="graph-ready-time">{timeLabel}</p> : null}
        </div>
      ) : null}

      {stateLine ? (
        <p className="graph-state-line" data-testid="graph-detail-state-line">
          {stateLine}
        </p>
      ) : null}

      {isReadyFixture ||
      (!createdPlan &&
        (/juniper/i.test(placeTitle) || cardId === "seed-chanelle-juniper")) ? (
        <>
          {/* Repair #18 (F18-01): this fixture branch carries no attendance
              contract and no real participant rows, so the panel is handed
              neither counts nor a roster - it renders no count and no
              roster here rather than the old fixture count of 4 of 4.
              Attendance renders only in the canonical branch above, from
              the contract fields on the projection. */}
          <GraphConvoyPanel
            graphId={cardId}
            graphName={placeTitle || "Juniper & Ivy"}
            ledBy={leadName || card?.person || undefined}
            onBroadcastArrival={onBroadcastArrival}
            onBroadcastEta={onBroadcastEta}
          />
          <section className="graph-journey-block" data-testid="graph-execution-card">
            <p className="graph-ready-kicker">Leave by</p>
            {/* Repair #18: no invented leave-by or travel times - a line
                renders only when the contract carries the value. */}
            {leaveByDisplay ? (
              <p className="graph-exec-line" data-testid="graph-leave-by">
                {leaveByDisplay}
              </p>
            ) : null}
            {/min/i.test(travelTruth) ? (
              <p className="graph-exec-line" data-testid="graph-travel-estimate" data-traffic-aware="false">
                {travelTruth}
              </p>
            ) : null}
            <p className="graph-exec-line" data-testid="graph-provider-truth" data-reservation="not_confirmed">
              {/ready/i.test(tableTruth) ? "Table looks open" : tableTruth}
            </p>
            <button
              type="button"
              className="graph-open-directions"
              data-testid="graph-open-directions"
              data-mode="active"
              onClick={openDirections}
            >
              Open directions
            </button>
          </section>
        </>
      ) : statusLabel === "Forming" || statusLabel === "Idea" ? (
        <section className="graph-journey-block" data-testid="graph-execution-card">
          <p className="graph-ready-kicker">Plan</p>
          <p className="graph-exec-line" data-testid="graph-forming-summary">
            {createdOverlay?.whenLine || whenLineResolved}
          </p>
          <p className="gsh-meta">{stateLine || "Forming · pending"}</p>
        </section>
      ) : (
        <section className="graph-journey-block" data-testid="graph-execution-card">
          <p className="graph-ready-kicker">Leave by</p>
          {leaveByDisplay ? (
            <p className="graph-exec-line" data-testid="graph-leave-by">
              {leaveByDisplay}
            </p>
          ) : null}
          {/min/i.test(travelTruth) ? (
            <p className="graph-exec-line" data-testid="graph-travel-estimate" data-traffic-aware="false">
              {travelTruth}
            </p>
          ) : null}
          <button
            type="button"
            className="graph-open-directions"
            data-testid="graph-open-directions"
            data-mode="active"
            onClick={openDirections}
          >
            Open directions
          </button>
        </section>
      )}

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

      {note ? (
        <p className="gsh-gate-note" role="status" data-testid="graph-detail-note">
          {note}
        </p>
      ) : null}
        </>
      )}
    </div>
  );
}
