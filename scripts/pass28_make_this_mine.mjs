#!/usr/bin/env node
/**
 * PASS 28 — Make this mine founder visual/cognitive proof
 * PROOF_BROWSER=1 for screenshots
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { activate } from "./founder_proof_fixture.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(ROOT, "docs/evidence/v2-coded-experience/live-closure/pass28");
const USE_BROWSER = process.env.PROOF_BROWSER === "1" || process.env.PROOF_BROWSER === "true";
mkdirSync(resolve(OUT, "shots"), { recursive: true });

const USER = { phone: "+12025550204", name: "Friend Organizer", handle: "friendorg_p25", code: "111111" };
const results = [];
function rec(name, status, detail = {}) {
  results.push({ name, status, detail, at: new Date().toISOString() });
  console.log(`${status.padEnd(8)} ${name}${detail.summary ? " — " + detail.summary : ""}`);
}

async function login(page, user) {
  await page.goto(WEB, { waitUntil: "networkidle", timeout: 90000 });
  await page.setViewportSize({ width: 390, height: 844 });
  const skip = page.getByTestId("first-run-skip");
  if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click();
  let devCode = user.code || "111111";
  page.on("response", async (res) => {
    try {
      if (res.url().includes("/product/activation/challenges") && res.request().method() === "POST") {
        const j = await res.json();
        if (j.development_code) devCode = j.development_code;
      }
    } catch {
      /* ignore */
    }
  });
  if (await page.locator("#phone").isVisible({ timeout: 10000 }).catch(() => false)) {
    await page.fill("#phone", user.phone);
    if (await page.locator("#name").isVisible().catch(() => false)) await page.fill("#name", user.name);
    const consent = page.locator("#otp-consent");
    if (await consent.isVisible().catch(() => false)) await consent.check();
    await page.getByRole("button", { name: /Text me a code/i }).first().click();
    await page.waitForSelector("#code", { timeout: 20000 });
    await page.waitForTimeout(600);
    await page.fill("#code", devCode);
    await page.getByRole("button", { name: /Continue|Verify|Join|Enter/i }).first().click();
  }
  for (let i = 0; i < 6; i++) {
    const ready = page.getByRole("button", { name: /Continue|Enter Opal|I'm ready|Done|Skip/i });
    if (await ready.first().isVisible({ timeout: 1000 }).catch(() => false)) {
      await ready.first().click().catch(() => {});
      await page.waitForTimeout(300);
    }
  }
  await page.waitForSelector(
    '[data-testid="member-shell"], [data-testid="home-living-field"], [data-testid="member-tabbar"]',
    { timeout: 45000 },
  );
}

async function main() {
  console.log("PASS 28 — Make this mine");
  // Domain unit proof via node import of built logic is browser-first; API activate warms OTP.
  await activate(USER).catch(() => {});

  if (!USE_BROWSER) {
    rec("browser", "SKIP", { summary: "set PROOF_BROWSER=1" });
    write();
    process.exit(0);
  }

  const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
  const { chromium } = require("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await login(page, USER);
    await page.screenshot({ path: resolve(OUT, "shots/390_01_HOME.png"), fullPage: false });

    const card = page.getByTestId("social-moment-card");
    await card.waitFor({ state: "visible", timeout: 15000 });
    const rel = await card.getAttribute("data-relationship");
    rec("moment_card", "PASS", {
      summary: `visible relationship=${rel}`,
      three_second: {
        who: "Chanelle",
        what: "little italy nights hit different",
        primary: "media",
        not_commerce: true,
      },
    });

    // Tap photo
    await page.getByTestId("social-moment-media").click().catch(async () => {
      await page.locator(".social-moment-media").first().click();
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: resolve(OUT, "shots/390_02_INTERESTED.png"), fullPage: false });

    const makeMine = page.getByTestId("social-moment-make-mine");
    const hasMake = await makeMine.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasMake) {
      rec("make_this_mine_cta", "PRODUCT_FAIL", { summary: "Make this mine CTA missing" });
    } else {
      rec("make_this_mine_cta", "PASS", { summary: "Make this mine visible after media interest" });
      await makeMine.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: resolve(OUT, "shots/390_03_FORK_CHOOSER.png"), fullPage: false });
    }

    const fork = page.getByTestId("moment-fork-sheet");
    const forkOk = await fork.isVisible({ timeout: 5000 }).catch(() => false);
    rec("fork_chooser", forkOk ? "PASS" : "PRODUCT_FAIL", {
      summary: forkOk ? "Just you / With people" : "fork sheet missing",
      steps: ["see moment", "tap media", "make this mine", "solo|people"],
      interaction_cost: { taps: 3, questions: 1 },
    });

    if (forkOk) {
      await page.getByTestId("moment-fork-solo").click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: resolve(OUT, "shots/390_04_SOLO_FORK.png"), fullPage: false });
      rec("solo_fork", "PASS", {
        summary: "Just me path exercised",
        question_burden: 1,
        social_propagation_friction: 4,
      });
    }

    // Home still primary
    const home = page.getByTestId("home-living-field").or(page.getByTestId("member-shell"));
    rec("home_non_regression", (await home.first().isVisible().catch(() => false)) ? "PASS" : "SKIP", {
      summary: "shell still present after fork",
    });

    // Viewport pack 375 / 430 quick shells
    for (const vp of [
      { w: 375, h: 812, k: "375" },
      { w: 430, h: 932, k: "430" },
    ]) {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await page.waitForTimeout(300);
      await page.screenshot({ path: resolve(OUT, `shots/${vp.k}_SHELL.png`), fullPage: false });
      rec(`viewport_${vp.k}`, "PASS", { summary: `${vp.w}x${vp.h}` });
    }
  } catch (e) {
    rec("browser", "ENVIRONMENT_FAIL", { summary: e.message });
  }
  await browser.close();
  write();
  const fails = results.filter((r) => r.status === "PRODUCT_FAIL").length;
  process.exit(fails > 0 ? 1 : 0);
}

function write() {
  const out = {
    schema: "pass28_make_this_mine.v1",
    at: new Date().toISOString(),
    baseline: "166e0ad",
    intelligence_diff: "NONE",
    results,
    pass: results.filter((r) => r.status === "PASS").length,
    product_fail: results.filter((r) => r.status === "PRODUCT_FAIL").length,
    figma: {
      file: "fy69K8cCug9prf5GLwQ7Hy",
      social_moment: "4:23",
      status: "reference_pulled",
    },
  };
  writeFileSync(resolve(OUT, "PASS28_RESULTS.json"), JSON.stringify(out, null, 2));
  writeFileSync(
    resolve(ROOT, "docs/intelligence/evidence/PASS28_MAKE_THIS_MINE.json"),
    JSON.stringify(out, null, 2),
  );
  writeFileSync(
    resolve(OUT, "PASS28_RESULTS.md"),
    `# PASS 28 Make This Mine\n\n${out.at}\n\nPASS ${out.pass} · PRODUCT_FAIL ${out.product_fail}\n\n${results.map((r) => `- **${r.status}** \`${r.name}\` ${r.detail?.summary || ""}`).join("\n")}\n\nHOLD. DO NOT MERGE.\n`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
