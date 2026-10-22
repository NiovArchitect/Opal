# Repair #22 - Cluster R22-G (WS-8 + WS-11) - Verification Report

Branch: muse/r22-dock
Build commit verified: 5dc3ae49 ("R22-G WS-8 + WS-11: pad dot dies (lighting alone carries selection); Opal chat composer docked (was scrolling)")
Base: fd1d34d3
Finisher role: verify + records only. No code gap was found, so this report is the only finisher commit. No merge, no production, muse/repair-17 untouched.

## Files changed by the build commit (5dc3ae49)

- apps/opal_web/src/c2/shell/c2shell.css - all three active-dot rules removed (slot 4px base, slot 6px W-10 override, center orb 6px).
- apps/opal_web/src/opalUi/c1/C1Surfaces.tsx - CenterChat wraps its message flow in .c1-scroll; the composer bar is a sibling after the scroller.
- apps/opal_web/src/c2/shell/r22DockContract.test.tsx - new, 9 pins (WS-8 dot death + lighting completeness; WS-11 dock structure per surface).

## WS-8 - Dependency audit result: PASS, no gap

- CSS: no ::after marker remains for .c2s-dock-slot[data-active="1"] or .c2s-dock-center[data-active="1"] anywhere in the web source (grep-verified by the finisher, not only by the contract test). The pad's own .c2s-dock::before/::after top-border halo segments are a different construction and stay; the contract test carries an over-deletion guard for them and unifyDrift pins them.
- Rendered DOM: the contract test asserts a slot's children are exactly glyph + label (+ an unread badge when one exists) and the center orb's only child is the disc. No React node paints a dot.
- Selection legibility by lighting alone: glyph accent + scale(1.12), label accent + weight 700, center disc accent ring + glow. Glass measurements (measurements.json, all 10 pad states): slotAfter "none" and centerAfter "none" in every state; active glyph/label read rgb(93, 57, 138) light / rgb(125, 77, 206) dark at weight 700; pad box identical in all states (x12 y772 w366 h64) - the dot was absolutely positioned, so removal changed no geometry. The pad-center states report slotAfter "missing" because the center button is not a slot element; its centerAfter reads "none".
- Accessibility: aria-current="page" remains on the active item in every measured state (activeAriaCurrent "page", 10/10). The selection state never depended on the dot.
- Tests/components depending on the dot: none found. A full-source grep for dock-dot references returns only the new contract pins and unrelated orb-geometry prose. Every suite that renders the shell or the C1 surfaces passes (see Tests).
- Mobile: the commit touches zero mobile files. The native shell does not share the C2 pad component; its tab bar (apps/opal_mobile/src/shell/AppShell.tsx) selects by tabSelected / tabLabelSelected styles only and carries no dot element. Nothing to remove there.
- Legacy web tabbar (audited because it is a second navigation bar): the live legacy dock (tabbar-option-b, .dock-tab) selects by color alone (unifyChats.css .dock-tab.is-active) and carries no dot. One nuance, recorded not fixed: technicolorProduction.css carries an 18x3 cyan bar rule for .tab.active::after in a non-option-b tabbar - its only matching component, V2Dock in v2Primitives.tsx, is exported but never rendered anywhere in src, and the rule is a bar, not the pad dot. Out of WS-8 scope (the pad is one component, C2Shell's dock); no test pins that rule.

## WS-11 - Per-surface verdicts

Pin test for all three surfaces: apps/opal_web/src/c2/shell/r22DockContract.test.tsx (9/9 green in the finisher run).

- Thread (ThreadShell): ALREADY DOCKED before this cluster. Flow sits in .c1-scroll; the composer bar (data-testid thread-composer-bar) is a direct child of the surface after the scroller. Glass: scroller scrollHeight 2050 vs clientHeight 612; composer bar y704 h58 and pad y772 h64 identical before/after scrolling to top.
- Orbit (CenterChat embedded in OrbitScreen): ALREADY DOCKED before this cluster. OrbitScreen.css bounds the embedded surface (height 100%, overflow hidden), the bar is flex: none. Glass (finisher top-up, staged scoped session, 9 sends, 18 bubbles): the effective scroller is .c1-flow inside the new .c1-scroll wrapper (scrollHeight 1896 vs clientHeight 402); the wrapper itself does not overflow, so there is exactly one scroller, no double scroll. Bar y712 h58, pad y772 h64, identical before/after.
- Opal chat, plain landing (CenterChat): WAS SCROLLING - FIXED by 5dc3ae49. Before: the flow rendered bare, the host surface was the scroller, and the composer rode at the content end (margin-top: auto only made short rooms look docked). After: the flow is wrapped in .c1-scroll (the thread construction) and the bar is a sibling after the scroller in both the plain and the orbit-embedded landings. Glass (finisher top-up, staged plain session, 9 sends, 18 bubbles): the scroller is the fix's own .c1-scroll box, scrollHeight 1844 vs clientHeight 442, while the composer bar stays at y640 h122 above the pad at y772 - content extends to y1933 behind it. The build worker had declared this frame (plain chat did not open in its runs); the finisher captured it - see Frames. Nuance: the plain landing restored the viewer's latest Opal conversation (the scoped Maya session staged minutes earlier), so the opalchat frames show that conversation's title and context chip on the plain, non-embedded CenterChat surface. The surface, scroller class, and dock measured are the plain landing's.

## Tests (finisher runs, on 5dc3ae49)

- Dock contract: r22DockContract.test.tsx 9/9 passed.
- Affected suites, all passed: 16 files, 263 tests, 0 failures - c2ShellSurfaces, c1ShellWiring, r20ComposerFurniture, harmony2, deckfix, dropItWiring, unifyDrift, OpalCenterChat, OpalCenterChat.planSurface, opalChatDoorway, r20aGlass, f6OrbitPrivacy, r21Openings, r20Orbit (60), orbitVerifyContract, plus the contract file itself.
- Typecheck (apps/opal_web, tsc --noEmit): exactly 9 errors, line-for-line identical to the baseline log (OpalApp.tsx x3, productClient.ts x5, YouSettingsDestination.tsx x1). Zero new.
- Full web suite: not re-run by the finisher (the build worker's full run on this commit took about 89 minutes: 26 failed / 2144 passed / 19 files). Delta analysis against the stated baseline (24 failed / 17 files) and the worker's own compiled baseline list (r22dock-scratch/base-failures.txt, 26 names): the two lists differ by a swapped pair. The full run failed dir4Reveal and planEditControls; the baseline list failed AT-08 and FA-02 instead. The finisher re-ran all four in isolation on 5dc3ae49: dir4Reveal 17/17, planEditControls 4/4, FA-02 1/1, AT-08 files 18/18 - all pass. No test fails both in the full run and in isolation, and none of the four touches the pad dot or the CenterChat scroll wrapper. Verdict: run-to-run flake under full-suite load, no new failure attributable to this commit.
- Mobile suite: not run in this worktree (apps/opal_mobile has no node_modules here) and not required - the commit touches no mobile file (see WS-8 mobile audit). Declared, not silently skipped.

## Frames (shots/repair22/dock/, phone 390x844, signature-gated)

Every frame's badge reads "seed - 5dc3ae4", the branch code tip's short SHA (verified visually by the finisher on pad-flows-light, pad-flows-dark, pad-center-light, pad-you-dark, thread-scrolled-light, orbit-scrolled-light, opalchat-scrolled-light, opalchat-scrolled-dark; the capture runs logged gitHead 5dc3ae4 for the rest).

Pad, 5 active states x 2 modes (10):
- pad-flows-light (captured by the finisher - it was the one missing frame; signature gate passed on retry against the dock stack, API :4001 / preview :5174)
- pad-flows-dark, pad-chats-light, pad-chats-dark, pad-center-light, pad-center-dark, pad-graphs-light, pad-graphs-dark, pad-you-light, pad-you-dark

Scrolled-content dock proof (6):
- thread-scrolled-light, thread-scrolled-dark (build worker)
- orbit-scrolled-light, orbit-scrolled-dark (re-shot by the finisher with a staged scoped session - the worker's originals showed an empty room with 0 messages; the re-shots carry 18 bubbles and a measured .c1-flow scroller)
- opalchat-scrolled-light, opalchat-scrolled-dark (captured by the finisher - declared missing by the build worker; plain CenterChat, .c1-scroll scroller measured)

Measurements on disk: measurements.json, measurements-topup.json (build worker), measurements-topup3.json (finisher: orbit + opalchat dock boxes and scroller probes).

## Declarations

- No code gap found in 5dc3ae49; no follow-up code commit was needed. The only finisher commit is this report.
- The worker's three outstanding declarations are all closed by the finisher: pad-flows-light captured, orbit scrolled proof re-shot with real content, opalchat scrolled proof captured in both modes.
- One capture was discarded by the finisher before filing: a first pad-flows-light attempt ran against the wrong cluster's web server (the capture lib defaults to :5173, the stream cluster) and its badge read 738298b. The file was deleted and re-shot against the dock stack; the filed frame's badge reads 5dc3ae4.
- Mobile jest suite not run (no node_modules in this worktree; zero mobile files touched).
- Full web suite not re-run end to end by the finisher; the delta was closed by isolating every differing name (see Tests).
- V2Dock / technicolor .tab.active::after nuance recorded under WS-8: dead rule, unrendered component, not the pad, not fixed.
