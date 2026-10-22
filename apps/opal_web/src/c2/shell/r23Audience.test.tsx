/**
 * @vitest-environment jsdom
 *
 * Repair #23 (WS-23-2) - AUDIENCE MADE REAL, web leg.
 *
 * Pins:
 *  - the static "Audience: Friends" string is GONE from
 *    C2Home.tsx source and from the rendered composer;
 *  - the composer carries a real audience segment in the
 *    server's own moment vocabulary (friends / specific_people
 *    / private - never close_circle, which is a story/live
 *    value, not a moment value);
 *  - the segment's state is what publish sends: visibility
 *    always, audience_user_ids for the specific-people choice;
 *  - the specific-people picker reads the viewer's people
 *    projection (account-backed people only - audience ids are
 *    user ids) and invents no new endpoint;
 *  - before publish, the composer calls the audience-preview
 *    wrapper and renders the endpoint's own answer in the sheet.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const publishSocialMoment = vi.fn();
const previewSocialMomentAudience = vi.fn();
const listPeopleProjection = vi.fn();
const createTemporaryStory = vi.fn();
const uploadSocialMomentMedia = vi.fn();

vi.mock("../../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../../api/productClient")>(
    "../../api/productClient",
  );
  return {
    ...actual,
    publishSocialMoment: (...a: unknown[]) => publishSocialMoment(...a),
    previewSocialMomentAudience: (...a: unknown[]) => previewSocialMomentAudience(...a),
    listPeopleProjection: (...a: unknown[]) => listPeopleProjection(...a),
    createTemporaryStory: (...a: unknown[]) => createTemporaryStory(...a),
    uploadSocialMomentMedia: (...a: unknown[]) => uploadSocialMomentMedia(...a),
  };
});

import { C2Home } from "./C2Home";

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
  // The preview mock answers like the server: who_can_see is
  // computed from the visibility + labels it was given.
  previewSocialMomentAudience.mockImplementation(
    (attrs: { visibility: string; audience_labels?: string[] }) => {
      const who =
        attrs.visibility === "specific_people"
          ? (attrs.audience_labels ?? []).join(" + ") || "Selected people"
          : attrs.visibility === "private"
            ? "Only me"
            : "Friends · 2 people";
      return Promise.resolve({
        preview: { visibility: attrs.visibility, who_can_see: who, question: "Who can see this?" },
        question: "Who can see this?",
      });
    },
  );
  listPeopleProjection.mockResolvedValue({
    people: [
      {
        id: "maya-id",
        person_id: "maya-id",
        display_name: "Maya Torres",
        name: "Maya Torres",
        account_backed: true,
        conversation_id: null,
        last_talked_at: null,
        talk_count: 3,
        relationship_type: "close_friend",
      },
      {
        id: "jordan-id",
        person_id: "jordan-id",
        display_name: "Jordan Lee",
        name: "Jordan Lee",
        account_backed: true,
        conversation_id: null,
        last_talked_at: null,
        talk_count: 1,
        relationship_type: "friend",
      },
      {
        // A contact with no account cannot be named in an
        // audience - the picker must not offer them.
        id: "contact-only-id",
        person_id: "contact-only-id",
        display_name: "Paper Contact",
        name: "Paper Contact",
        account_backed: false,
        conversation_id: null,
        last_talked_at: null,
        talk_count: 0,
        relationship_type: null,
      },
    ],
    count: 3,
  });
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

async function openTextComposer() {
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
  click(q('[data-testid="c2-create-text"]')!);
  await flush();
  return onShared;
}

describe("WS-23-2 - audience made real", () => {
  it("the static audience string is gone from source and from the rendered composer", async () => {
    const source = readFileSync(resolve(__dirname, "C2Home.tsx"), "utf8");
    expect(source).not.toContain("Audience: Friends");
    await openTextComposer();
    const composer = q('[data-testid="c2-share-composer"]')!;
    expect(composer).toBeTruthy();
    expect(composer.textContent).not.toContain("Audience: Friends");
  });

  it("the segment speaks the server's moment vocabulary - friends, specific people, only me; never close_circle", async () => {
    await openTextComposer();
    expect(q('[data-testid="c2-composer-audience-friends"]')?.textContent).toBe("Friends");
    expect(q('[data-testid="c2-composer-audience-specific_people"]')?.textContent).toBe(
      "Specific people",
    );
    expect(q('[data-testid="c2-composer-audience-private"]')?.textContent).toBe("Only you");
    expect(q('[data-testid="c2-composer-audience-close_circle"]')).toBeNull();
    // Default state is friends, and the label rendered is the state.
    expect(
      q('[data-testid="c2-composer-audience-friends"]')!.getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("the preview wrapper is called before publish and its own answer renders in the sheet", async () => {
    await openTextComposer();
    expect(previewSocialMomentAudience).toHaveBeenCalledWith(
      { visibility: "friends", audience_user_ids: undefined, audience_labels: undefined },
      "tok",
    );
    const line = q('[data-testid="c2-composer-audience-preview"]');
    expect(line?.textContent).toBe("Who can see this? Friends · 2 people");
  });

  it("specific people: the picker offers account-backed people from the projection, and publish sends visibility + audience_user_ids", async () => {
    const onShared = await openTextComposer();
    click(q('[data-testid="c2-composer-audience-specific_people"]')!);
    await flush();
    expect(listPeopleProjection).toHaveBeenCalledWith("tok");
    expect(q('[data-testid="c2-composer-audience-person-maya-id"]')).toBeTruthy();
    expect(q('[data-testid="c2-composer-audience-person-jordan-id"]')).toBeTruthy();
    expect(q('[data-testid="c2-composer-audience-person-contact-only-id"]')).toBeNull();

    // Share is blocked until at least one person is picked.
    typeInto(q('[data-testid="c2-composer-caption"]') as HTMLInputElement, "For Maya only.");
    expect((q('[data-testid="c2-composer-share"]') as HTMLButtonElement).disabled).toBe(true);

    click(q('[data-testid="c2-composer-audience-person-maya-id"]')!);
    await flush();
    // The preview re-asks with the picked ids + labels and
    // renders the endpoint's answer.
    expect(previewSocialMomentAudience).toHaveBeenCalledWith(
      { visibility: "specific_people", audience_user_ids: ["maya-id"], audience_labels: ["Maya Torres"] },
      "tok",
    );
    expect(q('[data-testid="c2-composer-audience-preview"]')?.textContent).toBe(
      "Who can see this? Maya Torres",
    );
    expect((q('[data-testid="c2-composer-share"]') as HTMLButtonElement).disabled).toBe(false);

    click(q('[data-testid="c2-composer-share"]')!);
    await flush();
    expect(publishSocialMoment).toHaveBeenCalledWith(
      {
        caption: "For Maya only.",
        media_ids: [],
        visibility: "specific_people",
        audience_user_ids: ["maya-id"],
      },
      "tok",
    );
    expect(onShared).toHaveBeenCalled();
  });

  it("friends and private publish carry the segment's visibility and no audience ids", async () => {
    await openTextComposer();
    typeInto(q('[data-testid="c2-composer-caption"]') as HTMLInputElement, "For everyone I know.");
    click(q('[data-testid="c2-composer-share"]')!);
    await flush();
    expect(publishSocialMoment).toHaveBeenCalledWith(
      { caption: "For everyone I know.", media_ids: [], visibility: "friends", audience_user_ids: undefined },
      "tok",
    );
  });

  it("only me: publish sends visibility private", async () => {
    await openTextComposer();
    click(q('[data-testid="c2-composer-audience-private"]')!);
    await flush();
    expect(q('[data-testid="c2-composer-audience-preview"]')?.textContent).toBe(
      "Who can see this? Only me",
    );
    typeInto(q('[data-testid="c2-composer-caption"]') as HTMLInputElement, "Just for me.");
    click(q('[data-testid="c2-composer-share"]')!);
    await flush();
    expect(publishSocialMoment).toHaveBeenCalledWith(
      { caption: "Just for me.", media_ids: [], visibility: "private", audience_user_ids: undefined },
      "tok",
    );
  });
});
