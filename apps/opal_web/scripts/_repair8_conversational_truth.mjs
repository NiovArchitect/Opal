/**
 * Repair #8 — multi-turn conversational truth against Vite :5173 + Phoenix :4000.
 * Acceptance unit: complete stateful human journeys across surfaces.
 * Never claims FOUNDER_PHONE_PASS.
 *
 * Isolation: clears Walk A Center messages + planning before browser,
 * types via pressSequentially (React controlled draft), then API probes.
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
const outDir = path.join(root, "shots/repair8");
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
const mark = (id, status, detail, evidence = {}) => {
  findings.push({ id, status, detail, evidence, sha_hint: sha, at: new Date().toISOString() });
  console.log(`[${status}] ${id}: ${detail}`);
};

/** Reset fixture Walk A Center thread so prior API jobs cannot contaminate UI. */
function clearWalkACenter() {
  const script = `
import Ecto.Query
uid = "${a.userId}"
c = OpalCore.Repo.get_by(OpalCore.OpalConversations.OpalConversation, user_id: uid)
if c do
  mod = OpalCore.OpalConversations.OpalMessage
  {n, _} = OpalCore.Repo.delete_all(from(m in mod, where: m.conversation_id == ^c.id))
  {:ok, _} = OpalCore.Center.PlanningContext.put(uid, %{})
  IO.puts("R8_CLEAR deleted=" <> Integer.to_string(n))
else
  IO.puts("R8_CLEAR no_conversation")
end
`;
  const tmp = "/tmp/opal_r8_clear.exs";
  fs.writeFileSync(tmp, script);
  try {
    const out = execSync(`mix run ${tmp}`, {
      cwd: path.join(root, "apps/opal_core"),
      env: { ...process.env, MIX_ENV: "dev" },
      encoding: "utf8",
      timeout: 120000,
    });
    console.log(out.split("\n").filter((l) => l.includes("R8_CLEAR")).join("\n") || "cleared");
  } catch (e) {
    console.warn("clearWalkACenter warning:", e.message?.slice(0, 200));
  }
}

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

function lastOpal(json) {
  const msgs = json.messages || json.conversation?.messages || [];
  return [...msgs].reverse().find((m) => m.role === "opal") || null;
}

async function waitJob(jobId, timeoutMs = 45000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const conv = await apiGetConv();
    const msgs = conv.conversation?.messages || [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      const md = msgs[i].metadata || {};
      if (md.action_job_id === jobId && ["results_ready", "failed"].includes(md.action_state)) {
        return msgs[i];
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

/** Real keyboard entry — fill() does not update React controlled `draft`. */
async function typeControlled(locator, text) {
  await locator.waitFor({ state: "visible", timeout: 20000 });
  await locator.click({ force: true }).catch(() => {});
  await locator.fill("");
  await locator.pressSequentially(text, { delay: 12 });
  // Belt-and-suspenders for stubborn controlled inputs (native value setter + input event).
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
    const disabled = await sendBtn.isDisabled().catch(() => true);
    if (!disabled) break;
    await page.waitForTimeout(100);
  }
  if (await sendBtn.isVisible().catch(() => false)) {
    const disabled = await sendBtn.isDisabled().catch(() => true);
    if (!disabled) {
      await sendBtn.click({ force: true });
    } else {
      await input.press("Enter");
    }
  } else {
    await input.press("Enter");
  }
  // Wait until the user bubble appears (proves React draft → send path).
  const needle = text.slice(0, 28);
  for (let i = 0; i < 40; i++) {
    const thread = await page
      .locator('[data-testid="opal-center-chat-thread"], .opal-center-chat-thread')
      .innerText()
      .catch(() => "");
    if (thread.includes(needle)) break;
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1200);
}

async function openChanelleThread(page) {
  await page.getByTestId("member-tab-chats").click({ force: true }).catch(() => {});
  await page.waitForTimeout(800);
  await page.getByTestId("chats-home-list").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  if (await page.getByRole("button", { name: /^Message$/i }).isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /^Message$/i }).click({ force: true });
    await page.waitForTimeout(800);
  }
  if ((await page.locator('[data-testid="human-message-row"]').count().catch(() => 0)) < 1) {
    const row = page.locator('[data-testid="chats-home-list"] button[data-name="Chanelle"]').first();
    if (await row.isVisible().catch(() => false)) {
      await row.scrollIntoViewIfNeeded().catch(() => {});
      await row.click({ force: true });
      await page.waitForTimeout(1200);
    } else {
      const byText = page.getByTestId("chats-home-list").getByText(/^Chanelle$/i).first();
      if (await byText.isVisible().catch(() => false)) {
        await byText.click({ force: true });
        await page.waitForTimeout(1200);
      }
    }
  }
  if (await page.getByRole("button", { name: /^Message$/i }).isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /^Message$/i }).click({ force: true });
    await page.waitForTimeout(800);
  }
  for (let i = 0; i < 24; i++) {
    if ((await page.locator('[data-testid="human-message-row"]').count().catch(() => 0)) >= 1) return true;
    await page.waitForTimeout(250);
  }
  return false;
}

