/**
 * HOME — Figma 287:6 OGX-00 continuous social stream.
 * Soft interest (155:2) stays in-feed. Follow → FollowGraph only.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { BRAND_ASSETS, PRODUCT_PUBLIC_NAME } from "../brand/brand";
import {
  FOUNDER_GRAPH_SEED_ID,
  happeningInLabel,
  isFounderSeedEnabled,
  type FounderFeedCard,
  type FounderStoryItem,
  type GraphFeedKind,
} from "./founderGraphSeed";
import {
  composeHomeFeed,
  type ProductionHomeOwners,
} from "./homeHydration";
import type { RankContext } from "./homeFeedRanking";
import {
  formatGraphParticipationCounts,
  participationFigmaNode,
  resolveGraphParticipation,
  type GraphParticipationBacking,
} from "./graphParticipation";
import { resolveCardWhen, resolveHomeStories } from "./socialAuthority";

const EASE = [0.16, 1, 0.3, 1] as const;
const HOME_SCROLL_KEY = "opal.home.scroll.v1";

type Filter = "all" | "graph" | "live" | "memory";

type Props = {
  onIdGoSoftInterest?: (cardId: string) => void;
  /** I'm going — current-user accept only; must NOT navigate. */
  onImGoing?: (card: FounderFeedCard) => void;
  /** Open Journey — navigation only to existing Journey projection. */
  onOpenJourney?: (card: FounderFeedCard) => void;
  /** Optional domain hydration for Graph participation states. */
  graphParticipationByCardId?: Record<string, GraphParticipationBacking>;
  onOpenGraphDetail?: (cardId: string) => void;
  onOpenPersonProfile?: (personName: string) => void;
  /** Upper-left Profile → own social identity (not Settings dump). */
  onOpenOwnProfile?: () => void;
  /** Upper-right Search → SEARCH-00 373:261 */
  onOpenSearch?: () => void;
  /** Upper-right Notifications → ACTIVITY-00 473:141 / Attention Center */
  onOpenActivity?: () => void;
  /** Actionable Needs You count from AttentionAuthority projection (not chat unread). */
  attentionBadgeCount?: number;
  selfInitial?: string;
  selfAvatarSrc?: string;
  onOpenPeople?: () => void;
  onOpenNear?: () => void;
  onWantThisMemory?: (cardId: string) => void;
  onOpenMemoryDetail?: (cardId: string) => void;
  onMemoryLike?: (cardId: string) => void;
  onOpenLive?: (cardId: string) => void;
  onFollowPerson?: (personName: string) => void;
  continuation?: React.ReactNode;
  locationLabel?: string;
  softInterestIds?: Set<string> | string[];
  likedMemoryIds?: Set<string> | string[];
  /** Local FollowGraph presentation for seed (not Connection). */
  followedPeople?: Set<string> | string[];
  savedCardIds?: Set<string> | string[];
  repostedCardIds?: Set<string> | string[];
  onSaveCard?: (cardId: string) => void;
  onComment?: (cardId: string) => void;
  onRepost?: (cardId: string) => void;
  onForward?: (cardId: string) => void;
  onOpenStory?: (story: FounderStoryItem) => void;
  onCreateStory?: () => void;
  onOpenDiscovery?: (cardId: string) => void;
  productionOwners?: ProductionHomeOwners | null;
  fixtureExtras?: FounderFeedCard[];
  rankContext?: RankContext;
  /** When bumped, restore prior scroll offset after overlay return (Back). */
  restoreScrollToken?: number;
  /** When bumped, scroll Home root to top (persistent Home destination). */
  scrollTopToken?: number;
};

function asSet(v?: Set<string> | string[]) {
  if (!v) return new Set<string>();
  return v instanceof Set ? v : new Set(v);
}

function Avatar({
  src,
  initial,
  size = 50,
}: {
  src?: string;
  initial: string;
  size?: number;
}) {
  if (src) {
    return (
      <img
        className="gsh-avatar"
        src={src}
        alt=""
        width={size}
        height={size}
        draggable={false}
      />
    );
  }
  return (
    <span className="gsh-avatar gsh-avatar-fallback" style={{ width: size, height: size }}>
      {initial}
    </span>
  );
}

