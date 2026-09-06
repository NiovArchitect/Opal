/**
 * P4.4 — Global Opal one-tradeoff UI smoke (988:263).
 * Run: cd apps/opal_web && node scripts/prove_p44_low_ui_smoke.mjs
 * Does NOT screenshot/hotspot for visual gate — behavioral smoke only.
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const ROOT = "/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people";
const OUT = join(ROOT, "docs/evidence/v2-coded-experience/post-b7-p0-authority-sync/p4");
mkdirSync(OUT, { recursive: true });

const SHA = execSync("git rev-parse --short=7 HEAD", { cwd: ROOT }).toString().trim();
const BASE = `http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1&opal_low_demo=1&runtime=${SHA}`;

const proof = {
  square: "POST_B7_P4_4_LOW_UI_SMOKE",
  figma_authority: "988:263",
  short_sha: SHA,
  started_at: new Date().toISOString(),
  checks: {},
  flow: [],
};

function log(step, ok, extra = {}) {
  proof.flow.push({ step, ok: !!ok, ...extra });
  console.log(`${ok ? "OK" : "FAIL"} ${step}`, Object.keys(extra).length ? JSON.stringify(extra) : "");
}

async function boot(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('[data-testid="fr00-tap-begin"]').click({ timeout: 20000 });
  await page.locator('[data-testid="opal-promise-enter"]').click({ timeout: 15000 });
  await page.waitForSelector('[data-testid="fr06-skip-for-now"]', { timeout: 30000 });
  await page.locator('[data-testid="fr06-skip-for-now"]').click();
  await page.waitForSelector('[data-testid="fr08-profile"]', { timeout: 60000 });
  const name = page.locator('[data-testid="fr08-display-name"], input[autocomplete="name"]').first();
  if (await name.isVisible().catch(() => false)) await name.fill("Founder");
  await page.locator('[data-testid="fr08-continue"], button:has-text("Continue")').first().click();
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /Not now|Skip/i }).first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: /Not now|Skip/i }).first().click({ force: true }).catch(() => {});
  await page.waitForSelector('[data-testid="member-tab-home"]', { timeout: 45000 });
}

async function openOpal(page) {
  await page.locator('[data-testid="member-tab-opal"]').click({ force: true });
  await page.waitForSelector('[data-testid="opal-ambient"]', { timeout: 15000 });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

try {
  await boot(page);
  log("boot_home", true);
  await openOpal(page);
  log("open_opal", true);

  const lane = page.locator('[data-testid="opal-ideas-lane"][data-decision-mode="low"]');
  await lane.waitFor({ timeout: 10000 });
  const axis = await lane.getAttribute("data-tradeoff-axis");
  const auth = await lane.getAttribute("data-figma-authority");
  const noBlame = await lane.getAttribute("data-no-blame");
  proof.checks.tradeoff_axis = axis;
  proof.checks.figma_authority = auth;
  proof.checks.no_blame = noBlame;
  log("low_lane_visible", axis === "CLOSER_VS_MORE_SPECIAL" && auth === "988:263" && noBlame === "true", {
    axis,
    auth,
    noBlame,
  });

  const prompt = page.locator('[data-testid="opal-low-prompt"]');
  const promptText = (await prompt.textContent())?.trim();
  proof.checks.prompt = promptText;
  log("prompt_present", !!promptText);

  const closer = page.locator('[data-testid="opal-low-choice-closer"]');
  const special = page.locator('[data-testid="opal-low-choice-more_special"]');
  const choiceCount = await page.locator(".opal-low-choice").count();
  proof.checks.choice_count = choiceCount;
  log("exactly_two_choices", choiceCount === 2 && (await closer.isVisible()) && (await special.isVisible()), {
    choiceCount,
  });

  // Medium must not co-render
  const medium = await page.locator('[data-decision-mode="medium"]').count();
  proof.checks.medium_co_render = medium;
  log("no_medium_co_render", medium === 0);

  await closer.click();
  await page.waitForTimeout(400);
  const after = await page.locator('[data-decision-mode="low"]').count();
  proof.checks.tradeoff_closed_after_select = after === 0;
  log("select_closes_tradeoff", after === 0);

  const note = await page.locator('[data-testid="opal-ambient-note"]').textContent().catch(() => null);
  const softOnly = !!(note && /soft preference|Hard constraints|Recomputing/i.test(note));
  proof.checks.soft_only_copy = softOnly;
  proof.checks.note = note;
  log("soft_only_resolution_copy", softOnly, { note });

  proof.ok =
    proof.flow.every((f) => f.ok) &&
    proof.checks.choice_count === 2 &&
    proof.checks.figma_authority === "988:263";
} catch (e) {
  proof.ok = false;
  proof.error = String(e?.message || e);
  log("exception", false, { error: proof.error });
} finally {
  await browser.close();
}

proof.finished_at = new Date().toISOString();
const outPath = join(OUT, "P4_4_LOW_UI_SMOKE.json");
writeFileSync(outPath, JSON.stringify(proof, null, 2));
console.log("Wrote", outPath);
console.log(proof.ok ? "P4.4 UI SMOKE PASS" : "P4.4 UI SMOKE FAIL");
process.exit(proof.ok ? 0 : 1);
