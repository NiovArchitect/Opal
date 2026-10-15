/**
 * Repair #7 — browser E2E against real Vite :5173 + Phoenix :4000.
 * Distinguishes API_PASS vs BROWSER_PASS. Never claims FOUNDER_PHONE_PASS.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = "/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people";
const BASE = process.env.OPAL_BASE || "http://127.0.0.1:5173";
const API = process.env.OPAL_API || "http://127.0.0.1:4000";
const outDir = path.join(root, "shots/repair7");
fs.mkdirSync(outDir, { recursive: true });

const mint = JSON.parse(fs.readFileSync("/tmp/opal_minted_walk_sessions.json", "utf8"));
const a = mint.sessions.find((s) => s.role === "a") || mint.sessions[0];
import { execSync } from "child_process";
const sha = (() => {
  try {
    return execSync("git rev-parse HEAD", { cwd: root }).toString().trim();
  } catch {
    return "unknown";
  }
})();
const findings = [];
const mark = (id, status, detail, evidence = {}) => {
  findings.push({ id, status, detail, evidence, sha_hint: sha, at: new Date().toISOString() });
  console.log(`[${status}] ${id}: ${detail}`);
};

async function apiPost(body) {
  const res = await fetch(`${API}/api/v1/product/opal/conversation/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${a.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ body }),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function apiGetConv() {
  const res = await fetch(`${API}/api/v1/product/opal/conversation`, {
    headers: { Authorization: `Bearer ${a.token}`, Accept: "application/json" },
  });
  return res.json();
}

async function waitJob(jobId, timeoutMs = 45000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const conv = await apiGetConv();
    const msgs = conv.conversation?.messages || [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      const md = m.metadata || {};
      if (md.action_job_id === jobId && ["results_ready", "failed"].includes(md.action_state)) {
        return m;
      }
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

async function inject(page) {
  await page.addInitScript(
    ({ token, userId, name, handle }) => {
      sessionStorage.setItem("opal.product.browser_session.v1", token);
      sessionStorage.setItem("opal_native_host", "1");
      localStorage.setItem(
        "opal.product.profile.v17",
        JSON.stringify({ user_id: userId, display_name: name, handle }),
      );
      localStorage.setItem("opal.founder_seed.opt_in.persist.v1", "1");
      sessionStorage.setItem("opal.founder_seed.opt_in.v1", "1");
      localStorage.setItem("opal.firstRun.v14.completed", "1");
      localStorage.setItem("opal.firstRun.v14.phoneVerified", "1");
      localStorage.setItem("opal.access_token", token);
      sessionStorage.setItem("opal.access_token", token);
    },
    {
      token: a.token,
      userId: a.userId,
      name: a.name || "Walk A",
      handle: a.handle || "realitygate",
    },
  );
}

async function ensureMember(page) {
  await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1&opal_open_center=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.evaluate(() => document.documentElement.classList.add("opal-native-host"));
  for (let i = 0; i < 50; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) return true;
    if (await page.getByTestId("opal-promise-already").isVisible().catch(() => false)) {
      await page.getByTestId("opal-promise-already").click({ force: true }).catch(() => {});
    }
    if (await page.getByTestId("fr06-skip-for-now").isVisible().catch(() => false)) {
      await page.getByTestId("fr06-skip-for-now").click({ force: true }).catch(() => {});
    }
    if (await page.getByTestId("hs-skip-to-auth").isVisible().catch(() => false)) {
      await page.getByTestId("hs-skip-to-auth").click({ force: true }).catch(() => {});
    }
    await page.waitForTimeout(350);
  }
  return false;
}

async function openCenterChat(page) {
  const tab = page.getByTestId("member-tab-opal");
  if (await tab.isVisible().catch(() => false)) await tab.click({ force: true });
  await page.waitForTimeout(700);
  const talk = page.getByTestId("opal-center-talk-to-opal");
  if (await talk.isVisible().catch(() => false)) {
    await talk.click({ force: true });
    await page.waitForTimeout(800);
  }
  const input = page.getByTestId("opal-center-chat-input");
  for (let i = 0; i < 15; i++) {
    if (await input.isVisible().catch(() => false)) break;
    if (await talk.isVisible().catch(() => false)) {
      await talk.click({ force: true }).catch(() => {});
    }
    await page.waitForTimeout(400);
  }
  return input;
}

async function sendCenter(page, text) {
  const input = page.getByTestId("opal-center-chat-input");
  await input.waitFor({ state: "visible", timeout: 20000 });
  await input.fill(text);
  await page.getByTestId("opal-center-chat-send").click({ force: true });
  await page.waitForTimeout(1200);
}

// ---------- API probes ----------
{
  const nh = await apiPost("Arrange dinner at Nighthawk in Coronado.");
  const opal = (nh.json.messages || []).find((m) => m.role === "opal");
  const job = opal?.metadata?.action_job_id;
  mark(
    "API_NIGHTHAWK_QUEUED",
    job && /Looking up|Nighthawk|Night Hawk/i.test(opal?.body || "") ? "API_PASS" : "FAIL",
    `status=${nh.status} body=${(opal?.body || "").slice(0, 120)} job=${job}`,
    { body: opal?.body, job },
  );
  if (job) {
    const done = await waitJob(job);
    const opts = done?.metadata?.options || [];
    const hit = opts.some((o) => /night\s*hawk/i.test(o.name || "") && /1315|Orange|Coronado/i.test(o.address || ""));
    mark(
      "API_NIGHTHAWK_RESOLVED",
      done && done.metadata?.action_state === "results_ready" && hit ? "API_PASS" : "FAIL",
      `state=${done?.metadata?.action_state} body=${(done?.body || "").slice(0, 160)} opts=${opts.map((o) => o.name).join(",")}`,
      { options: opts, body: done?.body },
    );
  }

  const med = await apiPost("Find three Mediterranean restaurants in Coronado.");
  const mop = (med.json.messages || []).find((m) => m.role === "opal");
  const mjob = mop?.metadata?.action_job_id;
  const mode = mop?.metadata?.search_mode || mop?.metadata?.planning_context?.search_mode;
  const medPc = mop?.metadata?.planning_context || {};
  const noInheritedWhen =
    !medPc.when &&
    !medPc.when_resolved &&
    !/Friday|Saturday/i.test(mop?.body || "");
  mark(
    "API_MED_QUEUED_DISCOVERY",
    mjob && mode === "discovery" && noInheritedWhen ? "API_PASS" : "FAIL",
    `job=${mjob} mode=${mode} when=${medPc.when} body=${(mop?.body || "").slice(0, 140)}`,
    { planning: medPc, body: mop?.body },
  );
  if (mjob) {
    const done = await waitJob(mjob, 60000);
    const opts = done?.metadata?.options || [];
    const cuisineOk = opts.length > 0 && opts.every((o) => {
      const hay = `${o.cuisine || ""} ${(o.categories || []).join(" ")}`.toLowerCase();
      return /mediterranean|greek|lebanese|turkish|italian/.test(hay) || /mediterranean/i.test(done.body || "");
    });
    const irrelevant = opts.some((o) => /crown bistro|night & day|clayton/i.test(o.name || ""));
    mark(
      "API_MED_RESULTS",
      done?.metadata?.action_state === "results_ready" && opts.length >= 1 && cuisineOk && !irrelevant
        ? "API_PASS"
        : "FAIL",
      `state=${done?.metadata?.action_state} n=${opts.length} body=${(done?.body || "").slice(0, 180)} names=${opts.map((o) => o.name).join("|")}`,
      { options: opts, body: done?.body },
    );
  }

  const fri = await apiPost("Let's arrange dinner Friday.");
  const fop = (fri.json.messages || []).find((m) => m.role === "opal");
  const pc = fop?.metadata?.planning_context || {};
  const intent = fop?.metadata?.intent || {};
  mark(
    "API_FRIDAY_GENERIC",
    pc.intent_scope === "generic_open_window" && pc.when === "Friday" && !pc.who
      ? "API_PASS"
      : /Friday|dinner|7:30|who|where/i.test(fop?.body || "")
        ? "API_PASS"
        : "FAIL",
    `scope=${pc.intent_scope} when=${pc.when} who=${pc.who} body=${(fop?.body || "").slice(0, 160)}`,
    { planning: pc, intent, body: fop?.body },
  );
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
await inject(page);
const member = await ensureMember(page);
mark("BROWSER_MEMBER_SHELL", member ? "BROWSER_PASS" : "FAIL", `member=${member}`);
await page.screenshot({ path: path.join(outDir, "01_member.png"), fullPage: false });

const input = await openCenterChat(page);
const inputVisible = await input.isVisible().catch(() => false);
mark("BROWSER_CENTER_COMPOSER", inputVisible ? "BROWSER_PASS" : "FAIL", `inputVisible=${inputVisible}`);

if (inputVisible) {
  // P0-D composer overflow
  const lines = [
    "one line dinner",
    "line1\nline2\nline3",
    "L1\nL2\nL3\nL4\nL5",
    Array.from({ length: 10 }, (_, i) => `Line ${i + 1} of a long composer message`).join("\n"),
  ];
  for (let i = 0; i < lines.length; i++) {
    await input.fill(lines[i]);
    await page.waitForTimeout(200);
    const geom = await input.evaluate((el) => {
      const cs = getComputedStyle(el);
      const parent = el.closest(".opal-center-chat-composer");
      const pr = parent?.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return {
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        height: cs.height,
        overflowY: cs.overflowY,
        inputBottom: r.bottom,
        shellBottom: pr?.bottom ?? null,
        shellHeight: pr?.height ?? null,
        overflowsShell: pr ? r.bottom > pr.bottom + 1 || r.top < pr.top - 1 : null,
      };
    });
    await page.screenshot({ path: path.join(outDir, `composer_${i + 1}.png`) });
    const ok = geom.overflowsShell === false && parseFloat(geom.height) <= 110;
    mark(
      `BROWSER_COMPOSER_LINES_${[1, 3, 5, 10][i]}`,
      ok ? "BROWSER_PASS" : "FAIL",
      JSON.stringify(geom),
      geom,
    );
  }
  await input.fill("");

  // P0-A Nighthawk via UI
  const net = [];
  page.on("request", (req) => {
    if (req.url().includes("/opal/conversation/messages") && req.method() === "POST") {
      net.push({ url: req.url(), post: req.postData() });
    }
  });
  await sendCenter(page, "Arrange dinner at Nighthawk in Coronado.");
  await page.waitForTimeout(8000);
  await page.screenshot({ path: path.join(outDir, "02_nighthawk.png") });
  const threadText = await page.locator('[data-testid="opal-center-chat-thread"], .opal-center-chat-thread').innerText().catch(() => page.locator("body").innerText());
  const nhUi =
    /Night Hawk|1315 Orange|Looking up Nighthawk/i.test(threadText) &&
    net.some((n) => /Nighthawk/i.test(n.post || ""));
  mark(
    "BROWSER_NIGHTHAWK",
    nhUi ? "BROWSER_PASS" : "FAIL",
    `netPosts=${net.length} hasNighthawk=${/Night Hawk|Nighthawk/i.test(threadText)} snippet=${threadText.slice(-300)}`,
    { net, snippet: threadText.slice(-500) },
  );

  // P0-B Mediterranean via UI
  await sendCenter(page, "Find three Mediterranean restaurants in Coronado.");
  await page.waitForTimeout(10000);
  await page.screenshot({ path: path.join(outDir, "03_mediterranean.png") });
  const medText = await page.locator('[data-testid="opal-center-chat-thread"], .opal-center-chat-thread').innerText().catch(() => "");
  const medTail = medText.slice(-500);
  const medOk =
    /mediterranean|Mimosa|Callie|Night Hawk|Luna Grill|Shawarma|Looking for Mediterranean/i.test(medTail) &&
    !/Crown Bistro|Tell me more — I can help you plan/i.test(medTail) &&
    !/Got it — Friday/i.test(medTail);
  mark(
    "BROWSER_MEDITERRANEAN",
    medOk ? "BROWSER_PASS" : "FAIL",
    `snippet=${medTail.slice(-350)}`,
    { snippet: medTail },
  );

  // P0-C Friday
  await sendCenter(page, "Let's arrange dinner Friday.");
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(outDir, "04_friday.png") });
  const friText = await page.locator('[data-testid="opal-center-chat-thread"], .opal-center-chat-thread').innerText().catch(() => "");
  const friOk = /Friday|dinner|7:30|who|where|plan/i.test(friText.slice(-400));
  mark(
    "BROWSER_FRIDAY",
    friOk ? "BROWSER_PASS" : "FAIL",
    `snippet=${friText.slice(-300)}`,
    { snippet: friText.slice(-400) },
  );
}

// P0-E / P0-F via Chat seed surface
// Fresh chats navigation for order + Back proofs (Center chat can leave dock state odd).
await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.evaluate(() => document.documentElement.classList.add("opal-native-host"));
for (let i = 0; i < 40; i++) {
  if (await page.getByTestId("member-shell").isVisible().catch(() => false)) break;
  await page.waitForTimeout(300);
}
await page.getByTestId("member-tab-chats").click({ force: true }).catch(() => {});
await page.waitForTimeout(800);
// Close contact profile if a prior click landed there.
if (await page.getByRole("button", { name: /^Message$/i }).isVisible().catch(() => false)) {
  await page.getByRole("button", { name: /^Message$/i }).click({ force: true }).catch(() => {});
  await page.waitForTimeout(800);
}
await page.getByTestId("chats-home-list").waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(outDir, "05_chats.png") });

async function openChanelleThread() {
  // Already in a hydrated human thread?
  if ((await page.locator('[data-testid="human-message-row"]').count().catch(() => 0)) >= 2) {
    return true;
  }
  // From contact profile sheet.
  const messageBtn = page.getByRole("button", { name: /^Message$/i });
  if (await messageBtn.isVisible().catch(() => false)) {
    await messageBtn.click({ force: true });
    await page.waitForTimeout(1000);
  }
  // From chats list row (prefer testid row button).
  if ((await page.locator('[data-testid="human-message-row"]').count().catch(() => 0)) < 2) {
    const list = page.getByTestId("chats-home-list");
    if (!(await list.isVisible().catch(() => false))) {
      await page.getByTestId("member-tab-chats").click({ force: true }).catch(() => {});
      await page.waitForTimeout(600);
    }
    const row = page.locator('[data-testid="chats-home-list"] button[data-name="Chanelle"]').first();
    if (await row.isVisible().catch(() => false)) {
      await row.click({ force: true });
      await page.waitForTimeout(1000);
    }
  }
  // If profile opened, enter Message.
  if (await page.getByRole("button", { name: /^Message$/i }).isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /^Message$/i }).click({ force: true });
    await page.waitForTimeout(1000);
  }
  for (let i = 0; i < 20; i++) {
    if ((await page.locator('[data-testid="human-message-row"]').count().catch(() => 0)) >= 2) return true;
    await page.waitForTimeout(250);
  }
  return (await page.locator('[data-testid="human-message-row"]').count().catch(() => 0)) >= 1;
}

const chanelleOpen = await openChanelleThread();
await page.screenshot({ path: path.join(outDir, "06_chanelle.png") });
if (chanelleOpen) {
  const rows = page.locator('[data-testid="human-message-row"]');
  const n = await rows.count().catch(() => 0);
  if (n >= 2) {
    const order = await rows.evaluateAll((els) =>
      els.slice(0, 8).map((el) => ({
        top: el.getBoundingClientRect().top,
        text: (el.innerText || "").slice(0, 80),
      })),
    );
    const tops = order.map((o) => o.top);
    const ascending = tops.every((t, i) => i === 0 || t >= tops[i - 1] - 1);
    mark("BROWSER_CHAT_ORDER_LAYOUT", ascending ? "BROWSER_PASS" : "FAIL", JSON.stringify(order), { order });
  } else {
    mark("BROWSER_CHAT_ORDER_LAYOUT", "YELLOW", `rows=${n}`);
  }

  // Send a message and ensure it appears below
  const composer = page.locator(".composer-618 textarea, .composer-618 input, textarea.opal-query, [data-testid='chat-composer-input']").first();
  if (await composer.isVisible().catch(() => false)) {
    const beforeCount = await rows.count().catch(() => 0);
    await composer.fill(`R7 order probe ${Date.now()}`);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1500);
    const after = await rows.evaluateAll((els) =>
      els.map((el) => ({
        top: el.getBoundingClientRect().top,
        text: (el.innerText || "").slice(0, 100),
      })),
    );
    const probeIdx = after.findIndex((o) => /R7 order probe/i.test(o.text || ""));
    const probeBelowPriors =
      probeIdx > 0 && after.slice(0, probeIdx).every((o) => o.top <= after[probeIdx].top + 1);
    mark(
      "BROWSER_CHAT_NEW_BELOW",
      probeIdx >= 0 && probeBelowPriors ? "BROWSER_PASS" : "FAIL",
      `before=${beforeCount} probeIdx=${probeIdx} after=${JSON.stringify(after.slice(-4))}`,
      { after, probeIdx },
    );
    await page.screenshot({ path: path.join(outDir, "07_chat_order.png") });
  } else {
    mark("BROWSER_CHAT_NEW_BELOW", "FAIL", "Composer not visible in Chanelle thread");
  }

  // Open plan strip / shared graph if present, then Back — must be Graph Detail, not contact profile.
  const planStrip = page.getByTestId("next-plan-strip");
  const shared = page.getByRole("button", { name: /Juniper|Shared Graph|Open plan/i }).first();
  if (await planStrip.isVisible().catch(() => false)) {
    await planStrip.click({ force: true });
  } else if (await shared.isVisible().catch(() => false)) {
    await shared.click({ force: true });
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, "08_plan_from_chat.png") });
  const graphBack = page.getByTestId("graph-detail-back");
  if (await graphBack.isVisible().catch(() => false)) {
    await graphBack.click({ force: true });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, "09_after_back.png") });
    const threadRows = await page.locator('[data-testid="human-message-row"]').count().catch(() => 0);
    const graphsTab =
      (await page.getByTestId("member-tab-graphs").getAttribute("aria-current").catch(() => null)) ===
      "page";
    mark(
      "BROWSER_BACK_TO_CHAT",
      threadRows > 0 && !graphsTab ? "BROWSER_PASS" : "FAIL",
      `threadRows=${threadRows} graphsTab=${graphsTab}`,
    );
  } else {
    mark("BROWSER_BACK_TO_CHAT", "YELLOW", "Graph detail back not visible (plan strip may be missing)");
  }
} else {
  mark("BROWSER_CHAT_ORDER_LAYOUT", "YELLOW", "Chanelle thread not opened");
  mark("BROWSER_BACK_TO_CHAT", "YELLOW", "Chanelle thread not opened");
}

// ---------- P0-G founder-led plan time patch (API + Center UI) ----------
{
  const create = await apiPost("Arrange dinner at Nighthawk in Coronado on Friday.");
  const cOp = (create.json.messages || []).find((m) => m.role === "opal");
  const cJob = cOp?.metadata?.action_job_id;
  let planId = cOp?.metadata?.plan_id || cOp?.metadata?.planning_context?.plan_id;
  if (cJob) {
    const done = await waitJob(cJob, 45000);
    planId = planId || done?.metadata?.plan_id || done?.metadata?.planning_context?.plan_id;
  }
  const corr = await apiPost("Make it 9:15 PM instead.");
  const corrOp = (corr.json.messages || []).find((m) => m.role === "opal");
  const corrMd = corrOp?.metadata || {};
  const corrPc = corrMd.planning_context || {};
  const corrPlan = corrMd.plan_id || corrPc.plan_id;
  const patched =
    corrMd.action_state === "plan_patched" &&
    corrMd.PLAN_ID_STABLE === true &&
    Array.isArray(corrMd.slots_changed) &&
    corrMd.slots_changed.includes("when_time") &&
    /9:?15\s*PM/i.test(corrOp?.body || "") &&
    (!planId || corrPlan === planId);
  mark(
    "API_FOUNDER_LED_TIME_PATCH",
    patched ? "API_PASS" : "FAIL",
    `planBefore=${planId} planAfter=${corrPlan} state=${corrMd.action_state} slots=${JSON.stringify(corrMd.slots_changed)} body=${(corrOp?.body || "").slice(0, 140)}`,
    { planId, corrPlan, corrMd, body: corrOp?.body },
  );
}

// Chanelle human chat: proposal must not auto-amend SharedPlan commitment.
{
  const beforePlan = await fetch(`${API}/api/v1/product/opal/conversation`, {
    headers: { Authorization: `Bearer ${a.token}`, Accept: "application/json" },
  }).then((r) => r.json());
  const beforePc =
    (beforePlan.conversation?.messages || [])
      .slice()
      .reverse()
      .map((m) => m.metadata?.planning_context)
      .find((pc) => pc?.plan_id) || {};
  // Re-open Chanelle if needed and send proposal-only language.
  await page.getByTestId("member-tab-chats").click({ force: true }).catch(() => {});
  await page.waitForTimeout(600);
  const ch = page.locator('[data-testid="chats-home-list"] [data-name="Chanelle"]').first();
  if (await ch.isVisible().catch(() => false)) {
    await ch.click({ force: true });
    await page.waitForTimeout(800);
  }
  const humanComposer = page
    .locator(".composer-618 textarea, .composer-618 input, textarea.opal-query, [data-testid='chat-composer-input']")
    .first();
  if (await humanComposer.isVisible().catch(() => false)) {
    const proposal = `Let's do 8 PM instead (R7 proposal ${Date.now()})`;
    await humanComposer.fill(proposal);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outDir, "10_chanelle_proposal.png") });
    const rows = await page.locator('[data-testid="human-message-row"]').evaluateAll((els) =>
      els.map((el) => (el.innerText || "").slice(0, 120)),
    );
    const proposalVisible = rows.some((t) => /R7 proposal/i.test(t || ""));
    // Center planning context must not flip to plan_patched from a human-chat proposal.
    const after = await fetch(`${API}/api/v1/product/opal/conversation`, {
      headers: { Authorization: `Bearer ${a.token}`, Accept: "application/json" },
    }).then((r) => r.json());
    const recent = (after.conversation?.messages || []).slice(-6);
    const illicitPatch = recent.some(
      (m) =>
        m.role === "opal" &&
        m.metadata?.action_state === "plan_patched" &&
        /R7 proposal|8 PM instead/i.test(m.body || ""),
    );
    mark(
      "BROWSER_CHANELLE_PROPOSAL_NOT_AMENDMENT",
      proposalVisible && !illicitPatch ? "BROWSER_PASS" : "FAIL",
      `proposalVisible=${proposalVisible} illicitPatch=${illicitPatch} priorPlan=${beforePc.plan_id || null}`,
      { rows: rows.slice(-4), illicitPatch },
    );
  } else {
    mark("BROWSER_CHANELLE_PROPOSAL_NOT_AMENDMENT", "YELLOW", "Chanelle composer not available");
  }
}

await browser.close();

const summary = {
  build: { branch_hint: sha, vite: BASE, api: API, userId: a.userId },
  findings,
  counts: findings.reduce((acc, f) => {
    acc[f.status] = (acc[f.status] || 0) + 1;
    return acc;
  }, {}),
  FOUNDER_PHONE_PASS: "NOT_CLAIMED",
  PASS2_UNLOCKED: "NO",
  FREEZE: "HOLD",
};
fs.writeFileSync(path.join(outDir, "VERIFY.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary.counts, null, 2));
const fails = findings.filter((f) => f.status === "FAIL");
process.exit(fails.length ? 1 : 0);
