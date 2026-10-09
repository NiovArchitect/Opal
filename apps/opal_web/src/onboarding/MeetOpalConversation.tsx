/**
 * Holy Shit Moments 2–5 — immersive Meet Opal.
 * Order: greeting → permissions → friend/vibe → work → trust (Paste W 1.2 / L4).
 * Chat is the contact-adding flow. Flex column only. Opal owns the screen.
 */
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  HOLY_SHIT_COPY,
  MEET_OPAL_PERMISSION_ORDER,
  type HolyShitOnboardingState,
  type HolyShitPerson,
  type HolyShitSpot,
  type HolyShitVibe,
  type HolyShitWhen,
  type MeetOpalPermissionKind,
  type MeetOpalPhase,
} from "./holyShitCopy";
import { draftOnboardingCopy } from "./draftOnboardingCopy";
import { HsTypingDots, OpalPresenceOrb, type OpalOrbMode } from "./OpalPresenceOrb";
import { OpalWorking } from "./OpalWorking";
import { TrustContractCard } from "./TrustContractCard";
import { ContactSuggestPicker } from "../people/ContactSuggestPicker";
import {
  requestNativeContacts,
  shouldUseNativeContactsBridge,
} from "../nativeHostBridge";
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

type PersistResult = { ok: boolean; reason?: string };

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
      // Paste G Phase 5 — selected-contact birthday → Celebrations (never whole book).
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
    // Probe OAuth start — if unconfigured, stay honest; never navigate away mid-HS.
    const startRes = await fetch("/api/v1/product/connectors/google_calendar/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
      },
      body: "{}",
    });
    if (startRes.status === 503) return false;
    // authorize_url would dump the planning thread — do not assign location here.
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

