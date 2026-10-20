/**
 * @vitest-environment jsdom
 *
 * Founder Screen Notes N3 + N4 — the relationship picker.
 *
 * N3 (Family accordion): choosing Family expands the subtype /
 * minor / age-band depth INLINE, directly under the Family row —
 * expand/collapse in place, never a separate step or screen;
 * subtype selection is reachable without any navigation, and the
 * sheet's Save is the one write.
 * N4 (age bands): the band establishment sits next to the minor
 * flag, round-trips through the same save payload (`ageBand`), and
 * drives the minor flag truthfully (minor = 17 and under). The
 * band is an affordance only — nothing here restricts anything.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RelationshipPickerSheet } from "./RelationshipPicker";

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
  if (root) await act(async () => root!.unmount());
  root = null;
  host?.remove();
  host = null;
  document.body.innerHTML = "";
});

function click(el: Element) {
  act(() => {
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
}
async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}
const q = (sel: string) => document.querySelector(sel);

describe("N3 — Family expands inline (accordion), never a separate step", () => {
  it("subtypes render directly under the Family row, inside the same radiogroup; collapse keeps the selection", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    await render(
      <RelationshipPickerSheet
        personName="Maya Torres"
        currentType={null}
        onSave={onSave}
        onClose={onClose}
      />,
    );
    // Resting: no subtype depth anywhere.
    expect(q('[data-testid="r19-family-subtype-step"]')).toBeNull();

    click(q('[data-testid="r19-relationship-option-family"]')!);
    expect(onSave).not.toHaveBeenCalled();
    const step = q('[data-testid="r19-family-subtype-step"]')!;
    expect(step).not.toBeNull();
    expect(step.getAttribute("data-accordion")).toBe("inline");

    // DOM order: the expansion sits between the Family row and the
    // next type row (Friend), inside the type radiogroup — in
    // place, not appended as a separate step below everything.
    const group = step.parentElement!;
    const children = Array.from(group.children);
    const familyIdx = children.findIndex(
      (c) => c.getAttribute("data-testid") === "r19-relationship-option-family",
    );
    const stepIdx = children.indexOf(step);
    const nextIdx = children.findIndex(
      (c) => c.getAttribute("data-testid") === "r19-relationship-option-close_friend",
    );
    expect(familyIdx).toBeGreaterThanOrEqual(0);
    expect(stepIdx).toBe(familyIdx + 1);
    expect(nextIdx).toBe(stepIdx + 1);
    expect(
      q('[data-testid="r19-relationship-option-family"]')!.getAttribute("aria-expanded"),
    ).toBe("true");

    // Subtype selection is reachable right here, no navigation.
    click(q('[data-testid="r19-family-subtype-sibling"]')!);

    // Collapse in place: tap Family again — depth hides, selection
    // and the Save stay.
    click(q('[data-testid="r19-relationship-option-family"]')!);
    expect(q('[data-testid="r19-family-subtype-step"]')).toBeNull();
    expect(
      q('[data-testid="r19-relationship-option-family"]')!.getAttribute("aria-expanded"),
    ).toBe("false");
    expect(q('[data-testid="r19-relationship-save"]')).not.toBeNull();

    // Re-expand and save: the one write carries the kept subtype.
    click(q('[data-testid="r19-relationship-option-family"]')!);
    click(q('[data-testid="r19-relationship-save"]')!);
    await flush();
    expect(onSave).toHaveBeenCalledWith({
      type: "family",
      familySubtype: "sibling",
      familyMinor: false,
      ageBand: null,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("opens already expanded when Family is the current type", async () => {
    await render(
      <RelationshipPickerSheet
        personName="Maya Torres"
        currentType="family"
        currentFamilySubtype="parent"
        onSave={vi.fn().mockResolvedValue(undefined)}
        onClose={vi.fn()}
      />,
    );
    expect(q('[data-testid="r19-family-subtype-step"]')).not.toBeNull();
    expect(
      q('[data-testid="r19-family-subtype-parent"]')!.getAttribute("data-selected"),
    ).toBe("true");
  });
});

describe("N4 — age-band establishment next to the minor flag", () => {
  it("choosing 13-17 turns the minor flag on and the save carries the band; Adult turns it off", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    await render(
      <RelationshipPickerSheet
        personName="Leo Park"
        currentType={null}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );
    click(q('[data-testid="r19-relationship-option-family"]')!);
    click(q('[data-testid="r19-family-subtype-child"]')!);

    // The band control lives inside the same inline expansion.
    const bandGroup = q('[data-testid="r19-age-band"]')!;
    expect(bandGroup).not.toBeNull();
    expect(q('[data-testid="r19-family-subtype-step"]')!.contains(bandGroup)).toBe(true);

    click(q('[data-testid="r19-age-band-age_13_17"]')!);
    expect(q('[data-testid="r19-family-minor"]')!.getAttribute("aria-pressed")).toBe("true");
    click(q('[data-testid="r19-relationship-save"]')!);
    await flush();
    expect(onSave).toHaveBeenCalledWith({
      type: "family",
      familySubtype: "child",
      familyMinor: true,
      ageBand: "age_13_17",
    });
  });

  it("an established band opens selected; clearing it leaves the flag as it stands", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    await render(
      <RelationshipPickerSheet
        personName="Leo Park"
        currentType="family"
        currentFamilySubtype="child"
        currentFamilyMinor={true}
        currentAgeBand="under_13"
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );
    expect(q('[data-testid="r19-age-band-under_13"]')!.getAttribute("data-selected")).toBe(
      "true",
    );
    click(q('[data-testid="r19-age-band-clear"]')!);
    expect(
      q('[data-testid="r19-age-band-under_13"]')!.getAttribute("data-selected"),
    ).toBeNull();
    click(q('[data-testid="r19-relationship-save"]')!);
    await flush();
    expect(onSave).toHaveBeenCalledWith({
      type: "family",
      familySubtype: "child",
      familyMinor: true,
      ageBand: null,
    });
  });

  it("choosing Adult turns the minor flag off", async () => {
    await render(
      <RelationshipPickerSheet
        personName="Ana Park"
        currentType="family"
        currentFamilySubtype="sibling"
        currentFamilyMinor={true}
        currentAgeBand="age_13_17"
        onSave={vi.fn().mockResolvedValue(undefined)}
        onClose={vi.fn()}
      />,
    );
    click(q('[data-testid="r19-age-band-adult"]')!);
    expect(q('[data-testid="r19-family-minor"]')!.getAttribute("aria-pressed")).toBe("false");
  });
});
