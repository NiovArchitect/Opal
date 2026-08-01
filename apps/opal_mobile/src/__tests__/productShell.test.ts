import { PRIMARY_TABS, NOT_PRIMARY_TABS, isPrimaryTab } from "../shell/navigation";
import { buildHomeSnapshot, completeNeedsYouItem, MAX_NEEDS_YOU, NEEDS_YOU_EMPTY } from "../shell/homeModel";
import { isProhibitedShellCopy, signalFamily, familyLabel } from "../shell/signals";
import type { NeedsYouItem } from "../shell/types";

describe("product shell navigation", () => {
  test("exactly four primary destinations", () => {
    expect(PRIMARY_TABS).toHaveLength(4);
    expect(PRIMARY_TABS.map((t) => t.id)).toEqual(["home", "chats", "plans", "you"]);
    expect(isPrimaryTab("home")).toBe(true);
    expect(isPrimaryTab("signals")).toBe(false);
    expect(NOT_PRIMARY_TABS).toContain("ai");
    expect(NOT_PRIMARY_TABS).toContain("discovery");
  });
});

describe("home model", () => {
  const needs: NeedsYouItem[] = [
    {
      id: "1",
      source_type: "due_reminder",
      title: "Book the restaurant.",
      explanation: "Private reminder",
      primary_action: "Complete",
      privacy_class: "private",
    },
    {
      id: "2",
      source_type: "needs_answer",
      title: "Jordan asked which area works best.",
      explanation: "Open question",
      primary_action: "Reply",
    },
  ];

  test("greeting and needs you quiet success", () => {
    const home = buildHomeSnapshot({
      displayName: "Alex",
      needsYou: needs,
      comingUp: [
        {
          id: "c1",
          title: "Dinner with Jordan",
          when_label: "Thursday at 7:00 PM",
          state: "upcoming",
        },
      ],
      hourUTC: 20,
    });
    expect(home.greeting).toBe("Good evening, Alex.");
    expect(home.needs_you).toHaveLength(2);
    expect(home.coming_up[0].title).toContain("Dinner");
    expect(home.no_engagement_counts).toBe(true);
    expect(home.no_streaks).toBe(true);

    const after = completeNeedsYouItem(completeNeedsYouItem(needs, "1"), "2");
    const quiet = buildHomeSnapshot({
      displayName: "Alex",
      needsYou: after,
      comingUp: [],
      hourUTC: 20,
    });
    expect(quiet.quiet_success).toBe(true);
    expect(quiet.needs_you_empty_copy).toBe(NEEDS_YOU_EMPTY);
  });

  test("caps needs you", () => {
    const many = [1, 2, 3, 4, 5].map((n) => ({
      id: String(n),
      source_type: "needs_answer",
      title: `Item ${n}`,
      explanation: `e${n}`,
      primary_action: "Open",
    }));
    const home = buildHomeSnapshot({ displayName: "Alex", needsYou: many, comingUp: [] });
    expect(home.needs_you.length).toBeLessThanOrEqual(MAX_NEEDS_YOU);
  });
});

describe("unified signals", () => {
  test("families and prohibited copy", () => {
    expect(signalFamily("possible_plan")).toBe("possibility");
    expect(signalFamily("tradition")).toBe("continuity");
    expect(familyLabel("needs_action")).toBe("Needs you");
    expect(isProhibitedShellCopy("streak at risk")).toBe(true);
    expect(isProhibitedShellCopy("Nothing needs you right now.")).toBe(false);
  });
});
