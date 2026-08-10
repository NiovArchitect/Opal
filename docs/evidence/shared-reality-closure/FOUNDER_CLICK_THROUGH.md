# Founder click-through — Shared Reality Closure

**PR:** https://github.com/NiovArchitect/Opal/pull/112  
**Hold merge** until visual/human sign-off.  
**Do not treat green CI as ship.**

## One founder URL (this branch)

**http://127.0.0.1:5173/** — local preview of this PR’s web build (see setup below).

Production **https://opal.niovlabs.com/** still runs the pre-PR baseline until merge + deploy.  
Do not use production to judge this PR.

### Local review path

```bash
# Terminal A — API (full journeys with live signals)
cd apps/opal_core && mix phx.server

# Terminal B — web on this branch
cd apps/opal_web
export VITE_OPAL_API_URL=http://localhost:4000
export VITE_OPAL_SOCKET_URL=ws://localhost:4000
npm run dev
# or: npm run build && npm run preview -- --host 127.0.0.1 --port 5173
```

Open **http://127.0.0.1:5173/**  
Synthetic activation: Test line A/B with published codes (activation UI).

---

## Click-through script (human, not QA matrix)

### HOME (~3 seconds)

1. Sign in (or complete activation).
2. Open **Home**.
3. Ask: Do I know **who** needs me, **what** is soon, and **whether anything is mine**?
4. Fail if you see a stack of `Set` / `Still open` / `This could work` as the meaning.

### MAYA

1. **Chats → Maya** (or create conversation and exchange coffee language).
2. You should understand thread content + any Shared Reality:
   - WHAT · WHEN · WHERE if resolved
   - if place missing → **forming**, not fully arranged; resolve detail clear
3. Moment / row opens conversation history (causal story).

### JORDAN

1. **Chats → Jordan** (or dinner thread).
2. Must feel clickable end-to-end.
3. Read: Dinner with Jordan · usable time · place **if** resolved.
4. If time works but no place: headline holds facts; detail = **need a place** (not a hollow “Set”).
5. From Plans / Coming together, card **opens** this conversation.

### FRIENDS

1. Open group (Saturday dinner).
2. Understand what / when / where (if any) / who · count.
3. No complete-looking plan when WHERE is still consequential.

### PLANS

1. Every card opens a conversation.
2. Reads like social reality, e.g.:
   - Dinner with Jordan · Thursday · after 6:30 · need a place
   - Dinner with friends · Saturday · Harbor Table
3. No status inventory rows.

### TEMPORAL / INTERACTION / HISTORY

- Prefer human times (no ISO).
- No dead rows.
- Thread remains the causal story.

---

## Partial vs arranged (the visual judgment)

| State | Should feel |
|-------|-------------|
| Thursday works, place open | **Forming / Coming together** · resolve: need a place |
| Dinner · Thu 7 · Harbor Table | **Shared / Coming up** · durable |

That transformation is what founder eyes judge. Not architecture.
