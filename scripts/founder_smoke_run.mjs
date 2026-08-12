#!/usr/bin/env node
/**
 * Founder smoke / proof run — API + structured evidence.
 * Does not implement product features. Records PASS/FAIL only.
 *
 * Usage: node scripts/founder_smoke_run.mjs
 */
const API = (process.env.API_BASE || "http://127.0.0.1:4000").replace(/\/$/, "");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");

const F = { phone: "+12025550101", name: "Founder Review", handle: "founder_rev", codeHint: "111111" };
const MAYA = { phone: "+12025550102", name: "Maya Chen", handle: "maya_rev", codeHint: "222222" };
const JORDAN = { phone: "+12025550103", name: "Jordan Lee", handle: "jordan_rev", codeHint: "333333" };
const CHRIS = { phone: "+12025550104", name: "Chris Park", handle: "chris_rev", codeHint: "444444" };
const SAM = { phone: "+12025550107", name: "Sam", handle: "sam_rev", codeHint: "777777" };

const results = [];
const push = (section, name, status, detail = "") => {
  results.push({ section, name, status, detail });
  const mark = status === "PASS" ? "PASS" : status === "FAIL" ? "FAIL" : status;
  console.log(`${mark.padEnd(6)} [${section}] ${name}${detail ? " — " + detail : ""}`);
};

