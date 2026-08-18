/**
 * HOME — Figma OGSN-01/02/03 (254:5 / 254:58 / 254:122)
 * Continuous social feed on existing Opal intelligence.
 * Soft interest (155:2) stays in-feed. Follow → FollowGraph only.
 */
import React, { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";
import { PRODUCT_PUBLIC_NAME } from "../brand/brand";
import {
  FOUNDER_GRAPH_SEED_ID,
  FOUNDER_HOME_FEED,
  FOUNDER_LIVE_FEED,
  FOUNDER_PEOPLE_PULSE,
  happeningInLabel,
  isFounderSeedEnabled,
  type FounderFeedCard,
  type FounderPulseItem,
  type GraphFeedKind,
} from "./founderGraphSeed";

const EASE = [0.16, 1, 0.3, 1] as const;

type Filter = "all" | "graph" | "live" | "memory";

type Props = {
  onIdGoSoftInterest?: (cardId: string) => void;
  onOpenGraphDetail?: (cardId: string) => void;
  onOpenPersonProfile?: (personName: string) => void;
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
  onSaveCard?: (cardId: string) => void;
  onCommentGate?: (cardId: string) => void;
  onRepostGate?: (cardId: string) => void;
  onForwardGate?: (cardId: string) => void;
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
        <span aria-hidden>♥</span>
        {card.likeCount != null ? (
          <span className="gsh-social-count">
            {card.likeCount >= 1000 ? `${(card.likeCount / 1000).toFixed(1)}K` : card.likeCount}
          </span>
        ) : null}
      </button>
      <button
        type="button"
        className="gsh-social-btn"
        data-testid={`gsh-comment-${card.id}`}
        data-mode="dependency"
        aria-label="Comment"
        onClick={onComment}
      >
        <span aria-hidden>○</span>
        {card.commentCount != null ? (
          <span className="gsh-social-count">{card.commentCount}</span>
        ) : null}
      </button>
      <button
        type="button"
        className="gsh-social-btn"
        data-testid={`gsh-repost-${card.id}`}
        data-mode="dependency"
        aria-label="Repost"
        onClick={onRepost}
      >
        <span aria-hidden>⇄</span>
        {card.repostCount != null ? (
          <span className="gsh-social-count">{card.repostCount}</span>
        ) : null}
      </button>
      <button
        type="button"
        className="gsh-social-btn"
        data-testid={`gsh-forward-${card.id}`}
        data-mode="dependency"
        aria-label="Forward"
        onClick={onForward}
      >
        <span aria-hidden>➤</span>
        {card.shareCount != null ? (
          <span className="gsh-social-count">{card.shareCount}</span>
        ) : null}
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
        <span aria-hidden>bookmark</span>
      </button>
    </div>
  );
}

function PeoplePulse({
  items,
  onPulse,
}: {
  items: FounderPulseItem[];
  onPulse: (item: FounderPulseItem) => void;
}) {
  return (
    <div className="gsh-pulse" data-testid="gsh-people-pulse" aria-label="People pulse">
      {items.map((p) => (
        <button
          key={p.id}
          type="button"
          className="gsh-pulse-cell"
          data-testid={`gsh-pulse-${p.id}`}
          data-pulse-state={p.state}
          onClick={() => onPulse(p)}
        >
          <span className={`gsh-pulse-ring is-${p.state.toLowerCase()}`}>
            <Avatar src={p.mediaSrc || p.avatarSrc} initial={p.personInitial} size={52} />
          </span>
          <span className="gsh-pulse-name">{p.person}</span>
          <span className="gsh-pulse-state">{p.state}</span>
        </button>
      ))}
    </div>
  );
}

