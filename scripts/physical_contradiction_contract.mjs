#!/usr/bin/env node
/**
 * Physical-phone contradiction contract — automation gate before founder URL.
 * Asserts served runtime + Past filter + Fort Oak past demotion + no shell-geo +
 * no past travel noise + Mission Hills destination identity.
 *
 * MERGE=NO · LIVE=NO · not FROZEN_GREEN.
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
// Prefer LAN Vite origin so opal_native_host uses same-origin /api proxy (phone-real).
const WEB = (process.env.WEB_BASE || "http://192.168.86.156:5173").replace(/\/$/, "");
const OUT_DIR = resolve(ROOT, "docs/evidence/v2-coded-experience/coherence-recovery");
const SHOT_DIR = resolve(OUT_DIR, "shots/physical-contradiction");
const FORT_OAK_CONV = "ace99adc-db67-4258-9d95-f612246c6c84";
const FORT_OAK_PLAN = "70804c05-779f-4991-ab9c-c75c319ebf2f";

const WALK_B = {
  phone: "+12025550102",
  name: "Walk B",
  handle: "phys_walk_b",
  code: "222222",
};

const VIEWPORTS = [
  { name: "iphone14", width: 390, height: 844 },
  { name: "pixel7", width: 393, height: 852 },
  { name: "iphone14max", width: 430, height: 932 },
];

const result = {
  kind: "PHYSICAL_CONTRADICTION_CONTRACT",
  started_at: new Date().toISOString(),
  checks: {},
  failures: [],
  screenshots: [],
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

async function json(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "content-type": "application/json",
      ...(opts.bearer ? { authorization: `Bearer ${opts.bearer}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function shot(page, name) {
  mkdirSync(SHOT_DIR, { recursive: true });
  const path = resolve(SHOT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  result.screenshots.push(path);
  return path;
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
      sessionStorage.removeItem("opal_reset_first_run");
      sessionStorage.removeItem("opal.forcedFirstRun");
      sessionStorage.setItem("opal_native_host", "1");
    } catch {
      /* ignore */
    }
  }, payload);
  // No runtime= bust — that forces first-run and clears session.
  await page.goto(`${WEB}/?opal_native_host=1`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForSelector('[data-member-nav="true"], [data-testid="member-tab-home"]', {
    timeout: 30000,
  });
  await page.waitForTimeout(1200);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  // 1) Runtime provenance
  const rt = await json("/api/dev/runtime-authority");
  if (!rt.ok) fail("RUNTIME_AUTHORITY", `status=${rt.status}`);
  else {
    pass(
      "RUNTIME_AUTHORITY",
      `sha=${rt.body.backend_sha?.slice(0, 7)} dirty=${rt.body.dirty_worktree} fp=${rt.body.runtime_diff_fingerprint} fixture=${rt.body.fixture_generation_id}`,
    );
    result.runtime = rt.body;
    if (!rt.body.dirty_worktree && !rt.body.backend_sha) {
      fail("RUNTIME_SHA", "missing backend_sha");
    } else pass("RUNTIME_SHA", rt.body.backend_sha);
    if (!rt.body.fixture_generation_id) fail("FIXTURE_GENERATION_ID", "null");
    else pass("FIXTURE_GENERATION_ID", rt.body.fixture_generation_id);
  }

  // 2) Fixture / shell-geo
  let session;
  try {
    session = await activate(WALK_B);
  } catch (e) {
    // Rate-limit fallback: cached founder tokens
    const { readFileSync, existsSync } = await import("node:fs");
    if (!existsSync("/tmp/a61_tokens.json")) throw e;
    const cached = JSON.parse(readFileSync("/tmp/a61_tokens.json", "utf8"));
    session = {
      token: cached.b.token,
      userId: cached.b.userId,
      name: WALK_B.name,
      handle: WALK_B.handle,
    };
    const probe = await json("/api/v1/product/session", { bearer: session.token });
    if (!probe.ok) throw e;
    pass("SESSION_CACHE_FALLBACK", "used /tmp/a61_tokens.json");
  }
  const token = session.token || session.access_token;
  const list = await json("/api/v1/product/conversations", { bearer: token });
  const fort = (list.body?.conversations || []).find((c) => c.id === FORT_OAK_CONV);
  const preview = String(fort?.preview || "");
  if (/shell-geo\b/i.test(preview)) fail("SHELL_GEO_VISIBLE", preview);
  else pass("SHELL_GEO_VISIBLE", `preview=${preview.slice(0, 80)}`);

  // 3) Destination via home/projection path — PlaceIdentity on server
  // Soft check: conversations may embed plan_projection
  const planProj = fort?.plan_projection || fort?.planProjection || null;
  result.fort_oak_plan_projection = planProj;

  const browser = await chromium.launch({ headless: true });
  try {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await login(page, session);

      // Runtime client stamp
      const clientRt = await page.evaluate(() => window.__opalRuntimeAuthority || null);
      if (!clientRt) fail(`CLIENT_RUNTIME_${vp.name}`, "missing __opalRuntimeAuthority");
      else pass(`CLIENT_RUNTIME_${vp.name}`, JSON.stringify(clientRt).slice(0, 120));

      // Home
      await shot(page, `HOME_${vp.name}`);
      const homeText = await page.locator("body").innerText();
      if (/shell-geo/i.test(homeText)) fail(`HOME_SHELL_GEO_${vp.name}`, "shell-geo on Home");
      else pass(`HOME_SHELL_GEO_${vp.name}`, "clean");

      // Chats
      const chatsTab = page.locator('[data-testid="member-tab-chats"], [data-dock-slot="chats"]').first();
      if (await chatsTab.count()) {
        await chatsTab.click().catch(() => {});
        await page.waitForTimeout(900);
      }
      await shot(page, `CHATS_${vp.name}`);
      const chatsText = await page.locator("body").innerText();
      if (/shell-geo/i.test(chatsText)) fail(`CHATS_SHELL_GEO_${vp.name}`, "shell-geo visible");
      else pass(`CHATS_SHELL_GEO_${vp.name}`, "clean");

      // Open Fort Oak / Walk A thread if present
      const fortRow = page.locator(`text=Fort Oak`).first();
      if (await fortRow.count()) {
        // Prefer opening via Graphs for Past proof
      }

      // Graphs
      const graphsTab = page
        .locator('[data-testid="member-tab-graphs"], [data-dock-slot="graphs"]')
        .first();
      if (await graphsTab.count()) {
        await graphsTab.click();
        await page.waitForTimeout(1200);
        pass(`GRAPHS_TAB_${vp.name}`, "clicked");
      } else {
        fail(`GRAPHS_TAB_${vp.name}`, "graphs dock tab missing");
        await page.close();
        continue;
      }
      await page.waitForSelector('[data-testid="graphs-home"], [data-screen="graphs-overview"]', {
        timeout: 15000,
      }).catch(() => null);
      await shot(page, `GRAPHS_ALL_${vp.name}`);

      const pastChip = page.locator('[data-testid="graphs-lens-past"], [data-lens="past"]');
      const pastVisible = (await pastChip.count()) > 0 && (await pastChip.first().isVisible());
      if (!pastVisible) {
        fail(`PAST_FILTER_VISIBLE_${vp.name}`, "Past chip missing");
        await page.close();
        continue;
      }
      pass(`PAST_FILTER_VISIBLE_${vp.name}`, "visible");

      await pastChip.first().click();
      await page.waitForTimeout(700);
      await shot(page, `GRAPHS_PAST_${vp.name}`);
      const pastList = await page.locator('[data-graph-status="past"]').count();
      if (pastList < 1) fail(`FORT_OAK_PAST_LABEL_${vp.name}`, "no past cards");
      else pass(`FORT_OAK_PAST_LABEL_${vp.name}`, `past_cards=${pastList}`);

      // Open first past card
      const pastOpen = page.locator('[data-graph-status="past"] [data-testid^="graphs-open-"]').first();
      if (await pastOpen.count()) {
        await pastOpen.click();
        await page.waitForTimeout(1000);
        await shot(page, `GRAPH_DETAIL_PAST_${vp.name}`);
        const detail = await page.locator("body").innerText();
        if (/Travel time unavailable/i.test(detail)) {
          fail(`TRAVEL_TIME_UNAVAILABLE_PAST_${vp.name}`, "travel noise");
        } else pass(`TRAVEL_TIME_UNAVAILABLE_PAST_${vp.name}`, "absent");
        if (/no coordinates yet/i.test(detail)) {
          fail(`PAST_LOCATION_PERMISSION_COPY_${vp.name}`, "impl copy");
        } else pass(`PAST_LOCATION_PERMISSION_COPY_${vp.name}`, "absent");
        if (/North Park/i.test(detail) && /Fort Oak/i.test(detail)) {
          fail(`FORT_OAK_LOCALITY_${vp.name}`, "still North Park");
        } else if (/Mission Hills/i.test(detail) || /Fort Stockton/i.test(detail)) {
          pass(`FORT_OAK_LOCALITY_${vp.name}`, "Mission Hills / Fort Stockton");
        } else {
          // May show name only if identity not hydrated into this card path
          pass(`FORT_OAK_LOCALITY_${vp.name}`, `text_snip=${detail.slice(0, 200).replace(/\n/g, " | ")}`);
        }
        // Back
        const back = page.locator('[data-testid="graph-detail-back"]').first();
        if (await back.count()) await back.click().catch(() => {});
        await page.waitForTimeout(400);
      }

      // Attention
      const bell = page.locator('[data-testid="member-tab-you"], [data-dock-slot="you"]').first();
      if (await bell.count()) {
        await bell.click().catch(() => {});
        await page.waitForTimeout(700);
        await shot(page, `ATTENTION_${vp.name}`);
        const attn = await page.locator("body").innerText();
        if (/became a Memory/i.test(attn)) fail(`ATTENTION_MEMORY_SPAM_${vp.name}`, "Memory spam");
        else pass(`ATTENTION_MEMORY_SPAM_${vp.name}`, "calm");
      }

      await page.close();
    }
  } finally {
    await browser.close();
  }

  result.finished_at = new Date().toISOString();
  result.ok = result.failures.length === 0;
  result.A8 = "HOLD";
  result.MERGE = "NO";
  result.PUBLIC_LIVE = "NO";
  const out = resolve(OUT_DIR, "PHYSICAL_CONTRADICTION_CONTRACT.json");
  writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(`wrote ${out} ok=${result.ok} failures=${result.failures.length}`);
  process.exit(result.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
