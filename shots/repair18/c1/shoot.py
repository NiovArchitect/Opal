"""Repair #18 C1 rendered evidence: phone viewport 390x844, both modes,
every C1 surface, plus composition assertions (plan-card centers owned
by the card via elementFromPoint, no horizontal overflow, no clipped
plan titles). Against a LOCALLY served build from this worktree."""
import glob
import json
import os
import pathlib

from playwright.sync_api import sync_playwright

OUT = pathlib.Path(__file__).parent
BASE = os.environ.get("C1_BASE", "http://127.0.0.1:4319")
SURFACES = ["center", "centerlist", "centerchat", "chats", "thread", "states", "sheet"]
MODES = ["dark", "light"]

candidates = sorted(glob.glob(os.path.expanduser("~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome")))
exe = candidates[-1] if candidates else None
print("chromium:", exe)

results = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=exe, args=["--no-sandbox"])
    for mode in MODES:
        for surface in SURFACES:
            page = browser.new_page(viewport={"width": 390, "height": 844})
            page.goto(f"{BASE}/?review=c1&surface={surface}&mode={mode}", wait_until="networkidle")
            page.wait_for_timeout(450)
            checks = page.evaluate("""() => {
              const out = { overflowX: document.documentElement.scrollWidth > 391,
                            cardCentersOwned: [], clippedTitles: [], cardCount: 0 };
              document.querySelectorAll('[data-testid="plan-card"]').forEach((el) => {
                const r = el.getBoundingClientRect();
                if (r.width === 0 || r.bottom < 0 || r.top > innerHeight) return;
                out.cardCount++;
                const hit = document.elementFromPoint(r.left + r.width / 2, Math.min(r.top + 14, innerHeight - 4));
                out.cardCentersOwned.push(!!(hit && (el.contains(hit) ||
                  (hit.closest && hit.closest('[data-testid="plan-card"]') === el))));
                const title = el.querySelector('.c1-plan-title');
                if (title && title.scrollHeight > title.clientHeight + 2 &&
                    getComputedStyle(title).overflow !== 'hidden') out.clippedTitles.push(title.textContent);
              });
              return out;
            }""")
            full = surface not in ("sheet", "thread")
            page.screenshot(path=str(OUT / f"{surface}-{mode}.png"), full_page=full)
            results.append({"surface": surface, "mode": mode, **checks})
            page.close()
    browser.close()

(OUT / "assertions.json").write_text(json.dumps(results, indent=2))
print(json.dumps(results, indent=2))
