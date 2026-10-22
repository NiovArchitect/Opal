/**
 * @vitest-environment jsdom
 *
 * Repair #21 (W-17) - the creation walkthrough pins (jsdom
 * layer; the rendered layer is the signature-gated capture):
 *
 *  The add sheet's inventory: your graphs in three tenses,
 *       photo or video, text, go live - every door one
 *       move deep.
 *  The future tense (headline): a tense door carries its
 *       tense into the ONE real graph-create flow, whose form
 *       renders the marble anchor in the tense's fire; the
 *       present tense carries its When word ("Now").
 *
 * Repair #22 (R22-E) - the founder's ruling on top of W-17:
 *  the tense stones are RETIRED ("they look like avocados to
 *  me"); the tenses are BUTTONS in the orbit button's marbled
 *  material (data-marble="sphere": the shared marble grain
 *  under each tense's own iris), named Now / Forecast /
 *  Memories. Choosing a tense opens that tense's creation
 *  panel inside the sheet, offering New graph, Photo or
 *  video, Text and Go live within the tense.
 *  Photo: the media composer serves both destinations (Story
 *       | Post) through their real endpoints.
 *  Text: a caption-only post is lawful - the text composer
 *       shares words alone through publishSocialMoment, no
 *       upload, no media gate.
 *  Go live: the server's own copy + venue search + POST; the
 *       unavailable-Places state is honest, and the manual
 *       entry exists only when the server offers it.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
  it("three tense buttons + photo, text, go live - and no explanatory copy", async () => {
    const creationPlan = vi.fn();
    await openSheet({ creationPlan });
    const sheet = q('[data-testid="c2-create-sheet"]')!;
    expect(sheet).toBeTruthy();
    const buttons = qa('[data-testid^="c2-create-tense-"]');
    expect(buttons.map((s) => s.getAttribute("data-tense"))).toEqual([
      "present",
      "future",
      "past",
    ]);
    expect(sheet.textContent).toContain("Now");
    expect(sheet.textContent).toContain("Forecast");
    expect(sheet.textContent).toContain("Memories");
    // R22-E rename sweep: the old tense names are gone from
    // the sheet's user-facing copy.
    expect(sheet.textContent).not.toContain("Ahead");
    expect(sheet.textContent).not.toContain("Settled");
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

  it("choosing a tense opens its panel; New graph carries the tense into the shell's create flow", async () => {
    const creationPlan = vi.fn();
    await openSheet({ creationPlan });
    click(q('[data-testid="c2-create-tense-future"]')!);
    // The tense panel opens INSIDE the sheet - the sheet has
    // not closed and no graph has been created yet.
    expect(creationPlan).not.toHaveBeenCalled();
    const panel = q('[data-testid="c2-create-tense-panel"]')!;
    expect(panel).toBeTruthy();
    expect(panel.getAttribute("data-tense")).toBe("future");
    expect(panel.textContent).toContain("New graph - Forecast");
    click(q('[data-testid="c2-create-tense-graph"]')!);
    expect(creationPlan).toHaveBeenCalledWith("future");
    expect(q('[data-testid="c2-create-sheet"]')).toBeNull();
    expect(whenLabelForTense("present")).toBe("Now");
    expect(whenLabelForTense("future")).toBeUndefined();
    expect(whenLabelForTense("past")).toBeUndefined();
  });

  it("without a wired creationPlan, the tense buttons do not render (no dead doors)", async () => {
    await openSheet({});
    expect(qa('[data-testid^="c2-create-tense-"]').length).toBe(0);
    expect(q('[data-testid="c2-create-photo"]')).toBeTruthy();
  });
});

describe("R22-E - marble tense buttons and the in-tense creation panel", () => {
  it("the tense buttons are buttons in the marble material - no stone shapes remain", async () => {
    await openSheet({ creationPlan: vi.fn() });
    for (const tense of ["present", "future", "past"]) {
      const btn = q(`[data-testid="c2-create-tense-${tense}"]`)!;
      expect(btn.tagName).toBe("BUTTON");
      // The marble material declaration: the shared grain seat
      // (the same data-marble the OrbMark marble seat carries).
      expect(btn.getAttribute("data-marble")).toBe("sphere");
      expect(btn.classList.contains("c2s-create-tense-btn")).toBe(true);
    }
    // The retired stone markup is gone from the sheet.
    expect(qa(".c2s-create-stone").length).toBe(0);
    expect(qa(".c2s-create-stone-name").length).toBe(0);
  });

  it("the marble material is the shared grain asset under per-tense iris (source pin)", () => {
    const css = readFileSync(resolve(__dirname, "c2shell.css"), "utf8");
    const block = css.slice(css.indexOf(".c2s-create-tense-btn {"));
    const face = block.slice(0, block.indexOf("}"));
    // Same asset OrbMark's marble seat renders - not a lookalike.
    expect(face).toContain('url("/brand/orb/opal-marble-sphere.webp")');
    // Each tense re-leads the SAME five sampled fire stops.
    expect(css).toContain(".c2s-create-tense-btn[data-tense=\"present\"]");
    expect(css).toMatch(/\[data-tense="present"\][^}]*--orb-fire-cyan\) 84%/);
    expect(css).toMatch(/\[data-tense="past"\][^}]*--orb-fire-gold\) 84%/);
    // QUIET: no animation targets the tense faces.
    const tenseCss = css.slice(
      css.indexOf(".c2s-create-tenses {"),
      css.indexOf(".c2s-create-live-light"),
    );
    expect(tenseCss).not.toMatch(/animation|@keyframes/);
  });

  it("Memories panel: photo and text doors open the real composers from inside the tense", async () => {
    await openSheet({ creationPlan: vi.fn() });
    click(q('[data-testid="c2-create-tense-past"]')!);
    const panel = q('[data-testid="c2-create-tense-panel"]')!;
    expect(panel.getAttribute("data-tense")).toBe("past");
    expect(panel.textContent).toContain("New graph - Memories");
    // Photo or video inside Memories -> the media composer.
    click(q('[data-testid="c2-create-tense-photo"]')!);
    await flush();
    expect(q('[data-testid="c2-share-composer"]')).toBeTruthy();
    expect(q('[data-testid="c2-composer-camera"]')).toBeTruthy();
    click(q('[data-testid="c2-composer-close"]')!);
    await flush();
    // Text inside Memories -> the text composer.
    await openSheet({ creationPlan: vi.fn() });
    click(q('[data-testid="c2-create-tense-past"]')!);
    click(q('[data-testid="c2-create-tense-text"]')!);
    await flush();
    expect(q('[data-testid="c2-share-composer"]')).toBeTruthy();
    expect(q('[data-testid="c2-composer-camera"]')).toBeNull();
  });

  it("every tense panel offers photo, text and go live; Back returns to the sheet top level", async () => {
    for (const tense of ["present", "future", "past"]) {
      await openSheet({ creationPlan: vi.fn() });
      click(q(`[data-testid="c2-create-tense-${tense}"]`)!);
      expect(q('[data-testid="c2-create-tense-graph"]')).toBeTruthy();
      expect(q('[data-testid="c2-create-tense-photo"]')).toBeTruthy();
      expect(q('[data-testid="c2-create-tense-text"]')).toBeTruthy();
      expect(q('[data-testid="c2-create-tense-live"]')).toBeTruthy();
      click(q('[data-testid="c2-create-tense-back"]')!);
      expect(q('[data-testid="c2-create-tense-panel"]')).toBeNull();
      expect(q('[data-testid="c2-create-photo"]')).toBeTruthy();
      // Unmount + remove for the next tense's fresh sheet.
      await act(async () => root!.unmount());
      root = null;
      host?.remove();
      host = null;
      document.body.innerHTML = "";
    }
  });

  it("go live stays reachable from inside a tense panel", async () => {
    await openSheet({ creationPlan: vi.fn() });
    click(q('[data-testid="c2-create-tense-present"]')!);
    click(q('[data-testid="c2-create-tense-live"]')!);
    await flush();
    expect(q('[data-testid="c2-go-live"]')).toBeTruthy();
  });
});

describe("W-17 - the graph-create form carries the tense (headline: future)", () => {
  it("the future tense anchors the form with a forming marble disc and a bare When", async () => {
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
    expect(anchor.textContent).toContain("Forecast");
    expect(anchor.textContent).not.toContain("Ahead");
    expect((q('[data-testid="c2-create-when"]') as HTMLInputElement).value).toBe("");
    // Typing the What names the anchor's disc.
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

  it("the past tense anchors the form as Memories (R22-E rename)", async () => {
    await render(
      <CreateFlow
        kind="plan"
        bearer="tok"
        conversations={[]}
        prefill={{
          title: "",
          participantUserIds: [],
          tense: "past",
          entry: "c2-create-past",
        }}
        onClose={() => {}}
        onCreated={() => {}}
      />,
    );
    await flush();
    const anchor = q('[data-testid="c2-create-anchor"]')!;
    expect(anchor.getAttribute("data-tense")).toBe("past");
    expect(anchor.textContent).toContain("Memories");
    expect(anchor.textContent).not.toContain("Settled");
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
    // Repair #23 (WS-23-2): publish now also carries the audience
    // segment's visibility (default friends, no audience ids) -
    // the composer's audience is real state, not a static label.
    expect(publishSocialMoment).toHaveBeenCalledWith(
      {
        caption: "Evening light on the pier.",
        media_ids: [],
        visibility: "friends",
        audience_user_ids: undefined,
      },
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
