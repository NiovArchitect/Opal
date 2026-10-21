/**
 * @vitest-environment jsdom
 *
 * Repair #19 W8 (W5-11) - Soul and Memory are SEPARATE rooms.
 *
 * What these prove (jsdom layer):
 *  - Soul room (Settings > Soul): every control carries a persistent
 *    plain-language label WITH its reason; no raw value reaches the
 *    glass unlabeled (no bare "22:00" / "08:00" boxes, no "3", no
 *    "standard", no "America/Los_Angeles" standing alone); the form
 *    is seeded from the real truth and every edit saves through the
 *    real event (the SM contracts: edit + read-back by re-projection).
 *  - Memory room (Settings > Memory): capsules grouped and readable
 *    (what it is, where it came from, when it was saved), per-item
 *    forget still arms through runAction (the shell's two-step
 *    confirm + hard delete is unchanged), and the empty state
 *    teaches instead of blanking.
 *  - A failed read in either room is one honest line - never painted
 *    controls.
 *  - The Center doorway says "How Opal works for you" (first-time
 *    clear), never the compound "Soul + Memory"; it still reaches
 *    the rooms. Testids c2-center-orb-doorway / c2-opening-soul-memory
 *    are kept: they are pinned by pack tooling outside this wave.
 *  - The legacy "soul-memory" key still lands in the Soul room.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSoulMemory: vi.fn(),
  updateSoul: vi.fn(),
  getGraphingPolicy: vi.fn(),
  updateGraphingPolicy: vi.fn(),
}));

vi.mock("../../api/productClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/productClient")>();
  return {
    ...actual,
    getSoulMemory: mocks.getSoulMemory,
    updateSoul: mocks.updateSoul,
    getGraphingPolicy: mocks.getGraphingPolicy,
    updateGraphingPolicy: mocks.updateGraphingPolicy,
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
      scope_kind: "user",
      purpose: "personal_memory",
      because: "Because you told Opal: Loves quiet bakeries",
      created_at: "2026-10-18T00:00:00Z",
    },
    {
      id: "cap-2",
      source: "capsule",
      summary: "Maya prefers morning plans",
      provenance_label: "A preference you saved with Opal",
      provenance: { source_kind: "durable_preference_memory" },
      scope_policy: {},
      scope_kind: "relationship",
      purpose: "personal_memory",
      because: null,
      created_at: "2026-10-17T00:00:00Z",
    },
  ],
  capsule_count: 2,
};

const events: C2YouEvents = {
  editProfile: vi.fn(),
  openSection: vi.fn(),
  backToHub: vi.fn(),
  setPreference: vi.fn(async () => undefined),
  runAction: vi.fn(),
  saveProfileFields: vi.fn(async () => undefined),
  saveSoulPreferences: vi.fn(async () => undefined),
  saveCallGraphingMode: vi.fn(async () => undefined),
  setGraphingPaused: vi.fn(async () => undefined),
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
  mocks.getGraphingPolicy.mockReset();
  mocks.updateGraphingPolicy.mockReset();
  mocks.getSoulMemory.mockResolvedValue(PAYLOAD);
  mocks.getGraphingPolicy.mockResolvedValue({
    graphing: { call_mode: "ask_each", chat_mode: "ask_each", global_paused: false },
  });
  mocks.updateGraphingPolicy.mockResolvedValue({
    graphing: { call_mode: "never", chat_mode: "ask_each", global_paused: false },
  });
  (events.saveSoulPreferences as ReturnType<typeof vi.fn>).mockClear();
  (events.saveCallGraphingMode as ReturnType<typeof vi.fn>).mockClear();
  (events.setGraphingPaused as ReturnType<typeof vi.fn>).mockClear();
  (events.runAction as ReturnType<typeof vi.fn>).mockClear();
  (events.openSection as ReturnType<typeof vi.fn>).mockClear();
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

describe("Soul room (Settings > Soul)", () => {
  it("every control is labeled in plain language with its reason; no raw values on the glass", async () => {
    const section = await buildSettingsSection("soul", { session: null, bearer: "t" });
    expect(section.title).toBe("Soul");
    await render(<C2SettingsSection section={section} events={events} />);
    const text = container.textContent || "";
    // Labels + reasons.
    expect(text).toMatch(/How forward may Opal be\?/);
    expect(text).toMatch(/main dial for how Opal is with you/);
    expect(text).toMatch(/Quiet hours/);
    // The quiet-hours sentence the founder asked for, in 12-hour words.
    expect(
      container.querySelector('[data-testid="c2-soul-quiet-sentence"]')!.textContent,
    ).toMatch(/Opal holds non-urgent things from 10:00 PM to 8:00 AM/);
    expect(text).toMatch(/Quiet hours start - Opal starts holding non-urgent things at 10:00 PM/);
    expect(text).toMatch(/Quiet hours end - Opal can bring things to you again at 8:00 AM/);
    expect(text).toMatch(/Home time zone/);
    expect(text).toMatch(/That is Los Angeles \(America\/Los_Angeles\) time\./);
    expect(text).toMatch(/Proactive notes per day, at most/);
    expect(text).toMatch(/most times in one day Opal may bring you something you did not ask for/);
    expect(text).toMatch(/At most 3 notes a day from Opal on its own\./);
    expect(text).toMatch(/When something is done/);
    expect(text).toMatch(/Tell me when things are done/);
    expect(text).toMatch(/Keep it brief/);
    // No raw enum / raw value reaches the glass unlabeled.
    expect(text).not.toMatch(/standard/);
    expect(text).not.toMatch(/Soul \+ Memory/);
    // The soul value rows are seeds for the form, never rendered rows.
    expect(container.querySelector('[data-testid="c2-setting-row-timezone"]')).toBeNull();
    expect(container.querySelector('[data-testid="c2-setting-row-assistance_level"]')).toBeNull();
    // No capsules in the Soul room - Memory is its own room.
    expect(text).not.toMatch(/Loves quiet bakeries/);
    expect(container.querySelector('[data-testid="c2-soul-form"]')).toBeTruthy();
    // JA-07 inventory correction: the Soul room DOES carry exactly
    // one switch now — the real quiet-hours on/off (the W8-era
    // "no switches" claim described a room whose claimed toggle
    // did not exist; the toggle exists now and is wired below).
    const switches = container.querySelectorAll('[role="switch"]');
    expect(switches).toHaveLength(1);
    expect(switches[0].getAttribute("data-testid")).toBe("c2-soul-quiet-toggle");
    expect(switches[0].getAttribute("aria-checked")).toBe("true");
  });

  it("JA-07: quiet hours Off writes the resolver's disabled state (start == end); On restores the window", async () => {
    const section = await buildSettingsSection("soul", { session: null, bearer: "t" });
    await render(<C2SettingsSection section={section} events={events} />);
    const toggle = container.querySelector<HTMLButtonElement>(
      '[data-testid="c2-soul-quiet-toggle"]',
    )!;
    expect(toggle.getAttribute("aria-checked")).toBe("true");

    // Off: the sentence reads honestly and the time inputs disable.
    await act(async () => {
      toggle.click();
    });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(
      container.querySelector('[data-testid="c2-soul-quiet-sentence"]')!.textContent,
    ).toMatch(/Quiet hours are off/);
    expect(
      container.querySelector<HTMLInputElement>('[data-testid="c2-soul-quiet-start"]')!
        .disabled,
    ).toBe(true);

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="c2-soul-save"]')!.click();
    });
    expect(events.saveSoulPreferences).toHaveBeenCalledWith(
      expect.objectContaining({ quiet_hours_start: "22:00", quiet_hours_end: "22:00" }),
    );

    // On again: the remembered window is restored and saved.
    await act(async () => {
      toggle.click();
    });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(
      container.querySelector('[data-testid="c2-soul-quiet-sentence"]')!.textContent,
    ).toMatch(/Opal holds non-urgent things from 10:00 PM to 8:00 AM/);
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="c2-soul-save"]')!.click();
    });
    expect(events.saveSoulPreferences).toHaveBeenLastCalledWith(
      expect.objectContaining({ quiet_hours_start: "22:00", quiet_hours_end: "08:00" }),
    );
  });

  it("the form is seeded from the real truth and every edit saves through the real event", async () => {
    const section = await buildSettingsSection("soul", { session: null, bearer: "t" });
    await render(<C2SettingsSection section={section} events={events} />);
    const quiet = container.querySelector<HTMLInputElement>('[data-testid="c2-soul-quiet-start"]');
    expect(quiet!.value).toBe("22:00");
    const tz = container.querySelector<HTMLInputElement>('[data-testid="c2-soul-timezone"]');
    expect(tz!.value).toBe("America/Los_Angeles");
    const cap = container.querySelector<HTMLInputElement>('[data-testid="c2-soul-max-per-day"]');
    expect(cap!.value).toBe("3");
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="c2-soul-level-proactive"]')!.click();
    });
    // The selected level's reason updates with the choice.
    expect(
      container.querySelector('[data-testid="c2-soul-level-reason"]')!.textContent,
    ).toMatch(/steps forward more often/);
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="c2-soul-feedback-reduced"]')!.click();
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="c2-soul-save"]')!.click();
    });
    expect(events.saveSoulPreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        assistance_level: "proactive",
        quiet_hours_start: "22:00",
        quiet_hours_end: "08:00",
        timezone: "America/Los_Angeles",
        max_proactive_signals_per_day: "3",
        completion_feedback: "reduced",
      }),
    );
    expect(container.querySelector('[data-testid="c2-soul-saved"]')).toBeTruthy();
  });

  it("a failed read is one honest line, with no form and no switches", async () => {
    mocks.getSoulMemory.mockRejectedValue(new Error("network"));
    const section = await buildSettingsSection("soul", { session: null, bearer: "t" });
    await render(<C2SettingsSection section={section} events={events} />);
    expect(container.textContent).toMatch(/could not load/);
    expect(container.querySelector('[data-testid="c2-soul-form"]')).toBeNull();
    expect(container.querySelectorAll('[role="switch"]')).toHaveLength(0);
  });

  it("the legacy soul-memory key lands in the Soul room (alias, not a combined page)", async () => {
    const section = await buildSettingsSection("soul-memory", { session: null, bearer: "t" });
    expect(section.title).toBe("Soul");
    await render(<C2SettingsSection section={section} events={events} />);
    expect(container.querySelector('[data-testid="c2-soul-form"]')).toBeTruthy();
    expect(container.textContent).not.toMatch(/Loves quiet bakeries/);
  });
});

describe("Memory room (Settings > Memory)", () => {
  it("capsules are grouped and readable, and forget arms through the real action", async () => {
    const section = await buildSettingsSection("memory", { session: null, bearer: "t" });
    expect(section.title).toBe("Memory");
    await render(<C2SettingsSection section={section} events={events} />);
    const text = container.textContent || "";
    expect(text).toMatch(/2 memories/);
    expect(text).toMatch(/About you/);
    expect(text).toMatch(/Tied to a person/);
    expect(text).toMatch(/Loves quiet bakeries/);
    expect(text).toMatch(/You told Opal - Saved Oct 18, 2026/);
    expect(text).toMatch(/Because you told Opal: Loves quiet bakeries/);
    expect(text).toMatch(/Maya prefers morning plans/);
    // No soul controls in the Memory room.
    expect(container.querySelector('[data-testid="c2-soul-form"]')).toBeNull();
    const row = container.querySelector('[data-testid="c2-setting-row-forget-capsule-cap-1"]');
    expect(row).toBeTruthy();
    await act(async () => {
      (row as HTMLButtonElement).click();
    });
    expect(events.runAction).toHaveBeenCalledWith("memory", "forget-capsule-cap-1");
  });

  it("the empty state teaches rather than blanking", async () => {
    mocks.getSoulMemory.mockResolvedValue({ ...PAYLOAD, capsules: [], capsule_count: 0 });
    const section = await buildSettingsSection("memory", { session: null, bearer: "t" });
    await render(<C2SettingsSection section={section} events={events} />);
    const text = container.textContent || "";
    expect(text).toMatch(/not holding any memories for you yet/);
    expect(text).toMatch(/will appear here/);
    expect(text).toMatch(/you can forget it here, for good/);
  });

  it("a failed read is one honest line, with no capsule rows", async () => {
    mocks.getSoulMemory.mockRejectedValue(new Error("network"));
    const section = await buildSettingsSection("memory", { session: null, bearer: "t" });
    await render(<C2SettingsSection section={section} events={events} />);
    expect(container.textContent).toMatch(/could not load/);
    expect(container.querySelector('[data-testid^="c2-setting-row-forget-capsule-"]')).toBeNull();
  });
});

describe("Call graphing standing permission (item 16, Memory room)", () => {
  it("renders labeled with its reason, seeded from the real policy, and saves mode + pause through the real events", async () => {
    const section = await buildSettingsSection("memory", { session: null, bearer: "t" });
    await render(<C2SettingsSection section={section} events={events} />);
    const text = container.textContent || "";
    expect(container.querySelector('[data-testid="c2-graphing-form"]')).toBeTruthy();
    expect(text).toMatch(/Call graphing/);
    expect(text).toMatch(/becomes part of your graph/);
    expect(text).toMatch(/not a recording kept for listening back/);
    // No raw mode enum on the glass; the seeded seeds never render as rows.
    expect(text).not.toMatch(/ask_each/);
    expect(container.querySelector('[data-testid="c2-setting-row-graphing_call_mode"]')).toBeNull();
    // Seeded choice is the server's: ask_each = "Ask me each time".
    const ask = container.querySelector<HTMLButtonElement>('[data-testid="c2-graphing-mode-ask_each"]');
    expect(ask!.getAttribute("aria-checked")).toBe("true");
    expect(
      container.querySelector('[data-testid="c2-graphing-mode-reason"]')!.textContent,
    ).toMatch(/asks before graphing a call, every time/);
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="c2-graphing-mode-never"]')!.click();
    });
    expect(events.saveCallGraphingMode).toHaveBeenCalledWith("never");
    const pause = container.querySelector<HTMLButtonElement>('[data-testid="c2-graphing-pause-toggle"]');
    expect(pause!.getAttribute("aria-checked")).toBe("false");
    await act(async () => {
      pause!.click();
    });
    expect(events.setGraphingPaused).toHaveBeenCalledWith(true);
  });

  it("a failed graphing read leaves the control honestly absent - no guessed toggle", async () => {
    mocks.getGraphingPolicy.mockRejectedValue(new Error("network"));
    const section = await buildSettingsSection("memory", { session: null, bearer: "t" });
    await render(<C2SettingsSection section={section} events={events} />);
    expect(container.querySelector('[data-testid="c2-graphing-form"]')).toBeNull();
    // The room itself still renders its memories.
    expect(container.textContent).toMatch(/Loves quiet bakeries/);
  });

  it("a failed mode save restores the projected choice and says so in plain words", async () => {
    (events.saveCallGraphingMode as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("network"),
    );
    const section = await buildSettingsSection("memory", { session: null, bearer: "t" });
    await render(<C2SettingsSection section={section} events={events} />);
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="c2-graphing-mode-never"]')!.click();
    });
    const ask = container.querySelector<HTMLButtonElement>('[data-testid="c2-graphing-mode-ask_each"]');
    expect(ask!.getAttribute("aria-checked")).toBe("true");
    expect(container.textContent).toMatch(/That did not save\. Try again\./);
  });
});

describe("the doorway (Opal's Home, first form)", () => {
  it("the center character doorway says How Opal works for you and still reaches the rooms", async () => {
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
    // R21 W-11: the explainer card is removed; its words are
    // folded behind the (i) and the ORB is the doorway.
    const entry = container.querySelector('[data-testid="c2-opening-soul-memory"]');
    expect(entry).toBeNull();
    expect(container.querySelector('[data-testid="c2-opening-soul-memory-info"]')).toBeTruthy();
    expect(container.textContent).not.toMatch(/Soul \+ Memory/);
    await act(async () => {
      doorway!.click();
    });
    expect(openSoulMemory).toHaveBeenCalledTimes(1);
  });
});
