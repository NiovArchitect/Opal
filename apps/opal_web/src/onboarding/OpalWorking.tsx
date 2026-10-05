/**
 * Moment 4 — Watch Opal work (rebuild).
 * Step cards slide in from the right. SVG checkmarks draw. 900ms cadence.
 */
import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  HOLY_SHIT_COPY,
  HOLY_SHIT_FIXTURE_SPOTS,
  type HolyShitSpot,
} from "./holyShitCopy";
import { curateRecommendations, type CurateRankedPlace } from "../api/productClient";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const STEP_MS = 900;

type StepId = "calendar" | "taste" | "spots";

type Props = {
  contactName: string;
  vibe: string;
  bearer?: string | null;
  onSelectSpot: (spot: HolyShitSpot) => void;
  /** Hide title/spots when trust modal covers (parent still keeps working state). */
  compact?: boolean;
};

type StepView = {
  id: StepId;
  label: string;
  doneLabel: string;
  done: boolean;
};

function mapCurated(ranked: CurateRankedPlace[]): HolyShitSpot[] {
  return ranked.slice(0, 3).map((p, i) => {
    const fallback = HOLY_SHIT_FIXTURE_SPOTS[i]!;
    return {
      id: p.id || fallback.id,
      name: p.display_name || p.name || fallback.name,
      why: (p.shared_reasons && p.shared_reasons[0]) || fallback.why,
      price: fallback.price,
      photo: fallback.photo,
    };
  });
}

async function fetchCalendarStepCopy(): Promise<{ done: string }> {
  try {
    const res = await fetch("/api/v1/product/calendar/free", { method: "GET" });
    if (res.ok) {
      const data = (await res.json().catch(() => null)) as
        | { free_slots?: unknown[]; summary?: string }
        | null;
      if (data?.summary) return { done: data.summary };
      if (Array.isArray(data?.free_slots) && data!.free_slots!.length > 0) {
        return { done: HOLY_SHIT_COPY.stepCalendarDone };
      }
    }
  } catch {
    /* graceful */
  }
  return { done: HOLY_SHIT_COPY.stepCalendarGrace };
}

async function loadSpots(vibe: string, bearer?: string | null): Promise<HolyShitSpot[]> {
  if (bearer) {
    try {
      const res = await curateRecommendations(
        { user_ids: [], activity: vibe.toLowerCase(), what: vibe.toLowerCase(), limit: 3 },
        bearer,
      );
      if (res.ranked?.length) return mapCurated(res.ranked);
    } catch {
      /* fixture fallback */
    }
  }
  return HOLY_SHIT_FIXTURE_SPOTS;
}

function CheckMark({ drawn }: { drawn: boolean }) {
  return (
    <svg
      className={`hs-working-check-svg${drawn ? " is-drawn" : ""}`}
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden
    >
      <circle className="hs-working-check-ring" cx="12" cy="12" r="10" />
      <path
        className="hs-working-check-path"
        d="M7 12.5l3.2 3.2L17 8.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function OpalWorking({
  contactName,
  vibe,
  bearer,
  onSelectSpot,
  compact = false,
}: Props) {
  const reduce = useReducedMotion();
  const [visibleCount, setVisibleCount] = useState(1);
  const [calendarDone, setCalendarDone] = useState<string>(HOLY_SHIT_COPY.stepCalendarGrace);
  const [tasteDone, setTasteDone] = useState<string>(HOLY_SHIT_COPY.stepTasteEmpty);
  const [spots, setSpots] = useState<HolyShitSpot[]>(HOLY_SHIT_FIXTURE_SPOTS);
  const [spotsReady, setSpotsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cal = await fetchCalendarStepCopy();
      if (!cancelled) setCalendarDone(cal.done);
      if (!cancelled) setTasteDone(HOLY_SHIT_COPY.stepTasteEmpty);
      const loaded = await loadSpots(vibe, bearer);
      if (!cancelled) {
        setSpots(loaded);
        setSpotsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bearer, vibe]);

  useEffect(() => {
    if (reduce) {
      setVisibleCount(3);
      return;
    }
    const t1 = window.setTimeout(() => setVisibleCount(2), STEP_MS);
    const t2 = window.setTimeout(() => setVisibleCount(3), STEP_MS * 2);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [reduce]);

  const steps: StepView[] = [
    {
      id: "calendar",
      label: HOLY_SHIT_COPY.stepCalendar,
      doneLabel: calendarDone,
      done: visibleCount > 1,
    },
    {
      id: "taste",
      label: HOLY_SHIT_COPY.stepTaste(contactName),
      doneLabel: tasteDone,
      done: visibleCount > 2,
    },
    {
      id: "spots",
      label: HOLY_SHIT_COPY.stepSpots,
      doneLabel: spotsReady ? `${spots.length} spots ready` : "…",
      done: visibleCount > 2 && spotsReady,
    },
  ];

  const showCards = !compact && visibleCount >= 3 && spotsReady;

  return (
    <div
      className={`hs-working${compact ? " is-compact" : ""}`}
      data-testid="opal-working"
      data-hs-moment="4"
      data-working-steps={visibleCount}
    >
      {!compact ? (
        <p className="hs-working-kicker" data-testid="opal-working-title">
          {HOLY_SHIT_COPY.workingTitle}
        </p>
      ) : null}

      <ul className="hs-working-steps" aria-live="polite">
        {steps.slice(0, visibleCount).map((s) => (
          <motion.li
            key={s.id}
            className={`hs-working-step${s.done ? " is-done" : ""}`}
            data-testid={`opal-working-step-${s.id}`}
            initial={reduce ? false : { opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            transition={
              reduce ? { duration: 0 } : { duration: 0.45, ease: EASE_OUT }
            }
          >
            <CheckMark drawn={s.done} />
            <div className="hs-working-copy">
              <span className="hs-working-label">{s.done ? s.doneLabel : s.label}</span>
            </div>
          </motion.li>
        ))}
      </ul>

      {showCards ? (
        <div className="hs-spot-grid" data-testid="opal-working-spots">
          {spots.map((spot, i) => (
            <motion.button
              key={spot.id}
              type="button"
              className="hs-spot-card"
              data-testid={`opal-working-spot-${spot.id}`}
              initial={reduce ? false : { opacity: 0, x: 56 }}
              animate={{ opacity: 1, x: 0 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { duration: 0.4, delay: 0.08 * i, ease: EASE_OUT }
              }
              onClick={() => onSelectSpot(spot)}
            >
              <div className="hs-spot-photo" aria-hidden>
                <img src={spot.photo} alt="" />
              </div>
              <div className="hs-spot-body">
                <p className="hs-spot-name">{spot.name}</p>
                <p className="hs-spot-why">{spot.why}</p>
                <p className="hs-spot-price">{spot.price}</p>
              </div>
            </motion.button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
