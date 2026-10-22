/**
 * Repair #18 rendered stage - in-page geometry probes.
 *
 * Every function here is SELF-CONTAINED (no imports, no closures) so
 * it can be handed to page.evaluate() verbatim. They measure the
 * RENDERED layout - bounding boxes, clipping ancestors, hit-tests -
 * which is exactly the layer API/jsdom proof cannot see and the
 * layer Walk #4 died on.
 *
 * Design-escalation law applied here (founder, 2026-10-17 23:27):
 * layout integrity is architecture, and NO surface is protected -
 * praise is a floor, not a freeze. These probes run identically on
 * every surface; a pass on Center earns it no exemption on Graphs.
 *
 * Probe vocabulary:
 *  - rectOf / intersects: bounding-box overlap between two elements.
 *  - horizontalOverflow: document-level scrollWidth vs innerWidth,
 *    plus every visible element whose box escapes the viewport
 *    horizontally (the "clipped fragment at the card edge" shape).
 *  - clippedTextNodes: text-bearing elements whose text is cut by a
 *    fixed-height / overflow-hidden ancestor (scrollHeight or
 *    scrollWidth beyond the clip box while the element itself is not
 *    a scroller), or whose own box is smaller than its text needs.
 *  - hitTest: document.elementFromPoint at an element's centre must
 *    return the element or one of its descendants - otherwise
 *    something painted OVER it traps the tap (layering law: tapped /
 *    active surfaces always surface, nothing trapped).
 */

/** Document-level horizontal overflow + viewport escapees.
 *  Escapees are classified: "content" escapees carry leaf text (or an
 *  interactive role) outside the viewport - the clipped-fragment
 *  defect. Pure chrome/decorative escapees (background layers,
 *  aria-hidden ambient fields, full-bleed header backgrounds whose
 *  actual text and controls sit inside the viewport) are reported
 *  separately as decorativeEscapees: visible in the manifest notes,
 *  not failures - a screenshot shows them either way. */
export function probeHorizontalOverflow() {
  const vw = window.innerWidth;
  const doc = document.documentElement;
  const docOverflow = Math.max(doc.scrollWidth, document.body?.scrollWidth || 0) - vw;
  const escapees = [];
  const decorativeEscapees = [];
  const els = document.querySelectorAll("body *");
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    // Elements inside a horizontal scroller are allowed to be wide;
    // they are not viewport escapees.
    let inScroller = false;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const pcs = getComputedStyle(p);
      if (
        (pcs.overflowX === "auto" || pcs.overflowX === "scroll") &&
        p.scrollWidth > p.clientWidth
      ) {
        inScroller = true;
        break;
      }
    }
    if (inScroller) continue;
    if (r.right > vw + 1 || r.left < -1) {
      const info = {
        tag: el.tagName.toLowerCase(),
        testid: el.getAttribute("data-testid"),
        cls: (el.getAttribute("class") || "").slice(0, 80),
        text: (el.textContent || "").trim().slice(0, 60),
        left: Math.round(r.left),
        right: Math.round(r.right),
        width: Math.round(r.width),
      };
      // Content classification: aria-hidden subtrees are decorative
      // by declaration; otherwise an element is content when a leaf
      // text node of its own escapes, or it is itself interactive.
      let ariaHidden = el.getAttribute("aria-hidden") === "true";
      for (let p = el.parentElement; p && !ariaHidden; p = p.parentElement) {
        if (p.getAttribute("aria-hidden") === "true") ariaHidden = true;
      }
      let leafTextEscapes = false;
      if (!ariaHidden) {
        const leaves = el.children.length === 0 ? [el] : [...el.querySelectorAll("*")].filter((d) => d.children.length === 0);
        for (const leaf of leaves) {
          if (!(leaf.textContent || "").trim()) continue;
          const lr = leaf.getBoundingClientRect();
          if (lr.width > 0 && (lr.right > vw + 1 || lr.left < -1)) {
            leafTextEscapes = true;
            break;
          }
        }
      }
      const interactive =
        el.tagName === "BUTTON" || el.tagName === "A" || el.getAttribute("role") === "button";
      if (!ariaHidden && (leafTextEscapes || (interactive && el.children.length === 0))) {
        if (escapees.length < 12) escapees.push(info);
      } else if (decorativeEscapees.length < 12) {
        decorativeEscapees.push(info);
      }
    }
  }
  return { viewportWidth: vw, docOverflow, escapees, decorativeEscapees };
}

