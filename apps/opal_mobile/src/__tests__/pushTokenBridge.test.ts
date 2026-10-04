/**
 * Phase 2C — Expo push token bridge (host → FE).
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  ALLOWED_OUTBOUND_TYPES,
  PUSH_TOKEN_OUTBOUND_TYPE,
  buildPushTokenInjectScript,
  isAllowedOutboundType,
} from "../bridge/mediaBridgeContract";
import {
  acquireExpoPushToken,
  deliverPushToken,
  type PushNotificationsModule,
} from "../bridge/pushTokenBridge";

const root = resolve(__dirname, "../..");

describe("push token outbound contract", () => {
  test("outbound whitelist includes opal_push_token", () => {
    expect(isAllowedOutboundType(PUSH_TOKEN_OUTBOUND_TYPE)).toBe(true);
    expect(ALLOWED_OUTBOUND_TYPES).toContain("opal_push_token");
    expect(isAllowedOutboundType("opal_native_eval")).toBe(false);
  });

  test("inject script dispatches opal-push-token CustomEvent with token", () => {
    const script = buildPushTokenInjectScript({
      type: "opal_push_token",
      expo_push_token: "ExponentPushToken[abc123]",
    });
    expect(script).toMatch(/opal-push-token/);
    expect(script).toMatch(/ExponentPushToken\[abc123\]/);
    expect(script).toMatch(/__opalPushTokenDeliver/);
    expect(script).toMatch(/CustomEvent/);
  });
});

describe("acquireExpoPushToken", () => {
  test("denied permission returns null (silent — no throw)", async () => {
    const mock: PushNotificationsModule = {
      getPermissionsAsync: async () => ({ status: "denied" }),
      requestPermissionsAsync: async () => ({ status: "denied" }),
      getExpoPushTokenAsync: async () => {
        throw new Error("should not be called");
      },
    };
    await expect(acquireExpoPushToken(mock)).resolves.toBeNull();
  });

  test("granted permission returns Expo token", async () => {
    const mock: PushNotificationsModule = {
      getPermissionsAsync: async () => ({ status: "undetermined" }),
      requestPermissionsAsync: async () => ({ status: "granted" }),
      getExpoPushTokenAsync: async () => ({
        data: "ExponentPushToken[granted-token-xyz]",
      }),
    };
    await expect(acquireExpoPushToken(mock)).resolves.toBe(
      "ExponentPushToken[granted-token-xyz]",
    );
  });

  test("null notifications module returns null", async () => {
    await expect(acquireExpoPushToken(null)).resolves.toBeNull();
  });
});

describe("deliverPushToken", () => {
  test("injects via WebView ref", () => {
    const injectJavaScript = jest.fn();
    const webRef = { current: { injectJavaScript } } as unknown as {
      current: { injectJavaScript: (s: string) => void };
    };
    expect(
      deliverPushToken(webRef as never, "ExponentPushToken[inject-me]"),
    ).toBe(true);
    expect(injectJavaScript).toHaveBeenCalledTimes(1);
    expect(String(injectJavaScript.mock.calls[0]![0])).toMatch(
      /ExponentPushToken\[inject-me\]/,
    );
  });
});

describe("native host wiring", () => {
  test("ProductWebSurface bridges push token after auth load", () => {
    const surface = readFileSync(
      resolve(root, "src/shell/ProductWebSurface.tsx"),
      "utf8",
    );
    expect(surface).toMatch(/bridgeExpoPushTokenAfterAuth/);
    expect(surface).toMatch(/onLoadEnd/);
  });

  test("package.json includes expo-notifications ~0.31", () => {
    const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
    expect(pkg.dependencies["expo-notifications"]).toMatch(/0\.31/);
  });

  test("app.json declares expo-notifications plugin", () => {
    const appJson = JSON.parse(readFileSync(resolve(root, "app.json"), "utf8"));
    const pluginNames = (appJson.expo.plugins ?? []).map(
      (pl: string | [string, unknown]) => (typeof pl === "string" ? pl : pl[0]),
    );
    expect(pluginNames).toContain("expo-notifications");
  });
});
