/** Conversation data for the public product shell. */

export type ChatPreview = {
  id: string;
  name: string;
  preview: string;
  time: string;
  unread?: number;
  muted?: boolean;
};

export type Message = {
  id: string;
  from: "me" | "them";
  body: string;
  time: string;
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
    preview: "I'm free after 6:30 — does Thursday work?",
    time: "2:14 PM",
    unread: 1,
  },
  {
    id: "group",
    name: "Saturday dinner",
    preview: "Maya: I can do after 7 if that helps",
    time: "11:40 AM",
  },
  {
    id: "marcus",
    name: "Marcus Carter",
    preview: "Pickup is confirmed for 5:00 PM",
    time: "Yesterday",
  },
  {
    id: "evelyn",
    name: "Evelyn Carter",
    preview: "I'll grab the gift on the way",
    time: "Yesterday",
  },
  {
    id: "maya",
    name: "Maya Chen",
    preview: "See you at Harbor Table",
    time: "Mon",
  },
];

export const THREADS: Record<string, Message[]> = {
  jordan: [
    { id: "j1", from: "me", body: "We should get dinner next Thursday.", time: "2:08 PM" },
    { id: "j2", from: "them", body: "I'm free after 6:30 — does Thursday work?", time: "2:14 PM" },
  ],
  group: [
    { id: "g1", from: "them", body: "Saturday after 7 might work for everyone.", time: "11:22 AM" },
    { id: "g2", from: "me", body: "Harbor Table still open if we want a table.", time: "11:31 AM" },
    { id: "g3", from: "them", body: "I can do after 7 if that helps", time: "11:40 AM" },
  ],
  marcus: [
    { id: "m1", from: "them", body: "Practice ends closer to 5 today.", time: "Yesterday" },
    { id: "m2", from: "me", body: "I'll be there. Pickup at 5:00 PM.", time: "Yesterday" },
    { id: "m3", from: "them", body: "Pickup is confirmed for 5:00 PM", time: "Yesterday" },
  ],
  evelyn: [
    { id: "e1", from: "them", body: "I'll grab the gift on the way", time: "Yesterday" },
  ],
  maya: [
    { id: "y1", from: "me", body: "See you at Harbor Table", time: "Mon" },
    { id: "y2", from: "them", body: "See you at Harbor Table", time: "Mon" },
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
