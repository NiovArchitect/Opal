/**
 * Founder-approved Chats list rows with plan pills (screenshot A).
 * Used as test data and founder-seed visual walk overlay.
 */

import type { ChatsHomeRow } from "./ChatsHome";

export type PlanPillTone = "dinner" | "activity" | "trip" | "live";

export function inferPlanPillTone(label: string): PlanPillTone {
  const s = label.toLowerCase();
  if (/live nearby|live ·|happening now/.test(s)) return "live";
  if (/trip graph|trip\b/.test(s)) return "trip";
  if (/market|coast|hike|walk|activity|gallery|museum/.test(s)) return "activity";
  if (/\d+\s+of\s+\d+\s+going/.test(s)) return "dinner";
  return "dinner";
}

/** Exact five rows from founder screenshot A. */
export const FOUNDER_CHATS_PLAN_PILL_ROWS: ChatsHomeRow[] = [
  {
    id: "seed-chat-chanelle",
    name: "Chanelle",
    kind: "direct",
    preview: "Dinner might work Saturday",
    when: "2m",
    relationshipLabel: "Direct connection",
    planConsequence: {
      state: "ready",
      label: "Juniper & Ivy · 7:30 PM",
      planId: "seed-chanelle-juniper",
      tone: "dinner",
    },
    avatarTone: "#6EE7F5",
  },
  {
    id: "seed-chat-maya",
    name: "Maya",
    kind: "direct",
    preview: "I'm free after 10",
    when: "18m",
    relationshipLabel: "Direct connection",
    planConsequence: {
      state: "ready",
      label: "Farmers market + coast",
      planId: "seed-jordan-market",
      tone: "activity",
    },
    avatarTone: "#E8D6C4",
  },
  {
    id: "seed-chat-juniper-crew",
    name: "Juniper crew",
    kind: "group",
    preview: "I can make 7:30",
    previewSender: "Jordan",
    when: "34m",
    memberCount: 4,
    relationshipLabel: "4 people · Group",
    planConsequence: {
      state: "ready",
      label: "3 of 4 going",
      planId: "seed-chanelle-juniper",
      tone: "dinner",
    },
    avatarTone: "#FFC86B",
  },
  {
    id: "seed-chat-sabrina",
    name: "Sabrina",
    kind: "direct",
    preview: "Sent a photo",
    when: "1h",
    relationshipLabel: "Direct connection",
    planConsequence: {
      state: "action",
      label: "Live nearby",
      planId: "seed-live-sabrina",
      tone: "live",
    },
    avatarTone: "#FF6B9D",
  },
  {
    id: "seed-chat-alex",
    name: "Alex",
    kind: "direct",
    preview: "Mexico City was unreal",
    when: "Yesterday",
    relationshipLabel: "Following + connected",
    planConsequence: {
      state: "ready",
      label: "Trip Graph",
      planId: "seed-alex-graph-gallery",
      tone: "trip",
    },
    avatarTone: "#8B5CF6",
  },
];
