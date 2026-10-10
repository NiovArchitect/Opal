/**
 * GLOBAL OPAL — exact current authority 618:902
 * P3.1: geometry no-overlap, ambient life, honest control contracts.
 * Structured semantic UI + decorative neural field.
 * P4.6: Nearby now → authenticated DI resolve (OSM when lat/lng present).
 * Activity icon 1046:2 not implemented here.
 */
import React, { useEffect, useMemo, useState } from "react";
import { OpalWordmark } from "../brand/OpalLogo";
import {
  answerDecisionQuestion,
  resolveDecision,
  resolveDecisionTradeoff,
  type DecisionResolvePayload,
} from "../api/productClient";

type Props = {
  onClose?: () => void;
  onSeedGraph?: (hint: string) => void;
  onOpenSettings?: () => void;
  onOpenHistory?: () => void;
  /**
   * Figma 1075:644 — Solo Opal (founder approved).
   * Same Global Opal intelligence (618:902) with participant context SELF ONLY.
   * Not a second assistant. No fake social graph.
   */
  participantMode?: "global" | "solo";
};

const CONTEXT_GLOBAL: { id: string; label: string; value: string; icon: string; w?: number; hint: string }[] = [
  { id: "people", label: "People", value: "18", icon: "/figma-v2/opal-ambient/icon-ctx-people.png", hint: "Who Opal is considering for this decision." },
  { id: "budget", label: "Budget", value: "$", icon: "/figma-v2/opal-ambient/icon-ctx-budget.png", hint: "Spend fit currently in play." },
  { id: "places", label: "Places", value: "96", icon: "/figma-v2/opal-ambient/icon-ctx-places.png", hint: "Place pool Opal can draw from." },
  { id: "past", label: "Past moments", value: "24", icon: "/figma-v2/opal-ambient/icon-ctx-past.png", w: 102, hint: "Past moments shaping taste — private until you share." },
  { id: "vibe", label: "Vibe", value: "calm, fun", icon: "/figma-v2/opal-ambient/icon-ctx-vibe.png", w: 106, hint: "Current vibe constraint for this answer." },
  {
    id: "availability",
    label: "Availability",
    value: "3",
    icon: "/figma-v2/opal-ambient/icon-ctx-availability.png",
    w: 96,
    hint: "Overlapping windows Opal believes are usable.",
  },
];

/** Solo chips: no fabricated friend counts (founder Solo law). */
const CONTEXT_SOLO: { id: string; label: string; value: string; icon: string; w?: number; hint: string }[] = [
  { id: "people", label: "People", value: "Solo", icon: "/figma-v2/opal-ambient/icon-ctx-people.png", hint: "Participant context is you only — zero-network value." },
  { id: "budget", label: "Budget", value: "$", icon: "/figma-v2/opal-ambient/icon-ctx-budget.png", hint: "Your spend fit currently in play." },
  { id: "places", label: "Places", value: "Nearby", icon: "/figma-v2/opal-ambient/icon-ctx-places.png", hint: "Places Opal can draw from for you." },
  { id: "past", label: "Past moments", value: "Yours", icon: "/figma-v2/opal-ambient/icon-ctx-past.png", w: 102, hint: "Your past moments shaping taste — private." },
  { id: "vibe", label: "Vibe", value: "open", icon: "/figma-v2/opal-ambient/icon-ctx-vibe.png", w: 106, hint: "Current vibe for this answer." },
  {
    id: "availability",
    label: "Availability",
    value: "Now",
    icon: "/figma-v2/opal-ambient/icon-ctx-availability.png",
    w: 96,
    hint: "Your usable window right now.",
  },
];

