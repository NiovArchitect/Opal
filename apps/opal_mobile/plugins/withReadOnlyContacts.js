/**
 * Social Flow 18 — keep contacts read-only on Android.
 * expo-contacts plugin declares WRITE_CONTACTS; product only reads/selects.
 */
const {
  AndroidConfig,
  createRunOncePlugin,
  withAndroidManifest,
} = require("expo/config-plugins");

function withReadOnlyContacts(config) {
  config = AndroidConfig.Permissions.withBlockedPermissions(config, [
    "android.permission.WRITE_CONTACTS",
  ]);
  // Also strip explicit permissions array entry if present
  if (config.android && Array.isArray(config.android.permissions)) {
    config.android.permissions = config.android.permissions.filter(
      (p) => p !== "android.permission.WRITE_CONTACTS" && p !== "WRITE_CONTACTS",
    );
  }
  return config;
}

module.exports = createRunOncePlugin(
  withReadOnlyContacts,
  "opal-read-only-contacts",
  "1.0.0",
);
