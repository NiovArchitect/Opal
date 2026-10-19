/**
 * Repair #19 W21 (F1) — AUTHENTICATED RECORD IMAGE.
 *
 * The product media endpoint is bearer-gated (401 to a plain
 * <img src>, by design: plan/story imagery is private record
 * media, never a public URL). A plain <img> cannot carry the
 * session bearer, so every media well fell back to its no-image
 * treatment even though the imagery existed — the pack's F1.
 *
 * This component is the web's one authenticated image path:
 * fetch the record URL WITH the session bearer (only ever to the
 * API origin / same origin — a cross-origin absolute URL is
 * fetched WITHOUT the bearer, so the token can never leak to a
 * third party, and the token never appears in any URL), turn the
 * 200 blob into an object URL, render that, and revoke the object
 * URL on unmount or when the source is replaced. On ANY failure
 * (401, network, decode) it calls onError and renders nothing, so
 * the caller's designed fallback (JA-12) takes the well — the
 * fallback is a designed treatment, never a broken-image hole.
 *
 * data:/blob: sources (local previews, fixtures) pass through
 * untouched: they need no auth and must not be fetched.
 */
import React, { useEffect, useRef, useState } from "react";
import { getOpalApiBaseUrl, loadBrowserAccessToken } from "../api/productClient";

export function isPassthroughImageSrc(src: string): boolean {
  return src.startsWith("data:") || src.startsWith("blob:");
}

/**
 * The media endpoint serves its bytes as application/octet-stream
 * (verified live: 200, octet-stream, JPEG magic ff d8 ff e0 JFIF).
 * A blob URL typed octet-stream will NOT decode as an <img> — a
 * blob's type is authoritative; the browser does not sniff it the
 * way it sniffs a network response. So the fetched bytes are
 * re-typed before they become a blob: the response's own type
 * when it is already an image type, else the magic bytes.
 */
export function sniffImageType(bytes: Uint8Array, responseType: string | null | undefined): string {
  if (responseType && responseType.startsWith("image/")) return responseType.split(";")[0].trim();
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return "image/png";
  if (bytes.length >= 4 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "image/gif";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "image/webp";
  return responseType || "";
}

/** Resolve a record media path against the API base (same rule the
 *  API client uses for its own requests). Absolute URLs pass through. */
export function resolveAuthedMediaUrl(src: string): string {
  if (/^https?:\/\//i.test(src) || isPassthroughImageSrc(src)) return src;
  const base = getOpalApiBaseUrl();
  if (!base) return src;
  return `${base}${src.startsWith("/") ? src : `/${src}`}`;
}

/** The bearer may only ever be sent to the API origin or the page's
 *  own origin. Anything else is fetched anonymously. */
export function bearerAllowedFor(url: string): boolean {
  try {
    const target = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    if (typeof window !== "undefined" && target.origin === window.location.origin) return true;
    const base = getOpalApiBaseUrl();
    if (base) {
      const baseOrigin = new URL(base, typeof window !== "undefined" ? window.location.origin : "http://localhost").origin;
      if (target.origin === baseOrigin) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export type AuthedImageProps = {
  src: string;
  alt?: string;
  draggable?: boolean;
  className?: string;
  style?: React.CSSProperties;
  testId?: string;
  /** Called once when the authenticated load fails (any cause). */
  onError?: () => void;
};

export function AuthedImage({ src, alt = "", draggable, className, style, testId, onError }: AuthedImageProps) {
  const passthrough = isPassthroughImageSrc(src);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    setObjectUrl(null);
    setFailed(false);
    if (passthrough) return;
    let live = true;
    let created: string | null = null;
    const url = resolveAuthedMediaUrl(src);
    const headers: Record<string, string> = {};
    if (bearerAllowedFor(url)) {
      const bearer = loadBrowserAccessToken();
      if (bearer) headers.authorization = `Bearer ${bearer}`;
    }
    (async () => {
      try {
        const res = await fetch(url, { headers, credentials: "include" });
        if (!res.ok) throw new Error(`media ${res.status}`);
        const bytes = new Uint8Array(await res.arrayBuffer());
        const type = sniffImageType(bytes, res.headers.get("content-type"));
        const blob = new Blob([bytes.buffer as ArrayBuffer], type ? { type } : undefined);
        if (!live) return;
        created = URL.createObjectURL(blob);
        setObjectUrl(created);
      } catch {
        if (!live) return;
        setFailed(true);
        onErrorRef.current?.();
      }
    })();
    return () => {
      live = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [src, passthrough]);

  if (passthrough) {
    return <img src={src} alt={alt} draggable={draggable} className={className} style={style} data-testid={testId} onError={onError} />;
  }
  if (failed || !objectUrl) return null;
  return (
    <img
      src={objectUrl}
      alt={alt}
      draggable={draggable}
      className={className}
      style={style}
      data-testid={testId}
      data-authed-image="blob"
      onError={() => {
        setFailed(true);
        onErrorRef.current?.();
      }}
    />
  );
}
