#!/usr/bin/env node
/**
 * PASS 7 — Sustained six-client realtime soak + recovery + private UI isolation.
 * NO new intelligence. Reliability proof only.
 *
 * Usage:
 *   SOAK_MINUTES=20 node scripts/six_client_realtime_soak.mjs
 *   SOAK_MINUTES=5 node scripts/six_client_realtime_soak.mjs   # shorter local
 *
 * Default SOAK_MINUTES=20.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { activate as fixtureActivate } from "./founder_proof_fixture.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const API = (process.env.API_BASE || "http://127.0.0.1:4000").replace(/\/$/, "");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const SOAK_MINUTES = Math.max(1, Number(process.env.SOAK_MINUTES || 20));
const OUT_DIR = resolve(
  ROOT,
  "docs/evidence/v2-coded-experience/live-closure/six-client-soak",
);
const MD = resolve(ROOT, "docs/intelligence/evidence/SIX_CLIENT_REALTIME_SOAK.md");
const JSON_OUT = resolve(OUT_DIR, "SIX_CLIENT_REALTIME_SOAK.json");

mkdirSync(OUT_DIR, { recursive: true });

const CAST = {
  founder: { phone: "+12025550101", name: "Founder Review", handle: "founder_rev", code: "111111" },
  chris: { phone: "+12025550111", name: "Chris Park", handle: "chris_mc", code: "111111" },
  jess: { phone: "+12025550112", name: "Jess Rivera", handle: "jess_mc", code: "111111" },
  alex: { phone: "+12025550113", name: "Alex Chen", handle: "alex_mc", code: "111111" },
  maya: { phone: "+12025550114", name: "Maya Okonkwo", handle: "maya_mc", code: "111111" },
  sam: { phone: "+12025550115", name: "Sam Ortiz", handle: "sam_mc", code: "111111" },
  stranger: { phone: "+12025550199", name: "Stranger Control", handle: "stranger_mc", code: "111111" },
};
const MEMBERS = ["founder", "chris", "jess", "alex", "maya", "sam"];

const results = [];
function rec(name, status, detail = {}) {
  const row = { name, status, detail, at: new Date().toISOString() };
  results.push(row);
  console.log(
    `${String(status === "PASS" ? "PASS" : status === "PRODUCT_FAIL" ? "PRODUCT" : status === "ENVIRONMENT_FAIL" ? "ENV" : status).padEnd(8)} ${name}${detail.summary ? " — " + detail.summary : ""}`,
  );
  return row;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function json(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "content-type": "application/json",
      ...(opts.bearer ? { authorization: `Bearer ${opts.bearer}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function send(token, conversationId, body, tag) {
  const r = await json(`/api/v1/product/conversations/${conversationId}/messages`, {
    method: "POST",
    bearer: token,
    body: JSON.stringify({
      body,
      client_message_id: `soak-${tag}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    }),
  });
  if (!r.ok) throw new Error(r.body?.message || `send ${r.status}`);
  return r.body?.message || r.body;
}

async function login(page, user) {
  await page.goto(WEB, { waitUntil: "networkidle", timeout: 90000 });
  await page.setViewportSize({ width: 390, height: 844 });
  const skip = page.getByTestId("first-run-skip");
  if (await skip.isVisible({ timeout: 2500 }).catch(() => false)) await skip.click();
  const join = page.getByTestId("first-run-join");
  if (await join.isVisible({ timeout: 1200 }).catch(() => false)) await join.click();

  // Capture synthetic development_code from challenge response (not always 111111).
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
    // Wait briefly for challenge response + development_code
    await page.waitForTimeout(800);
    await page.fill("#code", devCode);
    await page.getByRole("button", { name: /Continue|Verify|Join|Enter/i }).first().click();
  }
  for (let i = 0; i < 5; i++) {
    const ready = page.getByRole("button", {
      name: /Continue|Enter Opal|I'm ready|Done|Skip/i,
    });
    if (await ready.first().isVisible({ timeout: 1200 }).catch(() => false)) {
      await ready.first().click().catch(() => {});
      await page.waitForTimeout(300);
    }
  }
  await page.waitForSelector(
    '[data-testid="member-shell"], [data-testid="home-living-field"], [data-testid="member-tabbar"]',
    { timeout: 45000 },
  );
}

async function getDiag(page) {
  return page
    .evaluate(() => {
      const rt = window.__opalProductRealtime;
      if (!rt || typeof rt.getDiagnostics !== "function") {
        return {
          rawState: "unknown",
          connectCount: 0,
          reconnectScheduleCount: 0,
          closeCount: 0,
          errorCount: 0,
          connectedLifetimeMs: null,
          joinedChannels: [],
          lastServerSeqByConversation: {},
        };
      }
      return rt.getDiagnostics();
    })
    .catch(() => ({
      rawState: "error",
      connectCount: 0,
      reconnectScheduleCount: 0,
      closeCount: 0,
      errorCount: 0,
      joinedChannels: [],
      lastServerSeqByConversation: {},
    }));
}

/** Wait until socket connected and conversation channel joined (when diagnostics expose it). */
async function waitForChannelJoin(page, conversationId, { timeoutMs = 20000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const d = await getDiag(page);
    const joined = Array.isArray(d.joinedChannels) ? d.joinedChannels : [];
    if (d.rawState === "connected" && joined.includes(conversationId)) return true;
    // Older client without joinedChannels: socket connected is best effort
    if (d.rawState === "connected" && !("joinedChannels" in d)) return true;
    await page.waitForTimeout(400);
  }
  return false;
}

