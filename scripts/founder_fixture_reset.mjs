#!/usr/bin/env node
/**
 * Founder fixture reset — Walk A/B ONLY (+12025550101 / +12025550102).
 *
 * Never broad-deletes. Operates only on known fixture user sessions.
 *
 * Cleans:
 *   1) Demo bootstrap SocialMoments authored by Walk A/B (soft-delete own)
 *   2) Unread hygiene (reuses shell_unread_hygiene patterns; keeps Fort Oak)
 *   3) Optional DB residue via apps/opal_core/scripts/founder_fixture_reset.exs
 *      (shell-geo / P046gate messages + lab call sessions → harness exclusion)
 *
 * Usage:
 *   node scripts/founder_fixture_reset.mjs
 *   FOUNDER_FIXTURE_RESET_DB=1 node scripts/founder_fixture_reset.mjs
 *
 * Writes:
 *   docs/evidence/v2-coded-experience/coherence-recovery/FOUNDER_FIXTURE_RESET.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { activate } from "./founder_proof_fixture.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const API = (process.env.API_BASE || "http://127.0.0.1:4000").replace(/\/$/, "");
const OUT_DIR = resolve(ROOT, "docs/evidence/v2-coded-experience/coherence-recovery");
const OUT = resolve(OUT_DIR, "FOUNDER_FIXTURE_RESET.json");
const TOKEN_CACHE = "/tmp/a61_tokens.json";
const FORT_OAK_CONV = "ace99adc-db67-4258-9d95-f612246c6c84";

/** Hard allow-list — never activate other phones. */
const WALK_A = {
  phone: "+12025550101",
  name: "Walk A",
  handle: "a61_walk_a",
  code: "111111",
  userId: "47aa5856-8c56-4b18-a4d4-6a9b456516a8",
};
const WALK_B = {
  phone: "+12025550102",
  name: "Walk B",
  handle: "a61_walk_b",
  code: "222222",
  userId: "b599fcd7-7a97-4736-8221-86e0a6d8dc7a",
};

const ALLOWED_PHONES = new Set([WALK_A.phone, WALK_B.phone]);
const ALLOWED_USER_IDS = new Set([WALK_A.userId, WALK_B.userId]);

const DEMO_CAPTIONS = new Set([
  "Published Memory from Opal Graph",
  "Golden hour hike with the crew.",
  "Sunset walk at Fletcher Cove",
]);

/** Intentional SOCIAL Home body for founder walks (not private Memory / not demo residue). */
const INTENTIONAL_SOCIAL = [
  {
    caption: "Saturday crew locked the coast walk — see you at the overlook.",
    media_ref: "/figma-v2/home/moment-coast.jpg",
  },
  {
    caption: "Coffee with Chanelle before the Graph tonight.",
    media_ref: "/figma-v2/home/moment-coffee.jpg",
  },
  {
    caption: "Friends Saturday actually downtown worked — keeping this energy.",
    media_ref: "/figma-v2/home/moment-downtown.jpg",
  },
  {
    caption:
      "Walk A + Walk B: Fort Oak became earlier together. On to what’s next.",
    media_ref: "/figma-v2/home/moment-dinner.jpg",
  },
];
const INTENTIONAL_CAPTIONS = new Set(INTENTIONAL_SOCIAL.map((c) => c.caption));

const RESIDUE_TITLE =
  /Soak|Multi speaker|soak|Crew with\b|Dinner with Direct Friend|Deep Smoke|Collective proof|Proof Friends|Direct,\s*Second|Second,\s*Direct/i;
const RESIDUE_PREVIEW = /shell-geo\b|P046gate\b|SOAK-|Group hello\b/i;

