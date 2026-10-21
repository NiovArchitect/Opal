/**
 * Repair #18 THEME UNIFICATION - indicator-drift checks for the
 * unified surfaces (communication-model section 9 / MP-11):
 *  - the SAME state renders the SAME token on the ChatsHome family
 *    (row / strip / call), on Home's plan cards, and everywhere else:
 *    every state treatment in unifyChats.css derives from
 *    --orb-indicator-<state>, and those tokens equal PLAN_STATE_HEX;
 *  - ambient intensity is achieved by MIXING the canonical token
 *    (color-mix from var(--pa-state) / var(--orb-indicator-*)), never
 *    by introducing a look-alike hue: the unify sheet contains no raw
 *    state hex at all;
 *  - decorative treatments carry NO canonical state hex: the retired
 *    neon treatments (per-name call-row borders, ear-gradient
 *    avatars, saturated bubble borders, the dock's cyan/gold/magenta
 *    ring) are gone from the unified surfaces' sources;
 *  - the dock halo break exists in BOTH shells' pads.
 */
import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PLAN_STATE_HEX } from "./planStateColors";

const unify = readFileSync(resolve(__dirname, "unifyChats.css"), "utf8");
const orbTokens = readFileSync(resolve(__dirname, "orbTokens.css"), "utf8");
const c2Tokens = readFileSync(resolve(__dirname, "c2Tokens.css"), "utf8");
const legacyStyles = readFileSync(resolve(__dirname, "../styles.css"), "utf8");
const c2shell = readFileSync(
  resolve(__dirname, "../c2/shell/c2shell.css"),
  "utf8",
);
const chatsHome = readFileSync(
  resolve(__dirname, "../opalUi/ChatsHome.tsx"),
  "utf8",
);
const main = readFileSync(resolve(__dirname, "../main.tsx"), "utf8");

const STATES = ["forming", "action", "ready", "happening", "past"] as const;

describe("unify: indicator drift - one token source", () => {
  it("orb indicator tokens equal PLAN_STATE_HEX for every state", () => {
    for (const s of STATES) {
      const m = orbTokens.match(
        new RegExp(`--orb-indicator-${s}:\\s*(#[0-9a-fA-F]{6})`),
      );
      expect(m, `--orb-indicator-${s}`).not.toBeNull();
      expect(m![1]!.toLowerCase()).toBe(PLAN_STATE_HEX[s].toLowerCase());
    }
  });

  it("PlanAwareness ambient treatment mixes FROM --pa-state (the component's PLAN_STATE_HEX value)", () => {
    expect(unify).toContain("color-mix(in srgb, var(--pa-state) 52%, transparent)");
    // P7 at-rest: the fill is 14% (fill envelope top-ward, still from --pa-state).
    expect(unify).toContain("color-mix(in srgb, var(--pa-state) 14%, transparent)");
  });

  it("Home plan-card treatments derive every state from its --orb-indicator token", () => {
    for (const s of STATES) {
      if (s === "past") continue; // past = the stone at rest: no indicator spent
      expect(unify).toContain(`var(--orb-indicator-${s})`);
    }
    expect(unify).toContain('.c2-plan-card[data-plan-state="past"]');
  });

  it("the unify sheet introduces NO raw canonical state hex (ambient = mixes of tokens only)", () => {
    for (const s of STATES) {
      expect(unify.toLowerCase()).not.toContain(PLAN_STATE_HEX[s].toLowerCase());
    }
  });

  it("unify sheet is imported in main.tsx after the Layout Contract", () => {
    expect(main.indexOf("unifyChats.css")).toBeGreaterThan(
      main.indexOf("layoutContract.css"),
    );
  });
});

