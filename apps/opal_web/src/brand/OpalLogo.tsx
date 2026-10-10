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
 * OpalMark — canonical Opal logo lockup (W6A2).
 * True-alpha character + bubble-letter Opal. No abstract OPALGRAPH emblem.
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
  // Logo is 3:2; keep height = size, width auto via CSS aspect.
  const height = px;
  const width = Math.round(px * 1.5);
  return (
    <img
      className={`opal-mark opal-mark--logo ${className ?? ""}`.trim()}
      src={BRAND_ASSETS.opalLogo}
      width={width}
      height={height}
      alt={title === "" ? "" : title}
      role={title === "" ? "presentation" : "img"}
      aria-hidden={title === "" ? true : undefined}
      data-brand-role="core-mark"
      data-brand-source="opal-logo"
      data-brand-final="true"
      data-brand-product="valid"
      draggable={false}
    />
  );
}

/**
 * OpalWordmark — bubble-letter "Opal" PNG (W6A3).
 * Height prop matches prior typographic cap-height (default 28).
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
  /** When true, slightly smaller for tight chrome */
  compact?: boolean;
}) {
  const h = compact ? Math.max(14, Math.round(height * 0.85)) : height;
  // Wordmark art is 3:1
  const w = Math.round(h * 3);
  return (
    <img
      className={`opal-graph-wordmark opal-wordmark-img ${compact ? "is-compact" : ""} ${className ?? ""}`.trim()}
      src={BRAND_ASSETS.opalWordmark}
      width={w}
      height={h}
      alt={title === "" ? "" : title}
      role={title === "" ? "presentation" : "img"}
      aria-hidden={title === "" ? true : undefined}
      aria-label={title === "" ? undefined : title}
      data-brand-role="wordmark"
      data-brand-source="opal-wordmark"
      draggable={false}
      style={{ height: h, width: "auto", maxHeight: h }}
    />
  );
}

/**
 * OpalLockup — full logo when word shown; mark-only for compact chrome.
 * Logo already includes letters, so showWord renders a single logo image.
 */
export function OpalLockup({
  size = "md",
  showWord = true,
  className,
  showTagline = false,
}: {
  size?: Size;
  /** When false, renders logo mark only (compact chrome). */
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
  const wordH = size === "hero" ? 48 : size === "lg" ? 40 : size === "md" ? 32 : 24;
  const wordW = Math.round(wordH * 1.5);
  return (
    <div
      className={`opal-lockup opal-lockup--graph opal-lockup--with-word opal-lockup--logo ${className ?? ""}`.trim()}
      aria-label={PRODUCT_PUBLIC_NAME}
      data-brand-public={PRODUCT_PUBLIC_NAME}
    >
      <img
        className="opal-lockup-logo"
        src={BRAND_ASSETS.opalLogo}
        width={wordW}
        height={wordH}
        alt=""
        role="presentation"
        draggable={false}
        style={{ height: wordH, width: "auto" }}
        data-brand-role="lockup"
        data-brand-source="opal-logo"
      />
      {showTagline ? (
        <p className="opal-graph-tagline" data-testid="opal-graph-tagline">
          {BRAND.tagline}
        </p>
      ) : null}
    </div>
  );
}
