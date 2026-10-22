/**
 * Repair #22 (WS-3) — the C2 Home story viewer, with the
 * temporality law the founder named (2026-10-21):
 *
 * - DWELL: a video story plays its actual length (progress is
 *   the media clock; the viewer advances on `ended`); an image
 *   story holds IMAGE_STORY_MS (7s) — the one value, from
 *   opalUi/storyPlayback, shared with the OpalApp viewer.
 * - AUTO-ADVANCE: when the dwell ends the viewer JUMPS to the
 *   next story in rail order — the next story of the same
 *   person, then the next person's, as the rail moves along.
 *   At the rail's end the viewer EXITS back to Home (which
 *   never unmounted, so the stream and scroll are untouched):
 *   the end-state law — the user is never stranded.
 * - PROGRESS: one segment per story of the person on stage;
 *   earlier segments are full, the current segment fills with
 *   the dwell, later segments are empty.
 * - EXPIRY: the queue is built from live stories only (the
 *   projection drops records past their server expires_at, and
 *   the queue builder filters again at open time) — an expired
 *   story is never staged.
 * - A story whose media fails to play falls back to the image
 *   dwell rather than stranding the viewer on a dead stage.
 *
 * Tap right → next · tap left → prior · × / Escape → exit.
 * Live doors: Reply (W-17 ext.) and, since Repair #24 (WS-1)
 * built the story-engagement record (audit D-M), Comments -
 * the comments door opens the story's comments on that record.
 * No heart or take door renders here: no light or graph record
 * exists for stories (the rest of D-15 stands).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TopLayer } from "../../opalUi/TopLayer";
import { AuthedImage } from "../../media/AuthedImage";
import {
  IMAGE_STORY_MS,
  isStoryExpired,
  isVideoStorySrc,
} from "../../opalUi/storyPlayback";
import { IconChats, IconClose } from "./bits";

export type StoryPlayItem = {
  id: string;
  personName: string;
  personId?: string | null;
  mediaUrl: string;
  caption?: string | null;
  expiresAt?: string | null;
};

type Props = {
  /** Live stories in rail order, flattened from the tapped
   *  person's group to the rail's end (buildStoryQueue). */
  queue: StoryPlayItem[];
  onClose: () => void;
  /** The viewer's one lawful live door (W-17 ext.). */
  onReply?: (personId: string) => void;
  /** Repair #24 (WS-1): the story's comments door, on the
   *  story-engagement record. Absent = no door renders. */
  onComments?: (storyId: string) => void;
};

