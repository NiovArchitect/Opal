/**
 * Presentation compression — ONE FACT → ONE BEST LOCAL PRESENTATION.
 * Not domain authority. Prevents Thursday · 6:30 thrice on one object.
 */

const WEEKDAYS =
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/gi;
const TIME_TOKEN =
  /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\b/gi;
const TONIGHT_LIKE = /\b(tonight|today|tomorrow|this evening|this afternoon)\b/gi;

export type RealityBits = {
  what?: string | null;
  who?: string | null;
  when?: string | null;
  where?: string | null;
  gap?: string | null;
  area?: string | null;
  distance?: string | null;
  leaveAround?: string | null;
  kicker?: string | null;
};

export type ComposedReality = {
  kicker: string;
  headline: string;
  primary: string | null;
  secondary: string | null;
  /** Home presence title (compressed) */
  presenceTitle: string;
  /** Home presence detail (compressed) */
  presenceDetail: string;
};

/** 12-hour clock with AM/PM — never bare "6:30" when locale is ambiguous. */
export function formatClockAmPm(
  input: string | Date | null | undefined,
  locale?: string,
): string {
  if (input == null || input === "") return "";
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return "";
    return new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(input);
  }
  const raw = String(input).trim();
  if (!raw) return "";

  // ISO instant
  if (/^\d{4}-\d{2}-\d{2}/.test(raw) || raw.includes("T")) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      return new Intl.DateTimeFormat(locale, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(d);
    }
  }

  // Extract clock with meridem from free text ("Thursday · 6:30 PM")
  const withMeridem = raw.match(
    /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/i,
  );
  if (withMeridem) {
    const h = parseInt(withMeridem[1], 10);
    const min = withMeridem[2] || "00";
    const ap = /p/i.test(withMeridem[3]) ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return min === "00" ? `${h12} ${ap}` : `${h12}:${min} ${ap}`;
  }

  // Bare time like 6:30 or 18:30 (social UI defaults afternoon/evening to PM)
  const m = raw.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (m) {
    const h = parseInt(m[1], 10);
    const min = m[2] || "00";
    if (h >= 0 && h <= 23) {
      if (h >= 13) {
        const h12 = h % 12 === 0 ? 12 : h % 12;
        return min === "00" ? `${h12} PM` : `${h12}:${min} PM`;
      }
      if (h === 0) return min === "00" ? "12 AM" : `12:${min} AM`;
      if (h === 12) return min === "00" ? "12 PM" : `12:${min} PM`;
      // Bare 1–11: social evening bias for 5–11; morning for 1–4
      const ap = h >= 5 ? "PM" : "AM";
      return min === "00" ? `${h} ${ap}` : `${h}:${min} ${ap}`;
    }
  }

  // Embedded bare "6:30" without meridem — return CLOCK ONLY (never keep weekday in clock field)
  const embedded = raw.match(
    /\b(\d{1,2}):(\d{2})\b(?!\s*(?:am|pm|a\.m\.|p\.m\.))/i,
  );
  if (embedded) {
    const hour = parseInt(embedded[1], 10);
    const min = embedded[2];
    if (hour > 12) {
      const h12 = hour % 12 === 0 ? 12 : hour % 12;
      return `${h12}:${min} PM`;
    }
    if (hour === 0) return `12:${min} AM`;
    if (hour === 12) return `12:${min} PM`;
    const ap = hour >= 5 ? "PM" : "AM";
    return `${hour}:${min} ${ap}`;
  }

  // No clock token — do not return freeform day labels as "clock"
  return "";
}

