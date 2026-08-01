export type MeaningInsight = {
  id: string;
  insightType: string;
  copy: string;
  privacyClass: "private";
  suggestedDraft?: string | null;
  evidenceMessageIds: string[];
  uncertainty: string[];
  actions: { id: string; label: string }[];
};

export const MEANING_EMPTY = "Nothing needs clarification right now.";

export const PROHIBITED_MEANING_COPY = [
  /relationship score/i,
  /is angry with you/i,
  /does not respect you/i,
  /is manipulating you/i,
  /\d+%\s*emotionally/i,
  /attachment style/i,
  /personality disorder/i,
];

export function isProhibitedMeaningCopy(text: string): boolean {
  return PROHIBITED_MEANING_COPY.some((p) => p.test(text));
}

/** Pre-send assist is private and never auto-sends. */
export function preSendActions(): { id: string; label: string }[] {
  return [
    { id: "help_answer", label: "Help me answer clearly" },
    { id: "send_as_written", label: "Send as written" },
    { id: "dismiss", label: "Dismiss" },
  ];
}

export type DecisionSummaryView = {
  confirmed: { text: string }[];
  stillOpen: { text: string }[];
  handled: { text: string }[];
};

export function formatDecisionSummary(s: DecisionSummaryView): string {
  const lines: string[] = [];
  if (s.confirmed.length) {
    lines.push("Confirmed:");
    for (const c of s.confirmed) lines.push(`• ${c.text}`);
  }
  if (s.stillOpen.length) {
    lines.push("Still open:");
    for (const c of s.stillOpen) lines.push(`• ${c.text}`);
  }
  if (s.handled.length) {
    lines.push("Handled:");
    for (const c of s.handled) lines.push(`• ${c.text}`);
  }
  return lines.join("\n") || MEANING_EMPTY;
}
