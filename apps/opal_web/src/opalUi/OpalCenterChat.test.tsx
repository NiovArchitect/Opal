/**
 * Phase OC-1 — Opal Center conversational shell FE tests.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpalCenterChat } from "./OpalCenterChat";
import type { OpalChatConversation, OpalChatMessage } from "../api/productClient";

const placeholder =
  "I'm listening. Tell me what's on your mind — I can help you plan, remember, or figure things out together.";

const getOpalConversation = vi.fn();
const postOpalMessage = vi.fn();

vi.mock("../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../api/productClient")>(
    "../api/productClient",
  );
  return {
    ...actual,
    getOpalConversation: (...args: unknown[]) => getOpalConversation(...args),
    postOpalMessage: (...args: unknown[]) => postOpalMessage(...(args as [string])),
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function setTextarea(el: HTMLTextAreaElement, value: string) {
  const proto = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  proto?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function emptyConv(): OpalChatConversation {
  return {
    id: "conv-1",
    user_id: "u-a",
    title: null,
    messages: [],
  };
}

function msg(partial: Partial<OpalChatMessage> & Pick<OpalChatMessage, "id" | "role" | "body">): OpalChatMessage {
  return {
    conversation_id: "conv-1",
    inserted_at: new Date().toISOString(),
    metadata: null,
    ...partial,
  };
}

beforeEach(() => {
  getOpalConversation.mockReset().mockResolvedValue({ conversation: emptyConv() });
  postOpalMessage.mockReset().mockResolvedValue({
    messages: [
      msg({ id: "m1", role: "user", body: "hello" }),
      msg({ id: "m2", role: "opal", body: placeholder }),
    ],
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("OpalCenterChat", () => {
  it("renders empty state + suggestion chips", async () => {
    await act(async () => {
      root.render(<OpalCenterChat onBack={() => undefined} />);
    });
    await flush();

    expect(container.querySelector('[data-testid="opal-center-chat"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="opal-center-chat-empty"]')?.textContent).toContain(
      "Say hello to Opal",
    );
    expect(container.textContent).toContain("Plan something");
    expect(container.textContent).toContain("Remember something");
    expect(container.textContent).toContain("What's coming up?");
    const input = container.querySelector(
      '[data-testid="opal-center-chat-input"]',
    ) as HTMLTextAreaElement;
    expect(input?.placeholder).toBe("Talk to Opal…");
  });

  it("sends message and shows user + Opal bubbles", async () => {
    await act(async () => {
      root.render(<OpalCenterChat onBack={() => undefined} />);
    });
    await flush();

    const input = container.querySelector(
      '[data-testid="opal-center-chat-input"]',
    ) as HTMLTextAreaElement;
    await act(async () => {
      setTextarea(input, "hello");
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="opal-center-chat-send"]')?.click();
    });
    await flush();
    await flush();

    expect(postOpalMessage).toHaveBeenCalledWith("hello", undefined);
    const user = container.querySelectorAll('[data-testid="opal-center-chat-user-msg"]');
    const opal = container.querySelectorAll('[data-testid="opal-center-chat-opal-msg"]');
    expect(user.length).toBeGreaterThanOrEqual(1);
    expect(opal.length).toBeGreaterThanOrEqual(1);
    expect(container.textContent).toContain(placeholder);
  });

  it("chip tap sends that text", async () => {
    await act(async () => {
      root.render(<OpalCenterChat onBack={() => undefined} />);
    });
    await flush();

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[data-testid="opal-center-chat-chip-Plan something"]')
        ?.click();
    });
    await flush();
    await flush();

    expect(postOpalMessage).toHaveBeenCalledWith("Plan something", undefined);
  });

  it("shows load error with retry", async () => {
    getOpalConversation.mockRejectedValueOnce(new Error("fail"));
    await act(async () => {
      root.render(<OpalCenterChat onBack={() => undefined} />);
    });
    await flush();

    expect(container.querySelector('[data-testid="opal-center-chat-load-error"]')?.textContent).toContain(
      "Couldn't load conversation",
    );
    getOpalConversation.mockResolvedValueOnce({ conversation: emptyConv() });
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="opal-center-chat-retry-load"]')?.click();
    });
    await flush();
    expect(container.querySelector('[data-testid="opal-center-chat-empty"]')).toBeTruthy();
  });

  it("shows send error and keeps typed text on failure", async () => {
    postOpalMessage.mockRejectedValueOnce(new Error("fail"));
    await act(async () => {
      root.render(<OpalCenterChat onBack={() => undefined} />);
    });
    await flush();

    const input = container.querySelector(
      '[data-testid="opal-center-chat-input"]',
    ) as HTMLTextAreaElement;
    await act(async () => {
      setTextarea(input, " salvage me ");
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="opal-center-chat-send"]')?.click();
    });
    await flush();
    await flush();

    expect(container.querySelector('[data-testid="opal-center-chat-send-error"]')?.textContent).toContain(
      "Couldn't send — tap to retry",
    );
    const after = container.querySelector(
      '[data-testid="opal-center-chat-input"]',
    ) as HTMLTextAreaElement;
    expect(after.value).toMatch(/salvage me/);
  });

  it("renders history messages on load", async () => {
    getOpalConversation.mockResolvedValueOnce({
      conversation: {
        id: "conv-1",
        user_id: "u-a",
        title: "hello",
        messages: [
          msg({ id: "h1", role: "user", body: "hello" }),
          msg({ id: "h2", role: "opal", body: placeholder }),
        ],
      },
    });
    await act(async () => {
      root.render(<OpalCenterChat onBack={() => undefined} />);
    });
    await flush();

    expect(container.querySelector('[data-testid="opal-center-chat-empty"]')).toBeNull();
    expect(container.querySelectorAll('[data-testid="opal-center-chat-user-msg"]').length).toBe(1);
    expect(container.querySelectorAll('[data-testid="opal-center-chat-opal-msg"]').length).toBe(1);
  });
});
