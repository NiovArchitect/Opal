/**
 * Client mirror of ExternalWorldTruth / provider-backed Curate presentation (Pass 15).
 *
 * SOCIAL_FIT != PROVIDER_FACT != EXECUTION
 * Provider ordering is never product authority.
 */

export type Provenance = {
  source: string;
  source_item_id?: string | null;
  observed_at?: string | null;
  valid_until?: string | null;
  synthetic?: boolean;
  real?: boolean;
  live?: boolean;
  recorded?: boolean;
  confidence?: number;
};

export type ProviderPlaceCandidate = {
  id: string;
  name: string;
  area?: string;
  address?: string;
  lat?: number;
  lng?: number;
  open_now?: boolean | "unknown";
  hours_known?: boolean;
  travel_minutes?: number | null;
  cuisine?: string;
  quiet?: boolean;
  provider_place_id?: string;
  provenance?: Provenance;
  /** Social score from Opal fit — not provider rank */
  social_score?: number;
  reservation_available?: "unknown" | boolean;
};

export type CurateProviderLine = {
  title: string;
  meta: string;
  openLabel: string | null;
  travelLabel: string | null;
  fitHint: string | null;
};

/** Quiet Curate line — no provider metadata overload. */
export function curatePresentation(c: ProviderPlaceCandidate): CurateProviderLine {
  const openLabel =
    c.open_now === true ? null : c.open_now === false ? "closed" : c.hours_known === false ? null : null;
  // Prefer not to show open noise when open; only useful states
  const openUseful =
    c.open_now === false ? "Closed" : c.open_now === "unknown" || c.hours_known === false ? null : null;

  const travelLabel =
    typeof c.travel_minutes === "number" && c.travel_minutes > 0
      ? `about ${Math.round(c.travel_minutes)} min`
      : null;

  const metaParts = [c.area, travelLabel].filter(Boolean);
  return {
    title: c.name,
    meta: metaParts.join(" · "),
    openLabel: openUseful,
    travelLabel,
    fitHint: c.social_score != null && c.social_score >= 4.3 ? "Good fit" : null,
  };
}

export function overclaimsProvider(text: string): boolean {
  return (
    /\b(booked|confirmed reservation|table is reserved|open now|available for booking|paid|charged)\b/i.test(
      text,
    ) && !/\b(might|looks|could|candidate|fit)\b/i.test(text)
  );
}

export function llmIsNotProvider(source: string): boolean {
  const s = source.toLowerCase();
  return !["llm", "model", "inference", "openai", "anthropic", "grok", "gpt"].includes(s);
}

export function hasProvenance(c: ProviderPlaceCandidate): boolean {
  return !!(c.provenance?.source && c.provenance?.observed_at);
}

/** Merge provider candidates under social ranking — provider order ignored. */
export function mergeProviderIntoSocialRank(
  providerCandidates: ProviderPlaceCandidate[],
  socialOrderedIds: string[],
): ProviderPlaceCandidate[] {
  const byId = new Map(providerCandidates.map((c) => [c.provider_place_id || c.id, c]));
  const out: ProviderPlaceCandidate[] = [];
  for (const id of socialOrderedIds) {
    const c = byId.get(id);
    if (c) out.push(c);
  }
  // append any not in social list (should be rare)
  for (const c of providerCandidates) {
    const id = c.provider_place_id || c.id;
    if (!socialOrderedIds.includes(id)) out.push(c);
  }
  return out;
}

export function placeIdentity(c: ProviderPlaceCandidate | null) {
  if (!c) return null;
  return {
    display_name: c.name,
    provider_place_id: c.provider_place_id || c.id,
    provider: c.provenance?.source || "unknown",
    area_label: c.area,
    address: c.address,
    lat: c.lat,
    lng: c.lng,
    truth_class: "provider_fact" as const,
    provenance: c.provenance,
    authorizes_set: false,
    reservation_available: "unknown" as const,
  };
}

export function softTravelCopy(minutes: number | null | undefined, trafficAware = false): string | null {
  if (minutes == null || minutes <= 0) return null;
  if (trafficAware) return `Leave in about ${Math.round(minutes)} minutes.`;
  const bucket =
    minutes <= 10 ? 10 : minutes <= 15 ? 15 : minutes <= 20 ? 20 : minutes <= 25 ? 25 : minutes <= 30 ? 30 : 40;
  return `Leave in about ${bucket} minutes.`;
}
