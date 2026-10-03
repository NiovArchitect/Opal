import { describe, expect, it } from "vitest";
import {
  bannerAllowed,
  compactChatsConsequence,
  decideSurfaceProjection,
  graphPendingStatusLabel,
  shouldShowHomePending,
  shouldShowReservationAuth,
  suppressDownstreamAction,
} from "./surfaceProjection";

describe("surfaceProjection — responder / proposer", () => {
  it("responder 8pm: thread owns action, home none, banner suppress in active context", () => {
    const d = decideSurfaceProjection({
      sourceType: "proposal",
      role: "required_responder",
      recipientUserId: "walk-b",
      conversationId: "conv-1",
      planId: "plan-1",
      proposalId: "p-8pm",
      changeProposalValue: "8:00 PM",
      currentPlanWhen: "7:30 PM",
      activeConversationViewerId: "walk-b",
    });

    expect(d.prominentActionCount).toBe(1);
    expect(d.proposerApprovalCtaCount).toBe(0);
    expect(d.primarySurface).toBe("thread");
    expect(d.projections.thread).toBe("action");
    expect(d.projections.attention).toBe("review_link");
    expect(d.projections.graphDetail).toBe("pending_status");
    expect(d.projections.chats).toBe("compact_consequence");
    expect(d.projections.home).toBe("none");
    expect(d.projections.banner).toBe("suppress");
    expect(d.activeContext).toBe(true);
    expect(d.canonicalActionTarget.focus).toBe("change_proposal");
    expect(bannerAllowed(d)).toBe(false);
    expect(shouldShowHomePending(d)).toBe(false);
    expect(d.multipleCanonicalActionImplementations).toBe(false);
    expect(d.activeContextDuplicateAction).toBe(false);
  });

  it("proposer: waiting only — no approval CTA across surfaces", () => {
    const d = decideSurfaceProjection({
      sourceType: "proposal",
      role: "proposer",
      recipientUserId: "walk-a",
      conversationId: "conv-1",
      changeProposalValue: "8:00 PM",
    });

    expect(d.proposerApprovalCtaCount).toBe(0);
    expect(d.prominentActionCount).toBe(0);
    expect(d.projections.thread).toBe("waiting_status");
    expect(d.projections.attention).toBe("waiting");
    expect(d.projections.graphDetail).toBe("pending_status");
    expect(d.projections.banner).toBe("suppress");
  });
});

describe("surfaceProjection — dependency / mute / active context", () => {
  it("suppresses reservation when upstream proposal is unsettled", () => {
    const facts = {
      sourceType: "booking_authorization" as const,
      role: "authorizer" as const,
      pendingChange: true,
      upstreamUnsettled: true,
      changeProposalValue: "8:00 PM",
      conversationId: "conv-1",
    };
    expect(suppressDownstreamAction(facts)).toBe(true);
    const d = decideSurfaceProjection(facts);
    expect(d.downstreamSuppressed).toContain("reservation_auth");
    expect(d.canonicalActionTarget.focus).toBe("change_proposal");
    expect(d.projectionReason).toMatch(/suppressed/);
    expect(d.downstreamActionCompetesWithUnsettledUpstream).toBe(false);
  });

  it("mute: banner suppress and home stays none even with homeRelevance", () => {
    const d = decideSurfaceProjection({
      sourceType: "proposal",
      role: "required_responder",
      recipientUserId: "walk-b",
      conversationId: "conv-1",
      muted: true,
      homeRelevance: true,
      changeProposalValue: "8:00 PM",
    });

    expect(d.projections.banner).toBe("suppress");
    expect(d.projections.home).toBe("none");
    expect(d.projections.thread).toBe("action");
    expect(d.homeBypassesMuteAttention).toBe(false);
  });

  it("active context suppresses banner while thread keeps the action", () => {
    const d = decideSurfaceProjection({
      sourceType: "proposal",
      role: "required_responder",
      recipientUserId: "walk-b",
      activeConversationViewerId: "walk-b",
      conversationId: "conv-1",
    });

    expect(d.activeContext).toBe(true);
    expect(d.projections.banner).toBe("suppress");
    expect(d.projections.thread).toBe("action");
    expect(d.bannerWhileCanonicalActionVisible).toBe(false);
  });
});

describe("surfaceProjection — compact labels and reservation gate", () => {
  it("chats compact label uses pending proposal value", () => {
    expect(
      compactChatsConsequence({
        pendingChange: true,
        changeProposalValue: "8:00 PM",
        state: "forming",
        whenLabel: "Tuesday · Sep 29 · 7:30 PM",
        place: "Fort Oak",
      }),
    ).toBe("8:00 PM proposed");

    expect(
      graphPendingStatusLabel({
        pendingChange: true,
        changeProposalValue: "8:00 PM",
      }),
    ).toBe("8:00 PM proposed");
  });

  it("reservation auth hidden while change is pending", () => {
    expect(
      shouldShowReservationAuth({
        reservationAuthorizable: true,
        pendingChange: true,
        upstreamUnsettled: true,
      }),
    ).toBe(false);

    expect(
      shouldShowReservationAuth({
        reservationAuthorizable: true,
        pendingChange: false,
        upstreamUnsettled: false,
      }),
    ).toBe(true);

    expect(
      shouldShowReservationAuth({
        reservationAuthorizable: false,
        pendingChange: false,
      }),
    ).toBe(false);
  });

  it("home pending only when quiet_status or relevant", () => {
    const hidden = decideSurfaceProjection({
      sourceType: "proposal",
      role: "participant",
      attentionCarriesAction: true,
      homeRelevance: false,
      pendingChange: true,
    });
    expect(shouldShowHomePending(hidden)).toBe(false);

    const quiet = decideSurfaceProjection({
      sourceType: "proposal",
      role: "required_responder",
      homeRelevance: true,
      pendingChange: true,
    });
    expect(shouldShowHomePending(quiet)).toBe(true);
    expect(quiet.projections.home).toBe("quiet_status");
  });
});
