/**
 * PHYSICAL_PATH seed compose proof (path B).
 * Differs from verify_repair_3.mjs (path A inject):
 *   - Does NOT inject opal.founder_seed.* storage keys
 *   - Relies on ?opal_founder_seed=1 URL → gate → compose paint
 * Still mints a session (OTP not automated) but marks path=PHYSICAL_PATH.
 *
 * Caps: PASS2_UNLOCKED=NO, FREEZE=HOLD. Never claim FOUNDER ACCEPTED.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
const require = createRequire(path.resolve(root, "apps/opal_web/package.json"));
const { chromium } = require("playwright");
const BASE = (process.env.OPAL_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const outDir = path.join(__dirname, "shots_physical");
fs.mkdirSync(outDir, { recursive: true });
const TIP = execSync("git rev-parse --short HEAD", { cwd: root }).toString().trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const mintPath =
  process.env.OPAL_MINTED_SESSIONS_JSON || "/tmp/opal_minted_walk_sessions.json";
let session = null;
try {
  const mint = JSON.parse(fs.readFileSync(mintPath, "utf8"));
  session = mint.sessions?.find((s) => s.role === "a") || mint.sessions?.[0];
} catch {
  /* activate fallback below */
}

const report = {
  at: new Date().toISOString(),
  tip: TIP,
  path: "PHYSICAL_PATH",
  vs_inject: "no seed-storage inject; URL opal_founder_seed=1 only",
  base: BASE,
  caps: { FREEZE: "HOLD", PASS2_UNLOCKED: "NO" },
  journeys: {},
  overall: "RED",
  FAKE_SUCCESS: 0,
};

function pass(k, d) {
  report.journeys[k] = { ok: true, detail: d };
  console.log(`PASS ${k}`, typeof d === "string" ? d : JSON.stringify(d).slice(0, 160));
}
function fail(k, d) {
  report.journeys[k] = { ok: false, detail: d };
  console.log(`FAIL ${k}`, typeof d === "string" ? d : JSON.stringify(d).slice(0, 200));
}

async function ensureSession() {
  if (session?.token) return session;
  const { activate } = await import(
    path.join(root, "scripts/founder_proof_fixture.mjs")
  );
  const s = await activate({
    phone: "+12025550103",
    name: "Jordan Lee",
    handle: "jordan_rev",
    code: "333333",
  });
  session = { token: s.token, userId: s.userId, name: s.name, handle: s.handle };
  return session;
}

const s = await ensureSession();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

// PHYSICAL: session + first-run complete only — NO seed storage inject.
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
    // Explicitly clear seed keys — physical URL must re-enable.
    localStorage.removeItem("opal.founder_seed.opt_in.persist.v1");
    sessionStorage.removeItem("opal.founder_seed.opt_in.v1");
  },
  {
    token: s.token,
    userId: s.userId,
    name: s.name || "Jordan Lee",
    handle: s.handle || "jordan_rev",
  },
);

await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1`, {
  waitUntil: "domcontentloaded",
  timeout: 90000,
});
await sleep(1500);

for (let i = 0; i < 16; i++) {
  if (await page.getByTestId("member-shell").isVisible().catch(() => false)) break;
  if (await page.getByTestId("opal-promise-already").isVisible().catch(() => false)) {
    await page.getByTestId("opal-promise-already").click({ force: true }).catch(() => {});
  }
  await sleep(400);
}

const shell = await page.getByTestId("member-shell").isVisible().catch(() => false);
if (!shell) {
  fail("member_shell", "not visible on PHYSICAL_PATH");
  fs.writeFileSync(
    path.join(__dirname, "PHYSICAL_VERIFY.json"),
    JSON.stringify(report, null, 2),
  );
  await browser.close();
  process.exit(1);
}
pass("member_shell", "visible");

const gate = await page.evaluate(() => {
  const pipe = window.__opalSeedPipeline || null;
  const attr = document
    .querySelector("[data-testid=member-shell]")
    ?.getAttribute("data-opal-founder-seed");
  return {
    seedAttr: attr,
    pipeEnabled: !!pipe?.enabled,
    pipeReason: pipe?.reason || null,
    href: location.href,
  };
});
if (gate.seedAttr === "1" || gate.pipeEnabled) {
  pass("seed_enabled_via_url", gate);
} else {
  fail("seed_enabled_via_url", gate);
}

await page.getByTestId("member-tab-chats").click();
await sleep(1200);
await page.screenshot({ path: path.join(outDir, "physical_chats.png") });

const chats = await page.evaluate(() => {
  const names = [...document.querySelectorAll("[data-name]")]
    .map((e) => e.getAttribute("data-name"))
    .filter(Boolean);
  const pipe = window.__opalSeedPipeline || {};
  const compose = pipe.chatsCompose || null;
  const body = document.body.innerText || "";
  return {
    names,
    compose,
    hasChanelle: names.includes("Chanelle") || /Chanelle/.test(body),
    hasMaya: names.includes("Maya") || /Maya/.test(body),
    hasJuniper: names.includes("Juniper crew") || /Juniper/.test(body),
    hasSabrina: names.includes("Sabrina") || /Sabrina/.test(body),
    hasAlex: names.includes("Alex") || /Alex/.test(body),
    mayaMarket: /Farmers market/i.test(body),
    unreadAny: [...document.querySelectorAll("[data-unread]")].some(
      (e) => Number(e.getAttribute("data-unread") || 0) > 0,
    ),
  };
});

const five =
  chats.hasChanelle &&
  chats.hasMaya &&
  chats.hasJuniper &&
  chats.hasSabrina &&
  chats.hasAlex;
if (five && (chats.names.length >= 5 || chats.compose?.paintedRows >= 5)) {
  pass("FOUNDER_PHONE_CHAT_ROWS", {
    names: chats.names,
    compose: chats.compose,
    unreadAny: chats.unreadAny,
    mayaMarket: chats.mayaMarket,
  });
} else {
  fail("FOUNDER_PHONE_CHAT_ROWS", chats);
}

await page.getByTestId("comm-mode-calls").click({ force: true }).catch(() => {});
await sleep(700);
await page.screenshot({ path: path.join(outDir, "physical_calls.png") });
const calls = await page.evaluate(() => {
  const body = document.body.innerText || "";
  return {
    ready: /Sat 7:30 · Ready/i.test(body),
    missed: /Missed|Call back/i.test(body),
    maya: /Maya/i.test(body),
    cancelled: /Cancelled/i.test(body),
    completed: /Completed/i.test(body),
  };
});
if (calls.ready && calls.missed && calls.maya) pass("CALLS_WORLD", calls);
else fail("CALLS_WORLD", calls);

const fails = Object.values(report.journeys).filter((j) => !j.ok).length;
report.overall = fails === 0 ? "GREEN_PHYSICAL_COMPOSE" : "RED";
report.FAKE_SUCCESS = 0;
fs.writeFileSync(
  path.join(__dirname, "PHYSICAL_VERIFY.json"),
  JSON.stringify(report, null, 2),
);
console.log("overall", report.overall);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
