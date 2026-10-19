#!/usr/bin/env node
/**
 * Repair #18 - SPLASH 1 REBUILD capture (founder order 2026-10-18
 * 13:48 PDT + composition refinement 13:59 PDT). Drives the REAL
 * served preview app (Mac opal-r18-preview mirror of muse/r18-splash)
 * in Chromium at 390x844:
 *  - STILLS: splash 1 both modes (the master composition, inset by
 *    the safe margin on the continuous night field) - a LIVING
 *    frame mid-phase (~4s, rings displaced), then the SETTLED
 *    still: the capture waits for data-motion="settled" (Repair
 *    #19 v2: the living phase runs 0.45s beat + 15s travel, then
 *    settles into the exact still composition), a second frame
 *    1.5s after settle (frame-diff vs the settled still = the
 *    stopped proof, ~0 in the stage), the entry frame into
 *    splash 2, a reduced-motion still, and the Center dock both
 *    modes (ambient living rings on the dock OrbMark).
 *  - VIDEOS (v2): CDP-screencast recordings of splash 1 in BOTH
 *    modes at the screencast's native frame cadence (up to 60fps
 *    while animating - v1's Playwright recordVideo capped at
 *    ~25fps and read jagged), assembled with ffmpeg from the
 *    frames' own timestamps. Duration covers the FULL arc: the
 *    whole living phase, the settle, a 2.5s settled hold, then
 *    the Continue tap and the entry transition into splash 2
 *    (~21s). If ffmpeg or the screencast is unavailable the
 *    harness falls back to recordVideo and records that in the
 *    manifest (videoMethod field) - never silently.
 *  - PROBES (manifest.json): stage margin containment (rings whole,
 *    never cropped: stage box inset from every screen edge), living
 *    layer presence + animation elements, splash root field color,
 *    dock living-ring containment inside the disc, build stamp.
 */
import fs from "node:fs";
import path from "node:path";
import {
  loadRenderedConfig,
  provisionRenderedSessions,
  launchBrowser,
  newAuthedContext,
  newAnonContext,
  entryUrl,
  VIEWPORT,
} from "./lib/browser.mjs";
import { probeHorizontalOverflow, probeClippedText } from "./lib/geometry.mjs";

const OUT = process.env.FIRSTLOOK_OUT;
if (!OUT) throw new Error("FIRSTLOOK_OUT required");
fs.mkdirSync(OUT, { recursive: true });

const config = loadRenderedConfig(process.env);
const { sessions, seedInfo } = await provisionRenderedSessions(config);
const browser = await launchBrowser();
const manifest = {
  build_tag: config.buildTag,
  web: config.webBase,
  api: config.apiBase,
  seed: seedInfo ? { comm: seedInfo.comm.status, graph: seedInfo.graph.status } : null,
  surfaces: [],
};

const ENTRY = `${config.webBase}/?opal_founder_seed=1&opal_native_host=1&opal_dev=1&opal_reset_first_run=1`;

async function splashProbes(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="c2-splash1"]');
    const stage = document.querySelector('[data-testid="c2-splash1-orb"]');
    const img = stage?.querySelector("img");
    const rings = stage?.querySelector('[data-orb-living-rings]');
    const wm = document.querySelector('[data-testid="c2-splash1-wordmark"]');
    const r = stage?.getBoundingClientRect();
    return {
      rootPresent: !!root,
      fieldAttr: root?.getAttribute("data-splash-field") ?? null,
      rootBg: root ? getComputedStyle(root).backgroundColor : null,
      enterOpalCount: root?.getAttribute("data-enter-opal-count") ?? null,
      imgSrc: img?.getAttribute("src") ?? null,
      imgNatural: img ? { w: img.naturalWidth, h: img.naturalHeight } : null,
      stageBox: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
      margin: r
        ? {
            left: Math.round(r.left),
            right: Math.round(window.innerWidth - r.right),
            top: Math.round(r.top),
            contained: r.left >= 8 && window.innerWidth - r.right >= 8 && r.top >= 8 && r.right <= window.innerWidth,
          }
        : null,
      rings: rings
        ? {
            variant: rings.getAttribute("data-orb-living-rings"),
            motion: rings.getAttribute("data-motion"),
            // v2 law: zero SMIL (the v1 jagged mechanism) - motion
            // is the CSS rotor + WAAPI ellipse riders below.
            animateMotion: rings.querySelectorAll("animateMotion").length,
            animateTransform: rings.querySelectorAll("animateTransform").length,
            rotor: rings.querySelector("[data-ring-rotor]")
              ? {
                  fromDeg: rings.querySelector("[data-ring-rotor]").getAttribute("data-rotor-from-deg"),
                  toDeg: rings.querySelector("[data-ring-rotor]").getAttribute("data-rotor-to-deg"),
                  durationMs: rings.querySelector("[data-ring-rotor]").getAttribute("data-rotor-duration-ms"),
                  iterations: rings.querySelector("[data-ring-rotor]").getAttribute("data-rotor-iterations"),
                  circlePoints: rings.querySelectorAll('[data-ring-point="circle"]').length,
                }
              : null,
            ellipseRiders: [...rings.querySelectorAll('[data-ring-point="ellipse"]')].map((r) => ({
              restPhiDeg: r.getAttribute("data-rest-phi-deg"),
              travelDeg: r.getAttribute("data-travel-deg"),
              durationMs: r.getAttribute("data-duration-ms"),
            })),
            restPoints: rings.querySelectorAll('[data-living="points-rest"] > g').length,
          }
        : null,
      lockupStacked: (() => {
        if (!r || !wm) return null;
        const w = wm.getBoundingClientRect();
        return { stacked: w.top >= r.bottom - 4, centerDeltaX: Math.round(Math.abs(r.left + r.width / 2 - (w.left + w.width / 2))) };
      })(),
      gitHeadFull: document.documentElement.getAttribute("data-git-head-full"),
    };
  });
}

