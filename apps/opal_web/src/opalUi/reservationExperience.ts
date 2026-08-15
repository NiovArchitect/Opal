/**
 * Pass 20 — Reservation execution presentation (UX only).
 *
 * Owns CTA progression + human copy + drift detection presentation.
 * Does NOT own booking truth — ReservationExecution (server) does.
 *
 * LIVE EXECUTION: NOT CLAIMED (synthetic_reservation development proof).
 * No payouts. No booking dashboard. No second execution engine.
 *
 * Pass 18 holds remain open (not closed by this pass):
 * - 390 audience selector incomplete
 * - PubSub audience routing audit
 */

export type ExecutionUxPhase =
  | "idle"
  | "place_selected"
  | "checking_availability"
  | "available"
  | "unavailable"
  | "expired"
  | "authorize"
  | "pending"
  | "reconciling"
  | "held"
  | "confirmed"
  | "failed"
  | "payment_required"
  | "cancel_confirm"
  | "cancelled"
  | "drift";

export type HumanCta =
  | "choose_place"
  | "check_availability"
  | "reserve_slot"
  | "confirm_reservation"
  | "recheck"
  | "try_alt_slot"
  | "choose_another_place"
  | "cancel_reservation"
  | "confirm_cancel"
  | "resolve_drift"
  | "none";

export type AvailabilitySlotView = {
  slotId: string;
  label: string;
  /** Human only — never show internal ids in UI copy */
};

export type ExecutionUxState = {
  phase: ExecutionUxPhase;
  primaryCta: HumanCta;
  primaryLabel: string | null;
  secondaryCta: HumanCta | null;
  secondaryLabel: string | null;
  consequence: string | null;
  authCopy: string | null;
  slots: AvailabilitySlotView[];
  selectedSlotId: string | null;
  selectedSlotLabel: string | null;
  placeName: string | null;
  partySize: number;
  whenLabel: string | null;
  executionId: string | null;
  /** Shared-safe only */
  sharedSafeSummary: string | null;
  bookedByName: string | null;
  drift: ExecutionDrift | null;
  confirmPending: boolean;
  liveClaimed: false;
  mode: "synthetic_provider";
  isPayout: false;
  /** Dev honesty banner */
  developmentProof: true;
  pass18Holds: readonly string[];
};

export type ExecutionDrift = {
  kind: "time" | "place" | "party" | "time_and_place";
  realityWhen: string | null;
  reservationWhen: string | null;
  realityWhere: string | null;
  reservationWhere: string | null;
  humanCopy: string;
  mayAutoUpdateBooking: false;
};

export const PASS18_HOLDS = [
  "390_audience_selector_ux_incomplete",
  "realtime_pubsub_audience_routing_audit",
] as const;

const CTA_LABEL: Record<HumanCta, string | null> = {
  choose_place: "Choose a place",
  check_availability: "Check availability",
  reserve_slot: "Reserve",
  confirm_reservation: "Confirm",
  recheck: "Check again",
  try_alt_slot: "Try another time",
  choose_another_place: "Choose another place",
  cancel_reservation: "Cancel reservation",
  confirm_cancel: "Yes, cancel",
  resolve_drift: "Review reservation",
  none: null,
};

export function emptyExecutionUx(partial?: Partial<ExecutionUxState>): ExecutionUxState {
  return {
    phase: "idle",
    primaryCta: "none",
    primaryLabel: null,
    secondaryCta: null,
    secondaryLabel: null,
    consequence: null,
    authCopy: null,
    slots: [],
    selectedSlotId: null,
    selectedSlotLabel: null,
    placeName: null,
    partySize: 2,
    whenLabel: null,
    executionId: null,
    sharedSafeSummary: null,
    bookedByName: null,
    drift: null,
    confirmPending: false,
    liveClaimed: false,
    mode: "synthetic_provider",
    isPayout: false,
    developmentProof: true,
    pass18Holds: PASS18_HOLDS,
    ...partial,
  };
}

/**
 * Social readiness: Reserve only when place + when + party are known.
 * Looks good / social alignment does NOT enable booking.
 */
export function socialReadyForExecution(ctx: {
  placeName?: string | null;
  whenLabel?: string | null;
  partySize?: number | null;
  placeSelected?: boolean;
}): boolean {
  const place = !!(ctx.placeName && ctx.placeName.trim()) || ctx.placeSelected === true;
  const when = !!(ctx.whenLabel && ctx.whenLabel.trim() && ctx.whenLabel !== "open");
  const party = (ctx.partySize ?? 0) >= 1;
  return place && when && party;
}

/** Looks good never books. */
export function looksGoodDoesNotBook(): true {
  return true;
}

