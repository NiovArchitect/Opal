/**
 * @vitest-environment jsdom
 *
 * Repair #22 (WS-7) - the Know Me? Trivia CORRECTION path pins
 * (jsdom layer; the rendered layer is the signature-gated
 * capture set under shots/repair22/trivia):
 *
 *  - "Not quite" opens an EDIT state in place (the card expands;
 *    no navigation), the claimed answer prefilled as the draft;
 *  - an empty, whitespace, or unchanged draft cannot submit;
 *  - submitting calls the correction leg with the stated truth
 *    and the card says plainly that it counts as corrected, not
 *    as a right answer;
 *  - Cancel returns to the unmodified validation card and no
 *    write of any kind has happened;
 *  - the plain "Not quite" verdict survives inside the edit
 *    state as "no correction";
 *  - the pair sees the correction: the guesser's card names the
 *    original claim AND what it was corrected to, and the pair
 *    score derivation never counts a corrected guess.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const correctTriviaGuess = vi.fn();
const validateTriviaGuess = vi.fn();

vi.mock("../../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../../api/productClient")>(
    "../../api/productClient",
  );
  return {
    ...actual,
    correctTriviaGuess: (...a: unknown[]) => correctTriviaGuess(...a),
    validateTriviaGuess: (...a: unknown[]) => validateTriviaGuess(...a),
  };
});

import { TriviaCard } from "./C2Trivia";
import { pairScoreFromRecords } from "./shellData";
import type { HomeTrivia } from "./projections";

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
function type(input: HTMLInputElement, value: string) {
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
  correctTriviaGuess.mockResolvedValue({
    guess: { id: "g7", status: "corrected", capsule_written: true },
  });
  validateTriviaGuess.mockResolvedValue({
    guess: { id: "g7", status: "rejected", capsule_written: false },
  });
});

const pendingAboutMe: HomeTrivia = {
  questions: [],
  aboutMe: [
    {
      id: "g7",
      subjectUserId: "u-me",
      subjectName: null,
      guesserUserId: "u-maya",
      guesserName: "Maya Chen",
      anonymous: false,
      question: "When is Sam's birthday?",
      guess: "June 14",
      status: "pending",
      multiplier: 1,
    },
  ],
  mine: [],
  score: { validatedCount: 0, points: 0 },
  aboutYouFact: null,
};

describe("Repair #22 WS-7 - trivia correction path", () => {
  it("Not quite opens the edit state in place, prefilled with the claimed answer", async () => {
    const onShared = vi.fn();
    await render(<TriviaCard trivia={pendingAboutMe} bearer="tok" onShared={onShared} />);
    expect(q('[data-testid="c2-trivia-correction-edit"]')).toBeNull();
    click(q('[data-testid="c2-trivia-validate-wrong"]')!);
    const edit = q('[data-testid="c2-trivia-correction-edit"]');
    expect(edit).toBeTruthy();
    // The claimed answer is the draft - the subject edits it,
    // they do not retype from nothing. No write has happened.
    const input = q('[data-testid="c2-trivia-correction-input"]') as HTMLInputElement;
    expect(input.value).toBe("June 14");
    expect(correctTriviaGuess).not.toHaveBeenCalled();
    expect(validateTriviaGuess).not.toHaveBeenCalled();
    // Unchanged cannot submit.
    expect(
      (q('[data-testid="c2-trivia-correction-save"]') as HTMLButtonElement).disabled,
    ).toBe(true);
    // Empty cannot submit.
    type(input, "   ");
    expect(
      (q('[data-testid="c2-trivia-correction-save"]') as HTMLButtonElement).disabled,
    ).toBe(true);
    // A real correction can.
    type(input, "June 15");
    expect(
      (q('[data-testid="c2-trivia-correction-save"]') as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("submitting the correction calls the correction leg and names the scoring truth", async () => {
    const onShared = vi.fn();
    await render(<TriviaCard trivia={pendingAboutMe} bearer="tok" onShared={onShared} />);
    click(q('[data-testid="c2-trivia-validate-wrong"]')!);
    type(q('[data-testid="c2-trivia-correction-input"]') as HTMLInputElement, "June 15");
    click(q('[data-testid="c2-trivia-correction-save"]')!);
    await flush();
    expect(correctTriviaGuess).toHaveBeenCalledWith("g7", "June 15", "tok");
    expect(onShared).toHaveBeenCalled();
    // The edit state closed and the note states the scoring
    // truth in plain words: corrected, not right.
    expect(q('[data-testid="c2-trivia-correction-edit"]')).toBeNull();
    expect(q('[data-testid="c2-trivia-validated-note"]')!.textContent).toMatch(
      /counts as corrected - not as a right answer/,
    );
  });

  it("Cancel returns to the unmodified card with nothing written", async () => {
    const onShared = vi.fn();
    await render(<TriviaCard trivia={pendingAboutMe} bearer="tok" onShared={onShared} />);
    click(q('[data-testid="c2-trivia-validate-wrong"]')!);
    type(q('[data-testid="c2-trivia-correction-input"]') as HTMLInputElement, "June 15");
    click(q('[data-testid="c2-trivia-correction-cancel"]')!);
    expect(q('[data-testid="c2-trivia-correction-edit"]')).toBeNull();
    expect(q('[data-testid="c2-trivia-validate-right"]')).toBeTruthy();
    expect(q('[data-testid="c2-trivia-validate-wrong"]')).toBeTruthy();
    expect(correctTriviaGuess).not.toHaveBeenCalled();
    expect(validateTriviaGuess).not.toHaveBeenCalled();
    expect(onShared).not.toHaveBeenCalled();
  });

  it("the plain Not-quite verdict survives inside the edit state", async () => {
    const onShared = vi.fn();
    await render(<TriviaCard trivia={pendingAboutMe} bearer="tok" onShared={onShared} />);
    click(q('[data-testid="c2-trivia-validate-wrong"]')!);
    click(q('[data-testid="c2-trivia-correction-reject"]')!);
    await flush();
    expect(validateTriviaGuess).toHaveBeenCalledWith("g7", "wrong", "tok");
    expect(correctTriviaGuess).not.toHaveBeenCalled();
  });

  it("the guesser sees the correction: original claim and corrected answer, no points", async () => {
    const trivia: HomeTrivia = {
      questions: [],
      aboutMe: [],
      mine: [
        {
          id: "g7",
          subjectUserId: "u-maya",
          subjectName: "Maya Chen",
          guesserUserId: "u-me",
          guesserName: null,
          anonymous: false,
          question: "When is Maya's birthday?",
          guess: "June 14",
          status: "corrected",
          multiplier: 1,
          correctedGuess: "June 15",
        },
      ],
      score: { validatedCount: 0, points: 0 },
      aboutYouFact: null,
    };
    await render(<TriviaCard trivia={trivia} bearer="tok" onShared={vi.fn()} />);
    const line = q('[data-testid="c2-trivia-corrected-mine"]')!;
    expect(line).toBeTruthy();
    expect(line.textContent).toMatch(/Maya Chen corrected your answer: you said June 14/);
    expect(line.textContent).toMatch(/it is June 15/);
    expect(line.textContent).toMatch(/earn no points/);
    // The pair line carries NO score segment: a corrected guess
    // is not a confirmed one.
    expect(q('[data-testid="c2-trivia-score"]')!.textContent).toBe("You & Maya");
  });

  it("the subject reads back what they set right", async () => {
    const trivia: HomeTrivia = {
      ...pendingAboutMe,
      aboutMe: [{ ...pendingAboutMe.aboutMe[0], status: "corrected", correctedGuess: "June 15" }],
    };
    await render(<TriviaCard trivia={trivia} bearer="tok" onShared={vi.fn()} />);
    const line = q('[data-testid="c2-trivia-corrected-about"]')!;
    expect(line).toBeTruthy();
    expect(line.textContent).toMatch(/You corrected Maya Chen: they said June 14 - it is June 15/);
    expect(q('[data-testid="c2-trivia-validation"]')).toBeNull();
  });

  it("pairScoreFromRecords never counts a corrected guess", () => {
    const corrected = pairScoreFromRecords(
      [{ guesserUserId: "u-me", subjectUserId: "u-maya", status: "corrected", multiplier: 2 }],
      "u-me",
      "u-maya",
    );
    expect(corrected).toBeNull();
    const mixed = pairScoreFromRecords(
      [
        { guesserUserId: "u-me", subjectUserId: "u-maya", status: "corrected", multiplier: 2 },
        { guesserUserId: "u-maya", subjectUserId: "u-me", status: "validated", multiplier: 1 },
      ],
      "u-me",
      "u-maya",
    );
    expect(mixed).toEqual({ confirmed: 1, points: 10 });
  });
});
