# SF14 — First-run Onboarding + Motion

## Stack
- **Motion for React** (`motion@12`) on Vite + React DOM only
- Not used as RN mobile motion (Reanimated remains future native path)

## Experience
- Fullscreen first-run dialog on first visit (`localStorage` key `opal.firstRun.v14.completed`)
- 5 steps: welcome → spark → plan → follow → calm
- Skippable (Skip control)
- Replayable from **You → Replay intro**
- `useReducedMotion()` zeros transitions when preferred

## Narrative
1. Life starts in conversation
2. Talk becomes a plan (“dinner Thursday”)
3. Decide without killing the vibe
4. Follow-through / moments happen
5. Private, calm, human — no ranking/pressure/feed

## Performance
- Single additional dependency; onboarding not code-split required at this scale
- Scenes use light CSS + short Motion presence (blur/y), no video assets
