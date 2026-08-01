import {
  isProhibitedMeaningCopy,
  formatDecisionSummary,
  preSendActions,
} from "../socialFlow/meaningAssist";

describe("meaningAssist", () => {
  test("rejects diagnostic and score language", () => {
    expect(isProhibitedMeaningCopy("Jordan asked a question.")).toBe(false);
    expect(isProhibitedMeaningCopy("She is angry with you")).toBe(true);
    expect(isProhibitedMeaningCopy("relationship score: 12")).toBe(true);
    expect(isProhibitedMeaningCopy("74% emotionally distant")).toBe(true);
  });

  test("pre-send actions never include auto-send", () => {
    const ids = preSendActions().map((a) => a.id);
    expect(ids).toContain("help_answer");
    expect(ids).toContain("send_as_written");
    expect(ids).not.toContain("auto_send");
  });

  test("formats decision summary sections", () => {
    const text = formatDecisionSummary({
      confirmed: [{ text: "Thursday at 7:30 PM" }],
      stillOpen: [{ text: "Location unresolved" }],
      handled: [{ text: "Reservation is booked" }],
    });
    expect(text).toContain("Confirmed:");
    expect(text).toContain("7:30");
    expect(text).toContain("Still open:");
    expect(text).not.toContain("private reminder");
  });
});