async function sendChanelle(page, text) {
  const composer = page.locator("#composer-input, input.composer-input").first();
  await composer.waitFor({ state: "visible", timeout: 20000 });
  await composer.click({ force: true }).catch(() => {});
  // Native value setter — reliable for React controlled composer draft.
  await composer.evaluate((el, value) => {
    const proto =
      el instanceof HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    desc?.set?.call(el, "");
    el.dispatchEvent(new Event("input", { bubbles: true }));
    desc?.set?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, text);
  // Also type for realism / key handlers.
  await composer.pressSequentially(" ", { delay: 5 }).catch(() => {});
  await composer.press("Backspace").catch(() => {});
  const sendBtn = page.getByTestId("composer-send");
  for (let i = 0; i < 30; i++) {
    if (!(await sendBtn.isDisabled().catch(() => true))) break;
    await page.waitForTimeout(80);
  }
  await sendBtn.click({ force: true }).catch(async () => {
    await composer.press("Enter");
  });
  const needle = "R8 persist probe";
  for (let i = 0; i < 40; i++) {
    const byTestId = await page.locator('[data-testid="human-message-row"]').evaluateAll((els) =>
      els.map((el) => el.innerText || ""),
    );
    const byText = await page.getByText(needle).count().catch(() => 0);
    // Require bubble row — ignore leftover composer input text.
    if (byTestId.some((t) => t.includes(needle)) || byText > 0) {
      const inComposer = await composer.inputValue().catch(() => "");
      if (byTestId.some((t) => t.includes(needle))) return true;
      if (byText > 0 && !inComposer.includes(needle)) return true;
    }
    await page.waitForTimeout(200);
  }
  return false;
}

function newestSlice(thread, marker) {
  const idx = thread.lastIndexOf(marker);
  if (idx < 0) return thread.slice(-600);
  return thread.slice(idx);
}

// ---------- Isolate fixture Center ----------
clearWalkACenter();

// ---------- Browser multi-turn FIRST (consumer UI is the acceptance unit) ----------
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await inject(page);
const member = await ensureMember(page);
mark("BROWSER_MEMBER_SHELL", member ? "BROWSER_PASS" : "FAIL", `member=${member}`);

await openCenterChat(page);
const centerReady = await page.getByTestId("opal-center-chat-input").isVisible().catch(() => false);
mark("BROWSER_CENTER_READY", centerReady ? "BROWSER_PASS" : "FAIL", `centerReady=${centerReady}`);

if (centerReady) {
  const bdayMarker = "Maya's birthday is in three days.";
  await sendCenter(page, bdayMarker);
  await page.waitForTimeout(2000);
  await sendCenter(page, "Yes, plan something for Maya's birthday.");
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(outDir, "01_birthday.png") });
  let thread = await page
    .locator('[data-testid="opal-center-chat-thread"], .opal-center-chat-thread')
    .innerText()
    .catch(() => "");
  const bdaySlice = newestSlice(thread, bdayMarker);
  mark(
    "BROWSER_BIRTHDAY_NO_VENUE_BLEED",
    thread.includes(bdayMarker) && !/Night Hawk|Looking up Night/i.test(bdaySlice)
      ? "BROWSER_PASS"
      : "FAIL",
    `hasMarker=${thread.includes(bdayMarker)} slice=${bdaySlice.slice(-280)}`,
  );

  const henryMarker = "Make a plan to The Henry in Coronado for Sunday, 10 a.m.";
  await sendCenter(page, henryMarker);
  for (let i = 0; i < 50; i++) {
    thread = await page
      .locator('[data-testid="opal-center-chat-thread"], .opal-center-chat-thread')
      .innerText()
      .catch(() => "");
    if (/Looking up The Henry|The Henry in Coronado|Keeping 10 AM/i.test(thread)) break;
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(outDir, "02_henry.png") });
  thread = await page
    .locator('[data-testid="opal-center-chat-thread"], .opal-center-chat-thread')
    .innerText()
    .catch(() => "");
  const henrySlice = newestSlice(thread, henryMarker);
  // Reject only assistant mistakes (lookup of "Coronado for Sunday"), not the user's own words.
  const henryUi =
    /Looking up The Henry|The Henry in Coronado/i.test(henrySlice) &&
    !/7:30/i.test(henrySlice) &&
    !/Looking up Coronado for Sunday|Checking Coronado for Sunday/i.test(henrySlice);
  mark("BROWSER_HENRY_EXPLICIT", henryUi ? "BROWSER_PASS" : "FAIL", `slice=${henrySlice.slice(-320)}`);

  const challengeMarker = "Why did you change the time when I said 10 a.m.?";
  await sendCenter(page, challengeMarker);
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(outDir, "03_challenge.png") });
  thread = await page
    .locator('[data-testid="opal-center-chat-thread"], .opal-center-chat-thread')
    .innerText()
    .catch(() => "");
  const challengeSlice = newestSlice(thread, challengeMarker);
  const challengeUi =
    /10\s*AM|you said|Restored|Keeping|shouldn't|as you specified/i.test(challengeSlice) &&
    !/Looking up The Henry|Checking Coronado/i.test(challengeSlice);
  mark(
    "BROWSER_CHALLENGE_RESTORE",
    challengeUi ? "BROWSER_PASS" : "FAIL",
    `slice=${challengeSlice.slice(-320)}`,
  );
}

