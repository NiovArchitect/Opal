import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PLANS,
  type ChatPreview,
  type Message,
  type NeedItem,
} from "./data";
import { PRODUCT_COPY } from "./designTokens";
import { OpalLockup, OpalMark } from "./brand/OpalLogo";
import {
  CREATE_DOCK_EXPOSED,
  FIRST_RUN_STORAGE_KEY,
  PRODUCT_PUBLIC_NAME,
} from "./brand/brand";
import { FirstRunExperience } from "./onboarding/FirstRunExperience";
import { FindPeopleFlow } from "./people/FindPeopleFlow";
import {
  acceptInvitation,
  apiConfigured,
  authorizeReservation,
  cancelReservation,
  checkReservationAvailability,
  ensureDirectConversation,
  fetchSession,
  getAvailabilityIntervention,
  getAvailabilityOverlap,
  listConversations,
  listIncoming,
  listMessages,
  listMyAvailabilityWindows,
  loadSession,
  previewInviteShare,
  requestReservation,
  resumeInviteContinuation,
  saveSession,
  setMemoryAccessToken,
  sendMessage,
  shareAvailabilityWindows,
  signOut,
  type AvailabilityIntervention,
  type AvailabilityOverlap,
  type ProductSession,
  type ProductSignal,
} from "./api/productClient";
import {
  productRealtime,
  type ChannelMessage,
  type ConnectionState,
} from "./realtime/RealtimeClient";
import {
  semanticStateForSignal,
  visualShellProps,
} from "./theme/technicolorProduction";
import { AvailabilitySheet } from "./availability/AvailabilitySheet";
import { formatOverlapRange } from "./availability/formatRange";
import {
  contextualSharedCopy,
  RELATIONSHIP_PULSE_EXPERIMENT,
  resolvePrimaryOpalSurface,
} from "./opalUi/grammar";
import {
  buildPlaceShareDraft,
  buildTimeShareDraft,
  deriveSocialReality,
  formatDistanceMinutes,
  formatLeaveAround,
} from "./opalUi/socialReality";
import {
  composePlaceOptions,
  defaultPlaceCandidates,
  type PlaceCandidate,
} from "./opalUi/placeComposition";
import { SocialMomentCard } from "./opalUi/SocialMomentCard";
import { GraphSocialHome } from "./opalUi/GraphSocialHome";
import { GraphWhoPicker } from "./opalUi/GraphWhoPicker";
import { GraphPeopleThreadHeader } from "./opalUi/GraphPeopleThread";
import { GraphJourneyCard } from "./opalUi/GraphJourneyCard";
import { GraphProfilePage } from "./opalUi/GraphProfilePage";
import { GraphLivePanel } from "./opalUi/GraphLivePanel";
import { FOUNDER_HOME_FEED } from "./opalUi/founderGraphSeed";
import {
  DEMO_SOCIAL_MOMENT,
  DEMO_SOCIAL_MOMENT_MEDIA,
  applyWhenToSeed,
  lineageAfterRealityCreate,
  privateSeedFilamentBody,
  providerCandidatesForMomentSeed,
  realityFormingPrimaryAction,
  realityFormingTitle,
  seedRealityFromMoment,
  shouldOpenPlaceAfterForming,
  type MomentSeededContext,
} from "./opalUi/liveSocialMomentLoop";
import {
  assertDirectInviteDestination,
  buildWhoFastPath,
  listDirectPeopleFromChats,
  listExplicitGroupsFromChats,
  resolveDirectConversationForPerson,
  type DirectPersonOption,
  type MomentWhoOption,
} from "./opalUi/momentNamedPresence";
import { RealityFormingSurface } from "./opalUi/RealityFormingSurface";
import { PrivateCreatorImpact } from "./opalUi/PrivateCreatorImpact";
import { MomentTimeSheet } from "./opalUi/MomentTimeSheet";
import {
  applyExecutionToSeed,
  withExecutionDefaults,
  type MomentSeedWithExecution,
} from "./opalUi/realityExecution";
import {
  buildSpeakerDirectory,
  planThreadSpeakerRows,
} from "./opalUi/messageSpeaker";
import { ReservationExperience } from "./opalUi/ReservationExperiencePanel";
import {
  emptyExecutionUx,
  reduceExecutionUx,
  socialReadyForExecution,
  type ExecutionUxState,
} from "./opalUi/reservationExperience";
import { ContextChip } from "./opalUi/ContextChip";
import { PrivateGuidance } from "./opalUi/PrivateGuidance";
import { OpalInsightField } from "./opalUi/OpalInsightField";
import { OpalResolution } from "./opalUi/OpalResolution";
import {
  AwakenSurface,
  OpalFilament,
  PresenceSurface,
  PrivateOpalPlate,
  V2AmbientField,
  V2BrandRow,
  type FilamentMode,
  type PresenceEnergy,
} from "./opalUi/v2Primitives";
import {
  formatHumanTime,
  isConsequentialNeed,
  isDurableForPlans,
  isUsableReality,
  presenceLines,
  signalDetail,
  strongestPerConversation,
  strongestPerHomePresence,
  surfaceLabel,
} from "./sharedReality";
import { isRedundantFilamentLabel } from "./opalUi/composeHumanReality";
import {
  composeHomeAttentionField,
  homeEditorialLines,
  selectHomeAwaken,
  shouldShowFilamentLabel,
} from "./opalUi/attentionAuthority";

type Tab = "home" | "chats" | "plans" | "you";

const TABS: { id: Tab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "chats", label: "People" },
  { id: "plans", label: "Plans" },
  { id: "you", label: "You" },
];

