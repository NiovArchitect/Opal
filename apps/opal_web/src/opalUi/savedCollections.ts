/**
 * Named bookmark collections for Home Save — local product store.
 * Default bucket id "saved" mirrors the previous flat Saved list.
 */

export type SavedCollection = {
  id: string;
  name: string;
  createdAt: string;
};

export type CollectionMembership = Record<string, string[]>; // collectionId → contentIds

const COLLECTIONS_KEY = "opal.home.saved_collections.v1";
const MEMBERSHIP_KEY = "opal.home.saved_membership.v1";

export const DEFAULT_COLLECTION_ID = "saved";
export const DEFAULT_COLLECTION_NAME = "Saved";

function emptyCollections(): SavedCollection[] {
  return [
    {
      id: DEFAULT_COLLECTION_ID,
      name: DEFAULT_COLLECTION_NAME,
      createdAt: "1970-01-01T00:00:00.000Z",
    },
  ];
}

export function loadCollections(): SavedCollection[] {
  if (typeof window === "undefined") return emptyCollections();
  try {
    const raw = localStorage.getItem(COLLECTIONS_KEY);
    if (!raw) return emptyCollections();
    const parsed = JSON.parse(raw) as SavedCollection[];
    if (!Array.isArray(parsed) || !parsed.length) return emptyCollections();
    if (!parsed.some((c) => c.id === DEFAULT_COLLECTION_ID)) {
      return [...emptyCollections(), ...parsed];
    }
    return parsed;
  } catch {
    return emptyCollections();
  }
}

export function saveCollections(list: SavedCollection[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(list));
  } catch {
    /* private mode */
  }
}

export function loadMembership(): CollectionMembership {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(MEMBERSHIP_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CollectionMembership;
  } catch {
    return {};
  }
}

export function saveMembership(m: CollectionMembership): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MEMBERSHIP_KEY, JSON.stringify(m));
  } catch {
    /* private mode */
  }
}

export function createCollection(name: string): SavedCollection {
  const trimmed = name.trim();
  const col: SavedCollection = {
    id: `col-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: trimmed || "Untitled",
    createdAt: new Date().toISOString(),
  };
  const next = [...loadCollections(), col];
  saveCollections(next);
  return col;
}

export function addToCollection(collectionId: string, contentId: string): void {
  const m = loadMembership();
  const ids = new Set(m[collectionId] || []);
  ids.add(contentId);
  m[collectionId] = [...ids];
  // Keep only one primary membership for browse clarity — remove from others.
  for (const key of Object.keys(m)) {
    if (key === collectionId) continue;
    m[key] = (m[key] || []).filter((id) => id !== contentId);
  }
  saveMembership(m);
}

export function removeFromAllCollections(contentId: string): void {
  const m = loadMembership();
  for (const key of Object.keys(m)) {
    m[key] = (m[key] || []).filter((id) => id !== contentId);
  }
  saveMembership(m);
}

export function idsInCollection(collectionId: string): string[] {
  return loadMembership()[collectionId] || [];
}

export function collectionForContent(contentId: string): string | null {
  const m = loadMembership();
  for (const [cid, ids] of Object.entries(m)) {
    if ((ids || []).includes(contentId)) return cid;
  }
  return null;
}
