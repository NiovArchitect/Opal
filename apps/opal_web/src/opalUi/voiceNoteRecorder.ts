/**
 * Voice note recorder — tap-to-start / tap-to-stop.
 *
 * Choice: tap-to-toggle (not hold-to-record) so mobile browsers that cancel
 * pointerup outside the button still finish cleanly. MediaRecorder → webm/opus
 * when supported; upload happens on stop via the caller.
 */

export type VoiceNoteBlob = {
  blob: Blob;
  contentType: string;
  durationMs: number;
  base64: string;
};

export type VoiceRecorderHandle = {
  start: () => Promise<void>;
  stop: () => Promise<VoiceNoteBlob>;
  cancel: () => void;
  isRecording: () => boolean;
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const idx = dataUrl.indexOf(",");
      resolve(idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl);
    };
    reader.onerror = () => reject(reader.error || new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

export function createVoiceNoteRecorder(): VoiceRecorderHandle {
  let media: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let chunks: BlobPart[] = [];
  let startedAt = 0;
  let stopResolver: ((blob: VoiceNoteBlob) => void) | null = null;

  return {
    isRecording: () => Boolean(recorder && recorder.state === "recording"),

    async start() {
      if (recorder && recorder.state === "recording") return;
      media = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : undefined;
      chunks = [];
      recorder = mime ? new MediaRecorder(media, { mimeType: mime }) : new MediaRecorder(media);
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };
      recorder.onstop = async () => {
        const contentType = recorder?.mimeType || "audio/webm";
        const blob = new Blob(chunks, { type: contentType });
        const durationMs = Math.max(200, Date.now() - startedAt);
        const base64 = await blobToBase64(blob);
        media?.getTracks().forEach((t) => t.stop());
        media = null;
        const payload = { blob, contentType, durationMs, base64 };
        stopResolver?.(payload);
        stopResolver = null;
      };
      startedAt = Date.now();
      recorder.start(100);
    },

    stop() {
      return new Promise<VoiceNoteBlob>((resolve, reject) => {
        if (!recorder || recorder.state !== "recording") {
          reject(new Error("not recording"));
          return;
        }
        stopResolver = resolve;
        recorder.stop();
      });
    },

    cancel() {
      try {
        if (recorder && recorder.state === "recording") recorder.stop();
      } catch {
        /* ignore */
      }
      media?.getTracks().forEach((t) => t.stop());
      media = null;
      recorder = null;
      chunks = [];
      stopResolver = null;
    },
  };
}