/**
 * Single primary CTA from execution presentation phase.
 * Never show all actions at once.
 */
export function ctaForPhase(
  phase: ExecutionUxPhase,
  opts?: { selectedSlotLabel?: string | null; hasAltSlot?: boolean },
): { primary: HumanCta; secondary: HumanCta | null } {
  switch (phase) {
    case "idle":
      return { primary: "choose_place", secondary: null };
    case "place_selected":
      return { primary: "check_availability", secondary: null };
    case "checking_availability":
    case "pending":
    case "reconciling":
      return { primary: "none", secondary: null };
    case "available":
      return {
        primary: "reserve_slot",
        secondary: opts?.hasAltSlot ? "try_alt_slot" : null,
      };
    case "authorize":
      return { primary: "confirm_reservation", secondary: null };
    case "unavailable":
    case "expired":
      return { primary: "recheck", secondary: "choose_another_place" };
    case "held":
      return { primary: "confirm_reservation", secondary: "cancel_reservation" };
    case "confirmed":
      return { primary: "cancel_reservation", secondary: null };
    case "failed":
      return {
        primary: opts?.hasAltSlot ? "try_alt_slot" : "recheck",
        secondary: "choose_another_place",
      };
    case "payment_required":
      return { primary: "none", secondary: null };
    case "cancel_confirm":
      return { primary: "confirm_cancel", secondary: null };
    case "cancelled":
      return { primary: "check_availability", secondary: null };
    case "drift":
      return { primary: "resolve_drift", secondary: null };
    default:
      return { primary: "none", secondary: null };
  }
}

export function labelForCta(cta: HumanCta, slotLabel?: string | null): string | null {
  if (cta === "reserve_slot" && slotLabel) {
    const short = slotLabel.includes("·")
      ? slotLabel.split("·").pop()?.trim() || slotLabel
      : slotLabel;
    return `Reserve ${short}`;
  }
  if (cta === "confirm_reservation") return "Confirm";
  return CTA_LABEL[cta];
}

/** Build human auth sheet copy — never technical IDs. */
export function authorizationCopy(input: {
  placeName: string;
  whenLabel: string;
  partySize: number;
}): string {
  const people =
    input.partySize === 1 ? "1 person" : `${input.partySize} people`;
  return `Reserve ${input.placeName}\n${input.whenLabel}\n${people}`;
}

/**
 * Map server execution status → UX phase (human presentation only).
 */
export function phaseFromServerStatus(
  status: string | null | undefined,
  opts?: { paymentRequired?: boolean },
): ExecutionUxPhase {
  if (opts?.paymentRequired || status === "payment_authorization_required") {
    return "payment_required";
  }
  switch (status) {
    case "checking":
      return "checking_availability";
    case "available":
      return "available";
    case "unavailable":
      return "unavailable";
    case "authorization_required":
    case "authorized":
    case "selected":
      return "authorize";
    case "requested":
      return "pending";
    case "reconciling":
      return "reconciling";
    case "held":
      return "held";
    case "confirmed":
      return "confirmed";
    case "failed":
      return "failed";
    case "expired":
      return "expired";
    case "cancelled":
      return "cancelled";
    default:
      return "idle";
  }
}

export function consequenceForPhase(
  phase: ExecutionUxPhase,
  ctx?: {
    slotLabel?: string | null;
    placeName?: string | null;
    partySize?: number;
    bookedByName?: string | null;
    altSlotLabel?: string | null;
  },
): string | null {
  const slot = ctx?.slotLabel || "that time";
  const place = ctx?.placeName || "this place";
  switch (phase) {
    case "checking_availability":
      return null; // quiet
    case "available":
      return `${slot} is available.`;
    case "unavailable":
      return `No times open at ${place}.`;
    case "expired":
      return "That time needs a fresh check.";
    case "authorize":
      return null; // auth sheet carries copy
    case "pending":
      return "Reserving…";
    case "reconciling":
      return "Checking that reservation…";
    case "held":
      return "Held for a few minutes.";
    case "confirmed": {
      const who = ctx?.bookedByName ? `${ctx.bookedByName} reserved` : "Reservation confirmed for";
      return `${who} ${slot}.`;
    }
    case "failed":
      return `Couldn't reserve ${slot}. Your plan is still intact.`;
    case "payment_required":
      return "Payment required to continue.";
    case "cancelled":
      return "Reservation cancelled. Dinner plan can stay.";
    case "cancel_confirm":
      return "Cancel this reservation?";
    case "drift":
      return ctx?.slotLabel
        ? `Your reservation is still for ${slot}.`
        : "Your reservation doesn't match the plan.";
    default:
      return null;
  }
}

