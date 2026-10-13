/**
 * Founder Reality Repair — automated mobile shell + first-run coherence proof.
 * Viewports: 390×844 · 393×852 · 430×932
 * Reports separately from native founder phone authority.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const OUT = resolve(ROOT, "shots/founder_reality_repair");
const EVIDENCE = resolve(ROOT, "docs/evidence/founder_reality_repair");
mkdirSync(OUT, { recursive: true });
mkdirSync(EVIDENCE, { recursive: true });

const BASE = process.env.OPAL_PROOF_BASE || "http://127.0.0.1:5173";
const VIEWPORTS = [
  { w: 390, h: 844, label: "390x844" },
  { w: 393, h: 852, label: "393x852" },
  { w: 430, h: 932, label: "430x932" },
];

function loadMintedWalkA() {
  const p = "/tmp/opal_minted_walk_sessions.json";
  if (!existsSync(p)) return null;
  try {
    const raw = JSON.parse(readFileSync(p, "utf8"));
    const list = Array.isArray(raw?.sessions) ? raw.sessions : [];
    const a = list.find((s) => s.role === "a") || list[0];
    if (!a?.token || !a?.userId) return null;
    return {
      user_id: a.userId,
      display_name: a.name || "Walk A",
      handle: a.handle || "walk_a",
      access_token: a.token,
      session_id: a.sessionId,
    };
  } catch {
    return null;
  }
}

async function injectMember(page, session) {
  await page.addInitScript((s) => {
    try {
      // Match freeze-candidate inject: raw token in sessionStorage browser_session key.
      sessionStorage.setItem("opal.product.browser_session.v1", s.access_token);
      sessionStorage.setItem("opal_native_host", "1");
      localStorage.setItem(
        "opal.product.profile.v17",
        JSON.stringify({
          user_id: s.user_id,
          display_name: s.display_name || "Walk A",
          handle: s.handle || "walk_a",
          session_id: s.session_id || "founder-reality-repair",
          access_token: s.access_token,
        }),
      );
      localStorage.setItem("opal.founder_seed.opt_in.persist.v1", "1");
      sessionStorage.setItem("opal.founder_seed.opt_in.v1", "1");
      localStorage.setItem("opal.firstRun.v14.completed", "1");
      localStorage.setItem("opal.firstRun.v14.phoneVerified", "1");
      document.documentElement.classList.add("opal-native-host");
    } catch {
      /* ignore */
    }
  }, session);
}

async function measureDock(page) {
  return page.evaluate(() => {
    const dock = document.querySelector('[data-testid="member-tabbar"]');
    const app = document.querySelector(".app");
    if (!dock || !app) return { ok: false, reason: "missing dock/app" };
    const dr = dock.getBoundingClientRect();
    const ar = app.getBoundingClientRect();
    const cs = getComputedStyle(dock);
    return {
      ok: true,
      position: cs.position,
      dockTop: Math.round(dr.top),
      dockBottom: Math.round(dr.bottom),
      appHeight: Math.round(ar.height),
      viewportH: window.innerHeight,
      dockFixedToViewport: cs.position === "fixed",
      dockNearBottom: Math.abs(dr.bottom - window.innerHeight) < 48,
    };
  });
}

async function scrollAndRecheckDock(page) {
  const before = await measureDock(page);
  await page.evaluate(() => {
    const scrollers = [
      ...document.querySelectorAll(
        '.scroll, .pane, .gsh-scroll, .you-settings-body, [data-dock-scroll="clear"]',
      ),
    ];
    for (const el of scrollers) {
      try {
        el.scrollTop = Math.min(el.scrollHeight, el.scrollTop + 400);
      } catch {
        /* ignore */
      }
    }
    window.scrollBy(0, 400);
  });
  await page.waitForTimeout(200);
  const after = await measureDock(page);
  return {
    before,
    after,
    dockDidNotMove:
      before.ok &&
      after.ok &&
      Math.abs(before.dockTop - after.dockTop) <= 2 &&
      Math.abs(before.dockBottom - after.dockBottom) <= 2,
  };
}