// ---------- Splash stills + entry frame (anon, both modes) ----------
for (const mode of ["dark", "light"]) {
  const context = await newAnonContext(browser, mode, config);
  const page = await context.newPage();
  try {
    await page.goto(ENTRY, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector('[data-testid="c2-splash1"]', { timeout: 90000 });
    await page.waitForSelector('[data-testid="c2-splash1-orb"] img', { timeout: 30000 });
    // LIVING frame: mid-phase, the rings are displaced from rest.
    await page.waitForTimeout(4000);
    const livingProbes = await splashProbes(page);
    manifest.surfaces.push({ label: "splash-1-living", mode, ringsMotion: livingProbes.rings?.motion ?? null, rotor: livingProbes.rings?.rotor ?? null });
    await page.screenshot({ path: path.join(OUT, `splash-1-${mode}-living.png`) });
    // SETTLED still: v2's living phase ends at 15.45s after mount;
    // wait for the component's own settled signal so the still IS
    // the static splash composition (final frame == still).
    await page
      .waitForFunction(
        () => document.querySelector('[data-orb-living-rings="hero"]')?.getAttribute("data-motion") === "settled",
        null,
        { timeout: 60000 },
      )
      .catch(() => console.log(mode, "SETTLE TIMEOUT - still captured anyway, probes will show the phase"));
    await page.waitForTimeout(400);
    const probes = await splashProbes(page);
    const overflow = await page.evaluate(probeHorizontalOverflow).catch(() => null);
    const clipped = await page.evaluate(probeClippedText, '[data-testid="c2-splash1"]').catch(() => null);
    manifest.surfaces.push({ label: "splash-1", mode, ...probes, docOverflow: overflow?.docOverflow ?? null, clippedCount: clipped?.clipped?.length ?? null });
    console.log(mode, "splash1 (settled):", JSON.stringify(probes));
    await page.screenshot({ path: path.join(OUT, `splash-1-${mode}.png`) });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT, `splash-1-${mode}-t2.png`) });
    const cont = page.locator('[data-testid="c2-splash1-continue"]');
    await cont.click();
    await page.waitForSelector('[data-testid="c2-splash2"]', { timeout: 30000 });
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(OUT, `splash-2-entry-${mode}.png`) });
    const s2 = await page.evaluate(() => ({
      enterButtons: [...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === "Enter Opal").length,
    }));
    manifest.surfaces.push({ label: "splash-2-entry", mode, ...s2 });
    console.log(mode, "splash2 entry:", JSON.stringify(s2));
  } catch (e) {
    manifest.surfaces.push({ label: "splash", mode, failures: [String(e).slice(0, 300)] });
    console.log(mode, "ERROR", String(e).slice(0, 300));
  }
  await context.close();
}

// ---------- Motion videos v2 (anon, both modes) ----------
// The full live-then-settle arc, at screencast cadence: CDP
// Page.startScreencast emits a frame whenever the compositor
// presents one (up to 60fps while animating) - v1's recordVideo
// capped near 25fps and the small point cores aliased into
// jagged steps. Frames carry their own timestamps; ffmpeg
// assembles them with VFR timing preserved. Fallback (recorded
// in the manifest, never silent): recordVideo at its native rate.
import { spawnSync } from "node:child_process";
const FFMPEG_OK = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" }).status === 0;

