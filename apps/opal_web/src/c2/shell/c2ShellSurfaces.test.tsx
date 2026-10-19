/**
 * @vitest-environment jsdom
 *
 * Repair #18 - Division C2 - shell surface tests.
 *
 * What these prove (jsdom layer; the rendered/Playwright layer is in
 * shots/repair18/c2/): the splash pair's exactly-once law on the real
 * shell component, onboarding's entry chrome and step count, member
 * navigation truth (active dock slot matches the visible surface),
 * toggle truth (a toggle never flips locally - it holds the projected
 * value when the save fails and shows the error line), and the A1
 * static audit over every C2 shell file (no raw hex, no literal
 * z-index, no retired identity asset paths, every used token defined).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { C2Shell } from "./C2Shell";
import { C2SettingsSection } from "./C2You";
import { saveProfile } from "../../api/productClient";

// Hunt-fix B-12: a failed plans read now renders the Center error
// state instead of an empty deck, so this navigation suite mocks a
// successful (empty) plans read — the deck it exercises is the
// loaded one. The failure state itself is pinned in
// huntFixShellData.test.ts.
vi.mock("../../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../../api/productClient")>(
    "../../api/productClient",
  );
  return {
    ...actual,
    listOpalPlans: async () => ({ plans: [] }),
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  host = null;
  root = null;
  document.body.innerHTML = "";
  localStorage.clear();
  sessionStorage.clear();
});

function q(sel: string) {
  return document.querySelector(sel);
}
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

describe("C2 shell - splash pair law", () => {
  it("splash 1 has zero Enter Opal, splash 2 has exactly one", async () => {
    await render(<C2Shell />);
    expect(q('[data-testid="c2-splash1"]')).toBeTruthy();
    expect(document.body.textContent?.match(/Enter Opal/g) ?? []).toHaveLength(0);
    click(q('[data-testid="c2-splash1-continue"]')!);
    expect(q('[data-testid="c2-splash2"]')).toBeTruthy();
    expect(document.body.textContent?.match(/Enter Opal/g) ?? []).toHaveLength(1);
  });

  it("already-account on splash 1 goes to phone auth with honest step count", async () => {
    await render(<C2Shell />);
    click(q('[data-testid="c2-splash1-already"]')!);
    expect(q('[data-testid="c2-entry-phone"]')).toBeTruthy();
    expect(document.body.textContent).toContain("Step 1 of 3");
    expect(document.body.textContent).toContain("Start with your phone.");
  });
});

describe("C2 shell - member navigation truth", () => {
  it("a saved session lands on Center; dock active always matches the surface", async () => {
    saveProfile({
      access_token: "test-token",
      user_id: "user-1",
      display_name: "Sadeil Lewis",
      handle: "sadeil",
      session_id: "sess-1",
    });
    await render(<C2Shell />);
    await flush();
    expect(q('[data-testid="c2-center-opening"]')).toBeTruthy();
    click(q('[data-testid="c2-dock-graphs"]')!);
    await flush();
    expect(q('[data-testid="c2-graphs"]')).toBeTruthy();
    expect(q('[data-testid="c2-dock-graphs"]')?.getAttribute("data-active")).toBe("1");
    expect(q('[data-testid="c2-center-opening"]')).toBeNull();
    click(q('[data-testid="c2-dock-you"]')!);
    await flush();
    expect(q('[data-testid="c2-you"]')).toBeTruthy();
    expect(q('[data-testid="c2-dock-you"]')?.getAttribute("data-active")).toBe("1");
  });
});

describe("C2 settings - toggle truth", () => {
  it("a failed save keeps the projected value and shows one error line", async () => {
    const setPreference = vi.fn(async () => {
      throw new Error("offline");
    });
    const events = {
      editProfile: vi.fn(),
      openSection: vi.fn(),
      backToHub: vi.fn(),
      setPreference,
      runAction: vi.fn(),
      saveProfileFields: vi.fn(async () => undefined),
      submitSupportReport: vi.fn(async () => ({ reference: "OPAL-TEST" })),
      setModePreference: vi.fn(),
      modePreference: "system" as const,
    };
    await render(
      <C2SettingsSection
        section={{
          key: "notifications",
          title: "Notifications",
          lede: "Loud for people. Quiet for noise.",
          rows: [
            { kind: "toggle", id: "messages-calls", title: "Messages and calls", value: true },
          ],
        }}
        events={events}
      />,
    );
    const toggle = q('[data-testid="c2-setting-toggle-messages-calls"]')!;
    expect(toggle.getAttribute("data-on")).toBe("1");
    click(toggle);
    await flush();
    expect(document.body.textContent).toContain("That did not save. Try again.");
    expect(toggle.getAttribute("data-on")).toBe("1");
    expect(setPreference).toHaveBeenCalledWith("notifications", "messages-calls", false);
  });
});

describe("C2 shell - A1 static audit", () => {
  const shellDir = join(process.cwd(), "src/c2/shell");
  const files = readdirSync(shellDir).filter(
    (f) => f.endsWith(".css") || f.endsWith(".tsx") || f.endsWith(".ts"),
  );

  it("no raw hex colors in shell styles or components", () => {
    for (const file of files) {
      if (file.includes(".test.")) continue;
      const text = readFileSync(join(shellDir, file), "utf8");
      const code = text
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "")
        .replace(/https?:\/\/\S+/g, "");
      expect(code.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [], file).toEqual([]);
    }
  });

  it("no literal z-index anywhere in the shell", () => {
    for (const file of files) {
      if (file.includes(".test.")) continue;
      const text = readFileSync(join(shellDir, file), "utf8");
      expect(text.match(/z-index:\s*\d/g) ?? [], file).toEqual([]);
      expect(text.match(/zIndex:\s*\d/g) ?? [], file).toEqual([]);
    }
  });

  it("no retired identity asset paths referenced by shell surfaces", () => {
    for (const file of files) {
      if (file.includes(".test.")) continue;
      const text = readFileSync(join(shellDir, file), "utf8");
      for (const banned of ["opal-logo", "opal-wordmark.png", "opal-character", "opal-center-mark"]) {
        expect(text.includes(banned), `${file} references ${banned}`).toBe(false);
      }
    }
  });

  it("every token used by c2shell.css is defined in c2Tokens.css, layerTokens.css, or orbTokens.css", () => {
    // Harmony-0 extension, named: the shell chrome now consumes the
    // sampled orb tokens (theme/orbTokens.css - imported on the same
    // C2 module graph in main.tsx, after c2Tokens.css), so that sheet
    // is a lawful definition source for shell tokens alongside the
    // two original sheets. The audit's force is unchanged: every used
    // token must be defined in a token sheet the C2 graph imports.
    const css = readFileSync(join(shellDir, "c2shell.css"), "utf8");
    const tokens = readFileSync(join(process.cwd(), "src/theme/c2Tokens.css"), "utf8");
    const layerTokens = readFileSync(join(process.cwd(), "src/theme/layerTokens.css"), "utf8");
    const orbTokens = readFileSync(join(process.cwd(), "src/theme/orbTokens.css"), "utf8");
    const used = new Set([...css.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]));
    for (const token of used) {
      const defined =
        tokens.includes(`${token}:`) ||
        layerTokens.includes(`${token}:`) ||
        orbTokens.includes(`${token}:`);
      expect(defined, `${token} is not defined`).toBe(true);
    }
  });
});
