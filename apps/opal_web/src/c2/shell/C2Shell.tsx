/**
 * Repair #18 - Division C2 - the C2 SHELL (track-c2 sections 3, 9, 11).
 *
 * Renders only when the shell flag is on (theme/c2Shell.ts). The R17
 * shell is untouched and renders exactly as before when the flag is
 * absent. Navigation truth: the active dock slot is derived from the
 * shell route state - the one source - never from local tab memory.
 * Switching slots unmounts the slot being left (no cross-surface
 * bleed). Back from Graph Detail returns to the recorded origin.
 *
 * Layer discipline: the dock is in-flow in the shell root at dock
 * band; sheets and flows render only through TopLayer; Graph Detail
 * is a destination-band surface with its own header. No surface in
 * this file negotiates a private z-index.
 *
 * Integration wiring (Repair #18 wiring pass): the Center slot now
 * mounts CenterHost - the C2 opening deck as the rest surface, with
 * C1's Center session list and Center chat behind its Talk to Opal
 * entry (this shell supplies the handler, so the control renders).
 * The Chats slot mounts ChatsHost - C1's people chats list and
 * thread over the real conversations/messages APIs, plus the B3
 * circle rows. Graph Detail carries the B2 food panel (food step
 * only) and the B3 plan circle row; the YOU hub carries the B45
 * care destination. First-run ownership stays with this shell's
 * stage machine (the single owner on the shell path).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { C2Splash1 } from "../../onboarding/C2Splash1";
import { C2Splash2 } from "../../onboarding/C2Splash2";
import { TopLayer } from "../../opalUi/TopLayer";
import { OrbMark, OrbWordmark } from "../../brand/orb/OrbMark";
import { OrbLivingRings, orbAmbientStateFromFamilies } from "../../brand/orb/OrbLivingRings";
import { familyOfStatus } from "./shellData";
import { planWhenLine } from "./density";
import {
  applyC2Mode,
  readC2ModePreference,
  setC2ModePreference,
  type C2ModePreference,
} from "../../theme/c2Mode";
import {
  addSavedLogin,
  cancelOpalPlan,
  convertPlanPlaceType,
  createGraphPlan,
  createIntention,
  createTrip,
  createWorkingGoal,
  deleteIntention,
  deleteWorkingGoal,
  executeDeletion,
  getGraphLock,
  getPlanHistory,
  getShelf,
  setGraphLock,
  setGraphLockBiometric,
  setPlanPrivate,
  sharePlanLocation,
  stopPlanLocation,
  verifyGraphLock,
  linkGoalPlan,
  listIntentions,
  listWorkingGoals,
  promoteSpark,
  unlinkGoalPlan,
  forgetCapsule,
  forgetMemoryFact,
  journeyAddPeople,
  listConversations,
  listPeople,
  listRelationships,
  loadProfile,
  createMemoryCapsule,
  isProductInviteCode,
  opalPlanCancelError,
  planConversionLine,
  redeemPersonalInviteCode,
  storeProductInviteCode,
  removeSavedLogin,
  retryIngestionSource,
  revokeDevice,
  revokeGoogleCalendarConnection,
  startGoogleCalendarConnect,
  submitSupportReport as submitSupportReportRequest,
  updateAssistPreference,
  updateGraphingPolicy,
  updateHomeTimezone,
  updateSoul,
  updateMessagingPreferences,
  updateProfile,
  type ConversationSummary,
  type OpalPlanContract,
  type ProductSession,
  type ShelfStarterContract,
} from "../../api/productClient";
import { getDeviceCoords } from "../../device/deviceLocation";
import {
  assertVaultBiometric,
  clearVaultBiometric,
  registerVaultBiometric,
  vaultBiometricOfferable,
} from "./vaultBiometric";
import { productRealtime } from "../../realtime/RealtimeClient";
import type { PlanStateFamily } from "../../theme/planStateColors";
import "./c2shell.css";
import type { Adopt1Projection, C2Route, GraphDetailProjection } from "./projections";
import {
  buildSettingsSection,
  detailFromPlan,
  detailWithHistory,
  graphListFromPlans,
  homeFromSession,
  loadPlansResult,
  openingFromPlans,
  shellFromSession,
  youHubFromSession,
  getGoogleCalendarStatusSafe,
} from "./shellDataBridge";
import { C2Home } from "./C2Home";
import { C2Graphs, C2GraphDetail } from "./C2Graphs";
import { C2YouHub, C2SettingsSection, HUB_GROUPS } from "./C2You";
import { LibraryDestination, MomentsArchive } from "./adopt3";
import { C2Onboarding } from "./C2Onboarding";
import {
  CenterHost,
  ChatsHost,
  peopleUniverse,
  type CenterOpenRequest,
  type PickerPerson,
  type RelRow,
  CheckinSummarySheet,
  conversationPreviewLabel,
} from "./C1ShellHosts";
import { tieLabel } from "../../opalUi/relationshipTypes";
import { routeForPlanEtiquette } from "../../opalUi/c1/noticeRouting";
import {
  Avatar,
  EmptyBlock,
  IconChats,
  IconClose,
  IconGraphs,
  IconHome,
  IconPerson,
} from "./bits";

type Stage = "splash1" | "splash2" | "onboarding" | "member";

export function C2Shell() {
  const [session, setSession] = useState<ProductSession | null>(() => loadProfile());
  const [stage, setStage] = useState<Stage>(() =>
    loadProfile()?.access_token ? "member" : "splash1",
  );
  const [route, setRoute] = useState<C2Route>("center");
  const [modePref, setModePref] = useState<C2ModePreference>(() => readC2ModePreference());
  const [plans, setPlans] = useState<OpalPlanContract[]>([]);
  const [detail, setDetail] = useState<GraphDetailProjection | null>(null);
  const [detailOrigin, setDetailOrigin] = useState<C2Route>("graphs");
  // Repair #20 (F-15) - the settled plan whose repeat flow is open.
  const [repeatDetail, setRepeatDetail] = useState<GraphDetailProjection | null>(null);
  const [settingKey, setSettingKey] = useState<string | null>(null);
  const [createKind, setCreateKind] = useState<null | "plan" | "trip" | "idea">(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatOpenRequest, setChatOpenRequest] = useState<{ conversationId: string; nonce: number; orbit?: boolean } | null>(null);
  // Repair #19 — a thread doorway / orbit-sheet request to land in a
  // scoped Opal conversation (the Center host consumes it by nonce).
  const [opalOpenRequest, setOpalOpenRequest] = useState<CenterOpenRequest | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [homeNonce, setHomeNonce] = useState(0);
  // R19 W27 (AT-05 / AR-F3): the dock echo - set by a remote plan
  // crossing that lands while the user is NOT on Center (the reveal
  // surface); cleared on first view of Center. `key` remounts the
  // disc so the one-shot bloom replays per event.
  const [dockEcho, setDockEcho] = useState<{ family: PlanStateFamily; key: number } | null>(null);
  const routeRef = useRef(route);
  useEffect(() => {
    routeRef.current = route;
    if (route === "center") setDockEcho(null);
  }, [route]);
  // P9 (founder polish wave) - the external invite landing: a
  // no-Opal recipient arrives through the personal invite share
  // URL ({origin}/?invite=CODE). The served shell previously never
  // read that parameter, so the code was silently dropped and the
  // connection never happened from the link. The machinery after
  // this point already exists: verifyChallenge reads the stored
  // code and sends it with activation, and the server joins the
  // pair. This effect only captures - it validates nothing, joins
  // nothing, and paints nothing. Non-product tokens (social share
  // tokens) are not product codes and are left alone.
  useEffect(() => {
    try {
      const token = new URLSearchParams(window.location.search).get("invite");
      if (token && isProductInviteCode(token)) storeProductInviteCode(token);
    } catch {
      /* no URL to read - nothing to capture */
    }
  }, []);
  const [summarySweepId, setSummarySweepId] = useState<string | null>(null);
  const bearer = session?.access_token;

  const [plansError, setPlansError] = useState<string | null>(null);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  // Adoption wave 1 - intentions / goals / shelf, plus the starter
  // prefill for the create flow.
  const [adopt1Data, setAdopt1Data] = useState<Omit<Adopt1Projection, "people"> | null>(null);
  const [createPrefill, setCreatePrefill] = useState<{
    title: string;
    participantUserIds: string[];
  } | null>(null);

  const refreshPlans = useCallback(async () => {
    // Hunt-fix B-12: a failed load is state, not an empty list.
    const res = await loadPlansResult(bearer);
    setPlans(res.plans);
    setPlansError(res.error);
  }, [bearer]);

  /** "Drop it" - the real plan cancel (POST /opal/plans/:id/cancel).
   *  On success the plans are re-read from the server: the list
   *  excludes cancelled plans, so the dropped plan leaves every
   *  projection because the server's truth says so - it is never just
   *  hidden locally. An open detail for the dropped plan closes for
   *  the same reason. On failure nothing changes on screen; the
   *  caller (the confirm sheet) shows the one plain error line this
   *  resolves with. */
  const dropPlan = useCallback(
    async (cardId: string): Promise<string | null> => {
      try {
        await cancelOpalPlan(cardId, bearer);
      } catch (err) {
        return opalPlanCancelError(err);
      }
      await refreshPlans();
      setDetail((current) => (current && current.id === cardId ? null : current));
      return null;
    },
    [bearer, refreshPlans],
  );

  /** Adoption wave 1 - re-read the graph/people cluster projections.
   *  A failed read leaves the sections absent, never painted. */
  const refreshAdopt1 = useCallback(async () => {
    try {
      const [intentions, goals, shelf] = await Promise.all([
        listIntentions(bearer),
        listWorkingGoals(bearer),
        getShelf(bearer),
      ]);
      setAdopt1Data({
        intentions: intentions.intentions ?? [],
        goals: goals.goals ?? [],
        shelf: shelf ?? { sparks: [], starters: [] },
      });
    } catch {
      setAdopt1Data(null);
    }
  }, [bearer]);

  /** Repair #19 W24 (DL-06) — the viewer's ties by person id, for
   *  the graph detail roster. Read from the ONE relationships index;
   *  a failed read leaves the roster without ties (honest absence). */
  const [relTieById, setRelTieById] = useState<ReadonlyMap<string, string | null>>(
    new Map(),
  );
  const refreshRelTies = useCallback(async () => {
    try {
      const res = await listRelationships(bearer);
      setRelTieById(
        new Map(
          (res.relationships ?? []).map((r) => [
            r.contact_user_id,
            tieLabel(r.type, r.family_subtype),
          ]),
        ),
      );
    } catch {
      /* absence is honest; ties simply do not render */
    }
  }, [bearer]);

  useEffect(() => {
    if (stage === "member") void refreshRelTies();
  }, [stage, refreshRelTies, homeNonce]);

  const refreshConversations = useCallback(async () => {
    try {
      const res = await listConversations(bearer);
      setConversations(res.conversations ?? []);
      setConversationsError(null);
    } catch {
      // Hunt-fix B-12: failure paints as failure, not an empty people list.
      setConversationsError("Your chats did not load. Check your connection and try again.");
    }
  }, [bearer]);

  // R19 W7 - the Private area's lock state (whether a passcode
  // exists) is read once per session; the code itself is never held.
  const [graphLockSet, setGraphLockSet] = useState<boolean | null>(null);
  // R20 F-4: the same ONE projection also carries the account's
  // biometric preference; the gate offers biometric unlock only
  // when the preference is on AND this device registered a
  // credential AND the platform authenticator is available here.
  const [graphLockBiometric, setGraphLockBiometric] = useState<boolean | null>(null);
  const [vaultBioOfferable, setVaultBioOfferable] = useState(false);
  const refreshGraphLock = useCallback(async () => {
    try {
      const res = await getGraphLock(bearer);
      setGraphLockSet(res.passcode_set === true);
      setGraphLockBiometric(res.biometric_enabled === true);
    } catch {
      setGraphLockSet(null);
      setGraphLockBiometric(null);
    }
  }, [bearer]);

  useEffect(() => {
    let live = true;
    void vaultBiometricOfferable(graphLockBiometric === true).then((ok) => {
      if (live) setVaultBioOfferable(ok);
    });
    return () => {
      live = false;
    };
  }, [graphLockBiometric]);

  useEffect(() => {
    if (stage === "member") {
      void refreshPlans();
      void refreshConversations();
      void refreshAdopt1();
      void refreshGraphLock();
    }
  }, [stage, bearer, refreshPlans, refreshConversations, refreshAdopt1, refreshGraphLock, homeNonce]);

  // R20 F-4: the credential home lives in You; the gate lives in
  // Graphs. Re-read ONLY the lock projection on navigation so a PIN
  // or biometric change made in Settings is the gate's truth the
  // moment the user arrives - never a session-stale copy.
  useEffect(() => {
    if (stage === "member" && (route === "graphs" || route === "you")) {
      void refreshGraphLock();
    }
  }, [stage, route, refreshGraphLock]);

  // R19 W27 (AT-03): LIVE REPAINT on a remote state crossing. The
  // shell starts the product realtime socket for the member stage
  // (the legacy OpalApp tree was the only starter; the C2 shell
  // never subscribed) and re-reads its plan/Home projections when
  // the socket reports a crossing: `inbox:plan` (conversation plan
  // fanout), `inbox:attention` (attention invalidation), and the
  // new `inbox:plan_state` (owner-scoped plan events, forwarded by
  // the user channel from SocialFlow.broadcast_plan). No polling:
  // the repaint is event-driven, and the re-read is the server's
  // canonical projection, never a local edit.
  // AT-05 rides the same event: a plan_state crossing with a real
  // state family, arriving while the user is off Center, sets the
  // dock echo tint in that family (decays on first Center view).
  useEffect(() => {
    if (stage !== "member" || !bearer || !session?.user_id) return;
    void productRealtime.start(bearer, { userId: session.user_id }).catch(() => {
      /* offline: projections keep their navigation-driven refresh */
    });
    const repaint = () => {
      void refreshPlans();
      void refreshConversations();
      setHomeNonce((n) => n + 1);
    };
    const offPlan = productRealtime.onInboxPlan(repaint);
    const offAttention = productRealtime.onInboxAttention(repaint);
    const offState = productRealtime.onPlanState((ev) => {
      repaint();
      if (ev.family && ev.family !== "past" && routeRef.current !== "center") {
        setDockEcho({ family: ev.family, key: Date.now() });
      }
    });
    return () => {
      offPlan();
      offAttention();
      offState();
    };
  }, [stage, bearer, session?.user_id, refreshPlans, refreshConversations]);

  /** R19 W7 - re-read the open detail's Who/History from the ONE
   *  plan-history projection (after a location share changes it). */
  const refreshDetailHistory = useCallback(
    async (cardId: string) => {
      try {
        const history = await getPlanHistory(cardId, bearer);
        setDetail((current) =>
          current && current.id === cardId
            ? detailWithHistory(current, history, relTieById)
            : current,
        );
      } catch {
        // The previous projection stands; absence is never painted.
      }
    },
    [bearer, relTieById],
  );

  /** R19 W7 - private graphs + living-detail handlers. Every one
   *  runs the real API, then re-reads the server's truth. */
  const r19Events = useMemo(
    () => ({
      setPlanPrivate: async (cardId: string, isPrivate: boolean) => {
        await setPlanPrivate(cardId, isPrivate, bearer);
        await refreshPlans();
        setDetail((current) =>
          current && current.id === cardId ? { ...current, isPrivate } : current,
        );
      },
      graphLockPasscodeSet: graphLockSet,
      unlockPrivate: async (code: string): Promise<boolean> => {
        try {
          const res = await verifyGraphLock(code, bearer);
          return res.unlocked === true;
        } catch {
          return false;
        }
      },
      // R20 F-4: the gate unlocks; it never sets. PIN set/change is
      // homed in Settings (YouRoute's setVaultPasscode below).
      biometricUnlockAvailable: vaultBioOfferable,
      unlockWithBiometric: async (): Promise<boolean> => assertVaultBiometric(),
      openVaultSettings: () => {
        setRoute("you");
        setSettingKey("private-graphs");
      },
      shareMyLocation: async (cardId: string): Promise<string> => {
        const coords = await getDeviceCoords();
        if (!coords) {
          return "Location is not available here - permission was not given, or this device has no fix.";
        }
        try {
          await sharePlanLocation(cardId, { lat: coords.lat, lon: coords.lng }, bearer);
        } catch {
          return "Sharing did not start. Try again.";
        }
        await refreshDetailHistory(cardId);
        // JA-09 honesty: the share is ONE fix (getDeviceCoords —
        // no position watch exists anywhere in the web source),
        // posted once. The record itself lives until the user
        // stops it or its real 4-hour expiry passes
        // (PlanLocationShare @share_window_seconds) — the copy
        // says exactly that, never implying the position follows
        // the user for 4 hours.
        return "You shared where you are now for this plan. It's a one-time snapshot, not live tracking — it stays shared until you stop it or 4 hours pass.";
      },
      stopMyLocation: async (cardId: string): Promise<string> => {
        try {
          await stopPlanLocation(cardId, bearer);
        } catch {
          return "Stopping sharing did not work. Try again.";
        }
        await refreshDetailHistory(cardId);
        return "You stopped sharing your location for this plan.";
      },
    }),
    [bearer, refreshPlans, refreshDetailHistory, graphLockSet, vaultBioOfferable],
  );

  const shell = useMemo(() => shellFromSession(session, route), [session, route]);
  const graphList = useMemo(() => {
    const peopleById = new Map<string, string>();
    for (const conversation of conversations) {
      for (const peer of conversation.peers ?? []) {
        if (peer.id && peer.display_name) peopleById.set(peer.id, peer.display_name);
      }
    }
    const adopt1: Adopt1Projection | null = adopt1Data
      ? {
          ...adopt1Data,
          people: Array.from(peopleById, ([id, name]) => ({ id, name })),
        }
      : null;
    // ST-B: the Someday group becomes the shelf - spark plans render
    // on the shelf section (with starters and promote), not as cards
    // in the plan groups. The promoted plan is a different plan and
    // keeps its card.
    const sparkIds = new Set((adopt1Data?.shelf.sparks ?? []).map((s) => s.id));
    const listPlans =
      sparkIds.size > 0 ? plans.filter((p) => !sparkIds.has(p.id)) : plans;
    return { ...graphListFromPlans(listPlans), listError: plansError, adopt1 };
  }, [plans, plansError, adopt1Data, conversations]);
  const opening = useMemo(
    // R19 W7: private graphs stay out of the Center deck too - the
    // gated Private area on Graphs is their only list home.
    () => openingFromPlans(plans.filter((p) => p.is_private !== true), session?.display_name ?? ""),
    [plans, session],
  );

  // R19 W27 (AT-06): the dock orb's ambient rings are state-keyed -
  // they carry the strongest live state family from the SAME plan
  // projection the surfaces render, and rest when nothing is live.
  const dockLiveState = useMemo(
    // Polish C P3: a private graph contributes nothing outside the
    // vault - not even its state family to the dock orb's ambience.
    () =>
      orbAmbientStateFromFamilies(
        plans.filter((p) => p.is_private !== true).map((p) => familyOfStatus(p.status)),
      ),
    [plans],
  );

  const openGraph = useCallback(
    (cardId: string, origin: C2Route) => {
      const plan = plans.find((p) => p.id === cardId);
      if (!plan) return;
      setDetailOrigin(origin);
      setDetail(detailFromPlan(plan, origin, session?.user_id));
      // ST-G - the detail's Who and History come from the ONE plan
      // history projection; until it lands (or if it fails) the
      // sections stay honestly empty rather than guessed.
      void (async () => {
        try {
          const history = await getPlanHistory(cardId, bearer);
          setDetail((current) =>
            current && current.id === cardId
              ? detailWithHistory(current, history, relTieById)
              : current,
          );
        } catch {
          // History stays absent - the plan itself already rendered.
        }
      })();
    },
    [plans, session, bearer, relTieById],
  );

  /** Repair #19 W24 (DL-07) — "Add people" was wired to undefined
   *  (a dead control at the plan-invite moment). It now opens a
   *  picker over the ONE people universe and runs the real
   *  participant add (POST /journeys/:id/add-people via
   *  journeyAddPeople — PlanParticipant rows, lead-gated server
   *  side). People already on the plan are not offered. A refusal
   *  (not the lead) stays in the sheet as a plain line; a success
   *  re-reads the detail history + plans from the server. */
  const [addPeoplePlanId, setAddPeoplePlanId] = useState<string | null>(null);
  const [addPeopleList, setAddPeopleList] = useState<PickerPerson[]>([]);
  const [addPeopleError, setAddPeopleError] = useState<string | null>(null);
  const [addPeopleBusy, setAddPeopleBusy] = useState(false);
  const openAddPeople = useCallback(
    async (cardId: string) => {
      setAddPeoplePlanId(cardId);
      setAddPeopleError(null);
      setAddPeopleList([]);
      let contacts: Array<{
        contact_user_id: string;
        display_name?: string | null;
        type?: string | null;
        family_subtype?: string | null;
      }> = [];
      let rows: RelRow[] = [];
      try {
        const res = await listRelationships(bearer);
        contacts = res.contacts ?? [];
        rows = (res.relationships ?? []).map((r) => ({
          contact_user_id: r.contact_user_id,
          type: typeof r.type === "string" ? r.type : "",
          family_subtype: r.family_subtype ?? null,
          family_minor: r.family_minor === true,
          age_band: r.age_band ?? null,
        }));
      } catch {
        /* conversations alone still populate the picker */
      }
      const onPlan = new Set(
        (detail && detail.id === cardId ? detail.who : [])
          .map((w) => w.userId)
          .filter((id): id is string => Boolean(id)),
      );
      setAddPeopleList(
        peopleUniverse({ conversations, contacts, relRows: rows }).filter(
          (person) => !onPlan.has(person.personId),
        ),
      );
    },
    [bearer, conversations, detail],
  );
  const addPersonToPlan = useCallback(
    async (person: PickerPerson) => {
      if (!addPeoplePlanId || addPeopleBusy) return;
      setAddPeopleBusy(true);
      setAddPeopleError(null);
      try {
        await journeyAddPeople(addPeoplePlanId, [person.personId], bearer);
        const planId = addPeoplePlanId;
        setAddPeoplePlanId(null);
        await refreshDetailHistory(planId);
        void refreshPlans();
      } catch {
        setAddPeopleError(
          "That person could not be added. Only the plan's lead can add people.",
        );
      } finally {
        setAddPeopleBusy(false);
      }
    },
    [addPeoplePlanId, addPeopleBusy, bearer, refreshDetailHistory, refreshPlans],
  );

  /** Adoption wave 1 - Graphs section handlers. Each runs the real
   *  API, then re-reads the server's projections before rendering. */
  const adopt1Events = useMemo(
    () => ({
      createIntention: async (input: {
        subjectUserId: string;
        title: string;
        cadenceDays?: number;
      }) => {
        await createIntention(
          {
            subject_user_id: input.subjectUserId,
            title: input.title,
            cadence_days: input.cadenceDays,
          },
          bearer,
        );
        await refreshAdopt1();
      },
      deleteIntention: async (intentionId: string) => {
        await deleteIntention(intentionId, bearer);
        await refreshAdopt1();
      },
      createGoal: async (title: string) => {
        await createWorkingGoal(title, bearer);
        await refreshAdopt1();
      },
      deleteGoal: async (goalId: string) => {
        await deleteWorkingGoal(goalId, bearer);
        await refreshAdopt1();
      },
      linkGoalPlan: async (goalId: string, planId: string) => {
        await linkGoalPlan(goalId, planId, bearer);
        // Read-back: the goal list (and its derived status line) is
        // re-read from the server before anything re-renders.
        await refreshAdopt1();
      },
      unlinkGoalPlan: async (goalId: string, planId: string) => {
        await unlinkGoalPlan(goalId, planId, bearer);
        await refreshAdopt1();
      },
      promoteSpark: async (sparkId: string) => {
        await promoteSpark(sparkId, {}, bearer);
        await refreshPlans();
        await refreshAdopt1();
      },
      startStarter: (starterId: string) => {
        const starter: ShelfStarterContract | undefined = adopt1Data?.shelf.starters.find(
          (s) => s.id === starterId,
        );
        if (!starter) return;
        // The create flow opens pre-filled from the starter's own
        // prefill - nothing is created or sent until the user saves.
        setCreatePrefill({
          title: starter.prefill.title,
          participantUserIds: starter.prefill.participant_user_ids ?? [],
        });
        setCreateKind("plan");
      },
    }),
    [bearer, refreshAdopt1, refreshPlans, adopt1Data],
  );

  /** After a food action, re-read the plans and re-render the open
   *  detail from the RETURNED plan - never from a local edit. */
  const refreshDetailFromServer = useCallback(async () => {
    const res = await loadPlansResult(bearer);
    const fresh = res.plans;
    setPlans(fresh);
    setPlansError(res.error);
    if (detail) {
      const plan = fresh.find((p) => p.id === detail.id);
      if (plan) setDetail(detailFromPlan(plan, detailOrigin, session?.user_id));
    }
  }, [bearer, detail, detailOrigin, session]);

  /** Hunt-fix B-15: plan conversion through the B1 endpoint. The
   *  returned line says what actually happened — applied now, or
   *  proposed to the group — and a success re-reads the server's
   *  truth before the detail re-renders. */
  const convertPlan = useCallback(
    async (cardId: string): Promise<string> => {
      try {
        const res = await convertPlanPlaceType(cardId, "virtual", { bearer });
        const line = planConversionLine(res);
        if (res.applied) await refreshDetailFromServer();
        return line;
      } catch (err) {
        return planConversionLine(null, err);
      }
    },
    [bearer, refreshDetailFromServer],
  );

  const goRoute = (next: C2Route) => {
    setDetail(null);
    setSettingKey(null);
    if (next === route && next !== "center") {
      // Retapping the active slot scrolls its surface to top (s9).
      document
        .querySelector(`[data-testid="c2-route-${next}"] .c2s-scroll`)
        ?.scrollTo({ top: 0 });
    }
    setRoute(next);
  };

  const setMode = (pref: C2ModePreference) => {
    const { preference } = setC2ModePreference(pref);
    setModePref(preference);
  };

  if (stage === "splash1") {
    return (
      <div className="c2s-root" data-shell="c2">
        <C2Splash1
          onContinue={() => setStage("splash2")}
          onAlreadyAccount={() => setStage("onboarding")}
        />
        <DevChip hidden={false} />
      </div>
    );
  }
  if (stage === "splash2") {
    return (
      <div className="c2s-root" data-shell="c2">
        <C2Splash2
          onEnter={() => setStage("onboarding")}
          onAlreadyAccount={() => setStage("onboarding")}
        />
        <DevChip hidden={false} />
      </div>
    );
  }
  if (stage === "onboarding") {
    return (
      <div className="c2s-root" data-shell="c2">
        <div className="c2s-column">
          <C2Onboarding
            events={{
              complete: () => {
                setSession(loadProfile());
                // The contract: onboarding lands on Center (s6).
                setRoute("center");
                setStage("member");
              },
              backToSplash: () => setStage("splash1"),
            }}
          />
        </div>
        <DevChip hidden={false} />
      </div>
    );
  }

  return (
    <div className="c2s-root" data-shell="c2" data-testid="c2-shell">
      {/* HA-A wide sidebar (harmony2): at wide geometry the five
       * destinations become a persistent left sidebar in the dock's
       * order (Home, Chats, Opal, Graphs, You) - the same surfaces,
       * the same projections, the same handlers; the sidebar is
       * chrome, never a second app. It carries no state hues (the
       * dock law it inherits); the active row is the sampled accent
       * at quiet strength. On phone it does not render visibly and
       * the dock remains the navigation. */}
      <aside className="c2s-sidebar" data-testid="c2-sidebar" aria-label="Main">
        <div className="c2s-sidebar-brand">
          <OrbWordmark width={76} variant="gradient" />
        </div>
        <SideSlot label="Home" active={route === "home"} testId="c2-side-home" onClick={() => goRoute("home")}>
          <IconHome />
        </SideSlot>
        <SideSlot label="Chats" active={route === "chats"} testId="c2-side-chats" badge={shell.dockUnread} onClick={() => goRoute("chats")}>
          <IconChats />
        </SideSlot>
        <SideSlot label="Opal" active={route === "center"} testId="c2-side-center" onClick={() => goRoute("center")}>
          <OrbMark size={22} />
        </SideSlot>
        <SideSlot label="Graphs" active={route === "graphs"} testId="c2-side-graphs" onClick={() => goRoute("graphs")}>
          <IconGraphs />
        </SideSlot>
        <SideSlot label="You" active={route === "you"} testId="c2-side-you" onClick={() => goRoute("you")}>
          {session ? <Avatar avatar={shell.ownAvatar} size={22} /> : <IconPerson />}
        </SideSlot>
      </aside>
      <div className="c2s-column">
        <main style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {route === "home" ? (
            <div data-testid="c2-route-home" style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
              <HomeRoute
                key={homeNonce}
                session={session}
                bearer={bearer}
                onOpenYou={() => goRoute("you")}
                onOpenGraph={(id) => openGraph(id, "home")}
                onSearch={() => setSearchOpen(true)}
                onActivity={() => setActivityOpen(true)}
                onShared={() => setHomeNonce((n) => n + 1)}
              />
            </div>
          ) : null}

          {route === "chats" ? (
            <div data-testid="c2-route-chats" style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
              {conversationsError ? (
                <div className="c2s-scroll">
                  <EmptyBlock
                    testId="c2-chats-error"
                    headline="Your chats did not load."
                    line={conversationsError}
                    actionLabel="Try again"
                    onAction={() => void refreshConversations()}
                  />
                </div>
              ) : (
              <ChatsHost
                bearer={bearer}
                viewerUserId={session?.user_id}
                conversations={conversations}
                onConversationsChanged={() => void refreshConversations()}
                openRequest={chatOpenRequest}
                onOpenMemoryControls={() => {
                  goRoute("you");
                  setSettingKey("what-opal-remembers");
                }}
                onTalkToOpal={(request) => {
                  setOpalOpenRequest({ request, nonce: Date.now() });
                  goRoute("center");
                }}
              />
              )}
            </div>
          ) : null}

          {route === "center" ? (
            <div data-testid="c2-route-center" style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
              {plansError ? (
                <div className="c2s-scroll">
                  <EmptyBlock
                    testId="c2-center-error"
                    headline="Your plans did not load."
                    line={plansError}
                    actionLabel="Try again"
                    onAction={() => void refreshPlans()}
                  />
                </div>
              ) : (
              <CenterHost
                bearer={bearer}
                openRequest={opalOpenRequest}
                onOpenPersonThread={(conversationId) => {
                  setChatOpenRequest({ conversationId, nonce: Date.now() });
                  goRoute("chats");
                }}
                opening={opening}
                plans={plans}
                onOpenGraph={(id) => openGraph(id, "center")}
                onHoldingLink={(target) => {
                  // Harmony2: holding chips route to the surface the
                  // backend's links map named - graphs for the plan
                  // figures, the named Settings section for memory
                  // and connections.
                  if (target === "graphs") {
                    goRoute("graphs");
                  } else if (target === "what-opal-remembers" || target === "connections") {
                    goRoute("you");
                    setSettingKey(target);
                  }
                }}
                openingEvents={{
                  openGraph: (id) => openGraph(id, "center"),
                  makeSomethingHappen: () => setCreateKind("plan"),
                  completeSlot: (id) => openGraph(id, "center"),
                  // W8 doorway: the center character (and the dock
                  // orb that lands here) reaches Settings at the
                  // Soul room - the doorway copy is "How Opal works
                  // for you"; Memory is its own room beside it.
                  openSoulMemory: () => {
                    goRoute("you");
                    setSettingKey("soul");
                  },
                }}
              />
              )}
            </div>
          ) : null}

          {route === "graphs" ? (
            <div data-testid="c2-route-graphs" style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
              <C2Graphs
                projection={graphList}
                events={{
                  openGraph: (id) => openGraph(id, "graphs"),
                  createPlan: () => setCreateKind("plan"),
                  createTrip: () => setCreateKind("trip"),
                  createIdea: () => setCreateKind("idea"),
                  completeSlot: (id) => openGraph(id, "graphs"),
                  dropPlan,
                  runNextAction: () => undefined,
                  addPeople: (id) => void openAddPeople(id),
                  openChatForPlan: () => goRoute("chats"),
                  back: () => goRoute("center"),
                  retryLoad: () => void refreshPlans(),
                  convertPlan,
                  ...adopt1Events,
                  ...r19Events,
                }}
              />
            </div>
          ) : null}

          {route === "you" ? (
            <div data-testid="c2-route-you" className="c2s-route-you-wrap" style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
              {/* HA-A Settings sidebar (harmony2): on wide viewports
               * the hub's sections stay visible as a persistent left
               * column in the phone hub's own group order (F-GAP-7's
               * designed form); rows land on the same sections their
               * phone counterparts do. Sections that do not exist
               * stay absent here too - the rows come from the same
               * hub projection the phone hub renders. */}
              <WideYouNav
                session={session}
                activeKey={settingKey}
                onOpen={(key) => setSettingKey(key)}
              />
              <YouRoute
                session={session}
                bearer={bearer}
                settingKey={settingKey}
                setSettingKey={setSettingKey}
                modePref={modePref}
                setMode={setMode}
                onSessionChange={() => setSession(loadProfile())}
              />
            </div>
          ) : null}
        </main>

        <nav className="c2s-dock" data-testid="c2-dock" aria-label="Main">
          <DockSlot
            label="Home"
            active={route === "home"}
            onClick={() => goRoute("home")}
            testId="c2-dock-home"
          >
            <IconHome />
          </DockSlot>
          <DockSlot
            label="Chats"
            active={route === "chats"}
            onClick={() => goRoute("chats")}
            testId="c2-dock-chats"
            badge={shell.dockUnread}
          >
            <IconChats />
          </DockSlot>
          <button
            type="button"
            className="c2s-dock-center"
            data-testid="c2-dock-center"
            aria-label="Opal Center"
            onClick={() => goRoute("center")}
          >
            <span
              key={dockEcho ? `echo-${dockEcho.key}` : "dock-disc"}
              className="c2s-dock-center-disc orb-dock-device"
              data-orb="dock-device"
              data-dock-echo={dockEcho?.family}
              data-testid="c2-dock-disc"
            >
              {/* The living rings at ambient subtlety (R18 splash
               * rebuild): the SAME OrbLivingRings system as Splash 1,
               * clipped to the mark's own square inside the disc. */}
              <span className="orb-dock-mark">
                <OrbMark size={40} />
                <OrbLivingRings variant="ambient" liveState={dockLiveState} />
              </span>
            </span>
          </button>
          <DockSlot
            label="Graphs"
            active={route === "graphs"}
            onClick={() => goRoute("graphs")}
            testId="c2-dock-graphs"
          >
            <IconGraphs />
          </DockSlot>
          <DockSlot
            label="You"
            active={route === "you"}
            onClick={() => goRoute("you")}
            testId="c2-dock-you"
          >
            {session ? (
              <Avatar avatar={shell.ownAvatar} size={32} />
            ) : (
              <IconPerson />
            )}
          </DockSlot>
        </nav>
      </div>

      {detail ? (
        <C2GraphDetail
          detail={detail}
          bearer={bearer}
          onFoodChanged={() => void refreshDetailFromServer()}
          onOpenCheckinSummary={(id) => setSummarySweepId(id)}
          events={{
            openGraph: (id) => openGraph(id, detailOrigin),
            createPlan: () => setCreateKind("plan"),
            createTrip: () => setCreateKind("trip"),
            createIdea: () => setCreateKind("idea"),
            completeSlot: () => undefined,
            dropPlan,
            runNextAction: () => undefined,
            // Repair #20 (F-13): a spine task whose surface is the
            // plan-scoped Opal chat enters the SAME doorway the
            // revision / request-a-change flows use: scope person =
            // another participant on this plan (the reveal
            // derivation's own scope-person rule), plan + its
            // conversation carried from the detail's record. No
            // other participant = no doorway (the projection only
            // stamps the action when the Who rows prove one).
            openSpineTask: (d) => {
              const other = d.who.find(
                (w) => w.userId && w.userId !== session?.user_id,
              );
              if (!other?.userId) return;
              setOpalOpenRequest({
                request: {
                  context: {
                    personId: other.userId,
                    personName: other.name,
                    conversationId: d.conversationId ?? null,
                    planId: d.id,
                    planTitle: d.title,
                  },
                },
                nonce: Date.now(),
              });
              goRoute("center");
            },
            // Repair #20 (F-15): "Do that again" opens the repeat
            // flow over this settled plan's carried facts.
            repeatPlan: (d) => {
              setDetail(null);
              setRepeatDetail(d);
            },
            addPeople: (id) => void openAddPeople(id),
            retryLoad: () => void refreshPlans(),
            convertPlan,
            ...r19Events,
            openChatForPlan: () => {
              setDetail(null);
              goRoute("chats");
            },
            back: () => {
              setDetail(null);
              setRoute(detailOrigin);
            },
          }}
        />
      ) : null}

      {addPeoplePlanId ? (
        <TopLayer band="sheet">
          <div className="c2s-scrim" onClick={() => setAddPeoplePlanId(null)}>
            <div
              className="c2s-sheet"
              role="dialog"
              aria-label="Add people"
              data-testid="c2-add-people-sheet"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="c2s-sheet-title">Add people</p>
              {addPeopleError ? (
                <p className="c2s-card-line" role="alert" data-testid="c2-add-people-error">
                  {addPeopleError}
                </p>
              ) : null}
              {addPeopleList.length === 0 ? (
                <EmptyBlock
                  headline="No one to add yet."
                  line="People you talk with will show up here."
                />
              ) : (
                addPeopleList.map((person) => (
                  <button
                    key={person.personId}
                    type="button"
                    className="c2s-sheet-row"
                    data-testid="c2-add-people-row"
                    disabled={addPeopleBusy}
                    onClick={() => void addPersonToPlan(person)}
                  >
                    <span>
                      {person.name}
                      {person.tieLabel ? <small>{person.tieLabel}</small> : null}
                    </span>
                  </button>
                ))
              )}
              <button
                type="button"
                className="c2s-btn-text"
                onClick={() => setAddPeoplePlanId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </TopLayer>
      ) : null}

      {createKind ? (
        <CreateFlow
          kind={createKind}
          bearer={bearer}
          conversations={conversations}
          prefill={createPrefill ?? undefined}
          onClose={() => {
            setCreateKind(null);
            setCreatePrefill(null);
          }}
          onCreated={() => {
            setCreateKind(null);
            setCreatePrefill(null);
            void refreshPlans();
            void refreshAdopt1();
          }}
        />
      ) : null}

      {repeatDetail ? (
        <RepeatPlanFlow
          detail={repeatDetail}
          bearer={bearer}
          onClose={() => setRepeatDetail(null)}
          onCreated={(newPlanId) => {
            setRepeatDetail(null);
            void (async () => {
              const res = await loadPlansResult(bearer);
              setPlans(res.plans);
              setPlansError(res.error);
              const plan = res.plans.find((p) => p.id === newPlanId);
              if (plan) {
                setDetailOrigin("graphs");
                setDetail(detailFromPlan(plan, "graphs", session?.user_id));
              } else {
                goRoute("graphs");
              }
            })();
          }}
        />
      ) : null}

      {searchOpen ? (
        <SearchDestination
          // Polish C P3: search is outside the vault - the viewer's
          // private graphs never appear as search results.
          plans={plans.filter((p) => p.is_private !== true)}
          conversations={conversations}
          intentions={(adopt1Data?.intentions ?? []).map((intention) => ({
            id: intention.id,
            title: intention.title,
            personName: intention.subject_name,
          }))}
          onClose={() => setSearchOpen(false)}
          onOpenGraph={(id) => {
            setSearchOpen(false);
            openGraph(id, route);
          }}
          onOpenChat={(id) => {
            setSearchOpen(false);
            setChatOpenRequest({ conversationId: id, nonce: Date.now() });
            goRoute("chats");
          }}
        />
      ) : null}

      {activityOpen ? (
        <TopLayer band="flow">
          <div className="c2s-flow" style={{ background: "var(--canvas)" }} data-testid="c2-activity">
            <header className="c2s-header">
              <h1 className="c2s-header-title" style={{ flex: 1, fontSize: 20 }}>
                Activity
              </h1>
              <button
                type="button"
                className="c2s-icon-btn"
                aria-label="Close Activity"
                onClick={() => setActivityOpen(false)}
              >
                <IconClose />
              </button>
            </header>
            <div style={{ padding: "var(--space-4) var(--gutter)" }}>
              {opening.needsYou.length === 0 ? (
                <EmptyBlock headline="All quiet." line="Nothing needs you right now." />
              ) : (
                opening.needsYou.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    className="c2s-card"
                    style={{ width: "100%", textAlign: "left", cursor: "pointer", marginBottom: "var(--space-3)" }}
                    onClick={() => {
                      setActivityOpen(false);
                      // Repair #20 (F-21a): a card wearing a live
                      // etiquette fork / limbo is an orbit notice —
                      // its tap lands in the exact conversation it
                      // concerns, in that conversation's orbit.
                      // Any other card keeps its plan landing.
                      const plan = plans.find((p) => p.id === card.id);
                      const route = plan ? routeForPlanEtiquette(plan) : null;
                      if (route?.kind === "orbit") {
                        setChatOpenRequest({
                          conversationId: route.conversationId,
                          nonce: Date.now(),
                          orbit: true,
                        });
                        goRoute("chats");
                        return;
                      }
                      openGraph(card.id, "home");
                    }}
                  >
                    <p className="c2s-card-title">{card.title}</p>
                    <p className="c2s-card-line">{card.whenLine}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </TopLayer>
      ) : null}

      {summarySweepId ? (
        <CheckinSummarySheet
          sweepId={summarySweepId}
          bearer={bearer}
          onClose={() => setSummarySweepId(null)}
        />
      ) : null}

      <DevChip hidden={Boolean(detail || createKind || searchOpen || activityOpen)} />
    </div>
  );
}

/** HA-A (harmony2): one wide-sidebar destination row. Same order,
 * same handlers as the dock; quiet by the dock law (no state hues,
 * the active row is the sampled accent at quiet strength). */
function SideSlot({
  label,
  active,
  onClick,
  testId,
  badge,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  testId: string;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`c2s-side-slot${active ? " is-active" : ""}`}
      data-testid={testId}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
    >
      <span className="c2s-side-glyph">{children}</span>
      <span className="c2s-side-label">{label}</span>
      {badge ? (
        <span className="c2s-badge" style={{ position: "static" }}>
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </button>
  );
}

/** HA-A (harmony2): the Settings wide sidebar - the hub's grouped
 * sections, persistent beside the open section on wide viewports.
 * Rows derive from the same hub projection the phone hub renders
 * (google status read as not-yet-known here; the section surfaces
 * themselves carry the live status, the nav is chrome). */
function WideYouNav({
  session,
  activeKey,
  onOpen,
}: {
  session: ProductSession | null;
  activeKey: string | null;
  onOpen: (key: string | null) => void;
}) {
  const hub = useMemo(() => youHubFromSession(session, null), [session]);
  const byKey = useMemo(() => {
    const map = new Map<string, (typeof hub.index)[number]>();
    for (const row of hub.index) map.set(row.key, row);
    return map;
  }, [hub]);
  return (
    <nav className="c2s-you-nav" data-testid="c2-you-nav" aria-label="Settings">
      <button
        type="button"
        className={`c2s-you-nav-row${activeKey === null ? " is-active" : ""}`}
        data-testid="c2-you-nav-hub"
        onClick={() => onOpen(null)}
      >
        All settings
      </button>
      {HUB_GROUPS.map((group) => {
        const rows = group.keys
          .map((key) => byKey.get(key))
          .filter((r): r is NonNullable<typeof r> => Boolean(r));
        if (rows.length === 0) return null;
        return (
          <div key={group.label}>
            <p className="c2s-group-label">{group.label}</p>
            {rows.map((row) => (
              <button
                key={row.key}
                type="button"
                className={`c2s-you-nav-row${activeKey === row.key ? " is-active" : ""}`}
                data-testid={`c2-you-nav-row-${row.key}`}
                onClick={() => onOpen(row.key)}
              >
                {row.title}
              </button>
            ))}
          </div>
        );
      })}
    </nav>
  );
}

function DockSlot({
  label,
  active,
  onClick,
  testId,
  badge,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  testId: string;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="c2s-dock-slot"
      data-active={active ? "1" : undefined}
      data-testid={testId}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
    >
      <span className="c2s-dock-glyph">{children}</span>
      <span>{label}</span>
      {badge ? (
        <span className="c2s-dock-badge">{badge > 99 ? "99+" : badge}</span>
      ) : null}
    </button>
  );
}

/** Section 11 dev seed chip: system band, pointer-events none, hides
 *  whenever a flow or stage covers the shell. Only rendered when the
 *  dev/seed flags are on the URL, exactly as today. */
function DevChip({ hidden }: { hidden: boolean }) {
  const [info, setInfo] = useState<string | null>(null);
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const dev = q.get("opal_dev") === "1" || q.has("opal_founder_seed") || q.has("seed");
      if (!dev) return;
      const sha =
        document.documentElement.getAttribute("data-git-head") ?? "unknown";
      setInfo(sha);
    } catch {
      setInfo(null);
    }
  }, []);
  if (!info || hidden) return null;
  return (
    <div className="c2s-dev-chip" data-testid="c2-dev-chip" aria-hidden>
      seed - <span className="c2s-sha">{info}</span>
    </div>
  );
}

