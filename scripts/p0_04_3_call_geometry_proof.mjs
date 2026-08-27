#!/usr/bin/env node
/**
 * P0-04.3 — exact call geometry vs Figma at viewport 390×844.
 * Reports viewport-absolute AND stage-relative rects.
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(
  ROOT,
  "docs/evidence/v2-coded-experience/brand-v4-coherence/p0-04-3-call-geometry",
);
const RT = resolve(OUT, "runtime");
mkdirSync(RT, { recursive: true });
mkdirSync(resolve(OUT, "figma"), { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function domClick(page, testId) {
  await page.evaluate((id) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (!el) throw new Error("missing " + id);
    el.click();
  }, testId);
}

const require = createRequire(import.meta.url);
const { chromium } = require(resolve(ROOT, "apps/opal_web/node_modules/playwright"));

const FIGMA = {
  audio: {
    portrait: { x: 24, y: 132, w: 342, h: 404 },
    assist: { x: 20, y: 554, w: 350, h: 76 },
    mute: { x: 20, y: 662, w: 104, h: 44 },
    video: { x: 143, y: 662, w: 104, h: 44 },
    speaker: { x: 266, y: 662, w: 104, h: 44 },
    end: { x: 146, y: 736, w: 98, h: 46 },
  },
  video: {
    stage: { x: 16, y: 154, w: 358, h: 458 },
    assist: { x: 20, y: 626, w: 350, h: 50 },
    rail: { x: 16, y: 692, w: 358, h: 64 },
    mute: { x: 22, y: 699, w: 80, h: 48 },
    video: { x: 108, y: 699, w: 80, h: 48 },
    speaker: { x: 194, y: 699, w: 80, h: 48 },
    end: { x: 280, y: 699, w: 80, h: 48 },
  },
  group: {
    sadeil: { x: 20, y: 162, w: 168, h: 166 },
    chanelle: { x: 202, y: 162, w: 168, h: 166 },
    maya: { x: 20, y: 346, w: 168, h: 166 },
    jordan: { x: 202, y: 346, w: 168, h: 166 },
    assist: { x: 20, y: 532, w: 350, h: 72 },
    rail: { x: 16, y: 636, w: 358, h: 64 },
    mute: { x: 22, y: 643, w: 80, h: 48 },
    video: { x: 108, y: 643, w: 80, h: 48 },
    speaker: { x: 194, y: 643, w: 80, h: 48 },
    end: { x: 280, y: 643, w: 80, h: 48 },
  },
  incoming: {
    avatar: { x: 115, y: 188, w: 160, h: 160 },
    assist: { x: 20, y: 426, w: 350, h: 112 },
    decline: { x: 34, y: 632, w: 150, h: 56 },
    answer: { x: 206, y: 632, w: 150, h: 56 },
  },
};

function delta(a, b) {
  if (!a || !b) return null;
  return {
    dx: a.x - b.x,
    dy: a.y - b.y,
    dw: a.w - b.w,
    dh: a.h - b.h,
    maxAbs: Math.max(
      Math.abs(a.x - b.x),
      Math.abs(a.y - b.y),
      Math.abs(a.w - b.w),
      Math.abs(a.h - b.h),
    ),
  };
}

function withinTol(d, tol = 2) {
  return d && d.maxAbs <= tol;
}

async function measure(page) {
  return page.evaluate(() => {
    const surface = document.querySelector('[data-testid="call-surface"]');
    if (!surface) return { visible: false };
    const sr = surface.getBoundingClientRect();
    const pick = (sel) => {
      const el = surface.querySelector(sel) || document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        viewport: {
          x: Math.round(r.left),
          y: Math.round(r.top),
          w: Math.round(r.width),
          h: Math.round(r.height),
        },
        stage: {
          x: Math.round(r.left - sr.left),
          y: Math.round(r.top - sr.top),
          w: Math.round(r.width),
          h: Math.round(r.height),
        },
      };
    };
    const labels = [...surface.querySelectorAll("button")].map((b) =>
      (b.getAttribute("aria-label") || b.textContent || "").trim(),
    );
    return {
      visible: true,
      kind: surface.getAttribute("data-call-kind"),
      figma: surface.getAttribute("data-figma-node"),
      flipPresent: labels.some((l) => /^Flip$/i.test(l)),
      dock: !!document.querySelector('[data-testid="member-tabbar"]'),
      stageRect: {
        x: Math.round(sr.left),
        y: Math.round(sr.top),
        w: Math.round(sr.width),
        h: Math.round(sr.height),
      },
      mute: pick('[data-testid="call-mute"]'),
      video: pick('[data-testid="call-video-toggle"]'),
      speaker: pick('[data-testid="call-speaker"]'),
      end: pick('[data-testid="call-end"]'),
      decline: pick('[data-testid="call-decline"]'),
      answer: pick('[data-testid="call-answer"]'),
      portrait: pick('[data-testid="call-audio-portrait"]'),
      videoStage: pick('[data-testid="call-video-stage"]'),
      assist: pick('[data-testid="call-opal-assist"]'),
      rail: pick('[data-testid="call-controls"].call-exact-rail, .call-exact-rail'),
      slots: [0, 1, 2, 3].map((i) => pick(`[data-testid="call-group-slot-${i}"]`)),
      labels,
    };
  });
}

async function ensureHome(page) {
  await page.goto(`${WEB}/?opal_reset_first_run=1&opal_founder_seed=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await sleep(800);
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
  const phone = page.locator('[data-testid="fr06-phone-input"]').first();
  if (await phone.isVisible().catch(() => false)) {
    await phone.fill("+12025550101");
    await page.locator("#otp-consent, [data-testid=fr06-otp-consent]").first().check().catch(() => {});
    await page.getByTestId("fr06-continue").click();
    await page.waitForSelector('[data-testid="fr07-code-input"]', { timeout: 25000 });
    await page.fill('[data-testid="fr07-code-input"]', devCode);
    await page.getByTestId("fr07-submit").click();
    for (let i = 0; i < 50; i++) {
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
  }
  await page.getByTestId("member-tab-home").waitFor({ timeout: 45000 });
}

async function leaveCallToHome(page) {
  if (await page.getByTestId("call-end").count()) await domClick(page, "call-end").catch(() => {});
  if (await page.getByTestId("call-decline").count())
    await domClick(page, "call-decline").catch(() => {});
  await sleep(300);
  await page.locator(".gpt-back, [aria-label=Back]").first().click().catch(() => {});
  await sleep(300);
  if (await page.getByTestId("member-tab-home").count()) {
    await page.getByTestId("member-tab-home").click().catch(() => {});
  }
  await sleep(400);
}

async function openChat(page, preferGroup = false) {
  await page.getByTestId("member-tab-chats").click();
  await page.waitForSelector('[data-testid^="chats-row-"]', { timeout: 30000 });
  const rows = page.locator('[data-testid^="chats-row-"]');
  const n = await rows.count();
  let picked = null;
  for (let i = 0; i < Math.min(n, 80); i++) {
    const row = rows.nth(i);
    const kind = await row.getAttribute("data-kind").catch(() => null);
    const text = (await row.innerText().catch(() => "")) || "";
    const isGroup = kind === "group" || /· Group/i.test(text);
    if (preferGroup ? isGroup : !isGroup) {
      picked = row;
      break;
    }
  }
  if (!picked) picked = rows.first();
  await picked.click();
  await sleep(700);
  await page.waitForSelector('[data-testid="member-conversation"]', { timeout: 15000 });
}

function scoreMap(runtimeStage, figmaMap) {
  const out = {};
  let ok = true;
  for (const [k, fig] of Object.entries(figmaMap)) {
    const rt = runtimeStage[k]?.stage || runtimeStage[k];
    const d = delta(rt, fig);
    const pass = withinTol(d, 2);
    if (!pass) ok = false;
    out[k] = { figma: fig, runtime: rt, delta: d, pass };
  }
  return { rows: out, ok };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1, // CSS px == layout px for geometry proof
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });

  await ensureHome(page);
  await page.screenshot({ path: resolve(RT, "HOME.png") });

  // VIDEO
  await openChat(page, false);
  await domClick(page, "gpt-video");
  await sleep(600);
  let videoM = await measure(page);
  await page.screenshot({ path: resolve(RT, "VIDEO_618_620.png") });
  const videoScore = scoreMap(
    {
      stage: videoM.videoStage,
      assist: videoM.assist,
      rail: videoM.rail,
      mute: videoM.mute,
      video: videoM.video,
      speaker: videoM.speaker,
      end: videoM.end,
    },
    FIGMA.video,
  );
  await leaveCallToHome(page);

  // AUDIO via incoming → answer
  await openChat(page, false);
  await domClick(page, "gpt-call");
  await sleep(500);
  const incomingM = await measure(page);
  await page.screenshot({ path: resolve(RT, "INCOMING_618_581.png") });
  const incomingScore = scoreMap(
    {
      avatar: incomingM.portrait || incomingM.slots?.[0] || null,
      // remap
    },
    {},
  );
  // incoming specific
  const incomingRows = {
    avatar: {
      figma: FIGMA.incoming.avatar,
      runtime: (await measure(page)).assist && null,
    },
  };
  // re-measure incoming pieces
  const inc = await measure(page);
  const incomingFull = scoreMap(
    {
      avatar: {
        stage: (
          await page.evaluate(() => {
            const surface = document.querySelector('[data-testid="call-surface"]');
            const el = surface?.querySelector('[data-testid="call-incoming-avatar"]');
            if (!el || !surface) return null;
            const r = el.getBoundingClientRect();
            const sr = surface.getBoundingClientRect();
            return {
              x: Math.round(r.left - sr.left),
              y: Math.round(r.top - sr.top),
              w: Math.round(r.width),
              h: Math.round(r.height),
            };
          })
        ),
      },
      assist: inc.assist,
      decline: inc.decline,
      answer: inc.answer,
    },
    FIGMA.incoming,
  );

  await domClick(page, "call-answer");
  await sleep(500);
  const audioM = await measure(page);
  await page.screenshot({ path: resolve(RT, "AUDIO_618_599.png") });
  const audioScore = scoreMap(
    {
      portrait: audioM.portrait,
      assist: audioM.assist,
      mute: audioM.mute,
      video: audioM.video,
      speaker: audioM.speaker,
      end: audioM.end,
    },
    FIGMA.audio,
  );
  await leaveCallToHome(page);

  // GROUP
  await openChat(page, true);
  await domClick(page, "gpt-video");
  await sleep(600);
  let groupM = await measure(page);
  if (groupM.kind !== "group") {
    await leaveCallToHome(page);
    await openChat(page, true);
    await domClick(page, "gpt-call");
    await sleep(400);
    if (await page.getByTestId("call-answer").count()) await domClick(page, "call-answer");
    await sleep(400);
    // force group by video if needed — state may be audio; open video again
  }
  // Prefer reopening with video for group kind
  if (groupM.kind !== "group") {
    await leaveCallToHome(page);
    await openChat(page, true);
    await domClick(page, "gpt-video");
    await sleep(600);
    groupM = await measure(page);
  }
  await page.screenshot({ path: resolve(RT, "GROUP_618_642.png") });
  const groupScore = scoreMap(
    {
      sadeil: groupM.slots?.[0],
      chanelle: groupM.slots?.[1],
      maya: groupM.slots?.[2],
      jordan: groupM.slots?.[3],
      assist: groupM.assist,
      rail: groupM.rail,
      mute: groupM.mute,
      video: groupM.video,
      speaker: groupM.speaker,
      end: groupM.end,
    },
    FIGMA.group,
  );

  // Teardown
  await domClick(page, "call-end").catch(() => {});
  await sleep(300);
  await leaveCallToHome(page);
  const teardown = {
    callGone: (await page.locator('[data-testid="call-surface"]').count()) === 0,
    dock: (await page.locator('[data-testid="member-tabbar"]').count()) > 0,
  };

  // Settings smoke
  await page.getByTestId("member-tab-you").click();
  await sleep(400);
  await page.getByTestId("you-hub-row-spending-fit").click();
  await sleep(300);
  const spending = (await page.locator('[data-testid="you-setting-spending-fit"]').count()) > 0;
  await page.getByTestId("you-setting-back").click();
  await page.getByTestId("you-hub-row-account-security").click();
  await sleep(300);
  const account = (await page.locator('[data-testid="you-setting-account-security"]').count()) > 0;
  await page.getByTestId("you-setting-row-delete-account").click();
  await sleep(300);
  const del = (await page.locator('[data-testid="you-setting-delete-account"]').count()) > 0;

  // Graphs Action
  await page.getByTestId("member-tab-graphs").click();
  await sleep(400);
  const chips = await page.evaluate(() =>
    [...document.querySelectorAll(".gsh-chip")].map((e) => (e.textContent || "").trim()),
  );

  const pid = process.env.VITE_PID || null;
  const result = {
    HOLD: true,
    FOUNDER_WALK_READY: "NO",
    coordinateSystem: {
      viewport: "390x844 deviceScaleFactor=1",
      stage: "call-surface.call-exact-390 fixed 390x844 centered",
      note: "At 390×844, stage origin ≈ viewport origin (centered). stage-relative should equal Figma. Prior P0-04.2 'call-relative' mixed flex layout offsets with no locked stage — hence y+24 / w-16 errors.",
    },
    video: { measure: videoM, score: videoScore, flipAbsent: videoM && !videoM.flipPresent },
    audio: { measure: audioM, score: audioScore },
    group: { measure: groupM, score: groupScore },
    incoming: { measure: inc, score: incomingFull },
    teardown,
    settings: { spending, account, deleteAccount: del },
    graphsChips: chips,
    consoleErrors: consoleErrors.slice(0, 20),
  };

  const allOk =
    videoScore.ok &&
    audioScore.ok &&
    groupScore.ok &&
    incomingFull.ok &&
    !videoM.flipPresent &&
    teardown.callGone &&
    teardown.dock &&
    spending &&
    account &&
    del &&
    chips.includes("Action") &&
    !chips.some((c) => /needs you/i.test(c));

  result.FOUNDER_WALK_READY = allOk ? "YES" : "NO";
  result.gates = {
    videoOk: videoScore.ok,
    audioOk: audioScore.ok,
    groupOk: groupScore.ok,
    incomingOk: incomingFull.ok,
    teardownOk: teardown.callGone && teardown.dock,
    settingsOk: spending && account && del,
    graphsOk: chips.includes("Action"),
  };

  writeFileSync(resolve(OUT, "GEOMETRY_PROOF.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  if (!allOk) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
