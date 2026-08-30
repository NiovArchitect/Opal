/**
 * Journey Manage Plan — CURRENT 863:88
 * Lineage only: 258:2
 * Lead/co-lead only for material mutations.
 */
import React, { useState } from "react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";
import type { JourneyProjection } from "./JourneySurface";

type Props = {
  journey: JourneyProjection;
  onBack: () => void;
  onChangeTime: (timeLabel: string) => void;
  onChangePlace: (place: string) => void;
  onAddPeople: () => void;
  onAssignCoLead?: (peerUserId: string) => void;
  onHandoffLead?: (peerUserId: string) => void;
  deniedNote?: string | null;
};

export function JourneyManageSheet({
  journey,
  onBack,
  onChangeTime,
  onChangePlace,
  onAddPeople,
  onAssignCoLead,
  onHandoffLead,
  deniedNote,
}: Props) {
  const [timeLabel, setTimeLabel] = useState(journey.when_label || "Saturday · 9:00 PM");
  const [place, setPlace] = useState(journey.place || "");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const can = !!journey.viewer?.can_manage;

  return (
    <div
      className="journey-manage-sheet"
      data-testid="journey-manage-sheet"
      data-figma-manage="863:88"
      data-figma-node="863:88"
      data-figma-manage-lineage="258:2"
      role="dialog"
      aria-modal="true"
      aria-label="Manage this plan"
    >
      <header className="graph-create-head">
        <button type="button" className="opal-nav-chevron" data-testid="journey-manage-back" aria-label="Back" onClick={onBack}>‹</button>
        <div className="gsh-brand">
          <OpalMark size="sm" title="" />
          <OpalWordmark height={18} title="" compact />
        </div>
      </header>
      <h1 className="chats-home-title">Manage this plan</h1>
      <p className="gsh-meta" data-testid="journey-manage-continuity">
        Same social reality · {journey.place || "Place"} · {journey.when_label || "When"}
      </p>

      {!can ? (
        <p className="gsh-gate-note" role="status" data-testid="journey-manage-forbidden">
          You can view this Journey, but only Lead/Co-lead can manage material changes.
        </p>
      ) : null}

      <section className="journey-manage-block" data-testid="journey-manage-roles">
        <h2 className="opal-query-label">Roles</h2>
        <p className="gsh-meta">
          Lead and co-lead can change time, place, and people. Material changes ask others to reconfirm.
        </p>
        {can && onAssignCoLead && journey.participants?.[0] ? (
          <button
            type="button"
            className="btn ghost"
            data-testid="journey-manage-co-lead"
            onClick={() => {
              const peer = journey.participants?.find(
                (p) => p.user_id !== journey.viewer && p.role === "participant",
              );
              if (peer) onAssignCoLead(peer.user_id);
            }}
          >
            Assign co-lead
          </button>
        ) : null}
      </section>

      <button
        type="button"
        className="btn"
        data-testid="journey-manage-suggest"
        disabled={!can}
        onClick={() => setSuggestOpen((v) => !v)}
      >
        Suggest a change
      </button>

      {suggestOpen ? (
        <div className="journey-manage-suggest" data-testid="journey-manage-suggest-form">
          <label className="opal-query-label" htmlFor="jm-time">
            Time (include AM/PM)
          </label>
          <input
            id="jm-time"
            className="chats-home-search"
            data-testid="journey-manage-time"
            value={timeLabel}
            disabled={!can}
            onChange={(e) => setTimeLabel(e.target.value)}
          />
          <button
            type="button"
            className="btn primary"
            data-testid="journey-manage-save-time"
            disabled={!can}
            onClick={() => onChangeTime(timeLabel)}
          >
            Change time
          </button>

          <label className="opal-query-label" htmlFor="jm-place">
            Place
          </label>
          <input
            id="jm-place"
            className="chats-home-search"
            data-testid="journey-manage-place"
            value={place}
            disabled={!can}
            onChange={(e) => setPlace(e.target.value)}
          />
          <button
            type="button"
            className="btn"
            data-testid="journey-manage-save-place"
            disabled={!can}
            onClick={() => onChangePlace(place)}
          >
            Change place
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className="btn"
        data-testid="journey-manage-add-people"
        disabled={!can}
        onClick={onAddPeople}
      >
        Add people
      </button>

      {can && onHandoffLead ? (
        <button
          type="button"
          className="btn ghost"
          data-testid="journey-manage-handoff"
          onClick={() => {
            const peer = journey.participants?.find((p) => p.committed && p.role !== "lead");
            if (peer) onHandoffLead(peer.user_id);
          }}
        >
          Hand off lead
        </button>
      ) : null}

      {deniedNote ? (
        <p className="gsh-gate-note" role="alert" data-testid="journey-manage-denied">
          {deniedNote}
        </p>
      ) : null}
      <p className="gsh-meta">Material changes require reconfirmation from committed participants.</p>
    </div>
  );
}
