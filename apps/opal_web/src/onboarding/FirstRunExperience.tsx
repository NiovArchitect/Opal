import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";
import { BRAND, BRAND_ASSETS, PRODUCT_PUBLIC_NAME } from "../brand/brand";
import {
  FOUNDER_AUTH_FIXTURE,
  codeHintForE164,
  normalizePhoneInput,
  saveProfile,
  startChallenge,
  updateProfile,
  verifyChallenge,
  type ProductSession,
} from "../api/productClient";
import { isFounderSeedEnabled } from "../opalUi/founderGraphSeed";
import { FindPeopleFlow } from "../people/FindPeopleFlow";
import {
  FR_COPY,
  FR_FIXTURE_PEOPLE,
  FIRST_RUN_STEPS,
  type FirstRunStepId,
} from "./firstRunCopy";

export { FIRST_RUN_STEPS, FR_COPY, type FirstRunStepId };

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const OTP_POLICY = "otp-sms-v1";

/**
 * Founder override 2026-08-25:
 * Splash (this component) → FirstRunPromisePage (OpalApp top-level) → Auth (this component sign_in).
 * Legacy frPromise / fr01-fr05 remain in types/history but are OFF the production path.
 * Promise is NOT rendered inside .fr-void / Motion / premember shell.
 */
export const FIRST_RUN_ROUTE_ORDER: FirstRunStepId[] = [
  "fr00",
  "frPromise", // historical id  -  Promise is owned by OpalApp FirstRunPromisePage
  "fr06",
  "fr07",
  "fr08",
  "fr09",
];

function nextStep(current: FirstRunStepId): FirstRunStepId | null {
  const i = FIRST_RUN_ROUTE_ORDER.indexOf(current);
  if (i < 0 || i >= FIRST_RUN_ROUTE_ORDER.length - 1) return null;
  return FIRST_RUN_ROUTE_ORDER[i + 1]!;
}

type Props = {
  open: boolean;
  /**
   * full = Splash only (Promise lifted to OpalApp)
   * sign_in = FR06+ only (phone auth after Promise CTA or returning user)
   * splash_only = same as full for Splash; Tap to begin calls onAdvanceToPromise
   */
  mode?: "full" | "sign_in" | "splash_only";
  /**
   * When a member replays the intro, walkthrough ends without re-auth  - 
   * DISABLED while forcedFirstRun is active (parent passes null).
   */
  existingSession?: ProductSession | null;
  /** Called when authenticated session is ready and first-run route is complete. */
  onAuthenticated: (session: ProductSession) => void;
  /** Mark walkthrough completed (local) when user leaves Promise into auth. */
  onWalkthroughComplete?: () => void;
  /**
   * Splash Tap to begin → parent mounts FirstRunPromisePage.
   * Required on production Splash path. Must stop the pointer event there.
   */
  onAdvanceToPromise?: () => void;
};

/** Common dial codes - +1 is example/default only, never forced. */
export const PHONE_DIAL_OPTIONS = [
  { dial: "+1", label: "+1" },
  { dial: "+52", label: "+52" },
  { dial: "+44", label: "+44" },
  { dial: "+63", label: "+63" },
  { dial: "+61", label: "+61" },
  { dial: "+81", label: "+81" },
  { dial: "+49", label: "+49" },
  { dial: "+33", label: "+33" },
  { dial: "+91", label: "+91" },
  { dial: "+55", label: "+55" },
] as const;

