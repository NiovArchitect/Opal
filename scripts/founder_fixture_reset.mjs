#!/usr/bin/env node
/**
 * Founder fixture reset — Walk A/B hygiene + Pass 1 Home densification.
 *
 * Never broad-deletes. Soft-delete / unread hygiene stay Walk A/B only.
 * Densification activates approved fixture phones +12025550101…0106 only.
 *
 * Cleans:
 *   1) Demo bootstrap SocialMoments authored by Walk A/B (soft-delete own)
 *   2) Unread hygiene (reuses shell_unread_hygiene patterns; keeps Fort Oak)
 *   3) Optional DB residue via apps/opal_core/scripts/founder_fixture_reset.exs
 *      (shell-geo / P046gate messages + lab call sessions → harness exclusion)
 *
 * Seeds (Pass 1 Home densification):
 *   - ~12–16 multi-author SocialMoments (fixture-owned SOCIAL captions)
 *   - TemporaryStories for the same people when POST /stories succeeds
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
const PUBLIC = resolve(ROOT, "apps/opal_web/public");
const FORT_OAK_CONV = "ace99adc-db67-4258-9d95-f612246c6c84";

/** Hygiene allow-list — soft-delete / unread never leave Walk A/B. */
const WALK_A = {
  phone: "+12025550101",
  name: "Walk A",
  handle: "a61_walk_a",
  code: "111111",
  userId: "47aa5856-8c56-4b18-a4d4-6a9b456516a8",
  key: "walk_a",
};
const WALK_B = {
  phone: "+12025550102",
  name: "Walk B",
  handle: "a61_walk_b",
  code: "222222",
  userId: "b599fcd7-7a97-4736-8221-86e0a6d8dc7a",
  key: "walk_b",
};

/** Densification authors — approved fixture phones only (OTP 111111–666666). */
const JORDAN = {
  phone: "+12025550103",
  name: "Jordan Lee",
  handle: "jordan_rev",
  code: "333333",
  key: "jordan",
};
const CHRIS = {
  phone: "+12025550104",
  name: "Chris Park",
  handle: "chris_rev",
  code: "444444",
  key: "chris",
};
const JESS = {
  phone: "+12025550105",
  name: "Jess Okonkwo",
  handle: "jess_rev",
  code: "555555",
  key: "jess",
};
const ALEX = {
  phone: "+12025550106",
  name: "Alex Rivera",
  handle: "alex_rev",
  code: "666666",
  key: "alex",
};

const HYGIENE_PHONES = new Set([WALK_A.phone, WALK_B.phone]);
const HYGIENE_USER_IDS = new Set([WALK_A.userId, WALK_B.userId]);
const DENSIFY_FIXTURES = [WALK_A, WALK_B, JORDAN, CHRIS, JESS, ALEX];
const DENSIFY_PHONES = new Set(DENSIFY_FIXTURES.map((f) => f.phone));

const DEMO_CAPTIONS = new Set([
  "Published Memory from Opal Graph",
  "Golden hour hike with the crew.",
  "Sunset walk at Fletcher Cove",
]);

/**
 * Intentional SOCIAL Home body for founder walks (not private Memory / not demo residue).
 * media_ref paths are under /figma-v2/home-201/ or /demo/moments (no /figma-v2/home/).
 * author_key selects which fixture phone publishes.
 */
