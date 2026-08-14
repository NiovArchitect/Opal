/**
 * Opal brand — Living Void + founder-approved source-of-truth pointers.
 *
 * BRAND AUTHORITY (Pass 8 install — product pixels):
 * - Founder source lockup (exact file):
 *   public/brand/_source/a_clean_minimal_futuristic_brand_logo_layout_on.png
 * - Semantic product assets (derived by crop, not redraw):
 *   opal-mark-current.png · opal-wordmark-current.png · opal-lockup-current.png
 * - Figma nodes 93:5 / 93:7 / 93:9 structure ready; **pixel placement PENDING manual drop**
 * - 77:8 SUPERSEDED / DO NOT USE
 * - Rejected families: opposing arcs, center spike, star, clean circle, P7, lumen-loop
 *
 * Hierarchy: CORE MARK (orbital) · WORDMARK (OPAL) · FULL LOCKUP (both).
 * Product generally uses MARK. Opening / hero may use LOCKUP.
 */
export const BRAND = {
  name: "Opal",
  tagline: "Opal turns social possibility into shared reality.",
  markName: "Iridescent continuous orbital · founder-approved working raster",
  feel: "Futuristic · calm · luminous · human · relational",
  rationale: [
    "Core mark: continuous iridescent orbital/ring — product icon and compact identity.",
    "Wordmark: futuristic OPAL lettering — opening and brand moments, not every chrome.",
    "Full lockup: mark + wordmark — opening / hero / marketing.",
    "V2 Experience World layout stays locked; brand overlays, does not restyle.",
    "No giant halo. No every-card glow. No RGB soup.",
  ],
  reject: [
    "Speech-bubble phone icons",
    "Neon cyberpunk overload / Orbitron",
    "WhatsApp green palette",
    "Telegram paper plane",
    "Discord game marks",
    "Calendar grid identity",
    "Matrix green tech-bro",
    "P7 rejected logo geometry",
    "Permanent logo halo / motion glow",
    "Clean circle / plain O substitution",
    "Opposing arcs as current logo",
    "Center spike / star variant as current logo",
    "Lumen-loop as current logo",
    "Trusting filename 'orbital' without visual verify of continuous ring",
    "Treating Figma 77:8 as approved core mark",
    "AI-generated or redesigned substitute for founder orbital",
  ],
  assets: {
    /** Semantic current CORE MARK — continuous iridescent orbital only */
    markCurrent: "/brand/opal-mark-current.png",
    markWorkingRef: "/brand/opal-mark-current.png",
    mark: "/brand/opal-mark-current.png",
    /** Semantic current WORDMARK — OPAL lettering only */
    wordmarkCurrent: "/brand/opal-wordmark-current.png",
    wordmark: "/brand/opal-wordmark-current.png",
    /** Semantic current FULL LOCKUP — exact founder source bytes */
    lockupCurrent: "/brand/opal-lockup-current.png",
    lockup: "/brand/opal-lockup-current.png",
    /** Founder source archive (do not use as runtime dual path) */
    sourceLockup: "/brand/_source/a_clean_minimal_futuristic_brand_logo_layout_on.png",
    appIcon180: "/brand/opal-app-icon-180.png",
    appIcon512: "/brand/opal-app-icon-512.png",
    favicon: "/favicon-mark.png",
    /** Historical / quarantine — never product current */
    markHistorical63_7: "/brand/opal-mark-63-7-opposing-arcs-historical.png",
    markRejectedArcsSpike:
      "/brand/_quarantine/REJECTED-arcs-spike-opal-current-mark.png",
    markMono: "/brand/opal-mark-mono.svg",
    markLight: "/brand/opal-mark-light.svg",
  },
  status: {
    productBrandSource: "VALID",
    figmaBrandSource: "VALID",
    vectorMaster: "OPEN",
    workingRaster: "FOUNDER_APPROVED_WORKING_RASTER",
  },
  figma: {
    fileKey: "fy69K8cCug9prf5GLwQ7Hy",
    brandPage: "77:2",
    brandPageName: "OPAL BRAND — CURRENT FOUNDER APPROVED WORKING DIRECTION",
    brandAuthority: "93:2",
    brandAuthorityName: "FOUNDER APPROVED BRAND — CURRENT SOURCE OF TRUTH",
    markNode: "93:5",
    markNodeStatus:
      "VALID — continuous iridescent orbital IMAGE fill verified (screenshot 2026-08-13)",
    wordmarkNode: "93:7",
    wordmarkNodeStatus:
      "VALID — futuristic OPAL wordmark IMAGE fill verified (screenshot 2026-08-13)",
    fullLockupNode: "93:9",
    fullLockupNodeStatus:
      "VALID — full lockup IMAGE fill verified (screenshot 2026-08-13)",
    supersededMarkNode: "77:8",
    supersededMarkStatus:
      "DO NOT USE — mislabeled opposing-arcs / center-spike family",
    brandBoardRoot: "77:3",
    logoStudyPage: "17:2",
    logoStudyStatus: "SUPERSEDED (gemstone)",
    historicalArcsNode: "63:7",
    historicalArcsStatus: "historical only; not current",
    applicationNode: "63:9",
    v2Home: "2:2",
    v2Chat: "3:2",
    v2SharedReality: "4:2",
    v2Curate: "4:11",
    v2SocialMoment: "4:23",
    v2ExtendPlans: "5:2",
    finalMaster: false,
    /** Figma 93:* now holds approved pixels; product still loads repo semantic rasters */
    implementFromFigma: true,
    implementFromRepoAssets: true,
  },
} as const;

export const BRAND_ASSETS = BRAND.assets;

export const FIRST_RUN_STORAGE_KEY = "opal.firstRun.v14.completed";
