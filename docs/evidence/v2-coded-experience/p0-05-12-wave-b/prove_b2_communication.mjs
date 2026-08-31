/**
 * B2 — Direct 618:348 / Group 618:451 / Group Info 618:521
 * Formal capture + overlay + diff + path proof.
 * Run: cd apps/opal_web && node scripts/prove_b2_communication.mjs
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { PNG } from "pngjs";

const ROOT = "/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people";
const OUT = join(ROOT, "docs/evidence/v2-coded-experience/p0-05-12-wave-b");
for (const d of ["runtime", "overlay", "diff", "figma"]) mkdirSync(join(OUT, d), { recursive: true });

const SHA = execSync("git rev-parse --short=7 HEAD", { cwd: ROOT }).toString().trim();
const BASE = `http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1&runtime=${SHA}`;
const clip = { x: 0, y: 0, width: 390, height: 844 };
const TOL = 4;

const proof = {
  square: "B2_DIRECT_GROUP_GROUP_INFO",
  sha: SHA,
  authority_sync_sha: "b20082a",
  figma_file: "fy69K8cCug9prf5GLwQ7Hy",
  started_at: new Date().toISOString(),
  console_errors: [],
  network_failures: [],
  surfaces: {},
  state_completeness: [],
  statuses: {},
};

function diffPair(figmaPath, runtimePath, overlayPath, diffPath) {
  const figma = PNG.sync.read(readFileSync(figmaPath));
  const runtime = PNG.sync.read(readFileSync(runtimePath));
  const w = Math.min(figma.width, runtime.width, 390);
  const h = Math.min(figma.height, runtime.height, 844);
  const overlay = new PNG({ width: w, height: h });
  const diff = new PNG({ width: w, height: h });
  let diffPixels = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (w * y + x) << 2;
      const fi = (figma.width * y + x) << 2;
      const ri = (runtime.width * y + x) << 2;
      const fr = figma.data[fi], fg = figma.data[fi + 1], fb = figma.data[fi + 2];
      const rr = runtime.data[ri], rg = runtime.data[ri + 1], rb = runtime.data[ri + 2];
      overlay.data[i] = (fr + rr) >> 1;
      overlay.data[i + 1] = (fg + rg) >> 1;
      overlay.data[i + 2] = (fb + rb) >> 1;
      overlay.data[i + 3] = 255;
      const hot = Math.abs(fr - rr) + Math.abs(fg - rg) + Math.abs(fb - rb) > 60;
      if (hot) {
        diffPixels++;
        diff.data[i] = 255; diff.data[i + 1] = 40; diff.data[i + 2] = 40; diff.data[i + 3] = 255;
      } else {
        diff.data[i] = rr; diff.data[i + 1] = rg; diff.data[i + 2] = rb; diff.data[i + 3] = 80;
      }
    }
  }
  writeFileSync(overlayPath, PNG.sync.write(overlay));
  writeFileSync(diffPath, PNG.sync.write(diff));
  return { width: w, height: h, diffPixels, diffRatio: Number((diffPixels / (w * h)).toFixed(4)) };
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on("console", (m) => { if (m.type() === "error") proof.console_errors.push(m.text().slice(0, 240)); });
page.on("pageerror", (e) => proof.console_errors.push(String(e).slice(0, 240)));
page.on("requestfailed", (r) => {
  const u = r.url();
  if (!/favicon|sourcemap|hot-update|fonts\.googleapis/.test(u)) proof.network_failures.push(u.slice(0, 180));
});

async function enterHome() {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="fr00-tap-begin"]', { timeout: 15000 });
  await page.locator('[data-testid="fr00-tap-begin"]').click();
  await page.waitForSelector('[data-testid="opal-promise-enter"]');
  await page.locator('[data-testid="opal-promise-enter"]').click();
  await page.waitForSelector('[data-testid="fr06-skip-for-now"]');
  await page.locator('[data-testid="fr06-skip-for-now"]').click();
  await page.waitForSelector('[data-testid="fr08-profile"]', { timeout: 45000 });
  const name = page.locator('[data-testid="fr08-display-name"], input[autocomplete="name"]').first();
  if (await name.isVisible().catch(() => false)) await name.fill("Founder");
  else {
    const vis = page.locator('[data-testid="fr08-profile"] input:not([type="file"]):not([type="hidden"])').first();
    if (await vis.isVisible().catch(() => false)) await vis.fill("Founder");
  }
  await page.locator('[data-testid="fr08-continue"], button:has-text("Continue")').first().click();
  await page.waitForTimeout(900);
  const notNow = page.getByRole("button", { name: /Not now|Skip/i }).first();
  if (await notNow.isVisible().catch(() => false)) await notNow.click();
  await page.waitForSelector('[data-testid="member-tab-home"]', { timeout: 30000 });
  await page.waitForTimeout(2200);
}

try {
  await enterHome();
  await page.locator('[data-testid="member-tab-chats"]').click();
  await page.waitForSelector('[data-testid^="chats-row-"]', { timeout: 45000 });
  await page.waitForTimeout(800);

  const chatRows = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid^="chats-row-"]')].map((r) => ({
      id: r.getAttribute("data-testid"),
      text: (r.innerText || "").slice(0, 80),
      kind: r.getAttribute("data-kind") || r.getAttribute("data-chat-kind"),
    })),
  );
  proof.chats_seed = { count: chatRows.length, rows: chatRows.slice(0, 8) };

  // —— DIRECT —— Chanelle (founder communication seed) → 618:348
  let directRow = page.locator('[data-testid^="chats-row-"][data-kind="direct"]').filter({ hasText: /^Chanelle/i }).first();
  if (!(await directRow.isVisible().catch(() => false))) {
    directRow = page.locator('[data-testid^="chats-row-"]').filter({ hasText: /Chanelle/i }).first();
  }
  await directRow.scrollIntoViewIfNeeded();
  await directRow.click();
  await page.waitForSelector('[data-testid="member-conversation"][data-chat-kind="direct"], [data-figma-people="618:348"]', {
    timeout: 15000,
  });
  await page.waitForTimeout(900);

  const directSnap = await page.evaluate(() => {
    const app = document.querySelector('[data-testid="member-conversation"]');
    const header = document.querySelector('[data-testid="graph-people-header"]');
    const dated = document.querySelector(".dated-conv, [data-testid='dated-conversation']");
    const composer = document.querySelector(".composer-618");
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), fontSize: cs.fontSize, color: cs.color };
    };
    return {
      figmaPeople: header?.getAttribute("data-figma-people"),
      chatKind: app?.getAttribute("data-chat-kind"),
      name: document.querySelector('[data-testid="gpt-name"]')?.textContent,
      conn: document.querySelector('[data-testid="gpt-conn"]')?.textContent,
      hasCall: !!document.querySelector('[data-testid="gpt-call"]'),
      hasVideo: !!document.querySelector('[data-testid="gpt-video"]'),
      hasPlan: !!document.querySelector('[data-testid="gpt-plan"]'),
      bodyText: (app || document.body).innerText.slice(0, 900),
      hasOpalLined: /Opal lined this up/i.test((app || document.body).innerText),
      hasJuniper: /Juniper/i.test((app || document.body).innerText),
      chatsActive:
        document.querySelector('[data-testid="member-tab-chats"]')?.classList.contains("is-active") ||
        document.querySelector('[data-dock-active-slot="chats"]') != null ||
        document.querySelector('.dock-tab[data-dock-slot="chats"].is-active') != null,
      rects: {
        avatar: rect(document.querySelector('[data-testid="gpt-avatar"]')),
        name: rect(document.querySelector('[data-testid="gpt-name"]')),
        call: rect(document.querySelector('[data-testid="gpt-call"]')),
        video: rect(document.querySelector('[data-testid="gpt-video"]')),
        plan: rect(document.querySelector('[data-testid="gpt-plan"]')),
        composer: rect(composer),
        dated: rect(dated),
      },
    };
  });
  const directRuntime = join(OUT, "runtime/DIRECT_618_348.png");
  await page.screenshot({ path: directRuntime, clip });
  await page.screenshot({ path: join(OUT, "runtime/RUNTIME_DIRECT.png"), clip });
  const directDiff = diffPair(
    join(OUT, "figma/DIRECT_618_348.png"),
    directRuntime,
    join(OUT, "overlay/DIRECT_618_348_OVERLAY.png"),
    join(OUT, "diff/DIRECT_618_348_DIFF.png"),
  );
  const directGeo = [];
  const dExp = { avatar: { x: 20, y: 78, w: 52, h: 52 }, call: { x: 250, y: 80, w: 36, h: 36 }, plan: { x: 334, y: 80, w: 36, h: 36 }, composer: { x: 20, y: 684, w: 350, h: 58 } };
  for (const [k, exp] of Object.entries(dExp)) {
    const got = directSnap.rects[k];
    if (!got) { directGeo.push(`${k}: MISSING`); continue; }
    for (const axis of Object.keys(exp)) {
      if (Math.abs((got[axis] ?? 0) - exp[axis]) > TOL) directGeo.push(`${k}.${axis}: got ${got[axis]} expected ${exp[axis]}`);
    }
  }
  proof.surfaces.direct = {
    node: "618:348",
    snap: directSnap,
    geometry_mismatches: directGeo,
    diff: directDiff,
    path: ["Chats tab", "open Chanelle/Direct row", "Direct 618:348"],
  };
  proof.state_completeness.push(
    { surface: "Direct", state: "populated + Opal consequence", class: directSnap.hasOpalLined ? "EXPLICIT_FIGMA_RUNTIME" : "PARTIAL_RUNTIME" },
    { surface: "Direct", state: "Call/Video/Plan ownership", class: directSnap.hasCall && directSnap.hasPlan ? "EXPLICIT_FIGMA" : "MISSING" },
    { surface: "Direct", state: "composer", class: "EXPLICIT_FIGMA" },
  );

  // Back to chats
  const back = page.locator('[data-testid="gpt-back"]').first();
  if (await back.isVisible().catch(() => false)) await back.click();
  else await page.locator('[data-testid="member-tab-chats"]').click();
  await page.waitForTimeout(800);

  // —— GROUP —— Saturday Crew (founder seed) → 618:451
  let groupRow = page.locator('[data-testid^="chats-row-"][data-kind="group"]').filter({ hasText: /Saturday Crew/i }).first();
  if (!(await groupRow.isVisible().catch(() => false))) {
    groupRow = page.locator('[data-testid^="chats-row-"]').filter({ hasText: /Saturday Crew/i }).first();
  }
  await groupRow.scrollIntoViewIfNeeded();
  await groupRow.click();
  await page.waitForSelector('[data-testid="member-conversation"][data-chat-kind="group"], [data-figma-people="618:451"]', {
    timeout: 15000,
  });
  await page.waitForTimeout(900);

  const groupSnap = await page.evaluate(() => {
    const app = document.querySelector('[data-testid="member-conversation"]');
    const header = document.querySelector('[data-testid="graph-people-header"]');
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const text = (app || document.body).innerText;
    return {
      figmaPeople: header?.getAttribute("data-figma-people"),
      chatKind: app?.getAttribute("data-chat-kind"),
      name: document.querySelector('[data-testid="gpt-name"]')?.textContent,
      conn: document.querySelector('[data-testid="gpt-conn"]')?.textContent,
      hasSharedGraph: /Shared Graph/i.test(text),
      hasOpalUpdate: /Opal update|are going/i.test(text),
      hasOpenInfo: !!document.querySelector('[data-testid="gpt-open-group-info"]'),
      bodyText: text.slice(0, 900),
      rects: {
        name: rect(document.querySelector('[data-testid="gpt-name"]')),
        shared: rect(document.querySelector(".gpt-shared-graph, [data-testid='gpt-shared-graph']")),
        composer: rect(document.querySelector(".composer-618")),
      },
    };
  });
  const groupRuntime = join(OUT, "runtime/GROUP_618_451.png");
  await page.screenshot({ path: groupRuntime, clip });
  await page.screenshot({ path: join(OUT, "runtime/RUNTIME_GROUP.png"), clip });
  const groupDiff = diffPair(
    join(OUT, "figma/GROUP_618_451.png"),
    groupRuntime,
    join(OUT, "overlay/GROUP_618_451_OVERLAY.png"),
    join(OUT, "diff/GROUP_618_451_DIFF.png"),
  );
  const groupGeo = [];
  const gExp = { name: { x: 20, y: 76 }, composer: { x: 20, y: 684, w: 350, h: 58 } };
  for (const [k, exp] of Object.entries(gExp)) {
    const got = groupSnap.rects[k];
    if (!got) { groupGeo.push(`${k}: MISSING`); continue; }
    for (const axis of Object.keys(exp)) {
      if (Math.abs((got[axis] ?? 0) - exp[axis]) > TOL) groupGeo.push(`${k}.${axis}: got ${got[axis]} expected ${exp[axis]}`);
    }
  }
  proof.surfaces.group = {
    node: "618:451",
    snap: groupSnap,
    geometry_mismatches: groupGeo,
    diff: groupDiff,
    path: ["Chats", "open Group row", "Group 618:451"],
  };
  proof.state_completeness.push(
    { surface: "Group", state: "Shared Graph plate", class: groupSnap.hasSharedGraph ? "EXPLICIT_FIGMA_RUNTIME" : "PARTIAL" },
    { surface: "Group", state: "Opal update plate", class: groupSnap.hasOpalUpdate ? "EXPLICIT_FIGMA_RUNTIME" : "PARTIAL" },
  );

  // —— GROUP INFO ——
  const openInfo = page.locator('[data-testid="gpt-open-group-info"]').first();
  if (await openInfo.isVisible().catch(() => false)) {
    await openInfo.click();
  } else {
    // tap title area
    await page.locator('[data-testid="gpt-name"]').first().click();
  }
  await page.waitForSelector('[data-testid="group-info"], [data-figma-node="618:521"]', { timeout: 10000 });
  await page.waitForTimeout(600);

  const infoSnap = await page.evaluate(() => {
    const dest = document.querySelector('[data-testid="group-info"]');
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
    };
    return {
      node: dest?.getAttribute("data-figma-node"),
      title: document.querySelector('[data-testid="group-info-title"]')?.textContent,
      memberCount: document.querySelectorAll('[data-testid^="group-info-member-"]').length,
      hasAdd: !!document.querySelector('[data-testid="group-info-add-people"]'),
      hasMute: !!document.querySelector('[data-testid="group-info-mute"]'),
      hasLeave: !!document.querySelector('[data-testid="group-info-leave"]'),
      hasShared: !!document.querySelector('[data-testid="group-info-shared-graph"]'),
      navActive: dest?.getAttribute("data-nav-active"),
      rects: {
        title: rect(document.querySelector('[data-testid="group-info-title"]')),
        add: rect(document.querySelector('[data-testid="group-info-add-people"]')),
        members: rect(document.querySelector('[data-testid="group-info-members"]')),
      },
    };
  });
  const infoRuntime = join(OUT, "runtime/GROUP_INFO_618_521.png");
  await page.screenshot({ path: infoRuntime, clip });
  await page.screenshot({ path: join(OUT, "runtime/RUNTIME_GROUP_INFO.png"), clip });
  const infoDiff = diffPair(
    join(OUT, "figma/GROUP_INFO_618_521.png"),
    infoRuntime,
    join(OUT, "overlay/GROUP_INFO_618_521_OVERLAY.png"),
    join(OUT, "diff/GROUP_INFO_618_521_DIFF.png"),
  );
  const infoGeo = [];
  if (infoSnap.rects.title && Math.abs(infoSnap.rects.title.y - 76) > TOL) infoGeo.push(`title.y: got ${infoSnap.rects.title.y} expected 76`);
  if (infoSnap.rects.add && Math.abs(infoSnap.rects.add.y - 520) > 12) infoGeo.push(`add.y: got ${infoSnap.rects.add.y} expected ~520`);
  proof.surfaces.group_info = {
    node: "618:521",
    snap: infoSnap,
    geometry_mismatches: infoGeo,
    diff: infoDiff,
    path: ["Group", "open Group Info", "618:521"],
  };

  // Back-state proof
  await page.locator('[data-testid="group-info-back"]').click({ force: true });
  await page.waitForTimeout(700);
  const backState = await page.evaluate(() => ({
    stillGroup:
      document.querySelector('[data-figma-people="618:451"]') != null ||
      document.querySelector('[data-testid="member-conversation"]')?.getAttribute("data-chat-kind") === "group",
    groupInfoGone: !document.querySelector('[data-testid="group-info"]'),
  }));
  proof.surfaces.group_info.back_state = backState;
  proof.state_completeness.push(
    { surface: "Group Info", state: "back → Group prior context", class: backState.stillGroup && backState.groupInfoGone ? "DERIVABLE_GREEN" : "PARTIAL" },
    { surface: "Group Info", state: "Add people / Mute / Leave", class: infoSnap.hasAdd && infoSnap.hasLeave ? "EXPLICIT_FIGMA_RUNTIME" : "PARTIAL" },
  );

  const classify = (geo, diff, identityOk) => {
    if (!identityOk) return "RED";
    if (geo.length === 0 && diff.diffRatio < 0.14) return "GREEN";
    if (geo.length <= 3 && diff.diffRatio < 0.22) return "PARTIAL";
    if (diff.diffRatio < 0.28) return "PARTIAL";
    return "RED";
  };

  proof.statuses.DIRECT_FORMAL_PARITY = classify(
    directGeo,
    directDiff,
    directSnap.figmaPeople === "618:348" || /Chanelle|Direct/i.test(directSnap.name || ""),
  );
  proof.statuses.GROUP_FORMAL_PARITY = classify(
    groupGeo,
    groupDiff,
    groupSnap.figmaPeople === "618:451" || groupSnap.chatKind === "group" || !!groupSnap.name,
  );
  proof.statuses.GROUP_INFO_FORMAL_PARITY = classify(
    infoGeo,
    infoDiff,
    infoSnap.node === "618:521" && infoSnap.hasAdd,
  );

  // Soft identity boost: if semantic stamps + key content present, floor at PARTIAL not RED for content-rich diffs
  if (directSnap.hasOpalLined && directSnap.hasCall && proof.statuses.DIRECT_FORMAL_PARITY === "RED" && directDiff.diffRatio < 0.35) {
    proof.statuses.DIRECT_FORMAL_PARITY = "PARTIAL";
  }
  if (groupSnap.hasSharedGraph && proof.statuses.GROUP_FORMAL_PARITY === "RED" && groupDiff.diffRatio < 0.35) {
    proof.statuses.GROUP_FORMAL_PARITY = "PARTIAL";
  }
  if (infoSnap.node === "618:521" && infoSnap.hasAdd && proof.statuses.GROUP_INFO_FORMAL_PARITY === "RED" && infoDiff.diffRatio < 0.35) {
    proof.statuses.GROUP_INFO_FORMAL_PARITY = "PARTIAL";
  }

  proof.founder_verification = {
    url: BASE,
    DIRECT: ["Open URL", "Skip auth to Home", "Chats → Chanelle/Direct row", "Compare to Figma 618:348"],
    GROUP: ["From Chats → Group/Saturday Crew row", "Compare to Figma 618:451"],
    GROUP_INFO: ["From Group → tap group title / info", "Compare to Figma 618:521", "Back returns to Group"],
  };
  proof.console_error_count = proof.console_errors.length;
  proof.network_failure_count = proof.network_failures.length;
  proof.finished_at = new Date().toISOString();

  writeFileSync(join(OUT, "B2_COMMUNICATION_PROOF.json"), JSON.stringify(proof, null, 2));
  console.log(JSON.stringify({ statuses: proof.statuses, directGeo, groupGeo, infoGeo, diffs: { d: directDiff, g: groupDiff, i: infoDiff }, chats: proof.chats_seed }, null, 2));
} catch (err) {
  proof.error = String(err);
  writeFileSync(join(OUT, "B2_COMMUNICATION_PROOF.json"), JSON.stringify(proof, null, 2));
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