/** Human day label from ISO or free text. */
export function formatDayLabel(
  input: string | Date | null | undefined,
  locale?: string,
): string {
  if (input == null || input === "") return "";
  const now = new Date();
  let d: Date | null = null;
  if (input instanceof Date) {
    d = input;
  } else if (/^\d{4}-\d{2}-\d{2}/.test(input) || String(input).includes("T")) {
    const parsed = new Date(input);
    if (!Number.isNaN(parsed.getTime())) d = parsed;
  }
  if (d) {
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) {
      return d.getHours() >= 17 ? "Tonight" : "Today";
    }
    const tom = new Date(now);
    tom.setDate(now.getDate() + 1);
    if (
      d.getFullYear() === tom.getFullYear() &&
      d.getMonth() === tom.getMonth() &&
      d.getDate() === tom.getDate()
    ) {
      return "Tomorrow";
    }
    return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(d);
  }
  const raw = String(input).trim();
  if (/tonight/i.test(raw)) return "Tonight";
  if (/tomorrow/i.test(raw)) return "Tomorrow";
  const wd = raw.match(
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  );
  if (wd) return wd[1].charAt(0).toUpperCase() + wd[1].slice(1).toLowerCase();
  return raw;
}

/** Short weekday for compact lines: Thu */
export function shortWeekday(day: string): string {
  const map: Record<string, string> = {
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun",
    tonight: "Tonight",
    tomorrow: "Tomorrow",
    today: "Today",
  };
  return map[day.toLowerCase()] || day.slice(0, 3);
}

