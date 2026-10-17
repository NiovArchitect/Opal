/**
 * Graph detail - I'm on the way + geometric ETA + convoy.
 * Location share is opt-in per graph. Broadcast via LiveExperience when wired.
 *
 * Repair #18 (F18-01): attendance renders ONLY from the backend contract
 * counts handed to this panel (goingCount / totalCount, the same fields the
 * canonical GraphDetailSheet branch renders). This panel never counts a
 * roster, never defaults to a fixture roster, and never invents a party
 * size: absent contract counts render no count at all, and absent real
 * participants render no roster at all (honest absence).
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  bestTimeToLeave,
  formatClock,
  geometricEta,
  sortConvoyByArrival,
  youdArrive,
  type ConvoyMember,
  type LatLng,
} from "./graphConvoyEta";
import { planAttendanceLabel } from "./nextPlan";
import type { TravelState } from "./journeyPresence";

type Props = {
  graphId: string;
  graphName: string;
  /** Real organizer/lead display name when a surface actually carries one. */
  ledBy?: string;
  /**
   * The ONE attendance contract, from the plan projection. Both counts
   * must be present for a count line to render; otherwise no count.
   */
  goingCount?: number | null;
  totalCount?: number | null;
  viewerState?: string | null;
  /**
   * Real plan participant display names from the contract/projection.
   * When present (and no travel members are supplied) these are the
   * roster: names and avatar initials only, no invented travel status.
   */
  participants?: string[] | null;
  /** Reservation copy only when a real surface carries it. */
  reservationLabel?: string;
  /** Real reservation instant (ISO) for the best-time-to-leave line. */
  reservationAt?: string | null;
  /** Real destination coordinates; the ETA section stays off without them. */
  venue?: LatLng;
  /** Real origin coordinates; the ETA section stays off without them. */
  origin?: LatLng;
  /** Real travel-presence rows when a caller actually has them. */
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
  ledBy,
  goingCount,
  totalCount,
  viewerState,
  participants,
  reservationLabel,
  reservationAt,
  venue,
  origin,
  initialMembers,
  onBroadcastArrival,
  onBroadcastEta,
}: Props) {
  const [shareEta, setShareEta] = useState(false);
  const [myState, setMyState] = useState<TravelState>("not_started");
  const [onTheWayAt, setOnTheWayAt] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [members, setMembers] = useState<ConvoyMember[]>(() => initialMembers || []);

  // Attendance comes from the contract or nowhere. It is never derived
  // from the roster below (travel state is not an RSVP).
  const attendanceLabel = planAttendanceLabel({ goingCount, totalCount });
  const participantNames = useMemo(
    () => (participants || []).map((name) => name.trim()).filter(Boolean),
    [participants],
  );
  const hasTravelRows = members.length > 0;
  const rosterNames = hasTravelRows ? members.map((m) => m.displayName) : participantNames;

  const eta = useMemo(
    () => (venue && origin ? geometricEta(origin, venue) : null),
    [origin, venue],
  );
  const reservation = useMemo(() => {
    if (!reservationAt) return null;
    const parsed = new Date(reservationAt);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [reservationAt]);
  const leaveBy = useMemo(
    () =>
      reservation && eta ? bestTimeToLeave(reservation, eta.durationMinutes) : null,
    [reservation, eta],
  );
  const arriveAt = useMemo(
    () => (eta ? youdArrive(now, eta.durationMinutes) : null),
    [now, eta],
  );

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
    if (myState !== "on_the_way" || !shareEta || !eta || !arriveAt) return;
    const label = `Arrives ${formatClock(arriveAt)}`;
    void onBroadcastEta?.({
      arrivalWindowLabel: label,
      durationMinutes: eta.durationMinutes,
    });
  }, [myState, shareEta, arriveAt, eta, onBroadcastEta, now]);

  const convoyRows = useMemo(() => {
    if (!hasTravelRows) return [];
    const self: ConvoyMember = {
      userId: "self",
      displayName: "You",
      travelState: myState,
      shareMode: shareEta ? "eta" : "none",
      arrivesAt:
        myState === "on_the_way" && shareEta && arriveAt ? arriveAt.toISOString() : null,
      minutesAway: myState === "on_the_way" && shareEta && eta ? eta.durationMinutes : null,
      arrivedAt: myState === "arrived" ? onTheWayAt : null,
      avatarTone: "#00E5FF",
    };
    return sortConvoyByArrival([...members.filter((m) => m.userId !== "self"), self], now);
  }, [members, hasTravelRows, myState, shareEta, arriveAt, eta, onTheWayAt, now]);

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
        {ledBy ? (
          <p className="graph-convoy-led-by" data-testid="graph-convoy-led-by">
            Led by {ledBy}
          </p>
        ) : null}
        {attendanceLabel || rosterNames.length ? (
          <div className="graph-convoy-who" data-testid="graph-convoy-who">
            {rosterNames.length ? (
              <div className="graph-convoy-avatars" aria-hidden>
                {rosterNames.slice(0, 4).map((name, index) => {
                  const member = hasTravelRows ? members[index] : undefined;
                  return (
                    <span
                      key={`${name}-${index}`}
                      className="graph-convoy-avatar"
                      style={member?.avatarTone ? { background: member.avatarTone } : undefined}
                    >
                      {name.slice(0, 1)}
                    </span>
                  );
                })}
              </div>
            ) : null}
            {attendanceLabel ? (
              <span
                className="graph-convoy-going-count"
                data-testid="graph-convoy-going-count"
                data-viewer-state={viewerState || undefined}
              >
                {attendanceLabel}
              </span>
            ) : null}
          </div>
        ) : null}
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

      {eta && arriveAt ? (
        <div className="graph-eta-section" data-testid="graph-eta-section">
          <p className="graph-ready-kicker">Your ETA</p>
          <p className="graph-exec-line" data-testid="graph-your-eta">
            ~{eta.durationMinutes} min · geometric estimate
          </p>
          <p className="gsh-meta" data-testid="graph-eta-honesty">
            Distance-based estimate - not live traffic.
          </p>
          {leaveBy ? (
            <p className="graph-exec-line" data-testid="graph-best-leave">
              Best time to leave · {formatClock(leaveBy)}
            </p>
          ) : null}
          {reservationLabel ? (
            <p className="graph-exec-line" data-testid="graph-reservation">
              Reservation · {reservationLabel}
            </p>
          ) : null}
          <p className="graph-exec-line" data-testid="graph-youd-arrive">
            You&apos;d arrive · {formatClock(arriveAt)}
          </p>
        </div>
      ) : null}

      {hasTravelRows ? (
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
      ) : participantNames.length ? (
        <div className="graph-convoy-list" data-testid="graph-convoy-list">
          <p className="graph-ready-kicker">Convoy</p>
          <ul>
            {participantNames.map((name, index) => (
              <li
                key={`${name}-${index}`}
                className="graph-convoy-row"
                data-testid={`graph-convoy-row-participant-${index}`}
              >
                {name}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="gsh-meta graph-convoy-graph-name" data-testid="graph-convoy-name">
        {graphName}
      </p>
    </section>
  );
}
