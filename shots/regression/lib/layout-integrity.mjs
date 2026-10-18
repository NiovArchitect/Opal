/**
 * Repair #18 (founder escalation, 2026-10-17 23:27 PDT) - LAYOUT
 * INTEGRITY audit: the class-level rendered-stage verification.
 *
 * The founder's requirement is that this defect CLASS be catchable by
 * construction on future builds - "asset not coming forward / hidden
 * behind another asset" (W4-02), card content bleeding past its card
 * or the viewport (W4-03) - not that one instance be re-checked by
 * hand. This module is the class-level form: given ANY rendered
 * surface in a real browser, it enumerates the visible interactive
 * elements of the ACTIVE LAYER and asserts, per element:
 *
 *  1. HIT-TESTING - the element's center point hit-tests
 *     (document.elementFromPoint) to the element itself or one of its
 *     descendants. An element that renders but cannot be tapped
 *     because something else owns its center point is a FAIL.
 *  2. CONTAINMENT - the element's bounding box is contained within
 *     the viewport horizontally (no bleeding off either edge), within
 *     its designated layout region when it sits inside an element
 *     carrying [data-layout-region], and - for card surfaces - every
 *     descendant of a card box is contained within the card box.
 *  3. STACKING SANITY - every pair of interactive elements whose
 *     boxes intersect is recorded in the manifest as a REVIEWED item
 *     (a, b, intersection point, who is topmost there). Auto-FAIL
 *     when a third, unrelated element owns the intersection point,
 *     and - across a modal boundary - when the BACKGROUND element
 *     owns the point (background poking through a sheet is the
 *     "asset not coming forward" class in its stacking form).
 *
 * LAYER SCOPING (honest semantics): when a modal/sheet
 * ([role="dialog"] / the graph-detail sheet) is open, it IS the
 * surface. Interactive elements outside it are unreachable BY DESIGN
 * (that is what a modal is), so they are enumerated in the manifest
 * as `backgrounded` - counted and named, never silently dropped -
 * and are not hit-test-failed. Within the active layer every rule
 * applies at full strength. When no modal is open, the whole
 * document is the active layer.
 *
 * Honest limits (stated, not hidden): the audit sees the DOM the
 * browser rendered at audit time, for the surfaces the caller drives
 * it to. It does not prove absence of overlaps on surfaces it never
 * visited, and pointer-events:none overlays that own no interactive
 * elements are visible to the hit-test check only when they cover an
 * interactive element's center (which is exactly the founder's
 * failure class).
 *
 * Usage from a Playwright case:
 *   import { runLayoutAudit } from "../lib/layout-integrity.mjs";
 *   const manifest = await runLayoutAudit(page, { surface: "graph-detail" });
 *   // manifest.failures: [{kind, element, detail}] - non-empty = FAIL
 *   // manifest.reviewedIntersections: every interactive intersection
 *   // manifest.backgrounded: elements inert behind the active layer
 */

export const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "input",
  "select",
  "textarea",
  "[role='button']",
  "[role='tab']",
  "[role='menuitem']",
  "[role='link']",
  "[role='checkbox']",
  "[role='switch']",
  "[contenteditable='true']",
].join(", ");

export const CARD_SELECTOR =
  "[role='dialog'], [data-testid='graph-detail-sheet'], .alignment-card, [data-layout-card]";

export const LAYER_SELECTOR =
  "[role='dialog'], [data-testid='graph-detail-sheet'], [data-layer-band='sheet'], [data-layer-band='flow'], [data-layer-band='stage'], [data-layer-band='call'], [data-layer-band='system']";

/** The in-page audit. Pure DOM: no framework assumptions beyond the
 *  selectors above, so it runs unchanged on any future surface. */
