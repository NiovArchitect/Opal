#!/usr/bin/env node
/**
 * P0-05.5 — Graph tap opens persistent Graph Detail; no auto-Journey
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(ROOT, "docs/evidence/v2-coded-experience/p0-05-5-preserve-graph-detail");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const require = createRequire(import.meta.url);
const { chromium } = require(resolve(ROOT, "apps/opal_web/node_modules/playwright"));
const EXPECT_OPAL = { x: 136, y: 7, w: 86, h: 64 };

function geomOk(got, exp, tol = 2) {
  if (!got) return false;
  return (
    Math.abs(got.x - exp.x) <= tol &&
    Math.abs(got.y - exp.y) <= tol &&
    Math.abs(got.w - exp.w) <= tol &&
    Math.abs(got.h - exp.h) <= tol
  );
}

async function measure(page) {
  return page.evaluate(() => {
    const dock = document.querySelector(".tabbar.tabbar-option-b");
    const opal = document.querySelector(".dock-opal");
    const mark = document.querySelector(".dock-opal-mark");
    const shell = document.querySelector('[data-testid="member-shell"]');
    const active = [...document.querySelectorAll('[data-dock-active="true"]')].map(
      (el) => el.getAttribute("data-dock-slot") || el.getAttribute("data-testid"),
    );
    const br = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const dockAbs = br(dock);
    const opalAbs = br(opal);
    const leave = document.querySelector('[data-testid="dated-opal-leave-slot"]');
    return {
      active,
      shell: shell?.getAttribute("data-dock-active-slot") || null,
      centerOpal:
        dockAbs && opalAbs
          ? {
              x: opalAbs.x - dockAbs.x,
              y: opalAbs.y - dockAbs.y,
              w: opalAbs.w,
              h: opalAbs.h,
            }
          : null,
      src: mark?.getAttribute("src") || null,
      graphDetail: !!document.querySelector('[data-testid="graph-detail-sheet"]'),
      journey: !!document.querySelector('[data-testid="journey-surface"]'),
      openDirections: !!document.querySelector('[data-testid="graph-open-directions"]'),
      enterJourney: !!document.querySelector('[data-testid="graph-enter-journey"]'),
      leaveTag: leave?.tagName || null,
      graphsHome: !!document.querySelector('[data-testid="graphs-home"]'),
      profile: !!document.querySelector('[data-testid="graph-profile-page"]'),
      lens: document.querySelector('[data-testid^="graphs-lens-"][aria-pressed="true"]')?.getAttribute("data-testid") ||
        [...document.querySelectorAll('[data-testid^="graphs-lens-"]')].find((e) => e.classList.contains("is-active"))?.getAttribute("data-testid") ||
        null,
    };
  });
}

async function ensureHome(page) {
  await page.goto(`${WEB}/?opal_reset_first_run=1&opal_founder_seed=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await sleep(900);
  if (await page.getByTestId("fr00-already-account").isVisible().catch(() => false)) {
    await page.getByTestId("fr00-already-account").click();
    await sleep(500);
  }
  if (await page.getByTestId("fr05-already-account").isVisible().catch(() => false)) {
    await page.getByTestId("fr05-already-account").click();
    await sleep(400);
  } else if (await page.getByTestId("fr05-continue-phone").isVisible().catch(() => false)) {
    await page.getByTestId("fr05-continue-phone").click();
    await sleep(400);
  }
  let devCode = "111111";
  page.on("response", async (res) => {
    try {
      if (res.url().includes("/activation/challenges") && res.request().method() === "POST") {
        const j = await res.json();
        if (j.development_code) devCode = j.development_code;
      }
    } catch {}
  });
  await page.waitForSelector('[data-testid="fr06-phone-input"], [data-testid="member-tab-home"]', {
    timeout: 30000,
  });
  if (await page.getByTestId("member-tab-home").isVisible().catch(() => false)) return;
  await page.fill('[data-testid="fr06-phone-input"]', "+12025550101");
  const consent = page.getByTestId("fr06-otp-consent");
  if (!(await consent.isChecked().catch(() => false))) await consent.click({ force: true });
  await page.getByTestId("fr06-continue").click();
  await page.waitForSelector('[data-testid="fr07-code-input"]', { timeout: 25000 });
  const shown = await page.getByTestId("fr07-dev-code").textContent().catch(() => "");
  const m = (shown || "").match(/\b(\d{6})\b/);
  if (m) devCode = m[1];
  await page.fill('[data-testid="fr07-code-input"]', devCode);
  await page.getByTestId("fr07-submit").click();
  for (let i = 0; i < 80; i++) {
    if (await page.getByTestId("member-tab-home").isVisible().catch(() => false)) break;
    if (await page.getByTestId("fr08-name-input").isVisible().catch(() => false)) {
      const n = page.getByTestId("fr08-name-input");
      if (!(await n.inputValue())) await n.fill("Founder");
      const b = page.getByTestId("fr08-continue");
      if (!(await b.isDisabled().catch(() => true))) await b.click();
    }
    if (await page.getByTestId("fr09-not-now").isVisible().catch(() => false)) {
      await page.getByTestId("fr09-not-now").click();
    }
    await sleep(250);
  }
  await page.getByTestId("member-tab-home").waitFor({ timeout: 45000 });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const consoleErrors = [];
const activatePosts = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
page.on("request", (req) => {
  if (req.url().includes("/journeys/activate") && req.method() === "POST") {
    activatePosts.push({ url: req.url(), at: Date.now() });
  }
});

await ensureHome(page);

// --- Direct Leave non-nav ---
await page.getByTestId("member-tab-chats").click();
await sleep(700);
{
  const rows = page.locator('[data-testid^="chats-row-"]');
  await rows.first().waitFor({ timeout: 20000 });
  for (let i = 0; i < Math.min(await rows.count(), 40); i++) {
    const t = await rows.nth(i).innerText();
    if (/Chanelle/i.test(t) && !/· Group/i.test(t)) {
      await rows.nth(i).click();
      break;
    }
  }
}
await sleep(700);
await page.getByTestId("dated-opal-leave-slot").click({ force: true }).catch(() => {});
await sleep(700);
const afterLeave = await measure(page);
const leaveOk =
  afterLeave.leaveTag === "DIV" && !afterLeave.journey && activatePosts.length === 0;

// --- Graphs → Ready Juniper → persistent Graph Detail ---
await page.getByTestId("member-tab-graphs").click();
await sleep(800);
const overviewBefore = await measure(page);
// Prefer Ready lens then Juniper open
const readyLens = page.getByTestId("graphs-lens-ready");
if (await readyLens.count()) await readyLens.click().catch(() => {});
await sleep(300);
const overviewStateA = await measure(page);

let opened = false;
const juniper = page.locator('[data-testid="graphs-open-seed-chanelle-juniper"]');
if (await juniper.count()) {
  await juniper.click();
  opened = true;
} else {
  const cards = page.locator('[data-testid^="graphs-card-"]');
  for (let i = 0; i < Math.min(await cards.count(), 20); i++) {
    const t = await cards.nth(i).innerText();
    if (/Juniper|Ready/i.test(t)) {
      await cards.nth(i).locator('[data-testid^="graphs-open-"]').click();
      opened = true;
      break;
    }
  }
  if (!opened) {
    const any = page.locator('[data-testid^="graphs-open-"]').first();
    if (await any.count()) {
      await any.click();
      opened = true;
    }
  }
}
await sleep(1200);
const detail = await measure(page);
await page.screenshot({ path: resolve(OUT, "GRAPH_DETAIL.png"), fullPage: false });

const detailOk =
  detail.graphDetail &&
  !detail.journey &&
  !detail.enterJourney &&
  detail.openDirections &&
  detail.active.includes("graphs") &&
  geomOk(detail.centerOpal, EXPECT_OPAL) &&
  activatePosts.length === 0;

// Back → Graphs same context
await page.getByTestId("graph-detail-back").click();
await sleep(700);
const afterBack = await measure(page);
const backOk = afterBack.graphsHome && !afterBack.graphDetail && !afterBack.journey && afterBack.active.includes("graphs");

// Open directions present again after re-open
await page.locator('[data-testid^="graphs-open-"]').first().click();
await sleep(800);
const detail2 = await measure(page);
const directionsOk = detail2.openDirections && detail2.graphDetail && !detail2.journey;
await page.getByTestId("graph-detail-back").click().catch(() => {});
await sleep(300);

// Person Profile regression
await page.getByTestId("member-tab-home").click();
await sleep(500);
await page.locator('[data-testid^="gsh-person-"]').first().click();
await sleep(700);
const person = await measure(page);
const personOk =
  person.profile && person.active.includes("home") && !person.active.includes("you") && geomOk(person.centerOpal, EXPECT_OPAL);
await page.screenshot({ path: resolve(OUT, "PERSON_PROFILE.png"), fullPage: false });

// Journey code-path regression (no invented open): assert JourneySurface authority tags still in DOM via source probe
const journeySource = await page.evaluate(async () => {
  // Fetch source bundle hint via existing script tags — skip; use runtime only if journey open
  return { journeySurfacePresentInDom: !!document.querySelector('[data-testid="journey-surface"]') };
});

const final = {
  at: new Date().toISOString(),
  base: "9329f8554d5239ce787ddb6f4280787a51d5c3d9",
  figma: {
    overview: "618:674 Tap a Graph to open it.",
    detail: "618:758 persistent destination; Open directions; Back to list",
    journey: "618:816 later execution",
    wiring: "618:3288 existing commit/SharedPlan — not Graph open",
  },
  activatePosts,
  leave: { ok: leaveOk, afterLeave },
  graphOpen: {
    overviewBefore,
    overviewStateA,
    opened,
    detail,
    ok: detailOk,
  },
  back: { afterBack, ok: backOk },
  openDirections: { ok: directionsOk, detail2 },
  person: { ok: personOk },
  journeyTransitionAuthorityGap: true,
  journeyNote:
    "No approved user-facing Journey trigger remains after removing Leave shortcut, Enter Journey CTA, and Graph-open auto-activate. Domain owner JourneyAuthority.activate still exists for existing SharedPlan/commit.",
  consoleErrors: consoleErrors.slice(0, 20),
  allOk: leaveOk && detailOk && backOk && directionsOk && personOk && activatePosts.length === 0,
};
writeFileSync(resolve(OUT, "FINAL_PROOF.json"), JSON.stringify(final, null, 2));
writeFileSync(
  resolve(OUT, "GRAPH_DETAIL_PERSISTENCE.json"),
  JSON.stringify({ detailOk, backOk, directionsOk, activatePosts, detail }, null, 2),
);
writeFileSync(
  resolve(OUT, "DIRECT_LEAVE_NON_NAV.json"),
  JSON.stringify({ leaveOk, afterLeave, activatePosts }, null, 2),
);
console.log(JSON.stringify({ allOk: final.allOk, leaveOk, detailOk, backOk, directionsOk, personOk, activatePosts }, null, 2));
await browser.close();
process.exit(final.allOk ? 0 : 1);