const INTENTIONAL_SOCIAL = [
  {
    author_key: "walk_a",
    caption: "Saturday crew locked the coast walk — see you at the overlook.",
    media_ref: "/figma-v2/home-201/media-travel-carousel-1728.png",
  },
  {
    author_key: "walk_a",
    caption: "Coffee with Chanelle before the Graph tonight.",
    media_ref: "/figma-v2/home-201/media-juniper.png",
  },
  {
    author_key: "walk_a",
    caption: "Friends Saturday actually downtown worked — keeping this energy.",
    media_ref: "/demo/moments/restaurant.jpg",
  },
  {
    author_key: "walk_a",
    caption:
      "Walk A + Walk B: Fort Oak became earlier together. On to what’s next.",
    media_ref: "/demo/moments/food.jpg",
  },
  {
    author_key: "walk_a",
    caption: "Next Together after Fort Oak settled — same people, lighter plan.",
    media_ref: "/figma-v2/home-201/media-memory-friends-1728.png",
  },
  {
    author_key: "walk_b",
    caption: "Golden hour after Fletcher — keeping the coast walk energy.",
    media_ref: "/figma-v2/home-201/media-maya.png",
  },
  {
    author_key: "walk_b",
    caption: "Saturday open for the crew — text me if you’re actually free.",
    media_ref: "/demo/moments/portrait.jpg",
  },
  {
    author_key: "walk_b",
    caption: "Chanelle coffee follow-up — same corner, better light.",
    media_ref: "/figma-v2/home-201/media-maya-618-130-v2.png",
  },
  {
    author_key: "jordan",
    caption: "Market haul before dinner — who’s joining downtown?",
    media_ref: "/demo/moments/food.jpg",
  },
  {
    author_key: "jordan",
    caption: "Who’s actually free tonight? Soft hold on the patio.",
    media_ref: "/demo/moments/restaurant.jpg",
  },
  {
    author_key: "chris",
    caption: "Juniper table hold for Saturday — come through if you can.",
    media_ref: "/figma-v2/home-201/media-juniper.png",
  },
  {
    author_key: "chris",
    caption: "Late dessert run with the Graph — save me a seat.",
    media_ref: "/demo/moments/food.jpg",
  },
  {
    author_key: "jess",
    caption: "Coast overlook photos from the walk — still smiling.",
    media_ref: "/figma-v2/home-201/media-travel-carousel-1728.png",
  },
  {
    author_key: "jess",
    caption: "Friends Saturday energy still going — one more hang?",
    media_ref: "/figma-v2/home-201/media-memory-friends-1728.png",
  },
  {
    author_key: "alex",
    caption: "Temporary share from downtown — disappears, memory stays.",
    media_ref: "/demo/moments/portrait.jpg",
  },
  {
    author_key: "alex",
    caption: "Walked the same block twice — still good with this crew.",
    media_ref: "/demo/moments/restaurant.jpg",
  },
];
const INTENTIONAL_CAPTIONS = new Set(INTENTIONAL_SOCIAL.map((c) => c.caption));

/** TemporaryStories — Story ≠ Memory; same densification people. */
const INTENTIONAL_STORIES = [
  {
    author_key: "walk_a",
    caption: "Overlook check-in",
    media_ref: "/figma-v2/home-201/media-travel-carousel-1728.png",
  },
  {
    author_key: "walk_b",
    caption: "Golden hour walk",
    media_ref: "/figma-v2/home-201/media-maya.png",
  },
  {
    author_key: "jordan",
    caption: "Who's free tonight?",
    media_ref: "/demo/moments/restaurant.jpg",
  },
  {
    author_key: "chris",
    caption: "Table's almost ours",
    media_ref: "/figma-v2/home-201/media-juniper.png",
  },
  {
    author_key: "jess",
    caption: "Late dessert run",
    media_ref: "/demo/moments/food.jpg",
  },
  {
    author_key: "alex",
    caption: "Temporary share — disappears.",
    media_ref: "/demo/moments/portrait.jpg",
  },
];

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

function assertHygieneOnly(session, expected) {
  if (!HYGIENE_PHONES.has(expected.phone)) {
    throw new Error(`REFUSED: phone ${expected.phone} not in Walk A/B hygiene allow-list`);
  }
  if (session.userId && !HYGIENE_USER_IDS.has(session.userId)) {
    throw new Error(
      `REFUSED: activated user ${session.userId} is not Walk A/B canonical id`,
    );
  }
}

function assertDensifyPhone(phone) {
  if (!DENSIFY_PHONES.has(phone)) {
    throw new Error(`REFUSED: densify phone ${phone} not in +12025550101…0106`);
  }
}

