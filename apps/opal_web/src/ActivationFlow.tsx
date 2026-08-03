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

type Props = {
  onAuthenticated: (session: ProductSession) => void;
};

type Step =
  | "phone"
  | "code"
  | "preparing"
  | "invite"
  | "ready";

/**
 * Activation with explicit states. Never silent-stuck after a valid code.
 * Hosted preview: approved test numbers only. No SMS.
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

  const deviceLabel = "WebBrowser";

  const start = async () => {
    setBusy(true);
    setError(null);
    setStatusLine("Checking number…");
    try {
      if (!isApprovedPreviewFixture(phone)) {
        setError(
          "This preview only accepts approved test numbers. No SMS will be sent.",
        );
        setStatusLine(null);
        return;
      }
      setStatusLine("Requesting code…");
      const res = await startChallenge(phone, deviceLabel);
      setChallengeId(res.challenge.id);
      setDevCode(res.development_code || null);
      setStep("code");
      setStatusLine("Enter the development code.");
    } catch (e) {
      setError((e as Error).message || "Could not start verification");
      setStatusLine(null);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    setStatusLine("Checking code…");
    try {
      const s = await verifyChallenge({
        challengeId,
        code,
        displayName: displayName.trim() || "Opal User",
        deviceLabel,
        handleHint: displayName
          ? displayName.toLowerCase().replace(/\s+/g, "_").slice(0, 24)
          : undefined,
      });
      setSession(s);
      setStep("preparing");
      setStatusLine("Preparing your account…");

      // Optional invite discovery must never block entry.
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
        /* ignore; enter product */
      }

      setStatusLine("Account ready.");
      setStep("ready");
      // Advance into the product immediately.
      onAuthenticated(s);
    } catch (e) {
      setError((e as Error).message || "Could not verify");
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
    setStatusLine("Sending invitation…");
    try {
      await createInvitation(
        invitePhone,
        inviteLabel || "Friend",
        "Join me on Opal.",
        session.access_token,
      );
      setStatusLine("Invitation sent.");
      onAuthenticated(session);
    } catch (e) {
      setError((e as Error).message || "Invite failed");
      setStatusLine(null);
    } finally {
      setBusy(false);
    }
  };

  const acceptFirst = async () => {
    if (!session || !incoming[0]) return;
    setBusy(true);
    setError(null);
    setStatusLine("Accepting invitation…");
    try {
      await acceptInvitation(incoming[0].id, session.access_token);
      setStatusLine("Connected.");
      onAuthenticated(session);
    } catch (e) {
      setError((e as Error).message || "Accept failed");
      setStatusLine(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="activation" aria-label="Activate Opal">
      <div className="activation-hero">
        <OpalMark size="lg" />
        <h1>Continue with Opal</h1>
        <p className="lede">
          This preview uses approved test numbers. No SMS will be sent.
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
          <label htmlFor="phone">Test number</label>
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
          />
          <datalist id="opal-preview-numbers">
            {APPROVED_PREVIEW_FIXTURES.map((f) => (
              <option key={f.e164} value={f.e164}>
                {f.label}
              </option>
            ))}
          </datalist>
          <p className="activation-hint">
            Approved lines: +1 202 555 0101 through 0108.
          </p>
          <label htmlFor="name">Your name</label>
          <input
            id="name"
            className="composer-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Alex Reed"
          />
          <button type="submit" className="btn primary" disabled={busy || !phone.trim()}>
            {busy ? "Working…" : "Continue"}
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
          <label htmlFor="code">Verification code</label>
          <input
            id="code"
            className="composer-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          {devCode ? (
            <p className="dev-code" role="note">
              Development code: <strong>{devCode}</strong>
            </p>
          ) : null}
          <button type="submit" className="btn primary" disabled={busy || !code.trim()}>
            {busy ? "Checking code…" : "Verify"}
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
            }}
          >
            Use a different number
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
                Send invitation
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
