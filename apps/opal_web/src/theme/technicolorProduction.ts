/**
 * Production Technicolor system (founder decision).
 *
 * FULL → pre-membership walkthrough only
 * CONTROLLED → activation + authenticated member product
 *
 * Not the experiment PR #53 review surface.
 * Human conversation stays calm. Opal moments use semantic light.
 */

/** Rollout control: set VITE_OPAL_TECHNICOLOR=false to restore pre-theme visuals. */
export function technicolorProductionEnabled(): boolean {
  const env = (import.meta as { env?: Record<string, string> }).env;
  return env?.VITE_OPAL_TECHNICOLOR !== "false";
}

export type VisualPhase = "walkthrough" | "activation" | "member";

export type TechnicolorIntensity = "full" | "controlled" | "off";

export function intensityForPhase(phase: VisualPhase): TechnicolorIntensity {
  if (!technicolorProductionEnabled()) return "off";
  if (phase === "walkthrough") return "full";
  return "controlled";
}

/** Shell attributes for production visual boundary. */
export function visualShellProps(phase: VisualPhase): {
  "data-visual-phase": VisualPhase;
  "data-technicolor": TechnicolorIntensity;
  className: string;
} {
  const intensity = intensityForPhase(phase);
  return {
    "data-visual-phase": phase,
    "data-technicolor": intensity,
    className:
      intensity === "off"
        ? ""
        : intensity === "full"
          ? "tc-full"
          : "tc-controlled",
  };
}

/** Opal-owned cinematic spectrum (hex starting points; contrast-tested in CSS). */
export const OPAL_SPECTRUM = {
  stageBlack: "#05060A",
  charcoal: "#0C0F16",
  luminousCyan: "#3EE0F0",
  goldenAmber: "#F0B429",
  deepViolet: "#8B5CF6",
  electricRoyal: "#3B82F6",
  richEmerald: "#10B981",
  saturatedRuby: "#E11D48",
  warmIvory: "#F2EDE6",
} as const;

export type SemanticState =
  | "recognition"
  | "participation"
  | "private"
  | "execution"
  | "completion"
  | "urgency";

/** Map product signal kinds → semantic state for Controlled product. */
export function semanticStateForSignal(kind: string | undefined | null): SemanticState {
  switch (kind) {
    case "plan_forming":
    case "availability_overlap":
    case "option_surfaced":
      // Overlap is progress/recognition — never completion emerald.
      return "recognition";
    case "open_loop":
      return "participation";
    case "ready":
    case "follow_through":
    case "moment":
    case "set":
      // Completion emerald reserved for authoritative Set / ready only.
      return "completion";
    case "private":
      return "private";
    case "execution":
    case "reservation":
      return "execution";
    case "held":
    case "urgency":
      return "urgency";
    case "failed":
    case "expired":
      return "urgency";
    default:
      return "recognition";
  }
}

export const WALKTHROUGH_SCENE_MOOD: Record<
  string,
  { mood: string; dominant: string }
> = {
  welcome: { mood: "awakening", dominant: "cyan-ivory" },
  spark: { mood: "emergence", dominant: "cyan-violet-amber" },
  plan: { mood: "balance", dominant: "violet-amber" },
  follow: { mood: "execution", dominant: "royal-emerald" },
  calm: { mood: "promise", dominant: "full-spectrum" },
};

export const FOUNDER_VISUAL_DECISION = {
  walkthrough: "full" as const,
  activation: "controlled" as const,
  memberProduct: "controlled" as const,
  humanConversation: "calm",
  opalMoments: "semantic-luminous",
  experimentPr: 53,
  experimentMerge: false,
} as const;
