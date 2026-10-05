/**
 * STORY-01 — VIEWER
 * Figma 357:418
 *
 * Full-bleed immersive media. Temporary lifecycle is server truth — not customer chrome.
 * Authority: tapping a Story from Home 287:20 opens THIS viewer.
 * Create flow is separate: 476:92 STORY-02.
 *
 * Playback (P0 / 594:2):
 * - IMAGE: default 7s visible, then auto-advance (independent of 24h expiry)
 * - VIDEO: play actual media duration; advance on ended
 * - tap right → next · tap left → prior · hold → pause · release → resume
 * - after last item for a person → next eligible person
 * - after final eligible → close to prior Home context
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FounderStoryItem } from "./founderGraphSeed";

const IMAGE_STORY_MS = 7000;

type Props = {
  story: FounderStoryItem;
  /** Eligible Stories in rail order (287:20). Defaults to [story]. */
  stories?: FounderStoryItem[];
  onClose: () => void;
};

function isVideoSrc(src?: string, mediaKind?: FounderStoryItem["mediaKind"]): boolean {
  if (mediaKind === "video") return true;
  if (mediaKind === "image") return false;
  if (!src) return false;
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(src);
}

export function StoryViewer({ story, stories, onClose }: Props) {
  const queue = useMemo(() => {
    const list = stories && stories.length > 0 ? stories : [story];
    const start = Math.max(
      0,
      list.findIndex((s) => s.id === story.id),
    );
    return { list, start: start >= 0 ? start : 0 };
  }, [stories, story]);

  const [index, setIndex] = useState(queue.start);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const holdRef = useRef(false);
  const holdTimerRef = useRef<number | null>(null);
  const pointerOriginRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  const current = queue.list[index] ?? story;
  const video = isVideoSrc(current.mediaSrc, current.mediaKind);

  const goTo = useCallback(
    (next: number) => {
      if (next < 0) {
        onClose();
        return;
      }
      if (next >= queue.list.length) {
        onClose();
        return;
      }
      setIndex(next);
      setProgress(0);
      elapsedRef.current = 0;
      startedAtRef.current = performance.now();
    },
    [onClose, queue.list.length],
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

  // Reset timers when the active Story changes
  useEffect(() => {
    setProgress(0);
    elapsedRef.current = 0;
    startedAtRef.current = performance.now();
    setPaused(false);
  }, [index, current.id]);

  // IMAGE playback timer (7s) — independent of server expiry
  useEffect(() => {
    if (video) return;
    if (paused) return;

    const tick = (now: number) => {
      if (holdRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const elapsed = elapsedRef.current + (now - startedAtRef.current);
      const p = Math.min(1, elapsed / IMAGE_STORY_MS);
      setProgress(p);
      if (p >= 1) {
        advance();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    startedAtRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      elapsedRef.current += performance.now() - startedAtRef.current;
    };
  }, [video, paused, index, current.id, advance]);

  // VIDEO: drive progress from media clock; advance on ended
  useEffect(() => {
    if (!video) return;
    const el = videoRef.current;
    if (!el) return;

    const onTime = () => {
      const dur = el.duration && Number.isFinite(el.duration) ? el.duration : 0;
      if (dur > 0) setProgress(Math.min(1, el.currentTime / dur));
    };
    const onEnded = () => advance();
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnded);
    if (!paused) {
      void el.play().catch(() => {
        /* autoplay policies — still show first frame */
      });
    }
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnded);
    };
  }, [video, paused, index, current.id, advance]);

  useEffect(() => {
    const el = videoRef.current;
    if (!video || !el) return;
    if (paused) el.pause();
    else void el.play().catch(() => undefined);
  }, [paused, video]);

  const clearHoldTimer = () => {
    if (holdTimerRef.current != null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const onPointerDownNav = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    pointerOriginRef.current = { x: e.clientX, y: e.clientY };
    clearHoldTimer();
    holdTimerRef.current = window.setTimeout(() => {
      holdRef.current = true;
      setPaused(true);
    }, 160);
  };

  const onPointerUpNav = (e: React.PointerEvent<HTMLDivElement>) => {
    const wasHolding = holdRef.current;
    clearHoldTimer();
    if (wasHolding) {
      holdRef.current = false;
      setPaused(false);
      startedAtRef.current = performance.now();
      pointerOriginRef.current = null;
      return;
    }
    const origin = pointerOriginRef.current;
    pointerOriginRef.current = null;
    if (!origin) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.33) retreat();
    else advance();
  };

  const onPointerCancelNav = () => {
    clearHoldTimer();
    if (holdRef.current) {
      holdRef.current = false;
      setPaused(false);
      startedAtRef.current = performance.now();
    }
    pointerOriginRef.current = null;
  };

  return (
    <div
      className="story-viewer story-viewer-357-418"
      data-testid="story-viewer"
      data-screen="story-viewer"
      data-figma-node="357:418"
      data-figma-story="357:418"
      data-story-id={current.id}
      data-story-media={video ? "video" : "image"}
      data-story-paused={paused ? "true" : "false"}
      role="dialog"
      aria-modal="true"
      aria-label={`${current.person} story`}
    >
      <div className="story-viewer-media" data-testid="story-viewer-media">
        {current.mediaSrc ? (
          video ? (
            <video
              ref={videoRef}
              src={current.mediaSrc}
              playsInline
              preload="auto"
              aria-label=""
            />
          ) : (
            <img src={current.mediaSrc} alt="" />
          )
        ) : (
          <div className="story-viewer-media-fallback" aria-hidden />
        )}
      </div>

      <div
        className="story-viewer-progress-rail"
        aria-hidden
        data-testid="story-viewer-progress"
      >
        {queue.list.map((s, i) => (
          <span key={s.id} className="story-viewer-progress-seg">
            <span
              className="story-viewer-progress-fill"
              style={{
                width:
                  i < index ? "100%" : i === index ? `${Math.round(progress * 100)}%` : "0%",
              }}
            />
          </span>
        ))}
      </div>

      <header className="story-viewer-chrome">
        <div className="story-viewer-who">
          {current.avatarSrc ? (
            <img className="story-viewer-avatar" src={current.avatarSrc} alt="" />
          ) : (
            <span className="story-viewer-avatar fallback" aria-hidden>
              {(current.person || "?").slice(0, 1)}
            </span>
          )}
          <div className="story-viewer-meta">
            <strong>{current.person}</strong>
            <span>
              {current.pulseState ? (
                <em
                  className={`story-viewer-pulse is-${current.pulseState.toLowerCase()}`}
                  data-testid="story-viewer-pulse"
                  data-pulse={current.pulseState}
                >
                  {current.pulseState}
                </em>
              ) : null}
              {current.pulseState ? " · " : ""}
              {current.when || "now"}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="story-viewer-x"
          data-testid="story-viewer-close"
          aria-label="Close story"
          onClick={onClose}
        >
          ×
        </button>
      </header>

      <div
        className="story-viewer-nav-hit"
        data-testid="story-viewer-nav"
        onPointerDown={onPointerDownNav}
        onPointerUp={onPointerUpNav}
        onPointerCancel={onPointerCancelNav}
        onPointerLeave={onPointerCancelNav}
      />

      {current.caption ? (
        <p className="story-viewer-caption" data-testid="story-viewer-caption">
          {current.caption}
        </p>
      ) : null}

      <div className="story-viewer-composer">
        <input
          className="story-viewer-reply"
          data-testid="story-viewer-reply"
          placeholder="Reply"
          aria-label="Reply to story"
          readOnly
        />
        <button
          type="button"
          className="story-viewer-share"
          data-testid="story-viewer-share"
          aria-label="Share story"
          data-mode="conditional"
        >
          ↗
        </button>
      </div>
    </div>
  );
}
