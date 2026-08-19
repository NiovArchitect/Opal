/**
 * SOCIAL-01 — Memory detail
 * Figma 437:3
 */
import React from "react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";
import type { FounderFeedCard } from "./founderGraphSeed";

type Props = {
  card: FounderFeedCard;
  liked?: boolean;
  likeCount?: number;
  commentCount?: number;
  onBack: () => void;
  onAuthor?: () => void;
  onLike?: () => void;
  onComment?: () => void;
  onForward?: () => void;
  onSave?: () => void;
  onRepost?: () => void;
  saved?: boolean;
  reposted?: boolean;
};

export function MemoryDetailSheet({
  card,
  liked,
  likeCount,
  commentCount,
  onBack,
  onAuthor,
  onLike,
  onComment,
  onForward,
  onSave,
  onRepost,
  saved,
  reposted,
}: Props) {
  return (
    <div
      className="memory-detail-sheet"
      data-testid="memory-detail-sheet"
      data-figma-social="437:3"
      role="dialog"
      aria-modal="true"
      aria-label="Memory"
    >
      <header className="graph-create-head">
        <button type="button" className="btn ghost" data-testid="memory-detail-back" onClick={onBack}>
          Back
        </button>
        <div className="gsh-brand">
          <OpalMark size="sm" title="" />
          <OpalWordmark height={18} title="" compact />
        </div>
      </header>

      <button
        type="button"
        className="gsh-card-row memory-detail-author"
        data-testid="memory-detail-author"
        onClick={onAuthor}
      >
        <span className="chats-home-avatar" aria-hidden>
          {card.personInitial || card.person.slice(0, 1)}
        </span>
        <span>
          <strong>{card.person}</strong>
          <span className="gsh-meta"> · Memory</span>
        </span>
      </button>

      {card.mediaSrc ? (
        <div className="memory-detail-media" data-testid="memory-detail-media">
          <img src={card.mediaSrc} alt="" />
        </div>
      ) : null}

      <p className="gsh-caption" data-testid="memory-detail-caption">
        <strong>{card.person}</strong> {card.caption || card.title}
      </p>
      <p className="gsh-meta gsh-timestamp">{card.when} · Memory</p>

      <div className="gsh-social-row" role="group" aria-label="Memory actions">
        <button
          type="button"
          className={`gsh-social-btn ${liked ? "is-on" : ""}`}
          data-testid="memory-detail-like"
          data-mode="active"
          aria-pressed={!!liked}
          onClick={onLike}
        >
          ♥ {likeCount != null ? likeCount : ""}
        </button>
        <button
          type="button"
          className="gsh-social-btn"
          data-testid="memory-detail-comment"
          data-mode="active"
          onClick={onComment}
        >
          💬 {commentCount != null ? commentCount : ""}
        </button>
        <button
          type="button"
          className={`gsh-social-btn ${reposted ? "is-on" : ""}`}
          data-testid="memory-detail-repost"
          data-mode="active"
          onClick={onRepost}
        >
          ↺
        </button>
        <button
          type="button"
          className="gsh-social-btn"
          data-testid="memory-detail-forward"
          data-mode="active"
          onClick={onForward}
        >
          ↗
        </button>
        <button
          type="button"
          className={`gsh-social-btn ${saved ? "is-on" : ""}`}
          data-testid="memory-detail-save"
          data-mode="active"
          onClick={onSave}
        >
          {saved ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}
