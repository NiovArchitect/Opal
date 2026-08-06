import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { OpalMark } from "../brand/OpalLogo";
import { PRODUCT_COPY } from "../designTokens";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export type FirstRunStep = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  scene: "welcome" | "spark" | "plan" | "follow" | "calm";
};

/**
 * Age-12 / 7th-grade aha: first seconds answer “what is this?”
 * Brand = mark + OPAL wordmark only - no outer halo/ring.
 */
export const FIRST_RUN_STEPS: FirstRunStep[] = [
  {
    id: "welcome",
    kicker: "",
    title: "When friends say “we should…”",
    body: "Opal helps you turn it into a real plan, together, in private.",
    scene: "welcome",
  },
  {
    id: "spark",
    kicker: "What Opal notices",
    title: "Talk can become a plan.",
    body: "You text. Opal sees the spark. No forms. No homework.",
    scene: "spark",
  },
  {
    id: "plan",
    kicker: "Deciding together",
    title: "Get on the same page faster.",
    body: "Times and places settle in the chat without killing the vibe.",
    scene: "plan",
  },
  {
    id: "follow",
    kicker: "Follow-through",
    title: "So it actually happens.",
    body: "Gentle nudges until the plan leaves the chat and lands in real life.",
    scene: "follow",
  },
  {
    id: "join",
    kicker: "",
    title: "More “we should” becomes “we did.”",
    body: "Private with the people you actually talk to. Ready when you are.",
    scene: "calm",
  },
];

type Props = {
  open: boolean;
  /** Called when user Skip (screens 1–4) or Join (final). Always goes to activation, never member shell. */
  onComplete: () => void;
  /** Visual review: force starting step index (0 welcome, 4 join). */
  forceStepIndex?: number;
  /** Label for visual review screenshots. */
  reviewVariant?: "after" | "before-rejected";
};

export function FirstRunExperience({
  open,
  onComplete,
  forceStepIndex,
  reviewVariant = "after",
}: Props) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(forceStepIndex ?? 0);
  const joiningRef = useRef(false);
  const step = FIRST_RUN_STEPS[index];
  const isLast = index >= FIRST_RUN_STEPS.length - 1;

  useEffect(() => {
    if (!open) {
      setIndex(forceStepIndex ?? 0);
      joiningRef.current = false;
    }
  }, [open, forceStepIndex]);

  useEffect(() => {
    if (typeof forceStepIndex === "number") setIndex(forceStepIndex);
  }, [forceStepIndex]);

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
      data-visual-variant={reviewVariant}
      data-no-halo="true"
    >
      <div className="first-run-mesh" aria-hidden />
      <header className="first-run-top">
        {/* No top-left logo - brand arrives once on screen 1. */}
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
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -10 }}
            transition={transition}
          >
            <Scene scene={step.scene} reduce={!!reduce} showRejectedHalo={reviewVariant === "before-rejected"} />
            {step.kicker ? (
              <p className="first-run-kicker">{step.kicker}</p>
            ) : null}
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
          className={`btn primary first-run-cta${isLast ? " first-run-cta--join" : ""}`}
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
  showRejectedHalo = false,
}: {
  scene: FirstRunStep["scene"];
  reduce: boolean;
  showRejectedHalo?: boolean;
}) {
  if (scene === "welcome") {
    return (
      <div className="scene scene-welcome" data-testid="first-run-brand-arrival">
        {/* REJECTED treatment only for visual-review "before" - never product default */}
        {showRejectedHalo ? (
          <div className="scene-orbit scene-orbit--rejected-demo" aria-hidden />
        ) : null}
        <div className="opal-lockup opal-lockup--hero" aria-label="Opal">
          <motion.div
            className="scene-brand-mark"
            initial={reduce ? false : { opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={
              reduce ? { duration: 0 } : { duration: 0.45, ease: EASE_OUT }
            }
          >
            <OpalMark size="hero" title="Opal" />
          </motion.div>
          <motion.span
            className="opal-wordmark scene-brand-wordmark"
            data-testid="first-run-wordmark"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 0.5, delay: 0.35, ease: EASE_OUT }
            }
          >
            OPAL
          </motion.span>
        </div>
      </div>
    );
  }

  const chipEnter = reduce
    ? {}
    : {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.28, delay: 0.12, ease: EASE_OUT },
      };

  if (scene === "spark") {
    return (
      <div className="scene scene-chat">
        <div className="scene-bubble out">We should hang out this week.</div>
        <motion.div
          className="scene-opal-moment"
          data-source="opal"
          data-testid="opal-moment-becoming-plan"
          role="status"
          aria-label="Opal noticed: Becoming a plan"
          {...chipEnter}
        >
          <OpalMark size="sm" title="" glow />
          <div className="scene-opal-moment-copy">
            <span className="scene-opal-moment-label">Opal</span>
            <span className="scene-opal-moment-title">Becoming a plan</span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (scene === "plan") {
    return (
      <div className="scene scene-chat">
        <div className="scene-bubble in">Saturday afternoon works.</div>
        <div className="scene-bubble out">The park could be fun.</div>
        <motion.div
          className="scene-opal-moment scene-opal-moment--soft"
          data-source="opal"
          role="status"
          aria-label="Opal suggestion: Saturday afternoon at the park"
          {...chipEnter}
        >
          <OpalMark size="sm" title="" glow />
          <div className="scene-opal-moment-copy">
            <span className="scene-opal-moment-label">Opal</span>
            <span className="scene-opal-moment-title">Saturday · the park</span>
            <span className="scene-opal-moment-sub">Still checking with everyone</span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (scene === "follow") {
    return (
      <div className="scene scene-chat">
        <motion.div
          className="scene-opal-moment scene-opal-moment--set"
          data-source="opal"
          role="status"
          aria-label="Opal: Plan is set for Saturday"
          {...chipEnter}
        >
          <OpalMark size="sm" title="" glow />
          <div className="scene-opal-moment-copy">
            <span className="scene-opal-moment-label">Opal</span>
            <span className="scene-opal-moment-title">Set for Saturday</span>
          </div>
        </motion.div>
        <div className="scene-bubble in">See you there!</div>
      </div>
    );
  }

  // Final Join: no large logo, no halo - promise + Join own the screen.
  return <div className="scene scene-join-calm" aria-hidden data-testid="join-scene-no-logo" />;
}