/**
 * Text clipped by an ancestor (or by its own fixed box).
 * A text element counts as clipped when:
 *  - its scrollHeight exceeds its clientHeight by >2px while its own
 *    overflowY is hidden/clip (it cannot scroll the rest into view), OR
 *  - its scrollWidth exceeds its clientWidth by >2px while overflowX
 *    is hidden/clip AND text-overflow/white-space would hide the rest
 *    (single-line truncation WITHOUT an ellipsis is still reported as
 *    "truncated" separately - an ellipsis is a design choice, a hard
 *    cut mid-glyph is the W4-03 "omething" defect; both are listed,
 *    the caller decides which are failures for its surface), OR
 *  - walking up, an ancestor with overflow hidden/clip has a box that
 *    the element's rect escapes vertically or horizontally.
 */
export function probeClippedText(rootSelector) {
  const root = rootSelector ? document.querySelector(rootSelector) : document.body;
  if (!root) return { missing: true, clipped: [], truncated: [] };
  const clipped = [];
  const truncated = [];
  const seen = new Set();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textParents = new Set();
  let node;
  while ((node = walker.nextNode())) {
    const t = (node.textContent || "").trim();
    if (t.length < 2) continue;
    if (node.parentElement) textParents.add(node.parentElement);
  }
  for (const el of textParents) {
    if (seen.has(el)) continue;
    seen.add(el);
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    // Screen-reader-only / visually-hidden elements are clipped BY
    // DESIGN (1x1 + clip) - never a rendered defect.
    if ((el.getAttribute("class") || "").includes("sr-only")) continue;
    if (r.width <= 2 || r.height <= 2) continue;
    // Inline boxes have no meaningful client/scroll geometry; their
    // block ancestor carries it.
    if (cs.display === "inline") continue;
    const info = {
      tag: el.tagName.toLowerCase(),
      testid: el.getAttribute("data-testid"),
      cls: (el.getAttribute("class") || "").slice(0, 80),
      text: (el.textContent || "").trim().slice(0, 60),
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
    };
    const vClip =
      el.scrollHeight > el.clientHeight + 2 &&
      (cs.overflowY === "hidden" || cs.overflowY === "clip");
    const hClip =
      el.scrollWidth > el.clientWidth + 2 &&
      (cs.overflowX === "hidden" || cs.overflowX === "clip");
    if (vClip || hClip) {
      if (cs.textOverflow === "ellipsis" && hClip && !vClip) truncated.push(info);
      else clipped.push(info);
      continue;
    }
    // Ancestor clip: element rect escapes a hidden-overflow ancestor.
    // Counted only when BOTH the element and the clipping ancestor
    // intersect the viewport - below the fold, the pair scrolls into
    // view together and the same check fires then; counting it early
    // would flag every long page's lower content.
    const elInView = r.bottom > 0 && r.top < window.innerHeight;
    if (elInView) {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const pcs = getComputedStyle(p);
        if (pcs.overflow === "hidden" || pcs.overflowY === "hidden" || pcs.overflowX === "hidden") {
          const pr = p.getBoundingClientRect();
          const ancInView = pr.bottom > 0 && pr.top < window.innerHeight;
          if (
            ancInView &&
            (r.bottom > pr.bottom + 2 ||
              r.top < pr.top - 2 ||
              r.right > pr.right + 2 ||
              r.left < pr.left - 2)
          ) {
            clipped.push({
              ...info,
              clippedBy: {
                tag: p.tagName.toLowerCase(),
                testid: p.getAttribute("data-testid"),
                cls: (p.getAttribute("class") || "").slice(0, 80),
              },
            });
          }
          break; // nearest clipping ancestor decides
        }
        // A visible-overflow ancestor chain means the nearest scroller
        // or the viewport owns the element - keep walking only while
        // ancestors do not themselves scroll.
        if (pcs.overflowY === "auto" || pcs.overflowY === "scroll") break;
      }
    }
  }
  return { clipped: clipped.slice(0, 20), truncated: truncated.slice(0, 20) };
}

