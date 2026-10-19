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
  fetchMomentsArchive,
  listMyArtifacts,
  sendVoiceNote,
  type MyArtifact,
} from "../../api/productClient";

export type ArchiveItem = {
  id: string;
  kind: "post" | "story";
  caption: string | null;
  mediaUrl: string | null;
  createdAt: string | null;
};

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
      <p className="c2s-card-line">{item.kind === "story" ? "Story - live now" : "Post"}</p>
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
          <div data-testid="c2-archive-detail">
            {open.mediaUrl ? (
              <img
                src={open.mediaUrl}
                alt=""
                style={{ width: "100%", borderRadius: 12, display: "block" }}
              />
            ) : null}
            <p className="c2s-card-title" style={{ marginTop: "var(--space-3)" }}>
              {open.caption || (open.kind === "story" ? "Story" : "Post")}
            </p>
            <p className="c2s-card-line">{open.kind === "story" ? "Story - live now" : "Post"}</p>
            <button type="button" className="c2s-btn-text" onClick={() => setOpen(null)}>
              Back to your moments
            </button>
          </div>
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
      setPhase("idle");
      onSent();
    } catch {
      setPhase("review");
      setError("That voice note did not send. Try again.");
    }
  };

  return (
    <div className="c2s-voice-note" data-testid="c2-voice-note-control">
      {phase === "recording" ? (
        <>
          <p className="c2s-card-line" data-testid="c2-voice-recording" role="status">
            Recording - speak now.
          </p>
          <button
            type="button"
            className="c2s-btn-text"
            data-testid="c2-voice-stop"
            onClick={() => recorderRef.current?.stop()}
          >
            Stop
          </button>
        </>
      ) : phase === "review" && blob ? (
        <>
          <audio controls src={URL.createObjectURL(blob)} data-testid="c2-voice-review-player" />
          <button type="button" className="c2s-btn-text" data-testid="c2-voice-send" onClick={() => void send()}>
            Send voice note
          </button>
          <button
            type="button"
            className="c2s-btn-text"
            onClick={() => {
              setBlob(null);
              setPhase("idle");
            }}
          >
            Discard
          </button>
        </>
      ) : (
        <button
          type="button"
          className="c2s-btn-text"
          data-testid="c2-voice-record"
          disabled={phase === "sending"}
          onClick={() => void start()}
        >
          {phase === "sending" ? "Sending" : "Record a voice note"}
        </button>
      )}
      {error ? (
        <p className="c2s-error-line" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
