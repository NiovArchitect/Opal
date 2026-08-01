export const PROHIBITED_ONBOARDING_COPY = [
  /uses opal/i,
  /does not use opal/i,
  /people you may know/i,
  /full address book/i,
  /legal identity verified/i,
  /government id/i,
  /contact score/i,
  /popularity/i,
];

export function isProhibitedOnboardingCopy(text: string): boolean {
  return PROHIBITED_ONBOARDING_COPY.some((p) => p.test(text));
}

export function matchDoesNotCreateRelationship(): boolean {
  return true;
}

export function silenceIsNotAcceptance(): boolean {
  return true;
}

export function fullAddressBookUploadProhibited(): boolean {
  return true;
}

export function verificationNotLegalIdentity(): boolean {
  return true;
}
