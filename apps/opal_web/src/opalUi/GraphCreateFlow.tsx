/**
 * Manual Create Graph — CURRENT Section 07 destinations:
 * 863:284 Choose photo/video → 863:338 Add to your Graph
 * Lineage only: 149:31 / 145:216
 *
 * Tranche #1: native host → Expo camera/library bridge; browser → file-input fallback.
 * Mutation = existing onCreated → createdGraphs owner (no parallel store).
 */
import React, { useEffect, useMemo, useState } from "react";
import { acquireMedia, mediaKindFromMime } from "../mediaAcquisition";

export type GraphCreateDraft = {
  mediaSrc: string;
  mediaKind: "photo" | "video";
  title: string;
  whenLabel: string;
  caption: string;
  audience: "close_circle" | "friends" | "custom" | "private";
  joinRequestsOn: boolean;
  exactSpotAfterJoin: boolean;
};

type Step = "choose_media" | "compose";

type Props = {
  open: boolean;
  /**
   * Repair #15: "post" = Home Add Post. Its draft is published durably by the
   * host (SocialMoment) — the audience selector offers only visibilities the
   * backend actually enforces (friends / private), and submit stays open on
   * failure. "graph" keeps the legacy local-draft behavior for plan/repeat.
   */
  mode?: "graph" | "post";
  onClose: () => void;
  /** Optional known context from conversation/Home — speed to alignment. */
  knownWho?: string | null;
  knownWhere?: string | null;
  /**
   * When known: prefill. `null` = explicitly undecided (Repeat) — leave empty.
   * `undefined` = blank create placeholder.
   */
  knownWhen?: string | null;
  /** Optional — open existing people picker to change WHO (Repeat default same people). */
  onChangeWho?: () => void;
  /** May be async: the flow closes only after it resolves; a rejection keeps the draft open with the error shown. */
  onCreated?: (draft: GraphCreateDraft) => Promise<void> | void;
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

export function GraphCreateFlow({
  open,
  mode = "graph",
  onClose,
  knownWho,
  knownWhere,
  knownWhen,
  onChangeWho,
  onCreated,
}: Props) {
  const isPost = mode === "post";
  const [step, setStep] = useState<Step>("choose_media");
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<"photo" | "video">("photo");
  const [title, setTitle] = useState(isPost ? "" : knownWhere || "Beach at sunset");
  const [whenLabel, setWhenLabel] = useState(
    isPost ? "" : knownWhen === null ? "" : knownWhen || "Saturday · around 6:00 PM",
  );
  // Post mode starts blank — prefilled fiction must never be publishable by accident.
  const [caption, setCaption] = useState(isPost ? "" : "Golden hour at Moonlight. Needed this.");
  const [postAudience, setPostAudience] = useState<"friends" | "private">("friends");
  const [joinRequestsOn, setJoinRequestsOn] = useState(true);
  const [exactSpotAfterJoin, setExactSpotAfterJoin] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!mediaSrc || submitting) return;
    const draft: GraphCreateDraft = {
      mediaSrc,
      mediaKind,
      title: title.trim() || "Untitled Graph",
      whenLabel: whenLabel.trim(),
      caption: caption.trim(),
      audience: isPost ? postAudience : "close_circle",
      joinRequestsOn,
      exactSpotAfterJoin,
    };
    setSubmitting(true);
    setNote(null);
    try {
      await onCreated?.(draft);
      onClose();
    } catch (e) {
      // Draft stays open — a failed publish must never look like a posted one.
      setNote(
        e instanceof Error ? `Couldn't post: ${e.message}` : "Couldn't post. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }
  const [cameraCapability, setCameraCapability] = useState<
    "native_bridge" | "browser_fallback" | "unsupported" | "denied"
  >("native_bridge");

  useEffect(() => {
    if (!open) return;
    setStep("choose_media");
    setMediaSrc(null);
    setMediaKind("photo");
    setTitle(isPost ? "" : knownWhere || "Beach at sunset");
    // null = Repeat / new decision — do not copy past when or invent a slot.
    setWhenLabel(isPost ? "" : knownWhen === null ? "" : knownWhen || "Saturday · around 6:00 PM");
    setCaption(isPost ? "" : "Golden hour at Moonlight. Needed this.");
    setPostAudience("friends");
    setJoinRequestsOn(true);
    setExactSpotAfterJoin(true);
    setNote(null);
    setBusy(false);
    setSubmitting(false);
    setCameraCapability("native_bridge");
  }, [open, knownWhere, knownWhen, isPost]);

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

  async function openSource(source: "camera" | "photo_library") {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const result = await acquireMedia({
        source,
        initiating_surface: "graph_create",
        media_types: ["image", "video"],
        accept: "image/*,video/*",
      });
      if (result.status === "cancelled") {
        if (source === "camera") {
          setNote("Camera cancelled - use Library, or try again.");
        }
        return;
      }
      if (result.status === "error") {
        if (result.code === "permission_denied") {
          setCameraCapability("denied");
        } else if (source === "camera") {
          setCameraCapability("unsupported");
        }
        setNote(result.message);
        return;
      }
      const kind = mediaKindFromMime(result.asset.mime_type);
      if (kind === "document") {
        setNote("That file type isn’t supported. Choose a photo or video.");
        return;
      }
      setMediaKind(kind);
      setMediaSrc(result.asset.preview_url);
      setNote(null);
      setStep("compose");
    } finally {
      setBusy(false);
    }
  }

  function openLibrary() {
    void openSource("photo_library");
  }

  function openCamera() {
    void openSource("camera");
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
      data-media-bridge="native-or-fallback"
      data-screen={step === "choose_media" ? "create-media" : "add-to-graph"}
      role="dialog"
      aria-modal="true"
      aria-label={step === "choose_media" ? "Create" : "Add to your graph"}
    >
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
              {contextLine} - Opal will not re-ask known dimensions.
              {knownWho && onChangeWho ? (
                <>
                  {" "}
                  <button
                    type="button"
                    className="graph-create-change-who"
                    data-testid="graph-create-change-who"
                    onClick={onChangeWho}
                  >
                    Change who
                  </button>
                </>
              ) : null}
            </p>
          ) : null}

          <div className="graph-create-hero">
            <span className="graph-create-hero-plus" aria-hidden>
              ＋
            </span>
            <p className="graph-create-hero-label">Take a photo or video</p>
            <p className="graph-create-hero-sub">or choose something you already captured</p>
            <div className="graph-create-media-actions">
              <button
                type="button"
                className="graph-create-pill graph-create-pill-camera"
                data-testid="graph-create-camera"
                data-mode="native-bridge"
                disabled={busy}
                onClick={openCamera}
              >
                Camera
              </button>
              <button
                type="button"
                className="graph-create-pill graph-create-pill-library"
                data-testid="graph-create-library"
                disabled={busy}
                onClick={openLibrary}
              >
                Library
              </button>
            </div>
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
                aria-label="Recent media slot - empty"
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
          <h1 className="graph-create-compose-title">{isPost ? "Create post" : "Add to your graph"}</h1>

          <div className="graph-create-compose-media">
            {mediaSrc ? <img src={mediaSrc} alt="" draggable={false} /> : null}
            <span className="graph-create-graph-pill">{isPost ? "POST" : "GRAPH"}</span>
            <button
              type="button"
              className="graph-create-replace"
              data-testid="graph-create-replace"
              onClick={openLibrary}
            >
              Photo / video
            </button>
          </div>

          {isPost ? null : (
            <>
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
                placeholder="When - decide together"
                value={whenLabel}
                onChange={(e) => setWhenLabel(e.target.value)}
              />
            </>
          )}
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
          {isPost ? (
            <div className="graph-create-audience" role="group" aria-label="Post audience">
              <button
                type="button"
                className={`graph-create-chip${postAudience === "friends" ? " is-on" : ""}`}
                data-testid="graph-create-audience-friends"
                aria-pressed={postAudience === "friends"}
                onClick={() => setPostAudience("friends")}
              >
                Friends
              </button>
              <button
                type="button"
                className={`graph-create-chip${postAudience === "private" ? " is-on" : ""}`}
                data-testid="graph-create-audience-private"
                aria-pressed={postAudience === "private"}
                onClick={() => setPostAudience("private")}
              >
                Only me
              </button>
            </div>
          ) : (
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
          )}

          <button
            type="button"
            className="graph-create-submit"
            data-testid="graph-create-submit"
            disabled={submitting}
            onClick={() => void submit()}
          >
            {submitting ? "Posting..." : isPost ? "Post" : "Add to graph"}
          </button>
          <p className="graph-create-footer">You control who sees the details.</p>
        </div>
      )}

      {note ? (
        <p className="graph-create-note" role="status" data-testid="graph-create-note">
          {note}
          {(cameraCapability === "unsupported" || cameraCapability === "denied") &&
          step === "choose_media" ? (
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
