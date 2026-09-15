/**
 * Tranche #1 — unified media acquisition.
 * Native host → Expo picker bridge. Plain browser → HTML file-input fallback.
 * Never pretends HTML capture is the iPhone-native path when native host is active.
 */
import {
  requestNativeMedia,
  shouldUseNativeMediaBridge,
  type InitiatingSurface,
  type MediaAcquisitionResult,
  type MediaSource,
} from "./nativeHostBridge";

export type AcquireMediaOptions = {
  source: MediaSource;
  initiating_surface: InitiatingSurface;
  /** accept attribute for browser fallback, e.g. "image/*,video/*" */
  accept?: string;
  media_types?: Array<"image" | "video">;
  accepted_mime_types?: string[];
  capture?: "environment" | "user";
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

function browserFilePick(opts: {
  accept: string;
  capture?: "environment" | "user";
}): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = opts.accept;
    if (opts.capture) input.setAttribute("capture", opts.capture);
    input.style.display = "none";
    let settled = false;
    const finish = (file: File | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(file);
    };
    input.addEventListener("change", () => {
      finish(input.files?.[0] ?? null);
    });
    // Some browsers fire focus back on cancel without change.
    window.addEventListener(
      "focus",
      () => {
        setTimeout(() => {
          if (!settled && !input.files?.length) finish(null);
        }, 600);
      },
      { once: true },
    );
    document.body.appendChild(input);
    input.click();
  });
}

function acceptForSource(source: MediaSource, explicit?: string): string {
  if (explicit) return explicit;
  if (source === "document") {
    return ".pdf,.txt,.md,.doc,.docx,application/pdf,text/plain";
  }
  return "image/*,video/*";
}

/**
 * Acquire one media asset for the initiating product surface.
 */
export async function acquireMedia(
  opts: AcquireMediaOptions,
): Promise<MediaAcquisitionResult> {
  if (shouldUseNativeMediaBridge()) {
    return requestNativeMedia({
      source: opts.source,
      initiating_surface: opts.initiating_surface,
      media_types: opts.media_types,
      accepted_mime_types: opts.accepted_mime_types,
    });
  }

  // Browser / non-native fallback — standards file input only.
  const accept = acceptForSource(opts.source, opts.accept);
  const capture =
    opts.source === "camera"
      ? opts.capture || "environment"
      : undefined;
  try {
    const file = await browserFilePick({ accept, capture });
    if (!file) {
      return {
        status: "cancelled",
        request_id: "browser-fallback",
        source: opts.source,
        initiating_surface: opts.initiating_surface,
      };
    }
    const preview_url = await readFileAsDataUrl(file);
    if (!preview_url) {
      return {
        status: "error",
        request_id: "browser-fallback",
        source: opts.source,
        initiating_surface: opts.initiating_surface,
        code: "read_failed",
        message: "Couldn’t read that file. Try another.",
      };
    }
    return {
      status: "ok",
      request_id: "browser-fallback",
      source: opts.source,
      initiating_surface: opts.initiating_surface,
      asset: {
        mime_type: file.type || "application/octet-stream",
        filename: file.name,
        byte_size: file.size,
        preview_url,
      },
    };
  } catch {
    return {
      status: "error",
      request_id: "browser-fallback",
      source: opts.source,
      initiating_surface: opts.initiating_surface,
      code: "unavailable",
      message:
        opts.source === "camera"
          ? "Camera isn’t available here — try Photo library, or open Opal on iPhone."
          : "Couldn’t open the file picker. Try again.",
    };
  }
}

export function mediaKindFromMime(mime: string): "photo" | "video" | "document" {
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "photo";
  return "document";
}
