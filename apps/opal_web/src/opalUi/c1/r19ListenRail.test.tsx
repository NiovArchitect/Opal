/**
 * @vitest-environment jsdom
 *
 * Repair #19 W6 - KILL THE LISTEN RAIL (W5-08).
 *
 * Founder, reviewing a thread-like surface titled "Zoom standup with
 * the team" (subtitle "Here with you."): every Opal message carried
 * a broken vertical rail spelling "Listen" letter-by-letter down
 * the side of the bubble. His law: "Opal doesn't listen - it
 * graphs. That's our thing." And meeting content belongs in Opal
 * only as an ingested transcript/summary record, never as a surface
 * identity ("Zoom page").
 *
 * Permanent pins:
 *  1. The founder's exact surface (C1 CenterChat, served by the C2
 *     shell's CenterHost) renders with NO "Listen" CTA, NO listen
 *     testids/classes, NO "Here with you." / "Listening." framing -
 *     and the header identifies the surface at a glance: the
 *     conversation title + "Chat with Opal".
 *  2. The real function the rail carried (TTS playback of Opal's
 *     exact words) still works end to end, re-homed as "Read aloud"
 *     in its own action row OUTSIDE the bubble; provider off renders
 *     nothing (honestly absent).
 *  3. People threads (ThreadShell) and plan cards get the same
 *     treatment - no rail anywhere the shared MessageFlow renders.
 *     W18-FIX RE-PIN: the ThreadShell leg is now a SEPARATION pin
 *     (W14 law, item 18): Opal conversations never blend into person
 *     threads - messagesForSurface filters Opal-authored messages
 *     out of person threads entirely (pinned by
 *     opalChatDoorway.test.tsx). The old leg expected a read-aloud
 *     control in a person thread; that expectation contradicted the
 *     separation law and the fixture, not the law, was wrong. The
 *     read-aloud-outside-the-bubble intent stays asserted where
 *     Opal messages legitimately live - the CenterChat tests above
 *     (outside-the-bubble, own action row, exact-words end to end).
 *  4. Source pins over the served C1/C2 files that carried the
 *     frame, so the words cannot creep back in those files.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchVoiceStatus = vi.fn();
const speakApprovedText = vi.fn();

vi.mock("../../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../../api/productClient")>(
    "../../api/productClient",
  );
  return {
    ...actual,
    fetchVoiceStatus: (...a: unknown[]) => fetchVoiceStatus(...a),
    speakApprovedText: (...a: unknown[]) => speakApprovedText(...a),
  };
});

import { CenterChat, PRESENCE_COPY, ThreadShell } from "./C1Surfaces";
import { PlanCard } from "./PlanCard";
import { resetReadAloudStatusCache } from "./ReadAloudButton";
import type { PlanProjection } from "./planProjection";

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

async function click(el: Element) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

beforeEach(() => {
  fetchVoiceStatus.mockReset();
  speakApprovedText.mockReset();
  resetReadAloudStatusCache();
});

afterEach(async () => {
  if (root) {
    await act(async () => root!.unmount());
  }
  host?.remove();
  host = null;
  root = null;
  vi.unstubAllGlobals();
});

const OPAL_BODY = "Standup is graphed: Saturday 10 AM, with the team.";

function expectNoListenRail() {
  const text = host!.textContent || "";
  expect(text).not.toContain("Here with you");
  expect(text).not.toMatch(/\bListen\b/);
  expect(text).not.toMatch(/Listening/);
  expect(host!.querySelector('[data-testid="listen-play"]')).toBeNull();
  expect(host!.querySelector('[data-testid="listen-stop"]')).toBeNull();
  expect(host!.querySelector(".c1-listen-btn")).toBeNull();
  for (const btn of host!.querySelectorAll("button")) {
    expect(btn.textContent?.trim()).not.toBe("Listen");
    expect(btn.getAttribute("aria-label")).not.toBe("Listen");
  }
}

describe("R19 W6 - the founder's surface: CenterChat", () => {
  it("no rail, no listening frame; header says what this is - the title + Chat with Opal", async () => {
    fetchVoiceStatus.mockResolvedValue({ tts_configured: true, transcription_configured: false });
    await render(
      <CenterChat
        title="Zoom standup with the team"
        messages={[
          { id: "u1", authorKind: "person", own: true, body: "Standup Saturday?" },
          { id: "o1", authorKind: "opal", body: OPAL_BODY },
        ]}
        plansById={new Map()}
        onSend={() => undefined}
      />,
    );
    expectNoListenRail();
    // Self-evidence: what conversation this is, and who Opal is in it.
    expect(host!.querySelector('[data-testid="center-chat-title"]')?.textContent).toBe(
      "Zoom standup with the team",
    );
    expect(host!.querySelector(".c1-thread-sub")?.textContent).toBe("Chat with Opal");
    // The meeting word survives ONLY as the conversation's own
    // title (the user's topic) - the surface identity is the chat.
    expect(host!.querySelector('[data-testid="center-chat"]')).not.toBeNull();
  });

  it("read aloud is re-homed OUTSIDE the bubble and speaks Opal's exact words end to end", async () => {
    fetchVoiceStatus.mockResolvedValue({ tts_configured: true, transcription_configured: false });
    speakApprovedText.mockResolvedValue({ audio_url: "https://example.test/a.mp3", text: OPAL_BODY });
    const pause = vi.fn();
    const play = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("Audio", vi.fn().mockImplementation(() => ({ play, pause, onended: null })));
    await render(
      <CenterChat
        title="Zoom standup with the team"
        messages={[{ id: "o1", authorKind: "opal", body: OPAL_BODY }]}
        plansById={new Map()}
        onSend={() => undefined}
      />,
    );
    const btn = host!.querySelector('[data-testid="read-aloud-play"]');
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toBe("Read aloud");
    // Graph-native form (functional parity, experiential invention):
    // the control is Opal's presence mark + its literal label - and
    // while the words play, the mark itself carries the speaking
    // pulse. Not a media-player button, not a renamed rail.
    expect(btn!.querySelector(".c1-read-aloud-orb")).not.toBeNull();
    // Outside the bubble, in its own action row - never a rail in it.
    expect(btn!.closest(".c1-bubble")).toBeNull();
    expect(btn!.closest(".c1-message-actions")).not.toBeNull();
    expect(host!.querySelector(".c1-bubble")?.textContent).toBe(OPAL_BODY);
    await click(btn!);
    expect(speakApprovedText).toHaveBeenCalledWith({ text: OPAL_BODY, approved: true }, undefined);
    expect(play).toHaveBeenCalled();
    const stop = host!.querySelector('[data-testid="read-aloud-stop"]');
    expect(stop).not.toBeNull();
    expect(stop!.querySelector(".c1-read-aloud-orb.is-speaking")).not.toBeNull();
    await click(stop!);
    expect(pause).toHaveBeenCalled();
    expect(host!.querySelector('[data-testid="read-aloud-play"]')).not.toBeNull();
  });

  it("provider off: no read-aloud control and no listen rail - honestly absent", async () => {
    fetchVoiceStatus.mockResolvedValue({ tts_configured: false, transcription_configured: false });
    await render(
      <CenterChat
        title="Zoom standup with the team"
        messages={[{ id: "o1", authorKind: "opal", body: OPAL_BODY }]}
        plansById={new Map()}
        onSend={() => undefined}
      />,
    );
    expectNoListenRail();
    expect(host!.querySelector('[data-testid="read-aloud-play"]')).toBeNull();
  });
});

describe("R19 W6 - people thread + plan card", () => {
  it("ThreadShell: SEPARATION - an Opal-authored message renders nothing in a person thread", async () => {
    // W14 separation law wins over this suite's original fixture:
    // messagesForSurface("person-thread", ...) keeps only person +
    // system kinds, so an Opal-authored message handed to a person
    // thread paints NOTHING - no Opal bubble, no body text, and no
    // read-aloud control (read aloud lives with Opal messages on
    // the Opal-conversation surface; see the CenterChat legs above,
    // which already assert it outside the bubble end to end).
    // TTS is configured ON here so the absence is the filter's
    // doing, not an honestly-absent provider.
    fetchVoiceStatus.mockResolvedValue({ tts_configured: true, transcription_configured: false });
    await render(
      <ThreadShell
        name="Maya Chen"
        initials="MC"
        messages={[
          { id: "p1", authorKind: "person", body: "See you Saturday?" },
          { id: "o1", authorKind: "opal", body: OPAL_BODY },
        ]}
        plansById={new Map()}
        composerPlaceholder="Message Maya"
        onSend={() => undefined}
      />,
    );
    expectNoListenRail();
    // The thread itself renders its own kind: the person message.
    expect(host!.textContent).toContain("See you Saturday?");
    // The filter's outcome, asserted explicitly: the Opal message
    // contributes nothing at all to the person thread.
    expect(host!.textContent).not.toContain(OPAL_BODY);
    expect(host!.querySelector(".c1-bubble-opal")).toBeNull();
    expect(host!.querySelector(".c1-message-actions")).toBeNull();
    expect(host!.querySelector('[data-testid="read-aloud-play"]')).toBeNull();
    expect(host!.querySelector('[data-testid="read-aloud-stop"]')).toBeNull();
  });

  it("PlanCard (thread size): summary is read aloud from its own row, no Listen anywhere", async () => {
    fetchVoiceStatus.mockResolvedValue({ tts_configured: true, transcription_configured: false });
    speakApprovedText.mockResolvedValue({ audio_url: "https://example.test/a.mp3", text: "x" });
    vi.stubGlobal("Audio", vi.fn().mockImplementation(() => ({ play: vi.fn().mockResolvedValue(undefined), pause: vi.fn(), onended: null })));
    const plan: PlanProjection = {
      id: "p1",
      title: "Dinner at Juniper and Ivy",
      state: "ready",
      stateLabel: "Ready",
      primaryAction: { kind: "view", label: "View plan" },
      when: { kind: "canonical", label: "Thu, Oct 22 at 7:30 PM" },
      where: { kind: "place", name: "Juniper and Ivy", area: "North Park" },
      attendance: null,
    };
    await render(<PlanCard plan={plan} size="thread" />);
    expectNoListenRail();
    const btn = host!.querySelector('[data-testid="read-aloud-play"]');
    expect(btn).not.toBeNull();
    await click(btn!);
    // The exact displayed summary: title + when + where strings.
    expect(speakApprovedText).toHaveBeenCalledWith(
      { text: "Dinner at Juniper and Ivy. Thu, Oct 22 at 7:30 PM. Juniper and Ivy, North Park", approved: true },
      undefined,
    );
  });
});

describe("R19 W6 - presence copy + source pins", () => {
  it("no PRESENCE_COPY value is a listening frame", () => {
    for (const value of Object.values(PRESENCE_COPY)) {
      expect(value).not.toMatch(/listen/i);
      expect(value).not.toContain("Here with you");
    }
    expect(PRESENCE_COPY.idle).toContain("graphed");
  });

  it("served C1/C2 files that carried the frame cannot carry it again", () => {
    const webRoot = resolve(__dirname, "../../..");
    const read = (rel: string) => readFileSync(resolve(webRoot, rel), "utf8");
    const c1 = read("src/opalUi/c1/C1Surfaces.tsx");
    const planCard = read("src/opalUi/c1/PlanCard.tsx");
    const shellData = read("src/c2/shell/shellData.ts");
    const c2You = read("src/c2/shell/C2You.tsx");
    for (const src of [c1, planCard, shellData, c2You]) {
      expect(src).not.toContain("Here with you");
      expect(src).not.toContain('"Listen"');
      expect(src).not.toContain(">Listen<");
      expect(src).not.toContain("ListenButton");
      expect(src).not.toContain("listen-play");
      expect(src).not.toContain("What Opal hears");
      expect(src).not.toContain("Listening in the room");
    }
    expect(c1).not.toContain('listening: "Listening."');
    // The re-homed control exists under its honest name.
    const readAloud = read("src/opalUi/c1/ReadAloudButton.tsx");
    expect(readAloud).toContain("Read aloud");
    expect(readAloud).not.toContain('aria-label="Listen"');
  });
});
