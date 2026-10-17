/**
 * Repair #18 - cumulative founder regression suite harness.
 *
 * Shared plumbing for every case in shots/regression/cases/.
 * Cases assert on the API OUTPUT a surface renders (shape + values) -
 * the founder contract law - never on internal server state.
 *
 * Sessions (first match wins):
 *   1. OPAL_MINTED_SESSIONS_JSON - the minted walk-session file used by
 *      the _repair10/_consumer_reality_gate scripts:
 *      { "sessions": [ { "role": "a"|"b", "token": "...", "userId": "...",
 *                        "name": "...", "handle": "..." } ] }
 *   2. OPAL_TOKEN_A / OPAL_TOKEN_B (+ optional OPAL_USER_A / OPAL_USER_B)
 *   3. OPAL_SESSION_PROVISION=synthetic - provision fresh sessions through
 *      the product activation API (POST /activation/challenges +
 *      /activation/verify). Local/dev stacks only: the synthetic SMS
 *      provider's codes are deterministic fixtures. NEVER use this mode
 *      against a production_sms stack.
 *
 * Seed mode: OPAL_SEED_MODE=1 calls the founder seed endpoints for
 * session A (communication + graph commitment), exactly the provisioning
 * the walk path performs under opal_founder_seed=1. The seed provisions
 * REAL backend users, conversations and plans (Repair #17 law).
 */
import fs from "node:fs";

export const API_PREFIX = "/api/v1/product";

const SYNTHETIC_CODES = {
  "+12025550101": "111111",
  "+12025550102": "222222",
  "+12025550103": "333333",
  "+12025550104": "444444",
  "+12025550105": "555555",
  "+12025550106": "666666",
  "+12025550107": "777777",
  "+12025550108": "888888",
};

export function loadConfig(env = process.env) {
  const apiBase = (env.OPAL_API_BASE || "http://127.0.0.1:4000").replace(/\/$/, "");
  return {
    apiBase,
    webBase: (env.OPAL_WEB_BASE || "").replace(/\/$/, "") || null,
    seedMode: env.OPAL_SEED_MODE === "1",
    runTag:
      env.OPAL_RUN_TAG ||
      `r${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`,
    env,
  };
}

/** One ApiClient per session. Counts requests by route pattern so cases
 *  can assert switch discipline (FR-18-05) from the client's own calls. */
export class ApiClient {
  constructor(config, session) {
    this.config = config;
    this.session = session; // { role, token, userId, name, handle }
    this.counts = new Map(); // "METHOD /route/pattern" -> n
    this.switchPosts = 0;
  }

  countKey(method, path) {
    return `${method} ${path.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id")}`;
  }

