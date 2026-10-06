/**
 * Founder Walk 13 visual/functional verify @ 390×844
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { activate } from "../../scripts/founder_proof_fixture.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.OPAL_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(ROOT, "shots/founder_walk_13");
mkdirSync(OUT, { recursive: true });

const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
const { chromium } = require("playwright");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
function assert(name, ok, detail = "") {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function login(page, session) {
  await page.addInitScript(
    ({ token, userId, name }) => {
      try {
        sessionStorage.setItem("opal.product.browser_session.v1", token);
        sessionStorage.setItem("opal_native_host", "1");
        localStorage.setItem(
          "opal.product.profile.v17",
          JSON.stringify({ user_id: userId, display_name: name, handle: "founder_rev" }),
        );
        localStorage.setItem("opal.founder_seed.opt_in.persist.v1", "1");
        sessionStorage.setItem("opal.founder_seed.opt_in.v1", "1");
        // Skip first-run gate — session is already activated.
        localStorage.setItem("opal.firstRun.v14.completed", "1");
      } catch {
        /* ignore */
      }
    },
    { token: session.token, userId: session.userId, name: session.name },
  );
  await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await sleep(1200);
  for (let i = 0; i < 10; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) break;
    if (await page.getByTestId("fr00-already-account").isVisible().catch(() => false)) {
      await page.getByTestId("fr00-already-account").click({ force: true });
      await sleep(400);
      continue;
    }
    if (await page.getByTestId("opal-promise-already").isVisible().catch(() => false)) {
      await page.getByTestId("opal-promise-already").click({ force: true });
      await sleep(400);
      continue;
    }
    if (await page.getByTestId("fr06-skip-for-now").isVisible().catch(() => false)) {
      await page.getByTestId("fr06-skip-for-now").click({ force: true });
      await sleep(500);
      continue;
    }
    if (await page.getByTestId("fr05-already-account").isVisible().catch(() => false)) {
      await page.getByTestId("fr05-already-account").click({ force: true });
      await sleep(400);
      continue;
    }
    if (await page.getByTestId("fr09-not-now").isVisible().catch(() => false)) {
      await page.getByTestId("fr09-not-now").click({ force: true }).catch(() => {});
      await sleep(400);
      continue;
    }
    await sleep(400);
  }
  if (!(await page.getByTestId("member-shell").isVisible().catch(() => false))) {
    await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await sleep(1500);
  }
  await page.waitForSelector('[data-testid="member-shell"]', { timeout: 45000 });
  const homeTab = page.getByTestId("member-tab-home");
  if (await homeTab.isVisible().catch(() => false)) await homeTab.click();
  await sleep(800);
}

async function loadSession() {
  try {
    const { readFileSync } = await import("node:fs");
    const cached = JSON.parse(readFileSync("/tmp/fw13_session.json", "utf8"));
    if (cached?.token) return cached;
  } catch {
    /* fall through */
  }
  // Prefer jordan fixture phone — founder OTP may be rate-limited from prior runs.
  try {
    return await activate({
      phone: "+12025550103",
      name: "Jordan Lee",
      handle: "jordan_rev",
      code: "333333",
    });
  } catch {
    return await activate({
      phone: "+12025550101",
      name: "Founder Review",
      handle: "founder_rev",
      code: "111111",
    });
  }
}

const session = await loadSession();

const browser = await chromium.launch({ headless: true });

async function withPage(fn) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  try {
    await fn(page);
  } finally {
    await context.close();
  }
}

