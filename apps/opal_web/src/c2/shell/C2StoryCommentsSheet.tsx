/**
 * Repair #24 (WS-1) - COMMENTS ON A STORY, in the C2 shell.
 *
 * Mirrors C2CommentsSheet (the moment sheet, WS-23-1) on the
 * story-engagement record (GET / POST /stories/:id/comments).
 * Until this record existed, story cards carried no comments
 * door at all (audit D-M: story engagement was absent upstream).
 *
 * Truth law, identical to the moment sheet: the list renders
 * ONLY from the listStoryComments response, and a posted comment
 * renders ONLY from the addStoryComment response. No optimistic
 * paint. Counts ride the payload and are never rendered.
 */
import React, { useEffect, useState } from "react";
import { TopLayer } from "../../opalUi/TopLayer";
import { addStoryComment, listStoryComments } from "../../api/productClient";
import { commentFromContract, commentTimeLabel, type C2MomentComment } from "./C2CommentsSheet";
import { IconClose } from "./bits";

export function C2StoryCommentsSheet({
  storyId,
  bearer,
  onClose,
}: {
  storyId: string;
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
      const res = await listStoryComments(storyId, bearer);
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
        const res = await listStoryComments(storyId, bearer);
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
  }, [storyId, bearer]);

  const post = async () => {
    const body = draft.trim();
    if (!body || posting) return;
    setPosting(true);
    setPostError(null);
    try {
      const res = await addStoryComment(storyId, body, bearer);
      const posted = commentFromContract(res.comment as Record<string, unknown>);
      if (posted) {
        setComments((current) => {
          const base = current ?? [];
          return base.some((c) => c.id === posted.id)
            ? base.map((c) => (c.id === posted.id ? posted : c))
            : [...base, posted];
        });
      } else {
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
          aria-label="Comments on this story"
          data-testid="c2-story-comments-sheet"
          data-story-id={storyId}
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
              data-testid="c2-story-comments-close"
              onClick={onClose}
            >
              <IconClose />
            </button>
          </div>

          {loadError ? (
            <div data-testid="c2-story-comments-error">
              <p className="c2s-card-line" role="alert">
                {loadError}
              </p>
              <button type="button" className="c2s-btn-text" onClick={() => void load()}>
                Try again
              </button>
            </div>
          ) : comments === null ? (
            <p className="c2s-card-line" data-testid="c2-story-comments-loading">
              Loading.
            </p>
          ) : comments.length === 0 ? (
            <p className="c2s-card-line" data-testid="c2-story-comments-empty">
              No comments yet. Be the first to say something.
            </p>
          ) : (
            <ul className="c2s-comments-list" data-testid="c2-story-comments-list">
              {comments.map((comment) => {
                const when = commentTimeLabel(comment.createdAt);
                return (
                  <li
                    key={comment.id}
                    className="c2s-comment-row"
                    data-testid="c2-story-comment"
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
            data-testid="c2-story-comments-composer"
            onSubmit={(e) => {
              e.preventDefault();
              void post();
            }}
          >
            <input
              className="c2s-field c2s-comments-input"
              data-testid="c2-story-comments-input"
              placeholder="Add a comment..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Add a comment"
            />
            <button
              type="submit"
              className="c2s-btn-primary c2s-comments-post"
              data-testid="c2-story-comments-post"
              disabled={!draft.trim() || posting}
            >
              Post
            </button>
          </form>
          {postError ? (
            <p className="c2s-error-line" role="alert" data-testid="c2-story-comments-post-error">
              {postError}
            </p>
          ) : null}
          <p className="c2s-card-line c2s-comments-law">
            Comments stay on this story while it lasts. They do not start a conversation or join a plan.
          </p>
        </div>
      </div>
    </TopLayer>
  );
}
