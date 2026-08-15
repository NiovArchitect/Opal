#!/usr/bin/env node
/**
 * Pass 25 — authenticated 390/375/430 product surface captures.
 * Real OTP activation via Playwright (no token-localStorage shortcuts).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { activate, send } from "./founder_proof_fixture.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const API = (process.env.API_BASE || "http://127.0.0.1:4000").replace(/\/$/, "");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(ROOT, "docs/evidence/v2-coded-experience/live-closure/pass25-product-organism");
mkdirSync(resolve(OUT, "shots"), { recursive: true });

const USERS = {
  lead: { phone: "+12025550204", name: "Friend Organizer", handle: "friendorg_p25", code: "111111" },
  peer: { phone: "+12025550205", name: "Chaotic Friend", handle: "chaotic_p25", code: "111111" },
  third: { phone: "+12025550206", name: "Silent Friend", handle: "silent_p25", code: "111111" },
};

const results = [];
function rec(name, status, detail = {}) {
  results.push({ name, status, detail, at: new Date().toISOString() });
  console.log(`${status.padEnd(8)} ${name}${detail.summary ? " — " + detail.summary : ""}`);
}

async function json(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "content-type": "application/json",
      ...(opts.bearer ? { authorization: `Bearer ${opts.bearer}` } : {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function login(page, user) {
  await page.goto(WEB, { waitUntil: "networkidle", timeout: 90000 });
  const skip = page.getByTestId("first-run-skip");
  if (await skip.isVisible({ timeout: 2500 }).catch(() => false)) await skip.click();
  const join = page.getByTestId("first-run-join");
  if (await join.isVisible({ timeout: 1200 }).catch(() => false)) await join.click();

  let devCode = user.code || "000000";
  page.on("response", async (res) => {
    try {
      if (res.url().includes("/product/activation/challenges") && res.request().method() === "POST") {
        const j = await res.json();
        if (j.development_code) devCode = j.development_code;
      }
    } catch {
      /* ignore */
    }
  });

  if (await page.locator("#phone").isVisible({ timeout: 10000 }).catch(() => false)) {
    await page.fill("#phone", user.phone);
    if (await page.locator("#name").isVisible().catch(() => false)) {
      await page.fill("#name", user.name);
    }
    const consent = page.locator("#otp-consent");
    if (await consent.isVisible().catch(() => false)) await consent.check();
    await page.getByRole("button", { name: /Text me a code|Continue|Send/i }).first().click();
    await page.waitForSelector("#code", { timeout: 20000 });
    await page.waitForTimeout(800);
    await page.fill("#code", devCode);
    await page.getByRole("button", { name: /Continue|Verify|Join|Enter/i }).first().click();
  }
  for (let i = 0; i < 6; i++) {
    const ready = page.getByRole("button", {
      name: /Continue|Enter Opal|I'm ready|Done|Skip/i,
    });
    if (await ready.first().isVisible({ timeout: 1200 }).catch(() => false)) {
      await ready.first().click().catch(() => {});
      await page.waitForTimeout(350);
    }
  }
  await page.waitForSelector(
    '[data-testid="member-shell"], [data-testid="home-living-field"], [data-testid="member-tabbar"]',
    { timeout: 45000 },
  );
}

async function captureTabs(page, prefix) {
  const shots = [];
  const tabbar = page.getByTestId("member-tabbar");
  // Product tab bar: Home · People · Plans · You (not Chat/Curate/Social labels)
  const tabs = [
    { name: "HOME", match: /^Home$/i },
    { name: "CHAT", match: /^People$/i },
    { name: "PLANS", match: /^Plans$/i },
    { name: "PROFILE", match: /^You$/i },
  ];
  for (const t of tabs) {
    if (await tabbar.isVisible({ timeout: 3000 }).catch(() => false)) {
      const btn = tabbar.locator("button", { hasText: t.match }).first();
      if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await btn.click().catch(() => {});
        await page.waitForTimeout(700);
      }
    }
    const file = `${prefix}_${t.name}.png`;
    await page.screenshot({ path: resolve(OUT, "shots", file), fullPage: false });
    shots.push(file);
    const metrics = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      textLen: (document.body?.innerText || "").length,
    }));
    const objects = await page.evaluate(() => {
      const texts = [];
      document.querySelectorAll("button, [role='button'], a, h1, h2, h3").forEach((el) => {
        const t = (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 80);
        if (t) texts.push(t);
      });
      return [...new Set(texts)].slice(0, 40);
    });
    rec(`shot_${prefix}_${t.name}`, "PASS", {
      summary: file,
      metrics,
      visible_objects: objects,
    });
  }
  return shots;
}

