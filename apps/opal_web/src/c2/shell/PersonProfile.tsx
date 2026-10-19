/**
 * Repair #19 W13 - USER PROFILE (person profile), recreated in the
 * new design. Replaces the legacy ContactProfileSheet on the
 * integrated path (MERGED disposition in the W13 inventory).
 *
 * Journey (Apple discipline): you are talking to someone; you tap
 * their name; one quiet sheet answers who they are, how you know
 * them, and what you have coming up together - then one doorway to
 * the memory controls that govern what Opal holds about people.
 * Restraint law: absent facts render nothing (no handle, no
 * relationship, no next plan -> no row), and there are no buttons
 * without a real action behind them. Message is real because the
 * thread is open behind this sheet; memory controls are real
 * because the host routes to the You > What Opal remembers room.
 */
import React from "react";
import { TopLayer } from "../../opalUi/TopLayer";
import { PlanStatePillC2 } from "../PlanCardC2";
import { Avatar } from "./bits";
import type { PersonProfileProjection } from "./projections";

export function PersonProfileSheet({
  profile,
  onClose,
  onMessage,
  onOpenMemoryControls,
}: {
  profile: PersonProfileProjection;
  onClose: () => void;
  onMessage?: () => void;
  onOpenMemoryControls?: () => void;
}) {
  return (
    <TopLayer band="sheet">
      <div className="c2s-scrim" onClick={onClose}>
        <div
          className="c2s-sheet r19-profile-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={`${profile.name} profile`}
          data-testid="r19-person-profile"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="r19-profile-hero">
            <Avatar avatar={profile.avatar} size={72} />
            <h2 className="r19-profile-name" data-testid="r19-profile-name">
              {profile.name}
            </h2>
            {profile.handle ? (
              <p className="c2s-card-line" data-testid="r19-profile-handle">
                @{profile.handle.replace(/^@/, "")}
              </p>
            ) : null}
            {profile.relationshipLabel ? (
              <p className="c2s-card-line" data-testid="r19-profile-relationship">
                {profile.relationshipLabel}
              </p>
            ) : null}
          </div>

          {profile.nextTogether ? (
            <div className="r19-profile-section" data-testid="r19-profile-next">
              <p className="c2s-detail-kicker">Next together</p>
              <div className="r19-profile-next-row">
                <PlanStatePillC2
                  stateFamily={profile.nextTogether.stateFamily}
                  stateLabel={profile.nextTogether.stateLabel}
                />
                <div>
                  <p className="c2s-card-title">{profile.nextTogether.title}</p>
                  <p className="c2s-card-line">{profile.nextTogether.whenLine}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="r19-profile-actions">
            {onMessage ? (
              <button
                type="button"
                className="c2s-btn-primary"
                data-testid="r19-profile-message"
                onClick={onMessage}
              >
                Message
              </button>
            ) : null}
            {onOpenMemoryControls ? (
              <button
                type="button"
                className="c2s-btn-text"
                data-testid="r19-profile-memory"
                onClick={onOpenMemoryControls}
              >
                What Opal remembers
              </button>
            ) : null}
            <button type="button" className="c2s-btn-text" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </TopLayer>
  );
}