function stripRedundant(
  text: string,
  already: string[],
): string {
  let out = text.trim();
  if (!out) return "";
  for (const fact of already) {
    if (!fact) continue;
    const esc = fact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Remove whole-token repeats of day/time already shown
    out = out.replace(new RegExp(`\\b${esc}\\b`, "gi"), "").trim();
  }
  out = out
    .replace(/\s*[·|,]\s*[·|,]/g, " · ")
    .replace(/^\s*[·|,]\s*|\s*[·|,]\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return out;
}

/**
 * Compose Shared Reality / Home presence without restating the same fact.
 */
export function composeHumanReality(bits: RealityBits): ComposedReality {
  const what = (bits.what || "").trim();
  const who = (bits.who || "").trim();
  const whenRaw = (bits.when || "").trim();
  const where = (bits.where || "").trim();
  const gap = (bits.gap || "").trim();
  const area = (bits.area || "").trim();
  const distance = (bits.distance || "").trim();
  const leaveAround = (bits.leaveAround || "").trim();

  const day = formatDayLabel(whenRaw) || extractDayFromText(whenRaw);
  const clock =
    formatClockAmPm(whenRaw) ||
    formatClockAmPm(extractTimeFromText(whenRaw)) ||
    "";

  const kickerExplicit = (bits.kicker || "").trim();
  const kicker = (
    kickerExplicit ||
    (day === "Tonight" || day === "Tomorrow" || day === "Today"
      ? day
      : day
        ? day.toUpperCase()
        : "TOGETHER")
  ).toUpperCase();

  // Headline: Dinner with Jordan — never "Dinner Thursday Thursday"
  let headline = "";
  if (what && who) {
    const whoInWhat = what.toLowerCase().includes(who.toLowerCase());
    headline = whoInWhat ? what : `${what} with ${who}`;
  } else if (what) {
    headline = what;
  } else if (who) {
    headline = `With ${who}`;
  } else {
    headline = "Something is forming";
  }
  // Drop day/time from headline if they'll live on primary
  headline = stripRedundant(headline, [day, clock, "Thursday", "tonight", "tomorrow"]);

  // Primary: time · venue OR day · time if no venue
  const primaryParts: string[] = [];
  const shown: string[] = [kicker, headline];

  if (clock) {
    // If kicker already carries the day (TONIGHT / THURSDAY / …), only show clock
    const kickerOwnsDay =
      kicker === "TONIGHT" ||
      kicker === "TOMORROW" ||
      kicker === "TODAY" ||
      (day && kicker === day.toUpperCase());
    if (kickerOwnsDay) {
      primaryParts.push(clock);
    } else if (day) {
      primaryParts.push(`${shortWeekday(day)} · ${clock}`);
    } else {
      primaryParts.push(clock);
    }
    shown.push(day, clock);
  } else if (day && kicker !== day.toUpperCase()) {
    primaryParts.push(day);
    shown.push(day);
  }

  if (where) {
    primaryParts.push(where);
    shown.push(where);
  } else if (gap) {
    primaryParts.push(gap);
    shown.push(gap);
  }

  const primary = primaryParts.length ? primaryParts.join(" · ") : null;

  // Secondary: area · distance / leave — never restate time/day
  const secondaryParts: string[] = [];
  if (area && !primary?.toLowerCase().includes(area.toLowerCase())) {
    secondaryParts.push(area);
  }
  if (distance) secondaryParts.push(distance);
  if (leaveAround) secondaryParts.push(leaveAround);
  const secondary =
    secondaryParts.length > 0
      ? stripRedundant(secondaryParts.join(" · "), shown)
      : null;

  // Home presence: WHAT · compact when — gap on detail only once
  const presenceTitle = what || headline;
  const presenceDetailParts: string[] = [];
  if (who && !presenceTitle.toLowerCase().includes(who.toLowerCase())) {
    // who is usually the row label — skip
  }
  if (clock) {
    // Home row has no separate kicker — compact day · clock once
    if (day && day !== "Tonight" && day !== "Tomorrow" && day !== "Today") {
      presenceDetailParts.push(`${shortWeekday(day)} · ${clock}`);
    } else if (day === "Tonight" || day === "Tomorrow" || day === "Today") {
      presenceDetailParts.push(`${day} · ${clock}`);
    } else {
      presenceDetailParts.push(clock);
    }
  } else if (day) {
    presenceDetailParts.push(shortWeekday(day));
  }
  if (where) presenceDetailParts.push(where);
  else if (gap) presenceDetailParts.push(gap);

  return {
    kicker,
    headline: headline || "Something is forming",
    primary: primary
      ? dedupeTemporalLabel(stripRedundant(primary, [kicker]) || "")
      : null,
    secondary: secondary || null,
    presenceTitle: stripRedundant(presenceTitle, []),
    presenceDetail: dedupeTemporalLabel(presenceDetailParts.join(" · ")),
  };
}

function extractDayFromText(text: string): string {
  if (!text) return "";
  if (/tonight/i.test(text)) return "Tonight";
  if (/tomorrow/i.test(text)) return "Tomorrow";
  if (/today/i.test(text)) return "Today";
  const m = text.match(
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  );
  return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() : "";
}

function extractTimeFromText(text: string): string {
  if (!text) return "";
  const m = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (!m) return "";
  const h = m[1];
  const min = m[2] || "00";
  const ap = m[3] || "";
  return ap ? `${h}:${min} ${ap}` : `${h}:${min}`;
}

const SHORT_TO_LONG_DAY: Record<string, string> = {
  mon: "monday",
  tue: "tuesday",
  wed: "wednesday",
  thu: "thursday",
  fri: "friday",
  sat: "saturday",
  sun: "sunday",
};

/** Canonical day key for short+long collision (Thu / Thursday). */
export function dayCanonicalKey(token: string): string | null {
  const t = token.toLowerCase().replace(/\./g, "").trim();
  if (
    /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tonight|tomorrow|today)$/.test(
      t,
    )
  ) {
    return t;
  }
  if (SHORT_TO_LONG_DAY[t]) return SHORT_TO_LONG_DAY[t];
  return null;
}

/**
 * Semantic key for chronology filament dedupe — collapses equivalent
 * dinner/time snapshots so only dimension transitions render.
 */
export function filamentSemanticKey(label: string | null | undefined): string {
  if (!label) return "";
  let s = dedupeTemporalLabel(String(label)).toLowerCase();
  s = s
    .replace(/\b(mon|tue|wed|thu|fri|sat|sun)\b/g, (m) => SHORT_TO_LONG_DAY[m] || m)
    .replace(/\s+/g, " ")
    .replace(/[·|,]+/g, " ")
    .trim();
  return s;
}

