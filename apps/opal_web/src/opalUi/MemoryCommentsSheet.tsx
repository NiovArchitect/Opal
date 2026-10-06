/**
 * SOCIAL-02 — COMMENTS
 * Figma 437:69
 *
 * Brand header + page title/lede.
 * Comments live in a modal sheet with sheet-local "Close" (not a giant Back).
 * Commenting does not create Connection, join Graph, or widen audience.
 */
import React, { useEffect, useState } from "react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";
import type { HomeComment } from "./homeEngagementStore";

type Props = {
  contentId: string;
  title?: string;
  comments: HomeComment[];
  denied?: string | null;
  onBack: () => void;
  onSubmit: (body: string) => void;
};

export function MemoryCommentsSheet({
  contentId,
  title,
  comments,
  denied,
  onBack,
  onSubmit,
}: Props) {
  const [draft, setDraft] = useState("");
  const countLabel =
    comments.length === 1 ? "1 comment" : `${comments.length} comments`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  return (
    <div
      className="memory-comments-sheet social-dest-437-69"
      data-testid="memory-comments-sheet"
      data-screen="social-comments"
      data-figma-node="437:69"
      data-figma-social="437:69"
      data-content-id={contentId}
      role="dialog"
      aria-modal="true"
      aria-label="Comments"
    >
      <header className="social-dest-brand" data-figma-chrome="437:69-brand">
        <div className="gsh-brand">
          <OpalMark size="md" title="" />
          <OpalWordmark height={20} title="" compact />
        </div>
      </header>

      <h1 className="social-dest-title">Comments</h1>
      <p className="social-dest-lede">
        Stay on the post. Conversation opens without losing your place.
      </p>
      {title ? <p className="gsh-meta comments-source-title">{title}</p> : null}

      {denied ? (
        <p className="gsh-gate-note" role="alert" data-testid="memory-comments-denied">
          {denied}
        </p>
      ) : (
        <div className="comments-modal-sheet" data-testid="comments-modal-sheet">
          <div className="comments-modal-top">
            <p className="comments-count" data-testid="memory-comments-count">
              {countLabel}
            </p>
            <button
              type="button"
              className="comments-sheet-close"
              data-testid="memory-comments-back"
              onClick={onBack}
            >
              Close
            </button>
          </div>

          <ul className="memory-comments-list" data-testid="memory-comments-list">
            {comments.map((c) => (
              <li key={c.id} data-testid={`memory-comment-${c.id}`}>
                <div className="comment-row">
                  <span className="comment-avatar" aria-hidden>
                    {(c.authorName || "?").slice(0, 1)}
                  </span>
                  <div className="comment-copy">
                    <strong>{c.authorName}</strong>
                    <p>{c.body}</p>
                  </div>
                </div>
              </li>
            ))}
            {!comments.length ? (
              <li className="gsh-empty" data-testid="memory-comments-empty">
                No comments yet.
              </li>
            ) : null}
          </ul>

          <form
            className="memory-comments-composer"
            data-testid="memory-comments-composer"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              onSubmit(draft.trim());
              setDraft("");
            }}
          >
            <input
              className="comments-input"
              data-testid="memory-comments-input"
              placeholder="Add a comment..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Add a comment"
            />
            <button
              type="submit"
              className="comments-send"
              data-testid="memory-comments-submit"
              data-mode="active"
              disabled={!draft.trim()}
            >
              Post
            </button>
          </form>
        </div>
      )}

      {/* Always show composer affordance even when gate denies list fetch */}
      {denied ? (
        <form
          className="memory-comments-composer"
          data-testid="memory-comments-composer"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            onSubmit(draft.trim());
            setDraft("");
          }}
        >
          <input
            className="comments-input"
            data-testid="memory-comments-input"
            placeholder="Add a comment..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Add a comment"
          />
          <button
            type="submit"
            className="comments-send"
            data-testid="memory-comments-submit"
            data-mode="active"
            disabled={!draft.trim()}
          >
            Post
          </button>
        </form>
      ) : null}

      <p className="gsh-meta comments-law">
        Comments do not create a Connection or join a Graph.
      </p>
    </div>
  );
}
