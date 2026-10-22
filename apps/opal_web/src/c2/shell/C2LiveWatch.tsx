/**
 * Repair #23 (WS-23-3) - THE LIVE WATCH SURFACE, in the C2 shell.
 *
 * Audit F-2: a Live card in Flows was a dead surface - destination-
 * shaped, with no destination. This is the destination. The card
 * fires events.openLive(roomId); the shell mounts this surface in
 * its surface stack (Home never unmounts, so closing returns to
 * Flows at the preserved scroll position - the comments sheet's
 * proven pattern).
 *
 * The surface renders over GET /lives/:id's own contract
 * (LivesController.show -> {"live_room" => LiveRoom.to_contract}).
 * The show contract carries id, host_account_id, venue_id, status,
 * started_at, ended_at, title and the venue object; the visible-
 * lives contract (GET /lives/visible, the read the card itself was
 * built from) enriches the same room with place_label,
 * host_display_name / host_handle and mine. The shell passes the
 * card's own record fields in as the seed, and the normalizer
 * below reads each field from the fetched record first and the
 * seed second - both are the room's own server records; nothing
 * is composed locally and a place is never invented.
 *
 * HONESTY PINS (audit D-M / wiring-plans Section 3):
 * - There is NO join endpoint and NO watcher roster on the
 *   server. "Join" here means entering this viewing room: the
 *   viewer's own presence light stands beside the host's, shown
 *   as self and never counted. No server join write exists and
 *   none is faked; report_presence on the server is
 *   report_host_not_here - a flagging act, NOT a join - and is
 *   not wired here as one.
 * - Presence lights are exactly what the room record carries:
 *   the host, and the viewer. No watcher counts, no roster, no
 *   painted crowd.
 * - NO polling: the room is read once at open (and on an explicit
 *   retry after a failed load). The elapsed clock below is a
 *   local clock over the record's own started_at - it makes no
 *   network calls. If the live ends while this surface is open,
 *   this view does not change on its own, and the surface says
 *   so in its as-of line.
 */
import React, { useEffect, useState } from "react";
import { TopLayer } from "../../opalUi/TopLayer";
import { getLive } from "../../api/productClient";
import { IconClose } from "./bits";
import { avatarOf } from "./shellData";

/** The card record's own fields for the same room, carried by the
 *  shell from the Home projection (itself built from the visible-
 *  lives read). Used only for fields the show contract does not
 *  carry enriched forms of - never as a substitute for the read. */
export type C2LiveWatchSeed = {
  hostName?: string | null;
  placeLabel?: string | null;
  title?: string | null;
  mine?: boolean;
};

export type C2LiveRoom = {
  id: string;
  status: string;
  isLive: boolean;
  title: string;
  hostName: string | null;
  hostUserId: string | null;
  placeLabel: string | null;
  startedAt: string | null;
  endedAt: string | null;
  mine: boolean;
};

