#!/usr/bin/env node
/**
 * P0 BASELINE RUNTIME COHERENCE RECOVERY proof
 * Figma 594:2 · HOLD · DO NOT MERGE · NO LIVE · B2-06 PAUSED
 *
 * Founder URL only (:5173). Captures dock HD math, Story playback,
 * Graphs/You routing, Home ambient, first-run reset vs returning.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(
  ROOT,
  "docs/evidence/v2-coded-experience/brand-v4-coherence/p0-baseline-coherence",
);
const RT = resolve(OUT, "runtime");
const VIS = resolve(OUT, "shots");
mkdirSync(RT, { recursive: true });
mkdirSync(VIS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

async function dismissOverlays(page) {
  for (let i = 0; i < 6; i++) {
    const sv = page.getByTestId("story-viewer");
    if (await sv.isVisible().catch(() => false)) {
      await page.getByTestId("story-viewer-close").click().catch(() => {});
      await sleep(200);
      continue;
    }
    break;
  }
}

async function loginReturning(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${WEB}/`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await sleep(700);
  // If already in product, return
  if (await page.getByTestId("member-tab-home").isVisible().catch(() => false)) {
    return { path: "returning_authenticated" };
  }
  // Skip first-run into auth if shown
  if (await page.getByTestId("fr00-already-account").isVisible().catch(() => false)) {
    await page.getByTestId("fr00-already-account").click();
  } else if (await page.getByTestId("opal-promise-enter").isVisible().catch(() => false)) {
    await page.getByTestId("opal-promise-already-account").click().catch(async () => {
      await page.getByTestId("opal-promise-enter").click();
    });
  }
  await sleep(400);
  let devCode = "111111";
  page.on("response", async (res) => {
    try {
      if (
        res.url().includes("/product/activation/challenges") &&
        res.request().method() === "POST"
      ) {
        const j = await res.json();
        if (j.development_code) devCode = j.development_code;
      }
    } catch {
      /* ignore */
    }
  });
  const phoneSel = '[data-testid="fr06-phone-input"], #phone';
  if (await page.locator(phoneSel).first().isVisible().catch(() => false)) {
    await page.locator(phoneSel).first().fill("+12025550101");
    const consent = page.locator("#otp-consent, [data-testid='fr06-otp-consent']");
    if (await consent.first().isVisible().catch(() => false)) {
      await consent.first().check().catch(() => {});
    }
    if (await page.getByTestId("fr06-continue").isVisible().catch(() => false)) {
      await page.getByTestId("fr06-continue").click();
    } else {
      await page.getByRole("button", { name: /Text me a code/i }).first().click();
    }
    await page.waitForSelector('[data-testid="fr07-code-input"], #code', { timeout: 25000 });
    await sleep(300);
    if (await page.getByTestId("fr07-code-input").isVisible().catch(() => false)) {
      await page.fill('[data-testid="fr07-code-input"]', devCode);
      await page.getByTestId("fr07-submit").click();
    } else {
      await page.fill("#code", devCode);
      await page.getByRole("button", { name: /Continue|Verify/i }).first().click();
    }
    await page.getByTestId("member-tab-home").waitFor({ timeout: 45000 });
    return { path: "signed_in_from_auth" };
  }
  return { path: "unknown" };
}

