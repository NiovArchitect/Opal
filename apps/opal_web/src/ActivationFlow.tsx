import React, { useState } from "react";
import { OpalMark } from "./brand/OpalLogo";
import {
  acceptInvitation,
  createInvitation,
  listIncoming,
  startChallenge,
  verifyChallenge,
  type ProductSession,
} from "./api/productClient";

type Props = {
  onAuthenticated: (session: ProductSession) => void;
};

/**
 * Signal-level calm activation: phone → code → name → optional invite.
 * Synthetic development provider only.
 */
export function ActivationFlow({ onAuthenticated }: Props) {
  const [step, setStep] = useState<"phone" | "code" | "profile" | "invite">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteLabel, setInviteLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingSession, setPendingSession] = useState<ProductSession | null>(null);
  const [incoming, setIncoming] = useState<{ id: string }[]>([]);

  const deviceLabel = "WebBrowser";

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await startChallenge(phone, deviceLabel);
      setChallengeId(res.challenge.id);
      setDevCode(res.development_code || null);
      setStep("code");
    } catch (e) {
      setError((e as Error).message || "Could not start verification");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      const session = await verifyChallenge({
        challengeId,
        code,
        displayName: displayName || "Opal User",
        deviceLabel,
        handleHint: displayName
          ? displayName.toLowerCase().replace(/\s+/g, "_").slice(0, 24)
          : undefined,
      });
      setPendingSession(session);
      const inv = await listIncoming(session.access_token);
      setIncoming(inv.invitations || []);
      setStep(inv.invitations?.length ? "invite" : "profile");
      if (!inv.invitations?.length) {
        // profile step asks name if empty, else invite or enter
        if (displayName.trim()) setStep("invite");
        else setStep("profile");
      }
    } catch (e) {
      setError((e as Error).message || "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  const finishProfile = async () => {
    if (!pendingSession) return;
    // Name was collected before verify when possible; enter product.
    if (incoming.length) {
      setStep("invite");
      return;
    }
    setStep("invite");
  };

  const sendInvite = async () => {
    if (!pendingSession) return;
    setBusy(true);
    setError(null);
    try {
      await createInvitation(
        pendingSession.access_token,
        invitePhone,
        inviteLabel || "Friend",
        "Join me on Opal.",
      );
      onAuthenticated(pendingSession);
    } catch (e) {
      setError((e as Error).message || "Invite failed");
    } finally {
      setBusy(false);
    }
  };

  const acceptFirst = async () => {
    if (!pendingSession || !incoming[0]) return;
    setBusy(true);
    setError(null);
    try {
      await acceptInvitation(pendingSession.access_token, incoming[0].id);
      onAuthenticated(pendingSession);
    } catch (e) {
      setError((e as Error).message || "Accept failed");
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
          Private connection for people you know. Development verification uses a synthetic code
          path. Not production SMS.
        </p>
      </div>

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
          />
          <label htmlFor="name">Your name</label>
          <input
            id="name"
            className="composer-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Alex Reed"
          />
          <button type="submit" className="btn primary" disabled={busy || !phone.trim()}>
            {busy ? "Working…" : "Send code"}
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
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          {devCode ? (
            <p className="dev-code" role="note">
              Development verification code: <strong>{devCode}</strong>
            </p>
          ) : null}
          <button type="submit" className="btn primary" disabled={busy || !code.trim()}>
            {busy ? "Working…" : "Verify"}
          </button>
        </form>
      ) : null}

      {step === "profile" ? (
        <div className="activation-form">
          <p>You are signed in as {pendingSession?.display_name}.</p>
          <button type="button" className="btn primary" onClick={() => void finishProfile()}>
            Continue
          </button>
        </div>
      ) : null}

      {step === "invite" && pendingSession ? (
        <div className="activation-form">
          {incoming.length ? (
            <>
              <p>You have an invitation waiting.</p>
              <button type="button" className="btn primary" disabled={busy} onClick={() => void acceptFirst()}>
                Accept invitation
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
                onClick={() => onAuthenticated(pendingSession)}
              >
                Enter Opal without inviting
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
