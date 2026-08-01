import { buildHomeSnapshot, completeNeedsYouItem, MAX_NEEDS_YOU } from "../shell/homeModel";
import type { NeedsYouItem } from "../shell/types";

export function generateNeedsYouCandidates(count: number, ownerPrefix = "ny"): NeedsYouItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${ownerPrefix}-${i}`,
    source_type: i % 5 === 0 ? "due_reminder" : "needs_answer",
    title: `Candidate ${i}`,
    explanation: `Synthetic need ${i}`,
    primary_action: "Open",
    privacy_class: "private",
  }));
}

export function homeTortureScenario() {
  const many = generateNeedsYouCandidates(100);
  const home = buildHomeSnapshot({
    displayName: "Alex",
    needsYou: many,
    comingUp: [],
    hourUTC: 18,
  });
  if (home.needs_you.length > MAX_NEEDS_YOU) {
    throw new Error("NEEDS_YOU_OVERFLOW");
  }

  // Complete all visible → quiet success
  let remaining = [...home.needs_you];
  for (const item of home.needs_you) {
    remaining = completeNeedsYouItem(remaining, item.id);
  }
  const quiet = buildHomeSnapshot({
    displayName: "Alex",
    needsYou: remaining,
    comingUp: [],
    hourUTC: 18,
  });
  if (!quiet.quiet_success) throw new Error("QUIET_SUCCESS_MISSING");

  // Duplicate titles still capped
  const dups = [
    ...generateNeedsYouCandidates(3, "a"),
    ...generateNeedsYouCandidates(3, "b"),
  ];
  const home2 = buildHomeSnapshot({
    displayName: "Alex",
    needsYou: dups,
    comingUp: [],
  });
  if (home2.needs_you.length > MAX_NEEDS_YOU) {
    throw new Error("NEEDS_YOU_OVERFLOW_DUP");
  }

  return {
    capped: home.needs_you.length,
    quiet: quiet.quiet_success,
    emptyCopy: quiet.needs_you_empty_copy,
  };
}
