/**
 * Repair #4 — Center one intelligence path (Playwright A: inject member shell).
 * Rest composer "Make plans…" must open OpalCenterChat and postOpalMessage,
 * not Decision Intelligence nearby_now.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../../..");
const require = createRequire(path.resolve(root, "apps/opal_web/package.json"));
const { chromium } = require("playwright");
const OUT = path.join(__dirname, "CENTER_ONE_PATH_VERIFY.json");
const BASE = process.env.OPAL_WEB_BASE || "http://127.0.0.1:5173";

function loadToken() {
  const p = "/tmp/opal_minted_walk_sessions.json";
  const d = JSON.parse(fs.readFileSync(p, "utf8"));
  const a = (d.sessions || []).find((s) => s.role === "a");
  if (!a?.token) throw new Error("missing Walk A token");
  return a;
}

async function main() {
  const walk = loadToken();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const posts = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && /\/opal\/conversation\/messages/.test(req.url())) {
      posts.push({ url: req.url(), body: req.postData() });
    }
  });

  await page.addInitScript(
    ({ token, userId, name, handle }) => {
      // Product session key is the raw bearer string (not a JSON blob).
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

  await page.getByTestId("opal-center-query").fill("Make plans for me and Maya Saturday.");
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

  // Allow hydrate + auto-send + Opal reply
  await page.waitForTimeout(8000);

  const chatVisible = await page.getByTestId("opal-center-chat").isVisible().catch(() => false);
  const bodyText = chatVisible
    ? await page.getByTestId("opal-center-chat").innerText()
    : "";
  const nearbyCard = await page.getByTestId("opal-center-conversation").count();
  const phaseAfter = await page
    .getByTestId("opal-center-life-graph")
    .getAttribute("data-center-phase")
    .catch(() => null);
  const posted = posts.length > 0;
  const planAsk =
    /Want me to set this up/i.test(bodyText) ||
    /Got it:/i.test(bodyText) ||
    /Maya/i.test(bodyText);

  const caps = {
    CENTER_ONE_INTELLIGENCE_PATH:
      (chatVisible || phaseAfter === "chat") && nearbyCard === 0,
    CENTER_NATURAL_LANGUAGE_PLAN: planAsk || posted,
    COMPOSER_OPENED_CHAT: chatVisible || phaseAfter === "chat",
    POSTED_OPAL_MESSAGE: posted,
    DI_NEARBY_CARD_ABSENT: nearbyCard === 0,
  };

  const report = {
    overall: Object.values(caps).every(Boolean) ? "GREEN" : "RED",
    caps,
    posts: posts.length,
    sampleBody: bodyText.slice(0, 400),
    at: new Date().toISOString(),
  };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (report.overall !== "GREEN") process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
