/**
 * YOU Permissions tranche verify — every hub card → destination → live wires.
 * Required zeros: DEAD_ACTIONS · FAKE_SUCCESS · VISIBLE_BUT_UNWIRED · CONSUMER_TECH_LEAK
 * PASS2_UNLOCKED = NO · TRACK_B_TOUCHED = NO
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
const BASE = process.env.OPAL_BASE || "http://127.0.0.1:5173";
const mint = JSON.parse(fs.readFileSync("/tmp/opal_minted_walk_sessions.json", "utf8"));
const a = mint.sessions.find((s) => s.role === "a") || mint.sessions[0];
const outDir = path.join(root, "shots/you_page");
fs.mkdirSync(outDir, { recursive: true });

const HUB_ROWS = [
  "feed-discovery",
  "location-travel",
  "privacy",
  "calls-assist",
  "notifications",
  "appearance",
  "spending",
  "fit",
  "linked-devices",
  "account-security",
];

const TECH_LEAK_RE =
  /not wired yet|API not shipped|needs Expo|preference API|blockedReason|Pass 2 unlock|TODO implement|coming soon \(eng\)/i;

async function injectMember(page, session) {
  await page.addInitScript(
    ({ token, userId, name, handle }) => {
      sessionStorage.setItem("opal.product.browser_session.v1", token);
      sessionStorage.setItem("opal_native_host", "1");
      localStorage.setItem(
        "opal.product.profile.v17",
        JSON.stringify({ user_id: userId, display_name: name, handle, session_id: "you-perm-verify" }),
      );
      localStorage.setItem("opal.founder_seed.opt_in.persist.v1", "1");
      sessionStorage.setItem("opal.founder_seed.opt_in.v1", "1");
      localStorage.setItem("opal.firstRun.v14.completed", "1");
      localStorage.setItem("opal.firstRun.v14.phoneVerified", "1");
    },
    {
      token: session.token,
      userId: session.userId,
      name: session.name,
      handle: session.handle || "walk",
    },
  );
}

async function enterMember(page) {
  await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  const t0 = Date.now();
  while (Date.now() - t0 < 25000) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) break;
    if (await page.getByTestId("hs-skip-to-auth").isVisible().catch(() => false)) {
      await page.getByTestId("hs-skip-to-auth").click({ force: true }).catch(() => {});
    }
    await page.waitForTimeout(350);
  }
  await page.getByTestId("member-tab-you").click();
  await page.waitForSelector('[data-testid="you-hub-pane"]', { timeout: 20000 });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await injectMember(page, a);
await enterMember(page);

const cards = {};
let visibleButUnwired = 0;
let consumerTechLeak = 0;
let deadActions = 0;
let fakeSuccess = 0;

for (const key of HUB_ROWS) {
  const row = page.getByTestId(`you-hub-row-${key}`);
  const hubVisible = await row.isVisible().catch(() => false);
  if (!hubVisible) {
    cards[key] = { hubVisible: false, status: "MISSING_HUB" };
    deadActions += 1;
    continue;
  }
  await row.click();
  await page.waitForSelector(`[data-testid="you-setting-${key}"]`, { timeout: 15000 });
  const bodyText = await page.locator(".you-settings-body").innerText().catch(() => "");
  const leak = TECH_LEAK_RE.test(bodyText);
  if (leak) consumerTechLeak += 1;

  const paintedBlocked = await page.locator('[data-testid^="you-setting-row-"]').evaluateAll((els) =>
    els
      .map((el) => ({
        id: el.getAttribute("data-testid"),
        text: (el.textContent || "").trim().slice(0, 120),
      }))
      .filter((r) => /not wired|API not|needs Expo|preference API/i.test(r.text)),
  );

  if (paintedBlocked.length) {
    visibleButUnwired += paintedBlocked.length;
    consumerTechLeak += paintedBlocked.length;
  }

  cards[key] = {
    hubVisible: true,
    destination: true,
    leak,
    paintedBlocked,
    probes: {},
  };

  if (key === "privacy") {
    cards[key].probes.access = await page.getByTestId("you-access-control").isVisible().catch(() => false);
    cards[key].probes.remembers = await page
      .getByTestId("you-settings-filed-privacy")
      .isVisible()
      .catch(() => false);
    if (!cards[key].probes.access) deadActions += 1;
  }
  if (key === "calls-assist") {
    cards[key].probes.assist = await page.getByTestId("you-setting-row-assist").isVisible().catch(() => false);
    cards[key].probes.canDo = await page.getByTestId("what-opal-can-do").isVisible().catch(() => false);
    cards[key].probes.ladder = await page.getByTestId("action-authority-ladder").isVisible().catch(() => false);
    if (!cards[key].probes.assist || !cards[key].probes.canDo) deadActions += 1;
  }
  if (key === "appearance") {
    const light = page.getByTestId("appearance-theme-light");
    await light.click();
    await page.waitForTimeout(200);
    const pref = await page.evaluate(() => localStorage.getItem("opal.appearance.theme.v1"));
    cards[key].probes.themePersist = pref === "light" || (pref && pref.includes("light"));
    if (!cards[key].probes.themePersist) {
      // readAppearance may store JSON
      const ok = typeof pref === "string" && /light/i.test(pref);
      cards[key].probes.themePersist = ok;
      if (!ok) fakeSuccess += 1;
    }
  }
  if (key === "notifications") {
    cards[key].probes.messages = await page
      .getByTestId("you-setting-row-messages-calls")
      .isVisible()
      .catch(() => false);
    cards[key].probes.receipts = await page
      .getByTestId("you-setting-row-read-receipts")
      .isVisible()
      .catch(() => false);
    if (!cards[key].probes.messages || !cards[key].probes.receipts) deadActions += 1;
  }
  if (key === "location-travel") {
    cards[key].probes.tz = await page.getByTestId("you-setting-row-home-timezone").isVisible().catch(() => false);
    cards[key].probes.saveTz = await page
      .getByTestId("you-setting-row-save-home-timezone")
      .isVisible()
      .catch(() => false);
    cards[key].probes.travel = await page.getByTestId("you-setting-row-travel-mode").isVisible().catch(() => false);
    if (!cards[key].probes.tz || !cards[key].probes.saveTz) deadActions += 1;
  }
  if (key === "feed-discovery") {
    cards[key].probes.invites = await page
      .getByTestId("you-settings-filed-feed-discovery")
      .isVisible()
      .catch(() => false);
  }
  if (key === "fit") {
    cards[key].probes.honestEmpty = /Nothing is tracked yet|protects the boundary/i.test(bodyText);
    if (!cards[key].probes.honestEmpty) fakeSuccess += 1;
  }
  if (key === "spending") {
    cards[key].probes.comfort = /Spending comfort|Trusted|Budget|Moderate|Comfortable/i.test(bodyText);
  }
  if (key === "linked-devices") {
    cards[key].probes.thisPhone = await page.getByTestId("you-setting-row-this-phone").isVisible().catch(() => false);
    const desktop = await page.getByTestId("you-setting-row-desktop").isVisible().catch(() => false);
    const revoke = await page.getByTestId("you-setting-row-revoke").isVisible().catch(() => false);
    cards[key].probes.desktopHidden = !desktop;
    cards[key].probes.revokeHidden = !revoke;
    if (desktop || revoke) visibleButUnwired += 1;
  }

  await page.screenshot({ path: path.join(outDir, `YOU_PERM_${key}.png`) });
  await page.getByTestId("you-setting-back").click();
  await page.waitForSelector('[data-testid="you-hub-pane"]', { timeout: 10000 });
}

// Edit profile round-trip
await page.getByTestId("member-tab-you").click().catch(() => undefined);
await page.waitForSelector('[data-testid="you-hub-pane"]', { timeout: 15000 });
await page.getByTestId("you-edit-profile").click();
let profile = { ok: false };
try {
  await page.waitForSelector('[data-testid="you-setting-edit-profile"]', { timeout: 10000 });
  const stamp = `Walk${Date.now().toString().slice(-4)}`;
  await page.getByTestId("you-setting-row-name").locator("input").fill(stamp);
  await page.getByTestId("you-setting-row-save").click();
  await page.waitForSelector('[data-testid="you-hub-pane"]', { timeout: 15000 });
  const hubName = await page.locator(".you-name").first().innerText();
  profile = { ok: hubName.includes(stamp), stamp, hubName: hubName.slice(0, 80) };
  if (!profile.ok) fakeSuccess += 1;
} catch (e) {
  profile = { ok: false, error: String(e).slice(0, 200) };
  fakeSuccess += 1;
}

// Grow Your Circle honesty
await page.getByTestId("profile-people").click();
await page.waitForTimeout(600);
const flowText = await page.locator("body").innerText();
const growCircle = {
  honestChooser: /Choose people you already know|Only the people you select|Type a name|Contact/i.test(
    flowText,
  ),
  fakeRoster: /seed-chanelle|seed-maya|fixture people|Demo people/i.test(flowText),
};
if (!growCircle.honestChooser || growCircle.fakeRoster) fakeSuccess += 1;
await page.screenshot({ path: path.join(outDir, "YOU_PERM_GROW.png") });

const result = {
  at: new Date().toISOString(),
  tip_context: "YOU_PERMISSIONS_TRANCHE",
  PASS2_UNLOCKED: "NO",
  TRACK_B_TOUCHED: "NO",
  DEAD_ACTIONS: deadActions,
  FAKE_SUCCESS: fakeSuccess,
  VISIBLE_BUT_UNWIRED: visibleButUnwired,
  CONSUMER_TECH_LEAK: consumerTechLeak,
  cards,
  profile,
  growCircle,
  overall:
    deadActions === 0 &&
    fakeSuccess === 0 &&
    visibleButUnwired === 0 &&
    consumerTechLeak === 0 &&
    growCircle.honestChooser &&
    !growCircle.fakeRoster
      ? "GREEN"
      : "RED",
};

fs.writeFileSync(path.join(outDir, "YOU_PERMISSIONS_VERIFY.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
await browser.close();
process.exit(result.overall === "GREEN" ? 0 : 2);