/** Bounding boxes for a selector list; null when absent. When a
 *  selector matches several mounted copies (inactive panes stay in
 *  the DOM in this app), the first VISIBLE match wins - geometry of
 *  a hidden duplicate is not rendered truth. */
export function probeRects(selectors) {
  const out = {};
  for (const [name, sel] of Object.entries(selectors)) {
    let el = null;
    for (const cand of document.querySelectorAll(sel)) {
      const r = cand.getBoundingClientRect();
      const cs = getComputedStyle(cand);
      if (r.width > 0 && r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden") {
        el = cand;
        break;
      }
    }
    if (!el) {
      out[name] = null;
      continue;
    }
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    out[name] = {
      left: r.left,
      top: r.top,
      right: r.right,
      bottom: r.bottom,
      width: r.width,
      height: r.height,
      position: cs.position,
      zIndex: cs.zIndex,
      text: (el.textContent || "").trim().slice(0, 60),
    };
  }
  return out;
}

export function rectsIntersect(a, b, inset = 0) {
  if (!a || !b) return false;
  return (
    a.left + inset < b.right &&
    a.right - inset > b.left &&
    a.top + inset < b.bottom &&
    a.bottom - inset > b.top
  );
}

export function intersectionArea(a, b) {
  if (!a || !b) return 0;
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? Math.round(w * h) : 0;
}

/**
 * Hit-test a selector list: for each visible element matching a
 * selector, elementFromPoint at its centre must land on the element
 * or a descendant. Returns the trapped ones (something else paints
 * over the tap target). Selector entries: { name, selector, all? }
 */
export function probeHitTests(entries) {
  const results = [];
  for (const { name, selector, all } of entries) {
    const els = all
      ? [...document.querySelectorAll(selector)].slice(0, 8)
      : [document.querySelector(selector)].filter(Boolean);
    for (const el of els) {
      if (!el) {
        results.push({ name, selector, present: false, trapped: false });
        continue;
      }
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) {
        results.push({ name, selector, present: true, visible: false, trapped: false });
        continue;
      }
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.pointerEvents === "none") {
        results.push({ name, selector, present: true, visible: false, trapped: false });
        continue;
      }
      const cx = Math.min(Math.max(r.left + r.width / 2, 1), window.innerWidth - 2);
      const cy = Math.min(Math.max(r.top + r.height / 2, 1), window.innerHeight - 2);
      const hit = document.elementFromPoint(cx, cy);
      const ok = !!hit && (hit === el || el.contains(hit));
      results.push({
        name,
        selector,
        present: true,
        visible: true,
        trapped: !ok,
        hitTestid: hit?.getAttribute?.("data-testid") || null,
        hitTag: hit?.tagName?.toLowerCase() || null,
        hitCls: (hit?.getAttribute?.("class") || "").slice(0, 60) || null,
        text: (el.textContent || "").trim().slice(0, 40),
      });
    }
  }
  return results;
}

/** Per-card text clipping: probeClippedText's algorithm scoped to
 *  each card element, so a clipped attendance line on card 3 is
 *  attributed to card 3 (the W4-03 shape). */
