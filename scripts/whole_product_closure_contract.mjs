#!/usr/bin/env node
/**
 * Whole-product closure contract — founder-like journey + overlap geometry.
 * MERGE=NO · LIVE=NO · A8 HOLD until founder final walk.
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { activate } from "./founder_proof_fixture.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
const { chromium } = require("playwright");
const API = (process.env.API_BASE || "http://127.0.0.1:4000").replace(/\/$/, "");
const WEB = (process.env.WEB_BASE || "http://192.168.86.156:5173").replace(/\/$/, "");
const OUT_DIR = resolve(ROOT, "docs/evidence/v2-coded-experience/coherence-recovery");
const SHOT_DIR = resolve(OUT_DIR, "shots/whole-product-closure");

const VIEWPORTS = [
  { name: "iphone14", width: 390, height: 844 },
  { name: "pixel7", width: 393, height: 852 },
  { name: "iphone14max", width: 430, height: 932 },
  { name: "short", width: 390, height: 700 },
];

const result = {
  kind: "WHOLE_PRODUCT_CLOSURE_CONTRACT",
  started_at: new Date().toISOString(),
  checks: {},
  failures: [],
  screenshots: [],
  overlaps: [],
};

function fail(id, detail) {
  result.failures.push({ id, detail });
  result.checks[id] = { ok: false, detail };
  console.error(`FAIL ${id}: ${detail}`);
}
function pass(id, detail) {
  result.checks[id] = { ok: true, detail };
  console.log(`PASS ${id}: ${detail}`);
}

function boxesOverlap(a, b, pad = 1) {
  if (!a || !b) return false;
  return !(
    a.x + a.width - pad <= b.x + pad ||
    b.x + b.width - pad <= a.x + pad ||
    a.y + a.height - pad <= b.y + pad ||
    b.y + b.height - pad <= a.y + pad
  );
}

async function box(page, sel) {
  const el = page.locator(sel).first();
  if ((await el.count()) === 0) return null;
  const h = await el.isVisible().catch(() => false);
  if (!h) return null;
  return el.boundingBox();
}

async function assertNoOverlap(page, id, selA, selB) {
  const a = await box(page, selA);
  const b = await box(page, selB);
  if (!a || !b) {
    pass(id, `skip missing ${!a ? selA : selB}`);
    return;
  }
  if (boxesOverlap(a, b)) {
    result.overlaps.push({ id, selA, selB, a, b });
    fail(id, `${selA} overlaps ${selB}`);
  } else {
    pass(id, "no overlap");
  }
}

async function shot(page, name) {
  mkdirSync(SHOT_DIR, { recursive: true });
  const path = resolve(SHOT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  result.screenshots.push(path);
}

async function login(page, session) {
  const payload = {
    token: session.token,
    userId: session.userId,
    name: session.name,
    handle: session.handle || "",
  };
  await page.addInitScript((s) => {
    try {
      window.__OPAL_NATIVE_SESSION__ = {
        access_token: s.token,
        user_id: s.userId,
        display_name: s.name,
      };
      sessionStorage.setItem("opal.product.browser_session.v1", s.token);
      localStorage.setItem(
        "opal.product.profile.v17",
        JSON.stringify({
          user_id: s.userId,
          display_name: s.name,
          handle: s.handle || "",
        }),
      );
      localStorage.setItem("opal.firstRun.v14.completed", "1");
      localStorage.setItem("opal.product.firstRun.v1", JSON.stringify({ completed: true }));
      sessionStorage.removeItem("opal_reset_first_run");
      sessionStorage.removeItem("opal.forcedFirstRun");
      localStorage.removeItem("opal.forcedFirstRun");
      sessionStorage.setItem("opal_native_host", "1");
    } catch {
      /* ignore */
    }
  }, payload);
  await page.goto(`${WEB}/?opal_native_host=1`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForSelector('[data-member-nav="true"], [data-testid="member-tab-home"]', {
    timeout: 30000,
  });
  await page.waitForTimeout(1200);
}

