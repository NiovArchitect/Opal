import { afterEach, describe, expect, it } from "vitest";
import {
  BROWSER_SESSION_KEY,
  loadBrowserAccessToken,
  saveBrowserAccessToken,
  saveProfile,
  type ProductSession,
} from "./productClient";

const profile: ProductSession = {
  user_id: "user-a",
  display_name: "User A",
  handle: "user_a",
  session_id: "sess-a",
  access_token: "bearer-a",
};

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  saveBrowserAccessToken(null);
});

describe("browser session ownership", () => {
  it("keeps the bearer in tab sessionStorage, not localStorage", () => {
    saveProfile(profile);
    expect(sessionStorage.getItem(BROWSER_SESSION_KEY)).toBe("bearer-a");
    const stored = localStorage.getItem("opal.product.profile.v17") || "";
    expect(stored).not.toMatch(/bearer-a/);
    expect(stored).toMatch(/user-a/);
    expect(loadBrowserAccessToken()).toBe("bearer-a");
  });

  it("clears the tab bearer on sign-out", () => {
    saveProfile(profile);
    saveProfile(null);
    expect(sessionStorage.getItem(BROWSER_SESSION_KEY)).toBeNull();
    expect(loadBrowserAccessToken()).toBeNull();
    expect(localStorage.getItem("opal.product.profile.v17")).toBeNull();
  });
});
