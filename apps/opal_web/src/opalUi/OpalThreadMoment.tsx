/**
 * Quiet thread-anchored Opal marker for history.
 * LIVE may still breathe; HISTORICAL is static and dim.
 * Does not compete with the single active intervention.
 */
import React from "react";
import type { ThreadOpalMoment } from "./threadHistory";

type Props = {
  moment: ThreadOpalMoment;
};

export function OpalThreadMoment({ moment }: Props) {
  return (
    <div
      className={`opal-thread-moment age-${moment.age} kind-${moment.kind}`}
      data-testid="opal-thread-moment"
      data-age={moment.age}
      data-kind={moment.kind}
      role="status"
    >
      <span className="opal-thread-moment-mark" aria-hidden>
        ◈
      </span>
      <span className="opal-thread-moment-label">{moment.label}</span>
      {moment.detail ? (
        <span className="opal-thread-moment-detail">{moment.detail}</span>
      ) : null}
    </div>
  );
}