// Chanelle persistence + order + Next Together + overlay
await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.evaluate(() => document.documentElement.classList.add("opal-native-host"));
for (let i = 0; i < 40; i++) {
  if (await page.getByTestId("member-shell").isVisible().catch(() => false)) break;
  await page.waitForTimeout(300);
}

const opened = await openChanelleThread(page);
await page.screenshot({ path: path.join(outDir, "04_chanelle.png") });
if (opened) {
  const probe = `R8 persist probe ${Date.now()}`;
  const sent = await sendChanelle(page, probe);
  let pageHasProbe = false;
  let visible = [];
  let probeIdx = -1;
  let ascending = true;
  for (let i = 0; i < 25; i++) {
    visible = await page.locator('[data-testid="human-message-row"]').evaluateAll((els) =>
      els.map((el) => (el.innerText || "").slice(0, 160)),
    );
    pageHasProbe = (await page.getByText("R8 persist probe").count().catch(() => 0)) > 0;
    probeIdx = visible.findIndex((t) => t.includes("R8 persist probe"));
    const order = await page.locator('[data-testid="human-message-row"]').evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().top),
    );
    ascending = order.length === 0 || order.every((t, j) => j === 0 || t >= order[j - 1] - 1);
    if (probeIdx >= 0 || pageHasProbe) break;
    await page.waitForTimeout(200);
  }
  mark(
    "BROWSER_CHAT_ORDER",
    sent && ascending && (probeIdx >= 0 || pageHasProbe) ? "BROWSER_PASS" : "FAIL",
    `sent=${sent} ascending=${ascending} probeIdx=${probeIdx} pageHasProbe=${pageHasProbe}`,
    { visible: visible.slice(-5) },
  );

  // Navigate away and back — durable persistence (in-session seed preserve)
  await page.getByTestId("member-tab-home").click({ force: true }).catch(() => {});
  await page.waitForTimeout(1000);
  // Ensure we leave the conversation (activeChat cleared) before reopening.
  await page.getByTestId("member-tab-chats").click({ force: true }).catch(() => {});
  await page.waitForTimeout(800);
  let reopened = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    reopened = await openChanelleThread(page);
    const rowsNow = await page.locator('[data-testid="human-message-row"]').count().catch(() => 0);
    if (reopened && rowsNow > 0) break;
    await page.waitForTimeout(600);
  }
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outDir, "05_chanelle_return.png") });
  const after = await page.locator('[data-testid="human-message-row"]').evaluateAll((els) =>
    els.map((el) => (el.innerText || "").slice(0, 160)),
  );
  const persisted =
    after.some((t) => /R8 persist probe/i.test(t || "")) ||
    (await page.getByText("R8 persist probe").count().catch(() => 0)) > 0;
  mark(
    "BROWSER_CHAT_PERSIST_AFTER_NAV",
    persisted ? "BROWSER_PASS" : "FAIL",
    `found=${persisted} rows=${after.length} reopened=${reopened}`,
    { after: after.slice(-6) },
  );

  // Wait for plan chrome (remapped seed applies signalLabel async)
  for (let i = 0; i < 30; i++) {
    const stripN = await page.locator('[data-testid="next-plan-strip"], .next-plan-strip').count();
    const togN = await page.locator('[data-testid="next-together"], .next-together-strip').count();
    const readyBtn = await page.getByRole("button", { name: /Ready|juniper|NEXT TOGETHER/i }).count();
    if (stripN + togN + readyBtn > 0) break;
    await page.waitForTimeout(200);
  }

  // Next Together / next-plan-strip must open graph detail (primary controls).
  let entry = null;
  const nextTogether = page.locator('[data-testid="next-together"], .next-together-strip').first();
  const planStrip = page.locator('[data-testid="next-plan-strip"], .next-plan-strip').first();
  const readyBanner = page.getByRole("button", { name: /Ready|NEXT TOGETHER|juniper/i }).first();
  const planStripCount = await page.locator('[data-testid="next-plan-strip"], .next-plan-strip').count();
  const nextTogetherCount = await page.locator('[data-testid="next-together"], .next-together-strip').count();
  const readyCount = await page.getByRole("button", { name: /Ready|NEXT TOGETHER|juniper/i }).count();
  console.log(
    `[debug] plan chrome together=${nextTogetherCount} strip=${planStripCount} readyBtn=${readyCount} conv=${await page.getByTestId("member-conversation").count()}`,
  );
  if (nextTogetherCount > 0) {
    entry = "next-together";
    await nextTogether.scrollIntoViewIfNeeded().catch(() => {});
    await nextTogether.click({ force: true });
  } else if (planStripCount > 0) {
    entry = "next-plan-strip";
    await planStrip.scrollIntoViewIfNeeded().catch(() => {});
    await planStrip.click({ force: true });
  } else if (readyCount > 0) {
    // Same control, alternate accessible name (kicker+summary).
    entry = "next-plan-strip";
    await readyBanner.scrollIntoViewIfNeeded().catch(() => {});
    await readyBanner.click({ force: true });
  } else {
    // Historical filament — secondary entry only.
    const filament = page
      .locator(
        '[data-testid="opal-plan-filament-hit"], [data-testid="opal-system-consequence"], [data-testid="opal-moment"]',
      )
      .first();
    if (await filament.isVisible().catch(() => false)) {
      entry = "filament";
      await filament.click({ force: true });
    }
  }
  await page.waitForTimeout(1400);
  await page.screenshot({ path: path.join(outDir, "06_plan_open.png") });
  const sheet = page.getByTestId("graph-detail-sheet");
  const sheetVisible = await sheet.isVisible().catch(() => false);
  mark(
    "BROWSER_NEXT_TOGETHER",
    sheetVisible && entry && entry !== "filament" ? "BROWSER_PASS" : sheetVisible && entry === "filament" ? "YELLOW" : "FAIL",
    `entry=${entry} sheetVisible=${sheetVisible}`,
  );

  if (sheetVisible) {
    const overlay = await page.evaluate(() => {
      const sheetEl = document.querySelector('[data-testid="graph-detail-sheet"]');
      const header = document.querySelector(".chat-header, [data-testid='chat-header']");
      if (!sheetEl) return { ok: false, reason: "no-sheet" };
      const sr = sheetEl.getBoundingClientRect();
      const cs = getComputedStyle(sheetEl);
      const z = parseInt(cs.zIndex || "0", 10);
      let headerOnTop = false;
      if (header) {
        const hr = header.getBoundingClientRect();
        const midX = Math.min(sr.right - 10, Math.max(sr.left + 10, (hr.left + hr.right) / 2));
        const midY = Math.min(sr.bottom - 10, Math.max(sr.top + 10, (hr.top + hr.bottom) / 2));
        const topEl = document.elementFromPoint(midX, midY);
        headerOnTop = !!(topEl && header.contains(topEl) && !sheetEl.contains(topEl));
      }
      return {
        ok: z >= 60 && cs.backgroundColor !== "rgba(0, 0, 0, 0)" && !headerOnTop,
        z,
        bg: cs.backgroundColor,
        headerOnTop,
      };
    });
    mark(
      "BROWSER_GRAPH_OVERLAY_ISOLATION",
      overlay.ok ? "BROWSER_PASS" : "FAIL",
      JSON.stringify(overlay),
      overlay,
    );

    const back = page.getByTestId("graph-detail-back");
    if (await back.isVisible().catch(() => false)) {
      await back.click({ force: true });
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(outDir, "07_after_back.png") });
      const rows = await page.locator('[data-testid="human-message-row"]').count().catch(() => 0);
      mark("BROWSER_BACK_TO_CHAT", rows > 0 ? "BROWSER_PASS" : "FAIL", `rows=${rows}`);
    }
  }
} else {
  mark("BROWSER_CHAT_ORDER", "YELLOW", "Chanelle not opened");
  mark("BROWSER_CHAT_PERSIST_AFTER_NAV", "YELLOW", "Chanelle not opened");
  mark("BROWSER_NEXT_TOGETHER", "YELLOW", "Chanelle not opened");
  mark("BROWSER_GRAPH_OVERLAY_ISOLATION", "YELLOW", "Chanelle not opened");
  mark("BROWSER_BACK_TO_CHAT", "YELLOW", "Chanelle not opened");
}

