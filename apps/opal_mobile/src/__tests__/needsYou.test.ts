import { selectNeedsYou, PROHIBITED_COPY_PATTERNS, NEEDS_YOU_EMPTY } from "../socialFlow/needsYou";
import type { SocialFlowSignal } from "../socialFlow/types";

const alex = "a1111111-1111-4111-8111-111111111111";

function sig(partial: Partial<SocialFlowSignal> & { id: string }): SocialFlowSignal {
  return {
    conversationId: "c1",
    kind: "commitment",
    status: "visible",
    copy: "Reservation still needs attention.",
    visibility: "private",
    actions: [],
    audienceUserId: alex,
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

describe("needsYou", () => {
  test("caps at 3 and calm empty state", () => {
    const items = [1, 2, 3, 4, 5].map((n) =>
      sig({ id: `s${n}`, copy: `Item ${n}` }),
    );
    const { visible, overflow, emptyCopy } = selectNeedsYou(items, alex);
    expect(visible).toHaveLength(3);
    expect(overflow).toBe(2);
    expect(emptyCopy).toBeNull();

    const empty = selectNeedsYou([], alex);
    expect(empty.emptyCopy).toBe(NEEDS_YOU_EMPTY);
  });

  test("prohibits manipulative copy patterns", () => {
    expect(PROHIBITED_COPY_PATTERNS.some((p) => p.test("Reservation handled."))).toBe(
      false,
    );
    expect(PROHIBITED_COPY_PATTERNS.some((p) => p.test("streak at risk tomorrow"))).toBe(
      true,
    );
    expect(PROHIBITED_COPY_PATTERNS.some((p) => p.test("relationship score low"))).toBe(
      true,
    );
  });
});