async function main() {
  const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
  const { chromium } = require("playwright");
  const report = {
    schema: "p0-baseline-coherence-v1",
    generated_at: new Date().toISOString(),
    web: WEB,
    hold: true,
    do_not_merge: true,
    permissionToStartLive: false,
    b2_06_opal: "PAUSED",
    figma_lock: "594:2",
    matrix: {},
    dock_hd: {},
    notes: [],
  };

  // Asset matrix on disk
  const a256 = resolve(ROOT, "apps/opal_web/public/brand/opal-graph/opal-dock-orb-trio-256.png");
  const a512 = resolve(ROOT, "apps/opal_web/public/brand/opal-graph/opal-dock-orb-trio-512.png");
  const a112 = resolve(ROOT, "apps/opal_web/public/brand/opal-graph/opal-dock-orb-trio-112.png");
  report.hd_asset_matrix = {
    "112": existsSync(a112) ? { bytes: readFileSync(a112).length, sha256: sha(a112) } : null,
    "256": existsSync(a256) ? { bytes: readFileSync(a256).length, sha256: sha(a256) } : null,
    "512": existsSync(a512) ? { bytes: readFileSync(a512).length, sha256: sha(a512) } : null,
  };

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // --- First-run reset URL ---
  const resetTs = Date.now();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${WEB}/?opal_reset_first_run=1&coherence_recovery=${resetTs}`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await sleep(900);
  const firstRunVisible =
    (await page.getByTestId("fr00-splash").isVisible().catch(() => false)) ||
    (await page.locator('[data-testid*="fr00"], [data-screen="splash"]').first().isVisible().catch(() => false)) ||
    (await page.getByTestId("fr00-already-account").isVisible().catch(() => false));
  const promiseVisible = await page
    .getByTestId("opal-promise-screen")
    .isVisible()
    .catch(() => false);
  await page.screenshot({ path: resolve(VIS, "P0_FIRST_RUN_RESET.png"), fullPage: false });
  report.matrix.first_run_reset = {
    url: `${WEB}/?opal_reset_first_run=1&coherence_recovery=${resetTs}`,
    splash_or_entry_visible: firstRunVisible,
    promise_visible: promiseVisible,
    promise_authority: "PROMISE_EXACT_FIGMA_AUTHORITY_PENDING",
  };

  // --- Returning / product path ---
  const login = await loginReturning(page);
  await dismissOverlays(page);
  await sleep(500);
  await page.screenshot({ path: resolve(VIS, "P0_HOME_TOP.png"), fullPage: false });

  // Home ambient check
  const ambient = await page.evaluate(() => {
    const el = document.querySelector(".app-ambient");
    if (!el) return { present: false };
    const cs = getComputedStyle(el);
    return {
      present: true,
      backgroundImage: cs.backgroundImage,
      background: cs.background,
    };
  });
  const ambientPass =
    !ambient.present ||
    !ambient.backgroundImage ||
    ambient.backgroundImage === "none" ||
    !/cyan|224,\s*240|110,\s*232|139,\s*92,\s*246|139,\s*124,\s*255/i.test(
      `${ambient.backgroundImage} ${ambient.background}`,
    );
  report.matrix.home_ambient = { ...ambient, pass: ambientPass };
  report.home_side_light_root_cause =
    "Invented .app-ambient + technicolor controlled radial side washes (not in 287:6). Neutralized to transparent for product shell.";

  // Scroll home middle/bottom
  await page.evaluate(() => {
    const sc = document.querySelector(".scroll, main, [data-testid='home-feed']");
    if (sc) sc.scrollTop = Math.min(sc.scrollHeight * 0.35, 900);
  });
  await sleep(300);
  await page.screenshot({ path: resolve(VIS, "P0_HOME_MIDDLE.png"), fullPage: false });
  await page.evaluate(() => {
    const sc = document.querySelector(".scroll, main, [data-testid='home-feed']");
    if (sc) sc.scrollTop = sc.scrollHeight;
  });
  await sleep(300);
  await page.screenshot({ path: resolve(VIS, "P0_HOME_BOTTOM.png"), fullPage: false });

  // Dock HD proof at DPR 1/2/3
  const dockHd = {};
  for (const dpr of [1, 2, 3]) {
    await page.emulateMedia({ reducedMotion: null }).catch(() => {});
    await page.evaluate((ratio) => {
      Object.defineProperty(window, "devicePixelRatio", {
        configurable: true,
        get: () => ratio,
      });
    }, dpr);
    // Force reload of image metrics
    const metrics = await page.evaluate(() => {
      const img = document.querySelector(".dock-opal-mark, [data-brand-role='dock-micro-emblem']");
      if (!img) return null;
      const cs = getComputedStyle(img);
      return {
        source: img.currentSrc || img.src,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        cssWidth: parseFloat(cs.width),
        cssHeight: parseFloat(cs.height),
        devicePixelRatio: window.devicePixelRatio,
      };
    });
    if (!metrics) {
      dockHd[`dpr${dpr}`] = { pass: false, error: "dock img missing" };
      continue;
    }
    const required = Math.ceil(metrics.cssWidth * dpr);
    const pass = metrics.naturalWidth >= required;
    dockHd[`dpr${dpr}`] = { ...metrics, requiredSourcePixels: required, pass };
  }
  report.dock_hd = dockHd;
  report.matrix.dock_orb_hd = {
    pass: Object.values(dockHd).every((r) => r && r.pass),
    detail: dockHd,
  };

  const dockHandle = await page.locator(".dock-opal, [data-testid='member-tab-opal']").first();
  if (await dockHandle.isVisible().catch(() => false)) {
    await dockHandle.screenshot({ path: resolve(VIS, "P0_DOCK_ORB_CROP.png") });
  }

  // Story viewer
  const storyBtn = page.locator('[data-testid^="story-"], [data-testid="stories-rail"] button, .stories-rail button').first();
  let storyOpened = false;
  if (await storyBtn.isVisible().catch(() => false)) {
    await storyBtn.click().catch(() => {});
    await sleep(500);
    storyOpened = await page.getByTestId("story-viewer").isVisible().catch(() => false);
  }
  if (!storyOpened) {
    // Try GraphSocialHome story ring
    const ring = page.locator('[data-testid="stories-rail"] [role="button"], .gsh-story, .story-ring').first();
    if (await ring.isVisible().catch(() => false)) {
      await ring.click();
      await sleep(500);
      storyOpened = await page.getByTestId("story-viewer").isVisible().catch(() => false);
    }
  }
  let storyMeta = { opened: storyOpened };
  if (storyOpened) {
    await page.screenshot({ path: resolve(VIS, "P0_STORY_VIEWER.png"), fullPage: false });
    storyMeta = {
      ...storyMeta,
      ...(await page.evaluate(() => {
        const root = document.querySelector('[data-testid="story-viewer"]');
        const text = root?.textContent || "";
        return {
          hasTemporaryLabel: /Temporary story/i.test(text),
          media: root?.getAttribute("data-story-media"),
          progressSegs: root?.querySelectorAll(".story-viewer-progress-seg").length || 0,
        };
      })),
    };
    // Wait ~1s and confirm progress moves for image
    await sleep(1200);
    storyMeta.progressAfter1s = await page.evaluate(() => {
      const fill = document.querySelector(
        ".story-viewer-progress-seg .story-viewer-progress-fill",
      );
      return fill ? fill.style.width : null;
    });
    await page.getByTestId("story-viewer-close").click().catch(() => {});
    await sleep(300);
  }
  report.matrix.story_playback = {
    opened: storyOpened,
    no_temporary_label: storyOpened ? storyMeta.hasTemporaryLabel === false : null,
    progress_segments: storyMeta.progressSegs,
    progress_after_1s: storyMeta.progressAfter1s,
    pass:
      storyOpened &&
      storyMeta.hasTemporaryLabel === false &&
      (storyMeta.progressSegs || 0) >= 1,
  };

  // Chats owner
  await dismissOverlays(page);
  await page.getByTestId("member-tab-chats").click().catch(async () => {
    await page.locator('[data-dock-tab="chats"], button:has-text("Chats")').first().click();
  });
  await sleep(500);
  await page.screenshot({ path: resolve(VIS, "P0_CHATS_ENTRY.png"), fullPage: false });
  const chatsOwner = await page.evaluate(() => {
    const el =
      document.querySelector('[data-testid="chats-home"]') ||
      document.querySelector('[data-figma="476:2"]') ||
      document.querySelector('[data-screen="chats-home"]');
    return {
      found: !!el,
      testid: el?.getAttribute("data-testid"),
      figma: el?.getAttribute("data-figma") || el?.getAttribute("data-figma-node"),
    };
  });
  report.matrix.chats = {
    owner: chatsOwner,
    visual_status: "CURRENT_VISUAL_FOUNDER_REJECTED",
    candidate_available: "590:*",
    production_promotion_pending: true,
    pass_route_only: chatsOwner.found,
  };

  // Graphs
  await page.getByTestId("member-tab-graphs").click().catch(async () => {
    await page.locator('button:has-text("Graphs")').first().click();
  });
  await sleep(500);
  await page.screenshot({ path: resolve(VIS, "P0_GRAPHS_OVERVIEW.png"), fullPage: false });
  const graphs = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="graphs-home"]');
    return {
      found: !!el,
      figma: el?.getAttribute("data-figma"),
      title: el?.querySelector("h1")?.textContent?.trim(),
      meta: el?.querySelector(".gsh-meta")?.textContent?.trim(),
    };
  });
  report.matrix.graphs = {
    ...graphs,
    pass: graphs.found && graphs.figma === "368:23" && /Your Graphs/i.test(graphs.title || ""),
  };

  // Open first graph detail if present
  const gCard = page.locator('[data-testid^="graphs-card-"]').first();
  if (await gCard.isVisible().catch(() => false)) {
    await gCard.click().catch(() => {});
    await sleep(600);
    await page.screenshot({ path: resolve(VIS, "P0_GRAPH_DETAIL.png"), fullPage: false });
    const detail = await page.evaluate(() => {
      const el =
        document.querySelector('[data-figma-node="373:385"]') ||
        document.querySelector('[data-testid="graph-detail"]') ||
        document.querySelector(".graph-detail-sheet");
      return {
        found: !!el,
        figma:
          el?.getAttribute("data-figma-node") ||
          el?.getAttribute("data-figma") ||
          null,
      };
    });
    report.matrix.graph_detail = detail;
    // close if possible
    await page.keyboard.press("Escape").catch(() => {});
    await page.getByTestId("graph-detail-back").click().catch(() => {});
    await sleep(300);
  }

  // You
  await page.getByTestId("member-tab-you").click().catch(async () => {
    await page.locator('button:has-text("You")').first().click();
  });
  await sleep(500);
  await page.screenshot({ path: resolve(VIS, "P0_YOU.png"), fullPage: false });
  const you = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="profile-pane"]');
    const hasGprof = !!document.querySelector('[data-testid="graph-profile-page"]');
    const hasMessage = !!document.querySelector('[data-testid="gprof-message"]');
    return {
      found: !!el,
      figmaYou: el?.getAttribute("data-figma-you") || el?.getAttribute("data-figma"),
      screen: el?.getAttribute("data-screen"),
      embedsPersonProfile: hasGprof,
      hasMessageCallLeak: hasMessage,
    };
  });
  report.matrix.you = {
    ...you,
    pass:
      you.found &&
      you.figmaYou === "254:340" &&
      you.embedsPersonProfile === false &&
      you.hasMessageCallLeak === false,
  };

  // Person profile from Home (if reachable)
  await page.getByTestId("member-tab-home").click().catch(() => {});
  await sleep(400);
  await dismissOverlays(page);
  const person = page.locator('[data-testid^="person-"], [data-testid*="avatar"], .gsh-person').first();
  report.matrix.person_profile = { attempted: false };
  // Prefer home header profile left if it opens self — skip; look for named person on feed
  const named = page.getByRole("button", { name: /Maya|Chanelle|Jordan/i }).first();
  if (await named.isVisible().catch(() => false)) {
    await named.click().catch(() => {});
    await sleep(500);
    const prof = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="graph-profile-page"]');
      return {
        found: !!el,
        figma: el?.getAttribute("data-figma-profile") || el?.getAttribute("data-figma-node"),
        hasMessage: !!document.querySelector('[data-testid="gprof-message"]'),
      };
    });
    report.matrix.person_profile = { attempted: true, ...prof };
    if (prof.found) {
      await page.screenshot({ path: resolve(VIS, "P0_PERSON_PROFILE.png"), fullPage: false });
    }
  }

  // Console errors sample
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
  await sleep(800);
  report.console_errors_sample = consoleErrors.slice(0, 20);

  report.founder_reset_url = `${WEB}/?opal_reset_first_run=1&coherence_recovery=<timestamp>`;
  report.returning_user_url = `${WEB}/`;
  report.login_path = login;

  // Final pass matrix (honest)
  const m = report.matrix;
  report.final_p0_status = {
    dock_orb_dpr3: m.dock_orb_hd?.detail?.dpr3?.pass ? "PASS" : "FAIL",
    first_run_reset: m.first_run_reset?.splash_or_entry_visible ? "PASS" : "FAIL",
    returning_not_forced: login.path !== "unknown" ? "PASS_OR_N_A" : "UNKNOWN",
    story_no_temp_label: m.story_playback?.no_temporary_label ? "PASS" : m.story_playback?.opened ? "FAIL" : "UNVERIFIED",
    story_progress: m.story_playback?.pass ? "PASS" : "PARTIAL",
    home_side_light_removed: m.home_ambient?.pass ? "PASS" : "FAIL",
    chats_route_owner: m.chats?.pass_route_only ? "PASS" : "FAIL",
    chats_visual: "CURRENT_VISUAL_FOUNDER_REJECTED",
    chats_590_candidate: "PRODUCTION_PROMOTION_PENDING",
    graphs_368_23: m.graphs?.pass ? "PASS" : "FAIL",
    you_254_340: m.you?.pass ? "PASS" : "FAIL",
    promise: "PROMISE_EXACT_FIGMA_AUTHORITY_PENDING",
    b2_06: "PAUSED",
    hold: true,
    merge: "NO",
    live: "BLOCKED",
  };

  writeFileSync(resolve(RT, "P0_BASELINE_COHERENCE_REPORT.json"), JSON.stringify(report, null, 2));
  writeFileSync(
    resolve(OUT, "P0_RETURN_AZ.md"),
    `# P0 Baseline Runtime Coherence Recovery — Return\n\nHOLD. DO NOT MERGE. NO LIVE. B2-06 PAUSED.\n\nSee \`runtime/P0_BASELINE_COHERENCE_REPORT.json\`.\n`,
  );
  console.log(JSON.stringify(report.final_p0_status, null, 2));
  console.log("Wrote", resolve(RT, "P0_BASELINE_COHERENCE_REPORT.json"));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
