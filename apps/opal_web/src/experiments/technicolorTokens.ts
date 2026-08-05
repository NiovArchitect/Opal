/**
 * Dark Technicolor experiment tokens — NOT production defaults.
 * Apply via data-theme="technicolor-a|b|c" only in local/experiment builds.
 */

export type TechnicolorVariant = "a" | "b" | "c";

export const TECHNICOLOR_SEMANTIC = {
  recognition: "#3EE0F0",
  participation: "#F0B429",
  ready: "#2FCF8B",
  private: "#A78BFA",
  risk: "#E85D5D",
  humanNeutral: "#F2EDE6",
  depth: "#05060A",
  depthRaised: "#0C0F16",
} as const;

export const VARIANT_NOTES: Record<
  TechnicolorVariant,
  { label: string; intensity: "controlled" | "spectrum" | "cinematic" }
> = {
  a: { label: "Controlled cinematic", intensity: "controlled" },
  b: { label: "Social spectrum", intensity: "spectrum" },
  c: { label: "Full cinematic future", intensity: "cinematic" },
};
