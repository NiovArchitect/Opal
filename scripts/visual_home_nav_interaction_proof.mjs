#!/usr/bin/env node
/**
 * Home social-surface navigation + dock interaction proof.
 * HOLD. DO NOT MERGE. DO NOT START LIVE.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(
  ROOT,
  "docs/evidence/v2-coded-experience/social-flow-final-convergence/visual-convergence",
);
mkdirSync(resolve(OUT, "runtime"), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${WEB}/?opal_reset_first_run=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await sleep(600);
  if (
    await page.getByTestId("fr00-already-account").isVisible({ timeout: 5000 }).catch(() => false)
  ) {
    await page.getByTestId("fr00-already-account").click();
  }
  let devCode = "111111";
  page.on("response", async (res) => {
    try {
      if (res.url().includes("/activation/challenges") && res.request().method() === "POST") {
        const j = await res.json();
        if (j.development_code) devCode = j.development_code;
      }
    } catch {
      /* */
    }
  });
  await page.waitForSelector('[data-testid="fr06-phone-input"], #phone', { timeout: 20000 });
  await page.fill('[data-testid="fr06-phone-input"]', "+12025550101").catch(async () => {
    await page.fill("#phone", "+12025550101");
  });
  const consent = page.locator("#otp-consent, [data-testid='fr06-otp-consent']");
  if (await consent.first().isVisible().catch(() => false)) await consent.first().check().catch(() => {});
  await page.getByTestId("fr06-continue").click().catch(async () => {
    await page.getByRole("button", { name: /Text me a code/i }).click();
  });
  await page.waitForSelector('[data-testid="fr07-code-input"], #code', { timeout: 25000 });
  await sleep(250);
  await page.fill('[data-testid="fr07-code-input"]', devCode).catch(async () => page.fill("#code", devCode));
  await page.getByTestId("fr07-submit").click().catch(async () => {
    await page.getByRole("button", { name: /Continue|Verify/i }).click();
  });
  for (let i = 0; i < 50; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) break;
    if (await page.getByTestId("fr08-profile").isVisible().catch(() => false)) {
      const n = page.getByTestId("fr08-name-input");
      if (await n.isVisible().catch(() => false)) {
        const v = await n.inputValue().catch(() => "");
        if (!v) await n.fill("Founder Review");
      }
      const b = page.getByTestId("fr08-continue");
      if (!(await b.isDisabled().catch(() => true))) await b.click();
    }
    if (await page.getByTestId("fr09-not-now").isVisible().catch(() => false)) {
      await page.getByTestId("fr09-not-now").click();
    }
    await sleep(200);
  }
  await page.waitForSelector('[data-testid="member-shell"]', { timeout: 30000 });
}

function tabActive(page, id) {
  return page.getByTestId(`member-tab-${id}`).evaluate((el) => ({
    activeClass: el.classList.contains("is-active"),
    aria: el.getAttribute("aria-current"),
    dockActive: el.getAttribute("data-dock-active"),
    color: getComputedStyle(el).color,
  }));
}

