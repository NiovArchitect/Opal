import {
  deviceRevokeKeepsHumanIdentity,
  isProhibitedFamilyCopy,
  silenceIsNotApproval,
  youthPrivateReminderGuardianSees,
} from "../socialFlow/familyYouth";

describe("familyYouth", () => {
  test("blocks surveillance and scoring copy", () => {
    expect(isProhibitedFamilyCopy("Pickup confirmed for 5:00 PM.")).toBe(false);
    expect(isProhibitedFamilyCopy("tracking your child")).toBe(true);
    expect(isProhibitedFamilyCopy("behavior score")).toBe(true);
  });

  test("silence is not approval", () => {
    expect(silenceIsNotApproval("pending_review")).toBe(true);
    expect(silenceIsNotApproval("approved")).toBe(false);
  });

  test("private youth reminder not guardian-visible by default", () => {
    expect(youthPrivateReminderGuardianSees()).toBe(false);
  });

  test("device revoke keeps human identity", () => {
    expect(deviceRevokeKeepsHumanIdentity()).toBe(true);
  });
});