export function probeCardTextClipping(cardSelector) {
  const out = [];
  for (const card of document.querySelectorAll(cardSelector)) {
    const cr = card.getBoundingClientRect();
    if (cr.width === 0 || cr.height === 0) continue;
    const clipped = [];
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    const parents = new Set();
    let n;
    while ((n = walker.nextNode())) {
      if ((n.textContent || "").trim().length >= 2 && n.parentElement) parents.add(n.parentElement);
    }
    for (const el of parents) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      if ((el.getAttribute("class") || "").includes("sr-only")) continue;
      if (r.width <= 2 || r.height <= 2) continue;
      if (cs.display === "inline") continue;
      const vClip =
        el.scrollHeight > el.clientHeight + 2 &&
        (cs.overflowY === "hidden" || cs.overflowY === "clip");
      const hClip =
        el.scrollWidth > el.clientWidth + 2 &&
        (cs.overflowX === "hidden" || cs.overflowX === "clip");
      let ancestorClip = false;
      if (!vClip && !hClip) {
        for (let p = el.parentElement; p && p !== card.parentElement; p = p.parentElement) {
          const pcs = getComputedStyle(p);
          if (pcs.overflow === "hidden" || pcs.overflowY === "hidden" || pcs.overflowX === "hidden") {
            const pr = p.getBoundingClientRect();
            if (r.bottom > pr.bottom + 2 || r.right > pr.right + 2 || r.left < pr.left - 2) {
              ancestorClip = true;
            }
            break;
          }
          if (pcs.overflowY === "auto" || pcs.overflowY === "scroll") break;
        }
      }
      if (vClip || hClip || ancestorClip) {
        clipped.push({
          text: (el.textContent || "").trim().slice(0, 60),
          cls: (el.getAttribute("class") || "").slice(0, 60),
          testid: el.getAttribute("data-testid"),
          clientHeight: el.clientHeight,
          scrollHeight: el.scrollHeight,
          clientWidth: el.clientWidth,
          scrollWidth: el.scrollWidth,
          ellipsis: cs.textOverflow === "ellipsis",
        });
      }
    }
    out.push({
      cardTestid: card.getAttribute("data-testid"),
      cardText: (card.textContent || "").trim().slice(0, 80),
      clipped,
    });
  }
  return out;
}

/** Elements whose text matches a pattern (the W4-02 "Check
 *  availability" pill is identified by its copy, not a testid). */
export function probeByText(arg) {
  const { pattern: patternSource, flags = "i" } = typeof arg === "string" ? { pattern: arg } : arg;
  const re = new RegExp(patternSource, flags);
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    if (el.children.length > 0) continue; // leaf-ish elements only
    const t = (el.textContent || "").trim();
    if (!re.test(t) || t.length > 80) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    // Report the painted pill: the closest ancestor that looks like
    // the floating control (or the leaf itself).
    let box = el;
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const pcs = getComputedStyle(p);
      if (pcs.position === "fixed" || pcs.position === "absolute" || pcs.position === "sticky") {
        box = p;
        break;
      }
      if (p.tagName === "BUTTON" || p.getAttribute("role") === "button") {
        box = p;
        break;
      }
    }
    const br = box.getBoundingClientRect();
    const bcs = getComputedStyle(box);
    out.push({
      text: t,
      testid: box.getAttribute("data-testid"),
      cls: (box.getAttribute("class") || "").slice(0, 80),
      position: bcs.position,
      rect: { left: br.left, top: br.top, right: br.right, bottom: br.bottom, width: br.width, height: br.height },
    });
    if (out.length >= 6) break;
  }
  return out;
}

/** Visible message bubbles in the open thread. */
export function probeBubbles() {
  const sels = [
    '[data-testid="human-message-row"]',
    ".voice-note",
    '[data-testid="voice-note-bubble"]',
    ".message-bubble",
    ".bubble",
  ];
  const seen = new Set();
  const out = [];
  for (const sel of sels) {
    for (const el of document.querySelectorAll(sel)) {
      if (seen.has(el)) continue;
      seen.add(el);
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      out.push({
        sel,
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
        text: (el.textContent || "").trim().slice(0, 40),
      });
      if (out.length >= 40) return out;
    }
  }
  return out;
}

/** Card inventory for a list container: per card, its rect, whether
 *  its background (or any absolutely-positioned child) bleeds outside
 *  the card, and whether the card's own box fits its content. */
