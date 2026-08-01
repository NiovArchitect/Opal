import type { ComingUpItem, HomeSnapshot, NeedsYouItem } from "./types";
import { isProhibitedShellCopy } from "./signals";

export const NEEDS_YOU_EMPTY = "Nothing needs you right now.";
export const MAX_NEEDS_YOU = 3;

export function buildHomeSnapshot(input: {
  displayName: string;
  needsYou: NeedsYouItem[];
  comingUp: ComingUpItem[];
  recentChanges?: HomeSnapshot["recent_changes"];
  roleKind?: string;
  connectionState?: string;
  hourUTC?: number;
}): HomeSnapshot {
  const hour = input.hourUTC ?? new Date().getUTCHours();
  const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const needs = input.needsYou
    .filter((n) => !isProhibitedShellCopy(n.title) && !isProhibitedShellCopy(n.explanation))
    .slice(0, MAX_NEEDS_YOU);
  const empty = needs.length === 0;

  return {
    greeting: `${part}, ${input.displayName}.`,
    needs_you: needs,
    needs_you_empty_copy: empty ? NEEDS_YOU_EMPTY : null,
    coming_up: input.comingUp,
    recent_changes: input.recentChanges ?? [],
    quiet_success: empty,
    connection_state: input.connectionState ?? "online",
    role_context: { kind: input.roleKind ?? "adult" },
    no_engagement_counts: true,
    no_relationship_ranking: true,
    no_streaks: true,
  };
}

export function completeNeedsYouItem(
  items: NeedsYouItem[],
  id: string,
): NeedsYouItem[] {
  return items.filter((i) => i.id !== id);
}
