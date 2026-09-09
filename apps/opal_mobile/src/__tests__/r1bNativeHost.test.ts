import { readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../..");

describe("R1B native host authority", () => {
  it("App uses ProductWebSurface after auth, not stale AppShell", () => {
    const app = readFileSync(resolve(root, "App.tsx"), "utf8");
    expect(app).toMatch(/ProductWebSurface/);
    expect(app).not.toMatch(/<AppShell/);
    expect(app).toMatch(/ActivationScreen/);
    expect(app).toMatch(/connectSocketWithSession/);
  });

  it("activation requests otp consent and avoids fixture defaults", () => {
    const act = readFileSync(resolve(root, "src/screens/ActivationScreen.tsx"), "utf8");
    const api = readFileSync(resolve(root, "src/api/productSession.ts"), "utf8");
    expect(act).toMatch(/Your number is your key/);
    expect(act).not.toMatch(/\+12025550101/);
    expect(api).toMatch(/otp_consent_accepted:\s*true/);
    expect(api).toMatch(/expo-secure-store/);
    // production_sms verify must re-submit phone (server never reverses digests).
    expect(api).toMatch(/phone:\s*input\.phone/);
    expect(act).toMatch(/phone:\s*phone\.trim\(\)/);
  });

  it("Phoenix uses socket_ticket session path", () => {
    const sock = readFileSync(resolve(root, "src/realtime/opalSocket.ts"), "utf8");
    expect(sock).toMatch(/connectSocketWithSession/);
    expect(sock).toMatch(/socket_ticket/);
    expect(sock).toMatch(/fetchSocketTicket/);
  });

  it("app display name is Opal Graph; bundle remains local.* until founder GO", () => {
    const appJson = JSON.parse(readFileSync(resolve(root, "app.json"), "utf8"));
    expect(appJson.expo.name).toBe("Opal Graph");
    expect(appJson.expo.ios.bundleIdentifier).toBe("local.opal.mobile");
    expect(appJson.expo.android.package).toBe("local.opal.mobile");
  });
});
