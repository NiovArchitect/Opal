import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const publishMock = vi.fn();
const uploadMock = vi.fn();

vi.mock("../api/productClient", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    publishSocialMoment: (...args: unknown[]) => publishMock(...args),
    uploadSocialMomentMedia: (...args: unknown[]) => uploadMock(...args),
  };
});

import {
  authoritativeCreatePost,
  parseDataUrl,
  productionStoryToItem,
  renderableMediaRef,
} from "./socialAuthority";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

const PNG_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ";

describe("Repair #15 — story media actually renders (E3)", () => {
  it("productionStoryToItem keeps data: media from real captures", () => {
    const item = productionStoryToItem({
      id: "story-1",
      author_name: "Jordan",
      media_ref: PNG_DATA_URL,
      caption: "hi",
      created_at: new Date().toISOString(),
    });
    expect(item.mediaSrc).toBe(PNG_DATA_URL);
    expect(item.caption).toBe("hi");
  });

  it("renderableMediaRef accepts durable refs and rejects junk schemes", () => {
    expect(renderableMediaRef("/demo/moments/food.jpg")).toBe("/demo/moments/food.jpg");
    expect(renderableMediaRef(PNG_DATA_URL)).toBe(PNG_DATA_URL);
    expect(renderableMediaRef("https://cdn.example/x.jpg")).toBe("https://cdn.example/x.jpg");
    expect(renderableMediaRef("javascript:alert(1)")).toBeUndefined();
    expect(renderableMediaRef("blob:http://localhost/abc")).toBeUndefined();
    expect(renderableMediaRef("")).toBeUndefined();
    expect(renderableMediaRef(undefined)).toBeUndefined();
  });
});

describe("Repair #15 — durable Add Post (E4)", () => {
  beforeEach(() => {
    publishMock.mockReset();
    uploadMock.mockReset();
    uploadMock.mockResolvedValue({ media: { id: "media-uuid-1" } });
    publishMock.mockResolvedValue({ moment: { id: "moment-uuid-1" } });
  });

  it("parseDataUrl splits mime and payload", () => {
    expect(parseDataUrl(PNG_DATA_URL)).toEqual({
      mimeType: "image/png",
      base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ",
    });
    expect(parseDataUrl("/demo/x.jpg")).toBeNull();
  });

  it("uploads image media then publishes with the returned media id + chosen visibility", async () => {
    const moment = await authoritativeCreatePost({
      mediaSrc: PNG_DATA_URL,
      mediaKind: "photo",
      caption: "  real post  ",
      visibility: "private",
      bearer: "tok",
    });
    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(uploadMock.mock.calls[0][0]).toMatchObject({ mime_type: "image/png" });
    expect(publishMock).toHaveBeenCalledTimes(1);
    expect(publishMock.mock.calls[0][0]).toEqual({
      caption: "real post",
      visibility: "private",
      media_ids: ["media-uuid-1"],
    });
    expect(moment).toEqual({ id: "moment-uuid-1" });
  });

  it("caption-only post publishes without an upload", async () => {
    await authoritativeCreatePost({ caption: "text post", visibility: "friends", bearer: "tok" });
    expect(uploadMock).not.toHaveBeenCalled();
    expect(publishMock.mock.calls[0][0]).toEqual({
      caption: "text post",
      visibility: "friends",
      media_ids: [],
    });
  });

  it("refuses signed-out, empty, video, and non-uploadable media instead of faking success", async () => {
    await expect(
      authoritativeCreatePost({ caption: "x", visibility: "friends" }),
    ).rejects.toThrow(/Sign in required/);
    await expect(
      authoritativeCreatePost({ caption: " ", visibility: "friends", bearer: "tok" }),
    ).rejects.toThrow(/caption or add a photo/);
    await expect(
      authoritativeCreatePost({
        mediaSrc: "data:video/mp4;base64,AAAA",
        mediaKind: "video",
        caption: "v",
        visibility: "friends",
        bearer: "tok",
      }),
    ).rejects.toThrow(/Video posts aren't supported yet/);
    await expect(
      authoritativeCreatePost({
        mediaSrc: "/demo/moments/food.jpg",
        mediaKind: "photo",
        caption: "v",
        visibility: "friends",
        bearer: "tok",
      }),
    ).rejects.toThrow(/can't be posted from here/);
    expect(publishMock).not.toHaveBeenCalled();
  });

  it("publish failure propagates — no fake success", async () => {
    publishMock.mockRejectedValue(new Error("empty_post"));
    await expect(
      authoritativeCreatePost({ caption: "x", visibility: "friends", bearer: "tok" }),
    ).rejects.toThrow("empty_post");
  });
});

describe("Repair #15 — wiring contracts (no fake success in the flows)", () => {
  it("StoryCreateFlow awaits the authoritative share, has a caption field, and no premature success note", () => {
    const src = read("opalUi/StoryCreateFlow.tsx");
    expect(src).toMatch(/await onShared/);
    expect(src).toMatch(/story-create-caption/);
    expect(src).toMatch(/caption: caption\.trim\(\)/);
    expect(src).not.toMatch(/Story shared temporarily - expires; not on profile as Memory\./);
    // Share must not close before onShared resolves.
    expect(src.indexOf("await onShared")).toBeLessThan(src.indexOf("onClose();", src.indexOf("await onShared")));
  });

  it("GraphCreateFlow post mode has real audience choices and async submit that stays open on failure", () => {
    const src = read("opalUi/GraphCreateFlow.tsx");
    expect(src).toMatch(/mode\?: "graph" \| "post"/);
    expect(src).toMatch(/graph-create-audience-friends/);
    expect(src).toMatch(/graph-create-audience-private/);
    expect(src).toMatch(/await onCreated\?\.\(draft\)/);
    expect(src).toMatch(/Couldn't post:/);
  });

  it("OpalApp routes Home Post to durable publish and refreshes Home after story/post creates", () => {
    const app = read("OpalApp.tsx");
    expect(app).toMatch(/setGraphCreateContext\(\{ intent: "post" \}\)/);
    expect(app).toMatch(/authoritativeCreatePost/);
    expect(app).toMatch(/refreshProductionHomeOwners/);
    expect(app).toMatch(/caption: draft\.caption/);
    // The story handler must await, not fire-and-forget with a swallowed catch.
    expect(app).toMatch(/onShared=\{async \(draft\) =>/);
    expect(app).toMatch(/await authoritativeCreateStory/);
  });

  it("productClient exposes the media upload endpoint the backend already serves", () => {
    const client = read("api/productClient.ts");
    expect(client).toMatch(/uploadSocialMomentMedia/);
    expect(client).toMatch(/\/api\/v1\/product\/social-moments\/media/);
  });
});
