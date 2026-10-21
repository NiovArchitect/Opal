/**
 * Repair #21 (W-8) - CONTENT-SIGNATURE ASSERTION for capture rigs.
 *
 * Root cause it exists to kill: R20/R21 capture rigs filed frames
 * under surface names the captured DOM never proved. The Flows pad
 * rigs (r21close-scratch/cap-close-padA.mjs, cap-close-padB.mjs,
 * cap-close-pad2.mjs) navigated "flows" with a bare sleep - the C2
 * shell's default route is Center (C2Shell useState<C2Route>
 * ("center")), so pad-rest-flows / pad-dissolve-flows /
 * flows-rest are Center's opening composition filed as Flows.
 * F-18 was closed in R20 on markup declarations
 * (data-surface-purpose) that no capture ever asserted. This
 * module is the structural fix: a frame may not be FILED under a
 * surface name unless that surface's signature elements are
 * present in the captured DOM at shoot time.
 *
 * Contract for rigs (preambles included): call
 *   await assertSurfaceSignature(page, surface, frameName)
 * IMMEDIATELY BEFORE page.screenshot. On mismatch it throws a
 * SurfaceSignatureError - the rig must let that fail the capture
 * (no file is written, the run reports the frame DECLARED, never
 * shot). Do not catch-and-continue around it.
 *
 * Signatures are defined from the REAL served DOM (testids in
 * apps/opal_web/src/c2/shell + opalUi/c1):
 *   flows       C2Home: c2-home + moment stones / feed / trivia card
 *   center      C2CenterOpening: c2-center-opening + c2-center-orb
 *   chats       PeopleChatsList: people-chats-list / chats-row
 *   graphs      C2Graphs: c2-graphs (list) - and NOT a detail
 *   thread      ThreadShell: thread-shell + thread-composer
 *   plan-detail C2GraphDetail: c2-graph-detail
 *   you         C2YouHub: c2-you
 * Every signature also FORBIDS the signature roots of the other
 * primary surfaces, so a Center DOM can never pass as Flows (and
 * vice versa) even if a stray marker leaks.
 */

