import type { PrimaryTab } from "./types";

export const PRIMARY_TABS: { id: PrimaryTab; label: string; a11y: string }[] = [
  { id: "home", label: "Home", a11y: "Home, social orientation" },
  { id: "chats", label: "Chats", a11y: "Chats, conversations" },
  { id: "plans", label: "Plans", a11y: "Plans, upcoming journeys" },
  { id: "you", label: "You", a11y: "You, account privacy and safety" },
];

/** Destinations that must not be primary tabs. */
export const NOT_PRIMARY_TABS = [
  "signals",
  "reminders",
  "approvals",
  "memories",
  "safety",
  "family",
  "discovery",
  "traditions",
  "devices",
  "ai",
] as const;

export function isPrimaryTab(id: string): id is PrimaryTab {
  return PRIMARY_TABS.some((t) => t.id === id);
}
