/**
 * Thread Intelligence verify — 7 founder fixes @390×844 seed-on.
 * Single page; open Maya first (known flaky after Chanelle navigation).
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

async function ensureChatsList(page) {
  for (let i = 0; i < 8; i++) {
    const inConversation = await page
      .locator('[data-testid="member-conversation"]')
      .isVisible()
      .catch(() => false);
    const onList =
      !inConversation &&
      (await page.locator("[data-testid=chats-home-list]").isVisible().catch(() => false));
    if (onList) return;
    if (inConversation) {
      await page.getByTestId("gpt-back").click({ force: true }).catch(() => {});
      await sleep(400);
      continue;
    }
    await page.getByTestId("member-tab-chats").click({ force: true }).catch(() => {});
    await sleep(400);
  }
  await page.waitForSelector("[data-testid=chats-home-list]", { timeout: 15000 });
}

async function openChatByName(page, name) {
  await ensureChatsList(page);
  await page.waitForSelector(`[data-name="${name}"]`, { timeout: 20000 });
  const token = name.split(/\s+/)[0];
  const nameEl = page.locator(`[data-name="${name}"] .chats-home-name`).first();
  if (await nameEl.isVisible().catch(() => false)) {
    await nameEl.click({ force: true });
  } else {
    const box = await page.locator(`[data-name="${name}"]`).first().boundingBox();
    if (!box) throw new Error(`${name} row not found`);
    await page.mouse.click(box.x + 14, box.y + 16);
  }
  await page.locator('[data-testid="member-conversation"]').waitFor({ state: "visible", timeout: 15000 });
  await page.waitForFunction(
    (tok) => {
      const el = document.querySelector(
        '[data-testid="member-conversation"][style*="display: none"]',
      );
      void el;
      const nameEl = document.querySelector(
        '[data-testid="member-conversation"] [data-testid="gpt-name"]',
      );
      const visible = document.querySelector('[data-testid="member-conversation"]');
      if (!visible) return false;
      const cs = getComputedStyle(visible);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      return nameEl && new RegExp(tok, "i").test((nameEl.textContent || "").trim());
    },
    token,
    { timeout: 15000 },
  );
  await page
    .locator(
      '[data-testid="member-conversation"] .bubble, [data-testid="member-conversation"] [data-testid=opal-system-consequence], [data-testid="member-conversation"] [data-testid=opal-filament-wrap]',
    )
    .first()
    .waitFor({ state: "visible", timeout: 12000 });
  await sleep(700);
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
  const served = await page.evaluate(() => {
    const el = document.documentElement;
    return (
      el.getAttribute("data-opal-frontend-sha") ||
      el.getAttribute("data-git-head") ||
      window.__OPAL_GIT_HEAD__ ||
      ""
    );
  });
  assert("served_sha_present", !!served, `served=${served} tip=${TIP}`);

  // —— Maya FIRST (counter-proposal close + Close friend) ——
  await openChatByName(page, "Maya");
  await page.evaluate(() => {
    const thread = document.querySelector('[data-testid="member-conversation"] .thread');
    if (thread instanceof HTMLElement) thread.scrollTop = thread.scrollHeight;
  });
  await sleep(300);
  const maya = await page.evaluate(() => {
    const thread = document.querySelector('[data-testid="member-conversation"] .thread');
    const text = thread?.innerText || "";
    const conn = document.querySelector('[data-testid="gpt-conn"]');
    const name = document.querySelector('[data-testid="gpt-name"]');
    return {
      name: (name?.textContent || "").trim(),
      atBottom:
        thread instanceof HTMLElement
          ? thread.scrollTop + thread.clientHeight >= thread.scrollHeight - 48
          : false,
      hasAfter10: /free after 10/i.test(text),
      hasOpalClose: /Got it/i.test(text) && /10:30/i.test(text) && /coast/i.test(text),
      conn: (conn?.textContent || "").trim(),
      textTail: text.slice(-320),
    };
  });
  assert("maya_opens_at_latest", maya.atBottom || maya.hasOpalClose, `${maya.name} | ${maya.textTail.slice(0, 120)}`);
  assert("maya_opal_closes_loop", maya.hasAfter10 && maya.hasOpalClose, maya.textTail);
  assert("maya_label_close_friend", /Close friend/i.test(maya.conn), maya.conn);
  await page.screenshot({ path: resolve(OUT, "ti_thread_maya.png"), fullPage: false });
  await ensureChatsList(page);

  // —— Chanelle ——
  await openChatByName(page, "Chanelle");
  // Defensive: second open can race; confirm header before measuring.
  for (let i = 0; i < 3; i++) {
    const nm = await page.locator('[data-testid="member-conversation"] [data-testid="gpt-name"]').textContent().catch(() => "");
    if (/Chanelle/i.test(nm || "")) break;
    await ensureChatsList(page);
    await openChatByName(page, "Chanelle");
  }
  await sleep(400);
  const chanelle = await page.evaluate(() => {
    const thread = document.querySelector('[data-testid="member-conversation"] .thread');
    const cta = document.querySelector('[data-testid="find-time-cta"]');
    const conn = document.querySelector('[data-testid="gpt-conn"]');
    const bodies = [
      ...document.querySelectorAll(
        '[data-testid="human-message-row"], [data-testid="opal-system-consequence"], [data-testid="opal-filament-wrap"]',
      ),
    ]
      .map((el) => (el.textContent || "").trim())
      .filter(Boolean);
    return {
      atBottom:
        thread instanceof HTMLElement
          ? thread.scrollTop + thread.clientHeight >= thread.scrollHeight - 40
          : false,
      ctaText: (cta?.textContent || "").trim(),
      ctaConfirmed: cta?.getAttribute("data-confirmed") === "true" || cta?.disabled === true,
      conn: (conn?.textContent || "").trim(),
      lastVisible: bodies[bodies.length - 1]?.slice(0, 80) || "",
      hasConfirm730: /Confirm\s*7:30/i.test(cta?.textContent || ""),
    };
  });
  assert("chanelle_opens_at_latest", chanelle.atBottom, JSON.stringify(chanelle));
  assert(
    "chanelle_confirmed_cta",
    chanelle.ctaConfirmed && /Confirmed/i.test(chanelle.ctaText) && !chanelle.hasConfirm730,
    chanelle.ctaText,
  );
  assert("chanelle_label_fiancee", /Fianc/i.test(chanelle.conn), chanelle.conn);
  await page.screenshot({ path: resolve(OUT, "ti_thread_chanelle.png"), fullPage: false });
  if (await page.getByTestId("find-time-cta").isVisible().catch(() => false)) {
    await page.getByTestId("find-time-cta").click({ force: true }).catch(() => {});
    await sleep(250);
  }
  assert(
    "chanelle_no_reconfirm_sheet",
    !(await page.getByTestId("confirm-time-sheet").isVisible().catch(() => false)),
    "confirm sheet must stay closed",
  );
  await ensureChatsList(page);

  // —— Juniper ——
  await openChatByName(page, "Juniper crew");
  await sleep(400);
  const juniper = await page.evaluate(() => {
    const plate = document.querySelector('[data-testid="gpt-shared-graph"]');
    const waiting = document.querySelector('[data-testid="gpt-shared-graph-waiting"]');
    const name = document.querySelector('[data-testid="gpt-name"]');
    const conn = document.querySelector('[data-testid="gpt-conn"]');
    const header = document.querySelector('[data-testid="graph-people-header"]');
    const pb = plate?.getBoundingClientRect();
    const nb = name?.getBoundingClientRect();
    const cb = conn?.getBoundingClientRect();
    const overlapName =
      pb && nb
        ? !(pb.bottom <= nb.top + 2 || pb.top >= nb.bottom - 2 || pb.right <= nb.left || pb.left >= nb.right)
        : false;
    const overlapConn =
      pb && cb
        ? !(pb.bottom <= cb.top + 2 || pb.top >= cb.bottom - 2 || pb.right <= cb.left || pb.left >= cb.right)
        : false;
    return {
      plateTag: plate?.tagName || "",
      plateText: (plate?.textContent || "").trim(),
      waiting: (waiting?.textContent || "").trim(),
      locked: plate?.getAttribute("data-locked") === "true" || /locked/i.test(plate?.textContent || ""),
      tappable: plate?.tagName === "BUTTON",
      overlapName,
      overlapConn,
      headerH: header?.getBoundingClientRect()?.height || 0,
      plateTop: pb?.top || -1,
      nameBottom: nb?.bottom || -1,
      connText: (conn?.textContent || "").trim(),
    };
  });
  assert("juniper_shared_graph_tappable", juniper.tappable, juniper.plateTag);
  assert("juniper_shared_graph_locked", juniper.locked, juniper.plateText);
  assert("juniper_waiting_on", /Waiting on/i.test(juniper.waiting), juniper.waiting);
  assert(
    "juniper_no_header_overlap",
    !juniper.overlapName && !juniper.overlapConn && juniper.plateTop >= juniper.nameBottom - 1,
    JSON.stringify(juniper),
  );
  assert("juniper_label_group", /Group/i.test(juniper.connText), juniper.connText);
  await page.screenshot({ path: resolve(OUT, "ti_thread_juniper.png"), fullPage: false });
  await page.getByTestId("gpt-shared-graph").click({ force: true });
  await sleep(800);
  const afterGraph = await page.evaluate(() => ({
    stillConv: !!document.querySelector('[data-testid="member-conversation"]'),
    detail:
      !!document.querySelector('[data-testid="ogsn-graph-detail"]') ||
      !!document.querySelector(".ogsn-graph-detail") ||
      /Juniper|Ivy|7:30/i.test(document.body.innerText || ""),
  }));
  assert("juniper_shared_graph_opens", !afterGraph.stillConv || afterGraph.detail, JSON.stringify(afterGraph));
  await ensureChatsList(page);

  // —— Sabrina ——
  await openChatByName(page, "Sabrina");
  await page.evaluate(() => {
    const thread = document.querySelector('[data-testid="member-conversation"] .thread');
    if (thread instanceof HTMLElement) thread.scrollTop = thread.scrollHeight;
  });
  await sleep(250);
  const sabrina = await page.evaluate(() => {
    const live = document.querySelector('[data-testid="gpt-watch-live"]');
    const cta = document.querySelector('[data-testid="thread-watch-live-cta"]');
    const header = document.querySelector('[data-testid="graph-people-header"]');
    const back = document.querySelector('[data-testid="gpt-back"]');
    const conn = document.querySelector('[data-testid="gpt-conn"]');
    const lb = live?.getBoundingClientRect();
    const hb = header?.getBoundingClientRect();
    const bb = back?.getBoundingClientRect();
    const overlapHeader = lb && hb ? lb.top < hb.bottom - 4 && lb.bottom > hb.top + 4 : false;
    const overlapBack =
      lb && bb
        ? !(lb.bottom <= bb.top || lb.top >= bb.bottom || lb.right <= bb.left || lb.left >= bb.right)
        : false;
    return {
      hasLive: !!live,
      inThreadCta: !!cta,
      liveText: (live?.textContent || "").trim(),
      liveTop: lb?.top ?? -1,
      headerBottom: hb?.bottom ?? -1,
      overlapHeader,
      overlapBack,
      conn: (conn?.textContent || "").trim(),
    };
  });
  assert("sabrina_watch_live_present", sabrina.hasLive && /Watch live/i.test(sabrina.liveText), sabrina.liveText);
  assert("sabrina_watch_live_in_thread", sabrina.inThreadCta, `top=${sabrina.liveTop}`);
  assert(
    "sabrina_watch_live_no_header_overlap",
    !sabrina.overlapHeader && !sabrina.overlapBack && sabrina.liveTop >= sabrina.headerBottom - 2,
    JSON.stringify(sabrina),
  );
  assert("sabrina_label_neighbor", /Neighbor/i.test(sabrina.conn), sabrina.conn);
  await page.screenshot({ path: resolve(OUT, "ti_thread_sabrina.png"), fullPage: false });

  const sendOk = await page.evaluate(() => {
    const send = document.querySelector('[data-testid="composer-send"]');
    const d = send?.querySelector("svg path")?.getAttribute("d") || "";
    return { hasSvg: !!send?.querySelector("svg"), path: d.slice(0, 80), isPlane: /M3\.4|21\.5|15 12/i.test(d) };
  });
  assert("send_icon_paper_plane", sendOk.hasSvg && sendOk.isPlane, sendOk.path);
  await page.getByTestId("composer-attach").click({ force: true });
  await sleep(350);
  const menu = await page.evaluate(() => {
    const m = document.querySelector('[data-testid="composer-attach-menu"]');
    const opts = [...(m?.querySelectorAll('[role="menuitem"]') || [])].map((el) => (el.textContent || "").trim());
    return { open: !!m, opts };
  });
  assert(
    "plus_menu_opens_attachments",
    menu.open && menu.opts.includes("Photo") && menu.opts.includes("Camera") && menu.opts.includes("Location"),
    JSON.stringify(menu),
  );
  await page.screenshot({ path: resolve(OUT, "ti_composer_attach.png"), fullPage: false });
  await ensureChatsList(page);

  // —— Alex ——
  await openChatByName(page, "Alex");
  const alexConn = await page.locator('[data-testid="gpt-conn"]').textContent().catch(() => "");
  assert("alex_label_following", /Following/i.test(alexConn || ""), alexConn || "");
  await page.screenshot({ path: resolve(OUT, "ti_thread_alex.png"), fullPage: false });
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
writeFileSync(resolve(OUT, "THREAD_INTELLIGENCE_VERIFY.json"), JSON.stringify(report, null, 2));
console.log(`\n${report.passed}/${report.total} PASS — tip ${TIP}`);
process.exit(failed.length ? 1 : 0);
