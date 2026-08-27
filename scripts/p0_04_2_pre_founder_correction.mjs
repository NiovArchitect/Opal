#!/usr/bin/env node
/**
 * P0-04.2 PRE-FOUNDER CORRECTION proof
 * HOLD · DO NOT MERGE · FOUNDER_WALK_READY starts NO until green
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(
  ROOT,
  "docs/evidence/v2-coded-experience/brand-v4-coherence/p0-04-2-pre-founder-correction",
);
const RT = resolve(OUT, "runtime");
const STORAGE = resolve(
  ROOT,
  "docs/evidence/v2-coded-experience/brand-v4-coherence/p0-04-1-pre-founder-validation/runtime/storage_state.json",
);
const BASE_STORAGE = resolve(
  ROOT,
  "docs/evidence/v2-coded-experience/brand-v4-coherence/p0-baseline-coherence/runtime/storage_state.json",
);

mkdirSync(RT, { recursive: true });
mkdirSync(resolve(OUT, "figma"), { recursive: true });
mkdirSync(resolve(OUT, "diff"), { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const require = createRequire(import.meta.url);
const { chromium } = require(resolve(ROOT, "apps/opal_web/node_modules/playwright"));

function shot(page, name) {
  return page.screenshot({ path: resolve(RT, name), fullPage: false });
}

async function measureControls(page) {
  return page.evaluate(() => {
    const surface = document.querySelector('[data-testid="call-surface"]');
    if (!surface) return { visible: false };
    const rect = (sel) => {
      const el = surface.querySelector(sel) || document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const sr = surface.getBoundingClientRect();
      return {
        x: Math.round(r.left - sr.left),
        y: Math.round(r.top - sr.top),
        w: Math.round(r.width),
        h: Math.round(r.height),
        label: (el.getAttribute("aria-label") || el.textContent || "").trim(),
      };
    };
    const labels = [...surface.querySelectorAll("button")].map((b) =>
      (b.getAttribute("aria-label") || b.textContent || "").trim(),
    );
    return {
      visible: true,
      kind: surface.getAttribute("data-call-kind"),
      figma: surface.getAttribute("data-figma-node"),
      flipAttr: surface.getAttribute("data-flip-present"),
      dock: !!document.querySelector('[data-testid="member-tabbar"]'),
      flipPresent: labels.some((l) => /^Flip$/i.test(l)) || !!surface.querySelector('[data-testid="call-flip"]'),
      mute: rect('[data-testid="call-mute"]'),
      video: rect('[data-testid="call-video-toggle"]'),
      speaker: rect('[data-testid="call-speaker"]'),
      end: rect('[data-testid="call-end"]'),
      labels,
      groupSlots: [...surface.querySelectorAll("[data-participant]")].map((el) => ({
        name: el.getAttribute("data-participant"),
        ...(() => {
          const r = el.getBoundingClientRect();
          return { w: Math.round(r.width), h: Math.round(r.height) };
        })(),
      })),
      cs: {
        pos: getComputedStyle(surface).position,
        z: getComputedStyle(surface).zIndex,
        bg: getComputedStyle(surface).backgroundColor,
      },
    };
  });
}

async function ensureHome(page) {
  // Prefer fresh OTP with known founder phone so product chats hydrate.
  await page.goto(`${WEB}/?opal_reset_first_run=1&opal_founder_seed=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await sleep(900);
  if (await page.getByTestId("fr00-already-account").isVisible().catch(() => false)) {
    await page.getByTestId("fr00-already-account").click();
    await sleep(500);
  } else if (await page.getByTestId("fr00-tap-begin").isVisible().catch(() => false)) {
    await page.getByTestId("fr00-tap-begin").click();
    await sleep(400);
    await page.getByTestId("opal-promise-already-account").click().catch(() => {});
    await page.getByTestId("fr00-already-account").click().catch(() => {});
    await sleep(400);
  }

  let devCode = "111111";
  page.on("response", async (res) => {
    try {
      if (res.url().includes("/activation/challenges") && res.request().method() === "POST") {
        const j = await res.json();
        if (j.development_code) devCode = j.development_code;
      }
    } catch {
      /* ignore */
    }
  });

  const phoneSel = '[data-testid="fr06-phone-input"], #phone';
  if (await page.locator(phoneSel).first().isVisible().catch(() => false)) {
    await page.locator(phoneSel).first().fill("+12025550101");
    const consent = page.locator("#otp-consent, [data-testid='fr06-otp-consent']");
    if (await consent.first().isVisible().catch(() => false)) {
      await consent.first().check().catch(() => {});
    }
    await page.getByTestId("fr06-continue").click().catch(() => {});
    await page.waitForSelector('[data-testid="fr07-code-input"], #code', { timeout: 25000 });
    await sleep(200);
    if (await page.getByTestId("fr07-code-input").isVisible().catch(() => false)) {
      await page.fill('[data-testid="fr07-code-input"]', devCode);
      await page.getByTestId("fr07-submit").click();
    } else {
      await page.fill("#code", devCode);
      await page.getByRole("button", { name: /Continue|Verify/i }).first().click();
    }
    for (let i = 0; i < 50; i++) {
      if (await page.getByTestId("member-tab-home").isVisible().catch(() => false)) break;
      if (await page.getByTestId("fr08-name-input").isVisible().catch(() => false)) {
        const n = page.getByTestId("fr08-name-input");
        if (!(await n.inputValue().catch(() => ""))) await n.fill("Founder");
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
  return "otp_founder_phone";
}

async function openChat(page, preferGroup = false) {
  await page.getByTestId("member-tab-chats").click();
  await page.waitForSelector('[data-testid="chats-home"]', { timeout: 15000 });
  await page.waitForSelector('[data-testid^="chats-row-"]', { timeout: 30000 });
  await sleep(400);
  const rows = page.locator('[data-testid^="chats-row-"]');
  const n = await rows.count();
  let picked = null;
  for (let i = 0; i < Math.min(n, 80); i++) {
    const row = rows.nth(i);
    const kind =
      (await row.getAttribute("data-kind").catch(() => null)) ||
      (await row.getAttribute("data-chat-kind").catch(() => null));
    const text = (await row.innerText().catch(() => "")) || "";
    const isGroup = kind === "group" || /· Group/i.test(text);
    if (preferGroup ? isGroup : !isGroup) {
      picked = row;
      break;
    }
  }
  if (!picked) picked = rows.first();
  await picked.click();
  await sleep(800);
  await page.waitForSelector('[data-testid="member-conversation"]', { timeout: 15000 });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  // Fresh context — OTP path hydrates product profile + conversations.
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const net401 = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() === 401) net401.push(r.url());
  });

  const login = await ensureHome(page);
  await shot(page, "HOME_390.png");

  // Graphs Action filter
  await page.getByTestId("member-tab-graphs").click();
  await sleep(500);
  const graphsChips = await page.evaluate(() =>
    [...document.querySelectorAll(".gsh-chip, [data-testid^=graphs-lens-]")].map((el) =>
      (el.textContent || "").trim(),
    ),
  );
  const graphsProof = {
    chips: graphsChips,
    hasAction: graphsChips.includes("Action"),
    hasNeedsYou: graphsChips.some((c) => /needs you/i.test(c)),
    hasNearby: graphsChips.includes("Nearby"),
  };
  await shot(page, "GRAPHS_ACTION_FILTER.png");

  // Direct → Video
  await openChat(page, false);
  await shot(page, "DIRECT_390.png");
  await page.getByTestId("gpt-video").click();
  await sleep(600);
  let videoProof = await measureControls(page);
  await shot(page, "VIDEO_CALL_618_620.png");
  // If opened as video directly; if incoming somehow, answer won't apply
  if (videoProof.kind === "incoming") {
    await page.getByTestId("call-answer").click().catch(() => {});
    await sleep(400);
    videoProof = await measureControls(page);
    await shot(page, "VIDEO_CALL_AFTER_ANSWER.png");
  }
  // End call then leave conversation (dock is absent inside conversation shell)
  if (await page.getByTestId("call-end").count()) await page.getByTestId("call-end").click();
  await sleep(400);
  const afterVideo = {
    callGone: (await page.locator('[data-testid="call-surface"]').count()) === 0,
  };
  await page.getByRole("button", { name: /^Back$/i }).click().catch(() => {});
  await page.locator(".gpt-back, [aria-label=Back]").first().click().catch(() => {});
  await sleep(400);
  // Ensure dock restored
  if (!(await page.getByTestId("member-tabbar").isVisible().catch(() => false))) {
    await page.keyboard.press("Escape").catch(() => {});
    await sleep(200);
  }
  await page.getByTestId("member-tab-home").click();
  await sleep(500);
  const afterVideoHome = {
    callGone: (await page.locator('[data-testid="call-surface"]').count()) === 0,
    dock: (await page.locator('[data-testid="member-tabbar"]').count()) > 0,
  };

  // Direct → Call (incoming) → Answer → Audio positions → End → Home
  await openChat(page, false);
  await page.getByTestId("gpt-call").click();
  await sleep(500);
  let incoming = await measureControls(page);
  await shot(page, "INCOMING_CALL.png");
  await page.getByTestId("call-answer").click();
  await sleep(500);
  const audioProof = await measureControls(page);
  await shot(page, "AUDIO_CALL_618_599.png");
  await page.getByTestId("call-end").click();
  await sleep(400);
  await page.getByRole("button", { name: /^Back$/i }).click().catch(() => {});
  await page.locator(".gpt-back, [aria-label=Back]").first().click().catch(() => {});
  await sleep(400);
  await page.getByTestId("member-tab-home").click();
  await sleep(500);

  // Group call
  await openChat(page, true);
  await shot(page, "GROUP_390.png");
  await page.getByTestId("gpt-video").click().catch(async () => {
    await page.getByTestId("gpt-call").click();
  });
  await sleep(600);
  let groupProof = await measureControls(page);
  if (groupProof.kind === "incoming") {
    await page.getByTestId("call-answer").click();
    await sleep(400);
    // force group kind if answer went to audio — open video for group
  }
  // Prefer video path for group to get grid; if still not group, try set via video button again
  if (groupProof.kind !== "group") {
    // End and reopen with video
    if (await page.getByTestId("call-end").count()) await page.getByTestId("call-end").click();
    if (await page.getByTestId("call-decline").count()) await page.getByTestId("call-decline").click();
    await sleep(300);
    await page.getByTestId("gpt-video").click();
    await sleep(600);
    groupProof = await measureControls(page);
  }
  await shot(page, "GROUP_CALL_618_642.png");
  if (await page.getByTestId("call-end").count()) await page.getByTestId("call-end").click();
  await sleep(400);
  await page.getByRole("button", { name: /^Back$/i }).click().catch(() => {});
  await page.locator(".gpt-back, [aria-label=Back]").first().click().catch(() => {});
  await sleep(400);

  // Settings depth
  await page.getByTestId("member-tab-you").click();
  await sleep(500);
  await shot(page, "YOU_HUB.png");
  const youRows = await page.evaluate(() =>
    [...document.querySelectorAll("[data-testid^=you-hub-row-]")].map((el) =>
      el.getAttribute("data-testid"),
    ),
  );
  await page.getByTestId("you-hub-row-spending-fit").click();
  await sleep(400);
  const spending = {
    visible: (await page.locator('[data-testid="you-setting-spending-fit"]').count()) > 0,
    figma: await page
      .locator('[data-testid="you-setting-spending-fit"]')
      .getAttribute("data-figma-node"),
    title: await page.locator(".you-settings-title").innerText().catch(() => ""),
  };
  await shot(page, "SPENDING_FIT_618_1662.png");
  await page.getByTestId("you-setting-back").click();
  await sleep(300);
  await page.getByTestId("you-hub-row-account-security").click();
  await sleep(400);
  const account = {
    visible: (await page.locator('[data-testid="you-setting-account-security"]').count()) > 0,
    figma: await page
      .locator('[data-testid="you-setting-account-security"]')
      .getAttribute("data-figma-node"),
    title: await page.locator(".you-settings-title").innerText().catch(() => ""),
  };
  await shot(page, "ACCOUNT_SECURITY_618_2180.png");
  await page.getByTestId("you-setting-row-delete-account").click();
  await sleep(400);
  const del = {
    visible: (await page.locator('[data-testid="you-setting-delete-account"]').count()) > 0,
    figma: await page
      .locator('[data-testid="you-setting-delete-account"]')
      .getAttribute("data-figma-node"),
    title: await page.locator(".you-settings-title").innerText().catch(() => ""),
  };
  await shot(page, "DELETE_ACCOUNT_618_2243.png");
  await page.getByTestId("you-setting-back").click();
  await sleep(300);
  // back should be account-security
  const afterDeleteBack = {
    accountVisible: (await page.locator('[data-testid="you-setting-account-security"]').count()) > 0,
  };
  await page.getByTestId("you-setting-back").click();
  await sleep(300);

  // Flip assertion on body text
  const flipAnywhere = await page.evaluate(() =>
    /Flip/.test(document.body.innerText) &&
    !!document.querySelector('[data-testid="call-flip"]'),
  );

  const result = {
    HOLD: true,
    FOUNDER_WALK_READY: "PENDING",
    login,
    graphsProof,
    videoProof: {
      ...videoProof,
      VIDEO_MUTE_PRESENT: !!videoProof.mute,
      VIDEO_VIDEO_PRESENT: !!videoProof.video,
      VIDEO_SPEAKER_PRESENT: !!videoProof.speaker,
      VIDEO_END_PRESENT: !!videoProof.end,
      VIDEO_FLIP_PRESENT: !!videoProof.flipPresent,
    },
    audioProof,
    incoming,
    groupProof,
    spending,
    account,
    deleteAccount: del,
    afterDeleteBack,
    teardown: { afterVideo, afterVideoHome },
    youRows,
    flipAnywhere,
    consoleErrors: consoleErrors.slice(0, 20),
    net401: net401.length,
  };

  const videoOk =
    result.videoProof.VIDEO_MUTE_PRESENT &&
    result.videoProof.VIDEO_VIDEO_PRESENT &&
    result.videoProof.VIDEO_SPEAKER_PRESENT &&
    result.videoProof.VIDEO_END_PRESENT &&
    !result.videoProof.VIDEO_FLIP_PRESENT;
  const graphsOk = graphsProof.hasAction && !graphsProof.hasNeedsYou;
  const settingsOk = spending.visible && account.visible && del.visible && afterDeleteBack.accountVisible;
  const audioOk = !!(audioProof.mute && audioProof.video && audioProof.speaker && audioProof.end);

  result.gates = {
    videoOk,
    graphsOk,
    settingsOk,
    audioOk,
  };
  result.FOUNDER_WALK_READY =
    videoOk && graphsOk && settingsOk && audioOk ? "YES" : "NO";

  writeFileSync(resolve(OUT, "PROOF.json"), JSON.stringify(result, null, 2));
  await context.storageState({ path: resolve(RT, "storage_state.json") });
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  if (result.FOUNDER_WALK_READY !== "YES") process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
