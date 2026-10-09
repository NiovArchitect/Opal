/**
 * Paste W2 — onboarding evidence @390×844 dark.
 * Uses ?opal_force_meet_opal=1 to enter Meet Opal without OTP.
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.OPAL_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(ROOT, "shots/walk");
mkdirSync(OUT, { recursive: true });
const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
const { chromium } = require("playwright");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TIP = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim();

const checks = {};
function note(name, ok, detail = "") {
  checks[name] = { ok: !!ok, detail: String(detail || "") };
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

function loadSession() {
  try {
    const cached = JSON.parse(readFileSync("/tmp/fw13_session.json", "utf8"));
    if (cached?.token) return cached;
  } catch {
    /* */
  }
  return { token: "w2-placeholder", userId: "founder-w2", name: "Founder" };
}

async function openMeet(page, session) {
  await page.addInitScript(
    ({ token, userId, name }) => {
      sessionStorage.setItem("opal.product.browser_session.v1", token);
      sessionStorage.setItem("opal_native_host", "1");
      sessionStorage.setItem("opal_holy_shit", "1");
      localStorage.setItem(
        "opal.product.profile.v17",
        JSON.stringify({ user_id: userId, display_name: name, handle: "founder_rev" }),
      );
      localStorage.setItem("opal.founder_seed.opt_in.persist.v1", "1");
      sessionStorage.setItem("opal.founder_seed.opt_in.v1", "1");
      // Do NOT mark first-run completed — Meet Opal force owns the stage.
      localStorage.removeItem("opal.firstRun.v14.completed");
    },
    session,
  );
  await page.goto(
    `${BASE}/?opal_force_meet_opal=1&opal_founder_seed=1&opal_native_host=1`,
    { waitUntil: "domcontentloaded", timeout: 90000 },
  );
  await sleep(800);
  await page.waitForSelector('[data-testid="meet-opal-conversation"], [data-testid="first-run-meet-opal-shell"]', {
    timeout: 45000,
  });
}

async function shot(page, name) {
  const path = resolve(OUT, name);
  await page.screenshot({ path, fullPage: false });
  return path;
}

function boxOverlap(a, b) {
  if (!a || !b) return false;
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

const session = loadSession();
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  colorScheme: "dark",
});
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message.slice(0, 200)));

