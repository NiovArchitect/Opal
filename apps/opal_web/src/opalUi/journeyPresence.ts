/**
 * Temporary execution state for one Graph.
 * SharedPlan stays the commitment. This record is not stored on it.
 * Coordinates are absent unless this Journey's share mode is precise and unexpired.
 */

export type ShareMode = "none" | "eta" | "approximate" | "precise";
export type TravelState =
  | "not_started"
  | "getting_ready"
  | "on_the_way"
  | "arrived"
  | "left"
  | "unknown";
export type ParticipationState = "interested" | "going" | "unknown";

export type JourneyPresence = {
  graphId: string;
  userId: string;
  participationState: ParticipationState;
  travelState: TravelState;
  shareMode: ShareMode;
  eta?: string | null;
  etaUpdatedAt?: string | null;
  approximateLabel?: string | null;
  preciseLocation?: { lat: number; lng: number } | null;
  arrivedAt?: string | null;
  sharingExpiresAt?: string | null;
};

export type SharedJourneyView = {
  userId: string;
  travelState: TravelState;
  eta: string | null;
  approximateLabel: string | null;
  preciseLocation: { lat: number; lng: number } | null;
  location: "not_shared" | "eta" | "approximate" | "precise" | "expired";
};

export function sharingExpired(presence: JourneyPresence, now: Date): boolean {
  if (!presence.sharingExpiresAt) return false;
  const expires = Date.parse(presence.sharingExpiresAt);
  return !Number.isNaN(expires) && expires <= now.getTime();
}

/** What other participants may see. Missing location is not "not coming". */
export function visibleToOthers(presence: JourneyPresence, now = new Date()): SharedJourneyView {
  const base = {
    userId: presence.userId,
    travelState: presence.travelState,
    eta: null,
    approximateLabel: null,
    preciseLocation: null,
  };
  if (presence.shareMode === "none") return { ...base, location: "not_shared" };
  if (sharingExpired(presence, now)) return { ...base, location: "expired" };
  if (presence.shareMode === "eta") {
    return { ...base, location: "eta", eta: presence.eta || null };
  }
  if (presence.shareMode === "approximate") {
    return {
      ...base,
      location: "approximate",
      eta: presence.eta || null,
      approximateLabel: presence.approximateLabel || null,
    };
  }
  return {
    ...base,
    location: "precise",
    eta: presence.eta || null,
    preciseLocation: presence.preciseLocation || null,
  };
}

export function interestedIsGoing(state: ParticipationState): boolean {
  return state === "going";
}

/** Location movement does not create Going. */
export function participationFromMovement(
  current: ParticipationState,
  _moved: boolean,
): ParticipationState {
  return current;
}
