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
 * Repair #23 (WS-23-4): Follow is real the same way - it rides
 * the FollowGraph endpoints only, reads its state from the
 * server on open, and re-renders from each write's response.
 */
import React, { useEffect, useState } from "react";
import { TopLayer } from "../../opalUi/TopLayer";
import { PlanStatePillC2 } from "../PlanCardC2";
import { followStatus, followUser, unfollowUser } from "../../api/productClient";
import { Avatar } from "./bits";
import type { PersonProfileProjection } from "./projections";
import {
  RelationshipPickerSheet,
  type RelationshipSave,
} from "./RelationshipPicker";

export function PersonProfileSheet({
  profile,
  onClose,
  onMessage,
  onOpenMemoryControls,
  onOpenBond,
  onSaveRelationship,
  follow,
}: {
  profile: PersonProfileProjection;
  onClose: () => void;
  onMessage?: () => void;
  onOpenMemoryControls?: () => void;
  /** Repair #23 (WS-23-4) - the follow leg, supplied by the host
   *  when it holds a session and this profile is one person. A
   *  follow is a durable FollowGraph edge: it is NOT friendship
   *  and it grants NO friend visibility (the FollowController's
   *  own contract: follow_is_not_friend,
   *  grants_friend_visibility = false), so the control says
   *  Follow / Following and nothing more - no word on this sheet
   *  implies the follow makes you friends or lets them see
   *  anything. Absent = no control renders (no dead control). */
  follow?: { userId: string; bearer?: string };
  /** Repair #21 (W-12): the door to the pair's shared stone,
   *  supplied by the host when it can open the bond. Absent = no
   *  door renders (no dead control). */
  onOpenBond?: () => void;
  /** Repair #19 W24 (DL-01) — the ONE relationship write, supplied
   *  by the host when it holds a session. Absent = the
   *  identification row does not render (no dead control). */
  onSaveRelationship?: RelationshipSave;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  // Repair #23 (WS-23-4) - follow state is the SERVER's, read
  // from followStatus on open (and on every re-open: this sheet
  // remounts per open, so no local memory can outlive a close)
  // and re-rendered FROM THE RESPONSE on every toggle - the
  // DiscoveryRow's proven pattern. null = not yet read: the
  // control renders nothing until the status lands, so it can
  // never paint a state the server has not confirmed. A failed
  // read or write changes nothing on screen.
  const [following, setFollowing] = useState<boolean | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const followUserId = follow?.userId;
  const followBearer = follow?.bearer;
  useEffect(() => {
    if (!followUserId) return;
    let live = true;
    setFollowing(null);
    void (async () => {
      try {
        const res = await followStatus(followUserId, followBearer);
        if (live) setFollowing(res.following === true);
      } catch {
        /* no confirmed state, no control - the sheet keeps the
         * server's last truth, which here is silence */
      }
    })();
    return () => {
      live = false;
    };
  }, [followUserId, followBearer]);
  const toggleFollow = async () => {
    if (!followUserId || following === null || followBusy) return;
    setFollowBusy(true);
    try {
      const res = following
        ? await unfollowUser(followUserId, followBearer)
        : await followUser(followUserId, followBearer);
      setFollowing(res.following === true);
    } catch {
      /* the control keeps the server's last truth */
    } finally {
      setFollowBusy(false);
    }
  };
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
            {profile.closeCircle ? (
              <p className="c2s-card-line" data-testid="r19-profile-close-circle">
                In your close circle
              </p>
            ) : null}
          </div>

          {onSaveRelationship && profile.personId ? (
            <div className="r19-profile-section" data-testid="r19-profile-identify">
              <p className="c2s-detail-kicker">Who they are to you</p>
              <button
                type="button"
                className="c2s-sheet-row"
                data-testid="r19-profile-identify-row"
                onClick={() => setPickerOpen(true)}
              >
                <span>
                  {profile.relationshipLabel ?? "How do you know them?"}
                  <small>
                    {profile.relationshipLabel
                      ? "Tap to change"
                      : "Say who they are to you"}
                  </small>
                </span>
              </button>
            </div>
          ) : null}

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
            {follow && following !== null ? (
              <button
                type="button"
                className="c2s-btn-text"
                data-testid="r23-profile-follow"
                aria-pressed={following}
                disabled={followBusy}
                onClick={() => void toggleFollow()}
              >
                {following ? "Following" : "Follow"}
              </button>
            ) : null}
            {onOpenBond ? (
              <button
                type="button"
                className="c2s-btn-text"
                data-testid="r19-profile-bond"
                onClick={onOpenBond}
              >
                Our stone
              </button>
            ) : null}
            {onOpenMemoryControls ? (
              <>
                <button
                  type="button"
                  className="c2s-btn-text"
                  data-testid="r19-profile-memory"
                  onClick={onOpenMemoryControls}
                >
                  What Opal remembers
                </button>
                {/* P6 clarity: the doorway names what it opens - the
                 * viewer's own memory controls (what Opal keeps, and
                 * forgetting it), not a per-person record. */}
                <p className="c2s-card-line" data-testid="r19-profile-memory-note">
                  Your memory controls - what Opal keeps, and forgetting it.
                </p>
              </>
            ) : null}
            <button type="button" className="c2s-btn-text" onClick={onClose}>
              Done
            </button>
          </div>
          {pickerOpen && onSaveRelationship ? (
            <RelationshipPickerSheet
              personName={profile.name}
              currentType={profile.relationshipType}
              currentFamilySubtype={profile.familySubtype}
              currentFamilyMinor={profile.familyMinor}
              currentAgeBand={profile.ageBand}
              onSave={onSaveRelationship}
              onClose={() => setPickerOpen(false)}
            />
          ) : null}
        </div>
      </div>
    </TopLayer>
  );
}
