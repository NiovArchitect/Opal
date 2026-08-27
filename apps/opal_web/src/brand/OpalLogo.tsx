import React from "react";
import { BRAND, BRAND_ASSETS, PRODUCT_PUBLIC_NAME } from "./brand";

type Size = "sm" | "md" | "lg" | "hero";

const sizes: Record<Size, number> = {
  sm: 24,
  md: 30,
  lg: 44,
  hero: 88,
};

/**
 * OpalMark — product core symbol (Spectral Human Alignment emblem).
 * Visual master: Figma 160:2 (symbol-only). First-run instance: 217:6.
 * Runtime raster: BRAND_ASSETS.opalGraphEmblem family (true alpha).
 * 168:2 is DEFECTIVE / SUPERSEDED — never load as product chrome.
 * Brand board 528:25 is documentation only — never the logo src.
 */
export function OpalMark({
  size = "md",
  className,
  title = PRODUCT_PUBLIC_NAME,
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
  const src =
    size === "hero"
      ? BRAND_ASSETS.opalGraphEmblemHero
      : size === "sm"
        ? BRAND_ASSETS.opalGraphEmblem128
        : BRAND_ASSETS.opalGraphEmblem;
  return (
    <img
      className={`opal-mark opal-mark--graph ${className ?? ""}`.trim()}
      src={src}
      width={px}
      height={px}
      alt={title === "" ? "" : title}
      role={title === "" ? "presentation" : "img"}
      aria-hidden={title === "" ? true : undefined}
      data-brand-role="core-mark"
      data-brand-source="opal-graph-emblem-spectral-human-alignment"
      data-brand-final="true"
      data-brand-product="valid"
      data-figma-visual-master="160:2"
      data-figma-symbol-only="160:2"
      data-figma-first-run-instance="217:6"
      data-figma-defective-superseded="168:2"
      draggable={false}
    />
  );
}

/**
 * OpalWordmark — typographic "Opal Graph" for product chrome.
 * Prefer for brand entry and compact headers. Tagline is separate (entry only).
 */
export function OpalWordmark({
  className,
  height = 28,
  title = PRODUCT_PUBLIC_NAME,
  compact = false,
}: {
  className?: string;
  height?: number;
  title?: string;
  /** When true, slightly smaller tracking for tight chrome */
  compact?: boolean;
}) {
  return (
    <span
      className={`opal-graph-wordmark ${compact ? "is-compact" : ""} ${className ?? ""}`.trim()}
      style={{ fontSize: height * 0.55 }}
      data-brand-role="wordmark"
      data-brand-source="typographic-opal-graph"
      aria-label={title === "" ? undefined : title}
    >
      <span className="opal-graph-word-opal">Opal</span>
      <span className="opal-graph-word-graph"> Graph</span>
    </span>
  );
}

/**
 * OpalLockup — symbol + typographic Opal Graph.
 * Splash / auth / hero. Authenticated chrome may use OpalMark + short wordmark.
 */
export function OpalLockup({
  size = "md",
  showWord = true,
  className,
  showTagline = false,
}: {
  size?: Size;
  /** When false, renders CORE MARK only (compact chrome). */
  showWord?: boolean;
  className?: string;
  /** Tagline only for splash / marketing entry — never ordinary member tabs */
  showTagline?: boolean;
}) {
  if (!showWord) {
    return (
      <div
        className={`opal-lockup opal-lockup--graph ${className ?? ""}`.trim()}
        aria-label={PRODUCT_PUBLIC_NAME}
      >
        <OpalMark size={size} title="" />
      </div>
    );
  }
  const wordH = size === "hero" ? 36 : size === "lg" ? 28 : size === "md" ? 22 : 18;
  return (
    <div
      className={`opal-lockup opal-lockup--graph opal-lockup--with-word ${className ?? ""}`.trim()}
      aria-label={PRODUCT_PUBLIC_NAME}
      data-brand-public={PRODUCT_PUBLIC_NAME}
    >
      <OpalMark size={size} title="" />
      <div className="opal-lockup-type">
        <OpalWordmark height={wordH} title="" />
        {showTagline ? (
          <p className="opal-graph-tagline" data-testid="opal-graph-tagline">
            {BRAND.tagline}
          </p>
        ) : null}
      </div>
    </div>
  );
}
