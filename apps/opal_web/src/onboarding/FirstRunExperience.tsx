import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { OpalMark } from "../brand/OpalLogo";
import { PRODUCT_COPY } from "../designTokens";

export type FirstRunStep = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  scene: "welcome" | "spark" | "plan" | "follow" | "calm";
};

/** SF14-approved walkthrough (commit 53f1540 / merge b0c7691), em dashes removed per founder copy rule. */
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
    // Visual scene reuses existing calm Lumen Lens treatment; copy is conversion hook.
    id: "join",
    kicker: "Join",
    title: "More of what you talk about should actually happen.",
    body: "Opal understands what is taking shape and helps you and your people carry it forward.",
    scene: "calm",
  },
];

type Props = {
  open: boolean;
  onComplete: () => void;
};

export function FirstRunExperience({ open, onComplete }: Props) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const step = FIRST_RUN_STEPS[index];
  const isLast = index >= FIRST_RUN_STEPS.length - 1;

  useEffect(() => {
    if (!open) setIndex(0);
  }, [open]);

  if (!open || !step) return null;

  const transition = reduce
    ? { duration: 0 }
    : { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const };

  const next = () => {
    if (isLast) onComplete();
    else setIndex((i) => i + 1);
  };

  return (
    <div
      className="first-run"
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-run-title"
      aria-describedby="first-run-body"
    >
      <div className="first-run-mesh" aria-hidden />
      <header className="first-run-top">
        <OpalMark size="sm" title="" />
        <button type="button" className="btn ghost first-run-skip" onClick={onComplete}>
          {PRODUCT_COPY.onboardingSkip}
        </button>
      </header>

      <div className="first-run-stage">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            className="first-run-panel"
            initial={reduce ? false : { opacity: 0, y: 18, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduce ? undefined : { opacity: 0, y: -12, filter: "blur(4px)" }}
            transition={transition}
          >
            <Scene scene={step.scene} reduce={!!reduce} />
            <p className="first-run-kicker">{step.kicker}</p>
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
        {isLast ? (
          <p className="first-run-secondary" id="first-run-secondary">
            {PRODUCT_COPY.onboardingInviteAfter}
          </p>
        ) : null}
        <button
          type="button"
          className="btn primary first-run-cta"
          onClick={next}
          aria-describedby={isLast ? "first-run-secondary" : undefined}
        >
          {isLast ? PRODUCT_COPY.onboardingEnter : PRODUCT_COPY.onboardingContinue}
        </button>
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
    return (
      <motion.div className="scene scene-welcome" {...float}>
        <OpalMark size="hero" />
        <div className="scene-orbit" aria-hidden />
      </motion.div>
    );
  }

  if (scene === "spark") {
    return (
      <motion.div className="scene scene-chat" {...float}>
        <div className="scene-bubble out">We should get dinner Thursday.</div>
        <div className="scene-chip">Becoming a plan</div>
      </motion.div>
    );
  }

  if (scene === "plan") {
    return (
      <motion.div className="scene scene-chat" {...float}>
        <div className="scene-bubble in">After 6:30 works for me.</div>
        <div className="scene-bubble out">I'll book Harbor Table.</div>
        <div className="scene-chip gold">Thursday · 7:00 PM</div>
      </motion.div>
    );
  }

  if (scene === "follow") {
    return (
      <motion.div className="scene scene-chat" {...float}>
        <div className="scene-chip ready">Everything for tonight is handled</div>
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