async function json(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "content-type": "application/json",
      ...(opts.bearer ? { authorization: `Bearer ${opts.bearer}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

function assertFixtureOnly(session, expected) {
  if (!ALLOWED_PHONES.has(expected.phone)) {
    throw new Error(`REFUSED: phone ${expected.phone} not in Walk A/B allow-list`);
  }
  if (session.userId && !ALLOWED_USER_IDS.has(session.userId)) {
    throw new Error(
      `REFUSED: activated user ${session.userId} is not Walk A/B canonical id`,
    );
  }
}

async function loadSessions() {
  if (existsSync(TOKEN_CACHE) && !process.env.HYGIENE_FORCE_OTP) {
    try {
      const cached = JSON.parse(readFileSync(TOKEN_CACHE, "utf8"));
      if (cached?.a?.token && cached?.b?.token) {
        if (
          ALLOWED_USER_IDS.has(cached.a.userId) &&
          ALLOWED_USER_IDS.has(cached.b.userId)
        ) {
          const probe = await json("/api/v1/product/conversations", {
            bearer: cached.a.token,
          });
          if (probe.ok) {
            return {
              a: { ...cached.a, phone: WALK_A.phone },
              b: { ...cached.b, phone: WALK_B.phone },
              source: "cached",
            };
          }
        }
      }
    } catch {
      /* fall through */
    }
  }
  const a = await activate(WALK_A);
  const b = await activate(WALK_B);
  assertFixtureOnly(a, WALK_A);
  assertFixtureOnly(b, WALK_B);
  writeFileSync(
    TOKEN_CACHE,
    JSON.stringify(
      {
        a: { token: a.token, userId: a.userId, name: a.name, handle: WALK_A.handle },
        b: { token: b.token, userId: b.userId, name: b.name, handle: WALK_B.handle },
      },
      null,
      2,
    ),
  );
  return {
    a: { ...a, phone: WALK_A.phone },
    b: { ...b, phone: WALK_B.phone },
    source: "activate",
  };
}

async function softDeleteDemoMemories(label, session) {
  assertFixtureOnly(session, label === "WALK_A" ? WALK_A : WALK_B);
  const feed = await json("/api/v1/product/home/feed?limit=80", {
    bearer: session.token,
  });
  const objects = feed.body?.objects || [];
  const mine = objects.filter(
    (o) =>
      DEMO_CAPTIONS.has(String(o.caption || "").trim()) &&
      o.actor?.user_id === session.userId,
  );
  const deleted = [];
  const failures = [];
  for (const o of mine) {
    const r = await json(`/api/v1/product/social-moments/${encodeURIComponent(o.id)}`, {
      method: "DELETE",
      bearer: session.token,
    });
    if (r.ok) deleted.push({ id: o.id, caption: o.caption });
    else failures.push({ id: o.id, status: r.status, body: r.body });
  }
  return {
    label,
    user_id: session.userId,
    candidates: mine.length,
    deleted_count: deleted.length,
    deleted_sample: deleted.slice(0, 20),
    failures,
  };
}

async function unreadHygiene(label, session) {
  const list = await json("/api/v1/product/conversations", { bearer: session.token });
  const conversations = list.body?.conversations || [];
  const beforeUnread = conversations.reduce(
    (s, c) => s + (typeof c.unread_count === "number" ? c.unread_count : 0),
    0,
  );
  const marked = [];
  const failures = [];
  for (const c of conversations) {
    const u = typeof c.unread_count === "number" ? c.unread_count : 0;
    if (u <= 0) continue;
    if (c.id === FORT_OAK_CONV) continue;
    const r = await json(
      `/api/v1/product/conversations/${encodeURIComponent(c.id)}/read`,
      { method: "POST", bearer: session.token, body: JSON.stringify({}) },
    );
    if (r.ok) marked.push({ id: c.id, title: c.title, unread_before: u });
    else failures.push({ id: c.id, status: r.status });
  }
  const afterList = await json("/api/v1/product/conversations", {
    bearer: session.token,
  });
  const afterConvs = afterList.body?.conversations || [];
  const afterUnread = afterConvs.reduce(
    (s, c) => s + (typeof c.unread_count === "number" ? c.unread_count : 0),
    0,
  );
  const residueVisible = afterConvs.filter(
    (c) =>
      c.id !== FORT_OAK_CONV &&
      (RESIDUE_TITLE.test(String(c.title || "")) ||
        RESIDUE_PREVIEW.test(String(c.preview || ""))),
  );
  return {
    label,
    before_unread_sum: beforeUnread,
    after_unread_sum: afterUnread,
    marked_count: marked.length,
    marked_sample: marked.slice(0, 25),
    failures,
    residue_rows_still_in_api: residueVisible.map((c) => ({
      id: c.id,
      title: c.title,
      preview: c.preview,
    })),
    note: "ChatsHome filters residue titles client-side; API rows may remain until DB reset.",
  };
}

async function ensureIntentionalSocialHome(walkA, walkB) {
  const feed = await json("/api/v1/product/home/feed?limit=40", {
    bearer: walkB.token,
  });
  const objects = feed.body?.objects || [];
  const present = new Set(
    objects.map((o) => String(o.caption || "")).filter((c) => INTENTIONAL_CAPTIONS.has(c)),
  );
  const created = [];
  const failures = [];
  for (const item of INTENTIONAL_SOCIAL) {
    if (present.has(item.caption)) continue;
    const r = await json("/api/v1/product/social-moments", {
      method: "POST",
      bearer: walkA.token,
      body: JSON.stringify({
        caption: item.caption,
        visibility: "friends",
        media_refs: [item.media_ref],
        audience_user_ids: [walkB.userId],
      }),
    });
    if (r.ok) {
      created.push(item.caption);
      present.add(item.caption);
    } else {
      failures.push({ caption: item.caption, status: r.status, error: r.body?.error });
    }
  }
  const after = await json("/api/v1/product/home/feed?limit=40", {
    bearer: walkB.token,
  });
  const afterObjs = after.body?.objects || [];
  const intentional = afterObjs.filter((o) =>
    INTENTIONAL_CAPTIONS.has(String(o.caption || "")),
  );
  return {
    created: created.length,
    present: intentional.length,
    feed_b_count: intentional.length,
    failures,
    captions: intentional.map((o) => o.caption),
  };
}

function runDbReset() {
  if (process.env.FOUNDER_FIXTURE_RESET_DB !== "1") {
    return { skipped: true, reason: "FOUNDER_FIXTURE_RESET_DB not set" };
  }
  const script = resolve(ROOT, "apps/opal_core/scripts/founder_fixture_reset.exs");
  if (!existsSync(script)) {
    return { skipped: true, reason: "exs missing", path: script };
  }
  const r = spawnSync("mix", ["run", "scripts/founder_fixture_reset.exs"], {
    cwd: resolve(ROOT, "apps/opal_core"),
    encoding: "utf8",
    env: { ...process.env, MIX_ENV: process.env.MIX_ENV || "dev" },
  });
  return {
    skipped: false,
    status: r.status,
    stdout: (r.stdout || "").slice(0, 4000),
    stderr: (r.stderr || "").slice(0, 2000),
  };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const started = new Date().toISOString();
  const { a, b, source } = await loadSessions();
  assertFixtureOnly(a, WALK_A);
  assertFixtureOnly(b, WALK_B);
  console.log(`sessions source=${source} A=${a.userId} B=${b.userId}`);

  const memA = await softDeleteDemoMemories("WALK_A", a);
  const memB = await softDeleteDemoMemories("WALK_B", b);
  console.log(
    `demo memories deleted A=${memA.deleted_count}/${memA.candidates} B=${memB.deleted_count}/${memB.candidates}`,
  );

  const hyA = await unreadHygiene("WALK_A", a);
  const hyB = await unreadHygiene("WALK_B", b);
  console.log(
    `unread A ${hyA.before_unread_sum}→${hyA.after_unread_sum} B ${hyB.before_unread_sum}→${hyB.after_unread_sum}`,
  );

  const db = runDbReset();
  if (!db.skipped) {
    console.log(`db reset status=${db.status}`);
    if (db.stdout) console.log(db.stdout);
  }

  // After DB reset, confirm Fort Oak preview is not shell-geo residue.
  let fortOakPreview = null;
  let fortOakClean = null;
  if (!db.skipped && db.status === 0) {
    const list = await json("/api/v1/product/conversations", { bearer: a.token });
    const row = (list.body?.conversations || []).find((c) => c.id === FORT_OAK_CONV);
    fortOakPreview = String(row?.preview || "");
    fortOakClean = !/shell-geo\b/i.test(fortOakPreview);
  }

  const socialHome = await ensureIntentionalSocialHome(a, b);
  console.log(
    `intentional social home created=${socialHome.created} present=${socialHome.present} feed_b=${socialHome.feed_b_count}`,
  );

  const evidence = {
    started,
    finished: new Date().toISOString(),
    FIXTURE_GENERATION_ID: randomUUID(),
    api: API,
    session_source: source,
    allow_list: {
      phones: [...ALLOWED_PHONES],
      user_ids: [...ALLOWED_USER_IDS],
    },
    policy:
      "Walk A/B only. Soft-delete own demo bootstrap SocialMoments. Mark-read all unread except Fort Oak. Optional FOUNDER_FIXTURE_RESET_DB=1 deletes shell-geo/P046gate/harness call_invite. Ensures intentional SOCIAL Home objects for Walk B.",
    fort_oak_conversation_id: FORT_OAK_CONV,
    fort_oak_preview_after_db_reset: fortOakPreview,
    fort_oak_preview_clean: fortOakClean,
    demo_captions: [...DEMO_CAPTIONS],
    intentional_social_captions: [...INTENTIONAL_CAPTIONS],
    social_home: socialHome,
    memories: { walk_a: memA, walk_b: memB },
    unread: { walk_a: hyA, walk_b: hyB },
    db_reset: db,
    track_b: {
      PLAIN_CALL_PHYSICAL: "RED",
      CALL_TRANSPORT_COMMIT: "NO",
      note: "Lab call residue may be harness-excluded via exs; Track B product remains uncommitted.",
    },
    ok:
      memA.failures.length === 0 &&
      memB.failures.length === 0 &&
      hyA.failures.length === 0 &&
      hyB.failures.length === 0 &&
      (db.skipped || db.status === 0) &&
      (fortOakClean === null || fortOakClean === true) &&
      socialHome.feed_b_count >= 1 &&
      socialHome.failures.length === 0,
  };

  writeFileSync(OUT, JSON.stringify(evidence, null, 2));
  const genPath = resolve(ROOT, "apps/opal_core/priv/fixture_generation_id");
  writeFileSync(genPath, `${evidence.FIXTURE_GENERATION_ID}\n`);
  console.log(`wrote ${OUT}`);
  console.log(`FIXTURE_GENERATION_ID=${evidence.FIXTURE_GENERATION_ID}`);
  if (!evidence.ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
