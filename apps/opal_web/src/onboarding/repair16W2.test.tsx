/**
 * Repair #16-W2 - onboarding decisions: multi-way + adversarial proof.
 *
 * Covers, with assertions on real effects (persisted permission snapshots,
 * rendered steps, callback counts):
 * - fr06 "Skip for now": rendered ONLY on founder-seed builds, where it runs
 *   a real fixture challenge/verify; absent on real builds (no guest model).
 * - Post-verify routing: every path that used to go to fr08 now hands off via
 *   onAfterPhoneVerify (PermissionBootstrap then Meet Opal in the parent), or
 *   completes with the verified session when no parent handler exists.
 * - Removed steps fr08/fr09/fr10: route order excludes them, and a resume
 *   value naming one lands on the lawful first step, never a blank screen.
 * - PermissionBootstrapPage: Continue enabled from the start; undecided rows
 *   persist as "skipped" at Continue; decided rows keep their real choice;
 *   nothing undecided or denied is ever persisted as granted.
 * - Spam: repeated Skip / Verify taps cannot double-submit (lock refs).
 * - Interruption: unmounting mid-flow and remounting starts clean, with no
 *   fake completion and no resurrected removed step.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductSession } from "../api/productClient";
import type { FirstRunStepId } from "./firstRunCopy";
import {
  MEET_OPAL_PERMISSIONS_STORAGE_KEY,
  loadMeetOpalPermissions,
} from "./holyShitCopy";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const seedFlag = vi.hoisted(() => ({ enabled: false }));
const api = vi.hoisted(() => ({
  startChallenge: vi.fn(),
  verifyChallenge: vi.fn(),
}));

vi.mock("../opalUi/founderGraphSeed", () => ({
  isFounderSeedEnabled: () => seedFlag.enabled,
}));

vi.mock("../api/productClient", () => ({
  FOUNDER_AUTH_FIXTURE: {
    e164: "+12025550101",
    dial: "+1",
    national: "2025550101",
    otp: "111111",
    label: "Test line A",
  },
  codeHintForE164: (e164: string) => (e164 === "+12025550101" ? "111111" : null),
  normalizePhoneInput: (raw: string, dial = "+1") => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 7) throw new Error("invalid");
    return digits.length === 10 ? `${dial}${digits}` : `+${digits}`;
  },
  startChallenge: (...args: unknown[]) => api.startChallenge(...args),
  verifyChallenge: (...args: unknown[]) => api.verifyChallenge(...args),
}));

import {
  FIRST_RUN_ROUTE_ORDER,
  FirstRunExperience,
  REMOVED_FIRST_RUN_STEPS,
  lawfulResumeStep,
} from "./FirstRunExperience";
import { PermissionBootstrapPage } from "./PermissionBootstrapPage";

const session: ProductSession = {
  user_id: "u-w2",
  display_name: "Founder",
  handle: "founder",
  access_token: "tok-w2",
};

let container: HTMLDivElement;
let root: Root;

async function flush(times = 6) {
  for (let i = 0; i < times; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

function qs(testId: string): HTMLElement | null {
  return container.querySelector(`[data-testid="${testId}"]`);
}

async function settle(ms = 550) {
  // AnimatePresence mode="wait" runs a real 0.4s exit before the next step mounts.
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
  await flush();
}

async function submitForm() {
  const form = container.querySelector("form");
  expect(form).toBeTruthy();
  await act(async () => {
    form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await flush();
  await settle();
}

async function click(el: HTMLElement | null) {
  expect(el).toBeTruthy();
  await act(async () => {
    (el as HTMLElement).click();
  });
  await flush();
}

beforeEach(() => {
  localStorage.clear();
  seedFlag.enabled = false;
  api.startChallenge.mockReset();
  api.verifyChallenge.mockReset();
  api.startChallenge.mockResolvedValue({
    challenge: { id: "ch-w2" },
    development_code: "111111",
    not_production_sms: true,
  });
  api.verifyChallenge.mockResolvedValue(session);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  localStorage.clear();
  delete (globalThis as { Notification?: unknown }).Notification;
});

async function renderFirstRun(props: Record<string, unknown> = {}) {
  await act(async () => {
    root.render(
      <FirstRunExperience
        open
        mode="sign_in"
        onAuthenticated={vi.fn()}
        {...props}
      />,
    );
  });
  await flush();
}

describe("Repair #16-W2 - route order and resume sanitizer", () => {
  it("route order ends at fr07; removed steps are named and excluded", () => {
    expect(FIRST_RUN_ROUTE_ORDER).toEqual(["fr00", "frPromise", "fr06", "fr07"]);
    expect(REMOVED_FIRST_RUN_STEPS).toEqual(["fr08", "fr09", "fr10"]);
  });

  it("lawfulResumeStep drops removed and unknown steps, keeps lawful ones", () => {
    for (const removed of ["fr08", "fr09", "fr10"] as unknown as FirstRunStepId[]) {
      expect(lawfulResumeStep(removed)).toBeNull();
    }
    expect(lawfulResumeStep("fr06")).toBe("fr06");
    expect(lawfulResumeStep("fr07")).toBe("fr07");
    expect(lawfulResumeStep(null)).toBeNull();
    expect(lawfulResumeStep(undefined)).toBeNull();
  });

  it.each(["fr08", "fr09", "fr10"])(
    "resume probe into removed step %s lands on fr06, never blank",
    async (removed) => {
      await renderFirstRun({
        resumeStep: removed as unknown as FirstRunStepId,
        resumeSession: session,
      });
      expect(qs("fr06-phone")).toBeTruthy();
      expect(container.querySelector("[data-fr-step]")?.getAttribute("data-fr-step")).toBe("fr06");
      expect(qs("fr08-profile")).toBeNull();
      expect(qs("fr09-find")).toBeNull();
      expect(qs("fr10-act-on-behalf")).toBeNull();
    },
  );
});

describe("Repair #16-W2 - fr06 Skip for now gating", () => {
  it("real build (no seed): no Skip control, honest verification-required copy", async () => {
    seedFlag.enabled = false;
    await renderFirstRun();
    expect(qs("fr06-phone")).toBeTruthy();
    expect(qs("fr06-skip-for-now")).toBeNull();
    expect(qs("fr06-verify-required")?.textContent).toMatch(/verify it before you continue/i);
  });

  it("seed build: Skip renders and performs a REAL challenge + verify, then hands off", async () => {
    seedFlag.enabled = true;
    const onAfterPhoneVerify = vi.fn(() => true);
    const onAuthenticated = vi.fn();
    await renderFirstRun({ onAfterPhoneVerify, onAuthenticated });
    expect(qs("fr06-skip-for-now")).toBeTruthy();
    await click(qs("fr06-skip-for-now"));
    expect(api.startChallenge).toHaveBeenCalledTimes(1);
    expect(api.verifyChallenge).toHaveBeenCalledTimes(1);
    expect(onAfterPhoneVerify).toHaveBeenCalledTimes(1);
    expect(onAfterPhoneVerify.mock.calls[0]?.[0]).toMatchObject({ user_id: "u-w2" });
    // Parent paused the flow (returned true): no completion, no removed step.
    expect(onAuthenticated).not.toHaveBeenCalled();
    expect(qs("fr08-profile")).toBeNull();
  });

  it("seed build without a parent handoff: Skip completes with the verified session only", async () => {
    seedFlag.enabled = true;
    const onAuthenticated = vi.fn();
    await renderFirstRun({ onAuthenticated });
    await click(qs("fr06-skip-for-now"));
    expect(api.verifyChallenge).toHaveBeenCalledTimes(1);
    expect(onAuthenticated).toHaveBeenCalledTimes(1);
    expect(onAuthenticated.mock.calls[0]?.[0]).toMatchObject({ user_id: "u-w2" });
  });

  it("skip-spam: three rapid Skip taps start exactly one challenge (no double submit, no stuck busy)", async () => {
    seedFlag.enabled = true;
    const onAfterPhoneVerify = vi.fn(() => true);
    await renderFirstRun({ onAfterPhoneVerify });
    const btn = qs("fr06-skip-for-now") as HTMLElement;
    await act(async () => {
      btn.click();
      btn.click();
      btn.click();
    });
    await flush(10);
    expect(api.startChallenge).toHaveBeenCalledTimes(1);
    expect(api.verifyChallenge).toHaveBeenCalledTimes(1);
    expect(onAfterPhoneVerify).toHaveBeenCalledTimes(1);
  });
});

describe("Repair #16-W2 - normal verify path rerouting", () => {
  async function runToVerify(onAfterPhoneVerify?: (s: ProductSession) => boolean) {
    seedFlag.enabled = true; // seed pre-fills phone + consent + code for a fast lawful walk
    const onAuthenticated = vi.fn();
    await renderFirstRun({ onAfterPhoneVerify, onAuthenticated });
    await submitForm();
    expect(qs("fr07-verify")).toBeTruthy();
    return { onAuthenticated };
  }

  it("verify with parent handoff: pauses at the handoff, never renders fr08", async () => {
    const onAfterPhoneVerify = vi.fn(() => true);
    const { onAuthenticated } = await runToVerify(onAfterPhoneVerify);
    await submitForm();
    expect(api.verifyChallenge).toHaveBeenCalledTimes(1);
    expect(onAfterPhoneVerify).toHaveBeenCalledTimes(1);
    expect(onAuthenticated).not.toHaveBeenCalled();
    expect(qs("fr08-profile")).toBeNull();
  });

  it("verify without parent handoff: completes with the verified session (former fr08 fallback)", async () => {
    const { onAuthenticated } = await runToVerify(undefined);
    await submitForm();
    expect(onAuthenticated).toHaveBeenCalledTimes(1);
    expect(onAuthenticated.mock.calls[0]?.[0]).toMatchObject({ user_id: "u-w2" });
    expect(qs("fr08-profile")).toBeNull();
  });

  it("verify-spam: repeated Verify taps verify exactly once", async () => {
    const onAfterPhoneVerify = vi.fn(() => true);
    await runToVerify(onAfterPhoneVerify);
    const form = container.querySelector("form") as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await flush(10);
    expect(api.verifyChallenge).toHaveBeenCalledTimes(1);
    expect(onAfterPhoneVerify).toHaveBeenCalledTimes(1);
  });

  it("interrupted onboarding: unmount mid-verify, remount fresh - clean fr06, no fake completion", async () => {
    const onAuthenticated = vi.fn();
    seedFlag.enabled = true;
    await renderFirstRun({ onAuthenticated });
    await submitForm();
    expect(qs("fr07-verify")).toBeTruthy();
    act(() => root.unmount());
    root = createRoot(container);
    await renderFirstRun({ onAuthenticated });
    expect(qs("fr06-phone")).toBeTruthy();
    expect(onAuthenticated).not.toHaveBeenCalled();
    expect(api.verifyChallenge).not.toHaveBeenCalled();
  });
});

describe("Repair #16-W2 - PermissionBootstrapPage progressive gating", () => {
  async function renderPerms(onContinue = vi.fn()) {
    await act(async () => {
      root.render(<PermissionBootstrapPage userId="u-w2" onContinue={onContinue} />);
    });
    await flush();
    return onContinue;
  }

  function persisted() {
    const raw = localStorage.getItem(MEET_OPAL_PERMISSIONS_STORAGE_KEY);
    return raw ? loadMeetOpalPermissions() : null;
  }

  it("none decided: Continue is enabled from the start and completes; all rows persist as skipped", async () => {
    const onContinue = await renderPerms();
    const btn = qs("permission-bootstrap-continue") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    await click(btn);
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(persisted()).toMatchObject({
      contacts: "skipped",
      notifications: "skipped",
      location: "skipped",
    });
  });

  it("one decided (notifications granted): grant persists as allowed, undecided rows as skipped", async () => {
    (globalThis as { Notification?: unknown }).Notification = {
      requestPermission: vi.fn(async () => "granted"),
    };
    const onContinue = await renderPerms();
    await click(qs("hs-perm-allow-notifications"));
    expect(persisted()).toMatchObject({ notifications: "allowed" });
    await click(qs("permission-bootstrap-continue"));
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(persisted()).toMatchObject({
      contacts: "skipped",
      notifications: "allowed",
      location: "skipped",
    });
  });

  it("deny all three: Continue still completes and nothing persists as granted", async () => {
    (globalThis as { Notification?: unknown }).Notification = {
      requestPermission: vi.fn(async () => "denied"),
    };
    const onContinue = await renderPerms();
    // Order varied: location, then contacts, then notifications.
    await click(qs("hs-perm-skip-location"));
    await click(qs("hs-perm-skip-contacts"));
    await click(qs("hs-perm-allow-notifications")); // browser denial resolves to skipped
    await click(qs("permission-bootstrap-continue"));
    expect(onContinue).toHaveBeenCalledTimes(1);
    const saved = persisted();
    expect(saved).toMatchObject({
      contacts: "skipped",
      notifications: "skipped",
      location: "skipped",
    });
    expect(Object.values(saved ?? {})).not.toContain("allowed");
  });

  it("subset decided in reverse order (location + contacts Not now), notifications untouched", async () => {
    const onContinue = await renderPerms();
    await click(qs("hs-perm-skip-location"));
    await click(qs("hs-perm-skip-contacts"));
    await click(qs("permission-bootstrap-continue"));
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(persisted()).toMatchObject({
      contacts: "skipped",
      notifications: "skipped",
      location: "skipped",
    });
  });

  it("resume: a previously granted row renders as Allowed on a fresh mount and survives Continue", async () => {
    (globalThis as { Notification?: unknown }).Notification = {
      requestPermission: vi.fn(async () => "granted"),
    };
    await renderPerms();
    await click(qs("hs-perm-allow-notifications"));
    act(() => root.unmount());
    root = createRoot(container);
    const onContinue = await renderPerms();
    const row = qs("hs-perm-row-notifications");
    expect(row?.getAttribute("data-perm-decision")).toBe("allowed");
    await click(qs("permission-bootstrap-continue"));
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(persisted()).toMatchObject({ notifications: "allowed", contacts: "skipped" });
  });

  it("double Continue taps: persisted snapshot stays lawful (idempotent, never granted-by-accident)", async () => {
    const onContinue = await renderPerms();
    const btn = qs("permission-bootstrap-continue") as HTMLElement;
    await act(async () => {
      btn.click();
      btn.click();
    });
    await flush();
    const saved = persisted();
    expect(saved).toMatchObject({
      contacts: "skipped",
      notifications: "skipped",
      location: "skipped",
    });
    expect(Object.values(saved ?? {})).not.toContain("allowed");
    expect(onContinue.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
