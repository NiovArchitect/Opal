/**
 * Conversation-scoped experience moment projection (Phase 1–2).
 * Not a chat participant. No scores, budget, or location details.
 * Phase 2: durable API shapes, quiet-null, correction, expiry contracts.
 */

export type ExperienceAction =
  | "interested"
  | "not_this_time"
  | "see_why"
  | "keep_private";

export type ExperienceMoment = {
  kind: "opal_experience_moment";
  conversationId: string;
  opportunityId?: string | null;
  headline: string;
  primaryOption: string | null;
  supportingExplanation: string;
  seeWhy: string;
  actions: ExperienceAction[];
  journeyState: string;
  participationSummary: string | null;
  privateParticipation?: {
    state: string;
    privateReason?: string | null;
    respondedAt?: string | null;
  } | null;
  expiresAt?: string | null;
  status?: string | null;
  /** Always true: never render as a human bubble or third participant. */
  notAChatParticipant: true;
  surface: "conversation_experience";
  quiet?: false;
};

export type QuietOpportunity = {
  kind: "quiet";
  conversationId: string;
  quiet: true;
  reason?: string;
  opportunity: null;
  notAChatParticipant: true;
};

const FORBIDDEN = [
  "budget",
  "cannot afford",
  "can't afford",
  "max_price",
  "price_band",
  "sensory",
  "sensitivity",
  "exact location",
  "fit_score",
  "friend score",
  "gps",
  "coordinate",
];

export function isExperienceMomentSafe(moment: ExperienceMoment): boolean {
  const blob = JSON.stringify(moment).toLowerCase();
  return !FORBIDDEN.some((token) => blob.includes(token));
}

export function projectExperienceMoment(input: {
  conversationId: string;
  opportunityId?: string | null;
  headline?: string;
  primaryOption?: string | null;
  supportingExplanation?: string;
  seeWhy?: string;
  journeyState?: string;
  participationSummary?: string | null;
  privateParticipation?: ExperienceMoment["privateParticipation"];
  expiresAt?: string | null;
  status?: string | null;
}): ExperienceMoment {
  const moment: ExperienceMoment = {
    kind: "opal_experience_moment",
    conversationId: input.conversationId,
    opportunityId: input.opportunityId ?? null,
    headline: input.headline ?? "This looks promising for the three of you.",
    primaryOption: input.primaryOption ?? null,
    supportingExplanation:
      input.supportingExplanation ??
      "Works with everyone’s timing and current preferences.",
    seeWhy:
      input.seeWhy ??
      "Fits everyone’s current timing. Convenient for the people involved.",
    actions: ["interested", "not_this_time", "see_why", "keep_private"],
    journeyState: input.journeyState ?? "forming",
    participationSummary: input.participationSummary ?? null,
    privateParticipation: input.privateParticipation ?? null,
    expiresAt: input.expiresAt ?? null,
    status: input.status ?? null,
    notAChatParticipant: true,
    surface: "conversation_experience",
    quiet: false,
  };

  if (!isExperienceMomentSafe(moment)) {
    return {
      ...moment,
      supportingExplanation:
        "Works with everyone’s timing and current preferences.",
      seeWhy: "Fits everyone’s current timing. Convenient for the people involved.",
    };
  }

  return moment;
}

/** Map durable API opportunity payload to moment or quiet. */
export function fromApiOpportunity(
  payload: Record<string, unknown> | null | undefined
): ExperienceMoment | QuietOpportunity | null {
  if (!payload) return quietExperienceState();
  if (payload.quiet === true || payload.kind === "quiet") {
    return {
      kind: "quiet",
      conversationId: String(payload.conversation_id || payload.conversationId || ""),
      quiet: true,
      reason: payload.reason ? String(payload.reason) : undefined,
      opportunity: null,
      notAChatParticipant: true,
    };
  }

  return projectExperienceMoment({
    conversationId: String(payload.conversation_id || payload.conversationId || ""),
    opportunityId: payload.opportunity_id
      ? String(payload.opportunity_id)
      : null,
    headline: payload.headline ? String(payload.headline) : undefined,
    primaryOption: payload.primary_option
      ? String(payload.primary_option)
      : null,
    supportingExplanation: payload.supporting_explanation
      ? String(payload.supporting_explanation)
      : undefined,
    seeWhy: payload.see_why ? String(payload.see_why) : undefined,
    journeyState: payload.journey_state ? String(payload.journey_state) : undefined,
    participationSummary: payload.participation_summary
      ? String(payload.participation_summary)
      : null,
    expiresAt: payload.expires_at ? String(payload.expires_at) : null,
    status: payload.status ? String(payload.status) : null,
    privateParticipation: payload.private_participation
      ? {
          state: String(
            (payload.private_participation as { state?: string }).state ||
              "undecided"
          ),
          privateReason:
            (payload.private_participation as { private_reason?: string | null })
              .private_reason ?? null,
          respondedAt:
            (payload.private_participation as { responded_at?: string | null })
              .responded_at ?? null,
        }
      : null,
  });
}

/** Quiet state: no glow placeholder, no generated plan. */
export function quietExperienceState(): null {
  return null;
}

export type CorrectionPayload = {
  text: string;
};

export type ParticipationPayload = {
  action: ExperienceAction | "maybe" | "ask_later";
  privateReason?: string;
};
