export type SocialFlowVisibility = "private" | "shared";

export type SignalKind =
  | "possible_plan"
  | "missing_detail"
  | "agreement"
  | "commitment"
  | "private_reminder"
  | "revision"
  | "reconnect_summary";

export type SocialFlowAction = {
  id: string;
  label: string;
};

export type SocialFlowSignal = {
  id: string;
  conversationId: string;
  proposalId?: string | null;
  planId?: string | null;
  commitmentId?: string | null;
  reminderId?: string | null;
  revisionId?: string | null;
  kind: SignalKind;
  status: string;
  copy: string;
  visibility: SocialFlowVisibility;
  actions: SocialFlowAction[];
  audienceUserId?: string | null;
  createdAt: string;
};

export type SharedPlanLocal = {
  id: string;
  conversationId: string;
  title: string;
  status: string;
  timeLabel?: string | null;
  createdAt: string;
};

export type PrivateReminderLocal = {
  id: string;
  planId?: string | null;
  ownerUserId: string;
  visibility: SocialFlowVisibility;
  contentSummary: string;
  status: string;
};
