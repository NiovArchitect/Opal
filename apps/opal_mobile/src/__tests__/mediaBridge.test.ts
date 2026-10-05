/**
 * Tranche #1 — native media bridge contract + whitelist.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  buildMediaInjectScript,
  isAllowedInboundType,
  parseMediaRequest,
  MEDIA_INBOUND_TYPE,
  MAX_MEDIA_BYTES,
  userSafePermissionDenied,
} from "../bridge/mediaBridgeContract";

const root = resolve(__dirname, "../..");

describe("media bridge contract", () => {
  test("whitelist allows session, sign-out, media, and OC-6 speech only", () => {
    expect(isAllowedInboundType("opal_native_session")).toBe(true);
    expect(isAllowedInboundType("opal_native_sign_out")).toBe(true);
    expect(isAllowedInboundType(MEDIA_INBOUND_TYPE)).toBe(true);
    expect(isAllowedInboundType("opal_native_start_speech")).toBe(true);
    expect(isAllowedInboundType("opal_native_speak_text")).toBe(true);
    expect(isAllowedInboundType("opal_native_stop_speak")).toBe(true);
    expect(isAllowedInboundType("opal_native_eval")).toBe(false);
    expect(isAllowedInboundType("arbitrary_command")).toBe(false);
    expect(isAllowedInboundType(undefined)).toBe(false);
  });

  test("parseMediaRequest validates source + request_id", () => {
    const bad = parseMediaRequest({ type: MEDIA_INBOUND_TYPE, source: "camera" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.code).toBe("invalid_request");

    const badSource = parseMediaRequest({
      type: MEDIA_INBOUND_TYPE,
      request_id: "r1",
      source: "drone",
    });
    expect(badSource.ok).toBe(false);

    const ok = parseMediaRequest({
      type: MEDIA_INBOUND_TYPE,
      request_id: "req-abc",
      source: "photo_library",
      initiating_surface: "story",
      media_types: ["image", "video", "audio"],
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.request.source).toBe("photo_library");
      expect(ok.request.initiating_surface).toBe("story");
      expect(ok.request.media_types).toEqual(["image", "video"]);
    }
  });

  test("permission denied copy is user-safe", () => {
    expect(userSafePermissionDenied("camera")).toMatch(/Settings/i);
    expect(userSafePermissionDenied("photo_library")).toMatch(/Photos|Settings/i);
  });

  test("inject script carries request_id and does not eval raw user strings as code", () => {
    const script = buildMediaInjectScript({
      type: "opal_native_media_cancelled",
      request_id: "rid-1",
      source: "camera",
      initiating_surface: "center",
    });
    expect(script).toMatch(/opal-native-media/);
    expect(script).toMatch(/rid-1/);
    expect(script).toMatch(/CustomEvent/);
    expect(MAX_MEDIA_BYTES).toBeGreaterThan(1024 * 1024);
  });
});

describe("native host wiring", () => {
  test("ProductWebSurface routes messages through handleWebViewMessage", () => {
    const surface = readFileSync(resolve(root, "src/shell/ProductWebSurface.tsx"), "utf8");
    expect(surface).toMatch(/handleWebViewMessage/);
    expect(surface).not.toMatch(/msg\?\.type === "opal_native_sign_out"/);
  });

  test("NativeFirstRunSurface preserves session handoff via shared router", () => {
    const surface = readFileSync(
      resolve(root, "src/shell/NativeFirstRunSurface.tsx"),
      "utf8",
    );
    expect(surface).toMatch(/handleWebViewMessage/);
    expect(surface).toMatch(/onSession/);
    expect(surface).toMatch(/saveProductSession/);
  });

  test("app.json declares camera/photo/mic/speech strings and picker plugins", () => {
    const appJson = JSON.parse(readFileSync(resolve(root, "app.json"), "utf8"));
    const plist = appJson.expo.ios.infoPlist;
    expect(plist.NSCameraUsageDescription).toMatch(/camera/i);
    expect(plist.NSPhotoLibraryUsageDescription).toMatch(/photos/i);
    expect(plist.NSMicrophoneUsageDescription).toMatch(/microphone/i);
    expect(plist.NSMicrophoneUsageDescription).toMatch(/talk to her/i);
    expect(plist.NSSpeechRecognitionUsageDescription).toMatch(/speech recognition/i);
    const pluginNames = (appJson.expo.plugins ?? []).map((pl: string | [string, unknown]) =>
      typeof pl === "string" ? pl : pl[0],
    );
    expect(pluginNames).toContain("expo-image-picker");
    expect(pluginNames).toContain("expo-document-picker");
  });

  test("OC-6 speech inject scripts deliver CustomEvents", () => {
    const {
      buildSpeechInjectScript,
      buildNativeTtsInjectScript,
      buildNativeStopSpeakInjectScript,
    } = require("../bridge/mediaBridgeContract") as typeof import("../bridge/mediaBridgeContract");
    const stt = buildSpeechInjectScript({
      type: "opal_native_speech_result",
      request_id: "speech-1",
      text: "dinner friday",
    });
    expect(stt).toMatch(/opal-native-speech/);
    expect(stt).toMatch(/dinner friday/);
    const tts = buildNativeTtsInjectScript("tts-1", "Hello from Opal");
    expect(tts).toMatch(/speechSynthesis/);
    expect(tts).toMatch(/Hello from Opal/);
    expect(buildNativeStopSpeakInjectScript()).toMatch(/speechSynthesis\.cancel/);
  });

  test("package.json includes Expo SDK pickers (no expo-camera unless required)", () => {
    const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
    expect(pkg.dependencies["expo-image-picker"]).toBeTruthy();
    expect(pkg.dependencies["expo-document-picker"]).toBeTruthy();
    expect(pkg.dependencies["expo-camera"]).toBeUndefined();
  });

  test("native media modules are lazy-required (startup must not import ExpoDocumentPicker)", () => {
    const acq = readFileSync(
      resolve(root, "src/bridge/nativeMediaAcquisition.ts"),
      "utf8",
    );
    expect(acq).not.toMatch(/^import \* as DocumentPicker from \"expo-document-picker\";/m);
    expect(acq).not.toMatch(/^import \* as ImagePicker from \"expo-image-picker\";/m);
    expect(acq).toMatch(/require\(\"expo-document-picker\"\)/);
    expect(acq).toMatch(/require\(\"expo-image-picker\"\)/);
    expect(acq).toMatch(/nativeModuleMissing/);
  });
});
