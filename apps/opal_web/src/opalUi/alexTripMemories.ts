/**
 * Alex Trip Graph · Mexico City — 14 viewable memories (founder seed).
 * Reuses StoryViewer; no new visual system.
 */

import type { FounderStoryItem } from "./founderGraphSeed";

const DEMO = "/demo";
const ASSET = "/figma-v2/home";
const AVATAR = "/figma-v2/stories/alex.png";

const FRAMES: Array<{ caption: string; media: string }> = [
  { caption: "Rooftop at dusk — the one that still hits", media: `${DEMO}/portrait.jpg` },
  { caption: "Gallery night, second room", media: `${DEMO}/restaurant.jpg` },
  { caption: "Street corn after the show", media: `${DEMO}/food.jpg` },
  { caption: "Blue hour from the terrace", media: `${ASSET}/media-travel-carousel-1728.png` },
  { caption: "Taxi window, rain starting", media: `${DEMO}/portrait.jpg` },
  { caption: "Museum steps, no rush", media: `${DEMO}/restaurant.jpg` },
  { caption: "That mural on the corner", media: `${ASSET}/media-maya.png` },
  { caption: "Late espresso, quiet booth", media: `${DEMO}/food.jpg` },
  { caption: "Market flowers on the walk back", media: `${ASSET}/media-travel-carousel-1728.png` },
  { caption: "Friends table, too many plates", media: `${DEMO}/restaurant.jpg` },
  { caption: "Night bus reflections", media: `${DEMO}/portrait.jpg` },
  { caption: "Bookstore find — still unread", media: `${ASSET}/media-maya.png` },
  { caption: "Sunrise from the cheap seats", media: `${DEMO}/food.jpg` },
  { caption: "Last look before the flight", media: `${ASSET}/media-travel-carousel-1728.png` },
];

/** Exactly 14 Mexico City Trip Graph memories for Alex. */
export const ALEX_MEXICO_TRIP_MEMORIES: FounderStoryItem[] = FRAMES.map((f, i) => ({
  id: `alex-mx-memory-${i + 1}`,
  person: "Alex",
  personInitial: "A",
  avatarSrc: AVATAR,
  mediaSrc: f.media,
  mediaKind: "image" as const,
  caption: f.caption,
  when: `${i + 1}/14`,
  pulseState: "MEMORY" as const,
}));

export function isAlexTripGraphTarget(idOrLabel: string | null | undefined): boolean {
  const s = String(idOrLabel || "");
  return (
    /seed-alex-graph/i.test(s) ||
    /Trip Graph.*Mexico/i.test(s) ||
    /Mexico City.*14 memor/i.test(s) ||
    /14 memor.*Mexico/i.test(s)
  );
}