  async request(method, path, body) {
    const key = this.countKey(method, path);
    this.counts.set(key, (this.counts.get(key) || 0) + 1);
    if (method === "POST" && /\/opal\/conversations\/[^/]+\/switch$/.test(path)) {
      this.switchPosts += 1;
    }
    let res;
    try {
      res = await fetch(`${this.config.apiBase}${API_PREFIX}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.session.token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body == null ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      const err = new Error(`harness: ${method} ${path} network error: ${e.message}`);
      err.harness = true;
      throw err;
    }
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  }

  get(path) {
    return this.request("GET", path);
  }
  post(path, body = {}) {
    return this.request("POST", path, body);
  }
  patch(path, body = {}) {
    return this.request("PATCH", path, body);
  }
}

async function provisionSynthetic(config, phone, name) {
  const code = SYNTHETIC_CODES[phone];
  if (!code) {
    throw new Error(
      `harness: no synthetic code known for ${phone}; synthetic provisioning supports the fixture numbers only`,
    );
  }
  const base = `${config.apiBase}${API_PREFIX}`;
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  // Unique per provision call: a reused device label / idempotency key
  // makes the backend hand back the already-consumed challenge (409
  // replay) instead of a fresh one.
  const deviceLabel = `r18-regression-${config.runTag}-${Math.floor(
    Math.random() * 1e9,
  ).toString(36)}`;
  const chRes = await fetch(`${base}/activation/challenges`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      phone,
      device_label: deviceLabel,
      idempotency_key: deviceLabel,
      otp_consent_accepted: true,
    }),
  });
  const ch = await chRes.json().catch(() => ({}));
  const challengeId = ch.challenge_id || ch.challenge?.id || ch.id;
  if (!challengeId) {
    throw new Error(
      `harness: activation challenge failed for ${phone}: status=${chRes.status} ${JSON.stringify(ch).slice(0, 200)}`,
    );
  }
  const vRes = await fetch(`${base}/activation/verify`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      challenge_id: challengeId,
      code,
      phone,
      display_name: name,
      include_bearer: true,
      device_label: deviceLabel,
    }),
  });
  const v = await vRes.json().catch(() => ({}));
  const token = v.session?.access_token;
  const userId = v.session?.user_id || v.user?.id || v.account?.id;
  if (!token || !userId) {
    throw new Error(
      `harness: activation verify failed for ${phone}: status=${vRes.status} ${JSON.stringify(v).slice(0, 200)}`,
    );
  }
  return { token, userId, name, phone };
}

export async function loadSessions(config) {
  const env = config.env;
  const sessions = {};

  const mintPath =
    env.OPAL_MINTED_SESSIONS_JSON ||
    (fs.existsSync("/tmp/opal_minted_walk_sessions.json")
      ? "/tmp/opal_minted_walk_sessions.json"
      : null);

  if (mintPath && fs.existsSync(mintPath)) {
    const mint = JSON.parse(fs.readFileSync(mintPath, "utf8"));
    for (const s of mint.sessions || []) {
      const role = (s.role || "").toLowerCase();
      if (role === "a" || role === "b") {
        sessions[role] = {
          role,
          token: s.token,
          userId: s.userId || s.user_id,
          name: s.name || null,
          handle: s.handle || null,
          source: "minted",
        };
      }
    }
  }

  if (!sessions.a && env.OPAL_TOKEN_A) {
    sessions.a = {
      role: "a",
      token: env.OPAL_TOKEN_A,
      userId: env.OPAL_USER_A || null,
      name: "Session A",
      source: "env-token",
    };
  }
  if (!sessions.b && env.OPAL_TOKEN_B) {
    sessions.b = {
      role: "b",
      token: env.OPAL_TOKEN_B,
      userId: env.OPAL_USER_B || null,
      name: "Session B",
      source: "env-token",
    };
  }

  if (!sessions.a && env.OPAL_SESSION_PROVISION === "synthetic") {
    const s = await provisionSynthetic(
      config,
      env.OPAL_PHONE_A || "+12025550101",
      env.OPAL_NAME_A || "Regression A",
    );
    sessions.a = { role: "a", ...s, source: "synthetic" };
  }
  if (!sessions.b && env.OPAL_SESSION_PROVISION === "synthetic") {
    const s = await provisionSynthetic(
      config,
      env.OPAL_PHONE_B || "+12025550102",
      env.OPAL_NAME_B || "Regression B",
    );
    sessions.b = { role: "b", ...s, source: "synthetic" };
  }

  if (!sessions.a) {
    const err = new Error(
      "harness: no session A. Provide OPAL_MINTED_SESSIONS_JSON, OPAL_TOKEN_A, or OPAL_SESSION_PROVISION=synthetic (local/dev only).",
    );
    err.harness = true;
    throw err;
  }
  // Resolve a missing userId through the session endpoint.
  for (const role of ["a", "b"]) {
    const s = sessions[role];
    if (s && !s.userId) {
      const client = new ApiClient(config, s);
      const me = await client.get("/session");
      s.userId = me.json?.user?.id || me.json?.session?.user_id || me.json?.user_id || null;
      if (!s.userId) {
        const err = new Error(`harness: could not resolve userId for session ${role}`);
        err.harness = true;
        throw err;
      }
    }
  }
  return sessions;
}

/** Provision one extra synthetic session (local/dev only). Returns an
 *  ApiClient, or null when synthetic provisioning is not in use. Cases
 *  use this for a fresh randomized account pair so seed familiarity -
 *  or a throttle bucket the seed burned - cannot hide a failure. */
export async function freshSyntheticClient(config, phone, name) {
  if (config.env.OPAL_SESSION_PROVISION !== "synthetic") return null;
  const s = await provisionSynthetic(config, phone, name);
  return new ApiClient(config, { role: "extra", ...s, source: "synthetic" });
}

/** Founder seed provisioning for session A (seed mode only). Idempotent
 *  on the backend; safe to call once per run. */
export async function runFounderSeed(client) {
  const comm = await client.post("/dev/founder-communication-seed", {
    explicit_opt_in: true,
  });
  const graph = await client.post("/dev/founder-graph-commitment-seed", {
    explicit_opt_in: true,
  });
  return { comm, graph };
}

/** Soft assertions: a case collects every failure so the report names
 *  every failing surface, not just the first. */
export class CaseAssert {
  constructor() {
    this.failures = []; // { surface, message }
    this.notes = [];
    this.checks = 0;
  }
  check(surface, cond, message) {
    this.checks += 1;
    if (!cond) this.failures.push({ surface, message });
    return !!cond;
  }
  eq(surface, actual, expected, message) {
    return this.check(
      surface,
      actual === expected,
      `${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`,
    );
  }
  note(message) {
    this.notes.push(message);
  }
}

/** Build the per-case context: clients, helpers bound to real endpoints. */
export function makeCtx(config, sessions, assert) {
  const clients = {};
  for (const [role, s] of Object.entries(sessions)) {
    clients[role] = new ApiClient(config, s);
  }
  const A = clients.a;
  const B = clients.b || null;

  const helpers = {
    /** Center send; returns { status, messages, opal } where opal is the
     *  stored Opal reply from the POST response contract. */
    async centerSend(client, body, opts = {}) {
      const r = await client.post("/opal/conversation/messages", {
        body,
        ...(opts.conversationId ? { conversation_id: opts.conversationId } : {}),
        ...(opts.clientMessageId ? { client_message_id: opts.clientMessageId } : {}),
      });
      const messages = r.json.messages || [];
      const opal = [...messages].reverse().find((m) => m.role === "opal") || null;
      return { status: r.status, json: r.json, messages, opal };
    },
    async centerConversation(client) {
      const r = await client.get("/opal/conversation");
      return { status: r.status, conversation: r.json.conversation || null };
    },
    async centerSessions(client) {
      const r = await client.get("/opal/conversations");
      return { status: r.status, sessions: r.json.conversations || [] };
    },
    async centerSwitch(client, id) {
      return client.post(`/opal/conversations/${encodeURIComponent(id)}/switch`, {});
    },
    async centerNewChat(client) {
      const r = await client.post("/opal/conversation/new", {});
      return { status: r.status, conversation: r.json.conversation || null, json: r.json };
    },
    /** Owner-scoped plan listing - the API output Graphs/Timeline render. */
    async listPlans(client, all = false) {
      const r = await client.get(`/opal/plans${all ? "?status=all" : ""}`);
      return { status: r.status, plans: r.json.plans || [] };
    },
    async createCenterPlan(client, attrs) {
      const r = await client.post("/opal/plans", attrs);
      return { status: r.status, json: r.json, plan: r.json.plan || null };
    },
    async createGraphPlan(client, attrs) {
      const r = await client.post("/opal/plans/graph-create", attrs);
      return {
        status: r.status,
        json: r.json,
        plan: r.json.plan || null,
        deduplicated: r.json.deduplicated,
      };
    },
    /** Human conversations list - the API output the Chats list renders,
     *  including plan_projection per conversation. */
    async listConversations(client) {
      const r = await client.get("/conversations");
      return { status: r.status, conversations: r.json.conversations || [], json: r.json };
    },
    async ensureDirect(client, peerUserId) {
      const r = await client.post("/conversations/direct", { peer_user_id: peerUserId });
      return { status: r.status, json: r.json, conversationId: r.json.conversation_id || null };
    },
    async createGroup(client, memberIds, label) {
      const r = await client.post("/conversations/group", {
        member_user_ids: memberIds,
        label,
      });
      return { status: r.status, json: r.json, conversationId: r.json.conversation_id || r.json.id || null };
    },
    async postHumanMessage(client, conversationId, body) {
      const r = await client.post(
        `/conversations/${encodeURIComponent(conversationId)}/messages`,
        { body },
      );
      return { status: r.status, json: r.json, message: r.json.message || null };
    },
    async getHumanMessages(client, conversationId) {
      const r = await client.get(
        `/conversations/${encodeURIComponent(conversationId)}/messages`,
      );
      return { status: r.status, json: r.json, messages: r.json.messages || [] };
    },
    async getAlignment(client, conversationId) {
      const r = await client.get(
        `/conversations/${encodeURIComponent(conversationId)}/alignment`,
      );
      return { status: r.status, alignment: r.json.alignment || null, json: r.json };
    },
    async createConversationPlan(client, conversationId, attrs) {
      const r = await client.post(
        `/conversations/${encodeURIComponent(conversationId)}/plans`,
        attrs,
      );
      return { status: r.status, json: r.json, plan: r.json.plan || null, participants: r.json.participants || [] };
    },
    /** Center Now strip - the API output the Center header renders. */
    async calendarToday(client) {
      const r = await client.get("/calendar/today");
      return { status: r.status, events: r.json.events || [], json: r.json };
    },
    /** Coarse device-location grant (the real Center location path). */
    async grantLocation(client, lat, lng) {
      const r = await client.post("/opal/location", {
        lat,
        lng,
        origin_source: "device",
      });
      return { status: r.status, json: r.json };
    },
  };

  return {
    config,
    sessions,
    clients,
    A,
    B,
    assert,
    h: helpers,
    tag: config.runTag,
    /** Unique marker text for this run, e.g. marker("topic") -> "R18T <tag> topic" */
    marker: (label) => `R18REG ${config.runTag} ${label}`,
  };
}

/** Deep-search a JSON value for any of the given key names; returns the
 *  list of { path, value } hits. Used for conflict/attendance contract
 *  fields whose exact nesting is the thing under test. */
export function findKeys(value, names, path = "$", out = []) {
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (names.includes(k)) out.push({ path: `${path}.${k}`, value: v });
      findKeys(v, names, `${path}.${k}`, out);
    }
  }
  return out;
}

/** Extract an attendance pair { going, total } from any of the contract
 *  shapes a surface could lawfully carry. Returns null when the surface
 *  output carries no attendance at all - itself the FR-18-04 defect. */
export function extractAttendance(obj, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 6) return null;
  const direct = [
    ["going_count", "participant_total"],
    ["going_count", "total_participants"],
    ["going", "total"],
  ];
  for (const [g, t] of direct) {
    if (typeof obj[g] === "number" && typeof obj[t] === "number") {
      return { going: obj[g], total: obj[t] };
    }
  }
  if (typeof obj.going_count === "number" && Array.isArray(obj.participants)) {
    return { going: obj.going_count, total: obj.participants.length };
  }
  if (Array.isArray(obj.participants) && obj.participants.length > 0) {
    const going = obj.participants.filter(
      (p) => p.response_state === "accepted",
    ).length;
    return { going, total: obj.participants.length };
  }
  // Descend: projections nest under plan_projection / plan / alignment /
  // journey / participation / attendance keys.
  for (const key of [
    "attendance",
    "plan_projection",
    "plan",
    "alignment",
    "journey",
    "participation",
  ]) {
    if (obj[key] && typeof obj[key] === "object") {
      const a = extractAttendance(obj[key], depth + 1);
      if (a) return a;
    }
  }
  return null;
}

/** All string values in a JSON tree (for time read-back searches). */
export function allStrings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => allStrings(v, out));
  else if (value && typeof value === "object") {
    Object.values(value).forEach((v) => allStrings(v, out));
  }
  return out;
}
