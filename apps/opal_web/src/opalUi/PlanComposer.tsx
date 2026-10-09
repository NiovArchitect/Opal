/**
 * Paste W4 Phase 4 - Idea to plan composer.
 * Four steps only: Who, Vibe, When, Where, then proposal.
 * No media capture in this flow.
 */
import React, { useEffect, useMemo, useState } from "react";
import { OpalPresenceOrb } from "../onboarding/OpalPresenceOrb";

export type PlanComposerSeed = {
  id?: string;
  title?: string;
  who?: string | null;
  whenLine?: string | null;
  place?: string | null;
  vibe?: string | null;
  people?: string[];
};

export type PlanComposerResult = {
  who: string[];
  vibe: string;
  when: string;
  where: string;
  title: string;
  sourceIdeaId?: string;
};

type Step = "who" | "vibe" | "when" | "where" | "proposal";

type Props = {
  open: boolean;
  seed?: PlanComposerSeed | null;
  onClose: () => void;
  onConfirm: (plan: PlanComposerResult) => void;
  /** Optional people directory for "add someone". */
  directory?: string[];
};

const DEFAULT_PEOPLE = ["Chanelle", "Maya", "Alex", "Sam", "Jordan", "Sabrina"];
const VIBE_CHIPS = ["Jazz", "Dinner", "Coast", "Low key", "Celebration"];
const WHEN_PILLS = ["Tonight", "Tomorrow", "This weekend", "Next week", "Sat 7:30 PM"];
const WHERE_NEARBY = ["Rooftop nearby", "Juniper & Ivy", "Moonlight Beach", "Little Italy"];

function splitWho(raw?: string | null, people?: string[]): string[] {
  if (people?.length) return people.filter(Boolean);
  if (!raw) return [];
  return raw
    .split(/,|&|·/)
    .map((p) => p.trim())
    .filter((p) => p && !/^you$/i.test(p));
}

