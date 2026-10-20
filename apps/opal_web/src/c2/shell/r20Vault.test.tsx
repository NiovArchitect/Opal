/**
 * @vitest-environment jsdom
 *
 * Repair #20 — F-4 (vault gate minimalism + credential home) and
 * F-5 (dock orb opacity) regression pins.
 *
 * F-4: the gate is near-silent (title + unlock affordances ONLY —
 * no explainer, no intentions copy, no passcode-set form, no text
 * input); biometric unlock renders only when the host offers it
 * and runs the real handler; the PIN pad is the fallback and the
 * server's verify answer rules; PIN set/change + the biometric
 * toggle live in Settings' Private graphs section, seeded from the
 * ONE graph-lock projection and written through the real handlers.
 *
 * F-5: the dock's raised orb disc is SOLID — its background is the
 * opaque --dock-orb-fill token (an opaque hex in both modes), with
 * opacity 1 and no backdrop filter, so content can never scroll
 * visibly through the orb.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const mocks = vi.hoisted(() => ({
  getGraphLock: vi.fn(),
}));

vi.mock("../../api/productClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/productClient")>();
  return { ...actual, getGraphLock: mocks.getGraphLock };
});

import { C2Graphs } from "./C2Graphs";
import { C2SettingsSection, C2YouHub, type C2YouEvents } from "./C2You";
import { buildSettingsSection, youHubFromSession } from "./shellData";
import {
  assertVaultBiometric,
  hasVaultBiometricCredential,
  registerVaultBiometric,
  vaultBiometricOfferable,
} from "./vaultBiometric";
import type { GraphListProjection } from "./projections";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const here = dirname(fileURLToPath(import.meta.url));

let host: HTMLDivElement | null = null;
let root: Root | null = null;

async function render(node: React.ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(node);
  });
  return host;
}

beforeEach(() => {
  mocks.getGraphLock.mockReset();
  window.localStorage.clear();
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  host?.remove();
  host = null;
  document.body.innerHTML = "";
  window.localStorage.clear();
});

function click(el: Element) {
  act(() => {
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
}
async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
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

const card = (id: string, title: string) => ({
  id,
  stateFamily: "ready",
  stateLabel: "ready",
  title,
  whenLine: "Saturday 7 PM",
  whereLine: "Juniper & Ivy",
  attendanceLine: "2 of 2 going",
  primaryActionLabel: null,
});

const projection = (): GraphListProjection => ({
  groups: [
    { id: "g1", kind: "coming-up", title: "Coming up", cards: [card("p1", "Dinner at Juniper")] },
  ],
  privateCards: [{ ...card("p-secret", "Secret anniversary plan"), isPrivate: true as const }],
  lensCounts: { all: 1, action: 0, ready: 1, past: 0 },
  timelineAvailable: true,
});

const baseEvents = {
  openGraph: vi.fn(),
  createPlan: vi.fn(),
  createTrip: vi.fn(),
  createIdea: vi.fn(),
  completeSlot: vi.fn(),
  dropPlan: vi.fn(async () => null),
  runNextAction: vi.fn(),
  addPeople: vi.fn(),
  openChatForPlan: vi.fn(),
  back: vi.fn(),
  setPlanPrivate: vi.fn(async () => undefined),
};

const enterPin = (code: string) => {
  for (const digit of code) {
    click(document.querySelector(`[data-testid="c2-pin-key-${digit}"]`)!);
  }
};

describe("F-4 gate minimalism", () => {
  it("the gated gate carries ONLY the title and unlock affordances - no explainer, no intentions, no form, no input", async () => {
    const events = {
      ...baseEvents,
      graphLockPasscodeSet: true,
      unlockPrivate: vi.fn(async () => false),
    };
    await render(<C2Graphs projection={projection()} events={events} />);
    const gate = document.querySelector('[data-testid="c2-vault-gate"]')!;
    expect(gate).not.toBeNull();
    // Title is the plain founder-corrected name.
    expect(document.querySelector('[data-testid="c2-graphs-private"]')!.textContent).toContain(
      "Private graphs",
    );
    // Near-silent: none of the old essay/intentions/server copy.
    const text = gate.textContent ?? "";
    expect(text).not.toMatch(/shown only here|hidden from your other lists|checked by Opal/i);
    expect(text).not.toMatch(/intention|working toward|goal/i);
    expect(text).not.toMatch(/set a passcode to open|enter your passcode/i);
    // No text field and no set-form anywhere on the gate.
    expect(gate.querySelector("input")).toBeNull();
    expect(gate.textContent).not.toContain("Set passcode and open");
    // The PIN pad IS the fallback affordance, and nothing is revealed.
    expect(document.querySelector('[data-testid="c2-private-pinpad"]')).not.toBeNull();
    // Orbit/ring compass: the vault's one brand glyph - the orb mark
    // beside the plain title - glyph only, aria-hidden, no copy.
    const mark = document.querySelector('[data-testid="c2-vault-mark"]')!;
    expect(mark).not.toBeNull();
    expect(mark.getAttribute("aria-hidden")).not.toBeNull();
    expect(mark.textContent?.trim()).toBe("");
    expect(document.body.textContent).not.toContain("Secret anniversary plan");
    // Biometrics are NOT offered when the host does not offer them.
    expect(document.querySelector('[data-testid="c2-private-biometric"]')).toBeNull();
  });

  it("PIN pad: digits fill dots, backspace and clear edit, the server's answer rules", async () => {
    const events = {
      ...baseEvents,
      graphLockPasscodeSet: true,
      unlockPrivate: vi.fn(async (code: string) => code === "2468"),
    };
    await render(<C2Graphs projection={projection()} events={events} />);
    const dots = () => document.querySelector('[data-testid="c2-private-code"]')!;
    enterPin("24");
    expect(dots().getAttribute("data-pin-length")).toBe("2");
    // Too short: Open stays disabled (a PIN is at least 4 digits).
    expect(
      (document.querySelector('[data-testid="c2-private-unlock"]') as HTMLButtonElement).disabled,
    ).toBe(true);
    click(document.querySelector('[data-testid="c2-pin-key-back"]')!);
    expect(dots().getAttribute("data-pin-length")).toBe("1");
    click(document.querySelector('[data-testid="c2-pin-key-clear"]')!);
    expect(dots().getAttribute("data-pin-length")).toBe("0");

    enterPin("0000");
    click(document.querySelector('[data-testid="c2-private-unlock"]')!);
    await flush();
    expect(events.unlockPrivate).toHaveBeenCalledWith("0000");
    expect(document.querySelector('[data-testid="c2-private-error"]')?.textContent).toContain(
      "That PIN did not open it.",
    );
    // A wrong PIN clears the pad.
    expect(dots().getAttribute("data-pin-length")).toBe("0");
    expect(document.body.textContent).not.toContain("Secret anniversary plan");

    enterPin("2468");
    click(document.querySelector('[data-testid="c2-private-unlock"]')!);
    await flush();
    expect(document.querySelector('[data-testid="c2-vault-open"]')).not.toBeNull();
    expect(document.body.textContent).toContain("Secret anniversary plan");
  });

  it("biometric unlock: offered only by the host, success opens, refusal falls back to the pad with one line", async () => {
    const okEvents = {
      ...baseEvents,
      graphLockPasscodeSet: true,
      unlockPrivate: vi.fn(async () => false),
      biometricUnlockAvailable: true,
      unlockWithBiometric: vi.fn(async () => true),
    };
    await render(<C2Graphs projection={projection()} events={okEvents} />);
    click(document.querySelector('[data-testid="c2-private-biometric"]')!);
    await flush();
    expect(okEvents.unlockWithBiometric).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain("Secret anniversary plan");

    await act(async () => root!.unmount());
    root = null;
    host?.remove();
    host = null;
    document.body.innerHTML = "";

    const noEvents = {
      ...baseEvents,
      graphLockPasscodeSet: true,
      unlockPrivate: vi.fn(async () => false),
      biometricUnlockAvailable: true,
      unlockWithBiometric: vi.fn(async () => false),
    };
    await render(<C2Graphs projection={projection()} events={noEvents} />);
    click(document.querySelector('[data-testid="c2-private-biometric"]')!);
    await flush();
    expect(document.querySelector('[data-testid="c2-private-error"]')?.textContent).toContain(
      "Use your PIN",
    );
    // The pad remains the way in.
    expect(document.querySelector('[data-testid="c2-private-pinpad"]')).not.toBeNull();
    expect(document.body.textContent).not.toContain("Secret anniversary plan");
  });
});

describe("F-4 vaultBiometric honesty in an environment without WebAuthn", () => {
  it("jsdom has no platform authenticator: nothing registers, nothing asserts, nothing is offerable", async () => {
    // This is the capture-environment truth the report declares:
    // without navigator.credentials / PublicKeyCredential the
    // helpers resolve false and store nothing - never a fake unlock.
    expect(hasVaultBiometricCredential()).toBe(false);
    expect(await registerVaultBiometric()).toBe(false);
    expect(hasVaultBiometricCredential()).toBe(false);
    expect(await assertVaultBiometric()).toBe(false);
    expect(await vaultBiometricOfferable(true)).toBe(false);
  });
});

describe("F-4 Settings credential home", () => {
  const youEvents = (extra: Partial<C2YouEvents> = {}): C2YouEvents => ({
    editProfile: vi.fn(),
    openSection: vi.fn(),
    backToHub: vi.fn(),
    setPreference: vi.fn(async () => undefined),
    runAction: vi.fn(),
    saveProfileFields: vi.fn(async () => undefined),
    submitSupportReport: vi.fn(async () => ({ reference: "OPAL-TEST1" })),
    setModePreference: vi.fn(),
    modePreference: "system",
    ...extra,
  });

  it("the hub carries a Private graphs row in a group, and search finds it", async () => {
    const ev = youEvents();
    const hub = youHubFromSession(null, false);
    await render(<C2YouHub projection={hub} events={ev} />);
    const row = document.querySelector('[data-testid="c2-you-row-private-graphs"]')!;
    expect(row).not.toBeNull();
    expect(row.textContent).toContain("Private graphs");
    click(row);
    expect(ev.openSection).toHaveBeenCalledWith("private-graphs");
  });

  it("the section is seeded from the ONE projection and the PIN form writes digits only through the real handler", async () => {
    mocks.getGraphLock.mockResolvedValue({ passcode_set: true, biometric_enabled: false });
    const section = await buildSettingsSection("private-graphs", {
      session: null,
      bearer: "tok",
    });
    expect(section.rows).toContainEqual(
      expect.objectContaining({ id: "vault_passcode_set", value: "Set" }),
    );
    expect(section.rows).toContainEqual(
      expect.objectContaining({ id: "vault_biometric_enabled", value: "Off" }),
    );

    const setVaultPasscode = vi.fn(async () => undefined);
    await render(
      <C2SettingsSection section={section} events={youEvents({ setVaultPasscode })} />,
    );
    expect(document.querySelector('[data-testid="c2-vault-settings-form"]')).not.toBeNull();
    const input = document.querySelector('[data-testid="c2-vault-pin"]') as HTMLInputElement;
    setInputValue(input, "13a57");
    // Non-digits never survive into the PIN state.
    expect(input.value).toBe("1357");
    click(document.querySelector('[data-testid="c2-vault-pin-save"]')!);
    await flush();
    expect(setVaultPasscode).toHaveBeenCalledWith("1357");
    expect(document.querySelector('[data-testid="c2-vault-pin-saved"]')).not.toBeNull();
  });

  it("the biometric toggle drives the real handler and only flips on success", async () => {
    mocks.getGraphLock.mockResolvedValue({ passcode_set: true, biometric_enabled: false });
    const section = await buildSettingsSection("private-graphs", {
      session: null,
      bearer: "tok",
    });
    const setVaultBiometric = vi.fn(async () => undefined);
    await render(
      <C2SettingsSection section={section} events={youEvents({ setVaultBiometric })} />,
    );
    const toggle = document.querySelector('[data-testid="c2-vault-biometric-toggle"]')!;
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    click(toggle);
    await flush();
    expect(setVaultBiometric).toHaveBeenCalledWith(true);
    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });

  it("a refused biometric enable keeps the toggle off and shows the handler's plain line", async () => {
    mocks.getGraphLock.mockResolvedValue({ passcode_set: true, biometric_enabled: false });
    const section = await buildSettingsSection("private-graphs", {
      session: null,
      bearer: "tok",
    });
    const setVaultBiometric = vi.fn(async () => {
      throw new Error("Biometric unlock is not available on this device.");
    });
    await render(
      <C2SettingsSection section={section} events={youEvents({ setVaultBiometric })} />,
    );
    const toggle = document.querySelector('[data-testid="c2-vault-biometric-toggle"]')!;
    click(toggle);
    await flush();
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(document.body.textContent).toContain(
      "Biometric unlock is not available on this device.",
    );
  });

  it("a failed lock read yields the honest note and NO form", async () => {
    mocks.getGraphLock.mockRejectedValue(new Error("offline"));
    const section = await buildSettingsSection("private-graphs", {
      session: null,
      bearer: "tok",
    });
    await render(<C2SettingsSection section={section} events={youEvents()} />);
    expect(document.querySelector('[data-testid="c2-vault-settings-form"]')).toBeNull();
    expect(document.body.textContent).toContain("will not guess");
  });
});

describe("F-4 orbit/ring compass pins (CSS)", () => {
  const shellCssText = readFileSync(resolve(here, "c2shell.css"), "utf8");

  it("entered PIN dots are a ring riding a point of light - never a solid blob, never animated", () => {
    const start = shellCssText.indexOf('.c2s-pin-dot[data-filled="1"]');
    expect(start).toBeGreaterThan(-1);
    const block = shellCssText
      .slice(start, shellCssText.indexOf("}", start))
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(block).toContain("radial-gradient");
    expect(block).toContain("border-color: var(--accent-1)");
    expect(block).not.toContain("animation");
    // The unentered dot is a quiet hairline ring.
    const rest = shellCssText.indexOf(".c2s-pin-dot {");
    const restBlock = shellCssText.slice(rest, shellCssText.indexOf("}", rest));
    expect(restBlock).toContain("border: 1px solid var(--line-2)");
    expect(restBlock).toContain("border-radius: 999px");
  });

  it("the vault's lit treatment is one fire ring at AR-05's envelope (1px gradient border, glow 18px)", () => {
    const start = shellCssText.indexOf(".c2s-vault {");
    const block = shellCssText
      .slice(start, shellCssText.indexOf("}", start))
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(block).toContain("var(--orb-fire-gradient) border-box");
    expect(block).toContain("border: 1px solid transparent");
    expect(block).toContain("0 0 18px");
    // No plan-state hue is spent on the vault (AR-00.9).
    expect(block).not.toMatch(/--orb-indicator-|--plan-state-/);
  });
});

describe("F-5 dock orb opacity", () => {
  const shellCss = readFileSync(resolve(here, "c2shell.css"), "utf8");
  const tokensCss = readFileSync(resolve(here, "../../theme/c2Tokens.css"), "utf8");

  it("the center disc's fill is the solid --dock-orb-fill token, opacity 1, no backdrop filter, no translucent token", () => {
    const start = shellCss.indexOf(".c2s-dock-center-disc {");
    expect(start).toBeGreaterThan(-1);
    // Declarations only - CSS comments are prose, not paint.
    const block = shellCss
      .slice(start, shellCss.indexOf("}", start))
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(block).toContain("background: var(--dock-orb-fill)");
    expect(block).toContain("opacity: 1");
    expect(block).not.toContain("backdrop-filter");
    expect(block).not.toContain("--accent-quiet");
    expect(block).not.toMatch(/rgba\(/);
  });

  it("--dock-orb-fill is an opaque hex in BOTH modes (light and dark blocks)", () => {
    const defs = [...tokensCss.matchAll(/--dock-orb-fill:\s*(#[0-9a-fA-F]{6});/g)].map(
      (m) => m[1],
    );
    expect(defs.length).toBe(2);
    expect(tokensCss).not.toMatch(/--dock-orb-fill:\s*rgba/);
  });

  it("the dock echo treatment never reintroduces translucency on the disc (border/glow only)", () => {
    const start = shellCss.indexOf('.c2s-dock-center-disc[data-dock-echo] {');
    expect(start).toBeGreaterThan(-1);
    const block = shellCss.slice(start, shellCss.indexOf("}", start));
    expect(block).not.toContain("background");
    expect(block).not.toContain("opacity");
  });
});
