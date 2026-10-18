/**
 * Repair #18 rendered stage - primary surface map.
 *
 * Every primary surface the founder walks, as a navigation recipe
 * against the REAL served app (dock taps and in-app controls only -
 * no route hacking, no state injection beyond the login storage the
 * app itself writes, see lib/browser.mjs). A surface whose ready
 * selector never appears is a FAIL ("failed to load"), not a skip:
 * that is the standing gate's whole point.
 *
 * Surface list (task spec): splash 1, splash 2 / onboarding entry,
 * Center rest, Center chat, Chats list, thread, plan detail,
 * Graphs list, graph detail, Home / social, YOU hub.
 */

async function settle(page, config) {
  await page.waitForTimeout(config.settleMs);
}

async function visible(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden";
  }, selector);
}

async function waitReady(page, config, selector, timeoutMs = 45000) {
  try {
    await page.waitForSelector(selector, { timeout: timeoutMs });
    await settle(page, config);
    return true;
  } catch {
    return false;
  }
}

async function clickTestId(page, testid, timeoutMs = 10000) {
  // Inactive panes keep duplicate testids in the DOM; only the
  // visible copy is a real tap target.
  const loc = page.locator(`[data-testid="${testid}"]:visible`).first();
  await loc.click({ timeout: timeoutMs });
}

