/**
 * Moment 5 — Trust contract after tapping a spot.
 */
import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { HOLY_SHIT_COPY, type HolyShitSpot } from "./holyShitCopy";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

type Props = {
  contactName: string;
  vibe: string;
  when: string;
  spot: HolyShitSpot;
  bearer?: string | null;
  onSend: () => void;
  onNotYet: () => void;
};

/** Prefer message preview API if present; else local founder-shaped preview. */
async function resolveMessagePreview(input: {
  contactName: string;
  vibe: string;
  when: string;
  spot: HolyShitSpot;
  bearer?: string | null;
}): Promise<string> {
  const fallback = HOLY_SHIT_COPY.messageBody(
    input.contactName,
    input.vibe,
    input.when,
    input.spot.name,
  );
  if (!input.bearer) return fallback;
  try {
    const res = await fetch("/api/v1/product/messages/preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.bearer}`,
      },
      body: JSON.stringify({
        to_name: input.contactName,
        place: input.spot.name,
        vibe: input.vibe,
        when: input.when,
      }),
    });
    if (res.ok) {
      const data = (await res.json().catch(() => null)) as { preview?: string; body?: string } | null;
      if (data?.preview || data?.body) return data.preview || data.body || fallback;
    }
  } catch {
    /* local preview */
  }
  return fallback;
}

export function TrustContractCard({
  contactName,
  vibe,
  when,
  spot,
  bearer,
  onSend,
  onNotYet,
}: Props) {
  const reduce = useReducedMotion();
  const [preview, setPreview] = useState(() =>
    HOLY_SHIT_COPY.messageBody(contactName, vibe, when, spot.name),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const text = await resolveMessagePreview({ contactName, vibe, when, spot, bearer });
      if (!cancelled) setPreview(text);
    })();
    return () => {
      cancelled = true;
    };
  }, [bearer, contactName, spot, vibe, when]);

  return (
    <motion.div
      className="hs-trust"
      data-testid="trust-contract-card"
      data-hs-moment="5"
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.4, ease: EASE_OUT }}
      role="region"
      aria-label="Trust contract"
    >
      <p className="hs-trust-lead">{HOLY_SHIT_COPY.trustPreviewLead(contactName)}</p>
      <blockquote className="hs-trust-preview" data-testid="trust-message-preview">
        {preview}
      </blockquote>

      <div className="hs-trust-will">
        <p className="hs-trust-heading">{HOLY_SHIT_COPY.willLabel}</p>
        <p className="hs-trust-line is-will">
          <span aria-hidden>✓</span> {HOLY_SHIT_COPY.willSend}
        </p>
      </div>

      <div className="hs-trust-wont">
        <p className="hs-trust-heading">{HOLY_SHIT_COPY.wontLabel}</p>
        <p className="hs-trust-line is-wont">
          <span aria-hidden>✗</span> {HOLY_SHIT_COPY.wontCalendar}
        </p>
        <p className="hs-trust-line is-wont">
          <span aria-hidden>✗</span> {HOLY_SHIT_COPY.wontAnyoneElse}
        </p>
        <p className="hs-trust-line is-wont">
          <span aria-hidden>✗</span> {HOLY_SHIT_COPY.wontBook}
        </p>
      </div>

      <div className="hs-trust-actions">
        <button
          type="button"
          className="hs-trust-send"
          data-testid="trust-send-it"
          onClick={onSend}
        >
          {HOLY_SHIT_COPY.sendIt}
        </button>
        <button
          type="button"
          className="hs-trust-not-yet"
          data-testid="trust-not-yet"
          onClick={onNotYet}
        >
          {HOLY_SHIT_COPY.notYet}
        </button>
      </div>
    </motion.div>
  );
}
