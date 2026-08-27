/**
 * OGSN-06 - Journey actionable trajectory
 * Figma 254:280 (primary) · reference 201:9
 * Same SharedPlan / Social Reality lineage as Graph.
 */
import React, { useState } from "react";
import { GraphJourneyCard } from "./GraphJourneyCard";

export type JourneyProjection = {
  plan_id: string;
  conversation_id?: string;
  title?: string;
  place?: string | null;
  when_label?: string | null;
  leave?: {
    available?: boolean;
    human_label?: string | null;
    traffic_aware?: boolean;
    fabricated?: boolean;
    fallback?: string;
    location_permission_helpful?: boolean;
    estimate_class?: string;
  };
  navigation?: {
    available?: boolean;
    primary_url?: string;
    apple_maps_url?: string;
    google_maps_url?: string;
  };
  reservation?: {
    human_label?: string;
    state?: string;
    live_execution?: string;
    party_size?: number;
    fabricated_confirmed?: boolean;
  };
  viewer?: {
    can_manage?: boolean;
    is_lead?: boolean;
    response_state?: string;
  };
  participants?: Array<{
    user_id: string;
    role: string;
    response_state: string;
    committed?: boolean;
  }>;
  requires_reconfirmation?: boolean;
  lead_user_id?: string | null;
};

type Props = {
  journey: JourneyProjection;
  peerName?: string;
  peerAvatarSrc?: string;
  mediaSrc?: string;
  locationGranted?: boolean;
  onRequestLocation?: () => void;
  onManage?: () => void;
  onCantMakeIt?: () => void;
  onAddPeople?: () => void;
  onReconfirm?: () => void;
  onChangeTime?: () => void;
  onImIn?: () => void;
  onBack?: () => void;
};

export function JourneySurface({
  journey,
  peerName,
  peerAvatarSrc,
  mediaSrc,
  locationGranted,
  onRequestLocation,
  onManage,
  onCantMakeIt,
  onAddPeople,
  onReconfirm,
  onChangeTime,
  onImIn,
  onBack,
}: Props) {
  const [mapsNote, setMapsNote] = useState<string | null>(null);
  const leave = journey.leave;
  const leaveLabel =
    leave?.available && leave.human_label
      ? leave.human_label
      : leave?.fallback || undefined;
  /**
   * ReservationExecution does NOT claim real external execution.
   * Only show "Reserved" when live_execution is actually claimed/confirmed.
   * Otherwise keep the Figma visual slot with truthful copy.
   */
  const liveExec = (journey.reservation?.live_execution || "").toUpperCase();
  const reservationState = (journey.reservation?.state || "").toLowerCase();
  const reservationClaimed =
    liveExec === "CLAIMED" ||
    liveExec === "CONFIRMED" ||
    reservationState === "confirmed" ||
    reservationState === "held";
  const reservationLabel = reservationClaimed
    ? reservationState === "held"
      ? "Held"
      : "Reserved"
    : journey.reservation?.human_label
      ? journey.reservation.human_label.replace(/^reserved$/i, "Not requested")
      : "Not requested";
  const reservedValue = reservationClaimed
    ? journey.when_label?.match(/\d{1,2}:\d{2}\s*[AP]M/i)?.[0] ||
      journey.reservation?.human_label ||
      "Slot held"
    : journey.reservation?.human_label && !/^reserved$/i.test(journey.reservation.human_label)
      ? journey.reservation.human_label
      : "No provider confirmation";

  const openMaps = () => {
    const url = journey.navigation?.primary_url || journey.navigation?.apple_maps_url;
    if (!url) {
      setMapsNote("Destination required for Maps handoff.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    setMapsNote("Opened Maps (deep link) - no in-app navigation.");
  };

  return (
    <div
      className="journey-surface"
      data-testid="journey-surface"
      data-figma-journey="254:280"
      data-figma-authority="618:816"
      data-figma-node="618:816"
      data-figma-ref="201:9"
      data-plan-id={journey.plan_id}
      data-lineage-same="true"
    >
      {onBack ? (
        <button type="button" className="opal-nav-chevron" data-testid="journey-back" aria-label="Back" onClick={onBack}>‹</button>
      ) : null}

      <GraphJourneyCard
        title={journey.title || "Journey"}
        lede={
          journey.requires_reconfirmation
            ? "Something material changed - reconfirm if you are still in."
            : "Everything you need. Nothing extra."
        }
        place={journey.place || "Place TBD"}
        when={journey.when_label || "When TBD"}
        leave={leaveLabel}
        arrive={undefined}
        reserved={reservedValue}
        reservationLabel={reservationLabel}
        mediaSrc={mediaSrc}
        peerName={peerName}
        peerAvatarSrc={peerAvatarSrc}
        onImIn={onImIn}
        onChangeTime={journey.viewer?.can_manage ? onChangeTime : undefined}
        onAddPeople={journey.viewer?.can_manage ? onAddPeople : undefined}
        onManage={journey.viewer?.can_manage ? onManage : undefined}
        onCantMakeIt={onCantMakeIt}
        commitmentActive={
          journey.viewer?.response_state === "accepted" ||
          !!journey.participants?.some((p) => p.committed)
        }
      />

      <div className="journey-extra" data-testid="journey-execution-truth">
        <p className="gsh-meta">
          Leave timing:{" "}
          {leave?.available
            ? `${leave.human_label}${leave.traffic_aware ? "" : " · geometric estimate (not traffic ETA)"}`
            : leave?.fallback || "Unavailable"}
        </p>
        {leave?.fabricated === false ? (
          <p className="gsh-meta">Not fabricated · origin not exposed</p>
        ) : null}
        {leave?.location_permission_helpful && !locationGranted ? (
          <button
            type="button"
            className="btn"
            data-testid="journey-request-location"
            data-figma-permission="473:348"
            onClick={onRequestLocation}
          >
            Use location for timing?
          </button>
        ) : null}
        <button
          type="button"
          className="btn primary"
          data-testid="journey-open-maps"
          data-mode={journey.navigation?.available ? "active" : "conditional"}
          disabled={!journey.navigation?.available}
          onClick={openMaps}
        >
          Leave / Open Maps
        </button>
        <p className="gsh-meta">
          Reservation: {journey.reservation?.human_label || "Not requested"} · live=
          {journey.reservation?.live_execution || "NOT_CLAIMED"} · party{" "}
          {journey.reservation?.party_size ?? "-"}
        </p>
        {journey.requires_reconfirmation && onReconfirm ? (
          <button type="button" className="btn primary" data-testid="journey-reconfirm" onClick={onReconfirm}>
            Still going - reconfirm
          </button>
        ) : null}
        {mapsNote ? (
          <p className="gsh-gate-note" role="status">
            {mapsNote}
          </p>
        ) : null}
      </div>
    </div>
  );
}
