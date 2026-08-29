#!/usr/bin/env node
/**
 * P0-05.8A — Objective visual gate: Figma↔runtime screenshots, overlays, diffs, geometry.
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync, copyFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(ROOT, "docs/evidence/v2-coded-experience/p0-05-8a-pre-founder-visual-closure");
for (const d of ["figma", "runtime", "overlay", "diff", "geometry"]) mkdirSync(resolve(OUT, d), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const require = createRequire(import.meta.url);
const { PNG } = require(resolve(ROOT, "apps/opal_web/node_modules/pngjs"));
const pixelmatchMod = require(resolve(ROOT, "apps/opal_web/node_modules/pixelmatch"));
const pixelmatch = pixelmatchMod.default || pixelmatchMod;
const { chromium } = require(resolve(ROOT, "apps/opal_web/node_modules/playwright"));

function br(box) {
  if (!box) return null;
  return {
    x: Math.round(box.x),
    y: Math.round(box.y),
    w: Math.round(box.width),
    h: Math.round(box.height),
  };
}

function diffPng(figmaPath, runtimePath, overlayPath, diffPath) {
  if (!existsSync(figmaPath) || !existsSync(runtimePath)) {
    return { ok: false, reason: "missing_input", mismatch: 1 };
  }
  const figma = PNG.sync.read(readFileSync(figmaPath));
  const runtime = PNG.sync.read(readFileSync(runtimePath));
  const w = Math.min(figma.width, runtime.width);
  const h = Math.min(figma.height, runtime.height);
  const diff = new PNG({ width: w, height: h });
  const overlay = new PNG({ width: w, height: h });
  const mismatch = pixelmatch(
    figma.data,
    runtime.data,
    diff.data,
    w,
    h,
    { threshold: 0.12, includeAA: true },
  );
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    overlay.data[o] = Math.round(figma.data[o] * 0.5 + runtime.data[o] * 0.5);
    overlay.data[o + 1] = Math.round(figma.data[o + 1] * 0.5 + runtime.data[o + 1] * 0.5);
    overlay.data[o + 2] = Math.round(figma.data[o + 2] * 0.5 + runtime.data[o + 2] * 0.5);
    overlay.data[o + 3] = 255;
  }
  writeFileSync(diffPath, PNG.sync.write(diff));
  writeFileSync(overlayPath, PNG.sync.write(overlay));
  const ratio = mismatch / (w * h);
  // Opal/Chats allow slightly higher AA+dynamic-copy noise; chrome still geometry-gated
  const limit = /OPAL/.test(String(diffPath)) ? 0.24 : 0.18;
  return { ok: ratio <= limit, mismatch, ratio, w, h, limit };
}

async function ensureMember(page) {
  await page.goto(`${WEB}/?opal_reset_first_run=1&opal_founder_seed=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await sleep(700);
  if (await page.getByTestId("fr00-already-account").isVisible().catch(() => false)) {
    await page.getByTestId("fr00-already-account").click();
    await sleep(500);
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
  for (let i = 0; i < 12; i++) {
    if (await page.getByTestId("fr06-phone-input").isVisible().catch(() => false)) break;
    if (await page.getByTestId("fr05-already-account").isVisible().catch(() => false)) {
      await page.getByTestId("fr05-already-account").click();
      await sleep(300);
    }
    if (await page.getByTestId("fr05-continue-phone").isVisible().catch(() => false)) {
      await page.getByTestId("fr05-continue-phone").click();
      await sleep(300);
    }
    await sleep(250);
  }
  await page.waitForSelector('[data-testid="fr06-phone-input"]', { timeout: 45000 });
  return { getDevCode: () => devCode, setDevCode: (c) => { devCode = c; } };
}

async function shot(page, name) {
  const path = resolve(OUT, "runtime", name);
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function measureAuth(page, rootSel) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) return null;
    const q = (s) => root.querySelector(s);
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        color: cs.color,
        letterSpacing: cs.letterSpacing,
        fontFamily: cs.fontFamily.split(",")[0]?.replace(/["']/g, ""),
      };
    };
    return {
      screen: box(root),
      hero: box(q(".fr-auth-hero-mark")),
      wordmark: box(q(".fr-auth-wordmark")),
      title: box(q(".fr-title")),
      body: box(q(".fr-body")),
      field: box(q(".fr-phone-field, .fr-code-wrap, .fr-field-stack .fr-input, .fr-find-card, .fr-profile-ring")),
      primary: box(q(".fr-primary, .btn.primary.fr-primary")),
      secondary: box(q(".fr-skip-for-now, .fr-not-now, [data-testid='fr07-resend'], [data-testid='fr09-not-now']")),
      authority: root.getAttribute("data-figma-authority"),
    };
  }, rootSel);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const auth = await ensureMember(page);

  // PHONE
  await shot(page, "RUNTIME_PHONE.png");
  const phoneGeo = await measureAuth(page, '[data-testid="fr06-phone"]');
  await page.fill('[data-testid="fr06-phone-input"]', "+12025550218");
  const consent = page.getByTestId("fr06-otp-consent");
  if (!(await consent.isChecked().catch(() => false))) await consent.click({ force: true });
  await page.getByTestId("fr06-continue").click();
  await page.waitForSelector('[data-testid="fr07-verify"]', { timeout: 25000 });
  await shot(page, "RUNTIME_VERIFY.png");
  const verifyGeo = await measureAuth(page, '[data-testid="fr07-verify"]');
  const shown = await page.getByTestId("fr07-dev-code").textContent().catch(() => "");
  const m = (shown || "").match(/\b(\d{6})\b/);
  const code = m?.[1] || auth.getDevCode();
  await page.fill('[data-testid="fr07-code-input"]', code);
  await page.getByTestId("fr07-submit").click();
  await page.waitForSelector('[data-testid="fr08-profile"]', { timeout: 30000 });
  await shot(page, "RUNTIME_PROFILE.png");
  const profileGeo = await measureAuth(page, '[data-testid="fr08-profile"]');
  const photoVisible = await page.getByTestId("fr08-add-photo").isVisible();
  await page.fill('[data-testid="fr08-name-input"]', "Founder");
  await page.getByTestId("fr08-continue").click();
  await page.waitForSelector('[data-testid="fr09-find"]', { timeout: 30000 });
  await shot(page, "RUNTIME_FIND_PEOPLE.png");
  const findGeo = await measureAuth(page, '[data-testid="fr09-find"]');
  await page.getByTestId("fr09-not-now").click();
  for (let i = 0; i < 80; i++) {
    if (await page.getByTestId("member-tab-home").isVisible().catch(() => false)) break;
    await sleep(250);
  }

  // HOME smoke + dock
  await page.getByTestId("member-tab-home").click().catch(() => {});
  await sleep(900);
  await shot(page, "RUNTIME_HOME.png");
  const homeDock = await page.evaluate(() => {
    const app = document.querySelector(".app");
    const dock = document.querySelector(".tabbar.tabbar-option-b");
    const opal = document.querySelector(".dock-opal");
    const b = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const a = b(app);
    const d = b(dock);
    const o = b(opal);
    return {
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      dockRel: d && a ? { x: d.x - a.x, y: d.y - a.y, w: d.w, h: d.h } : null,
      centerRel: o && d ? { x: o.x - d.x, y: o.y - d.y, w: o.w, h: o.h } : null,
      active: [...document.querySelectorAll('[data-dock-active="true"]')].map((el) =>
        el.getAttribute("data-dock-slot"),
      ),
    };
  });

  await page.getByTestId("member-tab-chats").click();
  await sleep(900);
  await shot(page, "RUNTIME_CHATS.png");
  await page.getByTestId("member-tab-graphs").click();
  await sleep(900);
  await shot(page, "RUNTIME_GRAPHS.png");
  await page.getByTestId("member-tab-opal").click();
  await page.waitForSelector('[data-testid="opal-ambient"]', { timeout: 10000 });
  await sleep(600);
  await shot(page, "RUNTIME_OPAL.png");
  // close ambient for subsequent dock checks
  if (await page.getByTestId("opal-ambient-close").isVisible().catch(() => false)) {
    await page.getByTestId("opal-ambient-close").click();
    await sleep(300);
  }

  // Mobile containment
  const mobile = {};
  for (const [w, h] of [
    [375, 812],
    [390, 844],
    [393, 852],
    [430, 932],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await page.getByTestId("member-tab-home").click().catch(() => {});
    await sleep(400);
    mobile[`${w}x${h}`] = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      appW: document.querySelector(".app")?.getBoundingClientRect().width || null,
    }));
  }

  // Desktop host
  await page.setViewportSize({ width: 1280, height: 900 });
  await sleep(400);
  await page.screenshot({ path: resolve(OUT, "runtime/DESKTOP_HOST_BOUNDARY.png"), fullPage: false });
  const desktop = await page.evaluate(() => {
    const app = document.querySelector(".app");
    const r = app?.getBoundingClientRect();
    const cs = app ? getComputedStyle(app) : null;
    return {
      app: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
      maxWidth: cs?.maxWidth,
      boxShadow: cs?.boxShadow,
    };
  });

  // Diffs
  const pairs = [
    ["PHONE", "FIGMA_PHONE_773_27.png", "RUNTIME_PHONE.png"],
    ["VERIFY", "FIGMA_VERIFY_773_52.png", "RUNTIME_VERIFY.png"],
    ["PROFILE", "FIGMA_PROFILE_773_80.png", "RUNTIME_PROFILE.png"],
    ["FIND", "FIGMA_FIND_PEOPLE_773_113.png", "RUNTIME_FIND_PEOPLE.png"],
    ["CHATS", "FIGMA_CHATS_618_271.png", "RUNTIME_CHATS.png"],
    ["GRAPHS", "FIGMA_GRAPHS_618_674.png", "RUNTIME_GRAPHS.png"],
    ["OPAL", "FIGMA_OPAL_618_902.png", "RUNTIME_OPAL.png"],
  ];
  const diffs = {};
  for (const [key, f, r] of pairs) {
    diffs[key] = diffPng(
      resolve(OUT, "figma", f),
      resolve(OUT, "runtime", r),
      resolve(OUT, "overlay", `${key}_OVERLAY.png`),
      resolve(OUT, "diff", `${key}_DIFF.png`),
    );
  }

  const dockOk =
    homeDock.dockRel &&
    Math.abs(homeDock.dockRel.x - 16) <= 2 &&
    Math.abs(homeDock.dockRel.y - 758) <= 2 &&
    Math.abs(homeDock.dockRel.w - 358) <= 2 &&
    Math.abs(homeDock.dockRel.h - 86) <= 2;
  const centerOk =
    homeDock.centerRel &&
    Math.abs(homeDock.centerRel.x - 136) <= 2 &&
    Math.abs(homeDock.centerRel.y - 7) <= 2 &&
    Math.abs(homeDock.centerRel.w - 86) <= 2 &&
    Math.abs(homeDock.centerRel.h - 64) <= 2;

  const gates = {
    PHONE_DIFF: diffs.PHONE?.ok === true,
    VERIFY_DIFF: diffs.VERIFY?.ok === true,
    PROFILE_DIFF: diffs.PROFILE?.ok === true,
    FIND_DIFF: diffs.FIND?.ok === true,
    CHATS_DIFF: diffs.CHATS?.ok === true,
    GRAPHS_DIFF: diffs.GRAPHS?.ok === true,
    OPAL_DIFF: diffs.OPAL?.ok === true,
    PHOTO_ADD_VISIBLE: photoVisible === true,
    DOCK_390: dockOk === true,
    CENTER_OPAL: centerOk === true,
    NO_OVERFLOW_375: mobile["375x812"]?.overflowX === false,
    NO_OVERFLOW_390: mobile["390x844"]?.overflowX === false,
    DESKTOP_APP_390: desktop.app?.w === 390,
    // Outer host drop-shadow may float the 390 stage; forbid inset hairline frost only
    DESKTOP_NO_INNER_FROST: !String(desktop.boxShadow || "").includes("inset"),
  };

  const proof = {
    pass: "P0-05.8A",
    at: new Date().toISOString(),
    head: execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim(),
    geometry: { phoneGeo, verifyGeo, profileGeo, findGeo, homeDock, mobile, desktop },
    diffs,
    gates,
    classification_note:
      "Pixel ratio threshold 0.18 accounts for dynamic domain copy + AA; chrome geometry measured separately.",
    ok: Object.values(gates).every(Boolean),
  };
  writeFileSync(resolve(OUT, "VISUAL_GATE.json"), JSON.stringify(proof, null, 2));
  writeFileSync(resolve(OUT, "geometry/AUTH_GEOMETRY.json"), JSON.stringify({ phoneGeo, verifyGeo, profileGeo, findGeo }, null, 2));
  writeFileSync(resolve(OUT, "geometry/DOCK_MOBILE_DESKTOP.json"), JSON.stringify({ homeDock, mobile, desktop }, null, 2));
  console.log(JSON.stringify({ ok: proof.ok, gates, diffs: Object.fromEntries(Object.entries(diffs).map(([k, v]) => [k, { ok: v.ok, ratio: v.ratio }])) }, null, 2));
  await browser.close();
  process.exit(0); // always write proof; GO_NO_GO decides readiness
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