function FeedCard({
  card,
  reduce,
  index,
  onAction,
  onPerson,
  softInterested,
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
  onAction: (card: FounderFeedCard) => void;
  onPerson?: (name: string) => void;
  softInterested?: boolean;
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
  const enter = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, delay: Math.min(0.08 * index, 0.4), ease: EASE },
      };

  if (card.kind === "near") {
    return (
      <motion.article
        className="gsh-card gsh-card-near"
        data-testid={`gsh-card-${card.id}`}
        data-kind="near"
        data-figma-ogsn="local"
        {...enter}
      >
        <div className="gsh-near-copy">
          <p className="gsh-near-kicker">{card.person}</p>
          <p className="gsh-card-title">{card.title}</p>
          <p className="gsh-meta">{card.detail}</p>
        </div>
        {card.cta ? (
          <button
            type="button"
            className="gsh-link-cta"
            data-testid={`gsh-cta-${card.id}`}
            onClick={() => onAction(card)}
          >
            {card.cta}
          </button>
        ) : null}
      </motion.article>
    );
  }

  if (card.kind === "memory") {
    return (
      <motion.article
        className="gsh-card gsh-card-memory"
        data-testid={`gsh-card-${card.id}`}
        data-kind="memory"
        data-figma-ogsn="254:5"
        data-liked={liked ? "true" : undefined}
        {...enter}
      >
        <div className="gsh-card-row">
          <button
            type="button"
            className="gsh-avatar-btn"
            aria-label={`${card.person} profile`}
            data-testid={`gsh-person-${card.id}`}
            onClick={() => onPerson?.(card.person)}
          >
            <Avatar src={card.avatarSrc} initial={card.personInitial} size={42} />
          </button>
          <div className="gsh-card-who">
            <button
              type="button"
              className="gsh-name-btn"
              onClick={() => onPerson?.(card.person)}
            >
              <strong>{card.person}</strong>
            </button>
            {card.suggested ? <span className="gsh-meta"> Suggested for you</span> : null}
            <span className="gsh-kind-pill">Memory</span>
          </div>
          {card.suggested && !followed ? (
            <button
              type="button"
              className="gsh-follow-btn"
              data-testid={`gsh-follow-${card.id}`}
              data-mode="active"
              onClick={onFollow}
            >
              Follow
            </button>
          ) : null}
        </div>
        {card.mediaSrc ? (
          <button
            type="button"
            className="gsh-card-media gsh-card-media-btn"
            aria-label="Open memory"
            data-testid={`gsh-media-${card.id}`}
            data-mode="dependency"
            onClick={() => onAction(card)}
          >
            <img src={card.mediaSrc} alt="" draggable={false} />
          </button>
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
        {card.likesLabel ? <p className="gsh-likes-line">{card.likesLabel}</p> : null}
        <p className="gsh-caption">
          <button type="button" className="gsh-name-btn" onClick={() => onPerson?.(card.person)}>
            <strong>{card.person}</strong>
          </button>{" "}
          {card.caption || card.title}
        </p>
        <p className="gsh-meta gsh-timestamp">
          {card.when} · Memory
        </p>
      </motion.article>
    );
  }

  if (card.kind === "live") {
    const byHost =
      card.broadcaster && card.host
        ? `Live by ${card.broadcaster} · hosted by ${card.host}`
        : card.detail;
    return (
      <motion.article
        className="gsh-card gsh-card-live"
        data-testid={`gsh-card-${card.id}`}
        data-kind="live"
        data-figma-ogsn="254:122"
        {...enter}
      >
        <div className="gsh-card-row">
          <button
            type="button"
            className="gsh-avatar-btn"
            aria-label={`${card.person} profile`}
            data-testid={`gsh-person-${card.id}`}
            onClick={() => onPerson?.(card.person)}
          >
            <Avatar src={card.avatarSrc} initial={card.personInitial} size={42} />
          </button>
          <div className="gsh-card-who">
            <strong>{card.person}</strong>
            <span className="gsh-live-pill">LIVE</span>
            <p className="gsh-meta">{byHost}</p>
          </div>
          {card.videoLive ? (
            <span className="gsh-video-live" data-testid={`gsh-video-live-${card.id}`}>
              VIDEO LIVE
            </span>
          ) : null}
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
            <span className="gsh-live-scrim">
              <span className="gsh-card-title">{card.title}</span>
              <span className="gsh-meta">{card.detail}</span>
              {card.meta ? <span className="gsh-meta">{card.meta}</span> : null}
            </span>
          </button>
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
        <div className="gsh-live-footer">
          <span className="gsh-happening-now">Happening now</span>
          <button
            type="button"
            className="gsh-open-live"
            data-testid={`gsh-cta-${card.id}`}
            onClick={() => onAction(card)}
          >
            Open Live
          </button>
        </div>
        <p className="gsh-meta gsh-live-note">
          Live video only when someone chooses to broadcast
        </p>
      </motion.article>
    );
  }

  // Graph — OGSN-02
  const countdown = happeningInLabel(card.startsAt);
  return (
    <motion.article
      className="gsh-card gsh-card-graph"
      data-testid={`gsh-card-${card.id}`}
      data-kind="graph"
      data-figma-ogsn="254:58"
      data-soft-interest={softInterested ? "true" : undefined}
      {...enter}
    >
      <div className="gsh-card-row">
        <button
          type="button"
          className="gsh-avatar-btn"
          aria-label={`${card.person} profile`}
          data-testid={`gsh-person-${card.id}`}
          onClick={() => onPerson?.(card.person)}
        >
          <Avatar src={card.avatarSrc} initial={card.personInitial} size={42} />
        </button>
        <div className="gsh-card-who">
          <strong>{card.person}</strong>
          <span className="gsh-meta">
            {" "}
            {card.when} · Graph
          </span>
        </div>
        {countdown ? (
          <span className="gsh-countdown" data-testid={`gsh-countdown-${card.id}`}>
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
      <div className="gsh-graph-body">
        <p className="gsh-card-title">{card.title}</p>
        <p className="gsh-meta">{card.placeLine || card.detail}</p>
        {card.joinability === "joinable_friends" ? (
          <p className="gsh-meta">Joinable · friends</p>
        ) : null}
      </div>
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
      <div className="gsh-graph-footer">
        <div>
          {card.interestedCount != null || card.goingCount != null ? (
            <p className="gsh-meta">
              {card.interestedCount ?? 0} interested · {card.goingCount ?? 0} going
            </p>
          ) : card.meta ? (
            <p className="gsh-meta">{card.meta}</p>
          ) : null}
          {softInterested ? (
            <p className="gsh-soft-signal" role="status" data-testid={`gsh-interested-${card.id}`}>
              You are interested
            </p>
          ) : null}
          <p className="gsh-meta">Posted {card.when} ago</p>
        </div>
        <div className="gsh-graph-ctas">
          {card.ctaAction === "id_go" || softInterested ? (
            <button
              type="button"
              className={`gsh-pill-cta ${softInterested ? "is-soft" : ""}`}
              data-testid={`gsh-cta-${card.id}`}
              aria-pressed={!!softInterested}
              onClick={() => onAction({ ...card, ctaAction: "id_go" })}
            >
              {softInterested ? "Interested" : "I'd go"}
            </button>
          ) : null}
          <button
            type="button"
            className="gsh-open-graph"
            data-testid={`gsh-open-graph-${card.id}`}
            onClick={() => onAction({ ...card, ctaAction: "open_graph" })}
          >
            <span aria-hidden>✧</span> Open Graph
          </button>
        </div>
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
  onOpenGraphDetail,
  onOpenPersonProfile,
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
  onSaveCard,
  onCommentGate,
  onRepostGate,
  onForwardGate,
}: Props) {
  void onWantThisMemory;
  const reduce = !!useReducedMotion();
  const [filter, setFilter] = useState<Filter>("all");
  const [localFollowed, setLocalFollowed] = useState<Set<string>>(() => new Set());
  const [localSaved, setLocalSaved] = useState<Set<string>>(() => new Set());
  const [gateNote, setGateNote] = useState<string | null>(null);
  const seedOn = isFounderSeedEnabled();
  const soft = asSet(softInterestIds);
  const liked = asSet(likedMemoryIds);
  const followed = new Set([...asSet(followedPeople), ...localFollowed]);
  const saved = new Set([...asSet(savedCardIds), ...localSaved]);

  const cards = useMemo(() => {
    if (!seedOn) return [] as FounderFeedCard[];
    if (filter === "live") return FOUNDER_LIVE_FEED;
    if (filter === "graph") return FOUNDER_HOME_FEED.filter((c) => c.kind === "graph");
    if (filter === "memory") {
      return FOUNDER_HOME_FEED.filter((c) => c.kind === "memory" || c.kind === "near");
    }
    // Continuous social feed: memories + graphs + near, then rare Live
    return [...FOUNDER_HOME_FEED, ...FOUNDER_LIVE_FEED];
  }, [filter, seedOn]);

  const onAction = (card: FounderFeedCard) => {
    switch (card.ctaAction) {
      case "id_go":
        onIdGoSoftInterest?.(card.id);
        break;
      case "check_out":
        onOpenNear?.();
        break;
      case "open_memory":
        onOpenMemoryDetail?.(card.id);
        setGateNote("Memory detail is a dependency — profile remains available from the author.");
        break;
      case "open_graph":
        onOpenGraphDetail?.(card.id);
        break;
      case "open_live":
        onOpenLive?.(card.id);
        break;
      case "none":
        if (card.kind === "graph") onOpenGraphDetail?.(card.id);
        if (card.kind === "live") onOpenLive?.(card.id);
        break;
      default:
        break;
    }
  };

  const onPulse = (item: FounderPulseItem) => {
    if (item.state === "LIVE") {
      onOpenLive?.(item.targetCardId);
      return;
    }
    if (item.state === "GRAPH") {
      onOpenGraphDetail?.(item.targetCardId);
      return;
    }
    onOpenPersonProfile?.(item.person);
  };

  const gate = (kind: string, cardId: string) => {
    setGateNote(`${kind} is not fully wired yet — no dummy destination.`);
    if (kind === "Comment") onCommentGate?.(cardId);
    if (kind === "Repost") onRepostGate?.(cardId);
    if (kind === "Forward") onForwardGate?.(cardId);
  };

  return (
    <div
      className="gsh scroll"
      data-testid="graph-social-home"
      data-figma-home="254:5"
      data-figma-authority="254:2"
      data-founder-seed={seedOn ? FOUNDER_GRAPH_SEED_ID : "off"}
      data-node-ref="254:5"
      aria-label={`${PRODUCT_PUBLIC_NAME} home`}
    >
      <header className="gsh-top">
        <div className="gsh-brand" data-testid="gsh-brand">
          <OpalMark size="lg" title="" className="gsh-brand-mark" />
          <OpalWordmark height={22} title="" compact />
        </div>
        <span className="gsh-vista" data-testid="gsh-vista">
          {locationLabel}
        </span>
      </header>

      {seedOn ? (
        <PeoplePulse items={FOUNDER_PEOPLE_PULSE} onPulse={onPulse} />
      ) : null}

      <div className="gsh-filters" role="toolbar" aria-label="Feed focus">
        {(
          [
            ["all", "All"],
            ["memory", "Memory"],
            ["graph", "Graph"],
            ["live", "Live"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`gsh-chip ${filter === id ? "is-active" : ""}`}
            data-testid={`gsh-filter-${id}`}
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
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
            onAction={onAction}
            onPerson={onOpenPersonProfile}
            softInterested={soft.has(card.id)}
            liked={liked.has(card.id)}
            saved={saved.has(card.id)}
            followed={followed.has(card.person)}
            onLike={() => onMemoryLike?.(card.id)}
            onFollow={() => {
              setLocalFollowed((prev) => new Set(prev).add(card.person));
              onFollowPerson?.(card.person);
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
            onComment={() => gate("Comment", card.id)}
            onRepost={() => gate("Repost", card.id)}
            onForward={() => gate("Forward", card.id)}
          />
        ))}
        {!seedOn && !continuation ? (
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

      {onOpenPeople ? (
        <button
          type="button"
          className="btn ghost gsh-people-link"
          data-testid="gsh-open-people"
          onClick={onOpenPeople}
        >
          People
        </button>
      ) : null}
    </div>
  );
}

export type { GraphFeedKind };
