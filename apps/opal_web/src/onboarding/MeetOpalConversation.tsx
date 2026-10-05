/**
 * Holy Shit Moments 2–5 — immersive Meet Opal.
 * Order: greeting → name/contacts → add another? → when → vibe → work → trust.
 * Chat is the contact-adding flow. Flex column only. Opal owns the screen.
 */
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  HOLY_SHIT_COPY,
  type HolyShitOnboardingState,
  type HolyShitPerson,
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

async function persistOnboardingContact(
  person: HolyShitPerson,
  bearer?: string | null,
): Promise<boolean> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    const res = await fetch("/api/v1/product/onboarding/contact", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: person.name,
        phone: person.phone ?? null,
        phone_e164: person.phone ?? null,
        source: person.source ?? "fresh",
      }),
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

function YouLine({ text, testId = "hs-you-bubble" }: { text: string; testId?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="hs-line hs-line-you"
      data-testid={testId}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { duration: MSG_SLIDE_MS / 1000, ease: EASE_OUT }}
    >
      <p className="hs-line-body">{text}</p>
    </motion.div>
  );
}

function buildState(input: {
  people: HolyShitPerson[];
  when: HolyShitWhen | null;
  vibe: HolyShitVibe | null;
  spot: HolyShitSpot | null;
  contactPersisted: boolean;
}): HolyShitOnboardingState {
  const name = input.people[0]?.name ?? "";
  return {
    contactName: name,
    people: input.people,
    when: input.when,
    vibeMode: "group",
    vibe: input.vibe,
    vibesByName: input.vibe && name ? { [name]: input.vibe } : {},
    spot: input.spot,
    contactPersisted: input.contactPersisted,
  };
}

