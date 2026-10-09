/**
 * Paste W4 Phase 0 — Meet Opal diet.
 * Order: greeting → ask_name → ask_permissions (ONE screen) → ask_people → onComplete.
 * Does not render ask_more / ask_when / ask_vibe / working / trust.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  HOLY_SHIT_COPY,
  MEET_OPAL_PERMISSION_ORDER,
  suggestUsernameFromName,
  type HolyShitOnboardingState,
  type HolyShitPerson,
  type HolyShitSpot,
  type HolyShitVibe,
  type HolyShitWhen,
  type MeetOpalPermissionKind,
  type MeetOpalPhase,
} from "./holyShitCopy";
import { HsTypingDots, OpalPresenceOrb, type OpalOrbMode } from "./OpalPresenceOrb";
import { ContactSuggestPicker } from "../people/ContactSuggestPicker";
import {
  requestNativeContacts,
  shouldUseNativeContactsBridge,
} from "../nativeHostBridge";
import { loadProfile, saveProfile, updateProfile } from "../api/productClient";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const GREETING_SLIDE_MS = 400;
const ASK_NAME_PAUSE_MS = 800;
const TYPING_MS = 650;
const MSG_SLIDE_MS = 300;

type Props = {
  bearer?: string | null;
  onComplete: (state: HolyShitOnboardingState) => void;
  onSkipToAuth?: () => void;
};

type PersistResult = { ok: boolean; reason?: string };

type PermDecision = "pending" | "allowed" | "skipped";

/** Persist via existing contacts/resolve (do not call a missing onboarding route). */
async function persistOnboardingContact(
  person: HolyShitPerson,
  bearer?: string | null,
): Promise<PersistResult> {
  if (!bearer) {
    return { ok: false, reason: HOLY_SHIT_COPY.contactPersistFailed };
  }
  if (!person.phone?.trim()) {
    return {
      ok: false,
      reason: HOLY_SHIT_COPY.contactPersistNoPhone(person.name),
    };
  }
  try {
    const res = await fetch("/api/v1/product/contacts/resolve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify({
        phone: person.phone,
        label: person.name,
        local_display_label: person.name,
        idempotency_key: `hs-contact-${person.contact_id || person.phone}-${Date.now()}`,
        trace_id: "hs-meet-opal-contact",
      }),
    });
    if (res.ok) {
      const birthday = (
        person as { birthday?: { month: number; day: number; year?: number | null } }
      ).birthday;
      if (birthday?.month && birthday?.day) {
        void fetch("/api/v1/product/contacts/celebration-sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${bearer}`,
          },
          body: JSON.stringify({ name: person.name, birthday }),
        }).catch(() => undefined);
      }
      return { ok: true };
    }
    return { ok: false, reason: HOLY_SHIT_COPY.contactPersistFailed };
  } catch {
    return { ok: false, reason: HOLY_SHIT_COPY.contactPersistFailed };
  }
}

/** True only when Google Calendar connector reports connected (no fake success). */
async function checkCalendarConnected(bearer?: string | null): Promise<boolean> {
  if (!bearer) return false;
  try {
    const statusRes = await fetch("/api/v1/product/connectors/google_calendar", {
      headers: { Authorization: `Bearer ${bearer}` },
    });
    if (statusRes.ok) {
      const data = (await statusRes.json().catch(() => null)) as {
        connected?: boolean;
        status?: string;
      } | null;
      if (data?.connected === true || data?.status === "connected") return true;
    }
    const startRes = await fetch("/api/v1/product/connectors/google_calendar/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
      },
      body: "{}",
    });
    if (startRes.status === 503) return false;
    return false;
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

function permCopyFor(kind: MeetOpalPermissionKind): { title: string; why: string } {
  switch (kind) {
    case "contacts":
      return { title: HOLY_SHIT_COPY.permContactsTitle, why: HOLY_SHIT_COPY.permContactsWhy };
    case "calendar":
      return { title: HOLY_SHIT_COPY.permCalendarTitle, why: HOLY_SHIT_COPY.permCalendarWhy };
    case "notifications":
      return {
        title: HOLY_SHIT_COPY.permNotificationsTitle,
        why: HOLY_SHIT_COPY.permNotificationsWhy,
      };
    case "location":
      return { title: HOLY_SHIT_COPY.permLocationTitle, why: HOLY_SHIT_COPY.permLocationWhy };
  }
}

