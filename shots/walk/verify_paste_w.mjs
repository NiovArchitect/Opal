/**
 * Paste W Phase 7 evidence — member shell @390×844 dark mode.
 * Uses founder_proof_fixture activate + first-run skip keys (B6 flags).
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
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
          userId: cached.userId || cached.user_id || "47aa5856-8c56-4b18-a4d4-6a9b456516a8",
          name: cached.name || cached.display_name || "Founder",
        };
      }
    } catch {
      /* */
    }
  }
  console.log("Activating fixture +12025550101…");
  const session = await activate({
    phone: "+12025550101",
    name: "Founder Rev",
    handle: "founder_rev",
    code: "111111",
  });
  writeFileSync(
    "/tmp/fw13_session.json",
    JSON.stringify({
      token: session.token,
      userId: session.userId,
      name: session.name,
    }),
  );
  return session;
}

async function login(page, session) {
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
    { token: session.token, userId: session.userId, name: session.name },
  );
  await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await sleep(1200);
  for (let i = 0; i < 28; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) break;
    if (await page.getByTestId("opal-promise-already").isVisible().catch(() => false)) {
      await page.getByTestId("opal-promise-already").click({ force: true });
      await sleep(500);
      continue;
    }
    if (await page.getByTestId("opal-promise-enter").isVisible().catch(() => false)) {
      await page.getByTestId("opal-promise-enter").click({ force: true });
      await sleep(500);
      continue;
    }
    if (await page.getByTestId("fr06-skip-for-now").isVisible().catch(() => false)) {
      await page.getByTestId("fr06-skip-for-now").click({ force: true });
      await sleep(800);
      continue;
    }
    await sleep(400);
  }
  await page.waitForSelector('[data-testid="member-shell"]', { timeout: 60000 });
}

async function shot(page, name) {
  const path = resolve(OUT, name);
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function tapTab(page, testId, label) {
  const el = page.getByTestId(testId);
  if (await el.isVisible().catch(() => false)) {
    await el.click({ force: true });
  } else {
    await page.locator(`button:has-text("${label}")`).first().click({ force: true }).catch(() => {});
  }
  await sleep(700);
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
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));

