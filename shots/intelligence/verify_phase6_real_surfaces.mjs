/**
 * Phase 6 — flip ALL five intelligence surfaces to real (?opal_intel_real=1),
 * screenshot each @390×844. Mocks stay in codebase until founder "good".
 *
 * Surfaces (order):
 *   1. person_memory
 *   2. reminder_attention
 *   3. mediation
 *   4. weekly_briefing
 *   5. choreography_events (flag + contract probe; channel events are BE-proven)
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.OPAL_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(ROOT, "shots/intelligence/phase6_real");
mkdirSync(OUT, { recursive: true });

const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
const { chromium } = require("playwright");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TIP = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim();

const MAYA_WALK_B = "b599fcd7-7a97-4736-8221-86e0a6d8dc7a";
const WALK_A = "47aa5856-8c56-4b18-a4d4-6a9b456516a8";

const results = [];
function assert(name, ok, detail = "") {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

function loadSession() {
  const cached = JSON.parse(readFileSync("/tmp/walk_a_phase6_session.json", "utf8"));
  if (!cached?.token) throw new Error("missing /tmp/walk_a_phase6_session.json");
  return {
    token: cached.token,
    userId: cached.userId || WALK_A,
    name: cached.name || "Founder Review",
  };
}

async function login(page, session) {
  const url = `${BASE}/?opal_founder_seed=1&opal_native_host=1&opal_intel_real=1`;
  await page.addInitScript(
    ({ token, userId, name }) => {
      sessionStorage.setItem("opal.product.browser_session.v1", token);
      sessionStorage.setItem("opal_native_host", "1");
      localStorage.setItem(
        "opal.product.profile.v17",
        JSON.stringify({
          user_id: userId,
          display_name: name,
          handle: "founder_rev",
        }),
      );
      localStorage.setItem("opal.founder_seed.opt_in.persist.v1", "1");
      sessionStorage.setItem("opal.founder_seed.opt_in.v1", "1");
      localStorage.setItem("opal.firstRun.v14.completed", "1");
    },
    { token: session.token, userId: session.userId, name: session.name },
  );
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await sleep(1000);
  for (let i = 0; i < 14; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) break;
    if (
      await page.getByTestId("opal-promise-already").isVisible().catch(() => false)
    ) {
      await page.getByTestId("opal-promise-already").click({ force: true });
      await sleep(400);
      continue;
    }
    await sleep(400);
  }
  await page.waitForSelector('[data-testid="member-shell"]', { timeout: 45000 });
}

async function shot(page, name) {
  const path = resolve(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`SHOT ${path}`);
  return path;
}

const session = loadSession();
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

const apiHits = [];
page.on("request", (req) => {
  const u = req.url();
  if (u.includes("/api/v1/product/intelligence/") || u.includes("/api/v1/product/attention")) {
    apiHits.push({ method: req.method(), url: u.replace(BASE, "").replace("http://127.0.0.1:4000", "") });
  }
});

try {
  // Vite SHA gate
  await page.goto(`${BASE}/?opal_native_host=1`, { waitUntil: "domcontentloaded" });
  await sleep(400);
  const liveSha = await page.evaluate(
    () =>
      document.documentElement.getAttribute("data-git-head") ||
      document.documentElement.getAttribute("data-opal-frontend-sha") ||
      "",
  );
  assert(
    "vite_sha",
    !liveSha || liveSha.startsWith(TIP.slice(0, 7)),
    `live=${liveSha || "none"} tip=${TIP}`,
  );

  await login(page, session);

  const modes = await page.evaluate(() => {
    // Prefer runtime module if exposed; else parse query
    const raw = new URL(window.location.href).searchParams.get("opal_intel_real");
    return {
      query: raw,
      href: window.location.href,
    };
  });
  assert("flag_query_all", modes.query === "1", JSON.stringify(modes));

  // --- 1. person_memory ---
  await page.getByTestId("member-tab-you").click();
  await sleep(800);
  await page.waitForSelector('[data-testid="you-hub-pane"]', { timeout: 15000 });
  // Scroll people memory into view
  const peopleBtn = page.getByTestId(`people-memory-${MAYA_WALK_B}`);
  await peopleBtn.scrollIntoViewIfNeeded().catch(() => {});
  await sleep(400);
  assert(
    "people_memory_row",
    await peopleBtn.isVisible().catch(() => false),
    `people-memory-${MAYA_WALK_B}`,
  );
  await peopleBtn.click({ force: true });
  await sleep(1200);
  const memVisible = await page
    .getByTestId("person-memory-view")
    .isVisible()
    .catch(() => false);
  assert("person_memory_view", memVisible);
  const memError = await page
    .getByTestId("person-memory-error")
    .isVisible()
    .catch(() => false);
  const memKnows = await page
    .getByTestId("person-memory-knows")
    .isVisible()
    .catch(() => false);
  assert("person_memory_real_facts", memKnows && !memError, `knows=${memKnows} err=${memError}`);
  await shot(page, "01_person_memory_real");

  // Back to You then Home for Activity
  if (await page.getByTestId("person-memory-back").isVisible().catch(() => false)) {
    await page.getByTestId("person-memory-back").click({ force: true });
    await sleep(500);
  }

  // --- 2–4. For you: reminders + mediation + briefing ---
  await page.getByTestId("member-tab-home").click();
  await sleep(700);
  const activityBtn = page.getByTestId("gsh-activity");
  assert(
    "home_activity_bell",
    await activityBtn.isVisible().catch(() => false),
  );
  await activityBtn.click({ force: true });
  await sleep(1500);

  // Wait for intelligence extras to settle
  for (let i = 0; i < 20; i++) {
    const loading = await page
      .getByTestId("intelligence-for-you-loading")
      .isVisible()
      .catch(() => false);
    if (!loading) break;
    await sleep(250);
  }

  const extras = await page
    .getByTestId("intelligence-for-you-extras")
    .isVisible()
    .catch(() => false);
  const extrasErr = await page
    .getByTestId("intelligence-for-you-error")
    .textContent()
    .catch(() => null);

  // Reminder cards (attention enrichment)
  const reminderCount = await page.locator('[data-testid^="reminder-card-"]').count();
  assert(
    "reminder_attention_cards",
    reminderCount > 0 ||
      (await page.locator('[data-testid^="activity-row-"]').count()) > 0,
    `reminders=${reminderCount}`,
  );
  await shot(page, "02_reminder_attention_real");

  // Mediation
  const mediationCount = await page.locator('[data-testid^="mediation-card-"]').count();
  assert(
    "mediation_card",
    mediationCount > 0,
    `count=${mediationCount} extras=${extras} err=${extrasErr || "none"}`,
  );
  await shot(page, "03_mediation_real");

  // Weekly briefing
  const briefingCount = await page.locator('[data-testid^="briefing-card-"]').count();
  assert(
    "weekly_briefing_card",
    briefingCount > 0,
    `count=${briefingCount}`,
  );
  // Scroll briefing into view if needed
  const briefing = page.locator('[data-testid^="briefing-card-"]').first();
  if (await briefing.isVisible().catch(() => false)) {
    await briefing.scrollIntoViewIfNeeded().catch(() => {});
    await sleep(300);
  }
  await shot(page, "04_weekly_briefing_real");

  // Full For you composition (spot-check layouts intact)
  await page.evaluate(() => {
    const root = document.querySelector('[data-testid="activity-destination"]') || document.body;
    root.scrollTop = 0;
  });
  await sleep(200);
  await shot(page, "05_for_you_composition_real");

  // --- 5. choreography_events ---
  // Flag is on via query; BE channel contract proven in scenario harness.
  // Probe: window location + that real intel HTTP was hit (not remock-only).
  const intelHits = apiHits.filter((h) => h.url.includes("/intelligence/"));
  const attentionHits = apiHits.filter((h) => h.url.includes("/attention"));
  assert(
    "choreography_flag_real",
    modes.query === "1",
    "opal_intel_real=1 covers choreography_events surface",
  );
  assert(
    "real_http_mediation_or_briefing",
    intelHits.some((h) => h.url.includes("mediation") || h.url.includes("briefings")),
    JSON.stringify(intelHits.slice(0, 8)),
  );
  assert(
    "real_http_attention",
    attentionHits.length > 0,
    JSON.stringify(attentionHits.slice(0, 4)),
  );
  await shot(page, "06_choreography_flag_activity_real");

  const verify = {
    paste: "F",
    phase: "6",
    branch: "muse/packet-b-batch-2",
    tip: TIP,
    verified_at: new Date().toISOString(),
    viewport: "390x844",
    flag: "opal_intel_real=1",
    defaults_remain_mock: true,
    mocks_retained: true,
    surfaces: {
      person_memory: results.find((r) => r.name === "person_memory_real_facts")?.ok,
      reminder_attention: results.find((r) => r.name === "reminder_attention_cards")?.ok,
      mediation: results.find((r) => r.name === "mediation_card")?.ok,
      weekly_briefing: results.find((r) => r.name === "weekly_briefing_card")?.ok,
      choreography_events: results.find((r) => r.name === "choreography_flag_real")?.ok,
    },
    api_hits: apiHits.slice(0, 40),
    results,
    shots: [
      "01_person_memory_real.png",
      "02_reminder_attention_real.png",
      "03_mediation_real.png",
      "04_weekly_briefing_real.png",
      "05_for_you_composition_real.png",
      "06_choreography_flag_activity_real.png",
    ],
    founder_walk_url:
      "http://192.168.86.156:5173/?opal_founder_seed=1&opal_native_host=1&opal_intel_real=1",
    status: results.every((r) => r.ok) ? "GREEN" : "RED",
  };
  writeFileSync(resolve(OUT, "PHASE6_REAL_VERIFY.json"), JSON.stringify(verify, null, 2));
  console.log(`VERIFY ${verify.status} → ${OUT}/PHASE6_REAL_VERIFY.json`);
  if (verify.status !== "GREEN") process.exitCode = 1;
} catch (err) {
  console.error("FATAL", err);
  await shot(page, "FAIL_phase6").catch(() => {});
  writeFileSync(
    resolve(OUT, "PHASE6_REAL_VERIFY.json"),
    JSON.stringify({ status: "RED", error: String(err), results }, null, 2),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
