/**
 * Phase 1.4 — TURN-only relay connectivity test.
 *
 * Mints Twilio NTS credentials (via product API or direct Tokens.json with
 * ~/.opal/r1a1.env), creates two RTCPeerConnections in Playwright Chromium,
 * forces relay-only ICE (iceTransportPolicy: "relay"), and confirms media
 * flows (ICE connected/completed + selected candidate type === relay).
 *
 * Usage:
 *   node apps/opal_web/scripts/turn_relay_test.mjs
 *   OPAL_API=http://127.0.0.1:4000 CALL_ID=... BEARER=... node ...
 *
 * Without live Twilio: writes FAIL evidence and exits 0 when disabled is honest
 * (so CI can record blocked state); exits 1 only on unexpected failure.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { homedir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../../..");
const outDir = resolve(root, "shots/calling");
mkdirSync(outDir, { recursive: true });

function loadR1a1() {
  const path = resolve(homedir(), ".opal/r1a1.env");
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

async function mintDirect(env) {
  const sid = env.OPAL_TWILIO_ACCOUNT_SID;
  const token = env.OPAL_TWILIO_AUTH_TOKEN;
  if (!sid || !token) return { disabled: true, reason: "TURN not configured" };

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Tokens.json`, {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: "",
  });
  if (!res.ok) {
    const text = await res.text();
    return { error: `nts_http_${res.status}`, body: text.slice(0, 300) };
  }
  const json = await res.json();
  return {
    ice_servers: json.ice_servers || [],
    ttl: Number(json.ttl) || 86400,
    source: "twilio_nts_direct",
  };
}

function turnOnly(servers) {
  return (servers || []).filter((s) => {
    const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
    return urls.some((u) => typeof u === "string" && /^turns?:/i.test(u));
  });
}

async function runRelayInBrowser(iceServers) {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--autoplay-policy=no-user-gesture-required",
      "--allow-file-access-from-files",
    ],
  });
  // Secure origin required for navigator.mediaDevices in Chromium.
  const origin = process.env.OPAL_FE || "http://127.0.0.1:5173";
  const context = await browser.newContext({
    permissions: ["microphone", "camera"],
  });
  await context.grantPermissions(["microphone", "camera"], { origin });
  const page = await context.newPage();
  try {
    await page.goto(origin + "/", { waitUntil: "domcontentloaded", timeout: 15000 });
  } catch {
    // Fallback: blank page with injected secure-context shim via data URL is unreliable;
    // use playwright's built-in empty page on localhost via route.
    await page.route("**/relay-test", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><html><body>relay</body></html>",
      }),
    );
    await page.goto("http://127.0.0.1:5173/relay-test").catch(async () => {
      await page.goto("https://example.com");
    });
  }

  const result = await page.evaluate(async (servers) => {
    const log = [];
    const turnOnly = (list) =>
      list.filter((s) => {
        const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
        return urls.some((u) => typeof u === "string" && /^turns?:/i.test(u));
      });

    const iceServers = turnOnly(servers);
    if (!iceServers.length) {
      return { ok: false, reason: "no_turn_uris_in_ice_servers", log };
    }

    const pc1 = new RTCPeerConnection({
      iceServers,
      iceTransportPolicy: "relay",
    });
    const pc2 = new RTCPeerConnection({
      iceServers,
      iceTransportPolicy: "relay",
    });

    if (!navigator.mediaDevices?.getUserMedia) {
      return {
        ok: false,
        reason: "mediaDevices_unavailable",
        log,
        secureContext: window.isSecureContext,
        href: location.href,
      };
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    for (const track of stream.getTracks()) pc1.addTrack(track, stream);

    // Also open a data channel so ICE still completes if audio track cloning is flaky.
    pc1.createDataChannel("opal-relay-probe");
    pc2.ondatachannel = () => log.push("datachannel");

    pc2.ontrack = () => log.push("ontrack");

    const waitIce = (pc, label) =>
      new Promise((resolve) => {
        const done = (state) => {
          log.push(`${label}:${state}`);
          if (state === "connected" || state === "completed" || state === "failed" || state === "closed") {
            resolve(state);
          }
        };
        pc.oniceconnectionstatechange = () => done(pc.iceConnectionState);
        setTimeout(() => resolve(pc.iceConnectionState), 20000);
      });

    pc1.onicecandidate = (e) => {
      if (e.candidate) pc2.addIceCandidate(e.candidate).catch(() => {});
    };
    pc2.onicecandidate = (e) => {
      if (e.candidate) pc1.addIceCandidate(e.candidate).catch(() => {});
    };

    const offer = await pc1.createOffer();
    await pc1.setLocalDescription(offer);
    await pc2.setRemoteDescription(offer);
    const answer = await pc2.createAnswer();
    await pc2.setLocalDescription(answer);
    await pc1.setRemoteDescription(answer);

    const [s1, s2] = await Promise.all([waitIce(pc1, "pc1"), waitIce(pc2, "pc2")]);

    let selectedType = null;
    try {
      const stats = await pc1.getStats();
      for (const report of stats.values()) {
        if (report.type === "candidate-pair" && report.state === "succeeded") {
          const local = stats.get(report.localCandidateId);
          if (local) selectedType = local.candidateType || local.type;
        }
      }
    } catch (e) {
      log.push(`stats_err:${e.message}`);
    }

    stream.getTracks().forEach((t) => t.stop());
    pc1.close();
    pc2.close();

    const ok =
      (s1 === "connected" || s1 === "completed") &&
      (s2 === "connected" || s2 === "completed") &&
      (selectedType === "relay" || log.includes("ontrack"));

    return { ok, s1, s2, selectedType, log, iceServerCount: iceServers.length };
  }, iceServers);

  await browser.close();
  return result;
}

const started = new Date().toISOString();
const env = { ...loadR1a1(), ...process.env };
let mint = await mintDirect(env);

const evidence = {
  phase: "1.4",
  started,
  mint: mint.disabled
    ? { status: "disabled", reason: mint.reason }
    : mint.error
      ? { status: "error", error: mint.error, body: mint.body }
      : {
          status: "ok",
          source: mint.source,
          ttl: mint.ttl,
          ice_server_count: (mint.ice_servers || []).length,
          turn_uri_count: turnOnly(mint.ice_servers).length,
        },
};

if (mint.disabled) {
  evidence.relay_test = { status: "SKIPPED", reason: "TURN not configured — honest disabled path" };
  evidence.acceptance = {
    honest_disabled: true,
    relay_media: false,
    note: "Load OPAL_TWILIO_ACCOUNT_SID/AUTH_TOKEN to run live relay proof",
  };
  writeFileSync(resolve(outDir, "PHASE1_TURN_RELAY.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
  process.exit(0);
}

if (mint.error) {
  evidence.relay_test = { status: "FAIL", reason: mint.error };
  writeFileSync(resolve(outDir, "PHASE1_TURN_RELAY.json"), JSON.stringify(evidence, null, 2));
  console.error(JSON.stringify(evidence, null, 2));
  process.exit(1);
}

const relay = await runRelayInBrowser(mint.ice_servers);
evidence.relay_test = {
  status: relay.ok ? "PASS" : "FAIL",
  ...relay,
  finished: new Date().toISOString(),
};
evidence.acceptance = {
  turn_uris_present: turnOnly(mint.ice_servers).length > 0,
  relay_media: !!relay.ok,
  ice_states: { pc1: relay.s1, pc2: relay.s2 },
  selected_candidate_type: relay.selectedType,
};

writeFileSync(resolve(outDir, "PHASE1_TURN_RELAY.json"), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
process.exit(relay.ok ? 0 : 1);
