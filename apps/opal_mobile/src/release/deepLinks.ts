/**
 * Deep-link authorization for SF12.
 * Client never elevates authority — only routes after local policy checks.
 */

export type DeepLinkTarget =
  | { kind: "conversation"; id: string }
  | { kind: "plan"; id: string }
  | { kind: "home" }
  | { kind: "needs_you"; id: string }
  | { kind: "invitation"; id: string }
  | { kind: "unknown"; raw: string };

export type AuthContext = {
  userId: string;
  memberships: Set<string>;
  blockedConversations: Set<string>;
  ownedNeedsYou: Set<string>;
  sessionValid: boolean;
};

export type DeepLinkResult =
  | { ok: true; target: DeepLinkTarget }
  | { ok: false; reason: string };

export function parseDeepLink(url: string): DeepLinkTarget {
  try {
    const u = new URL(url);
    const parts = u.pathname.replace(/^\//, "").split("/").filter(Boolean);
    if (parts[0] === "c" && parts[1]) return { kind: "conversation", id: parts[1] };
    if (parts[0] === "plan" && parts[1]) return { kind: "plan", id: parts[1] };
    if (parts[0] === "needs-you" && parts[1]) return { kind: "needs_you", id: parts[1] };
    if (parts[0] === "invite" && parts[1]) return { kind: "invitation", id: parts[1] };
    if (parts[0] === "home" || parts.length === 0) return { kind: "home" };
    return { kind: "unknown", raw: url };
  } catch {
    return { kind: "unknown", raw: url };
  }
}

export function authorizeDeepLink(target: DeepLinkTarget, ctx: AuthContext): DeepLinkResult {
  if (!ctx.sessionValid) {
    return { ok: false, reason: "session_invalid" };
  }
  switch (target.kind) {
    case "home":
      return { ok: true, target };
    case "conversation":
      if (ctx.blockedConversations.has(target.id)) {
        return { ok: false, reason: "blocked" };
      }
      if (!ctx.memberships.has(target.id)) {
        return { ok: false, reason: "not_member" };
      }
      return { ok: true, target };
    case "needs_you":
      if (!ctx.ownedNeedsYou.has(target.id)) {
        return { ok: false, reason: "not_owner" };
      }
      return { ok: true, target };
    case "plan":
      // Plan detail requires membership via conversation — denied without grant
      if (!ctx.memberships.has(target.id) && !target.id.startsWith("plan-owned-")) {
        return { ok: false, reason: "forbidden" };
      }
      return { ok: true, target };
    case "invitation":
      return { ok: true, target };
    default:
      return { ok: false, reason: "unknown_link" };
  }
}
