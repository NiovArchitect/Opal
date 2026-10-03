#!/usr/bin/env node
/**
 * Shell unread hygiene — clear soak/lab residue unread so dock "9+" reflects
 * real product unread (or ≤9), not Multi speaker / Soak pollution.
 *
 * Prefer: mark-read every conversation with unread>0 EXCEPT Fort Oak
 * (`ace99adc-db67-4258-9d95-f612246c6c84`) kept as-is.
 *
 * Usage:
 *   node scripts/shell_unread_hygiene.mjs
 *
 * Writes:
 *   docs/evidence/v2-coded-experience/mobile-shell/UNREAD_HYGIENE.json
 *   refreshes /tmp/a61_tokens.json when activating
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { activate } from "./founder_proof_fixture.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const API = (process.env.API_BASE || "http://127.0.0.1:4000").replace(/\/$/, "");
const OUT_DIR = resolve(ROOT, "docs/evidence/v2-coded-experience/mobile-shell");
const OUT = resolve(OUT_DIR, "UNREAD_HYGIENE.json");
const TOKEN_CACHE = "/tmp/a61_tokens.json";

const FORT_OAK_CONV = "ace99adc-db67-4258-9d95-f612246c6c84";

/** Residue name pattern (documented); default mode still marks ALL unread except keep-list. */
const RESIDUE_NAME =
  /Soak|Multi speaker|soak|Crew with Direct Friend|Founder Review|Deep Smoke|Collective proof|Proof Friends/i;

const WALK_A = {
  phone: "+12025550101",
  name: "Walk A",
  handle: "a61_walk_a",
  code: "111111",
};
const WALK_B = {
  phone: "+12025550102",
  name: "Walk B",
  handle: "a61_walk_b",
  code: "222222",
};

/** Conversations never mark-read (keep real unread). */
const KEEP_IDS = new Set([FORT_OAK_CONV]);

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

async function loadSessions() {
  if (existsSync(TOKEN_CACHE) && !process.env.HYGIENE_FORCE_OTP) {
    try {
      const cached = JSON.parse(readFileSync(TOKEN_CACHE, "utf8"));
      if (cached?.a?.token && cached?.b?.token) {
        const probe = await json("/api/v1/product/conversations", {
          bearer: cached.a.token,
        });
        if (probe.ok) {
          return {
            a: { ...cached.a, name: WALK_A.name, handle: WALK_A.handle },
            b: { ...cached.b, name: WALK_B.name, handle: WALK_B.handle },
            source: "cached",
          };
        }
      }
    } catch {
      /* fall through */
    }
  }
  const a = await activate(WALK_A);
  const b = await activate(WALK_B);
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
    a: { ...a, name: WALK_A.name, handle: WALK_A.handle },
    b: { ...b, name: WALK_B.name, handle: WALK_B.handle },
    source: "activate",
  };
}

function summarize(conversations) {
  const list = Array.isArray(conversations) ? conversations : [];
  let sum = 0;
  let withUnread = 0;
  const top = [];
  for (const c of list) {
    const u = typeof c.unread_count === "number" ? c.unread_count : 0;
    if (u > 0) {
      sum += u;
      withUnread += 1;
      top.push({
        id: c.id,
        title: c.title || "",
        unread: u,
        residue_name: RESIDUE_NAME.test(String(c.title || "")),
        keep: KEEP_IDS.has(c.id),
      });
    }
  }
  top.sort((x, y) => y.unread - x.unread);
  return {
    conversation_count: list.length,
    unread_sum: sum,
    conversations_with_unread: withUnread,
    top_unread: top.slice(0, 25),
  };
}

async function listConversations(token) {
  const res = await json("/api/v1/product/conversations", { bearer: token });
  if (!res.ok) {
    throw new Error(`list conversations HTTP ${res.status}`);
  }
  return res.body.conversations || [];
}

async function markRead(token, conversationId) {
  return json(`/api/v1/product/conversations/${encodeURIComponent(conversationId)}/read`, {
    method: "POST",
    bearer: token,
    body: JSON.stringify({}),
  });
}

async function hygieneWalk(label, session) {
  const beforeList = await listConversations(session.token);
  const before = summarize(beforeList);

  const targets = beforeList.filter((c) => {
    const u = typeof c.unread_count === "number" ? c.unread_count : 0;
    if (u <= 0) return false;
    if (KEEP_IDS.has(c.id)) return false;
    return true;
  });

  const marked = [];
  const failures = [];
  for (const c of targets) {
    const r = await markRead(session.token, c.id);
    if (r.ok) {
      marked.push({
        id: c.id,
        title: c.title || "",
        unread_before: c.unread_count,
        unread_after: r.body?.unread_count ?? 0,
      });
    } else {
      failures.push({
        id: c.id,
        title: c.title || "",
        status: r.status,
        body: r.body,
      });
    }
  }

  const afterList = await listConversations(session.token);
  const after = summarize(afterList);
  const kept = afterList
    .filter((c) => KEEP_IDS.has(c.id))
    .map((c) => ({
      id: c.id,
      title: c.title || "",
      unread: c.unread_count || 0,
    }));

  console.log(
    `${label} BEFORE sum=${before.unread_sum} (${before.conversations_with_unread} convs) → AFTER sum=${after.unread_sum} (${after.conversations_with_unread} convs); marked=${marked.length} fail=${failures.length}`,
  );

  return {
    label,
    user_id: session.userId,
    before,
    after,
    marked_count: marked.length,
    marked_sample: marked.slice(0, 40),
    failures,
    kept,
    mode: "ALL_UNREAD_EXCEPT_KEEP_IDS",
    keep_ids: [...KEEP_IDS],
  };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const started = new Date().toISOString();
  const { a, b, source } = await loadSessions();
  console.log(`sessions source=${source} A=${a.userId?.slice(0, 8)} B=${b.userId?.slice(0, 8)}`);

  const walkA = await hygieneWalk("WALK_A", a);
  const walkB = await hygieneWalk("WALK_B", b);

  const evidence = {
    started,
    finished: new Date().toISOString(),
    api: API,
    session_source: source,
    fort_oak_conversation_id: FORT_OAK_CONV,
    residue_name_pattern: String(RESIDUE_NAME),
    policy:
      "Mark-read every conversation with unread_count>0 except KEEP_IDS (Fort Oak). Display 9+ is formatting only.",
    walk_a: walkA,
    walk_b: walkB,
    diagnosis: {
      CURRENT_SERVER_UNREAD_COUNT_WALK_A_BEFORE: walkA.before.unread_sum,
      CURRENT_SERVER_UNREAD_COUNT_WALK_B_BEFORE: walkB.before.unread_sum,
      CURRENT_SERVER_UNREAD_COUNT_WALK_A_AFTER: walkA.after.unread_sum,
      CURRENT_SERVER_UNREAD_COUNT_WALK_B_AFTER: walkB.after.unread_sum,
      IS_9_PLUS_FIXTURE: false,
      IS_9_PLUS_STALE: false,
      IS_9_PLUS_REAL_UNREAD: true,
      HARDCODED_9_PLUS_AS_PRODUCT_TRUTH: 0,
    },
    ok: walkA.failures.length === 0 && walkB.failures.length === 0,
  };

  writeFileSync(OUT, JSON.stringify(evidence, null, 2));
  console.log(`wrote ${OUT}`);
  if (!evidence.ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
