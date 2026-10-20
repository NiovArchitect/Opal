/**
 * RU-1 relationship type labels — shared by You hub People + person profile.
 */
import type { RelationshipTypeValue } from "../api/productClient";

export const RELATIONSHIP_TYPE_OPTIONS: {
  value: RelationshipTypeValue;
  label: string;
}[] = [
  { value: "spouse", label: "Spouse" },
  { value: "partner", label: "Partner" },
  { value: "family", label: "Family" },
  { value: "close_friend", label: "Close friend" },
  { value: "friend", label: "Friend" },
  { value: "business", label: "Business" },
  { value: "acquaintance", label: "Acquaintance" },
];

export function relationshipTypeLabel(type: string | null | undefined): string {
  if (!type) return "Not set";
  const hit = RELATIONSHIP_TYPE_OPTIONS.find((o) => o.value === type);
  return hit?.label || type;
}

/**
 * Repair #19 W24 (DL-03 / DL-12) — THE one label truth for ties.
 *
 * Every served surface that names who a person is to you reads its
 * words from this module and nowhere else. The singular map above
 * (RELATIONSHIP_TYPE_OPTIONS) names ONE person ("Partner", "Close
 * friend"); the group map below names a check-in circle of people
 * ("Partners", "Close friends") and is used ONLY for circle group
 * headers. Before W24 the C2 hosts carried their own duplicated
 * plural map and spent it on single-person surfaces — a partner
 * rendered as "Partners" on their own profile.
 */

/** Family subtype slugs + finished labels — the backend's real
 *  vocabulary (Relationships.FamilySubtype, served on the
 *  relationships index as `family_subtypes`), in picker order. */
export const FAMILY_SUBTYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "parent", label: "Parent" },
  { value: "child", label: "Child" },
  { value: "sibling", label: "Sibling" },
  { value: "grandparent", label: "Grandparent" },
  { value: "aunt_uncle", label: "Aunt / Uncle" },
  { value: "cousin", label: "Cousin" },
  { value: "niece_nephew", label: "Niece / Nephew" },
  { value: "co_parent", label: "Co-parent" },
];

export function familySubtypeLabel(
  subtype: string | null | undefined,
): string | null {
  if (!subtype) return null;
  return FAMILY_SUBTYPE_OPTIONS.find((o) => o.value === subtype)?.label ?? null;
}

/**
 * Founder Screen Notes N4 — AGE BANDS (affordance only; what any
 * band restricts is a founder-gated policy that does not exist yet
 * and must bind to this exact shape later).
 *
 * The band is a fact the viewer establishes about the counterpart
 * on the viewer's relationship record (`relationship_types.age_band`,
 * served as `age_band`), one of three values or null (not
 * established):
 *  - "under_13": under 13
 *  - "age_13_17": 13-17
 *  - "adult": 18 or over
 * Minor, in the founder's terms, is 17 and under — exactly the two
 * non-adult bands.
 */
export type AgeBandValue = "under_13" | "age_13_17" | "adult";

export const AGE_BAND_OPTIONS: { value: AgeBandValue; label: string }[] = [
  { value: "under_13", label: "Under 13" },
  { value: "age_13_17", label: "13-17" },
  { value: "adult", label: "Adult (18 or over)" },
];

export function isAgeBandValue(v: unknown): v is AgeBandValue {
  return v === "under_13" || v === "age_13_17" || v === "adult";
}

export function ageBandLabel(band: string | null | undefined): string | null {
  if (!band) return null;
  return AGE_BAND_OPTIONS.find((o) => o.value === band)?.label ?? null;
}

/** Minor = 17 and under (founder's terms): the two non-adult bands. */
export function ageBandIsMinor(band: string | null | undefined): boolean {
  return band === "under_13" || band === "age_13_17";
}

/**
 * The finished SINGULAR tie for one person: "Partner", "Close
 * friend", "Family - Sister" (type + subtype). An unset or unknown
 * type renders NOTHING (null) — a tie is never guessed, and a raw
 * slug never reaches the glass.
 */
