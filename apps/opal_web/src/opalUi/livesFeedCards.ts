import type { FounderFeedCard } from "./founderGraphSeed";

/** Map Paste K visible LiveRoom contracts → Home live cards (immediacy, not livestream). */
export function liveRoomsToFeedCards(
  lives: Array<{ live_room?: Record<string, unknown> } | Record<string, unknown>>,
  opts?: { excludeMine?: boolean; selfUserId?: string | null },
): FounderFeedCard[] {
  const out: FounderFeedCard[] = [];
  for (const row of lives || []) {
    const room = (
      row && typeof row === "object" && "live_room" in row
        ? (row as { live_room: Record<string, unknown> }).live_room
        : row
    ) as Record<string, unknown> | undefined;
    if (!room || typeof room.id !== "string") continue;
    if (room.status && room.status !== "live") continue;
    const hostId = typeof room.host_account_id === "string" ? room.host_account_id : null;
    if (opts?.excludeMine && opts.selfUserId && hostId === opts.selfUserId) continue;
    if (opts?.excludeMine && room.mine === true) continue;

    const venue = (room.venue || {}) as Record<string, unknown>;
    const placeLabel =
      (typeof room.place_label === "string" && room.place_label) ||
      (typeof venue.display_name === "string" && venue.display_name) ||
      (typeof venue.name === "string" && venue.name) ||
      (typeof room.title === "string" && room.title) ||
      "Somewhere nearby";
    const person =
      (typeof room.host_display_name === "string" && room.host_display_name) ||
      (typeof room.host_handle === "string" && room.host_handle) ||
      "Friend";
    const initial = person.trim().slice(0, 1).toUpperCase() || "L";
    const precision =
      typeof room.location_precision === "string" ? room.location_precision : "venue";
    const audience = typeof room.audience === "string" ? room.audience : "friends";

    out.push({
      id: `live-room-${room.id}`,
      kind: "live",
      person,
      personInitial: initial,
      when: "now",
      createdAt:
        typeof room.started_at === "string" ? room.started_at : new Date().toISOString(),
      title: placeLabel,
      detail: `${person} is Live`,
      caption: placeLabel,
      meta:
        precision === "area"
          ? `Area presence · ${audience === "close_circle" ? "close circle" : "friends"}`
          : `At ${placeLabel}`,
      placeLine: placeLabel,
      broadcaster: person,
      host: person,
      videoLive: false,
      happeningNow: true,
      goingCount: 0,
      likeCount: 0,
      commentCount: 0,
      repostCount: 0,
      relationshipLabel: "Live now",
      cta: "Open Live",
      ctaAction: "open_live",
    });
  }
  return out;
}
