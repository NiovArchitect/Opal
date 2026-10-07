/**
 * Founder-approved Chats list rows with plan pills (screenshot A).
 * Used as test data and founder-seed visual walk overlay.
 *
 * Seed row ids (`seed-chat-*`) are visual fixtures only. When live API
 * conversations exist, remap onto real ids so openChat / Channel join work.
 */

import type { ChatsHomeRow } from "./ChatsHome";
import { isBadConversationDisplay } from "./realChatPath";

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
    // Preview = last human message in seed thread
    preview: "Perfect — I'll grab a table.",
    when: "2m",
    relationshipLabel: "Direct connection",
    planConsequence: {
      state: "ready",
      // Founder chats-reference: cyan connection label + GOLD plan pill.
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
      planId: "seed-maya-graph-coast",
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

export function isFounderSeedChatId(id: string | null | undefined): boolean {
  return typeof id === "string" && /^seed-chat-/i.test(id.trim());
}

export type LiveChatMatchInput = {
  id: string;
  name: string;
  kind?: "direct" | "group";
  memberCount?: number;
  preview?: string;
  when?: string;
};

function normName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Auth-default / fixture residue — never treat as a real seed person name. */
function isFounderFallbackLabel(name: string | null | undefined): boolean {
  // Includes Founder, Conversation, Direct, empty — same law as conversationDisplayName.
  return isBadConversationDisplay(name);
}

/**
 * Map founder-seed visual rows onto live API conversations by name.
 * Keeps seed plan pills / relationship labels / preview / when / avatar tones —
 * the approved chats-reference chrome. Only the id (and group size) bind to live
 * so openChat / Channel join work. Live previews like "We should do something
 * Italian…" must never overwrite the seed list.
 * Unmatched seed rows stay as seed ids (openChat hydrates locally).
 */
export function remapFounderChatRowsToLive(
  seedRows: ChatsHomeRow[],
  liveChats: LiveChatMatchInput[],
): ChatsHomeRow[] {
  if (!liveChats.length) {
    const out = seedRows.map((r) => ({ ...r }));
    logSeedRemap(seedRows, liveChats, out, "no-live");
    return out;
  }

  const used = new Set<string>();
  const byExact = new Map<string, LiveChatMatchInput[]>();
  for (const live of liveChats) {
    // Skip Founder fallback titles so remap cannot bind seed rows to junk names.
    if (isFounderFallbackLabel(live.name)) continue;
    const key = normName(live.name);
    const bucket = byExact.get(key) || [];
    bucket.push(live);
    byExact.set(key, bucket);
  }

  const takeExact = (name: string, preferKind?: "direct" | "group"): LiveChatMatchInput | null => {
    const bucket = byExact.get(normName(name)) || [];
    const available = bucket.filter((c) => !used.has(c.id));
    if (!available.length) return null;
    const ranked = preferKind
      ? [
          ...available.filter((c) => c.kind === preferKind),
          ...available.filter((c) => c.kind !== preferKind),
        ]
      : available;
    const pick = ranked[0];
    if (!pick) return null;
    used.add(pick.id);
    return pick;
  };

  const takeGroupAlias = (aliases: string[]): LiveChatMatchInput | null => {
    for (const alias of aliases) {
      const hit = takeExact(alias, "group");
      if (hit) return hit;
    }
    // Prefer a multi-member group that includes known crew names in title.
    const crew = liveChats.find(
      (c) =>
        !used.has(c.id) &&
        (c.kind === "group" || (c.memberCount ?? 0) >= 3) &&
        /saturday|juniper|crew/i.test(c.name),
    );
    if (crew) {
      used.add(crew.id);
      return crew;
    }
    return null;
  };

  const out = seedRows.map((seed) => {
    let live: LiveChatMatchInput | null = null;
    if (seed.kind === "group" || /crew|juniper/i.test(seed.name)) {
      live = takeGroupAlias([seed.name, "Saturday Crew", "Jordan Saturday Graph", "Juniper crew"]);
    } else {
      live = takeExact(seed.name, seed.kind);
    }
    if (!live) return { ...seed };

    return {
      ...seed,
      id: live.id,
      // Seed chrome is the approved list surface — never replace preview/when/pills.
      kind: live.kind || seed.kind,
      memberCount: live.memberCount ?? seed.memberCount,
    };
  });
  logSeedRemap(seedRows, liveChats, out, "mapped");
  return out;
}

function logSeedRemap(
  seedRows: ChatsHomeRow[],
  liveChats: LiveChatMatchInput[],
  out: ChatsHomeRow[],
  mode: string,
) {
  if (typeof window === "undefined") return;
  try {
    const summary = {
      step: "remapFounderChatRowsToLive",
      mode,
      seedLen: seedRows.length,
      liveLen: liveChats.length,
      outLen: out.length,
      seedNames: seedRows.map((r) => r.name),
      liveNames: liveChats.map((c) => c.name).slice(0, 12),
      outIds: out.map((r) => ({ name: r.name, id: r.id.slice(0, 24), pill: r.planConsequence?.label })),
    };
    const w = window as Window & { __opalSeedPipeline?: Record<string, unknown> };
    w.__opalSeedPipeline = { ...(w.__opalSeedPipeline || {}), remap: summary, at: Date.now() };
    console.info("[opal-seed]", summary);
  } catch {
    /* ignore */
  }
}

/**
 * When seed is on, prefer the designed walk names (Chanelle / Maya / …) over
 * live API titles that often resolve to "Founder" after auth defaults.
 */
export function founderSeedDisplayNameForId(
  conversationId: string | null | undefined,
  liveChats: LiveChatMatchInput[] = [],
): string | null {
  if (!conversationId) return null;
  if (isFounderSeedChatId(conversationId)) {
    return FOUNDER_CHATS_PLAN_PILL_ROWS.find((r) => r.id === conversationId)?.name || null;
  }
  const remapped = remapFounderChatRowsToLive(FOUNDER_CHATS_PLAN_PILL_ROWS, liveChats);
  const hit = remapped.find((r) => r.id === conversationId);
  return hit?.name || null;
}

/** Patch live chat previews so chrome (header / composer) matches seed walk names. */
export function overlayFounderSeedNamesOnChats<T extends { id: string; name: string }>(
  chats: T[],
): T[] {
  if (!chats.length) return chats;
  // Feed remap with junk labels cleared so empty/"Conversation"/"Founder" never
  // block seed-name binding — names[] emptiness is the common live-API failure.
  const live: LiveChatMatchInput[] = chats.map((c) => ({
    id: c.id,
    name: isFounderFallbackLabel(c.name) ? "" : c.name,
  }));
  const remapped = remapFounderChatRowsToLive(FOUNDER_CHATS_PLAN_PILL_ROWS, live);
  const nameById = new Map(
    remapped.filter((r) => !isFounderSeedChatId(r.id)).map((r) => [r.id, r.name]),
  );
  // When live titles are auth-default junk, still never surface Conversation/Founder.
  const assigned = new Set(nameById.values());
  const unusedSeedNames = FOUNDER_CHATS_PLAN_PILL_ROWS.map((r) => r.name).filter(
    (n) => !assigned.has(n),
  );
  let seedIdx = 0;
  return chats.map((c) => {
    const seedName = nameById.get(c.id);
    if (seedName) return seedName !== c.name ? { ...c, name: seedName } : c;
    if (isFounderFallbackLabel(c.name) && seedIdx < unusedSeedNames.length) {
      const next = unusedSeedNames[seedIdx++]!;
      return { ...c, name: next };
    }
    return c;
  });
}

/** Seed thread turn — human bubble or Opal plan filament. */
export type FounderSeedThreadTurn = {
  id: string;
  from: "me" | "them";
  body: string;
  time: string;
  /** Peer display name for Brand V4 speaker chrome (inbound only). */
  senderDisplayName?: string;
  /** Sparse Opal consequence / plan plate (never a human bubble). */
  opalFilament?: boolean;
  opalSystemConsequence?: boolean;
  humanSpeaker?: boolean;
  signal?: { kind: string; label: string };
};

const SEED_THREADS_BY_KEY: Record<string, FounderSeedThreadTurn[]> = {
  // Chanelle — nearly complete, confirming Juniper & Ivy · 7:30
  "seed-chat-chanelle": [
    {
      id: "seed-chat-chanelle-m0",
      from: "them",
      body: "Dinner might work Saturday — Juniper?",
      time: "8:05 PM",
      senderDisplayName: "Chanelle",
    },
    { id: "seed-chat-chanelle-m1", from: "me", body: "Juniper tonight?", time: "8:12 PM" },
    {
      id: "seed-chat-chanelle-m2",
      from: "them",
      body: "I can do 7:30.",
      time: "8:14 PM",
      senderDisplayName: "Chanelle",
    },
    {
      id: "seed-chat-chanelle-m3",
      from: "me",
      body: "Perfect — I'll grab a table.",
      time: "8:15 PM",
    },
    {
      id: "seed-chat-chanelle-opal",
      from: "them",
      body: "Opal lined this up · Juniper & Ivy · Sat 7:30 PM",
      time: "8:15 PM",
      opalFilament: true,
      opalSystemConsequence: true,
      humanSpeaker: false,
      signal: { kind: "plan_forming", label: "Opal lined this up · Juniper & Ivy · Sat 7:30 PM" },
    },
  ],
  // Maya — in progress, farmers market + coast, still choosing time
  "seed-chat-maya": [
    {
      id: "seed-chat-maya-m0",
      from: "them",
      body: "Saturday morning — farmers market?",
      time: "Yesterday",
      senderDisplayName: "Maya",
    },
    {
      id: "seed-chat-maya-m1",
      from: "me",
      body: "Yes — then the coast if it's clear.",
      time: "Yesterday",
    },
    {
      id: "seed-chat-maya-m2",
      from: "them",
      body: "Love that. Before or after coffee?",
      time: "Yesterday",
      senderDisplayName: "Maya",
    },
    {
      id: "seed-chat-maya-opal",
      from: "them",
      body: "Opal: 9:30 market · 11 coast drive — or start at 10?",
      time: "40m",
      opalFilament: true,
      opalSystemConsequence: true,
      humanSpeaker: false,
      signal: {
        kind: "plan_forming",
        label: "Opal: 9:30 market · 11 coast drive — or start at 10?",
      },
    },
    {
      id: "seed-chat-maya-m3",
      from: "me",
      body: "After 10 feels better for me.",
      time: "25m",
    },
    {
      id: "seed-chat-maya-m4",
      from: "them",
      body: "I'm free after 10",
      time: "18m",
      senderDisplayName: "Maya",
    },
  ],
  // Juniper crew — group mid-coordination; one person still quiet
  "seed-chat-juniper-crew": [
    {
      id: "seed-chat-juniper-crew-m0",
      from: "them",
      body: "Table for four at Juniper Saturday?",
      time: "2h",
      senderDisplayName: "Priya",
    },
    {
      id: "seed-chat-juniper-crew-m1",
      from: "me",
      body: "I'm in — 7:30 works.",
      time: "1h",
    },
    {
      id: "seed-chat-juniper-crew-m2",
      from: "them",
      body: "Sam's in — that's 3 of 4",
      time: "48m",
      senderDisplayName: "Sam",
    },
    {
      id: "seed-chat-juniper-crew-m3",
      from: "them",
      body: "Still waiting on Chanelle…",
      time: "40m",
      senderDisplayName: "Priya",
    },
    {
      id: "seed-chat-juniper-crew-m4",
      from: "them",
      body: "I can make 7:30",
      time: "34m",
      senderDisplayName: "Jordan",
    },
  ],
  // Sabrina — just started, live nearby, photo energy
  "seed-chat-sabrina": [
    {
      id: "seed-chat-sabrina-m0",
      from: "them",
      body: "Okay this place just opened two blocks away",
      time: "2h",
      senderDisplayName: "Sabrina",
    },
    {
      id: "seed-chat-sabrina-m1",
      from: "me",
      body: "Which one?",
      time: "1h",
    },
    {
      id: "seed-chat-sabrina-m2",
      from: "them",
      body: "You should check this out — patio lights already on",
      time: "1h",
      senderDisplayName: "Sabrina",
    },
    {
      id: "seed-chat-sabrina-m3",
      from: "me",
      body: "Send it",
      time: "1h",
    },
    {
      id: "seed-chat-sabrina-m4",
      from: "them",
      body: "Sent a photo",
      time: "1h",
      senderDisplayName: "Sabrina",
    },
  ],
  // Alex — Trip Graph / Mexico City memory
  "seed-chat-alex": [
    {
      id: "seed-chat-alex-m0",
      from: "them",
      body: "Still thinking about that week",
      time: "Yesterday",
      senderDisplayName: "Alex",
    },
    {
      id: "seed-chat-alex-m1",
      from: "me",
      body: "The rooftop at dusk?",
      time: "Yesterday",
    },
    {
      id: "seed-chat-alex-m2",
      from: "them",
      body: "And the gallery night. I dropped the shots in Trip Graph",
      time: "Yesterday",
      senderDisplayName: "Alex",
    },
    {
      id: "seed-chat-alex-opal",
      from: "them",
      body: "Trip Graph · Mexico City — 14 memories",
      time: "Yesterday",
      opalFilament: true,
      opalSystemConsequence: true,
      humanSpeaker: false,
      signal: { kind: "plan_forming", label: "Trip Graph · Mexico City — 14 memories" },
    },
    {
      id: "seed-chat-alex-m3",
      from: "me",
      body: "That rooftop shot though.",
      time: "Yesterday",
    },
    {
      id: "seed-chat-alex-m4",
      from: "them",
      body: "Mexico City was unreal",
      time: "Yesterday",
      senderDisplayName: "Alex",
    },
  ],
};

function seedKeyFromName(name: string | null | undefined): string | null {
  const n = (name || "").trim().toLowerCase();
  if (!n) return null;
  if (n === "chanelle") return "seed-chat-chanelle";
  if (n === "maya") return "seed-chat-maya";
  if (n === "juniper crew" || n === "saturday crew") return "seed-chat-juniper-crew";
  if (n === "sabrina") return "seed-chat-sabrina";
  if (n === "alex") return "seed-chat-alex";
  return null;
}

/**
 * Resolve the designed walk thread for a conversation id or display name.
 * Works for seed-chat-* ids and remapped live UUIDs (look up by seed name).
 */
export function resolveFounderSeedThread(input: {
  conversationId?: string | null;
  displayName?: string | null;
}): FounderSeedThreadTurn[] {
  const id = (input.conversationId || "").trim();
  let turns: FounderSeedThreadTurn[] = [];
  let via = "empty";
  if (id && SEED_THREADS_BY_KEY[id]) {
    turns = SEED_THREADS_BY_KEY[id].map((t) => ({ ...t }));
    via = "id-key";
  } else if (isFounderSeedChatId(id) && SEED_THREADS_BY_KEY[id]) {
    turns = SEED_THREADS_BY_KEY[id].map((t) => ({ ...t }));
    via = "seed-chat-id";
  } else {
    const byName = seedKeyFromName(input.displayName);
    if (byName && SEED_THREADS_BY_KEY[byName]) {
      turns = SEED_THREADS_BY_KEY[byName].map((t) => ({
        ...t,
        id: t.id.replace(byName, id || byName),
      }));
      via = `name:${byName}`;
    } else {
      const seedRow = FOUNDER_CHATS_PLAN_PILL_ROWS.find(
        (r) => r.id === id || r.name === input.displayName,
      );
      if (seedRow) {
        const key = seedKeyFromName(seedRow.name);
        if (key && SEED_THREADS_BY_KEY[key]) {
          turns = SEED_THREADS_BY_KEY[key].map((t) => ({ ...t }));
          via = `row:${key}`;
        }
      }
    }
  }
  if (typeof window !== "undefined") {
    try {
      const summary = {
        step: "resolveFounderSeedThread",
        conversationId: id.slice(0, 36),
        displayName: input.displayName || null,
        via,
        turnCount: turns.length,
        preview: turns.slice(0, 3).map((t) => (t.body || t.opalFilament || "").slice(0, 48)),
      };
      const w = window as Window & { __opalSeedPipeline?: Record<string, unknown> };
      w.__opalSeedPipeline = { ...(w.__opalSeedPipeline || {}), thread: summary, at: Date.now() };
      console.info("[opal-seed]", summary);
    } catch {
      /* ignore */
    }
  }
  return turns;
}

/** Local thread bodies when a seed id could not be remapped to a live conversation. */
export function founderSeedThreadMessages(
  seedId: string,
): Array<{ id: string; from: "me" | "them"; body: string; time: string }> {
  const rich = resolveFounderSeedThread({ conversationId: seedId });
  if (rich.length) {
    return rich
      .filter((t) => !t.opalFilament && !t.opalSystemConsequence)
      .map(({ id, from, body, time }) => ({ id, from, body, time }));
  }
  const seed = FOUNDER_CHATS_PLAN_PILL_ROWS.find((r) => r.id === seedId);
  if (!seed) {
    return [
      {
        id: `${seedId}-m0`,
        from: "them",
        body: "Say something to open this thread.",
        time: "now",
      },
    ];
  }
  return [
    {
      id: `${seedId}-m0`,
      from: "them",
      body: seed.preview,
      time: seed.when || "earlier",
    },
    {
      id: `${seedId}-m1`,
      from: "me",
      body: seed.planConsequence?.label
        ? `Sounds good — ${seed.planConsequence.label}`
        : "Sounds good",
      time: "now",
    },
  ];
}
