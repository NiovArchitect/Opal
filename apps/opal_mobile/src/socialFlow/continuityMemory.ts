export type MemoryClass =
  | "private"
  | "shared_relationship"
  | "group"
  | "plan_carry_forward"
  | "ephemeral";

export const PROHIBITED_CONTINUITY_COPY = [
  /relationship score/i,
  /keep the tradition alive/i,
  /losing touch/i,
  /social anxiety/i,
  /always prefers/i,
  /you have been inactive/i,
  /on this day/i,
];

export function isProhibitedContinuityCopy(text: string): boolean {
  return PROHIBITED_CONTINUITY_COPY.some((p) => p.test(text));
}

export function silenceIsNotConsent(accepted: number, required: number): boolean {
  return accepted < required;
}

export function formatSharedMemoryPrompt(summary: string): string {
  return summary;
}

export function traditionAllowsSkip(): boolean {
  return true;
}
