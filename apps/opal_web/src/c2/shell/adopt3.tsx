/**
 * Repair #18 adoption wave 3 - ST-C moments archive, ST-H voice-note
 * composer, 4.C11 Your library. All surfaces render server truth only:
 * the archive and the media shelf read the same own-moments records
 * the Home feed composes (GET /social-moments/mine); the Made-by-Opal
 * shelf reads the real artifact store (GET /artifacts).
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteMyArtifact,
  deleteSocialMoment,
  deleteTemporaryStory,
  fetchMomentsArchive,
  listMyArtifacts,
  sendVoiceNote,
  updateSocialMoment,
  type MyArtifact,
} from "../../api/productClient";

export type ArchiveItem = {
  id: string;
  kind: "post" | "story";
  caption: string | null;
  mediaUrl: string | null;
  createdAt: string | null;
  /** The record's own visibility (public_contract / story contract). */
  visibility: string | null;
  /** Stories only: when this story ends (its contract's expires_at). */
  expiresAt: string | null;
};

/** Who can see a moment, in plain words - from the record's own
 *  visibility value. Unknown or absent values render nothing. */
export const MOMENT_AUDIENCE_LABELS: Record<string, string> = {
  friends: "Friends",
  private: "Only you",
  group: "A group",
  specific_people: "Specific people",
  close_circle: "Your close circle",
};

export function momentDateLabel(iso: string | null, withTime = false): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return withTime
    ? d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** The one-line answer to "what is this moment": kind, lifetime,
 *  audience, date - every part from the record itself. */
export function momentMetaLine(item: ArchiveItem): string {
  const audience = item.visibility ? MOMENT_AUDIENCE_LABELS[item.visibility] : undefined;
  if (item.kind === "story") {
    const ends = momentDateLabel(item.expiresAt, true);
    return ["Story", ends ? `live until ${ends}` : "live now", audience]
      .filter(Boolean)
      .join(" - ");
  }
  const when = momentDateLabel(item.createdAt);
  return ["Post", audience, when].filter(Boolean).join(" - ");
}

/** One mapping for archive + library media - the feed's own fields. */
export function archiveItemsFrom(res: {
  posts: Array<Record<string, unknown>>;
  stories: Array<Record<string, unknown>>;
}): ArchiveItem[] {
  const posts: ArchiveItem[] = (res.posts ?? []).map((m) => {
    const urls = Array.isArray(m.media_urls) ? (m.media_urls as string[]) : [];
    const ids = Array.isArray(m.media_ids) ? (m.media_ids as string[]) : [];
    return {
      id: String(m.id),
      kind: "post" as const,
      caption: typeof m.caption === "string" ? m.caption : null,
      mediaUrl: urls[0] ?? (ids[0] ? `/api/v1/product/social-moments/media/${ids[0]}` : null),
      createdAt: typeof m.created_at === "string" ? m.created_at : null,
      visibility: typeof m.visibility === "string" ? m.visibility : null,
      expiresAt: null,
    };
  });
  const stories: ArchiveItem[] = (res.stories ?? []).map((s) => ({
    id: String(s.id),
    kind: "story" as const,
    caption: typeof s.caption === "string" ? s.caption : null,
    mediaUrl: typeof s.media_ref === "string" ? s.media_ref : null,
    createdAt:
      typeof s.created_at === "string"
        ? s.created_at
        : typeof s.inserted_at === "string"
          ? s.inserted_at
          : null,
    visibility: typeof s.visibility === "string" ? s.visibility : null,
    expiresAt: typeof s.expires_at === "string" ? s.expires_at : null,
  }));
  // Newest first across both kinds; undated records keep server order
  // after dated ones (the server already returns each kind desc).
  return [...posts, ...stories].sort((a, b) => {
    if (a.createdAt && b.createdAt) return b.createdAt.localeCompare(a.createdAt);
    if (a.createdAt) return -1;
    if (b.createdAt) return 1;
    return 0;
  });
}