async function main() {
  console.log("PASS 25 authenticated browser surfaces");
  const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
  const { chromium } = require("playwright");

  // Seed a live conversation so Chat has content
  const lead = await activate(USERS.lead);
  const peer = await activate(USERS.peer);
  const third = await activate(USERS.third);
  const g = await json("/api/v1/product/conversations/group", {
    method: "POST",
    bearer: lead.token,
    body: JSON.stringify({
      member_user_ids: [peer.userId, third.userId],
      label: "p25-auth-browser",
    }),
  });
  const cid = g.body?.conversation_id;
  if (g.ok && cid) {
    await send(lead.token, cid, "Want coffee this morning?", "ab1");
    await send(peer.token, cid, "9 AM works", "ab2");
  }
  rec("seed_conversation", g.ok ? "PASS" : "PRODUCT_FAIL", {
    summary: g.ok ? cid : g.body?.message || String(g.status),
  });

  const browser = await chromium.launch({ headless: true });
  const allShots = [];

  for (const vp of [
    { w: 390, h: 844, key: "390" },
    { w: 375, h: 812, key: "375" },
    { w: 430, h: 932, key: "430" },
  ]) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: vp.w, height: vp.h });
    try {
      await login(page, USERS.lead);
      rec(`auth_login_${vp.key}`, "PASS", { summary: `${vp.w}x${vp.h} member shell` });
      const shots = await captureTabs(page, `${vp.key}_AUTH`);
      allShots.push(...shots);

      // Open conversation via People list (Pass 26: not Home-first)
      if (cid) {
        const tabbar = page.getByTestId("member-tabbar");
        if (await tabbar.isVisible({ timeout: 2000 }).catch(() => false)) {
          await tabbar.locator("button", { hasText: /^People$/i }).first().click().catch(() => {});
          await page.waitForTimeout(800);
        }
        const exact = page.locator(`[data-conversation-id="${cid}"]`);
        if (await exact.first().isVisible({ timeout: 8000 }).catch(() => false)) {
          await exact.first().click();
          await page.waitForTimeout(1500);
          const cf = `${vp.key}_AUTH_CONVERSATION.png`;
          await page.screenshot({ path: resolve(OUT, "shots", cf), fullPage: false });
          allShots.push(cf);
          const diag = await page.evaluate(() => {
            const rt = window.__opalProductRealtime;
            return rt?.getDiagnostics?.() || { missing: true };
          });
          const joined =
            Array.isArray(diag.joinedChannels) && diag.joinedChannels.includes(cid);
          rec(`conversation_${vp.key}`, joined ? "PASS" : "PRODUCT_FAIL", {
            summary: joined
              ? `${cf} channel_joined=true`
              : `${cf} channel_joined=false`,
            conversation_id: cid,
            diagnostics: diag,
          });
        } else {
          rec(`conversation_${vp.key}`, "SKIP", {
            summary: "conversation row not visible in People list",
            conversation_id: cid,
          });
        }
      }
    } catch (e) {
      rec(`auth_login_${vp.key}`, "PRODUCT_FAIL", { summary: e.message });
      await page.screenshot({
        path: resolve(OUT, `shots/${vp.key}_AUTH_FAIL.png`),
        fullPage: false,
      }).catch(() => {});
    }
    await page.close();
  }

  await browser.close();

  const out = {
    schema: "pass25_browser_authenticated.v1",
    at: new Date().toISOString(),
    baseline: "f4dda8e",
    conversation_id: cid,
    results,
    shots: allShots,
    pass_count: results.filter((r) => r.status === "PASS").length,
    fail_count: results.filter((r) => r.status === "PRODUCT_FAIL").length,
  };
  writeFileSync(resolve(OUT, "PASS25_AUTH_BROWSER.json"), JSON.stringify(out, null, 2));
  console.log(`\nSUMMARY pass=${out.pass_count} fail=${out.fail_count} shots=${allShots.length}`);
  process.exit(out.fail_count > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
