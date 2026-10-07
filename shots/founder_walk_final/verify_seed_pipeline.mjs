/**
 * Pre-walk gate: Vite SHA + founder seed pipeline + chats/calls/Chanelle screenshots.
 * Run AFTER a full Vite kill+restart. Do NOT hand the founder a URL until GREEN.
 *
 * Checklist (agent):
 * 1. Kill Vite completely; restart from apps/opal_web --host 0.0.0.0 --port 5173
 * 2. node shots/founder_walk_final/verify_seed_pipeline.mjs
 * 3. Confirm vite_sha matches tip; screenshots match chats-reference / calls-reference-1031
 * 4. Hard-refresh phone; ONLY THEN tell founder to walk
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

async function login(page, session) {
  await page.addInitScript(
    ({ token, userId, name }) => {
      sessionStorage.setItem("opal.product.browser_session.v1", token);
      sessionStorage.setItem("opal_native_host", "1");
      localStorage.setItem(
        "opal.product.profile.v17",
        JSON.stringify({ user_id: userId, display_name: name, handle: "founder_rev" }),
      );
      localStorage.setItem("opal.founder_seed.opt_in.persist.v1", "1");
      sessionStorage.setItem("opal.founder_seed.opt_in.v1", "1");
      localStorage.setItem("opal.firstRun.v14.completed", "1");
    },
    { token: session.token, userId: session.userId, name: session.name },
  );
  await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1`, {
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
}

const seedLogs = [];
const session = await loadSession();
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
page.on("console", (msg) => {
  const t = msg.text();
  if (t.includes("[opal-seed]") || t.includes("[OPAL_FOUNDER_SEED]")) {
    seedLogs.push(t);
  }
});

try {
  // Cold load for SHA before login init
  await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await sleep(600);
  const liveSha = await page.evaluate(
    () => document.documentElement.getAttribute("data-git-head") || "",
  );
  assert("vite_sha", liveSha === TIP || liveSha.startsWith(TIP.slice(0, 7)), `live=${liveSha} tip=${TIP}`);

  await login(page, session);

  const pipe0 = await page.evaluate(() => window.__opalSeedPipeline || null);
  assert("seed_enabled", !!pipe0?.enabled, JSON.stringify(pipe0));

  // --- Chats ---
  await page.getByTestId("member-tab-chats").click();
  await page.waitForSelector("[data-name=Chanelle]", { timeout: 20000 });
  await sleep(900);
  await page.screenshot({ path: resolve(OUT, "seed_pipeline_chats.png") });
  const chats = await page.evaluate(() => {
    const body = document.body.innerText || "";
    const names = [...document.querySelectorAll("[data-name]")].map((el) =>
      el.getAttribute("data-name"),
    );
    const pipe = window.__opalSeedPipeline || null;
    return {
      names,
      italian: /We should do something Italian/i.test(body),
      chanellePill: /Juniper & Ivy · 7:30 PM/i.test(body),
      mayaPill: /Farmers market \+ coast/i.test(body),
      juniperPill: /3 of 4 going/i.test(body),
      sabrinaPill: /Live nearby/i.test(body),
      alexPill: /Trip Graph/i.test(body),
      pipe,
    };
  });
  assert(
    "seed_rows_loaded",
    (chats.pipe?.rows?.length >= 5) ||
      seedLogs.some((l) => /FOUNDER_CHATS_PLAN_PILL_ROWS/.test(l)),
    JSON.stringify(chats.pipe?.rows || null),
  );
  assert(
    "remap_produced_rows",
    (chats.pipe?.remap?.outLen >= 5) ||
      seedLogs.some((l) => /remapFounderChatRowsToLive/.test(l) && /outLen/.test(l) && !/outLen.: ?0\b/.test(l)),
    JSON.stringify(chats.pipe?.remap || null),
  );
  assert(
    "chats_named_five",
    ["Chanelle", "Maya", "Juniper crew", "Sabrina", "Alex"].every((n) => chats.names.includes(n)),
    chats.names.join(","),
  );
  assert("chats_no_italian", !chats.italian);
  assert("chats_pills", chats.chanellePill && chats.mayaPill && chats.juniperPill && chats.sabrinaPill && chats.alexPill);

  // --- Calls ---
  const callsBtn = page.locator('button:has-text("Calls")').first();
  await callsBtn.click();
  await sleep(800);
  await page.screenshot({ path: resolve(OUT, "seed_pipeline_calls.png") });
  const calls = await page.evaluate(() => {
    const body = document.body.innerText || "";
    return {
      chanelleReady: /Chanelle/i.test(body) && /Sat 7:30 · Ready/i.test(body),
      juniperMissed: /Juniper crew/i.test(body) && /Missed|Call back/i.test(body),
      mayaVideo: /Maya/i.test(body) && /Video · 36m/i.test(body),
      dupChanelle: (body.match(/Chanelle/g) || []).length > 3,
    };
  });
  assert("calls_chanelle_ready", calls.chanelleReady);
  assert("calls_juniper_missed", calls.juniperMissed);
  assert("calls_maya_video", calls.mayaVideo);
  assert("calls_no_dup_chanelle", !calls.dupChanelle, `count signal`);

  // --- Chanelle thread ---
  await page.locator('button:has-text("Chats")').first().click();
  await page.waitForSelector("[data-name=Chanelle]", { timeout: 15000 });
  await sleep(600);
  const chanelleRow = page.locator("[data-name=Chanelle]").first();
  const box = await chanelleRow.boundingBox();
  if (!box) throw new Error("Chanelle row missing");
  // Avatar/name side — row center hits the plan pill (opens Graph).
  await page.mouse.click(box.x + 36, box.y + box.height / 2);
  await page.waitForSelector("[data-testid=member-conversation]", { timeout: 15000 });
  let thread = null;
  for (let i = 0; i < 24; i++) {
    thread = await page.evaluate(() => {
      const bubbles = [...document.querySelectorAll(".bubble")];
      const texts = bubbles.map((b) => (b.textContent || "").trim());
      const body = document.body.innerText || "";
      const blank = texts.filter((t) => !t || t.replace(/\d/g, "").trim().length < 2).length;
      return {
        bubbleCount: bubbles.length,
        blank,
        juniperTonight: /Juniper tonight/i.test(body),
        can730: /I can do 7:30/i.test(body),
        opalLined: /Opal lined this up/i.test(body),
        italian: /We should do something Italian/i.test(body),
        pipe: window.__opalSeedPipeline || null,
      };
    });
    if (thread.bubbleCount >= 2 && thread.juniperTonight && thread.opalLined) break;
    await sleep(250);
  }
  await page.screenshot({ path: resolve(OUT, "seed_pipeline_chanelle_thread.png") });
  assert("thread_bubbles", thread.bubbleCount >= 2, `count=${thread.bubbleCount}`);
  assert("thread_no_blanks", thread.blank === 0, `blank=${thread.blank}`);
  assert("thread_seed_copy", thread.juniperTonight && thread.can730 && thread.opalLined);
  assert("thread_no_italian", !thread.italian);
  assert(
    "thread_resolve_logged",
    !!thread.pipe?.thread?.turnCount || seedLogs.some((l) => /resolveFounderSeedThread/.test(l)),
    JSON.stringify(thread.pipe?.thread || null),
  );
} catch (e) {
  assert("harness", false, String(e?.stack || e));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
const report = {
  tip: TIP,
  base: BASE,
  passed: results.filter((r) => r.ok).length,
  failed: failed.length,
  results,
  seedLogCount: seedLogs.length,
  seedLogsTail: seedLogs.slice(-20),
  shots: [
    "seed_pipeline_chats.png",
    "seed_pipeline_calls.png",
    "seed_pipeline_chanelle_thread.png",
  ],
};
writeFileSync(resolve(OUT, "SEED_PIPELINE_VERIFY.json"), JSON.stringify(report, null, 2));
console.log(`\n${failed.length ? "RED" : "GREEN"} ${report.passed}/${results.length} tip=${TIP}`);
if (failed.length) {
  console.log("Failed:", failed.map((f) => f.name).join(", "));
  process.exit(1);
}
