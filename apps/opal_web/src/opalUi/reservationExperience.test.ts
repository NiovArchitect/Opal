import { describe, expect, it } from "vitest";
import {
  authorizationCopy,
  ctaForPhase,
  detectExecutionDrift,
  emptyExecutionUx,
  failedBookingDoesNotDestroyReality,
  heldDoesNotRenderConfirmed,
  looksGoodDoesNotBook,
  momentCreatorNotNotifiedOfPrivateBooking,
  phaseFromServerStatus,
  presentAvailabilitySlots,
  realityChangeDoesNotModifyBooking,
  reconstructFromServer,
  reduceExecutionUx,
  socialReadyForExecution,
  PASS18_HOLDS,
} from "./reservationExperience";

describe("EXEC-UX-01 available → authorize → confirm", () => {
  it("progresses CTAs without showing all actions", () => {
    let s = emptyExecutionUx();
    s = reduceExecutionUx(s, {
      type: "PLACE_SELECTED",
      placeName: "Juniper & Ivy",
      whenLabel: "Thursday · 7:30 PM",
      partySize: 2,
    });
    expect(s.phase).toBe("place_selected");
    expect(s.primaryLabel).toBe("Check availability");

    s = reduceExecutionUx(s, { type: "CHECK_AVAILABILITY" });
    expect(s.phase).toBe("checking_availability");
    expect(s.primaryCta).toBe("none");

    s = reduceExecutionUx(s, {
      type: "AVAILABILITY_RESULT",
      available: true,
      slots: [
        { slot_id: "s1", label: "7:30 PM" },
        { slot_id: "s2", label: "7:45 PM" },
      ],
    });
    expect(s.phase).toBe("available");
    expect(s.consequence).toBe("7:30 PM is available.");
    expect(s.primaryLabel).toBe("Reserve 7:30 PM");
    expect(s.slots).toHaveLength(2);

    s = reduceExecutionUx(s, { type: "OPEN_AUTHORIZE" });
    expect(s.phase).toBe("authorize");
    expect(s.authCopy).toContain("Juniper & Ivy");
    expect(s.authCopy).toContain("7:30");
    expect(s.primaryLabel).toBe("Confirm");

    s = reduceExecutionUx(s, { type: "CONFIRM_TAP" });
    expect(s.phase).toBe("pending");
    expect(s.confirmPending).toBe(true);
    expect(s.consequence).toBe("Reserving…");

    // double tap no-op
    const again = reduceExecutionUx(s, { type: "CONFIRM_TAP" });
    expect(again.phase).toBe("pending");

    s = reduceExecutionUx(s, {
      type: "SERVER_EXECUTION",
      status: "confirmed",
      executionId: "e1",
      slotLabel: "7:30 PM",
      placeName: "Juniper & Ivy",
      partySize: 2,
      bookedByName: "Sadeil",
    });
    expect(s.phase).toBe("confirmed");
    expect(s.consequence).toMatch(/reserved|confirmed/i);
    expect(s.isPayout).toBe(false);
    expect(s.liveClaimed).toBe(false);
  });
});

describe("EXEC-UX-02 expired slot", () => {
  it("requires fresh check without TTL jargon", () => {
    let s = emptyExecutionUx({
      phase: "available",
      placeName: "Juniper & Ivy",
      whenLabel: "7:30 PM",
    });
    s = reduceExecutionUx(s, {
      type: "AVAILABILITY_RESULT",
      available: false,
      expired: true,
      slots: [],
    });
    expect(s.phase).toBe("expired");
    expect(s.consequence).toBe("That time needs a fresh check.");
    expect(s.primaryLabel).toBe("Check again");
  });
});

describe("EXEC-UX-03 timeout → reconcile", () => {
  it("shows checking copy not failure", () => {
    let s = emptyExecutionUx();
    s = reduceExecutionUx(s, {
      type: "SERVER_EXECUTION",
      status: "reconciling",
      executionId: "e-to",
    });
    expect(s.phase).toBe("reconciling");
    expect(s.consequence).toBe("Checking that reservation…");
    expect(s.primaryCta).toBe("none");

    s = reduceExecutionUx(s, {
      type: "SERVER_EXECUTION",
      status: "confirmed",
      executionId: "e-to",
      slotLabel: "7:30 PM",
    });
    expect(s.phase).toBe("confirmed");
  });
});

describe("EXEC-UX-04 failed preserves reality concept", () => {
  it("failed booking does not destroy reality", () => {
    expect(failedBookingDoesNotDestroyReality()).toBe(true);
    let s = reduceExecutionUx(emptyExecutionUx(), {
      type: "SERVER_EXECUTION",
      status: "failed",
      slotLabel: "7:30 PM",
    });
    expect(s.phase).toBe("failed");
    expect(s.consequence).toMatch(/still intact/i);
  });
});

