/**
 * @vitest-environment jsdom
 *
 * Repair #24 (WS-2) - GRAPH-STORY POSTING, web leg.
 *
 * Before this repair the story composer could only post a person
 * story: TemporaryStory had no graph reference and its contract
 * asserted "not_graph" => true. The server path now exists
 * (TemporaryStoryPublishing graph anchor), and this suite pins the
 * client door in the C2 share composer:
 *
 *  - with the Story destination chosen and media picked, the
 *    composer offers a graph picker whose options are exactly the
 *    viewer's own plans (listOpalPlans - the server list is already
 *    scoped to plans the viewer created or participates in, so the
 *    picker can never offer a graph the author does not belong to);
 *  - picking a graph sends graph_plan_id to createTemporaryStory;
 *    picking none (the default "Just my story") sends no anchor and
 *    the person-story path is byte-identical to before;
 *  - the Post destination never shows the graph picker;
 *  - authoritativeCreateStory carries the anchor through the
 *    media-upload leg as well.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const publishSocialMoment = vi.fn();
const createTemporaryStory = vi.fn();
const uploadSocialMomentMedia = vi.fn();
const listOpalPlans = vi.fn();
const previewSocialMomentAudience = vi.fn();
const listPeopleProjection = vi.fn();

vi.mock("../../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../../api/productClient")>(
    "../../api/productClient",
  );
  return {
    ...actual,
    publishSocialMoment: (...a: unknown[]) => publishSocialMoment(...a),
    createTemporaryStory: (...a: unknown[]) => createTemporaryStory(...a),
    uploadSocialMomentMedia: (...a: unknown[]) => uploadSocialMomentMedia(...a),
    listOpalPlans: (...a: unknown[]) => listOpalPlans(...a),
    previewSocialMomentAudience: (...a: unknown[]) => previewSocialMomentAudience(...a),
    listPeopleProjection: (...a: unknown[]) => listPeopleProjection(...a),
  };
});

import { C2Home } from "./C2Home";
import { authoritativeCreateStory } from "../../opalUi/socialAuthority";

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
    preview: { who_can_see: "Friends" },
    question: "Who can see this?",
  });
  listPeopleProjection.mockResolvedValue({ people: [] });
  listOpalPlans.mockResolvedValue({
    plans: [
      { id: "plan-paddle", title: "Moonlight paddle" },
      { id: "plan-dinner", title: "Juniper dinner" },
    ],
  });
  // jsdom has no object URLs; the preview only needs a string.
  URL.createObjectURL = vi.fn(() => "blob:preview");
});

function avatarOf(name: string) {
  return {
    initials: name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
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

async function openStoryComposer() {
  const onShared = vi.fn();
  await render(
    <C2Home
      projection={baseProjection as never}
      events={
        {
          openYou: vi.fn(),
          openSearch: vi.fn(),
          openActivity: vi.fn(),
          openGraph: vi.fn(),
          onShared,
          bearer: "tok",
        } as never
      }
    />,
  );
  click(q('[data-testid="c2-stone-self"]')!);
  await flush();
  click(q('[data-testid="c2-create-photo"]')!);
  await flush();
  click(q('[data-testid="c2-composer-dest-story"]')!);
  await flush();
  // Pick a photo through the library door. (TopLayer portals to
  // document.body, so the inputs may not live under `container`.)
  const inContainer = [...container.querySelectorAll('input[type="file"]')];
  const inputs =
    inContainer.length > 0 ? inContainer : [...document.querySelectorAll('input[type="file"]')];
  const library = inputs[inputs.length - 1] as HTMLInputElement;
  const file = new File(["png-bytes"], "pier.png", { type: "image/png" });
  Object.defineProperty(library, "files", { value: [file], configurable: true });
  await act(async () => {
    library.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
  await flush();
  return onShared;
}

describe("WS-2 - graph anchor in the story composer", () => {
  it("offers exactly the viewer's own graphs, defaulting to no anchor", async () => {
    await openStoryComposer();
    expect(listOpalPlans).toHaveBeenCalledWith("tok");
    const picker = q('[data-testid="c2-composer-graph-picker"]');
    expect(picker).toBeTruthy();
    expect(q('[data-testid="c2-composer-graph-none"]')).toBeTruthy();
    expect(q('[data-testid="c2-composer-graph-plan-paddle"]')?.textContent).toContain(
      "Moonlight paddle",
    );
    expect(q('[data-testid="c2-composer-graph-plan-dinner"]')?.textContent).toContain(
      "Juniper dinner",
    );
    // Default: no graph picked.
    expect(q('[data-testid="c2-composer-graph-none"]')!.getAttribute("aria-pressed")).toBe("true");
    expect(q('[data-testid="c2-composer-graph-plan-paddle"]')!.getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("sharing with a graph picked sends graph_plan_id to the story endpoint", async () => {
    const onShared = await openStoryComposer();
    click(q('[data-testid="c2-composer-graph-plan-paddle"]')!);
    await flush();
    expect(q('[data-testid="c2-composer-graph-plan-paddle"]')!.getAttribute("aria-pressed")).toBe(
      "true",
    );
    click(q('[data-testid="c2-composer-share"]')!);
    await flush();
    expect(uploadSocialMomentMedia).toHaveBeenCalled();
    expect(createTemporaryStory).toHaveBeenCalledWith(
      {
        media_id: "media-1",
        caption: undefined,
        visibility: "friends",
        graph_plan_id: "plan-paddle",
      },
      "tok",
    );
    expect(onShared).toHaveBeenCalled();
  });

  it("sharing with no graph picked sends no anchor - the person-story path", async () => {
    await openStoryComposer();
    click(q('[data-testid="c2-composer-share"]')!);
    await flush();
    expect(createTemporaryStory).toHaveBeenCalledWith(
      {
        media_id: "media-1",
        caption: undefined,
        visibility: "friends",
        graph_plan_id: undefined,
      },
      "tok",
    );
  });

  it("the post destination never shows the graph picker", async () => {
    await openStoryComposer();
    click(q('[data-testid="c2-composer-dest-post"]')!);
    await flush();
    expect(q('[data-testid="c2-composer-graph-picker"]')).toBeNull();
  });

  it("when the viewer has no graphs the picker says so and offers no anchor", async () => {
    listOpalPlans.mockResolvedValue({ plans: [] });
    await openStoryComposer();
    const picker = q('[data-testid="c2-composer-graph-picker"]');
    expect(picker).toBeTruthy();
    expect(picker!.textContent).toContain("No graphs yet");
    expect(q('[data-testid^="c2-composer-graph-plan-"]')).toBeNull();
  });
});

describe("WS-2 - authoritativeCreateStory carries the anchor", () => {
  it("a data-image story uploads media and posts with graph_plan_id", async () => {
    const png =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    await authoritativeCreateStory({
      mediaRef: png,
      visibility: "friends",
      caption: "anchored",
      graphPlanId: "plan-paddle",
      bearer: "tok",
    });
    expect(createTemporaryStory).toHaveBeenCalledWith(
      {
        media_id: "media-1",
        visibility: "friends",
        caption: "anchored",
        graph_plan_id: "plan-paddle",
      },
      "tok",
    );
  });

  it("without a graphPlanId the wrapper sends no anchor key value", async () => {
    await authoritativeCreateStory({
      mediaRef: "/demo/moments/portrait.jpg",
      visibility: "friends",
      bearer: "tok",
    });
    expect(createTemporaryStory).toHaveBeenCalledWith(
      {
        media_ref: "/demo/moments/portrait.jpg",
        visibility: "friends",
        caption: undefined,
        graph_plan_id: undefined,
      },
      "tok",
    );
  });
});