function prettyPhone(raw: string, dial = "+1"): string {
  try {
    const n = normalizePhoneInput(raw, dial);
    if (n.startsWith("+1") && n.length === 12) {
      return `+1 ${n.slice(2, 5)} ${n.slice(5, 8)} ${n.slice(8)}`;
    }
    return n;
  } catch {
    return raw;
  }
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function Avatar({
  name,
  initial,
  tone,
  size = 54,
  selected,
  onClick,
  testId,
}: {
  name: string;
  initial: string;
  tone: string;
  size?: number;
  selected?: boolean;
  onClick?: () => void;
  testId?: string;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      className={`fr-avatar ${selected ? "is-selected" : ""} ${onClick ? "is-interactive" : ""}`}
      style={{ width: size, height: size, ["--fr-tone" as string]: tone }}
      onClick={onClick}
      aria-pressed={onClick ? !!selected : undefined}
      aria-label={onClick ? `${name}${selected ? ", selected" : ""}` : undefined}
      data-testid={testId}
    >
      <span className="fr-avatar-initial" aria-hidden>
        {initial}
      </span>
      {selected ? (
        <span className="fr-avatar-check" aria-hidden>
          ✓
        </span>
      ) : null}
    </Tag>
  );
}

function BrandChrome({ compact = false }: { compact?: boolean }) {
  return (
    <header className={`fr-brand-chrome ${compact ? "is-compact" : ""}`} data-testid="fr-brand-chrome">
      <OpalMark size={compact ? "sm" : "md"} title="" />
      <OpalWordmark height={compact ? 18 : 22} title="" compact />
    </header>
  );
}

/**
 * Auth header footprint (773:*): emblem 20,18 39.2×39.2 + wordmark 64,20 132×24.
 * Brand V4 logo treatment only - NOT a hero-logo redesign.
 */
function AuthHeroMark() {
  return (
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
  );
}

/**
 * First Run  -  Figma 327:2 CURRENT AUTHORITY (supersedes timed cinematic).
 *
 * SFR-00 splash: Tap to begin | Skip intro | I already have an account
 * SFR-01..03: manual swipe (no autoplay timer)
 * SFR-04 (fr05): STOP conversion
 * AUTH-01.. (fr06+): real productClient auth
 *
 * Illustrative scenes do not mutate server state.
 */
/** Manual swipe steps (327:2). No timed autoplay. */
const SFR_SWIPE_STEPS = ["fr01", "fr02", "fr03", "fr04"] as const;
type SfrSwipeStep = (typeof SFR_SWIPE_STEPS)[number];

function isSfrSwipeStep(s: FirstRunStepId): s is SfrSwipeStep {
  return (SFR_SWIPE_STEPS as readonly string[]).includes(s);
}

export function FirstRunExperience({
  open,
  mode = "full",
  existingSession = null,
  onAuthenticated,
  onWalkthroughComplete,
  onAdvanceToPromise,
}: Props) {
  const reduce = useReducedMotion();
  const startStep: FirstRunStepId = mode === "sign_in" ? "fr06" : "fr00";
  const [step, setStep] = useState<FirstRunStepId>(startStep);
  /** Demo-only selection  -  Chanelle pre-selected for FR02 illustration. */
  const [selectedWho] = useState<Set<string>>(() => new Set(["chanelle"]));
  const [together] = useState(true);

  // Auth state: real product seams
  const founderReview = isFounderSeedEnabled();
  const [phone, setPhone] = useState(() =>
    founderReview ? FOUNDER_AUTH_FIXTURE.national : "",
  );
  /** Country/region dial - +1 is example/default only, never forced. */
  const [dialCode, setDialCode] = useState(() =>
    founderReview ? FOUNDER_AUTH_FIXTURE.dial : "+1",
  );
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [otpConsent, setOtpConsent] = useState(() => founderReview);
  const [notProductionSms, setNotProductionSms] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [session, setSession] = useState<ProductSession | null>(null);

  // Profile: Add photo is ACTION (773:80). Local preview always; persist if owner exists.
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoPersistenceGap, setPhotoPersistenceGap] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // Find people overlay after FR09 primary
  const [findOpen, setFindOpen] = useState(false);
  const finishingRef = useRef(false);
  const startLockRef = useRef(false);
  const verifyLockRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setStep(startStep);
      finishingRef.current = false;
      startLockRef.current = false;
      verifyLockRef.current = false;
      setError(null);
      setStatusLine(null);
      setBusy(false);
    }
  }, [open, startStep]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendCooldown]);

  /** Advance exactly one screen. Never jump FR00→FR05 or splash→phone. */
  const advanceFrom = (from: FirstRunStepId) => {
    setStep((current) => {
      if (current !== from) return current;
      return nextStep(from) ?? current;
    });
  };

  if (!open) return null;

  const transition = reduce
    ? { duration: 0 }
    : { duration: 0.4, ease: EASE_OUT };

  /** Manual swipe / tap advances one SFR beat. No autoplay. */
  const onDemoSceneActivate = (from: SfrSwipeStep) => {
    if (step !== from) return;
    advanceFrom(from);
  };

  /**
   * Splash → Promise only. Never skip Promise. Never jump to auth from this control.
   */
  const skipIntroToConversion = () => {
    if (step !== "fr00") return;
    leaveSplashToPromise();
  };

  /** One Splash tap → parent FirstRunPromisePage. Event must not leak into Promise CTAs. */
  const leaveSplashToPromise = (e?: React.SyntheticEvent) => {
    if (step !== "fr00") return;
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (onAdvanceToPromise) {
      onAdvanceToPromise();
      return;
    }
    // Fallback (tests / incomplete parent): historical internal step  -  not production.
    advanceFrom("fr00");
  };

  /** Returning user from splash → phone auth without Promise (explicit control only). */
  const goSignInFromSplash = () => {
    if (step !== "fr00") return;
    onWalkthroughComplete?.();
    // Forced first-run / founder reset: parent passes existingSession=null so this cannot skip.
    if (existingSession) {
      if (finishingRef.current) return;
      finishingRef.current = true;
      onAuthenticated(existingSession);
      return;
    }
    setStep("fr06");
    setError(null);
  };

  const goAuth = (already = false) => {
    void already;
    // Legacy FR05 only  -  Promise CTAs are owned by FirstRunPromisePage / OpalApp.
    if (step !== "fr05") return;
    onWalkthroughComplete?.();
    if (existingSession) {
      if (finishingRef.current) return;
      finishingRef.current = true;
      onAuthenticated(existingSession);
      return;
    }
    setStep("fr06");
    setError(null);
  };

  const mapStartError = (e: Error & { code?: string }) => {
    switch (e.code) {
      case "otp_consent_required":
        return FR_COPY.otpRequired;
      case "rate_limited":
        return "We could not send a code right now. Try again soon.";
      case "number_not_enabled":
        return FR_COPY.previewOnly;
      case "provider_not_configured":
      case "provider_error":
      case "verification_disabled":
        return "We could not send a code right now. Try again soon.";
      default:
        return e.message || "We could not send a code right now. Try again soon.";
    }
  };

  const mapVerifyError = (e: Error & { code?: string }) => {
    switch (e.code) {
      case "invalid_code":
        return "That code did not work. Try again.";
      case "expired":
        return "That code expired. Send a new one.";
      case "locked":
        return "Too many tries. Wait a little and try again.";
      case "replay":
        return "That code was already used. Send a new one.";
      default:
        return e.message || "That code did not work. Try again.";
    }
  };

  /** Founder/preview only: Skip for now continues walk via real OTP fixture path. */
  const founderSkipForNow = async () => {
    if (!isFounderSeedEnabled()) {
      // Arbitration: one message only — clear service errors before helper status.
      setError(null);
      setStatusLine("Phone verification is required to continue.");
      return;
    }
    if (busy || startLockRef.current) return;
    startLockRef.current = true;
    setBusy(true);
    setError(null);
    setStatusLine(FR_COPY.preparing);
    const attempts = [
      { e164: FOUNDER_AUTH_FIXTURE.e164, otp: FOUNDER_AUTH_FIXTURE.otp, dial: FOUNDER_AUTH_FIXTURE.dial, national: FOUNDER_AUTH_FIXTURE.national },
      { e164: "+12025550102", otp: "222222", dial: "+1", national: "2025550102" },
      { e164: "+12025550103", otp: "333333", dial: "+1", national: "2025550103" },
    ];
    try {
      let lastErr: unknown = null;
      for (const fx of attempts) {
        try {
          setDialCode(fx.dial);
          setPhone(fx.national);
          setOtpConsent(true);
          const res = await startChallenge(fx.e164, "WebBrowser", {
            otpConsentAccepted: true,
            otpConsentPolicyVersion: OTP_POLICY,
          });
          const otp = res.development_code || codeHintForE164(fx.e164) || fx.otp;
          console.info("[OPAL_DEV_OTP]", { e164: fx.e164, development_code: otp, path: "founder_skip" });
          const s = await verifyChallenge({
            challengeId: res.challenge.id,
            code: otp,
            phone: fx.e164,
            displayName: displayName.trim() || "Founder",
            deviceLabel: "WebBrowser",
          });
          setSession(s);
          setDevCode(otp);
          if (s.display_name && s.display_name !== "You" && !displayName.trim()) {
            setDisplayName(s.display_name);
          }
          setStep("fr08");
          setStatusLine(null);
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }
      }
      if (lastErr) throw lastErr;
    } catch (e) {
      setError(mapStartError(e as Error & { code?: string }));
      setStatusLine(null);
    } finally {
      setBusy(false);
      startLockRef.current = false;
    }
  };

  const start = async () => {

    if (busy || startLockRef.current) return;
    startLockRef.current = true;
    setBusy(true);
    setError(null);
    setStatusLine(FR_COPY.sending);
    try {
      if (!otpConsent) {
        setError(FR_COPY.otpRequired);
        setStatusLine(null);
        return;
      }
      let normalized: string;
      try {
        // If user pasted full E.164 into the national field, honor it.
        const raw = phone.trim().startsWith("+") ? phone : phone;
        normalized = normalizePhoneInput(raw, dialCode);
      } catch {
        setError(FR_COPY.invalidPhone);
        setStatusLine(null);
        return;
      }
      if (!normalized || normalized.replace(/\D/g, "").length < 8) {
        setError(FR_COPY.invalidPhone);
        setStatusLine(null);
        return;
      }
      // Tranche #2: do NOT client-block real numbers before the server answers.
      // Hosted synthetic fixture-only remains a SERVER gate (`number_not_enabled`).
      // Optimistic notProductionSms=true previously blocked production_sms RC phones.
      const res = await startChallenge(normalized, "WebBrowser", {
        otpConsentAccepted: true,
        otpConsentPolicyVersion: OTP_POLICY,
      });
      setChallengeId(res.challenge.id);
      setNotProductionSms(res.not_production_sms !== false);
      // Prefer live development_code; fall back to durable fixture codeHint (111111).
      const codeShown =
        res.not_production_sms === false
          ? null
          : res.development_code || codeHintForE164(normalized) || null;
      // Dev OTP: console/harness only - never render in product viewport.
      setDevCode(codeShown);
      if (codeShown) {
        console.info("[OPAL_DEV_OTP]", { e164: normalized, development_code: codeShown });
        // Founder/review efficiency: autofill Verify input without UI chrome.
        if (isFounderSeedEnabled()) setCode(codeShown);
      }
      setStep("fr07");
      setStatusLine("Enter your code. We sent it to the number you entered.");
      setResendCooldown(30);
    } catch (e) {
      setError(mapStartError(e as Error & { code?: string }));
      setStatusLine(null);
    } finally {
      setBusy(false);
      startLockRef.current = false;
    }
  };

  const resend = async () => {
    if (resendCooldown > 0 || busy) return;
    await start();
  };

  const verify = async () => {
    if (busy || verifyLockRef.current) return;
    const trimmed = code.replace(/\s+/g, "").trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setError(FR_COPY.invalidCode);
      return;
    }
    verifyLockRef.current = true;
    setBusy(true);
    setError(null);
    setStatusLine(FR_COPY.checking);
    try {
      // Provisional name until FR08; session must exist before profile authority.
      const e164 = normalizePhoneInput(phone, dialCode);
      const s = await verifyChallenge({
        challengeId,
        code: trimmed,
        phone: e164,
        displayName: displayName.trim() || "You",
        deviceLabel: "WebBrowser",
        handleHint: username
          ? username.replace(/^@/, "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24)
          : undefined,
      });
      setSession(s);
      if (s.display_name && s.display_name !== "You" && !displayName.trim()) {
        setDisplayName(s.display_name);
      }
      if (s.handle && !username.trim()) {
        setUsername(s.handle);
      }
      setStatusLine(FR_COPY.preparing);
      setStep("fr08");
      setStatusLine(null);
    } catch (e) {
      setError(mapVerifyError(e as Error & { code?: string }));
      setStatusLine(null);
      setStep("fr07");
    } finally {
      setBusy(false);
      verifyLockRef.current = false;
    }
  };

  const saveProfileAndContinue = async () => {
    if (busy || !session) return;
    const name = displayName.trim();
    if (!name) {
      setError(FR_COPY.nameRequired);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const handle = username.trim().replace(/^@/, "");
      const data = await updateProfile(
        { displayName: name, handle: handle || undefined },
        session.access_token,
      );
      const next: ProductSession = {
        ...session,
        display_name: data.user.display_name,
        handle: data.user.handle,
      };
      saveProfile(next);
      setSession(next);
      setStep("fr09");
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === "handle_taken" || /taken/i.test(err.message || "")) {
        setError("That username is already taken. Try another.");
      } else {
        setError(err.message || "Could not save your profile. Try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const finishToHome = (s?: ProductSession | null) => {
    if (finishingRef.current) return;
    const final = s || session;
    if (!final) return;
    finishingRef.current = true;
    onWalkthroughComplete?.();
    onAuthenticated(final);
  };

  const onCodeChange = (raw: string) => {
    // Accept paste of 6 digits with spaces
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
  };

  return (
    <div
      className="first-run first-run-standalone fr-s1"
      role="dialog"
      aria-modal="true"
      aria-label={`${PRODUCT_PUBLIC_NAME} first run`}
      data-testid="first-run-walkthrough"
      data-premember="true"
      data-fr-step={step}
      data-figma-first-run="618:16"
      data-figma-dated-authority="618:2"
      data-visual-authority="618:2"
    >
      <div className="fr-void" aria-hidden />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="fr-frame"
          data-testid={`fr-step-${step}`}
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -10 }}
          transition={transition}
        >
          {step === "fr00" ? (
            <div
              className="fr-splash"
              data-testid="fr00-splash"
              data-figma-dated="618:19"
              data-figma-authority="618:19"
              data-figma-node="618:19"
              data-viewport="390x844"
              data-splash-frame="full"
              aria-label={`${PRODUCT_PUBLIC_NAME}. Talk. Align. Go.`}
            >
              <div className="fr-splash-aura" aria-hidden data-figma-node="631:2" />
              <motion.div
                className="fr-splash-mark"
                initial={reduce ? false : { opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={reduce ? { duration: 0 } : { duration: 0.55, ease: EASE_OUT }}
              >
                <img
                  className="fr-splash-spectral-emblem"
                  src={BRAND_ASSETS.opalGraphEmblemHero}
                  alt=""
                  width={176}
                  height={176}
                  draggable={false}
                  data-brand-role="emblem-only"
                  data-brand-source="opal-graph-emblem-spectral-human-alignment"
                  data-figma-node="631:3"
                />
              </motion.div>
              <motion.h1
                className="fr-splash-wordmark"
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  reduce ? { duration: 0 } : { duration: 0.45, delay: 0.18, ease: EASE_OUT }
                }
              >
                <span className="opal-graph-word-opal">OPAL</span>
                <span className="opal-graph-word-graph"> GRAPH</span>
              </motion.h1>
              <motion.p
                className="fr-splash-mechanic"
                data-testid="opal-graph-tagline"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={
                  reduce ? { duration: 0 } : { duration: 0.4, delay: 0.32, ease: EASE_OUT }
                }
              >
                TALK. ALIGN. GO.
              </motion.p>
              <div className="fr-splash-actions">
                {/* Visible per 618:19. Still routes to Promise (cannot skip Promise). */}
                <button
                  type="button"
                  className="fr-splash-skip"
                  data-testid="fr00-skip-intro"
                  onClick={(e) => leaveSplashToPromise(e)}
                >
                  Skip intro
                </button>
                <button
                  type="button"
                  className="fr-splash-tap"
                  data-testid="fr00-tap-begin"
                  onClick={(e) => leaveSplashToPromise(e)}
                >
                  {FR_COPY.splashTap}
                </button>
                <button
                  type="button"
                  className="fr-splash-returning"
                  data-testid="fr00-already-account"
                  onClick={goSignInFromSplash}
                >
                  {FR_COPY.alreadyAccount}
                </button>
              </div>
            </div>
          ) : null}

          {/*
            frPromise REMOVED from critical path (2026-08-25).
            Promise is FirstRunPromisePage at OpalApp top-level.
            Do not remount OpalPromiseScreen inside .fr-void / Motion.
          */}
          {false && step === "frPromise" ? (
            <div data-testid="legacy-frPromise-off-path" hidden aria-hidden />
          ) : null}

          {/* Legacy SFR demo screens retained off-route for historical tests */}
          {false && step === "fr01" ? (
            <div
              className="fr-screen fr-world"
              data-testid="fr01-world"
              data-fr-motion="staged"
              data-fr-mode="cinematic-autoplay"
              role="presentation"
              onClick={() => onDemoSceneActivate("fr01")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onDemoSceneActivate("fr01");
              }}
            >
              <BrandChrome />
              <motion.div
                className="fr-world-head"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={reduce ? { duration: 0 } : { delay: 0.05, duration: 0.3 }}
              >
                <span className="fr-vista-pill" aria-hidden>
                  {FR_COPY.vista}
                </span>
              </motion.div>
              <motion.h1
                className="fr-title"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduce ? { duration: 0 } : { delay: 0.1, duration: 0.35, ease: EASE_OUT }}
              >
                {FR_COPY.worldTitle}
              </motion.h1>
              <motion.p
                className="fr-body"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={reduce ? { duration: 0 } : { delay: 0.18, duration: 0.3 }}
              >
                {FR_COPY.worldBody}
              </motion.p>
              <motion.div
                className="fr-mode-row"
                role="list"
                aria-label="Ways your world shows up"
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduce ? { duration: 0 } : { delay: 0.28, duration: 0.35, ease: EASE_OUT }}
              >
                <span className="fr-mode-chip" role="listitem">
                  {FR_COPY.graph}
                </span>
                <span className="fr-mode-chip is-live" role="listitem">
                  {FR_COPY.live}
                </span>
                <span className="fr-mode-chip" role="listitem">
                  {FR_COPY.memory}
                </span>
              </motion.div>
              <motion.article
                className="fr-card fr-card-graph"
                aria-label="Graph preview"
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduce ? { duration: 0 } : { delay: 0.42, duration: 0.4, ease: EASE_OUT }}
              >
                <div className="fr-card-row">
                  <Avatar name="Chanelle" initial="C" tone="#6EE7F5" size={44} />
                  <div>
                    <strong>Chanelle</strong>
                    <span className="fr-meta"> 2m · Graph</span>
                  </div>
                </div>
                <div className="fr-card-media" aria-hidden>
                  <img src="/figma-v2/home-201/media-juniper.png" alt="" />
                </div>
                <div className="fr-card-footer">
                  <div>
                    <p className="fr-card-title">Juniper & Ivy tonight</p>
                    <p className="fr-meta">7:30 PM · San Diego</p>
                    <p className="fr-meta">Sadeil and Sabrina are interested</p>
                  </div>
                  <motion.span
                    className="fr-pill-cta"
                    aria-hidden
                    initial={reduce ? false : { opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={reduce ? { duration: 0 } : { delay: 0.7, duration: 0.3 }}
                  >
                    {FR_COPY.idGo}
                  </motion.span>
                </div>
              </motion.article>
              <motion.article
                className="fr-card fr-card-memory"
                aria-label="Memory preview"
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduce ? { duration: 0 } : { delay: 0.85, duration: 0.35, ease: EASE_OUT }}
              >
                <div className="fr-card-row">
                  <Avatar name="Maya" initial="M" tone="#8B7CFF" size={36} />
                  <div>
                    <strong>Maya</strong>
                    <span className="fr-meta"> 15m · Memory</span>
                  </div>
                  <img
                    className="fr-thumb"
                    src="/figma-v2/home-201/media-maya.png"
                    alt=""
                    aria-hidden
                  />
                </div>
                <p className="fr-card-title">Sunset walk at Fletcher Cove</p>
                <p className="fr-meta">Last night</p>
              </motion.article>
              <motion.article
                className="fr-card fr-card-near"
                aria-label="Near you preview"
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduce ? { duration: 0 } : { delay: 1.05, duration: 0.35, ease: EASE_OUT }}
              >
                <Avatar name="Near" initial="◎" tone="#3DDF9A" size={40} />
                <div className="fr-near-copy">
                  <p className="fr-meta">{FR_COPY.nearYou}</p>
                  <p className="fr-card-title">Rooftop jazz</p>
                  <p className="fr-meta">9 min away</p>
                </div>
                <span className="fr-linkish" aria-hidden>
                  {FR_COPY.checkItOut}
                </span>
              </motion.article>
              <div className="fr-sfr-nav" data-testid="fr-sfr-nav-fr01">
                <button type="button" className="fr-splash-skip" data-testid="fr01-skip" onClick={skipIntroToConversion}>
                  Skip
                </button>
                <button type="button" className="btn primary fr-primary" data-testid="fr01-swipe" onClick={() => onDemoSceneActivate("fr01")}>
                  Swipe to continue
                </button>
              </div>

            </div>
          ) : null}

          {step === "fr02" ? (
            <div
              className="fr-screen fr-who"
              data-testid="fr02-who"
              data-fr-motion="staged"
              data-fr-mode="cinematic-autoplay"
              role="presentation"
              onClick={() => onDemoSceneActivate("fr02")}
            >
              <BrandChrome />
              <motion.h1
                className="fr-title"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduce ? { duration: 0 } : { duration: 0.35, ease: EASE_OUT }}
              >
                {FR_COPY.whoTitle}
              </motion.h1>
              <p className="fr-body">{FR_COPY.whoBody}</p>
              <p className="fr-demo-note" role="note">
                Demo only. Nothing is sent.
              </p>
              <div className="fr-who-grid" role="group" aria-label="People">
                {FR_FIXTURE_PEOPLE.filter((p) =>
                  ["maya", "jordan", "chanelle", "sam", "alex", "sabrina", "nina", "taylor", "riley"].includes(
                    p.id,
                  ),
                ).map((p, i) => (
                  <motion.div
                    key={p.id}
                    className="fr-who-cell"
                    initial={reduce ? false : { opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={
                      reduce ? { duration: 0 } : { delay: 0.05 * i, duration: 0.28, ease: EASE_OUT }
                    }
                  >
                    <Avatar
                      name={p.name}
                      initial={p.initial}
                      tone={p.tone}
                      size={72}
                      selected={selectedWho.has(p.id)}
                      testId={`fr02-person-${p.id}`}
                    />
                    <span className="fr-who-name">{p.name}</span>
                  </motion.div>
                ))}
              </div>
              <motion.div
                className="fr-segment"
                role="group"
                aria-label="How to send"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={reduce ? { duration: 0 } : { delay: 0.45, duration: 0.3 }}
              >
                <span
                  className={`fr-segment-btn ${!together ? "is-active" : ""}`}
                  aria-hidden
                >
                  {FR_COPY.sendSeparately}
                </span>
                <motion.span
                  className={`fr-segment-btn ${together ? "is-active" : ""}`}
                  aria-hidden
                  initial={reduce ? false : { scale: 0.96 }}
                  animate={{ scale: 1 }}
                  transition={reduce ? { duration: 0 } : { delay: 0.7, duration: 0.25 }}
                >
                  {FR_COPY.together}
                </motion.span>
              </motion.div>
              <div className="fr-sfr-nav" data-testid="fr-sfr-nav-fr02">
                <button type="button" className="fr-splash-skip" data-testid="fr02-skip" onClick={skipIntroToConversion}>
                  Skip
                </button>
                <button type="button" className="btn primary fr-primary" data-testid="fr02-swipe" onClick={() => onDemoSceneActivate("fr02")}>
                  Swipe to continue
                </button>
              </div>

            </div>
          ) : null}

          {step === "fr03" ? (
            <div
              className="fr-screen fr-ambient"
              data-testid="fr03-ambient"
              data-fr-motion="staged"
              data-fr-mode="cinematic-autoplay"
              role="presentation"
              onClick={() => onDemoSceneActivate("fr03")}
            >
              <BrandChrome />
              <div className="fr-chat-head">
                <Avatar name="Chanelle" initial="C" tone="#6EE7F5" size={48} />
                <div>
                  <strong>Chanelle</strong>
                  <p className="fr-meta">Direct connection</p>
                </div>
              </div>
              <div className="fr-chat-thread" aria-label="Conversation preview">
                <motion.div
                  className="fr-bubble out"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reduce ? { duration: 0 } : { delay: 0.1, duration: 0.3 }}
                >
                  <span className="fr-bubble-label">You</span>
                  Juniper tonight?
                </motion.div>
                <motion.div
                  className="fr-bubble in"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reduce ? { duration: 0 } : { delay: 0.45, duration: 0.3 }}
                >
                  <span className="fr-bubble-label">Chanelle</span>
                  I can do 7:30.
                </motion.div>
              </div>
              <motion.div
                className="fr-opal-card"
                role="status"
                aria-label={FR_COPY.ambientOpal}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduce ? { duration: 0 } : { delay: 0.95, duration: 0.45, ease: EASE_OUT }}
              >
                <p className="fr-opal-kicker">{FR_COPY.ambientOpal}</p>
                <div className="fr-opal-place">
                  <div className="fr-opal-thumb" aria-hidden>
                    <img src="/demo/moments/food.jpg" alt="" />
                  </div>
                  <div>
                    <p className="fr-card-title">Juniper & Ivy</p>
                    <p className="fr-meta">Saturday · 7:30 PM</p>
                  </div>
                </div>
                <div className="fr-chip-grid">
                  <span className="fr-truth-chip is-confirmed">{FR_COPY.tableReady}</span>
                  <span className="fr-truth-chip">{FR_COPY.leaveTime}</span>
                  <span className="fr-truth-chip">{FR_COPY.driveTime}</span>
                  <span className="fr-truth-chip is-free">{FR_COPY.chanelleFree}</span>
                </div>
                <p className="fr-meta fr-opal-quiet">{FR_COPY.nothingElse}</p>
              </motion.div>
              <div className="fr-composer-fake" aria-hidden>
                <span>{FR_COPY.messageChanelle}</span>
              </div>
              <div className="fr-sfr-nav" data-testid="fr-sfr-nav-fr03">
                <button type="button" className="fr-splash-skip" data-testid="fr03-skip" onClick={skipIntroToConversion}>
                  Skip
                </button>
                <button type="button" className="btn primary fr-primary" data-testid="fr03-swipe" onClick={() => onDemoSceneActivate("fr03")}>
                  Swipe to continue
                </button>
              </div>

            </div>
          ) : null}

          {step === "fr04" ? (
            <div
              className="fr-screen fr-live"
              data-testid="fr04-live"
              data-fr-motion="staged"
              data-fr-mode="cinematic-autoplay"
              role="presentation"
              onClick={() => onDemoSceneActivate("fr04")}
            >
              <BrandChrome />
              <h1 className="fr-title">{FR_COPY.liveTitle}</h1>
              <p className="fr-body">{FR_COPY.liveBody}</p>
              <p className="fr-demo-note" role="note">
                Happening now. Real life, not a livestream. Product preview.
              </p>
              <motion.article
                className="fr-live-panel"
                aria-label="Live preview"
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduce ? { duration: 0 } : { delay: 0.15, duration: 0.4, ease: EASE_OUT }}
              >
                <div className="fr-live-badges">
                  <motion.span
                    className="fr-live-pill"
                    initial={reduce ? false : { scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={reduce ? { duration: 0 } : { delay: 0.25, duration: 0.3 }}
                  >
                    {FR_COPY.liveBadge}
                  </motion.span>
                  <span className="fr-meta">{FR_COPY.happeningNow}</span>
                </div>
                <div className="fr-live-hero">
                  <div>
                    <p className="fr-card-title">Juniper & Ivy</p>
                    <p className="fr-meta">Downtown San Diego</p>
                  </div>
                  <div className="fr-live-lead">
                    <Avatar name="Chanelle" initial="C" tone="#6EE7F5" size={64} />
                    <span className="fr-meta">{FR_COPY.ledBy}</span>
                  </div>
                </div>
                <ul className="fr-live-feed">
                  <li>
                    <Avatar name="Sadeil" initial="S" tone="#6EE7F5" size={36} />
                    <div>
                      <strong>{FR_COPY.sadeilLocked}</strong>
                      <p className="fr-meta">{FR_COPY.justNow}</p>
                    </div>
                  </li>
                  <li>
                    <Avatar name="Sabrina" initial="S" tone="#E8D5C4" size={36} />
                    <div>
                      <strong>{FR_COPY.sabrinaOnWay}</strong>
                      <p className="fr-meta">{FR_COPY.eta8}</p>
                    </div>
                  </li>
                </ul>
                <div className="fr-truth-row is-confirmed">{FR_COPY.tableReadyNews}</div>
                <div className="fr-truth-row">{FR_COPY.etaSeeYou}</div>
                <button type="button" className="btn primary fr-onway" disabled tabIndex={-1}>
                  {FR_COPY.onMyWay}
                </button>
              </motion.article>
              <p className="fr-meta fr-center">{FR_COPY.bestPart}</p>
              <div className="fr-sfr-nav" data-testid="fr-sfr-nav-fr04">
                <button type="button" className="fr-splash-skip" data-testid="fr04-skip" onClick={skipIntroToConversion}>
                  Skip
                </button>
                <button type="button" className="btn primary fr-primary" data-testid="fr04-swipe" onClick={() => onDemoSceneActivate("fr04")}>
                  Swipe to continue
                </button>
              </div>

            </div>
          ) : null}

          {step === "fr05" ? (
            <div className="fr-screen fr-start" data-testid="fr05-start" data-fr-mode="conversion-gate">
              <BrandChrome />
              <h1 className="fr-title">{FR_COPY.startTitle}</h1>
              <p className="fr-body">{FR_COPY.startBody}</p>
              <p className="fr-body fr-emphasis">{FR_COPY.circleStays}</p>
              <ul className="fr-social-list" aria-label="Your circle examples">
                <li className="fr-social-row">
                  <Avatar name="Chanelle" initial="C" tone="#6EE7F5" size={48} />
                  <div>
                    <strong>Chanelle</strong>
                    <span className="fr-meta"> 2m</span>
                    <p className="fr-meta">Sunset hike with the crew</p>
                  </div>
                </li>
                <li className="fr-social-row">
                  <Avatar name="Maya" initial="M" tone="#8B7CFF" size={48} />
                  <div>
                    <strong>Maya</strong>
                    <span className="fr-meta"> 15m</span>
                    <p className="fr-meta">Late night study session</p>
                  </div>
                </li>
                <li className="fr-social-row">
                  <Avatar name="Jordan" initial="J" tone="#3DDF9A" size={48} />
                  <div>
                    <strong>Jordan</strong>
                    <span className="fr-meta"> 1h</span>
                    <p className="fr-meta">New skate spot</p>
                  </div>
                </li>
              </ul>
              <button
                type="button"
                className="btn primary fr-primary"
                data-testid="fr05-continue-phone"
                onClick={() => goAuth(false)}
              >
                {FR_COPY.continuePhone}
              </button>
              <button
                type="button"
                className="btn ghost fr-secondary"
                data-testid="fr05-already-account"
                onClick={() => goAuth(true)}
              >
                {FR_COPY.alreadyAccount}
              </button>
            </div>
          ) : null}

          {step === "fr06" ? (
            <div
              className="fr-screen fr-phone fr-auth-v4"
              data-testid="fr06-phone"
              data-figma-authority="773:27"
              data-figma-node="773:27"
              data-viewport="390x844"
            >
              <AuthHeroMark />
              <h1 className="fr-title">{FR_COPY.phoneTitle}</h1>
              <p className="fr-body">{FR_COPY.phoneBody}</p>
              {/* One message slot: error wins over status — never collide in the same region. */}
              {error ? (
                <p className="fr-error" role="alert" data-testid="fr06-error">
                  {error}
                </p>
              ) : statusLine ? (
                <p className="fr-status" role="status" aria-live="polite" data-testid="fr06-status">
                  {statusLine}
                </p>
              ) : null}
              <form
                className="fr-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void start();
                }}
              >
                <label htmlFor="fr-phone" className="sr-only">
                  Phone number
                </label>
                <div className="fr-phone-field" data-international="true">
                  <label className="sr-only" htmlFor="fr-dial">
                    Country or region code
                  </label>
                  <select
                    id="fr-dial"
                    className="fr-cc fr-dial-select"
                    value={dialCode}
                    aria-label="Country or region code"
                    data-testid="fr06-dial-select"
                    onChange={(e) => setDialCode(e.target.value)}
                  >
                    {PHONE_DIAL_OPTIONS.map((o) => (
                      <option key={o.dial} value={o.dial}>
                        {o.label} ▾
                      </option>
                    ))}
                  </select>
                  <input
                    id="fr-phone"
                    className="composer-input fr-input"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder={FR_COPY.phonePlaceholder}
                    value={phone}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPhone(v);
                      // Pasted full E.164 - adopt dial from it when recognized
                      if (v.trim().startsWith("+")) {
                        const hit = PHONE_DIAL_OPTIONS.find((o) =>
                          v.trim().startsWith(o.dial),
                        );
                        if (hit) setDialCode(hit.dial);
                      }
                    }}
                    required
                    aria-describedby="fr-phone-hint fr-otp-consent-desc"
                    data-testid="fr06-phone-input"
                  />
                </div>
                <p className="fr-phone-hint" id="fr-phone-hint" data-testid="fr06-phone-hint">
                  {FR_COPY.phoneHint}
                </p>
                <fieldset className="fr-consent">
                  <legend className="sr-only">Text message consent</legend>
                  <label className="fr-consent-label" htmlFor="fr-otp-consent">
                    <input
                      id="fr-otp-consent"
                      type="checkbox"
                      checked={otpConsent}
                      onChange={(e) => setOtpConsent(e.target.checked)}
                      required
                      data-testid="fr06-otp-consent"
                    />
                    <span id="fr-otp-consent-desc">{FR_COPY.consentLabel}</span>
                  </label>
                  <p id="fr-otp-rates" className="fr-meta">
                    {FR_COPY.rates}
                  </p>
                </fieldset>
                <button
                  type="submit"
                  className="btn primary fr-primary"
                  disabled={busy || !phone.trim() || !otpConsent}
                  data-testid="fr06-continue"
                >
                  {busy ? FR_COPY.busy : FR_COPY.continue}
                </button>
                <button
                  type="button"
                  className="fr-text-action fr-skip-for-now"
                  data-testid="fr06-skip-for-now"
                  onClick={() => {
                    void founderSkipForNow();
                  }}
                >
                  {FR_COPY.skipForNow}
                </button>
              </form>
            </div>
          ) : null}

          {step === "fr07" ? (
            <div
              className="fr-screen fr-verify fr-auth-v4"
              data-testid="fr07-verify"
              data-figma-authority="773:52"
              data-figma-node="773:52"
              data-viewport="390x844"
            >
              <AuthHeroMark />
              <h1 className="fr-title">{FR_COPY.verifyTitle}</h1>
              <p className="fr-body">
                {FR_COPY.verifySent(prettyPhone(phone, dialCode))}
              </p>
              {error ? (
                <p className="fr-error" role="alert" data-testid="fr07-error">
                  {error}
                </p>
              ) : statusLine ? (
                <p className="fr-status" role="status" aria-live="polite" data-testid="fr07-status">
                  {statusLine}
                </p>
              ) : null}
              <form
                className="fr-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void verify();
                }}
              >
                <label htmlFor="fr-code" className="sr-only">
                  Six digit code
                </label>
                <div className="fr-code-wrap">
                  <div className="fr-code-cells" aria-hidden>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <span key={i} className="fr-code-cell">
                        {code.replace(/\D/g, "")[i] || ""}
                      </span>
                    ))}
                  </div>
                  <input
                    id="fr-code"
                    className="composer-input fr-input fr-code-input fr-code-input-bridge"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => onCodeChange(e.target.value)}
                    maxLength={6}
                    pattern="\d{6}"
                    required
                    data-testid="fr07-code-input"
                  />
                </div>
                {/* Dev OTP: console/harness only - never in product viewport */}
                <button
                  type="button"
                  className="btn ghost fr-secondary"
                  disabled={busy || resendCooldown > 0}
                  onClick={() => void resend()}
                  data-testid="fr07-resend"
                >
                  {resendCooldown > 0
                    ? `${FR_COPY.resend} (${resendCooldown}s)`
                    : FR_COPY.resend}
                </button>
                <button
                  type="submit"
                  className="btn primary fr-primary"
                  disabled={busy || code.replace(/\D/g, "").length !== 6}
                  data-testid="fr07-submit"
                >
                  {busy ? FR_COPY.checking : FR_COPY.verify}
                </button>
                <button
                  type="button"
                  className="fr-text-action fr-change-number"
                  disabled={busy}
                  onClick={() => {
                    setStep("fr06");
                    setError(null);
                    setStatusLine(null);
                    setCode("");
                    setChallengeId("");
                    setDevCode(null);
                  }}
                  data-testid="fr07-change-number"
                >
                  {FR_COPY.changeNumber}
                </button>
              </form>
            </div>
          ) : null}

          {step === "fr08" ? (
            <div
              className="fr-screen fr-profile fr-auth-v4"
              data-testid="fr08-profile"
              data-figma-authority="773:80"
              data-figma-node="773:80"
              data-viewport="390x844"
            >
              <AuthHeroMark />
              <h1 className="fr-title">{FR_COPY.profileTitle}</h1>
              <p className="fr-body">{FR_COPY.profileBody}</p>
              {error ? (
                <p className="fr-error" role="alert">
                  {error}
                </p>
              ) : null}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="user"
                hidden
                data-testid="fr08-photo-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
                  const url = URL.createObjectURL(file);
                  setPhotoPreviewUrl(url);
                  // No durable user-avatar persistence owner in Accounts yet.
                  setPhotoPersistenceGap(true);
                }}
              />
              <button
                type="button"
                className="fr-profile-photo"
                data-profile-photo="action"
                data-testid="fr08-add-photo"
                data-participation-action="add_photo"
                aria-label="Add photo"
                onClick={() => photoInputRef.current?.click()}
              >
                <span className="fr-profile-ring">
                  {photoPreviewUrl ? (
                    <img
                      className="fr-profile-img"
                      src={photoPreviewUrl}
                      alt=""
                      data-testid="fr08-photo-preview"
                    />
                  ) : (
                    <span className="fr-profile-initials" aria-hidden data-testid="fr08-initials">
                      {initialsFromName(displayName || "You")}
                    </span>
                  )}
                </span>
                {/* Edit badge is screen-absolute (214,294) - must not live inside overflow:hidden ring */}
                <span className="fr-profile-edit" aria-hidden data-testid="fr08-photo-edit-badge">
                  ✎
                </span>
                <span className="fr-add-photo-label" data-testid="fr08-photo-label">
                  Add photo
                </span>
                {photoPersistenceGap ? (
                  <span className="fr-meta fr-center" data-testid="fr08-photo-persistence-gap">
                    Preview ready. Durable profile photo upload is not available in this build
                  </span>
                ) : null}
              </button>
              <form
                className="fr-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveProfileAndContinue();
                }}
              >
                <label htmlFor="fr-name">{FR_COPY.nameLabel}</label>
                <input
                  id="fr-name"
                  className="composer-input fr-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Sadeil"
                  autoComplete="name"
                  required
                  maxLength={128}
                  data-testid="fr08-name-input"
                />
                <label htmlFor="fr-username">{FR_COPY.usernameLabel}</label>
                <input
                  id="fr-username"
                  className="composer-input fr-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="@sadeil"
                  autoComplete="username"
                  maxLength={64}
                  data-testid="fr08-username-input"
                />
                <p className="fr-meta">{FR_COPY.usernameOptional}</p>
                <button
                  type="submit"
                  className="btn primary fr-primary"
                  disabled={busy || !displayName.trim()}
                  data-testid="fr08-continue"
                >
                  {busy ? FR_COPY.busy : FR_COPY.continue}
                </button>
              </form>
            </div>
          ) : null}

          {step === "fr09" ? (
            <div
              className="fr-screen fr-find fr-auth-v4"
              data-testid="fr09-find"
              data-figma-authority="773:113"
              data-figma-node="773:113"
              data-viewport="390x844"
            >
              <AuthHeroMark />
              <h1 className="fr-title">{FR_COPY.findTitle}</h1>
              <p className="fr-body">{FR_COPY.findBody}</p>
              <div className="fr-find-card" data-testid="fr09-contacts-card">
                <span className="fr-find-card-icon" aria-hidden>
                  ◎
                </span>
                <div>
                  <strong>{FR_COPY.connectContacts}</strong>
                  <p className="fr-meta">{FR_COPY.optional}</p>
                  <p className="fr-meta">{FR_COPY.contactsPrivacy}</p>
                </div>
              </div>
              <div className="fr-find-actions">
              <button
                type="button"
                className="btn primary fr-primary"
                data-testid="fr09-connect"
                onClick={() => setFindOpen(true)}
              >
                {FR_COPY.connectContacts}
              </button>
              <button
                type="button"
                className="fr-not-now"
                data-testid="fr09-not-now"
                onClick={() => finishToHome()}
              >
                {FR_COPY.notNow}
              </button>
              </div>
              {session ? (
                <FindPeopleFlow
                  open={findOpen}
                  onClose={() => {
                    setFindOpen(false);
                    finishToHome();
                  }}
                  bearer={session.access_token}
                  onInvited={() => {
                    /* keep sheet open until Done; FindPeopleFlow closes itself */
                  }}
                />
              ) : null}
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
