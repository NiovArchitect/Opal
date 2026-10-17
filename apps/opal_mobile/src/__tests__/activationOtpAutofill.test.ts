/**
 * Repair #15-A — OTP AutoFill lock (native fallback surface).
 *
 * The founder's phone never offered the one-tap SMS code. The surface he
 * actually uses is the web first-run inside NativeFirstRunSurface's WebView
 * (fixed web-side), but this native fallback must carry the same contract:
 * iOS reads textContentType="oneTimeCode", Android reads autoComplete="sms-otp".
 * Static-source assertions match the existing native-host test style.
 */
import { readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../..");

describe("Repair #15-A activation OTP autofill", () => {
  const act = readFileSync(resolve(root, "src/screens/ActivationScreen.tsx"), "utf8");
  const codeInput = act.slice(act.indexOf('testID="activation-code"') - 600, act.indexOf('testID="activation-code"'));

  it("code input keeps iOS oneTimeCode content type", () => {
    expect(codeInput).toMatch(/textContentType="oneTimeCode"/);
  });

  it("code input carries Android sms-otp autocomplete", () => {
    expect(codeInput).toMatch(/autoComplete="sms-otp"/);
  });

  it("code input is a single numeric field (no per-digit split inputs)", () => {
    expect(act.match(/textContentType="oneTimeCode"/g)).toHaveLength(1);
    expect(codeInput).toMatch(/keyboardType="number-pad"/);
  });
});
