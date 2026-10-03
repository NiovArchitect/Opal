/**
 * GRAPH != RESERVATION
 *
 * Activities declare capabilities. Restaurant booking / travel CTAs are optional
 * facets — never global assumptions for every Graph.
 */

export type ActivityCapability =
  | "needs_place"
  | "supports_provider_booking"
  | "needs_time"
  | "supports_journey"
  | "supports_location"
  | "supports_tickets"
  | "supports_at_home"
  | "supports_remote"
  | "supports_bring_items";

export type ActivityCapabilitySet = ReadonlySet<ActivityCapability>;

export type ExecutionCtaPolicy = {
  showProviderBooking: boolean;
  showTravelCtas: boolean;
  /** Leave-by is a travel facet — suppress with travel for at-home / remote. */
  showLeaveBy: boolean;
};

const AT_HOME_HINT =
  /\b(at home|movie night|watch (a )?movie|netflix|bible study|study session|game night)\b/i;
const PLACE_HINT =
  /\b(dinner|lunch|brunch|restaurant|cafe|museum|concert|park|walk|hike|church|school|party|birthday|trip|workout|gym|errand)\b/i;
const BOOKING_HINT =
  /\b(dinner|lunch|brunch|restaurant|reservation|table|tickets?|concert|museum)\b/i;
const REMOTE_HINT = /\b(phone call|facetime|zoom|remote|video call)\b/i;

/** Default capability profile when activity text is unknown — time only, no fake booking. */
const DEFAULT_CAPS: ActivityCapability[] = ["needs_time"];

export function inferActivityCapabilities(
  activity: string | null | undefined,
  opts: { placeName?: string | null; atHomeExplicit?: boolean } = {},
): ActivityCapabilitySet {
  const text = `${activity || ""} ${opts.placeName || ""}`.trim();
  const caps = new Set<ActivityCapability>(DEFAULT_CAPS);

  // Remote before at-home so "phone call" is not misclassified as stay-home.
  if (REMOTE_HINT.test(text)) {
    caps.add("supports_remote");
    return caps;
  }

  if (opts.atHomeExplicit || AT_HOME_HINT.test(text)) {
    caps.add("supports_at_home");
    caps.add("supports_bring_items");
    // At-home: place optional/private; no provider booking; no journey required.
    return caps;
  }

  if (PLACE_HINT.test(text) || (opts.placeName && opts.placeName.trim().length > 0)) {
    caps.add("needs_place");
    caps.add("supports_location");
    caps.add("supports_journey");
  }

  if (BOOKING_HINT.test(text)) {
    caps.add("supports_provider_booking");
    if (/\b(ticket|concert|museum)\b/i.test(text)) caps.add("supports_tickets");
  }

  return caps;
}

export function activitySupportsProviderBooking(caps: ActivityCapabilitySet): boolean {
  return caps.has("supports_provider_booking");
}

export function activitySupportsTravelCtas(caps: ActivityCapabilitySet): boolean {
  return caps.has("supports_journey") || caps.has("supports_location");
}

export function activityIsAtHome(caps: ActivityCapabilitySet): boolean {
  return caps.has("supports_at_home");
}

/** Single policy object for Graph Detail / execution surfaces. */
export function executionCtaPolicy(caps: ActivityCapabilitySet): ExecutionCtaPolicy {
  const travel = activitySupportsTravelCtas(caps);
  return {
    showProviderBooking: activitySupportsProviderBooking(caps),
    showTravelCtas: travel,
    showLeaveBy: travel,
  };
}

/** Product law constants for proofs. */
export const GRAPH_NOT_RESERVATION = 1 as const;
export const FAKE_BOOKING_CTA_FOR_AT_HOME = 0 as const;
export const FAKE_TRAVEL_CTA_FOR_AT_HOME = 0 as const;
