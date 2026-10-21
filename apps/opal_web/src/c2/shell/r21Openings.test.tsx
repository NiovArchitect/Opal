/**
 * @vitest-environment jsdom
 *
 * Repair #21 - cluster W-8..W-11 pins (jsdom layer; the rendered
 * layer is the signature-gated capture set):
 *
 *  W-9  Flows first paint is a DISTINCT composition: Moment
 *       Stones (state fire, living-graph order) + the braided
 *       stream + occasions + the Know Me? Trivia living card -
 *       and NONE of Center's opening markers. The face-circle
 *       story rail is disposed, not reskinned.
 *  W-9  Trivia question scope: questions are proposed ONLY from
 *       identity-resolved celebrations and the viewer's own
 *       wallet facts - never invented, never about strangers.
 *  W-10 the pad says where you are: exactly one slot (or the
 *       center orb) carries data-active per surface.
 *  W-11 Center narration absence: no calm line, no explainer
 *       card; controls remain.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { C2Shell } from "./C2Shell";
import { C2Home } from "./C2Home";
import { C2CenterOpening } from "./C2CenterOpening";
import { buildTriviaQuestions, occasionsFromCelebrations } from "./shellData";
import { saveProfile } from "../../api/productClient";

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

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  host = null;
  root = null;
  document.body.innerHTML = "";
  localStorage.clear();
  sessionStorage.clear();
});

function avatarOf(name: string) {
  return { initials: name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() };
}
function click(el: Element) {
  act(() => {
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
}
async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

const homeProjection = {
  header: { ownAvatar: avatarOf("Sam Rivera") },
  rail: {
    self: { avatar: avatarOf("Sam Rivera"), hasLiveStory: true, liveStoryLabel: "Live now", story: null },
    stories: [
      {
        id: "s1", personName: "Maya Chen", avatar: avatarOf("Maya Chen"),
        mediaUrl: null, caption: null, storyCount: 1, seen: false,
        stoneState: "happening" as const,
      },
      {
        id: "s2", personName: "June Park", avatar: avatarOf("June Park"),
        mediaUrl: null, caption: null, storyCount: 2, seen: false,
        stoneState: "loved" as const,
      },
    ],
    capabilities: { canPost: true, canStory: true },
  },
  feed: [
    {
      kind: "memory" as const, id: "m1", photoUrl: null, photoProvenance: null,
      contextLine: "Golden hour at the bay", authorLine: "Maya Chen",
      authorName: "Maya Chen", authorAvatar: avatarOf("Maya Chen"),
      likeCount: 3, viewerLiked: false,
    },
  ],
  feedError: null,
  occasions: [
    { id: "o1", personName: "Maya Chen", kindLabel: "Birthday", dateLabel: "Oct 23", daysUntil: 3, wouldLove: null, actionLabel: "Start a plan for Maya" },
  ],
  trivia: {
    questions: [
      {
        id: "q1", subjectUserId: "u-maya", subjectName: "Maya Chen",
        question: "When is Maya's birthday?",
        factSummary: "Maya Chen's birthday is October 23", source: "celebration",
      },
    ],
    aboutMe: [],
    mine: [],
    score: { validatedCount: 0, points: 0 },
    aboutYouFact: null,
  },
};

describe("R21 W-9 - Flows first paint is its own composition", () => {
  it("stones + braid + occasions + Know Me? Trivia; no rail, no Center markers, no section labels", async () => {
    await render(
      <C2Home
        projection={homeProjection as never}
        events={{
          openYou: vi.fn(), openSearch: vi.fn(), openActivity: vi.fn(),
          openGraph: vi.fn(), onShared: vi.fn(), bearer: "tok",
          occasionPlan: vi.fn(),
        }}
      />,
    );
    expect(container.querySelector('[data-testid="c2-moment-stones"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="c2-stone-self"]')).toBeTruthy();
    const stones = container.querySelectorAll('[data-testid="c2-stone"], [data-testid="c2-stone-nomedia"]');
    expect(stones.length).toBe(2);
    // Living-graph order is the projection's order: happening first.
    expect(stones[0].getAttribute("data-state")).toBe("happening");
    expect(stones[1].getAttribute("data-state")).toBe("loved");
    // The banned composition is absent, by testid and by class.
    expect(container.querySelector('[data-testid="c2-story-rail"]')).toBeNull();
    expect(container.innerHTML).not.toMatch(/c2s-story-avatar/);
    // The braid + the living card + occasions.
    expect(container.querySelector('[data-testid="c2-feed"]')!.className).toMatch(/c2s-stream/);
    expect(container.querySelector('[data-testid="c2-trivia-card"]')).toBeTruthy();
    // T-5: a person owns the poster - "Know Me? - Maya".
    expect(container.textContent).toMatch(/Know Me\? - Maya/);
    expect(container.querySelector('[data-testid="c2-home-occasions"]')).toBeTruthy();
    // No labeled sections (Discovery Doctrine) and no Center.
    expect(container.textContent).not.toMatch(/Your people|Moments and plans|Coming up for your people/);
    expect(container.querySelector('[data-testid="c2-center-opening"]')).toBeNull();
    expect(container.querySelector('[data-testid="c2-center-orb"]')).toBeNull();
    expect(container.textContent).not.toMatch(/Make something happen/);
    // The light heart is a real control on the moment (F-D).
    expect(container.querySelector('[data-testid="c2-light-heart"]')).toBeTruthy();
  });

  it("a pending sent guess reads back as waiting, and its question is spent (read-back law)", async () => {
    const withMine = {
      ...homeProjection,
      trivia: {
        ...homeProjection.trivia,
        mine: [
          {
            id: "g1", subjectUserId: "u-maya", subjectName: "Maya Chen",
            guesserName: null, anonymous: false,
            question: "When is Maya's birthday?", guess: "October 23",
            status: "pending", multiplier: 1,
          },
        ],
      },
    };
    await render(
      <C2Home
        projection={withMine as never}
        events={{
          openYou: vi.fn(), openSearch: vi.fn(), openActivity: vi.fn(),
          openGraph: vi.fn(), onShared: vi.fn(), bearer: "tok",
        }}
      />,
    );
    expect(container.querySelector('[data-testid="c2-trivia-waiting"]')).toBeTruthy();
    // T-5: the pair line names the pair; a PENDING guess is not
    // a score yet, so no points ride the line.
    const pairLine = container.querySelector('[data-testid="c2-trivia-score"]')!;
    expect(pairLine.textContent).toMatch(/You & Maya/);
    expect(pairLine.textContent).not.toMatch(/points/);
    expect(container.querySelector('[data-testid="c2-trivia-card"]')!.getAttribute("data-light")).toBe("waiting");
    expect(container.textContent).toMatch(/waiting for Maya Chen to say if it is right/);
    // The spent question is not re-offered in the round.
    expect(container.querySelectorAll('[data-testid="c2-trivia-answer"]').length).toBe(0);
  });

  it("CF-2/T-2: the card IS the game - no explanatory copy anywhere; the score sits on the card once played", async () => {
    await render(
      <C2Home
        projection={homeProjection as never}
        events={{
          openYou: vi.fn(), openSearch: vi.fn(), openActivity: vi.fn(),
          openGraph: vi.fn(), onShared: vi.fn(), bearer: "tok",
        }}
      />,
    );
    const card = container.querySelector('[data-testid="c2-trivia-card"]')!;
    // Talk about the game is dead: no hook paragraph, no section
    // labels, no how-it-works lines.
    expect(card.textContent).not.toMatch(/Do you know your people/);
    expect(card.textContent).not.toMatch(/A round - how well do you know them/i);
    expect(card.textContent).not.toMatch(/Guesses go to them as guesses/);
    expect(card.textContent).not.toMatch(/All caught up here/);
    expect(card.textContent).not.toMatch(/You know your people\. Make something/);
    // The game itself is all there: the pair owns the card
    // (this fixture has one buddy, so no switcher chips - the
    // multi-buddy switch is pinned in r21Flows2's poster tests),
    // and the round opens from the play door (T-5).
    expect(card.querySelector('[data-testid="c2-trivia-answer"]')).toBeNull();
    click(card.querySelector('[data-testid="c2-trivia-play"]')!);
    expect(card.querySelector('[data-testid="c2-trivia-answer"]')).toBeTruthy();
    expect(card.querySelector('[data-testid="c2-trivia-send"]')).toBeTruthy();
    // T-5: no score segment before the pair has confirmed a
    // guess (this fixture: no guesses either way) - the pair
    // line renders the pairing only.
    const pairLine = card.querySelector('[data-testid="c2-trivia-score"]')!;
    expect(pairLine).toBeTruthy();
    expect(pairLine.textContent).not.toMatch(/points/);
    // T-1: the spectacle's light state is on the card.
    expect(card.getAttribute("data-light")).toBe("round");
  });

  it("an empty trivia + occasions projection renders NEITHER card (honest absence)", async () => {
    await render(
      <C2Home
        projection={{ ...homeProjection, occasions: [], trivia: undefined } as never}
        events={{
          openYou: vi.fn(), openSearch: vi.fn(), openActivity: vi.fn(),
          openGraph: vi.fn(), onShared: vi.fn(), bearer: "tok",
        }}
      />,
    );
    expect(container.querySelector('[data-testid="c2-trivia-card"]')).toBeNull();
    expect(container.querySelector('[data-testid="c2-home-occasions"]')).toBeNull();
    expect(container.querySelector('[data-testid="c2-moment-stones"]')).toBeTruthy();
  });
});

describe("R21 W-9 - Trivia question scope (proposals only, never invented)", () => {
  const contacts = [
    { id: "u-maya", name: "Maya Chen" },
    { id: "u-june", name: "June Park" },
  ];
  it("a celebration that identity-resolves to a circle member proposes a question about them", () => {
    const qs = buildTriviaQuestions({
      celebrations: [
        { id: "c1", person_name: "Maya Chen", kind: "birthday", month: 10, day: 23, date_label: "October 23" } as never,
      ],
      contacts,
      capsules: [],
    });
    expect(qs).toHaveLength(1);
    expect(qs[0].subjectUserId).toBe("u-maya");
    expect(qs[0].factSummary).toBe("Maya Chen's birthday is October 23");
  });
  it("an unresolved celebration proposes NOTHING (no invented subjects)", () => {
    const qs = buildTriviaQuestions({
      celebrations: [
        { id: "c2", person_name: "Stranger Person", kind: "birthday", month: 1, day: 1 } as never,
      ],
      contacts,
      capsules: [],
    });
    expect(qs).toHaveLength(0);
  });
  it("the viewer's own wallet relationship capsules propose questions; capsules without a counterpart do not", () => {
    const qs = buildTriviaQuestions({
      celebrations: [],
      contacts,
      capsules: [
        { summary: "June Park loves night markets.", counterpartUserId: "u-june" },
        { summary: "Loose fact.", counterpartUserId: null },
      ],
    });
    expect(qs).toHaveLength(1);
    expect(qs[0].factSummary).toBe("June Park loves night markets.");
    expect(qs[0].subjectUserId).toBe("u-june");
  });
  it("occasions arrive AHEAD of time only, soonest first, capped", () => {
    const now = new Date(2026, 9, 20, 12);
    const out = occasionsFromCelebrations(
      [
        { id: "1", person_name: "A", kind: "birthday", month: 10, day: 25 },
        { id: "2", person_name: "B", kind: "anniversary", month: 10, day: 22 },
        { id: "3", person_name: "C", kind: "birthday", month: 3, day: 1 },
        { id: "4", person_name: "D", kind: "birthday", month: 10, day: 19 },
      ] as never[],
      now,
    );
    expect(out.map((o) => o.personName)).toEqual(["B", "A"]);
    // CF-4: the doorway's words come from the DERIVATION and
    // carry the person, never a bare pronoun.
    expect(out[0].actionLabel).toBe("Start a plan for B");
    expect(out[1].actionLabel).toBe("Start a plan for A");
  });
});

describe("R21 W-11 - Center narration absence", () => {
  it("an empty deck renders controls and quiet - no narration, no explainer card", async () => {
    await render(
      <C2CenterOpening
        projection={{
          greeting: "Good evening, Sam.", presence: "idle", celebrateOnce: false,
          needsYou: [], next: null, comingUp: [], forming: [],
        } as never}
        events={{
          openGraph: vi.fn(), makeSomethingHappen: vi.fn(), completeSlot: vi.fn(),
          openCenterChat: vi.fn(), openSoulMemory: vi.fn(),
        }}
      />,
    );
    expect(container.querySelector('[data-testid="c2-opening-calm"]')).toBeNull();
    expect(container.textContent).not.toMatch(/Nothing needs you right now/);
    expect(container.querySelector('[data-testid="c2-opening-soul-memory"]')).toBeNull();
    expect(container.querySelector('[data-testid="c2-opening-create"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="c2-opening-talk"]')).toBeTruthy();
  });
});

describe("R21 W-10 - the pad says where you are", () => {
  it("exactly one active marker per surface, center orb included", async () => {
    saveProfile({
      access_token: "tok",
      user_id: "user-1",
      display_name: "Sam Rivera",
      handle: "sam",
      session_id: "sess-1",
    } as never);
    await render(<C2Shell />);
    await flush();
    const active = () =>
      Array.from(document.querySelectorAll('[data-testid^="c2-dock-"][data-active="1"]')).map(
        (el) => el.getAttribute("data-testid"),
      );
    // Lands on Center: the ORB carries the state.
    expect(active()).toEqual(["c2-dock-center"]);
    click(document.querySelector('[data-testid="c2-dock-home"]')!);
    await flush();
    expect(active()).toEqual(["c2-dock-home"]);
    click(document.querySelector('[data-testid="c2-dock-chats"]')!);
    await flush();
    expect(active()).toEqual(["c2-dock-chats"]);
    click(document.querySelector('[data-testid="c2-dock-graphs"]')!);
    await flush();
    expect(active()).toEqual(["c2-dock-graphs"]);
    click(document.querySelector('[data-testid="c2-dock-you"]')!);
    await flush();
    expect(active()).toEqual(["c2-dock-you"]);
    click(document.querySelector('[data-testid="c2-dock-center"]')!);
    await flush();
    expect(active()).toEqual(["c2-dock-center"]);
  });
});