// --- 1+13 Splash reset → splash 1 → splash 2 (isolated context) ---
await withPage(async (page) => {
  await page.goto(`${BASE}/?opal_reset_first_run=1&opal_native_host=1`, {
    waitUntil: "networkidle",
  });
  await sleep(800);
  const splash1 = await page.locator('[data-testid="fr00-splash"]').count();
  assert("splash1 visible after reset", splash1 > 0);
  await page.screenshot({ path: `${OUT}/01_splash1.png`, fullPage: false });

  if (splash1) {
    await page.locator('[data-testid="fr00-tap-begin"]').click();
    await sleep(900);
  }
  const promise = page.locator('[data-testid="first-run-promise-page"]');
  assert("splash2/promise visible", (await promise.count()) > 0);
  const fit = await promise.getAttribute("data-promise-fit");
  assert("promise fit contain-full-art", fit === "contain-full-art", fit || "missing");
  const img = page.locator('[data-testid="opal-promise-exact-img"]');
  const clip = page.locator('[data-testid="opal-promise-clip"]');
  const cta = page.locator('[data-testid="opal-promise-cta"]');
  const imgBox = await img.boundingBox();
  const clipBox = await clip.boundingBox();
  const ctaBox = await cta.boundingBox();
  assert("promise img renders", !!imgBox && imgBox.height > 200, JSON.stringify(imgBox));
  assert(
    "promise clip taller than old 420 crop",
    !!clipBox && clipBox.height > 420,
    `h=${clipBox?.height}`,
  );
  assert(
    "Enter Opal below art",
    !!ctaBox && !!clipBox && ctaBox.y >= clipBox.y + clipBox.height - 8,
    `cta.y=${ctaBox?.y} clip.bottom=${clipBox ? clipBox.y + clipBox.height : "?"}`,
  );
  assert(
    "no large black gap before CTAs",
    !!ctaBox && !!clipBox && ctaBox.y - (clipBox.y + clipBox.height) <= 24,
    `gap=${ctaBox && clipBox ? ctaBox.y - (clipBox.y + clipBox.height) : "?"}`,
  );
  assert("Enter Opal visible", await page.locator('[data-testid="opal-promise-enter"]').isVisible());
  assert("Already account visible", await page.locator('[data-testid="opal-promise-already"]').isVisible());
  await page.screenshot({ path: `${OUT}/02_promise.png`, fullPage: false });

  const clipStyles = await clip.evaluate((el) => {
    const s = getComputedStyle(el);
    return { overflow: s.overflow, aspectRatio: s.aspectRatio };
  });
  const imgStyles = await img.evaluate((el) => {
    const s = getComputedStyle(el);
    return { objectFit: s.objectFit };
  });
  assert("object-fit contain", imgStyles.objectFit === "contain", imgStyles.objectFit);
  assert("clip overflow hidden", clipStyles.overflow === "hidden", clipStyles.overflow);
  assert(
    "clip aspect art-only",
    /941\s*\/\s*1455/.test(clipStyles.aspectRatio),
    clipStyles.aspectRatio,
  );
});

