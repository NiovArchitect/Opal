/**
 * Client mirror of PlaceOptionComposition / PreferenceMemory precedence.
 * Memory assists ranking; never settles place authority; never discloses private prefs in UI.
 */

export type PlaceCandidate = {
  id: string;
  name: string;
  area: string;
  quiet?: boolean;
  cuisine?: string;
  score?: number;
};

export type PrefFact = {
  preference: string;
  polarity?: string;
  weight_class?: string;
  scope?: string;
  confidence?: number;
  revoked?: boolean;
};

export type PlaceComposeInput = {
  candidates: PlaceCandidate[];
  placeGapLabel?: string | null;
  category?: string | null;
  currentIntent?: "lively" | "quiet" | null;
  relationshipPrefs?: PrefFact[];
  /** Fixed venue / WHERE already known → skip restaurant memory ranking */
  whereKnown?: boolean;
  fixedEvent?: boolean;
  threadText?: string;
};

export type PlaceComposeResult = {
  ranked: PlaceCandidate[];
  /** Internal fit reasons — not for peer disclosure */
  reasons: Record<string, string[]>;
  episodeCategory: string | null;
  currentIntent: "lively" | "quiet" | null;
  irrelevant?: boolean;
};

const DEFAULT_FIXTURE: PlaceCandidate[] = [
  { id: "juniper", name: "Juniper & Ivy", area: "Little Italy", quiet: true, cuisine: "italian", score: 4.6 },
  { id: "harbor", name: "Harbor Table", area: "Waterfront", quiet: true, cuisine: "american", score: 4.7 },
  { id: "campfire", name: "Campfire", area: "North Park", quiet: false, cuisine: "american", score: 4.2 },
];

export function detectCurrentIntent(text: string | null | undefined): "lively" | "quiet" | null {
  if (!text) return null;
  if (/\blively|loud|energetic|busy|nightlife\b/i.test(text)) return "lively";
  if (/\bquiet|chill|calm|intimate|hear each other\b/i.test(text)) return "quiet";
  return null;
}

export function episodeCategoryFrom(input: {
  placeGapLabel?: string | null;
  category?: string | null;
}): string | null {
  if (input.category && input.category.trim()) return input.category.toLowerCase();
  const label = input.placeGapLabel || "";
  if (/italian/i.test(label)) return "italian";
  if (/sushi/i.test(label)) return "sushi";
  if (/coffee/i.test(label)) return "coffee";
  return null;
}

function weight(p: PrefFact): number {
  switch (p.weight_class) {
    case "explicit_current":
      return 1.0;
    case "relationship_specific":
      return 0.8;
    case "repeated_behavior":
      return 0.7;
    case "old_statement":
      return 0.35;
    case "inferred":
      return 0.25;
    default:
      return 0.5;
  }
}

/**
 * Rank place options. Current intent beats relationship quiet memory.
 * Episode category compounds with memory (quiet Italian) rather than replacing either.
 */
export function composePlaceOptions(input: PlaceComposeInput): PlaceComposeResult {
  if (input.fixedEvent || input.whereKnown) {
    return {
      ranked: [],
      reasons: {},
      episodeCategory: null,
      currentIntent: null,
      irrelevant: true,
    };
  }

  const intent =
    input.currentIntent ?? detectCurrentIntent(input.threadText) ?? null;
  const category = episodeCategoryFrom(input);
  const prefs = (input.relationshipPrefs || []).filter((p) => !p.revoked);
  const candidates = (input.candidates?.length ? input.candidates : DEFAULT_FIXTURE).map((c) => ({
    ...c,
    score: c.score ?? 3,
  }));

  const scored = candidates.map((c) => {
    let score = c.score ?? 3;
    const reasons: string[] = [];
    const cuisine = (c.cuisine || "").toLowerCase();

    if (category && cuisine === category) {
      score += 1.0;
      reasons.push(`${category} matches current evidence`);
    } else if (category && cuisine !== category) {
      score -= 0.35;
    }

    if (intent === "lively") {
      if (c.quiet === false) {
        score += 1.2;
        reasons.push("lively fits what you said tonight");
      } else {
        score -= 0.9;
      }
    } else if (intent === "quiet") {
      if (c.quiet === true) {
        score += 0.6;
        reasons.push("quiet fits what you said tonight");
      } else {
        score -= 0.5;
      }
    } else {
      // Relationship memory only when not overridden by current intent
      for (const p of prefs) {
        const pref = (p.preference || "").toLowerCase();
        const pol = p.polarity || "prefer";
        const w = weight(p);
        if (/quiet/.test(pref) && pol === "prefer" && c.quiet === true) {
          score += w * 0.4;
          reasons.push("fits relationship preference");
        }
        if (category && pref.includes(category) && pol === "prefer" && cuisine === category) {
          score += w * 0.55;
        }
      }
    }

    return { ...c, score, _reasons: reasons };
  });

  scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const ranked = scored.slice(0, 3).map(({ _reasons, ...rest }) => rest);
  const reasons: Record<string, string[]> = {};
  for (const s of scored.slice(0, 3)) {
    reasons[s.id] = s._reasons || [];
  }

  return {
    ranked,
    reasons,
    episodeCategory: category,
    currentIntent: intent,
  };
}

export function defaultPlaceCandidates(): PlaceCandidate[] {
  return DEFAULT_FIXTURE.map((c) => ({ ...c }));
}
