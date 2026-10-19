/**
 * @vitest-environment jsdom
 *
 * Repair #19 W21 (F6) — orbit privacy truthfulness.
 *  (a) The rail must never assert "Private" from an UNKNOWN privacy
 *      state: a group whose sessions only imply their anchor from
 *      birth scope (no explicit contract anchor carrying a boolean
 *      private flag) renders its ordinary subtitle at every frame.
 *      A group with an explicit private:true anchor IS locked:
 *      header only, "Private", no preview, no count.
 *  (b) The orbit sheet's Make-private write must be visible: the
 *      host merges the sessions read-back into the sheet anchor
 *      (anchorWithOrbitReadBack), and the sheet's toggle label /
 *      aria-pressed follow anchor.private.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CenterSessionList } from "../../opalUi/c1/C1Surfaces";
import { OrbitSheet } from "../../opalUi/c1/OrbitSheet";
import {
  buildOrbitLog,
  type OpalAnchor,
  type PersonOpalSessionRow,
} from "../../opalUi/c1/opalChatScope";
import { anchorWithOrbitReadBack } from "./C1ShellHosts";

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
  root = null;
  host?.remove();
  host = null;
  document.body.innerHTML = "";
});

function row(over: Partial<PersonOpalSessionRow>): PersonOpalSessionRow {
  return {
    id: "s1",
    title: "Chat",
    preview: "the latest line",
    timeLabel: "1h",
    isActive: false,
    context: null,
    anchor: null,
    updatedAt: "2026-10-18T11:00:00Z",
    pinned: false,
    pinnedAt: null,
    userArchived: false,
    ...over,
  } as PersonOpalSessionRow;
}

const MAYA: OpalAnchor = { type: "person", id: "user-maya", label: "Maya Torres" };

describe("F6a — unknown privacy never asserts Private", () => {
  it("scope-implied group: privateKnown=false, subtitle is the preview, not Private", async () => {
    const rows = [
      row({
        id: "m1",
        context: { personId: "user-maya", personName: "Maya Torres", conversationId: null, planId: null, planTitle: null },
        anchor: null,
        preview: "help me plan saturday",
      }),
    ];
    const log = buildOrbitLog(rows);
    expect(log.groups).toHaveLength(1);
    expect(log.groups[0].privateKnown).toBe(false);
    expect(log.groups[0].private).toBe(false);

    const el = await render(
      <CenterSessionList
        sessions={rows}
        onOpen={vi.fn()}
        orbitGate={{ isUnlocked: () => false, requestUnlock: vi.fn() }}
      />,
    );
    const header = el.querySelector('[data-testid="orbit-group-header"]')!;
    expect(header.textContent).toContain("help me plan saturday");
    expect(header.textContent).not.toContain("Private");
    expect(
      el.querySelector('[data-testid="orbit-group"]')!.getAttribute("data-private-known"),
    ).toBe("false");
  });

  it("explicit private:true group: locked, Private subtitle, no preview", async () => {
    const rows = [
      row({
        id: "j1",
        anchor: { type: "person", id: "user-jordan", label: "Jordan Ellis", private: true },
        preview: "a secret line",
      }),
    ];
    const log = buildOrbitLog(rows);
    expect(log.groups[0].privateKnown).toBe(true);
    expect(log.groups[0].private).toBe(true);

    const el = await render(
      <CenterSessionList
        sessions={rows}
        onOpen={vi.fn()}
        orbitGate={{ isUnlocked: () => false, requestUnlock: vi.fn() }}
      />,
    );
    const header = el.querySelector('[data-testid="orbit-group-header"]')!;
    expect(header.textContent).toContain("Private");
    expect(header.textContent).not.toContain("a secret line");
  });

  it("explicit private:false group: known, not locked, preview shows", async () => {
    const rows = [row({ id: "m1", anchor: { ...MAYA, private: false }, preview: "open line" })];
    const log = buildOrbitLog(rows);
    expect(log.groups[0].privateKnown).toBe(true);
    expect(log.groups[0].private).toBe(false);
    const el = await render(
      <CenterSessionList
        sessions={rows}
        onOpen={vi.fn()}
        orbitGate={{ isUnlocked: () => false, requestUnlock: vi.fn() }}
      />,
    );
    expect(el.querySelector('[data-testid="orbit-group-header"]')!.textContent).toContain("open line");
  });
});

describe("F6b — the sheet reflects the orbit-private write (read-back)", () => {
  it("anchorWithOrbitReadBack takes the private flag from the read-back rows", () => {
    const stale: OpalAnchor = { ...MAYA, private: false };
    const readBack = [row({ id: "m1", anchor: { ...MAYA, private: true } })];
    expect(anchorWithOrbitReadBack(stale, readBack).private).toBe(true);
    const readBackOpen = [row({ id: "m1", anchor: { ...MAYA, private: false } })];
    expect(anchorWithOrbitReadBack({ ...MAYA, private: true }, readBackOpen).private).toBe(false);
    // No explicit rows for this orbit: the caller's anchor is untouched.
    expect(anchorWithOrbitReadBack(stale, [row({ id: "x", anchor: null })])).toEqual(stale);
  });

  it("the sheet toggle label + aria-pressed follow anchor.private after the write", async () => {
    const onToggle = vi.fn();
    const sheet = (anchor: OpalAnchor) => (
      <OrbitSheet
        anchor={anchor}
        sessions={[]}
        onOpen={vi.fn()}
        onStartNew={vi.fn()}
        onRemove={vi.fn()}
        onTogglePrivate={onToggle}
        onClose={vi.fn()}
      />
    );
    const el = await render(sheet({ ...MAYA, private: false }));
    const toggle = el.querySelector('[data-testid="orbit-sheet-private-toggle"]')!;
    expect(toggle.textContent).toContain("Make this orbit private");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    await act(async () => {
      toggle.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
    expect(onToggle).toHaveBeenCalledWith(true);
    // The host re-renders the sheet with the read-back anchor.
    await act(async () => {
      root!.render(sheet({ ...MAYA, private: true }));
    });
    const flipped = el.querySelector('[data-testid="orbit-sheet-private-toggle"]')!;
    expect(flipped.textContent).toContain("Make this orbit not private");
    expect(flipped.getAttribute("aria-pressed")).toBe("true");
  });
});