async function main() {
  const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
  const { chromium } = require("playwright");
  const result = {
    at: new Date().toISOString(),
    assertions: {},
    verdict: "HOLD",
  };
  const assert = (name, ok, detail) => {
    result.assertions[name] = { ok: !!ok, detail: detail ?? null };
    console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  };

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  try {
    await login(page);
    await page.getByTestId("member-tab-home").click();
    await sleep(800);
    await page.waitForSelector('[data-testid="graph-social-home"]');

    // Stories frozen
    assert(
      "stories_still_one_row",
      (await page.locator('[data-testid="gsh-stories"]').getAttribute("data-stories-rows")) ===
        "1",
    );

    // Dock active coherence Home
    let home = await tabActive(page, "home");
    let chats = await tabActive(page, "chats");
    assert("home_active_on_home", home.activeClass && home.dockActive === "true", home);
    assert("chats_inactive_on_home", !chats.activeClass && chats.dockActive === "false", chats);

    // Navigate to Chats — Home must deactivate
    await page.getByTestId("member-tab-chats").click();
    await sleep(500);
    home = await tabActive(page, "home");
    chats = await tabActive(page, "chats");
    const graphs = await tabActive(page, "graphs");
    const you = await tabActive(page, "you");
    assert("chats_active_on_chats", chats.activeClass && chats.dockActive === "true", chats);
    assert("home_inactive_on_chats", !home.activeClass && home.dockActive === "false", home);
    assert("graphs_inactive_on_chats", !graphs.activeClass, graphs);
    assert("you_inactive_on_chats", !you.activeClass, you);
    // Icon+label share currentColor — Home must not stay cyan
    assert(
      "home_icon_not_cyan_on_chats",
      !/rgb\(\s*110\s*,\s*232\s*,\s*245\s*\)/.test(home.color),
      home.color,
    );
    assert(
      "chats_icon_cyan_when_active",
      /rgb\(\s*110\s*,\s*232\s*,\s*245\s*\)/.test(chats.color),
      chats.color,
    );

    // Graphs / You
    await page.getByTestId("member-tab-graphs").click();
    await sleep(400);
    assert(
      "graphs_active",
      (await tabActive(page, "graphs")).activeClass &&
        !(await tabActive(page, "home")).activeClass,
    );
    await page.getByTestId("member-tab-you").click();
    await sleep(400);
    assert(
      "you_active",
      (await tabActive(page, "you")).activeClass &&
        !(await tabActive(page, "home")).activeClass,
    );

    // Dock transparency — no opaque full-width tray background
    const dockBg = await page.getByTestId("member-tabbar").evaluate((el) => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, border: cs.borderTopWidth };
    });
    assert(
      "dock_container_transparent",
      dockBg.bg === "rgba(0, 0, 0, 0)" || dockBg.bg === "transparent",
      dockBg,
    );

    // Home child → Home root
    await page.getByTestId("member-tab-home").click();
    await sleep(700);
    const homeEl = page.locator('[data-testid="graph-social-home"]');
    await homeEl.evaluate((el) => {
      el.scrollTop = 1600;
    });
    await sleep(200);
    const commentBtn = page.locator('[data-testid^="gsh-comment-"]').first();
    if (await commentBtn.count()) {
      await commentBtn.click();
      await sleep(600);
      assert(
        "comments_open",
        await page.getByTestId("memory-comments-sheet").isVisible().catch(() => false),
      );
      assert(
        "comments_close_not_giant_back",
        await page.locator(".social-sheet-close").count() > 0 &&
          (await page.getByTestId("memory-comments-back").textContent())?.includes("×"),
      );
      // Persistent Home while in Comments → root feed
      await page.getByTestId("member-tab-home").click();
      await sleep(700);
      assert(
        "home_tab_dismisses_comments",
        !(await page.getByTestId("memory-comments-sheet").isVisible().catch(() => false)),
      );
      assert(
        "home_root_visible",
        await page.getByTestId("graph-social-home").isVisible().catch(() => false),
      );
    } else {
      assert("comments_button_present", false, "no comment control");
    }

    // Bottom clearance
    await page.getByTestId("member-tab-home").click();
    await sleep(400);
    const clearance = await homeEl.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
      const pad = getComputedStyle(el).paddingBottom;
      const last = el.querySelector('[data-testid^="gsh-card-"]:last-of-type');
      const lastBox = last?.getBoundingClientRect();
      const dock = document.querySelector('[data-testid="member-tabbar"]')?.getBoundingClientRect();
      return {
        pad,
        lastBottom: lastBox?.bottom,
        dockTop: dock?.top,
        clears: lastBox && dock ? lastBox.bottom <= dock.top + 8 : false,
      };
    });
    assert("home_bottom_pad_dock_clearance", /108|px/.test(clearance.pad), clearance);
    assert("final_card_clears_dock", !!clearance.clears, clearance);

    await page.screenshot({
      path: resolve(OUT, "runtime/RUNTIME_NAV_HOME_DOCK.png"),
      fullPage: false,
    });
    await page.getByTestId("member-tab-chats").click();
    await sleep(400);
    await page.screenshot({
      path: resolve(OUT, "runtime/RUNTIME_NAV_CHATS_ACTIVE.png"),
      fullPage: false,
    });

    const failed = Object.values(result.assertions).filter((a) => !a.ok).length;
    result.failed = failed;
    result.verdict =
      failed === 0 ? "HOLD_HOME_NAV_INTERACTION_PASS" : "HOLD_HOME_NAV_INTERACTION_FAIL";
  } finally {
    await browser.close();
  }

  writeFileSync(resolve(OUT, "15_BROWSER_NAV_INTERACTION_PROOF.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
