/**
 * Phase NE-1 — Invite friends (You hub).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InviteFriendsSection } from "./YouSettingsDestination";
import type { ProductSession } from "../api/productClient";

const listProductInvites = vi.fn(async () => ({
  invites: [],
  pending_count: 0,
  rewards: { successful_invites: 0 },
}));

const createProductInvite = vi.fn(async () => ({
  code: "MAYA-X7K2",
  share_url: "https://opal.app/join?invite=MAYA-X7K2",
  invite: {
    id: "i1",
    code: "MAYA-X7K2",
    status: "sent",
    share_url: "https://opal.app/join?invite=MAYA-X7K2",
    invitee_phone: null,
    invitee_email: null,
  },
  delivery: { sms_queued: false },
}));

vi.mock("../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../api/productClient")>(
    "../api/productClient",
  );
  return {
    ...actual,
    listProductInvites: (...args: unknown[]) => listProductInvites(...args),
    createProductInvite: (...args: unknown[]) => createProductInvite(...args),
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

const session: ProductSession = {
  user_id: "u-a",
  display_name: "Maya Chen",
  access_token: "tok-a",
};

beforeEach(() => {
  listProductInvites.mockReset().mockResolvedValue({
    invites: [],
    pending_count: 0,
    rewards: { successful_invites: 0 },
  });
  createProductInvite.mockReset().mockResolvedValue({
    code: "MAYA-X7K2",
    share_url: "https://opal.app/join?invite=MAYA-X7K2",
    invite: {
      id: "i1",
      code: "MAYA-X7K2",
      status: "sent",
      share_url: "https://opal.app/join?invite=MAYA-X7K2",
      invitee_phone: null,
      invitee_email: null,
    },
    delivery: { sms_queued: false },
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("InviteFriendsSection", () => {
  it("shows empty copy and create button", async () => {
    await act(async () => {
      root.render(<InviteFriendsSection session={session} />);
    });
    await flush();

    expect(container.querySelector('[data-testid="invite-friends"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="invite-empty"]')?.textContent).toMatch(
      /better with friends/,
    );
    expect(container.querySelector('[data-testid="invite-create-button"]')).toBeTruthy();
  });

  it("creates invite and shows code + share", async () => {
    await act(async () => {
      root.render(<InviteFriendsSection session={session} />);
    });
    await flush();

    const btn = container.querySelector(
      '[data-testid="invite-create-button"]',
    ) as HTMLButtonElement;
    await act(async () => {
      btn.click();
    });
    await flush();

    expect(createProductInvite).toHaveBeenCalledWith({}, "tok-a");
    expect(container.querySelector('[data-testid="invite-code"]')?.textContent).toMatch(
      /MAYA-X7K2/,
    );
    expect(container.querySelector('[data-testid="invite-share-url"]')?.textContent).toMatch(
      /invite=MAYA-X7K2/,
    );
    expect(container.querySelector('[data-testid="invite-share-button"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="invite-copy-button"]')).toBeTruthy();
  });

  it("shows honest SMS note when phone provided and sms not queued", async () => {
    createProductInvite.mockResolvedValue({
      code: "MAYA-X7K2",
      share_url: "https://opal.app/join?invite=MAYA-X7K2",
      invite: {
        id: "i1",
        code: "MAYA-X7K2",
        status: "sent",
        share_url: "https://opal.app/join?invite=MAYA-X7K2",
        invitee_phone: "+12025550199",
        invitee_email: null,
      },
      delivery: {
        sms_queued: false,
        sms_honest: "SMS invites need Twilio setup — share the link instead.",
      },
    });

    await act(async () => {
      root.render(<InviteFriendsSection session={session} />);
    });
    await flush();

    const input = container.querySelector(
      '[data-testid="invite-phone-input"]',
    ) as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "+12025550199");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await flush();

    const btn = container.querySelector(
      '[data-testid="invite-create-button"]',
    ) as HTMLButtonElement;
    await act(async () => {
      btn.click();
    });
    await flush();

    expect(createProductInvite).toHaveBeenCalledWith(
      { invitee_phone: "+12025550199" },
      "tok-a",
    );
    expect(container.querySelector('[data-testid="invite-delivery-note"]')?.textContent).toMatch(
      /SMS invites need|share the link/i,
    );
  });

  it("lists invite statuses", async () => {
    listProductInvites.mockResolvedValue({
      invites: [
        {
          id: "i2",
          code: "MAYA-AAAA",
          status: "joined",
          share_url: "https://opal.app/join?invite=MAYA-AAAA",
          invitee_phone: "+12025550111",
        },
        {
          id: "i3",
          code: "MAYA-BBBB",
          status: "opened",
          share_url: "https://opal.app/join?invite=MAYA-BBBB",
          invitee_email: "sam@example.com",
        },
      ],
      pending_count: 1,
      rewards: { successful_invites: 1 },
    });

    await act(async () => {
      root.render(<InviteFriendsSection session={session} />);
    });
    await flush();

    expect(container.querySelector('[data-testid="invite-status-list"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="invite-status-i2"]')?.textContent).toBe(
      "Joined",
    );
    expect(container.querySelector('[data-testid="invite-status-i3"]')?.textContent).toBe(
      "Opened",
    );
  });
});
