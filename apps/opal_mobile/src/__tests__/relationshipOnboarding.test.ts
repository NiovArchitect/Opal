import {
  fullAddressBookUploadProhibited,
  isProhibitedOnboardingCopy,
  matchDoesNotCreateRelationship,
  silenceIsNotAcceptance,
  verificationNotLegalIdentity,
} from '../socialFlow/relationshipOnboarding';

describe('relationshipOnboarding', () => {
  it('blocks membership-oracle and discovery copy', () => {
    expect(isProhibitedOnboardingCopy('Jordan uses Opal')).toBe(true);
    expect(isProhibitedOnboardingCopy('people you may know')).toBe(true);
    expect(isProhibitedOnboardingCopy('legal identity verified')).toBe(true);
    expect(isProhibitedOnboardingCopy('Invite Jordan to connect.')).toBe(false);
  });

  it('enforces onboarding principles', () => {
    expect(matchDoesNotCreateRelationship()).toBe(true);
    expect(silenceIsNotAcceptance()).toBe(true);
    expect(fullAddressBookUploadProhibited()).toBe(true);
    expect(verificationNotLegalIdentity()).toBe(true);
  });
});
