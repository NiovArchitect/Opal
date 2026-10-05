/**
 * Phase 1E: first-run act-on-behalf opt-in (after fr09, before app).
 * Reuses 1D you-settings-row / toggle styles. Defaults OFF. No messaging_business.
 */
import React, { useState } from "react";
import { BRAND_ASSETS } from "../brand/brand";
import {
  grantConsent,
  type ConsentCapability,
  type ProductSession,
} from "../api/productClient";
import { defaultConsentExpiresAt } from "../opalUi/YouSettingsDestination";
import { FR_COPY } from "./firstRunCopy";

export type ActOnBehalfOptInChoice = {
  calls_outbound: boolean;
  bookings_reserve: boolean;
};

export const ACT_ON_BEHALF_OPT_IN_ROWS: Array<{
  id: ConsentCapability;
  title: string;
  description: string;
}> = [
  {
    id: "calls_outbound",
    title: FR_COPY.actOnBehalfCallsTitle,
    description: FR_COPY.actOnBehalfCallsBody,
  },
  {
    id: "bookings_reserve",
    title: FR_COPY.actOnBehalfBookingsTitle,
    description: FR_COPY.actOnBehalfBookingsBody,
  },
];

type Props = {
  session: ProductSession | null;
  busy?: boolean;
  onContinue: (granted: ConsentCapability[]) => void;
  onSkip: () => void;
  /** Injected for tests; defaults to productClient.grantConsent. */
  grantFn?: typeof grantConsent;
};

/**
 * Grant selected capabilities (1 year expiry). Failures log and continue.
 * Returns the list of capabilities that succeeded.
 */
export async function grantActOnBehalfOptIns(
  choices: ActOnBehalfOptInChoice,
  session: ProductSession | null,
  grantFn: typeof grantConsent = grantConsent,
): Promise<ConsentCapability[]> {
  const selected: ConsentCapability[] = [];
  if (choices.calls_outbound) selected.push("calls_outbound");
  if (choices.bookings_reserve) selected.push("bookings_reserve");
  if (selected.length === 0) return [];

  const expires_at = defaultConsentExpiresAt();
  const granted: ConsentCapability[] = [];

  for (const capability of selected) {
    try {
      await grantFn({ capability, expires_at }, session?.access_token);
      granted.push(capability);
    } catch (err) {
      console.warn("[opal] act-on-behalf opt-in grant failed", capability, err);
    }
  }

  return granted;
}

export function ActOnBehalfOptInStep({
  session,
  busy = false,
  onContinue,
  onSkip,
  grantFn = grantConsent,
}: Props) {
  const [callsOn, setCallsOn] = useState(false);
  const [bookingsOn, setBookingsOn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const locked = busy || submitting;

  const toggles: Record<ConsentCapability, boolean> = {
    calls_outbound: callsOn,
    bookings_reserve: bookingsOn,
    messaging_business: false,
  };

  const setToggle = (id: ConsentCapability, next: boolean) => {
    if (id === "calls_outbound") setCallsOn(next);
    if (id === "bookings_reserve") setBookingsOn(next);
  };

  const handleContinue = async () => {
    if (locked) return;
    setSubmitting(true);
    try {
      const granted = await grantActOnBehalfOptIns(
        { calls_outbound: callsOn, bookings_reserve: bookingsOn },
        session,
        grantFn,
      );
      onContinue(granted);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fr-screen fr-find fr-act-on-behalf fr-auth-v4"
      data-testid="fr10-act-on-behalf"
      data-viewport="390x844"
    >
      <header className="fr-auth-header" data-testid="fr-auth-hero-mark" data-auth-header="fr-geometry">
        <img
          className="fr-auth-header-emblem"
          src={BRAND_ASSETS.opalGraphEmblemHero}
          alt=""
          width={39}
          height={39}
          draggable={false}
        />
        <span className="fr-auth-header-wordmark" aria-hidden>
          <span className="opal-graph-word-opal">OPAL</span>
          <span className="opal-graph-word-graph"> GRAPH</span>
        </span>
      </header>
      <h1 className="fr-title">{FR_COPY.actOnBehalfTitle}</h1>

      <div
        className="you-consent-rows fr-act-on-behalf-rows"
        data-testid="fr10-capability-rows"
      >
        {ACT_ON_BEHALF_OPT_IN_ROWS.map((row) => {
          const on = toggles[row.id] === true;
          return (
            <div
              key={row.id}
              className="you-settings-row"
              data-testid={`fr10-row-${row.id}`}
              data-capability={row.id}
            >
              <div className="you-settings-row-copy">
                <strong>{row.title}</strong>
                <span>{row.description}</span>
              </div>
              <button
                type="button"
                className={`you-settings-toggle${on ? " on" : ""}`}
                role="switch"
                aria-checked={on}
                aria-label={row.title}
                disabled={locked}
                data-testid={`fr10-toggle-${row.id}`}
                onClick={() => setToggle(row.id, !on)}
              >
                <span className="you-settings-toggle-knob" />
              </button>
            </div>
          );
        })}
      </div>

      <p className="fr-act-on-behalf-footer" data-testid="fr10-footer">
        {FR_COPY.actOnBehalfBody}
      </p>

      <div className="fr-find-actions">
        <button
          type="button"
          className="btn primary fr-primary"
          data-testid="fr10-continue"
          disabled={locked}
          onClick={() => void handleContinue()}
        >
          {submitting ? FR_COPY.busy : FR_COPY.continue}
        </button>
        <button
          type="button"
          className="fr-not-now"
          data-testid="fr10-skip"
          disabled={locked}
          onClick={onSkip}
        >
          {FR_COPY.actOnBehalfSkip}
        </button>
      </div>
    </div>
  );
}
