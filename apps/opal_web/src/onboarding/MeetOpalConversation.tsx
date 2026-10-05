/**
 * Holy Shit Moments 2–5 — conversational Meet Opal (not a form).
 * State machine: greeting → ask_name → ask_when → ask_vibe → working → trust.
 */
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BRAND } from "../brand/brand";
import {
  HOLY_SHIT_COPY,
  type HolyShitOnboardingState,
  type HolyShitSpot,
  type HolyShitVibe,
  type HolyShitWhen,
  type MeetOpalPhase,
} from "./holyShitCopy";
import { OpalWorking } from "./OpalWorking";
import { TrustContractCard } from "./TrustContractCard";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const GREETING_SLIDE_MS = 400;
const ASK_NAME_PAUSE_MS = 800;
const PILL_AFTER_MSG_MS = 200;
const PILL_STAGGER_MS = 50;

type Props = {
  bearer?: string | null;
  onComplete: (state: HolyShitOnboardingState) => void;
  onSkipToAuth?: () => void;
};

/**
 * No /api/onboarding/contact in product. Persist name locally;
 * attempt onboarding contact POST once, ignore 404.
 */
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

function OpalBubble({
  text,
  testId,
  delayMs = 0,
}: {
  text: string;
  testId: string;
  delayMs?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="hs-bubble hs-bubble-opal"
      data-testid={testId}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduce
          ? { duration: 0 }
          : { duration: GREETING_SLIDE_MS / 1000, delay: delayMs / 1000, ease: EASE_OUT }
      }
    >
      <span className="hs-bubble-label">{BRAND.shortName}</span>
      <p className="hs-bubble-body">{text}</p>
    </motion.div>
  );
}

function YouBubble({ text }: { text: string }) {
  return (
    <div className="hs-bubble hs-bubble-you" data-testid="hs-you-bubble">
      <span className="hs-bubble-label">You</span>
      <p className="hs-bubble-body">{text}</p>
    </div>
  );
}

export function MeetOpalConversation({ bearer, onComplete, onSkipToAuth }: Props) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<MeetOpalPhase>("greeting");
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
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Moment 2 choreography: greeting slide-in → 800ms → ask_name + input
  useEffect(() => {
    if (phase !== "greeting") return;
    if (reduce) {
      setShowAskName(true);
      setShowNameInput(true);
      setPhase("ask_name");
      return;
    }
    const tAsk = window.setTimeout(() => {
      setShowAskName(true);
      setPhase("ask_name");
    }, GREETING_SLIDE_MS + ASK_NAME_PAUSE_MS);
    const tInput = window.setTimeout(() => {
      setShowNameInput(true);
    }, GREETING_SLIDE_MS + ASK_NAME_PAUSE_MS + 120);
    return () => {
      window.clearTimeout(tAsk);
      window.clearTimeout(tInput);
    };
  }, [phase, reduce]);

  useEffect(() => {
    if (showNameInput) inputRef.current?.focus();
  }, [showNameInput]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [phase, showAskName, showWhenPills, showVibePills, spot, when, vibe, contactName]);

  // When pills: 200ms after ask_when message
  useEffect(() => {
    if (phase !== "ask_when") return;
    if (reduce) {
      setShowWhenPills(true);
      return;
    }
    const t = window.setTimeout(() => setShowWhenPills(true), PILL_AFTER_MSG_MS);
    return () => window.clearTimeout(t);
  }, [phase, reduce]);

  // Vibe pills: 200ms after vibe prompt
  useEffect(() => {
    if (phase !== "ask_vibe") return;
    if (reduce) {
      setShowVibePills(true);
      return;
    }
    const t = window.setTimeout(() => setShowVibePills(true), PILL_AFTER_MSG_MS);
    return () => window.clearTimeout(t);
  }, [phase, reduce]);

  const submitName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    setContactName(trimmed);
    setPhase("ask_when");
    const ok = await persistOnboardingContact(trimmed, bearer);
    setContactPersisted(ok);
  };

  const pickWhen = (w: HolyShitWhen) => {
    setWhen(w);
    setPhase("ask_vibe");
  };

  const pickVibe = (v: HolyShitVibe) => {
    setVibe(v);
    setPhase("working");
  };

  const selectSpot = (s: HolyShitSpot) => {
    setSpot(s);
    setPhase("trust");
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

  return (
    <div
      className="hs-meet-opal"
      data-testid="meet-opal-conversation"
      data-hs-phase={phase}
      data-first-run-stage="meet_opal"
      role="main"
      aria-label="Meet Opal"
    >
      <header className="hs-meet-head">
        <p className="hs-meet-kicker">{BRAND.shortName}</p>
        {onSkipToAuth ? (
          <button
            type="button"
            className="hs-meet-skip"
            data-testid="hs-skip-to-auth"
            onClick={onSkipToAuth}
          >
            Skip
          </button>
        ) : null}
      </header>

      <div className="hs-meet-scroll" ref={scrollerRef}>
        <div className="hs-meet-thread">
          <OpalBubble text={HOLY_SHIT_COPY.greeting} testId="hs-opal-greeting" />

          {showAskName ? (
            <OpalBubble
              text={HOLY_SHIT_COPY.askName}
              testId="hs-opal-ask-name"
              delayMs={reduce ? 0 : 0}
            />
          ) : null}

          {contactName ? <YouBubble text={contactName} /> : null}

          {phase === "ask_when" ||
          phase === "ask_vibe" ||
          phase === "working" ||
          phase === "trust" ? (
            <OpalBubble
              text={HOLY_SHIT_COPY.askWhen(contactName)}
              testId="hs-opal-ask-when"
            />
          ) : null}

          {when ? <YouBubble text={when} /> : null}

          {phase === "ask_vibe" || phase === "working" || phase === "trust" ? (
            <OpalBubble text={HOLY_SHIT_COPY.askVibe} testId="hs-opal-ask-vibe" />
          ) : null}

          {vibe ? <YouBubble text={vibe} /> : null}

          <AnimatePresence>
            {phase === "working" || phase === "trust" ? (
              <motion.div
                key="working"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {vibe ? (
                  <OpalWorking
                    contactName={contactName}
                    vibe={vibe}
                    bearer={bearer}
                    onSelectSpot={selectSpot}
                  />
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>

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
      </div>

      {phase === "ask_name" && showNameInput && !contactName ? (
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

      {phase === "ask_when" && showWhenPills && !when ? (
        <div className="hs-pill-row" data-testid="hs-when-pills" role="group" aria-label="When">
          {HOLY_SHIT_COPY.whenPills.map((label, i) => (
            <motion.button
              key={label}
              type="button"
              className="hs-pill"
              data-testid={`hs-when-${label.toLowerCase().replace(/\s+/g, "-")}`}
              initial={reduce ? false : { opacity: 0, y: 8 }}
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

      {phase === "ask_vibe" && showVibePills && !vibe ? (
        <div className="hs-pill-row" data-testid="hs-vibe-pills" role="group" aria-label="Vibe">
          {HOLY_SHIT_COPY.vibePills.map((label, i) => (
            <motion.button
              key={label}
              type="button"
              className="hs-pill"
              data-testid={`hs-vibe-${label.toLowerCase().replace(/\s+/g, "-")}`}
              initial={reduce ? false : { opacity: 0, y: 8 }}
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
    </div>
  );
}