/** Map durable chronology / signal kinds → filament visual mode. */
function filamentModeFor(kind?: string): FilamentMode {
  if (!kind) return "awaken";
  if (
    kind === "set" ||
    kind === "ready" ||
    kind === "follow_through" ||
    kind === "handled"
  ) {
    return "transform";
  }
  return "awaken";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Map Elixir signal kinds / lifecycle stages to demo SignalKind tokens. */
function mapSignalKind(
  kind?: string,
): import("./data").SignalKind | undefined {
  if (!kind) return undefined;
  switch (kind) {
    case "plan_forming":
      return "plan_forming";
    case "open_loop":
    case "still_open":
    case "will_know_later":
      return "open_loop";
    case "ready":
      return "ready";
    case "follow_through":
    case "handled":
      return "follow_through";
    case "moment":
      return "moment";
    case "availability_overlap":
    case "option_surfaced":
      return "availability_overlap";
    case "set":
      return "set";
    default:
      return "plan_forming";
  }
}

const FIND_TIME_HINT_KEY = "opal.find_time_hint.v1";
const PRIVATE_DISMISS_KEY = "opal.private_dismissed.v1";

function readPrivateDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(PRIVATE_DISMISS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writePrivateDismissed(ids: Set<string>): void {
  try {
    localStorage.setItem(PRIVATE_DISMISS_KEY, JSON.stringify([...ids]));
  } catch {
    /* private mode */
  }
}

/** Only surface sustained outage - not transient reconnect thrash. */
function ConnectionHint({ state }: { state: ConnectionState }) {
  if (state === "connected" || state === "offline" || state === "connecting") {
    return null;
  }
  const label =
    state === "reconnecting"
      ? "Trying to reconnect…"
      : state === "session_expired"
        ? "Sign in again"
        : state === "failed"
          ? "Connection issue"
          : null;
  if (!label) return null;
  return (
    <div className="connection-hint-sustained" role="status" aria-live="polite">
      {label}
    </div>
  );
}

function readFirstRunDone(): boolean {
  try {
    return localStorage.getItem(FIRST_RUN_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeFirstRunDone(): void {
  try {
    localStorage.setItem(FIRST_RUN_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

function clearFirstRunDone(): void {
  try {
    localStorage.removeItem(FIRST_RUN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * LOCAL DEV ONLY: force cold first-run for founder QA.
 * Query: ?opal_reset_first_run=1
 * Never a production control.
 */
function consumeResetFirstRunFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const u = new URL(window.location.href);
    const flag =
      u.searchParams.get("opal_reset_first_run") === "1" ||
      u.searchParams.get("RESET_FIRST_RUN") === "1";
    if (!flag) return false;
    clearFirstRunDone();
    u.searchParams.delete("opal_reset_first_run");
    u.searchParams.delete("RESET_FIRST_RUN");
    window.history.replaceState({}, "", u.pathname + u.search + u.hash);
    return true;
  } catch {
    return false;
  }
}

/** Opal product shell: V2 Living Void  -  social field first, identity-forward. */
export function OpalApp() {
  const [tab, setTab] = useState<Tab>("home");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [curateOpen, setCurateOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  /** Private Extend selection — never auto-messages peers. */
  const [extendSelected, setExtendSelected] = useState<{
    id: string;
    title: string;
    detail: string;
  } | null>(null);
  const [curateAccepted, setCurateAccepted] = useState(false);
  const [draft, setDraft] = useState("");
  const [threads, setThreads] = useState<Record<string, Message[]>>({});
  // Do not seed fake social graph for nonmembers or empty new members.
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [needs, setNeeds] = useState<NeedItem[]>([]);
  const [showFirstRun, setShowFirstRun] = useState(() => {
    const reset = consumeResetFirstRunFlag();
    return reset || !readFirstRunDone();
  });
  const [session, setSession] = useState<ProductSession | null>(() => loadSession());
  const [authReady, setAuthReady] = useState(false);
  const [liveSignals, setLiveSignals] = useState<ProductSignal[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("offline");
  const [findPeopleOpen, setFindPeopleOpen] = useState(false);
  const [findTimeOpen, setFindTimeOpen] = useState(false);
  const [findPlaceOpen, setFindPlaceOpen] = useState(false);
  /** Pass 20 — reservation presentation only (synthetic execution proof). */
  const [reservationUx, setReservationUx] = useState<ExecutionUxState>(() => emptyExecutionUx());
  const [reservationAuth, setReservationAuth] = useState<Record<string, unknown> | null>(null);
  const reservationBusyRef = useRef(false);

  // Escape collapses disclosure panels without side effects.
  useEffect(() => {
    if (!extendOpen && !curateOpen && !findPlaceOpen && !findTimeOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setExtendOpen(false);
      setExtendSelected(null);
      setCurateOpen(false);
      setFindPlaceOpen(false);
      setFindTimeOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [extendOpen, curateOpen, findPlaceOpen, findTimeOpen]);
  const [availabilityOverlap, setAvailabilityOverlap] =
    useState<AvailabilityOverlap | null>(null);
  const [showFindTimeHint, setShowFindTimeHint] = useState(false);
  const [overlapExpanded, setOverlapExpanded] = useState(false);
  const [privateDismissed, setPrivateDismissed] = useState<Set<string>>(
    () => readPrivateDismissed(),
  );
  /** Owner has at least one private window  -  drives proactive private nudge. */
  const [hasPrivateWindows, setHasPrivateWindows] = useState(false);
  /** Backend sufficiency decision (preferred over local heuristics). */
  const [availabilityIntervention, setAvailabilityIntervention] =
    useState<AvailabilityIntervention | null>(null);
  /** Edge one-shot animation keys already played (conversation:threshold). */
  const edgeAnimatedRef = useRef<Set<string>>(new Set());
  const [edgeAnimateKey, setEdgeAnimateKey] = useState<string | null>(null);
  const [incomingInvites, setIncomingInvites] = useState<{ id: string }[]>([]);
  const [socialMoment, setSocialMoment] = useState<string | null>(null);
  /** Pass 16/17: Moment → people (multi-select) → Reality seed */
  const [momentPeopleOpen, setMomentPeopleOpen] = useState(false);
  /** WHO 201:6 together vs send separately (presentation; dyad vs group path). */
  const [whoTogether, setWhoTogether] = useState(true);
  const [liveSurfaceOpen, setLiveSurfaceOpen] = useState(false);
  const [onMyWayActive, setOnMyWayActive] = useState(false);
  const [profilePerson, setProfilePerson] = useState<string | null>(null);
  const [momentForkChooserOpen, setMomentForkChooserOpen] = useState(false);
  /** WHO-FAST-PATH-01: secondary sheet mode after More people / Groups */
  const [momentPeopleSheetMode, setMomentPeopleSheetMode] = useState<
    "people" | "groups" | "all"
  >("all");
  /** P31-PATCH-01: Reality destination thread (dyad/group/solo key) independent of activeChat mount */
  const [momentDestinationChatId, setMomentDestinationChatId] = useState<string | null>(null);
  /** P30R2: named option active only after human tap (never preselected). */
  const [momentNamedTappedId, setMomentNamedTappedId] = useState<string | null>(null);
  const [momentSelectedPeople, setMomentSelectedPeople] = useState<string[]>([]);
  const [momentSeed, setMomentSeed] = useState<MomentSeededContext | null>(null);
  /** P30R2 124:2 forming overlay before place / curate */
  const [momentForming, setMomentForming] = useState<MomentSeededContext | null>(null);
  const [momentProviderCandidates, setMomentProviderCandidates] = useState<PlaceCandidate[] | null>(
    null,
  );
  const endRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const authenticated = Boolean(session?.user_id);

  const activeChatIdRef = useRef<string | null>(null);
  activeChatIdRef.current = activeChatId;

  /** Resolve place options: provider projection when Moment-seeded, else fixtures / server. */
  const resolvePlaceCandidates = useCallback(
    (convSignal: ProductSignal | null | undefined, threadBodies: string, whereKnown: boolean) => {
      const cf = (
        convSignal as {
          collective_fit?: {
            options?: Array<{ id?: string; name?: string; area?: string; tag?: string }>;
          };
        } | null
      )?.collective_fit;
      if (cf?.options?.length) {
        return cf.options.map((o, i) => {
          const name = o.name || "Place";
          const id =
            /juniper/i.test(name) || o.id === "juniper_ivy"
              ? "juniper"
              : /harbor/i.test(name) || o.id === "harbor_table"
                ? "harbor"
                : /campfire/i.test(name) || o.id === "campfire"
                  ? "campfire"
                  : o.id || `cf-${i}`;
          return { id, name, area: o.area || o.tag || "" };
        });
      }
      // Pass 16 SPA bridge: Moment-seeded provider candidates into existing composition
      const base =
        momentProviderCandidates && momentProviderCandidates.length > 0
          ? momentProviderCandidates
          : defaultPlaceCandidates();
      const gapLbl =
        (convSignal?.shared_reality as { place_gap_label?: string } | undefined)?.place_gap_label ||
        "";
      const composed = composePlaceOptions({
        candidates: base,
        placeGapLabel: gapLbl || (momentSeed?.placeCandidateName ? "italian" : ""),
        category: momentSeed ? "italian" : null,
        threadText: threadBodies,
        whereKnown,
        currentIntent: momentSeed ? "quiet" : null,
      });
      return composed.ranked.length ? composed.ranked : base;
    },
    [momentProviderCandidates, momentSeed],
  );

  /** Pass 30R2 / WHO-FAST-PATH-01: desire CTA → high-signal WHO sheet. */
  const handleMomentWantThis = useCallback(() => {
    setMomentSelectedPeople([]);
    setMomentNamedTappedId(null);
    setMomentPeopleSheetMode("all");
    setMomentForkChooserOpen(true);
  }, []);

  const openMorePeople = useCallback(() => {
    setMomentForkChooserOpen(false);
    setMomentNamedTappedId(null);
    setMomentSelectedPeople([]);
    setMomentPeopleSheetMode("people");
    setMomentPeopleOpen(true);
  }, []);

  const openGroups = useCallback(() => {
    setMomentForkChooserOpen(false);
    setMomentNamedTappedId(null);
    setMomentSelectedPeople([]);
    setMomentPeopleSheetMode("groups");
    setMomentPeopleOpen(true);
  }, []);

  /** WHO-FAST-PATH-01: multi-person first sheet; no Jordan monopoly. */
  const whoFastPath = useMemo(() => buildWhoFastPath(chats), [chats]);

  const applyMomentSeed = useCallback(
    (seed: NonNullable<ReturnType<typeof seedRealityFromMoment>["seed"]>, primaryChatId: string | null) => {
      const prov = providerCandidatesForMomentSeed(DEMO_SOCIAL_MOMENT);
      setMomentProviderCandidates(prov.candidates);
      setMomentSeed(seed);
      void lineageAfterRealityCreate(seed);
      setMomentPeopleOpen(false);
      setMomentForkChooserOpen(false);
      setMomentNamedTappedId(null);
      setMomentSelectedPeople([]);

      const filament: Message = {
        id: `opal-filament-moment-seed-${Date.now()}`,
        from: "them",
        body: privateSeedFilamentBody(seed),
        time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        opalFilament: true,
        opalPrivate: true,
        signal: {
          kind: "plan_forming",
          label: privateSeedFilamentBody(seed),
        },
      };

      // P31-PATCH-01: TIME composition belongs to the Reality journey, not chat mount.
      // Keep filaments on destination thread, but stay on member shell so forming + WHEN work
      // without requiring activeChat (Solo synthetic id never resolves; dyad must not hide WHEN).
      const threadKey = primaryChatId || "solo-moment-fork";
      setMomentDestinationChatId(primaryChatId);
      setThreads((prev) => ({
        ...prev,
        [threadKey]: [...(prev[threadKey] || []), filament],
      }));
      // Clear real chat early-return so RealityFormingSurface + MomentTimeSheet can mount
      setActiveChatId(primaryChatId ? null : "solo-moment-fork");
      setTab("home");
      setFindPlaceOpen(false);
      setCurateOpen(false);
      // P30R2: show Reality forming (atmosphere) before place sheet — continuous social→clarity
      setMomentForming(seed);
    },
    [],
  );

  const continueFromForming = useCallback(() => {
    const seed = momentForming;
    setMomentForming(null);
    // Pass 31: do not reopen place/Curate when exact place already grounded
    if (seed && shouldOpenPlaceAfterForming(seed)) {
      setFindPlaceOpen(true);
      return;
    }
    // Exact place grounded — next gap is WHEN (time), not WHERE
    if (seed?.exactPlaceGrounded && (seed.when === "open" || seed.nextGap === "when")) {
      setFindTimeOpen(true);
    }
  }, [momentForming]);

  /** P0-31-02: human WHEN tap → same Reality seed updates, next gap advances */
  const handleMomentTimeSelect = useCallback(
    (label: string, slotId: string) => {
      if (!momentSeed) return;
      const { seed: next, error, changed } = applyWhenToSeed(momentSeed, label, { slotId });
      if (error || !changed) {
        // Empty label rejected; identical re-tap of settled when is fine — close sheet
        if (!error && momentSeed.when === label) setFindTimeOpen(false);
        return;
      }
      setMomentSeed(withExecutionDefaults(next));
      setFindTimeOpen(false);
      // Observable filament consequence on active thread
      const body = privateSeedFilamentBody(next);
      const filament: Message = {
        id: `opal-filament-when-${Date.now()}`,
        from: "them",
        body,
        time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        opalFilament: true,
        opalPrivate: true,
        realitySeedId: next.realitySeedId,
        signal: {
          kind: "plan_forming",
          label: body,
        },
      };
      const threadKey =
        momentDestinationChatId || activeChatId || "solo-moment-fork";
      setThreads((prev) => ({
        ...prev,
        [threadKey]: [...(prev[threadKey] || []), filament],
      }));
      // After WHEN settles on a person path, open the direct destination (not a group)
      if (momentDestinationChatId) {
        setActiveChatId(momentDestinationChatId);
        setTab("chats");
      }
    },
    [momentSeed, activeChatId, momentDestinationChatId],
  );

  /**
   * P0-31-03: attach ReservationExecution to same Reality; sparse system consequence only.
   * Not a human speaker. Idempotent per executionId+status.
   */
  const applyReservationToReality = useCallback(
    (input: {
      status: string;
      executionId?: string | null;
      placeDisplayName?: string | null;
      slotLabel?: string | null;
      liveClaimed?: boolean;
    }) => {
      if (!momentSeed) return null;
      const applied = applyExecutionToSeed(momentSeed, {
        status: input.status,
        executionId: input.executionId || null,
        placeDisplayName: input.placeDisplayName || momentSeed.placeCandidateName,
        slotLabel: input.slotLabel || momentSeed.when,
        providerPlaceId: momentSeed.providerPlaceId,
        liveClaimed: input.liveClaimed,
      });
      setMomentSeed(applied.seed);
      if (applied.emitConsequence && applied.humanConsequence) {
        const isSolo =
          applied.seed.participantNames.length === 1 &&
          (applied.seed.participantNames[0] === "Solo" ||
            applied.seed.participantNames[0] === "Just me");
        // Solo: private plate. Shared: system filament (not peer bubble).
        const filament: Message = {
          id: `opal-exec-${applied.lineage.executionId || "x"}-${applied.seed.executionStatus}`,
          from: "them",
          body: applied.humanConsequence,
          time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
          opalFilament: true,
          opalPrivate: isSolo,
          opalSystemConsequence: true,
          humanSpeaker: false,
          senderUserId: null,
          realitySeedId: applied.lineage.realitySeedId,
          executionId: applied.lineage.executionId || undefined,
          signal: {
            kind: "plan_forming",
            label: applied.humanConsequence,
          },
        };
        const threadKey = isSolo
          ? momentDestinationChatId ||
            (activeChatId && activeChatId !== "solo-moment-fork"
              ? activeChatId
              : "solo-moment-fork")
          : momentDestinationChatId || activeChatId || "solo-moment-fork";
        setThreads((prev) => {
          const list = prev[threadKey] || [];
          // Idempotency: same id already present
          if (list.some((m) => m.id === filament.id)) return prev;
          return { ...prev, [threadKey]: [...list, filament] };
        });
      }
      return applied;
    },
    [momentSeed, activeChatId, momentDestinationChatId],
  );

  const handleMomentSolo = useCallback(() => {
    const actor = session?.user_id || "founder";
    const { seed, error } = seedRealityFromMoment(DEMO_SOCIAL_MOMENT, [], actor, {
      solo: true,
    });
    if (error || !seed) {
      setMomentForkChooserOpen(false);
      return;
    }
    applyMomentSeed(seed, null);
  }, [session?.user_id, applyMomentSeed]);

  /**
   * P31-PATCH-01 / WHO-FAST-PATH-01: person identity → direct dyad only.
   * Never use multi-party conversation id from title-first-name matching.
   */
  const handleMomentNamedPerson = useCallback(
    (person: DirectPersonOption) => {
      if (!person.peerUserId) return;
      setMomentNamedTappedId(person.peerUserId);
      const actor = session?.user_id || "founder";
      const conversationId =
        person.conversationId ||
        resolveDirectConversationForPerson(chats, person.peerUserId)?.conversationId ||
        null;
      if (!conversationId) {
        setMomentForkChooserOpen(false);
        return;
      }
      const gate = assertDirectInviteDestination(chats, conversationId);
      if (!gate.ok) {
        setMomentForkChooserOpen(false);
        return;
      }
      const { seed, error } = seedRealityFromMoment(
        DEMO_SOCIAL_MOMENT,
        [{ id: person.peerUserId, name: person.displayName }],
        actor,
      );
      if (error || !seed) {
        setMomentForkChooserOpen(false);
        return;
      }
      window.setTimeout(() => applyMomentSeed(seed, gate.conversationId), 120);
    },
    [session?.user_id, applyMomentSeed, chats],
  );

  /** Secondary sheet: people only, groups only, or all (legacy empty path). */
  const momentWhoOptions = useMemo((): MomentWhoOption[] => {
    if (momentPeopleSheetMode === "people") {
      // More people: remaining after fast path, or full list if opened empty
      const remaining = whoFastPath.remainingPeople;
      if (remaining.length) return remaining;
      return listDirectPeopleFromChats(chats);
    }
    if (momentPeopleSheetMode === "groups") {
      return listExplicitGroupsFromChats(chats);
    }
    return [...listDirectPeopleFromChats(chats), ...listExplicitGroupsFromChats(chats)];
  }, [chats, momentPeopleSheetMode, whoFastPath.remainingPeople]);

  const handleMomentPeopleConfirm = useCallback(async () => {
    if (!momentSelectedPeople.length) return;
    const actor = session?.user_id || "founder";
    const selectedKeys = momentSelectedPeople;

    // Single explicit group — intentional multi-party audience
    if (selectedKeys.length === 1 && selectedKeys[0].startsWith("group:")) {
      const convId = selectedKeys[0].slice("group:".length);
      const group = listExplicitGroupsFromChats(chats).find((g) => g.conversationId === convId);
      if (!group) return;
      const { seed, error } = seedRealityFromMoment(
        DEMO_SOCIAL_MOMENT,
        [{ id: group.conversationId, name: group.displayName }],
        actor,
      );
      if (error || !seed) {
        setMomentPeopleOpen(false);
        return;
      }
      applyMomentSeed(seed, group.conversationId);
      return;
    }

    // People — peer identity only; never group title masquerade
    const peerKeys = selectedKeys
      .filter((k) => k.startsWith("person:"))
      .map((k) => k.slice("person:".length));
    if (!peerKeys.length) return;

    const peopleResolved: Array<{ id: string; name: string; conversationId: string }> = [];
    for (const peerId of peerKeys) {
      const fromList = listDirectPeopleFromChats(chats).find((p) => p.peerUserId === peerId);
      let conversationId =
        resolveDirectConversationForPerson(chats, peerId)?.conversationId ||
        fromList?.conversationId ||
        null;
      if (!conversationId && session?.access_token) {
        try {
          const ensured = await ensureDirectConversation(peerId, session.access_token);
          conversationId = ensured.conversation_id;
        } catch {
          /* ensure failed — do not fall back to a shared group */
        }
      }
      if (!conversationId) continue;
      // Hard reject known multi-party destinations
      const known = chats.find((c) => c.id === conversationId);
      if (known && (known.composition === "group" || (known.memberCount ?? 0) >= 3)) {
        continue;
      }
      const gate = assertDirectInviteDestination(chats, conversationId);
      if (!gate.ok) {
        // Allowed only when conversation is newly ensured and not yet in list
        if (known) continue;
      }
      peopleResolved.push({
        id: peerId,
        name: fromList?.displayName || "Friend",
        conversationId,
      });
    }

    if (!peopleResolved.length) {
      setMomentPeopleOpen(false);
      return;
    }

    const { seed, error } = seedRealityFromMoment(
      DEMO_SOCIAL_MOMENT,
      peopleResolved.map((p) => ({ id: p.id, name: p.name })),
      actor,
    );
    if (error || !seed) {
      setMomentPeopleOpen(false);
      return;
    }
    // Audience: first direct dyad only — never a shared group for person picks
    applyMomentSeed(seed, peopleResolved[0].conversationId);
  }, [chats, momentSelectedPeople, session, applyMomentSeed]);

  const refreshPrivateWindows = useCallback(async (bearer?: string) => {
    try {
      const w = await listMyAvailabilityWindows(bearer);
      setHasPrivateWindows((w.windows?.length ?? 0) > 0);
    } catch {
      /* keep prior */
    }
  }, []);

  const refreshAvailabilityIntervention = useCallback(
    async (conversationId: string, bearer?: string) => {
      try {
        const i = await getAvailabilityIntervention(conversationId, bearer);
        setAvailabilityIntervention(i);
        if (i.overlap?.overlap_status === "overlap_found") {
          setAvailabilityOverlap(i.overlap);
        } else if (i.decision === "enough_to_compute") {
          /* keep prior overlap if any */
        } else if (
          i.decision === "needs_input" ||
          i.decision === "no_useful_intervention"
        ) {
          setAvailabilityOverlap(null);
        }
        setHasPrivateWindows(
          (i.suggested_window_ids?.length ?? 0) > 0 ||
            i.decision === "needs_permission" ||
            i.decision === "needs_confirmation",
        );
      } catch {
        setAvailabilityIntervention(null);
      }
    },
    [],
  );

  const dismissPrivate = useCallback((id: string) => {
    setPrivateDismissed((prev) => {
      const next = new Set(prev).add(id);
      writePrivateDismissed(next);
      return next;
    });
  }, []);

  // Edge one-shot on chip ambient only (real threshold, not sheet remount).
  useEffect(() => {
    if (!activeChatId) return;
    const chat = chats.find((c) => c.id === activeChatId);
    const kind = chat?.signal;
    const convSignal =
      liveSignals.find((s) => s.conversation_id === activeChatId) || null;
    const primary = resolvePrimaryOpalSurface({
      signalKind: kind,
      overlap: availabilityOverlap,
      findTimeOpen,
      findPlaceOpen,
      hasPrivateWindows,
      privateDismissed,
      signal: convSignal,
    });
    if (primary.kind !== "chip" || !primary.withEdge) return;
    const key = `${activeChatId}:chip:${kind ?? "none"}:${primary.gap ?? "x"}`;
    if (edgeAnimatedRef.current.has(key)) return;
    edgeAnimatedRef.current.add(key);
    setEdgeAnimateKey(key);
    const t = window.setTimeout(() => {
      setEdgeAnimateKey((cur) => (cur === key ? null : cur));
    }, 520);
    return () => window.clearTimeout(t);
  }, [
    activeChatId,
    availabilityOverlap,
    chats,
    findTimeOpen,
    findPlaceOpen,
    hasPrivateWindows,
    privateDismissed,
    liveSignals,
  ]);

  const applyChannelMessage = useCallback((raw: ChannelMessage) => {
    const me = sessionRef.current?.user_id;
    const openId = activeChatIdRef.current;
    // Authoritative sender from channel payload; directory resolve at render
    const ui: Message = {
      id: raw.id,
      from: me && raw.sender_user_id === me ? "me" : "them",
      body: raw.body,
      time: raw.created_at
        ? new Date(raw.created_at).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })
        : "Now",
      serverSeq: raw.server_seq,
      clientMessageId: raw.client_message_id,
      senderUserId: raw.sender_user_id || null,
      humanSpeaker: true,
    };
    productRealtime.noteServerSeq(raw.conversation_id, raw.server_seq);
    setThreads((prev) => {
      const list = prev[raw.conversation_id] ?? [];
      if (
        list.some(
          (m) =>
            m.id === ui.id ||
            (ui.clientMessageId && m.clientMessageId === ui.clientMessageId),
        )
      ) {
        return prev;
      }
      const next = [...list, ui].sort((a, b) => {
        if (a.serverSeq != null && b.serverSeq != null) return a.serverSeq - b.serverSeq;
        return 0;
      });
      return { ...prev, [raw.conversation_id]: next };
    });
    setChats((prev) =>
      prev.map((c) =>
        c.id === raw.conversation_id
          ? {
              ...c,
              preview: raw.body,
              time: "Now",
              unread:
                c.id === openId || ui.from === "me" ? c.unread : (c.unread ?? 0) + 1,
            }
          : c,
      ),
    );
  }, []);

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId) ?? null,
    [chats, activeChatId],
  );
  const messages = activeChatId ? threads[activeChatId] ?? [] : [];

  const isGroupChat = useMemo(() => {
    if (!activeChat) return false;
    return (
      activeChat.composition === "group" ||
      (activeChat.memberCount ?? 0) >= 3 ||
      (activeChat.peers?.length ?? 0) >= 2
    );
  }, [activeChat]);

  const speakerDirectory = useMemo(
    () =>
      buildSpeakerDirectory({
        selfUserId: session?.user_id,
        selfDisplayName: session?.display_name,
        peers: activeChat?.peers,
      }),
    [session?.user_id, session?.display_name, activeChat?.peers],
  );

  const speakerPlan = useMemo(
    () =>
      planThreadSpeakerRows(messages, {
        selfUserId: session?.user_id || null,
        directory: speakerDirectory,
        isGroup: isGroupChat,
      }),
    [messages, session?.user_id, speakerDirectory, isGroupChat],
  );

  const speakerPlanById = useMemo(() => {
    const m = new Map<string, (typeof speakerPlan)[0]["meta"]>();
    for (const row of speakerPlan) m.set(row.id, row.meta);
    return m;
  }, [speakerPlan]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, activeChatId]);

  const refreshLive = useCallback(async (s: ProductSession) => {
    setLoadingLive(true);
    setLoadError(null);
    if (!apiConfigured()) {
      setLoadError("Could not connect. Opal services are not configured.");
      setChats([]);
      setLoadingLive(false);
      return;
    }
    try {
      const data = await listConversations(s.access_token);
      const strongest = strongestPerConversation(data.signals || []);
      const byConv = new Map(strongest.map((sig) => [sig.conversation_id, sig]));
      const mapped: ChatPreview[] = data.conversations.map((c) => {
        const sig = byConv.get(c.id);
        // Group = multi-party composition; dyad peers list is the other person only.
        const isGroup =
          c.composition === "group" || (c.member_count ?? 0) >= 3;
        const homePeerKey = isGroup
          ? `group:${c.id}`
          : c.peers[0]?.id || `solo:${c.id}`;
        return {
          id: c.id,
          name: c.title,
          preview: c.preview || "No messages yet",
          time: formatHumanTime(c.updated_at),
          // Peer context only  -  never put journey signals under a person's name.
          contextLine: c.peers.map((p) => p.display_name).join(", ") || undefined,
          // Human shared reality  -  never raw stage tokens like "Set".
          signalLabel: surfaceLabel(sig),
          signal: mapSignalKind(sig?.kind || sig?.lifecycle_stage),
          homePeerKey,
          composition: isGroup ? "group" : c.composition || "dyad",
          memberCount: c.member_count,
          peers: (c.peers || []).map((p) => ({
            id: p.id,
            display_name: p.display_name,
            handle: p.handle,
          })),
        };
      });
      setChats(mapped);
      setLiveSignals(data.signals || []);
      // Needs you: one awaken — compressed presentation, not full headline thrice.
      const peerKeyByConv = new Map(
        mapped.map((c) => [c.id, c.homePeerKey || c.id] as const),
      );
      const homeStrong = strongestPerHomePresence(data.signals || [], peerKeyByConv);
      // Pass 13: one awaken by consequence urgency — not Map/insertion order.
      const awakenPool = homeStrong.filter(isConsequentialNeed);
      const { winner: awakenSig } = selectHomeAwaken(awakenPool);
      setNeeds(
        awakenSig
          ? [awakenSig].map((sig, i) => {
              const lines = presenceLines(sig);
              const chat = mapped.find((c) => c.id === sig.conversation_id);
              const rawName = chat?.name || "Someone";
              // Never dump multi-peer titles into awaken meta (Figma 2:2 quiet field).
              const who =
                chat?.homePeerKey?.startsWith("group:") || rawName.includes(",")
                  ? "Friends"
                  : rawName.split(",")[0]?.trim() || rawName;
              const placeOpen =
                !!lines.gap && /place|where|choos/i.test(lines.gap);
              // Awaken asks the unresolved decision; meta = who · compact when once.
              const title = placeOpen
                ? "Where should dinner be?"
                : lines.title || surfaceLabel(sig) || "Needs a decision";
              // Prefer compressed presenceDetail (when · place/gap) — not peer list.
              // Strip leading who from detail so Home doesn't render "Friends · Friends · …"
              let metaDetail = placeOpen
                ? lines.detail || ""
                : lines.gap || lines.detail || "";
              const whoRe = new RegExp(
                `^${who.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[·•-]\\s*`,
                "i",
              );
              metaDetail = metaDetail.replace(whoRe, "").trim();
              // Prefer human when once — avoid triple day if detail already has when
              if (placeOpen && !metaDetail) {
                metaDetail = lines.detail || "";
              }
              return {
                id: `sig-${i}`,
                title,
                detail: [who, metaDetail].filter(Boolean).join(" · "),
                chatId: sig.conversation_id,
              };
            })
          : [],
      );
    } catch (e) {
      setLoadError((e as Error).message || "Could not load conversations");
      setChats([]);
    } finally {
      setLoadingLive(false);
    }
  }, []);

  // Boot / refresh: recover via memory bearer OR HttpOnly cookie (credentials include).
  // Never treat a local profile alone as authenticated without a live session probe.
  // Never leave "Preparing…" forever  -  session/list hangs must surface recovery.
  useEffect(() => {
    let cancelled = false;
    const BOOT_MS = 12_000;

    const withTimeout = async <T,>(p: Promise<T>, ms: number): Promise<T> => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          p,
          new Promise<T>((_, reject) => {
            timer = setTimeout(() => {
              const err = new Error("Opal took too long to respond. Try again.") as Error & {
                code?: string;
              };
              err.code = "boot_timeout";
              reject(err);
            }, ms);
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    };

    (async () => {
      if (!apiConfigured()) {
        if (!cancelled) setAuthReady(true);
        return;
      }

      if (session?.access_token) setMemoryAccessToken(session.access_token);

      try {
        // Works with bearer when present; otherwise relies on cross-site session cookie.
        const me = await withTimeout(fetchSession(session?.access_token), BOOT_MS);
        if (cancelled) return;
        if (me.user?.id) {
          const next: ProductSession = {
            user_id: me.user.id,
            display_name: me.user.display_name,
            handle: me.user.handle,
            session_id: session?.session_id,
            access_token: session?.access_token || undefined,
          };
          setSession(next);
          saveSession(next);
          // Mark ready before secondary loads so UI never sticks on Preparing.
          if (!cancelled) setAuthReady(true);
          try {
            await withTimeout(refreshLive(next), BOOT_MS);
          } catch (e) {
            if (!cancelled) {
              setLoadError(
                (e as Error)?.message || "Could not load conversations. Try again.",
              );
            }
          }
          try {
            const inv = await withTimeout(listIncoming(next.access_token), BOOT_MS);
            if (!cancelled) setIncomingInvites(inv.invitations || []);
          } catch {
            /* ignore */
          }
          return;
        }
      } catch (e) {
        // Cookie blocked, timeout, or session dead: drop stale profile → activation.
        if (session) {
          saveSession(null);
          if (!cancelled) setSession(null);
        }
        const code = (e as Error & { code?: string })?.code;
        if (code === "boot_timeout" || code === "network_error") {
          if (!cancelled) {
            setLoadError(
              (e as Error)?.message || "Could not reach Opal. Check connection and try again.",
            );
          }
        }
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Run once on mount for refresh recovery; activation updates session separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Invitation deep link: mint server continuation (never keep raw token in localStorage).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite");
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        // Public preview mints short-lived continuation_id; drop raw token from URL.
        const preview = await previewInviteShare(token);
        if (cancelled) return;
        if (preview.continuation_id) {
          try {
            sessionStorage.setItem("opal_invite_continuation", preview.continuation_id);
          } catch {
            /* private mode */
          }
        }
        const url = new URL(window.location.href);
        url.searchParams.delete("invite");
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      } catch {
        /* invalid or expired */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // After activation: resume invitation via continuation id (server authoritative).
  useEffect(() => {
    if (!authenticated || !session?.access_token) return;
    let cancelled = false;
    (async () => {
      try {
        let continuation: string | null = null;
        try {
          continuation = sessionStorage.getItem("opal_invite_continuation");
        } catch {
          continuation = null;
        }
        if (!continuation) return;
        const resumed = await resumeInviteContinuation(continuation, session.access_token);
        if (cancelled || !resumed.invitation_id) return;
        setIncomingInvites((prev) =>
          prev.some((p) => p.id === resumed.invitation_id)
            ? prev
            : [...prev, { id: resumed.invitation_id }],
        );
        setTab("chats");
      } catch {
        try {
          sessionStorage.removeItem("opal_invite_continuation");
        } catch {
          /* ignore */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authenticated, session?.access_token]);

  // Phoenix realtime lifecycle for authenticated product sessions.
  // Do not depend on chat selection  -  restarting the socket on every open thrashs reconnects.
  useEffect(() => {
    if (!authenticated || !session || !apiConfigured()) {
      productRealtime.stop();
      return;
    }
    const offMsg = productRealtime.onMessage(applyChannelMessage);
    const offState = productRealtime.onState(setConnectionState);
    const offAv = productRealtime.onAvailability((_ev, _payload) => {
      const id = activeChatIdRef.current;
      const token = sessionRef.current?.access_token;
      if (!id || !token) return;
      void refreshAvailabilityIntervention(id, token);
    });
    void productRealtime.start(session.access_token).catch(() => {
      /* connection state surfaces calmly */
    });
    // Proof harness only: expose diagnostics (not intelligence). Pass 7 soak reads this.
    if (typeof window !== "undefined") {
      (window as unknown as { __opalProductRealtime?: typeof productRealtime }).__opalProductRealtime =
        productRealtime;
    }
    return () => {
      offMsg();
      offState();
      offAv();
      productRealtime.stop();
      if (typeof window !== "undefined") {
        delete (window as unknown as { __opalProductRealtime?: unknown }).__opalProductRealtime;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, session?.user_id, session?.access_token]);

  /** Persist walkthrough completion without tearing down the in-progress FR06-09 auth route. */
  const markWalkthroughDone = () => {
    writeFirstRunDone();
  };

  const completeFirstRun = () => {
    writeFirstRunDone();
    setShowFirstRun(false);
  };

  const openChat = async (id: string) => {
    if (activeChatId && activeChatId !== id) {
      productRealtime.leaveConversation(activeChatId);
    }
    // Clear prior join-deny / load banners so late membership re-open can succeed.
    setLoadError(null);
    setActiveChatId(id);
    setAvailabilityOverlap(null);
    setAvailabilityIntervention(null);
    setFindTimeOpen(false);
    setFindPlaceOpen(false);
    setCurateOpen(false);
    setExtendOpen(false);
    setExtendSelected(null);
    setOverlapExpanded(false);
    try {
      setShowFindTimeHint(localStorage.getItem(`${FIND_TIME_HINT_KEY}:${id}`) !== "1");
    } catch {
      setShowFindTimeHint(true);
    }
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    setDraft("");
    if (session) {
      try {
        const data = await listMessages(id, session.access_token);
        const mapped: Message[] = data.messages.map((m) => {
          productRealtime.noteServerSeq(id, m.server_seq);
          return {
            id: m.id,
            from: m.sender_user_id === session.user_id ? "me" : "them",
            body: m.body,
            time: new Date(m.created_at).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            }),
            serverSeq: m.server_seq,
            clientMessageId: m.client_message_id,
            senderUserId: m.sender_user_id || null,
            humanSpeaker: true,
          };
        });
        setThreads((prev) => ({ ...prev, [id]: mapped }));
        const primary =
          strongestPerConversation(
            (data.signals || []).map((s) => ({ ...s, conversation_id: id })),
          )[0] || data.signals?.[0];
        // Durable Opal chronology first (survives refresh/logout), then
        // recompute moments as fallback. Interleave after triggering human msg.
        const primaryForMoments =
          strongestPerConversation(
            (data.signals || []).map((s) => ({ ...s, conversation_id: id })),
          )[0] || data.signals?.[0];
        type ChronoMoment = {
          lifecycle_stage?: string;
          kind?: string;
          label?: string;
          detail?: string;
          evidence_message_id?: string;
          after_server_seq?: number;
          source_message_ids?: string[];
          durable?: boolean;
          privacy_class?: string;
          visibility?: string;
        };
        const durableChrono: ChronoMoment[] = Array.isArray(
          (data as { chronology?: ChronoMoment[] }).chronology,
        )
          ? ((data as { chronology: ChronoMoment[] }).chronology || [])
          : [];
        const recomputeChrono: ChronoMoment[] =
          (primaryForMoments as { chronological_moments?: ChronoMoment[] } | undefined)
            ?.chronological_moments ||
          (data.signals || [])
            .filter((s) => s.kind !== "proposal")
            .slice(0, 8)
            .map((s) => ({
              lifecycle_stage: s.lifecycle_stage,
              kind: s.kind,
              label: surfaceLabel(s) || signalDetail(s) || s.label,
              evidence_message_id: (s as { evidence_message_id?: string }).evidence_message_id,
              after_server_seq: (s as { evidence_server_seq?: number }).evidence_server_seq,
              source_message_ids: (s as { source_message_ids?: string[] }).source_message_ids,
            }));
        // Prefer durable history; fill gaps from recompute without duplicating labels+seq.
        const rawChrono: ChronoMoment[] =
          durableChrono.length > 0
            ? durableChrono
            : recomputeChrono;
        // Collapse redundant same-dimension filaments (Dinner · Thursday thrice).
        const chrono: ChronoMoment[] = [];
        for (const mom of rawChrono) {
          const prev = chrono[chrono.length - 1];
          if (
            prev &&
            isRedundantFilamentLabel(prev.label, mom.label) ||
            !shouldShowFilamentLabel(mom.label)
          ) {
            continue;
          }
          chrono.push(mom);
        }

        const humanOnly = mapped.filter((m) => !m.id.startsWith("opal-filament-"));
        const interleaved: Message[] = [];
        const usedMomentIdx = new Set<number>();
        let lastFilamentLabel: string | null = null;
        // Track all shown filament labels so Chat never becomes an Opal monologue
        const shownFilamentLabels: string[] = [];
        const acceptFilament = (label: string): boolean => {
          if (!shouldShowFilamentLabel(label)) return false;
          if (isRedundantFilamentLabel(lastFilamentLabel, label)) return false;
          for (const prev of shownFilamentLabels) {
            if (isRedundantFilamentLabel(prev, label)) return false;
          }
          // Hard budget: sparse filaments — humans dominate long threads
          if (shownFilamentLabels.length >= 5) return false;
          shownFilamentLabels.push(label);
          lastFilamentLabel = label;
          return true;
        };

        for (const hm of humanOnly) {
          interleaved.push(hm);
          chrono.forEach((mom, mi) => {
            if (usedMomentIdx.has(mi)) return;
            const afterSeq = mom.after_server_seq;
            const evidId = mom.evidence_message_id;
            const matches =
              (typeof afterSeq === "number" && hm.serverSeq === afterSeq) ||
              (evidId && hm.id === evidId);
            if (!matches) return;
            usedMomentIdx.add(mi);
            const label = mom.label || "Something is forming";
            if (!acceptFilament(label)) return;
            const isPrivate =
              mom.privacy_class === "private_viewer" ||
              mom.visibility === "private_viewer";
            interleaved.push({
              id: `opal-filament-${id}-${mi}-${mom.lifecycle_stage || mom.kind || "m"}`,
              from: "them",
              body: mom.detail ? `${label} · ${mom.detail}` : label,
              time: hm.time || "",
              serverSeq: (hm.serverSeq ?? 0) + 0.01 * (mi + 1),
              opalFilament: true,
              opalPrivate: Boolean(isPrivate),
              signal: {
                kind:
                  mapSignalKind(mom.kind || mom.lifecycle_stage) ||
                  ("plan_forming" as const),
                label,
              },
            });
          });
        }
        // Unmatched moments (missing seq) still visible but marked — never invent chronology.
        chrono.forEach((mom, mi) => {
          if (usedMomentIdx.has(mi)) return;
          const label = mom.label || "Something is forming";
          if (!acceptFilament(label)) return;
          interleaved.push({
            id: `opal-filament-${id}-tail-${mi}-${mom.lifecycle_stage || mom.kind || "m"}`,
            from: "them",
            body: label,
            time: "",
            opalFilament: true,
            opalPrivate: false,
            signal: {
              kind:
                mapSignalKind(mom.kind || mom.lifecycle_stage) ||
                ("plan_forming" as const),
              label,
            },
          });
        });

        if (interleaved.length) {
          setThreads((prev) => ({ ...prev, [id]: interleaved }));
        }

        if (primary) {
          // Continuity: keep liveSignals structured shared_reality for this conversation
          // so deriveSocialReality does not fall back to label-only inference mid-chat.
          const withConv = {
            ...primary,
            conversation_id: id,
          } as ProductSignal;
          setLiveSignals((prev) => {
            const others = prev.filter((s) => s.conversation_id !== id);
            return [...others, withConv];
          });
          setChats((prev) =>
            prev.map((c) =>
              c.id === id
                ? {
                    ...c,
                    signalLabel: surfaceLabel(primary),
                    signal: mapSignalKind(primary.kind || primary.lifecycle_stage),
                  }
                : c,
            ),
          );
        } else {
          setChats((prev) =>
            prev.map((c) =>
              c.id === id ? { ...c, signalLabel: undefined, signal: undefined } : c,
            ),
          );
        }
        await refreshAvailabilityIntervention(id, session.access_token);
        void refreshPrivateWindows(session.access_token);
      } catch {
        /* keep empty */
      }
      // Join authorized Channel; backend membership is decisive.
      const join = await productRealtime.joinConversation(id);
      if (join === "denied") {
        setLoadError("You cannot open that conversation.");
        setActiveChatId(null);
      } else if (join === "ok") {
        setLoadError(null);
      }
    }
  };

  const send = async () => {
    const body = draft.trim();
    if (!body || !activeChatId) return;
    if (session) {
      try {
        // Primary send path: HTTP. Channel receives broadcast for peers and self-reconcile.
        const res = await sendMessage(activeChatId, body, session.access_token);
        const m = res.message;
        productRealtime.noteServerSeq(activeChatId, m.server_seq);
        const activeSignal =
          strongestPerConversation(
            (res.signals || []).map((s) => ({
              ...s,
              conversation_id: activeChatId,
            })),
          )[0] || res.signals?.[0];
        const msg: Message = {
          id: m.id,
          from: "me",
          body: m.body,
          time: "Now",
          serverSeq: m.server_seq,
          clientMessageId: m.client_message_id,
          senderUserId: session.user_id,
          humanSpeaker: true,
          senderDisplayName: session.display_name || "You",
          // Opal moment is journey state, not part of the human bubble.
          signal: activeSignal
            ? {
                kind:
                  mapSignalKind(activeSignal.kind || activeSignal.lifecycle_stage) ||
                  "plan_forming",
                label: surfaceLabel(activeSignal) || activeSignal.label,
              }
            : undefined,
        };
        setThreads((prev) => {
          const list = prev[activeChatId] ?? [];
          if (
            list.some(
              (x) =>
                x.id === msg.id ||
                (msg.clientMessageId && x.clientMessageId === msg.clientMessageId),
            )
          ) {
            return prev;
          }
          return { ...prev, [activeChatId]: [...list, msg] };
        });
        setChats((prev) =>
          prev.map((c) =>
            c.id === activeChatId
              ? {
                  ...c,
                  preview: body,
                  time: "Now",
                  signalLabel: surfaceLabel(activeSignal) || c.signalLabel,
                  signal: activeSignal
                    ? mapSignalKind(activeSignal.kind || activeSignal.lifecycle_stage)
                    : c.signal,
                }
              : c,
          ),
        );
        setDraft("");
        return;
      } catch (e) {
        setLoadError((e as Error).message || "Send failed");
        return;
      }
    }
    // Unauthenticated preview path only (seed)
    const msg: Message = {
      id: `local-${Date.now()}`,
      from: "me",
      body,
      time: "Now",
      senderUserId: sessionRef.current?.user_id || "local-self",
      humanSpeaker: true,
    };
    setThreads((prev) => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] ?? []), msg],
    }));
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId ? { ...c, preview: body, time: "Now" } : c,
      ),
    );
    setDraft("");
  };

  if (authenticated && activeChat) {
    // Whole-picture reality — not a linear "share time" journey owner.
    const convSignal =
      liveSignals.find((s) => s.conversation_id === activeChatId) ||
      (activeChat.signal
        ? ({
            kind: activeChat.signal,
            label: activeChat.signalLabel || "",
            status: "forming",
            conversation_id: activeChatId || undefined,
            lifecycle_stage:
              activeChat.signal === "set" || activeChat.signal === "ready"
                ? "set"
                : activeChat.signal === "open_loop"
                  ? "still_open"
                  : "plan_forming",
            shared_reality: undefined,
          } as ProductSignal)
        : null);
    const reality = deriveSocialReality(convSignal);
    // ONE meaningful Opal surface — gap-driven, never stale time mode.
    const primary = resolvePrimaryOpalSurface({
      signalKind: activeChat.signal,
      overlap: availabilityOverlap,
      findTimeOpen,
      findPlaceOpen,
      hasPrivateWindows,
      privateDismissed,
      overlapExpanded,
      intervention: availabilityIntervention,
      signal: convSignal,
    });
    const reservationPartySize =
      (activeChat as { composition?: string; memberCount?: number }).composition === "group"
        ? Math.max(3, (activeChat as { memberCount?: number }).memberCount || 3)
        : 2;
    const reservationReady = socialReadyForExecution({
      placeName: reality.where,
      whenLabel: reality.when,
      partySize: reservationPartySize,
      placeSelected: Boolean(reality.where),
    });
    const composerHasOpal =
      primary.kind === "chip" || primary.kind === "private";
    const chipEdgeKey = `${activeChatId ?? ""}:chip:${activeChat.signal ?? "none"}:${primary.kind === "chip" ? primary.gap ?? "x" : "x"}`;
    const animateChipEdge =
      primary.kind === "chip" &&
      primary.withEdge &&
      edgeAnimateKey === chipEdgeKey;

    const openGapSurface = (opens?: string, gap?: string) => {
      // Reproject: open the sheet that matches the gap, never force time.
      if (opens === "place_sheet" || gap === "place") {
        setFindPlaceOpen(true);
        setFindTimeOpen(false);
        setCurateOpen(false);
        return;
      }
      if (opens === "curate") {
        setCurateOpen(true);
        setFindTimeOpen(false);
        setFindPlaceOpen(false);
        return;
      }
      if (opens === "time_sheet" || gap === "time" || !opens) {
        setFindTimeOpen(true);
        setFindPlaceOpen(false);
        setShowFindTimeHint(false);
        try {
          localStorage.setItem(`${FIND_TIME_HINT_KEY}:${activeChatId}`, "1");
        } catch {
          /* private mode */
        }
      }
    };

    return (
      <div
        className="app app-futura"
        aria-label={`Conversation with ${activeChat.name}`}
        data-testid="member-conversation"
        data-member-nav="true"
      >
        <div className="app-ambient" aria-hidden />
        <GraphPeopleThreadHeader
          peerName={activeChat.name}
          peerInitial={initials(activeChat.name)}
          connectionLabel={
            activeChat.composition === "group" || (activeChat.memberCount ?? 0) >= 3
              ? activeChat.contextLine || "Group"
              : "Direct connection"
          }
          showCallVideo={false}
          onBack={() => {
            if (activeChatId) productRealtime.leaveConversation(activeChatId);
            setActiveChatId(null);
          }}
          onPlan={() => {
            // WHO already known (this person) — open forming / find time without WHO sheet
            setMomentForkChooserOpen(false);
            setFindTimeOpen(true);
          }}
        />
        <div className="sr-only" data-testid="chat-context">
          {activeChat.signalLabel
            ? activeChat.signalLabel
            : activeChat.contextLine
              ? activeChat.contextLine
              : `with ${activeChat.name}`}
        </div>
        <ConnectionHint state={connectionState} />

        {/* Next / Last together  -  thin reality shortcut, not a second database. */}
        {activeChat.signalLabel ? (
          <button
            type="button"
            className="next-together-strip"
            data-testid="next-together"
            onClick={() => {
              document
                .querySelector('[data-testid="opal-moment"], .opal-resolution, .thread')
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          >
            <span className="next-together-kicker">{PRODUCT_COPY.nextTogether}</span>
            <span className="next-together-line">{activeChat.signalLabel}</span>
          </button>
        ) : null}

        {/* Signature Shared Reality object (Figma 4:2) — domain content, not sample Chanelle. */}
        {primary.kind === "set" ? (
          <OpalResolution
            detail={activeChat.signalLabel || null}
            reality={(() => {
              const convSig =
                strongestPerConversation(
                  liveSignals.filter((s) => s.conversation_id === activeChatId),
                )[0] || liveSignals.find((s) => s.conversation_id === activeChatId);
              const sr = convSig?.shared_reality as
                | {
                    what?: string;
                    when?: string;
                    where?: string;
                    headline?: string;
                    area?: string;
                    distance?: string;
                    leave_around?: string;
                    leave_by?: string;
                    travel_estimate?: string;
                    travel_minutes?: number;
                  }
                | undefined;
              const travelMinutes =
                typeof (sr as { travel_minutes?: number })?.travel_minutes ===
                "number"
                  ? (sr as { travel_minutes?: number }).travel_minutes
                  : null;
              const startIso =
                typeof (sr as { start_at?: string })?.start_at === "string"
                  ? (sr as { start_at?: string }).start_at
                  : null;
              const leaveAround =
                typeof sr?.leave_around === "string"
                  ? sr.leave_around
                  : typeof sr?.leave_by === "string"
                    ? // leave_by may be ISO - reformat if so
                      formatLeaveAround(sr.leave_by, travelMinutes ?? 0) ||
                      sr.leave_by
                    : formatLeaveAround(startIso, travelMinutes);
              const distance =
                typeof sr?.distance === "string"
                  ? sr.distance
                  : typeof sr?.travel_estimate === "string"
                    ? sr.travel_estimate
                    : formatDistanceMinutes(travelMinutes);
              // Only pass travel fields when domain provided them - never invent.
              return {
                headline: activeChat.signalLabel || sr?.headline || sr?.what || null,
                what: sr?.what || null,
                who: activeChat.name || null,
                when: sr?.when || null,
                where: sr?.where || null,
                area: typeof sr?.area === "string" ? sr.area : null,
                distance,
                leaveAround,
                gap:
                  Array.isArray((sr as { gaps?: string[] })?.gaps) &&
                  (sr as { gaps?: string[] }).gaps?.includes("where")
                    ? PRODUCT_COPY.placeStillOpen
                    : null,
              };
            })()}
          />
        ) : null}

        {RELATIONSHIP_PULSE_EXPERIMENT && primary.kind === "chip" ? (
          <div
            className="opal-pulse-experiment"
            data-testid="relationship-pulse-experiment"
            aria-hidden
          />
        ) : null}

        <div className="thread" role="log" aria-live="polite">
          {messages.map((m) =>
            m.opalFilament ||
            m.opalSystemConsequence ||
            m.id.startsWith("opal-filament-") ||
            m.id.startsWith("opal-exec-") ? (
              <div
                key={m.id}
                data-testid={
                  m.opalSystemConsequence
                    ? "opal-system-consequence"
                    : "opal-filament-wrap"
                }
                data-system-consequence={m.opalSystemConsequence ? "true" : undefined}
                data-human-speaker="false"
                data-reality-seed={m.realitySeedId}
                data-execution-id={m.executionId}
              >
                {m.opalPrivate ? (
                  <PrivateOpalPlate body={m.signal?.label || m.body} time={m.time} />
                ) : (
                  <OpalFilament
                    mode={filamentModeFor(m.signal?.kind)}
                    label={m.signal?.label || m.body}
                    time={m.time}
                    signalKind={m.signal?.kind}
                  />
                )}
              </div>
            ) : (
              (() => {
                const meta = speakerPlanById.get(m.id);
                const speaker = meta?.speaker;
                const showHeader = meta?.showSpeakerHeader === true;
                const isSelf = m.from === "me" || speaker?.isSelf === true;
                return (
                  <div
                    key={m.id}
                    className={`bubble-row ${isSelf ? "out" : "in"}${
                      meta?.continuesGroup ? " continues-sender" : ""
                    }${showHeader ? " sender-start" : ""}`}
                    data-testid="human-message-row"
                    data-human-speaker="true"
                    data-sender-user-id={m.senderUserId || undefined}
                    data-sender-name={speaker?.displayName || undefined}
                    data-continues-group={meta?.continuesGroup ? "true" : "false"}
                    data-show-speaker-header={showHeader ? "true" : "false"}
                    aria-label={
                      speaker
                        ? `${speaker.isSelf ? "You" : speaker.displayName}: ${m.body}`
                        : m.body
                    }
                  >
                    {!isSelf ? (
                      <div className="bubble-speaker-col" aria-hidden={!showHeader}>
                        {showHeader ? (
                          <span
                            className="bubble-avatar"
                            data-testid="message-sender-avatar"
                            title={speaker?.displayName || "Unknown member"}
                          >
                            {speaker?.initials || "?"}
                          </span>
                        ) : (
                          <span className="bubble-avatar-spacer" />
                        )}
                      </div>
                    ) : null}
                    <div className="bubble-stack">
                      {showHeader && !isSelf ? (
                        <span
                          className="bubble-sender-name"
                          data-testid="message-sender-name"
                        >
                          {speaker?.displayName || "Unknown member"}
                        </span>
                      ) : null}
                      <div className={`bubble ${isSelf ? "out" : "in"}`}>
                        <p>{m.body}</p>
                        <time>{m.time}</time>
                      </div>
                      {m.signal &&
                      primary.kind === "none" &&
                      m.signal.kind !== "plan_forming" &&
                      m.signal.kind !== "open_loop" ? (
                        <div
                          className={`opal-moment inline signal-${m.signal.kind}`}
                          role="status"
                          data-testid="opal-moment"
                          data-state={semanticStateForSignal(m.signal.kind)}
                        >
                          <span className="opal-moment-mark" aria-hidden>
                            ◈
                          </span>
                          <span className="opal-moment-label">
                            {contextualSharedCopy(
                              m.signal.kind === "set" || m.signal.kind === "ready"
                                ? "set"
                                : "quiet",
                            ) || m.signal.label}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })()
            ),
          )}

          {/* Gap-driven chip: Find a time OR Choose a place — never stale time when place is next */}
          {primary.kind === "chip" ? (
            <div
              className={`opal-context-chip-wrap${
                primary.withEdge ? " opal-chip-edge" : ""
              }${animateChipEdge ? " opal-edge-animate" : ""}`}
              data-gap={primary.gap || "unknown"}
              data-testid="opal-gap-chip"
            >
              <ContextChip
                label={primary.label}
                onClick={() => openGapSurface(primary.opens, primary.gap)}
              />
            </div>
          ) : null}

          {/* Screen 4: private Opal moment in-thread after causal content */}
          {primary.kind === "private" ? (
            <PrivateGuidance
              text={primary.text}
              onDismiss={() => dismissPrivate(primary.id)}
              actionLabel={
                availabilityIntervention?.action_label || undefined
              }
              onAction={
                availabilityIntervention?.action_label
                  ? () => {
                      const ids =
                        availabilityIntervention.suggested_window_ids ?? [];
                      const token = session?.access_token;
                      const cid = activeChatId;
                      // Share it / Share → intentional share of suggested windows
                      if (
                        ids.length > 0 &&
                        cid &&
                        token &&
                        /share/i.test(
                          availabilityIntervention.action_label || "",
                        )
                      ) {
                        void shareAvailabilityWindows(cid, ids, token)
                          .then((res) => {
                            if (res.overlap?.overlap_status === "overlap_found") {
                              setAvailabilityOverlap(res.overlap);
                            }
                            return refreshAvailabilityIntervention(cid, token);
                          })
                          .catch(() => {
                            /* quiet */
                          });
                        return;
                      }
                      // Only open time sheet when TIME is the gap
                      if (reality.next_gap === "place") {
                        openGapSurface("place_sheet", "place");
                        return;
                      }
                      openGapSurface("time_sheet", "time");
                    }
                  : undefined
              }
            />
          ) : null}

          {primary.kind === "overlap" ? (
            <>
              {primary.overlaps.length === 1 || primary.expand ? (
                <OpalInsightField
                  insight={primary.label}
                  groupLine={primary.groupLine}
                  discovery={primary.overlaps.length === 1}
                  options={primary.overlaps.map((o, i) => ({
                    id: `${o.display_start}-${i}`,
                    label:
                      formatOverlapRange(o.display_start, o.display_end) ||
                      `Option ${i + 1}`,
                  }))}
                  onChoose={(opt) => {
                    // Time share only — never place settlement
                    const t = buildTimeShareDraft(opt.label);
                    setDraft(t.text);
                    setOverlapExpanded(false);
                    document.getElementById("composer-input")?.focus();
                  }}
                />
              ) : (
                <div
                  className="opal-moment inline moment-enter signal-availability_overlap has-detail"
                  role="button"
                  data-testid="opal-moment-availability-overlap"
                  data-state={semanticStateForSignal("availability_overlap")}
                  aria-expanded={false}
                  tabIndex={0}
                  onClick={() => setOverlapExpanded(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setOverlapExpanded(true);
                    }
                  }}
                >
                  <span className="opal-moment-mark" aria-hidden>
                    ◈
                  </span>
                  <span className="opal-moment-label">{primary.label}</span>
                  {primary.groupLine ? (
                    <span className="opal-group-share-count">
                      {primary.groupLine}
                    </span>
                  ) : null}
                  <span className="opal-moment-detail">Tap to see</span>
                </div>
              )}
            </>
          ) : null}
          <div ref={endRef} />
        </div>

        {/* P0-31-02: Moment-seeded exact place → WHEN sheet on same Reality (not AvailabilitySheet only) */}
        {findTimeOpen && momentSeed?.exactPlaceGrounded ? (
          <MomentTimeSheet
            placeLabel={momentSeed.placeCandidateName}
            whatLabel={momentSeed.what}
            selectedWhen={momentSeed.when !== "open" ? momentSeed.when : null}
            onSelect={handleMomentTimeSelect}
            onClose={() => setFindTimeOpen(false)}
          />
        ) : null}

        {primary.kind === "sheet" &&
        primary.sheetKind !== "place" &&
        activeChatId &&
        !(findTimeOpen && momentSeed?.exactPlaceGrounded) ? (
          <AvailabilitySheet
            conversationId={activeChatId}
            conversationName={activeChat.name}
            bearer={session?.access_token}
            onClose={() => setFindTimeOpen(false)}
            onOverlap={(o) => {
              setAvailabilityOverlap(
                o?.overlap_status === "overlap_found" ? o : null,
              );
              setOverlapExpanded(false);
              void refreshPrivateWindows(session?.access_token);
              if (activeChatId) {
                void refreshAvailabilityIntervention(
                  activeChatId,
                  session?.access_token,
                );
              }
            }}
          />
        ) : null}

        {/* Place sheet — FIRST-CLASS. Share place never serializes time-only payloads. */}
        {(findPlaceOpen ||
          (primary.kind === "sheet" && primary.sheetKind === "place")) &&
        activeChatId ? (
          <section
            className="place-sheet private-opal-plate"
            data-testid="place-sheet"
            data-share-kind="place"
            aria-label="Choose a place"
          >
            <p className="private-opal-kicker">{PRODUCT_COPY.onlyYou}</p>
            <p className="curate-kicker">{PRODUCT_COPY.choosePlace}</p>
            <p className="curate-truth">
              {reality.when
                ? `${reality.what || "Plans"} · ${reality.when}`
                : PRODUCT_COPY.placeSheetLead}
            </p>
            {/* Carry presentation category/preference residue into private place UI */}
            <p className="presence-detail">
              {(convSignal?.shared_reality as { place_gap_label?: string } | undefined)
                ?.place_gap_label || PRODUCT_COPY.placeSheetLead}
            </p>
            <ul className="extend-options" data-testid="place-options">
              {(
                (() => {
                  // Server collective_fit is authoritative when present — client does not re-rank.
                  const cf = (
                    convSignal as {
                      collective_fit?: {
                        abstain?: boolean;
                        options?: Array<{
                          id?: string;
                          name?: string;
                          area?: string;
                          tag?: string;
                        }>;
                      };
                    } | null
                  )?.collective_fit;
                  if (cf?.abstain) return [];
                  if (cf?.options && cf.options.length > 0) {
                    return cf.options.map((o, i) => {
                      const name = o.name || "Place";
                      // Stable UI ids for fixture/live tests + place-option-* selectors
                      const id =
                        /juniper/i.test(name) || o.id === "juniper_ivy"
                          ? "juniper"
                          : /harbor/i.test(name) || o.id === "harbor_table"
                            ? "harbor"
                            : /campfire/i.test(name) || o.id === "campfire"
                              ? "campfire"
                              : o.id || `cf-${i}`;
                      return {
                        id,
                        name,
                        area: o.area || o.tag || "",
                      };
                    });
                  }
                  // Fallback: client composition only when server options absent (dyad thin path)
                  const gapLbl =
                    (convSignal?.shared_reality as { place_gap_label?: string } | undefined)
                      ?.place_gap_label || "";
                  const threadBodies = (threads[activeChatId || ""] || [])
                    .filter((m) => !m.opalFilament)
                    .map((m) => m.body)
                    .join(" ");
                  return resolvePlaceCandidates(
                    convSignal,
                    threadBodies,
                    Boolean(reality.where),
                  );
                })()
              ).map((opt) => (
                <li key={opt.id}>
                  <button
                    type="button"
                    className="extend-option"
                    data-testid={`place-option-${opt.id}`}
                    data-share-kind="place"
                    onClick={() => {
                      // PRIVATE select — no auto peer message.
                      // Explicit share drafts PLACE content only.
                      const draftPayload = buildPlaceShareDraft({
                        name: opt.name,
                        area: opt.area,
                      });
                      // Assert contract: never time windows
                      if (
                        "windows" in draftPayload ||
                        "display_start" in draftPayload
                      ) {
                        return;
                      }
                      setDraft(draftPayload.text);
                      setFindPlaceOpen(false);
                      document.getElementById("composer-input")?.focus();
                    }}
                  >
                    <span className="presence-title">{opt.name}</span>
                    <span className="presence-detail">{opt.area}</span>
                  </button>
                </li>
              ))}
            </ul>
            {(
              convSignal as { collective_fit?: { abstain?: boolean; one_question?: { text?: string } | null; human_surface?: { label?: string } } } | null
            )?.collective_fit?.abstain ? (
              <p className="presence-detail" data-testid="collective-abstain">
                {(
                  convSignal as { collective_fit?: { human_surface?: { label?: string } } }
                )?.collective_fit?.human_surface?.label ||
                  "None of these fit everyone well."}
              </p>
            ) : null}
            {(
              convSignal as { collective_fit?: { one_question?: { text?: string } | null } } | null
            )?.collective_fit?.one_question?.text ? (
              <p className="presence-detail" data-testid="collective-one-question">
                {
                  (
                    convSignal as { collective_fit?: { one_question?: { text?: string } } }
                  ).collective_fit!.one_question!.text
                }
              </p>
            ) : null}
            <div className="row-actions">
              <button
                type="button"
                className="btn ghost"
                data-testid="place-sheet-close"
                onClick={() => setFindPlaceOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn ghost"
                data-testid="place-curate-instead"
                onClick={() => {
                  setFindPlaceOpen(false);
                  setCurateOpen(true);
                }}
              >
                Curate a place
              </button>
            </div>
          </section>
        ) : null}

        {/* Journey CTAs: ONE primary for next_gap. Chip already owns place/time when kind=chip. */}
        <div
          className="journey-cta-row"
          data-testid="journey-cta-row"
          data-next-gap={reality.next_gap}
        >
          {/* Place gap: chip is primary; journey row only if chip not already place CTA */}
          {reality.next_gap === "place" &&
          primary.kind !== "chip" &&
          primary.kind !== "sheet" ? (
            <button
              type="button"
              className="btn journey-cta"
              data-testid="curate-cta"
              data-gap="place"
              aria-expanded={findPlaceOpen || curateOpen}
              onClick={() => {
                setFindPlaceOpen(true);
                setCurateOpen(false);
                setExtendOpen(false);
                setExtendSelected(null);
                setFindTimeOpen(false);
              }}
            >
              {PRODUCT_COPY.choosePlace}
            </button>
          ) : null}
          {/*
            ONE PRIMARY CTA law: when chip already owns place ("Choose a place"),
            do not stack a second journey CTA ("Curate this"). Curate remains available
            from the place sheet alternate ("Curate a place") after opening the primary.
          */}
          {reality.next_gap === "activity" ? (
            <button
              type="button"
              className="btn journey-cta"
              data-testid="curate-cta"
              data-gap="activity"
              aria-expanded={curateOpen}
              onClick={() => {
                setCurateOpen((open) => !open);
                setFindPlaceOpen(false);
                setExtendOpen(false);
                setFindTimeOpen(false);
              }}
            >
              {PRODUCT_COPY.curateCta}
            </button>
          ) : null}
          {reality.next_gap === "time" &&
          primary.kind !== "chip" &&
          primary.kind !== "sheet" ? (
            <button
              type="button"
              className="btn journey-cta"
              data-testid="find-time-cta"
              data-gap="time"
              onClick={() => openGapSurface("time_sheet", "time")}
            >
              {PRODUCT_COPY.findTime}
            </button>
          ) : null}
          {(primary.kind === "set" ||
            activeChat.signal === "set" ||
            activeChat.signal === "ready") &&
          reality.next_gap === "none" ? (
            <button
              type="button"
              className="btn journey-cta ghost"
              data-testid="extend-cta"
              aria-expanded={extendOpen}
              onClick={() => {
                setExtendOpen((open) => {
                  if (open) setExtendSelected(null);
                  return !open;
                });
                setCurateOpen(false);
                setFindPlaceOpen(false);
              }}
            >
              {PRODUCT_COPY.extendCta}
            </button>
          ) : null}
        </div>

        {/* Pass 20 — execution as Reality consequence, not a booking dashboard.
            DEVELOPMENT / SYNTHETIC PROOF — live restaurant booking not claimed. */}
        {reservationReady || reservationUx.phase !== "idle" ? (
          <ReservationExperience
            state={
              reservationUx.phase === "idle" && reservationReady
                ? reduceExecutionUx(reservationUx, {
                    type: "PLACE_SELECTED",
                    placeName: reality.where || "this place",
                    whenLabel: reality.when,
                    partySize: reservationPartySize,
                  })
                : reservationUx
            }
            onSelectSlot={(slotId: string) => {
              setReservationUx((s) => {
                const next = reduceExecutionUx(s, { type: "SELECT_SLOT", slotId });
                // P0-31-02: slot tap must also ground WHEN on moment-seeded Reality when present
                if (momentSeed && next.selectedSlotLabel) {
                  const applied = applyWhenToSeed(momentSeed, next.selectedSlotLabel, {
                    slotId: next.selectedSlotId || slotId,
                  });
                  if (applied.changed) setMomentSeed(applied.seed);
                }
                return next;
              });
            }}
            onDismissAuth={() =>
              setReservationUx((s) => {
                if (s.phase === "cancel_confirm") {
                  return reduceExecutionUx(s, {
                    type: "SERVER_EXECUTION",
                    status: "confirmed",
                    executionId: s.executionId,
                    slotLabel: s.selectedSlotLabel,
                    placeName: s.placeName,
                    partySize: s.partySize,
                    sharedSafeSummary: s.sharedSafeSummary,
                  });
                }
                return reduceExecutionUx(s, { type: "DISMISS_AUTHORIZE" });
              })
            }
            onPrimary={async () => {
              const phase =
                reservationUx.phase === "idle" && reservationReady
                  ? "place_selected"
                  : reservationUx.phase;
              const ux =
                reservationUx.phase === "idle" && reservationReady
                  ? reduceExecutionUx(reservationUx, {
                      type: "PLACE_SELECTED",
                      placeName: reality.where || "this place",
                      whenLabel: reality.when,
                      partySize: reservationPartySize,
                    })
                  : reservationUx;

              if (phase === "place_selected" || ux.primaryCta === "check_availability") {
                setReservationUx(reduceExecutionUx(ux, { type: "CHECK_AVAILABILITY" }));
                try {
                  const placeId =
                    momentSeed?.providerPlaceId ||
                    `rest-${(reality.where || "place").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
                  if (session?.access_token && apiConfigured()) {
                    const avail = await checkReservationAvailability(
                      {
                        provider_place_id: placeId,
                        party_size: reservationPartySize,
                        slot_label: reality.when || "7:30 PM",
                        place_display_name: reality.where || undefined,
                      },
                      session.access_token,
                    );
                    setReservationUx((s) =>
                      reduceExecutionUx(s, {
                        type: "AVAILABILITY_RESULT",
                        available: avail.available,
                        slots: avail.slots || [],
                      }),
                    );
                  } else {
                    // Offline / fixture: synthetic presentation only
                    setReservationUx((s) =>
                      reduceExecutionUx(s, {
                        type: "AVAILABILITY_RESULT",
                        available: true,
                        slots: [
                          {
                            slot_id: "slot-local-730",
                            label: reality.when || "Thursday · 7:30 PM",
                          },
                          {
                            slot_id: "slot-local-745",
                            label: (reality.when || "Thursday · 7:30 PM").replace(
                              "7:30",
                              "7:45",
                            ),
                          },
                        ],
                      }),
                    );
                  }
                } catch {
                  setReservationUx((s) =>
                    reduceExecutionUx(s, {
                      type: "SERVER_EXECUTION",
                      status: "failed",
                      slotLabel: reality.when,
                      placeName: reality.where,
                    }),
                  );
                }
                return;
              }

              if (ux.primaryCta === "reserve_slot" || phase === "available") {
                setReservationUx((s) => reduceExecutionUx(s, { type: "OPEN_AUTHORIZE" }));
                return;
              }

              if (ux.primaryCta === "confirm_reservation" || phase === "authorize") {
                if (reservationBusyRef.current || ux.confirmPending) return;
                reservationBusyRef.current = true;
                setReservationUx((s) => reduceExecutionUx(s, { type: "CONFIRM_TAP" }));
                try {
                  const placeId =
                    momentSeed?.providerPlaceId ||
                    `rest-${(ux.placeName || "place").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
                  if (session?.access_token && apiConfigured()) {
                    const realityKey =
                      momentSeed?.realitySeedId || activeChatId || undefined;
                    const authRes = await authorizeReservation(
                      {
                        provider_place_id: placeId,
                        place_display_name:
                          momentSeed?.placeCandidateName ||
                          ux.placeName ||
                          reality.where ||
                          undefined,
                        party_size: ux.partySize,
                        slot_label:
                          ux.selectedSlotLabel ||
                          momentSeed?.when ||
                          reality.when ||
                          undefined,
                        slot_id: ux.selectedSlotId || undefined,
                        reality_id: realityKey,
                        explicit_confirm: true,
                      },
                      session.access_token,
                    );
                    setReservationAuth(authRes.authorization);
                    const booked = await requestReservation(
                      {
                        authorization: authRes.authorization,
                        provider_place_id: placeId,
                        place_display_name:
                          momentSeed?.placeCandidateName || ux.placeName || reality.where,
                        party_size: ux.partySize,
                        slot_id: ux.selectedSlotId,
                        slot_label:
                          ux.selectedSlotLabel || momentSeed?.when || reality.when,
                        reality_id: realityKey,
                        source_moment_id: momentSeed?.momentId,
                        lineage: momentSeed
                          ? {
                              moment_id: momentSeed.momentId,
                              reality_seed_id: momentSeed.realitySeedId,
                              moment_author_user_id: DEMO_SOCIAL_MOMENT.authorUserId,
                              causal_chain: [
                                {
                                  moment_id: momentSeed.momentId,
                                  author_user_id: DEMO_SOCIAL_MOMENT.authorUserId,
                                  hop: 0,
                                  evidence: {
                                    seeded_reality_from_moment: true,
                                    place_remained_to_transaction: true,
                                  },
                                },
                              ],
                            }
                          : undefined,
                        idempotency_key: `web-${momentSeed?.realitySeedId || activeChatId}-${placeId}-${ux.selectedSlotId || "slot"}-${authRes.authorization?.authorization_id || "a"}`,
                      },
                      session.access_token,
                    );
                    if (booked.status === "payment_authorization_required") {
                      setReservationUx((s) =>
                        reduceExecutionUx(s, {
                          type: "SERVER_EXECUTION",
                          status: "failed",
                          paymentRequired: true,
                        }),
                      );
                      applyReservationToReality({
                        status: "payment_authorization_required",
                        executionId: booked.execution?.execution_id,
                        placeDisplayName: momentSeed?.placeCandidateName,
                        slotLabel: momentSeed?.when,
                        liveClaimed: false,
                      });
                    } else {
                      const ex = booked.execution;
                      setReservationUx((s) =>
                        reduceExecutionUx(s, {
                          type: "SERVER_EXECUTION",
                          status: ex?.status || "failed",
                          executionId: ex?.execution_id,
                          slotLabel: ex?.slot_label || ux.selectedSlotLabel,
                          placeName: ex?.place_display_name || ux.placeName,
                          partySize: ex?.party_size || ux.partySize,
                          sharedSafeSummary: ex?.shared_safe_summary || null,
                          bookedByName: session.display_name || null,
                        }),
                      );
                      applyReservationToReality({
                        status: ex?.status || "failed",
                        executionId: ex?.execution_id,
                        placeDisplayName:
                          momentSeed?.placeCandidateName ||
                          ex?.place_display_name ||
                          ux.placeName,
                        slotLabel:
                          momentSeed?.when ||
                          ex?.slot_label ||
                          ux.selectedSlotLabel,
                        liveClaimed: Boolean(ex?.live_claimed),
                      });
                    }
                  } else {
                    // Local synthetic confirm (dev proof without API) — same Reality lineage
                    const execId = `local-${momentSeed?.realitySeedId || "seed"}-${ux.selectedSlotId || "slot"}`;
                    setReservationUx((s) =>
                      reduceExecutionUx(s, {
                        type: "SERVER_EXECUTION",
                        status: "confirmed",
                        executionId: execId,
                        slotLabel: s.selectedSlotLabel || momentSeed?.when || reality.when,
                        placeName:
                          momentSeed?.placeCandidateName || s.placeName || reality.where,
                        partySize: s.partySize,
                        sharedSafeSummary: `${momentSeed?.placeCandidateName || s.placeName || "Place"} is reserved for ${s.selectedSlotLabel || momentSeed?.when || reality.when}.`,
                        bookedByName: session?.display_name || "You",
                      }),
                    );
                    applyReservationToReality({
                      status: "confirmed",
                      executionId: execId,
                      placeDisplayName: momentSeed?.placeCandidateName,
                      slotLabel: momentSeed?.when || ux.selectedSlotLabel,
                      liveClaimed: false,
                    });
                  }
                } catch {
                  setReservationUx((s) =>
                    reduceExecutionUx(s, {
                      type: "SERVER_EXECUTION",
                      status: "failed",
                      slotLabel: s.selectedSlotLabel,
                      placeName: s.placeName,
                    }),
                  );
                  applyReservationToReality({
                    status: "failed",
                    executionId: `fail-${momentSeed?.realitySeedId || "seed"}`,
                    placeDisplayName: momentSeed?.placeCandidateName,
                    slotLabel: momentSeed?.when,
                    liveClaimed: false,
                  });
                } finally {
                  reservationBusyRef.current = false;
                }
                return;
              }

              if (ux.primaryCta === "cancel_reservation" || phase === "confirmed") {
                setReservationUx((s) => reduceExecutionUx(s, { type: "OPEN_CANCEL" }));
                return;
              }

              if (ux.primaryCta === "confirm_cancel" || phase === "cancel_confirm") {
                try {
                  if (ux.executionId && session?.access_token && apiConfigured()) {
                    const cancelled = await cancelReservation(
                      ux.executionId,
                      session.access_token,
                    );
                    setReservationUx((s) =>
                      reduceExecutionUx(s, {
                        type: "SERVER_EXECUTION",
                        status: cancelled.execution?.status || "cancelled",
                        executionId: cancelled.execution?.execution_id || s.executionId,
                        slotLabel: s.selectedSlotLabel,
                        placeName: s.placeName,
                        partySize: s.partySize,
                      }),
                    );
                  } else {
                    setReservationUx((s) =>
                      reduceExecutionUx(s, {
                        type: "SERVER_EXECUTION",
                        status: "cancelled",
                        executionId: s.executionId,
                        slotLabel: s.selectedSlotLabel,
                        placeName: s.placeName,
                      }),
                    );
                  }
                } catch {
                  /* keep prior */
                }
                return;
              }

              if (ux.primaryCta === "recheck") {
                setReservationUx((s) =>
                  reduceExecutionUx(s, {
                    type: "PLACE_SELECTED",
                    placeName: s.placeName || reality.where || "place",
                    whenLabel: s.whenLabel || reality.when,
                    partySize: s.partySize,
                  }),
                );
                return;
              }

              if (ux.primaryCta === "resolve_drift") {
                // Surface only — changing Reality never auto-updates booking
                return;
              }
            }}
            onSecondary={() => {
              if (reservationUx.primaryCta === "try_alt_slot" || reservationUx.slots[1]) {
                const alt = reservationUx.slots.find(
                  (s) => s.slotId !== reservationUx.selectedSlotId,
                );
                if (alt) {
                  setReservationUx((s) =>
                    reduceExecutionUx(s, { type: "SELECT_SLOT", slotId: alt.slotId }),
                  );
                }
              } else if (reservationUx.secondaryCta === "choose_another_place") {
                setFindPlaceOpen(true);
                setReservationUx(emptyExecutionUx());
              }
            }}
          />
        ) : null}

        {curateOpen ? (
          <section
            className="curate-panel figma-curate"
            data-testid="curate-panel"
            aria-label="Curated evening"
            data-node-ref="4:11"
          >
            <div className="curate-orbs" aria-hidden />
            <h2 className="curate-headline">
              I&apos;ve got
              <br />
              your evening.
            </h2>
            <p className="curate-arc">
              {(() => {
                const cf = (
                  convSignal as {
                    collective_fit?: {
                      abstain?: boolean;
                      human_surface?: { label?: string };
                      options?: Array<{ name?: string }>;
                    };
                  } | null
                )?.collective_fit;
                if (cf?.abstain) {
                  return (
                    cf.human_surface?.label ||
                    "None of these fit everyone well."
                  );
                }
                const topName = cf?.options?.[0]?.name;
                if (reality.when && topName) {
                  return `${reality.what || "Dinner"} · ${reality.when} · ${topName}`;
                }
                if (cf?.human_surface?.label) return cf.human_surface.label;
                // Pass 16: Moment-seeded provider projection into existing Curate
                if (momentSeed?.placeCandidateName) {
                  const whenLabel = reality.when && reality.when !== "open" ? reality.when : "when open";
                  return `${reality.what || momentSeed.what || "Dinner"} · ${whenLabel} · starting from ${momentSeed.placeCandidateName}`;
                }
                const gapLbl =
                  (convSignal?.shared_reality as { place_gap_label?: string } | undefined)
                    ?.place_gap_label || "";
                const composed = composePlaceOptions({
                  candidates:
                    momentProviderCandidates && momentProviderCandidates.length
                      ? momentProviderCandidates
                      : defaultPlaceCandidates(),
                  placeGapLabel: gapLbl,
                  category: momentSeed ? "italian" : null,
                  whereKnown: Boolean(reality.where),
                  currentIntent: momentSeed ? "quiet" : null,
                });
                const top = composed.ranked[0];
                if (reality.when && top) {
                  return `${reality.what || "Dinner"} · ${reality.when} · ${top.name}`;
                }
                return activeChat.signalLabel || "Dinner · walk · dessert";
              })()}
            </p>
            <p className="curate-authorship">
              {curateAccepted
                ? "You accepted Opal's curation. They never saw the shortlist."
                : momentSeed
                  ? "Continuing from a Moment you loved — still private until you share."
                  : "You asked Opal to curate this."}
            </p>
            {momentSeed ? (
              <p className="curate-truth" data-testid="moment-seed-lineage" hidden>
                {momentSeed.lineageEdge.fromMomentId}→{momentSeed.lineageEdge.toRealityId}
              </p>
            ) : null}
            <div className="row-actions curate-actions">
              <button
                type="button"
                className="btn primary curate-looks-good"
                data-testid="curate-looks-good"
                onClick={() => {
                  // Private accept — does NOT auto-message. When place is the gap, draft place.
                  setCurateAccepted(true);
                  setCurateOpen(false);
                  if (reality.next_gap === "place") {
                    const cf = (
                      convSignal as {
                        collective_fit?: {
                          options?: Array<{ name?: string; area?: string }>;
                        };
                      } | null
                    )?.collective_fit;
                    const serverTop = cf?.options?.[0];
                    const top = serverTop
                      ? { name: serverTop.name || "Juniper & Ivy", area: serverTop.area || "" }
                      : resolvePlaceCandidates(
                          convSignal,
                          (threads[activeChatId || ""] || [])
                            .filter((m) => !m.opalFilament)
                            .map((m) => m.body)
                            .join(" "),
                          Boolean(reality.where),
                        )[0] || {
                          name: momentSeed?.placeCandidateName || "Juniper & Ivy",
                          area: "Little Italy",
                        };
                    const d = buildPlaceShareDraft({
                      name: top.name,
                      area: top.area,
                    });
                    setDraft(d.text);
                    document.getElementById("composer-input")?.focus();
                  } else if (activeChatId) {
                    const privateMoment: Message = {
                      id: `opal-filament-private-curate-${Date.now()}`,
                      from: "them",
                      body: "Evening composition is ready when you want to lead.",
                      time: new Date().toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      }),
                      opalFilament: true,
                      opalPrivate: true,
                      signal: {
                        kind: "plan_forming",
                        label: "Evening composition is ready when you want to lead.",
                      },
                    };
                    setThreads((prev) => ({
                      ...prev,
                      [activeChatId]: [...(prev[activeChatId] || []), privateMoment],
                    }));
                  }
                }}
              >
                {PRODUCT_COPY.looksGood}
              </button>
              <button
                type="button"
                className="btn ghost curate-change-vibe"
                data-testid="curate-change-vibe"
                onClick={() => {
                  // Stay private — recompose, no social message
                  setCurateAccepted(false);
                }}
              >
                {PRODUCT_COPY.changeVibe}
              </button>
            </div>
            <p className="curate-truth">
              Becomes the same Shared Reality object when you lead it socially.
            </p>
          </section>
        ) : null}

        {extendOpen ? (
          <section
            className="extend-panel private-opal-plate"
            data-testid="extend-panel"
            data-private="true"
            aria-label="Private extend possibilities"
          >
            <p className="private-opal-kicker">{PRODUCT_COPY.onlyYou}</p>
            <p className="curate-kicker">Keep the night going</p>
            <p className="curate-truth">{PRODUCT_COPY.extendPrivateLead}</p>
            {!extendSelected ? (
              <ul className="extend-options" data-testid="extend-options">
                {(
                  [
                    {
                      id: "jazz",
                      title: "Live jazz",
                      detail: "4 min away · starts in about 20 min",
                    },
                    {
                      id: "dessert",
                      title: "Dessert",
                      detail: "7 min walk · quiet · open late",
                    },
                    {
                      id: "rooftop",
                      title: "Rooftop",
                      detail: "6 min away · more lively",
                    },
                  ] as const
                ).map((opt) => (
                  <li key={opt.id}>
                    <button
                      type="button"
                      className="extend-option"
                      data-testid={`extend-option-${opt.id}`}
                      onClick={() => {
                        // PRIVATE selection only — reversible, no peer message, no SR write.
                        setExtendSelected({
                          id: opt.id,
                          title: opt.title,
                          detail: opt.detail,
                        });
                      }}
                    >
                      <span className="presence-title">{opt.title}</span>
                      <span className="presence-detail">{opt.detail}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="extend-selected" data-testid="extend-selected">
                <p className="presence-title">{extendSelected.title}</p>
                <p className="presence-detail">{extendSelected.detail}</p>
                <p className="curate-truth">
                  {activeChat.name} never sees this unless you share. You can just
                  lead in person.
                </p>
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn ghost"
                    data-testid="extend-back-options"
                    onClick={() => setExtendSelected(null)}
                  >
                    Back to options
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    data-testid="extend-go"
                    onClick={() => {
                      // Operational assist stays private — no social message.
                      setExtendOpen(false);
                      setExtendSelected(null);
                    }}
                  >
                    {PRODUCT_COPY.go}
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    data-testid="extend-keep-private"
                    onClick={() => {
                      setExtendOpen(false);
                      setExtendSelected(null);
                    }}
                  >
                    {PRODUCT_COPY.keepPrivate}
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    data-testid="extend-share"
                    onClick={() => {
                      // EXPLICIT share only — human chooses social message.
                      setDraft(
                        `${extendSelected.title} is around the corner if you want.`,
                      );
                      setExtendOpen(false);
                      setExtendSelected(null);
                      document.getElementById("composer-input")?.focus();
                    }}
                  >
                    Share
                  </button>
                </div>
              </div>
            )}
            <div className="row-actions">
              <button
                type="button"
                className="btn ghost"
                data-testid="extend-collapse"
                onClick={() => {
                  setExtendOpen(false);
                  setExtendSelected(null);
                }}
              >
                Close
              </button>
              <button
                type="button"
                className="btn ghost"
                data-testid="extend-not-tonight"
                onClick={() => {
                  setExtendOpen(false);
                  setExtendSelected(null);
                }}
              >
                {PRODUCT_COPY.notTonight}
              </button>
            </div>
          </section>
        ) : null}

        <form
          className={`composer glass${
            composerHasOpal ? " has-opal-context" : ""
          }${primary.kind === "set" ? " has-opal-set" : ""}`}
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label className="sr-only" htmlFor="composer-input">
            Message
          </label>
          <input
            id="composer-input"
            className="composer-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={PRODUCT_COPY.composerPlaceholder}
            autoComplete="off"
          />
          <button
            type="submit"
            className="send-btn"
            aria-label="Send message"
            disabled={!draft.trim()}
          >
            <SendIcon />
          </button>
        </form>
      </div>
    );
  }

  // --- S1 first-run (217:2): walkthrough + auth. No member nav while unauthenticated. ---
  // Authenticated replay of intro reuses the walkthrough path only (FR00-FR05).
  if (showFirstRun || !authenticated) {
    if (!authenticated && !authReady && !showFirstRun) {
      const visual = visualShellProps("activation");
      return (
        <div
          className={`app app-futura app-premember ${visual.className}`.trim()}
          aria-label={PRODUCT_PUBLIC_NAME}
          data-testid="premember-boot-shell"
          data-member-nav="false"
          data-product-name={PRODUCT_PUBLIC_NAME}
          data-visual-phase={visual["data-visual-phase"]}
          data-technicolor={visual["data-technicolor"]}
        >
          <div className="app-ambient" aria-hidden />
          <header className="topbar glass">
            <OpalLockup size="md" showTagline={false} />
          </header>
          <main className="pane">
            <p className="activation-status" role="status">
              Preparing
            </p>
            {loadError ? (
              <p className="activation-error" role="alert">
                {loadError}
              </p>
            ) : null}
          </main>
        </div>
      );
    }

    const firstRunMode = showFirstRun ? "full" : "sign_in";
    const visual = visualShellProps(showFirstRun ? "walkthrough" : "activation");
    return (
      <div
        className={`app app-futura app-premember ${visual.className}`.trim()}
        aria-label={
          showFirstRun
            ? `${PRODUCT_PUBLIC_NAME} introduction`
            : `${PRODUCT_PUBLIC_NAME} activation`
        }
        data-testid={
          showFirstRun ? "premember-walkthrough-shell" : "premember-activation-shell"
        }
        data-member-nav="false"
        data-product-name={PRODUCT_PUBLIC_NAME}
        data-visual-phase={visual["data-visual-phase"]}
        data-technicolor={visual["data-technicolor"]}
        data-first-run-mode={firstRunMode}
      >
        <div className="app-ambient" aria-hidden />
        {loadError ? (
          <p className="activation-error" role="alert" data-testid="boot-error">
            {loadError}
          </p>
        ) : null}
        {!apiConfigured() && !authenticated ? (
          <main className="pane">
            <div className="activation">
              <p className="activation-error" role="alert">
                Could not connect. Start the Opal API and open the web app with
                VITE_OPAL_API_URL set (see docs/evidence/shared-reality-closure/FOUNDER_LOCAL_REVIEW.md).
              </p>
            </div>
          </main>
        ) : (
          <FirstRunExperience
            open
            mode={firstRunMode}
            existingSession={authenticated ? session : null}
            onWalkthroughComplete={markWalkthroughDone}
            onAuthenticated={(s) => {
              completeFirstRun();
              if (!authenticated) {
                setSession(s);
                saveSession(s);
                setAuthReady(true);
                setLoadError(null);
                void refreshLive(s);
              }
            }}
          />
        )}
      </div>
    );
  }

  // --- Authenticated member shell only after product session exists. ---
  const memberVisual = visualShellProps("member");
  return (
    <div
      className={`app app-futura ${memberVisual.className}`.trim()}
      aria-label={PRODUCT_PUBLIC_NAME}
      data-testid="member-shell"
      data-member-nav="true"
      data-product-name={PRODUCT_PUBLIC_NAME}
      data-create-dock={CREATE_DOCK_EXPOSED ? "exposed" : "deferred"}
      data-member-home="201:5"
      data-figma-visual="201:2"
      data-visual-phase={memberVisual["data-visual-phase"]}
      data-technicolor={memberVisual["data-technicolor"]}
    >
      <div className="app-ambient" aria-hidden />
      <FindPeopleFlow
        open={findPeopleOpen}
        onClose={() => setFindPeopleOpen(false)}
        bearer={session?.access_token}
        onInvited={() => {
          void (async () => {
            try {
              const inv = await listIncoming(session?.access_token);
              setIncomingInvites(inv.invitations || []);
            } catch {
              /* ignore */
            }
          })();
        }}
      />

      {/* WHO-FAST-PATH-01 intelligence + FINAL WHO 201:6 presentation */}
      {momentForkChooserOpen ? (
        <div className="moment-people-sheet moment-fork-sheet" data-testid="moment-fork-sheet">
          <GraphWhoPicker
            people={(whoFastPath.fastPath.length
              ? whoFastPath.fastPath.map((p) => ({
                  id: p.peerUserId,
                  name: p.displayName,
                  initial: p.displayName.slice(0, 1).toUpperCase(),
                }))
              : [
                  "Maya",
                  "Jordan",
                  "Chanelle",
                  "Sam",
                  "Alex",
                  "Sabrina",
                  "Nina",
                  "Taylor",
                  "Riley",
                ].map((name) => ({
                  id: name.toLowerCase(),
                  name,
                  initial: name.slice(0, 1),
                  avatarSrc:
                    name === "Chanelle"
                      ? "/figma-v2/home-201/avatar-chanelle.png"
                      : name === "Maya"
                        ? "/figma-v2/home-201/avatar-maya.png"
                        : undefined,
                }))
            )}
            selectedIds={
              momentNamedTappedId
                ? [momentNamedTappedId]
                : momentSelectedPeople
            }
            together={whoTogether}
            onToggle={(id) => {
              const person = whoFastPath.fastPath.find((p) => p.peerUserId === id);
              if (person) void handleMomentNamedPerson(person);
              else {
                setMomentSelectedPeople((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                );
              }
            }}
            onTogetherChange={setWhoTogether}
            onContinue={() => {
              if (momentNamedTappedId) {
                const person = whoFastPath.fastPath.find(
                  (p) => p.peerUserId === momentNamedTappedId,
                );
                if (person) void handleMomentNamedPerson(person);
              } else if (whoFastPath.hasMorePeople) openMorePeople();
            }}
            showSolo
            onSolo={handleMomentSolo}
            onClose={() => {
              setMomentForkChooserOpen(false);
              setMomentNamedTappedId(null);
            }}
          />
          {/* Preserve test hooks for More people / Groups */}
          <div className="sr-only">
            {whoFastPath.hasMorePeople ? (
              <button type="button" data-testid="moment-fork-more-people" onClick={openMorePeople}>
                More people
              </button>
            ) : null}
            {whoFastPath.hasGroups ? (
              <button type="button" data-testid="moment-fork-groups" onClick={openGroups}>
                Groups
              </button>
            ) : null}
            <button type="button" data-testid="moment-fork-solo" onClick={handleMomentSolo}>
              Solo
            </button>
            <button
              type="button"
              data-testid="moment-fork-cancel"
              onClick={() => {
                setMomentForkChooserOpen(false);
                setMomentNamedTappedId(null);
              }}
            >
              Not now
            </button>
          </div>
        </div>
      ) : null}

      {momentForming ? (
        <RealityFormingSurface
          whoLabel={realityFormingTitle(momentForming)}
          placeLabel={
            momentForming.exactPlaceGrounded ? momentForming.placeCandidateName : null
          }
          whenLabel={
            momentForming.exactPlaceGrounded ? "When still open" : "Still opening"
          }
          question={realityFormingPrimaryAction(momentForming).question}
          nextGap={momentForming.nextGap}
          exactPlaceGrounded={momentForming.exactPlaceGrounded}
          mediaUrl={DEMO_SOCIAL_MOMENT_MEDIA}
          onContinue={continueFromForming}
          onDismiss={() => setMomentForming(null)}
        />
      ) : null}

      {/* P31-PATCH-01: Moment time sheet on member shell — Solo has no activeChat */}
      {findTimeOpen && momentSeed?.exactPlaceGrounded ? (
        <MomentTimeSheet
          placeLabel={momentSeed.placeCandidateName}
          whatLabel={momentSeed.what}
          selectedWhen={momentSeed.when !== "open" ? momentSeed.when : null}
          onSelect={handleMomentTimeSelect}
          onClose={() => setFindTimeOpen(false)}
        />
      ) : null}

      {/* Pass 16/28: Moment → choose who — people by identity; groups explicit */}
      {momentPeopleOpen ? (
        <div
          className="moment-people-sheet"
          data-testid="moment-people-sheet"
          role="dialog"
          aria-label="Who do you want to do this with?"
        >
          <div className="moment-people-sheet-panel">
            <h2 className="moment-people-title">
              {momentPeopleSheetMode === "groups"
                ? "Groups"
                : momentPeopleSheetMode === "people"
                  ? "More people"
                  : "With who?"}
            </h2>
            <p className="moment-people-lede">
              {momentPeopleSheetMode === "groups"
                ? "Pick a group when you mean everyone in it."
                : momentPeopleSheetMode === "people"
                  ? "Direct people not on the first list."
                  : "Pick a person for a direct invite, or a group when you mean everyone."}
            </p>
            <ul className="moment-people-list">
              {momentWhoOptions.length === 0 ? (
                <li>
                  <p className="moment-people-lede">
                    Invite someone first — then this Moment can become your plan.
                  </p>
                  <button
                    type="button"
                    className="moment-people-option"
                    data-testid="moment-people-find"
                    onClick={() => {
                      setMomentPeopleOpen(false);
                      setFindPeopleOpen(true);
                    }}
                  >
                    Find people
                  </button>
                </li>
              ) : (
                momentWhoOptions.slice(0, 16).map((opt) => {
                  const key =
                    opt.kind === "person"
                      ? `person:${opt.peerUserId}`
                      : `group:${opt.conversationId}`;
                  const on = momentSelectedPeople.includes(key);
                  const label =
                    opt.kind === "person" ? opt.displayName : opt.displayName;
                  const meta =
                    opt.kind === "person"
                      ? DEMO_SOCIAL_MOMENT.placeRef?.display_name
                        ? `Direct · ${DEMO_SOCIAL_MOMENT.placeRef.display_name}`
                        : "Direct invite"
                      : `Group · ${opt.memberCount} people`;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        className="moment-people-option"
                        data-testid={
                          opt.kind === "person"
                            ? `moment-person-${opt.peerUserId}`
                            : `moment-group-${opt.conversationId}`
                        }
                        data-who-kind={opt.kind}
                        data-conversation-id={
                          opt.kind === "person"
                            ? opt.conversationId || undefined
                            : opt.conversationId
                        }
                        data-peer-user-id={
                          opt.kind === "person" ? opt.peerUserId : undefined
                        }
                        data-selected={on ? "true" : "false"}
                        aria-pressed={on}
                        onClick={() => {
                          // Single-select for clarity: person vs group intent
                          setMomentSelectedPeople((prev) =>
                            prev.includes(key) ? [] : [key],
                          );
                        }}
                      >
                        {on ? "✓ " : ""}
                        {label}
                        <span className="moment-people-option-meta">{meta}</span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
            <button
              type="button"
              className="moment-people-option"
              data-testid="moment-people-confirm"
              disabled={momentSelectedPeople.length === 0}
              onClick={() => void handleMomentPeopleConfirm()}
              style={{
                marginTop: 12,
                borderColor: "rgba(110,232,245,0.45)",
                color: "#6ee8f5",
                opacity: momentSelectedPeople.length ? 1 : 0.45,
              }}
            >
              {momentSelectedPeople[0]?.startsWith("person:")
                ? "Send invite"
                : momentSelectedPeople[0]?.startsWith("group:")
                  ? "Continue with group"
                  : "Continue · pick someone"}
            </button>
            <button
              type="button"
              className="moment-people-cancel"
              data-testid="moment-people-cancel"
              onClick={() => {
                setMomentPeopleOpen(false);
                setMomentSelectedPeople([]);
              }}
            >
              Not now
            </button>
          </div>
        </div>
      ) : null}

      {/*
        Brand law: authenticated chrome uses OpalMark (+ optional word), not full lockup.
        Home owns brand via V2BrandRow. Opening/lockup reserved for brand reveal.
      */}
      {tab !== "home" ? (
        <header className="topbar glass" data-brand-chrome="mark">
          <div className="topbar-brand" aria-label={PRODUCT_PUBLIC_NAME}>
            <OpalMark size="sm" title="" />
            <span className="topbar-brand-word">
              Opal<span className="is-graph"> Graph</span>
            </span>
          </div>
          {connectionState === "reconnecting" ||
          connectionState === "failed" ||
          connectionState === "session_expired" ? (
            <span className="session-pill session-pill-warn" role="status">
              {connectionState === "session_expired"
                ? "Sign in again"
                : "Trying to reconnect…"}
            </span>
          ) : null}
        </header>
      ) : connectionState === "reconnecting" ||
        connectionState === "failed" ||
        connectionState === "session_expired" ? (
        <header className="topbar glass topbar-status-only">
          <span className="session-pill session-pill-warn" role="status">
            {connectionState === "session_expired"
              ? "Sign in again"
              : "Trying to reconnect…"}
          </span>
        </header>
      ) : null}

      <main className="pane" aria-label={TABS.find((t) => t.id === tab)?.label}>
        {loadError ? (
          <p className="activation-error" role="alert">
            {loadError}
          </p>
        ) : null}
        {tab === "home" ? (
          <HomePane
            needs={needs}
            chats={chats}
            onComplete={(id) => setNeeds((n) => n.filter((x) => x.id !== id))}
            onOpenChat={(id) => {
              if (id) void openChat(id);
              else setTab("chats");
            }}
            onOpenPeople={() => setTab("chats")}
            onOpenPlans={() => setTab("plans")}
            onOpenYou={() => setTab("you")}
            onOpenProfilePerson={(name) => setProfilePerson(name)}
            onOpenLive={() => setLiveSurfaceOpen(true)}
            authenticated
            loading={loadingLive}
            signals={liveSignals}
            socialMoment={socialMoment}
            onMomentDoWithPeople={handleMomentWantThis}
          />
        ) : null}
        {tab === "chats" ? (
          <ChatsPane
            chats={chats}
            onOpen={(id) => void openChat(id)}
            authenticated
            loading={loadingLive}
            onFindPeople={() => setFindPeopleOpen(true)}
            incoming={incomingInvites}
            onAcceptInvite={async (id) => {
              if (!session) return;
              try {
                let cont: string | null = null;
                try {
                  cont = sessionStorage.getItem("opal_invite_continuation");
                } catch {
                  cont = null;
                }
                const res = await acceptInvitation(id, session.access_token, cont);
                try {
                  sessionStorage.removeItem("opal_invite_continuation");
                } catch {
                  /* ignore */
                }
                const moment = (res as { first_social_moment?: { body?: string } })
                  .first_social_moment?.body;
                if (moment) setSocialMoment(moment);
                const inv = await listIncoming(session.access_token);
                setIncomingInvites(inv.invitations || []);
                await refreshLive(session);
                if (res.establishment?.conversation_id) {
                  void openChat(res.establishment.conversation_id);
                }
              } catch (e) {
                setLoadError((e as Error).message || "Could not accept invitation");
              }
            }}
            socialMoment={socialMoment}
          />
        ) : null}
        {tab === "plans" ? (
          <PlansPane
            authenticated
            signals={liveSignals}
            onOpenChat={(id) => {
              if (id) void openChat(id);
              else setTab("chats");
            }}
          />
        ) : null}
        {tab === "you" ? (
          <YouPane
            onReplayIntro={() => setShowFirstRun(true)}
            session={session}
            onFindPeople={() => setFindPeopleOpen(true)}
            onSignOut={async () => {
              productRealtime.stop();
              // Continuation is ephemeral; never survive sign-out (D-002 / Real People).
              try {
                sessionStorage.removeItem("opal_invite_continuation");
              } catch {
                /* private mode */
              }
              if (session) {
                try {
                  await signOut(session.access_token);
                } catch {
                  saveSession(null);
                }
              }
              setSession(null);
              setChats([]);
              setThreads({});
              setNeeds([]);
              setConnectionState("offline");
            }}
          />
        ) : null}
      </main>

      {/*
        S0 dock: Home · People · Plans · You remain live.
        Center create (＋) is deferred until Graph create (S5) so we never ship a dead control.
        Layout is ready: data-create-dock=deferred documents the final 5-slot model.
      */}
      {liveSurfaceOpen ? (
        <div className="live-surface-overlay" data-testid="live-surface-overlay">
          <button
            type="button"
            className="btn ghost"
            style={{ margin: "8px 16px" }}
            onClick={() => setLiveSurfaceOpen(false)}
          >
            Back
          </button>
          <GraphLivePanel
            place="Juniper & Ivy"
            area="Downtown San Diego"
            ledBy="Chanelle"
            ledByAvatarSrc="/figma-v2/home-201/avatar-chanelle.png"
            participants={[
              { name: "Sadeil", status: "Sadeil locked in", meta: "Just now" },
              { name: "Sabrina", status: "Sabrina is on the way", meta: "ETA 8 min" },
            ]}
            tableReady
            etaLine="ETA 8 min · See you soon"
            onOnMyWay={() => setOnMyWayActive((v) => !v)}
            onMyWayActive={onMyWayActive}
            seedLabel="Founder seed Live projection"
          />
        </div>
      ) : null}

      {profilePerson ? (
        <div className="profile-person-overlay" data-testid="profile-person-overlay">
          <GraphProfilePage
            name={profilePerson}
            connectionLabel="Direct connection"
            avatarSrc={
              /chanelle/i.test(profilePerson)
                ? "/figma-v2/home-201/avatar-chanelle.png"
                : /maya/i.test(profilePerson)
                  ? "/figma-v2/home-201/avatar-maya.png"
                  : undefined
            }
            graphs={FOUNDER_HOME_FEED.filter(
              (c) =>
                c.kind === "graph" &&
                c.person.toLowerCase() === profilePerson.toLowerCase(),
            ).map((c) => ({
              id: c.id,
              title: c.title,
              detail: c.detail,
              mediaSrc: c.mediaSrc,
              when: c.when,
            }))}
            memories={FOUNDER_HOME_FEED.filter(
              (c) =>
                c.kind === "memory" &&
                c.person.toLowerCase() === profilePerson.toLowerCase(),
            ).map((c) => ({
              id: c.id,
              title: c.title,
              when: c.detail || c.when,
              mediaSrc: c.thumbSrc || c.mediaSrc,
            }))}
            onBack={() => setProfilePerson(null)}
            onMessage={() => {
              const chat = chats.find((c) =>
                c.name.toLowerCase().includes(profilePerson.toLowerCase()),
              );
              setProfilePerson(null);
              if (chat) void openChat(chat.id);
              else setTab("chats");
            }}
            onPlan={() => {
              // WHO already known
              setProfilePerson(null);
              setFindTimeOpen(true);
            }}
          />
        </div>
      ) : null}

      <nav
        className="tabbar glass"
        aria-label="Primary"
        data-testid="member-tabbar"
        data-create-dock={CREATE_DOCK_EXPOSED ? "exposed" : "deferred"}
        data-nav-model="home-people-create-plans-you"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab ${tab === t.id ? "active" : ""}`}
            aria-current={tab === t.id ? "page" : undefined}
            aria-label={t.label}
            data-testid={`member-tab-${t.id}`}
            onClick={() => setTab(t.id)}
          >
            <TabIcon id={t.id} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function HomePane({
  needs,
  chats,
  onComplete,
  onOpenChat,
  onOpenPeople,
  onOpenPlans,
  onOpenYou,
  onOpenProfilePerson,
  onOpenLive,
  authenticated,
  loading,
  signals,
  socialMoment,
  onMomentDoWithPeople,
}: {
  needs: NeedItem[];
  chats: ChatPreview[];
  onComplete: (id: string) => void;
  onOpenChat: (id?: string) => void;
  onOpenPeople?: () => void;
  onOpenPlans?: () => void;
  onOpenYou?: () => void;
  onOpenProfilePerson?: (name: string) => void;
  onOpenLive?: () => void;
  authenticated?: boolean;
  loading?: boolean;
  signals?: ProductSignal[];
  socialMoment?: string | null;
  onMomentDoWithPeople?: () => void;
}) {
  const nameByConv = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of chats) m.set(c.id, c.name);
    return m;
  }, [chats]);

  const peerKeyByConv = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of chats) m.set(c.id, c.homePeerKey || c.id);
    return m;
  }, [chats]);

  // Attention field: strongest per peer, then AttentionAuthority compression.
  // Home is what matters NOW — not a feed of every signal Opal understands.
  const awaken = needs[0];
  const awakenConvId = awaken?.chatId || null;

  const presenceRaw = authenticated
    ? composeHomeAttentionField(
        strongestPerHomePresence(signals || [], peerKeyByConv).filter((s) => {
          if (s.kind === "proposal") return false;
          const stage = s.lifecycle_stage || "";
          if (stage === "canceled" || stage === "quiet") return false;
          // Awaken already owns this decision — do not stack the same reality as presence.
          if (awakenConvId && s.conversation_id === awakenConvId) return false;
          return (
            isDurableForPlans(s) ||
            isConsequentialNeed(s) ||
            isUsableReality(s) ||
            stage === "still_open" ||
            stage === "plan_forming"
          );
        }),
        { maxNow: 2, maxLater: 3, maxQuiet: 1 },
      ).map((x) => x.signal)
    : [];

  // Presentation collapse: one row per who+title so residual multi-seed groups
  // do not paint "Friends · Dinner" twice under different conversation ids.
  // Also: if Awaken already owns "Where should dinner be?" for Friends, do not
  // restate Friends·Dinner as a second Home object (Pass 12 sparsity).
  const presence = (() => {
    const seen = new Set<string>();
    const out: typeof presenceRaw = [];
    const awakenOwnsDinner =
      !!awaken &&
      /where should|dinner|place/i.test(`${awaken.title} ${awaken.detail || ""}`);
    const awakenWho = (awaken?.detail || "").toLowerCase();
    for (const s of presenceRaw) {
      const who =
        nameByConv.get(s.conversation_id || "") ||
        s.shared_reality?.headline?.split(" ")[0] ||
        "Together";
      const lines = presenceLines(s);
      const isGroup = lines.composition === "group" || who.includes(",");
      const whoLabel = isGroup && (who.includes(",") || (s.member_count ?? 0) >= 3) ? "Friends" : who;
      if (
        awakenOwnsDinner &&
        /dinner/i.test(lines.title || "") &&
        (/friends/i.test(whoLabel) || /friends/i.test(awakenWho))
      ) {
        continue;
      }
      const key = `${(whoLabel || "").toLowerCase()}|${(lines.title || "").toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
    }
    return out;
  })();

  const [editorialA, editorialB] = homeEditorialLines({
    hasAction: !!awaken,
    hasPresence: presence.length > 0,
  });

  // Coherence reset: authenticated Home is Figma 201:5 (not legacy attention shell).
  // FR09 → 201:5. Live signals continue below seed as 145:46 endless-scroll seam.
  // Soft interest (I'd go) stays in-feed — never auto-opens WHO (155:2).
  const [softInterestIds, setSoftInterestIds] = useState<string[]>([]);
  const [likedMemoryIds, setLikedMemoryIds] = useState<string[]>([]);

  if (authenticated) {
    const continuation =
      presence.length > 0 || awaken ? (
        <div className="gsh-live-continuation" data-testid="home-living-field" data-node-ref="145:46">
          {loading ? <p className="empty">Loading</p> : null}
          {awaken ? (
            <AwakenSurface
              kicker={PRODUCT_COPY.chooseKicker}
              title={awaken.title}
              conversationId={awaken.chatId}
              meta={(() => {
                const whoRaw = nameByConv.get(awaken.chatId || "") || "Someone";
                const who =
                  whoRaw.includes(",") || (whoRaw.match(/\b\w+\b/g) || []).length > 3
                    ? "Friends"
                    : whoRaw;
                const d = (awaken.detail || "").trim();
                if (d.toLowerCase().startsWith(who.toLowerCase())) return d;
                return [who, d].filter(Boolean).join(" · ");
              })()}
              onClick={() => onOpenChat(awaken.chatId)}
            />
          ) : null}
          {presence.map((s, i) => {
            const who =
              nameByConv.get(s.conversation_id || "") ||
              s.shared_reality?.headline?.split(" ")[0] ||
              "Together";
            const lines = presenceLines(s);
            const isGroup = lines.composition === "group";
            const energy: PresenceEnergy = isUsableReality(s)
              ? "settled"
              : isGroup
                ? "group"
                : lines.gap
                  ? "possibility"
                  : s.lifecycle_stage === "handled" || energyRecall(s)
                    ? "recall"
                    : "calm";
            const whoLabel = isGroup && who.includes(",") ? "Friends" : who;
            return (
              <PresenceSurface
                key={s.conversation_id || i}
                who={whoLabel}
                title={lines.title}
                detail={
                  lines.gap
                    ? lines.gap
                    : lines.detail ||
                      (energy === "settled"
                        ? "settled"
                        : energy === "recall"
                          ? "Moment · recall"
                          : "Message · open")
                }
                energy={energy}
                composition={lines.composition || s.composition || "dyad"}
                memberCount={lines.memberCount}
                conversationId={s.conversation_id}
                onClick={() => onOpenChat(s.conversation_id)}
              />
            );
          })}
        </div>
      ) : null;

    return (
      <GraphSocialHome
        softInterestIds={softInterestIds}
        likedMemoryIds={likedMemoryIds}
        onIdGoSoftInterest={(cardId) => {
          setSoftInterestIds((prev) =>
            prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId],
          );
        }}
        onMemoryLike={(cardId) => {
          setLikedMemoryIds((prev) =>
            prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId],
          );
        }}
        onOpenPeople={onOpenPeople}
        onOpenNear={onOpenPlans}
        onOpenPersonProfile={(name) => onOpenProfilePerson?.(name)}
        onOpenMemoryDetail={() => onOpenYou?.()}
        onWantThisMemory={() => onMomentDoWithPeople?.()}
        onOpenGraphDetail={() => onOpenLive?.()}
        continuation={continuation}
      />
    );
  }

  return (
    <div className="scroll home-living-field" data-testid="home-living-field" data-node-ref="2:2">
      {/* Legacy unauthenticated fallback only — members use 201:5 GraphSocialHome */}
      <V2AmbientField />
      <V2BrandRow />
      <h1 className="home-editorial" data-testid="home-editorial">
        <span className="home-editorial-line">{editorialA}</span>
        <span className="home-editorial-line">{editorialB}</span>
      </h1>
      {loading ? <p className="empty">Loading</p> : null}

      {/* Figma 2:7 — ONE awakening decision only (never stack five) */}
      {awaken ? (
        <AwakenSurface
          kicker={PRODUCT_COPY.chooseKicker}
          title={awaken.title}
          conversationId={awaken.chatId}
          meta={(() => {
            // Figma 2:2: quiet meta — not a multi-name constraint dump
            const whoRaw = nameByConv.get(awaken.chatId || "") || "Someone";
            const who =
              whoRaw.includes(",") || (whoRaw.match(/\b\w+\b/g) || []).length > 3
                ? "Friends"
                : whoRaw;
            // awaken.detail already includes who · meta — avoid "Friends · Friends · …"
            const d = (awaken.detail || "").trim();
            if (d.toLowerCase().startsWith(who.toLowerCase())) return d;
            return [who, d].filter(Boolean).join(" · ");
          })()}
          onClick={() => onOpenChat(awaken.chatId)}
        />
      ) : null}

      <section className="section presence-section" aria-label="With your people">
        {authenticated ? (
          presence.length === 0 && !awaken ? (
            <p className="empty">{PRODUCT_COPY.emptyNeedsYou}</p>
          ) : (
            presence.map((s, i) => {
              const who =
                nameByConv.get(s.conversation_id || "") ||
                s.shared_reality?.headline?.split(" ")[0] ||
                "Together";
              const lines = presenceLines(s);
              const isGroup = lines.composition === "group";
              const energy: PresenceEnergy = isUsableReality(s)
                ? "settled"
                : isGroup
                  ? "group"
                  : lines.gap
                    ? "possibility"
                    : s.lifecycle_stage === "handled" || energyRecall(s)
                      ? "recall"
                      : "calm";
              const whoLabel =
                isGroup && who.includes(",")
                  ? "Friends"
                  : who;
              return (
                <PresenceSurface
                  key={s.conversation_id || i}
                  who={whoLabel}
                  title={lines.title}
                  detail={
                    lines.gap
                      ? lines.gap
                      : lines.detail ||
                        (energy === "settled"
                          ? "settled"
                          : energy === "recall"
                            ? "Moment · recall"
                            : "Message · open")
                  }
                  energy={energy}
                  composition={lines.composition || s.composition || "dyad"}
                  memberCount={lines.memberCount}
                  conversationId={s.conversation_id}
                  onClick={() => onOpenChat(s.conversation_id)}
                />
              );
            })
          )
        ) : (
          PLANS.map((p) => (
            <PresenceSurface
              key={p.id}
              who={p.who}
              title={p.title}
              detail={[p.when, p.where].filter(Boolean).join(" · ")}
              energy="calm"
              onClick={() => onOpenChat(p.chatId)}
            />
          ))
        )}
      </section>
      {/* Social Moment — media primary, not feed (Figma 4:23). Pass 16 live loop. */}
      {authenticated ? (
        <section
          className="section social-moment-section"
          aria-label="Social moment"
          data-testid="social-moment-section"
        >
          <SocialMomentCard
            creator="Chanelle"
            caption={
              socialMoment && socialMoment.length > 8
                ? socialMoment
                : DEMO_SOCIAL_MOMENT.caption
            }
            place={DEMO_SOCIAL_MOMENT.placeRef?.display_name || "Juniper & Ivy"}
            providerPlaceId={DEMO_SOCIAL_MOMENT.placeRef?.provider_place_id || null}
            mediaUrl={DEMO_SOCIAL_MOMENT_MEDIA}
            relationship="following"
            inspiredCount={null}
            followingVisual="quiet"
            onWantThis={() => {
              if (onMomentDoWithPeople) onMomentDoWithPeople();
              else onOpenChat();
            }}
            onDoWithPeople={() => {
              if (onMomentDoWithPeople) onMomentDoWithPeople();
              else onOpenChat();
            }}
          />
        </section>
      ) : null}
    </div>
  );
}

function energyRecall(s: ProductSignal): boolean {
  return s.lifecycle_stage === "handled" || s.ui_job === "recall";
}

function ChatsPane({
  chats,
  onOpen,
  authenticated,
  loading,
  onFindPeople,
  incoming,
  onAcceptInvite,
  socialMoment,
}: {
  chats: ChatPreview[];
  onOpen: (id: string) => void;
  authenticated?: boolean;
  loading?: boolean;
  onFindPeople?: () => void;
  incoming?: { id: string }[];
  onAcceptInvite?: (id: string) => void | Promise<void>;
  socialMoment?: string | null;
}) {
  return (
    <div className="scroll">
      <h2 className="screen-title">Chats</h2>
      {socialMoment ? (
        <div className="opal-moment row" role="status" data-testid="first-social-moment">
          <span className="opal-moment-mark" aria-hidden>
            ◈
          </span>
          <span className="opal-moment-label">{socialMoment}</span>
        </div>
      ) : null}
      {authenticated && incoming && incoming.length > 0 ? (
        <section className="section" aria-label="Invitations">
          <h3 className="section-label">New invitation</h3>
          {incoming.map((inv) => (
            <article key={inv.id} className="card lumen-card">
              <p>Someone invited you to connect.</p>
              <button
                type="button"
                className="btn primary"
                onClick={() => void onAcceptInvite?.(inv.id)}
              >
                Accept
              </button>
            </article>
          ))}
        </section>
      ) : null}
      {loading ? <p className="empty">Loading conversations…</p> : null}
      {!loading && chats.length === 0 ? (
        <div className="empty-people" data-testid="empty-people">
          <p className="empty-title">Your people will show up here</p>
          <p className="empty">
            {authenticated
              ? "Invite someone you know to begin."
              : PRODUCT_COPY.emptyChats}
          </p>
          {authenticated ? (
            <div className="find-people-actions">
              <button type="button" className="btn primary" onClick={onFindPeople}>
                Find people you know
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      {authenticated && !loading && chats.length > 0 ? (
        <div className="find-people-actions compact">
          <button type="button" className="btn ghost" onClick={onFindPeople}>
            Invite someone
          </button>
        </div>
      ) : null}
      {!loading && chats.length > 0 ? (
        <ul className="chat-list">
          {chats.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="chat-row lumen-row"
                data-conversation-id={c.id}
                data-testid="chat-row"
                onClick={() => onOpen(c.id)}
              >
                <div className="avatar avatar-lumen" aria-hidden>
                  {initials(c.name)}
                </div>
                <div className="chat-meta">
                  <div className="chat-top">
                    <span className="chat-name">{c.name}</span>
                    <time className="chat-time">{c.time}</time>
                  </div>
                  <div className="chat-bottom">
                    <span className={`chat-preview ${c.unread ? "unread" : ""}`}>
                      {c.preview}
                    </span>
                    {c.unread ? (
                      <span className="badge-count" aria-label={`${c.unread} unread`}>
                        {c.unread}
                      </span>
                    ) : null}
                  </div>
                  {c.signalLabel ? (
                    <div
                      className={`opal-moment row signal-${c.signal ?? "moment"}`}
                      data-testid="list-journey-signal"
                      data-state={semanticStateForSignal(c.signal ?? "moment")}
                    >
                      <span className="opal-moment-mark" aria-hidden>
                        ◈
                      </span>
                      <span className="opal-moment-label">{c.signalLabel}</span>
                    </div>
                  ) : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function PlansPane({
  authenticated,
  signals,
  onOpenChat,
}: {
  authenticated?: boolean;
  signals?: ProductSignal[];
  onOpenChat?: (id?: string) => void;
}) {
  const groups = [
    { key: "needs_you" as const, label: "Needs confirmation" },
    { key: "today" as const, label: "Today" },
    { key: "upcoming" as const, label: "Upcoming" },
  ];

  // Same reality lineage as Home/Chat - not a parallel plan database.
  // Presentation collapse: residual multi-seed fixtures often share surface labels
  // across conversation ids — show one plan card per human surface, not a feed.
  const collapsePlanSurfaces = (list: ProductSignal[]): ProductSignal[] => {
    const seenConv = new Set<string>();
    const seenSurface = new Set<string>();
    const out: ProductSignal[] = [];
    for (const s of list) {
      const cid = s.conversation_id || "";
      if (cid && seenConv.has(cid)) continue;
      const label = (surfaceLabel(s) || presenceLines(s).title || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
      // Drop near-duplicate settled plans (same what+when+where fingerprint)
      const where = (s.shared_reality?.where || "").toLowerCase().trim();
      const when = (s.shared_reality?.when || "").toLowerCase().trim();
      const surfaceKey = `${label}|${when}|${where}`;
      if (label && seenSurface.has(surfaceKey)) continue;
      if (cid) seenConv.add(cid);
      if (label) seenSurface.add(surfaceKey);
      out.push(s);
    }
    return out;
  };

  const durable = collapsePlanSurfaces(
    strongestPerConversation(signals || []).filter(isDurableForPlans),
  );
  const usable = durable.filter((s) => {
    const reality = deriveSocialReality(s);
    // Fully settled: no meaningful next gap (or only extend)
    if (reality.next_gap === "none" && isUsableReality(s)) return true;
    const suf = s.shared_reality?.sufficiency;
    if (suf === "usable") return true;
    if (suf === "converging" || suf === "intention") return false;
    return (
      s.lifecycle_stage === "set" ||
      s.lifecycle_stage === "ready" ||
      s.lifecycle_stage === "handled"
    );
  });
  const usableIds = new Set(usable.map((s) => s.conversation_id).filter(Boolean));
  const converging = durable.filter((s) => {
    if (usable.includes(s)) return false;
    // If a settled plan already covers this surface, don't re-list as converging
    const label = (surfaceLabel(s) || "").toLowerCase().replace(/\s+/g, " ").trim();
    if (
      label &&
      usable.some(
        (u) =>
          (surfaceLabel(u) || "").toLowerCase().replace(/\s+/g, " ").trim().startsWith(label.split("·")[0]?.trim() || "___") &&
          (u.shared_reality?.when || "").slice(0, 12) === (s.shared_reality?.when || "").slice(0, 12),
      )
    ) {
      return false;
    }
    if (s.conversation_id && usableIds.has(s.conversation_id)) return false;
    return true;
  });

  const planCardDetail = (s: ProductSignal) => {
    const reality = deriveSocialReality(s);
    const lines = presenceLines(s);
    if (reality.next_gap === "place") return PRODUCT_COPY.choosePlace;
    if (reality.next_gap === "time") return PRODUCT_COPY.findTime;
    return lines.detail || signalDetail(s) || s.evidence_preview || "From conversation";
  };

  const primary = usable[0] || converging[0] || null;
  const reality = primary ? deriveSocialReality(primary) : null;
  const whoLabel =
    primary?.shared_reality?.headline?.split(" ")[0] ||
    (primary ? presenceLines(primary).title.split(" ")[0] : null) ||
    "Chanelle";

  return (
    <div className="scroll" data-testid="plans-field" data-node-ref="201:9" data-figma-journey="201:9">
      {authenticated ? (
        <GraphJourneyCard
          title={reality?.when ? `With ${whoLabel}` : `Saturday with ${whoLabel}`}
          place={reality?.where || "Juniper & Ivy"}
          when={reality?.when || "Saturday · 7:30 PM"}
          leave="6:55 PM"
          arrive="7:23 PM"
          reserved={
            primary && isUsableReality(primary) ? "7:30 PM" : reality?.where ? "Pending" : "7:30 PM"
          }
          mediaSrc="/figma-v2/home-201/media-juniper.png"
          peerName={whoLabel}
          peerAvatarSrc="/figma-v2/home-201/avatar-chanelle.png"
          onImIn={() => primary?.conversation_id && onOpenChat?.(primary.conversation_id)}
          onChangeTime={() => primary?.conversation_id && onOpenChat?.(primary.conversation_id)}
          onAddPeople={() => onOpenChat?.(primary?.conversation_id)}
          onManage={() => onOpenChat?.(primary?.conversation_id)}
          onCantMakeIt={() => onOpenChat?.(primary?.conversation_id)}
          commitmentActive={!!primary && isUsableReality(primary)}
        />
      ) : (
        <p className="lede muted-lede">{PRODUCT_COPY.emptyPlans}</p>
      )}
      {authenticated && usable.length > 1 ? (
        <section className="section">
          <h3 className="section-label">Shared</h3>
          {usable.slice(1).map((s, i) => (
              <button
                key={s.conversation_id || i}
                type="button"
                className="card lumen-card plan-card-btn"
                data-testid="plan-shared-card"
                data-next-gap={deriveSocialReality(s).next_gap}
                onClick={() => onOpenChat?.(s.conversation_id)}
              >
                <h4 className="plan-title">{surfaceLabel(s)}</h4>
                <p className="plan-detail">{planCardDetail(s)}</p>
              </button>
            ))}
        </section>
      ) : null}
      {authenticated && converging.length > 0 ? (
        <section className="section">
          <h3 className="section-label">Coming together</h3>
          {converging.map((s, i) => {
            return (
              <button
                key={s.conversation_id || `c-${i}`}
                type="button"
                className="card lumen-card plan-card-btn"
                data-testid="plan-converging-card"
                data-next-gap={deriveSocialReality(s).next_gap}
                onClick={() => onOpenChat?.(s.conversation_id)}
              >
                <h4 className="plan-title">{surfaceLabel(s)}</h4>
                <p className="plan-detail">{planCardDetail(s)}</p>
              </button>
            );
          })}
        </section>
      ) : null}
      {!authenticated
        ? groups.map((g) => {
            const items = PLANS.filter((p) => p.status === g.key);
            if (!items.length) return null;
            return (
              <section key={g.key} className="section">
                <h3 className="section-label">{g.label}</h3>
                {items.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="card lumen-card plan-card-btn"
                    onClick={() => onOpenChat?.(p.chatId)}
                  >
                    <h4>{p.title}</h4>
                    <p>
                      {p.when}
                      {p.where ? (
                        <>
                          <span className="dot">·</span>
                          {p.where}
                        </>
                      ) : null}
                      <span className="dot">·</span>
                      {p.who}
                    </p>
                  </button>
                ))}
              </section>
            );
          })
        : null}
      {authenticated && durable.length === 0 ? (
        <p className="empty">Nothing firm enough to count on yet.</p>
      ) : null}
    </div>
  );
}

function YouPane({
  onReplayIntro: _onReplayIntro,
  session,
  onSignOut,
  onFindPeople,
}: {
  onReplayIntro: () => void;
  session: ProductSession | null;
  onSignOut: () => void | Promise<void>;
  onFindPeople?: () => void;
}) {
  void _onReplayIntro;
  const name = session?.display_name?.trim() || null;
  const phone = (session as { phone?: string } | null)?.phone;
  const handle = (session as { handle?: string } | null)?.handle;
  let tz = "local";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
  } catch {
    tz = "local";
  }

  return (
    <div className="scroll profile-pane" data-testid="profile-pane" data-figma-profile="201:10">
      <GraphProfilePage
        name={name || "You"}
        connectionLabel={handle ? `@${handle}` : "Your profile"}
        graphs={FOUNDER_HOME_FEED.filter((c) => c.kind === "graph").map((c) => ({
          id: c.id,
          title: c.title,
          detail: c.detail,
          mediaSrc: c.mediaSrc,
          when: c.when,
        }))}
        memories={FOUNDER_HOME_FEED.filter((c) => c.kind === "memory").map((c) => ({
          id: c.id,
          title: c.title,
          when: c.detail || c.when,
          mediaSrc: c.thumbSrc || c.mediaSrc,
        }))}
        onMessage={onFindPeople}
        onPlan={onFindPeople}
      />
      <article className="card profile-card lumen-card sr-only" data-testid="profile-identity">
        <div>
          <h4>{name || "Not signed in"}</h4>
          {phone ? <p className="profile-meta">{phone}</p> : null}
          {handle ? <p className="profile-meta">@{handle}</p> : null}
        </div>
      </article>

      <section className="section" aria-label="Location and time">
        <h3 className="section-label">Location & time</h3>
        <div className="settings-row static" data-testid="profile-timezone">
          <span>Timezone</span>
          <span className="muted">{tz}</span>
        </div>
        <p className="profile-hint">
          Opal keeps event times human and local. Timezone stays ambient unless
          people are coordinating across places.
        </p>
      </section>

      <section className="section" aria-label="Social">
        <h3 className="section-label">Social</h3>
        {session ? (
          <button
            type="button"
            className="settings-row"
            data-testid="profile-people"
            onClick={onFindPeople}
          >
            <span>People</span>
            <span className="muted">Invite</span>
          </button>
        ) : null}
      </section>

      {/* P30R2 124:33 — private creator impact only (never public Inspired N) */}
      {session ? <PrivateCreatorImpact /> : null}

      {typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1") ? (
        <section className="section" aria-label="Local development">
          <h3 className="section-label">Local development</h3>
          <button
            type="button"
            className="settings-row"
            data-testid="reset-first-run"
            onClick={() => {
              clearFirstRunDone();
              window.location.href = "/?opal_reset_first_run=1";
            }}
          >
            <span>Reset first run</span>
            <span className="muted">Cold open</span>
          </button>
        </section>
      ) : null}

      <section className="section" aria-label="Account">
        <h3 className="section-label">Account</h3>
        {session ? (
          <button
            type="button"
            className="settings-row"
            data-testid="sign-out"
            onClick={() => void onSignOut()}
          >
            <span>Sign out</span>
            <span className="muted">This browser</span>
          </button>
        ) : null}
      </section>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M22 2L11 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M22 2L15 22l-4-9-9-4 20-7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TabIcon({ id }: { id: Tab }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    "aria-hidden": true as const,
  };
  if (id === "home") {
    return (
      <svg {...common}>
        <path
          d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (id === "chats") {
    return (
      <svg {...common}>
        <path
          d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.2A8 8 0 1 1 21 12z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (id === "plans") {
    return (
      <svg {...common}>
        <rect
          x="4"
          y="5"
          width="16"
          height="15"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 19c1.5-3.5 4-5 7-5s5.5 1.5 7 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
