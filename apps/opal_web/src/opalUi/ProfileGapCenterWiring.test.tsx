/**
 * Repair #16 W3 — wiring proof: the progressive ask inside the LIVE
 * birthday-planning flow (Opal Center chat).
 *
 * Center is where birthdays get planned: the backend pipeline marks
 * birthday turns in message metadata (`context_snapshot.intent_scope
 * = "birthday"`, honoree in `who`), and the Celebrations surface's
 * "Plan this" funnels into Center too. When such a turn names a person
 * who resolves uniquely to one of the owner's relationship contacts,
 * the chat assesses that person's birthday gap and renders the ask
 * in-flow; the composer stays fully usable throughout (non-blocking).
 * Known / proceed_without / unresolvable person → no card, ever.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpalCenterChat } from "./OpalCenterChat";
import type { OpalChatConversation, OpalChatMessage } from "../api/productClient";
import { resetVoiceAdapters, setVoiceAdapters } from "./opalCenterVoice";

const getOpalConversation = vi.fn();
const postOpalMessage = vi.fn();
const listRelationships = vi.fn();
const assessProfileGap = vi.fn();
const answerProfileGap = vi.fn();
const skipProfileGap = vi.fn();

vi.mock("../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../api/productClient")>(
    "../api/productClient",
  );
  return {
    ...actual,
    getOpalConversation: (...args: unknown[]) => getOpalConversation(...args),
    postOpalMessage: (...args: unknown[]) => postOpalMessage(...(args as [string])),
    listRelationships: (...args: unknown[]) => listRelationships(...args),
    assessProfileGap: (...args: unknown[]) => assessProfileGap(...args),
    answerProfileGap: (...args: unknown[]) => answerProfileGap(...args),
    skipProfileGap: (...args: unknown[]) => skipProfileGap(...args),
  };
});

vi.mock("./opalCenterVoice", async () => {
  const actual = await vi.importActual<typeof import("./opalCenterVoice")>(
    "./opalCenterVoice",
  );
  return {
    ...actual,
    speakText: vi.fn(async () => undefined),
    listenOnce: vi.fn(),
    probeMicPermission: vi.fn(async () => "prompt" as const),
    stopSpeaking: vi.fn(),
    stopListening: vi.fn(),
    isSttAvailable: () => true,
    isOnline: () => actual.isOnline(),
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const MAYA_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

const ASK_RESULT = {
  profile_gap: {
    status: "ask",
    value: null,
    plan_proceeds: true,
    ask: {
      fact_key: "birthday",
      prompt:
        "Quick one while we plan — when's Maya's birthday? I'll remember it so next year just works. Skip is totally fine.",
      flow: "birthday_plan",
      blocking: false,
      dismissible: true,
      skip_label: "Skip",
      asked_once: true,
    },
  },
};

function msg(partial: Partial<OpalChatMessage> & Pick<OpalChatMessage, "id" | "role" | "body">): OpalChatMessage {
  return {
    conversation_id: "conv-1",
    inserted_at: new Date().toISOString(),
    metadata: null,
    ...partial,
  };
}

function birthdayConv(): OpalChatConversation {
  return {
    id: "conv-1",
    user_id: "u-a",
    title: null,
    messages: [
      msg({ id: "m1", role: "user", body: "Plan a birthday for Maya" }),
      msg({
        id: "m2",
        role: "opal",
        body: "Got it — I'll plan the birthday with Maya here with you.",
        metadata: {
          context_snapshot: {
            intent_scope: "birthday",
            who: "Maya",
            primary_person: "Maya",
          },
        },
      }),
    ],
  };
}

let container: HTMLDivElement;
let root: Root;

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

const q = (testid: string) => container.querySelector(`[data-testid="${testid}"]`);

beforeEach(() => {
  localStorage.clear();
  resetVoiceAdapters();
  setVoiceAdapters({ isOnline: () => true });
  getOpalConversation.mockReset().mockResolvedValue({ conversation: birthdayConv() });
  postOpalMessage.mockReset();
  listRelationships.mockReset().mockResolvedValue({
    relationships: [],
    contacts: [{ contact_user_id: MAYA_ID, display_name: "Maya Chen", type: "close_friend" }],
    allowed_types: [],
  });
  assessProfileGap.mockReset().mockResolvedValue(ASK_RESULT);
  answerProfileGap.mockReset().mockResolvedValue({ answered: true, fact_key: "birthday", value: "2014-03-05" });
  skipProfileGap.mockReset().mockResolvedValue({ skipped: true, fact_key: "birthday", status: "proceed_without" });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  resetVoiceAdapters();
  localStorage.clear();
});

describe("OpalCenterChat birthday ask wiring", () => {
  it("birthday-plan turn for a known contact renders the ask in-flow; composer stays usable", async () => {
    await act(async () => {
      root.render(<OpalCenterChat onBack={() => {}} bearer="tok" userId="u-a" />);
    });
    await flush();

    // The honoree resolved by first name to the unique contact, and the
    // gap was assessed for THAT person id.
    expect(listRelationships).toHaveBeenCalled();
    expect(assessProfileGap).toHaveBeenCalledWith(MAYA_ID, "Maya Chen", "tok");

    const card = q("profile-gap-ask");
    expect(card).not.toBeNull();
    expect(q("profile-gap-ask-prompt")?.textContent).toContain("Maya's birthday");

    // Non-blocking: the chat composer is present and enabled while the
    // ask is on screen — the plan flow never waits on the ask.
    const input = q("opal-center-chat-input") as HTMLTextAreaElement;
    expect(input).not.toBeNull();
    expect(input.disabled).toBe(false);
  });

  it("known birthday → no card in the chat", async () => {
    assessProfileGap.mockReset().mockResolvedValue({
      profile_gap: { status: "known", value: "2014-03-05", ask: null, plan_proceeds: true },
    });
    await act(async () => {
      root.render(<OpalCenterChat onBack={() => {}} bearer="tok" userId="u-a" />);
    });
    await flush();

    expect(assessProfileGap).toHaveBeenCalledTimes(1);
    expect(q("profile-gap-ask")).toBeNull();
  });

  it("unresolvable honoree → fail closed: no assess call, no card", async () => {
    listRelationships.mockReset().mockResolvedValue({
      relationships: [],
      contacts: [{ contact_user_id: "other-id", display_name: "Someone Else", type: "friend" }],
      allowed_types: [],
    });
    await act(async () => {
      root.render(<OpalCenterChat onBack={() => {}} bearer="tok" userId="u-a" />);
    });
    await flush();

    expect(assessProfileGap).not.toHaveBeenCalled();
    expect(q("profile-gap-ask")).toBeNull();
  });

  it("non-birthday conversation → no assess, no card", async () => {
    getOpalConversation.mockReset().mockResolvedValue({
      conversation: {
        id: "conv-1",
        user_id: "u-a",
        title: null,
        messages: [msg({ id: "m1", role: "opal", body: "Hey. What's on your mind?" })],
      },
    });
    await act(async () => {
      root.render(<OpalCenterChat onBack={() => {}} bearer="tok" userId="u-a" />);
    });
    await flush();

    expect(listRelationships).not.toHaveBeenCalled();
    expect(assessProfileGap).not.toHaveBeenCalled();
    expect(q("profile-gap-ask")).toBeNull();
  });
});
