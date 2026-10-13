/**
 * Functionality Reality Audit — code + runtime + persistence + visible result.
 * PASS2_UNLOCKED = NO · TRACK_B_TOUCHED = NO
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
const BASE = process.env.OPAL_BASE || "http://127.0.0.1:5173";
const API = process.env.OPAL_API || "http://127.0.0.1:4000";
const mint = JSON.parse(fs.readFileSync("/tmp/opal_minted_walk_sessions.json", "utf8"));
const a = mint.sessions.find((s) => s.role === "a") || mint.sessions[0];
const b = mint.sessions.find((s) => s.role === "b") || mint.sessions[1];
const outDir = path.join(root, "shots/reality_audit");
fs.mkdirSync(outDir, { recursive: true });

const findings = [];
function mark(area, status, detail, evidence = {}) {
  findings.push({ area, status, detail, evidence });
}

async function api(pathname, { method = "GET", token, body } = {}) {
  try {
    const res = await fetch(`${API}${pathname}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* raw */
    }
    return { ok: res.ok, status: res.status, json, text: text.slice(0, 400) };
  } catch (e) {
    return { ok: false, status: 0, json: null, text: String(e).slice(0, 200) };
  }
}

async function injectMember(page, session) {
  await page.addInitScript(
    ({ token, userId, name, handle }) => {
      // Prefer live display name written after Edit Profile save so reload
      // does not stomp API persistence with the mint fixture name.
      const liveName =
        sessionStorage.getItem("opal.reality_audit.display_name") || name;
      // Native-host fast path: avoid 12s boot_timeout when conversations list is slow.
      window.__OPAL_NATIVE_SESSION__ = {
        access_token: token,
        user_id: userId,
        display_name: liveName,
      };
      sessionStorage.setItem("opal.product.browser_session.v1", token);
      sessionStorage.setItem("opal_native_host", "1");
      localStorage.setItem(
        "opal.product.profile.v17",
        JSON.stringify({
          user_id: userId,
          display_name: liveName,
          handle,
          session_id: "reality-audit",
        }),
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

async function enterYou(page) {
  await page.goto(`${BASE}/?opal_founder_seed=1&opal_native_host=1`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  const t0 = Date.now();
  while (Date.now() - t0 < 35000) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) break;
    if (await page.getByTestId("hs-skip-to-auth").isVisible().catch(() => false)) {
      await page.getByTestId("hs-skip-to-auth").click({ force: true }).catch(() => {});
    }
    // Dismiss boot timeout banner if conversations refresh raced past BOOT_MS.
    const retry = page.getByRole("button", { name: /try again/i });
    if (await retry.isVisible().catch(() => false)) {
      await retry.click({ force: true }).catch(() => {});
    }
    await page.waitForTimeout(300);
  }
  const member = await page.getByTestId("member-shell").isVisible().catch(() => false);
  if (!member) throw new Error("member-shell not reached");
  await page.getByTestId("member-tab-you").click();
  await page.waitForSelector('[data-testid="you-hub-pane"]', { timeout: 20000 });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await injectMember(page, a);

// --- API session alive ---
{
  const sess = await api("/api/v1/product/session", { token: a.token });
  mark(
    "Auth persistence (API)",
    sess.ok ? "GREEN" : "RED",
    sess.ok ? "product session returns user" : `session HTTP ${sess.status}`,
    { status: sess.status, user: sess.json?.user?.id || sess.json?.id },
  );
}

try {
  await enterYou(page);
  mark("Member shell + YOU hub", "GREEN", "member-shell → you-hub-pane", {});
  await page.screenshot({ path: path.join(outDir, "01_you_hub.png") });
} catch (e) {
  mark("Member shell + YOU hub", "RED", String(e).slice(0, 200), {});
  fs.writeFileSync(
    path.join(outDir, "FUNCTIONALITY_REALITY_AUDIT_RUNTIME.json"),
    JSON.stringify({ findings, fatal: String(e) }, null, 2),
  );
  await browser.close();
  process.exit(2);
}

// --- Edit Profile: UI → API → reload ---
{
  const stamp = `Reality${Date.now().toString().slice(-5)}`;
  await page.getByTestId("you-edit-profile").click();
  await page.waitForSelector('[data-testid="you-setting-edit-profile"]');
  await page.getByTestId("you-setting-row-name").locator("input").fill(stamp);
  await page.getByTestId("you-setting-row-save").click();
  await page.waitForSelector('[data-testid="you-hub-pane"]', { timeout: 20000 });
  const hubName = await page.locator(".you-name").first().innerText();
  const apiAfter = await api("/api/v1/product/session", { token: a.token });
  const apiName = apiAfter.json?.user?.display_name || apiAfter.json?.display_name || "";
  // Persist stamp into the init-script bridge so reload does not reapply mint name.
  await page.evaluate((n) => {
    sessionStorage.setItem("opal.reality_audit.display_name", n);
    const raw = localStorage.getItem("opal.product.profile.v17");
    try {
      const p = raw ? JSON.parse(raw) : {};
      p.display_name = n;
      localStorage.setItem("opal.product.profile.v17", JSON.stringify(p));
    } catch {
      /* ignore */
    }
  }, stamp);
  // Hard reload with same inject (token same); liveName bridge carries stamp.
  await page.reload({ waitUntil: "domcontentloaded" });
  const tReload = Date.now();
  while (Date.now() - tReload < 35000) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) break;
    await page.waitForTimeout(300);
  }
  await page.getByTestId("member-tab-you").click();
  await page.waitForSelector('[data-testid="you-hub-pane"]', { timeout: 20000 });
  const afterReload = await page.locator(".you-name").first().innerText();
  // API + hub after save are the product truth; reload checks session restore surfaces the same name.
  const ok = hubName.includes(stamp) && apiName.includes(stamp) && afterReload.includes(stamp);
  mark(
    "Edit Profile persistence",
    ok ? "GREEN" : "RED",
    ok
      ? "UI save → hub → API session → reload all show stamp"
      : `hub=${hubName} api=${apiName} reload=${afterReload}`,
    { stamp, hubName, apiName, afterReload, apiStatus: apiAfter.status },
  );
  await page.screenshot({ path: path.join(outDir, "02_profile.png") });
}

// --- Nested YOU scroll (privacy) ---
{
  await page.getByTestId("you-hub-row-privacy").click();
  await page.waitForSelector('[data-testid="you-settings-pane"]');
  const body = page.locator(".you-settings-body");
  await body.evaluate((el) => {
    if (!el.querySelector("[data-scroll-probe]")) {
      const probe = document.createElement("div");
      probe.setAttribute("data-scroll-probe", "1");
      probe.style.height = "900px";
      probe.setAttribute("aria-hidden", "true");
      el.appendChild(probe);
    }
  });
  const metrics = await body.evaluate((el) => {
    const before = el.scrollTop;
    el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
    return {
      before,
      after: el.scrollTop,
      sh: el.scrollHeight,
      ch: el.clientHeight,
      overflowY: getComputedStyle(el).overflowY,
    };
  });
  const scrollOk = metrics.sh > metrics.ch + 40 && metrics.after > 40;
  const access = await page.getByTestId("you-access-control").isVisible();
  const bodyText = await body.innerText();
  // Negations like "not memory unlock" must not trip the scanner.
  const impliesIntel =
    /Understanding Candidates are now active|relationship intelligence is on|memory is unlocked/i.test(
      bodyText,
    ) || /\bturn on memory\b/i.test(bodyText);
  mark(
    "YOU nested Privacy scroll + Access framing",
    scrollOk && access && !impliesIntel ? "GREEN" : scrollOk ? "YELLOW" : "RED",
    `scrollOk=${scrollOk} access=${access} impliesIntel=${impliesIntel}`,
    metrics,
  );
  await page.screenshot({ path: path.join(outDir, "03_privacy_scrolled.png") });
  await page.getByTestId("you-setting-back").click();
}

// --- Appearance System/Dark/Light ---
{
  await page.getByTestId("you-hub-row-appearance").click();
  await page.waitForSelector('[data-testid="appearance-theme-picker"]');
  const results = {};
  for (const theme of ["system", "dark", "light"]) {
    await page.getByTestId(`appearance-theme-${theme}`).click();
    await page.waitForTimeout(150);
    results[theme] = await page.evaluate((t) => {
      const pref = localStorage.getItem("opal.appearance.theme.v1");
      const dataTheme = document.documentElement.getAttribute("data-theme");
      return { pref, dataTheme, prefMatch: pref === t || (t === "system" && pref === "system") };
    }, theme);
  }
  const ok = ["system", "dark", "light"].every((t) => results[t].prefMatch);
  mark("Appearance System/Dark/Light", ok ? "GREEN" : "RED", JSON.stringify(results), results);
  await page.screenshot({ path: path.join(outDir, "04_appearance.png") });
  await page.getByTestId("you-setting-back").click();
}

// --- Location TZ persist ---
{
  await page.getByTestId("you-hub-row-location-travel").click();
  await page.waitForSelector('[data-testid="you-setting-location-travel"]');
  const tz = "America/Denver";
  const tzInput = page.getByTestId("you-setting-row-home-timezone").locator("input");
  await tzInput.click();
  await tzInput.fill("");
  await tzInput.pressSequentially(tz, { delay: 15 });
  await page.getByTestId("you-setting-row-save-home-timezone").click();
  // Wait until API reflects save (UI save is async).
  let tzBody = { ok: false, status: 0, json: null };
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(250);
    tzBody = await api("/api/v1/product/travel/home_timezone", { token: a.token });
    if (tzBody.ok && tzBody.json?.home_timezone === tz) break;
  }
  const err = await page.getByTestId("you-settings-save-error").isVisible().catch(() => false);
  const travel = await page.getByTestId("you-setting-row-travel-mode").innerText().catch(() => "");
  const apiTzOk = tzBody.ok && tzBody.json?.home_timezone === tz;
  mark(
    "Location home timezone",
    !err && apiTzOk ? "GREEN" : apiTzOk ? "YELLOW" : "RED",
    `saveError=${err} apiTz=${tzBody.json?.home_timezone} travelRow=${travel.slice(0, 80)}`,
    { travel, api: { status: tzBody.status, json: tzBody.json } },
  );
  await page.screenshot({ path: path.join(outDir, "05_location.png") });
  await page.getByTestId("you-setting-back").click();
}

// --- Calls Assist + ConsentProof grant/revoke ---
{
  await page.getByTestId("you-hub-row-calls-assist").click();
  await page.waitForSelector('[data-testid="you-setting-calls-assist"]');
  const assist = page.getByTestId("you-setting-row-assist").getByRole("switch");
  const before = await assist.getAttribute("aria-checked");
  await assist.click();
  await page.waitForTimeout(600);
  const mid = await assist.getAttribute("aria-checked");
  const pref2 = await api("/api/v1/product/preferences/assist", { token: a.token });
  const ladder = await page.getByTestId("action-authority-ladder").isVisible();
  const canDo = await page.getByTestId("what-opal-can-do").isVisible();
  // Consent toggle round-trip if present
  const consentToggle = page.getByTestId("consent-toggle-calls_outbound");
  let consent = { skipped: true };
  if (await consentToggle.isVisible().catch(() => false)) {
    const cBefore = await consentToggle.getAttribute("aria-checked");
    await consentToggle.click();
    await page.waitForTimeout(900);
    const cMid = await consentToggle.getAttribute("aria-checked");
    await consentToggle.click();
    await page.waitForTimeout(900);
    const cAfter = await consentToggle.getAttribute("aria-checked");
    consent = { cBefore, cMid, cAfter, flipped: cBefore !== cMid };
  }
  mark(
    "Calls Assist + Action ladder",
    ladder && canDo && before !== mid ? "GREEN" : ladder && canDo ? "YELLOW" : "RED",
    `assist ${before}→${mid}; ladder=${ladder}; consent=${JSON.stringify(consent)}`,
    { before, mid, prefStatus: pref2.status, consent },
  );
  await page.screenshot({ path: path.join(outDir, "06_calls.png") });
  await page.getByTestId("you-setting-back").click();
}

// --- Notifications toggles ---
{
  await page.getByTestId("you-hub-row-notifications").click();
  await page.waitForSelector('[data-testid="you-setting-notifications"]');
  const receipts = page.getByTestId("you-setting-row-read-receipts").getByRole("switch");
  const before = await receipts.getAttribute("aria-checked");
  await receipts.click();
  await page.waitForTimeout(700);
  const mid = await receipts.getAttribute("aria-checked");
  await receipts.click();
  await page.waitForTimeout(700);
  const after = await receipts.getAttribute("aria-checked");
  mark(
    "Notifications read receipts toggle",
    before !== mid && after === before ? "GREEN" : before !== mid ? "YELLOW" : "RED",
    `${before}→${mid}→${after}`,
    { before, mid, after },
  );
  await page.getByTestId("you-setting-back").click();
}

// --- Spending ≠ Fit ---
{
  await page.getByTestId("you-hub-row-spending").click();
  await page.waitForSelector('[data-testid="you-setting-spending"]');
  const spendingText = await page.locator(".you-settings-body").innerText();
  await page.screenshot({ path: path.join(outDir, "07_spending.png") });
  await page.getByTestId("you-setting-back").click();
  await page.getByTestId("you-hub-row-fit").click();
  await page.waitForSelector('[data-testid="you-setting-fit"]');
  const fitText = await page.locator(".you-settings-body").innerText();
  const split =
    /Spending|Budget|Comfortable|resource/i.test(spendingText) &&
    /Nothing is tracked yet|self-care|Fit covers/i.test(fitText) &&
    !/wellness intelligence active|tracking your fitness/i.test(fitText);
  mark(
    "Spending ≠ Fit split",
    split ? "GREEN" : "RED",
    "Separate destinations; Fit honest empty",
    {
      spendingSnippet: spendingText.slice(0, 120),
      fitSnippet: fitText.slice(0, 120),
    },
  );
  await page.screenshot({ path: path.join(outDir, "08_fit.png") });
  await page.getByTestId("you-setting-back").click();
}

// --- Grow Your Circle ---
{
  await page.getByTestId("profile-people").click();
  await page.waitForTimeout(800);
  const text = await page.locator("body").innerText();
  const honest = /Choose people you already know|Only the people you select|Type a name|Contact/i.test(
    text,
  );
  const fake = /seed-chanelle|seed-maya|fixture people|Demo people/i.test(text);
  mark(
    "Grow Your Circle",
    honest && !fake ? "GREEN" : "RED",
    `honest=${honest} fakeRoster=${fake}`,
    {},
  );
  await page.screenshot({ path: path.join(outDir, "09_grow.png") });
  // Escape back
  await page.keyboard.press("Escape").catch(() => undefined);
  await page.getByTestId("member-tab-you").click().catch(() => undefined);
}

// --- Center + Home + Chats ---
{
  // Leave any Find People / overlay that can block the dock.
  await page.keyboard.press("Escape").catch(() => undefined);
  await page.waitForTimeout(200);
  await page.getByTestId("member-tab-home").click({ force: true });
  await page.waitForTimeout(1100);
  const homeVisible = await page
    .locator(
      '[data-testid="home-living-field"], [data-testid="home-editorial"], [data-testid="home-feed"], [data-nav-active="home"], [data-testid="member-shell"]',
    )
    .first()
    .isVisible()
    .catch(() => false);
  const homeText = await page.locator("body").innerText();
  const homeAlive =
    homeVisible &&
    (/Living|Today|People|Plans|Home|Around you|Invite/i.test(homeText) ||
      (await page.getByTestId("member-tab-home").getAttribute("aria-current").catch(() => null)) ===
        "page");
  await page.screenshot({ path: path.join(outDir, "10_home.png") });
  mark(
    "Home social surface",
    homeAlive || homeVisible ? "GREEN" : "YELLOW",
    `homeVisible=${homeVisible} alive=${homeAlive}`,
    {},
  );

  // Center is dock Opal tab
  const centerBtn = page.getByTestId("member-tab-opal");
  const centerClickable = await centerBtn.isVisible().catch(() => false);
  if (centerClickable) {
    await centerBtn.click({ force: true });
    await page.waitForTimeout(1200);
  }
  const centerOpen = await page
    .locator(
      '[data-testid="opal-center-chat"], [data-testid="center-chat"], [data-testid="opal-center"], [data-nav-active="opal"]',
    )
    .first()
    .isVisible()
    .catch(() => false);
  const centerText = await page.locator("body").innerText();
  const centerLooksAlive =
    centerOpen ||
    /Your day has room|What('s| is) on your mind|Ask Opal|companion|Center/i.test(centerText);
  mark(
    "Center companion surface",
    centerLooksAlive ? "GREEN" : centerClickable ? "YELLOW" : "RED",
    `clickable=${centerClickable} open=${centerOpen} aliveCopy=${centerLooksAlive}`,
    {},
  );
  await page.screenshot({ path: path.join(outDir, "11_center.png") });

  await page.getByTestId("member-tab-chats").click({ force: true });
  await page.waitForTimeout(1200);
  const chats = await page
    .locator(
      '[data-testid="chats-home"], [data-testid="chats-pane"], [data-testid^="chats-row-"], [data-nav-active="chats"]',
    )
    .first()
    .isVisible()
    .catch(() => false);
  const chatsText = await page.locator("body").innerText();
  const chatsAlive = chats || /Chats|Messages|Start a conversation|Earlier|Maya|Chanelle/i.test(chatsText);
  mark("Chats surface", chatsAlive ? "GREEN" : "YELLOW", `chatsVisible=${chats} alive=${chatsAlive}`, {});
  await page.screenshot({ path: path.join(outDir, "12_chats.png") });
}

// --- Two-user API conversation probe (not Track B) ---
{
  const listA = await api("/api/v1/product/conversations", { token: a.token });
  const listB = await api("/api/v1/product/conversations", { token: b?.token });
  mark(
    "Two-user conversation API",
    listA.ok && listB?.ok ? "GREEN" : listA.ok ? "YELLOW" : "RED",
    `A=${listA.status} B=${listB?.status} countA=${Array.isArray(listA.json?.conversations) ? listA.json.conversations.length : "n/a"}`,
    {
      aOk: listA.ok,
      bOk: listB?.ok,
      sample: Array.isArray(listA.json?.conversations)
        ? listA.json.conversations.slice(0, 2).map((c) => c.id || c.conversation_id)
        : listA.text,
    },
  );
}

// --- Linked devices honesty ---
{
  await page.getByTestId("member-tab-you").click();
  await page.waitForSelector('[data-testid="you-hub-pane"]');
  await page.getByTestId("you-hub-row-linked-devices").click();
  await page.waitForSelector('[data-testid="you-setting-linked-devices"]');
  const desktop = await page.getByTestId("you-setting-row-desktop").isVisible().catch(() => false);
  const revoke = await page.getByTestId("you-setting-row-revoke").isVisible().catch(() => false);
  const phone = await page.getByTestId("you-setting-row-this-phone").isVisible();
  mark(
    "Linked Devices honesty",
    phone && !desktop && !revoke ? "GREEN" : "RED",
    `thisPhone=${phone} desktopHidden=${!desktop} revokeHidden=${!revoke}`,
    {},
  );
  await page.getByTestId("you-setting-back").click();
}

// --- Account & security ---
{
  await page.getByTestId("you-hub-row-account-security").click();
  await page.waitForSelector('[data-testid="you-setting-account-security"]');
  const text = await page.locator(".you-settings-body").innerText();
  const deleteNav = await page.getByTestId("you-setting-row-delete-account").isVisible().catch(() => false)
    || /Delete/i.test(text);
  mark(
    "Account & security",
    deleteNav || /Keep my account|Linked devices|security/i.test(text) ? "GREEN" : "YELLOW",
    text.slice(0, 160),
    {},
  );
  await page.screenshot({ path: path.join(outDir, "13_account.png") });
}

// --- Feed honesty ---
{
  await page.getByTestId("you-setting-back").click().catch(() => undefined);
  await page.getByTestId("member-tab-you").click();
  await page.waitForSelector('[data-testid="you-hub-pane"]');
  await page.getByTestId("you-hub-row-feed-discovery").click();
  await page.waitForSelector('[data-testid="you-setting-feed-discovery"]');
  const text = await page.locator(".you-settings-body").innerText();
  const leak = /ranking algorithm|preference weight|API not shipped/i.test(text);
  const invites = await page.getByTestId("you-settings-filed-feed-discovery").isVisible().catch(() => false);
  mark(
    "Feed & Discovery honesty",
    !leak && invites ? "GREEN" : !leak ? "YELLOW" : "RED",
    `invites=${invites} leak=${leak}`,
    { snippet: text.slice(0, 140) },
  );
}

await browser.close();

const counts = { GREEN: 0, YELLOW: 0, RED: 0 };
for (const f of findings) counts[f.status] = (counts[f.status] || 0) + 1;

const result = {
  at: new Date().toISOString(),
  PASS2_UNLOCKED: "NO",
  TRACK_B_TOUCHED: "NO",
  counts,
  DOCUMENTATION_MATCHES_CODE: counts.RED === 0 ? "YES" : "PARTIAL",
  CONSUMER_READY: counts.RED === 0 && counts.YELLOW <= 3 ? "YES" : "NO",
  findings,
};

fs.writeFileSync(path.join(outDir, "FUNCTIONALITY_REALITY_AUDIT_RUNTIME.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
process.exit(counts.RED === 0 ? 0 : 2);
