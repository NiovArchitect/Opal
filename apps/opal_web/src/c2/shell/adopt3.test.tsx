/**
 * @vitest-environment jsdom
 *
 * Repair #18 adoption wave 3 - web regressions:
 *  ST-C archive renders the refreshed own-moments projection, counts
 *      equal the records, opening an item shows the same record.
 *  ST-D one search: grouped plans/chats/people, chat + people rows
 *      openable, intentions group only when intentions exist, and
 *      NO memory group ever (dependency not built).
 *  ST-H voice-note composer: record shows a visibly active state,
 *      review plays the recording, send goes through the real client.
 *  ST-I Listen: provider off -> control absent from the DOM; provider
 *      on -> the exact displayed string is handed to the provider;
 *      stoppable; unmount stops playback.
 *  4.C11 library: Made-by-Opal shelf lists real artifacts with the
 *      provenance label and deletes for real; media shelf lists the
 *      owner's own media.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMomentsArchive = vi.fn();
const listMyArtifacts = vi.fn();
const deleteMyArtifact = vi.fn();
const sendVoiceNote = vi.fn();
const fetchVoiceStatus = vi.fn();
const speakApprovedText = vi.fn();

vi.mock("../../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../../api/productClient")>(
    "../../api/productClient",
  );
  return {
    ...actual,
    fetchMomentsArchive: (...a: unknown[]) => fetchMomentsArchive(...a),
    listMyArtifacts: (...a: unknown[]) => listMyArtifacts(...a),
    deleteMyArtifact: (...a: unknown[]) => deleteMyArtifact(...a),
    sendVoiceNote: (...a: unknown[]) => sendVoiceNote(...a),
    fetchVoiceStatus: (...a: unknown[]) => fetchVoiceStatus(...a),
    speakApprovedText: (...a: unknown[]) => speakApprovedText(...a),
  };
});

import { LibraryDestination, MomentsArchive, VoiceNoteControl } from "./adopt3";
import { ListenButton, resetListenStatusCache } from "../../opalUi/c1/ListenButton";
import { ThreadShell } from "../../opalUi/c1/C1Surfaces";
import { SearchDestination } from "./C2Shell";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;

async function render(node: React.ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(node);
  });
  // Flush the effects' promises.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function click(el: Element) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}


function typeQuery(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )!.set!;
  setter.call(input, value);
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
}

beforeEach(() => {
  fetchMomentsArchive.mockReset();
  listMyArtifacts.mockReset();
  deleteMyArtifact.mockReset();
  sendVoiceNote.mockReset();
  fetchVoiceStatus.mockReset();
  speakApprovedText.mockReset();
  resetListenStatusCache();
});

afterEach(async () => {
  if (root) {
    await act(async () => root!.unmount());
  }
  host?.remove();
  host = null;
  root = null;
});

const ARCHIVE = {
  posts: [
    {
      id: "post-2",
      caption: "Second post",
      media_ids: ["m2"],
      media_urls: ["/api/v1/product/social-moments/media/m2"],
      created_at: "2026-10-18T10:00:00Z",
    },
    {
      id: "post-1",
      caption: "First post",
      media_ids: [],
      media_urls: [],
      created_at: "2026-10-17T10:00:00Z",
    },
  ],
  stories: [
    {
      id: "story-1",
      caption: "Live story",
      media_ref: "/api/v1/product/social-moments/media/m9",
      created_at: "2026-10-18T11:00:00Z",
    },
  ],
  count: 3,
};

describe("ST-C moments archive", () => {
  it("renders the refreshed projection newest first; count equals the records; opening shows the same record", async () => {
    fetchMomentsArchive.mockResolvedValue(ARCHIVE);
    await render(<MomentsArchive bearer="tok" onBack={() => undefined} />);
    const items = host!.querySelectorAll('[data-testid="c2-archive-item"]');
    expect(items.length).toBe(3);
    expect(host!.querySelector('[data-testid="c2-archive-count"]')?.textContent).toContain("3 moments");
    // Newest first: the live story (11:00) precedes the second post (10:00).
    expect(items[0].textContent).toContain("Live story");
    expect(items[1].textContent).toContain("Second post");
    await click(items[1]);
    const detail = host!.querySelector('[data-testid="c2-archive-detail"]');
    expect(detail?.textContent).toContain("Second post");
    expect(detail?.querySelector("img")?.getAttribute("src")).toBe(
      "/api/v1/product/social-moments/media/m2",
    );
  });

  it("empty archive is an honest empty state", async () => {
    fetchMomentsArchive.mockResolvedValue({ posts: [], stories: [], count: 0 });
    await render(<MomentsArchive bearer="tok" onBack={() => undefined} />);
    expect(host!.querySelector('[data-testid="c2-archive-empty"]')).not.toBeNull();
    expect(host!.querySelectorAll('[data-testid="c2-archive-item"]').length).toBe(0);
  });
});

describe("4.C11 your library", () => {
  it("Made-by-Opal shelf lists artifacts with provenance and deletes for real; media shelf lists own media", async () => {
    fetchMomentsArchive.mockResolvedValue(ARCHIVE);
    listMyArtifacts.mockResolvedValue({
      artifacts: [
        {
          artifact_id: "art-1",
          kind: "event_plan",
          title: "Dinner plan",
          subtitle: "Sat 7pm",
          share_url: "https://example.test/share/artifacts/tok1",
        },
      ],
    });
    deleteMyArtifact.mockResolvedValue({ deleted: true });
    await render(<LibraryDestination bearer="tok" onBack={() => undefined} />);
    const shelf = host!.querySelector('[data-testid="c2-library-made-by-opal"]');
    expect(shelf?.textContent).toContain("Dinner plan");
    expect(shelf?.textContent).toContain("Made by Opal");
    expect(host!.querySelectorAll('[data-testid="c2-library-media-item"]').length).toBe(2);
    const deleteBtn = [...shelf!.querySelectorAll("button")].find((b) => b.textContent === "Delete");
    await click(deleteBtn!);
    expect(deleteMyArtifact).toHaveBeenCalledWith("art-1", "tok");
  });
});

describe("ST-I Listen", () => {
  it("provider off: the control is ABSENT from the DOM", async () => {
    fetchVoiceStatus.mockResolvedValue({ tts_configured: false, transcription_configured: false });
    await render(<ListenButton text="Dinner is set for Saturday." bearer="tok" />);
    expect(host!.querySelector('[data-testid="listen-play"]')).toBeNull();
    expect(host!.querySelector('[data-testid="listen-stop"]')).toBeNull();
  });

  it("provider on: speaks exactly the displayed text; stoppable; unmount stops playback", async () => {
    fetchVoiceStatus.mockResolvedValue({ tts_configured: true, transcription_configured: false });
    speakApprovedText.mockResolvedValue({ audio_url: "https://example.test/audio.mp3", text: "Dinner is set for Saturday." });
    const pause = vi.fn();
    const play = vi.fn().mockResolvedValue(undefined);
    const AudioMock = vi.fn().mockImplementation(() => ({ play, pause, onended: null }));
    vi.stubGlobal("Audio", AudioMock);
    await render(<ListenButton text="Dinner is set for Saturday." bearer="tok" />);
    const btn = host!.querySelector('[data-testid="listen-play"]');
    expect(btn).not.toBeNull();
    await click(btn!);
    // Spoken-text equality: the exact displayed string, approved.
    expect(speakApprovedText).toHaveBeenCalledWith(
      { text: "Dinner is set for Saturday.", approved: true },
      "tok",
    );
    expect(play).toHaveBeenCalled();
    const stopBtn = host!.querySelector('[data-testid="listen-stop"]');
    expect(stopBtn).not.toBeNull();
    // Stop on surface exit: unmount pauses the audio.
    await act(async () => root!.unmount());
    root = null;
    expect(pause).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe("ST-H voice note in a thread", () => {
  it("a voice message renders a player; the transcript is its caption", async () => {
    await render(
      <ThreadShell
        name="Maya"
        initials="M"
        messages={[
          {
            id: "vn-1",
            authorKind: "person",
            own: true,
            body: "Meet at seven",
            audioUrl: "/share/voice-audio/tok",
            messageType: "voice_note",
          },
          {
            id: "vn-2",
            authorKind: "person",
            body: "",
            audioUrl: "/share/voice-audio/tok2",
            messageType: "voice_note",
          },
        ]}
        plansById={new Map()}
        composerPlaceholder="Message Maya"
        onSend={() => undefined}
      />,
    );
    const players = host!.querySelectorAll('[data-testid="voice-note-player"]');
    expect(players.length).toBe(2);
    expect(players[0].getAttribute("src")).toBe("/share/voice-audio/tok");
    const transcripts = host!.querySelectorAll('[data-testid="voice-note-transcript"]');
    // Only the note WITH a transcript shows one - no claim for the other.
    expect(transcripts.length).toBe(1);
    expect(transcripts[0].textContent).toBe("Meet at seven");
  });

  it("composer: record shows an active recording state, review plays it back, send uses the real client", async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] };
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });
    let recorder: FakeRecorder | null = null;
    class FakeRecorder {
      mimeType = "audio/webm";
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      constructor() {
        recorder = this;
      }
      start() {}
      stop() {
        this.ondataavailable?.({ data: new Blob(["audio-bytes"], { type: "audio/webm" }) });
        this.onstop?.();
      }
    }
    vi.stubGlobal("MediaRecorder", FakeRecorder);
    vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:review" });
    sendVoiceNote.mockResolvedValue({
      message: { id: "vn-9" },
      transcript: null,
      transcription_state: "none",
      origin: "created",
    });
    const onSent = vi.fn();
    await render(<VoiceNoteControl conversationId="conv-1" bearer="tok" onSent={onSent} />);
    await click(host!.querySelector('[data-testid="c2-voice-record"]')!);
    expect(host!.querySelector('[data-testid="c2-voice-recording"]')?.textContent).toContain("Recording");
    await click(host!.querySelector('[data-testid="c2-voice-stop"]')!);
    const review = host!.querySelector('[data-testid="c2-voice-review-player"]');
    expect(review).not.toBeNull();
    expect(review!.getAttribute("src")).toBe("blob:review");
    expect(recorder).not.toBeNull();
    await click(host!.querySelector('[data-testid="c2-voice-send"]')!);
    expect(sendVoiceNote).toHaveBeenCalledTimes(1);
    const [convId, attrs] = sendVoiceNote.mock.calls[0] as [string, { content_type?: string; audio_base64: string }];
    expect(convId).toBe("conv-1");
    expect(attrs.content_type).toBe("audio/webm");
    expect(attrs.audio_base64.length).toBeGreaterThan(0);
    expect(onSent).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe("ST-D one search", () => {
  it("groups plans, chats, people; every row openable; no intentions header without intentions; no memory group ever", async () => {
    const onOpenChat = vi.fn();
    const onOpenGraph = vi.fn();
    await render(
      <SearchDestination
        plans={[{ id: "p1", title: "Dinner with Maya", status: "agreed", time_label: "Sat 7pm" } as never]}
        conversations={[
          {
            id: "c1",
            title: "Maya Chen",
            preview: "Dinner sounds good",
            updated_at: "2026-10-18T09:00:00Z",
            peers: [{ id: "u-maya", display_name: "Maya Chen", handle: "maya" }],
          } as never,
        ]}
        onClose={() => undefined}
        onOpenGraph={onOpenGraph}
        onOpenChat={onOpenChat}
      />,
    );
    const input = document.querySelector('[data-testid="c2-search-input"]') as HTMLInputElement;
    await act(async () => {
      typeQuery(input, "maya");
    });
    expect(document.querySelector('[data-testid="c2-search-group-plans"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="c2-search-group-chats"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="c2-search-group-people"]')).not.toBeNull();
    // Intentions exist in no store on this tip -> no group header.
    expect(document.querySelector('[data-testid="c2-search-group-intentions"]')).toBeNull();
    // The memory group never ships (Soul+Memory dependency).
    expect(document.body.textContent).not.toContain("Memory");
    // Chat rows are openable to the real thread (entry-13 limitation closed).
    await click(document.querySelector('[data-testid="c2-search-chat"]')!);
    expect(onOpenChat).toHaveBeenCalledWith("c1");
    await click(document.querySelector('[data-testid="c2-search-person"]')!);
    expect(onOpenChat).toHaveBeenCalledWith("c1");
    await click(document.querySelector('[data-testid="c2-search-plan"]')!);
    expect(onOpenGraph).toHaveBeenCalledWith("p1");
  });

  it("intentions group renders only when intentions exist in the store", async () => {
    await render(
      <SearchDestination
        plans={[]}
        conversations={[]}
        intentions={[{ id: "i1", title: "See Maya every month", personName: "Maya Chen" }]}
        onClose={() => undefined}
        onOpenGraph={() => undefined}
        onOpenChat={() => undefined}
      />,
    );
    const input = document.querySelector('[data-testid="c2-search-input"]') as HTMLInputElement;
    await act(async () => {
      typeQuery(input, "maya");
    });
    const group = document.querySelector('[data-testid="c2-search-group-intentions"]');
    expect(group).not.toBeNull();
    expect(group!.textContent).toContain("See Maya every month");
  });
});
