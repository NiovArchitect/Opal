/**
 * Holy Shit Moments 1–5 — additive gated first-run (source contract).
 * Paste W5 Phase 0: Meet Opal ONE scrolling page (name + friend + perms + Assist + sticky Continue).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HOLY_SHIT_COPY,
  HOLY_SHIT_FIXTURE_SPOTS,
  MEET_OPAL_PERMISSION_ORDER,
  fixtureSpotsForVibe,
  formatDayOptions,
  proposePlanningDays,
  suggestUsernameFromName,
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
    // Reset URL must sticky-persist holy_shit so Meet Opal still runs after OTP.
    expect(app).toMatch(/consumeResetFirstRunFlag/);
    expect(app).toMatch(/sessionStorage\?\.setItem\("opal_holy_shit"/);
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

  it("Paste W5 Phase 0: one scrolling Meet Opal page (name + friend + perms + Assist)", () => {
    const meet = src("MeetOpalConversation.tsx");
    const orb = src("OpalPresenceOrb.tsx");
    const copy = src("holyShitCopy.ts");
    const gate = src("holyShitGate.ts");
    const app = src("../OpalApp.tsx");
    // Single-page sections present (not multi-screen phase gates)
    expect(meet).toMatch(/askSelfName|What's your name/);
    expect(meet).toMatch(/askPeople|ask_people/);
    expect(meet).toMatch(/askPermissions|ask_permissions/);
    expect(meet).toMatch(/hs-assist-row/);
    expect(meet).toMatch(/hs-assist-enable/);
    expect(meet).toMatch(/hs-assist-not-now/);
    expect(meet).toMatch(/hs-meet-continue/);
    expect(meet).toMatch(/updateAssistPreference/);
    expect(meet).toMatch(/hs-meet-sticky-continue|hs-meet-continue/);
    // Phase 0 kills these from the first-run render path
    expect(meet).not.toMatch(/OpalWorking/);
    expect(meet).not.toMatch(/TrustContractCard/);
    expect(meet).not.toMatch(/setPhase\("ask_more"\)/);
    expect(meet).not.toMatch(/setPhase\("ask_when"\)/);
    expect(meet).not.toMatch(/setPhase\("ask_vibe"\)/);
    expect(meet).not.toMatch(/setPhase\("working"\)/);
    expect(meet).not.toMatch(/setPhase\("trust"\)/);
    expect(meet).toMatch(/HOLY_SHIT_COPY\.askPeople/);
    expect(meet).toMatch(/hs-self-name-input/);
    expect(meet).toMatch(/hs-self-username-hint/);
    // Single name input — no separate username field
    expect(meet).not.toMatch(/hs-self-username-input/);
    expect(meet).toMatch(/suggestUsernameFromName/);
    expect(meet).toMatch(/saveProfile/);
    expect(meet).toMatch(/updateProfile/);
    expect(meet).toMatch(/You'll be @|selfUsernameQuiet/);
    expect(meet).toMatch(/OpalPresenceOrb/);
    expect(orb).toMatch(/hs-opal-orb/);
    expect(orb).toMatch(/hs-orb-character|data-presence="character"/);
    expect(orb).toMatch(/opal-character\.png|opalCharacter/);
    expect(orb).toMatch(/Opal is working|Opal is thinking|statusLabelForMode/);
    expect(orb).not.toMatch(/opal-center-opal-645-3-rest-512/);
    expect(copy).toContain(HOLY_SHIT_COPY.askPeople);
    expect(copy).toContain(HOLY_SHIT_COPY.assistRow);
    expect(copy).toContain(HOLY_SHIT_COPY.assistEnable);
    expect(copy).toContain(HOLY_SHIT_COPY.assistNotNow);
    expect(copy).toContain(HOLY_SHIT_COPY.meetContinue);
    expect(copy).toMatch(/What's your name\?/);
    expect(copy).toMatch(/askSelfName/);
    expect(copy).toMatch(/catch up with/);
    expect(copy).toMatch(/Choose from contacts|Select from contacts/);
    expect(copy).toMatch(/A few permissions help me take care of you/);
    expect(copy).toMatch(/Find your people/);
    expect(copy).toMatch(/Never double-book you/);
    expect(copy).toMatch(/Nudges at the right time/);
    expect(copy).toMatch(/Spots near you/);
    expect(copy).toMatch(/Let Opal place calls and make reservations/);
    expect(copy).not.toMatch(/Find in contacts/);
    expect(copy).not.toMatch(/Add them fresh/);
    expect(copy).not.toMatch(/3–5 people/);
    expect(meet).toMatch(/ContactSuggestPicker|requestNativeContacts|nav\.contacts\.select/);
    expect(meet).toMatch(/hs-resolve-contacts/);
    expect(meet).toMatch(/hs-friend-or|peopleOr/);
    expect(meet).toMatch(/hs-friend-skip/);
    expect(meet).toMatch(/contactsUnavailable|contactsUnavailableTyping|couldn't access your contacts/i);
    expect(meet).toMatch(/confirmContact|Got \$\{name\}/);
    expect(meet).not.toMatch(/hs-people-tags/);
    expect(meet).not.toMatch(/ask_vibe_mode/);
    // Permissions compact rows on the same page
    expect(copy).toMatch(/MEET_OPAL_PERMISSION_ORDER/);
    expect(MEET_OPAL_PERMISSION_ORDER).toEqual([
      "contacts",
      "calendar",
      "notifications",
      "location",
    ]);
    expect(copy).toMatch(/permContactsWhy/);
    expect(copy).toMatch(/permCalendarWhy/);
    expect(copy).toMatch(/permNotificationsWhy/);
    expect(copy).toMatch(/permLocationWhy/);
    expect(meet).toMatch(/hs-perm-list/);
    expect(meet).toMatch(/hs-perm-row/);
    expect(meet).toMatch(/hs-perm-allow/);
    expect(meet).toMatch(/hs-perm-skip/);
    expect(meet).toMatch(/Notification\.requestPermission|requestPermission/);
    expect(meet).toMatch(/geolocation|location/);
    expect(meet).not.toMatch(/window\.location\.(assign|href)/);
    // Phone gate: Continue without inviting then stay / finish via sticky Continue
    expect(meet).toMatch(/hs-phone-input|pendingPhonePerson/);
    expect(meet).toMatch(/phoneSkipInvite|hs-phone-skip-invite/);
    // Skip / resume still wired (advanceMeetOpalToAuth → fr08)
    expect(meet).toMatch(/onSkipToAuth/);
    expect(app).toMatch(/advanceMeetOpalToAuth/);
    expect(app).toMatch(/onAfterPhoneVerify/);
    expect(app).toMatch(/handleAfterPhoneVerify/);
    expect(gate).toMatch(/opal_founder_seed/);
    expect(app).toMatch(/consumeResetFirstRunFlag/);
    // W5: greeting → form (no multi-screen ask_* gates)
    const phaseBlock = copy.slice(copy.indexOf("export type MeetOpalPhase"));
    expect(phaseBlock).toMatch(/"greeting"/);
    expect(phaseBlock).toMatch(/"form"/);
    expect(phaseBlock).not.toMatch(/ask_more|ask_when|ask_vibe|"working"|"trust"/);
    expect(meet).toMatch(/ASK_NAME_PAUSE_MS = 800/);
    expect(meet).toMatch(/GREETING_SLIDE_MS = 400/);
    expect(meet).toMatch(/TYPING_MS = 650/);
    // Paste W2 1.2 — contacts status above inputs; never absolute overlay
    expect(meet).toMatch(/Paste W2 1\.2 HARD RULE|status ABOVE/);
    const peopleComposerIdx = meet.indexOf('data-testid="hs-name-composer"');
    const statusIdx = meet.indexOf("hs-contacts-status", peopleComposerIdx);
    const nameInputIdx = meet.indexOf("hs-name-input", peopleComposerIdx);
    expect(statusIdx).toBeGreaterThan(peopleComposerIdx);
    expect(nameInputIdx).toBeGreaterThan(statusIdx);
    // Single-page document order: greeting → name → friend → perms → assist → sticky continue
    const greetIdx = meet.indexOf("hs-opal-greeting");
    const selfNameIdx = meet.indexOf("hs-self-name-input");
    const friendIdx = meet.indexOf("hs-name-input");
    const permIdx = meet.indexOf("hs-perm-list");
    const assistIdx = meet.indexOf("hs-assist-row");
    const continueIdx = meet.indexOf("hs-meet-continue");
    expect(greetIdx).toBeGreaterThan(-1);
    expect(selfNameIdx).toBeGreaterThan(greetIdx);
    expect(friendIdx).toBeGreaterThan(selfNameIdx);
    expect(permIdx).toBeGreaterThan(friendIdx);
    expect(assistIdx).toBeGreaterThan(permIdx);
    expect(continueIdx).toBeGreaterThan(assistIdx);
  });

  it("suggestUsernameFromName strips non-alphanumeric (no underscores)", () => {
    expect(suggestUsernameFromName("Sadeil")).toBe("sadeil");
    expect(suggestUsernameFromName("Sadeil Mae")).toBe("sadeilmae");
    expect(suggestUsernameFromName("  Alex-Ray  ")).toBe("alexray");
    expect(suggestUsernameFromName("")).toBe("");
  });

  it("Moment 4 OpalWorking module keeps vibe-driven spots + honest calendar", () => {
    const working = src("OpalWorking.tsx");
    const copy = src("holyShitCopy.ts");
    const meet = src("MeetOpalConversation.tsx");
    expect(working).toMatch(/STEP_MS = 900/);
    expect(working).toMatch(/x: 48/);
    expect(working).toMatch(/CheckMark/);
    expect(working).toMatch(/fixtureSpotsForVibe/);
    expect(working).toMatch(/stepCalendarGrace/);
    expect(working).toMatch(/opal-working-or-type-place|opal-working-none-of-these/);
    expect(working).toMatch(/Or type a place|customPlace|orTypeAPlace/);
    expect(working).toMatch(/opal-working-connect-calendar|connectCalendar/);
    expect(working).toMatch(/plansReadyNamed|plans ready:/);
    expect(copy).toMatch(/Checking your calendar/);
    expect(copy).toMatch(/Finding spots/);
    expect(copy).toMatch(/I'll figure out when works for you|don't have your calendar yet|Connect calendar/);
    expect(copy).toMatch(/don't have .* recommendations yet/i);
    expect(copy).toMatch(/Or type a place/);
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

    // Calendar connect/dismiss stays in planning with day proposals — never home dump.
    expect(working).not.toMatch(/window\.location\.assign/);
    expect(working).not.toMatch(/\?opal_connect_calendar=/);
    expect(working).toMatch(/resolveCalendarStayInThread/);
    expect(working).toMatch(/opal-working-day-proposals/);
    expect(working).toMatch(/proposePlanningDays|onPickDayProposal/);
    expect(working).toMatch(/calendarConnectedDays|calendarDismissedDays|calendarConnectUnavailableDays/);
    expect(working).toMatch(/connected \? "connected" : "unavailable"/);
    // Phase 0 Meet path no longer mounts OpalWorking; contact persist still via resolve
    expect(meet).toMatch(/contacts\/resolve/);
    expect(meet).not.toMatch(/onboarding\/contact/);
    expect(meet).toMatch(/checkCalendarConnected/);
    expect(copy).toMatch(/Calendar's connected/);
    expect(copy).toMatch(/Calendar connect isn't set up yet/);
    expect(copy).toMatch(/No problem\. I'll work around it|No problem\. How about/);
  });

  it("calendar connect/dismiss resume copy proposes concrete days", () => {
    const days = proposePlanningDays(new Date("2026-10-08T15:00:00")); // Thursday
    expect(days.length).toBeGreaterThanOrEqual(2);
    expect(days.length).toBeLessThanOrEqual(3);
    const label = formatDayOptions(days);
    expect(label).toMatch(/or/);
    const connected = HOLY_SHIT_COPY.calendarConnectedDays("Maya", "Dinner", label);
    const unavailable = HOLY_SHIT_COPY.calendarConnectUnavailableDays(
      "Maya",
      "Dinner",
      label,
    );
    const dismissed = HOLY_SHIT_COPY.calendarDismissedDays("Maya", "Dinner", label);
    expect(connected).toMatch(/Calendar's connected/);
    expect(connected).toMatch(/How about .+ for dinner with Maya/);
    expect(unavailable).toMatch(/Calendar connect isn't set up yet/);
    expect(unavailable).toMatch(/How about .+ for dinner with Maya/);
    expect(dismissed).toMatch(/No problem\./);
    expect(dismissed).toMatch(/How about .+ for dinner with Maya/);
    // Never leave at vague figure-it-out after resolve.
    expect(connected).not.toMatch(/I'll figure out when works/);
    expect(dismissed).not.toMatch(/I'll figure out when works/);
    expect(unavailable).not.toMatch(/I'll figure out when works/);
    // Connected copy only for real connect — unavailable must not claim connected/check.
    expect(unavailable).not.toMatch(/Calendar's connected/);
    expect(unavailable).not.toMatch(/I'll check your availability/);
  });

  it("Moment 5 trust contract module exact will/won't copy", () => {
    const trust = src("TrustContractCard.tsx");
    const copy = src("holyShitCopy.ts");
    expect(trust).toMatch(/HOLY_SHIT_COPY\.trustPreviewLead/);
    expect(trust).toMatch(/createInvitation|createProductInvite/);
    expect(trust).toMatch(/trustSentLead|trustSendFailed/);
    expect(trust).toMatch(/hs-trust/);
    expect(trust).toMatch(/OpalPresenceOrb/);
    // B1 — keep I WILL / I WON'T consent block
    expect(copy).toContain(HOLY_SHIT_COPY.willSend);
    expect(copy).toContain(HOLY_SHIT_COPY.wontCalendar);
    expect(copy).toContain(HOLY_SHIT_COPY.wontAnyoneElse);
    expect(copy).toContain(HOLY_SHIT_COPY.wontBook);
    expect(copy).toMatch(/Send it/);
    expect(copy).toMatch(/Not yet/);
    // Preview lead must not promise delivery before send succeeds.
    expect(HOLY_SHIT_COPY.trustPreviewLead("Maya")).toMatch(/^Message for Maya:/);
    expect(HOLY_SHIT_COPY.trustPreviewLead("Maya")).not.toMatch(/I'll message/);
    expect(HOLY_SHIT_COPY.trustSentLead("Maya")).toMatch(/^Sent to Maya:/);
    // Paste W 1.4 — no-phone is not a dead end
    expect(trust).toMatch(/trustContinueWithoutSend|trust-continue-no-phone/);
  });

  it("Paste W 1.1 splash top clear nudges clip padding only", () => {
    const promise = src("FirstRunPromisePage.tsx");
    const css = readFileSync(resolve(root, "../styles.css"), "utf8");
    expect(promise).toMatch(/data-promise-top-clear/);
    expect(css).toMatch(
      /\.first-run-promise-clip[\s\S]*?padding-top:\s*8px/,
    );
    expect(css).toMatch(
      /\.first-run-promise-status-crop[\s\S]*?height:\s*40px/,
    );
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
    // Paste W2 3.2 character + 2.1 single border + 1.2 no-cover rule
    expect(hs).toMatch(/hs-orb-character-img|hs-orb-character/);
    expect(hs).toMatch(/Paste W2 2\.1|single gradient border/);
    expect(hs).toMatch(/Paste W2 1\.2 HARD RULE/);
    expect(hs).toMatch(
      /\.hs-contacts-status[\s\S]*?position:\s*relative\s*!important/s,
    );
    // Paste W4 permission / friend dual-path
    expect(hs).toMatch(/\.hs-perm-list/);
    expect(hs).toMatch(/\.hs-perm-row/);
    expect(hs).toMatch(/\.hs-friend-or/);
    expect(hs).toMatch(/\.hs-friend-skip/);
    // Paste W5 sticky Continue + Assist row
    expect(hs).toMatch(/\.hs-meet-sticky-continue/);
    expect(hs).toMatch(/\.hs-assist-row/);
    // Paste W4 Phase 2 — centered send + document-flow composers (no absolute overlay)
    expect(hs).toMatch(/Paste W4 Phase 2|Paste W4 2\.1/);
    expect(hs).toMatch(
      /\.hs-meet-composer\.opal-composer-brand[\s\S]*?align-items:\s*center/s,
    );
    expect(hs).toMatch(
      /\.hs-meet-send\s*\{[^}]*align-self:\s*center/s,
    );
    expect(hs).toMatch(
      /\.hs-meet-opal\s*>\s*\.hs-people-composer[\s\S]*?position:\s*relative\s*!important/s,
    );
    expect(hs).toMatch(/\.hs-dual-path/);
  });
});
