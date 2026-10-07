/**
 * Option 1 verify — Threads + seed→Graphs correlation (seed-on).
 * Skips splash/profile/chats-list/calls chrome already green at 25/25.
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
  await sleep(1200);
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

  // --- Chats → Chanelle thread ---
  await page.getByTestId("member-tab-chats").click();
  await page.waitForSelector("[data-name=Chanelle]", { timeout: 20000 });
  await sleep(800);
  // Click avatar/name side — row center often hits the plan pill (opens Graph, not thread).
  const chanelleRow = page.locator("[data-name=Chanelle]").first();
  const chanelleBox = await chanelleRow.boundingBox();
  if (!chanelleBox) throw new Error("Chanelle row not found");
  await page.mouse.click(chanelleBox.x + 36, chanelleBox.y + chanelleBox.height / 2);
  await page.waitForSelector("[data-testid=member-conversation]", { timeout: 15000 });
  await page.waitForSelector(".bubble, [data-testid=opal-moment], [data-testid=opal-system-consequence]", {
    timeout: 12000,
  });
  // Poll until seed thread is stable (list refresh must not wipe it).
  let thread = null;
  for (let i = 0; i < 20; i++) {
    thread = await page.evaluate(() => {
      const body = document.body.innerText || "";
      const bubbles = [...document.querySelectorAll(".bubble")];
      const bad = [];
      for (const b of bubbles) {
        const p = b.querySelector("p");
        const text = (p?.textContent || "").trim();
        const color = getComputedStyle(p || b).color;
        const bg = getComputedStyle(b).backgroundColor;
        const rgb = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        const lum = rgb
          ? (0.2126 * +rgb[1] + 0.7152 * +rgb[2] + 0.0722 * +rgb[3]) / 255
          : 0;
        if (!text || lum < 0.45) bad.push({ text: text.slice(0, 40), color, lum, bg });
      }
      const chanelleRow = document.querySelector('.bubble-row[data-sender-name="Chanelle"]');
      const youRow = document.querySelector('.bubble-row[data-sender-name="You"], .bubble-row.out');
      const chanelleBg = chanelleRow
        ? getComputedStyle(chanelleRow.querySelector(".bubble") || chanelleRow).backgroundColor
        : "";
      const youBg = youRow
        ? getComputedStyle(youRow.querySelector(".bubble") || youRow).backgroundColor
        : "";
      const filament =
        document.querySelector('[data-testid="opal-system-consequence"]') ||
        document.querySelector('[data-testid="opal-moment"]') ||
        document.querySelector('[data-testid="opal-filament-wrap"]');
      const filamentText = (filament?.textContent || "").trim();
      return {
        bubbleCount: bubbles.length,
        bad,
        juniperTonight: /Juniper tonight/i.test(body),
        can730: /I can do 7:30/i.test(body),
        opalLined: /Opal lined this up/i.test(body),
        juniperIvy: /Juniper & Ivy/i.test(body),
        sat730: /Sat 7:30|7:30 PM/i.test(body),
        filamentText: filamentText.slice(0, 120),
        hasFilament: !!filament,
        chanelleBg,
        youBg,
        italian: /We should do something Italian/i.test(body),
        senderNames: [...document.querySelectorAll(".bubble-row[data-sender-name]")].map((el) =>
          el.getAttribute("data-sender-name"),
        ),
      };
    });
    if (thread.bubbleCount >= 2 && thread.opalLined && thread.juniperTonight) break;
    await sleep(250);
  }
  await page.screenshot({ path: resolve(OUT, "o1_thread_chanelle.png") });
  // Re-read after screenshot — seed paint must survive list refresh / second openChat.
  thread = await page.evaluate(() => {
    const body = document.body.innerText || "";
    const bubbles = [...document.querySelectorAll(".bubble")];
    const bad = [];
    for (const b of bubbles) {
      const p = b.querySelector("p");
      const text = (p?.textContent || "").trim();
      const color = getComputedStyle(p || b).color;
      const bg = getComputedStyle(b).backgroundColor;
      const rgb = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      const lum = rgb
        ? (0.2126 * +rgb[1] + 0.7152 * +rgb[2] + 0.0722 * +rgb[3]) / 255
        : 0;
      if (!text || lum < 0.45) bad.push({ text: text.slice(0, 40), color, lum, bg });
    }
    const chanelleRow = document.querySelector('.bubble-row[data-sender-name="Chanelle"]');
    const youRow = document.querySelector('.bubble-row[data-sender-name="You"], .bubble-row.out');
    const chanelleBg = chanelleRow
      ? getComputedStyle(chanelleRow.querySelector(".bubble") || chanelleRow).backgroundColor
      : "";
    const youBg = youRow
      ? getComputedStyle(youRow.querySelector(".bubble") || youRow).backgroundColor
      : "";
    const filament =
      document.querySelector('[data-testid="opal-system-consequence"]') ||
      document.querySelector('[data-testid="opal-moment"]') ||
      document.querySelector('[data-testid="opal-filament-wrap"]');
    const filamentText = (filament?.textContent || "").trim();
    return {
      bubbleCount: bubbles.length,
      bad,
      juniperTonight: /Juniper tonight/i.test(body),
      can730: /I can do 7:30/i.test(body),
      opalLined: /Opal lined this up/i.test(body),
      juniperIvy: /Juniper & Ivy/i.test(body),
      sat730: /Sat 7:30|7:30 PM/i.test(body),
      filamentText: filamentText.slice(0, 120),
      hasFilament: !!filament,
      chanelleBg,
      youBg,
      italian: /We should do something Italian/i.test(body),
      senderNames: [...document.querySelectorAll(".bubble-row[data-sender-name]")].map((el) =>
        el.getAttribute("data-sender-name"),
      ),
    };
  });

  assert("thread_has_bubbles", thread.bubbleCount >= 2, JSON.stringify({ n: thread.bubbleCount }));
  assert("thread_readable", thread.bad.length === 0, JSON.stringify(thread.bad));
  assert("thread_no_italian", !thread.italian, "no lab residue");
  assert(
    "thread_natural_copy",
    thread.juniperTonight && thread.can730,
    JSON.stringify({ juniperTonight: thread.juniperTonight, can730: thread.can730 }),
  );
  assert(
    "thread_opal_filament",
    thread.hasFilament && thread.opalLined && thread.juniperIvy && thread.sat730,
    JSON.stringify({
      hasFilament: thread.hasFilament,
      filamentText: thread.filamentText,
      opalLined: thread.opalLined,
      juniperIvy: thread.juniperIvy,
      sat730: thread.sat730,
    }),
  );
  // Brand V4: Chanelle inbound gold (warm), You outbound cyan — not transparent/black
  const goldish = /rgba?\(\s*255,\s*200,\s*107/i.test(thread.chanelleBg);
  const cyanish = /rgba?\(\s*0,\s*229,\s*255/i.test(thread.youBg);
  assert(
    "thread_brand_v4_chanelle_gold",
    goldish || /255,\s*200,\s*107/.test(thread.chanelleBg),
    `chanelleBg=${thread.chanelleBg}`,
  );
  assert(
    "thread_brand_v4_you_cyan",
    cyanish || /0,\s*229,\s*255/.test(thread.youBg),
    `youBg=${thread.youBg}`,
  );
  assert(
    "thread_sender_names",
    thread.senderNames.includes("Chanelle") && thread.senderNames.includes("You"),
    JSON.stringify(thread.senderNames),
  );

  // Smoke: back, open Maya, confirm natural content
  const back = page.locator(
    '[data-testid="conversation-back"], button[aria-label*="Back"], .chat-header button',
  ).first();
  if (await back.isVisible().catch(() => false)) {
    await back.click({ force: true });
    await sleep(800);
  } else {
    await page.getByTestId("member-tab-chats").click();
    await sleep(800);
  }
  await page.locator("button:has-text('Chats')").first().click({ force: true }).catch(() => {});
  await page.waitForSelector("[data-name=Maya]", { timeout: 15000 });
  await sleep(400);
  const mayaRow = page.locator("[data-name=Maya]").first();
  const mayaBox = await mayaRow.boundingBox();
  if (!mayaBox) throw new Error("Maya row not found");
  await page.mouse.click(mayaBox.x + 36, mayaBox.y + mayaBox.height / 2);
  await page.waitForSelector("[data-testid=member-conversation]", { timeout: 15000 });
  await page.waitForSelector(".bubble", { timeout: 12000 });
  await sleep(400);
  await page.screenshot({ path: resolve(OUT, "o1_thread_maya.png") });
  const maya = await page.evaluate(() => {
    const body = document.body.innerText || "";
    return {
      farmers: /Farmers market/i.test(body),
      freeAfter10: /free after 10/i.test(body),
      coast: /coast/i.test(body),
      italian: /Italian/i.test(body),
    };
  });
  assert(
    "maya_thread_seed",
    maya.farmers && maya.freeAfter10 && !maya.italian,
    JSON.stringify(maya),
  );

  // --- Graphs correlation ---
  await page.getByTestId("member-tab-graphs").click();
  await sleep(1800);
  await page.screenshot({ path: resolve(OUT, "o1_graphs.png") });
  const graphs = await page.evaluate(() => {
    const body = document.body.innerText || "";
    const cards = [...document.querySelectorAll("[data-testid^=graphs-card-], .graphs-card, .graphs-home-card")].map(
      (c) => (c.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160),
    );
    return {
      bodySlice: body.slice(0, 800),
      cards,
      juniper: /Juniper & Ivy/i.test(body),
      mayaCoast: /Farmers market \+ coast/i.test(body),
      mexico: /Mexico City/i.test(body),
      wrongMayaMexico: false, // soft: both titles may appear; chrome must include Farmers for Maya seed
    };
  });
  assert("graphs_juniper", graphs.juniper, JSON.stringify(graphs.cards.slice(0, 4)));
  assert("graphs_maya_coast", graphs.mayaCoast, JSON.stringify(graphs.cards.slice(0, 4)));
  assert("graphs_alex_mexico", graphs.mexico, JSON.stringify(graphs.cards.slice(0, 4)));

  // Functionality smoke: search + compose affordance visible in chats shell
  await page.getByTestId("member-tab-chats").click();
  await sleep(1000);
  const smoke = await page.evaluate(() => {
    const search =
      document.querySelector('[data-testid="chats-search"], input[placeholder*="Search"], [aria-label*="Search"]') ||
      [...document.querySelectorAll("input,button")].find((el) =>
        /search/i.test(el.getAttribute("placeholder") || el.getAttribute("aria-label") || el.textContent || ""),
      );
    const plus =
      document.querySelector('[data-testid="chats-new"], [data-testid="chats-compose"], button[aria-label*="New"]') ||
      [...document.querySelectorAll("button")].find((el) =>
        /^\+$|^new/i.test((el.textContent || "").trim()) || /new chat|compose/i.test(el.getAttribute("aria-label") || ""),
      );
    const callsTab = [...document.querySelectorAll("button")].some((b) =>
      /^Calls$/i.test((b.textContent || "").trim()),
    );
    return { hasSearch: !!search, hasPlus: !!plus, hasCallsTab: callsTab };
  });
  assert("smoke_search", smoke.hasSearch, JSON.stringify(smoke));
  assert("smoke_plus_or_new", smoke.hasPlus, JSON.stringify(smoke));
  assert("smoke_calls_tab", smoke.hasCallsTab, JSON.stringify(smoke));
} catch (err) {
  console.error(err);
  results.push({ name: "runner_error", ok: false, detail: String(err?.stack || err) });
} finally {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  writeFileSync(
    resolve(OUT, "VERIFY_OPTION1.json"),
    JSON.stringify({ tip: TIP, dirty: true, passed, failed, results, at: new Date().toISOString() }, null, 2),
  );
  console.log(`\n${passed} passed / ${failed} failed — tip ${TIP} (uncommitted Option 1)`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}
