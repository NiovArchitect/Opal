/**
 * @vitest-environment jsdom
 *
 * Repair #21 W-18 - hole-inventory build pins.
 * H-NEW-2: a PlanCardC2 primary-action label with no handler behind
 * it must not render a button (a dead nested asset whose tap was
 * swallowed and blocked the card's own open). With a handler, the
 * button renders and fires it.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlanCardC2 } from "./PlanCardC2";

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
  await act(async () => {
    root?.unmount();
  });
  host?.remove();
  host = null;
  root = null;
});

const base = {
  stateFamily: "action",
  stateLabel: "Action needed",
  title: "Dinner at Juniper and Ivy",
  whenLine: "Thu, Oct 22 at 7:30 PM",
  primaryActionLabel: "Review and respond",
};

describe("R21 W-18 holes", () => {
  it("H-NEW-2: label without a handler renders no primary button", async () => {
    const el = await render(<PlanCardC2 input={base} onOpen={() => {}} />);
    expect(el.querySelector('[data-testid="c2-plan-primary"]')).toBeNull();
  });

  it("H-NEW-2: label with a handler renders a button that fires it", async () => {
    const onPrimaryAction = vi.fn();
    const el = await render(
      <PlanCardC2 input={base} onOpen={() => {}} onPrimaryAction={onPrimaryAction} />,
    );
    const btn = el.querySelector<HTMLButtonElement>('[data-testid="c2-plan-primary"]');
    expect(btn).not.toBeNull();
    await act(async () => {
      btn!.click();
    });
    expect(onPrimaryAction).toHaveBeenCalledTimes(1);
  });

  it("H-NEW-2: no label renders no primary button even with a handler", async () => {
    const el = await render(
      <PlanCardC2
        input={{ ...base, primaryActionLabel: null }}
        onOpen={() => {}}
        onPrimaryAction={() => {}}
      />,
    );
    expect(el.querySelector('[data-testid="c2-plan-primary"]')).toBeNull();
  });
});
