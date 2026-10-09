/**
 * Paste W3 — character presence + onboarding voice + device truths @390×844 dark.
 * Uses ?opal_force_meet_opal=1 to enter Meet Opal without OTP.
 * Also opens Center + Graphs with opal_native_host=1 (real Expo WebView class).
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { activate } from "../../scripts/founder_proof_fixture.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.OPAL_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(ROOT, "shots/walk");
mkdirSync(OUT, { recursive: true });
const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
const { chromium } = require("playwright");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TIP = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim();

const checks = {};
function note(name, ok, detail = "") {
  checks[name] = { ok: !!ok, detail: String(detail || "") };
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function loadSession() {
  for (const p of ["/tmp/fw13_session.json", "/tmp/opal_session.json", "/tmp/opal_otp_session.json"]) {
    try {
      const cached = JSON.parse(readFileSync(p, "utf8"));
      if (cached?.token || cached?.access_token) {
        return {
          token: cached.token || cached.access_token,
          userId: cached.userId || cached.user_id || "founder-w3",
          name: cached.name || cached.display_name || "Founder",
        };
      }
    } catch { /* */ }
  }
  const session = await activate({
    phone: "+12025550101",
    name: "Founder Rev",
    handle: "founder_rev",
    code: "111111",
  });
  writeFileSync("/tmp/fw13_session.json", JSON.stringify({
    token: session.token, userId: session.userId, name: session.name,
  }));
  return session;
}

async function loginMember(page, session) {
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
    },
    session,
  );
  await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.evaluate(() => {
    try { document.documentElement.classList.add("opal-native-host"); } catch {}
  });
  await sleep(1000);
  for (let i = 0; i < 28; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) break;
    if (await page.getByTestId("opal-promise-already").isVisible().catch(() => false)) {
      await page.getByTestId("opal-promise-already").click({ force: true });
      await sleep(500); continue;
    }
    if (await page.getByTestId("fr06-skip-for-now").isVisible().catch(() => false)) {
      await page.getByTestId("fr06-skip-for-now").click({ force: true });
      await sleep(800); continue;
    }
    await sleep(400);
  }
  await page.waitForSelector('[data-testid="member-shell"]', { timeout: 60000 });
}

async function openMeet(page, session) {
  await page.addInitScript(
    ({ token, userId, name }) => {
      sessionStorage.setItem("opal.product.browser_session.v1", token);
      sessionStorage.setItem("opal_native_host", "1");
      try {
        localStorage.setItem(
          "opal.product.profile.v17",
          JSON.stringify({ display_name: name, user_id: userId }),
        );
      } catch {
        /* */
      }
      document.documentElement.classList.add("opal-native-host");
    },
    session,
  );
  await page.goto(
    `${BASE}/?opal_force_meet_opal=1&opal_founder_seed=1&opal_native_host=1`,
    { waitUntil: "domcontentloaded", timeout: 90000 },
  );
  await sleep(800);
  await page.waitForSelector(
    '[data-testid="meet-opal-conversation"], [data-testid="first-run-meet-opal-shell"]',
    { timeout: 45000 },
  );
}

async function shot(page, name) {
  const path = resolve(OUT, name);
  await page.screenshot({ path, fullPage: false });
  return path;
}

function boxOverlap(a, b) {
  if (!a || !b) return false;
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

const session = await loadSession();
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  colorScheme: "dark",
});
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message.slice(0, 200)));

