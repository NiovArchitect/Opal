# P0_BLACK_SCREEN_ROOT_CAUSE

## Exact cause

`OpalApp` early-returned on `if (showFirstRun || !authenticated)` **before** two member-shell `useEffect` hooks (homeGateNote / journeyNote timers).

When Auth completed → `completeFirstRun()` → `showFirstRun=false` → authenticated member path, React suddenly executed **more hooks** than the previous render:

`Error: Rendered more hooks than during the previous render.`

That crashed the tree into a blank Midnight canvas after Enter Opal / Auth → Home.

## Fix

Moved both `useEffect` timers **above** the first-run early return so hook order is identical on every path.

Also added `OpalErrorBoundary` in `main.tsx` so a future render crash shows an honest retry instead of empty Midnight.

## Founder confirmation path

User reported black screen **After Enter Opal / during Auth** — matches Auth→Home transition when hooks order flipped.
