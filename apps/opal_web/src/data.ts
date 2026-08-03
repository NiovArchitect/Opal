/** Conversation data for the public product shell: socially fluent, high-signal. */

export type SignalKind =
  | "open_loop"
  | "plan_forming"
  | "ready"
  | "follow_through"
  | "moment";

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
  status: "upcoming" | "today" | "needs_you";
};

export const CHATS: ChatPreview[] = [
  {
    id: "jordan",
    name: "Jordan Lee",
    preview: "I'm free after 6:30. Does Thursday work?",
    // contextLine is peer/relationship context only — never a permanent identity subtitle.
    contextLine: undefined,
    time: "2:14 PM",
    unread: 1,
    // Journey signal: dynamic, conversation-scoped (Still open after availability reply).
    signal: "open_loop",
    signalLabel: "Still open",
  },
  {
    id: "group",
    name: "Saturday dinner",
    preview: "Maya: I can do after 7 if that helps",
    contextLine: "Maya, Chris, Jordan",
    time: "11:40 AM",
    signal: "open_loop",
    signalLabel: "Still open",
  },
  {
    id: "marcus",
    name: "Marcus Carter",
    preview: "Pickup is confirmed for 5:00 PM",
    contextLine: undefined,
    time: "Yesterday",
    signal: "ready",
    signalLabel: "Ready",
  },
  {
    id: "evelyn",
    name: "Evelyn Carter",
    preview: "I'll grab the gift on the way",
    contextLine: undefined,
    time: "Yesterday",
    // Gift / surprise-sensitive: shared list shows soft follow-through only.
    signal: "follow_through",
    signalLabel: "Follow-through",
  },
  {
    id: "maya",
    name: "Maya Chen",
    preview: "See you at Harbor Table",
    contextLine: undefined,
    time: "Mon",
    signal: "moment",
    signalLabel: "Shared moment",
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
      signal: { kind: "plan_forming", label: "Becoming a plan" },
    },
    {
      id: "j2",
      from: "them",
      body: "I'm free after 6:30. Does Thursday work?",
      time: "2:14 PM",
      // Transition: availability softens the signal to "Still open".
      signal: { kind: "open_loop", label: "Still open" },
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
      signal: { kind: "open_loop", label: "Still open" },
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
      signal: { kind: "ready", label: "Ready" },
    },
  ],
  evelyn: [
    {
      id: "e1",
      from: "them",
      body: "I'll grab the gift on the way",
      time: "Yesterday",
      signal: { kind: "follow_through", label: "Follow-through" },
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
      signal: { kind: "moment", label: "Shared moment" },
    },
  ],
};

export const INITIAL_NEEDS: NeedItem[] = [
  {
    id: "n1",
    title: "Book the restaurant",
    detail: "Thursday dinner with Jordan still needs a reservation.",
    chatId: "jordan",
  },
  {
    id: "n2",
    title: "Jordan asked which area works best",
    detail: "Reply so you can lock a place.",
    chatId: "jordan",
  },
];

export const PLANS: PlanItem[] = [
  {
    id: "p1",
    title: "Dinner with Jordan",
    when: "Thursday · 7:00 PM",
    who: "Jordan Lee",
    status: "upcoming",
  },
  {
    id: "p2",
    title: "Saturday dinner",
    when: "Saturday · after 7:00 PM",
    who: "Maya, Chris, Jordan",
    status: "needs_you",
  },
  {
    id: "p3",
    title: "School pickup",
    when: "Today · 5:00 PM",
    who: "Marcus · Olivia",
    status: "today",
  },
];