async function recordMotionScreencast(page, mode) {
  const frameDir = path.join(OUT, `.frames-${mode}`);
  fs.mkdirSync(frameDir, { recursive: true });
  const session = await page.context().newCDPSession(page);
  const frames = [];
  let t0 = null;
  const onFrame = async (ev) => {
    try {
      if (t0 === null) t0 = ev.metadata.timestamp;
      const idx = frames.length;
      const file = path.join(frameDir, `f${String(idx).padStart(5, "0")}.jpg`);
      fs.writeFileSync(file, Buffer.from(ev.data, "base64"));
      frames.push({ file, t: ev.metadata.timestamp - t0 });
      await session.send("Page.screencastFrameAck", { sessionId: ev.sessionId }).catch(() => {});
    } catch { /* a dropped ack must not kill the recording */ }
  };
  session.on("Page.screencastFrame", onFrame);
  await session.send("Page.startScreencast", {
    format: "jpeg",
    quality: 88,
    maxWidth: VIEWPORT.width * 2,
    maxHeight: VIEWPORT.height * 2,
    everyNthFrame: 1,
  });
  return {
    frames,
    async finish() {
      await session.send("Page.stopScreencast").catch(() => {});
      session.off("Page.screencastFrame", onFrame);
      if (frames.length < 10) throw new Error(`screencast produced only ${frames.length} frames`);
      // Assemble with each frame's real duration (VFR concat).
      const listPath = path.join(frameDir, "frames.txt");
      const lines = [];
      for (let i = 0; i < frames.length; i += 1) {
        const dur = i + 1 < frames.length ? Math.max(frames[i + 1].t - frames[i].t, 0.001) : 0.5;
        lines.push(`file '${frames[i].file}'`, `duration ${dur.toFixed(4)}`);
      }
      lines.push(`file '${frames[frames.length - 1].file}'`);
      fs.writeFileSync(listPath, lines.join("\n"));
      const outFile = path.join(OUT, `splash-1-motion-${mode}.webm`);
      const enc = spawnSync(
        "ffmpeg",
        ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-vsync", "vfr",
         "-c:v", "libvpx-vp9", "-b:v", "2400k", "-pix_fmt", "yuv420p", outFile],
        { encoding: "utf8" },
      );
      if (enc.status !== 0) throw new Error(`ffmpeg failed: ${(enc.stderr || "").slice(-300)}`);
      const span = frames[frames.length - 1].t;
      const fps = frames.length / Math.max(span, 0.001);
      fs.rmSync(frameDir, { recursive: true, force: true });
      return { file: `splash-1-motion-${mode}.webm`, frames: frames.length, seconds: Math.round(span * 10) / 10, avgFps: Math.round(fps * 10) / 10 };
    },
  };
}

