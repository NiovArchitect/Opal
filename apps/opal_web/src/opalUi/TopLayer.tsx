/**
 * Repair #18 - TopLayer: the ONE portal mount for sheet-band-and-above
 * surfaces (track-layering section 5, C1 section 6).
 *
 * Every surface that must own the screen renders through here instead of
 * inline inside .app / .thread / a scrolling ancestor, where a sealed
 * stacking context or an overflow:hidden ancestor can bury it. Mount
 * order is recorded with a monotonic sequence so within-band ordering is
 * deterministic (later mounts paint above earlier ones in the same band).
 */
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type TopLayerBand = "sheet" | "flow" | "modal" | "system";

let mountSequence = 0;

export function TopLayer({
  band = "sheet",
  children,
}: {
  band?: TopLayerBand;
  children: React.ReactNode;
}) {
  const [sequence] = useState(() => ++mountSequence);
  useEffect(() => {
    // Keep the counter monotonic for the life of the page; unmounts never
    // reuse a sequence number, so a reopened surface always wins its band.
    return () => {};
  }, []);
  if (typeof document === "undefined") return <>{children}</>;
  return createPortal(
    <div
      className="opal-top-layer"
      data-top-layer="portal-body"
      data-top-layer-band={band}
      data-top-layer-sequence={sequence}
    >
      {children}
    </div>,
    document.body,
  );
}
