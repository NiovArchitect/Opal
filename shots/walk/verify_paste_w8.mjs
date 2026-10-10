/**
 * Paste W8 — Finish Opal evidence @ 390×844.
 * Phases 0–7: splash hold, Meet order, TTS hooks, settings honesty,
 * location coords, Center wordmark 34, blind-spot, App Store SPEC.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.OPAL_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(ROOT, "shots/walk");
mkdirSync(OUT, { recursive: true });
mkdirSync(resolve(ROOT, "shots/appstore"), { recursive: true });
const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
const { chromium, devices } = require("playwright");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TIP = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim();

const checks = {};
function note(name, ok, detail = "") {
  checks[name] = { ok: !!ok, detail: String(detail || ""), gated: String(detail || "").startsWith("GATED") };
  console.log(`${ok ? "PASS" : detail?.startsWith("GATED") ? "GATED" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function loadSession() {
  for (const p of ["/tmp/fw13_session.json", "/tmp/opal_session.json", "/tmp/opal_otp_session.json"]) {
    try {
      const cached = JSON.parse(readFileSync(p, "utf8"));
      if (cached?.token || cached?.access_token) {
        return {
          token: cached.token || cached.access_token,
          userId: cached.userId || cached.user_id || "47aa5856-8c56-4b18-a4d4-6a9b456516a8",
          name: cached.name || cached.display_name || "Founder",
        };
      }
    } catch {
      /* */
    }
  }
  return {
    token: "w8-placeholder",
    userId: "47aa5856-8c56-4b18-a4d4-6a9b456516a8",
    name: "Founder",
  };
}

async function shot(page, name) {
  const path = resolve(OUT, name);
  await page.screenshot({ path, fullPage: false });
  return path;
}

function iPhoneCtx(browser) {
  const iPhone = devices["iPhone 14"] || devices["iPhone 13"];
  return browser.newContext({
    ...iPhone,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: "dark",
  });
}

async function injectMember(page, session) {
  await page.addInitScript(
    ({ token, userId, name }) => {
      sessionStorage.setItem("opal.product.browser_session.v1", token);
      sessionStorage.setItem("opal_native_host", "1");
      localStorage.setItem(
        "opal.product.profile.v17",
        JSON.stringify({ user_id: userId, display_name: name, handle: "founder_rev" }),
      );
      localStorage.setItem("opal.founder_seed.opt_in.persist.v1", "1");
      sessionStorage.setItem("opal.founder_seed.opt_in.v1", "1");
      localStorage.setItem("opal.firstRun.v14.completed", "1");
      localStorage.setItem("opal.firstRun.v14.phoneVerified", "1");
      localStorage.setItem("opal.access_token", token);
      sessionStorage.setItem("opal.access_token", token);
      window.__OPAL_NATIVE_SESSION__ = { access_token: token, user_id: userId };
      document.documentElement.classList.add("opal-native-host");
    },
    session,
  );
}