const IDEAS = [
  {
    id: "juniper",
    rank: 1,
    title: "Juniper & Ivy",
    time: "Sat · May 17 · 7:30 PM",
    descriptor: "Quiet dinner",
    status: "Within budget",
    fit: "Great fit",
    media: "/figma-v2/opal-ambient/media-juniper.png",
  },
  {
    id: "rooftop",
    rank: 2,
    title: "Rooftop Jazz",
    time: "Sat · May 17 · 9:00 PM",
    descriptor: "Live music",
    status: "Nearby",
    fit: "Great fit",
    media: "/figma-v2/opal-ambient/media-rooftop.png",
  },
  {
    id: "coast",
    rank: 3,
    title: "Sunset Coast Walk",
    time: "Sun · May 18 · 6:15 PM",
    descriptor: "Low key",
    status: "Easy timing",
    fit: "Great fit",
    media: "/figma-v2/opal-ambient/media-coast.png",
  },
  {
    id: "escape",
    rank: 4,
    title: "Coast escape",
    time: "Sun · May 18 · 7:00 PM",
    descriptor: "Slow evening",
    status: "35 mi away",
    fit: "Great fit",
    media: "/figma-v2/opal-ambient/media-coast.png",
  },
] as const;

const INTENT = ["Date ideas", "Family plans", "Nearby now", "Weekend getaway"] as const;
const REFINE: { label: string; icon: string; mutate: string; ownership: "P3_LOCAL" | "P4_REQUIRED" }[] = [
  { label: "Refine", icon: "/figma-v2/opal-ambient/icon-chip-refine.png", mutate: "refine", ownership: "P4_REQUIRED" },
  { label: "Timing", icon: "/figma-v2/opal-ambient/icon-chip-timing.png", mutate: "later", ownership: "P4_REQUIRED" },
  { label: "Budget", icon: "/figma-v2/opal-ambient/icon-chip-budget.png", mutate: "cheaper", ownership: "P4_REQUIRED" },
  { label: "Vibe", icon: "/figma-v2/opal-ambient/icon-chip-vibe.png", mutate: "quieter", ownership: "P4_REQUIRED" },
  { label: "More ideas", icon: "/figma-v2/opal-ambient/icon-chip-more.png", mutate: "explore", ownership: "P3_LOCAL" },
];

function motionDemoEnabled() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("opal_motion_demo") === "1";
}

function mediumDemoEnabled() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("opal_medium_demo") === "1";
}

function lowDemoEnabled() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("opal_low_demo") === "1";
}

function coldStartDemoCoords(): { lat: number; lng: number; area_label: string } | null {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search);
  if (q.get("opal_cold_start_demo") !== "1") return null;
  const lat = Number(q.get("lat") || "32.723");
  const lng = Number(q.get("lng") || "-117.168");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, area_label: q.get("area_label") || "Little Italy" };
}

function intentToApi(chip: string): string {
  switch (chip) {
    case "Nearby now":
      return "nearby_now";
    case "Date ideas":
      return "date_ideas";
    case "Weekend getaway":
      return "weekend_getaway";
    case "Family plans":
      return "family_plans";
    default:
      return "nearby_now";
  }
}

async function readBrowserLocation(): Promise<{ lat: number; lng: number } | null> {
  const { getDeviceCoords } = await import("../device/deviceLocation");
  const coords = await getDeviceCoords();
  return coords ? { lat: coords.lat, lng: coords.lng } : null;
}

const LOW_TRADEOFF = {
  prompt: "What matters more right now?",
  axis: "CLOSER_VS_MORE_SPECIAL",
  optionA: { id: "closer", label: "Closer" },
  optionB: { id: "more_special", label: "More special" },
} as const;

const MEDIUM_QUESTION = {
  prompt: "Earlier or later?",
  dimension: "TIME_PRECISION",
  choices: [
    { id: "earlier", label: "Earlier" },
    { id: "later", label: "Later" },
    { id: "flexible", label: "Flexible" },
  ],
} as const;

