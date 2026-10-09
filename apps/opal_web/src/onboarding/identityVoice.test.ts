/**
 * Paste W4 Phase 1 — identity mechanical enforcement + beach propagation.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BANNED_FRIEND_ADDRESS_PATTERNS,
  FRIEND_VAR,
  INVENTED_TITLE_NOUNS,
  USER_VAR,
  assertOpalTalksToUser,
  assertTitleEchoesUserWords,
  planTitleFromUserWords,
  planTitleWithFriend,
  scrubUserVisibleDashes,
  scriptedOpalFlowStrings,
} from "./identityVoice";
import {
  HOLY_SHIT_COPY,
  fixtureSpotsForVibe,
} from "./holyShitCopy";
import {
  planFromLocalConfirm,
  planFromOpalMetadata,
} from "../opalUi/graphSurfaceInterop";

const root = resolve(__dirname);
const src = (rel: string) => readFileSync(resolve(root, rel), "utf8");

describe("identityVoice template variables", () => {
  it("defines {user} and {friend}", () => {
    expect(USER_VAR).toBe("{user}");
    expect(FRIEND_VAR).toBe("{friend}");
  });

  it("lists banned friend-as-addressee patterns", () => {
    expect(BANNED_FRIEND_ADDRESS_PATTERNS.length).toBeGreaterThanOrEqual(3);
    const blob = BANNED_FRIEND_ADDRESS_PATTERNS.map(String).join("\n");
    expect(blob).toMatch(/Hi/);
    expect(blob).toMatch(/Thanks for sharing/);
    expect(blob).toMatch(/are ready|picturing/);
  });
});

describe("assertOpalTalksToUser", () => {
  it("passes Got {friend}. (talk TO user ABOUT friend)", () => {
    expect(assertOpalTalksToUser("Got Chanelle.", { friend: "Chanelle" })).toEqual([]);
    expect(
      assertOpalTalksToUser("What kind of vibe for Chanelle?", { friend: "Chanelle" }),
    ).toEqual([]);
  });

  it("rejects Hi {friend}, and Thanks for sharing that, {friend}.", () => {
    expect(
      assertOpalTalksToUser("Hi Chanelle, what's up?", { friend: "Chanelle" }).length,
    ).toBeGreaterThan(0);
    expect(
      assertOpalTalksToUser("Thanks for sharing that, Chanelle.", {
        friend: "Chanelle",
      }).length,
    ).toBeGreaterThan(0);
    expect(
      assertOpalTalksToUser("Chanelle, your plans are ready.", {
        friend: "Chanelle",
      }).length,
    ).toBeGreaterThan(0);
    expect(
      assertOpalTalksToUser("What's the vibe you're picturing?", {
        friend: "Chanelle",
      }).length,
    ).toBeGreaterThan(0);
  });

  it("rejects banned dashes", () => {
    expect(assertOpalTalksToUser("Got it — locked in.").length).toBeGreaterThan(0);
    expect(assertOpalTalksToUser("Got it - locked in.").length).toBeGreaterThan(0);
    expect(scrubUserVisibleDashes("Got it — locked in.")).toBe("Got it. locked in.");
  });

  it("throws when throwOnViolation is set", () => {
    expect(() =>
      assertOpalTalksToUser("Hi Chanelle,", { friend: "Chanelle" }, { throwOnViolation: true }),
    ).toThrow(/assertOpalTalksToUser/);
  });
});

describe("planTitleFromUserWords", () => {
  it("echoes beach and never invents Hurricane Movie Date", () => {
    expect(planTitleFromUserWords("beach")).toBe("Beach");
    expect(planTitleWithFriend("beach", "Chanelle")).toBe("Beach with Chanelle");
    const invented = "Hurricane Movie Date";
    expect(assertTitleEchoesUserWords(invented, "beach").length).toBeGreaterThan(0);
    for (const noun of INVENTED_TITLE_NOUNS) {
      expect(planTitleFromUserWords("beach").toLowerCase()).not.toContain(noun);
    }
  });
});

describe("Paste W4 Phase 1 scripted Sadeil / Chanelle / beach", () => {
  it("every Opal spoken string passes banned-pattern check", () => {
    const flow = scriptedOpalFlowStrings({
      user: "Sadeil",
      friend: "Chanelle",
      vibe: "beach",
    });
    for (const line of flow.opalSpoken) {
      expect(
        assertOpalTalksToUser(line, { user: "Sadeil", friend: "Chanelle" }),
        line,
      ).toEqual([]);
    }
  });

  it("beach propagates; zero invented nouns", () => {
    const flow = scriptedOpalFlowStrings({
      user: "Sadeil",
      friend: "Chanelle",
      vibe: "beach",
    });
    // Downstream of vibe: location ask, ack, calendar, spots, SMS, title.
    const downstream = flow.opalSpoken.filter((line) =>
      /beach|noted|calendar|recommend|plan ready/i.test(line),
    );
    expect(downstream.length).toBeGreaterThanOrEqual(5);
    for (const line of [...downstream, ...flow.outboundSms, flow.planTitle]) {
      expect(line.toLowerCase(), line).toContain("beach");
      for (const noun of INVENTED_TITLE_NOUNS) {
        expect(line.toLowerCase(), line).not.toMatch(new RegExp(`\\b${noun}\\b`));
      }
    }
    expect(flow.planTitle).toBe("Beach with Chanelle");
  });

  it("HOLY_SHIT_COPY floors stay identity-safe for Chanelle + beach", () => {
    const friend = "Chanelle";
    const vibe = "beach";
    const identityFloors = [
      HOLY_SHIT_COPY.confirmContact(friend),
      HOLY_SHIT_COPY.askMore(friend),
      HOLY_SHIT_COPY.askWhen(friend),
      HOLY_SHIT_COPY.askVibeFor(friend),
      HOLY_SHIT_COPY.askLocationForVibe(vibe),
      HOLY_SHIT_COPY.vibeAck(vibe),
      HOLY_SHIT_COPY.calendarConnectedDays(friend, vibe, "Friday evening"),
      HOLY_SHIT_COPY.calendarDismissedDays(friend, vibe, "Friday evening"),
      HOLY_SHIT_COPY.stepTaste(friend),
      HOLY_SHIT_COPY.stepSpotsEmpty(vibe),
      HOLY_SHIT_COPY.plansReadyNamed(1, `${friend} (Nearby beach)`),
      HOLY_SHIT_COPY.trustPreviewLead(friend),
    ];
    for (const line of identityFloors) {
      expect(
        assertOpalTalksToUser(line, { user: "Sadeil", friend }),
        line,
      ).toEqual([]);
    }

    const beachDownstream = [
      HOLY_SHIT_COPY.askLocationForVibe(vibe),
      HOLY_SHIT_COPY.vibeAck(vibe),
      HOLY_SHIT_COPY.calendarConnectedDays(friend, vibe, "Friday evening"),
      HOLY_SHIT_COPY.calendarConnectUnavailableDays(friend, vibe, "Friday evening"),
      HOLY_SHIT_COPY.calendarDismissedDays(friend, vibe, "Friday evening"),
      HOLY_SHIT_COPY.stepSpotsEmpty(vibe),
      HOLY_SHIT_COPY.plansReadyNamed(1, `${friend} (Nearby beach)`),
      HOLY_SHIT_COPY.messageBody(friend, vibe, "This weekend", "Nearby beach"),
    ];
    for (const line of beachDownstream) {
      expect(line.toLowerCase(), line).toContain("beach");
      for (const noun of INVENTED_TITLE_NOUNS) {
        expect(line.toLowerCase(), line).not.toMatch(new RegExp(`\\b${noun}\\b`));
      }
    }
    const spots = fixtureSpotsForVibe("beach");
    expect(spots.length).toBeGreaterThan(0);
    expect(spots.every((s) => /beach/i.test(s.name))).toBe(true);
  });
});

describe("plan title builders echo user words", () => {
  it("planFromLocalConfirm keeps beach (never Dinner / Hurricane)", () => {
    const local = planFromLocalConfirm({
      priorUserText: "Plan beach with Chanelle Friday",
      affirmText: "Yes",
    });
    expect(local?.who).toBe("Chanelle");
    expect(local?.what).toBe("beach");
    expect(local?.title).toBe("Beach with Chanelle");
    expect(assertTitleEchoesUserWords(local!.title, "beach")).toEqual([]);
  });

  it("planFromOpalMetadata does not invent Dinner when what is beach", () => {
    const plan = planFromOpalMetadata({
      intent: {
        intent: "plan_confirm",
        entities: {
          confirmed: true,
          plan_id: "plan-beach-1",
          who: ["Chanelle"],
          when: "Saturday",
          what: "beach",
        },
      },
    });
    expect(plan?.title.toLowerCase()).toContain("beach");
    expect(plan?.title.toLowerCase()).not.toContain("dinner");
    expect(plan?.title.toLowerCase()).not.toContain("hurricane");
  });
});

describe("selected pill + identity module wiring", () => {
  it("keeps .hs-pill.is-selected with checkmark", () => {
    const css = readFileSync(resolve(root, "../styles.css"), "utf8");
    expect(css).toMatch(/\.hs-pill\.is-selected/);
    const working = src("OpalWorking.tsx");
    expect(working).toMatch(/is-selected/);
    expect(working).toMatch(/✓/);
  });

  it("draftOnboardingCopy gates on assertOpalTalksToUser", () => {
    const draft = src("draftOnboardingCopy.ts");
    expect(draft).toMatch(/assertOpalTalksToUser/);
    expect(draft).toMatch(/scrubUserVisibleDashes/);
  });
});
