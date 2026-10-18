/**
 * Repair #18 integration wiring - the B45 care destination in the
 * YOU hub (B45 report hand-off: the CareRotationView and
 * HouseholdPodView were built as pure renderers of the care/pod
 * contracts and left unwired for Division C layout integration).
 *
 * This destination renders ONLY real client data through careClient:
 * the account's care rotations (listCareRotations) and household
 * pods (listHouseholds). The views render their contracts verbatim;
 * the actions wire to the real endpoints (complete / pass a check-in,
 * accept a pod invitation, set the primary pod, accept the supply
 * plan) and the destination re-reads after every action, so what is
 * on screen is always the returned contract, never a local guess.
 * A failed read renders one honest error line; an empty account
 * renders the honest empty lines. No new styling system: the shell's
 * C2 tokens and row/card classes only.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  acceptHousehold,
  acceptSupplyPlan,
  completeCheckIn,
  listCareRotations,
  listHouseholds,
  passCheckIn,
  setPrimaryHousehold,
  type CareRotation,
  type Household,
} from "../../care/careClient";
import { CareRotationView } from "../../care/CareRotationView";
import { HouseholdPodView } from "../../care/HouseholdPodView";
import { EmptyBlock, IconBack } from "./bits";

export function CareDestination({
  onBack,
  nonce = 0,
}: {
  onBack: () => void;
  nonce?: number;
}) {
  const [rotations, setRotations] = useState<CareRotation[] | null>(null);
  const [pods, setPods] = useState<Household[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const [nextRotations, nextPods] = await Promise.all([
        listCareRotations(),
        listHouseholds(),
      ]);
      setRotations(nextRotations);
      setPods(nextPods);
      setError(null);
    } catch {
      setRotations([]);
      setPods([]);
      setError("Care and household could not load. Head back and try again.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, reloadKey, nonce]);

  const afterAction = useCallback(async (run: () => Promise<unknown>) => {
    try {
      await run();
    } catch {
      setError("That did not save. The list below is the last saved state.");
    } finally {
      setReloadKey((n) => n + 1);
    }
  }, []);

  // The contracts name people by user id; the care client carries no
  // name directory, so the views receive an empty map and render
  // their own honest fallbacks ("A member" / "Member").
  const names: Record<string, string> = {};

  return (
    <div data-testid="c2-care">
      <header className="c2s-header">
        <button
          type="button"
          className="c2s-icon-btn"
          aria-label="Back to You"
          data-testid="c2-care-back"
          onClick={onBack}
        >
          <IconBack />
        </button>
        <h1 className="c2s-header-title" style={{ fontSize: 20 }}>
          Care and household
        </h1>
      </header>
      <div className="c2s-scroll">
        <p className="c2s-lede" style={{ marginTop: "var(--space-4)" }}>
          Who you check in on, and the household your plans start from.
        </p>
        {error ? (
          <p className="c2s-error-line" role="alert">
            {error}
          </p>
        ) : null}
        {rotations === null || pods === null ? (
          <EmptyBlock headline="Loading." line="One moment." />
        ) : (
          <>
            <div data-testid="c2-care-rotations">
              {rotations.length === 0 ? (
                <EmptyBlock
                  headline="No care rotations yet."
                  line="When you share checking in on someone, the rotation lives here."
                />
              ) : (
                rotations.map((rotation) => (
                  <div
                    key={rotation.id}
                    className="c2s-card"
                    style={{ marginBottom: "var(--space-3)" }}
                  >
                    <CareRotationView
                      rotation={rotation}
                      names={names}
                      onComplete={(checkIn) =>
                        void afterAction(() =>
                          completeCheckIn(rotation.id, checkIn.occurrence_key),
                        )
                      }
                      onPass={(checkIn) =>
                        void afterAction(() =>
                          passCheckIn(rotation.id, checkIn.occurrence_key),
                        )
                      }
                    />
                  </div>
                ))
              )}
            </div>
            <div data-testid="c2-care-pods" style={{ marginTop: "var(--space-5)" }}>
              {pods.length === 0 ? (
                <EmptyBlock
                  headline="No household yet."
                  line="A household is a group you declare - it is never guessed from an address."
                />
              ) : (
                pods.map((pod) => (
                  <div
                    key={pod.id}
                    className="c2s-card"
                    style={{ marginBottom: "var(--space-3)" }}
                  >
                    <HouseholdPodView
                      pod={pod}
                      names={names}
                      onAccept={() => void afterAction(() => acceptHousehold(pod.id))}
                      onSetPrimary={() =>
                        void afterAction(() => setPrimaryHousehold(pod.id))
                      }
                      onAcceptSupply={() =>
                        void afterAction(() => acceptSupplyPlan(pod.id))
                      }
                    />
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