function str(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

/** Normalize one live room record (the GET /lives/:id response's
 *  live_room, or the same record nested in a list row) into the
 *  shape this surface renders. Field sources, in read order:
 *  title / status / started_at / ended_at / host_account_id from
 *  the base contract; host name from host_display_name /
 *  host_handle (the visible-lives enrichment) or the seed; place
 *  from place_label (precision-honored by the server) or the
 *  seed, then the show contract's venue display_name / name. */
export function liveRoomFromContract(
  raw: Record<string, unknown> | null | undefined,
  seed?: C2LiveWatchSeed | null,
  viewerUserId?: string | null,
): C2LiveRoom | null {
  if (!raw || typeof raw.id !== "string" || !raw.id) return null;
  const venue =
    raw.venue && typeof raw.venue === "object"
      ? (raw.venue as Record<string, unknown>)
      : {};
  const hostUserId = str(raw.host_account_id);
  const placeLabel =
    str(raw.place_label) ??
    (seed ? str(seed.placeLabel) : null) ??
    str(venue.display_name) ??
    str(venue.name);
  const hostName =
    str(raw.host_display_name) ?? str(raw.host_handle) ?? (seed ? str(seed.hostName) : null);
  const title =
    str(raw.title) ??
    (seed ? str(seed.title) : null) ??
    (placeLabel ? `Live at ${placeLabel}` : "Live");
  const status = str(raw.status) ?? "";
  return {
    id: raw.id,
    status,
    isLive: status === "live",
    title,
    hostName,
    hostUserId,
    placeLabel,
    startedAt: str(raw.started_at),
    endedAt: str(raw.ended_at),
    mine:
      raw.mine === true ||
      seed?.mine === true ||
      Boolean(viewerUserId && hostUserId && viewerUserId === hostUserId),
  };
}

/** A duration in the surface's short form. Whole minutes only -
 *  the room record's stamps carry no finer truth worth showing. */
export function liveDurationLabel(totalMs: number): string {
  const minutes = Math.max(0, Math.floor(totalMs / 60000));
  if (minutes < 1) return "less than a minute";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} hr ${rest} min` : `${hours} hr`;
}

/** Elapsed since the record's own started_at: for a live room,
 *  started_at -> now; for an ended room, started_at -> ended_at
 *  (null when the record carries no ended_at to measure to). */
export function liveElapsedLabel(room: C2LiveRoom, nowMs: number): string | null {
  if (!room.startedAt) return null;
  const start = Date.parse(room.startedAt);
  if (Number.isNaN(start)) return null;
  if (room.isLive) return liveDurationLabel(nowMs - start);
  if (!room.endedAt) return null;
  const end = Date.parse(room.endedAt);
  if (Number.isNaN(end)) return null;
  return liveDurationLabel(end - start);
}

/** The ended time in the reader's own locale, from the record's
 *  ended_at stamp. Unparseable = no line. */
export function liveEndedAtLabel(iso: string | null): string | null {
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

export function C2LiveWatch({
  liveId,
  bearer,
  seed,
  viewerUserId,
  onClose,
}: {
  liveId: string;
  bearer?: string;
  seed?: C2LiveWatchSeed | null;
  viewerUserId?: string | null;
  onClose: () => void;
}) {
  const [room, setRoom] = useState<C2LiveRoom | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const load = async () => {
    try {
      const res = await getLive(liveId, bearer);
      const next = liveRoomFromContract(
        res.live_room as Record<string, unknown>,
        seed,
        viewerUserId,
      );
      if (next) {
        setRoom(next);
        setLoadError(null);
      } else {
        setLoadError("That live did not come back in a shape we can show.");
      }
    } catch {
      setLoadError("That live did not load. Check your connection and try again.");
    }
  };

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const res = await getLive(liveId, bearer);
        if (!live) return;
        const next = liveRoomFromContract(
          res.live_room as Record<string, unknown>,
          seed,
          viewerUserId,
        );
        if (next) {
          setRoom(next);
          setLoadError(null);
        } else {
          setLoadError("That live did not come back in a shape we can show.");
        }
      } catch {
        if (!live) return;
        setLoadError("That live did not load. Check your connection and try again.");
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveId, bearer]);

  // The elapsed clock: a LOCAL timer over the record's own
  // started_at, running only while a live room is on screen. It
  // reads nothing from the network - no polling is introduced.
  useEffect(() => {
    if (!room?.isLive) return;
    const t = window.setInterval(() => setNowMs(Date.now()), 20000);
    return () => window.clearInterval(t);
  }, [room?.isLive]);

  const elapsed = room ? liveElapsedLabel(room, nowMs) : null;
  const endedAt = room ? liveEndedAtLabel(room.endedAt) : null;
  const hostTint = room?.hostName ? avatarOf(room.hostName, 1).tint : undefined;

  return (
    <TopLayer band="sheet">
      <div className="c2s-scrim" onClick={onClose}>
        <div
          className="c2s-sheet c2s-live-watch"
          role="dialog"
          aria-modal="true"
          aria-label={room ? room.title : "Live"}
          data-testid="c2-live-watch"
          data-live-id={liveId}
          data-status={room ? room.status : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="c2s-live-watch-head">
            <p className="c2s-sheet-title" style={{ margin: 0 }}>
              {room?.isLive ? "Watching live" : "Live"}
            </p>
            <span className="c2s-row-spacer" aria-hidden />
            <button
              type="button"
              className="c2s-icon-btn"
              aria-label="Leave this live"
              data-testid="c2-live-watch-close"
              onClick={onClose}
            >
              <IconClose />
            </button>
          </div>

          {loadError ? (
            <div data-testid="c2-live-watch-error">
              <p className="c2s-card-line" role="alert">
                {loadError}
              </p>
              <button type="button" className="c2s-btn-text" onClick={() => void load()}>
                Try again
              </button>
            </div>
          ) : room === null ? (
            <p className="c2s-card-line" data-testid="c2-live-watch-loading">
              Loading.
            </p>
          ) : room.isLive ? (
            <>
              <span className="c2s-live-pill" data-testid="c2-live-watch-pill">
                <span className="c2s-live-dot" aria-hidden />
                Live now
              </span>
              <p className="c2s-card-title" data-testid="c2-live-watch-title">
                {room.title}
              </p>
              {room.mine ? (
                <p className="c2s-card-line" data-testid="c2-live-watch-host">
                  You are hosting this live
                </p>
              ) : room.hostName ? (
                <p className="c2s-card-line" data-testid="c2-live-watch-host">
                  {room.hostName} is hosting
                </p>
              ) : null}
              {room.placeLabel ? (
                <p className="c2s-card-line" data-testid="c2-live-watch-place">
                  At {room.placeLabel}
                </p>
              ) : null}
              {elapsed ? (
                <p className="c2s-card-line" data-testid="c2-live-watch-elapsed">
                  {elapsed} in
                </p>
              ) : null}
              {/* Presence, exactly as the room record carries it:
                  the host's light, and the viewer's own light
                  beside it - entering this room is what "join"
                  means in this wave (see the header pins). The
                  viewer's light is their presence shown as self;
                  it is never counted, and no other light is
                  painted because the server carries no roster. */}
              <div className="c2s-live-presence" data-testid="c2-live-watch-presence">
                <span
                  className="c2s-live-light"
                  data-testid="c2-live-watch-host-light"
                  data-tint={hostTint ?? undefined}
                  data-mine={room.mine ? "1" : undefined}
                  role="img"
                  aria-label={`${room.hostName ?? "The host"} is here`}
                />
                {room.mine ? null : (
                  <span
                    className="c2s-live-light"
                    data-testid="c2-live-watch-self-light"
                    role="img"
                    aria-label="You are here"
                  />
                )}
                <span className="c2s-card-line">You are here</span>
              </div>
              <p className="c2s-card-line" data-testid="c2-live-watch-asof">
                Shown as of when you opened this room - it does not refresh while you
                watch.
              </p>
            </>
          ) : (
            <div data-testid="c2-live-watch-ended">
              <p className="c2s-card-title" data-testid="c2-live-watch-ended-line">
                {room.status === "ended"
                  ? "This live has ended."
                  : "This live is no longer live."}
              </p>
              <p className="c2s-card-line" data-testid="c2-live-watch-title">
                {room.title}
              </p>
              {room.hostName ? (
                <p className="c2s-card-line" data-testid="c2-live-watch-host">
                  Hosted by {room.hostName}
                </p>
              ) : null}
              {room.placeLabel ? (
                <p className="c2s-card-line" data-testid="c2-live-watch-place">
                  At {room.placeLabel}
                </p>
              ) : null}
              {elapsed ? (
                <p className="c2s-card-line" data-testid="c2-live-watch-duration">
                  Ran {elapsed}
                </p>
              ) : null}
              {endedAt ? (
                <p className="c2s-card-line" data-testid="c2-live-watch-ended-at">
                  Ended {endedAt}
                </p>
              ) : null}
              <p className="c2s-card-line">
                Its state was read from the room record when you opened it.
              </p>
            </div>
          )}
        </div>
      </div>
    </TopLayer>
  );
}
