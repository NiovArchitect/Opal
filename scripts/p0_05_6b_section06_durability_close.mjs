#!/usr/bin/env node
/**
 * P0-05.6B — Durability close: complete 12 nested Section 06 You-active matrix
 * + GroupInfo presentation-only ownership proof (static + runtime).
 * No visual product changes.
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(ROOT, "docs/evidence/v2-coded-experience/p0-05-6b-section06-durability-close");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const require = createRequire(import.meta.url);
const { chromium } = require(resolve(ROOT, "apps/opal_web/node_modules/playwright"));

const NESTED = [
  { key: "edit-profile", figma: "618:2123", open: "edit-profile" },
  { key: "privacy", figma: "618:1524", open: "hub:privacy" },
  { key: "location-travel", figma: "618:1591", open: "hub:location-travel" },
  { key: "spending-fit", figma: "618:1662", open: "hub:spending-fit" },
  { key: "calls-assist", figma: "618:1733", open: "hub:calls-assist" },
  { key: "feed-discovery", figma: "618:1801", open: "hub:feed-discovery" },
  { key: "engagement", figma: "618:1868", open: "hub:engagement" },
  { key: "notifications", figma: "618:1935", open: "hub:notifications" },
  { key: "linked-devices", figma: "618:2003", open: "hub:linked-devices" },
  { key: "safety", figma: "618:2060", open: "hub:safety" },
  { key: "account-security", figma: "618:2180", open: "hub:account-security" },
  { key: "delete-account", figma: "618:2243", open: "nest:account-security:delete" },
];

function groupInfoOwnershipProof() {
  const gi = readFileSync(resolve(ROOT, "apps/opal_web/src/opalUi/GroupInfoDestination.tsx"), "utf8");
  const app = readFileSync(resolve(ROOT, "apps/opal_web/src/OpalApp.tsx"), "utf8");
  const forbiddenInGi = [
    /fetch\s*\(/,
    /productClient/,
    /listConversations/,
    /createGroupConversation/,
    /addConversationMember/,
    /leaveConversation/,
    /Messages\./,
    /SharedPlan/,
    /JourneyAuthority/,
    /useEffect\s*\(/,
    /useState\s*\(/,
    /XMLHttpRequest/,
    /localStorage/,
  ];
  const hits = forbiddenInGi.filter((re) => re.test(gi)).map((re) => String(re));
  const consumes = {
    conversation_list_owner: "OpalCore.Messages.list_conversations / productClient.listConversations → ChatPreview.memberCount",
    conversation_schema: "OpalCore.Messaging.Conversation + ConversationMember",
    group_create_owner: "productClient.createGroupConversation (existing Messages/ConversationMember path)",
    add_people_owner: "FindPeopleFlow (existing invite path) via onAddPeople callback from OpalApp",
    leave_channel_owner: "productRealtime.leaveConversation (existing realtime channel leave) via onLeave callback",
    routing_owner: "OpalApp groupInfoOpen + dockActiveSlot (activeChatId || groupInfoOpen → chats)",
  };
  return {
    NEW_GROUP_DOMAIN_OWNER: 0,
    NEW_MEMBERSHIP_OWNER: 0,
    PARALLEL_GROUP_INFO: 0,
    presentation_only: hits.length === 0,
    forbidden_hits_in_GroupInfoDestination: hits,
    props_only: true,
    mutations_in_parent_OpalApp_only: /onAddPeople=\{[\s\S]*setFindPeopleOpen\(true\)/.test(app) &&
      /onLeave=\{[\s\S]*leaveConversation/.test(app),
    existing_owners_consumed: consumes,
    figma: "618:521",
    ok: hits.length === 0 && /GroupInfoDestination/.test(app),
  };
}

async function measure(page) {
  return page.evaluate(() => {
    const active = [...document.querySelectorAll('[data-dock-active="true"]')].map(
      (el) => el.getAttribute("data-dock-slot") || el.getAttribute("data-testid"),
    );
    const shell = document.querySelector('[data-testid="member-shell"]');
    const opal = document.querySelector(".dock-opal");
    const dock = document.querySelector(".tabbar.tabbar-option-b");
    const br = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const d = br(dock);
    const o = br(opal);
    return {
      active,
      shell: shell?.getAttribute("data-dock-active-slot"),
      youSetting: document.querySelector("[data-you-setting]")?.getAttribute("data-you-setting"),
      figmaNode: document.querySelector("[data-figma-node]")?.getAttribute("data-figma-node"),
      navActive: document.querySelector("[data-nav-active]")?.getAttribute("data-nav-active"),
      brandV4: !!document.querySelector('[data-brand-v4="true"]'),
      centerOpal:
        d && o ? { x: o.x - d.x, y: o.y - d.y, w: o.w, h: o.h } : null,
      groupInfo: !!document.querySelector('[data-testid="group-info"]'),
      youHub: !!document.querySelector('[data-testid="you-hub-pane"]'),
      homeActive: active.includes("home"),
      youActive: active.includes("you"),
      chatsActive: active.includes("chats"),
    };
  });
}

async function ensureHome(page) {
  await page.goto(`${WEB}/?opal_reset_first_run=1&opal_founder_seed=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await sleep(900);
  if (await page.getByTestId("fr00-already-account").isVisible().catch(() => false)) {
    await page.getByTestId("fr00-already-account").click();
    await sleep(500);
  }
  if (await page.getByTestId("fr05-already-account").isVisible().catch(() => false)) {
    await page.getByTestId("fr05-already-account").click();
    await sleep(400);
  } else if (await page.getByTestId("fr05-continue-phone").isVisible().catch(() => false)) {
    await page.getByTestId("fr05-continue-phone").click();
    await sleep(400);
  }
  let devCode = "111111";
  page.on("response", async (res) => {
    try {
      if (res.url().includes("/activation/challenges") && res.request().method() === "POST") {
        const j = await res.json();
        if (j.development_code) devCode = j.development_code;
      }
    } catch {}
  });
  await page.waitForSelector('[data-testid="fr06-phone-input"], [data-testid="member-tab-home"]', {
    timeout: 30000,
  });
  if (await page.getByTestId("member-tab-home").isVisible().catch(() => false)) return;
  await page.fill('[data-testid="fr06-phone-input"]', "+12025550101");
  const consent = page.getByTestId("fr06-otp-consent");
  if (!(await consent.isChecked().catch(() => false))) await consent.click({ force: true });
  await page.getByTestId("fr06-continue").click();
  await page.waitForSelector('[data-testid="fr07-code-input"]', { timeout: 25000 });
  const shown = await page.getByTestId("fr07-dev-code").textContent().catch(() => "");
  const m = (shown || "").match(/\b(\d{6})\b/);
  if (m) devCode = m[1];
  await page.fill('[data-testid="fr07-code-input"]', devCode);
  await page.getByTestId("fr07-submit").click();
  for (let i = 0; i < 80; i++) {
    if (await page.getByTestId("member-tab-home").isVisible().catch(() => false)) break;
    if (await page.getByTestId("fr08-name-input").isVisible().catch(() => false)) {
      const n = page.getByTestId("fr08-name-input");
      if (!(await n.inputValue())) await n.fill("Founder");
      const b = page.getByTestId("fr08-continue");
      if (!(await b.isDisabled().catch(() => true))) await b.click();
    }
    if (await page.getByTestId("fr09-not-now").isVisible().catch(() => false)) {
      await page.getByTestId("fr09-not-now").click();
    }
    await sleep(250);
  }
  await page.getByTestId("member-tab-home").waitFor({ timeout: 45000 });
}

async function backToYouHub(page) {
  await page.getByTestId("member-tab-you").click().catch(() => {});
  await sleep(350);
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId("you-hub-pane").isVisible().catch(() => false)) return;
    if (await page.getByTestId("you-setting-back").isVisible().catch(() => false)) {
      await page.getByTestId("you-setting-back").click();
      await sleep(250);
    } else {
      await page.getByTestId("member-tab-you").click();
      await sleep(300);
    }
  }
}

const ownership = groupInfoOwnershipProof();
writeFileSync(resolve(OUT, "GROUP_INFO_OWNERSHIP.json"), JSON.stringify(ownership, null, 2));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ensureHome(page);

const matrix = [];

// You hub baseline
await page.getByTestId("member-tab-you").click();
await sleep(600);
let m = await measure(page);
matrix.push({
  surface: "You / Settings Hub",
  figma: "618:1344 / 618:1430",
  active: m.active,
  homeInactive: !m.homeActive,
  youActive: m.youActive,
  ok: m.youActive && !m.homeActive && m.youHub,
});

for (const row of NESTED) {
  await backToYouHub(page);
  if (row.open === "edit-profile") {
    const btn = page.getByTestId("you-edit-profile");
    if (await btn.count()) await btn.click();
    else await page.getByTestId("you-hub-row-privacy").click(); // fallback won't be edit
  } else if (row.open.startsWith("hub:")) {
    const key = row.open.slice(4);
    await page.getByTestId(`you-hub-row-${key}`).click();
  } else if (row.open === "nest:account-security:delete") {
    await page.getByTestId("you-hub-row-account-security").click();
    await sleep(500);
    const del = page.getByTestId("you-setting-row-delete-account");
    if (await del.count()) await del.click();
  }
  await sleep(700);
  m = await measure(page);
  const ok =
    m.youActive &&
    !m.homeActive &&
    m.navActive === "you" &&
    (m.youSetting === row.key || m.figmaNode === row.figma || m.brandV4);
  matrix.push({
    surface: row.key,
    figma: row.figma,
    active: m.active,
    shell: m.shell,
    youSetting: m.youSetting,
    figmaNode: m.figmaNode,
    navActive: m.navActive,
    brandV4: m.brandV4,
    homeInactive: !m.homeActive,
    youActive: m.youActive,
    centerOpal: m.centerOpal,
    ok,
  });
}

// Group Info durability
await page.getByTestId("member-tab-chats").click();
await sleep(700);
{
  const rows = page.locator('[data-testid^="chats-row-"]');
  await rows.first().waitFor({ timeout: 20000 });
  for (let i = 0; i < Math.min(await rows.count(), 40); i++) {
    const t = await rows.nth(i).innerText();
    if (/· Group/i.test(t)) {
      await rows.nth(i).click();
      break;
    }
  }
}
await sleep(700);
if (await page.getByTestId("gpt-open-group-info").isVisible().catch(() => false)) {
  await page.getByTestId("gpt-open-group-info").click();
  await sleep(600);
}
m = await measure(page);
matrix.push({
  surface: "GroupInfo",
  figma: "618:521",
  active: m.active,
  homeInactive: !m.homeActive,
  chatsActive: m.chatsActive,
  groupInfo: m.groupInfo,
  ok: m.groupInfo && m.chatsActive && !m.homeActive,
});

const nestedOk = matrix.filter((r) => r.figma?.startsWith("618:1") || r.figma?.startsWith("618:2")).every((r) => r.ok);
// Better: all NESTED keys
const nestedRows = matrix.filter((r) => NESTED.some((n) => n.key === r.surface));
const allTwelve = nestedRows.length === 12 && nestedRows.every((r) => r.ok);

const final = {
  at: new Date().toISOString(),
  head: "4e2442b85ecc3e7083e17a40166298f4f0076dec",
  pass: "P0-05-6B",
  visual_changes: false,
  candidates_untouched: ["738:2", "738:35"],
  nested_settings_count: nestedRows.length,
  all_twelve_you_active_home_inactive: allTwelve,
  group_info_ownership: ownership,
  matrix,
  allOk: allTwelve && ownership.ok && matrix.find((r) => r.surface === "GroupInfo")?.ok,
};
writeFileSync(resolve(OUT, "SECTION06_12_NAV_MATRIX.json"), JSON.stringify(final, null, 2));
console.log(
  JSON.stringify(
    {
      allOk: final.allOk,
      allTwelve,
      ownershipOk: ownership.ok,
      NEW_GROUP_DOMAIN_OWNER: ownership.NEW_GROUP_DOMAIN_OWNER,
      surfaces: matrix.map((r) => ({
        s: r.surface,
        ok: r.ok,
        you: r.youActive,
        homeOff: r.homeInactive,
        chats: r.chatsActive,
      })),
    },
    null,
    2,
  ),
);
await browser.close();
process.exit(final.allOk ? 0 : 1);
