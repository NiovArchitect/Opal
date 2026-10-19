/**
 * @vitest-environment jsdom
 *
 * Repair #18 SM scoped build - W-GAP-31 first form at the glass:
 * the Soul card renders and edits the REAL assistance-preference
 * truth, the Memory card lists the account's capsules with
 * provenance and a per-capsule forget, and the center-character
 * doorway reaches these cards. A failed read is one honest line -
 * never painted controls, never the old "not built yet" gate.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSoulMemory: vi.fn(),
  updateSoul: vi.fn(),
}));

vi.mock("../../api/productClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/productClient")>();
  return {
    ...actual,
    getSoulMemory: mocks.getSoulMemory,
    updateSoul: mocks.updateSoul,
  };
});

import { C2SettingsSection, type C2YouEvents } from "./C2You";
import { C2CenterOpening } from "./C2CenterOpening";
import { buildSettingsSection } from "./shellData";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PAYLOAD = {
  wallet: { id: "w1", owner_user_id: "u1", created_at: "2026-10-18T00:00:00Z" },
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
  capsules: [
    {
      id: "cap-1",
      source: "capsule",
      summary: "Loves quiet bakeries",
      provenance_label: "You told Opal",
      provenance: { source_kind: "told_opal" },
      scope_policy: {},
      purpose: "personal_memory",
      because: "Because you told Opal: Loves quiet bakeries",
      created_at: "2026-10-18T00:00:00Z",
    },
  ],
  capsule_count: 1,
};

const events: C2YouEvents = {
  editProfile: vi.fn(),
  openSection: vi.fn(),
  backToHub: vi.fn(),
  setPreference: vi.fn(async () => undefined),
  runAction: vi.fn(),
  saveProfileFields: vi.fn(async () => undefined),
  saveSoulPreferences: vi.fn(async () => undefined),
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
  mocks.getSoulMemory.mockReset();
  mocks.updateSoul.mockReset();
  mocks.getSoulMemory.mockResolvedValue(PAYLOAD);
  (events.saveSoulPreferences as ReturnType<typeof vi.fn>).mockClear();
  (events.runAction as ReturnType<typeof vi.fn>).mockClear();
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

describe("Soul + Memory section (SM build)", () => {
  it("lists capsules with provenance as forget actions, and no gate copy", async () => {
    const section = await buildSettingsSection("soul-memory", { session: null, bearer: "t" });
    await render(<C2SettingsSection section={section} events={events} />);
    const text = container.textContent || "";
    expect(text).not.toMatch(/not built yet/);
    expect(text).toMatch(/Loves quiet bakeries/);
    expect(text).toMatch(/You told Opal/);
    const row = container.querySelector('[data-testid="c2-setting-row-forget-capsule-cap-1"]');
    expect(row).toBeTruthy();
    await act(async () => {
      (row as HTMLButtonElement).click();
    });
    expect(events.runAction).toHaveBeenCalledWith("soul-memory", "forget-capsule-cap-1");
  });

  it("the Soul form is seeded from the real truth and saves through the real event", async () => {
    const section = await buildSettingsSection("soul-memory", { session: null, bearer: "t" });
    await render(<C2SettingsSection section={section} events={events} />);
    expect(container.querySelector('[data-testid="c2-soul-form"]')).toBeTruthy();
    const quiet = container.querySelector<HTMLInputElement>('[data-testid="c2-soul-quiet-start"]');
    expect(quiet!.value).toBe("22:00");
    const level = container.querySelector<HTMLButtonElement>('[data-testid="c2-soul-level-proactive"]');
    await act(async () => {
      level!.click();
    });
    const save = container.querySelector<HTMLButtonElement>('[data-testid="c2-soul-save"]');
    await act(async () => {
      save!.click();
    });
    expect(events.saveSoulPreferences).toHaveBeenCalledWith(
      expect.objectContaining({ assistance_level: "proactive", quiet_hours_start: "22:00" }),
    );
  });

  it("a failed read is one honest line, with no form and no switches", async () => {
    mocks.getSoulMemory.mockRejectedValue(new Error("network"));
    const section = await buildSettingsSection("soul-memory", { session: null, bearer: "t" });
    await render(<C2SettingsSection section={section} events={events} />);
    expect(container.textContent).toMatch(/could not load/);
    expect(container.querySelector('[data-testid="c2-soul-form"]')).toBeNull();
    expect(container.querySelectorAll('[role="switch"]')).toHaveLength(0);
  });
});

describe("the doorway (Opal's Home, first form)", () => {
  it("the center character reaches the Soul + Memory cards", async () => {
    const openSoulMemory = vi.fn();
    await render(
      <C2CenterOpening
        projection={{
          greeting: "Good morning.",
          presence: "idle",
          celebrateOnce: false,
          needsYou: [],
          next: null,
          comingUp: [],
          forming: [],
        }}
        events={{
          openGraph: vi.fn(),
          makeSomethingHappen: vi.fn(),
          completeSlot: vi.fn(),
          openSoulMemory,
        }}
      />,
    );
    const doorway = container.querySelector<HTMLButtonElement>('[data-testid="c2-center-orb-doorway"]');
    expect(doorway).toBeTruthy();
    await act(async () => {
      doorway!.click();
    });
    expect(openSoulMemory).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-testid="c2-opening-soul-memory"]')).toBeTruthy();
  });
});
