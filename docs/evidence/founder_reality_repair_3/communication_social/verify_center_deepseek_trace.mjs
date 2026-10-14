/**
 * Repair #4 evidence — correlate one Center request with DeepSeek draft.
 * Non-side-effect prompt: "What should I know about my week?"
 * Captures center_request_id → opal_intent → llm_provider/model → draft_source → reply.
 * Never prints API keys or private prompt context.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../../..");
const require = createRequire(path.resolve(root, "apps/opal_web/package.json"));
const { chromium } = require("playwright");
const OUT = path.join(__dirname, "CENTER_REAL_REQUEST_DEEPSEEK_TRACE.json");
const BASE = process.env.OPAL_WEB_BASE || "http://127.0.0.1:5173";
const API = process.env.OPAL_API_BASE || "http://127.0.0.1:4000";
const PROMPT = "What should I know about my week?";

function loadToken() {
  const p = "/tmp/opal_minted_walk_sessions.json";
  const d = JSON.parse(fs.readFileSync(p, "utf8"));
  const a = (d.sessions || []).find((s) => s.role === "a");
  if (!a?.token) throw new Error("missing Walk A token");
  return a;
}

async function main() {
  const walk = loadToken();
  const tip = execSync("git rev-parse --short=8 HEAD", { cwd: root }).toString().trim();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
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
        const json = await res.json();
        responses.push({ status: res.status(), json });
      } catch {
        responses.push({ status: res.status(), json: null });
      }
    }
  });

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
      name: walk.name || "Founder",
      handle: walk.handle || "realitygate",
    },
  );

  await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  for (let i = 0; i < 16; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) break;
    if (await page.getByTestId("opal-promise-already").isVisible().catch(() => false)) {
      await page.getByTestId("opal-promise-already").click({ force: true }).catch(() => {});
    }
    await page.waitForTimeout(400);
  }
  if (!(await page.getByTestId("member-shell").isVisible().catch(() => false))) {
    throw new Error("member-shell not visible");
  }

  await page.click('[data-testid="member-tab-opal"]');
  await page.waitForSelector('[data-testid="opal-center-life-graph"]', { timeout: 20000 });

  await page.getByTestId("opal-center-query").fill(PROMPT);
  await page.waitForTimeout(300);
  await page.getByTestId("opal-center-send").click();

  for (let i = 0; i < 40; i++) {
    const phase = await page
      .getByTestId("opal-center-life-graph")
      .getAttribute("data-center-phase")
      .catch(() => null);
    if (phase === "chat") break;
    if (await page.getByTestId("opal-center-chat").isVisible().catch(() => false)) break;
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(12000);

  const chatVisible = await page.getByTestId("opal-center-chat").isVisible().catch(() => false);
  const bodyText = chatVisible
    ? await page.getByTestId("opal-center-chat").innerText()
    : "";

  // Prefer response payload metadata; fall back to API list of latest opal message.
  let center_request_id = null;
  let response_id = null;
  let opal_intent = null;
  let draft_source = null;
  let llm_provider = null;
  let model = null;
  let llm_called = null;
  let rendered = null;

  const last = responses[responses.length - 1]?.json;
  const messages = last?.messages || last?.conversation?.messages || last?.data?.messages || [];
  const opalMsg = [...messages].reverse().find((m) => m?.role === "opal");
  const userMsg = [...messages].reverse().find((m) => m?.role === "user" && m?.body === PROMPT);

  if (userMsg?.id) center_request_id = userMsg.id;
  if (opalMsg) {
    response_id = opalMsg.id || null;
    rendered = (opalMsg.body || "").slice(0, 280);
    const meta = opalMsg.metadata || {};
    opal_intent = meta.intent?.intent || meta.intent || null;
    draft_source = meta.draft_source || null;
    llm_provider = meta.llm_provider || null;
    model = meta.model || null;
    llm_called = meta.llm_called ?? null;
  }

  // If FE response shape omits metadata, fetch conversation via API.
  if (!draft_source || !center_request_id) {
    try {
      const convRes = await fetch(`${API}/api/opal/conversation`, {
        headers: {
          Authorization: `Bearer ${walk.token}`,
          Accept: "application/json",
        },
      });
      const conv = await convRes.json();
      const msgs = conv?.messages || conv?.conversation?.messages || [];
      const u = [...msgs].reverse().find((m) => m?.role === "user" && m?.body === PROMPT);
      const o = u
        ? msgs.find(
            (m, i) =>
              m?.role === "opal" &&
              msgs[i - 1]?.id === u.id,
          ) ||
          [...msgs].reverse().find((m) => m?.role === "opal")
        : [...msgs].reverse().find((m) => m?.role === "opal");
      if (u?.id) center_request_id = u.id;
      if (o) {
        response_id = o.id || response_id;
        rendered = (o.body || rendered || "").slice(0, 280);
        const meta = o.metadata || {};
        opal_intent = meta.intent?.intent || meta.intent || opal_intent;
        draft_source = meta.draft_source || draft_source;
        llm_provider = meta.llm_provider || llm_provider;
        model = meta.model || model;
        llm_called = meta.llm_called ?? llm_called;
      }
    } catch (e) {
      console.error("api_fallback_failed", String(e).slice(0, 120));
    }
  }

  const paintedHasPrompt = bodyText.includes("week") || bodyText.includes(PROMPT.slice(0, 20));
  const correlated =
    !!center_request_id &&
    !!response_id &&
    llm_called === true &&
    draft_source === "llm" &&
    llm_provider === "deepseek" &&
    typeof model === "string" &&
    model.includes("deepseek");

  const report = {
    cap: "CENTER_REAL_REQUEST_DEEPSEEK_TRACE",
    at: new Date().toISOString(),
    tip_at_run: tip,
    product_tip: "84008a97",
    prompt: PROMPT,
    center_request_id,
    opal_intent,
    llm_provider,
    model,
    llm_called,
    draft_source,
    response_id,
    rendered_reply_excerpt: rendered,
    posts: posts.length,
    chat_visible: chatVisible,
    painted_has_week_ask: paintedHasPrompt,
    correlated,
    notes: [
      "No API key or private prompt context printed",
      "plan_create/confirm/modify/coordinate remain template-controlled",
      "check_status/chat/recommend may draft via LlmRespond when ready",
    ],
    FOUNDER_ACCEPTED: "NO",
    FREEZE: "HOLD",
    PASS2_UNLOCKED: "NO",
  };

  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (!correlated) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
