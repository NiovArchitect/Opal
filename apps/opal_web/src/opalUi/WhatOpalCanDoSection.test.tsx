/**
 * Phase 1D — What Opal can do for you (You hub consent section).
 * No @testing-library: createRoot + jsdom (project convention).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  WhatOpalCanDoSection,
  activeConsentFor,
  defaultConsentExpiresAt,
  formatConsentExpiry,
} from "./YouSettingsDestination";
import type { ConsentProof, ProductSession } from "../api/productClient";

const listConsents = vi.fn(async () => ({ consents: [] as ConsentProof[] }));
const grantConsent = vi.fn(
  async (attrs: { capability: string; expires_at: string }) => ({
    consent: {
      id: `proof-${attrs.capability}`,
      capability: attrs.capability,
      status: "granted",
      granted_at: new Date().toISOString(),
      expires_at: attrs.expires_at,
      revoked_at: null,
    } satisfies ConsentProof,
  }),
);
const revokeConsent = vi.fn(async (id: string) => ({
  consent: {
    id,
    capability: "calls_outbound",
    status: "revoked",
    granted_at: new Date().toISOString(),
    expires_at: defaultConsentExpiresAt(),
    revoked_at: new Date().toISOString(),
  } satisfies ConsentProof,
}));

vi.mock("../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../api/productClient")>(
    "../api/productClient",
  );
  return {
    ...actual,
    listConsents: (...args: unknown[]) => listConsents(...args),
    grantConsent: (...args: unknown[]) => grantConsent(...(args as [never])),
    revokeConsent: (...args: unknown[]) => revokeConsent(...(args as [never])),
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
  display_name: "Alex",
  access_token: "tok-a",
};

beforeEach(() => {
  listConsents.mockReset().mockResolvedValue({ consents: [] });
  grantConsent.mockReset().mockImplementation(async (attrs: { capability: string; expires_at: string }) => ({
    consent: {
      id: `proof-${attrs.capability}`,
      capability: attrs.capability,
      status: "granted",
      granted_at: new Date().toISOString(),
      expires_at: attrs.expires_at,
      revoked_at: null,
    },
  }));
  revokeConsent.mockReset().mockImplementation(async (id: string) => ({
    consent: {
      id,
      capability: "calls_outbound",
      status: "revoked",
      granted_at: new Date().toISOString(),
      expires_at: defaultConsentExpiresAt(),
      revoked_at: new Date().toISOString(),
    },
  }));
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("helpers", () => {
  it("activeConsentFor picks granted non-expired proof", () => {
    const expires = defaultConsentExpiresAt();
    const proofs: ConsentProof[] = [
      {
        id: "old",
        capability: "calls_outbound",
        status: "revoked",
        revoked_at: new Date().toISOString(),
        expires_at: expires,
      },
      {
        id: "live",
        capability: "calls_outbound",
        status: "granted",
        granted_at: new Date().toISOString(),
        expires_at: expires,
      },
    ];
    expect(activeConsentFor(proofs, "calls_outbound")?.id).toBe("live");
    expect(activeConsentFor(proofs, "bookings_reserve")).toBeNull();
  });

  it("formatConsentExpiry returns a readable date", () => {
    const label = formatConsentExpiry("2027-03-15T12:00:00.000Z");
    expect(label.length).toBeGreaterThan(3);
  });
});

describe("WhatOpalCanDoSection", () => {
  it("renders three capability rows; messaging_business blocked + disabled", async () => {
    await act(async () => {
      root.render(<WhatOpalCanDoSection session={session} />);
    });
    await flush();

    expect(container.querySelector('[data-testid="what-opal-can-do"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="consent-row-calls_outbound"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="consent-row-bookings_reserve"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="consent-row-messaging_business"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="consent-blocked"]')?.textContent).toMatch(
      /Twilio|business channel/i,
    );

    const msgToggle = container.querySelector(
      '[data-testid="consent-toggle-messaging_business"]',
    ) as HTMLButtonElement;
    expect(msgToggle).toBeTruthy();
    expect(msgToggle.disabled).toBe(true);
    expect(msgToggle.getAttribute("aria-checked")).toBe("false");
  });

  it("toggle grants and revokes calls_outbound", async () => {
    await act(async () => {
      root.render(<WhatOpalCanDoSection session={session} />);
    });
    await flush();

    const toggle = container.querySelector(
      '[data-testid="consent-toggle-calls_outbound"]',
    ) as HTMLButtonElement;
    expect(toggle.getAttribute("aria-checked")).toBe("false");

    await act(async () => {
      toggle.click();
    });
    await flush();

    expect(grantConsent).toHaveBeenCalledTimes(1);
    const grantArgs = grantConsent.mock.calls[0][0] as {
      capability: string;
      expires_at: string;
    };
    expect(grantArgs.capability).toBe("calls_outbound");
    expect(typeof grantArgs.expires_at).toBe("string");
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(
      container.querySelector('[data-testid="consent-expiry-calls_outbound"]')?.textContent,
    ).toMatch(/On · expires/);

    await act(async () => {
      toggle.click();
    });
    await flush();

    expect(revokeConsent).toHaveBeenCalledWith("proof-calls_outbound", "tok-a");
    expect(toggle.getAttribute("aria-checked")).toBe("false");
  });

  it("Blocked capability toggle does not call grant", async () => {
    await act(async () => {
      root.render(<WhatOpalCanDoSection session={session} />);
    });
    await flush();

    const msgToggle = container.querySelector(
      '[data-testid="consent-toggle-messaging_business"]',
    ) as HTMLButtonElement;
    await act(async () => {
      msgToggle.click();
    });
    await flush();
    expect(grantConsent).not.toHaveBeenCalled();
  });

  it("hydrates granted state from listConsents", async () => {
    listConsents.mockResolvedValue({
      consents: [
        {
          id: "p1",
          capability: "bookings_reserve",
          status: "granted",
          granted_at: new Date().toISOString(),
          expires_at: defaultConsentExpiresAt(),
          revoked_at: null,
        },
      ],
    });

    await act(async () => {
      root.render(<WhatOpalCanDoSection session={session} />);
    });
    await flush();

    const toggle = container.querySelector(
      '[data-testid="consent-toggle-bookings_reserve"]',
    ) as HTMLButtonElement;
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(
      container.querySelector('[data-testid="consent-expiry-bookings_reserve"]')?.textContent,
    ).toMatch(/On · expires/);
  });
});
