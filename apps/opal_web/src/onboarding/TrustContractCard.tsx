/**
 * Moment 5 — Trust contract (rebuild).
 * Full-screen immersion. Will = cyan. Won't = muted coral. Send it = glowing cyan.
 * Lead copy promises delivery only after a real invite/SMS attempt succeeds.
 *
 * First-run ends here (Paste G D6). Moments 6 / 9 / 10 are not shipped — Send /
 * Not yet finish onboarding; they do not open a post-trust follow-through flow.
 */
import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { HOLY_SHIT_COPY, type HolyShitSpot } from "./holyShitCopy";
import { OpalPresenceOrb } from "./OpalPresenceOrb";
import { createInvitation, createProductInvite } from "../api/productClient";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

type Props = {
  contactName: string;
  vibe: string;
  when: string;
  spot: HolyShitSpot;
  bearer?: string | null;
  contactPhone?: string;
  onSend: () => void;
  onNotYet: () => void;
};

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
      const data = (await res.json().catch(() => null)) as
        | { preview?: string; body?: string }
        | null;
      if (data?.preview || data?.body) return data.preview || data.body || fallback;
    }
  } catch {
    /* local preview */
  }
  return fallback;
}

async function attemptInviteSend(input: {
  contactName: string;
  phone?: string;
  message: string;
  bearer?: string | null;
}): Promise<{ sent: boolean; reason?: string }> {
  const phone = input.phone?.trim();
  if (!phone) {
    return { sent: false, reason: `${input.contactName} has no phone number` };
  }
  if (!input.bearer) {
    return { sent: false, reason: "sign in required to send" };
  }
  try {
    const inv = await createInvitation(
      phone,
      input.contactName,
      input.message,
      input.bearer,
      "selected_contact",
    );
    const delivery = inv.delivery || {};
    if (delivery.sms_sent === true) return { sent: true };
    try {
      const product = await createProductInvite(
        { invitee_phone: phone },
        input.bearer,
      );
      const pd = product.delivery || {};
      if (pd.sms_queued === true) return { sent: true };
      if (typeof pd.sms_honest === "string") {
        return { sent: false, reason: pd.sms_honest };
      }
    } catch {
      /* invitation may still exist */
    }
    if (delivery.honest_no_production_sms || delivery.share_link_ready) {
      return {
        sent: false,
        reason: "SMS not sent yet - invite from You - Invite friends",
      };
    }
    // Invitation row created without SMS — not a delivery success.
    return {
      sent: false,
      reason: "invite saved - SMS not sent yet",
    };
  } catch (e) {
    return {
      sent: false,
      reason: e instanceof Error ? e.message : "invite API failed",
    };
  }
}

export function TrustContractCard({
  contactName,
  vibe,
  when,
  spot,
  bearer,
  contactPhone,
  onSend,
  onNotYet,
}: Props) {
  const reduce = useReducedMotion();
  const [preview, setPreview] = useState(() =>
    HOLY_SHIT_COPY.messageBody(contactName, vibe, when, spot.name),
  );
  const [lead, setLead] = useState(() => HOLY_SHIT_COPY.trustPreviewLead(contactName));
  const [gateNote, setGateNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sendAttempted, setSendAttempted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const text = await resolveMessagePreview({
        contactName,
        vibe,
        when,
        spot,
        bearer,
      });
      if (!cancelled) setPreview(text);
    })();
    return () => {
      cancelled = true;
    };
  }, [bearer, contactName, spot, vibe, when]);

  const handleSend = async () => {
    if (busy) return;
    // After an honest failure gate, Continue advances without re-sending.
    if (sendAttempted && gateNote) {
      onSend();
      return;
    }
    setBusy(true);
    setGateNote(null);
    const result = await attemptInviteSend({
      contactName,
      phone: contactPhone,
      message: preview,
      bearer,
    });
    setSendAttempted(true);
    if (result.sent) {
      setLead(HOLY_SHIT_COPY.trustSentLead(contactName));
      setBusy(false);
      onSend();
      return;
    }
    const reason = result.reason || "unknown";
    setGateNote(
      contactPhone
        ? HOLY_SHIT_COPY.trustSendFailed(reason)
        : HOLY_SHIT_COPY.trustSendNoPhone(contactName),
    );
    setBusy(false);
  };

  return (
    <motion.div
      className="hs-trust"
      data-testid="trust-contract-card"
      data-hs-moment="5"
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.45, ease: EASE_OUT }}
      role="dialog"
      aria-modal="true"
      aria-label="Trust contract"
    >
      <div className="hs-trust-atmosphere" aria-hidden />

      <div className="hs-trust-orb">
        <OpalPresenceOrb mode="ready" size={64} />
      </div>

      <div className="hs-trust-scroll">
        <p className="hs-trust-lead" data-testid="trust-preview-lead">
          {lead}
        </p>
        <blockquote className="hs-trust-preview" data-testid="trust-message-preview">
          {preview}
        </blockquote>

        <div className="hs-trust-will">
          <p className="hs-trust-heading is-will">{HOLY_SHIT_COPY.willLabel}</p>
          <p className="hs-trust-line is-will">
            <span aria-hidden>✓</span> {HOLY_SHIT_COPY.willSend}
          </p>
        </div>

        <div className="hs-trust-wont">
          <p className="hs-trust-heading is-wont">{HOLY_SHIT_COPY.wontLabel}</p>
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

        {gateNote ? (
          <p
            className="hs-trust-gate"
            data-testid="trust-send-gate"
            role="status"
            aria-live="polite"
          >
            {gateNote}
          </p>
        ) : null}
      </div>

      <div className="hs-trust-actions">
        <button
          type="button"
          className="hs-trust-send"
          data-testid="trust-send-it"
          disabled={busy}
          onClick={() => void handleSend()}
        >
          {sendAttempted && gateNote ? "Continue" : HOLY_SHIT_COPY.sendIt}
        </button>
        <button
          type="button"
          className="hs-trust-not-yet"
          data-testid="trust-not-yet"
          disabled={busy}
          onClick={onNotYet}
        >
          {HOLY_SHIT_COPY.notYet}
        </button>
      </div>
    </motion.div>
  );
}
