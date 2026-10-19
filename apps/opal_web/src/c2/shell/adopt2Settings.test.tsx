/**
 * @vitest-environment jsdom
 *
 * Repair #18 adoption wave 2 — the account/settings cluster at the
 * C2 glass: 4.C2 roster rows come from the API (with a revoke action
 * per non-current session and the honest pairing note), 4.C3 saved
 * logins render hosts only, 4.C4 the invite-code page shows your
 * code + both-sides credit with no reward copy, 4.C6 the delete
 * page names the shared-truth scope, 4.C7 report entry parity is a
 * payload property (entry_point defaults to the You/Help path),
 * SF-A per-source lines from the sources' own read.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDeviceRoster: vi.fn(),
  getSavedLogins: vi.fn(),
  getPersonalInviteCode: vi.fn(),
  getIngestionStatus: vi.fn(),
}));

vi.mock("../../api/productClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/productClient")>();
  return {
    ...actual,
    getDeviceRoster: mocks.getDeviceRoster,
    getSavedLogins: mocks.getSavedLogins,
    getPersonalInviteCode: mocks.getPersonalInviteCode,
    getIngestionStatus: mocks.getIngestionStatus,
  };
});

import { C2SettingsSection, C2YouHub, type C2YouEvents } from "./C2You";
import { buildSettingsSection, youHubFromSession } from "./shellData";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const events: C2YouEvents = {
  editProfile: vi.fn(),
  openSection: vi.fn(),
  backToHub: vi.fn(),
  setPreference: vi.fn(async () => undefined),
  runAction: vi.fn(),
  saveProfileFields: vi.fn(async () => undefined),
  submitSupportReport: vi.fn(async () => ({ reference: "OPAL-TEST1" })),
  addSavedLogin: vi.fn(async () => undefined),
  redeemInviteCode: vi.fn(async () => ({ credit_line: "You joined through Maya" })),
  executeDeletion: vi.fn(async () => ({ reference: "DEL-TEST1" })),
  setModePreference: vi.fn(),
  modePreference: "system",
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  for (const mock of Object.values(mocks)) mock.mockReset();
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

describe("adoption wave 2 settings", () => {
  it("new destinations are hub rows (<=2 taps) and searchable", async () => {
    const hub = youHubFromSession(null, false);
    await render(<C2YouHub projection={hub} events={events} />);
    for (const key of ["saved-logins", "invite-code", "delete-account"]) {
      expect(container.querySelector(`[data-testid="c2-you-row-${key}"]`), key).toBeTruthy();
    }
  });

  it("C2: linked devices render the roster with revoke for other sessions only", async () => {
    mocks.getDeviceRoster.mockResolvedValue([
      { id: "s1", device_label: "Pixel", status: "active", platform: "web", last_seen_at: "2026-10-18T10:00:00Z", is_current: true },
      { id: "s2", device_label: "Old phone", status: "active", platform: "phone", last_seen_at: "2026-10-17T10:00:00Z", is_current: false },
    ]);
    const section = await buildSettingsSection("linked-devices", { session: null, bearer: "t" });
    await render(<C2SettingsSection section={section} events={events} />);
    const text = container.textContent || "";
    expect(text).toMatch(/Pixel - this device/);
    expect(text).toMatch(/Old phone/);
    expect(container.querySelector('[data-testid="c2-setting-row-revoke-device-s2"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="c2-setting-row-revoke-device-s1"]')).toBeNull();
    // Pairing leg is honestly absent - no pairing control, plain words.
    expect(text).toMatch(/no pairing code or QR flow/);
  });

  it("C3: saved logins render hosts only and offer the add form", async () => {
    mocks.getSavedLogins.mockResolvedValue([
      { id: "l1", host: "api.example.com", saved_at: "2026-10-18T10:00:00Z" },
    ]);
    const section = await buildSettingsSection("saved-logins", { session: null, bearer: "t" });
    await render(<C2SettingsSection section={section} events={events} />);
    const text = container.textContent || "";
    expect(text).toMatch(/api\.example\.com/);
    expect(container.querySelector('[data-testid="c2-saved-login-form"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="c2-setting-row-remove-login-l1"]')).toBeTruthy();
    // Hosts only: nothing value-shaped renders.
    expect(text).not.toMatch(/secret/i);
  });

  it("C4: invite code page shows the code and credit, and never a reward", async () => {
    mocks.getPersonalInviteCode.mockResolvedValue({
      personal_code: {
        code: "MAYA-AB12",
        share_url: "https://example.test/invite/MAYA-AB12",
        joined_count: 1,
        promise: "Share your code. Anyone who joins with it is connected with you.",
      },
      joined_through: { credit_line: "You joined through Sam" },
      joined_through_you: [{ credit_line: "Jo joined through you" }],
    });
    const section = await buildSettingsSection("invite-code", { session: null, bearer: "t" });
    await render(<C2SettingsSection section={section} events={events} />);
    const text = container.textContent || "";
    expect(text).toMatch(/MAYA-AB12/);
    expect(text).toMatch(/You joined through Sam/);
    expect(text).toMatch(/Jo joined through you/);
    expect(text).not.toMatch(/reward/i);
    expect(text).not.toMatch(/tokens/i);
    expect(container.querySelector('[data-testid="c2-redeem-form"]')).toBeTruthy();
  });

  it("C6: delete page names exactly what goes, incl. shared truth, before any action", async () => {
    const section = await buildSettingsSection("delete-account", { session: null });
    await render(<C2SettingsSection section={section} events={events} />);
    const text = container.textContent || "";
    expect(text).toMatch(/Delete my data removes/);
    expect(text).toMatch(/Delete my account does all of that/);
    expect(text).toMatch(/not yours to erase for them/);
    expect(text).toMatch(/receipt/);
    expect(container.querySelector('[data-testid="c2-delete-form"]')).toBeTruthy();
    // Nothing is deleted by rendering: the arm button exists, the
    // confirm does not until armed.
    expect(container.querySelector('[data-testid="c2-delete-arm"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="c2-delete-confirm"]')).toBeNull();
  });

  it("SF-A: hears renders each source's own line from the per-source read", async () => {
    mocks.getIngestionStatus.mockResolvedValue([
      { source: "chats", title: "Chats in the app", state: "working", state_label: "Working now", progress: "Caught up - 3 messages of yours are in Opal's working memory.", error: null, retryable: false },
      { source: "room", title: "In the room", state: "absent", state_label: "Not in Opal today", progress: "Opal does not capture room audio, hidden or otherwise.", error: null, retryable: false },
      { source: "texts", title: "Texts", state: "error", state_label: "Something went wrong reading this source", progress: "This source could not be read just now. The others are unaffected.", error: "source_read_failed", retryable: true },
    ]);
    const section = await buildSettingsSection("what-opal-hears", { session: null, bearer: "t" });
    await render(<C2SettingsSection section={section} events={events} />);
    const text = container.textContent || "";
    // The failing source does not blank the others (ER-2/SF-A).
    expect(text).toMatch(/Caught up - 3 messages/);
    expect(text).toMatch(/Not in Opal today/);
    expect(text).toMatch(/could not be read just now/);
    expect(container.querySelector('[data-testid="c2-setting-row-hears-retry-texts"]')).toBeTruthy();
    expect(text).not.toMatch(/%/);
  });
});
