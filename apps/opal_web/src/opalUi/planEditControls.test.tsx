/**
 * @vitest-environment jsdom
 *
 * Repair #18 (Walk #4, W4-04) - plan edit controls.
 *
 * Structure-level proof for the detail-surface edit affordance (the
 * real-path proof is shots/regression W4-04a/b/c against the live
 * stack; this test proves the component's own discipline):
 *  - no Edit affordance when the backend authority says canEdit=false
 *    (the stored title still renders);
 *  - save calls PATCH with only the changed fields and re-renders the
 *    title from the RETURNED payload;
 *  - a server rejection keeps the editor open, draft intact, server
 *    message inline, and the stored title unchanged;
 *  - a blank title is blocked before any request is made.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi, beforeEach } from "vitest";

const patchMock = vi.fn();
vi.mock("../api/productClient", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    patchOpalPlan: (...args: unknown[]) => patchMock(...args),
  };
});

import { PlanEditControls } from "./PlanEditControls";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function render(element: React.ReactElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(element);
  });
  return {
    host,
    q: (sel: string) => host.querySelector(sel) as HTMLElement | null,
    async unmount() {
      await act(async () => {
        root.unmount();
      });
      host.remove();
    },
  };
}

function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
}

describe("PlanEditControls (W4-04)", () => {
  beforeEach(() => {
    patchMock.mockReset();
  });

  it("renders the stored title and NO edit affordance when canEdit is false", async () => {
    const view = await render(
      <PlanEditControls planId="p1" title="Diner at Juniper" canEdit={false} />,
    );
    expect(view.q("[data-testid='plan-edit-title']")?.textContent).toBe("Diner at Juniper");
    expect(view.q("[data-testid='plan-edit-open']")).toBeNull();
    await view.unmount();
  });

  it("saves through PATCH and re-renders the title from the returned payload", async () => {
    patchMock.mockResolvedValue({
      ok: true,
      plan: { id: "p1", title: "Dinner at Juniper", status: "tentative", location: "Juniper & Ivy" },
    });
    const onEdited = vi.fn();
    const view = await render(
      <PlanEditControls
        planId="p1"
        title="Diner at Juniper"
        location="Juniper & Ivy"
        canEdit
        bearer="tok"
        onEdited={onEdited}
      />,
    );
    await act(async () => {
      view.q("[data-testid='plan-edit-open']")?.click();
    });
    const input = view.q("[data-testid='plan-edit-title-input']") as HTMLInputElement;
    expect(input).not.toBeNull();
    await act(async () => {
      setInput(input, "Dinner at Juniper");
    });
    await act(async () => {
      view.q("[data-testid='plan-edit-save']")?.click();
    });
    expect(patchMock).toHaveBeenCalledTimes(1);
    const [planId, changes, bearer] = patchMock.mock.calls[0];
    expect(planId).toBe("p1");
    expect(changes).toEqual({ title: "Dinner at Juniper" });
    expect(bearer).toBe("tok");
    expect(onEdited).toHaveBeenCalledWith(
      expect.objectContaining({ id: "p1", title: "Dinner at Juniper" }),
    );
    // Editor closed; the title shown is the returned one.
    expect(view.q("[data-testid='plan-edit-form']")).toBeNull();
    expect(view.q("[data-testid='plan-edit-title']")?.textContent).toBe("Dinner at Juniper");
    await view.unmount();
  });

  it("keeps the editor open with the server message on rejection, title unchanged", async () => {
    const err = new Error("Unprocessable") as Error & {
      errors?: Record<string, string[]>;
    };
    err.errors = { title: ["should be at most 120 character(s)"] };
    patchMock.mockRejectedValue(err);
    const view = await render(
      <PlanEditControls planId="p1" title="Diner at Juniper" canEdit bearer="tok" />,
    );
    await act(async () => {
      view.q("[data-testid='plan-edit-open']")?.click();
    });
    const input = view.q("[data-testid='plan-edit-title-input']") as HTMLInputElement;
    const longTitle = "x".repeat(200);
    await act(async () => {
      setInput(input, longTitle);
    });
    await act(async () => {
      view.q("[data-testid='plan-edit-save']")?.click();
    });
    expect(view.q("[data-testid='plan-edit-error']")?.textContent).toContain(
      "should be at most 120 character(s)",
    );
    // Draft intact, form still open.
    expect(
      (view.q("[data-testid='plan-edit-title-input']") as HTMLInputElement).value,
    ).toBe(longTitle);
    await act(async () => {
      view.q("[data-testid='plan-edit-cancel']")?.click();
    });
    expect(view.q("[data-testid='plan-edit-title']")?.textContent).toBe("Diner at Juniper");
    await view.unmount();
  });

  it("blocks a blank title before any request", async () => {
    const view = await render(
      <PlanEditControls planId="p1" title="Diner at Juniper" canEdit bearer="tok" />,
    );
    await act(async () => {
      view.q("[data-testid='plan-edit-open']")?.click();
    });
    const input = view.q("[data-testid='plan-edit-title-input']") as HTMLInputElement;
    await act(async () => {
      setInput(input, "   ");
    });
    await act(async () => {
      view.q("[data-testid='plan-edit-save']")?.click();
    });
    expect(patchMock).not.toHaveBeenCalled();
    expect(view.q("[data-testid='plan-edit-error']")?.textContent).toContain("blank");
    await view.unmount();
  });
});
