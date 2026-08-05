/**
 * Conversation-scoped experience moment projection (Phase 1).
 * Not a chat participant. No scores, budget, or location details.
 */

export type ExperienceAction =
  | "interested"
  | "not_this_time"
  | "see_why"
  | "keep_private";

export type ExperienceMoment = {
  kind: "opal_experience_moment";
  conversationId: string;
  headline: string;
  primaryOption: string | null;
  supportingExplanation: string;
  seeWhy: string;
  actions: ExperienceAction[];
  journeyState: string;
  participationSummary: string | null;
  /** Always true: never render as a human bubble or third participant. */
  notAChatParticipant: true;
  surface: "conversation_experience";
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
  headline?: string;
  primaryOption?: string | null;
  supportingExplanation?: string;
  seeWhy?: string;
  journeyState?: string;
  participationSummary?: string | null;
}): ExperienceMoment {
  const moment: ExperienceMoment = {
    kind: "opal_experience_moment",
    conversationId: input.conversationId,
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
    notAChatParticipant: true,
    surface: "conversation_experience",
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

/** Quiet state: no glow placeholder, no generated plan. */
export function quietExperienceState(): null {
  return null;
}
