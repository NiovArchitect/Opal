# GROK FIX PACKET — Walk-Fail UI/UX report

**Branch:** `build/v2-coded-experience-closure`  
**Date:** 2026-10-04  
**A8 three-pass:** remains GREEN (coherence failures, not architecture)

## WALK-FAIL-01 — Chat entry flash

**Root cause (one line):** `openChat` called `setActiveChatId` before hydrate and painted `setThreads` twice (raw messages, then filaments), so the thread mounted empty then flickered.

**Fix:** Cache-aware open — hydrate + single `setThreads` (interleaved) before first mount when uncached.

**Verify:** 10 consecutive opens · `flash_fail_count = 0` (`WALK_FAIL_VERIFY.json`).

## WALK-FAIL-02 — Elements float / off viewport

**Audit:** Conversation structured layout left dock mid-screen with ~80px dead band (shell `padding-bottom` + in-grid dock). Chats sticky chrome ±4px stage overflow. You hub last rows under dock.

**Fix:** Zero `padding-bottom` on structured conversation; sticky chrome margin `-16px` to match pad; You hub scroll trail pad.

**Verify:** `dockBottom=844`, `deadBand=0`, `dockNearBottom=true`. Screenshots under `shots/`.

## WALK-FAIL-03 — Dock Opal glyph

**Root cause:** Center dock used `BRAND_ASSETS.opalCenterOpalRest645` 512×512 `<img>`; other tabs use SVG mask glyphs.

**Fix:** `/figma-v2/dock/icon-opal.svg` + `<span class="dock-opal-mark">` mask (both dock instances). Kept `data-testid="member-tab-opal"` + `aria-label="Talk to Opal"`.

**Verify:** `tag=SPAN`, `isImg=false`, mask includes `icon-opal`, 40×40.

## WALK-FAIL-04 — Telephone button

**Before:** `callVideoCapable={false}` but `onCall` still ran `createConversationCall` → “Calling…” / surface / errors (Track B RED).

**After:** Tap → `data-mode=dependency` → gate note **“Calling isn't available on this build yet.”** · no call surface · Calls-home quick row gated the same way.

## WALK-FAIL-05 — Home social gap

See `WALK_FAIL_05_HOME_GAP.md`. Shipped = stories + intentional SOCIAL feed. Docs following/creators **not** built. Fixture reset: feed_b=16/16.

## Cross-cutting timing (list only)

- Attention “You're all caught up.” after resolve — correct calm
- Inbox notice chip can linger until tapped
- Material moment chip dismiss-only
- Call gate note persists until navigation clears
- Find-time hint localStorage once-per-conversation
- Alignment Accept/Keep cards when proposal pending
- (No redesign in this packet)

## Acceptance SHAs

**FE/BE/HEAD:** `63e4805` (`63e48051c6c15fe42c23b3366016f3e1b85b25e0`) — Vite restarted for SHA parity.
