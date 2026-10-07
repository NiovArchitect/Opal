/**
 * Prove Expo-style URL (native_host ONLY, no opal_founder_seed) still paints
 * founder seed chats/calls/thread — the phone bug after ProductWebSurface
 * loaded bare ?opal_native_host=1.
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { activate } from "../../scripts/founder_proof_fixture.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.OPAL_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(ROOT, "shots/founder_walk_final");
mkdirSync(OUT, { recursive: true });
const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
const { chromium } = require("playwright");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TIP = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim();
const results = [];
function assert(name, ok, detail = "") {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function loadSession() {
  try {
    const cached = JSON.parse(readFileSync("/tmp/fw13_session.json", "utf8"));
    if (cached?.token) return cached;
  } catch {
    /* */
  }
  const session = await activate({
    phone: "+12025550103",
    name: "Jordan Lee",
    handle: "jordan_rev",
    code: "333333",
  });
  writeFileSync("/tmp/fw13_session.json", JSON.stringify(session));
  return session;
}

const session = await loadSession();
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

try {
  // Simulate Expo ProductWebSurface: native_host only, NO seed query, NO prior seed keys.
  await page.addInitScript(
    ({ token, userId, name }) => {
      sessionStorage.setItem("opal.product.browser_session.v1", token);
      sessionStorage.setItem("opal_native_host", "1");
      localStorage.setItem(
        "opal.product.profile.v17",
        JSON.stringify({ user_id: userId, display_name: name, handle: "founder_rev" }),
      );
      localStorage.setItem("opal.firstRun.v14.completed", "1");
      // Explicitly clear any leftover seed keys — Expo cold path.
      localStorage.removeItem("opal.founder_seed.opt_in.persist.v1");
      sessionStorage.removeItem("opal.founder_seed.opt_in.v1");
    },
    { token: session.token, userId: session.userId, name: session.name },
  );

  await page.goto(`${BASE}/?opal_native_host=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await sleep(1200);
  for (let i = 0; i < 12; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) break;
    if (await page.getByTestId("opal-promise-already").isVisible().catch(() => false)) {
      await page.getByTestId("opal-promise-already").click({ force: true });
      await sleep(400);
      continue;
    }
    await sleep(400);
  }
  await page.waitForSelector('[data-testid="member-shell"]', { timeout: 45000 });

  const gate = await page.evaluate(() => ({
    sha: document.documentElement.getAttribute("data-git-head"),
    href: location.href,
    seedAttr: document.querySelector("[data-testid=member-shell]")?.getAttribute("data-opal-founder-seed"),
    chip: !!document.querySelector("[data-testid=opal-seed-sha-chip]"),
    pipe: window.__opalSeedPipeline || null,
  }));
  assert("vite_sha", gate.sha === TIP || gate.sha?.startsWith(TIP.slice(0, 7)), `live=${gate.sha} tip=${TIP}`);
  assert("no_seed_query", !/opal_founder_seed=1/.test(gate.href), gate.href);
  assert("seed_enabled_via_lan_native", !!gate.pipe?.enabled, JSON.stringify(gate.pipe));
  assert("seed_reason_native_lan", /native_host\+lan|sessionStorage|localStorage/.test(gate.pipe?.reason || ""), gate.pipe?.reason);
  assert("seed_attr", gate.seedAttr === "1", gate.seedAttr);
  assert("seed_chip", gate.chip);

  await page.getByTestId("member-tab-chats").click();
  await page.waitForSelector("[data-name=Chanelle]", { timeout: 20000 });
  await sleep(800);
  await page.screenshot({ path: resolve(OUT, "native_host_only_chats.png") });
  const chats = await page.evaluate(() => {
    const body = document.body.innerText || "";
    return {
      names: [...document.querySelectorAll("[data-name]")].map((e) => e.getAttribute("data-name")),
      italian: /We should do something Italian/i.test(body),
      pill: /Juniper & Ivy · 7:30 PM/i.test(body),
    };
  });
  assert(
    "chats_seed",
    ["Chanelle", "Maya", "Juniper crew", "Sabrina", "Alex"].every((n) => chats.names.includes(n)),
    chats.names.join(","),
  );
  assert("chats_no_italian", !chats.italian);
  assert("chats_gold_pill", chats.pill);

  await page.locator('button:has-text("Calls")').first().click();
  await sleep(700);
  await page.screenshot({ path: resolve(OUT, "native_host_only_calls.png") });
  const calls = await page.evaluate(() => {
    const body = document.body.innerText || "";
    return {
      ready: /Sat 7:30 · Ready/i.test(body),
      missed: /Call back|Missed/i.test(body),
    };
  });
  assert("calls_ready", calls.ready);
  assert("calls_missed", calls.missed);

  await page.locator('button:has-text("Chats")').first().click();
  await page.waitForSelector("[data-name=Chanelle]", { timeout: 15000 });
  await sleep(600);
  const box = await page.locator("[data-name=Chanelle]").first().boundingBox();
  if (!box) throw new Error("Chanelle row missing after Calls→Chats");
  await page.mouse.click(box.x + 36, box.y + box.height / 2);
  await page.waitForSelector("[data-testid=member-conversation]", { timeout: 15000 });
  let thread = null;
  for (let i = 0; i < 24; i++) {
    thread = await page.evaluate(() => {
      const body = document.body.innerText || "";
      return {
        bubbles: document.querySelectorAll(".bubble").length,
        juniper: /Juniper tonight/i.test(body),
        opal: /Opal lined this up/i.test(body),
        italian: /Italian/i.test(body),
      };
    });
    if (thread.bubbles >= 2 && thread.juniper) break;
    await sleep(250);
  }
  await page.screenshot({ path: resolve(OUT, "native_host_only_chanelle.png") });
  assert("thread_bubbles", thread.bubbles >= 2, `count=${thread.bubbles}`);
  assert("thread_seed", thread.juniper && thread.opal);
  assert("thread_no_italian", !thread.italian);
} catch (e) {
  assert("harness", false, String(e?.stack || e));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
const report = { tip: TIP, base: BASE, passed: results.filter((r) => r.ok).length, failed: failed.length, results };
writeFileSync(resolve(OUT, "NATIVE_HOST_SEED_VERIFY.json"), JSON.stringify(report, null, 2));
console.log(`\n${failed.length ? "RED" : "GREEN"} ${report.passed}/${results.length} tip=${TIP}`);
if (failed.length) process.exit(1);