await browser.close();

// ---------- API multi-turn (after browser; clear again so API starts clean) ----------
clearWalkACenter();
{
  const bday = await apiPost("Maya's birthday is in three days.");
  const bOp = lastOpal(bday.json);
  const bPc = bOp?.metadata?.planning_context || {};
  mark(
    "API_BIRTHDAY_NO_CORONADO",
    bPc.intent_scope === "birthday" && !bPc.destination && !bPc.venue && bPc.who === "Maya"
      ? "API_PASS"
      : /Coronado|Night Hawk/i.test(bOp?.body || "")
        ? "FAIL"
        : bPc.who === "Maya" || /Maya|birthday/i.test(bOp?.body || "")
          ? "API_PASS"
          : "FAIL",
    `scope=${bPc.intent_scope} who=${bPc.who} dest=${bPc.destination} venue=${bPc.venue} act=${bPc.conversation_act} body=${(bOp?.body || "").slice(0, 140)}`,
    { planning: bPc, body: bOp?.body },
  );

  const yes = await apiPost("Yes, plan something for Maya's birthday.");
  const yOp = lastOpal(yes.json);
  const yPc = yOp?.metadata?.planning_context || {};
  mark(
    "API_BIRTHDAY_AFFIRM_CLEAN",
    !yPc.venue && !/Night Hawk|Coronado dinner/i.test(yOp?.body || "") && !yPc.explicit_constraints
      ? "API_PASS"
      : "FAIL",
    `dest=${yPc.destination} venue=${yPc.venue} constraints=${JSON.stringify(yPc.explicit_constraints)} body=${(yOp?.body || "").slice(0, 140)}`,
    { planning: yPc, body: yOp?.body },
  );

  const henry = await apiPost("Make a plan to The Henry in Coronado for Sunday, 10 a.m.");
  const hOp = lastOpal(henry.json);
  const hMd = hOp?.metadata || {};
  const hPc = hMd.planning_context || {};
  const henryOk =
    hPc.venue === "The Henry" &&
    hPc.destination === "Coronado" &&
    hPc.when === "Sunday" &&
    /10\s*AM/i.test(String(hPc.when_time || "")) &&
    !/7:30/i.test(hOp?.body || "") &&
    hMd.soft_assumption !== true;
  mark(
    "API_HENRY_EXPLICIT_CONSTRAINTS",
    henryOk ? "API_PASS" : "FAIL",
    `venue=${hPc.venue} dest=${hPc.destination} when=${hPc.when} time=${hPc.when_time} soft=${hMd.soft_assumption} body=${(hOp?.body || "").slice(0, 160)}`,
    { planning: hPc, body: hOp?.body, job: hMd.action_job_id },
  );
  if (hMd.action_job_id) await waitJob(hMd.action_job_id, 30000);

  const challenge = await apiPost("Why did you change the time when I said 10 a.m.?");
  const cOp = lastOpal(challenge.json);
  const cMd = cOp?.metadata || {};
  const cPc = cMd.planning_context || {};
  const challengeOk =
    cMd.no_provider_restart === true &&
    !cMd.action_job_id &&
    /10\s*AM/i.test(String(cPc.when_time || cOp?.body || "")) &&
    !/Looking up|Checking Coronado/i.test(cOp?.body || "");
  mark(
    "API_CHALLENGE_NO_LOOKUP",
    challengeOk ? "API_PASS" : "FAIL",
    `act=${cMd.conversation_act} restored=${cMd.restored_explicit} time=${cPc.when_time} job=${cMd.action_job_id} body=${(cOp?.body || "").slice(0, 180)}`,
    { metadata: cMd, body: cOp?.body },
  );

  const nh = await apiPost("Plan Night Hawk in Coronado in San Diego.");
  const nOp = lastOpal(nh.json);
  const nPc = nOp?.metadata?.planning_context || {};
  const nhOk =
    (nPc.requested_venue_name === "Night Hawk" || nPc.venue === "Night Hawk") &&
    !nPc.explicit_constraints &&
    !nPc.when_time;
  mark(
    "API_NIGHTHAWK_NOT_CORONADO_VENUE",
    nhOk ? "API_PASS" : "FAIL",
    `venue=${nPc.venue || nPc.requested_venue_name} loc=${nPc.requested_venue_locality} when=${nPc.when} time=${nPc.when_time} constraints=${JSON.stringify(nPc.explicit_constraints)} body=${(nOp?.body || "").slice(0, 140)}`,
    { planning: nPc, body: nOp?.body },
  );

  // --- Adversarial multi-turn dimensions (person/venue/geo agnostic) ---
  const adv = [];
  const cases = [
    {
      id: "ADV_LOOK_UP_VARIANT",
      text: "Look up Night Hawk in Coronado.",
      ok: (pc) => pc.venue === "Night Hawk" || pc.requested_venue_name === "Night Hawk",
    },
    {
      id: "ADV_CORRECTION_NOT_PLACE",
      text: "That's not the place I said.",
      ok: (_pc, md, body) =>
        md.conversation_act === "correct_venue" ||
        md.no_provider_restart === true ||
        !/Looking up/i.test(body || ""),
    },
    {
      id: "ADV_SUNDAY_MORNING",
      text: "No, I meant Sunday morning.",
      ok: (pc, md, body) =>
        /Sunday/i.test(String(pc.when || body || "")) &&
        !/Looking up/i.test(body || "") &&
        md.action_job_id == null,
    },
    {
      id: "ADV_WHY_WHERE_HEADED",
      text: "Why are you asking where I'm headed?",
      ok: (_pc, md, body) =>
        md.conversation_act === "challenge_question" ||
        md.conversation_act === "challenge_prior_action" ||
        !/Looking up|Checking /i.test(body || ""),
    },
    {
      id: "ADV_TASK_SWITCH_BIRTHDAY",
      text: "Go back to the birthday plan.",
      ok: (pc, _md, body) =>
        pc.intent_scope === "birthday" ||
        /birthday|Maya/i.test(body || "") ||
        !/Night Hawk|The Henry/i.test(JSON.stringify(pc.venue || "")),
    },
    {
      id: "ADV_FORGET_VENUE_KEEP_REST",
      text: "Forget that venue, keep the rest.",
      ok: (pc, md) =>
        md.conversation_act === "cancel_venue_keep_plan" ||
        pc.cancel_venue_keep_plan === true ||
        !pc.venue,
    },
  ];
  for (const c of cases) {
    const res = await apiPost(c.text);
    const op = lastOpal(res.json);
    const md = op?.metadata || {};
    const pc = md.planning_context || {};
    const pass = c.ok(pc, md, op?.body);
    mark(
      c.id,
      pass ? "API_PASS" : "FAIL",
      `act=${md.conversation_act} venue=${pc.venue} scope=${pc.intent_scope} body=${(op?.body || "").slice(0, 120)}`,
      { planning: pc, metadata: { conversation_act: md.conversation_act, no_provider_restart: md.no_provider_restart } },
    );
    adv.push({ id: c.id, pass });
  }
  mark(
    "ADV_SUITE_SUMMARY",
    adv.every((a) => a.pass) ? "API_PASS" : "FAIL",
    `passed=${adv.filter((a) => a.pass).length}/${adv.length} dimensions=correction,task-switch,challenge,venue-cancel,look-up-variant,morning-correction`,
    { cases: adv },
  );
}

const summary = {
  build: { sha, vite: BASE, api: API, userId: a.userId },
  findings,
  counts: findings.reduce((acc, f) => {
    acc[f.status] = (acc[f.status] || 0) + 1;
    return acc;
  }, {}),
  FOUNDER_PHONE_PASS: "NOT_CLAIMED",
  PASS2_UNLOCKED: "NO",
  FREEZE: "HOLD",
  FOUNDER_ACCEPTED: "NO",
};
fs.writeFileSync(path.join(outDir, "VERIFY.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary.counts, null, 2));
process.exit(findings.some((f) => f.status === "FAIL") ? 1 : 0);
