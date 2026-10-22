/**
 * @vitest-environment jsdom
 *
 * Repair #23 (WS-23-1) - FLOWS VOICE pins. What these prove:
 *  - F-3 closed: the speech-bubble glyph opens the moment's
 *    COMMENTS (events.openComments), never the author's DM;
 *    the author-thread jump keeps its own door (the person
 *    glyph, data-testid c2-feed-reply) firing replyToPerson.
 *  - R-1 closed: the comments sheet lists from the real
 *    listSocialMomentComments call and a post round-trips
 *    through addSocialMomentComment, rendering from the
 *    server response - no optimistic paint.
 *  - R-3 closed: repost / save fire the real client calls and
 *    re-render their state from the responses; at rest the
 *    state comes from the moment record's own fields, which
 *    the one adapter reads from the feed payload's
 *    engagement_summary (viewer_reposted / viewer_saved).
 *  - Save lands somewhere real: the You surface's moments
 *    archive reads the saved list back (listSaved) in its
 *    Saved section.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const likeSocialMoment = vi.fn();
const unlikeSocialMoment = vi.fn();
const getMomentLight = vi.fn();
const listSocialMomentComments = vi.fn();
const addSocialMomentComment = vi.fn();
const repostSocialMoment = vi.fn();
const unrepostSocialMoment = vi.fn();
const saveSocialMoment = vi.fn();
const unsaveSocialMoment = vi.fn();
const listSaved = vi.fn();
const fetchMomentsArchive = vi.fn();
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
    likeSocialMoment: (...a: unknown[]) => likeSocialMoment(...a),
    unlikeSocialMoment: (...a: unknown[]) => unlikeSocialMoment(...a),
    getMomentLight: (...a: unknown[]) => getMomentLight(...a),
    listSocialMomentComments: (...a: unknown[]) => listSocialMomentComments(...a),
    addSocialMomentComment: (...a: unknown[]) => addSocialMomentComment(...a),
    repostSocialMoment: (...a: unknown[]) => repostSocialMoment(...a),
    unrepostSocialMoment: (...a: unknown[]) => unrepostSocialMoment(...a),
    saveSocialMoment: (...a: unknown[]) => saveSocialMoment(...a),
    unsaveSocialMoment: (...a: unknown[]) => unsaveSocialMoment(...a),
    listSaved: (...a: unknown[]) => listSaved(...a),
    fetchMomentsArchive: (...a: unknown[]) => fetchMomentsArchive(...a),
    listOpalPlans: (...a: unknown[]) => listOpalPlans(...a),
    listTemporaryStories: (...a: unknown[]) => listTemporaryStories(...a),
    fetchHomeFeed: (...a: unknown[]) => fetchHomeFeed(...a),
    getLivesVisible: (...a: unknown[]) => getLivesVisible(...a),
  };
});

import { C2Home } from "./C2Home";
import { C2CommentsSheet } from "./C2CommentsSheet";
import { MomentsArchive } from "./adopt3";
import { avatarOf, homeFromSession } from "./shellData";
import type { HomeProjection } from "./projections";

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
  await flush();
  return host;
}
async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}
function click(el: Element) {
  act(() => {
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
}
async function clickAsync(el: Element) {
  await act(async () => {
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
  await flush();
}
function q(sel: string) {
  // Sheets render through the TopLayer portal at document.body.
  return container.querySelector(sel) ?? document.querySelector(sel);
}
function qa(sel: string) {
  const inContainer = [...container.querySelectorAll(sel)];
  return inContainer.length > 0 ? inContainer : [...document.querySelectorAll(sel)];
}
function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
}

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  host = null;
  root = null;
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

const COMMENTS_PAGE = {
  comments: [
    {
      id: "c1",
      content_id: "m1",
      author_user_id: "u-june",
      author_name: "June Park",
      body: "That light at the market was unreal.",
      created_at: "2026-10-21T09:30:00Z",
    },
    {
      id: "c2",
      content_id: "m1",
      author_user_id: "u-maya",
      author_name: "Maya Chen",
      body: "Golden hour did all the work.",
      created_at: "2026-10-21T10:05:00Z",
    },
  ],
  comment_count: 2,
};

beforeEach(() => {
  likeSocialMoment.mockResolvedValue({ viewer_liked: true, like_count: 4 });
  unlikeSocialMoment.mockResolvedValue({ viewer_liked: false, like_count: 0 });
  getMomentLight.mockResolvedValue({
    moment_id: "m1",
    author_only_people: false,
    people: [],
    warmth: 3,
    viewer_liked: false,
  });
  listSocialMomentComments.mockResolvedValue(COMMENTS_PAGE);
  addSocialMomentComment.mockResolvedValue({
    comment: {
      id: "c3",
      content_id: "m1",
      author_user_id: "u-me",
      author_name: "Sam Rivera",
      body: "Count me in next time.",
      created_at: "2026-10-21T11:15:00Z",
    },
    comment_count: 3,
  });
  repostSocialMoment.mockResolvedValue({ viewer_reposted: true, repost_count: 5 });
  unrepostSocialMoment.mockResolvedValue({ viewer_reposted: false, repost_count: 4 });
  saveSocialMoment.mockResolvedValue({ viewer_saved: true });
  unsaveSocialMoment.mockResolvedValue({ viewer_saved: false });
  listSaved.mockResolvedValue({ saves: [], count: 0 });
  fetchMomentsArchive.mockResolvedValue({ posts: [], stories: [], count: 0 });
  listOpalPlans.mockResolvedValue({ plans: [] });
  listTemporaryStories.mockResolvedValue({ stories: [] });
  fetchHomeFeed.mockResolvedValue({ mode: "live", objects: [], stories: [] });
  getLivesVisible.mockResolvedValue({ lives: [], count: 0 });
  // Authenticated media settles quietly in this environment.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "image/jpeg" },
      arrayBuffer: async () => new Uint8Array([0xff, 0xd8]).buffer as ArrayBuffer,
    })),
  );
  (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(() => "blob:r23");
  (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
});

const memoryItem = {
  kind: "memory" as const,
  id: "m1",
  photoUrl: null,
  photoProvenance: null,
  contextLine: "Golden hour at the market",
  authorLine: "Maya Chen",
  authorName: "Maya Chen",
  authorAvatar: avatarOf("Maya Chen"),
  authorUserId: "u-maya",
  mine: false,
  placeLabel: "Oceanside Farmers Market",
  likeCount: 3,
  viewerLiked: false,
  viewerReposted: false,
  repostCount: 4,
  viewerSaved: false,
  commentCount: 2,
};

function projection(feed: HomeProjection["feed"]): HomeProjection {
  return {
    header: { ownAvatar: avatarOf("You") },
    rail: {
      self: { avatar: avatarOf("You"), hasLiveStory: false, liveStoryLabel: null },
      stories: [],
      capabilities: { canPost: true, canStory: true },
    },
    feed,
  };
}

function homeEvents(extra: Record<string, unknown> = {}) {
  return {
    openYou: vi.fn(),
    openSearch: vi.fn(),
    openActivity: vi.fn(),
    openGraph: vi.fn(),
    onShared: vi.fn(),
    bearer: "tok",
    seedDoor: vi.fn(),
    ...extra,
  };
}

describe("WS-23-1 F-3 - the bubble means comments; the person door means the thread", () => {
  it("the speech bubble opens comments with the moment id, NOT the DM", async () => {
    const openComments = vi.fn();
    const replyToPerson = vi.fn();
    await render(
      <C2Home
        projection={projection([memoryItem])}
        events={homeEvents({ openComments, replyToPerson }) as never}
      />,
    );
    const bubble = q('[data-testid="c2-feed-comments"]')!;
    expect(bubble).toBeTruthy();
    expect(bubble.getAttribute("aria-label")).toMatch(/Comments/);
    click(bubble);
    expect(openComments).toHaveBeenCalledTimes(1);
    expect(openComments).toHaveBeenCalledWith("m1");
    expect(replyToPerson).not.toHaveBeenCalled();
  });

  it("the thread door is a distinct person glyph and opens the author's thread", async () => {
    const openComments = vi.fn();
    const replyToPerson = vi.fn();
    await render(
      <C2Home
        projection={projection([memoryItem])}
        events={homeEvents({ openComments, replyToPerson }) as never}
      />,
    );
    const bubble = q('[data-testid="c2-feed-comments"]')!;
    const door = q('[data-testid="c2-feed-reply"]')!;
    expect(door).toBeTruthy();
    expect(door.getAttribute("aria-label")).toMatch(/Message Maya/);
    // Visually distinct doors: different drawn glyphs. The
    // bubble is the chat mark; the person door must not carry it.
    const bubblePath = bubble.querySelector("svg path")?.getAttribute("d");
    const doorPaths = [...door.querySelectorAll("svg path")].map((p) => p.getAttribute("d"));
    expect(bubblePath).toBeTruthy();
    expect(doorPaths).not.toContain(bubblePath);
    click(door);
    expect(replyToPerson).toHaveBeenCalledTimes(1);
    expect(replyToPerson).toHaveBeenCalledWith("u-maya");
    expect(openComments).not.toHaveBeenCalled();
  });

  it("no comments door renders when the shell wires no openComments (no dead control)", async () => {
    await render(
      <C2Home
        projection={projection([memoryItem])}
        events={homeEvents({ replyToPerson: vi.fn() }) as never}
      />,
    );
    expect(q('[data-testid="c2-feed-comments"]')).toBeNull();
    expect(q('[data-testid="c2-feed-reply"]')).toBeTruthy();
  });
});

describe("WS-23-1 R-1 - the comments sheet round-trip", () => {
  it("lists comments from the server call, with author and time from the records", async () => {
    const onClose = vi.fn();
    await render(<C2CommentsSheet momentId="m1" bearer="tok" onClose={onClose} />);
    expect(listSocialMomentComments).toHaveBeenCalledWith("m1", "tok");
    const rows = qa('[data-testid="c2-comment"]');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain("June Park");
    expect(rows[0].textContent).toContain("That light at the market was unreal.");
    expect(rows[0].textContent).toContain("Oct 21");
    expect(rows[1].textContent).toContain("Maya Chen");
    expect(q('[data-testid="c2-comments-empty"]')).toBeNull();
    // The sheet has an explicit close in the shell's material.
    click(q('[data-testid="c2-comments-close"]')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("an empty thread renders the honest empty line", async () => {
    listSocialMomentComments.mockResolvedValue({ comments: [], comment_count: 0 });
    await render(<C2CommentsSheet momentId="m1" bearer="tok" onClose={() => undefined} />);
    expect(q('[data-testid="c2-comments-empty"]')).toBeTruthy();
    expect(qa('[data-testid="c2-comment"]')).toHaveLength(0);
  });

  it("a post round-trips through addSocialMomentComment and renders from the response", async () => {
    await render(<C2CommentsSheet momentId="m1" bearer="tok" onClose={() => undefined} />);
    expect(qa('[data-testid="c2-comment"]')).toHaveLength(2);
    const input = q('[data-testid="c2-comments-input"]') as HTMLInputElement;
    typeInto(input, "Count me in next time.");
    const form = q('[data-testid="c2-comments-composer"]') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    });
    await flush();
    expect(addSocialMomentComment).toHaveBeenCalledTimes(1);
    expect(addSocialMomentComment).toHaveBeenCalledWith("m1", "Count me in next time.", "tok");
    // The new row is the RESPONSE's record (its id, its author,
    // its stamp) - and the list was not re-read to get it.
    const rows = qa('[data-testid="c2-comment"]');
    expect(rows).toHaveLength(3);
    const posted = rows.find((r) => r.getAttribute("data-comment-id") === "c3")!;
    expect(posted).toBeTruthy();
    expect(posted.textContent).toContain("Sam Rivera");
    expect(posted.textContent).toContain("Count me in next time.");
    expect(listSocialMomentComments).toHaveBeenCalledTimes(1);
    expect((q('[data-testid="c2-comments-input"]') as HTMLInputElement).value).toBe("");
  });

  it("a failed post paints nothing and keeps the draft", async () => {
    addSocialMomentComment.mockRejectedValue(new Error("down"));
    await render(<C2CommentsSheet momentId="m1" bearer="tok" onClose={() => undefined} />);
    const input = q('[data-testid="c2-comments-input"]') as HTMLInputElement;
    typeInto(input, "This will not land.");
    const form = q('[data-testid="c2-comments-composer"]') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    });
    await flush();
    expect(q('[data-testid="c2-comments-post-error"]')).toBeTruthy();
    expect(qa('[data-testid="c2-comment"]')).toHaveLength(2);
    expect((q('[data-testid="c2-comments-input"]') as HTMLInputElement).value).toBe(
      "This will not land.",
    );
  });
});

describe("WS-23-1 R-3 - repost and save on the card", () => {
  it("repost fires the real call and re-renders state from the response; a second tap unreposts", async () => {
    await render(
      <C2Home
        projection={projection([memoryItem])}
        events={homeEvents({ openComments: vi.fn(), replyToPerson: vi.fn() }) as never}
      />,
    );
    const btn = q('[data-testid="c2-feed-repost"]')!;
    expect(btn.getAttribute("data-active")).toBeNull();
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    await clickAsync(btn);
    expect(repostSocialMoment).toHaveBeenCalledWith("m1", "tok");
    const after = q('[data-testid="c2-feed-repost"]')!;
    expect(after.getAttribute("data-active")).toBe("1");
    expect(after.getAttribute("aria-pressed")).toBe("true");
    // Counts-free law holds for repost too: the response's
    // repost_count (5) renders nowhere in the action row.
    const row = after.parentElement!;
    expect(row.textContent).not.toMatch(/\d/);
    await clickAsync(after);
    expect(unrepostSocialMoment).toHaveBeenCalledWith("m1", "tok");
    expect(q('[data-testid="c2-feed-repost"]')!.getAttribute("data-active")).toBeNull();
  });

  it("at rest, reposted and saved state render from the moment record's own fields", async () => {
    await render(
      <C2Home
        projection={projection([{ ...memoryItem, viewerReposted: true, viewerSaved: true }])}
        events={homeEvents({ openComments: vi.fn(), replyToPerson: vi.fn() }) as never}
      />,
    );
    expect(q('[data-testid="c2-feed-repost"]')!.getAttribute("data-active")).toBe("1");
    expect(q('[data-testid="c2-feed-save"]')!.getAttribute("data-active")).toBe("1");
    expect(repostSocialMoment).not.toHaveBeenCalled();
    expect(saveSocialMoment).not.toHaveBeenCalled();
  });

  it("save fires the real call and re-renders from the response; unsave reverses it", async () => {
    await render(
      <C2Home
        projection={projection([memoryItem])}
        events={homeEvents({ openComments: vi.fn(), replyToPerson: vi.fn() }) as never}
      />,
    );
    const btn = q('[data-testid="c2-feed-save"]')!;
    expect(btn.getAttribute("data-active")).toBeNull();
    await clickAsync(btn);
    expect(saveSocialMoment).toHaveBeenCalledWith("m1", "tok");
    expect(q('[data-testid="c2-feed-save"]')!.getAttribute("data-active")).toBe("1");
    await clickAsync(q('[data-testid="c2-feed-save"]')!);
    expect(unsaveSocialMoment).toHaveBeenCalledWith("m1", "tok");
    expect(q('[data-testid="c2-feed-save"]')!.getAttribute("data-active")).toBeNull();
  });

  it("a failed repost changes nothing on the card", async () => {
    repostSocialMoment.mockRejectedValue(new Error("down"));
    await render(
      <C2Home
        projection={projection([memoryItem])}
        events={homeEvents({ openComments: vi.fn(), replyToPerson: vi.fn() }) as never}
      />,
    );
    await clickAsync(q('[data-testid="c2-feed-repost"]')!);
    expect(q('[data-testid="c2-feed-repost"]')!.getAttribute("data-active")).toBeNull();
  });
});

describe("WS-23-1 - the feed payload carries the state; save reads back in the archive", () => {
  it("the adapter maps engagement_summary repost / save / comment truth onto the card record", async () => {
    fetchHomeFeed.mockResolvedValue({
      mode: "live",
      objects: [
        {
          id: "m9",
          object_type: "memory",
          caption: "Harbor morning",
          actor: { display_name: "Maya Chen", user_id: "u-maya" },
          engagement_summary: {
            viewer_liked: false,
            like_count: 1,
            comment_count: 3,
            viewer_reposted: true,
            repost_count: 2,
            viewer_saved: true,
          },
        },
      ],
      stories: [],
    });
    const home = await homeFromSession(null, "tok");
    const item = home.feed.find((f) => f.kind === "memory" && f.id === "m9");
    expect(item?.kind).toBe("memory");
    if (item?.kind === "memory") {
      expect(item.viewerReposted).toBe(true);
      expect(item.repostCount).toBe(2);
      expect(item.viewerSaved).toBe(true);
      expect(item.commentCount).toBe(3);
    }
  });

  it("a moment saved in Flows reads back in the You moments archive's Saved section", async () => {
    listSaved.mockResolvedValue({
      saves: [
        {
          id: "m9",
          caption: "Harbor morning",
          author_user_id: "u-maya",
          created_at: "2026-10-20T08:00:00Z",
          visibility: "friends",
          viewer_saved: true,
          object_type: "memory",
        },
      ],
      count: 1,
    });
    await render(<MomentsArchive bearer="tok" onBack={() => undefined} />);
    expect(listSaved).toHaveBeenCalledWith("tok");
    const section = q('[data-testid="c2-archive-saved"]');
    expect(section).toBeTruthy();
    const rows = qa('[data-testid="c2-archive-saved-item"]');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("Harbor morning");
    expect(rows[0].textContent).toContain("Saved post");
  });

  it("no saved records, no Saved section (absence is honest)", async () => {
    await render(<MomentsArchive bearer="tok" onBack={() => undefined} />);
    expect(q('[data-testid="c2-archive-saved"]')).toBeNull();
  });
});