export function layoutAuditInPage(opts) {
  const TOL = 1.5; // px tolerance for sub-pixel rounding
  const interactiveSelector = opts.interactiveSelector;
  const cardSelector = opts.cardSelector;
  const layerSelector = opts.layerSelector;

  const describe = (el) => {
    if (!el || el.nodeType !== 1) return String(el);
    const testid = el.getAttribute("data-testid");
    const role = el.getAttribute("role");
    const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return (
      `${el.tagName.toLowerCase()}` +
      (testid ? `[data-testid=${testid}]` : "") +
      (role ? `[role=${role}]` : "") +
      (text ? ` "${text}"` : "")
    );
  };

  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return null;
    const cs = window.getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return null;
    if (Number(cs.opacity) === 0) return null;
    return r;
  };

  // -- Active layer: the last visible layer element in DOM order is
  // the topmost surface. Everything else interactive is background.
  let layer = null;
  for (const candidate of document.querySelectorAll(layerSelector)) {
    if (visible(candidate)) layer = candidate;
  }
  const inLayer = (el) => !layer || layer === el || layer.contains(el);

  const elements = [];
  const backgrounded = [];
  const failures = [];

  for (const el of document.querySelectorAll(interactiveSelector)) {
    const r = visible(el);
    if (!r) continue;
    if (!inLayer(el)) {
      backgrounded.push(describe(el));
      continue;
    }
    const entry = {
      desc: describe(el),
      rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height },
      center: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
      hitTest: null,
      containment: [],
    };

    // -- 1. HIT-TESTING ------------------------------------------------
    const hit = document.elementFromPoint(entry.center.x, entry.center.y);
    if (hit === el || (hit && el.contains(hit))) {
      entry.hitTest = "self";
    } else {
      entry.hitTest = `covered-by:${describe(hit)}`;
      failures.push({
        kind: "hit-test",
        element: entry.desc,
        detail: `center (${Math.round(entry.center.x)},${Math.round(entry.center.y)}) hit-tests to ${describe(hit)}, not the element or a descendant - rendered but unreachable by tap`,
      });
    }

    // -- 2. CONTAINMENT --------------------------------------------------
    if (r.left < -TOL || r.right > window.innerWidth + TOL) {
      entry.containment.push("viewport-x");
      failures.push({
        kind: "containment-viewport",
        element: entry.desc,
        detail: `bounding box [${Math.round(r.left)}..${Math.round(r.right)}] bleeds outside viewport width ${window.innerWidth}`,
      });
    }
    const region = el.closest("[data-layout-region]");
    if (region) {
      const rr = region.getBoundingClientRect();
      if (r.left < rr.left - TOL || r.right > rr.right + TOL || r.top < rr.top - TOL || r.bottom > rr.bottom + TOL) {
        entry.containment.push("region");
        failures.push({
          kind: "containment-region",
          element: entry.desc,
          detail: `bounding box escapes its layout region ${describe(region)}`,
        });
      }
    }
    elements.push({ el, entry });
  }

  // Card containment: every descendant of a card box in the active
  // layer stays inside it (background cards are inert by design).
  const cardBoxes = [];
  for (const card of document.querySelectorAll(cardSelector)) {
    const cr = visible(card);
    if (!cr) continue;
    if (!inLayer(card)) continue;
    cardBoxes.push({ desc: describe(card), rect: cr });
    for (const desc of card.querySelectorAll("*")) {
      const dr = visible(desc);
      if (!dr) continue;
      if (dr.left < cr.left - TOL || dr.right > cr.right + TOL) {
        failures.push({
          kind: "containment-card",
          element: describe(desc),
          detail: `content extends past its card box ${describe(card)} horizontally [${Math.round(dr.left)}..${Math.round(dr.right)}] vs card [${Math.round(cr.left)}..${Math.round(cr.right)}]`,
        });
      }
    }
  }

  // -- 3. STACKING SANITY ------------------------------------------------
  // Pairs inside the layer: reviewed; third-party owner = FAIL.
  // Pairs crossing the layer boundary: reviewed as modal coverage;
  // the BACKGROUND element owning the point = FAIL (background
  // poking through the sheet). Background/background pairs are inert
  // and not this surface's pass (they are enumerated above).
  const reviewedIntersections = [];
  const allVisible = [...elements];
  if (layer) {
    for (const el of document.querySelectorAll(interactiveSelector)) {
      const r = visible(el);
      if (!r || inLayer(el)) continue;
      allVisible.push({
        el,
        entry: {
          desc: describe(el),
          rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height },
        },
        background: true,
      });
    }
  }
  for (let i = 0; i < allVisible.length; i++) {
    for (let j = i + 1; j < allVisible.length; j++) {
      const a = allVisible[i];
      const b = allVisible[j];
      if (a.background && b.background) continue;
      const ix = Math.max(a.entry.rect.left, b.entry.rect.left);
      const iy = Math.max(a.entry.rect.top, b.entry.rect.top);
      const ix2 = Math.min(a.entry.rect.right, b.entry.rect.right);
      const iy2 = Math.min(a.entry.rect.bottom, b.entry.rect.bottom);
      if (ix2 - ix <= 2 || iy2 - iy <= 2) continue;
      // Ancestor/descendant pairs legitimately nest (a button inside
      // a clickable card): not an intersection finding.
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const px = (ix + ix2) / 2;
      const py = (iy + iy2) / 2;
      const top = document.elementFromPoint(px, py);
      const topOwner =
        top === a.el || a.el.contains(top)
          ? a.entry.desc
          : top === b.el || b.el.contains(top)
            ? b.entry.desc
            : describe(top);
      const crossing = Boolean(a.background) !== Boolean(b.background);
      const item = {
        a: a.entry.desc,
        b: b.entry.desc,
        point: { x: Math.round(px), y: Math.round(py) },
        topmost: topOwner,
        kind: crossing ? "modal-coverage" : "same-layer",
      };
      reviewedIntersections.push(item);

      const thirdPartyTop =
        topOwner !== a.entry.desc && topOwner !== b.entry.desc;
      if (crossing) {
        const bgEntry = a.background ? a : b;
        if (topOwner === bgEntry.entry.desc) {
          failures.push({
            kind: "stacking-background-through-modal",
            element: `${item.a} x ${item.b}`,
            detail: `background element owns the intersection point (${item.point.x},${item.point.y}) over the active layer - background poking through the sheet`,
          });
        } else if (thirdPartyTop) {
          failures.push({
            kind: "stacking-third-party-top",
            element: `${item.a} x ${item.b}`,
            detail: `intersection point (${item.point.x},${item.point.y}) is owned by a third element: ${item.topmost}`,
          });
        }
      } else if (thirdPartyTop) {
        failures.push({
          kind: "stacking-third-party-top",
          element: `${item.a} x ${item.b}`,
          detail: `intersection point (${item.point.x},${item.point.y}) is owned by a third element: ${item.topmost}`,
        });
      }
    }
  }

  return {
    surface: opts.surface || null,
    url: window.location.href,
    theme: document.documentElement.getAttribute("data-theme"),
    viewport: { width: window.innerWidth, height: window.innerHeight },
    activeLayer: layer ? describe(layer) : null,
    interactiveCount: elements.length,
    backgroundedCount: backgrounded.length,
    backgrounded,
    elements: elements.map(({ entry }) => entry),
    cardBoxes: cardBoxes.map((c) => c.desc),
    reviewedIntersections,
    failures,
  };
}

/** Run the audit inside a Playwright page. Returns the manifest. */
export async function runLayoutAudit(page, opts = {}) {
  return page.evaluate(
    ({ fnSource, auditOpts }) => {
      // eslint-disable-next-line no-eval
      const fn = eval(`(${fnSource})`);
      return fn(auditOpts);
    },
    {
      fnSource: layoutAuditInPage.toString(),
      auditOpts: {
        surface: opts.surface || null,
        interactiveSelector: opts.interactiveSelector || INTERACTIVE_SELECTOR,
        cardSelector: opts.cardSelector || CARD_SELECTOR,
        layerSelector: opts.layerSelector || LAYER_SELECTOR,
      },
    },
  );
}
