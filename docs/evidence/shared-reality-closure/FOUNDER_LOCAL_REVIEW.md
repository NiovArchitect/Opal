# Founder local review — PR #112 (one path)

**Do not merge #112.** This is the reviewability path only.

## Exact URL

**http://127.0.0.1:5173/**

(Use **5173** only for this worktree review. Ignore 5174 if another monorepo Vite is open.)

## ONE command (from monorepo root / this worktree)

```bash
# From worktree root: opal-grok-real-people
./scripts/founder_review_up.sh
```

That script:

1. Ensures API on **:4000** (this worktree) with CORS for Vite ports  
2. Starts web with `VITE_OPAL_API_URL=http://127.0.0.1:4000`  
3. Seeds Maya / Jordan / Friends stories  
4. Prints login fixture + URL  

## Manual (if script fails)

```bash
# Terminal A — API (this worktree)
cd apps/opal_core && mix phx.server

# Terminal B — web (this worktree, #112)
cd apps/opal_web
export VITE_OPAL_API_URL=http://127.0.0.1:4000
export VITE_OPAL_SOCKET_URL=ws://127.0.0.1:4000
npm run dev -- --host 127.0.0.1 --port 5173

# Terminal C — seed review conversations
node scripts/founder_review_seed.mjs
```

## Login fixture

| Field | Value |
|-------|--------|
| Phone | `+12025550101` |
| Code | `111111` (synthetic preview fixture) |

Skip walkthrough → activate → open **Home / Chats / Plans**.

## Click-through

1. **Home** — needs + coming up (not a status inventory)  
2. **Maya** — coffee / time / place if resolved  
3. **Jordan** — dinner / time; place may still be open (forming)  
4. **Friends** — Saturday dinner / Harbor Table  
5. **Plans** — every card opens a conversation  

## Do not use

- `npm run preview` of a dist built **without** `VITE_OPAL_API_URL` → “not configured”  
- Production `opal.niovlabs.com` for #112 judgment (baseline, not this PR)  
- Port **5174** from another Opal checkout (not this branch)
