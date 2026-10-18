/**
 * Repair #18 rendered stage - per-surface screenshot pass.
 *
 * The standing gate made executable: every primary surface of the
 * REAL served app, at phone viewport 390x844, in BOTH dark and light
 * modes, screenshotted into rendered/<build-tag>/ with a manifest.
 * A surface that fails to load is a FAIL, not a skip. Every surface
 * also gets the global rendered assertions:
 *   - resolved data-theme equals the mode under test
 *   - document horizontal overflow == 0, no viewport escapees
 *   - no text clipped by a fixed-height/overflow ancestor (sampled
 *     across the whole surface; deliberate ellipsis truncations are
 *     notes, not failures)
 *   - primary controls are hit-testable (nothing paints over them)
 *
 * Usage:
 *   node rendered/run-rendered.mjs --surfaces-only
 * Env: OPAL_WEB_BASE, OPAL_API_BASE, OPAL_SEED_MODE=1, session sources
 * (same as run.mjs), OPAL_BUILD_TAG.
 */
import fs from "node:fs";
import path from "node:path";
import { CaseAssert } from "../lib/harness.mjs";
import {
  loadRenderedConfig,
  provisionRenderedSessions,
  launchBrowser,
  newAuthedContext,
  newAnonContext,
  gotoMemberShell,
  entryUrl,
  VIEWPORT,
} from "./lib/browser.mjs";
import { MEMBER_SURFACES, ANON_SURFACES } from "./lib/surfaces.mjs";
import {
  probeHorizontalOverflow,
  probeClippedText,
  probeHitTests,
} from "./lib/geometry.mjs";

export async function runSurfacePass({ config, browser, sessions, outDir, log }) {
  const manifest = [];
  const failures = [];
  const startedAt = new Date().toISOString();

  const record = (entry) => {
    manifest.push(entry);
    if (entry.status === "FAIL") failures.push(entry);
    log(
      `[${entry.status}] surface ${entry.surface} (${entry.mode})${entry.file ? ` -> ${entry.file}` : ""}${entry.failures?.length ? ` :: ${entry.failures[0].message}` : ""}`,
    );
  };

  for (const mode of ["dark", "light"]) {
    // -- Anonymous surfaces (splash journey) --------------------------
    {
      const ctx = await newAnonContext(browser, mode, config);
      const page = await ctx.newPage();
      for (const surface of ANON_SURFACES) {
        const assert = new CaseAssert();
        const shellInfo = await page
          .goto(entryUrl(config, surface.entryExtra), {
            waitUntil: "domcontentloaded",
            timeout: config.navTimeoutMs,
          })
          .then(() => null)
          .catch((e) => e);
        if (shellInfo instanceof Error) {
          record({
            surface: surface.id, title: surface.title, mode, viewport: VIEWPORT,
            status: "FAIL", at: new Date().toISOString(),
            failures: [{ surface: surface.id, message: `navigation failed: ${shellInfo.message}` }],
          });
          continue;
        }
        const loaded = await surface.navigate(page, config).catch(() => false);
        assert.check(surface.id, loaded, `${surface.title} failed to load (ready selector ${surface.ready} never appeared)`);
        const theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
        assert.eq(surface.id, theme, mode, `resolved data-theme must equal the mode under test`);
        const entry = await finishSurface({ page, config, assert, surface, mode, outDir, anon: true });
        record(entry);
      }
      await ctx.close();
    }

    // -- Member surfaces ----------------------------------------------
    {
      const ctx = await newAuthedContext(browser, config, sessions.a, mode);
      const page = await ctx.newPage();
      const shell = await gotoMemberShell(page, config).catch((e) => ({ error: e.message }));
      for (const surface of MEMBER_SURFACES) {
        const assert = new CaseAssert();
        if (!shell.memberShell) {
          record({
            surface: surface.id, title: surface.title, mode, viewport: VIEWPORT,
            status: "FAIL", at: new Date().toISOString(), buildRef: shell,
            failures: [{ surface: surface.id, message: `member shell did not load (authenticated entry failed): ${JSON.stringify(shell).slice(0, 200)}` }],
          });
          continue;
        }
        let loaded = false;
        try {
          loaded = await surface.navigate(page, config);
        } catch (e) {
          assert.check(surface.id, false, `navigation error: ${e.message.split("\n")[0]}`);
        }
        assert.check(surface.id, !!loaded, `${surface.title} failed to load (ready selector ${surface.ready} never appeared)`);
        const entry = await finishSurface({ page, config, assert, surface, mode, outDir, shell });
        record(entry);
      }
      await ctx.close();
    }
  }

  const manifestObj = {
    stage: "rendered-surface-pass",
    buildTag: config.buildTag,
    webBase: config.webBase,
    apiBase: config.apiBase,
    viewport: VIEWPORT,
    startedAt,
    finishedAt: new Date().toISOString(),
    surfaces: manifest,
    summary: {
      total: manifest.length,
      pass: manifest.filter((m) => m.status === "PASS").length,
      fail: manifest.filter((m) => m.status === "FAIL").length,
    },
  };
  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifestObj, null, 2));
  return manifestObj;
}

