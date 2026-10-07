/**
 * Thread layout verify — absolute-only shell, no grid/absolute mix.
 * Checks 390×844 and 430×932: no overlaps, thread scrolls, header clear of messages.
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.OPAL_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(ROOT, "shots/founder_walk_final");
mkdirSync(OUT, { recursive: true });
const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
const { chromium } = require("playwright");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TIP = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim();
const results = [];
function assert(name, ok, detail = "") {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function loadSession() {
  try {
    const cached = JSON.parse(readFileSync("/tmp/fw13_session.json", "utf8"));
    if (cached?.token) return cached;
  } catch {
    /* */
  }
  const { activate } = await import("../../scripts/founder_proof_fixture.mjs");
  return activate({
    phone: "+12025550103",
    name: "Jordan Lee",
    handle: "jordan_rev",
    code: "333333",
  });
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
    },
    { token: session.token, userId: session.userId, name: session.name },
  );
  await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await sleep(1000);
  for (let i = 0; i < 12; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) break;
    if (await page.getByTestId("opal-promise-already").isVisible().catch(() => false)) {
      await page.getByTestId("opal-promise-already").click({ force: true });
      await sleep(400);
      continue;
    }
    await sleep(400);
  }
  await page.waitForSelector('[data-testid="member-shell"]', { timeout: 45000 });
}

async function openChanelle(page) {
  await page.getByTestId("member-tab-chats").click();
  await page.waitForSelector("[data-name=Chanelle]", { timeout: 20000 });
  await sleep(600);
  const box = await page.locator("[data-name=Chanelle]").first().boundingBox();
  if (!box) throw new Error("Chanelle row missing");
  await page.mouse.click(box.x + 36, box.y + box.height / 2);
  await page.waitForSelector("[data-testid=member-conversation]", { timeout: 15000 });
  await page.waitForSelector(".bubble, [data-testid=opal-moment]", { timeout: 12000 });
  await sleep(500);
}

function rectsOverlap(a, b, pad = 1) {
  return !(
    a.right <= b.left + pad ||
    a.left >= b.right - pad ||
    a.bottom <= b.top + pad ||
    a.top >= b.bottom - pad
  );
}