/** Strip activity words for temporal-core comparison. */
function temporalCore(key: string): string {
  return key
    .replace(/\b(dinner|coffee|lunch|brunch|drinks|plans?)\b/g, " ")
    .replace(/\baround\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when next label is a non-upgrade restatement of prev (same dimensions). */
export function isRedundantFilamentLabel(
  prev: string | null | undefined,
  next: string | null | undefined,
): boolean {
  const a = filamentSemanticKey(prev);
  const b = filamentSemanticKey(next);
  if (!a || !b) return false;
  if (a === b) return true;
  // Substring restatement without new place token
  const placeRe =
    /\b(juniper|harbor|campfire|ivy|restaurant|table|wood|italy|park)\b/;
  const aPlace = placeRe.test(a);
  const bPlace = placeRe.test(b);
  // Place upgrade is never redundant
  if (bPlace && !aPlace) return false;
  if (b.includes(a) && !bPlace) return true;
  if (a.includes(b) && aPlace === bPlace) return true;
  // Same temporal core (Thursday 6:30) with/without "Dinner" / "around"
  const ta = temporalCore(a);
  const tb = temporalCore(b);
  if (ta && tb && (ta === tb || ta.includes(tb) || tb.includes(ta)) && aPlace === bPlace) {
    return true;
  }
  if (!bPlace && aPlace && b.replace(/\s+/g, "").length < a.replace(/\s+/g, "").length)
    return true;
  return false;
}

/** Remove duplicate weekday/time fragments inside a freeform label. */
export function dedupeTemporalLabel(label: string): string {
  if (!label) return "";
  let s = label.trim();
  // Collapse "Thursday · Thursday"
  s = s.replace(/\b(\w+)\s*[·,]\s*\1\b/gi, "$1");
  // Collapse "Thu · Thursday" / "Thursday · Thu"
  s = s.replace(
    /\b(mon|tue|wed|thu|fri|sat|sun)\b\s*[·,]\s*\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
    (_m, _short, long) => long,
  );
  s = s.replace(
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b\s*[·,]\s*\b(mon|tue|wed|thu|fri|sat|sun)\b/gi,
    (_m, long) => long,
  );
  const seen = new Set<string>();
  const seenDays = new Set<string>();
  const parts = s.split(/\s*[·|]\s*/);
  const out: string[] = [];
  for (const p of parts) {
    const key = p.toLowerCase().replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    const dayKey = dayCanonicalKey(key);
    if (dayKey) {
      if (seenDays.has(dayKey)) continue;
      seenDays.add(dayKey);
      // Prefer short form in multi-part compact labels when long already would stack
      out.push(p.trim());
      seen.add(key);
      continue;
    }
    // Part contains a day word already seen alone
    const embeddedDay = key.match(
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|thu|mon|tue|wed|fri|sat|sun)\b/,
    );
    if (embeddedDay) {
      const ek = dayCanonicalKey(embeddedDay[1]);
      if (ek && seenDays.has(ek) && /^\d/.test(key.replace(embeddedDay[1], "").trim()) === false) {
        // pure day-ish already handled
      } else if (ek && seenDays.has(ek)) {
        // "Thursday 6:30" after "Thu" — strip day from this part, keep clock
        const stripped = p
          .replace(
            /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|thu|mon|tue|wed|fri|sat|sun)\b/gi,
            "",
          )
          .replace(/^\s*[·,]\s*|\s*[·,]\s*$/g, "")
          .trim();
        if (stripped && !seen.has(stripped.toLowerCase())) {
          out.push(stripped);
          seen.add(stripped.toLowerCase());
        }
        continue;
      } else if (ek) {
        seenDays.add(ek);
      }
    }
    seen.add(key);
    out.push(p.trim());
  }
  return out.join(" · ");
}

// silence unused regex if tree-shaken
void WEEKDAYS;
void TIME_TOKEN;
void TONIGHT_LIKE;
