/**
 * Paste G Phase 9 — preview card tokens for in-thread artifact shares.
 * Brand colors from brand.ts — do not invent a parallel palette.
 */
import { BRAND } from "../brand/brand";

export type ArtifactPreviewCard = {
  title: string;
  subtitle?: string;
  kind: "trip_itinerary" | "event_plan" | string;
  brand?: {
    cyan?: string;
    gold?: string;
    midnight?: string;
    ink?: string;
  };
  cta?: string;
  footer?: string;
};

export type ArtifactPreviewPayload = {
  artifact_id: string;
  kind: string;
  plan_id: string;
  version: number;
  title: string;
  subtitle?: string;
  share_url: string;
  expires_at?: string;
  outdated?: boolean;
  preview_card: ArtifactPreviewCard;
};

/** Styles for a compact in-thread preview using Brand V4 tokens. */
export function artifactPreviewStyles(card?: ArtifactPreviewCard) {
  const c = BRAND.palette;
  return {
    background: card?.brand?.ink ?? c.deepSpace,
    color: c.luminousWhite,
    borderColor: card?.brand?.cyan ?? c.opalCyan,
    accent: card?.brand?.gold ?? c.alignmentGold,
    cyan: card?.brand?.cyan ?? c.opalCyan,
    midnight: card?.brand?.midnight ?? c.midnight,
  };
}

export function artifactPreviewFooter(card?: ArtifactPreviewCard): string {
  return card?.footer ?? "Made with Opal";
}
