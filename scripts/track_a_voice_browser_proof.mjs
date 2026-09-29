/**
 * Track A — Walk B browser proof of voice 8 PM proposal (real backend).
 * Uses separate browser context, real OTP activation, canonical Fort Oak conversation.
 */
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync } from "node:fs";

const ROOT = "/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people";
const WEB = process.env.WEB_URL || "http://127.0.0.1:5173";
const API = process.env.API_URL || "http://127.0.0.1:4000";
const CONV = "ace99adc-db67-4258-9d95-f612246c6c84";
const PLAN = "70804c05-779f-4991-ab9c-c75c319ebf2f";
const OUT = resolve(ROOT, "docs/evidence/v2-coded-experience/track-a-voice-semantic");
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiActivate(phone, name, handle) {
  const ch = await fetch(`${API}/api/v1/product/activation/challenges`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      phone,
      otp_consent_accepted: true,
      otp_consent_policy_version: "otp-sms-v1",
      idempotency_key: `browser-${Date.now()}-${handle}`,
      device_label: `browser-${handle}`,
    }),
  }).then((r) => r.json());
  const ver = await fetch(`${API}/api/v1/product/activation/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      challenge_id: ch.challenge.id,
      code: ch.development_code,
      phone,
      display_name: name,
      handle_hint: handle,
      device_label: `browser-${handle}`,
      platform: "web",
      include_bearer: true,
    }),
  }).then((r) => r.json());
  return { token: ver.session.access_token, userId: ver.user.id, code: ch.development_code };
}

async function login(page, phone, name, handle, codeHint) {
  let devCode = codeHint;
  page.on("response", async (res) => {
    try {
      if (res.url().includes("/product/activation/challenges") && res.request().method() === "POST") {
        const j = await res.json();
        if (j.development_code) devCode = j.development_code;
      }
    } catch {}
  });

  await page.goto(`${WEB}/?opal_reset_first_run=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="fr00-already-account"], [data-testid="fr00-tap-begin"]', { timeout: 25000 });
  if (await page.getByTestId("fr00-already-account").isVisible().catch(() => false)) {
    await page.getByTestId("fr00-already-account").click();
  } else {
    await page.getByTestId("fr00-tap-begin").click();
  }
  await page.waitForSelector('[data-testid="fr06-phone-input"], #phone', { timeout: 25000 });
  const national = phone.replace(/^\+1/, "").replace(/\D/g, "");
  if (await page.getByTestId("fr06-phone-input").isVisible().catch(() => false)) {
    await page.fill('[data-testid="fr06-phone-input"]', national);
  } else {
    await page.fill("#phone", national);
  }
  const consent = page.locator("#otp-consent, [data-testid='fr06-otp-consent']");
  if (await consent.first().isVisible().catch(() => false)) {
    await consent.first().check().catch(() => {});
  }
  if (await page.getByTestId("fr06-continue").isVisible().catch(() => false)) {
    await page.getByTestId("fr06-continue").click();
  } else {
    await page.getByRole("button", { name: /Text me a code|Continue/i }).first().click();
  }
  await page.waitForSelector('[data-testid="fr07-code-input"], #code', { timeout: 25000 });
  await sleep(500);
  const code = devCode || codeHint || "222222";
  if (await page.getByTestId("fr07-code-input").isVisible().catch(() => false)) {
    await page.fill('[data-testid="fr07-code-input"]', code);
    await page.getByTestId("fr07-submit").click();
  } else {
    await page.fill("#code", code);
    await page.getByRole("button", { name: /Continue|Verify|Join|Enter/i }).first().click();
  }
  for (let i = 0; i < 50; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) return;
    if (await page.getByTestId("fr08-profile").isVisible().catch(() => false)) break;
    await sleep(250);
  }
  if (await page.getByTestId("fr08-profile").isVisible().catch(() => false)) {
    if (await page.getByTestId("fr08-name-input").isVisible().catch(() => false)) {
      const v = await page.getByTestId("fr08-name-input").inputValue().catch(() => "");
      if (!v) await page.fill('[data-testid="fr08-name-input"]', name);
    }
    if (await page.getByTestId("fr08-username-input").isVisible().catch(() => false)) {
      const v = await page.getByTestId("fr08-username-input").inputValue().catch(() => "");
      if (!v) await page.fill('[data-testid="fr08-username-input"]', handle);
    }
    for (let i = 0; i < 30; i++) {
      const btn = page.getByTestId("fr08-continue");
      if (!(await btn.isDisabled().catch(() => true))) {
        await btn.click();
        break;
      }
      await sleep(200);
    }
  }
  for (let i = 0; i < 30; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) return;
    if (await page.getByTestId("fr09-not-now").isVisible().catch(() => false)) {
      await page.getByTestId("fr09-not-now").click();
      await sleep(400);
      continue;
    }
    await sleep(300);
  }
  await page.waitForSelector('[data-testid="member-shell"], [data-testid="member-tabbar"]', { timeout: 30000 });
}

