/**
 * Tranche #1 — web ↔ native media bridge request routing.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __testOnly_deliverMedia,
  __testOnly_pendingCount,
  __testOnly_resetMediaBridge,
  requestNativeMedia,
  shouldUseNativeMediaBridge,
} from "./nativeHostBridge";

const root = resolve(__dirname, "..");

describe("native media bridge (web)", () => {
  beforeEach(() => {
    __testOnly_resetMediaBridge();
    sessionStorage.setItem("opal_native_host", "1");
    (
      window as unknown as { ReactNativeWebView?: { postMessage: (m: string) => void } }
    ).ReactNativeWebView = { postMessage: vi.fn() };
  });

  afterEach(() => {
    __testOnly_resetMediaBridge();
    sessionStorage.removeItem("opal_native_host");
    delete (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
  });

  it("shouldUseNativeMediaBridge when host + RN WebView present", () => {
    expect(shouldUseNativeMediaBridge()).toBe(true);
  });

  it("posts request_media with request_id and resolves result", async () => {
    const postMessage = (
      window as unknown as { ReactNativeWebView: { postMessage: ReturnType<typeof vi.fn> } }
    ).ReactNativeWebView.postMessage;

    const promise = requestNativeMedia({
      source: "camera",
      initiating_surface: "story",
      media_types: ["image"],
    });
    expect(__testOnly_pendingCount()).toBe(1);
    expect(postMessage).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(String(postMessage.mock.calls[0]![0]));
    expect(sent.type).toBe("opal_native_request_media");
    expect(sent.source).toBe("camera");
    expect(sent.initiating_surface).toBe("story");
    expect(typeof sent.request_id).toBe("string");

    __testOnly_deliverMedia({
      type: "opal_native_media_result",
      request_id: sent.request_id,
      source: "camera",
      initiating_surface: "story",
      asset: {
        mime_type: "image/jpeg",
        preview_url: "data:image/jpeg;base64,abc",
        filename: "cap.jpg",
      },
    });

    const result = await promise;
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.asset.preview_url).toMatch(/^data:image\/jpeg/);
      expect(result.request_id).toBe(sent.request_id);
    }
    expect(__testOnly_pendingCount()).toBe(0);
  });

  it("routes cancel and error; ignores stale request ids", async () => {
    const postMessage = (
      window as unknown as { ReactNativeWebView: { postMessage: ReturnType<typeof vi.fn> } }
    ).ReactNativeWebView.postMessage;

    const p1 = requestNativeMedia({
      source: "photo_library",
      initiating_surface: "graph_create",
    });
    const id1 = JSON.parse(String(postMessage.mock.calls[0]![0])).request_id as string;

    // Stale id must not resolve p1
    __testOnly_deliverMedia({
      type: "opal_native_media_result",
      request_id: "stale-other",
      source: "photo_library",
      initiating_surface: "graph_create",
      asset: { mime_type: "image/png", preview_url: "data:image/png;base64,x" },
    });
    expect(__testOnly_pendingCount()).toBe(1);

    __testOnly_deliverMedia({
      type: "opal_native_media_cancelled",
      request_id: id1,
      source: "photo_library",
      initiating_surface: "graph_create",
    });
    await expect(p1).resolves.toMatchObject({ status: "cancelled", request_id: id1 });

    const p2 = requestNativeMedia({
      source: "document",
      initiating_surface: "center",
    });
    const id2 = JSON.parse(String(postMessage.mock.calls[1]![0])).request_id as string;
    __testOnly_deliverMedia({
      type: "opal_native_media_error",
      request_id: id2,
      code: "permission_denied",
      message: "Camera access is off.",
    });
    await expect(p2).resolves.toMatchObject({
      status: "error",
      code: "permission_denied",
    });
  });

  it("unknown inbound types are never requested from web helpers", () => {
    const bridge = readFileSync(resolve(root, "src/nativeHostBridge.ts"), "utf8");
    expect(bridge).toMatch(/opal_native_request_media/);
    expect(bridge).not.toMatch(/opal_native_eval/);
    expect(bridge).toMatch(/opal_native_sign_out/);
    expect(bridge).toMatch(/opal_native_session/);
  });
});

describe("tranche #1 web callers", () => {
  it("Story / Graph / Center use acquireMedia — not HTML capture inputs as primary path", () => {
    const story = readFileSync(resolve(root, "src/opalUi/StoryCreateFlow.tsx"), "utf8");
    const graph = readFileSync(resolve(root, "src/opalUi/GraphCreateFlow.tsx"), "utf8");
    const center = readFileSync(resolve(root, "src/opalUi/OpalCenterLifeGraph.tsx"), "utf8");
    expect(story).toMatch(/acquireMedia/);
    expect(story).toMatch(/initiating_surface:\s*"story"/);
    expect(story).not.toMatch(/capture="environment"/);
    expect(graph).toMatch(/acquireMedia/);
    expect(graph).toMatch(/initiating_surface:\s*"graph_create"/);
    expect(graph).not.toMatch(/capture="environment"/);
    expect(center).toMatch(/acquireMedia/);
    expect(center).toMatch(/initiating_surface:\s*"center"/);
    expect(center).toMatch(/opal-center-attach-preview/);
    expect(center).not.toMatch(/when ingestion is available/);
  });

  it("mediaAcquisition prefers native bridge when host detected", () => {
    const acq = readFileSync(resolve(root, "src/mediaAcquisition.ts"), "utf8");
    expect(acq).toMatch(/shouldUseNativeMediaBridge/);
    expect(acq).toMatch(/requestNativeMedia/);
    expect(acq).toMatch(/browserFilePick|browser/);
  });
});
