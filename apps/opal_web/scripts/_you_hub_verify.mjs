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

async function injectMember(page, session) {
  await page.addInitScript(
    ({ token, userId, name, handle }) => {
      sessionStorage.setItem("opal.product.browser_session.v1", token);
      sessionStorage.setItem("opal_native_host", "1");
      localStorage.setItem(
        "opal.product.profile.v17",
        JSON.stringify({ user_id: userId, display_name: name, handle, session_id: "you-verify" }),
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

async function measureScroll(page, label) {
  const body = page.locator(".you-settings-body");
  await body.waitFor({ state: "visible" });
  // Force tall content to prove scroll container (commercial trust: control plane must scroll)
  await body.evaluate((el) => {
    if (!el.querySelector("[data-scroll-probe]")) {
      const probe = document.createElement("div");
      probe.setAttribute("data-scroll-probe", "1");
      probe.style.height = "900px";
      probe.style.flexShrink = "0";
      probe.setAttribute("aria-hidden", "true");
      el.appendChild(probe);
    }
  });
  const before = await body.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      top: el.scrollTop,
      sh: el.scrollHeight,
      ch: el.clientHeight,
      height: cs.height,
      overflowY: cs.overflowY,
      touchAction: cs.touchAction,
    };
  });
  await body.evaluate((el) => {
    el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
  });
  await page.waitForTimeout(200);
  const after = await body.evaluate((el) => ({
    top: el.scrollTop,
    sh: el.scrollHeight,
    ch: el.clientHeight,
  }));
  const ok = after.sh > after.ch + 40 && after.top > 40;
  return { label, before, after, ok };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await injectMember(page, a);
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
await page.screenshot({ path: path.join(outDir, "YOU_HUB.png") });

const sections = await page.locator('[data-testid^="you-hub-section-"]').evaluateAll((els) =>
  els.map((e) => e.getAttribute("data-testid")),
);
const growText = await page.getByTestId("profile-people").innerText();
const hasGrow = /Grow Your Circle/i.test(growText);
const hasHtmlNative = await page.evaluate(() =>
  document.documentElement.classList.contains("opal-native-host"),
);

await page.getByTestId("you-hub-row-privacy").click();
await page.waitForSelector('[data-testid="you-settings-pane"]');
const privacyScroll = await measureScroll(page, "privacy");
await page.screenshot({ path: path.join(outDir, "YOU_PRIVACY_SCROLLED.png") });
await page.getByTestId("you-setting-back").click();

await page.getByTestId("you-hub-row-spending-fit").click();
await page.waitForSelector('[data-testid="you-settings-pane"]');
const spendingScroll = await measureScroll(page, "spending-fit");
await page.screenshot({ path: path.join(outDir, "YOU_SPENDING_SCROLLED.png") });
await page.getByTestId("you-setting-back").click();

await page.getByTestId("profile-people").click();
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(outDir, "YOU_GROW_CIRCLE.png") });
const flowText = await page.locator("body").innerText();
const honestChooser = /Choose people you already know|Only the people you select|Type a name|Contact/i.test(
  flowText,
);
const fakeRoster = /seed-chanelle|seed-maya|fixture people|Demo people/i.test(flowText);

const scrollOk = privacyScroll.ok && spendingScroll.ok;
const result = {
  at: new Date().toISOString(),
  sections,
  hasGrow,
  hasHtmlNative,
  privacyScroll,
  spendingScroll,
  growCircle: { honestChooser, fakeRoster },
  overall:
    sections.length >= 4 && hasGrow && scrollOk && honestChooser && !fakeRoster
      ? "GREEN"
      : "YELLOW",
};
fs.writeFileSync(path.join(outDir, "YOU_HUB_VERIFY.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
await browser.close();
process.exit(result.overall === "GREEN" ? 0 : 2);
