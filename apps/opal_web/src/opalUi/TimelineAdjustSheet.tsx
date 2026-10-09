/**
 * Paste W 3.6 — Adjust sheet for Graphs timeline items.
 * Functional options: time / venue / people / message / cancel.
 */
import React, { useState } from "react";
import type { TimelineItem } from "./GraphsTemporalTimeline";

type Props = {
  item: TimelineItem;
  onClose: () => void;
  onSaveTime?: (timeLabel: string) => void;
  onSaveVenue?: (venue: string) => void;
  onAddPeople?: () => void;
  onMessage?: () => void;
};

export function TimelineAdjustSheet({
  item,
  onClose,
  onSaveTime,
  onSaveVenue,
  onAddPeople,
  onMessage,
}: Props) {
  const [timeLabel, setTimeLabel] = useState(item.whenLabel || "");
  const [venue, setVenue] = useState(item.where || "");
  const [note, setNote] = useState<string | null>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="timeline-adjust-sheet"
      data-testid="timeline-adjust-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={`Adjust ${item.title}`}
    >
      <button
        type="button"
        className="timeline-adjust-backdrop"
        aria-label="Close adjust"
        data-testid="timeline-adjust-backdrop"
        onClick={onClose}
      />
      <div className="timeline-adjust-card">
        <header className="timeline-adjust-head">
          <h2 className="timeline-adjust-title" data-testid="timeline-adjust-title">
            Adjust · {item.title}
          </h2>
          <button
            type="button"
            className="btn ghost"
            data-testid="timeline-adjust-cancel"
            onClick={onClose}
          >
            Cancel
          </button>
        </header>

        <label className="opal-query-label" htmlFor="timeline-adjust-time">
          Time
        </label>
        <input
          id="timeline-adjust-time"
          className="chats-home-search"
          data-testid="timeline-adjust-time"
          value={timeLabel}
          onChange={(e) => setTimeLabel(e.target.value)}
          placeholder="Saturday · 7:30 PM"
        />
        <button
          type="button"
          className="btn"
          data-testid="timeline-adjust-save-time"
          onClick={() => {
            onSaveTime?.(timeLabel.trim());
            setNote(timeLabel.trim() ? `Time updated · ${timeLabel.trim()}` : "Enter a time.");
          }}
        >
          Save time
        </button>

        <label className="opal-query-label" htmlFor="timeline-adjust-venue">
          Venue
        </label>
        <input
          id="timeline-adjust-venue"
          className="chats-home-search"
          data-testid="timeline-adjust-venue"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          placeholder="Place name"
        />
        <button
          type="button"
          className="btn"
          data-testid="timeline-adjust-save-venue"
          onClick={() => {
            onSaveVenue?.(venue.trim());
            setNote(venue.trim() ? `Venue updated · ${venue.trim()}` : "Enter a venue.");
          }}
        >
          Save venue
        </button>

        <div className="timeline-adjust-actions" role="group" aria-label="More adjust actions">
          <button
            type="button"
            className="btn"
            data-testid="timeline-adjust-people"
            onClick={() => onAddPeople?.()}
          >
            Add someone
          </button>
          <button
            type="button"
            className="btn"
            data-testid="timeline-adjust-message"
            onClick={() => onMessage?.()}
          >
            Message
          </button>
        </div>

        {note ? (
          <p className="gsh-gate-note" role="status" data-testid="timeline-adjust-note">
            {note}
          </p>
        ) : null}
      </div>
    </div>
  );
}
