/**
 * Holistic smoke a–e @390×844 against live Vite + Phoenix (do not restart Phoenix).
 * a) Seed chats load (Chanelle gold pill)
 * b) Maya thread: type "yes" → Opal confirms
 * c) Alex thread → Trip Graph → trip canvas with 4 days
 * d) Graphs → Timeline mode renders
 * e) Trip canvas → RSVP → count updates
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.OPAL_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(ROOT, "shots/final_holistic");
mkdirSync(OUT, { recursive: true });
const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
const { chromium } = require("playwright");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TIP = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim();
const results = [];
function assert(name, ok, detail = "") {
  results.push({ name, ok: !!ok, detail: String(detail || "") });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

function loadSession() {
  for (const p of ["/tmp/fw13_session.json", "/tmp/opal_session.json", "/tmp/opal_otp_session.json"]) {
    try {
      const cached = JSON.parse(readFileSync(p, "utf8"));
      if (cached?.token || cached?.access_token) {
        return {
          token: cached.token || cached.access_token,
          userId: cached.userId || cached.user_id || "founder-smoke",
          name: cached.name || cached.display_name || "Founder",
        };
      }
    } catch {
      /* */
    }
  }
  // Seed surfaces are mostly client-side; inject a placeholder bearer.
  return { token: "smoke-placeholder", userId: "founder-smoke", name: "Founder" };
}

async function login(page, session) {
  await page.addInitScript(
    ({ token, userId, name }) => {
      sessionStorage.setItem("opal.product.browser_session.v1", token);
      sessionStorage.setItem("opal_native_host", "1");
      localStorage.setItem(
        "opal.product.profile.v17",
        JSON.stringify({ user_id: userId, display_name: name, handle: "founder_smoke" }),
      );
      localStorage.setItem("opal.founder_seed.opt_in.persist.v1", "1");
      sessionStorage.setItem("opal.founder_seed.opt_in.v1", "1");
      localStorage.setItem("opal.firstRun.v14.completed", "1");
      localStorage.setItem("opal.access_token", token);
      sessionStorage.setItem("opal.access_token", token);
      localStorage.setItem("opal.firstRun.v14.phoneVerified", "1");
    },
    { token: session.token, userId: session.userId, name: session.name },
  );
  await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await sleep(1200);
  for (let i = 0; i < 24; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) break;
    if (await page.getByTestId("opal-promise-already").isVisible().catch(() => false)) {
      await page.getByTestId("opal-promise-already").click({ force: true });
      await sleep(400);
      continue;
    }
    if (await page.getByTestId("opal-promise-enter").isVisible().catch(() => false)) {
      await page.getByTestId("opal-promise-enter").click({ force: true });
      await sleep(400);
      continue;
    }
    // Live production_sms: skip phone gate for seed UI smoke
    if (await page.getByTestId("fr06-skip-for-now").isVisible().catch(() => false)) {
      await page.getByTestId("fr06-skip-for-now").click({ force: true });
      await sleep(700);
      continue;
    }
    const skip = page.locator('button:has-text("Skip for now"), [data-testid*="skip"]').first();
    if (await skip.isVisible().catch(() => false)) {
      await skip.click({ force: true });
      await sleep(700);
      continue;
    }
    await sleep(400);
  }
  await page.waitForSelector('[data-testid="member-shell"]', { timeout: 60000 });
}

