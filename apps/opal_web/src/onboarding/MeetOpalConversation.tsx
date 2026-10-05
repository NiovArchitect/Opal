/**
 * Holy Shit Moments 2–5 — immersive Meet Opal (rebuild).
 * Full-screen presence. Flex column only. Opal owns the screen.
 * State machine: greeting → ask_name → ask_when → ask_vibe → working → trust.
 */
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  HOLY_SHIT_COPY,
  type HolyShitOnboardingState,
  type HolyShitSpot,
  type HolyShitVibe,
  type HolyShitWhen,
  type MeetOpalPhase,
} from "./holyShitCopy";
import { HsTypingDots, OpalPresenceOrb, type OpalOrbMode } from "./OpalPresenceOrb";
import { OpalWorking } from "./OpalWorking";
import { TrustContractCard } from "./TrustContractCard";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const GREETING_SLIDE_MS = 400;
const ASK_NAME_PAUSE_MS = 800;
const TYPING_MS = 650;
const MSG_SLIDE_MS = 300;
const PILL_AFTER_MSG_MS = 200;
const PILL_STAGGER_MS = 50;

type Props = {
  bearer?: string | null;
  onComplete: (state: HolyShitOnboardingState) => void;
  onSkipToAuth?: () => void;
};

async function persistOnboardingContact(name: string, bearer?: string | null): Promise<boolean> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    const res = await fetch("/api/v1/product/onboarding/contact", {
      method: "POST",
      headers,
      body: JSON.stringify({ name }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

type Line =
  | { kind: "opal"; id: string; text: string }
  | { kind: "you"; id: string; text: string };

function OpalLine({ text, testId, index }: { text: string; testId: string; index: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="hs-line hs-line-opal"
      data-testid={testId}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduce
          ? { duration: 0 }
          : { duration: MSG_SLIDE_MS / 1000, delay: Math.min(index, 3) * 0.1, ease: EASE_OUT }
      }
    >
      <p className="hs-line-body">{text}</p>
    </motion.div>
  );
}

function YouLine({ text }: { text: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="hs-line hs-line-you"
      data-testid="hs-you-bubble"
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { duration: MSG_SLIDE_MS / 1000, ease: EASE_OUT }}
    >
      <p className="hs-line-body">{text}</p>
    </motion.div>
  );
}

export function MeetOpalConversation({ bearer, onComplete, onSkipToAuth }: Props) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<MeetOpalPhase>("greeting");
  const [orbMode, setOrbMode] = useState<OpalOrbMode>("typing");
  const [showTyping, setShowTyping] = useState(true);
  const [showGreeting, setShowGreeting] = useState(false);
  const [showAskName, setShowAskName] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [contactName, setContactName] = useState("");
  const [when, setWhen] = useState<HolyShitWhen | null>(null);
  const [vibe, setVibe] = useState<HolyShitVibe | null>(null);
  const [spot, setSpot] = useState<HolyShitSpot | null>(null);
  const [contactPersisted, setContactPersisted] = useState(false);
  const [showWhenPills, setShowWhenPills] = useState(false);
  const [showVibePills, setShowVibePills] = useState(false);
  const [pendingOpal, setPendingOpal] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Moment 2: typing → greeting slide → 800ms → typing → ask_name → input
  useEffect(() => {
    if (phase !== "greeting") return;
    if (reduce) {
      setShowTyping(false);
      setShowGreeting(true);
      setShowAskName(true);
      setShowNameInput(true);
      setOrbMode("idle");
      setPhase("ask_name");
      return;
    }
    const tGreet = window.setTimeout(() => {
      setShowTyping(false);
      setShowGreeting(true);
      setOrbMode("idle");
    }, TYPING_MS);
    const tAskTyping = window.setTimeout(() => {
      setShowTyping(true);
      setOrbMode("typing");
    }, TYPING_MS + GREETING_SLIDE_MS + ASK_NAME_PAUSE_MS);
    const tAsk = window.setTimeout(() => {
      setShowTyping(false);
      setShowAskName(true);
      setPhase("ask_name");
      setOrbMode("idle");
    }, TYPING_MS + GREETING_SLIDE_MS + ASK_NAME_PAUSE_MS + TYPING_MS);
    return () => {
      window.clearTimeout(tGreet);
      window.clearTimeout(tAskTyping);
      window.clearTimeout(tAsk);
    };
  }, [phase, reduce]);

  // Composer reveal lives outside the greeting effect so phase→ask_name cleanup
  // cannot cancel the input timeout.
  useEffect(() => {
    if (phase !== "ask_name" || showNameInput || contactName) return;
    if (reduce) {
      setShowNameInput(true);
      return;
    }
    const t = window.setTimeout(() => setShowNameInput(true), 120);
    return () => window.clearTimeout(t);
  }, [phase, showNameInput, contactName, reduce]);

  useEffect(() => {
    if (showNameInput) inputRef.current?.focus();
  }, [showNameInput]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [
    phase,
    showGreeting,
    showAskName,
    showWhenPills,
    showVibePills,
    spot,
    when,
    vibe,
    contactName,
    showTyping,
    pendingOpal,
    reduce,
  ]);

  // Theatrical typing before ask_when / ask_vibe lines
  useEffect(() => {
    if (!pendingOpal) return;
    if (reduce) {
      setPendingOpal(null);
      return;
    }
    setShowTyping(true);
    setOrbMode("typing");
    const t = window.setTimeout(() => {
      setShowTyping(false);
      setOrbMode(phase === "working" ? "working" : "idle");
      setPendingOpal(null);
    }, TYPING_MS);
    return () => window.clearTimeout(t);
  }, [pendingOpal, phase, reduce]);

  useEffect(() => {
    if (phase !== "ask_when" || pendingOpal) return;
    if (reduce) {
      setShowWhenPills(true);
      return;
    }
    const t = window.setTimeout(() => setShowWhenPills(true), PILL_AFTER_MSG_MS);
    return () => window.clearTimeout(t);
  }, [phase, pendingOpal, reduce]);

  useEffect(() => {
    if (phase !== "ask_vibe" || pendingOpal) return;
    if (reduce) {
      setShowVibePills(true);
      return;
    }
    const t = window.setTimeout(() => setShowVibePills(true), PILL_AFTER_MSG_MS);
    return () => window.clearTimeout(t);
  }, [phase, pendingOpal, reduce]);

  useEffect(() => {
    if (phase === "working") setOrbMode("working");
    else if (phase === "trust") setOrbMode("ready");
  }, [phase]);

  const submitName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    setContactName(trimmed);
    setPendingOpal("ask_when");
    setPhase("ask_when");
    const ok = await persistOnboardingContact(trimmed, bearer);
    setContactPersisted(ok);
  };

  const pickWhen = (w: HolyShitWhen) => {
    setWhen(w);
    setShowWhenPills(false);
    setPendingOpal("ask_vibe");
    setPhase("ask_vibe");
  };

  const pickVibe = (v: HolyShitVibe) => {
    setVibe(v);
    setShowVibePills(false);
    setPhase("working");
    setOrbMode("working");
  };

  const selectSpot = (s: HolyShitSpot) => {
    setSpot(s);
    setPhase("trust");
    setOrbMode("ready");
  };

  const finish = (selected: HolyShitSpot | null) => {
    onComplete({
      contactName,
      when,
      vibe,
      spot: selected,
      contactPersisted,
    });
  };

  const lines: Line[] = [];
  if (showGreeting) lines.push({ kind: "opal", id: "greeting", text: HOLY_SHIT_COPY.greeting });
  if (showAskName) lines.push({ kind: "opal", id: "ask_name", text: HOLY_SHIT_COPY.askName });
  if (contactName) lines.push({ kind: "you", id: "name", text: contactName });
  if (
    !pendingOpal &&
    (phase === "ask_when" || phase === "ask_vibe" || phase === "working" || phase === "trust")
  ) {
    lines.push({ kind: "opal", id: "ask_when", text: HOLY_SHIT_COPY.askWhen(contactName) });
  }
  if (when) lines.push({ kind: "you", id: "when", text: when });
  if (!pendingOpal && (phase === "ask_vibe" || phase === "working" || phase === "trust")) {
    lines.push({ kind: "opal", id: "ask_vibe", text: HOLY_SHIT_COPY.askVibe });
  }
  if (vibe) lines.push({ kind: "you", id: "vibe", text: vibe });

  const showComposer = phase === "ask_name" && showNameInput && !contactName;
  const showWhenRow = phase === "ask_when" && showWhenPills && !when && !pendingOpal;
  const showVibeRow = phase === "ask_vibe" && showVibePills && !vibe && !pendingOpal;

  return (
    <div
      className="hs-meet-opal"
      data-testid="meet-opal-conversation"
      data-hs-phase={phase}
      data-orb-mode={orbMode}
      data-first-run-stage="meet_opal"
      role="main"
      aria-label="Meet Opal"
    >
      <div className="hs-meet-atmosphere" aria-hidden />

      <div className="hs-meet-top">
        {onSkipToAuth ? (
          <button
            type="button"
            className="hs-meet-skip"
            data-testid="hs-skip-to-auth"
            onClick={onSkipToAuth}
          >
            Skip
          </button>
        ) : (
          <span className="hs-meet-skip-spacer" aria-hidden />
        )}
        <div className="hs-meet-orb-wrap">
          <OpalPresenceOrb mode={orbMode} size={80} />
        </div>
      </div>

      <div className="hs-meet-scroll" ref={scrollerRef}>
        <div className="hs-meet-thread">
          {lines.map((line, i) =>
            line.kind === "opal" ? (
              <OpalLine
                key={line.id}
                text={line.text}
                testId={
                  line.id === "greeting"
                    ? "hs-opal-greeting"
                    : line.id === "ask_name"
                      ? "hs-opal-ask-name"
                      : line.id === "ask_when"
                        ? "hs-opal-ask-when"
                        : "hs-opal-ask-vibe"
                }
                index={i}
              />
            ) : (
              <YouLine key={line.id} text={line.text} />
            ),
          )}

          {showTyping ? (
            <div className="hs-line hs-line-typing" data-testid="hs-opal-typing">
              <HsTypingDots />
            </div>
          ) : null}

          <AnimatePresence mode="wait">
            {phase === "working" || phase === "trust" ? (
              <motion.div
                key="working"
                className="hs-meet-working-slot"
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
              >
                {vibe ? (
                  <OpalWorking
                    contactName={contactName}
                    vibe={vibe}
                    bearer={bearer}
                    onSelectSpot={selectSpot}
                    compact={phase === "trust"}
                  />
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {showComposer ? (
        <form
          className="hs-meet-composer"
          data-testid="hs-name-composer"
          onSubmit={(e) => {
            e.preventDefault();
            void submitName();
          }}
        >
          <input
            ref={inputRef}
            className="hs-meet-input"
            data-testid="hs-name-input"
            placeholder={HOLY_SHIT_COPY.namePlaceholder}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            autoComplete="name"
            enterKeyHint="done"
          />
          <button
            type="submit"
            className="hs-meet-send"
            data-testid="hs-name-submit"
            disabled={!nameDraft.trim()}
          >
            Continue
          </button>
        </form>
      ) : null}

      {showWhenRow ? (
        <div className="hs-pill-row" data-testid="hs-when-pills" role="group" aria-label="When">
          {HOLY_SHIT_COPY.whenPills.map((label, i) => (
            <motion.button
              key={label}
              type="button"
              className="hs-pill"
              data-testid={`hs-when-${label.toLowerCase().replace(/\s+/g, "-")}`}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : {
                      duration: 0.28,
                      delay: (PILL_STAGGER_MS * i) / 1000,
                      ease: EASE_OUT,
                    }
              }
              onClick={() => pickWhen(label)}
            >
              {label}
            </motion.button>
          ))}
        </div>
      ) : null}

      {showVibeRow ? (
        <div className="hs-pill-row" data-testid="hs-vibe-pills" role="group" aria-label="Vibe">
          {HOLY_SHIT_COPY.vibePills.map((label, i) => (
            <motion.button
              key={label}
              type="button"
              className="hs-pill"
              data-testid={`hs-vibe-${label.toLowerCase().replace(/\s+/g, "-")}`}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : {
                      duration: 0.28,
                      delay: (PILL_STAGGER_MS * i) / 1000,
                      ease: EASE_OUT,
                    }
              }
              onClick={() => pickVibe(label)}
            >
              {label}
            </motion.button>
          ))}
        </div>
      ) : null}

      {phase === "trust" && spot && when && vibe ? (
        <TrustContractCard
          contactName={contactName}
          vibe={vibe}
          when={when}
          spot={spot}
          bearer={bearer}
          onSend={() => finish(spot)}
          onNotYet={() => finish(spot)}
        />
      ) : null}
    </div>
  );
}
