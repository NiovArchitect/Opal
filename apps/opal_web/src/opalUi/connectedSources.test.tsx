/**
 * Repair #15 (DF) - Connected sources: the Google connector row in
 * You -> Privacy is REAL (R13 law: wired or hidden, never painted-but-dead).
 *
 * - projectGoogleConnection is a pure projection of the backend
 *   ProviderConnections status payload; unknown/failed reads never
 *   guess Connected or Not connected.
 * - The render test drives YouSettingsDestination (Privacy) with the
 *   status endpoint mocked at the productClient boundary - the same
 *   boundary the real ConnectorController sits behind.
 * - Source guards: the three client functions hit the real router paths,
 *   and no unbacked category (contacts / health / business / device
 *   connectors) is painted.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductSession } from "../api/productClient";

const mocks = vi.hoisted(() => ({
  getGoogleCalendarStatus: vi.fn(),
}));

vi.mock("../api/productClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/productClient")>();
  return {
    ...actual,
    getGoogleCalendarStatus: mocks.getGoogleCalendarStatus,
  };
});

import {
  ConnectedSourcesSection,
  YouSettingsDestination,
  projectGoogleConnection,
} from "./YouSettingsDestination";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const here = dirname(fileURLToPath(import.meta.url));
const youSrc = readFileSync(join(here, "YouSettingsDestination.tsx"), "utf8");
const clientSrc = readFileSync(join(here, "../api/productClient.ts"), "utf8");

const session = {
  user_id: "user-test-1",
  access_token: "test-token",
  display_name: "Test Person",
  handle: "testperson",
} as unknown as ProductSession;

describe("projectGoogleConnection (pure projection of backend status)", () => {
  it("connected status projects Connected", () => {
    const p = projectGoogleConnection({
      provider: "google_calendar",
      connected: true,
      status: "connected",
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
      token_present: true,
    });
    expect(p.state).toBe("connected");
    expect(p.label).toBe("Connected");
  });

  it("absent row projects Not connected (never_connected)", () => {
    const p = projectGoogleConnection({
      provider: "google_calendar",
      connected: false,
      status: "not_connected",
      scopes: [],
      token_present: false,
    });
    expect(p.state).toBe("not_connected");
    expect(p.label).toBe("Not connected");
  });

  it("revoked projects Not connected with the manual-availability truth", () => {
    const p = projectGoogleConnection({
      provider: "google_calendar",
      connected: false,
      status: "revoked",
      scopes: [],
      token_present: false,
    });
    expect(p.state).toBe("not_connected");
    expect(p.detail).toMatch(/by hand still works/);
  });

  it("FR-18-09: a simulated status projects Simulated, NEVER Connected (HA-01 at the glass)", () => {
    const p = projectGoogleConnection({
      provider: "google_calendar",
      connected: true,
      status: "connected_simulated",
      simulated: true,
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
      token_present: true,
    });
    expect(p.state).toBe("simulated");
    expect(p.label).toBe("Simulated - not a real connection");
    expect(p.label).not.toBe("Connected");
  });

  it("FR-18-09: the connected_simulated status string alone forces Simulated", () => {
    const p = projectGoogleConnection({
      provider: "google_calendar",
      connected: true,
      status: "connected_simulated",
      scopes: [],
      token_present: true,
    });
    expect(p.state).toBe("simulated");
    expect(p.label).not.toBe("Connected");
  });

  it("no status yet projects Checking, never a guessed state", () => {
    const p = projectGoogleConnection(null);
    expect(p.state).toBe("unknown");
    expect(p.label).toBe("Checking");
  });

  it("failed read projects Could not check, never a guessed state", () => {
    const p = projectGoogleConnection(null, true);
    expect(p.state).toBe("unknown");
    expect(p.label).toBe("Could not check");
  });
});

describe("Connected sources - client wire + painted inventory", () => {
  it("client functions hit the real ConnectorController routes", () => {
    expect(clientSrc).toMatch(/getGoogleCalendarStatus/);
    expect(clientSrc).toContain("/api/v1/product/connectors/google_calendar");
    expect(clientSrc).toContain("/api/v1/product/connectors/google_calendar/start");
    expect(clientSrc).toContain("/api/v1/product/connectors/google_calendar/revoke");
  });

  it("section is filed into the Privacy destination", () => {
    expect(youSrc).toMatch(/<ConnectedSourcesSection session=\{session\} \/>/);
    expect(youSrc).toMatch(/data-testid="connected-sources-google"/);
  });

  it("paints no unbacked connector category", () => {
    const sectionStart = youSrc.indexOf("export function ConnectedSourcesSection");
    const sectionEnd = youSrc.indexOf("Privacy Access layer", sectionStart);
    const section = youSrc.slice(sectionStart, sectionEnd);
    expect(section).not.toMatch(/Apple Health|Health Connect|Contacts sync|WhatsApp|Slack/);
    expect(section).not.toMatch(/connected sources?.{0,40}Contacts/s);
  });

  it("plain-language scope copy names the real read-only scopes", () => {
    expect(youSrc).toMatch(/read-only/);
    expect(youSrc).toMatch(/cannot send, change, or delete/);
  });
});

describe("ConnectedSourcesSection render (status endpoint mocked)", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.getGoogleCalendarStatus.mockReset();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("connected backend status renders Connected + Disconnect, no Connect", async () => {
    mocks.getGoogleCalendarStatus.mockResolvedValue({
      provider: "google_calendar",
      connected: true,
      status: "connected",
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
      token_present: true,
    });
    await act(async () => {
      root.render(<ConnectedSourcesSection session={session} />);
    });
    const text = container.textContent || "";
    expect(text).toMatch(/Google Calendar and email/);
    expect(text).toMatch(/Connected/);
    expect(container.querySelector('[data-testid="connected-sources-google-disconnect"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="connected-sources-google-connect"]')).toBeNull();
    expect(
      container
        .querySelector('[data-testid="connected-sources-google"]')
        ?.getAttribute("data-connection-state"),
    ).toBe("connected");
  });

  it("FR-18-09: simulated backend status renders Simulated + Disconnect, never Connected, no Connect", async () => {
    mocks.getGoogleCalendarStatus.mockResolvedValue({
      provider: "google_calendar",
      connected: true,
      status: "connected_simulated",
      simulated: true,
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
      token_present: true,
    });
    await act(async () => {
      root.render(<ConnectedSourcesSection session={session} />);
    });
    const statusEl = container.querySelector(
      '[data-testid="connected-sources-google-status"]',
    );
    expect(statusEl?.textContent).toBe("Simulated - not a real connection");
    expect(
      container
        .querySelector('[data-testid="connected-sources-google"]')
        ?.getAttribute("data-connection-state"),
    ).toBe("simulated");
    expect(container.querySelector('[data-testid="connected-sources-google-disconnect"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="connected-sources-google-connect"]')).toBeNull();
  });

  it("not-connected backend status renders Not connected + Connect, no Disconnect", async () => {
    mocks.getGoogleCalendarStatus.mockResolvedValue({
      provider: "google_calendar",
      connected: false,
      status: "not_connected",
      scopes: [],
      token_present: false,
    });
    await act(async () => {
      root.render(<ConnectedSourcesSection session={session} />);
    });
    const text = container.textContent || "";
    expect(text).toMatch(/Not connected/);
    expect(container.querySelector('[data-testid="connected-sources-google-connect"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="connected-sources-google-disconnect"]')).toBeNull();
  });

  it("failed status read renders Could not check + retry, never a guessed state", async () => {
    mocks.getGoogleCalendarStatus.mockRejectedValue(new Error("network"));
    await act(async () => {
      root.render(<ConnectedSourcesSection session={session} />);
    });
    const text = container.textContent || "";
    expect(text).toMatch(/Could not check/);
    expect(container.querySelector('[data-testid="connected-sources-retry"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="connected-sources-google-connect"]')).toBeNull();
    expect(container.querySelector('[data-testid="connected-sources-google-disconnect"]')).toBeNull();
  });

  it("Privacy destination mounts the section for a signed-in session", async () => {
    mocks.getGoogleCalendarStatus.mockResolvedValue({
      provider: "google_calendar",
      connected: false,
      status: "not_connected",
      scopes: [],
      token_present: false,
    });
    await act(async () => {
      root.render(
        <YouSettingsDestination setting="privacy" onBack={() => undefined} session={session} />,
      );
    });
    expect(container.querySelector('[data-testid="connected-sources"]')).toBeTruthy();
  });
});
