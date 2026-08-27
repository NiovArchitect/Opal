# Call surface matrix

| Kind | Node | Opaque | Dock | Controls | Teardown |
|---|---|---|---|---|---|
| Incoming | 618:581 | YES (fixed z=200 portal) | NO | Decline / Answer | Decline clears |
| Audio | 618:599 | YES | NO | Mute / Speaker / Video / End | End clears |
| Video | 618:620 | YES | NO | Flip / Mute / Video / End | End clears |
| Group | 618:642 | YES | NO | group grid + controls | End clears |

## Repair this pass
`.app > *` forced `position:relative;z-index:1` which trapped CallSurface.  
Fixed by: exclude `.call-surface`, `position:fixed !important`, `createPortal(…, document.body)`.

## Proof
`12_CALL_TEARDOWN_MATRIX.json` · `callZ: 200` · `callCoversViewport: true`  
`runtime/CALL_INCOMING_FROM_DIRECT.png`
