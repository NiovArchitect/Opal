/**
 * Dark Technicolor experiment tokens — NOT production defaults.
 * Study surface: /experiments/technicolor-review.html
 * Apply via data-theme only in experiment builds. Never default in production.
 */

export type TechnicolorMode = "current" | "controlled" | "full";

/** Opal cinematic spectrum (not Google multi-color branding) */
export const OPAL_TECHNICOLOR_SPECTRUM = {
  stageBlack: "#05060A",
  charcoalDepth: "#0C0F16",
  luminousCyan: "#3EE0F0",
  goldenAmber: "#F0B429",
  deepViolet: "#8B5CF6",
  electricRoyalBlue: "#3B82F6",
  richEmerald: "#10B981",
  saturatedRuby: "#E11D48",
  warmIvory: "#F2EDE6",
} as const;

export const MODE_LABELS: Record<TechnicolorMode, string> = {
  current: "CURRENT OPAL",
  controlled: "CONTROLLED TECHNICOLOR",
  full: "FULL TECHNICOLOR",
};

/** @deprecated use OPAL_TECHNICOLOR_SPECTRUM */
export const TECHNICOLOR_SEMANTIC = {
  recognition: OPAL_TECHNICOLOR_SPECTRUM.luminousCyan,
  participation: OPAL_TECHNICOLOR_SPECTRUM.goldenAmber,
  private: OPAL_TECHNICOLOR_SPECTRUM.deepViolet,
  execution: OPAL_TECHNICOLOR_SPECTRUM.electricRoyalBlue,
  completion: OPAL_TECHNICOLOR_SPECTRUM.richEmerald,
  risk: OPAL_TECHNICOLOR_SPECTRUM.saturatedRuby,
  humanNeutral: OPAL_TECHNICOLOR_SPECTRUM.warmIvory,
  depth: OPAL_TECHNICOLOR_SPECTRUM.stageBlack,
} as const;