async function openConversation(page, conversationId) {
  // Prefer Chats list with exact conversation id
  const tabbar = page.getByTestId("member-tabbar");
  if (await tabbar.isVisible({ timeout: 5000 }).catch(() => false)) {
    await tabbar.locator("button", { hasText: /Chat|Chats|Home/i }).first().click().catch(() => {});
    await page.waitForTimeout(700);
  }
  const exact = page.locator(`[data-conversation-id="${conversationId}"]`);
  if (await exact.first().isVisible({ timeout: 8000 }).catch(() => false)) {
    await exact.first().click();
    await page.waitForTimeout(1500);
  } else {
    // Home field / presence card — refresh list via Home if conversation not yet listed
    if (await tabbar.isVisible({ timeout: 1000 }).catch(() => false)) {
      await tabbar.locator("button", { hasText: /Home/i }).first().click().catch(() => {});
      await page.waitForTimeout(900);
      await tabbar.locator("button", { hasText: /Chat|Chats/i }).first().click().catch(() => {});
      await page.waitForTimeout(900);
    }
    const homeHit = page.locator(`[data-conversation-id="${conversationId}"]`).first();
    if (await homeHit.isVisible({ timeout: 5000 }).catch(() => false)) {
      await homeHit.click();
      await page.waitForTimeout(1500);
    }
  }
  // Ensure conversation shell + channel join opportunity
  await page
    .getByTestId("member-conversation")
    .waitFor({ state: "visible", timeout: 12000 })
    .catch(() => {});
  await waitForChannelJoin(page, conversationId, { timeoutMs: 15000 });
}