export function StoryViewerC2({ queue, onClose, onReply, onComments }: Props) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const current = queue[index] ?? queue[0];
  const video = isVideoStorySrc(current?.mediaUrl) && !videoFailed;
  // Segments: the contiguous run of the current person's stories.
  const segments = useMemo(() => {
    if (!current) return { start: 0, count: 0, at: 0 };
    let start = index;
    let end = index;
    const key = (s: StoryPlayItem) => `${s.personId ?? ""}|${s.personName}`;
    while (start > 0 && key(queue[start - 1]) === key(current)) start -= 1;
    while (end < queue.length - 1 && key(queue[end + 1]) === key(current)) end += 1;
    return { start, count: end - start + 1, at: index - start };
  }, [queue, index, current]);

  const goTo = useCallback(
    (next: number) => {
      // End-state law: before the first story and past the last
      // story both exit to Home — never a stranded stage.
      if (next < 0 || next >= queue.length) {
        onClose();
        return;
      }
      setIndex(next);
      setProgress(0);
      setVideoFailed(false);
    },
    [onClose, queue.length],
  );

  const advance = useCallback(() => goTo(index + 1), [goTo, index]);
  const retreat = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") advance();
      if (e.key === "ArrowLeft") retreat();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, advance, retreat]);

  // IMAGE dwell: hold IMAGE_STORY_MS, filling the current
  // segment, then jump. A failed video dwells the same way.
  useEffect(() => {
    if (!current || video) return;
    startedAtRef.current = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - startedAtRef.current) / IMAGE_STORY_MS);
      setProgress(p);
      if (p >= 1) {
        advance();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [current, video, index, advance]);

  if (!current) return null;

  const onMediaTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.33) retreat();
    else advance();
  };

  return (
    <TopLayer band="flow">
      <div
        className="c2s-viewer"
        data-testid="c2-story-viewer"
        data-story-id={current.id}
        data-story-index={index}
        data-story-count={queue.length}
        data-story-media={video ? "video" : "image"}
        role="dialog"
        aria-modal="true"
        aria-label={`${current.personName} story`}
      >
        <div
          className="c2s-viewer-progress"
          data-testid="c2-story-viewer-progress"
          data-progress={progress.toFixed(3)}
          aria-hidden
        >
          {Array.from({ length: Math.max(segments.count, 1) }).map((_, i) => (
            <span
              key={i}
              className="c2s-viewer-seg"
              data-done={i < segments.at ? "1" : undefined}
              data-current={i === segments.at ? "1" : undefined}
            >
              {i === segments.at ? (
                <span
                  className="c2s-viewer-seg-fill"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              ) : null}
            </span>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px 0",
          }}
        >
          <span style={{ fontWeight: 650 }}>{current.personName}</span>
          <button
            type="button"
            className="c2s-icon-btn"
            aria-label="Close story"
            data-testid="c2-story-viewer-close"
            onClick={onClose}
          >
            <IconClose />
          </button>
        </div>
        <div className="c2s-viewer-media" onClick={onMediaTap}>
          {video ? (
            <video
              ref={videoRef}
              src={current.mediaUrl}
              autoPlay
              playsInline
              data-testid="c2-story-viewer-media"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onTimeUpdate={(e) => {
                const el = e.currentTarget;
                if (el.duration && Number.isFinite(el.duration) && el.duration > 0) {
                  setProgress(Math.min(1, el.currentTime / el.duration));
                }
              }}
              onEnded={advance}
              onError={() => setVideoFailed(true)}
            />
          ) : (
            <AuthedImage
              src={current.mediaUrl}
              alt={current.caption || `${current.personName} story`}
              testId="c2-story-viewer-media"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
          {current.caption ? (
            <p className="c2s-viewer-caption" data-testid="c2-story-viewer-caption">
              {current.caption}
            </p>
          ) : null}
        </div>
        {onComments || (current.personId && onReply) ? (
          <div className="c2s-viewer-foot">
            {onComments ? (
              <button
                type="button"
                className="c2s-glyph-btn c2s-viewer-comments"
                data-testid="c2-story-viewer-comments"
                aria-label={`Comments on ${current.personName} story`}
                onClick={() => onComments(current.id)}
              >
                <IconChats size={22} />
              </button>
            ) : null}
            {current.personId && onReply ? (
              <button
                type="button"
                className="c2s-btn-text c2s-viewer-reply"
                data-testid="c2-story-viewer-reply"
                aria-label={`Reply to ${current.personName}`}
                onClick={() => onReply(current.personId!)}
              >
                Reply
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </TopLayer>
  );
}

/**
 * Build the viewer's queue from the rail at open time: the
 * rail's groups in order (your own story first, then each
 * person's), flattened from the opened group to the rail's end,
 * with expired stories filtered at this instant — a story that
 * expired while Home sat open never gets staged.
 */
export function storyQueueFromRail(
  groups: Array<{
    personName: string;
    personId?: string | null;
    items: Array<{
      id: string;
      mediaUrl: string;
      caption?: string | null;
      expiresAt?: string | null;
    }>;
  }>,
  startGroup: number,
  now: Date = new Date(),
): StoryPlayItem[] {
  const out: StoryPlayItem[] = [];
  for (let g = Math.max(0, startGroup); g < groups.length; g += 1) {
    for (const item of groups[g].items) {
      if (isStoryExpired(item.expiresAt, now)) continue;
      out.push({
        id: item.id,
        personName: groups[g].personName,
        personId: groups[g].personId,
        mediaUrl: item.mediaUrl,
        caption: item.caption ?? null,
        expiresAt: item.expiresAt ?? null,
      });
    }
  }
  return out;
}
