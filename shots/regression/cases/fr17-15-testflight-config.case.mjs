/**
 * FR-17-15 (repo-side part) - TestFlight was blocked repo-side
 * (F17-16): expo-notifications undeclared, no testflight profile.
 * Static guard on the mobile build config. The upload/install/
 * smoke steps require the founder's Apple account + phone and stay
 * founder steps by name (catalog).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export default {
  id: "FR-17-15",
  title: "TestFlight was blocked repo-side: expo-notifications undeclared, no testflight profile",
  theme: "Splash, brand, character, TestFlight",
  class: "A",
  surfaces: ["apps/opal_mobile/app.json", "apps/opal_mobile/eas.json", "apps/opal_mobile/package.json"],
  async run(ctx) {
    const { assert } = ctx;
    assert.note("TestFlight upload/install/smoke are founder steps (Apple account + physical phone) and are not asserted here");
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
    const mobile = path.join(root, "apps/opal_mobile");
    const appJson = fs.readFileSync(path.join(mobile, "app.json"), "utf8");
    const pkg = fs.readFileSync(path.join(mobile, "package.json"), "utf8");
    const eas = JSON.parse(fs.readFileSync(path.join(mobile, "eas.json"), "utf8"));
    assert.check("app.json / package.json", /expo-notifications/.test(appJson) || /expo-notifications/.test(pkg),
      "expo-notifications must be declared in the mobile build config");
    assert.check("eas.json", !!eas.build?.testflight,
      "a testflight EAS build profile must exist");
  },
};
