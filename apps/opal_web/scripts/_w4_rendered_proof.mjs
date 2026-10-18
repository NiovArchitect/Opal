/**
 * Repair #18 / Walk #4 - RENDERED proof harness (local only).
 *
 * Serves the real web client (vite dev, port 5199) against the
 * contract-shaped stub in _w4_stub_api.mjs (port 4000, reached through
 * the vite /api proxy) and asserts RENDERED behavior at 390x844:
 * hit tests (elementFromPoint), bounding-box geometry, and truncation
 * checks. This proves the rendered layer only; backend behavior is
 * proven by the backend suites. NOT a product path and never a
 * substitute for the founder's phone walk.
 * Usage: node scripts/_w4_stub_api.mjs & (cd apps/opal_web && VITE_OPAL_API_URL=http://127.0.0.1:4000 npx vite --port 5199) ; node scripts/_w4_rendered_proof.mjs <outDir> <tag>
 */
import { chromium } from "playwright-core";
import fs from "node:fs";
const OUT = process.argv[2];
const TAG = process.argv[3] || "before";
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://127.0.0.1:5199";
const URLQ = "/?opal_founder_seed=1&opal_dev=1&opal_native_host=1";
const results = [];
const note = (id, status, detail) => { results.push({ id, status, detail }); console.log(`[${status}] ${id}: ${detail}`); };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.addInitScript(() => {
  localStorage.setItem("opal.firstRun.v14.completed", "1");
  localStorage.setItem("opal.product.profile.v17", JSON.stringify({ user_id: "u-w4-founder", display_name: "Sadeil", handle: "sadeil", session_id: "sess-w4" }));
  sessionStorage.setItem("opal.product.browser_session.v1", "w4-token");
});
await page.goto(BASE + URLQ, { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForSelector("[data-testid='graph-social-home']", { timeout: 60000 });
await page.waitForTimeout(1500);
const hit = async (sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return { exists: false };
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const top = document.elementFromPoint(cx, cy);
  const inside = top ? (el === top || el.contains(top)) : false;
  return { exists: true, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    position: cs.position, zIndex: cs.zIndex, display: cs.display, visibility: cs.visibility,
    centerHit: inside, hitDesc: top ? (top.getAttribute?.("data-testid") || (typeof top.className === "string" ? top.className.slice(0, 60) : top.tagName)) : null };
}, sel);
const shot = (n) => page.screenshot({ path: `${OUT}/${TAG}-${n}.png` });

await shot("home");
await page.click("[data-testid='gsh-story-create']");
await page.waitForTimeout(600);
const chooserHit = await hit("[data-testid='gsh-compose-chooser']");
note("W4-05/add-story-chooser", chooserHit.exists && chooserHit.centerHit && chooserHit.rect.x >= 0 ? "PASS" : "FAIL", JSON.stringify(chooserHit));
await shot("home-chooser");
if (chooserHit.exists) {
  await page.click("[data-testid='gsh-compose-story']").catch((e) => note("W4-05/add-story-click", "FAIL", e.message.slice(0, 120)));
  await page.waitForTimeout(800);
  const flowHit = await hit("[data-testid='story-create-flow']");
  note("W4-05/add-story-composer", flowHit.exists && flowHit.centerHit ? "PASS" : "FAIL", JSON.stringify(flowHit));
  await shot("home-story-create");
  if (flowHit.exists) await page.click("[data-testid='story-create-back']").catch(() => {});
  await page.waitForTimeout(400);
}
const storyCell = await page.$("[data-testid='gsh-story-story-chanelle']");
if (storyCell) {
  await storyCell.click();
  await page.waitForTimeout(800);
  const viewerHit = await hit(".story-viewer");
  note("W4-05/story-open-home", viewerHit.exists && viewerHit.centerHit ? "PASS" : "FAIL", JSON.stringify(viewerHit));
  await shot("home-story-viewer");
  const x = await page.$(".story-viewer-x, [data-testid='story-viewer-close']");
  if (x) await x.click().catch(() => {});
  await page.waitForTimeout(400);
} else note("W4-05/story-open-home", "FAIL", "no chanelle story cell");

await page.click("[data-testid='member-tab-graphs']");
await page.waitForTimeout(1200);
await shot("graphs");
const cardAudit = await page.evaluate(() => {
  const cards = [...document.querySelectorAll("[data-testid^='graphs-card-']")].filter((c) => !/temporal|open-loop/.test(c.getAttribute("data-testid")));
  return cards.slice(0, 12).map((c) => {
    const btn = c.querySelector(".graphs-home-card-btn");
    return {
      id: c.getAttribute("data-testid"),
      title: c.querySelector(".graphs-card-title")?.textContent,
      cardRect: (() => { const r = c.getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height) }; })(),
      btnScrollH: btn?.scrollHeight, btnClientH: btn?.clientHeight,
      cardOverflow: getComputedStyle(c).overflow,
      clippedLines: [...c.querySelectorAll("p, strong")].map((p) => ({
        cls: typeof p.className === "string" ? p.className : "", text: p.textContent?.slice(0, 40),
        scrollH: p.scrollHeight, clientH: p.clientHeight, scrollW: p.scrollWidth, clientW: p.clientWidth,
      })).filter((l) => l.scrollH > l.clientH + 1 || l.scrollW > l.clientW + 1),
    };
  });
});
console.log("CARD AUDIT", JSON.stringify(cardAudit).slice(0, 2000));
const clipped = cardAudit.filter((c) => c.clippedLines.length || (c.btnScrollH > c.btnClientH + 1));
note("W4-03/graphs-cards", clipped.length ? "FAIL" : "PASS", clipped.length ? `${clipped.length} clipped: ${clipped.map((c) => c.id).join(",")}` : "no truncation");

