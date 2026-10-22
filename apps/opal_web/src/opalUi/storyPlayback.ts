/**
 * Repair #22 (WS-3) — STORY TEMPORALITY, the one playback law.
 *
 * Founder behavior law (2026-10-21): tapping a story opens a
 * full-screen viewer; the story dwells according to its content —
 * a video plays its actual length, an image holds a defined
 * dwell — then it JUMPS to the next story as the rail moves
 * along; and ALL stories EXPIRE over a set time from the moment
 * of posting.
 *
 * This module is the single source for the values and the pure
 * decisions behind that law, shared by both story viewers (the
 * OpalApp StoryViewer and the C2 shell viewer) and by the rail
 * projections that feed them. Pure functions only: every clock
 * read is an argument, never a hidden `new Date()`, so tests pin
 * behavior without wall-clock sleeps.
 */

/** Image stories hold this long, then auto-advance. Video
 *  stories play their actual media duration instead (the viewer
 *  advances on the media element's `ended`). Independent of the
 *  server expiry lifetime below. */
export const IMAGE_STORY_MS = 7000;

/**
 * Story lifetime, server truth: TemporaryStoryPublishing sets
 * `expires_at = posted_at + ttl` at create (default 24h,
 * ttl_hours accepted 1..72) and `list_for_viewer` only returns
 * rows with `expires_at > now` — expired stories never reach the
 * client from the server. This constant names the default for
 * the client; the row's own `expires_at` is the authority.
 */
export const STORY_LIFETIME_DEFAULT_MS = 24 * 60 * 60 * 1000;

const VIDEO_STORY_SRC = /\.(mp4|webm|mov|m4v)(\?|$)/i;

/** True when a media ref names a video by its extension — the
 *  same test both viewers have always applied. */
export function isVideoStorySrc(src?: string | null): boolean {
  if (!src) return false;
  return VIDEO_STORY_SRC.test(src);
}

export type StoryMediaKind = "image" | "video";

/** A declared kind wins; otherwise the ref's extension decides. */
export function storyMediaKind(
  src?: string | null,
  declared?: StoryMediaKind | null,
): StoryMediaKind {
  if (declared === "video" || declared === "image") return declared;
  return isVideoStorySrc(src) ? "video" : "image";
}

/**
 * How long a story dwells before the viewer auto-advances.
 * - image: IMAGE_STORY_MS, always.
 * - video: the media's actual duration when known; null when it
 *   is not — the viewer then advances on the media `ended`
 *   event (still the actual length, read from the element).
 */
export function storyDwellMs(
  kind: StoryMediaKind,
  durationMs?: number | null,
): number | null {
  if (kind === "image") return IMAGE_STORY_MS;
  return typeof durationMs === "number" && Number.isFinite(durationMs) && durationMs > 0
    ? durationMs
    : null;
}

/**
 * Expiry is judged against the story's own server-issued
 * `expires_at`. Absent or unparseable values are NOT expired —
 * the server list is the authority and already withholds expired
 * rows; this client guard exists so a story that expires while
 * the app sits open still leaves the rail at the next compose.
 */
export function isStoryExpired(
  expiresAt: string | null | undefined,
  now: Date,
): boolean {
  if (!expiresAt) return false;
  const t = Date.parse(expiresAt);
  if (Number.isNaN(t)) return false;
  return t <= now.getTime();
}

/** The live subset of a story list at `now`, order preserved. */
export function liveStories<T extends { expiresAt?: string | null }>(
  items: readonly T[],
  now: Date,
): T[] {
  return items.filter((item) => !isStoryExpired(item.expiresAt, now));
}

/**
 * The viewer's queue: the rail's per-person groups flattened in
 * rail order, starting at the group the viewer opened on and
 * running to the rail's end. When the queue is exhausted the
 * viewer exits — the end-state law (the user is never stranded
 * on a dead stage, and the rail never wraps silently).
 */
export function buildStoryQueue<T>(groups: readonly (readonly T[])[], startGroup: number): T[] {
  const start = Math.max(0, Math.min(startGroup, Math.max(groups.length - 1, 0)));
  const out: T[] = [];
  for (let g = start; g < groups.length; g += 1) {
    for (const item of groups[g]) out.push(item);
  }
  return out;
}
