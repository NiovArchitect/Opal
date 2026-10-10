# Paste W8 Phase 6 — Blind-spot sweep

Scope: tappable-but-dead / half-wired / faked controls on primary surfaces.
Rule: make it work end-to-end OR honest gate (`blockedReason` / disabled + reason). No "Coming soon". No em-dashes.
Do not redesign. Do not touch Splash 2 PNG, shared-plans sheet copy, You settings card visual gold, tab order.
Already owned elsewhere (skip): splash timer, Meet order/Continue, Center land, Center wordmark 34, travel-mode/nearby-range/delete/PrivateCreatorImpact, Meet location coords, Meet Matilda TTS, App Store docs.

Status legend: **WORKS** · **GATED** · **FIXED→WORKS** · **FIXED→GATED** · **SKIP** · **FALSE_POSITIVE**

---

## Inventory

### Splash / onboarding
| Control | Status | Notes |
|---------|--------|-------|
| Splash Skip / Tap to begin / I already have an account | WORKS | Advances first-run |
| Splash timer / Meet Continue / Meet order | SKIP | Owned elsewhere |
| Meet Matilda TTS / location coords | SKIP | Owned elsewhere |

### Home feed
| Control | Status | Notes |
|---------|--------|-------|
| Own profile / Search / Attention | WORKS | You / SearchDestination / ActivityDestination |
| Story + Post / Story chooser | WORKS | Create flows |
| Story rail open | WORKS | StoryViewer |
| Memory media Open memory | WORKS | MemoryDetailSheet |
| Social like/comment/forward/repost/save | WORKS | HomePane → OpalApp |
| Discovery Save this idea | FIXED→WORKS | Opens SaveToCollectionSheet |
| Discovery Graph this | FIXED→WORKS | Opens PlanComposer seeded with place |
| Home Post / Story create | WORKS | GraphCreateFlow / StoryCreateFlow |

### Chats + threads
| Control | Status | Notes |
|---------|--------|-------|
| Chats search | WORKS | Filters list |
| Chats + New call/chat/Add contact/Invite | WORKS | All handlers in OpalApp |
| Comm mode Chats/Calls | WORKS | Surface toggle |
| Chat row / plan pill | WORKS | Conversation / graph detail |
| Thread back / call / video / mute | WORKS | Call/video honest gates |
| Thread avatar → contact | WORKS | ContactProfileSheet |
| Thread name (gpt-name) on DM | FIXED→WORKS | Name row opens contact profile |
| History | WORKS | ContactProfileSheet / past plan |
| Contact Message / Call / Memories / plans | WORKS | Call gated honestly |
| Group Info Shared Graphs row | FIXED→WORKS | Opens graph detail |
| Group Info Leave group | FIXED→GATED | Membership revoke API missing |
| Composer attach types | GATED | Honest gate notes |
| Composer voice on seed chat | GATED | Honest gate note |
| Sticky chrome / ambient field | FALSE_POSITIVE | Non-interactive |

### Graphs
| Control | Status | Notes |
|---------|--------|-------|
| New menu plan/trip/idea | WORKS | PlanComposer / trip / idea |
| People / Timeline + lenses | WORKS | Mode + filter |
| Trip New | WORKS | TripCreateFlow |
| Graph detail directions / add / repeat | WORKS | onRepeat from OpalApp |
| Timeline Adjust people/message | WORKS | Handlers passed |
| Start planning on ideas | WORKS | PlanComposer |

### Opal Center
| Control | Status | Notes |
|---------|--------|-------|
| Center land / wordmark 34 | SKIP | Owned elsewhere |
| Composer send / mic | WORKS | Mic honest disable |
| Ambient attach | GATED | File/media dependency note |
| Context chips / correction | WORKS | Local apply + notes |

### You / settings
| Control | Status | Notes |
|---------|--------|-------|
| Hub rows + Spending & fit | WORKS | Nested destinations |
| Blocked toggles / navs | GATED | blockedReason rows |
| travel-mode / nearby-range / delete | SKIP | Owned elsewhere |
| Edit profile save | WORKS | Bio field GATED |
| Settings card visual gold | SKIP | Do not touch |

### Sheets / composers / Story viewer
| Control | Status | Notes |
|---------|--------|-------|
| StoryViewer Reply | FIXED→WORKS | Opens matching chat (else honest note + Chats) |
| StoryViewer Share | FIXED→GATED | Tap shows blocked reason |
| Memory detail actions | WORKS | Wired |
| Comments / Forward / Save sheets | WORKS | Wired |
| Confirm time sheet | WORKS | Yes/Cancel |
| PlanComposer Continue | WORKS | canContinue gate |

---

## Files changed

- `apps/opal_web/src/opalUi/GraphPeopleThread.tsx` — DM name opens contact
- `apps/opal_web/src/opalUi/StoryViewer.tsx` — Reply/Share wire or honest gate
- `apps/opal_web/src/opalUi/DiscoveryDetailSheet.tsx` — Save/Graph gated if unwired
- `apps/opal_web/src/opalUi/GroupInfoDestination.tsx` — Shared Graph tappable; Leave gated
- `apps/opal_web/src/OpalApp.tsx` — Discovery Save/Graph; Story Reply; Group Leave/Shared Graph
- `apps/opal_web/src/styles.css` — gate/note styles for story, discovery, group info
- `shots/walk/W8_BLINDSPOT.md` — this inventory

Not committed (per task).
