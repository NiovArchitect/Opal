import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { OpalMark } from "../brand/OpalLogo";
import { PRODUCT_COPY } from "../designTokens";
import { OpeningBrandMark } from "../opalUi/v2Primitives";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export type FirstRunStep = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  scene: "welcome" | "spark" | "plan" | "follow" | "calm";
};

/** Walkthrough screens 1–4 preserved; screen 5 is conversion Join (pre-membership only). */
export const FIRST_RUN_STEPS: FirstRunStep[] = [
  {
    id: "welcome",
    kicker: "Opal",
    title: "Life starts in conversation.",
    body: "A private social medium for the people you actually talk to. Warmer and more alive than another chat list.",
    scene: "welcome",
  },
  {
    id: "spark",
    kicker: "Signal",
    title: "When talk becomes something real.",
    body: "“We should get dinner Thursday.” Opal notices the spark without turning your chat into a form.",
    scene: "spark",
  },
  {
    id: "plan",
    kicker: "Momentum",
    title: "Decide without killing the vibe.",
    body: "Times settle, places lock, “I’ll book it” becomes progress still inside the conversation.",
    scene: "plan",
  },
  {
    id: "follow",
    kicker: "Follow-through",
    title: "Moments that actually happen.",
    body: "Gentle follow-through and readiness so plans leave the chat and land in real life.",
    scene: "follow",
  },
  {
    id: "join",
    kicker: "Join",
    title: "More of what you talk about should actually happen.",
    body: "Opal understands what is taking shape and helps you make it happen with the people you actually talk to.",
    scene: "calm",
  },
];

type Props = {
  open: boolean;
  /** Called when user Skip (screens 1–4) or Join (final). Always goes to activation, never member shell. */
  onComplete: () => void;
};