export function probeCards(arg) {
  const { cardSelector, containerSelector } =
    typeof arg === "string" ? { cardSelector: arg, containerSelector: null } : arg;
  const container = containerSelector ? document.querySelector(containerSelector) : null;
  const cr = container ? container.getBoundingClientRect() : null;
  const cards = [];
  for (const card of document.querySelectorAll(cardSelector)) {
    const r = card.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const bleeds = [];
    for (const child of card.querySelectorAll("*")) {
      const cs = getComputedStyle(child);
      if (cs.position !== "absolute" && cs.position !== "fixed") continue;
      const chr = child.getBoundingClientRect();
      if (chr.width === 0 || chr.height === 0) continue;
      if (
        chr.left < r.left - 2 ||
        chr.right > r.right + 2 ||
        chr.top < r.top - 2 ||
        chr.bottom > r.bottom + 2
      ) {
        bleeds.push({
          testid: child.getAttribute("data-testid"),
          cls: (child.getAttribute("class") || "").slice(0, 80),
          left: Math.round(chr.left - r.left),
          right: Math.round(chr.right - r.right),
          top: Math.round(chr.top - r.top),
          bottom: Math.round(chr.bottom - r.bottom),
        });
      }
    }
    cards.push({
      testid: card.getAttribute("data-testid"),
      cls: (card.getAttribute("class") || "").slice(0, 80),
      text: (card.textContent || "").trim().slice(0, 80),
      rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height },
      scrollHeight: card.scrollHeight,
      clientHeight: card.clientHeight,
      scrollWidth: card.scrollWidth,
      clientWidth: card.clientWidth,
      outsideContainer: cr
        ? r.left < cr.left - 2 || r.right > cr.right + 2
        : r.left < -2 || r.right > window.innerWidth + 2,
      bleeds,
    });
    if (cards.length >= 24) break;
  }
  return { containerPresent: !!container, cards };
}

/** Dock rest-gap probe (R23 WS-23-6, closing audit F-9).
 *
 * Measures the gap between the dock top and the lowest visible text
 * leaf, the way the R21 close-out rig did (cap-close-pad2 audit):
 * gap = dockTop - maxLeafBottom over raw getBoundingClientRect
 * geometry. That raw number is reported for continuity, but it is
 * NOT the verdict: rects only occlude when they share a stacking
 * plane. A leaf inside a full-screen top layer (e.g. graph detail
 * in .opal-top-layer) can sit below the dock's rect while the dock
 * - which lives in the shell beneath the layer - never paints or
 * hit-tests over it. The R21 close recorded exactly that artifact
 * as "plan detail -44" while its own at-glass frame showed the
 * check-in action fully visible.
 *
 * The verdict field is therefore hit-test based: the winning leaf
 * is sampled across its bottom band; it is occluded only if the
 * top element at some sampled point is the dock or inside it.
 * `gap` answers "where do the rects sit"; `occluded` answers "can
 * the user see and tap the leaf" - the second is the law. */
export function probeDockRestGap() {
  const dock =
    document.querySelector('[data-testid="c2-dock"]') ||
    document.querySelector(".c2s-dock");
  const dr = dock ? dock.getBoundingClientRect() : null;
  let winner = null;
  let leafBottom = -1;
  document.querySelectorAll("body *").forEach((el) => {
    if (el.children.length > 0) return;
    if (!(el.textContent || "").trim()) return;
    if (dock && dock.contains(el)) return;
    const cs = getComputedStyle(el);
    if (cs.position === "fixed" || cs.display === "none" || cs.visibility === "hidden") return;
    const r = el.getBoundingClientRect();
    if (r.height === 0 || r.top >= window.innerHeight) return;
    if (r.bottom > leafBottom) {
      leafBottom = r.bottom;
      winner = el;
    }
  });
  let occluded = null;
  let hitSamples = [];
  if (winner && dr && leafBottom > dr.top) {
    const r = winner.getBoundingClientRect();
    occluded = false;
    for (const fx of [0.25, 0.5, 0.75]) {
      for (const fy of [0.25, 0.5, 0.75]) {
        const x = Math.round(r.left + r.width * fx);
        const y = Math.round(r.top + r.height * fy);
        const top = document.elementFromPoint(x, y);
        const inDock = !!(top && dock && (top === dock || dock.contains(top)));
        hitSamples.push({ x, y, inDock });
        if (inDock) occluded = true;
      }
    }
  }
  return {
    dockTop: dr ? Math.round(dr.top) : null,
    leafBottom: Math.round(leafBottom),
    leafText: winner ? (winner.textContent || "").trim().slice(0, 50) : "",
    leafTestid: winner ? winner.getAttribute("data-testid") : null,
    gap: dr ? Math.round(dr.top - leafBottom) : null,
    occluded,
    hitSamples,
  };
}
