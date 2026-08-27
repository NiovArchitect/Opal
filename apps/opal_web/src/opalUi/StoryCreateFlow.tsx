/**
 * STORY-02 — Temporary story create
 * Figma 476:92
 * Photo/video · Audience · Share — never auto-promotes to Memory/Graph.
 */
import React, { useState } from "react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";

type Props = {
  onClose: () => void;
  onShared?: (draft: { mediaSrc: string; audience: string }) => void;
};

const LIBRARY = [
  "/demo/moments/portrait.jpg",
  "/demo/moments/food.jpg",
  "/figma-v2/home-201/media-maya.png",
];

export function StoryCreateFlow({ onClose, onShared }: Props) {
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);
  const [audience, setAudience] = useState<"close_circle" | "friends">("close_circle");
  const [note, setNote] = useState<string | null>(null);

  return (
    <div
      className="story-create-flow"
      data-testid="story-create-flow"
      data-figma-story="476:92"
      role="dialog"
      aria-modal="true"
      aria-label="Create story"
    >
      <header className="graph-create-head">
        <button type="button" className="opal-nav-chevron" data-testid="story-create-back" aria-label="Back" onClick={onClose}>‹</button>
        <div className="gsh-brand">
          <OpalMark size="sm" title="" />
          <OpalWordmark height={18} title="" compact />
        </div>
      </header>
      <h1 className="chats-home-title">Your story</h1>
      <p className="gsh-meta">Temporary. Does not publish a Memory or Graph.</p>

      {!mediaSrc ? (
        <div data-testid="story-create-choose">
          <div className="graph-create-recent">
            {LIBRARY.map((src, i) => (
              <button
                key={src}
                type="button"
                className="graph-create-thumb"
                data-testid={`story-create-media-${i}`}
                onClick={() => setMediaSrc(src)}
              >
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div data-testid="story-create-compose">
          <div className="graph-create-compose-media">
            <img src={mediaSrc} alt="" />
          </div>
          <p className="gsh-meta">Who can see it?</p>
          <div className="opal-refine">
            <button
              type="button"
              className={`gsh-chip ${audience === "close_circle" ? "is-active" : ""}`}
              data-testid="story-audience-close"
              onClick={() => setAudience("close_circle")}
            >
              Close circle
            </button>
            <button
              type="button"
              className={`gsh-chip ${audience === "friends" ? "is-active" : ""}`}
              data-testid="story-audience-friends"
              onClick={() => setAudience("friends")}
            >
              Friends
            </button>
          </div>
          <button
            type="button"
            className="btn primary"
            data-testid="story-create-share"
            data-mode="active"
            onClick={() => {
              onShared?.({ mediaSrc, audience });
              setNote("Story shared temporarily — expires; not on profile as Memory.");
              onClose();
            }}
          >
            Share story
          </button>
        </div>
      )}
      {note ? (
        <p className="gsh-gate-note" role="status">
          {note}
        </p>
      ) : null}
    </div>
  );
}