async function json(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "content-type": "application/json",
      ...(opts.bearer ? { authorization: `Bearer ${opts.bearer}` } : {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.message || body.error_code || res.statusText);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

async function activate(user) {
  const ch = await json("/api/v1/product/activation/challenges", {
    method: "POST",
    body: JSON.stringify({
      otp_consent_accepted: true,
      phone: user.phone,
      device_label: `${user.handle}-smoke`,
      idempotency_key: `smoke-ch-${user.handle}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    }),
  });
  const code = ch.development_code || user.codeHint;
  const verified = await json("/api/v1/product/activation/verify", {
    method: "POST",
    body: JSON.stringify({
      challenge_id: ch.challenge.id,
      code,
      display_name: user.name,
      handle_hint: user.handle,
      device_label: `${user.handle}-smoke`,
      platform: "web",
      include_bearer: true,
    }),
  });
  return {
    token: verified.session?.access_token,
    userId: verified.user?.id,
    name: verified.user?.display_name || user.name,
    phone: user.phone,
  };
}

function hasStatusSoup(s) {
  const blob = JSON.stringify(s || {}).toLowerCase();
  return /\b(set|still open|this could work|execution_ready|lifecycle_stage)\b/.test(
    (s?.label || "") + " " + (s?.shared_reality?.headline || ""),
  ) || /"label"\s*:\s*"set"/i.test(blob);
}

async function main() {
  console.log("=== FOUNDER SMOKE RUN ===");
  console.log({ API, WEB, time: new Date().toISOString() });

  // Health
  try {
    await json("/health");
    push("preflight", "API health", "PASS");
  } catch (e) {
    push("preflight", "API health", "FAIL", e.message);
    process.exit(2);
  }

  // Login
  let founder, maya, jordan, chris, sam;
  try {
    founder = await activate(F);
    push("login", "founder activate", "PASS", founder.name);
    if (!founder.name || founder.name === "You") {
      push("login", "founder display_name not You", "FAIL", founder.name);
    } else {
      push("login", "founder display_name not You", "PASS", founder.name);
    }
  } catch (e) {
    push("login", "founder activate", "FAIL", e.message);
    process.exit(2);
  }

  try {
    maya = await activate(MAYA);
    jordan = await activate(JORDAN);
    chris = await activate(CHRIS);
    sam = await activate(SAM);
    push("login", "secondary accounts", "PASS", "maya/jordan/chris/sam");
  } catch (e) {
    push("login", "secondary accounts", "FAIL", e.message);
  }

  // Home / conversations list
  let home;
  try {
    home = await json("/api/v1/product/conversations", { bearer: founder.token });
    const convs = home.conversations || [];
    const signals = home.signals || [];
    push("home", "list conversations", "PASS", `n=${convs.length} signals=${signals.length}`);

    // Status soup on home signals
    const soup = signals.filter((s) => {
      const h = (s.shared_reality?.headline || s.label || "").trim();
      return /^(set|still open|this could work)$/i.test(h);
    });
    push("home", "no status soup labels", soup.length ? "FAIL" : "PASS", soup.map((s) => s.label).join(",") || "clean");

    // Duplicate conversation titles? weak check
    const titles = convs.map((c) => c.title);
    const dups = titles.filter((t, i) => titles.indexOf(t) !== i);
    push("home", "conversation list loaded", "PASS", titles.slice(0, 5).join(" | "));

    // Friends / group composition on signals
    const groupSig = signals.find(
      (s) => s.composition === "group" || s.group_composition?.composition === "group" || (s.member_count || 0) >= 3,
    );
    if (groupSig) {
      const hs = groupSig.group_composition?.human_surface;
      push(
        "home",
        "group signal present",
        "PASS",
        hs?.headline || groupSig.shared_reality?.headline || groupSig.label,
      );
      if (hs && /required_participant|sushi_conflict|constraint matrix/i.test(JSON.stringify(hs))) {
        push("home", "group no constraint dump", "FAIL", JSON.stringify(hs));
      } else if (hs) {
        push("home", "group human_surface", "PASS", hs.headline);
      } else {
        push("home", "group human_surface", "FAIL", "missing human_surface on group signal");
      }
    } else {
      push("home", "group signal on home", "FAIL", "no group composition signal in home payload");
    }

    // member_count / Sam peers
    const groupConv = convs.find((c) => (c.member_count || 0) >= 5 || (c.peers || []).length >= 4);
    if (groupConv) {
      const peerNames = (groupConv.peers || []).map((p) => p.display_name);
      const samCount = peerNames.filter((n) => /^sam$/i.test(n || "")).length;
      push(
        "group",
        "friends conversation exists",
        "PASS",
        `id=${groupConv.id} members=${groupConv.member_count} peers=${peerNames.join(",")}`,
      );
      if (samCount > 1) {
        push("group", "Sam not duplicated in peers", "FAIL", `Sam appears ${samCount} times: ${peerNames.join(",")}`);
      } else if (samCount === 1 || peerNames.some((n) => /sam/i.test(n || ""))) {
        push("group", "Sam visible as peer", "PASS", peerNames.join(","));
      } else {
        push("group", "Sam visible as peer", "FAIL", peerNames.join(",") || "no peers");
      }
      if (groupConv.member_count === 6) {
        push("group", "member_count is 6 after Sam", "PASS", String(groupConv.member_count));
      } else if (groupConv.member_count === 7) {
        push("group", "member_count is 6 after Sam", "FAIL", `got ${groupConv.member_count} (possible duplicate membership)`);
      } else {
        push("group", "member_count after Sam", "OBSERVE", String(groupConv.member_count));
      }
    } else {
      push("group", "friends conversation exists", "FAIL", "no multi-member conversation in list");
    }
  } catch (e) {
    push("home", "list conversations", "FAIL", e.message);
  }

  // Maya / Jordan threads
  async function inspectThread(label, token, peerNameHint) {
    try {
      const list = await json("/api/v1/product/conversations", { bearer: token });
      const conv =
        (list.conversations || []).find((c) =>
          (c.peers || []).some((p) => new RegExp(peerNameHint, "i").test(p.display_name || "")),
        ) || (list.conversations || [])[0];
      if (!conv) {
        push(label, "find conversation", "FAIL", "none");
        return null;
      }
      const thr = await json(`/api/v1/product/conversations/${conv.id}/messages`, {
        bearer: token,
      });
      const msgs = thr.messages || [];
      const chrono = thr.chronology || [];
      const signals = thr.signals || [];
      push(label, "open thread", "PASS", `msgs=${msgs.length} chrono=${chrono.length} signals=${signals.length}`);

      // Ordering
      let ordered = true;
      for (let i = 1; i < msgs.length; i++) {
        if ((msgs[i].server_seq || 0) < (msgs[i - 1].server_seq || 0)) ordered = false;
      }
      push(label, "message server_seq order", ordered ? "PASS" : "FAIL");

      // Chronology consequential
      const badKinds = chrono.filter((m) => /debug|telemetry|raw_infer/i.test(m.kind || ""));
      push(label, "chronology not telemetry", badKinds.length ? "FAIL" : "PASS", chrono.map((m) => m.kind).join(","));

      // Status soup in signals
      const soup = signals.filter((s) => /^(set|still open)$/i.test((s.label || "").trim()));
      push(label, "signal labels human", soup.length ? "FAIL" : "PASS");

      // Place gap for Jordan-like
      const rec = signals.find((s) => s.kind !== "proposal");
      const place =
        rec?.shared_reality?.where ||
        rec?.shared_reality?.place_gap_label ||
        rec?.shared_reality?.detail ||
        rec?.detail;
      if (label === "jordan") {
        const blob = JSON.stringify(rec?.shared_reality || {});
        const hasPlaceLanguage =
          /place still open|choosing|harbor|north park|where/i.test(blob + " " + (place || ""));
        push(
          "jordan",
          "place gap explicit when unresolved",
          hasPlaceLanguage || rec?.shared_reality?.where ? "PASS" : "FAIL",
          place || blob.slice(0, 120),
        );
      }

      return { conv, thr, msgs, chrono, signals };
    } catch (e) {
      push(label, "open thread", "FAIL", e.message);
      return null;
    }
  }

  const mayaThread = await inspectThread("maya", founder.token, "Maya");
  const jordanThread = await inspectThread("jordan", founder.token, "Jordan");
  const friendsThread = await inspectThread("friends", founder.token, "Chris|Jess|Alex|Sam|Maya");

  // Chronology refresh = re-fetch
  if (friendsThread?.chrono?.length) {
    const again = await json(`/api/v1/product/conversations/${friendsThread.conv.id}/messages`, {
      bearer: founder.token,
    });
    const ids1 = friendsThread.chrono.map((m) => m.id).sort().join(",");
    const ids2 = (again.chronology || []).map((m) => m.id).sort().join(",");
    push("chronology", "re-fetch same durable ids", ids1 === ids2 && ids1.length ? "PASS" : "FAIL", `n1=${friendsThread.chrono.length} n2=${(again.chronology||[]).length}`);
  }

  // Logout/login simulation: new token, same chronology
  if (friendsThread?.conv) {
    try {
      const f2 = await activate(F);
      const after = await json(`/api/v1/product/conversations/${friendsThread.conv.id}/messages`, {
        bearer: f2.token,
      });
      const ids1 = (friendsThread.chrono || []).map((m) => m.id);
      const ids2 = (after.chronology || []).map((m) => m.id);
      const preserved = ids1.length > 0 && ids1.every((id) => ids2.includes(id));
      push(
        "chronology",
        "new session preserves chronology (API)",
        preserved ? "PASS" : "FAIL",
        `before=${ids1.length} after=${ids2.length}`,
      );
      push(
        "login",
        "sign-in again (new session token)",
        f2.token && f2.token !== founder.token ? "PASS" : "OBSERVE",
        "API re-activate",
      );
      // NOTE: browser logout/login not proven here
      push("chronology", "browser logout/login UI", "NOT_RUN", "requires founder browser");
    } catch (e) {
      push("chronology", "new session preserves chronology (API)", "FAIL", e.message);
      push("chronology", "browser logout/login UI", "NOT_RUN", "requires founder browser");
    }
  }

  // Optional end time availability
  if (jordanThread?.conv) {
    try {
      const start = new Date();
      start.setUTCDate(start.getUTCDate() + ((4 - start.getUTCDay() + 7) % 7 || 7)); // next Thu-ish
      start.setUTCHours(19, 0, 0, 0);
      const body = {
        starts_at: start.toISOString(),
        open_ended: true,
        // no end_at
        label: "Dinner",
        idempotency_key: `smoke-open-${Date.now()}`,
      };
      // Try product availability endpoints used by web
      let ok = false;
      let detail = "";
      for (const path of [
        `/api/v1/product/conversations/${jordanThread.conv.id}/availability/mine`,
        `/api/v1/product/availability/windows`,
        `/api/v1/product/conversations/${jordanThread.conv.id}/availability`,
      ]) {
        try {
          const r = await fetch(`${API}${path}`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${founder.token}`,
            },
            body: JSON.stringify(body),
          });
          const b = await r.json().catch(() => ({}));
          if (r.ok) {
            ok = true;
            detail = path;
            // ensure no fabricated end in response
            const end = b.end_at || b.window?.end_at || b.availability_window?.end_at;
            if (end && !body.end_at) {
              push("optional_end", "no fabricated end_at when open_ended", "FAIL", String(end));
            } else {
              push("optional_end", "open_ended share without until", "PASS", detail);
            }
            break;
          }
          detail = `${path}→${r.status} ${b.error_code || b.message || ""}`;
        } catch (e) {
          detail = e.message;
        }
      }
      if (!ok) push("optional_end", "open_ended share without until", "FAIL", detail || "no endpoint accepted");
    } catch (e) {
      push("optional_end", "open_ended share without until", "FAIL", e.message);
    }
  }

  // Sam E2E message
  if (friendsThread?.conv && sam?.token) {
    try {
      const send = await json(`/api/v1/product/conversations/${friendsThread.conv.id}/messages`, {
        method: "POST",
        bearer: sam.token,
        body: JSON.stringify({
          body: "Smoke: Sam here for Saturday.",
          client_message_id: `smoke-sam-${Date.now()}`,
        }),
      });
      push("sam", "Sam can send in Friends", "PASS", send.message?.id || "ok");
      const asFounder = await json(
        `/api/v1/product/conversations/${friendsThread.conv.id}/messages`,
        { bearer: founder.token },
      );
      const found = (asFounder.messages || []).some((m) => /Sam here for Saturday/i.test(m.body || ""));
      push("sam", "Founder sees Sam message (history)", found ? "PASS" : "FAIL");
    } catch (e) {
      push("sam", "Sam can send in Friends", "FAIL", e.message);
    }
  }

  // Private chronology isolation
  if (friendsThread?.conv && sam?.token) {
    const a = await json(`/api/v1/product/conversations/${friendsThread.conv.id}/messages`, {
      bearer: founder.token,
    });
    const b = await json(`/api/v1/product/conversations/${friendsThread.conv.id}/messages`, {
      bearer: sam.token,
    });
    const leak = (b.chronology || []).filter(
      (m) => m.visibility === "private_viewer" && m.viewer_user_id && m.viewer_user_id !== sam.userId,
    );
    push("privacy", "private chronology no foreign rows", leak.length ? "FAIL" : "PASS", `n=${leak.length}`);
  }

  // Gates not runnable here
  const notRun = [
    ["browser", "Home 3-second visual cold open"],
    ["browser", "Maya Next/Last Together UI"],
    ["browser", "Curate panel interaction"],
    ["browser", "Extend private first UI"],
    ["browser", "Plans card open-all"],
    ["browser", "Profile chrome"],
    ["browser", "Every-button live sweep"],
    ["realtime", "A↔B without reload (Phoenix)"],
    ["realtime", "Group live broadcast Sam"],
    ["socket", "20m dual-browser getDiagnostics"],
    ["figma", "390px Home/Chat/SR/Curate side-by-side"],
    ["residue", "Founder natural episode timed"],
    ["motion", "Live animation audit"],
  ];
  for (const [section, name] of notRun) {
    push(section, name, "NOT_RUN", "founder browser required");
  }

  // Summary
  const fail = results.filter((r) => r.status === "FAIL");
  const pass = results.filter((r) => r.status === "PASS");
  const not_run = results.filter((r) => r.status === "NOT_RUN");
  const observe = results.filter((r) => r.status === "OBSERVE");

  const report = {
    executive: {
      pass: pass.length,
      fail: fail.length,
      not_run: not_run.length,
      observe: observe.length,
      merge: "DO NOT MERGE",
      freeze: "intact — repair only named FAILs after repro",
    },
    failures: fail,
    results,
  };

  const outPath = new URL(
    "../docs/evidence/v2-coded-experience/FOUNDER_SMOKE_RESULTS.json",
    import.meta.url,
  );
  const { writeFileSync } = await import("node:fs");
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(report.executive, null, 2));
  console.log("Wrote", outPath.pathname);
  process.exit(fail.length ? 1 : 0);
}

main().catch((e) => {
  console.error("SMOKE HARD FAIL", e);
  process.exit(2);
});
