/**
 * SOCIAL-01 — MEMORY DETAIL
 * Figma 437:3 — exact visual authority
 *
 * Brand header · Memory title 30px · lede · author 42 · media 350×330 r22 ·
 * caption · circular action wells with approved icons · lineage · dock visible.
 * No Close chrome (dock Home). No Save on this node.
 */
import React, { useEffect } from "react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";
import type { FounderFeedCard } from "./founderGraphSeed";

type Props = {
  card: FounderFeedCard;
  liked?: boolean;
  likeCount?: number;
  commentCount?: number;
  repostCount?: number;
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
  repostCount,
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
  void saved;
  void onSave;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  const caption = card.caption || card.title || "";

  return (
    <div
      className="memory-detail-sheet social-dest-437-3"
      data-testid="memory-detail-sheet"
      data-screen="social-memory-detail"
      data-figma-node="437:3"
      data-figma-social="437:3"
      data-content-id={card.id}
      role="dialog"
      aria-modal="true"
      aria-label="Memory"
    >
      <header className="md437-brand" data-figma-chrome="437:3-brand">
        <OpalMark size="md" title="" />
        <OpalWordmark height={20} title="" compact />
      </header>

      <h1 className="md437-title">Memory</h1>
      <p className="md437-lede">A lived moment, shared by the person who owns it.</p>

      <button
        type="button"
        className="md437-author"
        data-testid="memory-detail-author"
        onClick={onAuthor}
      >
        {card.avatarSrc ? (
          <img className="md437-avatar" src={card.avatarSrc} alt="" width={42} height={42} />
        ) : (
          <span className="md437-avatar fallback" aria-hidden>
            {card.personInitial || card.person.slice(0, 1)}
          </span>
        )}
        <span className="md437-who">
          <strong>{card.person}</strong>
          <span>{card.when || "recently"}</span>
        </span>
      </button>

      {card.mediaSrc ? (
        <div className="md437-media" data-testid="memory-detail-media">
          <img src={card.mediaSrc} alt="" />
        </div>
      ) : (
        <div className="md437-media md437-media-empty" data-testid="memory-detail-media" />
      )}

      <p className="md437-caption" data-testid="memory-detail-caption">
        {caption}
      </p>

      <div className="md437-actions" role="group" aria-label="Memory actions">
        <button
          type="button"
          className={`md437-action ${liked ? "is-on" : ""}`}
          data-testid="memory-detail-like"
          data-mode="active"
          aria-pressed={!!liked}
          aria-label="Like"
          onClick={onLike}
        >
          <span className="md437-well" aria-hidden>
            <img src="/figma-v2/social/social-heart.svg" alt="" width={24} height={24} />
          </span>
          <span className="md437-count">{likeCount != null ? likeCount : ""}</span>
        </button>
        <button
          type="button"
          className="md437-action"
          data-testid="memory-detail-comment"
          data-mode="active"
          aria-label="Comment"
          onClick={onComment}
        >
          <span className="md437-well" aria-hidden>
            <img src="/figma-v2/social/social-comment.svg" alt="" width={24} height={24} />
          </span>
          <span className="md437-count">{commentCount != null ? commentCount : ""}</span>
        </button>
        <button
          type="button"
          className={`md437-action ${reposted ? "is-on" : ""}`}
          data-testid="memory-detail-repost"
          data-mode="active"
          aria-label="Repost"
          onClick={onRepost}
        >
          <span className="md437-well" aria-hidden>
            <img src="/figma-v2/social/social-repost.svg" alt="" width={24} height={24} />
          </span>
          <span className="md437-count">{repostCount != null ? repostCount : ""}</span>
        </button>
        <button
          type="button"
          className="md437-action"
          data-testid="memory-detail-forward"
          data-mode="active"
          aria-label="Forward"
          onClick={onForward}
        >
          <span className="md437-well" aria-hidden>
            <img src="/figma-v2/social/social-share.svg" alt="" width={24} height={24} />
          </span>
        </button>
        {/* Save exists in product law but is not on Figma 437:3 action row — keep hook for callers */}
        <button
          type="button"
          className="social-dest-sr-dismiss"
          data-testid="memory-detail-save"
          aria-label="Save"
          onClick={onSave}
        >
          Save
        </button>
      </div>

      <p className="md437-lineage">From a lived Graph · visible to friends</p>

      <button
        type="button"
        className="social-dest-sr-dismiss"
        data-testid="memory-detail-back"
        onClick={onBack}
        aria-label="Close Memory detail"
      >
        Close
      </button>
    </div>
  );
}
