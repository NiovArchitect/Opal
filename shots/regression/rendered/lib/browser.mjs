/**
 * Repair #18 regression suite - RENDERED stage browser plumbing.
 *
 * Standing gate (founder, 2026-10-17, after Walk #4 was rejected):
 * NO WALK WITHOUT RENDERED PROOF. Three founder walks died on the
 * rendered layer while API/jsdom proof said green, so this stage
 * drives the REAL served web app in a real Chromium at a phone
 * viewport (390x844) against the REAL backend - the same stack, the
 * same entry URL shape, and the same session provisioning the API
 * stage uses (lib/harness.mjs is imported, never reimplemented).
 *
 * Auth honesty: sessions are minted by the backend activation API
 * through lib/harness.mjs loadSessions() (synthetic fixture numbers
 * on local/dev stacks, or the minted walk-session file on staging).
 * The token handed to the browser is that real backend-issued token,
 * presented through the app's OWN persistence keys - the exact keys
 * productClient.ts saveProfile()/saveBrowserAccessToken() write
 * after a real OTP verify:
 *   localStorage  "opal.product.profile.v17"          (identity only)
 *   sessionStorage "opal.product.browser_session.v1"  (bearer)
 *   localStorage  "opal.firstRun.v14.completed" = "1" (first-run done)
 * No state is fabricated: the profile values come from the minted
 * session, the founder seed is provisioned by the backend seed
 * endpoints (runFounderSeed, same as the API stage), and every byte
 * the surfaces paint comes from live API responses. What this stage
 * does NOT do is type the OTP through the first-run UI - that flow
 * is covered by the phone checklist / first-run cases; this stage
 * exists to prove the RENDERED member surfaces.
 *
 * Theme: the app resolves appearance from localStorage
 * "opal.appearance.theme.v1" ("dark" | "light" | "system",
 * theme/appearanceTheme.ts) plus the prefers-color-scheme media.
 * Both are set per context (init script + Playwright colorScheme
 * emulation) and the resolved data-theme attribute is asserted to
 * equal the mode under test before any screenshot counts.
 *
 * Entry URL (the founder walk shape):
 *   <webBase>/?opal_founder_seed=1&opal_native_host=1&opal_dev=1
 * opal_dev=1 makes the served build stamp its `seed · <sha>` chip -
 * the rendered stage reads that chip into the manifest so a
 * screenshot set is always tied to the build that produced it.
 */
import { chromium } from "playwright-core";
import { loadConfig, loadSessions, runFounderSeed, scanSeedWorld, ApiClient } from "../../lib/harness.mjs";

export const VIEWPORT = { width: 390, height: 844 };

/** Rendered-stage config: same env mechanism as the API stage, plus
 *  OPAL_WEB_BASE (the served web app) and OPAL_BUILD_TAG (output dir
 *  name under rendered/). */
export function loadRenderedConfig(env = process.env) {
  const api = loadConfig(env);
  const webBase = (
    env.OPAL_WEB_BASE ||
    env.OPAL_WEB_URL ||
    "http://127.0.0.1:5173"
  ).replace(/\/$/, "");
  return {
    ...api,
    webBase,
    buildTag: env.OPAL_BUILD_TAG || api.runTag,
    outRoot: env.OPAL_RENDERED_OUT || null, // default: rendered/<buildTag>
    navTimeoutMs: Number(env.OPAL_RENDERED_NAV_TIMEOUT_MS || 45000),
    settleMs: Number(env.OPAL_RENDERED_SETTLE_MS || 900),
  };
}

export function entryUrl(config, extra = "") {
  const q = "opal_founder_seed=1&opal_native_host=1&opal_dev=1";
  return `${config.webBase}/?${q}${extra ? `&${extra}` : ""}`;
}

/** Provision sessions + founder seed exactly like run.mjs does, then
 *  hand back everything the browser contexts need. */
export async function provisionRenderedSessions(config) {
  const sessions = await loadSessions(config);
  let seedInfo = null;
  if (config.seedMode) {
    const seedClient = new ApiClient(config, sessions.a);
    seedInfo = await runFounderSeed(seedClient);
    if (seedInfo.comm.status >= 400 || seedInfo.graph.status >= 400) {
      const err = new Error(
        `rendered harness: founder seed failed (comm=${seedInfo.comm.status} graph=${seedInfo.graph.status})`,
      );
      err.harness = true;
      throw err;
    }
    // Repair #19 (W1) permanent gate: no rendered capture may be taken
    // from a seed world containing machine-speak. This is the check
    // that would have caught the rejected full-pack ("Regression A",
    // "…macreplay1" titles) before it reached the founder.
    const gateHits = await scanSeedWorld(seedClient);
    if (gateHits.length > 0) {
      const err = new Error(
        `rendered harness: machine-speak in seed world (${gateHits.length} hits): ` +
          gateHits.slice(0, 5).map((h) => `${h.surface} "${h.token}" in "${h.value}"`).join("; "),
      );
      err.harness = true;
      throw err;
    }
  }
  return { sessions, seedInfo };
}

