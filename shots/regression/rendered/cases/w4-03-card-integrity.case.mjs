/**
 * W4-03 - card integrity (Walk #4, founder screenshots, 2026-10-17).
 *
 * Founder symptom, transcribed verbatim from the Walk #4 catalog:
 * "Graphs card clipping (attendance line cut off, title 'omething'
 * missing its first letter, stray background shape)".
 *
 * Rendered contract asserted here, in BOTH modes, on the real served
 * app at 390x844:
 *  1. Every plan/graph card on the Graphs list renders its FULL text:
 *     no text node clipped by a fixed-height / overflow ancestor -
 *     the attendance line cut off and the title losing its first
 *     letter are both this defect (vertical clip and horizontal clip
 *     of the text's own box, plus ancestor-clip escape).
 *  2. Card height fits content: a card's scrollHeight does not
 *     exceed its clientHeight while its overflow is hidden (content
 *     the card cannot show and cannot scroll to).
 *  3. No background element bleeds outside its card, and no card
 *     bleeds outside the list container (the stray background shape).
 *  4. The same full-text rule on the plan/graph detail surface the
 *     card opens, and on the Home plan cards if any render.
 *  5. Document horizontal overflow = 0 on the Graphs list.
 *
 * Screenshot-only, with reason: a deliberate single-line ellipsis
 * truncation (text-overflow: ellipsis) is reported as a NOTE, not a
 * failure - whether a given title SHOULD truncate is a design
 * judgment for the founder's screenshot pass; a hard clip without an
 * ellipsis (mid-glyph cut, the "omething" shape) is a failure.
 *
 * Expected on the pre-fix build (muse/repair-18 @ 6d081ce0): FAIL -
 * the founder's screenshots prove these defects exist there.
 */
import {
  probeHorizontalOverflow,
  probeCards,
  probeCardTextClipping,
} from "../lib/geometry.mjs";
import { ensureMemberTab, waitReady } from "../lib/surfaces.mjs";

const CARD_SELECTORS = [
  '[data-testid^="graphs-card-"]',
  '[data-testid="plan-shared-card"]',
  '[data-testid="plan-converging-card"]',
  '[data-testid="graph-journey-card"]',
];

async function assertCards(rctx, page, mode, surfaceLabel, cardSelector, containerSelector, require = true) {
  const { assert } = rctx;
  const S = (n) => `${mode} ${surfaceLabel}: ${n}`;
  const { cards } = await page.evaluate(probeCards, { cardSelector, containerSelector });
  const clipping = await page.evaluate(probeCardTextClipping, cardSelector);
  if (!require && cards.length === 0) {
    assert.note(`${mode} ${surfaceLabel}: no cards matched ${cardSelector} (optional selector this run)`);
    return 0;
  }
  assert.check(
    S("cards present"),
    cards.length > 0,
    `no cards matched ${cardSelector} on ${surfaceLabel} - the seeded account should render plan/graph cards here`,
  );
  for (const card of cards) {
    assert.check(
      S("card fits content"),
      !(card.scrollHeight > card.clientHeight + 2),
      `card ${card.testid || card.cls} clips its content: scrollHeight=${card.scrollHeight} clientHeight=${card.clientHeight} ("${card.text}")`,
    );
    assert.check(
      S("card inside container"),
      !card.outsideContainer,
      `card ${card.testid || card.cls} extends outside its list container ("${card.text}")`,
    );
    for (const bleed of card.bleeds) {
      assert.check(
        S("no background bleed"),
        false,
        `absolutely-positioned element inside card ${card.testid || card.cls} bleeds outside the card (offsets L${bleed.left} R${bleed.right} T${bleed.top} B${bleed.bottom}, cls=${bleed.cls}) - the stray background shape`,
      );
    }
  }
  for (const entry of clipping) {
    for (const c of entry.clipped) {
      if (c.ellipsis) {
        assert.note(
          `${mode} ${surfaceLabel}: card ${entry.cardTestid} truncates "${c.text}" with an ellipsis (design judgment - screenshot pass decides)`,
        );
        continue;
      }
      assert.check(
        S("full text visible"),
        false,
        `card ${entry.cardTestid} clips text "${c.text}" (client ${c.clientWidth}x${c.clientHeight} vs scroll ${c.scrollWidth}x${c.scrollHeight}, cls=${c.cls})`,
      );
    }
  }
  return cards.length;
}

