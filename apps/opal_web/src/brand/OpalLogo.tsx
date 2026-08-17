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
 * OpalMark — product core symbol (Opal Graph transparent mark).
 * Exact PNG authority: Figma 168:2 (runtime master).
 * Vector master 160:2 remains Figma-editable only, not a silent redraw path.
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
  return (
    <img
      className={`opal-mark opal-mark--graph ${className ?? ""}`.trim()}
      src={BRAND_ASSETS.graphSymbol}
      width={px}
      height={px}
      alt={title === "" ? "" : title}
      role={title === "" ? "presentation" : "img"}
      aria-hidden={title === "" ? true : undefined}
      data-brand-role="core-mark"
      data-brand-source="opal-graph-symbol-exact-168-2"
      data-brand-final="true"
      data-brand-product="valid"
      data-figma-exact-png="168:2"
      data-figma-vector-master="160:2"
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