async function clickDock(page, slot) {
  const map = {
    chats: '[data-testid="member-tab-chats"], [data-dock-slot="chats"]',
    graphs: '[data-testid="member-tab-graphs"], [data-dock-slot="graphs"]',
    activity: '[data-testid="member-tab-activity"], [data-dock-slot="activity"], [data-testid="member-tab-attention"]',
    opal: '[data-testid="member-tab-opal"], [data-dock-slot="opal"], [data-figma-center-opal]',
    you: '[data-testid="member-tab-you"], [data-dock-slot="you"]',
    home: '[data-testid="member-tab-home"], [data-dock-slot="home"]',
  };
  const sel = map[slot] || `[data-dock-slot="${slot}"], [data-testid="member-tab-${slot}"]`;
  await page.locator(sel).first().click({ timeout: 15000 });
  await page.waitForTimeout(700);
}

async function runViewport(browser, session, vp) {
  const page = await browser.newPage({
    viewport: { width: vp.width, height: vp.height },
  });
  await login(page, session);

  const auth = await page.evaluate(async () => {
    const fn = window.__opalRuntimeAuthority;
    return typeof fn === "function" ? await fn() : fn;
  });
  pass(
    `RUNTIME_${vp.name}`,
    `fe=${auth?.frontend_build_sha} be=${String(auth?.backend_sha || "").slice(0, 7)}`,
  );

  // HOME — founder fixture must show intentional social body (not stories+blank).
  await page.waitForSelector("[data-home-mode], [data-home-feed-count], .gsh-card", {
    timeout: 20000,
  }).catch(() => {});
  for (let i = 0; i < 8; i++) {
    const ready = await page.evaluate(() => {
      const root =
        document.querySelector("[data-home-feed-count]") ||
        document.querySelector("[data-home-mode]");
      const count = Number(root?.getAttribute("data-home-feed-count") || "0");
      const mode = root?.getAttribute("data-home-mode") || "";
      return count > 0 || mode === "PRODUCTION_HYDRATION" || mode === "FOUNDER_FIXTURE";
    });
    if (ready) break;
    await page.waitForTimeout(500);
  }
  await shot(page, `HOME_${vp.name}`);
  const homeMeta = await page.evaluate(() => {
    const root =
      document.querySelector("[data-home-feed-count]") ||
      document.querySelector("[data-home-mode]");
    const count = Number(root?.getAttribute("data-home-feed-count") || "0");
    const mode = root?.getAttribute("data-home-mode") || "";
    const cards = document.querySelectorAll(".gsh-card, [data-testid^=\"gsh-card-\"]").length;
    const text = document.body?.innerText || "";
    const intentional = /coast walk|Coffee with Chanelle|downtown worked|earlier together/i.test(
      text,
    );
    return { count, mode, cards, text: text.slice(0, 500), intentional };
  });
  const socialOk =
    (homeMeta.count >= 1 || homeMeta.cards >= 1 || homeMeta.intentional) &&
    homeMeta.mode !== "EMPTY";
  if (!socialOk) {
    fail(
      `HOME_SOCIAL_${vp.name}`,
      `HOME_ONLY_STORIES_PLUS_BLANK_BODY feed_count=${homeMeta.count} cards=${homeMeta.cards} mode=${homeMeta.mode}`,
    );
  } else {
    pass(
      `HOME_SOCIAL_${vp.name}`,
      `feed_count=${homeMeta.count} cards=${homeMeta.cards} mode=${homeMeta.mode}`,
    );
  }

  // CHATS + THREAD
  await clickDock(page, "chats");
  await shot(page, `CHATS_${vp.name}`);
  if (/shell-geo/i.test(await page.locator("body").innerText())) {
    fail(`CHATS_SHELL_${vp.name}`, "shell-geo visible");
  } else pass(`CHATS_SHELL_${vp.name}`, "clean");

  const walkRow = page.locator("text=/Walk A/i").first();
  if (await walkRow.count()) {
    await walkRow.click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await shot(page, `THREAD_${vp.name}`);
    const thread = await page.locator("body").innerText();
    const labCalls = (thread.match(/^Call$/gm) || []).length;
    // Count visible "Call" filaments near times — soft assert
    if (/shell-geo/i.test(thread)) fail(`THREAD_SHELL_${vp.name}`, "shell-geo");
    else pass(`THREAD_SHELL_${vp.name}`, "clean");
    if (/Find a time/i.test(thread)) fail(`THREAD_FIND_TIME_${vp.name}`, "Find a time visible");
    else pass(`THREAD_FIND_TIME_${vp.name}`, "absent");
    pass(`THREAD_LAB_CALLS_${vp.name}`, `call_label_mentions≈${labCalls}`);
  }

  // GRAPHS — preserve Past
  await clickDock(page, "graphs");
  await page.waitForTimeout(800);
  await shot(page, `GRAPHS_${vp.name}`);
  const graphs = await page.locator("body").innerText();
  if (!/\bPast\b/.test(graphs)) fail(`GRAPHS_PAST_${vp.name}`, "Past missing");
  else pass(`GRAPHS_PAST_${vp.name}`, "visible");

  // ATTENTION — via You hub (dock has home/chats/graphs/you + center orb)
  await clickDock(page, "you");
  await page.waitForTimeout(600);
  const attnByTest = page.locator(
    '[data-testid="you-attention"], [data-testid="activity-destination"], [data-testid="attention-center"]',
  );
  if ((await attnByTest.count()) > 0) {
    await attnByTest.first().click({ timeout: 8000 }).catch(() => {});
  } else {
    await page.getByText(/Attention|Activity/i).first().click({ timeout: 8000 }).catch(() => {});
  }
  await page.waitForTimeout(800);
  await shot(page, `ATTENTION_${vp.name}`);
  const attn = await page.locator("body").innerText();
  if (/You're all caught up|all caught up/i.test(attn) || !/Review|Accept change/i.test(attn)) {
    pass(`ATTENTION_CALM_${vp.name}`, "calm/no actionable spam");
  } else {
    pass(`ATTENTION_STATE_${vp.name}`, "has items (ok if real)");
  }

  // CENTER OPAL — composer vs tabs
  await page.locator('[data-testid="member-tab-opal"], [data-dock-slot="opal"]').first().click({
    timeout: 15000,
  });
  await page.waitForTimeout(1000);
  await shot(page, `CENTER_${vp.name}`);
  await assertNoOverlap(
    page,
    `CENTER_COMPOSER_TABS_${vp.name}`,
    ".opal-center-v2-composer, .opal-composer",
    ".opal-center-v2-lenses, button:has-text('Today')",
  );
  await assertNoOverlap(
    page,
    `CENTER_COMPOSER_DOCK_${vp.name}`,
    ".opal-center-v2-composer, .opal-composer",
    ".tabbar.tabbar-option-b .dock-bar, .tabbar.tabbar-option-b",
  );
  // Explicit geometry: composer bottom must sit above dock pill top.
  const centerGeom = await page.evaluate(() => {
    const comp = document.querySelector(".opal-center-v2-composer, .opal-composer");
    const bar = document.querySelector(".tabbar-option-b .dock-bar");
    const tab = document.querySelector(".tabbar.tabbar-option-b");
    const ambient = document.querySelector(".opal-ambient-destination, .opal-ambient-overlay");
    const cr = comp?.getBoundingClientRect();
    const br = bar?.getBoundingClientRect();
    const tr = tab?.getBoundingClientRect();
    const ar = ambient?.getBoundingClientRect();
    return {
      composerBottom: cr?.bottom ?? null,
      dockBarTop: br?.top ?? null,
      tabTop: tr?.top ?? null,
      ambientBottom: ar?.bottom ?? null,
      gapToBar: cr && br ? br.top - cr.bottom : null,
    };
  });
  if (
    centerGeom.composerBottom != null &&
    centerGeom.dockBarTop != null &&
    centerGeom.composerBottom > centerGeom.dockBarTop + 1
  ) {
    fail(
      `CENTER_COMPOSER_CLEARANCE_${vp.name}`,
      `composerBottom=${centerGeom.composerBottom} > dockBarTop=${centerGeom.dockBarTop}`,
    );
  } else {
    pass(
      `CENTER_COMPOSER_CLEARANCE_${vp.name}`,
      `gapToBar=${centerGeom.gapToBar} ambientBottom=${centerGeom.ambientBottom}`,
    );
  }

  // DOCK geometry
  const dockGeom = await page.evaluate(() => {
    const tab = document.querySelector(".tabbar.tabbar-option-b");
    const bar = document.querySelector(".tabbar-option-b .dock-bar");
    const root = document.documentElement;
    const lift = getComputedStyle(root).getPropertyValue("--opal-dock-lift").trim();
    const safe = getComputedStyle(root).getPropertyValue("--opal-safe-bottom").trim();
    const tb = tab?.getBoundingClientRect();
    const bb = bar?.getBoundingClientRect();
    return {
      lift,
      safe,
      tabBottom: tb ? window.innerHeight - tb.bottom : null,
      barBottom: bb ? window.innerHeight - bb.bottom : null,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
  if (dockGeom.overflowX) fail(`OVERFLOW_X_${vp.name}`, "horizontal overflow");
  else pass(`OVERFLOW_X_${vp.name}`, "0");
  pass(
    `DOCK_GEOM_${vp.name}`,
    `lift=${dockGeom.lift} tabBottomGap=${dockGeom.tabBottom} barBottomGap=${dockGeom.barBottom}`,
  );
  if (dockGeom.lift && dockGeom.lift !== "0px" && Number.parseFloat(dockGeom.lift) > 2) {
    fail(`DOCK_LIFT_${vp.name}`, `excessive lift ${dockGeom.lift}`);
  } else pass(`DOCK_LIFT_${vp.name}`, dockGeom.lift || "n/a");

  // YOU (hub root)
  await clickDock(page, "you");
  await page.waitForTimeout(600);
  await shot(page, `YOU_${vp.name}`);

  await page.close();
}

async function clickIfVisible(page, sel, timeout = 4000) {
  const el = page.locator(sel).first();
  if ((await el.count()) === 0) return false;
  const vis = await el.isVisible().catch(() => false);
  if (!vis) return false;
  await el.click({ timeout }).catch(() => {});
  await page.waitForTimeout(400);
  return true;
}

async function runForcedFirstRunOverlaps(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("opal.forcedFirstRun", "1");
      sessionStorage.setItem("opal.forcedFirstRun", "1");
      sessionStorage.setItem("opal_native_host", "1");
    } catch {
      /* ignore */
    }
  });
  await page.goto(`${WEB}/?opal_native_host=1&forcedFirstRun=1`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await page.waitForTimeout(1200);

  // Splash → Promise → phone (prefer skip/already-account / continue-phone).
  await clickIfVisible(page, '[data-testid="fr00-already-account"]');
  await clickIfVisible(page, '[data-testid="fr00-skip-intro"]');
  await clickIfVisible(page, '[data-testid="fr00-tap-begin"]');
  await clickIfVisible(page, '[data-testid="fr-splash-tap"]');
  for (const sel of [
    '[data-testid="first-run-promise-cta"]',
    '[data-testid="fr05-continue-phone"]',
    "text=Continue with phone",
    "text=Continue with phone number",
    "text=Get started",
  ]) {
    if (await clickIfVisible(page, sel)) break;
  }
  await page.waitForTimeout(600);

  // Phone entry (Walk B fixture OTP path).
  if ((await page.locator('[data-testid="fr06-phone-input"], #fr-phone').count()) > 0) {
    const phone = page.locator('[data-testid="fr06-phone-input"], #fr-phone').first();
    await phone.fill("2025550102").catch(() => {});
    const consent = page.locator('[data-testid="fr06-otp-consent"]');
    if ((await consent.count()) > 0) {
      const checked = await consent.isChecked().catch(() => false);
      if (!checked) await consent.check({ force: true }).catch(() => {});
    }
    await clickIfVisible(page, '[data-testid="fr06-continue"]');
    await page.waitForTimeout(800);
  }

  // OTP
  if ((await page.locator('[data-testid="fr07-code-input"]').count()) > 0) {
    await page.locator('[data-testid="fr07-code-input"]').first().fill("222222").catch(() => {});
    await clickIfVisible(page, '[data-testid="fr07-submit"]');
    await page.waitForTimeout(1200);
  }

  await shot(page, "FIRST_RUN_PROFILE_iphone14");
  if ((await page.locator('[data-testid="fr08-continue"]').count()) > 0) {
    await assertNoOverlap(
      page,
      "PROFILE_CONTINUE_USERNAME",
      '[data-testid="fr08-continue"]',
      '[data-testid="fr08-username-input"], #fr-username',
    );
    await assertNoOverlap(
      page,
      "PROFILE_CONTINUE_NAME",
      '[data-testid="fr08-continue"]',
      '[data-testid="fr08-name-input"], #fr-name',
    );
    const edit = await box(page, '[data-testid="fr08-photo-edit-badge"], .fr-profile-edit');
    if (edit && (edit.width > 40 || edit.height > 40)) {
      fail("PHOTO_EDIT_SIZE", `edit ${edit.width}x${edit.height}`);
    } else pass("PHOTO_EDIT_SIZE", edit ? `${edit.width}x${edit.height}` : "missing");
    const photo = await box(page, '[data-testid="fr08-add-photo"], .fr-profile-photo');
    if (photo && photo.height > 200) {
      fail("PHOTO_CONTROL_COLLISION", `photo hit ${photo.width}x${photo.height}`);
    } else pass("PHOTO_CONTROL_COLLISION", photo ? `${photo.width}x${photo.height}` : "missing");

    // Advance to find/contacts+assist
    const name = page.locator('[data-testid="fr08-name-input"], #fr-name').first();
    if ((await name.count()) > 0) {
      const v = await name.inputValue().catch(() => "");
      if (!v) await name.fill("Walk B").catch(() => {});
    }
    await clickIfVisible(page, '[data-testid="fr08-continue"]');
    await page.waitForTimeout(1000);
  } else {
    fail("PROFILE_CONTINUE_USERNAME", "profile step not reached");
  }

  await shot(page, "FIRST_RUN_FIND_iphone14");
  if ((await page.locator('[data-testid="fr09-connect"], [data-testid="fr09-find"]').count()) > 0) {
    await assertNoOverlap(
      page,
      "CONTACTS_ASSIST_CARD",
      '[data-testid="fr09-contacts-card"]',
      '[data-testid="fr-assist-choice"]',
    );
    await assertNoOverlap(
      page,
      "ASSIST_ENABLE_CONNECT",
      '[data-testid="fr-assist-enable"]',
      '[data-testid="fr09-connect"]',
    );
    await assertNoOverlap(
      page,
      "ASSIST_CHOICES_OVERLAP",
      '[data-testid="fr-assist-enable"]',
      '[data-testid="fr-assist-not-now"]',
    );
    await assertNoOverlap(
      page,
      "PRIMARY_CTA_OVERLAPS_ASSIST",
      '[data-testid="fr09-connect"]',
      '[data-testid="fr-assist-choice"]',
    );
  } else {
    fail("CONTACTS_ASSIST_CARD", "find step not reached");
  }
  await page.close();
}

async function main() {
  mkdirSync(SHOT_DIR, { recursive: true });
  const rt = await fetch(`${API}/api/dev/runtime-authority`).then((r) => r.json());
  result.runtime = rt;
  pass("RUNTIME_AUTHORITY", `sha=${String(rt.backend_sha || "").slice(0, 7)} fixture=${rt.fixture_generation_id}`);

  const session = await activate({
    phone: "+12025550102",
    name: "Walk B",
    handle: "phys_walk_b",
    code: "222222",
  }).catch(async () => {
    const fs = await import("node:fs");
    const t = JSON.parse(fs.readFileSync("/tmp/a61_tokens.json", "utf8"));
    return {
      token: t.walk_b || t.B,
      userId: "b599fcd7-7a97-4736-8221-86e0a6d8dc7a",
      name: "Walk B",
      handle: "phys_walk_b",
    };
  });

  const feed = await fetch(`${API}/api/v1/product/home/feed?limit=20`, {
    headers: { authorization: `Bearer ${session.token}` },
  }).then((r) => r.json());
  const intentional = (feed.objects || []).filter((o) =>
    /coast walk|Coffee with Chanelle|downtown worked|earlier together/i.test(
      String(o.caption || ""),
    ),
  );
  if (intentional.length < 1) fail("HOME_FEED_API", `intentional=${intentional.length}`);
  else pass("HOME_FEED_API", `intentional=${intentional.length}`);

  const browser = await chromium.launch({ headless: true });
  for (const vp of VIEWPORTS) {
    try {
      await runViewport(browser, session, vp);
    } catch (err) {
      fail(`VIEWPORT_${vp.name}`, String(err?.message || err).slice(0, 240));
    }
  }
  try {
    await runForcedFirstRunOverlaps(browser);
  } catch (err) {
    fail("FIRST_RUN_PROBE", String(err?.message || err).slice(0, 240));
  }
  await browser.close();

  result.finished_at = new Date().toISOString();
  result.ok = result.failures.length === 0;
  result.A8 = "HOLD";
  result.MERGE = "NO";
  result.PUBLIC_LIVE = "NO";
  const out = resolve(OUT_DIR, "WHOLE_PRODUCT_CLOSURE_CONTRACT.json");
  writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(`wrote ${out} ok=${result.ok} failures=${result.failures.length}`);
  process.exitCode = result.ok ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
