/**
 * Multi-session BEAM engagement authority proof (Like/Comment/Save/Repost/Story/Home feed).
 * HOLD. DO NOT MERGE.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { activate } from "./founder_proof_fixture.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const API = (process.env.API_BASE || "http://127.0.0.1:4000").replace(/\/$/, "");
const OUT = resolve(
  ROOT,
  "docs/evidence/v2-coded-experience/social-flow-final-convergence",
);
mkdirSync(OUT, { recursive: true });

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
    const err = new Error(body.error || body.message || res.statusText);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

async function main() {
  const result = {
    at: new Date().toISOString(),
    founderResetUrl: "http://127.0.0.1:5173/?opal_reset_first_run=1",
    assertions: {},
    verdict: "HOLD",
  };
  let passed = 0;
  let failed = 0;
  const assert = (name, ok, detail) => {
    result.assertions[name] = { ok: !!ok, detail: detail || null };
    if (ok) passed += 1;
    else failed += 1;
  };

  const A = await activate({
    phone: "+12025550101",
    name: "Founder Review",
    handle: "founder_rev",
    code: "111111",
  });
  const E = await activate({
    phone: "+12025550108",
    name: "Unauthorized Eve",
    handle: "eve_rev",
    code: "888888",
  });

  // Session A publishes Memory
  const pub = await json("/api/v1/product/social-moments", {
    method: "POST",
    bearer: A.token,
    body: JSON.stringify({
      caption: "Authority proof Memory",
      visibility: "friends",
      media_ids: [],
    }),
  });
  const momentId = pub.moment?.id || pub.moment_id;
  assert("publish_memory", !!momentId, momentId);

  // Like on session A
  const like1 = await json(`/api/v1/product/social-moments/${momentId}/like`, {
    method: "PUT",
    bearer: A.token,
    body: "{}",
  });
  assert("like_a", like1.viewer_liked === true && like1.like_count === 1, like1);

  // Second "browser" — re-activate A and verify like remains
  const A2 = await activate({
    phone: "+12025550101",
    name: "Founder Review",
    handle: "founder_rev",
    code: "111111",
  });
  const show = await json(`/api/v1/product/social-moments/${momentId}`, {
    bearer: A2.token,
  });
  assert(
    "like_survives_session",
    show.moment?.viewer_liked === true && show.moment?.like_count >= 1,
    show.moment,
  );

  // Comment
  const c1 = await json(`/api/v1/product/social-moments/${momentId}/comments`, {
    method: "POST",
    bearer: A.token,
    body: JSON.stringify({ body: "Looks durable" }),
  });
  assert("comment_create", c1.comment_count >= 1, c1);
  const cList = await json(`/api/v1/product/social-moments/${momentId}/comments`, {
    bearer: A2.token,
  });
  assert(
    "comment_survives_session",
    (cList.comments || []).some((c) => c.body === "Looks durable"),
    cList,
  );

  // Repost + Save
  const rp = await json(`/api/v1/product/social-moments/${momentId}/repost`, {
    method: "PUT",
    bearer: A.token,
    body: "{}",
  });
  assert("repost", rp.viewer_reposted === true, rp);
  const sv = await json(`/api/v1/product/social-moments/${momentId}/save`, {
    method: "PUT",
    bearer: A.token,
    body: "{}",
  });
  assert("save", sv.viewer_saved === true, sv);
  const show2 = await json(`/api/v1/product/social-moments/${momentId}`, {
    bearer: A2.token,
  });
  assert("repost_reload", show2.moment?.viewer_reposted === true, show2.moment);
  assert("save_reload", show2.moment?.viewer_saved === true, show2.moment);

  // Story
  const story = await json("/api/v1/product/stories", {
    method: "POST",
    bearer: A.token,
    body: JSON.stringify({
      media_ref: "/demo/moments/portrait.jpg",
      visibility: "close_circle",
      caption: "temp",
    }),
  });
  assert("story_create", !!story.story?.id && story.story?.not_memory === true, story.story);
  const stories = await json("/api/v1/product/stories", { bearer: A2.token });
  assert(
    "story_survives_session",
    (stories.stories || []).some((s) => s.id === story.story.id),
    stories,
  );

  // Bad actor E denied private
  const priv = await json("/api/v1/product/social-moments", {
    method: "POST",
    bearer: A.token,
    body: JSON.stringify({ caption: "private only", visibility: "private", media_ids: [] }),
  });
  const privId = priv.moment?.id;
  let denied = false;
  try {
    await json(`/api/v1/product/social-moments/${privId}/comments`, {
      method: "POST",
      bearer: E.token,
      body: JSON.stringify({ body: "intrude" }),
    });
  } catch (e) {
    denied = e.status === 403 || /DENIED/i.test(String(e.message));
  }
  assert("bad_actor_private_comment_denied", denied);

  // Home feed production mode
  const feed = await json("/api/v1/product/home/feed", { bearer: A.token });
  assert(
    "home_feed_production",
    feed.mode === "PRODUCTION_HYDRATION" &&
      feed.fixture_injected === false &&
      (feed.objects || []).some((o) => o.id === momentId),
    { count: feed.objects?.length, mode: feed.mode },
  );

  // Unlike idempotency
  await json(`/api/v1/product/social-moments/${momentId}/like`, {
    method: "DELETE",
    bearer: A.token,
  });
  const likeAgain = await json(`/api/v1/product/social-moments/${momentId}/like`, {
    method: "PUT",
    bearer: A.token,
    body: "{}",
  });
  const likeIdem = await json(`/api/v1/product/social-moments/${momentId}/like`, {
    method: "PUT",
    bearer: A.token,
    body: "{}",
  });
  assert("like_idempotent", likeAgain.like_count === 1 && likeIdem.like_count === 1, {
    likeAgain,
    likeIdem,
  });

  result.browserAssertions = { passed, failed, total: passed + failed };
  result.verdict = failed === 0 ? "HOLD_SERVER_AUTHORITY_PASS" : "HOLD_SERVER_AUTHORITY_PARTIAL";
  writeFileSync(resolve(OUT, "BROWSER_PROOF_SOCIAL_SERVER_AUTHORITY.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
