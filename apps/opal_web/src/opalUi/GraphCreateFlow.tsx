/**
 * Manual Create Graph — founder-approved customer journey:
 * 149:31 Choose photo/video → 145:216 Add to your Graph
 *
 * Does NOT dump into FindTime/planner as the primary UX.
 * Availability/time intelligence may be reused later when WHEN is unresolved.
 */
import React, { useEffect, useMemo, useState } from "react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";

export type GraphCreateDraft = {
  mediaSrc: string;
  mediaKind: "photo" | "video";
  title: string;
  whenLabel: string;
  caption: string;
  audience: "close_circle" | "friends" | "custom";
  joinRequestsOn: boolean;
  exactSpotAfterJoin: boolean;
};

type Step = "choose_media" | "compose";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Optional known context from conversation/Home — speed to alignment. */
  knownWho?: string | null;
  knownWhere?: string | null;
  knownWhen?: string | null;
  onCreated?: (draft: GraphCreateDraft) => void;
};

const LIBRARY = [
  "/demo/moments/portrait.jpg",
  "/demo/moments/food.jpg",
  "/demo/moments/restaurant.jpg",
  "/figma-v2/home-201/media-maya.png",
  "/figma-v2/home-201/media-juniper.png",
  "/demo/moments/portrait.jpg",
];

