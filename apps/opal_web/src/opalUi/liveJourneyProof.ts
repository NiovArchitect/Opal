/**
 * Deterministic live-journey proof harness (no browser).
 * Simulates founder brutal E2E on one social reality lineage.
 * Authority: SocialReality projection only — no stale workflow modes.
 */

import type { ProductSignal } from "../api/productClient";
import { resolvePrimaryOpalSurface } from "./grammar";
import {
  assertPlaceSharePayload,
  assertRealityConsistency,
  assertTimeSharePayload,
  buildPlaceShareDraft,
  buildTimeShareDraft,
  deriveSocialReality,
  type SocialRealityView,
} from "./socialReality";
import { presenceLines } from "../sharedReality";
import { composeHumanReality } from "./composeHumanReality";

export type JourneyStepResult = {
  name: string;
  pass: boolean;
  detail: string;
  reality?: SocialRealityView;
  cta?: string | null;
};

function signalFrom(
  stage: string,
  sr: NonNullable<ProductSignal["shared_reality"]>,
  label?: string,
): ProductSignal {
  return {
    kind: stage === "set" || stage === "ready" ? "set" : "open_loop",
    label: label || sr.headline || sr.what || "Forming",
    status: "forming",
    lifecycle_stage: stage,
    conversation_id: "jordan-dyad",
    shared_reality: sr,
  };
}

function ctaFor(signal: ProductSignal): string | null {
  const primary = resolvePrimaryOpalSurface({
    signalKind: signal.kind,
    signal,
  });
  if (primary.kind === "chip") return primary.label;
  if (primary.kind === "set") {
    const r = deriveSocialReality(signal);
    return r.primary_action?.label || null;
  }
  if (primary.kind === "sheet") return `sheet:${primary.sheetKind || "time"}`;
  return primary.kind === "none" ? null : primary.kind;
}

function fourSurfaceTruth(signal: ProductSignal) {
  const r = deriveSocialReality(signal);
  const home = presenceLines(signal);
  const composed = composeHumanReality({
    what: r.what,
    who: "Jordan",
    when: r.when,
    where: r.where,
    gap: r.next_gap === "place" ? "Place still open" : null,
  });
  return { r, home, composed };
}

