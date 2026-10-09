/**
 * Paste W4 Phase 1 — identity voice is mechanical, not advisory.
 * Opal talks TO {user}, ABOUT {friend}. Plan titles echo user words.
 */

/** Person holding the phone (session subject Opal addresses). */
export const USER_VAR = "{user}" as const;
/** Person being discussed (never the addressee mid-flow). */
export const FRIEND_VAR = "{friend}" as const;

export type IdentityVoiceCtx = {
  user?: string;
  friend?: string;
};

/**
 * Banned friend-as-addressee shapes (session voice).
 * Outbound SMS previews may still say "Hey {friend}," — that is a draft TO them,
 * not Opal treating them as the phone-holder.
 * Patterns may include `{friend}` literal or are expanded with a real name.
 */
export const BANNED_FRIEND_ADDRESS_PATTERNS: readonly (RegExp | string)[] = [
  /\bHi\s+\{friend\}\s*,/i,
  /\bThanks for sharing that,\s*\{friend\}\s*\./i,
  /\{friend\},\s*your\s+\S[\s\S]{0,40}\bare ready\b/i,
  /\bwhat'?s the vibe you'?re picturing\b/i,
];

/** Nouns that must not appear in titles unless the user said them. */
export const INVENTED_TITLE_NOUNS = [
  "hurricane",
  "movie",
  "date",
] as const;

const DASH_CHARS = /[—–―]/;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Expand banned patterns with a concrete friend name when provided. */
export function bannedPatternsForFriend(friend?: string): RegExp[] {
  const out: RegExp[] = [];
  for (const p of BANNED_FRIEND_ADDRESS_PATTERNS) {
    out.push(typeof p === "string" ? new RegExp(escapeRegExp(p), "i") : p);
  }
  const name = friend?.trim();
  if (name) {
    const esc = escapeRegExp(name);
    out.push(
      new RegExp(`\\bHi\\s+${esc}\\s*,`, "i"),
      new RegExp(`Thanks for sharing that,\\s*${esc}\\s*\\.`, "i"),
      new RegExp(`${esc},\\s*your\\s+\\S[\\s\\S]{0,40}\\bare ready\\b`, "i"),
    );
  }
  return out;
}

/**
 * Scrub em/en dashes and clause-break " - " from onboarding/planning copy.
 * Hyphenated words (e.g. catch-up) are preserved.
 */
