/**
 * Founder-approved Chats list rows with plan pills (screenshot A).
 * Used as test data and founder-seed visual walk overlay.
 *
 * Seed row ids (`seed-chat-*`) are visual fixtures only. When live API
 * conversations exist, remap onto real ids so openChat / Channel join work.
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
  const n = normName(name || "");
  if (!n) return true;
  // "Founder", "founder founder", "Founder, Founder, Founder"
  return /^(founder)(\s*,?\s*founder)*$/.test(n);
}

/**
 * Map founder-seed visual rows onto live API conversations by name.
 * Keeps seed plan pills / relationship labels; replaces fake ids with real ones.
 * Unmatched seed rows stay as seed ids (openChat must hydrate locally).
 * Never surfaces "Founder" — seed names win when live titles are auth defaults.
 */
export function remapFounderChatRowsToLive(
  seedRows: ChatsHomeRow[],
  liveChats: LiveChatMatchInput[],
): ChatsHomeRow[] {
  if (!liveChats.length) return seedRows.map((r) => ({ ...r }));

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

  return seedRows.map((seed) => {
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
      // Prefer live preview/when when present so the row feels connected.
      preview: live.preview?.trim() || seed.preview,
      when: live.when?.trim() || seed.when,
      kind: live.kind || seed.kind,
      memberCount: live.memberCount ?? seed.memberCount,
    };
  });
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
  const live: LiveChatMatchInput[] = chats.map((c) => ({ id: c.id, name: c.name }));
  const remapped = remapFounderChatRowsToLive(FOUNDER_CHATS_PLAN_PILL_ROWS, live);
  const nameById = new Map(
    remapped.filter((r) => !isFounderSeedChatId(r.id)).map((r) => [r.id, r.name]),
  );
  // When live titles are auth-default "Founder", still never surface that label.
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

/** Local thread bodies when a seed id could not be remapped to a live conversation. */
export function founderSeedThreadMessages(
  seedId: string,
): Array<{ id: string; from: "me" | "them"; body: string; time: string }> {
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
