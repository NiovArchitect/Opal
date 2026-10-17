/**
 * Founder Chats list row CHROME (names, avatars, relationship labels).
 *
 * Repair #18 (F18-01/02): fixture rows carry NO plan consequence. The
 * seed-mode literal pills that used to live here (a going-count pill
 * and a venue-and-time pill) were static strings no backend value
 * could ever update, and they diverged from every other surface. Plan pills
 * now come only from the backend projection (attendance contract) via
 * the live row composition in OpalApp - a row whose conversation has
 * no projection renders no pill at all.
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

/**
 * Paste W6 4c — peer photos for Chats list + thread header.
 * Chanelle uses the same Direct 618:351 raster as the thread chrome.
 * Groups stay on branded initial tiles (no single peer photo).
 */
export const FOUNDER_PEER_AVATAR_BY_NAME: Record<string, string> = {
  Chanelle: "/figma-v2/direct/opal-direct-chanelle-618-351.png",
  Maya: "/figma-v2/home-201/avatar-maya.png",
  Sabrina: "/figma-v2/stories/sabrina.png",
  Alex: "/figma-v2/stories/alex.png",
};

/** Resolve a contact photo when one exists; undefined → branded initial tile. */
export function resolveFounderPeerAvatarSrc(
  name: string | null | undefined,
): string | undefined {
  if (!name) return undefined;
  const key = name.trim().toLowerCase();
  for (const [n, src] of Object.entries(FOUNDER_PEER_AVATAR_BY_NAME)) {
    if (n.toLowerCase() === key) return src;
  }
  return undefined;
}

/**
 * Exact five rows for founder phone + lab walks (FOUNDER_PHONE_CHAT_ROWS ≥ 5).
 * Unread variety: some read, some unread — never all-zero or all-badged.
 * Coherent with Graphs/Calls: Maya = Saturday farmers market + coast.
 */
export const FOUNDER_CHATS_PLAN_PILL_ROWS: ChatsHomeRow[] = [
  {
    id: "seed-chat-chanelle",
    name: "Chanelle",
    kind: "direct",
    // Preview = last human message in seed thread
    preview: "Perfect. I'll grab a table.",
    when: "2m",
    unread: 0,
    relationshipLabel: "Fiancée",
    avatarSrc: FOUNDER_PEER_AVATAR_BY_NAME.Chanelle,
    avatarTone: "#6EE7F5",
  },
  {
    id: "seed-chat-maya",
    name: "Maya",
    kind: "direct",
    preview: "I'm free after 10",
    when: "18m",
    unread: 2,
    relationshipLabel: "Close friend",
    avatarSrc: FOUNDER_PEER_AVATAR_BY_NAME.Maya,
    avatarTone: "#5FAECF",
  },
  {
    id: "seed-chat-juniper-crew",
    name: "Juniper crew",
    kind: "group",
    preview: "I can make 7:30",
    previewSender: "Jordan",
    when: "34m",
    unread: 1,
    memberCount: 4,
    relationshipLabel: "4 people · Group",
    avatarTone: "#FFC86B",
  },
  {
    id: "seed-chat-sabrina",
    name: "Sabrina",
    kind: "direct",
    preview: "Sent a photo",
    when: "1h",
    unread: 3,
    relationshipLabel: "Neighbor",
    avatarSrc: FOUNDER_PEER_AVATAR_BY_NAME.Sabrina,
    avatarTone: "#FF6B9D",
  },
  {
    id: "seed-chat-alex",
    name: "Alex",
    kind: "direct",
    preview: "Mexico City was unreal",
    when: "Yesterday",
    unread: 0,
    relationshipLabel: "Following",
    avatarSrc: FOUNDER_PEER_AVATAR_BY_NAME.Alex,
    avatarTone: "#8B5CF6",
  },
];

/** Cap for physical founder phone acceptance (Chats world density). */
export const FOUNDER_PHONE_CHAT_ROWS_MIN = 5;

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
 * Keeps seed relationship labels / avatar tones - chrome only. Repair #18:
 * plan consequences are NEVER carried by this remap; the chats list no
 * longer composes from these rows at all (see chatsHydration), so a pill
 * can only come from the live conversation's backend projection.
 * Repair #17: unmatched seed rows keep seed ids HERE (pure data remap), but
 * the Chats list composition drops them — a `seed-chat-*` id is never an
 * openable conversation. Seed content is data, never behavior.
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