const gStory = await page.$("[data-testid='graphs-create-story']");
if (gStory) {
  await gStory.click();
  await page.waitForTimeout(800);
  const flowHit2 = await hit("[data-testid='story-create-flow']");
  note("W4-05/story-from-graphs", flowHit2.exists && flowHit2.centerHit ? "PASS" : "FAIL", JSON.stringify(flowHit2));
  await shot("graphs-story-create");
  if (flowHit2.exists) await page.click("[data-testid='story-create-back']").catch(() => {});
  await page.waitForTimeout(400);
} else note("W4-05/story-from-graphs", "FAIL", "graphs-create-story absent");
const firstGraph = await page.$("[data-testid^='graphs-open-']");
if (firstGraph) {
  await firstGraph.click();
  await page.waitForTimeout(900);
  const detailHit = await hit("[data-testid='graph-detail-sheet']");
  note("W4-05/graph-detail-open", detailHit.exists ? "PASS" : "FAIL", JSON.stringify(detailHit));
  await shot("graphs-detail");
  const back = await page.$("[data-testid='graph-detail-back']");
  if (back) await back.click().catch(() => {});
  await page.waitForTimeout(500);
}

await page.click("[data-testid='member-tab-you']");
await page.waitForTimeout(900);
await shot("you");
const grow = await page.$("[data-testid='profile-people']");
if (grow) {
  await grow.click();
  await page.waitForTimeout(700);
  const fp = await hit(".find-people-overlay");
  note("W4-05/grow-your-circle", fp.exists && fp.centerHit && fp.position === "fixed" ? "PASS" : "FAIL", JSON.stringify(fp));
  await shot("you-find-people");
  if (fp.exists) {
    const closeBtn = await page.$(".find-people-overlay .btn.ghost");
    if (closeBtn) await closeBtn.click().catch(() => {});
    await page.waitForTimeout(400);
  }
} else note("W4-05/grow-your-circle", "FAIL", "profile-people row absent");
const youStory = await page.$("[data-testid='you-create-story']");
if (youStory) {
  await youStory.click();
  await page.waitForTimeout(700);
  const f3 = await hit("[data-testid='story-create-flow']");
  note("W4-05/add-story-you", f3.exists && f3.centerHit ? "PASS" : "FAIL", JSON.stringify(f3));
  await shot("you-story-create");
  if (f3.exists) await page.click("[data-testid='story-create-back']").catch(() => {});
  await page.waitForTimeout(400);
} else note("W4-05/add-story-you", "FAIL", "you-create-story row absent");
const goLive = await page.$("[data-testid='you-go-live']");
if (goLive) {
  await goLive.click();
  await page.waitForTimeout(700);
  const lv = await hit("[data-testid='lives-go-live-overlay']");
  note("W4-05/go-live", lv.exists && lv.centerHit && lv.position === "fixed" ? "PASS" : "FAIL", JSON.stringify(lv));
  await shot("you-go-live");
  if (lv.exists) await page.click("[data-testid='lives-go-live-overlay-close']").catch(() => {});
  await page.waitForTimeout(400);
} else note("W4-05/go-live", "FAIL", "you-go-live row absent");

fs.writeFileSync(`${OUT}/${TAG}-results.json`, JSON.stringify({ results, cardAudit }, null, 1));
await browser.close();
console.log("DONE", TAG);
