/**
 * SOCIAL-02 — Comments
 * Figma 437:69
 * Commenting does not create Connection, join Graph, or widen audience.
 */
import React, { useState } from "react";
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
  return (
    <div
      className="memory-comments-sheet"
      data-testid="memory-comments-sheet"
      data-figma-social="437:69"
      data-content-id={contentId}
      role="dialog"
      aria-modal="true"
      aria-label="Comments"
    >
      <header className="graph-create-head">
        <button type="button" className="btn ghost" data-testid="memory-comments-back" onClick={onBack}>
          Back
        </button>
        <div className="gsh-brand">
          <OpalMark size="sm" title="" />
          <OpalWordmark height={18} title="" compact />
        </div>
      </header>
      <h1 className="chats-home-title">Comments</h1>
      {title ? <p className="gsh-meta">{title}</p> : null}

      {denied ? (
        <p className="gsh-gate-note" role="alert" data-testid="memory-comments-denied">
          {denied}
        </p>
      ) : (
        <>
          <ul className="memory-comments-list" data-testid="memory-comments-list">
            {comments.map((c) => (
              <li key={c.id} data-testid={`memory-comment-${c.id}`}>
                <strong>{c.authorName}</strong>
                <span className="gsh-meta">
                  {" "}
                  · {new Date(c.createdAt).toLocaleString([], { hour: "numeric", minute: "2-digit", hour12: true })}
                </span>
                <p>{c.body}</p>
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
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              onSubmit(draft);
              setDraft("");
            }}
          >
            <input
              className="chats-home-search"
              data-testid="memory-comments-input"
              placeholder="Add a comment"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Add a comment"
            />
            <button type="submit" className="btn primary" data-testid="memory-comments-submit" data-mode="active">
              Post
            </button>
          </form>
          <p className="gsh-meta">Comments do not create a Connection or join a Graph.</p>
        </>
      )}
    </div>
  );
}
