/**
 * @vitest-environment jsdom
 *
 * Repair #18 DIR-2 — Settings architecture + Connections.
 *
 * What these prove (jsdom layer):
 *  - Findability (surface map entry 19): every Settings destination
 *    in the §4A architecture (12.1-12.9) is a row on the You hub —
 *    at most 2 taps from the dock — and the settings search finds
 *    the real section registry (Soul, Connections, Quiet...).
 *  - Connections DOM == payload (verification report Part 4.8): the
 *    rendered status text and data attribute for every row equal
 *    the server payload's status / status_label verbatim, including
 *    the simulated Google row (FR-18-09 at the C2 glass).
 *  - Honest gated sections: Approvals + activity renders plain gate
 *    words and NO controls (Soul + Memory was gated here until the
 *    SM scoped build made it real - its test now asserts the build);
 *    "How Opal helps"
 *    carries only today's true controls — the operational-modes
 *    picker MUST NOT SHIP (presentation spec section 8, D-8).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSettingsConnections: vi.fn(),
  getAssistPreference: vi.fn(),
  getGoogleCalendarStatus: vi.fn(),
  getMessagingPreferences: vi.fn(),
  getSoulMemory: vi.fn(),
}));

vi.mock("../../api/productClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/productClient")>();
  return {
    ...actual,
    getSettingsConnections: mocks.getSettingsConnections,
    getAssistPreference: mocks.getAssistPreference,
    getGoogleCalendarStatus: mocks.getGoogleCalendarStatus,
    getMessagingPreferences: mocks.getMessagingPreferences,
    getSoulMemory: mocks.getSoulMemory,
  };
});

import { C2SettingsSection, C2YouHub, type C2YouEvents } from "./C2You";
import { buildSettingsSection, youHubFromSession } from "./shellData";
import type { SettingsConnectionsPayload } from "../../api/productClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const events: C2YouEvents = {
  editProfile: vi.fn(),
  openSection: vi.fn(),
  backToHub: vi.fn(),
  setPreference: vi.fn(async () => undefined),
  runAction: vi.fn(),
  saveProfileFields: vi.fn(async () => undefined),
  submitSupportReport: vi.fn(async () => ({ reference: "OPAL-TEST1" })),
  setModePreference: vi.fn(),
  modePreference: "system",
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  mocks.getSettingsConnections.mockReset();
  mocks.getAssistPreference.mockReset();
  mocks.getGoogleCalendarStatus.mockReset();
  mocks.getMessagingPreferences.mockReset();
  mocks.getSoulMemory.mockReset();
  mocks.getSoulMemory.mockResolvedValue({
    wallet: { id: "w1", owner_user_id: "u1", created_at: null },
    soul: {
      user_id: "u1",
      assistance_level: "balanced",
      assistance_level_label: "A balanced amount of help",
      quiet_hours_start: "22:00",
      quiet_hours_end: "08:00",
      quiet_hours_label: "Quiet hours - 22:00 to 08:00",
      timezone: "America/Los_Angeles",
      max_proactive_signals_per_day: 3,
      completion_feedback: "standard",
      motion_preference: "system",
    },
    capsules: [],
    capsule_count: 0,
  });
  mocks.getMessagingPreferences.mockResolvedValue({
    read_receipts_enabled: true,
    message_notifications_enabled: true,
    notifications_paused: false,
  });
  mocks.getAssistPreference.mockResolvedValue({ assist_calls_enabled: true });
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

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;
  act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
}

const SECTION_KEYS = [
  "edit-profile",
  "appearance",
  "soul-memory",
  "what-opal-remembers",
  "how-opal-helps",
  "calls-assist",
  "approvals-activity",
  "what-opal-hears",
  "connections",
  "connected-sources",
  "privacy",
  "notifications",
  "linked-devices",
  "location-travel",
  "account-security",
  "help-support",
  "care",
];

describe("Settings architecture - doorway reachability (entry 19)", () => {
  it("every §4A destination is a hub row (<=2 taps from the dock)", async () => {
    const hub = youHubFromSession(null, false);
    await render(<C2YouHub projection={hub} events={events} />);
    for (const key of SECTION_KEYS) {
      expect(
        container.querySelector(`[data-testid="c2-you-row-${key}"]`),
        `hub row for ${key}`,
      ).toBeTruthy();
    }
  });

  it("settings search searches the real section registry", async () => {
    const hub = youHubFromSession(null, false);
    await render(<C2YouHub projection={hub} events={events} />);
    const input = container.querySelector<HTMLInputElement>(
      '[data-testid="c2-you-search"]',
    )!;
    setInputValue(input, "connections");
    expect(
      container.querySelectorAll('[data-testid="c2-you-search-result"]').length,
    ).toBeGreaterThan(0);
    expect(container.textContent).toMatch(/Connections/);
    setInputValue(input, "soul");
    expect(container.textContent).toMatch(/Soul \+ Memory/);
    setInputValue(input, "quiet");
    expect(container.textContent).toMatch(/Quiet/);
  });

  it("hub summary never calls a simulated Google connection connected", () => {
    const hub = youHubFromSession(null, "simulated");
    expect(hub.connectedSummary).toMatch(/simulated/i);
    expect(hub.connectedSummary).not.toBe("Google Calendar connected.");
  });
});

const PAYLOAD: SettingsConnectionsPayload = {
  generated_at: "2026-10-18T13:41:00Z",
  build_ref: "test",
  environment: "test",
  connections: [
    {
      id: "deepseek",
      display_name: "Opal's thinking (DeepSeek)",
      category: "intelligence",
      powers: "Reads your messages and helps Opal reply, plan, and remember decisions.",
      status: "working",
      status_label: "Working",
      status_detail: "Checked Oct 18, 2026 - this is working.",
      credential_status: "present",
      provider_status: "verified",
      function_status: "working",
      provenance: "real",
      mode: "live",
      verification_basis: "probe_and_function",
      last_verified_at: "2026-10-18T13:41:00Z",
      gate: null,
      actions: [],
    },
    {
      id: "twilio_messaging",
      display_name: "Invite texts (Twilio)",
      category: "phone_and_messaging",
      powers: "Texts invitations to people who are not on Opal yet.",
      status: "gated",
      status_label: "Waiting on you",
      status_detail: "Opal has no sender to text invites from yet.",
      credential_status: "present",
      provider_status: "verified",
      function_status: "gated",
      provenance: "real",
      mode: "live",
      verification_basis: "probe_and_function",
      last_verified_at: null,
      gate: {
        code: "twilio_sender_missing",
        reason_plain: "Opal has no sender to text invites from yet.",
        founder_step: "In Twilio Console, create a Messaging Service.",
      },
      actions: [],
    },
    {
      id: "duffel",
      display_name: "Flights (Duffel)",
      category: "travel",
      powers: "Searches flights and, when you say so, books them.",
      status: "working_test",
      status_label: "Working - test mode",
      status_detail: "Checked Oct 18, 2026 - working in test mode.",
      credential_status: "present",
      provider_status: "verified",
      function_status: "working",
      provenance: "test_provider",
      mode: "test",
      verification_basis: "probe_and_function",
      last_verified_at: "2026-10-18T13:41:00Z",
      gate: null,
      actions: [],
    },
    {
      id: "google_calendar",
      display_name: "Your Google Calendar",
      category: "your_accounts",
      powers: "Lets Opal check busy times when a plan needs a time. Read only.",
      status: "simulated",
      status_label: "Simulated - not a real connection",
      status_detail: "This is a test stand-in, not a real connection.",
      credential_status: "user_grant",
      provider_status: "unverified",
      function_status: "unproven",
      provenance: "simulated",
      mode: "simulated",
      verification_basis: "function_evidence",
      last_verified_at: null,
      gate: null,
      actions: [
        {
          kind: "disconnect",
          label: "Disconnect",
          route: "POST /api/v1/product/connectors/google_calendar/revoke",
          enabled: true,
          disabled_reason: null,
        },
      ],
    },
  ],
};

describe("Connections section - DOM status equals payload status", () => {
  it("renders every payload status verbatim, simulated never Connected", async () => {
    mocks.getSettingsConnections.mockResolvedValue(PAYLOAD);
    const section = await buildSettingsSection("connections", {
      session: null,
      bearer: "t",
    });
    await render(<C2SettingsSection section={section} events={events} />);
    for (const conn of PAYLOAD.connections) {
      const statusEl = container.querySelector(
        `[data-testid="connection-status-${conn.id}"]`,
      );
      expect(statusEl, conn.id).toBeTruthy();
      expect(statusEl!.textContent).toBe(conn.status_label);
      const row = container.querySelector(`[data-testid="connection-row-${conn.id}"]`);
      expect(row!.getAttribute("data-connection-status")).toBe(conn.status);
    }
    const googleStatus = container.querySelector(
      '[data-testid="connection-status-google_calendar"]',
    )!;
    expect(googleStatus.textContent).toBe("Simulated - not a real connection");
    expect(googleStatus.textContent).not.toBe("Connected");
    // The gated row shows the plain gate reason from the payload.
    expect(container.textContent).toMatch(/no sender to text invites from yet/);
    // The payload's Google disconnect descriptor becomes a real action row.
    expect(
      container.querySelector('[data-testid="c2-setting-row-google-disconnect"]'),
    ).toBeTruthy();
  });

  it("a failed connections read renders one honest unknown, never a guessed list", async () => {
    mocks.getSettingsConnections.mockRejectedValue(new Error("network"));
    const section = await buildSettingsSection("connections", {
      session: null,
      bearer: "t",
    });
    await render(<C2SettingsSection section={section} events={events} />);
    expect(container.textContent).toMatch(/Could not check connections/);
    expect(container.querySelector('[data-testid^="connection-row-"]')).toBeNull();
  });

  it("connected-sources paints a simulated Google row as simulated (FR-18-09)", async () => {
    mocks.getGoogleCalendarStatus.mockResolvedValue({
      provider: "google_calendar",
      connected: true,
      status: "connected_simulated",
      simulated: true,
      scopes: [],
      token_present: true,
      last_synced_at: null,
    });
    const section = await buildSettingsSection("connected-sources", {
      session: null,
      bearer: "t",
    });
    const valueRow = section.rows.find((r) => r.id === "google-status");
    expect(valueRow).toMatchObject({ value: "Simulated - not a real connection" });
  });
});

describe("Honest gated sections - no painted controls", () => {
  it("Soul + Memory is BUILT (SM scoped build): real soul form, zero switches, no gate copy", async () => {
    const section = await buildSettingsSection("soul-memory", { session: null });
    await render(<C2SettingsSection section={section} events={events} />);
    expect(container.textContent).not.toMatch(/not built yet/);
    expect(container.querySelector('[data-testid="c2-soul-form"]')).toBeTruthy();
    expect(container.querySelectorAll('[role="switch"]')).toHaveLength(0);
  });

  it("Approvals + activity is gated in plain words with zero switches", async () => {
    const section = await buildSettingsSection("approvals-activity", { session: null });
    await render(<C2SettingsSection section={section} events={events} />);
    expect(container.textContent).toMatch(/not built yet/);
    expect(container.querySelectorAll('[role="switch"]')).toHaveLength(0);
  });

  it("How Opal helps ships NO modes picker (D-8 blocker) - only the true Assist switch", async () => {
    const section = await buildSettingsSection("how-opal-helps", {
      session: null,
      bearer: "t",
    });
    await render(<C2SettingsSection section={section} events={events} />);
    expect(container.querySelectorAll('[role="switch"]')).toHaveLength(1);
    expect(
      container.querySelector('[data-testid="c2-setting-toggle-assist"]'),
    ).toBeTruthy();
    const text = container.textContent || "";
    expect(text).not.toMatch(/Check with me first/);
    expect(text).not.toMatch(/Handle the small things/);
    expect(text).not.toMatch(/Keep things moving for me/);
    expect(text).toMatch(/not built yet/);
  });

  it("What Opal hears names each source with its honest state", async () => {
    const section = await buildSettingsSection("what-opal-hears", { session: null });
    await render(<C2SettingsSection section={section} events={events} />);
    const text = container.textContent || "";
    expect(text).toMatch(/Working now/);
    expect(text).toMatch(/Not wired yet/);
    expect(text).toMatch(/Waiting on a sending number/);
    expect(text).toMatch(/Not in Opal today/);
    expect(container.querySelectorAll('[role="switch"]')).toHaveLength(0);
  });
});

describe("Muse settings audit Group A (4.A1-4.A9)", () => {
  it("A1: connections render as a categorized catalog of exactly the payload set", async () => {
    mocks.getSettingsConnections.mockResolvedValue(PAYLOAD);
    const section = await buildSettingsSection("connections", {
      session: null,
      bearer: "t",
    });
    await render(<C2SettingsSection section={section} events={events} />);
    // Golden list: rendered connection rows == payload connections, in order.
    const renderedIds = [...container.querySelectorAll('[data-testid^="connection-row-"]')].map(
      (el) => el.getAttribute("data-testid")!.replace("connection-row-", ""),
    );
    expect(renderedIds).toEqual(PAYLOAD.connections.map((c) => c.id));
    // Category headers group the catalog, in payload order.
    const text = container.textContent || "";
    const thinking = text.indexOf("Thinking and words");
    const phone = text.indexOf("Phone and messaging");
    const travel = text.indexOf("Travel");
    const yours = text.indexOf("Your accounts");
    expect(thinking).toBeGreaterThan(-1);
    expect(phone).toBeGreaterThan(thinking);
    expect(travel).toBeGreaterThan(phone);
    expect(yours).toBeGreaterThan(travel);
    // The custom-connections slot is reserved in words only - no control.
    expect(text).toMatch(/Connecting a service of your own is not something Opal offers today/);
  });

  it("A2: Quiet opens with Pause everything, holding the real flag, per-kind untouched", async () => {
    mocks.getMessagingPreferences.mockResolvedValue({
      read_receipts_enabled: true,
      message_notifications_enabled: false,
      notifications_paused: true,
    });
    const section = await buildSettingsSection("notifications", {
      session: null,
      bearer: "t",
    });
    const toggles = section.rows.filter((r) => r.kind === "toggle");
    expect(toggles[0]).toMatchObject({ id: "pause-everything", value: true });
    expect(toggles[1]).toMatchObject({ id: "messages-calls", value: false });
    const setPreference = vi.fn(async () => undefined);
    await render(
      <C2SettingsSection section={section} events={{ ...events, setPreference }} />,
    );
    const pause = container.querySelector<HTMLButtonElement>(
      '[data-testid="c2-setting-toggle-pause-everything"]',
    )!;
    expect(pause.getAttribute("aria-checked")).toBe("true");
    await act(async () => {
      pause.click();
    });
    expect(setPreference).toHaveBeenCalledWith("notifications", "pause-everything", false);
  });

  it("A3: appearance preview renders the real mark and plan card in the chosen mode", async () => {
    const section = await buildSettingsSection("appearance", { session: null });
    await render(
      <C2SettingsSection section={section} events={{ ...events, modePreference: "dark" }} />,
    );
    const preview = container.querySelector('[data-testid="c2-appearance-preview"]');
    expect(preview).toBeTruthy();
    expect(preview!.getAttribute("data-mode-preference")).toBe("dark");
    expect(preview!.querySelector('[data-testid="c2-plan-card"]')).toBeTruthy();
    expect(preview!.textContent).toMatch(/Preview/);
  });

  it("A4+A7+A8: Privacy opens with the plain card; every named control exists; legal rows real", async () => {
    const section = await buildSettingsSection("privacy", { session: null });
    await render(<C2SettingsSection section={section} events={events} />);
    const text = container.textContent || "";
    expect(text).toMatch(/In plain words/);
    // Every control the card names is a row on this very page.
    expect(container.querySelector('[data-testid="c2-setting-row-remembers"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="c2-setting-row-sources"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="c2-setting-row-connections"]')).toBeTruthy();
    // A7 card.
    expect(text).toMatch(/About Opal's messages/);
    expect(text).toMatch(/generated/);
    // A8 rows open the published documents.
    expect(container.querySelector('[data-testid="c2-setting-row-privacy-policy"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="c2-setting-row-terms-of-service"]')).toBeTruthy();
  });

  it("A6: Help & support doorway rows open the real report and feedback pages", async () => {
    const section = await buildSettingsSection("help-support", { session: null });
    await render(<C2SettingsSection section={section} events={events} />);
    expect(container.querySelector('[data-testid="c2-setting-row-report"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="c2-setting-row-feedback"]')).toBeTruthy();
    expect(container.textContent).toMatch(/not published yet/);
    const account = await buildSettingsSection("account-security", { session: null });
    expect(account.rows.some((r) => r.id === "help")).toBe(true);
  });

  it("A5: report form discloses its payload, guards empty text, and shows the reference", async () => {
    const section = await buildSettingsSection("report-problem", { session: null });
    const submitSupportReport = vi.fn(async () => ({ reference: "OPAL-TEST1" }));
    await render(
      <C2SettingsSection
        section={section}
        events={{ ...events, submitSupportReport }}
      />,
    );
    expect(container.textContent).toMatch(/What is included/);
    const submit = container.querySelector<HTMLButtonElement>(
      '[data-testid="c2-support-submit"]',
    )!;
    expect(submit.disabled).toBe(true);
    const body = container.querySelector<HTMLTextAreaElement>(
      '[data-testid="c2-support-body"]',
    )!;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value",
    )?.set;
    act(() => {
      setter?.call(body, "The plan card never loaded.");
      body.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
    expect(
      container.querySelector<HTMLButtonElement>('[data-testid="c2-support-submit"]')!
        .disabled,
    ).toBe(false);
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[data-testid="c2-support-submit"]')!
        .click();
    });
    expect(submitSupportReport).toHaveBeenCalledWith(
      "problem",
      "something_broke",
      "The plan card never loaded.",
    );
    expect(container.querySelector('[data-testid="c2-support-sent"]')!.textContent).toMatch(
      /OPAL-TEST1/,
    );
  });

  it("A9: the You hub footer shows the served build from the build stamp", async () => {
    document.documentElement.setAttribute("data-git-head", "abc1234");
    try {
      const hub = youHubFromSession(null, false);
      await render(<C2YouHub projection={hub} events={events} />);
      const footer = container.querySelector('[data-testid="c2-you-build"]');
      expect(footer).toBeTruthy();
      expect(footer!.textContent).toBe("Build · abc1234");
    } finally {
      document.documentElement.removeAttribute("data-git-head");
    }
  });
});
