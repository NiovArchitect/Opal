/**
 * Repair #18 C2 shell - rendered evidence capture.
 * Serves: the worktree vite dev server must already run on :5199.
 * Captures at phone viewport 390x844, both modes, OLD-vs-NEW pairs,
 * the dark night path with pixel brightness stats, story-sheet
 * hit-tests, and Graphs no-truncation assertions.
 * Output: ~/workspace/opal-graph/wt-c2-shell/shots/repair18/c2/
 */
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = "http://127.0.0.1:5200";
const OUT = "/home/hatch/workspace/opal-graph/wt-c2-shell/shots/repair18/c2";
mkdirSync(OUT, { recursive: true });

const results = { shots: [], assertions: [], brightness: [] };

const browser = await chromium.launch({
  executablePath:
    "/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell",
  args: ["--no-sandbox"],
});

async function page(mode) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: mode,
    reducedMotion: "reduce",
  });
  const p = await ctx.newPage();
  return { ctx, p };
}

async function shot(ctx, p, name) {
  await p.waitForTimeout(450);
  await p.screenshot({ path: `${OUT}/${name}.png` });
  results.shots.push(name);
}

function brightnessFromPixels(rgba, w, h) {
  // Sample every 4th pixel; report mean HSL lightness and the share
  // of pixels above the 17% large-area night cap (section 2.7).
  let sum = 0;
  let n = 0;
  let above = 0;
  for (let i = 0; i < rgba.length; i += 16) {
    const r = rgba[i] / 255;
    const g = rgba[i + 1] / 255;
    const b = rgba[i + 2] / 255;
    const l = (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
    sum += l;
    n += 1;
    if (l > 0.17) above += 1;
  }
  return {
    meanLightnessPct: Math.round((sum / n) * 1000) / 10,
    pctPixelsAbove17: Math.round((above / n) * 1000) / 10,
    sampledPixels: n,
    width: w,
    height: h,
  };
}

async function measureBrightness(p, label) {
  const buf = await p.screenshot();
  const stats = await p.evaluate(async (dataUrl) => {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = dataUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const cx = canvas.getContext("2d");
    cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, canvas.width, canvas.height);
    return { data: Array.from(d.data), w: canvas.width, h: canvas.height };
  }, `data:image/png;base64,${buf.toString("base64")}`);
  const stats2 = brightnessFromPixels(stats.data, stats.w, stats.h);
  results.brightness.push({ label, ...stats2 });
}

// ---------- OLD (R17 fallback face, no shell flag) ----------
{
  const { ctx, p } = await page("dark");
  await p.goto(`${BASE}/?opal_force_splash=1`, { waitUntil: "networkidle" }).catch(() => {});
  await shot(ctx, p, "old-splash1-dark");
  await p.goto(`${BASE}/?promise_isolation=1`, { waitUntil: "networkidle" }).catch(() => {});
  await shot(ctx, p, "old-splash2-dark");
  await ctx.close();
}

// ---------- NEW shell path (real C2Shell, no backend: honest states) ----------
for (const mode of ["dark", "light"]) {
  const { ctx, p } = await page(mode);
  await ctx.addInitScript((m) => {
    try {
      localStorage.setItem("opal.c2.mode.v1", m);
    } catch {}
  }, mode);
  await p.goto(`${BASE}/?shell=c2&opal_dev=1`, { waitUntil: "networkidle" }).catch(() => {});
  await shot(ctx, p, `new-splash1-${mode}`);
  results.assertions.push({
    name: `splash1-enter-opal-count-${mode}`,
    pass: (await p.locator("body").innerText()).split("Enter Opal").length - 1 === 0,
  });
  if (mode === "dark") await measureBrightness(p, "night-splash1");
  await p.getByTestId("c2-splash1-continue").click();
  await shot(ctx, p, `new-splash2-${mode}`);
  const splash2Text = await p.locator("body").innerText();
  results.assertions.push({
    name: `splash2-enter-opal-count-${mode}`,
    pass: splash2Text.split("Enter Opal").length - 1 === 1,
  });
  if (mode === "dark") await measureBrightness(p, "night-splash2");
  await p.getByTestId("c2-splash2-already").click();
  await shot(ctx, p, `new-onboarding-phone-${mode}`);
  if (mode === "dark") await measureBrightness(p, "night-onboarding-phone");
  await ctx.close();
}

