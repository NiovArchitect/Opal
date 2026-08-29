# P0-05.8 HOLD RETURN — Runtime Must Reproduce Current Figma

**HOLD. DO NOT MERGE. permissionToStartLive = NO. NO LIVE.**

## A. HOLD
Confirmed.

## B. Starting HEAD
`efb9f7b34e0b5d548ff10f9691fe4b42eb0a9a3b` clean → authority GREEN.

## C. 618:2 read first
Yes. Governance `618:9` + First Run shell law `777:2` recorded.

## D. Splash double-frame root cause
**Label: `WRONG_PARENT_MAX_WIDTH`**

Evidence:
- `.fr-frame { max-width: 430px }` nested inside `.app { max-width: 480px }` + inset hairline shadows
- Desktop `@media` reintroduced a frosted device-card box-shadow around `.fr-s1`

Repair: `.app` → 390px, no inset hairlines; `.fr-frame` max-width none; desktop frosted card removed; Splash absolute geometry exact to 618:19.

## E. Splash Figma/runtime matrix
`SPLASH_SHELL_PROOF.json` — **ALL GREEN**

| Metric | Result |
|--------|--------|
| Viewport | 390×844 |
| Splash | 0,0,390×844 |
| Emblem | 107,128,176×176 |
| Wordmark top | 338 |
| Skip | 129,642,132×44 visible |
| Tap | 43,700,304×52 |
| Returning | 43,766,304×46 |
| Authority | 618:19 |

Screens: `figma/FIGMA_SPLASH_618_19.png` ↔ `runtime/RUNTIME_SPLASH.png`

## F. Promise unchanged
Not modified. SHA / component / route untouched.

## G–K. Auth Brand V4
| Screen | Authority | Runtime bind |
|--------|-----------|--------------|
| Phone | 773:27 | `fr-auth-v4` + data-figma-authority |
| Verify | 773:52 | 6 visual cells + paste input |
| Profile | 773:80 | Add photo ACTIONABLE |
| Find People | 773:113 | Connect + Not now |

**Add photo:** `fr08-add-photo` opens native file picker → local preview.  
**`PHOTO_PERSISTENCE_CAPABILITY_GAP = true`** (no durable User avatar owner in Accounts; reported honestly; no fake server success). Initials fallback remains.

## L–M. Shared Dock
Root cause tied to non-390 stage / nested framing.  
After `.app` 390 stage: **DOCK_MATRIX.json GREEN**

- Dock relative: **16, 758, 358×86**
- Center Opal: **136, 7, 86×64**

## N–Q. Surfaces
- Home feed not repainted; dock fixed
- Chats/Graphs midnight + ambient field; still need founder visual eye vs Figma richness
- Global Opal visual authority upgraded to **618:902** structure (context chips, ideas rail, composer) — feature tranche still **PAUSED**

## T–U. Authority
YAML + ledger + guard: First Run 773:* CURRENT_BRAND_V4; 217:* lineage-only; Splash shell laws. Guard **GREEN**.

## AA. Remaining objective defects
1. Full pixel overlay/diff automation for Chats / Graphs / Opal vs Figma not yet declared match
2. Verify/Profile/Find People Brand V4 may still need typography/spacing micro-tuning vs Figma after founder eye
3. Durable profile photo persistence owner missing (capability gap reported)
4. Two pre-existing s1Adversarial assertions (sign_in mode string; emblem asset path) still fail — unrelated to Splash/auth geometry

## AB. Founder decisions
- Accept local-preview-only photo until avatar persistence exists?
- Approve Chats/Graphs/Opal visual sync depth after reviewing runtime screenshots?

## AC. FOUNDER_WALK_READY
**NO** — Splash + Dock + auth structure proven, but contract requires full side-by-side green for Chats/Graphs/Opal overlays before a walk URL.

## AD. Founder URL
Not issued.

## AE. STOP
HOLD. DO NOT MERGE. permissionToStartLive = NO. NO LIVE.
