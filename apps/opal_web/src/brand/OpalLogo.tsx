import React from "react";
import { BRAND_ASSETS } from "./brand";

type Size = "sm" | "md" | "lg" | "hero";

const sizes: Record<Size, number> = {
  sm: 24,
  md: 30,
  lg: 44,
  hero: 88,
};

/**
 * OpalMark — founder-approved continuous iridescent orbital CORE MARK only.
 * Raster crop from founder lockup source. Not arcs/spike. Not clean circle. No halo.
 */
export function OpalMark({
  size = "md",
  className,
  title = "Opal",
  glow = false,
}: {
  size?: Size;
  className?: string;
  title?: string;
  /** Ignored — product law: no permanent logo halo. */
  glow?: boolean;
}) {
  void glow;
  const px = sizes[size];
  return (
    <img
      className={`opal-mark opal-mark--current ${className ?? ""}`.trim()}
      src={BRAND_ASSETS.markCurrent}
      width={px}
      height={px}
      alt={title === "" ? "" : title}
      role={title === "" ? "presentation" : "img"}
      aria-hidden={title === "" ? true : undefined}
      data-brand-role="core-mark"
      data-brand-source="founder-approved-orbital-raster"
      data-brand-final="false"
      data-brand-product="valid"
      draggable={false}
    />
  );
}

/**
 * OpalWordmark — founder-approved futuristic OPAL lettering only.
 * Use for opening/brand reveal/marketing — not every authenticated chrome row.
 */
export function OpalWordmark({
  className,
  height = 28,
  title = "OPAL",
}: {
  className?: string;
  height?: number;
  title?: string;
}) {
  return (
    <img
      className={`opal-wordmark-raster ${className ?? ""}`.trim()}
      src={BRAND_ASSETS.wordmarkCurrent}
      height={height}
      alt={title === "" ? "" : title}
      role={title === "" ? "presentation" : "img"}
      aria-hidden={title === "" ? true : undefined}
      data-brand-role="wordmark"
      data-brand-source="founder-approved-wordmark-raster"
      draggable={false}
    />
  );
}

/**
 * OpalLockup — full founder lockup (orbital + OPAL) as single raster.
 * Prefer for opening / hero. Authenticated product should prefer OpalMark alone.
 */
export function OpalLockup({
  size = "md",
  showWord = true,
  className,
}: {
  size?: Size;
  /** When false, renders CORE MARK only (compact chrome). */
  showWord?: boolean;
  className?: string;
}) {
  if (!showWord) {
    return (
      <div className={`opal-lockup ${className ?? ""}`.trim()} aria-label="Opal">
        <OpalMark size={size} title="" />
      </div>
    );
  }
  const px = size === "hero" ? 200 : size === "lg" ? 140 : size === "md" ? 110 : 72;
  return (
    <div className={`opal-lockup opal-lockup--raster ${className ?? ""}`.trim()} aria-label="Opal">
      <img
        className="opal-lockup-raster"
        src={BRAND_ASSETS.lockupCurrent}
        width={px}
        height={px}
        alt="Opal"
        data-brand-role="full-lockup"
        data-brand-source="founder-approved-lockup-raster"
        data-brand-final="false"
        data-brand-product="valid"
        draggable={false}
      />
    </div>
  );
}