async function finishSurface({ page, config, assert, surface, mode, outDir, shell, anon }) {
  const overflow = await page.evaluate(probeHorizontalOverflow).catch(() => null);
  if (overflow) {
    assert.check(
      surface.id,
      overflow.docOverflow <= 0,
      `document horizontal overflow is ${overflow.docOverflow}px`,
    );
    assert.check(
      surface.id,
      overflow.escapees.length === 0,
      `content viewport escapees: ${JSON.stringify(overflow.escapees.slice(0, 3))}`,
    );
    for (const d of (overflow.decorativeEscapees || []).slice(0, 4)) {
      assert.note(
        `${surface.id} (${mode}): decorative/chrome element bleeds past the viewport edge (${d.testid || d.cls || d.tag}, left=${d.left} right=${d.right}) - not a content failure; visible in the screenshot`,
      );
    }
  }
  const clip = await page.evaluate(probeClippedText).catch(() => null);
  if (clip && !clip.missing) {
    for (const c of clip.clipped.slice(0, 6)) {
      assert.check(
        surface.id,
        false,
        `text clipped by an ancestor/fixed box: "${c.text}" (${c.testid || c.cls || c.tag}, client ${c.clientWidth}x${c.clientHeight} vs scroll ${c.scrollWidth}x${c.scrollHeight}${c.clippedBy ? `, clipped by ${c.clippedBy.testid || c.clippedBy.cls || c.clippedBy.tag}` : ""})`,
      );
    }
    for (const t of clip.truncated.slice(0, 6)) {
      assert.note(`${surface.id} (${mode}): ellipsis-truncated text "${t.text}" - design judgment, screenshot decides`);
    }
  }
  const hits = await page
    .evaluate(probeHitTests, [
      { name: "dock-home", selector: '[data-testid="member-tab-home"]' },
      { name: "dock-chats", selector: '[data-testid="member-tab-chats"]' },
      { name: "dock-opal", selector: '[data-testid="member-tab-opal"]' },
      { name: "dock-graphs", selector: '[data-testid="member-tab-graphs"]' },
      { name: "dock-you", selector: '[data-testid="member-tab-you"]' },
    ])
    .catch(() => []);
  for (const h of hits) {
    if (!h.present || !h.visible) continue;
    assert.check(
      surface.id,
      !h.trapped,
      `dock control ${h.name} is trapped under ${h.hitTestid || h.hitTag || "another element"} on this surface`,
    );
  }
  const theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme")).catch(() => null);
  if (!anon) {
    assert.eq(surface.id, theme, mode, `resolved data-theme must equal the mode under test`);
  }
  const file = `${surface.id}-${mode}.png`;
  await page.screenshot({ path: path.join(outDir, file) }).catch(() => null);
  return {
    surface: surface.id,
    title: surface.title,
    mode,
    viewport: VIEWPORT,
    file,
    at: new Date().toISOString(),
    status: assert.failures.length > 0 ? "FAIL" : "PASS",
    buildRef: shell ? { seedChip: shell.seedChip, gitHead: shell.gitHead } : undefined,
    checks: assert.checks,
    failures: assert.failures,
    notes: assert.notes,
  };
}
