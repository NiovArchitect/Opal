/**
 * Phase 2C — FE receives opal_push_token and POSTs once (dedupe).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const registerDevicePushToken = vi.fn(async () => ({
  token: {
    id: "tok-1",
    platform: "ios",
    token: "ExponentPushToken[test]",
    env: "production",
    active: true,
  },
}));

vi.mock("./api/productClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api/productClient")>();
  return {
    ...actual,
    registerDevicePushToken: (...args: unknown[]) =>
      registerDevicePushToken(...args),
  };
});

import {
  __testOnly_deliverPushToken,
  __testOnly_lastSentPushToken,
  __testOnly_resetPushTokenBridge,
  installNativePushTokenListener,
} from "./nativeHostBridge";

const root = resolve(__dirname, "..");

describe("native host push token (Phase 2C)", () => {
  beforeEach(() => {
    __testOnly_resetPushTokenBridge();
    registerDevicePushToken.mockClear();
    sessionStorage.setItem("opal_native_host", "1");
    localStorage.clear();
  });

  afterEach(() => {
    __testOnly_resetPushTokenBridge();
    localStorage.clear();
  });

  it("POSTs device token once on first opal_push_token", async () => {
    installNativePushTokenListener();
    __testOnly_deliverPushToken({
      type: "opal_push_token",
      expo_push_token: "ExponentPushToken[once-abc]",
    });

    await vi.waitFor(() => {
      expect(registerDevicePushToken).toHaveBeenCalledTimes(1);
    });

    expect(registerDevicePushToken).toHaveBeenCalledWith({
      platform: "ios",
      token: "ExponentPushToken[once-abc]",
      env: "production",
    });
    expect(__testOnly_lastSentPushToken()).toBe("ExponentPushToken[once-abc]");
  });

  it("dedupes — second identical token does not POST again", async () => {
    installNativePushTokenListener();
    __testOnly_deliverPushToken({
      type: "opal_push_token",
      expo_push_token: "ExponentPushToken[dedupe-xyz]",
    });
    await vi.waitFor(() => {
      expect(registerDevicePushToken).toHaveBeenCalledTimes(1);
    });

    __testOnly_deliverPushToken({
      type: "opal_push_token",
      expo_push_token: "ExponentPushToken[dedupe-xyz]",
    });
    // Allow a tick for any accidental second call.
    await new Promise((r) => setTimeout(r, 30));
    expect(registerDevicePushToken).toHaveBeenCalledTimes(1);
  });

  it("ignores non-Expo tokens", async () => {
    installNativePushTokenListener();
    __testOnly_deliverPushToken({
      type: "opal_push_token",
      expo_push_token: "apns-raw-token",
    });
    await new Promise((r) => setTimeout(r, 30));
    expect(registerDevicePushToken).not.toHaveBeenCalled();
  });

  it("main.tsx installs push listener on native host", () => {
    const main = readFileSync(resolve(root, "src/main.tsx"), "utf8");
    expect(main).toMatch(/installNativePushTokenListener/);
    expect(main).toMatch(/opal_native_host/);
  });

  it("productClient exposes registerDevicePushToken", () => {
    const client = readFileSync(resolve(root, "src/api/productClient.ts"), "utf8");
    expect(client).toMatch(/registerDevicePushToken/);
    expect(client).toMatch(/\/api\/v1\/product\/devices\/tokens/);
  });
});
