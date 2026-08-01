import {
  blockWorksWithoutReport,
  deviceRevokePreservesHumanIdentity,
  isProhibitedSafetyCopy,
  reporterIdentityHiddenFromSubject,
} from "../socialFlow/trustSafety";

describe("trustSafety", () => {
  test("blocks retaliatory and scoring copy", () => {
    expect(isProhibitedSafetyCopy("Access stopped.")).toBe(false);
    expect(isProhibitedSafetyCopy("You have been reported by Olivia")).toBe(true);
    expect(isProhibitedSafetyCopy("danger score")).toBe(true);
  });

  test("block and report are independent", () => {
    expect(blockWorksWithoutReport()).toBe(true);
  });

  test("reporter confidentiality", () => {
    expect(reporterIdentityHiddenFromSubject()).toBe(true);
  });

  test("device revoke keeps human identity", () => {
    expect(deviceRevokePreservesHumanIdentity()).toBe(true);
  });
});
