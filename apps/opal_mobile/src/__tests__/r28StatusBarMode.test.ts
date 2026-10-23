/**
 * Repair #28 (W28-6) - the native status bar follows the app's
 * resolved mode.
 *
 * Founder walk #6 (build 13): in light mode the iOS status glyphs
 * rendered white-on-white - build 13 is the R24 shell, where every
 * native StatusBar was hardcoded light-content while the web
 * paints a light ground. The mode bridge (built in R27 W27-16)
 * had simply never shipped in a binary. These pins hold the
 * mechanism on this branch, which build 14 is cut from:
 * the contract whitelists opal_native_mode, the parser is strict,
 * the app's initial bar style is dark-content (the light first
 * run), and both product surfaces forward the web's mode reports.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  isAllowedInboundType,
  MODE_INBOUND_TYPE,
  parseModeMessage,
} from "../bridge/mediaBridgeContract";

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

describe("W28-6 - status bar mode bridge", () => {
  test("the mode message type is whitelisted", () => {
    expect(MODE_INBOUND_TYPE).toBe("opal_native_mode");
    expect(isAllowedInboundType("opal_native_mode")).toBe(true);
  });

  test("parseModeMessage accepts only the two real modes", () => {
    expect(parseModeMessage({ type: "opal_native_mode", mode: "light" })).toBe("light");
    expect(parseModeMessage({ type: "opal_native_mode", mode: "dark" })).toBe("dark");
    expect(parseModeMessage({ type: "opal_native_mode", mode: "sepia" })).toBeNull();
    expect(parseModeMessage({ type: "opal_native_mode" })).toBeNull();
    expect(parseModeMessage(null)).toBeNull();
    expect(parseModeMessage("dark")).toBeNull();
  });

  test("App starts dark-content and maps web modes onto the bar", () => {
    const app = read("App.tsx");
    // Initial state: the first run is LIGHT, so glyphs start dark.
    expect(app).toMatch(/useState<"light-content" \| "dark-content">\(\s*"dark-content",?\s*\)/);
    expect(app).toContain('mode === "dark" ? "light-content" : "dark-content"');
    // Both web-bearing surfaces receive the mode callback.
    expect(app).toContain("onMode={handleWebMode}");
  });

  test("the first-run surface forwards mode reports and defaults dark-content", () => {
    const surface = read("src/shell/NativeFirstRunSurface.tsx");
    expect(surface).toContain('barStyle = "dark-content"');
    expect(surface).toContain("onMode");
  });

  test("the message handler routes mode reports to onMode", () => {
    const handler = read("src/bridge/handleWebViewMessage.ts");
    expect(handler).toContain("MODE_INBOUND_TYPE");
    expect(handler).toContain("parseModeMessage");
    expect(handler).toContain("onMode");
  });
});