/** Launch the cached Chromium. playwright-core 1.64.1 pairs with the
 *  chromium-1248 build under ~/.cache/ms-playwright; if the browser
 *  is missing this throws a harness error (exit 2), never a product
 *  result. Install with: npx playwright-core install chromium */
export async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (e) {
    const err = new Error(
      `rendered harness: Chromium launch failed (${e.message.split("\n")[0]}). ` +
        `Run: cd shots/regression && npm install && npx playwright-core install chromium`,
    );
    err.harness = true;
    throw err;
  }
}

/**
 * One authenticated phone-viewport context for (session, mode).
 * Storage is seeded via addInitScript so it is in place BEFORE the
 * app's first script runs - the same state a returning signed-in
 * tab presents on load.
 */
export async function newAuthedContext(browser, config, session, mode) {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: mode,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const profile = {
    user_id: session.userId,
    display_name: session.name || "Ethan Walker",
    handle: session.handle || null,
    session_id: null,
  };
  await ctx.addInitScript(
    ({ token, profileJson, modeValue }) => {
      try {
        localStorage.setItem("opal.appearance.theme.v1", modeValue);
        localStorage.setItem("opal.product.profile.v17", profileJson);
        localStorage.setItem("opal.firstRun.v14.completed", "1");
        sessionStorage.setItem("opal.product.browser_session.v1", token);
      } catch {
        /* storage unavailable - the surface pass will fail honestly */
      }
    },
    { token: session.token, profileJson: JSON.stringify(profile), modeValue: mode },
  );
  await installApiRewrite(ctx, config);
  return ctx;
}

/**
 * Local-run network adaptation (documented, harness-only): the web
 * app's API base on a native-host loopback page is same-origin, and
 * the Vite dev server proxies /api to http://127.0.0.1:4000. When the
 * backend under test is NOT on :4000 (e.g. a sibling process owns
 * :4000 on a shared VM), the Vite proxy would hit the wrong process.
 * In that case the harness rewrites the browser's API requests to
 * the real backend origin - the same job the Vite proxy does, done
 * at the context level. On a correctly-proxied stack (staging, or a
 * local :4000 backend) no route is installed and traffic flows
 * exactly as the founder's does. WebSocket /socket traffic is not
 * rewritten (Playwright cannot route it); realtime channels are not
 * what this stage asserts on.
 */
export async function installApiRewrite(ctx, config) {
  const api = new URL(config.apiBase);
  if (api.origin === "http://127.0.0.1:4000" || api.origin === config.webBase) return false;
  const web = new URL(config.webBase);
  const prefixes = ["/api/", "/health", "/webhooks/", "/invite/"];
  await ctx.route(`${web.origin}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (prefixes.some((p) => url.pathname === p || url.pathname.startsWith(p))) {
      url.protocol = api.protocol;
      url.host = api.host;
      await route.continue({ url: url.toString() });
      return;
    }
    await route.continue();
  });
  return true;
}

/** One unauthenticated context (splash / first-run surfaces). */
export async function newAnonContext(browser, mode, config = null) {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: mode,
  });
  await ctx.addInitScript((modeValue) => {
    try {
      localStorage.setItem("opal.appearance.theme.v1", modeValue);
    } catch {
      /* ignore */
    }
  }, mode);
  if (config) await installApiRewrite(ctx, config);
  return ctx;
}

/** Wait for the member shell, then settle. Returns the shell's own
 *  build evidence: the opal_dev seed chip text and data-theme. */
export async function gotoMemberShell(page, config) {
  await page.goto(entryUrl(config), {
    waitUntil: "domcontentloaded",
    timeout: config.navTimeoutMs,
  });
  await page
    .waitForSelector('[data-testid="member-shell"]', { timeout: config.navTimeoutMs })
    .catch(() => null);
  await page.waitForTimeout(config.settleMs);
  return page.evaluate(() => ({
    memberShell: !!document.querySelector('[data-testid="member-shell"]'),
    seedChip:
      document.querySelector('[data-testid="opal-seed-sha-chip"]')?.textContent?.trim() ||
      null,
    gitHead: document.documentElement.getAttribute("data-git-head"),
    theme: document.documentElement.getAttribute("data-theme"),
    primaryTab:
      document.querySelector('[data-testid="member-shell"]')?.getAttribute("data-primary-tab") ||
      null,
    url: window.location.href,
  }));
}