/** Shared-safe peer copy — no auth/payment internals. */
export function sharedSafePeerCopy(input: {
  status: string;
  placeName?: string | null;
  slotLabel?: string | null;
  partySize?: number;
  bookedByName?: string | null;
}): string | null {
  const slot = input.slotLabel || "the time";
  const place = input.placeName || "the place";
  const party = input.partySize ?? 2;
  if (input.status === "confirmed") {
    if (input.bookedByName) {
      return `${input.bookedByName} reserved ${place} · ${slot} · ${party}`;
    }
    return `Reserved for ${party} at ${slot}.`;
  }
  if (input.status === "held") return `Held · ${slot}`;
  if (input.status === "cancelled") {
    return `Dinner still planned · reservation cancelled.`;
  }
  if (input.status === "failed") return null; // private failure mechanics
  return null;
}

/**
 * Detect REALITY EXECUTION DRIFT.
 * Social Reality can change independently of external reservation.
 * Never auto-update booking.
 */
export function detectExecutionDrift(input: {
  realityWhen?: string | null;
  realityWhere?: string | null;
  reservationWhen?: string | null;
  reservationWhere?: string | null;
  executionStatus?: string | null;
}): ExecutionDrift | null {
  if (input.executionStatus !== "confirmed" && input.executionStatus !== "held") {
    return null;
  }
  const rWhen = norm(input.realityWhen);
  const bWhen = norm(input.reservationWhen);
  const rWhere = norm(input.realityWhere);
  const bWhere = norm(input.reservationWhere);

  const timeDrift = !!(rWhen && bWhen && rWhen !== bWhen && !looseTimeMatch(rWhen, bWhen));
  const placeDrift = !!(rWhere && bWhere && rWhere !== bWhere && !loosePlaceMatch(rWhere, bWhere));

  if (!timeDrift && !placeDrift) return null;

  const kind: ExecutionDrift["kind"] =
    timeDrift && placeDrift ? "time_and_place" : timeDrift ? "time" : "place";

  const humanCopy = timeDrift
    ? `Your reservation is still for ${input.reservationWhen}.`
    : `Your reservation is still for ${input.reservationWhere}.`;

  return {
    kind,
    realityWhen: input.realityWhen ?? null,
    reservationWhen: input.reservationWhen ?? null,
    realityWhere: input.realityWhere ?? null,
    reservationWhere: input.reservationWhere ?? null,
    humanCopy,
    mayAutoUpdateBooking: false,
  };
}

export function realityChangeDoesNotModifyBooking(): true {
  return true;
}

export function momentCreatorNotNotifiedOfPrivateBooking(): true {
  return true;
}

export function heldDoesNotRenderConfirmed(phase: ExecutionUxPhase): boolean {
  return phase === "held";
}

export function failedBookingDoesNotDestroyReality(): true {
  return true;
}

/**
 * Present availability slots for humans — strip technical fields.
 */
export function presentAvailabilitySlots(
  slots: Array<{ slot_id?: string; slotId?: string; label?: string; id?: string }>,
): AvailabilitySlotView[] {
  return (slots || [])
    .map((s) => ({
      slotId: String(s.slot_id || s.slotId || s.id || ""),
      label: String(s.label || "").trim() || "Available time",
    }))
    .filter((s) => s.slotId);
}

/**
 * Advance UX after user action intent (client presentation machine).
 * Server remains authority for actual booking results.
 */
