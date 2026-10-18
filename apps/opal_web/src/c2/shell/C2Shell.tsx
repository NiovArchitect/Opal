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
import { C2Mark } from "../LoopCharacter";
import {
  applyC2Mode,
  readC2ModePreference,
  setC2ModePreference,
  type C2ModePreference,
} from "../../theme/c2Mode";
import {
  createGraphPlan,
  createTrip,
  forgetMemoryFact,
  listConversations,
  loadProfile,
  revokeGoogleCalendarConnection,
  startGoogleCalendarConnect,
  updateAssistPreference,
  updateHomeTimezone,
  updateMessagingPreferences,
  updateProfile,
  type ConversationSummary,
  type OpalPlanContract,
  type ProductSession,
} from "../../api/productClient";
import "./c2shell.css";
import type { C2Route, GraphDetailProjection } from "./projections";
import {
  buildSettingsSection,
  detailFromPlan,
  graphListFromPlans,
  homeFromSession,
  loadPlans,
  openingFromPlans,
  shellFromSession,
  youHubFromSession,
  getGoogleCalendarStatusSafe,
} from "./shellDataBridge";
import { C2Home } from "./C2Home";
import { C2Graphs, C2GraphDetail } from "./C2Graphs";
import { C2YouHub, C2SettingsSection } from "./C2You";
import { C2Onboarding } from "./C2Onboarding";
import { CenterHost, ChatsHost, CheckinSummarySheet } from "./C1ShellHosts";
import { CareDestination } from "./CareDestination";
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
  const [settingKey, setSettingKey] = useState<string | null>(null);
  const [createKind, setCreateKind] = useState<null | "plan" | "trip" | "idea">(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [homeNonce, setHomeNonce] = useState(0);
  const [summarySweepId, setSummarySweepId] = useState<string | null>(null);
  const bearer = session?.access_token;

  const refreshPlans = useCallback(async () => {
    setPlans(await loadPlans(bearer));
  }, [bearer]);

  const refreshConversations = useCallback(async () => {
    try {
      const res = await listConversations(bearer);
      setConversations(res.conversations ?? []);
    } catch {
      setConversations([]);
    }
  }, [bearer]);

  useEffect(() => {
    if (stage === "member") {
      void refreshPlans();
      void refreshConversations();
    }
  }, [stage, bearer, refreshPlans, refreshConversations, homeNonce]);

  const shell = useMemo(() => shellFromSession(session, route), [session, route]);
  const graphList = useMemo(() => graphListFromPlans(plans), [plans]);
  const opening = useMemo(
    () => openingFromPlans(plans, session?.display_name ?? ""),
    [plans, session],
  );

  const openGraph = useCallback(
    (cardId: string, origin: C2Route) => {
      const plan = plans.find((p) => p.id === cardId);
      if (!plan) return;
      setDetailOrigin(origin);
      setDetail(detailFromPlan(plan, origin, session?.user_id));
    },
    [plans, session],
  );

  /** After a food action, re-read the plans and re-render the open
   *  detail from the RETURNED plan - never from a local edit. */
  const refreshDetailFromServer = useCallback(async () => {
    const fresh = await loadPlans(bearer);
    setPlans(fresh);
    if (detail) {
      const plan = fresh.find((p) => p.id === detail.id);
      if (plan) setDetail(detailFromPlan(plan, detailOrigin, session?.user_id));
    }
  }, [bearer, detail, detailOrigin, session]);

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
              <ChatsHost
                bearer={bearer}
                viewerUserId={session?.user_id}
                conversations={conversations}
                onConversationsChanged={() => void refreshConversations()}
              />
            </div>
          ) : null}

          {route === "center" ? (
            <div data-testid="c2-route-center" style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
              <CenterHost
                bearer={bearer}
                opening={opening}
                plans={plans}
                onOpenGraph={(id) => openGraph(id, "center")}
                openingEvents={{
                  openGraph: (id) => openGraph(id, "center"),
                  makeSomethingHappen: () => setCreateKind("plan"),
                  completeSlot: (id) => openGraph(id, "center"),
                }}
              />
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
                  dropPlan: () => undefined,
                  runNextAction: () => undefined,
                  addPeople: () => undefined,
                  openChatForPlan: () => goRoute("chats"),
                  back: () => goRoute("center"),
                }}
              />
            </div>
          ) : null}

          {route === "you" ? (
            <div data-testid="c2-route-you" style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
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
            <span className="c2s-dock-center-disc">
              <C2Mark size={40} />
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
            dropPlan: () => undefined,
            runNextAction: () => undefined,
            addPeople: () => undefined,
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

      {createKind ? (
        <CreateFlow
          kind={createKind}
          bearer={bearer}
          onClose={() => setCreateKind(null)}
          onCreated={() => {
            setCreateKind(null);
            void refreshPlans();
          }}
        />
      ) : null}

      {searchOpen ? (
        <SearchDestination
          plans={plans}
          conversations={conversations}
          onClose={() => setSearchOpen(false)}
          onOpenGraph={(id) => {
            setSearchOpen(false);
            openGraph(id, route);
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
        feedAction: () => undefined,
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
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [section, setSection] = useState<Awaited<ReturnType<typeof buildSettingsSection>> | null>(null);
  const [sectionNonce, setSectionNonce] = useState(0);

  useEffect(() => {
    void getGoogleCalendarStatusSafe(props.bearer).then(setGoogleConnected);
  }, [props.bearer]);

  useEffect(() => {
    if (!props.settingKey || props.settingKey === "care") {
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
      if (sectionKey === "notifications" && rowId === "messages-calls") {
        await updateMessagingPreferences(
          { message_notifications_enabled: value },
          props.bearer,
        );
      } else if (sectionKey === "notifications" && rowId === "read-receipts") {
        await updateMessagingPreferences({ read_receipts_enabled: value }, props.bearer);
      } else if (sectionKey === "calls-assist" && rowId === "assist") {
        await updateAssistPreference(value, props.bearer);
      } else {
        throw new Error(`No real preference behind ${sectionKey}/${rowId}`);
      }
      // Re-render ONLY from the refreshed projection (toggle truth).
      setSectionNonce((n) => n + 1);
    },
    runAction: (sectionKey: string, rowId: string) => {
      if (sectionKey === "location-travel" && rowId === "use-device-timezone") {
        void updateHomeTimezone(
          Intl.DateTimeFormat().resolvedOptions().timeZone,
          props.bearer,
        ).then(() => setSectionNonce((n) => n + 1));
      } else if (sectionKey === "connected-sources" && rowId === "google-connect") {
        void startGoogleCalendarConnect(props.bearer).then((res) => {
          if (res.authorize_url) window.location.href = res.authorize_url;
        });
      } else if (sectionKey === "connected-sources" && rowId === "google-disconnect") {
        void revokeGoogleCalendarConnection(props.bearer).then(() =>
          setSectionNonce((n) => n + 1),
        );
      } else if (sectionKey === "what-opal-remembers" && rowId.startsWith("forget-")) {
        void forgetMemoryFact(rowId.slice("forget-".length), props.bearer).then(() =>
          setSectionNonce((n) => n + 1),
        );
      }
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

  if (props.settingKey === "care") {
    return (
      <CareDestination onBack={() => props.setSettingKey(null)} nonce={sectionNonce} />
    );
  }

  if (props.settingKey) {
    if (!section) {
      return (
        <div className="c2s-scroll">
          <EmptyBlock headline="Loading." line="One moment." />
        </div>
      );
    }
    return <C2SettingsSection key={section.key} section={section} events={events} />;
  }
  return <C2YouHub projection={hub} events={events} />;
}

/** Create flow (sheet-band entry lives in Graphs/Home; this is the
 *  flow-band form). Real writes only: createGraphPlan for Plan and
 *  Idea, createTrip for Trip. Failure keeps the typed title. */
function CreateFlow({
  kind,
  bearer,
  onClose,
  onCreated,
}: {
  kind: "plan" | "trip" | "idea";
  bearer?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [place, setPlace] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (kind === "trip") {
        await createTrip({ title: title.trim(), destination_label: place.trim() || undefined }, bearer);
      } else {
        await createGraphPlan(
          {
            title: title.trim(),
            location: place.trim() || undefined,
            time_label: when.trim() || undefined,
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
  return (
    <TopLayer band="flow">
      <div className="c2s-flow" style={{ background: "var(--canvas)" }} data-testid="c2-create-flow">
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
          <input
            className="c2s-field"
            data-testid="c2-create-title"
            placeholder={kind === "trip" ? "Trip name" : "What is happening?"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Title"
          />
          {kind !== "idea" ? (
            <>
              <input
                className="c2s-field"
                data-testid="c2-create-when"
                placeholder="When (optional for now)"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                aria-label="When"
              />
              <input
                className="c2s-field"
                data-testid="c2-create-place"
                placeholder={kind === "trip" ? "Where to (optional for now)" : "Where (optional for now)"}
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                aria-label="Where"
              />
            </>
          ) : null}
          {error ? (
            <p className="c2s-error-line" role="alert">
              {error}
            </p>
          ) : null}
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="c2s-btn-primary"
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

function SearchDestination({
  plans,
  conversations,
  onClose,
  onOpenGraph,
}: {
  plans: OpalPlanContract[];
  conversations: ConversationSummary[];
  onClose: () => void;
  onOpenGraph: (id: string) => void;
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
            placeholder="Search your plans and chats"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search your plans and chats"
          />
          {q && planHits.length === 0 && chatHits.length === 0 ? (
            <p className="c2s-lede" style={{ marginTop: "var(--space-4)" }}>
              No match in your plans or chats.
            </p>
          ) : null}
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
              <p className="c2s-card-line">{plan.time_label ?? "Time not set yet."}</p>
            </button>
          ))}
          {chatHits.map((chat) => (
            <div key={chat.id} className="c2s-card" style={{ marginTop: "var(--space-3)" }}>
              <p className="c2s-card-title">{chat.title}</p>
              <p className="c2s-card-line">{chat.preview}</p>
            </div>
          ))}
        </div>
      </div>
    </TopLayer>
  );
}

// Re-export so applyC2Mode stays referenced for hosts that pre-apply.
export { applyC2Mode };