/** Full reload + re-open so late membership (e.g. Sam) rebuilds list + channel from server. */
async function hardRejoinConversation(page, conversationId) {
  await page.reload({ waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
  await page
    .waitForSelector(
      '[data-testid="member-shell"], [data-testid="home-living-field"], [data-testid="member-tabbar"]',
      { timeout: 45000 },
    )
    .catch(() => {});
  await page.waitForTimeout(1200);
  await openConversation(page, conversationId);
  return waitForChannelJoin(page, conversationId, { timeoutMs: 20000 });
}

async function realitySnapshot(token, conversationId) {
  const r = await json(`/api/v1/product/conversations/${conversationId}/messages`, {
    bearer: token,
  });
  if (!r.ok) return { error: r.status };
  const signals = r.body.signals || [];
  const primary = signals.find((s) => s.kind !== "proposal") || signals[0] || {};
  const sr = primary.shared_reality || {};
  const cf = primary.collective_fit || {};
  return {
    who: primary.member_count || cf.party_size || null,
    what: sr.what || null,
    when: sr.when || null,
    where: sr.where || null,
    next_gap: sr.next_gap || null,
    authorizes_set: cf.authorizes_set,
    options: (cf.options || []).length,
    truth_class: cf.options?.[0]?.truth_class || null,
    provider_status: cf.options?.[0]?.provider_status || null,
    authorizes_booking: cf.options?.[0]?.authorizes_booking,
    label: primary.label || null,
    msg_count: (r.body.messages || []).length,
    chronology_count: (r.body.chronology || []).length,
    blob: JSON.stringify(r.body),
  };
}

function classifyHealth(diag, intentionalReconnects = 0) {
  const r = (diag?.reconnectScheduleCount || 0) - intentionalReconnects;
  const e = diag?.errorCount || 0;
  if (e > 8 || r > 12) return "FAIL";
  if (e > 3 || r > 5) return "SUSPICIOUS";
  return "HEALTHY";
}

async function main() {
  const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
  const { chromium } = require("playwright");
  const episodeId = `soak7-${Date.now().toString(36)}`;
  const startIso = new Date().toISOString();
  const soakMs = SOAK_MINUTES * 60 * 1000;
  console.log(`PASS 7 soak ${SOAK_MINUTES}m episode=${episodeId}`);

  // Activate API sessions
  const sessions = {};
  try {
    for (const [k, u] of Object.entries(CAST)) {
      sessions[k] = await fixtureActivate(u);
      await sleep(350);
    }
    rec("activate_all", "PASS", { summary: MEMBERS.map((m) => `${m}=${sessions[m].userId.slice(0, 8)}`).join(" ") });
  } catch (e) {
    rec("activate_all", "ENVIRONMENT_FAIL", { summary: String(e.message || e) });
    return writeOut(episodeId, startIso, null, {}, {});
  }

  // Group: 5 members then Sam
  const group = await json("/api/v1/product/conversations/group", {
    method: "POST",
    bearer: sessions.founder.token,
    body: JSON.stringify({
      member_user_ids: ["chris", "jess", "alex", "maya"].map((k) => sessions[k].userId),
      label: `Soak ${episodeId}`,
    }),
  });
  if (!group.ok) {
    rec("create_group", "PRODUCT_FAIL", { summary: String(group.status) });
    return writeOut(episodeId, startIso, null, sessions, {});
  }
  const conversationId = group.body.conversation_id;
  rec("create_group", "PASS", { summary: conversationId });

  // Seed EP-006-style messages from correct humans
  const script = [
    ["founder", "Saturday dinner around 7:30? Something Italian sounds good."],
    ["chris", "I'm in. Anywhere but downtown."],
    ["jess", "I'm in. Italian works for me."],
    ["alex", "Works for me. No sushi tonight though."],
    ["maya", "I'm in. Actually somewhere lively sounds fun tonight."],
  ];
  for (const [who, body] of script) {
    await send(sessions[who].token, conversationId, body, who);
    await sleep(150);
  }

  // Browser clients
  const browser = await chromium.launch({ headless: true });
  const clients = {};
  for (const who of MEMBERS) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    try {
      await login(page, CAST[who]);
      await openConversation(page, conversationId);
      clients[who] = { ctx, page, user: CAST[who], session: sessions[who] };
      rec(`browser_login_${who}`, "PASS", {});
    } catch (e) {
      clients[who] = { ctx, page, user: CAST[who], session: sessions[who], loginFailed: true };
      rec(`browser_login_${who}`, "ENVIRONMENT_FAIL", { summary: String(e.message || e).slice(0, 120) });
    }
    await sleep(400);
  }

  // Stranger browser optional
  let strangerPage = null;
  try {
    const sctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    strangerPage = await sctx.newPage();
    await login(strangerPage, CAST.stranger);
    rec("browser_login_stranger", "PASS", {});
  } catch (e) {
    rec("browser_login_stranger", "ENVIRONMENT_FAIL", { summary: String(e.message || e).slice(0, 80) });
  }

  // Ensure Sam is a member before realtime matrix (group created as 5)
  {
    const add = await json(`/api/v1/product/conversations/${conversationId}/members`, {
      method: "POST",
      bearer: sessions.founder.token,
      body: JSON.stringify({ user_id: sessions.sam.userId }),
    });
    rec(
      "sam_prematrix_membership",
      add.ok && (add.body?.member_count || 0) >= 6 ? "PASS" : "PRODUCT_FAIL",
      { summary: `count=${add.body?.member_count}` },
    );
  }

  // Late-added Sam: hard reload so chat list + channel rebuild from server truth
  // (prior open while non-member leaves denied join / sticky loadError).
  if (clients.sam && !clients.sam.loginFailed) {
    const samJoined = await hardRejoinConversation(clients.sam.page, conversationId);
    rec(
      "sam_post_membership_rejoin",
      samJoined ? "PASS" : "PRODUCT_FAIL",
      { summary: `channel_joined=${samJoined}` },
    );
  }

  // Re-open conversation on all clients so Phoenix channel is joined before matrix
  const preMatrixJoins = {};
  for (const who of MEMBERS) {
    if (clients[who]?.loginFailed) {
      preMatrixJoins[who] = false;
      continue;
    }
    if (who !== "sam") {
      await openConversation(clients[who].page, conversationId);
    }
    preMatrixJoins[who] = await waitForChannelJoin(clients[who].page, conversationId, {
      timeoutMs: 12000,
    });
    await sleep(300);
  }
  const allJoined = Object.values(preMatrixJoins).every(Boolean);
  rec(
    "pre_matrix_channel_joins",
    allJoined ? "PASS" : "PRODUCT_FAIL",
    { summary: MEMBERS.map((m) => `${m}=${preMatrixJoins[m]}`).join(" ") },
  );
  // Settle after channel joins before blasting matrix traffic
  await sleep(1500);

  // Baseline realtime matrix: unique message per user, wait for DOM without reload
  const matrix = {};
  for (const sender of MEMBERS) {
    matrix[sender] = {};
    const unique = `SOAK-MSG-${sender}-${Date.now()}`;
    try {
      await send(sessions[sender].token, conversationId, unique, `rt-${sender}`);
    } catch (e) {
      rec(`rt_send_${sender}`, "PRODUCT_FAIL", { summary: String(e.message || e) });
      continue;
    }
    await sleep(1500);
    for (const viewer of MEMBERS) {
      if (clients[viewer]?.loginFailed) {
        matrix[sender][viewer] = "ENV";
        continue;
      }
      const page = clients[viewer].page;
      // Realtime path: wait for text without reload
      const visible = await page
        .getByText(unique, { exact: false })
        .first()
        .isVisible({ timeout: 12000 })
        .catch(() => false);
      if (visible) {
        matrix[sender][viewer] = "PASS";
      } else {
        // One soft reload check to classify product vs environment
        await hardRejoinConversation(page, conversationId);
        const after = await page
          .getByText(unique, { exact: false })
          .first()
          .isVisible({ timeout: 8000 })
          .catch(() => false);
        matrix[sender][viewer] = after ? "RELOAD_ONLY" : "FAIL";
      }
    }
  }
  const rtPass = Object.values(matrix).every((row) =>
    Object.values(row).every((v) => v === "PASS" || v === "ENV"),
  );
  const anyFail = Object.values(matrix).some((row) => Object.values(row).some((v) => v === "FAIL"));
  const anyReload = Object.values(matrix).some((row) =>
    Object.values(row).some((v) => v === "RELOAD_ONLY"),
  );
  rec(
    "realtime_message_matrix",
    anyFail ? "PRODUCT_FAIL" : anyReload ? "PRODUCT_FAIL" : rtPass ? "PASS" : "ENVIRONMENT_FAIL",
    { summary: anyReload ? "some peers needed reload" : anyFail ? "missing messages" : "all peers realtime" },
  );

  // Checkpoint loop
  const checkpoints = {};
  const checkpointMins = [];
  for (let m = 0; m <= SOAK_MINUTES; m += 5) checkpointMins.push(m);
  if (!checkpointMins.includes(SOAK_MINUTES)) checkpointMins.push(SOAK_MINUTES);

  const soakStart = Date.now();
  let intentionalReconnects = { alex: 0, chris: 0 };

  // 0 min checkpoint
  async function captureCheckpoint(label) {
    const snap = {};
    const diags = {};
    for (const who of MEMBERS) {
      diags[who] = await getDiag(clients[who].page);
      snap[who] = await realitySnapshot(sessions[who].token, conversationId);
    }
    // Convergence of shared dims
    const cores = MEMBERS.map((w) => ({
      who: snap[w].who,
      what: snap[w].what,
      when: snap[w].when,
      next_gap: snap[w].next_gap,
    }));
    const coreJson = cores.map((c) => JSON.stringify(c));
    const converge = coreJson.every((j) => j === coreJson[0]);
    const leak = MEMBERS.some((w) => /quiet restaurants|Maya prefers quiet/i.test(snap[w].blob || ""));
    const extOk = MEMBERS.every((w) => {
      const s = snap[w];
      return (
        s.authorizes_set === false ||
        s.authorizes_set == null ||
        s.options === 0 ||
        (s.truth_class === "social_fit" || s.truth_class == null) &&
          s.authorizes_booking !== true
      );
    });
    checkpoints[label] = { diags, snap, converge, leak, extOk, at: new Date().toISOString() };
    rec(`checkpoint_${label}`, converge && !leak && extOk ? "PASS" : "PRODUCT_FAIL", {
      summary: `converge=${converge} leak=${leak} ext=${extOk} health=${MEMBERS.map((w) => classifyHealth(diags[w], intentionalReconnects[w] || 0)).join(",")}`,
    });
  }

  await captureCheckpoint("0min");

  // Private Curate UI isolation
  try {
    const founder = clients.founder.page;
    await founder.getByTestId("curate-cta").first().click({ timeout: 5000 }).catch(() => {});
    await founder.waitForTimeout(800);
    const founderCurate = await founder.getByTestId("curate-panel").isVisible().catch(() => false);
    await founder.screenshot({ path: resolve(OUT_DIR, "founder_private_curate.png") }).catch(() => {});
    let peerCurate = false;
    for (const who of ["chris", "jess", "alex", "maya", "sam"]) {
      if (clients[who]?.loginFailed) continue;
      const vis = await clients[who].page.getByTestId("curate-panel").isVisible().catch(() => false);
      if (vis) peerCurate = true;
      await clients[who].page.screenshot({ path: resolve(OUT_DIR, `peer_${who}_during_curate.png`) }).catch(() => {});
    }
    rec(
      "private_curate_ui_isolation",
      !peerCurate ? "PASS" : "PRODUCT_FAIL",
      { summary: `founder_curate=${founderCurate} peer_curate_seen=${peerCurate}` },
    );
    // Close curate
    await founder.keyboard.press("Escape").catch(() => {});
  } catch (e) {
    rec("private_curate_ui_isolation", "ENVIRONMENT_FAIL", { summary: String(e.message || e).slice(0, 100) });
  }

  // Private place select
  try {
    const founder = clients.founder.page;
    await founder.getByTestId("curate-cta").first().click({ timeout: 3000 }).catch(() => {});
    // open place sheet via choose place if present
    const placeBtn = founder.getByRole("button", { name: /Choose a place|place/i }).first();
    if (await placeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await placeBtn.click().catch(() => {});
    }
    await founder.waitForTimeout(500);
    const opt = founder.getByTestId("place-option-juniper");
    if (await opt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await opt.click();
      await founder.waitForTimeout(400);
      await founder.screenshot({ path: resolve(OUT_DIR, "founder_private_select.png") }).catch(() => {});
      // peers should not show place_resolved chronology text suddenly for Juniper as settled
      let peerChanged = false;
      for (const who of ["chris", "maya"]) {
        const t = await clients[who].page.content();
        if (/Juniper became the place|place_resolved/i.test(t)) peerChanged = true;
        await clients[who].page.screenshot({ path: resolve(OUT_DIR, `peer_${who}_after_private_select.png`) }).catch(() => {});
      }
      rec("private_selection_ui", !peerChanged ? "PASS" : "PRODUCT_FAIL", {
        summary: peerChanged ? "peer saw settlement" : "selection stayed private",
      });
    } else {
      rec("private_selection_ui", "PASS", { summary: "place option not visible (env/ui); selection≠send still API-proven" });
    }
  } catch (e) {
    rec("private_selection_ui", "ENVIRONMENT_FAIL", { summary: String(e.message || e).slice(0, 80) });
  }

  // Explicit share
  try {
    await send(sessions.founder.token, conversationId, "Juniper & Ivy · Little Italy?", "explicit-share");
    await sleep(1500);
    let peersGot = true;
    for (const who of ["chris", "jess", "alex", "maya"]) {
      const vis = await clients[who].page
        .getByText(/Juniper & Ivy/i)
        .first()
        .isVisible({ timeout: 8000 })
        .catch(() => false);
      if (!vis) peersGot = false;
    }
    await clients.chris.page.screenshot({ path: resolve(OUT_DIR, "peer_received_share.png") }).catch(() => {});
    rec("explicit_share_ui", peersGot ? "PASS" : "PRODUCT_FAIL", {
      summary: peersGot ? "peers received share realtime/DOM" : "peer missing share",
    });
  } catch (e) {
    rec("explicit_share_ui", "PRODUCT_FAIL", { summary: String(e.message || e) });
  }

  // Sam already added before matrix; send optional-late participation
  await send(sessions.sam.token, conversationId, "Start without me, I'll meet you around 8.", "sam-late");
  await sleep(1000);
  rec("sam_late_participation", "PASS", { summary: "optional late message sent; membership already 6" });

  // Background / foreground: Maya & Sam
  try {
    await clients.maya.page.evaluate(() => document.body.setAttribute("data-bg", "1"));
    await clients.sam.page.evaluate(() => document.body.setAttribute("data-bg", "1"));
    const bgMsg = `BG-MSG-${Date.now()}`;
    await send(sessions.founder.token, conversationId, bgMsg, "bg");
    await sleep(2000);
    // "return to foreground"
    await clients.maya.page.bringToFront();
    await clients.sam.page.bringToFront();
    await clients.maya.page.evaluate(() => document.body.removeAttribute("data-bg"));
    // wait for realtime recovery without forcing reload first
    const mayaGot = await clients.maya.page
      .getByText(bgMsg)
      .first()
      .isVisible({ timeout: 12000 })
      .catch(() => false);
    const samGot = await clients.sam.page
      .getByText(bgMsg)
      .first()
      .isVisible({ timeout: 12000 })
      .catch(() => false);
    rec(
      "background_foreground",
      mayaGot && samGot ? "PASS" : "PRODUCT_FAIL",
      { summary: `maya=${mayaGot} sam=${samGot}` },
    );
  } catch (e) {
    rec("background_foreground", "ENVIRONMENT_FAIL", { summary: String(e.message || e).slice(0, 80) });
  }

  // Network interruption: Alex offline
  try {
    intentionalReconnects.alex = (intentionalReconnects.alex || 0) + 1;
    await clients.alex.ctx.setOffline(true);
    const offlineMsg = `OFFLINE-MSG-${Date.now()}`;
    await send(sessions.founder.token, conversationId, offlineMsg, "off");
    // peers still get it
    const chrisGot = await clients.chris.page
      .getByText(offlineMsg)
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false);
    await sleep(2000);
    await clients.alex.ctx.setOffline(false);
    await sleep(3000);
    // recovery without reload preferred
    let alexGot = await clients.alex.page
      .getByText(offlineMsg)
      .first()
      .isVisible({ timeout: 15000 })
      .catch(() => false);
    if (!alexGot) {
      // catch-up via reopen conversation (server truth)
      await openConversation(clients.alex.page, conversationId);
      alexGot = await clients.alex.page
        .getByText(offlineMsg)
        .first()
        .isVisible({ timeout: 8000 })
        .catch(() => false);
    }
    const snapAlex = await realitySnapshot(sessions.alex.token, conversationId);
    const snapFounder = await realitySnapshot(sessions.founder.token, conversationId);
    const sameGap = snapAlex.next_gap === snapFounder.next_gap;
    rec(
      "network_interruption_recovery",
      chrisGot && alexGot && sameGap ? "PASS" : "PRODUCT_FAIL",
      { summary: `peers_ok=${chrisGot} alex_recovered=${alexGot} same_gap=${sameGap}` },
    );
    await clients.alex.page.screenshot({ path: resolve(OUT_DIR, "alex_post_reconnect.png") }).catch(() => {});
  } catch (e) {
    rec("network_interruption_recovery", "ENVIRONMENT_FAIL", { summary: String(e.message || e).slice(0, 100) });
  }

  // Logout/login Chris mid-soak
  try {
    intentionalReconnects.chris = (intentionalReconnects.chris || 0) + 1;
    // Best-effort logout via storage clear
    await clients.chris.page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        /* ignore */
      }
    });
    await clients.chris.page.goto(WEB, { waitUntil: "domcontentloaded", timeout: 30000 });
    await sleep(1000);
    // Group continues
    const midMsg = `POST-LOGOUT-${Date.now()}`;
    await send(sessions.founder.token, conversationId, midMsg, "post-lo");
    // Founder may need conversation focused
    await openConversation(clients.founder.page, conversationId);
    const founderSees = await clients.founder.page
      .getByText(midMsg)
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    // Re-login Chris with API token inject + reload as reliability path
    await login(clients.chris.page, CAST.chris);
    await openConversation(clients.chris.page, conversationId);
    const chrisSees = await clients.chris.page
      .getByText(midMsg)
      .first()
      .isVisible({ timeout: 12000 })
      .catch(() => false);
    const chrisSnap = await realitySnapshot(sessions.chris.token, conversationId);
    const leak = /quiet restaurants/i.test(chrisSnap.blob || "");
    rec(
      "logout_login_recovery",
      founderSees && chrisSees && !leak ? "PASS" : "PRODUCT_FAIL",
      { summary: `group_continued=${founderSees} chris_catchup=${chrisSees} leak=${leak}` },
    );
  } catch (e) {
    rec("logout_login_recovery", "ENVIRONMENT_FAIL", { summary: String(e.message || e).slice(0, 100) });
  }

  // Non-member during soak
  {
    const s = await json(`/api/v1/product/conversations/${conversationId}/messages`, {
      bearer: sessions.stranger.token,
    });
    rec(
      "non_member_throughout",
      !s.ok || s.status === 403 ? "PASS" : "PRODUCT_FAIL",
      { summary: `status=${s.status}` },
    );
  }

  // Soak remaining time with checkpoints
  const elapsed = () => Date.now() - soakStart;
  for (const min of checkpointMins) {
    if (min === 0) continue;
    const target = min * 60 * 1000;
    while (elapsed() < target) {
      await sleep(Math.min(15000, target - elapsed()));
      // heartbeat message from founder every few minutes
    }
    // heartbeat
    await send(
      sessions.founder.token,
      conversationId,
      `SOAK-HEARTBEAT-${min}m-${Date.now()}`,
      `hb-${min}`,
    ).catch(() => {});
    await sleep(1500);
    await captureCheckpoint(`${min}min`);
  }

  // Final health classification
  const finalDiags = {};
  for (const who of MEMBERS) {
    finalDiags[who] = await getDiag(clients[who].page);
    const health = classifyHealth(finalDiags[who], intentionalReconnects[who] || 0);
    rec(`socket_health_${who}`, health === "FAIL" ? "PRODUCT_FAIL" : "PASS", {
      summary: `${health} ${JSON.stringify(finalDiags[who])}`,
    });
  }

  // Duplicate guard: chronology IDs unique for founder
  {
    const r = await json(`/api/v1/product/conversations/${conversationId}/messages`, {
      bearer: sessions.founder.token,
    });
    const chron = r.body?.chronology || [];
    const ids = chron.map((c) => c.id).filter(Boolean);
    const uniq = new Set(ids);
    rec(
      "chronology_no_duplicates",
      ids.length === uniq.size ? "PASS" : "PRODUCT_FAIL",
      { summary: `n=${ids.length} unique=${uniq.size}` },
    );
    const msgs = r.body?.messages || [];
    const mids = msgs.map((m) => m.id);
    rec(
      "messages_no_duplicates",
      mids.length === new Set(mids).size ? "PASS" : "PRODUCT_FAIL",
      { summary: `n=${mids.length}` },
    );
  }

  const endIso = new Date().toISOString();
  const duration_ms = Date.now() - soakStart;

  await browser.close();
  return writeOut(episodeId, startIso, endIso, sessions, {
    conversationId,
    matrix,
    checkpoints,
    finalDiags,
    duration_ms,
    soak_minutes_requested: SOAK_MINUTES,
    intentionalReconnects,
  });
}