/** Social engagement family — OGSN-01/02/03. Modes: ACTIVE / INFO / DEPENDENCY. */
function SocialActionRow({
  card,
  liked,
  saved,
  onLike,
  onComment,
  onRepost,
  onForward,
  onSave,
}: {
  card: FounderFeedCard;
  liked?: boolean;
  saved?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onRepost?: () => void;
  onForward?: () => void;
  onSave?: () => void;
}) {
  const fmt = (n?: number) =>
    n == null ? null : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K` : String(n);
  return (
    <div className="gsh-social-row" role="group" aria-label="Social actions">
      <button
        type="button"
        className={`gsh-social-btn ${liked ? "is-on" : ""}`}
        data-testid={`gsh-like-${card.id}`}
        data-mode="active"
        aria-pressed={!!liked}
        aria-label="Like"
        onClick={onLike}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 20s-7-4.4-7-9.2C5 7.5 7.1 5.5 9.6 5.5c1.5 0 2.5.8 2.4 1.8h.01C12 6.3 13 5.5 14.5 5.5 17 5.5 19 7.5 19 10.8 19 15.6 12 20 12 20z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
            fill={liked ? "currentColor" : "none"}
          />
        </svg>
        {fmt(card.likeCount) ? <span className="gsh-social-count">{fmt(card.likeCount)}</span> : null}
      </button>
      <button
        type="button"
        className="gsh-social-btn"
        data-testid={`gsh-comment-${card.id}`}
        data-mode="active"
        aria-label="Comment"
        onClick={onComment}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M20 12a7.5 7.5 0 0 1-10.8 6.7L5 19.5l.9-3.9A7.5 7.5 0 1 1 20 12z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
        {fmt(card.commentCount) ? (
          <span className="gsh-social-count">{fmt(card.commentCount)}</span>
        ) : null}
      </button>
      <button
        type="button"
        className="gsh-social-btn"
        data-testid={`gsh-repost-${card.id}`}
        data-mode="active"
        aria-label="Repost"
        onClick={onRepost}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M7 7h8a3 3 0 0 1 3 3v2M17 17H9a3 3 0 0 1-3-3v-2"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path d="M15 4l3 3-3 3M9 20l-3-3 3-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {fmt(card.repostCount) ? (
          <span className="gsh-social-count">{fmt(card.repostCount)}</span>
        ) : null}
      </button>
      <button
        type="button"
        className="gsh-social-btn"
        data-testid={`gsh-forward-${card.id}`}
        data-mode="active"
        aria-label="Forward"
        onClick={onForward}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 10.5L20 4l-5.5 16-2.8-6.2L4 10.5z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
        {fmt(card.shareCount) ? <span className="gsh-social-count">{fmt(card.shareCount)}</span> : null}
      </button>
      <button
        type="button"
        className={`gsh-social-btn gsh-social-save ${saved ? "is-on" : ""}`}
        data-testid={`gsh-save-${card.id}`}
        data-mode="active"
        aria-pressed={!!saved}
        aria-label="Save"
        onClick={onSave}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.2L6 20V5.5a1 1 0 0 1 1-1z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
            fill={saved ? "currentColor" : "none"}
          />
        </svg>
      </button>
    </div>
  );
}

function FeedCard({
  card,
  reduce,
  index,
  nowMs,
  onAction,
  onPerson,
  softInterested,
  participation,
  liked,
  saved,
  followed,
  onLike,
  onFollow,
  onSave,
  onComment,
  onRepost,
  onForward,
}: {
  card: FounderFeedCard;
  reduce: boolean;
  index: number;
  nowMs: number;
  onAction: (card: FounderFeedCard) => void;
  onPerson?: (name: string) => void;
  softInterested?: boolean;
  participation?: GraphParticipationBacking | null;
  liked?: boolean;
  saved?: boolean;
  followed?: boolean;
  onLike?: () => void;
  onFollow?: () => void;
  onSave?: () => void;
  onComment?: () => void;
  onRepost?: () => void;
  onForward?: () => void;
}) {
  const whenLabel = resolveCardWhen(card, nowMs);
  const enter = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, delay: Math.min(0.08 * index, 0.4), ease: EASE },
      };

  if (card.kind === "consequence") {
    const turns = card.conversationTurns || [];
    const steps = card.alignmentSteps || [];
    const hist = card.sharedHistory;
    return (
      <motion.article
        className="gsh-card gsh-card-consequence"
        data-testid={`gsh-card-${card.id}`}
        data-kind="consequence"
        data-figma-node="289:2"
        data-object-grammar="conversation-becomes-graph"
        {...enter}
      >
        <div className="gsh-cx-head">
          <button
            type="button"
            className="gsh-avatar-btn"
            aria-label={`${card.person} profile`}
            data-testid={`gsh-person-${card.id}`}
            onClick={() => onPerson?.(card.person)}
          >
            <Avatar src={card.avatarSrc} initial={card.personInitial} size={38} />
          </button>
          <div className="gsh-cx-who">
            <button
              type="button"
              className="gsh-name-btn gsh-cx-name"
              data-testid={`gsh-person-name-${card.id}`}
              onClick={() => onPerson?.(card.person)}
            >
              {card.person}
            </button>
            <p className="gsh-cx-rel">{card.relationshipLabel || whenLabel || "Together"}</p>
          </div>
          <span className="gsh-cx-badge" data-badge="conversation">
            CONVERSATION
          </span>
        </div>

        <div className="gsh-cx-turns">
          {turns.map((t, i) => (
            <div
              key={`${card.id}-turn-${t.role}-${t.speaker}-${i}`}
              className={`gsh-cx-bubble gsh-cx-bubble-${t.role}`}
            >
              <span className="gsh-cx-speaker">{t.speaker}</span>
              <span className="gsh-cx-body">{t.body}</span>
            </div>
          ))}
        </div>

        {steps.length ? (
          <div className="gsh-cx-align" aria-label="Alignment trajectory">
            <div className="gsh-cx-rail" aria-hidden />
            <ul className="gsh-cx-steps">
              {steps.map((s, i) => {
                const icon =
                  i === 0
                    ? "/figma-v2/feed/align-time.svg"
                    : i === 1
                      ? "/figma-v2/feed/align-place.svg"
                      : "/figma-v2/feed/align-travel.svg";
                return (
                  <li key={`${card.id}-step-${i}-${s.primary}`} className="gsh-cx-step">
                    <img
                      className={`gsh-cx-node gsh-cx-node-${i}`}
                      src={icon}
                      alt=""
                      width={16}
                      height={16}
                      aria-hidden
                    />
                    <span className="gsh-cx-step-primary">{s.primary}</span>
                    <span className="gsh-cx-step-secondary">{s.secondary}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {hist ? (
          <button
            type="button"
            className="gsh-cx-history"
            data-testid={`gsh-shared-history-${card.id}`}
            data-mode="active"
            data-shared-history="profile-201-10"
            aria-label={`Shared history with ${card.person}`}
            onClick={() => onPerson?.(card.person)}
          >
            <span className="gsh-cx-history-label">shared history</span>
            {hist.messages != null ? (
              <span className="gsh-cx-metric">
                <img src="/figma-v2/feed/hist-msg.svg" alt="" width={20} height={20} />
                {hist.messages}
              </span>
            ) : null}
            {hist.graphs != null ? (
              <span className="gsh-cx-metric">
                <img src="/figma-v2/feed/hist-cal.svg" alt="" width={20} height={20} />
                {hist.graphs}
              </span>
            ) : null}
            {hist.people != null ? (
              <span className="gsh-cx-metric">
                <img src="/figma-v2/feed/hist-people.svg" alt="" width={20} height={20} />
                {hist.people}
              </span>
            ) : null}
          </button>
        ) : null}

        <div className="gsh-cx-foot">
          <p className="gsh-cx-became">{card.title || "Conversation became a Graph"}</p>
          <button
            type="button"
            className="gsh-cx-open"
            data-testid={`gsh-open-graph-${card.id}`}
            data-mode="active"
            onClick={() => onAction({ ...card, ctaAction: "open_graph" })}
          >
            {card.cta || "Open Graph →"}
          </button>
        </div>
      </motion.article>
    );
  }

  if (card.kind === "near" || card.kind === "discovery") {
    return (
      <motion.article
        className="gsh-card gsh-card-discovery"
        data-testid={`gsh-card-${card.id}`}
        data-kind={card.kind}
        data-figma-node="289:72"
        data-follow-not-connection="true"
        {...enter}
      >
        <div className="gsh-dx-head">
          <button
            type="button"
            className="gsh-avatar-btn"
            aria-label={`${card.person} profile`}
            onClick={() => onPerson?.(card.person)}
          >
            <Avatar src={card.avatarSrc} initial={card.personInitial} size={38} />
          </button>
          <div className="gsh-dx-who">
            <button
              type="button"
              className="gsh-name-btn gsh-dx-name"
              data-testid={`gsh-person-name-${card.id}`}
              onClick={() => onPerson?.(card.person)}
            >
              {card.person}
            </button>
            <p className="gsh-dx-rel">
              {card.relationshipLabel || "Not followed · nearby relevance"}
            </p>
          </div>
          <span className="gsh-dx-badge" data-badge="discovery">
            DISCOVERY
          </span>
        </div>
        {card.mediaSrc ? (
          <button
            type="button"
            className="gsh-card-media gsh-card-media-btn"
            aria-label="See experience"
            data-testid={`gsh-media-${card.id}`}
            onClick={() => onAction(card)}
          >
            <img src={card.mediaSrc} alt="" draggable={false} />
          </button>
        ) : null}
        <p className="gsh-dx-title">{card.title}</p>
        <p className="gsh-dx-meta">{card.detail || card.placeLine}</p>
        <p className="gsh-dx-law">
          {card.caption ||
            "Outside your follows, but unusually relevant near you."}
        </p>
        <div className="gsh-dx-foot">
          <button
            type="button"
            className="gsh-dx-see"
            data-testid={`gsh-cta-${card.id}`}
            data-mode="active"
            onClick={() => onAction(card)}
          >
            {card.cta?.includes("See") ? card.cta : "See experience →"}
          </button>
          {!followed ? (
            <button
              type="button"
              className="gsh-dx-follow"
              data-testid={`gsh-follow-${card.id}`}
              data-mode="active"
              onClick={onFollow}
            >
              Follow {card.person.split(" ")[0]}
            </button>
          ) : (
            <span className="gsh-dx-following">Following</span>
          )}
        </div>
      </motion.article>
    );
  }

  if (card.kind === "memory") {
    const slides = card.mediaSrcs?.length ? card.mediaSrcs : card.mediaSrc ? [card.mediaSrc] : [];
    const isCarousel = slides.length > 1;
    const suggested = !!card.suggested;
    return (
      <motion.article
        className={`gsh-card gsh-card-memory ${isCarousel ? "is-carousel" : ""} ${suggested ? "is-suggested" : ""}`}
        data-testid={`gsh-card-${card.id}`}
        data-kind="memory"
        data-figma-node={isCarousel ? "289:84" : "289:24"}
        data-liked={liked ? "true" : undefined}
        data-suggested={suggested ? "true" : undefined}
        {...enter}
      >
        <div className="gsh-mem-head">
          <button
            type="button"
            className="gsh-avatar-btn"
            aria-label={`${card.person} profile`}
            data-testid={`gsh-person-${card.id}`}
            onClick={() => onPerson?.(card.person)}
          >
            <Avatar src={card.avatarSrc} initial={card.personInitial} size={38} />
          </button>
          <div className="gsh-mem-who">
            <button
              type="button"
              className="gsh-name-btn gsh-mem-name"
              data-testid={`gsh-person-name-${card.id}`}
              onClick={() => onPerson?.(card.person)}
            >
              {card.person}
            </button>
            <p className="gsh-mem-rel">
              {suggested
                ? "Suggested for you"
                : card.relationshipLabel || whenLabel || "Memory"}
            </p>
          </div>
          <span className="gsh-mem-badge" data-badge="memory">
            Memory
          </span>
          {suggested && !followed ? (
            <button
              type="button"
              className="gsh-follow"
              data-testid={`gsh-follow-${card.id}`}
              data-mode="active"
              onClick={onFollow}
            >
              Follow
            </button>
          ) : null}
        </div>
        {slides.length ? (
          <div
            className={`gsh-card-media ${isCarousel ? "gsh-mem-carousel" : ""}`}
            data-testid={`gsh-media-${card.id}`}
          >
            <div className="gsh-mem-track">
              {slides.map((src, i) => (
                <button
                  key={`${card.id}-slide-${i}-${src}`}
                  type="button"
                  className="gsh-card-media-btn gsh-mem-slide"
                  aria-label="Open memory"
                  data-mode="active"
                  onClick={() => onAction(card)}
                >
                  <img src={src} alt="" draggable={false} />
                </button>
              ))}
            </div>
            {isCarousel ? (
              <div className="gsh-mem-dots" aria-hidden>
                {slides.map((_, i) => (
                  <span
                    key={`${card.id}-dot-${i}`}
                    className={`gsh-mem-dot ${i === 0 ? "is-on" : ""}`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <SocialActionRow
          card={card}
          liked={liked}
          saved={saved}
          onLike={onLike}
          onComment={onComment}
          onRepost={onRepost}
          onForward={onForward}
          onSave={onSave}
        />
        {card.likesLabel ? (
          <p className="gsh-mem-liked-by" data-testid={`gsh-liked-by-${card.id}`}>
            {card.likesLabel}
          </p>
        ) : null}
        <p className="gsh-caption gsh-mem-caption">
          <strong className="gsh-mem-caption-who">{card.person}</strong>{" "}
          {card.caption || card.title}
        </p>
        <div className="gsh-mem-foot">
          <span className="gsh-mem-when">{whenLabel || "just now"}</span>
          <span className="gsh-mem-badge gsh-mem-badge-foot" data-badge="memory">
            Memory
          </span>
        </div>
      </motion.article>
    );
  }

  if (card.kind === "live") {
    const byHost =
      card.broadcaster && card.host
        ? `Live by ${card.broadcaster} · hosted by ${card.host}`
        : card.detail;
    const hereCount = card.goingCount;
    return (
      <motion.article
        className="gsh-card gsh-card-live"
        {...enter}
        data-testid={`gsh-card-${card.id}`}
        data-kind="live"
        data-figma-node="618:211"
        data-host-ne-broadcaster="true"
      >
        <div className="gsh-lv-head">
          <button
            type="button"
            className="gsh-avatar-btn"
            aria-label={`${card.person} profile`}
            data-testid={`gsh-person-${card.id}`}
            onClick={() => onPerson?.(card.person)}
          >
            <Avatar src={card.avatarSrc} initial={card.personInitial} size={38} />
          </button>
          <div className="gsh-lv-who">
            <p className="gsh-lv-name">
              <button
                type="button"
                className="gsh-name-btn"
                data-testid={`gsh-person-name-${card.id}`}
                onClick={() => onPerson?.(card.person)}
              >
                {card.person}
              </button>{" "}
              <span className="gsh-lv-live-inline" data-badge="live">
                LIVE
              </span>
            </p>
            <p className="gsh-lv-rel">{byHost}</p>
          </div>
          {card.videoLive ? (
            <span
              className="gsh-video-live gsh-video-live-head"
              data-badge="live-video"
              data-testid={`gsh-video-live-${card.id}`}
            >
              VIDEO LIVE
            </span>
          ) : (
            <span
              className="gsh-lv-badge"
              data-badge="live"
              data-testid={`gsh-live-badge-${card.id}`}
            >
              LIVE
            </span>
          )}
        </div>
        {card.mediaSrc ? (
          <button
            type="button"
            className="gsh-card-media gsh-card-media-btn is-live"
            aria-label="Open Live"
            data-testid={`gsh-media-${card.id}`}
            onClick={() => onAction(card)}
          >
            <img src={card.mediaSrc} alt="" draggable={false} />
          </button>
        ) : null}
        <p className="gsh-lv-title">{card.title}</p>
        {card.meta ? (
          <p className="gsh-lv-eta" data-testid={`gsh-live-eta-${card.id}`}>
            {card.meta}
          </p>
        ) : null}
        {hereCount ? (
          <p className="gsh-lv-here" data-testid={`gsh-live-here-${card.id}`}>
            {hereCount} are here
          </p>
        ) : null}
        <SocialActionRow
          card={card}
          liked={liked}
          saved={saved}
          onLike={onLike}
          onComment={onComment}
          onRepost={onRepost}
          onForward={onForward}
          onSave={onSave}
        />
        <div className="gsh-lv-foot">
          {card.happeningNow ? (
            <span className="gsh-lv-happening" data-testid={`gsh-live-now-${card.id}`}>
              Happening now
            </span>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="gsh-open-live"
            data-testid={`gsh-cta-${card.id}`}
            onClick={() => onAction(card)}
          >
            Open Live
          </button>
        </div>
        <p className="gsh-lv-disclaimer">
          Live video only when someone chooses to broadcast
        </p>
      </motion.article>
    );
  }

  // Graph — Figma 618:149 base · 738:2 lock-in · 738:35 committed (state-driven)
  const countdown = happeningInLabel(card.startsAt);
  const nodes = card.graphNodes || [];
  const backing: GraphParticipationBacking = {
    sharedPlanId: participation?.sharedPlanId ?? card.sharedPlanId,
    conversationId: participation?.conversationId ?? card.conversationId,
    viewerResponseState: participation?.viewerResponseState ?? card.viewerResponseState,
    commitmentPhase: participation?.commitmentPhase ?? card.commitmentPhase,
    journeyAvailable: participation?.journeyAvailable ?? card.journeyAvailable,
    grounded: participation?.grounded,
    goingCount: participation?.goingCount ?? card.goingCount,
    interestedCount: participation?.interestedCount ?? card.interestedCount,
    lockInLabel: participation?.lockInLabel ?? card.lockInLabel,
  };
  const phase = resolveGraphParticipation(backing);
  const figmaNode = participationFigmaNode(phase);
  const goingCount = backing.goingCount ?? card.goingCount;
  const interestedCount = backing.interestedCount ?? card.interestedCount;
  const countsLabel = formatGraphParticipationCounts(goingCount, interestedCount);
  const lockInLabel = backing.lockInLabel || "Lock-in Friday · 6 PM";

  const joinableLabel =
    card.joinability === "joinable_friends"
      ? "Joinable · friends"
      : card.joinability === "invite_only"
        ? "Invite only"
        : card.joinability === "public"
          ? "Public"
          : null;
  const photoFirst = Boolean(card.mediaSrc);

  return (
    <motion.article
      className={`gsh-card gsh-card-graph ${photoFirst ? "is-photo-first" : ""}`}
      data-testid={`gsh-card-${card.id}`}
      data-kind="graph"
      data-figma-node={figmaNode}
      data-participation-phase={phase}
      data-soft-interest={softInterested && phase === "soft_interest" ? "true" : undefined}
      {...enter}
    >
      <div className="gsh-gr-head">
        <button
          type="button"
          className="gsh-avatar-btn"
          aria-label={`${card.person} profile`}
          data-testid={`gsh-person-${card.id}`}
          onClick={() => onPerson?.(card.person)}
        >
          <Avatar src={card.avatarSrc} initial={card.personInitial} size={38} />
        </button>
        <div className="gsh-gr-who">
          <button
            type="button"
            className="gsh-name-btn gsh-gr-name"
            data-testid={`gsh-person-name-${card.id}`}
            onClick={() => onPerson?.(card.person)}
          >
            {card.person}
          </button>
          <p className="gsh-gr-rel">{whenLabel || card.relationshipLabel || "Graph"}</p>
        </div>
        <span className="gsh-gr-badge" data-badge="graph">
          Graph
        </span>
        {countdown ? (
          <span
            className="gsh-gr-happening-pill"
            data-testid={`gsh-countdown-${card.id}`}
          >
            {countdown}
          </span>
        ) : null}
      </div>
      {card.mediaSrc ? (
        <button
          type="button"
          className="gsh-card-media gsh-card-media-btn"
          aria-label="Open Graph"
          data-testid={`gsh-media-${card.id}`}
          onClick={() => onAction({ ...card, ctaAction: "open_graph" })}
        >
          <img src={card.mediaSrc} alt="" draggable={false} />
        </button>
      ) : null}
      <p className="gsh-gr-title">{card.title}</p>
      {card.placeLine || card.detail ? (
        <p className="gsh-gr-subtitle">{card.placeLine || card.detail}</p>
      ) : null}
      {joinableLabel ? (
        <p className="gsh-gr-joinable" data-testid={`gsh-joinable-${card.id}`}>
          {joinableLabel}
        </p>
      ) : null}
      <SocialActionRow
        card={card}
        liked={liked}
        saved={saved}
        onLike={onLike}
        onComment={onComment}
        onRepost={onRepost}
        onForward={onForward}
        onSave={onSave}
      />
      {card.meta || countsLabel ? (
        <p className="gsh-gr-counts" data-testid={`gsh-counts-${card.id}`}>
          {card.meta || countsLabel}
        </p>
      ) : null}
      {!photoFirst && nodes.length ? (
        <div
          className="gsh-gr-timeline"
          aria-label="Graph trajectory"
          data-testid={`gsh-timeline-${card.id}`}
          data-figma-timeline="618:161"
        >
          <div className="gsh-gr-rail" aria-hidden data-figma-node="618:161" />
          <ul className="gsh-gr-nodes">
            {nodes.map((n, i) => {
              const accent =
                n.accent ||
                (["#00E5FF", "#E8D6C4", "#8B5CF6", "#FFC86B"] as const)[i % 4];
              return (
                <li
                  key={`${card.id}-node-${i}-${n.primary}`}
                  className="gsh-gr-node"
                  data-timeline-index={i}
                  style={{ ["--gsh-timeline-accent" as string]: accent }}
                >
                  <span className="gsh-gr-dot" aria-hidden />
                  <span className="gsh-gr-time">{n.primary}</span>
                  <span className="gsh-gr-place-col">
                    <span className="gsh-gr-place">{n.secondary}</span>
                    {n.tertiary ? <span className="gsh-gr-mode">{n.tertiary}</span> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {softInterested && phase === "soft_interest" ? (
        <p className="gsh-soft-signal" role="status" data-testid={`gsh-interested-${card.id}`}>
          You are interested
        </p>
      ) : null}
      <div className="gsh-gr-foot">
        <span className="gsh-gr-lockin">{lockInLabel}</span>
        {phase === "soft_interest" ? (
          <button
            type="button"
            className={`gsh-gr-interested ${softInterested ? "is-on" : ""}`}
            data-testid={`gsh-cta-${card.id}`}
            data-participation-action="im_interested"
            aria-pressed={!!softInterested}
            onClick={() => onAction({ ...card, ctaAction: "id_go" })}
          >
            {softInterested ? "Interested" : "I'm interested"}
          </button>
        ) : null}
        {phase === "lock_in" ? (
          <button
            type="button"
            className="gsh-gr-going"
            data-testid={`gsh-cta-${card.id}`}
            data-participation-action="im_going"
            onClick={() =>
              onAction({
                ...card,
                ctaAction: "im_going",
                sharedPlanId: backing.sharedPlanId || card.sharedPlanId,
                conversationId: backing.conversationId || card.conversationId,
                viewerResponseState:
                  (backing.viewerResponseState as FounderFeedCard["viewerResponseState"]) ||
                  card.viewerResponseState,
                commitmentPhase: backing.commitmentPhase ?? card.commitmentPhase,
                journeyAvailable: backing.journeyAvailable ?? card.journeyAvailable,
                goingCount: backing.goingCount ?? card.goingCount,
                interestedCount: backing.interestedCount ?? card.interestedCount,
              })
            }
          >
            I'm going
          </button>
        ) : null}
        {phase === "going" || phase === "going_journey" ? (
          <span
            className="gsh-gr-going is-committed"
            data-testid={`gsh-going-${card.id}`}
            data-participation-action="going_confirmed"
            role="status"
          >
            Going ✓
          </span>
        ) : null}
        {phase === "going_journey" ? (
          <button
            type="button"
            className="gsh-gr-open"
            data-testid={`gsh-open-journey-${card.id}`}
            data-participation-action="open_journey"
            onClick={() =>
              onAction({
                ...card,
                ctaAction: "open_journey",
                sharedPlanId: backing.sharedPlanId || card.sharedPlanId,
                conversationId: backing.conversationId || card.conversationId,
                journeyAvailable: true,
              })
            }
          >
            Open Journey →
          </button>
        ) : (
          <button
            type="button"
            className="gsh-gr-open"
            data-testid={`gsh-open-graph-${card.id}`}
            data-participation-action="open_graph"
            onClick={() => onAction({ ...card, ctaAction: "open_graph" })}
          >
            Open Graph
          </button>
        )}
      </div>
    </motion.article>
  );
}

/**
 * Authenticated Opal Graph Home — OGSN social-native (254:2).
 * FR09 lands here. Soft interest stays in-feed (155:2).
 */
export function GraphSocialHome({
  onIdGoSoftInterest,
  onImGoing,
  onOpenJourney,
  graphParticipationByCardId,
  onOpenGraphDetail,
  onOpenPersonProfile,
  onOpenOwnProfile,
  onOpenSearch,
  onOpenActivity,
  attentionBadgeCount = 0,
  selfInitial = "Y",
  selfAvatarSrc,
  onOpenPeople,
  onOpenNear,
  onWantThisMemory,
  onOpenMemoryDetail,
  onMemoryLike,
  onOpenLive,
  onFollowPerson,
  continuation,
  locationLabel = "Vista",
  softInterestIds,
  likedMemoryIds,
  followedPeople,
  savedCardIds,
  repostedCardIds,
  onSaveCard,
  onComment,
  onRepost,
  onForward,
  onOpenStory,
  onCreateStory,
  onOpenDiscovery,
  productionOwners,
  fixtureExtras,
  rankContext,
  restoreScrollToken,
  scrollTopToken,
}: Props) {
  void onWantThisMemory;
  void locationLabel;
  void onOpenPeople;
  void onOpenNear;
  const reduce = !!useReducedMotion();
  // Figma 287:6 has no filter chips — continuous stream only.
  const filter: Filter = "all";
  const [localFollowed, setLocalFollowed] = useState<Set<string>>(() => new Set());
  const [localSaved, setLocalSaved] = useState<Set<string>>(() => new Set());
  const [gateNote, setGateNote] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Live relative timestamps ("15m ago") tick from card.createdAt.
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const seedOn = isFounderSeedEnabled();
  const composed = useMemo(
    () =>
      composeHomeFeed({
        production: productionOwners,
        founderSeedEnabled: seedOn,
        fixtureExtras,
        rankContext,
      }),
    [productionOwners, fixtureExtras, seedOn, rankContext],
  );
  const homeStories = useMemo(
    () =>
      resolveHomeStories({
        mode: composed.mode,
        productionStories: productionOwners?.stories,
      }),
    [composed.mode, productionOwners?.stories],
  );
  const soft = asSet(softInterestIds);
  const liked = asSet(likedMemoryIds);
  const followed = new Set([...asSet(followedPeople), ...localFollowed]);
  const saved = new Set([...asSet(savedCardIds), ...localSaved]);
  const reposted = asSet(repostedCardIds);

  const cards = useMemo(() => composed.cards, [composed.cards]);

  // Persist scroll while browsing; restore when overlays close.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      try {
        sessionStorage.setItem(HOME_SCROLL_KEY, String(el.scrollTop));
      } catch {
        /* private */
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    try {
      const y = Number(sessionStorage.getItem(HOME_SCROLL_KEY) || "0");
      if (Number.isFinite(y) && y > 0) el.scrollTop = y;
    } catch {
      /* private */
    }
  }, [restoreScrollToken]);

  useEffect(() => {
    if (!scrollTopToken) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    try {
      sessionStorage.setItem(HOME_SCROLL_KEY, "0");
    } catch {
      /* private */
    }
  }, [scrollTopToken, reduce]);

  const persistScrollThen = (fn?: () => void) => {
    const el = scrollRef.current;
    if (el) {
      try {
        sessionStorage.setItem(HOME_SCROLL_KEY, String(el.scrollTop));
      } catch {
        /* private */
      }
    }
    fn?.();
  };

  const onAction = (card: FounderFeedCard) => {
    switch (card.ctaAction) {
      case "id_go":
        // Soft interest only — never accept participant / Journey / SharedPlan
        onIdGoSoftInterest?.(card.id);
        break;
      case "im_going":
        // Commitment mutation only — caller must NOT navigate
        onImGoing?.(card);
        break;
      case "open_journey":
        // Navigation only — never mutate commitment
        persistScrollThen(() => onOpenJourney?.(card));
        break;
      case "check_out":
        if (card.kind === "discovery" || card.kind === "near") {
          persistScrollThen(() => onOpenDiscovery?.(card.id));
          break;
        }
        onOpenNear?.();
        break;
      case "open_memory":
        persistScrollThen(() => onOpenMemoryDetail?.(card.id));
        break;
      case "open_graph":
        persistScrollThen(() => onOpenGraphDetail?.(card.id));
        break;
      case "open_live":
        persistScrollThen(() => onOpenLive?.(card.id));
        break;
      case "none":
        if (card.kind === "graph") persistScrollThen(() => onOpenGraphDetail?.(card.id));
        if (card.kind === "live") persistScrollThen(() => onOpenLive?.(card.id));
        break;
      default:
        break;
    }
  };

  const homeStatus =
    composed.mode === "EMPTY" ? "empty" : composed.mode === "PRODUCTION_HYDRATION" ? "ogx-home-core" : "ogx-home-core";

  return (
    <div
      className="gsh scroll"
      ref={scrollRef}
      data-testid="graph-social-home"
      data-current-figma-home="618:44"
      data-legacy-figma-home="287:6"
      data-figma-home="618:44"
      data-figma-authority="618:2"
      data-figma-recovery="562:162"
      data-home-status={homeStatus}
      data-home-mode={composed.mode}
      data-home-hydration={composed.source}
      data-home-feed-count={String(cards.length)}
      data-founder-seed={seedOn ? FOUNDER_GRAPH_SEED_ID : "off"}
      data-node-ref="618:44"
      aria-label={`${PRODUCT_PUBLIC_NAME} home`}
    >
      {/* Figma 618:45/46/47 — localized ambient spectral fields only (not sprayed rails) */}
      <div className="gsh-ambient" aria-hidden>
        <img
          className="gsh-ambient-field gsh-ambient-signal"
          src="/figma-v2/home-201/ambient-signal.svg"
          alt=""
          data-figma-node="618:47"
        />
        <img
          className="gsh-ambient-field gsh-ambient-possibility"
          src="/figma-v2/home-201/ambient-possibility.svg"
          alt=""
          data-figma-node="618:46"
        />
        <img
          className="gsh-ambient-field gsh-ambient-live-warmth"
          src="/figma-v2/home-201/ambient-live-warmth.svg"
          alt=""
          data-figma-node="618:45"
        />
      </div>
      {/* Persistent Home chrome plane: profile · search · notifications · Stories.
          Feed is the scroll owner beneath — not one canvas that drags identity away. */}
      <div
        className="gsh-chrome-plane"
        data-testid="gsh-chrome-plane"
        data-chrome="persistent"
      >
        <header
          className="gsh-top gsh-top-spectral"
          data-figma-node="618:48"
          data-legacy-figma-node="287:7"
          data-figma-search="618:51"
          data-figma-needs-you="618:54"
          data-testid="gsh-top"
        >
          <button
            type="button"
            className="gsh-profile-hit"
            data-testid="gsh-own-profile"
            aria-label="Your profile"
            onClick={() => onOpenOwnProfile?.()}
          >
            <span className="gsh-profile-avatar">
              {selfAvatarSrc ? <img src={selfAvatarSrc} alt="" /> : selfInitial.slice(0, 1)}
            </span>
          </button>
          <div className="gsh-header-actions">
            <button
              type="button"
              className="gsh-header-hit gsh-header-hit-opal"
              data-testid="gsh-search"
              data-figma-icon="1114:79"
              data-opal-control="opal-lens"
              aria-label="Search"
              onClick={() => onOpenSearch?.()}
            >
              <img src={BRAND_ASSETS.headerSearchMagnifier} alt="" width={22} height={22} />
            </button>
            <button
              type="button"
              className="gsh-header-hit gsh-header-hit-opal"
              data-testid="gsh-activity"
              data-figma-node="1114:84"
              data-figma-icon="1114:84"
              data-opal-control="opal-signal"
              data-attention-badge={attentionBadgeCount > 0 ? String(attentionBadgeCount) : "0"}
              aria-label={
                attentionBadgeCount > 0
                  ? `For you, ${attentionBadgeCount}`
                  : "Attention"
              }
              onClick={() => onOpenActivity?.()}
            >
              <img src={BRAND_ASSETS.headerActivity} alt="" width={22} height={22} />
              {attentionBadgeCount > 0 ? (
                <span
                  className="gsh-attention-badge"
                  data-testid="gsh-attention-badge"
                  aria-hidden
                >
                  {attentionBadgeCount > 9 ? "9+" : attentionBadgeCount}
                </span>
              ) : null}
            </button>
          </div>
        </header>

        <div
          className="gsh-stories"
          data-testid="gsh-stories"
          data-figma-node="618:59"
          data-legacy-figma-node="287:20"
          data-stories-rows="1"
          data-stories-interactive="true"
          aria-label="Stories"
        >
          <div className="gsh-stories-rail" data-testid="gsh-stories-rail">
            <button
              type="button"
              className="gsh-story-cell gsh-story-self"
              data-testid="gsh-story-create"
              data-mode="active"
              aria-label="Your Story, Add"
              onClick={() => {
                persistScrollThen();
                onCreateStory?.();
              }}
            >
              <span className="gsh-story-avatar gsh-story-self-avatar">
                <Avatar src={selfAvatarSrc} initial={selfInitial.slice(0, 1) || "Y"} size={50} />
                <span className="gsh-story-add-badge" aria-hidden>
                  +
                </span>
              </span>
              <span className="gsh-story-name">Your story</span>
              <span className="gsh-story-when gsh-story-add-label">Add</span>
            </button>
            {homeStories.map((s) => (
              <button
                key={s.id}
                type="button"
                className="gsh-story-cell"
                data-testid={`gsh-story-${s.id}`}
                data-mode="active"
                data-story-id={s.id}
                data-story-source={
                  composed.mode === "PRODUCTION_HYDRATION" &&
                  (productionOwners?.stories?.length || 0) > 0
                    ? "production"
                    : "founder_fixture"
                }
                onClick={() => {
                  persistScrollThen();
                  onOpenStory?.(s);
                }}
              >
                <span
                  className={`gsh-story-avatar ${s.pulseState ? `is-pulse-${s.pulseState.toLowerCase()}` : ""}`}
                  data-pulse={s.pulseState || undefined}
                >
                  <Avatar src={s.avatarSrc || s.mediaSrc} initial={s.personInitial} size={48} />
                </span>
                <span className="gsh-story-name">{s.person}</span>
                {s.pulseState ? (
                  <span
                    className={`gsh-story-pulse is-${s.pulseState.toLowerCase()}`}
                    data-testid={`gsh-story-pulse-${s.id}`}
                    data-pulse={s.pulseState}
                  >
                    {s.pulseState}
                  </span>
                ) : (
                  <span className="gsh-story-when">{s.when}</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="gsh-chrome-fade" aria-hidden />
      </div>

      {gateNote ? (
        <p className="gsh-gate-note" role="status" data-testid="gsh-gate-note">
          {gateNote}
        </p>
      ) : null}

      <div className="gsh-feed" data-testid="gsh-feed" data-node-ref="145:46">
        {cards.map((card, i) => (
          <FeedCard
            key={card.id}
            card={card}
            reduce={reduce}
            index={i}
            nowMs={nowMs}
            onAction={onAction}
            onPerson={onOpenPersonProfile}
            softInterested={soft.has(card.id)}
            participation={graphParticipationByCardId?.[card.id] ?? null}
            liked={liked.has(card.id)}
            saved={saved.has(card.id)}
            followed={followed.has(card.person)}
            onLike={() => onMemoryLike?.(card.id)}
            onFollow={() => {
              setLocalFollowed((prev) => new Set(prev).add(card.person));
              onFollowPerson?.(card.person);
              setGateNote(`Following ${card.person}.`);
            }}
            onSave={() => {
              setLocalSaved((prev) => {
                const next = new Set(prev);
                if (next.has(card.id)) next.delete(card.id);
                else next.add(card.id);
                return next;
              });
              onSaveCard?.(card.id);
            }}
            onComment={() => persistScrollThen(() => onComment?.(card.id))}
            onRepost={() => onRepost?.(card.id)}
            onForward={() => persistScrollThen(() => onForward?.(card.id))}
          />
        ))}
        {composed.mode === "EMPTY" && !continuation ? (
          <p className="gsh-empty">Your people will show up here.</p>
        ) : null}
      </div>

      {continuation ? (
        <section
          className="gsh-continuation"
          data-testid="gsh-continuation"
          data-node-ref="145:46"
          aria-label="More with your people"
        >
          {continuation}
        </section>
      ) : null}

      {/* Figma 287:6 has no People directory link under the stream — dock You/Chats cover that. */}
    </div>
  );
}

export type { GraphFeedKind };