try {
  await openMeet(page, session);
  note("meet_shell", true);

  // Wait through greeting → ask_name (typing choreography ~2.5s)
  await page.waitForSelector('[data-testid="hs-self-name-input"]', { timeout: 20000, state: "visible" });
  await page.waitForSelector('[data-testid="hs-opal-ask-self-name"]', { timeout: 10000, state: "visible" });
  await sleep(300);
  await shot(page, "w2_01_ask_self_name.png");

  const character = await page.locator('[data-testid="hs-opal-orb"][data-presence="character"]').isVisible().catch(() => false);
  note("3.2_character", character);

  const nameQ = await page.getByTestId("hs-opal-ask-self-name").isVisible().catch(() => false);
  const nameInput = page.getByTestId("hs-self-name-input");
  const nameVisible = await nameInput.isVisible().catch(() => false);
  note("1.1_name_question", nameQ);
  note("1.1_name_input", nameVisible);

  if (nameVisible) {
    await nameInput.fill("Jordan Lee");
    await sleep(200);
    const uname = page.getByTestId("hs-self-username-input");
    const suggested = await uname.inputValue().catch(() => "");
    note("1.1_username_suggested", /jordan/i.test(suggested), suggested);
    await shot(page, "w2_02_name_typed.png");
    await page.getByTestId("hs-self-name-submit").click({ force: true });
    await sleep(800);
  }

  // Permissions
  for (let i = 0; i < 20; i++) {
    if (await page.getByTestId("hs-permissions").isVisible().catch(() => false)) break;
    await sleep(200);
  }
  await shot(page, "w2_03_permissions.png");
  note("permissions", await page.getByTestId("hs-permissions").isVisible().catch(() => false));

  // Deny contacts path: Not now through all perms → friend step
  for (let i = 0; i < 4; i++) {
    const notNow = page.getByTestId("hs-perm-not-now");
    if (await notNow.isVisible().catch(() => false)) {
      await notNow.click({ force: true });
      await sleep(500);
    } else break;
  }

  for (let i = 0; i < 30; i++) {
    if (await page.getByTestId("hs-name-composer").isVisible().catch(() => false)) break;
    await sleep(200);
  }
  await shot(page, "w2_04_friend_step.png");

  // Trigger contacts unavailable (web has no Contact Picker in Playwright)
  const resolveBtn = page.getByTestId("hs-resolve-contacts");
  note("friend_composer", await page.getByTestId("hs-name-composer").isVisible().catch(() => false));
  if (await resolveBtn.isVisible().catch(() => false)) {
    await resolveBtn.click({ force: true });
  }
  await page.waitForSelector('[data-testid="hs-contacts-status"]', { timeout: 8000, state: "visible" });
  await sleep(300);
  await shot(page, "w2_05_contacts_denied.png");

  const statusBox = await page.getByTestId("hs-contacts-status").boundingBox();
  const continueBox = await page.getByTestId("hs-name-submit").boundingBox();
  const resolveBox = await resolveBtn.boundingBox().catch(() => null);
  const statusStyle = await page.getByTestId("hs-contacts-status").evaluate((el) => {
    const s = getComputedStyle(el);
    return { position: s.position, zIndex: s.zIndex, text: el.textContent?.slice(0, 80) };
  });

  note(
    "1.2_status_relative",
    statusStyle?.position === "relative" || statusStyle?.position === "static",
    JSON.stringify(statusStyle),
  );
  const overlapsContinue = boxOverlap(statusBox, continueBox);
  note("1.2_no_overlap_continue", !overlapsContinue, overlapsContinue ? "OVERLAP" : "clear");
  note("1.2_continue_tappable", !!(continueBox && continueBox.height > 0));
  // Status must sit above the Continue button in Y
  note(
    "1.2_status_above_continue",
    !!(statusBox && continueBox && statusBox.y + statusBox.height <= continueBox.y + 2),
    `statusBottom=${statusBox?.y + statusBox?.height} continueTop=${continueBox?.y}`,
  );

  // Single border: branded composer should exist; input should not have its own gradient bg
  const borderCheck = await page.evaluate(() => {
    const form = document.querySelector('[data-testid="hs-name-composer"] .opal-composer-brand');
    const input = document.querySelector('[data-testid="hs-name-input"]');
    if (!form || !input) return { ok: false, reason: "missing" };
    const fs = getComputedStyle(form);
    const is = getComputedStyle(input);
    return {
      ok: true,
      formBg: fs.backgroundImage.slice(0, 80),
      inputBorder: is.borderWidth,
      inputBg: is.backgroundImage.slice(0, 40) || is.backgroundColor,
      formHasGradient: /gradient/i.test(fs.backgroundImage),
      inputHasGradient: /gradient/i.test(is.backgroundImage),
    };
  });
  note(
    "2.1_single_border",
    borderCheck.ok && borderCheck.formHasGradient && !borderCheck.inputHasGradient,
    JSON.stringify(borderCheck),
  );
  await shot(page, "w2_06_single_border.png");

  // Type friend name and continue briefly
  const friendInput = page.getByTestId("hs-name-input");
  if (await friendInput.isVisible().catch(() => false)) {
    await friendInput.fill("Maya");
    await page.getByTestId("hs-name-submit").click({ force: true });
    await sleep(1200);
  }
  await shot(page, "w2_07_after_friend.png");

  // Profile persistence check
  const profile = await page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem("opal.product.profile.v17") || "null");
    } catch {
      return null;
    }
  });
  note("1.1_profile_saved", /Jordan/i.test(profile?.display_name || ""), JSON.stringify(profile));

  // Brand: no muddy mustard leftovers in computed hs bubbles
  const muddy = await page.evaluate(() => {
    const bad = ["#c4a574", "#d4b483", "#ffe0a8", "rgb(196, 165, 116)"];
    const nodes = [...document.querySelectorAll(".hs-meet-opal *")].slice(0, 200);
    for (const n of nodes) {
      const s = getComputedStyle(n);
      const blob = `${s.color}|${s.backgroundColor}|${s.borderColor}`;
      if (bad.some((b) => blob.toLowerCase().includes(b.toLowerCase()))) return blob;
    }
    return null;
  });
  note("3.1_no_muddy", !muddy, muddy || "clean");
} catch (err) {
  note("meet_shell", false, err.message);
  await shot(page, "w2_FAIL.png").catch(() => {});
  console.error(err);
} finally {
  const allOk = Object.values(checks).every((c) => c.ok);
  const report = {
    tip: TIP,
    status: allOk ? "PASS" : "PARTIAL",
    checks,
    at: new Date().toISOString(),
  };
  writeFileSync(resolve(OUT, "W2_VERIFY.json"), JSON.stringify(report, null, 2));
  const md = [
    "# Paste W2 Verify",
    "",
    `Tip: \`${TIP}\` · status: **${report.status}** · ${report.at}`,
    "",
    "## Checks",
    ...Object.entries(checks).map(([k, v]) => `- ${v.ok ? "PASS" : "FAIL"} **${k}**${v.detail ? ` — ${v.detail}` : ""}`),
    "",
    "## Screenshots",
    "- `w2_01_ask_self_name.png` — What's your name + input + character",
    "- `w2_02_name_typed.png` — name typed, username suggested",
    "- `w2_03_permissions.png`",
    "- `w2_04_friend_step.png`",
    "- `w2_05_contacts_denied.png` — status above Continue",
    "- `w2_06_single_border.png`",
    "- `w2_07_after_friend.png`",
    "",
  ].join("\n");
  writeFileSync(resolve(OUT, "W2_VERIFY.md"), md);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  process.exit(allOk ? 0 : 1);
}
