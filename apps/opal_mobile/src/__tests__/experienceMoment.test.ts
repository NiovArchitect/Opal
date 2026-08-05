/**
 * Phase 1–2: mobile shares the conversation-scoped moment contract.
 * Phase 2 adds durable fields (opportunityId, expiry, private participation, correction).
 * No friendship scores, no chat-participant AI, no private budget copy.
 */

type ExperienceMoment = {
  kind: "opal_experience_moment";
  headline: string;
  primaryOption: string | null;
  actions: string[];
  opportunityId?: string | null;
  expiresAt?: string | null;
  privateParticipation?: { state: string; privateReason?: string | null } | null;
  notAChatParticipant: true;
};

type QuietOpportunity = {
  kind: "quiet";
  quiet: true;
  opportunity: null;
  notAChatParticipant: true;
};

type Correction = {
  kind: string;
  globalLabel: false;
  friendshipScoreChange: false;
};

function project(primaryOption: string | null): ExperienceMoment {
  return {
    kind: "opal_experience_moment",
    headline: "This could work for the three of you.",
    primaryOption,
    actions: ["interested", "not_this_time", "see_why", "keep_private"],
    opportunityId: "opp-1",
    expiresAt: "2026-08-08T00:00:00Z",
    privateParticipation: { state: "undecided", privateReason: null },
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
    expect(moment.opportunityId).toBeTruthy();
    expect(moment.expiresAt).toBeTruthy();
  });

  it("quiet ordinary path has no moment", () => {
    const quiet: ExperienceMoment | null = null;
    expect(quiet).toBeNull();
  });

  it("supports quiet durable payload and correction contract", () => {
    const quiet: QuietOpportunity = {
      kind: "quiet",
      quiet: true,
      opportunity: null,
      notAChatParticipant: true,
    };
    expect(quiet.opportunity).toBeNull();

    const correction: Correction = {
      kind: "suppress_group_context",
      globalLabel: false,
      friendshipScoreChange: false,
    };
    expect(correction.globalLabel).toBe(false);
    expect(correction.friendshipScoreChange).toBe(false);
  });
});
