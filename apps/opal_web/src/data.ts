/** Conversation data for the public product shell: socially fluent, high-signal. */

export type SignalKind =
  | "open_loop"
  | "plan_forming"
  | "ready"
  | "follow_through"
  | "moment"
  /** Shared-safe availability overlap — recognition, never completion/Set. */
  | "availability_overlap"
  /** Option surfaced alias for multi-range recognition (same color family). */
  | "option_surfaced"
  /** Authoritative Set only — completion emerald reserved for this kind. */
  | "set";

export type ChatPreview = {
  id: string;
  name: string;
  preview: string;
  /** Contextual social line under name in thread header. */
  contextLine?: string;
  time: string;
  unread?: number;
  muted?: boolean;
  signal?: SignalKind;
  /** Human shared-reality line — never internal "Set" / "Still open". */
  signalLabel?: string;
};

export type Message = {
  id: string;
  from: "me" | "them";
  body: string;
  time: string;
  /** Authoritative server sequence for ordering and history:sync. */
  serverSeq?: number;
  clientMessageId?: string;
  /** Optional inline social signal attached to a message turn. */
  signal?: {
    kind: SignalKind;
    label: string;
  };
  /** Opal chronological filament (not a human bubble). */
  opalFilament?: boolean;
  /** Private-to-viewer Opal moment (violet treatment). */
  opalPrivate?: boolean;
};

export type NeedItem = {
  id: string;
  title: string;
  detail: string;
  chatId?: string;
};

export type PlanItem = {
  id: string;
  title: string;
  when: string;
  who: string;
  where?: string;
  status: "upcoming" | "today" | "needs_you";
  chatId?: string;
};

/**
 * Demo previews for unauthenticated shell only.
 * Labels describe shared reality (who/what/when/where), not stage inventory.
 */
export const CHATS: ChatPreview[] = [
  {
    id: "jordan",
    name: "Jordan Lee",
    preview: "I'm free after 6:30. Does Thursday work?",
    contextLine: undefined,
    time: "2:14 PM",
    unread: 1,
    signal: "open_loop",
    // Time known, place open — forming, not fully arranged.
    signalLabel: "Dinner · Thursday · after 6:30",
  },
  {
    id: "group",
    name: "Saturday dinner",
    preview: "Maya: I can do after 7 if that helps",
    contextLine: "Maya, Chris, Jordan · 4 people",
    time: "11:40 AM",
    signal: "open_loop",
    // Venue mentioned in thread — still confirmation path in demo.
    signalLabel: "Dinner · Saturday · Harbor Table",
  },
  {
    id: "marcus",
    name: "Marcus Carter",
    preview: "Pickup is confirmed for 5:00 PM",
    contextLine: undefined,
    time: "Yesterday",
    signal: "ready",
    signalLabel: "Pickup · Today · 5:00 PM",
  },
  {
    id: "evelyn",
    name: "Evelyn Carter",
    preview: "I'll grab the gift on the way",
    contextLine: undefined,
    time: "Yesterday",
    signal: "follow_through",
    signalLabel: "Gift on the way",
  },
  {
    id: "maya",
    name: "Maya Chen",
    preview: "See you at Harbor Table",
    contextLine: undefined,
    time: "Mon",
    signal: "moment",
    signalLabel: "Harbor Table · shared moment",
  },
  {
    id: "quiet",
    name: "Sam Rivera",
    preview: "Hope your morning is calm.",
    contextLine: undefined,
    time: "Sun",
    // No signal: ordinary conversation stays quiet.
  },
];

export const THREADS: Record<string, Message[]> = {
  jordan: [
    {
      id: "j1",
      from: "me",
      body: "We should get dinner next Thursday.",
      time: "2:08 PM",
      signal: { kind: "plan_forming", label: "Dinner · Thursday · forming" },
    },
    {
      id: "j2",
      from: "them",
      body: "I'm free after 6:30. Does Thursday work?",
      time: "2:14 PM",
      signal: { kind: "open_loop", label: "Dinner · Thursday · after 6:30" },
    },
  ],
  group: [
    {
      id: "g1",
      from: "them",
      body: "Saturday after 7 might work for everyone.",
      time: "11:22 AM",
    },
    {
      id: "g2",
      from: "me",
      body: "Harbor Table still open if we want a table.",
      time: "11:31 AM",
      signal: { kind: "open_loop", label: "Dinner · Saturday · Harbor Table" },
    },
    {
      id: "g3",
      from: "them",
      body: "I can do after 7 if that helps",
      time: "11:40 AM",
    },
  ],
  quiet: [
    {
      id: "q1",
      from: "them",
      body: "Hope your morning is calm.",
      time: "Sun",
    },
    {
      id: "q2",
      from: "me",
      body: "Thank you. Quiet day here too.",
      time: "Sun",
    },
  ],
  marcus: [
    {
      id: "m1",
      from: "them",
      body: "Practice ends closer to 5 today.",
      time: "Yesterday",
    },
    {
      id: "m2",
      from: "me",
      body: "I'll be there. Pickup at 5:00 PM.",
      time: "Yesterday",
    },
    {
      id: "m3",
      from: "them",
      body: "Pickup is confirmed for 5:00 PM",
      time: "Yesterday",
      signal: { kind: "ready", label: "Pickup · 5:00 PM" },
    },
  ],
  evelyn: [
    {
      id: "e1",
      from: "them",
      body: "I'll grab the gift on the way",
      time: "Yesterday",
      signal: { kind: "follow_through", label: "Gift on the way" },
    },
  ],
  maya: [
    {
      id: "y1",
      from: "me",
      body: "See you at Harbor Table",
      time: "Mon",
    },
    {
      id: "y2",
      from: "them",
      body: "See you at Harbor Table",
      time: "Mon",
      signal: { kind: "moment", label: "Harbor Table · shared moment" },
    },
  ],
};

/** Needs you: consequential human decisions only — not every signal. */
export const INITIAL_NEEDS: NeedItem[] = [
  {
    id: "n1",
    title: "Dinner with Jordan",
    detail: "Thursday after 6:30 works · need a place",
    chatId: "jordan",
  },
];

/** Plans: usable / strongly converging shared realities only. */
export const PLANS: PlanItem[] = [
  {
    id: "p1",
    title: "Dinner with Jordan",
    when: "Thursday · after 6:30",
    who: "Jordan Lee",
    where: undefined,
    status: "needs_you",
    chatId: "jordan",
  },
  {
    id: "p2",
    title: "Dinner with friends",
    when: "Saturday · after 7",
    who: "Maya, Chris, Jordan · 4 people",
    where: "Harbor Table",
    status: "upcoming",
    chatId: "group",
  },
  {
    id: "p3",
    title: "School pickup",
    when: "Today · 5:00 PM",
    who: "Marcus · Olivia",
    status: "today",
    chatId: "marcus",
  },
  {
    id: "p4",
    title: "Coffee with Maya",
    when: "Tuesday · 10:30 AM",
    who: "Maya Chen",
    where: "Harbor Table",
    status: "upcoming",
    chatId: "maya",
  },
];
