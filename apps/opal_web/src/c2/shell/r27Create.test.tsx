/**
 * @vitest-environment jsdom
 *
 * Repair #27 (W27-5 + W27-13) - Create flow pins:
 *
 *  (a) PHOTO IN CREATE: the graph-create form offers the REAL
 *      photo attach (mediaAcquisition - the same acquire path
 *      GraphCreateFlow uses, native bridge first, browser file
 *      input as fallback). The picked photo previews in the
 *      panel, can be removed, and on submit it uploads through
 *      uploadSocialMomentMedia and rides createGraphPlan as
 *      media_id - the field the server's graph-create already
 *      validates (ownership) and stores in plan alignment.
 *      Trips get NO photo control: createTrip has no media
 *      field, so a trip photo button would be a fake attach.
 *  (b) GRACEFUL EXIT: the form's X steps back ONE level when
 *      depth exists beneath it (onBack - the Create sheet's
 *      tense panel it came from), closes outright only at the
 *      top level (onClose), and when the user has entered
 *      content a discard sheet in the app's own sheet-confirm
 *      pattern (the Graphs "Drop this plan?" species) guards
 *      the exit - never on an untouched / prefill-only form.
 *      The Home Create sheet mirrors the depth law: its new X
 *      and its scrim step back from the tense panel to the
 *      sheet's top level before they may close the sheet.
 *  (c) SCROLL + TAP INTEGRITY (W27-13): CSS source pins - the
 *      sheet material is height-bounded and scrolls internally;
 *      the create flow pins its header (the X) and makes its
 *      body the scrollport, so every control stays reachable.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createGraphPlan = vi.fn();
const createTrip = vi.fn();
const uploadSocialMomentMedia = vi.fn();
const listRelationships = vi.fn();
const listPeople = vi.fn();
const acquireMedia = vi.fn();

vi.mock("../../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../../api/productClient")>(
    "../../api/productClient",
  );
  return {
    ...actual,
    createGraphPlan: (...a: unknown[]) => createGraphPlan(...a),
    createTrip: (...a: unknown[]) => createTrip(...a),
    uploadSocialMomentMedia: (...a: unknown[]) => uploadSocialMomentMedia(...a),
    listRelationships: (...a: unknown[]) => listRelationships(...a),
    listPeople: (...a: unknown[]) => listPeople(...a),
  };
});

vi.mock("../../mediaAcquisition", () => ({
  acquireMedia: (...a: unknown[]) => acquireMedia(...a),
  mediaKindFromMime: (mime: string) =>
    mime.startsWith("video/") ? "video" : mime.startsWith("image/") ? "photo" : "document",
  validateAttachmentFile: () => ({ ok: true }),
  MAX_ATTACH_BYTES: 10 * 1024 * 1024,
}));

import { C2Home } from "./C2Home";
import { CreateFlow } from "./C2Shell";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PHOTO_DATA_URL = "data:image/jpeg;base64,QUJD"; // "ABC"

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
function click(el: Element | null) {
  act(() => {
    el!.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
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
  createGraphPlan.mockResolvedValue({ plan: { id: "p-new" }, participants: [] });
  createTrip.mockResolvedValue({ trip: { id: "t-new" } });
  uploadSocialMomentMedia.mockResolvedValue({ media: { id: "media-42" } });
  listRelationships.mockResolvedValue({ contacts: [], relationships: [] });
  listPeople.mockResolvedValue({ connected: [] });
  acquireMedia.mockResolvedValue({
    status: "ok",
    request_id: "req-1",
    source: "photo_library",
    initiating_surface: "graph_create",
    asset: {
      mime_type: "image/jpeg",
      filename: "pier.jpg",
      byte_size: 3,
      preview_url: PHOTO_DATA_URL,
    },
  });
});

function form(extra: Record<string, unknown> = {}) {
  return (
    <CreateFlow
      kind="plan"
      bearer="tok"
      conversations={[]}
      onClose={() => {}}
      onCreated={() => {}}
      {...extra}
    />
  );
}

describe("W27-5a - photo in Create (plan/idea, the real media path)", () => {
  it("offers photo attach; picking previews the photo in the panel via acquireMedia (graph_create surface)", async () => {
    await render(form());
    await flush();
    const add = q('[data-testid="c2-create-photo-add"]');
    expect(add).toBeTruthy();
    click(add);
    await flush();
    expect(acquireMedia).toHaveBeenCalledTimes(1);
    const opts = acquireMedia.mock.calls[0][0] as Record<string, unknown>;
    expect(opts.source).toBe("photo_library");
    expect(opts.initiating_surface).toBe("graph_create");
    const preview = q('[data-testid="c2-create-photo-preview"]') as HTMLImageElement;
    expect(preview).toBeTruthy();
    expect(preview.getAttribute("src")).toBe(PHOTO_DATA_URL);
  });

  it("the attached photo can be removed before creating - and then nothing uploads", async () => {
    const onCreated = vi.fn();
    await render(form({ onCreated }));
    await flush();
    click(q('[data-testid="c2-create-photo-add"]'));
    await flush();
    expect(q('[data-testid="c2-create-photo-preview"]')).toBeTruthy();
    click(q('[data-testid="c2-create-photo-remove"]'));
    await flush();
    expect(q('[data-testid="c2-create-photo-preview"]')).toBeNull();
    expect(q('[data-testid="c2-create-photo-add"]')).toBeTruthy();
    typeInto(q('[data-testid="c2-create-title"]') as HTMLInputElement, "Pier morning");
    click(q('[data-testid="c2-create-submit"]'));
    await flush();
    expect(uploadSocialMomentMedia).not.toHaveBeenCalled();
    expect(createGraphPlan).toHaveBeenCalledTimes(1);
    expect((createGraphPlan.mock.calls[0][0] as Record<string, unknown>).media_id).toBeUndefined();
    expect(onCreated).toHaveBeenCalled();
  });

  it("submit uploads the photo through the moment media store and the created plan carries its media_id", async () => {
    const onCreated = vi.fn();
    await render(form({ onCreated }));
    await flush();
    typeInto(q('[data-testid="c2-create-title"]') as HTMLInputElement, "Pier morning");
    click(q('[data-testid="c2-create-photo-add"]'));
    await flush();
    click(q('[data-testid="c2-create-submit"]'));
    await flush();
    expect(uploadSocialMomentMedia).toHaveBeenCalledWith(
      { base64: "QUJD", mime_type: "image/jpeg" },
      "tok",
    );
    expect(createGraphPlan).toHaveBeenCalledTimes(1);
    const attrs = createGraphPlan.mock.calls[0][0] as Record<string, unknown>;
    expect(attrs.title).toBe("Pier morning");
    expect(attrs.media_id).toBe("media-42");
    expect(onCreated).toHaveBeenCalled();
  });

  it("a failed upload keeps the form, the title and the photo - no plan is created, no fake success", async () => {
    uploadSocialMomentMedia.mockRejectedValue(new Error("store down"));
    const onCreated = vi.fn();
    await render(form({ onCreated }));
    await flush();
    typeInto(q('[data-testid="c2-create-title"]') as HTMLInputElement, "Pier morning");
    click(q('[data-testid="c2-create-photo-add"]'));
    await flush();
    click(q('[data-testid="c2-create-submit"]'));
    await flush();
    expect(createGraphPlan).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
    expect(q('[data-testid="c2-create-flow"]')).toBeTruthy();
    expect((q('[data-testid="c2-create-title"]') as HTMLInputElement).value).toBe("Pier morning");
    expect(q('[data-testid="c2-create-photo-preview"]')).toBeTruthy();
    expect(document.querySelector('[role="alert"]')).toBeTruthy();
  });

  it("a cancelled pick changes nothing - no preview, no error nag", async () => {
    acquireMedia.mockResolvedValue({
      status: "cancelled",
      request_id: "req-2",
      source: "photo_library",
      initiating_surface: "graph_create",
    });
    await render(form());
    await flush();
    click(q('[data-testid="c2-create-photo-add"]'));
    await flush();
    expect(q('[data-testid="c2-create-photo-preview"]')).toBeNull();
    expect(q('[data-testid="c2-create-photo-add"]')).toBeTruthy();
  });

  it("trips offer NO photo control - createTrip has no media field, so there is nothing honest to attach to", async () => {
    await render(
      <CreateFlow
        kind="trip"
        bearer="tok"
        conversations={[]}
        onClose={() => {}}
        onCreated={() => {}}
      />,
    );
    await flush();
    expect(q('[data-testid="c2-create-photo-add"]')).toBeNull();
    expect(q('[data-testid="c2-create-photo"]')).toBeNull();
  });
});

describe("W27-5b - graceful exit: X steps back one level, discards only real work, only with a confirm", () => {
  it("clean form at depth: X steps back to the level beneath (onBack), never all the way out", async () => {
    const onBack = vi.fn();
    const onClose = vi.fn();
    await render(form({ onBack, onClose }));
    await flush();
    click(q('[data-testid="c2-create-close"]'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(q('[data-testid="c2-create-discard"]')).toBeNull();
  });

  it("clean form at the top level: X closes the whole flow", async () => {
    const onClose = vi.fn();
    await render(form({ onClose }));
    await flush();
    click(q('[data-testid="c2-create-close"]'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(q('[data-testid="c2-create-discard"]')).toBeNull();
  });

  it("prefill alone is not the user's work: a seeded form exits with no nag", async () => {
    const onBack = vi.fn();
    const onClose = vi.fn();
    await render(
      form({
        onBack,
        onClose,
        prefill: {
          title: "Beach cleanup",
          participantUserIds: [],
          location: "The pier",
          tense: "present",
          whenLabel: "Now",
          entry: "c2-create-present",
        },
      }),
    );
    await flush();
    click(q('[data-testid="c2-create-close"]'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(q('[data-testid="c2-create-discard"]')).toBeNull();
  });

  it("dirty form at depth: X arms the discard sheet; Keep writing returns to the intact form; Discard steps back one level", async () => {
    const onBack = vi.fn();
    const onClose = vi.fn();
    await render(form({ onBack, onClose }));
    await flush();
    typeInto(q('[data-testid="c2-create-title"]') as HTMLInputElement, "Half-written plan");
    click(q('[data-testid="c2-create-close"]'));
    // Nothing is lost yet - the confirm is up, the exits have not fired.
    expect(q('[data-testid="c2-create-discard"]')).toBeTruthy();
    expect(onBack).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    click(q('[data-testid="c2-create-discard-keep"]'));
    expect(q('[data-testid="c2-create-discard"]')).toBeNull();
    expect((q('[data-testid="c2-create-title"]') as HTMLInputElement).value).toBe(
      "Half-written plan",
    );
    click(q('[data-testid="c2-create-close"]'));
    click(q('[data-testid="c2-create-discard-confirm"]'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("dirty form at the top level: Discard closes the whole flow (and only then)", async () => {
    const onClose = vi.fn();
    await render(form({ onClose }));
    await flush();
    typeInto(q('[data-testid="c2-create-title"]') as HTMLInputElement, "Half-written plan");
    click(q('[data-testid="c2-create-close"]'));
    expect(onClose).not.toHaveBeenCalled();
    click(q('[data-testid="c2-create-discard-confirm"]'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("an attached photo alone counts as entered content - exiting asks before losing it", async () => {
    const onClose = vi.fn();
    await render(form({ onClose }));
    await flush();
    click(q('[data-testid="c2-create-photo-add"]'));
    await flush();
    click(q('[data-testid="c2-create-close"]'));
    expect(q('[data-testid="c2-create-discard"]')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("picking a person counts as entered content", async () => {
    const onClose = vi.fn();
    const conversations = [
      {
        id: "c-zoe",
        title: "Zoe Zephyr",
        preview: "later",
        updated_at: "2026-10-19T19:00:00Z",
        latest_server_seq: 3,
        peers: [{ id: "u-zoe", display_name: "Zoe Zephyr", handle: "zoe" }],
        unread_count: 0,
        next_plan: null,
      },
    ];
    await render(form({ onClose, conversations }));
    await flush();
    const row = q('[data-testid="c2-create-who-row"]');
    expect(row).toBeTruthy();
    click(row);
    click(q('[data-testid="c2-create-close"]'));
    expect(q('[data-testid="c2-create-discard"]')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("W27-5b - the Create sheet's own depth (Home): X and scrim step back before they close", () => {
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
      creationPlan: vi.fn(),
      ...extra,
    };
  }
  async function openSheet(extra: Record<string, unknown> = {}) {
    await render(
      <C2Home projection={baseProjection as never} events={homeEvents(extra) as never} />,
    );
    click(q('[data-testid="c2-stone-self"]')!);
    await flush();
  }

  it("X at the tense panel returns to the sheet's top level - the sheet stays open; X at the top closes it", async () => {
    await openSheet();
    click(q('[data-testid="c2-create-tense-future"]')!);
    expect(q('[data-testid="c2-create-tense-panel"]')).toBeTruthy();
    click(q('[data-testid="c2-create-sheet-close"]'));
    expect(q('[data-testid="c2-create-tense-panel"]')).toBeNull();
    expect(q('[data-testid="c2-create-sheet"]')).toBeTruthy();
    expect(q('[data-testid="c2-create-photo"]')).toBeTruthy();
    click(q('[data-testid="c2-create-sheet-close"]'));
    expect(q('[data-testid="c2-create-sheet"]')).toBeNull();
  });

  it("a tap on the scrim at the tense panel steps back one level, not out of Create entirely", async () => {
    await openSheet();
    click(q('[data-testid="c2-create-tense-present"]')!);
    expect(q('[data-testid="c2-create-tense-panel"]')).toBeTruthy();
    click(q('[data-testid="c2-create-sheet"]'));
    expect(q('[data-testid="c2-create-tense-panel"]')).toBeNull();
    expect(q('[data-testid="c2-create-sheet"]')).toBeTruthy();
    click(q('[data-testid="c2-create-sheet"]'));
    expect(q('[data-testid="c2-create-sheet"]')).toBeNull();
  });

  it("a shell return signal reopens the sheet AT its tense panel (the form's step-back landing)", async () => {
    await render(
      <C2Home
        projection={baseProjection as never}
        events={homeEvents({ createSheetReturn: { tense: "future", nonce: 7 } }) as never}
      />,
    );
    await flush();
    expect(q('[data-testid="c2-create-sheet"]')).toBeTruthy();
    const panel = q('[data-testid="c2-create-tense-panel"]');
    expect(panel).toBeTruthy();
    expect(panel!.getAttribute("data-tense")).toBe("future");
  });
});

describe("W27-13 - scroll + tap integrity (CSS source pins)", () => {
  const css = readFileSync(resolve(__dirname, "c2shell.css"), "utf8");
  function block(selector: string): string {
    const at = css.indexOf(selector);
    expect(at).toBeGreaterThan(-1);
    const rest = css.slice(at);
    return rest.slice(0, rest.indexOf("}"));
  }

  it("the sheet material is height-bounded and scrolls inside itself, so no sheet content is unreachable", () => {
    const sheet = block(".c2s-sheet {");
    expect(sheet).toMatch(/max-height:/);
    expect(sheet).toMatch(/overflow-y:\s*auto/);
  });

  it("the create flow pins its header (the X) and scrolls its body end to end", () => {
    const flow = block(".c2s-create-flow {");
    expect(flow).toMatch(/display:\s*flex/);
    expect(flow).toMatch(/flex-direction:\s*column/);
    const top = block(".c2s-create-flow .c2s-entry-top {");
    expect(top).toMatch(/flex:\s*none/);
    const body = block(".c2s-create-flow .c2s-entry-body {");
    expect(body).toMatch(/overflow-y:\s*auto/);
    expect(body).toMatch(/min-height:\s*0/);
    expect(body).toMatch(/flex:\s*1/);
  });

  it("the shell wires the step-back: CreateFlow receives onBack only from the tense entry (source pin)", () => {
    const shell = readFileSync(resolve(__dirname, "C2Shell.tsx"), "utf8");
    expect(shell).toContain("onBack");
    expect(shell).toContain("createSheetReturn");
    expect(shell).toContain("uploadSocialMomentMedia");
    expect(shell).toContain("acquireMedia");
  });
});
