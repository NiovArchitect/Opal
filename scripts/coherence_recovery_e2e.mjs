#!/usr/bin/env node
/**
 * Whole-app coherence recovery — founder-fixture E2E (automation).
 * CHECKPOINT proof — not FROZEN_GREEN / not founder phone GREEN.
 *
 * Asserts Fort Oak past gates across API + key UI surfaces for Walk A/B.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { activate } from "./founder_proof_fixture.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const API = (process.env.API_BASE || "http://127.0.0.1:4000").replace(/\/$/, "");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT_DIR = resolve(ROOT, "docs/evidence/v2-coded-experience/coherence-recovery");
const FORT_OAK_PLAN = "70804c05-779f-4991-ab9c-c75c319ebf2f";
const FORT_OAK_CONV = "ace99adc-db67-4258-9d95-f612246c6c84";

const WALK_A = {
  phone: "+12025550101",
  name: "Walk A",
  handle: "coherence_walk_a",
  code: "111111",
};
const WALK_B = {
  phone: "+12025550102",
  name: "Walk B",
  handle: "coherence_walk_b",
  code: "222222",
};

const result = {
  kind: "CHECKPOINT",
  frozen_green: false,
  a8_commit: false,
  started_at: new Date().toISOString(),
  checks: {},
  failures: [],
};

function check(name, ok, detail = "") {
  result.checks[name] = { ok: !!ok, detail: detail || undefined };
  if (!ok) result.failures.push({ name, detail });
}

async function apiGet(path, token) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  return { status: res.status, json, text };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const a = await activate(WALK_A);
  const b = await activate(WALK_B);
  check("login_walk_a", !!a?.token, a?.userId || "");
  check("login_walk_b", !!b?.token, b?.userId || "");

  // API alignment for Fort Oak conversation
  const alignA = await apiGet(
    `/api/v1/product/conversations/${FORT_OAK_CONV}/alignment`,
    a.token,
  );
  const alignment = alignA.json?.alignment || alignA.json?.data?.alignment || alignA.json;
  const temporal = alignment?.temporal_state;
  const nextTogether = alignment?.next_together_eligible;
  const upcomingReady = alignment?.upcoming_ready;
  const authorizable = alignment?.reservation_authorizable;
  const futureExec = alignment?.future_execution_actionable;

  check("api_alignment_status", alignA.status === 200, `status=${alignA.status}`);
  check("api_temporal_past", temporal === "past", `temporal_state=${temporal}`);
  check("api_next_together_0", nextTogether === false, `next_together_eligible=${nextTogether}`);
  check("api_upcoming_ready_0", upcomingReady === false || upcomingReady == null, `upcoming_ready=${upcomingReady}`);
  check("api_reservation_authorizable_0", authorizable === false || authorizable == null, `reservation_authorizable=${authorizable}`);
  check("api_future_exec_0", futureExec === false || futureExec == null, `future_execution_actionable=${futureExec}`);

  const { createRequire } = await import("node:module");
  const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
  const { chromium: pw } = require("playwright");
  const browser = await pw.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  await page.addInitScript((s) => {
    try {
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
      sessionStorage.removeItem("opal_reset_first_run");
    } catch {
      /* ignore */
    }
  }, { token: b.token, userId: b.userId, name: WALK_B.name, handle: WALK_B.handle });

  await page.goto(`${WEB}/?opal_native_host=1`, { waitUntil: "networkidle" }).catch(() => undefined);
  await page.waitForTimeout(1500);

  // Prefer opening Fort Oak chat if visible
  const fortOak = page.locator("text=Fort Oak").first();
  if (await fortOak.count()) {
    await fortOak.click({ timeout: 8000 }).catch(() => undefined);
    await page.waitForTimeout(1000);
  }

  const body = await page.locator("body").innerText().catch(() => "");
  const hasNextTogetherStrip = await page.locator('[data-testid="next-plan-strip"]').count();
  const nextTogetherText = hasNextTogetherStrip
    ? await page.locator('[data-testid="next-plan-strip"]').innerText().catch(() => "")
    : "";
  const approveVisible = await page.locator('[data-testid="alignment-reservation-authorize"]').count();

  // Past plan must not present as NEXT TOGETHER strip for Fort Oak
  const ntClaimsFortOak =
    /NEXT TOGETHER/i.test(nextTogetherText) && /Fort Oak/i.test(nextTogetherText);
  check("ui_past_not_next_together", !ntClaimsFortOak, nextTogetherText.slice(0, 120));
  check("ui_past_no_approve_reservation", approveVisible === 0, `approve_count=${approveVisible}`);

  // Residue filters
  check("ui_no_shell_geo_residue", !/shell-geo\b/i.test(body), "shell-geo in body");
  check("ui_no_p046gate_residue", !/P046gate/i.test(body), "P046gate in body");

  // Published Memory demo title should not dominate Home if we navigate home
  const homeTab = page.locator('[data-testid="dock-home"], button:has-text("Home")').first();
  if (await homeTab.count()) {
    await homeTab.click().catch(() => undefined);
    await page.waitForTimeout(800);
  }
  const homeText = await page.locator("body").innerText().catch(() => "");
  check(
    "ui_no_published_memory_demo_title",
    !/Published Memory from Opal Graph/i.test(homeText),
    "demo memory title visible",
  );

  await page.screenshot({
    path: resolve(OUT_DIR, "shots/coherence_walk_b_thread.png"),
    fullPage: true,
  }).catch(() => undefined);

  await browser.close();

  result.finished_at = new Date().toISOString();
  result.ok = result.failures.length === 0;
  result.plan_id = FORT_OAK_PLAN;
  result.conversation_id = FORT_OAK_CONV;
  result.summary = {
    PAST_PLAN_AS_NEXT_TOGETHER: ntClaimsFortOak ? 1 : 0,
    PAST_PLAN_FUTURE_EXECUTION_CTA: approveVisible > 0 ? 1 : 0,
    TEST_ARTIFACT_VISIBLE_SAMPLE: /shell-geo|P046gate/i.test(body) ? 1 : 0,
    PRIVATE_MEMORY_DEMO_TITLE_VISIBLE: /Published Memory from Opal Graph/i.test(homeText) ? 1 : 0,
  };

  writeFileSync(resolve(OUT_DIR, "COHERENCE_RECOVERY_E2E.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ok: result.ok, failures: result.failures, summary: result.summary }, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  result.failures.push({ name: "fatal", detail: String(err) });
  writeFileSync(resolve(OUT_DIR, "COHERENCE_RECOVERY_E2E.json"), JSON.stringify(result, null, 2));
  process.exit(1);
});
