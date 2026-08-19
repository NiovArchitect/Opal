/**
 * Home social engagement — OPTIMISTIC CACHE / fixture adapter only.
 * System of record for durable SocialMoment ids is BEAM (SocialMomentEngagement).
 * Authorization helpers remain for fixture content and offline denial paths.
 */

export type ContentVisibility = "public" | "eligible" | "private" | "invite_only";

export type HomeComment = {
  id: string;
  contentId: string;
  authorUserId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type EngagementState = {
  likes: Record<string, string[]>; // contentId → userIds
  saves: Record<string, string[]>;
  reposts: Record<string, string[]>;
  comments: Record<string, HomeComment[]>;
  forwards: Record<string, { to: string; mode: "separate" | "together"; at: string }[]>;
  /** Soft Graph interest — distinct from participant going/committed. */
  graphInterest: Record<string, string[]>;
  graphGoing: Record<string, string[]>;
};

export type ContentAuthMeta = {
  id: string;
  visibility: ContentVisibility;
  ownerUserId?: string | null;
  ownerName?: string | null;
  /** Relationship peers who may view private content */
  allowedViewerIds?: string[];
  allowedViewerNames?: string[];
};

const STORAGE_KEY = "opal.home.engagement.v1";

function emptyState(): EngagementState {
  return {
    likes: {},
    saves: {},
    reposts: {},
    comments: {},
    forwards: {},
    graphInterest: {},
    graphGoing: {},
  };
}

export function loadEngagement(): EngagementState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    return { ...emptyState(), ...JSON.parse(raw) };
  } catch {
    return emptyState();
  }
}

export function saveEngagement(state: EngagementState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode */
  }
}

export type AuthResult =
  | { ok: true }
  | { ok: false; reason: "DENIED"; detail: string };

/** Eligibility before any engagement mutation or read. */
export function authorizeContentAccess(
  meta: ContentAuthMeta,
  viewer: { userId?: string | null; displayName?: string | null },
): AuthResult {
  const vis = meta.visibility || "eligible";
  if (vis === "public" || vis === "eligible") return { ok: true };
  const uid = viewer.userId || "";
  const name = viewer.displayName || "";
  if (meta.ownerUserId && uid && meta.ownerUserId === uid) return { ok: true };
  if (meta.ownerName && name && meta.ownerName === name) return { ok: true };
  if (uid && (meta.allowedViewerIds || []).includes(uid)) return { ok: true };
  if (name && (meta.allowedViewerNames || []).includes(name)) return { ok: true };
  return {
    ok: false,
    reason: "DENIED",
    detail: `Unauthorized for ${meta.id} (${vis})`,
  };
}

function toggleMembership(
  map: Record<string, string[]>,
  contentId: string,
  userId: string,
): { next: Record<string, string[]>; on: boolean } {
  const cur = new Set(map[contentId] || []);
  let on: boolean;
  if (cur.has(userId)) {
    cur.delete(userId);
    on = false;
  } else {
    cur.add(userId);
    on = true;
  }
  return { next: { ...map, [contentId]: [...cur] }, on };
}

export function toggleLike(
  state: EngagementState,
  meta: ContentAuthMeta,
  viewer: { userId: string; displayName?: string },
): { state: EngagementState; result: AuthResult; liked: boolean } {
  const auth = authorizeContentAccess(meta, viewer);
  if (!auth.ok) return { state, result: auth, liked: false };
  const { next, on } = toggleMembership(state.likes, meta.id, viewer.userId);
  const ns = { ...state, likes: next };
  saveEngagement(ns);
  return { state: ns, result: auth, liked: on };
}

export function toggleSave(
  state: EngagementState,
  meta: ContentAuthMeta,
  viewer: { userId: string },
): { state: EngagementState; result: AuthResult; saved: boolean } {
  const auth = authorizeContentAccess(meta, viewer);
  if (!auth.ok) return { state, result: auth, saved: false };
  const { next, on } = toggleMembership(state.saves, meta.id, viewer.userId);
  const ns = { ...state, saves: next };
  saveEngagement(ns);
  return { state: ns, result: auth, saved: on };
}

