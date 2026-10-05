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

export type PersonContactMeta = {
  type?: RelationshipTypeValue | string | null;
  phone?: string | null;
};

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
