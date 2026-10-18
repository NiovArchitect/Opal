/**
 * W4-02 - thread composition (Walk #4, founder screenshots, 2026-10-17).
 *
 * Founder symptom, transcribed verbatim from the Walk #4 catalog:
 * "layering still broken in the real client (NEXT TOGETHER overlap,
 * Check availability pill over bubbles, dev-banner text bleeding
 * through the thread header, clipped fragment at the card edge)".
 *
 * Rendered contract asserted here, in BOTH modes, on the real served
 * app at 390x844, in a seeded thread that carries a plan:
 *  1. The Next Together strip/card never overlaps a message bubble
 *     (bounding-box intersection, 2px tolerance).
 *  2. A "Check availability" pill (identified by its copy - it has no
 *     stable testid) never overlaps a message bubble.
 *  3. The header/banner layer occupies layout space: the thread
 *     header's box does not intersect the first bubble, and no banner
 *     element (the opal_dev seed chip, an invite/status banner)
 *     intersects the header - banner text bleeding THROUGH the header
 *     is a z-order/layout failure, measured as intersection.
 *  4. No element escapes the viewport horizontally (the clipped
 *     fragment at the card edge) and document horizontal overflow = 0.
 *  5. Hit-test law (design escalation 2026-10-17): the strip, the
 *     composer send control and the header back control are not
 *     trapped under another painted element.
 *
 * Screenshot-only, with reason: whether banner TEXT is legible
 * through the header (contrast/ghosting) is a pixel judgment - the
 * geometry intersection above is its programmatic proxy, and the
 * thread screenshot is saved for the founder either way.
 *
 * Expected on the pre-fix build (muse/repair-18 @ 6d081ce0): FAIL -
 * the founder's screenshots prove these defects exist there.
 */
import {
  probeHorizontalOverflow,
  probeRects,
  probeBubbles,
  probeByText,
  probeHitTests,
  rectsIntersect,
  intersectionArea,
} from "../lib/geometry.mjs";
import { openFirstThread, visible } from "../lib/surfaces.mjs";

export default {
  id: "W4-02",
  title: "Thread composition: Next Together overlap, pill over bubbles, banner through header, clipped fragment",
  theme: "rendered-layering",
  class: "R (rendered)",
  surfaces: ["thread", "Next Together strip", "thread header"],
  async run(rctx) {
    const { assert } = rctx;
    for (const mode of ["dark", "light"]) {
      await rctx.withMode(mode, async (page) => {
        const S = (name) => `${mode} thread: ${name}`;
        const loaded = await openFirstThread(page, rctx.config);
        assert.check(S("load"), loaded, "thread with a plan must load in the rendered client");
        if (!loaded) return;
        await rctx.shot(page, `w4-02-thread-${mode}`);

        const rects = await page.evaluate(probeRects, {
          strip: '[data-testid="next-plan-strip"]',
          header: '[data-testid="graph-people-header"]',
          seedChip: '[data-testid="opal-seed-sha-chip"]',
          inviteBanner: '[data-testid="invite-to-opal-banner"]',
          composer: '[data-testid="composer"]',
        });
        const bubbles = await page.evaluate(probeBubbles);
        assert.check(
          S("bubbles present"),
          bubbles.length > 0,
          "the seeded thread must render message bubbles to compose against",
        );

        // 1. Next Together vs bubbles ----------------------------------
        if (rects.strip) {
          for (const b of bubbles) {
            const area = intersectionArea(rects.strip, b);
            assert.check(
              S("next-together vs bubbles"),
              !rectsIntersect(rects.strip, b, 2),
              `Next Together strip overlaps a message bubble by ${area}px^2 (bubble: "${b.text}")`,
            );
          }
        } else {
          assert.check(
            S("next-together present"),
            false,
            "no Next Together strip rendered in a thread whose plan projection exists (founder seed) - the strip is missing, not merely misplaced",
          );
        }

        // 2. Check-availability pill vs bubbles ------------------------
        const pills = await page.evaluate(probeByText, "check availability");
        for (const pill of pills) {
          for (const b of bubbles) {
            assert.check(
              S("availability pill vs bubbles"),
              !rectsIntersect(pill.rect, b, 2),
              `"Check availability" pill (${pill.cls || pill.testid || "unclassed"}) overlaps a message bubble ("${b.text}")`,
            );
          }
        }
        if (pills.length === 0) {
          assert.note(`${mode}: no "Check availability" pill rendered in this thread; overlap leg vacuous this run`);
        }

        // 3. Header occupies layout space; banners do not bleed through -
        if (rects.header) {
          const firstBubble = bubbles[0];
          if (firstBubble) {
            assert.check(
              S("header occupies layout space"),
              firstBubble.top >= rects.header.bottom - 2,
              `first message bubble starts at y=${Math.round(firstBubble.top)} but the thread header ends at y=${Math.round(rects.header.bottom)} - content renders under the header`,
            );
          }
          for (const [name, banner] of [
            ["seed chip", rects.seedChip],
            ["invite banner", rects.inviteBanner],
          ]) {
            if (banner) {
              assert.check(
                S(`${name} vs header`),
                !rectsIntersect(banner, rects.header, 0),
                `${name} intersects the thread header (banner y ${Math.round(banner.top)}-${Math.round(banner.bottom)}, header y ${Math.round(rects.header.top)}-${Math.round(rects.header.bottom)}) - banner text can bleed through the header`,
              );
            }
          }
          if (rects.strip) {
            assert.check(
              S("strip vs header"),
              !rectsIntersect(rects.strip, rects.header, 2),
              "Next Together strip intersects the thread header",
            );
          }
        } else {
          assert.check(S("header present"), false, "thread header did not render");
        }

        // 4. Horizontal escapees / clipped fragments -------------------
        const overflow = await page.evaluate(probeHorizontalOverflow);
        assert.check(
          S("document horizontal overflow"),
          overflow.docOverflow <= 0,
          `document horizontal overflow is ${overflow.docOverflow}px at ${overflow.viewportWidth}px viewport`,
        );
        assert.check(
          S("viewport escapees"),
          overflow.escapees.length === 0,
          `elements escape the viewport horizontally (clipped fragments): ${JSON.stringify(overflow.escapees.slice(0, 4))}`,
        );

        // 5. Hit-tests: nothing traps the primary thread controls ------
        const hits = await page.evaluate(probeHitTests, [
          { name: "next-plan-strip", selector: '[data-testid="next-plan-strip"]' },
          { name: "composer-send", selector: '[data-testid="composer-send"]' },
          { name: "gpt-back", selector: '[data-testid="gpt-back"]' },
        ]);
        for (const h of hits) {
          if (!h.present || !h.visible) continue;
          assert.check(
            S(`hit-test ${h.name}`),
            !h.trapped,
            `${h.name} is trapped: elementFromPoint at its centre hits ${h.hitTestid || h.hitTag || "nothing"} (${h.hitCls || ""}) instead`,
          );
        }
        if (await visible(page, '[data-testid="member-conversation"]')) {
          assert.note(`${mode}: thread composition measured on ${bubbles.length} bubble(s), strip=${rects.strip ? "present" : "absent"}, pills=${pills.length}`);
        }
      });
    }
  },
};