async function measure(page, label) {
  const geo = await page.evaluate(() => {
    const app = document.querySelector('[data-testid="member-conversation"]');
    const header =
      document.querySelector(".gpt-header-618") || document.querySelector(".gpt-header");
    const thread = document.querySelector(".thread");
    const composer = document.querySelector(".composer-618");
    const dock = document.querySelector(".tabbar.tabbar-option-b");
    const cta = document.querySelector(".thread .journey-cta-row, [data-testid=journey-cta-row]");
    const firstBubble = document.querySelector(".bubble-row, .bubble");
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const appCs = cs(app);
    const threadCs = cs(thread);
    const headerCs = cs(header);
    const composerCs = cs(composer);
    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      appDisplay: appCs?.display || "",
      appGridRows: appCs?.gridTemplateRows || "",
      appGridAreas: appCs?.gridTemplateAreas || "",
      appPosition: appCs?.position || "",
      header: {
        box: box(header),
        position: headerCs?.position || "",
        top: headerCs?.top || "",
        height: headerCs?.height || "",
        z: headerCs?.zIndex || "",
        bg: headerCs?.backgroundColor || "",
      },
      thread: {
        box: box(thread),
        position: threadCs?.position || "",
        top: threadCs?.top || "",
        bottom: threadCs?.bottom || "",
        overflowY: threadCs?.overflowY || "",
        z: threadCs?.zIndex || "",
        scrollHeight: thread?.scrollHeight || 0,
        clientHeight: thread?.clientHeight || 0,
      },
      composer: {
        box: box(composer),
        position: composerCs?.position || "",
        top: composerCs?.top || "",
        bottom: composerCs?.bottom || "",
      },
      dock: { box: box(dock) },
      cta: {
        box: box(cta),
        insideThread: !!(cta && thread && thread.contains(cta)),
      },
      firstBubble: { box: box(firstBubble) },
      bodyHasJuniper: /Juniper tonight/i.test(document.body.innerText || ""),
      bodyHasOpal: /Opal lined this up/i.test(document.body.innerText || ""),
      bubbleCount: document.querySelectorAll(".bubble").length,
    };
  });

  const prefix = `layout_${label}`;
  assert(
    `${prefix}_no_grid`,
    geo.appDisplay === "block" &&
      (!geo.appGridAreas || geo.appGridAreas === "none" || geo.appGridAreas === "") &&
      (!geo.appGridRows || geo.appGridRows === "none" || geo.appGridRows === ""),
    JSON.stringify({
      display: geo.appDisplay,
      rows: geo.appGridRows,
      areas: geo.appGridAreas,
    }),
  );
  assert(
    `${prefix}_header_absolute`,
    geo.header.position === "absolute" && geo.header.box && geo.header.box.height >= 140,
    JSON.stringify(geo.header),
  );
  assert(
    `${prefix}_thread_absolute`,
    geo.thread.position === "absolute" && geo.thread.overflowY === "auto",
    JSON.stringify(geo.thread),
  );
  assert(
    `${prefix}_composer_bottom`,
    geo.composer.position === "absolute" &&
      geo.composer.box &&
      geo.dock.box &&
      geo.composer.box.bottom <= geo.dock.box.top + 2 &&
      geo.composer.box.top > geo.thread.box.top,
    JSON.stringify({ composer: geo.composer, dock: geo.dock.box }),
  );
  assert(
    `${prefix}_cta_in_thread`,
    geo.cta.insideThread || !geo.cta.box,
    JSON.stringify(geo.cta),
  );

  // No overlaps between header/thread content / composer / dock
  const hb = geo.header.box;
  const tb = geo.thread.box;
  const cb = geo.composer.box;
  const db = geo.dock.box;
  const fb = geo.firstBubble.box;
  assert(
    `${prefix}_header_clears_thread_top`,
    hb && tb && hb.bottom <= tb.top + 2,
    JSON.stringify({ headerBottom: hb?.bottom, threadTop: tb?.top }),
  );
  assert(
    `${prefix}_thread_clears_composer`,
    tb && cb && tb.bottom <= cb.top + 4,
    JSON.stringify({ threadBottom: tb?.bottom, composerTop: cb?.top }),
  );
  assert(
    `${prefix}_composer_clears_dock`,
    cb && db && cb.bottom <= db.top + 4,
    JSON.stringify({ composerBottom: cb?.bottom, dockTop: db?.top }),
  );
  assert(
    `${prefix}_first_bubble_not_under_header`,
    !fb || !hb || fb.top >= hb.bottom - 2,
    JSON.stringify({ bubbleTop: fb?.top, headerBottom: hb?.bottom }),
  );
  assert(
    `${prefix}_content`,
    geo.bubbleCount >= 2 && geo.bodyHasJuniper,
    JSON.stringify({ bubbles: geo.bubbleCount, juniper: geo.bodyHasJuniper, opal: geo.bodyHasOpal }),
  );

  // Scroll thread to end and confirm still no composer overlap with last message
  await page.evaluate(() => {
    const thread = document.querySelector(".thread");
    if (thread) thread.scrollTop = thread.scrollHeight;
  });
  await sleep(300);
  const afterScroll = await page.evaluate(() => {
    const thread = document.querySelector(".thread");
    const composer = document.querySelector(".composer-618");
    const rows = [...document.querySelectorAll(".bubble-row, [data-testid=opal-moment], [data-testid=opal-system-consequence]")];
    const last = rows[rows.length - 1];
    if (!thread || !composer || !last) return { ok: false, reason: "missing" };
    const lr = last.getBoundingClientRect();
    const cr = composer.getBoundingClientRect();
    const tr = thread.getBoundingClientRect();
    return {
      ok: lr.bottom <= cr.top + 8 || lr.bottom <= tr.bottom + 2,
      lastBottom: lr.bottom,
      composerTop: cr.top,
      threadBottom: tr.bottom,
      scrollTop: thread.scrollTop,
      scrollMax: thread.scrollHeight - thread.clientHeight,
    };
  });
  assert(
    `${prefix}_scroll_no_dead_zone`,
    afterScroll.ok && afterScroll.scrollMax >= 0,
    JSON.stringify(afterScroll),
  );

  return geo;
}

const session = await loadSession();
const browser = await chromium.launch({ headless: true });

try {
  for (const vp of [
    { w: 390, h: 844, label: "390x844" },
    { w: 430, h: 932, label: "430x932" },
  ]) {
    const ctx = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    await login(page, session);
    await openChanelle(page);
    await page.screenshot({ path: resolve(OUT, `layout_${vp.label}_chanelle.png`) });
    await measure(page, vp.label);
    await ctx.close();
  }
} catch (err) {
  console.error(err);
  results.push({ name: "runner_error", ok: false, detail: String(err?.stack || err) });
} finally {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  writeFileSync(
    resolve(OUT, "VERIFY_THREAD_LAYOUT.json"),
    JSON.stringify({ tip: TIP, passed, failed, results, at: new Date().toISOString() }, null, 2),
  );
  console.log(`\n${passed} passed / ${failed} failed — tip ${TIP}`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}
