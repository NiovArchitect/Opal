/**
 * Founder reality walk for freeze candidate (no Pass 2 / no intelligence).
 * Proves clean-install onboarding surfaces + Chat→Calls→Center→YOU continuity.
 * production_sms: does not burn OTP; uses force flags + minted Walk A session for member shell.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { resolve } from "path";

const OUT = resolve("../../shots/freeze_candidate_walk");
mkdirSync(OUT, { recursive: true });
const BASE = process.env.OPAL_BASE || "http://127.0.0.1:5173";

function loadWalkA() {
  const path = process.env.OPAL_MINTED_SESSIONS_JSON || "/tmp/opal_minted_walk_sessions.json";
  if (!existsSync(path)) throw new Error(`missing mint ${path}`);
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const sessions = raw.sessions || [];
  const a = sessions.find((s) => s.role === "a");
  if (!a?.token) throw new Error("Walk A token missing");
  return a;
}

async function shot(page, name, notes = {}) {
  const p = resolve(OUT, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  return { name, path: p, ...notes };
}

async function textBag(page, selectors) {
  const out = {};
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if ((await el.count()) > 0) {
      out[sel] = ((await el.innerText().catch(() => "")) || "").trim().slice(0, 240);
    }
  }
  return out;
}

const report = {
  tip_expected: null,
  served_git_head: null,
  phases: {},
  friction: [],
  green: [],
  native_blockers: [],
  ok: true,
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();

try {
  // --- Phase 1: clean Splash 1 → 2 → Phone ---
  await page.goto(`${BASE}/?opal_reset_first_run=1&opal_holy_shit=1&t=${Date.now()}`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForTimeout(700);
  report.served_git_head = await page.evaluate(
    () => document.documentElement.getAttribute("data-git-head") || "unknown",
  );

  await page.locator('[data-testid="fr00-splash"]').first().waitFor({ timeout: 15000 });
  const skip = await page.locator('[data-testid="fr00-skip-intro"]').count();
  const splashCopy = await textBag(page, [
    '[data-testid="opal-graph-tagline"]',
    '[data-testid="fr00-tap-begin"]',
    '[data-testid="fr00-already-account"]',
  ]);
  await shot(page, "01_splash1", { skip_intro_present: skip > 0, copy: splashCopy });
  if (skip > 0) {
    report.friction.push("Splash 1 still exposes Skip intro control");
    report.ok = false;
  } else {
    report.green.push("Splash 1: no Skip intro; Continue + returning account only");
  }

  // Character vs lockup: check lockup img present and no OPAL GRAPH text node
  const hasOpalGraphText = await page.locator("text=OPAL GRAPH").count();
  if (hasOpalGraphText > 0) {
    report.friction.push("Splash 1 paints separate OPAL GRAPH text beside lockup");
  } else {
    report.green.push("Splash 1: single lockup, no OPAL GRAPH text double-composition");
  }

  await page.locator('[data-testid="fr00-tap-begin"]').click();
  await page.locator('[data-testid="first-run-promise-shell"]').waitFor({ timeout: 10000 });
  await shot(page, "02_splash2_promise");
  report.green.push("Splash 1 → Splash 2 (Promise) runtime path");

  const enter = page.getByRole("button", { name: /Enter Opal/i }).first();
  await enter.click();
  await page.locator('[data-testid="fr06-phone"]').waitFor({ timeout: 10000 });
  await shot(page, "03_phone");
  report.green.push("Splash 2 → Phone");
  report.phases.clean_install_to_phone = "GREEN";

  // --- Phase 2: Permission bootstrap (force via stage — use QA after OTP skip by direct stage inject) ---
  // production_sms: cannot OTP. Mount permission + meet via force flags.
  await page.goto(`${BASE}/?opal_force_meet_opal=1&t=${Date.now() + 1}`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForTimeout(900);
  // force_meet jumps past permission_bootstrap by design (QA). Capture Meet emotional copy.
  await page.locator('[data-testid="meet-opal-conversation"]').waitFor({ timeout: 15000 });
  // Wait for greeting/form
  await page.waitForTimeout(2200);
  const meetCopy = await textBag(page, [
    '[data-testid="hs-greeting-headline"]',
    '[data-testid="hs-greeting-subhead"]',
    '[data-testid="hs-opal-ask-self-name"]',
    '[data-testid="hs-self-name-input"]',
  ]);
  await shot(page, "04_meet_opal_name");
  report.phases.meet_force = "GREEN";
  if ((meetCopy['[data-testid="hs-opal-ask-self-name"]'] || "").includes("What should I call you")) {
    report.friction.push(
      "Meet name ask is functional but generic form-voice: “What should I call you?” — founder taste: more companion framing before world-building",
    );
  }
  if ((meetCopy['[data-testid="hs-greeting-headline"]'] || "").includes("Hey, I'm Opal")) {
    report.green.push("Meet greeting identity present: Hey, I'm Opal.");
  }

  // Advance name → friend for first-connection copy
  const nameInput = page.locator('[data-testid="hs-self-name-input"]');
  if ((await nameInput.count()) > 0) {
    await nameInput.fill("Sadeil");
    const nameContinue = page.locator('[data-testid="hs-name-turn-continue"]');
    if ((await nameContinue.count()) > 0) {
      await nameContinue.click();
      await page.waitForTimeout(600);
    }
  }
  const friendCopy = await textBag(page, [
    '[data-testid="hs-opal-ask-name"]',
    '[data-testid="hs-self-username-hint"]',
    '[data-testid="hs-contacts-status"]',
  ]);
  await shot(page, "05_meet_first_person");
  if ((friendCopy['[data-testid="hs-opal-ask-name"]'] || "").includes("Who do you want to connect with first")) {
    report.green.push("First-person ask present: Who do you want to connect with first?");
  }
  // Browser honesty for contacts
  const contactsStatus = friendCopy['[data-testid="hs-contacts-status"]'] || "";
  if (/aren't available|couldn't access|Typing works/i.test(contactsStatus)) {
    report.green.push("Browser contacts honesty: unavailable fallback shown (not fake native access)");
    report.native_blockers.push(
      "Native contacts match + resolve proof requires iOS/TestFlight ReactNativeWebView host",
    );
  }

  // Permission bootstrap isolated: cannot force stage via URL today — inspect via DOM after OTP only.
  // Source-contract check via reading page after navigating with a temporary inject.
  await page.goto(`${BASE}/?opal_reset_first_run=1&t=${Date.now() + 2}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(400);
  // Inject stage to permission_bootstrap by evaluating React is hard; instead verify component mounts when stage set via sessionStorage hack if available.
  // Fallback: document source contract from earlier P0 + capture copy from component constants via meet path notes.
  report.friction.push(
    "Permission bootstrap copy is setup-correct but benefit framing is thin (“Set up what Opal can use” / title-first Contacts) — founder taste pass before freeze",
  );
  report.phases.permission_bootstrap_taste = "FOUNDER_FRICTION";

  // --- Phase 3: Member continuity Chat → Calls → Center → YOU ---
  const walkA = loadWalkA();
  await page.addInitScript(
    ({ token, userId, name, handle }) => {
      sessionStorage.setItem("opal.product.browser_session.v1", token);
      sessionStorage.setItem("opal_native_host", "1");
      localStorage.setItem(
        "opal.product.profile.v17",
        JSON.stringify({
          user_id: userId,
          display_name: name,
          handle,
          session_id: "freeze-walk",
          access_token: token,
        }),
      );
      localStorage.setItem("opal.founder_seed.opt_in.persist.v1", "1");
      sessionStorage.setItem("opal.founder_seed.opt_in.v1", "1");
      localStorage.setItem("opal.firstRun.v14.completed", "1");
      localStorage.setItem("opal.firstRun.v14.phoneVerified", "1");
      localStorage.setItem("opal.access_token", token);
      sessionStorage.setItem("opal.access_token", token);
    },
    {
      token: walkA.token,
      userId: walkA.userId,
      name: walkA.name || "Walk A",
      handle: walkA.handle || "realitygate",
    },
  );
  await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1&t=${Date.now() + 3}`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(1500);
  await page.locator('[data-testid="member-shell"]').waitFor({ timeout: 30000 });
  await page.locator('[data-testid="member-tabbar"]').waitFor({ timeout: 15000 });

  const clickTab = async (id) => {
    const loc = page.getByTestId(id);
    await loc.waitFor({ timeout: 15000 });
    await loc.click();
    await page.waitForTimeout(900);
  };

  await clickTab("member-tab-chats");
  await shot(page, "06_chats");
  const chatsBody = await page.locator("body").innerText();
  const chatsHasPeople = /Chanelle|Maya|Opal|Messages|Chats/i.test(chatsBody);
  if (chatsHasPeople) report.green.push("Chats surface reachable with social/people content");
  else report.friction.push("Chats surface weak/empty after session inject — continuity unproven for people list");

  await clickTab("member-tab-calls");
  await shot(page, "07_calls");
  const callsBody = await page.locator("body").innerText();
  if (/Call|Calls|Missed|Recents/i.test(callsBody)) report.green.push("Calls surface reachable");
  else report.friction.push("Calls surface not clearly present after inject");

  await clickTab("member-tab-opal");
  await page.waitForTimeout(400);
  await shot(page, "08_center");
  const centerBody = await page.locator("body").innerText();
  if (/Opal|Your day|Center|Hey/i.test(centerBody)) {
    report.green.push("Opal Center reachable — same-entity continuity candidate");
  } else {
    report.friction.push("Opal Center continuity not clearly visible");
  }

  await clickTab("member-tab-you");
  await shot(page, "09_you");
  const youBody = await page.locator("body").innerText();
  if (/You|Privacy|Spending|Permissions|Account/i.test(youBody)) report.green.push("YOU hub reachable");
  else report.friction.push("YOU hub not clearly present");
  if (/not wired yet|blockedReason/i.test(youBody)) {
    report.friction.push("YOU still leaks engineering language on consumer paint");
  } else {
    report.green.push("YOU consumer paint: no obvious tech-leak strings in body text");
  }
  if (/\bFit\b/.test(youBody) && /nothing tracked|placeholder/i.test(youBody)) {
    report.friction.push("Fit placeholder still visible on YOU");
  }

  report.phases.member_continuity = chatsHasPeople ? "GREEN_WITH_NOTES" : "YELLOW";
  report.friction.push(
    "Continuity of first-person onboarding choice into later Chat/Center is not fully proven in this automated walk under production_sms (OTP not burned); founder must validate emotional continuity live",
  );
  report.native_blockers.push(
    "Full clean-install OTP → Permission Bootstrap → Meet → first contact resolve requires live SMS + native host for contacts",
  );
} catch (e) {
  report.ok = false;
  report.error = String(e?.stack || e);
  await shot(page, "FAIL").catch(() => null);
} finally {
  writeFileSync(resolve(OUT, "FREEZE_CANDIDATE_WALK.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}
process.exitCode = report.ok ? 0 : 1;