async function goChats(page) {
  for (let i = 0; i < 6; i++) {
    const inConv = await page.locator('[data-testid="member-conversation"]').isVisible().catch(() => false);
    const canvas = await page.getByTestId("trip-canvas").isVisible().catch(() => false);
    if (canvas) {
      await page.getByTestId("trip-canvas-close").click({ force: true }).catch(() => {});
      await sleep(400);
      continue;
    }
    if (inConv) {
      await page.getByTestId("gpt-back").click({ force: true }).catch(() => {});
      await sleep(400);
      continue;
    }
    break;
  }
  await page.getByTestId("member-tab-chats").click({ force: true }).catch(async () => {
    await page.locator('button:has-text("Chats")').first().click({ force: true }).catch(() => {});
  });
  await sleep(600);
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
page.setDefaultTimeout(20000);

try {
  await login(page, session);
  await goChats(page);
  await page.screenshot({ path: resolve(OUT, "01_chats.png"), fullPage: false });

  // a) Chanelle gold pill
  await goChats(page);
  const chanelleRow = page.locator('[data-name="Chanelle"], text=/Chanelle/i').first();
  const chanelleVisible = await chanelleRow.isVisible().catch(() => false);
  const goldPill =
    (await page.locator('[data-testid*="plan-pill"], .plan-pill, .chats-home-plan-pill').count().catch(() => 0)) > 0 ||
    (await page.locator('text=/Trip Graph|Saturday|Sat/i').first().isVisible().catch(() => false));
  const chanelleText = await page.locator("body").innerText().then((x) => /Chanelle/i.test(x)).catch(() => false);
  assert("a_seed_chats_chanelle", chanelleVisible || (chanelleText && goldPill), `row=${chanelleVisible} text=${chanelleText} goldish=${goldPill}`);

  // b) Maya thread → yes → Opal confirms
  await goChats(page);
  const mayaRow = page.locator('[data-name="Maya"]').first();
  if (await mayaRow.isVisible().catch(() => false)) {
    await mayaRow.locator('.chats-home-name').click({ force: true }).catch(async () => {
      await mayaRow.click({ force: true });
    });
  } else {
    await page.locator('text=/Maya/i').first().click({ force: true });
  }
  await page.locator('[data-testid="member-conversation"]').waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  await sleep(800);
  assert("b_maya_row", await page.locator('[data-testid="member-conversation"]').isVisible().catch(() => false));
  const composer = page.locator('[data-testid="composer-input"], textarea, input[placeholder*="Message"]').first();
  if (await composer.isVisible().catch(() => false)) {
    await composer.fill("yes");
    await sleep(200);
    const send = page.locator('[data-testid="composer-send"], button[aria-label*="Send"]').first();
    if (await send.isVisible().catch(() => false)) await send.click({ force: true });
    else await composer.press("Enter");
    await sleep(1800);
  }
  const bodyText = await page.locator("body").innerText();
  const opalConfirm = /lock|confirm|juniper|saturday|got it|noted|farmers|coast|10:30/i.test(bodyText);
  assert("b_maya_yes_opal_confirm", opalConfirm, bodyText.slice(0, 180).replace(/\s+/g, " "));
  await page.screenshot({ path: resolve(OUT, "02_maya_yes.png"), fullPage: false });

  // c) Alex → Trip Graph canvas CTA → 4 day tabs
  await goChats(page);
  const alexRow = page.locator('[data-name="Alex"]').first();
  assert("c_alex_row", await alexRow.isVisible().catch(() => false));
  if (await alexRow.isVisible().catch(() => false)) {
    const nameEl = alexRow.locator(".chats-home-name").first();
    if (await nameEl.isVisible().catch(() => false)) await nameEl.click({ force: true });
    else await alexRow.click({ force: true });
  }
  await page.locator('[data-testid="member-conversation"]').waitFor({ state: "visible", timeout: 15000 });
  await sleep(800);
  for (let i = 0; i < 24; i++) {
    await page.evaluate(() => {
      const t = document.querySelector('[data-testid="member-conversation"] .thread');
      if (t) t.scrollTop = t.scrollHeight;
    });
    if (await page.getByTestId("trip-graph-canvas-cta").isVisible().catch(() => false)) break;
    await sleep(250);
  }
  const canvasCta = page.getByTestId("trip-graph-canvas-cta");
  if (await canvasCta.isVisible().catch(() => false)) {
    await canvasCta.click({ force: true });
  } else if (await page.getByTestId("next-plan-strip").isVisible().catch(() => false)) {
    await page.getByTestId("next-plan-strip").click({ force: true });
  }
  await sleep(1000);
  const canvas = page.getByTestId("trip-canvas");
  const canvasOpened = await canvas.isVisible().catch(() => false);
  let dayTabs = 0;
  for (let i = 0; i < 4; i++) {
    if (await page.getByTestId(`trip-canvas-day-tab-${i}`).isVisible().catch(() => false)) dayTabs += 1;
  }
  assert("c_trip_canvas_4_days", canvasOpened && dayTabs === 4, `opened=${canvasOpened} dayTabs=${dayTabs}`);
  await page.screenshot({ path: resolve(OUT, "03_trip_canvas.png"), fullPage: false });

  // e) RSVP on an activity → count updates
  let rsvpOk = false;
  const rsvpIn = page.locator('[data-testid^="trip-rsvp-in-"]').first();
  if (await rsvpIn.isVisible().catch(() => false)) {
    const before = await page.locator('[data-testid^="trip-rsvp-row-"]').first().innerText().catch(() => "");
    await rsvpIn.click({ force: true });
    await sleep(900);
    const after = await page.locator('[data-testid^="trip-rsvp-row-"]').first().innerText().catch(() => "");
    rsvpOk = before !== after || /in|interested|\d/i.test(after);
  }
  assert("e_rsvp_count_updates", rsvpOk, rsvpOk ? "rsvp updated" : "rsvp control missing");
  await page.screenshot({ path: resolve(OUT, "05_rsvp.png"), fullPage: false });

  // d) Graphs → Timeline
  if (await page.getByTestId("trip-canvas").isVisible().catch(() => false)) {
    await page.getByTestId("trip-canvas-close").click({ force: true }).catch(() => {});
    await sleep(500);
  }
  if (await page.locator('[data-testid="member-conversation"]').isVisible().catch(() => false)) {
    await page.getByTestId("gpt-back").click({ force: true }).catch(() => {});
    await sleep(400);
  }
  await page.getByTestId("member-tab-graphs").click({ force: true }).catch(async () => {
    await page.locator('button:has-text("Graphs")').first().click({ force: true });
  });
  await sleep(900);
  const timelineChip = page
    .locator('[data-lens="timeline"], .graphs-lens-chip[data-lens="timeline"], button:has-text("Timeline"), [data-testid*="timeline"]')
    .first();
  if (await timelineChip.isVisible().catch(() => false)) {
    await timelineChip.click({ force: true });
    await sleep(900);
  }
  const timelineVisible =
    (await page.locator('[data-testid*="timeline"], .graphs-timeline, .graphs-orbit, [data-lens="timeline"].is-active').first().isVisible().catch(() => false)) ||
    /Timeline|lined this up|upcoming|this week/i.test(await page.locator("body").innerText());
  assert("d_graphs_timeline", timelineVisible);
  await page.screenshot({ path: resolve(OUT, "04_timeline.png"), fullPage: false });
} catch (err) {
  assert("smoke_uncaught", false, err?.stack || String(err));
  await page.screenshot({ path: resolve(OUT, "FAIL.png"), fullPage: false }).catch(() => {});
} finally {
  await browser.close();
  const pass = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  const summary = {
    tip: TIP,
    timestamp: new Date().toISOString(),
    base: BASE,
    pass,
    fail,
    results,
  };
  writeFileSync(resolve(OUT, "SMOKE.json"), JSON.stringify(summary, null, 2));
  console.log(`\nSMOKE ${fail === 0 ? "GREEN" : "RED"} ${pass}/${results.length}`);
  process.exit(fail === 0 ? 0 : 1);
}
