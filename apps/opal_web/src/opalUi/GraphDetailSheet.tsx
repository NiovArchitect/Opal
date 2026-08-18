/**
 * EXT-01 Graph Detail / Joinable Journey — Figma 145:150
 * Segment-level joinability. Same Reality lineage as feed Graph → Live.
 */
import React from "react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";
import { FOUNDER_HOME_FEED, happeningInLabel } from "./founderGraphSeed";

export type GraphSegment = {
  id: string;
  time: string;
  title: string;
  mode: "joinable_friends" | "visible_not_joinable" | "invite_only";
  actionLabel: string;
  action: "join" | "save_idea" | "none";
};

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
};

export function GraphDetailSheet({ cardId, onClose, onJoinSegment, onSaveIdea }: Props) {
  const card = FOUNDER_HOME_FEED.find((c) => c.id === cardId);
  const title = card?.title || "Graph";
  const countdown = happeningInLabel(card?.startsAt);
  const [saved, setSaved] = React.useState<Set<string>>(() => new Set());
  const [joined, setJoined] = React.useState<Set<string>>(() => new Set());
  const [note, setNote] = React.useState<string | null>(null);

  return (
    <div
      className="ogsn-graph-detail"
      data-testid="graph-detail-sheet"
      data-figma-ext="145:150"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header className="ogsn-graph-detail-head">
        <button type="button" className="btn ghost" data-testid="graph-detail-back" onClick={onClose}>
          Back
        </button>
        <OpalMark size="sm" title="" />
        <OpalWordmark height={18} title="" compact />
      </header>

      <h1 className="gsh-card-title">{title}</h1>
      <p className="gsh-meta">{card?.placeLine || card?.detail}</p>
      {countdown ? <p className="gsh-countdown" style={{ display: "inline-flex", marginTop: 10 }}>{countdown}</p> : null}
      {card?.person ? <p className="gsh-meta" style={{ marginTop: 8 }}>Led with {card.person}</p> : null}

      <h2 className="gsh-meta" style={{ marginTop: 22, letterSpacing: "0.08em" }}>
        SEGMENTS
      </h2>
      {DEFAULT_SEGMENTS.map((seg) => (
        <article key={seg.id} className="ogsn-seg" data-testid={`graph-seg-${seg.id}`} data-mode={seg.mode}>
          <p className="gsh-meta">{seg.time}</p>
          <p className="gsh-card-title" style={{ fontSize: "1.05rem" }}>
            {seg.title}
          </p>
          <p className="gsh-meta">
            {seg.mode === "joinable_friends"
              ? "JOINABLE · FRIENDS"
              : seg.mode === "visible_not_joinable"
                ? "VISIBLE · NOT JOINABLE"
                : "INVITE ONLY"}
          </p>
          <div className="ogsn-seg-actions">
            {seg.action === "join" ? (
              <button
                type="button"
                className="btn primary"
                data-testid={`graph-seg-join-${seg.id}`}
                disabled={joined.has(seg.id)}
                onClick={() => {
                  setJoined((p) => new Set(p).add(seg.id));
                  onJoinSegment?.(seg.id);
                  setNote("Joined this part — Going requires lock-in. Interested stays soft.");
                }}
              >
                {joined.has(seg.id) ? "Joined" : seg.actionLabel}
              </button>
            ) : null}
            {seg.action === "save_idea" ? (
              <button
                type="button"
                className="btn ghost"
                data-testid={`graph-seg-save-${seg.id}`}
                onClick={() => {
                  setSaved((p) => new Set(p).add(seg.id));
                  onSaveIdea?.(seg.id);
                  setNote("Saved privately — does not join, notify, or change Going.");
                }}
              >
                {saved.has(seg.id) ? "Saved" : seg.actionLabel}
              </button>
            ) : null}
            {seg.action === "none" ? (
              <span className="gsh-meta" data-mode="info">
                {seg.actionLabel}
              </span>
            ) : null}
          </div>
        </article>
      ))}

      {note ? (
        <p className="gsh-gate-note" role="status" data-testid="graph-detail-note">
          {note}
        </p>
      ) : null}
    </div>
  );
}
