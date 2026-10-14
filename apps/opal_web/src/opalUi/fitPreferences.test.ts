import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  fitPreferencesStorageKey,
  loadFitPreferences,
  readFitContextForOpal,
  saveFitPreferences,
  type FitPreferences,
} from "./fitPreferences";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("fitPreferences", () => {
  it("defaults to share=false, empty activities, wellnessGoal none", () => {
    const prefs = loadFitPreferences("user-a");
    expect(prefs).toEqual({
      activities: [],
      wellnessGoal: "none",
      shareActivityPrefs: false,
    });
  });

  it("scopes storage by userId and round-trips save/load", () => {
    const draft: FitPreferences = {
      activities: ["walk", "yoga"],
      wellnessGoal: "move_more",
      shareActivityPrefs: true,
    };
    saveFitPreferences("user-a", draft);
    expect(localStorage.getItem(fitPreferencesStorageKey("user-a"))).toBeTruthy();
    expect(loadFitPreferences("user-a")).toEqual(draft);
    expect(loadFitPreferences("user-b")).toEqual({
      activities: [],
      wellnessGoal: "none",
      shareActivityPrefs: false,
    });
  });

  it("readFitContextForOpal is null when share is off", () => {
    saveFitPreferences("user-a", {
      activities: ["run"],
      wellnessGoal: "stay_active",
      shareActivityPrefs: false,
    });
    expect(readFitContextForOpal("user-a")).toBeNull();
  });

  it("readFitContextForOpal returns a summary when share is on", () => {
    saveFitPreferences("user-a", {
      activities: ["walk", "strength"],
      wellnessGoal: "recover",
      shareActivityPrefs: true,
    });
    const summary = readFitContextForOpal("user-a");
    expect(summary).toMatch(/Walk/i);
    expect(summary).toMatch(/Strength/i);
    expect(summary).toMatch(/Recover/i);
  });

  it("uses anon key when userId is null", () => {
    saveFitPreferences(null, {
      activities: ["rest"],
      wellnessGoal: "none",
      shareActivityPrefs: true,
    });
    expect(localStorage.getItem(fitPreferencesStorageKey(null))).toBeTruthy();
    expect(readFitContextForOpal(null)).toMatch(/Rest/i);
  });
});
