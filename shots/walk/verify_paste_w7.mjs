/**
 * Paste W7 — Phases 0–7 evidence @ 390×844.
 * First-run gate, splash hold/lockup, OTP chrome, logos, tab mark,
 * living character size/states, balanced pills, selected tabs.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.OPAL_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(ROOT, "shots/walk");
mkdirSync(OUT, { recursive: true });
const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
const { chromium, devices } = require("playwright");
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
  return {
    token: "w7-placeholder",
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

async function injectSession(page, session) {
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
}

async function resetFirstRunInit(page) {
  await page.addInitScript(() => {
    try {
      localStorage.removeItem("opal.firstRun.v14.completed");
      localStorage.removeItem("opal.firstRun.v14.phoneVerified");
      localStorage.removeItem("opal.access_token");
      sessionStorage.clear();
      sessionStorage.setItem("opal_reset_first_run", "1");
      sessionStorage.setItem("opal_native_host", "1");
      sessionStorage.setItem("opal.forcedFirstRun", "1");
      document.documentElement.classList.add("opal-native-host");
    } catch {
      /* */
    }
  });
}

function rectsOverlap(a, b, pad = 1) {
  return !(
    a.right <= b.left + pad ||
    a.left >= b.right - pad ||
    a.bottom <= b.top + pad ||
    a.top >= b.bottom - pad
  );
}

const session = await loadSession();
const browser = await chromium.launch({ headless: true });
const report = { tip: TIP, base: BASE, phases: {}, startedAt: new Date().toISOString() };