async function openConversation(page) {
  await page.getByTestId("member-tab-chats").click();
  const row = page.getByTestId(`chats-row-${CONV}`);
  await row.waitFor({ state: "visible", timeout: 30000 });
  await row.click();
  await sleep(1200);
  return true;
}

async function main() {
  const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
  const { chromium } = require("playwright");
  const result = {
    at: new Date().toISOString(),
    web: WEB,
    api: API,
    conversation_id: CONV,
    plan_id: PLAN,
    checks: {},
    verdict: "HOLD",
  };

  const authB = await apiActivate("+12025550102", "Walk B", "s11_c_msy0uy9n");
  result.walk_b_user_id = authB.userId;
  result.api_alignment = await fetch(`${API}/api/v1/product/conversations/${CONV}/alignment`, {
    headers: { authorization: `Bearer ${authB.token}` },
  }).then((r) => r.json());
  const a = result.api_alignment.alignment || {};
  result.checks.api_committed_730 = a?.exact_time?.value === "7:30 PM" && a?.exact_time?.state === "locked";
  result.checks.api_proposal_800 = a?.change_proposal?.value?.includes("8:00");
  result.checks.api_source_call_transcript = a?.change_proposal?.source_type === "call_transcript";
  result.checks.api_place_fort_oak = a?.place?.value === "Fort Oak";

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.on("pageerror", (e) => {
      result.pageError = String(e.message || e);
    });

    await login(page, "+12025550102", "Walk B", "s11_c_msy0uy9n", authB.code);
    result.checks.browser_shell = await page.getByTestId("member-shell").isVisible().catch(() => false);

    const opened = await openConversation(page);
    result.checks.conversation_opened = opened;
    await page.screenshot({ path: resolve(OUT, "walk_b_conversation.png"), fullPage: false });

    const bodyText = await page.locator("body").innerText().catch(() => "");
    result.checks.ui_proposed_change_label = /Proposed change/i.test(bodyText);
    result.checks.ui_shows_800 = /8:00\s*PM/i.test(bodyText);
    result.checks.ui_shows_730 = /7:30\s*PM/i.test(bodyText);
    result.checks.ui_accept_change = await page.getByRole("button", { name: /Accept change/i }).isVisible().catch(() => false);
    result.checks.ui_keep_current = await page.getByRole("button", { name: /Keep current/i }).isVisible().catch(() => false);
    result.checks.ui_fort_oak = /Fort Oak/i.test(bodyText);
    result.checks.no_typed_chat_of_utterance = !/Actually, let's make it eight/i.test(bodyText);

    // Accept via UI if visible
    if (result.checks.ui_accept_change) {
      await page.getByRole("button", { name: /Accept change/i }).click();
      await sleep(1500);
      await page.screenshot({ path: resolve(OUT, "walk_b_after_accept.png"), fullPage: false });
      const after = await page.locator("body").innerText().catch(() => "");
      result.checks.ui_after_no_proposal = !/Proposed change/i.test(after);
      result.checks.ui_after_shows_800 = /8:00\s*PM/i.test(after);
    } else {
      // Accept via API as Walk B
      const accept = await fetch(`${API}/api/v1/product/conversations/${CONV}/alignment/accept`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${authB.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      });
      result.api_accept_status = accept.status;
      result.api_accept = await accept.json().catch(() => null);
    }

    // Re-fetch alignment after accept
    const afterAlign = await fetch(`${API}/api/v1/product/conversations/${CONV}/alignment`, {
      headers: { authorization: `Bearer ${authB.token}` },
    }).then((r) => r.json());
    const aa = afterAlign.alignment || {};
    result.after_alignment = {
      time: aa?.exact_time?.value,
      proposal: aa?.change_proposal,
      place: aa?.place?.value,
      activity: aa?.activity?.value,
      date: aa?.date?.value,
    };
    result.checks.after_time_800 = aa?.exact_time?.value === "8:00 PM";
    result.checks.after_no_proposal = !aa?.change_proposal;
    result.checks.after_same_place = aa?.place?.value === "Fort Oak";

    // Home / Next Together via inbox projection
    const inbox = await fetch(`${API}/api/v1/product/conversations`, {
      headers: { authorization: `Bearer ${authB.token}` },
    }).then((r) => r.json());
    const row = (inbox.conversations || []).find((c) => c.id === CONV);
    result.inbox_plan = row?.plan_projection || null;
    result.checks.inbox_when_800 = /8:00/.test(row?.plan_projection?.when_label || "");
    result.checks.inbox_lineage = row?.plan_projection?.lineage_id === PLAN;
    result.checks.inbox_pending_false = row?.plan_projection?.pending_change === false;

    // After accept, wait for Graph/Chats projections to converge on 8:00 (same session).
    async function waitForText(getter, re, label, attempts = 20) {
      for (let i = 0; i < attempts; i++) {
        const value = await getter();
        if (re.test(value || "")) return value;
        await sleep(500);
      }
      return await getter();
    }

    await page.getByTestId("member-tab-graphs").click();
    await sleep(500);
    // Force a light remount by switching tabs so inbox/plan fanout is re-read.
    await page.getByTestId("member-tab-chats").click();
    await sleep(400);
    await page.getByTestId("member-tab-graphs").click();

    const graphsCard = page.getByTestId(`graphs-card-${PLAN}`);
    await graphsCard.waitFor({ state: "attached", timeout: 15000 });
    const graphsText = await waitForText(
      async () => {
        await page.getByTestId("member-tab-home").click().catch(() => {});
        await sleep(200);
        await page.getByTestId("member-tab-graphs").click();
        await sleep(400);
        return graphsCard.innerText().catch(() => "");
      },
      /8:00\s*PM/i,
      "graphs"
    );
    result.checks.graphs_text = graphsText;
    result.checks.graphs_shows_800 = /8:00\s*PM/i.test(graphsText || "");
    result.checks.graphs_shows_fort_oak = /Fort Oak/i.test(graphsText || "");
    await page.screenshot({ path: resolve(OUT, "walk_b_graphs.png"), fullPage: false });

    await page.getByTestId(`graphs-open-${PLAN}`).click();
    await page.getByTestId("graph-detail-sheet").waitFor({ state: "visible", timeout: 15000 });
    const whenText = await waitForText(
      () => page.getByTestId("graph-detail-when").innerText().catch(() => ""),
      /8:00\s*PM/i,
      "graph-detail"
    );
    const detailText = await page.getByTestId("graph-detail-sheet").innerText().catch(() => "");
    result.checks.graph_detail_when = whenText;
    result.checks.graph_detail_shows_800 = /8:00\s*PM/i.test(`${whenText}\n${detailText}`);
    result.checks.graph_detail_shows_fort_oak = /Fort Oak/i.test(detailText);
    await page.screenshot({ path: resolve(OUT, "walk_b_graph_detail.png"), fullPage: false });

    await page.getByTestId("graph-detail-back").click().catch(() => {});
    await page.getByTestId("member-tab-chats").click();
    await page.getByTestId(`chats-row-${CONV}`).waitFor({ state: "visible", timeout: 15000 });
    const rowText = await waitForText(
      () => page.getByTestId(`chats-row-${CONV}`).innerText().catch(() => ""),
      /8:00/,
      "chats-row"
    );
    const consequence = page.locator(`[data-testid="chats-row-${CONV}"] [data-testid="chat-plan-consequence"]`).first();
    result.checks.chats_consequence_text = await consequence.innerText().catch(() => null);
    result.checks.chats_plan_id = await consequence.getAttribute("data-plan-id").catch(() => null);
    result.checks.chats_row_text = rowText;
    result.checks.chats_row_shows_800 = /8:00/.test(rowText || "") || /8:00/.test(result.checks.chats_consequence_text || "");
    result.checks.chats_same_plan = result.checks.chats_plan_id === PLAN;

    await page.getByTestId("member-tab-home").click().catch(() => {});
    await sleep(800);
    const homeText = await page.locator("body").innerText().catch(() => "");
    result.checks.home_shows_800 = /8:00\s*PM/i.test(homeText);
    result.checks.home_shows_fort_oak = /Fort Oak/i.test(homeText);
    await page.screenshot({ path: resolve(OUT, "walk_b_home.png"), fullPage: false });

    const required = [
      "api_committed_730",
      "api_proposal_800",
      "api_source_call_transcript",
      "browser_shell",
      "conversation_opened",
      "ui_proposed_change_label",
      "ui_shows_800",
      "ui_shows_730",
      "ui_accept_change",
      "ui_keep_current",
      "after_time_800",
      "after_no_proposal",
      "inbox_when_800",
      "inbox_lineage",
      "graphs_shows_800",
      "graph_detail_shows_800",
      "chats_row_shows_800",
      "chats_same_plan",
    ];
    const failed = required.filter((k) => !result.checks[k]);
    result.failed = failed;
    result.verdict = failed.length === 0 ? "GREEN" : "RED";
  } finally {
    await browser.close();
  }

  writeFileSync(resolve(OUT, "TRACK_A_VOICE_BROWSER_PROOF.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ verdict: result.verdict, failed: result.failed, checks: result.checks }, null, 2));
  if (result.verdict !== "GREEN") process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
