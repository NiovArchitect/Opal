/**
 * @vitest-environment jsdom
 *
 * Repair #19 W6 - BREADTH scan (founder retrospective rule: a check
 * narrower than its class fails silently). The Listen removal is
 * proven for the whole CLASS, not only the founder's screenshot:
 *
 *  A. RENDERED scans of every surface family where an Opal
 *     contribution can render:
 *       - C1/C2 Center chat, person thread, plan card
 *         (r19ListenRail.test.tsx - the founder's surface family)
 *       - legacy (R17) shell components, rendered directly (the
 *         R17 shell itself was retired from the served build by
 *         R19 W15; the ?shell=r17 override no longer exists):
 *         the living character with a REAL mic-capture signal on
 *         (its status label + aria are user-facing), and the
 *         OpalAmbient voice control.
 *  B. COPY-RECORD scans: every presence/status copy record in the
 *     app (C1 PRESENCE_COPY, legacy OPAL_PRESENCE_COPY,
 *     LIVING_STATE_COPY, the composer LISTENING_COPY) - no value
 *     may cast Opal as listening.
 *  C. FULL STRING-LITERAL scan of every non-test source file in
 *     apps/opal_web/src and every backend file in
 *     apps/opal_core/lib: no string literal may contain the
 *     user-facing forms "Listen" / "Listening" / "Here with you".
 *     (Lowercase internal identifiers - the "listening" state key,
 *     is-listening CSS hooks, the Deepgram /v1/listen URL, the
 *     /voice/listen API route - are code, not copy; they are
 *     classified in the W6 report, not banned here. ONE backend
 *     exception is allowlisted by exact file+content: the OC-1
 *     guard fingerprint, a legacy constant that exists precisely
 *     so tests can prove the live path NEVER returns it.)
 *
 * DOM scans are viewport-independent for copy (the same components
 * render at phone and at the 1024px wide two-pane layout); the
 * rail's layout half is pinned by the nowrap/own-row CSS in
 * r19ListenRail + c1.css, which no viewport can crush.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../opalCenterVoice", () => ({
  listenOnce: vi.fn(async () => ({ status: "ok", text: "" })),
  probeMicPermission: vi.fn(async () => "prompt" as const),
  requestMicPermission: vi.fn(async () => "granted" as const),
  speakText: vi.fn(async () => undefined),
  stopListening: vi.fn(),
  stopSpeaking: vi.fn(),
}));

import { OpalLivingCharacter } from "../OpalLivingCharacter";
import { OpalAmbient } from "../OpalAmbient";
import { OPAL_PRESENCE_COPY } from "../opalPresence";
import { LIVING_STATE_COPY } from "../livingCharacterState";
import { PRESENCE_COPY } from "./C1Surfaces";

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
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

afterEach(async () => {
  if (root) {
    await act(async () => root!.unmount());
  }
  host?.remove();
  host = null;
  root = null;
});

beforeEach(() => {
  vi.clearAllMocks();
});

function expectNoListeningFrame(container: HTMLElement) {
  const text = container.textContent || "";
  expect(text).not.toMatch(/\bListen\b/);
  expect(text).not.toMatch(/Listening/);
  expect(text).not.toContain("Here with you");
  for (const el of container.querySelectorAll("[aria-label]")) {
    const label = el.getAttribute("aria-label") || "";
    expect(label).not.toMatch(/\bListen\b/);
    expect(label).not.toMatch(/Listening/);
  }
  for (const el of container.querySelectorAll("[placeholder]")) {
    expect(el.getAttribute("placeholder") || "").not.toMatch(/Listening/);
  }
}

describe("R19 W6 breadth A - legacy shell rendered surfaces", () => {
  it("living character with a real mic signal: status + aria name voice input, never listening", async () => {
    await render(<OpalLivingCharacter externalListening />);
    expectNoListeningFrame(host!);
    expect(host!.querySelector('[data-testid="opal-living-status"]')?.textContent).toBe(
      "Voice input is on",
    );
    const btn = host!.querySelector("button.opal-living-character");
    expect(btn?.getAttribute("aria-label")).toBe("Stop voice input");
    // The internal presence STATE key stays "listening" (code, not
    // copy) - the scan above proves it never reaches the glass.
    expect(btn?.getAttribute("data-presence-state")).toBe("listening");
  });

  it("OpalAmbient: the voice control is named voice input; toggling it shows no listening copy", async () => {
    await render(<OpalAmbient onClose={() => undefined} />);
    expectNoListeningFrame(host!);
    const btn = host!.querySelector('[data-testid="opal-voice-input"]');
    expect(btn).not.toBeNull();
    expect(host!.querySelector('[data-testid="opal-listen"]')).toBeNull();
    expect(btn!.getAttribute("aria-label")).toBe("Voice input");
    await act(async () => {
      btn!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expectNoListeningFrame(host!);
    expect(btn!.getAttribute("aria-label")).toBe("Stop voice input");
    expect(host!.textContent).toContain("Voice input on.");
  });
});

describe("R19 W6 breadth B - every presence/status copy record", () => {
  it("no copy value in any record casts Opal as listening", async () => {
    // The real composer placeholder copy, unmocked.
    const { LISTENING_COPY } = await vi.importActual<typeof import("../opalCenterVoice")>(
      "../opalCenterVoice",
    );
    const records: Record<string, Record<string, string>> = {
      PRESENCE_COPY,
      OPAL_PRESENCE_COPY,
      LIVING_STATE_COPY,
    };
    for (const [name, record] of Object.entries(records)) {
      for (const [key, value] of Object.entries(record)) {
        expect(value, `${name}.${key}`).not.toMatch(/listen/i);
        expect(value, `${name}.${key}`).not.toContain("Here with you");
      }
    }
    expect(LISTENING_COPY).not.toMatch(/listen/i);
    expect(OPAL_PRESENCE_COPY.listening).toBe("Voice input is on");
    expect(LIVING_STATE_COPY.listening).toBe("Voice input is on.");
  });
});

/* ---- C: full string-literal scan ---- */

