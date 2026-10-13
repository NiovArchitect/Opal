# Founder Staging Reality Walk (Cloudflare bridge)

**Status:** HOLD-PERIOD — human phone validation  
**Not:** Pass 2 · production · TestFlight against Render  
**Prerequisite:** tunnel healthy · Mac awake · seed OFF  

## Purpose

Prove Opal over HTTPS behaves like the same organism as LAN — catch “works on Mac, breaks on phone.”

## Before you start

1. Mac: `caffeinate` running (or `./scripts/opal_founder_staging_up.sh --with-tunnel --caffeinate`)
2. Open current URL from `~/.opal/tunnel.env` → `OPAL_TUNNEL_FE_URL`  
   Live example pattern: `https://….trycloudflare.com`
3. **Do not** append `?opal_founder_seed=1` for this walk
4. Cellular or non-Mac WiFi preferred (proves tunnel, not LAN)

## Walk (10 steps)

| # | Action | Pass if |
|---|--------|---------|
| 1 | Open URL in iPhone Safari | Shell loads (not Cloudflare error / endless spinner) |
| 2 | Login (real OTP / fixture as configured) | Session establishes; no localhost hard-fail |
| 3 | Home | Current world / honest empty — no founder universe |
| 4 | Chats | Real conversations list (prefer-real) |
| 5 | Send a message | Message persists; peer path if available |
| 6 | Graphs | Active vs past coherent; no seed cards as current |
| 7 | Attention / Bell | Opens; Seen ≠ resolved; deep-link works |
| 8 | Center Opal | Composer usable; no dead primary actions |
| 9 | Refresh Safari | Auth + state survive reload |
| 10 | Close Safari fully → reopen URL | Session or honest re-auth; no mixed reality |

## Questions to answer (write Y/N)

- [ ] Same behavior over HTTPS as LAN?
- [ ] Realtime events arrive (message / Attention / presence)?
- [ ] Auth persists across refresh / reopen?
- [ ] Any screen still assumes `localhost`?
- [ ] Any endpoint shows competing realities (seed / stale / past-as-current)?

## Record

After the walk, note tip + URL host (not secrets) under:

`shots/steward/FOUNDER_STAGING_REALITY_WALK_RESULT.md` (optional founder paste)

or reply in chat with the Y/N table.

## Recovery if Mac dies mid-walk

On this or another machine with the worktree + `~/.opal/r1a1.env`:

```bash
cd /path/to/opal-grok-real-people
./scripts/opal_founder_staging_up.sh --with-tunnel --caffeinate
```

Then use the **new** trycloudflare URL (Quick Tunnel is volatile).

## Boundaries

```text
LOCAL / FOUNDER STAGING  →  Cloudflare Tunnel  →  Mac stack
PRODUCTION               →  Render / Fly always-on (not this tunnel)
```

## Related

- `shots/steward/CLOUDFLARE_FOUNDER_STAGING_TUNNEL.md`
- `scripts/opal_founder_staging_up.sh`
- `shots/steward/RENDER_FREE_TIER_FITNESS_AUDIT.md`
- `shots/steward/SURFACE_FRAGMENTATION_REAUDIT.md`
