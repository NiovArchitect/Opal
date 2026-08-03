# SF17 Safari human validation

**Status:** NOT COMPLETED  

## Blocker

This agent host cannot complete a real Safari pass:

| Attempt | Result |
|---------|--------|
| `safaridriver --enable` | Requires interactive macOS password |
| Playwright WebKit install | Unavailable / unsupported on this runner |
| Substitute Chrome/WebKit | Explicitly forbidden for this gate |

## Required human checklist (Safari 18.6)

Environment to record: Safari version, macOS version, normal vs private, default tracking prevention.

1. Fresh Safari → https://opal.niovlabs.com  
2. Walkthrough (frozen SF14 titles) → skip or complete  
3. Fixture `+12025550101` → code `111111` → advances  
4. Full refresh → session restores  
5. Second tab → expected session  
6. Conversation open → send → peer receives without reload  
7. Receive reply without reload  
8. Brief offline → peer sends → reconnect → missed once  
9. You → Sign out → refresh stays signed out  

## Cookie observations (to fill)

| Item | Result |
|------|--------|
| `opal_session` present | |
| Returned on API requests | |
| Refresh restore | |
| ITP impact | |
| Memory bearer role | immediate only / required |

Do not paste cookie values.
EOF