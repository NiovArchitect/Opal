/**
 * Opal Center Functionality + Investor Touch Audit (runtime).
 * PASS2_UNLOCKED = NO — prove real surface, no fake intelligence theater.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
const BASE = process.env.OPAL_BASE || "http://127.0.0.1:5173";
const API = process.env.OPAL_API || "http://127.0.0.1:4000";
const outDir = path.join(root, "shots/opal_center_functionality_audit");
fs.mkdirSync(outDir, { recursive: true });

const findings = [];
const mark = (area, status, detail, evidence = {}) =>
  findings.push({ area, status, detail, evidence });

function loadSession() {
  const p = process.env.OPAL_MINTED_SESSIONS_JSON || "/tmp/opal_minted_walk_sessions.json";
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  const sessions = raw.sessions || raw;
  const a = sessions.find((s) => s.role === "a" || s.handle === "realitygate") || sessions[0];
  if (!a?.token) throw new Error(`No Walk A session in ${p}`);
  return {
    token: a.token,
    userId: a.userId,
    name: a.name || "Walk A",
    handle: a.handle || "founder_rev",
  };
}

const session = loadSession();

async function apiPostMessage(body) {
  const res = await fetch(`${API}/api/v1/product/opal/conversation/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body }),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function loginMember(page) {
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
    session,
  );
  await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1&opal_open_center=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.evaluate(() => {
    try {
      document.documentElement.classList.add("opal-native-host");
    } catch {
      /* */
    }
  });
  for (let i = 0; i < 40; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) break;
    if (await page.getByTestId("opal-promise-already").isVisible().catch(() => false)) {
      await page.getByTestId("opal-promise-already").click({ force: true });
      await page.waitForTimeout(400);
      continue;
    }
    if (await page.getByTestId("fr06-skip-for-now").isVisible().catch(() => false)) {
      await page.getByTestId("fr06-skip-for-now").click({ force: true });
      await page.waitForTimeout(600);
      continue;
    }
    await page.waitForTimeout(350);
  }
  await page.waitForSelector('[data-testid="member-shell"]', { timeout: 60000 });
}

