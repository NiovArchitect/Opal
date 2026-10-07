/**
 * Critical restore verify @ 390×844
 * 1) Chats/Calls match reference chrome (names, pills, borders, previews)
 * 2) Seed list never overwritten by live Italian/Aug-31 junk
 * 3) Thread messages readable (not empty black bars)
 * 4) Splash middle scale, status crop only, CTAs visible
 * 5) Profile Continue ~24px below Optional
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { activate } from "../../scripts/founder_proof_fixture.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.OPAL_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(ROOT, "shots/founder_walk_5fixes");
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
    /* fall through */
  }
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
  await sleep(1200);
  for (let i = 0; i < 12; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) break;
    if (await page.getByTestId("opal-promise-already").isVisible().catch(() => false)) {
      await page.getByTestId("opal-promise-already").click({ force: true });
      await sleep(400);
      continue;
    }
    if (await page.getByTestId("fr00-already-account").isVisible().catch(() => false)) {
      await page.getByTestId("fr00-already-account").click({ force: true });
      await sleep(400);
      continue;
    }
    await sleep(400);
  }
  await page.waitForSelector('[data-testid="member-shell"]', { timeout: 45000 });
}

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
  await page.goto(`${BASE}/?opal_native_host=1`, { waitUntil: "domcontentloaded" });
  await sleep(400);
  const liveSha = await page.evaluate(
    () => document.documentElement.getAttribute("data-git-head") || "",
  );
  assert(
    "vite_sha_matches_tip",
    liveSha === TIP || liveSha.startsWith(TIP.slice(0, 7)),
    `live=${liveSha} tip=${TIP}`,
  );

  // === Splash middle ===
  await page.goto(`${BASE}/?opal_force_promise=1&opal_founder_seed=1&opal_native_host=1`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector("[data-testid=opal-promise-exact-img]", { timeout: 20000 });
  await sleep(800);
  const promise = await page.evaluate(() => {
    const img = document.querySelector("[data-testid=opal-promise-exact-img]");
    const enter = document.querySelector("[data-testid=opal-promise-enter]");
    const already = document.querySelector("[data-testid=opal-promise-already]");
    const mask = document.querySelector("[data-testid=opal-promise-status-mask]");
    const ir = img?.getBoundingClientRect();
    const er = enter?.getBoundingClientRect();
    const ar = already?.getBoundingClientRect();
    const cs = img ? getComputedStyle(img) : null;
    return {
      imgW: ir?.width || 0,
      statusH: mask?.getBoundingClientRect().height || 0,
      imgWidthCss: cs?.width || "",
      marginLeft: cs?.marginLeft || "",
      enterOk: er ? er.top >= 0 && er.bottom <= 844 && er.height > 40 : false,
      alreadyOk: ar ? ar.top >= 0 && ar.bottom <= 844 : false,
    };
  });
  await page.screenshot({ path: resolve(OUT, "r4_splash2.png") });
  assert(
    "splash_status_crop_status_only",
    promise.statusH >= 24 && promise.statusH <= 36,
    `statusH=${promise.statusH}`,
  );
  assert(
    "splash_middle_scale",
    promise.imgW >= 400 && promise.imgW <= 430,
    JSON.stringify({ imgW: promise.imgW, css: promise.imgWidthCss, ml: promise.marginLeft }),
  );
  assert("splash_ctas_visible", promise.enterOk && promise.alreadyOk, JSON.stringify(promise));

  // === Profile Continue ===
  await page.goto(
    `${BASE}/?opal_reset_first_run=1&opal_founder_seed=1&opal_native_host=1`,
    { waitUntil: "domcontentloaded" },
  );
  await sleep(600);
  const tapBegin = page.getByTestId("fr00-tap-begin");
  if (await tapBegin.isVisible().catch(() => false)) await tapBegin.click({ force: true });
  else
    await page
      .locator(".fr-splash")
      .first()
      .click({ position: { x: 195, y: 520 }, force: true })
      .catch(() => {});
  await sleep(700);
  if (await page.getByTestId("opal-promise-enter").count()) {
    await page.getByTestId("opal-promise-enter").click({ force: true });
    await sleep(700);
  }
  const phoneInput = page.locator("#fr-phone").first();
  if (await phoneInput.count()) await phoneInput.fill("2025550101");
  await page.evaluate(() => {
    const el = document.querySelector("#otp-consent");
    if (el instanceof HTMLInputElement) {
      el.checked = true;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  if (await page.getByTestId("fr06-continue").count()) {
    await page.getByTestId("fr06-continue").click({ force: true });
  }
  await sleep(1400);
  const code = page.locator("#fr-code, [data-testid=fr07-code-input]").first();
  if (await code.count()) await code.fill("111111");
  if (await page.getByTestId("fr07-submit").count()) {
    await page.getByTestId("fr07-submit").click({ force: true });
  }
  await sleep(2500);
  const skip = page.locator("[data-testid=hs-skip-to-auth], button:has-text('Skip')");
  if (await skip.count()) {
    await skip.first().click({ force: true });
    await sleep(1200);
  }
  const profile = await page.evaluate(() => {
    const root = document.querySelector("[data-testid=fr08-profile]");
    if (!root) return { has: false };
    const meta = [...root.querySelectorAll(".fr-meta")].find((el) =>
      /Optional\. Must be unique/i.test(el.textContent || ""),
    );
    const cont = root.querySelector("[data-testid=fr08-continue]");
    const mr = meta?.getBoundingClientRect();
    const cr = cont?.getBoundingClientRect();
    const gap = mr && cr ? cr.top - mr.bottom : null;
    return {
      has: true,
      gap,
      marginTop: cont ? getComputedStyle(cont).marginTop : null,
      giantGap: gap != null && gap > 80,
      pinned: cr ? window.innerHeight - cr.bottom < 40 && gap > 80 : false,
    };
  });
  await page.screenshot({ path: resolve(OUT, "r5_profile.png") });
  assert(
    "profile_continue_~24",
    profile.has &&
      ((profile.gap != null && profile.gap >= 16 && profile.gap <= 48) ||
        /24px/.test(String(profile.marginTop))),
    JSON.stringify(profile),
  );
  assert("profile_not_bottom_pinned", !profile.pinned && !profile.giantGap, JSON.stringify(profile));

  // === Chats / Calls / Thread ===
  const member = await ctx.newPage();
  await login(member, session);
  await member.getByTestId("member-tab-chats").click();
  await sleep(1800);
  await member.screenshot({ path: resolve(OUT, "r1_chats.png") });
  const chats = await member.evaluate(() => {
    const rows = [...document.querySelectorAll("[data-testid^=chats-row-], .chats-home-row")];
    const mapped = rows.map((r) => ({
      name:
        r.getAttribute("data-name") ||
        r.querySelector(".chats-home-name")?.textContent?.trim() ||
        "",
      preview: r.querySelector(".chats-home-preview")?.textContent?.trim() || "",
      when: r.querySelector(".chats-home-when")?.textContent?.trim() || "",
      pill: r.querySelector("[data-testid=chat-plan-pill]")?.textContent?.trim() || "",
      conn: r.querySelector("[data-testid=chat-connection-label]")?.textContent?.trim() || "",
      border: getComputedStyle(r).borderColor,
      tone: r.querySelector(".chats-home-avatar")
        ? getComputedStyle(r.querySelector(".chats-home-avatar")).backgroundColor
        : "",
    }));
    const text = document.body.innerText || "";
    return {
      mapped,
      hasItalian: /We should do something Italian/i.test(text),
      hasAugJunk: /Aug \d+/i.test(text),
      names: mapped.map((m) => m.name),
    };
  });
  assert(
    "chats_seed_names",
    ["Chanelle", "Maya", "Juniper crew", "Sabrina", "Alex"].every((n) =>
      chats.names.some((x) => x.includes(n)),
    ),
    JSON.stringify(chats.names),
  );
  assert("chats_no_italian_leak", !chats.hasItalian, JSON.stringify(chats.mapped.map((m) => m.preview)));
  assert("chats_no_aug_junk_when", !chats.hasAugJunk, JSON.stringify(chats.mapped.map((m) => m.when)));
  const chanelle = chats.mapped.find((m) => m.name === "Chanelle");
  assert(
    "chanelle_pill_juniper",
    !!chanelle && /Juniper & Ivy · 7:30 PM/i.test(chanelle.pill),
    JSON.stringify(chanelle),
  );
  assert(
    "chanelle_preview_seed",
    !!chanelle && /Perfect — I'll grab a table/i.test(chanelle.preview),
    JSON.stringify(chanelle),
  );
  assert(
    "chanelle_conn_direct",
    !!chanelle && /Direct connection/i.test(chanelle.conn),
    JSON.stringify(chanelle),
  );
  const maya = chats.mapped.find((m) => m.name === "Maya");
  assert(
    "maya_pill_market",
    !!maya && /Farmers market \+ coast/i.test(maya.pill),
    JSON.stringify(maya),
  );
  assert(
    "chats_colored_borders",
    chats.mapped.filter((m) => /rgb\(/.test(m.border)).length >= 4,
    JSON.stringify(chats.mapped.map((m) => ({ n: m.name, b: m.border }))),
  );

  // Calls
  const callsBtn = member.locator("button:has-text('Calls')").first();
  if (await callsBtn.count()) await callsBtn.click({ force: true });
  await sleep(1200);
  await member.screenshot({ path: resolve(OUT, "r1_calls.png") });
  const calls = await member.evaluate(() => {
    const text = document.body.innerText || "";
    return {
      hasChanelle: /Chanelle/i.test(text),
      hasJuniper: /Juniper/i.test(text),
      hasMaya: /Maya/i.test(text),
      hasReady: /Sat 7:30 · Ready|Ready/i.test(text),
      hasMissed: /Missed/i.test(text),
      hasCallBack: /Call back/i.test(text),
      hasAudio: /Audio · 14m|12m ago/i.test(text),
    };
  });
  assert(
    "calls_correlated",
    calls.hasChanelle && calls.hasJuniper && calls.hasMaya && calls.hasReady && calls.hasMissed,
    JSON.stringify(calls),
  );
  assert("calls_callback", calls.hasCallBack, JSON.stringify(calls));

  // Thread
  const chatsBtn = member.locator("button:has-text('Chats')").first();
  if (await chatsBtn.count()) await chatsBtn.click({ force: true });
  await sleep(800);
  await member.locator("[data-name=Chanelle]").first().click({ force: true });
  await sleep(2200);
  await member.screenshot({ path: resolve(OUT, "r3_thread.png") });
  const thread = await member.evaluate(() => {
    const bubbles = [...document.querySelectorAll(".bubble")];
    const invisible = [];
    for (const b of bubbles) {
      const p = b.querySelector("p");
      const cs = getComputedStyle(b);
      const pcs = p ? getComputedStyle(p) : null;
      const color = pcs?.color || cs.color;
      const rgb = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      const lum = rgb
        ? (0.2126 * +rgb[1] + 0.7152 * +rgb[2] + 0.0722 * +rgb[3]) / 255
        : 1;
      const text = (p?.textContent || b.textContent || "").trim();
      const overflow =
        b.scrollWidth > b.clientWidth + 4 || b.getBoundingClientRect().right > 394;
      if (!text || lum < 0.35 || overflow) {
        invisible.push({
          text: text.slice(0, 40),
          color,
          lum,
          overflow,
          h: b.getBoundingClientRect().height,
        });
      }
    }
    const body = document.body.innerText || "";
    return {
      bubbleCount: bubbles.length,
      invisibleCount: invisible.length,
      invisible: invisible.slice(0, 5),
      hasJuniperTonight: /Juniper tonight/i.test(body),
      has730: /I can do 7:30/i.test(body),
      hasPlan: /Opal lined|Juniper & Ivy|Confirm 7:30|Table ready|Place still open/i.test(body),
    };
  });
  assert("thread_has_bubbles", thread.bubbleCount >= 1, JSON.stringify(thread));
  assert("thread_text_readable", thread.invisibleCount === 0, JSON.stringify(thread.invisible));
  assert(
    "thread_correlated_plan",
    thread.hasJuniperTonight || thread.has730 || thread.hasPlan,
    JSON.stringify(thread),
  );
} catch (err) {
  console.error(err);
  results.push({ name: "runner_error", ok: false, detail: String(err?.stack || err) });
} finally {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  writeFileSync(
    resolve(OUT, "VERIFY_CRITICAL_RESTORE.json"),
    JSON.stringify({ tip: TIP, passed, failed, results, at: new Date().toISOString() }, null, 2),
  );
  console.log(`\n${passed} passed / ${failed} failed — tip ${TIP}`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}
