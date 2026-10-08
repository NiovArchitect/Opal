import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MediationCard } from "./MediationCard";
import { MEDIATION_MOCK_ITEMS } from "../../api/intelligenceClient";

const postOpalMessage = vi.fn(async () => ({ messages: [] }));
const sendMediationDraft = vi.fn(async () => ({ ok: true, _mock: true }));
const dismissMediation = vi.fn(async () => ({ ok: true, _mock: true }));
const createPlanFromMediation = vi.fn(async () => ({ ok: true, _mock: true }));

vi.mock("../../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../../api/productClient")>(
    "../../api/productClient",
  );
  return {
    ...actual,
    postOpalMessage: (...args: unknown[]) =>
      postOpalMessage(...(args as [never])),
  };
});

vi.mock("../../api/intelligenceClient", async () => {
  const actual = await vi.importActual<
    typeof import("../../api/intelligenceClient")
  >("../../api/intelligenceClient");
  return {
    ...actual,
    sendMediationDraft: (...args: unknown[]) =>
      sendMediationDraft(...(args as [never])),
    dismissMediation: (...args: unknown[]) =>
      dismissMediation(...(args as [never])),
    createPlanFromMediation: (...args: unknown[]) =>
      createPlanFromMediation(...(args as [never])),
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  postOpalMessage.mockClear();
  sendMediationDraft.mockClear();
  dismissMediation.mockClear();
  createPlanFromMediation.mockClear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("MediationCard", () => {
  it("renders positions, silent participants, verbatim draft", async () => {
    const item = MEDIATION_MOCK_ITEMS[0];
    await act(async () => {
      root.render(<MediationCard item={item} bearer="tok" />);
    });
    expect(
      container.querySelector(`[data-testid="mediation-positions-${item.id}"]`),
    ).toBeTruthy();
    expect(
      container.querySelector(`[data-testid="mediation-silent-${item.id}"]`)
        ?.textContent,
    ).toMatch(/Jordan/);
    expect(
      container.querySelector(`[data-testid="mediation-draft-${item.id}"]`)
        ?.textContent,
    ).toBe(item.mediation_draft);
  });

  it("Send handoff posts to Center — does not claim auto-post", async () => {
    const item = MEDIATION_MOCK_ITEMS[0];
    await act(async () => {
      root.render(<MediationCard item={item} bearer="tok" />);
    });
    await act(async () => {
      (
        container.querySelector(
          `[data-testid="mediation-send-${item.id}"]`,
        ) as HTMLButtonElement
      ).click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(sendMediationDraft).toHaveBeenCalled();
    expect(postOpalMessage).toHaveBeenCalled();
    const body = postOpalMessage.mock.calls[0][0] as string;
    expect(body).toMatch(/Send to group/);
    expect(
      container.querySelector(`[data-testid="mediation-note-${item.id}"]`)
        ?.textContent,
    ).toMatch(/you send/i);
  });

  it("consensus lock-in Create plan uses planning path", async () => {
    const item = MEDIATION_MOCK_ITEMS[1];
    await act(async () => {
      root.render(<MediationCard item={item} bearer="tok" />);
    });
    await act(async () => {
      (
        container.querySelector(
          `[data-testid="mediation-create-plan-${item.id}"]`,
        ) as HTMLButtonElement
      ).click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(createPlanFromMediation).toHaveBeenCalled();
    expect(postOpalMessage).toHaveBeenCalled();
    const body = postOpalMessage.mock.calls[0][0] as string;
    expect(body).toMatch(/Create plan/);
  });
});