/** Collect string-literal contents from TS/TSX/Elixir source,
 *  skipping comments (a small state machine, so URLs inside
 *  strings and quotes inside comments cannot confuse it). */
function stringLiterals(src: string): string[] {
  const out: string[] = [];
  let i = 0;
  let state: "code" | "line" | "block" | "sq" | "dq" | "tpl" = "code";
  let buf = "";
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1] ?? "";
    if (state === "code") {
      if (c === "/" && n === "/") state = "line";
      else if (c === "/" && n === "*") state = "block";
      else if (c === "#") state = "line"; // Elixir comment (harmless for TS: # only in strings/regex here)
      else if (c === "'") { state = "sq"; buf = ""; }
      else if (c === '"') { state = "dq"; buf = ""; }
      else if (c === "`") { state = "tpl"; buf = ""; }
      i += state === "line" || state === "block" ? 2 : 1;
      continue;
    }
    if (state === "line") {
      if (c === "\n") state = "code";
      i += 1;
      continue;
    }
    if (state === "block") {
      if (c === "*" && n === "/") { state = "code"; i += 2; continue; }
      i += 1;
      continue;
    }
    // in a string
    if (c === "\\") { buf += src.slice(i, i + 2); i += 2; continue; }
    const closer = state === "sq" ? "'" : state === "dq" ? '"' : "`";
    if (c === closer) { out.push(buf); state = "code"; i += 1; continue; }
    buf += c;
    i += 1;
  }
  return out;
}

function walk(dir: string, exts: string[]): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full, exts));
    else if (exts.some((e) => entry.name.endsWith(e))) files.push(full);
  }
  return files;
}

const BANNED = /\bListen\b|\bListening\b|Here with you/;

describe("R19 W6 breadth C - full string-literal scan, web + backend", () => {
  it("no user-facing Listen/Listening literal in any apps/opal_web/src source file", () => {
    const webRoot = resolve(__dirname, "../../..");
    const files = walk(resolve(webRoot, "src"), [".ts", ".tsx"]).filter(
      (f) => !f.includes(".test."),
    );
    expect(files.length).toBeGreaterThan(100);
    const offenders: string[] = [];
    for (const file of files) {
      for (const lit of stringLiterals(readFileSync(file, "utf8"))) {
        if (BANNED.test(lit)) offenders.push(`${file}: ${JSON.stringify(lit.slice(0, 80))}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("backend lib: the ONLY listening line is the OC-1 guard fingerprint, which is never rendered", () => {
    // Line-based scan (Elixir heredocs/sigils defeat a naive
    // string-literal tokenizer; every user-facing backend string
    // lives on one line in this codebase).
    const repoRoot = resolve(__dirname, "../../../../..");
    const files = walk(resolve(repoRoot, "apps/opal_core/lib"), [".ex", ".exs"]).filter(
      (f) => !f.includes("/test"),
    );
    expect(files.length).toBeGreaterThan(50);
    const offenders: string[] = [];
    for (const file of files) {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        if (BANNED.test(line) || line.includes("I'm listening")) {
          offenders.push(`${file}: ${line.trim().slice(0, 100)}`);
        }
      }
    }
    // Exactly one, allowlisted by content: the legacy OC-1 canned
    // body, kept ONLY so the guard tests can prove no live Opal
    // reply ever equals it (opal_placeholder_guard_test.exs,
    // opal_conversations_test.exs refute it in live responses).
    expect(offenders.length).toBe(1);
    expect(offenders[0]).toContain("opal_message.ex");
    expect(offenders[0]).toContain("I'm listening. Tell me what's on your mind");
  });
});