function contactsPickerAvailable(): boolean {
  if (shouldUseNativeContactsBridge()) return true;
  const nav = navigator as Navigator & {
    contacts?: { select?: unknown };
  };
  return typeof nav.contacts?.select === "function";
}

export function MeetOpalConversation({ bearer, onComplete, onSkipToAuth }: Props) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<MeetOpalPhase>("greeting");
  const [orbMode, setOrbMode] = useState<OpalOrbMode>("typing");
  const [showTyping, setShowTyping] = useState(true);
  const [showGreeting, setShowGreeting] = useState(false);
  const [showPeopleComposer, setShowPeopleComposer] = useState(false);
  const [showSelfNameComposer, setShowSelfNameComposer] = useState(false);
  const [selfNameDraft, setSelfNameDraft] = useState("");
  const [selfNameCommitted, setSelfNameCommitted] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [pendingPhonePerson, setPendingPhonePerson] = useState<HolyShitPerson | null>(null);
  const [people, setPeople] = useState<HolyShitPerson[]>([]);
  const [resolveBusy, setResolveBusy] = useState(false);
  const [permBusy, setPermBusy] = useState<MeetOpalPermissionKind | null>(null);
  const [permDecisions, setPermDecisions] = useState<Record<MeetOpalPermissionKind, PermDecision>>(
    () => ({
      contacts: "pending",
      calendar: "pending",
      notifications: "pending",
      location: "pending",
    }),
  );
  const [contactPersisted, setContactPersisted] = useState(false);
  const [contactsStatus, setContactsStatus] = useState<string | null>(null);
  const [contactsDeniedOnce, setContactsDeniedOnce] = useState(false);
  const [contactsUnavailable, setContactsUnavailable] = useState(false);
  const [contactSheetOpen, setContactSheetOpen] = useState(false);
  const [pullingName, setPullingName] = useState<string | null>(null);
  const [confirmedLine, setConfirmedLine] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selfNameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const derivedHandle = useMemo(
    () => suggestUsernameFromName(selfNameDraft),
    [selfNameDraft],
  );

  useEffect(() => {
    if (phase !== "greeting") return;
    if (reduce) {
      setShowTyping(false);
      setShowGreeting(true);
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
      setPhase("ask_name");
      setOrbMode("idle");
    }, TYPING_MS + GREETING_SLIDE_MS + ASK_NAME_PAUSE_MS + TYPING_MS);
    return () => {
      window.clearTimeout(tGreet);
      window.clearTimeout(tAskTyping);
      window.clearTimeout(tAsk);
    };
  }, [phase, reduce]);

  // Reveal self-name composer after ask_name bubble (own effect so phase flips
  // do not cancel the reveal timer).
  useEffect(() => {
    if (phase !== "ask_name" || showSelfNameComposer) return;
    if (reduce) {
      setShowSelfNameComposer(true);
      return;
    }
    const t = window.setTimeout(() => setShowSelfNameComposer(true), 120);
    return () => window.clearTimeout(t);
  }, [phase, showSelfNameComposer, reduce]);

  useEffect(() => {
    if (showSelfNameComposer && phase === "ask_name") selfNameRef.current?.focus();
  }, [showSelfNameComposer, phase]);

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
    if (showPeopleComposer && phase === "ask_people" && !pendingPhonePerson) {
      inputRef.current?.focus();
    }
  }, [showPeopleComposer, phase, pendingPhonePerson]);

  useEffect(() => {
    if (pendingPhonePerson) phoneRef.current?.focus();
  }, [pendingPhonePerson]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [
    phase,
    showGreeting,
    showSelfNameComposer,
    selfNameCommitted,
    people,
    showTyping,
    pullingName,
    pendingPhonePerson,
    confirmedLine,
    contactsStatus,
    reduce,
  ]);

  const finish = (nextPeople: HolyShitPerson[], persisted: boolean) => {
    onComplete(
      buildState({
        people: nextPeople,
        when: null,
        vibe: null,
        spot: null,
        contactPersisted: persisted,
      }),
    );
  };

  const beginAskPeople = () => {
    setShowPeopleComposer(false);
    setPhase("ask_people");
    setOrbMode("idle");
    if (!contactsPickerAvailable()) {
      setContactsUnavailable(true);
      setContactsStatus(HOLY_SHIT_COPY.contactsUnavailableTyping);
    }
  };

  /** Set profile name + derived username, then permissions. */
  const submitSelfName = () => {
    const display = selfNameDraft.trim();
    if (!display) return;
    const handle = suggestUsernameFromName(display);
    try {
      const prev = loadProfile();
      saveProfile({
        user_id: prev?.user_id || "pending-onboarding",
        display_name: display,
        handle: handle || undefined,
        session_id: prev?.session_id,
        access_token: prev?.access_token,
        refresh_token: prev?.refresh_token,
        cookie_session: prev?.cookie_session,
      });
    } catch {
      /* private mode — still continue */
    }
    if (bearer && handle) {
      void updateProfile({ displayName: display, handle }, bearer).catch(() => undefined);
    }
    setSelfNameCommitted(display);
    setShowSelfNameComposer(false);
    setPhase("ask_permissions");
    setOrbMode("idle");
  };

  const markPerm = (kind: MeetOpalPermissionKind, decision: PermDecision) => {
    setPermDecisions((prev) => ({ ...prev, [kind]: decision }));
  };

  /** Contacts / calendar / notifications / location — never window.location. */
  const requestPermission = async (kind: MeetOpalPermissionKind) => {
    if (permBusy) return;
    setPermBusy(kind);
    try {
      if (kind === "contacts") {
        if (shouldUseNativeContactsBridge()) {
          const res = await requestNativeContacts({ mode: "search", query: "a", limit: 1 });
          if (res.status === "denied") {
            setContactsDeniedOnce(true);
            setContactsUnavailable(true);
          }
        } else {
          const nav = navigator as Navigator & {
            contacts?: {
              select: (
                props: string[],
                opts: { multiple: boolean },
              ) => Promise<unknown>;
            };
          };
          if (nav.contacts?.select) {
            try {
              await nav.contacts.select(["name", "tel"], { multiple: false });
            } catch {
              setContactsDeniedOnce(true);
            }
          } else {
            setContactsDeniedOnce(true);
            setContactsUnavailable(true);
          }
        }
      } else if (kind === "calendar") {
        await checkCalendarConnected(bearer);
      } else if (kind === "notifications") {
        try {
          if (typeof Notification !== "undefined" && Notification.requestPermission) {
            await Notification.requestPermission();
          }
        } catch {
          /* adapt and continue */
        }
      } else if (kind === "location") {
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          await new Promise<void>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              () => resolve(),
              () => resolve(),
              { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
            );
          });
        }
      }
      markPerm(kind, "allowed");
    } finally {
      setPermBusy(null);
    }
  };

  /** Finish immediately after confirming person — no ask_more. */
  const advanceWithPerson = (person: HolyShitPerson, confirmText?: string) => {
    const key = person.name.trim().toLowerCase();
    if (!key) return;
    setPendingPhonePerson(null);
    setPhoneDraft("");
    const nextPeople = (() => {
      if (people.some((p) => p.name.trim().toLowerCase() === key)) return people;
      return [...people, person].slice(0, HOLY_SHIT_COPY.peopleMax);
    })();
    setPeople(nextPeople);
    setShowPeopleComposer(false);
    setPullingName(null);
    setConfirmedLine(confirmText || HOLY_SHIT_COPY.confirmContact(person.name));
    // Persist in background; Phase 0 finishes now (when/vibe/spot null OK).
    void persistOnboardingContact(person, bearer).then((res) => {
      if (res.ok) setContactPersisted(true);
    });
    finish(nextPeople, contactPersisted);
  };

  /** Phone gate for contacts without phone: Continue without inviting → finish. */
  const acceptDeviceContact = (person: {
    contact_id: string;
    name: string;
    phone?: string;
    email?: string;
    organization?: string;
  }) => {
    const row: HolyShitPerson = {
      name: person.name,
      phone: person.phone,
      contact_id: person.contact_id,
      email: person.email,
      organization: person.organization,
      source: "contacts",
    };
    setNameDraft("");
    setPullingName(null);
    setContactSheetOpen(false);
    if (!person.phone?.trim()) {
      setPendingPhonePerson(row);
      setContactsStatus(HOLY_SHIT_COPY.contactsNoPhone(person.name));
      setShowPeopleComposer(false);
      return;
    }
    advanceWithPerson(row, HOLY_SHIT_COPY.confirmContact(person.name));
    setContactsStatus(null);
  };

  const submitManualPhone = () => {
    if (!pendingPhonePerson) return;
    const phone = phoneDraft.trim();
    if (!phone) return;
    advanceWithPerson(
      { ...pendingPhonePerson, phone },
      HOLY_SHIT_COPY.confirmContact(pendingPhonePerson.name),
    );
    setContactsStatus(null);
  };

  const selectFromContacts = async () => {
    if (resolveBusy || contactsUnavailable) return;
    setResolveBusy(true);
    setContactsStatus(null);
    try {
      if (shouldUseNativeContactsBridge()) {
        setContactSheetOpen(true);
        return;
      }
      const nav = navigator as Navigator & {
        contacts?: {
          select: (
            props: string[],
            opts: { multiple: boolean },
          ) => Promise<Array<{ name?: string[]; tel?: string[]; email?: string[] }>>;
        };
      };
      if (!nav.contacts?.select) {
        setContactsUnavailable(true);
        setContactsStatus(HOLY_SHIT_COPY.contactsUnavailableTyping);
        setContactsDeniedOnce(true);
        return;
      }
      const rows = await nav.contacts.select(["name", "tel", "email"], {
        multiple: false,
      });
      const row = rows?.[0];
      if (!row) {
        setContactsStatus(HOLY_SHIT_COPY.contactsCancelled);
        return;
      }
      const label = ((row.name && row.name[0]) || "").trim();
      const tel = (row.tel || []).find((t) => t && t.trim())?.trim();
      const email = (row.email || []).find((e) => e && e.trim())?.trim();
      if (!label) {
        setContactsUnavailable(true);
        setContactsStatus(HOLY_SHIT_COPY.contactsUnavailableTyping);
        return;
      }
      acceptDeviceContact({
        contact_id: `web-${label.toLowerCase().replace(/\s+/g, "-")}`,
        name: label,
        phone: tel,
        email,
      });
    } catch {
      setContactsStatus(HOLY_SHIT_COPY.contactsCancelled);
    } finally {
      setResolveBusy(false);
      setPullingName(null);
    }
  };

  const submitTypedName = () => {
    const trimmed = nameDraft.trim().replace(/,+$/, "");
    if (!trimmed || resolveBusy) return;
    setContactsStatus(null);

    if (shouldUseNativeContactsBridge() && !contactsDeniedOnce && !contactsUnavailable) {
      setPullingName(trimmed);
      setResolveBusy(true);
      void (async () => {
        const res = await requestNativeContacts({
          mode: "search",
          query: trimmed,
          limit: 12,
        });
        setResolveBusy(false);
        if (res.status === "denied") {
          setContactsDeniedOnce(true);
          setContactsUnavailable(true);
          setContactsStatus(HOLY_SHIT_COPY.contactsUnavailableTyping);
          setPullingName(null);
          advanceWithPerson({ name: trimmed, source: "fresh" });
          setNameDraft("");
          return;
        }
        if (res.status === "ok" && res.contacts.length === 1) {
          const only = res.contacts[0]!;
          if (only.name.trim().toLowerCase() === trimmed.toLowerCase()) {
            acceptDeviceContact({
              contact_id: only.id,
              name: only.name,
              phone: only.phones[0],
              email: only.emails[0],
              organization: only.organization,
            });
            return;
          }
        }
        if (res.status === "ok" && res.contacts.length > 0) {
          setPullingName(null);
          setShowPeopleComposer(true);
          setContactsStatus("Pick the right person below, or Choose from contacts.");
          return;
        }
        setPullingName(null);
        // No match — finish with typed name (Phase 0: no vibe/when path).
        advanceWithPerson({ name: trimmed, source: "fresh" });
        setNameDraft("");
      })();
      return;
    }

    setPullingName(null);
    advanceWithPerson({ name: trimmed, source: "fresh" });
    setNameDraft("");
  };

  const skipFriend = () => {
    finish([], contactPersisted);
  };

  const lines: Line[] = [];
  if (showGreeting) {
    lines.push({
      kind: "opal",
      id: "greeting",
      text: HOLY_SHIT_COPY.greeting,
    });
  }
  if (phase === "ask_name" || selfNameCommitted) {
    lines.push({
      kind: "opal",
      id: "ask_name",
      text: HOLY_SHIT_COPY.askSelfName,
    });
  }
  if (selfNameCommitted) {
    lines.push({ kind: "you", id: "self-name", text: selfNameCommitted });
  }
  if (phase === "ask_permissions") {
    lines.push({
      kind: "opal",
      id: "ask_permissions",
      text: HOLY_SHIT_COPY.askPermissions,
    });
  }
  if (phase === "ask_people") {
    lines.push({ kind: "opal", id: "ask_people", text: HOLY_SHIT_COPY.askPeople });
  }
  for (const p of people) {
    lines.push({ kind: "you", id: `person-${p.name}`, text: p.name });
  }
  if (pullingName) {
    lines.push({
      kind: "opal",
      id: "pulling",
      text: HOLY_SHIT_COPY.pullingUp(pullingName),
    });
  }
  if (confirmedLine && people.length > 0) {
    lines.push({ kind: "opal", id: "confirm-contact", text: confirmedLine });
  }

  const showSelfNameRow = phase === "ask_name" && showSelfNameComposer && !showTyping;
  const showPermRow = phase === "ask_permissions" && !showTyping;
  const showPhoneGate = phase === "ask_people" && !!pendingPhonePerson && !pullingName;
  const showPeopleRow =
    phase === "ask_people" &&
    showPeopleComposer &&
    !pullingName &&
    !pendingPhonePerson;

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
          <OpalPresenceOrb mode={orbMode} size={80} showStatus />
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
                      ? "hs-opal-ask-self-name"
                      : line.id === "ask_permissions"
                        ? "hs-opal-ask-permissions"
                        : line.id === "ask_people"
                          ? "hs-opal-ask-name"
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
        </div>
      </div>

      {showSelfNameRow ? (
        <div
          className="hs-people-composer hs-self-name-composer"
          data-testid="hs-self-name-composer"
        >
          <form
            className="hs-self-name-form"
            onSubmit={(e) => {
              e.preventDefault();
              submitSelfName();
            }}
          >
            <div className="hs-meet-composer hs-meet-composer-inline opal-composer-brand">
              <input
                ref={selfNameRef}
                className="hs-meet-input"
                data-testid="hs-self-name-input"
                placeholder={HOLY_SHIT_COPY.selfNamePlaceholder}
                value={selfNameDraft}
                onChange={(e) => setSelfNameDraft(e.target.value)}
                autoComplete="name"
                enterKeyHint="done"
                aria-label={HOLY_SHIT_COPY.askSelfName}
              />
            </div>
            {derivedHandle ? (
              <p className="hs-people-hint" data-testid="hs-self-username-hint">
                {HOLY_SHIT_COPY.selfUsernameQuiet(derivedHandle)}
              </p>
            ) : null}
            <button
              type="submit"
              className="hs-meet-send hs-meet-send-block"
              data-testid="hs-self-name-submit"
              disabled={!selfNameDraft.trim()}
            >
              {HOLY_SHIT_COPY.selfNameContinue}
            </button>
          </form>
        </div>
      ) : null}

      {showPermRow ? (
        <div className="hs-perm-composer" data-testid="hs-permissions">
          <ul className="hs-perm-list" data-testid="hs-perm-list">
            {MEET_OPAL_PERMISSION_ORDER.map((kind) => {
              const copy = permCopyFor(kind);
              const decision = permDecisions[kind];
              return (
                <li
                  key={kind}
                  className="hs-perm-row"
                  data-testid={`hs-perm-row-${kind}`}
                  data-perm-kind={kind}
                  data-perm-decision={decision}
                >
                  <div className="hs-perm-row-copy">
                    <span className="hs-perm-row-title">{copy.title}</span>
                    <span className="hs-perm-row-why">{copy.why}</span>
                  </div>
                  <div className="hs-perm-row-actions" role="group" aria-label={copy.title}>
                    <button
                      type="button"
                      className="hs-pill hs-pill-primary hs-perm-allow"
                      data-testid={`hs-perm-allow-${kind}`}
                      disabled={permBusy === kind || decision !== "pending"}
                      onClick={() => void requestPermission(kind)}
                    >
                      {HOLY_SHIT_COPY.permAllow}
                    </button>
                    <button
                      type="button"
                      className="hs-pill hs-perm-skip"
                      data-testid={`hs-perm-skip-${kind}`}
                      disabled={permBusy === kind || decision !== "pending"}
                      onClick={() => markPerm(kind, "skipped")}
                    >
                      {HOLY_SHIT_COPY.permSkip}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {/* Continue always enabled — never block on denial. */}
          <button
            type="button"
            className="hs-meet-send hs-meet-send-block"
            data-testid="hs-perm-continue"
            onClick={beginAskPeople}
          >
            {HOLY_SHIT_COPY.permContinue}
          </button>
        </div>
      ) : null}

      {showPhoneGate && pendingPhonePerson ? (
        <div className="hs-people-composer" data-testid="hs-phone-gate">
          {/* Status above inputs — never covers Continue (Paste W2 1.2). */}
          <p className="hs-contacts-status" role="status" data-testid="hs-contacts-status">
            {contactsStatus || HOLY_SHIT_COPY.contactsNoPhone(pendingPhonePerson.name)}
          </p>
          <form
            className="hs-meet-composer hs-meet-composer-inline opal-composer-brand"
            onSubmit={(e) => {
              e.preventDefault();
              submitManualPhone();
            }}
          >
            <input
              ref={phoneRef}
              className="hs-meet-input"
              data-testid="hs-phone-input"
              inputMode="tel"
              autoComplete="tel"
              placeholder={HOLY_SHIT_COPY.phonePlaceholder}
              value={phoneDraft}
              onChange={(e) => setPhoneDraft(e.target.value)}
              enterKeyHint="done"
            />
            <button
              type="submit"
              className="hs-meet-send"
              data-testid="hs-phone-submit"
              disabled={!phoneDraft.trim()}
            >
              {HOLY_SHIT_COPY.phoneContinue}
            </button>
          </form>
          <button
            type="button"
            className="hs-meet-text-action"
            data-testid="hs-phone-skip-invite"
            onClick={() => {
              advanceWithPerson(
                pendingPhonePerson,
                HOLY_SHIT_COPY.confirmContact(pendingPhonePerson.name),
              );
              setContactsStatus(null);
            }}
          >
            {HOLY_SHIT_COPY.phoneSkipInvite}
          </button>
        </div>
      ) : null}

      {showPeopleRow ? (
        <div className="hs-people-composer" data-testid="hs-name-composer">
          {/* Paste W2 1.2 HARD RULE: status ABOVE inputs/buttons — never over primary actions. */}
          {contactsStatus ? (
            <p className="hs-contacts-status" role="status" data-testid="hs-contacts-status">
              {contactsStatus}
            </p>
          ) : null}
          <form
            className="hs-meet-composer hs-meet-composer-inline opal-composer-brand hs-friend-type-path"
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
              type="submit"
              className="hs-meet-send"
              data-testid="hs-name-submit"
              disabled={!nameDraft.trim() || resolveBusy}
            >
              {HOLY_SHIT_COPY.peopleContinue}
            </button>
          </form>
          <ContactSuggestPicker
            query={nameDraft}
            enabled={showPeopleComposer && !contactsUnavailable}
            onSelect={(person) => acceptDeviceContact(person)}
            onDeniedOnce={(msg) => {
              setContactsDeniedOnce(true);
              setContactsUnavailable(true);
              setContactsStatus(msg || HOLY_SHIT_COPY.contactsUnavailableTyping);
            }}
            openSheet={contactSheetOpen}
            onCloseSheet={() => {
              setContactSheetOpen(false);
              setResolveBusy(false);
            }}
          />
          {!contactsUnavailable ? (
            <>
              <p className="hs-friend-or" data-testid="hs-friend-or">
                {HOLY_SHIT_COPY.peopleOr}
              </p>
              <button
                type="button"
                className="hs-meet-send hs-meet-send-block hs-friend-contacts"
                data-testid="hs-resolve-contacts"
                disabled={resolveBusy}
                onClick={() => void selectFromContacts()}
              >
                {HOLY_SHIT_COPY.resolveSelect}
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="hs-meet-text-action hs-friend-skip"
            data-testid="hs-friend-skip"
            onClick={skipFriend}
          >
            {HOLY_SHIT_COPY.peopleSkip}
          </button>
        </div>
      ) : null}
    </div>
  );
}