describe("unify: retired loud treatments stay retired", () => {
  it("ChatsHome no longer paints a per-person borderColor from avatarTone", () => {
    expect(chatsHome).not.toContain("borderColor: r.avatarTone");
    expect(chatsHome).not.toContain("{ borderColor:");
  });

  it("call rows: per-name border rules are overridden and the missed edge is the action token", () => {
    expect(unify).toContain(".calls-continuity-row");
    expect(unify).toContain("var(--orb-indicator-action)");
    expect(unify).toContain("inset 3px 0 0");
  });

  it("ambient audit: the retired washes paint nothing (no wallpaper ambience)", () => {
    expect(unify).toContain(".chats-home .chats-ambient");
    expect(unify).toMatch(/\.chats-home \.chats-ambient \{\s*background: none;/);
    expect(unify).not.toContain("radial-gradient(ellipse 75% 52%");
    expect(unify).not.toContain("radial-gradient(ellipse 75% 40%");
  });

  it("legacy thread bubbles are borderless surface steps in the unify sheet", () => {
    expect(unify).toContain('.bubble-row.in .bubble.in');
    expect(unify).toContain('.bubble-row.out .bubble.out');
  });

  it("thread self label: the cyan ::before 'You' is quieted to ink", () => {
    expect(unify).toContain(".bubble-row.out .bubble-stack::before");
  });

  it("thread composer: the spectral gradient shell is overridden in-layer, scoped to the thread", () => {
    // The brand composer rule is !important inside @layer
    // brand-v4-components; the retirement must live in that layer
    // and target the real composer classes, scoped to the thread.
    expect(unify).toContain("@layer brand-v4-components");
    expect(unify).toContain(
      '[data-testid="member-conversation"] .composer-618.opal-composer-brand',
    );
    expect(unify).not.toContain("--opal-composer-gradient");
  });
});

describe("unify: dock halo break in both shells", () => {
  it("C2 dock: own border top is transparent; segments are drawn as ::before/::after", () => {
    expect(c2shell).toContain("border-top-color: transparent");
    expect(c2shell).toContain(".c2s-dock::before");
    expect(c2shell).toContain(".c2s-dock::after");
  });

  it("legacy dock: the ring is ring-metal ambient, segmented around the center device", () => {
    expect(unify).toContain(".tabbar-option-b .dock-bar::before");
    expect(unify).toContain(".tabbar-option-b .dock-bar::after");
    expect(unify).toContain("var(--orb-ring-metal) 42%");
    expect(unify).toContain("border-top-color: transparent");
    expect(unify.toLowerCase()).not.toContain("#00e5ff 0%");
  });
});

/**
 * R19 HALO GEOMETRY (founder, 2026-10-18 review of the R18 unify
 * pack): the R18 segments stopped too FAR from the center device -
 * "the lines are broken and away from the orb; we need to get very
 * close to it in order to ensure coherence." The R18 check above
 * proved only "not crossing". This block pins the actual
 * segment-to-device gap at the top border line, on BOTH pads, and
 * fails in BOTH directions: gap <= 0 (or < 2px) = crossing/merging;
 * gap > 4px = floating. One token (--dock-halo-gap, c2Tokens.css)
 * carries the gap for every pad, side, mode, and surface.
 *
 * Geometry, from the pads' own CSS (parsed below, never restated):
 *  - C2: disc 56px (r 28) with margin-top -18px inside the 64px dock.
 *    Flex margin-box centering puts the disc's border-box top at
 *    1 + (62 - (56 - 18)) / 2 - 18 = -5px (rendered probe, R18 unify
 *    pack: discZone top -5), so the disc center is 23px below the
 *    top line and the circle's half-chord AT THE LINE is
 *    sqrt(28^2 - 23^2) = 15.97px. Segment offset (the px terms of
 *    the width calc) minus the chord = the gap at the line.
 *    R18: 36 - 15.97 = 20.03px gap (the floating failure).
 *  - Legacy: the visible center device is the 46px center mark,
 *    centered in the bar; its half-width is 23px. (The R18 check
 *    measured to the transparent 86px hit zone - that zone is not
 *    the halo.) Segment offset minus 23px = the gap.
 *    R18: width 33% at the 370px reference bar = offset 62.9px,
 *    gap 39.9px (the floating failure).
 */
describe("r19: dock halo gap - close, tokenized, pinned both directions", () => {
  const GAP_MIN = 2;
  const GAP_MAX = 4;

  const gapToken = (() => {
    const m = c2Tokens.match(/--dock-halo-gap:\s*([\d.]+)px/);
    expect(m, "--dock-halo-gap defined in c2Tokens.css").not.toBeNull();
    return parseFloat(m![1]!);
  })();

  /** Every width calc of the form calc(50% - Npx - var(--dock-halo-gap)) in a sheet. */
  function segmentOffsetsPx(sheet: string): number[] {
    return [...sheet.matchAll(/calc\(50% - ([\d.]+)px - var\(--dock-halo-gap\)\)/g)].map(
      (m) => parseFloat(m[1]!),
    );
  }

  it("the gap token is a single small value, defined once", () => {
    expect(c2Tokens.match(/--dock-halo-gap:/g)).toHaveLength(1);
    expect(gapToken).toBeGreaterThanOrEqual(GAP_MIN);
    expect(gapToken).toBeLessThanOrEqual(GAP_MAX);
  });

  it("C2 dock: both segments terminate at chord edge + the gap token (never cross, never float)", () => {
    const offsets = segmentOffsetsPx(c2shell);
    // ::before and ::after - identical expression, left/right symmetric.
    expect(offsets).toHaveLength(2);
    expect(offsets[0]).toBe(offsets[1]);

    const dockH = parseFloat(c2Tokens.match(/--dock-h:\s*([\d.]+)px/)![1]!);
    const disc = c2shell.match(
      /\.c2s-dock-center-disc \{[^}]*width: ([\d.]+)px;[^}]*height: ([\d.]+)px;/,
    );
    expect(disc, "disc size in c2shell.css").not.toBeNull();
    const discD = parseFloat(disc![1]!);
    expect(parseFloat(disc![2]!)).toBe(discD);
    const marginTop = parseFloat(
      c2shell.match(/\.c2s-dock-center-disc \{[^}]*margin-top: (-?[\d.]+)px;/)![1]!,
    );
    const discTop = 1 + (dockH - 2 - (discD + marginTop)) / 2 + marginTop;
    const centerDepth = discTop + discD / 2; // disc center below the top line
    const chordHalf = Math.sqrt((discD / 2) ** 2 - centerDepth ** 2);

    const gap = offsets[0]! + gapToken - chordHalf;
    expect(gap, `C2 gap at the top line = ${gap.toFixed(2)}px`).toBeGreaterThanOrEqual(GAP_MIN);
    expect(gap, `C2 gap at the top line = ${gap.toFixed(2)}px`).toBeLessThanOrEqual(GAP_MAX);
    // The R18 floating offset must never return.
    expect(c2shell).not.toContain("calc(50% - 36px)");
  });

  it("legacy dock: both segments terminate at mark edge + the SAME gap token", () => {
    const offsets = segmentOffsetsPx(unify);
    expect(offsets).toHaveLength(2);
    expect(offsets[0]).toBe(offsets[1]);

    const markW = parseFloat(
      legacyStyles.match(/\.dock-opal-center-mark \{[^}]*width: ([\d.]+)px;/)![1]!,
    );
    const gap = offsets[0]! + gapToken - markW / 2;
    expect(gap, `legacy gap at the mark edge = ${gap.toFixed(2)}px`).toBeGreaterThanOrEqual(GAP_MIN);
    expect(gap, `legacy gap at the mark edge = ${gap.toFixed(2)}px`).toBeLessThanOrEqual(GAP_MAX);
    // The R18 floating width must never return.
    expect(unify).not.toContain("width: 33%");
  });

  it("both pads spend the same token - no per-surface override of the gap exists", () => {
    expect(c2shell.match(/var\(--dock-halo-gap\)/g)).toHaveLength(2);
    expect(unify.match(/var\(--dock-halo-gap\)/g)).toHaveLength(2);
    // The calc base terms differ (each pad's own device geometry);
    // the gap term is the shared token in all four segments.
    expect(segmentOffsetsPx(c2shell)).not.toEqual(segmentOffsetsPx(unify));
  });
});