function MomentCard({
  item,
  onOpen,
  testId,
}: {
  item: ArchiveItem;
  onOpen?: (item: ArchiveItem) => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      className="c2s-card"
      data-testid={testId}
      style={{ width: "100%", textAlign: "left", cursor: "pointer", marginTop: "var(--space-3)" }}
      onClick={() => onOpen?.(item)}
    >
      {item.mediaUrl ? (
        <img
          src={item.mediaUrl}
          alt=""
          style={{ width: "100%", borderRadius: 12, display: "block" }}
        />
      ) : null}
      <p className="c2s-card-title">{item.caption || (item.kind === "story" ? "Story" : "Post")}</p>
      <p className="c2s-card-line">{momentMetaLine(item)}</p>
    </button>
  );
}

/** ST-C: from You, the archive of the user's OWN shared moments. */
export function MomentsArchive({
  bearer,
  onBack,
}: {
  bearer?: string;
  onBack: () => void;
}) {
  const [items, setItems] = useState<ArchiveItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<ArchiveItem | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchMomentsArchive(bearer);
      setItems(archiveItemsFrom(res));
      setError(null);
    } catch {
      setItems(null);
      setError("Your moments did not load. Check your connection and try again.");
    }
  }, [bearer]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="c2s-flow" style={{ background: "var(--canvas)" }} data-testid="c2-moments-archive">
      <header className="c2s-header">
        <button type="button" className="c2s-icon-btn" aria-label="Back" onClick={onBack}>
          ‹
        </button>
        <h1 className="c2s-header-title" style={{ flex: 1, fontSize: 20 }}>
          Your moments
        </h1>
      </header>
      <div style={{ padding: "var(--space-4) var(--gutter)" }}>
        {/* N2 clarity: what a moment IS, whose it is, and what the
         * two kinds do over time - before any list renders. */}
        <p className="c2s-lede" data-testid="c2-archive-lede">
          Moments are the posts and stories you have shared in Opal, and
          they are yours. A post stays until you delete it. A story is
          temporary - it ends on its own within a day. Open one to see
          who can see it, change it, or delete it.
        </p>
        {error ? (
          <>
            <p className="c2s-lede">{error}</p>
            <button type="button" className="c2s-btn-text" onClick={() => void load()}>
              Try again
            </button>
          </>
        ) : items === null ? (
          <p className="c2s-lede">Loading.</p>
        ) : open ? (
          <MomentDetail
            item={open}
            bearer={bearer}
            onBack={() => setOpen(null)}
            onChanged={() => {
              setOpen(null);
              void load();
            }}
          />
        ) : items.length === 0 ? (
          <p className="c2s-lede" data-testid="c2-archive-empty">
            Nothing shared yet. Posts and stories you share will be kept here.
          </p>
        ) : (
          <>
            <p className="c2s-lede" data-testid="c2-archive-count">
              {items.length} {items.length === 1 ? "moment" : "moments"}
            </p>
            {items.map((item) => (
              <MomentCard key={`${item.kind}-${item.id}`} item={item} testId="c2-archive-item" onOpen={setOpen} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * N2 - one moment, opened: what it is (kind, audience, dates), and
 * the manage actions the moment machinery truly supports.
 * Posts: edit caption (PATCH), change who can see it between the
 * two self-contained audiences (Friends / Only you - group and
 * specific-people audiences were set when the post was shared and
 * are shown, not silently re-scoped), delete (DELETE, armed first).
 * Stories: no edit exists for a story - the surface says so in
 * words; delete (DELETE /stories/:id, armed first) is real.
 * Every success re-reads the archive; nothing is painted locally.
 */
function MomentDetail({
  item,
  bearer,
  onBack,
  onChanged,
}: {
  item: ArchiveItem;
  bearer?: string;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [caption, setCaption] = useState(item.caption ?? "");
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audience = item.visibility ? MOMENT_AUDIENCE_LABELS[item.visibility] : undefined;
  const posted = momentDateLabel(item.createdAt);
  const ends = item.kind === "story" ? momentDateLabel(item.expiresAt, true) : null;
  const canRescope = item.kind === "post" && (item.visibility === "friends" || item.visibility === "private");

  const run = async (fn: () => Promise<unknown>, failLine: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch {
      setBusy(false);
      setError(failLine);
    }
  };

  return (
    <div data-testid="c2-archive-detail">
      {item.mediaUrl ? (
        <img
          src={item.mediaUrl}
          alt=""
          style={{ width: "100%", borderRadius: 12, display: "block" }}
        />
      ) : null}
      <p className="c2s-card-title" style={{ marginTop: "var(--space-3)" }}>
        {item.caption || (item.kind === "story" ? "Story" : "Post")}
      </p>
      <p className="c2s-card-line" data-testid="c2-archive-detail-meta">
        {momentMetaLine(item)}
      </p>
      {posted ? <p className="c2s-card-line">Shared {posted}.</p> : null}
      {item.kind === "story" && ends ? (
        <p className="c2s-card-line">It ends on its own at {ends}.</p>
      ) : null}
      {audience ? (
        <p className="c2s-card-line" data-testid="c2-archive-detail-audience">
          Who can see it: {audience}.
          {item.kind === "post" && !canRescope
            ? " That audience was set when you shared it."
            : ""}
        </p>
      ) : null}

      {item.kind === "post" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
          <input
            className="c2s-field"
            data-testid="c2-archive-caption-input"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            aria-label="Caption"
            placeholder="Caption"
          />
          <button
            type="button"
            className="c2s-btn-text"
            data-testid="c2-archive-caption-save"
            disabled={busy || caption === (item.caption ?? "")}
            onClick={() =>
              void run(
                () => updateSocialMoment(item.id, { caption }, bearer),
                "That caption could not be saved. Check your connection and try again.",
              )
            }
          >
            Save caption
          </button>
          {canRescope ? (
            <div className="c2s-segmented" role="radiogroup" aria-label="Who can see it">
              {(
                [
                  { value: "friends", label: "Friends" },
                  { value: "private", label: "Only you" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={item.visibility === opt.value}
                  data-active={item.visibility === opt.value ? "1" : undefined}
                  data-testid={`c2-archive-audience-${opt.value}`}
                  disabled={busy || item.visibility === opt.value}
                  onClick={() =>
                    void run(
                      () => updateSocialMoment(item.id, { visibility: opt.value }, bearer),
                      "Who can see it could not be changed. Check your connection and try again.",
                    )
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="c2s-card-line" style={{ marginTop: "var(--space-3)" }} data-testid="c2-archive-story-note">
          Stories can't be edited. If you need a change, delete this one
          and share a new one.
        </p>
      )}

      {error ? (
        <p className="c2s-error-line" role="alert">
          {error}
        </p>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
        {armed ? (
          <>
            <p className="c2s-card-line" role="alert">
              Delete this {item.kind} for good? It will be gone from
              your moments and from everywhere it appears.
            </p>
            <button
              type="button"
              className="c2s-btn-primary"
              data-testid="c2-archive-delete-confirm"
              disabled={busy}
              onClick={() =>
                void run(
                  () =>
                    item.kind === "story"
                      ? deleteTemporaryStory(item.id, bearer)
                      : deleteSocialMoment(item.id, bearer),
                  "That could not be deleted. Check your connection and try again.",
                )
              }
            >
              Delete for good
            </button>
            <button
              type="button"
              className="c2s-btn-text"
              data-testid="c2-archive-delete-cancel"
              disabled={busy}
              onClick={() => setArmed(false)}
            >
              Keep it
            </button>
          </>
        ) : (
          <button
            type="button"
            className="c2s-btn-text"
            data-testid="c2-archive-delete"
            onClick={() => setArmed(true)}
          >
            Delete this {item.kind}
          </button>
        )}
        <button type="button" className="c2s-btn-text" onClick={onBack}>
          Back to your moments
        </button>
      </div>
    </div>
  );
}

/** 4.C11: one Library destination, two real shelves. */
export function LibraryDestination({
  bearer,
  onBack,
}: {
  bearer?: string;
  onBack: () => void;
}) {
  const [media, setMedia] = useState<ArchiveItem[] | null>(null);
  const [artifacts, setArtifacts] = useState<MyArtifact[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [arch, arts] = await Promise.all([fetchMomentsArchive(bearer), listMyArtifacts(bearer)]);
      setMedia(archiveItemsFrom(arch).filter((i) => i.mediaUrl));
      setArtifacts(arts.artifacts ?? []);
      setError(null);
    } catch {
      setError("Your library did not load. Check your connection and try again.");
    }
  }, [bearer]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (id: string) => {
    try {
      await deleteMyArtifact(id, bearer);
      await load();
    } catch {
      setError("That could not be deleted. Check your connection and try again.");
    }
  };

  return (
    <div className="c2s-flow" style={{ background: "var(--canvas)" }} data-testid="c2-library">
      <header className="c2s-header">
        <button type="button" className="c2s-icon-btn" aria-label="Back" onClick={onBack}>
          ‹
        </button>
        <h1 className="c2s-header-title" style={{ flex: 1, fontSize: 20 }}>
          Your library
        </h1>
      </header>
      <div style={{ padding: "var(--space-4) var(--gutter)" }}>
        {error ? <p className="c2s-lede">{error}</p> : null}
        <p className="c2s-group-label">Made by Opal</p>
        <div data-testid="c2-library-made-by-opal">
          {artifacts === null ? (
            <p className="c2s-lede">Loading.</p>
          ) : artifacts.length === 0 ? (
            <p className="c2s-lede">Nothing Opal has made for you yet.</p>
          ) : (
            artifacts.map((a) => (
              <div key={a.artifact_id} className="c2s-card" style={{ marginTop: "var(--space-3)" }} data-testid="c2-library-artifact">
                <p className="c2s-card-title">{a.title}</p>
                {a.subtitle ? <p className="c2s-card-line">{a.subtitle}</p> : null}
                <p className="c2s-card-line">Made by Opal</p>
                <button
                  type="button"
                  className="c2s-btn-text"
                  onClick={() => window.open(a.share_url, "_blank", "noopener")}
                >
                  Open
                </button>
                <button type="button" className="c2s-btn-text" onClick={() => void remove(a.artifact_id)}>
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
        <p className="c2s-group-label" style={{ marginTop: "var(--space-5)" }}>
          Media
        </p>
        <div data-testid="c2-library-media">
          {media === null ? (
            <p className="c2s-lede">Loading.</p>
          ) : media.length === 0 ? (
            <p className="c2s-lede">No photos, videos, or stories in Opal yet.</p>
          ) : (
            media.map((item) => (
              <MomentCard key={`${item.kind}-${item.id}`} item={item} testId="c2-library-media-item" />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * ST-H composer control: record (visibly active), review, send.
 * Renders only where the platform can record (MediaRecorder present);
 * where it cannot, the control is absent - never a dead button.
 * R20A settled composer model: this control is the tenant of the
 * thread composer's in-pill action slot (ThreadShell's
 * composerAction) - the mic sits inside the composer bar, the
 * recording state renders inside the bar, and the review state is
 * a pop-up anchored to this control inside the composer.
 */
export function VoiceNoteControl({
  conversationId,
  bearer,
  onSent,
}: {
  conversationId: string;
  bearer?: string;
  onSent: () => void;
}) {
  const [phase, setPhase] = useState<"idle" | "recording" | "review" | "sending">("idle");
  // R20A: the review state is a pop-up anchored to this control
  // (which lives inside the composer pill's action slot); it opens
  // the moment a recording is ready and toggles from the anchor.
  const [reviewOpen, setReviewOpen] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedRef = useRef<number>(0);

  if (typeof MediaRecorder === "undefined" || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return null;
  }

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setBlob(new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" }));
        setReviewOpen(true);
        setPhase("review");
      };
      startedRef.current = Date.now();
      rec.start();
      setPhase("recording");
    } catch {
      setError("Microphone is not available here.");
    }
  };

  const send = async () => {
    if (!blob) return;
    setPhase("sending");
    setError(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const out = String(reader.result ?? "");
          resolve(out.includes(",") ? out.split(",")[1] : out);
        };
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(blob);
      });
      await sendVoiceNote(
        conversationId,
        {
          audio_base64: base64,
          content_type: blob.type || "audio/webm",
          duration_ms: Date.now() - startedRef.current,
          client_message_id: `voicenote-${Date.now()}`,
        },
        bearer,
      );
      setBlob(null);
      setReviewOpen(false);
      setPhase("idle");
      onSent();
    } catch {
      setReviewOpen(true);
      setPhase("review");
      setError("That voice note did not send. Try again.");
    }
  };

  return (
    <div className="c2s-voice-note" data-testid="c2-voice-note-control" data-phase={phase}>
      {phase === "recording" ? (
        <>
          {/* R20A: the recording state renders INSIDE the composer
              bar - this root lives in the composer's action slot,
              so the status line and the stop control are in-bar
              furniture, never a row above or outside the pill. */}
          <p className="c2s-card-line c2s-voice-recording-line" data-testid="c2-voice-recording" role="status">
            Recording - speak now.
          </p>
          <button
            type="button"
            className="c2s-voice-stop"
            data-testid="c2-voice-stop"
            aria-label="Stop recording"
            title="Stop recording"
            onClick={() => recorderRef.current?.stop()}
          >
            <VoiceStopIcon />
          </button>
        </>
      ) : phase === "review" && blob ? (
        <>
          {/* R20A: the in-composer anchor for the review pop-up.
              The pop-up below is positioned against THIS control,
              inside the composer - it is the one thing allowed to
              float outside the pill, because it is anchored to a
              proper in-composer control. */}
          <button
            type="button"
            className="c2s-voice-mic c2s-voice-review-anchor"
            data-testid="c2-voice-review-anchor"
            aria-label="Voice note ready - review"
            title="Voice note ready - review"
            aria-expanded={reviewOpen}
            aria-haspopup="dialog"
            onClick={() => setReviewOpen((v) => !v)}
          >
            <VoiceMicIcon />
          </button>
          {reviewOpen ? (
            <div
              className="c2s-voice-review"
              data-testid="c2-voice-review"
              role="dialog"
              aria-label="Review voice note"
            >
              <audio controls src={URL.createObjectURL(blob)} data-testid="c2-voice-review-player" />
              <button
                type="button"
                className="c2s-voice-action"
                data-testid="c2-voice-send"
                onClick={() => void send()}
              >
                Send voice note
              </button>
              <button
                type="button"
                className="c2s-voice-action c2s-voice-action-quiet"
                aria-label="Discard voice note"
                onClick={() => {
                  setBlob(null);
                  setReviewOpen(false);
                  setPhase("idle");
                }}
              >
                Discard
              </button>
              {error ? (
                <p className="c2s-error-line" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <button
          type="button"
          className="c2s-voice-mic"
          data-testid="c2-voice-record"
          aria-label={phase === "sending" ? "Sending voice note" : "Record a voice note"}
          title={phase === "sending" ? "Sending voice note" : "Record a voice note"}
          disabled={phase === "sending"}
          onClick={() => void start()}
        >
          <VoiceMicIcon />
        </button>
      )}
      {error && phase !== "review" ? (
        <p className="c2s-error-line c2s-voice-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * R20 F-2: the composer's microphone glyph - the same mic geometry
 * the Opal chat composer uses (OpalCenterChat's MicIcon), so the
 * voice affordance reads identically wherever it appears. The
 * control is an icon button; its name lives in aria-label/title,
 * never as a bare text artifact in the composer bar.
 */
function VoiceMicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M6 11a6 6 0 0 0 12 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M12 17v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 20h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function VoiceStopIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" />
    </svg>
  );
}
