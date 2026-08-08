import React, { useState } from "react";
import { OpalMark } from "./brand/OpalLogo";
import {
  APPROVED_PREVIEW_FIXTURES,
  acceptInvitation,
  createInvitation,
  isApprovedPreviewFixture,
  listIncoming,
  startChallenge,
  verifyChallenge,
  type ProductSession,
} from "./api/productClient";
import { PRODUCT_COPY } from "./designTokens";

type Props = {
  onAuthenticated: (session: ProductSession) => void;
};

type Step = "phone" | "code" | "preparing" | "invite" | "ready";

const OTP_POLICY = "otp-sms-v1";

/**
 * Activation: phone + OTP consent → code → authoritative session → member shell.
 * Synthetic preview uses approved fixtures. Production never shows development codes.
 */
export function ActivationFlow({ onAuthenticated }: Props) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteLabel, setInviteLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [session, setSession] = useState<ProductSession | null>(null);
  const [incoming, setIncoming] = useState<{ id: string }[]>([]);
  const [otpConsent, setOtpConsent] = useState(false);
  const [notProductionSms, setNotProductionSms] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);

  const deviceLabel = "WebBrowser";

  const mapStartError = (e: Error & { code?: string }) => {
    switch (e.code) {
      case "otp_consent_required":
        return "Confirm we can text you a one-time code to continue.";
      case "rate_limited":
        return "We couldn’t send a code right now. Try again soon.";
      case "number_not_enabled":
        return "This preview only accepts approved test numbers. No text will be sent.";
      case "provider_not_configured":
      case "provider_error":
      case "verification_disabled":
        return "We couldn’t send a code right now. Try again soon.";
      default:
        return e.message || "We couldn’t send a code right now. Try again soon.";
    }
  };

  const mapVerifyError = (e: Error & { code?: string }) => {
    switch (e.code) {
      case "invalid_code":
        return "That code didn’t work. Try again.";
      case "expired":
        return "That code expired. Send a new one.";
      case "locked":
        return "Too many tries. Wait a little and try again.";
      case "replay":
        return "That code was already used. Send a new one.";
      default:
        return e.message || "That code didn’t work. Try again.";
    }
  };

  const start = async () => {
    setBusy(true);
    setError(null);
    setStatusLine("Checking number…");
    try {
      if (!otpConsent) {
        setError("Confirm we can text you a one-time code to continue.");
        setStatusLine(null);
        return;
      }
      if (notProductionSms && !isApprovedPreviewFixture(phone) && environmentLikelyHosted()) {
        setError(
          "This preview only accepts approved test numbers. No text will be sent.",
        );
        setStatusLine(null);
        return;
      }
      setStatusLine("Sending your code…");
      const res = await startChallenge(phone, deviceLabel, {
        otpConsentAccepted: true,
        otpConsentPolicyVersion: OTP_POLICY,
      });
      setChallengeId(res.challenge.id);
      setNotProductionSms(res.not_production_sms !== false);
      // Never show development codes when production SMS mode is active.
      const codeShown =
        res.not_production_sms === false ? null : res.development_code || null;
      setDevCode(codeShown);
      setStep("code");
      setStatusLine(
        codeShown
          ? "Enter the code for this preview."
          : "Enter your code. We sent it to the number you entered.",
      );
      setResendCooldown(30);
    } catch (e) {
      setError(mapStartError(e as Error & { code?: string }));
      setStatusLine(null);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (resendCooldown > 0 || busy) return;
    await start();
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    setStatusLine("Checking code…");
    try {
      const s = await verifyChallenge({
        challengeId,
        code,
        phone,
        displayName: displayName.trim() || "Opal User",
        deviceLabel,
        handleHint: displayName
          ? displayName.toLowerCase().replace(/\s+/g, "_").slice(0, 24)
          : undefined,
      });
      setSession(s);
      setStep("preparing");
      setStatusLine("Preparing your account…");

      try {
        const inv = await listIncoming(s.access_token);
        setIncoming(inv.invitations || []);
        if (inv.invitations?.length) {
          setStep("invite");
          setStatusLine("You have an invitation.");
          setBusy(false);
          return;
        }
      } catch {
        /* enter product */
      }

      setStatusLine("Account ready.");
      setStep("ready");
      onAuthenticated(s);
    } catch (e) {
      setError(mapVerifyError(e as Error & { code?: string }));
      setStatusLine(null);
      setStep("code");
    } finally {
      setBusy(false);
    }
  };

  const sendInvite = async () => {
    if (!session) return;
    setBusy(true);
    setError(null);
    setStatusLine("Creating invite…");
    try {
      const result = await createInvitation(
        invitePhone,
        inviteLabel || "Friend",
        `${displayName.trim() || "Someone"} invited you into a plan in Opal.`,
        session.access_token,
      );
      const delivery = result?.delivery;
      if (delivery?.sms_sent) {
        setStatusLine("Sent.");
      } else if (delivery?.share_link_ready || result?.share?.path) {
        setStatusLine("Invite ready.");
      } else {
        setStatusLine("Invite ready.");
      }
      onAuthenticated(session);
    } catch (e) {
      setError((e as Error).message || "Couldn’t send");
      setStatusLine(null);
    } finally {
      setBusy(false);
    }
  };

  const acceptFirst = async () => {
    if (!session || !incoming[0]) return;
    setBusy(true);
    setError(null);
    setStatusLine("Connecting…");
    try {
      await acceptInvitation(incoming[0].id, session.access_token);
      setStatusLine("Connected.");
      onAuthenticated(session);
    } catch (e) {
      setError((e as Error).message || "Could not accept");
      setStatusLine(null);
    } finally {
      setBusy(false);
    }
  };

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendCooldown]);

  return (
    <div className="activation" aria-label="Join Opal with your number">
      <div className="activation-hero">
        <OpalMark size="lg" />
        <h1>What’s your number?</h1>
        <p className="lede">
          {step === "code"
            ? "Enter your code"
            : "We’ll text you a one-time code."}
        </p>
      </div>

      {statusLine ? (
        <p className="activation-status" role="status" aria-live="polite">
          {statusLine}
        </p>
      ) : null}

      {error ? (
        <p className="activation-error" role="alert">
          {error}
        </p>
      ) : null}

      {step === "phone" ? (
        <form
          className="activation-form"
          onSubmit={(e) => {
            e.preventDefault();
            void start();
          }}
        >
          <label htmlFor="phone">Phone number</label>
          <input
            id="phone"
            className="composer-input"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+1 202 555 0101"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            list="opal-preview-numbers"
            aria-describedby="otp-rates otp-trust"
          />
          <datalist id="opal-preview-numbers">
            {APPROVED_PREVIEW_FIXTURES.map((f) => (
              <option key={f.e164} value={f.e164}>
                {f.label}
              </option>
            ))}
          </datalist>

          <label htmlFor="name">Your name</label>
          <input
            id="name"
            className="composer-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Alex Reed"
            autoComplete="name"
          />

          <fieldset className="activation-consent">
            <legend className="sr-only">Text message consent</legend>
            <label className="activation-consent-label" htmlFor="otp-consent">
              <input
                id="otp-consent"
                type="checkbox"
                checked={otpConsent}
                onChange={(e) => setOtpConsent(e.target.checked)}
                required
              />
              <span>
                Text me a one-time security code at this number. This is only for
                signing in. Not for marketing.
              </span>
            </label>
            <p id="otp-rates" className="activation-hint">
              Message and data rates may apply.
            </p>
            <p className="activation-hint">
              <a href="/privacy" target="_blank" rel="noreferrer">
                Privacy
              </a>
              {" · "}
              <a href="/terms" target="_blank" rel="noreferrer">
                Terms
              </a>
            </p>
          </fieldset>

          <p id="otp-trust" className="activation-trust" role="note">
            {PRODUCT_COPY.activationTrust}
          </p>
          {notProductionSms ? (
            <p className="activation-hint">
              Preview mode uses approved test numbers when the host requires them.
            </p>
          ) : null}

          <button
            type="submit"
            className="btn primary"
            disabled={busy || !phone.trim() || !otpConsent}
          >
            {busy ? "Working…" : "Text me a code"}
          </button>
        </form>
      ) : null}

      {step === "code" ? (
        <form
          className="activation-form"
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
        >
          <p className="activation-hint">
            We sent it to the number you entered.
          </p>
          <label htmlFor="code">Your code</label>
          <input
            id="code"
            className="composer-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            aria-describedby={devCode ? "dev-code-note" : undefined}
          />
          {devCode ? (
            <p id="dev-code-note" className="dev-code" role="note">
              Preview code: <strong>{devCode}</strong>
            </p>
          ) : null}
          <button type="submit" className="btn primary" disabled={busy || !code.trim()}>
            {busy ? "Checking…" : "Continue"}
          </button>
          <button
            type="button"
            className="btn ghost"
            disabled={busy || resendCooldown > 0}
            onClick={() => void resend()}
          >
            {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
          </button>
          <button
            type="button"
            className="btn ghost"
            disabled={busy}
            onClick={() => {
              setStep("phone");
              setError(null);
              setStatusLine(null);
              setCode("");
              setChallengeId("");
              setDevCode(null);
            }}
          >
            Change number
          </button>
        </form>
      ) : null}

      {step === "preparing" ? (
        <div className="activation-form">
          <p role="status">Preparing your account…</p>
        </div>
      ) : null}

      {step === "invite" && session ? (
        <div className="activation-form">
          {incoming.length ? (
            <>
              <p>You have an invitation waiting.</p>
              <button
                type="button"
                className="btn primary"
                disabled={busy}
                onClick={() => void acceptFirst()}
              >
                Accept invitation
              </button>
              <button
                type="button"
                className="btn ghost"
                disabled={busy}
                onClick={() => onAuthenticated(session)}
              >
                Enter Opal
              </button>
            </>
          ) : (
            <>
              <label htmlFor="invite-phone">Invite someone by phone</label>
              <input
                id="invite-phone"
                className="composer-input"
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
                placeholder="+1 202 555 0102"
              />
              <label htmlFor="invite-label">Name</label>
              <input
                id="invite-label"
                className="composer-input"
                value={inviteLabel}
                onChange={(e) => setInviteLabel(e.target.value)}
                placeholder="Jordan"
              />
              <button
                type="button"
                className="btn primary"
                disabled={busy || !invitePhone.trim()}
                onClick={() => void sendInvite()}
              >
                Create invite
              </button>
              <button
                type="button"
                className="btn ghost"
                disabled={busy}
                onClick={() => onAuthenticated(session)}
              >
                Enter Opal
              </button>
            </>
          )}
        </div>
      ) : null}

      {step === "ready" && session ? (
        <div className="activation-form">
          <p role="status">Account ready.</p>
          <button
            type="button"
            className="btn primary"
            onClick={() => onAuthenticated(session)}
          >
            Enter Opal
          </button>
        </div>
      ) : null}
    </div>
  );
}

function environmentLikelyHosted(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h.includes("github.io") || h.includes("niovlabs.com") || h.includes("opal.");
}
