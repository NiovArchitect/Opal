/**
 * FINAL corrections verify — PASS/FAIL against founder references @390×844
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
  assert("vite_sha", liveSha.startsWith(TIP.slice(0, 7)), `live=${liveSha} tip=${TIP}`);

  // === 1. SPLASH — full art+copy, status-only crop ===
  await page.goto(`${BASE}/?opal_force_promise=1&opal_founder_seed=1&opal_native_host=1`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector("[data-testid=opal-promise-exact-img]");
  await sleep(900);
  const splash = await page.evaluate(() => {
    const clip = document.querySelector("[data-testid=opal-promise-clip]");
    const img = document.querySelector("[data-testid=opal-promise-exact-img]");
    const mask = document.querySelector("[data-testid=opal-promise-status-mask]");
    const enter = document.querySelector("[data-testid=opal-promise-enter]");
    const already = document.querySelector("[data-testid=opal-promise-already]");
    const cr = clip.getBoundingClientRect();
    const ir = img.getBoundingClientRect();
    const naturalH = img.naturalHeight || 1672;
    const naturalW = img.naturalWidth || 941;
    const scale = ir.width / naturalW;
    // Source y visible at bottom of clip (img top-aligned)
    const srcBottom = (cr.bottom - ir.top) / scale;
    const srcTop = Math.max(0, (cr.top - ir.top) / scale);
    // Tagline ends ~1490; baked Enter Opal pill starts ~1505+.
    const taglineEnd = 1490;
    const bakedCtaStart = 1505;
    const liveEnterCount = document.querySelectorAll(
      "[data-testid=opal-promise-enter]",
    ).length;
    const aspect = getComputedStyle(clip).aspectRatio || "";
    return {
      statusH: mask.getBoundingClientRect().height,
      imgW: ir.width,
      imgH: ir.height,
      clipH: cr.height,
      clipW: cr.width,
      cssW: getComputedStyle(img).width,
      ml: getComputedStyle(img).marginLeft,
      srcBottom,
      srcTop,
      taglineEnd,
      bakedCtaStart,
      aspect,
      liveEnterCount,
      // PASS: tagline in, baked Enter Opal cropped out
      showsTagline: srcBottom >= taglineEnd - 12,
      hidesBakedCta: srcBottom <= bakedCtaStart,
      // FAIL if image is zoomed wider than clip (overhang → text crop)
      noOverzoom: ir.width <= cr.width + 1,
      enterOk: enter.getBoundingClientRect().bottom <= 844,
      alreadyOk: already.getBoundingClientRect().bottom <= 844,
    };
  });
  await page.screenshot({ path: resolve(OUT, "v1_splash.png") });
  // Clip-only shot for baked-CTA duplication check
  const clipBox = await page.locator("[data-testid=opal-promise-clip]").boundingBox();
  if (clipBox) {
    await page.screenshot({
      path: resolve(OUT, "v1_splash_clip.png"),
      clip: clipBox,
    });
  }
  assert("splash_status_40", splash.statusH >= 36 && splash.statusH <= 44, `h=${splash.statusH}`);
  assert("splash_no_overzoom", splash.noOverzoom, JSON.stringify(splash));
  assert(
    "splash_tagline_visible",
    splash.showsTagline,
    `srcBottom=${splash.srcBottom.toFixed(1)} need>=${splash.taglineEnd - 12}`,
  );
  assert(
    "splash_baked_cta_cropped",
    splash.hidesBakedCta,
    `srcBottom=${splash.srcBottom.toFixed(1)} must<=${splash.bakedCtaStart}`,
  );
  assert(
    "splash_one_live_enter_opal",
    splash.liveEnterCount === 1,
    `liveEnterCount=${splash.liveEnterCount}`,
  );
  assert("splash_ctas_visible", splash.enterOk && splash.alreadyOk, JSON.stringify(splash));

  // === 2. PROFILE Continue gap ===
  await page.goto(
    `${BASE}/?opal_reset_first_run=1&opal_founder_seed=1&opal_native_host=1`,
    { waitUntil: "domcontentloaded" },
  );
  await sleep(600);
  if (await page.getByTestId("fr00-tap-begin").isVisible().catch(() => false)) {
    await page.getByTestId("fr00-tap-begin").click({ force: true });
  } else {
    await page
      .locator(".fr-splash")
      .first()
      .click({ position: { x: 195, y: 520 }, force: true })
      .catch(() => {});
  }
  await sleep(600);
  if (await page.getByTestId("opal-promise-enter").count()) {
    await page.getByTestId("opal-promise-enter").click({ force: true });
    await sleep(600);
  }
  await page.locator("#fr-phone").fill("2025550101").catch(() => {});
  await page.evaluate(() => {
    const el = document.querySelector("#otp-consent");
    if (el instanceof HTMLInputElement) {
      el.checked = true;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  await page.getByTestId("fr06-continue").click({ force: true }).catch(() => {});
  await sleep(1400);
  await page.locator("#fr-code").fill("111111").catch(() => {});
  await page.getByTestId("fr07-submit").click({ force: true }).catch(() => {});
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
    if (!meta || !cont) return { has: false, reason: "missing meta/cont" };
    const mr = meta.getBoundingClientRect();
    const cr = cont.getBoundingClientRect();
    const gap = cr.top - mr.bottom;
    const cs = getComputedStyle(cont);
    const spaceBelow = window.innerHeight - cr.bottom;
    return {
      has: true,
      gap,
      mt: cs.marginTop,
      position: cs.position,
      top: cs.top,
      contTop: cr.top,
      contBottom: cr.bottom,
      spaceBelow,
      // FAIL if gap > 48px (massive spacer) or absolute top:720 pinning
      ok: gap >= 16 && gap <= 48,
      flowLayout: cs.position === "relative" || cs.position === "static",
      // Must not sit in the bottom ~80px band with a huge gap above
      notBottomPinned: !(spaceBelow < 80 && gap > 48) && cr.top < 720,
    };
  });
  await page.screenshot({ path: resolve(OUT, "v2_profile.png") });
  assert("profile_continue_gap_24", profile.has && profile.ok, JSON.stringify(profile));
  assert("profile_continue_flow", profile.flowLayout, JSON.stringify(profile));
  assert("profile_not_bottom_pinned", profile.notBottomPinned, JSON.stringify(profile));

  // === 3–6. Chats / Calls / Thread / correlation ===
  const member = await ctx.newPage();
  await login(member, session);
  await member.getByTestId("member-tab-chats").click();
  await sleep(1800);
  await member.screenshot({ path: resolve(OUT, "v3_chats.png") });
  const chats = await member.evaluate(() => {
    const rows = [...document.querySelectorAll("[data-testid^=chats-row-], .chats-home-row")].map(
      (r) => ({
        name: r.getAttribute("data-name") || "",
        preview: r.querySelector(".chats-home-preview")?.textContent?.trim() || "",
        when: r.querySelector(".chats-home-when")?.textContent?.trim() || "",
        pill: r.querySelector("[data-testid=chat-plan-pill]")?.textContent?.trim() || "",
        conn: r.querySelector("[data-testid=chat-connection-label]")?.textContent?.trim() || "",
        border: getComputedStyle(r).borderColor,
        avatarBg: getComputedStyle(r.querySelector(".chats-home-avatar") || r).backgroundColor,
      }),
    );
    const text = document.body.innerText || "";
    return {
      rows,
      italian: /We should do something Italian/i.test(text),
      aug: /Aug \d+/i.test(text),
    };
  });
  const by = Object.fromEntries(chats.rows.map((r) => [r.name, r]));
  assert("chats_five_names", chats.rows.length >= 5 && !!by.Chanelle && !!by.Maya, JSON.stringify(chats.rows.map((r) => r.name)));
  assert("chats_no_italian", !chats.italian, JSON.stringify(chats.rows.map((r) => r.preview)));
  assert("chats_no_aug", !chats.aug, JSON.stringify(chats.rows.map((r) => r.when)));
  assert(
    "chanelle_ref",
    by.Chanelle?.preview === "Perfect — I'll grab a table." &&
      by.Chanelle?.when === "2m" &&
      /Juniper & Ivy · 7:30 PM/.test(by.Chanelle?.pill || "") &&
      /Direct connection/.test(by.Chanelle?.conn || ""),
    JSON.stringify(by.Chanelle),
  );
  assert(
    "maya_ref",
    by.Maya?.preview === "I'm free after 10" &&
      /Farmers market \+ coast/.test(by.Maya?.pill || ""),
    JSON.stringify(by.Maya),
  );
  assert(
    "juniper_ref",
    /I can make 7:30/.test(by["Juniper crew"]?.preview || "") &&
      /3 of 4 going/.test(by["Juniper crew"]?.pill || ""),
    JSON.stringify(by["Juniper crew"]),
  );
  assert(
    "sabrina_ref",
    by.Sabrina?.preview === "Sent a photo" && /Live nearby/.test(by.Sabrina?.pill || ""),
    JSON.stringify(by.Sabrina),
  );
  assert(
    "alex_ref",
    /Mexico City/.test(by.Alex?.preview || "") && /Trip Graph/.test(by.Alex?.pill || ""),
    JSON.stringify(by.Alex),
  );

  await member.locator("button:has-text('Calls')").first().click({ force: true });
  await sleep(1200);
  await member.screenshot({ path: resolve(OUT, "v4_calls.png") });
  const calls = await member.evaluate(() => {
    const text = document.body.innerText || "";
    return {
      chanelle: /Chanelle/i.test(text) && /12m ago · Audio · 14m/i.test(text),
      ready: /Sat 7:30 · Ready/i.test(text),
      juniper: /Juniper/i.test(text) && /Missed group call/i.test(text),
      callback: /Call back/i.test(text),
      maya: /Maya/i.test(text) && /Yesterday · Video · 36m/i.test(text),
    };
  });
  assert("calls_chanelle_ready", calls.chanelle && calls.ready, JSON.stringify(calls));
  assert("calls_juniper_missed", calls.juniper && calls.callback, JSON.stringify(calls));
  assert("calls_maya", calls.maya, JSON.stringify(calls));

  await member.locator("button:has-text('Chats')").first().click({ force: true });
  await sleep(600);
  await member.locator("[data-name=Chanelle]").first().click({ force: true });
  await sleep(2200);
  await member.screenshot({ path: resolve(OUT, "v5_thread.png") });
  const thread = await member.evaluate(() => {
    const bubbles = [...document.querySelectorAll(".bubble")];
    const bad = [];
    for (const b of bubbles) {
      const p = b.querySelector("p");
      const text = (p?.textContent || "").trim();
      const color = getComputedStyle(p || b).color;
      const rgb = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      const lum = rgb
        ? (0.2126 * +rgb[1] + 0.7152 * +rgb[2] + 0.0722 * +rgb[3]) / 255
        : 0;
      const fill = getComputedStyle(p || b).webkitTextFillColor || "";
      if (!text || lum < 0.45) {
        bad.push({ text: text.slice(0, 40), color, lum, fill });
      }
    }
    const body = document.body.innerText || "";
    return {
      bubbleCount: bubbles.length,
      bad,
      juniperTonight: /Juniper tonight/i.test(body),
      can730: /I can do 7:30/i.test(body),
      plan: /Juniper & Ivy|Opal lined|Confirm 7:30|Table ready|Place still open/i.test(body),
    };
  });
  assert("thread_bubbles", thread.bubbleCount >= 1, JSON.stringify(thread));
  assert("thread_readable", thread.bad.length === 0, JSON.stringify(thread.bad));
  assert(
    "thread_correlates_juniper_730",
    thread.juniperTonight || thread.can730 || thread.plan,
    JSON.stringify(thread),
  );
  assert(
    "holistic_chanelle_plan",
    /Juniper & Ivy · 7:30 PM/.test(by.Chanelle?.pill || "") && calls.ready,
    "chats pill + calls Ready must share Sat 7:30 / Juniper plan",
  );
} catch (err) {
  console.error(err);
  results.push({ name: "runner_error", ok: false, detail: String(err?.stack || err) });
} finally {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  writeFileSync(
    resolve(OUT, "VERIFY.json"),
    JSON.stringify({ tip: TIP, passed, failed, results, at: new Date().toISOString() }, null, 2),
  );
  console.log(`\n${passed} passed / ${failed} failed — tip ${TIP}`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}
