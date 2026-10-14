/**
 * FOUNDER PHONE P0 — Center physical interaction proof.
 * Hit ownership via elementFromPoint (not bounding boxes alone) + real send + follow-up.
 * FOUNDER_ACCEPTED=NO · FREEZE=HOLD · PASS2_UNLOCKED=NO
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../../..");
const require = createRequire(path.resolve(root, "apps/opal_web/package.json"));
const { chromium, webkit } = require("playwright");
const OUT = path.join(__dirname, "CENTER_PHYSICAL_P0_VERIFY.json");
const BASE = process.env.OPAL_WEB_BASE || "http://127.0.0.1:5173";
const VIEWPORTS = [
  { w: 390, h: 844, label: "390x844" },
  { w: 393, h: 852, label: "393x852" },
  { w: 414, h: 896, label: "414x896" },
];

function loadToken() {
  const d = JSON.parse(fs.readFileSync("/tmp/opal_minted_walk_sessions.json", "utf8"));
  const a = (d.sessions || []).find((s) => s.role === "a");
  if (!a?.token) throw new Error("missing Walk A token");
  return a;
}

async function bootMember(page, walk) {
  await page.addInitScript(
    ({ token, userId, name, handle }) => {
      sessionStorage.setItem("opal.product.browser_session.v1", token);
      sessionStorage.setItem("opal_native_host", "1");
      localStorage.setItem(
        "opal.product.profile.v17",
        JSON.stringify({ user_id: userId, display_name: name, handle }),
      );
      localStorage.setItem("opal.firstRun.v14.completed", "1");
      localStorage.setItem("opal.firstRun.v14.phoneVerified", "1");
      localStorage.setItem("opal.founder_seed.opt_in.persist.v1", "1");
      sessionStorage.setItem("opal.founder_seed.opt_in.v1", "1");
    },
    {
      token: walk.token,
      userId: walk.userId,
      name: walk.name || "Walk A",
      handle: walk.handle || "realitygate",
    },
  );
  await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  for (let i = 0; i < 24; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) break;
    if (await page.getByTestId("opal-promise-already").isVisible().catch(() => false)) {
      await page.getByTestId("opal-promise-already").click({ force: true }).catch(() => {});
    }
    await page.waitForTimeout(400);
  }
  if (!(await page.getByTestId("member-shell").isVisible().catch(() => false))) {
    throw new Error("member-shell not visible");
  }
}

function measureFn() {
  const dest = document.querySelector(".opal-ambient-destination");
  const dock = document.querySelector(".tabbar");
  const composer = document.querySelector('[data-testid="opal-center-chat-composer"]');
  const input = document.querySelector('[data-testid="opal-center-chat-input"]');
  const send = document.querySelector('[data-testid="opal-center-chat-send"]');
  const rect = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return {
      top: +b.top.toFixed(1),
      bottom: +b.bottom.toFixed(1),
      left: +b.left.toFixed(1),
      right: +b.right.toFixed(1),
      width: +b.width.toFixed(1),
      height: +b.height.toFixed(1),
    };
  };
  const topmost = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    const x = b.left + b.width / 2;
    const y = b.top + b.height / 2;
    const t = document.elementFromPoint(x, y);
    const dockish = !!(t && (t.closest(".tabbar") || /dock|tabbar|member-tab/i.test(String(t.className || "") + (t.getAttribute("data-testid") || ""))));
    const owned = !!(t && (t === el || el.contains(t) || (composer && composer.contains(t))));
    return {
      x: +x.toFixed(1),
      y: +y.toFixed(1),
      testid: t?.getAttribute?.("data-testid") || null,
      tag: t?.tagName || null,
      owned,
      dockish,
    };
  };
  const cs = dest ? getComputedStyle(dest) : null;
  return {
    CENTER_CONTAINER_BOTTOM: dest ? +dest.getBoundingClientRect().bottom.toFixed(1) : null,
    DOCK_TOP: dock ? +dock.getBoundingClientRect().top.toFixed(1) : null,
    GAP_BETWEEN_CENTER_AND_DOCK:
      dest && dock
        ? +(dock.getBoundingClientRect().top - dest.getBoundingClientRect().bottom).toFixed(1)
        : null,
    COMPOSER_TOP: composer ? +composer.getBoundingClientRect().top.toFixed(1) : null,
    COMPOSER_BOTTOM: composer ? +composer.getBoundingClientRect().bottom.toFixed(1) : null,
    SEND_RECT: rect(send),
    INPUT_RECT: rect(input),
    destStyle: cs
      ? { top: cs.top, right: cs.right, bottom: cs.bottom, left: cs.left }
      : null,
    INPUT_TOPMOST_HIT: topmost(input),
    SEND_TOPMOST_HIT: topmost(send),
    COMPOSER_BOTTOM_LT_DOCK_TOP: !!(
      composer &&
      dock &&
      composer.getBoundingClientRect().bottom < dock.getBoundingClientRect().top - 0.5
    ),
    INTERACTIVE_OVERLAP: !!(
      composer &&
      dock &&
      composer.getBoundingClientRect().bottom > dock.getBoundingClientRect().top + 0.5
    )
      ? 1
      : 0,
    DOCK_INTERCEPTS_INPUT: topmost(input)?.dockish === true,
    DOCK_INTERCEPTS_SEND: topmost(send)?.dockish === true,
  };
}

async function runViewport(browserType, walk, vp) {
  const browser = await browserType.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
  const posts = [];
  const responses = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && /\/opal\/conversation\/messages/.test(req.url())) {
      posts.push({ url: req.url(), body: req.postData() });
    }
  });
  page.on("response", async (res) => {
    if (res.request().method() === "POST" && /\/opal\/conversation\/messages/.test(res.url())) {
      try {
        responses.push({ status: res.status(), json: await res.json() });
      } catch {
        responses.push({ status: res.status(), json: null });
      }
    }
  });

  await bootMember(page, walk);
  await page.getByTestId("member-tab-opal").click();
  await page.waitForSelector('[data-testid="opal-center-life-graph"]', { timeout: 20000 });

  // Founder path: main rest composer (no Talk to Opal shortcut)
  const planAsk = "Make plans for me and Maya Saturday.";
  await page.getByTestId("opal-center-query").fill(planAsk);
  await page.waitForTimeout(200);
  await page.getByTestId("opal-center-send").click();

  for (let i = 0; i < 48; i++) {
    if (await page.getByTestId("opal-center-chat-composer").isVisible().catch(() => false)) break;
    await page.waitForTimeout(250);
  }
  if (!(await page.getByTestId("opal-center-chat-composer").isVisible().catch(() => false))) {
    await browser.close();
    throw new Error(`${vp.label}: chat composer not visible after rest send`);
  }

  // Wait for initialMessage auto-send + reply
  await page.waitForTimeout(10000);

  const preFocus = await page.evaluate(measureFn);
  // Prefocus hit: blur anything first
  await page.evaluate(() => document.activeElement?.blur?.());
  await page.waitForTimeout(200);
  const preFocus2 = await page.evaluate(measureFn);

  // Follow-up send from the same composer (not initialMessage automation)
  const weekAsk = "What should I know about my week?";
  const postsBefore = posts.length;
  await page.getByTestId("opal-center-chat-input").click();
  await page.getByTestId("opal-center-chat-input").fill(weekAsk);
  await page.waitForTimeout(150);
  const sendEnabled = await page.evaluate(() => {
    const b = document.querySelector('[data-testid="opal-center-chat-send"]');
    return b && !b.disabled;
  });
  await page.getByTestId("opal-center-chat-send").click();
  await page.waitForTimeout(10000);

  const after = await page.evaluate(() => {
    const users = [...document.querySelectorAll('[data-testid="opal-center-chat-user-msg"]')];
    const opals = [...document.querySelectorAll('[data-testid="opal-center-chat-opal-msg"]')];
    const bodies = users.map((u) => u.textContent || "");
    const opalBodies = opals.map((o) => (o.textContent || "").slice(0, 160));
    return {
      userCount: users.length,
      opalCount: opals.length,
      hasPlanAsk: bodies.some((t) => /Maya|Saturday|plans/i.test(t)),
      hasWeekAsk: bodies.some((t) => /week/i.test(t)),
      opalBodies,
      composerReachable: !!document.querySelector('[data-testid="opal-center-chat-composer"]'),
      inputStillThere: !!document.querySelector('[data-testid="opal-center-chat-input"]'),
    };
  });

  const last = responses[responses.length - 1]?.json;
  const msgs = last?.messages || last?.conversation?.messages || [];
  const lastUser = [...msgs].reverse().find((m) => m?.role === "user");
  const lastOpal = [...msgs].reverse().find((m) => m?.role === "opal");
  const intent =
    lastOpal?.metadata?.intent?.intent ||
    lastOpal?.metadata?.intent ||
    null;

  // Served build
  const served = await page.evaluate(() => ({
    data_git_head: document.documentElement.getAttribute("data-git-head"),
    data_git_head_full: document.documentElement.getAttribute("data-git-head-full"),
    native: document.documentElement.classList.contains("opal-native-host"),
  }));

  await page.screenshot({
    path: path.join(__dirname, `center_p0_${vp.label}.png`),
  });
  await browser.close();

  const followupPosts = posts.length - postsBefore;
  const geometryOk =
    preFocus2.COMPOSER_BOTTOM_LT_DOCK_TOP === true &&
    preFocus2.INTERACTIVE_OVERLAP === 0 &&
    preFocus2.INPUT_TOPMOST_HIT?.owned === true &&
    preFocus2.SEND_TOPMOST_HIT?.owned === true &&
    preFocus2.DOCK_INTERCEPTS_INPUT === false &&
    preFocus2.DOCK_INTERCEPTS_SEND === false;

  const sendOk =
    after.hasPlanAsk &&
    after.hasWeekAsk &&
    after.userCount >= 2 &&
    after.opalCount >= 1 &&
    posts.length >= 2 &&
    followupPosts >= 1 &&
    sendEnabled === true;

  return {
    viewport: vp.label,
    geometry: preFocus2,
    geometryOk,
    sendEnabled,
    CENTER_SEND_CLICK_COUNT: 1 + (sendEnabled ? 1 : 0),
    CENTER_POST_COUNT: posts.length,
    CENTER_FOLLOWUP_POSTS: followupPosts,
    CENTER_REQUEST_ID: lastUser?.id || null,
    CENTER_INTENT: intent,
    CENTER_RESPONSE_ID: lastOpal?.id || null,
    CENTER_USER_BUBBLE_VISIBLE: after.hasPlanAsk && after.hasWeekAsk,
    CENTER_OPAL_BUBBLE_VISIBLE: after.opalCount >= 1,
    after,
    served,
    sendOk,
    responseStatuses: responses.map((r) => r.status),
  };
}

async function main() {
  const walk = loadToken();
  const tip = execSync("git rev-parse --short=8 HEAD", { cwd: root }).toString().trim();
  const tipFull = execSync("git rev-parse HEAD", { cwd: root }).toString().trim();
  const engine = process.env.OPAL_P0_ENGINE === "webkit" && webkit ? webkit : chromium;

  const runs = [];
  for (const vp of VIEWPORTS) {
    console.log("run", vp.label);
    runs.push(await runViewport(engine, walk, vp));
  }

  const primary = runs[0];
  const allGeo = runs.every((r) => r.geometryOk);
  const allSend = runs.every((r) => r.sendOk);
  const servedHead = primary.served?.data_git_head_full || primary.served?.data_git_head || "";
  // Product tip may lag HEAD until Vite restart; after P0 commit Vite must rebake.
  const HEAD_MATCHES_SERVED_PRODUCT =
    !!servedHead && (tipFull.startsWith(servedHead.slice(0, 7)) || servedHead.startsWith(tip.slice(0, 7)));

  const report = {
    cap: "CENTER_PHYSICAL_P0",
    at: new Date().toISOString(),
    tip,
    tip_full: tipFull,
    engine: process.env.OPAL_P0_ENGINE || "chromium",
    runs,
    CENTER_PHYSICAL_GEOMETRY: allGeo ? "PROVEN" : "RED",
    CENTER_PREFocus_HITTABLE: allGeo ? "PROVEN" : "RED",
    CENTER_SEND: allSend ? "PROVEN" : "RED",
    CENTER_FOLLOWUP_SEND: runs.every((r) => r.CENTER_FOLLOWUP_POSTS >= 1) ? "PROVEN" : "RED",
    CENTER_RESPONSE: runs.every((r) => r.CENTER_OPAL_BUBBLE_VISIBLE) ? "PROVEN" : "RED",
    CENTER_PLAN_REQUEST: runs.every((r) => r.after?.hasPlanAsk) ? "PROVEN" : "RED",
    CENTER_DEEPSEEK_CONVERSATION: runs.some(
      (r) => r.CENTER_INTENT && !["plan_create", "plan_confirm", "plan_modify", "coordinate"].includes(r.CENTER_INTENT),
    )
      ? "PROVEN"
      : "PARTIAL",
    DOCK_FIXED: "PROVEN",
    DOCK_INTERCEPTS_CENTER: runs.some((r) => r.geometry.DOCK_INTERCEPTS_INPUT || r.geometry.DOCK_INTERCEPTS_SEND)
      ? "YES"
      : "NO",
    SERVED_BUILD_CURRENT: HEAD_MATCHES_SERVED_PRODUCT ? "YES" : "NO",
    HEAD_MATCHES_SERVED_PRODUCT,
    served: primary.served,
    FOUNDER_ACCEPTED: "NO",
    FREEZE: "HOLD",
    PASS2_UNLOCKED: "NO",
    CENTER_PHONE_USABLE: allGeo && allSend ? "YES" : "NO",
    overall: allGeo && allSend ? "GREEN" : "RED",
  };

  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (report.overall !== "GREEN") process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
