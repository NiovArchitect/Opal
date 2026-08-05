import { describe, expect, it } from "vitest";
import {
  isExperienceMomentSafe,
  projectExperienceMoment,
  quietExperienceState,
} from "./experienceMoment";

describe("experienceMoment", () => {
  it("projects a conversation-scoped Opal moment without chat persona", () => {
    const moment = projectExperienceMoment({
      conversationId: "bddddddd-dddd-4ddd-8ddd-dddddddddddd",
      primaryOption: "Quiet bistro fixture",
      seeWhy: "Quieter than the other options. Convenient for the people involved.",
    });

    expect(moment.kind).toBe("opal_experience_moment");
    expect(moment.notAChatParticipant).toBe(true);
    expect(moment.surface).toBe("conversation_experience");
    expect(moment.primaryOption).toBe("Quiet bistro fixture");
    expect(moment.actions).toEqual([
      "interested",
      "not_this_time",
      "see_why",
      "keep_private",
    ]);
    expect(isExperienceMomentSafe(moment)).toBe(true);
  });

  it("quiet state is null with no placeholder", () => {
    expect(quietExperienceState()).toBeNull();
  });

  it("sanitizes unsafe private language in explanations", () => {
    const moment = projectExperienceMoment({
      conversationId: "conv",
      supportingExplanation: "User C cannot afford the alternatives.",
      seeWhy: "budget threshold",
    });
    expect(isExperienceMomentSafe(moment)).toBe(true);
    expect(moment.supportingExplanation.toLowerCase()).not.toContain("cannot afford");
    expect(moment.seeWhy.toLowerCase()).not.toContain("budget");
  });
});
