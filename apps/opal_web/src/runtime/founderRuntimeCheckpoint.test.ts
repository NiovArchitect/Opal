/**
 * runtime= checkpoint must bust stale founder sessions without requiring hard-refresh.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RUNTIME_CHECKPOINT_KEY,
  RUNTIME_RELOAD_PREFIX,
  applyFounderRuntimeCheckpoint,
  readRuntimeParam,
} from "./founderRuntimeCheckpoint";

describe("founderRuntimeCheckpoint", () => {
  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    document.documentElement.removeAttribute("data-runtime-checkpoint");
    document.documentElement.removeAttribute("data-runtime-bust");
    vi.restoreAllMocks();
  });

  it("RUNTIME_CHECKPOINT_PARAM_PRESERVED (reads runtime= from URL)", () => {
    expect(
      readRuntimeParam(
        "http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1&runtime=73f0462",
      ),
    ).toBe("73f0462");
    expect(readRuntimeParam("http://127.0.0.1:5173/")).toBeNull();
  });

  it("RUNTIME_CHECKPOINT_MISMATCH_CLEARS_STALE_STATE", () => {
    localStorage.setItem("opal.firstRun.v14.completed", "1");
    localStorage.setItem("opal.product.profile.v17", JSON.stringify({ user_id: "stale" }));
    sessionStorage.setItem(RUNTIME_CHECKPOINT_KEY, "noon-stale");

    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        href: "http://127.0.0.1:5173/?opal_reset_first_run=1&runtime=73f0462",
        reload,
      },
    });

    const result = applyFounderRuntimeCheckpoint(
      "http://127.0.0.1:5173/?opal_reset_first_run=1&runtime=73f0462",
    );

    expect(result.runtime).toBe("73f0462");
    expect(result.bustApplied).toBe(true);
    expect(result.reloading).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("opal.firstRun.v14.completed")).toBeNull();
    expect(localStorage.getItem("opal.product.profile.v17")).toBeNull();
    expect(sessionStorage.getItem(RUNTIME_CHECKPOINT_KEY)).toBe("73f0462");
    expect(sessionStorage.getItem(`${RUNTIME_RELOAD_PREFIX}73f0462`)).toBe("1");
    expect(document.documentElement.getAttribute("data-runtime-checkpoint")).toBe("73f0462");
  });

  it("RUNTIME_CHECKPOINT_MATCH_DOES_NOT_CLEAR_AGAIN", () => {
    sessionStorage.setItem(RUNTIME_CHECKPOINT_KEY, "73f0462");
    sessionStorage.setItem(`${RUNTIME_RELOAD_PREFIX}73f0462`, "1");
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        href: "http://127.0.0.1:5173/?runtime=73f0462",
        reload,
      },
    });

    const result = applyFounderRuntimeCheckpoint("http://127.0.0.1:5173/?runtime=73f0462");
    expect(result.reloading).toBe(false);
    expect(result.bustApplied).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
