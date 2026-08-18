/**
 * Opal Graph brand — S0 foundation.
 *
 * PUBLIC PRODUCT IDENTITY: Opal Graph
 * TAGLINE (entry only): PEOPLE. EXPERIENCES. CONNECTED.
 *
 * FINAL FIGMA AUTHORITY:
 * - Visual: 201:2
 * - Brand lock: 159:2
 * - Exact approved transparent PNG: 168:2 (runtime master)
 * - Editable vector master: 160:2 (not silent runtime substitute)
 * - Type lockups: 161:2 (type+tagline), 161:3 (wordmark only)
 * - First run (S1): 217:2
 *
 * Domain/module names remain OpalCore / opal_web — not mass-renamed.
 * Historical assets under public/brand/opal-* remain for evidence and fallback.
 */
export const BRAND = {
  /** Public product name (customer-facing) */
  name: "Opal Graph",
  shortName: "Opal",
  tagline: "PEOPLE. EXPERIENCES. CONNECTED.",
  markName: "Opal Graph symbol · exact PNG 168:2",
  feel: "Deep void · steel structure · restrained cyan · gender neutral · premium",
  rationale: [
    "Public identity: Opal Graph. Tagline only on splash and marketing entry.",
    "Symbol runtime master: exact transparent PNG from Figma 168:2 only.",
    "Vector master 160:2 remains editable Figma authority, not a silent redraw path.",
    "Wordmark: typographic Opal Graph for product chrome; type structure from 161:3.",
    "Domain modules keep Opal naming. Brand presentation is separate from architecture.",
    "No neon border soup. No candy gradients. No permanent logo halo.",
  ],
  reject: [
    "Opal G truncated wordmark",
    "Speech-bubble phone icons",
    "Neon cyberpunk overload",
    "WhatsApp green palette",
    "Calendar grid identity",
    "Mass rename of Elixir modules for brand",
    "Tagline on every member tab",
    "Dead create control in dock",
    "Historical opposing arcs as current mark",
    "Silent replace of 168:2 exact PNG with 160:2 vector export",
    "AI-generated or reconstructed logo substitute",
  ],
  assets: {
    /**
     * RUNTIME symbol master = exact Figma 168:2 PNG bytes.
     * Derived icons are pure resizes of this file only.
     */
    graphSymbol: "/brand/opal-graph/symbol-transparent.png",
    graphSymbolMaster: "/brand/opal-graph/symbol-master.png",
    graphSymbolExact168: "/brand/opal-graph/symbol-source-168-2.png",
    graphSymbolVectorExport160: "/brand/opal-graph/symbol-vector-master-160-2-export.png",
    /** Figma 161:2 — Opal Graph + tagline transparent type lockup */
    graphTypeTagline161: "/brand/opal-graph/lockup-161-2-type-tagline.png",
    /** Figma 161:3 — Opal Graph wordmark-only transparent lockup */
    graphWordmark161: "/brand/opal-graph/wordmark-161-3.png",
    graphAppIcon180: "/brand/opal-graph/app-icon-180.png",
    graphAppIcon512: "/brand/opal-graph/app-icon-512.png",
    graphFavicon: "/favicon-opal-graph.png",
    /**
     * CORE MARK presentation for product chrome: Opal Graph exact PNG.
     * Historical orbital remains available for evidence paths only.
     */
    markCurrent: "/brand/opal-graph/symbol-transparent.png",
    markWorkingRef: "/brand/opal-mark-current.png",
    markMasterOpaque: "/brand/opal-mark-current.png",
    mark: "/brand/opal-graph/symbol-transparent.png",
    /** Historical WORDMARK raster (OPAL lettering) — prefer typographic Graph wordmark */
    wordmarkCurrent: "/brand/opal-wordmark-current.png",
    wordmark: "/brand/opal-wordmark-current.png",
    lockupCurrent: "/brand/opal-lockup-current.png",
    lockup: "/brand/opal-lockup-current.png",
    sourceLockup: "/brand/_source/a_clean_minimal_futuristic_brand_logo_layout_on.png",
    appIcon180: "/brand/opal-graph/app-icon-180.png",
    appIcon512: "/brand/opal-graph/app-icon-512.png",
    favicon: "/favicon-opal-graph.png",
    markHistorical63_7: "/brand/opal-mark-63-7-opposing-arcs-historical.png",
    markRejectedArcsSpike:
      "/brand/_quarantine/REJECTED-arcs-spike-opal-current-mark.png",
    markMono: "/brand/opal-mark-mono.svg",
    markLight: "/brand/opal-mark-light.svg",
  },
  status: {
    productBrandSource: "VALID",
    figmaBrandSource: "VALID",
    publicName: "Opal Graph",
    exactPngSource: "168:2",
    vectorMaster: "160:2",
    typeLockup: "161:2",
    wordmarkOnly: "161:3",
    workingRaster: "OPAL_GRAPH_SYMBOL_168_2_EXACT",
    createDock: "DEFERRED_UNTIL_GRAPH_CREATE_S5",
  },
  figma: {
    fileKey: "fy69K8cCug9prf5GLwQ7Hy",
    brandLock: "159:2",
    brandLockName: "FOUNDER LOCK — V2.3.1 BRAND — OPAL GRAPH",
    /** Editable/vector master — not silent runtime substitute */
    symbolVectorMaster: "160:2",
    /** Exact approved transparent PNG — runtime master authority */
    symbolExactPng: "168:2",
    typePlusTagline: "161:2",
    wordmarkOnly: "161:3",
    /** obsolete pointer — do not use */
    obsoleteSymbolPointer: "162:2",
    visualConvergence: "201:2",
    /** Final authenticated Home after FR09 — mandatory destination */
    memberHome: "201:5",
    memberWho: "201:6",
    memberPeople: "201:7",
    memberLive: "201:8",
    memberJourney: "201:9",
    memberProfile: "201:10",
    firstRun: "217:2",
    firstRunRouteLock: "217:393",
    routing: "155:2",
    homeEndlessScroll: "145:46",
    /** Historical Pass 8 pointers (superseded for public identity) */
    brandPage: "77:2",
    brandAuthority: "93:2",
    markNode: "93:5",
    markNodeStatus: "HISTORICAL_ORBITAL — product chrome uses exact PNG 168:2",
    wordmarkNode: "93:7",
    wordmarkNodeStatus: "HISTORICAL OPAL lettering — product uses typographic Opal Graph (161:3 structure)",
    fullLockupNode: "93:9",
    fullLockupNodeStatus: "HISTORICAL — entry uses 168:2 symbol + typographic lockup",
    supersededMarkNode: "77:8",
    supersededMarkStatus: "DO NOT USE",
    brandBoardRoot: "77:3",
    finalMaster: true,
    implementFromFigma: true,
    implementFromRepoAssets: true,
  },
} as const;

export const BRAND_ASSETS = BRAND.assets;

/** Customer-facing product title (nav aria, document title). */
export const PRODUCT_PUBLIC_NAME = BRAND.name;

export const PRODUCT_TAGLINE = BRAND.tagline;

export const FIRST_RUN_STORAGE_KEY = "opal.firstRun.v14.completed";

/**
 * S0 create dock policy: reserved architecture, not a customer control until Graph create (S5).
 * Prefer non-exposure over a visible dead button.
 */
export const CREATE_DOCK_EXPOSED = false;
