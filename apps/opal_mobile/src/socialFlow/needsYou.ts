import type { SocialFlowSignal } from "./types";

export const MAX_NEEDS_YOU = 3;

export const NEEDS_YOU_EMPTY = "Nothing needs you right now.";

/** Bound and prioritize Needs you items — usefulness only, no engagement theater. */
export function selectNeedsYou(
  items: SocialFlowSignal[],
  viewerUserId: string,
): { visible: SocialFlowSignal[]; overflow: number; emptyCopy: string | null } {
  const privateOwned = items.filter(
    (s) =>
      s.visibility === "private" &&
      (s.audienceUserId === viewerUserId || s.audienceUserId == null) &&
      s.status !== "dismissed" &&
      s.status !== "completed",
  );

  const visible = privateOwned.slice(0, MAX_NEEDS_YOU);
  const overflow = Math.max(0, privateOwned.length - MAX_NEEDS_YOU);

  return {
    visible,
    overflow,
    emptyCopy: visible.length === 0 ? NEEDS_YOU_EMPTY : null,
  };
}

export const ALLOWED_GRATIFICATION = [
  "Reservation handled.",
  "You followed through.",
  "You closed the loop.",
  "Nothing needs you right now.",
  "This plan is settled.",
] as const;

export const PROHIBITED_COPY_PATTERNS = [
  /streak at risk/i,
  /losing this relationship/i,
  /relationship score/i,
  /you are behind/i,
  /social score/i,
];
