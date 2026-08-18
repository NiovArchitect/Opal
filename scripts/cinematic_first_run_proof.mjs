/**
 * Cinematic first-run proof (FR00 tap → FR01–FR04 autoplay → FR05 stop).
 * HOLD. DO NOT MERGE.
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import zlib from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(ROOT, "docs/evidence/v2-coded-experience/s1-first-run/cinematic");
mkdirSync(resolve(OUT, "shots"), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function analyzePngBuffer(buf) {
  let i = 8;
  const idat = [];
  let w = 0;
  let h = 0;
  let ct = 0;
  while (i < buf.length) {
    const ln = buf.readUInt32BE(i);
    const typ = buf.slice(i + 4, i + 8).toString();
    const d = buf.slice(i + 8, i + 8 + ln);
    i += 12 + ln;
    if (typ === "IHDR") {
      w = d.readUInt32BE(0);
      h = d.readUInt32BE(4);
      ct = d[9];
    }
    if (typ === "IDAT") idat.push(d);
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = ct === 6 ? 4 : 3;
  const stride = w * bpp;
  let prev = Buffer.alloc(stride);
  let off = 0;
  let a0 = 0;
  let colored = 0;
  let bright = 0;
  let dark = 0;
  let maxc = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[off++];
    const row = Buffer.from(raw.slice(off, off + stride));
    off += stride;
    if (f === 1) {
      for (let x = 0; x < stride; x++) row[x] = (row[x] + (x >= bpp ? row[x - bpp] : 0)) & 255;
    } else if (f === 2) {
      for (let x = 0; x < stride; x++) row[x] = (row[x] + prev[x]) & 255;
    } else if (f === 3) {
      for (let x = 0; x < stride; x++) {
        const left = x >= bpp ? row[x - bpp] : 0;
        row[x] = (row[x] + ((left + prev[x]) >> 1)) & 255;
      }
    } else if (f === 4) {
      for (let x = 0; x < stride; x++) {
        const a = x >= bpp ? row[x - bpp] : 0;
        const b = prev[x];
        const c = x >= bpp ? prev[x - bpp] : 0;
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        row[x] = (row[x] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
    }
    prev = row;
    for (let x = 0; x < w; x++) {
      const r = row[x * bpp];
      const g = row[x * bpp + 1];
      const b = row[x * bpp + 2];
      const a = bpp === 4 ? row[x * bpp + 3] : 255;
      if (a === 0) a0++;
      if (a <= 20) continue;
      const s = r + g + b;
      if (s < 40) dark++;
      if (s >= 200) bright++;
      if (Math.max(r, g, b) - Math.min(r, g, b) > 25 && s > 50) colored++;
      maxc = Math.max(maxc, r, g, b);
    }
  }
  return { w, h, a0, colored, bright, dark, maxc, pixels: w * h };
}

async function main() {
  const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
  const { chromium } = require("playwright");
  const result = {
    at: new Date().toISOString(),
    previousProductSha: "62b5857afa32b139c27a1cdbf9c3c6f9450a92cd",
    asset: {},
    splash: {},
    tap: {},
    autoplay: {},
    fr05: {},
    reducedMotion: {},
    memberBrand: {},
    homeFeed: {},
    defects: [],
    fixed: [],
    hold: true,
  };

  const symbolPath = resolve(ROOT, "apps/opal_web/public/brand/opal-graph/symbol-transparent.png");
  const defectivePath = resolve(
    ROOT,
    "apps/opal_web/public/brand/opal-graph/symbol-source-168-2-defective-black-plate.png",
  );
  result.asset.runtimePath = "public/brand/opal-graph/symbol-transparent.png";
  result.asset.runtimeSha = sha256File(symbolPath);
  result.asset.runtimeStats = analyzePngBuffer(readFileSync(symbolPath));
  result.asset.defectiveSha = existsSync(defectivePath) ? sha256File(defectivePath) : null;
  result.asset.pass =
    result.asset.runtimeStats.a0 > 100000 &&
    result.asset.runtimeStats.colored > 10000 &&
    result.asset.runtimeStats.maxc > 200 &&
    result.asset.runtimeSha !==
      "ecc9768b0105a33f297ff5782cd5c99b79ce40ed989261946f891c7ef52ffe4e";
  if (!result.asset.pass) result.defects.push("runtime symbol still fails color/alpha sanity");
  else result.fixed.push("replaced defective near-black 168:2 plate with true-alpha colorful mark");

  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    await page.goto(`${WEB}/?opal_reset_first_run=1`, {
      waitUntil: "networkidle",
      timeout: 90000,
    });
    await page.waitForSelector('[data-testid="fr00-splash"]', { timeout: 30000 });
    await sleep(800);

    const splashShot = resolve(OUT, "shots/FR00_SPLASH.png");
    await page.screenshot({ path: splashShot, fullPage: false });

    const mark = page.locator('.fr-splash-mark img, img[data-brand-role="core-mark"]').first();
    const markBox = await mark.boundingBox();
    const markStyles = await mark.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        src: el.getAttribute("src"),
        opacity: cs.opacity,
        filter: cs.filter,
        mixBlendMode: cs.mixBlendMode,
        width: cs.width,
        height: cs.height,
        visibility: cs.visibility,
      };
    });
    result.splash.markBox = markBox;
    result.splash.markStyles = markStyles;
    result.splash.markVisible =
      !!markBox &&
      markBox.width > 80 &&
      markBox.height > 80 &&
      Number(markStyles.opacity) > 0.5 &&
      markStyles.visibility !== "hidden";

    const cropPath = resolve(OUT, "shots/FR00_LOGO_CROP.png");
    await page.locator(".fr-splash-mark").screenshot({ path: cropPath });
    result.splash.logoCropStats = analyzePngBuffer(readFileSync(cropPath));
    result.splash.logoColorPass =
      result.splash.logoCropStats.colored > 400 &&
      result.splash.logoCropStats.maxc > 150;
    if (!result.splash.logoColorPass) result.defects.push("FR00 logo crop overwhelmingly dark/black");
    else result.fixed.push("FR00 logo crop contains visible spectral color");

    const tap = page.locator(".fr-splash-tap").first();
    const tapStyles = await tap.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        text: el.textContent?.trim(),
        color: cs.color,
        borderTopWidth: cs.borderTopWidth,
        borderRadius: cs.borderRadius,
        background: cs.backgroundColor,
        boxShadow: cs.boxShadow,
        fontSize: cs.fontSize,
      };
    });
    const tapBox = await tap.boundingBox();
    result.tap.styles = tapStyles;
    result.tap.box = tapBox;
    const rgb = tapStyles.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    result.tap.cyan = !!rgb && Number(rgb[2]) > 180 && Number(rgb[3]) > 180 && Number(rgb[1]) < 190;
    result.tap.textOnly =
      tapStyles.text === "Tap to begin" &&
      (tapStyles.borderRadius === "0px" || Number.parseFloat(tapStyles.borderRadius) < 4) &&
      Number.parseFloat(tapStyles.borderTopWidth || "0") === 0 &&
      /rgba\(0,\s*0,\s*0,\s*0\)|transparent/.test(tapStyles.background);
    result.tap.pass = result.tap.textOnly && result.tap.cyan && (tapBox?.y || 0) > 600;
    if (!result.tap.pass) result.defects.push("Tap to begin visual fidelity failed");
    else result.fixed.push("Tap to begin is plain cyan text without fat pill");

    const t0 = Date.now();
    await page.getByTestId("fr00-splash").click();
    await page.waitForSelector('[data-testid="fr01-world"]', { timeout: 5000 });
    result.tap.clickAdvancesOnce = true;

    const seen = { fr01: true, fr02: false, fr03: false, fr04: false, fr05: false };
    const deadlines = Date.now() + 22000;
    while (Date.now() < deadlines) {
      const step = await page.getAttribute('[data-testid="first-run-walkthrough"]', "data-fr-step");
      if (step === "fr02") seen.fr02 = true;
      if (step === "fr03") seen.fr03 = true;
      if (step === "fr04") seen.fr04 = true;
      if (step === "fr05") {
        seen.fr05 = true;
        break;
      }
      const wizardContinue = await page.locator('[data-testid="fr01-continue"], [data-testid="fr02-continue"], [data-testid="fr03-continue"], [data-testid="fr04-continue"]').count();
      if (wizardContinue > 0) result.defects.push(`wizard Continue still present on ${step}`);
      await sleep(200);
    }
    const demoMs = Date.now() - t0;
    result.autoplay.seen = seen;
    result.autoplay.durationMs = demoMs;
    result.autoplay.pass =
      seen.fr01 && seen.fr02 && seen.fr03 && seen.fr04 && seen.fr05 && demoMs >= 7000 && demoMs <= 20000;
    await page.screenshot({ path: resolve(OUT, "shots/FR05_CONVERSION.png"), fullPage: false });
    for (const id of ["fr01", "fr02", "fr03", "fr04"]) {
      // intermediate shots already may have passed; capture FR05 only is fine
    }
    if (!result.autoplay.pass) result.defects.push("cinematic autoplay did not reach FR05 cleanly");
    else result.fixed.push("FR01-FR04 cinematic autoplay reached FR05 without Continue");

    await sleep(3500);
    const still = await page.getAttribute('[data-testid="first-run-walkthrough"]', "data-fr-step");
    result.fr05.stillFr05 = still === "fr05";
    result.fr05.hasPhoneCta = await page.getByTestId("fr05-continue-phone").isVisible();
    result.fr05.hasAccountCta = await page.getByTestId("fr05-already-account").isVisible();
    result.fr05.pass = result.fr05.stillFr05 && result.fr05.hasPhoneCta && result.fr05.hasAccountCta;
    if (!result.fr05.pass) result.defects.push("FR05 did not stop at conversion gate");
    else result.fixed.push("FR05 stops for Continue with phone / already have account");
    await ctx.close();

    const vctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      recordVideo: { dir: resolve(OUT, "shots"), size: { width: 390, height: 844 } },
    });
    const vpage = await vctx.newPage();
    await vpage.goto(`${WEB}/?opal_reset_first_run=1`, { waitUntil: "networkidle", timeout: 90000 });
    await vpage.waitForSelector('[data-testid="fr00-splash"]', { timeout: 30000 });
    await sleep(400);
    await vpage.getByTestId("fr00-splash").click();
    await vpage.waitForSelector('[data-testid="fr05-start"]', { timeout: 25000 });
    await sleep(1000);
    const video = vpage.video();
    await vctx.close();
    if (video) {
      const videoPath = await video.path();
      const dest = resolve(OUT, "shots/CINEMATIC_DEMO.webm");
      copyFileSync(videoPath, dest);
      result.autoplay.video = "shots/CINEMATIC_DEMO.webm";
    }

    const rctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    const rpage = await rctx.newPage();
    await rpage.goto(`${WEB}/?opal_reset_first_run=1`, { waitUntil: "networkidle", timeout: 90000 });
    await rpage.waitForSelector('[data-testid="fr00-splash"]', { timeout: 30000 });
    const rt0 = Date.now();
    await rpage.getByTestId("fr00-splash").click();
    await rpage.waitForSelector('[data-testid="fr05-start"]', { timeout: 8000 });
    result.reducedMotion.durationMs = Date.now() - rt0;
    result.reducedMotion.pass = result.reducedMotion.durationMs < 5000;
    await rctx.close();
    if (!result.reducedMotion.pass) result.defects.push("reduced motion path too slow");
    else result.fixed.push("reduced motion reaches FR05 quickly");

    // Member path via cinematic then auth
    const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mpage = await mctx.newPage();
    let devCode = "111111";
    mpage.on("response", async (res) => {
      try {
        if (res.url().includes("/challenges") && res.request().method() === "POST") {
          const j = await res.json();
          if (j.development_code) devCode = j.development_code;
        }
      } catch {
        /* ignore */
      }
    });
    await mpage.goto(`${WEB}/?opal_reset_first_run=1`, { waitUntil: "networkidle", timeout: 90000 });
    await mpage.getByTestId("fr00-splash").click();
    await mpage.waitForSelector('[data-testid="fr05-continue-phone"]', { timeout: 25000 });
    await mpage.getByTestId("fr05-continue-phone").click();
    await mpage.waitForSelector('[data-testid="fr06-phone-input"]', { timeout: 10000 });
    await mpage.getByTestId("fr06-phone-input").fill("2025550101");
    const consent = mpage.getByTestId("fr06-otp-consent");
    if (await consent.isVisible().catch(() => false)) await consent.check();
    await mpage.getByTestId("fr06-continue").click();
    await mpage.waitForSelector('[data-testid="fr07-code-input"]', { timeout: 20000 });
    await sleep(400);
    const hint = await mpage.getByTestId("fr07-dev-code").textContent().catch(() => "");
    const m = (hint || "").match(/\d{6}/);
    await mpage.getByTestId("fr07-code-input").fill(m?.[0] || devCode);
    await mpage.getByTestId("fr07-submit").click();
    await mpage.waitForSelector('[data-testid="fr08-name-input"]', { timeout: 20000 });
    await mpage.getByTestId("fr08-name-input").fill("Founder Review");
    await mpage.getByTestId("fr08-continue").click();
    await mpage.waitForSelector('[data-testid="fr09-not-now"]', { timeout: 15000 });
    await mpage.getByTestId("fr09-not-now").click();
    await sleep(1200);

    const brand = mpage.locator('[data-testid="gsh-brand"], .gsh-brand').first();
    result.memberBrand.visible = await brand.isVisible({ timeout: 10000 }).catch(() => false);
    if (result.memberBrand.visible) {
      result.memberBrand.html = await brand.innerHTML();
      result.memberBrand.hasMark = /opal-mark|symbol-transparent|core-mark/.test(result.memberBrand.html);
      result.memberBrand.hasWord =
        /opal-graph-word-opal|Opal/.test(result.memberBrand.html) && /Graph/.test(result.memberBrand.html);
      await mpage.screenshot({ path: resolve(OUT, "shots/MEMBER_HOME_BRAND.png"), fullPage: false });
    }
    result.memberBrand.pass = !!result.memberBrand.visible && !!result.memberBrand.hasMark && !!result.memberBrand.hasWord;

    const kinds = await mpage
      .evaluate(() => Array.from(document.querySelectorAll("[data-kind]")).map((el) => el.getAttribute("data-kind")))
      .catch(() => []);
    const people = await mpage
      .evaluate(() =>
        Array.from(document.querySelectorAll(".gsh-card-who strong, [data-testid^=gsh-person-]")).map((el) =>
          (el.textContent || "").trim(),
        ),
      )
      .catch(() => []);
    result.homeFeed.kinds = kinds;
    result.homeFeed.memory = kinds.filter((k) => k === "memory").length;
    result.homeFeed.graph = kinds.filter((k) => k === "graph").length;
    result.homeFeed.live = kinds.filter((k) => k === "live").length;
    result.homeFeed.near = kinds.filter((k) => k === "near").length;
    result.homeFeed.uniquePeople = [...new Set(people.filter(Boolean))];
    result.homeFeed.pass =
      result.homeFeed.memory >= result.homeFeed.graph &&
      result.homeFeed.memory > 0 &&
      result.homeFeed.uniquePeople.length >= 3;

    // scroll video
    const sctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      recordVideo: { dir: resolve(OUT, "shots"), size: { width: 390, height: 844 } },
    });
    // reuse auth cookies if any - open home directly after storage transfer is hard; scroll current page instead
    await mpage.evaluate(async () => {
      const scroller = document.querySelector("[data-testid=gsh-feed], .gsh-feed, main") || document.scrollingElement;
      if (!scroller) return;
      for (let i = 0; i < 8; i++) {
        scroller.scrollBy?.(0, 280);
        await new Promise((r) => setTimeout(r, 200));
      }
    }).catch(() => {});
    await mpage.screenshot({ path: resolve(OUT, "shots/HOME_FEED_SCROLLED.png"), fullPage: false });
    await sctx.close();
    await mctx.close();
  } finally {
    await browser.close();
  }

  result.pass =
    result.asset.pass &&
    result.splash.logoColorPass &&
    result.splash.markVisible &&
    result.tap.pass &&
    result.autoplay.pass &&
    result.fr05.pass &&
    result.reducedMotion.pass;

  writeFileSync(resolve(OUT, "CINEMATIC_PROOF.json"), JSON.stringify(result, null, 2));
  writeFileSync(
    resolve(OUT, "CINEMATIC_PROOF.md"),
    `# Cinematic first-run proof\n\n**HOLD. DO NOT MERGE.**\n\nAt: ${result.at}\n\n## Black-logo root cause\nFigma \`168:2\` IMAGE FILL was an opaque near-black plate (SHA \`ecc9768b…\`, max channel ~51, zero alpha). Splash \`217:6\` uses the colorful vector brand master. Runtime rendered the black plate, so the mark looked black/invisible on Living Void.\n\n## Asset after repair\n- Path: \`${result.asset.runtimePath}\`\n- SHA-256: \`${result.asset.runtimeSha}\`\n- Stats: \`${JSON.stringify(result.asset.runtimeStats)}\`\n- Defective archive SHA: \`${result.asset.defectiveSha}\`\n\n## Results\n| Check | Pass |\n|------|------|\n| Asset color/alpha | ${result.asset.pass} |\n| Splash mark visible | ${result.splash.markVisible} |\n| Logo crop colored | ${result.splash.logoColorPass} |\n| Tap to begin text-only cyan | ${result.tap.pass} |\n| Autoplays FR01→FR05 | ${result.autoplay.pass} (${result.autoplay.durationMs}ms) |\n| FR05 stops | ${result.fr05.pass} |\n| Reduced motion | ${result.reducedMotion.pass} (${result.reducedMotion.durationMs}ms) |\n| Member brand | ${result.memberBrand.pass} |\n| Home feed memory-heavy | ${result.homeFeed.pass} |\n\n## Home feed counts\nMemory ${result.homeFeed.memory} / Graph ${result.homeFeed.graph} / Live ${result.homeFeed.live} / Near ${result.homeFeed.near}\nPeople: ${(result.homeFeed.uniquePeople || []).join(", ")}\n\n## Defects found\n${(result.defects.map((d) => `- ${d}`).join("\n") || "- none")}\n\n## Defects fixed\n${(result.fixed.map((d) => `- ${d}`).join("\n") || "- none")}\n\n**OVERALL PASS (P0 cinematic):** ${result.pass}\n`,
  );
  console.log(JSON.stringify({ pass: result.pass, out: OUT, defects: result.defects, autoplayMs: result.autoplay.durationMs }, null, 2));
  if (!result.pass) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
