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

/**
 * Auto-bootstrap captions previously published by ensureDemoSocialMoment /
 * bootstrapDurableMemories. These are demo fixtures — not user-authorized
 * Published Memory. Keep PRIVATE_MEMORY_RENDERED_AS_SOCIAL_POST = 0 and
 * INFERRED_MEMORY_AUTO_PUBLISHED = 0 by excluding them from Home.
 */
export const DEMO_BOOTSTRAP_MEMORY_CAPTIONS = [
  "Published Memory from Opal Graph",
  "Golden hour hike with the crew.",
  "Sunset walk at Fletcher Cove",
] as const;

/** Lab / soak / authority-proof captions must not fill founder Home. */
const HOME_RESIDUE_CAPTION =
  /^(Soak Memory\b|Authority proof Memory\b|SOAK-|SAFRT\b)/i;

export function isAutoBootstrapMemoryCaption(caption: unknown): boolean {
  const text = String(caption || "").trim();
  return (DEMO_BOOTSTRAP_MEMORY_CAPTIONS as readonly string[]).includes(text);
}

export function isHomeFeedResidueCaption(caption: unknown): boolean {
  const text = String(caption || "").trim();
  return isAutoBootstrapMemoryCaption(text) || HOME_RESIDUE_CAPTION.test(text);
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
    // Demo / soak / authority residue must not render as social Home body.
    .filter((o) => !isHomeFeedResidueCaption(o.caption))
    .map((o) => productionObjectToCard(o));
  // Empty followGraph shells must not flip PRODUCTION_HYDRATION with a blank body.
  const productionOwners =
    memories.length > 0
      ? {
          memories,
          followGraph: { followingNames: [] as string[] },
          ranking: {},
        }
      : { memories: [] as ReturnType<typeof productionObjectToCard>[] };
  return {
    feed,
    memories,
    stories: feed.stories || [],
    productionOwners,
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

/**
 * REFUSED: auto-publishing friends-visibility Memory violates
 * INFERRED_MEMORY_AUTO_PUBLISHED=0 / explicit Published Memory law.
 * Use real publishSocialMoment from an explicit user publish action only.
 */
export async function ensureDemoSocialMoment(_bearer?: string) {
  return {
    refused: true as const,
    reason: "DEMO_AUTO_PUBLISH_DISABLED",
    PRIVATE_MEMORY_RENDERED_AS_SOCIAL_POST: 0,
    INFERRED_MEMORY_AUTO_PUBLISHED: 0,
  };
}

const BOOTSTRAP_KEY = "opal.home.durable_memory_bootstrap.v1";

/**
 * Durable Home Memory bootstrap — no longer auto-publishes SocialMoments.
 * Returns [] so FOUNDER_FIXTURE / authored seed cards remain the demo path.
 * Clear stale session cache so prior demo ids do not rehydrate as Memory cards.
 */
export async function bootstrapDurableMemories(
  _captions: string[],
  _bearer?: string,
): Promise<FounderFeedCard[]> {
  try {
    sessionStorage.removeItem(BOOTSTRAP_KEY);
  } catch {
    /* ignore */
  }
  return [];
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