export function MeetOpalConversation({ bearer, onComplete, onSkipToAuth }: Props) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<MeetOpalPhase>("greeting");
  const [orbMode, setOrbMode] = useState<OpalOrbMode>("typing");
  const [showTyping, setShowTyping] = useState(true);
  const [showGreeting, setShowGreeting] = useState(false);
  const [showAskPeople, setShowAskPeople] = useState(false);
  const [showPeopleComposer, setShowPeopleComposer] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [pendingPhonePerson, setPendingPhonePerson] = useState<HolyShitPerson | null>(
    null,
  );
  const [people, setPeople] = useState<HolyShitPerson[]>([]);
  const [resolveBusy, setResolveBusy] = useState(false);
  const [permBusy, setPermBusy] = useState(false);
  const [permissionKind, setPermissionKind] =
    useState<MeetOpalPermissionKind>("contacts");
  const [when, setWhen] = useState<HolyShitWhen | null>(null);
  const [vibe, setVibe] = useState<HolyShitVibe | null>(null);
  const [spot, setSpot] = useState<HolyShitSpot | null>(null);
  const [contactPersisted, setContactPersisted] = useState(false);
  const [showWhenPills, setShowWhenPills] = useState(false);
  const [showVibePills, setShowVibePills] = useState(false);
  const [showCustomVibe, setShowCustomVibe] = useState(false);
  const [customVibeDraft, setCustomVibeDraft] = useState("");
  const [pendingOpal, setPendingOpal] = useState<string | null>(null);
  const [contactsStatus, setContactsStatus] = useState<string | null>(null);
  const [contactsDeniedOnce, setContactsDeniedOnce] = useState(false);
  const [contactSheetOpen, setContactSheetOpen] = useState(false);
  const [pullingName, setPullingName] = useState<string | null>(null);
  const [confirmedLine, setConfirmedLine] = useState<string | null>(null);
  const [chosePlan, setChosePlan] = useState(false);
  const [opalDrafts, setOpalDrafts] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const customVibeRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const contactName = people[0]?.name ?? "";
  const planNameLive = people[0]?.name || contactName || "them";

  const opalText = (id: string, fallback: string) => opalDrafts[id] || fallback;

  useEffect(() => {
    if (phase !== "greeting") return;
    let cancelled = false;
    void draftOnboardingCopy({
      moment: "greeting",
      template: HOLY_SHIT_COPY.greeting,
      bearer,
    }).then((r) => {
      if (!cancelled && r.text) {
        setOpalDrafts((prev) => ({ ...prev, greeting: r.text }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [phase, bearer]);

  useEffect(() => {
    if (phase !== "greeting") return;
    if (reduce) {
      setShowTyping(false);
      setShowGreeting(true);
      setOrbMode("idle");
      setPermissionKind("contacts");
      setPhase("ask_permissions");
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
      setPermissionKind("contacts");
      setPhase("ask_permissions");
      setOrbMode("idle");
    }, TYPING_MS + GREETING_SLIDE_MS + ASK_NAME_PAUSE_MS + TYPING_MS);
    return () => {
      window.clearTimeout(tGreet);
      window.clearTimeout(tAskTyping);
      window.clearTimeout(tAsk);
    };
  }, [phase, reduce]);

  // Draft ask_more / ask_when / ask_vibe while typing delay runs.
  useEffect(() => {
    if (!pendingOpal) return;
    let cancelled = false;
    const moment =
      pendingOpal === "ask_more" || pendingOpal === "ask_when" || pendingOpal === "ask_vibe"
        ? pendingOpal
        : null;
    if (!moment) return;

    const template =
      moment === "ask_more"
        ? HOLY_SHIT_COPY.askMore(planNameLive)
        : moment === "ask_when"
          ? HOLY_SHIT_COPY.askWhen(planNameLive)
          : HOLY_SHIT_COPY.askVibeFor(planNameLive);

    void draftOnboardingCopy({
      moment,
      template,
      name: planNameLive,
      vibe: vibe || undefined,
      bearer,
    }).then((r) => {
      if (!cancelled && r.text) {
        setOpalDrafts((prev) => ({ ...prev, [moment]: r.text }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pendingOpal, planNameLive, vibe, bearer]);

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
    permissionKind,
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
    pullingName,
    pendingPhonePerson,
    confirmedLine,
    chosePlan,
    opalDrafts,
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

  useEffect(() => {
    if (pendingPhonePerson) phoneRef.current?.focus();
  }, [pendingPhonePerson]);

  const beginAskPeople = () => {
    setShowAskPeople(true);
    setShowPeopleComposer(false);
    setPhase("ask_people");
    setOrbMode("idle");
  };

  const advancePermission = () => {
    const idx = MEET_OPAL_PERMISSION_ORDER.indexOf(permissionKind);
    const next = MEET_OPAL_PERMISSION_ORDER[idx + 1];
    if (!next) {
      beginAskPeople();
      return;
    }
    setPermissionKind(next);
  };

  /** Contacts / calendar / notifications — never window.location (Paste W 1.5). */
  const requestCurrentPermission = async () => {
    if (permBusy) return;
    setPermBusy(true);
    try {
      if (permissionKind === "contacts") {
        if (shouldUseNativeContactsBridge()) {
          const res = await requestNativeContacts({ mode: "search", query: "a", limit: 1 });
          if (res.status === "denied") setContactsDeniedOnce(true);
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
          }
        }
      } else if (permissionKind === "calendar") {
        // Stay in Meet Opal — probe only; OpalWorking can connect later (B2).
        await checkCalendarConnected(bearer);
      } else if (permissionKind === "notifications") {
        try {
          if (typeof Notification !== "undefined" && Notification.requestPermission) {
            await Notification.requestPermission();
          }
        } catch {
          /* adapt and continue */
        }
      }
    } finally {
      setPermBusy(false);
      advancePermission();
    }
  };

  const advanceWithPerson = (person: HolyShitPerson, confirmText?: string) => {
    const key = person.name.trim().toLowerCase();
    if (!key) return;
    setPendingPhonePerson(null);
    setPhoneDraft("");
    setPeople((prev) => {
      if (prev.some((p) => p.name.trim().toLowerCase() === key)) return prev;
      return [...prev, person].slice(0, HOLY_SHIT_COPY.peopleMax);
    });
    setShowPeopleComposer(false);
    setPullingName(null);
    setConfirmedLine(
      confirmText || HOLY_SHIT_COPY.confirmContact(person.name, person.phone || ""),
    );
    setPendingOpal("ask_more");
    setPhase("ask_more");
    void persistOnboardingContact(person, bearer).then((res) => {
      if (res.ok) {
        setContactPersisted(true);
        return;
      }
      if (res.reason) setContactsStatus(res.reason);
    });
  };

  /** Paste W 1.4 — require phone from picker or manual entry before trust. */
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
    advanceWithPerson(row, HOLY_SHIT_COPY.confirmContact(person.name, person.phone));
    setContactsStatus(null);
  };

  const submitManualPhone = () => {
    if (!pendingPhonePerson) return;
    const phone = phoneDraft.trim();
    if (!phone) return;
    advanceWithPerson(
      { ...pendingPhonePerson, phone },
      HOLY_SHIT_COPY.confirmContact(pendingPhonePerson.name, phone),
    );
    setContactsStatus(null);
  };

  /** Open full contact list (native bridge) or browser Contact Picker. */
  const selectFromContacts = async () => {
    if (resolveBusy) return;
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
        setContactsStatus(HOLY_SHIT_COPY.contactsUnavailable);
        if (!contactsDeniedOnce) {
          setContactsDeniedOnce(true);
          setContactsStatus(HOLY_SHIT_COPY.contactsDeniedOnce);
        }
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
        setContactsStatus(HOLY_SHIT_COPY.contactsUnavailable);
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

  /**
   * Type name → show contact suggestions (native). Do NOT silently accept typed
   * text when contacts are available — user must tap a real contact (or use
   * name-only only after permission denied).
   */
  const submitTypedName = () => {
    const trimmed = nameDraft.trim().replace(/,+$/, "");
    if (!trimmed || resolveBusy) return;
    setContactsStatus(null);

    if (shouldUseNativeContactsBridge() && !contactsDeniedOnce) {
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
          setContactsStatus(HOLY_SHIT_COPY.contactsDeniedOnce);
          setPullingName(null);
          setPendingPhonePerson({ name: trimmed, source: "fresh" });
          setShowPeopleComposer(false);
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
          setContactsStatus("Pick the right person below  -  or Choose from contacts.");
          return;
        }
        setPullingName(null);
        setContactsStatus(
          "No contact match - add a phone to invite, or continue without sending.",
        );
        setPendingPhonePerson({ name: trimmed, source: "fresh" });
        setShowPeopleComposer(false);
        setNameDraft("");
      })();
      return;
    }

    setPullingName(null);
    setPendingPhonePerson({ name: trimmed, source: "fresh" });
    setContactsStatus(HOLY_SHIT_COPY.contactsNoPhone(trimmed));
    setShowPeopleComposer(false);
    setNameDraft("");
  };

  const chooseAddAnother = () => {
    setPendingOpal(null);
    setConfirmedLine(null);
    setPullingName(null);
    setShowAskPeople(true);
    setShowPeopleComposer(true);
    setPhase("ask_people");
    setNameDraft("");
  };

  const chooseLetsPlan = () => {
    setChosePlan(true);
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

  const permCopy =
    permissionKind === "contacts"
      ? {
          title: HOLY_SHIT_COPY.permContactsTitle,
          why: HOLY_SHIT_COPY.permContactsWhy,
        }
      : permissionKind === "calendar"
        ? {
            title: HOLY_SHIT_COPY.permCalendarTitle,
            why: HOLY_SHIT_COPY.permCalendarWhy,
          }
        : {
            title: HOLY_SHIT_COPY.permNotificationsTitle,
            why: HOLY_SHIT_COPY.permNotificationsWhy,
          };

  const lines: Line[] = [];
  if (showGreeting)
    lines.push({
      kind: "opal",
      id: "greeting",
      text: opalText("greeting", HOLY_SHIT_COPY.greeting),
    });
  if (phase === "ask_permissions") {
    lines.push({
      kind: "opal",
      id: "ask_permissions",
      text: HOLY_SHIT_COPY.askPermissions,
    });
    lines.push({
      kind: "opal",
      id: `perm-${permissionKind}`,
      text: `${permCopy.title} - ${permCopy.why}`,
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
  if (
    !pendingOpal &&
    !pullingName &&
    people.length > 0 &&
    phase === "ask_more"
  ) {
    lines.push({
      kind: "opal",
      id: "ask_more",
      text: opalText("ask_more", HOLY_SHIT_COPY.askMore(planName)),
    });
  }
  if (chosePlan && !pendingOpal && phase !== "ask_more" && phase !== "ask_people") {
    lines.push({
      kind: "you",
      id: "chose-plan",
      text: HOLY_SHIT_COPY.letsPlanWith(planName),
    });
  }
  if (
    !pendingOpal &&
    chosePlan &&
    (phase === "ask_when" || phase === "ask_vibe" || phase === "working" || phase === "trust")
  ) {
    lines.push({
      kind: "opal",
      id: "ask_when",
      text: opalText("ask_when", HOLY_SHIT_COPY.askWhen(planName)),
    });
  }
  if (when) lines.push({ kind: "you", id: "when", text: when });
  if (!pendingOpal && (phase === "ask_vibe" || phase === "working" || phase === "trust")) {
    lines.push({
      kind: "opal",
      id: "ask_vibe",
      text: opalText("ask_vibe", HOLY_SHIT_COPY.askVibeFor(planName)),
    });
    if (vibe) lines.push({ kind: "you", id: "vibe", text: vibe });
  }

  const showPermRow = phase === "ask_permissions" && !showTyping;
  const showPhoneGate =
    phase === "ask_people" && !!pendingPhonePerson && !pullingName;
  const showPeopleRow =
    phase === "ask_people" &&
    showPeopleComposer &&
    !pullingName &&
    !pendingPhonePerson;
  const showMoreRow =
    phase === "ask_more" && !pendingOpal && !pullingName && people.length > 0;
  const showWhenRow =
    phase === "ask_when" && chosePlan && showWhenPills && !when && !pendingOpal;
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
                    : line.id === "ask_permissions"
                      ? "hs-opal-ask-permissions"
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
                    onPickDayProposal={(day) => setWhen(day)}
                    onConnectCalendar={() => checkCalendarConnected(bearer)}
                  />
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {showPermRow ? (
        <div
          className="hs-perm-composer"
          data-testid="hs-permissions"
          data-perm-kind={permissionKind}
        >
          <p className="hs-perm-why" data-testid="hs-perm-why">
            {permCopy.why}
          </p>
          <div className="hs-pill-row" role="group" aria-label={permCopy.title}>
            <button
              type="button"
              className="hs-pill hs-pill-primary"
              data-testid="hs-perm-allow"
              disabled={permBusy}
              onClick={() => void requestCurrentPermission()}
            >
              {HOLY_SHIT_COPY.permAllow}
            </button>
            <button
              type="button"
              className="hs-pill"
              data-testid="hs-perm-not-now"
              disabled={permBusy}
              onClick={advancePermission}
            >
              {HOLY_SHIT_COPY.permNotNow}
            </button>
          </div>
        </div>
      ) : null}

      {showPhoneGate && pendingPhonePerson ? (
        <div className="hs-people-composer" data-testid="hs-phone-gate">
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
                HOLY_SHIT_COPY.confirmContact(pendingPhonePerson.name, ""),
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
          {people.length > 0 ? (
            <p className="hs-people-hint" data-testid="hs-people-added">
              Added: {peopleLabel}
            </p>
          ) : null}
          <form
            className="hs-meet-composer hs-meet-composer-inline opal-composer-brand"
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
              disabled={!nameDraft.trim() || resolveBusy}
              onClick={submitTypedName}
            >
              {HOLY_SHIT_COPY.peopleContinue}
            </button>
          </form>
          <ContactSuggestPicker
            query={nameDraft}
            enabled={showPeopleComposer}
            onSelect={(person) => acceptDeviceContact(person)}
            onDeniedOnce={(msg) => {
              setContactsDeniedOnce(true);
              setContactsStatus(msg || HOLY_SHIT_COPY.contactsDeniedOnce);
            }}
            openSheet={contactSheetOpen}
            onCloseSheet={() => {
              setContactSheetOpen(false);
              setResolveBusy(false);
            }}
          />
          {contactsStatus ? (
            <p className="hs-contacts-status" role="status" data-testid="hs-contacts-status">
              {contactsStatus}
            </p>
          ) : null}
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
            className="hs-pill"
            data-testid="hs-add-another"
            onClick={chooseAddAnother}
          >
            {HOLY_SHIT_COPY.addAnother}
          </button>
          <button
            type="button"
            className="hs-pill hs-pill-primary"
            data-testid="hs-lets-plan"
            onClick={chooseLetsPlan}
          >
            {HOLY_SHIT_COPY.letsPlanWith(planName)}
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
          className="hs-meet-composer hs-meet-composer-inline opal-composer-brand"
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

      {phase === "trust" && spot && when && vibe && contactName ? (
        <TrustContractCard
          contactName={contactName}
          vibe={trustVibe}
          when={when}
          spot={spot}
          bearer={bearer}
          contactPhone={people[0]?.phone}
          onSend={() => finish(spot)}
          onNotYet={() => finish(null)}
        />
      ) : null}
    </div>
  );
}
