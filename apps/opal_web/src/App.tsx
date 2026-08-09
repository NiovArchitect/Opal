import React from "react";
import { OpalApp } from "./OpalApp";
import { AvailabilityReview } from "./availability/AvailabilityReview";

/** Public Opal product surface — conversation-native shell only. */
export function App() {
  // Local founder visual review: ?review=availability or #/review/availability
  const params =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const hash =
    typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
  if (params?.get("review") === "availability" || hash === "/review/availability") {
    return <AvailabilityReview />;
  }
  return <OpalApp />;
}