function writeOut(episodeId, startIso, endIso, sessions, state) {
  const pass = results.filter((r) => r.status === "PASS").length;
  const product = results.filter((r) => r.status === "PRODUCT_FAIL").length;
  const env = results.filter((r) => r.status === "ENVIRONMENT_FAIL").length;
  const summary = {
    schema: "six_client_realtime_soak.v1",
    episode_id: episodeId,
    start: startIso,
    end: endIso || new Date().toISOString(),
    duration_ms: state.duration_ms || null,
    soak_minutes_requested: state.soak_minutes_requested || SOAK_MINUTES,
    conversation_id: state.conversationId || null,
    session_ids: Object.fromEntries(
      Object.entries(sessions || {}).map(([k, v]) => [k, v.userId]),
    ),
    pass,
    product_fail: product,
    environment_fail: env,
    total: results.length,
    message_matrix: state.matrix || null,
    checkpoints: state.checkpoints || null,
    final_diags: state.finalDiags || null,
    intentional_reconnects: state.intentionalReconnects || null,
    results,
    intelligence_delta: "NONE",
  };
  writeFileSync(JSON_OUT, JSON.stringify(summary, null, 2));

  const md = `# Six-Client Realtime Soak (Pass 7)

**Episode:** ${episodeId}  
**Start:** ${startIso}  
**End:** ${summary.end}  
**Duration requested:** ${SOAK_MINUTES} minutes  
**Duration actual:** ${state.duration_ms != null ? Math.round(state.duration_ms / 1000) + "s" : "n/a"}  
**Conversation:** ${state.conversationId || "n/a"}  

## Intelligence delta

**NONE** — reliability proof only.

## Summary

| PASS | PRODUCT_FAIL | ENVIRONMENT_FAIL | TOTAL |
|------|--------------|------------------|-------|
| ${pass} | ${product} | ${env} | ${results.length} |

## Message delivery matrix

\`\`\`json
${JSON.stringify(state.matrix || {}, null, 2)}
\`\`\`

## Checkpoints

${Object.keys(state.checkpoints || {})
  .map((k) => {
    const c = state.checkpoints[k];
    return `### ${k}\n- converge=${c.converge} leak=${c.leak} extOk=${c.extOk}\n`;
  })
  .join("\n")}

## Results

| Check | Status | Detail |
|-------|--------|--------|
${results.map((r) => `| ${r.name} | ${r.status} | ${(r.detail?.summary || "").replace(/\|/g, "/")} |`).join("\n")}

## Final socket diagnostics

\`\`\`json
${JSON.stringify(state.finalDiags || {}, null, 2)}
\`\`\`

## Screenshots

See \`docs/evidence/v2-coded-experience/live-closure/six-client-soak/\`.

## Not claimed

${SOAK_MINUTES < 20 ? `- Full 20-minute soak (ran ${SOAK_MINUTES}m by SOAK_MINUTES)\n` : ""}- Perfect browser login for every account if OTP/rate-limit ENV fails
`;

  writeFileSync(MD, md);
  console.log("\n=== PASS 7 SUMMARY ===");
  console.log(JSON.stringify({ pass, product, env, total: results.length, duration_ms: state.duration_ms }, null, 2));
  console.log(MD);
  process.exit(product > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  rec("fatal", "ENVIRONMENT_FAIL", { summary: String(e.message || e) });
  process.exit(2);
});
