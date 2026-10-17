/**
 * Social engagement authority adapter.
 * BEAM is system of record for durable SocialMoment ids.
 * Client engagement store remains optimistic cache / fixture adapter only.
 */
import {
  addSocialMomentComment,
  createGraphPlan,
  createTemporaryStory,
  fetchHomeFeed,
  listOpalPlans,
  type OpalPlanContract,
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
  uploadSocialMomentMedia,
} from "../api/productClient";
import {
  attendanceLineFromContract,
  conflictLineFromContract,
} from "./planCardContract";
import {
  FOUNDER_HOME_FEED,
  FOUNDER_LIVE_FEED,
  FOUNDER_STORIES,
  isFounderSeedEnabled,
  type FounderFeedCard,
  type FounderStoryItem,
} from "./founderGraphSeed";
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

/** Relative feed timestamp from an ISO instant. Ticks when callers re-render. */
export function humanWhen(iso: unknown, nowMs = Date.now()): string {
  if (!iso || typeof iso !== "string") return "Just now";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "Just now";
  const mins = Math.max(0, Math.floor((nowMs - t) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return `${days}d ago`;
}

/** Prefer live createdAt; fall back to static seed label. */
export function resolveCardWhen(
  card: { createdAt?: string; when?: string },
  nowMs = Date.now(),
): string {
  if (card.createdAt) return humanWhen(card.createdAt, nowMs);
  return card.when || "Just now";
}

/** Parse seed labels like "15m ago" / "2h" / "Yesterday" into ms offset. */
export function offsetMsFromWhenLabel(when: string): number | null {
  const raw = String(when || "").trim();
  if (!raw) return null;
  if (/^yesterday$/i.test(raw)) return 24 * 60 * 60 * 1000;
  const m = raw.match(/^(\d+)\s*m(?:\s*ago)?$/i);
  if (m) return Number(m[1]) * 60 * 1000;
  const h = raw.match(/^(\d+)\s*h(?:\s*ago)?$/i);
  if (h) return Number(h[1]) * 60 * 60 * 1000;
  const d = raw.match(/^(\d+)\s*d(?:\s*ago)?$/i);
  if (d) return Number(d[1]) * 24 * 60 * 60 * 1000;
  return null;
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
  const createdAt = typeof obj.created_at === "string" ? obj.created_at : undefined;
  return {
    id: String(obj.id),
    kind: "memory",
    person: name,
    personInitial: String(actor.initial || name.slice(0, 1)),
    when: humanWhen(createdAt),
    createdAt,
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

/**
 * Story/post media refs that can actually render in a viewer.
 * Repair #15: this used to accept only "/" paths, which silently dropped
 * every real user capture — browser and native-bridge acquisition both
 * produce data: URLs — so a created story rendered with NO media.
 */
export function renderableMediaRef(ref: unknown): string | undefined {
  if (typeof ref !== "string" || ref.length === 0) return undefined;
  if (ref.startsWith("/") || ref.startsWith("data:") || ref.startsWith("https://")) return ref;
  return undefined;
}

/** Map TemporaryStory DTO → FounderStoryItem for the Home stories rail. */
export function productionStoryToItem(obj: Record<string, unknown>): FounderStoryItem {
  const name = String(obj.author_name || "Someone");
  const media = renderableMediaRef(obj.media_ref);
  const rawPulse = String(obj.pulse_state || obj.pulseState || obj.kind || "")
    .trim()
    .toUpperCase();
  const pulseState =
    rawPulse === "LIVE" || rawPulse === "MEMORY" || rawPulse === "GRAPH"
      ? (rawPulse as "LIVE" | "MEMORY" | "GRAPH")
      : obj.live === true || obj.is_live === true
        ? ("LIVE" as const)
        : undefined;
  const createdAt = typeof obj.created_at === "string" ? obj.created_at : undefined;
  return {
    id: String(obj.id),
    person: name,
    personInitial: name.slice(0, 1) || "?",
    mediaSrc: media,
    avatarSrc: media,
    caption: typeof obj.caption === "string" ? obj.caption : undefined,
    when: humanWhen(createdAt),
    createdAt,
    mediaKind: "image",
    pulseState,
  };
}

/**
 * Prefer-real stories rail (Pass 1H).
 * Live production stories win when present.
 * FOUNDER_STORIES only when founder/lab seed is explicitly on.
 * Production empty → [] (never silent founder universe).
 */
export function resolveHomeStories(opts: {
  mode: string;
  productionStories?: FounderStoryItem[] | null;
  /** When omitted, reads `isFounderSeedEnabled()`. */
  founderSeedEnabled?: boolean;
}): FounderStoryItem[] {
  const prod = opts.productionStories || [];
  if (prod.length > 0) return prod;
  const seedOn =
    typeof opts.founderSeedEnabled === "boolean"
      ? opts.founderSeedEnabled
      : isFounderSeedEnabled();
  if (seedOn) return FOUNDER_STORIES;
  return [];
}

/**
 * Engagement / detail sheets must resolve UUID production cards.
 * Include productionOwners.memories so production Home controls are not dead.
 */
export function lookupHomeFeedCard(opts: {
  cardId: string;
  productionMemories?: FounderFeedCard[] | null;
  durableMemoryCards?: FounderFeedCard[] | null;
  fixtureExtras?: FounderFeedCard[] | null;
}): FounderFeedCard | undefined {
  const pools: FounderFeedCard[] = [
    ...(opts.productionMemories || []),
    ...(opts.durableMemoryCards || []),
    ...(opts.fixtureExtras || []),
    ...FOUNDER_HOME_FEED,
    ...FOUNDER_LIVE_FEED,
  ];
  return pools.find((c) => c.id === opts.cardId);
}

export async function loadProductionHomeOwners(bearer?: string) {
  const feed = await fetchHomeFeed({ limit: 40, bearer });
  const memories = (feed.objects || [])
    .filter((o) => o.object_type === "memory" || !o.object_type)
    // Demo / soak / authority residue must not render as social Home body.
    .filter((o) => !isHomeFeedResidueCaption(o.caption))
    .map((o) => productionObjectToCard(o));
  const stories = (feed.stories || []).map((s) => productionStoryToItem(s));
  // Empty followGraph shells must not flip PRODUCTION_HYDRATION with a blank body.
  const productionOwners =
    memories.length > 0
      ? {
          memories,
          stories,
          followGraph: { followingNames: [] as string[] },
          ranking: {},
        }
      : {
          memories: [] as ReturnType<typeof productionObjectToCard>[],
          stories,
        };
  return {
    feed,
    memories,
    stories,
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
        ? `Forwarded (${opts.mode}) - fixture cache`
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
  // Repair #16 (B2): an image capture (data: URL) is uploaded to the media
  // store first and the story stores the media id — the backend serves the
  // bytes only to viewers eligible for the story. The story contract then
  // returns the served media URL, which the viewer renders like any other
  // "/" ref. Anything that cannot be uploaded throws — never fake success.
  if (/^data:image\//i.test(opts.mediaRef)) {
    const parsed = parseDataUrl(opts.mediaRef);
    if (!parsed) {
      throw new Error(
        "That photo can't be shared as a story from here - pick a photo from Camera or Photo library.",
      );
    }
    const uploaded = await uploadSocialMomentMedia(
      { base64: parsed.base64, mime_type: parsed.mimeType },
      opts.bearer,
    );
    const mediaId = uploaded.media?.id;
    if (typeof mediaId !== "string" || !mediaId) {
      throw new Error("Media upload did not return a durable media id");
    }
    return createTemporaryStory(
      {
        media_id: mediaId,
        visibility: opts.visibility,
        caption: opts.caption,
      },
      opts.bearer,
    );
  }
  // Video stories are OUT of the media-store scope (the store is image-only
  // today): video data: refs keep the legacy inline storage exactly as
  // before. Non-data refs (fixture paths, https) also pass through untouched.
  return createTemporaryStory(
    {
      media_ref: opts.mediaRef,
      visibility: opts.visibility,
      caption: opts.caption,
    },
    opts.bearer,
  );
}

/** Split a data: URL into mime + base64 payload for the media upload endpoint. */
export function parseDataUrl(src: string): { mimeType: string; base64: string } | null {
  const m = /^data:([^;,]+);base64,(.+)$/s.exec(src || "");
  if (!m) return null;
  return { mimeType: m[1], base64: m[2] };
}

/**
 * Repair #15 — durable Add Post.
 *
 * Before this, Home → Post opened GraphCreateFlow whose draft landed in a
 * write-only React state (`createdGraphs` was never read anywhere): the post
 * never persisted, never reached any other account, and vanished on refresh
 * while the UI implied success.
 *
 * Real chain now: image data-URL media is uploaded to the SocialMoment media
 * store (LOCAL_DEV backend), then publishSocialMoment persists the post with
 * the chosen visibility. Anything that cannot be persisted throws — the UI
 * must never claim a post that does not exist.
 */
export async function authoritativeCreatePost(opts: {
  mediaSrc?: string | null;
  mediaKind?: string | null;
  caption?: string;
  visibility: "friends" | "private";
  bearer?: string;
}) {
  if (!opts.bearer) throw new Error("Sign in required for durable Post");
  const caption = (opts.caption || "").trim();
  const mediaIds: string[] = [];

  if (opts.mediaSrc) {
    if (opts.mediaKind === "video" || /^data:video\//i.test(opts.mediaSrc)) {
      // Backend media store is image-only today (media_status video=PARTIAL_FUTURE).
      throw new Error("Video posts aren't supported yet - choose a photo for this post.");
    }
    const parsed = parseDataUrl(opts.mediaSrc);
    if (!parsed) {
      throw new Error(
        "That media can't be posted from here - pick a photo from Camera or Photo library.",
      );
    }
    const uploaded = await uploadSocialMomentMedia(
      { base64: parsed.base64, mime_type: parsed.mimeType },
      opts.bearer,
    );
    const mediaId = uploaded.media?.id;
    if (typeof mediaId !== "string" || !mediaId) {
      throw new Error("Media upload did not return a durable media id");
    }
    mediaIds.push(mediaId);
  }

  if (!caption && mediaIds.length === 0) {
    throw new Error("Write a caption or add a photo before posting.");
  }

  const res = await publishSocialMoment(
    { caption, visibility: opts.visibility, media_ids: mediaIds },
    opts.bearer,
  );
  return res.moment;
}

/**
 * Repair #16 — durable GraphCreateFlow completion (non-post drafts).
 *
 * Before this, Graphs / Repeat / plan-from-chat completions landed in the
 * write-only `createdGraphs` React state (never read anywhere): the plan
 * vanished on refresh, reached no other account, and the flow closed as
 * if it had succeeded. The lawful durable home is the SharedPlan authority
 * Center already uses — POST /opal/plans/graph-create creates a
 * conversation-less SharedPlan (owner lead, invitees pending), read back
 * through GET /opal/plans (list_plans_for_user). Anything that cannot be
 * persisted throws — the flow stays open with the error, never a fake
 * success.
 *
 * Field fates: title -> plan title; where -> location; whenLabel ->
 * time_label; caption / audience / join prefs / who label -> plan
 * alignment, exposed back on the plan contract; photo -> uploaded to the
 * SocialMoment media store and referenced by id (the backend validates
 * ownership, like Repair #15 E8). Video has no lawful media home yet, so
 * it is refused honestly — same pattern as video posts.
 */
export async function authoritativeCreateGraphPlan(opts: {
  mediaSrc?: string | null;
  mediaKind?: string | null;
  title: string;
  whenLabel?: string;
  where?: string | null;
  caption?: string;
  audience?: string;
  joinRequestsOn?: boolean;
  exactSpotAfterJoin?: boolean;
  participantUserIds?: string[];
  whoLabel?: string | null;
  /** Repeat provenance only — must be a durable plan id; never the new id. */
  sourcePlanId?: string | null;
  entry?: string;
  idempotencyKey?: string;
  bearer?: string;
}) {
  if (!opts.bearer) throw new Error("Sign in required to add to your graph");
  const title = (opts.title || "").trim();
  if (!title) throw new Error("Give this plan a title first.");

  let mediaId: string | undefined;
  if (opts.mediaSrc) {
    if (opts.mediaKind === "video" || /^data:video\//i.test(opts.mediaSrc)) {
      // Backend media store is image-only today (media_status video=PARTIAL_FUTURE).
      throw new Error("Video isn't supported yet - choose a photo for this plan.");
    }
    const parsed = parseDataUrl(opts.mediaSrc);
    if (!parsed) {
      throw new Error(
        "That media can't be added from here - pick a photo from Camera or Photo library.",
      );
    }
    const uploaded = await uploadSocialMomentMedia(
      { base64: parsed.base64, mime_type: parsed.mimeType },
      opts.bearer,
    );
    const id = uploaded.media?.id;
    if (typeof id !== "string" || !id) {
      throw new Error("Media upload did not return a durable media id");
    }
    mediaId = id;
  }

  const res = await createGraphPlan(
    {
      title,
      location: (opts.where || "").trim() || undefined,
      time_label: (opts.whenLabel || "").trim() || undefined,
      caption: (opts.caption || "").trim() || undefined,
      media_id: mediaId,
      audience: opts.audience || "close_circle",
      join_requests_on: opts.joinRequestsOn !== false,
      exact_spot_after_join: opts.exactSpotAfterJoin !== false,
      participant_user_ids: opts.participantUserIds?.length
        ? opts.participantUserIds
        : undefined,
      who_label: (opts.whoLabel || "").trim() || undefined,
      // Provenance is only lawful when it names a durable backend plan;
      // seed/fixture ids stay client-side and are never sent as lineage.
      source_plan_id:
        opts.sourcePlanId && isDurableMomentId(opts.sourcePlanId)
          ? opts.sourcePlanId
          : undefined,
      entry: opts.entry || undefined,
      idempotency_key: opts.idempotencyKey || undefined,
    },
    opts.bearer,
  );
  if (!res.plan?.id) throw new Error("Plan create did not return a durable plan id");
  return res.plan;
}

/** Repair #16 — fresh backend read-back of the caller's SharedPlans. */
export async function loadDurablePlans(bearer?: string): Promise<OpalPlanContract[]> {
  if (!bearer) return [];
  const res = await listOpalPlans(bearer);
  return res.plans || [];
}

export type DurablePlanGraphCard = {
  id: string;
  title: string;
  whenLine: string;
  signalLine: string;
  status: "ready" | "action" | "forming" | "aligned" | "past";
  person: string;
  startsAt: string | null;
  who?: string[];
  /** Repair #18 - contract-rendered lines (backend counts/conflict only). */
  attendanceLabel?: string | null;
  conflictLabel?: string | null;
};

/** Map a SharedPlan contract (GET /opal/plans) to a Graphs live card. */
export function productionPlanToGraphCard(plan: OpalPlanContract): DurablePlanGraphCard {
  const status =
    plan.status === "completed"
      ? "past"
      : plan.status === "agreed"
        ? "ready"
        : plan.status === "changed"
          ? "action"
          : "forming";
  const who = plan.who_label
    ? plan.who_label.split(",").map((w) => w.trim()).filter(Boolean)
    : undefined;
  return {
    id: plan.id,
    title: plan.title || "Plan",
    whenLine: plan.time_label || "Time to be set",
    signalLine: plan.who_label || plan.organizer_name || "",
    status,
    person: plan.organizer_name || "",
    startsAt: null,
    who,
    // Repair #18 - the plan payload IS the contract that carries the
    // attendance counter and the conflict object; format, never derive.
    attendanceLabel: attendanceLineFromContract(plan),
    conflictLabel: conflictLineFromContract(plan),
  };
}

/**
 * Merge durable plan cards into the Graphs live list WITHOUT an optimistic
 * local copy: chat plan projections already render conversation plans
 * (their lineage id IS the SharedPlan id), so a durable plan whose id is
 * already rendered is skipped — one plan, one card (gyroscope).
 */
export function mergeDurablePlanCards<T extends { id: string }>(
  liveCards: T[],
  plans: OpalPlanContract[],
): Array<T | DurablePlanGraphCard> {
  const rendered = new Set(liveCards.map((c) => c.id));
  const extra = plans
    .filter((p) => p.status !== "cancelled" && !rendered.has(p.id))
    .map((p) => productionPlanToGraphCard(p));
  return [...liveCards, ...extra];
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
