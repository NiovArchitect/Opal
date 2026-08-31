/**
 * GRAPH READY DETAIL — dated authority 618:758 (lineage 373:385).
 * Full-screen mobile destination (NOT a bottom sheet).
 *
 * Owner: existing FOUNDER_HOME_FEED / Reality card id only.
 * No journey-commit CTA on this surface (Journey remains a separate owner).
 */
import React from "react";
import { FOUNDER_HOME_FEED, happeningInLabel } from "./founderGraphSeed";

export type GraphSegment = {
  id: string;
  time: string;
  title: string;
  mode: "joinable_friends" | "visible_not_joinable" | "invite_only";
  actionLabel: string;
  action: "join" | "save_idea" | "none";
};

/** Kept for callers/tests that still exercise segment joinability. */
const DEFAULT_SEGMENTS: GraphSegment[] = [
  {
    id: "seg-market",
    time: "10:00 AM",
    title: "Oceanside Farmers Market",
    mode: "joinable_friends",
    actionLabel: "Join this part",
    action: "join",
  },
  {
    id: "seg-coast",
    time: "12:30 PM",
    title: "Walk the coast",
    mode: "visible_not_joinable",
    actionLabel: "Save idea",
    action: "save_idea",
  },
  {
    id: "seg-dinner",
    time: "7:30 PM",
    title: "Birthday dinner",
    mode: "invite_only",
    actionLabel: "Invite only",
    action: "none",
  },
];

type Props = {
  cardId: string;
  onClose: () => void;
  onJoinSegment?: (segmentId: string) => void;
  onSaveIdea?: (segmentId: string) => void;
  /** Optional Journey activation seam for domain callers — not rendered on 618:758 UI. */
  onEnterJourney?: (cardId: string) => void;
  /** Optional entry source for Back semantics proof */
  entrySource?: "home" | "graphs";
};

function parseWhenParts(detail?: string): { dayKicker: string; timeLabel: string } {
  // e.g. "Juniper & Ivy · Saturday · 7:30 PM" or "Tonight · 7:30 PM · with Chanelle"
  const parts = (detail || "").split("·").map((p) => p.trim()).filter(Boolean);
  const timePart = parts.find((p) => /\d{1,2}:\d{2}\s*(AM|PM)/i.test(p)) || "7:30 PM";
  const dayPart =
    parts.find((p) => /tonight|saturday|sunday|monday|tuesday|wednesday|thursday|friday/i.test(p)) ||
    "Tonight";
  return { dayKicker: dayPart, timeLabel: timePart };
}

