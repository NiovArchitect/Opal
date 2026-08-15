/**
 * Pass 20 — Reservation consequence UI inside Shared Reality grammar.
 *
 * Not a booking dashboard. One restrained surface for:
 * availability → authorize → pending → confirmed/failed/held/reconcile/cancel/drift
 *
 * DEVELOPMENT / SYNTHETIC EXECUTION PROOF — live booking not claimed.
 */
import React, { useEffect, useId, useRef } from "react";
import type { ExecutionUxState, HumanCta } from "./reservationExperience";

type Props = {
  state: ExecutionUxState;
  onPrimary?: () => void;
  onSecondary?: () => void;
  onSelectSlot?: (slotId: string) => void;
  onDismissAuth?: () => void;
  /** Escape / Not yet */
  onCancelSheet?: () => void;
  actorIsViewer?: boolean;
  testId?: string;
};

export function ReservationExperience({
  state,
  onPrimary,
  onSecondary,
  onSelectSlot,
  onDismissAuth,
  onCancelSheet,
  actorIsViewer = true,
  testId = "reservation-experience",
}: Props) {
  const titleId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const showAuth = state.phase === "authorize" || state.phase === "cancel_confirm";
  const pending =
    state.phase === "pending" ||
    state.phase === "reconciling" ||
    state.phase === "checking_availability";

  useEffect(() => {
    if (showAuth && confirmRef.current) {
      confirmRef.current.focus();
    }
  }, [showAuth, state.phase]);

  useEffect(() => {
    if (!showAuth) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onDismissAuth?.() || onCancelSheet?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAuth, onDismissAuth, onCancelSheet]);

  if (state.phase === "idle") return null;

  return (
    <section
      className="reservation-experience"
      data-testid={testId}
      data-phase={state.phase}
      data-live-claimed="false"
      data-mode="synthetic_provider"
      data-development-proof="true"
      data-is-payout="false"
      aria-labelledby={showAuth ? titleId : undefined}
      aria-busy={pending || undefined}
      aria-live="polite"
    >
      <p className="reservation-dev-note" data-testid="reservation-dev-proof">
        Development · synthetic reservation proof
      </p>

      {state.consequence ? (
        <p
          className="reservation-consequence"
          data-testid="reservation-consequence"
          data-phase={state.phase}
        >
          {state.consequence}
        </p>
      ) : null}

      {state.phase === "available" && state.slots.length > 0 ? (
        <ul className="reservation-slots" data-testid="reservation-slots" role="listbox" aria-label="Available times">
          {state.slots.map((s) => (
            <li key={s.slotId}>
              <button
                type="button"
                role="option"
                aria-selected={state.selectedSlotId === s.slotId}
                className={
                  state.selectedSlotId === s.slotId
                    ? "reservation-slot is-selected"
                    : "reservation-slot"
                }
                data-testid={`reservation-slot-${s.slotId}`}
                onClick={() => onSelectSlot?.(s.slotId)}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {showAuth ? (
        <div
          className="reservation-auth-sheet"
          data-testid="reservation-auth-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <h2 id={titleId} className="reservation-auth-title">
            {state.phase === "cancel_confirm" ? "Cancel reservation?" : "Confirm reservation"}
          </h2>
          {state.phase === "authorize" && state.authCopy ? (
            <pre className="reservation-auth-copy" data-testid="reservation-auth-copy">
              {state.authCopy}
            </pre>
          ) : (
            <p className="reservation-auth-copy">
              {state.placeName || "This place"} · {state.selectedSlotLabel || state.whenLabel}
            </p>
          )}
          <div className="row-actions reservation-auth-actions">
            <button
              type="button"
              className="btn ghost"
              data-testid="reservation-not-yet"
              onClick={() => onDismissAuth?.() || onCancelSheet?.()}
            >
              {state.phase === "cancel_confirm" ? "Keep it" : "Not yet"}
            </button>
            <button
              ref={confirmRef}
              type="button"
              className="btn primary"
              data-testid={
                state.phase === "cancel_confirm"
                  ? "reservation-confirm-cancel"
                  : "reservation-confirm"
              }
              disabled={state.confirmPending}
              aria-disabled={state.confirmPending || undefined}
              onClick={() => {
                if (state.confirmPending) return;
                onPrimary?.();
              }}
            >
              {state.primaryLabel || (state.phase === "cancel_confirm" ? "Yes, cancel" : "Confirm")}
            </button>
          </div>
        </div>
      ) : null}

      {!showAuth && state.primaryCta !== "none" && state.primaryLabel ? (
        <div className="row-actions reservation-cta-row" data-testid="reservation-cta-row">
          {state.secondaryCta && state.secondaryLabel ? (
            <button
              type="button"
              className="btn ghost"
              data-testid="reservation-secondary-cta"
              data-cta={state.secondaryCta}
              onClick={() => onSecondary?.()}
            >
              {state.secondaryLabel}
            </button>
          ) : null}
          <button
            type="button"
            className="btn journey-cta"
            data-testid="reservation-primary-cta"
            data-cta={state.primaryCta}
            disabled={state.confirmPending || pending}
            aria-disabled={state.confirmPending || pending || undefined}
            onClick={() => {
              if (state.confirmPending || pending) return;
              onPrimary?.();
            }}
          >
            {state.primaryLabel}
          </button>
        </div>
      ) : null}

      {state.phase === "confirmed" && state.sharedSafeSummary && !actorIsViewer ? (
        <p className="reservation-shared-safe" data-testid="reservation-shared-safe">
          {state.sharedSafeSummary}
        </p>
      ) : null}

      {/* Never expose execution ids / TTL / provider_status in product UI */}
      <span hidden data-testid="reservation-no-tech-leak" data-execution-id={state.executionId || ""} />
    </section>
  );
}

export function ctaTestId(cta: HumanCta): string {
  return `reservation-cta-${cta}`;
}
