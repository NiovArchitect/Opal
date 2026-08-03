# SF17 Screen and control inventory (primary surfaces)

| Surface | Route / state | Primary action | Session | Notes |
|---------|---------------|----------------|---------|-------|
| First-run walkthrough | `showFirstRun` | Continue / Enter Opal / Skip | No | SF14 restored copy |
| Activation phone | ActivationFlow `phone` | Continue | No | Fixture-only on hosted |
| Activation code | `code` | Verify | No | Dev code shown when API exposes |
| Preparing | `preparing` | (auto) | Transition | Never silent-stuck |
| Invite optional | `invite` | Accept / Send / Enter Opal | Yes bearer | Optional; Enter always available |
| Chats list | main shell | Open chat | Yes | Live API when configured |
| Thread | active chat | Send message | Yes | Signals: Becoming a plan |
| Needs you | tab | Open related chat | Yes | From signals |
| Profile / sign out | settings | Sign out | Yes | Revokes session |
| Replay intro | profile | Replay | Yes | Walkthrough only |

## Deep smoke matrix (local + hosted API)

| Journey | Status |
|---------|--------|
| Fixture start → code → verify → session | API proven; browser after deploy |
| Personal number rejected on hosted client | Unit + client gate |
| Invite + accept + message + signal | ExUnit product activation |
| Sign-out revokes | ExUnit |
| Socket product session | ExUnit ChannelTest |
| Em dash / forbidden copy | Vitest activation + firstRun |
| CSP allows Render API | Vitest activation |

## Residual browser proof after deploy

Re-run on Chrome, Safari, mobile viewport: skip walkthrough → `+12025550101` → code `111111` → land in product shell without stuck spinner.
EOF