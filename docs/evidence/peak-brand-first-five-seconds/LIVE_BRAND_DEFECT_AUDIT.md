# Live brand defect audit

**Date:** 2026-08-05  
**Live URL:** https://opal.niovlabs.com  
**Asset:** `index-B7t1GepJ.js` / `index-Ge6F7LOo.css` (Technicolor production)  
**Method:** Source inspection + prior live Brave walkthrough knowledge + local reproduction  

## Defects

| ID | Observation | Severity |
|----|-------------|----------|
| D1 | OPAL wordmark does not command first walkthrough screen; content title leads | P0 brand |
| D2 | Hero mark uses large soft glow/orbit that reads as generic AI orb | P0 brand |
| D3 | Top-left `OpalMark sm` repeats on every walkthrough screen while center also uses mark | P1 hierarchy |
| D4 | First seconds explain product before establishing brand name authority | P0 first-five |
| D5 | Join CTA underpowered vs Full Technicolor scene energy | P0 conversion |
| D6 | Walkthrough “Becoming a plan” chip not category-defining spectral moment | P1 moments |
| D7 | Plan scene: “I’ll book Harbor Table” + “Thursday · 7:00 PM” confuses actor and state | P0 copy |
| D8 | Technicolor Full mesh live on walkthrough; semantic moment richness stronger in product CSS than in walkthrough demo chips | P1 coverage |
| D9 | Inconsistent mark sizes (sm/md/lg/hero) without wordmark system | P2 system |

## What is already good

- Full / Controlled Technicolor **boundary** is correct and live.
- Screen 5 copy no longer uses “your people.”
- Pre-member isolation and Join/Skip product rules intact.
- Controlled product Opal moments have spectral edge foundation.

## Honest logo findings

| Question | Finding |
|----------|---------|
| Distinctive? | Partially — lens/core works at medium size |
| Generic AI orb? | Yes, when hero glow dominates |
| Works without animation? | Core yes; glow-dependent presence weakens |
| Monochrome? | Needs dedicated mono stress (open) |
| Same brand walkthrough → app icon? | Incomplete wordmark system |

## Orb recommendation

**Remove** giant decorative orb for brand arrival.  
Optional **reduce** soft atmospheric mesh under Full walkthrough only.  
Do not use orb merely to float a logo.

## Top-left logo

**Remove** after brand-arrival screen establishes identity. Screens 2–final: content only + Skip/Continue chrome without brand lockup.

## Captures

Local prototype: `/experiments/peak-brand-review.html`  
Live SPA captures: `docs/evidence/peak-brand-first-five-seconds/screens/` (when generated)