// ---------- NEW member shell (seeded session locally; API absent ->
// honest empty states on the REAL shell path, both modes) ----------
for (const mode of ["dark", "light"]) {
  const { ctx, p } = await page(mode);
  await ctx.addInitScript((m) => {
    try {
      localStorage.setItem("opal.c2.mode.v1", m);
      localStorage.setItem(
        "opal.product.profile.v17",
        JSON.stringify({
          user_id: "review-user",
          display_name: "Sadeil Lewis",
          handle: "sadeil",
          session_id: "review-session",
        }),
      );
      sessionStorage.setItem("opal.product.browser_session.v1", "review-token");
    } catch {}
  }, mode);
  await p.goto(`${BASE}/?shell=c2&opal_dev=1`, { waitUntil: "networkidle" }).catch(() => {});
  await p.waitForTimeout(900);
  await shot(ctx, p, `new-center-${mode}`);
  if (mode === "dark") await measureBrightness(p, "night-center");
  await p.getByTestId("c2-dock-home").click();
  await p.waitForTimeout(900);
  await shot(ctx, p, `new-home-${mode}`);
  if (mode === "dark") await measureBrightness(p, "night-home");
  // Story chooser hit-test on the real shell (escalation s4 / A2):
  const selfCell = p.getByTestId("c2-story-self");
  if ((await selfCell.count()) > 0) {
    await selfCell.click();
    await p.waitForTimeout(400);
    const hit = await p.evaluate(() => {
      const row = document.querySelector('[data-testid="c2-create-sheet-story"]');
      if (!row) return { found: false };
      const r = row.getBoundingClientRect();
      const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return {
        found: true,
        hitIsRow: el === row || row.contains(el),
        inViewport: r.top >= 0 && r.bottom <= window.innerHeight,
        sheetInBody:
          document.querySelector('[data-testid="c2-create-sheet"]')?.closest("[data-top-layer]") != null,
      };
    });
    results.assertions.push({ name: `story-chooser-hittest-${mode}`, ...hit, pass: Boolean(hit.hitIsRow && hit.inViewport && hit.sheetInBody) });
    await shot(ctx, p, `new-home-createsheet-${mode}`);
    await p.getByTestId("c2-create-sheet-cancel").click();
  } else {
    results.assertions.push({ name: `story-chooser-hittest-${mode}`, pass: false, note: "self cell not rendered" });
  }
  await p.getByTestId("c2-dock-graphs").click();
  await p.waitForTimeout(600);
  await shot(ctx, p, `new-graphs-${mode}`);
  if (mode === "dark") await measureBrightness(p, "night-graphs");
  await p.getByTestId("c2-dock-you").click();
  await p.waitForTimeout(900);
  await shot(ctx, p, `new-you-${mode}`);
  if (mode === "dark") await measureBrightness(p, "night-you");
  await ctx.close();
}

// ---------- Review surfaces (populated projections, both modes) ----------
const REVIEW_SURFACES = ["home", "graphs", "detail", "center", "you", "settings-notifications", "settings-appearance", "onboarding"];
for (const mode of ["dark", "light"]) {
  const { ctx, p } = await page(mode);
  for (const surface of REVIEW_SURFACES) {
    await p.goto(`${BASE}/?review=c2shell&surface=${surface}&mode=${mode}`, {
      waitUntil: "networkidle",
    }).catch(() => {});
    await shot(ctx, p, `review-${surface}-${mode}`);
  }
  await ctx.close();
}

// ---------- Graphs no-truncation assertions (Walk #4 law) ----------
{
  const { ctx, p } = await page("dark");
  await p.goto(`${BASE}/?review=c2shell&surface=graphs&mode=dark`, { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  const report = await p.evaluate(() => {
    const cards = [...document.querySelectorAll(".c2-plan-card")];
    return cards.map((card) => {
      const fields = {};
      for (const sel of [".c2-plan-title", ".c2-plan-when", ".c2-plan-where", ".c2-plan-attendance"]) {
        const el = card.querySelector(sel);
        if (!el) continue;
        fields[sel] = {
          clippedY: el.scrollHeight > el.clientHeight + 1,
          clippedX: el.scrollWidth > el.clientWidth + 1,
          text: el.textContent,
        };
      }
      return { cardClipped: card.scrollHeight > card.clientHeight + 1, fields };
    });
  });
  const anyClip = report.some(
    (c) => c.cardClipped || Object.values(c.fields).some((f) => f.clippedY || f.clippedX),
  );
  results.assertions.push({
    name: "graphs-no-truncation",
    pass: !anyClip,
    cardsChecked: report.length,
    detail: report,
  });
  // Grayscale state legibility pass (A7 evidence frame)
  await p.addStyleTag({ content: "html { filter: grayscale(1); }" });
  await shot(ctx, p, "review-graphs-dark-grayscale");
  await ctx.close();
}

// ---------- OLD-vs-NEW side-by-side composites ----------
{
  const { ctx, p } = await page("dark");
  await p.setViewportSize({ width: 800, height: 870 });
  for (const pair of [
    ["old-splash1-dark", "new-splash1-dark", "pair-splash1"],
    ["old-splash2-dark", "new-splash2-dark", "pair-splash2"],
  ]) {
    await p.setContent(
      `<body style="margin:0;background:#111;display:flex;gap:10px;padding:10px">
        <img src="file://${OUT}/${pair[0]}.png" style="width:385px">
        <img src="file://${OUT}/${pair[1]}.png" style="width:385px">
      </body>`,
    );
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/${pair[2]}.png` });
    results.shots.push(pair[2]);
  }
  await ctx.close();
}

writeFileSync(`${OUT}/capture-results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify({
  shots: results.shots.length,
  assertions: results.assertions.map((a) => ({ name: a.name, pass: a.pass })),
  brightness: results.brightness,
}, null, 2));
await browser.close();
