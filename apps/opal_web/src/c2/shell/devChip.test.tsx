/**
 * @vitest-environment jsdom
 *
 * Repair #27 W27-2 — the dev seed chip is a BROWSER-DEV affordance
 * only. Founder walk #5 (native TestFlight build): the native shell
 * composes opal_founder_seed into its URL, so the chip rendered on
 * every native screen and sat on the thread composer, occluding the
 * YOUR MOVE Approve action. Pin: under the native host the chip
 * never renders, whatever dev/seed params are present; in a browser
 * it still renders for dev/seed URLs (the walk-link law uses it).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DevChip } from "./C2Shell";

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

function setUrl(search: string) {
  window.history.replaceState({}, "", `/${search}`);
}

beforeEach(() => {
  sessionStorage.clear();
  document.documentElement.setAttribute("data-git-head", "abc1234");
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  host = null;
  root = null;
  document.body.innerHTML = "";
  sessionStorage.clear();
  setUrl("");
});

describe("W27-2 dev chip native gating", () => {
  it("never renders under the native host, even with dev + seed params", async () => {
    setUrl("?opal_native_host=1&opal_founder_seed=1&opal_dev=1");
    await render(<DevChip hidden={false} />);
    expect(host!.querySelector('[data-testid="c2-dev-chip"]')).toBeNull();
  });

  it("never renders when the native host is flagged via sessionStorage", async () => {
    sessionStorage.setItem("opal_native_host", "1");
    setUrl("?opal_founder_seed=1&opal_dev=1");
    await render(<DevChip hidden={false} />);
    expect(host!.querySelector('[data-testid="c2-dev-chip"]')).toBeNull();
  });

  it("still renders in a browser dev context (opal_dev=1)", async () => {
    setUrl("?opal_dev=1");
    await render(<DevChip hidden={false} />);
    const chip = host!.querySelector('[data-testid="c2-dev-chip"]');
    expect(chip).not.toBeNull();
    expect(chip!.textContent).toContain("seed -");
    expect(chip!.textContent).toContain("abc1234");
  });

  it("still renders in a browser founder-seed context (walk discipline)", async () => {
    setUrl("?opal_founder_seed=1&opal_dev=1");
    await render(<DevChip hidden={false} />);
    expect(host!.querySelector('[data-testid="c2-dev-chip"]')).not.toBeNull();
  });

  it("renders nothing without dev/seed flags", async () => {
    setUrl("");
    await render(<DevChip hidden={false} />);
    expect(host!.querySelector('[data-testid="c2-dev-chip"]')).toBeNull();
  });
});
