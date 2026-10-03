/**
 * Track A8 — client mirror of SurfaceProjectionDecision.
 * Pure gating only: where to show an issue and how surfaces stay coherent.
 * Does not own SharedPlan, ConversationAlignment, or AttentionAuthority.
 */

export type SurfaceRole =
  | "required_responder"
  | "proposer"
  | "authorizer"
  | "observer"
  | "participant"
  | "commitment_owner"
  | "question_owner"
  | "waiting_on_owner"
  | "organizer";

export type SourceType =
  | "proposal"
  | "booking_authorization"
  | "open_question"
  | "commitment"
  | "provider_failure"
  | "recommendation"
  | "memory"
  | "plan_update"
  | "waiting_on"
  | "execution";

export type SurfaceProjectionFacts = {
  sourceType: SourceType;
  role: SurfaceRole;
  recipientUserId?: string | null;
  conversationId?: string | null;
  planId?: string | null;
  proposalId?: string | null;
  changeProposalValue?: string | null;
  currentPlanWhen?: string | null;
  place?: string | null;
  pendingChange?: boolean;
  upstreamUnsettled?: boolean;
  muted?: boolean;
  activeConversationViewerId?: string | null;
  attentionCarriesAction?: boolean;
  homeRelevance?: boolean;
  sourceId?: string | null;
  attentionId?: string | null;
  blockedBy?: string | null;
};

export type SurfaceProjectionDecision = {
  role: SurfaceRole;
  sourceType: SourceType;
  primarySurface: "thread" | "graph_detail" | "attention" | "none";
  canonicalActionTarget: {
    surface: "thread" | "graph_detail" | "none";
    focus: "change_proposal" | "reservation_auth" | "open_question" | "commitment" | null;
    conversationId: string | null;
    planId: string | null;
    proposalId: string | null;
  };
  projections: {
    thread: "action" | "waiting_status" | "settled" | "none";
    attention: "review_link" | "waiting" | "updated" | "none";
    graphDetail: "pending_status" | "current_only" | "execution_failed" | "commitment_visible";
    graphList: "compact_status";
    chats: "compact_consequence" | "none";
    home: "none" | "quiet_status" | "relevant";
    banner: "allow" | "suppress";
  };
  downstreamSuppressed: string[];
  prominentActionCount: number;
  proposerApprovalCtaCount: number;
  activeContext: boolean;
  projectionReason: string;
  multipleCanonicalActionImplementations: false;
  activeContextDuplicateAction: false;
  recommendationCrossSurfaceSpam: false;
  homeBypassesMuteAttention: false;
  bannerWhileCanonicalActionVisible: false;
  dismissBannerResolvesAction: false;
  downstreamActionCompetesWithUnsettledUpstream: false;
};

type CanonicalFocus = SurfaceProjectionDecision["canonicalActionTarget"]["focus"];
type PrimarySurface = SurfaceProjectionDecision["primarySurface"];
type CanonicalSurface = SurfaceProjectionDecision["canonicalActionTarget"]["surface"];
type Projections = SurfaceProjectionDecision["projections"];

const LAW_ZEROS = {
  multipleCanonicalActionImplementations: false,
  activeContextDuplicateAction: false,
  recommendationCrossSurfaceSpam: false,
  homeBypassesMuteAttention: false,
  bannerWhileCanonicalActionVisible: false,
  dismissBannerResolvesAction: false,
  downstreamActionCompetesWithUnsettledUpstream: false,
} as const;

function normalizeSourceType(raw: string | null | undefined): SourceType | "unknown" {
  const t = (raw || "").toLowerCase();
  switch (t) {
    case "proposal":
    case "time_proposal_pending":
    case "change_proposal":
      return "proposal";
    case "booking_authorization":
    case "reservation_auth":
    case "booking_auth":
      return "booking_authorization";
    case "provider_failure":
    case "booking_failed":
      return "provider_failure";
    case "commitment":
    case "commitment_due":
      return "commitment";
    case "recommendation":
      return "recommendation";
    case "memory":
      return "memory";
    case "open_question":
      return "open_question";
    case "waiting_on":
      return "waiting_on";
    case "plan_update":
      return "plan_update";
    case "execution":
      return "execution";
    default:
      return "unknown";
  }
}

