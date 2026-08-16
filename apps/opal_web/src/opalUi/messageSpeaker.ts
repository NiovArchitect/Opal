/**
 * Pass 31 P0-31-04 — multi-human message speaker identity (presentation only).
 *
 * Authority: sender_user_id from server/realtime.
 * Never invent speaker from bubble side alone or untrusted display name alone.
 */

export type SpeakerDirectory = Record<
  string,
  { displayName: string; handle?: string; avatarUrl?: string | null }
>;

export type ResolvedSpeaker = {
  senderUserId: string;
  displayName: string;
  isSelf: boolean;
  humanSpeaker: true;
  /** Initials fallback — not authority */
  initials: string;
  avatarUrl: string | null;
};

export type ThreadRowKind = "human" | "system";

export type ThreadRowMeta = {
  kind: ThreadRowKind;
  showSpeakerHeader: boolean;
  speaker: ResolvedSpeaker | null;
  /** Same continuous human group as previous human row */
  continuesGroup: boolean;
};

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}

/**
 * Resolve display identity from sender id + directory.
 * Untrusted client displayName is never used without matching sender id.
 */
export function resolveSpeaker(
  senderUserId: string | null | undefined,
  selfUserId: string | null | undefined,
  directory: SpeakerDirectory,
): ResolvedSpeaker | null {
  if (!senderUserId) return null;
  const isSelf = Boolean(selfUserId && senderUserId === selfUserId);
  const entry = directory[senderUserId];
  const displayName =
    entry?.displayName?.trim() ||
    (isSelf ? "You" : "Unknown member");
  return {
    senderUserId,
    displayName,
    isSelf,
    humanSpeaker: true,
    initials: initialsFromName(displayName === "You" && entry?.displayName ? entry.displayName : displayName),
    avatarUrl: entry?.avatarUrl || null,
  };
}

export function buildSpeakerDirectory(input: {
  selfUserId?: string | null;
  selfDisplayName?: string | null;
  peers?: Array<{ id: string; display_name?: string; displayName?: string; handle?: string }>;
}): SpeakerDirectory {
  const dir: SpeakerDirectory = {};
  if (input.selfUserId) {
    dir[input.selfUserId] = {
      displayName: (input.selfDisplayName || "You").trim() || "You",
    };
  }
  for (const p of input.peers || []) {
    if (!p?.id) continue;
    dir[p.id] = {
      displayName: (p.display_name || p.displayName || "Unknown member").trim(),
      handle: p.handle,
    };
  }
  return dir;
}

/**
 * Whether to show speaker header above this human message.
 * System rows break human groups.
 */
export function shouldShowSpeakerHeader(
  prev: {
    humanSpeaker?: boolean;
    senderUserId?: string | null;
    opalSystemConsequence?: boolean;
    opalFilament?: boolean;
  } | null,
  curr: {
    humanSpeaker?: boolean;
    senderUserId?: string | null;
    opalSystemConsequence?: boolean;
    opalFilament?: boolean;
  },
  opts?: { isGroup: boolean; isSelf: boolean },
): boolean {
  if (curr.opalSystemConsequence || curr.opalFilament || curr.humanSpeaker === false) {
    return false;
  }
  if (!curr.senderUserId) return Boolean(opts?.isGroup);
  // Dyad self-side may omit repeated self labels; still first of group if needed
  if (!opts?.isGroup && opts?.isSelf) {
    // Show nothing for consecutive self in dyad
    if (prev && prev.senderUserId === curr.senderUserId && prev.humanSpeaker !== false) {
      return false;
    }
    // First message or after other speaker: still skip name in dyad for self (bubble side)
    return false;
  }
  if (!opts?.isGroup) {
    // Dyad other: show name only on first of consecutive run
    if (!prev || prev.opalSystemConsequence || prev.opalFilament || prev.humanSpeaker === false) {
      return true;
    }
    return prev.senderUserId !== curr.senderUserId;
  }
  // Group: always header on transition / after system
  if (!prev || prev.opalSystemConsequence || prev.opalFilament || prev.humanSpeaker === false) {
    return true;
  }
  return prev.senderUserId !== curr.senderUserId;
}

export function continuesHumanGroup(
  prev: { senderUserId?: string | null; humanSpeaker?: boolean; opalSystemConsequence?: boolean } | null,
  curr: { senderUserId?: string | null; humanSpeaker?: boolean },
): boolean {
  if (!prev || !curr.senderUserId || !prev.senderUserId) return false;
  if (prev.opalSystemConsequence || prev.humanSpeaker === false) return false;
  if (curr.humanSpeaker === false) return false;
  return prev.senderUserId === curr.senderUserId;
}

/** Pure presentation plan for a thread — no reordering. */
export function planThreadSpeakerRows(
  messages: Array<{
    id: string;
    senderUserId?: string | null;
    from?: "me" | "them";
    opalSystemConsequence?: boolean;
    opalFilament?: boolean;
    humanSpeaker?: boolean;
  }>,
  opts: {
    selfUserId: string | null;
    directory: SpeakerDirectory;
    isGroup: boolean;
  },
): Array<{ id: string; meta: ThreadRowMeta }> {
  const out: Array<{ id: string; meta: ThreadRowMeta }> = [];
  let prevHuman: {
    senderUserId?: string | null;
    humanSpeaker?: boolean;
    opalSystemConsequence?: boolean;
    opalFilament?: boolean;
  } | null = null;

  for (const m of messages) {
    const isSystem =
      m.opalSystemConsequence === true ||
      m.opalFilament === true ||
      m.humanSpeaker === false;
    if (isSystem) {
      out.push({
        id: m.id,
        meta: {
          kind: "system",
          showSpeakerHeader: false,
          speaker: null,
          continuesGroup: false,
        },
      });
      prevHuman = {
        opalSystemConsequence: true,
        humanSpeaker: false,
      };
      continue;
    }
    const speaker = resolveSpeaker(m.senderUserId, opts.selfUserId, opts.directory);
    const isSelf = speaker?.isSelf === true || m.from === "me";
    const showSpeakerHeader = shouldShowSpeakerHeader(prevHuman, {
      humanSpeaker: true,
      senderUserId: m.senderUserId,
    }, { isGroup: opts.isGroup, isSelf });
    const continuesGroup = continuesHumanGroup(prevHuman, {
      senderUserId: m.senderUserId,
      humanSpeaker: true,
    });
    out.push({
      id: m.id,
      meta: {
        kind: "human",
        showSpeakerHeader,
        speaker,
        continuesGroup,
      },
    });
    prevHuman = {
      senderUserId: m.senderUserId,
      humanSpeaker: true,
    };
  }
  return out;
}
