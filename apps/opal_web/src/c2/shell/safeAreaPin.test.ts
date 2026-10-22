/**
 * Repair #27 W27-1 — status-bar clearance pin (source leg).
 *
 * Founder walk #5: in the native shell the app header rendered
 * UNDER the iOS status bar on Flows, Chats and thread headers -
 * clock/battery/Wi-Fi overlapped and clipped it. The fix: the web
 * layer owns the inset. index.html carries viewport-fit=cover (so
 * WKWebView reports the real inset), the token sheet defines
 * --opal-sat from env(safe-area-inset-top), .c2s-root pads itself
 * with it, and every full-screen layer that escapes the column
 * consumes the token. The native shell stays full-bleed (no
 * double padding).
 *
 * The geometry leg (headers actually clearing a simulated 47px
 * inset at 390x844) runs in the rendered-frame pass; this pin
 * keeps the CSS contract from silently regressing.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const WEB_ROOT = resolve(__dirname, "../../..");
const SHELL_CSS = readFileSync(
  resolve(WEB_ROOT, "src/c2/shell/c2shell.css"),
  "utf8",
);
const INDEX_HTML = readFileSync(resolve(WEB_ROOT, "index.html"), "utf8");
const TOKENS_CSS = readFileSync(
  resolve(WEB_ROOT, "src/theme/c2Tokens.css"),
  "utf8",
);

function ruleBody(css: string, selector: string): string {
  const idx = css.indexOf(selector);
  if (idx < 0) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf("{", idx);
  const close = css.indexOf("}", open);
  return css.slice(open, close);
}

describe("W27-1 status-bar clearance", () => {
  it("index.html opts into the real device inset (viewport-fit=cover)", () => {
    expect(INDEX_HTML).toMatch(/viewport-fit=cover/);
  });

  it("the token sheet defines --opal-sat from env() and .c2s-root pads itself with it", () => {
    expect(TOKENS_CSS).toMatch(/--opal-sat:\s*env\(safe-area-inset-top/);
    const body = ruleBody(SHELL_CSS, ".c2s-root {");
    expect(body).toMatch(/padding-top:\s*var\(--opal-sat\)/);
    expect(body).toMatch(/box-sizing:\s*border-box/);
  });

  it.each([".c2s-flow {", ".c2s-destination {", ".c2s-viewer {"])(
    "%s consumes the inset token itself (it escapes the column)",
    (selector) => {
      const body = ruleBody(SHELL_CSS, selector);
      expect(body).toMatch(/padding-top:\s*var\(--opal-sat\)/);
      expect(body).toMatch(/box-sizing:\s*border-box/);
    },
  );

  it("the hosted C1 surface override outranks the standalone 100dvh rule (W27-12)", () => {
    // c1.css sizes a standalone C1 surface at min-height: 100dvh.
    // Hosted inside the inset-padded C2 column that overflows the
    // host by exactly the inset and pushes the thread composer
    // under the dock (rendered frames pass, 2026-10-22: computed
    // min-height measured 844px inside a 797px host). The host
    // override must therefore use the compound selector that
    // beats the tie in any import order.
    const body = ruleBody(SHELL_CSS, '[data-design="r18"].c2s-c1-host .c1-surface {');
    expect(body).toMatch(/min-height:\s*0/);
    expect(body).toMatch(/flex:\s*1/);
    expect(SHELL_CSS).not.toMatch(/^\s*\.c2s-c1-host \.c1-surface \{/m);
  });
});
