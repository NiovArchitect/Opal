/**
 * Opal Graph brand — S0 foundation.
 *
 * PUBLIC PRODUCT IDENTITY: Opal Graph
 * TAGLINE (entry only): PEOPLE. EXPERIENCES. CONNECTED.
 *
 * FINAL FIGMA AUTHORITY:
 * - Visual: 201:2
 * - Brand lock: 159:2
 * - Transparent symbol master: Figma 160:2 / source 168:2 (repo: public/brand/opal-graph/)
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
  markName: "Opal Graph symbol · founder-approved transparent master",
  feel: "Deep void · steel structure · restrained cyan · gender neutral · premium",
  rationale: [
    "Public identity: Opal Graph. Tagline only on splash and marketing entry.",
    "Symbol: transparent PNG from Figma brand lock (not reconstructed SVG approximation).",
    "Wordmark: typographic Opal Graph for product chrome (raster wordmark optional later).",
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
  ],
  assets: {
    /** FINAL product symbol (S0) */
    graphSymbol: "/brand/opal-graph/symbol-transparent.png",
    graphSymbolMaster: "/brand/opal-graph/symbol-master.png",
    graphAppIcon180: "/brand/opal-graph/app-icon-180.png",
    graphAppIcon512: "/brand/opal-graph/app-icon-512.png",
    graphFavicon: "/favicon-opal-graph.png",
    /**
     * CORE MARK presentation for product chrome: Opal Graph symbol.
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
    vectorMaster: "FIGMA_TRANSPARENT_PNG",
    workingRaster: "OPAL_GRAPH_SYMBOL_S0",
    createDock: "DEFERRED_UNTIL_GRAPH_CREATE_S5",
  },
  figma: {
    fileKey: "fy69K8cCug9prf5GLwQ7Hy",
    brandLock: "159:2",
    brandLockName: "FOUNDER LOCK — V2.3.1 BRAND — OPAL GRAPH",
    symbolTransparent: "160:2",
    symbolSourcePng: "168:2",
    visualConvergence: "201:2",
    firstRun: "217:2",
    routing: "155:2",
    /** Historical Pass 8 pointers (superseded for public identity) */
    brandPage: "77:2",
    brandAuthority: "93:2",
    markNode: "93:5",
    markNodeStatus: "HISTORICAL_ORBITAL — product chrome uses Opal Graph symbol S0",
    wordmarkNode: "93:7",
    wordmarkNodeStatus: "HISTORICAL OPAL lettering — product uses typographic Opal Graph",
    fullLockupNode: "93:9",
    fullLockupNodeStatus: "HISTORICAL — entry uses symbol + typographic lockup",
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