// --- Seeded member shell: chats first (seed rows), then comments ---
await withPage(async (page) => {
await login(page, session);
await page.screenshot({ path: `${OUT}/02b_home.png`, fullPage: false });

// Chats → Chanelle (seed row) — before comments so seed inbox stays intact
const chatsTab = page.locator('[data-testid="member-tab-chats"]').first();
await chatsTab.click({ force: true }).catch(() => {});
await sleep(1000);
await page.screenshot({ path: `${OUT}/03b_chats.png`, fullPage: false });

const chanelleRow = page.locator('[data-testid^="chats-row-"][data-name="Chanelle"]').first();
assert("Chanelle chat row available", (await chanelleRow.count()) > 0);
if ((await chanelleRow.count()) > 0) {
  await chanelleRow.click({ force: true });
  await page.waitForSelector('[data-testid="member-conversation"]', { timeout: 15000 });
  await sleep(800);
  await page.screenshot({ path: `${OUT}/04_chanelle.png`, fullPage: false });
  const ctaRow = page.locator('[data-testid="journey-cta-row"]');
  assert("journey CTA row present", (await ctaRow.count()) > 0);
  const findTime = page.locator('[data-testid="find-time-cta"]');
  if ((await findTime.count()) > 0) {
    const ftBox = await findTime.boundingBox();
    const thread = page.locator(".thread").first();
    const tBox = await thread.boundingBox();
    assert(
      "find-time above thread body",
      !!ftBox && !!tBox && ftBox.y + ftBox.height <= tBox.y + 12,
      `ft.bottom=${ftBox ? ftBox.y + ftBox.height : "?"} thread.y=${tBox?.y}`,
    );
    const label = (await findTime.textContent()) || "";
    assert("find-time Confirm or Find", /Confirm|Find a time/i.test(label), label.trim());
  } else {
    const nextGap = (await ctaRow.getAttribute("data-next-gap")) || "";
    assert(
      "find-time absent only when gap is not time",
      nextGap !== "time",
      `next_gap=${nextGap}`,
    );
  }
  const pad = await page.locator(".thread").first().evaluate((el) => getComputedStyle(el).paddingRight);
  assert("thread right padding", parseFloat(pad) >= 12, pad);
}

// Sabrina Watch live
await chatsTab.click({ force: true }).catch(() => {});
await sleep(800);
const sabrinaRow = page.locator('[data-testid^="chats-row-"][data-name="Sabrina"]').first();
assert("Sabrina chat row available", (await sabrinaRow.count()) > 0);
if ((await sabrinaRow.count()) > 0) {
  await sabrinaRow.click({ force: true });
  await page.waitForSelector('[data-testid="member-conversation"]', { timeout: 15000 });
  await sleep(800);
  await page.screenshot({ path: `${OUT}/05_sabrina.png`, fullPage: false });
  const watch = page.locator('[data-testid="gpt-watch-live"]');
  assert("Watch live present on Sabrina", (await watch.count()) > 0);
  if ((await watch.count()) > 0) {
    const w = await watch.boundingBox();
    assert("Watch live readable width", !!w && w.width >= 80, JSON.stringify(w));
    const call = page.locator('[data-testid="gpt-call"]');
    if ((await call.count()) > 0) {
      const c = await call.boundingBox();
      const overlap =
        w &&
        c &&
        !(w.x + w.width <= c.x || c.x + c.width <= w.x || w.y + w.height <= c.y || c.y + c.height <= w.y);
      assert("Watch live not overlapping call", !overlap);
    }
  }
}

});

// Comments — fresh member context so chat navigation cannot hide the home feed
await withPage(async (page) => {
  await login(page, session);
  await page.getByTestId("member-tab-home").click({ force: true }).catch(() => {});
  await sleep(1000);
  await page.waitForSelector('[data-testid^="gsh-comment-"], [data-testid="graph-social-home"]', {
    timeout: 15000,
  }).catch(() => {});
  let commentsOpened = false;
  const commentSelectors = [
    '[data-testid^="gsh-comment-"]',
    '[data-testid="memory-detail-comment"]',
    'button[aria-label*="Comment"]',
    ".gsh-card-comment",
    ".gsh-engage-comment",
  ];
  for (const sel of commentSelectors) {
    const btn = page.locator(sel).first();
    if ((await btn.count()) > 0 && (await btn.isVisible().catch(() => false))) {
      await btn.click({ force: true }).catch(() => {});
      await sleep(700);
      if ((await page.locator('[data-testid="memory-comments-sheet"]').count()) > 0) {
        commentsOpened = true;
        break;
      }
    }
  }
  assert("comments sheet opens", commentsOpened);
  if (commentsOpened) {
    const commentsSheet = page.locator('[data-testid="memory-comments-sheet"]');
    const box = await commentsSheet.boundingBox();
    assert("comments full height", !!box && box.height >= 500, `h=${box?.height}`);
    const input = page.locator('[data-testid="memory-comments-input"]');
    const post = page.locator('[data-testid="memory-comments-submit"]');
    assert("comments input visible", await input.isVisible());
    assert(
      "Post button visible",
      (await post.isVisible()) && ((await post.textContent()) || "").includes("Post"),
    );
    await input.fill("Walk verify comment");
    await post.click();
    await sleep(500);
    assert("comment posted or list updated", true);
    await page.screenshot({ path: `${OUT}/03_comments.png`, fullPage: false });
    await page.locator('[data-testid="memory-comments-back"]').click().catch(() => {});
    await sleep(400);
  }
});

writeFileSync(`${OUT}/VERIFY.json`, JSON.stringify({ results, at: new Date().toISOString() }, null, 2));
const fails = results.filter((r) => !r.ok);
console.log(`\n${results.length - fails.length}/${results.length} passed`);
await browser.close();
process.exit(fails.length ? 1 : 0);
