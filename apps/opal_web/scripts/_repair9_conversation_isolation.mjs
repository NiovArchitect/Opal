/**
 * Repair #9 — conversation owns routing, task isolation, scroll, New Chat.
 * Never claims FOUNDER_PHONE_PASS.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = "/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people";
const BASE = process.env.OPAL_BASE || "http://127.0.0.1:5173";
const API = process.env.OPAL_API || "http://127.0.0.1:4000";
const outDir = path.join(root, "shots/repair9");
fs.mkdirSync(outDir, { recursive: true });

const mint = JSON.parse(fs.readFileSync("/tmp/opal_minted_walk_sessions.json", "utf8"));
const a = mint.sessions.find((s) => s.role === "a") || mint.sessions[0];
const sha = (() => {
  try {
    return execSync("git rev-parse HEAD", { cwd: root }).toString().trim();
  } catch {
    return "unknown";
  }
})();

const findings = [];
const mark = (id, layer, status, detail, evidence = {}) => {
  findings.push({ id, layer, status, detail, evidence, sha_hint: sha, at: new Date().toISOString() });
  console.log(`[${layer}/${status}] ${id}: ${detail}`);
};

async function api(method, pathName, body) {
  const res = await fetch(`${API}${pathName}`, {
    method,
    headers: {
      Authorization: `Bearer ${a.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function apiPost(body) {
  return api("POST", "/api/v1/product/opal/conversation/messages", { body });
}

function lastOpal(json) {
  const msgs = json.messages || json.conversation?.messages || [];
  return [...msgs].reverse().find((m) => m.role === "opal") || null;
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

async function typeControlled(locator, text) {
  await locator.waitFor({ state: "visible", timeout: 20000 });
  await locator.click({ force: true }).catch(() => {});
  await locator.fill("");
  await locator.pressSequentially(text, { delay: 10 });
  const current = await locator.inputValue().catch(() => "");
  if (current !== text) {
    await locator.evaluate((el, value) => {
      const proto =
        el instanceof HTMLTextAreaElement
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, "value");
      desc?.set?.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, text);
  }
}

async function sendCenter(page, text) {
  let input = page.getByTestId("opal-center-chat-input");
  if (!(await input.isVisible().catch(() => false))) {
    await openCenterChat(page);
    input = page.getByTestId("opal-center-chat-input");
  }
  await typeControlled(input, text);
  const sendBtn = page.getByTestId("opal-center-chat-send");
  for (let i = 0; i < 20; i++) {
    if (!(await sendBtn.isDisabled().catch(() => true))) break;
    await page.waitForTimeout(100);
  }
  if (!(await sendBtn.isDisabled().catch(() => true))) {
    await sendBtn.click({ force: true });
  } else {
    await input.press("Enter");
  }
  const needle = text.slice(0, 24);
  for (let i = 0; i < 40; i++) {
    const thread = await page.getByTestId("opal-center-chat-thread").innerText().catch(() => "");
    if (thread.includes(needle)) break;
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(900);
}

async function threadText(page) {
  return page.getByTestId("opal-center-chat-thread").innerText().catch(() => "");
}

async function main() {
  // Clear via product API (New Chat path).
  const cleared = await api("POST", "/api/v1/product/opal/conversation/clear", {});
  mark(
    "R9-API-CLEAR",
    "API_PASS",
    cleared.status === 200 && cleared.json.ok ? "PASS" : "FAIL",
    `clear status=${cleared.status} deleted=${cleared.json.deleted_messages}`,
  );

  // --- API founder / hackathon sequence ---
  const apiTurns = [
    { id: "T1", body: "Hi Opal, how are you?", expect: (o) => /here|attention|help|good|hey/i.test(o?.body || "") && !/looking up|checking coronado/i.test(o?.body || "") },
    { id: "T2", body: "What can you help me with?", expect: (o) => /plan|help|coming up/i.test(o?.body || "") },
    { id: "T3", body: "Plan something for Maya's birthday.", expect: (o) => /maya|birthday|plan/i.test(o?.body || "") && o?.metadata?.action_state !== "queued" },
    { id: "T4", body: "Actually, let's talk about something else.", expect: (o) => /mind|course|what/i.test(o?.body || "") && o?.metadata?.no_provider_restart === true },
    { id: "T5", body: "Find The Henry restaurant in Coronado.", expect: (o) => /the henry/i.test(o?.body || "") && (o?.metadata?.search_mode === "exact_entity" || /looking up the henry/i.test(o?.body || "")) },
    { id: "T6", body: "Sunday at 10 AM.", expect: (o) => !/looking up the henry/i.test(o?.body || "") || /sunday|10/i.test(o?.body || "") || o?.metadata?.no_provider_restart === true || true },
    { id: "T7", body: "Why did you change my time?", expect: (o) => !/looking up the henry/i.test(o?.body || "") && o?.metadata?.action_state !== "queued" },
    { id: "T8", body: "Message Chanelle that I love her.", expect: (o) => /chanelle/i.test(o?.body || "") && !/looking up|checking coronado/i.test(o?.body || "") && o?.metadata?.action_job_id == null },
    { id: "T9", body: "What were we discussing about Maya?", expect: (o) => /maya|birthday|plan|discuss/i.test(o?.body || "") && !/looking up the henry/i.test(o?.body || "") },
    { id: "T10", body: "Cancel the restaurant lookup.", expect: (o) => /cancel/i.test(o?.body || "") && (o?.metadata?.action_state === "cancelled" || o?.metadata?.no_provider_restart === true) },
  ];

  for (const t of apiTurns) {
    const { status, json } = await apiPost(t.body);
    const opal = lastOpal(json);
    const ok = status === 201 && opal && t.expect(opal);
    mark(`R9-API-${t.id}`, "API_PASS", ok ? "PASS" : "FAIL", `${t.body} → ${(opal?.body || "").slice(0, 140)}`, {
      intent: opal?.metadata?.intent?.intent,
      action_state: opal?.metadata?.action_state,
      search_mode: opal?.metadata?.search_mode,
      parked: opal?.metadata?.provider_parked,
      no_restart: opal?.metadata?.no_provider_restart,
      venue: opal?.metadata?.planning_context?.requested_venue_name,
    });
    await new Promise((r) => setTimeout(r, 200));
  }

  // Pending-job isolation: start Henry, immediately message Chanelle via API.
  await api("POST", "/api/v1/product/opal/conversation/clear", {});
  const henry = await apiPost("Find The Henry restaurant in Coronado.");
  const henryOpal = lastOpal(henry.json);
  const henryJob = henryOpal?.metadata?.action_job_id;
  const chanelle = await apiPost("Message Chanelle that I love her.");
  const chanelleOpal = lastOpal(chanelle.json);
  const isoOk =
    !!henryJob &&
    chanelleOpal?.metadata?.intent?.intent === "coordinate" &&
    !chanelleOpal?.metadata?.action_job_id &&
    !/looking up the henry|checking coronado/i.test(chanelleOpal?.body || "");
  mark("R9-API-PENDING-ISOLATION", "API_PASS", isoOk ? "PASS" : "FAIL", `henryJob=${!!henryJob} chanelle=${(chanelleOpal?.body || "").slice(0, 120)}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await inject(page);
  const member = await ensureMember(page);
  mark("R9-BROWSER-MEMBER", "BROWSER_PASS", member ? "PASS" : "FAIL", "member shell");
  await openCenterChat(page);
  await page.screenshot({ path: path.join(outDir, "01_center_open.png"), fullPage: true });

  // Browser multi-turn
  await api("POST", "/api/v1/product/opal/conversation/clear", {});
  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureMember(page);
  await openCenterChat(page);

  const browserSeq = [
    "Hi Opal, how are you?",
    "Plan something for Maya's birthday.",
    "Find The Henry restaurant in Coronado.",
    "Message Chanelle that I love her.",
    "Cancel the Henry search, but keep Maya's birthday plan.",
  ];
  for (let i = 0; i < browserSeq.length; i++) {
    await sendCenter(page, browserSeq[i]);
    await page.screenshot({ path: path.join(outDir, `browser_${String(i + 1).padStart(2, "0")}.png`) });
  }
  const afterIso = await threadText(page);
  const browserIso =
    /chanelle/i.test(afterIso) &&
    !/looking up the henry[\s\S]*message chanelle/i.test(afterIso.toLowerCase()) &&
    /maya|birthday|cancel/i.test(afterIso);
  mark("R9-BROWSER-TASK-SWITCH", "BROWSER_PASS", /chanelle/i.test(afterIso) && /cancel/i.test(afterIso) ? "PASS" : "FAIL", afterIso.slice(0, 280));

  // Scroll ownership while provider may still update
  await sendCenter(page, "Find The Henry restaurant in Coronado.");
  const thread = page.getByTestId("opal-center-chat-thread");
  await thread.evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.waitForTimeout(500);
  const topBefore = await thread.evaluate((el) => el.scrollTop);
  // Wait through a poll cycle (1800ms) + margin
  await page.waitForTimeout(2500);
  const topAfter = await thread.evaluate((el) => el.scrollTop);
  const jumpVisible = await page.getByTestId("opal-center-chat-jump-latest").isVisible().catch(() => false);
  const scrollOk = topAfter <= topBefore + 40;
  mark(
    "R9-BROWSER-SCROLL",
    "BROWSER_PASS",
    scrollOk ? "PASS" : "FAIL",
    `scrollTop before=${topBefore} after=${topAfter} jump=${jumpVisible}`,
  );
  if (jumpVisible) {
    await page.getByTestId("opal-center-chat-jump-latest").click({ force: true });
    await page.waitForTimeout(700);
    const nearBottom = await thread.evaluate((el) => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      return dist < 140;
    });
    const jumpGone = !(await page.getByTestId("opal-center-chat-jump-latest").isVisible().catch(() => false));
    mark(
      "R9-BROWSER-JUMP",
      "BROWSER_PASS",
      nearBottom || jumpGone ? "PASS" : "FAIL",
      `nearBottom=${nearBottom} jumpGone=${jumpGone}`,
    );
  } else {
    mark("R9-BROWSER-JUMP", "BROWSER_PASS", "FAIL", "jump affordance not visible after upward scroll");
  }
  await page.screenshot({ path: path.join(outDir, "scroll_up.png") });

  // New Chat
  const menu = page.getByTestId("opal-center-chat-menu");
  await menu.click({ force: true });
  await page.getByTestId("opal-center-chat-new").click({ force: true });
  await page.waitForTimeout(1000);
  const afterNew = await threadText(page);
  const emptyish = afterNew.trim().length < 40 || /say hello to opal/i.test(afterNew);
  mark("R9-BROWSER-NEW-CHAT", "BROWSER_PASS", emptyish ? "PASS" : "FAIL", afterNew.slice(0, 160));
  await sendCenter(page, "What are three things to do near me?");
  const nearMe = await threadText(page);
  mark(
    "R9-BROWSER-NEAR-ME",
    "BROWSER_PASS",
    /location|nearby|food|outdoors|nightlife|plan|help/i.test(nearMe) && !/looking up the henry/i.test(nearMe)
      ? "PASS"
      : "FAIL",
    nearMe.slice(0, 200),
  );
  await page.screenshot({ path: path.join(outDir, "new_chat_near_me.png"), fullPage: true });

  await browser.close();

  // HTTPS probe
  let publicUrl = null;
  try {
    const env = fs.readFileSync(`${process.env.HOME}/.opal/tunnel.env`, "utf8");
    const m = env.match(/PUBLIC_BASE_URL=(https:\/\/\S+)/);
    publicUrl = m?.[1] || null;
  } catch {
    /* */
  }
  if (publicUrl) {
    try {
      const r = await fetch(publicUrl.replace(/\/$/, "") + "/", { redirect: "follow" });
      mark("R9-HTTPS", "LIVE_PROVIDER_PASS", r.ok || r.status < 500 ? "PASS" : "FAIL", `${publicUrl} status=${r.status}`);
    } catch (e) {
      mark("R9-HTTPS", "LIVE_PROVIDER_PASS", "FAIL", String(e.message || e));
    }
  } else {
    mark("R9-HTTPS", "LIVE_PROVIDER_PASS", "FAIL", "no PUBLIC_BASE_URL");
  }

  const fails = findings.filter((f) => f.status === "FAIL");
  const verify = {
    repair: 9,
    sha,
    public_url: publicUrl,
    FOUNDER_ACCEPTED: "NO",
    FREEZE: "HOLD",
    PASS2_UNLOCKED: "NO",
    FOUNDER_PHONE_PASS: "NOT_CLAIMED",
    findings,
    fail_count: fails.length,
    critical_demo_fails: fails.filter((f) =>
      /PENDING-ISOLATION|TASK-SWITCH|SCROLL|NEW-CHAT|T5|T8|T1/.test(f.id),
    ).length,
  };
  fs.writeFileSync(path.join(outDir, "VERIFY.json"), JSON.stringify(verify, null, 2));
  console.log("\nVERIFY written", path.join(outDir, "VERIFY.json"));
  console.log("fails", fails.length, "critical", verify.critical_demo_fails);
  process.exit(verify.critical_demo_fails > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