export default {
  id: "W4-03",
  title: "Card integrity: attendance line cut off, title losing its first letter, stray background shape",
  theme: "rendered-card-integrity",
  class: "R (rendered)",
  surfaces: ["Graphs list", "graph detail", "Home plan cards"],
  async run(rctx) {
    const { assert } = rctx;
    for (const mode of ["dark", "light"]) {
      await rctx.withMode(mode, async (page) => {
        const S = (n) => `${mode} graphs-list: ${n}`;
        // -- Graphs list ------------------------------------------------
        await ensureMemberTab(page, rctx.config, "graphs");
        const loaded = await waitReady(page, rctx.config, '[data-testid="graphs-home"]');
        assert.check(S("load"), loaded, "Graphs list must load in the rendered client");
        if (!loaded) return;
        await rctx.shot(page, `w4-03-graphs-list-${mode}`);

        const overflow = await page.evaluate(probeHorizontalOverflow);
        assert.check(
          S("document horizontal overflow"),
          overflow.docOverflow <= 0,
          `document horizontal overflow is ${overflow.docOverflow}px`,
        );
        assert.check(
          S("viewport escapees"),
          overflow.escapees.length === 0,
          `elements escape the viewport horizontally: ${JSON.stringify(overflow.escapees.slice(0, 4))}`,
        );

        let total = 0;
        for (const sel of CARD_SELECTORS.slice(0, 1)) {
          total += await assertCards(rctx, page, mode, "graphs-list", sel, '[data-testid="graphs-home-list"]');
        }
        // Home-style plan cards also render inside the Graphs plans field.
        await assertCards(rctx, page, mode, "graphs-list (plan cards)", '[data-testid="plan-shared-card"], [data-testid="plan-converging-card"]', '[data-testid="plans-field"]', false);
        assert.note(`${mode}: graphs-list cards measured: ${total}`);

        // -- Graph detail (opened from the first card) ------------------
        const opener = page.locator('[data-testid^="graphs-open-"]:visible, [data-testid^="graphs-card-"]:visible').first();
        if ((await opener.count()) > 0) {
          await opener.click({ timeout: 10000 }).catch(() => {});
          const ok = await waitReady(page, rctx.config, '[data-testid="graph-detail-sheet"]');
          assert.check(
            `${mode} graph-detail: load`,
            ok,
            "graph detail must open from a Graphs card",
          );
          if (ok) {
            await rctx.shot(page, `w4-03-graph-detail-${mode}`);
            const detailClip = await page.evaluate(
              (sel) => {
                // Reuse the card probe against the detail sheet body.
                const sheet = document.querySelector(sel);
                if (!sheet) return { clipped: [] };
                const clipped = [];
                const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
                const parents = new Set();
                let n;
                while ((n = walker.nextNode())) {
                  if ((n.textContent || "").trim().length >= 2 && n.parentElement) parents.add(n.parentElement);
                }
                for (const el of parents) {
                  const cs = getComputedStyle(el);
                  if (
                    el.scrollHeight > el.clientHeight + 2 &&
                    (cs.overflowY === "hidden" || cs.overflowY === "clip")
                  ) {
                    clipped.push({ text: (el.textContent || "").trim().slice(0, 60), cls: (el.getAttribute("class") || "").slice(0, 60) });
                  }
                }
                return { clipped: clipped.slice(0, 10) };
              },
              '[data-testid="graph-detail-sheet"]',
            );
            for (const c of detailClip.clipped) {
              assert.check(
                `${mode} graph-detail: full text visible`,
                false,
                `graph detail clips text "${c.text}" (cls=${c.cls})`,
              );
            }
          }
        } else {
          assert.check(`${mode} graph-detail: opener present`, false, "no Graphs card opener rendered to open graph detail from");
        }
      });
    }
  },
};