describe("EXEC-UX-05 cancel", () => {
  it("requires confirm cancel step", () => {
    let s = reduceExecutionUx(emptyExecutionUx(), {
      type: "SERVER_EXECUTION",
      status: "confirmed",
      executionId: "e1",
      slotLabel: "7:30 PM",
      placeName: "Juniper & Ivy",
    });
    s = reduceExecutionUx(s, { type: "OPEN_CANCEL" });
    expect(s.phase).toBe("cancel_confirm");
    expect(s.primaryLabel).toBe("Yes, cancel");
    s = reduceExecutionUx(s, {
      type: "SERVER_EXECUTION",
      status: "cancelled",
      executionId: "e1",
    });
    expect(s.phase).toBe("cancelled");
    expect(s.consequence).toMatch(/cancelled/i);
  });
});

describe("EXEC-UX-06 execution drift", () => {
  it("detects time mismatch without auto-update", () => {
    const drift = detectExecutionDrift({
      realityWhen: "Thursday · 8:00 PM",
      reservationWhen: "Thursday · 7:30 PM",
      realityWhere: "Juniper & Ivy",
      reservationWhere: "Juniper & Ivy",
      executionStatus: "confirmed",
    });
    expect(drift).not.toBeNull();
    expect(drift?.kind).toBe("time");
    expect(drift?.humanCopy).toMatch(/still for/);
    expect(drift?.mayAutoUpdateBooking).toBe(false);
    expect(realityChangeDoesNotModifyBooking()).toBe(true);

    let s = reduceExecutionUx(emptyExecutionUx(), {
      type: "SERVER_EXECUTION",
      status: "confirmed",
      drift: drift!,
      slotLabel: "7:30 PM",
    });
    expect(s.phase).toBe("drift");
    expect(s.consequence).toMatch(/7:30/);
  });
});

describe("EXEC-UX-07 social moment attribution privacy", () => {
  it("moment creator is not product-notified of private booking", () => {
    expect(momentCreatorNotNotifiedOfPrivateBooking()).toBe(true);
  });
});

describe("property invariants", () => {
  it("reserve_cta_requires_availability / social readiness", () => {
    expect(
      socialReadyForExecution({
        placeName: "Juniper",
        whenLabel: "open",
        partySize: 2,
      }),
    ).toBe(false);
    expect(
      socialReadyForExecution({
        placeName: "Juniper",
        whenLabel: "Thursday · 7:30 PM",
        partySize: 2,
      }),
    ).toBe(true);
    expect(ctaForPhase("place_selected").primary).toBe("check_availability");
    expect(ctaForPhase("available").primary).toBe("reserve_slot");
  });

  it("looks_good_does_not_book", () => {
    expect(looksGoodDoesNotBook()).toBe(true);
  });

  it("double_tap_does_not_double_book at UX layer", () => {
    let s = reduceExecutionUx(emptyExecutionUx({ phase: "authorize" }), {
      type: "CONFIRM_TAP",
    });
    const id = s.phase;
    s = reduceExecutionUx(s, { type: "CONFIRM_TAP" });
    expect(s.phase).toBe(id);
    expect(s.confirmPending).toBe(true);
  });

  it("reconnect_does_not_show_stale_execution_state", () => {
    const s = reconstructFromServer({
      status: "reconciling",
      execution_id: "e9",
      slot_label: "7:30 PM",
      place_display_name: "Juniper & Ivy",
    });
    expect(s.phase).toBe("reconciling");
    expect(s.executionId).toBe("e9");
    expect(s.primaryCta).toBe("none");
  });

  it("held_does_not_render_confirmed", () => {
    expect(heldDoesNotRenderConfirmed("held")).toBe(true);
    expect(phaseFromServerStatus("held")).toBe("held");
    const s = reduceExecutionUx(emptyExecutionUx(), {
      type: "SERVER_EXECUTION",
      status: "held",
      slotLabel: "7:30 PM",
    });
    expect(s.phase).toBe("held");
    expect(s.consequence).toMatch(/Held/);
    expect(s.consequence).not.toMatch(/confirmed/i);
  });

  it("payment required stops without inventing card UI", () => {
    const s = reduceExecutionUx(emptyExecutionUx(), {
      type: "SERVER_EXECUTION",
      status: "failed",
      paymentRequired: true,
    });
    expect(s.phase).toBe("payment_required");
    expect(s.consequence).toMatch(/Payment required/);
  });

  it("authorization copy is human", () => {
    const copy = authorizationCopy({
      placeName: "Juniper & Ivy",
      whenLabel: "Thursday · 7:30 PM",
      partySize: 2,
    });
    expect(copy).not.toMatch(/idempotency|TTL|execution_id|provider_status/i);
  });

  it("presentAvailabilitySlots strips tech", () => {
    const slots = presentAvailabilitySlots([
      { slot_id: "abc", label: "7:30 PM", id: "hidden" },
    ]);
    expect(slots[0].label).toBe("7:30 PM");
    expect(slots[0].slotId).toBe("abc");
  });

  it("pass18 holds remain open", () => {
    const s = emptyExecutionUx();
    expect(s.pass18Holds).toEqual([...PASS18_HOLDS]);
    expect(s.pass18Holds).toContain("390_audience_selector_ux_closed_pass23");
    expect(s.pass18Holds).toContain("realtime_pubsub_audience_routing_closed_pass23");
  });
});
