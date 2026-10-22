/**
 * @vitest-environment jsdom
 *
 * Repair #23 (WS-23-4) - FOLLOW FINDABLE pins (audit R-4). What
 * these prove:
 *  - PersonProfile carries a Follow / Following control in its
 *    action row, beside Message / Our stone. Its state comes
 *    from followStatus on open - never from local memory - and
 *    every toggle re-renders FROM THE RESPONSE of the real
 *    followUser / unfollowUser calls (the DiscoveryRow pattern).
 *  - The control's language is the model's truth: a follow is
 *    a FollowGraph edge, NOT friendship, granting NO friend
 *    visibility - the sheet says Follow / Following and nothing
 *    that implies otherwise, and no follow count renders
 *    anywhere (counts are not in the model).
 *  - No follow leg supplied by the host = no control renders
 *    (the house rule: no buttons without a real action). A
 *    failed status read renders no control either - an
 *    unconfirmed state is never painted.
 *  - Discovery is interleaved into the braid after its first
 *    group (the first two stream items - the braid's two
 *    staggered currents), NOT after the whole feed: its
 *    position index inside the composed feed sits within the
 *    first group, with feed items still below it.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const followUser = vi.fn();
const unfollowUser = vi.fn();
const followStatus = vi.fn();

vi.mock("../../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../../api/productClient")>(
    "../../api/productClient",
  );
  return {
    ...actual,
    followUser: (...a: unknown[]) => followUser(...a),
    unfollowUser: (...a: unknown[]) => unfollowUser(...a),
    followStatus: (...a: unknown[]) => followStatus(...a),
  };
});

import { C2Home } from "./C2Home";
import { PersonProfileSheet } from "./PersonProfile";
import { avatarOf } from "./shellData";
import type { HomeProjection, PersonProfileProjection } from "./projections";

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
async function unmount() {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  host = null;
  root = null;
  document.body.innerHTML = "";
}
function q(sel: string) {
  // Sheets render through the TopLayer portal at document.body.
  return container.querySelector(sel) ?? document.querySelector(sel);
}
async function clickAsync(el: Element) {
  await act(async () => {
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
  await flush();
}

afterEach(async () => {
  await unmount();
  vi.clearAllMocks();
});

const FOLLOW_OFF = {
  following: false,
  creator_user_id: "u-maya",
  grants_friend_visibility: false,
  is_friend_via_relationship_graph: false,
  follow_is_not_friend: true,
};
const FOLLOW_ON = { ...FOLLOW_OFF, following: true };

beforeEach(() => {
  followStatus.mockResolvedValue(FOLLOW_OFF);
  followUser.mockResolvedValue({
    following: true,
    origin: "profile",
    creator_user_id: "u-maya",
    follower_user_id: "u-me",
    grants_friend_visibility: false,
    follow_is_not_friend: true,
    permission_matrix: {},
  });
  unfollowUser.mockResolvedValue({ following: false, status: "unfollowed" });
});

const profile: PersonProfileProjection = {
  name: "Maya Chen",
  handle: "maya",
  avatar: avatarOf("Maya Chen"),
  relationshipLabel: null,
  personId: "u-maya",
  relationshipType: null,
  familySubtype: null,
  familyMinor: false,
  ageBand: null,
  closeCircle: false,
  nextTogether: null,
  peerCount: 1,
};

function profileSheet(extra: Record<string, unknown> = {}) {
  return (
    <PersonProfileSheet
      profile={profile}
      onClose={() => undefined}
      onMessage={() => undefined}
      onOpenBond={() => undefined}
      follow={{ userId: "u-maya", bearer: "tok" }}
      {...extra}
    />
  );
}

describe("WS-23-4 R-4 - the follow control on PersonProfile", () => {
  it("renders Follow in the action row when followStatus says not following", async () => {
    await render(profileSheet());
    expect(followStatus).toHaveBeenCalledTimes(1);
    expect(followStatus).toHaveBeenCalledWith("u-maya", "tok");
    const btn = q('[data-testid="r23-profile-follow"]')!;
    expect(btn).toBeTruthy();
    expect(btn.textContent).toBe("Follow");
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    // The action row is shared: Message and Our stone sit with it.
    const row = btn.parentElement!;
    expect(row.querySelector('[data-testid="r19-profile-message"]')).toBeTruthy();
    expect(row.querySelector('[data-testid="r19-profile-bond"]')).toBeTruthy();
  });

  it("renders Following when followStatus says following", async () => {
    followStatus.mockResolvedValue(FOLLOW_ON);
    await render(profileSheet());
    const btn = q('[data-testid="r23-profile-follow"]')!;
    expect(btn.textContent).toBe("Following");
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });

  it("a tap fires followUser and the control re-renders from the response; the reverse unfollows", async () => {
    await render(profileSheet());
    const btn = q('[data-testid="r23-profile-follow"]')!;
    await clickAsync(btn);
    expect(followUser).toHaveBeenCalledTimes(1);
    expect(followUser).toHaveBeenCalledWith("u-maya", "tok");
    expect(unfollowUser).not.toHaveBeenCalled();
    const after = q('[data-testid="r23-profile-follow"]')!;
    expect(after.textContent).toBe("Following");
    expect(after.getAttribute("aria-pressed")).toBe("true");
    await clickAsync(after);
    expect(unfollowUser).toHaveBeenCalledTimes(1);
    expect(unfollowUser).toHaveBeenCalledWith("u-maya", "tok");
    expect(q('[data-testid="r23-profile-follow"]')!.textContent).toBe("Follow");
  });

  it("a failed toggle changes nothing on the control", async () => {
    followUser.mockRejectedValue(new Error("down"));
    await render(profileSheet());
    await clickAsync(q('[data-testid="r23-profile-follow"]')!);
    expect(q('[data-testid="r23-profile-follow"]')!.textContent).toBe("Follow");
  });

  it("state persists across a re-open because it is re-read from followStatus, not local memory", async () => {
    await render(profileSheet());
    await clickAsync(q('[data-testid="r23-profile-follow"]')!);
    expect(q('[data-testid="r23-profile-follow"]')!.textContent).toBe("Following");
    await unmount();
    // The server now holds the edge the write created.
    followStatus.mockResolvedValue(FOLLOW_ON);
    followUser.mockClear();
    await render(profileSheet());
    expect(followStatus).toHaveBeenCalledTimes(2);
    expect(followUser).not.toHaveBeenCalled();
    expect(q('[data-testid="r23-profile-follow"]')!.textContent).toBe("Following");
  });

  it("no follow leg from the host = no control, and followStatus is never called", async () => {
    await render(profileSheet({ follow: undefined }));
    expect(q('[data-testid="r23-profile-follow"]')).toBeNull();
    expect(followStatus).not.toHaveBeenCalled();
  });

  it("a failed status read paints no control (no unconfirmed state)", async () => {
    followStatus.mockRejectedValue(new Error("down"));
    await render(profileSheet());
    expect(q('[data-testid="r23-profile-follow"]')).toBeNull();
  });

  it("the sheet's language is the model's truth: Follow / Following only, no friendship or visibility claim, no counts", async () => {
    followStatus.mockResolvedValue(FOLLOW_ON);
    await render(profileSheet());
    const sheet = q('[data-testid="r19-person-profile"]')!;
    expect(sheet.textContent).not.toMatch(/friend/i);
    expect(sheet.textContent).not.toMatch(/can see|visibility|follower/i);
    const btn = q('[data-testid="r23-profile-follow"]')!;
    expect(btn.textContent).toBe("Following");
    expect(btn.textContent).not.toMatch(/\d/);
  });
});

/* ---------------- discovery re-site ---------------- */