function HomeRoute(props: {
  session: ProductSession | null;
  bearer?: string;
  onOpenYou: () => void;
  onOpenGraph: (id: string) => void;
  onSearch: () => void;
  onActivity: () => void;
  onShared: () => void;
}) {
  const [projection, setProjection] = useState<Awaited<ReturnType<typeof homeFromSession>> | null>(null);
  useEffect(() => {
    let live = true;
    void homeFromSession(props.session, props.bearer).then((p) => {
      if (live) setProjection(p);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!projection) {
    return (
      <div className="c2s-scroll">
        <EmptyBlock headline="Loading your people." line="One moment." />
      </div>
    );
  }
  return (
    <C2Home
      projection={projection}
      events={{
        openYou: props.onOpenYou,
        openSearch: props.onSearch,
        openActivity: props.onActivity,
        openGraph: props.onOpenGraph,
        // JA-06: no feedAction is wired — there is no live viewer
        // yet (J2 named exception), so C2Home renders no action
        // button on feed cards instead of a dead one.
        onShared: props.onShared,
        bearer: props.bearer,
      }}
    />
  );
}

function YouRoute(props: {
  session: ProductSession | null;
  bearer?: string;
  settingKey: string | null;
  setSettingKey: (key: string | null) => void;
  modePref: C2ModePreference;
  setMode: (pref: C2ModePreference) => void;
  onSessionChange: () => void;
}) {
  const [googleConnected, setGoogleConnected] = useState<boolean | "simulated" | null>(null);
  const [section, setSection] = useState<Awaited<ReturnType<typeof buildSettingsSection>> | null>(null);
  const [sectionNonce, setSectionNonce] = useState(0);
  // Hunt-fix B-14: forgetting is confirm-then-forget (the legacy
  // two-step pattern), and every runAction failure lands on an error
  // line — a failed forget used to be indistinguishable from success.
  const [pendingForgetId, setPendingForgetId] = useState<string | null>(null);
  // SM: a capsule forget arms the same confirmation, but confirms
  // through the wallet capsule path (truly deletes, both stores).
  const [pendingForgetCapsuleId, setPendingForgetCapsuleId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [forgetBusy, setForgetBusy] = useState(false);

  const confirmForget = async () => {
    if ((!pendingForgetId && !pendingForgetCapsuleId) || forgetBusy) return;
    setForgetBusy(true);
    try {
      if (pendingForgetCapsuleId) {
        await forgetCapsule(pendingForgetCapsuleId, props.bearer);
        setPendingForgetCapsuleId(null);
      } else if (pendingForgetId) {
        await forgetMemoryFact(pendingForgetId, props.bearer);
        setPendingForgetId(null);
      }
      setActionError(null);
      setSectionNonce((n) => n + 1);
    } catch {
      setActionError("That could not be forgotten. Check your connection and try again.");
    } finally {
      setForgetBusy(false);
    }
  };

  useEffect(() => {
    void getGoogleCalendarStatusSafe(props.bearer).then(setGoogleConnected);
  }, [props.bearer]);

  useEffect(() => {
    if (
      !props.settingKey ||
      props.settingKey === "your-moments" ||
      props.settingKey === "your-library"
    ) {
      setSection(null);
      return;
    }
    let live = true;
    void buildSettingsSection(props.settingKey, {
      session: props.session,
      bearer: props.bearer,
    }).then((s) => {
      if (live) setSection(s);
    });
    return () => {
      live = false;
    };
  }, [props.settingKey, props.session, props.bearer, sectionNonce]);

  const hub = useMemo(
    () => youHubFromSession(props.session, googleConnected),
    [props.session, googleConnected],
  );

  const events = {
    editProfile: () => props.setSettingKey("edit-profile"),
    openSection: (key: string) => props.setSettingKey(key),
    backToHub: () => props.setSettingKey(null),
    modePreference: props.modePref,
    setModePreference: props.setMode,
    setPreference: async (sectionKey: string, rowId: string, value: boolean) => {
      if (sectionKey === "notifications" && rowId === "pause-everything") {
        // Audit A2 — the Quiet master switch writes its own real flag;
        // the per-kind values stay untouched, so unpausing restores
        // them exactly.
        await updateMessagingPreferences(
          { notifications_paused: value },
          props.bearer,
        );
      } else if (sectionKey === "notifications" && rowId === "messages-calls") {
        await updateMessagingPreferences(
          { message_notifications_enabled: value },
          props.bearer,
        );
      } else if (sectionKey === "notifications" && rowId === "read-receipts") {
        await updateMessagingPreferences({ read_receipts_enabled: value }, props.bearer);
      } else if (
        (sectionKey === "calls-assist" || sectionKey === "how-opal-helps") &&
        rowId === "assist"
      ) {
        await updateAssistPreference(value, props.bearer);
      } else {
        throw new Error(`No real preference behind ${sectionKey}/${rowId}`);
      }
      // Re-render ONLY from the refreshed projection (toggle truth).
      setSectionNonce((n) => n + 1);
    },
    runAction: (sectionKey: string, rowId: string) => {
      const fail = () =>
        setActionError("That didn't go through. Check your connection and try again.");
      if (sectionKey === "location-travel" && rowId === "use-device-timezone") {
        void updateHomeTimezone(
          Intl.DateTimeFormat().resolvedOptions().timeZone,
          props.bearer,
        )
          .then(() => {
            setActionError(null);
            setSectionNonce((n) => n + 1);
          })
          .catch(fail);
      } else if (
        (sectionKey === "connected-sources" || sectionKey === "connections") &&
        rowId === "google-connect"
      ) {
        void startGoogleCalendarConnect(props.bearer)
          .then((res) => {
            if (res.authorize_url) {
              window.location.href = res.authorize_url;
            } else {
              setActionError("Google did not send a sign-in link. Try again in a moment.");
            }
          })
          .catch(fail);
      } else if (
        (sectionKey === "connected-sources" || sectionKey === "connections") &&
        rowId === "google-disconnect"
      ) {
        void revokeGoogleCalendarConnection(props.bearer)
          .then(() => {
            setActionError(null);
            setSectionNonce((n) => n + 1);
          })
          .catch(fail);
      } else if (
        sectionKey === "privacy" &&
        (rowId === "privacy-policy" || rowId === "terms-of-service")
      ) {
        // Audit A8 — the rows open Opal's own published documents,
        // shipped in the app bundle.
        window.open(
          rowId === "privacy-policy" ? "/privacy.html" : "/terms.html",
          "_blank",
          "noopener",
        );
      } else if (sectionKey === "what-opal-remembers" && rowId.startsWith("forget-")) {
        // First tap only arms the confirmation — nothing is forgotten yet.
        setActionError(null);
        setPendingForgetId(rowId.slice("forget-".length));
      } else if (
        (sectionKey === "memory" ||
          sectionKey === "soul" ||
          sectionKey === "soul-memory") &&
        rowId.startsWith("forget-capsule-")
      ) {
        // SM/W8: first tap only arms the same confirmation - the
        // capsule is forgotten (truly deleted) only on confirm.
        setActionError(null);
        setPendingForgetCapsuleId(rowId.slice("forget-capsule-".length));
      } else if (sectionKey === "linked-devices" && rowId.startsWith("revoke-device-")) {
        // Spec 4.C2 — revoke kills the session server-side; the
        // refreshed projection is the read-back.
        void revokeDevice(rowId.slice("revoke-device-".length), props.bearer)
          .then(() => {
            setActionError(null);
            setSectionNonce((n) => n + 1);
          })
          .catch(fail);
      } else if (sectionKey === "saved-logins" && rowId.startsWith("remove-login-")) {
        void removeSavedLogin(rowId.slice("remove-login-".length), props.bearer)
          .then(() => {
            setActionError(null);
            setSectionNonce((n) => n + 1);
          })
          .catch(fail);
      } else if (
        (sectionKey === "what-opal-hears" || sectionKey === "connections") &&
        rowId.startsWith("hears-retry-")
      ) {
        // Spec SF-A / ER-2 — retry re-derives that one source only.
        void retryIngestionSource(rowId.slice("hears-retry-".length), props.bearer)
          .then(() => {
            setActionError(null);
            setSectionNonce((n) => n + 1);
          })
          .catch(fail);
      }
    },
    saveSoulPreferences: async (attrs: Record<string, string>) => {
      await updateSoul(attrs, props.bearer);
      // The refreshed projection is the read-back (toggle truth).
      setSectionNonce((n) => n + 1);
    },
    saveCallGraphingMode: async (callMode: string) => {
      // Item 16: the response IS the saved policy (read-back); the
      // refreshed projection re-seeds the room from the same truth.
      await updateGraphingPolicy({ call_mode: callMode }, props.bearer);
      setSectionNonce((n) => n + 1);
    },
    setGraphingPaused: async (paused: boolean) => {
      await updateGraphingPolicy({ global_paused: paused }, props.bearer);
      setSectionNonce((n) => n + 1);
    },
    // R20 F-4 — the Private graphs credential home writes. The PIN
    // write is the existing server set (the code itself is never
    // stored); the section nonce re-reads the projection as proof.
    setVaultPasscode: async (code: string) => {
      await setGraphLock(code, props.bearer);
      setSectionNonce((n) => n + 1);
    },
    setVaultBiometric: async (enabled: boolean) => {
      // The toggle drives the REAL WebAuthn path: enabling first
      // registers a platform credential on THIS device (user
      // verification required); only a successful registration earns
      // the server preference flip. Any failure throws with a plain
      // line and nothing changes anywhere.
      if (enabled) {
        const registered = await registerVaultBiometric();
        if (!registered) {
          throw new Error(
            "Biometric unlock is not available on this device, or the setup was cancelled. Your PIN still opens Private graphs.",
          );
        }
        try {
          await setGraphLockBiometric(true, props.bearer);
        } catch {
          clearVaultBiometric();
          throw new Error("That did not save. Try again.");
        }
      } else {
        await setGraphLockBiometric(false, props.bearer);
        clearVaultBiometric();
      }
      setSectionNonce((n) => n + 1);
    },
    addSavedLogin: async (host: string, secret: string) => {
      await addSavedLogin(host, secret, props.bearer);
      setSectionNonce((n) => n + 1);
    },
    redeemInviteCode: async (code: string) => {
      const credit = await redeemPersonalInviteCode(code, props.bearer);
      setSectionNonce((n) => n + 1);
      return credit;
    },
    addMemory: async (text: string) => {
      // N7: a memory change without a signed-in session is refused
      // here, before any request - the wallet API is owner-scoped
      // to the session's user and answers 401 without one.
      if (!props.bearer) throw new Error("not signed in");
      await createMemoryCapsule(text, props.bearer);
      // The refreshed projection is the read-back: the new capsule
      // renders from the wallet read, with its provenance and date.
      setSectionNonce((n) => n + 1);
    },
    executeDeletion: async (mode: "data" | "account") => {
      const receipt = await executeDeletion(mode, "self_serve", props.bearer);
      if (mode === "account") props.onSessionChange();
      return { reference: receipt.reference };
    },
    submitSupportReport: async (
      kind: "problem" | "feedback",
      category: string,
      body: string,
    ) => {
      // Audit A5 + A9 — the payload is exactly the disclosure: words,
      // kind, category, and the served build identity read from the
      // same build stamp the Home badge renders (never typed copy).
      const buildRef =
        typeof document !== "undefined"
          ? document.documentElement.getAttribute("data-git-head")
          : null;
      const report = await submitSupportReportRequest(
        { kind, category, body, build_ref: buildRef },
        props.bearer,
      );
      return { reference: report.reference };
    },
    saveProfileFields: async (name: string, handle: string) => {
      await updateProfile(
        { displayName: name, handle: handle || undefined },
        props.bearer,
      );
      props.onSessionChange();
      setSectionNonce((n) => n + 1);
    },
  };

  if (props.settingKey === "your-moments") {
    return (
      <MomentsArchive bearer={props.bearer} onBack={() => props.setSettingKey(null)} />
    );
  }

  if (props.settingKey === "your-library") {
    return (
      <LibraryDestination bearer={props.bearer} onBack={() => props.setSettingKey(null)} />
    );
  }

  // N6 (founder decision, 2026-10-19): the Care room is OUT of
  // Settings - no hub row, no mount here. The care machinery
  // (CareDestination, CareRotationView, the check-in reads/writes)
  // is preserved untouched in code; a stray "care" key falls to the
  // generic section path below, whose honest answer is that the
  // section is not part of this build.
  if (props.settingKey) {
    if (!section) {
      return (
        <div className="c2s-scroll">
          <EmptyBlock headline="Loading." line="One moment." />
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
        {pendingForgetId || pendingForgetCapsuleId ? (
          <div className="c2s-scroll" data-testid="c2-forget-confirm" role="alertdialog" aria-label="Confirm forget">
            <p style={{ fontWeight: 650 }}>Forget this for good?</p>
            <p className="c2s-card-line">
              Opal will stop keeping it, and it cannot be undone.
            </p>
            <button
              type="button"
              className="c2s-btn-primary"
              data-testid="c2-forget-confirm-yes"
              disabled={forgetBusy}
              onClick={() => void confirmForget()}
            >
              {forgetBusy ? "Forgetting…" : "Forget it"}
            </button>
            <button
              type="button"
              className="c2s-btn-text"
              data-testid="c2-forget-confirm-no"
              onClick={() => {
                setPendingForgetId(null);
                setPendingForgetCapsuleId(null);
              }}
            >
              Keep it
            </button>
          </div>
        ) : null}
        {actionError ? (
          <p className="c2s-error-line" role="alert" data-testid="c2-you-action-error" style={{ padding: "0 var(--gutter)" }}>
            {actionError}
          </p>
        ) : null}
        <C2SettingsSection key={section.key} section={section} events={events} />
      </div>
    );
  }
  return <C2YouHub projection={hub} events={events} />;
}

/** Create flow (sheet-band entry lives in Graphs/Home; this is the
 *  flow-band form). Real writes only: createGraphPlan for Plan and
 *  Idea, createTrip for Trip. Failure keeps the typed title.
 *
 *  Repair #20 (F-7): the form asks WHO with the same weight as
 *  What / When / Where — a people picker over the ONE people
 *  universe (identity-resolved, most-talked-to first), carried
 *  into the real create contracts: `participant_user_ids` for
 *  plan/idea (graph-create validates every id server-side) and
 *  `user_ids` for trips (real trip memberships). A shelf starter's
 *  prefill people arrive pre-selected, never silently dropped. */
export function CreateFlow({
  kind,
  bearer,
  conversations,
  prefill,
  onClose,
  onCreated,
}: {
  kind: "plan" | "trip" | "idea";
  bearer?: string;
  conversations: ConversationSummary[];
  /** Adoption wave 1 (ST-B) - a shelf starter's prefill: the form
   *  opens with the starter's words and people; nothing is created
   *  or sent until the user saves. */
  prefill?: { title: string; participantUserIds: string[] };
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [when, setWhen] = useState("");
  const [place, setPlace] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [whoPeople, setWhoPeople] = useState<PickerPerson[]>([]);
  const [whoSelected, setWhoSelected] = useState<ReadonlySet<string>>(
    () => new Set(prefill?.participantUserIds ?? []),
  );

  // The Who picker's people: the ONE universe, read fresh the same
  // way the chat picker and Add-people read it (conversations the
  // shell already holds + relationship contacts + the established
  // list). A failed read leaves the field honestly empty.
  useEffect(() => {
    let live = true;
    void (async () => {
      let contacts: Array<{
        contact_user_id: string;
        display_name?: string | null;
        type?: string | null;
        family_subtype?: string | null;
      }> = [];
      let rows: RelRow[] = [];
      try {
        const res = await listRelationships(bearer);
        contacts = res.contacts ?? [];
        rows = (res.relationships ?? []).map((r) => ({
          contact_user_id: r.contact_user_id,
          type: typeof r.type === "string" ? r.type : "",
          family_subtype: r.family_subtype ?? null,
          family_minor: r.family_minor === true,
          age_band: r.age_band ?? null,
        }));
      } catch {
        /* conversations alone still populate the picker */
      }
      try {
        const res = await listPeople(bearer);
        const established = (res.connected ?? [])
          .map((c) => {
            const anyC = c as unknown as Record<string, unknown>;
            const id =
              (typeof anyC.peer_user_id === "string" && anyC.peer_user_id) ||
              (typeof anyC.contact_user_id === "string" && anyC.contact_user_id) ||
              "";
            return id
              ? {
                  contact_user_id: id,
                  display_name:
                    typeof anyC.display_name === "string" ? anyC.display_name : null,
                }
              : null;
          })
          .filter((c): c is { contact_user_id: string; display_name: string | null } =>
            Boolean(c),
          );
        contacts = [...contacts, ...established];
      } catch {
        /* the union stands on conversations + relationships */
      }
      if (live) {
        setWhoPeople(peopleUniverse({ conversations, contacts, relRows: rows }));
      }
    })();
    return () => {
      live = false;
    };
  }, [bearer, conversations]);

  const toggleWho = useCallback((personId: string) => {
    setWhoSelected((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  }, []);

  const submit = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    const whoIds = [...whoSelected];
    try {
      if (kind === "trip") {
        await createTrip(
          {
            title: title.trim(),
            destination_label: place.trim() || undefined,
            user_ids: whoIds.length > 0 ? whoIds : undefined,
          },
          bearer,
        );
      } else {
        await createGraphPlan(
          {
            title: title.trim(),
            location: place.trim() || undefined,
            time_label: when.trim() || undefined,
            participant_user_ids: whoIds.length > 0 ? whoIds : undefined,
            entry: kind === "idea" ? "c2-idea" : "c2-plan",
            idempotency_key: `c2-${kind}-${Date.now()}`,
          },
          bearer,
        );
      }
      onCreated();
    } catch {
      setBusy(false);
      setError("That did not save. Your words are still here - try again.");
    }
  };
  const whoNames = whoPeople
    .filter((p) => whoSelected.has(p.personId))
    .map((p) => p.name);
  const whoLine =
    whoNames.length === 0
      ? "Just you for now."
      : whoNames.length === 1
        ? `With ${whoNames[0]}.`
        : whoNames.length === 2
          ? `With ${whoNames[0]} and ${whoNames[1]}.`
          : `With ${whoNames[0]}, ${whoNames[1]} and ${whoNames.length - 2} more.`;
  return (
    <TopLayer band="flow">
      <div
        className="c2s-flow c2s-create-flow"
        style={{ background: "var(--canvas)" }}
        data-testid="c2-create-flow"
      >
        <div className="c2s-entry-top">
          <button type="button" className="c2s-icon-btn" aria-label="Close" onClick={onClose}>
            <IconClose />
          </button>
          <span style={{ fontWeight: 650 }}>
            {kind === "plan" ? "New plan" : kind === "trip" ? "New trip" : "New idea"}
          </span>
          <span style={{ width: 44 }} />
        </div>
        <div className="c2s-entry-body">
          <h1>{kind === "idea" ? "Just the spark." : "A time, a place, your people."}</h1>
          <div className="c2s-field-group">
            <label className="c2s-field-label" htmlFor="c2-create-title-input">
              What
            </label>
            <input
              id="c2-create-title-input"
              className="c2s-field"
              data-testid="c2-create-title"
              placeholder={kind === "trip" ? "Trip name" : "What is happening?"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Title"
            />
          </div>
          {kind !== "idea" ? (
            <>
              <div className="c2s-field-group">
                <label className="c2s-field-label" htmlFor="c2-create-when-input">
                  When
                </label>
                <input
                  id="c2-create-when-input"
                  className="c2s-field"
                  data-testid="c2-create-when"
                  placeholder="When (optional for now)"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                  aria-label="When"
                />
              </div>
              <div className="c2s-field-group">
                <label className="c2s-field-label" htmlFor="c2-create-place-input">
                  Where
                </label>
                <input
                  id="c2-create-place-input"
                  className="c2s-field"
                  data-testid="c2-create-place"
                  placeholder={kind === "trip" ? "Where to (optional for now)" : "Where (optional for now)"}
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  aria-label="Where"
                />
              </div>
            </>
          ) : null}
          <div className="c2s-field-group" data-testid="c2-create-who">
            <span className="c2s-field-label" id="c2-create-who-label">
              {/* Repair #20 design compass (founder, 2026-10-20): the
               * orbit/ring motif is the emotional brand anchor, so the
               * Who field — the people who will orbit this plan —
               * carries the orbit mark: two gyroscope rings with a
               * dot riding them, beside the label. */}
              <span className="c2s-create-orbit-mark" aria-hidden="true">
                <span className="c2s-create-orbit-ring">
                  <span className="c2s-create-orbit-dot" />
                </span>
              </span>
              Who
            </span>
            {whoPeople.length === 0 ? (
              <p className="c2s-field-reason" data-testid="c2-create-who-empty">
                No one connected yet — this one starts with just you.
              </p>
            ) : (
              <div
                className="c2s-create-who"
                role="group"
                aria-labelledby="c2-create-who-label"
              >
                {whoPeople.map((person) => {
                  const selected = whoSelected.has(person.personId);
                  return (
                    <button
                      key={person.personId}
                      type="button"
                      className="c2s-create-who-row"
                      data-testid="c2-create-who-row"
                      data-person-id={person.personId}
                      aria-pressed={selected}
                      onClick={() => toggleWho(person.personId)}
                    >
                      <span>
                        {person.name}
                        {person.tieLabel ? <small>{person.tieLabel}</small> : null}
                      </span>
                      <span className="c2s-create-who-check" aria-hidden="true">
                        {selected ? "✓" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="c2s-field-reason" data-testid="c2-create-who-line">
              {whoLine}
            </p>
          </div>
          {error ? (
            <p className="c2s-error-line" role="alert">
              {error}
            </p>
          ) : null}
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="c2s-btn-primary c2s-btn-create"
            data-testid="c2-create-submit"
            disabled={busy || !title.trim()}
            onClick={() => void submit()}
          >
            {busy ? "Saving" : kind === "idea" ? "Save the idea" : "Create"}
          </button>
        </div>
      </div>
    </TopLayer>
  );
}

/**
 * Repair #20 (F-15) - "Do that again": repeat a settled plan through
 * the durable graph-create path (POST /opal/plans/graph-create with
 * source_plan_id provenance). The flow CARRIES the settled plan's
 * people and place - shown, and editable where editing is honest -
 * and never carries its time: the new time is chosen here, and the
 * Create button stays disabled until one is written. A virtual
 * source stays virtual and carries NO meeting link (the new plan's
 * host adds a fresh one - a copied link would be a stale link). The
 * original plan is never written by this flow.
 */
export function RepeatPlanFlow({
  detail,
  bearer,
  onClose,
  onCreated,
}: {
  detail: GraphDetailProjection;
  bearer?: string;
  onClose: () => void;
  onCreated: (newPlanId: string) => void;
}) {
  const carried = detail.repeat ?? null;
  const isVirtual = carried?.planType === "virtual";
  const [title, setTitle] = useState(detail.title);
  const [when, setWhen] = useState("");
  const [place, setPlace] = useState(carried?.location ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // One idempotency key per opening of this flow (the CreateFlow
  // rule): a double-tap or retry replays to the same new plan.
  const [idempotencyKey] = useState(() => `c2-repeat-${detail.id}-${Date.now()}`);
  const partyNames = detail.who
    .filter((w) => w.userId && w.userId !== detail.viewerUserId)
    .map((w) => w.name);
  const placeUnchanged = !isVirtual && place.trim() === (carried?.location ?? "");
  const submit = async () => {
    if (!title.trim() || !when.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await createGraphPlan(
        {
          title: title.trim(),
          location: isVirtual ? undefined : place.trim() || undefined,
          // The source place's coordinates ride ONLY while the place
          // words are still the source's own (G2 writer law: a new
          // place's coordinates are unknown, never the old place's).
          place_lat:
            placeUnchanged && carried?.placeLat != null ? carried.placeLat : undefined,
          place_lon:
            placeUnchanged && carried?.placeLon != null ? carried.placeLon : undefined,
          time_label: when.trim(),
          participant_user_ids:
            carried && carried.participantUserIds.length > 0
              ? carried.participantUserIds
              : undefined,
          source_plan_id: detail.id,
          entry: "repeat",
          plan_type: isVirtual ? "virtual" : undefined,
          idempotency_key: idempotencyKey,
        },
        bearer,
      );
      if (!res.plan?.id) throw new Error("repeat did not return a plan");
      onCreated(res.plan.id);
    } catch {
      setBusy(false);
      setError("That did not save. Your words are still here - try again.");
    }
  };
  return (
    <TopLayer band="flow">
      <div className="c2s-flow" style={{ background: "var(--canvas)" }} data-testid="c2-repeat-flow">
        <div className="c2s-entry-top">
          <button type="button" className="c2s-icon-btn" aria-label="Close" onClick={onClose}>
            <IconClose />
          </button>
          <span style={{ fontWeight: 650 }}>Do that again</span>
          <span style={{ width: 44 }} />
        </div>
        <div className="c2s-entry-body">
          <h1>Same people, same place - a new time.</h1>
          <input
            className="c2s-field"
            data-testid="c2-repeat-title"
            placeholder="What is happening?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Title"
          />
          <p className="c2s-card-line" data-testid="c2-repeat-parties">
            {partyNames.length > 0
              ? `With ${partyNames.join(", ")} - the same people as last time.`
              : "Just you, like last time."}
          </p>
          <input
            className="c2s-field"
            data-testid="c2-repeat-when"
            placeholder="When this time?"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            aria-label="When this time"
          />
          {isVirtual ? (
            <p className="c2s-card-line" data-testid="c2-repeat-online">
              Online, like last time. The new plan needs its own meeting link -
              add it once the plan is made.
            </p>
          ) : (
            <input
              className="c2s-field"
              data-testid="c2-repeat-place"
              placeholder="Where (the same place, or a new one)"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              aria-label="Where"
            />
          )}
          {error ? (
            <p className="c2s-error-line" role="alert">
              {error}
            </p>
          ) : null}
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="c2s-btn-primary"
            data-testid="c2-repeat-submit"
            disabled={busy || !title.trim() || !when.trim()}
            onClick={() => void submit()}
          >
            {busy ? "Saving" : "Create the plan"}
          </button>
        </div>
      </div>
    </TopLayer>
  );
}

export function SearchDestination({
  plans,
  conversations,
  intentions,
  onClose,
  onOpenGraph,
  onOpenChat,
}: {
  plans: OpalPlanContract[];
  conversations: ConversationSummary[];
  /** ST-D: the user's own intentions (ST-A). The group renders only
   *  when intentions exist in the store; absent data - no header.
   *  The MEMORY group never renders here: the capsule/memory class
   *  is not built yet (Soul+Memory track dependency), never faked. */
  intentions?: Array<{ id: string; title: string; personName?: string }>;
  onClose: () => void;
  onOpenGraph: (id: string) => void;
  onOpenChat: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const planHits = q ? plans.filter((p) => p.title.toLowerCase().includes(q)) : [];
  const chatHits = q
    ? conversations.filter(
        (c) =>
          c.title.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q),
      )
    : [];
  // People: the real peers on the viewer's own conversations.
  // Repair #20 (F-6): identity resolution at this seam — the key
  // is the peer's person id, never the display name, so one
  // identity reached through several conversations projects once
  // (conversations arrive most-recent first, so the surviving row
  // opens the freshest thread), while two distinct people who
  // share a name keep both rows, unmixed.
  const peopleHits = q
    ? conversations
        .flatMap((c) =>
          (c.peers ?? [])
            .filter((peer) => peer.display_name.toLowerCase().includes(q))
            .map((peer) => ({ peer, conversationId: c.id })),
        )
        .filter(
          (hit, i, all) => all.findIndex((h) => h.peer.id === hit.peer.id) === i,
        )
    : [];
  const intentionHits = q
    ? (intentions ?? []).filter((i) => i.title.toLowerCase().includes(q))
    : [];
  // Places: the real places on the viewer's own plans only - the
  // plan contract's own location, with the same virtual guard the
  // plan projection uses (a virtual plan's location is not a
  // place). One row per distinct place; a tap opens the plan that
  // carries it. No place directory is searched and no place is
  // invented - a plan without a location contributes nothing.
  const placeHits = q
    ? plans
        .filter((p) => p.plan_type !== "virtual" && p.online !== true)
        .flatMap((p) => {
          const label = p.location?.trim();
          return label && label.toLowerCase().includes(q)
            ? [{ label, planId: p.id, planTitle: p.title }]
            : [];
        })
        .filter(
          (hit, i, all) =>
            all.findIndex(
              (h) => h.label.toLowerCase() === hit.label.toLowerCase(),
            ) === i,
        )
    : [];
  const nothing =
    planHits.length === 0 &&
    chatHits.length === 0 &&
    peopleHits.length === 0 &&
    placeHits.length === 0 &&
    intentionHits.length === 0;
  return (
    <TopLayer band="flow">
      <div className="c2s-flow" style={{ background: "var(--canvas)" }} data-testid="c2-search">
        <header className="c2s-header">
          <h1 className="c2s-header-title" style={{ flex: 1, fontSize: 20 }}>
            Search
          </h1>
          <button type="button" className="c2s-icon-btn" aria-label="Close search" onClick={onClose}>
            <IconClose />
          </button>
        </header>
        <div style={{ padding: "var(--space-4) var(--gutter)" }}>
          <input
            className="c2s-search"
            data-testid="c2-search-input"
            placeholder="Search plans, chats, people, places, and intentions"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search plans, chats, people, places, and intentions"
          />
          {q && nothing ? (
            <p className="c2s-lede" data-testid="c2-search-no-match" style={{ marginTop: "var(--space-4)" }}>
              No match in your plans, chats, people, places, or intentions.
            </p>
          ) : null}
          {planHits.length > 0 ? (
            <div data-testid="c2-search-group-plans">
              <p className="c2s-group-label">Plans</p>
              {planHits.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  className="c2s-card"
                  data-testid="c2-search-plan"
                  style={{ width: "100%", textAlign: "left", cursor: "pointer", marginTop: "var(--space-3)" }}
                  onClick={() => onOpenGraph(plan.id)}
                >
                  <p className="c2s-card-title">{plan.title}</p>
                  {/* R20 F-14: search result cards read the ONE
                      shared when line - multi-day plans show their
                      range here too, never a second formatter. */}
                  <p className="c2s-card-line">{planWhenLine(plan)}</p>
                </button>
              ))}
            </div>
          ) : null}
          {chatHits.length > 0 ? (
            <div data-testid="c2-search-group-chats">
              <p className="c2s-group-label">Chats</p>
              {chatHits.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  className="c2s-card"
                  data-testid="c2-search-chat"
                  style={{ width: "100%", textAlign: "left", cursor: "pointer", marginTop: "var(--space-3)" }}
                  onClick={() => onOpenChat(chat.id)}
                >
                  <p className="c2s-card-title">{chat.title}</p>
                  {/* Harmony2 essence fix: the same human preview
                   * the chats list renders - a raw call:<id> body
                   * is a machine string, never a search result. */}
                  <p className="c2s-card-line">{conversationPreviewLabel(chat)}</p>
                </button>
              ))}
            </div>
          ) : null}
          {peopleHits.length > 0 ? (
            <div data-testid="c2-search-group-people">
              <p className="c2s-group-label">People</p>
              {peopleHits.map((hit) => (
                <button
                  key={hit.peer.id}
                  type="button"
                  className="c2s-card"
                  data-testid="c2-search-person"
                  style={{ width: "100%", textAlign: "left", cursor: "pointer", marginTop: "var(--space-3)" }}
                  onClick={() => onOpenChat(hit.conversationId)}
                >
                  <p className="c2s-card-title">{hit.peer.display_name}</p>
                  <p className="c2s-card-line">Open your chat</p>
                </button>
              ))}
            </div>
          ) : null}
          {placeHits.length > 0 ? (
            <div data-testid="c2-search-group-places">
              <p className="c2s-group-label">Places</p>
              {placeHits.map((hit) => (
                <button
                  key={hit.label.toLowerCase()}
                  type="button"
                  className="c2s-card"
                  data-testid="c2-search-place"
                  data-plan-id={hit.planId}
                  style={{ width: "100%", textAlign: "left", cursor: "pointer", marginTop: "var(--space-3)" }}
                  onClick={() => onOpenGraph(hit.planId)}
                >
                  <p className="c2s-card-title">{hit.label}</p>
                  <p className="c2s-card-line">From your plan: {hit.planTitle}</p>
                </button>
              ))}
            </div>
          ) : null}
          {intentionHits.length > 0 ? (
            <div data-testid="c2-search-group-intentions">
              <p className="c2s-group-label">Intentions</p>
              {intentionHits.map((intention) => (
                <div key={intention.id} className="c2s-card" style={{ marginTop: "var(--space-3)" }}>
                  <p className="c2s-card-title">{intention.title}</p>
                  {intention.personName ? <p className="c2s-card-line">{intention.personName}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </TopLayer>
  );
}

// Re-export so applyC2Mode stays referenced for hosts that pre-apply.
export { applyC2Mode };
