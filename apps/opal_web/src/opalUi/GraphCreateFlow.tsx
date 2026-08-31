/**
 * Manual Create Graph — CURRENT Section 07 destinations:
 * 863:284 Choose photo/video → 863:338 Add to your Graph
 * Lineage only: 149:31 / 145:216
 *
 * Camera = SYSTEM_DEPENDENCY via capture input (never fake shutter).
 * Library = real system file picker.
 * Mutation = existing onCreated → createdGraphs owner (no parallel store).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";

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

/** Formal Figma media for 863:338 deterministic proof — not a claim of camera capture. */
export const CREATE_FIGMA_MEDIA_FIXTURE =
  "/figma-v2/create/add-to-graph-media-863-338.jpg";

const RECENT_SLOTS = [
  { bg: "#0d171c" },
  { bg: "#1a140f" },
  { bg: "#0d171c" },
  { bg: "#1a140f" },
  { bg: "#0d171c" },
  { bg: "#1a140f" },
];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

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
  const [cameraCapability, setCameraCapability] = useState<
    "system_dependency" | "unsupported" | "denied"
  >("system_dependency");

  const libraryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
    setCameraCapability("system_dependency");
  }, [open, knownWhere, knownWhen]);

  /* Narrow viewports: scale the locked 390 stage (formal parity remains 390×844). */
  useEffect(() => {
    if (!open) return;
    const apply = () => {
      const el = document.querySelector<HTMLElement>(".graph-create-flow");
      if (!el) return;
      const w = window.innerWidth;
      if (w < 390) {
        el.style.transform = `scale(${w / 390})`;
        el.style.transformOrigin = "top left";
        el.style.left = "0px";
      } else if (w > 390) {
        el.style.transform = "translateX(-50%)";
        el.style.transformOrigin = "top left";
        el.style.left = "50%";
      } else {
        el.style.transform = "";
        el.style.left = "0px";
      }
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [open, step]);

  const contextLine = useMemo(() => {
    const bits = [
      knownWho ? `WHO known: ${knownWho}` : null,
      knownWhere ? `WHERE known` : null,
      knownWhen ? `WHEN known` : null,
    ].filter(Boolean);
    return bits.length ? bits.join(" · ") : null;
  }, [knownWho, knownWhere, knownWhen]);

  async function ingestFile(file: File | undefined, source: "camera" | "library") {
    if (!file) {
      if (source === "camera") {
        setNote("Camera cancelled or unavailable — use Library, or try again.");
        setCameraCapability("unsupported");
      }
      return;
    }
    const kind = file.type.startsWith("video/") ? "video" : "photo";
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setNote("That file type isn’t supported. Choose a photo or video.");
      return;
    }
    try {
      const url = await readFileAsDataUrl(file);
      if (!url) {
        setNote("Couldn’t read that media. Try another file.");
        return;
      }
      void kind;
      setMediaSrc(url);
      setNote(null);
      setStep("compose");
    } catch {
      setNote("Couldn’t read that media. Try another file.");
    }
  }

  function openLibrary() {
    setNote(null);
    libraryInputRef.current?.click();
  }

  function openCamera() {
    setNote(null);
    // Truthful: browser/OS owns permission + capture. No fake shutter UI.
    if (typeof cameraInputRef.current?.click !== "function") {
      setCameraCapability("unsupported");
      setNote("Camera isn’t available here — use Library instead.");
      return;
    }
    try {
      cameraInputRef.current.click();
    } catch {
      setCameraCapability("unsupported");
      setNote("Camera isn’t available here — use Library instead.");
    }
  }

  if (!open) return null;

  return (
    <div
      className="graph-create-flow"
      data-testid="graph-create-flow"
      data-figma-create={step === "choose_media" ? "863:284" : "863:338"}
      data-figma-node={step === "choose_media" ? "863:284" : "863:338"}
      data-figma-create-lineage={step === "choose_media" ? "149:31" : "145:216"}
      data-camera-capability={cameraCapability}
      data-screen={step === "choose_media" ? "create-media" : "add-to-graph"}
      role="dialog"
      aria-modal="true"
      aria-label={step === "choose_media" ? "Create" : "Add to your graph"}
    >
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*,video/*"
        className="graph-create-file-input"
        data-testid="graph-create-library-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void ingestFile(file, "library");
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="graph-create-file-input"
        data-testid="graph-create-camera-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void ingestFile(file, "camera");
        }}
      />

      {step === "choose_media" ? (
        <div className="graph-create-choose" data-testid="graph-create-choose-media">
          <button
            type="button"
            className="graph-create-back"
            data-testid="graph-create-back"
            aria-label="Back"
            onClick={() => onClose()}
          >
            ‹
          </button>
          <h1 className="graph-create-title">Create</h1>
          <p className="graph-create-lede">Start with something people can feel.</p>
          {contextLine ? (
            <p className="graph-create-context" data-testid="graph-create-context">
              {contextLine} — Opal will not re-ask known dimensions.
            </p>
          ) : null}

          <div className="graph-create-hero" aria-hidden>
            <span className="graph-create-hero-plus">＋</span>
            <p className="graph-create-hero-label">Take a photo or video</p>
            <p className="graph-create-hero-sub">or choose something you already captured</p>
          </div>

          <div className="graph-create-media-actions">
            <button
              type="button"
              className="graph-create-pill graph-create-pill-camera"
              data-testid="graph-create-camera"
              data-mode="dependency"
              onClick={openCamera}
            >
              Camera
            </button>
            <button
              type="button"
              className="graph-create-pill graph-create-pill-library"
              data-testid="graph-create-library"
              onClick={openLibrary}
            >
              Library
            </button>
          </div>

          <p className="graph-create-recent-label">Recent</p>
          <div className="graph-create-recent" data-testid="graph-create-recent">
            {RECENT_SLOTS.map((slot, i) => (
              <button
                key={i}
                type="button"
                className="graph-create-thumb"
                style={{ background: slot.bg }}
                data-testid={`graph-create-recent-${i}`}
                aria-label="Recent media slot — empty"
                onClick={openLibrary}
              />
            ))}
          </div>
          <p className="graph-create-hint">Media can be changed before you add it to your graph.</p>
        </div>
      ) : (
        <div className="graph-create-compose" data-testid="graph-create-compose">
          <button
            type="button"
            className="graph-create-back"
            data-testid="graph-create-back"
            aria-label="Back"
            onClick={() => {
              setStep("choose_media");
              setNote(null);
            }}
          >
            ‹
          </button>
          <h1 className="graph-create-compose-title">Add to your graph</h1>

          <div className="graph-create-compose-media">
            {mediaSrc ? <img src={mediaSrc} alt="" draggable={false} /> : null}
            <span className="graph-create-graph-pill">GRAPH</span>
            <button
              type="button"
              className="graph-create-replace"
              data-testid="graph-create-replace"
              onClick={openLibrary}
            >
              Photo / video
            </button>
          </div>

          <label className="graph-create-field-label" htmlFor="gc-title">
            <span className="sr-only">Title</span>
          </label>
          <input
            id="gc-title"
            className="graph-create-title-input"
            data-testid="graph-create-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            id="gc-when"
            className="graph-create-when-input"
            data-testid="graph-create-when"
            value={whenLabel}
            onChange={(e) => setWhenLabel(e.target.value)}
          />
          <p className="graph-create-caption-label">Caption</p>
          <textarea
            id="gc-caption"
            className="graph-create-caption-input"
            data-testid="graph-create-caption"
            rows={2}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />

          <p className="graph-create-who-label">Who can see it?</p>
          <div className="graph-create-audience">
            <span className="graph-create-chip graph-create-chip-close">Close circle</span>
            <button
              type="button"
              className={`graph-create-chip graph-create-chip-join${joinRequestsOn ? " is-on" : ""}`}
              data-testid="graph-create-join-requests"
              onClick={() => setJoinRequestsOn((v) => !v)}
            >
              Join requests {joinRequestsOn ? "on" : "off"}
            </button>
            <button
              type="button"
              className={`graph-create-chip graph-create-chip-spot${exactSpotAfterJoin ? " is-on" : ""}`}
              data-testid="graph-create-exact-spot"
              onClick={() => setExactSpotAfterJoin((v) => !v)}
            >
              Exact spot after join
            </button>
          </div>

          <button
            type="button"
            className="graph-create-submit"
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
              onClose();
            }}
          >
            Add to graph
          </button>
          <p className="graph-create-footer">You control who sees the details.</p>
        </div>
      )}

      {note ? (
        <p className="graph-create-note" role="status" data-testid="graph-create-note">
          {note}
          {cameraCapability !== "system_dependency" && step === "choose_media" ? (
            <>
              {" "}
              <button
                type="button"
                className="graph-create-note-action"
                data-testid="graph-create-use-library"
                onClick={openLibrary}
              >
                Use Library
              </button>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