export function PlanComposer({
  open,
  seed = null,
  onClose,
  onConfirm,
  directory = DEFAULT_PEOPLE,
}: Props) {
  const seedPeople = useMemo(
    () => splitWho(seed?.who, seed?.people),
    [seed?.who, seed?.people],
  );
  const [step, setStep] = useState<Step>("who");
  const [who, setWho] = useState<string[]>(seedPeople);
  const [vibe, setVibe] = useState(seed?.vibe || seed?.title || "Jazz");
  const [customVibe, setCustomVibe] = useState("");
  const [when, setWhen] = useState(seed?.whenLine || "Tonight");
  const [where, setWhere] = useState(seed?.place || "");
  const [customWhere, setCustomWhere] = useState("");
  const [addQuery, setAddQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep("who");
    setWho(splitWho(seed?.who, seed?.people));
    setVibe(seed?.vibe || seed?.title || "Jazz");
    setCustomVibe("");
    setWhen(seed?.whenLine || "Tonight");
    setWhere(seed?.place || "");
    setCustomWhere("");
    setAddQuery("");
    setShowAdd(false);
  }, [open, seed]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const title = seed?.title || vibe || "Plan";
  const resolvedWhere = (customWhere.trim() || where).trim();
  const resolvedVibe = (customVibe.trim() || vibe).trim() || title;
  const proposalLine = [
    who.length ? `with ${who.join(", ")}` : null,
    resolvedVibe,
    when,
    resolvedWhere || null,
  ]
    .filter(Boolean)
    .join(" · ");

  const addMatches = directory.filter(
    (name) =>
      addQuery.trim() &&
      name.toLowerCase().includes(addQuery.trim().toLowerCase()) &&
      !who.some((w) => w.toLowerCase() === name.toLowerCase()),
  );

  const toggleWho = (name: string) => {
    setWho((prev) =>
      prev.some((w) => w.toLowerCase() === name.toLowerCase())
        ? prev.filter((w) => w.toLowerCase() !== name.toLowerCase())
        : [...prev, name],
    );
  };

  const goNext = () => {
    if (step === "who") setStep("vibe");
    else if (step === "vibe") setStep("when");
    else if (step === "when") setStep("where");
    else if (step === "where") setStep("proposal");
  };

  const goBack = () => {
    if (step === "who") onClose();
    else if (step === "vibe") setStep("who");
    else if (step === "when") setStep("vibe");
    else if (step === "where") setStep("when");
    else setStep("where");
  };

  const canContinue =
    step === "who"
      ? who.length > 0
      : step === "vibe"
        ? Boolean(resolvedVibe)
        : step === "when"
          ? Boolean(when.trim())
          : step === "where"
            ? Boolean(resolvedWhere)
            : true;

  return (
    <div
      className="plan-composer"
      data-testid="plan-composer"
      data-step={step}
      role="dialog"
      aria-modal="true"
      aria-label="Start planning"
    >
      <header className="plan-composer-head">
        <button
          type="button"
          className="opal-nav-chevron"
          data-testid="plan-composer-back"
          aria-label="Back"
          onClick={goBack}
        >
          ‹
        </button>
        <p className="plan-composer-step-label">
          {step === "proposal" ? "Proposal" : `Step · ${step}`}
        </p>
      </header>

      <div className="plan-composer-orb" aria-hidden>
        <OpalPresenceOrb mode="ready" size={64} />
      </div>

      {step === "who" ? (
        <>
          <h1 className="plan-composer-title">Who</h1>
          <div className="plan-composer-chips" role="group" aria-label="People">
            {Array.from(new Set([...seedPeople, ...who, ...directory.slice(0, 6)])).map(
              (name) => {
                const selected = who.some((w) => w.toLowerCase() === name.toLowerCase());
                return (
                  <button
                    key={name}
                    type="button"
                    className={`plan-composer-chip${selected ? " is-selected" : ""}`}
                    data-testid={`plan-composer-who-${name.toLowerCase()}`}
                    aria-pressed={selected}
                    onClick={() => toggleWho(name)}
                  >
                    {name}
                  </button>
                );
              },
            )}
            <button
              type="button"
              className="plan-composer-add"
              data-testid="plan-composer-add-someone"
              onClick={() => setShowAdd((v) => !v)}
            >
              add someone
            </button>
          </div>
          {showAdd ? (
            <div data-testid="plan-composer-add-search">
              <input
                className="plan-composer-field"
                value={addQuery}
                onChange={(e) => setAddQuery(e.target.value)}
                placeholder="Search people"
                aria-label="Search people"
              />
              {addMatches.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="plan-composer-chip"
                  onClick={() => {
                    toggleWho(name);
                    setAddQuery("");
                    setShowAdd(false);
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {step === "vibe" ? (
        <>
          <h1 className="plan-composer-title">Vibe</h1>
          <div className="plan-composer-chips" role="group" aria-label="Vibe">
            {Array.from(new Set([resolvedVibe, ...VIBE_CHIPS].filter(Boolean))).map((chip) => {
              const selected = resolvedVibe.toLowerCase() === chip.toLowerCase();
              return (
                <button
                  key={chip}
                  type="button"
                  className={`plan-composer-chip${selected ? " is-selected" : ""}`}
                  data-testid={`plan-composer-vibe-${chip.toLowerCase().replace(/\s+/g, "-")}`}
                  aria-pressed={selected}
                  onClick={() => {
                    setVibe(chip);
                    setCustomVibe("");
                  }}
                >
                  {chip}
                </button>
              );
            })}
          </div>
          <input
            className="plan-composer-field"
            data-testid="plan-composer-vibe-custom"
            value={customVibe}
            onChange={(e) => setCustomVibe(e.target.value)}
            placeholder="Custom vibe"
            aria-label="Custom vibe"
          />
        </>
      ) : null}

      {step === "when" ? (
        <>
          <h1 className="plan-composer-title">When</h1>
          <div className="plan-composer-pills hs-pill-row" role="group" aria-label="When">
            {WHEN_PILLS.map((pill) => {
              const selected = when === pill;
              return (
                <button
                  key={pill}
                  type="button"
                  className={`hs-pill${selected ? " is-selected" : ""}`}
                  data-testid={`plan-composer-when-${pill.toLowerCase().replace(/\s+/g, "-")}`}
                  aria-pressed={selected}
                  onClick={() => setWhen(pill)}
                >
                  {pill}
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      {step === "where" ? (
        <>
          <h1 className="plan-composer-title">Where</h1>
          <div className="plan-composer-chips" role="group" aria-label="Nearby spots">
            {WHERE_NEARBY.map((spot) => {
              const selected = where === spot && !customWhere.trim();
              return (
                <button
                  key={spot}
                  type="button"
                  className={`plan-composer-chip${selected ? " is-selected" : ""}`}
                  data-testid={`plan-composer-where-${spot.toLowerCase().replace(/\s+/g, "-")}`}
                  aria-pressed={selected}
                  onClick={() => {
                    setWhere(spot);
                    setCustomWhere("");
                  }}
                >
                  {spot}
                </button>
              );
            })}
          </div>
          <input
            className="plan-composer-field"
            data-testid="plan-composer-where-custom"
            value={customWhere}
            onChange={(e) => setCustomWhere(e.target.value)}
            placeholder="type a place"
            aria-label="type a place"
          />
        </>
      ) : null}

      {step === "proposal" ? (
        <>
          <h1 className="plan-composer-title">Here&apos;s the plan</h1>
          <article className="plan-composer-proposal" data-testid="plan-composer-proposal">
            <h2>{resolvedVibe}</h2>
            <p>{proposalLine}</p>
          </article>
          <div className="plan-composer-nav">
            <button
              type="button"
              className="btn ghost"
              data-testid="plan-composer-tweak"
              onClick={() => setStep("who")}
            >
              Tweak
            </button>
            <button
              type="button"
              className="btn primary"
              data-testid="plan-composer-looks-good"
              onClick={() =>
                onConfirm({
                  who,
                  vibe: resolvedVibe,
                  when,
                  where: resolvedWhere,
                  title: resolvedVibe,
                  sourceIdeaId: seed?.id,
                })
              }
            >
              Looks good
            </button>
          </div>
        </>
      ) : (
        <div className="plan-composer-nav">
          <button type="button" className="btn ghost" onClick={goBack}>
            Back
          </button>
          <button
            type="button"
            className="btn primary"
            data-testid="plan-composer-continue"
            disabled={!canContinue}
            onClick={goNext}
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
