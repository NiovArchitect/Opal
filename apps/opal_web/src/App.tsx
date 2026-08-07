import React from "react";
import { OpalApp } from "./OpalApp";
import { WalkthroughVisualReview } from "./onboarding/WalkthroughVisualReview";

/** Public Opal product surface — conversation-native shell only. */
export function App() {
  if (typeof window !== "undefined") {
    const q = new URLSearchParams(window.location.search);
    if (q.get("visual-review") === "1") {
      return <WalkthroughVisualReview />;
    }
  }
  return <OpalApp />;
}
