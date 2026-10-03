/**
 * One Graph lineage. Chat, Graphs, and Home open this same detail.
 * Shared plan truth stays separate from private travel context.
 * Distance, travel time, traffic, and leave-by stay empty until a real
 * routing result exists. LeaveTime on the server is that owner.
 */
import type { ChatPreview } from "../data";
import { planSurfaceState, type PlanSurfaceState } from "./nextPlan";
import { graphPendingStatusLabel } from "./surfaceProjection";

export type PlaceCoordinates = { lat: number; lng: number };

export type PlaceIdentity = {
  name: string | null;
  area: string | null;
  placeId: string | null;
  address: string | null;
  coordinates: PlaceCoordinates | null;
  provenance: string | null;
};

export type TravelHonesty = {
  distance: null;
  travelMinutes: null;
  leaveBy: null;
  trafficAware: false;
  provider: null;
  updatedAt: null;
  message: string;
  detail: string;
};

export type CanonicalGraph = {
  planId: string;
  conversationId: string;
  title: string;
  activity: string | null;
  whenLabel: string;
  dayLabel: string;
  timeLabel: string | null;
  timezone: string;
  participants: string[];
  state: PlanSurfaceState;
  executionLabel: string | null;
  executionDetail: string | null;
  place: PlaceIdentity;
  travel: TravelHonesty;
  directionsQuery: string;
  pendingChange?: boolean;
  pendingProposalLabel?: string | null;
};

const PLAN_TIMEZONE = "America/Los_Angeles";

export function readPlaceIdentity(raw: unknown, fallbackName: string | null): PlaceIdentity {
  const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);
  const coordinates = record.coordinates;
  let parsed: PlaceCoordinates | null = null;
  if (coordinates && typeof coordinates === "object") {
    const point = coordinates as { lat?: unknown; lng?: unknown };
    if (typeof point.lat === "number" && typeof point.lng === "number") {
      parsed = { lat: point.lat, lng: point.lng };
    }
  }
  return {
    name: text(record.name) || fallbackName,
    area: text(record.area),
    placeId: text(record.place_id),
    address: text(record.address),
    coordinates: parsed,
    provenance: text(record.provenance),
  };
}

export function splitWhen(whenLabel: string): { day: string; time: string | null } {
  const parts = whenLabel.split("·").map((part) => part.trim()).filter(Boolean);
  const time = parts.find((part) => /\d{1,2}:\d{2}\s*(AM|PM)/i.test(part)) || null;
  const day = parts.filter((part) => part !== time).join(" · ");
  return { day: day || whenLabel, time };
}

/** System maps query. Prefer catalog area and address over the bare name. */
export function directionsQuery(place: PlaceIdentity): string {
  return [place.name, place.area, place.address].filter((part): part is string => !!part).join(", ");
}

/**
 * No number is produced here. A later routing provider can fill travel only
 * after destination coordinates and a permitted origin exist.
 */
export function travelContext(input: {
  coordinates: PlaceCoordinates | null;
  locationPermitted: boolean;
}): TravelHonesty {
  const empty = {
    distance: null,
    travelMinutes: null,
    leaveBy: null,
    trafficAware: false as const,
    provider: null,
    updatedAt: null,
  };
  if (!input.coordinates) {
    return {
      ...empty,
      message: "Travel time unavailable",
      detail: "This place has no coordinates yet, so distance and leave-by stay off.",
    };
  }
  if (!input.locationPermitted) {
    return {
      ...empty,
      message: "Location needed for travel time",
      detail: "Destination details stay available. Your location is not shared.",
    };
  }
  return {
    ...empty,
    message: "Travel time unavailable",
    detail: "No routing provider is connected.",
  };
}

export function clientPlanFields(
  raw: Record<string, unknown> | null | undefined,
  conversationId: string,
): ChatPreview["planProjection"] {
  if (!raw) return null;
  const text = (value: unknown) => (typeof value === "string" ? value : null);
  const place = text(raw.place);
  return {
    lineage_id: text(raw.lineage_id),
    conversation_id: text(raw.conversation_id) || conversationId,
    visibility: "participants",
    participant_mode: typeof raw.participant_mode === "string" ? raw.participant_mode : "dyad",
    kicker: typeof raw.kicker === "string" ? raw.kicker : "Plan set ✓",
    when_label: text(raw.when_label),
    place,
    activity: text(raw.activity),
    timezone: text(raw.timezone),
    execution_label: text(raw.execution_label),
    execution_detail: text(raw.execution_detail),
    pending_change: raw.pending_change === true,
    pending_proposal_value: text(raw.pending_proposal_value),
    pending_proposal_field: text(raw.pending_proposal_field),
    placeIdentity: readPlaceIdentity(raw.place_identity, place),
    public: false,
  };
}

export function canonicalGraphFromChat(
  chat: ChatPreview,
  viewerName: string | null,
): CanonicalGraph | null {
  const plan = chat.planProjection;
  if (!plan || (!plan.place && !plan.when_label)) return null;
  const placeName = plan.place || plan.placeIdentity?.name || "Plan";
  const place = plan.placeIdentity || readPlaceIdentity(null, placeName);
  const whenLabel = plan.when_label || "";
  const when = splitWhen(whenLabel);
  const participants = [viewerName, ...(chat.peers || []).map((peer) => peer.display_name)]
    .map((name) => name?.trim() || "")
    .filter((name, index, all) => name && all.indexOf(name) === index);
  const pendingChange = plan.pending_change === true;
  return {
    planId: plan.lineage_id || chat.id,
    conversationId: plan.conversation_id || chat.id,
    title: place.name || placeName,
    activity: plan.activity || null,
    whenLabel,
    dayLabel: when.day,
    timeLabel: when.time,
    timezone: plan.timezone || PLAN_TIMEZONE,
    participants,
    state: planSurfaceState({
      commitment: plan.execution_label ? "execution_ready" : "aligned",
      pendingChange,
    }),
    executionLabel: plan.execution_label || null,
    executionDetail: plan.execution_detail || null,
    place,
    travel: travelContext({ coordinates: place.coordinates, locationPermitted: false }),
    directionsQuery: directionsQuery(place),
    pendingChange,
    pendingProposalLabel: graphPendingStatusLabel({
      pendingChange,
      changeProposalValue: plan.pending_proposal_value,
    }),
  };
}

export function mapsUrl(query: string): string {
  const q = encodeURIComponent(query);
  const apple =
    typeof navigator !== "undefined" && /iPad|iPhone|iPod|Mac/.test(navigator.userAgent);
  return apple
    ? `https://maps.apple.com/?q=${q}`
    : `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function writeGraphAddress(planId: string) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("graph", planId);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    /* addressability is progressive; the open detail still stands */
  }
}

export function clearGraphAddress() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("graph")) return;
    url.searchParams.delete("graph");
    const search = url.searchParams.toString();
    window.history.replaceState(null, "", `${url.pathname}${search ? `?${search}` : ""}${url.hash}`);
  } catch {
    /* ignore */
  }
}

export function graphAddressId(): string | null {
  try {
    return new URLSearchParams(window.location.search).get("graph");
  } catch {
    return null;
  }
}