export function MeetOpalConversation({ bearer, onComplete, onSkipToAuth }: Props) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<MeetOpalPhase>("greeting");
  const [orbMode, setOrbMode] = useState<OpalOrbMode>("typing");
  const [showTyping, setShowTyping] = useState(true);
  const [showGreeting, setShowGreeting] = useState(false);
  const [showAskPeople, setShowAskPeople] = useState(false);
  const [showPeopleComposer, setShowPeopleComposer] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [people, setPeople] = useState<HolyShitPerson[]>([]);
  const [resolveBusy, setResolveBusy] = useState(false);
  const [when, setWhen] = useState<HolyShitWhen | null>(null);
  const [vibe, setVibe] = useState<HolyShitVibe | null>(null);
  const [spot, setSpot] = useState<HolyShitSpot | null>(null);
  const [contactPersisted, setContactPersisted] = useState(false);
  const [showWhenPills, setShowWhenPills] = useState(false);
  const [showVibePills, setShowVibePills] = useState(false);
  const [showCustomVibe, setShowCustomVibe] = useState(false);
  const [customVibeDraft, setCustomVibeDraft] = useState("");
  const [pendingOpal, setPendingOpal] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const customVibeRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const contactName = people[0]?.name ?? "";

  useEffect(() => {
    if (phase !== "greeting") return;
    if (reduce) {
      setShowTyping(false);
      setShowGreeting(true);
      setShowAskPeople(true);
      setShowPeopleComposer(true);
      setOrbMode("idle");
      setPhase("ask_people");
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
      setShowAskPeople(true);
      setPhase("ask_people");
      setOrbMode("idle");
    }, TYPING_MS + GREETING_SLIDE_MS + ASK_NAME_PAUSE_MS + TYPING_MS);
    return () => {
      window.clearTimeout(tGreet);
      window.clearTimeout(tAskTyping);
      window.clearTimeout(tAsk);
    };
  }, [phase, reduce]);

  useEffect(() => {
    if (phase !== "ask_people" || showPeopleComposer) return;
    if (reduce) {
      setShowPeopleComposer(true);
      return;
    }
    const t = window.setTimeout(() => setShowPeopleComposer(true), 120);
    return () => window.clearTimeout(t);
  }, [phase, showPeopleComposer, reduce]);

  useEffect(() => {
    if (showPeopleComposer && phase === "ask_people") inputRef.current?.focus();
  }, [showPeopleComposer, phase]);

  useEffect(() => {
    if (showCustomVibe) customVibeRef.current?.focus();
  }, [showCustomVibe]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [
    phase,
    showGreeting,
    showAskPeople,
    showWhenPills,
    showVibePills,
    showCustomVibe,
    spot,
    when,
    vibe,
    people,
    showTyping,
    pendingOpal,
    reduce,
  ]);

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

  const advanceWithPerson = (person: HolyShitPerson) => {
    const key = person.name.trim().toLowerCase();
    if (!key) return;
    setPeople((prev) => {
      if (prev.some((p) => p.name.trim().toLowerCase() === key)) return prev;
      return [...prev, person].slice(0, HOLY_SHIT_COPY.peopleMax);
    });
    setShowPeopleComposer(false);
    setPendingOpal("ask_more");
    setPhase("ask_more");
    void persistOnboardingContact(person, bearer).then((ok) => {
      if (ok) setContactPersisted(true);
    });
  };

  const submitTypedName = () => {
    const trimmed = nameDraft.trim().replace(/,+$/, "");
    if (!trimmed) return;
    advanceWithPerson({ name: trimmed, source: "fresh" });
    setNameDraft("");
  };

  /** Native Contact Picker — one person, phone from picker, no follow-up. */
  const selectFromContacts = async () => {
    if (resolveBusy) return;
    setResolveBusy(true);
    const nav = navigator as Navigator & {
      contacts?: {
        select: (
          props: string[],
          opts: { multiple: boolean },
        ) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
      };
    };
    try {
      if (!nav.contacts?.select) {
        // Desktop demo: if a name is typed, use it; else keep composer open.
        const trimmed = nameDraft.trim();
        if (trimmed) {
          advanceWithPerson({ name: trimmed, source: "skipped" });
          setNameDraft("");
        }
        return;
      }
      const rows = await nav.contacts.select(["name", "tel"], { multiple: false });
      const row = rows?.[0];
      const label = ((row?.name && row.name[0]) || "").trim();
      if (!label) return;
      const tel = (row?.tel || []).find((t) => t && t.trim());
      advanceWithPerson({
        name: label,
        phone: tel?.trim() || undefined,
        source: "contacts",
      });
    } catch {
      // User cancelled picker — stay on ask_people.
    } finally {
      setResolveBusy(false);
    }
  };

  const chooseAddAnother = () => {
    setPendingOpal(null);
    setShowAskPeople(true);
    setShowPeopleComposer(true);
    setPhase("ask_people");
    setNameDraft("");
  };

  const chooseLetsPlan = () => {
    setPendingOpal("ask_when");
    setPhase("ask_when");
    setShowWhenPills(false);
  };

  const pickWhen = (w: HolyShitWhen) => {
    setWhen(w);
    setShowWhenPills(false);
    setPendingOpal("ask_vibe");
    setPhase("ask_vibe");
    setShowVibePills(false);
    setShowCustomVibe(false);
  };

  const pickVibe = (v: HolyShitVibe) => {
    const trimmed = v.trim();
    if (!trimmed) return;
    setShowVibePills(false);
    setShowCustomVibe(false);
    setVibe(trimmed);
    setPhase("working");
    setOrbMode("working");
  };

  const selectSpot = (s: HolyShitSpot) => {
    setSpot(s);
    setPhase("trust");
    setOrbMode("ready");
  };

  const finish = (selected: HolyShitSpot | null) => {
    onComplete(
      buildState({
        people,
        when,
        vibe,
        spot: selected,
        contactPersisted,
      }),
    );
  };

  const trustVibe = vibe || (HOLY_SHIT_COPY.vibePills[0] as HolyShitVibe);

  const planName = people[0]?.name || contactName || "them";
  const peopleLabel = people.map((p) => p.name).join(", ");

  const lines: Line[] = [];
  if (showGreeting) lines.push({ kind: "opal", id: "greeting", text: HOLY_SHIT_COPY.greeting });
  if (showAskPeople || people.length > 0) {
    lines.push({ kind: "opal", id: "ask_people", text: HOLY_SHIT_COPY.askPeople });
  }
  for (const p of people) {
    lines.push({ kind: "you", id: `person-${p.name}`, text: p.name });
  }
  if (
    !pendingOpal &&
    people.length > 0 &&
    (phase === "ask_more" ||
      phase === "ask_when" ||
      phase === "ask_vibe" ||
      phase === "working" ||
      phase === "trust")
  ) {
    lines.push({
      kind: "opal",
      id: "ask_more",
      text: HOLY_SHIT_COPY.askMore(planName),
    });
  }
  if (
    !pendingOpal &&
    (phase === "ask_when" || phase === "ask_vibe" || phase === "working" || phase === "trust")
  ) {
    lines.push({
      kind: "opal",
      id: "ask_when",
      text: HOLY_SHIT_COPY.askWhen(planName),
    });
  }
  if (when) lines.push({ kind: "you", id: "when", text: when });
  if (!pendingOpal && (phase === "ask_vibe" || phase === "working" || phase === "trust")) {
    lines.push({
      kind: "opal",
      id: "ask_vibe",
      text: HOLY_SHIT_COPY.askVibeFor(planName),
    });
    if (vibe) lines.push({ kind: "you", id: "vibe", text: vibe });
  }

  const showPeopleRow = phase === "ask_people" && showPeopleComposer;
  const showMoreRow = phase === "ask_more" && !pendingOpal && people.length > 0;
  const showWhenRow = phase === "ask_when" && showWhenPills && !when && !pendingOpal;
  const showVibeRow =
    phase === "ask_vibe" && showVibePills && !vibe && !pendingOpal && !showCustomVibe;
  const showCustomVibeRow = phase === "ask_vibe" && showCustomVibe && !vibe && !pendingOpal;

  return (
    <div
      className="hs-meet-opal"
      data-testid="meet-opal-conversation"
      data-hs-phase={phase}
      data-orb-mode={orbMode}
      data-people-count={people.length}
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
                    : line.id === "ask_people"
                      ? "hs-opal-ask-name"
                      : line.id === "ask_more"
                        ? "hs-opal-ask-more"
                        : line.id === "ask_when"
                          ? "hs-opal-ask-when"
                          : line.id === "ask_vibe"
                            ? "hs-opal-ask-vibe"
                            : `hs-opal-${line.id}`
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
                    people={people}
                    vibe={vibe}
                    vibesByName={{}}
                    vibeMode="group"
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

      {showPeopleRow ? (
        <div className="hs-people-composer" data-testid="hs-name-composer">
          {people.length > 0 ? (
            <p className="hs-people-hint" data-testid="hs-people-added">
              Added: {peopleLabel}
            </p>
          ) : null}
          <form
            className="hs-meet-composer hs-meet-composer-inline"
            onSubmit={(e) => {
              e.preventDefault();
              submitTypedName();
            }}
          >
            <input
              ref={inputRef}
              className="hs-meet-input"
              data-testid="hs-name-input"
              placeholder={HOLY_SHIT_COPY.peoplePlaceholder}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              autoComplete="off"
              enterKeyHint="done"
            />
            <button
              type="button"
              className="hs-meet-send"
              data-testid="hs-name-submit"
              disabled={!nameDraft.trim()}
              onClick={submitTypedName}
            >
              {HOLY_SHIT_COPY.peopleContinue}
            </button>
          </form>
          <div className="hs-pill-row hs-pill-row-compact" data-testid="hs-resolve-pills">
            <button
              type="button"
              className="hs-pill hs-pill-primary"
              data-testid="hs-resolve-contacts"
              disabled={resolveBusy}
              onClick={() => void selectFromContacts()}
            >
              {HOLY_SHIT_COPY.resolveSelect}
            </button>
          </div>
        </div>
      ) : null}

      {showMoreRow ? (
        <div className="hs-pill-row" data-testid="hs-more-pills" role="group" aria-label="Add more or plan">
          <button
            type="button"
            className="hs-pill hs-pill-primary"
            data-testid="hs-add-another"
            onClick={chooseAddAnother}
          >
            {HOLY_SHIT_COPY.addAnother}
          </button>
          <button
            type="button"
            className="hs-pill"
            data-testid="hs-lets-plan"
            onClick={chooseLetsPlan}
          >
            {HOLY_SHIT_COPY.letsPlan}
          </button>
        </div>
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
          <motion.button
            type="button"
            className="hs-pill hs-pill-custom"
            data-testid="hs-vibe-something-else"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduce
                ? { duration: 0 }
                : {
                    duration: 0.28,
                    delay: (PILL_STAGGER_MS * HOLY_SHIT_COPY.vibePills.length) / 1000,
                    ease: EASE_OUT,
                  }
            }
            onClick={() => {
              setShowVibePills(false);
              setShowCustomVibe(true);
            }}
          >
            {HOLY_SHIT_COPY.vibeCustom}
          </motion.button>
        </div>
      ) : null}

      {showCustomVibeRow ? (
        <form
          className="hs-meet-composer hs-meet-composer-inline"
          data-testid="hs-vibe-custom-composer"
          onSubmit={(e) => {
            e.preventDefault();
            pickVibe(customVibeDraft);
          }}
        >
          <input
            ref={customVibeRef}
            className="hs-meet-input"
            data-testid="hs-vibe-custom-input"
            placeholder={HOLY_SHIT_COPY.vibeCustomPlaceholder}
            value={customVibeDraft}
            onChange={(e) => setCustomVibeDraft(e.target.value)}
            autoComplete="off"
            enterKeyHint="done"
          />
          <button
            type="submit"
            className="hs-meet-send"
            data-testid="hs-vibe-custom-submit"
            disabled={!customVibeDraft.trim()}
          >
            {HOLY_SHIT_COPY.peopleContinue}
          </button>
        </form>
      ) : null}

      {phase === "trust" && spot && when && vibe ? (
        <TrustContractCard
          contactName={contactName}
          vibe={trustVibe}
          when={when}
          spot={spot}
          onSend={() => finish(spot)}
          onNotYet={() => finish(null)}
        />
      ) : null}
    </div>
  );
}