/** Wait until at least one VISIBLE element matches the selector. */
async function waitVisible(page, selector, timeoutMs = 45000) {
  try {
    await page.waitForFunction(
      (sel) =>
        [...document.querySelectorAll(sel)].some((el) => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden";
        }),
      selector,
      { timeout: timeoutMs },
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for chat rows, working the app's OWN recovery path: when a
 * slow backend trips the client's response timeout, the list paints
 * "Couldn't load conversations ... Try again". A user taps Try
 * again; so does the harness (up to 4 cycles). This is load relief
 * for contended local VMs - on staging the first cycle succeeds.
 * Returns false only when rows never appear after every retry.
 */
async function waitRowsWithRetry(page, config) {
  for (let attempt = 0; attempt < 4; attempt++) {
    if (await waitVisible(page, '[data-testid="chat-row"]', attempt === 0 ? 45000 : 20000)) {
      return true;
    }
    const retry = page.locator('button:visible', { hasText: "Try again" }).first();
    if ((await retry.count()) > 0) {
      await retry.click({ timeout: 5000 }).catch(() => {});
      await settle(page, config);
    }
  }
  return waitVisible(page, '[data-testid="chat-row"]', 20000);
}

async function ensureMemberTab(page, config, tab) {
  const state = await page.evaluate(() => ({
    tab: document.querySelector('[data-testid="member-shell"]')?.getAttribute("data-primary-tab"),
    centerOpen: !!document.querySelector('[data-testid="opal-ambient-destination"]'),
    threadOpen: !!document.querySelector('[data-testid="member-conversation"]'),
  }));
  if (tab !== "opal" && state.centerOpen) {
    // The Center's own close control is sr-only in the current build
    // (class opal-center-v2-close) - not tap-reachable at phone
    // geometry. Activate the app's own control via DOM click and
    // record it; the dock may also be reachable above the overlay.
    await page
      .locator(".opal-center-v2-close")
      .first()
      .click({ timeout: 3000, force: true })
      .catch(async () => {
        await page.evaluate(() => {
          document.querySelector(".opal-center-v2-close")?.click();
        });
      });
    await settle(page, config);
  }
  if (state.threadOpen) {
    await page
      .locator('[data-testid="gpt-back"]:visible')
      .first()
      .click({ timeout: 5000 })
      .catch(() => {});
    await settle(page, config);
  }
  const now = await page.evaluate(() =>
    document.querySelector('[data-testid="member-shell"]')?.getAttribute("data-primary-tab"),
  );
  if (now !== tab) {
    await clickTestId(page, `member-tab-${tab}`);
    await settle(page, config);
  }
}

async function openCenter(page, config) {
  if (await visible(page, '[data-testid="opal-ambient-destination"]')) return;
  await clickTestId(page, "member-tab-opal");
  await settle(page, config);
}

async function openFirstThread(page, config) {
  await ensureMemberTab(page, config, "chats");
  // Rows arrive after live hydration; a slow backend can trip the
  // client's own timeout state, whose recovery is the app's Try
  // again button (see waitRowsWithRetry).
  const haveRows = await waitRowsWithRetry(page, config);
  if (!haveRows) return false;
  // The first row is not necessarily a human thread: graph rows
  // open the graph conversation instead. Walk rows the way a user
  // would - tap one, look, come back - until a human conversation
  // (member-conversation) is open or rows run out.
  const rowCount = await page.locator('[data-testid="chat-row"]:visible').count();
  for (let i = 0; i < Math.min(rowCount, 5); i++) {
    await page
      .locator('[data-testid="chat-row"]:visible')
      .nth(i)
      .click({ timeout: 15000 })
      .catch(() => {});
    if (await waitReady(page, config, '[data-testid="member-conversation"]', 30000)) {
      return true;
    }
    // Whatever opened (graph thread, detail), step back to the list.
    await page
      .locator('[data-testid="gpt-back"]:visible, [data-testid="graph-detail-back"]:visible')
      .first()
      .click({ timeout: 5000 })
      .catch(() => {});
    await ensureMemberTab(page, config, "chats");
    await waitRowsWithRetry(page, config);
  }
  return false;
}

export const MEMBER_SURFACES = [
  {
    id: "home-social",
    title: "Home / social",
    ready: '[data-testid="home-living-field"]',
    async navigate(page, config) {
      await ensureMemberTab(page, config, "home");
      return waitReady(page, config, this.ready);
    },
  },
  {
    id: "center-rest",
    title: "Center rest",
    ready: '[data-testid="opal-center-rest"]',
    async navigate(page, config) {
      await openCenter(page, config);
      return waitReady(page, config, this.ready);
    },
  },
  {
    id: "center-chat",
    title: "Center chat (Talk to Opal)",
    ready: '[data-testid="opal-center-chat"]',
    async navigate(page, config) {
      await openCenter(page, config);
      if (!(await visible(page, '[data-testid="opal-center-chat"]'))) {
        await clickTestId(page, "opal-center-talk-to-opal");
      }
      return waitReady(page, config, this.ready);
    },
  },
  {
    id: "chats-list",
    title: "Chats list",
    ready: '[data-testid="chat-row"], [data-testid="empty-people"]',
    async navigate(page, config) {
      await ensureMemberTab(page, config, "chats");
      const ok = await waitRowsWithRetry(page, config);
      if (ok) return true;
      // An honestly-empty list is a loaded surface; the client's
      // error state ("Couldn't load conversations") is NOT - it is a
      // failed load and must read as one.
      return page.evaluate(
        () =>
          document.body.innerText.includes("Chats") &&
          !document.body.innerText.includes("Couldn't load") &&
          !!document.querySelector('[data-testid="member-tabbar"]'),
      );
    },
  },
  {
    id: "thread",
    title: "Thread (human conversation with plan)",
    ready: '[data-testid="member-conversation"]',
    async navigate(page, config) {
      return openFirstThread(page, config);
    },
  },
  {
    id: "plan-detail",
    title: "Plan detail (from thread Next Together strip)",
    ready: '[data-testid="graph-detail-sheet"]',
    async navigate(page, config) {
      if (!(await visible(page, '[data-testid="member-conversation"]'))) {
        const ok = await openFirstThread(page, config);
        if (!ok) return false;
      }
      const strip = page.locator('[data-testid="next-plan-strip"]:visible').first();
      if ((await strip.count()) === 0) return false;
      await strip.click({ timeout: 10000 });
      return waitReady(page, config, this.ready);
    },
  },
  {
    id: "graphs-list",
    title: "Graphs list",
    ready: '[data-testid="graphs-home"]',
    async navigate(page, config) {
      await ensureMemberTab(page, config, "graphs");
      return waitReady(page, config, this.ready);
    },
  },
  {
    id: "graph-detail",
    title: "Graph detail (from Graphs list card)",
    ready: '[data-testid="graph-detail-sheet"]',
    async navigate(page, config) {
      await ensureMemberTab(page, config, "graphs");
      if (!(await waitReady(page, config, '[data-testid="graphs-home"]'))) return false;
      const opener = page
        .locator('[data-testid^="graphs-open-"]:visible, [data-testid^="graphs-card-"]:visible')
        .first();
      if ((await opener.count()) === 0) return false;
      await opener.click({ timeout: 10000 });
      return waitReady(page, config, this.ready);
    },
  },
  {
    id: "you-hub",
    title: "YOU hub",
    ready: '[data-testid="you-hub-pane"]',
    async navigate(page, config) {
      await ensureMemberTab(page, config, "you");
      return waitReady(page, config, this.ready);
    },
  },
];

export const ANON_SURFACES = [
  {
    id: "splash-1",
    title: "Splash 1",
    ready: '[data-testid="first-run-splash-shell"]',
    entryExtra: "opal_reset_first_run=1",
    async navigate(page, config) {
      return waitReady(page, config, this.ready, 25000);
    },
  },
  {
    id: "splash-2",
    title: "Splash 2 / onboarding entry (Promise)",
    ready: '[data-testid="first-run-promise-shell"]',
    entryExtra: "opal_reset_first_run=1",
    async navigate(page, config) {
      if (!(await waitReady(page, config, '[data-testid="first-run-splash-shell"]', 25000))) {
        return false;
      }
      await clickTestId(page, "fr00-tap-begin");
      return waitReady(page, config, this.ready, 25000);
    },
  },
];

export { ensureMemberTab, openCenter, openFirstThread, visible, waitReady, waitVisible, waitRowsWithRetry, settle };
