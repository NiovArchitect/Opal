/**
 * No-seed chat path.
 * Seed fixture people stay available for explicit founder-seed sessions.
 * They are not current social state on the physical two-user path.
 */

/** Stable ids from FounderCommunicationSeed + FounderGraphCommitmentSeed. */
export const FOUNDER_SEED_PEER_IDS = new Set([
  "f0c4a4e1-1111-4111-8111-c4a4e1100001",
  "a4444444-4444-4444-8444-444444444444",
  "a2222222-2222-4222-8222-222222222222",
  "f0c4a4e1-1111-4111-8111-c4a4e1100004",
  "f0c4a4e1-1111-4111-8111-c4a4e1100005",
  "f0c4a4e1-1111-4111-8111-c4a4e1100006",
]);

export function isInternalConversationLabel(label: string | null | undefined): boolean {
  if (!label) return false;
  return /^(connection|direct|group)-/i.test(label.trim());
}

export function conversationDisplayName(
  title: string | null | undefined,
  peerNames: Array<string | null | undefined>,
): string {
  const names = peerNames.map((n) => (n || "").trim()).filter(Boolean);
  const label = (title || "").trim();
  if (isInternalConversationLabel(label)) {
    return names.join(", ") || "Direct";
  }
  if (label) return label;
  return names.join(", ") || "Conversation";
}

export function isUnprovenThreadLabel(label: string | null | undefined): boolean {
  const text = label || "";
  return /Harbor Table|Herb & Wood fits the group|Coffee · Tuesday|10:30 AM · Harbor/i.test(text);
}

export function isSeedLeakMessage(body: string | null | undefined): boolean {
  const text = body || "";
  return /Forwarded Memory:|\[seed-|Golden hour hike with the crew/i.test(text);
}

export function isSeedFixtureConversation(
  peers: Array<{ id?: string | null }>,
): boolean {
  const ids = peers.map((p) => p.id).filter((id): id is string => !!id);
  return ids.length > 0 && ids.every((id) => FOUNDER_SEED_PEER_IDS.has(id));
}
