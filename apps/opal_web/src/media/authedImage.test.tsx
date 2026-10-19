/**
 * @vitest-environment jsdom
 *
 * Repair #19 W21 (F1) — the authenticated image path.
 *  - 200 blob: renders an <img> whose src is the blob object URL
 *    (never the record URL, never a token in a URL), fetched WITH
 *    the session bearer to the API origin;
 *  - 401 / network failure: renders nothing and calls onError, so
 *    the caller's JA-12 designed fallback takes the well;
 *  - the object URL is revoked on unmount and on src replacement;
 *  - a cross-origin absolute URL is fetched WITHOUT the bearer.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthedImage } from "./AuthedImage";
import { saveBrowserAccessToken } from "../api/productClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;
let created: string[] = [];
let revoked: string[] = [];

async function render(node: React.ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(node);
  });
  // let the fetch/blob microtasks settle
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  return host;
}

beforeEach(() => {
  created = [];
  revoked = [];
  (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn((b: Blob) => {
    lastBlob = b;
    const u = `blob:mock-${created.length}`;
    created.push(u);
    return u;
  });
  (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn((u: string) => {
    revoked.push(u);
  });
  saveBrowserAccessToken("tok-test-123");
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  host?.remove();
  host = null;
  document.body.innerHTML = "";
  saveBrowserAccessToken(null);
  vi.unstubAllGlobals();
});

const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);

let lastBlob: Blob | null = null;

function okFetch(contentType = "application/octet-stream") {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    headers: { get: (n: string) => (n.toLowerCase() === "content-type" ? contentType : null) },
    arrayBuffer: async () => JPEG_BYTES.buffer as ArrayBuffer,
  }));
}

describe("F1 AuthedImage", () => {
  it("renders the blob object URL on a 200, fetched with the bearer, token never in a URL", async () => {
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);
    const el = await render(<AuthedImage src="/api/v1/product/social-moments/media/m1" testId="ai" />);
    const img = el.querySelector("img")!;
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toBe("blob:mock-0");
    expect(img.getAttribute("src")).not.toContain("tok-test-123");
    const [calledUrl, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(calledUrl).not.toContain("tok-test-123");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer tok-test-123");
  });

  it("401: renders nothing and calls onError (the JA-12 fallback path)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 401,
        headers: { get: () => null },
        arrayBuffer: async () => new ArrayBuffer(0),
      })),
    );
    const onError = vi.fn();
    const el = await render(<AuthedImage src="/api/v1/product/social-moments/media/m1" onError={onError} />);
    expect(el.querySelector("img")).toBeNull();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("network error: renders nothing and calls onError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("down");
      }),
    );
    const onError = vi.fn();
    const el = await render(<AuthedImage src="/api/v1/product/social-moments/media/m1" onError={onError} />);
    expect(el.querySelector("img")).toBeNull();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("revokes the object URL on unmount and on src replacement", async () => {
    vi.stubGlobal("fetch", okFetch());
    const el = await render(<AuthedImage src="/api/v1/product/social-moments/media/m1" />);
    expect(el.querySelector("img")!.getAttribute("src")).toBe("blob:mock-0");
    await act(async () => {
      root!.render(<AuthedImage src="/api/v1/product/social-moments/media/m2" />);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(revoked).toContain("blob:mock-0");
    expect(el.querySelector("img")!.getAttribute("src")).toBe("blob:mock-1");
    await act(async () => root!.unmount());
    root = null;
    expect(revoked).toContain("blob:mock-1");
  });

  it("cross-origin absolute URL is fetched WITHOUT the bearer", async () => {
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);
    await render(<AuthedImage src="https://images.example.test/pic.jpg" />);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).authorization).toBeUndefined();
  });

  it("octet-stream responses are re-typed from JPEG magic bytes (live endpoint shape)", async () => {
    vi.stubGlobal("fetch", okFetch("application/octet-stream"));
    const el = await render(<AuthedImage src="/api/v1/product/social-moments/media/m1" />);
    expect(el.querySelector("img")).toBeTruthy();
    expect(lastBlob).toBeTruthy();
    expect(lastBlob!.type).toBe("image/jpeg");
    expect(lastBlob!.size).toBe(JPEG_BYTES.length);
  });

  it("data: sources pass through with no fetch", async () => {
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);
    const el = await render(<AuthedImage src="data:image/png;base64,AAAA" />);
    expect(el.querySelector("img")!.getAttribute("src")).toBe("data:image/png;base64,AAAA");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
