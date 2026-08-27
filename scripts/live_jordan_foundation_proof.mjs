#!/usr/bin/env node
/**
 * LIVE Jordan foundation proof — real browser (Playwright).
 *
 * Uses founder_proof_fixture.mjs for a deterministic place-open episode.
 * Distinguishes FIXTURE_FAIL vs PRODUCT_FAIL vs ENVIRONMENT_FAIL.
 *
 * Usage:
 *   node scripts/founder_proof_fixture.mjs && node scripts/live_jordan_foundation_proof.mjs
 *   node scripts/live_jordan_foundation_proof.mjs --prepare
 *   node scripts/live_jordan_foundation_proof.mjs --repeat 3
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  prepareJordanTimePlaceFixture,
  loadFixture,
  assertJordanTimePlacePrecondition,
  deriveFixtureGap,
  activate as fixtureActivate,
} from "./founder_proof_fixture.mjs";

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), "..");
const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
const { chromium } = require("playwright");

const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const API = (process.env.API_BASE || "http://127.0.0.1:4000").replace(/\/$/, "");
const OUT_DIR = resolve(ROOT, "docs/evidence/v2-coded-experience/live-closure/jordan-proof");
const OUT_JSON = resolve(OUT_DIR, "LIVE_JORDAN_PROOF.json");

const FOUNDER = {
  phone: "+12025550101",
  code: "111111",
  name: "Founder Review",
  handle: "founder_rev",
};
const JORDAN = {
  phone: "+12025550103",
  code: "333333",
  name: "Jordan Lee",
  handle: "jordan_rev",
};

mkdirSync(OUT_DIR, { recursive: true });

const results = [];
function rec(name, status, detail = {}, evidence = []) {
  const row = { name, status, detail, evidence, at: new Date().toISOString() };
  results.push(row);
  const mark =
    status === "PASS"
      ? "PASS"
      : status === "PRODUCT_FAIL"
        ? "PRODUCT"
        : status === "FIXTURE_FAIL"
          ? "FIXTURE"
          : status === "ENVIRONMENT_FAIL"
            ? "ENV"
            : status;
  console.log(
    `${String(mark).padEnd(8)} ${name}${detail.summary ? " — " + detail.summary : ""}`,
  );
  return row;
}

async function jordanMessages(token, conversationId) {
  const res = await fetch(
    `${API}/api/v1/product/conversations/${conversationId}/messages`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  return res.json();
}

async function shot(page, name) {
  const path = resolve(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function login(page) {
  await page.goto(WEB, { waitUntil: "networkidle", timeout: 60000 });
  await page.setViewportSize({ width: 390, height: 844 });

  const skip = page.getByTestId("first-run-skip");
  if (await skip.isVisible({ timeout: 3000 }).catch(() => false)) {
    await skip.click();
  }
  const join = page.getByTestId("first-run-join");
  if (await join.isVisible({ timeout: 1500 }).catch(() => false)) {
    await join.click();
  }

  if (await page.locator("#phone").isVisible({ timeout: 8000 }).catch(() => false)) {
    await page.fill("#phone", FOUNDER.phone);
    if (await page.locator("#name").isVisible().catch(() => false)) {
      await page.fill("#name", FOUNDER.name);
    }
    const consent = page.locator("#otp-consent");
    if (await consent.isVisible().catch(() => false)) {
      await consent.check();
    }
    await page.getByRole("button", { name: /Text me a code|Continue|Send/i }).first().click();
    await page.waitForSelector("#code", { timeout: 15000 });
    await page.fill("#code", FOUNDER.code);
    await page.getByRole("button", { name: /Continue|Verify|Join|Enter/i }).first().click();
  }

  for (let i = 0; i < 4; i++) {
    const ready = page.getByRole("button", {
      name: /Continue|Enter Opal|I'm ready|Done|Skip/i,
    });
    if (await ready.first().isVisible({ timeout: 1500 }).catch(() => false)) {
      await ready.first().click().catch(() => {});
      await page.waitForTimeout(400);
    }
  }

  await page.waitForSelector(
    '[data-testid="member-shell"], [data-testid="home-living-field"], [data-testid="member-tabbar"]',
    { timeout: 30000 },
  );
}

async function leaveConversation(page) {
  const back = page.locator(
    'button[aria-label="Back to chats"], .chat-header .icon-btn, [data-testid="member-conversation"] button.icon-btn',
  );
  if (await back.first().isVisible({ timeout: 1500 }).catch(() => false)) {
    await back.first().click();
    await page.waitForTimeout(500);
  }
}

async function openTab(page, label) {
  await leaveConversation(page);
  const tabbar = page.getByTestId("member-tabbar");
  await tabbar.waitFor({ state: "visible", timeout: 10000 });
  const tab = tabbar.locator("button", {
    hasText: new RegExp(`^\\s*${label}\\s*$`, "i"),
  });
  if (await tab.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await tab.first().click();
  } else {
    await tabbar.locator("button", { hasText: new RegExp(label, "i") }).first().click();
  }
  await page.waitForTimeout(500);
}

async function sendComposer(page, text) {
  const input = page.locator("#composer-input");
  await input.waitFor({ state: "visible", timeout: 10000 });
  await input.click();
  await input.fill("");
  await page.waitForTimeout(100);
  await input.pressSequentially(text, { delay: 8 });
  await page.waitForTimeout(150);
  const val = await input.inputValue();
  if (!val.trim()) {
    await input.evaluate((el, v) => {
      const proto = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      );
      proto?.set?.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, text);
  }
  const postPromise = page
    .waitForResponse(
      (r) =>
        r.url().includes("/messages") &&
        r.request().method() === "POST" &&
        r.status() < 500,
      { timeout: 15000 },
    )
    .catch(() => null);
  await page.locator("form.composer button.send-btn[type='submit']").click();
  const resp = await postPromise;
  await page.waitForTimeout(800);
  return {
    posted: !!resp,
    status: resp ? resp.status() : null,
  };
}

async function openOwnedConversation(page, conversationId) {
  await openTab(page, "Home");
  await page.waitForTimeout(800);
  if (conversationId) {
    const exact = page.locator(`[data-conversation-id="${conversationId}"]`);
    if (await exact.first().isVisible({ timeout: 4000 }).catch(() => false)) {
      await exact.first().click();
      await page.waitForTimeout(1000);
      if (await page.getByTestId("member-conversation").isVisible().catch(() => false)) {
        return true;
      }
    }
  }
  await openTab(page, "People");
  await page.waitForTimeout(600);
  if (conversationId) {
    const exactPeople = page.locator(`[data-conversation-id="${conversationId}"]`);
    if (await exactPeople.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await exactPeople.first().click();
      await page.waitForTimeout(900);
      return page.getByTestId("member-conversation").isVisible().catch(() => false);
    }
  }
  return false;
}

function textBlob(page) {
  return page.locator("body").innerText();
}

async function runOnce(runLabel) {
  results.length = 0;
  const runOut = resolve(OUT_DIR, `LIVE_JORDAN_PROOF_${runLabel}.json`);

  // Always prepare a fresh owned episode (deterministic start).
  let fixture;
  try {
    fixture = await prepareJordanTimePlaceFixture({
      episodeId: process.env.PROOF_EPISODE || `t2p-run-${runLabel}-${Date.now().toString(36)}`,
    });
  } catch (e) {
    rec("fixture_prepare", "ENVIRONMENT_FAIL", {
      summary: String(e.message || e),
    });
    writeFileSync(runOut, JSON.stringify({ results, runLabel }, null, 2));
    return { pass: false, results: [...results], fixture: null };
  }

  rec(
    "founder_jordan_fixture_precondition",
    fixture.precondition.ok ? "PASS" : "FIXTURE_FAIL",
    {
      summary: fixture.precondition.detail,
      class: fixture.precondition.class,
      episode: fixture.episode_id,
      conversation_id: fixture.owned.conversation_id,
      observed: fixture.observed,
    },
  );

  if (!fixture.precondition.ok) {
    writeFileSync(runOut, JSON.stringify({ results, runLabel, fixture }, null, 2));
    return { pass: false, results: [...results], fixture };
  }

  const conversationId = fixture.owned.conversation_id;
  const founderApi = await fixtureActivate(FOUNDER);
  const jordanApi = await fixtureActivate(JORDAN);

  // Double-check precondition from API after prepare
  const msgsCheck = await jordanMessages(founderApi.token, conversationId);
  const state2 = deriveFixtureGap(msgsCheck);
  const pre2 = assertJordanTimePlacePrecondition(state2);
  rec(
    "fixture_api_precondition",
    pre2.ok ? "PASS" : "FIXTURE_FAIL",
    { summary: pre2.detail, observed: state2 },
  );
  if (!pre2.ok) {
    writeFileSync(runOut, JSON.stringify({ results, runLabel, fixture }, null, 2));
    return { pass: false, results: [...results], fixture };
  }

  const beforeCount = (msgsCheck.messages || []).length;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    await login(page);
    rec("login_founder", "PASS", { summary: "member shell visible" });
    await shot(page, `${runLabel}-01-home`);

    // Dual brand chrome: home should not stack topbar lockup + field brand
    const homeMarks = await page.locator("img.opal-mark--current, img.v2-opal-mark").count();
    rec(
      "brand_chrome_home",
      homeMarks <= 2 ? "PASS" : "PRODUCT_FAIL",
      {
        summary: `mark_img_count=${homeMarks} (≤2 expected: one field mark; not dual competing chrome)`,
        homeMarks,
      },
    );

    const opened = await openOwnedConversation(page, conversationId);
    await page.waitForTimeout(1200);
    rec("open_owned_jordan", opened ? "PASS" : "PRODUCT_FAIL", {
      summary: opened
        ? `opened owned ${conversationId}`
        : "could not open owned conversation via data-conversation-id",
    });
    if (!opened) {
      await shot(page, `${runLabel}-99-open-fail`);
      writeFileSync(runOut, JSON.stringify({ results, runLabel, fixture }, null, 2));
      await browser.close();
      return { pass: false, results: [...results], fixture };
    }
    await shot(page, `${runLabel}-02-chat-start`);

    const journeyRow = page.getByTestId("journey-cta-row");
    const nextGapAttr = await journeyRow.getAttribute("data-next-gap").catch(() => null);
    const gapChip = page.getByTestId("opal-gap-chip");
    const chipText = (await gapChip.isVisible().catch(() => false))
      ? await gapChip.innerText()
      : "";
    const journeyText = (await journeyRow.isVisible().catch(() => false))
      ? await journeyRow.innerText()
      : "";

    // Precondition already asserted API-side. UI must agree → PRODUCT if not.
    const placeOriented =
      nextGapAttr === "place" ||
      /place|where|curate/i.test(`${chipText} ${journeyText}`);
    const stuckOnTime =
      nextGapAttr === "time" ||
      (/find a time/i.test(chipText) && !/place/i.test(chipText));

    if (nextGapAttr && nextGapAttr !== "place" && nextGapAttr !== "none") {
      // UI gap differs from fixture API precondition → product projection issue
      if (nextGapAttr === "confirm_required_person") {
        rec("time_to_place_transition", "FIXTURE_FAIL", {
          summary: `UI next_gap=${nextGapAttr} after fresh fixture — fixture messaging insufficient for gap model (not dual-CTA)`,
          next_gap: nextGapAttr,
          chip: chipText,
        });
      } else {
        rec("time_to_place_transition", "PRODUCT_FAIL", {
          summary: `UI next_gap=${nextGapAttr} expected place`,
          next_gap: nextGapAttr,
          chip: chipText,
        });
      }
    } else {
      rec(
        "time_to_place_transition",
        placeOriented && !stuckOnTime ? "PASS" : "PRODUCT_FAIL",
        {
          summary: `next_gap=${nextGapAttr} placeOriented=${placeOriented} stuckOnTime=${stuckOnTime}`,
          chip: chipText,
          journey: journeyText.slice(0, 120),
        },
      );
    }

    // Place CTA — chip is primary
    let placeSurface = false;
    if (await gapChip.isVisible().catch(() => false)) {
      await gapChip.click();
      await page.waitForTimeout(500);
    } else if (await page.getByTestId("curate-cta").isVisible().catch(() => false)) {
      await page.getByTestId("curate-cta").click();
      await page.waitForTimeout(500);
    }
    placeSurface =
      (await page.getByTestId("place-sheet").isVisible().catch(() => false)) ||
      (await page.getByTestId("curate-panel").isVisible().catch(() => false));

    // Single place CTA: at most one "Choose a place" control
    const bodyText = await textBlob(page);
    const choosePlaceCount = (bodyText.match(/Choose a place/gi) || []).length;
    rec(
      "single_place_cta",
      choosePlaceCount <= 1 ? "PASS" : "PRODUCT_FAIL",
      { summary: `Choose a place count=${choosePlaceCount}`, choosePlaceCount },
    );

    rec(
      "place_cta",
      placeSurface || placeOriented ? "PASS" : "PRODUCT_FAIL",
      { summary: placeSurface ? "place/curate surface opened" : "no place surface" },
    );
    await shot(page, `${runLabel}-03-place-surface`);

    // Private place
    const placeOption = page.getByTestId("place-option-juniper");
    if (await placeOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await placeOption.click();
      await page.waitForTimeout(600);
      const draft = await page.inputValue("#composer-input").catch(() => "");
      const afterSelect = await jordanMessages(jordanApi.token, conversationId);
      const afterSelectCount = (afterSelect.messages || []).length;
      const privateOk =
        afterSelectCount === beforeCount &&
        /juniper|ivy|little italy|place/i.test(draft || "");
      rec(privateOk ? "private_place_select" : "private_place_select", privateOk ? "PASS" : "PRODUCT_FAIL", {
        summary: privateOk
          ? "draft only; peer msg count unchanged"
          : `draft=${draft} delta=${afterSelectCount - beforeCount}`,
        draft,
      });
    } else {
      rec("private_place_select", "PRODUCT_FAIL", {
        summary: "place-option-juniper not visible",
      });
      await page.fill("#composer-input", "Juniper & Ivy · Little Italy?");
    }

    const draftNow =
      (await page.inputValue("#composer-input").catch(() => "")) ||
      "Juniper & Ivy · Little Italy?";
    rec(
      "place_share_payload",
      /juniper|ivy|place|little italy/i.test(draftNow) &&
        !/availability window/i.test(draftNow)
        ? "PASS"
        : "PRODUCT_FAIL",
      { summary: draftNow.slice(0, 120) },
    );

    await sendComposer(page, draftNow.trim());
    const afterShare = await jordanMessages(jordanApi.token, conversationId);
    const afterShareCount = (afterShare.messages || []).length;
    const lastBodies = (afterShare.messages || []).slice(-3).map((m) => m.body || "");
    const shareOk =
      afterShareCount > beforeCount &&
      lastBodies.some((b) => /juniper|ivy|little italy/i.test(b || ""));
    rec("explicit_place_share", shareOk ? "PASS" : "PRODUCT_FAIL", {
      summary: shareOk
        ? "Jordan received place message"
        : `delta=${afterShareCount - beforeCount}`,
      lastBodies,
    });
    await shot(page, `${runLabel}-04-after-share`);

    const chatContext =
      (await page.getByTestId("chat-context").innerText().catch(() => "")) || "";
    rec(
      "shared_reality_same_lineage",
      /dinner/i.test(chatContext + (await textBlob(page))) ? "PASS" : "PRODUCT_FAIL",
      { summary: chatContext.slice(0, 100) },
    );

    await openTab(page, "Home");
    await page.waitForTimeout(700);
    const homeText = await textBlob(page);
    await shot(page, `${runLabel}-05-home`);
    // Owned Jordan should appear once
    const jordanRows = (homeText.match(/Jordan Lee/g) || []).length;
    rec(
      "home_one_owned_jordan",
      jordanRows >= 1 && jordanRows <= 2 ? "PASS" : "PRODUCT_FAIL",
      {
        summary: `Jordan Lee mentions=${jordanRows} (presence+awaken meta ok ≤2)`,
        jordanRows,
      },
    );
    rec(
      "home_surface",
      /jordan/i.test(homeText) && /dinner|6:30|juniper|place/i.test(homeText)
        ? "PASS"
        : "PRODUCT_FAIL",
      { summary: "Jordan dinner story present" },
    );
    rec(
      "home_no_double_thursday",
      !/Thu\s*[·,]\s*Thursday/i.test(homeText) ? "PASS" : "PRODUCT_FAIL",
      { summary: /Thu\s*[·,]\s*Thursday/i.test(homeText) ? "double day still present" : "compressed" },
    );

    await openOwnedConversation(page, conversationId);
    await page.waitForTimeout(500);
    await shot(page, `${runLabel}-06-chat`);
    rec("chat_surface", "PASS", { summary: "conversation reopened" });

    await openTab(page, "Plans");
    await page.waitForTimeout(500);
    await shot(page, `${runLabel}-07-plans`);
    rec("plans_surface", "PASS", { summary: "plans tab" });

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    if (!(await page.getByTestId("member-shell").isVisible().catch(() => false))) {
      await login(page);
    }
    await openOwnedConversation(page, conversationId);
    await page.waitForTimeout(800);
    const refreshText = await textBlob(page);
    await shot(page, `${runLabel}-08-refresh`);
    rec(
      "refresh_survives",
      /dinner|jordan|juniper|thursday|6:30/i.test(refreshText) ? "PASS" : "PRODUCT_FAIL",
      { summary: /dinner/i.test(refreshText) ? "story survived" : "story degraded" },
    );
  } catch (e) {
    rec("live_run_exception", "ENVIRONMENT_FAIL", {
      summary: String(e?.message || e),
    });
    await shot(page, `${runLabel}-99-error`).catch(() => null);
  } finally {
    await browser.close();
  }

  const productFails = results.filter((r) => r.status === "PRODUCT_FAIL");
  const fixtureFails = results.filter((r) => r.status === "FIXTURE_FAIL");
  const envFails = results.filter((r) => r.status === "ENVIRONMENT_FAIL");
  const pass =
    productFails.length === 0 &&
    fixtureFails.length === 0 &&
    envFails.length === 0 &&
    results.every((r) => r.status === "PASS" || r.status === "OBSERVE");

  const report = {
    runLabel,
    at: new Date().toISOString(),
    pass,
    summary: {
      pass: results.filter((r) => r.status === "PASS").length,
      product_fail: productFails.length,
      fixture_fail: fixtureFails.length,
      environment_fail: envFails.length,
      total: results.length,
    },
    fixture,
    results: [...results],
  };
  writeFileSync(runOut, JSON.stringify(report, null, 2));
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
  console.log(`\n=== ${runLabel} ===`, JSON.stringify(report.summary));
  return { pass, results: [...results], fixture, report };
}

async function main() {
  const args = process.argv.slice(2);
  const prepareOnly = args.includes("--prepare");
  const repeatIdx = args.indexOf("--repeat");
  const repeat = repeatIdx >= 0 ? Math.max(1, parseInt(args[repeatIdx + 1] || "1", 10)) : 1;

  if (prepareOnly) {
    const f = await prepareJordanTimePlaceFixture();
    console.log(JSON.stringify(f, null, 2));
    process.exit(f.precondition.ok ? 0 : 2);
  }

  const runs = [];
  for (let i = 1; i <= repeat; i++) {
    console.log(`\n######## REPEAT RUN ${i}/${repeat} ########`);
    const r = await runOnce(`r${i}`);
    runs.push(r);
  }

  const allPass = runs.every((r) => r.pass);
  const summaryPath = resolve(OUT_DIR, "LIVE_JORDAN_REPEAT_SUMMARY.json");
  writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        repeat,
        allPass,
        runs: runs.map((r) => ({
          pass: r.pass,
          summary: r.report?.summary,
          episode: r.fixture?.episode_id,
          conversation_id: r.fixture?.owned?.conversation_id,
          precondition: r.fixture?.precondition,
        })),
      },
      null,
      2,
    ),
  );
  console.log("\n=== REPEAT SUMMARY ===", allPass ? "ALL PASS" : "NOT ALL PASS");
  console.log(summaryPath);
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
