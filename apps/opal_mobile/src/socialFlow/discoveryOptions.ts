export type SponsorshipState = "organic" | "sponsored";

export type DiscoveryOption = {
  id: string;
  display_name: string;
  category?: string;
  price_band?: string;
  travel_estimate?: string;
  sponsorship_state: SponsorshipState;
  sponsored_label?: string | null;
  accessibility_label: string;
  explanation?: string;
  availability_state?: string;
  availability_guaranteed: boolean;
  hard_constraint_pass: boolean;
};

export const PROHIBITED_DISCOVERY_COPY = [
  /surge/i,
  /only \d+ left/i,
  /act now/i,
  /social score/i,
  /you need a relaxing date/i,
  /limited time offer/i,
];

export function isProhibitedDiscoveryCopy(text: string): boolean {
  return PROHIBITED_DISCOVERY_COPY.some((p) => p.test(text));
}

export function sponsorshipAnnouncement(o: DiscoveryOption): string {
  if (o.sponsorship_state === "sponsored") {
    return `${o.display_name}, Sponsored`;
  }
  return o.display_name;
}

export function canSelectOption(o: DiscoveryOption): boolean {
  return o.hard_constraint_pass === true && o.availability_state !== "stale";
}

export function filterHiddenSponsored(
  options: DiscoveryOption[],
  hideSponsored: boolean,
): DiscoveryOption[] {
  if (!hideSponsored) return options;
  return options.filter((o) => o.sponsorship_state !== "sponsored");
}

export function formatNoMatchCopy(): string {
  return "I couldn’t find an option that satisfies every requirement.";
}