/**
 * R19 CHROME GLASS (founder, 2026-10-18 23:50 PDT): the pad's
 * material is TRUE frosted glass - backdrop blur + tint from ONE
 * token family (--chrome-glass-blur / --chrome-glass-tint,
 * theme/c2Tokens.css), named for its consumers: the navigation pad
 * now; top-of-screen chrome and the conversation chrome (W14) take
 * the same tokens. The legibility law, encoded: nothing behind the
 * pad may read as legible text. Proxy (stated): a glyph dissolves
 * when the blur radius exceeds the glyph's own size - body type is
 * 15px (--type-body), so the blur token must be >= 16px; the tint
 * must be translucent glass (alpha < 1 - it is NOT a solid fill)
 * yet strong enough to hold the pad's field (alpha >= 0.55).
 * The rendered legibility proxy (screenshot high-frequency energy
 * behind the pad vs a live text region) lives in the rendered probe
 * (shots/regression/rendered/unify-capture.mjs, halo.glass).
 * Performance budget, encoded (W18-FIX, replacing the raw count):
 * glass is ONE material on chrome-class surfaces only, and EVERY
 * backdrop-blur site in EVERY sheet under src/ is enumerated in
 * the SANCTIONED GLASS REGISTRY below - selector, exact declaration,
 * and a one-line reason each. A backdrop-filter site that is not in
 * the registry fails BY NAME, in any sheet, including a brand-new
 * one; a registered site whose declaration drifts also fails. The
 * registry is therefore stronger than the count it replaces: the
 * count could not tell a sanctioned share card from a stray blur.
 */
