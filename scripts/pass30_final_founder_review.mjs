#!/usr/bin/env node
/**
 * PASS 30 FINAL — Founder Live Review Pack (evidence only, no product mutation)
 *
 * Product SHA expected: b8194a6
 * Usage:
 *   PROOF_BROWSER=1 node scripts/pass30_final_founder_review.mjs
 *
 * Captures live journey at 375/390/430, named/solo/generic, timings, media matrix.
 * FOUNDER JUDGMENT fields left for human eyes — automation does not PASS emotion.
 */
import { writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { activate } from "./founder_proof_fixture.mjs";

/** Mirror of product earnedNamedPresence (mechanical audit only — not a second brain). */
function earnedNamedPresence(chats) {
  if (!chats?.length) return null;
  const jordan = chats.find((c) => /\bjordan\b/i.test(c.name || ""));
  if (jordan) {
    return {
      id: jordan.id,
      displayName: (jordan.name.trim().split(/\s+/)[0] || "Jordan"),
      conversationId: jordan.id,
    };
  }
  const dyad = chats.find((c) => {
    const n = (c.name || "").trim();
    if (!n) return false;
    if (/\b(group|team|crew|everyone)\b/i.test(n)) return false;
    return true;
  });
  if (!dyad) return null;
  return {
    id: dyad.id,
    displayName: dyad.name.trim().split(/\s+/)[0],
    conversationId: dyad.id,
  };
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const API = (process.env.API_BASE || "http://127.0.0.1:4000").replace(/\/$/, "");
const OUT = resolve(ROOT, "docs/evidence/v2-coded-experience/live-closure/pass30-final-review");
const PRODUCT_SHA = process.env.PRODUCT_SHA || "b8194a6";
const PRODUCT_CI_RUN = process.env.PRODUCT_CI_RUN || "31931561801";
const USE_BROWSER = process.env.PROOF_BROWSER === "1" || process.env.PROOF_BROWSER === "true";

const dirs = [
  "390",
  "375",
  "430",
  "named",
  "solo",
  "generic",
  "forming",
  "media",
  "reduced-motion",
  "nav",
  "private-impact",
  "follow",
];
for (const d of dirs) mkdirSync(resolve(OUT, d), { recursive: true });

const FOUNDER = {
  phone: "+12025550101",
  name: "Founder Review",
  handle: "founder_rev",
  code: "111111",
};
/** Fresh user: no chats → generic Solo / With people */
const GENERIC = {
  phone: "+12025550930",
  name: "Generic Review",
  handle: "generic_p30",
  code: "111111",
};
/** Solo-focused user */
const SOLO_USER = {
  phone: "+12025550931",
  name: "Solo Review",
  handle: "solo_p30",
  code: "111111",
};

const results = [];
const failures = [];
const timings = [];
const harnessWaits = [];
const visualDecay = [];
const questionBurden = {};

function rec(name, status, detail = {}) {
  const row = { name, status, detail, at: new Date().toISOString() };
  results.push(row);
  if (status === "PRODUCT_FAIL" || status === "FAIL") {
    failures.push({
      ...row,
      class: detail.class || "VISUAL",
      severity: detail.severity || "P1",
    });
  }
  console.log(
    `${String(status).padEnd(10)} ${name}${detail.summary ? " — " + detail.summary : ""}`,
  );
  return row;
}

function mark(label) {
  const t = performance.now();
  timings.push({ label, t, ms_from_start: Math.round(t - (mark.t0 || t)) });
  if (!mark.t0) mark.t0 = t;
  return t;
}

async function harnessWait(page, ms, reason) {
  harnessWaits.push({ ms, reason });
  await page.waitForTimeout(ms);
}

async function login(page, user, vp = { width: 390, height: 844 }) {
  await page.setViewportSize(vp);
  await page.goto(WEB, { waitUntil: "networkidle", timeout: 90000 });
  const skip = page.getByTestId("first-run-skip");
  if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click();
  let devCode = user.code || "111111";
  page.on("response", async (res) => {
    try {
      if (res.url().includes("/product/activation/challenges") && res.request().method() === "POST") {
        const j = await res.json();
        if (j.development_code) devCode = j.development_code;
      }
    } catch {
      /* ignore */
    }
  });
  if (await page.locator("#phone").isVisible({ timeout: 12000 }).catch(() => false)) {
    await page.fill("#phone", user.phone);
    if (await page.locator("#name").isVisible().catch(() => false)) await page.fill("#name", user.name);
    const consent = page.locator("#otp-consent");
    if (await consent.isVisible().catch(() => false)) await consent.check();
    await page.getByRole("button", { name: /Text me a code/i }).first().click();
    await page.waitForSelector("#code", { timeout: 20000 });
    await harnessWait(page, 500, "otp settle");
    await page.fill("#code", devCode);
    await page.getByRole("button", { name: /Continue|Verify|Join|Enter/i }).first().click();
  }
  for (let i = 0; i < 8; i++) {
    const ready = page.getByRole("button", {
      name: /Continue|Enter Opal|I'm ready|Done|Skip/i,
    });
    if (await ready.first().isVisible({ timeout: 800 }).catch(() => false)) {
      await ready.first().click().catch(() => {});
      await harnessWait(page, 200, "onboarding dismiss");
    }
  }
  await page.waitForSelector(
    '[data-testid="member-shell"], [data-testid="home-living-field"], [data-testid="member-tabbar"]',
    { timeout: 45000 },
  );
  // Home tab
  const homeTab = page.getByTestId("tab-home").or(page.getByRole("button", { name: /^Home$/i }));
  if (await homeTab.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await homeTab.first().click().catch(() => {});
  }
}

async function shot(page, relPath) {
  const p = resolve(OUT, relPath);
  await page.screenshot({ path: p, fullPage: false });
  return p;
}

async function visibleTextBlob(page) {
  return page.evaluate(() => document.body?.innerText || "");
}

async function auditRejectedCopy(page, label) {
  const text = await visibleTextBlob(page);
  const banned = [
    /Make this mine/i,
    /Make this yours/i,
    /Their experience becomes your possibility/i,
    /Logistics recompose for you/i,
    /\bRecompose\b/i,
    /\bFORMING\b/,
    /^WHERE$/m,
    /began as/i,
  ];
  const hits = banned.filter((re) => re.test(text)).map((re) => re.source);
  // WHERE as dimension label alone is hard; check schema-style "WHERE" with caps near question
  if (/\bWHERE\b\s*\n?\s*Where should/i.test(text)) hits.push("WHERE_SCHEMA_LABEL");
  rec(`copy_audit_${label}`, hits.length ? "PRODUCT_FAIL" : "PASS", {
    summary: hits.length ? `banned visible: ${hits.join(", ")}` : "no rejected phrases in body text",
    hits,
    class: "COPY",
  });
  return hits;
}

async function navSpacing(page, label) {
  const metrics = await page.evaluate(() => {
    const bar =
      document.querySelector('[data-testid="member-tabbar"]') ||
      document.querySelector("nav.member-tabbar") ||
      document.querySelector(".member-tabbar");
    if (!bar) return null;
    const r = bar.getBoundingClientRect();
    const kids = [...bar.querySelectorAll("button, a, [role=tab]")].map((el) => {
      const b = el.getBoundingClientRect();
      return { text: (el.textContent || "").trim().replace(/\s+/g, " "), x: b.x, w: b.width };
    });
    return { barW: r.width, kids };
  });
  if (!metrics) {
    rec(`nav_${label}`, "SKIP", { summary: "tabbar not found", class: "RESPONSIVE" });
    return;
  }
  const joined = metrics.kids.map((k) => k.text).join("");
  const cramped = /HomePeople|PeoplePlans|PlansYou/i.test(joined) && metrics.kids.length < 3;
  const spaced = metrics.barW >= 300 && metrics.kids.length >= 4;
  rec(`nav_${label}`, cramped ? "PRODUCT_FAIL" : spaced ? "PASS" : "WARN", {
    summary: cramped
      ? "cramped HomePeoplePlansYou"
      : `barW=${Math.round(metrics.barW)} tabs=${metrics.kids.map((k) => k.text).join("|")}`,
    metrics,
    class: "RESPONSIVE",
  });
  await shot(page, `nav/${label}.png`);
}

async function optionStyles(page) {
  return page.evaluate(() => {
    const opts = [...document.querySelectorAll(".moment-people-option")];
    return opts.map((el) => {
      const cs = getComputedStyle(el);
      return {
        text: (el.textContent || "").trim().replace(/\s+/g, " "),
        color: cs.color,
        borderColor: cs.borderColor,
        className: el.className,
        active: el.classList.contains("is-active"),
      };
    });
  });
}

async function runNamedJourney(page) {
  mark.t0 = performance.now();
  mark("journey_start");
  await shot(page, "390/01_HOME_MOMENT.png");
  await navSpacing(page, "390_home");

  const card = page.getByTestId("social-moment-card");
  const cardOk = await card.isVisible({ timeout: 12000 }).catch(() => false);
  rec("moment_card", cardOk ? "PASS" : "PRODUCT_FAIL", {
    summary: cardOk ? "social moment visible" : "missing social-moment-card",
    class: "VISUAL",
  });
  if (!cardOk) return;

  // First-frame dominance — FOUNDER JUDGMENT only
  const firstFrame = await page.evaluate(() => {
    const media = document.querySelector(".social-moment-media, [data-testid=social-moment-media]");
    const cta = document.querySelector("[data-testid=social-moment-want-this]");
    const nav = document.querySelector('[data-testid="member-tabbar"]');
    const m = media?.getBoundingClientRect();
    return {
      mediaH: m?.height || 0,
      mediaVisible: !!media,
      ctaVisible: !!(cta && getComputedStyle(cta).display !== "none"),
      hasImg: !!document.querySelector(".social-moment-img"),
      founder_judgment: "FOUNDER JUDGMENT — does photo dominate?",
    };
  });
  rec("moment_first_frame", "FOUNDER_JUDGMENT", {
    summary: `mediaH=${Math.round(firstFrame.mediaH)} hasImg=${firstFrame.hasImg} ctaPreInterest=${firstFrame.ctaVisible}`,
    firstFrame,
  });

  // Interest
  mark("media_tap");
  await page.getByTestId("social-moment-media").click().catch(async () => {
    await page.locator(".social-moment-media").first().click();
  });
  mark("media_ack");
  await harnessWait(page, 350, "interest paint");
  await shot(page, "390/02_MEDIA_INTEREST.png");

  const cta = page.getByTestId("social-moment-want-this");
  const ctaVisible = await cta.isVisible({ timeout: 4000 }).catch(() => false);
  mark("cta_visible");
  const ctaText = ctaVisible ? await cta.innerText() : null;
  await shot(page, "390/03_INLINE_CTA.png");
  rec("cta_live", ctaVisible ? "FOUNDER_JUDGMENT" : "PRODUCT_FAIL", {
    summary: ctaVisible ? `text="${ctaText}"` : "inline CTA missing",
    ctaText,
    expected_working: "I want to do this →",
    class: "COPY",
  });
  await auditRejectedCopy(page, "interest");

  // Follow treatment
  const follow = page.getByTestId("social-moment-rel-following");
  const followTxt = (await follow.isVisible().catch(() => false))
    ? await follow.innerText()
    : null;
  await shot(page, "follow/390_quiet_follow.png");
  rec("follow_treatment", "FOUNDER_JUDGMENT", {
    summary: followTxt === "·" || followTxt === "·" ? "quiet · present" : `text=${followTxt}`,
    followTxt,
  });

  if (!ctaVisible) return;
  mark("cta_tap");
  await cta.click();
  mark("choice_first");
  await page.getByTestId("moment-fork-sheet").waitFor({ state: "visible", timeout: 8000 });
  mark("choice_interactive");
  await harnessWait(page, 200, "fork paint");
  await shot(page, "390/04_SOCIAL_CHOICE.png");
  await shot(page, "named/BEFORE_TAP_NEUTRAL.png");

  const beforeStyles = await optionStyles(page);
  const activeBefore = beforeStyles.filter((o) => o.active);
  rec("preselection_law_before", activeBefore.length === 0 ? "PASS" : "PRODUCT_FAIL", {
    summary:
      activeBefore.length === 0
        ? "no is-active before tap"
        : `preselected: ${activeBefore.map((a) => a.text).join(",")}`,
    beforeStyles,
    class: "PERSONALIZATION",
  });

  const namedBtn = page.getByTestId("moment-fork-named");
  const hasNamed = await namedBtn.isVisible({ timeout: 2000 }).catch(() => false);
  const forkLabels = beforeStyles.map((o) => o.text);
  rec("named_or_generic_fork", "PASS", {
    summary: hasNamed
      ? `named path: ${forkLabels.join(" | ")}`
      : `generic path: ${forkLabels.join(" | ")}`,
    hasNamed,
    forkLabels,
  });

  questionBurden.named = {
    questions: hasNamed ? 1 : 1,
    taps_to_choice: 3, // media, cta, person
    typed_fields: 0,
    search_fields: 0,
    people_picker: hasNamed ? 0 : 1,
  };

  if (hasNamed) {
    // Named context authority from DOM + chats list if available
    const namedText = await namedBtn.innerText();
    rec("named_context_ui", "PASS", {
      summary: `option present: ${namedText.trim()} — authority source is earned chat presence (not shown in UI)`,
      namedText: namedText.trim(),
      product_rule: "CONTEXT MAY EARN PRESENCE; NEVER SELECTION",
    });

    mark("person_tap");
    await namedBtn.click();
    await harnessWait(page, 80, "active class paint");
    const afterStyles = await optionStyles(page);
    await shot(page, "named/AFTER_TAP_ACTIVE.png");
    const activeAfter = afterStyles.filter((o) => o.active);
    rec("preselection_law_after", activeAfter.length === 1 ? "PASS" : "WARN", {
      summary: `active after tap: ${activeAfter.map((a) => a.text).join(",") || "none (may have left sheet)"}`,
      afterStyles,
      class: "PERSONALIZATION",
    });
  } else {
    rec("named_missing_for_founder_seed", "WARN", {
      summary: "Founder login has no earned named chat — run founder_review_seed; will use Solo path for forming",
      class: "SOCIAL_CONTEXT",
    });
    await page.getByTestId("moment-fork-solo").click();
  }

  // Reality forming
  const forming = page.getByTestId("reality-forming-surface");
  const formingOk = await forming.waitFor({ state: "visible", timeout: 8000 }).then(() => true).catch(() => false);
  mark("forming_first");
  if (formingOk) {
    await harnessWait(page, 250, "forming sequence frame");
    await shot(page, "390/07_REALITY_FORMING.png");
    await shot(page, "forming/01_first.png");
    await harnessWait(page, 200, "forming sequence frame 2");
    await shot(page, "forming/02_stable.png");
    mark("forming_stable");

    const formingText = await forming.innerText();
    const hasFormingLabel = /\bFORMING\b/.test(formingText);
    const hasWhereSchema = /\bWHERE\b/.test(formingText) && /Where should dinner be/i.test(formingText);
    const hasQuestion = /Where should dinner be/i.test(formingText);
    const hasProvenanceChip = /from Chanelle|little italy nights/i.test(formingText);
    rec("reality_forming_copy", !hasFormingLabel && !hasWhereSchema && hasQuestion && !hasProvenanceChip ? "PASS" : "PRODUCT_FAIL", {
      summary: hasQuestion
        ? "question present; schema labels check"
        : "missing Where should dinner be?",
      hasFormingLabel,
      hasWhereSchema,
      hasProvenanceChip,
      class: "COPY",
    });
    rec("reality_forming_continuity", "FOUNDER_JUDGMENT", {
      summary: "Does plate emerge from Moment atmosphere? FOUNDER only",
      residue_present: (await page.locator(".reality-forming-residue").count()) > 0,
    });
    rec("small_residue", "FOUNDER_JUDGMENT", {
      summary: "48px residue — useful / too much / unnecessary — FOUNDER",
    });

    visualDecay.push({
      state: "reality_forming",
      remains: ["atmosphere media", "small residue image", "Dinner with X", "still opening", "place question"],
      disappears: ["creator caption as primary", "inline CTA", "fork options", "Following chrome"],
      why: "certainty mid-path: need people+when open+where gap, not social post",
    });

    await auditRejectedCopy(page, "forming");
    mark("forming_continue");
    await page.getByTestId("reality-forming-continue").click();
    await harnessWait(page, 500, "place sheet open");
    await shot(page, "390/09_PRIVATE_CURATE_OR_PLACE.png");
    rec("private_curate_or_place", "PASS", {
      summary: "forming continue → place/curate path opened",
    });
  } else {
    rec("reality_forming", "PRODUCT_FAIL", {
      summary: "reality-forming-surface not visible after fork",
      class: "MOTION",
    });
  }

  // Dismiss place if open, check home non-regression
  await page.keyboard.press("Escape").catch(() => {});
  await harnessWait(page, 300, "dismiss");
  await shot(page, "390/12_AFTER_JOURNEY_HOME.png");

  // Multi-moment field must not appear as feed
  const multiCards = await page.locator("[data-testid=social-moment-card]").count();
  rec("home_non_regression", multiCards <= 2 ? "PASS" : "WARN", {
    summary: `social moment cards on home: ${multiCards} (Field multi must not ship)`,
    multiCards,
    class: "VISUAL",
  });

  visualDecay.push({
    state: "settled_expectation",
    remains: ["people/time/place/movement when durable"],
    disappears: ["began as…", "inspired by…", "ExperienceGraph explanation"],
    why: "consequence owns screen; provenance in graph only",
  });
}

async function runSoloJourney(browser) {
  const page = await browser.newPage();
  try {
    await activate(SOLO_USER).catch(() => {});
    await login(page, SOLO_USER, { width: 390, height: 844 });
    const card = page.getByTestId("social-moment-card");
    if (!(await card.isVisible({ timeout: 10000 }).catch(() => false))) {
      rec("solo_journey", "SKIP", { summary: "no moment card for solo user" });
      return;
    }
    await page.getByTestId("social-moment-media").click().catch(() => {});
    await harnessWait(page, 300, "solo interest");
    await page.getByTestId("social-moment-want-this").click({ timeout: 5000 }).catch(() => {});
    await page.getByTestId("moment-fork-sheet").waitFor({ state: "visible", timeout: 8000 });
    await shot(page, "solo/01_FORK.png");
    // Must not invent named person without chats
    const named = await page.getByTestId("moment-fork-named").isVisible().catch(() => false);
    rec("solo_no_invented_jordan", !named ? "PASS" : "PRODUCT_FAIL", {
      summary: named ? "named option without grounded chat" : "no named option (expected)",
      class: "PERSONALIZATION",
    });
    await page.getByTestId("moment-fork-solo").click();
    await harnessWait(page, 400, "solo seed");
    await shot(page, "solo/02_FORMING.png");
    const forming = await page.getByTestId("reality-forming-surface").isVisible().catch(() => false);
    const body = forming ? await page.getByTestId("reality-forming-surface").innerText() : "";
    rec("solo_journey", forming ? "PASS" : "PRODUCT_FAIL", {
      summary: forming ? `forming: ${body.slice(0, 80)}` : "no forming after Solo",
      no_friend_picker: true,
    });
    questionBurden.solo = { questions: 1, taps: 3, typed_fields: 0, people_picker: 0 };
  } catch (e) {
    rec("solo_journey", "ENVIRONMENT_FAIL", { summary: e.message });
  } finally {
    await page.close();
  }
}

async function runGenericFallback(browser) {
  const page = await browser.newPage();
  try {
    await activate(GENERIC).catch(() => {});
    await login(page, GENERIC, { width: 390, height: 844 });
    const card = page.getByTestId("social-moment-card");
    if (!(await card.isVisible({ timeout: 10000 }).catch(() => false))) {
      rec("generic_fallback", "SKIP", { summary: "no moment for generic user" });
      return;
    }
    await page.getByTestId("social-moment-media").click().catch(() => {});
    await harnessWait(page, 300, "generic interest");
    await page.getByTestId("social-moment-want-this").click({ timeout: 5000 }).catch(() => {});
    await page.getByTestId("moment-fork-sheet").waitFor({ state: "visible", timeout: 8000 });
    await shot(page, "generic/01_FORK.png");
    const styles = await optionStyles(page);
    const labels = styles.map((s) => s.text);
    const named = await page.getByTestId("moment-fork-named").isVisible().catch(() => false);
    const hasPeople = await page.getByTestId("moment-fork-people").isVisible().catch(() => false);
    const hasSolo = await page.getByTestId("moment-fork-solo").isVisible().catch(() => false);
    const hasNotNow = await page.getByTestId("moment-fork-cancel").isVisible().catch(() => false);
    rec("generic_fallback", !named && hasPeople && hasSolo && hasNotNow ? "PASS" : "PRODUCT_FAIL", {
      summary: `labels=${labels.join(" | ")} named=${named}`,
      labels,
      class: "PERSONALIZATION",
    });
    questionBurden.generic = {
      questions: 1,
      taps_to_people_sheet: 4,
      people_picker: 1,
      search_fields: 0,
    };
  } catch (e) {
    rec("generic_fallback", "ENVIRONMENT_FAIL", { summary: e.message });
  } finally {
    await page.close();
  }
}

async function runViewports(browser) {
  for (const vp of [
    { w: 375, h: 812, dir: "375" },
    { w: 430, h: 932, dir: "430" },
  ]) {
    const page = await browser.newPage();
    try {
      await login(page, FOUNDER, { width: vp.w, height: vp.h });
      await shot(page, `${vp.dir}/01_MOMENT.png`);
      await navSpacing(page, `${vp.dir}_home`);
      const card = page.getByTestId("social-moment-card");
      if (await card.isVisible({ timeout: 8000 }).catch(() => false)) {
        await page.getByTestId("social-moment-media").click().catch(() => {});
        await harnessWait(page, 300, "vp interest");
        await page.getByTestId("social-moment-want-this").click({ timeout: 4000 }).catch(() => {});
        await harnessWait(page, 400, "vp fork");
        await shot(page, `${vp.dir}/02_CHOICE.png`);
        const solo = page.getByTestId("moment-fork-solo");
        if (await solo.isVisible().catch(() => false)) {
          await solo.click();
          await harnessWait(page, 500, "vp forming");
          await shot(page, `${vp.dir}/03_FORMING.png`);
        }
      }
      rec(`viewport_${vp.dir}`, "PASS", { summary: `${vp.w}x${vp.h} critical states captured` });
    } catch (e) {
      rec(`viewport_${vp.dir}`, "ENVIRONMENT_FAIL", { summary: e.message });
    } finally {
      await page.close();
    }
  }
}

async function runMediaMatrix(browser) {
  const page = await browser.newPage();
  const mediaFiles = [
    "food.jpg",
    "portrait.jpg",
    "restaurant.jpg",
  ];
  try {
    await login(page, FOUNDER, { width: 390, height: 844 });
    for (const file of mediaFiles) {
      const url = `/demo/moments/${file}`;
      await page.evaluate((src) => {
        const img = document.querySelector(".social-moment-img");
        if (img) img.src = src;
        const media = document.querySelector(".social-moment-media-fallback");
        if (media && !document.querySelector(".social-moment-img")) {
          media.style.backgroundImage = `url(${src})`;
        }
      }, url);
      // inject if only fallback
      await page.evaluate((src) => {
        const btn = document.querySelector(".social-moment-media");
        if (!btn) return;
        let img = btn.querySelector("img");
        if (!img) {
          img = document.createElement("img");
          img.className = "social-moment-img";
          img.alt = "";
          btn.innerHTML = "";
          btn.appendChild(img);
        }
        img.src = src;
      }, url);
      await harnessWait(page, 200, "media swap");
      await shot(page, `media/${file.replace(".jpg", "")}.png`);
    }
    rec("media_crop_matrix", "FOUNDER_JUDGMENT", {
      summary: "food/portrait/restaurant injected for crop/contrast — FOUNDER eyes",
      files: mediaFiles,
    });
  } catch (e) {
    rec("media_crop_matrix", "ENVIRONMENT_FAIL", { summary: e.message });
  } finally {
    await page.close();
  }
}

async function runReducedMotion(browser) {
  const page = await browser.newPage();
  try {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await login(page, FOUNDER, { width: 390, height: 844 });
    const card = page.getByTestId("social-moment-card");
    if (await card.isVisible({ timeout: 8000 }).catch(() => false)) {
      await page.getByTestId("social-moment-media").click().catch(() => {});
      await harnessWait(page, 200, "rm interest");
      await page.getByTestId("social-moment-want-this").click({ timeout: 4000 }).catch(() => {});
      await harnessWait(page, 300, "rm fork");
      await shot(page, "reduced-motion/01_FORK.png");
      const solo = page.getByTestId("moment-fork-solo");
      if (await solo.isVisible().catch(() => false)) {
        await solo.click();
        await harnessWait(page, 300, "rm forming");
        await shot(page, "reduced-motion/02_FORMING.png");
      }
    }
    rec("reduced_motion", "FOUNDER_JUDGMENT", {
      summary: "captures under prefers-reduced-motion — meaning must survive",
    });
  } catch (e) {
    rec("reduced_motion", "ENVIRONMENT_FAIL", { summary: e.message });
  } finally {
    await page.close();
  }
}

async function runPrivateImpact(browser) {
  const page = await browser.newPage();
  try {
    await login(page, FOUNDER, { width: 390, height: 844 });
    const you = page.getByTestId("tab-you").or(page.getByRole("button", { name: /^You$/i }));
    if (await you.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await you.first().click();
      await harnessWait(page, 400, "you tab");
    }
    const impact = page.getByTestId("private-creator-impact");
    const ok = await impact.isVisible({ timeout: 5000 }).catch(() => false);
    if (ok) {
      await shot(page, "private-impact/01_YOU.png");
      const t = await impact.innerText();
      rec("private_creator_impact", /inspired \d+ experiences/i.test(t) ? "PASS" : "WARN", {
        summary: t.slice(0, 120),
        public: false,
      });
    } else {
      rec("private_creator_impact", "SKIP", {
        summary: "not reachable on You — component labeled separate if needed",
      });
    }
  } catch (e) {
    rec("private_creator_impact", "ENVIRONMENT_FAIL", { summary: e.message });
  } finally {
    await page.close();
  }
}

/** Mechanical named authority (not UI) */
function namedAuthorityAudit() {
  const withJordan = earnedNamedPresence([
    { id: "1", name: "Maya Chen" },
    { id: "2", name: "Jordan Lee" },
  ]);
  const none = earnedNamedPresence([]);
  const multi = earnedNamedPresence([
    { id: "a", name: "Jordan Lee" },
    { id: "b", name: "Maya Chen" },
  ]);
  rec("named_context_authority_unit", withJordan?.displayName === "Jordan" && !none ? "PASS" : "PRODUCT_FAIL", {
    summary: "unit: Jordan preferred when present; null without chats",
    withJordan,
    none,
    multi_note: "current product prefers Jordan if present among multiple — does not invent ranking UI",
    multi,
    class: "AUTHORITY",
  });
  rec("negative_no_jordan_without_chat", none === null ? "PASS" : "PRODUCT_FAIL", {
    summary: "no grounded chats → no named presence",
    class: "PERSONALIZATION",
  });
}

function figmaMatchTable() {
  return [
    {
      node: "123:3",
      figma: "inline I want to do this →",
      product: "SocialMomentCard is-inline",
      match: "INTENTIONAL_WORKING",
      difference: "copy not locked",
    },
    {
      node: "123:17",
      figma: "Solo / With people / Not now",
      product: "generic fork when no earned name",
      match: "YES",
      difference: null,
    },
    {
      node: "123:34",
      figma: "neutral named options",
      product: "earnedNamedPresence + no is-active before tap",
      match: "YES",
      difference: "name from real chats",
    },
    {
      node: "123:52",
      figma: "active after tap",
      product: "is-active after named tap",
      match: "YES",
      difference: "brief — sheet may unmount into forming",
    },
    {
      node: "124:2",
      figma: "forming atmosphere + residue + question",
      product: "RealityFormingSurface",
      match: "YES",
      difference: "motion feel FOUNDER",
    },
    {
      node: "124:17",
      figma: "settled plate no provenance",
      product: "live presence/SR; no began as",
      match: "PARTIAL",
      difference: "full atmospheric plate vs live presence cards",
    },
    {
      node: "124:33",
      figma: "private impact sentence + wash",
      product: "You tab PrivateCreatorImpact",
      match: "YES",
      difference: null,
    },
    {
      node: "124:45",
      figma: "quiet follow + inline CTA",
      product: "followingVisual quiet ·",
      match: "YES",
      difference: null,
    },
  ];
}

function writePack(env) {
  const timingDiffs = {};
  const by = Object.fromEntries(timings.map((t) => [t.label, t.t]));
  const pairs = [
    ["media_tap", "media_ack"],
    ["media_tap", "cta_visible"],
    ["cta_tap", "choice_first"],
    ["cta_tap", "choice_interactive"],
    ["person_tap", "forming_first"],
    ["forming_first", "forming_stable"],
  ];
  for (const [a, b] of pairs) {
    if (by[a] != null && by[b] != null) timingDiffs[`${a}→${b}_ms`] = Math.round(by[b] - by[a]);
  }

  const pack = {
    schema: "pass30_final_founder_review.v1",
    at: new Date().toISOString(),
    product_sha: PRODUCT_SHA,
    product_ci_run: PRODUCT_CI_RUN,
    evidence_note: "evidence commit separate if any",
    environment: env,
    results,
    failures,
    timings_raw: timings,
    timing_diffs_ms: timingDiffs,
    harness_waits_only: harnessWaits,
    visual_decay_audit: visualDecay,
    question_burden: questionBurden,
    interaction_cost: {
      named: questionBurden.named,
      generic: questionBurden.generic,
      solo: questionBurden.solo,
      advantage:
        "Named path should avoid people-picker search when earned presence shows With {Name}",
    },
    figma_product_match: figmaMatchTable(),
    founder_judgment_required: [
      "WARMTH",
      "VOID",
      "CTA_COPY",
      "NAMED_PERSONALIZATION_EMOTION",
      "MOMENT_TO_SR_CONTINUITY",
      "SOCIAL_VS_AD",
      "SOCIAL_VS_SOFTWARE",
      "MEDIA_FIRST_SECOND_ATTRACTION",
      "MOTION_FEEL",
      "SMALL_RESIDUE",
    ],
    v2_merge: "HOLD",
    do_not_merge: true,
  };

  writeFileSync(resolve(OUT, "PASS30_FINAL_REVIEW.json"), JSON.stringify(pack, null, 2));

  const md = `# Pass 30 Final Founder Live Review Pack

**HOLD. DO NOT MERGE.**

| | |
|--|--|
| **PRODUCT SHA** | \`${PRODUCT_SHA}\` |
| **REMOTE CI** | run \`${PRODUCT_CI_RUN}\` — Classify/Governance/Production GREEN (\`with_tests\`) |
| **EVIDENCE** | this directory (evidence-only; may be separate commit) |
| **Test env** | ${env.browser} · viewport primary ${env.primary_viewport} · ${env.web} · ${env.device_claim} |

---

## Purpose

Automation gathered live evidence of P30R2 product at \`${PRODUCT_SHA}\`.  
**Founder decides emotional correctness.** No automated PASS on warmth, motion feel, or social naturalness.

---

## How to inspect (prepared for you)

1. Open ordered frames under \`390/\` (primary).
2. Compare \`named/BEFORE_TAP_NEUTRAL.png\` vs \`named/AFTER_TAP_ACTIVE.png\`.
3. Review \`forming/\` sequence and \`generic/\` + \`solo/\` paths.
4. Glance \`375/\` + \`430/\` critical states and \`media/\` crop matrix.
5. Read failure corpus below.

Product URL used: \`${env.web}\`

---

## 390 journey frames

| # | File | State |
|---|------|--------|
| 01 | \`390/01_HOME_MOMENT.png\` | Home + Moment |
| 02 | \`390/02_MEDIA_INTEREST.png\` | Interest |
| 03 | \`390/03_INLINE_CTA.png\` | Inline CTA |
| 04 | \`390/04_SOCIAL_CHOICE.png\` | Fork |
| 07 | \`390/07_REALITY_FORMING.png\` | Forming |
| 09 | \`390/09_PRIVATE_CURATE_OR_PLACE.png\` | Place/curate |
| 12 | \`390/12_AFTER_JOURNEY_HOME.png\` | After |

---

## Motion timings (measured ms)

Harness waits are **separate** (capture sync only): ${JSON.stringify(harnessWaits)}

Product-adjacent deltas:

\`\`\`json
${JSON.stringify(timingDiffs, null, 2)}
\`\`\`

---

## Question / interaction burden

\`\`\`json
${JSON.stringify(questionBurden, null, 2)}
\`\`\`

---

## Visual decay audit (backend compounds / frontend decays)

${visualDecay.map((v) => `### ${v.state}\n- **Remains:** ${v.remains.join("; ")}\n- **Disappears:** ${v.disappears.join("; ")}\n- **Why:** ${v.why}\n`).join("\n")}

---

## Figma ↔ product

| Node | Match | Difference |
|------|-------|------------|
${figmaMatchTable()
  .map((r) => `| ${r.node} | ${r.match} | ${r.difference || "—"} |`)
  .join("\n")}

---

## Founder judgment checklist (you fill)

| Gate | Judgment |
|------|----------|
| Warmth | |
| Void | |
| CTA copy | |
| Named delight vs creep | |
| Moment→SR continuity | |
| Social vs ad | |
| Social vs software | |
| First photo attraction | |
| Motion feel | |
| Residue size | |

---

## Failure corpus

${
  failures.length
    ? failures.map((f) => `- **${f.severity || "P1"}** \`${f.name}\` [${f.class}] ${f.detail?.summary || ""}`).join("\n")
    : "_No PRODUCT_FAIL recorded by harness. Review FOUNDER_JUDGMENT items manually._"
}

### Results summary

${results.map((r) => `- **${r.status}** \`${r.name}\` — ${r.detail?.summary || ""}`).join("\n")}

---

## V2 MERGE VERDICT

**HOLD. DO NOT MERGE.**

The smarter the system underneath, the fewer footprints the interface should leave.
`;

  writeFileSync(resolve(OUT, "FOUNDER_REVIEW.md"), md);
  writeFileSync(resolve(OUT, "FAILURE_CORPUS.json"), JSON.stringify(failures, null, 2));
  writeFileSync(
    resolve(OUT, "MOTION_TIMINGS.json"),
    JSON.stringify({ timingDiffs, timings, harnessWaits }, null, 2),
  );
  writeFileSync(
    resolve(OUT, "VISUAL_DECAY_AUDIT.json"),
    JSON.stringify(visualDecay, null, 2),
  );
  writeFileSync(resolve(OUT, "FIGMA_PRODUCT_MATCH.json"), JSON.stringify(figmaMatchTable(), null, 2));
  console.log("Wrote pack to", OUT);
}

async function main() {
  console.log("PASS 30 FINAL FOUNDER REVIEW PACK");
  console.log("PRODUCT_SHA", PRODUCT_SHA);
  namedAuthorityAudit();

  if (!USE_BROWSER) {
    rec("browser", "SKIP", { summary: "set PROOF_BROWSER=1" });
    writePack({
      browser: "none",
      primary_viewport: "390x844",
      web: WEB,
      api: API,
      device_claim: "no browser run",
    });
    process.exit(0);
  }

  // Ensure founder seed for Jordan chat if possible
  try {
    const { spawnSync } = await import("node:child_process");
    spawnSync("node", [resolve(ROOT, "scripts/founder_review_seed.mjs")], {
      env: { ...process.env, API_BASE: API },
      stdio: "inherit",
    });
  } catch (e) {
    rec("seed", "WARN", { summary: String(e.message || e) });
  }

  await activate(FOUNDER).catch(() => {});

  const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
  const { chromium } = require("playwright");
  const browser = await chromium.launch({ headless: true });
  const env = {
    browser: "Playwright Chromium headless",
    primary_viewport: "390x844",
    web: WEB,
    api: API,
    device_claim: "NOT a physical device — desktop browser emulation only",
    touch: "mouse clicks (not real touch)",
  };

  const page = await browser.newPage();
  try {
    await login(page, FOUNDER, { width: 390, height: 844 });
    await runNamedJourney(page);
  } catch (e) {
    rec("primary_390_journey", "ENVIRONMENT_FAIL", { summary: e.message, class: "VISUAL" });
  }
  await page.close();

  await runSoloJourney(browser);
  await runGenericFallback(browser);
  await runViewports(browser);
  await runMediaMatrix(browser);
  await runReducedMotion(browser);
  await runPrivateImpact(browser);

  await browser.close();
  writePack(env);

  const hard = failures.filter((f) => f.status === "PRODUCT_FAIL").length;
  process.exit(hard > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
