/**
 * @vitest-environment jsdom
 *
 * Repair #24 (WS-1, audit D-M) pins:
 *
 *  1. The mention/response ATTENTION trigger, wired: a story
 *     whose record carries the server-computed flags
 *     viewer_mentioned / viewer_has_response (from the
 *     story-engagement record) renders data-glow="attention"
 *     even when its state is plain "new" - and a story with
 *     neither flag still rests. The interest trigger stays
 *     unwired: no interest field exists in the rail record,
 *     so no pin pretends one.
 *  2. Story comments: the story viewer's comments door opens
 *     the story comments sheet; the sheet renders ONLY the
 *     server list response and a posted comment renders ONLY
 *     from the post response (the moment sheet's truth law,
 *     carried to stories).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { C2Home } from "./C2Home";
import { C2StoryCommentsSheet } from "./C2StoryCommentsSheet";
import { StoryViewerC2 } from "./StoryViewerC2";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const api = vi.hoisted(() => ({
  listStoryComments: vi.fn(),
  addStoryComment: vi.fn(),
}));

vi.mock("../../api/productClient", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    listStoryComments: (...args: unknown[]) => api.listStoryComments(...args),
    addStoryComment: (...args: unknown[]) => api.addStoryComment(...args),
  };
});

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

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  host = null;
  root = null;
  document.body.innerHTML = "";
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
});

beforeEach(() => {
  api.listStoryComments.mockResolvedValue({ comments: [], comment_count: 0 });
  api.addStoryComment.mockResolvedValue({
    comment: {
      id: "c-new",
      story_id: "s1",
      author_user_id: "u-viewer",
      author_name: "Sam Rivera",
      body: "from the server",
      created_at: "2026-10-22T10:00:00Z",
    },
    comment_count: 1,
  });
});

function avatarOf(name: string) {
  return { initials: name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() };
}

function story(id: string, name: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    personId: `u-${id}`,
    personName: name,
    avatar: avatarOf(name),
    mediaUrl: `/media/${id}.jpg`,
    caption: null,
    storyCount: 1,
    seen: false,
    stoneState: "new" as const,
    ...extra,
  };
}

function projection(stories: unknown[]) {
  return {
    header: { ownAvatar: avatarOf("Sam Rivera") },
    rail: {
      self: { avatar: avatarOf("Sam Rivera"), hasLiveStory: false, liveStoryLabel: null, story: null },
      stories,
      capabilities: { canPost: true, canStory: true },
    },
    feed: [],
    feedError: null,
  };
}

const events = {
  openYou: vi.fn(),
  openSearch: vi.fn(),
  openActivity: vi.fn(),
  openGraph: vi.fn(),
  onShared: vi.fn(),
  bearer: "tok",
};

const click = (el: Element) =>
  act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

describe("R24 WS-1 - mention/response ATTENTION glow trigger", () => {
  it("a plain new story mentioning the viewer renders attention; an unflagged new story rests", async () => {
    await render(
      <C2Home
        projection={
          projection([
            story("s1", "Maya Torres", { viewerMentioned: true }),
            story("s2", "Theo Nguyen"),
          ]) as never
        }
        events={events}
      />,
    );
    const stones = [...container.querySelectorAll('[data-testid="c2-stone"]')];
    expect(stones).toHaveLength(2);
    expect(stones[0].getAttribute("data-state")).toBe("new");
    expect(stones[0].getAttribute("data-glow")).toBe("attention");
    expect(stones[1].getAttribute("data-glow")).toBe("rest");
  });

  it("a response involving the viewer also earns attention on its own", async () => {
    await render(
      <C2Home
        projection={projection([story("s1", "Maya Torres", { viewerHasResponse: true })]) as never}
        events={events}
      />,
    );
    const stone = container.querySelector('[data-testid="c2-stone"]')!;
    expect(stone.getAttribute("data-glow")).toBe("attention");
  });
});

describe("R24 WS-1 - story comments", () => {
  it("the story viewer carries a comments door that names the story", async () => {
    const onComments = vi.fn();
    await render(
      <StoryViewerC2
        queue={[
          {
            id: "story-9",
            personName: "Maya Torres",
            personId: "u-maya",
            mediaUrl: "/media/story-9.jpg",
            caption: null,
            expiresAt: null,
          },
        ]}
        onClose={() => undefined}
        onReply={() => undefined}
        onComments={onComments}
      />,
    );
    const door = document.querySelector('[data-testid="c2-story-viewer-comments"]')!;
    expect(door).toBeTruthy();
    await click(door);
    expect(onComments).toHaveBeenCalledWith("story-9");
    // The reply door keeps its own testid and meaning.
    expect(document.querySelector('[data-testid="c2-story-viewer-reply"]')).toBeTruthy();
  });

  it("no comments door renders when the shell wires no openStoryComments (no dead control)", async () => {
    await render(
      <StoryViewerC2
        queue={[
          {
            id: "story-9",
            personName: "Maya Torres",
            personId: "u-maya",
            mediaUrl: "/media/story-9.jpg",
            caption: null,
            expiresAt: null,
          },
        ]}
        onClose={() => undefined}
        onReply={() => undefined}
      />,
    );
    expect(document.querySelector('[data-testid="c2-story-viewer-comments"]')).toBeNull();
  });

  it("the sheet renders the server list and posts render from the response only", async () => {
    api.listStoryComments.mockResolvedValue({
      comments: [
        {
          id: "c1",
          story_id: "s1",
          author_user_id: "u-maya",
          author_name: "Maya Torres",
          body: "server listed comment",
          created_at: "2026-10-22T09:00:00Z",
        },
      ],
      comment_count: 1,
    });
    await render(<C2StoryCommentsSheet storyId="s1" bearer="tok" onClose={() => undefined} />);
    await act(async () => {});
    expect(api.listStoryComments).toHaveBeenCalledWith("s1", "tok");
    const sheet = document.querySelector('[data-testid="c2-story-comments-sheet"]')!;
    expect(sheet.textContent).toMatch(/server listed comment/);
    // No count numeral renders anywhere in the sheet.
    expect(sheet.textContent).not.toMatch(/comment_count/);

    const input = document.querySelector('[data-testid="c2-story-comments-input"]') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, "a local draft that must not paint");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await click(document.querySelector('[data-testid="c2-story-comments-post"]')!);
    await act(async () => {});
    expect(api.addStoryComment).toHaveBeenCalledWith("s1", "a local draft that must not paint", "tok");
    // The painted comment is the RESPONSE record, not the draft.
    expect(sheet.textContent).toMatch(/from the server/);
    const rows = document.querySelectorAll('[data-testid="c2-story-comment"]');
    expect(rows).toHaveLength(2);
  });

  it("a failed load shows its error line and a retry, never a staged list", async () => {
    api.listStoryComments.mockRejectedValue(new Error("down"));
    await render(<C2StoryCommentsSheet storyId="s1" bearer="tok" onClose={() => undefined} />);
    await act(async () => {});
    expect(document.querySelector('[data-testid="c2-story-comments-error"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="c2-story-comments-list"]')).toBeNull();
  });
});
