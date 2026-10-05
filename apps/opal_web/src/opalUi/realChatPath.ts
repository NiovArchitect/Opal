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

function isFounderFallbackDisplay(label: string): boolean {
  const n = label.trim().toLowerCase().replace(/\s+/g, " ");
  return /^(founder)(\s*,?\s*founder)*$/.test(n);
}

export function conversationDisplayName(
  title: string | null | undefined,
  peerNames: Array<string | null | undefined>,
): string {
  const names = peerNames.map((n) => (n || "").trim()).filter(Boolean);
  const label = (title || "").trim();
  if (isInternalConversationLabel(label)) {
    const joined = names.join(", ");
    // Never paint "Founder, Founder, Founder" — fall back to Direct.
    if (!joined || isFounderFallbackDisplay(joined)) return "Direct";
    return joined;
  }
  if (label && !isFounderFallbackDisplay(label)) return label;
  const joined = names.join(", ");
  if (joined && !isFounderFallbackDisplay(joined)) return joined;
  return "Conversation";
}

export function isUnprovenThreadLabel(label: string | null | undefined): boolean {
  const text = label || "";
  return /Harbor Table|Herb & Wood fits the group|Coffee · Tuesday|10:30 AM · Harbor/i.test(text);
}

export function isSeedLeakMessage(body: string | null | undefined): boolean {
  const text = body || "";
  return /Forwarded Memory:|\[seed-|Golden hour hike with the crew/i.test(text);
}

/** Automation / soak / gate residue that must not appear in founder Chats. */
const TEST_RESIDUE_TITLE =
  /^(Soak\b|Multi speaker\b|Crew with\b|Dinner with Direct Friend\b|Deep Smoke\b|Collective proof\b|Proof Friends\b|Direct,\s*Second\b|Second,\s*Direct\b|shell-geo automation\b)/i;
const TEST_RESIDUE_PREVIEW =
  /shell-geo\b|P046gate\b|SOAK-|SAFRT\b|\bSF17\b|Collective proof|Deep Smoke|Group hello\b/i;

/**
 * True when a Chats row is lab/automation residue (TEST_ARTIFACT_VISIBLE_IN_FOUNDER_UI).
 * Fort Oak itself is never residue by title; shell-geo previews are cleaned via fixture reset.
 */
export function isTestResidueConversation(input: {
  title?: string | null;
  name?: string | null;
  preview?: string | null;
  id?: string | null;
}): boolean {
  const fortOak = "ace99adc-db67-4258-9d95-f612246c6c84";
  // Fort Oak stays visible; shell-geo preview cleanup is fixture-reset only.
  if (input.id && input.id === fortOak) return false;
  const title = String(input.title || input.name || "").trim();
  const preview = String(input.preview || "").trim();
  if (TEST_RESIDUE_TITLE.test(title)) return true;
  if (/^P046gate$/i.test(preview) && /Direct/i.test(title)) return true;
  if (TEST_RESIDUE_PREVIEW.test(preview) && !title) return true;
  return false;
}

export function isSeedFixtureConversation(
  peers: Array<{ id?: string | null }>,
): boolean {
  const ids = peers.map((p) => p.id).filter((id): id is string => !!id);
  return ids.length > 0 && ids.every((id) => FOUNDER_SEED_PEER_IDS.has(id));
}