export function OpalAmbient({
  onClose,
  onSeedGraph,
  onOpenSettings,
  onOpenHistory,
  participantMode = "global",
}: Props) {
  const solo = participantMode === "solo";
  const CONTEXT = solo ? CONTEXT_SOLO : CONTEXT_GLOBAL;
  const [listening, setListening] = useState(false);
  const [query, setQuery] = useState(() =>
    solo ? "I've got two hours. What fits me nearby?" : "",
  );
  const [note, setNote] = useState<string | null>(null);
  const [sheet, setSheet] = useState<null | { kind: "context" | "history" | "correction"; id?: string; title: string; body: string }>(null);
  const [orbResonate, setOrbResonate] = useState(false);
  const [signalBreath, setSignalBreath] = useState(false);
  const [exploreMode, setExploreMode] = useState(false);
  const [mediumOpen, setMediumOpen] = useState(() => mediumDemoEnabled() && !lowDemoEnabled());
  const [lowOpen, setLowOpen] = useState(() => lowDemoEnabled());
  const [liveDecision, setLiveDecision] = useState<DecisionResolvePayload | null>(null);
  const [resolving, setResolving] = useState(false);
  const [contextOn, setContextOn] = useState<Set<string>>(
    () => new Set(["people", "places", "vibe"]),
  );
  const demo = useMemo(() => motionDemoEnabled(), []);

  const liveHigh = liveDecision?.mode === "high" && !!liveDecision.answer?.name;
  const liveMedium = liveDecision?.mode === "medium" && !!liveDecision.question;
  const liveLow = liveDecision?.mode === "low" && !!liveDecision.tradeoff;
  const liveFailure =
    !!liveDecision &&
    !liveHigh &&
    !liveMedium &&
    !liveLow &&
    ["NO_VALID_CANDIDATE", "NOT_RESOLVED", "NOT_HIGH_CONFIDENCE", "FAILURE"].includes(
      liveDecision.outcome,
    );

  useEffect(() => {
    if (!demo) return;
    // Deterministic founder motion demo — organic ~3.7s breath (non-production proof only)
    const BREATH_MS = 3700;
    setSignalBreath(true);
    const t1 = window.setTimeout(() => setSignalBreath(false), BREATH_MS);
    const t2 = window.setTimeout(() => {
      setOrbResonate(true);
      window.setTimeout(() => setOrbResonate(false), BREATH_MS);
    }, BREATH_MS + 200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [demo]);

  async function resolveNearbyIntent(chip: string) {
    setResolving(true);
    setLiveDecision(null);
    setExploreMode(false);
    setMediumOpen(false);
    setLowOpen(false);
    setNote("Resolving nearby with Decision Intelligence…");

    const demoCoords = coldStartDemoCoords();
    let lat = demoCoords?.lat;
    let lng = demoCoords?.lng;
    let area_label = demoCoords?.area_label;
    let geoNote: string | null = null;

    if (lat == null || lng == null) {
      const geo = await readBrowserLocation();
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
      } else {
        geoNote =
          "Location unavailable — open with opal_cold_start_demo=1&lat=32.723&lng=-117.168 for proof, or allow geolocation.";
      }
    }

    if (lat == null || lng == null) {
      setResolving(false);
      setNote(geoNote || "Need a location to resolve Nearby now.");
      return;
    }

    try {
      const payload = await resolveDecision({
        intent: intentToApi(chip),
        lat,
        lng,
        area_label,
        scope_type: "solo",
        place_provider_mode: "connected",
      });
      applyLiveDecision(payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Resolve failed";
      setLiveDecision(null);
      setNote(msg);
    } finally {
      setResolving(false);
    }
  }

  function applyLiveDecision(payload: DecisionResolvePayload) {
    setLiveDecision(payload);
    if (payload.mode === "high" && payload.answer?.name) {
      setMediumOpen(false);
      setLowOpen(false);
      setNote(
        `High · ${payload.answer.name}${payload.answer.area ? ` · ${payload.answer.area}` : ""} · ${payload.candidate_source || "unknown"} · provisional violet.`,
      );
      return;
    }
    if (payload.mode === "medium" && payload.question) {
      setMediumOpen(true);
      setLowOpen(false);
      setNote(`Medium · one question · ${payload.candidate_source || "unknown"}.`);
      return;
    }
    if (payload.mode === "low" && payload.tradeoff) {
      setLowOpen(true);
      setMediumOpen(false);
      setNote(`Low · one tradeoff · ${payload.candidate_source || "unknown"}.`);
      return;
    }
    setMediumOpen(false);
    setLowOpen(false);
    setNote(payload.note || "Could not settle on one nearby answer yet.");
  }

  function applyIntent(chip: string) {
    setQuery(chip);
    setExploreMode(false);
    if (chip === "Nearby now") {
      void resolveNearbyIntent(chip);
      return;
    }
    setLiveDecision(null);
    setNote(`Intent “${chip}” applied with current context. Full Decision Intelligence recompose is P4.`);
    // One-tap intent: seed without requiring a second Send when architecture allows
    onSeedGraph?.(chip);
  }

  async function onLiveMediumChoice(choiceId: string, label: string) {
    if (!liveDecision?.result_id) {
      setMediumOpen(false);
      setNote(`Answer “${label}” applied locally — live result id missing.`);
      return;
    }
    setResolving(true);
    try {
      const next = await answerDecisionQuestion(liveDecision.result_id, choiceId);
      applyLiveDecision(next);
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not apply answer");
    } finally {
      setResolving(false);
    }
  }

  async function onLiveLowChoice(selectedId: string, label: string) {
    if (!liveDecision?.result_id) {
      setLowOpen(false);
      setNote(`Tradeoff “${label}” applied locally — live result id missing.`);
      return;
    }
    setResolving(true);
    try {
      const next = await resolveDecisionTradeoff(liveDecision.result_id, selectedId);
      applyLiveDecision(next);
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not apply tradeoff");
    } finally {
      setResolving(false);
    }
  }

  function applyCorrection(chip: (typeof REFINE)[number]) {
    if (chip.label === "More ideas") {
      setExploreMode(true);
      setNote("Exploration open — multiple alternatives are intentional here. Default decision remains one-answer in P4.");
      return;
    }
    setQuery((q) => (q ? `${q} · ${chip.mutate}` : chip.mutate));
    setSheet({
      kind: "correction",
      title: chip.label,
      body: `Correction “${chip.label}” recorded locally. Immediate Decision Intelligence recompose (same context, one mutated dimension) is P4_REQUIRED — not faked in P3.1.`,
    });
    setNote(`Correction operator “${chip.label}” — P4 Decision Intelligence owns full recompose.`);
  }

  function openContext(chip: (typeof CONTEXT)[number]) {
    setSheet({
      kind: "context",
      id: chip.id,
      title: chip.label,
      body: `${chip.hint}\n\nCurrent value: ${chip.value}\n\nInline correct/remove of this dimension without leaving Opal Center is the intended UX. Full intelligent recompose after correction is P4_REQUIRED.`,
    });
  }

  const visibleIdeas = exploreMode ? IDEAS : IDEAS.slice(0, 3);

  return (
    <div
      className="opal-ambient"
      data-testid="opal-ambient"
      data-figma={solo ? "1075:644" : "618:902"}
      data-figma-authority={solo ? "1075:644" : "618:902"}
      data-figma-derivative-of={solo ? "618:902" : undefined}
      data-figma-legacy="392:2"
      data-participant-mode={solo ? "solo" : "global"}
      data-feature-tranche="PAUSED"
      data-listening={listening ? "true" : "false"}
      data-nav-active="none"
      data-opal-impl="structured-semantic"
      data-visual-authority="structured-ui-decorative-field"
      data-motion-demo={demo ? "true" : "false"}
      data-signal-breath={signalBreath ? "true" : "false"}
      data-explore-mode={exploreMode ? "true" : "false"}
    >
      <div className="opal-ambient-spectra" aria-hidden data-decorative-only="true" data-motion="brand-ambient" />

      <div
        className="opal-ambient-field"
        aria-hidden
        data-testid="opal-neural-field"
        data-decorative-only="true"
        data-figma-node="618:923"
        data-motion="brand-ambient"
      >
        <img
          className="opal-field-export"
          src="/figma-v2/opal-ambient/neural-field-618-902.png"
          alt=""
          width={354}
          height={246}
          data-figma-node="618:923"
        />
        <span className="opal-field-orbit" data-testid="opal-ambient-orbit" />
        <span className="opal-field-particle p1" />
        <span className="opal-field-particle p2" />
        <span className="opal-field-particle p3" />
      </div>

      <header className="opal-ambient-top" data-figma-node="618:906">
        <button
          type="button"
          className="opal-top-icon"
          aria-label="Settings"
          data-testid="opal-settings"
          data-control-status="REAL_ACTIVE"
          onClick={() => {
            onOpenSettings?.();
            onClose?.();
          }}
        >
          <img src="/figma-v2/opal-ambient/icon-settings.svg" alt="" width={24} height={24} />
        </button>
        <div className="opal-top-brand" aria-label="Opal Graph">
          <OpalWordmark height={34} title="" data-testid="opal-center-wordmark" />
        </div>
        <button
          type="button"
          className="opal-top-icon"
          aria-label="History"
          data-testid="opal-history"
          data-control-status="REAL_ACTIVE"
          onClick={() => {
            // Session-local history is REAL_ACTIVE here. Persistent multi-device archive = DEPENDENCY.
            onOpenHistory?.();
            setSheet({
              kind: "history",
              title: "Recent with Opal",
              body: "Session history: current Center thread only.\n\nPersistent multi-device Opal conversation history is a production dependency — not invented as a fake archive.",
            });
          }}
        >
          <img src="/figma-v2/opal-ambient/icon-history.svg" alt="" width={24} height={24} />
        </button>
        {onClose ? (
          <button
            type="button"
            className="opal-done-sr"
            data-testid="opal-ambient-close"
            onClick={onClose}
            aria-label="Close Opal"
          >
            Close
          </button>
        ) : null}
      </header>

      <div className="opal-context-grid" role="group" aria-label="Context Opal is using">
        {CONTEXT.map((chip) => {
          const on = contextOn.has(chip.id);
          return (
            <button
              key={chip.id}
              type="button"
              className={`opal-context-card ${on ? "is-on" : ""}`}
              data-testid={`opal-context-${chip.id}`}
              data-control-status="REAL_ACTIVE"
              aria-pressed={on}
              aria-label={`${chip.label}: ${chip.value}. Inspect context.`}
              style={chip.w ? { width: chip.w } : undefined}
              onClick={() => openContext(chip)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextOn((prev) => {
                  const next = new Set(prev);
                  if (next.has(chip.id)) next.delete(chip.id);
                  else next.add(chip.id);
                  return next;
                });
              }}
            >
              <img className="opal-context-icon" src={chip.icon} alt="" width={22} height={22} aria-hidden />
              <span className="opal-context-copy">
                <span className="opal-context-label">{chip.label}</span>
                <span className="opal-context-value">{chip.value}</span>
              </span>
            </button>
          );
        })}
      </div>

      <section className="opal-user-msg" aria-label="Your message" data-figma-node={solo ? "1075:817" : "618:1075"}>
        <p className="opal-bubble is-user">
          {solo ? (
            <>
              I&apos;ve got two hours.
              <br />
              What fits me nearby?
            </>
          ) : (
            <>
              Can you line up something for me
              <br />
              and Chanelle this weekend?
            </>
          )}
        </p>
      </section>

      <section
        className={`opal-response ${signalBreath ? "is-signal-breath" : ""}`}
        aria-label="Opal response"
        data-figma-node="618:1153"
        data-testid="opal-response"
      >
        <div className="opal-response-head">
          <img
            className={`opal-response-orb ${orbResonate ? "is-resonating" : ""}`}
            src="/figma-v2/opal-ambient/opal-response-orb-618-1244.png"
            alt=""
            width={36}
            height={36}
            aria-hidden
            data-decorative-only="true"
            data-figma-node="618:1244"
            data-testid="opal-response-orb"
          />
          <div className="opal-response-copy">
            <p className="opal-response-body">
              {resolving
                ? "Looking nearby…"
                : liveFailure
                  ? liveDecision?.note || "Could not settle on one nearby answer yet."
                  : exploreMode
                    ? "Exploration open — multiple alternatives on purpose."
                    : lowOpen
                      ? "I understand exactly why this is hard — one real tradeoff."
                      : mediumOpen
                        ? "One thing would finish this — then I can decide."
                        : liveHigh
                          ? "One best fit for this context — provisional until you accept."
                          : "One best fit for this context — provisional until you accept."}
            </p>
            <p className="opal-response-picks">
              {resolving
                ? "Decision Intelligence · connected places when location is present."
                : liveFailure
                  ? `Failure · honest · ${liveDecision?.candidate_source || "unavailable"}.`
                  : exploreMode
                    ? "More ideas escape hatch."
                    : lowOpen
                      ? liveLow
                        ? `Low / conflicted · one axis · two sides · 988:263 · ${liveDecision?.candidate_source || "live"}.`
                        : "Low / conflicted · one axis · two sides · 988:263 · no blame."
                      : mediumOpen
                        ? liveMedium
                          ? `Medium · one necessary question · 988:2 · ${liveDecision?.candidate_source || "live"}.`
                          : "Medium · one necessary question · 988:2 · not a wizard."
                        : liveHigh
                          ? `High confidence · violet provisional · ${liveDecision?.candidate_source || "live"} · not confirmed.`
                          : "High confidence · violet provisional · not confirmed · candidate catalog is fixture."}
            </p>
          </div>
        </div>

        {lowOpen && !exploreMode ? (
          <div
            className="opal-low-tradeoff"
            data-testid="opal-ideas-lane"
            data-decision-mode="low"
            data-confidence-class="low"
            data-figma-authority="988:263"
            data-tradeoff-axis={liveDecision?.tradeoff?.axis || LOW_TRADEOFF.axis}
            data-no-blame="true"
            data-candidate-source={liveDecision?.candidate_source || undefined}
          >
            <p className="opal-low-prompt" data-testid="opal-low-prompt">
              {liveDecision?.tradeoff?.prompt || LOW_TRADEOFF.prompt}
            </p>
            <div className="opal-low-choices" role="group" aria-label="One tradeoff">
              {(liveLow
                ? [
                    liveDecision!.tradeoff!.option_a || LOW_TRADEOFF.optionA,
                    liveDecision!.tradeoff!.option_b || LOW_TRADEOFF.optionB,
                  ]
                : [LOW_TRADEOFF.optionA, LOW_TRADEOFF.optionB]
              ).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="opal-low-choice"
                  data-testid={`opal-low-choice-${c.id}`}
                  data-control-status="REAL_ACTIVE"
                  disabled={resolving}
                  onClick={() => {
                    if (liveLow && c.id) {
                      void onLiveLowChoice(c.id, c.label || c.id);
                      return;
                    }
                    setLowOpen(false);
                    setNote(
                      `Tradeoff “${c.label}” applied to the same decision — soft preference only. Hard constraints intact. Recomputing.`,
                    );
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {mediumOpen && !exploreMode && !lowOpen ? (
          <div
            className="opal-medium-question"
            data-testid="opal-ideas-lane"
            data-decision-mode="medium"
            data-confidence-class="medium"
            data-figma-authority="988:2"
            data-question-dimension={
              liveDecision?.question?.dimension || MEDIUM_QUESTION.dimension
            }
            data-candidate-source={liveDecision?.candidate_source || undefined}
          >
            <p className="opal-medium-prompt" data-testid="opal-medium-prompt">
              {liveDecision?.question?.prompt || MEDIUM_QUESTION.prompt}
            </p>
            <div className="opal-medium-choices" role="group" aria-label="One answer">
              {(liveMedium && liveDecision?.question?.choices?.length
                ? liveDecision.question.choices
                : MEDIUM_QUESTION.choices
              ).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="opal-medium-choice"
                  data-testid={`opal-medium-choice-${c.id}`}
                  data-control-status="REAL_ACTIVE"
                  disabled={resolving}
                  onClick={() => {
                    if (liveMedium && c.id) {
                      void onLiveMediumChoice(c.id, c.label || c.id);
                      return;
                    }
                    setMediumOpen(false);
                    setNote(
                      `Answer “${c.label}” applied to the same decision — revision moves forward. Re-evaluating toward one answer.`,
                    );
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div
          className="opal-ideas"
          aria-label={exploreMode ? "Exploration alternatives" : "One answer"}
          data-testid={
            (mediumOpen || lowOpen) && !exploreMode ? "opal-ideas-lane-high-pending" : "opal-ideas-lane"
          }
          data-decision-mode={
            exploreMode
              ? "explore"
              : lowOpen
                ? "low-pending-high"
                : mediumOpen
                  ? "medium-pending-high"
                  : liveFailure
                    ? "failure"
                    : "high"
          }
          data-confidence-class={
            exploreMode || mediumOpen || lowOpen || liveFailure ? undefined : "high"
          }
          data-truth-state={
            exploreMode || mediumOpen || lowOpen || liveFailure ? undefined : "provisional"
          }
          data-candidate-source={
            exploreMode || mediumOpen || lowOpen || liveFailure
              ? undefined
              : liveHigh
                ? liveDecision?.candidate_source || "live"
                : "fixture_catalog"
          }
          data-figma-authority={
            exploreMode || mediumOpen || lowOpen || liveFailure ? undefined : "979:2"
          }
          data-real-external={liveHigh && liveDecision?.real ? "true" : undefined}
          hidden={(mediumOpen || lowOpen) && !exploreMode ? true : undefined}
        >
          {liveFailure && !exploreMode ? (
            <p className="opal-ambient-note" data-testid="opal-decision-failure" role="status">
              {liveDecision?.note || "Nearby resolve did not produce an answer."}
            </p>
          ) : (
            <div className={`opal-ideas-track ${exploreMode ? "" : "is-one-answer"}`}>
              {(exploreMode
                ? visibleIdeas
                : liveHigh
                  ? [
                      {
                        id: liveDecision!.answer!.entity_id || "live-high",
                        rank: 1,
                        title: liveDecision!.answer!.name || "Nearby place",
                        time: liveDecision!.answer!.area || "Nearby",
                        descriptor: "Nearby now",
                        status: liveDecision!.real ? "Real external" : "Provisional",
                        fit: "Great fit",
                        media: "/figma-v2/opal-ambient/media-juniper.png",
                      },
                    ]
                  : [IDEAS[0]]
              ).map((idea) => (
                <button
                  key={idea.id}
                  type="button"
                  className={`opal-idea-card ${exploreMode ? "" : "is-high-provisional"}`}
                  data-testid={exploreMode ? `opal-idea-${idea.id}` : "opal-high-answer"}
                  data-control-status="REAL_ACTIVE"
                  data-signal-hue={exploreMode ? undefined : "violet"}
                  onClick={() => {
                    setQuery(idea.title);
                    onSeedGraph?.(idea.title);
                    setNote(
                      exploreMode
                        ? "Exploration pick seeded into Graph path. Human confirm still required."
                        : liveHigh
                          ? `High-confidence answer accepted into same Graph path — provisional, not Gold. Candidate source: ${liveDecision?.candidate_source || "live"}.`
                          : "High-confidence answer accepted into same Graph path — provisional, not Gold. Candidate source: fixture catalog.",
                    );
                  }}
                >
                  <span className="opal-idea-media-wrap">
                    <img className="opal-idea-media" src={idea.media} alt="" />
                    {exploreMode ? <span className="opal-idea-rank">{idea.rank}</span> : null}
                  </span>
                  <span className="opal-idea-copy">
                    <span className="opal-idea-title">{idea.title}</span>
                    <span className="opal-idea-line">
                      <img className="opal-idea-ico" src="/figma-v2/opal-ambient/icon-idea-clock.png" alt="" width={10} height={10} />
                      {idea.time}
                    </span>
                    <span className="opal-idea-line">
                      <img className="opal-idea-ico" src="/figma-v2/opal-ambient/icon-chip-vibe.png" alt="" width={10} height={10} />
                      {idea.descriptor}
                    </span>
                    <span className="opal-idea-line">
                      <img className="opal-idea-ico" src="/figma-v2/opal-ambient/icon-chip-budget.png" alt="" width={10} height={10} />
                      {idea.status}
                    </span>
                    <span className="opal-idea-fit">
                      <img className="opal-idea-ico" src="/figma-v2/opal-ambient/icon-idea-fit.png" alt="" width={10} height={10} />
                      {exploreMode ? idea.fit : "Provisional · Go with this"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {exploreMode || liveFailure ? null : (
            <button
              type="button"
              className="opal-high-accept"
              data-testid="opal-go-with-this"
              data-control-status="REAL_ACTIVE"
              data-cta-means="accept_into_same_graph"
              onClick={() => {
                const title = liveHigh
                  ? liveDecision?.answer?.name || IDEAS[0].title
                  : IDEAS[0].title;
                setQuery(title);
                onSeedGraph?.(title);
                setNote("Go with this → same Graph. Provisional acceptance — not booked, not Gold.");
              }}
            >
              Go with this →
            </button>
          )}
          <button
            type="button"
            className="opal-more-ideas"
            data-testid="opal-view-more"
            data-control-status="REAL_ACTIVE"
            onClick={() => {
              setExploreMode(true);
              setNote("More ideas — explicit exploration escape hatch.");
            }}
          >
            View more ideas  ›
          </button>
        </div>
      </section>

      <div className="opal-intent" role="group" aria-label="Intent starters">
        {INTENT.map((chip) => (
          <button
            key={chip}
            type="button"
            className="opal-intent-chip"
            data-testid={`opal-intent-${chip.toLowerCase().replace(/\s/g, "-")}`}
            data-control-status="REAL_ACTIVE"
            onClick={() => applyIntent(chip)}
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="opal-refine" role="group" aria-label="Correction operators">
        {REFINE.map((chip) => (
          <button
            key={chip.label}
            type="button"
            className="opal-refine-chip"
            data-testid={`opal-chip-${chip.label.toLowerCase().replace(/\s/g, "-")}`}
            data-control-status={chip.ownership === "P4_REQUIRED" ? "P4_REQUIRED" : "REAL_ACTIVE"}
            data-ownership={chip.ownership}
            onClick={() => applyCorrection(chip)}
          >
            <img className="opal-refine-icon" src={chip.icon} alt="" width={16} height={16} aria-hidden />
            {chip.label}
          </button>
        ))}
      </div>

      <div className="opal-composer" data-figma-node="618:1110">
        <button
          type="button"
          className="opal-attach"
          aria-label="Add context"
          data-testid="opal-attach"
          data-control-status="DEPENDENCY"
          onClick={() =>
            setNote("Attachment / context add requires system file/media dependency — not faked.")
          }
        >
          +
        </button>
        <label className="opal-query-label sr-only" htmlFor="opal-query">
          Message or talk to Opal
        </label>
        <input
          id="opal-query"
          className="opal-query"
          data-testid="opal-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Message or talk to Opal"
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim()) {
              onSeedGraph?.(query.trim());
              setNote("Message sent into Graph path. Human confirm still required before commit.");
            }
          }}
        />
        <button
          type="button"
          className={`opal-voice ${listening ? "is-listening" : ""}`}
          data-testid="opal-listen"
          data-control-status="DEPENDENCY"
          aria-label={listening ? "Stop listening" : "Voice input"}
          aria-pressed={listening}
          onClick={() => {
            if (listening) {
              setListening(false);
              setNote("Listening ended. Speech recognition is a system dependency when unavailable.");
              return;
            }
            setListening(true);
            setNote("Listening UI on. Real ASR is a system dependency — not pretended transcription.");
          }}
        >
          <span className="opal-voice-wave" aria-hidden />
        </button>
        <button
          type="button"
          className="opal-suggest-sr"
          data-testid="opal-suggest"
          data-control-status="REAL_ACTIVE"
          disabled={!query.trim()}
          aria-label="Show possibilities"
          onClick={() => {
            setListening(false);
            onSeedGraph?.(query.trim());
            setNote("Suggestion seeded into Graph path. Human confirm still required before commit.");
          }}
        >
          Show possibilities
        </button>
      </div>

      {sheet ? (
        <div className="opal-inline-sheet" role="dialog" aria-modal="true" data-testid="opal-inline-sheet">
          <div className="opal-inline-sheet-card">
            <header className="opal-inline-sheet-top">
              <h2>{sheet.title}</h2>
              <button type="button" data-testid="opal-sheet-close" onClick={() => setSheet(null)} aria-label="Close">
                Done
              </button>
            </header>
            <p className="opal-inline-sheet-body">{sheet.body}</p>
            {sheet.kind === "context" && sheet.id ? (
              <button
                type="button"
                className="opal-inline-sheet-action"
                data-testid="opal-context-toggle"
                onClick={() => {
                  setContextOn((prev) => {
                    const next = new Set(prev);
                    if (next.has(sheet.id!)) next.delete(sheet.id!);
                    else next.add(sheet.id!);
                    return next;
                  });
                  setNote(`Context “${sheet.title}” ${contextOn.has(sheet.id!) ? "removed from" : "added to"} current decision inputs.`);
                  setSheet(null);
                }}
              >
                {contextOn.has(sheet.id) ? "Remove from current decision" : "Keep in current decision"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {note ? (
        <p className="gsh-gate-note opal-ambient-note" role="status" data-testid="opal-ambient-note">
          {note}
        </p>
      ) : null}
    </div>
  );
}
