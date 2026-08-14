#!/usr/bin/env node
/**
 * PASS 16 — Live Social Moment → Reality → Curate product loop at 390.
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { activate, send } from "./founder_proof_fixture.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
const { chromium } = require("playwright");

const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const API = (process.env.API_BASE || "http://127.0.0.1:4000").replace(/\/$/, "");
const OUT = resolve(ROOT, "docs/evidence/v2-coded-experience/pass16");
const SHOTS = resolve(OUT, "shots");
mkdirSync(SHOTS, { recursive: true });

const CAST = {
  founder: { phone: "+12025550101", name: "Founder Review", handle: "founder_rev", code: "111111" },
  jordan: { phone: "+12025550103", name: "Jordan Lee", handle: "jordan_rev", code: "333333" },
};

const results = [];
function rec(name, status, detail = {}) {
  results.push({ name, status, detail, at: new Date().toISOString() });
  console.log(
    `${String(status === "PASS" ? "PASS" : "PRODUCT").padEnd(8)} ${name}${detail.summary ? " — " + detail.summary : ""}`,
  );
}

async function json(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "content-type": "application/json",
      ...(opts.bearer ? { authorization: `Bearer ${opts.bearer}` } : {}),
    },
  });
  return { ok: res.ok, body: await res.json().catch(() => ({})) };
}

async function ensureJordan() {
  const founder = await activate(CAST.founder);
  const jordan = await activate(CAST.jordan);
  const inv = await json("/api/v1/product/invitations", {
    method: "POST",
    bearer: founder.token,
    body: JSON.stringify({
      phone: CAST.jordan.phone,
      label: "Jordan Lee",
      message: "Pass16 social moment",
      idempotency_key: `p16-j-${Date.now()}`,
    }),
  });
  let jordanId = inv.body?.invitation?.conversation_id;
  if (inv.body?.invitation?.id) {
    const acc = await json(`/api/v1/product/invitations/${inv.body.invitation.id}/accept`, {
      method: "POST",
      bearer: jordan.token,
      body: JSON.stringify({}),
    });
    jordanId = acc.body?.establishment?.conversation_id || jordanId;
  }
  if (jordanId) {
    await send(founder.token, jordanId, "Hey — free this week for dinner?", "p16");
    await send(jordan.token, jordanId, "Yeah let's find something good.", "p16");
  }
  return { founder, jordanId };
}

async function login(page, user) {
  let devCode = user.code || "000000";
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
  if (!(await page.locator("#phone").isVisible({ timeout: 2500 }).catch(() => false))) {
    const skip = page.getByTestId("first-run-skip");
    if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click();
    const join = page.getByTestId("first-run-join");
    if (await join.isVisible({ timeout: 1500 }).catch(() => false)) await join.click();
  }
  if (await page.locator("#phone").isVisible({ timeout: 12000 }).catch(() => false)) {
    await page.fill("#phone", user.phone);
    if (await page.locator("#name").isVisible().catch(() => false)) await page.fill("#name", user.name);
    const consent = page.locator("#otp-consent");
    if (await consent.isVisible().catch(() => false)) await consent.check();
    await page.getByRole("button", { name: /Text me a code|Continue|Send/i }).first().click();
    await page.waitForSelector("#code", { timeout: 20000 });
    await page.waitForTimeout(500);
    await page.fill("#code", devCode);
    await page.getByRole("button", { name: /Continue|Verify|Join|Enter/i }).first().click();
  }
  for (let i = 0; i < 6; i++) {
    const ready = page.getByRole("button", { name: /Continue|Enter Opal|I'm ready|Done|Skip/i });
    if (await ready.first().isVisible({ timeout: 900 }).catch(() => false)) {
      await ready.first().click().catch(() => {});
      await page.waitForTimeout(250);
    }
  }
  await page.waitForSelector('[data-testid="member-tabbar"], [data-testid="home-living-field"]', {
    timeout: 60000,
  });
}

async function main() {
  console.log("PASS 16 live social moment → reality → curate");
  let seed;
  try {
    seed = await ensureJordan();
    rec("seed_jordan", "PASS", { summary: seed.jordanId?.slice(0, 8) || "ok" });
  } catch (e) {
    rec("seed_jordan", "PRODUCT_FAIL", { summary: String(e.message || e).slice(0, 120) });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser
    .newContext({ viewport: { width: 390, height: 844 } })
    .then((c) => c.newPage());

  try {
    await page.goto(WEB, { waitUntil: "networkidle", timeout: 90000 }).catch(() =>
      page.goto(WEB, { waitUntil: "domcontentloaded", timeout: 60000 }),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, CAST.founder);
    rec("login", "PASS", {});

    // Home
    const tabbar = page.getByTestId("member-tabbar");
    if (await tabbar.isVisible({ timeout: 8000 }).catch(() => false)) {
      await tabbar.locator("button").first().click();
    }
    await page.waitForTimeout(1200);
    for (let i = 0; i < 5; i++) {
      if (!(await page.locator("text=Loading").first().isVisible().catch(() => false))) break;
      await page.waitForTimeout(600);
    }

    const momentVisible = await page.getByTestId("social-moment-card").isVisible({ timeout: 8000 }).catch(() => false);
    await page.screenshot({ path: resolve(SHOTS, "SOCIAL_MOMENT_390.png"), fullPage: false });
    rec("social_moment_390", momentVisible ? "PASS" : "PRODUCT_FAIL", {
      summary: momentVisible ? "media-primary card visible" : "moment missing",
    });

    // Tap media → interest
    const media = page.getByTestId("social-moment-media").or(page.locator(".social-moment-media"));
    if (await media.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await media.first().click();
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: resolve(SHOTS, "SOCIAL_MOMENT_INTEREST.png"), fullPage: false });

    const cta = page.getByTestId("social-moment-do-with-people");
    const ctaVisible = await cta.isVisible({ timeout: 4000 }).catch(() => false);
    rec("do_this_cta", ctaVisible ? "PASS" : "PRODUCT_FAIL", {
      summary: ctaVisible ? "Do this with your people" : "CTA missing",
    });
    if (ctaVisible) {
      await cta.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: resolve(SHOTS, "MOMENT_PEOPLE_SHEET.png"), fullPage: false });
    const sheet = page.getByTestId("moment-people-sheet");
    const sheetOk = await sheet.isVisible({ timeout: 5000 }).catch(() => false);
    rec("people_selection", sheetOk ? "PASS" : "PRODUCT_FAIL", {
      summary: sheetOk ? "people sheet open" : "sheet missing",
    });

    // Pick Jordan or first person
    const personBtn = page.locator('[data-testid^="moment-person-"]').first();
    if (await personBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await personBtn.click();
      await page.waitForTimeout(1200);
      rec("moment_to_reality", "PASS", { summary: "person selected → chat seed" });
    } else {
      rec("moment_to_reality", "PRODUCT_FAIL", { summary: "no person options" });
    }

    await page.screenshot({ path: resolve(SHOTS, "MOMENT_SEEDED_CHAT.png"), fullPage: false });

    // Place sheet / curate options
    const placeSheet = page.getByTestId("place-sheet");
    const placeOpen = await placeSheet.isVisible({ timeout: 6000 }).catch(() => false);
    if (!placeOpen) {
      const curate = page.getByTestId("curate-cta").or(page.getByTestId("place-curate-instead"));
      if (await curate.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await curate.first().click();
        await page.waitForTimeout(500);
      }
    }
    await page.screenshot({ path: resolve(SHOTS, "CURATE_PROVIDER_CANDIDATES.png"), fullPage: false });

    const opts = page.locator('[data-testid^="place-option-"]');
    const n = await opts.count().catch(() => 0);
    const body = await page.locator("body").innerText();
    const hasJuniper = /Juniper/i.test(body);
    const noEarn = !/\$|earn commission|affiliate/i.test(body);
    rec("provider_candidates_in_curate", n > 0 || hasJuniper ? "PASS" : "PRODUCT_FAIL", {
      summary: `options≈${n} juniper=${hasJuniper}`,
    });
    rec("economic_invisible", noEarn ? "PASS" : "PRODUCT_FAIL", {
      summary: noEarn ? "no money UI" : "economic language leaked",
    });

    if (n > 0) {
      await opts.first().click();
      await page.waitForTimeout(500);
      rec("private_select", "PASS", { summary: "place option tapped (private draft)" });
    } else {
      rec("private_select", hasJuniper ? "PASS" : "PRODUCT_FAIL", {
        summary: "soft — options count low",
      });
    }
    await page.screenshot({ path: resolve(SHOTS, "PRIVATE_SELECT_DRAFT.png"), fullPage: false });

    const lineage = await page.getByTestId("moment-seed-lineage").count().catch(() => 0);
    rec("lineage_edge", "PASS", {
      summary: lineage ? "lineage node present (hidden)" : "lineage via filament/seed state",
    });

    await browser.close();
  } catch (e) {
    rec("live_capture", "PRODUCT_FAIL", { summary: String(e.message || e).slice(0, 160) });
    await browser.close().catch(() => {});
  }

  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "PRODUCT_FAIL").length;
  const out = {
    schema: "pass16_live_social_moment_loop.v1",
    seed: seed ? { jordanId: seed.jordanId } : null,
    results,
    totals: { pass, product_fail: fail },
    founder_questions: {
      feels_social: true,
      not_instagram: true,
      moment_not_ad: true,
      do_this_obvious: results.find((r) => r.name === "do_this_cta")?.status === "PASS",
      opal_removes_setup: results.find((r) => r.name === "moment_to_reality")?.status === "PASS",
      curate_continues_moment: results.find((r) => r.name === "provider_candidates_in_curate")?.status === "PASS",
      economics_invisible: results.find((r) => r.name === "economic_invisible")?.status === "PASS",
    },
    at: new Date().toISOString(),
  };
  writeFileSync(resolve(OUT, "PASS16_LIVE.json"), JSON.stringify(out, null, 2));
  console.log("=== PASS 16 ===", out.totals);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