function normalizeRole(raw: string | null | undefined): SurfaceRole {
  const r = (raw || "").toLowerCase();
  switch (r) {
    case "required_responder":
    case "responder":
      return "required_responder";
    case "proposer":
      return "proposer";
    case "authorizer":
      return "authorizer";
    case "observer":
      return "observer";
    case "commitment_owner":
      return "commitment_owner";
    case "question_owner":
      return "question_owner";
    case "waiting_on_owner":
      return "waiting_on_owner";
    case "organizer":
      return "organizer";
    case "participant":
    default:
      return "participant";
  }
}

function activeContext(facts: SurfaceProjectionFacts): boolean {
  const recipient = facts.recipientUserId;
  const viewer = facts.activeConversationViewerId;
  return !!(recipient && viewer && recipient === viewer);
}

function homeForPending(homeRelevance: boolean, muted: boolean): Projections["home"] {
  if (homeRelevance && !muted) return "quiet_status";
  return "none";
}

function bannerFor(active: boolean, muted: boolean): Projections["banner"] {
  if (active || muted) return "suppress";
  return "allow";
}

function canonicalTarget(
  facts: SurfaceProjectionFacts,
  surface: CanonicalSurface,
  focus: CanonicalFocus,
): SurfaceProjectionDecision["canonicalActionTarget"] {
  return {
    surface,
    focus,
    conversationId: facts.conversationId ?? null,
    planId: facts.planId ?? null,
    proposalId: facts.proposalId ?? null,
  };
}

function finish(
  role: SurfaceRole,
  sourceType: SourceType,
  primary: PrimarySurface,
  canonical: SurfaceProjectionDecision["canonicalActionTarget"],
  projections: Projections,
  reason: string,
  prominent: number,
  proposerCta: number,
  downstream: string[],
  active: boolean,
): SurfaceProjectionDecision {
  return {
    role,
    sourceType,
    primarySurface: primary,
    canonicalActionTarget: canonical,
    projections,
    downstreamSuppressed: downstream,
    prominentActionCount: prominent,
    proposerApprovalCtaCount: proposerCta,
    activeContext: active,
    projectionReason: reason,
    ...LAW_ZEROS,
  };
}

export function suppressDownstreamAction(facts: SurfaceProjectionFacts): boolean {
  if (facts.upstreamUnsettled || facts.pendingChange) return true;
  const blocked = (facts.blockedBy || "").toLowerCase();
  return blocked.includes("proposal");
}

