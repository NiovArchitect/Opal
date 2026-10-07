/**
 * Backend intelligence wiring verify — no UI redesign.
 * Maya yes→lock, Alex Trip Graph 14 memories, call gate, seed reply.
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { activate } from "../../scripts/founder_proof_fixture.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.OPAL_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(ROOT, "shots/founder_walk_final");
mkdirSync(OUT, { recursive: true });
const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
const { chromium } = require("playwright");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TIP = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim();
const results = [];
function assert(name, ok, detail = "") {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function loadSession() {
  try {
    const cached = JSON.parse(readFileSync("/tmp/fw13_session.json", "utf8"));
    if (cached?.token) return cached;
  } catch {
    /* */
  }
  return activate({
    phone: "+12025550103",
    name: "Jordan Lee",
    handle: "jordan_rev",
    code: "333333",
  });
}

async function login(page, session) {
  await page.addInitScript(
    ({ token, userId, name }) => {
      sessionStorage.setItem("opal.product.browser_session.v1", token);
      sessionStorage.setItem("opal_native_host", "1");
      localStorage.setItem(
        "opal.product.profile.v17",
        JSON.stringify({ user_id: userId, display_name: name, handle: "founder_rev" }),
      );
      localStorage.setItem("opal.founder_seed.opt_in.persist.v1", "1");
      sessionStorage.setItem("opal.founder_seed.opt_in.v1", "1");
      localStorage.setItem("opal.firstRun.v14.completed", "1");
    },
    { token: session.token, userId: session.userId, name: session.name },
  );
  await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await sleep(1000);
  for (let i = 0; i < 12; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) break;
    if (await page.getByTestId("opal-promise-already").isVisible().catch(() => false)) {
      await page.getByTestId("opal-promise-already").click({ force: true });
      await sleep(400);
      continue;
    }
    await sleep(400);
  }
  await page.waitForSelector('[data-testid="member-shell"]', { timeout: 45000 });
}

async function ensureChatsList(page) {
  for (let i = 0; i < 8; i++) {
    const inConv = await page.locator('[data-testid="member-conversation"]').isVisible().catch(() => false);
    if (!inConv && (await page.locator("[data-testid=chats-home-list]").isVisible().catch(() => false))) {
      return;
    }
    if (inConv) {
      await page.getByTestId("gpt-back").click({ force: true }).catch(() => {});
      await sleep(400);
      continue;
    }
    await page.getByTestId("member-tab-chats").click({ force: true }).catch(() => {});
    await sleep(400);
  }
}

async function openChatByName(page, name) {
  await ensureChatsList(page);
  await page.waitForSelector(`[data-name="${name}"]`, { timeout: 20000 });
  const nameEl = page.locator(`[data-name="${name}"] .chats-home-name`).first();
  if (await nameEl.isVisible().catch(() => false)) {
    await nameEl.click({ force: true });
  } else {
    const box = await page.locator(`[data-name="${name}"]`).first().boundingBox();
    await page.mouse.click(box.x + 14, box.y + 16);
  }
  await page.locator('[data-testid="member-conversation"]').waitFor({ state: "visible", timeout: 15000 });
  await page.waitForFunction(
    (tok) => {
      const el = document.querySelector(
        '[data-testid="member-conversation"] [data-testid="gpt-name"]',
      );
      return el && new RegExp(tok, "i").test((el.textContent || "").trim());
    },
    name.split(/\s+/)[0],
    { timeout: 15000 },
  );
  await sleep(600);
}

const session = await loadSession();
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

