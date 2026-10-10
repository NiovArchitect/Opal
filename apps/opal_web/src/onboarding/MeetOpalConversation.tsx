/**
 * Paste W6 Phase 1 — Meet Opal ONE scrolling page.
 * Document order: orb → greeting → name → friend → permissions → Assist → sticky Continue.
 * Does not render ask_more / ask_when / ask_vibe / working / trust.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  HOLY_SHIT_COPY,
  MEET_OPAL_PERMISSION_ORDER,
  saveMeetOpalPermissions,
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
import { UsernameSettingsHint } from "./UsernameSettingsHint";
import { ContactSuggestPicker } from "../people/ContactSuggestPicker";
import {
  requestNativeContacts,
  shouldUseNativeContactsBridge,
} from "../nativeHostBridge";
import {
  loadProfile,
  saveProfile,
  updateAssistPreference,
  updateProfile,
} from "../api/productClient";

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

type AssistChoice = "pending" | "enabled" | "not_now";

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
    case "notifications":
      return {
        title: HOLY_SHIT_COPY.permNotificationsTitle,
        why: HOLY_SHIT_COPY.permNotificationsWhy,
      };
    case "location":
      return { title: HOLY_SHIT_COPY.permLocationTitle, why: HOLY_SHIT_COPY.permLocationWhy };
  }
}

function OpalGreeting({ index }: { index: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="hs-line hs-line-opal"
      data-testid="hs-opal-greeting"
      initial={reduce ? false : { opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduce
          ? { duration: 0 }
          : { duration: MSG_SLIDE_MS / 1000, delay: Math.min(index, 3) * 0.1, ease: EASE_OUT }
      }
    >
      <div className="hs-line-body hs-greeting-block">
        <p className="hs-greeting-headline" data-testid="hs-greeting-headline">
          {HOLY_SHIT_COPY.greetingHeadline}
        </p>
        <p className="hs-greeting-subhead" data-testid="hs-greeting-subhead">
          {HOLY_SHIT_COPY.greetingSubhead}
        </p>
        <div className="hs-greeting-values" data-testid="hs-greeting-values">
          {HOLY_SHIT_COPY.greetingValueLines.map((line) => (
            <p key={line} className="hs-greeting-value-line">
              {line}
            </p>
          ))}
        </div>
      </div>
    </motion.div>
  );
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
  const [showForm, setShowForm] = useState(false);
  const [selfNameDraft, setSelfNameDraft] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [pendingPhonePerson, setPendingPhonePerson] = useState<HolyShitPerson | null>(null);
  const [people, setPeople] = useState<HolyShitPerson[]>([]);
  const [resolveBusy, setResolveBusy] = useState(false);
  const [permBusy, setPermBusy] = useState<MeetOpalPermissionKind | null>(null);
  const [permDecisions, setPermDecisions] = useState<Record<MeetOpalPermissionKind, PermDecision>>(
    () => ({
      contacts: "pending",
      notifications: "pending",
      location: "pending",
    }),
  );
  const [assistChoice, setAssistChoice] = useState<AssistChoice>("pending");
  const [finishing, setFinishing] = useState(false);
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

  // Short greeting reveal, then show ALL sections at once (no phase screens).
  useEffect(() => {
    if (phase !== "greeting") return;
    if (reduce) {
      setShowTyping(false);
      setShowGreeting(true);
      setShowForm(true);
      setOrbMode("idle");
      setPhase("form");
      if (!contactsPickerAvailable()) {
        setContactsUnavailable(true);
        setContactsStatus(HOLY_SHIT_COPY.contactsUnavailableTyping);
      }
      return;
    }
    const tGreet = window.setTimeout(() => {
      setShowTyping(false);
      setShowGreeting(true);
      setOrbMode("idle");
    }, TYPING_MS);
    const tForm = window.setTimeout(() => {
      setShowForm(true);
      setPhase("form");
      setOrbMode("idle");
      if (!contactsPickerAvailable()) {
        setContactsUnavailable(true);
        setContactsStatus(HOLY_SHIT_COPY.contactsUnavailableTyping);
      }
    }, TYPING_MS + GREETING_SLIDE_MS + ASK_NAME_PAUSE_MS);
    return () => {
      window.clearTimeout(tGreet);
      window.clearTimeout(tForm);
    };
  }, [phase, reduce]);

  useEffect(() => {
    if (showForm && phase === "form") selfNameRef.current?.focus();
  }, [showForm, phase]);

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
    showForm,
    people,
    showTyping,
    pullingName,
    pendingPhonePerson,
    confirmedLine,
    contactsStatus,
    reduce,
  ]);

  const markPerm = (kind: MeetOpalPermissionKind, decision: PermDecision) => {
    setPermDecisions((prev) => ({ ...prev, [kind]: decision }));
  };

  /** Contacts / notifications / location — never window.location. */
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

  /** Select friend in-page — does not finish (sticky Continue does). */
  const selectPerson = (person: HolyShitPerson, confirmText?: string) => {
    const key = person.name.trim().toLowerCase();
    if (!key) return;
    setPendingPhonePerson(null);
    setPhoneDraft("");
    setPeople([person]);
    setPullingName(null);
    setConfirmedLine(confirmText || HOLY_SHIT_COPY.confirmContact(person.name));
    setNameDraft("");
  };

  /** Phone gate for contacts without phone. */
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
      return;
    }
    selectPerson(row, HOLY_SHIT_COPY.confirmContact(person.name));
    setContactsStatus(null);
  };

  const submitManualPhone = () => {
    if (!pendingPhonePerson) return;
    const phone = phoneDraft.trim();
    if (!phone) return;
    selectPerson(
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
          selectPerson({ name: trimmed, source: "fresh" });
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
          setContactsStatus("Pick the right person below, or Choose from contacts.");
          return;
        }
        setPullingName(null);
        selectPerson({ name: trimmed, source: "fresh" });
        setNameDraft("");
      })();
      return;
    }

    setPullingName(null);
    selectPerson({ name: trimmed, source: "fresh" });
    setNameDraft("");
  };

  const skipFriend = () => {
    setPeople([]);
    setPendingPhonePerson(null);
    setPhoneDraft("");
    setNameDraft("");
    setConfirmedLine(null);
    setContactsStatus(null);
    setPullingName(null);
  };

  const setAssist = (enabled: boolean) => {
    setAssistChoice(enabled ? "enabled" : "not_now");
    void updateAssistPreference(enabled, bearer ?? undefined).catch(() => undefined);
  };

  /** Sticky Continue: save profile + perms, persist friend if chosen, then onComplete. */
  const handleMeetContinue = () => {
    const display = selfNameDraft.trim();
    if (!display || finishing) return;
    setFinishing(true);
    const handle = suggestUsernameFromName(display);
    let profileUserId = "pending-onboarding";
    try {
      const prev = loadProfile();
      profileUserId = prev?.user_id || "pending-onboarding";
      saveProfile({
        user_id: profileUserId,
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
    saveMeetOpalPermissions(permDecisions, profileUserId);
    if (bearer && handle) {
      void updateProfile({ displayName: display, handle }, bearer).catch(() => undefined);
    }

    const friend = people[0] ?? null;
    let persisted = contactPersisted;
    const finishNow = (ok: boolean) => {
      onComplete(
        buildState({
          people: friend ? [friend] : [],
          when: null,
          vibe: null,
          spot: null,
          contactPersisted: ok,
        }),
      );
    };

    if (friend?.phone?.trim() && bearer) {
      void persistOnboardingContact(friend, bearer).then((res) => {
        if (res.ok) {
          setContactPersisted(true);
          persisted = true;
        }
        finishNow(persisted);
      });
      return;
    }
    finishNow(persisted);
  };

  const canContinue = selfNameDraft.trim().length > 0 && !finishing;

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
          {showGreeting ? <OpalGreeting index={0} /> : null}

          {showTyping ? (
            <div className="hs-line hs-line-typing" data-testid="hs-opal-typing">
              <HsTypingDots />
            </div>
          ) : null}

          {showForm ? (
            <>
              {/* ask_name section */}
              <OpalLine
                text={HOLY_SHIT_COPY.askSelfName}
                testId="hs-opal-ask-self-name"
                index={1}
              />
              <div
                className="hs-people-composer hs-self-name-composer hs-meet-section"
                data-testid="hs-self-name-composer"
              >
                <div className="hs-self-name-form">
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
                    <UsernameSettingsHint handle={derivedHandle} variant="plain" />
                  ) : null}
                </div>
              </div>

              {/* ask_people — W4 dual-path */}
              <OpalLine
                text={HOLY_SHIT_COPY.askPeople}
                testId="hs-opal-ask-name"
                index={2}
              />
              {people.map((p) => (
                <YouLine key={`person-${p.name}`} text={p.name} />
              ))}
              {pullingName ? (
                <OpalLine
                  text={HOLY_SHIT_COPY.pullingUp(pullingName)}
                  testId="hs-opal-pulling"
                  index={3}
                />
              ) : null}
              {confirmedLine && people.length > 0 ? (
                <OpalLine
                  text={confirmedLine}
                  testId="hs-opal-confirm-contact"
                  index={3}
                />
              ) : null}

              {pendingPhonePerson ? (
                <div className="hs-people-composer hs-meet-section" data-testid="hs-phone-gate">
                  <p
                    className="hs-contacts-status"
                    role="status"
                    data-testid="hs-contacts-status"
                  >
                    {contactsStatus ||
                      HOLY_SHIT_COPY.contactsNoPhone(pendingPhonePerson.name)}
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
                      selectPerson(
                        pendingPhonePerson,
                        HOLY_SHIT_COPY.confirmContact(pendingPhonePerson.name),
                      );
                      setContactsStatus(null);
                    }}
                  >
                    {HOLY_SHIT_COPY.phoneSkipInvite}
                  </button>
                </div>
              ) : (
                <div
                  className="hs-people-composer hs-meet-section"
                  data-testid="hs-name-composer"
                >
                  {/* Paste W2 1.2 HARD RULE: status ABOVE inputs/buttons — never over primary actions. */}
                  {contactsStatus ? (
                    <p
                      className="hs-contacts-status"
                      role="status"
                      data-testid="hs-contacts-status"
                    >
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
                    enabled={showForm && !contactsUnavailable}
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
              )}

              {/* ask_permissions — compact rows */}
              <OpalLine
                text={HOLY_SHIT_COPY.askPermissions}
                testId="hs-opal-ask-permissions"
                index={4}
              />
              <div className="hs-perm-composer hs-meet-section" data-testid="hs-permissions">
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
                        <div
                          className="hs-perm-row-actions"
                          role="group"
                          aria-label={copy.title}
                        >
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
                            className="hs-pill hs-perm-skip hs-perm-not-now"
                            data-testid={`hs-perm-skip-${kind}`}
                            disabled={permBusy === kind || decision !== "pending"}
                            onClick={() => markPerm(kind, "skipped")}
                          >
                            {HOLY_SHIT_COPY.permNotNow}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Opal Assist — ONE row */}
              <div
                className="hs-assist-row"
                data-testid="hs-assist-row"
                data-assist-choice={assistChoice}
              >
                <p className="hs-assist-row-copy">{HOLY_SHIT_COPY.assistRow}</p>
                <div className="hs-assist-row-actions" role="group" aria-label="Opal Assist">
                  <button
                    type="button"
                    className="hs-pill hs-pill-primary hs-assist-enable"
                    data-testid="hs-assist-enable"
                    disabled={assistChoice === "enabled"}
                    onClick={() => setAssist(true)}
                  >
                    {HOLY_SHIT_COPY.assistEnable}
                  </button>
                  <button
                    type="button"
                    className="hs-pill hs-assist-not-now"
                    data-testid="hs-assist-not-now"
                    disabled={assistChoice === "not_now"}
                    onClick={() => setAssist(false)}
                  >
                    {HOLY_SHIT_COPY.assistNotNow}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {showForm ? (
        <div className="hs-meet-sticky-continue">
          <button
            type="button"
            className="hs-meet-send hs-meet-send-block"
            data-testid="hs-meet-continue"
            disabled={!canContinue}
            onClick={handleMeetContinue}
          >
            {HOLY_SHIT_COPY.meetContinue}
          </button>
        </div>
      ) : null}
    </div>
  );
}
