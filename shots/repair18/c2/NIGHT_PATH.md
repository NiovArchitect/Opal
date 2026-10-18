# Repair #18 - Division C2 shell - night-path pass (spec section 13 A6)

Path walked in Dark at phone viewport 390x844 on the locally served
C2 build (vite, this worktree): launch -> Splash 1 -> Splash 2 ->
onboarding Phone -> Center (member shell) -> Home -> Graphs -> You.
Screenshots: new-splash1-dark.png, new-splash2-dark.png,
new-onboarding-phone-dark.png, new-center-dark.png, new-home-dark.png,
new-graphs-dark.png, new-you-dark.png in this folder.
Pixel stats measured from the captures themselves
(shots/repair18/c2/capture-results.json, brightness array):

| Step | Mean lightness | Pixels above 17% lightness |
|---|---|---|
| Splash 1 | 15.2% | 11.4% |
| Splash 2 | 14.6% | 12.2% |
| Onboarding Phone | 14.1% | 8.2% |
| Center | 9.7% | 4.4% |
| Home | 9.5% | 3.7% |
| Graphs | 9.8% | 6.0% |
| You | 13.4% | 9.6% |

## Findings

- NO WHITE FLASH: every frame of the path, including route changes
  and the story CreateSheet open, paints the dark canvas from the
  first frame. The pre-paint boot script (public/c2-boot.js) sets
  data-mode and the mode ground before React mounts; token grounds
  are --canvas-stage #0D0B12 and --canvas #121017 (5.7-7.6% HSL
  lightness), raised --surface-1 #1C1922 (<=13%), sunken
  --surface-2 #262230 (<=17%). No large-area element exceeds the
  section 2.7 caps: grounds are token-fixed, not sampled luck.
- Pixels above 17% are exclusively the permitted exemptions, by
  surface: the Loop character body (Splash 1, Splash 2, Center hero),
  the one primary action per screen (paper-fill Continue / Enter
  Opal / Make something happen is accent-quiet), primary ink and
  glyphs (headlines, wordmark), state pill inks at their section 2.4
  Dark values, the Current gradient lines at 70% night intensity,
  and person-tint avatar fills (small area). No background, card, or
  sheet exceeds the caps.
- Splash 2's illustration card is a member-app plan card treatment on
  the night raised surface - it is NOT user media, and it complies
  anyway (surface-1 night, <=13% lightness).
- One cosmetic observation, not a budget failure: on the You hub,
  the dev seed chip (rendered only with dev flags on) overlaps
  scrolled row text mid-scroll. It is pointer-events none, sits above
  the dock clearance, and hides whenever a flow or stage is open.
  It never covers a primary action. Named here per A6 discipline.

Offenders found and fixed in this pass: none outstanding.
Offenders named on other workers' surfaces: none observed on this
path (Chats and Center chat internals are C1 surfaces; the Center
rest/opening walked here is the C2 shell's).
