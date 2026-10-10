/**
 * Paste W6 Phase 3a — deterministic ear-palette gradient tiles for contact initials.
 * Stops: #6573EB → #5FAECF → #DD70E9 → #DE58AD (brand ear iridescence).
 */

import { BRAND } from "../brand/brand";

const EAR_STOPS = [
  BRAND.palette.earBlue,
  BRAND.palette.earTeal,
  BRAND.palette.earViolet,
  BRAND.palette.earPinkAccent,
] as const;

function hashContactId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Two-stop linear gradient rotated by contact id hash. */
export function contactEarGradient(contactId: string | null | undefined): string {
  const key = (contactId || "opal").trim() || "opal";
  const h = hashContactId(key.toLowerCase());
  const a = EAR_STOPS[h % EAR_STOPS.length]!;
  const b = EAR_STOPS[(h >>> 8) % EAR_STOPS.length]!;
  const angle = 120 + (h % 90);
  return `linear-gradient(${angle}deg, ${a} 0%, ${b} 100%)`;
}

export function contactInitial(name: string | null | undefined): string {
  const n = (name || "").trim();
  if (!n) return "?";
  return n.slice(0, 1).toUpperCase();
}