export function toggleRepost(
  state: EngagementState,
  meta: ContentAuthMeta,
  viewer: { userId: string },
): { state: EngagementState; result: AuthResult; reposted: boolean } {
  const auth = authorizeContentAccess(meta, viewer);
  if (!auth.ok) return { state, result: auth, reposted: false };
  // Repost only when content is already eligible/public for the viewer.
  if (meta.visibility === "private" || meta.visibility === "invite_only") {
    return {
      state,
      result: { ok: false, reason: "DENIED", detail: "Repost requires eligible audience" },
      reposted: false,
    };
  }
  const { next, on } = toggleMembership(state.reposts, meta.id, viewer.userId);
  const ns = { ...state, reposts: next };
  saveEngagement(ns);
  return { state: ns, result: auth, reposted: on };
}

export function addComment(
  state: EngagementState,
  meta: ContentAuthMeta,
  viewer: { userId: string; displayName: string },
  body: string,
): { state: EngagementState; result: AuthResult; comment?: HomeComment } {
  const auth = authorizeContentAccess(meta, viewer);
  if (!auth.ok) return { state, result: auth };
  const trimmed = body.trim();
  if (!trimmed) {
    return { state, result: { ok: false, reason: "DENIED", detail: "Empty comment" } };
  }
  const comment: HomeComment = {
    id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    contentId: meta.id,
    authorUserId: viewer.userId,
    authorName: viewer.displayName,
    body: trimmed.slice(0, 2000),
    createdAt: new Date().toISOString(),
  };
  const list = [...(state.comments[meta.id] || []), comment];
  const ns = { ...state, comments: { ...state.comments, [meta.id]: list } };
  saveEngagement(ns);
  return { state: ns, result: auth, comment };
}

export function listComments(
  state: EngagementState,
  meta: ContentAuthMeta,
  viewer: { userId?: string | null; displayName?: string | null },
): { result: AuthResult; comments: HomeComment[] } {
  const auth = authorizeContentAccess(meta, viewer);
  if (!auth.ok) return { result: auth, comments: [] };
  return { result: auth, comments: state.comments[meta.id] || [] };
}

export function forwardContent(
  state: EngagementState,
  meta: ContentAuthMeta,
  viewer: { userId: string },
  recipients: string[],
  mode: "separate" | "together",
): { state: EngagementState; result: AuthResult } {
  const auth = authorizeContentAccess(meta, viewer);
  if (!auth.ok) return { state, result: auth };
  if (!recipients.length) {
    return { state, result: { ok: false, reason: "DENIED", detail: "No recipients" } };
  }
  const at = new Date().toISOString();
  const rows =
    mode === "together"
      ? [{ to: recipients.join(","), mode, at }]
      : recipients.map((to) => ({ to, mode: "separate" as const, at }));
  const prev = state.forwards[meta.id] || [];
  const ns = {
    ...state,
    forwards: { ...state.forwards, [meta.id]: [...prev, ...rows] },
  };
  saveEngagement(ns);
  return { state: ns, result: auth };
}

/** Soft interest — never collapses into going/committed. */
export function toggleGraphInterest(
  state: EngagementState,
  graphId: string,
  userId: string,
): { state: EngagementState; interested: boolean } {
  const { next, on } = toggleMembership(state.graphInterest, graphId, userId);
  const ns = { ...state, graphInterest: next };
  saveEngagement(ns);
  return { state: ns, interested: on };
}

export function isLiked(state: EngagementState, contentId: string, userId: string) {
  return (state.likes[contentId] || []).includes(userId);
}
export function isSaved(state: EngagementState, contentId: string, userId: string) {
  return (state.saves[contentId] || []).includes(userId);
}
export function isReposted(state: EngagementState, contentId: string, userId: string) {
  return (state.reposts[contentId] || []).includes(userId);
}
export function likeCount(state: EngagementState, contentId: string, base = 0) {
  return base + (state.likes[contentId] || []).length;
}
export function commentCount(state: EngagementState, contentId: string, base = 0) {
  return base + (state.comments[contentId] || []).length;
}
