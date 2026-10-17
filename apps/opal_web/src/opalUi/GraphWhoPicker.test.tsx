/**
 * GraphWhoPicker — honest empty state (Repair #14, H3).
 *
 * A user with no connected people must see an empty state, never a
 * fabricated list of someone else's friends.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GraphWhoPicker } from "./GraphWhoPicker";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

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

function renderPicker(
  people: Array<{ id: string; name: string }>,
  opts: { showSolo?: boolean } = {},
) {
  const showSolo = opts.showSolo !== false;
  act(() => {
    root.render(
      <GraphWhoPicker
        people={people}
        selectedIds={[]}
        together={false}
        onToggle={vi.fn()}
        onTogetherChange={vi.fn()}
        onContinue={vi.fn()}
        showSolo={showSolo}
        onSolo={showSolo ? vi.fn() : undefined}
      />,
    );
  });
}

describe("GraphWhoPicker empty state", () => {
  it("renders an honest empty state with no fabricated people for a new user", () => {
    renderPicker([]);

    const empty = container.querySelector('[data-testid="gwho-empty"]');
    expect(empty).not.toBeNull();
    expect(empty?.textContent).toMatch(/No people here yet/);

    // No person cells, and none of the old hardcoded names anywhere.
    expect(container.querySelectorAll('[data-testid^="gwho-person-"]')).toHaveLength(0);
    const text = container.textContent || "";
    for (const name of ["Maya", "Jordan", "Chanelle", "Sabrina", "Nina", "Taylor", "Riley"]) {
      expect(text).not.toContain(name);
    }

    // Solo path stays available when offered.
    expect(container.querySelector('[data-testid="gwho-solo"]')).not.toBeNull();
  });

  it("disables Continue in the empty state when no solo path is offered", () => {
    renderPicker([], { showSolo: false });

    expect(container.querySelector('[data-testid="gwho-empty"]')).not.toBeNull();
    const cont = container.querySelector<HTMLButtonElement>('[data-testid="gwho-continue"]');
    expect(cont?.disabled).toBe(true);
  });

  it("renders real people and no empty state when people exist", () => {
    renderPicker([{ id: "u-ava", name: "Ava" }]);

    expect(container.querySelector('[data-testid="gwho-empty"]')).toBeNull();
    const cell = container.querySelector('[data-testid="gwho-person-u-ava"]');
    expect(cell).not.toBeNull();
    expect(cell?.textContent).toContain("Ava");
  });
});
