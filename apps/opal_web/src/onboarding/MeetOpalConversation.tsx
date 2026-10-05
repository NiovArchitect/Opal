/**
 * Holy Shit Moments 2–5 — immersive Meet Opal (choreography v2).
 * Order: greeting → 3–5 people → resolve contacts → when → vibe → work → trust.
 * Flex column only. Opal owns the screen.
 */
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  HOLY_SHIT_COPY,
  formatPeopleList,
  type HolyShitOnboardingState,
  type HolyShitPerson,
  type HolyShitSpot,
  type HolyShitVibe,
  type HolyShitVibeMode,
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
  vibeMode: HolyShitVibeMode | null;
  vibe: HolyShitVibe | null;
  vibesByName: Record<string, HolyShitVibe>;
  spot: HolyShitSpot | null;
  contactPersisted: boolean;
}): HolyShitOnboardingState {
  return {
    contactName: input.people[0]?.name ?? "",
    people: input.people,
    when: input.when,
    vibeMode: input.vibeMode,
    vibe: input.vibe,
    vibesByName: input.vibesByName,
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
  const [showResolveChoice, setShowResolveChoice] = useState(false);
  const [resolveChoice, setResolveChoice] = useState<"contacts" | "skipped" | null>(null);
  const [resolveBusy, setResolveBusy] = useState(false);
  const [when, setWhen] = useState<HolyShitWhen | null>(null);
  const [vibeMode, setVibeMode] = useState<HolyShitVibeMode | null>(null);
  const [vibe, setVibe] = useState<HolyShitVibe | null>(null);
  const [vibesByName, setVibesByName] = useState<Record<string, HolyShitVibe>>({});
  const [vibePersonIndex, setVibePersonIndex] = useState(0);
  const [spot, setSpot] = useState<HolyShitSpot | null>(null);
  const [contactPersisted, setContactPersisted] = useState(false);
  const [showWhenPills, setShowWhenPills] = useState(false);
  const [showVibeModePills, setShowVibeModePills] = useState(false);
  const [showVibePills, setShowVibePills] = useState(false);
  const [pendingOpal, setPendingOpal] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const names = people.map((p) => p.name);
  const namesLabel = formatPeopleList(names);
  const peopleHint =
    people.length === 0
      ? null
      : people.length < HOLY_SHIT_COPY.peopleMinSuggest
        ? HOLY_SHIT_COPY.peopleHint1
        : HOLY_SHIT_COPY.peopleHint3;

  // Moment 2: typing → greeting → ask_people
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
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [
    phase,
    showGreeting,
    showAskPeople,
    showWhenPills,
    showVibeModePills,
    showVibePills,
    showResolveChoice,
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
    if (phase !== "ask_vibe_mode" || pendingOpal) return;
    if (reduce) {
      setShowVibeModePills(true);
      return;
    }
    const t = window.setTimeout(() => setShowVibeModePills(true), PILL_AFTER_MSG_MS);
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
  }, [phase, pendingOpal, vibePersonIndex, reduce]);

  useEffect(() => {
    if (phase === "working") setOrbMode("working");
    else if (phase === "trust") setOrbMode("ready");
  }, [phase]);

  useEffect(() => {
    if (phase !== "resolve_contacts" || pendingOpal) return;
    if (resolveChoice) return;
    if (reduce) {
      setShowResolveChoice(true);
      return;
    }
    const t = window.setTimeout(() => setShowResolveChoice(true), PILL_AFTER_MSG_MS);
    return () => window.clearTimeout(t);
  }, [phase, pendingOpal, resolveChoice, reduce]);

  const addPerson = (raw: string) => {
    const trimmed = raw.trim().replace(/,+$/, "");
    if (!trimmed) return;
    if (people.length >= HOLY_SHIT_COPY.peopleMax) return;
    if (people.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setNameDraft("");
      return;
    }
    setPeople((prev) => [...prev, { name: trimmed }]);
    setNameDraft("");
  };

  const removePerson = (name: string) => {
    setPeople((prev) => prev.filter((p) => p.name !== name));
  };

  const continuePeople = () => {
    const draft = nameDraft.trim().replace(/,+$/, "");
    let nextPeople = people;
    if (
      draft &&
      people.length < HOLY_SHIT_COPY.peopleMax &&
      !people.some((p) => p.name.toLowerCase() === draft.toLowerCase())
    ) {
      nextPeople = [...people, { name: draft }];
      setPeople(nextPeople);
      setNameDraft("");
    }
    if (nextPeople.length === 0) return;
    setShowPeopleComposer(false);
    setPendingOpal("resolve");
    setPhase("resolve_contacts");
    setResolveChoice(null);
    setShowResolveChoice(false);
  };

  const persistAll = async (list: HolyShitPerson[]) => {
    let ok = false;
    for (const person of list) {
      const saved = await persistOnboardingContact(person, bearer);
      ok = ok || saved;
    }
    setContactPersisted(ok);
    return ok;
  };

  const advanceAfterResolve = (list: HolyShitPerson[]) => {
    setPendingOpal("ask_when");
    setPhase("ask_when");
    void persistAll(list);
  };

  /** Native Contact Picker — user selects from THEIR contacts. No phone prompts. */
  const selectFromContacts = async () => {
    if (resolveBusy) return;
    setResolveBusy(true);
    setResolveChoice("contacts");
    setShowResolveChoice(false);
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
        // Desktop / no Contact Picker API — continue with typed names (demo).
        const next = people.map((p) => ({ ...p, source: "skipped" as const }));
        setPeople(next);
        advanceAfterResolve(next);
        return;
      }
      const rows = await nav.contacts.select(["name", "tel"], { multiple: true });
      const picked: HolyShitPerson[] = [];
      for (const row of rows || []) {
        const label = ((row.name && row.name[0]) || "").trim();
        if (!label) continue;
        const tel = (row.tel || []).find((t) => t && t.trim());
        picked.push({
          name: label,
          phone: tel?.trim() || undefined,
          source: "contacts",
        });
      }
      // Prefer picker selections; keep typed names that weren't replaced.
      const next =
        picked.length > 0
          ? picked.slice(0, HOLY_SHIT_COPY.peopleMax)
          : people.map((p) => ({ ...p, source: "skipped" as const }));
      setPeople(next);
      advanceAfterResolve(next);
    } catch {
      // User cancelled picker — keep typed names, no phone required.
      const next = people.map((p) => ({ ...p, source: "skipped" as const }));
      setPeople(next);
      advanceAfterResolve(next);
    } finally {
      setResolveBusy(false);
    }
  };

  const skipContactPicker = () => {
    setResolveChoice("skipped");
    setShowResolveChoice(false);
    const next = people.map((p) => ({ ...p, source: "skipped" as const }));
    setPeople(next);
    advanceAfterResolve(next);
  };

  const pickWhen = (w: HolyShitWhen) => {
    setWhen(w);
    setShowWhenPills(false);
    if (people.length <= 1) {
      setVibeMode("group");
      setPendingOpal("ask_vibe");
      setPhase("ask_vibe");
      setVibePersonIndex(0);
      setShowVibePills(false);
      return;
    }
    setPendingOpal("ask_vibe_mode");
    setPhase("ask_vibe_mode");
    setShowVibeModePills(false);
  };

  const pickVibeMode = (mode: HolyShitVibeMode) => {
    setVibeMode(mode);
    setShowVibeModePills(false);
    setPendingOpal("ask_vibe");
    setPhase("ask_vibe");
    setVibePersonIndex(0);
    setShowVibePills(false);
  };

  const pickVibe = (v: HolyShitVibe) => {
    setShowVibePills(false);
    if (vibeMode === "per_person" && people.length > 1) {
      const person = people[vibePersonIndex];
      if (!person) return;
      const nextMap = { ...vibesByName, [person.name]: v };
      setVibesByName(nextMap);
      if (vibePersonIndex < people.length - 1) {
        setVibePersonIndex((i) => i + 1);
        setPendingOpal("ask_vibe_next");
        setShowVibePills(false);
        return;
      }
      setVibe(nextMap[people[0]!.name] ?? v);
      setPhase("working");
      setOrbMode("working");
      return;
    }
    setVibe(v);
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
        vibeMode,
        vibe,
        vibesByName,
        spot: selected,
        contactPersisted,
      }),
    );
  };

  const trustName =
    spot?.forName ||
    (vibeMode === "per_person" ? people[0]?.name : people[0]?.name) ||
    "";
  const trustVibe =
    (trustName && vibesByName[trustName]) ||
    vibe ||
    (HOLY_SHIT_COPY.vibePills[0] as HolyShitVibe);

  const lines: Line[] = [];
  if (showGreeting) lines.push({ kind: "opal", id: "greeting", text: HOLY_SHIT_COPY.greeting });
  if (showAskPeople) lines.push({ kind: "opal", id: "ask_people", text: HOLY_SHIT_COPY.askPeople });
  if (people.length && phase !== "greeting" && phase !== "ask_people") {
    lines.push({ kind: "you", id: "people", text: names.join(", ") });
  }
  if (
    !pendingOpal &&
    (phase === "resolve_contacts" ||
      phase === "ask_when" ||
      phase === "ask_vibe_mode" ||
      phase === "ask_vibe" ||
      phase === "working" ||
      phase === "trust")
  ) {
    lines.push({ kind: "opal", id: "ask_resolve", text: HOLY_SHIT_COPY.askResolve });
  }
  if (resolveChoice && phase !== "ask_people" && phase !== "greeting") {
    lines.push({
      kind: "you",
      id: "resolve_path",
      text:
        resolveChoice === "contacts"
          ? HOLY_SHIT_COPY.resolveSelect
          : HOLY_SHIT_COPY.resolveSkip,
    });
  }
  if (
    !pendingOpal &&
    (phase === "ask_when" ||
      phase === "ask_vibe_mode" ||
      phase === "ask_vibe" ||
      phase === "working" ||
      phase === "trust")
  ) {
    lines.push({
      kind: "opal",
      id: "ask_when",
      text: HOLY_SHIT_COPY.askWhen(namesLabel),
    });
  }
  if (when) lines.push({ kind: "you", id: "when", text: when });
  if (
    !pendingOpal &&
    people.length > 1 &&
    (phase === "ask_vibe_mode" || phase === "ask_vibe" || phase === "working" || phase === "trust")
  ) {
    lines.push({ kind: "opal", id: "ask_vibe_mode", text: HOLY_SHIT_COPY.askVibeMode });
  }
  if (vibeMode && people.length > 1) {
    lines.push({
      kind: "you",
      id: "vibe_mode",
      text:
        vibeMode === "group"
          ? HOLY_SHIT_COPY.vibeModeGroup(people.length)
          : HOLY_SHIT_COPY.vibeModeEach,
    });
  }
  if (!pendingOpal && (phase === "ask_vibe" || phase === "working" || phase === "trust")) {
    const vibeAskName =
      vibeMode === "per_person" && people[vibePersonIndex]
        ? people[vibePersonIndex]!.name
        : null;
    // Show completed per-person vibe Qs
    if (vibeMode === "per_person") {
      people.forEach((p, i) => {
        if (vibesByName[p.name]) {
          lines.push({
            kind: "opal",
            id: `ask_vibe_${p.name}`,
            text: HOLY_SHIT_COPY.askVibeFor(p.name),
          });
          lines.push({ kind: "you", id: `vibe_${p.name}`, text: vibesByName[p.name]! });
        } else if (phase === "ask_vibe" && i === vibePersonIndex) {
          lines.push({
            kind: "opal",
            id: `ask_vibe_${p.name}`,
            text: HOLY_SHIT_COPY.askVibeFor(p.name),
          });
        }
      });
    } else {
      lines.push({
        kind: "opal",
        id: "ask_vibe",
        text: vibeAskName ? HOLY_SHIT_COPY.askVibeFor(vibeAskName) : HOLY_SHIT_COPY.askVibe,
      });
      if (vibe) lines.push({ kind: "you", id: "vibe", text: vibe });
    }
  }

  const showPeopleRow = phase === "ask_people" && showPeopleComposer;
  const showResolveRow =
    phase === "resolve_contacts" && showResolveChoice && !resolveChoice && !pendingOpal;
  const showWhenRow = phase === "ask_when" && showWhenPills && !when && !pendingOpal;
  const showVibeModeRow =
    phase === "ask_vibe_mode" && showVibeModePills && !vibeMode && !pendingOpal;
  const showVibeRow = phase === "ask_vibe" && showVibePills && !pendingOpal;

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
                      : line.id === "ask_resolve"
                        ? "hs-opal-ask-resolve"
                        : line.id === "ask_when"
                          ? "hs-opal-ask-when"
                          : line.id === "ask_vibe_mode"
                            ? "hs-opal-ask-vibe-mode"
                            : line.id.startsWith("ask_vibe")
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
                {vibe || Object.keys(vibesByName).length ? (
                  <OpalWorking
                    contactName={namesLabel}
                    people={people}
                    vibe={vibe || trustVibe}
                    vibesByName={vibesByName}
                    vibeMode={vibeMode || "group"}
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
          {people.length ? (
            <div className="hs-people-tags" data-testid="hs-people-tags">
              {people.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  className="hs-people-tag"
                  data-testid={`hs-person-tag-${p.name.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={() => removePerson(p.name)}
                  aria-label={`Remove ${p.name}`}
                >
                  {p.name}
                  <span aria-hidden>×</span>
                </button>
              ))}
            </div>
          ) : null}
          {peopleHint ? (
            <p className="hs-people-hint" data-testid="hs-people-hint">
              {peopleHint}
            </p>
          ) : null}
          <form
            className="hs-meet-composer hs-meet-composer-inline"
            onSubmit={(e) => {
              e.preventDefault();
              if (nameDraft.trim()) addPerson(nameDraft);
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
              disabled={people.length >= HOLY_SHIT_COPY.peopleMax}
            />
            <button
              type="button"
              className="hs-meet-send"
              data-testid="hs-name-submit"
              disabled={people.length === 0 && !nameDraft.trim()}
              onClick={continuePeople}
            >
              {HOLY_SHIT_COPY.peopleContinue}
            </button>
          </form>
        </div>
      ) : null}

      {showResolveRow ? (
        <div className="hs-pill-row" data-testid="hs-resolve-pills" role="group" aria-label="Contacts">
          <motion.button
            type="button"
            className="hs-pill hs-pill-primary"
            data-testid="hs-resolve-contacts"
            disabled={resolveBusy}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.28, ease: EASE_OUT }}
            onClick={() => void selectFromContacts()}
          >
            {HOLY_SHIT_COPY.resolveSelect}
          </motion.button>
          <motion.button
            type="button"
            className="hs-pill"
            data-testid="hs-resolve-skip"
            disabled={resolveBusy}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 0.28, delay: PILL_STAGGER_MS / 1000, ease: EASE_OUT }
            }
            onClick={skipContactPicker}
          >
            {HOLY_SHIT_COPY.resolveSkip}
          </motion.button>
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

      {showVibeModeRow ? (
        <div
          className="hs-pill-row"
          data-testid="hs-vibe-mode-pills"
          role="group"
          aria-label="Vibe mode"
        >
          <motion.button
            type="button"
            className="hs-pill"
            data-testid="hs-vibe-mode-group"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => pickVibeMode("group")}
          >
            {HOLY_SHIT_COPY.vibeModeGroup(people.length)}
          </motion.button>
          <motion.button
            type="button"
            className="hs-pill"
            data-testid="hs-vibe-mode-each"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            onClick={() => pickVibeMode("per_person")}
          >
            {HOLY_SHIT_COPY.vibeModeEach}
          </motion.button>
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

      {phase === "trust" && spot && when ? (
        <TrustContractCard
          contactName={trustName}
          vibe={trustVibe}
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