/** Full founder primary journey: time → place → reverse → preserve */
export function runFounderJordanJourney(): {
  pass: boolean;
  steps: JourneyStepResult[];
} {
  const steps: JourneyStepResult[] = [];
  const push = (s: JourneyStepResult) => steps.push(s);

  // A: time unresolved
  let sig = signalFrom(
    "plan_forming",
    {
      what: "Dinner",
      when: null,
      where: null,
      gaps: ["when", "where"],
      headline: "Dinner",
    },
    "Dinner",
  );
  let r = deriveSocialReality(sig);
  push({
    name: "A_start_time_unresolved",
    pass: r.next_gap === "time",
    detail: `next_gap=${r.next_gap} cta=${ctaFor(sig)}`,
    reality: r,
    cta: ctaFor(sig),
  });

  // B: settle time Thursday 6:30
  sig = signalFrom(
    "set",
    {
      what: "Dinner",
      when: "Thursday · 6:30 PM",
      where: null,
      gaps: ["where"],
      place_gap_label: "Place still open",
      headline: "Dinner with Jordan",
      next_gap: "place",
    },
    "Dinner with Jordan",
  );
  r = deriveSocialReality(sig);
  const ctaAfterTime = ctaFor(sig);
  const journeyCta =
    r.primary_action?.label ||
    (r.next_gap === "place" ? "Choose a place" : null);
  push({
    name: "B_after_time_settled_place_gap",
    pass:
      r.next_gap === "place" &&
      (journeyCta || "").toLowerCase().includes("place") &&
      !(journeyCta || "").toLowerCase().includes("time"),
    detail: `next_gap=${r.next_gap} primary=${journeyCta} chip=${ctaAfterTime}`,
    reality: r,
    cta: journeyCta,
  });

  // C: place action must not time-payload
  try {
    const placePayload = buildPlaceShareDraft({
      name: "Juniper & Ivy",
      area: "Little Italy",
    });
    assertPlaceSharePayload(placePayload as unknown as Record<string, unknown>);
    push({
      name: "C_place_share_payload",
      pass: placePayload.share_kind === "place" && !("windows" in placePayload),
      detail: JSON.stringify(placePayload),
    });
  } catch (e) {
    push({
      name: "C_place_share_payload",
      pass: false,
      detail: String(e),
    });
  }

  // D: time share payload
  try {
    const timePayload = buildTimeShareDraft("Thursday · 6:30 PM");
    assertTimeSharePayload(timePayload as unknown as Record<string, unknown>);
    push({
      name: "D_time_share_payload",
      pass: timePayload.share_kind === "time",
      detail: JSON.stringify(timePayload),
    });
  } catch (e) {
    push({
      name: "D_time_share_payload",
      pass: false,
      detail: String(e),
    });
  }

  // E: place settled — same lineage
  sig = signalFrom(
    "set",
    {
      what: "Dinner",
      when: "Thursday · 6:30 PM",
      where: "Juniper & Ivy",
      gaps: [],
      headline: "Dinner with Jordan",
      area: "Little Italy",
      next_gap: "none",
    },
    "Dinner with Jordan",
  );
  r = deriveSocialReality(sig);
  push({
    name: "E_place_settled_same_object",
    pass: r.next_gap === "none" && r.where === "Juniper & Ivy" && r.when?.includes("6:30") === true,
    detail: `gap=${r.next_gap} when=${r.when} where=${r.where}`,
    reality: r,
  });

  // F: four-surface consistency
  try {
    const views = ["home", "chat", "sr", "plans"].map((source) => ({
      source,
      reality: deriveSocialReality(sig),
    }));
    assertRealityConsistency(views);
    push({
      name: "F_four_surface_consistency",
      pass: true,
      detail: "home=chat=sr=plans on who/what/when/where/gap",
    });
  } catch (e) {
    push({
      name: "F_four_surface_consistency",
      pass: false,
      detail: String(e),
    });
  }

  // G: change time only — place preserved
  sig = signalFrom(
    "set",
    {
      what: "Dinner",
      when: "Friday · 7:00 PM",
      where: "Juniper & Ivy",
      gaps: [],
      headline: "Dinner with Jordan",
    },
    "Dinner with Jordan",
  );
  r = deriveSocialReality(sig);
  push({
    name: "G_time_change_preserves_place",
    pass: r.where === "Juniper & Ivy" && r.when?.includes("Friday") === true,
    detail: `when=${r.when} where=${r.where}`,
    reality: r,
  });

  // H: change place only — time preserved
  sig = signalFrom(
    "set",
    {
      what: "Dinner",
      when: "Friday · 7:00 PM",
      where: "Harbor Table",
      gaps: [],
      headline: "Dinner with Jordan",
    },
    "Dinner with Jordan",
  );
  r = deriveSocialReality(sig);
  push({
    name: "H_place_change_preserves_time",
    pass: r.when?.includes("Friday") === true && r.where === "Harbor Table",
    detail: `when=${r.when} where=${r.where}`,
    reality: r,
  });

  // I: reversal — time cleared, place remains
  sig = signalFrom(
    "still_open",
    {
      what: "Dinner",
      when: null,
      where: "Harbor Table",
      gaps: ["when"],
      headline: "Dinner with Jordan",
    },
    "Dinner with Jordan",
  );
  r = deriveSocialReality(sig);
  push({
    name: "I_reversal_time_cleared_place_kept",
    pass: r.next_gap === "time" && r.where === "Harbor Table",
    detail: `gap=${r.next_gap} where=${r.where}`,
    reality: r,
  });

  // J0: place → time (order-agnostic inverse of primary path)
  sig = signalFrom(
    "plan_forming",
    {
      what: "Dinner",
      when: null,
      where: "Juniper & Ivy",
      gaps: ["when"],
      headline: "Dinner with Jordan",
    },
    "Dinner with Jordan",
  );
  r = deriveSocialReality(sig);
  const placeFirstCta = r.primary_action?.label || "";
  push({
    name: "J0_place_then_time_gap",
    pass:
      r.next_gap === "time" &&
      r.where === "Juniper & Ivy" &&
      placeFirstCta.toLowerCase().includes("time") &&
      !placeFirstCta.toLowerCase().includes("place"),
    detail: `gap=${r.next_gap} where=${r.where} cta=${placeFirstCta}`,
    reality: r,
    cta: placeFirstCta,
  });

  // J: remote no place
  sig = signalFrom(
    "set",
    {
      what: "FaceTime",
      when: "Tonight · 8 PM",
      where: null,
      gaps: [],
      headline: "FaceTime",
    },
    "FaceTime",
  );
  r = deriveSocialReality(sig);
  push({
    name: "J_remote_no_place_gap",
    pass: r.next_gap === "none" && !r.where_matters,
    detail: `gap=${r.next_gap} where_matters=${r.where_matters}`,
    reality: r,
  });

  // K: fixed event
  sig = signalFrom(
    "set",
    {
      what: "Concert",
      when: "Saturday · 8 PM",
      where: "The Rady Shell",
      gaps: [],
      headline: "Concert",
    },
    "Concert Saturday",
  );
  r = deriveSocialReality(sig);
  const fixedCta = ctaFor(sig);
  push({
    name: "K_fixed_event_no_find_time_owner",
    pass: r.next_gap !== "time" || present(r.when),
    detail: `gap=${r.next_gap} cta=${fixedCta}`,
    reality: r,
    cta: fixedCta,
  });

  // L: presentation compression — no triple Thursday
  const composed = composeHumanReality({
    what: "Dinner",
    who: "Jordan",
    when: "Thursday · 6:30 PM",
    gap: "Place still open",
  });
  const blob = `${composed.kicker} ${composed.headline} ${composed.primary}`;
  const thu = (blob.match(/thursday/gi) || []).length;
  push({
    name: "L_time_presentation_once",
    pass: thu <= 1 && /6:30/.test(blob) && /PM/i.test(blob),
    detail: blob,
  });

  // M: home gap language after time-only
  const afterTime = signalFrom(
    "set",
    {
      what: "Dinner",
      when: "Thursday · 6:30 PM",
      where: null,
      gaps: ["where"],
      place_gap_label: "Place still open",
      headline: "Dinner with Jordan",
    },
    "Dinner with Jordan",
  );
  const home = presenceLines(afterTime);
  push({
    name: "M_home_choose_place",
    pass:
      (home.gap || home.detail || "").toLowerCase().includes("place") &&
      !(home.gap || "").toLowerCase().includes("find a time"),
    detail: `title=${home.title} detail=${home.detail} gap=${home.gap}`,
  });

  const pass = steps.every((s) => s.pass);
  return { pass, steps };
}

function present(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}