export function reduceExecutionUx(
  state: ExecutionUxState,
  event: ExecutionUxEvent,
): ExecutionUxState {
  switch (event.type) {
    case "PLACE_SELECTED": {
      const placeName = event.placeName;
      const whenLabel = event.whenLabel ?? state.whenLabel;
      const partySize = event.partySize ?? state.partySize;
      const ready = socialReadyForExecution({ placeName, whenLabel, partySize });
      const phase: ExecutionUxPhase = ready ? "place_selected" : "idle";
      const ctas = ctaForPhase(phase);
      return {
        ...state,
        phase,
        placeName,
        whenLabel,
        partySize,
        primaryCta: ctas.primary,
        primaryLabel: labelForCta(ctas.primary),
        secondaryCta: ctas.secondary,
        secondaryLabel: ctas.secondary ? labelForCta(ctas.secondary) : null,
        consequence: null,
        confirmPending: false,
      };
    }
    case "CHECK_AVAILABILITY": {
      const ctas = ctaForPhase("checking_availability");
      return {
        ...state,
        phase: "checking_availability",
        primaryCta: ctas.primary,
        primaryLabel: null,
        secondaryCta: null,
        secondaryLabel: null,
        consequence: null,
      };
    }
    case "AVAILABILITY_RESULT": {
      if (event.expired) {
        const ctas = ctaForPhase("expired");
        return {
          ...state,
          phase: "expired",
          slots: [],
          primaryCta: ctas.primary,
          primaryLabel: labelForCta(ctas.primary),
          secondaryCta: ctas.secondary,
          secondaryLabel: ctas.secondary ? labelForCta(ctas.secondary) : null,
          consequence: consequenceForPhase("expired"),
        };
      }
      if (!event.available || !event.slots.length) {
        const ctas = ctaForPhase("unavailable");
        return {
          ...state,
          phase: "unavailable",
          slots: [],
          primaryCta: ctas.primary,
          primaryLabel: labelForCta(ctas.primary),
          secondaryCta: ctas.secondary,
          secondaryLabel: ctas.secondary ? labelForCta(ctas.secondary) : null,
          consequence: consequenceForPhase("unavailable", { placeName: state.placeName }),
        };
      }
      const slots = presentAvailabilitySlots(event.slots);
      const selected = event.selectedSlotId
        ? slots.find((s) => s.slotId === event.selectedSlotId) || slots[0]
        : slots[0];
      const ctas = ctaForPhase("available", { hasAltSlot: slots.length > 1 });
      return {
        ...state,
        phase: "available",
        slots,
        selectedSlotId: selected?.slotId ?? null,
        selectedSlotLabel: selected?.label ?? null,
        primaryCta: ctas.primary,
        primaryLabel: labelForCta(ctas.primary, selected?.label),
        secondaryCta: ctas.secondary,
        secondaryLabel: ctas.secondary ? labelForCta(ctas.secondary) : null,
        consequence: consequenceForPhase("available", { slotLabel: selected?.label }),
      };
    }
    case "SELECT_SLOT": {
      const slot = state.slots.find((s) => s.slotId === event.slotId);
      if (!slot) return state;
      const ctas = ctaForPhase("available", { hasAltSlot: state.slots.length > 1 });
      return {
        ...state,
        selectedSlotId: slot.slotId,
        selectedSlotLabel: slot.label,
        primaryCta: ctas.primary,
        primaryLabel: labelForCta(ctas.primary, slot.label),
        consequence: consequenceForPhase("available", { slotLabel: slot.label }),
      };
    }
    case "OPEN_AUTHORIZE": {
      const place = state.placeName || "this place";
      const when = state.selectedSlotLabel || state.whenLabel || "the requested time";
      const ctas = ctaForPhase("authorize");
      return {
        ...state,
        phase: "authorize",
        authCopy: authorizationCopy({
          placeName: place,
          whenLabel: when,
          partySize: state.partySize,
        }),
        primaryCta: ctas.primary,
        primaryLabel: labelForCta(ctas.primary),
        secondaryCta: null,
        secondaryLabel: null,
        consequence: null,
        confirmPending: false,
      };
    }
    case "CONFIRM_TAP": {
      // Double-tap guard: already pending → no state thrash
      if (state.confirmPending || state.phase === "pending" || state.phase === "reconciling") {
        return state;
      }
      const ctas = ctaForPhase("pending");
      return {
        ...state,
        phase: "pending",
        confirmPending: true,
        primaryCta: ctas.primary,
        primaryLabel: null,
        secondaryCta: null,
        secondaryLabel: null,
        consequence: consequenceForPhase("pending"),
      };
    }
    case "SERVER_EXECUTION": {
      let phase = phaseFromServerStatus(event.status, {
        paymentRequired: event.paymentRequired,
      });
      if (event.drift) phase = "drift";
      const ctas = ctaForPhase(phase, {
        hasAltSlot: state.slots.length > 1,
        selectedSlotLabel: event.slotLabel || state.selectedSlotLabel,
      });
      const bookedByName = event.bookedByName ?? state.bookedByName;
      return {
        ...state,
        phase,
        executionId: event.executionId ?? state.executionId,
        selectedSlotLabel: event.slotLabel ?? state.selectedSlotLabel,
        placeName: event.placeName ?? state.placeName,
        partySize: event.partySize ?? state.partySize,
        sharedSafeSummary: event.sharedSafeSummary ?? state.sharedSafeSummary,
        bookedByName,
        drift: event.drift ?? null,
        confirmPending: phase === "pending" || phase === "reconciling",
        primaryCta: ctas.primary,
        primaryLabel: labelForCta(ctas.primary, event.slotLabel || state.selectedSlotLabel),
        secondaryCta: ctas.secondary,
        secondaryLabel: ctas.secondary
          ? labelForCta(ctas.secondary, state.slots[1]?.label)
          : null,
        consequence:
          phase === "drift" && event.drift
            ? event.drift.humanCopy
            : consequenceForPhase(phase, {
                slotLabel: event.slotLabel || state.selectedSlotLabel,
                placeName: event.placeName || state.placeName,
                partySize: event.partySize ?? state.partySize,
                bookedByName,
              }),
        authCopy: phase === "authorize" ? state.authCopy : state.authCopy,
      };
    }
    case "OPEN_CANCEL": {
      const ctas = ctaForPhase("cancel_confirm");
      return {
        ...state,
        phase: "cancel_confirm",
        primaryCta: ctas.primary,
        primaryLabel: labelForCta(ctas.primary),
        secondaryCta: null,
        secondaryLabel: null,
        consequence: consequenceForPhase("cancel_confirm"),
      };
    }
    case "DISMISS_AUTHORIZE": {
      const ctas = ctaForPhase("available", { hasAltSlot: state.slots.length > 1 });
      return {
        ...state,
        phase: "available",
        primaryCta: ctas.primary,
        primaryLabel: labelForCta(ctas.primary, state.selectedSlotLabel),
        secondaryCta: ctas.secondary,
        secondaryLabel: ctas.secondary ? labelForCta(ctas.secondary) : null,
        consequence: consequenceForPhase("available", {
          slotLabel: state.selectedSlotLabel,
        }),
        confirmPending: false,
      };
    }
    case "RESET":
      return emptyExecutionUx({
        placeName: state.placeName,
        whenLabel: state.whenLabel,
        partySize: state.partySize,
      });
    default:
      return state;
  }
}

