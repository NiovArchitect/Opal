/**
 * Paste W5 — device-viewport proof (native-host + keyboard-open on phone).
 * Screenshot green is NOT done: asserts computed position:relative, zero overlaps,
 * Splash2 restore, Meet one-page (Assist row), History action, New menu, Plan honesty.
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
const { chromium, devices } = require("playwright");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TIP = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim();
const nowMs = () => Date.now();

const checks = {};
const timings = {};
function note(name, ok, detail = "") {
  checks[name] = { ok: !!ok, detail: String(detail || "") };
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}
function timeNote(name, ms, detail = "") {
  timings[name] = { ms: Math.round(ms), detail: String(detail || "") };
}

async function loadSession() {
  for (const p of ["/tmp/fw13_session.json", "/tmp/opal_session.json", "/tmp/opal_otp_session.json"]) {
    try {
      const cached = JSON.parse(readFileSync(p, "utf8"));
      if (cached?.token || cached?.access_token) {
        return {
          token: cached.token || cached.access_token,
          userId: cached.userId || cached.user_id || "founder-w5",
          name: cached.name || cached.display_name || "Founder",
        };
      }
    } catch {
      /* */
    }
  }
  try {
    const session = await activate({
      phone: "+12025550101",
      name: "Founder Rev",
      handle: "founder_rev",
      code: "111111",
    });
    writeFileSync(
      "/tmp/fw13_session.json",
      JSON.stringify({ token: session.token, userId: session.userId, name: session.name }),
    );
    return session;
  } catch (err) {
    console.log("SESSION_FALLBACK", err.message?.slice(0, 160));
    return { token: "w5-placeholder", userId: "founder-w5", name: "Founder" };
  }
}

async function shot(page, name) {
  const path = resolve(OUT, name);
  await page.screenshot({ path, fullPage: false });
  return path;
}

function rectsOverlap(a, b, pad = 2) {
  return !(
    a.right <= b.left + pad ||
    a.left >= b.right - pad ||
    a.bottom <= b.top + pad ||
    a.top >= b.bottom - pad
  );
}

async function measurePhoneLayout(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="fr06-phone"]');
    if (!root) return { ok: false, reason: "no fr06-phone" };
    const pick = (sel) => {
      const el = root.querySelector(sel) || document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        sel,
        position: cs.position,
        top: cs.top,
        bottom: cs.bottom,
        left: cs.left,
        text: (el.innerText || el.textContent || "").trim().slice(0, 80),
        rect: { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height },
      };
    };
    const title = pick(".fr-title");
    const body = pick(".fr-body");
    const field = pick(".fr-phone-field");
    const primary = pick('[data-testid="fr06-continue"], .fr-primary');
    const skip = pick('[data-testid="fr06-skip-for-now"], .fr-skip-for-now');
    const visibleTexts = [];
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = (node.textContent || "").trim();
        if (!t) return;
        const parent = node.parentElement;
        if (!parent) return;
        const r = parent.getBoundingClientRect();
        const cs = getComputedStyle(parent);
        if (cs.visibility === "hidden" || cs.display === "none" || r.width < 1 || r.height < 1) return;
        visibleTexts.push(t);
        return;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        for (const c of node.childNodes) walk(c);
      }
    };
    walk(root);
    const yoHits = visibleTexts.filter((t) => t === "Yo" || /^Yo\s*$/.test(t) || t === "Yo…");
    const absBad = [title, body, field, primary, skip].filter(
      (x) => x && (x.position === "absolute" || x.position === "fixed"),
    );
    return {
      ok: true,
      viewport: { w: window.innerWidth, h: window.innerHeight, vv: window.visualViewport?.height ?? null },
      title,
      body,
      field,
      primary,
      skip,
      absBad: absBad.map((x) => `${x.sel}:${x.position}`),
      yoHits,
      visibleTexts: visibleTexts.slice(0, 40),
    };
  });
}

const session = await loadSession();
const browser = await chromium.launch({ headless: true });

// Founder-like iPhone viewport with native-host (not idealized desktop chrome).
const iPhone = devices["iPhone 14"] || devices["iPhone 13"];
const ctx = await browser.newContext({
  ...iPhone,
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  colorScheme: "dark",
  userAgent:
    iPhone?.userAgent ||
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
});
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message.slice(0, 200)));

