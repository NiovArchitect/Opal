/**
 * Minimal Expo config plugin for react-native-callkeep / CallKit readiness.
 * Sets UIBackgroundModes audio+voip and ensures mic/camera usage strings.
 *
 * Expo SDK 53 + CallKeep: requires a custom Dev Client rebuild after enabling.
 * If CallKeep native module is unavailable at runtime, the app uses the
 * full-screen in-app incoming call fallback (see callKeepBridge.ts).
 */
const {
  withInfoPlist,
  createRunOncePlugin,
} = require("@expo/config-plugins");

const PKG = "withOpalCallKeep";

function ensureBackgroundModes(infoPlist) {
  const modes = new Set(infoPlist.UIBackgroundModes || []);
  modes.add("audio");
  modes.add("voip");
  modes.add("remote-notification");
  infoPlist.UIBackgroundModes = Array.from(modes);
  return infoPlist;
}

function withCallKeep(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults = ensureBackgroundModes(cfg.modResults);
    if (!cfg.modResults.NSMicrophoneUsageDescription) {
      cfg.modResults.NSMicrophoneUsageDescription =
        "Opal needs microphone access for voice calls and voice messages.";
    }
    if (!cfg.modResults.NSCameraUsageDescription) {
      cfg.modResults.NSCameraUsageDescription =
        "Opal needs camera access for video calls.";
    }
    return cfg;
  });
}

module.exports = createRunOncePlugin(withCallKeep, PKG, "1.0.0");
