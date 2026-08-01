export type GroupResponseState =
  | "accepted"
  | "declined"
  | "tentative"
  | "abstained"
  | "unavailable"
  | "withdrawn";

export type ParticipationSummary = {
  accepted_count: number;
  tentative_count: number;
  silent_required_count: number;
  copy: string;
  everyone_agreed: boolean;
  majority_is_not_consensus: boolean;
};

export const PROHIBITED_GROUP_COPY = [
  /holding the group back/i,
  /is unreliable/i,
  /contributes the most/i,
  /cooperation score/i,
  /less committed/i,
  /\d+%\s*complete/i,
  /social score/i,
];

export function isProhibitedGroupCopy(text: string): boolean {
  return PROHIBITED_GROUP_COPY.some((p) => p.test(text));
}

/** Never treat silence or tentative as full agreement. */
export function canClaimEveryoneAgreed(s: ParticipationSummary): boolean {
  return (
    s.everyone_agreed === true &&
    s.tentative_count === 0 &&
    s.silent_required_count === 0
  );
}

export function formatReadiness(completed: number, pending: number): string {
  if (pending === 0 && completed > 0) {
    return "Everything needed for this plan is handled.";
  }
  return `${completed} items are handled. ${pending} remain.`;
}
