/**
 * Tranche #1 — native camera / library / document acquisition via Expo pickers.
 * No custom camera UI. Returns data URLs for WebView handoff (bounded size).
 */
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import {
  MAX_MEDIA_BYTES,
  type MediaAssetPayload,
  type MediaErrorCode,
  type MediaOutboundMessage,
  type MediaRequestMessage,
  userSafePermissionDenied,
} from "./mediaBridgeContract";

export { buildMediaInjectScript } from "./mediaBridgeContract";

type AcquireOutcome =
  | { kind: "result"; asset: MediaAssetPayload }
  | { kind: "cancelled" }
  | { kind: "error"; code: MediaErrorCode; message: string };

function guessMime(filename?: string | null, fallback = "application/octet-stream"): string {
  if (!filename) return fallback;
  const lower = filename.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".txt")) return "text/plain";
  if (lower.endsWith(".md")) return "text/markdown";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return fallback;
}

function mimeAllowed(mime: string, accepted?: string[]): boolean {
  if (!accepted || accepted.length === 0) return true;
  return accepted.some((pattern) => {
    if (pattern === mime) return true;
    if (pattern.endsWith("/*")) {
      const prefix = pattern.slice(0, -1);
      return mime.startsWith(prefix);
    }
    // extension-style accept from web (e.g. .pdf)
    if (pattern.startsWith(".")) {
      return mime.includes(pattern.slice(1)) || false;
    }
    return false;
  });
}

async function uriToDataUrl(
  uri: string,
  mime: string,
  existingBase64?: string | null,
): Promise<{ preview_url: string; byte_size: number } | { error: AcquireOutcome }> {
  let base64 = existingBase64 || "";
  if (!base64) {
    try {
      base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64",
      });
    } catch {
      return {
        error: {
          kind: "error",
          code: "read_failed",
          message: "Couldn’t read that file. Try another photo or document.",
        },
      };
    }
  }
  // base64 length ≈ 4/3 of bytes
  const byte_size = Math.floor((base64.length * 3) / 4);
  if (byte_size > MAX_MEDIA_BYTES) {
    return {
      error: {
        kind: "error",
        code: "too_large",
        message:
          "That file is too large to attach here. Try a smaller photo or a shorter video.",
      },
    };
  }
  return { preview_url: `data:${mime};base64,${base64}`, byte_size };
}

function resolveMediaTypes(
  req: MediaRequestMessage,
): ImagePicker.MediaType | ImagePicker.MediaType[] {
  const types = req.media_types?.length ? req.media_types : ["image", "video"];
  const out: ImagePicker.MediaType[] = [];
  if (types.includes("image")) out.push("images");
  if (types.includes("video")) out.push("videos");
  return out.length === 1 ? out[0]! : out;
}

async function acquireCamera(req: MediaRequestMessage): Promise<AcquireOutcome> {
  const current = await ImagePicker.getCameraPermissionsAsync();
  let status = current.status;
  if (status !== "granted") {
    const asked = await ImagePicker.requestCameraPermissionsAsync();
    status = asked.status;
  }
  if (status !== "granted") {
    return {
      kind: "error",
      code: "permission_denied",
      message: userSafePermissionDenied("camera"),
    };
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: resolveMediaTypes(req),
    allowsEditing: req.allows_editing === true,
    quality: 0.8,
    base64: true,
    videoMaxDuration: 60,
  });

  if (result.canceled || !result.assets?.length) {
    return { kind: "cancelled" };
  }
  return assetFromPicker(result.assets[0]!, req);
}

async function acquireLibrary(req: MediaRequestMessage): Promise<AcquireOutcome> {
  // System picker: request permission when needed; limited library (accessPrivileges) still works.
  let perm = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (perm.status !== "granted") {
    perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  }
  if (perm.status !== "granted") {
    return {
      kind: "error",
      code: "permission_denied",
      message: userSafePermissionDenied("photo_library"),
    };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: resolveMediaTypes(req),
    allowsEditing: req.allows_editing === true,
    quality: 0.8,
    base64: true,
    selectionLimit: 1,
  });

  if (result.canceled || !result.assets?.length) {
    return { kind: "cancelled" };
  }
  return assetFromPicker(result.assets[0]!, req);
}

