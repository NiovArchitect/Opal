/**
 * P0-05.12A browser proof: Chats seed, Journey path, Full Live identity.
 * Run from apps/opal_web: node ../../docs/.../prove_12a_closure.mjs
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT =
  "/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/docs/evidence/v2-coded-experience/p0-05-12-wave-b";
mkdirSync(join(OUT, "runtime"), { recursive: true });
const SHA = process.env.OPAL_RUNTIME_SHA || "4f21eb7";
const BASE = `http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1&runtime=${SHA}`;

const proof = { sha: SHA, logs: [], e2e: {} };

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
page.on("console", (m) => {
  const t = m.text();
  if (t.includes("OPAL_FOUNDER_SEED") || t.includes("OPAL_DEV_OTP")) proof.logs.push(t.slice(0, 300));
});

try {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="fr00-tap-begin"]', { timeout: 15000 });
  await page.locator('[data-testid="fr00-tap-begin"]').click();
  await page.waitForSelector('[data-testid="opal-promise-enter"]');
  await page.locator('[data-testid="opal-promise-enter"]').click();
  await page.waitForSelector('[data-testid="fr06-skip-for-now"]');
  await page.locator('[data-testid="fr06-skip-for-now"]').click();
  await page.waitForSelector('[data-testid="fr08-profile"]', { timeout: 45000 });
  // Name field (not file input)
  const name = page.locator('[data-testid="fr08-display-name"], #fr-display-name, input[name="displayName"], input[autocomplete="name"]').first();
  if (await name.isVisible().catch(() => false)) await name.fill("Founder");
  else {
    // fallback: visible text inputs only
    const vis = page.locator('[data-testid="fr08-profile"] input:not([type="file"]):not([type="hidden"])').first();
    if (await vis.isVisible().catch(() => false)) await vis.fill("Founder");
  }
  await page.locator('[data-testid="fr08-continue"], [data-testid="fr08-profile"] button.primary, button:has-text("Continue")').first().click();
  await page.waitForTimeout(900);
  const notNow = page.getByRole("button", { name: /Not now|Skip/i }).first();
  if (await notNow.isVisible().catch(() => false)) await notNow.click();
  await page.waitForSelector('[data-testid="member-tab-home"]', { timeout: 30000 });
  // Allow seed refresh
  await page.waitForTimeout(2500);

  // —— CHATS ——
  await page.locator('[data-testid="member-tab-chats"]').click();
  await page.waitForTimeout(1200);
  proof.e2e.chats = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('[data-testid^="chats-row-"]')];
    return {
      count: rows.length,
      names: rows.slice(0, 8).map((r) => r.querySelector(".chats-home-name")?.textContent || r.innerText.slice(0, 40)),
      empty: !!document.querySelector('[data-testid="chats-home-empty"]'),
      rowBg: rows[0] ? getComputedStyle(rows[0]).backgroundColor : null,
      rowBorder: rows[0] ? getComputedStyle(rows[0]).borderColor : null,
    };
  });
  await page.screenshot({ path: join(OUT, "runtime/CHATS_SEEDED.png"), fullPage: true });

  // —— HOME commitment → Journey ——
  await page.locator('[data-testid="member-tab-home"]').click();
  await page.waitForTimeout(800);
  // Scroll to Jordan graph card
  const jordan = page.locator('[data-testid="gsh-card-seed-jordan-market"]');
  await jordan.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(400);
  proof.e2e.jordanPhase = await jordan.getAttribute("data-participation-phase").catch(() => null);
  const imGoing = jordan.locator('[data-participation-action="im_going"], button:has-text("I\'m going"), button:has-text("I’m going")').first();
  if (await imGoing.isVisible().catch(() => false)) {
    await imGoing.click();
    await page.waitForTimeout(1500);
  }
  proof.e2e.jordanPhaseAfter = await jordan.getAttribute("data-participation-phase").catch(() => null);
  const openJourney = jordan.locator('[data-participation-action="open_journey"], button:has-text("Open Journey")').first();
  proof.e2e.openJourneyVisible = await openJourney.isVisible().catch(() => false);
  if (proof.e2e.openJourneyVisible) {
    await openJourney.click();
    await page.waitForTimeout(1500);
  }
  proof.e2e.journey = await page.evaluate(() => {
    const j = document.querySelector('[data-testid="journey-surface"], [data-figma-node="618:816"]');
    const text = (j || document.body).innerText;
    return {
      present: !!j,
      figma: j?.getAttribute("data-figma-node") || j?.getAttribute("data-figma"),
      hasAdd: /Add people/i.test(text),
      hasManage: /\bManage\b/i.test(text),
      hasCant: /can'?t make it/i.test(text),
      hasMaps: /Open Maps|Maps/i.test(text),
      snippet: text.slice(0, 350),
    };
  });
  await page.screenshot({ path: join(OUT, "runtime/JOURNEY_618_816.png"), fullPage: true });

  if (proof.e2e.journey.present || proof.e2e.journey.hasManage) {
    const manage = page.locator('[data-testid="gjourney-manage"], button:has-text("Manage")').first();
    if (await manage.isVisible().catch(() => false)) {
      await manage.click();
      await page.waitForSelector('[data-testid="journey-manage-sheet"]', { timeout: 8000 });
      proof.e2e.manage = await page.evaluate(() => {
        const sheet = document.querySelector('[data-testid="journey-manage-sheet"]');
        return {
          node: sheet?.getAttribute("data-figma-node"),
          text: sheet?.innerText?.slice(0, 400) || null,
          forbidden: !!document.querySelector('[data-testid="journey-manage-forbidden"]'),
        };
      });
      await page.screenshot({ path: join(OUT, "runtime/MANAGE_863_88.png"), fullPage: true });
      await page.locator('[data-testid="journey-manage-back"]').click();
      await page.waitForTimeout(400);
    }
    const add = page.locator('[data-testid="gjourney-add-people"], button:has-text("Add people")').first();
    if (await add.isVisible().catch(() => false)) {
      await add.click();
      await page.waitForSelector('[data-figma-node="863:394"], [data-testid="journey-add-people"]', {
        timeout: 8000,
      });
      proof.e2e.addPeople = await page.evaluate(() => {
        const sheet = document.querySelector('[data-figma-node="863:394"], [data-testid="journey-add-people"]');
        return {
          node: sheet?.getAttribute("data-figma-node"),
          circular: !!sheet?.querySelector(".journey-add-grid, [data-testid^=\"journey-add-person\"]") ||
            /avatar|grid/i.test(sheet?.className || ""),
          text: sheet?.innerText?.slice(0, 300) || null,
        };
      });
      await page.screenshot({ path: join(OUT, "runtime/ADD_PEOPLE_863_394.png"), fullPage: true });
      const back = page.locator('[data-testid="journey-add-back"], [data-testid="journey-add-people"] .opal-nav-chevron').first();
      if (await back.isVisible().catch(() => false)) await back.click();
      else await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
    }
    const cant = page.locator('[data-testid="gjourney-cant"], button:has-text("can\'t make it")').first();
    if (await cant.isVisible().catch(() => false)) {
      await cant.click();
      await page.waitForSelector('[data-testid="cant-make-it-sheet"]', { timeout: 8000 });
      proof.e2e.cant = await page.evaluate(() => {
        const sheet = document.querySelector('[data-testid="cant-make-it-sheet"]');
        const text = sheet?.innerText || "";
        return {
          node: sheet?.getAttribute("data-figma-node"),
          handoff: /Hand off lead/i.test(text),
          onlyYou: /only your participation|Leaving changes only your participation/i.test(text),
          text: text.slice(0, 400),
        };
      });
      await page.screenshot({ path: join(OUT, "runtime/CANT_863_195.png"), fullPage: true });
      await page.locator('[data-testid="cant-make-it-back"]').click();
    }
  }

  // —— FULL LIVE ——
  await page.locator('[data-testid="member-tab-home"]').click().catch(() => {});
  await page.waitForTimeout(600);
  const liveCard = page.locator('[data-testid="gsh-card-seed-live-sabrina"]');
  await liveCard.scrollIntoViewIfNeeded().catch(() => {});
  await page.locator('[data-testid="gsh-cta-seed-live-sabrina"]').click();
  await page.waitForSelector('[data-testid="full-live-destination"]', { timeout: 10000 });
  proof.e2e.fullLive = await page.evaluate(() => {
    const dest = document.querySelector('[data-testid="full-live-destination"]');
    const panel = document.querySelector('[data-testid="graph-live-panel"]');
    const img = document.querySelector('[data-testid="full-live-media"] img');
    return {
      destNode: dest?.getAttribute("data-figma-node"),
      sameReality: dest?.getAttribute("data-same-reality-home-live"),
      panelNode: panel?.getAttribute("data-figma-live"),
      host: panel?.getAttribute("data-host"),
      broadcaster: panel?.getAttribute("data-broadcaster"),
      mediaHash: panel?.getAttribute("data-live-media-hash"),
      title: document.querySelector('[data-testid="full-live-title"]')?.textContent,
      area: document.querySelector('[data-testid="full-live-area"]')?.textContent,
      attribution: document.querySelector('[data-testid="glive-seed-label"]')?.textContent,
      here: document.querySelector(".full-live-here")?.textContent,
      eta: document.querySelector(".full-live-eta")?.textContent,
      ready: document.querySelector(".full-live-ready")?.textContent,
      videoBadge: !!document.querySelector('[data-testid="full-live-video-badge"]'),
      mediaOk: !!(img && img.naturalWidth > 10),
      mediaSrc: img?.getAttribute("src"),
      noJuniper: !/Juniper & Ivy/i.test(panel?.innerText || ""),
    };
  });
  await page.screenshot({ path: join(OUT, "runtime/RUNTIME_FULL_LIVE.png"), fullPage: true });

  proof.gates = {
    CHATS_SEEDED: (proof.e2e.chats?.count || 0) >= 2,
    JOURNEY_OPENED: proof.e2e.journey?.present === true,
    MANAGE_863_88: proof.e2e.manage?.node === "863:88",
    ADD_863_394: proof.e2e.addPeople?.node === "863:394",
    CANT_863_195: proof.e2e.cant?.node === "863:195",
    FULL_LIVE_IDENTITY:
      proof.e2e.fullLive?.title === "Rooftop jazz" &&
      proof.e2e.fullLive?.area === "Downtown" &&
      /Sabrina/i.test(proof.e2e.fullLive?.attribution || "") &&
      /Jordan/i.test(proof.e2e.fullLive?.attribution || "") &&
      proof.e2e.fullLive?.sameReality === "618:211" &&
      proof.e2e.fullLive?.mediaHash === "1fd39e009e4f6e8f17bcbb4f4bc07e69fccd9190" &&
      proof.e2e.fullLive?.mediaOk === true &&
      proof.e2e.fullLive?.noJuniper === true,
  };
  proof.gates.CLOSURE_CORE =
    proof.gates.CHATS_SEEDED &&
    proof.gates.JOURNEY_OPENED &&
    proof.gates.MANAGE_863_88 &&
    proof.gates.ADD_863_394 &&
    proof.gates.CANT_863_195 &&
    proof.gates.FULL_LIVE_IDENTITY;
} catch (e) {
  proof.fatal = String(e.stack || e);
} finally {
  await browser.close();
}

writeFileSync(join(OUT, "P0_05_12A_PROOF.json"), JSON.stringify(proof, null, 2));
console.log(JSON.stringify({ gates: proof.gates, fatal: proof.fatal || null, e2e: proof.e2e, logs: proof.logs }, null, 2));
process.exit(proof.fatal ? 1 : 0);
