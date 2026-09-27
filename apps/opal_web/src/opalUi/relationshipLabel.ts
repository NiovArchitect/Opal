/**
 * What this viewer may see about a relationship.
 * A missing or unconfirmed label stays blank. Inference is not shared truth.
 * Romantic labels require an explicit or mutually confirmed source.
 */

const ROMANTIC = new Set([
  "girlfriend",
  "boyfriend",
  "wife",
  "husband",
  "partner",
  "fiancé",
  "fiance",
  "fiancée",
  "spouse",
]);

export type RelationshipView = {
  status?: "candidate" | "confirmed" | string;
  explicit?: boolean;
  /** Shown only to the viewer who owns a private label. */
  viewerLabel?: string | null;
  /** Shared wording, already resolved for this viewer (Daughter vs Father). */
  sharedLabel?: string | null;
  canonicalType?: string | null;
  source?: "explicit" | "mutual" | "inferred" | string;
  privacy?: "private" | "participants" | string;
};

export function relationshipHeaderLabel(view: RelationshipView | null | undefined): string | null {
  if (!view || view.status !== "confirmed" || view.explicit !== true) return null;
  const canonical = (view.canonicalType || "").toLowerCase();
  const romantic = ROMANTIC.has(canonical);
  const sourceOk = view.source === "explicit" || view.source === "mutual";
  if (romantic && !sourceOk) return null;
  if (view.privacy === "private") {
    const label = view.viewerLabel?.trim();
    return label || null;
  }
  const shared = view.sharedLabel?.trim();
  if (shared) return shared;
  const own = view.viewerLabel?.trim();
  return own || null;
}
