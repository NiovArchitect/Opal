/**
 * Repair #18 - Division C2 - onboarding entry (track-c2 section 6).
 * Sixty seconds or less, everything deferrable deferred, lands on
 * Center. The flow is exactly: Splash 1, Splash 2, Phone, Verify,
 * Meet Opal, Center. Nothing else is onboarding.
 *
 * Auth wiring mirrors the existing lawful route exactly: phone
 * challenge via startChallenge, verify via verifyChallenge with a
 * provisional name (the existing backend contract requires one),
 * then Meet Opal owns the real profile save via updateProfile.
 * Errors render from the attempt result only - this surface never
 * invents a cooldown or a masked number.
 */
import React, { useRef, useState } from "react";
import { OrbLockup } from "../../brand/orb/OrbMark";
import { C2PatternLines } from "../C2PatternLines";
import {
  startChallenge,
  updateProfile,
  verifyChallenge,
} from "../../api/productClient";
import { IconBack } from "./bits";

export type C2OnboardingEvents = {
  /** Onboarding complete: the shell lands on Center (the contract). */
  complete: () => void;
  backToSplash: () => void;
};

type Step = "phone" | "verify" | "meet";

export function C2Onboarding({ events }: { events: C2OnboardingEvents }) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const busyRef = useRef(false);

  const stepLabel = step === "phone" ? "Step 1 of 3" : step === "verify" ? "Step 2 of 3" : "Step 3 of 3";

  const submitPhone = async () => {
    if (busyRef.current) return;
    if (phone.replace(/\D/g, "").length < 7) {
      setError("Enter a valid phone number.");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await startChallenge(phone, "WebBrowser", {
        otpConsentAccepted: true,
        otpConsentPolicyVersion: "otp-sms-v1",
      });
      setChallengeId(res.challenge.id);
      setStep("verify");
    } catch {
      setError("That number could not get a code. Check it and try again.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const submitCode = async () => {
    if (busyRef.current || !challengeId) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await verifyChallenge({
        challengeId,
        code: code.trim(),
        phone,
        // Provisional only - Meet Opal owns the real save, exactly as
        // the existing FirstRunExperience route does.
        displayName: "You",
        deviceLabel: "WebBrowser",
      });
      setStep("meet");
    } catch {
      setError("That code did not match. Try again.");
      setCode("");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const resend = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setError(null);
    try {
      const res = await startChallenge(phone, "WebBrowser", {
        otpConsentAccepted: true,
        otpConsentPolicyVersion: "otp-sms-v1",
      });
      setChallengeId(res.challenge.id);
    } catch {
      setError("That code could not be sent again yet.");
    } finally {
      busyRef.current = false;
    }
  };

  const saveProfile = async () => {
    if (busyRef.current) return;
    if (!name.trim()) {
      setError("Add your name so your people can find you.");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await updateProfile({ displayName: name.trim(), handle: handle.trim() || undefined });
      events.complete();
    } catch {
      // Typed values stay on screen (section 6 save-failure rule).
      setError("That did not save. Your words are still here - try again.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="c2s-entry" data-testid="c2-onboarding">
      {/* Repair #27 (W27-15) - parity furniture, shared by all three
          steps so the flow reads as one surface: the Current Lines
          pattern in its top band only (section 2.3: no line crosses
          text - the zone ends above the step headline), and the
          STACKED orb lockup hero (LOCKUP LAW: orb centered above
          the wordmark - the splash pair's composition). The header
          keeps back + step count only; the brand appears once, in
          the hero, instead of a lone small wordmark in the bar. */}
      <C2PatternLines convergenceY={62} heightPct={22} />
      <div className="c2s-entry-top">
        <button
          type="button"
          className="c2s-icon-btn"
          aria-label="Back"
          data-testid="c2-entry-back"
          onClick={() => {
            if (step === "verify") setStep("phone");
            else if (step === "meet") setStep("verify");
            else events.backToSplash();
          }}
        >
          <IconBack />
        </button>
        <span style={{ width: 44 }} />
        <span className="c2s-entry-step">{stepLabel}</span>
      </div>
      <div className="c2s-entry-hero" data-testid="c2-entry-hero">
        <OrbLockup form="stacked" wordmarkWidth={84} />
      </div>

      {step === "phone" ? (
        <div className="c2s-entry-body" data-testid="c2-entry-phone">
          <h1>Start with your phone.</h1>
          <p>Keeps your account yours. That is it.</p>
          <input
            className="c2s-field"
            data-testid="c2-phone-input"
            type="tel"
            autoComplete="tel"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-label="Phone number"
          />
          <p className="c2s-caption">
            Text me a one-time code at this number. Sign-in only. Not marketing.
          </p>
          {error ? (
            <p className="c2s-error-line" role="alert">
              {error}
            </p>
          ) : null}
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="c2s-btn-primary"
            data-testid="c2-phone-continue"
            disabled={busy}
            onClick={() => void submitPhone()}
          >
            {busy ? "Sending your code" : "Continue with phone"}
          </button>
        </div>
      ) : null}

      {step === "verify" ? (
        <div className="c2s-entry-body" data-testid="c2-entry-verify">
          <h1>Enter the code.</h1>
          <p>We sent it to {phone}.</p>
          <div className="c2s-code-row">
            <input
              className="c2s-code-box"
              data-testid="c2-code-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              aria-label="One-time code"
            />
          </div>
          {error ? (
            <p className="c2s-error-line" role="alert">
              {error}
            </p>
          ) : null}
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="c2s-btn-primary"
            data-testid="c2-code-verify"
            disabled={busy || code.length < 4}
            onClick={() => void submitCode()}
          >
            Verify
          </button>
          <button
            type="button"
            className="c2s-btn-text"
            data-testid="c2-code-resend"
            onClick={() => void resend()}
          >
            Resend code
          </button>
        </div>
      ) : null}

      {step === "meet" ? (
        <div className="c2s-entry-body" data-testid="c2-entry-meet">
          <h1>This is you.</h1>
          <p>A name helps your people find you.</p>
          <input
            className="c2s-field"
            data-testid="c2-meet-name"
            placeholder="Name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Name"
          />
          <input
            className="c2s-field"
            data-testid="c2-meet-handle"
            placeholder="Username"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            aria-label="Username"
          />
          <p className="c2s-caption">Optional. Must be unique if you pick one.</p>
          <p className="c2s-caption">
            {name.trim()
              ? `Your initials work until you add a photo: ${name.trim().slice(0, 1).toUpperCase()}`
              : "Initials work until you add one."}{" "}
            Photo comes later, when you want it.
          </p>
          {error ? (
            <p className="c2s-error-line" role="alert">
              {error}
            </p>
          ) : null}
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="c2s-btn-primary"
            data-testid="c2-meet-save"
            disabled={busy}
            onClick={() => void saveProfile()}
          >
            Looks good
          </button>
        </div>
      ) : null}
    </div>
  );
}