describe("r19: chrome glass - one token family, frosted enough, chrome only", () => {
  const blur = parseFloat(c2Tokens.match(/--chrome-glass-blur:\s*([\d.]+)px/)![1]!);
  const bodyPx = parseFloat(c2Tokens.match(/--type-body:\s*\d+\s*([\d.]+)px/)![1]!);
  const tints = [...c2Tokens.matchAll(/--chrome-glass-tint:\s*rgba\(([^)]+)\)/g)].map(
    (m) => parseFloat(m[1]!.split(",").pop()!.trim()),
  );

  it("blur token exists and exceeds the body type size (glyphs dissolve)", () => {
    expect(blur).toBeGreaterThanOrEqual(16);
    expect(blur).toBeGreaterThan(bodyPx);
  });

  it("tint token is defined in BOTH modes, translucent glass - never a solid fill, never a whisper", () => {
    expect(tints).toHaveLength(2); // light + dark (c2Tokens.test pins the both-modes law)
    for (const a of tints) {
      expect(a).toBeGreaterThanOrEqual(0.55);
      expect(a).toBeLessThan(1);
    }
  });

  it("the C2 pad consumes the glass tokens (background tint + backdrop blur)", () => {
    const dock = c2shell.slice(c2shell.indexOf(".c2s-dock {"), c2shell.indexOf(".c2s-dock::before"));
    expect(dock).toContain("background: var(--chrome-glass-tint)");
    expect(dock).toContain("backdrop-filter: blur(var(--chrome-glass-blur))");
    expect(dock).not.toContain("background: var(--surface-1)");
  });

  it("the legacy pad consumes the same blur token at the unify layer", () => {
    expect(unify).toContain("backdrop-filter: blur(var(--chrome-glass-blur))");
  });

  it("the C2 share card consumes the one glass material - no literal blur", () => {
    expect(c2shell).toContain(
      ".r19-share-card { backdrop-filter: blur(var(--chrome-glass-blur)); -webkit-backdrop-filter: blur(var(--chrome-glass-blur)); }",
    );
    expect(c2shell).not.toContain("blur(14px)");
  });

  it("scrims consume the scrim material token (--scrim-blur, 8px, defined once)", () => {
    expect(c2Tokens.match(/--scrim-blur:/g)).toHaveLength(1);
    expect(c2Tokens).toContain("--scrim-blur: 8px");
    expect(c2shell).toContain("backdrop-filter: blur(var(--scrim-blur))");
    const c1 = readFileSync(resolve(__dirname, "../opalUi/c1/c1.css"), "utf8");
    expect(c1).toContain("backdrop-filter: blur(var(--scrim-blur))");
  });
});

