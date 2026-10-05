/**
 * Holy Shit Moments 1–5 — additive gated first-run (source contract).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { HOLY_SHIT_COPY, HOLY_SHIT_FIXTURE_SPOTS } from "./holyShitCopy";

const root = resolve(__dirname);
const src = (rel: string) => readFileSync(resolve(root, rel), "utf8");

describe("Holy Shit first-run Moments 1–5", () => {
  it("gates on opal_holy_shit and keeps default Splash→Promise→Auth", () => {
    const gate = src("holyShitGate.ts");
    const app = src("../OpalApp.tsx");
    expect(gate).toMatch(/opal_holy_shit/);
    expect(app).toMatch(/readHolyShitEnabled/);
    expect(app).toMatch(/meet_opal/);
    expect(app).toMatch(/FirstRunStage = "splash" \| "promise" \| "meet_opal" \| "auth"/);
  });

  it("Moment 1 adds landing hook under thesis without changing canonical SHA", () => {
    const promise = src("FirstRunPromisePage.tsx");
    const copy = src("holyShitCopy.ts");
    expect(promise).toMatch(/showHolyShitHook/);
    expect(promise).toMatch(/opal-promise-holy-hook/);
    expect(copy).toContain(HOLY_SHIT_COPY.landingHook);
    expect(promise).toMatch(
      /20c5210ff89e911368479463780eed37dce6fe2e994c61cda13982eaa2ddcf10/,
    );
  });

  it("Moment 2–3 conversational state machine + exact founder lines", () => {
    const meet = src("MeetOpalConversation.tsx");
    const copy = src("holyShitCopy.ts");
    expect(meet).toMatch(/greeting/);
    expect(meet).toMatch(/ask_name/);
    expect(meet).toMatch(/ask_when/);
    expect(meet).toMatch(/HOLY_SHIT_COPY\.greeting/);
    expect(meet).toMatch(/HOLY_SHIT_COPY\.askName/);
    expect(copy).toContain(HOLY_SHIT_COPY.greeting);
    expect(copy).toContain(HOLY_SHIT_COPY.askName);
    expect(meet).toMatch(/ASK_NAME_PAUSE_MS = 800/);
    expect(meet).toMatch(/GREETING_SLIDE_MS = 400/);
    expect(copy).toMatch(/This week/);
    expect(copy).toMatch(/Something active/);
  });

  it("Moment 4 OpalWorking stages 900ms with fixture spots", () => {
    const working = src("OpalWorking.tsx");
    const copy = src("holyShitCopy.ts");
    expect(working).toMatch(/STEP_MS = 900/);
    expect(copy).toMatch(/Checking your calendar/);
    expect(copy).toMatch(/Finding spots/);
    expect(HOLY_SHIT_FIXTURE_SPOTS.map((s) => s.name)).toEqual([
      "Juniper & Ivy",
      "Osteria Bruno",
      "The Copper Hen",
    ]);
  });

  it("Moment 5 trust contract exact will/won't copy", () => {
    const trust = src("TrustContractCard.tsx");
    const copy = src("holyShitCopy.ts");
    expect(trust).toMatch(/HOLY_SHIT_COPY\.trustPreviewLead/);
    expect(copy).toContain(HOLY_SHIT_COPY.willSend);
    expect(copy).toContain(HOLY_SHIT_COPY.wontCalendar);
    expect(copy).toContain(HOLY_SHIT_COPY.wontAnyoneElse);
    expect(copy).toContain(HOLY_SHIT_COPY.wontBook);
    expect(copy).toMatch(/Send it/);
    expect(copy).toMatch(/Not yet/);
  });
});
