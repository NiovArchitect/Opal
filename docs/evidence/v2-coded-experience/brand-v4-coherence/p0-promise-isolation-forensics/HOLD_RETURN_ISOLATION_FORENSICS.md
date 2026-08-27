# P0 PROMISE — ISOLATION / SW / PIXEL FORENSICS RETURN

**HOLD. DO NOT MERGE. permissionToStartLive = NO.**

Date: 2026-08-25  
Vite PID: **41343** (post-restart) · cwd correct

---

## O. ONE evidence-backed root cause

**`ASSET_BYTES_STILL_WRONG`**

Not: STALE_VITE_PROCESS (ruled out after PID 41343).  
Not: CSS occlusion.  
Not: Service Worker.  
Not: duplicate Promise component.  
Not: transition state.

### Decision tree result

| Mode | Result |
|------|--------|
| `?promise_isolation=1` (raw img only, z-index max, no frost/void/CTA/shell) | **Still frost / ambient + baked CTAs** |
| Direct navigation to PNG URL | **Same frost plate** |
| Brightened disk PNG diagnostic | **Still frost plate — no people/paths/Rooftop Jazz** |
| Disk vs quarantined “incomplete backdrop” | **RMSE ≈ 2.39** (essentially the same image) |

**Conclusion:** With every first-run layer removed, the served Promise file itself is the frost Brand-V4 ambient + CTA chrome. Founder eyes match isolation pixels. Prior multimodal “I see people” reports on this file were **false** (hallucinated against a dark asset).

---

## A. HOLD
HOLD.

## B. Isolation-mode result
Isolation **mounted**. Image loaded 941×1672, opacity 1.  
**Visual: frost plate** (Enter Opal / I already have an account), **not** founder Promise composition.

## C. Isolation screenshot
`SCREENSHOTS/ISOLATION_MODE.png` · `ISOLATION_MODE_RETRY.png` · `DIRECT_PNG_URL_NAVIGATION.png` · `DIAG_BRIGHTENED_DISK_PROMISE.png`

## D–G. Service Worker
| Check | Result |
|-------|--------|
| `getRegistrations()` | **[]** |
| `controller` | **null** |
| `caches.keys()` | **[]** |
| Promise request | network / Vite static · **200** · SHA match disk |

**No SW trapping localhost:5173 in this Playwright Chromium session.**

## H. Ancestor style chain
See `runtime/FOUNDER_PATH_FORENSICS.json` (partial — isolation already proved bytes). No parent opacity/filter/mask hiding content when isolation removes all parents.

## I. Pseudo-element audit
No covering `::before`/`::after` frost required to explain founder view — isolation has none and still frost.

## J. Overlay hide test
N/A for root cause once isolation fails the same way.

## K. Animation-disabled
N/A for root cause once isolation fails the same way.

## L. Runtime fingerprint
`data-runtime-build` includes `promise-b60125870a4d`  
`data-promise-sha=b60125870a4deec51a9ade23a5aae65e87b194e6480cdf184c2c979ad46068eb`

## M. Founder-route screenshot
Still shows frost because **asset is frost**.

## N. Known-bad comparison
Disk runtime PNG ≈ quarantined incomplete backdrop (RMSE 2.39).  
**PROMISE_VISIBLE = FALSE** by human-visual contract.

## P. Exact repair status
**Cannot complete without canonical source bytes.**

Figma `646:2` fill hash `6918b1a4…` is still the **14KB JPEG frost plate**.  
Figma **618:29** is a **vector/text constructed Promise** (42 children) — that is what looks “populated” on the authority page, **not** a high-res exact raster in `646:2`.

Runtime must **not** fake 618:29 into an “exact” raster without founder promotion.

**Required from founder / pipeline:** attach the true **941×1672** (or higher) founder Promise image into `646:2` fill, or place the file at:

`apps/opal_web/public/brand/opal-graph/opal-promise-exact-941x1672.png`

replacing SHA `b6012587…`.

Diagnostic mode left in place:

```text
http://127.0.0.1:5173/?opal_reset_first_run=1&promise_isolation=1
```

## Q. Post-repair founder URL
Unchanged until real asset lands:

```text
http://127.0.0.1:5173/?opal_reset_first_run=1
```

## R. STOP
**STOP.** No Home/Chats/Graphs work.

Promise remains **broken for founder eyes** because **the bytes are still the frost plate**.
