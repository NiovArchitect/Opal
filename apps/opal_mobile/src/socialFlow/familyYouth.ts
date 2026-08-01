export const PROHIBITED_FAMILY_COPY = [
  /strict parent/i,
  /behavior score/i,
  /obedience/i,
  /tracking your child/i,
  /live location/i,
  /find friends nearby/i,
];

export function isProhibitedFamilyCopy(text: string): boolean {
  return PROHIBITED_FAMILY_COPY.some((p) => p.test(text));
}

export function silenceIsNotApproval(status: string): boolean {
  return status === "pending_review" || status === "needs_details";
}

export function youthPrivateReminderGuardianSees(): boolean {
  return false;
}

export function deviceRevokeKeepsHumanIdentity(): boolean {
  return true;
}
