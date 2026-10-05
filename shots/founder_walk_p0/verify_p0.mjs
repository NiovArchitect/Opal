/**
 * P0 founder-walk verify: stories, comments, chat scroll/header, call-back.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { activate } from "../../scripts/founder_proof_fixture.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(ROOT, "shots/founder_walk_p0");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
const { chromium } = require("playwright");

async function login(page, session) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(
    ({ token, userId, name }) => {
      try {
        sessionStorage.setItem("opal.product.browser_session.v1", token);
        sessionStorage.setItem("opal_native_host", "1");
        localStorage.setItem(
          "opal.product.profile.v17",
          JSON.stringify({
            user_id: userId,
            display_name: name,
            handle: "founder_rev",
          }),
        );
        localStorage.setItem("opal.founder_seed.opt_in.persist.v1", "1");
        sessionStorage.setItem("opal.founder_seed.opt_in.v1", "1");
      } catch {
        /* ignore */
      }
    },
    { token: session.token, userId: session.userId, name: session.name },
  );
  await page.goto(`${WEB}/?opal_founder_seed=1&opal_native_host=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await sleep(1200);
  // If still in first-run, force through with force clicks
  for (let i = 0; i < 8; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) break;
    if (await page.getByTestId("fr00-already-account").isVisible().catch(() => false)) {
      await page.getByTestId("fr00-already-account").click({ force: true });
      await sleep(400);
      continue;
    }
    if (await page.getByTestId("fr00-skip-intro").isVisible().catch(() => false)) {
      await page.getByTestId("fr00-skip-intro").click({ force: true });
      await sleep(400);
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
    if (await page.getByTestId("fr08-continue").isVisible().catch(() => false)) {
      const disabled = await page.getByTestId("fr08-continue").isDisabled().catch(() => true);
      if (!disabled) await page.getByTestId("fr08-continue").click({ force: true });
      await sleep(400);
      continue;
    }
    await sleep(400);
  }
  // Hard reload with seed if shell still missing — token already in sessionStorage
  if (!(await page.getByTestId("member-shell").isVisible().catch(() => false))) {
    await page.goto(`${WEB}/?opal_founder_seed=1&opal_native_host=1`, {
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

const report = { at: new Date().toISOString(), checks: {} };

const session = await activate({
  phone: "+12025550101",
  name: "Founder Review",
  handle: "founder_rev",
  code: "111111",
});

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(20000);
await login(page, session);
await page.screenshot({ path: resolve(OUT, "01_home_after.png") });

const storiesVisible = await page.getByTestId("gsh-stories").isVisible().catch(() => false);
report.checks.stories_rail = storiesVisible;
if (storiesVisible) {
  const firstStory = page.locator('[data-testid^="gsh-story-"]:not([data-testid="gsh-story-create"])').first();
  const pulse = await firstStory.locator("[data-pulse]").first().getAttribute("data-pulse").catch(() => null);
  await firstStory.click({ force: true });
  await sleep(700);
  const viewerOpen =
    (await page.getByTestId("story-viewer").isVisible().catch(() => false)) ||
    (await page.getByTestId("full-live-destination").isVisible().catch(() => false));
  report.checks.story_tap_opens = viewerOpen;
  report.checks.first_story_pulse = pulse;
  await page.screenshot({ path: resolve(OUT, "02_story_or_live.png") });
  const close = page.locator('[data-testid="story-viewer-close"], [data-testid="full-live-close"]').first();
  if (await close.count()) await close.click().catch(() => {});
  await sleep(400);

  const sabrina = page.getByTestId("gsh-story-story-sabrina");
  if (await sabrina.isVisible().catch(() => false)) {
    await sabrina.click({ force: true });
    await sleep(700);
    report.checks.sabrina_live_opens = await page
      .getByTestId("full-live-destination")
      .isVisible()
      .catch(() => false);
    await page.screenshot({ path: resolve(OUT, "03_sabrina_live.png") });
    const lc = page.locator('[data-testid="full-live-close"], button[aria-label*="Close"]').first();
    if (await lc.count()) await lc.click().catch(() => {});
    await sleep(300);
  }

  const create = page.getByTestId("gsh-story-create");
  if (await create.isVisible().catch(() => false)) {
    await create.click({ force: true });
    await sleep(500);
    report.checks.story_create_opens =
      (await page.locator(".story-create-flow").count()) > 0 ||
      (await page.getByTestId("story-create").isVisible().catch(() => false));
    await page.screenshot({ path: resolve(OUT, "04_story_create.png") });
    const back = page.locator('[data-testid="story-create-close"], .story-create-flow button').first();
    if (await back.count()) await back.click().catch(() => {});
    await sleep(300);
  }
}

await page.getByTestId("member-tab-home").click().catch(() => {});
await sleep(500);
const commentBtn = page
  .locator(
    '[data-testid="memory-detail-comment"], [data-testid^="gsh-comment-"], button[aria-label*="Comment"], .gsh-card-comment',
  )
  .first();
if (await commentBtn.count()) {
  await commentBtn.click({ force: true });
  await sleep(500);
  report.checks.comment_sheet =
    (await page.getByTestId("memory-comments-sheet").isVisible().catch(() => false)) ||
    (await page.locator(".memory-comments-sheet").count()) > 0;
  await page.screenshot({ path: resolve(OUT, "05_comments.png") });
  const cb = page.locator('[data-testid="memory-comments-back"]').first();
  if (await cb.count()) await cb.click().catch(() => {});
} else {
  // open memory then comment
  const media = page.locator('[data-testid^="gsh-media-"][data-mode="active"]').first();
  if (await media.count()) {
    await media.click({ force: true });
    await sleep(500);
    const mdComment = page.getByTestId("memory-detail-comment");
    if (await mdComment.isVisible().catch(() => false)) {
      await mdComment.click();
      await sleep(400);
      report.checks.comment_sheet = await page
        .getByTestId("memory-comments-sheet")
        .isVisible()
        .catch(() => false);
      await page.screenshot({ path: resolve(OUT, "05_comments.png") });
    } else {
      report.checks.comment_sheet = "no_comment_control";
    }
  } else {
    report.checks.comment_sheet = "no_comment_btn";
  }
}

await page.getByTestId("member-tab-chats").click();
await sleep(1000);
await page.screenshot({ path: resolve(OUT, "06_chats_list.png") });
const row = page.locator('[data-testid^="chats-row-"]').first();
report.checks.chat_rows = await row.count();
if (await row.count()) {
  await row.click();
  await sleep(1200);
  await page.screenshot({ path: resolve(OUT, "07_chat_detail.png") });
  const thread = page.locator(".thread").first();
  if (await thread.count()) {
    const metrics = await thread.evaluate((el) => {
      const call = document.querySelector('[data-testid="gpt-call"]');
      const video = document.querySelector('[data-testid="gpt-video"]');
      const plan = document.querySelector('[data-testid="gpt-plan"]');
      const name = document.querySelector(".gpt-name");
      const composer = document.querySelector(".composer-618");
      const box = (n) => (n ? n.getBoundingClientRect().toJSON() : null);
      const overlap = (a, b) => {
        if (!a || !b) return false;
        return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
      };
      const cb = box(call),
        vb = box(video),
        pb = box(plan),
        nb = box(name),
        cob = box(composer);
      return {
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        canScroll: el.scrollHeight > el.clientHeight + 2,
        overflowY: getComputedStyle(el).overflowY,
        justify: getComputedStyle(el).justifyContent,
        callOverlapsName: overlap(cb, nb),
        videoOverlapsCall: overlap(cb, vb),
        planOverlapsVideo: overlap(vb, pb),
        composerBottom: cob?.bottom ?? null,
        viewportH: window.innerHeight,
        headerMinHeight: document.querySelector(".gpt-header")?.getBoundingClientRect().height ?? null,
      };
    });
    report.checks.chat_layout = metrics;
    if (metrics.canScroll) {
      await thread.evaluate((el) => {
        el.scrollTop = 0;
      });
      await sleep(150);
      await thread.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await sleep(150);
      report.checks.chat_scrolled = true;
    } else {
      report.checks.chat_scrolled = "content_short_ok";
    }
    await page.screenshot({ path: resolve(OUT, "08_chat_detail_scrolled.png") });
  } else {
    report.checks.chat_layout = "no_thread";
  }
  const back = page.locator('[data-testid="gpt-back"], .gpt-back').first();
  if (await back.count()) await back.click().catch(() => {});
  await sleep(400);
}

const callsMode = page.getByTestId("comm-mode-calls");
if (await callsMode.isVisible().catch(() => false)) {
  await callsMode.click();
  await sleep(800);
  await page.screenshot({ path: resolve(OUT, "09_calls_list.png") });
  const dial = page.locator('[data-testid^="calls-quick-dial-"]').first();
  const crow = page.locator('[data-testid^="calls-open-continuity-"]').first();
  if (await dial.count()) {
    const postPromise = page
      .waitForRequest(
        (r) => r.method() === "POST" && /\/calls|\/conversations\/.+\/calls/.test(r.url()),
        { timeout: 6000 },
      )
      .then((r) => ({ url: r.url() }))
      .catch(() => null);
    await dial.click({ force: true });
    report.checks.call_dial_post = await postPromise;
    await sleep(800);
    await page.screenshot({ path: resolve(OUT, "10_call_surface.png") });
  } else if (await crow.count()) {
    const postPromise = page
      .waitForRequest((r) => r.method() === "POST" && /calls/.test(r.url()), { timeout: 6000 })
      .then((r) => ({ url: r.url() }))
      .catch(() => null);
    await crow.click({ force: true });
    report.checks.call_row_post = await postPromise;
    await page.screenshot({ path: resolve(OUT, "10_call_surface.png") });
  } else {
    report.checks.call_dial = "no_rows";
  }
}

writeFileSync(resolve(OUT, "VERIFY.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