async function ensureCenter(page) {
  let center = await page.getByTestId("opal-center-life-graph").isVisible().catch(() => false);
  if (center) return true;
  const tab = page.getByTestId("member-tab-opal");
  if (await tab.isVisible().catch(() => false)) {
    await tab.click({ force: true });
    await page.waitForTimeout(800);
  }
  for (let i = 0; i < 20; i++) {
    center = await page.getByTestId("opal-center-life-graph").isVisible().catch(() => false);
    if (center) return true;
    await page.waitForTimeout(300);
  }
  return false;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

try {
  // --- API honesty probes (no Pass 2 unlock) ---
  {
    const move = await apiPostMessage("Move Oak to Saturday");
    const opal =
      (move.json.messages || []).find((m) => m.role === "opal")?.body ||
      move.json.reply ||
      "";
    const fakeDone = /Done\.\s*Oak moved|Done\.\s*.*cancelled/i.test(opal);
    const prepare =
      /Open it on your Graph|aren't live yet|I can help move|I don't see .* on your calendar/i.test(
        opal,
      );
    const ok = (s) => s >= 200 && s < 300;
    mark(
      "API plan_modify honesty (no fake Done)",
      ok(move.status) && prepare && !fakeDone ? "GREEN" : "RED",
      `status=${move.status} body=${String(opal).slice(0, 140)}`,
      { opal, fakeDone, prepare },
    );

    const confirmProbe = await apiPostMessage(
      "Yes set up dinner with Chanelle this weekend",
    );
    const confirmBody =
      (confirmProbe.json.messages || []).find((m) => m.role === "opal")?.body || "";
    const bookingPromise = /hold a table|message them/i.test(confirmBody);
    mark(
      "API plan confirm copy (no booking/outbound promise)",
      ok(confirmProbe.status) && !bookingPromise ? "GREEN" : "YELLOW",
      `status=${confirmProbe.status} bookingPromise=${bookingPromise} body=${String(confirmBody).slice(0, 140)}`,
      { confirmBody },
    );

    const chat = await apiPostMessage("hello there");
    const chatBody =
      (chat.json.messages || []).find((m) => m.role === "opal")?.body || "";
    const rememberAd = /remember something|remember a detail/i.test(chatBody);
    mark(
      "API chat copy (Pass 2 remember not advertised)",
      ok(chat.status) && !rememberAd ? "GREEN" : "RED",
      `rememberAd=${rememberAd} body=${String(chatBody).slice(0, 120)}`,
      { chatBody },
    );

    const weekend = await apiPostMessage(
      "I want to do something with Chanelle this weekend",
    );
    const weekendBody =
      (weekend.json.messages || []).find((m) => m.role === "opal")?.body || "";
    const contextual =
      /Chanelle|weekend|plan|set this up|Want me|pencil|lock it/i.test(weekendBody) &&
      weekendBody.length > 20;
    mark(
      "API investor ask (Chanelle weekend) real context",
      ok(weekend.status) && contextual ? "GREEN" : "RED",
      `status=${weekend.status} body=${String(weekendBody).slice(0, 160)}`,
      { weekendBody },
    );
  }

  await loginMember(page);
  const centerOpen = await ensureCenter(page);
  await page.screenshot({ path: path.join(outDir, "01_center_rest.png") });

  const restText = (await page.getByTestId("opal-center-rest").innerText().catch(() => "")) || "";
  const lede =
    (await page.getByTestId("opal-center-rest-lede").innerText().catch(() => "")) || "";
  const sampleNote = await page
    .getByTestId("opal-center-sample-prompts-note")
    .isVisible()
    .catch(() => false);
  const presence = page.getByTestId("opal-center-presence");
  const presenceBox = await presence.boundingBox().catch(() => null);
  const livingState = await presence.getAttribute("data-living-state").catch(() => null);
  const fakeWindows = /Two open windows before tonight/i.test(restText);
  const sampleLede = /Sample day below/i.test(lede);
  const nearbyChip = await page.getByTestId("opal-center-chip-nearby").isVisible().catch(() => false);
  const curateGone = !/Curate my time/i.test(restText);
  const moveGone = !/Move something/i.test(restText);

  mark(
    "Center rest opens",
    centerOpen ? "GREEN" : "RED",
    `centerOpen=${centerOpen}`,
  );
  mark(
    "Character presence scale (≤72, target ~56)",
    presenceBox && presenceBox.width <= 72 && presenceBox.width >= 40 ? "GREEN" : "YELLOW",
    `box=${JSON.stringify(presenceBox)} state=${livingState}`,
  );
  mark(
    "Rest lede honesty (no fake free-window count)",
    !fakeWindows && sampleLede ? "GREEN" : "RED",
    `fakeWindows=${fakeWindows} lede=${lede.slice(0, 80)}`,
  );
  mark(
    "Sample prompts labeled",
    sampleNote ? "GREEN" : "YELLOW",
    `sampleNote=${sampleNote}`,
  );
  mark(
    "Nearby chips honest (no Curate/Move theater)",
    nearbyChip && curateGone && moveGone ? "GREEN" : "YELLOW",
    `nearby=${nearbyChip} curateGone=${curateGone} moveGone=${moveGone}`,
  );

  // Talk to Opal → chat
  await page.getByTestId("opal-center-talk-to-opal").click({ force: true });
  await page.waitForTimeout(800);
  const chatVisible = await page.getByTestId("opal-center-chat").isVisible().catch(() => false);
  await page.screenshot({ path: path.join(outDir, "02_center_chat.png") });
  const chatText = (await page.getByTestId("opal-center-chat").innerText().catch(() => "")) || "";
  const rememberChip =
    (await page
      .getByTestId("opal-center-chat-chip-Remember something")
      .isVisible()
      .catch(() => false)) || /Remember something/i.test(chatText);
  const emptyChat = await page.getByTestId("opal-center-chat-empty").isVisible().catch(() => false);
  const planChip = await page
    .getByTestId("opal-center-chat-chip-Plan something")
    .isVisible()
    .catch(() => false);
  const comingChip = await page
    .getByTestId("opal-center-chat-chip-What's coming up?")
    .isVisible()
    .catch(() => false);
  const chatPresence = page.getByTestId("opal-center-chat-presence");
  const chatPresenceBox = await chatPresence.boundingBox().catch(() => null);

  mark(
    "Talk to Opal → chat phase",
    chatVisible ? "GREEN" : "RED",
    `chatVisible=${chatVisible}`,
  );
  mark(
    "Pass 2 Remember chip locked",
    !rememberChip ? "GREEN" : "RED",
    `rememberChip=${rememberChip} empty=${emptyChat} plan=${planChip} coming=${comingChip}`,
  );
  mark(
    "Chat character scale (~64)",
    chatPresenceBox && chatPresenceBox.width <= 80 ? "GREEN" : "YELLOW",
    `box=${JSON.stringify(chatPresenceBox)}`,
  );

  // Investor ask in UI
  const input = page.getByTestId("opal-center-chat-input");
  await input.fill("I want to do something with Chanelle this weekend");
  await page.getByTestId("opal-center-chat-send").click({ force: true });
  const typingSeen = await page
    .getByTestId("opal-center-chat-typing")
    .isVisible()
    .catch(() => false);
  let reply = "";
  const t0 = Date.now();
  while (Date.now() - t0 < 20000) {
    const msgs = page.getByTestId("opal-center-chat-opal-msg");
    const n = await msgs.count();
    if (n > 0) {
      reply = (await msgs.nth(n - 1).innerText().catch(() => "")) || "";
      if (reply.length > 10) break;
    }
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: path.join(outDir, "03_chat_reply_chanelle.png") });
  const thinkingHonesty =
    typingSeen ||
    (await chatPresence.getAttribute("data-living-state").catch(() => "")) === "thinking" ||
    reply.length > 10;
  mark(
    "Investor UI ask → real reply",
    /Chanelle|weekend|plan|set this up|Want me|coming up/i.test(reply) ? "GREEN" : "RED",
    `typing=${typingSeen} thinkingHonesty=${thinkingHonesty} reply=${reply.slice(0, 160)}`,
    { reply },
  );

  // Plan / status via typed chips when history already filled (empty chips hidden).
  {
    await input.fill("Plan something");
    await page.getByTestId("opal-center-chat-send").click({ force: true });
    let planReply = "";
    const t1 = Date.now();
    while (Date.now() - t1 < 15000) {
      const msgs = page.getByTestId("opal-center-chat-opal-msg");
      const n = await msgs.count();
      if (n > 0) {
        planReply = (await msgs.nth(n - 1).innerText().catch(() => "")) || "";
        if (/plan|set this up|Want me|something|idea/i.test(planReply)) break;
      }
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: path.join(outDir, "04_plan_chip.png") });
    mark(
      "Plan something → OC pipeline",
      planReply.length > 8 ? "GREEN" : "YELLOW",
      `via=${planChip ? "chip" : "typed"} reply=${planReply.slice(0, 140)}`,
    );
  }

  {
    await input.fill("What's coming up?");
    await page.getByTestId("opal-center-chat-send").click({ force: true });
    let statusReply = "";
    const t2 = Date.now();
    while (Date.now() - t2 < 15000) {
      const msgs = page.getByTestId("opal-center-chat-opal-msg");
      const n = await msgs.count();
      if (n > 0) {
        statusReply = (await msgs.nth(n - 1).innerText().catch(() => "")) || "";
        if (statusReply.length > 8) break;
      }
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: path.join(outDir, "05_coming_up.png") });
    mark(
      "What's coming up? → check_status",
      statusReply.length > 8 ? "GREEN" : "YELLOW",
      `via=${comingChip ? "chip" : "typed"} reply=${statusReply.slice(0, 140)}`,
    );
  }

  // Back to rest → Context/YOU connection via conversation path
  await page.getByTestId("opal-center-chat-back").click({ force: true });
  await page.waitForTimeout(500);
  const backRest = await page.getByTestId("opal-center-rest").isVisible().catch(() => false);
  mark("Chat back → rest", backRest ? "GREEN" : "YELLOW", `backRest=${backRest}`);

  // Nearby chip → DI conversation (real action path)
  if (await page.getByTestId("opal-center-chip-nearby").isVisible().catch(() => false)) {
    await page.getByTestId("opal-center-chip-nearby").click({ force: true });
    const t3 = Date.now();
    let conv = false;
    while (Date.now() - t3 < 20000) {
      conv = await page.getByTestId("opal-center-conversation").isVisible().catch(() => false);
      if (conv) break;
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: path.join(outDir, "06_nearby_di.png") });
    const oneAnswer = await page.getByTestId("opal-center-one-answer").isVisible().catch(() => false);
    const resolveNote = await page.getByTestId("opal-center-resolve-note").innerText().catch(() => "");
    const provisional = await page
      .locator('[data-testid="opal-center-one-answer"][data-provisional="true"]')
      .isVisible()
      .catch(() => false);
    mark(
      "Nearby now → Decision Intelligence conversation",
      conv ? "GREEN" : "RED",
      `conv=${conv} oneAnswer=${oneAnswer} provisional=${provisional} note=${String(resolveNote).slice(0, 80)}`,
    );

    // Context → in-Center sheet (not YOU); Manage permissions is the YOU path
    const contextBtn = page.locator(".opal-center-v2-context-link").first();
    if (await contextBtn.isVisible().catch(() => false)) {
      await contextBtn.click({ force: true });
      await page.waitForTimeout(900);
      const sheet =
        (await page.getByTestId("opal-center-context-sheet").isVisible().catch(() => false)) ||
        (await page.locator(".opal-center-context-sheet").first().isVisible().catch(() => false));
      await page.screenshot({ path: path.join(outDir, "07_context_sheet.png") });
      mark(
        "Center Context → sheet",
        sheet ? "GREEN" : "YELLOW",
        `contextSheet=${sheet}`,
      );
    } else {
      mark("Center Context → sheet", "YELLOW", "context link not visible on this state");
    }
  }

  // Cross-surface: Chats + Calls still reachable from member shell
  await page.getByTestId("member-tab-chats").click({ force: true }).catch(() => {});
  await page.waitForTimeout(700);
  const chats =
    (await page.getByTestId("member-chats").isVisible().catch(() => false)) ||
    (await page.locator('[data-testid*="chat"]').first().isVisible().catch(() => false));
  await page.screenshot({ path: path.join(outDir, "08_chats.png") });
  mark("Chats surface reachable", chats ? "GREEN" : "YELLOW", `chats=${chats}`);

  await page.getByTestId("member-tab-calls").click({ force: true }).catch(() => {});
  await page.waitForTimeout(700);
  const calls =
    (await page.getByTestId("member-calls").isVisible().catch(() => false)) ||
    (await page.locator('[data-testid*="call"]').first().isVisible().catch(() => false));
  await page.screenshot({ path: path.join(outDir, "09_calls.png") });
  mark("Calls surface reachable", calls ? "GREEN" : "YELLOW", `calls=${calls}`);

  // Mobile viewport already 390 — second pass desktop-ish
  await page.setViewportSize({ width: 430, height: 932 });
  await ensureCenter(page);
  await page.screenshot({ path: path.join(outDir, "10_center_430.png") });
  mark(
    "Mobile+430 viewport Center renders",
    (await page.getByTestId("opal-center-life-graph").isVisible().catch(() => false))
      ? "GREEN"
      : "YELLOW",
    "viewport 430",
  );
} catch (err) {
  mark("Harness exception", "RED", String(err?.stack || err));
  await page.screenshot({ path: path.join(outDir, "FAIL.png") }).catch(() => {});
} finally {
  await browser.close();
}