try {
  await login(page, session);
  const served = await page.evaluate(
    () =>
      document.documentElement.getAttribute("data-opal-frontend-sha") ||
      document.documentElement.getAttribute("data-git-head") ||
      "",
  );
  assert("served_sha_present", !!served, `served=${served} tip=${TIP}`);

  // —— Maya: type yes → Opal locks ——
  await openChatByName(page, "Maya");
  await page.fill("#composer-input", "yes");
  await page.getByTestId("composer-send").click({ force: true });
  await page
    .waitForFunction(
      () => {
        const text =
          document.querySelector('[data-testid="member-conversation"] .thread')?.innerText || "";
        return /Locked in/i.test(text) && /10:30/i.test(text);
      },
      { timeout: 8000 },
    )
    .catch(() => {});
  await sleep(400);
  const maya = await page.evaluate(() => {
    const text = document.querySelector('[data-testid="member-conversation"] .thread')?.innerText || "";
    const cta = document.querySelector('[data-testid="find-time-cta"]');
    return {
      locked: /Locked in/i.test(text) && /10:30/i.test(text) && /coast/i.test(text),
      textTail: text.slice(-400),
      cta: (cta?.textContent || "").trim(),
    };
  });
  assert("maya_yes_opal_locks", maya.locked, maya.textTail);
  await page.screenshot({ path: resolve(OUT, "bi_maya_yes_locked.png"), fullPage: false });
  await ensureChatsList(page);

  // —— Alex: Trip Graph → 14 memories ——
  await openChatByName(page, "Alex");
  const tripCta = page.getByTestId("trip-graph-memories-cta");
  if (await tripCta.isVisible().catch(() => false)) {
    await tripCta.click({ force: true });
  } else {
    // Fallback: plan pill from chats list
    await ensureChatsList(page);
    const pill = page.locator('[data-plan-id="seed-alex-graph-gallery"]').first();
    await pill.click({ force: true });
  }
  await page.waitForSelector('[data-testid="story-viewer"]', { timeout: 8000 }).catch(() => {});
  await sleep(400);
  const memories = await page.evaluate(() => {
    const viewer = document.querySelector('[data-testid="story-viewer"]');
    const caption =
      document.querySelector('[data-testid="story-viewer-caption"]')?.textContent || "";
    const progress = document.querySelectorAll('[data-testid="story-viewer-progress"] .story-viewer-progress-seg').length;
    return {
      hasViewer: !!viewer,
      caption: caption.trim(),
      progressSegs: progress,
      bodySlice: (document.body.innerText || "").slice(0, 300),
    };
  });
  assert(
    "alex_trip_memories_open",
    memories.hasViewer && memories.progressSegs >= 14,
    `viewer=${memories.hasViewer} segs=${memories.progressSegs} cap=${memories.caption}`,
  );
  // Advance through a few frames to prove a queue exists
  await page.getByTestId("story-viewer-nav").click({ force: true, position: { x: 300, y: 200 } }).catch(() => {});
  await sleep(400);
  await page.getByTestId("story-viewer-nav").click({ force: true, position: { x: 300, y: 200 } }).catch(() => {});
  await sleep(400);
  const afterAdvance = await page.evaluate(() => {
    const caption =
      document.querySelector('[data-testid="story-viewer-caption"]')?.textContent || "";
    const viewer = !!document.querySelector('[data-testid="story-viewer"]');
    return { caption: caption.trim(), viewer };
  });
  assert(
    "alex_trip_memories_advanceable",
    afterAdvance.viewer &&
      /Rooftop|Gallery|Street|Blue|Taxi|Museum|mural|espresso|Market|Friends|Night|Bookstore|Sunrise|Last look/i.test(
        afterAdvance.caption,
      ),
    afterAdvance.caption || "no caption",
  );
  await page.screenshot({ path: resolve(OUT, "bi_alex_memories.png"), fullPage: false });
  // Close viewer
  await page.keyboard.press("Escape").catch(() => {});
  await sleep(400);
  await ensureChatsList(page);

  // —— Alex reply ——
  await openChatByName(page, "Alex");
  await page.fill("#composer-input", "rooftop shot though");
  await page.getByTestId("composer-send").click({ force: true });
  await sleep(1200);
  const alexReply = await page.evaluate(() => {
    const text = document.querySelector('[data-testid="member-conversation"] .thread')?.innerText || "";
    return {
      peer: /unreal|Trip Graph|light|Right\?/i.test(text),
      opal: /14 memor|Trip Graph/i.test(text),
      tail: text.slice(-350),
    };
  });
  assert("alex_contextual_reply", alexReply.peer || alexReply.opal, alexReply.tail);
  await page.screenshot({ path: resolve(OUT, "bi_alex_reply.png"), fullPage: false });

  // —— Call gate ——
  const callBtn = page.getByTestId("gpt-call");
  await callBtn.click({ force: true });
  await sleep(500);
  const gate = await page.evaluate(() => {
    const note =
      document.querySelector('[data-testid="call-status-note"]')?.textContent ||
      document.body.innerText ||
      "";
    const callUi = !!document.querySelector('[data-testid="call-surface"], .call-surface, .active-call');
    return {
      honest: /Calls aren't available|couldn't start|Sign in/i.test(note) || callUi,
      note: note.slice(0, 160),
      callUi,
    };
  });
  assert("call_button_responds", gate.honest, gate.note);
  await page.screenshot({ path: resolve(OUT, "bi_call_gate.png"), fullPage: false });

  // —— Opal Center chips ——
  await page.getByTestId("member-tab-opal").click({ force: true }).catch(() => {});
  await page.locator('[data-testid="dock-opal"], .dock-opal').first().click({ force: true }).catch(() => {});
  await sleep(800);
  const center = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="opal-center-life-graph"]');
    const text = root?.innerText || document.body.innerText || "";
    return {
      open: !!root || /Curate my time|What's next|Talk to Opal/i.test(text),
      hasCurate: /Curate my time/i.test(text),
      hasNext: /What's next/i.test(text),
      hasMove: /Move something/i.test(text),
      hasLenses: /Today/i.test(text) && /Week/i.test(text) && /Shared/i.test(text),
    };
  });
  assert("opal_center_open", center.open, JSON.stringify(center));
  if (center.hasCurate) {
    await page.getByText("Curate my time", { exact: true }).click({ force: true }).catch(() => {});
    await sleep(1500);
    const after = await page.evaluate(() => {
      const t = document.body.innerText || "";
      return /BEST FIT|resolving|fits|window|Opal needs|Decision|unavailable|nearby/i.test(t);
    });
    assert("opal_center_curate_responds", after, "curate should resolve or show honest note");
  } else {
    assert("opal_center_curate_responds", false, "Curate chip missing");
  }
  await page.screenshot({ path: resolve(OUT, "bi_opal_center.png"), fullPage: false });

  // —— Center lenses Today / Week / Shared ——
  for (const lens of ["Today", "Week", "Shared"]) {
    await page.getByText(lens, { exact: true }).first().click({ force: true }).catch(() => {});
    await sleep(500);
  }
  const lenses = await page.evaluate(() => {
    const t = document.body.innerText || "";
    return {
      week: /THIS WEEK|shape|Friday|opening/i.test(t),
      shared: /SHARED|Family Saturday|Solo does not/i.test(t),
    };
  });
  assert("opal_center_lenses_respond", lenses.week || lenses.shared, JSON.stringify(lenses));

  // —— Composer voice honest gate (from a thread) ——
  await page.getByTestId("member-tab-chats").click({ force: true }).catch(() => {});
  await sleep(400);
  await openChatByName(page, "Chanelle");
  await page.getByTestId("composer-voice").click({ force: true });
  await sleep(400);
  const voiceGate = await page.evaluate(() => {
    const note =
      document.querySelector('[data-testid="call-status-note"]')?.textContent || "";
    return /Voice messages aren't available|aren't available on this build/i.test(note);
  });
  assert("composer_voice_honest_gate", voiceGate, "voice gate note");

  // —— Chanelle contextual reply ——
  await page.fill("#composer-input", "see you there");
  await page.getByTestId("composer-send").click({ force: true });
  await page
    .waitForFunction(
      () => {
        const text =
          document.querySelector('[data-testid="member-conversation"] .thread')?.innerText ||
          "";
        return /Can't wait|locked|Juniper/i.test(text);
      },
      { timeout: 8000 },
    )
    .catch(() => {});
  const chanelle = await page.evaluate(() => {
    const text =
      document.querySelector('[data-testid="member-conversation"] .thread')?.innerText || "";
    return /Can't wait|Juniper|7:30|locked/i.test(text);
  });
  assert("chanelle_contextual_reply", chanelle, "chanelle should answer");
  await page.screenshot({ path: resolve(OUT, "bi_chanelle_reply.png"), fullPage: false });
} catch (err) {
  assert("harness_crash", false, String(err?.stack || err));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
const report = {
  tip: TIP,
  base: BASE,
  at: new Date().toISOString(),
  passed: results.filter((r) => r.ok).length,
  total: results.length,
  failed: failed.map((r) => r.name),
  results,
};
writeFileSync(resolve(OUT, "BACKEND_INTELLIGENCE_VERIFY.json"), JSON.stringify(report, null, 2));
console.log(`\n${report.passed}/${report.total} PASS — tip ${TIP}`);
process.exit(failed.length ? 1 : 0);
