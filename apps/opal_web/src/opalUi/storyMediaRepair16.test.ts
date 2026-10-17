import { describe, expect, it, vi, beforeEach } from "vitest";

const uploadMock = vi.fn();
const createStoryMock = vi.fn();

vi.mock("../api/productClient", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    uploadSocialMomentMedia: (...args: unknown[]) => uploadMock(...args),
    createTemporaryStory: (...args: unknown[]) => createStoryMock(...args),
  };
});

import {
  authoritativeCreateStory,
  productionStoryToItem,
  renderableMediaRef,
} from "./socialAuthority";

const PNG_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ";
const VIDEO_DATA_URL = "data:video/mp4;base64,AAAA";
const SERVED_URL = "/api/v1/product/social-moments/media/media-uuid-9";

describe("Repair #16 — story image media goes through the media store (B2)", () => {
  beforeEach(() => {
    uploadMock.mockReset();
    createStoryMock.mockReset();
    uploadMock.mockResolvedValue({ media: { id: "media-uuid-9" } });
    createStoryMock.mockResolvedValue({ story: { id: "story-uuid-1" } });
  });

  it("uploads the image capture, then creates the story with the media id (no data: URL sent as the ref)", async () => {
    const res = await authoritativeCreateStory({
      mediaRef: PNG_DATA_URL,
      visibility: "close_circle",
      caption: "inner circle",
      bearer: "tok",
    });
    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(uploadMock.mock.calls[0][0]).toMatchObject({ mime_type: "image/png" });
    expect(createStoryMock).toHaveBeenCalledTimes(1);
    expect(createStoryMock.mock.calls[0][0]).toEqual({
      media_id: "media-uuid-9",
      visibility: "close_circle",
      caption: "inner circle",
    });
    expect(JSON.stringify(createStoryMock.mock.calls[0][0])).not.toContain("data:image");
    expect(res).toEqual({ story: { id: "story-uuid-1" } });
  });

  it("upload failure propagates — the story is never created and success is never faked", async () => {
    uploadMock.mockRejectedValue(new Error("unsupported_mime"));
    await expect(
      authoritativeCreateStory({
        mediaRef: PNG_DATA_URL,
        visibility: "friends",
        bearer: "tok",
      }),
    ).rejects.toThrow("unsupported_mime");
    expect(createStoryMock).not.toHaveBeenCalled();
  });

  it("an upload that returns no media id throws instead of creating a story", async () => {
    uploadMock.mockResolvedValue({ media: {} });
    await expect(
      authoritativeCreateStory({
        mediaRef: PNG_DATA_URL,
        visibility: "friends",
        bearer: "tok",
      }),
    ).rejects.toThrow(/did not return a durable media id/);
    expect(createStoryMock).not.toHaveBeenCalled();
  });

  it("signed-out story create throws before any upload", async () => {
    await expect(
      authoritativeCreateStory({ mediaRef: PNG_DATA_URL, visibility: "friends" }),
    ).rejects.toThrow(/Sign in required/);
    expect(uploadMock).not.toHaveBeenCalled();
    expect(createStoryMock).not.toHaveBeenCalled();
  });

  it("video stories keep the legacy inline ref exactly as before (video out of scope)", async () => {
    await authoritativeCreateStory({
      mediaRef: VIDEO_DATA_URL,
      visibility: "friends",
      caption: "clip",
      bearer: "tok",
    });
    expect(uploadMock).not.toHaveBeenCalled();
    expect(createStoryMock.mock.calls[0][0]).toEqual({
      media_ref: VIDEO_DATA_URL,
      visibility: "friends",
      caption: "clip",
    });
  });

  it("non-data refs (fixture path) pass through untouched with no upload", async () => {
    await authoritativeCreateStory({
      mediaRef: "/demo/moments/food.jpg",
      visibility: "friends",
      bearer: "tok",
    });
    expect(uploadMock).not.toHaveBeenCalled();
    expect(createStoryMock.mock.calls[0][0]).toMatchObject({
      media_ref: "/demo/moments/food.jpg",
    });
  });
});

describe("Repair #16 — story viewer renders served media URLs and legacy refs", () => {
  it("productionStoryToItem maps the backend served media URL to mediaSrc", () => {
    const item = productionStoryToItem({
      id: "story-uuid-1",
      author_name: "Jordan",
      media_ref: SERVED_URL,
      media_id: "media-uuid-9",
      caption: "served",
      created_at: new Date().toISOString(),
    });
    expect(item.mediaSrc).toBe(SERVED_URL);
  });

  it("legacy data:-ref stories still render (back-compat)", () => {
    const item = productionStoryToItem({
      id: "story-legacy",
      author_name: "Jordan",
      media_ref: PNG_DATA_URL,
      caption: "old",
      created_at: new Date().toISOString(),
    });
    expect(item.mediaSrc).toBe(PNG_DATA_URL);
  });

  it("tampered refs never become a mediaSrc", () => {
    expect(renderableMediaRef("javascript:alert(1)")).toBeUndefined();
    expect(renderableMediaRef("media:media-uuid-9")).toBeUndefined();
    expect(renderableMediaRef("media-uuid-9")).toBeUndefined();
    const item = productionStoryToItem({
      id: "story-tampered",
      author_name: "Jordan",
      media_ref: "javascript:alert(1)",
      created_at: new Date().toISOString(),
    });
    expect(item.mediaSrc).toBeUndefined();
  });
});
