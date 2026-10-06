/**
 * Moment 4 — Watch Opal work (rebuild).
 * Step cards slide in from the right. SVG checkmarks draw. 900ms cadence.
 * Vibe drives recommendations; calendar copy stays honest without a connected calendar.
 */
import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  HOLY_SHIT_COPY,
  fixtureSpotsForVibe,
  type HolyShitPerson,
  type HolyShitSpot,
  type HolyShitVibe,
  type HolyShitVibeMode,
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
  people?: HolyShitPerson[];
  vibesByName?: Record<string, HolyShitVibe>;
  vibeMode?: HolyShitVibeMode;
};

type StepView = {
  id: StepId;
  label: string;
  doneLabel: string;
  done: boolean;
};

function isSpiritualVibe(vibe: string): boolean {
  return /church|chapel|worship|faith|spiritual|prayer|temple|mosque|synagogue/i.test(
    vibe.trim(),
  );
}

function looksLikeRestaurant(place: CurateRankedPlace): boolean {
  const blob = [
    place.display_name,
    place.name,
    ...(place.shared_reasons || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /restaurant|osteria|bistro|trattoria|grill|steak|sushi|pizza|pasta|diner|eatery|brunch|dinner/.test(
    blob,
  );
}

function mapCurated(ranked: CurateRankedPlace[], vibe: string): HolyShitSpot[] {
  const fixtures = fixtureSpotsForVibe(vibe);
  const filtered =
    isSpiritualVibe(vibe) ? ranked.filter((p) => !looksLikeRestaurant(p)) : ranked;
  if (!filtered.length) return [];
  return filtered.slice(0, 3).map((p, i) => {
    const fallback = fixtures[i];
    return {
      id: p.id || fallback?.id || `curated-${i}`,
      name: p.display_name || p.name || fallback?.name || "Place",
      why: (p.shared_reasons && p.shared_reasons[0]) || fallback?.why || "",
      price: fallback?.price || "",
      photo: fallback?.photo || "/figma-v2/home-201/media-juniper.png",
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
      if (res.ranked?.length) {
        const mapped = mapCurated(res.ranked, vibe);
        if (mapped.length) return mapped;
      }
    } catch {
      /* fixture / empty fallback */
    }
  }
  return fixtureSpotsForVibe(vibe);
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
  people = [],
  vibesByName = {},
  vibeMode = "group",
}: Props) {
  const reduce = useReducedMotion();
  const [visibleCount, setVisibleCount] = useState(1);
  const [calendarDone, setCalendarDone] = useState<string>(HOLY_SHIT_COPY.stepCalendarGrace);
  const [tasteDone, setTasteDone] = useState<string>(HOLY_SHIT_COPY.stepTasteEmpty);
  const [spots, setSpots] = useState<HolyShitSpot[]>([]);
  const [spotsReady, setSpotsReady] = useState(false);
  const multi = people.length > 1;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cal = await fetchCalendarStepCopy();
      if (!cancelled) setCalendarDone(cal.done);
      if (!cancelled) setTasteDone(HOLY_SHIT_COPY.stepTasteEmpty);

      if (vibeMode === "per_person" && people.length > 1) {
        const perPerson: HolyShitSpot[] = [];
        for (let i = 0; i < Math.min(people.length, 3); i++) {
          const person = people[i]!;
          const personVibe = vibesByName[person.name] || vibe;
          const loaded = await loadSpots(personVibe, bearer);
          const pick = loaded[0];
          if (!pick) continue;
          perPerson.push({
            ...pick,
            id: `${pick.id}-${person.name.toLowerCase().replace(/\s+/g, "-")}`,
            forName: person.name,
            why: `${person.name} · ${pick.why}`,
          });
        }
        if (!cancelled) {
          setSpots(perPerson);
          setSpotsReady(true);
        }
        return;
      }

      const loaded = await loadSpots(vibe, bearer);
      if (!cancelled) {
        setSpots(loaded);
        setSpotsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bearer, vibe, vibeMode, people, vibesByName]);

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
      label: multi ? HOLY_SHIT_COPY.stepSpotsMulti : HOLY_SHIT_COPY.stepSpots,
      doneLabel: !spotsReady
        ? "…"
        : spots.length === 0
          ? HOLY_SHIT_COPY.stepSpotsEmpty(vibe || "that")
          : multi
            ? `${spots.length} plans ready`
            : `${spots.length} spots ready`,
      done: visibleCount > 2 && spotsReady,
    },
  ];

  const showCards = !compact && visibleCount >= 3 && spotsReady && spots.length > 0;
  const showEmpty =
    !compact && visibleCount >= 3 && spotsReady && spots.length === 0;

  return (
    <div
      className={`hs-working${compact ? " is-compact" : ""}`}
      data-testid="opal-working"
      data-hs-moment="4"
      data-working-steps={visibleCount}
      data-vibe-mode={vibeMode}
      data-spots-count={spots.length}
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

      {showEmpty ? (
        <div className="hs-spots-empty-wrap" data-testid="opal-working-spots-empty">
          <p className="hs-spots-empty" role="status">
            {HOLY_SHIT_COPY.stepSpotsEmpty(vibe || "that")}
          </p>
          <button
            type="button"
            className="hs-pill hs-pill-primary"
            data-testid="opal-working-continue-without-spot"
            onClick={() =>
              onSelectSpot({
                id: `vibe-${(vibe || "plan").toLowerCase().replace(/\s+/g, "-")}`,
                name: vibe?.trim() || "something simple",
                why: "We'll pick the place together.",
                price: "",
                photo: "/figma-v2/home-201/media-juniper.png",
              })
            }
          >
            Continue
          </button>
        </div>
      ) : null}

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
                {spot.forName ? (
                  <p className="hs-spot-for" data-testid="hs-spot-for">
                    For {spot.forName}
                  </p>
                ) : null}
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
