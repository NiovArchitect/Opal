/**
 * Phase 1E: act-on-behalf opt-in step.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ActOnBehalfOptInStep,
  grantActOnBehalfOptIns,
} from "./ActOnBehalfOptInStep";
import type { ProductSession } from "../api/productClient";
import { FIRST_RUN_ROUTE_ORDER } from "./FirstRunExperience";
import { AUTH_STEPS } from "./firstRunCopy";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

async function flush() {
  await act(async () => {
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
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("route order", () => {
  it("includes fr10 after fr09 before app exit", () => {
    expect(FIRST_RUN_ROUTE_ORDER).toContain("fr10");
    expect(FIRST_RUN_ROUTE_ORDER.indexOf("fr10")).toBeGreaterThan(
      FIRST_RUN_ROUTE_ORDER.indexOf("fr09"),
    );
    expect(AUTH_STEPS).toContain("fr10");
  });
});

describe("ActOnBehalfOptInStep", () => {
  it("renders two toggles default off; no messaging_business", async () => {
    const onContinue = vi.fn();
    const onSkip = vi.fn();
    await act(async () => {
      root.render(
        <ActOnBehalfOptInStep session={session} onContinue={onContinue} onSkip={onSkip} />,
      );
    });
    await flush();

    expect(container.querySelector('[data-testid="fr10-act-on-behalf"]')).toBeTruthy();
    const calls = container.querySelector(
      '[data-testid="fr10-toggle-calls_outbound"]',
    ) as HTMLButtonElement;
    const bookings = container.querySelector(
      '[data-testid="fr10-toggle-bookings_reserve"]',
    ) as HTMLButtonElement;
    expect(calls.getAttribute("aria-checked")).toBe("false");
    expect(bookings.getAttribute("aria-checked")).toBe("false");
    expect(container.querySelector('[data-testid="fr10-toggle-messaging_business"]')).toBeNull();
    expect(container.textContent).not.toMatch(/Message businesses/i);
  });

  it("Skip grants nothing and advances", async () => {
    const onContinue = vi.fn();
    const onSkip = vi.fn();
    const grantFn = vi.fn();
    await act(async () => {
      root.render(
        <ActOnBehalfOptInStep
          session={session}
          onContinue={onContinue}
          onSkip={onSkip}
          grantFn={grantFn}
        />,
      );
    });
    await flush();

    await act(async () => {
      (container.querySelector('[data-testid="fr10-skip"]') as HTMLButtonElement).click();
    });
    await flush();

    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(grantFn).not.toHaveBeenCalled();
    expect(onContinue).not.toHaveBeenCalled();
  });

  it("Continue grants selected capabilities with expires_at", async () => {
    const onContinue = vi.fn();
    const onSkip = vi.fn();
    const grantFn = vi.fn(async (attrs: { capability: string; expires_at: string }) => ({
      consent: {
        id: `c-${attrs.capability}`,
        capability: attrs.capability,
        status: "granted",
        expires_at: attrs.expires_at,
      },
    }));

    await act(async () => {
      root.render(
        <ActOnBehalfOptInStep
          session={session}
          onContinue={onContinue}
          onSkip={onSkip}
          grantFn={grantFn as never}
        />,
      );
    });
    await flush();

    await act(async () => {
      (container.querySelector(
        '[data-testid="fr10-toggle-calls_outbound"]',
      ) as HTMLButtonElement).click();
    });
    await flush();

    await act(async () => {
      (container.querySelector('[data-testid="fr10-continue"]') as HTMLButtonElement).click();
    });
    await flush();

    expect(grantFn).toHaveBeenCalledTimes(1);
    const args = grantFn.mock.calls[0][0] as { capability: string; expires_at: string };
    expect(args.capability).toBe("calls_outbound");
    expect(typeof args.expires_at).toBe("string");
    expect(Date.parse(args.expires_at)).toBeGreaterThan(Date.now());
    expect(onContinue).toHaveBeenCalledWith(["calls_outbound"]);
    expect(onSkip).not.toHaveBeenCalled();
  });

  it("Continue with both toggles grants both", async () => {
    const onContinue = vi.fn();
    const grantFn = vi.fn(async (attrs: { capability: string; expires_at: string }) => ({
      consent: { id: attrs.capability, capability: attrs.capability, status: "granted" },
    }));

    await act(async () => {
      root.render(
        <ActOnBehalfOptInStep
          session={session}
          onContinue={onContinue}
          onSkip={() => undefined}
          grantFn={grantFn as never}
        />,
      );
    });
    await flush();

    await act(async () => {
      (container.querySelector(
        '[data-testid="fr10-toggle-calls_outbound"]',
      ) as HTMLButtonElement).click();
      (container.querySelector(
        '[data-testid="fr10-toggle-bookings_reserve"]',
      ) as HTMLButtonElement).click();
    });
    await flush();

    await act(async () => {
      (container.querySelector('[data-testid="fr10-continue"]') as HTMLButtonElement).click();
    });
    await flush();

    expect(grantFn).toHaveBeenCalledTimes(2);
    const caps = grantFn.mock.calls.map((c) => (c[0] as { capability: string }).capability);
    expect(caps).toEqual(["calls_outbound", "bookings_reserve"]);
    expect(onContinue).toHaveBeenCalledWith(["calls_outbound", "bookings_reserve"]);
  });

  it("grant failure still continues (does not block)", async () => {
    const onContinue = vi.fn();
    const grantFn = vi.fn(async () => {
      throw new Error("network");
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await act(async () => {
      root.render(
        <ActOnBehalfOptInStep
          session={session}
          onContinue={onContinue}
          onSkip={() => undefined}
          grantFn={grantFn as never}
        />,
      );
    });
    await flush();

    await act(async () => {
      (container.querySelector(
        '[data-testid="fr10-toggle-bookings_reserve"]',
      ) as HTMLButtonElement).click();
    });
    await flush();

    await act(async () => {
      (container.querySelector('[data-testid="fr10-continue"]') as HTMLButtonElement).click();
    });
    await flush();

    expect(onContinue).toHaveBeenCalledWith([]);
    warn.mockRestore();
  });
});

describe("grantActOnBehalfOptIns", () => {
  it("returns empty when nothing selected", async () => {
    const grantFn = vi.fn();
    const granted = await grantActOnBehalfOptIns(
      { calls_outbound: false, bookings_reserve: false },
      session,
      grantFn as never,
    );
    expect(granted).toEqual([]);
    expect(grantFn).not.toHaveBeenCalled();
  });
});