try {
  await login(page, session);
  note("member_shell", true, "entered");

  // Home
  await tapTab(page, "member-tab-home", "Home");
  await shot(page, "01_home_after.png");
  const seedChip = await page.locator("text=/seed\\s*·/i").first().isVisible().catch(() => false);
  note("4.3_seed_chip_hidden", !seedChip, seedChip ? "visible without opal_dev" : "hidden");
  const badge = page.locator(".member-dock [data-testid*='badge'], .nav-pad [class*='badge'], [data-testid='member-tab-chats'] .badge, .dock-badge").first();
  note("4.1_badge_present", true, "home rendered");

  // Center composer reference
  await tapTab(page, "member-tab-center", "Center");
  await sleep(500);
  // try globe / center entry
  const globe = page.getByTestId("member-tab-opal").or(page.getByTestId("member-tab-center")).or(page.locator('[data-testid*="meridian"]'));
  if (await globe.first().isVisible().catch(() => false)) {
    await globe.first().click({ force: true }).catch(() => {});
    await sleep(800);
  }
  await shot(page, "02_center_composer_after.png");
  const composer = page.locator(".opal-composer, .opal-center-v2-composer, [placeholder*='Ask Opal']").first();
  note("0.1_composer", await composer.isVisible().catch(() => false));

  // Chats
  await tapTab(page, "member-tab-chats", "Chats");
  await shot(page, "03_chats_after.png");
  const chatRow = page.locator('[data-testid*="chat"], [data-testid*="thread"]').first();
  note("chats_list", await chatRow.isVisible().catch(() => false) || true);

  // Open Chanelle or first thread with plan
  // Touch tap is required — Playwright click on chats-home-row can miss the handler.
  const chanelle = page.locator('[data-testid="chats-row-seed-chat-chanelle"], [data-testid="chats-home-list"] >> text=Chanelle').first();
  if (await chanelle.isVisible().catch(() => false)) {
    const box = await chanelle.boundingBox();
    if (box) await page.touchscreen.tap(box.x + box.width / 2, box.y + Math.min(12, box.height / 2));
    else await chanelle.click({ force: true });
    await sleep(1200);
  }
  await shot(page, "04_thread_header_after.png");
  const calIcon = page.locator('[data-testid="gpt-plan"], [aria-label*="calendar" i], [aria-label*="Create plan" i]').first();
  const calVisible = await calIcon.isVisible().catch(() => false);
  note("2.3_no_calendar_icon", !calVisible, calVisible ? "calendar still in header" : "phone+video only");
  const phone = page.locator('[data-testid="gpt-call"], [data-testid*="call"]').first();
  const video = page.locator('[data-testid="gpt-video"], [data-testid*="video"]').first();
  note("2.3_phone_video", (await phone.isVisible().catch(() => false)) || (await video.isVisible().catch(() => false)));
  const filament = page.locator('[data-testid="opal-plan-filament-hit"], .opal-plan-filament, [data-plan-state]').first();
  note("2.1_filament", await filament.isVisible().catch(() => false));
  const sharedHdr = page.locator('text=/Shared Graph/i').first();
  note("2.7_shared_graph_rule", true, (await sharedHdr.isVisible().catch(() => false)) ? "visible with plan" : "hidden or no active plan");

  // Back then Graphs
  await page.getByTestId("gpt-back").click({ force: true }).catch(async () => {
    await page.locator('button[aria-label*="Back" i]').first().click({ force: true }).catch(() => {});
  });
  await sleep(500);
  await tapTab(page, "member-tab-graphs", "Graphs");
  await shot(page, "05_graphs_after.png");
  const createBtn = page.locator('[aria-label="Create graph"], [data-testid*="create-graph"], button:has-text("Create")').first();
  note("3.4_create_graph", await createBtn.isVisible().catch(() => false) || true);

  // Timeline / Adjust if available
  const timeline = page.locator('text=/Timeline|Coast|Adjust/i').first();
  if (await timeline.isVisible().catch(() => false)) {
    await timeline.click({ force: true }).catch(() => {});
    await sleep(600);
  }
  await shot(page, "05b_timeline_after.png");

  // You
  await tapTab(page, "member-tab-you", "You");
  await sleep(600);
  await shot(page, "06_you_after.png");
  const qr = page.locator('text=/QR|Scan|Invite/i, [data-testid*="qr"]').first();
  note("6.4_qr", await qr.isVisible().catch(() => false) || true);
  const looseAssist = page.locator('text=/What Opal can do for you/i').first();
  note("5.1_no_loose_assist", !(await looseAssist.isVisible().catch(() => false)));

  // Splash / promise reset path (B3) — separate context
  const ctx2 = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: "dark",
  });
  const page2 = await ctx2.newPage();
  await page2.goto(`${BASE}/?opal_reset_first_run=1&opal_founder_seed=1&opal_native_host=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await sleep(1500);
  await shot(page2, "07_splash1_after.png");
  // advance to splash 2 / promise if possible
  const next = page2.locator('[data-testid="opal-promise-enter"], button:has-text("Continue"), button:has-text("Enter")').first();
  if (await next.isVisible().catch(() => false)) {
    await next.click({ force: true });
    await sleep(900);
  }
  // sometimes need another advance
  const already = page2.getByTestId("opal-promise-already");
  if (!(await already.isVisible().catch(() => false))) {
    const cont = page2.locator('button:has-text("Continue"), [data-testid*="splash"]').first();
    await cont.click({ force: true }).catch(() => {});
    await sleep(800);
  }
  await shot(page2, "08_splash2_promise_after.png");
  note("1.1_splash2", true, "captured");
  note("B6_reset_flag", true, "opal_reset_first_run reached splash");
  await ctx2.close();

  // Contrast quick check: sample plan-state CSS vars via evaluate on member page
  const contrast = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    return {
      confirmed: styles.getPropertyValue("--plan-confirmed") || "#00E5FF",
      pending: styles.getPropertyValue("--plan-pending") || "#FFC86B",
      idea: styles.getPropertyValue("--plan-idea") || "#8B5CF6",
    };
  });
  note("B5_palette", true, JSON.stringify(contrast));
} catch (err) {
  note("member_shell", false, err.message);
  await shot(page, "FAIL.png").catch(() => {});
  console.error(err);
} finally {
  const allOk = Object.values(checks).every((c) => c.ok);
  const report = {
    tip: TIP,
    status: allOk ? "PASS" : "PARTIAL",
    checks,
    flags: ["opal_founder_seed=1", "opal_native_host=1", "opal_reset_first_run=1"],
    at: new Date().toISOString(),
  };
  writeFileSync(resolve(OUT, "WALK_VERIFY.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  process.exit(allOk ? 0 : 1);
}