/**
 * W18-FIX - THE SANCTIONED GLASS REGISTRY. Every backdrop-blur site
 * in every stylesheet under src/, with its reason. Materials:
 *  - CHROME GLASS: blur(var(--chrome-glass-blur)) - the one frosted
 *    material (18px + per-mode tint) for chrome-class surfaces;
 *    c1.css consumes it through its --opal-glass-blur alias.
 *  - SCRIM: blur(var(--scrim-blur)) - the dim-layer material (8px);
 *    a scrim's job (dim + depth behind a solid sheet) differs from
 *    chrome's (a readable frosted field), so the lighter blur is a
 *    reasoned divergence, tokenized - never a literal.
 *  - LEGACY LITERALS: styles.css is the pre-token legacy monolith;
 *    its sites are recorded here with their exact literal values so
 *    any drift fails, but the sheet is not rewritten in this wave -
 *    where a unify-layer rule supersedes a legacy site, the reason
 *    says so. (styles.css also carries ONE non-backdrop
 *    `filter: blur(8px)` - an element filter, not glass; out of
 *    this registry's scope by definition.)
 */
type GlassSite = {
  sheet: string;
  selector: string;
  /** Exact backdrop-filter declaration (each occurrence must equal it). */
  declaration: string;
  /** Number of backdrop-filter blur declarations in the rule. */
  declarations: number;
  reason: string;
};

