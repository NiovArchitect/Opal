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