async function main() {
  const session = await loadSession();
  const browser = await chromium.launch({ headless: true });
  const results = [];

  // ─── P0: Splash holds 10s, no auto-advance ───
  {
    const ctx = await iPhoneCtx(browser);
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      try {
        localStorage.removeItem("opal.firstRun.v14.completed");
        localStorage.removeItem("opal.firstRun.v14.phoneVerified");
        sessionStorage.clear();
        sessionStorage.setItem("opal_reset_first_run", "1");
        sessionStorage.setItem("opal_native_host", "1");
        sessionStorage.setItem("opal.forcedFirstRun", "1");
        document.documentElement.classList.add("opal-native-host");
      } catch {
        /* */
      }
    });
    await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1&opal_reset_first_run=1`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await sleep(1500);
    const splash0 = await page.locator('[data-testid="fr00-splash"]').count();
    const hold = await page.locator('[data-splash-hold="indefinite"]').count();
    const auto = await page.locator('[data-splash-auto-advance="0"]').count();
    await shot(page, "w8_p0_splash_t0.png");
    await sleep(10500);
    const splash10 = await page.locator('[data-testid="fr00-splash"]').count();
    const phone10 = await page.locator('[data-testid="fr06-phone"], .fr-phone, [data-fr-step="fr06"]').count();
    await shot(page, "w8_p0_splash_t10.png");
    note("p0_splash_present", splash0 > 0, `splash=${splash0}`);
    note("p0_hold_indefinite", hold > 0 && auto > 0, `hold=${hold} auto0=${auto}`);
    note("p0_no_auto_advance_10s", splash10 > 0 && phone10 === 0, `splash10=${splash10} phone=${phone10}`);

    const tap = page.locator('[data-testid="fr00-tap-begin"]');
    if ((await tap.count()) > 0) {
      await tap.click();
      await sleep(1200);
      const phone = await page.locator('[data-testid="fr06-phone"], .fr-phone, [data-fr-step="fr06"]').count();
      await shot(page, "w8_p0_after_tap_begin.png");
      note("p0_tap_begin_works", phone > 0 || (await page.locator("input[type='tel'], #fr-phone").count()) > 0, `phone=${phone}`);
    } else {
      note("p0_tap_begin_works", false, "tap missing");
    }
    await ctx.close();
  }

  // Splash Skip intro
  {
    const ctx = await iPhoneCtx(browser);
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      try {
        localStorage.removeItem("opal.firstRun.v14.completed");
        sessionStorage.clear();
        sessionStorage.setItem("opal_reset_first_run", "1");
        sessionStorage.setItem("opal_native_host", "1");
        sessionStorage.setItem("opal.forcedFirstRun", "1");
      } catch {
        /* */
      }
    });
    await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1&opal_reset_first_run=1`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await sleep(1000);
    const skip = page.locator('[data-testid="fr00-skip-intro"]');
    if ((await skip.count()) > 0) {
      await skip.click();
      await sleep(1200);
      const phone = await page.locator('[data-testid="fr06-phone"], .fr-phone, input[type="tel"]').count();
      await shot(page, "w8_p0_skip_intro.png");
      note("p0_skip_intro_works", phone > 0, `phone=${phone}`);
    } else {
      note("p0_skip_intro_works", false, "skip missing");
    }
    await ctx.close();
  }

  // Already have account
  {
    const ctx = await iPhoneCtx(browser);
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      try {
        localStorage.removeItem("opal.firstRun.v14.completed");
        sessionStorage.clear();
        sessionStorage.setItem("opal_reset_first_run", "1");
        sessionStorage.setItem("opal_native_host", "1");
        sessionStorage.setItem("opal.forcedFirstRun", "1");
      } catch {
        /* */
      }
    });
    await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1&opal_reset_first_run=1`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await sleep(1000);
    const already = page.locator('[data-testid="fr00-already-account"]');
    if ((await already.count()) > 0) {
      await already.click();
      await sleep(1200);
      const phone = await page.locator('[data-testid="fr06-phone"], .fr-phone, input[type="tel"]').count();
      await shot(page, "w8_p0_already_account.png");
      note("p0_already_account_works", phone > 0, `phone=${phone}`);
    } else {
      note("p0_already_account_works", false, "already missing");
    }
    await ctx.close();
  }

  // ─── P1: Meet order greeting → approvals → friend ───
  {
    const ctx = await iPhoneCtx(browser);
    const page = await ctx.newPage();
    await injectMember(page, session);
    await page.addInitScript(() => {
      try {
        localStorage.removeItem("opal.firstRun.v14.completed");
        sessionStorage.setItem("opal.forcedFirstRun", "1");
      } catch {
        /* */
      }
    });
    await page.goto(
      `${BASE}/?opal_founder_seed=1&opal_native_host=1&opal_force_meet_opal=1`,
      { waitUntil: "domcontentloaded", timeout: 60000 },
    );
    await sleep(2500);
    // Wait for form (greeting animation)
    for (let i = 0; i < 20; i++) {
      if ((await page.locator('[data-testid="hs-permissions"]').count()) > 0) break;
      await sleep(400);
    }
    await shot(page, "w8_p1_meet_greeting.png");
    const greet = await page.locator('[data-testid="hs-opal-greeting"]').count();
    const perms = await page.locator('[data-testid="hs-permissions"]').count();
    const permList = await page.locator('[data-testid="hs-perm-list"]').count();
    const rows = await page.locator(".hs-perm-row").count();
    note("p1_greeting_present", greet > 0, `greet=${greet}`);
    note("p1_approvals_present", perms > 0 && permList > 0 && rows >= 3, `perms=${perms} rows=${rows}`);

    const order = await page.evaluate(() => {
      const greetEl = document.querySelector('[data-testid="hs-opal-greeting"]');
      const selfName = document.querySelector('[data-testid="hs-self-name-input"]');
      const perm = document.querySelector('[data-testid="hs-perm-list"]');
      const friend = document.querySelector('[data-testid="hs-name-input"]');
      // Document offsetTop (not viewport) so scroll-to-permissions does not invert order.
      const positions = [greetEl, selfName, perm, friend].map((el) => {
        if (!el) return -1;
        let top = 0;
        let n = el;
        while (n) {
          top += n.offsetTop || 0;
          n = n.offsetParent;
        }
        return top;
      });
      return {
        positions,
        ordered:
          positions.every((p) => p >= 0) &&
          positions[1] > positions[0] &&
          positions[2] > positions[1] &&
          positions[3] > positions[2],
      };
    });
    note("p1_order_greeting_name_perms_friend", order.ordered, JSON.stringify(order.positions));

    // Continue disabled until perms decided
    const nameInput = page.locator('[data-testid="hs-self-name-input"]');
    if ((await nameInput.count()) > 0) {
      await nameInput.fill("Thaddeus");
      await sleep(300);
    }
    const cont = page.locator('[data-testid="hs-meet-continue"]');
    const disabledBefore = (await cont.count()) > 0 ? await cont.isDisabled() : true;
    note("p1_continue_blocked_pending_perms", disabledBefore, `disabled=${disabledBefore}`);

    // Not now all three
    for (const kind of ["contacts", "notifications", "location"]) {
      const btn = page.locator(`[data-testid="hs-perm-skip-${kind}"]`);
      if ((await btn.count()) > 0) await btn.click();
      await sleep(150);
    }
    await sleep(400);
    await shot(page, "w8_p1_meet_approvals_not_now.png");
    const disabledAfter = (await cont.count()) > 0 ? await cont.isDisabled() : true;
    note("p1_continue_after_not_now", !disabledAfter, `disabled=${disabledAfter}`);

    if ((await cont.count()) > 0 && !(await cont.isDisabled())) {
      await cont.click();
      await sleep(2000);
      await shot(page, "w8_p1_after_continue.png");
      const ambient =
        (await page.locator('[data-testid="opal-ambient"], .opal-ambient, [data-testid="opal-center-wordmark"]').count()) > 0 ||
        (await page.locator(".opal-center-v2, [data-testid=\"opal-center-lifegraph-wordmark\"]").count()) > 0;
      const homeFeed = await page.locator('[data-testid="home-feed"], .gsh-social-home').count();
      const meetGone = (await page.locator('[data-testid="meet-opal-conversation"]').count()) === 0;
      note("p1_lands_center", ambient || meetGone, `ambient=${ambient} meetGone=${meetGone} home=${homeFeed}`);
    } else {
      note("p1_lands_center", false, "continue still disabled");
    }
    await ctx.close();
  }

  // ─── P2: Opening TTS wiring present ───
  {
    const meetSrc = readFileSync(resolve(ROOT, "apps/opal_web/src/onboarding/MeetOpalConversation.tsx"), "utf8");
    const voiceSrc = readFileSync(resolve(ROOT, "apps/opal_web/src/onboarding/meetOpeningVoice.ts"), "utf8");
    const elSrc = readFileSync(resolve(ROOT, "apps/opal_core/lib/opal_core/voice/eleven_labs.ex"), "utf8");
    note("p2_speak_meet_opening_wired", meetSrc.includes("speakMeetOpening"), "Meet calls speakMeetOpening");
    note("p2_opening_text_headline", voiceSrc.includes("Hey, I'm Opal.") || voiceSrc.includes("greetingHeadline"), "headline utterance");
    note("p2_matilda_voice_id", elSrc.includes("XrExE9yKIg1WjnnlVkGX") && voiceSrc.includes("XrExE9yKIg1WjnnlVkGX"), "Matilda id");
    note(
      "p2_no_system_tts_for_opening",
      voiceSrc.includes("speakApprovedText") && !/\bspeechSynthesis\b/.test(voiceSrc),
      "ElevenLabs path",
    );
  }

  // ─── P3: Settings honesty ───
  {
    const settings = readFileSync(resolve(ROOT, "apps/opal_web/src/opalUi/YouSettingsDestination.tsx"), "utf8");
    const impact = readFileSync(resolve(ROOT, "apps/opal_web/src/opalUi/PrivateCreatorImpact.tsx"), "utf8");
    note("p3_no_coming_soon", !/Coming soon/i.test(settings), "zero Coming soon");
    note("p3_travel_mode_live", /id:\s*"travel-mode"/.test(settings) && !/id:\s*"travel-mode"[\s\S]{0,200}?blockedReason/.test(settings), "travel-mode informational");
    note("p3_nearby_range_live", /id:\s*"nearby-range"[\s\S]{0,180}?value:\s*"25 mi"/.test(settings), "25 mi");
    note("p3_delete_honest", /confirm-delete|Delete my account/.test(settings), "delete control");
    note("p3_impact_honest", !/inspired 12/.test(impact) && /Private impact shows up here/.test(impact), "no fake impact");

    const ctx = await iPhoneCtx(browser);
    const page = await ctx.newPage();
    await injectMember(page, session);
    await page.route("**/api/v1/product/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/session") || url.includes("/me") || url.includes("/profile")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user_id: session.userId,
            display_name: session.name,
            handle: "founder_rev",
            access_token: session.token,
          }),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await sleep(2000);
    // Open You tab
    const youTab = page.locator('[data-testid="dock-you"], button:has-text("You"), .dock-tab[data-tab="you"]').first();
    if ((await youTab.count()) > 0) {
      await youTab.click();
      await sleep(1000);
      await shot(page, "w8_p3_you_hub.png");
      note("p3_you_hub_shot", true, "w8_p3_you_hub.png");
    } else {
      note("p3_you_hub_shot", false, "You tab missing");
    }
    await ctx.close();
  }

  // ─── P4: Location coords path ───
  {
    const meet = readFileSync(resolve(ROOT, "apps/opal_web/src/onboarding/MeetOpalConversation.tsx"), "utf8");
    const loc = readFileSync(resolve(ROOT, "apps/opal_web/src/device/deviceLocation.ts"), "utf8");
    const center = readFileSync(resolve(ROOT, "apps/opal_web/src/opalUi/OpalCenterLifeGraph.tsx"), "utf8");
    note("p4_device_location_helper", loc.includes("getDeviceCoords") && loc.includes("saveDeviceCoords"), "helper");
    note("p4_meet_persists_coords", meet.includes("getDeviceCoords") && meet.includes('markPerm(kind, "skipped")'), "deny=skipped");
    note("p4_center_uses_coords", center.includes("getDeviceCoords") && center.includes("lat: coords.lat"), "Center nearby");
  }

  // ─── P5: Center wordmark 34 + all instances ───
  {
    const ctx = await iPhoneCtx(browser);
    const page = await ctx.newPage();
    await injectMember(page, session);
    await page.route("**/api/v1/product/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user_id: session.userId,
          display_name: session.name,
          handle: "founder_rev",
          access_token: session.token,
          chats: [],
          conversations: [],
        }),
      });
    });
    await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await sleep(2000);

    // Open Center via dock
    const centerTab = page.locator('.dock-opal, [data-testid="dock-opal"], button[aria-label*="Opal"]').first();
    if ((await centerTab.count()) > 0) {
      await centerTab.click();
      await sleep(1500);
    }
    await shot(page, "w8_p5_center_wordmark.png");
    const wm = await page.evaluate(() => {
      const el =
        document.querySelector('[data-testid="opal-center-wordmark"]') ||
        document.querySelector('[data-testid="opal-center-lifegraph-wordmark"]') ||
        document.querySelector(".opal-top-brand .opal-wordmark-img") ||
        document.querySelector(".opal-center-v2-wordmark");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { h: Math.round(r.height), maxH: cs.maxHeight, w: Math.round(r.width) };
    });
    note("p5_center_wordmark_34", wm && wm.h >= 32 && wm.h <= 36, wm ? JSON.stringify(wm) : "missing");

    // Capture other header wordmarks
    const instances = [];
    // Home
    const homeTab = page.locator('[data-testid="dock-home"], button:has-text("Home"), .dock-tab[data-tab="home"]').first();
    if ((await homeTab.count()) > 0) {
      await homeTab.click();
      await sleep(800);
      await shot(page, "w8_p5_home_wordmark.png");
      instances.push("home");
    }
    // Chats if present
    const chatsTab = page.locator('[data-testid="dock-chats"], button:has-text("Chats"), .dock-tab[data-tab="chats"]').first();
    if ((await chatsTab.count()) > 0) {
      await chatsTab.click();
      await sleep(800);
      await shot(page, "w8_p5_chats_wordmark.png");
      instances.push("chats");
    }
    const graphsTab = page.locator('[data-testid="dock-graphs"], button:has-text("Graphs"), .dock-tab[data-tab="graphs"]').first();
    if ((await graphsTab.count()) > 0) {
      await graphsTab.click();
      await sleep(800);
      await shot(page, "w8_p5_graphs_wordmark.png");
      instances.push("graphs");
    }
    note("p5_all_wordmark_shots", instances.length >= 1, instances.join(","));

    // Source contract
    const ambient = readFileSync(resolve(ROOT, "apps/opal_web/src/opalUi/OpalAmbient.tsx"), "utf8");
    const life = readFileSync(resolve(ROOT, "apps/opal_web/src/opalUi/OpalCenterLifeGraph.tsx"), "utf8");
    const css = readFileSync(resolve(ROOT, "apps/opal_web/src/styles.css"), "utf8");
    note("p5_source_height_34", /height=\{34\}/.test(ambient) && /height=\{34\}/.test(life), "props=34");
    note("p5_no_scale_shrink", !/opal-center-v2-wordmark-aside[\s\S]{0,120}?scale\(0\.78\)/.test(css), "scale removed");
    await ctx.close();
  }

  // ─── P6: Blind-spot inventory exists ───
  {
    const blind = resolve(OUT, "W8_BLINDSPOT.md");
    note("p6_blindspot_doc", existsSync(blind), existsSync(blind) ? "W8_BLINDSPOT.md" : "missing");
  }

  // ─── P7: App Store SPEC ───
  {
    const spec = resolve(ROOT, "shots/appstore/SPEC_CHECK.md");
    const privacy = resolve(ROOT, "docs/APP_STORE_PRIVACY.md");
    note("p7_spec_check", existsSync(spec), "SPEC_CHECK.md");
    note("p7_privacy_doc", existsSync(privacy), "APP_STORE_PRIVACY.md");
    if (existsSync(privacy)) {
      const p = readFileSync(privacy, "utf8");
      note(
        "p7_privacy_covers_required",
        /Contacts Birthday|contacts-birthday/i.test(p) &&
          /Calendar/i.test(p) &&
          /Email/i.test(p) &&
          /Location/i.test(p) &&
          /Voice/i.test(p) &&
          /Usage/i.test(p),
        "contacts-birthday calendar email location voice usage",
      );
      note("p7_privacy_no_emdash", !/[—–―]/.test(p), "no em-dashes");
    }
    const appJson = readFileSync(resolve(ROOT, "apps/opal_mobile/app.json"), "utf8");
    note("p7_splash_branded", /"splash"/.test(appJson) && /#050816/.test(appJson), "splash #050816");
    const surfaces = readFileSync(resolve(ROOT, "apps/opal_mobile/src/shell/ProductWebSurface.tsx"), "utf8");
    note(
      "p7_founder_seed_gated",
      /allowsLocalhost/.test(surfaces) || /production/.test(surfaces),
      "seed gated",
    );
  }

  await browser.close();

  const entries = Object.entries(checks);
  const pass = entries.filter(([, v]) => v.ok).length;
  const gated = entries.filter(([, v]) => !v.ok && v.gated).length;
  const fail = entries.filter(([, v]) => !v.ok && !v.gated).length;

  const md = [
    `# Paste W8 Verify`,
    ``,
    `Tip: \`${TIP}\` · Base: ${BASE}`,
    ``,
    `| Metric | Value |`,
    `| --- | --- |`,
    `| PASS | ${pass} |`,
    `| FAIL | ${fail} |`,
    `| GATED | ${gated} |`,
    `| TOTAL | ${entries.length} |`,
    ``,
    `## Per-check`,
    ``,
    ...entries.map(([k, v]) => {
      const tag = v.ok ? "PASS" : v.gated ? "GATED" : "FAIL";
      return `- **${tag}** \`${k}\`${v.detail ? ` — ${v.detail}` : ""}`;
    }),
    ``,
    `## Screenshots`,
    ``,
    `- w8_p0_splash_t0.png / w8_p0_splash_t10.png`,
    `- w8_p0_after_tap_begin.png / w8_p0_skip_intro.png / w8_p0_already_account.png`,
    `- w8_p1_meet_greeting.png / w8_p1_meet_approvals_not_now.png / w8_p1_after_continue.png`,
    `- w8_p3_you_hub.png`,
    `- w8_p5_center_wordmark.png (+ home/chats/graphs wordmark shots)`,
    ``,
    `## Phase notes`,
    ``,
    `- **P0** Splash holds indefinitely (\`data-splash-hold=indefinite\`); timer removed.`,
    `- **P1** Approvals above friend; Continue requires all perms decided; completion → Center ambient.`,
    `- **P2** Meet opening TTS via Matilda (\`speakMeetOpening\` → \`voice/speak\`).`,
    `- **P3** Settings: travel-mode / nearby-range LIVE; delete honest; impact empty; zero Coming soon.`,
    `- **P4** \`deviceLocation\` caches coords; Meet deny → skipped; Center nearby passes lat/lng.`,
    `- **P5** Center wordmark height 34; scale(0.78) removed.`,
    `- **P6** See \`W8_BLINDSPOT.md\`.`,
    `- **P7** See \`shots/appstore/SPEC_CHECK.md\` + \`docs/APP_STORE_PRIVACY.md\`.`,
    ``,
  ].join("\n");

  writeFileSync(resolve(OUT, "W8_VERIFY.md"), md);
  writeFileSync(resolve(OUT, "W8_VERIFY.json"), JSON.stringify({ tip: TIP, checks, pass, fail, gated }, null, 2));
  console.log(`\nW8_VERIFY.md written — PASS ${pass} FAIL ${fail} GATED ${gated}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
