/**
 * Repair #23 (WS-23-1) - COMMENTS ON A MOMENT, in the C2 shell.
 *
 * The backend leg has existed end to end (GET / POST
 * /social-moments/:id/comments) and the legacy shell had a sheet
 * for it (opalUi/MemoryCommentsSheet.tsx - behavior reference
 * only: list, post, author/timestamp render). C2 had no door at
 * all (audit R-1) and the card's speech-bubble glyph opened a
 * DM instead (audit F-3). This sheet is the C2-native door the
 * bubble now opens.
 *
 * Material: the shell's own sheet pattern (the BondStone sheet
 * pattern) - TopLayer sheet band, c2s-scrim, c2s-sheet, an
 * explicit close control. Nothing is ported from the legacy
 * sheet's markup or classes.
 *
 * Truth law: the list renders ONLY from the
 * listSocialMomentComments response, and a posted comment
 * renders ONLY from the addSocialMomentComment response (the
 * server-stamped comment record it returns). There is no
 * optimistic paint the server has not confirmed: a failed post
 * keeps the draft and shows one plain error line, and a failed
 * load shows its own error line with a retry.
 */
import React, { useEffect, useState } from "react";
import { TopLayer } from "../../opalUi/TopLayer";
import {
  addSocialMomentComment,
  listSocialMomentComments,
} from "../../api/productClient";
import { IconClose } from "./bits";

export type C2MomentComment = {
  id: string;
  authorUserId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

/** The server comment contract (SocialMomentComment.contract):
 *  snake_case fields, finished by the server. Normalizing here
 *  keeps the sheet rendering one shape whichever leg supplied
 *  it (the list read or the post response). */
export function commentFromContract(raw: Record<string, unknown>): C2MomentComment | null {
  if (!raw || typeof raw.id !== "string" || typeof raw.body !== "string") return null;
  return {
    id: raw.id,
    authorUserId: typeof raw.author_user_id === "string" ? raw.author_user_id : "",
    authorName:
      typeof raw.author_name === "string" && raw.author_name ? raw.author_name : "Someone",
    body: raw.body,
    createdAt: typeof raw.created_at === "string" ? raw.created_at : "",
  };
}

/** A comment's time, from its own server stamp - the same
 *  short form the moments archive uses. Unparseable = no line. */
export function commentTimeLabel(iso: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function C2CommentsSheet({
  momentId,
  bearer,
  onClose,
}: {
  momentId: string;
  bearer?: string;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<C2MomentComment[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await listSocialMomentComments(momentId, bearer);
      setComments(
        (res.comments ?? [])
          .map((c) => commentFromContract(c as unknown as Record<string, unknown>))
          .filter((c): c is C2MomentComment => c !== null),
      );
      setLoadError(null);
    } catch {
      setLoadError("Comments did not load. Check your connection and try again.");
    }
  };

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const res = await listSocialMomentComments(momentId, bearer);
        if (!live) return;
        setComments(
          (res.comments ?? [])
            .map((c) => commentFromContract(c as unknown as Record<string, unknown>))
            .filter((c): c is C2MomentComment => c !== null),
        );
        setLoadError(null);
      } catch {
        if (!live) return;
        setLoadError("Comments did not load. Check your connection and try again.");
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [momentId, bearer]);

  const post = async () => {
    const body = draft.trim();
    if (!body || posting) return;
    setPosting(true);
    setPostError(null);
    try {
      const res = await addSocialMomentComment(momentId, body, bearer);
      const posted = commentFromContract(res.comment as Record<string, unknown>);
      if (posted) {
        // Rendered from the RESPONSE - the server-stamped
        // record - never from the local draft.
        setComments((current) => {
          const base = current ?? [];
          return base.some((c) => c.id === posted.id)
            ? base.map((c) => (c.id === posted.id ? posted : c))
            : [...base, posted];
        });
      } else {
        // A response without a renderable comment record: the
        // truth is a re-read, not a local paint.
        await load();
      }
      setDraft("");
    } catch {
      setPostError("That comment did not post. Your words are still here.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <TopLayer band="sheet">
      <div className="c2s-scrim" onClick={onClose}>
        <div
          className="c2s-sheet c2s-comments-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Comments"
          data-testid="c2-comments-sheet"
          data-moment-id={momentId}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="c2s-comments-head">
            <p className="c2s-sheet-title" style={{ margin: 0 }}>
              Comments
            </p>
            <span className="c2s-row-spacer" aria-hidden />
            <button
              type="button"
              className="c2s-icon-btn"
              aria-label="Close comments"
              data-testid="c2-comments-close"
              onClick={onClose}
            >
              <IconClose />
            </button>
          </div>

          {loadError ? (
            <div data-testid="c2-comments-error">
              <p className="c2s-card-line" role="alert">
                {loadError}
              </p>
              <button type="button" className="c2s-btn-text" onClick={() => void load()}>
                Try again
              </button>
            </div>
          ) : comments === null ? (
            <p className="c2s-card-line" data-testid="c2-comments-loading">
              Loading.
            </p>
          ) : comments.length === 0 ? (
            <p className="c2s-card-line" data-testid="c2-comments-empty">
              No comments yet. Be the first to say something.
            </p>
          ) : (
            <ul className="c2s-comments-list" data-testid="c2-comments-list">
              {comments.map((comment) => {
                const when = commentTimeLabel(comment.createdAt);
                return (
                  <li
                    key={comment.id}
                    className="c2s-comment-row"
                    data-testid="c2-comment"
                    data-comment-id={comment.id}
                  >
                    <span className="c2s-comment-avatar" aria-hidden>
                      {comment.authorName.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="c2s-comment-copy">
                      <p className="c2s-comment-meta">
                        <strong>{comment.authorName}</strong>
                        {when ? <span className="c2s-comment-time"> {when}</span> : null}
                      </p>
                      <p className="c2s-comment-body">{comment.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <form
            className="c2s-comments-composer"
            data-testid="c2-comments-composer"
            onSubmit={(e) => {
              e.preventDefault();
              void post();
            }}
          >
            <input
              className="c2s-field c2s-comments-input"
              data-testid="c2-comments-input"
              placeholder="Add a comment..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Add a comment"
            />
            <button
              type="submit"
              className="c2s-btn-primary c2s-comments-post"
              data-testid="c2-comments-post"
              disabled={!draft.trim() || posting}
            >
              Post
            </button>
          </form>
          {postError ? (
            <p className="c2s-error-line" role="alert" data-testid="c2-comments-post-error">
              {postError}
            </p>
          ) : null}
          <p className="c2s-card-line c2s-comments-law">
            Comments stay on this moment. They do not start a conversation or join a plan.
          </p>
        </div>
      </div>
    </TopLayer>
  );
}
