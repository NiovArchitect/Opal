export type ArrivalState =
  | "no_update"
  | "on_the_way"
  | "running_late"
  | "arrived"
  | "left"
  | "unknown";

export const PROHIBITED_LIVE_COPY = [
  /unreliable/i,
  /holding up the group/i,
  /always late/i,
  /attendance score/i,
  /punctuality score/i,
  /is absent/i,
  /\d+%\s*complete/i,
  /watching your location/i,
];

export function isProhibitedLiveCopy(text: string): boolean {
  return PROHIBITED_LIVE_COPY.some((p) => p.test(text));
}

export function formatReadinessCopy(allReady: boolean, openLabel?: string): string {
  if (allReady) return "Everything needed for tonight is handled.";
  if (openLabel) return openLabel;
  return "Some readiness items remain.";
}

export function formatArrivalCopy(state: ArrivalState): string {
  switch (state) {
    case "arrived":
      return "Arrived.";
    case "on_the_way":
      return "On the way.";
    case "running_late":
      return "Running late.";
    case "no_update":
      return "Has not shared an arrival update.";
    default:
      return "No arrival update.";
  }
}

export function neverInferArrivalFromClock(): boolean {
  return true;
}
