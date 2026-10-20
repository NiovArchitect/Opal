/**
 * P6 (founder polish wave) - "What Opal remembers" clarity on the
 * group info surface: the per-member entry names what it opens in
 * full (never a bare "Memory"), the viewer's own row carries no
 * entry, and a tap reaches the person-memory destination handler.
 * No @testing-library: createRoot + jsdom (project convention).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GroupInfoDestination } from "./GroupInfoDestination";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("GroupInfoDestination - What Opal remembers clarity (P6)", () => {
  it("per-member entry is labeled with what it opens; own row has none; tap opens it", async () => {
    const onOpenPersonMemory = vi.fn();
    await act(async () => {
      root.render(
        <GroupInfoDestination
          groupName="Weekend Crew"
          members={[
            { id: "you", name: "You", role: "you" },
            { id: "u-maya", name: "Maya Torres", personId: "person-u-maya" },
            { id: "u-jordan", name: "Jordan Ellis", personId: "person-u-jordan" },
          ]}
          onBack={() => {}}
          onOpenPersonMemory={onOpenPersonMemory}
        />,
      );
    });

    const maya = container.querySelector(
      '[data-testid="group-info-memory-u-maya"]',
    ) as HTMLButtonElement;
    expect(maya).toBeTruthy();
    // The visible label is the full destination name, not "Memory".
    expect(maya.textContent).toBe("What Opal remembers");
    expect(maya.getAttribute("aria-label")).toBe(
      "What Opal remembers about Maya Torres",
    );
    expect(
      container.querySelector('[data-testid="group-info-memory-u-jordan"]'),
    ).toBeTruthy();
    // The viewer's own row never offers a per-person memory entry.
    expect(
      container.querySelector('[data-testid="group-info-memory-you"]'),
    ).toBeNull();

    await act(async () => {
      maya.click();
    });
    expect(onOpenPersonMemory).toHaveBeenCalledTimes(1);
    expect(onOpenPersonMemory.mock.calls[0][0]).toMatchObject({
      id: "u-maya",
      name: "Maya Torres",
    });
  });

  it("no memory entries render when the host wires no memory handler", async () => {
    await act(async () => {
      root.render(
        <GroupInfoDestination
          groupName="Weekend Crew"
          members={[{ id: "u-maya", name: "Maya Torres" }]}
          onBack={() => {}}
        />,
      );
    });
    expect(
      container.querySelector('[data-testid="group-info-memory-u-maya"]'),
    ).toBeNull();
  });
});
