/**
 * Dynamic Expo config.
 *
 * Development / AdHoc profiles historically lack `aps-environment` on the
 * managed provisioning profile. Until ASC API keys can refresh AdHoc with
 * Push Notifications, strip the expo-notifications plugin + remote-notification
 * background mode for non-production builds so contacts rebuilds can sign.
 * Production / store builds keep push.
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

module.exports = {
  expo: {
    ...base,
    plugins,
    ios: {
      ...base.ios,
      infoPlist,
    },
  },
};
