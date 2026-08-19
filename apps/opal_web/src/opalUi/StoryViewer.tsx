/**
 * STORY-01 — Temporary story viewer
 * Figma 357:418
 * Temporary. Not Memory. Not Graph. No auto-promotion.
 */
import React from "react";
import { OpalMark } from "../brand/OpalLogo";
import type { FounderStoryItem } from "./founderGraphSeed";

type Props = {
  story: FounderStoryItem;
  onClose: () => void;
};

export function StoryViewer({ story, onClose }: Props) {
  return (
    <div
      className="story-viewer"
      data-testid="story-viewer"
      data-figma-story="357:418"
      role="dialog"
      aria-modal="true"
      aria-label={`${story.person} story`}
    >
      <header className="story-viewer-head">
        <OpalMark size="sm" title="" />
        <strong>{story.person}</strong>
        <span className="gsh-meta">{story.when}</span>
        <button type="button" className="btn ghost" data-testid="story-viewer-close" onClick={onClose}>
          Close
        </button>
      </header>
      <div className="story-viewer-media">
        {story.mediaSrc ? <img src={story.mediaSrc} alt="" /> : <p className="gsh-empty">Story</p>}
      </div>
      <p className="gsh-meta story-viewer-law">Temporary · Story ≠ Memory · Story ≠ Graph</p>
    </div>
  );
}
