/**
 * FINAL HOME — Figma 201:5 social feed.
 * Member landing after FR09 (217:354 → 201:5).
 * Founder seed uses the same surface production will hydrate.
 */
import React, { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";
import { PRODUCT_PUBLIC_NAME } from "../brand/brand";
import {
  FOUNDER_GRAPH_SEED_ID,
  FOUNDER_HOME_FEED,
  FOUNDER_LIVE_FEED,
  HOME_ICONS,
  isFounderSeedEnabled,
  type FounderFeedCard,
  type GraphFeedKind,
} from "./founderGraphSeed";

const EASE = [0.16, 1, 0.3, 1] as const;

type Filter = "all" | "graph" | "live" | "memory";

type Props = {
  onIdGo?: () => void;
  onOpenPeople?: () => void;
  onOpenNear?: () => void;
  onOpenMemory?: () => void;
  /** Live product continuation below seed (145:46 endless refill seam). */
  continuation?: React.ReactNode;
  locationLabel?: string;
};

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

function FeedCard({
  card,
  reduce,
  index,
  onAction,
}: {
  card: FounderFeedCard;
  reduce: boolean;
  index: number;
  onAction: (card: FounderFeedCard) => void;
}) {
  const enter = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, delay: 0.08 * index, ease: EASE },
      };

  if (card.kind === "near") {
    return (
      <motion.article
        className="gsh-card gsh-card-near"
        data-testid={`gsh-card-${card.id}`}
        data-kind="near"
        {...enter}
      >
        <div className="gsh-near-icon" aria-hidden>
          <img src={HOME_ICONS.near} alt="" width={24} height={24} />
        </div>
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
        {...enter}
      >
        <div className="gsh-card-row">
          <Avatar src={card.avatarSrc} initial={card.personInitial} size={42} />
          <div className="gsh-card-who">
            <strong>{card.person}</strong>
            <span className="gsh-meta">
              {" "}
              {card.when} · Memory
            </span>
          </div>
          {card.thumbSrc ? (
            <img className="gsh-thumb" src={card.thumbSrc} alt="" draggable={false} />
          ) : null}
        </div>
        <button
          type="button"
          className="gsh-memory-hit"
          data-testid={`gsh-cta-${card.id}`}
          onClick={() => onAction(card)}
        >
          <p className="gsh-card-title">{card.title}</p>
          <p className="gsh-meta">{card.detail}</p>
        </button>
      </motion.article>
    );
  }

  return (
    <motion.article
      className="gsh-card gsh-card-graph"
      data-testid={`gsh-card-${card.id}`}
      data-kind={card.kind}
      {...enter}
    >
      <div className="gsh-card-row">
        <Avatar src={card.avatarSrc} initial={card.personInitial} size={50} />
        <div className="gsh-card-who">
          <strong>{card.person}</strong>
          <span className="gsh-meta">
            {" "}
            {card.when} · {card.kind === "live" ? "Live" : "Graph"}
          </span>
        </div>
      </div>
      {card.mediaSrc ? (
        <div className="gsh-card-media">
          <img src={card.mediaSrc} alt="" draggable={false} />
        </div>
      ) : null}
      <div className="gsh-card-footer">
        <div>
          <p className="gsh-card-title">{card.title}</p>
          <p className="gsh-meta">{card.detail}</p>
          {card.meta ? <p className="gsh-meta">{card.meta}</p> : null}
        </div>
        {card.cta ? (
          <button
            type="button"
            className="gsh-pill-cta"
            data-testid={`gsh-cta-${card.id}`}
            onClick={() => onAction(card)}
          >
            {card.cta}
          </button>
        ) : null}
      </div>
    </motion.article>
  );
}

/**
 * Authenticated Opal Graph Home — Figma 201:5.
 * FR09 must land here (not legacy attention shell).
 */
export function GraphSocialHome({
  onIdGo,
  onOpenPeople,
  onOpenNear,
  onOpenMemory,
  continuation,
  locationLabel = "Vista",
}: Props) {
  const reduce = !!useReducedMotion();
  const [filter, setFilter] = useState<Filter>("all");
  const seedOn = isFounderSeedEnabled();

  const cards = useMemo(() => {
    if (!seedOn) return [] as FounderFeedCard[];
    if (filter === "live") return FOUNDER_LIVE_FEED;
    if (filter === "graph") return FOUNDER_HOME_FEED.filter((c) => c.kind === "graph");
    if (filter === "memory") return FOUNDER_HOME_FEED.filter((c) => c.kind === "memory" || c.kind === "near");
    return FOUNDER_HOME_FEED;
  }, [filter, seedOn]);

  const onAction = (card: FounderFeedCard) => {
    switch (card.ctaAction) {
      case "id_go":
        onIdGo?.();
        break;
      case "check_out":
        onOpenNear?.();
        break;
      case "open_memory":
        onOpenMemory?.();
        break;
      default:
        break;
    }
  };

  const chip = (id: Filter, label: string, icon: string) => {
    // Graph chip is visually primary when "all" (Figma default accent on Graph)
    const showActive = id === "graph" ? filter === "all" || filter === "graph" : filter === id;
    return (
      <button
        type="button"
        className={`gsh-chip ${showActive ? "is-active" : ""}`}
        data-testid={`gsh-filter-${id}`}
        aria-pressed={filter === id || (id === "graph" && filter === "all")}
        onClick={() => setFilter(id === "graph" && filter === "graph" ? "all" : id)}
      >
        <img src={icon} alt="" width={20} height={20} aria-hidden />
        {label}
      </button>
    );
  };

  return (
    <div
      className="gsh scroll"
      data-testid="graph-social-home"
      data-figma-home="201:5"
      data-founder-seed={seedOn ? FOUNDER_GRAPH_SEED_ID : "off"}
      data-node-ref="201:5"
      aria-label={`${PRODUCT_PUBLIC_NAME} home`}
    >
      <header className="gsh-top">
        <div className="gsh-brand" data-testid="gsh-brand">
          <OpalMark size="md" title="" />
          <OpalWordmark height={22} title="" compact />
        </div>
        <span className="gsh-vista" data-testid="gsh-vista">
          <img src={HOME_ICONS.vista} alt="" width={18} height={18} aria-hidden />
          {locationLabel}
        </span>
      </header>

      <motion.h1
        className="gsh-title"
        data-testid="gsh-title"
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.45, ease: EASE }}
      >
        See what your people are up to.
      </motion.h1>
      <p className="gsh-lede">Plans, live things, and memories all in one place.</p>

      <div className="gsh-filters" role="toolbar" aria-label="Feed focus">
        {chip("graph", "Graph", HOME_ICONS.graph)}
        {chip("live", "Live", HOME_ICONS.live)}
        {chip("memory", "Memory", HOME_ICONS.memory)}
      </div>

      <div className="gsh-feed" data-testid="gsh-feed">
        {cards.map((card, i) => (
          <FeedCard key={card.id} card={card} reduce={reduce} index={i} onAction={onAction} />
        ))}
        {!seedOn && !continuation ? (
          <p className="gsh-empty">Your people will show up here.</p>
        ) : null}
      </div>

      {/* 145:46 endless-scroll seam: live product continuation after seed window */}
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
