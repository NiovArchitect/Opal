/**
 * Pass 30R2 — earned-context named personalization.
 *
 * Canonical law:
 *   Context may earn a person's presence as an option.
 *   Context never earns the user's selection.
 *
 * Options start visually neutral. Active treatment only after human tap.
 */

export type NamedPresenceCandidate = {
  id: string;
  /** First name or short display for "With Jordan" */
  displayName: string;
  conversationId: string;
};

function firstName(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  const part = t.split(/\s+/)[0] || t;
  return part;
}

/**
 * Prefer grounded active/shared people (existing conversations).
 * Prefers Jordan when present for founder demo; otherwise first dyad-like chat.
 * Returns null → product uses generic Solo / With people.
 */
export function earnedNamedPresence(
  chats: Array<{ id: string; name: string }>,
): NamedPresenceCandidate | null {
  if (!chats?.length) return null;

  const jordan = chats.find((c) => /\bjordan\b/i.test(c.name || ""));
  if (jordan) {
    return {
      id: jordan.id,
      displayName: firstName(jordan.name) || "Jordan",
      conversationId: jordan.id,
    };
  }

  // First non-group-looking conversation — still must be a real chat, not inferred interest
  const dyad = chats.find((c) => {
    const n = (c.name || "").trim();
    if (!n) return false;
    if (/\b(group|team|crew|everyone)\b/i.test(n)) return false;
    return true;
  });
  if (!dyad) return null;

  return {
    id: dyad.id,
    displayName: firstName(dyad.name),
    conversationId: dyad.id,
  };
}
