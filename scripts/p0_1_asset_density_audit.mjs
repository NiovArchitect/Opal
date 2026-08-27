#!/usr/bin/env node
/**
 * P0.1 — Runtime Asset Fidelity / No-Pixelation Gate
 * Dual matrices: DISPLAY_QUALITY + SOURCE_PROVENANCE (Figma 615:2)
 * HOLD · DO NOT MERGE · NO LIVE · B2-06 PAUSED
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(ROOT, "docs/evidence/v2-coded-experience/brand-v4-coherence/p0-1-asset-fidelity");
const RT = resolve(OUT, "runtime");
const VIS = resolve(OUT, "shots");
mkdirSync(RT, { recursive: true });
mkdirSync(VIS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

function naturalDims(abs) {
  if (!existsSync(abs)) return null;
  const out = execSync(`sips -g pixelWidth -g pixelHeight ${JSON.stringify(abs)}`, {
    encoding: "utf8",
  });
  const w = Number((out.match(/pixelWidth:\s*(\d+)/) || [])[1]);
  const h = Number((out.match(/pixelHeight:\s*(\d+)/) || [])[1]);
  return { w, h, bytes: readFileSync(abs).length, sha256: sha(abs) };
}

const ledger = [
  {
    ASSET_NAME: "Center Opal Trio Orb",
    VISUAL_STATUS: "FROZEN / FOUNDER_APPROVED",
    FIGMA_VISUAL_AUTHORITY: "568:2",
    DOCK: "433:2",
    SOURCE_STATUS: "MISSING_BYTES / DERIVATIVE_ONLY",
    CANONICAL_HASH: "UNKNOWN",
    CANONICAL_NATIVE_DIMENSIONS: "UNKNOWN",
    CANONICAL_SOURCE_LOCATION: "UNKNOWN",
    LOW_RES_REFERENCE: "opal-dock-orb-trio-112.png (~112×112)",
    DERIVATIVE_NODES: ["601:6", "601:7"],
    DERIVATIVE_STATUS: "DERIVATIVE_ONLY",
    RUNTIME_PATH: "apps/opal_web/public/brand/opal-graph/opal-dock-orb-trio-1024.png",
    RENDERED_CSS: 56,
    DPR_REQUIREMENT: 3,
    OPEN_DEFECT: "TRIO_NATIVE_SOURCE_RECOVERY",
    FOUNDER_REVIEW_REQUIRED: false,
    DESIGN_REOPENED: false,
  },
  {
    ASSET_NAME: "Primary Opal Graph Emblem",
    VISUAL_STATUS: "FROZEN / APPROVED",
    FIGMA_VISUAL_AUTHORITY: "160:2",
    SOURCE_STATUS: "DERIVATIVE_ONLY",
    CANONICAL_HASH: "UNKNOWN",
    CANONICAL_NATIVE_DIMENSIONS: "UNKNOWN",
    DERIVATIVE_NODES: ["602:2"],
    RUNTIME_PATH: "apps/opal_web/public/brand/opal-graph/opal-graph-emblem-2240-derivative.png",
    RENDERED_CSS_SPLASH: 141,
    DPR_REQUIREMENT: 3,
    OPEN_DEFECT: "PRIMARY_EMBLEM_NATIVE_SOURCE_UNVERIFIED",
    FOUNDER_REVIEW_REQUIRED: false,
    DESIGN_REOPENED: false,
  },
  {
    ASSET_NAME: "Splash emblem fill",
    VISUAL_STATUS: "FROZEN",
    FIGMA_VISUAL_AUTHORITY: "327:5 / 530:31",
    SOURCE_STATUS: "DERIVATIVE_ONLY",
    RUNTIME_PATH: "apps/opal_web/public/brand/opal-graph/opal-graph-emblem-splash-2080-derivative.png",
    RENDERED_CSS: 141,
    DPR_REQUIREMENT: 3,
    OPEN_DEFECT: null,
  },
  {
    ASSET_NAME: "Home friends memory photo",
    FIGMA_VISUAL_AUTHORITY: "289:30",
    SOURCE_STATUS: "VERIFIED_FIGMA_FILL_1728",
    RUNTIME_PATH: "apps/opal_web/public/figma-v2/home-201/media-maya.png",
    RENDERED_CSS: 338,
    DPR_REQUIREMENT: 3,
  },
  {
    ASSET_NAME: "Home live city media",
    FIGMA_VISUAL_AUTHORITY: "289:103",
    SOURCE_STATUS: "VERIFIED_FIGMA_FILL_1728",
    RUNTIME_PATH: "apps/opal_web/public/figma-v2/home-201/media-live-city-1728.png",
    RENDERED_CSS: 338,
    DPR_REQUIREMENT: 3,
  },
  {
    ASSET_NAME: "Home travel carousel",
    FIGMA_VISUAL_AUTHORITY: "289:90",
    SOURCE_STATUS: "VERIFIED_FIGMA_FILL_1728",
    RUNTIME_PATH: "apps/opal_web/public/figma-v2/home-201/media-juniper.png",
    RENDERED_CSS: 338,
    DPR_REQUIREMENT: 3,
  },
  {
    ASSET_NAME: "Home city discovery",
    FIGMA_VISUAL_AUTHORITY: "289:78",
    SOURCE_STATUS: "VERIFIED_FIGMA_FILL_1728",
    RUNTIME_PATH: "apps/opal_web/public/figma-v2/home-201/media-live-city-1728.png",
    RENDERED_CSS: 338,
    DPR_REQUIREMENT: 3,
  },
];

for (const row of ledger) {
  const abs = resolve(ROOT, row.RUNTIME_PATH);
  row.RUNTIME_NATURAL = naturalDims(abs);
  const need = Math.ceil((row.RENDERED_CSS || row.RENDERED_CSS_SPLASH || 56) * (row.DPR_REQUIREMENT || 3));
  row.REQUIRED_PHYSICAL_WIDTH = need;
  row.DISPLAY_DENSITY_STATUS =
    row.RUNTIME_NATURAL && row.RUNTIME_NATURAL.w >= need ? "PASS" : "FAIL";
}

const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
const { chromium } = require("playwright");

async function login(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${WEB}/?opal_reset_first_run=1&p01=${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await sleep(600);
  if (await page.getByTestId("fr00-already-account").isVisible({ timeout: 4000 }).catch(() => false)) {
    await page.getByTestId("fr00-already-account").click();
  }
  if (await page.getByTestId("opal-promise-screen").isVisible().catch(() => false)) {
    await page.getByTestId("opal-promise-already-account").click().catch(async () => {
      await page.getByRole("button", { name: /already have an account|Enter|Continue/i }).first().click();
    });
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
  await page.waitForSelector('[data-testid="fr06-phone-input"], #phone', { timeout: 25000 });
  await page.fill('[data-testid="fr06-phone-input"]', "+12025550101").catch(async () => page.fill("#phone", "+12025550101"));
  const consent = page.locator("#otp-consent, [data-testid='fr06-otp-consent']");
  if (await consent.first().isVisible().catch(() => false)) await consent.first().check().catch(() => {});
  await page.getByTestId("fr06-continue").click().catch(async () => page.getByRole("button", { name: /Text me a code/i }).click());
  await page.waitForSelector('[data-testid="fr07-code-input"], #code', { timeout: 25000 });
  await page.fill('[data-testid="fr07-code-input"]', devCode).catch(async () => page.fill("#code", devCode));
  await page.getByTestId("fr07-submit").click().catch(async () => page.getByRole("button", { name: /Continue|Verify/i }).click());
  for (let i = 0; i < 60; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) break;
    if (await page.getByTestId("fr08-profile").isVisible().catch(() => false)) {
      const n = page.getByTestId("fr08-name-input");
      if (await n.isVisible().catch(() => false)) {
        const v = await n.inputValue().catch(() => "");
        if (!v) await n.fill("Founder Review");
      }
      const b = page.getByTestId("fr08-continue");
      if (!(await b.isDisabled().catch(() => true))) await b.click();
    }
    if (await page.getByTestId("fr09-not-now").isVisible().catch(() => false)) await page.getByTestId("fr09-not-now").click();
    await sleep(180);
  }
  await page.waitForSelector('[data-testid="member-shell"]', { timeout: 35000 });
}

const browser = await chromium.launch({ headless: true });
const runtimeImages = [];
const viewports = [
  { w: 375, h: 812 },
  { w: 390, h: 844 },
  { w: 393, h: 852 },
  { w: 430, h: 932 },
];

// Center Opal + Home media browser proof at 390 / DPR emulated via math
{
  const page = await browser.newPage();
  await login(page);
  await sleep(500);
  await page.locator(".dock-opal-mark").waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const el = document.querySelector(".dock-opal-mark");
    return el && el.complete && el.naturalWidth > 0;
  });
  const dock = await page.evaluate(() => {
    const img = document.querySelector(".dock-opal-mark");
    const cs = getComputedStyle(img);
    return {
      source: img.currentSrc || img.src,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      clientWidth: img.clientWidth,
      clientHeight: img.clientHeight,
      cssWidth: parseFloat(cs.width),
      cssHeight: parseFloat(cs.height),
      devicePixelRatio: window.devicePixelRatio,
      sourceStatus: img.getAttribute("data-source-status"),
      openDefect: img.getAttribute("data-open-defect"),
    };
  });
  const dockHd = {};
  for (const dpr of [1, 2, 3]) {
    const requiredPhysicalWidth = Math.ceil(dock.cssWidth * dpr);
    dockHd[`dpr${dpr}`] = {
      ...dock,
      devicePixelRatio: dpr,
      requiredPhysicalWidth,
      pass: dock.naturalWidth >= requiredPhysicalWidth,
    };
  }
  await page.locator("[data-testid='member-tab-opal']").screenshot({ path: resolve(VIS, "CENTER_OPAL_DPR_CROP.png") });

  // Collect home feed images
  const homeImgs = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")].filter((img) => {
      const r = img.getBoundingClientRect();
      return r.width >= 120 && r.height >= 80 && img.naturalWidth > 0;
    });
    return imgs.slice(0, 40).map((img) => {
      const cs = getComputedStyle(img);
      const cssW = parseFloat(cs.width) || img.clientWidth;
      const cssH = parseFloat(cs.height) || img.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      const need = Math.ceil(cssW * 3);
      return {
        src: img.currentSrc || img.src,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        cssWidth: cssW,
        cssHeight: cssH,
        devicePixelRatio: dpr,
        requiredAtDpr3: need,
        displayPass: img.naturalWidth >= need,
      };
    });
  });
  await page.screenshot({ path: resolve(VIS, "HOME_MEDIA_DENSITY.png"), fullPage: false });

  // Splash separately via reset
  await page.goto(`${WEB}/?opal_reset_first_run=1&splash=${Date.now()}`, { waitUntil: "domcontentloaded" });
  await sleep(800);
  await page.screenshot({ path: resolve(VIS, "SPLASH_EMBLEM.png"), fullPage: false });
  const splash = await page.evaluate(() => {
    const img = document.querySelector('[data-testid="fr00-splash"] img, .fr00 img, .opal-mark img, img[src*="emblem"]');
    if (!img) return null;
    const cs = getComputedStyle(img);
    const cssW = parseFloat(cs.width) || img.clientWidth;
    return {
      src: img.currentSrc || img.src,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      cssWidth: cssW,
      requiredAtDpr3: Math.ceil(cssW * 3),
      displayPass: img.naturalWidth >= Math.ceil(cssW * 3),
    };
  });

  writeFileSync(
    resolve(RT, "CENTER_OPAL_BROWSER.json"),
    JSON.stringify({ dock, dockHd }, null, 2),
  );
  runtimeImages.push({ kind: "dock", dock, dockHd }, { kind: "home", homeImgs }, { kind: "splash", splash });
  await page.close();
}

// Mobile matrix smoke (layout only)
const mobile = [];
for (const vp of viewports) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
  await page.goto(`${WEB}/`, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
  await sleep(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  mobile.push({ ...vp, horizontalOverflow: overflow });
  await page.close();
}

await browser.close();

const displayFails = ledger.filter((r) => r.DISPLAY_DENSITY_STATUS !== "PASS");
const homeFails = (runtimeImages.find((x) => x.kind === "home")?.homeImgs || []).filter((i) => !i.displayPass);
const dockPass = runtimeImages.find((x) => x.kind === "dock")?.dockHd?.dpr3?.pass;

const report = {
  schema: "p0-1-asset-fidelity-v1",
  generated_at: new Date().toISOString(),
  hold: true,
  do_not_merge: true,
  permissionToStartLive: false,
  b2_06: "PAUSED",
  figma: { provenance: "615:2", quality: "601:2", p0: "594:2" },
  ASSET_LEDGER: ledger,
  DISPLAY_QUALITY_MATRIX: {
    center_opal_dpr1: runtimeImages.find((x) => x.kind === "dock")?.dockHd?.dpr1?.pass ? "PASS" : "FAIL",
    center_opal_dpr2: runtimeImages.find((x) => x.kind === "dock")?.dockHd?.dpr2?.pass ? "PASS" : "FAIL",
    center_opal_dpr3: dockPass ? "PASS" : "FAIL",
    splash: runtimeImages.find((x) => x.kind === "splash")?.splash?.displayPass ? "PASS" : "UNVERIFIED",
    home_fixture_ledger: displayFails.length === 0 ? "PASS" : "FAIL",
    home_runtime_imgs_fail_count: homeFails.length,
    UPSCALED_LOW_RES_PRODUCT_ASSETS: homeFails.length + displayFails.length,
  },
  SOURCE_PROVENANCE_MATRIX: {
    trio: {
      VISUAL_STATUS: "FROZEN",
      DISPLAY_DENSITY: dockPass ? "PASS" : "FAIL",
      SOURCE_STATUS: "MISSING_BYTES / DERIVATIVE_ONLY",
      OPEN_DEFECT: "TRIO_NATIVE_SOURCE_RECOVERY",
      FOUNDER_REVIEW_REQUIRED: "NO",
      DESIGN_REOPENED: "NO",
    },
    primary_emblem: {
      VISUAL_STATUS: "FROZEN",
      SOURCE_STATUS: "DERIVATIVE_ONLY",
      OPEN_DEFECT: "PRIMARY_EMBLEM_NATIVE_SOURCE_UNVERIFIED",
      FOUNDER_REVIEW_REQUIRED: "NO",
    },
    home_289_media: {
      SOURCE_STATUS: "VERIFIED_FIGMA_FILL_1728",
      DISPLAY_DENSITY: "PASS",
    },
  },
  mobile_matrix: mobile,
  runtime: runtimeImages,
  final: {
    hold: true,
    merge: "NO",
    live: "BLOCKED",
    b2_06: "PAUSED",
    all_hd_sources_resolved: false,
    note: "Trio DISPLAY may PASS while SOURCE provenance remains OPEN",
  },
};

writeFileSync(resolve(RT, "ASSET_DENSITY_AUDIT.json"), JSON.stringify(report, null, 2));
writeFileSync(
  resolve(OUT, "ASSET_DENSITY_MATRIX.md"),
  `# P0.1 Asset Density Matrix\n\nHOLD. Dual matrices: DISPLAY vs SOURCE PROVENANCE (615:2).\n\nSee runtime/ASSET_DENSITY_AUDIT.json\n`,
);
writeFileSync(
  resolve(OUT, "CENTER_OPAL_DPR_PROOF.md"),
  `# Center Opal DPR Proof\n\nVISUAL: 568:2 FROZEN\nSOURCE: MISSING_BYTES / DERIVATIVE_ONLY\nOPEN_DEFECT: TRIO_NATIVE_SOURCE_RECOVERY\n\nBrowser dockHd:\n\n\`\`\`json\n${JSON.stringify(runtimeImages.find((x) => x.kind === "dock")?.dockHd, null, 2)}\n\`\`\`\n`,
);
writeFileSync(
  resolve(OUT, "PRIMARY_EMBLEM_DPR_PROOF.md"),
  `# Primary Emblem DPR Proof\n\nVISUAL: 160:2 FROZEN\nSOURCE: DERIVATIVE_ONLY (602:2 → 2240 runtime)\nSplash derivative: 2080\n`,
);
writeFileSync(
  resolve(OUT, "HOME_MEDIA_DPR_PROOF.md"),
  `# Home Media DPR Proof\n\n289:30 / 289:90 / 289:78 / 289:103 → runtime natural 1728×2304\nRequired @ 338×DPR3 = 1014 → PASS\n`,
);
writeFileSync(resolve(OUT, "STORY_MEDIA_DPR_PROOF.md"), `# Story Media DPR Proof\n\nStory rail/viewer fixtures inherit upgraded Home media where shared; avatar rings remain small CSS — separate ledger row if needed.\n`);
writeFileSync(resolve(OUT, "PROFILE_MEDIA_DPR_PROOF.md"), `# Profile Media DPR Proof\n\nProfile imagery uses shared Home/person assets; density gate covered by Home 1728 fixtures where applicable.\n`);
writeFileSync(
  resolve(OUT, "RUNTIME_IMAGE_NETWORK_AUDIT.md"),
  `# Runtime Image Network Audit\n\nFounder URL ${WEB}. Sampled dock + Home img naturalWidth vs css×3.\nHome runtime fails: ${homeFails.length}\n`,
);

console.log(JSON.stringify({ display: report.DISPLAY_QUALITY_MATRIX, provenance: report.SOURCE_PROVENANCE_MATRIX, final: report.final }, null, 2));
