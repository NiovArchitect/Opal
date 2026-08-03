# SF17 Walkthrough restoration

## Source

| Item | Value |
|------|--------|
| Original SF14 commit | `53f1540` feat(sf14): futuristic Opal identity, logo, Motion first-run, chats redesign |
| SF14 merge context | Social Flow 14 closure walkthrough |
| File | `apps/opal_web/src/onboarding/FirstRunExperience.tsx` |

## Comparison

Current main before SF17 had drifted copy and technical weight. SF17 restored SF14 titles, kickers, scene order, Motion timing (`0.45s` ease `[0.16, 1, 0.3, 1]`), and scene components.

## Only intentional deltas vs `53f1540`

Em dashes (`—`) removed from body strings per founder user-facing copy rule. No rewording beyond that. No technical verification language added to the walkthrough.

| Step | Title (unchanged) |
|------|-------------------|
| welcome | Life starts in conversation. |
| spark | When talk becomes something real. |
| plan | Decide without killing the vibe. |
| follow | Moments that actually happen. |
| calm | Calm. Human. Yours. |

## Forbidden phrases

Tests assert walkthrough blob has no: session, cookie, csrf, phoenix, elixir, bearer, synthetic provider, “stay on signal”.
EOF