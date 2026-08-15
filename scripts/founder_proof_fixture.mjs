#!/usr/bin/env node
/**
 * Deterministic founder proof fixture — owns its own episode objects.
 *
 * Does NOT change SocialReality / next_gap production semantics.
 * Creates a namespaced conversation in known place-open state for TIME→PLACE proof.
 *
 * Usage:
 *   node scripts/founder_proof_fixture.mjs
 *   PROOF_EPISODE=manual-1 node scripts/founder_proof_fixture.mjs
 *
 * Writes:
 *   docs/evidence/v2-coded-experience/live-closure/FOUNDER_PROOF_FIXTURE.json
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = resolve(ROOT, "docs/evidence/v2-coded-experience/live-closure");
const OUT = resolve(OUT_DIR, "FOUNDER_PROOF_FIXTURE.json");
const API = (process.env.API_BASE || "http://127.0.0.1:4000").replace(/\/$/, "");

const FOUNDER = {
  phone: "+12025550101",
  name: "Founder Review",
  handle: "founder_rev",
  code: "111111",
};
const JORDAN = {
  phone: "+12025550103",
  name: "Jordan Lee",
  handle: "jordan_rev",
  code: "333333",
};

/** Stable-ish episode: each prepare gets unique id unless PROOF_EPISODE set for reuse within a session of runs that should not mutate. */
export function episodeId() {
  if (process.env.PROOF_EPISODE) return String(process.env.PROOF_EPISODE);
  // Default: new episode per prepare so live proof runs never inherit mature threads.
  return `t2p-${Date.now().toString(36)}`;
}

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
  if (!res.ok) {
    const err = new Error(body.message || res.statusText || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

/** Cache activations within one Node process to avoid OTP rate limits on --repeat. */
const _sessionCache = new Map();

export async function activate(user) {
  const cacheKey = user.phone;
  if (_sessionCache.has(cacheKey)) {
    return _sessionCache.get(cacheKey);
  }
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const ch = await json("/api/v1/product/activation/challenges", {
        method: "POST",
        body: JSON.stringify({
          otp_consent_accepted: true,
          phone: user.phone,
          device_label: `${user.handle}-proof`,
          idempotency_key: `proof-ch-${user.handle}-${Date.now()}-${attempt}`,
        }),
      });
      const code = ch.development_code || user.code;
      const verified = await json("/api/v1/product/activation/verify", {
        method: "POST",
        body: JSON.stringify({
          challenge_id: ch.challenge.id,
          code,
          display_name: user.name,
          handle_hint: user.handle,
          device_label: `${user.handle}-proof`,
          platform: "web",
          include_bearer: true,
        }),
      });
      const session = {
        token: verified.session?.access_token,
        userId: verified.user?.id,
        name: verified.user?.display_name || user.name,
      };
      _sessionCache.set(cacheKey, session);
      return session;
    } catch (e) {
      lastErr = e;
      // Rate limit / transient — backoff
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw lastErr || new Error("activation failed");
}

export async function send(token, conversationId, body, tag) {
  return json(`/api/v1/product/conversations/${conversationId}/messages`, {
    method: "POST",
    bearer: token,
    body: JSON.stringify({
      body,
      client_message_id: `proof-${tag}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    }),
  });
}

/**
 * Derive fixture next_gap from product signals — does not invent domain rules.
 */
export function deriveFixtureGap(messagesPayload) {
  const signals = messagesPayload?.signals || [];
  const primary = signals.find((s) => s.kind !== "proposal") || signals[0];
  const sr = primary?.shared_reality || {};
  const next =
    sr.next_gap ||
    primary?.next_gap ||
    (Array.isArray(sr.gaps) && sr.gaps.includes("where")
      ? "place"
      : Array.isArray(sr.gaps) && sr.gaps.includes("when")
        ? "time"
        : null);
  return {
    next_gap: next,
    what: sr.what || null,
    when: sr.when || null,
    where: sr.where || null,
    gaps: sr.gaps || [],
    label: primary?.label || sr.headline || null,
  };
}

/**
 * Canonical TIME→PLACE precondition.
 * Returns { ok, class: 'PASS'|'FIXTURE_FAIL', detail }
 */
export function assertJordanTimePlacePrecondition(state) {
  const when = String(state.when || state.label || "");
  const where = state.where;
  const gap = state.next_gap;
  const hasDinner = /dinner/i.test(String(state.what || state.label || ""));
  const hasThu =
    /thursday|thu/i.test(when) || /6:30|6\.30/.test(when);
  const placeOpen =
    !where ||
    (Array.isArray(state.gaps) && state.gaps.some((g) => /where|place/i.test(String(g))));

  if (gap === "place" && hasDinner && (hasThu || when) && placeOpen) {
    return {
      ok: true,
      class: "PASS",
      detail: `next_gap=place what=${state.what} when=${state.when}`,
    };
  }
  if (gap === "confirm_required_person" || gap === "participants") {
    return {
      ok: false,
      class: "FIXTURE_FAIL",
      detail: `episode matured to ${gap}; need fresh place-open episode, not product rewrite`,
    };
  }
  if (gap === "time") {
    return {
      ok: false,
      class: "FIXTURE_FAIL",
      detail: "expected time settled for place-open proof",
    };
  }
  if (where && gap !== "place") {
    return {
      ok: false,
      class: "FIXTURE_FAIL",
      detail: `where already set (${where}) gap=${gap}`,
    };
  }
  return {
    ok: false,
    class: "FIXTURE_FAIL",
    detail: `precondition unmet gap=${gap} what=${state.what} when=${state.when} where=${state.where}`,
  };
}

/**
 * Prepare a fresh owned Jordan dinner / time settled / place open conversation.
 */
export async function prepareJordanTimePlaceFixture(opts = {}) {
  mkdirSync(OUT_DIR, { recursive: true });
  const ep = opts.episodeId || episodeId();
  const founder = await activate(FOUNDER);
  const jordan = await activate(JORDAN);

  // Namespaced invite — never reuses mature historical Jordan dyads.
  const inv = await json("/api/v1/product/invitations", {
    method: "POST",
    bearer: founder.token,
    body: JSON.stringify({
      phone: JORDAN.phone,
      label: "Jordan Lee",
      message: `Proof episode ${ep}`,
      idempotency_key: `proof-inv-jordan-t2p-${ep}`,
    }),
  });

  let conversationId = inv.invitation?.conversation_id;
  if (!conversationId && inv.invitation?.id) {
    const accepted = await json(
      `/api/v1/product/invitations/${inv.invitation.id}/accept`,
      {
        method: "POST",
        bearer: jordan.token,
        body: JSON.stringify({}),
      },
    );
    conversationId = accepted.establishment?.conversation_id;
  } else if (inv.invitation?.id && inv.invitation?.status === "sent") {
    const accepted = await json(
      `/api/v1/product/invitations/${inv.invitation.id}/accept`,
      {
        method: "POST",
        bearer: jordan.token,
        body: JSON.stringify({}),
      },
    );
    conversationId = accepted.establishment?.conversation_id || conversationId;
  }

  if (!conversationId) {
    // Fallback: list newest dyad with Jordan created just now
    const list = await json("/api/v1/product/conversations", {
      bearer: founder.token,
    });
    const hit = (list.conversations || []).find((c) =>
      (c.peers || []).some((p) => /Jordan/i.test(p.display_name || "")),
    );
    conversationId = hit?.id;
  }

  if (!conversationId) {
    throw new Error("FIXTURE: could not create Jordan proof conversation");
  }

  // Seed ONLY this owned episode — fixed script, no reopen spam on mature threads.
  await send(founder.token, conversationId, "We should get dinner Thursday.", "j1");
  await send(
    jordan.token,
    conversationId,
    "I'm free after 6:30. Does Thursday work?",
    "j2",
  );
  await send(founder.token, conversationId, "I'm in.", "j3");
  await send(jordan.token, conversationId, "Works for me.", "j4");
  await send(
    founder.token,
    conversationId,
    "We should do something Italian but I don't know where yet.",
    "j5",
  );

  const msgs = await json(
    `/api/v1/product/conversations/${conversationId}/messages`,
    { bearer: founder.token },
  );
  const state = deriveFixtureGap(msgs);
  const pre = assertJordanTimePlacePrecondition(state);

  const fixture = {
    schema: "founder_proof_fixture.v1",
    episode_id: ep,
    purpose: "time_place_jordan",
    at: new Date().toISOString(),
    owned: {
      founder_phone: FOUNDER.phone,
      jordan_phone: JORDAN.phone,
      founder_user_id: founder.userId,
      jordan_user_id: jordan.userId,
      conversation_id: conversationId,
      invitation_id: inv.invitation?.id || null,
    },
    expected: {
      who: "Founder + Jordan",
      what: "Dinner",
      when: "Thursday · 6:30 PM",
      where: "open",
      next_gap: "place",
    },
    observed: state,
    precondition: pre,
  };

  writeFileSync(OUT, JSON.stringify(fixture, null, 2));
  writeFileSync(
    resolve(OUT_DIR, "SEED_CONVERSATION_IDS.json"),
    JSON.stringify(
      {
        jordan_place_open: conversationId,
        proof_episode_id: ep,
        at: fixture.at,
      },
      null,
      2,
    ),
  );

  return fixture;
}

export function loadFixture() {
  if (!existsSync(OUT)) return null;
  return JSON.parse(readFileSync(OUT, "utf8"));
}

// CLI
const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  prepareJordanTimePlaceFixture()
    .then((f) => {
      console.log(JSON.stringify(f, null, 2));
      if (!f.precondition.ok) {
        console.error("FIXTURE_FAIL", f.precondition.detail);
        process.exit(2);
      }
      console.log("FIXTURE_READY", f.owned.conversation_id);
    })
    .catch((e) => {
      console.error("ENVIRONMENT_FAIL", e.message || e);
      process.exit(1);
    });
}
