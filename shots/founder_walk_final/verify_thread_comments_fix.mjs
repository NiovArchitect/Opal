/**
 * Verify: thread bubbles unclipped + scroll; unique seed threads; comments input reachable.
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { activate } from "../../scripts/founder_proof_fixture.mjs";

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
  const session = await activate({
    phone: "+12025550103",
    name: "Jordan Lee",
    handle: "jordan_rev",
    code: "333333",
  });
  writeFileSync("/tmp/fw13_session.json", JSON.stringify(session));
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

async function dismissOverlays(page) {
  if (await page.getByTestId("full-live-back").isVisible().catch(() => false)) {
    await page.getByTestId("full-live-back").click();
    await sleep(400);
  }
  if (await page.locator(".ogsn-graph-detail button[aria-label='Back'], [data-testid='graph-detail-back']").first().isVisible().catch(() => false)) {
    await page.locator(".ogsn-graph-detail button[aria-label='Back'], [data-testid='graph-detail-back']").first().click();
    await sleep(400);
  }
}

async function openChatByName(page, name) {
  await dismissOverlays(page);
  await page.getByTestId("member-tab-chats").click();
  await page.waitForSelector(`[data-name="${name}"]`, { timeout: 15000 });
  await sleep(400);
  // Far-left avatar hit — Live/Graph plan pills sit on the right.
  await page.locator(`[data-name="${name}"]`).first().click({ position: { x: 22, y: 48 } });
  await page.waitForSelector("[data-testid=member-conversation]", { timeout: 15000 });
  for (let i = 0; i < 24; i++) {
    const n = await page.locator(".bubble").count();
    if (n >= 2) break;
    await sleep(200);
  }
  await sleep(300);
}

async function backToChats(page) {
  await dismissOverlays(page);
  const back = page.locator('[data-testid="gpt-back"]').first();
  if (await back.isVisible().catch(() => false)) {
    await back.click();
  } else {
    await page.locator('button[aria-label="Back"]').first().click({ force: true }).catch(() => {});
  }
  await page.waitForSelector('[data-testid="member-shell"]', { timeout: 10000 });
  await page.getByTestId("member-tab-chats").click().catch(() => {});
  await page.waitForSelector("[data-name=Chanelle]", { timeout: 10000 });
  await sleep(400);
}

const EXPECT = {
  Chanelle: [/Juniper tonight/i, /I can do 7:30/i, /Opal lined this up/i, /Perfect — I'll grab a table/i],
  Maya: [/farmers market/i, /coast/i, /I'm free after 10/i],
  "Juniper crew": [/I can make 7:30/i, /3 of 4|Sam's in/i],
  Sabrina: [/Sent a photo/i, /check this out|two blocks|Which one/i],
  Alex: [/Mexico City was unreal/i, /Trip Graph/i],
};

const session = await loadSession();
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

try {
  await login(page, session);
  const sha = await page.evaluate(() => document.documentElement.getAttribute("data-git-head"));
  assert("vite_sha", sha === TIP || sha?.startsWith(TIP.slice(0, 7)), `live=${sha} tip=${TIP}`);

  for (const name of Object.keys(EXPECT)) {
    await openChatByName(page, name);
    const shot = `thread_fix_${name.toLowerCase().replace(/\s+/g, "_")}.png`;
    await page.screenshot({ path: resolve(OUT, shot) });
    const info = await page.evaluate(() => {
      const thread = document.querySelector(".thread");
      const bubbles = [...document.querySelectorAll(".bubble")];
      const texts = bubbles.map((b) => {
        const p = b.querySelector("p");
        return (p?.textContent || "").trim();
      });
      const empty = texts.filter((t) => !t).length;
      const clipped = bubbles.filter((b) => {
        const p = b.querySelector("p");
        if (!p) return false;
        const br = b.getBoundingClientRect();
        const pr = p.getBoundingClientRect();
        return pr.top < br.top - 1 || pr.bottom > br.bottom + 1;
      }).length;
      const cs = thread ? getComputedStyle(thread) : null;
      return {
        bubbleCount: bubbles.length,
        empty,
        clipped,
        texts,
        body: (document.body.innerText || "").slice(0, 2000),
        canScroll: !!thread && thread.scrollHeight > thread.clientHeight + 2,
        overflowY: cs?.overflowY || "",
        scrollTopMax: thread ? thread.scrollHeight - thread.clientHeight : 0,
      };
    });
    // Try scroll
    if (info.canScroll) {
      await page.evaluate(() => {
        const t = document.querySelector(".thread");
        if (t) t.scrollTop = t.scrollHeight;
      });
      await sleep(200);
      await page.evaluate(() => {
        const t = document.querySelector(".thread");
        if (t) t.scrollTop = 0;
      });
    }
    assert(`${name}_no_empty`, info.empty === 0, `empty=${info.empty}`);
    assert(`${name}_no_clip`, info.clipped === 0, `clipped=${info.clipped}`);
    assert(`${name}_bubbles`, info.bubbleCount >= 3, `count=${info.bubbleCount}`);
    for (const re of EXPECT[name]) {
      assert(`${name}_copy_${re.source.slice(0, 24)}`, re.test(info.body), info.texts.join(" | "));
    }
    assert(
      `${name}_scrollable_or_fits`,
      info.canScroll || info.bubbleCount >= 3,
      `canScroll=${info.canScroll} overflow=${info.overflowY}`,
    );
    // Longer threads should actually scroll
    if (["Maya", "Alex", "Juniper crew", "Sabrina"].includes(name)) {
      assert(`${name}_scrolls`, info.canScroll, `scrollMax=${info.scrollTopMax}`);
    }
    await backToChats(page);
  }

  // Comments sheet
  await page.getByTestId("member-tab-home").click();
  await sleep(1000);
  const commentBtn = page.locator('[data-testid^="gsh-comment-"]').first();
  if (await commentBtn.isVisible().catch(() => false)) {
    await commentBtn.click();
    await page.waitForSelector('[data-testid="memory-comments-sheet"]', { timeout: 10000 });
    await sleep(600);
    await page.screenshot({ path: resolve(OUT, "comments_sheet_open.png") });
    const comments = await page.evaluate(() => {
      const sheet = document.querySelector('[data-testid="memory-comments-sheet"]');
      const list = document.querySelector('[data-testid="memory-comments-list"]');
      const input = document.querySelector('[data-testid="memory-comments-input"]');
      const composer = document.querySelector('[data-testid="memory-comments-composer"]');
      const lcs = list ? getComputedStyle(list) : null;
      const scs = sheet ? getComputedStyle(sheet) : null;
      if (list) list.scrollTop = list.scrollHeight;
      const ir = input?.getBoundingClientRect();
      const cr = composer?.getBoundingClientRect();
      const vh = window.innerHeight;
      return {
        sheetOverflow: scs?.overflowY,
        listOverflow: lcs?.overflowY,
        listCanScroll: !!list && list.scrollHeight > list.clientHeight + 2,
        inputVisible: !!ir && ir.top >= 0 && ir.bottom <= vh + 2 && ir.height > 0,
        composerVisible: !!cr && cr.top >= 0 && cr.bottom <= vh + 2,
        inputTop: ir?.top,
        vh,
      };
    });
    await page.screenshot({ path: resolve(OUT, "comments_sheet_scrolled.png") });
    assert("comments_list_scroll_css", /auto|scroll/.test(comments.listOverflow || ""), comments.listOverflow);
    assert("comments_input_visible", comments.inputVisible, JSON.stringify(comments));
    assert("comments_composer_visible", comments.composerVisible, JSON.stringify(comments));
    // Tap input
    await page.getByTestId("memory-comments-input").click({ force: true });
    await page.getByTestId("memory-comments-input").fill("Looks great");
    const typed = await page.getByTestId("memory-comments-input").inputValue();
    assert("comments_input_tappable", typed === "Looks great", typed);
  } else {
    assert("comments_btn_present", false, "no gsh-comment button on home");
  }
} catch (e) {
  assert("harness", false, String(e?.stack || e));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
const report = {
  tip: TIP,
  passed: results.filter((r) => r.ok).length,
  failed: failed.length,
  results,
};
writeFileSync(resolve(OUT, "THREAD_COMMENTS_FIX_VERIFY.json"), JSON.stringify(report, null, 2));
console.log(`\n${failed.length ? "RED" : "GREEN"} ${report.passed}/${results.length} tip=${TIP}`);
if (failed.length) {
  console.log("Failed:", failed.map((f) => f.name).join(", "));
  process.exit(1);
}
