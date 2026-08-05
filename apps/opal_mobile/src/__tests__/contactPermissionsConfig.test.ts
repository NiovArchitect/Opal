/**
 * Social Flow 18 — Android contact permission boundary.
 * Product is read/select only; WRITE_CONTACTS must not reappear in Expo config.
 */
import appJson from "../../app.json";

describe("Android contact permissions (SF18)", () => {
  const android = appJson.expo.android;
  const plugins = appJson.expo.plugins ?? [];

  test("READ_CONTACTS is declared for selected-contact journey", () => {
    const perms = android.permissions ?? [];
    const hasRead = perms.some(
      (p) => p === "READ_CONTACTS" || p === "android.permission.READ_CONTACTS",
    );
    expect(hasRead).toBe(true);
  });

  test("WRITE_CONTACTS is not listed in android.permissions", () => {
    const perms = android.permissions ?? [];
    const hasWrite = perms.some(
      (p) =>
        p === "WRITE_CONTACTS" || p === "android.permission.WRITE_CONTACTS",
    );
    expect(hasWrite).toBe(false);
  });

  test("withReadOnlyContacts plugin is registered after expo-contacts", () => {
    const pluginNames = plugins.map((pl) =>
      typeof pl === "string" ? pl : pl[0],
    );
    expect(pluginNames).toContain("expo-contacts");
    expect(pluginNames).toContain("./plugins/withReadOnlyContacts.js");
    const contactsIdx = pluginNames.indexOf("expo-contacts");
    const blockIdx = pluginNames.indexOf("./plugins/withReadOnlyContacts.js");
    expect(blockIdx).toBeGreaterThan(contactsIdx);
  });
});