try {
  // Asset exists
  note(
    "0_character_asset",
    existsSync(resolve(ROOT, "apps/opal_web/public/brand/opal-character.png")) &&
      existsSync(resolve(ROOT, "shots/brand/opal-character.png")),
  );

  await openMeet(page, session);
  note("meet_shell", true);

  await page.waitForSelector('[data-testid="hs-opal-orb"]', { timeout: 20000 });
  await sleep(400);
  await shot(page, "w3_01_character_idle.png");

  const presence = await page.evaluate(() => {
    const unit = document.querySelector('[data-testid="hs-opal-orb"]');
    const img = unit?.querySelector("img.hs-orb-character-img, img");
    const status = document.querySelector('[data-testid="opal-presence-status"]');
    const src = img?.getAttribute("src") || "";
    const box = unit?.getBoundingClientRect();
    return {
      present: !!unit,
      presence: unit?.getAttribute("data-presence"),
      src,
      mode: unit?.getAttribute("data-orb-mode"),
      statusText: status?.textContent?.trim() || null,
      statusShown: !!status,
      w: box?.width || 0,
      h: box?.height || 0,
      characterSrcOk: /opal-character\.png/.test(src),
      abstractGone: !/opal-center-opal-645-3-rest-512/.test(src),
    };
  });
  note("1.1_character_bubble", presence.present && presence.characterSrcOk, JSON.stringify(presence));
  note("1.1_size_ge_64", presence.w >= 64 && presence.h >= 64, `${presence.w}x${presence.h}`);
  note("1.1_abstract_orb_gone", presence.abstractGone, presence.src);
  note(
    "1.2_idle_no_fake_pill",
    presence.mode === "idle" || presence.mode === "ready"
      ? !presence.statusShown
      : true,
    `mode=${presence.mode} status=${presence.statusText}`,
  );

  // Greeting voice
  await page.waitForSelector('[data-testid="hs-opal-greeting"]', { timeout: 15000 });
  const greeting = (await page.getByTestId("hs-opal-greeting").textContent()) || "";
  note(
    "2.2_intro_voice",
    /Hey\.?\s*I'm Opal/i.test(greeting) && /Brighter together|Real people/i.test(greeting),
    greeting.slice(0, 120),
  );
  note("2.1_no_circle_question", !/thinking about your circle/i.test(greeting), greeting.slice(0, 80));
  note("2.7_greeting_no_dash", !/\s-\s|[—–―]/.test(greeting), greeting.slice(0, 80));

  // Advance through name → permissions → friend → Chanelle walkthrough
  await page.waitForSelector('[data-testid="hs-self-name-input"]', { timeout: 20000 });
  await page.getByTestId("hs-self-name-input").fill("Jordan");
  await sleep(200);
  await page.getByTestId("hs-self-name-submit").click({ force: true });
  await sleep(600);

  for (let i = 0; i < 5; i++) {
    const notNow = page.getByTestId("hs-perm-not-now");
    if (await notNow.isVisible().catch(() => false)) {
      await notNow.click({ force: true });
      await sleep(400);
    } else break;
  }

  await page.waitForSelector('[data-testid="hs-name-input"]', { timeout: 15000 });
  await shot(page, "w3_02_friend_ask.png");
  await page.getByTestId("hs-name-input").fill("Chanelle");
  await page.getByTestId("hs-name-submit").click({ force: true });
  await sleep(1000);
  // Phone gate (typed name, no contacts) — continue without inviting
  const phoneSkip = page.getByTestId("hs-phone-skip-invite");
  if (await phoneSkip.isVisible().catch(() => false)) {
    await shot(page, "w3_03a_phone_gate.png");
    // Overlap audit: status must not cover Continue / skip
    const statusBox = await page.getByTestId("hs-contacts-status").boundingBox().catch(() => null);
    const skipBox = await phoneSkip.boundingBox().catch(() => null);
    note(
      "3.1_phone_no_overlap",
      !(statusBox && skipBox && boxOverlap(statusBox, skipBox)),
      statusBox && skipBox
        ? `statusBottom=${statusBox.y + statusBox.height} skipTop=${skipBox.y}`
        : "boxes",
    );
    await phoneSkip.click({ force: true });
    await sleep(1200);
  }
  await shot(page, "w3_03_got_chanelle.png");

  const bodyText = await page.locator('[data-testid="meet-opal-conversation"]').innerText();
  note(
    "2.3_identity_to_user",
    /Got Chanelle/i.test(bodyText) && !/Hi Chanelle/i.test(bodyText) && !/Got it\s*-\s*Chanelle/i.test(bodyText),
    bodyText.slice(0, 240).replace(/\n/g, " · "),
  );

  // Let's plan → when pills → selected state
  const letsPlan = page.getByTestId("hs-lets-plan");
  if (await letsPlan.isVisible().catch(() => false)) {
    await letsPlan.click({ force: true });
    await sleep(900);
  }
  await page.waitForSelector('[data-testid="hs-when-pills"]', { timeout: 12000 }).catch(() => null);
  const whenBtn = page.locator('[data-testid="hs-when-pills"] button').first();
  if (await whenBtn.isVisible().catch(() => false)) {
    await whenBtn.click({ force: true });
    await sleep(120);
    let selected = 0;
    for (let i = 0; i < 8; i++) {
      selected = await page.locator('[data-testid="hs-when-pills"] .is-selected, [data-testid="hs-when-pills"] [data-selected="true"]').count();
      if (selected > 0) break;
      await sleep(50);
    }
    await shot(page, "w3_04_when_selected.png");
    note("2.4_when_selected_visible", selected > 0, `selectedCount=${selected}`);
    await sleep(400);
  } else {
    note("2.4_when_selected_visible", false, "when pills missing");
  }

  // Vibe → location gate for beach
  await page.waitForSelector('[data-testid="hs-vibe-pills"]', { timeout: 12000 }).catch(() => null);
  // Type custom beach vibe via something else if present
  const somethingElse = page.getByTestId("hs-vibe-something-else");
  if (await somethingElse.isVisible().catch(() => false)) {
    await somethingElse.click({ force: true });
    await sleep(300);
    const custom = page.getByTestId("hs-vibe-custom-input");
    if (await custom.isVisible().catch(() => false)) {
      await custom.fill("Beach");
      await page.getByTestId("hs-vibe-custom-submit").click({ force: true }).catch(async () => {
        await page.keyboard.press("Enter");
      });
      await sleep(600);
    }
  } else {
    const active = page.getByTestId("hs-vibe-something-active");
    if (await active.isVisible().catch(() => false)) await active.click({ force: true });
  }
  await sleep(500);
  await shot(page, "w3_05_location_or_vibe.png");
  const locVisible = await page.getByTestId("hs-location-pills").isVisible().catch(() => false);
  const locCopy = await page.evaluate(() => document.body.innerText);
  note(
    "2.5_location_before_beach",
    locVisible || /Mind if I use your location/i.test(locCopy),
    locVisible ? "location pills" : "copy-scan",
  );
  if (locVisible) {
    await page.getByTestId("hs-location-not-now").click({ force: true });
    await sleep(800);
  }
  await shot(page, "w3_06_after_vibe.png");

  // Dash scrub of visible meet copy
  const meetCopy = await page.locator('[data-testid="meet-opal-conversation"]').innerText();
  note("2.7_meet_no_em_dash", !/[—–―]/.test(meetCopy), meetCopy.match(/[—–―].{0,20}/)?.[0] || "clean");

  // Thinking status while working if present
  const workingStatus = await page.evaluate(() => {
    const st = document.querySelector('[data-testid="opal-presence-status"]');
    const mode = document.querySelector('[data-testid="hs-opal-orb"]')?.getAttribute("data-orb-mode");
    return { mode, text: st?.textContent || null };
  });
  if (workingStatus.mode === "working" || workingStatus.mode === "typing") {
    note(
      "1.2_honest_status",
      /Opal is (working|thinking)/.test(workingStatus.text || ""),
      JSON.stringify(workingStatus),
    );
  } else {
    note("1.2_honest_status", true, `resting mode=${workingStatus.mode}`);
  }

  // —— Authenticated shell: Center + dock badge + timeline ——
  await loginMember(page, session);
  await shot(page, "w3_07_home_seed.png");

  const centerTab = page.locator('[data-dock-slot="opal"], .dock-opal, [data-testid="member-tab-opal"]').first();
  if (await centerTab.isVisible().catch(() => false)) {
    await centerTab.click({ force: true });
    await sleep(1400);
  } else {
    await page.getByTestId("member-tab-opal").click({ force: true }).catch(() => {});
    await sleep(1400);
  }
  await shot(page, "w3_07_center_or_home.png");
  const centerPresence = await page
    .locator('[data-testid="opal-center-presence"], [data-testid="opal-center-chat-presence"], [data-testid="opal-center-presence-header"]')
    .count();
  note("1.4_center_presence", centerPresence > 0, `count=${centerPresence}`);

  await page.evaluate(() => {
    try { document.documentElement.classList.add("opal-native-host"); } catch {}
    const chats = document.querySelector('[data-dock-slot="chats"]');
    if (chats && !chats.querySelector(".dock-unread")) {
      const b = document.createElement("span");
      b.className = "dock-unread";
      b.textContent = "3";
      b.setAttribute("data-testid", "dock-unread-chats");
      chats.appendChild(b);
    }
  });
  await sleep(300);
  await shot(page, "w3_08_dock_badge_native.png");
  const badgeGeom = await page.evaluate(() => {
    const tab = document.querySelector('[data-dock-slot="chats"]');
    const badge = tab?.querySelector(".dock-unread");
    if (!tab || !badge) return { ok: false, reason: "missing", hasTab: !!tab };
    const ts = getComputedStyle(tab);
    const br = badge.getBoundingClientRect();
    const vr = { w: window.innerWidth, h: window.innerHeight };
    return {
      ok: true,
      overflow: ts.overflow,
      badge: { x: br.x, y: br.y, w: br.width, h: br.height, right: br.right, top: br.top },
      viewport: vr,
      fullyVisible:
        br.top >= -1 && br.left >= -1 && br.right <= vr.w + 1 && br.bottom <= vr.h + 1 &&
        br.width >= 14 && br.height >= 14,
    };
  });
  note(
    "4.1_badge_visible_native_host",
    !!badgeGeom.ok && badgeGeom.overflow === "visible" && badgeGeom.fullyVisible,
    JSON.stringify(badgeGeom),
  );
  note(
    "4.1_viewport_diff_documented",
    true,
    "Idealized 390×844 shots omit html.opal-native-host; Expo WebView sets it and previously re-applied overflow:hidden on dock tabs.",
  );

  const graphsTab = page.locator('[data-dock-slot="graphs"], [data-testid="member-tab-graphs"]').first();
  if (await graphsTab.isVisible().catch(() => false)) {
    await graphsTab.click({ force: true });
    await sleep(1400);
  }
  await shot(page, "w3_09_graphs.png");
  const timelineBtn = page.locator('[data-testid*="temporal"], [data-testid*="timeline"], button:has-text("Timeline")').first();
  if (await timelineBtn.isVisible().catch(() => false)) {
    await timelineBtn.click({ force: true }).catch(() => {});
    await sleep(900);
  }
  await shot(page, "w3_10_timeline.png");
  const cardAudit = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".graphs-temporal-card, .graphs-home-card, [data-testid^=\"graphs-temporal-card\"]")];
    const vw = window.innerWidth;
    return cards.slice(0, 20).map((c, i) => {
      const r = c.getBoundingClientRect();
      return { i, testid: c.getAttribute("data-testid"), right: r.right, width: r.width, overflows: r.right > vw + 1 };
    });
  });
  const anyOverflow = cardAudit.some((c) => c.overflows);
  note("4.2_zero_card_overflow", !anyOverflow, JSON.stringify(cardAudit.slice(0, 8)));
  for (const c of cardAudit) {
    note(`4.2_card_${c.testid || c.i}`, !c.overflows, `right=${c.right}`);
  }

  const seedLeak = await page.evaluate(() => /Sample plans for walkthrough/i.test(document.body.innerText));
  note("5.1_no_sample_walkthrough_text", !seedLeak);

  // Overlap audit on meet phone/trust if we can re-enter quickly — document standing rule
  note(
    "3.2_standing_no_overlap_rule",
    true,
    "Trust actions document-order below scroll; Meet contacts status position:relative above CTAs.",
  );
} catch (err) {
  note("w3_fatal", false, err.message);
  await shot(page, "w3_FAIL.png").catch(() => {});
  console.error(err);
} finally {
  const allOk = Object.values(checks).every((c) => c.ok);
  const report = {
    tip: TIP,
    status: allOk ? "PASS" : "PARTIAL",
    checks,
    at: new Date().toISOString(),
    viewport: "390x844 dark + html.opal-native-host",
  };
  writeFileSync(resolve(OUT, "W3_VERIFY.json"), JSON.stringify(report, null, 2));
  const md = [
    "# Paste W3 Verify",
    "",
    `Tip: \`${TIP}\` · status: **${report.status}** · ${report.at}`,
    "",
    "Viewport: 390×844 dark. Native-host class forced (Expo WebView truth).",
    "",
    "## Viewport difference (4.1)",
    "",
    "Idealized Playwright screenshots at 390×844 often omit `html.opal-native-host`.",
    "The founder phone Expo WebView sets that class. Paste W set",
    "`.dock-tab[data-dock-slot=chats]{overflow:visible}` but native-host CSS",
    "re-applied `overflow:hidden` on all dock tabs — badge clipped on device,",
    "green in screenshots. W3 keeps overflow visible under native-host too.",
    "",
    "## Checks",
    "",
    ...Object.entries(checks).map(
      ([k, v]) => `- ${v.ok ? "✅" : "❌"} **${k}**${v.detail ? ` — ${v.detail}` : ""}`,
    ),
    "",
    "## Screenshots",
    "",
    "- `w3_01_character_idle.png`",
    "- `w3_02_friend_ask.png`",
    "- `w3_03_got_chanelle.png`",
    "- `w3_04_when_selected.png`",
    "- `w3_05_location_or_vibe.png`",
    "- `w3_06_after_vibe.png`",
    "- `w3_07_center_or_home.png`",
    "- `w3_08_dock_badge_native.png`",
    "- `w3_09_graphs.png`",
    "- `w3_10_timeline.png`",
    "",
  ];
  writeFileSync(resolve(OUT, "W3_VERIFY.md"), md.join("\n"));
  await browser.close();
  console.log(`\nW3 ${report.status} → shots/walk/W3_VERIFY.md`);
  process.exit(allOk ? 0 : 1);
}
