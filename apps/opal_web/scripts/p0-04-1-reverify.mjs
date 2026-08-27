/**
 * P0-04.1 re-verify after call opacity + You settings repairs.
 * HOLD — evidence only.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const WEB = process.env.OPAL_WEB || "http://127.0.0.1:5173";
const EV = path.resolve(
  "../../docs/evidence/v2-coded-experience/brand-v4-coherence/p0-04-1-pre-founder-validation",
);
const RT = path.join(EV, "runtime");
fs.mkdirSync(RT, { recursive: true });

async function ensureHome(page) {
  await page.goto(`${WEB}/?opal_founder_seed=1`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(800);
  // Skip first-run / promise if present
  const enter = page.getByRole("button", { name: /enter opal|continue|get started/i });
  if (await enter.count()) {
    await enter.first().click().catch(() => {});
    await page.waitForTimeout(600);
  }
  // Force first-run done
  await page.evaluate(() => {
    try {
      localStorage.setItem("opal_first_run_done", "1");
      localStorage.setItem("opal_promise_accepted", "1");
    } catch {}
  });
  const home = page.locator('[data-testid="graph-social-home"], [aria-label*="home" i]');
  if (!(await home.count())) {
    await page.goto(`${WEB}/?opal_founder_seed=1`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
  }
  await page.waitForSelector('[data-testid="member-tabbar"], [data-testid="graph-social-home"]', {
    timeout: 30000,
  });
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(RT, name), fullPage: false });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    storageState: fs.existsSync(path.join(RT, "storage_state.json"))
      ? path.join(RT, "storage_state.json")
      : undefined,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  const net401 = [];
  page.on("response", (r) => {
    if (r.status() === 401) net401.push(r.url());
  });

  await ensureHome(page);
  await shot(page, "HOME_390_REVERIFY.png");

  // Activity
  await page.getByRole("button", { name: /^Activity$/i }).first().click();
  await page.waitForTimeout(500);
  const activityTitle = await page.locator('[data-testid="activity-destination"], [data-figma="618:2384"]').first().innerText().catch(() => "");
  await shot(page, "ACTIVITY_390_REVERIFY.png");
  await page.keyboard.press("Escape").catch(() => {});
  const back = page.getByRole("button", { name: /back/i });
  if (await back.count()) await back.first().click().catch(() => {});
  await page.waitForTimeout(300);

  // Chats
  await page.getByTestId("member-tab-chats").click();
  await page.waitForTimeout(600);
  const chatsVisible = await page.locator('[data-figma="618:271"], [data-testid="chats-home"]').count();
  const chatsText = await page.locator("body").innerText();
  const hasMessagesCallsTab =
    /Messages\s*\/\s*Calls|role=\"tablist\".*Messages/i.test(chatsText) === false
      ? await page.locator('[role="tab"]:has-text("Messages"), [role="tab"]:has-text("Calls")').count()
      : 1;
  await shot(page, "CHATS_390_REVERIFY.png");

  // Open first direct-ish row
  const row = page.locator('[data-testid^="chats-row-"]').first();
  await row.click();
  await page.waitForTimeout(700);
  const conv = page.locator('[data-testid="member-conversation"]');
  const convKind = await conv.getAttribute("data-chat-kind");
  const figma = await conv.getAttribute("data-figma");
  await shot(page, "DIRECT_OR_GROUP_390_REVERIFY.png");

  // Call
  const callBtn = page.getByTestId("gpt-call");
  let callProof = { opened: false };
  if (await callBtn.count()) {
    await callBtn.click();
    await page.waitForTimeout(500);
    const surface = page.locator('[data-testid="call-surface"]');
    callProof.opened = (await surface.count()) > 0;
    callProof.kind = await surface.getAttribute("data-call-kind");
    callProof.figma = await surface.getAttribute("data-figma-node");
    callProof.dockPresent = (await page.locator('[data-testid="member-tabbar"]').count()) > 0;
    // opacity sample: center pixel should be near midnight, not home bright
    callProof.centerSample = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 1;
      c.height = 1;
      // approximate via element bg
      const el = document.querySelector('[data-testid="call-surface"]');
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, z: cs.zIndex, pos: cs.position };
    });
    await shot(page, "CALL_INCOMING_OPAQUE_REVERIFY.png");
    const answer = page.getByTestId("call-answer");
    if (await answer.count()) {
      await answer.click();
      await page.waitForTimeout(400);
      await shot(page, "CALL_AUDIO_OPAQUE_REVERIFY.png");
    }
    const end = page.getByTestId("call-end");
    if (await end.count()) await end.click();
    else {
      const decline = page.getByTestId("call-decline");
      if (await decline.count()) await decline.click();
    }
    await page.waitForTimeout(400);
    callProof.afterEnd = {
      callGone: (await page.locator('[data-testid="call-surface"]').count()) === 0,
      dockPresent: (await page.locator('[data-testid="member-tabbar"]').count()) > 0,
      conversation: (await page.locator('[data-testid="member-conversation"]').count()) > 0,
    };
    await shot(page, "CALL_TEARDOWN_REVERIFY.png");
  }

  // Back to chats → You
  const backChat = page.getByRole("button", { name: /back/i });
  if (await backChat.count()) await backChat.first().click();
  await page.waitForTimeout(400);
  await page.getByTestId("member-tab-you").click();
  await page.waitForTimeout(500);
  await shot(page, "YOU_390_REVERIFY.png");
  const privacy = page.getByTestId("you-row-privacy");
  let settingsProof = { navigated: false };
  if (await privacy.count()) {
    await privacy.click();
    await page.waitForTimeout(400);
    settingsProof.navigated = true;
    settingsProof.figma = await page
      .locator("[data-figma-node]")
      .first()
      .getAttribute("data-figma-node");
    await shot(page, "YOU_PRIVACY_SETTING_REVERIFY.png");
    const setBack = page.getByRole("button", { name: /back/i });
    if (await setBack.count()) await setBack.first().click();
  }

  await context.storageState({ path: path.join(RT, "storage_state.json") });
  const out = {
    at: new Date().toISOString(),
    activityTitle: activityTitle.slice(0, 80),
    chatsVisible,
    hasMessagesCallsTab,
    convKind,
    figma,
    callProof,
    settingsProof,
    consoleErrors: consoleErrors.slice(0, 20),
    net401: net401.length,
  };
  fs.writeFileSync(path.join(EV, "REVERIFY_CALL_YOU.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
