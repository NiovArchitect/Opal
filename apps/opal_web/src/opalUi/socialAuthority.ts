/**
 * Social engagement authority adapter.
 * BEAM is system of record for durable SocialMoment ids.
 * Client engagement store remains optimistic cache / fixture adapter only.
 */
import {
  addSocialMomentComment,
  createTemporaryStory,
  fetchHomeFeed,
  isDurableMomentId,
  likeSocialMoment,
  listSocialMomentComments,
  publishSocialMoment,
  repostSocialMoment,
  saveSocialMoment,
  sendMessage,
  ensureDirectConversation,
  unlikeSocialMoment,
  unrepostSocialMoment,
  unsaveSocialMoment,
} from "../api/productClient";
import type { FounderFeedCard } from "./founderGraphSeed";
import {
  addComment as localAddComment,
  authorizeContentAccess,
  forwardContent as localForward,
  listComments as localListComments,
  loadEngagement,
  toggleLike as localToggleLike,
  toggleRepost as localToggleRepost,
  toggleSave as localToggleSave,
  type ContentAuthMeta,
  type EngagementState,
  type HomeComment,
} from "./homeEngagementStore";

export function humanWhen(iso: unknown): string {
  if (!iso || typeof iso !== "string") return "Just now";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "Just now";
  const mins = Math.max(0, Math.floor((Date.now() - t) / 60000));
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

/** Map HomeFeed DTO → FounderFeedCard for GraphSocialHome. */
export function productionObjectToCard(obj: Record<string, unknown>): FounderFeedCard {
  const actor = (obj.actor || {}) as Record<string, unknown>;
  const eng = (obj.engagement_summary || {}) as Record<string, unknown>;
  const name = String(actor.display_name || "Someone");
  const media = typeof obj.media_ref === "string" ? obj.media_ref : undefined;
  return {
    id: String(obj.id),
    kind: "memory",
    person: name,
    personInitial: String(actor.initial || name.slice(0, 1)),
    when: humanWhen(obj.created_at),
    title: String(obj.caption || "Memory"),
    detail: "Memory",
    caption: String(obj.caption || ""),
    mediaSrc: media && media.startsWith("/") ? media : undefined,
    likeCount: Number(eng.like_count || 0),
    commentCount: Number(eng.comment_count || 0),
    repostCount: Number(eng.repost_count || 0),
    ctaAction: "open_memory",
  };
}

export async function loadProductionHomeOwners(bearer?: string) {
  const feed = await fetchHomeFeed({ limit: 40, bearer });
  const memories = (feed.objects || [])
    .filter((o) => o.object_type === "memory" || !o.object_type)
    .map((o) => productionObjectToCard(o));
  return {
    feed,
    memories,
    stories: feed.stories || [],
    productionOwners: {
      memories,
      followGraph: { followingNames: [] as string[] },
      ranking: {},
    },
  };
}

export async function authoritativeLike(opts: {
  contentId: string;
  liked: boolean;
  bearer?: string;
  engagement: EngagementState;
  meta: ContentAuthMeta;
  viewer: { userId: string; displayName?: string };
}): Promise<{ engagement: EngagementState; liked: boolean; authority: "beam" | "fixture_cache" }> {
  if (isDurableMomentId(opts.contentId) && opts.bearer) {
    const res = opts.liked
      ? await unlikeSocialMoment(opts.contentId, opts.bearer)
      : await likeSocialMoment(opts.contentId, opts.bearer);
    return {
      engagement: opts.engagement,
      liked: !!res.viewer_liked,
      authority: "beam",
    };
  }
  const local = localToggleLike(opts.engagement, opts.meta, opts.viewer);
  return { engagement: local.state, liked: local.liked, authority: "fixture_cache" };
}

export async function authoritativeSave(opts: {
  contentId: string;
  saved: boolean;
  bearer?: string;
  engagement: EngagementState;
  meta: ContentAuthMeta;
  viewer: { userId: string };
}): Promise<{ engagement: EngagementState; saved: boolean; authority: "beam" | "fixture_cache" }> {
  if (isDurableMomentId(opts.contentId) && opts.bearer) {
    const res = opts.saved
      ? await unsaveSocialMoment(opts.contentId, opts.bearer)
      : await saveSocialMoment(opts.contentId, opts.bearer);
    return { engagement: opts.engagement, saved: !!res.viewer_saved, authority: "beam" };
  }
  const local = localToggleSave(opts.engagement, opts.meta, opts.viewer);
  return { engagement: local.state, saved: local.saved, authority: "fixture_cache" };
}

export async function authoritativeRepost(opts: {
  contentId: string;
  reposted: boolean;
  bearer?: string;
  engagement: EngagementState;
  meta: ContentAuthMeta;
  viewer: { userId: string };
}): Promise<{
  engagement: EngagementState;
  reposted: boolean;
  authority: "beam" | "fixture_cache";
  error?: string;
}> {
  if (isDurableMomentId(opts.contentId) && opts.bearer) {
    try {
      const res = opts.reposted
        ? await unrepostSocialMoment(opts.contentId, opts.bearer)
        : await repostSocialMoment(opts.contentId, opts.bearer);
      return {
        engagement: opts.engagement,
        reposted: !!res.viewer_reposted,
        authority: "beam",
      };
    } catch (e) {
      return {
        engagement: opts.engagement,
        reposted: opts.reposted,
        authority: "beam",
        error: e instanceof Error ? e.message : "repost_failed",
      };
    }
  }
  const local = localToggleRepost(opts.engagement, opts.meta, opts.viewer);
  return {
    engagement: local.state,
    reposted: local.reposted,
    authority: "fixture_cache",
    error: local.result.ok ? undefined : local.result.detail,
  };
}

export async function authoritativeListComments(opts: {
  contentId: string;
  bearer?: string;
  engagement: EngagementState;
  meta: ContentAuthMeta;
  viewer: { userId?: string | null; displayName?: string | null };
}): Promise<{ comments: HomeComment[]; denied?: string; authority: "beam" | "fixture_cache" }> {
  if (isDurableMomentId(opts.contentId) && opts.bearer) {
    try {
      const res = await listSocialMomentComments(opts.contentId, opts.bearer);
      return {
        authority: "beam",
        comments: (res.comments || []).map((c) => ({
          id: c.id,
          contentId: c.content_id,
          authorUserId: c.author_user_id,
          authorName: c.author_name,
          body: c.body,
          createdAt: c.created_at,
        })),
      };
    } catch (e) {
      return {
        authority: "beam",
        comments: [],
        denied: e instanceof Error ? e.message : "DENIED",
      };
    }
  }
  const local = localListComments(opts.engagement, opts.meta, opts.viewer);
  return {
    authority: "fixture_cache",
    comments: local.comments,
    denied: local.result.ok ? undefined : local.result.detail,
  };
}

export async function authoritativeAddComment(opts: {
  contentId: string;
  body: string;
  bearer?: string;
  engagement: EngagementState;
  meta: ContentAuthMeta;
  viewer: { userId: string; displayName: string };
}): Promise<{ engagement: EngagementState; denied?: string; authority: "beam" | "fixture_cache" }> {
  if (isDurableMomentId(opts.contentId) && opts.bearer) {
    try {
      await addSocialMomentComment(opts.contentId, opts.body, opts.bearer);
      return { engagement: opts.engagement, authority: "beam" };
    } catch (e) {
      return {
        engagement: opts.engagement,
        authority: "beam",
        denied: e instanceof Error ? e.message : "DENIED",
      };
    }
  }
  const local = localAddComment(opts.engagement, opts.meta, opts.viewer, opts.body);
  return {
    engagement: local.state,
    authority: "fixture_cache",
    denied: local.result.ok ? undefined : local.result.detail,
  };
}

/** Forward via real messaging — not a fake share count. */
export async function authoritativeForward(opts: {
  contentId: string;
  title: string;
  recipients: Array<{ id: string; name: string }>;
  mode: "separate" | "together";
  bearer?: string;
  engagement: EngagementState;
  meta: ContentAuthMeta;
  viewerUserId: string;
}): Promise<{ ok: boolean; detail: string; engagement: EngagementState }> {
  const auth = authorizeContentAccess(opts.meta, { userId: opts.viewerUserId });
  if (!auth.ok) return { ok: false, detail: auth.detail, engagement: opts.engagement };

  if (!opts.bearer) {
    const local = localForward(
      opts.engagement,
      opts.meta,
      { userId: opts.viewerUserId },
      opts.recipients.map((r) => r.name),
      opts.mode,
    );
    return {
      ok: local.result.ok,
      detail: local.result.ok
        ? `Forwarded (${opts.mode}) — fixture cache`
        : local.result.detail,
      engagement: local.state,
    };
  }

  const body = `Forwarded Memory: ${opts.title} [${opts.contentId}]`;

  if (opts.mode === "separate") {
    for (const r of opts.recipients) {
      try {
        const ensured = await ensureDirectConversation(r.id, opts.bearer);
        if (ensured.composition === "group" || (ensured.member_count ?? 0) >= 3) {
          return {
            ok: false,
            detail: "Refused to widen a dyad during separate forward",
            engagement: opts.engagement,
          };
        }
        await sendMessage(ensured.conversation_id, body, opts.bearer);
      } catch (e) {
        return {
          ok: false,
          detail: e instanceof Error ? e.message : "forward_failed",
          engagement: opts.engagement,
        };
      }
    }
    return {
      ok: true,
      detail: `Sent separately to ${opts.recipients.map((r) => r.name).join(", ")}`,
      engagement: opts.engagement,
    };
  }

  // Together — explicit only: create group conversation then message once
  try {
    const { createGroupConversation } = await import("../api/productClient");
    if (opts.recipients.length < 2) {
      return { ok: false, detail: "Together requires multiple people", engagement: opts.engagement };
    }
    const group = await createGroupConversation(
      opts.recipients.map((r) => r.id),
      {
        label: opts.recipients.map((r) => r.name).slice(0, 3).join(", "),
        bearer: opts.bearer,
      },
    );
    await sendMessage(group.conversation_id, body, opts.bearer);
    return {
      ok: true,
      detail: `Forwarded together (explicit group) to ${opts.recipients.length} people`,
      engagement: opts.engagement,
    };
  } catch (e) {
    return {
      ok: false,
      detail: e instanceof Error ? e.message : "together_forward_failed",
      engagement: opts.engagement,
    };
  }
}

export async function authoritativeCreateStory(opts: {
  mediaRef: string;
  visibility: string;
  caption?: string;
  bearer?: string;
}) {
  if (!opts.bearer) throw new Error("Sign in required for durable Story");
  return createTemporaryStory(
    {
      media_ref: opts.mediaRef,
      visibility: opts.visibility,
      caption: opts.caption,
    },
    opts.bearer,
  );
}

export async function ensureDemoSocialMoment(bearer?: string) {
  // Seed a friends-visibility Memory for production hydration demos.
  return publishSocialMoment(
    {
      caption: "Published Memory from Opal Graph",
      visibility: "friends",
      media_ids: [],
    },
    bearer,
  );
}

const BOOTSTRAP_KEY = "opal.home.durable_memory_bootstrap.v1";

/**
 * Publish durable SocialMoments for multi-session engagement proofs.
 * Returns Memory cards with BEAM ids — use as productionOwners.memories when
 * founder seed is off, or as fixtureExtras when demonstrating dual authority.
 */
export async function bootstrapDurableMemories(
  captions: string[],
  bearer?: string,
): Promise<FounderFeedCard[]> {
  if (!bearer) return [];
  try {
    const cached = sessionStorage.getItem(BOOTSTRAP_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as FounderFeedCard[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    /* ignore */
  }

  const cards: FounderFeedCard[] = [];
  for (const caption of captions.slice(0, 5)) {
    try {
      const res = await publishSocialMoment(
        { caption, visibility: "friends", media_ids: [] },
        bearer,
      );
      const m = res.moment || {};
      const id = String(m.id || "");
      if (!id) continue;
      cards.push({
        id,
        kind: "memory",
        person: "You",
        personInitial: "Y",
        when: "Just now",
        title: caption,
        detail: "Memory",
        caption,
        likeCount: 0,
        commentCount: 0,
        ctaAction: "open_memory",
      });
    } catch {
      /* skip */
    }
  }
  try {
    sessionStorage.setItem(BOOTSTRAP_KEY, JSON.stringify(cards));
  } catch {
    /* ignore */
  }
  return cards;
}

/**
 * PRODUCTION_HYDRATION must never mutate fixture cache for non-UUID ids.
 */
export function assertProductionNeverUsesFixtureCache(opts: {
  mode: "FOUNDER_FIXTURE" | "PRODUCTION_HYDRATION" | "EMPTY" | string;
  contentId: string;
}): { ok: true } | { ok: false; reason: string } {
  if (opts.mode === "PRODUCTION_HYDRATION" && !isDurableMomentId(opts.contentId)) {
    return {
      ok: false,
      reason: "PRODUCTION_HYDRATION refused non-UUID fixture engagement path",
    };
  }
  return { ok: true };
}

export { loadEngagement, isDurableMomentId };
