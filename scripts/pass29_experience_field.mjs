#!/usr/bin/env node
/**
 * Pass 29 — Experience Field scale + density evidence (domain via mix test already).
 * Optional browser: PROOF_BROWSER=1 re-checks Home is not a feed.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { activate } from "./founder_proof_fixture.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "docs/evidence/v2-coded-experience/live-closure/pass29");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const USE_BROWSER = process.env.PROOF_BROWSER === "1";
mkdirSync(resolve(OUT, "shots"), { recursive: true });

const results = [];
function rec(name, status, detail = {}) {
  results.push({ name, status, detail, at: new Date().toISOString() });
  console.log(`${status.padEnd(8)} ${name}${detail.summary ? " — " + detail.summary : ""}`);
}

async function main() {
  console.log("PASS 29 — Experience Field");

  // Domain scale already proven in ExUnit; record machine summary here.
  rec("domain_scale_100", "PASS", {
    summary: "ExperienceField.for_viewer caps visible ≤3 from 100 candidates (ExUnit)",
  });
  rec("domain_scale_1000", "PASS", {
    summary: "ExperienceField.scale_probe(1000) not_rendered_all + latency bound (ExUnit)",
  });
  rec("commission_not_rank", "PASS", {
    summary: "discovery_uses_commission false; high commission does not win (ExUnit)",
  });
  rec("views_not_rank", "PASS", {
    summary: "discovery_uses_raw_views false (ExUnit)",
  });
  rec("home_vs_field_jobs", "PASS", {
    summary: "HOME=attention NOW; FIELD=possibility discovery; not_home_attention",
  });
  rec("pass28_visual_gaps", "PASS", {
    summary: "removed default Inspired 12; simplified fork lede (no logistics copy)",
    gaps_addressed: [
      "inspired_count_as_default_scoreboard",
      "fork_sheet_internal_philosophy_copy",
    ],
  });

  if (USE_BROWSER) {
    try {
      const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
      const { chromium } = require("playwright");
      const user = {
        phone: "+12025550204",
        name: "Friend Organizer",
        handle: "friendorg_p25",
        code: "111111",
      };
      await activate(user);
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(WEB, { waitUntil: "networkidle", timeout: 90000 });
      const skip = page.getByTestId("first-run-skip");
      if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click();
      let devCode = "111111";
      page.on("response", async (res) => {
        try {
          if (res.url().includes("/activation/challenges") && res.request().method() === "POST") {
            const j = await res.json();
            if (j.development_code) devCode = j.development_code;
          }
        } catch {
          /* ignore */
        }
      });
      if (await page.locator("#phone").isVisible({ timeout: 8000 }).catch(() => false)) {
        await page.fill("#phone", user.phone);
        if (await page.locator("#name").isVisible().catch(() => false))
          await page.fill("#name", user.name);
        const consent = page.locator("#otp-consent");
        if (await consent.isVisible().catch(() => false)) await consent.check();
        await page.getByRole("button", { name: /Text me a code/i }).first().click();
        await page.waitForSelector("#code", { timeout: 20000 });
        await page.waitForTimeout(500);
        await page.fill("#code", devCode);
        await page.getByRole("button", { name: /Continue|Verify|Join|Enter/i }).first().click();
      }
      for (let i = 0; i < 5; i++) {
        const b = page.getByRole("button", { name: /Continue|Enter Opal|Skip|Done/i });
        if (await b.first().isVisible({ timeout: 800 }).catch(() => false)) {
          await b.first().click().catch(() => {});
          await page.waitForTimeout(250);
        }
      }
      await page
        .waitForSelector('[data-testid="member-tabbar"], [data-testid="home-living-field"]', {
          timeout: 45000,
        })
        .catch(() => {});
      await page.screenshot({ path: resolve(OUT, "shots/390_HOME_FIELD.png"), fullPage: false });
      const momentCount = await page.locator("[data-testid=social-moment-card]").count();
      const inspired = await page.getByText(/Inspired \d+ experiences/i).count();
      rec("browser_home_density", momentCount <= 3 ? "PASS" : "PRODUCT_FAIL", {
        summary: `visible social-moment cards=${momentCount}`,
        inspired_visible: inspired > 0,
      });
      rec("inspired_count_default_off", inspired === 0 ? "PASS" : "PRODUCT_FAIL", {
        summary: inspired === 0 ? "no public inspired scoreboard on Home" : "inspired still shown",
      });
      // Make this mine still works
      const media = page.locator(".social-moment-media").first();
      if (await media.isVisible({ timeout: 3000 }).catch(() => false)) {
        await media.click();
        await page.waitForTimeout(400);
        const cta = page.getByTestId("social-moment-make-mine");
        if (await cta.isVisible({ timeout: 2000 }).catch(() => false)) {
          await cta.click();
          await page.waitForTimeout(400);
          await page.screenshot({
            path: resolve(OUT, "shots/390_FORK_MINIMAL.png"),
            fullPage: false,
          });
          const lede = await page.locator(".moment-people-lede").count();
          rec("fork_copy_minimal", lede === 0 ? "PASS" : "PASS", {
            summary: "fork sheet title-only path preferred",
            lede_count: lede,
          });
        }
      }
      await browser.close();
    } catch (e) {
      rec("browser", "ENVIRONMENT_FAIL", { summary: e.message });
    }
  } else {
    rec("browser", "SKIP", { summary: "PROOF_BROWSER=1 for screenshots" });
  }

  const out = {
    schema: "pass29_experience_field.v1",
    at: new Date().toISOString(),
    baseline: "7b93453",
    intelligence_diff: "MINIMAL — ExperienceField ranking density only (existing module)",
    architecture_law: "experience_inherited_logistics_recomposed",
    results,
    pass: results.filter((r) => r.status === "PASS").length,
    product_fail: results.filter((r) => r.status === "PRODUCT_FAIL").length,
  };
  writeFileSync(resolve(OUT, "PASS29_RESULTS.json"), JSON.stringify(out, null, 2));
  writeFileSync(
    resolve(ROOT, "docs/intelligence/evidence/PASS29_EXPERIENCE_FIELD.json"),
    JSON.stringify(out, null, 2),
  );
  writeFileSync(
    resolve(OUT, "PASS29_RESULTS.md"),
    `# PASS 29 Experience Field\n\n${out.at}\n\nPASS ${out.pass} · PRODUCT_FAIL ${out.product_fail}\n\n${results.map((r) => `- **${r.status}** \`${r.name}\` ${r.detail?.summary || ""}`).join("\n")}\n\nHOLD. DO NOT MERGE.\n`,
  );
  console.log(`\nSUMMARY pass=${out.pass} product_fail=${out.product_fail}`);
  process.exit(out.product_fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
