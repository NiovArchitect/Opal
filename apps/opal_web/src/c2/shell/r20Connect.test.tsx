/**
 * @vitest-environment jsdom
 *
 * Repair #20 cluster C4 - founder delta-fix pins:
 *  - F-9 Connectors v2 (founder rebuild, 2026-10-20 - v1 MISSED
 *    AGAIN): the room is a near-textless list of user-facing tools -
 *    icon + name + one action (Connect / Disconnect / View) -
 *    grouped in the founder's categories, rendering ONLY categories
 *    with real members. It FAILS if any infrastructure provider
 *    name renders, if any backend-derived content renders (device
 *    location, meetings, linked devices, phone calls, ingestion
 *    sources), or if any row renders Connect without a backing
 *    flow in the projection (a payload action). Permissions binds
 *    to the real Soul assistance level and carries no essay text.
 *  - F-10 Center assets: Make something happen / Talk to Opal /
 *    How Opal works for you each fire their real handler; the third
 *    is a doorway row, not an action button; all carry the pressed
 *    treatment in the stylesheet.
 *  - F-18 D-5: Home and Center declare different purposes and lead
 *    differently - Home with people/moments, Center with the
 *    Needs-you deck.
 *
 * AMENDMENT (Repair #23, R23-rail): the F-10 PIN below for the
 * happening story ring's glow was AMENDED by the IF-1 two-tier
 * resolution - founder-delegated PARENT DECISION, 2026-10-21
 * 18:04. The collision it resolves (named in the R22 handoff
 * as IF-1): the original pin held the ring at a flat 14px
 * (0 0 14px var(--orb-indicator-happening-glow)) while Repair
 * #22 WS-4's glow-containment sweep tokenized the same rule
 * to the 8px stream glow-room. The amended law is TWO-TIER:
 * the ring is exempt from the flat token - RESTING (default)
 * rings sit at the 8px glow-room (var(--stream-glow-room),
 * WS-4's stream coherence governs the default), and the
 * founder-pinned 14px bloom applies ONLY at the ATTENTION
 * tier (data-glow="attention"), stamped by the render only
 * when attention is earned by a named trigger (the story is
 * live; its author is the viewer's close people; the
 * response/mention and demonstrated-interest triggers have
 * no signal in the rail record today and are declared in the
 * R23 rail report). The pin below asserts both tiers.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const mocks = vi.hoisted(() => ({
  getSettingsConnections: vi.fn(),
  getIngestionStatus: vi.fn(),
  getSoulMemory: vi.fn(),
  listOpalPlans: vi.fn(),
  listTemporaryStories: vi.fn(),
  fetchHomeFeed: vi.fn(),
  getLivesVisible: vi.fn(),
}));

vi.mock("../../api/productClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/productClient")>();
  return {
    ...actual,
    getSettingsConnections: mocks.getSettingsConnections,
    getIngestionStatus: mocks.getIngestionStatus,
    getSoulMemory: mocks.getSoulMemory,
    listOpalPlans: mocks.listOpalPlans,
    listTemporaryStories: mocks.listTemporaryStories,
    fetchHomeFeed: mocks.fetchHomeFeed,
    getLivesVisible: mocks.getLivesVisible,
  };
});

import { C2SettingsSection, C2YouHub, type C2YouEvents } from "./C2You";
import { C2CenterOpening } from "./C2CenterOpening";
import { C2Home } from "./C2Home";
import { avatarOf, buildSettingsSection, homeFromSession, youHubFromSession } from "./shellData";
import type { SettingsConnection, SettingsConnectionsPayload } from "../../api/productClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const events: C2YouEvents = {
  editProfile: vi.fn(),
  openSection: vi.fn(),
  backToHub: vi.fn(),
  setPreference: vi.fn(async () => undefined),
  runAction: vi.fn(),
  saveProfileFields: vi.fn(async () => undefined),
  submitSupportReport: vi.fn(async () => ({ reference: "OPAL-TEST1" })),
  saveSoulPreferences: vi.fn(async () => undefined),
  setModePreference: vi.fn(),
  modePreference: "system",
};

let container: HTMLDivElement;
let root: Root;

function conn(partial: Partial<SettingsConnection> & { id: string }): SettingsConnection {
  return {
    display_name: partial.id,
    category: "your_accounts",
    powers: "powers",
    status: "not_connected",
    status_label: "Not connected",
    status_detail: "detail",
    credential_status: "user_grant",
    provider_status: "unverified",
    function_status: "gated",
    provenance: "real",
    mode: "live",
    verification_basis: "function_evidence",
    last_verified_at: null,
    gate: null,
    actions: [],
    ...partial,
  } as SettingsConnection;
}

const INFRA_NAMES = [
  "DeepSeek", "Deepgram", "ElevenLabs", "Twilio", "Geoapify",
  "Google Places", "Brave", "Duffel", "Stripe",
];

function payload(connections: SettingsConnection[]): SettingsConnectionsPayload {
  return { connections, generated_at: "2026-10-20T00:00:00Z", build_ref: "t", environment: "test" };
}

const INFRA_ROWS: SettingsConnection[] = [
  conn({ id: "deepseek", display_name: "Opal's thinking (DeepSeek)", category: "intelligence" }),
  conn({ id: "deepgram_batch", display_name: "Transcribing voice notes (Deepgram)", category: "voice" }),
  conn({ id: "elevenlabs", display_name: "Opal's voice (ElevenLabs)", category: "voice" }),
  conn({ id: "twilio_verify", display_name: "Phone number checks (Twilio)", category: "phone_and_messaging" }),
  conn({ id: "twilio_messaging", display_name: "Invite texts (Twilio)", category: "phone_and_messaging" }),
  conn({ id: "geoapify", display_name: "Places search (Geoapify)", category: "places_and_search" }),
  conn({ id: "google_places", display_name: "Place details (Google Places)", category: "places_and_search" }),
  conn({ id: "brave", display_name: "Web search (Brave)", category: "places_and_search" }),
  conn({ id: "duffel", display_name: "Flights (Duffel)", category: "travel" }),
  conn({ id: "stripe_wallet_loads", display_name: "Adding money (Stripe)", category: "payments" }),
];

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  for (const m of Object.values(mocks)) m.mockReset();
  mocks.getIngestionStatus.mockResolvedValue([
    { source: "chats", title: "Chats in the app", state: "working", state_label: "Working now", progress: "Caught up.", error: null, retryable: false },
    { source: "calls", title: "Phone calls", state: "working", state_label: "Working now", progress: "1 call so far.", error: null, retryable: false },
  ]);
  mocks.getSoulMemory.mockResolvedValue({
    wallet: { id: "w1", owner_user_id: "u1", created_at: null },
    soul: {
      user_id: "u1", assistance_level: "balanced",
      assistance_level_label: "A balanced amount of help",
      quiet_hours_start: "22:00", quiet_hours_end: "08:00",
      quiet_hours_label: "Quiet hours", timezone: "America/Los_Angeles",
      max_proactive_signals_per_day: 3, completion_feedback: "standard",
      motion_preference: "system",
    },
    capsules: [], capsule_count: 0,
  });
  mocks.listTemporaryStories.mockResolvedValue({ stories: [] });
  mocks.listOpalPlans.mockResolvedValue({ plans: [] });
  mocks.fetchHomeFeed.mockResolvedValue({ mode: "live", objects: [], stories: [] });
  mocks.getLivesVisible.mockResolvedValue({ lives: [], count: 0 });
  (events.runAction as ReturnType<typeof vi.fn>).mockReset();
  (events.saveSoulPreferences as ReturnType<typeof vi.fn>).mockReset();
  (events.saveSoulPreferences as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function render(node: React.ReactNode) {
  await act(async () => {
    root.render(node);
  });
}

describe("R20 F-9 Connectors v2", () => {
  it("PIN: no infrastructure provider name renders in the Connectors room, even when the payload carries them", async () => {
    mocks.getSettingsConnections.mockResolvedValue(payload([
      ...INFRA_ROWS,
      conn({ id: "google_calendar", display_name: "Your Google Calendar", powers: "Lets Opal check busy times. Read only." }),
      conn({ id: "gmail", display_name: "Your Gmail", powers: "Lets Opal watch for booking confirmations. Read only." }),
    ]));
    const section = await buildSettingsSection("connections", { session: null, bearer: "t" });
    expect(section.title).toBe("Connectors");
    await render(<C2SettingsSection section={section} events={events} />);
    const text = container.textContent || "";
    for (const name of INFRA_NAMES) {
      expect(text, `infrastructure name ${name} must not render`).not.toContain(name);
    }
    for (const row of INFRA_ROWS) {
      expect(container.querySelector(`[data-testid="connection-row-${row.id}"]`)).toBeNull();
    }
    expect(container.querySelector('[data-testid="connection-row-google_calendar"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="connection-row-gmail"]')).toBeTruthy();
  });

  it("PIN v2 form: tool rows are icon + name + one action, grouped only in categories with real members, and NO backend-derived content renders", async () => {
    mocks.getSettingsConnections.mockResolvedValue(payload([
      conn({ id: "google_calendar", display_name: "Your Google Calendar", powers: "Lets Opal check busy times. Read only." }),
      conn({ id: "gmail", display_name: "Your Gmail", powers: "Lets Opal watch for booking confirmations. Read only." }),
    ]));
    // The room must not even READ the ingestion payload in v2.
    mocks.getIngestionStatus.mockRejectedValue(new Error("must not be read"));
    const section = await buildSettingsSection("connections", { session: null, bearer: "t" });
    expect(mocks.getIngestionStatus).not.toHaveBeenCalled();
    await render(<C2SettingsSection section={section} events={events} />);
    const text = container.textContent || "";
    // Backend-derived content stripped permanently, by name.
    for (const banned of [
      "Device location", "Linked devices", "Phone calls", "Texts",
      "In the room", "Chats in the app", "Where Opal reads from",
      "Opal Assist and calls", "Not read", "meetings", "Meetings",
    ]) {
      expect(text, `backend-derived content ${banned} must not render`).not.toContain(banned);
    }
    expect(container.querySelector('[data-testid="c2-setting-row-linked-devices"]')).toBeNull();
    expect(container.querySelector('[data-testid="c2-setting-row-assist"]')).toBeNull();
    expect(container.querySelector('[data-testid^="connection-row-device-"]')).toBeNull();
    // Categories with real members render; empty ones do not.
    expect(container.querySelector('[data-testid="connection-category-business"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="connection-category-custom"]')).toBeTruthy();
    expect(text).not.toContain("Your device");
    expect(text).not.toContain("Social");
    expect(text).not.toContain("Your accounts");
    // Each tool row's face: the clean tool name, an orbit icon, and
    // exactly one action control - no status sentence, no subtitle.
    for (const [id, name] of [["google_calendar", "Google Calendar"], ["gmail", "Gmail"]] as const) {
      const row = container.querySelector(`[data-testid="connection-row-${id}"]`)!;
      expect(row).toBeTruthy();
      expect(row.querySelector(".c2s-connection-icon")).toBeTruthy();
      expect(row.querySelector(".c2s-row-title")!.textContent).toBe(name);
      expect(row.querySelectorAll("button")).toHaveLength(1);
      // The payload status stays in the DOM only as a hidden
      // verbatim span - it is not part of the row's face.
      const statusSpan = row.querySelector(`[data-testid="connection-status-${id}"]`)!;
      expect(statusSpan.hasAttribute("hidden")).toBe(true);
      const face = [...row.querySelectorAll(".c2s-row-title, button")].map((el) => el.textContent).join("");
      expect(face).not.toMatch(/Not connected|Waiting on you|Lets Opal/);
    }
    // The one Custom member is the real Saved logins read surface.
    const saved = container.querySelector('[data-testid="c2-setting-row-saved-logins"]')!;
    expect(saved).toBeTruthy();
    expect(saved.textContent).toContain("Saved logins");
    expect(saved.textContent).not.toMatch(/tap to view|by site only/);
    // Near-textless: the whole room's visible text stays short.
    expect(text.length).toBeLessThan(220);
    expect(text).not.toMatch(/share one Google sign-in|behind-the-scenes|status the server last checked/);
  });

  it("PIN: Connect appears ONLY for tools with a real flow; without one the row shows View and its detail never repeats a sentence", async () => {
    // Scenario 1: payload carries NO enabled action (OAuth not
    // configured on the server) - no Connect control may appear.
    // The Gmail fixture reproduces the v1 copy nit: its gate reason
    // IS its status detail, verbatim.
    mocks.getSettingsConnections.mockResolvedValue(payload([
      conn({ id: "google_calendar", display_name: "Your Google Calendar", status: "gated", status_label: "Waiting on you", status_detail: "Google sign-in is not set up on this server yet.", gate: { code: "google_signin_not_set_up", reason_plain: "Google sign-in is not set up on this server yet.", founder_step: "x" }, actions: [] }),
      conn({ id: "gmail", display_name: "Your Gmail", status: "gated", status_label: "Waiting on you", status_detail: "Google sign-in is not set up on this server yet.", gate: { code: "google_signin_not_set_up", reason_plain: "Google sign-in is not set up on this server yet.", founder_step: "x" }, actions: [] }),
    ]));
    let section = await buildSettingsSection("connections", { session: null, bearer: "t" });
    for (const row of section.rows) {
      if (row.kind === "connection") {
        expect(row.hasRealFlow, row.id).toBe(false);
        expect(row.action, row.id).toBeNull();
        // The duplicated gate line is dropped at the builder.
        expect(row.gateReason, row.id).toBeNull();
      }
    }
    await render(<C2SettingsSection section={section} events={events} />);
    for (const id of ["google_calendar", "gmail"]) {
      const btn = container.querySelector<HTMLButtonElement>(`[data-testid="connection-action-${id}"]`)!;
      expect(btn, id).toBeTruthy();
      expect(btn.textContent).toBe("View");
      expect(btn.getAttribute("data-action-id")).toBe("view");
    }
    expect(container.textContent).not.toContain("Connect Google");
    // Tapping Gmail's View opens its detail; the shared sentence
    // appears exactly once in it (status line only, no repeat
    // under "What is holding it back").
    const gmailView = container.querySelector<HTMLButtonElement>('[data-testid="connection-action-gmail"]')!;
    await act(async () => { gmailView.click(); });
    const detail = container.querySelector('[data-testid="connection-detail-gmail"]')!;
    expect(detail).toBeTruthy();
    expect(detail.textContent!.split("Google sign-in is not set up on this server yet.").length - 1).toBe(1);
    expect(detail.textContent).not.toContain("What is holding it back");

    // Scenario 2: the payload carries the real enabled connect
    // action - the row's one action is Connect, marked as backed,
    // and tapping it fires the shell's real google-connect action.
    const connectAction = {
      kind: "connect", label: "Connect", enabled: true, disabled_reason: null,
      route: "POST /api/v1/product/connectors/google_calendar/start",
    };
    mocks.getSettingsConnections.mockResolvedValue(payload([
      conn({ id: "google_calendar", display_name: "Your Google Calendar", actions: [connectAction] }),
      conn({ id: "gmail", display_name: "Your Gmail", actions: [connectAction] }),
    ]));
    section = await buildSettingsSection("connections", { session: null, bearer: "t" });
    for (const row of section.rows) {
      if (row.kind === "connection") {
        expect(row.hasRealFlow, row.id).toBe(true);
        expect(row.action?.label, row.id).toBe("Connect");
      }
    }
    await render(<C2SettingsSection section={section} events={events} />);
    const row = container.querySelector('[data-testid="connection-row-google_calendar"]')!;
    expect(row.getAttribute("data-has-real-flow")).toBe("1");
    const actionBtn = container.querySelector<HTMLButtonElement>('[data-testid="connection-action-google_calendar"]')!;
    expect(actionBtn.textContent).toBe("Connect");
    expect(actionBtn.getAttribute("data-action-id")).toBe("google-connect");
    await act(async () => { actionBtn.click(); });
    expect(events.runAction).toHaveBeenCalledWith("connections", "google-connect");
  });

  it("a failed connectors read shows one short honest line and no tool rows - Custom still renders its real member", async () => {
    mocks.getSettingsConnections.mockRejectedValue(new Error("network"));
    const section = await buildSettingsSection("connections", { session: null, bearer: "t" });
    await render(<C2SettingsSection section={section} events={events} />);
    expect(container.textContent).toMatch(/Could not check your connectors/);
    expect(container.querySelector('[data-testid^="connection-row-"]')).toBeNull();
    expect(container.querySelector('[data-testid="c2-setting-row-saved-logins"]')).toBeTruthy();
  });

  it("the hub row is renamed Connectors and the folded room is gone from the hub", () => {
    const hub = youHubFromSession(null, false);
    expect(hub.index.find((e) => e.key === "connections")?.title).toBe("Connectors");
    expect(hub.index.find((e) => e.key === "connections")?.subtitle).toBe("Tools you connect yourself");
    expect(hub.index.find((e) => e.key === "what-opal-hears")).toBeUndefined();
    expect(JSON.stringify(hub.index)).not.toMatch(/DeepSeek|Twilio/);
  });

  it("PIN F-9(f) v2: Permissions binds to the real Soul assistance level, plain rows only, NO essay text", async () => {
    const section = await buildSettingsSection("connector-permissions", { session: null, bearer: "t" });
    expect(section.title).toBe("Permissions");
    expect(section.lede).toBe("When Opal asks before it acts.");
    await render(<C2SettingsSection section={section} events={events} />);
    expect(container.querySelector('[data-testid="c2-permissions-form"]')).toBeTruthy();
    // The raw enum seed never reaches the glass as a value row.
    expect(container.querySelector('[data-testid="c2-setting-row-assistance_level"]')).toBeNull();
    const text = container.textContent || "";
    // The v1 essay is gone, by name.
    for (const essay of [
      "In plain words", "second permissions store", "same setting as Soul's",
      "no separate per-tool permission switches", "The tools this applies to",
      "Quiet hours, your daily cap", "Opal offers help as things come up",
      "how much should it ask first",
    ]) {
      expect(text, `essay text ${essay} must not render`).not.toContain(essay);
    }
    // Plain-word rows only: the short same-setting line and the
    // two doorways, with no subtitles.
    expect(text).toContain("Same setting as Soul.");
    expect(container.querySelector('[data-testid="c2-setting-row-to-connectors"]')!.textContent).toBe("Connectors");
    expect(container.querySelector('[data-testid="c2-setting-row-to-soul"]')!.textContent).toBe("Soul");
    const minimal = container.querySelector<HTMLButtonElement>('[data-testid="c2-permissions-level-minimal"]')!;
    expect(minimal.textContent).toMatch(/Only when I ask/);
    await act(async () => { minimal.click(); });
    expect(events.saveSoulPreferences).toHaveBeenCalledWith({ assistance_level: "minimal" });
  });
});

describe("R21 Connectors expansion audit", () => {
  it("PIN R21: a connected Google grant renders Disconnect (never Connect) on both Google rows, and tapping it fires the shell's real google-disconnect action (the revoke entry)", async () => {
    // The backend shape for a connected grant (Settings.Connections
    // google_row, connected leg): each Google row carries ONLY the
    // enabled disconnect action, routed at the real revoke endpoint.
    const disconnectAction = {
      kind: "disconnect", label: "Disconnect", enabled: true, disabled_reason: null,
      route: "POST /api/v1/product/connectors/google_calendar/revoke",
    };
    mocks.getSettingsConnections.mockResolvedValue(payload([
      conn({ id: "google_calendar", display_name: "Your Google Calendar", status: "working", status_label: "Working", actions: [disconnectAction] }),
      conn({ id: "gmail", display_name: "Your Gmail", status: "working", status_label: "Working", actions: [disconnectAction] }),
    ]));
    const section = await buildSettingsSection("connections", { session: null, bearer: "t" });
    for (const row of section.rows) {
      if (row.kind === "connection") {
        expect(row.hasRealFlow, row.id).toBe(true);
        expect(row.action?.label, row.id).toBe("Disconnect");
        expect(row.action?.id, row.id).toBe("google-disconnect");
      }
    }
    await render(<C2SettingsSection section={section} events={events} />);
    for (const id of ["google_calendar", "gmail"]) {
      const btn = container.querySelector<HTMLButtonElement>(`[data-testid="connection-action-${id}"]`)!;
      expect(btn, id).toBeTruthy();
      expect(btn.textContent).toBe("Disconnect");
      expect(btn.getAttribute("data-action-id")).toBe("google-disconnect");
    }
    const gmailBtn = container.querySelector<HTMLButtonElement>('[data-testid="connection-action-gmail"]')!;
    await act(async () => { gmailBtn.click(); });
    expect(events.runAction).toHaveBeenCalledWith("connections", "google-disconnect");
    expect(events.runAction).not.toHaveBeenCalledWith("connections", "google-connect");
  });

  it("PIN R21: the allowlist is CLOSED - a payload row for a tool with no audited real flow (Instagram / Spotify / Google Drive class) never renders, even when the payload paints it an enabled connect action", async () => {
    // R21 audit (r21-connectors-report.md): no OAuth/permission flow
    // exists in the codebase for these providers - no adapter, no
    // routes, no client entry. Until a real flow lands AND the id is
    // deliberately allowlisted, the room must not render the row in
    // any form: absent + declared beats present + painted.
    const paintedAction = {
      kind: "connect", label: "Connect", enabled: true, disabled_reason: null,
      route: "POST /api/v1/product/connectors/painted/start",
    };
    mocks.getSettingsConnections.mockResolvedValue(payload([
      conn({ id: "google_calendar", display_name: "Your Google Calendar" }),
      conn({ id: "gmail", display_name: "Your Gmail" }),
      conn({ id: "instagram", display_name: "Your Instagram", actions: [paintedAction] }),
      conn({ id: "spotify", display_name: "Your Spotify", actions: [paintedAction] }),
      conn({ id: "google_drive", display_name: "Your Google Drive", actions: [paintedAction] }),
    ]));
    const section = await buildSettingsSection("connections", { session: null, bearer: "t" });
    const connectionRows = section.rows.filter((r) => r.kind === "connection");
    expect(connectionRows.map((r) => r.id)).toEqual(["google_calendar", "gmail"]);
    await render(<C2SettingsSection section={section} events={events} />);
    const text = container.textContent || "";
    for (const absent of ["Instagram", "Spotify", "Google Drive"]) {
      expect(text, `${absent} must not render`).not.toContain(absent);
    }
    for (const id of ["instagram", "spotify", "google_drive"]) {
      expect(container.querySelector(`[data-testid="connection-row-${id}"]`)).toBeNull();
      expect(container.querySelector(`[data-testid="connection-action-${id}"]`)).toBeNull();
    }
    // No Social category appears for the absent social rows.
    expect(container.querySelector('[data-testid="connection-category-social"]')).toBeNull();
  });

  it("PIN R21: a gated row exposes NO live connect action - its only control is View (Declaration: gated rows stay in the room's honest form)", async () => {
    // The capture-world shape: OAuth unconfigured on the server, so
    // the payload carries a gate and NO actions. The builder must
    // not synthesize a Connect from the gate, the status, or the id.
    mocks.getSettingsConnections.mockResolvedValue(payload([
      conn({ id: "google_calendar", display_name: "Your Google Calendar", status: "gated", status_label: "Waiting on you", status_detail: "Google sign-in is not set up on this server yet.", gate: { code: "google_signin_not_set_up", reason_plain: "A different gate sentence.", founder_step: "x" }, actions: [] }),
    ]));
    const section = await buildSettingsSection("connections", { session: null, bearer: "t" });
    const row = section.rows.find((r) => r.kind === "connection")!;
    expect(row.kind).toBe("connection");
    if (row.kind === "connection") {
      expect(row.hasRealFlow).toBe(false);
      expect(row.action).toBeNull();
      // A gate reason that DIFFERS from the status detail is kept
      // (only a verbatim repeat is dropped - R20 Declaration #8).
      expect(row.gateReason).toBe("A different gate sentence.");
    }
    await render(<C2SettingsSection section={section} events={events} />);
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="connection-action-google_calendar"]')!;
    expect(btn.textContent).toBe("View");
    await act(async () => { btn.click(); });
    expect(events.runAction).not.toHaveBeenCalled();
    const detail = container.querySelector('[data-testid="connection-detail-google_calendar"]')!;
    expect(detail.textContent).toContain("What is holding it back");
    expect(detail.textContent).toContain("A different gate sentence.");
  });
});

describe("R20 F-10 Center assets", () => {
  const openingEvents = () => ({
    openGraph: vi.fn(),
    makeSomethingHappen: vi.fn(),
    completeSlot: vi.fn(),
    openCenterChat: vi.fn(),
    openSoulMemory: vi.fn(),
  });
  const projection = {
    greeting: "Good morning, Sam.",
    presence: "idle" as const,
    celebrateOnce: false,
    needsYou: [],
    next: null,
    comingUp: [],
    forming: [],
  };

  it("each asset fires its real handler; the explainer is folded behind the (i), not a card (R21 W-11)", async () => {
    const ev = openingEvents();
    await render(<C2CenterOpening projection={projection} events={ev} />);
    const create = container.querySelector<HTMLButtonElement>('[data-testid="c2-opening-create"]')!;
    const talk = container.querySelector<HTMLButtonElement>('[data-testid="c2-opening-talk"]')!;
    expect(create.className).toMatch(/c2s-center-asset/);
    expect(talk.className).toMatch(/c2s-center-asset/);
    // R21 W-11 (Discovery Doctrine): the "How Opal works for you"
    // explainer CARD is gone; its words live behind the shell's
    // one (i) affordance, and the orb is the doorway.
    expect(container.querySelector('[data-testid="c2-opening-soul-memory"]')).toBeNull();
    expect(container.querySelector('[data-testid="c2-opening-soul-memory-info"]')).toBeTruthy();
    expect(container.textContent).not.toMatch(/Soul and Memory - how Opal is with you/);
    await act(async () => { create.click(); });
    expect(ev.makeSomethingHappen).toHaveBeenCalledTimes(1);
    await act(async () => { talk.click(); });
    expect(ev.openCenterChat).toHaveBeenCalledTimes(1);
    const orb = container.querySelector<HTMLButtonElement>('[data-testid="c2-center-orb-doorway"]')!;
    expect(orb.className).toMatch(/c2s-center-orb-doorway/);
    await act(async () => { orb.click(); });
    expect(ev.openSoulMemory).toHaveBeenCalledTimes(1);
  });

  it("PIN: the pressed/active treatment for all three assets exists in the stylesheet", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const css = readFileSync(resolve(here, "./c2shell.css"), "utf8");
    expect(css).toMatch(/\.c2s-center-asset:active/);
    expect(css).toMatch(/\.c2s-center-orb-doorway:active/);
    expect(css).toMatch(/\.c2s-btn-quiet:active/);
    // R21 W-11 disposal pin: the explainer doorway's CSS is gone
    // with the card - absence, not layering.
    expect(css).not.toMatch(/\.c2s-center-doorway/);
  });

  it("PIN (design compass, founder 2026-10-20): the pressed treatment is a RING, the connector mark is an orbit mark, and Home's lead carries the ring mark", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const css = readFileSync(resolve(here, "./c2shell.css"), "utf8");
    // Pressed Center asset: an orbit ring drawn around it, not a flat fill alone.
    expect(css).toMatch(/\.c2s-center-asset:active,\s*\.c2s-center-asset:focus-visible\s*\{[^}]*box-shadow: 0 0 0 2px var\(--accent-quiet\)/);
    // Connector mark: a point riding the ring (::after dot on the ring disc).
    expect(css).toMatch(/\.c2s-connection-icon::after\s*\{[^}]*border-radius: 999px/);
    // R21: Home's labeled leads are GONE (Discovery Doctrine -
    // shape is the label); the Moment Stone's happening fire is
    // the state border the compass points at now.
    // R21 round 3 (F-A) RE-POINT: the stone went ROUND and its
    // state moved onto the ORBIT RING element - the compass now
    // points at the ring's happening treatment (the marbled
    // fire ring carrying the happening glow). Same intent: a
    // happening stone on Home's lead burns in happening light.
    // R23 AMENDMENT (IF-1 two-tier law; provenance in this
    // file's header): the flat 14px pin is replaced by the two
    // tiers - the happening ring's RESTING shadow is the 8px
    // glow-room token, and the 14px bloom exists ONLY under
    // the attention stamp (data-glow="attention").
    expect(css).toMatch(/\.c2s-stone\[data-state="happening"\] \.c2s-stone-ring\s*\{[^}]*box-shadow: 0 0 var\(--stream-glow-room\) var\(--orb-indicator-happening-glow\)/);
    expect(css).toMatch(/\.c2s-stone\[data-glow="attention"\] \.c2s-stone-ring\s*\{[^}]*box-shadow: 0 0 14px var\(--orb-indicator-happening-glow\)/);
    // The compass never borrows a state color for these treatments.
    const compassCss = css.slice(css.indexOf("DESIGN COMPASS"), css.indexOf(".c2s-connection-detail"));
    expect(compassCss).not.toMatch(/--state-(action|ready|forming|happening)/);
    expect(compassCss).not.toMatch(/--orb-indicator/);
  });
});

describe("R20 F-18 D-5 Home vs Center", () => {
  it("Home declares the people-and-moments purpose and leads with people; Center declares the working purpose and leads with Needs you", async () => {
    await render(
      <C2Home
        projection={{
          header: { ownAvatar: avatarOf("Sam Rivera") },
          rail: {
            self: { avatar: avatarOf("Sam Rivera"), hasLiveStory: false, liveStoryLabel: null, story: null },
            stories: [],
            capabilities: { canPost: true, canStory: true },
          },
          feed: [
            {
              kind: "memory", id: "m1", photoUrl: null, photoProvenance: null,
              contextLine: "Golden hour", authorLine: "Maya Chen",
              authorName: "Maya Chen", authorAvatar: avatarOf("Maya Chen"),
            },
          ],
          feedError: null,
        }}
        events={{
          openYou: vi.fn(), openSearch: vi.fn(), openActivity: vi.fn(),
          openGraph: vi.fn(), onShared: vi.fn(),
        }}
      />,
    );
    const home = container.querySelector('[data-testid="c2-home"]')!;
    expect(home.getAttribute("data-surface-purpose")).toBe("people-and-moments");
    // R21 (W-9 rebuild; F-18 REOPENED and re-closed at the glass):
    // composition, not labels - Moment Stones lead, the braided
    // stream follows, and NO labeled section headers exist
    // (Discovery Doctrine). The R20 markup leads are disposed.
    expect(container.querySelector('[data-testid="c2-moment-stones"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="c2-story-rail"]')).toBeNull();
    expect(container.querySelector('[data-testid="c2-home-lead-people"]')).toBeNull();
    expect(container.querySelector('[data-testid="c2-home-lead-moments"]')).toBeNull();

    await render(
      <C2CenterOpening
        projection={{
          greeting: "Good morning, Sam.",
          presence: "idle",
          celebrateOnce: false,
          needsYou: [{
            id: "p1", stateFamily: "action", stateLabel: "Needs you",
            title: "Dinner at Juniper", whenLine: "Saturday, 7:00 PM",
            whereLine: "Juniper and Ivy", attendanceLine: null, primaryActionLabel: null,
          }],
          next: null, comingUp: [], forming: [],
        }}
        events={{ openGraph: vi.fn(), makeSomethingHappen: vi.fn(), completeSlot: vi.fn() }}
      />,
    );
    const center = container.querySelector('[data-testid="c2-center-opening"]')!;
    expect(center.getAttribute("data-surface-purpose")).toBe("opal-working");
    expect(container.querySelector('[data-testid="c2-opening-needs-you"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="c2-moment-stones"]')).toBeNull();
  });

  it("Home composition interleaves people's moments with plan cards instead of leading with every plan (Center's deck keeps plan lead)", async () => {
    mocks.listOpalPlans.mockResolvedValue({
      plans: [
        { id: "p-ready", title: "Dinner", status: "ready", location: "Juniper", time_label: "Sat 7pm" },
        { id: "p-forming", title: "Beach walk", status: "idea", location: null, time_label: null },
      ],
    });
    mocks.fetchHomeFeed.mockResolvedValue({
      mode: "live",
      objects: [
        { id: "m-1", object_type: "memory", caption: "First moment", actor: { display_name: "Riley" } },
        { id: "m-2", object_type: "memory", caption: "Second moment", actor: { display_name: "Riley" } },
      ],
      stories: [],
    });
    const home = await homeFromSession(null, "tok");
    const kinds = home.feed.map((f) => f.kind);
    // First feed item after any live is a person's moment, not a plan.
    expect(kinds[0]).toBe("memory");
    expect(home.feed.filter((f) => f.kind === "plan").map((f) => f.id)).toEqual(["p-ready", "p-forming"]);
  });
});
