export type PrimaryTab = "home" | "chats" | "plans" | "you";

export type NeedsYouItem = {
  id: string;
  source_type: string;
  title: string;
  explanation: string;
  primary_action: string;
  secondary_action?: string | null;
  urgency_class?: string;
  privacy_class?: string;
  conversation_id?: string | null;
  no_engagement_score?: boolean;
};

export type ComingUpItem = {
  id: string;
  title: string;
  when_label?: string | null;
  who_label?: string | null;
  where_label?: string | null;
  state: string;
  conversation_id?: string | null;
};

export type HomeSnapshot = {
  greeting: string;
  needs_you: NeedsYouItem[];
  needs_you_empty_copy: string | null;
  coming_up: ComingUpItem[];
  recent_changes: { id: string; title: string; explanation: string }[];
  quiet_success: boolean;
  connection_state: string;
  role_context: { kind: string; home_variant?: string };
  no_engagement_counts: boolean;
  no_relationship_ranking: boolean;
  no_streaks: boolean;
};

export type SignalFamily =
  | "possibility"
  | "needs_action"
  | "change"
  | "completion"
  | "clarification"
  | "safety"
  | "continuity"
  | "quiet_information";
