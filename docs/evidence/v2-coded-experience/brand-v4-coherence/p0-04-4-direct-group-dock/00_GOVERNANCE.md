# P0-04.4 DIRECT / GROUP / DOCK EXACT CLOSURE

HOLD. DO NOT MERGE. permissionToStartLive=NO.
P0-04.3 FOUNDER_WALK_READY=YES REVOKED until Direct dock geometry fixed.

## Root cause
1. `.app > * { position: relative }` overrode Option B dock `position: absolute` → computed relative + bottom:10px → **y=748**
2. `max-width: calc(100% - 32px)` with `border-inline: 1px` (content 388) → **w=356**
3. Same relative hammer broke Direct header absolute layout (thread scroll pulled chrome off-screen)

## Fixes
- Exclude `.tabbar`, `.gpt-header`, `.composer`, `.thread`, `.gpt-shared-graph-plate` from relative hammer
- Dock: `left:16; bottom:0; width:358; transform:none; position:absolute !important`
- App side hairlines via inset box-shadow (not border) so content width stays 390
- Direct/Group exact header/composer/shared-graph absolute geometry
