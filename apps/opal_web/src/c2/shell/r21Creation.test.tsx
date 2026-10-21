/**
 * @vitest-environment jsdom
 *
 * Repair #21 (W-17) - the creation walkthrough pins (jsdom
 * layer; the rendered layer is the signature-gated capture):
 *
 *  The add sheet's inventory: your graphs in three tenses as
 *       stones (told by data-tense + label, no explanatory
 *       copy), photo or video, text, go live - every door one
 *       move deep.
 *  The future stone (headline): a tense door carries its
 *       tense into the ONE real graph-create flow, whose form
 *       renders the stone anchor in the tense's fire; the
 *       present tense carries its When word ("Now").
 *  Photo: the media composer serves both destinations (Story
 *       | Post) through their real endpoints.
 *  Text: a caption-only post is lawful - the text composer
 *       shares words alone through publishSocialMoment, no
 *       upload, no media gate.
 *  Go live: the server's own copy + venue search + POST; the
 *       unavailable-Places state is honest, and the manual
 *       entry exists only when the server offers it.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const publishSocialMoment = vi.fn();
const createTemporaryStory = vi.fn();
const uploadSocialMomentMedia = vi.fn();
const getLivesGoLiveCopy = vi.fn();
const searchLivesVenues = vi.fn();
const postLivesGoLive = vi.fn();
const listRelationships = vi.fn();
const listPeople = vi.fn();

vi.mock("../../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../../api/productClient")>(
    "../../api/productClient",
  );
  return {
    ...actual,
    publishSocialMoment: (...a: unknown[]) => publishSocialMoment(...a),
    createTemporaryStory: (...a: unknown[]) => createTemporaryStory(...a),
    uploadSocialMomentMedia: (...a: unknown[]) => uploadSocialMomentMedia(...a),
    getLivesGoLiveCopy: (...a: unknown[]) => getLivesGoLiveCopy(...a),
    searchLivesVenues: (...a: unknown[]) => searchLivesVenues(...a),
    postLivesGoLive: (...a: unknown[]) => postLivesGoLive(...a),
    listRelationships: (...a: unknown[]) => listRelationships(...a),
    listPeople: (...a: unknown[]) => listPeople(...a),
  };
});

import { C2Home } from "./C2Home";
import { CreateFlow } from "./C2Shell";
import { GoLiveFlow } from "./GoLiveFlow";
import { whenLabelForTense } from "./flows2";

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
function qa(sel: string) {
  const inContainer = [...container.querySelectorAll(sel)];
  return inContainer.length > 0 ? inContainer : [...document.querySelectorAll(sel)];
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
  getLivesGoLiveCopy.mockResolvedValue({
    step: 1,
    prompt: "Where are you?",
    required: true,
    skip_allowed: false,
    default: null,
    trade: "People nearby can find you.",
    consequence_template: "Anyone can see you're at [venue].",
    reject_free_text: "We couldn't find that venue.",
    residential_reject: "That looks like a home address.",
  });
  searchLivesVenues.mockResolvedValue({
    candidates: [
      { place_id: "pier-1", name: "Oceanside Pier", formatted_address: "Oceanside, CA" },
    ],
  });
  postLivesGoLive.mockResolvedValue({ live_room: { id: "live-1" } });
  listRelationships.mockResolvedValue({ contacts: [], relationships: [] });
  listPeople.mockResolvedValue({ connected: [] });
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

async function openSheet(events: Record<string, unknown>) {
  await render(
    <C2Home projection={baseProjection as never} events={homeEvents(events) as never} />,
  );
  click(q('[data-testid="c2-stone-self"]')!);
  await flush();
}

describe("W-17 - the creation sheet inventory", () => {
  it("three tense stones + photo, text, go live - and no explanatory copy", async () => {
    const creationPlan = vi.fn();
    await openSheet({ creationPlan });
    const sheet = q('[data-testid="c2-create-sheet"]')!;
    expect(sheet).toBeTruthy();
    const stones = qa('[data-testid^="c2-create-tense-"]');
    expect(stones.map((s) => s.getAttribute("data-tense"))).toEqual([
      "present",
      "future",
      "past",
    ]);
    expect(sheet.textContent).toContain("Now");
    expect(sheet.textContent).toContain("Ahead");
    expect(sheet.textContent).toContain("Settled");
    expect(q('[data-testid="c2-create-photo"]')).toBeTruthy();
    expect(q('[data-testid="c2-create-text"]')).toBeTruthy();
    expect(q('[data-testid="c2-create-live"]')).toBeTruthy();
    // Discovery: the old explanatory smalls are gone, and the
    // sheet carries no Story/Post rows of its own (destinations
    // live inside the composer now).
    expect(sheet.textContent).not.toMatch(/Gone in a day|Stays on your Graph/);
    expect(q('[data-testid="c2-create-sheet-story"]')).toBeNull();
    expect(q('[data-testid="c2-create-sheet-post"]')).toBeNull();
  });

  it("each tense stone carries its tense into the shell's create flow", async () => {
    const creationPlan = vi.fn();
    await openSheet({ creationPlan });
    click(q('[data-testid="c2-create-tense-future"]')!);
    expect(creationPlan).toHaveBeenCalledWith("future");
    expect(q('[data-testid="c2-create-sheet"]')).toBeNull();
    expect(whenLabelForTense("present")).toBe("Now");
    expect(whenLabelForTense("future")).toBeUndefined();
    expect(whenLabelForTense("past")).toBeUndefined();
  });

  it("without a wired creationPlan, the tense stones do not render (no dead doors)", async () => {
    await openSheet({});
    expect(qa('[data-testid^="c2-create-tense-"]').length).toBe(0);
    expect(q('[data-testid="c2-create-photo"]')).toBeTruthy();
  });
});

describe("W-17 - the graph-create form carries the tense (headline: future)", () => {
  it("the future tense anchors the form with a forming stone and a bare When", async () => {
    await render(
      <CreateFlow
        kind="plan"
        bearer="tok"
        conversations={[]}
        prefill={{
          title: "",
          participantUserIds: [],
          tense: "future",
          entry: "c2-create-future",
        }}
        onClose={() => {}}
        onCreated={() => {}}
      />,
    );
    await flush();
    const anchor = q('[data-testid="c2-create-anchor"]')!;
    expect(anchor).toBeTruthy();
    expect(anchor.getAttribute("data-tense")).toBe("future");
    expect(anchor.textContent).toContain("Ahead");
    expect((q('[data-testid="c2-create-when"]') as HTMLInputElement).value).toBe("");
    // Typing the What names the anchor's stone.
    typeInto(q('[data-testid="c2-create-title"]') as HTMLInputElement, "Saturday market run");
    expect(q('[data-testid="c2-create-anchor"]')!.textContent).toContain("Saturday market run");
  });

  it("the present tense carries its When word into the form", async () => {
    await render(
      <CreateFlow
        kind="plan"
        bearer="tok"
        conversations={[]}
        prefill={{
          title: "",
          participantUserIds: [],
          tense: "present",
          whenLabel: "Now",
          entry: "c2-create-present",
        }}
        onClose={() => {}}
        onCreated={() => {}}
      />,
    );
    await flush();
    expect(q('[data-testid="c2-create-anchor"]')!.getAttribute("data-tense")).toBe("present");
    expect((q('[data-testid="c2-create-when"]') as HTMLInputElement).value).toBe("Now");
  });
});

describe("W-17 - photo and text doors", () => {
  it("the photo door opens the media composer with the Story | Post switch; Post is the default", async () => {
    await openSheet({ creationPlan: vi.fn() });
    click(q('[data-testid="c2-create-photo"]')!);
    await flush();
    expect(q('[data-testid="c2-share-composer"]')).toBeTruthy();
    expect(q('[data-testid="c2-composer-camera"]')).toBeTruthy();
    expect(q('[data-testid="c2-composer-dest-post"]')!.getAttribute("aria-pressed")).toBe("true");
    click(q('[data-testid="c2-composer-dest-story"]')!);
    expect(q('[data-testid="c2-composer-dest-story"]')!.getAttribute("aria-pressed")).toBe("true");
  });

  it("the text door shares words alone through the real publish endpoint - no upload, no media", async () => {
    const onShared = vi.fn();
    await render(
      <C2Home
        projection={baseProjection as never}
        events={homeEvents({ creationPlan: vi.fn(), onShared }) as never}
      />,
    );
    click(q('[data-testid="c2-stone-self"]')!);
    await flush();
    click(q('[data-testid="c2-create-text"]')!);
    await flush();
    expect(q('[data-testid="c2-share-composer"]')).toBeTruthy();
    // Text-first: the caption is the first step; no camera gate.
    expect(q('[data-testid="c2-composer-camera"]')).toBeNull();
    const shareBtn = q('[data-testid="c2-composer-share"]') as HTMLButtonElement;
    expect(shareBtn.disabled).toBe(true);
    typeInto(q('[data-testid="c2-composer-caption"]') as HTMLInputElement, "Evening light on the pier.");
    expect((q('[data-testid="c2-composer-share"]') as HTMLButtonElement).disabled).toBe(false);
    click(q('[data-testid="c2-composer-share"]')!);
    await flush();
    expect(uploadSocialMomentMedia).not.toHaveBeenCalled();
    expect(publishSocialMoment).toHaveBeenCalledWith(
      { caption: "Evening light on the pier.", media_ids: [] },
      "tok",
    );
    expect(onShared).toHaveBeenCalled();
  });
});

describe("W-17 - go live", () => {
  it("search, pick, consequence, go live - the real endpoints end to end", async () => {
    const onLive = vi.fn();
    await render(<GoLiveFlow bearer="tok" onClose={() => {}} onLive={onLive} />);
    await flush();
    expect(q('[data-testid="c2-go-live"]')!.textContent).toContain("Where are you?");
    typeInto(q('[data-testid="c2-go-live-search"]') as HTMLInputElement, "pier");
    await flush(500);
    expect(searchLivesVenues).toHaveBeenCalledWith("pier", "tok");
    click(q('[data-testid="c2-go-live-venue"]')!);
    expect(q('[data-testid="c2-go-live-consequence"]')!.textContent).toBe(
      "Anyone can see you're at Oceanside Pier.",
    );
    click(q('[data-testid="c2-go-live-submit"]')!);
    await flush();
    expect(postLivesGoLive).toHaveBeenCalledWith(
      {
        place_id: "pier-1",
        name: "Oceanside Pier",
        venue_name: "Oceanside Pier",
        audience: "friends",
      },
      "tok",
    );
    expect(onLive).toHaveBeenCalled();
  });

  it("when Places is unavailable the surface says so and offers the manual entry only as the server offers it", async () => {
    searchLivesVenues.mockResolvedValue({
      candidates: [],
      empty: true,
      places_unavailable: true,
      message: "GOOGLE_PLACES_API_KEY missing",
      manual_testing_available: true,
      manual_testing_label: "Enter venue manually (testing)",
    });
    const onLive = vi.fn();
    await render(<GoLiveFlow bearer="tok" onClose={() => {}} onLive={onLive} />);
    await flush();
    typeInto(q('[data-testid="c2-go-live-search"]') as HTMLInputElement, "pier");
    await flush(500);
    expect(q('[data-testid="c2-go-live-unavailable"]')!.textContent).toContain(
      "GOOGLE_PLACES_API_KEY missing",
    );
    // The server's manual rule is name AND city - the pick is
    // not armed until both are written.
    typeInto(q('[data-testid="c2-go-live-manual"]') as HTMLInputElement, "Oceanside Pier");
    expect(q('[data-testid="c2-go-live-submit"]')).toBeNull();
    typeInto(q('[data-testid="c2-go-live-manual-city"]') as HTMLInputElement, "Oceanside");
    click(q('[data-testid="c2-go-live-submit"]')!);
    await flush();
    expect(postLivesGoLive).toHaveBeenCalledWith(
      expect.objectContaining({
        venue_name: "Oceanside Pier",
        city: "Oceanside",
        provisional: true,
        allow_provisional: true,
      }),
      "tok",
    );
    expect(onLive).toHaveBeenCalled();
  });
});