export function GraphCreateFlow({
  open,
  onClose,
  knownWho,
  knownWhere,
  knownWhen,
  onCreated,
}: Props) {
  const [step, setStep] = useState<Step>("choose_media");
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);
  const [title, setTitle] = useState(knownWhere || "Beach at sunset");
  const [whenLabel, setWhenLabel] = useState(knownWhen || "Saturday · around 6:00 PM");
  const [caption, setCaption] = useState("Golden hour at Moonlight. Needed this.");
  const [joinRequestsOn, setJoinRequestsOn] = useState(true);
  const [exactSpotAfterJoin, setExactSpotAfterJoin] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  // Reset when re-opened so known context and step stay honest.
  useEffect(() => {
    if (!open) return;
    setStep("choose_media");
    setMediaSrc(null);
    setTitle(knownWhere || "Beach at sunset");
    setWhenLabel(knownWhen || "Saturday · around 6:00 PM");
    setCaption("Golden hour at Moonlight. Needed this.");
    setJoinRequestsOn(true);
    setExactSpotAfterJoin(true);
    setNote(null);
  }, [open, knownWhere, knownWhen]);

  const contextLine = useMemo(() => {
    const bits = [
      knownWho ? `WHO known: ${knownWho}` : null,
      knownWhere ? `WHERE known` : null,
      knownWhen ? `WHEN known` : null,
    ].filter(Boolean);
    return bits.length ? bits.join(" · ") : null;
  }, [knownWho, knownWhere, knownWhen]);

  if (!open) return null;

  return (
    <div
      className="graph-create-flow"
      data-testid="graph-create-flow"
      data-figma-create={step === "choose_media" ? "149:31" : "145:216"}
      role="dialog"
      aria-modal="true"
      aria-label={step === "choose_media" ? "Choose photo or video" : "Add to your Graph"}
    >
      <header className="graph-create-head">
        <button
          type="button"
          className="btn ghost"
          data-testid="graph-create-back"
          onClick={() => {
            if (step === "compose") {
              setStep("choose_media");
              return;
            }
            onClose();
          }}
        >
          Back
        </button>
        <div className="gsh-brand">
          <OpalMark size="sm" title="" />
          <OpalWordmark height={18} title="" compact />
        </div>
      </header>

      {step === "choose_media" ? (
        <div data-testid="graph-create-choose-media">
          <h1 className="chats-home-title">New Graph</h1>
          <p className="gsh-meta">Choose a photo or video for the experience.</p>
          {contextLine ? (
            <p className="gsh-gate-note" data-testid="graph-create-context">
              {contextLine} — Opal will not re-ask known dimensions.
            </p>
          ) : null}

          <div className="graph-create-hero" aria-hidden>
            <span className="graph-create-hero-label">Camera / library</span>
          </div>
          <div className="graph-create-media-actions">
            <button
              type="button"
              className="btn ghost"
              data-testid="graph-create-camera"
              data-mode="dependency"
              onClick={() =>
                setNote("Camera capture is a dependency on web — pick from library for now.")
              }
            >
              Camera
            </button>
            <button
              type="button"
              className="btn primary"
              data-testid="graph-create-library"
              onClick={() => {
                setMediaSrc(LIBRARY[0]!);
                setStep("compose");
              }}
            >
              Library
            </button>
          </div>

          <p className="gsh-meta" style={{ marginTop: 18 }}>
            Recent
          </p>
          <div className="graph-create-recent" data-testid="graph-create-recent">
            {LIBRARY.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                className="graph-create-thumb"
                data-testid={`graph-create-recent-${i}`}
                onClick={() => {
                  setMediaSrc(src);
                  setStep("compose");
                }}
              >
                <img src={src} alt="" draggable={false} />
              </button>
            ))}
          </div>
          <p className="gsh-meta">This starts a Graph — future experience, not a Story.</p>
        </div>
      ) : (
        <div data-testid="graph-create-compose">
          <h1 className="chats-home-title">Add to your Graph</h1>
          {mediaSrc ? (
            <div className="graph-create-compose-media">
              <img src={mediaSrc} alt="" />
              <span className="gsh-countdown">GRAPH</span>
            </div>
          ) : null}
          <label className="opal-query-label" htmlFor="gc-title">
            Title
          </label>
          <input
            id="gc-title"
            className="chats-home-search"
            data-testid="graph-create-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label className="opal-query-label" htmlFor="gc-when">
            When
          </label>
          <input
            id="gc-when"
            className="chats-home-search"
            data-testid="graph-create-when"
            value={whenLabel}
            onChange={(e) => setWhenLabel(e.target.value)}
          />
          <label className="opal-query-label" htmlFor="gc-caption">
            Caption
          </label>
          <textarea
            id="gc-caption"
            className="opal-query"
            data-testid="graph-create-caption"
            rows={2}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <p className="gsh-meta">Who can see it?</p>
          <div className="opal-refine">
            <span className="gsh-chip is-active">Close circle</span>
            <button
              type="button"
              className={`gsh-chip ${joinRequestsOn ? "is-active" : ""}`}
              data-testid="graph-create-join-requests"
              onClick={() => setJoinRequestsOn((v) => !v)}
            >
              Join requests {joinRequestsOn ? "on" : "off"}
            </button>
            <button
              type="button"
              className={`gsh-chip ${exactSpotAfterJoin ? "is-active" : ""}`}
              data-testid="graph-create-exact-spot"
              onClick={() => setExactSpotAfterJoin((v) => !v)}
            >
              Exact spot after join
            </button>
          </div>
          <button
            type="button"
            className="btn primary"
            data-testid="graph-create-submit"
            onClick={() => {
              if (!mediaSrc) return;
              const draft: GraphCreateDraft = {
                mediaSrc,
                mediaKind: "photo",
                title: title.trim() || "Untitled Graph",
                whenLabel: whenLabel.trim(),
                caption: caption.trim(),
                audience: "close_circle",
                joinRequestsOn,
                exactSpotAfterJoin,
              };
              onCreated?.(draft);
              setNote("Graph created in founder/local lineage — return to Graphs/Home.");
              onClose();
            }}
          >
            Add to graph
          </button>
          <p className="gsh-meta">You control who sees the details.</p>
        </div>
      )}

      {note ? (
        <p className="gsh-gate-note" role="status" data-testid="graph-create-note">
          {note}
        </p>
      ) : null}
    </div>
  );
}