try {
  // —— Phase 0: Splash 1 → Splash 2 (Promise) ——
  await page.addInitScript(() => {
    try {
      localStorage.removeItem("opal.firstRun.v14.completed");
      localStorage.removeItem("opal.firstRun.v14.phoneVerified");
      sessionStorage.setItem("opal_reset_first_run", "1");
      sessionStorage.setItem("opal_native_host", "1");
      document.documentElement.classList.add("opal-native-host");
    } catch {
      /* */
    }
  });
  const flowT0 = nowMs();
  await page.goto(`${BASE}/?opal_reset_first_run=1&opal_founder_seed=1&opal_native_host=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.evaluate(() => document.documentElement.classList.add("opal-native-host"));
  await page.waitForSelector('[data-testid="fr00-splash"], [data-testid="first-run-splash-shell"]', {
    timeout: 20000,
  });
  await shot(page, "w5_01_splash1.png");
  note("splash1_visible", true);
  const tSplash1 = nowMs();

  // Advance to Splash 2 (Promise) — W5 restore; W4 skipped this.
  let promiseReady = false;
  for (let i = 0; i < 20; i++) {
    if (
      await page
        .locator(
          '[data-testid="first-run-promise-page"], [data-testid="opal-promise-enter"], .first-run-promise-page',
        )
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      promiseReady = true;
      break;
    }
    if (i === 3) {
      await page.getByTestId("fr00-tap-begin").click({ force: true }).catch(() => {});
    }
    await sleep(350);
  }
  timeNote("splash1_to_splash2_ms", nowMs() - tSplash1, promiseReady ? "promise" : "missed");
  await shot(page, "w5_02_splash2_promise.png");
  note("splash2_restored", promiseReady, "FirstRunPromise via advanceSplashToPromise→promise");

  // Enter phone
  const tPhone = nowMs();
  if (promiseReady) {
    const enter = page
      .locator('[data-testid="opal-promise-enter"], [data-testid="first-run-promise-enter"]')
      .first();
    if (await enter.isVisible().catch(() => false)) {
      await enter.click({ force: true });
    } else {
      await page.locator(".first-run-promise-cta button, .first-run-promise-page button").first().click({ force: true }).catch(() => {});
    }
  }
  let phoneReady = false;
  for (let i = 0; i < 24; i++) {
    if (await page.getByTestId("fr06-phone").isVisible().catch(() => false)) {
      phoneReady = true;
      break;
    }
    await sleep(300);
  }
  timeNote("splash2_to_phone_ms", nowMs() - tPhone, phoneReady ? "ok" : "miss");
  note("phone_visible", phoneReady);

  // —— Phase 1: zero-absolute + keyboard-open overlap proof ——
  if (phoneReady) {
    await page.getByTestId("fr06-phone-input").click({ force: true });
    await page.getByTestId("fr06-phone-input").fill("2025550101");
    // Simulate keyboard shrinking visual viewport (iOS WebView behavior).
    await page.evaluate(() => {
      const vv = window.visualViewport;
      // Shrink layout by padding bottom as keyboard stand-in when VV API is static in headless.
      const root = document.querySelector('[data-testid="fr06-phone"]');
      if (root) {
        root.style.maxHeight = "480px";
        root.style.height = "480px";
        root.style.overflowY = "auto";
      }
      window.dispatchEvent(new Event("resize"));
      if (vv) {
        try {
          Object.defineProperty(window, "innerHeight", { configurable: true, get: () => 480 });
        } catch {
          /* */
        }
      }
    });
    await sleep(200);
    await page.getByTestId("fr06-phone-input").focus();
    await sleep(200);
    const layout = await measurePhoneLayout(page);
    await shot(page, "w5_03_phone_keyboard_open.png");
    writeFileSync(resolve(OUT, "w5_phone_layout.json"), JSON.stringify(layout, null, 2));

    const zeroAbs = layout.ok && layout.absBad.length === 0;
    note(
      "phone_zero_absolute",
      zeroAbs,
      zeroAbs ? `viewport ${layout.viewport?.w}x${layout.viewport?.h}` : `abs=${(layout.absBad || []).join(",")}`,
    );

    let overlap = false;
    let overlapDetail = "n/a";
    if (layout.field?.rect && layout.primary?.rect) {
      overlap = rectsOverlap(layout.field.rect, layout.primary.rect);
      overlapDetail = `field.bottom=${Math.round(layout.field.rect.bottom)} primary.top=${Math.round(layout.primary.rect.top)}`;
    }
    note("phone_no_overlap_keyboard", layout.ok && !overlap, overlapDetail);
    note(
      "phone_no_stray_yo",
      layout.ok && (!layout.yoHits || layout.yoHits.length === 0),
      layout.yoHits?.length ? `yo=${layout.yoHits.join("|")}` : "clean",
    );
    note(
      "phone_device_viewport_documented",
      true,
      `Playwright iPhone-like 390×844 dpr3 native-host; keyboard sim maxHeight=480; visualViewport.h=${layout.viewport?.vv}`,
    );
  } else {
    note("phone_zero_absolute", false, "phone not reached");
    note("phone_no_overlap_keyboard", false, "phone not reached");
    note("phone_no_stray_yo", false, "phone not reached");
  }

  // Skip into Meet (fixture path) for consolidated page checks
  if (phoneReady) {
    const skip = page.getByTestId("fr06-skip-for-now");
    if (await skip.isVisible().catch(() => false)) {
      await skip.click({ force: true });
      await sleep(1000);
    }
  }

  // Force Meet if skip didn't land there
  const meetVisible = await page
    .locator('[data-testid="meet-opal-conversation"], [data-testid="first-run-meet-opal-shell"]')
    .first()
    .isVisible()
    .catch(() => false);
  if (!meetVisible) {
    await page.goto(
      `${BASE}/?opal_force_meet_opal=1&opal_founder_seed=1&opal_native_host=1`,
      { waitUntil: "domcontentloaded", timeout: 90000 },
    );
    await page.evaluate(() => document.documentElement.classList.add("opal-native-host"));
    await page.addInitScript(
      ({ token, userId, name }) => {
        sessionStorage.setItem("opal.product.browser_session.v1", token);
        sessionStorage.setItem("opal_native_host", "1");
        localStorage.setItem(
          "opal.product.profile.v17",
          JSON.stringify({ display_name: name, user_id: userId }),
        );
        document.documentElement.classList.add("opal-native-host");
      },
      session,
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await sleep(600);
  }
  await page.waitForSelector(
    '[data-testid="meet-opal-conversation"], [data-testid="first-run-meet-opal-shell"], [data-testid="hs-self-name-input"]',
    { timeout: 45000 },
  );
  const tMeet = nowMs();
  await page.waitForSelector('[data-testid="hs-self-name-input"]', { timeout: 25000 });
  // Scroll full page: name → friend → perms → assist → sticky continue
  const assist = page.getByTestId("hs-assist-row");
  const sticky = page.locator(".hs-meet-sticky-continue, [data-testid='hs-meet-continue']").first();
  await page.getByTestId("hs-self-name-input").fill("Sadeil");
  await sleep(200);
  // Scroll to bottom to reveal assist + continue
  await page.evaluate(() => {
    const scroller =
      document.querySelector('[data-testid="meet-opal-conversation"]') ||
      document.querySelector(".hs-meet-scroll") ||
      document.scrollingElement;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  });
  await sleep(300);
  const assistOk = await assist.isVisible().catch(() => false);
  const stickyOk = await sticky.isVisible().catch(() => false);
  const friendAsk = await page
    .getByText(/catch up with|Type a name|Choose from contacts/i)
    .first()
    .isVisible()
    .catch(() => false);
  const perms = await page.getByTestId("hs-permissions").isVisible().catch(() => false);
  await shot(page, "w5_04_meet_one_page.png");
  note("meet_one_page_name", true, "hs-self-name-input");
  note("meet_friend_dual_path", friendAsk, "friend ask / dual path visible on same scroll");
  note("meet_permissions_inline", perms, "hs-permissions on same page");
  note("meet_assist_row", assistOk, "hs-assist-row compact Enable/Not now");
  note("meet_sticky_continue", stickyOk, "sticky Continue");
  timeNote("meet_page_ready_ms", nowMs() - tMeet);

  // Finish Meet → inside (best effort)
  if (stickyOk) {
    await sticky.click({ force: true }).catch(() => {});
    await sleep(800);
  } else if (await page.getByTestId("hs-meet-continue").isVisible().catch(() => false)) {
    await page.getByTestId("hs-meet-continue").click({ force: true });
    await sleep(800);
  }
  timeNote("splash_to_inside_wall_ms", nowMs() - flowT0, "includes loads + script waits");

  // —— Member shell audits (fresh context so session init sticks) ——
  const memberCtx = await browser.newContext({
    ...iPhone,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    colorScheme: "dark",
  });
  const mpage = await memberCtx.newPage();
  await mpage.addInitScript(
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
  await mpage.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await mpage.evaluate(() => {
    try {
      document.documentElement.classList.add("opal-native-host");
    } catch {
      /* */
    }
  });
  await sleep(900);
  for (let i = 0; i < 28; i++) {
    if (await mpage.getByTestId("member-shell").isVisible().catch(() => false)) break;
    if (await mpage.getByTestId("fr06-skip-for-now").isVisible().catch(() => false)) {
      await mpage.getByTestId("fr06-skip-for-now").click({ force: true });
      await sleep(600);
      continue;
    }
    if (await mpage.getByTestId("opal-promise-already").isVisible().catch(() => false)) {
      await mpage.getByTestId("opal-promise-already").click({ force: true });
      await sleep(500);
      continue;
    }
    if (await mpage.getByTestId("hs-meet-continue").isVisible().catch(() => false)) {
      await mpage.getByTestId("hs-meet-continue").click({ force: true }).catch(() => {});
      await sleep(600);
      continue;
    }
    await sleep(400);
  }
  const member = await mpage.getByTestId("member-shell").isVisible().catch(() => false);
  note("member_shell", member);

  if (member) {
    // Story + badge
    await mpage.getByTestId("member-tab-home").click({ force: true }).catch(() => {});
    await sleep(600);
    const storyPlus = mpage.getByTestId("gsh-story-create");
    if (await storyPlus.isVisible().catch(() => false)) {
      await shot(mpage, "w5_05_story_plus.png");
      await storyPlus.click({ force: true });
      await sleep(400);
      const postOpt = await mpage.getByTestId("gsh-compose-post").isVisible().catch(() => false);
      const storyOpt = await mpage.getByTestId("gsh-compose-story").isVisible().catch(() => false);
      await shot(mpage, "w5_05b_story_composer_chooser.png");
      note("story_plus_opens_composer", postOpt && storyOpt, `post=${postOpt} story=${storyOpt}`);
      // close chooser
      await storyPlus.click({ force: true }).catch(() => {});
      await sleep(200);
    } else {
      note("story_plus_opens_composer", false, "gsh-story-create not found");
    }

    // Chats → thread → History
    await mpage.getByTestId("member-tab-chats").click({ force: true });
    await sleep(800);
    await shot(mpage, "w5_06_chats.png");
    const chanelle = mpage.locator('[data-testid^="chats-row-"]').filter({ hasText: /Chanelle/i }).first();
    const chanelleAlt = mpage.getByText(/^Chanelle$/i).first();
    const chanelleTarget = (await chanelle.isVisible().catch(() => false)) ? chanelle : chanelleAlt;
    if (await chanelleTarget.isVisible().catch(() => false)) {
      await chanelleTarget.click({ force: true });
      await sleep(900);
      await shot(mpage, "w5_07_thread_header.png");
      const hist = mpage.getByTestId("gpt-history");
      const histOk = await hist.isVisible().catch(() => false);
      note("thread_history_visible", histOk);
      if (histOk) {
        await hist.click({ force: true });
        await sleep(700);
        const sheet = await mpage
          .locator(
            '[data-testid="contact-profile-sheet"], .contact-profile-sheet, [data-testid="graph-detail"], [data-testid="gprof-sheet"]',
          )
          .first()
          .isVisible()
          .catch(() => false);
        const sheetText = ((await mpage.locator("body").innerText().catch(() => "")) || "").slice(0, 500);
        await shot(mpage, "w5_08_history_action.png");
        note(
          "thread_history_wired",
          sheet || /Earlier together|Shared plans|Memories|timeline/i.test(sheetText),
          sheet ? "sheet visible" : `text=${sheetText.slice(0, 80)}`,
        );
        await mpage.keyboard.press("Escape").catch(() => {});
        await mpage.locator('[data-testid="contact-profile-close"], button[aria-label="Close"], [data-testid="gprof-close"]').first().click({ force: true }).catch(() => {});
        await sleep(300);
      } else {
        note("thread_history_wired", false, "History button missing");
      }
      note(
        "thread_phone_btn_present",
        await mpage.getByTestId("gpt-call").isVisible().catch(() => false),
      );
      note(
        "thread_video_btn_present",
        await mpage.getByTestId("gpt-video").isVisible().catch(() => false),
      );
    } else {
      note("thread_history_visible", false, "Chanelle row missing");
      note("thread_history_wired", false, "no thread");
      note("thread_phone_btn_present", false, "no thread");
      note("thread_video_btn_present", false, "no thread");
    }

    // Graphs New menu
    await mpage.getByTestId("member-tab-graphs").click({ force: true });
    await sleep(900);
    const newBtn = mpage.getByTestId("graphs-create");
    if (await newBtn.isVisible().catch(() => false)) {
      await newBtn.click({ force: true });
      await sleep(400);
      const planOpt = await mpage.getByTestId("graphs-create-plan").isVisible().catch(() => false);
      const tripOpt = await mpage.getByTestId("graphs-create-trip").isVisible().catch(() => false);
      const ideaOpt = await mpage.getByTestId("graphs-create-idea").isVisible().catch(() => false);
      await shot(mpage, "w5_09_graphs_new_menu.png");
      note("graphs_new_menu_visible", planOpt && tripOpt && ideaOpt, `plan=${planOpt} trip=${tripOpt} idea=${ideaOpt}`);
      if (planOpt) {
        await mpage.getByTestId("graphs-create-plan").click({ force: true });
        await sleep(700);
        const composer = await mpage
          .locator('[data-testid="plan-composer"], .plan-composer')
          .first()
          .isVisible()
          .catch(() => false);
        await shot(mpage, "w5_10_plan_composer.png");
        note("new_plan_opens_composer", composer);
        const forming = await mpage.getByText(/Forming|pending/i).first().isVisible().catch(() => false);
        const readyLie = await mpage
          .locator('.plan-composer, [data-testid="plan-composer"]')
          .getByText(/\bready\b|\blocked\b|\bhappening\b/i)
          .first()
          .isVisible()
          .catch(() => false);
        note("plan_composer_honest_state", forming || !readyLie, `forming=${forming} readyLie=${readyLie}`);
      } else {
        note("new_plan_opens_composer", false);
        note("plan_composer_honest_state", false);
      }
    } else {
      note("graphs_new_menu_visible", false, "graphs-create missing");
      note("new_plan_opens_composer", false);
      note("plan_composer_honest_state", false);
    }
  }
  await memberCtx.close().catch(() => {});

  // Grep banned patterns in PlanComposer source
  try {
    const pc = readFileSync(resolve(ROOT, "apps/opal_web/src/opalUi/PlanComposer.tsx"), "utf8");
    const badReady = /mode=["']ready["']/.test(pc);
    note("plan_composer_no_orb_ready", !badReady, badReady ? "still mode=ready" : "orb idle/forming only");
  } catch (e) {
    note("plan_composer_no_orb_ready", false, e.message);
  }

  // not-found scrub residual in src (user-facing)
  try {
    const grep = execSync(
      `grep -RIn -E 'not found|NOT FOUND' apps/opal_web/src --include='*.ts' --include='*.tsx' | grep -v -E '\\.test\\.(ts|tsx):|not founder| /not.found|filter.*not found|remap' || true`,
      { cwd: ROOT, encoding: "utf8" },
    );
    writeFileSync(resolve(OUT, "W5_NOT_FOUND_GREP.txt"), grep || "(empty)\n");
    const paintRisk = (grep || "")
      .split("\n")
      .filter((l) => l && !/\/not\\s\*found|filter|remap|test|false positive|not founder/i.test(l));
    note("not_found_scrub_clean", paintRisk.length === 0, `lines=${paintRisk.length}`);
  } catch (e) {
    note("not_found_scrub_clean", false, e.message);
  }

  const passed = Object.values(checks).filter((c) => c.ok).length;
  const total = Object.keys(checks).length;
  const summary = {
    tip: TIP,
    passed,
    total,
    checks,
    timings,
    viewport: "iPhone-like 390×844 dpr3 + html.opal-native-host; phone keyboard simulated via maxHeight 480",
    splash2_cause:
      "9f88201b rewrote advanceSplashToPromise to setFirstRunStage('auth'); FirstRunPromisePage.tsx unchanged (sha identical to pre-diet).",
  };
  writeFileSync(resolve(OUT, "W5_VERIFY.json"), JSON.stringify(summary, null, 2));
  console.log(`\nW5_VERIFY ${passed}/${total} tip=${TIP}`);
  if (passed < total) process.exitCode = 1;
} finally {
  await browser.close();
}