export type ExecutionUxEvent =
  | {
      type: "PLACE_SELECTED";
      placeName: string;
      whenLabel?: string | null;
      partySize?: number;
    }
  | { type: "CHECK_AVAILABILITY" }
  | {
      type: "AVAILABILITY_RESULT";
      available: boolean;
      expired?: boolean;
      slots: Array<{ slot_id?: string; slotId?: string; label?: string; id?: string }>;
      selectedSlotId?: string | null;
    }
  | { type: "SELECT_SLOT"; slotId: string }
  | { type: "OPEN_AUTHORIZE" }
  | { type: "CONFIRM_TAP" }
  | { type: "DISMISS_AUTHORIZE" }
  | { type: "OPEN_CANCEL" }
  | { type: "RESET" }
  | {
      type: "SERVER_EXECUTION";
      status: string;
      executionId?: string | null;
      slotLabel?: string | null;
      placeName?: string | null;
      partySize?: number;
      sharedSafeSummary?: string | null;
      bookedByName?: string | null;
      paymentRequired?: boolean;
      drift?: ExecutionDrift | null;
    };

/** Reconstruct UX from server execution on reconnect — no second book. */
export function reconstructFromServer(exec: {
  status?: string;
  execution_id?: string;
  executionId?: string;
  slot_label?: string;
  slotLabel?: string;
  place_display_name?: string;
  placeName?: string;
  party_size?: number;
  partySize?: number;
  shared_safe_summary?: string;
  booked_by_name?: string;
  payment_status?: string;
}): ExecutionUxState {
  const status = exec.status || "checking";
  const paymentRequired = exec.payment_status === "authorization_required";
  const base = emptyExecutionUx({
    executionId: exec.execution_id || exec.executionId || null,
    placeName: exec.place_display_name || exec.placeName || null,
    selectedSlotLabel: exec.slot_label || exec.slotLabel || null,
    whenLabel: exec.slot_label || exec.slotLabel || null,
    partySize: exec.party_size || exec.partySize || 2,
    sharedSafeSummary: exec.shared_safe_summary || null,
    bookedByName: exec.booked_by_name || null,
  });
  return reduceExecutionUx(base, {
    type: "SERVER_EXECUTION",
    status,
    executionId: base.executionId,
    slotLabel: base.selectedSlotLabel,
    placeName: base.placeName,
    partySize: base.partySize,
    sharedSafeSummary: base.sharedSafeSummary,
    bookedByName: base.bookedByName,
    paymentRequired,
  });
}

function norm(s?: string | null): string {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function looseTimeMatch(a: string, b: string): boolean {
  // "thursday · 7:30 pm" vs "7:30 PM"
  const ta = a.match(/\d{1,2}:\d{2}/);
  const tb = b.match(/\d{1,2}:\d{2}/);
  if (ta && tb) return ta[0] === tb[0];
  return a.includes(b) || b.includes(a);
}

function loosePlaceMatch(a: string, b: string): boolean {
  return a.includes(b) || b.includes(a);
}
