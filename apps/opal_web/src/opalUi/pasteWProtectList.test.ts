/**
 * Paste W Phase 6 — protect-list regressions (L3/L8/B1/B2).
 * Locks product truths so later polish cannot delete them.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SEED_TIMELINE_ITEMS } from "./GraphsTemporalTimeline";
import { FOUNDER_CHATS_PLAN_PILL_ROWS } from "./founderChatsPlanPills";
import { FOUNDER_STORIES } from "./founderGraphSeed";
import { HOLY_SHIT_COPY } from "../onboarding/holyShitCopy";

const root = resolve(__dirname, "..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

describe("Paste W Phase 6 protect list", () => {
  it("6.1 Someday Japan / Tokyo deal proactive + restaurant almost-full book extension", () => {
    const japan = SEED_TIMELINE_ITEMS.find((i) => i.id === "seed-japan-someday");
    expect(japan?.title).toMatch(/Japan/i);
    expect(japan?.where).toBe("Tokyo");
    expect(japan?.whenLabel).toMatch(/Someday/i);
    expect(japan?.nurtureSignal).toMatch(/Flight prices to Tokyo dropped 20%/i);
    expect(japan?.nurtureSignal).toMatch(/Want to look at dates/i);

    const juniper = SEED_TIMELINE_ITEMS.find((i) => i.id === "seed-chanelle-juniper");
    expect(juniper?.nurtureSignal).toMatch(/almost full/i);
    expect(juniper?.nurtureSignal).toMatch(/Want to book/i);

    const timeline = read("opalUi/GraphsTemporalTimeline.tsx");
    expect(timeline).toMatch(/graphs-nurture-signal/);
    expect(timeline).toMatch(/nurtureSignal/);
  });

  it("6.2 Sabrina Live nearby → Watch live", () => {
    const sabrina = FOUNDER_CHATS_PLAN_PILL_ROWS.find((r) => r.name === "Sabrina");
    expect(sabrina?.planConsequence?.label).toBe("Live nearby");
    expect(sabrina?.planConsequence?.tone).toBe("live");

    const app = read("OpalApp.tsx");
    expect(app).toMatch(/Watch live/);
    expect(app).toMatch(/gpt-watch-live|thread-watch-live/);
    expect(app).toMatch(/seed-live-sabrina|FOUNDER_LIVE_FEED/);
  });

  it("6.3 story rings keep MEMORY / GRAPH / LIVE labels", () => {
    expect(FOUNDER_STORIES.map((s) => `${s.person}:${s.pulseState}`)).toEqual([
      "Maya:MEMORY",
      "Jordan:GRAPH",
      "Sabrina:LIVE",
      "Chanelle:MEMORY",
      "Alex:GRAPH",
    ]);
    const home = read("opalUi/GraphSocialHome.tsx");
    expect(home).toMatch(/gsh-story-pulse/);
    expect(home).toMatch(/pulseState/);
    expect(home).toMatch(/MEMORY|GRAPH|LIVE/);
  });

  it("6.4 QR stays on You page", () => {
    const app = read("OpalApp.tsx");
    const youStart = app.indexOf("function YouPane");
    expect(youStart).toBeGreaterThan(0);
    const youChunk = app.slice(youStart, youStart + 4500);
    expect(youChunk).toMatch(/data-testid="you-qr"/);
    expect(youChunk).toMatch(/aria-label="QR"/);
    expect(youChunk).toMatch(/you-hub-qr/);
    expect(youChunk).toMatch(/data-testid="you-hub-pane"/);
  });

  it("B1 I will / I won't consent remains + branded with Phase 0 tokens", () => {
    expect(HOLY_SHIT_COPY.willLabel).toMatch(/I will/i);
    expect(HOLY_SHIT_COPY.wontLabel).toMatch(/I won't/i);
    expect(HOLY_SHIT_COPY.willSend).toMatch(/Send this one message/i);
    expect(HOLY_SHIT_COPY.wontCalendar).toMatch(/calendar/i);
    expect(HOLY_SHIT_COPY.wontAnyoneElse).toMatch(/anyone else/i);
    expect(HOLY_SHIT_COPY.wontBook).toMatch(/Book anything/i);

    const trust = read("onboarding/TrustContractCard.tsx");
    expect(trust).toMatch(/hs-trust-will/);
    expect(trust).toMatch(/hs-trust-wont/);
    expect(trust).toMatch(/willLabel/);
    expect(trust).toMatch(/wontLabel/);

    const css = read("styles.css");
    expect(css).toMatch(/\.hs-trust-will/);
    expect(css).toMatch(/\.hs-trust-wont/);
    expect(css).toMatch(/opal-composer-gradient|--opal-composer-fill/);
  });

  it("B2 Watch Opal work honest calendar copy never removed", () => {
    expect(HOLY_SHIT_COPY.workingTitle).toBe("Watch Opal work");
    expect(HOLY_SHIT_COPY.stepCalendar).toMatch(/Checking your calendar/i);
    expect(HOLY_SHIT_COPY.stepCalendarGrace).toMatch(/I'll figure out when works for you/i);
    expect(HOLY_SHIT_COPY.stepCalendarAsk).toMatch(/don't have your calendar yet/i);
    expect(HOLY_SHIT_COPY.connectCalendar).toBe("Connect calendar");

    const working = read("onboarding/OpalWorking.tsx");
    expect(working).toMatch(/Watch Opal work|HOLY_SHIT_COPY\.workingTitle/);
    expect(working).toMatch(/stepCalendarGrace/);
    expect(working).toMatch(/opal-working-connect-calendar|connectCalendar/);
    // Honest default — never pretends calendar is already known without a real API.
    expect(working).toMatch(/I'll figure out when works for you|stepCalendarGrace/);
  });

  it("L8 filed sections still exist inside settings destinations", () => {
    const dest = read("opalUi/YouSettingsDestination.tsx");
    expect(dest).toMatch(/setting === "calls-assist"/);
    expect(dest).toMatch(/WhatOpalCanDoSection/);
    expect(dest).toMatch(/setting === "privacy"/);
    expect(dest).toMatch(/WhatOpalRemembersSection/);
    expect(dest).toMatch(/setting === "feed-discovery"/);
    expect(dest).toMatch(/InviteFriendsSection/);
    expect(dest).toMatch(/you-settings-filed-calls-assist/);
    expect(dest).toMatch(/you-settings-filed-privacy/);
    expect(dest).toMatch(/you-settings-filed-feed-discovery/);

    const app = read("OpalApp.tsx");
    const youStart = app.indexOf("function YouPane");
    const youChunk = app.slice(youStart, youStart + 6000);
    expect(youChunk).not.toMatch(/<WhatOpalCanDoSection/);
    expect(youChunk).not.toMatch(/<WhatOpalRemembersSection/);
    expect(youChunk).not.toMatch(/<InviteFriendsSection/);
  });
});
