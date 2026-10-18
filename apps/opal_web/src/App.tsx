import React from "react";
import { OpalApp } from "./OpalApp";
import { AvailabilityReview } from "./availability/AvailabilityReview";
import { C2FoundationGallery } from "./c2/C2FoundationGallery";
import { C2Shell } from "./c2/shell/C2Shell";
import { C2ShellReview } from "./c2/shell/C2ShellReview";
import { isC2ShellEnabled } from "./theme/c2Shell";
import { C1Review } from "./opalUi/c1/C1Review";

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
  // Repair #18 C2 foundation evidence surface (dev review only).
  if (params?.get("review") === "c2" || hash === "/review/c2") {
    return <C2FoundationGallery />;
  }
  // Repair #18 C2 shell evidence surface (dev review only): the shell
  // surfaces fed by labeled review projections. Never the member path.
  if (params?.get("review") === "c2shell" || hash === "/review/c2shell") {
    return <C2ShellReview surface={params?.get("surface") ?? "home"} />;
  }
  // Repair #18 C1: local visual review of the new surfaces (review-only).
  if (params?.get("review") === "c1") {
    return <C1Review />;
  }
  // Repair #18 Division C2 shell (track-c2 section 3.1): renders ONLY
  // when the shell flag is present in the served build config. Absence
  // renders the R17 shell exactly as today.
  if (isC2ShellEnabled()) {
    return <C2Shell />;
  }
  return <OpalApp />;
}