const results = {
  base: BASE,
  viewports: {},
  splash: {},
  permissions: {},
  meet: {},
  shell: {},
  flags: {},
};

const browser = await chromium.launch({ headless: true });

try {
  // Splash / first-run coherence on primary viewport
  {
    const vp = VIEWPORTS[0];
    const ctx = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      document.documentElement.classList.add("opal-native-host");
      sessionStorage.setItem("opal_native_host", "1");
    });
    await page.goto(
      `${BASE}/?opal_founder_seed=1&opal_native_host=1&opal_reset_first_run=1`,
      { waitUntil: "networkidle", timeout: 60000 },
    );
    await page.waitForTimeout(800);
    const splash = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="fr00-splash"]');
      const imgs = root
        ? [...root.querySelectorAll("img")].map((img) => ({
            src: img.getAttribute("src") || "",
            role: img.getAttribute("data-brand-role") || "",
            testid: img.getAttribute("data-testid") || "",
          }))
        : [];
      return {
        present: Boolean(root),
        logoCount: imgs.length,
        doubleComposition: root?.getAttribute("data-double-composition") || null,
        splashLogoCountAttr: root?.getAttribute("data-splash-logo-count") || null,
        imgs,
        wordmarkPainted: Boolean(root?.querySelector(".fr-splash-wordmark")),
      };
    });
    await page.screenshot({ path: resolve(OUT, "01_splash1.png"), fullPage: false });
    results.splash = splash;
    await ctx.close();
  }

  // Member shell dock proof across viewports
  const session = loadMintedWalkA();

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    if (session) await injectMember(page, session);
    else {
      await page.addInitScript(() => {
        document.documentElement.classList.add("opal-native-host");
        sessionStorage.setItem("opal_native_host", "1");
      });
    }
    await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    try {
      await page.locator('[data-testid="member-shell"]').waitFor({ timeout: 30000 });
      await page.locator('[data-testid="member-tabbar"]').waitFor({ timeout: 15000 });
    } catch (e) {
      results.viewports[vp.label] = {
        error: String(e?.message || e),
        DOCK_FIXED: false,
      };
      await page.screenshot({
        path: resolve(OUT, `shell_${vp.label}_FAIL.png`),
        fullPage: false,
      });
      await ctx.close();
      continue;
    }
    // Prefer YOU for long-scroll surfaces
    const youTab = page.locator('[data-testid="member-tab-you"]');
    if (await youTab.count()) {
      await youTab.click();
      await page.waitForTimeout(600);
    }
    const scrollCheck = await scrollAndRecheckDock(page);
    await page.screenshot({
      path: resolve(OUT, `shell_${vp.label}_you.png`),
      fullPage: false,
    });
    // Short viewport / keyboard-like shrink
    await page.setViewportSize({ width: vp.w, height: Math.max(480, Math.floor(vp.h * 0.55)) });
    await page.waitForTimeout(300);
    const keyboardDock = await measureDock(page);
    await page.screenshot({
      path: resolve(OUT, `shell_${vp.label}_keyboardish.png`),
      fullPage: false,
    });
    results.viewports[vp.label] = {
      scrollCheck,
      keyboardDock,
      DOCK_FIXED: scrollCheck.dockDidNotMove && scrollCheck.after?.dockFixedToViewport,
    };
    await ctx.close();
  }
} finally {
  await browser.close();
}

results.flags = {
  DOCK_FIXED: Object.values(results.viewports).every((v) => v.DOCK_FIXED) ? "YES" : "HOLD",
  SPLASH_RUNTIME_LOGO_COUNT: results.splash.logoCount === 1 ? "1" : String(results.splash.logoCount),
  DOUBLE_COMPOSITION: results.splash.doubleComposition === "0" && !results.splash.wordmarkPainted ? "0" : "HOLD",
  PASS2_UNLOCKED: "NO",
  FREEZE: "HOLD",
};

writeFileSync(resolve(EVIDENCE, "FOUNDER_REALITY_REPAIR_PROOF.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results.flags, null, 2));
console.log("wrote", resolve(EVIDENCE, "FOUNDER_REALITY_REPAIR_PROOF.json"));
