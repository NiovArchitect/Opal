# P0 EMERGENCY — FOUNDER RUNTIME IDENTITY RECONCILIATION

**HOLD. DO NOT MERGE. permissionToStartLive = NO. B2-06 PAUSED.**

## Primary root cause label

**`STALE_VITE_PROCESS`**

Secondary contributing risk:

**`POSSIBLE_BROWSER_IMAGE_CACHE_OF_INCOMPLETE_PNG_SAME_URL`**

---

### A. HOLD
HOLD.

### B. actual :5173 PID (before repair)
**5197** — `node …/apps/opal_web/node_modules/.bin/vite --host 127.0.0.1 --port 5173`

### C. actual :5173 cwd (before)
`/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_web`  
(**correct worktree**)

### D. branch / HEAD from that cwd
`build/v2-coded-experience-closure` · `cb1bd4382d73fb7a83b29658ec3a48942801219e` · dirty intended P0 work present

### E. Vite start time (before)
**Mon Aug 24 00:20:04 2026** — uptime ~**1d 22h** at forensic time  
Promise asset repair was **Aug 25** → process **predated** the repair.

### F. Disk Promise SHA + bytes
Path: `apps/opal_web/public/brand/opal-graph/opal-promise-exact-941x1672.png`  
SHA-256: `b60125870a4deec51a9ade23a5aae65e87b194e6480cdf184c2c979ad46068eb`  
Bytes: **1018586** · native **941×1672**

Quarantined incomplete backdrop SHA: `ab6444b30e4eecfbe1d5c9fca0408433d00d8bd76c4ac4ee2dfd82be4c2260d5`

### G. Runtime-fetched Promise SHA + bytes
`curl http://127.0.0.1:5173/brand/opal-graph/opal-promise-exact-941x1672.png`  
SHA-256: `b60125870a4deec51a9ade23a5aae65e87b194e6480cdf184c2c979ad46068eb`  
Bytes: **1018586** · native **941×1672**

### H. SHA match
**SHA_MATCH = true** (disk ≡ :5173 fetch)

### I. Visual inspection of runtime-fetched PNG
**PASS content** — people, bubbles, spectral paths, Rooftop Jazz, headline, TALK. ALIGN. GO., CTAs all present in `/tmp/runtime-promise.png` / evidence copy.

### J. Reachable Promise components
Single production implementation: `apps/opal_web/src/onboarding/OpalPromiseScreen.tsx` via `frPromise` in `FirstRunExperience.tsx`.  
**DUPLICATE_PROMISE_PRESENT = false** (spectralTokens only styles `.opal-promise` background).

### K. Real founder-route state trace
Splash `fr00` → one tap → `frPromise` · Auth not shown.

### L. Real DOM image proof (post-restart)
src includes `?v=b60125870a4deec5` · nw/nh 941×1672 · opacity 1 · load=ready

### M. Layer stack
`elementsFromPoint` skips img due to `pointer-events: none` on frame (hit targets only) — **not** CSS occlusion. No frost filter/backdropFilter on Promise ancestors. Screenshot shows full Promise.

### N. Exact root cause
**STALE_VITE_PROCESS** (PID 5197 started Aug 24, before Promise bytes repair).  
Even with correct cwd + matching asset SHA, a day-old Vite + possible browser cache of the **previous incomplete PNG at the same URL** can leave the founder on frost while a fresh harness session sees repaired bytes.

### O. Exact repair
1. Kill PID **5197** only.  
2. Restart Vite from exact `apps/opal_web` cwd → PID **41343**.  
3. Cache-bust Promise img: `?v=b60125870a4deec5` in `OpalPromiseScreen.tsx`.  
4. Archive prior harness shots as `INVALID_RUNTIME_PROOF_PENDING_RECONCILIATION`.

### P. Post-repair Vite PID/cwd
**41343** · cwd same `…/apps/opal_web` · started **Tue Aug 25 22:27:43 2026**

### Q. New cache-busted founder URL
```text
http://127.0.0.1:5173/?opal_reset_first_run=1&founder_byte_probe=<timestamp>
```
(Promise asset itself also cache-busted via `?v=b60125870a4deec5`)

### R. Screenshot
`SCREENSHOTS/POST_RESTART_02_PROMISE.png` (from actual founder reset route on new PID)

### S. Console/network
No pageerrors in probe; Promise asset 200; served module includes cache-bust.

### T. STOP
**STOP.** Founder walk Splash → Promise on the **new** :5173 process.

No Home/Chats/Graphs work.
