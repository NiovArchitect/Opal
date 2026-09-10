/**
 * Cross-route dock parity proof — Home is the physical reference (1114:2).
 * All primary routes must share identical dock geometry (active pixels may differ).
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const css = readFileSync(resolve(root, "src/styles.css"), "utf8");
const outDir = resolve(root, "../../docs/evidence/iphone-layout-2026-09-10");

const ROUTES = ["home", "chats", "calls", "graphs", "you", "center"];

function buildHtml(route) {
  const body =
    route === "center"
      ? `<div class="opal-ambient-destination" data-opal-mount="full-screen"><div class="opal-center-v2" data-testid="opal-center-life-graph"></div></div>`
      : route === "you"
        ? `<main class="pane"><div class="scroll you-pane-618-1344" data-testid="you-hub-pane"></div></main>`
        : route === "graphs"
          ? `<main class="pane"><div class="graphs-home" data-testid="graphs-home"></div></main>`
          : route === "calls"
            ? `<main class="pane"><div class="chats-home calls-continuity-home" data-testid="calls-continuity-home" data-comm-surface="calls"></div></main>`
            : route === "chats"
              ? `<main class="pane"><div class="chats-home" data-testid="chats-home"></div></main>`
              : `<main class="pane"><div class="scroll gsh" data-testid="home-scroll"></div></main>`;

  return `<!doctype html>
<html class="opal-native-host">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<style>
${css}
html.opal-native-host { --opal-safe-top: 47px; --opal-safe-bottom: 34px; }
html,body,#root{margin:0;height:100%;background:#050816}
.dock-icon{width:22px;height:22px;background:#919eb2;border-radius:4px}
</style>
</head>
<body>
<div id="root">
  <div class="app" data-member-nav="true" style="height:100%" data-route="${route}">
    ${body}
    <nav class="tabbar tabbar-option-b" data-testid="member-tabbar" data-figma-dock="1114:2" data-dock-state="rest">
      <div class="dock-bar" aria-hidden></div>
      <div class="dock-slots">
        <button class="dock-tab ${route === "home" ? "is-active" : ""}" data-dock-slot="home" type="button"><span class="dock-icon"></span><span class="dock-label">Home</span></button>
        <button class="dock-tab ${route === "chats" || route === "calls" ? "is-active" : ""}" data-dock-slot="chats" type="button"><span class="dock-icon"></span><span class="dock-label">Chats</span></button>
        <button class="dock-opal is-rest" type="button"><span class="dock-opal-mark" style="display:block;width:100%;height:100%;background:#6ee8f5;border-radius:50%"></span></button>
        <button class="dock-tab ${route === "graphs" ? "is-active" : ""}" data-dock-slot="graphs" type="button"><span class="dock-icon"></span><span class="dock-label">Graphs</span></button>
        <button class="dock-tab ${route === "you" ? "is-active" : ""}" data-dock-slot="you" type="button"><span class="dock-icon"></span><span class="dock-label">You</span></button>
      </div>
    </nav>
  </div>
</div>
</body></html>`;
}

function measure(page) {
  return page.evaluate(() => {
    const dock = document.querySelector(".tabbar.tabbar-option-b");
    const bar = document.querySelector(".dock-bar");
    const orb = document.querySelector(".dock-opal");
    const label = document.querySelector(".dock-label");
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        left: b.left,
        right: window.innerWidth - b.right,
        width: b.width,
        height: b.height,
        top: b.top,
        bottom: b.bottom,
        borderRadius: cs.borderRadius,
        background: cs.backgroundColor,
        backdrop: cs.backdropFilter || cs.webkitBackdropFilter,
      };
    };
    return { dock: r(dock), bar: r(bar), orb: r(orb), labelTop: label?.getBoundingClientRect().top ?? null, vh: window.innerHeight };
  });
}

function near(a, b, tol = 1.5) {
  return Math.abs(a - b) <= tol;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 390, height: 844 });

const byRoute = {};
for (const route of ROUTES) {
  await page.setContent(buildHtml(route), { waitUntil: "load" });
  byRoute[route] = await measure(page);
}
await browser.close();

const ref = byRoute.home;
const keys = ["left", "right", "width", "height", "bottom"];
const report = { reference: "home", viewport: "390x844", routes: {}, gates: {} };
let failed = 0;

for (const route of ROUTES) {
  const m = byRoute[route];
  const dockOk = keys.every((k) => near(m.dock[k], ref.dock[k]));
  const barOk = near(m.bar.height, ref.bar.height) && near(m.bar.width, ref.bar.width);
  const orbOk = near(m.orb.width, ref.orb.width) && near(m.orb.height, ref.orb.height);
  const floatOk = near(m.dock.height, 74) && m.dock.bottom < m.vh - 30; // above safe+lift
  const ok = dockOk && barOk && orbOk && floatOk;
  report.routes[route] = { ok, dock: m.dock, barH: m.bar.height, orb: { w: m.orb.width, h: m.orb.height } };
  report.gates[`${route.toUpperCase()}_DOCK_PARITY`] = ok ? "GREEN" : "RED";
  if (!ok) failed += 1;
  console.log(
    `${route} ${ok ? "GREEN" : "RED"} L=${m.dock.left.toFixed(1)} W=${m.dock.width.toFixed(1)} H=${m.dock.height.toFixed(1)} bottom=${m.dock.bottom.toFixed(1)}`,
  );
}

report.gates.GLOBAL_DOCK_COMPONENT = failed === 0 ? "GREEN" : "RED";
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, "DOCK_CROSS_ROUTE_PARITY.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`\nWrote ${outPath}`);
console.log(failed === 0 ? "DOCK_CROSS_ROUTE_PARITY = GREEN" : `DOCK_CROSS_ROUTE_PARITY = RED (${failed})`);
process.exit(failed === 0 ? 0 : 1);
