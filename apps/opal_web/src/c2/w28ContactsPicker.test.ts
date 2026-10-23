/**
 * Repair #28 (W28-13) — the contacts prompt must be reachable in
 * the SERVED path. Before this wiring, the native contacts bridge,
 * the read-only plugin, and the web request function all existed,
 * but their only callers were mounted in the legacy unmounted
 * shell - no C2 surface ever sent the request, so the iOS prompt
 * could never fire (Real People audit L5). These pins hold the
 * served picker wiring, and the notifications capability fix that
 * shared the same shape (trigger wired, capability stripped).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(webRoot, rel), "utf8");

describe("W28-13 contacts pick-a-person in the served people picker", () => {
  const hosts = read("src/c2/shell/C1ShellHosts.tsx");

  it("the served people picker carries a contacts entry", () => {
    expect(hosts).toContain('data-testid="c2-c1-contacts-pick"');
    expect(hosts).toContain("Pick from contacts");
  });

  it("the entry opens the shared ContactSuggestPicker sheet", () => {
    expect(hosts).toContain(
      'from "../../people/ContactSuggestPicker"',
    );
    expect(hosts).toContain("openSheet={contactsSheetOpen}");
    expect(hosts).toContain("onSelect={pickFromContacts}");
    expect(hosts).toContain("onDeniedOnce=");
  });

  it("a pick resolves through the proven by-phone path, not a new one", () => {
    expect(hosts).toContain("void startByPhone(person.phone);");
    expect(hosts).toContain("startConversationByPhone(phone, bearer)");
  });

  it("the picker component sends the native request in pick mode", () => {
    const picker = read("src/people/ContactSuggestPicker.tsx");
    expect(picker).toContain('requestNativeContacts({ mode: "pick", limit: 200 })');
  });

  it("the request function posts the native bridge message", () => {
    const bridge = read("src/nativeHostBridge.ts");
    expect(bridge).toContain("export function requestNativeContacts");
    expect(bridge).toContain('type: "opal_native_request_contacts"');
  });
});

describe("W28-13 notifications capability (the same shape, native side)", () => {
  it("TestFlight profiles keep the expo-notifications plugin", () => {
    const config = read("../opal_mobile/app.config.js");
    // TestFlight builds run against the App Store provisioning
    // profile (aps-environment: production) - stripping the plugin
    // there silently disabled the post-auth push prompt on every
    // TestFlight binary (loadNotifications() found no module).
    expect(config).toContain('profile.startsWith("testflight")');
  });

  it("the shipped shell runs the post-auth push trigger", () => {
    const surface = read("../opal_mobile/src/shell/ProductWebSurface.tsx");
    expect(surface).toContain("bridgeExpoPushTokenAfterAuth");
    const app = read("../opal_mobile/App.tsx");
    expect(app).toContain("ProductWebSurface");
  });
});