async function loadSessions() {
  if (existsSync(TOKEN_CACHE) && !process.env.HYGIENE_FORCE_OTP) {
    try {
      const cached = JSON.parse(readFileSync(TOKEN_CACHE, "utf8"));
      if (cached?.a?.token && cached?.b?.token) {
        if (
          HYGIENE_USER_IDS.has(cached.a.userId) &&
          HYGIENE_USER_IDS.has(cached.b.userId)
        ) {
          const probe = await json("/api/v1/product/conversations", {
            bearer: cached.a.token,
          });
          if (probe.ok) {
            return {
              a: { ...cached.a, phone: WALK_A.phone, key: "walk_a" },
              b: { ...cached.b, phone: WALK_B.phone, key: "walk_b" },
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
  assertHygieneOnly(a, WALK_A);
  assertHygieneOnly(b, WALK_B);
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
    a: { ...a, phone: WALK_A.phone, key: "walk_a" },
    b: { ...b, phone: WALK_B.phone, key: "walk_b" },
    source: "activate",
  };
}

async function activateDensifyAuthors(walkA, walkB) {
  const byKey = {
    walk_a: walkA,
    walk_b: walkB,
  };
  const activated = [];
  const failures = [];
  for (const fix of [JORDAN, CHRIS, JESS, ALEX]) {
    assertDensifyPhone(fix.phone);
    try {
      const s = await activate(fix);
      byKey[fix.key] = {
        ...s,
        phone: fix.phone,
        key: fix.key,
        name: s.name || fix.name,
        handle: fix.handle,
      };
      activated.push(fix.key);
    } catch (e) {
      failures.push({
        key: fix.key,
        phone: fix.phone,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return { byKey, activated, failures };
}

async function ensureDyad(viewer, peer) {
  if (!viewer?.token || !peer?.userId || viewer.userId === peer.userId) {
    return { ok: false, skipped: true };
  }
  const r = await json("/api/v1/product/conversations/direct", {
    method: "POST",
    bearer: viewer.token,
    body: JSON.stringify({ peer_user_id: peer.userId }),
  });
  return {
    ok: r.ok,
    status: r.status,
    conversation_id: r.body?.conversation_id || r.body?.id || null,
    error: r.ok ? undefined : r.body?.error || r.body?.message,
  };
}

async function uploadLocalMedia(session, mediaRef) {
  if (!mediaRef || !mediaRef.startsWith("/")) return null;
  const abs = resolve(PUBLIC, mediaRef.replace(/^\//, ""));
  if (!existsSync(abs)) return null;
  const buf = readFileSync(abs);
  // Keep densify uploads bounded — skip huge assets (>900KB).
  if (buf.byteLength > 900_000) return null;
  const mime = abs.endsWith(".png")
    ? "image/png"
    : abs.endsWith(".webp")
      ? "image/webp"
      : "image/jpeg";
  const r = await json("/api/v1/product/social-moments/media", {
    method: "POST",
    bearer: session.token,
    body: JSON.stringify({
      base64: buf.toString("base64"),
      mime_type: mime,
    }),
  });
  if (!r.ok) return null;
  return r.body?.media?.id || null;
}

async function softDeleteDemoMemories(label, session) {
  assertHygieneOnly(session, label === "WALK_A" ? WALK_A : WALK_B);
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

async function ensureIntentionalSocialHome(byKey, walkB) {
  const feed = await json("/api/v1/product/home/feed?limit=80", {
    bearer: walkB.token,
  });
  const objects = feed.body?.objects || [];
  const present = new Set(
    objects.map((o) => String(o.caption || "")).filter((c) => INTENTIONAL_CAPTIONS.has(c)),
  );
  const created = [];
  const failures = [];
  const authorsUsed = new Set();
  const mediaAttached = [];

  // Friend visibility for non-A/B authors needs a dyad with Walk B.
  const dyadResults = {};
  for (const key of Object.keys(byKey)) {
    if (key === "walk_b") continue;
    const peer = byKey[key];
    if (!peer?.userId) continue;
    dyadResults[key] = await ensureDyad(walkB, peer);
  }

  for (const item of INTENTIONAL_SOCIAL) {
    if (present.has(item.caption)) continue;
    const author = byKey[item.author_key];
    if (!author?.token) {
      failures.push({
        caption: item.caption,
        author_key: item.author_key,
        error: "author_session_missing",
      });
      continue;
    }
    assertDensifyPhone(author.phone);
    const audience = [walkB.userId, byKey.walk_a?.userId].filter(
      (id) => id && id !== author.userId,
    );
    const mediaId = await uploadLocalMedia(author, item.media_ref);
    const body = {
      caption: item.caption,
      // specific_people keeps densify reliable without requiring every pair friended.
      visibility: "specific_people",
      audience_user_ids: audience,
    };
    if (mediaId) {
      body.media_ids = [mediaId];
      mediaAttached.push(item.caption);
    }
    const r = await json("/api/v1/product/social-moments", {
      method: "POST",
      bearer: author.token,
      body: JSON.stringify(body),
    });
    if (r.ok) {
      created.push(item.caption);
      present.add(item.caption);
      authorsUsed.add(item.author_key);
    } else {
      failures.push({
        caption: item.caption,
        author_key: item.author_key,
        status: r.status,
        error: r.body?.error,
      });
    }
  }
  const after = await json("/api/v1/product/home/feed?limit=80", {
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
    target_count: INTENTIONAL_SOCIAL.length,
    authors_used: [...authorsUsed],
    media_attached: mediaAttached.length,
    dyads: dyadResults,
    failures,
    captions: intentional.map((o) => o.caption),
  };
}

async function ensureIntentionalStories(byKey, walkB) {
  const listed = await json("/api/v1/product/stories", { bearer: walkB.token });
  const existing = listed.body?.stories || [];
  const presentCaptions = new Set(
    existing.map((s) => String(s.caption || "").trim()).filter(Boolean),
  );
  const created = [];
  const failures = [];
  const blockers = [];

  for (const item of INTENTIONAL_STORIES) {
    if (presentCaptions.has(item.caption)) continue;
    const author = byKey[item.author_key];
    if (!author?.token) {
      failures.push({
        caption: item.caption,
        author_key: item.author_key,
        error: "author_session_missing",
      });
      continue;
    }
    assertDensifyPhone(author.phone);
    // TemporaryStory friends visibility requires RelationshipGraph friend edge.
    if (author.userId !== walkB.userId) {
      await ensureDyad(walkB, author);
    }
    const r = await json("/api/v1/product/stories", {
      method: "POST",
      bearer: author.token,
      body: JSON.stringify({
        media_ref: item.media_ref,
        visibility: "friends",
        caption: item.caption,
      }),
    });
    if (r.ok) {
      created.push({
        caption: item.caption,
        author_key: item.author_key,
        id: r.body?.story?.id,
      });
      presentCaptions.add(item.caption);
    } else {
      failures.push({
        caption: item.caption,
        author_key: item.author_key,
        status: r.status,
        error: r.body?.error || r.body?.message,
      });
    }
  }

  const after = await json("/api/v1/product/stories", { bearer: walkB.token });
  const afterStories = after.body?.stories || [];
  if (afterStories.length === 0 && created.length === 0) {
    blockers.push(
      "TemporaryStory list empty for Walk B — UI must not prefer FOUNDER_STORIES when production stories later appear (resolveHomeStories).",
    );
  }
  return {
    created: created.length,
    present_for_walk_b: afterStories.length,
    target_count: INTENTIONAL_STORIES.length,
    failures,
    blockers,
    sample: afterStories.slice(0, 8).map((s) => ({
      id: s.id,
      author: s.author_name,
      caption: s.caption,
      media_ref: s.media_ref,
    })),
    note:
      "POST /api/v1/product/stories exists. Friends visibility needs dyad/establishment with Walk B. Production rail prefers API stories over FOUNDER_STORIES when present.",
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
  assertHygieneOnly(a, WALK_A);
  assertHygieneOnly(b, WALK_B);
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

  const densify = await activateDensifyAuthors(a, b);
  console.log(
    `densify authors activated=${densify.activated.join(",") || "none"} failures=${densify.failures.length}`,
  );

  const socialHome = await ensureIntentionalSocialHome(densify.byKey, b);
  console.log(
    `intentional social home created=${socialHome.created} present=${socialHome.present} feed_b=${socialHome.feed_b_count}/${socialHome.target_count}`,
  );

  const stories = await ensureIntentionalStories(densify.byKey, b);
  console.log(
    `intentional stories created=${stories.created} present_b=${stories.present_for_walk_b}/${stories.target_count}`,
  );
  if (stories.blockers.length) {
    console.log(`story blockers: ${stories.blockers.join(" | ")}`);
  }

  const evidence = {
    started,
    finished: new Date().toISOString(),
    FIXTURE_GENERATION_ID: randomUUID(),
    api: API,
    session_source: source,
    allow_list: {
      hygiene_phones: [...HYGIENE_PHONES],
      hygiene_user_ids: [...HYGIENE_USER_IDS],
      densify_phones: [...DENSIFY_PHONES],
    },
    policy:
      "Hygiene: Walk A/B only soft-delete demo SocialMoments + mark-read except Fort Oak. Densify: activate +12025550101…0106, seed ~12–16 multi-author SOCIAL SocialMoments + TemporaryStories for Walk B Home. Optional FOUNDER_FIXTURE_RESET_DB=1. Track B untouched.",
    fort_oak_conversation_id: FORT_OAK_CONV,
    fort_oak_preview_after_db_reset: fortOakPreview,
    fort_oak_preview_clean: fortOakClean,
    demo_captions: [...DEMO_CAPTIONS],
    intentional_social_captions: [...INTENTIONAL_CAPTIONS],
    intentional_social_count: INTENTIONAL_SOCIAL.length,
    densify_authors: densify,
    social_home: socialHome,
    temporary_stories: stories,
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
      socialHome.feed_b_count >= 8 &&
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