function memoryItem(id: string, author: string) {
  return {
    kind: "memory" as const,
    id,
    photoUrl: null,
    photoProvenance: null,
    contextLine: `Moment ${id}`,
    authorLine: author,
    authorName: author,
    authorAvatar: avatarOf(author),
    authorUserId: `u-${id}`,
    mine: false,
    placeLabel: null,
    likeCount: 0,
    viewerLiked: false,
    viewerReposted: false,
    repostCount: 0,
    viewerSaved: false,
    commentCount: 0,
  };
}

function homeProjection(feedCount: number): HomeProjection {
  const feed = Array.from({ length: feedCount }, (_, i) =>
    memoryItem(`m${i + 1}`, `Author ${i + 1}`),
  );
  return {
    header: { ownAvatar: avatarOf("You") },
    rail: {
      self: { avatar: avatarOf("You"), hasLiveStory: false, liveStoryLabel: null },
      stories: [],
      capabilities: { canPost: true, canStory: true },
    },
    feed,
    discovery: [{ userId: "u-june", name: "June Park", avatar: avatarOf("June Park") }],
  };
}

const homeEvents = {
  openYou: () => undefined,
  openSearch: () => undefined,
  openActivity: () => undefined,
  openGraph: () => undefined,
  onShared: () => undefined,
  bearer: "tok",
};

describe("WS-23-4 R-4 - discovery interleaved into the braid, not buried", () => {
  it("discovery sits after the first braid group (first two items), with feed still below it", async () => {
    await render(<C2Home projection={homeProjection(5)} events={homeEvents as never} />);
    const feedEl = q('[data-testid="c2-feed"]')!;
    expect(feedEl).toBeTruthy();
    const children = [...feedEl.children];
    const discoveryIdx = children.findIndex(
      (el) => el.getAttribute("data-testid") === "c2-discovery",
    );
    expect(discoveryIdx).toBe(2);
    // Not after the whole feed: feed cards remain below discovery.
    const cardsBelow = children
      .slice(discoveryIdx + 1)
      .filter((el) => el.getAttribute("data-testid") === "c2-feed-memory");
    expect(cardsBelow.length).toBe(3);
    // Within the first scroll group: its index is inside the
    // first group of the composed stream, nowhere near the end.
    expect(discoveryIdx).toBeLessThan(children.length - 1);
  });

  it("discovery still renders when the feed is short (it follows what there is)", async () => {
    await render(<C2Home projection={homeProjection(1)} events={homeEvents as never} />);
    const feedEl = q('[data-testid="c2-feed"]')!;
    const children = [...feedEl.children];
    const discoveryIdx = children.findIndex(
      (el) => el.getAttribute("data-testid") === "c2-discovery",
    );
    expect(discoveryIdx).toBe(1);
    expect(q('[data-testid="c2-discovery-row"]')).toBeTruthy();
  });

  it("the discovery row keeps its semantics: Follow fires the real endpoint and re-renders from the response", async () => {
    await render(<C2Home projection={homeProjection(3)} events={homeEvents as never} />);
    const btn = q('[data-testid="c2-discovery-follow"]')!;
    expect(btn.textContent).toBe("Follow");
    await clickAsync(btn);
    expect(followUser).toHaveBeenCalledTimes(1);
    expect(followUser).toHaveBeenCalledWith("u-june", "tok");
    expect(q('[data-testid="c2-discovery-follow"]')!.textContent).toBe("Following");
  });
});