const GLASS_REGISTRY: GlassSite[] = [
  // --- c2shell.css: the C2 shell ---
  {
    sheet: "src/c2/shell/c2shell.css",
    selector: ".c2s-dock",
    declaration: "blur(var(--chrome-glass-blur)) saturate(1.35)",
    declarations: 2,
    reason: "C2 navigation pad - the chrome-glass presentation of the dock.",
  },
  {
    sheet: "src/c2/shell/c2shell.css",
    selector: ".c2s-frost-strip",
    declaration: "blur(22px) saturate(1.3)",
    declarations: 2,
    reason: "R21 Orbit v4 full-width frost strip behind the navigation pad, extended in v4.2 (F-1) into ONE true backdrop sheet behind composer AND pad: a stronger local blur (22px, above the shared chrome token) so assets behind the sheet stay barely visible, its top dissolving via gradient + mask - no hard edge mid-screen.",
  },
  {
    sheet: "src/c2/shell/c2shell.css",
    selector: ".c2s-scrim",
    declaration: "blur(var(--scrim-blur))",
    declarations: 1,
    reason: "C2 sheet scrim - full-screen dim layer behind sheets (scrim material, not chrome).",
  },
  {
    sheet: "src/c2/shell/c2shell.css",
    selector: ".r19-share-card",
    declaration: "blur(var(--chrome-glass-blur))",
    declarations: 2,
    reason: "W13 share card - the object that leaves the app; founder rider: frosted glass over the state field, one material.",
  },
  // --- c1.css: conversation chrome + its sheet scrim ---
  {
    sheet: "src/opalUi/c1/c1.css",
    selector: '[data-design="r18"] .c1-glass',
    declaration: "blur(var(--opal-glass-blur)) saturate(1.35)",
    declarations: 2,
    reason: "C1 conversation chrome (overflow, navigator rail, nav buttons) via the --opal-glass-blur alias of the chrome token.",
  },
  {
    sheet: "src/opalUi/c1/c1.css",
    selector: '[data-design="r18"] .c1-sheet-scrim',
    declaration: "blur(var(--scrim-blur))",
    declarations: 1,
    reason: "C1 sheet scrim - same dim-layer job as .c2s-scrim, same scrim token.",
  },
  // --- unifyChats.css: the legacy pad at the unify layer ---
  {
    sheet: "src/theme/unifyChats.css",
    selector: ".tabbar-option-b .dock-bar, html.opal-native-host .tabbar-option-b .dock-bar",
    declaration: "blur(var(--chrome-glass-blur)) saturate(1.35)",
    declarations: 2,
    reason: "Legacy navigation pad at the unify layer - same chrome-glass token (tint stays the legacy dark field fill by design).",
  },
  // --- styles.css: the legacy monolith (literals recorded, sheet not rewritten) ---
  {
    sheet: "src/styles.css",
    selector: ".glass",
    declaration: "blur(18px) saturate(1.2)",
    declarations: 2,
    reason: "Legacy generic glass utility (pre-token); its 18px literal equals the chrome-glass blur value.",
  },
  {
    sheet: "src/styles.css",
    selector: ".opal-moment.journey",
    declaration: "blur(8px)",
    declarations: 1,
    reason: "Legacy journey banner over imagery.",
  },
  {
    sheet: "src/styles.css",
    selector: ".moment-people-sheet",
    declaration: "blur(8px)",
    declarations: 1,
    reason: "Legacy people-picker sheet - full-screen dim layer (scrim role).",
  },
  {
    sheet: "src/styles.css",
    selector: ".tabbar-option-b .dock-bar",
    declaration: "blur(9px)",
    declarations: 2,
    reason: "Legacy dock base rule - superseded by the unify-layer token rule above (later sheet wins).",
  },
  {
    sheet: "src/styles.css",
    selector: ".comm-mode-btn",
    declaration: "blur(9px)",
    declarations: 2,
    reason: "Legacy communications mode chips.",
  },
  {
    sheet: "src/styles.css",
    selector: ".calls-filter-btn",
    declaration: "blur(9px)",
    declarations: 2,
    reason: "Legacy calls filter chips.",
  },
  {
    sheet: "src/styles.css",
    selector: ".graphs-lens-chip",
    declaration: "blur(9px)",
    declarations: 2,
    reason: "Legacy graphs lens chips.",
  },
  {
    sheet: "src/styles.css",
    selector: "html.opal-native-host .tabbar-option-b .dock-bar",
    declaration: "blur(9px)",
    declarations: 2,
    reason: "Legacy native-host dock variant - superseded by the same unify-layer token rule.",
  },
  {
    sheet: "src/styles.css",
    selector: "html.opal-native-host .comm-sticky-chrome, html.opal-native-host .graphs-sticky-chrome",
    declaration: "blur(9px)",
    declarations: 2,
    reason: "Legacy native-host sticky chrome bars (communications + graphs).",
  },
  {
    sheet: "src/styles.css",
    selector: "html.opal-native-host .gsh-header-hit",
    declaration: "blur(8px)",
    declarations: 2,
    reason: "Legacy native-host home header hit layer.",
  },
  {
    sheet: "src/styles.css",
    selector: "html.opal-native-host .gsh-stories",
    declaration: "blur(8px)",
    declarations: 2,
    reason: "Legacy native-host stories rail chrome.",
  },
  {
    sheet: "src/styles.css",
    selector: "html.opal-native-host .gsh-chrome-plane",
    declaration: "blur(10px)",
    declarations: 2,
    reason: "Legacy native-host home chrome plane.",
  },
  {
    sheet: "src/styles.css",
    selector: "html.opal-native-host .search-chrome-plane",
    declaration: "blur(8px)",
    declarations: 2,
    reason: "Legacy native-host search chrome plane.",
  },
  {
    sheet: "src/styles.css",
    selector: "html.opal-native-host .ogsn-graph-detail-head",
    declaration: "blur(8px)",
    declarations: 2,
    reason: "Legacy native-host graph detail header.",
  },
  {
    sheet: "src/styles.css",
    selector: ".live-call-assist",
    declaration: "blur(14px)",
    declarations: 2,
    reason: "Legacy in-call assist pane - frosted pane over the call field (the sheet's own comment states the glass intent).",
  },
  {
    sheet: "src/styles.css",
    selector: ".contact-profile-backdrop",
    declaration: "blur(10px)",
    declarations: 2,
    reason: "Legacy contact-profile overlay backdrop (dim layer).",
  },
];