async function assetFromPicker(
  asset: ImagePicker.ImagePickerAsset,
  req: MediaRequestMessage,
): Promise<AcquireOutcome> {
  const mime =
    asset.mimeType ||
    guessMime(asset.fileName, asset.type === "video" ? "video/mp4" : "image/jpeg");
  if (!mimeAllowed(mime, req.accepted_mime_types)) {
    return {
      kind: "error",
      code: "unsupported_type",
      message: "That file type isn’t supported here.",
    };
  }
  const encoded = await uriToDataUrl(asset.uri, mime, asset.base64);
  if ("error" in encoded) return encoded.error;

  return {
    kind: "result",
    asset: {
      mime_type: mime,
      filename: asset.fileName || undefined,
      width: asset.width || undefined,
      height: asset.height || undefined,
      duration_ms:
        typeof asset.duration === "number" ? Math.round(asset.duration * 1000) : undefined,
      byte_size: encoded.byte_size,
      preview_url: encoded.preview_url,
    },
  };
}

async function acquireDocument(req: MediaRequestMessage): Promise<AcquireOutcome> {
  const defaultTypes = [
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/*",
  ];
  const type =
    req.accepted_mime_types && req.accepted_mime_types.length > 0
      ? req.accepted_mime_types.map((t) => (t.startsWith(".") ? "*/*" : t))
      : defaultTypes;

  let result: DocumentPicker.DocumentPickerResult;
  try {
    result = await DocumentPicker.getDocumentAsync({
      type,
      copyToCacheDirectory: true,
      multiple: false,
    });
  } catch {
    return {
      kind: "error",
      code: "unavailable",
      message: "Document picker isn’t available on this device.",
    };
  }

  if (result.canceled || !result.assets?.length) {
    return { kind: "cancelled" };
  }
  const doc = result.assets[0]!;
  const mime = doc.mimeType || guessMime(doc.name);
  if (!mimeAllowed(mime, req.accepted_mime_types)) {
    // Soft allow when web passed extension-only filters that map poorly.
    const extensionsOk = (req.accepted_mime_types || []).some(
      (p) => p.startsWith(".") && (doc.name || "").toLowerCase().endsWith(p.toLowerCase()),
    );
    if (!extensionsOk && req.accepted_mime_types?.length) {
      return {
        kind: "error",
        code: "unsupported_type",
        message: "That document type isn’t supported here.",
      };
    }
  }
  if (typeof doc.size === "number" && doc.size > MAX_MEDIA_BYTES) {
    return {
      kind: "error",
      code: "too_large",
      message: "That document is too large to attach here. Try a smaller file.",
    };
  }

  const encoded = await uriToDataUrl(doc.uri, mime);
  if ("error" in encoded) return encoded.error;

  return {
    kind: "result",
    asset: {
      mime_type: mime,
      filename: doc.name || undefined,
      byte_size: encoded.byte_size,
      preview_url: encoded.preview_url,
    },
  };
}

export async function acquireNativeMedia(
  request: MediaRequestMessage,
): Promise<MediaOutboundMessage> {
  const { request_id, source, initiating_surface } = request;
  let outcome: AcquireOutcome;
  try {
    if (source === "camera") outcome = await acquireCamera(request);
    else if (source === "photo_library") outcome = await acquireLibrary(request);
    else outcome = await acquireDocument(request);
  } catch {
    return {
      type: "opal_native_media_error",
      request_id,
      source,
      initiating_surface,
      code: "unavailable",
      message: "Media capture isn’t available right now. Try again.",
    };
  }

  if (outcome.kind === "cancelled") {
    return {
      type: "opal_native_media_cancelled",
      request_id,
      source,
      initiating_surface,
    };
  }
  if (outcome.kind === "error") {
    return {
      type: "opal_native_media_error",
      request_id,
      source,
      initiating_surface,
      code: outcome.code,
      message: outcome.message,
    };
  }
  return {
    type: "opal_native_media_result",
    request_id,
    source,
    initiating_surface,
    asset: outcome.asset,
  };
}


