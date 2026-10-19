/**
 * @vitest-environment jsdom
 *
 * Repair #19 W20 (JA-05, BS-07 leg 2) — the crash boundary.
 *
 * Before: OpalErrorBoundary rendered the legacy face (app-futura
 * classes, hardcoded #050816, system-ui) in both modes, and its
 * "Restart first run" recovery navigated to
 * /?opal_reset_first_run=1 — a flag whose only consumer is the
 * unmounted legacy app, so recovery did nothing.
 *
 * Now: the boundary renders in the current design (the C2 shell's
 * root + tokens), and recovery reloads the current URL — re-entering
 * the C2 shell with the session preserved. The dead flag path is
 * deleted (absence proven by the source scans below).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OpalErrorBoundary } from "./OpalErrorBoundary";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  host?.remove();
  host = null;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

function Boom(): React.ReactElement {
  throw new Error("render exploded");
}

describe("JA-05 — crash boundary face and recovery", () => {
  it("renders the current-design face (C2 shell root), not the legacy face", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root!.render(
        <OpalErrorBoundary>
          <Boom />
        </OpalErrorBoundary>,
      );
    });

    const face = document.querySelector('[data-testid="runtime-error-boundary"]');
    expect(face).toBeTruthy();
    expect(face!.className).toContain("c2s-root");
    expect(face!.getAttribute("data-shell")).toBe("c2");
    expect(document.body.innerHTML).not.toContain("app-futura");
    expect(document.body.innerHTML).not.toContain("Restart first run");
    expect(face!.querySelector('[role="alert"]')?.textContent).toContain(
      "Something interrupted Opal.",
    );
    expect(
      document.querySelector('[data-testid="runtime-error-reload"]')?.textContent,
    ).toContain("Back to Opal");
  });

  it("recovery reloads the current shell (no dead reset flag navigation)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...original, reload, href: original.href },
    });
    try {
      host = document.createElement("div");
      document.body.appendChild(host);
      root = createRoot(host);
      await act(async () => {
        root!.render(
          <OpalErrorBoundary>
            <Boom />
          </OpalErrorBoundary>,
        );
      });
      const btn = document.querySelector(
        '[data-testid="runtime-error-reload"]',
      ) as HTMLButtonElement;
      await act(async () => {
        btn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
      });
      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: original,
      });
    }
  });

  it("absence scan: the boundary and the served entry carry no legacy face and no dead flag path", () => {
    const boundarySrc = readFileSync(resolve(__dirname, "./OpalErrorBoundary.tsx"), "utf8");
    expect(boundarySrc).not.toContain("app-futura");
    expect(boundarySrc).not.toContain("#050816");
    expect(boundarySrc).not.toContain("opal_reset_first_run");
    expect(boundarySrc).not.toContain("Restart first run");
    expect(boundarySrc).toContain("c2s-root");
    expect(boundarySrc).toContain("window.location.reload()");

    const mainSrc = readFileSync(resolve(__dirname, "../main.tsx"), "utf8");
    expect(mainSrc).not.toContain("runtime-error-boundary");
    expect(mainSrc).toContain('from "./runtime/OpalErrorBoundary"');
  });
});
