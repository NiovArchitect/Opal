/**
 * Holy Shit Moments 1–5 — additive gated first-run (source contract).
 * One person · type or Select from contacts · custom vibe.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HOLY_SHIT_COPY,
  HOLY_SHIT_FIXTURE_SPOTS,
  fixtureSpotsForVibe,
} from "./holyShitCopy";

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

  it("Moment 1 keeps canonical Promise SHA and never overlays live hook text", () => {
    const promise = src("FirstRunPromisePage.tsx");
    const copy = src("holyShitCopy.ts");
    expect(promise).toMatch(/showHolyShitHook/);
    expect(promise).not.toMatch(/opal-promise-holy-hook/);
    expect(promise).not.toMatch(/HOLY_SHIT_COPY\.landingHook/);
    expect(copy).toContain(HOLY_SHIT_COPY.landingHook);
    expect(promise).toMatch(
      /20c5210ff89e911368479463780eed37dce6fe2e994c61cda13982eaa2ddcf10/,
    );
  });

  it("Moment 2–3 people + Add another / Let's plan + Select from contacts", () => {
    const meet = src("MeetOpalConversation.tsx");
    const orb = src("OpalPresenceOrb.tsx");
    const copy = src("holyShitCopy.ts");
    const gate = src("holyShitGate.ts");
    const app = src("../OpalApp.tsx");
    expect(meet).toMatch(/ask_people/);
    expect(meet).toMatch(/ask_more/);
    expect(meet).toMatch(/ask_when/);
    expect(meet).toMatch(/HOLY_SHIT_COPY\.askPeople/);
    expect(meet).toMatch(/hs-add-another/);
    expect(meet).toMatch(/hs-lets-plan/);
    expect(meet).toMatch(/OpalPresenceOrb/);
    expect(orb).toMatch(/hs-opal-orb/);
    expect(copy).toContain(HOLY_SHIT_COPY.askPeople);
    expect(copy).toMatch(/catch up with/);
    expect(copy).toMatch(/Select from contacts/);
    expect(copy).toMatch(/Something else/);
    expect(copy).toMatch(/Church/);
    expect(copy).toMatch(/Add another/);
    expect(copy).toMatch(/Let's plan/);
    expect(copy).not.toMatch(/Find in contacts/);
    expect(copy).not.toMatch(/Add them fresh/);
    expect(copy).not.toMatch(/3–5 people/);
    expect(meet).toMatch(/nav\.contacts\.select|contacts\?\.select/);
    expect(meet).toMatch(/hs-resolve-contacts/);
    expect(meet).toMatch(/hs-vibe-something-else/);
    expect(meet).toMatch(/hs-vibe-custom-input/);
    expect(meet).not.toMatch(/hs-people-tags/);
    expect(meet).not.toMatch(/ask_vibe_mode/);
    expect(meet).not.toMatch(/hs-phone-input/);
    // Phone → Meet Opal (Who's someone…) — does not disappear after OTP
    expect(app).toMatch(/onAfterPhoneVerify/);
    expect(app).toMatch(/handleAfterPhoneVerify/);
    expect(gate).toMatch(/opal_founder_seed/);
    // Order: people → ask_more → when → vibe → working → trust
    const phaseBlock = copy.slice(copy.indexOf("export type MeetOpalPhase"));
    expect(phaseBlock.indexOf("ask_people")).toBeLessThan(phaseBlock.indexOf("ask_more"));
    expect(phaseBlock.indexOf("ask_more")).toBeLessThan(phaseBlock.indexOf("ask_when"));
    expect(phaseBlock.indexOf("ask_when")).toBeLessThan(phaseBlock.indexOf("ask_vibe"));
    expect(phaseBlock.indexOf("ask_vibe")).toBeLessThan(phaseBlock.indexOf('"working"'));
    expect(meet).toMatch(/ASK_NAME_PAUSE_MS = 800/);
    expect(meet).toMatch(/GREETING_SLIDE_MS = 400/);
    expect(meet).toMatch(/TYPING_MS = 650/);
    expect(copy).toMatch(/This week/);
    expect(copy).toMatch(/Something active/);
  });

  it("Moment 4 OpalWorking stages 900ms with vibe-driven spots + honest calendar", () => {
    const working = src("OpalWorking.tsx");
    const copy = src("holyShitCopy.ts");
    expect(working).toMatch(/STEP_MS = 900/);
    expect(working).toMatch(/x: 48/);
    expect(working).toMatch(/CheckMark/);
    expect(working).toMatch(/fixtureSpotsForVibe/);
    expect(working).toMatch(/stepCalendarGrace/);
    expect(copy).toMatch(/Checking your calendar/);
    expect(copy).toMatch(/Finding spots/);
    // calendar honesty asserted in follow-up fix
    expect(copy).toMatch(/don't have .* recommendations yet/i);
    expect(HOLY_SHIT_FIXTURE_SPOTS.map((s) => s.name)).toEqual([
      "Juniper & Ivy",
      "Osteria Bruno",
      "The Copper Hen",
    ]);
    // Church must never resolve to restaurant fixtures
    const church = fixtureSpotsForVibe("Church").map((s) => s.name);
    expect(church.some((n) => /Juniper|Osteria|Copper Hen/i.test(n))).toBe(false);
    expect(church.some((n) => /Chapel|Fellowship|Garden|Church|Mark/i.test(n))).toBe(true);
    expect(fixtureSpotsForVibe("something wild custom").length).toBe(0);
  });

  it("Moment 5 trust contract exact will/won't copy", () => {
    const trust = src("TrustContractCard.tsx");
    const copy = src("holyShitCopy.ts");
    expect(trust).toMatch(/HOLY_SHIT_COPY\.trustPreviewLead/);
    expect(trust).toMatch(/hs-trust/);
    expect(trust).toMatch(/OpalPresenceOrb/);
    expect(copy).toContain(HOLY_SHIT_COPY.willSend);
    expect(copy).toContain(HOLY_SHIT_COPY.wontCalendar);
    expect(copy).toContain(HOLY_SHIT_COPY.wontAnyoneElse);
    expect(copy).toContain(HOLY_SHIT_COPY.wontBook);
    expect(copy).toMatch(/Send it/);
    expect(copy).toMatch(/Not yet/);
  });

  it("immersive rebuild: flex meet shell, orb presence, no absolute message geometry", () => {
    const css = readFileSync(resolve(root, "../styles.css"), "utf8");
    const hs = css.slice(css.indexOf("Holy Shit Moments 2–5 REBUILD"));
    expect(hs).toMatch(/\.hs-meet-opal\s*\{[^}]*display:\s*flex/s);
    expect(hs).toMatch(/flex-direction:\s*column/);
    expect(hs).toMatch(/\.hs-orb/);
    expect(hs).toMatch(/#00e5ff|#00E5FF/i);
    expect(hs).toMatch(/hs-orb-spin/);
    expect(hs).toMatch(/\.hs-trust-send/);
    expect(hs).toMatch(/\.hs-meet-scroll\s*\{[^}]*flex:\s*1/s);
    expect(hs).toMatch(/\.hs-pill-row\s*\{[^}]*display:\s*flex/s);
  });
});