type FoundGlassSite = { sheet: string; selector: string; values: string[] };

/** Every backdrop-blur site in every .css under src/, parsed by leaf rule. */
function scanGlassSites(): FoundGlassSite[] {
  const webRoot = resolve(__dirname, "../..");
  const srcRoot = resolve(webRoot, "src");
  const files = readdirSync(srcRoot, { recursive: true })
    .map((f) => String(f))
    .filter((f) => f.endsWith(".css"));
  const found: FoundGlassSite[] = [];
  for (const rel of files) {
    const sheet = relative(webRoot, resolve(srcRoot, rel)).split("\\").join("/");
    const css = readFileSync(resolve(srcRoot, rel), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = m[1]!.split(/\s+/).filter(Boolean).join(" ");
      const values = [...m[2]!.matchAll(/(?:-webkit-)?backdrop-filter\s*:\s*([^;]+);/g)]
        .map((d) => d[1]!.trim())
        .filter((v) => v.includes("blur"));
      if (values.length > 0) found.push({ sheet, selector, values });
    }
  }
  return found;
}

describe("r19/w18-fix: sanctioned glass registry - every backdrop blur is listed, with a reason", () => {
  const found = scanGlassSites();
  const key = (s: { sheet: string; selector: string }) => `${s.sheet} :: ${s.selector}`;

  it("the registry itself is complete-shaped: every entry carries a one-line reason", () => {
    for (const site of GLASS_REGISTRY) {
      expect(site.reason.length, key(site)).toBeGreaterThan(10);
      expect(site.declarations, key(site)).toBeGreaterThan(0);
    }
    expect(new Set(GLASS_REGISTRY.map(key)).size).toBe(GLASS_REGISTRY.length);
  });

  it("no unlisted glass site exists anywhere under src (a new site fails by name)", () => {
    const registered = new Set(GLASS_REGISTRY.map(key));
    const unlisted = found.filter((f) => !registered.has(key(f)));
    expect(unlisted.map(key), "unlisted backdrop-blur sites").toEqual([]);
  });

  it("every registered site exists with its exact declaration and count (no drift, no silent removal)", () => {
    for (const site of GLASS_REGISTRY) {
      const hit = found.find((f) => key(f) === key(site));
      expect(hit, `registered glass site missing: ${key(site)} (${site.reason})`).toBeDefined();
      expect(hit!.values, key(site)).toHaveLength(site.declarations);
      for (const v of hit!.values) expect(v, key(site)).toBe(site.declaration);
    }
    expect(found).toHaveLength(GLASS_REGISTRY.length);
  });

  it("the C2 sheet's glass is exactly its four sanctioned sites", () => {
    const inSheet = found.filter((f) => f.sheet === "src/c2/shell/c2shell.css");
    expect(inSheet.map((f) => f.selector).sort()).toEqual([".c2s-dock", ".c2s-frost-strip", ".c2s-scrim", ".r19-share-card"]);
  });
});
