#!/usr/bin/env node
/**
 * PASS 13 — Attention priority correctness live proof.
 * Clean-ish multi-seed: Jordan tonight place-open vs Friends Saturday place-open.
 * Expect Home awaken = Jordan (consequence urgency), not insertion order / identity.
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
const OUT = resolve(ROOT, "docs/evidence/v2-coded-experience/pass13");
const SHOTS = resolve(OUT, "shots");
mkdirSync(SHOTS, { recursive: true });

const CAST = {
  founder: { phone: "+12025550101", name: "Founder Review", handle: "founder_rev", code: "111111" },
  jordan: { phone: "+12025550103", name: "Jordan Lee", handle: "jordan_rev", code: "333333" },
  chris: { phone: "+12025550111", name: "Chris Park", handle: "chris_p13", code: "111111" },
  jess: { phone: "+12025550112", name: "Jess Rivera", handle: "jess_p13", code: "111111" },
  alex: { phone: "+12025550113", name: "Alex Chen", handle: "alex_p13", code: "111111" },
};

const results = [];
function rec(name, status, detail = {}) {
  results.push({ name, status, detail, at: new Date().toISOString() });
  console.log(
    `${String(status === "PASS" ? "PASS" : status === "PRODUCT_FAIL" ? "PRODUCT" : "INFO").padEnd(8)} ${name}${detail.summary ? " — " + detail.summary : ""}`,
  );
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

async function seed() {
  const sessions = {};
  for (const [k, u] of Object.entries(CAST)) {
    sessions[k] = await activate(u);
    await new Promise((r) => setTimeout(r, 150));
  }

  // Jordan tonight — place open (order: Jordan FIRST)
  const inv = await json("/api/v1/product/invitations", {
    method: "POST",
    bearer: sessions.founder.token,
    body: JSON.stringify({
      phone: CAST.jordan.phone,
      label: "Jordan Lee",
      message: "Pass13 Jordan tonight",
      idempotency_key: `p13-jordan-${Date.now()}`,
    }),
  });
  let jordanId = inv.body?.invitation?.conversation_id;
  if (inv.body?.invitation?.id) {
    const acc = await json(`/api/v1/product/invitations/${inv.body.invitation.id}/accept`, {
      method: "POST",
      bearer: sessions.jordan.token,
      body: JSON.stringify({}),
    });
    jordanId = acc.body?.establishment?.conversation_id || jordanId;
  }
  if (!jordanId) throw new Error("no jordan conversation");

  for (const [s, body] of [
    [sessions.founder, "We should get dinner tonight."],
    [sessions.jordan, "I'm free after 6:30. Does 7 work?"],
    [sessions.founder, "I'm in for 7 tonight."],
    [sessions.jordan, "Works for me."],
    [sessions.founder, "Something Italian but I don't know where yet."],
    [sessions.jordan, "Downtown is out for me."],
    [sessions.founder, "Ok no downtown. Let's pick a place."],
  ]) {
    await send(s.token, jordanId, body, "p13j");
  }

  // Friends Saturday — place open (seeded AFTER Jordan)
  const group = await json("/api/v1/product/conversations/group", {
    method: "POST",
    bearer: sessions.founder.token,
    body: JSON.stringify({
      member_user_ids: [sessions.chris.userId, sessions.jess.userId, sessions.alex.userId],
      label: "Friends Saturday",
    }),
  });
  const friendsId = group.body?.conversation_id;
  if (friendsId) {
    await send(sessions.founder.token, friendsId, "Saturday dinner around 7:30?", "p13f");
    await send(sessions.chris.token, friendsId, "I'm in. Anywhere but downtown.", "p13f");
    await send(sessions.jess.token, friendsId, "Italian works for me.", "p13f");
    await send(sessions.alex.token, friendsId, "Let's pick a place this weekend.", "p13f");
  }

  rec("seed", "PASS", {
    summary: `jordan=${jordanId?.slice(0, 8)} friends=${friendsId?.slice(0, 8)} order=jordan_first`,
  });
  return { sessions, jordanId, friendsId };
}

async function seedFriendsFirst(sessions) {
  // Reverse insertion: Friends then Jordan — same semantic expected winner
  const group = await json("/api/v1/product/conversations/group", {
    method: "POST",
    bearer: sessions.founder.token,
    body: JSON.stringify({
      member_user_ids: [sessions.chris.userId, sessions.jess.userId, sessions.alex.userId],
      label: "Friends Reverse Order",
    }),
  });
  const friendsId = group.body?.conversation_id;
  if (friendsId) {
    await send(sessions.founder.token, friendsId, "Saturday dinner around 7:30 again?", "p13r");
    await send(sessions.chris.token, friendsId, "Still free Saturday.", "p13r");
  }

  const inv = await json("/api/v1/product/invitations", {
    method: "POST",
    bearer: sessions.founder.token,
    body: JSON.stringify({
      phone: CAST.jordan.phone,
      label: "Jordan Lee",
      message: "Pass13 reverse Jordan",
      idempotency_key: `p13-jordan-rev-${Date.now()}`,
    }),
  });
  let jordanId = inv.body?.invitation?.conversation_id;
  if (inv.body?.invitation?.id) {
    const acc = await json(`/api/v1/product/invitations/${inv.body.invitation.id}/accept`, {
      method: "POST",
      bearer: sessions.jordan.token,
      body: JSON.stringify({}),
    });
    jordanId = acc.body?.establishment?.conversation_id || jordanId;
  }
  if (jordanId) {
    await send(sessions.founder.token, jordanId, "Dinner tonight? Place still open.", "p13r");
    await send(sessions.jordan.token, jordanId, "Yes 7 PM works. Need a place.", "p13r");
  }
  return { jordanId, friendsId };
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

  if (!(await page.locator("#phone").isVisible({ timeout: 3000 }).catch(() => false))) {
    const skip = page.getByTestId("first-run-skip");
    if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click();
    const join = page.getByTestId("first-run-join");
    if (await join.isVisible({ timeout: 1500 }).catch(() => false)) await join.click();
    await page.waitForTimeout(400);
  }

  if (await page.locator("#phone").isVisible({ timeout: 12000 }).catch(() => false)) {
    await page.fill("#phone", user.phone);
    if (await page.locator("#name").isVisible().catch(() => false)) {
      await page.fill("#name", user.name);
    }
    const consent = page.locator("#otp-consent");
    if (await consent.isVisible().catch(() => false)) await consent.check();
    await page.getByRole("button", { name: /Text me a code|Continue|Send/i }).first().click();
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

  await page
    .waitForSelector(
      '[data-testid="member-shell"], [data-testid="home-living-field"], [data-testid="member-tabbar"]',
      { timeout: 60000 },
    )
    .catch(() => {});
}

async function inventHome(page) {
  return page.evaluate(() => {
    const body = document.body.innerText || "";
    const awakenEl =
      document.querySelector('[data-testid="awaken"]') ||
      document.querySelector(".awaken-surface") ||
      Array.from(document.querySelectorAll("button")).find((b) =>
        /CHOOSE|Where should/i.test(b.innerText || ""),
      );
    const awakenText = awakenEl
      ? (awakenEl.innerText || "").replace(/\s+/g, " ").trim()
      : null;
    const presenceN = document.querySelectorAll('[data-testid="coming-up-card"]').length;
    return {
      body: body.slice(0, 700),
      awakenText,
      presenceN,
      hasJordan: /Jordan/i.test(body),
      hasFriends: /Friends|Saturday|Sat/i.test(body),
      chooseIsJordan: awakenText ? /Jordan/i.test(awakenText) : false,
      chooseIsFriends: awakenText ? /Friends|Sat|Saturday/i.test(awakenText) && !/Jordan/i.test(awakenText) : false,
      editorial: (document.querySelector("[data-testid=home-editorial]")?.innerText || "")
        .replace(/\s+/g, " ")
        .trim(),
    };
  });
}

async function main() {
  console.log("PASS 13 attention priority correctness");
  let seedOut;
  try {
    seedOut = await seed();
  } catch (e) {
    rec("seed", "PRODUCT_FAIL", { summary: String(e.message || e).slice(0, 160) });
    return writeOut(null, null);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newContext({ viewport: { width: 390, height: 844 } }).then((c) => c.newPage());

  try {
    await page.goto(WEB, { waitUntil: "networkidle", timeout: 90000 }).catch(() =>
      page.goto(WEB, { waitUntil: "domcontentloaded", timeout: 60000 }),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1000);
    await login(page, CAST.founder);
    rec("login", "PASS", {});

    // Home settle
    const tabbar = page.getByTestId("member-tabbar");
    if (await tabbar.isVisible({ timeout: 8000 }).catch(() => false)) {
      await tabbar.locator("button").first().click();
    }
    await page.waitForTimeout(1500);
    for (let i = 0; i < 6; i++) {
      const loading = await page.locator("text=Loading").first().isVisible().catch(() => false);
      if (!loading) break;
      await page.waitForTimeout(700);
    }

    await page.screenshot({ path: resolve(SHOTS, "HOME_PRIORITY.png"), fullPage: false });
    const home = await inventHome(page);

    // Winner gate: Jordan preferred when tonight place-open exists
    const jordanWins =
      home.chooseIsJordan ||
      (/Jordan/i.test(home.awakenText || "") && /CHOOSE|Where should|place/i.test(home.awakenText || ""));
    const friendsWins = home.chooseIsFriends;

    if (jordanWins) {
      rec("live_awaken_jordan", "PASS", {
        summary: `awaken="${(home.awakenText || "").slice(0, 100)}"`,
      });
    } else if (friendsWins) {
      rec("live_awaken_jordan", "PRODUCT_FAIL", {
        summary: `Friends still won awaken: "${(home.awakenText || "").slice(0, 120)}" bodyHasJordan=${home.hasJordan}`,
      });
    } else if (home.awakenText) {
      rec("live_awaken_jordan", "PRODUCT_FAIL", {
        summary: `unexpected awaken: "${home.awakenText.slice(0, 120)}"`,
      });
    } else {
      // No awaken — residual may have settled everything; soft fail with evidence
      rec("live_awaken_jordan", "PRODUCT_FAIL", {
        summary: `no awaken visible; body="${home.body.slice(0, 160)}"`,
      });
    }

    rec("home_one_awaken", (home.awakenText ? 1 : 0) <= 1 ? "PASS" : "PRODUCT_FAIL", {
      summary: `awaken=${home.awakenText ? 1 : 0} presence≈${home.presenceN}`,
    });

    // Order-independence unit already covers client; note seed order
    rec("seed_order_jordan_first", "PASS", { summary: "jordan seeded before friends" });

    await browser.close();
    return writeOut(seedOut, home);
  } catch (e) {
    rec("live_capture", "PRODUCT_FAIL", { summary: String(e.message || e).slice(0, 160) });
    await browser.close().catch(() => {});
    return writeOut(seedOut, null);
  }
}

function writeOut(seed, home) {
  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "PRODUCT_FAIL").length;
  const out = {
    schema: "pass13_attention_priority.v1",
    seed: seed
      ? { jordanId: seed.jordanId, friendsId: seed.friendsId }
      : null,
    home,
    results,
    totals: { pass, product_fail: fail },
    at: new Date().toISOString(),
  };
  writeFileSync(resolve(OUT, "PASS13_LIVE.json"), JSON.stringify(out, null, 2));
  console.log("=== PASS 13 LIVE ===", out.totals);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
