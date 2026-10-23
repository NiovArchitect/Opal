/**
 * Dynamic Expo config.
 *
 * Development / AdHoc profiles historically lack `aps-environment` on the
 * managed provisioning profile. Until ASC API keys can refresh AdHoc with
 * Push Notifications, strip the expo-notifications plugin + remote-notification
 * background mode for non-production builds so contacts rebuilds can sign.
 * Production / store builds keep push.
 *
 * Repair #28 (W28-13 follow-through, 2026-10-22): TestFlight profiles
 * (`testflight`, `testflight_lan`) build against the App Store
 * provisioning profile, which DOES carry `aps-environment: production`
 * (proven by the Real People audit from build 13's profile) - so the
 * strip was wrong for them: every TestFlight binary shipped without
 * the expo-notifications native module and without the entitlement,
 * and the post-auth push prompt (ProductWebSurface ->
 * bridgeExpoPushTokenAfterAuth) silently no-opped because
 * loadNotifications() found no module. TestFlight profiles now keep
 * push. The build gate must verify `aps-environment` in the IPA's
 * codesign entitlements before submit.
 */
const base = require("./app.json").expo;

const profile = (
  process.env.EAS_BUILD_PROFILE ||
  process.env.EXPO_PUBLIC_OPAL_PROFILE ||
  ""
).toLowerCase();

const isProduction =
  profile === "production" ||
  profile === "production_placeholder" ||
  profile.startsWith("testflight") ||
  process.env.OPAL_FORCE_PUSH_ENTITLEMENT === "1";

function withPush(plugins) {
  const hasNotifications = plugins.some((p) => {
    const name = Array.isArray(p) ? p[0] : p;
    return name === "expo-notifications";
  });
  if (hasNotifications) return plugins;
  return [
    ...plugins,
    [
      "expo-notifications",
      {
        icon: "./assets/icon.png",
        color: "#A78BFA",
        sounds: [],
        mode: "production",
      },
    ],
  ];
}

function withoutPush(plugins) {
  return plugins.filter((p) => {
    const name = Array.isArray(p) ? p[0] : p;
    return name !== "expo-notifications";
  });
}

const plugins = isProduction
  ? withPush(base.plugins || [])
  : withoutPush(base.plugins || []);

const infoPlist = { ...(base.ios?.infoPlist || {}) };
const modes = new Set(infoPlist.UIBackgroundModes || []);
if (isProduction) {
  modes.add("remote-notification");
} else {
  modes.delete("remote-notification");
}
infoPlist.UIBackgroundModes = Array.from(modes);

const splash = {
  ...(base.splash || {}),
  image: "./assets/icon.png",
  resizeMode: "contain",
  backgroundColor: "#050816",
};

module.exports = {
  expo: {
    ...base,
    splash,
    plugins,
    ios: {
      ...base.ios,
      infoPlist,
    },
  },
};
