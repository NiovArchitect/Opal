# MOBILE YOU FLOW REPORT

**Status:** AUDIT — mobile/native-host behavior for YOU  
**At:** 2026-10-13  
**Viewport target:** 390×844 (+ native-host safe areas)  
**Pass 2:** LOCKED  

## Scroll architecture (code)

| Surface | CSS / behavior | Notes |
|---------|----------------|-------|
| YOU hub pane | `[data-testid=you-hub-pane].scroll` | Native-host trail pad for dock clearance (`styles.css` ~13842) |
| Nested YOU destination shell | `.you-pane-nested` fixed 390×844, `overflow: hidden` | Outer shell does **not** scroll — intentional |
| Nested body | `.you-settings-body` `overflow-y: auto`, max-height ~580 (desktop layout); native-host uses `top`/`bottom` with `--opal-scroll-trail-pad` | **Primary scroll container** for long Privacy / Spending cards |
| Edit profile body | Higher `top` (~318) for avatar block; shorter max-height | Easy to feel “stuck” if body height wrong |

### Scroll lock — RED candidate

Founder concern: nested YOU screens feel scroll-locked.

**Code intent:** outer pane locked; inner `.you-settings-body` scrolls.

**Verify on device (required before marking GREEN):**

1. Open YOU → Privacy (filed Remembers + Celebrations — long).  
2. Open Spending & fit (filed comfort + wallet).  
3. Open Edit profile.  
4. Confirm finger scroll moves body content; last controls clear safe area / dock.  
5. Native-host: `?opal_native_host=1` with safe-top.

If body does not receive gestures (parent capture / height 0 / `touch-action`), treat as **commercial RED** and repair CSS — do not fake content.

## Safe area / dock

| Rule | Status in CSS |
|------|----------------|
| Hub more-rows bottom pad | Native-host trail pad |
| Nested body bottom | `--opal-scroll-trail-pad` |
| Topbar hide when YOU nested | `.app:has(.you-pane-nested) .topbar` hidden |

## Critical flows (mobile)

| Flow | Steps | Expected | RED if |
|------|-------|----------|--------|
| Edit profile | Edit → Save → leave → reopen / other surfaces | Name/handle updated | Value reverts or only local |
| Appearance | Pick Light → leave → reopen | Theme persists | Flash back to dark without save |
| Assist | Toggle off → place/open call path | Assist respects pref | Toggle no-ops |
| Notifications | Toggle receipts | Pref persists | No API / silent fail |
| Home TZ | Save → Travel mode read | Projection updates | Save error ignored |
| Find people | YOU → Find people | Real flow; permission honesty | Fake contact list |
| Sign out | Account → Sign out | Session cleared | Stuck member shell |
| Delete nest | Account → Delete → Keep | Returns; no fake delete | Destructive one-tap |

## Keyboard

Edit profile / TZ fields: body must remain scrollable when keyboard open (iOS Safari / WKWebView). Not fully proven in this doc pass — mark **YELLOW verify**.

## Terminology on device

Hub label **“More on You”** (aligned with YOU mental model).

## What NOT to retest as Pass 2

Remember chip / relationship inference / memory expansion — locked.

## Next proof shots (when repairing)

Evidence dir suggestion: `shots/you_page/`  

- `YOU_HUB.png`  
- `YOU_PRIVACY_SCROLL.png` (scrolled to end)  
- `YOU_PROFILE_AFTER_SAVE.png`  
- `YOU_FIND_PEOPLE.png`  
- `MOBILE_YOU_VERIFY.json`  

## Related

- `YOU_PAGE_CAPABILITY_MATRIX.md`  
- `YOU_ENDPOINT_AUDIT.md`  
- CSS: `apps/opal_web/src/styles.css` you-hub / you-settings / native-host blocks  