export function decideSurfaceProjection(facts: SurfaceProjectionFacts): SurfaceProjectionDecision {
  const sourceType = normalizeSourceType(facts.sourceType) as SourceType | "unknown";
  const role = normalizeRole(facts.role);
  const active = activeContext(facts);
  const muted = facts.muted === true;
  const homeRelevance = facts.homeRelevance === true;

  if (sourceType === "proposal" && role === "required_responder") {
    const banner = bannerFor(active, muted);
    const home = homeForPending(homeRelevance, muted);
    return finish(
      role,
      "proposal",
      "thread",
      canonicalTarget(facts, "thread", "change_proposal"),
      {
        thread: "action",
        attention: "review_link",
        graphDetail: "pending_status",
        graphList: "compact_status",
        chats: "compact_consequence",
        home,
        banner,
      },
      "proposal_responder_action",
      1,
      0,
      [],
      active,
    );
  }

  if (sourceType === "proposal" && role === "proposer") {
    const home = homeForPending(homeRelevance, false);
    return finish(
      role,
      "proposal",
      "thread",
      canonicalTarget(facts, "thread", "change_proposal"),
      {
        thread: "waiting_status",
        attention: "waiting",
        graphDetail: "pending_status",
        graphList: "compact_status",
        chats: "compact_consequence",
        home,
        banner: "suppress",
      },
      "proposal_proposer_waiting",
      0,
      0,
      [],
      active,
    );
  }

  if (sourceType === "booking_authorization") {
    if (suppressDownstreamAction(facts)) {
      const home = homeForPending(homeRelevance, muted);
      const responder = role === "required_responder";
      return finish(
        role,
        "booking_authorization",
        "thread",
        canonicalTarget(facts, "thread", "change_proposal"),
        {
          thread: responder ? "action" : "waiting_status",
          attention: responder ? "review_link" : "waiting",
          graphDetail: "pending_status",
          graphList: "compact_status",
          chats: "compact_consequence",
          home,
          banner: "suppress",
        },
        "booking_auth_suppressed_by_upstream_proposal",
        responder ? 1 : 0,
        0,
        ["reservation_auth"],
        active,
      );
    }

    const banner = bannerFor(active, muted);
    const home = homeForPending(homeRelevance, muted);
    const actionRole =
      role === "authorizer" || role === "required_responder" || role === "organizer";
    const primary: PrimarySurface = actionRole ? "thread" : "attention";
    return finish(
      role,
      "booking_authorization",
      primary,
      canonicalTarget(facts, primary === "thread" ? "thread" : "none", actionRole ? "reservation_auth" : null),
      {
        thread: actionRole ? "action" : "none",
        attention: actionRole ? "review_link" : "updated",
        graphDetail: "pending_status",
        graphList: "compact_status",
        chats: "compact_consequence",
        home,
        banner,
      },
      "booking_authorization",
      actionRole ? 1 : 0,
      0,
      [],
      active,
    );
  }

  if (sourceType === "provider_failure" || sourceType === "execution") {
    const banner = bannerFor(active, muted);
    const home = homeForPending(homeRelevance, muted);
    const ownsThread = !!(facts.conversationId && facts.conversationId.length > 0);
    const actionRole =
      role === "authorizer" ||
      role === "required_responder" ||
      role === "organizer" ||
      role === "commitment_owner";
    const thread: Projections["thread"] =
      ownsThread && actionRole ? "action" : ownsThread ? "waiting_status" : "none";
    const primary: PrimarySurface = thread === "action" ? "thread" : "attention";
    return finish(
      role,
      sourceType === "execution" ? "execution" : "provider_failure",
      primary,
      canonicalTarget(
        facts,
        primary === "thread" ? "thread" : "none",
        thread === "action" ? "reservation_auth" : null,
      ),
      {
        thread,
        attention: "review_link",
        graphDetail: "execution_failed",
        graphList: "compact_status",
        chats: "compact_consequence",
        home,
        banner,
      },
      "provider_failure",
      thread === "action" || actionRole ? 1 : 0,
      0,
      [],
      active,
    );
  }

  if (sourceType === "commitment") {
    const banner = bannerFor(active, muted);
    const home: Projections["home"] = homeRelevance && !muted ? "relevant" : "none";
    return finish(
      role,
      "commitment",
      "attention",
      canonicalTarget(facts, "graph_detail", "commitment"),
      {
        thread: "none",
        attention: "review_link",
        graphDetail: "commitment_visible",
        graphList: "compact_status",
        chats: "compact_consequence",
        home,
        banner,
      },
      "commitment_due",
      1,
      0,
      [],
      active,
    );
  }

  if (sourceType === "recommendation") {
    return finish(
      role,
      "recommendation",
      "none",
      { surface: "none", focus: null, conversationId: null, planId: null, proposalId: null },
      {
        thread: "none",
        attention: "none",
        graphDetail: "current_only",
        graphList: "compact_status",
        chats: "none",
        home: "none",
        banner: "suppress",
      },
      "recommendation_silent",
      0,
      0,
      [],
      active,
    );
  }

  if (sourceType === "memory") {
    return finish(
      role,
      "memory",
      "none",
      { surface: "none", focus: null, conversationId: null, planId: null, proposalId: null },
      {
        thread: "none",
        attention: "none",
        graphDetail: "current_only",
        graphList: "compact_status",
        chats: "none",
        home: "none",
        banner: "suppress",
      },
      "memory_silent",
      0,
      0,
      [],
      active,
    );
  }

  if (sourceType === "open_question") {
    const banner = bannerFor(active, muted);
    const home = homeForPending(homeRelevance, muted);
    const actionRole = role === "required_responder" || role === "question_owner";
    return finish(
      role,
      "open_question",
      "thread",
      canonicalTarget(facts, "thread", actionRole ? "open_question" : null),
      {
        thread: actionRole ? "action" : "waiting_status",
        attention: actionRole ? "review_link" : "waiting",
        graphDetail: "pending_status",
        graphList: "compact_status",
        chats: "compact_consequence",
        home,
        banner,
      },
      "open_question",
      actionRole ? 1 : 0,
      0,
      [],
      active,
    );
  }

  if (sourceType === "waiting_on") {
    const home = homeForPending(homeRelevance, false);
    const owner = role === "waiting_on_owner" || role === "required_responder";
    return finish(
      role,
      "waiting_on",
      "attention",
      canonicalTarget(facts, "thread", null),
      {
        thread: "waiting_status",
        attention: owner ? "waiting" : "none",
        graphDetail: "pending_status",
        graphList: "compact_status",
        chats: "compact_consequence",
        home,
        banner: "suppress",
      },
      "waiting_on",
      0,
      0,
      [],
      active,
    );
  }

  if (sourceType === "plan_update") {
    const home: Projections["home"] = homeRelevance ? "quiet_status" : "none";
    return finish(
      role,
      "plan_update",
      "attention",
      canonicalTarget(facts, "none", null),
      {
        thread: "settled",
        attention: "updated",
        graphDetail: "current_only",
        graphList: "compact_status",
        chats: "compact_consequence",
        home,
        banner: "suppress",
      },
      "plan_update",
      0,
      0,
      [],
      active,
    );
  }

  const banner = bannerFor(active, muted);
  const home = homeForPending(homeRelevance, muted);
  return finish(
    role,
    facts.sourceType,
    "none",
    canonicalTarget(facts, "none", null),
    {
      thread: "none",
      attention: "none",
      graphDetail: "current_only",
      graphList: "compact_status",
      chats: "none",
      home,
      banner,
    },
    "default_quiet",
    0,
    0,
    [],
    active,
  );
}