export function tieLabel(
  type: string | null | undefined,
  familySubtype?: string | null | undefined,
): string | null {
  if (!type) return null;
  const hit = RELATIONSHIP_TYPE_OPTIONS.find((o) => o.value === type);
  if (!hit) return null;
  if (type === "family") {
    const sub = familySubtypeLabel(familySubtype);
    if (sub) return `Family - ${sub}`;
  }
  return hit.label;
}

/** Plural GROUP words for check-in circle headers only ("Your
 *  circles" groups name a set of people, never one person). */
export const RELATIONSHIP_GROUP_LABELS: Record<string, string> = {
  spouse: "Spouse",
  partner: "Partners",
  family: "Family",
  close_friend: "Close friends",
  friend: "Friends",
  business: "Work",
  acquaintance: "Acquaintances",
};

export function relationshipGroupLabel(type: string): string | null {
  return RELATIONSHIP_GROUP_LABELS[type] ?? null;
}

/**
 * Repair #19 W24 (DL-09, bounded leg) — close-circle membership is
 * DERIVED from the type, exactly as the backend derives it
 * (Lives / TemporaryStoryPublishing: spouse, partner, family,
 * close_friend). There is no per-person close-circle write path:
 * choosing one of these types IS the membership write, and any
 * other type is outside the circle. Surfaces may render the cue
 * from this derivation; they may not offer a separate toggle.
 */
export const CLOSE_CIRCLE_TYPES: ReadonlySet<string> = new Set([
  "spouse",
  "partner",
  "family",
  "close_friend",
]);

export function isCloseCircleType(type: string | null | undefined): boolean {
  return Boolean(type) && CLOSE_CIRCLE_TYPES.has(type as string);
}

/** Local person meta when no contact_user_id / type yet (seed + offline). */
const PERSON_META_KEY = "opal.person.contact_meta.v1";

/**
 * Owner-scoped contact meta. Address-book phone/email/notes stay private to the
 * OWNER — never promote into relationship templates / communication_bounds
 * merely because contacts were imported.
 */
export type PersonContactMeta = {
  type?: RelationshipTypeValue | string | null;
  /** @deprecated Prefer ownerPrivatePhone — kept for local read compat. */
  phone?: string | null;
  /** Address-book / owner-only phone. Visible only to this device owner. */
  ownerPrivatePhone?: string | null;
  /** Explicitly relationship-shared phone (authorized). */
  sharedPhone?: string | null;
  /** Owner-only email from local address book — never relationship-visible. */
  ownerPrivateEmail?: string | null;
  /** Owner-only notes — never relationship-visible. */
  ownerPrivateNotes?: string | null;
};

/** Resolve phone for owner profile UI with privacy provenance. */
export function ownerVisiblePhone(meta: PersonContactMeta): {
  value: string | null;
  provenance: "shared" | "owner_private" | null;
} {
  const shared = (meta.sharedPhone || "").trim();
  if (shared) return { value: shared, provenance: "shared" };
  const priv = (meta.ownerPrivatePhone || meta.phone || "").trim();
  if (priv) return { value: priv, provenance: "owner_private" };
  return { value: null, provenance: null };
}

type PersonMetaStore = Record<string, PersonContactMeta>;

function metaKey(nameOrId: string): string {
  return nameOrId.trim().toLowerCase();
}

function readStore(): PersonMetaStore {
  try {
    const raw = localStorage.getItem(PERSON_META_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersonMetaStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: PersonMetaStore) {
  try {
    localStorage.setItem(PERSON_META_KEY, JSON.stringify(store));
  } catch {
    /* private mode */
  }
}

export function readPersonContactMeta(nameOrId: string): PersonContactMeta {
  const store = readStore();
  return store[metaKey(nameOrId)] || {};
}

export function writePersonContactMeta(
  nameOrId: string,
  patch: PersonContactMeta,
): PersonContactMeta {
  const store = readStore();
  const key = metaKey(nameOrId);
  const next = { ...(store[key] || {}), ...patch };
  store[key] = next;
  writeStore(store);
  return next;
}