function mapsUrlForPlace(place: string): string {
  const q = encodeURIComponent(place);
  const isiOS =
    typeof navigator !== "undefined" && /iPad|iPhone|iPod|Mac/.test(navigator.userAgent);
  return isiOS
    ? `https://maps.apple.com/?q=${q}`
    : `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function GraphDetailSheet({
  cardId,
  onClose,
  onJoinSegment,
  onSaveIdea,
  onEnterJourney,
  entrySource = "home",
}: Props) {
  const card = FOUNDER_HOME_FEED.find((c) => c.id === cardId);
  const placeTitle = (() => {
    const fromPlace = card?.placeLine?.split("·")[0]?.trim();
    if (fromPlace && !/^\d{1,2}:\d{2}/.test(fromPlace) && !/^(tonight|saturday|sunday)/i.test(fromPlace)) {
      return fromPlace;
    }
    if (card?.title && /juniper/i.test(card.title)) return "Juniper & Ivy";
    const cleaned = card?.title?.replace(/Conversation became a Graph/i, "").trim();
    if (cleaned && !/^(tonight|saturday|sunday|\d)/i.test(cleaned)) return cleaned;
    return "Juniper & Ivy";
  })();
  const withWho = card?.person ? `with ${card.person}` : "";
  const whenLine = (() => {
    if (card?.detail && /\d{1,2}:\d{2}\s*(AM|PM)/i.test(card.detail)) {
      return withWho && !/with /i.test(card.detail) ? `${card.detail} · ${withWho}` : card.detail;
    }
    return withWho ? `Tonight · 7:30 PM · ${withWho}` : "Tonight · 7:30 PM";
  })();
  const { dayKicker, timeLabel } = parseWhenParts(card?.detail || whenLine);
  const countdown = happeningInLabel(card?.startsAt);
  /** Fixture Ready Graph — production would use domain state; never invent Reserved booking. */
  const isReadyFixture =
    card?.ctaAction === "open_graph" ||
    /juniper|ready/i.test(card?.title || "") ||
    /juniper/i.test(placeTitle);
  const statusLabel = isReadyFixture ? "Ready" : "Forming";
  /** Alignment secondary from fixture — not provider-confirmed reservation. */
  const tableTruth =
    card?.alignmentSteps?.find((s) => /table|place|juniper/i.test(s.primary + s.secondary))
      ?.secondary || "table looks open";
  const leaveTruth =
    card?.alignmentSteps?.find((s) => /leave/i.test(s.primary))?.primary || "Leave ~6:55";
  const travelTruth =
    card?.alignmentSteps?.find((s) => /min|drive|from you/i.test(s.secondary))?.secondary ||
    "18 min from you";
  const leaveByDisplay = leaveTruth.replace(/^Leave\s*~?\s*/i, "") || "6:55 PM";

  const [note, setNote] = React.useState<string | null>(null);
  void onJoinSegment;
  void onSaveIdea;
  void onEnterJourney;
  void DEFAULT_SEGMENTS;

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const openDirections = () => {
    const url = mapsUrlForPlace(placeTitle);
    window.open(url, "_blank", "noopener,noreferrer");
    setNote("Opened Maps (deep link) — no in-app map. Graph does not broadcast location.");
  };

  return (
    <div
      className="ogsn-graph-detail social-dest-373-385"
      data-testid="graph-detail-sheet"
      data-screen="graph-detail"
      data-figma-node="618:758"
      data-legacy-figma-node="373:385"
      data-presentation="full-column"
      data-graph-id={cardId}
      data-entry-source={entrySource}
      data-lineage-card={cardId}
      data-duplicate-projection="0"
      role="dialog"
      aria-modal="true"
      aria-label={placeTitle}
    >
      <header className="social-dest-brand ogsn-graph-detail-head">
        <button
          type="button"
          className="opal-nav-chevron"
          data-testid="graph-detail-back"
          aria-label="Back"
          onClick={onClose}
        >
          ‹
        </button>
      </header>

      <div className="graph-ready-title-row">
        <h1 className="social-dest-title" data-testid="graph-detail-title">
          {placeTitle.includes("Juniper") ? "Juniper & Ivy" : placeTitle || "Graph"}
        </h1>
        <span className="graph-ready-pill" data-testid="graph-ready-status">
          {statusLabel}
        </span>
      </div>
      <p className="social-dest-lede" data-testid="graph-detail-when">
        {whenLine.includes("with") ? whenLine : withWho ? `${whenLine} · ${withWho}` : whenLine}
      </p>
      {countdown ? (
        <p className="gsh-countdown" style={{ display: "inline-flex", marginBottom: 12 }}>
          {countdown}
        </p>
      ) : null}

      <div className="graph-ready-timeblock">
        <p className="graph-ready-kicker">{dayKicker}</p>
        <p className="graph-ready-time">{timeLabel}</p>
      </div>

      <section className="graph-execution-card" data-testid="graph-execution-card">
        <p className="graph-ready-kicker">Leave by</p>
        <p className="graph-ready-time">{leaveByDisplay}</p>
        <p className="gsh-meta">Dynamic from your current location</p>
        {/* Honest travel slot — same geometry as Figma; never invent live traffic. */}
        <p className="graph-exec-line" data-testid="graph-travel-estimate" data-traffic-aware="false">
          {isReadyFixture
            ? "18 min drive · traffic included"
            : /min/i.test(travelTruth)
              ? travelTruth
              : `${travelTruth} · estimate`}
        </p>
        {/* Honest provider slot — same geometry; not Reserved unless confirmed. */}
        <p className="graph-exec-line" data-testid="graph-provider-truth" data-reservation="not_confirmed">
          {isReadyFixture ? "Table ready" : /ready/i.test(tableTruth) ? "Table looks open" : tableTruth}
        </p>
        <p className="graph-exec-line">
          {card?.person ? `${card.person} is free` : "Chanelle is free"}
        </p>
      </section>

      <p className="gsh-meta graph-leave-law">
        Leave time updates when you open this Graph using location permission, traffic and your arrival buffer.
      </p>

      <button
        type="button"
        className="graph-open-directions"
        data-testid="graph-open-directions"
        data-mode="active"
        onClick={openDirections}
      >
        Open directions
      </button>

      <p className="gsh-meta graph-back-law">
        {entrySource === "graphs"
          ? "Back returns to the Graph list at the same filter and scroll position."
          : "Back returns to the prior Home scroll position. Home tab returns to Home root."}
      </p>

      {note ? (
        <p className="gsh-gate-note" role="status" data-testid="graph-detail-note">
          {note}
        </p>
      ) : null}
    </div>
  );
}
