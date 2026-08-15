/**
 * Experience Field presentation helpers (Pass 29).
 * Domain ranking lives in Elixir ExperienceField.
 * Client: density + editorial hierarchy only — not a second ranker.
 */

export type FieldCard = {
  moment_id?: string;
  author_user_id?: string;
  caption?: string;
  place_label?: string | null;
  from_followed_creator?: boolean;
  from_friend?: boolean;
  authority?: string;
  cta?: string;
  local_execution?: boolean;
  remote_experience_pattern_only?: boolean;
  commerce_led?: boolean;
};

export type ExperienceFieldView = {
  cards: FieldCard[];
  card_count: number;
  candidate_count: number;
  visible_cap: number;
  not_a_feed_engine: true;
  not_home_attention: true;
  editorial?: { dominant?: string | null; secondary?: string | null };
};

/** Viewport law: never show more than 5; prefer 1–3. */
export function clampFieldCards(cards: FieldCard[], cap = 3): FieldCard[] {
  const n = Math.max(1, Math.min(5, cap));
  return (cards || []).slice(0, n);
}

export function fieldIsFeed(cards: FieldCard[]): boolean {
  return (cards?.length || 0) > 5;
}

/** Soft origin label — not badge soup. */
export function originLabel(card: FieldCard): string | null {
  if (card.from_friend || card.authority === "friend") return null; // friend Moments need no badge
  if (card.from_followed_creator || card.authority === "following") return "Following";
  if (card.authority === "open_event") return "Open";
  return null;
}

export function presentField(server: {
  cards?: FieldCard[];
  candidate_count?: number;
  card_count?: number;
  visible_cap?: number;
  editorial_hierarchy?: { dominant?: string; secondary?: string };
}): ExperienceFieldView {
  const cards = clampFieldCards(server.cards || [], server.visible_cap ?? 3);
  return {
    cards,
    card_count: cards.length,
    candidate_count: server.candidate_count ?? cards.length,
    visible_cap: server.visible_cap ?? 3,
    not_a_feed_engine: true,
    not_home_attention: true,
    editorial: {
      dominant: server.editorial_hierarchy?.dominant ?? cards[0]?.moment_id ?? null,
      secondary: server.editorial_hierarchy?.secondary ?? cards[1]?.moment_id ?? null,
    },
  };
}