for (const mode of ["dark", "light"]) {
  const useScreencast = FFMPEG_OK;
  const videoDir = path.join(OUT, `video-${mode}`);
  if (!useScreencast) fs.mkdirSync(videoDir, { recursive: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: mode,
    ...(useScreencast ? {} : { recordVideo: { dir: videoDir, size: VIEWPORT } }),
  });
  await context.addInitScript((modeValue) => {
    try {
      localStorage.setItem("opal.appearance.theme.v1", modeValue);
    } catch { /* ignore */ }
  }, mode);
  const page = await context.newPage();
  let rec = null;
  try {
    if (useScreencast) rec = await recordMotionScreencast(page, mode);
    await page.goto(ENTRY, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector('[data-testid="c2-splash1"]', { timeout: 90000 });
    // THE FULL ARC: living phase (0.45s beat + 15s travel) + the
    // settle + a settled hold, THEN the tap. v1 cut at ~5s of
    // travel - the founder: "it just didn't feel long enough."
    await page.waitForFunction(
      () => document.querySelector('[data-orb-living-rings="hero"]')?.getAttribute("data-motion") === "settled",
      null,
      { timeout: 60000 },
    );
    await page.waitForTimeout(2500); // settled hold: it stopped, and stays stopped
    await page.locator('[data-testid="c2-splash1-continue"]').click();
    await page.waitForSelector('[data-testid="c2-splash2"]', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2600); // the entry transition + splash 2 settle
  } catch (e) {
    console.log(mode, "VIDEO ERROR", String(e).slice(0, 200));
  }
  if (useScreencast && rec) {
    try {
      const info = await rec.finish();
      manifest.surfaces.push({ label: "splash-1-motion-video", mode, videoMethod: "cdp-screencast+ffmpeg-vfr", ...info });
      console.log(mode, "video saved (screencast)", JSON.stringify(info));
    } catch (e) {
      manifest.surfaces.push({ label: "splash-1-motion-video", mode, videoMethod: "cdp-screencast+ffmpeg-vfr", failures: [String(e).slice(0, 300)] });
      console.log(mode, "VIDEO ASSEMBLY ERROR", String(e).slice(0, 200));
    }
    await context.close();
  } else {
    await context.close(); // flushes the video
    const files = fs.readdirSync(videoDir).filter((f) => f.endsWith(".webm"));
    if (files.length) {
      fs.renameSync(path.join(videoDir, files[0]), path.join(OUT, `splash-1-motion-${mode}.webm`));
      fs.rmdirSync(videoDir);
      manifest.surfaces.push({ label: "splash-1-motion-video", mode, videoMethod: "recordVideo-fallback-no-ffmpeg", file: `splash-1-motion-${mode}.webm` });
      console.log(mode, "video saved (recordVideo fallback)");
    } else {
      manifest.surfaces.push({ label: "splash-1-motion-video", mode, failures: ["no webm produced"] });
    }
  }
}

// ---------- Reduced motion still (dark) ----------
{
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  await context.addInitScript(() => {
    try {
      localStorage.setItem("opal.appearance.theme.v1", "dark");
    } catch { /* ignore */ }
  });
  const page = await context.newPage();
  try {
    await page.goto(ENTRY, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector('[data-testid="c2-splash1"]', { timeout: 90000 });
    await page.waitForTimeout(2500);
    const rings = await page.evaluate(() => {
      const el = document.querySelector('[data-orb-living-rings="hero"]');
      return el
        ? {
            motion: el.getAttribute("data-motion"),
            animateCount: el.querySelectorAll("animateMotion, animateTransform").length,
            // v2 rest law: no rotor/arc/riders at rest either -
            // the measured points simply are there.
            rotorCount: el.querySelectorAll("[data-ring-rotor], [data-ring-arc], [data-ring-point]").length,
            restPoints: el.querySelectorAll('[data-living="points-rest"] > g').length,
          }
        : null;
    });
    manifest.surfaces.push({ label: "splash-1-reduced-motion", mode: "dark", rings });
    console.log("reduced-motion rings:", JSON.stringify(rings));
    await page.screenshot({ path: path.join(OUT, "splash-1-dark-reduced-motion.png") });
  } catch (e) {
    manifest.surfaces.push({ label: "splash-1-reduced-motion", mode: "dark", failures: [String(e).slice(0, 200)] });
  }
  await context.close();
}

// ---------- Dock stills (authed, both modes) ----------
for (const mode of ["dark", "light"]) {
  const context = await newAuthedContext(browser, config, sessions.a, mode);
  const page = await context.newPage();
  try {
    await page.goto(entryUrl(config), { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector('[data-testid="c2-shell"]', { timeout: 90000 });
    await page.waitForTimeout(3000);
    const dock = await page.evaluate(() => {
      const disc = document.querySelector(".c2s-dock-center-disc");
      const rings = disc?.querySelector('[data-orb-living-rings="ambient"]');
      const d = disc?.getBoundingClientRect();
      const m = disc?.querySelector(".orb-dock-mark")?.getBoundingClientRect();
      return {
        discPresent: !!disc,
        rings: rings
          ? {
              motion: rings.getAttribute("data-motion"),
              // v2: SMIL counts stay in the manifest as the
              // regression pin - they must read 0 forever.
              animateMotion: rings.querySelectorAll("animateMotion").length,
              animateTransform: rings.querySelectorAll("animateTransform").length,
              rotor: !!rings.querySelector("[data-ring-rotor]"),
              ellipseRiders: rings.querySelectorAll('[data-ring-point="ellipse"]').length,
            }
          : null,
        markInsideDisc: d && m ? m.left >= d.left && m.right <= d.right && m.top >= d.top && m.bottom <= d.bottom : null,
        markBox: m ? { w: Math.round(m.width), h: Math.round(m.height) } : null,
        discBox: d ? { w: Math.round(d.width), h: Math.round(d.height) } : null,
      };
    });
    manifest.surfaces.push({ label: "dock-center", mode, ...dock });
    console.log(mode, "dock:", JSON.stringify(dock));
    await page.screenshot({ path: path.join(OUT, `center-dock-${mode}.png`) });
    const discEl = page.locator(".c2s-dock-center-disc");
    if (await discEl.count()) {
      const box = await discEl.boundingBox();
      if (box) {
        await page.screenshot({
          path: path.join(OUT, `dock-closeup-${mode}.png`),
          clip: { x: Math.max(0, box.x - 30), y: Math.max(0, box.y - 30), width: box.width + 60, height: box.height + 60 },
        });
      }
    }
  } catch (e) {
    manifest.surfaces.push({ label: "dock-center", mode, failures: [String(e).slice(0, 300)] });
    console.log(mode, "DOCK ERROR", String(e).slice(0, 300));
  }
  await context.close();
}

fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log("DONE", OUT);
await browser.close();
