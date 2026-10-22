/**
 * @vitest-environment jsdom
 *
 * Repair #24 (WS-6) - moment tense, web leg:
 *  - a post published from inside the Forecast tense panel sends
 *    tense "future" through publishSocialMoment; from inside
 *    Memories it sends "past";
 *  - a post published from the sheet's plain (no-tense) doors
 *    sends NO tense key at all - the server's present default is
 *    never stamped client-side;
 *  - the home feed adapter reads the persisted tense back from
 *    the feed record onto the memory card projection, verbatim;
 *    an unknown value is treated as absent, never invented.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const publishSocialMoment = vi.fn();
const createTemporaryStory = vi.fn();
const uploadSocialMomentMedia = vi.fn();
const previewSocialMomentAudience = vi.fn();
const listPeopleProjection = vi.fn();
const listOpalPlans = vi.fn();
const listTemporaryStories = vi.fn();
const fetchHomeFeed = vi.fn();
const getLivesVisible = vi.fn();

vi.mock("../../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../../api/productClient")>(
    "../../api/productClient",
  );
  return {
    ...actual,
    publishSocialMoment: (...a: unknown[]) => publishSocialMoment(...a),
    createTemporaryStory: (...a: unknown[]) => createTemporaryStory(...a),
    uploadSocialMomentMedia: (...a: unknown[]) => uploadSocialMomentMedia(...a),
    previewSocialMomentAudience: (...a: unknown[]) => previewSocialMomentAudience(...a),
    listPeopleProjection: (...a: unknown[]) => listPeopleProjection(...a),
    listOpalPlans: (...a: unknown[]) => listOpalPlans(...a),
    listTemporaryStories: (...a: unknown[]) => listTemporaryStories(...a),
    fetchHomeFeed: (...a: unknown[]) => fetchHomeFeed(...a),
    getLivesVisible: (...a: unknown[]) => getLivesVisible(...a),
  };
});

import { C2Home } from "./C2Home";
import { homeFromSession } from "./shellData";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;
let container: HTMLElement;

async function render(node: React.ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  container = host;
  root = createRoot(host);
  await act(async () => {
    root!.render(node);
  });
  return host;
}
async function flush(ms = 0) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}
function click(el: Element) {
  act(() => {
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
}
function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
}
function q(sel: string) {
  return container.querySelector(sel) ?? document.querySelector(sel);
}

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  host = null;
  root = null;
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

beforeEach(() => {
  publishSocialMoment.mockResolvedValue({ moment: { id: "m-new" } });
  createTemporaryStory.mockResolvedValue({ story: { id: "s-new" } });
  uploadSocialMomentMedia.mockResolvedValue({ media: { id: "media-1" } });
  previewSocialMomentAudience.mockResolvedValue({
    preview: { question: "Who can see this?", who_can_see: "Your friends" },
    question: "Who can see this?",
  });
  listPeopleProjection.mockResolvedValue({ people: [] });
  listOpalPlans.mockResolvedValue({ plans: [] });
  listTemporaryStories.mockResolvedValue({ stories: [] });
  fetchHomeFeed.mockResolvedValue({ mode: "live", objects: [], stories: [] });
  getLivesVisible.mockResolvedValue({ lives: [], count: 0 });
});

function avatarOf(name: string) {
  return {
    initials: name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
    tint: null,
  };
}

const baseProjection = {
  header: { ownAvatar: avatarOf("Sam Rivera") },
  rail: {
    self: { avatar: avatarOf("Sam Rivera"), hasLiveStory: false, liveStoryLabel: null, story: null },
    stories: [],
    capabilities: { canPost: true, canStory: true },
  },
  feedError: null,
  feed: [],
};

function homeEvents(extra: Record<string, unknown> = {}) {
  return {
    openYou: vi.fn(),
    openSearch: vi.fn(),
    openActivity: vi.fn(),
    openGraph: vi.fn(),
    onShared: vi.fn(),
    bearer: "tok",
    ...extra,
  };
}

async function openSheet() {
  await render(
    <C2Home
      projection={baseProjection as never}
      events={homeEvents({ creationPlan: vi.fn() }) as never}
    />,
  );
  click(q('[data-testid="c2-stone-self"]')!);
  await flush();
}

async function publishTextPost() {
  typeInto(q('[data-testid="c2-composer-caption"]') as HTMLInputElement, "A kept moment.");
  click(q('[data-testid="c2-composer-share"]')!);
  await flush();
}

describe("R24 WS-6 - the composer sends the panel's tense on publish", () => {
  it("Forecast panel -> Text -> publish sends tense future", async () => {
    await openSheet();
    click(q('[data-testid="c2-create-tense-future"]')!);
    click(q('[data-testid="c2-create-tense-text"]')!);
    await flush();
    await publishTextPost();
    expect(publishSocialMoment).toHaveBeenCalledWith(
      expect.objectContaining({ caption: "A kept moment.", tense: "future" }),
      "tok",
    );
  });

  it("Memories panel -> Text -> publish sends tense past", async () => {
    await openSheet();
    click(q('[data-testid="c2-create-tense-past"]')!);
    click(q('[data-testid="c2-create-tense-text"]')!);
    await flush();
    await publishTextPost();
    expect(publishSocialMoment).toHaveBeenCalledWith(
      expect.objectContaining({ caption: "A kept moment.", tense: "past" }),
      "tok",
    );
  });

  it("the plain text door sends no tense key at all (server default, never a client stamp)", async () => {
    await openSheet();
    click(q('[data-testid="c2-create-text"]')!);
    await flush();
    await publishTextPost();
    expect(publishSocialMoment).toHaveBeenCalledTimes(1);
    const attrs = publishSocialMoment.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(attrs, "tense")).toBe(false);
  });
});

describe("R24 WS-6 - the feed adapter reads the persisted tense back", () => {
  it("a feed record's tense lands on the memory card projection verbatim", async () => {
    fetchHomeFeed.mockResolvedValue({
      mode: "live",
      objects: [
        {
          id: "m-future",
          object_type: "memory",
          caption: "tomorrow at the pier",
          tense: "future",
          actor: { user_id: "u-maya", display_name: "Maya Chen" },
          media_ref: null,
          engagement_summary: {},
        },
        {
          id: "m-odd",
          object_type: "memory",
          caption: "unlabelled",
          tense: "someday",
          actor: { user_id: "u-maya", display_name: "Maya Chen" },
          media_ref: null,
          engagement_summary: {},
        },
      ],
      stories: [],
    });

    const projection = await homeFromSession(
      { user_id: "u-me", display_name: "Sam Rivera" } as never,
      "tok",
    );
    const byId = new Map(
      projection.feed
        .filter((c) => c.kind === "memory")
        .map((c) => [c.id, c] as const),
    );
    expect(byId.get("m-future")?.tense).toBe("future");
    // Unknown tense values are older-payload absence, never carried.
    expect(byId.get("m-odd")?.tense).toBeUndefined();
  });
});
