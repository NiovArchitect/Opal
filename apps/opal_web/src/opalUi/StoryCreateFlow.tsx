/**
 * STORY-02 — Temporary story create
 * Figma 476:92
 * Photo/video · Audience · Share — never auto-promotes to Memory/Graph.
 * Tranche #1: native host uses Expo camera/library bridge; browser keeps file-input fallback.
 */
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";
import { acquireMedia } from "../mediaAcquisition";

type Props = {
  onClose: () => void;
  /**
   * Repair #15: sharing is async and authoritative. The flow stays open until
   * the backend confirms the story exists; a rejection keeps the draft on
   * screen with the error — it must never close with a fake "shared".
   */
  onShared?: (draft: { mediaSrc: string; audience: string; caption: string }) => Promise<void> | void;
};

const LIBRARY = [
  "/demo/moments/portrait.jpg",
  "/demo/moments/food.jpg",
  "/figma-v2/home-201/media-maya.png",
];

export function StoryCreateFlow({ onClose, onShared }: Props) {
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);
  const [audience, setAudience] = useState<"close_circle" | "friends">("close_circle");
  const [caption, setCaption] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);

  async function share() {
    if (!mediaSrc || sharing) return;
    if (!onShared) {
      setNote("Story sharing isn't connected on this surface yet.");
      return;
    }
    setSharing(true);
    setNote(null);
    try {
      await onShared({ mediaSrc, audience, caption: caption.trim() });
      onClose();
    } catch (e) {
      // Stay open with the draft intact — never report a share that failed.
      setNote(
        e instanceof Error
          ? `Couldn't share your story: ${e.message}`
          : "Couldn't share your story. Try again.",
      );
    } finally {
      setSharing(false);
    }
  }

  async function openSource(source: "camera" | "photo_library") {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const result = await acquireMedia({
        source,
        initiating_surface: "story",
        media_types: ["image", "video"],
        accept: "image/*,video/*",
      });
      if (result.status === "cancelled") {
        setNote(
          source === "camera"
            ? "Camera cancelled - choose Photo library, or try again."
            : "Photo library cancelled.",
        );
        return;
      }
      if (result.status === "error") {
        setNote(result.message);
        return;
      }
      setMediaSrc(result.asset.preview_url);
      setNote(null);
    } finally {
      setBusy(false);
    }
  }

  // Repair #17 (W3): mount in the TOP layer. Rendered inline, the composer
  // sat inside the .app stacking context and the social/Home screen painted
  // over it (founder phone walk: composer visible only inside a frame behind
  // Home). Portaling to document.body — the same contract CallSurfaces and
  // the full-live destination use — puts it above every surface, fully
  // interactive. CSS keeps the .story-create-flow layer rules (z-index 80 /
  // native-host 10060) which now apply at the root stacking level.
  const flow = (
    <div
      className="story-create-flow"
      data-testid="story-create-flow"
      data-top-layer="portal-body"
      data-figma-story="476:92"
      data-media-bridge="native-or-fallback"
      role="dialog"
      aria-modal="true"
      aria-label="Create story"
    >
      <header className="graph-create-head story-create-chrome">
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
          <div className="story-create-source-actions" role="group" aria-label="Story media sources">
            <button
              type="button"
              className="graph-create-pill graph-create-pill-camera"
              data-testid="story-create-camera"
              disabled={busy}
              onClick={() => void openSource("camera")}
            >
              Camera
            </button>
            <button
              type="button"
              className="graph-create-pill graph-create-pill-library"
              data-testid="story-create-library"
              disabled={busy}
              onClick={() => void openSource("photo_library")}
            >
              Photo library
            </button>
          </div>
          <p className="gsh-meta">Or choose a recent capture</p>
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
          <label className="gsh-meta" htmlFor="story-caption">
            Caption
          </label>
          <textarea
            id="story-caption"
            className="graph-create-caption-input"
            data-testid="story-create-caption"
            rows={2}
            placeholder="Say something about this moment"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
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
            disabled={sharing}
            onClick={() => void share()}
          >
            {sharing ? "Sharing..." : "Share story"}
          </button>
          <button
            type="button"
            className="gsh-chip"
            data-testid="story-create-replace-media"
            onClick={() => {
              setMediaSrc(null);
              setNote(null);
            }}
          >
            Replace media
          </button>
        </div>
      )}
      {note ? (
        <p className="gsh-gate-note" role="status" data-testid="story-create-media-note">
          {note}
        </p>
      ) : null}
    </div>
  );
  if (typeof document === "undefined") return flow;
  return createPortal(flow, document.body);
}