export const SURFACE_SIGNATURES = {
  flows: {
    label: "Flows (Home / social)",
    anyOf: [
      '[data-testid="c2-moment-stones"]',
      '[data-testid="c2-feed"]',
      '[data-testid="c2-trivia-card"]',
    ],
    allOf: ['[data-testid="c2-home"]'],
    noneOf: [
      '[data-testid="c2-center-opening"]',
      '[data-testid="people-chats-list"]',
      '[data-testid="c2-graphs"]',
      '[data-testid="c2-graph-detail"]',
      '[data-testid="thread-shell"]',
    ],
  },
  center: {
    label: "Center (opening deck)",
    anyOf: ['[data-testid="c2-center-orb"]'],
    allOf: ['[data-testid="c2-center-opening"]'],
    noneOf: [
      '[data-testid="c2-home"]',
      '[data-testid="people-chats-list"]',
      '[data-testid="c2-graphs"]',
      '[data-testid="c2-graph-detail"]',
      '[data-testid="thread-shell"]',
    ],
  },
  chats: {
    label: "Chats (conversation list)",
    anyOf: [
      '[data-testid="people-chats-list"]',
      '[data-testid="chats-row"]',
      '[data-testid="chats-search"]',
    ],
    allOf: [],
    noneOf: [
      '[data-testid="c2-center-opening"]',
      '[data-testid="c2-home"]',
      '[data-testid="c2-graph-detail"]',
      '[data-testid="thread-shell"]',
    ],
  },
  graphs: {
    label: "Graphs (plan list)",
    anyOf: ['[data-testid="c2-graphs"]'],
    allOf: [],
    noneOf: [
      '[data-testid="c2-center-opening"]',
      '[data-testid="c2-home"]',
      '[data-testid="c2-graph-detail"]',
      '[data-testid="thread-shell"]',
    ],
  },
  thread: {
    label: "Thread (conversation)",
    anyOf: ['[data-testid="thread-composer"]'],
    allOf: ['[data-testid="thread-shell"]'],
    noneOf: [
      '[data-testid="c2-center-opening"]',
      '[data-testid="c2-home"]',
      '[data-testid="c2-graph-detail"]',
    ],
  },
  "plan-detail": {
    label: "Plan detail (graph detail)",
    anyOf: ['[data-testid="c2-detail-back"]', '[data-testid="c2-detail-attendance"]'],
    allOf: ['[data-testid="c2-graph-detail"]'],
    noneOf: [
      '[data-testid="c2-center-opening"]',
      '[data-testid="c2-home"]',
      '[data-testid="thread-shell"]',
    ],
  },
  you: {
    label: "You (hub)",
    anyOf: ['[data-testid="c2-you"]'],
    allOf: [],
    noneOf: [
      '[data-testid="c2-center-opening"]',
      '[data-testid="c2-home"]',
      '[data-testid="c2-graph-detail"]',
      '[data-testid="thread-shell"]',
    ],
  },
  // Repair #21 (W-12) - the bond is a SHEET: it opens over Flows
  // (a stone name) and over a thread (the profile's "Our stone"),
  // so the surface beneath is expected and NOT forbidden. The
  // stone root is the discriminator - a frame without it (a bare
  // thread, a bare Flows) can never file as bond. What it must
  // never be confused with: Center and a plan detail.
  bond: {
    label: "Bond (the shared stone)",
    anyOf: ['[data-testid="c2-bond-stone"]'],
    allOf: ['[data-testid="c2-bond-stone"]'],
    noneOf: [
      '[data-testid="c2-center-opening"]',
      '[data-testid="c2-graph-detail"]',
    ],
  },
  // Repair #21 (W-17) - the creation walkthrough: the add sheet
  // and each option's next step (composer, graph-create flow,
  // go-live) are flow/sheet layers over the shell, so the
  // surface beneath is expected; the creation root is the
  // discriminator. A bare Flows (or any other surface) never
  // files as creation.
  creation: {
    label: "Creation (add sheet + next steps)",
    anyOf: [
      '[data-testid="c2-create-sheet"]',
      '[data-testid="c2-share-composer"]',
      '[data-testid="c2-create-flow"]',
      '[data-testid="c2-go-live"]',
    ],
    allOf: [],
    noneOf: [
      '[data-testid="c2-center-opening"]',
      '[data-testid="people-chats-list"]',
      '[data-testid="c2-graph-detail"]',
      '[data-testid="thread-shell"]',
    ],
  },
  // Repair #21 (W-17 extended) - story consumption: the viewer
  // frame carries the viewer root; the exit-return frame
  // carries the stream it returned to (the rail is its proof -
  // Home never unmounted). Either files as story-viewer;
  // another surface open instead fails.
  "story-viewer": {
    label: "Story viewer (consumption + exit return)",
    anyOf: [
      '[data-testid="c2-story-viewer"]',
      '[data-testid="c2-stone-self"]',
    ],
    allOf: [],
    noneOf: [
      '[data-testid="c2-center-opening"]',
      '[data-testid="people-chats-list"]',
      '[data-testid="c2-graph-detail"]',
      '[data-testid="thread-shell"]',
    ],
  },
  /**
   * CALL-FAMILY RULE (Repair #21, W-16) - third offense of the
   * capture-integrity species: pack-v2 filed
   * incall-ringing-outgoing-dark.png, an old-build CALL LOG
   * (badge 3e230af, "Home" dock label, duplicated Jordan Ellis
   * log rows), as an in-call ringing frame. The founder caught
   * it at the glass 2026-10-20 21:20 PDT; the frame is
   * quarantined in pack-archive/mislabeled-incall-r19-3e230af/.
   *
   * The two call surfaces are opposites and the signatures say
   * so in both directions:
   *   incall   CallSurface (opalUi/CallSurfaces.tsx): the
   *            call-surface root plus at least one in-call
   *            presence/control element (orbit stage, graphing
   *            light, assist pane, end control), and NO
   *            call-log row signatures anywhere.
   *   call-log PeopleCallsList (C2 shell Calls tab): the list
   *            root or a calls-row, and NO call-surface root.
   * A call-log DOM therefore fails "incall" twice over (missing
   * root AND forbidden rows), and an in-call DOM fails
   * "call-log" - the reverse filing is refused too.
   */
  incall: {
    label: "In-call (live call surface)",
    anyOf: [
      '[data-testid="call-orbit"]',
      '[data-testid="graphing-light"]',
      '[data-testid="call-assist"]',
      '[data-testid="call-end"]',
      '[data-testid="call-stage"]',
    ],
    allOf: ['[data-testid="call-surface"]'],
    noneOf: [
      '[data-testid="people-calls-list"]',
      '[data-testid="calls-row"]',
      '[data-testid="people-chats-list"]',
      '[data-testid="c2-center-opening"]',
      '[data-testid="c2-home"]',
      '[data-testid="c2-graph-detail"]',
      '[data-testid="thread-shell"]',
    ],
  },
  "call-log": {
    label: "Call log (Calls tab list)",
    anyOf: [
      '[data-testid="people-calls-list"]',
      '[data-testid="calls-row"]',
    ],
    allOf: [],
    noneOf: [
      '[data-testid="call-surface"]',
      '[data-testid="call-orbit"]',
      '[data-testid="graphing-light"]',
      '[data-testid="c2-center-opening"]',
      '[data-testid="c2-home"]',
      '[data-testid="thread-shell"]',
    ],
  },
};