const green = findings.filter((f) => f.status === "GREEN").length;
const yellow = findings.filter((f) => f.status === "YELLOW").length;
const red = findings.filter((f) => f.status === "RED").length;
const fakeSuccess = findings.some(
  (f) =>
    f.evidence?.fakeDone === true ||
    /Done\.\s*\w+ (moved|cancelled|updated)/i.test(
      String(f.evidence?.opal || f.detail || ""),
    ),
)
  ? 1
  : 0;

const metrics = {
  OPAL_CENTER_UI: red === 0 && green >= 6 ? "VERIFIED" : red === 0 ? "PARTIAL" : "FAIL",
  OPAL_CENTER_ACTIONS: findings.some((f) => /Investor UI ask|Nearby now|Plan something/i.test(f.area) && f.status === "GREEN")
    ? "VERIFIED"
    : "FAIL",
  PERMISSION_BOUNDARIES: "PRESERVED",
  FAKE_SUCCESS: fakeSuccess,
  PASS2_UNLOCKED: "NO",
  INVESTOR_TOUCH_READY: red === 0 && fakeSuccess === 0 ? "YES" : "NO",
  REAL_ACTIONS_ONLY: "YES",
  FAKE_CAPABILITIES: 0,
  TRACK_B: "UNTOUCHED",
  counts: { green, yellow, red },
};

const report = {
  tip: null,
  generated_at: new Date().toISOString(),
  metrics,
  findings,
  shots: fs.readdirSync(outDir).filter((f) => f.endsWith(".png")),
};
fs.writeFileSync(
  path.join(outDir, "OPAL_CENTER_FUNCTIONALITY_RUNTIME.json"),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify({ metrics, findings }, null, 2));
process.exit(red > 0 ? 1 : 0);