export function compactChatsConsequence(facts: {
  pendingChange?: boolean;
  changeProposalValue?: string | null;
  whenLabel?: string | null;
  place?: string | null;
  state?: "ready" | "action" | "forming";
}): string {
  const value = (facts.changeProposalValue || "").trim();
  if (facts.pendingChange && value) return `${value} proposed`;
  if (facts.state === "action") return "Action · Needs a response";
  if (facts.state === "forming") return "Forming";
  const when = (facts.whenLabel || "").replace(/\bTuesday\b/g, "Tue").replace(/ · /g, " ");
  return ["Ready", when, facts.place || ""].filter(Boolean).join(" · ");
}

export function graphPendingStatusLabel(facts: {
  pendingChange?: boolean;
  changeProposalValue?: string | null;
}): string | null {
  if (!facts.pendingChange) return null;
  const value = (facts.changeProposalValue || "").trim();
  if (value) return `${value} proposed`;
  return "Change proposed";
}

export function bannerAllowed(decision: SurfaceProjectionDecision): boolean {
  return decision.projections.banner === "allow";
}

export function shouldShowHomePending(decision: SurfaceProjectionDecision): boolean {
  return decision.projections.home === "quiet_status" || decision.projections.home === "relevant";
}

export function shouldShowReservationAuth(facts: {
  reservationAuthorizable?: boolean;
  pendingChange?: boolean;
  upstreamUnsettled?: boolean;
}): boolean {
  if (!facts.reservationAuthorizable) return false;
  if (facts.pendingChange || facts.upstreamUnsettled) return false;
  return true;
}