export class SurfaceSignatureError extends Error {
  constructor(message) {
    super(message);
    this.name = "SurfaceSignatureError";
    this.signatureFailure = true;
  }
}

/**
 * Pure check over a "which selectors are present" probe - kept
 * separate from Playwright so it is unit-testable without a
 * browser (surfaceSignature.test.mjs) and reusable from any rig.
 * `present` is a Set (or array) of the signature selectors found
 * in the DOM. Returns { ok, missing, forbidden, matchedAny }.
 */
export function checkSurfaceSignature(surface, present) {
  const sig = SURFACE_SIGNATURES[surface];
  if (!sig) {
    return {
      ok: false,
      unknownSurface: true,
      missing: [],
      forbidden: [],
      matchedAny: false,
      label: surface,
    };
  }
  const has = (sel) => (present instanceof Set ? present.has(sel) : present.includes(sel));
  const missing = sig.allOf.filter((sel) => !has(sel));
  const matchedAny = sig.anyOf.length === 0 || sig.anyOf.some((sel) => has(sel));
  if (!matchedAny) missing.push(`any of: ${sig.anyOf.join(" | ")}`);
  const forbidden = sig.noneOf.filter((sel) => has(sel));
  return {
    ok: missing.length === 0 && forbidden.length === 0,
    missing,
    forbidden,
    matchedAny,
    label: sig.label,
  };
}

/** Probe the live page for every selector any signature knows. */
export async function probeSurfaceDom(page) {
  const selectors = new Set();
  for (const sig of Object.values(SURFACE_SIGNATURES)) {
    for (const sel of [...sig.allOf, ...sig.anyOf, ...sig.noneOf]) selectors.add(sel);
  }
  const list = [...selectors];
  return page.evaluate((sels) => {
    const found = [];
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      // A mounted-but-hidden leftover is not the surface on glass.
      if (cs.display !== "none" && cs.visibility !== "hidden" && r.width >= 0) {
        found.push(sel);
      }
    }
    return found;
  }, list);
}

/**
 * The rig-facing assertion. Throws SurfaceSignatureError on
 * mismatch - the caller must NOT write the frame file.
 */
export async function assertSurfaceSignature(page, surface, frameName = surface) {
  const present = await probeSurfaceDom(page);
  const result = checkSurfaceSignature(surface, present);
  if (!result.ok) {
    throw new SurfaceSignatureError(
      `SURFACE SIGNATURE MISMATCH: frame "${frameName}" may not be filed as ` +
        `"${surface}" (${result.label}). ` +
        (result.unknownSurface
          ? `Unknown surface name - known: ${Object.keys(SURFACE_SIGNATURES).join(", ")}. `
          : "") +
        (result.missing.length ? `Missing: ${result.missing.join("; ")}. ` : "") +
        (result.forbidden.length
          ? `Forbidden present: ${result.forbidden.join("; ")}. `
          : "") +
        `DOM actually carries: ${present.join(", ") || "(no signature markers)"}. ` +
        `No file was written for this frame.`,
    );
  }
  return result;
}

/**
 * Map a pack frame name to the surface it claims, or null when the
 * name makes no surface claim (detail crops, sheets, states).
 * Used by audit tooling over existing packs.
 */
export function surfaceClaimedByFrameName(name) {
  const base = name.replace(/\.png$/, "").replace(/-(dark|light)$/, "");
  if (/(^|-)flows($|-)/.test(base) || /^flow(-|$)/.test(base) || /^home(-|$)/.test(base)) {
    if (base.includes("vs-center-center")) return "center";
    if (base.includes("vs-center")) return "flows";
    return "flows";
  }
  if (/^pad-(rest|dissolve)-flows$/.test(base)) return "flows";
  if (/^pad-(rest|dissolve)-chats$/.test(base)) return "chats";
  if (/^pad-(rest|dissolve)-graphs$/.test(base)) return "graphs";
  if (/^pad-(rest|dissolve)-thread$/.test(base)) return "thread";
  if (/^pad-(rest|dissolve)-plan-detail$/.test(base)) return "plan-detail";
  if (/^bond(-|$)/.test(base)) return "bond";
  if (/^story-viewer(-|$)/.test(base)) return "story-viewer";
  if (/^creation(-|$)/.test(base)) return "creation";
  if (/^incall(-|$)/.test(base)) return "incall";
  if (/^calls-log(-|$)/.test(base) || /^callog(-|$)/.test(base)) return "call-log";
  if (/^chats(-|$)/.test(base)) return "chats";
  if (/^thread(-|$)/.test(base)) return "thread";
  if (/^graphs(-|$)/.test(base)) return "graphs";
  if (/^graph-detail/.test(base) || /^plan-detail/.test(base)) return "plan-detail";
  if (/^center(-|$)/.test(base)) return "center";
  return null;
}
