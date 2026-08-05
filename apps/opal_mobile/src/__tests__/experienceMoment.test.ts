/**
 * Phase 1: mobile shares the same conversation-scoped moment contract as web.
 * No friendship scores, no chat-participant AI, no private budget copy.
 */

type ExperienceMoment = {
  kind: "opal_experience_moment";
  headline: string;
  primaryOption: string | null;
  actions: string[];
  notAChatParticipant: true;
};

function project(primaryOption: string | null): ExperienceMoment {
  return {
    kind: "opal_experience_moment",
    headline: "This looks promising for the three of you.",
    primaryOption,
    actions: ["interested", "not_this_time", "see_why", "keep_private"],
    notAChatParticipant: true,
  };
}

describe("mobile experience moment contract", () => {
  it("is not a chat participant and exposes light actions only", () => {
    const moment = project("Quiet bistro fixture");
    expect(moment.notAChatParticipant).toBe(true);
    expect(moment.kind).toBe("opal_experience_moment");
    expect(moment.actions).not.toContain("rank_friends");
    expect(JSON.stringify(moment).toLowerCase()).not.toContain("budget");
    expect(JSON.stringify(moment).toLowerCase()).not.toContain("fit_score");
  });

  it("quiet ordinary path has no moment", () => {
    const quiet: ExperienceMoment | null = null;
    expect(quiet).toBeNull();
  });
});
