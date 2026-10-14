/**
 * LIVE_* caps — normal-user Live journey against Paste K Lives backend.
 * Caps: LIVE_NORMAL_USER_START · LIVE_ACTIVE_STATE · LIVE_END · LIVE_OTHER_USER_FIXTURE
 *
 * Prefers minted Walk sessions (/tmp/opal_minted_walk_sessions.json).
 * Seeds other-user Live via mix run scripts/seed_other_user_live.exs when needed.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../../..");
const OUT = __dirname;
mkdirSync(OUT, { recursive: true });

const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
const { chromium } = require("playwright");

const API = process.env.OPAL_API_URL || "http://127.0.0.1:4000";
const WEB = process.env.OPAL_WEB_URL || "http://127.0.0.1:5173";

function loadMinted() {
  const p = process.env.OPAL_MINTED_SESSIONS_JSON || "/tmp/opal_minted_walk_sessions.json";
  if (!existsSync(p)) throw new Error(`missing minted sessions: ${p}`);
  const raw = JSON.parse(readFileSync(p, "utf8"));
  const sessions = raw.sessions || raw;
  const a = sessions.find((s) => s.role === "a" || s.handle === "realitygate") || sessions[0];
  const b = sessions.find((s) => s.role === "b" || s.handle === "s11_c_msy0uy9n") || sessions[1];
  if (!a?.token || !b?.token) throw new Error("minted Walk A/B tokens missing");
  return { a, b, path: p };
}

async function api(token, method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

function seedOtherUserLive() {
  const r = spawnSync(
    "mix",
    ["run", "../../scripts/seed_other_user_live.exs"],
    {
      cwd: join(ROOT, "apps/opal_core"),
      env: process.env,
      encoding: "utf8",
    },
  );
  return {
    status: r.status,
    stdout: (r.stdout || "").slice(-2000),
    stderr: (r.stderr || "").slice(-2000),
  };
}

const report = {
  caps: {},
  api: {},
  browser: {},
  story_gap: null,
  overall: "RED",
  PASS2_UNLOCKED: "NO",
  FREEZE: "HOLD",
};

try {
  const { a, b } = loadMinted();
  report.api.walk_a = a.user_id || a.userId;
  report.api.walk_b = b.user_id || b.userId;

  // End any Walk A active lives first (clean start; stale rooms can linger).
  for (let i = 0; i < 8; i++) {
    const mine0 = await api(a.token, "GET", "/api/v1/product/lives/mine");
    if (!mine0.json?.active || !mine0.json?.live_room?.id) break;
    await api(a.token, "POST", `/api/v1/product/lives/${mine0.json.live_room.id}/end`);
  }

  // LIVE_OTHER_USER_FIXTURE — Walk B live visible to Walk A
  const seed = seedOtherUserLive();
  report.api.seed_other_user = { status: seed.status, tail: seed.stdout.split("\n").slice(-8) };
  let fixture = null;
  if (existsSync("/tmp/opal_other_user_live.json")) {
    fixture = JSON.parse(readFileSync("/tmp/opal_other_user_live.json", "utf8"));
  }
  report.api.other_user_fixture = fixture;
  const visibleA = await api(a.token, "GET", "/api/v1/product/lives/visible");
  report.api.visible_for_a = {
    status: visibleA.status,
    count: visibleA.json?.count,
    hosts: (visibleA.json?.lives || []).map((row) => ({
      id: row.live_room?.id,
      host: row.live_room?.host_account_id,
      place: row.live_room?.place_label || row.live_room?.venue?.name,
      mine: row.live_room?.mine,
    })),
  };
  const otherVisible = (visibleA.json?.lives || []).some(
    (row) => row.live_room?.host_account_id === (b.user_id || b.userId),
  );
  report.caps.LIVE_OTHER_USER_FIXTURE = {
    ok: Boolean(fixture?.visible_to_walk_a || otherVisible),
    detail: fixture || report.api.visible_for_a,
  };

  // LIVE_NORMAL_USER_START — Walk A go-live with audience + precision
  const start = await api(a.token, "POST", "/api/v1/product/lives/go-live", {
    place_id: "test-maya-spot-san-diego",
    name: "Maya Spot",
    title: "Normal user Live proof",
    audience: "friends",
    location_precision: "venue",
  });
  report.api.start = { status: start.status, body: start.json };
  const liveId = start.json?.live_room?.id;
  report.caps.LIVE_NORMAL_USER_START = {
    ok: start.status === 201 && Boolean(liveId),
    live_id: liveId,
    consequence: start.json?.consequence,
    audience: start.json?.audience,
    location_precision: start.json?.location_precision,
  };

  // LIVE_ACTIVE_STATE
  const mine = await api(a.token, "GET", "/api/v1/product/lives/mine");
  const show = liveId ? await api(a.token, "GET", `/api/v1/product/lives/${liveId}`) : null;
  report.api.mine = mine.json;
  report.api.show = show?.json;
  report.caps.LIVE_ACTIVE_STATE = {
    ok:
      mine.json?.active === true &&
      mine.json?.live_room?.status === "live" &&
      show?.json?.live_room?.status === "live",
    mine_active: mine.json?.active,
    status: mine.json?.live_room?.status,
  };

  // Browser: YOU → Go live overlay → active pill (member shell)
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.addInitScript((tok) => {
      sessionStorage.setItem("opal.product.browser_session.v1", tok);
      localStorage.setItem("opal.firstRun.v14.completed", "1");
      localStorage.setItem("opal.founder_seed.opt_in.v1", "1");
      localStorage.setItem("opal.founder_seed.opt_in.persist.v1", "1");
      localStorage.setItem(
        "opal.product.profile.v17",
        JSON.stringify({
          user_id: "47aa5856-8c56-4b18-a4d4-6a9b456516a8",
          display_name: "Founder Review",
          handle: "founder_rev",
        }),
      );
    }, a.token);

    await page.goto(`${WEB}/?opal_founder_seed=1&opal_native_host=1`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.waitForSelector('[data-testid="member-shell"]', { timeout: 30000 }).catch(() => null);
    const youTab = page.getByTestId("member-tab-you");
    if (await youTab.isVisible().catch(() => false)) await youTab.click();
    await page.waitForSelector('[data-testid="you-go-live"]', { timeout: 15000 });
    report.browser.you_go_live = true;
    await page.getByTestId("you-go-live").click();
    await page.waitForSelector('[data-testid="lives-go-live-overlay"]', { timeout: 10000 });
    // Already live from API start → panel should show active state
    await page.waitForSelector('[data-testid="lives-active-pill"]', { timeout: 15000 });
    report.browser.active_pill = true;
    await page.screenshot({ path: join(OUT, "live_active_overlay.png"), fullPage: true });

    // Home should include other-user live card when hydrated
    await page.getByTestId("lives-go-live-overlay-close").click().catch(() => null);
    const homeTab = page.getByTestId("member-tab-home");
    if (await homeTab.isVisible().catch(() => false)) await homeTab.click();
    await page.waitForTimeout(1200);
    const homeHtml = await page.content();
    report.browser.home_has_live_room = /live-room-|gsh-card-live|LIVE/.test(homeHtml);
    await page.screenshot({ path: join(OUT, "live_home_after.png"), fullPage: true });

    // Story composer adjacent note
    const addStory = page.getByTestId("home-create-story").or(page.getByText(/Add story/i));
    report.story_gap = {
      add_story_visible: await addStory.first().isVisible().catch(() => false),
      note: "Story create is adjacent; Live prioritized. Broken story paths noted only.",
    };
  } finally {
    await browser.close();
  }

  // LIVE_END — end the Live we started; drain any residual host actives.
  const end = liveId
    ? await api(a.token, "POST", `/api/v1/product/lives/${liveId}/end`)
    : { status: 0, json: {} };
  report.api.end = { status: end.status, body: end.json };
  for (let i = 0; i < 8; i++) {
    const leftover = await api(a.token, "GET", "/api/v1/product/lives/mine");
    if (!leftover.json?.active || !leftover.json?.live_room?.id) break;
    await api(a.token, "POST", `/api/v1/product/lives/${leftover.json.live_room.id}/end`);
  }
  const mineAfter = await api(a.token, "GET", "/api/v1/product/lives/mine");
  const showAfter = liveId ? await api(a.token, "GET", `/api/v1/product/lives/${liveId}`) : null;
  report.api.mine_after_end = mineAfter.json;
  report.api.show_after_end = showAfter?.json;
  report.caps.LIVE_END = {
    ok:
      end.status === 200 &&
      end.json?.live_room?.status === "ended" &&
      showAfter?.json?.live_room?.status === "ended" &&
      mineAfter.json?.active === false,
    status: end.json?.live_room?.status,
    show_status: showAfter?.json?.live_room?.status,
    mine_active: mineAfter.json?.active,
  };

  const allOk = Object.values(report.caps).every((c) => c.ok);
  report.overall = allOk ? "GREEN" : "RED";
} catch (e) {
  report.error = String(e?.stack || e);
  report.overall = "RED";
}

writeFileSync(join(OUT, "LIVE_JOURNEY_VERIFY.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ overall: report.overall, caps: report.caps }, null, 2));
process.exit(report.overall === "GREEN" ? 0 : 1);