export function FirstRunExperience({ open, onComplete }: Props) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const joiningRef = useRef(false);
  const step = FIRST_RUN_STEPS[index];
  const isLast = index >= FIRST_RUN_STEPS.length - 1;

  useEffect(() => {
    if (!open) {
      setIndex(0);
      joiningRef.current = false;
    }
  }, [open]);

  if (!open || !step) return null;

  const transition = reduce
    ? { duration: 0 }
    : { duration: 0.45, ease: EASE_OUT };

  const finish = () => {
    if (joiningRef.current) return;
    joiningRef.current = true;
    onComplete();
  };

  const next = () => {
    if (isLast) finish();
    else setIndex((i) => i + 1);
  };

  return (
    <div
      className="first-run first-run-standalone"
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-run-title"
      aria-describedby="first-run-body"
      data-testid="first-run-walkthrough"
      data-premember="true"
      data-technicolor-scope="walkthrough-full"
    >
      <div className="first-run-mesh" aria-hidden />
      <header className="first-run-top">
        {/* Brand lives in welcome scene (OpalLockup arrival). Dots orient later screens. */}
        <span className="first-run-top-spacer" aria-hidden />
        {!isLast ? (
          <button
            type="button"
            className="btn ghost first-run-skip"
            onClick={finish}
            data-testid="first-run-skip"
          >
            {PRODUCT_COPY.onboardingSkip}
          </button>
        ) : (
          <span className="first-run-skip-spacer" aria-hidden />
        )}
      </header>

      <div className="first-run-stage">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            className="first-run-panel"
            data-scene={step.scene}
            data-scene-id={step.id}
            data-testid={`first-run-scene-${step.id}`}
            initial={reduce ? false : { opacity: 0, y: 18, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduce ? undefined : { opacity: 0, y: -12, filter: "blur(4px)" }}
            transition={transition}
          >
            <Scene scene={step.scene} reduce={!!reduce} />
            {/* Welcome uses full lockup (mark+OPAL); skip redundant OPAL kicker. */}
            {step.scene === "welcome" ? null : (
              <p className="first-run-kicker">{step.kicker}</p>
            )}
            <h2 id="first-run-title" className="first-run-title">
              {step.title}
            </h2>
            <p id="first-run-body" className="first-run-body">
              {step.body}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="first-run-foot">
        <div className="first-run-dots" aria-hidden>
          {FIRST_RUN_STEPS.map((s, i) => (
            <span
              key={s.id}
              className={`first-run-dot ${i === index ? "active" : ""} ${i < index ? "done" : ""}`}
            />
          ))}
        </div>
        <motion.button
          type="button"
          className="btn primary first-run-cta"
          data-final={isLast ? "true" : undefined}
          onClick={next}
          aria-label={isLast ? PRODUCT_COPY.onboardingEnterAria : undefined}
          data-testid={isLast ? "first-run-join" : "first-run-continue"}
          initial={reduce || !isLast ? false : { scale: 0.98, opacity: 0.92 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={
            reduce || !isLast
              ? { duration: 0 }
              : { duration: 0.35, ease: EASE_OUT }
          }
        >
          {isLast ? PRODUCT_COPY.onboardingEnter : PRODUCT_COPY.onboardingContinue}
        </motion.button>
      </footer>
    </div>
  );
}

function Scene({
  scene,
  reduce,
}: {
  scene: FirstRunStep["scene"];
  reduce: boolean;
}) {
  const float = reduce
    ? {}
    : {
        animate: { y: [0, -6, 0] },
        transition: { duration: 4.5, repeat: Infinity, ease: "easeInOut" as const },
      };

  if (scene === "welcome") {
    // Brand arrival: founder orbital working mark in Living Void.
    // Not final lock. Skip/Continue stay interactive from t=0.
    return (
      <motion.div className="scene scene-welcome" {...float}>
        <div className="scene-brand-arrival" data-testid="first-run-brand-arrival">
          <motion.div
            className="scene-orbit"
            aria-hidden
            initial={reduce ? false : { scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 0.4, delay: 0.25, ease: EASE_OUT }
            }
          />
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 0.5, delay: 0.2, ease: EASE_OUT }
            }
          >
            <OpeningBrandMark reduce={reduce} />
          </motion.div>
        </div>
      </motion.div>
    );
  }

  const chipEnter = reduce
    ? {}
    : {
        initial: { opacity: 0, scale: 0.94 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.25, delay: 0.15, ease: EASE_OUT },
      };

  if (scene === "spark") {
    return (
      <motion.div className="scene scene-chat" {...float}>
        <div className="scene-bubble out">We should get dinner Thursday.</div>
        <motion.div
          className="scene-chip"
          data-source="opal"
          role="status"
          aria-label="Opal noticed: Becoming a plan"
          {...chipEnter}
        >
          <span className="sr-only">Opal: </span>
          ◇ Becoming a plan
        </motion.div>
      </motion.div>
    );
  }

  if (scene === "plan") {
    return (
      <motion.div className="scene scene-chat" {...float}>
        <div className="scene-bubble in">After 6:30 works for me.</div>
        <div className="scene-bubble out">Harbor Table could work for us.</div>
        <motion.div
          className="scene-chip gold scene-chip-breathing"
          data-source="opal"
          role="status"
          aria-label="Opal proposal: Harbor Table Thursday at 7:00"
          {...chipEnter}
        >
          <span className="sr-only">Opal: </span>
          Opal: Harbor Table · Thu 7:00 · still checking
        </motion.div>
      </motion.div>
    );
  }

  if (scene === "follow") {
    return (
      <motion.div className="scene scene-chat" {...float}>
        <motion.div
          className="scene-chip ready scene-chip-settle"
          data-source="opal"
          role="status"
          aria-label="Opal: Everything for tonight is handled"
          {...chipEnter}
        >
          <span className="sr-only">Opal: </span>
          ✓ Handled for tonight
        </motion.div>
        <div className="scene-bubble in">See you there.</div>
      </motion.div>
    );
  }

  return (
    <motion.div className="scene scene-welcome" {...float}>
      <div className="scene-calm-ring" aria-hidden />
      <OpalMark size="lg" />
    </motion.div>
  );
}
