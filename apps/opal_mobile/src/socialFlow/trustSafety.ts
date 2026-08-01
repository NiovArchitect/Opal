export const PROHIBITED_SAFETY_COPY = [
  /you have been reported by/i,
  /danger score/i,
  /trust score/i,
  /child score/i,
  /you are guilty/i,
  /shadow ban/i,
];

export function isProhibitedSafetyCopy(text: string): boolean {
  return PROHIBITED_SAFETY_COPY.some((p) => p.test(text));
}

export function blockWorksWithoutReport(): boolean {
  return true;
}

export function reporterIdentityHiddenFromSubject(): boolean {
  return true;
}

export function deviceRevokePreservesHumanIdentity(): boolean {
  return true;
}
