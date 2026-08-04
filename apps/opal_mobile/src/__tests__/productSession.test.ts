import {
  buildMinimizationEvidence,
  clearProductSession,
  loadProductSession,
  saveProductSession,
} from "../api/productSession";

describe("productSession SF18", () => {
  beforeEach(async () => {
    await clearProductSession();
  });

  it("stores and restores session via secure store fallback", async () => {
    await saveProductSession({
      userId: "user-1",
      displayName: "Alex Reed",
      accessToken: "token-test",
      handle: "alex",
    });
    const loaded = await loadProductSession();
    expect(loaded?.userId).toBe("user-1");
    expect(loaded?.displayName).toBe("Alex Reed");
    expect(loaded?.accessToken).toBe("token-test");
  });

  it("clears session completely", async () => {
    await saveProductSession({
      userId: "user-1",
      displayName: "Alex Reed",
      accessToken: "token-test",
    });
    await clearProductSession();
    expect(await loadProductSession()).toBeNull();
  });

  it("minimization evidence never includes unselected values", () => {
    const e = buildMinimizationEvidence(42, 1, 1);
    expect(e.local_contacts_loaded).toBe(42);
    expect(e.selected_contacts).toBe(1);
    expect(e.selected_phone_values_submitted).toBe(1);
    expect(e.unselected_phone_values_submitted).toBe(0);
  });
});
