/**
 * Dark Technicolor experiment tokens — NOT production defaults.
 * Apply via data-theme="technicolor-a|b|c" only in local/experiment builds.
 * Color reinforces text + icon + shape; never sole state carrier.
 */

export type TechnicolorVariant = "a" | "b" | "c";

/** Semantic hypothesis — not locked without accessibility + founder review */
export const TECHNICOLOR_SEMANTIC = {
  /** Becoming a plan / recognition */
  recognition: "#3EE0F0",
  /** Still open / participation unresolved */
  participation: "#F0B429",
  /** Keep private */
  private: "#A78BFA",
  /** Reservation requested / approved execution */
  execution: "#3B82F6",
  /** Table held — warm amber with urgency */
  urgencyHold: "#F59E0B",
  /** Booked / Handled / completion */
  completion: "#10B981",
  /** Failure or expiring hold */
  risk: "#E85D5D",
  /** Neutral human-system support */
  humanNeutral: "#F2EDE6",
  humanSoft: "#C8C2B8",
  /** Shell depth */
  depth: "#05060A",
  depthRaised: "#0C0F16",
  depthSurface: "#10141C",
} as const;

export const SEMANTIC_MOMENT_MAP = {
  becoming_a_plan: { color: "recognition", label: "Becoming a plan", mark: "◇" },
  still_open: { color: "participation", label: "Still open", mark: "○" },
  keep_private: { color: "private", label: "Keep private", mark: "◐" },
  reservation_requested: { color: "execution", label: "Reservation requested", mark: "›" },
  table_held: { color: "urgencyHold", label: "Table held", mark: "▣" },
  booked: { color: "completion", label: "Booked", mark: "✓" },
  handled: { color: "completion", label: "Handled", mark: "✓" },
  failure_or_expiring: { color: "risk", label: "Expiring hold", mark: "!" },
} as const;

export const VARIANT_NOTES: Record<
  TechnicolorVariant,
  {
    label: string;
    intensity: "controlled" | "spectrum" | "cinematic";
    principle: string;
  }
> = {
  a: {
    label: "Controlled cinematic",
    intensity: "controlled",
    principle:
      "Current refined dark shell remains dominant. Technicolor appears primarily in Opal moments, important actions, experience state, and limited navigation accents. Human conversation stays neutral and calm.",
  },
  b: {
    label: "Social spectrum",
    intensity: "spectrum",
    principle:
      "More color in navigation, participant accents, journey state, and experience context. Human text stays readable. Avoid loud permanent colors on people.",
  },
  c: {
    label: "Full cinematic future",
    intensity: "cinematic",
    principle:
      "Push saturation and cinematic separation deliberately as an upper-bound reference. Not a production recommendation by drama alone.",
  },
};

export const CONTRAST_NOTES = {
  recognitionOnDepth: "Cyan #3EE0F0 on #05060A exceeds WCAG AA for large text; pair with weight/shape for small labels",
  participationOnDepth: "Amber #F0B429 on #05060A AA large; verify small body with neutral text fallback",
  privateOnDepth: "Violet #A78BFA on #05060A AA large",
  executionOnDepth: "Electric blue #3B82F6 on #05060A AA large",
  completionOnDepth: "Emerald #10B981 on #05060A AA large",
  riskOnDepth: "Controlled red #E85D5D on #05060A AA large; never red-only error",
  humanNeutralOnDepth: "Warm white #F2EDE6 on #05060A AA body",
} as const;
