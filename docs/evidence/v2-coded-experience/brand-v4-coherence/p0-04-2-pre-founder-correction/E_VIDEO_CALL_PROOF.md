# Video call 618:620 correction

## Prior false report (P0-04.1)
Return incorrectly described controls as **Flip / Mute / Video / End**.

## Cause
Runtime `CallSurfaces.tsx` invented a Flip tile for `kind === "video"`. Evidence echoed that invention. Both were wrong vs Figma.

## Repair
Removed Flip. Video + Group rails are exactly:

1. Mute  
2. Video  
3. Speaker  
4. End  

## Runtime assertions (PROOF.json)
```
VIDEO_MUTE_PRESENT = true
VIDEO_VIDEO_PRESENT = true
VIDEO_SPEAKER_PRESENT = true
VIDEO_END_PRESENT = true
VIDEO_FLIP_PRESENT = false
```

Measured (relative to call surface, 390×844):
| Control | x | y | w | h |
|---|---|---|---|---|
| Mute | 47 | 748 | 70 | 48 |
| Video | 123 | 748 | 70 | 48 |
| Speaker | 198 | 748 | 70 | 48 |
| End | 274 | 748 | 70 | 48 |

Captures: `figma/FIGMA_618_620_VIDEO.png` · `runtime/VIDEO_CALL_618_620.png`
