import React from "react";
import { AvailabilityReview } from "./availability/AvailabilityReview";
import { C2FoundationGallery } from "./c2/C2FoundationGallery";
import { C2Shell } from "./c2/shell/C2Shell";
import { C2ShellReview } from "./c2/shell/C2ShellReview";
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
  // Repair #19 W15: the C2 shell is the ONLY member shell this build
  // serves. The R17 legacy shell (OpalApp) is no longer mounted here
  // and the ?shell=r17 override that gated it is retired (see
  // theme/c2Shell.ts). The R17 fallback lives at branch level
  // (muse/repair-17), never as an in-app side door.
  return <C2Shell />;
}
