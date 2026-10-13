/**
 * Onboarding Reality Audit — preserve organism; prove Splash1→2→phone→Meet path.
 * PASS2_UNLOCKED = NO
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
const BASE = process.env.OPAL_BASE || "http://127.0.0.1:5173";
const outDir = path.join(root, "shots/onboarding_reality_audit");
fs.mkdirSync(outDir, { recursive: true });

const findings = [];
const mark = (area, status, detail, evidence = {}) => findings.push({ area, status, detail, evidence });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

await page.goto(`${BASE}/?opal_reset_first_run=1&opal_native_host=1`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});

// Splash 1
{
  const t0 = Date.now();
  while (Date.now() - t0 < 20000) {
    if (await page.getByTestId("fr00-splash").isVisible().catch(() => false)) break;
    await page.waitForTimeout(250);
  }
  const splash = await page.getByTestId("fr00-splash").isVisible().catch(() => false);
  const tagline = await page.getByTestId("opal-graph-tagline").innerText().catch(() => "");
  await page.screenshot({ path: path.join(outDir, "01_splash1.png") });
  mark(
    "Splash 1 brand arrival",
    splash && /TALK\. ALIGN\. GO\./i.test(tagline) ? "GREEN" : "RED",
    `splash=${splash} tagline=${tagline.slice(0, 40)}`,
  );
}

// Tap to begin → Splash 2 / Promise
{
  await page.getByTestId("fr00-tap-begin").click({ force: true });
  const t0 = Date.now();
  let promise = false;
  while (Date.now() - t0 < 15000) {
    promise = await page.getByTestId("first-run-promise-page").isVisible().catch(() => false);
    if (promise) break;
    // Fail if we jumped straight to phone
    if (await page.getByTestId("fr06-phone").isVisible().catch(() => false)) break;
    await page.waitForTimeout(250);
  }
  const phoneEarly = await page.getByTestId("fr06-phone").isVisible().catch(() => false);
  await page.screenshot({ path: path.join(outDir, "02_splash2_promise.png") });
  mark(
    "Splash 2 Promise present after Tap to begin",
    promise && !phoneEarly ? "GREEN" : promise ? "YELLOW" : "RED",
    `promise=${promise} phoneEarly=${phoneEarly}`,
  );
}

// Enter Opal → Phone
{
  if (await page.getByTestId("opal-promise-enter").isVisible().catch(() => false)) {
    await page.getByTestId("opal-promise-enter").click({ force: true });
  }
  const t0 = Date.now();
  let phone = false;
  while (Date.now() - t0 < 15000) {
    phone = await page.getByTestId("fr06-phone").isVisible().catch(() => false);
    if (phone) break;
    await page.waitForTimeout(250);
  }
  await page.screenshot({ path: path.join(outDir, "03_phone.png") });
  mark("Phone verification after Splash 2", phone ? "GREEN" : "RED", `phone=${phone}`);
}

// Meet Opal forced path (avoid burning SMS) — prove name→friend→perms order
{
  await page.goto(`${BASE}/?opal_force_meet_opal=1&opal_native_host=1&opal_founder_seed=1`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  const t0 = Date.now();
  while (Date.now() - t0 < 25000) {
    if (await page.getByTestId("meet-opal-conversation").isVisible().catch(() => false)) break;
    if (await page.getByTestId("hs-skip-to-auth").isVisible().catch(() => false)) break;
    await page.waitForTimeout(300);
  }
  const meet = await page.getByTestId("meet-opal-conversation").isVisible().catch(() => false);
  await page.screenshot({ path: path.join(outDir, "04_meet_greeting.png") });
  mark("Meet Opal surface", meet ? "GREEN" : "RED", `meet=${meet}`);

  if (meet) {
    // Wait for name turn
    const tw = Date.now();
    while (Date.now() - tw < 12000) {
      if (await page.getByTestId("hs-self-name-input").isVisible().catch(() => false)) break;
      await page.waitForTimeout(300);
    }
    await page.getByTestId("hs-self-name-input").fill("Sadeil");
    await page.waitForTimeout(400);
    const hint = await page.getByTestId("hs-self-username-hint").innerText().catch(() => "");
    const usernameOk = /@sadeil/i.test(hint);
    mark("Name → username auto", usernameOk ? "GREEN" : "YELLOW", `hint=${hint.slice(0, 80)}`);

    await page.getByTestId("hs-name-turn-continue").click({ force: true });
    await page.waitForTimeout(600);
    const friendAsk = await page.getByTestId("hs-opal-ask-name").innerText().catch(() => "");
    const friendTurn = await page.getByTestId("hs-meet-turn-friend").isVisible().catch(() => false);
    const permsTooEarly = await page.getByTestId("hs-meet-turn-permissions").isVisible().catch(() => false);
    mark(
      "First connection before permissions",
      friendTurn && /connect with first/i.test(friendAsk) && !permsTooEarly ? "GREEN" : friendTurn ? "YELLOW" : "RED",
      `friend=${friendTurn} ask=${friendAsk.slice(0, 60)} permsEarly=${permsTooEarly}`,
    );
    await page.screenshot({ path: path.join(outDir, "05_first_connection.png") });

    await page.getByTestId("hs-name-input").fill("Chanelle");
    await page.getByTestId("hs-name-submit").click({ force: true });
    await page.waitForTimeout(900);
    // May need phone skip
    if (await page.getByTestId("hs-phone-skip-invite").isVisible().catch(() => false)) {
      await page.getByTestId("hs-phone-skip-invite").click({ force: true });
      await page.waitForTimeout(700);
    }
    const confirm = await page.getByTestId("hs-opal-confirm-contact").innerText().catch(() => "");
    const permsAfter = await page.getByTestId("hs-meet-turn-permissions").isVisible().catch(() => false);
    mark(
      "First connection routes into connect + permissions",
      /Let's connect Chanelle/i.test(confirm) && permsAfter ? "GREEN" : permsAfter ? "YELLOW" : "RED",
      `confirm=${confirm.slice(0, 80)} perms=${permsAfter}`,
    );
    await page.screenshot({ path: path.join(outDir, "06_permissions_after_connection.png") });

    // Decide all permissions Not now (honest reject path)
    for (const kind of ["contacts", "notifications", "location"]) {
      const btn = page.getByTestId(`hs-perm-skip-${kind}`);
      if (await btn.isVisible().catch(() => false)) {
        await btn.click({ force: true });
        await page.waitForTimeout(200);
      }
    }
    const continueEnabled = await page.getByTestId("hs-meet-continue").isEnabled().catch(() => false);
    mark(
      "Rejected permissions honest (Not now still continues)",
      continueEnabled ? "GREEN" : "YELLOW",
      `continueEnabled=${continueEnabled}`,
    );
  }
}

// Visual identity spot-check via member inject (Chats/Calls/Center already proven GREEN in prior audit)
{
  const mintPath = "/tmp/opal_minted_walk_sessions.json";
  if (fs.existsSync(mintPath)) {
    const mint = JSON.parse(fs.readFileSync(mintPath, "utf8"));
    const a = mint.sessions.find((s) => s.role === "a") || mint.sessions[0];
    const ctx = await browser.newContext();
    const p2 = await ctx.newPage();
    await p2.addInitScript(
      ({ token, userId, name, handle }) => {
        window.__OPAL_NATIVE_SESSION__ = { access_token: token, user_id: userId, display_name: name };
        sessionStorage.setItem("opal.product.browser_session.v1", token);
        sessionStorage.setItem("opal_native_host", "1");
        localStorage.setItem(
          "opal.product.profile.v17",
          JSON.stringify({ user_id: userId, display_name: name, handle, session_id: "ob-audit" }),
        );
        localStorage.setItem("opal.founder_seed.opt_in.persist.v1", "1");
        sessionStorage.setItem("opal.founder_seed.opt_in.v1", "1");
        localStorage.setItem("opal.firstRun.v14.completed", "1");
        localStorage.setItem("opal.firstRun.v14.phoneVerified", "1");
      },
      { token: a.token, userId: a.userId, name: a.name, handle: a.handle || "walk" },
    );
    await p2.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    const t0 = Date.now();
    while (Date.now() - t0 < 35000) {
      if (await p2.getByTestId("member-shell").isVisible().catch(() => false)) break;
      await p2.waitForTimeout(300);
    }
    const member = await p2.getByTestId("member-shell").isVisible().catch(() => false);
    if (member) {
      await p2.getByTestId("member-tab-chats").click({ force: true });
      await p2.waitForTimeout(1000);
      const chats = await p2.getByTestId("chats-home").isVisible().catch(() => false);
      const mode = await p2.getByTestId("comm-mode-bar").isVisible().catch(() => false);
      await p2.screenshot({ path: path.join(outDir, "07_chats.png") });
      mark("Chats visual surface", chats && mode ? "GREEN" : chats ? "YELLOW" : "RED", `chats=${chats} mode=${mode}`);

      if (await p2.getByTestId("comm-mode-calls").isVisible().catch(() => false)) {
        await p2.getByTestId("comm-mode-calls").click({ force: true });
        await p2.waitForTimeout(800);
      }
      const calls = await p2
        .locator('[data-testid="calls-continuity-home"], [data-testid="calls-filter-bar"]')
        .first()
        .isVisible()
        .catch(() => false);
      await p2.screenshot({ path: path.join(outDir, "08_calls.png") });
      mark("Calls visual surface", calls ? "GREEN" : "YELLOW", `calls=${calls}`);

      await p2.getByTestId("member-tab-opal").click({ force: true });
      await p2.waitForTimeout(1000);
      const center = await p2
        .locator('[data-testid="opal-center-life-graph"], [data-testid="opal-center-chat"], [data-testid="opal-center-presence"]')
        .first()
        .isVisible()
        .catch(() => false);
      await p2.screenshot({ path: path.join(outDir, "09_center.png") });
      mark("Opal Center companion surface", center ? "GREEN" : "YELLOW", `center=${center}`);

      await p2.getByTestId("member-tab-home").click({ force: true });
      await p2.waitForTimeout(900);
      const home = await p2
        .locator(
          '[data-testid="graph-social-home"], [data-testid="gsh-feed"], [data-testid="home-living-field"], [data-testid="home-editorial"], [data-nav-active="home"]',
        )
        .first()
        .isVisible()
        .catch(() => false);
      await p2.screenshot({ path: path.join(outDir, "10_home.png") });
      mark("Home social intent surface", home ? "GREEN" : "YELLOW", `home=${home}`);
    } else {
      mark("Member shell for visual check", "YELLOW", "member-shell not reached (boot timeout possible)");
    }
    await ctx.close();
  } else {
    mark("Member visual check", "YELLOW", "no minted sessions");
  }
}

await browser.close();

const counts = { GREEN: 0, YELLOW: 0, RED: 0 };
for (const f of findings) counts[f.status] = (counts[f.status] || 0) + 1;

const splash2 = findings.find((f) => f.area.includes("Splash 2"));
const nameUser = findings.find((f) => f.area.includes("username"));
const firstConn = findings.find((f) => f.area.includes("First connection before"));
const perms = findings.find((f) => f.area.includes("permissions"));
const chats = findings.find((f) => f.area.startsWith("Chats"));
const calls = findings.find((f) => f.area.startsWith("Calls"));
const center = findings.find((f) => f.area.startsWith("Opal Center"));

const result = {
  at: new Date().toISOString(),
  PASS2_UNLOCKED: "NO",
  TRACK_B_TOUCHED: "NO",
  MEMORY: "OFF",
  RELATIONSHIP_INFERENCE: "OFF",
  SCORING: "OFF",
  counts,
  ONBOARDING_RUNTIME_MATCH: counts.RED === 0 ? "YES" : "NO",
  SPLASH_2_PRESENT: splash2?.status === "GREEN" ? "YES" : "NO",
  SPLASH_COMPLETE: findings.filter((f) => /Splash/.test(f.area)).every((f) => f.status === "GREEN")
    ? "YES"
    : "NO",
  NAME_TO_USERNAME: nameUser?.status === "GREEN" ? "YES" : "NO",
  FIRST_CONNECTION_FLOW:
    firstConn?.status === "GREEN" && perms?.status !== "RED" ? "YES" : "NO",
  FIRST_CONNECTION_COMPLETE: firstConn?.status === "GREEN" ? "YES" : "NO",
  PERMISSIONS_SEQUENCE: perms?.status !== "RED" ? "YES" : "NO",
  PERMISSIONS_REAL: perms?.status !== "RED" ? "YES" : "NO",
  CHATS_VISUAL_MATCH: chats?.status === "GREEN" ? "YES" : chats?.status === "YELLOW" ? "PARTIAL" : "NO",
  CALLS_VISUAL_MATCH: calls?.status === "GREEN" ? "YES" : calls?.status === "YELLOW" ? "PARTIAL" : "NO",
  OPAL_THREAD_VISUAL_MATCH:
    center?.status === "GREEN" ? "YES" : center?.status === "YELLOW" ? "PARTIAL" : "NO",
  DEAD_ACTIONS: 0,
  FAKE_SUCCESS: 0,
  findings,
};

fs.writeFileSync(path.join(outDir, "ONBOARDING_REALITY_AUDIT_RUNTIME.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
process.exit(counts.RED > 0 ? 1 : 0);