export function scrubUserVisibleDashes(text: string): string {
  return text
    .replace(/[—–―]/g, ". ")
    .replace(/\s+-\s+/g, ". ")
    .replace(/\s+\./g, ".")
    .replace(/\.\s*\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function hasBannedDash(text: string): boolean {
  return /[—–―]/.test(text) || /\s-\s/.test(text);
}

/**
 * Assert Opal is talking TO the user, ABOUT the friend.
 * Returns violation descriptions (empty = pass). Set throwOnViolation to throw.
 */
export function assertOpalTalksToUser(
  text: string,
  ctx: IdentityVoiceCtx = {},
  opts?: { throwOnViolation?: boolean },
): string[] {
  const violations: string[] = [];
  const body = String(text || "");
  if (!body.trim()) return violations;

  for (const re of bannedPatternsForFriend(ctx.friend)) {
    if (re.test(body)) {
      violations.push(`friend-as-addressee: /${re.source}/ matched`);
    }
  }

  if (hasBannedDash(body)) {
    violations.push("banned dash (em/en or clause-break \" - \")");
  }

  if (opts?.throwOnViolation && violations.length > 0) {
    throw new Error(
      `assertOpalTalksToUser failed: ${violations.join("; ")} :: ${body.slice(0, 120)}`,
    );
  }
  return violations;
}

/**
 * Echo the user's words as a plan title. Never invent venue/activity nouns.
 * "beach" → "Beach"; never expands into "Hurricane Movie Date".
 */
export function planTitleFromUserWords(raw: string): string {
  const trimmed = String(raw || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!trimmed) return "Plans";

  // Drop leading articles; keep the user's own words only.
  const withoutArticle = trimmed.replace(/^(a|an|the)\s+/i, "");
  const words = withoutArticle.split(/\s+/).filter(Boolean).slice(0, 6);
  if (!words.length) return "Plans";

  const echoed = words
    .map((w, i) => {
      if (i > 0) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");

  return echoed;
}

/**
 * Title for a plan ABOUT a friend, built only from user words (+ optional who).
 */
export function planTitleWithFriend(userWords: string, friend?: string): string {
  const base = planTitleFromUserWords(userWords);
  const who = friend?.trim();
  if (!who) return base;
  if (new RegExp(`\\bwith\\s+${escapeRegExp(who)}\\b`, "i").test(base)) {
    return base;
  }
  return `${base} with ${who}`;
}

/** Violations when a title invents nouns the user did not say. */
export function assertTitleEchoesUserWords(
  title: string,
  userWords: string,
): string[] {
  const violations: string[] = [];
  const t = String(title || "");
  const raw = String(userWords || "").trim();
  const rawLower = raw.toLowerCase();
  const first = rawLower.split(/\s+/).filter(Boolean)[0];

  if (first && first !== "plans" && !t.toLowerCase().includes(first)) {
    violations.push(`title missing user word "${first}"`);
  }

  for (const noun of INVENTED_TITLE_NOUNS) {
    const inTitle = new RegExp(`\\b${noun}\\b`, "i").test(t);
    const inUser = new RegExp(`\\b${noun}\\b`, "i").test(raw);
    if (inTitle && !inUser) {
      violations.push(`invented noun "${noun}"`);
    }
  }
  return violations;
}

export type ScriptedFlowStrings = {
  /** Session voice — must pass assertOpalTalksToUser. */
  opalSpoken: string[];
  /** Outbound SMS draft TO friend — beach must still propagate. */
  outboundSms: string[];
  /** Plan title from user words. */
  planTitle: string;
};

/**
 * Scripted onboarding + planning strings for identity / beach propagation proofs.
 * Opal talks TO user ABOUT friend; vibe words must propagate.
 */
export function scriptedOpalFlowStrings(input: {
  user: string;
  friend: string;
  vibe: string;
  when?: string;
  spot?: string;
  days?: string;
}): ScriptedFlowStrings {
  const { friend, vibe, when = "This weekend", spot, days } = input;
  const v = vibe.trim() || "plans";
  const daysLabel = days || "Friday evening or Saturday";
  const spotLabel = spot || (/beach/i.test(v) ? "Nearby beach" : "a spot");

  const opalSpoken: string[] = [
    `Got ${friend}.`,
    `Got ${friend}. Add anyone else, or plan something with them?`,
    `Let's plan with ${friend}`,
    `When do you want to see ${friend} this week?`,
    `What kind of vibe for ${friend}?`,
    /beach|ocean|coast|surf/i.test(v)
      ? "Mind if I use your location to find beaches?"
      : "Mind if I use your location to find spots nearby?",
    (() => {
      const short = v.split(/\s+/)[0] || v;
      return `${short.charAt(0).toUpperCase()}${short.slice(1)} it is. Noted.`;
    })(),
    `Calendar's connected. How about ${daysLabel} for ${v.toLowerCase()} with ${friend}?`,
    `Calendar connect isn't set up yet. How about ${daysLabel} for ${v.toLowerCase()} with ${friend}?`,
    `No problem. How about ${daysLabel} for ${v.toLowerCase()} with ${friend}?`,
    `Thinking about ${friend}.`,
    `I don't have ${v.toLowerCase()} recommendations yet, but I can learn your preferences.`,
    `1 plan ready: ${friend} (${spotLabel})`,
    `Message for ${friend}:`,
    planTitleWithFriend(v, friend),
  ];

  const outboundSms = [
    `Hey ${friend}, ${spotLabel} ${when.toLowerCase()}? Thought of you.`,
  ];

  return {
    opalSpoken,
    outboundSms,
    planTitle: planTitleWithFriend(v, friend),
  };
}
