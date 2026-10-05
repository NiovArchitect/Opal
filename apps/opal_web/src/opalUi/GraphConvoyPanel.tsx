/**
 * Graph detail — I'm on the way + geometric ETA + convoy.
 * Location share is opt-in per graph. Broadcast via LiveExperience when wired.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  bestTimeToLeave,
  buildJuniperConvoyFixture,
  FOUNDER_ORIGIN_FIXTURE,
  formatClock,
  geometricEta,
  JUNIPER_VENUE,
  juniperReservationTonight,
  sortConvoyByArrival,
  youdArrive,
  type ConvoyMember,
  type LatLng,
} from "./graphConvoyEta";
import type { TravelState } from "./journeyPresence";

type Props = {
  graphId: string;
  graphName: string;
  ledBy?: string;
  partySize?: number;
  reservationLabel?: string;
  venue?: LatLng;
  origin?: LatLng;
  initialMembers?: ConvoyMember[];
  /** Push arrival_state via conversation LiveExperience. */
  onBroadcastArrival?: (state: TravelState) => void | Promise<void>;
  /** Push ETA envelope while en route + sharing. */
  onBroadcastEta?: (payload: {
    arrivalWindowLabel: string;
    durationMinutes: number;
  }) => void | Promise<void>;
};

export function GraphConvoyPanel({
  graphId,
  graphName,
  ledBy = "Chanelle",
  partySize = 4,
  reservationLabel,
  venue = JUNIPER_VENUE,
  origin = FOUNDER_ORIGIN_FIXTURE,
  initialMembers,
  onBroadcastArrival,
  onBroadcastEta,
}: Props) {
  const [shareEta, setShareEta] = useState(false);
  const [myState, setMyState] = useState<TravelState>("not_started");
  const [onTheWayAt, setOnTheWayAt] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [members, setMembers] = useState<ConvoyMember[]>(
    () => initialMembers || buildJuniperConvoyFixture(),
  );

  const reservation = useMemo(() => juniperReservationTonight(now), [now]);
  const eta = useMemo(() => geometricEta(origin, venue), [origin, venue]);
  const leaveBy = useMemo(
    () => bestTimeToLeave(reservation, eta.durationMinutes),
    [reservation, eta.durationMinutes],
  );
  const arriveAt = useMemo(() => youdArrive(now, eta.durationMinutes), [now, eta.durationMinutes]);
  const goingCount = members.filter((m) => m.travelState !== "left").length;
  const reservationCopy =
    reservationLabel || `${formatClock(reservation)} · Table for ${partySize}`;

  // Refresh clock / ETA every 2 minutes while en route.
  useEffect(() => {
    if (myState !== "on_the_way") return;
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 120_000);
    return () => window.clearInterval(id);
  }, [myState]);

  // Broadcast geometric ETA while sharing + en route.
  useEffect(() => {
    if (myState !== "on_the_way" || !shareEta) return;
    const label = `Arrives ${formatClock(arriveAt)}`;
    void onBroadcastEta?.({
      arrivalWindowLabel: label,
      durationMinutes: eta.durationMinutes,
    });
  }, [myState, shareEta, arriveAt, eta.durationMinutes, onBroadcastEta, now]);

  const convoyRows = useMemo(() => {
    const self: ConvoyMember = {
      userId: "self",
      displayName: "You",
      travelState: myState,
      shareMode: shareEta ? "eta" : "none",
      arrivesAt: myState === "on_the_way" && shareEta ? arriveAt.toISOString() : null,
      minutesAway: myState === "on_the_way" && shareEta ? eta.durationMinutes : null,
      arrivedAt: myState === "arrived" ? onTheWayAt : null,
      avatarTone: "#00E5FF",
    };
    return sortConvoyByArrival([...members.filter((m) => m.userId !== "self"), self], now);
  }, [members, myState, shareEta, arriveAt, eta.durationMinutes, onTheWayAt, now]);

  const markOnTheWay = () => {
    const ts = new Date().toISOString();
    setMyState("on_the_way");
    setOnTheWayAt(ts);
    if (!shareEta) setShareEta(true);
    void onBroadcastArrival?.("on_the_way");
  };

  return (
    <section
      className="graph-convoy"
      data-testid="graph-convoy-panel"
      data-graph-id={graphId}
      data-estimate-class="geometric_estimate"
      data-traffic-aware="false"
    >
      <div className="graph-convoy-lead">
        <p className="graph-convoy-led-by" data-testid="graph-convoy-led-by">
          Led by {ledBy}
        </p>
        <div className="graph-convoy-who" data-testid="graph-convoy-who">
          <div className="graph-convoy-avatars" aria-hidden>
            {members.slice(0, 4).map((m) => (
              <span
                key={m.userId}
                className="graph-convoy-avatar"
                style={m.avatarTone ? { background: m.avatarTone } : undefined}
              >
                {m.displayName.slice(0, 1)}
              </span>
            ))}
          </div>
          <span className="graph-convoy-going-count">
            {Math.min(goingCount, partySize)} of {partySize} going
          </span>
        </div>
      </div>

      <button
        type="button"
        className={`graph-on-the-way ${myState === "on_the_way" || myState === "arrived" ? "is-on" : ""}`}
        data-testid="graph-im-on-the-way"
        data-travel-state={myState}
        disabled={myState === "on_the_way" || myState === "arrived"}
        onClick={markOnTheWay}
      >
        {myState === "on_the_way" || myState === "arrived" ? "On the way ✓" : "I'm on the way"}
      </button>

      <label className="graph-share-eta" data-testid="graph-share-eta-toggle">
        <input
          type="checkbox"
          checked={shareEta}
          onChange={(e) => setShareEta(e.target.checked)}
          data-testid="graph-share-eta-input"
        />
        <span>Share my ETA for this event</span>
      </label>

      <div className="graph-eta-section" data-testid="graph-eta-section">
        <p className="graph-ready-kicker">Your ETA</p>
        <p className="graph-exec-line" data-testid="graph-your-eta">
          ~{eta.durationMinutes} min · geometric estimate
        </p>
        <p className="gsh-meta" data-testid="graph-eta-honesty">
          Distance-based estimate — not live traffic.
        </p>
        <p className="graph-exec-line" data-testid="graph-best-leave">
          Best time to leave · {formatClock(leaveBy)}
        </p>
        <p className="graph-exec-line" data-testid="graph-reservation">
          Reservation · {reservationCopy}
        </p>
        <p className="graph-exec-line" data-testid="graph-youd-arrive">
          You&apos;d arrive · {formatClock(arriveAt)}
        </p>
      </div>

      <div className="graph-convoy-list" data-testid="graph-convoy-list">
        <p className="graph-ready-kicker">Convoy</p>
        <ul>
          {convoyRows.map((row) => (
            <li
              key={row.userId}
              className="graph-convoy-row"
              data-testid={`graph-convoy-row-${row.userId}`}
              data-travel-state={row.travelState}
              data-location={row.location}
            >
              {row.line}
            </li>
          ))}
        </ul>
      </div>

      <p className="gsh-meta graph-convoy-graph-name" data-testid="graph-convoy-name">
        {graphName}
      </p>
    </section>
  );
}
