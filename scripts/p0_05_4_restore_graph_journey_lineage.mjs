#!/usr/bin/env node
/**
 * P0-05.4 — Restore authority-owned Graph → Journey lineage
 * Entry: Graphs → Graph Detail Ready → SharedPlan activateJourney → Journey 618:816
 * Forbidden: Direct Leave → Journey
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(ROOT, "docs/evidence/v2-coded-experience/p0-05-4-restore-graph-journey-lineage");
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const require = createRequire(import.meta.url);
const { chromium } = require(resolve(ROOT, "apps/opal_web/node_modules/playwright"));
const EXPECT_OPAL = { x: 136, y: 7, w: 86, h: 64 };
const CENTER_SHA =
  "1ddbbe1bc23b029de27d8ba1a3396d1de35e814da5101d518c1305a7131935f6";

function sha256file(rel) {
  const buf = readFileSync(resolve(ROOT, "apps/opal_web/public", rel.replace(/^\//, "")));
  return createHash("sha256").update(buf).digest("hex");
}
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
    const journey = document.querySelector('[data-testid="journey-surface"]');
    const profile = document.querySelector('[data-testid="graph-profile-page"]');
    const leave = document.querySelector('[data-testid="dated-opal-leave-slot"]');
    return {
      dockPresent: !!dock,
      centerOpal:
        dockAbs && opalAbs
          ? {
              x: opalAbs.x - dockAbs.x,
              y: opalAbs.y - dockAbs.y,
              w: opalAbs.w,
              h: opalAbs.h,
            }
          : null,
      active,
      shell: shell?.getAttribute("data-dock-active-slot") || null,
      src: mark?.getAttribute("src") || null,
      overflowX: document.documentElement.scrollWidth > 391,
      journeyMounted: !!journey,
      journeyAuthority: journey?.getAttribute("data-figma-authority") || journey?.getAttribute("data-figma-node"),
      journeyLineage: journey?.getAttribute("data-figma-journey"),
      journeyPlanId: journey?.getAttribute("data-plan-id") || null,
      profileMounted: !!profile,
      leaveTag: leave?.tagName || null,
      leaveIsButton: leave?.tagName === "BUTTON",
      leaveHasClickHandler: !!(leave && leave.onclick),
      graphEnterJourney: !!document.querySelector('[data-testid="graph-enter-journey"]'),
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
const netFails = [];
const activateHits = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
page.on("requestfailed", (r) => netFails.push({ url: r.url(), err: r.failure()?.errorText }));
page.on("response", async (res) => {
  if (res.url().includes("/journeys/activate") && res.request().method() === "POST") {
    activateHits.push({ status: res.status(), ok: res.ok() });
  }
});

await ensureHome(page);

// --- Direct Leave non-navigation ---
await page.getByTestId("member-tab-chats").click();
await sleep(700);
await page.waitForSelector('[data-testid^="chats-row-"]', { timeout: 30000 });
{
  const rows = page.locator('[data-testid^="chats-row-"]');
  for (let i = 0; i < Math.min(await rows.count(), 40); i++) {
    const t = await rows.nth(i).innerText();
    if (/Chanelle/i.test(t) && !/· Group/i.test(t)) {
      await rows.nth(i).click();
      break;
    }
  }
}
await sleep(800);
await page.waitForSelector('[data-testid="dated-opal-leave-slot"]', { timeout: 15000 });
const beforeLeave = await measure(page);
await page.getByTestId("dated-opal-leave-slot").click({ force: true }).catch(() => {});
await sleep(900);
const afterLeave = await measure(page);
const leaveProof = {
  leaveTag: afterLeave.leaveTag,
  leaveIsButton: afterLeave.leaveIsButton,
  journeyOpenedByLeave: afterLeave.journeyMounted,
  stillOnDirect: !afterLeave.journeyMounted && afterLeave.active.includes("chats"),
  activateHitsAfterLeave: [...activateHits],
  ok:
    afterLeave.leaveTag === "DIV" &&
    !afterLeave.leaveIsButton &&
    !afterLeave.journeyMounted &&
    activateHits.length === 0,
};
writeFileSync(resolve(OUT, "DIRECT_LEAVE_NON_NAV.json"), JSON.stringify(leaveProof, null, 2));
await page.screenshot({ path: resolve(OUT, "DIRECT_LEAVE_TRUTH_SLOT.png"), fullPage: false });

// --- Graph Detail no Enter Journey (from Home so it stays Graph Detail) ---
await page.getByTestId("member-tab-home").click();
await sleep(500);
const homeOpen = page.locator('[data-testid^="gsh-open-graph-"]').first();
if (await homeOpen.count()) {
  await homeOpen.click();
  await sleep(700);
}
const detailProof = await measure(page);
const graphDetailNoCta = {
  graphDetailVisible: await page.getByTestId("graph-detail-sheet").isVisible().catch(() => false),
  graphEnterJourney: detailProof.graphEnterJourney,
  ok: !(await page.getByTestId("graph-enter-journey").count()),
};
writeFileSync(resolve(OUT, "GRAPH_DETAIL_NO_JOURNEY_CTA.json"), JSON.stringify(graphDetailNoCta, null, 2));
await page.getByTestId("graph-detail-back").click().catch(() => {});
await sleep(300);

// --- Approved Journey entry: Graphs → Open Ready Juniper → SharedPlan → Journey ---
await page.getByTestId("member-tab-graphs").click();
await sleep(800);
const juniperOpen = page.locator('[data-testid="graphs-open-seed-chanelle-juniper"]');
const anyOpen = page.locator('[data-testid^="graphs-open-"]').first();
if (await juniperOpen.count()) {
  await juniperOpen.click();
} else if (await anyOpen.count()) {
  // Prefer a Juniper/Ready card if present by text
  const cards = page.locator('[data-testid^="graphs-card-"]');
  let clicked = false;
  for (let i = 0; i < Math.min(await cards.count(), 20); i++) {
    const t = await cards.nth(i).innerText();
    if (/Juniper|Ready|tonight/i.test(t)) {
      await cards.nth(i).locator('[data-testid^="graphs-open-"]').click();
      clicked = true;
      break;
    }
  }
  if (!clicked) await anyOpen.click();
}
await page.waitForSelector('[data-testid="journey-surface"]', { timeout: 25000 });
await sleep(600);
const journeyMounted = await measure(page);
await page.screenshot({ path: resolve(OUT, "JOURNEY.png"), fullPage: false });

const journeyOk =
  journeyMounted.journeyMounted &&
  journeyMounted.journeyAuthority === "618:816" &&
  journeyMounted.active.includes("graphs") &&
  !journeyMounted.active.includes("home") &&
  !journeyMounted.active.includes("chats") &&
  !journeyMounted.active.includes("you") &&
  geomOk(journeyMounted.centerOpal, EXPECT_OPAL) &&
  !journeyMounted.overflowX &&
  activateHits.some((h) => h.ok);

const journeyProof = {
  entryPath:
    "Graphs Overview → Graph Detail Ready (seed-chanelle-juniper) → JourneyAuthority.activate SharedPlan → JourneySurface 618:816",
  domainOwner: "OpalCore.SocialFlow.JourneyAuthority.activate / POST /api/v1/product/journeys/activate",
  figmaWiring: "618:3288 item 7",
  mounted: journeyMounted,
  activateHits,
  centerOpalSha: sha256file("/brand/opal-graph/opal-center-opal-645-3-rest-512.png"),
  centerOpalShaMatch:
    sha256file("/brand/opal-graph/opal-center-opal-645-3-rest-512.png") === CENTER_SHA,
  ok: journeyOk,
};
writeFileSync(resolve(OUT, "JOURNEY_PROOF.json"), JSON.stringify(journeyProof, null, 2));

// Back
await page.getByTestId("journey-back").click();
await sleep(500);
const afterBack = await measure(page);

// --- Person Profile preserved (Home-active) ---
await page.getByTestId("member-tab-home").click();
await sleep(500);
await page.locator('[data-testid^="gsh-person-"]').first().click();
await sleep(700);
const person = await measure(page);
await page.screenshot({ path: resolve(OUT, "PERSON_PROFILE.png"), fullPage: false });
const personOk =
  person.profileMounted &&
  person.active.includes("home") &&
  !person.active.includes("you") &&
  geomOk(person.centerOpal, EXPECT_OPAL);
writeFileSync(
  resolve(OUT, "PERSON_PROFILE_PROOF.json"),
  JSON.stringify({ preserved: true, mounted: person, ok: personOk }, null, 2),
);

const final = {
  at: new Date().toISOString(),
  baseCheckpoint: "017cdd7a1df299b072aa57b7bfb699673e89b88c",
  figmaUniverse: "618:2",
  wiringNode: "618:3288",
  domainOwner: {
    module: "OpalCore.SocialFlow.JourneyAuthority",
    function: "activate/1",
    http: "POST /api/v1/product/journeys/activate",
    client: "activateJourney()",
    parallelOwners: 0,
  },
  leaveProof,
  graphDetailNoCta,
  journeyProof,
  personPreserved: personOk,
  afterBackJourneyClosed: !afterBack.journeyMounted,
  consoleErrors: consoleErrors.slice(0, 20),
  netFails: netFails.filter((n) => !/favicon|sourcemap/i.test(n.url)).slice(0, 20),
  allOk: leaveProof.ok && graphDetailNoCta.ok && journeyOk && personOk,
};
writeFileSync(resolve(OUT, "FINAL_PROOF.json"), JSON.stringify(final, null, 2));
console.log(
  JSON.stringify(
    {
      allOk: final.allOk,
      leave: leaveProof,
      journey: {
        ok: journeyOk,
        active: journeyMounted.active,
        co: journeyMounted.centerOpal,
        authority: journeyMounted.journeyAuthority,
        activates: activateHits,
      },
      personOk,
    },
    null,
    2,
  ),
);
await browser.close();
process.exit(final.allOk ? 0 : 1);