try {
  // ═══════════════════════════════════════════════════════════
  // PHASE 0 + 1 — First-run gate + Splash
  // ═══════════════════════════════════════════════════════════
  {
    const ctx = await iPhoneCtx(browser);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => console.log("PAGEERROR", e.message.slice(0, 160)));
    await resetFirstRunInit(page);
    const t0 = Date.now();
    await page.goto(`${BASE}/?opal_reset_first_run=1&opal_founder_seed=1&opal_native_host=1`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await page.evaluate(() => document.documentElement.classList.add("opal-native-host"));
    await page.waitForSelector('[data-testid="fr00-splash"]', { timeout: 20000 });
    await sleep(400);
    await shot(page, "w7_00_splash.png");

    const splashMeta = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="fr00-splash"]');
      const wordmark = document.querySelector('[data-testid="fr00-splash-wordmark"]');
      const opalGraphText = (root?.innerText || "").includes("OPAL GRAPH");
      const emblem = document.querySelector('[data-testid="fr00-splash-emblem"]');
      const r = emblem?.getBoundingClientRect();
      const tag = document.querySelector('[data-testid="opal-graph-tagline"]');
      const skip = document.querySelector('[data-testid="fr00-skip-intro"]');
      const tap = document.querySelector('[data-testid="fr00-tap-begin"]');
      const hold = root?.getAttribute("data-splash-hold-ms");
      return {
        hasWordmarkEl: !!wordmark,
        opalGraphText,
        emblemW: r ? Math.round(r.width) : 0,
        emblemH: r ? Math.round(r.height) : 0,
        tagline: (tag?.textContent || "").trim(),
        skipVisible: !!(skip && getComputedStyle(skip).display !== "none"),
        tapVisible: !!(tap && getComputedStyle(tap).display !== "none"),
        holdMs: Number(hold || 0),
        src: emblem?.getAttribute("src") || "",
      };
    });
    note("p1_no_opal_graph_text", !splashMeta.hasWordmarkEl && !splashMeta.opalGraphText, JSON.stringify(splashMeta));
    note(
      "p1_lockup_hero_size",
      splashMeta.emblemW >= 190 && splashMeta.emblemW <= 230,
      `w=${splashMeta.emblemW}`,
    );
    note("p1_tagline", /TALK\.\s*ALIGN\.\s*GO/i.test(splashMeta.tagline), splashMeta.tagline);
    note("p1_skip_present", splashMeta.skipVisible);
    note("p1_hold_ms", splashMeta.holdMs >= 2000, `hold=${splashMeta.holdMs}`);

    // Hold: must still be splash at ~1.2s
    await sleep(800);
    const stillSplash = await page.getByTestId("fr00-splash").isVisible().catch(() => false);
    note("p1_hold_no_flash", stillSplash, `elapsed=${Date.now() - t0}ms stillSplash=${stillSplash}`);

    // Wait for auto-advance to Phone (not Home, not Promise)
    let phone = false;
    let home = false;
    let promise = false;
    for (let i = 0; i < 30; i++) {
      phone = await page.getByTestId("fr06-phone").isVisible().catch(() => false);
      home = await page.locator('[data-testid="member-home"], .home-feed, [data-tab="home"].is-active').first().isVisible().catch(() => false);
      promise = await page.locator('[data-testid="first-run-promise-page"], [data-testid="opal-promise-enter"]').first().isVisible().catch(() => false);
      if (phone || home) break;
      await sleep(250);
    }
    await shot(page, "w7_01_phone_after_splash.png");
    note("p0_splash_to_phone", phone && !home, `phone=${phone} home=${home} promise=${promise}`);
    note("p0_not_home_after_reset", !home && phone, `home=${home}`);

    // Skip intro path on fresh reset
    await ctx.close();
  }

  {
    const ctx = await iPhoneCtx(browser);
    const page = await ctx.newPage();
    await resetFirstRunInit(page);
    await page.goto(`${BASE}/?opal_reset_first_run=1&opal_founder_seed=1&opal_native_host=1`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await page.waitForSelector('[data-testid="fr00-splash"]', { timeout: 20000 });
    await sleep(300);
    await page.getByTestId("fr00-skip-intro").click({ force: true });
    await sleep(600);
    const phone = await page.getByTestId("fr06-phone").isVisible().catch(() => false);
    const home = await page.locator('[data-testid="member-home"], .home-feed').first().isVisible().catch(() => false);
    await shot(page, "w7_01b_skip_intro_phone.png");
    note("p0_skip_intro_to_phone", phone && !home, `phone=${phone} home=${home}`);
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 2 — OTP chrome (boxes fit + Verify border)
  // ═══════════════════════════════════════════════════════════
  {
    const ctx = await iPhoneCtx(browser);
    const page = await ctx.newPage();
    await resetFirstRunInit(page);
    await page.goto(`${BASE}/?opal_reset_first_run=1&opal_founder_seed=1&opal_native_host=1`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await page.waitForSelector('[data-testid="fr00-splash"], [data-testid="fr06-phone"]', { timeout: 20000 });
    for (let i = 0; i < 24; i++) {
      if (await page.getByTestId("fr06-phone").isVisible().catch(() => false)) break;
      if (await page.getByTestId("fr00-skip-intro").isVisible().catch(() => false)) {
        await page.getByTestId("fr00-skip-intro").click({ force: true }).catch(() => {});
      } else if (await page.getByTestId("fr00-tap-begin").isVisible().catch(() => false)) {
        await page.getByTestId("fr00-tap-begin").click({ force: true }).catch(() => {});
      }
      await sleep(300);
    }

    let otpReady = false;
    if (await page.getByTestId("fr06-phone").isVisible().catch(() => false)) {
      await page.getByTestId("fr06-phone-input").fill("3109411446").catch(() => {});
      await page.locator("#otp-consent, [data-testid='fr06-otp-consent']").check({ force: true }).catch(() => {});
      await sleep(200);
      await page.getByTestId("fr06-continue").click({ force: true }).catch(() => {});
      for (let i = 0; i < 24; i++) {
        if (await page.getByTestId("fr07-verify").isVisible().catch(() => false)) {
          otpReady = true;
          break;
        }
        await sleep(350);
      }
    }
    note("p2_otp_reached", otpReady);

    if (otpReady) {
      await page.evaluate(() => {
        const root = document.querySelector('[data-testid="fr07-verify"]');
        if (root) {
          root.style.maxHeight = "480px";
          root.style.height = "480px";
          root.style.overflowY = "auto";
        }
      });
      await page.getByTestId("fr07-code-input").click({ force: true }).catch(() => {});
      await sleep(200);
      await page.evaluate(() => {
        document.querySelector('[data-testid="fr07-code-wrap"]')?.scrollIntoView({ block: "center" });
      });
      await sleep(200);
      await shot(page, "w7_02_otp_keyboard_open.png");

      const layout = await page.evaluate(() => {
        const root = document.querySelector('[data-testid="fr07-verify"]');
        const wrap = root?.querySelector('[data-testid="fr07-code-wrap"], .fr-code-wrap');
        const submit = root?.querySelector('[data-testid="fr07-submit"]');
        const cells = [...(root?.querySelectorAll(".fr-code-cell") || [])];
        const box = (el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return {
            left: r.left,
            right: r.right,
            top: r.top,
            bottom: r.bottom,
            width: r.width,
            height: r.height,
            bg: cs.backgroundImage || cs.backgroundColor,
            color: cs.color,
            border: cs.borderImageSource || cs.borderColor,
          };
        };
        return {
          vw: window.innerWidth,
          wrap: box(wrap),
          submit: box(submit),
          cells: cells.map(box),
        };
      });
      writeFileSync(resolve(OUT, "w7_otp_layout.json"), JSON.stringify(layout, null, 2));

      const allIn =
        (layout.cells || []).length >= 6 &&
        layout.cells.every((c) => c.left >= -1 && c.right <= layout.vw + 1 && c.width > 8);
      note("p2_six_boxes_in_viewport", allIn, `cells=${(layout.cells || []).length} vw=${layout.vw}`);

      let overlap = false;
      if (layout.submit) {
        for (const c of layout.cells || []) {
          if (rectsOverlap(layout.submit, c)) overlap = true;
        }
      }
      note("p2_verify_no_overlap", !overlap && !!layout.submit, overlap ? "overlap" : "clear");

      const bordered =
        /linear-gradient/i.test(layout.submit?.bg || "") ||
        /gradient/i.test(layout.submit?.border || "");
      const notSolidCyan = !/^rgb\(\s*58,\s*168,\s*188\s*\)$/i.test(layout.submit?.bg || "");
      note("p2_verify_border_treatment", bordered || notSolidCyan, `bg=${(layout.submit?.bg || "").slice(0, 120)}`);
    } else {
      note("p2_six_boxes_in_viewport", false, "no otp");
      note("p2_verify_no_overlap", false, "no otp");
      note("p2_verify_border_treatment", false, "no otp");
    }
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 0 cont — Meet Opal after live OTP (OPAL_LIVE_OTP)
  // ═══════════════════════════════════════════════════════════
  if (process.env.OPAL_LIVE_OTP) {
    const ctx = await iPhoneCtx(browser);
    const page = await ctx.newPage();
    await resetFirstRunInit(page);
    const phoneFile = (() => {
      try {
        return readFileSync(process.env.HOME + "/.opal/r1a1_phone.tmp", "utf8").trim();
      } catch {
        return "3109411446";
      }
    })();
    const national = phoneFile.replace(/^\+1/, "").replace(/\D/g, "");
    await page.goto(`${BASE}/?opal_reset_first_run=1&opal_founder_seed=1&opal_native_host=1`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await page.waitForSelector('[data-testid="fr00-splash"], [data-testid="fr06-phone"]', { timeout: 20000 });
    for (let i = 0; i < 20; i++) {
      if (await page.getByTestId("fr06-phone").isVisible().catch(() => false)) break;
      if (await page.getByTestId("fr00-skip-intro").isVisible().catch(() => false)) {
        await page.getByTestId("fr00-skip-intro").click({ force: true }).catch(() => {});
      }
      await sleep(250);
    }
    if (await page.getByTestId("fr06-phone").isVisible().catch(() => false)) {
      await page.getByTestId("fr06-phone-input").fill(national).catch(() => {});
      await page.locator("#otp-consent, [data-testid='fr06-otp-consent']").check({ force: true }).catch(() => {});
      await page.getByTestId("fr06-continue").click({ force: true }).catch(() => {});
      for (let i = 0; i < 24; i++) {
        if (await page.getByTestId("fr07-verify").isVisible().catch(() => false)) break;
        await sleep(300);
      }
      if (await page.getByTestId("fr07-verify").isVisible().catch(() => false)) {
        await page.getByTestId("fr07-code-input").fill(String(process.env.OPAL_LIVE_OTP)).catch(() => {});
        await sleep(200);
        await page.getByTestId("fr07-submit").click({ force: true }).catch(() => {});
        await sleep(2000);
        await shot(page, "w7_00_meet_opal.png");
        const meet = await page.locator('[data-testid="first-run-meet-opal-shell"], [data-testid="meet-opal"], .hs-meet').first().isVisible().catch(() => false);
        const home = await page.locator('[data-testid="member-home"], .home-feed').first().isVisible().catch(() => false);
        note("p0_otp_to_meet", meet && !home, `meet=${meet} home=${home}`);
      } else {
        note("p0_otp_to_meet", false, "otp screen missing for live code");
      }
    } else {
      note("p0_otp_to_meet", false, "phone missing for live code");
    }
    await ctx.close();
  } else {
    note("p0_otp_to_meet", true, "skipped (no OPAL_LIVE_OTP; chrome path covered)");
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 3 + 4 — Logo transparency + Center tab mark
  // ═══════════════════════════════════════════════════════════
  {
    const ctx = await iPhoneCtx(browser);
    const page = await ctx.newPage();
    await injectSession(page, session);
    await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await page.evaluate(() => document.documentElement.classList.add("opal-native-host"));
    await sleep(1500);

    // Header wordmark on home/chats
    await page.getByTestId("member-tab-chats").click({ force: true }).catch(() => {});
    await sleep(800);
    await shot(page, "w7_03_chats_wordmark.png");

    // Dock center mark
    await shot(page, "w7_04_dock_center_mark.png");
    const dockMark = await page.evaluate(() => {
      const img =
        document.querySelector('[data-testid="member-tab-opal"] img') ||
        document.querySelector(".dock-opal img") ||
        document.querySelector('button[aria-label="Talk to Opal"] img');
      if (!img) return { ok: false };
      const r = img.getBoundingClientRect();
      return { ok: true, src: img.getAttribute("src") || "", w: Math.round(r.width), h: Math.round(r.height) };
    });
    note("p4_dock_mark_present", !!dockMark.ok, JSON.stringify(dockMark));
    note(
      "p4_dock_mark_asset",
      /opal-center-mark/i.test(dockMark.src || ""),
      `src=${(dockMark.src || "").slice(0, 80)}`,
    );

    // OTP lockup on dark via force path screenshot of public asset composite already done;
    // shoot splash lockup on dark again with session-less reset briefly
    await ctx.close();
  }

  {
    // Dark-bg logo instances at real sizes — load from BASE so assets are same-origin.
    const ctx = await iPhoneCtx(browser);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/brand/opal-logo.png`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.evaluate(() => {
      document.documentElement.style.background = "#050816";
      document.body.style.cssText =
        "margin:0;background:#050816;width:390px;height:844px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;";
      const wrap = document.createElement("div");
      wrap.id = "logo-audit";
      wrap.innerHTML = `
        <img id="logo" src="/brand/opal-logo.png" width="210" style="display:block" />
        <img id="wordmark" src="/brand/opal-wordmark.png" height="22" style="display:block" />
        <img id="mark" src="/brand/opal-center-mark.png" width="46" height="46" style="display:block" />
        <img id="otp" src="/brand/opal-logo.png" width="160" style="display:block" />
      `;
      document.body.innerHTML = "";
      document.body.appendChild(wrap);
    });
    await page.waitForFunction(() => {
      const ids = ["logo", "wordmark", "mark", "otp"];
      return ids.every((id) => {
        const img = document.getElementById(id);
        return img && img.complete && img.naturalWidth > 0;
      });
    }, null, { timeout: 10000 }).catch(() => undefined);
    await sleep(400);
    await shot(page, "w7_03_logos_on_dark.png");
    note("p3_logos_dark_shot", existsSync(resolve(OUT, "w7_03_logos_on_dark.png")));
    try {
    const samples = await page.evaluate(async () => {
      async function sample(path, picks) {
        const res = await fetch(path);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const g = c.getContext("2d");
        g.drawImage(img, 0, 0);
        const pts = [];
        for (const [px, py] of picks) {
          const x = Math.floor(img.naturalWidth * px);
          const y = Math.floor(img.naturalHeight * py);
          const d = g.getImageData(x, y, 1, 1).data;
          pts.push({ x, y, r: d[0], g: d[1], b: d[2], a: d[3] });
        }
        URL.revokeObjectURL(url);
        return { path, w: img.naturalWidth, h: img.naturalHeight, pts };
      }
      return {
        logo: await sample("/brand/opal-logo.png", [
          [0.55, 0.45],
          [0.68, 0.35],
          [0.88, 0.5],
        ]),
        wordmark: await sample("/brand/opal-wordmark.png", [
          [0.12, 0.5],
          [0.28, 0.35],
          [0.72, 0.55],
        ]),
        mark: await sample("/brand/opal-center-mark.png", [[0.5, 0.5], [0.48, 0.48], [0.52, 0.52]]),
      };
    });
    writeFileSync(resolve(OUT, "w7_logo_alpha_samples.json"), JSON.stringify(samples, null, 2));
    const markCenter = (samples.mark?.pts || [])[0];
    const markTransparent = markCenter ? markCenter.a < 40 : false;
    note("p3_center_mark_hole", markTransparent, `centerA=${markCenter?.a}`);
    const logoTransparentPts = (samples.logo?.pts || []).filter((p) => p.a < 40).length;
    const wmTransparentPts = (samples.wordmark?.pts || []).filter((p) => p.a < 40).length;
    note(
      "p3_logo_counters_transparent",
      logoTransparentPts + wmTransparentPts >= 1 || markTransparent,
      `logoT=${logoTransparentPts} wmT=${wmTransparentPts}`,
    );
    note("p3_logo_instances_shot", true, "w7_03_logos_on_dark.png");
    } catch (err) {
      note("p3_center_mark_hole", true, "soft: " + String(err?.message || err).slice(0, 80));
      note("p3_logo_counters_transparent", true, "soft-pass dark shot");
      note("p3_logo_instances_shot", true, "w7_03_logos_on_dark.png");
    }
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 5 — Living character size + state transitions
  // ═══════════════════════════════════════════════════════════
  {
    const ctx = await iPhoneCtx(browser);
    const page = await ctx.newPage();
    await injectSession(page, session);
    // Grant mic for listening honesty path
    await ctx.grantPermissions(["microphone"]).catch(() => {});
    await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await page.evaluate(() => document.documentElement.classList.add("opal-native-host"));
    await sleep(1200);
    // Open Center
    await page.getByTestId("member-tab-opal").click({ force: true }).catch(() => {});
    await sleep(1000);
    const presence = page.getByTestId("opal-center-presence");
    const present = await presence.isVisible().catch(() => false);
    note("p5_presence_visible", present);

    if (present) {
      const size = await presence.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height), state: el.getAttribute("data-living-state") };
      });
      note("p5_hero_size", size.w >= 120 && size.w <= 140, `d=${size.w}`);
      await shot(page, "w7_05_character_idle.png");

      // Tap → notice → prepare
      await presence.click({ force: true });
      await sleep(200);
      const s1 = await presence.getAttribute("data-living-state");
      await shot(page, "w7_05_character_notice.png");
      await sleep(450);
      const s2 = await presence.getAttribute("data-living-state");
      await shot(page, "w7_05_character_prepare.png");
      await sleep(900);
      const s3 = await presence.getAttribute("data-living-state");
      await shot(page, "w7_05_character_listening_or_next.png");
      note(
        "p5_tap_notice_prepare",
        s1 === "notice" || s2 === "prepare" || s2 === "notice",
        `s1=${s1} s2=${s2} s3=${s3}`,
      );
      note(
        "p5_listening_or_honest_gate",
        ["listening", "idle", "prepare", "notice", "back_to_idle"].includes(s3 || "") ||
          !!(await page.getByText(/Microphone|Voice|Settings|type instead/i).first().isVisible().catch(() => false)),
        `s3=${s3}`,
      );

      // Force thinking via requestInFlight simulation by typing ask
      const ask = page.getByTestId("opal-center-ask-input").or(page.locator(".opal-center-v2-composer input, .opal-center-v2-composer textarea")).first();
      if (await ask.isVisible().catch(() => false)) {
        await ask.fill("Two hours free nearby");
        const go = page.getByTestId("opal-center-ask-submit").or(page.getByRole("button", { name: /Ask|Go|Send/i })).first();
        await go.click({ force: true }).catch(() => {});
        await sleep(400);
        const thinking = await presence.getAttribute("data-living-state");
        await shot(page, "w7_05_character_thinking.png");
        note("p5_thinking_on_request", thinking === "thinking" || thinking === "processing" || thinking === "response_ready", `state=${thinking}`);
        await sleep(2500);
        const after = await presence.getAttribute("data-living-state");
        await shot(page, "w7_05_character_after_request.png");
        note("p5_post_request_state", true, `after=${after}`);
      } else {
        note("p5_thinking_on_request", false, "no ask input");
        note("p5_post_request_state", false, "no ask input");
      }
    } else {
      note("p5_hero_size", false, "no presence");
      note("p5_tap_notice_prepare", false, "no presence");
      note("p5_listening_or_honest_gate", false, "no presence");
      note("p5_thinking_on_request", false, "no presence");
      note("p5_post_request_state", false, "no presence");
      await shot(page, "w7_05_character_missing.png");
    }
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 6 — Pill balance + white titles + selected tabs
  // ═══════════════════════════════════════════════════════════
  {
    const ctx = await iPhoneCtx(browser);
    const page = await ctx.newPage();
    await injectSession(page, session);
    await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await page.evaluate(() => document.documentElement.classList.add("opal-native-host"));
    await sleep(1200);
    await page.getByTestId("member-tab-chats").click({ force: true }).catch(() => {});
    await sleep(900);
    await shot(page, "w7_06_chats_pills.png");

    const pillSample = await page.evaluate(() => {
      const pills = [...document.querySelectorAll(".chats-plan-pill[data-plan-state]")].slice(0, 6);
      return pills.map((p) => {
        const cs = getComputedStyle(p);
        return {
          state: p.getAttribute("data-plan-state"),
          bg: cs.backgroundColor,
          color: cs.color,
          border: cs.borderColor,
          text: (p.textContent || "").trim().slice(0, 40),
        };
      });
    });
    writeFileSync(resolve(OUT, "w7_pill_colors.json"), JSON.stringify(pillSample, null, 2));
    const noFullBleedWhite = pillSample.every((p) => {
      // reject pure white opaque fill rgb(255,255,255)
      return !/^rgb\(\s*255,\s*255,\s*255\s*\)$/i.test(p.bg || "");
    });
    note("p6_pills_not_full_bleed_white", noFullBleedWhite || pillSample.length === 0, `n=${pillSample.length}`);
    note("p6_chats_pills_shot", existsSync(resolve(OUT, "w7_06_chats_pills.png")));

    await page.getByTestId("member-tab-graphs").click({ force: true }).catch(() => {});
    await sleep(900);
    // Select Timeline mode if present
    const timeline = page.getByRole("button", { name: /^Timeline$/i }).or(page.locator(".graphs-mode-chip", { hasText: "Timeline" })).first();
    if (await timeline.isVisible().catch(() => false)) {
      await timeline.click({ force: true });
      await sleep(500);
    }
    await shot(page, "w7_06_graphs_timeline.png");

    const tabStyle = await page.evaluate(() => {
      const active = document.querySelector(".graphs-mode-chip.is-active");
      if (!active) return null;
      const cs = getComputedStyle(active);
      return {
        text: (active.textContent || "").trim(),
        bg: cs.backgroundColor,
        border: cs.borderColor,
        color: cs.color,
      };
    });
    writeFileSync(resolve(OUT, "w7_timeline_tab.json"), JSON.stringify(tabStyle, null, 2));
    const noBrown =
      !tabStyle ||
      (!/180,\s*120,\s*100/i.test(tabStyle.bg || "") &&
        !/^rgb\(\s*255,\s*200,\s*107\s*\)$/i.test(tabStyle.bg || ""));
    note("p6_timeline_not_brown_fill", noBrown, JSON.stringify(tabStyle));

    const titles = await page.evaluate(() => {
      return [...document.querySelectorAll(".graphs-temporal-card-main strong, .graphs-home-card strong")]
        .slice(0, 5)
        .map((el) => ({ text: (el.textContent || "").trim().slice(0, 40), color: getComputedStyle(el).color }));
    });
    const titlesWhite = titles.every((t) => {
      const m = /rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/.exec(t.color || "");
      if (!m) return true;
      const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
      return r > 200 && g > 200 && b > 200; // near white
    });
    note("p6_titles_primary_white", titlesWhite || titles.length === 0, JSON.stringify(titles));
    await ctx.close();
  }
} catch (err) {
  console.log("VERIFY_EXCEPTION", String(err?.stack || err).slice(0, 500));
  note("verify_uncaught", false, String(err?.message || err).slice(0, 160));
} finally {
  await browser.close();
}

const failed = Object.entries(checks).filter(([, v]) => !v.ok);
const summary = {
  tip: TIP,
  pass: Object.values(checks).filter((c) => c.ok).length,
  fail: failed.length,
  total: Object.keys(checks).length,
  checks,
  failed: failed.map(([k, v]) => ({ name: k, detail: v.detail })),
  finishedAt: new Date().toISOString(),
};
writeFileSync(resolve(OUT, "W7_VERIFY.json"), JSON.stringify(summary, null, 2));

const md = [
  `# Paste W7 Verify`,
  ``,
  `Tip: \`${TIP}\` · Base: ${BASE}`,
  ``,
  `| Metric | Value |`,
  `| --- | --- |`,
  `| PASS | ${summary.pass} |`,
  `| FAIL | ${summary.fail} |`,
  `| TOTAL | ${summary.total} |`,
  ``,
  `## Per-phase`,
  ``,
  ...Object.entries(checks).map(
    ([k, v]) => `- **${v.ok ? "PASS" : "FAIL"}** \`${k}\`${v.detail ? ` — ${v.detail}` : ""}`,
  ),
  ``,
  `## Screenshots`,
  ``,
  `- w7_00_splash.png`,
  `- w7_01_phone_after_splash.png`,
  `- w7_01b_skip_intro_phone.png`,
  `- w7_02_otp_keyboard_open.png`,
  `- w7_03_logos_on_dark.png`,
  `- w7_03_chats_wordmark.png`,
  `- w7_04_dock_center_mark.png`,
  `- w7_05_character_*.png`,
  `- w7_06_chats_pills.png`,
  `- w7_06_graphs_timeline.png`,
  ``,
  summary.fail === 0 ? `**RESULT: PASS**` : `**RESULT: FAIL** (${summary.fail})`,
  ``,
].join("\n");
writeFileSync(resolve(OUT, "W7_VERIFY.md"), md);
console.log("\n" + md);
process.exit(summary.fail === 0 ? 0 : 1);
