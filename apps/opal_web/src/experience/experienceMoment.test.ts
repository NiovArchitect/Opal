import { describe, expect, it } from "vitest";
import {
  fromApiOpportunity,
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
    expect(moment.headline).toBe("This could work for the three of you.");
    expect(moment.supportingExplanation).toMatch(/timing and what has been shared/i);
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

  it("maps durable API quiet payload", () => {
    const quiet = fromApiOpportunity({
      kind: "quiet",
      quiet: true,
      conversation_id: "c1",
    });
    expect(quiet).toMatchObject({ kind: "quiet", quiet: true, opportunity: null });
  });

  it("maps durable API opportunity payload with expiry and private participation", () => {
    const moment = fromApiOpportunity({
      kind: "opal_experience_moment",
      conversation_id: "c1",
      opportunity_id: "o1",
      headline: "This could work for the three of you.",
      primary_option: "Quiet bistro fixture",
      supporting_explanation: "It fits everyone’s timing and what has been shared.",
      see_why: "Quieter than the other options.",
      journey_state: "forming",
      expires_at: "2026-08-08T00:00:00Z",
      private_participation: { state: "interested", private_reason: null },
      not_a_chat_participant: true,
    });
    expect(moment && "kind" in moment && moment.kind).toBe("opal_experience_moment");
    if (moment && moment.kind === "opal_experience_moment") {
      expect(moment.opportunityId).toBe("o1");
      expect(moment.expiresAt).toBe("2026-08-08T00:00:00Z");
      expect(moment.privateParticipation?.state).toBe("interested");
      expect(moment.notAChatParticipant).toBe(true);
    }
  });
});
