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
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.addInitScript(() => {
  localStorage.setItem("opal.firstRun.v14.completed", "1");
  localStorage.setItem("opal.product.profile.v17", JSON.stringify({ user_id: "u-w4-founder", display_name: "Sadeil", handle: "sadeil", session_id: "sess-w4" }));
  sessionStorage.setItem("opal.product.browser_session.v1", "w4-token");
});
await page.goto(BASE + URLQ, { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForSelector("[data-testid='graph-social-home']", { timeout: 60000 });
await page.waitForTimeout(1200);
await page.click("[data-testid='member-tab-chats']");
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/${TAG}-chats-list.png` });
const rows = await page.evaluate(() => [...document.querySelectorAll("[data-testid]")].map((e) => e.getAttribute("data-testid")).filter((t) => /chat|row/i.test(t)).slice(0, 40));
console.log("CHATS TESTIDS", JSON.stringify(rows));
const rowSel = rows.find((t) => /chanelle/i.test(t)) || rows.find((t) => /^chats-row|^chat-row|row-/i.test(t));
console.log("ROW SEL", rowSel);
if (rowSel) {
  await page.click(`[data-testid='${rowSel}']`);
  await page.waitForTimeout(2500);
}
await page.screenshot({ path: `${OUT}/${TAG}-thread.png` });
const geo = await page.evaluate(() => {
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom), right: Math.round(r.right), position: cs.position, z: cs.zIndex, bg: cs.backgroundColor, overflow: cs.overflow }; };
  const q = (s) => document.querySelector(s);
  const bubbles = [...document.querySelectorAll(".bubble, [data-testid^='message-'], .msg, .message-row")].slice(0, 8).map(R);
  const strip = q("[data-testid='next-plan-strip']");
  const res = q(".reservation-experience");
  const resBtn = [...document.querySelectorAll("button")].find((b) => /check availability/i.test(b.textContent || ""));
  const hitAt = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t ? (t.getAttribute?.("data-testid") || (typeof t.className === "string" ? t.className.slice(0, 50) : t.tagName)) : null; };
  const overlap = (a, b) => { if (!a || !b) return null; const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x)); const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y)); return { x, y, area: x * y }; };
  const stripR = R(strip), resR = R(res);
  return {
    app: q("[data-testid='member-conversation']")?.getAttribute("data-testid") || document.querySelector(".app")?.getAttribute("data-testid"),
    header: R(q(".gpt-header, .gpt-header-618")),
    thread: R(q(".thread")),
    strip: stripR, stripHit: hitAt(strip), stripText: strip?.textContent?.slice(0, 80),
    alignmentCard: R(q("[data-testid='alignment-card']")),
    reservation: resR, reservationHit: hitAt(res), reservationText: res?.textContent?.slice(0, 120),
    resBtn: R(resBtn), resBtnHit: hitAt(resBtn), resBtnText: resBtn?.textContent,
    bubbles, stripVsBubble0: overlap(stripR, bubbles[0]), resVsBubble: bubbles.map((b) => overlap(resR, b)),
    composer: R(q(".composer-618, .composer")),
    bodyText: document.body.innerText.slice(0, 500),
  };
});
console.log("THREAD GEO", JSON.stringify(geo, null, 1).slice(0, 4500));
fs.writeFileSync(`${OUT}/${TAG}-thread-geo.json`, JSON.stringify(geo, null, 1));
await browser.close();
console.log("DONE", TAG);
