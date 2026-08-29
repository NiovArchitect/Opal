# PROFILE_PHOTO_DURABLE_PERSISTENCE — OPEN PRODUCT DEPENDENCY

**Status:** OPEN_PRODUCT_DEPENDENCY  
**Recorded:** 2026-08-28 · P0-05.8 / P0-05.8A  
**Surface:** First Run Profile `773:80` Add photo ACTION

## Current (acceptable for visual founder walk)

| Gate | Value |
|------|-------|
| PHOTO_PICKER_OPENS | true |
| PHOTO_PREVIEW_UPDATES | true |
| INITIALS_FALLBACK_SUPPORTED | true |
| NO_FAKE_PERSIST_SUCCESS | true |
| PROFILE_PHOTO_DURABLE_PERSISTENCE | **OPEN** |

Runtime opens native `input[type=file]`, shows local `createObjectURL` preview, and explicitly surfaces persistence gap copy. It does **not** claim server avatar save.

## Why open

`Accounts.User` / `updateProfile` currently persist display name + handle. No durable user-avatar media owner is wired for first-run profile photo (SocialMoment media exists for moments, not profile identity).

## Not in this tranche

- Do not invent a second avatar backend during visual convergence
- Do not fake HTTP success

## Required for production-complete users

- Durable avatar upload owner (reuse media pipeline if appropriate)
- Persist avatar URL on user profile
- Hydrate avatar across Home / Chats / You / Graph
